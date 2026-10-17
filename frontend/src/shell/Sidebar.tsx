import { useEffect, useState } from 'react';
import {
  BookOpen, ClipboardCheck, Database, FileText, FileUp, FlaskConical, Grid3x3, LayoutPanelLeft, Plus, ScanSearch, ScatterChart, Target, Beaker,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { isAudit, isFeasible, localFrontier, linkageOf, STALE_LABEL } from '../analysis';
import { isFictional } from '../deployment';
import { ago, num, pct } from '../format';
import { recipeLabel } from '../recipe';
import { useDialogs } from '../dialogs';
import { Logo } from '../ui/Logo';
import { MenuButton } from '../ui/Menu';
import { useWorkspace } from '../workspace';
import type { Candidate, ViewId } from '../types';

export const NAV: { id: ViewId; label: string; short: string; icon: ReactNode; key: string }[] = [
  { id: 'workbench', label: 'Workbench', short: 'Bench', icon: <LayoutPanelLeft size={18} />, key: '1' },
  { id: 'map', label: 'Knowledge Map', short: 'Map', icon: <Grid3x3 size={18} />, key: '2' },
  { id: 'lab', label: 'Attack Lab', short: 'Lab', icon: <FlaskConical size={18} />, key: '3' },
  { id: 'intent', label: 'Research Intent', short: 'Intent', icon: <Target size={18} />, key: '4' },
  { id: 'pareto', label: 'Pareto Explorer', short: 'Pareto', icon: <ScatterChart size={18} />, key: '5' },
  { id: 'report', label: 'Report', short: 'Report', icon: <FileText size={18} />, key: '6' },
];

export function Rail({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  const { view, setView } = useWorkspace();
  return (
    <nav className="rail-nav" aria-label="Views">
      <ul>
        {NAV.map(item => (
          <li key={item.id}>
            <a
              href={`#/${item.id}`}
              className={view === item.id ? 'active' : ''}
              aria-current={view === item.id ? 'page' : undefined}
              title={compact ? `${item.label} (Alt+${item.key})` : undefined}
              onClick={event => { event.preventDefault(); setView(item.id); onNavigate?.(); }}
            >
              <span className="rail-icon" aria-hidden="true">{item.icon}</span>
              <span className="rail-label">{item.label}</span>
              <kbd className="rail-key" aria-hidden="true">Alt+{item.key}</kbd>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Tile({ label, kind, frontier }: { label: string; kind: 'created' | 'search' | 'audit' | 'original' | 'baseline'; frontier?: boolean }) {
  return <span className={`tile tile-${kind}${frontier ? ' frontier' : ''}`} aria-hidden="true">{label}</span>;
}

/* Library: the Spotify-style list of everything in this session. Items are real objects held by
   the service: the loaded dataset, the unprotected baseline, and every evaluated candidate. */
export function Library({ onPick }: { onPick?: () => void }) {
  const ws = useWorkspace();
  const { dataset, baseline, candidates, active, select, meta, labelOf, search, setView, view, staleFor, fixture, deployment } = ws;
  const uploadHint = deployment.uploadsAllowed ? undefined : 'Not available in this demo; run locally';
  const dialogs = useDialogs();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(t); }, []);
  const frontier = dataset ? localFrontier(search?.candidates ?? [], dataset.rowCount) : new Set<string>();

  const pick = (candidate: Candidate) => {
    select(candidate.candidateId);
    if (view !== 'workbench' && view !== 'map' && view !== 'report') setView('workbench');
    onPick?.();
  };

  return (
    <section className="library" aria-label="Library">
      <header className="library-head">
        <h2><BookOpen size={15} aria-hidden="true" />Library</h2>
        <MenuButton
          className="icon-btn dark"
          ariaLabel="Add to library"
          icon={<Plus size={17} />}
          caret={false}
          align="right"
          items={[
            { id: 'demo', label: 'Open fictional oncology demo', hint: '5,000 records', icon: <Database size={15} />, onSelect: () => ws.requestReplace('the fictional oncology demo', () => void ws.loadDemo('architecture')) },
            { id: 'kit', label: 'Open fictional benchmark', hint: '480 records with exact-linkage replay', icon: <Beaker size={15} />, onSelect: () => ws.requestReplace('the fictional benchmark', () => void ws.loadDemo('kit')) },
            { id: 's1', separator: true },
            { id: 'import', label: 'Import original CSV…', hint: uploadHint, icon: <FileUp size={15} />, disabled: !deployment.uploadsAllowed, onSelect: () => dialogs.open('import') },
            { id: 'audit', label: 'Audit a protected CSV…', hint: uploadHint, icon: <ScanSearch size={15} />, disabled: !dataset || !deployment.uploadsAllowed, onSelect: () => dialogs.open('audit') },
            { id: 'review', label: 'Review classifications…', icon: <ClipboardCheck size={15} />, disabled: !dataset, onSelect: () => dialogs.open('review') },
          ]}
        />
      </header>
      <div className="library-scroll">
        {dataset ? (
          <ul className="library-list" aria-label="Datasets">
            <li>
              <div className="library-item static" data-spot>
                <Tile label="D" kind="original" />
                <span className="library-text">
                  <b title={dataset.name}>{dataset.name}</b>
                  <small>
                    {isFictional(deployment, dataset) ? (fixture === 'kit' ? 'Fictional benchmark' : 'Fictional demo') : 'Imported data'} · {num(dataset.rowCount, 0)} rows · {dataset.schema.length} columns
                  </small>
                </span>
              </div>
            </li>
            {baseline ? (
              <li>
                <button type="button" className={`library-item${active?.candidateId === baseline.candidateId ? ' selected' : ''}`} data-spot onClick={() => pick(baseline)}>
                  <Tile label="U" kind="baseline" />
                  <span className="library-text">
                    <b>Unprotected baseline</b>
                    <small>{pct(baseline.risk.metrics.sample_unique)} unique · k = {num(baseline.risk.metrics.k_min, 0)}</small>
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : <p className="library-empty">No dataset loaded.</p>}

        <h3 className="library-sub">Candidates <span>{candidates.length}{ws.healthInfo?.maxCandidates ? ` / ${ws.healthInfo.maxCandidates}` : deployment.hosted ? ' / 40' : ''}</span></h3>
        {candidates.length ? (
          <ul className="library-list" aria-label="Candidate history">
            {[...candidates].reverse().map((candidate, index) => {
              const entry = meta[candidate.candidateId];
              const kind = entry?.kind ?? 'created';
              const reasons = staleFor(candidate).filter(reason => reason !== 'recipe');
              const selected = active?.candidateId === candidate.candidateId;
              const link = linkageOf(candidate);
              return (
                <li key={candidate.candidateId} style={{ ['--i' as string]: Math.min(index, 8) }} className="reveal">
                  <button
                    type="button"
                    className={`library-item${selected ? ' selected' : ''}`}
                    data-spot
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => pick(candidate)}
                  >
                    <Tile label={labelOf(candidate.candidateId)} kind={kind} frontier={frontier.has(candidate.candidateId) && kind === 'search'} />
                    <span className="library-text">
                      <b title={recipeLabel(candidate.recipe.steps)}>{isAudit(candidate) ? `External file · ${candidate.alignment === 'verified' ? 'verified pairing' : 'unknown pairing'}` : recipeLabel(candidate.recipe.steps)}</b>
                      <small>
                        {link.state === 'measured' ? `${num(link.numerator, 0)}/${num(link.denominator, 0)} linked · ` : `${pct(candidate.risk.metrics.sample_unique)} unique · `}
                        {isFeasible(candidate) ? 'meets limits' : 'misses limits'} · {ago(candidate.createdAt, now)}
                      </small>
                      {reasons.length ? <small className="stale-flag">Stale: {reasons.map(reason => STALE_LABEL[reason]).join(', ')} changed</small> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="library-empty">Every evaluated recipe is kept here as an immutable candidate.</p>}

        {search ? (
          <>
            <h3 className="library-sub">Search <span>{search.evaluated}</span></h3>
            <button type="button" className="library-item" data-spot onClick={() => { setView('pareto'); onPick?.(); }}>
              <Tile label="S" kind="search" />
              <span className="library-text">
                <b>{search.evaluated} candidates evaluated</b>
                <small>{frontier.size} nondominated · budget {search.cap}</small>
              </span>
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function SessionFooter() {
  const { health, healthInfo, origin, dataset, deployment } = useWorkspace();
  const dialogs = useDialogs();
  const hosted = deployment.hosted;
  const version = healthInfo?.version ? ` ${healthInfo.version}` : '';
  const headline = health === 'checking' ? 'Connecting…' : health === 'down' ? 'Service unreachable'
    : hosted ? 'Hosted fictional demo' : deployment.kind === 'remote' ? 'Remote session' : 'Local session';
  const detail = health === 'ok'
    ? (hosted ? `Service${version} · fictional records · uploads off` : `Service${version} on ${origin.host || 'this computer'}`)
    : health === 'checking' ? (hosted ? 'Checking the hosted demo service' : 'Checking the service')
      : (!hosted && origin.local ? 'Start the backend on 127.0.0.1:8000' : 'Retrying automatically');
  return (
    <footer className="rail-foot">
      <button type="button" className={`session-line ${deployment.kind}`} onClick={() => dialogs.open('privacy')}>
        <span className={`dot ${health}`} aria-hidden="true" />
        <span className="session-text">
          <b>{headline}</b>
          <small>{detail}</small>
        </span>
      </button>
      {dataset ? (
        <button type="button" className="rail-clear" onClick={() => dialogs.open('clear')}>
          <Database size={14} aria-hidden="true" />{hosted ? 'Clear session…' : 'Clear local session…'}
        </button>
      ) : null}
    </footer>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <Logo size={30} />
      <span className="brand-word">PRISM</span>
    </div>
  );
}
