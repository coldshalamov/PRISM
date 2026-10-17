import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck, Download, FileUp, HelpCircle, Keyboard, Library as LibraryIcon, Menu as MenuIcon, PanelLeft,
  PanelRight, RotateCcw, ScanSearch, ShieldCheck, Trash2, FlaskConical, Play, Database, X, Beaker,
} from 'lucide-react';
import { DialogContext, useDialogs } from '../dialogs';
import type { DialogId } from '../dialogs';
import { isFictional } from '../deployment';
import { trapTab, useMedia } from '../hooks';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Toasts, Skeleton } from '../ui/Feedback';
import { MenuBar, MenuButton } from '../ui/Menu';
import type { MenuItem } from '../ui/Menu';
import { SlotContext } from '../ui/Slots';
import { useWorkspace } from '../workspace';
import { isAudit } from '../analysis';
import { Logo } from '../ui/Logo';
import { DeploymentBanner } from './DeploymentBanner';
import { Brand, Library, NAV, Rail, SessionFooter } from './Sidebar';
import { ImportDialog, ClearDialog, PrivacyDialog, ShortcutsDialog, PresetDialog, ReplaceDialog } from './Dialogs';
import { SchemaReview } from './SchemaReview';
import type { ViewId } from '../types';

const Workbench = lazy(() => import('../views/Workbench'));
const KnowledgeMap = lazy(() => import('../views/KnowledgeMap'));
const AttackLab = lazy(() => import('../views/AttackLab'));
const ResearchIntent = lazy(() => import('../views/ResearchIntent'));
const ParetoExplorer = lazy(() => import('../views/ParetoExplorer'));
const Report = lazy(() => import('../views/Report'));

const VIEW_COMPONENTS: Record<ViewId, React.LazyExoticComponent<() => React.JSX.Element>> = {
  workbench: Workbench, map: KnowledgeMap, lab: AttackLab, intent: ResearchIntent, pareto: ParetoExplorer, report: Report,
};

/* Menus are rebuilt on every render on purpose: each action closes over the current recipe, attacker
   assumptions and research questions, so a memoised menu could evaluate an out-of-date recipe. */
function useAppMenus(): { id: string; label: string; items: MenuItem[] }[] {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const { dataset, active, prefs, setPrefs, busy, deployment } = ws;
  const sessionBusy = Object.values(busy).some(Boolean);
  const uploadHint = deployment.uploadsAllowed ? undefined : deployment.uploadsNote;
  const exportItem = (id: string, label: string, format: 'html' | 'json' | 'recipe' | 'csv', hint: string): MenuItem => ({
    id, label, hint, icon: <Download size={15} />, disabled: !active || sessionBusy || ws.stale.length > 0 || !ws.reviewed || ws.sessionLost,
    onSelect: () => { if (format === 'csv') ws.setView('report'); else if (active) void ws.exportCandidate(active.candidateId, format); },
  });
  return [
    {
      id: 'file', label: 'File', items: [
        { id: 'demo', label: 'Open fictional oncology demo', hint: '5,000 records', icon: <Database size={15} />, onSelect: () => ws.requestReplace('the fictional oncology demo', () => void ws.loadDemo('architecture')) },
        { id: 'kit', label: 'Open fictional benchmark', hint: '480 records with exact-linkage replay', icon: <Beaker size={15} />, onSelect: () => ws.requestReplace('the fictional benchmark', () => void ws.loadDemo('kit')) },
        { id: 'import', label: 'Import data…', hint: uploadHint, icon: <FileUp size={15} />, disabled: sessionBusy || !deployment.uploadsAllowed, onSelect: () => dialogs.open('import') },
        { id: 'audit', label: 'Audit protected table…', hint: uploadHint, icon: <ScanSearch size={15} />, disabled: sessionBusy || !dataset || !deployment.uploadsAllowed, onSelect: () => dialogs.open('audit') },
        { id: 's1', separator: true },
        exportItem('x-html', 'Download evidence report (HTML)', 'html', 'Measured results, coverage and limits'),
        exportItem('x-json', 'Download evidence report (JSON)', 'json', 'Machine-readable'),
        exportItem('x-recipe', 'Download recipe (JSON)', 'recipe', 'Transformation steps only'),
        exportItem('x-csv', 'Download protected CSV', 'csv', 'Blocked while direct identifiers remain'),
        { id: 's2', separator: true },
        { id: 'clear', label: deployment.hosted ? 'Clear session…' : 'Clear local session…', icon: <Trash2 size={15} />, danger: true, disabled: !dataset, onSelect: () => dialogs.open('clear') },
      ],
    },
    {
      id: 'data', label: 'Data', items: [
        { id: 'review', label: 'Review classifications…', icon: <ClipboardCheck size={15} />, disabled: !dataset, onSelect: () => dialogs.open('review') },
        { id: 'apply', label: 'Apply and evaluate recipe', icon: <Play size={15} />, shortcut: 'Ctrl+↵', disabled: !dataset || sessionBusy, onSelect: () => { ws.setView('workbench'); void ws.apply(); } },
        { id: 'reset', label: 'Reset to the service default recipe', icon: <RotateCcw size={15} />, disabled: !dataset, onSelect: () => ws.requestPreset('default') },
        { id: 's3', separator: true },
        { id: 'search', label: 'Find better configurations', icon: <FlaskConical size={15} />, disabled: !dataset || !ws.reviewed, onSelect: () => ws.setView('pareto') },
      ],
    },
    {
      id: 'view', label: 'View', items: [
        { id: 'lib', label: 'Library', icon: <PanelLeft size={15} />, shortcut: '[', checked: prefs.library, onSelect: () => setPrefs({ library: !prefs.library }) },
        { id: 'insp', label: 'Inspector', icon: <PanelRight size={15} />, shortcut: ']', checked: prefs.inspector, onSelect: () => setPrefs({ inspector: !prefs.inspector }) },
        { id: 'led', label: 'Measurement ledger', checked: prefs.ledger, onSelect: () => setPrefs({ ledger: !prefs.ledger }) },
        { id: 's4', separator: true },
        ...NAV.map(item => ({ id: `nav-${item.id}`, label: item.label, icon: item.icon, shortcut: `Alt+${item.key}`, onSelect: () => ws.setView(item.id) })),
      ],
    },
    {
      id: 'help', label: 'Help', items: [
        { id: 'privacy', label: 'Privacy and limits', icon: <ShieldCheck size={15} />, onSelect: () => dialogs.open('privacy') },
        { id: 'keys', label: 'Keyboard shortcuts', icon: <Keyboard size={15} />, shortcut: '?', onSelect: () => dialogs.open('shortcuts') },
        { id: 'methods', label: 'Attack and method registry', icon: <HelpCircle size={15} />, onSelect: () => ws.setView('lab') },
      ],
    },
  ];
}

/* Prepare a candidate versus audit someone else's release: two different workflows with different
   evidence, so the mode is always visible and the source is never mistaken for the export target.
   Auditing needs an uploaded protected file, so it is unavailable wherever uploads are off. */
function ModeSelector() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  const sessionBusy = Object.values(ws.busy).some(Boolean);
  const mode = ws.active && isAudit(ws.active) ? 'audit' : 'create';
  const lastAudit = [...ws.candidates].reverse().find(candidate => isAudit(candidate));
  const auditBlocked = !lastAudit && !ws.deployment.uploadsAllowed;
  const choose = (next: 'create' | 'audit') => {
    if (next === 'create') {
      const last = [...ws.candidates].reverse().find(candidate => !isAudit(candidate));
      if (last) ws.select(last.candidateId);
      ws.setView('workbench');
    } else if (lastAudit) {
      ws.select(lastAudit.candidateId);
      ws.setView('workbench');
    } else dialogs.open('audit');
  };
  return (
    <div className="seg dark mode-seg" role="radiogroup" aria-label="Workflow mode">
      <button type="button" role="radio" aria-checked={mode === 'create'} className={mode === 'create' ? 'active' : ''} disabled={sessionBusy || !ws.dataset} onClick={() => choose('create')}>Prepare</button>
      <button
        type="button" role="radio" aria-checked={mode === 'audit'} className={mode === 'audit' ? 'active' : ''}
        disabled={sessionBusy || !ws.dataset || auditBlocked} title={auditBlocked ? ws.deployment.uploadsNote : undefined} onClick={() => choose('audit')}
      >Audit</button>
    </div>
  );
}

function SessionBanner() {
  const ws = useWorkspace();
  const dialogs = useDialogs();
  return (
    <>
      {ws.sessionLost ? (
        <div className="session-banner" role="alert">
          <div>
            <b>This {ws.deployment.hosted ? '' : 'local '}session ended.</b>
            <span> The service no longer holds the dataset or candidates shown here (it restarted, expired, or was cleared elsewhere). Numbers on screen are from the earlier session and cannot be re-evaluated or exported.</span>
          </div>
          <span className="session-actions">
            <button type="button" className="btn small primary" onClick={() => ws.recoverSession()}>Start over with the demo</button>
            {ws.deployment.uploadsAllowed ? <button type="button" className="btn small" disabled={Object.values(ws.busy).some(Boolean)} onClick={() => dialogs.open('import')}>Import data…</button> : null}
          </span>
        </div>
      ) : null}
      {ws.limitReached && !ws.sessionLost ? (
        <div className="session-banner" role="status">
          <div>
            <b>{ws.storedCandidateCount >= (ws.healthInfo?.maxCandidates ?? 40) ? 'Stored-candidate limit reached' : 'Candidate capacity blocked a request'} ({ws.storedCandidateCount} known saved / {ws.healthInfo?.maxCandidates ?? 40}).</b>
            <span> Baselines and search results also use capacity. Try a smaller search if space remains, or download evidence you want to keep from Report before clearing the session.</span>
          </div>
          <span className="session-actions">
            {ws.active ? <button type="button" className="btn small" onClick={() => ws.setView('report')}>Open Report to download</button> : null}
            <button type="button" className="btn small primary" onClick={() => dialogs.open('clear')}>{ws.deployment.hosted ? 'Clear session…' : 'Clear local session…'}</button>
          </span>
        </div>
      ) : null}
      {ws.storageError && !ws.sessionLost ? (
        <div className="session-banner" role="alert">
          <div>
            <b>Session storage could not complete the request.</b>
            <span> {ws.storageError} Earlier snapshots on screen remain untouched. You can retry, or clear the session and reload the fictional demo.</span>
          </div>
          <span className="session-actions">
            <button type="button" className="btn small" onClick={() => void ws.recoverSession(true)}>Clear and reload demo</button>
            <button type="button" className="btn small" onClick={() => dialogs.open('clear')}>{ws.deployment.hosted ? 'Clear session…' : 'Clear local session…'}</button>
            <button type="button" className="btn small" onClick={() => ws.dismissStorageError()}>Dismiss</button>
          </span>
        </div>
      ) : null}
    </>
  );
}

function TopBar({ small, onLibrary, onInspector }: { small: boolean; onLibrary: () => void; onInspector: () => void }) {
  const { dataset, health, healthInfo, active, labelOf, deployment } = useWorkspace();
  const menus = useAppMenus();
  const flat = menus.flatMap(menu => [...menu.items, { id: `sep-${menu.id}`, separator: true }]).slice(0, -1) as MenuItem[];
  const fictional = isFictional(deployment, dataset);
  const modeText = health === 'checking' ? (deployment.hosted ? 'Hosted workbench · connecting' : 'Connecting')
    : health === 'down' ? 'Offline'
      : deployment.kind === 'hosted' ? deployment.label : deployment.kind === 'remote' ? 'Remote origin' : 'Local';
  return (
    <header className="topbar">
      {small ? <Logo size={26} /> : null}
      {small ? <button type="button" className="icon-btn dark" aria-label="Open library" onClick={onLibrary}><LibraryIcon size={18} /></button> : null}
      <div className="doc-title">
        <span className="doc-name" title={dataset?.name}>{dataset ? dataset.name : 'PRISM'}</span>
        {dataset ? (
          <span className="doc-meta">
            {fictional ? <span className="doc-synth">Fictional data</span> : <span className="doc-real">Imported data</span>}
            {active ? <span> · {labelOf(active.candidateId)}</span> : null}
          </span>
        ) : null}
      </div>
      {small ? (
        <MenuButton className="icon-btn dark" ariaLabel="Application menu" icon={<MenuIcon size={18} />} caret={false} align="right" items={flat} />
      ) : <MenuBar menus={menus} />}
      <div className="topbar-spacer" />
      {!small ? <ModeSelector /> : null}
      <span
        className={`health-line ${health} ${deployment.kind}`} role="status"
        title={`${deployment.label}${health === 'ok' && healthInfo?.version ? ` · service ${healthInfo.version}` : ''}`}
      >
        <span className={`dot ${health}`} aria-hidden="true" />
        {modeText}
      </span>
      <button type="button" className="icon-btn dark" aria-label="Toggle inspector" onClick={onInspector}><PanelRight size={18} /></button>
    </header>
  );
}

function BottomNav() {
  const { view, setView } = useWorkspace();
  return (
    <nav className="bottom-nav" aria-label="Views">
      {NAV.map(item => (
        <a key={item.id} href={`#/${item.id}`} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined}
          onClick={event => { event.preventDefault(); setView(item.id); }}>
          <span aria-hidden="true">{item.icon}</span>{item.short}
        </a>
      ))}
    </nav>
  );
}

function DialogHost({ current, close }: { current: DialogId | null; close: () => void }) {
  if (current === 'import') return <ImportDialog initial="original" onClose={close} />;
  if (current === 'audit') return <ImportDialog initial="audit" onClose={close} />;
  if (current === 'review') return <SchemaReview onClose={close} />;
  if (current === 'clear') return <ClearDialog onClose={close} />;
  if (current === 'privacy') return <PrivacyDialog onClose={close} />;
  if (current === 'shortcuts') return <ShortcutsDialog onClose={close} />;
  return null;
}

export default function Shell() {
  const ws = useWorkspace();
  const { view, setView, prefs, setPrefs, dataset, bootError, busy, deployment } = ws;
  const wide = useMedia('(min-width: 1360px)');
  const overlayInspector = !useMedia('(min-width: 1000px)');
  const small = !useMedia('(min-width: 720px)');
  const [dialog, setDialog] = useState<DialogId | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);
  const [inspector, setInspector] = useState<HTMLElement | null>(null);
  const main = useRef<HTMLElement | null>(null);
  const controls = useMemo(() => ({ open: setDialog, close: () => setDialog(null), current: dialog }), [dialog]);
  const slots = useMemo(() => ({ toolbar, inspector }), [toolbar, inspector]);

  const libraryDocked = wide && prefs.library;
  const inspectorDocked = !overlayInspector && prefs.inspector;
  const drawerOpen = drawer && !libraryDocked;
  const sheetOpen = sheet && overlayInspector;

  /* Overlays (library drawer, inspector sheet) take focus when they open and give it back when they close.
     The opener is remembered before the overlay moves focus into itself. */
  const opener = useRef<HTMLElement | null>(null);
  const overlayWasOpen = useRef(false);
  const overlayOpen = drawerOpen || sheetOpen;
  useEffect(() => {
    if (overlayWasOpen.current && !overlayOpen) opener.current?.focus?.();
    overlayWasOpen.current = overlayOpen;
  }, [overlayOpen]);
  const toggleInspector = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    if (overlayInspector) setSheet(value => !value);
    else setPrefs({ inspector: !prefs.inspector });
  }, [overlayInspector, prefs.inspector, setPrefs]);
  const toggleLibrary = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    if (!wide) setDrawer(value => !value);
    else setPrefs({ library: !prefs.library });
  }, [prefs.library, setPrefs, wide]);

  /* global keyboard shortcuts; none of them acts behind an open modal dialog */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.altKey && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        setView(NAV[Number(event.key) - 1].id);
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && view === 'workbench' && dataset && !Object.values(busy).some(Boolean)) {
        event.preventDefault();
        void ws.apply();
      } else if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === '[') toggleLibrary();
        else if (event.key === ']') toggleInspector();
        else if (event.key === '?') setDialog('shortcuts');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy.apply, dataset, setView, toggleInspector, toggleLibrary, view, ws]);

  /* pointer-tracked spotlight for [data-spot] surfaces */
  useEffect(() => {
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-spot]');
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        target.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => { setDrawer(false); setSheet(false); }, [view]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { setDrawer(false); setSheet(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* A view change is announced and titled, and a long page starts at its top. */
  const viewLabel = NAV.find(item => item.id === view)?.label ?? 'Workbench';
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    document.title = `${viewLabel} · PRISM${deployment.hosted ? ` · ${deployment.label}` : ''}`;
    main.current?.scrollTo({ top: 0 });
    setAnnouncement(`${viewLabel} view`);
  }, [deployment.hosted, deployment.label, view, viewLabel]);

  /* Long evaluations and their results are spoken, not only drawn: pending state, the snapshot now shown, and a finished search. */
  const evaluating = busy.apply || busy.assess || busy.search;
  const activeId = ws.active?.candidateId ?? null;
  const activeLabel = activeId ? ws.labelOf(activeId) : '';
  const lastActive = useRef<string | null>(null);
  useEffect(() => { if (evaluating) setAnnouncement(busy.search ? 'Searching candidate recipes. Earlier snapshots stay unchanged.' : 'Evaluating on the full dataset. The numbers shown are the previous snapshot.'); }, [busy.search, evaluating]);
  useEffect(() => {
    if (activeId && activeId !== lastActive.current && !evaluating) setAnnouncement(`Showing ${activeLabel}.`);
    lastActive.current = activeId;
  }, [activeId, activeLabel, evaluating]);
  const searchedId = ws.search?.jobId ?? null;
  useEffect(() => { if (searchedId) setAnnouncement(`Search finished: ${ws.search?.evaluated ?? 0} candidates evaluated.`); }, [searchedId, ws.search?.evaluated]);

  const View = VIEW_COMPONENTS[view];
  const classes = [
    'app',
    wide && prefs.library ? 'lib-open' : 'lib-compact',
    inspectorDocked ? 'insp-open' : 'insp-closed',
    small ? 'is-small' : '',
    deployment.hosted ? 'is-hosted' : '',
  ].join(' ');

  return (
    <DialogContext.Provider value={controls}>
      <SlotContext.Provider value={slots}>
        <div className={classes}>
          <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus(); }}>Skip to content</a>

          <aside className="rail" aria-label="Navigation and library">
            <Brand />
            <Rail compact={!libraryDocked} />
            {libraryDocked ? <Library /> : <div className="rail-spacer" />}
            {libraryDocked ? <SessionFooter /> : (
              <button type="button" className="rail-compact-btn" onClick={toggleLibrary} aria-label="Open library"><LibraryIcon size={18} /></button>
            )}
          </aside>

          <TopBar small={small} onLibrary={toggleLibrary} onInspector={toggleInspector} />

          <div className="toolbar" ref={setToolbar} role="toolbar" aria-label="View tools" />

          <main id="main" className="canvas" tabIndex={-1} ref={main}>
            {!noticeDismissed ? <DeploymentBanner onDismiss={() => setNoticeDismissed(true)} /> : null}
            <SessionBanner />
            {bootError && !dataset ? (
              <div className="boot-error" role="alert">
                <span><b>The synthetic demo could not be loaded.</b> {bootError}</span>
                <button type="button" className="btn" disabled={busy.boot} onClick={() => void ws.loadDemo('architecture')}>{busy.boot ? 'Retrying…' : 'Retry'}</button>
                {ws.health === 'down' ? <small className="muted">PRISM keeps checking and will retry on its own when the service is back.</small> : null}
              </div>
            ) : null}
            <ErrorBoundary resetKey={view} onHome={() => setView('workbench')}>
              <Suspense fallback={<div className="view-loading" role="status" aria-label={`Loading ${viewLabel}`}><Skeleton lines={5} height={18} /></div>}>
                <div key={view} className="view reveal"><View /></div>
              </Suspense>
            </ErrorBoundary>
          </main>

          <aside
            className={`inspector${sheetOpen ? ' sheet-open' : ''}${overlayInspector ? ' overlay' : ''}`}
            ref={setInspector}
            aria-label="Inspector"
            onKeyDown={event => { if (sheetOpen) trapTab(event, event.currentTarget); }}
          >
            {sheetOpen ? (
              <button type="button" className="sheet-close icon-btn" aria-label="Close inspector" autoFocus onClick={() => setSheet(false)}><X size={18} /></button>
            ) : null}
          </aside>

          {small ? <BottomNav /> : null}
          {drawerOpen ? (
            <div className="drawer-scrim" onPointerDown={() => setDrawer(false)}>
              <div
                className="drawer" onPointerDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Library"
                onKeyDown={event => trapTab(event, event.currentTarget)}
              >
                <button type="button" className="icon-btn dark drawer-close" aria-label="Close library" autoFocus onClick={() => setDrawer(false)}><X size={18} /></button>
                <Library onPick={() => setDrawer(false)} />
                <SessionFooter />
              </div>
            </div>
          ) : null}
          {sheetOpen ? <div className="sheet-scrim" onPointerDown={() => setSheet(false)} aria-hidden="true" /> : null}
          <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
        </div>
        <DialogHost current={dialog} close={controls.close} />
        <PresetDialog />
        <ReplaceDialog />
        <Toasts />
      </SlotContext.Provider>
    </DialogContext.Provider>
  );
}
