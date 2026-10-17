import { cell, title } from '../format';

/* Renders an optional, shape-unknown evaluator object (for example filter coverage or semantic
   comparison) as plain labelled text. Nothing is interpreted, summed or turned into a score. */
export function Facts({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span className="muted">none</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="muted">none</span>;
    if (value.every(item => typeof item !== 'object' || item === null)) return <span>{value.map(cell).join(', ')}</span>;
    return <ul className="facts-list">{value.slice(0, 12).map((item, index) => <li key={index}><Facts value={item} depth={depth + 1} /></li>)}{value.length > 12 ? <li className="muted">and {value.length - 12} more</li> : null}</ul>;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return <span className="muted">none</span>;
    return (
      <dl className={`facts-inline depth-${Math.min(depth, 2)}`}>
        {entries.map(([key, entry]) => (
          <div key={key}><dt>{title(key.replace(/([A-Z])/g, ' $1').toLowerCase())}</dt><dd><Facts value={entry} depth={depth + 1} /></dd></div>
        ))}
      </dl>
    );
  }
  return <span>{cell(value)}</span>;
}
