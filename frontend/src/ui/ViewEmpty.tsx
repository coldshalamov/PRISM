import type { ReactNode } from 'react';

/* A static still of the product's mark: one beam, one prism, three rays not yet drawn. */
export function PrismArt() {
  return (
    <svg className="prism-art" viewBox="0 0 220 110" width="220" height="110" aria-hidden="true" focusable="false">
      <line x1="4" y1="55" x2="88" y2="55" stroke="#4c5466" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
      <path d="M104 8 L66 98 L142 98 Z" fill="#f4f1ff" stroke="#4f5873" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="118" y1="34" x2="212" y2="16" stroke="#6b4dff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
      <line x1="126" y1="55" x2="212" y2="55" stroke="#f2602a" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
      <line x1="134" y1="76" x2="212" y2="94" stroke="#8a92a6" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
    </svg>
  );
}

/* The empty state of a whole view: the mark, what is missing, and the one action that fills it. */
export function ViewEmpty({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="view-empty dot-field">
      <PrismArt />
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </section>
  );
}
