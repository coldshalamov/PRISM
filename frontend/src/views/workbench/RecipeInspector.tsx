import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Play, Square } from 'lucide-react';
import type { CSSProperties } from 'react';
import { isAudit, linkageOf } from '../../analysis';
import { useDialogs } from '../../dialogs';
import { ago, num, pct, title } from '../../format';
import {
  DATE_PRECISIONS, customStepsFor, describeTreatment, droppedColumns, getSuppression, isWeightColumn,
  kindOptions, kindRange, readTreatment, recipeLabel, setSuppression, setTreatment, weightNeedsUnit,
} from '../../recipe';
import type { QuickKind } from '../../recipe';
import { scenarioById, scenarios } from '../../scenarios';
import { candidateThreat, threatSentence } from '../../threat';
import { Notice } from '../../ui/Feedback';
import { RoleIcon } from '../../ui/RoleIcon';
import { Tabs, panelProps } from '../../ui/Tabs';
import { Term } from '../../ui/Tip';
import { useWorkspace } from '../../workspace';
import type { ColumnSpec, Role } from '../../types';
import { MethodComposer } from './MethodComposer';
import { ThreatPanel } from './ThreatPanel';

type InspectorTab = 'fields' | 'threat' | 'steps' | 'candidate';

const GROUPS: { roles: Role[]; label: string; note: string }[] = [
  { roles: ['direct_identifier'], label: 'Direct identifiers', note: 'Name a person on their own.' },
  { roles: ['quasi_identifier'], label: 'Quasi-identifiers', note: 'Identify in combination. Exact values stay exposed.' },
  { roles: ['sensitive', 'research_target'], label: 'Sensitive and research targets', note: 'Kept unchanged unless you change them on purpose.' },
  { roles: ['other'], label: 'Other fields', note: '' },
];

function FieldRow({ spec }: { spec: ColumnSpec }) {
  const { steps, setSteps } = useWorkspace();
  const treatment = readTreatment(steps, spec.name);
  const options = kindOptions(spec);
  const blockedUnit = weightNeedsUnit(spec);
  const custom = customStepsFor(steps, spec.name);
  const kind = treatment.kind === 'custom' ? 'keep' : treatment.kind;
  const range = treatment.kind !== 'keep' && treatment.kind !== 'custom' && treatment.kind !== 'drop' && treatment.kind !== 'mask' ? kindRange(treatment.kind, spec) : null;
  const exposed = spec.role === 'quasi_identifier' && treatment.kind === 'keep';
  const change = (next: QuickKind, value?: number | string) => setSteps(setTreatment(steps, spec, next, value));
  const value = Number(treatment.value ?? range?.default ?? 0);
  const fill = range ? `${((value - range.min) / (range.max - range.min)) * 100}%` : '0%';

  return (
    <li className={`field-row${exposed ? ' exposed' : ''}`}>
      <div className="field-line">
        <RoleIcon role={spec.role} size={13} reserve />
        <span className="field-title">
          <b title={spec.name}>{spec.name}</b>
          <small className={exposed ? 'risk-text' : ''}>
            {exposed ? <AlertTriangle size={11} aria-hidden="true" /> : null}
            {describeTreatment(treatment, spec)}{custom.length ? ` + ${custom.map(s => s.method.replaceAll('_', ' ')).join(', ')}` : ''}
          </small>
        </span>
        <select aria-label={`Treatment for ${spec.name}`} value={kind} onChange={event => change(event.target.value as QuickKind)}>
          {options.map(option => <option key={option.kind} value={option.kind} disabled={blockedUnit && option.kind === 'band'}>{option.label}</option>)}
        </select>
      </div>
      {blockedUnit ? <p className="field-hint risk-text">Choose kg or lb in Review classifications before banding weight.</p> : null}
      {range ? (
        <div className="field-param">
          <input
            type="range" aria-label={`${spec.name} ${range.unit}`} min={range.min} max={range.max} step={range.step}
            style={{ '--fill': fill } as CSSProperties}
            value={value} onChange={event => change(treatment.kind as QuickKind, Number(event.target.value))}
          />
          <output>{value} <small>{range.unit}</small></output>
        </div>
      ) : null}
      {treatment.kind === 'date_generalize' ? (
        <div className="field-param">
          <div className="seg" role="radiogroup" aria-label={`${spec.name} precision`}>
            {DATE_PRECISIONS.map(precision => (
              <button key={precision} type="button" role="radio" aria-checked={treatment.value === precision} className={treatment.value === precision ? 'active' : ''} onClick={() => change('date_generalize', precision)}>{title(precision)}</button>
            ))}
          </div>
        </div>
      ) : null}
      {treatment.kind === 'band' && isWeightColumn(spec) && spec.unit && spec.unit.toLowerCase().startsWith('lb') ? <p className="field-hint">Pounds are converted to kilograms before banding.</p> : null}
      {treatment.kind === 'centered_interval' ? <p className="field-hint risk-text">The midpoint reveals the exact original. Use fixed bands to reduce precision.</p> : null}
      {treatment.kind === 'zip_prefix' ? <p className="field-hint">Three digits do not establish HIPAA Safe Harbor.</p> : null}
    </li>
  );
}

function CandidateTab() {
  const ws = useWorkspace();
  const { active, dataset } = ws;
  if (!active || !dataset) return <p className="muted pad">Create a candidate to inspect its constraints and frozen assumptions.</p>;
  const passed = active.constraints.filter(c => c.pass).length;
  const frozen = candidateThreat(active, ws.threat);
  const link = linkageOf(active);
  return (
    <div className="candidate-tab">
      <dl className="facts compact">
        <div><dt>Snapshot</dt><dd>{ws.labelOf(active.candidateId)} · {recipeLabel(active.recipe.steps)}</dd></div>
        <div><dt>Evaluated</dt><dd>{ago(active.createdAt)} · {num(active.rowCount, 0)} rows · {active.columns.length} columns</dd></div>
        <div>
          <dt>Pairing <Term id={active.alignment === 'verified' ? 'paired' : 'unpaired'} label="pairing" /></dt>
          <dd>{active.alignment === 'verified' ? 'Verified: row differences are shown' : 'Unknown: only aggregate differences are shown'}</dd>
        </div>
        <div><dt>Seed</dt><dd>{active.recipe.seed ?? '—'} (non-DP, same snapshot every render)</dd></div>
        <div><dt>Exact linkage</dt><dd>{link.state === 'measured' ? `${num(link.numerator, 0)} of ${num(link.denominator, 0)} verified unique correct matches` : link.state === 'absent' ? 'Not returned by this service' : 'Not applicable or not assessed; this is not zero risk'}</dd></div>
      </dl>
      <h4 className="inspector-sub">Frozen attacker assumptions</h4>
      <p className="threat-sentence small">{threatSentence({ known: frozen.known, secret: frozen.secret, membershipKnown: frozen.membershipKnown, unit: frozen.unit, publicRule: !isAudit(active) })}</p>
      <h4 className="inspector-sub">Constraints <span>{passed} of {active.constraints.length} met</span></h4>
      <ul className="constraints">
        {active.constraints.map(check => (
          <li key={check.id} className={check.pass ? 'pass' : 'fail'}>
            <span className="status-mark" aria-hidden="true">{check.pass ? '✓' : '✕'}</span>
            <span><b>{check.id.replace('query:', 'Question: ').replaceAll('-', ' ')}</b><small>{check.reason}</small></span>
            <span className="sr-only">{check.pass ? 'met' : 'not met'}</span>
          </li>
        ))}
      </ul>
      {!active.constraints.length ? <p className="muted small">No constraints were evaluated for this candidate; run the search to test limits.</p> : null}
      {active.explanation ? <p className="candidate-explain">{active.explanation}</p> : null}
      <details className="recipe-json">
        <summary>Frozen recipe (no keys, no rows)</summary>
        <pre>{JSON.stringify(active.recipe, null, 2)}</pre>
      </details>
    </div>
  );
}

export function RecipeInspector() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset, steps, reviewed, busy, scenarioId, setScenarioId, threat, stale } = ws;
  const [tab, setTab] = useState<InspectorTab>('fields');
  const scenario = scenarioById(scenarioId);
  const dropped = useMemo(() => droppedColumns(steps), [steps]);
  const suppression = getSuppression(steps);

  if (!dataset) return <div className="inspector-pad"><p className="muted">Load a dataset to build a protection recipe.</p></div>;
  const exposedQi = dataset.schema.filter(c => c.role === 'quasi_identifier' && !dropped.has(c.name) && readTreatment(steps, c.name).kind === 'keep');
  const pending = busy.apply;

  return (
    <div className="inspector-body">
      <header className="inspector-head">
        <h2>Protection recipe</h2>
      </header>
      <Tabs<InspectorTab>
        idPrefix="inspector"
        variant="underline"
        label="Inspector sections"
        value={tab}
        onChange={setTab}
        items={[{ id: 'fields', label: 'Fields' }, { id: 'threat', label: 'Threat' }, { id: 'steps', label: 'Steps', badge: steps.length }, { id: 'candidate', label: 'Candidate' }]}
      />
      <div className="inspector-scroll" {...panelProps('inspector', tab)}>
        {tab === 'fields' ? (
          <>
            <section className="insp-section">
              <label className="field-label" htmlFor="scenario">Release scenario <Term id="scenario" label="release scenario" /></label>
              <select id="scenario" value={scenarioId} onChange={event => setScenarioId(event.target.value)}>
                {scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <p className="muted small">{scenario.context}</p>
              {scenario.evaluated ? (
                <p className="limits">k ≥ {scenario.limits.minK} · unique ≤ {pct(scenario.limits.maxUnique, 0)} · suppressed ≤ {pct(scenario.limits.maxSuppression, 0)} · loss ≤ {num(scenario.limits.maxLoss, 2)}<small>Editable planning defaults for search; not standards.</small></p>
              ) : <Notice tone="warn">PRISM evaluates row releases. Aggregate-only evaluation is not implemented; use the Attack Lab to see why it is not automatically private.</Notice>}
            </section>

            {!reviewed ? (
              <Notice tone="warn" title="Classifications not reviewed.">
                <button type="button" className="btn full" onClick={() => dialogs.open('review')}><ClipboardCheck size={15} />Review classifications</button>
              </Notice>
            ) : null}

            {reviewed && exposedQi.length ? (
              <p className="exposed-note"><AlertTriangle size={14} aria-hidden="true" />{exposedQi.map(c => c.name).join(', ')} {exposedQi.length === 1 ? 'is' : 'are'} still exact quasi-identifier{exposedQi.length === 1 ? '' : 's'}.</p>
            ) : null}

            {GROUPS.map(group => {
              const fields = dataset.schema.filter(c => group.roles.includes(c.role));
              if (!fields.length) return null;
              return (
                <section key={group.label} className="insp-section">
                  <h3 className="inspector-sub">{group.label}<span>{fields.length}</span></h3>
                  {group.note ? <p className="muted small">{group.note}</p> : null}
                  <ul className="field-list">{fields.map(spec => <FieldRow key={spec.name} spec={spec} />)}</ul>
                </section>
              );
            })}

            <section className="insp-section">
              <h3 className="inspector-sub">Small-group suppression</h3>
              <label className="switch-row">
                <span><b>Suppress groups smaller than k</b><small>Bounded k-enforcement on the known fields that remain. Biases small subgroups.</small></span>
                <button type="button" role="switch" aria-checked={Boolean(suppression)} aria-label="Suppress groups smaller than k" className="switch" onClick={() => ws.setSteps(setSuppression(steps, threat.known, !suppression))}><span /></button>
              </label>
              {suppression ? (
                <div className="field-param two">
                  <label>k<input type="number" min={2} max={100} value={Number(suppression.params.k ?? 5)} onChange={event => ws.setSteps(setSuppression(steps, threat.known, true, Math.max(2, Math.round(Number(event.target.value) || 2)), Number(suppression.params.max_fraction ?? 0.05)))} /></label>
                  <label>Cap<input type="number" min={0.01} max={1} step={0.01} value={Number(suppression.params.max_fraction ?? 0.05)} onChange={event => ws.setSteps(setSuppression(steps, threat.known, true, Number(suppression.params.k ?? 5), Math.min(1, Math.max(0.01, Number(event.target.value) || 0.05))))} /></label>
                </div>
              ) : null}
            </section>
          </>
        ) : tab === 'threat' ? <ThreatPanel /> : tab === 'steps' ? <MethodComposer /> : <CandidateTab />}
      </div>
      <footer className="inspector-foot">
        {stale.includes('recipe') && !pending ? <p className="pending">Recipe changed since the shown candidate.</p> : null}
        {pending ? (
          <button type="button" className="btn full" onClick={() => ws.cancel('apply')}><Square size={13} fill="currentColor" />Stop waiting</button>
        ) : (
          <button type="button" className="btn primary full apply" disabled={!reviewed} onClick={() => void ws.apply()}>
            <Play size={15} fill="currentColor" />Apply and evaluate
            <kbd>Ctrl ↵</kbd>
          </button>
        )}
        {pending ? <p className="muted small">Evaluating on the full dataset. The previous snapshot stays unchanged.</p> : null}
        {!reviewed ? <p className="muted small">Review classifications first.</p> : null}
      </footer>
    </div>
  );
}
