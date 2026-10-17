import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Check, CircleDashed, ClipboardCheck, Download, FileText, FileUp, Info, Link2, ShieldAlert, Sparkles, Square, User, Users, X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { isAudit, linkageOf, queryOutcome } from '../analysis';
import { useDialogs } from '../dialogs';
import { num, pct, title as spaced } from '../format';
import { describeTreatment, isWeightColumn, readTreatment, seedSteps, weightUnit } from '../recipe';
import { RoleIcon } from '../ui/RoleIcon';
import { Skeleton } from '../ui/Feedback';
import { useWorkspace } from '../workspace';
import type { Candidate, ColumnSpec, Role } from '../types';
import { byExposure, classify } from './workbench/SemanticPanel';
import type { Position } from './workbench/SemanticPanel';
import './guide.css';

/* A short path through the same engine: confirm the fields, move one slider between real evaluated options, read what it means in plain words, decide.
   Every sentence below is built from a measured value; nothing here is estimated. Everything else stays under "Advanced tools". */

const GROUPS: { roles: Role[]; label: string; note: string }[] = [
  { roles: ['direct_identifier'], label: 'Names a person directly', note: 'Removed before sharing' },
  { roles: ['quasi_identifier'], label: 'Can single someone out when combined', note: 'Age, place, dates and similar' },
  { roles: ['sensitive', 'research_target'], label: 'Private details and what you study', note: 'Kept unless you change them' },
  { roles: ['other'], label: 'Everything else', note: '' },
];
const readable = (value: string) => spaced(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
const known = (candidate: Candidate) => (candidate.threatModel?.qi ?? candidate.risk.qi ?? []).join(', ');

/* ---------- step: confirm the fields ---------- */
function Fields() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset } = ws;
  const [schema, setSchema] = useState<ColumnSpec[]>(() => (dataset?.schema ?? []).map(column => ({ ...column })));
  const [oneRow, setOneRow] = useState(dataset?.rowUnit?.oneRowPerPersonConfirmed ?? false);
  const [checked, setChecked] = useState(false);
  const [jev, setJev] = useState('');
  const asking = ws.busy.schema;
  useEffect(() => { setSchema((dataset?.schema ?? []).map(column => ({ ...column }))); setOneRow(dataset?.rowUnit?.oneRowPerPersonConfirmed ?? false); }, [dataset?.datasetId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dataset) return null;
  const meaning = new Map((dataset.semantic?.fields ?? []).map(field => [field.column, readable(field.primaryType)]));
  const sample = (name: string) => dataset.preview.slice(0, 2).map(row => String(row[name] ?? '')).join(' · ');
  const unitMissing = schema.filter(column => isWeightColumn(column) && weightUnit(column) === 'unset');
  const personKeyOk = oneRow;
  const ready = checked && personKeyOk && !unitMissing.length && !ws.busy.apply && !ws.busy.schema;

  const askJev = async () => {
    const result = await ws.inspectSemantics(true);
    const calls = result?.provider?.calls ?? 0;
    setJev(result && calls > 0 ? `Jev double-checked the field names. No row values were sent.` : `Jev isn’t connected on this server, so built-in rules sorted the fields.`);
  };
  const confirm = async () => {
    await ws.saveSchema(schema, { entityColumn: dataset.rowUnit?.entityColumn ?? null, oneRowPerPersonConfirmed: oneRow }, true);
  };

  return (
    <section className="guide-fields" aria-label="Check the fields">
      <header className="guide-title">
        <h1>Here is how we read your data</h1>
        <p>{dataset.rowCount.toLocaleString()} rows, {dataset.schema.length} fields. Check that each one is in the right group.</p>
      </header>
      <div className="guide-groups">
        {GROUPS.map(group => {
          const fields = schema.filter(column => group.roles.includes(column.role));
          if (!fields.length) return null;
          return (
            <div key={group.label} className="guide-group">
              <h2><RoleIcon role={group.roles[0]} size={15} />{group.label}<span>{group.note}</span></h2>
              <ul>
                {fields.map(column => (
                  <li key={column.name} title={sample(column.name)}>
                    <b>{column.name}</b>
                    <small>{meaning.get(column.name) ?? spaced(column.dtype)}</small>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="guide-jev">
        <p><b>Before using Jev:</b> PRISM sends only column labels, data types, units, neighboring labels and structural format names to the provider. Row values are never included in Jev requests.</p>
        <div className="guide-actions">
          <button type="button" className={`btn${asking ? ' busy' : ''}`} disabled={asking || ws.health === 'down'} onClick={() => void askJev()}><Sparkles size={15} />Ask Jev to double-check</button>
          {asking ? <button type="button" className="btn small" onClick={() => ws.cancel('schema')}><Square size={12} fill="currentColor" />Stop waiting</button> : null}
          <button type="button" className="link" onClick={() => dialogs.open('review')}>Fix a field…</button>
        </div>
        <p className="guide-status" role="status" aria-live="polite">{asking ? 'Asking Jev…' : jev}</p>
      </div>

      {unitMissing.length ? (
        <p className="guide-ask">Weight is in
          {' '}<button type="button" className="chip-btn" onClick={() => setSchema(current => current.map(c => (isWeightColumn(c) ? { ...c, unit: 'kg' } : c)))}>kilograms</button>
          {' '}<button type="button" className="chip-btn" onClick={() => setSchema(current => current.map(c => (isWeightColumn(c) ? { ...c, unit: 'lb' } : c)))}>pounds</button>
        </p>
      ) : null}
      {!dataset.rowUnit?.oneRowPerPersonConfirmed ? (
        <label className="check-row"><input type="checkbox" checked={oneRow} onChange={event => setOneRow(event.target.checked)} /><span>Each person appears in <b>exactly one row</b>.</span></label>
      ) : null}
      <label className="check-row"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /><span>I checked which fields identify a person.</span></label>
      <div className="guide-actions">
        <button type="button" className={`btn primary big${ws.busy.apply ? ' busy' : ''}`} disabled={!ready} onClick={() => void confirm()}>
          <Check size={17} />{ws.busy.apply || ws.busy.schema ? 'Measuring…' : 'Looks right, show me the risks'}
        </button>
      </div>
    </section>
  );
}

/* ---------- the people grid: one icon per hundred ---------- */
function People({ fraction }: { fraction: number | null }) {
  let lit = fraction === null ? 0 : Math.round(fraction * 100);
  if (fraction !== null && fraction > 0 && lit === 0) lit = 0;
  if (fraction !== null && fraction < 1 && lit >= 100) lit = 99;
  return (
    <div className={`people${fraction === null ? ' unknown' : ''}`} aria-hidden="true">
      {Array.from({ length: 100 }, (_, i) => <User key={i} size={15} className={i < lit ? 'lit' : ''} strokeWidth={2} />)}
    </div>
  );
}

interface Risk { id: string; tone: 'high' | 'medium' | 'low' | 'none' | 'na'; icon: ReactNode; text: ReactNode; why?: string; details?: string[] }
const toneOf = (severity: string | undefined): Risk['tone'] => (severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'low');

function risksFor(candidate: Candidate, baseline: Candidate | null): Risk[] {
  const out: Risk[] = [];
  const m = candidate.risk.metrics;
  const finding = (id: string) => candidate.risk.findings.find(f => f.attackId === id);
  const fields = known(candidate);

  const uniq = finding('sample_uniqueness');
  if (typeof m.sample_unique === 'number') {
    const rows = candidate.risk.row_count ?? candidate.rowCount;
    out.push(m.sample_unique > 0
      ? { id: 'unique', tone: toneOf(uniq?.severity), icon: <Users size={18} />, text: <><b>{pct(m.sample_unique)}</b> of people ({num(Math.round(m.sample_unique * rows), 0)} of {num(rows, 0)}) are the only one with their mix of {fields || 'known facts'}.</>, why: 'Someone who knows those facts about a person could pick out that person’s row.', details: uniq ? [uniq.narrative, ...(uniq.caveats ?? [])] : undefined }
      : { id: 'unique', tone: 'none', icon: <Users size={18} />, text: <>No one is the only one with their mix of {fields || 'known facts'}.</>, why: 'Measured on this file only.' });
  } else out.push({ id: 'unique', tone: 'na', icon: <Users size={18} />, text: <>How many people stand out was not measured.</> });

  const link = linkageOf(candidate);
  const linkFinding = link.finding;
  if (link.state === 'measured') {
    out.push({ id: 'link', tone: toneOf(linkFinding?.severity), icon: <Link2 size={18} />, text: <><b>{num(link.numerator, 0)} of {num(link.denominator, 0)}</b> people were matched back to the original using the public rule.</>, why: 'An outsider with the public rule and a list of known people could match them.', details: linkFinding ? [linkFinding.narrative, ...(linkFinding.caveats ?? [])] : undefined });
  } else {
    out.push({ id: 'link', tone: 'na', icon: <Link2 size={18} />, text: <>Matching to outside records was not tested here.</>, why: 'Not tested is not the same as safe.', details: linkFinding ? [linkFinding.narrative] : undefined });
  }

  const s = candidate.risk.sensitive?.find(item => item.status === 'implemented' && typeof item.p_guess === 'number');
  const sFinding = candidate.risk.findings.find(f => f.attackId === 'sensitive_inference' && f.severity);
  if (s && typeof s.p_guess === 'number') {
    out.push({ id: 'sensitive', tone: toneOf(sFinding?.severity), icon: <ShieldAlert size={18} />, text: <>Someone who knows those facts could guess <b>{s.column}</b> right <b>{pct(s.p_guess, 0)}</b> of the time{typeof s.baseline === 'number' ? <> ({pct(s.baseline, 0)} by plain chance)</> : null}.</>, why: 'A private detail can leak even when no one is singled out.', details: sFinding ? [sFinding.narrative, ...(sFinding.caveats ?? [])] : undefined });
  } else out.push({ id: 'sensitive', tone: 'na', icon: <ShieldAlert size={18} />, text: <>Guessing private details was not measured.</> });

  const schema = candidate.schema ?? [];
  const direct = schema.filter(c => c.role === 'direct_identifier' && candidate.columns.includes(c.name)).map(c => c.name);
  out.push(direct.length
    ? { id: 'direct', tone: 'high', icon: <AlertTriangle size={18} />, text: <>Names or IDs are still in the file: <b>{direct.join(', ')}</b>.</>, why: 'These identify a person on their own. Remove them before sharing.' }
    : { id: 'direct', tone: 'none', icon: <Check size={18} />, text: <>No names or IDs are left in the file.</>, why: 'Free text can still hide identifiers.' });

  if (typeof m.k_min === 'number' && m.k_min <= 1) out.push({ id: 'k', tone: 'high', icon: <User size={18} />, text: <>At least one person has no one else who looks like them.</>, why: 'The smallest group has 1 person.' });
  void baseline;
  const untested = (candidate.risk.semantic?.findings ?? []).filter(f => f.status !== 'implemented').length;
  if (untested) out.push({ id: 'untested', tone: 'na', icon: <CircleDashed size={18} />, text: <>{untested} kinds of risk were not tested here, such as genomic data or outside records.</>, why: 'Not tested is not the same as safe.' });
  return out;
}

const TONE_LABEL: Record<Risk['tone'], string> = { high: 'High', medium: 'Medium', low: 'Low', none: 'None found', na: 'Not tested' };

/* ---------- step: decide ---------- */
function Decide() {
  const ws = useWorkspace();
  const { dataset, active, baseline, candidates, search, busy } = ws;
  const searched = useRef<string | null>(null);
  const evaluating = busy.apply || busy.assess || busy.search;

  const pool = useMemo(() => {
    if (!dataset) return [] as Position[];
    const unique = new Map<string, Candidate>();
    [...candidates, ...(search?.candidates ?? []), ...(baseline ? [baseline] : [])].forEach(c => { if (!unique.has(c.candidateId)) unique.set(c.candidateId, c); });
    const context = { datasetId: dataset.datasetId, originalRows: dataset.rowCount, membershipKnown: ws.threat.membershipKnown, staleFor: ws.staleFor, labelOf: ws.labelOf };
    const all: Position[] = [];
    unique.forEach(c => { const r = classify(c, context); if (typeof r !== 'string') all.push(r); });
    all.sort(byExposure);
    /* Several options measure identically; keep one per distinct result so every notch visibly changes something. */
    const seen = new Set<string>();
    return all.filter(p => { const key = `${p.unique}|${p.loss}|${p.kMin}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }, [baseline, candidates, dataset, search, ws.labelOf, ws.staleFor, ws.threat.membershipKnown]);

  const key = (p: Position) => `${p.unique}|${p.loss}|${p.kMin}`;
  const activePos = active ? classify(active, { datasetId: dataset?.datasetId ?? '', originalRows: dataset?.rowCount ?? 0, membershipKnown: ws.threat.membershipKnown, staleFor: ws.staleFor, labelOf: ws.labelOf }) : null;
  const index = activePos && typeof activePos !== 'string' ? pool.findIndex(p => key(p) === key(activePos)) : -1;

  /* One search per dataset, only when there is nothing to slide between yet. */
  useEffect(() => {
    if (!dataset || !ws.reviewed || !active || search || searched.current === dataset.datasetId) return;
    if (ws.health !== 'ok' || ws.sessionLost || Object.values(busy).some(Boolean)) return;
    const stored = ws.healthInfo?.maxCandidates ?? (ws.deployment.hosted ? 40 : null);
    const remaining = stored === null ? 8 : Math.max(0, stored - ws.storedCandidateCount);
    const budget = Math.min(8, remaining, ws.healthInfo?.maxSearchCandidates ?? 8);
    if (budget < 1) return;
    searched.current = dataset.datasetId;
    void ws.runSearch(budget);
  });

  if (!dataset || !active) return <div className="guide-wait" role="status"><Skeleton lines={4} height={20} /></div>;
  const choose = (at: number) => {
    const target = pool[at]?.candidate;
    if (!target || evaluating) return;
    if (search?.candidates.some(c => c.candidateId === target.candidateId)) ws.adopt(target.candidateId); else ws.select(target.candidateId);
  };
  const fraction = typeof active.risk.metrics.sample_unique === 'number' ? active.risk.metrics.sample_unique : null;
  const risks = risksFor(active, baseline);
  const isBase = active.candidateId === baseline?.candidateId;
  const steps = seedSteps(active.recipe.steps);
  const changes = dataset.schema.map(spec => ({ spec, treatment: readTreatment(steps, spec.name) })).filter(item => item.treatment.kind !== 'keep');
  const queries = active.utility.queries;
  const direct = (active.schema ?? []).filter(c => c.role === 'direct_identifier' && active.columns.includes(c.name));
  const exportBlocked = ws.stale.length > 0 || evaluating || busy.export || ws.sessionLost || ws.health !== 'ok' || !ws.reviewed;
  const lit = fraction === null ? 0 : Math.round(fraction * 100);

  return (
    <div className="guide-decide">
      <section className="guide-left" aria-label="Protection level">
        <h2>How much do you want to protect?</h2>
        <div className="guide-slider">
          <input
            type="range" min={0} max={Math.max(0, pool.length - 1)} step={1} value={Math.max(index, 0)} disabled={pool.length < 2 || evaluating}
            aria-label="Protection level" aria-valuetext={index >= 0 ? `Option ${index + 1} of ${pool.length}` : 'Not on the scale'}
            style={{ ['--fill' as string]: pool.length > 1 && index >= 0 ? `${(index / (pool.length - 1)) * 100}%` : '0%' }}
            onChange={event => choose(Number(event.target.value))}
          />
          <div className="guide-slider-ends"><span>Keep more detail</span><span>Hide more</span></div>
        </div>
        <p className="guide-slider-note" role="status">
          {busy.search ? 'Finding more options…' : pool.length < 2 ? 'Looking for options to compare.' : index >= 0 ? `Option ${index + 1} of ${pool.length}` : 'This result is not on the slider.'}
        </p>
        <h3>What this option changes</h3>
        {isBase || !changes.length ? <p className="muted">Nothing. The file would be shared as it is.</p> : (
          <ul className="guide-changes">{changes.map(({ spec, treatment }) => <li key={spec.name}><RoleIcon role={spec.role} size={13} /><b>{spec.name}</b><span>{describeTreatment(treatment, spec)}</span></li>)}</ul>
        )}
        <button type="button" className="link" onClick={() => ws.setView('workbench')}>Fine-tune in Advanced tools <ArrowRight size={13} /></button>
      </section>

      <section className={`guide-right${ws.stale.length || evaluating ? ' is-stale' : ''}`} aria-label="What it means">
        {ws.stale.length ? (
          <p className="guide-warn" role="status"><Info size={15} aria-hidden="true" />These numbers describe an earlier setting. <button type="button" className="link" onClick={() => void ws.apply()}>Measure again</button></p>
        ) : null}
        <div className="guide-card">
          <h2>People who could be singled out</h2>
          <div className="guide-people-row">
            <People fraction={fraction} />
            <div className="guide-big"><b className="tnum">{fraction === null ? '—' : pct(fraction)}</b><span>{fraction === null ? 'not measured' : lit === 0 && fraction > 0 ? 'fewer than 1 in 100' : `about ${lit} in 100`}</span></div>
          </div>
          <p className="muted small">In this file only. It is not the chance that someone gets re-identified in the real world.</p>
        </div>

        <div className="guide-card">
          <h2>What could go wrong</h2>
          <ul className="guide-risks">
            {risks.map(risk => (
              <li key={risk.id} className={`tone-${risk.tone}`}>
                <span className="guide-risk-icon" aria-hidden="true">{risk.icon}</span>
                <div>
                  <p>{risk.text}</p>
                  {risk.why ? <small>{risk.why}</small> : null}
                  {risk.details?.length ? <details><summary>Details</summary>{risk.details.map((line, i) => <p key={i}>{line}</p>)}</details> : null}
                </div>
                <span className="guide-tone">{TONE_LABEL[risk.tone]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="guide-card">
          <h2>What your research can still answer</h2>
          {queries.length ? (
            <ul className="guide-queries">
              {queries.map(query => {
                const outcome = queryOutcome(query);
                return (
                  <li key={query.id} className={`o-${outcome}`}>
                    <span aria-hidden="true">{outcome === 'within' ? <Check size={16} /> : outcome === 'outside' ? <X size={16} /> : <CircleDashed size={16} />}</span>
                    <b>{query.label}</b>
                    <small>{outcome === 'within' ? 'Still answers' : outcome === 'outside' ? 'No longer reliable' : 'Can’t tell'}</small>
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted">No research questions are set. Add some in Advanced tools to see what this option costs your science.</p>}
        </div>

        <footer className="guide-decision">
          <p className="guide-gate"><ShieldAlert size={15} aria-hidden="true" />Not cleared for release. These numbers describe this file only. You decide.</p>
          <div className="guide-actions">
            <button type="button" className="btn primary" disabled={exportBlocked} onClick={() => void ws.exportCandidate(active.candidateId, 'html')}><FileText size={15} />Save report</button>
            <button type="button" className="btn" disabled={isBase || direct.length > 0 || exportBlocked} title={isBase ? 'Pick a protected option first' : direct.length ? `Remove ${direct.map(c => c.name).join(', ')} first` : undefined} onClick={() => ws.setView('report')}><Download size={15} />Download protected data…</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

/* ---------- the screen ---------- */
export default function Guide() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset, reviewed, active, deployment } = ws;
  const loading = ws.busy.boot;
  const showDecide = Boolean(dataset && reviewed && active && !isAudit(active) || dataset && reviewed && active);

  return (
    <div className="guide-view">
      <h1 className="sr-only">Guided privacy review</h1>
      {!dataset ? (
        <section className="guide-start">
          <h2>{loading ? 'Loading fictional data…' : 'Check a dataset for privacy risks'}</h2>
          <p>{deployment.uploadsAllowed ? 'Upload a CSV. Everything is read only by the service on this computer.' : 'Pick a fictional dataset to try it. Every record is invented.'}</p>
          {!loading ? (
            <div className="guide-actions">
              {deployment.uploadsAllowed ? <button type="button" className="btn primary big" onClick={() => dialogs.open('import')}><FileUp size={17} />Upload a CSV</button> : null}
              <button type="button" className={`btn${deployment.uploadsAllowed ? '' : ' primary big'}`} onClick={() => void ws.loadDemo('architecture')}><ClipboardCheck size={15} />Try the fictional cancer study</button>
            </div>
          ) : <Skeleton lines={2} height={18} />}
        </section>
      ) : showDecide ? <Decide /> : <Fields />}
    </div>
  );
}
