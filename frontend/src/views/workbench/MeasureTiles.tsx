import { Crosshair, EyeOff, Link2, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { NumberTicker } from '../../ui/NumberTicker';
import { Term } from '../../ui/Tip';
import type { Measure } from './Ledger';

/* The ledger's own measurements that the diagram does not already show, as one strip. They read the same Measure objects as the table,
   so an unavailable value keeps its reason and is never drawn as zero, and every delta keeps its sign and its spoken direction.
   The suppression label comes from the measure itself: an external file is "Rows fewer than the source", not proof of suppression. */
const ICON: Record<string, ReactNode> = {
  linkage: <Link2 size={16} />, sensitive_guess_advantage: <Crosshair size={16} />, k_min: <Users size={16} />, suppression: <EyeOff size={16} />,
};
const SHORT: Record<string, string> = { linkage: 'Verified exact linkage', sensitive_guess_advantage: 'Sensitive inference', k_min: 'Smallest group' };
/* The order is the order of concern. */
const ORDER = ['linkage', 'sensitive_guess_advantage', 'k_min', 'suppression'];

function Cell({ measure }: { measure: Measure }) {
  const { from, to } = measure;
  const direction = from === null || to === null ? 'unknown' : Math.abs(to - from) < 1e-9 ? 'same' : (to > from) === measure.higherIsBetter ? 'better' : 'worse';
  const glyph = from === null || to === null || Math.abs(to - from) < 1e-9 ? '·' : to < from ? '▾' : '▴';
  return (
    <li className={`strip-cell${to === null ? ' na-cell' : ''}`}>
      <div className="strip-top">
        <span className="strip-glyph" aria-hidden="true">{ICON[measure.id]}</span>
        <span className="strip-label">{SHORT[measure.id] ?? measure.label}</span>
        <Term id={measure.glossary} label={measure.label} />
      </div>
      <div className="strip-value">
        {to === null
          ? <span className="na" title="This is not zero. The measurement does not apply or was not made.">{measure.naText ?? 'Unavailable'}</span>
          : <NumberTicker value={to} format={measure.format} className="tnum" />}
      </div>
      <div className="strip-foot">
        {to !== null && measure.toText ? <span className="strip-sub tnum">{measure.toText}</span> : null}
        {from !== null && to !== null && measure.delta ? (
          <span className={`delta-chip ${direction} tnum`}>
            <span aria-hidden="true">{glyph}</span>{measure.delta(from, to)}
            <span className="sr-only">{direction === 'better' ? ' (improved)' : direction === 'worse' ? ' (worse)' : ''}</span>
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function MeasureTiles({ measures }: { measures: Measure[] }) {
  const byId = new Map(measures.map(measure => [measure.id, measure]));
  const shown = ORDER.map(id => byId.get(id)).filter((measure): measure is Measure => Boolean(measure));
  return <ul className="strip" aria-label="Also measured on the full dataset">{shown.map(measure => <Cell key={measure.id} measure={measure} />)}</ul>;
}
