import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useModalHost } from '../hooks';
import { useWorkspace } from '../workspace';

export function Empty({ icon, title, children, actions }: { icon?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      {icon ? <div className="empty-icon" aria-hidden="true">{icon}</div> : null}
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}

export function Notice({ tone = 'info', children, title }: { tone?: 'info' | 'warn'; children: ReactNode; title?: string }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'warn' ? 'note' : undefined}>
      <span className="notice-icon" aria-hidden="true">{tone === 'warn' ? <AlertTriangle size={16} /> : <Info size={16} />}</span>
      <div>{title ? <strong>{title}</strong> : null}{children}</div>
    </div>
  );
}

/** Reserves the shape of content that is loading. */
export function Skeleton({ lines = 3, height = 14 }: { lines?: number; height?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => <span key={index} style={{ height, width: `${92 - index * 11}%` }} />)}
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useWorkspace();
  const modal = useModalHost();
  const region = (
    <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
          <span>{toast.message}</span>
          <button type="button" className="icon-btn" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}><X size={15} /></button>
        </div>
      ))}
    </div>
  );
  /* While a modal dialog is open it owns the top layer; notifications follow it so they are never hidden behind it. */
  return modal ? createPortal(region, modal) : region;
}
