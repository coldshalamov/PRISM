import { useMemo } from 'react';
import { useSize } from '../hooks';
import { num, pct } from '../format';
import type { Distribution, DistributionBin } from '../types';
import { Facts } from '../ui/Facts';
import { ChartTipLayer, niceMax, ticks, useChartTip } from './ChartTip';

/* Paired distribution. Each pane draws its own side in its own colour (graphite = original,
   violet = protected) on a shared scale; the protected pane also outlines the original so the
   change is visible without a second chart.

   Bins are paired by their label, never by position: a recipe can merge, rename or generalise
   categories (ZIP prefixes, rare groups, bands), and an unrelated category must not be drawn as if
   it were the same value. Numeric bins share edges, so equal-length numeric sets fall back to position. */

type Pair = { label: string; original?: DistributionBin; protected?: DistributionBin };

function pairBins(original: DistributionBin[], protectedBins: DistributionBin[]): Pair[] {
  const byLabel = new Map(protectedBins.map(bin => [bin.label, bin]));
  const seen = new Set<string>();
  const pairs: Pair[] = original.map(bin => {
    const match = byLabel.get(bin.label);
    if (match) seen.add(bin.label);
    return { label: bin.label, original: bin, protected: match };
  });
  protectedBins.forEach(bin => { if (!seen.has(bin.label)) pairs.push({ label: bin.label, protected: bin }); });
  return pairs;
}

export function DistributionChart({ dist, side, sourceUnit }: { dist: Distribution; side: 'original' | 'protected'; sourceUnit?: string | null }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const { container, tip, showAt, showFor, hide } = useChartTip();
  const own = dist[side] ?? [];
  const numeric = dist.type === 'numeric';
  const pairs = useMemo(() => pairBins(dist.original ?? [], dist.protected ?? []), [dist]);
  const sameEdges = numeric && (dist.original?.length ?? 0) === (dist.protected?.length ?? 0);
  const ghostFor = (bin: DistributionBin, index: number): DistributionBin | undefined => {
    if (side !== 'protected') return undefined;
    const match = (dist.original ?? []).find(item => item.label === bin.label);
    return match ?? (sameEdges ? dist.original?.[index] : undefined);
  };
  const sharedMax = useMemo(() => niceMax(Math.max(0.0001, ...(dist.original ?? []).map(b => b.fraction), ...(dist.protected ?? []).map(b => b.fraction))), [dist]);
  const color = side === 'protected' ? 'var(--accent)' : 'var(--original)';
  const label = `${dist.column}, ${side} distribution`;
  const unit = dist.unit ?? sourceUnit ?? null;
  const unmatched = !numeric && side === 'protected' ? pairs.filter(pair => !pair.original || !pair.protected).length : 0;

  if (side === 'protected' && dist.dropped) {
    return <div className="viz-empty"><b>{dist.column} is not in this release.</b><span>The column was removed, so there is no protected distribution to compare.</span></div>;
  }
  if (!own.length) return <div className="viz-empty"><b>No values to chart.</b><span>This column has no usable values on this side.</span></div>;

  const width = Math.max(260, size.width);
  const mean = side === 'original' ? dist.mean_original : dist.mean_protected;
  const missing = side === 'original' ? dist.missing_original : dist.missing_protected;
  const hasComparisonNotes = dist.semanticComparison !== undefined || dist.unitComparison !== undefined || typeof dist.lexicalTv === 'number' || Boolean(dist.limitation);
  return (
    <div className="viz" ref={node => { ref.current = node; container.current = node; }}>
      {numeric ? <Columns bins={own} ghostFor={ghostFor} max={sharedMax} width={width} color={color} label={label} showAt={showAt} showFor={showFor} hide={hide} />
        : <Rows bins={own} ghostFor={ghostFor} max={sharedMax} width={width} color={color} label={label} showAt={showAt} showFor={showFor} hide={hide} />}
      <ChartTipLayer tip={tip} width={width} />
      <p className="viz-foot">
        {typeof missing === 'number' ? `Missing: ${num(missing, 0)}` : 'Missing: not reported'}
        {numeric && typeof mean === 'number' ? ` · mean ${num(mean, 2)}${unit ? ` ${unit}` : ''}${side === 'protected' && dist.midpoint_approximation ? ' (band midpoints)' : ''}` : ''}
        {dist.categories_total && dist.categories_shown && dist.categories_total > dist.categories_shown ? ` · top ${dist.categories_shown} of ${dist.categories_total} categories` : ''}
      </p>
      {unmatched ? (
        <p className="viz-foot viz-warn">
          {unmatched} {unmatched === 1 ? 'category exists' : 'categories exist'} on one side only (merged, relabelled or generalised by the recipe). Bars are matched by exact label, so these have no outline; compare them in the table.
        </p>
      ) : null}
      <details className="viz-table">
        <summary>View as table</summary>
        <table className="data-table compact">
          <thead><tr><th scope="col">{numeric ? 'Range' : 'Category'}</th><th scope="col">Original</th><th scope="col">Protected</th></tr></thead>
          <tbody>
            {pairs.map(pair => (
              <tr key={pair.label}>
                <th scope="row">{pair.label}</th>
                <td>{pair.original ? `${pct(pair.original.fraction)} (${num(pair.original.count, 0)})` : <span className="muted">— not present</span>}</td>
                <td>{dist.dropped ? '—' : pair.protected ? `${pct(pair.protected.fraction)} (${num(pair.protected.count, 0)})` : <span className="muted">— not present</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {hasComparisonNotes ? (
        <details className="viz-table">
          <summary>How this comparison is measured</summary>
          <div className="viz-notes">
            {typeof dist.lexicalTv === 'number' ? (
              <p>
                <b>Literal label distance {pct(dist.lexicalTv, 1)}.</b> {dist.lexicalTvDefinition ?? 'Total variation between the two label distributions as written.'} It counts a relabelled value as a change even when the information is kept at a coarser common level, so it is reported separately from preservation at a common level below.
              </p>
            ) : null}
            {dist.semanticComparison !== undefined ? <div><b>Preservation at a common level</b><Facts value={dist.semanticComparison} /></div> : null}
            {dist.unitComparison !== undefined ? <div><b>Units</b><Facts value={dist.unitComparison} /></div> : null}
            {dist.limitation ? <p className="muted">{dist.limitation}</p> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

interface DrawProps {
  bins: DistributionBin[]; ghostFor: (bin: DistributionBin, index: number) => DistributionBin | undefined; max: number; width: number; color: string; label: string;
  showAt: (x: number, y: number, c: React.ReactNode) => void; showFor: (e: Element, c: React.ReactNode) => void; hide: () => void;
}

function binTip(bin: DistributionBin, ghost?: DistributionBin) {
  return (
    <>
      <strong>{pct(bin.fraction)}</strong>
      <span>{bin.label} · {num(bin.count, 0)} rows</span>
      {ghost ? <span className="muted">Original {pct(ghost.fraction)} ({num(ghost.count, 0)})</span> : null}
    </>
  );
}

function Columns({ bins, ghostFor, max, width, color, label, showAt, showFor, hide }: DrawProps) {
  const height = 190;
  const m = { l: 40, r: 8, t: 8, b: 26 };
  const innerW = width - m.l - m.r;
  const innerH = height - m.t - m.b;
  const slot = innerW / bins.length;
  const barW = Math.min(34, Math.max(4, slot - 2));
  const y = (value: number) => m.t + innerH - (value / max) * innerH;
  const labelEvery = Math.max(1, Math.ceil(bins.length / Math.max(2, Math.floor(innerW / 64))));
  return (
    <svg width={width} height={height} role="img" aria-label={label} className="chart-svg" onPointerLeave={hide}>
      {ticks(max, 4).map(value => (
        <g key={value}>
          <line x1={m.l} x2={width - m.r} y1={y(value)} y2={y(value)} className="grid" />
          <text x={m.l - 6} y={y(value) + 3.5} textAnchor="end" className="axis">{pct(value, 0)}</text>
        </g>
      ))}
      <line x1={m.l} x2={width - m.r} y1={y(0)} y2={y(0)} className="baseline" />
      {bins.map((bin, index) => {
        const x = m.l + index * slot + (slot - barW) / 2;
        const top = y(bin.fraction);
        const ghostBin = ghostFor(bin, index);
        return (
          <g key={bin.label} tabIndex={0} role="img" aria-label={`${bin.label}: ${pct(bin.fraction)}`} className="mark"
            onPointerMove={event => showAt(event.clientX, event.clientY, binTip(bin, ghostBin))}
            onFocus={event => showFor(event.currentTarget, binTip(bin, ghostBin))} onBlur={hide}>
            <rect x={m.l + index * slot} y={m.t} width={slot} height={innerH} fill="transparent" />
            <path d={`M${x},${y(0)} V${top + 3} Q${x},${top} ${x + 3},${top} H${x + barW - 3} Q${x + barW},${top} ${x + barW},${top + 3} V${y(0)} Z`} fill={color} opacity={bin.fraction > 0 ? 1 : 0} />
            {ghostBin ? <rect x={x - 1} y={y(ghostBin.fraction)} width={barW + 2} height={Math.max(0, y(0) - y(ghostBin.fraction))} className="ghost" /> : null}
          </g>
        );
      })}
      {bins.map((bin, index) => index % labelEvery === 0 ? (
        <text key={`l${bin.label}`} x={m.l + index * slot + slot / 2} y={height - 8} textAnchor="middle" className="axis">
          {bin.lower !== undefined ? num(bin.lower, 3) : bin.label}
        </text>
      ) : null)}
    </svg>
  );
}

function Rows({ bins, ghostFor, max, width, color, label, showAt, showFor, hide }: DrawProps) {
  const rowH = 26;
  const labelW = Math.min(150, Math.max(84, width * 0.34));
  const m = { l: labelW + 8, r: 52, t: 4, b: 4 };
  const height = m.t + m.b + bins.length * rowH;
  const innerW = width - m.l - m.r;
  const x = (value: number) => m.l + (value / max) * innerW;
  return (
    <svg width={width} height={height} role="img" aria-label={label} className="chart-svg" onPointerLeave={hide}>
      <line x1={m.l} x2={m.l} y1={m.t} y2={height - m.b} className="baseline" />
      {bins.map((bin, index) => {
        const y = m.t + index * rowH;
        const ghostBin = ghostFor(bin, index);
        const barH = 14;
        return (
          <g key={bin.label} tabIndex={0} role="img" aria-label={`${bin.label}: ${pct(bin.fraction)}`} className="mark"
            onPointerMove={event => showAt(event.clientX, event.clientY, binTip(bin, ghostBin))}
            onFocus={event => showFor(event.currentTarget, binTip(bin, ghostBin))} onBlur={hide}>
            <rect x={0} y={y} width={width} height={rowH} fill="transparent" />
            <text x={m.l - 8} y={y + rowH / 2 + 4} textAnchor="end" className="axis label"><title>{bin.label}</title>{bin.label.length > 22 ? `${bin.label.slice(0, 21)}…` : bin.label}</text>
            <path d={`M${m.l},${y + 6} H${Math.max(m.l, x(bin.fraction) - 3)} Q${x(bin.fraction)},${y + 6} ${x(bin.fraction)},${y + 9} V${y + 6 + barH - 3} Q${x(bin.fraction)},${y + 6 + barH} ${Math.max(m.l, x(bin.fraction) - 3)},${y + 6 + barH} H${m.l} Z`} fill={color} opacity={bin.fraction > 0 ? 1 : 0} />
            {ghostBin ? <line x1={x(ghostBin.fraction)} x2={x(ghostBin.fraction)} y1={y + 3} y2={y + rowH - 3} className="ghost-tick" /> : null}
            <text x={x(bin.fraction) + 7} y={y + rowH / 2 + 4} className="axis value">{pct(bin.fraction)}</text>
          </g>
        );
      })}
    </svg>
  );
}
