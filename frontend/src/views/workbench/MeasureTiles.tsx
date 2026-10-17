import { Crosshair, EyeOff, Fingerprint, Link2, Scale, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { NumberTicker } from '../../ui/NumberTicker';
import { Term } from '../../ui/Tip';
import type { Measure } from './Ledger';

/* The ledger's own measurements, drawn as tiles. They read the same Measure objects as the table, so an unavailable
   value keeps its reason and is never drawn as zero, and every delta keeps its sign and its spoken direction. */
const ICON: Record<string, ReactNode> = {
  sample_unique: <Fingerprint size={18} />, linkage: <Link2 size={18} />, k_min: <Users size={18} />,
  sensitive_guess_advantage: <Crosshair size={18} />, loss: <Scale size={18} />, suppression: <EyeOff size={18} />,
};
const SHORT: Record<string, string> = {
  sample_unique: 'Rows unique on known fields', linkage: 'Verified exact linkage', k_min: 'Smallest group',
  sensitive_guess_advantage: 'Sensitive inference', loss: 'Research-query loss', suppression: 'Rows suppressed',
};
/* One large tile for the headline measure, smaller ones for the rest; the order is the order of concern. */
const ORDER = ['sample_unique', 'linkage', 'sensitive_guess_advantage', 'k_min', 'loss'];

function Tile({ measure, large, aside }: { measure: Measure; large: boolean; aside?: Measure }) {
  const { from, to } = measure;
  const direction = from === null || to === null ? 'unknown' : Math.abs(to - from) < 1e-9 ? 'same' : (to > from) === measure.higherIsBetter ? 'better' : 'worse';
  const glyph = from === null || to === null || Math.abs(to - from) < 1e-9 ? '·' : to < from ? '▾' : '▴';
  return (
    <li className={`tile-card${large ? ' large' : ''}${to === null ? ' na-tile' : ''}`}>
      <div className="tile-top">
        <span className="tile-glyph" aria-hidden="true">{ICON[measure.id]}</span>
        <span className="tile-label">{SHORT[measure.id] ?? measure.label}<Term id={measure.glossary} label={measure.label} /></span>
      </div>
      <div className="tile-value">
        {to === null
          ? <span className="na" title="This is not zero. The measurement does not apply or was not made.">{measure.naText ?? 'Unavailable'}</span>
          : <NumberTicker value={to} format={measure.format} className="tnum" />}
      </div>
      <div className="tile-foot">
        {to !== null && measure.toText ? <span className="tile-sub tnum">{measure.toText}</span> : null}
        {from !== null && to !== null && measure.delta ? (
          <span className={`delta-chip ${direction} tnum`}>
            <span aria-hidden="true">{glyph}</span>{measure.delta(from, to)}
            <span className="sr-only">{direction === 'better' ? ' (improved)' : direction === 'worse' ? ' (worse)' : ''}</span>
          </span>
        ) : null}
      </div>
      {large && aside ? (
        <p className="tile-aside">
          <EyeOff size={14} aria-hidden="true" />
          {aside.to === null
            ? <span className="na" title="This is not zero. The measurement does not apply or was not made.">{aside.label}: {aside.naText ?? 'unavailable'}</span>
            : <span className="tnum">{aside.label}: {aside.format(aside.to)}</span>}
        </p>
      ) : null}
      {large && measure.bar && to !== null ? (
        <div className="tile-bar" aria-hidden="true">
          <i className="orig" style={{ width: `${Math.min(100, (from ?? 0) * 100)}%`, opacity: from === null ? 0 : 1 }} />
          <i className="prot" style={{ width: `${Math.min(100, to * 100)}%` }} />
        </div>
      ) : null}
    </li>
  );
}

export function MeasureTiles({ measures }: { measures: Measure[] }) {
  const byId = new Map(measures.map(measure => [measure.id, measure]));
  const shown = ORDER.map(id => byId.get(id)).filter((measure): measure is Measure => Boolean(measure));
  return <ul className="tiles" aria-label="Measured on the full dataset">{shown.map((measure, index) => <Tile key={measure.id} measure={measure} large={index === 0} aside={index === 0 ? byId.get('suppression') : undefined} />)}</ul>;
}
