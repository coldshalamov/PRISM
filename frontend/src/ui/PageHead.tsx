import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tip } from './Tip';

/* The same head on every view: a symbol, the question the view answers, at most one line, and the fuller explanation one
   tap away. The explanation is the view's original wording, kept intact for readers who want the precise scope. */
export function PageHead({ icon, title, summary, detail, children, className = '' }: { icon: ReactNode; title: string; summary?: string; detail?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={`page-head ${className}`.trim()}>
      <span className="page-head-icon" aria-hidden="true">{icon}</span>
      <div className="page-head-text">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
      </div>
      {detail ? (
        <Tip content={<div className="gloss">{detail}</div>}>
          <button type="button" className="term page-head-info" aria-label={`About ${title}`}><Info size={16} /></button>
        </Tip>
      ) : null}
      {children ? <div className="page-head-actions">{children}</div> : null}
    </header>
  );
}
