import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardCheck, Copy, ListFilter, Play, Plus, RotateCcw, Save, Square, Trash2 } from 'lucide-react';
import { isAudit, workloadKey } from '../analysis';
import { useDialogs } from '../dialogs';
import { cell, num, pct } from '../format';
import { isWeightColumn, weightUnit } from '../recipe';
import { scenarioById, scenarios } from '../scenarios';
import { EvidenceBanner } from '../ui/EvidenceBanner';
import { Empty, Notice } from '../ui/Feedback';
import { InspectorSlot, ToolbarSlot } from '../ui/Slots';
import { useWorkspace } from '../workspace';
import type { ColumnSpec, QueryType, ResearchQuery } from '../types';
import { QUERY_TYPES, QueryResults, queryTitle } from './intent/QueryResults';
import './intent/research-intent.css';

type FilterOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
interface FilterDraft { key: string; column: string; operator: FilterOp; value: string }
interface Draft { query: ResearchQuery; weight: string; tolerance: string; minCohort: string; positive: string; filters: FilterDraft[] }
const uid = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const usable = (column: ColumnSpec) => column.role !== 'direct_identifier' && column.dtype !== 'text';
const numeric = (column: ColumnSpec) => ['integer', 'float', 'boolean'].includes(column.dtype);
const ops: { id: FilterOp; label: string }[] = [{ id: 'eq', label: 'equals' }, { id: 'ne', label: 'does not equal' }, { id: 'gte', label: '≥ at least' }, { id: 'gt', label: '> above' }, { id: 'lte', label: '≤ at most' }, { id: 'lt', label: '< below' }, { id: 'in', label: 'is one of' }];

function draftOf(query: ResearchQuery): Draft {
  const filters: FilterDraft[] = [];
  Object.entries(query.filter ?? {}).forEach(([column, condition]) => {
    const entries = condition && typeof condition === 'object' && !Array.isArray(condition) ? Object.entries(condition as Record<string, unknown>) : [[Array.isArray(condition) ? 'in' : 'eq', condition]];
    entries.forEach(([operator, value]) => filters.push({ key: uid(), column, operator: operator as FilterOp, value: Array.isArray(value) ? value.map(cell).join('\n') : cell(value) }));
  });
  return { query: structuredClone(query), weight: String(query.weight), tolerance: String(query.tolerance), minCohort: String(query.minCohort), positive: cell(query.positiveValue ?? 1), filters };
}

// Filter keys identify editor rows; they are not part of a saved question.
function draftKey(draft: Draft): string {
  return JSON.stringify({ ...draft, filters: draft.filters.map(({ column, operator, value }) => ({ column, operator, value })) });
}

function typedValue(text: string, column?: ColumnSpec): unknown {
  if (numeric(column ?? { dtype: 'category' } as ColumnSpec) && text.trim() !== '' && Number.isFinite(Number(text))) return Number(text);
  if (column?.dtype === 'boolean' && /^(true|false)$/i.test(text.trim())) return text.trim().toLowerCase() === 'true';
  return text;
}

function compileDraft(draft: Draft, schema: ColumnSpec[]): { query: ResearchQuery; errors: string[] } {
  const { query } = draft;
  const errors: string[] = [];
  const weight = Number(draft.weight); const tolerance = Number(draft.tolerance); const minCohort = Number(draft.minCohort);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100) errors.push('Weight must be greater than 0 and at most 100.');
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1000000) errors.push('Tolerance must be greater than 0 and at most 1,000,000.');
  if (!Number.isInteger(minCohort) || minCohort < 1 || minCohort > 100000) errors.push('Minimum cohort must be a whole number from 1 to 100,000.');
  const selected = [...(query.groupBy ?? []), ...(query.type !== 'group_count' && query.target ? [query.target] : [])];
  if (selected.some(name => !schema.some(column => column.name === name && usable(column)))) errors.push('Choose supported fields; identifiers and free text cannot appear in research results.');
  if (query.type !== 'group_count' && !query.target) errors.push('Choose a target field.');
  if (['group_mean', 'correlation'].includes(query.type) && query.target && !schema.some(column => column.name === query.target && numeric(column))) errors.push('Means and correlations require numerical target fields.');
  if (query.type === 'correlation' && (query.groupBy?.length !== 1 || query.groupBy[0] === query.target)) errors.push('Choose two different numerical fields for correlation.');
  if (query.type === 'difference_in_rates' && query.groupBy?.length !== 1) errors.push('A rate difference needs exactly one cohort field and exactly two observed cohorts after filtering.');
  if (['group_rate', 'difference_in_rates'].includes(query.type) && !draft.positive.trim()) errors.push('Declare the value counted as a positive outcome.');
  const filter: Record<string, Record<string, unknown>> = {};
  draft.filters.forEach((item, index) => {
    const column = schema.find(entry => entry.name === item.column);
    if (!column || !usable(column)) errors.push(`Filter ${index + 1}: choose a supported field.`);
    if (!item.value.trim()) errors.push(`Filter ${index + 1}: enter a value.`);
    const isThreshold = ['gt', 'gte', 'lt', 'lte'].includes(item.operator);
    if (isThreshold && (!column || !numeric(column) || !Number.isFinite(Number(item.value)))) errors.push(`Filter ${index + 1}: thresholds need a numerical field and value.`);
    if (!ops.some(op => op.id === item.operator)) errors.push(`Filter ${index + 1}: choose a supported operator.`);
    if (filter[item.column]?.[item.operator] !== undefined) errors.push(`Filter ${index + 1}: the same field and operator are already used.`);
    filter[item.column] = { ...filter[item.column], [item.operator]: item.operator === 'in' ? item.value.split('\n').filter(value => value.trim() !== '').map(value => typedValue(value, column)) : isThreshold ? Number(item.value) : typedValue(item.value, column) };
  });
  return { query: { ...query, target: query.type === 'group_count' ? null : query.target, positiveValue: typedValue(draft.positive, schema.find(column => column.name === query.target)), weight, tolerance, minCohort, filter }, errors };
}

function QueryEditor({ query, initialDraft, schema, onSave, onDraftChange, onDiscard }: {
  query: ResearchQuery; initialDraft?: Draft | null; schema: ColumnSpec[];
  onSave: (query: ResearchQuery) => void; onDraftChange: (draft: Draft, dirty: boolean) => void; onDiscard: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft ?? draftOf(query));
  const [submitted, setSubmitted] = useState(false);
  const savedJson = useMemo(() => draftKey(draftOf(query)), [query]);
  const dirty = draftKey(draft) !== savedJson;
  const compiled = compileDraft(draft, schema);
  useEffect(() => { onDraftChange(draft, dirty); }, [draft, dirty, onDraftChange]);
  const available = schema.filter(usable);
  const isNumber = ['group_mean', 'correlation'].includes(draft.query.type);
  const targets = available.filter(column => !isNumber || numeric(column));
  const setQuery = (change: Partial<ResearchQuery>) => setDraft(current => ({ ...current, query: { ...current.query, ...change } }));
  const filterChange = (key: string, change: Partial<FilterDraft>) => setDraft(current => ({ ...current, filters: current.filters.map(item => item.key === key ? { ...item, ...change } : item) }));
  const selectedGroups = draft.query.groupBy ?? [];
  const targetSpec = schema.find(column => column.name === draft.query.target);
  const poundSource = Boolean(targetSpec && isWeightColumn(targetSpec) && weightUnit(targetSpec) === 'lb');
  const parsedTol = Number(draft.tolerance);
  const kgPreview = poundSource && Number.isFinite(parsedTol) && parsedTol > 0 ? ` (≈ ${num(parsedTol * 0.45359237, 3)} kg)` : '';
  const toleranceUnit = draft.query.type === 'group_count' ? 'rows' : draft.query.type === 'correlation' ? 'absolute Δr'
    : draft.query.type === 'group_mean' ? (poundSource ? `lb in the source; results are compared in kg after an explicit conversion${kgPreview}` : targetSpec?.unit ?? 'target units')
      : 'fraction (0.05 = 5 pp)';
  const changeType = (type: QueryType) => {
    const target = type === 'group_count' ? null : available.find(column => (!['group_mean', 'correlation'].includes(type) || numeric(column)) && column.name === draft.query.target)?.name ?? available.find(column => !['group_mean', 'correlation'].includes(type) || numeric(column))?.name ?? null;
    const groups = type === 'correlation' ? available.filter(column => numeric(column) && column.name !== target).slice(0, 1).map(column => column.name) : type === 'difference_in_rates' ? selectedGroups.slice(0, 1) : draft.query.type === 'correlation' ? [] : selectedGroups;
    setQuery({ type, target, groupBy: groups });
  };
  return (
    <form className="intent-editor" onSubmit={event => { event.preventDefault(); setSubmitted(true); if (!compiled.errors.length) onSave(compiled.query); }}>
      <div className="intent-editor-head"><div><span className="intent-eyebrow">Question definition</span><h2>{queryTitle(draft.query)}</h2></div><span className={dirty ? 'intent-draft-mark' : 'intent-saved-mark'}>{dirty ? 'Unsaved edits' : 'Saved to workload'}</span></div>
      <div className="intent-form-grid">
        <label className="intent-field"><span>Statistic</span><select value={draft.query.type} onChange={event => changeType(event.target.value as QueryType)}>{QUERY_TYPES.map(type => <option value={type.id} key={type.id}>{type.label}</option>)}</select></label>
        {draft.query.type !== 'group_count' ? <label className="intent-field"><span>{draft.query.type === 'correlation' ? 'Y · target field' : 'Target field'}</span><select value={draft.query.target ?? ''} onChange={event => setQuery({ target: event.target.value })}><option value="">Choose a field</option>{targets.map(column => <option key={column.name} value={column.name}>{column.name}{column.unit ? ` (${column.unit})` : ''}</option>)}</select></label> : <div className="intent-field intent-fixed"><span>Target</span><b>Rows in the selected cohort</b></div>}
      </div>
      <p className="intent-help">{QUERY_TYPES.find(type => type.id === draft.query.type)?.description}</p>
      {draft.query.type === 'correlation' ? <label className="intent-field"><span>X · predictor field</span><select value={selectedGroups[0] ?? ''} onChange={event => setQuery({ groupBy: event.target.value ? [event.target.value] : [] })}><option value="">Choose a numerical field</option>{available.filter(column => numeric(column) && column.name !== draft.query.target).map(column => <option key={column.name} value={column.name}>{column.name}{column.unit ? ` (${column.unit})` : ''}</option>)}</select></label> : (
        <fieldset className="intent-group-fields"><legend>Group by <span>{draft.query.type === 'difference_in_rates' ? 'one field; exactly two observed cohorts required' : 'optional · declares subgroups to inspect'}</span></legend>
          <div>{available.map(column => <label key={column.name} className={selectedGroups.includes(column.name) ? 'selected' : ''}><input type="checkbox" checked={selectedGroups.includes(column.name)} onChange={event => setQuery({ groupBy: event.target.checked ? draft.query.type === 'difference_in_rates' ? [column.name] : [...selectedGroups, column.name].slice(0, 5) : selectedGroups.filter(name => name !== column.name) })} disabled={!selectedGroups.includes(column.name) && draft.query.type !== 'difference_in_rates' && selectedGroups.length >= 5} /><span>{column.name}</span></label>)}</div>
        </fieldset>
      )}
      {['group_rate', 'difference_in_rates'].includes(draft.query.type) ? <label className="intent-field"><span>Positive outcome value</span><input type="text" value={draft.positive} onChange={event => setDraft(current => ({ ...current, positive: event.target.value }))} /><small>Only this value counts as a positive outcome; 1 and true are equivalent.</small></label> : null}
      <section className="intent-filter-section" aria-label="Cohort filters"><div className="intent-inline-heading"><h3><ListFilter size={15} />Cohort filters</h3><button type="button" className="btn small" disabled={!available.length} onClick={() => setDraft(current => ({ ...current, filters: [...current.filters, { key: uid(), column: available[0]?.name ?? '', operator: 'eq', value: '' }] }))}><Plus size={13} />Add filter</button></div>
        {!draft.filters.length ? <p className="intent-help">All rows are included. Add conditions to ask about a defined population.</p> : <div className="intent-filters">{draft.filters.map((item, index) => <div className="intent-filter" key={item.key}>
          <label><span className="sr-only">Filter {index + 1} field</span><select value={item.column} onChange={event => filterChange(item.key, { column: event.target.value })}>{available.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
          <label><span className="sr-only">Filter {index + 1} operator</span><select value={item.operator} onChange={event => filterChange(item.key, { operator: event.target.value as FilterOp })}>{ops.map(op => <option key={op.id} value={op.id}>{op.label}</option>)}</select></label>
          <label><span className="sr-only">Filter {index + 1} value{item.operator === 'in' ? 's, one per line' : ''}</span>{item.operator === 'in' ? <textarea rows={2} placeholder="One value per line" value={item.value} onChange={event => filterChange(item.key, { value: event.target.value })} /> : <input type="text" placeholder="Value" value={item.value} onChange={event => filterChange(item.key, { value: event.target.value })} />}</label>
          <button type="button" className="icon-btn" aria-label={`Remove filter ${index + 1}`} onClick={() => setDraft(current => ({ ...current, filters: current.filters.filter(entry => entry.key !== item.key) }))}><Trash2 size={15} /></button>
        </div>)}</div>}
        {draft.filters.length ? <p className="intent-help">Conditions are combined with AND. Thresholds use source units. Intervals crossing a threshold produce bounds and an unavailable result.</p> : null}
      </section>
      <div className="intent-form-grid intent-three">
        <label className="intent-field"><span>Absolute tolerance</span><input type="number" min="0.000001" max="1000000" step="any" value={draft.tolerance} onChange={event => setDraft(current => ({ ...current, tolerance: event.target.value }))} /><small>{toleranceUnit}</small></label>
        <label className="intent-field"><span>Importance weight</span><input type="number" min="0.000001" max="100" step="any" value={draft.weight} onChange={event => setDraft(current => ({ ...current, weight: event.target.value }))} /><small>Relative to other questions</small></label>
        <label className="intent-field"><span>Minimum support</span><input type="number" min="1" max="100000" step="1" value={draft.minCohort} onChange={event => setDraft(current => ({ ...current, minCohort: event.target.value }))} /><small>Valid observations per cohort</small></label>
      </div>
      {submitted && compiled.errors.length ? <div className="form-error" role="alert"><b>Check this question</b><ul className="intent-issues">{compiled.errors.map(error => <li key={error}>{error}</li>)}</ul></div> : null}
      <div className="intent-editor-foot">
        <span>{dirty ? 'Unsaved edits block evaluation and export until saved or discarded.' : 'Saving edits changes the workload; measurements update after evaluation.'}</span>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          {dirty ? <button className="btn" type="button" onClick={onDiscard}><RotateCcw size={13} />Discard edits</button> : null}
          <button className="btn primary" type="submit" disabled={!dirty}><Save size={14} />Save question</button>
        </span>
      </div>
    </form>
  );
}

function IntentInspector() {
  const ws = useWorkspace();
  const scenario = scenarioById(ws.scenarioId);
  const controls = [{ key: 'minK', label: 'Minimum group size (k)', max: 100000, step: 1 }, { key: 'maxUnique', label: 'Maximum sample uniqueness', max: 1, step: .01 }, { key: 'maxSuppression', label: 'Maximum row suppression', max: 1, step: .01 }, { key: 'maxLoss', label: 'Maximum bounded query loss', max: 1, step: .01 }] as const;
  return <><header className="inspector-head"><h2>Sharing context</h2></header><div className="inspector-scroll intent-inspector">
    <section className="insp-section"><label className="intent-field"><span>Planning scenario</span><select value={ws.scenarioId} onChange={event => ws.setScenarioId(event.target.value)}>{scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><p>{scenario.context}</p><small>Editable planning defaults. These are not legal thresholds or release permission.</small></section>
    <section className="insp-section"><h3>Search constraints</h3><p>These apply to the next Pareto search. Editing them does not rewrite existing search results.</p>{controls.map(control => <label className="intent-field" key={control.key}><span>{control.label}</span><input type="number" min={control.key === 'minK' ? 1 : 0} max={control.max} step={control.step} value={ws.constraints[control.key]} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && event.target.value !== '') ws.setConstraints({ ...ws.constraints, [control.key]: Math.max(control.key === 'minK' ? 1 : 0, Math.min(control.max, control.key === 'minK' ? Math.round(value) : value)) }); }} /><small>{control.key === 'minK' ? 'Rows sharing the known fields' : `${pct(ws.constraints[control.key])} · enter a fraction from 0 to 1`}</small></label>)}</section>
    <section className="insp-section"><h3>What should survive?</h3><p>Each question is measured against the original source. Cohort failures, missing estimates and association reversals cannot pass.</p><p>The composite is a weighted mean of capped absolute-error / tolerance. A positively weighted unavailable query makes the composite unavailable.</p><p>Declared group-by fields also drive bounded subgroup diagnostics. They do not identify every population subgroup.</p></section>
    <button className="btn" type="button" disabled={!scenario.evaluated} onClick={() => ws.setView('pareto')}>Explore candidate tradeoffs</button>
  </div></>;
}

export default function ResearchIntent() {
  const ws = useWorkspace(); const dialogs = useDialogs();
  const [selected, setSelected] = useState(() => ws.workloadDraft?.id ?? '');
  const [localError, setLocalError] = useState('');
  const workload = ws.workload;
  const query = workload.find(item => item.id === selected) ?? workload[0];
  const dirty = ws.workloadDirty;
  const pending = ws.busy.apply || ws.busy.assess;
  const auditSchemaChanged = isAudit(ws.active) && ws.stale.includes('classifications');
  const scenario = scenarioById(ws.scenarioId);
  const storeDraft = ws.setWorkloadDraft;
  const handleDraftChange = useCallback((draft: Draft, isDirty: boolean) => {
    if (!query) return;
    storeDraft(isDirty ? { id: query.id, draft, dirty: true } : null);
  }, [query, storeDraft]);
  const discardDraft = useCallback(() => {
    ws.discardWorkloadDraft();
    setLocalError('');
  }, [ws]);
  const run = async () => {
    setLocalError('');
    const success = ws.active && (isAudit(ws.active) || !ws.stale.some(reason => ['recipe', 'classifications'].includes(reason))) ? await ws.assess() : Boolean(await ws.apply());
    if (!success && !ws.sessionLost) setLocalError('The evaluation did not complete. Your saved workload and earlier measurements are retained. Check the notification, then retry.');
  };
  const switchQuestion = (id: string) => { if (dirty) { setLocalError('Save or discard your question edits before selecting another question.'); return; } setSelected(id); setLocalError(''); };
  const append = (copy?: ResearchQuery) => {
    if (dirty) { setLocalError('Save or discard your question edits before adding another question.'); return; }
    const target = ws.dataset?.schema.find(column => usable(column) && column.role === 'research_target') ?? ws.dataset?.schema.find(usable);
    const next: ResearchQuery = copy ? { ...structuredClone(copy), id: uid() } : { id: uid(), type: 'group_count', target: null, groupBy: target?.dtype === 'category' ? [target.name] : [], weight: 1, tolerance: 10, minCohort: 5 };
    ws.setWorkload([...workload, next]); setSelected(next.id); setLocalError('');
  };
  const remove = () => { if (!query) return; ws.setWorkload(workload.filter(item => item.id !== query.id)); setSelected(''); setLocalError(''); };
  const move = (offset: number) => { if (!query) return; const index = workload.indexOf(query); const next = [...workload]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; ws.setWorkload(next); };
  if (!ws.dataset) return <div className="start"><Empty icon={<ListFilter size={26} />} title={ws.busy.boot ? 'Loading the research workspace…' : 'Open a dataset to define research intent'} actions={<button className="btn" type="button" onClick={() => ws.setView('workbench')}>Open workbench</button>}>Research questions use the fields in your current dataset.</Empty></div>;
  const snapshotMatches = ws.active?.workload ? !dirty && workloadKey(ws.active.workload) === workloadKey(workload) : false;
  const initialDraft = query && ws.workloadDraft?.id === query.id ? (ws.workloadDraft.draft as Draft) : null;
  return <div className="intent-view">
    <ToolbarSlot><span className="intent-toolbar-label"><ListFilter size={15} />Research workload <span>{workload.length}/20 questions{dirty ? ' · unsaved edits' : ''}</span></span><span className="toolbar-spacer" />{pending ? <button className="btn" type="button" onClick={() => ws.cancel(ws.busy.apply ? 'apply' : 'assess')}><Square size={13} />Stop waiting</button> : null}<button className="btn primary" type="button" disabled={pending || dirty || auditSchemaChanged || !ws.reviewed || !scenario.evaluated || ws.health !== 'ok' || ws.sessionLost || !workload.length} title={dirty ? 'Save or discard your question edits first' : undefined} onClick={() => void run()}><Play size={14} />{pending ? 'Evaluating…' : 'Evaluate workload'}</button></ToolbarSlot>
    <InspectorSlot><IntentInspector /></InspectorSlot>
    <div className="intent-document">
      <header className="intent-page-head"><div><span className="intent-eyebrow">Research intent</span><h1>Define what the data must preserve.</h1><p>Write the questions first. Measure whether the candidate still answers them.</p></div><button type="button" className="btn" disabled={workload.length >= 20 || dirty} onClick={() => append()}><Plus size={15} />Add question</button></header>
      <EvidenceBanner />
      {!ws.reviewed ? <Notice title="Review the source fields before evaluation.">Confirm roles, numerical units and the person key in the workbench.<span className="notice-actions"><button className="btn small" type="button" onClick={() => dialogs.open('review')}><ClipboardCheck size={14} />Review classifications</button></span></Notice> : null}
      {!scenario.evaluated ? <Notice tone="warn" title="Aggregate-only release is not evaluated.">This context is for planning only. PRISM’s candidate evaluator operates on row releases; choose a supported sharing scenario to run it.</Notice> : null}
      {auditSchemaChanged ? <Notice tone="warn" title="External audit classifications have changed.">Re-run the external audit to bind the revised fields and units before evaluating this workload.<span className="notice-actions"><button className="btn small" type="button" onClick={() => dialogs.open('audit')}>Re-run external audit</button></span></Notice> : null}
      {localError ? <div className="form-error" role="alert">{localError}</div> : null}
      <div className="intent-composer">
        <nav className="intent-question-list" aria-label="Research questions"><div className="intent-list-head"><span>Workload</span><span>{workload.length}</span></div>{workload.map((item, index) => <button type="button" className={query?.id === item.id ? 'selected' : ''} key={item.id} onClick={() => switchQuestion(item.id)} aria-current={query?.id === item.id ? 'true' : undefined}><span className="intent-question-number">{String(index + 1).padStart(2, '0')}</span><span><b>{queryTitle(item)}</b><small>Weight {num(item.weight)} · n ≥ {item.minCohort}{Object.keys(item.filter ?? {}).length ? ' · filtered' : ''}</small></span></button>)}{!workload.length ? <p>No questions yet. Add a question to define a measurable workload.</p> : null}</nav>
        <div className="intent-editing-column">{query ? <>
          <QueryEditor key={`${query.id}-${ws.workloadDraftVersion}-${JSON.stringify(query)}`} query={query} initialDraft={initialDraft} schema={ws.dataset.schema} onDraftChange={handleDraftChange} onDiscard={discardDraft} onSave={next => { ws.setWorkload(workload.map(item => item.id === next.id ? next : item)); setLocalError(''); }} />
          <div className="intent-question-actions"><div><button className="btn small" type="button" disabled={dirty || workload.indexOf(query) === 0} onClick={() => move(-1)} aria-label="Move question up"><ArrowUp size={14} /></button><button className="btn small" type="button" disabled={dirty || workload.indexOf(query) === workload.length - 1} onClick={() => move(1)} aria-label="Move question down"><ArrowDown size={14} /></button><button className="btn small" type="button" disabled={dirty || workload.length >= 20} onClick={() => append(query)}><Copy size={13} />Duplicate</button></div><div>{dirty ? <button type="button" className="btn small" onClick={discardDraft}><RotateCcw size={13} />Discard edits</button> : null}<button className="btn small danger" type="button" disabled={dirty} onClick={remove}><Trash2 size={13} />Remove question</button></div></div>
        </> : <Empty title="Begin with one research question" actions={<button className="btn primary" type="button" onClick={() => append()}><Plus size={14} />Add question</button>}>Choose a count, rate, mean, correlation or rate difference. Set the tolerance that would change your scientific conclusion.</Empty>}</div>
      </div>
      <section className="intent-measured-section"><div className="intent-section-head"><div><span className="intent-eyebrow">Preservation check</span><h2>Source → {ws.active ? ws.labelOf(ws.active.candidateId) : 'candidate'}</h2></div><span className="intent-snapshot-note">{pending ? 'Previous snapshot · evaluation pending' : !ws.active ? 'Not yet evaluated' : !snapshotMatches ? 'Saved workload has changed' : 'Frozen workload results'}</span></div>
        {ws.active ? <><p className="intent-help">These are actual query evaluations against the source, not preview-row estimates. {ws.stale.length ? 'The controls have changed; use the evidence banner to refresh this snapshot.' : ''}</p><QueryResults queries={ws.active.utility.queries} workload={ws.active.workload} schema={ws.active.schema} candidateLabel={ws.labelOf(ws.active.candidateId)} /><p className="intent-composite">Bounded workload loss <strong>{ws.active.utility.loss === null ? 'Unavailable' : num(ws.active.utility.loss, 4)}</strong> · {ws.active.utility.loss_definition ?? 'Weighted mean of min(1, absolute error / tolerance) for available selected tasks; unavailable weighted tasks abstain.'}</p>{ws.active.utility.warnings?.length ? <ul className="intent-issues">{ws.active.utility.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : null}</> : <p className="intent-no-results">Save your questions, then evaluate the workload. No measurements have been made for these controls.</p>}
      </section>
      <details className="intent-mobile-context"><summary>Sharing scenario and search constraints</summary><IntentInspector /></details>
    </div>
  </div>;
}
