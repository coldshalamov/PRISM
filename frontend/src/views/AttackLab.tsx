import { useState } from 'react';
import { ArrowRight, Beaker, BookOpen, FlaskConical, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { num } from '../format';
import type { LabResult, Registry } from '../types';
import { Facts } from '../ui/Facts';
import { Empty, Notice, Skeleton } from '../ui/Feedback';
import { PageHead } from '../ui/PageHead';
import { InspectorSlot, ToolbarSlot } from '../ui/Slots';
import { Tabs, panelProps } from '../ui/Tabs';
import { useWorkspace } from '../workspace';
import { ExperimentView } from './lab/Experiments';
import { Capability, CoverageRegister, ThreatRegister } from './lab/ThreatRegister';
import './lab/attack-lab.css';

type LabTab = 'experiments' | 'threats' | 'coverage';

export default function AttackLab() {
  const ws = useWorkspace();
  const { deployment } = ws;
  const [tab, setTab] = useState<LabTab>('experiments');
  const [experimentId, setExperimentId] = useState('differencing');
  const [localLab, setLocalLab] = useState<LabResult | null>(null);
  const [localRegistry, setLocalRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState<'lab' | 'registry' | null>(null);
  const [error, setError] = useState<{ kind: 'lab' | 'registry'; message: string } | null>(null);
  const lab = localLab ?? ws.lab;
  const registry = localRegistry ?? ws.registry;
  const selected = lab?.experiments.find(experiment => experiment.id === experimentId) ?? lab?.experiments[0];
  const needsRegistry = tab !== 'experiments';
  const reload = async (kind: 'lab' | 'registry') => {
    if (loading) return;
    setLoading(kind);
    setError(null);
    try {
      if (kind === 'lab') setLocalLab(await api.lab());
      else setLocalRegistry(await api.registry());
    } catch (failure) {
      setError({ kind, message: failure instanceof Error ? failure.message : 'The service did not return a result.' });
    } finally { setLoading(null); }
  };

  return <div className="al-view">
    <ToolbarSlot>
      <Tabs<LabTab> idPrefix="attack-lab" variant="segment" value={tab} onChange={setTab} label="Attack lab sections" items={[{ id: 'experiments', label: 'Counterexamples' }, { id: 'threats', label: 'Threat register', badge: registry?.attacks.length }, { id: 'coverage', label: 'Methods & engines' }]} />
      <span className="toolbar-spacer" />
      <button type="button" className="btn" disabled={loading !== null} onClick={() => void reload(needsRegistry ? 'registry' : 'lab')}><RefreshCw size={14} className={loading ? 'spin' : ''} />{loading ? 'Computing…' : needsRegistry ? 'Refresh register' : 'Run again'}</button>
    </ToolbarSlot>
    <InspectorSlot><div className="inspector-body"><header className="inspector-head"><h2>{tab === 'experiments' ? 'Experiment notebook' : 'Coverage notes'}</h2><BookOpen size={16} aria-hidden="true" /></header><div className="al-inspector">
      {tab === 'experiments' && selected ? <>
        <p className="al-eyebrow">Fictional fixed inputs</p><h3>{selected.title}</h3><Capability status={selected.status} />
        <h4>Assumptions</h4><ul className="al-assumptions">{selected.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
        <h4>Inputs returned by the service</h4><Facts value={selected.inputs} />
        <h4>Complete computed result</h4><Facts value={selected.result} />
        <p className="al-note">These fixed counterexamples do not attack your imported data or evaluate your active candidate.</p>
      </> : <>
        <p className="al-eyebrow">Capability ≠ candidate evidence</p><h3>Read the scope before the status.</h3><p>Implemented means the named capability exists. Partial means only the described portion runs. Unsupported means no result is available.</p>
        <div className="al-status-key"><Capability status="implemented" /><p>A specific algorithm or control exists, subject to its assumptions.</p><Capability status="partial" /><p>The family is covered only in the stated limited form.</p><Capability status="unsupported" /><p>Uncovered. Neither tested nor passed.</p></div>
        <h4>Separate catalogues</h4><p>The {num(registry?.familyCount, 0)} threat families map to executable analyses through explicit aliases. The {num(registry?.protectionCount, 0)} protection entries are a separate method catalogue; neither count represents tests run on a candidate.</p>
        <h4>Specialist work remains</h4><p>Genomic and family inference, trajectories and operational public-record linkage remain uncovered. Optional packages need an executed adapter; installation alone does not establish integration.</p>
        <button type="button" className="btn" onClick={() => ws.setView('map')}>Open candidate knowledge map<ArrowRight size={14} /></button>
      </>}
    </div></div></InspectorSlot>
    <div className="al-scroll" {...panelProps('attack-lab', tab)}>
      <PageHead className="al-page-head" icon={<FlaskConical size={22} />} title={tab === 'experiments' ? 'Counterexamples: where a protection fails' : tab === 'threats' ? 'Threat register: what is covered' : 'Methods and engines: what exists, what runs'} detail={<><p>Limits made visible.</p><p>{tab === 'experiments' ? `Small executable counterexamples, computed ${deployment.hosted ? 'by the hosted demo service' : 'by the service'} on fictional records. They explain a failure mode; they do not measure your candidate.` : tab === 'threats' ? 'Search broad threat families, then inspect the implemented portion, assumptions and source. A catalogue status is never release clearance.' : 'The protection catalogue is separate from threat families and executable analyses. Unavailable integrations remain visibly uncovered.'}</p></>} />
      {ws.health === 'down' ? <Notice tone="warn" title="The service is currently unreachable.">Any results below are from an earlier response. Retry when the service is available; a connection failure is not a completed evaluation.</Notice> : null}
      {error && error.kind === (needsRegistry ? 'registry' : 'lab') ? <Notice tone="warn" title="The latest request failed.">{error.message}{(needsRegistry ? registry : lab) ? ' The earlier response remains visible below.' : ''}</Notice> : null}
      {tab === 'experiments' ? lab ? <>
        <div className="al-lab-scope"><Beaker size={15} aria-hidden="true" /><span><b>Fictional counterexamples</b> · {num(lab.experiments.length, 0)} computations run {deployment.place} · independent of your open dataset</span></div>
        {lab.experiments.length ? <div className={`al-experiment-workspace${loading === 'lab' ? ' al-pending' : ''}`} aria-busy={loading === 'lab'}><nav className="al-experiment-nav" aria-label="Counterexamples">{lab.experiments.map((experiment, index) => <button type="button" key={experiment.id} aria-current={experiment.id === selected?.id ? 'true' : undefined} className={experiment.id === selected?.id ? 'active' : ''} onClick={() => setExperimentId(experiment.id)}><span className="al-experiment-number">{String(index + 1).padStart(2, '0')}</span><span><b>{experiment.id === 'differencing' ? 'Overlapping counts' : experiment.id === 'composition' ? 'Release composition' : experiment.id === 'correlation' ? 'Reversed relationships' : experiment.id === 'linkage' ? 'Verified linkage' : experiment.title}</b><small>{experiment.status === 'implemented' ? 'Computed demonstration' : experiment.status}</small></span><ArrowRight size={13} aria-hidden="true" /></button>)}</nav>{selected ? <ExperimentView experiment={selected} /> : null}</div> : <Empty title="No counterexamples were returned">Run the computation again to request the experiments.</Empty>}
      </> : <Unavailable kind="lab" busy={loading === 'lab'} retry={() => void reload('lab')} /> : registry ? <div className={loading === 'registry' ? 'al-pending' : ''}>{tab === 'threats' ? <ThreatRegister registry={registry} /> : <CoverageRegister registry={registry} />}</div> : <Unavailable kind="registry" busy={loading === 'registry'} retry={() => void reload('registry')} />}
      <footer className="al-footer"><b>No outside data is fetched by this lab.</b><span>Sources open only when you choose a source link. All measurements remain conditional on the stated model.</span></footer>
    </div>
  </div>;
}

function Unavailable({ kind, busy, retry }: { kind: 'lab' | 'registry'; busy: boolean; retry: () => void }) {
  return <div className="al-unavailable">{busy ? <><p role="status">{kind === 'lab' ? 'Computing fictional counterexamples…' : 'Loading the capability register…'}</p><Skeleton lines={5} height={20} /></> : <Empty icon={<Beaker size={26} />} title={kind === 'lab' ? 'Counterexamples have not loaded' : 'The threat register has not loaded'} actions={<button type="button" className="btn primary" onClick={retry}><RefreshCw size={14} />Retry {kind === 'lab' ? 'computation' : 'register'}</button>}>The service has not supplied this result. No risk outcome can be inferred from its absence.</Empty>}</div>;
}
