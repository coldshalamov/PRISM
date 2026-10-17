import { ArrowUpRight, Check, GitCompareArrows, Minus, X } from 'lucide-react';
import { candidateThreat, threatSentence } from '../../threat';
import { num, pct, title } from '../../format';
import { useWorkspace } from '../../workspace';
import type { Candidate } from '../../types';
import { attackValue, feasibility, measuredVector, rowLoss, workloadLoss } from './model';

export function ParetoInspector({ candidate, frontier, originalRows, inline = false }: { candidate: Candidate | null; frontier: Set<string>; originalRows: number; inline?: boolean }) {
  const ws = useWorkspace();
  if (!candidate) return <div className="px-inspector-empty"><h2>Candidate details</h2><p>Select a measured point or a table row to inspect its exact recipe, assumptions and constraint conflicts.</p></div>;
  const label = ws.labelOf(candidate.candidateId);
  const threat = candidateThreat(candidate, ws.threat);
  const failed = candidate.constraints.filter(check => !check.pass);
  const checks = feasibility(candidate);
  const stale = ws.staleFor(candidate).filter(reason => reason !== 'recipe');
  const useCandidate = () => {
    if (ws.search?.candidates.some(item => item.candidateId === candidate.candidateId)) ws.adopt(candidate.candidateId);
    else ws.select(candidate.candidateId);
  };
  const compareActive = () => {
    if (ws.active && !ws.compare.includes(ws.active.candidateId)) ws.toggleCompare(ws.active.candidateId);
    if (!ws.compare.includes(candidate.candidateId)) ws.toggleCompare(candidate.candidateId);
  };
  const body = <>
    <div className="px-inspector-title"><span className="px-candidate-tile">{label}</span><div><h2>{label} · measured snapshot</h2><p>{num(candidate.rowCount, 0)} rows · {candidate.recipe.steps.length} steps</p></div></div>
    {stale.length ? <p className="px-inline-warn">Frozen evidence differs from current {stale.join(', ')}. Re-run search before comparing under the new controls.</p> : null}
    <div className="px-inspector-verdict"><b>{frontier.has(candidate.candidateId) ? 'Nondominated in this measured set' : measuredVector(candidate, originalRows) ? 'Dominated in this measured set' : 'Frontier unknown · incomplete objectives'}</b><span>{checks === 'conflict' ? `${failed.length || 'Returned'} hard constraint conflict${failed.length === 1 ? '' : 's'}` : checks === 'met' ? 'Returned hard checks met' : 'Hard checks unavailable'}. No release clearance.</span></div>
    <dl className="px-measurements">
      <div><dt>Sample uniqueness</dt><dd>{pct(attackValue(candidate, 'sample_unique'))}</dd></div>
      <div><dt>Inference advantage</dt><dd>{attackValue(candidate, 'sensitive_guess_advantage') === null ? 'Unknown' : pct(attackValue(candidate, 'sensitive_guess_advantage'))}</dd></div>
      <div><dt>Research-query loss</dt><dd>{workloadLoss(candidate) === null ? 'Unknown' : num(workloadLoss(candidate), 4)}</dd></div>
      <div><dt>Rows lost</dt><dd>{rowLoss(candidate, originalRows) === null ? 'Unknown' : pct(rowLoss(candidate, originalRows))}</dd></div>
      <div><dt>Minimum sample k</dt><dd>{num(candidate.risk.metrics.k_min, 0)}</dd></div>
      <div><dt>Verified exact linkage</dt><dd>{attackValue(candidate, 'verified_linkage_rate') === null ? 'Not measured / not applicable' : pct(attackValue(candidate, 'verified_linkage_rate'))}</dd></div>
    </dl>
    <section className="px-inspector-section"><h3>Exact transformation recipe</h3>
      <p className="px-muted">Executed in this order · seed {candidate.recipe.seed} · v{candidate.recipe.version} · {title(candidate.recipe.releaseMode)}. Deterministic seed is not a differential privacy guarantee.</p>
      {candidate.recipe.steps.length ? <ol className="px-recipe">{candidate.recipe.steps.map((step, index) => <li key={`${index}:${step.method}`}><b>{title(step.method)}</b><span>{step.columns.length ? step.columns.join(', ') : 'Row-level operation'}</span><dl>{Object.entries(step.params).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'string' ? value : JSON.stringify(value)}</dd></div>)}</dl></li>)}</ol> : <p className="px-inline-warn">Unmodified source. No transformation steps were applied.</p>}
    </section>
    <section className="px-inspector-section"><h3>Hard constraints · {candidate.constraints.length - failed.length}/{candidate.constraints.length} met</h3>
      {candidate.constraints.length ? <ul className="px-checks">{[...failed, ...candidate.constraints.filter(check => check.pass)].map(check => <li key={check.id} className={check.pass ? '' : 'fail'}><span aria-hidden="true">{check.pass ? <Check size={13} /> : <X size={13} />}</span><div><b>{title(check.id.replace('query:', 'Question: ').replaceAll('-', ' '))}</b><span>{check.reason}</span></div></li>)}</ul> : <p className="px-muted">The service returned no constraint checks.</p>}
    </section>
    <section className="px-inspector-section"><h3>Frozen measurement scope</h3><p>{threatSentence({ ...threat, publicRule: !candidate.auditMode })}</p><p className="px-muted">Sample measurements are conditional on these assumptions. External auxiliary sources, future releases and population validation are not covered.</p>
      {candidate.utility.loss_definition ? <p className="px-muted">Loss: {candidate.utility.loss_definition}</p> : null}
      {candidate.utility.warnings?.length ? <ul className="px-warnings">{candidate.utility.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
      {candidate.explanation ? <p className="px-muted">{candidate.explanation}</p> : null}
      <details><summary>Snapshot identity</summary><dl className="px-measurements"><div><dt>Candidate ID</dt><dd>{candidate.candidateId}</dd></div><div><dt>Created</dt><dd>{candidate.createdAt}</dd></div>{candidate.recipeHash ? <div><dt>Recipe hash</dt><dd>{candidate.recipeHash}</dd></div> : null}</dl></details>
    </section>
  </>;
  const actions = <div className="px-inspector-actions">
    <button type="button" className="btn primary" disabled={ws.sessionLost || Boolean(stale.length)} onClick={() => { useCandidate(); ws.setView('workbench'); }}>Use in Workbench<ArrowUpRight size={14} /></button>
    <button type="button" className="btn" aria-pressed={ws.compare.includes(candidate.candidateId)} onClick={() => ws.toggleCompare(candidate.candidateId)}>{ws.compare.includes(candidate.candidateId) ? <Minus size={14} /> : <GitCompareArrows size={14} />}{ws.compare.includes(candidate.candidateId) ? 'Remove comparison' : 'Add to comparison'}</button>
    {ws.active && ws.active.candidateId !== candidate.candidateId ? <button type="button" className="px-text-action" onClick={compareActive}>Compare with current {ws.labelOf(ws.active.candidateId)}</button> : null}
    <button type="button" className="px-text-action" disabled={ws.sessionLost} onClick={() => { useCandidate(); ws.setView('report'); }}>Open this snapshot’s report<ArrowUpRight size={12} /></button>
  </div>;
  return inline ? <div className="px-inline-details">{body}{actions}</div> : <div className="inspector-body px-inspector"><div className="inspector-scroll">{body}</div><div className="inspector-foot">{actions}</div></div>;
}
