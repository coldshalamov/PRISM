import type { ApiHealth } from './types';

/* Service capabilities decide whether this deployment accepts files. Remote
   uploads stay unavailable until the configured service explicitly enables them. */

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

/** Fictional status belongs to the dataset, independently of where it runs. */
export const isFictional = (_deployment: Deployment, dataset: { synthetic?: boolean } | null): boolean =>
  dataset?.synthetic === true;

export const HOSTED_UPLOADS_NOTE = 'Uploads are turned off in the hosted demo, which holds fictional records only. To check private files, run PRISM locally on your own computer.';
const REMOTE_UPLOADS_NOTE = 'The service has not enabled uploads. Reconnect to the configured PRISM service to import tables.';

export function deriveDeployment(origin: { host: string; local: boolean }, health: 'checking' | 'ok' | 'down', info: ApiHealth | null): Deployment {
  const fictionalOnly = info?.deploymentMode === 'synthetic_demo';
  const flagged = fictionalOnly || info?.deploymentMode === 'hosted_workbench';
  const unknownRemote = !origin.local && info === null;
  const hosted = flagged || unknownRemote;
  const kind: DeploymentKind = hosted ? 'hosted' : !origin.local ? 'remote' : 'local';
  const uploadsAllowed = health === 'ok' && (origin.local && !flagged
    ? info?.uploadsAllowed !== false : info?.uploadsAllowed === true);
  return {
    kind,
    hosted,
    provisional: unknownRemote,
    uploadsAllowed,
    uploadsNote: uploadsAllowed ? '' : health !== 'ok' ? 'Waiting for the service to confirm that uploads are available.'
      : fictionalOnly ? HOSTED_UPLOADS_NOTE : !origin.local ? REMOTE_UPLOADS_NOTE : 'This service has turned uploads off.',
    label: fictionalOnly ? 'Hosted fictional demo' : kind === 'hosted' ? 'Hosted workbench' : kind === 'remote' ? 'Remote workbench' : 'Local',
    place: kind === 'hosted' ? 'on the hosted Python service' : kind === 'remote' ? `on ${origin.host || 'a remote server'}` : health === 'checking' ? 'by the service' : 'on this computer',
  };
}
