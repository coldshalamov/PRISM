import type { ApiHealth } from './types';

/* Where this page and its service run decides what the interface may truthfully say.
   - local: served from this computer; private files may be imported and audited.
   - hosted: the fictional-only demo (the service says so, or the origin is remote while the service has not answered yet).
   - remote: a non-local origin whose service does not identify itself as the demo; treated like hosted for uploads. */

export type DeploymentKind = 'local' | 'hosted' | 'remote';

export interface Deployment {
  kind: DeploymentKind;
  hosted: boolean;
  /** Hosted state inferred from the origin only, because the service has not reported its mode. */
  provisional: boolean;
  uploadsAllowed: boolean;
  /** One concise sentence for every place an upload would otherwise be offered. */
  uploadsNote: string;
  /** Short mode name for the top bar and session footer. */
  label: string;
  /** Where the real computations run, for sentences about measurement. */
  place: string;
}

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]', '::1'];
export const isLocalHost = (host: string): boolean => LOCAL_HOSTS.includes(host);

/** Every record in the hosted demo is fictional, whatever the dataset flag says; a local dataset is fictional only when it says so. */
export const isFictional = (deployment: Deployment, dataset: { synthetic?: boolean } | null): boolean =>
  deployment.hosted || dataset?.synthetic === true;

export const HOSTED_UPLOADS_NOTE = 'Uploads are turned off in the hosted demo, which holds fictional records only. To check private files, run PRISM locally on your own computer.';
const REMOTE_UPLOADS_NOTE = 'Uploads are turned off because this page is not served from this computer. To check private files, run PRISM locally on your own computer.';

export function deriveDeployment(origin: { host: string; local: boolean }, health: 'checking' | 'ok' | 'down', info: ApiHealth | null): Deployment {
  const flagged = info?.deploymentMode === 'synthetic_demo';
  const unknownRemote = !origin.local && info === null;
  const hosted = flagged || unknownRemote;
  const kind: DeploymentKind = hosted ? 'hosted' : !origin.local ? 'remote' : 'local';
  const uploadsAllowed = kind === 'local' && info?.uploadsAllowed !== false && health !== 'checking';
  return {
    kind,
    hosted,
    provisional: unknownRemote,
    uploadsAllowed,
    uploadsNote: kind === 'hosted' ? HOSTED_UPLOADS_NOTE : kind === 'remote' ? REMOTE_UPLOADS_NOTE
      : health === 'checking' ? 'Waiting for the service to report whether uploads are available.'
        : 'This service has turned uploads off.',
    label: kind === 'hosted' ? 'Hosted fictional demo' : kind === 'remote' ? 'Remote origin' : 'Local',
    place: kind === 'local' ? 'on this computer' : kind === 'hosted' ? 'on the hosted demo server' : `on ${origin.host || 'a remote server'}`,
  };
}
