import { num, pct } from '../../format';

/* The product's own mark, drawn from the evaluated snapshot. A beam enters a prism and leaves as three rays, exactly as in the logo:
   violet is what the recipe removed, orange is what stays exposed, grey is what the research questions lost.
   Every width is a measured fraction of 100%. A value that was not measured is a dashed hairline and a dash, never a zero-width ray. */

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

const PRISM = 'M190 14 L138 114 L242 114 Z';
/* Exit points on the prism's right face and the far end of each ray. */
const RAYS = [
  { id: 'removed', from: [203, 40], to: [396, 22], className: 'ray-removed' },
  { id: 'exposed', from: [216, 65], to: [396, 65], className: 'ray-exposed' },
  { id: 'lost', from: [229, 90], to: [396, 108], className: 'ray-lost' },
] as const;

export function Refraction({ values, idle = false, label, external = false }: { values: RefractionValues; idle?: boolean; label?: string; external?: boolean }) {
  const before = unit(values.before);
  const after = unit(values.after);
  const loss = unit(values.loss);
  const removed = before !== null && after !== null ? Math.max(0, before - after) : null;
  const worse = before !== null && after !== null && after > before;
  const widths = { removed: weight(removed), exposed: weight(after), lost: weight(loss) } as const;
  const measured = { removed: removed !== null && !worse, exposed: after !== null, lost: loss !== null } as const;

  const removedText = removed === null ? '—' : worse ? 'Not reduced' : removed === 0 ? '0 pts' : `${removed * 100 < 0.05 ? '<0.1' : num(removed * 100, 1)} pts`;
  /* The ray is clamped to 100% for drawing only; the label keeps the measured figure. */
  const lossText = typeof values.loss === 'number' && Number.isFinite(values.loss) ? num(values.loss, 3) : '—';

  return (
    <figure className={`refraction${idle ? ' is-idle' : ''}`}>
      <div className="refraction-in">
        <b className="tnum">{idle || before === null ? '—' : pct(before)}</b>
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
          return (
            <line
              key={ray.id} className={`ray ${ray.className}${known ? '' : ' unknown'}`} x1={ray.from[0]} y1={ray.from[1]} x2={ray.to[0]} y2={ray.to[1]}
              strokeWidth={known && width > 0 ? width : 2} strokeLinecap="round" pathLength={1} style={{ ['--i' as string]: index }}
            />
          );
        })}
      </svg>

      <ul className="refraction-out">
        <li className={`ro-removed${measured.removed && !idle ? '' : ' unknown'}`}><i aria-hidden="true" /><b className="tnum">{idle ? '—' : removedText}</b><span>{external ? 'Lower by' : 'Removed'}</span></li>
        <li className={`ro-exposed${measured.exposed && !idle ? '' : ' unknown'}`}><i aria-hidden="true" /><b className="tnum">{idle || after === null ? '—' : pct(after)}</b><span>Still unique</span></li>
        <li className={`ro-lost${measured.lost && !idle ? '' : ' unknown'}`}><i aria-hidden="true" /><b className="tnum">{idle ? '—' : lossText}</b><span>Research loss</span></li>
      </ul>

    </figure>
  );
}
