import { useEffect, useMemo, useRef, useState } from 'react';
import { Beaker, ClipboardCheck, Database, FileUp, Play, Square } from 'lucide-react';
import { isAudit, rowCountNote, rowsAligned } from '../analysis';
import { CohortBars } from '../charts/CohortBars';
import { CorrelationMatrix } from '../charts/CorrelationMatrix';
import { DistributionChart } from '../charts/DistributionChart';
import { SubgroupTable } from '../charts/SubgroupTable';
import { useDialogs } from '../dialogs';
import { isFictional } from '../deployment';
import { num, plural } from '../format';
import { useMedia } from '../hooks';
import { columnTreatmentNote, recipeLabel } from '../recipe';
import { EvidenceBanner } from '../ui/EvidenceBanner';
import { Empty, Notice, Skeleton } from '../ui/Feedback';
import { InspectorSlot, ToolbarSlot } from '../ui/Slots';
import { Tabs, panelProps } from '../ui/Tabs';
import { Term } from '../ui/Tip';
import { useWorkspace } from '../workspace';
import { DataTable } from './workbench/DataTable';
import type { TableColumn } from './workbench/DataTable';
import { Ledger } from './workbench/Ledger';
import { RecipeInspector } from './workbench/RecipeInspector';

type PaneTab = 'table' | 'dist' | 'corr' | 'sub';
type PaneMode = 'both' | 'original' | 'protected';

function StartPanel() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { deployment } = ws;
  const loading = ws.busy.boot;
  return (
    <div className="start">
      <Empty
        icon={<Database size={26} />}
        title={loading ? 'Loading fictional data…' : 'No dataset in this session'}
        actions={loading ? undefined : (
          <>
            <button type="button" className="btn primary" onClick={() => void ws.loadDemo('architecture')}><Database size={15} />Fictional oncology demo · 5,000</button>
            <button type="button" className="btn" onClick={() => void ws.loadDemo('kit')}><Beaker size={15} />Fictional benchmark · 480</button>
            {deployment.uploadsAllowed ? <button type="button" className="btn" onClick={() => dialogs.open('import')}><FileUp size={15} />Import a CSV</button> : null}
          </>
        )}
      >
        {loading
          ? (deployment.hosted ? 'Asking the hosted demo service for fictional records.' : 'Generating fictional records.')
          : deployment.uploadsAllowed
            ? 'Open a fictional demonstration, or import your own CSV. Demonstration records are invented; files are read only by the local service on this computer.'
            : `Open a fictional demonstration. ${deployment.hosted ? 'Every record in the hosted demo is invented' : 'Demonstration records are invented'}, and the measurements are real computations run ${deployment.place}. ${deployment.uploadsNote}`}
      </Empty>
    </div>
  );
}

export default function Workbench() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset, active, reviewed, busy, stale } = ws;
  const compact = !useMedia('(min-width: 980px)');
  const [tab, setTab] = useState<PaneTab>('table');
  const [mode, setMode] = useState<PaneMode>('both');
  const [field, setField] = useState('');
  const [column, setColumn] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const leftScroll = useRef<HTMLDivElement | null>(null);
  const rightScroll = useRef<HTMLDivElement | null>(null);
  const syncing = useRef(false);

  const distributions = active?.utility.distributions ?? [];
  useEffect(() => {
    if (!distributions.length) return;
    if (column && distributions.some(d => d.column === column)) setField(column);
    else if (!distributions.some(d => d.column === field)) setField(distributions[0].column);
  }, [distributions, field, column]);
  const dist = distributions.find(d => d.column === field) ?? distributions[0];

  const aligned = rowsAligned(active, dataset);
  const sync = (from: React.RefObject<HTMLDivElement | null>, to: React.RefObject<HTMLDivElement | null>) => () => {
    if (!aligned) return;
    if (syncing.current) { syncing.current = false; return; }
    const a = from.current;
    const b = to.current;
    if (a && b && b.scrollTop !== a.scrollTop) { syncing.current = true; b.scrollTop = a.scrollTop; }
  };

  const removedNames = useMemo(() => new Set((dataset?.schema ?? []).filter(spec => active && !active.columns.includes(spec.name)).map(spec => spec.name)), [dataset, active]);
  const originalColumns = useMemo<TableColumn[]>(() => (dataset?.schema ?? []).map(spec => ({ name: spec.name, spec, removed: removedNames.has(spec.name) })), [dataset, removedNames]);
  const protectedColumns = useMemo<TableColumn[]>(() => (active?.columns ?? []).map(name => {
    const spec = (active?.schema ?? dataset?.schema)?.find(c => c.name === name);
    const measuredUnit = active?.utility.distributions.find(item => item.column === name)?.unit;
    const note = active && !isAudit(active) ? columnTreatmentNote(active.recipe.steps, name) : null;
    return { name, spec: spec && measuredUnit ? { ...spec, unit: measuredUnit } : spec, note };
  }), [active, dataset]);

  if (!dataset) return <StartPanel />;

  const showOriginal = !compact || mode !== 'protected';
  const showProtected = !compact || mode !== 'original';
  const protectedLabel = active ? ws.labelOf(active.candidateId) : null;
  const note = active ? rowCountNote(active, dataset.rowCount) : null;
  const pending = busy.apply || busy.assess;
  const tabId = 'panes';
  const external = isAudit(active);
  const sourceUnit = dist ? dataset.schema.find(spec => spec.name === dist.column)?.unit ?? null : null;

  const originalPane = (
    <section className="pane original" aria-label="Original data">
      <header className="pane-head">
        <span className="swatch original" aria-hidden="true" />
        <h2>Source · original</h2>
        <span className="pane-meta">{dataset.name} · {num(dataset.rowCount, 0)} rows · {plural(dataset.schema.length, 'column')}</span>
        <span className="pane-tag">{isFictional(ws.deployment, dataset) ? 'Fictional' : 'Imported'}</span>
      </header>
      <div className="pane-body">
        {tab === 'table' ? (
          <DataTable
            side="original" caption="Original data preview, first 30 rows" columns={originalColumns} rows={dataset.preview}
            aligned={aligned} hoverRow={hoverRow} onHoverRow={setHoverRow} scrollRef={leftScroll} onScroll={sync(leftScroll, rightScroll)}
            selectedColumn={column} onSelectColumn={setColumn}
          />
        ) : !active ? <NoCandidate /> : tab === 'dist' ? (dist ? <DistributionChart dist={dist} side="original" sourceUnit={sourceUnit} /> : <NoViz />)
          : tab === 'corr' ? <CorrelationMatrix correlations={active.utility.correlations} side="original" />
            : <CohortBars queries={active.utility.queries} side="original" workload={active.workload} schema={active.schema} />}
      </div>
      {tab === 'table' ? <p className="pane-foot">First {dataset.preview.length} of {num(dataset.rowCount, 0)} rows · preview only{removedNames.size ? ` · ${plural(removedNames.size, 'column')} removed in ${protectedLabel}` : ''}</p> : null}
    </section>
  );

  const protectedPane = (
    <section className="pane protected" aria-label="Protected candidate">
      <header className="pane-head">
        <span className="swatch protected" aria-hidden="true" />
        <h2>{external ? 'External release' : 'Candidate'}{protectedLabel ? <> · {protectedLabel}</> : null}</h2>
        <span className="pane-meta">
          {active ? <>{external ? 'unknown mechanism' : recipeLabel(active.recipe.steps)} · {num(active.rowCount, 0)} rows · {plural(active.columns.length, 'column')}</> : 'No candidate yet'}
        </span>
        {active ? <span className="pane-tag">{active.alignment === 'verified' ? 'Verified pairing' : 'Unknown pairing'}<Term id={active.alignment === 'verified' ? 'paired' : 'unpaired'} label="pairing" /></span> : null}
      </header>
      {note ? <p className="pane-note">{note}</p> : null}
      <div className="pane-body">
        {!active ? (
          <NoCandidate />
        ) : tab === 'table' ? (
          <DataTable
            side="protected" caption={`${external ? 'External release' : 'Candidate'} ${protectedLabel} preview, first ${active.preview.length} rows`}
            columns={protectedColumns} rows={active.preview} compareTo={aligned ? dataset.preview : undefined} aligned={aligned}
            hoverRow={hoverRow} onHoverRow={setHoverRow} scrollRef={rightScroll} onScroll={sync(rightScroll, leftScroll)}
            selectedColumn={column} onSelectColumn={setColumn}
          />
        ) : tab === 'dist' ? (dist ? <DistributionChart dist={dist} side="protected" sourceUnit={sourceUnit} /> : <NoViz />)
          : tab === 'corr' ? <CorrelationMatrix correlations={active.utility.correlations} side="protected" />
            : (
              <>
                <CohortBars queries={active.utility.queries} side="protected" workload={active.workload} schema={active.schema} />
                <SubgroupTable subgroups={active.utility.subgroups} worst={active.utility.worstSubgroup} alignment={active.alignment} />
              </>
            )}
      </div>
      {active && tab === 'table' ? (
        <p className="pane-foot">
          {aligned
            ? 'Rows correspond one-to-one (verified), so changed cells are highlighted.'
            : external && active.alignment === 'verified'
              ? 'Owner correspondence is verified for evaluation, but these previews retain file order. Row-by-row highlighting is unavailable.'
            : 'Rows are independent: no identity correspondence is shown or implied. Compare columns, not rows.'}
        </p>
      ) : null}
    </section>
  );

  return (
    <div className="wb">
      <h1 className="sr-only">Workbench: source and candidate comparison</h1>
      <ToolbarSlot>
        <Tabs<PaneTab>
          idPrefix={tabId}
          variant="segment"
          label="Pane contents"
          value={tab}
          onChange={setTab}
          items={[{ id: 'table', label: 'Table' }, { id: 'dist', label: 'Distributions' }, { id: 'corr', label: 'Correlations' }, { id: 'sub', label: 'Subgroups' }]}
        />
        {tab === 'dist' && distributions.length ? (
          <label className="tool-select">Field
            <select value={dist?.column ?? ''} onChange={event => { setField(event.target.value); setColumn(event.target.value); }} aria-label="Field to chart">
              {distributions.map(d => <option key={d.column} value={d.column}>{d.column}{d.dropped ? ' (removed)' : ''}</option>)}
            </select>
          </label>
        ) : null}
        {compact ? (
          <div className="seg" role="radiogroup" aria-label="Visible pane">
            {(['both', 'original', 'protected'] as PaneMode[]).map(option => (
              <button key={option} type="button" role="radio" aria-checked={mode === option} className={mode === option ? 'active' : ''} onClick={() => setMode(option)}>{option === 'both' ? 'Both' : option === 'original' ? 'Source' : external ? 'External' : 'Candidate'}</button>
            ))}
          </div>
        ) : null}
        <span className="toolbar-spacer" />
        {!reviewed ? <button type="button" className="btn" onClick={() => dialogs.open('review')}><ClipboardCheck size={15} />Review classifications<span className="attn-dot" aria-hidden="true" /></button> : null}
        {pending ? (
          <button type="button" className="btn" onClick={() => ws.cancel(busy.apply ? 'apply' : 'assess')}><Square size={13} fill="currentColor" />Stop waiting</button>
        ) : null}
        <button type="button" className={`btn primary${busy.apply ? ' busy' : ''}`} disabled={busy.apply || !reviewed} onClick={() => void ws.apply()}>
          <Play size={14} fill="currentColor" />{busy.apply ? 'Evaluating…' : 'Apply and evaluate'}
        </button>
      </ToolbarSlot>
      <InspectorSlot><RecipeInspector /></InspectorSlot>

      <div className={`panes-wrap${pending ? ' is-pending' : stale.length ? ' is-stale' : ''}`} {...panelProps(tabId, tab)}>
        <EvidenceBanner />
        {!reviewed && !active ? (
          <Notice tone="info" title="Start by reviewing the fields.">
            PRISM suggests which columns identify a person, which are sensitive and which you analyse, and asks whether each person appears in one row. Confirm them once and the first candidate is created automatically.
            <span className="notice-actions"><button type="button" className="btn primary" onClick={() => dialogs.open('review')}><ClipboardCheck size={15} />Review classifications</button></span>
          </Notice>
        ) : null}
        <div className={`panes${showOriginal && showProtected ? '' : ' single'}`}>
          {showOriginal ? originalPane : null}
          {showProtected ? protectedPane : null}
        </div>
      </div>
      <Ledger onShowSubgroups={() => setTab('sub')} />
    </div>
  );
}

function NoCandidate() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  if (ws.busy.apply) return <div className="viz-empty"><Skeleton lines={6} height={16} /></div>;
  return (
    <div className="viz-empty">
      <b>{ws.reviewed ? 'No candidate yet.' : 'Review fields to create the first candidate.'}</b>
      <span>{ws.reviewed ? 'Apply the recipe to see measured changes on the full dataset.' : 'Roles, units and the person key decide what is removed and what is measured.'}</span>
      {ws.reviewed
        ? <button type="button" className="btn primary" onClick={() => void ws.apply()}><Play size={14} fill="currentColor" />Apply and evaluate</button>
        : <button type="button" className="btn" onClick={() => dialogs.open('review')}><ClipboardCheck size={15} />Review classifications</button>}
    </div>
  );
}

function NoViz() {
  return <div className="viz-empty"><b>No fields to chart.</b><span>The service returned no distributions for this candidate.</span></div>;
}
