import { useMemo } from 'react';
import { useSize } from '../hooks';
import { num, signed } from '../format';
import type { Correlation } from '../types';
import { ChartTipLayer, useChartTip } from './ChartTip';

/* Magnitude is encoded by colour intensity (one hue per side) and the sign is always printed,
   so the matrix needs no diverging palette. A sign reversal after protection is outlined in the
   exposure orange with a glyph, because it means the scientific direction changed. */
export function CorrelationMatrix({ correlations, side }: { correlations: Correlation[]; side: 'original' | 'protected' }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const { container, tip, showAt, showFor, hide } = useChartTip();

  const { columns, lookup } = useMemo(() => {
    const names: string[] = [];
    const map = new Map<string, Correlation>();
    for (const pair of correlations) {
      for (const name of [pair.x, pair.y]) if (!names.includes(name)) names.push(name);
      map.set(`${pair.x}|${pair.y}`, pair);
      map.set(`${pair.y}|${pair.x}`, pair);
    }
    return { columns: names, lookup: map };
  }, [correlations]);

  if (!correlations.length) {
    return <div className="viz-empty"><b>No pairwise correlations.</b><span>Needs at least two numeric or binary fields that remain in the release.</span></div>;
  }

  const width = Math.max(280, size.width);
  const labelW = Math.min(112, Math.max(70, width * 0.22));
  const topH = 74;
  const cell = Math.max(26, Math.min(48, Math.floor((width - labelW - 4) / columns.length)));
  const height = topH + cell * columns.length + 4;
  const rgb = side === 'protected' ? '91, 61, 245' : '75, 83, 98';

  const read = (pair: Correlation) => (side === 'protected' ? pair.protected : pair.original);

  return (
    <div className="viz" ref={node => { ref.current = node; container.current = node; }}>
      <svg width={labelW + cell * columns.length + 4} height={height} role="img" aria-label={`${side} pairwise correlation matrix`} className="chart-svg" onPointerLeave={hide}>
        {columns.map((name, index) => (
          <g key={`t${name}`}>
            <text x={labelW + index * cell + cell / 2} y={topH - 8} transform={`rotate(-50 ${labelW + index * cell + cell / 2} ${topH - 8})`} className="axis label"><title>{name}</title>{name.length > 14 ? `${name.slice(0, 13)}…` : name}</text>
            <text x={labelW - 8} y={topH + index * cell + cell / 2 + 4} textAnchor="end" className="axis label"><title>{name}</title>{name.length > 14 ? `${name.slice(0, 13)}…` : name}</text>
          </g>
        ))}
        {columns.map((rowName, r) => columns.map((colName, c) => {
          const x = labelW + c * cell;
          const y = topH + r * cell;
          if (rowName === colName) {
            return <g key={`${r}-${c}`}><rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} className="matrix-diag" /></g>;
          }
          const pair = lookup.get(`${rowName}|${colName}`);
          const value = pair ? read(pair) : null;
          const isNull = value === null || value === undefined;
          const t = isNull ? 0 : Math.min(1, Math.abs(value));
          const tipContent = pair ? (
            <>
              <strong>{rowName} × {colName}</strong>
              <span>Original {pair.original === null ? 'Unavailable' : signed(pair.original, 3)} → protected {pair.protected === null ? 'Unavailable' : signed(pair.protected, 3)}</span>
              {typeof pair.original === 'number' && typeof pair.protected === 'number' ? <span>Δr = {signed(pair.protected - pair.original, 3)}</span> : <span className="muted">Correlation undefined / unavailable</span>}
              {pair.sign_flip ? <span className="risk-text">Direction reversed after protection</span> : null}
              {pair.midpoint_approximation ? <span className="muted">Band midpoints approximate this value</span> : null}
              <span className="muted">n = {num(side === 'protected' ? pair.n_protected : pair.n_original, 0)}</span>
            </>
          ) : null;
          return (
            <g key={`${r}-${c}`} tabIndex={pair ? 0 : -1} role="img" aria-label={pair ? `${rowName} by ${colName}: ${isNull ? 'unavailable (undefined correlation)' : signed(value, 2)}${pair.sign_flip ? ', direction reversed' : ''}` : undefined}
              className="mark" onPointerMove={event => tipContent && showAt(event.clientX, event.clientY, tipContent)}
              onFocus={event => tipContent && showFor(event.currentTarget, tipContent)} onBlur={hide}>
              <rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} fill={isNull ? 'transparent' : `rgba(${rgb}, ${0.1 + t * 0.85})`} className={isNull ? 'matrix-empty' : ''} />
              {isNull ? <line x1={x + 3} y1={y + cell - 3} x2={x + cell - 3} y2={y + 3} className="matrix-null-slash" /> : null}
              {pair?.sign_flip && side === 'protected' ? <rect x={x + 1.5} y={y + 1.5} width={cell - 3} height={cell - 3} className="matrix-flip" /> : null}
              {cell >= 28 ? (
                <text x={x + cell / 2} y={y + cell / 2 + 4} textAnchor="middle" className="matrix-value" fill={isNull ? 'var(--uncovered)' : t > 0.5 ? '#fff' : '#0f1218'}>
                  {isNull ? 'N/A' : signed(value, 2).replace('0.', '.')}
                </text>
              ) : null}
            </g>
          );
        }))}
      </svg>
      <ChartTipLayer tip={tip} width={width} />
      <p className="viz-foot">
        Colour intensity = |r|; sign printed; hatched N/A = undefined/unavailable (distinct from 0). {side === 'protected' ? 'Orange outline = direction reversed. ' : ''}Binary fields use 0/1; bands use midpoints.
      </p>
      <details className="viz-table">
        <summary>View as table</summary>
        <table className="data-table compact">
          <thead><tr><th scope="col">Pair</th><th scope="col" className="num">Original r</th><th scope="col" className="num">Protected r</th><th scope="col" className="num">Difference (Δr)</th><th scope="col">Direction</th></tr></thead>
          <tbody>
            {correlations.map(pair => {
              const bothFinite = typeof pair.original === 'number' && typeof pair.protected === 'number';
              return (
                <tr key={`${pair.x}-${pair.y}`}>
                  <th scope="row">{pair.x} × {pair.y}{pair.midpoint_approximation ? <small className="muted"> · band midpoints</small> : null}</th>
                  <td className="num">{pair.original === null || pair.original === undefined ? <span className="na">Unavailable</span> : signed(pair.original, 3)}</td>
                  <td className="num">{pair.protected === null || pair.protected === undefined ? <span className="na">Unavailable</span> : signed(pair.protected, 3)}</td>
                  <td className="num">{bothFinite ? signed((pair.protected as number) - (pair.original as number), 3) : <span className="na">—</span>}</td>
                  <td>{pair.sign_flip ? <span className="risk-text">Reversed</span> : bothFinite ? 'Same' : <span className="na">Unavailable</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
