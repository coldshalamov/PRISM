import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { niceMax } from '../../charts/ChartTip';
import { pct } from '../../format';
import type { Candidate } from '../../types';
import { attackValue, feasibility, rowLoss, workloadLoss } from './model';
import type { AttackMetric } from './model';

interface Props {
  candidates: Candidate[];
  metric: AttackMetric;
  metricLabel: string;
  frontier: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  labelOf: (id: string) => string;
  originalRows: number;
}

export function ParetoPlot({ candidates, metric, metricLabel, frontier, selectedId, onSelect, labelOf, originalRows }: Props) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const measurable = candidates.flatMap(candidate => {
    const x = attackValue(candidate, metric);
    const y = workloadLoss(candidate);
    return x === null || y === null ? [] : [{ candidate, x, y }];
  });
  /* Round the axis ends up to a tidy value so tick labels read 0 / 25 / 50 / 75 / 100 % of a round maximum, not of 1.08 × the largest point. */
  const maxX = Math.min(1, niceMax(Math.max(.05, ...measurable.map(point => point.x)) * 1.02));
  const maxY = Math.min(1, niceMax(Math.max(.05, ...measurable.map(point => point.y)) * 1.02));
  const groups = new Map<string, typeof measurable>();
  measurable.forEach(point => {
    const key = `${point.x}:${point.y}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  });
  const points = [...groups.values()].sort((a, b) => a[0].x - b[0].x || a[0].y - b[0].y);
  const activeGroup = Math.max(0, points.findIndex(group => group.some(point => point.candidate.candidateId === selectedId)));
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : delta ? (index + delta + points.length) % points.length : null;
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onSelect(points[next][0].candidate.candidateId);
  };

  return <div className="px-chart" aria-label="Measured candidate trade-offs">
    <div className="px-y-caption">Research-query loss <span>↑ worse</span></div>
    <div className="px-plot-frame">
      <div className="px-y-ticks" aria-hidden="true">{[1, .75, .5, .25, 0].map(tick => <span key={tick} style={{ bottom: `${tick * 100}%` }}>{(maxY * tick).toFixed(2)}</span>)}</div>
      <div className="px-plot-area" role="group" aria-label="Candidate positions. Arrow keys move between positions; Enter cycles overlapping candidates. The table below provides every candidate.">
        <svg className="px-plot-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[0, 25, 50, 75, 100].map(position => <g key={position}><line x1={position} x2={position} y1="0" y2="100" /><line x1="0" x2="100" y1={position} y2={position} /></g>)}
        </svg>
        {points.map((group, index) => {
          const chosen = group.find(point => point.candidate.candidateId === selectedId) ?? group[0];
          const selected = group.some(point => point.candidate.candidateId === selectedId);
          const { candidate, x, y } = chosen;
          const nondominated = frontier.has(candidate.candidateId);
          const conflict = feasibility(candidate) === 'conflict';
          const rows = rowLoss(candidate, originalRows);
          const name = `${labelOf(candidate.candidateId)}: ${metricLabel} ${pct(x)}, query loss ${y.toFixed(4)}, row loss ${rows === null ? 'unknown' : pct(rows)}. ${nondominated ? 'Nondominated across four measured objectives.' : 'Not marked nondominated.'} ${conflict ? 'Hard constraint conflict.' : 'No failed returned checks.'}${group.length > 1 ? ` ${group.length} recipes share this position; activate to cycle.` : ''}`;
          return <button
            key={`${x}:${y}`} ref={element => { buttons.current[index] = element; }} type="button"
            className={`px-point${selected ? ' selected' : ''}${nondominated ? ' frontier' : ''}${conflict ? ' conflict' : ''}`}
            style={{ left: `${x / maxX * 100}%`, bottom: `${y / maxY * 100}%`, '--point-size': `${10 + (rows ?? 0) * 12}px` } as CSSProperties}
            aria-label={name} aria-pressed={selected} tabIndex={index === activeGroup ? 0 : -1}
            onKeyDown={event => onKey(event, index)}
            onClick={() => {
              const current = group.findIndex(point => point.candidate.candidateId === selectedId);
              onSelect(group[(current + 1) % group.length].candidate.candidateId);
            }}
          ><span className="px-dot" aria-hidden="true">{group.length > 1 ? group.length : ''}</span><span className="px-point-name" aria-hidden="true">{labelOf(candidate.candidateId)}</span></button>;
        })}
        {!points.length ? <div className="px-no-points"><b>No measurable positions in this view.</b><span>Missing attack or workload measurements remain unknown in the table.</span></div> : null}
        <span className="px-better" aria-hidden="true">↙ lower on both axes</span>
      </div>
      <div className="px-x-ticks" aria-hidden="true">{[0, .25, .5, .75, 1].map(tick => <span key={tick} style={{ left: `${tick * 100}%` }}>{pct(maxX * tick, maxX < 0.2 ? 1 : 0)}</span>)}</div>
    </div>
    <div className="px-x-caption">{metricLabel} <span>→ worse</span></div>
    <p className="px-chart-help">{measurable.length} of {candidates.length} candidates plotted. Marker size represents row loss; overlapping recipes share a position. Use arrow keys or the sortable table.</p>
  </div>;
}
