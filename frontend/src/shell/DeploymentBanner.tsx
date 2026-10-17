import { Info, ServerCog, X } from 'lucide-react';
import { useDialogs } from '../dialogs';
import { useWorkspace } from '../workspace';

/* Says where this page runs, once and plainly. The hosted demo holds fictional records only and refuses
   uploads, but its measurements are real computations; a local run keeps private files on this computer.
   A remote origin that does not identify itself as the demo gets a stricter warning, never the demo wording. */
export function DeploymentBanner({ onDismiss }: { onDismiss: () => void }) {
  const { deployment, origin } = useWorkspace();
  const dialogs = useDialogs();
  if (deployment.kind === 'local') return null;

  if (deployment.kind === 'remote') {
    return (
      <section className="deploy-banner remote" aria-label="Deployment notice">
        <ServerCog size={18} aria-hidden="true" />
        <div className="deploy-text">
          <b>Not served from this computer</b>
          <p>
            This page is served from <b>{origin.host}</b>, and its service has not identified itself as the fictional demo.
            Do not load real data here: uploads are turned off. To check private files, run PRISM locally on your own computer (127.0.0.1).
          </p>
        </div>
        <div className="deploy-actions">
          <button type="button" className="btn small" onClick={() => dialogs.open('privacy')}>Privacy and limits</button>
          <button type="button" className="icon-btn" aria-label="Dismiss deployment notice" onClick={onDismiss}><X size={16} /></button>
        </div>
      </section>
    );
  }

  return (
    <section className="deploy-banner hosted" aria-label="Hosted demo notice">
      <Info size={18} aria-hidden="true" />
      <div className="deploy-text">
        <b>Hosted fictional demo{deployment.provisional ? ' · confirming with the service…' : ''}</b>
        <p>
          Every record here is invented. The measurements are real computations (uniqueness, exact linkage, research-question change),
          run on the hosted demo server rather than on this computer. Uploads are turned off. To check private files, run PRISM locally
          on your own computer.
        </p>
      </div>
      <div className="deploy-actions">
        <button type="button" className="btn small" onClick={() => dialogs.open('privacy')}>What this means</button>
        <button type="button" className="icon-btn" aria-label="Dismiss hosted demo notice" onClick={onDismiss}><X size={16} /></button>
      </div>
    </section>
  );
}
