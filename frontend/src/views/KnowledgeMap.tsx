import { useState } from 'react';
import { ArrowRight, ClipboardCheck, Eye, Grid2X2, Play, RefreshCw } from 'lucide-react';
import { useDialogs } from '../dialogs';
import { num, pct } from '../format';
import { candidateThreat, threatSentence } from '../threat';
import { EvidenceBanner } from '../ui/EvidenceBanner';
import { Empty, Notice, Skeleton } from '../ui/Feedback';
import { InspectorSlot, ToolbarSlot } from '../ui/Slots';
import { Tabs } from '../ui/Tabs';
import { Term } from '../ui/Tip';
import { useWorkspace } from '../workspace';
import { ThreatPanel } from './workbench/ThreatPanel';
import { ExposureSurface, KnowledgeHistogram } from './map/ExposureSurface';
import './map/knowledge-map.css';

export default function KnowledgeMap() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const [inspector, setInspector] = useState<'attacker' | 'reading'>('attacker');
  const { active, dataset, busy } = ws;
  const pending = busy.apply || busy.assess;
  const frozen = active ? candidateThreat(active, ws.threat) : null;
  const exposure = active?.risk.exposure;
  const coverage = exposure?.coverage;
  const measured = active?.risk.qi;
  const removed = active?.risk.removed_qi ?? (frozen?.known.filter(name => !active?.columns.includes(name)) ?? []);
  const rows = active?.risk.row_count ?? active?.rowCount;

  return (
    <div className="km-view">
      <ToolbarSlot>
        <span className="km-toolbar-label"><Grid2X2 size={14} />Record distinguishability</span>
        <span className="toolbar-spacer" />
        <button type="button" className="btn km-open-assumptions" onClick={() => { ws.setPrefs({ inspector: true }); setInspector('attacker'); }}><Eye size={14} />Attacker assumptions</button>
        {active ? <button type="button" className="btn primary" disabled={pending || ws.sessionLost} onClick={() => void ws.assess()}><RefreshCw size={14} />{busy.assess ? 'Evaluating…' : 'Re-evaluate snapshot'}</button> : null}
      </ToolbarSlot>
      <InspectorSlot>
        <div className="inspector-body">
          <header className="inspector-head"><h2>Knowledge & assumptions</h2></header>
          <Tabs idPrefix="km-inspector" value={inspector} onChange={setInspector} label="Knowledge map inspector" items={[{ id: 'attacker', label: 'Attacker' }, { id: 'reading', label: 'Reading the map' }]} />
          <div className="km-inspector-content" id="km-inspector-panel" role="tabpanel" aria-labelledby={`km-inspector-tab-${inspector}`}>
            {inspector === 'attacker' ? <>
              <p>Choose what an observer knows. Earlier measurements stay frozen until you re-evaluate.</p>
              <ThreatPanel />
              {active ? <button type="button" className="btn primary full" disabled={pending || ws.sessionLost} onClick={() => void ws.assess()}><RefreshCw size={14} />Re-evaluate this snapshot</button> : null}
            </> : <>
              <h3>One combination, one partition</h3>
              <p>Rows with the same released values form a group. A row is sample-unique when its group contains exactly one row.</p>
              <dl className="km-definition-list">
                <dt>Sample-unique</dt><dd>Singleton rows ÷ rows in this candidate. A property of this file, not a population linkage probability.</dd>
                <dt>Minimum k</dt><dd>The smallest group for the selected combination. It says nothing about a sensitive value shared by the group.</dd>
                <dt>Single-guess correctness</dt><dd>Groups ÷ rows, conditional on a uniformly selected present target, correct known values and uniform guessing within its group.</dd>
                <dt>Smallest known set</dt><dd>Minimum number of tested fields that distinguishes each row. Bounded searches provide a found upper bound, not an exact minimum.</dd>
              </dl>
              <Notice tone="warn">A low uniqueness fraction does not cover sensitive inference, genomics, trajectories, free text or unknown outside knowledge.</Notice>
              <button type="button" className="btn" onClick={() => ws.setView('lab')}>Explore attack coverage<ArrowRight size={14} /></button>
            </>}
          </div>
        </div>
      </InspectorSlot>
      <div className="km-scroll">
        <header className="km-page-head"><p className="km-eyebrow">Knowledge map <span>/</span> Measured on the released sample</p><h1>Which known fields distinguish records?</h1><p>Each row of the surface is a combination of facts an observer might know; each cell describes this file under the evaluated assumptions.</p></header>
        <EvidenceBanner />
        {!active ? <section className="km-empty">
          {pending || busy.boot ? <><p role="status">{busy.boot ? 'Loading the fictional dataset…' : 'Evaluating the candidate…'}</p><Skeleton lines={5} height={22} /></> : <Empty icon={<Grid2X2 size={28} />} title={dataset ? 'Evaluate a candidate to map its exposure' : 'No dataset in this session'} actions={dataset ? <button type="button" className="btn primary" onClick={() => ws.reviewed ? void ws.apply() : dialogs.open('review')}>{ws.reviewed ? <Play size={14} /> : <ClipboardCheck size={14} />}{ws.reviewed ? 'Apply and evaluate' : 'Review classifications'}</button> : <button type="button" className="btn primary" onClick={() => void ws.loadDemo()}>Open fictional demo</button>}>
            {ws.bootError || (dataset ? 'Review roles and the person key, then evaluate. Missing measurements are never shown as zero exposure.' : 'Open a fictional dataset or import a CSV from the Workbench.')}
          </Empty>}
        </section> : <div className={`km-evidence${pending || ws.stale.length ? ' km-old-evidence' : ''}`}>
          <dl className="km-readout-strip" aria-label="Evaluated candidate summary">
            <div><dt>Frozen snapshot</dt><dd>{ws.labelOf(active.candidateId)}<small>{dataset?.name ?? active.name}</small></dd></div>
            <div><dt>Released records</dt><dd>{num(rows, 0)}<small>full candidate · not the preview</small></dd></div>
            <div><dt>Evaluated known fields</dt><dd>{measured ? num(measured.length, 0) : '—'}<small>{removed.length ? `${removed.length} declared field${removed.length === 1 ? '' : 's'} absent` : 'released field values'}</small></dd></div>
            <div><dt>All known fields · sample-unique<Term id="sample_unique" label="sample uniqueness" /></dt><dd className="km-exposure-number">{rows === 0 ? 'Unavailable' : pct(active.risk.metrics.sample_unique)}<small>{rows === 0 ? 'empty release' : 'of records in this file'}</small></dd></div>
          </dl>
          {rows === 0 ? <Notice tone="warn" title="This release contains no rows.">There are no records to distinguish. Empty-release statistics do not establish privacy or usable research data.</Notice> : null}
          {frozen ? <details className="km-frozen"><summary>Evaluated assumptions <span>{frozen.known.length} declared known fields · {frozen.membershipKnown === null ? 'membership not recorded' : frozen.membershipKnown ? 'membership known' : 'membership unknown'}</span></summary><p>{threatSentence({ ...frozen, publicRule: !active.auditMode })}</p>{active.risk.assumptions?.length ? <ul>{active.risk.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}</details> : null}
          {removed.length ? <Notice tone="info" title="Some declared known fields are absent from this release."><span className="km-field-text">{removed.join(', ')}</span>. They are excluded from these exact-match partitions. Removing a field does not erase outside knowledge, previous releases or inferences from remaining fields.</Notice> : null}
          {!frozen?.membershipKnown ? <Notice tone="warn">These partitions remain descriptions of this file. Unknown source membership is not tested here; present-target guessing is conditional and cannot be read as an unconditional attack probability.</Notice> : null}
          <section className="km-section">
            <header className="km-section-head"><div><p className="km-eyebrow">01 / Exposure surface</p><h2>What the known fields reveal together</h2></div><span className={`km-coverage-tag${coverage?.exhaustive === true ? '' : ' bounded'}`}>{coverage?.exhaustive === true ? 'Exhaustive enumeration' : coverage?.exhaustive === false ? 'Bounded enumeration' : 'Coverage not reported'}</span></header>
            <p className="km-section-description">Each row is a tested field combination. Orange intensity encodes its sample-unique fraction; the field marks show which facts are combined.</p>
            <ExposureSurface key={active.candidateId} exposure={exposure} fields={measured} rowCount={rows} />
          </section>
          <section className="km-section"><header className="km-section-head"><div><p className="km-eyebrow">02 / Minimum distinguishing knowledge</p><h2>How many known fields were enough?</h2></div></header><p className="km-section-description">Each record appears once, at its smallest nonempty distinguishing set{coverage?.exhaustive === true ? '' : ' found in the tested combinations'}. Field count is not acquisition cost or attack effort.</p><KnowledgeHistogram exposure={exposure} rowCount={rows} /></section>
          <footer className="km-scope-footer"><b>Sample description, never release clearance.</b><p>Genomic, family and trajectory risks are uncovered. Sensitive inference is a separate measurement. Outside linkage depends on auxiliary information this map does not observe.</p><button type="button" className="link" onClick={() => ws.setView('lab')}>Inspect the full threat register <ArrowRight size={13} /></button></footer>
        </div>}
      </div>
    </div>
  );
}
