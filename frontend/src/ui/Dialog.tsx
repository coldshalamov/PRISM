import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/* Native <dialog>: focus is trapped, Escape closes, and focus returns to the opener.
   Dialogs that hold unsaved edits pass `backdropClose={false}` so a stray click outside cannot discard them. */
export function Dialog({ title, children, footer, onClose, size = 'md', description, backdropClose = true }: {
  title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; size?: 'sm' | 'md' | 'lg'; description?: string; backdropClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const node = ref.current;
    if (node && !node.open) node.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (backdropClose && event.target === event.currentTarget) onClose(); }}
    >
      <header className="dialog-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <button type="button" className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="dialog-body">{children}</div>
      {footer ? <footer className="dialog-foot">{footer}</footer> : null}
    </dialog>
  );
}
