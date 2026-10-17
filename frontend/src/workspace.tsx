import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError, isAbort, isCandidateLimitError, isStorageError, markHostedMode, SESSION_LOST_CODES } from './api';
import type { Acknowledgment, Fixture, SearchConstraints, ThreatRequest } from './api';
import { isAudit, staleReasons } from './analysis';
import type { StaleReason } from './analysis';
import { deriveDeployment, isLocalHost } from './deployment';
import type { Deployment } from './deployment';
import { extraSteps, normalizeSteps, presetSteps, seedSteps, sameSteps } from './recipe';
import type { PresetId, RecipeStep } from './recipe';
import { defaultScenario, scenarioById } from './scenarios';
import { threatFromSchema } from './threat';
import type { Threat } from './threat';
import type {
  ApiHealth, AuditMode, Candidate, ColumnSpec, Dataset, DatasetSemantics, ExportFormat, LabResult, Registry, ResearchQuery,
  RowUnit, SearchResult, SemanticMetadataPreview, SemanticOverrides, ViewId,
} from './types';

/* One browser workspace. Only harmless layout preferences are written to localStorage.
   The service owns tables and candidate evidence; "Clear session" asks it to delete them.
   Local runs keep files on this computer. Hosted uploads use Archie Core and Vercel
   according to service-reported capabilities (see `deployment`).

   Evidence discipline: a candidate is an immutable snapshot. The current controls (recipe, attacker
   assumptions, research questions, field classifications) can drift from it; `stale` names exactly
   what drifted, and export is unavailable until a matching evaluation exists. Only one request of
   each kind runs at a time, each carries an identity, and a response that is no longer the latest
   (or belongs to an older session) is discarded rather than shown. */

export type BusyKey = 'boot' | 'apply' | 'assess' | 'search' | 'schema' | 'import' | 'audit' | 'export' | 'clear';
export interface Toast { id: number; tone: 'info' | 'warn' | 'error'; message: string }
export interface CandidateMeta { kind: 'created' | 'search' | 'audit'; label: string }
export interface UiPrefs { library: boolean; inspector: boolean; ledger: boolean }

const UI_KEY = 'prism.ui.v1';
const VIEWS: ViewId[] = ['workbench', 'map', 'lab', 'intent', 'pareto', 'report'];
const BUSY_KEYS: BusyKey[] = ['boot', 'apply', 'assess', 'search', 'schema', 'import', 'audit', 'export', 'clear'];
const BUSY_LABEL: Record<BusyKey, string> = {
  boot: 'loading the demo', apply: 'the candidate evaluation', assess: 'the re-evaluation', search: 'the candidate search',
  schema: 'saving classifications or inspecting field semantics', import: 'the import', audit: 'the external audit', export: 'the export', clear: 'clearing the session',
};

function loadPrefs(): UiPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}') as Partial<UiPrefs>;
    return { library: raw.library ?? true, inspector: raw.inspector ?? true, ledger: raw.ledger ?? true };
  } catch {
    return { library: true, inspector: true, ledger: true };
  }
}
function viewFromHash(): ViewId {
  const hash = window.location.hash.replace(/^#\/?/, '') as ViewId;
  return VIEWS.includes(hash) ? hash : 'workbench';
}
const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
const emptyThreat: Threat = { known: [], secret: [], membershipKnown: true };
const sameThreat = (a: Threat, b: Threat) =>
  JSON.stringify([[...a.known].sort(), [...a.secret].sort(), a.membershipKnown]) === JSON.stringify([[...b.known].sort(), [...b.secret].sort(), b.membershipKnown]);

interface Flight { id: number; controller: AbortController; epoch: number }
export interface PresetPrompt { id: PresetId; extras: RecipeStep[] }
export interface ReplacePrompt { label: string; run: () => void }

export interface Workspace {
  view: ViewId;
  setView: (view: ViewId) => void;
  health: 'checking' | 'ok' | 'down';
  healthInfo: ApiHealth | null;
  origin: { local: boolean; host: string };
  /** Service-reported deployment capabilities decide uploads and computation descriptions. */
  deployment: Deployment;
  prefs: UiPrefs;
  setPrefs: (change: Partial<UiPrefs>) => void;

  dataset: Dataset | null;
  fixture: Fixture | null;
  bootError: string;
  reviewed: boolean;
  rowUnit: RowUnit | null;
  sessionLost: boolean;
  limitReached: boolean;
  storedCandidateCount: number;
  storageError: string;
  dismissStorageError: () => void;

  threat: Threat;
  setThreat: (threat: Threat) => void;
  qi: string[];
  sensitive: string[];

  scenarioId: string;
  setScenarioId: (id: string) => void;
  constraints: SearchConstraints;
  setConstraints: (constraints: SearchConstraints) => void;

  steps: RecipeStep[];
  setSteps: (steps: RecipeStep[]) => void;
  requestPreset: (id: PresetId) => void;
  presetPrompt: PresetPrompt | null;
  resolvePreset: (choice: 'keep' | 'discard' | 'cancel') => void;
  replacePrompt: ReplacePrompt | null;
  requestReplace: (label: string, run: () => void) => void;
  resolveReplace: (confirmed: boolean) => void;

  workload: ResearchQuery[];
  setWorkload: (workload: ResearchQuery[]) => void;
  workloadDirty: boolean;
  workloadDraftVersion: number;
  workloadDraft: { id: string; draft: unknown } | null;
  setWorkloadDraft: (next: { id: string; draft: unknown; dirty: boolean } | null) => void;
  discardWorkloadDraft: () => void;

  baseline: Candidate | null;
  baselineUsable: boolean;
  candidates: Candidate[];
  active: Candidate | null;
  select: (id: string) => void;
  meta: Record<string, CandidateMeta>;
  labelOf: (id: string) => string;
  findCandidate: (id: string) => Candidate | null;
  stale: StaleReason[];
  /** Which current controls differ from any snapshot (recipe drift is only judged for the active one). */
  staleFor: (candidate: Candidate) => StaleReason[];

  search: SearchResult | null;
  compare: string[];
  toggleCompare: (id: string) => void;

  registry: Registry | null;
  lab: LabResult | null;

  busy: Record<BusyKey, boolean>;
  cancel: (key: BusyKey) => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;

  loadDemo: (fixture?: Fixture) => Promise<void>;
  recoverSession: (clearExisting?: boolean) => Promise<void>;
  importOriginal: (dataset: Dataset) => void;
  importFile: (file: File) => Promise<Dataset | null>;
  saveSchema: (schema: ColumnSpec[], rowUnit?: { entityColumn?: string | null; oneRowPerPersonConfirmed?: boolean }, thenApply?: boolean) => Promise<boolean>;
  /** Runs through the same single-flight `schema` gate as saveSchema. Updates only `dataset.semantic`, and only for the dataset that was inspected. */
  previewSemantics: () => Promise<SemanticMetadataPreview | null>;
  inspectSemantics: (allowRemote: boolean, overrides?: SemanticOverrides, metadataDigest?: string) => Promise<DatasetSemantics | null>;
  apply: (options?: { steps?: RecipeStep[] }) => Promise<Candidate | null>;
  assess: () => Promise<boolean>;
  runSearch: (maxCandidates: number) => Promise<boolean>;
  adopt: (id: string) => void;
  runAudit: (payload: { protectedDatasetId: string; mode: AuditMode; columnMapping: Record<string, string>; lineage?: number[] }) => Promise<Candidate | null>;
  exportCandidate: (id: string, format: ExportFormat, acknowledgments?: Acknowledgment[]) => Promise<boolean>;
  clearSession: () => Promise<boolean>;
}

const Context = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const value = useContext(Context);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ViewId>(viewFromHash);
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [healthInfo, setHealthInfo] = useState<ApiHealth | null>(null);
  const [prefs, setPrefsState] = useState<UiPrefs>(loadPrefs);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [bootError, setBootError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [threat, setThreatState] = useState<Threat>(emptyThreat);
  const [scenarioId, setScenarioId] = useState<string>(defaultScenario.id);
  const [constraints, setConstraints] = useState<SearchConstraints>(defaultScenario.limits);
  const [steps, setStepsState] = useState<RecipeStep[]>([]);
  const [workload, setWorkloadState] = useState<ResearchQuery[]>([]);
  const [workloadDirty, setWorkloadDirty] = useState(false);
  const [workloadDraftVersion, setWorkloadDraftVersion] = useState(0);
  const [workloadDraft, setWorkloadDraftState] = useState<{ id: string; draft: unknown } | null>(null);
  const [baseline, setBaseline] = useState<Candidate | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [storedCandidateIds, setStoredCandidateIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, CandidateMeta>>({});
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [lab, setLab] = useState<LabResult | null>(null);
  const [busyCount, setBusyCount] = useState<Record<BusyKey, number>>(() => Object.fromEntries(BUSY_KEYS.map(key => [key, 0])) as Record<BusyKey, number>);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [presetPrompt, setPresetPrompt] = useState<PresetPrompt | null>(null);
  const [replacePrompt, setReplacePrompt] = useState<ReplacePrompt | null>(null);

  const toastId = useRef(0);
  const labelCounters = useRef({ created: 0, audit: 0 });
  const pendingApply = useRef(false);
  const flights = useRef<Partial<Record<BusyKey, Flight>>>({});
  const flightCounter = useRef(0);
  const epoch = useRef(0);

  const qi = threat.known;
  const sensitive = threat.secret;
  const rowUnit = dataset?.rowUnit ?? null;
  const threatRequest = useCallback((): ThreatRequest => ({ qi: threat.known, sensitive: threat.secret, membershipKnown: threat.membershipKnown }), [threat]);

  const busy = useMemo(() => Object.fromEntries(
    Object.entries(busyCount).map(([key, count]) => [key, count > 0]),
  ) as Record<BusyKey, boolean>, [busyCount]);

  /* Errors stay until dismissed (they often carry the only explanation of a blocked action);
     information and warnings clear themselves. An identical message replaces its earlier copy. */
  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts(current => [...current.filter(toast => toast.message !== message).slice(-3), { id, tone, message }]);
    if (tone !== 'error') window.setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), tone === 'warn' ? 10000 : 6000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts(current => current.filter(t => t.id !== id)), []);

  /* ----- request identity: single flight per kind, cancellable, stale responses discarded ----- */
  const handleFailure = useCallback((error: unknown, fallback: string) => {
    if (isAbort(error)) return;
    if (error instanceof ApiError && SESSION_LOST_CODES.has(error.code)) {
      setSessionLost(true);
      return;
    }
    if (isCandidateLimitError(error)) {
      setLimitHit(true);
      notify(errorText(error, 'This session reached its stored-candidate limit. Download any evidence you want to keep, then clear the session to continue.'), 'error');
      return;
    }
    if (isStorageError(error)) {
      const msg = errorText(error, 'Session storage could not be updated. Retry or clear the session to start fresh.');
      setStorageError(msg);
      notify(msg, 'error');
      return;
    }
    if (error instanceof ApiError && error.code === 'UNREACHABLE') setHealth('down');
    notify(errorText(error, fallback), 'error');
  }, [notify]);
  const dismissStorageError = useCallback(() => setStorageError(''), []);

  const run = useCallback(async <T,>(key: BusyKey, fallback: string, work: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
    if (flights.current[key]) return null;
    // Archie uses one optimistic version for this visitor. Even exporting can
    // renew that version, so session operations must not overlap a search/write.
    // Boot/reference/health reads retain their existing independent recovery.
    const pending = Object.keys(flights.current)[0] as BusyKey | undefined;
    if (key !== 'boot' && pending) {
      notify(`Wait for ${BUSY_LABEL[pending]} to finish before ${BUSY_LABEL[key]}.`, 'warn');
      return null;
    }
    const flight: Flight = { id: ++flightCounter.current, controller: new AbortController(), epoch: epoch.current };
    flights.current[key] = flight;
    setBusyCount(current => ({ ...current, [key]: current[key] + 1 }));
    try {
      const value = await work(flight.controller.signal);
      const latest = flights.current[key] === flight && flight.epoch === epoch.current && !flight.controller.signal.aborted;
      return latest ? value : null;
    } catch (error) {
      if (flight.epoch === epoch.current && !flight.controller.signal.aborted) handleFailure(error, fallback);
      return null;
    } finally {
      if (flights.current[key] === flight) delete flights.current[key];
      setBusyCount(current => ({ ...current, [key]: Math.max(0, current[key] - 1) }));
    }
  }, [handleFailure, notify]);

  const cancel = useCallback((key: BusyKey) => {
    const flight = flights.current[key];
    if (!flight) return;
    flight.controller.abort();
    notify(`Stopped waiting for ${BUSY_LABEL[key]}. The service may still finish it; PRISM discards that result and keeps your earlier candidates.`, 'warn');
  }, [notify]);

  /* ----- navigation and preferences ----- */
  useEffect(() => {
    const onHash = () => setViewState(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setView = useCallback((next: ViewId) => {
    if (window.location.hash !== `#/${next}`) window.location.hash = `/${next}`;
    setViewState(next);
  }, []);
  const setPrefs = useCallback((change: Partial<UiPrefs>) => {
    setPrefsState(current => {
      const next = { ...current, ...change };
      try { localStorage.setItem(UI_KEY, JSON.stringify(next)); } catch { /* layout preference only */ }
      return next;
    });
  }, []);

  const origin = useMemo(() => {
    const host = window.location.hostname;
    return { host, local: isLocalHost(host) };
  }, []);
  const deployment = useMemo(() => deriveDeployment(origin, health, healthInfo), [origin, health, healthInfo]);
  useEffect(() => { markHostedMode(deployment.hosted); }, [deployment.hosted]);
  const maxStoredCandidates = healthInfo?.maxCandidates ?? (deployment.hosted ? 40 : null);
  const storedCandidateCount = useMemo(() => new Set([
    ...storedCandidateIds,
    ...candidates.map(candidate => candidate.candidateId),
    ...(search?.candidates.map(candidate => candidate.candidateId) ?? []),
    ...(baseline ? [baseline.candidateId] : []),
  ]).size, [storedCandidateIds, candidates, search, baseline]);
  const limitReached = limitHit || (maxStoredCandidates !== null && storedCandidateCount >= maxStoredCandidates);
  const rememberCandidates = useCallback((items: (Candidate | null)[]) => {
    setStoredCandidateIds(current => [...new Set([...current, ...items.flatMap(candidate => candidate ? [candidate.candidateId] : [])])]);
  }, []);

  /* ----- service health ----- */
  const checkHealth = useCallback(async () => {
    try {
      const info = await api.health();
      setHealthInfo(info);
      setHealth(info.status === 'ok' ? 'ok' : 'down');
    } catch {
      setHealth('down');
    }
  }, []);
  useEffect(() => { void checkHealth(); }, [checkHealth]);
  /* Poll gently while connected and quickly while the service is away, and re-check the moment the
     browser regains its connection or the tab becomes visible again. */
  useEffect(() => {
    const interval = health === 'down' ? 5000 : 30000;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void checkHealth(); }, interval);
    const recheck = () => { if (document.visibilityState === 'visible') void checkHealth(); };
    window.addEventListener('online', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [checkHealth, health]);

  /* ----- derived candidate state ----- */
  const findCandidate = useCallback((id: string): Candidate | null => (
    candidates.find(c => c.candidateId === id)
    ?? search?.candidates.find(c => c.candidateId === id)
    ?? (baseline?.candidateId === id ? baseline : null)
  ), [candidates, search, baseline]);

  const active = useMemo(() => (activeId ? findCandidate(activeId) : null), [activeId, findCandidate]);
  const labelOf = useCallback((id: string) => (baseline?.candidateId === id ? 'Unprotected' : meta[id]?.label ?? 'Candidate'), [meta, baseline]);

  const controls = useMemo(() => (dataset ? {
    steps, known: threat.known, secret: threat.secret, membershipKnown: threat.membershipKnown,
    workload, workloadDirty, schema: dataset.schema, rowUnit: dataset.rowUnit ?? null, semanticRevision: dataset.semantic?.revision ?? null,
  } : null), [dataset, steps, threat, workload, workloadDirty]);
  const stale = useMemo<StaleReason[]>(() => {
    if (!active || !controls) return [];
    const all = staleReasons(active, controls);
    return all;
  }, [active, controls, baseline]);
  const staleFor = useCallback((candidate: Candidate): StaleReason[] => {
    if (!controls) return [];
    const all = staleReasons(candidate, controls);
    return candidate.candidateId !== activeId ? all.filter(reason => reason !== 'recipe') : all;
  }, [activeId, baseline, controls]);
  const baselineUsable = useMemo(() => {
    if (!baseline || !controls) return false;
    return !staleReasons(baseline, controls).some(reason => reason === 'threat' || reason === 'classifications');
  }, [baseline, controls]);

  const setSteps = useCallback((next: RecipeStep[]) => setStepsState(next), []);
  const setWorkload = useCallback((next: ResearchQuery[]) => {
    setWorkloadState(next);
    setWorkloadDirty(false);
    setWorkloadDraftState(null);
  }, []);
  const setWorkloadDraft = useCallback((next: { id: string; draft: unknown; dirty: boolean } | null) => {
    if (!next || !next.dirty) {
      setWorkloadDirty(false);
      setWorkloadDraftState(null);
    } else {
      setWorkloadDirty(true);
      setWorkloadDraftState({ id: next.id, draft: next.draft });
    }
  }, []);
  const discardWorkloadDraft = useCallback(() => {
    setWorkloadDirty(false);
    setWorkloadDraftState(null);
    setWorkloadDraftVersion(version => version + 1);
  }, []);
  const setThreat = useCallback((next: Threat) => setThreatState(next), []);

  const resetEverything = useCallback(() => {
    epoch.current += 1;
    Object.values(flights.current).forEach(flight => flight?.controller.abort());
    flights.current = {};
    setBusyCount(Object.fromEntries(BUSY_KEYS.map(key => [key, 0])) as Record<BusyKey, number>);
    setDataset(null);
    setFixture(null);
    setReviewed(false);
    setStepsState([]);
    setWorkloadState([]);
    setWorkloadDirty(false);
    setWorkloadDraftState(null);
    setThreatState(emptyThreat);
    setBaseline(null);
    setCandidates([]);
    setActiveId(null);
    setMeta({});
    setSearch(null);
    setCompare([]);
    setSessionLost(false);
    setLimitHit(false);
    setStorageError('');
    labelCounters.current = { created: 0, audit: 0 };
  }, []);

  const beginDataset = useCallback((next: Dataset, which: Fixture | null) => {
    resetEverything();
    setDataset(next);
    setFixture(which);
    setStepsState(seedSteps(next.defaultSteps));
    setWorkloadState(next.defaultWorkload);
    setThreatState(threatFromSchema(next.schema));
    setBootError('');
  }, [resetEverything]);

  /* ----- boot, demos and replacement ----- */
  const loadDemo = useCallback(async (which: Fixture = 'architecture') => {
    await run('boot', 'The synthetic demo could not be loaded.', async () => {
      try {
        const demo = await api.demo(which);
        beginDataset(demo, which);
        setHealth('ok');
        return demo;
      } catch (error) {
        setBootError(errorText(error, 'The synthetic demo could not be loaded.'));
        if (error instanceof ApiError && error.code === 'UNREACHABLE') setHealth('down');
        throw error;
      }
    });
  }, [beginDataset, run]);

  /* The capability register and counterexamples are reference data. Fetch whichever is still missing,
     so a service that was away at start-up fills them in once it is back. */
  const registryRef = useRef<Registry | null>(null);
  const labRef = useRef<LabResult | null>(null);
  useEffect(() => { registryRef.current = registry; labRef.current = lab; }, [registry, lab]);
  const loadReference = useCallback(() => {
    if (!registryRef.current) api.registry().then(setRegistry).catch(() => undefined);
    if (!labRef.current) api.lab().then(setLab).catch(() => undefined);
  }, []);

  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void loadDemo('architecture');
    loadReference();
  }, [loadDemo, loadReference]);

  /* When the service comes back after a failed start, load the demo again instead of leaving the error up. */
  const previousHealth = useRef(health);
  useEffect(() => {
    const was = previousHealth.current;
    previousHealth.current = health;
    if (health !== 'ok' || was === 'ok') return;
    loadReference();
    if (!dataset && bootError && !busy.boot) void loadDemo('architecture');
  }, [bootError, busy.boot, dataset, health, loadDemo, loadReference]);

  const importFile = useCallback(async (file: File) => {
    if (!deployment.uploadsAllowed) {
      notify(deployment.uploadsNote, 'warn');
      return null;
    }
    return run('import', 'The file could not be imported.', signal => api.importDataset(file, signal));
  }, [deployment.uploadsAllowed, deployment.uploadsNote, notify, run]);

  const importOriginal = useCallback((next: Dataset) => {
    if (!deployment.uploadsAllowed) {
      notify(deployment.uploadsNote, 'warn');
      return;
    }
    beginDataset(next, null);
    notify(`Imported ${next.name}. Review field roles, units and the person key before creating a candidate.`);
  }, [beginDataset, deployment.uploadsAllowed, deployment.uploadsNote, notify]);

  const requestReplace = useCallback((label: string, runAction: () => void) => {
    if (dataset && (candidates.length || search)) setReplacePrompt({ label, run: runAction });
    else runAction();
  }, [candidates.length, dataset, search]);
  const resolveReplace = useCallback((confirmed: boolean) => {
    const current = replacePrompt;
    setReplacePrompt(null);
    if (current && confirmed) current.run();
  }, [replacePrompt]);

  /* ----- classifications and person unit ----- */
  const saveSchema = useCallback(async (schema: ColumnSpec[], unit?: { entityColumn?: string | null; oneRowPerPersonConfirmed?: boolean }, thenApply = false) => {
    if (!dataset) return false;
    const done = await run('schema', 'Classifications could not be saved.', async () => {
      let updated: Dataset;
      try {
        updated = await api.saveSchema(dataset.datasetId, schema, unit);
      } catch (error) {
        if (unit && error instanceof ApiError && error.code === 'invalid_request') {
          updated = await api.saveSchema(dataset.datasetId, schema);
          notify('This service version could not record the person key, so the person-level assumption stays unconfirmed.', 'warn');
        } else throw error;
      }
      const customised = !sameSteps(steps, dataset.defaultSteps);
      const names = new Set(updated.schema.map(c => c.name));
      const wasSeeded = sameThreat(threat, threatFromSchema(dataset.schema));
      pendingApply.current = thenApply;
      setDataset(updated);
      setReviewed(true);
      setStepsState(customised ? steps.filter(step => step.columns.every(name => names.has(name))) : seedSteps(updated.defaultSteps));
      setThreatState(wasSeeded ? { ...threatFromSchema(updated.schema), membershipKnown: threat.membershipKnown } : {
        ...threat, known: threat.known.filter(name => names.has(name)), secret: threat.secret.filter(name => names.has(name)),
      });
      if (!workload.length) setWorkloadState(updated.defaultWorkload);
      return true;
    });
    return Boolean(done);
  }, [dataset, notify, run, steps, threat, workload.length]);

  /* ----- field semantics ----- */
  /* The run callback only talks to the service. The dataset is touched afterwards, and only when `run` hands back the
     latest, same-session result; the functional update re-checks the id so a replaced dataset can never receive it.
     Semantics describe columns: schema, steps, threat, workload and every frozen candidate are left exactly as they are. */
  const previewSemantics = useCallback(async () => {
    if (!dataset) return null;
    return run('schema', 'The Jev metadata preview could not be prepared.', signal => api.previewSemantics(dataset.datasetId, signal));
  }, [dataset, run]);
  const inspectSemantics = useCallback(async (allowRemote: boolean, overrides: SemanticOverrides = {}, metadataDigest?: string) => {
    if (!dataset) return null;
    const datasetId = dataset.datasetId;
    const semantic = await run('schema', 'Field semantics could not be inspected.', signal => api.inspectSemantics(datasetId, allowRemote, overrides, signal, metadataDigest));
    if (!semantic) return null;
    setDataset(current => (current && current.datasetId === datasetId ? { ...current, semantic } : current));
    return semantic;
  }, [dataset, run]);

  /* ----- presets (never silently discard extra methods) ----- */
  const applyPreset = useCallback((id: PresetId, keepExtras: boolean) => {
    if (!dataset) return;
    const base = presetSteps(id, dataset.defaultSteps);
    const extras = keepExtras ? extraSteps(steps, dataset.defaultSteps) : [];
    setStepsState(normalizeSteps([...base, ...extras], threat.known));
  }, [dataset, steps, threat.known]);
  const requestPreset = useCallback((id: PresetId) => {
    if (!dataset) return;
    const extras = extraSteps(steps, dataset.defaultSteps);
    if (extras.length) setPresetPrompt({ id, extras });
    else applyPreset(id, false);
  }, [applyPreset, dataset, steps]);
  const resolvePreset = useCallback((choice: 'keep' | 'discard' | 'cancel') => {
    const current = presetPrompt;
    setPresetPrompt(null);
    if (current && choice !== 'cancel') applyPreset(current.id, choice === 'keep');
  }, [applyPreset, presetPrompt]);

  /* ----- candidates ----- */
  const nextCreatedLabel = useCallback(() => {
    labelCounters.current.created += 1;
    return `C${labelCounters.current.created}`;
  }, []);

  const apply = useCallback(async (options?: { steps?: RecipeStep[] }) => {
    if (!dataset) return null;
    if (!reviewed) {
      notify('Review field classifications before creating a candidate.', 'warn');
      return null;
    }
    if (workloadDirty) {
      notify('Save or discard your unsaved research question edits in Research Intent before evaluating.', 'warn');
      return null;
    }
    const recipe = normalizeSteps(options?.steps ?? steps, threat.known);
    const request = threatRequest();
    const needsBaseline = !baseline || !baselineUsable;
    const created = await run('apply', 'The candidate could not be created.', async signal => {
      // Archie serializes writes to one visitor's session. Create the baseline
      // after the candidate so their optimistic writes cannot conflict.
      const candidate = await api.createCandidate(dataset.datasetId, recipe, request, workload, undefined, signal);
      const base = needsBaseline
        ? await api.createCandidate(dataset.datasetId, [], request, workload, 'Unprotected baseline', signal).catch(() => null)
        : null;
      return { candidate, base };
    });
    if (!created) return null;
    rememberCandidates([created.candidate, created.base]);
    const label = nextCreatedLabel();
    setCandidates(current => [...current, created.candidate]);
    setMeta(current => ({ ...current, [created.candidate.candidateId]: { kind: 'created', label } }));
    setActiveId(created.candidate.candidateId);
    setStepsState(recipe);
    if (created.base) setBaseline(created.base);
    else if (needsBaseline) {
      setBaseline(null);
      notify('The unprotected baseline could not be measured, so before-and-after comparisons are unavailable.', 'warn');
    }
    return created.candidate;
  }, [baseline, baselineUsable, dataset, nextCreatedLabel, notify, rememberCandidates, reviewed, run, steps, threat.known, threatRequest, workload, workloadDirty]);

  /* After a first review the dialog asks for an immediate candidate; wait until the saved schema
     (and therefore known fields and default steps) has reached state before calling apply. */
  useEffect(() => {
    if (pendingApply.current && reviewed && !busy.apply) {
      pendingApply.current = false;
      void apply();
    }
  }, [apply, busy.apply, reviewed]);

  /* Re-evaluate the active snapshot's rows under the current attacker assumptions and questions.
     The service creates a new immutable candidate; the earlier one stays in the library. */
  const assess = useCallback(async () => {
    if (!active) return false;
    if (workloadDirty) {
      notify('Save or discard your unsaved research question edits in Research Intent before re-evaluating.', 'warn');
      return false;
    }
    const request = threatRequest();
    const result = await run('assess', 'The re-evaluation failed.', async signal => {
      const updated = await api.assess(active.candidateId, request, workload, signal);
      const base = baseline && baseline.candidateId !== active.candidateId
        ? await api.assess(baseline.candidateId, request, workload, signal).catch(() => null)
        : null;
      return { updated, base };
    });
    if (!result) return false;
    rememberCandidates([result.updated, result.base]);
    const audit = isAudit(active);
    let label: string;
    if (audit) {
      labelCounters.current.audit += 1;
      label = `A${labelCounters.current.audit}`;
    } else label = nextCreatedLabel();
    setCandidates(current => [...current, result.updated]);
    setMeta(current => ({ ...current, [result.updated.candidateId]: { kind: audit ? 'audit' : 'created', label } }));
    setActiveId(result.updated.candidateId);
    if (result.base) setBaseline(result.base);
    return true;
  }, [active, baseline, nextCreatedLabel, notify, rememberCandidates, run, threatRequest, workload, workloadDirty]);

  const runSearch = useCallback(async (maxCandidates: number) => {
    if (!dataset) return false;
    const cap = healthInfo?.maxSearchCandidates ?? (deployment.hosted ? 24 : 80);
    if (!Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > cap) {
      notify(`This service accepts up to ${cap} candidates per search. Choose a smaller budget.`, 'warn');
      return false;
    }
    const remaining = maxStoredCandidates === null ? null : Math.max(0, maxStoredCandidates - storedCandidateCount);
    if (remaining !== null && maxCandidates > remaining) {
      notify(remaining > 0
        ? `This session has room for at most ${remaining} more candidates. Lower the search budget to ${remaining} or fewer, or clear the session.`
        : 'This session has reached its stored-candidate limit. Download evidence you want to keep, then clear the session.', 'warn');
      return false;
    }
    if (!reviewed) {
      notify('Review field classifications before searching.', 'warn');
      return false;
    }
    if (workloadDirty) {
      notify('Save or discard your unsaved research question edits in Research Intent before searching.', 'warn');
      return false;
    }
    const limits: SearchConstraints = {
      minK: Math.max(1, Math.round(constraints.minK)),
      maxSuppression: Math.min(1, Math.max(0, constraints.maxSuppression)),
      maxUnique: Math.min(1, Math.max(0, constraints.maxUnique)),
      maxLoss: Math.min(1, Math.max(0, constraints.maxLoss)),
    };
    const request = threatRequest();
    const result = await run('search', 'The candidate search failed.', signal => api.search(dataset.datasetId, request, workload, maxCandidates, limits, signal));
    if (!result) return false;
    rememberCandidates(result.candidates);
    setSearch(result);
    setCompare([]);
    setMeta(current => {
      const next = { ...current };
      result.candidates.forEach((candidate, index) => { next[candidate.candidateId] = { kind: 'search', label: `S${index + 1}` }; });
      return next;
    });
    return true;
  }, [constraints, dataset, deployment.hosted, healthInfo?.maxSearchCandidates, maxStoredCandidates, notify, rememberCandidates, reviewed, run, storedCandidateCount, threatRequest, workload, workloadDirty]);

  /** Selecting an evaluated snapshot restores its exact recipe into the composer. */
  const select = useCallback((id: string) => {
    const candidate = findCandidate(id);
    if (!candidate) return;
    const dirty = active && !isAudit(active) && !sameSteps(normalizeSteps(steps, threat.known), active.recipe.steps);
    setActiveId(id);
    if (!isAudit(candidate)) {
      setStepsState(seedSteps(candidate.recipe.steps));
      if (dirty) notify(`Restored the recipe of ${meta[id]?.label ?? 'this candidate'}. Your unevaluated edits were replaced.`, 'warn');
    }
  }, [active, baseline, findCandidate, meta, notify, steps, threat.known]);

  const adopt = useCallback((id: string) => {
    const candidate = search?.candidates.find(c => c.candidateId === id);
    if (!candidate) return;
    setCandidates(current => (current.some(c => c.candidateId === id) ? current : [...current, candidate]));
    setActiveId(id);
    setStepsState(seedSteps(candidate.recipe.steps));
  }, [search]);

  const toggleCompare = useCallback((id: string) => {
    setCompare(current => (current.includes(id) ? current.filter(x => x !== id) : current.length >= 3 ? [...current.slice(1), id] : [...current, id]));
  }, []);

  const runAudit = useCallback(async (payload: { protectedDatasetId: string; mode: AuditMode; columnMapping: Record<string, string>; lineage?: number[] }) => {
    if (!dataset) return null;
    if (!deployment.uploadsAllowed) {
      notify(deployment.uploadsNote, 'warn');
      return null;
    }
    const request = threatRequest();
    const candidate = await run('audit', 'The external audit failed.', signal => api.audit({
      originalDatasetId: dataset.datasetId, protectedDatasetId: payload.protectedDatasetId, mode: payload.mode,
      threat: request, workload, columnMapping: payload.columnMapping, ...(payload.lineage ? { lineage: payload.lineage } : {}),
    }, signal));
    if (!candidate) return null;
    rememberCandidates([candidate]);
    labelCounters.current.audit += 1;
    const label = `A${labelCounters.current.audit}`;
    setCandidates(current => [...current, candidate]);
    setMeta(current => ({ ...current, [candidate.candidateId]: { kind: 'audit', label } }));
    setActiveId(candidate.candidateId);
    return candidate;
  }, [dataset, deployment.uploadsAllowed, deployment.uploadsNote, notify, rememberCandidates, run, threatRequest, workload]);

  const exportCandidate = useCallback(async (id: string, format: ExportFormat) => {
    const candidate = findCandidate(id);
    if (workloadDirty) {
      notify('Save or discard your unsaved research question edits in Research Intent before downloading.', 'warn');
      return false;
    }
    if (!candidate || !reviewed || sessionLost || health !== 'ok' || staleFor(candidate).length
      || busy.apply || busy.assess || busy.search || busy.schema || busy.import || busy.audit || busy.boot || busy.clear || busy.export) {
      notify('Export is unavailable until the selected snapshot matches the reviewed controls and the service is ready.', 'warn');
      return false;
    }
    const name = await run('export', 'Export failed.', () => api.exportReport(id, format));
    if (name) notify(`Downloaded ${name}`);
    return Boolean(name);
  }, [findCandidate, workloadDirty, reviewed, sessionLost, health, staleFor, busy, notify, run, setView]);

  const clearSession = useCallback(async () => {
    const cleared = await run('clear', 'The service did not confirm cleanup. Nothing was cleared from this page.', async () => {
      await api.clearSession();
      return true;
    });
    if (!cleared) return false;
    resetEverything();
    setStoredCandidateIds([]);
    setRegistry(null);
    setLab(null);
    try { localStorage.removeItem(UI_KEY); } catch { /* ignore */ }
    notify(`${deployment.hosted ? 'Session' : 'Local session'} cleared. Datasets, candidates and any uploads were deleted from the service and removed from this page.`);
    api.registry().then(setRegistry).catch(() => undefined);
    api.lab().then(setLab).catch(() => undefined);
    return true;
  }, [deployment.hosted, notify, resetEverything, run]);

  const recoverSession = useCallback(async (clearExisting = false) => {
    if (clearExisting) {
      // Preserve the visible snapshots and quota until durable cleanup succeeds.
      if (!await clearSession()) return;
    } else {
      resetEverything();
      setStoredCandidateIds([]);
    }
    await loadDemo(fixture ?? 'architecture');
    loadReference();
  }, [clearSession, fixture, loadDemo, loadReference, resetEverything]);

  const setScenario = useCallback((id: string) => {
    setScenarioId(id);
    setConstraints(scenarioById(id).limits);
  }, []);

  const value: Workspace = {
    view, setView, health, healthInfo, origin, deployment, prefs, setPrefs,
    dataset, fixture, bootError, reviewed, rowUnit, sessionLost, limitReached, storedCandidateCount, storageError, dismissStorageError,
    threat, setThreat, qi, sensitive,
    scenarioId, setScenarioId: setScenario, constraints, setConstraints,
    steps, setSteps, requestPreset, presetPrompt, resolvePreset, replacePrompt, requestReplace, resolveReplace,
    workload, setWorkload, workloadDirty, workloadDraftVersion, workloadDraft, setWorkloadDraft, discardWorkloadDraft,
    baseline, baselineUsable, candidates, active, select, meta, labelOf, findCandidate, stale, staleFor,
    search, compare, toggleCompare, registry, lab,
    busy, cancel, toasts, notify, dismissToast,
    loadDemo, recoverSession, importOriginal, importFile, saveSchema, previewSemantics, inspectSemantics, apply, assess, runSearch, adopt, runAudit, exportCandidate, clearSession,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
