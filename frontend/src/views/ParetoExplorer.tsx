import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, ClipboardCheck, GitCompareArrows, Play, ScanLine, SlidersHorizontal, Square, TriangleAlert } from 'lucide-react';
import { STALE_LABEL } from '../analysis';
import { useDialogs } from '../dialogs';
import { isFictional } from '../deployment';
import { num, pct, signed, title } from '../format';
import { recipeLabel } from '../recipe';
import { scenarioById, scenarios } from '../scenarios';
import type { Candidate } from '../types';
import { Empty, Notice } from '../ui/Feedback';
import { InspectorSlot, ToolbarSlot } from '../ui/Slots';
import { useWorkspace } from '../workspace';
import { ParetoInspector } from './pareto/ParetoInspector';
import { ParetoPlot } from './pareto/ParetoPlot';
import { ATTACK_METRICS, attackValue, feasibility, informationValue, measuredFrontier, measuredVector, rememberSearchPlan, rowLoss, searchPlans, workloadLoss } from './pareto/model';
import type { AttackMetric } from './pareto/model';
import './pareto/pareto-explorer.css';

type Filter = 'all' | 'frontier' | 'feasible';
type Sort = 'label' | 'attack' | 'loss' | 'rows' | 'checks';
const NO_CANDIDATES: Candidate[] = [];
const TERMINATION: Record<string, string> = {
  cap_reached: 'Candidate budget reached', attempt_cap_reached: 'Recipe-attempt cap reached', bounded_grammar_exhausted: 'Bounded recipe grammar exhausted',
};
type Plan = { key: string; scenario: string; limits: string; budget: number };

function measurementScope(candidate: Candidate, reference: Candidate | undefined): 'same' | 'different' | 'unknown' {
  if (!reference || !candidate.threatModel || !candidate.threatContext || !candidate.workload || !candidate.schema || !reference.threatModel || !reference.threatContext || !reference.workload || !reference.schema) return 'unknown';
  const key = (item: Candidate) => JSON.stringify([item.threatModel, item.threatContext, item.workload, item.schema]);
  return key(candidate) === key(reference) ? 'same' : 'different';
}

export default function ParetoExplorer() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const [budget, setBudget] = useState(24);
  const searchCap = Math.max(1, Math.min(80, ws.healthInfo?.maxSearchCandidates ?? (ws.deployment.hosted ? 24 : 80)));
  const budgetOptions = [...new Set([...([12, 24, 40, 80].filter(count => count <= searchCap)), searchCap])].sort((a, b) => a - b);
  useEffect(() => { setBudget(current => Math.min(current, searchCap)); }, [searchCap]);
  const [metric, setMetric] = useState<AttackMetric>('sample_unique');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: Sort; descending: boolean }>({ key: 'label', descending: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<'idle' | 'running' | 'failed' | 'cancelled'>('idle');
  const [savedPlan, setSavedPlan] = useState<Plan | undefined>(() => ws.search ? searchPlans.get(ws.search.jobId) : undefined);
  const pendingPlan = useRef<Plan | null>(null);
  const cancelled = useRef(false);
  const candidates = ws.search?.candidates ?? NO_CANDIDATES;
  const originalRows = ws.dataset?.rowCount ?? 0;
  const frontier = useMemo(() => measuredFrontier(candidates, originalRows), [candidates, originalRows]);
  const scenario = scenarioById(ws.scenarioId);
  const metricSpec = ATTACK_METRICS.find(item => item.key === metric)!;
  const limitsKey = JSON.stringify(ws.constraints);
  const planKey = JSON.stringify({ dataset: ws.dataset?.datasetId, schema: ws.dataset?.schema, threat: ws.threat, workload: ws.workload, limits: ws.constraints });
  const selected = candidates.find(candidate => candidate.candidateId === selectedId) ?? null;
  const met = candidates.filter(candidate => feasibility(candidate) === 'met').length;
  const incomplete = candidates.filter(candidate => !measuredVector(candidate, originalRows)).length;
  const frozenDrift = candidates[0] ? ws.staleFor(candidates[0]).filter(reason => reason !== 'recipe') : [];
  const planChanged = Boolean(savedPlan && savedPlan.key !== planKey);
  const limitsChanged = Boolean(savedPlan && savedPlan.limits !== limitsKey);
  const busy = ws.busy.search;
  const blocked = busy || !ws.reviewed || !scenario.evaluated || ws.sessionLost || ws.busy.boot || ws.busy.schema || ws.busy.clear || ws.busy.import || ws.busy.apply || ws.busy.assess || ws.busy.audit;

  useEffect(() => {
    setSelectedId(previous => candidates.some(candidate => candidate.candidateId === previous) ? previous : candidates.find(candidate => frontier.has(candidate.candidateId))?.candidateId ?? candidates[0]?.candidateId ?? null);
  }, [candidates, frontier]);

  useEffect(() => {
    if (!ws.search) { setSavedPlan(undefined); return; }
    const plan = pendingPlan.current ?? searchPlans.get(ws.search.jobId);
    if (plan) rememberSearchPlan(ws.search.jobId, plan);
    pendingPlan.current = null;
    setSavedPlan(plan);
  }, [ws.search]);

  const startSearch = async () => {
    if (blocked) return;
    pendingPlan.current = { key: planKey, scenario: scenario.label, limits: limitsKey, budget };
    cancelled.current = false;
    setRequestState('running');
    const done = await ws.runSearch(budget);
    if (!done) pendingPlan.current = null;
    setRequestState(done ? 'idle' : cancelled.current ? 'cancelled' : 'failed');
  };
  const stopWaiting = () => {
    cancelled.current = true;
    ws.cancel('search');
    setRequestState('cancelled');
  };
  const setLimit = (key: keyof typeof ws.constraints, input: string, percent = false) => {
    if (input === '') return;
    const number = Number(input);
    if (!Number.isFinite(number)) return;
    const value = key === 'minK' ? Math.max(1, Math.round(number)) : Math.min(1, Math.max(0, number / (percent ? 100 : 1)));
    ws.setConstraints({ ...ws.constraints, [key]: value });
  };
  const visible = useMemo(() => {
    const list = candidates.filter(candidate => filter === 'all' || (filter === 'frontier' ? frontier.has(candidate.candidateId) : feasibility(candidate) === 'met'));
    const value = (candidate: Candidate): number | null => sort.key === 'attack' ? attackValue(candidate, metric) : sort.key === 'loss' ? workloadLoss(candidate) : sort.key === 'rows' ? rowLoss(candidate, originalRows) : sort.key === 'checks' ? candidate.constraints.filter(check => !check.pass).length : candidates.indexOf(candidate);
    return [...list].sort((a, b) => {
      const left = value(a), right = value(b);
      if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
      return (left - right) * (sort.descending ? -1 : 1);
    });
  }, [candidates, filter, frontier, metric, originalRows, sort]);
  const comparison = ws.compare.map(id => ws.findCandidate(id)).filter((candidate): candidate is Candidate => candidate !== null);
  const info = ws.search ? informationValue(ws.search) : [];

  const sortHeading = (key: Sort, label: string) => <th scope="col" aria-sort={sort.key === key ? sort.descending ? 'descending' : 'ascending' : 'none'}><button type="button" onClick={() => setSort(current => ({ key, descending: current.key === key ? !current.descending : false }))}>{label}{sort.key === key ? sort.descending ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : null}</button></th>;

  if (!ws.dataset) return <div className="px-start"><Empty icon={<ScanLine size={28} />} title="Open a dataset to explore candidates" actions={<button type="button" className="btn primary" disabled={ws.busy.boot} onClick={() => void ws.loadDemo('architecture')}>{ws.busy.boot ? 'Loading fictional records…' : 'Load fictional oncology demo'}</button>}>The search evaluates real transformations of your source against the selected attack assumptions and research workload.</Empty></div>;

  return <div className="px-workspace">
    <ToolbarSlot>
      <span className="px-tool-title"><ScanLine size={15} />Candidate explorer</span>
      <span className="px-tool-note">{ws.search ? `${num(ws.search.evaluated, 0)} evaluated · ${frontier.size} measured nondominated` : 'Bounded evaluation of tested recipes'}</span>
      <span className="toolbar-spacer" />
      {!ws.reviewed ? <button type="button" className="btn" onClick={() => dialogs.open('review')}><ClipboardCheck size={14} />Review classifications</button> : null}
      {busy ? <button type="button" className="btn" onClick={stopWaiting}><Square size={12} fill="currentColor" />Stop waiting</button> : null}
      <button type="button" className={`btn primary${busy ? ' busy' : ''}`} disabled={blocked} onClick={() => void startSearch()}><Play size={13} fill="currentColor" />{busy ? 'Evaluating candidates…' : ws.search ? 'Run search again' : 'Run candidate search'}</button>
    </ToolbarSlot>
    <InspectorSlot><ParetoInspector candidate={selected} frontier={frontier} originalRows={originalRows} /></InspectorSlot>

    <header className="px-heading"><div><p className="px-eyebrow">SEARCH WORKSPACE</p><h1>Explore the trade-offs</h1><p>Compare measured privacy exposure, scientific loss and row loss. Choose a snapshot to inspect before using it.</p></div><span className="px-source-label">{isFictional(ws.deployment, ws.dataset) ? 'Fictional source' : 'Imported source'}<b>{num(originalRows, 0)} records</b></span></header>

    <section className="px-plan" aria-labelledby="px-plan-title">
      <div className="px-section-head"><h2 id="px-plan-title"><SlidersHorizontal size={15} />Search plan</h2><span>Editable planning limits · not release standards</span></div>
      <div className="px-plan-top"><label>Sharing context<select value={ws.scenarioId} disabled={busy} onChange={event => ws.setScenarioId(event.target.value)}>{scenarios.map(item => <option key={item.id} value={item.id}>{item.label}{item.evaluated ? '' : ' · not evaluated'}</option>)}</select></label><p>{scenario.context}</p><label className="px-budget">Candidate budget<select value={Math.min(budget, searchCap)} disabled={busy} onChange={event => setBudget(Number(event.target.value))}>{budgetOptions.map(count => <option key={count} value={count}>Up to {count} candidates</option>)}</select></label></div>
      {ws.deployment.hosted ? <div className="px-state"><div><b>Hosted session limits: {searchCap} candidates per search · {ws.healthInfo?.maxCandidates ?? 40} per session.</b><p>Download evidence you want to keep before clearing a full session. Your downloaded files remain available.</p><button type="button" className="px-text-action" disabled={busy} onClick={() => dialogs.open('clear')}>Clear session…</button></div></div> : null}
      <fieldset className="px-limits" disabled={busy || !scenario.evaluated}><legend className="sr-only">Hard search limits</legend>
        <label>Minimum sample k<div><input type="number" min="1" step="1" aria-label="Minimum sample k" value={ws.constraints.minK} onChange={event => setLimit('minK', event.target.value)} /><span>records / class</span></div></label>
        <label>Maximum unique rows<div><input type="number" min="0" max="100" step="1" aria-label="Maximum sample unique rows, percent" value={Number((ws.constraints.maxUnique * 100).toFixed(3))} onChange={event => setLimit('maxUnique', event.target.value, true)} /><span>% of release</span></div></label>
        <label>Maximum row loss<div><input type="number" min="0" max="100" step="1" aria-label="Maximum row suppression, percent" value={Number((ws.constraints.maxSuppression * 100).toFixed(3))} onChange={event => setLimit('maxSuppression', event.target.value, true)} /><span>% of source</span></div></label>
        <label>Maximum query loss<div><input type="number" min="0" max="1" step=".01" aria-label="Maximum research query loss" value={ws.constraints.maxLoss} onChange={event => setLimit('maxLoss', event.target.value)} /><span>normalized loss</span></div></label>
      </fieldset>
      <details className="px-plan-scope"><summary>What will this search test?</summary><div><p><b>Known fields:</b> {ws.qi.join(', ') || 'None selected'}. <b>Sensitive targets:</b> {ws.sensitive.join(', ') || 'None selected'}. Source membership {ws.threat.membershipKnown ? 'known' : 'unknown'}.</p><p><b>{ws.workload.length} research questions</b> supply the measured loss; each question’s tolerance is also checked. Direct identifier removal is a hard check. Research-target roles are preserved by the automatic recipe grammar.</p><p>The deterministic search tests actual recipes within the selected budget, at most 80 attempts and four edit depths. It does not enumerate every possible transformation or establish a global optimum.</p><div className="px-inline-actions"><button type="button" className="px-text-action" onClick={() => ws.setView('workbench')}>Edit attacker and fields<ArrowUpRight size={12} /></button><button type="button" className="px-text-action" onClick={() => ws.setView('intent')}>Edit research questions<ArrowUpRight size={12} /></button></div></div></details>
      {!scenario.evaluated ? <Notice tone="warn" title="Aggregate workflows are not searched here.">This engine evaluates row releases. Choose an evaluated sharing context, or inspect the aggregate differencing example in <button type="button" className="link" onClick={() => ws.setView('lab')}>Attack Lab</button>.</Notice> : null}
      {!ws.reviewed ? <Notice title="Review classifications before searching.">Confirm field roles, units and the person key. <button type="button" className="link" onClick={() => dialogs.open('review')}>Review the source</button></Notice> : null}
      {!ws.workload.length ? <Notice tone="warn" title="No research workload selected.">Utility cannot be established without research questions. <button type="button" className="link" onClick={() => ws.setView('intent')}>Add research questions</button> before judging a trade-off.</Notice> : null}
    </section>

    <div className="px-live-state" aria-live="polite" aria-atomic="true">
      {busy ? <div className="px-state pending"><span className="px-state-dot" /><div><b>Evaluating up to {pendingPlan.current?.budget ?? budget} distinct candidates {ws.deployment.place}.</b><p>Measurements appear when the bounded run finishes. Earlier snapshots remain frozen; no estimated progress is shown.</p></div></div> : null}
      {!busy && requestState === 'failed' ? <div className="px-state warning" role="alert"><TriangleAlert size={17} /><div><b>The search did not return a result.</b><p>The service notification contains the reason. Earlier snapshots are retained. Check that the service is reachable and retry; an expired session can be recovered from the session banner.</p><button type="button" className="px-text-action" disabled={blocked} onClick={() => void startSearch()}>Retry this search</button></div></div> : null}
      {requestState === 'cancelled' ? <div className="px-state warning"><Square size={14} /><div><b>Stopped waiting.</b><p>The service may finish its current work, but its result will be discarded. Your previous candidates remain available.</p></div></div> : null}
      {(planChanged || frozenDrift.length > 0) && ws.search ? <div className="px-state warning"><TriangleAlert size={17} /><div><b>Earlier search snapshot · current controls have changed.</b><p>{limitsChanged ? 'Hard checks below use the limits from the earlier run. ' : ''}{frozenDrift.length ? `Frozen ${frozenDrift.map(reason => STALE_LABEL[reason]).join(', ')} differ from the current controls. ` : ''}Run search again to measure this plan. Nondominance below describes the earlier snapshots only.</p></div></div> : null}
    </div>

    {!ws.search ? <section className="px-search-empty"><Empty icon={<ScanLine size={30} />} title="No search results yet" actions={<button type="button" className="btn primary" disabled={blocked} onClick={() => void startSearch()}><Play size={13} fill="currentColor" />Evaluate up to {budget} candidates</button>}>The chart will contain measured snapshots of this source. Start with 24 recipes, inspect the conflicts, then adjust the plan if needed.</Empty><p>Every point must have an available attack metric and scientific loss. No automatic release clearance.</p></section> : <>
      <section className="px-results" aria-labelledby="px-results-title" aria-busy={busy}>
        <div className="px-section-head px-results-head"><div><h2 id="px-results-title">Measured candidate space</h2><p>{num(ws.search.evaluated, 0)} successful evaluations / {ws.search.cap} budget{typeof ws.search.attempted === 'number' ? ` · ${ws.search.attempted} recipe attempts` : ''} · {TERMINATION[ws.search.termination] ?? title(ws.search.termination)}</p></div><span className="px-result-context">{savedPlan?.scenario ?? 'Frozen search context'}</span></div>
        <div className="px-chart-controls"><label>Attack metric · lower is better<select value={metric} onChange={event => setMetric(event.target.value as AttackMetric)}>{ATTACK_METRICS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><div className="px-filter" role="group" aria-label="Candidate filter">{([{ id: 'all', label: `All ${candidates.length}` }, { id: 'frontier', label: `Nondominated ${frontier.size}` }, { id: 'feasible', label: `Checks met ${met}` }] as const).map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div></div>
        <p className="px-metric-note">{metricSpec.note}</p>
        <ParetoPlot candidates={visible} metric={metric} metricLabel={metricSpec.label} frontier={frontier} selectedId={selectedId} onSelect={setSelectedId} labelOf={ws.labelOf} originalRows={originalRows} />
        <div className="px-legend"><span><i className="px-legend-dot frontier" />Nondominated</span><span><i className="px-legend-dot" />Dominated / incomplete</span><span><i className="px-legend-conflict" />Hard constraint conflict</span><span>{incomplete ? `${incomplete} incomplete objective vector${incomplete === 1 ? '' : 's'}` : 'Four measured objectives'}</span></div>
        <p className="px-frontier-note"><b>Nondominated among the tested complete snapshots:</b> no other measured recipe is at least as good on all four objectives and better on one. Objectives: sample uniqueness, sensitive inference advantage, row loss and research-query loss. The chart is a two-axis projection. Hard checks are separate; a nondominated recipe can fail them. {incomplete ? 'Incomplete vectors are excluded from the frontier calculation.' : ''}</p>
        {candidates.length && met === 0 ? <div className="px-no-feasible"><TriangleAlert size={16} /><span><b>No tested candidate meets every hard check.</b> Inspect the conflicts, revise the workload or consider governed access. Increasing the budget does not guarantee a passing candidate.</span></div> : null}
        <div className="px-table-scroll" tabIndex={0} role="region" aria-label="Sortable candidate results table">
          <table className="px-table"><caption>All values are frozen service measurements. Unknown values are never plotted as zero. Select a snapshot to inspect its exact recipe.</caption><thead><tr>{sortHeading('label', 'Snapshot')}{sortHeading('attack', metricSpec.label)}{sortHeading('loss', 'Query loss')}{sortHeading('rows', 'Row loss')}{sortHeading('checks', 'Hard checks')}<th scope="col">Four-objective set</th><th scope="col">Compare</th></tr></thead><tbody>
            {visible.map(candidate => { const status = feasibility(candidate); const missing = !measuredVector(candidate, originalRows); const failed = candidate.constraints.filter(check => !check.pass).length; return <tr key={candidate.candidateId} className={selectedId === candidate.candidateId ? 'selected' : ''}>
              <th scope="row"><button type="button" className="px-select-row" aria-pressed={selectedId === candidate.candidateId} aria-label={`Inspect ${ws.labelOf(candidate.candidateId)}: ${recipeLabel(candidate.recipe.steps)}`} onClick={() => setSelectedId(candidate.candidateId)}><b>{ws.labelOf(candidate.candidateId)}</b><span>{recipeLabel(candidate.recipe.steps)}</span></button></th>
              <td>{attackValue(candidate, metric) === null ? <span className="px-unknown">Unknown</span> : pct(attackValue(candidate, metric))}</td><td>{workloadLoss(candidate) === null ? <span className="px-unknown">Unknown</span> : num(workloadLoss(candidate), 4)}</td><td>{rowLoss(candidate, originalRows) === null ? <span className="px-unknown">Unknown</span> : pct(rowLoss(candidate, originalRows))}</td>
              <td><span className={`px-check-label ${status}`}>{status === 'met' ? '✓ Checks met' : status === 'conflict' ? `× ${failed || 'Returned'} conflict${failed === 1 ? '' : 's'}` : 'Unknown'}</span></td><td><span className={frontier.has(candidate.candidateId) ? 'px-frontier-label' : 'px-muted'}>{frontier.has(candidate.candidateId) ? '◆ Nondominated' : missing ? 'Incomplete' : 'Dominated'}</span></td>
              <td><input type="checkbox" checked={ws.compare.includes(candidate.candidateId)} aria-label={`Compare ${ws.labelOf(candidate.candidateId)}`} onChange={() => ws.toggleCompare(candidate.candidateId)} /></td>
            </tr>; })}
            {!visible.length ? <tr><td colSpan={7} className="px-empty-row">{candidates.length ? 'No candidates match this filter. Choose All to inspect measured conflicts.' : 'No candidate could be evaluated. Inspect the failed recipe reasons below and revise the plan.'}</td></tr> : null}
          </tbody></table>
        </div>
      </section>
      {selected ? <details className={`px-inline-inspector${ws.prefs.inspector ? '' : ' show-desktop'}`} open><summary>Selected {ws.labelOf(selected.candidateId)} · exact recipe, scope and checks</summary><ParetoInspector candidate={selected} frontier={frontier} originalRows={originalRows} inline /></details> : null}

      <section className="px-comparison" aria-labelledby="px-compare-title"><div className="px-section-head"><h2 id="px-compare-title"><GitCompareArrows size={15} />Snapshot comparison</h2><span>Up to three · selecting a fourth replaces the oldest</span></div>
        {!comparison.length ? <p className="px-muted px-section-copy">Check candidates in the table or add the selected snapshot from the inspector. Compare measured values and the exact recipe before adopting one.</p> : <div className="px-table-scroll" tabIndex={0} role="region" aria-label="Selected snapshot comparison"><table className="px-compare-table"><caption>Comparisons use each snapshot’s own frozen assumptions. Any differences in measurement scope are marked.</caption><thead><tr><th scope="col">Measurement</th>{comparison.map(candidate => <th scope="col" key={candidate.candidateId}><button type="button" aria-label={`Inspect ${ws.labelOf(candidate.candidateId)}${candidates.some(item => item.candidateId === candidate.candidateId) ? '' : ' in Workbench'}`} onClick={() => { if (candidates.some(item => item.candidateId === candidate.candidateId)) setSelectedId(candidate.candidateId); else { ws.select(candidate.candidateId); ws.setView('workbench'); } }}>{ws.labelOf(candidate.candidateId)}{candidate.candidateId === ws.active?.candidateId ? ' · current' : ''}</button><button type="button" className="px-remove" aria-label={`Remove ${ws.labelOf(candidate.candidateId)} from comparison`} onClick={() => ws.toggleCompare(candidate.candidateId)}>×</button></th>)}</tr></thead><tbody>
          <tr><th scope="row">Measurement scope</th>{comparison.map(candidate => { const scope = measurementScope(candidate, candidates[0]); return <td key={candidate.candidateId}>{scope === 'different' ? <span className="px-check-label conflict">Different frozen scope · not like-for-like</span> : scope === 'same' ? 'Same frozen scope' : <span className="px-unknown">Scope not fully returned · comparability unknown</span>}{ws.staleFor(candidate).filter(reason => reason !== 'recipe').length ? <small className="px-muted">Earlier than current controls</small> : null}</td>; })}</tr>
          {ATTACK_METRICS.map(item => <tr key={item.key}><th scope="row">{item.label}</th>{comparison.map(candidate => <td key={candidate.candidateId}>{attackValue(candidate, item.key) === null ? <span className="px-unknown">Unknown / not applicable</span> : pct(attackValue(candidate, item.key))}</td>)}</tr>)}
          <tr><th scope="row">Research-query loss</th>{comparison.map(candidate => <td key={candidate.candidateId}>{workloadLoss(candidate) === null ? 'Unknown' : num(workloadLoss(candidate), 4)}</td>)}</tr><tr><th scope="row">Row loss</th>{comparison.map(candidate => <td key={candidate.candidateId}>{rowLoss(candidate, originalRows) === null ? 'Unknown' : pct(rowLoss(candidate, originalRows))}</td>)}</tr><tr><th scope="row">Recipe</th>{comparison.map(candidate => <td key={candidate.candidateId}>{candidate.recipe.steps.map(step => `${step.method}(${step.columns.join(', ')}) ${JSON.stringify(step.params)}`).join(' → ') || 'Unmodified source'}</td>)}</tr><tr><th scope="row">Constraint conflicts</th>{comparison.map(candidate => <td key={candidate.candidateId}>{candidate.constraints.filter(check => !check.pass).map(check => check.reason).join('; ') || (candidate.constraints.length ? 'Returned checks met; no clearance' : 'No checks returned')}</td>)}</tr>
        </tbody></table></div>}
      </section>

      <details className="px-evidence-details"><summary>Field information value · single-field ablations<span>{info.filter(item => item.status === 'implemented').length} measured</span></summary><div className="px-detail-body"><p>Each evaluated ablation drops one known field from the identifier-removed baseline, holding other non-identifier fields unchanged. Reductions are baseline minus ablated risk; query-loss change is ablated minus baseline. Effects are not additive and do not establish that a research field is dispensable.</p>
        {info.length ? <div className="px-table-scroll" tabIndex={0} role="region" aria-label="Measured single-field ablations"><table className="px-info-table"><thead><tr><th scope="col">Known field</th><th scope="col">Uniqueness reduction</th><th scope="col">Inference reduction</th><th scope="col">Query-loss change</th><th scope="col">Coverage / conflicts</th></tr></thead><tbody>{info.map(item => {
          const ablated = candidates.find(candidate => candidate.recipeHash === item.recipeHash);
          const inferenceMeasured = ablated && candidates[0] && attackValue(ablated, 'sensitive_guess_advantage') !== null && attackValue(candidates[0], 'sensitive_guess_advantage') !== null;
          return <tr key={item.column}><th scope="row">{item.column}</th><td>{item.status === 'implemented' && typeof item.riskReduction?.sample_unique === 'number' ? `${signed(item.riskReduction.sample_unique * 100, 2)} pts` : 'Unknown'}</td><td>{item.status === 'implemented' && inferenceMeasured && typeof item.riskReduction?.sensitive_guess_advantage === 'number' ? `${signed(item.riskReduction.sensitive_guess_advantage * 100, 2)} pts` : 'Unknown'}</td><td>{item.status === 'implemented' && typeof item.utilityLossChange === 'number' ? signed(item.utilityLossChange, 4) : 'Unknown'}</td><td>{item.status === 'implemented' ? item.failedQueries ? item.failedQueries.length ? `Failed questions: ${item.failedQueries.join(', ')}` : 'No failed returned queries' : 'Query coverage not returned' : item.reason ?? 'Not evaluated within this budget'}</td></tr>;
        })}</tbody></table></div> : <p className="px-muted">This search response did not return field-ablation measurements. No information-value score is inferred from other candidates.</p>}
      </div></details>
      <details className="px-evidence-details"><summary>Search scope and unsuccessful recipes<span>{ws.search.failures?.length ?? 0} failed attempts</span></summary><div className="px-detail-body"><p>{ws.search.message ?? 'A bounded search is evidence about tested recipes only. No automatic release clearance.'}</p>{ws.search.evaluationCoverage ? <><p><b>Run:</b> {ws.search.evaluationCoverage.run?.join('; ') || 'Not declared'}.</p><p><b>Not run:</b> {ws.search.evaluationCoverage.skipped?.join('; ') || 'Not declared'}.</p><p>{ws.search.evaluationCoverage.retest}</p></> : null}{ws.search.failures?.length ? <ul className="px-failed-recipes">{ws.search.failures.map((failure, index) => <li key={`${index}:${failure.recipeHash}`}><b>Attempt {index + 1}</b><span>{failure.reason}</span>{failure.recipeHash ? <code>{failure.recipeHash.slice(0, 16)}…</code> : null}</li>)}</ul> : <p className="px-muted">No failed recipe attempts were returned.</p>}</div></details>
    </>}
    <footer className="px-footer">{ws.deployment.hosted ? 'Hosted demo' : ws.deployment.kind === 'remote' ? 'Remote' : 'Local'} scientific workbench · {isFictional(ws.deployment, ws.dataset) ? 'fictional demonstration records' : 'imported data'} · sample evidence cannot establish anonymity or legal compliance</footer>
  </div>;
}
