import { ClipboardCheck, Info, Play, ShieldAlert } from 'lucide-react';
import { isAudit } from '../../analysis';
import { plural } from '../../format';
import { useDialogs } from '../../dialogs';
import { BorderBeam } from '../../ui/magic/BorderBeam';
import { useWorkspace } from '../../workspace';
import { Journey } from './Journey';
import { measuresFor } from './Ledger';
import { MeasureTiles } from './MeasureTiles';
import { Refraction } from './Refraction';
import { ProtectionPreference } from './SemanticPanel';
import './hero.css';

/* The first thing on the Workbench: where you are, what the evaluated snapshot measured, and the control that moves between snapshots.
   Everything shown is read from the workspace; the full measurement table stays in the ledger below. */
export function Hero({ recipeEdited }: { recipeEdited: boolean }) {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { active, baseline, baselineUsable, dataset, reviewed, busy } = ws;
  const evaluating = busy.apply || busy.assess || busy.search;
  if (!dataset) return null;

  const membershipKnown = (active?.threatContext ?? active?.risk.threat_context)?.membershipKnown ?? null;
  const base = baselineUsable ? baseline : null;
  const measures = active ? measuresFor(active, base, dataset.rowCount, membershipKnown) : [];
  const metric = (id: string) => measures.find(measure => measure.id === id);
  const values = {
    before: base && typeof base.risk.metrics.sample_unique === 'number' ? base.risk.metrics.sample_unique : null,
    after: metric('sample_unique')?.to ?? null,
    loss: metric('loss')?.to ?? null,
  };
  /* An unavailable figure keeps its stated reason in plain sight, exactly as the ledger table words it. */
  const reasons = [
    values.after === null && active ? `Rows unique on known fields: ${metric('sample_unique')?.naText ?? 'not measured'}` : null,
    values.loss === null && active ? `Research-query loss: ${metric('loss')?.naText ?? 'unavailable'}` : null,
    values.before === null && active ? 'Unprotected baseline unavailable, so nothing can be compared with it' : null,
  ].filter((reason): reason is string => reason !== null);

  return (
    <section className="hero dot-field" aria-label="Measured summary">
      <BorderBeam active={evaluating} />
      <Journey recipeEdited={recipeEdited} />
      {active ? (
        <div className="hero-body">
          <Refraction values={values} label={ws.labelOf(active.candidateId)} external={isAudit(active)} reasons={reasons} />
          <MeasureTiles measures={measures} />
        </div>
      ) : null}
      {active ? (
        <div className="hero-flags">
          {active.risk.assessment === 'mixed' ? (
            <button type="button" className="flag-chip" onClick={() => ws.setPrefs({ ledger: true })}><ShieldAlert size={14} aria-hidden="true" />Mixed result: at least one finding is high severity</button>
          ) : null}
          {active.risk.limitations?.length ? (
            <button type="button" className="flag-chip soft" onClick={() => ws.setPrefs({ ledger: true })}><Info size={14} aria-hidden="true" />{plural(active.risk.limitations.length, 'stated limitation')}</button>
          ) : null}
          <span className="hero-note">Unique rows stand out in this table. Confirmed matches link them back to the source.</span>
        </div>
      ) : null}
      {!active ? (
        <div className="hero-body idle">
          <Refraction values={{ before: null, after: null, loss: null }} idle />
          <div className="hero-idle">
            <h2>{reviewed ? 'Measure the recipe' : 'Review the fields to begin'}</h2>
            <p>{reviewed ? 'Apply the recipe to see what it removes and what stays exposed.' : 'Confirm which columns identify a person. The first candidate is created for you.'}</p>
            {reviewed
              ? <button type="button" className="btn primary" disabled={busy.apply} onClick={() => void ws.apply()}><Play size={14} fill="currentColor" />Apply and evaluate</button>
              : <button type="button" className="btn primary" onClick={() => dialogs.open('review')}><ClipboardCheck size={15} />Review classifications</button>}
            {!reviewed ? (
              <details className="hero-why">
                <summary>What gets reviewed?</summary>
                <p>PRISM suggests which columns identify a person, which are sensitive and which you analyse, and asks whether each person appears in one row. Confirm them once and the first candidate is created automatically.</p>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
      <ProtectionPreference />
    </section>
  );
}
