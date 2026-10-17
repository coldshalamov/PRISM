import { isLocalHost } from './deployment';
import type {
  ApiHealth, AuditMode, Candidate, ColumnSpec, Dataset, ExportFormat, LabResult, Registry,
  ResearchQuery, SearchResult, TransformStep,
} from './types';

export class ApiError extends Error {
  code: string;
  details: unknown;
  constructor(message: string, code: string, details: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/** Codes the service returns when the in-memory session no longer holds an object. */
export const SESSION_LOST_CODES = new Set(['dataset_not_found', 'candidate_not_found', 'search_not_found', 'session_not_found', 'session_expired']);
export const CANDIDATE_LIMIT_CODES = new Set(['candidate_limit_exceeded', 'max_candidates_exceeded', 'session_candidate_limit', 'too_many_candidates', 'candidate_cap_reached', 'session_limit_exceeded']);
export const STORAGE_ERROR_CODES = new Set(['storage_error', 'storage_unavailable', 'archie_error', 'persistence_failed', 'session_storage_failed']);
export const isAbort = (error: unknown) => error instanceof ApiError && error.code === 'ABORTED';
export const isCandidateLimitError = (error: unknown) =>
  error instanceof ApiError && (CANDIDATE_LIMIT_CODES.has(error.code) || /candidate limit|max(imum)?\s+candidates|too many candidates|session.*candidate.*cap/i.test(error.message));
export const isStorageError = (error: unknown) =>
  error instanceof ApiError && (STORAGE_ERROR_CODES.has(error.code) || /archie|session storage|storage unavailable|persistence failed/i.test(error.message));

let hostedModeSeen = false;
export function markHostedMode(isHosted: boolean) {
  hostedModeSeen = isHosted;
}

function describeDetails(details: unknown): string {
  if (!details) return '';
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) {
    const first = details[0] as { msg?: string; loc?: unknown[] } | string | undefined;
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && first.msg) return `${first.msg}${first.loc ? ` (${first.loc.join('.')})` : ''}`;
  }
  if (typeof details === 'object' && 'fields' in (details as object)) {
    const fields = (details as { fields?: unknown }).fields;
    if (Array.isArray(fields) && fields.length) return `Check: ${fields.join(', ')}.`;
  }
  return '';
}

/** The wording depends on where the page is served from: a local run can be restarted, a hosted demo cannot. */
const unreachableMessage = (): string => (isLocalHost(window.location.hostname) && !hostedModeSeen
  ? 'The local PRISM service is not reachable. Start the backend on 127.0.0.1:8000 and retry.'
  : 'The PRISM service is not reachable. Check your connection and retry in a moment.');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiError('Request cancelled.', 'ABORTED', null);
    throw new ApiError(unreachableMessage(), 'UNREACHABLE', null);
  }
  if (!response.ok) {
    let body: { message?: string; code?: string; details?: unknown; detail?: unknown } = {};
    try { body = await response.json(); } catch { /* service may be starting */ }
    const details = body.details ?? body.detail;
    const extra = describeDetails(details);
    const message = body.message || (typeof body.detail === 'string' ? body.detail : '') || `Request failed (${response.status}).`;
    throw new ApiError(extra && !message.includes(extra) ? `${message} ${extra}` : message, body.code || `HTTP_${response.status}`, details);
  }
  if (response.status === 204) return undefined as T;
  try {
    return await (response.json() as Promise<T>);
  } catch {
    throw new ApiError('The service returned a response PRISM could not read. Retry; if it persists the service may be misconfigured.', 'BAD_RESPONSE', null);
  }
}

const post = <T,>(path: string, body: unknown, signal?: AbortSignal) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body), signal });

/* The service rejects unknown keys, so every outgoing object is rebuilt from known fields. */
export function cleanSchema(schema: ColumnSpec[]): ColumnSpec[] {
  return schema.map(column => {
    const out: ColumnSpec = { name: column.name, dtype: column.dtype, role: column.role, importance: column.importance };
    if (column.unit) out.unit = column.unit;
    if (column.sensitivityReason) out.sensitivityReason = column.sensitivityReason;
    return out;
  });
}
export function cleanWorkload(workload: ResearchQuery[]): ResearchQuery[] {
  return workload.map(query => {
    const out: ResearchQuery = {
      id: query.id, type: query.type, weight: query.weight, tolerance: query.tolerance, minCohort: query.minCohort,
    };
    if (query.groupBy?.length) out.groupBy = query.groupBy;
    if (query.target) out.target = query.target;
    if (query.filter && Object.keys(query.filter).length) out.filter = query.filter;
    if (query.positiveValue !== undefined && query.positiveValue !== null && query.positiveValue !== '') out.positiveValue = query.positiveValue;
    return out;
  });
}
export type RecipeStep = TransformStep & { uid?: string; disabled?: boolean };
/** Only enabled steps with server-known keys are sent; UI-only fields never leave the page. */
export function cleanSteps(steps: RecipeStep[]): TransformStep[] {
  return steps.filter(step => !step.disabled).map(step => ({ method: step.method, columns: [...step.columns], params: { ...step.params } }));
}

export interface SearchConstraints { minK: number; maxSuppression: number; maxUnique: number; maxLoss: number }

/** Threat scenario shared by every evaluation request. */
export interface ThreatRequest { qi: string[]; sensitive: string[]; membershipKnown: boolean }

export type Fixture = 'architecture' | 'kit';
export const EXPORT_ACKNOWLEDGMENTS = ['authority', 'limitations', 'reviewed'] as const;
export type Acknowledgment = typeof EXPORT_ACKNOWLEDGMENTS[number];

export const api = {
  health: () => request<ApiHealth>('/health'),
  demo: (fixture: Fixture = 'architecture') => request<Dataset>(fixture === 'kit' ? '/v1/demo?fixture=kit' : '/v1/demo'),
  registry: () => request<Registry>('/v1/registry'),
  lab: () => request<LabResult>('/v1/lab'),
  importDataset: (file: File, signal?: AbortSignal) => {
    const data = new FormData();
    data.append('file', file);
    return request<Dataset>('/v1/datasets/import', { method: 'POST', body: data, signal });
  },
  saveSchema: (datasetId: string, schema: ColumnSpec[], rowUnit?: { entityColumn?: string | null; oneRowPerPersonConfirmed?: boolean }) =>
    request<Dataset>(`/v1/datasets/${encodeURIComponent(datasetId)}/schema`, {
      method: 'PATCH',
      body: JSON.stringify({
        schema: cleanSchema(schema),
        ...(rowUnit && rowUnit.entityColumn !== undefined ? { entityColumn: rowUnit.entityColumn } : {}),
        ...(rowUnit && rowUnit.oneRowPerPersonConfirmed !== undefined ? { oneRowPerPersonConfirmed: rowUnit.oneRowPerPersonConfirmed } : {}),
      }),
    }),
  createCandidate: (datasetId: string, steps: RecipeStep[], threat: ThreatRequest, workload: ResearchQuery[], name?: string, signal?: AbortSignal) =>
    post<Candidate>('/v1/candidates', { datasetId, steps: cleanSteps(steps), ...threat, workload: cleanWorkload(workload), seed: 42, ...(name ? { name } : {}) }, signal),
  assess: (candidateId: string, threat: ThreatRequest, workload: ResearchQuery[], signal?: AbortSignal) =>
    post<Candidate>('/v1/assessments', { candidateId, ...threat, workload: cleanWorkload(workload) }, signal),
  comparison: (candidateId: string) => request<Candidate>(`/v1/candidates/${encodeURIComponent(candidateId)}/comparison`),
  search: (datasetId: string, threat: ThreatRequest, workload: ResearchQuery[], maxCandidates: number, constraints: SearchConstraints, signal?: AbortSignal) =>
    post<SearchResult>('/v1/search', { datasetId, ...threat, workload: cleanWorkload(workload), maxCandidates, constraints }, signal),
  audit: (payload: {
    originalDatasetId: string; protectedDatasetId: string; mode: AuditMode; threat: ThreatRequest;
    workload: ResearchQuery[]; columnMapping?: Record<string, string>; lineage?: number[];
  }, signal?: AbortSignal) => {
    const { threat, workload, ...rest } = payload;
    return post<Candidate>('/v1/audits/import-pair', { ...rest, ...threat, workload: cleanWorkload(workload) }, signal);
  },
  clearSession: () => request<unknown>('/v1/session', { method: 'DELETE' }),
  /** Requests the file from the service and hands it to the browser as a download. */
  exportReport: async (candidateId: string, format: ExportFormat, acknowledgments?: Acknowledgment[]): Promise<string> => {
    let response: Response;
    try {
      response = await fetch('/v1/reports/export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, format, ...(format === 'csv' ? { acknowledgments: acknowledgments ?? [] } : {}) }),
      });
    } catch {
      throw new ApiError(unreachableMessage(), 'UNREACHABLE', null);
    }
    if (!response.ok) {
      let body: { message?: string; code?: string; detail?: unknown } = {};
      try { body = await response.json(); } catch { /* ignore */ }
      throw new ApiError(body.message || (typeof body.detail === 'string' ? body.detail : '') || 'Export was blocked. Review direct identifiers and candidate coverage.', body.code || `HTTP_${response.status}`, body.detail);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = match?.[1] ? decodeURIComponent(match[1]) : `prism-${format}.${format === 'recipe' ? 'json' : format}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return filename;
  },
};
