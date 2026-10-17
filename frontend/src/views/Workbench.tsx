import { useEffect, useMemo, useRef, useState } from 'react';
import { Beaker, ClipboardCheck, Database, FileUp, Play, ScanSearch, Square } from 'lucide-react';
import { isAudit, rowCountNote, rowsAligned } from '../analysis';
import { CohortBars } from '../charts/CohortBars';
import { CorrelationMatrix } from '../charts/CorrelationMatrix';
import { DistributionChart } from '../charts/DistributionChart';
import { SubgroupTable } from '../charts/SubgroupTable';
import { useDialogs } from '../dialogs';
import { isFictional } from '../deployment';
import { draftPreview } from '../draftPreview';
import { num, plural } from '../format';
import { useMedia } from '../hooks';
import { columnTreatmentNote, normalizeSteps, recipeLabel, sameSteps } from '../recipe';
import { EvidenceBanner } from '../ui/EvidenceBanner';
import { Empty, Skeleton } from '../ui/Feedback';
import { InspectorSlot, ToolbarSlot } from '../ui/Slots';
import { Tabs, panelProps } from '../ui/Tabs';
import { Term } from '../ui/Tip';
import { useWorkspace } from '../workspace';
import { DataTable } from './workbench/DataTable';
import type { TableColumn } from './workbench/DataTable';
import { Ledger } from './workbench/Ledger';
import { RecipeInspector } from './workbench/RecipeInspector';
import { Hero } from './workbench/Hero';
import { SemanticPanel } from './workbench/SemanticPanel';

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
            <button type="button" className="btn" onClick={() => ws.requestReplace('the semantic ambiguity demo', () => void ws.loadDemo('semantic'))}><ScanSearch size={15} />Semantic ambiguity demo</button>
            {deployment.uploadsAllowed ? <button type="button" className="btn" onClick={() => dialogs.open('import')}><FileUp size={15} />Import CSV, JSON or XLSX</button> : null}
          </>
        )}
      >
        {loading
          ? (deployment.hosted ? 'Asking the hosted demo service for fictional records.' : 'Generating fictional records.')
          : deployment.uploadsAllowed
            ? deployment.hosted
              ? 'Import CSV, JSON or XLSX, or open a labeled fictional example. Your tables and recipes are stored in Archie Core; Python calculations run through Vercel.'
              : 'Open a fictional demonstration, or import CSV, JSON or XLSX. Demonstration records are invented; imports are read by the local service on this computer.'
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
  const [findingColumns, setFindingColumns] = useState<string[]>([]);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const leftScroll = useRef<HTMLDivElement | null>(null);
  const rightScroll = useRef<HTMLDivElement | null>(null);
  const syncing = useRef(false);
  useEffect(() => { setFindingColumns([]); setColumn(null); }, [dataset?.datasetId]);
  // A finding's contributor group belongs to its evaluated snapshot; a manually focused field may remain selected.
  useEffect(() => { setFindingColumns([]); }, [active?.candidateId]);
  const draftSteps = useMemo(() => normalizeSteps(ws.steps, ws.threat.known), [ws.steps, ws.threat.known]);
  const recipeEdited = Boolean(dataset && ws.reviewed && !isAudit(active) && !sameSteps(draftSteps, active?.recipe.steps ?? []));
  const draft = useMemo(() => dataset && recipeEdited ? draftPreview(dataset.preview, draftSteps, dataset.schema) : null, [dataset, draftSteps, recipeEdited]);
  const showDraftValues = tab === 'table' && draft?.supported === true;
  const visibleProtectedNames = showDraftValues ? draft.columns : active?.columns ?? [];
  const visibleProtectedRows = showDraftValues ? draft.rows : active?.preview ?? [];

  const distributions = active?.utility.distributions ?? [];
  useEffect(() => {
    if (!distributions.length) return;
    if (column && distributions.some(d => d.column === column)) setField(column);
    else if (!distributions.some(d => d.column === field)) setField(distributions[0].column);
  }, [distributions, field, column]);
  const dist = distributions.find(d => d.column === field) ?? distributions[0];

  const aligned = showDraftValues || rowsAligned(active, dataset);
  const sync = (from: React.RefObject<HTMLDivElement | null>, to: React.RefObject<HTMLDivElement | null>) => () => {
    if (!aligned) return;
    if (syncing.current) { syncing.current = false; return; }
    const a = from.current;
    const b = to.current;
    if (a && b && b.scrollTop !== a.scrollTop) { syncing.current = true; b.scrollTop = a.scrollTop; }
  };

  const removedNames = useMemo(() => new Set((dataset?.schema ?? []).filter(spec => (active || showDraftValues) && !visibleProtectedNames.includes(spec.name)).map(spec => spec.name)), [dataset, active, showDraftValues, visibleProtectedNames]);
  const originalColumns = useMemo<TableColumn[]>(() => (dataset?.schema ?? []).map(spec => ({ name: spec.name, spec, removed: removedNames.has(spec.name) })), [dataset, removedNames]);
  const protectedColumns = useMemo<TableColumn[]>(() => visibleProtectedNames.map(name => {
    const spec = (showDraftValues ? dataset?.schema : active?.schema ?? dataset?.schema)?.find(c => c.name === name);
    const convertedDraft = showDraftValues && draftSteps.some(step => step.method === 'band' && step.columns.includes(name) && step.params.convertFrom === 'lb');
    const measuredUnit = showDraftValues ? (convertedDraft ? 'kg' : spec?.unit) : active?.utility.distributions.find(item => item.column === name)?.unit;
    const note = showDraftValues ? columnTreatmentNote(draftSteps, name) : active && !isAudit(active) ? columnTreatmentNote(active.recipe.steps, name) : null;
    return { name, spec: spec && measuredUnit ? { ...spec, unit: measuredUnit } : spec, note };
  }), [active, dataset, draftSteps, showDraftValues, visibleProtectedNames]);

  if (!dataset) return <StartPanel />;

  const showOriginal = !compact || mode !== 'protected';
  const showProtected = !compact || mode !== 'original';
  const protectedLabel = active ? ws.labelOf(active.candidateId) : null;
  const note = active ? rowCountNote(active, dataset.rowCount) : null;
  const pending = busy.apply || busy.assess;
  const sessionBusy = Object.values(busy).some(Boolean);
  const tabId = 'panes';
  const external = isAudit(active);
  const sourceUnit = dist ? dataset.schema.find(spec => spec.name === dist.column)?.unit ?? null : null;
  /* One shared column selection drives both panes. The correlation and subgroup views have no column to mark, so choosing a field there shows the table. */
  const highlightColumn = (name: string | null) => {
    setFindingColumns([]);
    setColumn(name);
    if (name) setTab('table');
  };
  const highlightColumns = (names: string[]) => {
    setFindingColumns(names);
    setColumn(names[0] ?? null);
    if (names.length) setTab('table');
  };

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
            selectedColumn={column} highlightedColumns={findingColumns} onSelectColumn={highlightColumn}
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
        <h2>{showDraftValues ? 'Draft preview' : external ? 'External release' : 'Candidate'}{!showDraftValues && protectedLabel ? <> · {protectedLabel}</> : null}</h2>
        <span className="pane-meta">
          {showDraftValues ? <>{recipeLabel(draftSteps)} · {visibleProtectedRows.length} preview rows · full assessment pending</> : active ? <>{external ? 'unknown mechanism' : recipeLabel(active.recipe.steps)} · {num(active.rowCount, 0)} rows · {plural(active.columns.length, 'column')}</> : 'No candidate yet'}
        </span>
        {recipeEdited ? <span className="pane-tag">Assessment pending</span> : active ? <span className="pane-tag">{active.alignment === 'verified' ? 'Verified pairing' : 'Unknown pairing'}<Term id={active.alignment === 'verified' ? 'paired' : 'unpaired'} label="pairing" /></span> : null}
      </header>
      {recipeEdited ? <p className="pane-note" role="status">{showDraftValues
        ? 'Draft preview · full assessment pending. These values update on the preview rows only. Privacy and utility measurements still describe the last evaluated snapshot.'
        : draft && !draft.supported
          ? `Draft not previewed: ${draft.unsupportedMethods.join(', ')} require the full service. These values belong to ${protectedLabel ?? 'the last evaluated snapshot'}. Apply and evaluate to refresh.`
          : `Draft recipe changed. Charts still describe ${protectedLabel ?? 'the last evaluated snapshot'}. Apply and evaluate to refresh full measurements.`}
        {draft?.warnings.length ? <> {draft.warnings.join(' ')}</> : null}</p> : note ? <p className="pane-note">{note}</p> : null}
      <div className="pane-body">
        {!active && !showDraftValues ? (
          <NoCandidate />
        ) : tab === 'table' ? (
          <DataTable
            side="protected" caption={showDraftValues ? 'Draft protected preview, full dataset assessment pending' : `${external ? 'External release' : 'Candidate'} ${protectedLabel} preview, first ${visibleProtectedRows.length} rows`}
            columns={protectedColumns} rows={visibleProtectedRows} compareTo={aligned ? dataset.preview : undefined} aligned={aligned}
            hoverRow={hoverRow} onHoverRow={setHoverRow} scrollRef={rightScroll} onScroll={sync(rightScroll, leftScroll)}
            selectedColumn={column} highlightedColumns={findingColumns} onSelectColumn={highlightColumn}
          />
        ) : tab === 'dist' ? (dist ? <DistributionChart dist={dist} side="protected" sourceUnit={sourceUnit} /> : <NoViz />)
          : tab === 'corr' ? <CorrelationMatrix correlations={active!.utility.correlations} side="protected" />
            : (
              <>
                <CohortBars queries={active!.utility.queries} side="protected" workload={active!.workload} schema={active!.schema} />
                <SubgroupTable subgroups={active!.utility.subgroups} worst={active!.utility.worstSubgroup} alignment={active!.alignment} />
              </>
            )}
      </div>
      {(active || showDraftValues) && tab === 'table' ? (
        <p className="pane-foot">
          {showDraftValues ? 'Preview values only: no full-data risk, group-size or utility result is inferred. Apply and evaluate to create an exportable snapshot.' : aligned
            ? 'Rows correspond one-to-one (verified), so changed cells are highlighted.'
            : external && active?.alignment === 'verified'
              ? 'Owner correspondence is verified for evaluation, but these previews retain file order. Row-by-row highlighting is unavailable.'
            : 'Rows are independent: no identity correspondence is shown or implied. Compare columns, not rows.'}
        </p>
      ) : null}
    </section>
  );

  return (
    <div className={`wb${active ? '' : ' wb-unassessed'}`}>
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
        {ws.deployment.uploadsAllowed ? <button type="button" className="btn" title="Import CSV, JSON or XLSX" disabled={sessionBusy} onClick={() => dialogs.open('import')}><FileUp size={15} />Import table</button> : null}
        {!reviewed ? <button type="button" className="btn" onClick={() => dialogs.open('review')}><ClipboardCheck size={15} />Review classifications<span className="attn-dot" aria-hidden="true" /></button> : null}
        <button
          type="button" className="btn tool-demo" title="Load the semantic ambiguity demo" aria-label="Semantic example: semantic ambiguity demo" disabled={sessionBusy}
          onClick={() => ws.requestReplace('the semantic ambiguity demo', () => void ws.loadDemo('semantic'))}
        ><ScanSearch size={15} />Semantic example</button>
        {pending ? (
          <button type="button" className="btn" onClick={() => ws.cancel(busy.apply ? 'apply' : 'assess')}><Square size={13} fill="currentColor" />Stop waiting</button>
        ) : null}
        <button type="button" className={`btn primary${busy.apply ? ' busy' : recipeEdited ? ' sheen' : ''}`} disabled={busy.apply || !reviewed} onClick={() => void ws.apply()}>
          <Play size={14} fill="currentColor" />{busy.apply ? 'Evaluating…' : 'Apply and evaluate'}
        </button>
      </ToolbarSlot>
      <InspectorSlot><RecipeInspector /></InspectorSlot>

      <div className={`panes-wrap${pending ? ' is-pending' : stale.length ? ' is-stale' : ''}`} {...panelProps(tabId, tab)}>
        <EvidenceBanner />
        {active ? <Hero recipeEdited={recipeEdited} /> : null}
        <div className={`panes${showOriginal && showProtected ? '' : ' single'}`}>
          {showOriginal ? originalPane : null}
          {showProtected ? protectedPane : null}
        </div>
        {!active ? <Hero recipeEdited={recipeEdited} /> : null}
        <SemanticPanel key={dataset.datasetId} selectedColumn={column} onSelectColumn={highlightColumn} onSelectColumns={highlightColumns} />
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
