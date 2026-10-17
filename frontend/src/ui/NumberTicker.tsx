import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks';

/* Magic UI-style number ticker. It animates only when a measured value changes (so the
   reader sees which figure moved) and never when motion is reduced. Assistive technology
   always receives the final formatted value. */
export function NumberTicker({ value, format, duration = 650, className }: {
  value: number | null | undefined; format: (value: number) => string; duration?: number; className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(typeof value === 'number' ? value : null);
  const from = useRef<number | null>(shown);
  const frame = useRef(0);

  useEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) { setShown(null); from.current = null; return undefined; }
    if (reduced || from.current === null || from.current === value) { setShown(value); from.current = value; return undefined; }
    const start = from.current;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (value - start) * eased;
      setShown(next);
      from.current = next;
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else { from.current = value; setShown(value); }
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, reduced, duration]);

  if (typeof value !== 'number' || !Number.isFinite(value)) return <span className={className}>—</span>;
  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown ?? value)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
