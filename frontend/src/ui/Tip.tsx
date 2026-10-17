import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { glossary } from '../glossary';

interface Placement { left: number; top: number; side: 'top' | 'bottom' }

/* Hover/focus/tap tooltip rendered in a portal so tables and panes never clip it.
   WCAG 1.4.13: dismissible with Escape, hoverable, and persistent until dismissed. */
export function Tip({ content, children, block = false, delay = 140 }: { content: ReactNode; children: ReactNode; block?: boolean; delay?: number }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();

  const show = useCallback(() => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), delay); }, [delay]);
  const hide = useCallback(() => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 120); }, []);
  const hideNow = useCallback(() => { window.clearTimeout(timer.current); setOpen(false); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return undefined;
    /* Escape dismisses the tooltip only; preventing the default keeps it from also cancelling a modal dialog behind it. */
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); hideNow(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, hideNow]);

  useLayoutEffect(() => {
    if (!open || !anchor.current || !bubble.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const box = bubble.current.getBoundingClientRect();
    const margin = 8;
    const fitsAbove = rect.top - box.height - margin > 8;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - box.width / 2), window.innerWidth - box.width - 8);
    const top = fitsAbove ? rect.top - box.height - margin : rect.bottom + margin;
    setPlacement({ left, top, side: fitsAbove ? 'top' : 'bottom' });
  }, [open, content]);

  return (
    <>
      <span
        ref={anchor}
        className={block ? 'tip-anchor block' : 'tip-anchor'}
        aria-describedby={open ? id : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open ? createPortal(
        <div
          ref={bubble}
          id={id}
          role="tooltip"
          className={`tooltip ${placement?.side ?? 'top'}`}
          style={placement ? { left: placement.left, top: placement.top } : { left: -9999, top: -9999 }}
          onPointerEnter={() => window.clearTimeout(timer.current)}
          onPointerLeave={hide}
        >
          {content}
        </div>,
        /* Inside a modal dialog the bubble must live in the dialog, or the top layer would cover it. */
        anchor.current?.closest('dialog') ?? document.body,
      ) : null}
    </>
  );
}

export function GlossaryCard({ id }: { id: string }) {
  const entry = glossary[id];
  if (!entry) return <span>{id}</span>;
  return (
    <div className="gloss">
      <strong>{entry.term}</strong>
      <p>{entry.what}</p>
      <dl>
        <dt>Assumes</dt><dd>{entry.assumes}</dd>
        <dt>Does not mean</dt><dd>{entry.not}</dd>
      </dl>
    </div>
  );
}

/** Small ⓘ trigger that explains a measurement, method or limitation. */
export function Term({ id, label }: { id: string; label?: string }) {
  const entry = glossary[id];
  return (
    <Tip content={<GlossaryCard id={id} />}>
      <button type="button" className="term" aria-label={`About ${label ?? entry?.term ?? id}`}>
        <Info size={13} strokeWidth={2} aria-hidden="true" />
      </button>
    </Tip>
  );
}
