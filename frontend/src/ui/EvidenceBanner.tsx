import { History, RefreshCw, Square } from 'lucide-react';
import { isAudit, STALE_LABEL } from '../analysis';
import { useDialogs } from '../dialogs';
import { diffSteps, normalizeSteps } from '../recipe';
import { useWorkspace } from '../workspace';

/* Shown whenever the controls on screen no longer match the frozen snapshot whose numbers are displayed.
   It names what drifted and offers the one action that produces matching evidence. While a request is
   running it says so, and the old snapshot stays visible, dimmed, until the answer is the latest one. */
export function EvidenceBanner({ compact = false }: { compact?: boolean }) {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { active, stale, steps, dataset, threat, busy } = ws;
  const label = active ? ws.labelOf(active.candidateId) : '';
  const evaluating = busy.apply || busy.assess;
  if (!active || !dataset) return null;

  if (evaluating) {
    return (
      <div className="evidence-banner pending" role="status">
        <RefreshCw size={15} className="spin" aria-hidden="true" />
        <span><b>Evaluating on the full dataset…</b> {label}’s numbers below are the previous snapshot and are not the answer to your latest controls.</span>
        <button type="button" className="btn small" onClick={() => ws.cancel(busy.apply ? 'apply' : 'assess')}><Square size={12} fill="currentColor" />Stop waiting</button>
      </div>
    );
  }
  if (!stale.length) return null;

  const diffs = stale.includes('recipe') ? diffSteps(active.recipe.steps, normalizeSteps(steps, threat.known), dataset.schema) : [];
  const audit = isAudit(active);
  const needsApply = !audit && (stale.includes('recipe') || stale.includes('classifications'));
  return (
    <div className="evidence-banner stale" role="status">
      <History size={15} aria-hidden="true" />
      <div>
        <b>These numbers are stale.</b>{' '}
        They describe the frozen snapshot {label}. Current {stale.map(reason => STALE_LABEL[reason]).join(' and ')} differ{stale.length === 1 ? 's' : ''}. Export is unavailable until an evaluation matches.
        {!compact && diffs.length ? <ul>{diffs.slice(0, 5).map(line => <li key={line}>{line}</li>)}{diffs.length > 5 ? <li>and {diffs.length - 5} more</li> : null}</ul> : null}
      </div>
      <span className="evidence-actions">
        {needsApply ? (
          <button type="button" className="btn small primary" disabled={!ws.reviewed} onClick={() => void ws.apply()}>Evaluate current recipe</button>
        ) : audit && stale.includes('classifications') ? (
          <button type="button" className="btn small" onClick={() => dialogs.open('audit')}>Re-run the audit</button>
        ) : (
          <button type="button" className="btn small primary" onClick={() => void ws.assess()}>Re-evaluate this snapshot</button>
        )}
        {stale.includes('recipe') ? <button type="button" className="btn small" onClick={() => ws.select(active.candidateId)}>Restore {label}’s recipe</button> : null}
      </span>
    </div>
  );
}
