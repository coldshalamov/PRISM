import { ClipboardCheck, Check, GitCompareArrows, Gauge, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { isAudit, STALE_LABEL } from '../../analysis';
import { useDialogs } from '../../dialogs';
import { num, plural } from '../../format';
import { recipeLabel } from '../../recipe';
import { useMedia } from '../../hooks';
import { useWorkspace } from '../../workspace';

type StepState = 'done' | 'current' | 'todo' | 'stale' | 'running' | 'na';
interface Step { id: string; label: string; sub: string; state: StepState; icon: ReactNode; disabled?: boolean; onClick?: () => void; hint?: string }

/* Where the person is in the workflow, read from existing workspace state. It never claims an outcome: the last step
   counts what was tried and never shows a completion mark, because nothing in PRISM clears a release. */
export function Journey({ recipeEdited }: { recipeEdited: boolean }) {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const docked = useMedia('(min-width: 1000px)');
  const { active, reviewed, busy, stale, search, dataset, sessionLost } = ws;
  const evaluating = busy.apply || busy.assess;
  const audit = isAudit(active);
  const stalled = stale.length > 0;

  const current = !reviewed ? 0 : recipeEdited && !audit ? 1 : !active || stalled ? 2 : 3;
  const label = active ? ws.labelOf(active.candidateId) : '';

  const steps: Step[] = [
    {
      id: 'fields', label: 'Fields', icon: reviewed ? <Check size={16} strokeWidth={2.6} /> : <ClipboardCheck size={16} />,
      state: reviewed ? 'done' : 'current', sub: reviewed ? 'Reviewed' : 'Needs review',
      onClick: () => dialogs.open('review'), hint: 'Review classifications',
    },
    {
      id: 'recipe', label: 'Recipe', icon: <SlidersHorizontal size={16} />,
      state: audit ? 'na' : !reviewed ? 'todo' : recipeEdited ? 'current' : active ? 'done' : 'todo',
      sub: audit ? 'External file' : !reviewed ? 'After review' : recipeEdited ? 'Edited, not applied' : active ? `${label} · ${recipeLabel(active.recipe.steps)}` : 'Ready to apply',
      onClick: docked && !audit ? () => ws.setPrefs({ inspector: true }) : undefined, hint: 'Open recipe controls',
    },
    {
      id: 'measure', label: 'Measure', icon: <Gauge size={16} />,
      state: evaluating ? 'running' : !reviewed ? 'todo' : stalled ? 'stale' : active ? 'done' : 'current',
      sub: evaluating ? 'Evaluating' : !reviewed ? 'Not measured' : stalled ? `Stale · ${stale.map(reason => STALE_LABEL[reason]).join(', ')}` : active && dataset ? `${num(active.rowCount, 0)} rows` : 'Not measured',
      /* Re-running an unchanged, current recipe would store a duplicate candidate, so the step only acts when a measurement is missing,
         stale or edited, and it takes the same action the stale banner offers (evaluate the recipe, or re-evaluate this snapshot). */
      disabled: !reviewed || evaluating || sessionLost,
      onClick: !active || stalled || recipeEdited
        ? () => void (audit || (stalled && !stale.includes('recipe') && !stale.includes('classifications')) ? ws.assess() : ws.apply())
        : undefined,
      hint: !active ? 'Apply and evaluate' : audit || (stalled && !stale.includes('recipe') && !stale.includes('classifications')) ? 'Re-evaluate this snapshot' : 'Evaluate the current recipe',
    },
    {
      id: 'compare', label: 'Compare', icon: <GitCompareArrows size={16} />,
      state: current === 3 ? 'current' : 'todo', sub: search ? `${plural(search.evaluated, 'recipe')} tried` : 'Not run',
      disabled: !reviewed, onClick: () => ws.setView('pareto'), hint: 'Open the candidate explorer',
    },
  ];

  return (
    <nav className="journey" aria-label="Workflow progress">
      <ol>
        {steps.map((step, index) => {
          const body = (
            <>
              <span className="journey-icon" aria-hidden="true">{step.icon}</span>
              <span className="journey-text"><b>{step.label}</b><small>{step.sub}</small></span>
            </>
          );
          const cls = `journey-step s-${step.state}${index === current ? ' is-current' : ''}`;
          return (
            <li key={step.id} className={cls}>
              {step.onClick ? (
                <button type="button" className="journey-btn" disabled={step.disabled} title={step.hint} aria-current={index === current ? 'step' : undefined} onClick={step.onClick}>{body}</button>
              ) : (
                <span className="journey-btn static" aria-current={index === current ? 'step' : undefined}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
