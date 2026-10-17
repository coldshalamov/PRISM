import { Fragment, useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle, ChevronDown, ChevronRight, CircleDashed, ClipboardCheck, Database, FlaskConical, Minus, OctagonAlert,
  ScanSearch, Sparkles, Square,
} from 'lucide-react';
import { isAudit, STALE_LABEL } from '../../analysis';
import { api } from '../../api';
import { useDialogs } from '../../dialogs';
import { ago, num, pct, plural, title as spaced } from '../../format';
import { recipeLabel } from '../../recipe';
import { scenarioById } from '../../scenarios';
import { Facts } from '../../ui/Facts';
import { Notice } from '../../ui/Feedback';
import { Status } from '../../ui/Status';
import { Tabs, panelProps } from '../../ui/Tabs';
import { useWorkspace } from '../../workspace';
import type { Candidate, SemanticField, SemanticFinding, SemanticOntology, SemanticOverrides, SemanticProvider, SemanticSeverity } from '../../types';
import { feasibility, rowLoss } from '../pareto/model';
import type { Feasibility } from '../pareto/model';
import './semantic-panel.css';

/* Everything the service returns about meaning is untrusted and loosely shaped. Nothing below renders an
   unknown value as a React child: values are summarised to a short string or shown as JSON text. */
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clip = (text: string, limit = 180) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text);
const strings = (value: unknown): string[] => (Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  : typeof value === 'string' && value.trim() ? [value] : []);

function summarize(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? num(value, 4) : '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) {
    const items = value.slice(0, 6).map(item => summarize(item, depth + 1)).filter(Boolean);
    return items.join(', ') + (value.length > 6 ? ` +${value.length - 6} more` : '');
  }
  if (isRecord(value)) {
    if (depth >= 2) return '{…}';
    const keys = Object.keys(value);
    const parts = keys.slice(0, 5).map(key => { const text = summarize(value[key], depth + 1); return text ? `${key}: ${text}` : ''; }).filter(Boolean);
    return parts.join('; ') + (keys.length > 5 ? '; …' : '');
  }
  return '';
}
const brief = (value: unknown, limit = 180) => clip(summarize(value), limit) || '—';

function jsonText(value: unknown): string {
  try {
    const text = JSON.stringify(value, null, 2) ?? '';
    return text.length > 5000 ? `${text.slice(0, 5000)}\n… truncated` : text;
  } catch {
    return 'Not serializable.';
  }
}

const listOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.slice(0, 12).map(item => clip(summarize(item), 60)).filter(Boolean);
  if (isRecord(value)) return Object.keys(value).slice(0, 12).map(key => (value[key] === true ? key : clip(`${key}: ${summarize(value[key])}`, 60)));
  const text = summarize(value);
  return text ? [clip(text, 60)] : [];
};

interface Alternative { type: string; probability: number | null }
function alternativesOf(value: unknown): Alternative[] {
  const items: unknown[] = Array.isArray(value) ? value : isRecord(value) ? Object.keys(value).map(type => ({ type, probability: value[type] })) : [];
  return items.flatMap((item): Alternative[] => {
    if (typeof item === 'string') return item ? [{ type: item, probability: null }] : [];
    if (!isRecord(item)) return [];
    const type = [item.primaryType, item.type, item.label, item.name, item.id].find((entry): entry is string => typeof entry === 'string' && entry !== '');
    const probability = [item.probability, item.score, item.confidence].find(finite);
    return type ? [{ type, probability: probability ?? null }] : [];
  });
}
const probabilityText = (value: number | null | undefined) => (finite(value) ? (value >= 0 && value <= 1 ? pct(value, 0) : num(value, 2)) : '—');
const statusWord = (value: unknown) => (typeof value === 'string' && value ? value.replaceAll('_', ' ') : 'not reported');
const same = (a: string | null | undefined, b: string) => (a ?? '') === b;
const fieldKey = (field: SemanticField) => field.fieldId || field.column;
const readable = (value: string) => spaced(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
const str = (value: unknown) => typeof value === 'string' ? value : '';

function typeChoices(fields: SemanticField[], field: SemanticField, ontology: SemanticOntology | null) {
  const suggested = [...new Set([field.primaryType, ...alternativesOf(field.alternatives).map(item => item.type)])];
  const fallback = [...new Set(fields.flatMap(item => [item.primaryType, ...alternativesOf(item.alternatives).map(alt => alt.type)]))];
  const types = ontology?.types ?? fallback.map(id => ({ id, label: spaced(id), family: 'dataset' }));
  const labels = new Map(types.map(item => [item.id, item.label]));
  const families = ontology?.families ?? [{ id: 'dataset', label: 'Other types seen in this dataset' }];
  const groups = families.map(family => ({
    label: family.label, id: family.id,
    types: types.filter(item => item.family === family.id && !suggested.includes(item.id)).sort((a, b) => a.label.localeCompare(b.label, 'en')),
  })).filter(group => group.types.length);
  return { suggested, groups, labelOf: (id: string) => labels.get(id) ?? spaced(id) };
}

type Attempt = { kind: 'offline' | 'remote' | 'correction'; state: 'done'; fields: number; provider?: SemanticProvider } | { kind: 'offline' | 'remote' | 'correction'; state: 'failed' };
const ATTEMPT_LABEL = { offline: 'Offline inspection', remote: 'Jev interpretation', correction: 'Correction' } as const;
type SemanticTab = 'fields' | 'findings';

function ProviderLine({ provider }: { provider: SemanticProvider }) {
  const extra = Object.fromEntries(Object.entries(provider).filter(([key]) => !['status', 'calls', 'error', 'message'].includes(key)));
  const error = brief(provider.error, 280);
  const message = brief(provider.message, 280);
  return (
    <div className="sem-provider-line">
      <dl>
        <div><dt>Provider status</dt><dd>{statusWord(provider.status)}</dd></div>
        <div><dt>Remote calls</dt><dd>{finite(provider.calls) ? num(provider.calls, 0) : 'not reported'}</dd></div>
        <div><dt>Error</dt><dd className={error !== '—' ? 'risk-text' : ''}>{error === '—' ? 'None reported' : error}</dd></div>
        {message !== '—' ? <div><dt>Message</dt><dd>{message}</dd></div> : null}
      </dl>
      {Object.keys(extra).length ? <details className="sem-raw"><summary>Provider details (JSON)</summary><pre>{jsonText(extra)}</pre></details> : null}
    </div>
  );
}

const SEVERITY: Record<SemanticSeverity, { icon: React.ReactNode; slug: string }> = {
  Mild: { icon: <Minus size={13} strokeWidth={2.6} />, slug: 'mild' },
  Moderate: { icon: <AlertTriangle size={13} strokeWidth={2.4} />, slug: 'moderate' },
  Severe: { icon: <OctagonAlert size={13} strokeWidth={2.4} />, slug: 'severe' },
  'Needs Assessment': { icon: <CircleDashed size={13} strokeWidth={2.4} />, slug: 'needs' },
};
function Severity({ value }: { value: unknown }) {
  const known = typeof value === 'string' && value in SEVERITY ? SEVERITY[value as SemanticSeverity] : null;
  return (
    <span className={`sem-sev sev-${known?.slug ?? 'needs'}`}>
      <span aria-hidden="true">{known?.icon ?? <CircleDashed size={13} strokeWidth={2.4} />}</span>
      <span><span className="sr-only">Severity: </span>{typeof value === 'string' && value ? value : 'Needs Assessment'}</span>
    </span>
  );
}

function Bullets({ items, empty = 'None reported' }: { items: string[]; empty?: string }) {
  return items.length ? <ul className="sem-bullets">{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <span className="muted">{empty}</span>;
}

function FindingCard({ finding, open, onToggle, selectedColumn, onSelectColumn }: {
  finding: SemanticFinding; open: boolean; onToggle: () => void; selectedColumn: string | null; onSelectColumn: (name: string | null) => void;
}) {
  const bodyId = useId();
  const columns = strings(finding.columns);
  const covered = finding.status === 'implemented';
  const measured = isRecord(finding.measured) ? Object.entries(finding.measured) : null;
  const notMeasured = covered ? 'Not measured' : `Not measured · ${statusWord(finding.status)}`;
  return (
    <li className={`sem-finding${covered ? '' : ' uncovered'}${open ? ' open' : ''}`}>
      <h4>
        <button type="button" className="sem-finding-head" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={onToggle}>
          <span aria-hidden="true">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          <Severity value={finding.severity} />
          <span className="sem-finding-title">{typeof finding.title === 'string' && finding.title ? finding.title : 'Untitled finding'}</span>
          <span className="sem-finding-meta">
            <Status kind={covered ? 'run' : 'uncovered'} label={covered ? 'Measured' : finding.status === 'not_applicable' ? 'Not applicable' : 'Needs assessment'} />
            <span className="muted">{columns.length ? clip(columns.join(', '), 48) : finding.status === 'unsupported' ? 'Additional evidence required' : finding.status === 'not_applicable' ? 'Required fields absent' : 'No contributing columns detected'}</span>
          </span>
        </button>
      </h4>
      {open ? (
        <dl className="sem-questions" id={bodyId}>
          <div>
            <dt>Which fields contribute?</dt>
            <dd>
              {columns.length ? (
                <span className="sem-cols">
                  {columns.map(column => (
                    <button
                      key={column} type="button" className={`sem-col${selectedColumn === column ? ' pressed' : ''}`} aria-pressed={selectedColumn === column}
                      title={`Highlight ${column} in both panes`} onClick={() => onSelectColumn(selectedColumn === column ? null : column)}
                    >{column}</button>
                  ))}
                </span>
              ) : <span className="muted">{finding.status === 'unsupported' ? 'Additional evidence is required for this assessment.' : finding.status === 'not_applicable' ? 'The required fields are absent from this representation.' : 'No contributing columns were detected.'}</span>}
            </dd>
          </div>
          <div><dt>How could it be exploited?</dt><dd>{brief(finding.explanation, 800)}</dd></div>
          <div><dt>What must the attacker already have?</dt><dd>{brief(finding.attackerNeeds, 600)}</dd></div>
          <div>
            <dt>What was actually measured?</dt>
            <dd>
              {measured && measured.length ? (
                <dl className="sem-measured">
                  {measured.map(([key, value]) => (
                    <div key={key}>
                      <dt>{readable(key)}</dt>
                      <dd className={value === null || value === undefined ? 'na' : ''}>
                        {value === null || value === undefined ? notMeasured : typeof value === 'number' ? num(value, 4) : brief(value, 120)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : <span className="na">{notMeasured}</span>}
            </dd>
          </div>
          <div>
            <dt>What mitigations exist, and what do they cost?</dt>
            <dd className="sem-mitigation">
              <div><b>Mitigations</b><Bullets items={strings(finding.mitigations)} /></div>
              <div><b>Utility risks</b><Bullets items={strings(finding.utilityRisks)} /></div>
              <div><b>Limits</b><Bullets items={strings(finding.limitations)} empty="None reported" /></div>
              {strings(finding.sourceIds).length ? <div><b>Sources</b><span className="sem-sources">{strings(finding.sourceIds).join(' · ')}</span></div> : null}
            </dd>
          </div>
        </dl>
      ) : null}
    </li>
  );
}

function FieldRow({ field, fields, ontology, role, expanded, onToggle, selected, onSelect, draft, onDraft, onConfirm, locked }: {
  field: SemanticField; fields: SemanticField[]; ontology: SemanticOntology | null; role: string | null; expanded: boolean; onToggle: () => void; selected: boolean;
  onSelect: () => void; draft: string; onDraft: (type: string) => void; onConfirm: () => void; locked: boolean;
}) {
  const detailId = useId();
  const roles = listOf(field.privacyRoles).map(readable);
  const alternatives = alternativesOf(field.alternatives);
  const { suggested, groups, labelOf } = typeChoices(fields, field, ontology);
  const confirmed = same(field.reviewStatus, 'confirmed');
  const unchanged = draft === field.primaryType;
  return (
    <Fragment>
      <tr className={`sem-row${selected ? ' selected' : ''}${expanded ? ' expanded' : ''}`}>
        <th scope="row">
          <button type="button" className={`sem-col${selected ? ' pressed' : ''}`} aria-pressed={selected} title={`Highlight ${field.column} in both panes`} onClick={onSelect}>{field.column}</button>
        </th>
        <td><span className="sem-type">{labelOf(field.primaryType)}</span>{field.family ? <small className="sem-sub">{ontology?.families.find(family => family.id === field.family)?.label ?? readable(field.family)}</small> : null}</td>
        <td>{field.source ? spaced(field.source) : '—'}{field.model ? <small className="sem-sub">{field.model}</small> : null}</td>
        <td className="num" title={finite(field.probability) ? undefined : 'The service returned no probability for this field.'}>{probabilityText(field.probability)}</td>
        <td className={`sem-review${confirmed ? ' confirmed' : ''}`}>{field.reviewStatus ? spaced(field.reviewStatus) : '—'}</td>
        <td className="sem-roles">{roles.length ? clip(roles.join(' · '), 70) : '—'}</td>
        <td className="sem-more">
          <button type="button" className="icon-btn" aria-expanded={expanded} aria-controls={expanded ? detailId : undefined} aria-label={`${expanded ? 'Hide' : 'Show'} details for ${field.column}`} onClick={onToggle}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="sem-detail">
          <td colSpan={7} id={detailId}>
            <dl className="sem-facts">
              <div><dt>Field ID</dt><dd><code>{field.fieldId}</code></dd></div>
              <div><dt>Ontology type</dt><dd><code>{field.primaryType}</code></dd></div>
              <div><dt>Statistical role (unchanged)</dt><dd>{role ? spaced(role) : 'Not in the reviewed schema'}</dd></div>
              <div><dt>Privacy roles</dt><dd>{roles.length ? roles.join(' · ') : 'None reported'}</dd></div>
              <div><dt>Properties</dt><dd>{brief(field.properties, 300)}</dd></div>
              <div><dt>Validation</dt><dd>{brief(field.validation, 300)}</dd></div>
              <div><dt>Lineage</dt><dd>{brief(field.lineage, 300)}</dd></div>
              <div>
                <dt>Alternatives</dt>
                <dd>
                  {alternatives.length
                    ? <ul className="sem-alt">{alternatives.map(item => <li key={item.type}><code>{item.type}</code>{item.probability !== null ? ` · ${probabilityText(item.probability)}` : ''}</li>)}</ul>
                    : brief(field.alternatives, 300)}
                </dd>
              </div>
            </dl>
            <details className="sem-raw">
              <summary>Raw details (JSON)</summary>
              <pre>{jsonText({ properties: field.properties, privacyRoles: field.privacyRoles, alternatives: field.alternatives, validation: field.validation, lineage: field.lineage })}</pre>
            </details>
            <div className="sem-correct">
              <label>Correct meaning
                <select value={draft} onChange={event => onDraft(event.target.value)} disabled={locked}>
                  <optgroup label="Current and suggested meanings">{suggested.map(type => <option key={type} value={type}>{labelOf(type)}{type === field.primaryType ? ' (current)' : ''}</option>)}</optgroup>
                  {groups.map(group => <optgroup key={group.id} label={group.label}>{group.types.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</optgroup>)}
                </select>
              </label>
              <button type="button" className="btn small" disabled={locked || (unchanged && confirmed)} onClick={onConfirm}>
                {unchanged ? (confirmed ? 'Confirmed' : 'Confirm this type') : 'Confirm correction'}
              </button>
              <small>Offline: no remote call. Records the meaning as confirmed. Values and the statistical role you set in Review classifications are not changed.</small>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export function SemanticPanel({ selectedColumn, onSelectColumn, onSelectColumns }: { selectedColumn: string | null; onSelectColumn: (name: string | null) => void; onSelectColumns?: (names: string[]) => void }) {
  const ws = useWorkspace();
  const { dataset, active } = ws;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SemanticTab>('fields');
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [openFindings, setOpenFindings] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [ontology, setOntology] = useState<SemanticOntology | null>(null);
  const [ontologyError, setOntologyError] = useState('');
  const bodyId = useId();
  const disclosureId = useId();
  useEffect(() => {
    let current = true;
    api.semanticOntology().then(result => {
      if (!Array.isArray(result?.types) || !Array.isArray(result?.families)) throw new Error('Incomplete ontology');
      const types = result.types.filter(type => isRecord(type) && typeof type.id === 'string' && typeof type.label === 'string' && typeof type.family === 'string');
      const families = result.families.filter(family => isRecord(family) && typeof family.id === 'string' && typeof family.label === 'string');
      if (!types.length || !families.length) throw new Error('Empty ontology');
      if (current) setOntology({ ...result, types, families });
    }).catch(() => {
      if (current) setOntologyError('The full meaning catalogue is unavailable. Correction choices are limited to meanings already returned for this dataset.');
    });
    return () => { current = false; };
  }, []);

  const semantic = dataset?.semantic;
  const fields = useMemo(() => {
    const raw = semantic?.fields;
    return Array.isArray(raw) ? raw.filter(field => isRecord(field) && typeof field.column === 'string').map(field => ({
      ...field, fieldId: str(field.fieldId) || field.column, primaryType: str(field.primaryType) || 'unknown',
      family: str(field.family) || null, source: str(field.source) || null, model: str(field.model) || null,
      reviewStatus: str(field.reviewStatus) || 'needs_review',
    })) : [];
  }, [semantic]);
  const rawProvider = semantic?.provider;
  const provider = isRecord(rawProvider) ? rawProvider : undefined;
  const roles = useMemo(() => new Map((dataset?.schema ?? []).map(spec => [spec.name, spec.role])), [dataset?.schema]);
  const rawFindings = active?.risk.semantic?.findings;
  const findings: SemanticFinding[] = (Array.isArray(rawFindings) ? rawFindings : []).filter(finding => isRecord(finding)).map((finding, index) => ({
    ...finding, id: str(finding.id) || `finding-${index}`, attackId: str(finding.attackId), title: str(finding.title) || 'Unclassified finding',
    status: finding.status === 'implemented' || finding.status === 'not_applicable' ? finding.status : 'unsupported',
    severity: typeof finding.severity === 'string' && Object.prototype.hasOwnProperty.call(SEVERITY, finding.severity) ? finding.severity : 'Needs Assessment',
    columns: strings(finding.columns), explanation: str(finding.explanation), attackerNeeds: str(finding.attackerNeeds),
    measured: isRecord(finding.measured) ? finding.measured : null,
    mitigations: strings(finding.mitigations), utilityRisks: strings(finding.utilityRisks), limitations: strings(finding.limitations), sourceIds: strings(finding.sourceIds),
  }));

  const anyBusy = Object.values(ws.busy).some(Boolean);
  const locked = anyBusy || ws.sessionLost;
  const inspecting = ws.busy.schema;

  const summary = useMemo(() => {
    if (!semantic) return 'Field meanings not inspected yet';
    const counts = new Map<string, number>();
    fields.forEach(field => { const status = statusWord(field.reviewStatus); counts.set(status, (counts.get(status) ?? 0) + 1); });
    const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([status, count]) => `${num(count, 0)} ${status}`);
    return [plural(fields.length, 'field'), ...parts].join(' · ');
  }, [fields, semantic]);

  const act = async (kind: 'offline' | 'remote' | 'correction', allowRemote: boolean, overrides?: SemanticOverrides) => {
    setAttempt(null);
    const result = await ws.inspectSemantics(allowRemote, overrides);
    if (result && kind !== 'correction') setDrafts({});
    setAttempt(result ? { kind, state: 'done', fields: Array.isArray(result.fields) ? result.fields.length : 0, provider: isRecord(result.provider) ? result.provider : undefined } : { kind, state: 'failed' });
  };
  const confirm = (field: SemanticField) => {
    const primaryType = drafts[fieldKey(field)] ?? field.primaryType;
    void act('correction', false, { [field.column]: { primaryType, reviewStatus: 'confirmed' } });
  };
  const toggleFinding = (id: string) => setOpenFindings(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  if (!dataset) return null;
  const candidateSemantic = active?.risk.semantic;
  const label = active ? ws.labelOf(active.candidateId) : '';
  const evaluating = ws.busy.apply || ws.busy.assess;
  const measuredCount = findings.filter(finding => finding.status === 'implemented').length;
  const uncovered = findings.filter(finding => finding.status === 'unsupported').length;
  const notApplicable = findings.filter(finding => finding.status === 'not_applicable').length;
  const summaryText = `${summary}${candidateSemantic ? ` · ${measuredCount} measured · ${uncovered} need assessment · ${notApplicable} not applicable for ${label}` : ''}`;
  const attemptCalls = attempt?.state === 'done' ? attempt.provider?.calls : undefined;
  const attemptText = attempt?.state === 'done'
    ? `${ATTEMPT_LABEL[attempt.kind]} finished · ${plural(attempt.fields, 'field')} · provider ${statusWord(attempt.provider?.status)} · ${finite(attemptCalls) ? plural(attemptCalls, 'remote call') : 'remote calls not reported'}.`
    : attempt?.state === 'failed' ? `${ATTEMPT_LABEL[attempt.kind]} did not complete. Nothing was changed; a notification explains why unless you stopped waiting.` : '';

  return (
    <section className={`sem${open ? ' open' : ''}${evaluating ? ' is-pending' : ws.stale.length ? ' is-stale' : ''}`} aria-label="Semantic intelligence">
      <header className="sem-head">
        <button type="button" className="sem-toggle" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(value => !value)}>
          <span aria-hidden="true">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
          <span className="sem-title">Semantic intelligence</span>
        </button>
        <span className="sem-summary" title={summaryText}>{summaryText}</span>
        <span className="sem-provider">{provider ? `Provider ${statusWord(provider.status)} · ${finite(provider.calls) ? plural(provider.calls, 'remote call') : 'calls not reported'}${brief(provider.error) === '—' ? '' : ' · error reported'}` : 'No provider status'}</span>
      </header>
      {open ? (
        <div className="sem-body" id={bodyId}>
          <div className="sem-actions">
            <p className="sem-disclosure" id={disclosureId}>
              <b>Before using Jev:</b> PRISM sends only column labels, data types, units, neighboring labels and structural format names to the provider. Row values are never included in Jev requests.
              Nothing is sent to Jev when the page loads, when you move Protection preference or when you correct a field.
            </p>
            <div className="sem-buttons">
              <button type="button" className={`btn small primary${inspecting ? ' busy' : ''}`} aria-describedby={disclosureId} disabled={locked || ws.health === 'down'} onClick={() => void act('remote', true)}>
                <Sparkles size={14} />Interpret ambiguous fields with Jev
              </button>
              <button type="button" className="btn small" title="Local rules only. No remote call is requested." disabled={locked} onClick={() => void act('offline', false)}>
                <ScanSearch size={14} />Inspect fields
              </button>
              <button type="button" className="btn small" disabled={ws.busy.boot || ws.busy.clear} onClick={() => ws.requestReplace('the semantic ambiguity demo', () => void ws.loadDemo('semantic'))}>
                <Database size={14} />Semantic ambiguity demo
              </button>
              {inspecting ? <button type="button" className="btn small" onClick={() => ws.cancel('schema')}><Square size={12} fill="currentColor" />Stop waiting</button> : null}
            </div>
            <p className="sem-status" role="status" aria-live="polite">{inspecting ? 'Inspecting field semantics…' : attemptText}</p>
          </div>
          {provider ? <ProviderLine provider={provider} /> : null}
          <Tabs<SemanticTab>
            idPrefix="sem" variant="underline" label="Semantic sections" value={tab} onChange={setTab}
            items={[{ id: 'fields', label: 'Fields', badge: fields.length || undefined }, { id: 'findings', label: 'Privacy findings', badge: candidateSemantic ? findings.length : undefined }]}
          />
          <div className="sem-panel" {...panelProps('sem', tab)}>
            {tab === 'fields' ? (
              !semantic ? (
                <p className="sem-empty">This dataset has no field semantics yet. <b>Inspect fields</b> applies local rules only and makes no remote call.</p>
              ) : !fields.length ? (
                <p className="sem-empty">The service returned no field classifications.</p>
              ) : (
                <>
                  <div className="sem-table-scroll" tabIndex={0} role="region" aria-label="Field semantic classifications">
                    <table className="data-table compact sem-table">
                      <caption className="sr-only">Field meanings as classified by the service. Expand a row for properties, alternatives, validation, lineage and correction.</caption>
                      <thead>
                        <tr>
                          <th scope="col">Field</th><th scope="col">Meaning</th><th scope="col">Source · model</th><th scope="col" className="num">Probability</th>
                          <th scope="col">Review</th><th scope="col">Privacy roles</th><th scope="col"><span className="sr-only">Details</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map(field => (
                          <FieldRow
                            key={fieldKey(field)} field={field} fields={fields} ontology={ontology} role={roles.get(field.column) ?? null}
                            expanded={expandedField === fieldKey(field)} onToggle={() => setExpandedField(current => (current === fieldKey(field) ? null : fieldKey(field)))}
                            selected={selectedColumn === field.column} onSelect={() => onSelectColumn(selectedColumn === field.column ? null : field.column)}
                            draft={drafts[fieldKey(field)] ?? field.primaryType} onDraft={type => setDrafts(current => ({ ...current, [fieldKey(field)]: type }))}
                            onConfirm={() => confirm(field)} locked={locked}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="sem-note">The source data is unchanged. Semantic meanings do not alter values or statistical roles. Privacy findings distinguish measured exposure from hypotheses requiring additional assessment. Model probabilities describe interpretations, not privacy risk.</p>
                  {ontologyError ? <p className="sem-note risk-text">{ontologyError}</p> : null}
                </>
              )
            ) : (
              <div className="sem-findings">
                {!active ? (
                  <p className="sem-empty">Semantic findings are measured on a frozen candidate snapshot. Evaluate a candidate to see them.</p>
                ) : (
                  <>
                    <p className="sem-evidence">Measured on <b>{label}</b> · <code title={active.candidateId}>{active.candidateId}</code> · {ago(active.createdAt) || 'time not recorded'}</p>
                    {ws.stale.length || evaluating ? (
                      <Notice tone="warn" title="Historical evidence.">
                        {evaluating
                          ? ` A new evaluation is running; these findings still belong to ${label}.`
                          : ` These findings were measured on ${label}. Current ${ws.stale.map(reason => STALE_LABEL[reason]).join(' and ')} differ, so they describe an earlier configuration.`}
                        {isAudit(active) ? ' This is an external release, not one of your recipes.' : ''}
                      </Notice>
                    ) : null}
                    {!candidateSemantic ? (
                      <p className="sem-empty">No semantic findings were returned for {label}. Their absence is not a pass and not zero risk.</p>
                    ) : (
                      <>
                        <p className="sem-note">Measured entries report deterministic tests under stated assumptions. Needs Assessment records a coverage gap; Not applicable means the required representation is absent. A semantic match alone does not establish a successful attack or clear a release. Field corrections require a new evaluation and never rewrite frozen findings.</p>
                        {findings.length ? (
                          <ul className="sem-finding-list">
                            {findings.map((finding, index) => {
                              const id = finding.id || `finding-${index}`;
                              return (
                                <FindingCard
                                  key={id} finding={finding} open={openFindings.has(id)} onToggle={() => {
                                    if (!openFindings.has(id)) onSelectColumns?.(strings(finding.columns));
                                    toggleFinding(id);
                                  }}
                                  selectedColumn={selectedColumn} onSelectColumn={onSelectColumn}
                                />
                              );
                            })}
                          </ul>
                        ) : <p className="sem-empty">The service returned no semantic findings for {label}.</p>}
                        {strings(candidateSemantic.limitations).length ? <div className="sem-limits"><b>Limitations</b><Bullets items={strings(candidateSemantic.limitations)} /></div> : null}
                        {candidateSemantic.coverage !== undefined || candidateSemantic.lineage !== undefined ? (
                          <details className="sem-raw">
                            <summary>Coverage and lineage</summary>
                            {candidateSemantic.coverage !== undefined ? <div><b>Coverage</b><Facts value={candidateSemantic.coverage} /></div> : null}
                            {candidateSemantic.lineage !== undefined ? <div><b>Lineage</b><Facts value={candidateSemantic.lineage} /></div> : null}
                          </details>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- Protection preference ---------- */
interface Position { candidate: Candidate; label: string; unique: number; loss: number; kMin: number; pGuess: number | null; rows: number | null; checks: Feasibility }
type Exclusion = 'dataset' | 'audit' | 'controls' | 'incomplete';
interface PoolContext { datasetId: string; originalRows: number; membershipKnown: boolean; staleFor: (candidate: Candidate) => string[]; labelOf: (id: string) => string }

/* A snapshot is a position only if it is a real evaluated candidate of this dataset, measured under the controls now on screen
   (recipe drift is allowed), carries finite measurements, and has a recipe that can be restored. */
function classify(candidate: Candidate, context: PoolContext): Position | Exclusion {
  if (candidate.datasetId !== context.datasetId) return 'dataset';
  if (isAudit(candidate)) return 'audit';
  if (context.staleFor(candidate).some(reason => reason !== 'recipe')) return 'controls';
  const metrics = candidate.risk?.metrics;
  const unique = metrics?.sample_unique;
  const kMin = metrics?.k_min;
  const loss = candidate.utility?.loss;
  if (!finite(unique) || !finite(kMin) || !finite(loss)) return 'incomplete';
  return {
    candidate, label: context.labelOf(candidate.candidateId), unique, loss, kMin,
    pGuess: context.membershipKnown && finite(metrics?.p_guess) ? metrics.p_guess : null,
    rows: rowLoss(candidate, context.originalRows), checks: feasibility(candidate),
  };
}

/* Actual measured sample exposure orders the positions. Utility breaks ties; it is shown separately because loss need not be monotonic. */
const byExposure = (a: Position, b: Position) => b.unique - a.unique || a.loss - b.loss || (b.pGuess ?? -1) - (a.pGuess ?? -1) || a.kMin - b.kMin
  || a.label.localeCompare(b.label, 'en', { numeric: true })
  || (a.candidate.candidateId < b.candidate.candidateId ? -1 : a.candidate.candidateId > b.candidate.candidateId ? 1 : 0);

const EXCLUSION_TEXT: Record<Exclusion, (count: number) => string> = {
  controls: count => `${plural(count, 'snapshot')} measured under different attacker assumptions, field classifications or research questions`,
  audit: count => `${plural(count, 'external audit')} (no recipe to restore)`,
  incomplete: count => `${plural(count, 'snapshot')} without a finite sample uniqueness, minimum k or query loss`,
  dataset: count => `${plural(count, 'snapshot')} of another dataset`,
};
const EXCLUSION_WHY: Record<Exclusion, string> = {
  controls: 'was measured under different attacker assumptions, field classifications or research questions',
  audit: 'is an external audit with no recipe to restore',
  incomplete: 'has no finite sample uniqueness, minimum k or query loss',
  dataset: 'belongs to another dataset',
};

export function ProtectionPreference() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset, active, baseline, candidates, search, staleFor, labelOf } = ws;
  const titleId = useId();
  const noteId = useId();
  const readId = useId();
  const datasetId = dataset?.datasetId ?? '';
  const originalRows = dataset?.rowCount ?? 0;
  const membershipKnown = ws.threat.membershipKnown;

  const model = useMemo(() => {
    const unique = new Map<string, Candidate>();
    [...candidates, ...(search?.candidates ?? []), ...(baseline ? [baseline] : [])].forEach(candidate => { if (!unique.has(candidate.candidateId)) unique.set(candidate.candidateId, candidate); });
    const context: PoolContext = { datasetId, originalRows, membershipKnown, staleFor, labelOf };
    const pool: Position[] = [];
    const excluded: Record<Exclusion, number> = { dataset: 0, audit: 0, controls: 0, incomplete: 0 };
    unique.forEach(candidate => { const result = classify(candidate, context); if (typeof result === 'string') excluded[result] += 1; else pool.push(result); });
    pool.sort(byExposure);
    const activeResult = active ? classify(active, context) : null;
    return { pool, excluded, activeExclusion: typeof activeResult === 'string' ? activeResult : null };
  }, [active, baseline, candidates, datasetId, labelOf, membershipKnown, originalRows, search, staleFor]);

  if (!dataset) return null;
  const { pool, excluded, activeExclusion } = model;
  const index = active ? pool.findIndex(position => position.candidate.candidateId === active.candidateId) : -1;
  const current = index >= 0 ? pool[index] : null;
  const busyAny = Object.values(ws.busy).some(Boolean);
  const lockReason = ws.workloadDirty ? 'Locked while research-question edits are unsaved.' : ws.sessionLost ? 'Locked: the session ended.' : busyAny ? 'Locked while another operation runs.' : '';
  const scenario = scenarioById(ws.scenarioId);
  const storedCap = ws.healthInfo?.maxCandidates ?? (ws.deployment.hosted ? 40 : null);
  const remaining = storedCap === null ? 8 : Math.max(0, storedCap - ws.storedCandidateCount);
  const alternativeBudget = Math.min(8, remaining, ws.healthInfo?.maxSearchCandidates ?? 8);
  const searchBlock = lockReason || (ws.health !== 'ok' ? 'Wait for the service to reconnect.' : '')
    || (alternativeBudget < 1 ? 'The stored-candidate limit is reached. Save evidence and clear this session to evaluate more.' : '')
    || (!scenario.evaluated ? 'The selected sharing context is not searched. Choose a row-release context in the candidate explorer.' : '');
  const excludedText = (Object.keys(excluded) as Exclusion[]).filter(key => excluded[key] > 0).map(key => EXCLUSION_TEXT[key](excluded[key]));
  const ready = pool.length >= 2;

  const choose = (at: number) => {
    const target = pool[at];
    if (!target || lockReason) return;
    const candidate = target.candidate;
    if (search?.candidates.some(item => item.candidateId === candidate.candidateId)) {
      ws.adopt(candidate.candidateId);
      return;
    }
    ws.select(candidate.candidateId);
  };

  if (!ready) {
    const searching = ws.busy.search;
    return (
      <section className="sem-pref unready" aria-labelledby={titleId}>
        <div className="sem-pref-head">
          <h2 id={titleId}>Protection preference</h2>
          <span className="sem-pref-count">{plural(pool.length, 'comparable snapshot')}</span>
        </div>
        <div className="sem-pref-slider">
          <span className="sem-end">Higher uniqueness</span>
          <input type="range" min={0} max={1} step={1} value={0} disabled aria-label="Protection preference, unavailable" aria-describedby={noteId} onChange={() => undefined} />
          <span className="sem-end">Lower uniqueness</span>
        </div>
        <div className="sem-pref-read" id={noteId}>
          <p>
            The scale selects between real evaluated snapshots and needs at least two. {pool.length ? 'Only one matches the current assumptions. ' : ''}
            <b>Evaluate alternatives</b> tests up to 8 recipes on the full dataset (within the search caps); each measured result becomes a position.
          </p>
          {excludedText.length ? <p className="muted">Not on the scale: {excludedText.join('; ')}.</p> : null}
          {ws.reviewed && searchBlock && !searching ? <p className="muted">{searchBlock}</p> : null}
          <div className="sem-pref-actions">
            {ws.reviewed ? (
              <button type="button" className={`btn small primary${searching ? ' busy' : ''}`} disabled={Boolean(searchBlock)} onClick={() => void ws.runSearch(alternativeBudget)}>
                <FlaskConical size={14} />{searching ? 'Evaluating alternatives…' : 'Evaluate alternatives'}
              </button>
            ) : (
              <button type="button" className="btn small" onClick={() => dialogs.open('review')}><ClipboardCheck size={14} />Review classifications first</button>
            )}
            {searching ? <button type="button" className="btn small" onClick={() => ws.cancel('search')}><Square size={12} fill="currentColor" />Stop waiting</button> : null}
          </div>
        </div>
      </section>
    );
  }

  const fill = index >= 0 ? `${(index / (pool.length - 1)) * 100}%` : '0%';
  const failed = current ? current.candidate.constraints.filter(check => !check.pass) : [];
  const valueText = current
    ? `${current.label}, position ${index + 1} of ${pool.length}. Sample uniqueness ${pct(current.unique)}, query loss ${num(current.loss, 3)}.`
    : 'No snapshot on this scale is selected.';
  return (
    <section className={`sem-pref${lockReason ? ' locked' : ''}`} aria-labelledby={titleId}>
      <div className="sem-pref-head">
        <h2 id={titleId}>Protection preference</h2>
        <span className="sem-pref-count">{current ? `Position ${index + 1} of ${pool.length}` : `${pool.length} comparable snapshots`}</span>
        {lockReason ? <span className="sem-pref-lock">{lockReason}</span> : null}
        <button type="button" className="btn small" disabled={Boolean(searchBlock)} title={searchBlock || `Evaluate up to ${alternativeBudget} actual alternatives`} onClick={() => void ws.runSearch(alternativeBudget)}><FlaskConical size={13} />Evaluate alternatives</button>
      </div>
      <div className="sem-pref-slider">
        <button type="button" className="link sem-end" disabled={Boolean(lockReason)} onClick={() => choose(0)}>Higher uniqueness</button>
        <input
          type="range" min={0} max={pool.length - 1} step={1} value={Math.max(index, 0)} style={{ '--fill': fill } as React.CSSProperties}
          aria-label="Protection preference" aria-valuetext={valueText} aria-describedby={readId} disabled={Boolean(lockReason)}
          onChange={event => choose(Number(event.target.value))}
          onPointerUp={event => { if (index < 0) choose(Number(event.currentTarget.value)); }}
          onKeyUp={event => { if (index < 0 && ['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) choose(Number(event.currentTarget.value)); }}
        />
        <button type="button" className="link sem-end" disabled={Boolean(lockReason)} onClick={() => choose(pool.length - 1)}>Lower uniqueness</button>
      </div>
      <div className="sem-pref-read" id={readId}>
        {current ? (
          <>
            <p className="sem-pref-id">
              <b>{current.label}</b> <code title={current.candidate.candidateId}>{current.candidate.candidateId}</code>
              <span className="muted"> · {recipeLabel(current.candidate.recipe.steps)}</span>
            </p>
            <dl className="sem-pref-metrics">
              <div><dt>Sample uniqueness</dt><dd>{pct(current.unique)}</dd></div>
              <div><dt>Query loss</dt><dd>{num(current.loss, 3)}</dd></div>
              <div><dt>Rows suppressed</dt><dd>{current.rows === null ? 'Not measured' : pct(current.rows)}</dd></div>
              <div><dt>Smallest group k</dt><dd>{num(current.kMin, 0)}</dd></div>
              {membershipKnown ? <div><dt>Single-guess correctness</dt><dd>{current.pGuess === null ? 'Not measured' : pct(current.pGuess)}</dd></div> : null}
            </dl>
            {current.checks === 'conflict' ? (
              <details className="sem-conflict">
                <summary><AlertTriangle size={13} aria-hidden="true" />Hard-check conflict · {failed.length ? `${failed.length} of ${current.candidate.constraints.length} not met` : 'reported by the service'}</summary>
                {failed.length ? <ul>{failed.map(check => <li key={check.id}><b>{spaced(check.id.replace('query:', 'Question: ').replaceAll('-', ' '))}</b> {clip(check.reason, 200)}</li>)}</ul> : <p>The service marked this snapshot infeasible without listing a failed check.</p>}
              </details>
            ) : <p className="muted sem-pref-checks">{current.checks === 'met' ? 'Returned hard checks met. Planning limits, not a release clearance.' : 'Hard checks were not evaluated for this snapshot.'}</p>}
          </>
        ) : (
          <p>
            {active ? <><b>{ws.labelOf(active.candidateId)}</b> is not on this scale{activeExclusion ? ` because it ${EXCLUSION_WHY[activeExclusion]}` : ''}.</> : 'No snapshot is selected.'} Move the slider or use the end links to adopt one of the {pool.length} comparable snapshots and restore its recipe.
            {' '}<button type="button" className="link" disabled={Boolean(lockReason)} onClick={() => choose(0)}>Select first snapshot</button>
          </p>
        )}
      </div>
      <details className="sem-order">
        <summary>How positions are ordered</summary>
        <div>
          <p>Each position is one real evaluated snapshot of this dataset: created candidates, search results and the unprotected baseline. Only snapshots measured under the current attacker assumptions, field classifications and research questions are listed; editing the recipe in the Inspector does not remove one, and moving the slider only selects a snapshot and restores its recipe on this page. It never calls the service.</p>
          <p><b>Order, left to right:</b> sample uniqueness, highest first. Ties use query loss, lowest first; then single-guess correctness, highest first{membershipKnown ? '' : ' (skipped: membership is unknown)'}; smallest group k, lowest first; and snapshot label and id. Query loss can increase or decrease between positions: compare the measured analytical cost of each recipe.</p>
          <p>Sample uniqueness is the share of released rows alone in their known-field class. These are sample measurements under stated assumptions. A position is not a percentage of protection, nothing is interpolated, and no position is a guarantee.</p>
          {excludedText.length ? <p className="muted">Not on the scale: {excludedText.join('; ')}.</p> : null}
        </div>
      </details>
    </section>
  );
}
