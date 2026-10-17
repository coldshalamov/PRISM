import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FileUp, ScanSearch, Trash2 } from 'lucide-react';
import { useDialogs } from '../dialogs';
import { num, plural } from '../format';
import { Dialog } from '../ui/Dialog';
import { Notice } from '../ui/Feedback';
import { Tabs, panelProps } from '../ui/Tabs';
import { Term } from '../ui/Tip';
import { useWorkspace } from '../workspace';
import type { AuditMode, Dataset } from '../types';

const MAX_BYTES = 50 * 1024 * 1024;

function normalized(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, ''); }

function autoMap(original: Dataset, protectedSet: Dataset): Record<string, string> {
  const exact = new Set(protectedSet.schema.map(c => c.name));
  const byNormal = new Map(protectedSet.schema.map(c => [normalized(c.name), c.name]));
  const mapping: Record<string, string> = {};
  for (const column of original.schema) {
    if (exact.has(column.name)) mapping[column.name] = column.name;
    else if (byNormal.has(normalized(column.name))) mapping[column.name] = byNormal.get(normalized(column.name))!;
  }
  return mapping;
}

function parseLineage(text: string): number[] {
  return text.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
}

type ImportTab = 'original' | 'audit';

/* Wherever the service disables uploads, the import and audit
   entry points explain why and how to proceed instead of offering a file picker. */
export function ImportDialog({ initial, onClose }: { initial: ImportTab; onClose: () => void }) {
  const { deployment } = useWorkspace();
  return deployment.uploadsAllowed ? <UploadDialog initial={initial} onClose={onClose} /> : <UploadsOffDialog initial={initial} onClose={onClose} />;
}

function UploadsOffDialog({ initial, onClose }: { initial: ImportTab; onClose: () => void }) {
  const ws = useWorkspace();
  const { deployment } = ws;
  const demos = () => { onClose(); ws.setView('workbench'); };
  return (
    <Dialog
      title={initial === 'audit' ? 'Audit a protected file' : 'Import original dataset'}
      size="sm"
      onClose={onClose}
      footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
    >
      <Notice tone="warn" title={deployment.hosted ? 'Uploads are off in the hosted demo.' : 'Uploads are off here.'}>{deployment.uploadsNote}</Notice>
      <p>
        {deployment.hosted
          ? 'You can still explore everything the demo offers on its fictional records: the 5,000-record oncology demo and the 480-record benchmark with exact-linkage replay. Their measurements are real computations run on the demo server.'
          : 'You can explore the built-in fictional examples while the service confirms its upload capability.'}
      </p>
      <p className="muted">When you run PRISM locally, original and protected CSV, JSON, or XLSX tables are read only by the service on your own computer.</p>
      {ws.dataset ? null : <button type="button" className="btn" onClick={demos}>Go to the Workbench</button>}
    </Dialog>
  );
}

function UploadDialog({ initial, onClose }: { initial: ImportTab; onClose: () => void }) {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset } = ws;
  const hosted = ws.deployment.hosted || ws.deployment.kind === 'remote';
  const maxBytes = ws.healthInfo?.maxUploadBytes ?? (hosted ? 3 * 1024 * 1024 : MAX_BYTES);
  const maxMb = Number((maxBytes / (1024 * 1024)).toFixed(1));
  const [tab, setTab] = useState<ImportTab>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [protectedSet, setProtectedSet] = useState<Dataset | null>(null);
  const [mode, setMode] = useState<AuditMode>('unpaired_microdata');
  const [lineageText, setLineageText] = useState('');
  const [attested, setAttested] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ws.cancel('import'); ws.cancel('audit'); };
  }, [ws.cancel]);
  const close = () => {
    mounted.current = false;
    ws.cancel('import');
    ws.cancel('audit');
    onClose();
  };

  const lineage = useMemo(() => (mode === 'paired_row_preserving' ? parseLineage(lineageText) : []), [lineageText, mode]);
  const lineageProblem = useMemo(() => {
    if (mode !== 'paired_row_preserving' || !protectedSet || !dataset) return '';
    if (!lineage.length) return 'Provide one original row index per protected row.';
    if (lineage.length !== protectedSet.rowCount) return `${plural(lineage.length, 'index', 'indexes')} for ${plural(protectedSet.rowCount, 'protected row')}; they must match exactly.`;
    if (lineage.some(n => !Number.isInteger(n) || n < 0 || n >= dataset.rowCount)) return `Indexes must be whole numbers from 0 to ${num(dataset.rowCount - 1, 0)}.`;
    if (new Set(lineage).size !== lineage.length) return 'Each original row can be paired with only one protected row.';
    return '';
  }, [lineage, mode, protectedSet, dataset]);

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setError('');
    if (file.size > maxBytes) { setError(`This file is larger than the ${maxMb} MB limit.`); return; }
    if (!/\.(csv|json|xlsx)$/i.test(file.name)) { setError('Choose a CSV, JSON table, or XLSX workbook.'); return; }
    setBusy(true);
    try {
      const data = await ws.importFile(file);
      if (!mounted.current) return;
      if (!data) { setError('The file was not imported. Check the service message and try again.'); return; }
      if (tab === 'original') {
        ws.importOriginal(data);
        if (ws.view === 'guide') onClose();
        else dialogs.open('review');
      } else if (dataset) {
        setProtectedSet(data);
        setMapping(autoMap(dataset, data));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The file could not be imported.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function readLineage(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Lineage file is too large (5 MB limit).'); return; }
    setLineageText(await file.text());
  }

  async function runAudit() {
    if (!protectedSet) return;
    setError('');
    const columnMapping = Object.fromEntries(Object.entries(mapping).filter(([, value]) => value));
    const candidate = await ws.runAudit({
      protectedDatasetId: protectedSet.datasetId, mode, columnMapping, ...(mode === 'paired_row_preserving' ? { lineage } : {}),
    });
    if (candidate) {
      ws.setView('workbench');
      ws.notify(`External audit complete (${candidate.alignment === 'verified' ? 'verified pairing' : 'unknown pairing'}). Results are ready to compare.`);
      onClose();
    }
  }

  const canAudit = Boolean(protectedSet) && !ws.busy.audit && (mode !== 'paired_row_preserving' || (attested && !lineageProblem));

  return (
    <Dialog
      title={tab === 'original' ? 'Import original dataset' : 'Audit a protected file'}
      description={`${hosted ? 'Files are stored in your session in Archie Core and read by the Python service through Vercel.' : 'Files are read by the local service on this computer.'} CSV or JSON (UTF-8), or a single-sheet XLSX workbook with values only. Up to ${maxMb} MB per file, ${num(ws.healthInfo?.maxRows ?? 100000, 0)} rows and ${ws.healthInfo?.maxColumns ?? 80} columns.`}
      onClose={close}
      size="lg"
      backdropClose={!protectedSet && !lineageText}
      footer={tab === 'audit' && protectedSet ? (
        <>
          <span className="foot-note">Unmapped fields are unavailable to comparisons. Missing lineage is reported, never inferred.</span>
          <button type="button" className="btn primary" disabled={!canAudit} onClick={() => void runAudit()}>
            {ws.busy.audit ? 'Auditing…' : 'Run external audit'}<ArrowRight size={15} />
          </button>
        </>
      ) : undefined}
    >
      <Tabs
        idPrefix="import"
        variant="underline"
        label="Import type"
        value={tab}
        onChange={next => { setTab(next); setError(''); setProtectedSet(null); }}
        items={[{ id: 'original', label: 'Original dataset', disabled: busy }, { id: 'audit', label: 'Audit protected file', disabled: busy || !dataset }]}
      />
      <div className="dialog-section" {...panelProps('import', tab)}>
        {tab === 'audit' ? (
          <Notice>
            Original: <b>{dataset?.name ?? 'none loaded'}</b> (this stays the source; it is never the export target). Upload a file that someone else protected. Row order never implies that row 37 here is patient 37 there.
          </Notice>
        ) : dataset ? (
          <Notice tone="warn" title="Importing replaces the loaded dataset in this workspace.">
            {plural(ws.candidates.length, 'candidate')} and any search results will leave this page. {hosted ? 'Earlier tables remain in your hosted session until you clear it or it expires.' : 'The local service keeps earlier datasets in memory until you clear the session.'}
          </Notice>
        ) : null}
        <input ref={input} type="file" accept=".csv,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" aria-label={tab === 'audit' ? 'Protected table file' : 'Original table file'}
          onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        <button
          type="button"
          className={`dropzone${dragging ? ' dragging' : ''}`}
          disabled={busy || (tab === 'audit' && !dataset)}
          onClick={() => input.current?.click()}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}
        >
          <FileUp size={26} aria-hidden="true" />
          <b>{busy ? 'Reading the file…' : tab === 'audit' && protectedSet ? protectedSet.name : 'Choose a table, or drop it here'}</b>
          <span>
            {tab === 'audit' && protectedSet
              ? `${plural(protectedSet.rowCount, 'row')} · ${plural(protectedSet.schema.length, 'column')} · choose another to replace`
              : tab === 'original' ? 'You will review field roles and units next.' : hosted ? 'The file is stored in Archie Core for this session.' : 'The file is held in memory by the local service for this session only.'}
          </span>
        </button>

        {tab === 'audit' && protectedSet && dataset ? (
          <>
            <fieldset className="radio-cards">
              <legend>How are the rows related? <Term id="paired" label="pairing" /></legend>
              {([
                ['unpaired_microdata', 'Unknown pairing', 'Compare distributions, research questions and uniqueness at dataset level. Recommended unless you hold verified lineage.'],
                ['paired_row_preserving', 'Verified pairing', 'You own a one-to-one crosswalk from each protected row to its original row. Used only for internal utility checks, never exported.'],
                ['synthetic', 'Synthetic output', 'The file was generated, not transformed. Rows are not matched; synthetic attack tests need disjoint training and control data that this comparison does not have.'],
              ] as [AuditMode, string, string][]).map(([id, label, text]) => (
                <label key={id} className={mode === id ? 'selected' : ''}>
                  <input type="radio" name="pairing" checked={mode === id} onChange={() => setMode(id)} />
                  <span><b>{label}</b><small>{text}</small></span>
                </label>
              ))}
            </fieldset>

            {mode === 'paired_row_preserving' ? (
              <div className="lineage-box">
                <label htmlFor="lineage-text">Original row index for each protected row, in protected-file order (zero-based)</label>
                <textarea id="lineage-text" rows={3} value={lineageText} onChange={event => setLineageText(event.target.value)} placeholder="0, 1, 2, …" spellCheck={false} />
                <div className="lineage-actions">
                  <label className="btn small">Load from text file<input type="file" accept=".txt,.csv,text/plain" className="sr-only" onChange={event => void readLineage(event.target.files?.[0])} /></label>
                  <span className={lineageProblem ? 'bad' : 'ok'}>{lineageText ? (lineageProblem || `${plural(lineage.length, 'index', 'indexes')} look consistent.`) : ''}</span>
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)} />
                  <span>I own this data and have verified that this pairing is one-to-one and correct.</span>
                </label>
              </div>
            ) : null}
            {mode === 'synthetic' ? <Notice tone="warn">Synthetic-release attacks stay <b>uncovered</b> here and are reported as such.</Notice> : null}

            <h3 className="dialog-sub">Map columns</h3>
            <p className="muted">Pick the protected-file column that corresponds to each original field.</p>
            <div className="mapping">
              {dataset.schema.map(column => (
                <label key={column.name}>
                  <span><b>{column.name}</b><small>{column.role.replaceAll('_', ' ')}</small></span>
                  <ArrowRight size={14} aria-hidden="true" />
                  <select aria-label={`Protected column for ${column.name}`} value={mapping[column.name] ?? ''} onChange={event => setMapping(current => ({ ...current, [column.name]: event.target.value }))}>
                    <option value="">Not present</option>
                    {protectedSet.schema.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </>
        ) : null}
        {error ? <div className="form-error" role="alert">{error}</div> : null}
      </div>
    </Dialog>
  );
}

/** Offered when a preset would delete methods the user added beyond the service's defaults. */
export function PresetDialog() {
  const ws = useWorkspace();
  const prompt = ws.presetPrompt;
  if (!prompt) return null;
  return (
    <Dialog
      title="Keep the extra methods?"
      size="sm"
      onClose={() => ws.resolvePreset('cancel')}
      footer={(
        <>
          <button type="button" className="btn" onClick={() => ws.resolvePreset('cancel')}>Cancel</button>
          <button type="button" className="btn danger" onClick={() => ws.resolvePreset('discard')}>Replace everything</button>
          <button type="button" className="btn primary" onClick={() => ws.resolvePreset('keep')}>Keep extras</button>
        </>
      )}
    >
      <p>This preset replaces the service’s standard steps. Your recipe also has {plural(prompt.extras.length, 'extra method')}:</p>
      <ul className="plain-list">
        {prompt.extras.map(step => <li key={step.uid ?? step.method}><b>{step.method.replaceAll('_', ' ')}</b>{step.columns.length ? ` on ${step.columns.join(', ')}` : ''}</li>)}
      </ul>
      <p className="muted">Choose <b>Keep extras</b> to apply the preset and retain these, or <b>Replace everything</b> to drop them. Nothing is deleted until you choose.</p>
    </Dialog>
  );
}

/** Explicit replacement of the current workspace before loading other data. */
export function ReplaceDialog() {
  const ws = useWorkspace();
  const prompt = ws.replacePrompt;
  if (!prompt) return null;
  return (
    <Dialog
      title="Replace this workspace?"
      size="sm"
      onClose={() => ws.resolveReplace(false)}
      footer={(
        <>
          <button type="button" className="btn" onClick={() => ws.resolveReplace(false)}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => ws.resolveReplace(true)}>Open {prompt.label}</button>
        </>
      )}
    >
      <p>Opening <b>{prompt.label}</b> removes the current dataset’s candidates ({plural(ws.candidates.length, 'candidate')}) and search results from this page.</p>
      <p className="muted">{ws.deployment.hosted ? 'Earlier tables and configurations remain in this visitor session until expiry or Clear session.' : 'Earlier datasets stay in the local service’s memory until you choose Clear local session.'}</p>
    </Dialog>
  );
}

export function ClearDialog({ onClose }: { onClose: () => void }) {
  const ws = useWorkspace();
  const hosted = ws.deployment.hosted;
  return (
    <Dialog
      title={hosted ? 'Clear session' : 'Clear local session'}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn danger" disabled={ws.busy.clear} onClick={() => { void ws.clearSession().then(done => { if (done) onClose(); }); }}>
            <Trash2 size={15} />{ws.busy.clear ? 'Clearing…' : 'Clear session'}
          </button>
        </>
      )}
    >
      <p>This asks {hosted ? 'the hosted service' : 'the local service'} to delete every dataset, protected file, candidate and search result from this session, then resets this page.</p>
      <ul className="plain-list">
        <li>Files you already downloaded are not affected.</li>
        <li>If the service does not confirm, nothing is reset here, so you never see a false “cleared”.</li>
      </ul>
    </Dialog>
  );
}

export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const { health, healthInfo, origin, deployment, dataset } = useWorkspace();
  const dialogs = useDialogs();
  const hosted = deployment.hosted || deployment.kind === 'remote';
  const uploadMb = Number(((healthInfo?.maxUploadBytes ?? (hosted ? 3 : 50) * 1024 * 1024) / (1024 * 1024)).toFixed(1));
  const minutes = Math.round((healthInfo?.sessionTtlSeconds ?? 1800) / 60);
  return (
    <Dialog title="Privacy and limits" size="md" onClose={onClose}
      footer={<button type="button" className="btn" onClick={() => dialogs.open('clear')}><ScanSearch size={15} />{hosted ? 'Clear session…' : 'Clear local session…'}</button>}>
      <dl className="facts">
        <div><dt>Mode</dt><dd><b>{deployment.label}.</b> {hosted
          ? deployment.uploadsAllowed ? 'Import original and externally protected tables, or explore the built-in fictional examples.' : deployment.uploadsNote
          : 'This page and its service run on this computer; files are read here.'}</dd></div>
        <div><dt>Service</dt><dd>{health === 'ok' ? `Connected, version ${healthInfo?.version ?? 'unknown'}${healthInfo?.backendProvider ? ` · ${healthInfo.backendProvider}` : ''}` : health === 'checking' ? 'Checking…' : 'Not reachable'}</dd></div>
        <div><dt>This page is served from</dt><dd>{origin.host}{origin.local ? ' (this computer)' : ' (hosted)'}</dd></div>
        <div><dt>Where rows live</dt><dd>{hosted
          ? deployment.uploadsAllowed
            ? 'Uploaded table bytes are stored in Archie Core for this visitor session and reconstructed by the Python service for calculations. Built-in fictional examples are rebuilt from their fixtures. The page displays at most 30 preview rows per table.'
            : 'Built-in fictional rows are rebuilt from fixtures for calculations. Archie Core stores the session configuration. The page displays at most 30 preview rows per table.'
          : 'In the local service’s memory for this session. The page displays at most 30 preview rows per table.'}</dd></div>
        {hosted ? <div><dt>Session storage & limits</dt><dd>
          Up to {healthInfo?.maxDatasets ?? 8} tables, {healthInfo?.maxSearchCandidates ?? 24} candidates per search and {healthInfo?.maxCandidates ?? 40} stored candidates per session.
          {' '}Sessions become inaccessible after {minutes} minutes of inactivity. Expired records are deleted lazily when that session is revisited, not by a background sweep. Clear session deletes its uploaded tables and configuration immediately after the service confirms cleanup.
          {' '}Reloading this page starts a new visitor session; clear it first to delete uploads immediately.
        </dd></div> : null}
        <div><dt>Where measurements run</dt><dd>{hosted
          ? 'Privacy and scientific-utility calculations run deterministically in Python through Vercel. Archie Core stores the session data and configuration.'
          : 'On this computer, deterministically in the local Python service.'}</dd></div>
        <div><dt>Optional Jev interpretation</dt><dd>After you review and approve the metadata preview, the server can send column labels, types, units, structural format names and neighboring labels to OpenRouter. No row values are sent. Offline rules and all statistical tests work without the model.</dd></div>
        <div><dt>Uploads</dt><dd>{deployment.uploadsAllowed
          ? `Original and protected CSV, JSON, and single-sheet XLSX tables are supported, up to ${uploadMb} MB per file, ${num(healthInfo?.maxRows ?? 100000, 0)} rows and ${healthInfo?.maxColumns ?? 80} columns. ${hosted ? 'Files are processed through Vercel and stored in Archie Core for this session.' : 'Files stay with the local service on this computer.'}`
          : deployment.uploadsNote}</dd></div>
        <div><dt>Stored in this browser</dt><dd>Only panel layout preferences (key prism.ui.v1). Rows, candidates and reports are not written to browser storage. The hosted session token stays in this page’s memory.</dd></div>
        <div><dt>Network</dt><dd>{hosted ? 'The Archie page loads its reviewed assets and API from the fixed Vercel service; uploaded tables travel to that service and Archie Core. The fallback page uses the same service.' : 'This page requests the service on this computer.'} Optional Jev interpretation is a separate server-to-OpenRouter metadata request after approval. Source links open only when you choose them.</dd></div>
        <div><dt>Reports</dt><dd>Exports contain aggregate measurements, recipes and assumptions and are owner-confidential. Query definitions and aggregate values can still be sensitive; review before sharing.</dd></div>
      </dl>
      <h3 className="dialog-sub">How to interpret results</h3>
      <ul className="plain-list">
        <li>Results do not certify anonymity, HIPAA compliance, or authorization to publish.</li>
        <li>Uniqueness describes this finite table under stated assumptions, not real-world identification probability.</li>
        <li>Unsupported, inapplicable and failed tests remain explicitly uncovered.</li>
        {dataset?.synthetic === true ? <li>The loaded example is fictional. Its measurements are demonstrations, not clinical evidence.</li> : null}
      </ul>
    </Dialog>
  );
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Alt + 1 … 6', 'Switch view'], ['Ctrl / ⌘ + Enter', 'Apply and evaluate the recipe (Workbench)'],
    ['[', 'Show or hide the library'], [']', 'Show or hide the inspector'], ['?', 'This list'],
    ['← →', 'Move between tabs and menus'], ['↑ ↓', 'Move within a menu or chart list'], ['Esc', 'Close a menu, tooltip or dialog'],
  ];
  return (
    <Dialog title="Keyboard shortcuts" size="sm" onClose={onClose}>
      <table className="data-table plain"><tbody>
        {rows.map(([keys, action]) => <tr key={keys}><th scope="row"><kbd>{keys}</kbd></th><td>{action}</td></tr>)}
      </tbody></table>
    </Dialog>
  );
}
