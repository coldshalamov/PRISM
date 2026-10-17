import { Info, ServerCog, X } from 'lucide-react';
import { useDialogs } from '../dialogs';
import { useWorkspace } from '../workspace';

/* Keep the deployment summary compact; the existing dialog explains processing, storage and limits. */
export function DeploymentBanner({ onDismiss }: { onDismiss: () => void }) {
  const { deployment, origin, healthInfo } = useWorkspace();
  const dialogs = useDialogs();
  if (deployment.kind === 'local') return null;

  if (deployment.kind === 'remote') {
    return (
      <section className="deploy-banner remote" aria-label="Deployment notice">
        <ServerCog size={18} aria-hidden="true" />
        <div className="deploy-text">
          <b>Not served from this computer</b>
          <p>
            This page is served from <b>{origin.host}</b>.{' '}
            {deployment.uploadsAllowed
              ? 'The configured remote service accepts CSV, JSON and XLSX uploads and runs the measurements. Check Privacy and limits for processing and storage details.'
              : deployment.uploadsNote}
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
    <section className="deploy-banner hosted" aria-label="Hosted workbench notice">
      <Info size={16} aria-hidden="true" />
      <div className="deploy-text">
        <p>
          <b>{deployment.label}{deployment.provisional ? ' · connecting…' : ''}.</b>{' '}
          {deployment.uploadsAllowed
            ? <>Import CSV, JSON or XLSX. {healthInfo?.backendProvider === 'Archie' ? 'Python runs on Vercel; tables and recipes persist in Archie Core.' : 'Measurements run on the hosted Python service.'}</>
            : deployment.uploadsNote}
        </p>
      </div>
      <div className="deploy-actions">
        <button type="button" className="btn small" onClick={() => dialogs.open('privacy')}>Privacy and limits</button>
        <button type="button" className="icon-btn" aria-label="Dismiss hosted workbench notice" onClick={onDismiss}><X size={16} /></button>
      </div>
    </section>
  );
}
