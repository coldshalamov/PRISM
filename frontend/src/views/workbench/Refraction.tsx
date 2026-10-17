import { num, pct } from '../../format';
import { NumberTicker } from '../../ui/NumberTicker';
import { Term } from '../../ui/Tip';

/* The product's own mark, drawn from the evaluated snapshot. A beam enters a prism and leaves as three rays, exactly as in the logo:
   violet is what the recipe removed, orange is what stays exposed, grey is what the research questions lost.
   Every width is a measured fraction of 100%. A measured zero is a hollow terminal mark; a value that was not measured is a dashed
   hairline, a dash and, below the figure, the reason it is unavailable. */

export interface RefractionValues {
  /** Sample uniqueness of the unprotected baseline (the beam that enters). */
  before: number | null;
  /** Sample uniqueness of the shown snapshot (the orange ray). */
  after: number | null;
  /** Normalised research-query loss of the shown snapshot (the grey ray). */
  loss: number | null;
}

const MAX = 22;
const MIN = 3;
const unit = (value: number | null) => (value === null || !Number.isFinite(value) ? null : Math.min(1, Math.max(0, value)));
/** Visible but never exaggerated: a real, tiny value is drawn at a hairline minimum and labelled with its exact figure. */
const weight = (value: number | null) => (value === null ? 0 : value === 0 ? 0 : Math.max(MIN, value * MAX));
const points = (fraction: number) => (fraction === 0 ? '0 pts' : fraction * 100 < 0.05 ? '<0.1 pts' : `${num(fraction * 100, 1)} pts`);

const PRISM = 'M190 14 L138 114 L242 114 Z';
/* Exit points on the prism's right face and the far end of each ray. */
const RAYS = [
  { id: 'removed', from: [203, 40], to: [396, 22], className: 'ray-removed' },
  { id: 'exposed', from: [216, 65], to: [396, 65], className: 'ray-exposed' },
  { id: 'lost', from: [229, 90], to: [396, 108], className: 'ray-lost' },
] as const;

export function Refraction({ values, idle = false, label, external = false, reasons = [] }: {
  values: RefractionValues; idle?: boolean; label?: string; external?: boolean; reasons?: string[];
}) {
  const before = unit(values.before);
  const after = unit(values.after);
  const loss = unit(values.loss);
  const removed = before !== null && after !== null ? Math.max(0, before - after) : null;
  const worse = before !== null && after !== null && after > before;
  const widths = { removed: worse ? 0 : weight(removed), exposed: weight(after), lost: weight(loss) } as const;
  /* A value is either measured (including a measured zero, and "not reduced") or not measured. Only the second is dashed. */
  const measured = { removed: removed !== null, exposed: after !== null, lost: loss !== null } as const;
  const state = (id: 'removed' | 'exposed' | 'lost') => (idle || !measured[id] ? ' unknown' : widths[id] === 0 ? ' none' : '');

  return (
    <figure className={`refraction${idle ? ' is-idle' : ''}`}>
      <div className="refraction-in">
        <b className="tnum">{idle || before === null ? '—' : <NumberTicker value={before} format={pct} />}</b>
        <span>{idle ? 'Source' : 'Unprotected'}</span>
      </div>

      <svg viewBox="0 0 400 130" className="refraction-svg" aria-hidden="true" focusable="false" key={label ?? 'none'}>
        <defs>
          <linearGradient id="rf-prism" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#e7e4ff" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="rf-beam" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="163" y2="0">
            <stop offset="0" stopColor="#4c5466" stopOpacity="0.15" />
            <stop offset="1" stopColor="#4c5466" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* the beam that enters: the unprotected source */}
        <line className="beam-in" x1="2" y1="65" x2="163" y2="65" stroke={before === null || idle ? 'rgba(76,84,102,.55)' : 'url(#rf-beam)'}
          strokeWidth={idle || before === null ? 2 : Math.max(MIN, (before ?? 0) * MAX)} strokeLinecap="round" strokeDasharray={before === null && !idle ? '3 6' : undefined} pathLength={1} />

        {/* light passing through the glass */}
        {!idle ? RAYS.map(ray => <line key={ray.id} x1="163" y1="65" x2={ray.from[0]} y2={ray.from[1]} stroke="#8a72ff" strokeOpacity="0.22" strokeWidth="1.5" />) : null}
        <path d={PRISM} className="prism" fill="url(#rf-prism)" strokeLinejoin="round" />

        {/* the faint outline of the beam that entered, behind the orange ray: the gap is what was removed */}
        {!idle && before !== null && after !== null ? (
          <line x1="216" y1="65" x2="396" y2="65" stroke="#f2602a" strokeOpacity="0.16" strokeWidth={Math.max(MIN, before * MAX)} strokeLinecap="round" />
        ) : null}

        {RAYS.map((ray, index) => {
          const known = !idle && measured[ray.id];
          const width = widths[ray.id];
          /* A measured zero is a hollow terminal mark: it says "nothing here", which is different from "not measured" (dashed). */
          if (known && width === 0) return <circle key={ray.id} className={`ray-zero ${ray.className}`} cx={ray.from[0]} cy={ray.from[1]} r="3.5" />;
          return (
            <line
              key={ray.id} className={`ray ${ray.className}${known ? '' : ' unknown'}`} x1={ray.from[0]} y1={ray.from[1]} x2={ray.to[0]} y2={ray.to[1]}
              strokeWidth={known ? width : 2} strokeLinecap="round" pathLength={1} style={{ ['--i' as string]: index }}
            />
          );
        })}
      </svg>

      <ul className="refraction-out">
        <li className={`ro-removed${state('removed')}`}>
          <i aria-hidden="true" />
          <b className="tnum">{idle || removed === null ? '—' : worse ? 'Not reduced' : <NumberTicker value={removed} format={points} />}</b>
          <span>{external ? 'Lower by' : 'Removed'}</span>
        </li>
        <li className={`ro-exposed${state('exposed')}`}>
          <i aria-hidden="true" />
          <b className="tnum">{idle || after === null ? '—' : <NumberTicker value={after} format={pct} />}</b>
          <span>Still unique</span>{!idle ? <Term id="sample_unique" label="sample uniqueness" /> : null}
        </li>
        <li className={`ro-lost${state('lost')}`}>
          <i aria-hidden="true" />
          <b className="tnum">{idle || values.loss === null ? '—' : <NumberTicker value={values.loss} format={value => num(value, 3)} />}</b>
          <span>Research loss</span>{!idle ? <Term id="loss" label="research-query loss" /> : null}
        </li>
      </ul>

      {reasons.length ? <figcaption className="refraction-reasons">{reasons.map(reason => <span key={reason}>{reason}</span>)}</figcaption> : null}
    </figure>
  );
}
