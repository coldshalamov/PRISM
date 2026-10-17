import { useMemo, useState } from 'react';
import { Check, CircleDashed, ExternalLink, Minus, Search, TriangleAlert } from 'lucide-react';
import { num, title } from '../../format';
import type { Registry, RegistryEntry } from '../../types';
import { EvidenceBanner } from '../../ui/EvidenceBanner';
import { Empty, Notice } from '../../ui/Feedback';
import { Tip } from '../../ui/Tip';
import { useWorkspace } from '../../workspace';

export function Capability({ status, label }: { status?: string; label?: string }) {
  const kind = status === 'implemented' ? 'implemented' : status === 'partial' ? 'partial' : status === 'error' ? 'error' : 'uncovered';
  const text = label ?? (status === 'implemented' ? 'Implemented' : status === 'partial' ? 'Partial' : status === 'unsupported' ? 'Unsupported' : status ? title(status) : 'Not assessed');
  return <span className={`al-capability ${kind}`}>{kind === 'implemented' ? <Check size={12} /> : kind === 'partial' ? <Minus size={12} /> : kind === 'error' ? <TriangleAlert size={12} /> : <CircleDashed size={12} />}<span>{text}</span></span>;
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
}

function sourceOf(entry: RegistryEntry, registry: Registry): string | null {
  const source = entry.sourceUrl ?? (typeof entry.source === 'string' && /^https?:\/\//i.test(entry.source) ? entry.source : registry.sources?.find(item => item.id === entry.sourceId)?.url);
  if (!source) return null;
  try { const url = new URL(source); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

function SourceLink({ entry, registry }: { entry: RegistryEntry; registry: Registry }) {
  const source = sourceOf(entry, registry);
  const refEntry = registry.sources?.find(item => item.id === entry.sourceId);
  const citation = refEntry?.title ?? (typeof entry.source === 'string' && !/^https?:\/\//i.test(entry.source) ? entry.source : null);
  return (
    <div className="al-source-block">
      {citation ? <span className="al-source-citation">Reference: {citation}</span> : null}
      {source ? (
        <a className="al-source-link" href={source} target="_blank" rel="noreferrer noopener">
          Open source link <ExternalLink size={12} aria-hidden="true" /><span className="sr-only"> in a new tab</span>
        </a>
      ) : !citation ? <span className="al-reference-unavailable">No source URL supplied</span> : null}
    </div>
  );
}

function EntryDetails({ entry, registry, family = false }: { entry: RegistryEntry; registry: Registry; family?: boolean }) {
  const ws = useWorkspace();
  const aliases = entry.aliases ?? [];
  const analyses = (registry.engineAnalyses ?? []).filter(analysis => aliases.includes(analysis.id));
  const findings = family ? ws.active?.risk.findings.filter(finding => aliases.includes(finding.attackId ?? '') || finding.attackId === entry.id) ?? [] : [];
  const assumptions = list(entry.assumptions);
  const controls = [...new Set([...list(entry.controls), ...list(entry.control)])];
  const limits = [...new Set([...list(entry.limitations), ...list(entry.limitation)])];
  return <div className="al-register-detail">
    {entry.summary ? <p>{entry.summary}</p> : null}
    <dl>
      {entry.implemented ? <><dt>Implemented portion</dt><dd>{entry.implemented}</dd></> : null}
      {entry.description && entry.description !== entry.implemented && entry.description !== entry.summary ? <><dt>Description</dt><dd>{entry.description}</dd></> : null}
      {entry.applicability ? <><dt>Applicability</dt><dd>{entry.applicability}</dd></> : null}
      {assumptions.length ? <><dt>Assumptions</dt><dd><ul>{assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></dd></> : null}
      {controls.length ? <><dt>Controls</dt><dd><ul>{controls.map((item, index) => <li key={index}>{item}</li>)}</ul></dd></> : null}
      {entry.mitigation ? <><dt>Mitigation / response</dt><dd>{entry.mitigation}</dd></> : null}
      {entry.scientific_tradeoff ? <><dt>Research tradeoff</dt><dd>{entry.scientific_tradeoff}</dd></> : null}
      {entry.engineMethod ? <><dt>Engine method</dt><dd><code>{entry.engineMethod}</code></dd></> : null}
      {limits.length ? <><dt>Limitations</dt><dd><ul>{limits.map((limit, index) => <li key={index}>{limit}</li>)}</ul></dd></> : null}
    </dl>
    {family ? <div className="al-aliases"><h4>Mapped engine analyses</h4>{analyses.length ? <ul>{analyses.map(analysis => <li key={analysis.id}><span>{analysis.name ?? analysis.id}</span><Capability status={analysis.status} /></li>)}</ul> : <p>No executable analysis is mapped to this family.</p>}<p className="al-note">Aliases organize the catalogue. They do not mean every part of the broad family was tested.</p></div> : null}
    {family ? <div className="al-candidate-findings"><h4>{ws.active ? `Mapped findings in ${ws.labelOf(ws.active.candidateId)}` : 'Candidate evidence'}</h4>{findings.length ? <ul>{findings.map(finding => <li key={finding.id}><Capability status={finding.status} label={finding.status === 'implemented' ? 'Measured' : undefined} /><p>{finding.narrative}</p>{finding.caveats?.length ? <small>{finding.caveats.join(' ')}</small> : null}</li>)}</ul> : <p>{ws.active ? 'No matching finding was returned for this snapshot. The family has not passed.' : 'No candidate is selected. Catalogue capabilities are independent of candidate measurements.'}</p>}</div> : null}
    <SourceLink entry={entry} registry={registry} />
  </div>;
}

function RegisterRows({ entries, registry, family = false }: { entries: RegistryEntry[]; registry: Registry; family?: boolean }) {
  return <div className="al-register-rows">{entries.map((entry, index) => <details className="al-register-row" key={entry.id}><summary><span className="al-register-number">{String(index + 1).padStart(2, '0')}</span><span className="al-register-title"><b>{entry.name ?? title(entry.id)}</b><small>{entry.implemented ?? entry.summary ?? entry.description ?? entry.limitation ?? 'Open for scope and limitations'}</small></span><Tip content={entry.status === 'implemented' ? 'This capability exists. Its status does not establish that it ran on your candidate or that a release is cleared.' : entry.status === 'partial' ? 'Only the specifically described portion of this family is implemented. The rest remains uncovered.' : 'No completed evaluation is inferred. Unsupported or unavailable capability is not a passing result.'}><Capability status={entry.status} /></Tip></summary><EntryDetails entry={entry} registry={registry} family={family} /></details>)}</div>;
}

export function ThreatRegister({ registry }: { registry: Registry }) {
  const ws = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return registry.attacks.filter(entry => (status === 'all' || entry.status === status) && (!needle || [entry.name, entry.id, entry.summary, entry.implemented, entry.mitigation, entry.searchText, ...(entry.aliases ?? [])].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle)));
  }, [registry, query, status]);
  const implemented = registry.attacks.filter(entry => entry.status === 'implemented').length;
  const partial = registry.attacks.filter(entry => entry.status === 'partial').length;
  const unsupported = registry.attacks.filter(entry => entry.status === 'unsupported').length;
  return <section className="al-register">
    <div className="al-register-counts"><div><strong>{num(registry.attacks.length, 0)}</strong><span>threat families</span></div><div><strong>{num(implemented, 0)}</strong><span>implemented scope</span></div><div><strong>{num(partial, 0)}</strong><span>partial scope</span></div><div><strong>{num(unsupported, 0)}</strong><span>unsupported</span></div></div>
    <p className="al-register-caveat"><b>Catalogue coverage is not candidate execution:</b> not all {num(registry.attacks.length, 0)} threat families are executed. Only the implemented or partial analyses mapped to returned findings run on a candidate; unsupported families remain unassessed.</p>
    <Notice tone="warn" title="Genomic and family inference are uncovered.">Tabular uniqueness and generalization do not evaluate variant linkage, relatives, trajectories or operational external record linkage. The fictional linkage demonstration does not close those gaps.</Notice>
    {ws.active ? <EvidenceBanner compact /> : null}
    <div className="al-register-controls"><label className="al-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Search threat families</span><input type="search" placeholder="Search threats, methods, limitations…" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="al-status-filter"><span className="sr-only">Filter threat implementation status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="implemented">Implemented</option><option value="partial">Partial</option><option value="unsupported">Unsupported</option></select></label><span role="status">{num(filtered.length, 0)} of {num(registry.attacks.length, 0)}</span></div>
    {filtered.length ? <RegisterRows entries={filtered} registry={registry} family /> : <Empty title="No threat families match">Try a broader search or choose all statuses. No capability or candidate measurement has changed.</Empty>}
    <p className="al-register-caveat">{registry.warning ?? 'Coverage is method-specific. A missing or unsupported analysis is unassessed, never release clearance.'}</p>
  </section>;
}

export function CoverageRegister({ registry }: { registry: Registry }) {
  const [query, setQuery] = useState('');
  const protections = (registry.protectionCatalog ?? []).filter(entry => !query.trim() || [entry.name, entry.summary, entry.engineMethod, entry.searchText].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="al-coverage">
    <section className="al-coverage-section"><header><h2>{num(registry.protectionCatalog?.length, 0)} protection approaches</h2><p>Educational catalogue entries map to explicit engine methods. They are distinct from threat families and attack analyses.</p></header><label className="al-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Search protection catalogue</span><input type="search" placeholder="Find a protection approach…" value={query} onChange={event => setQuery(event.target.value)} /></label>{registry.protectionCatalog ? protections.length ? <RegisterRows entries={protections} registry={registry} /> : <Empty title="No protection approaches match">Try another term.</Empty> : <Notice>The protection catalogue was not supplied by the service.</Notice>}</section>
    <section className="al-coverage-section"><header><h2>Installed is different from executed.</h2><p>These are runtime adapter statuses returned by the service. A package can be present while its PRISM integration is unavailable.</p></header><div className="al-integrations">{registry.integrations.map(entry => <article key={entry.id}><header><h3>{entry.name ?? entry.id}</h3><Capability status={entry.status} label={entry.status === 'implemented' && entry.runtimeTested === true ? 'Runtime smoke tested' : entry.status === 'implemented' ? 'Status needs verification' : entry.status === 'unsupported' ? 'Uncovered' : undefined} /></header><p>{entry.limitation ?? entry.description ?? entry.applicability ?? 'No runtime adapter evidence was supplied.'}</p><dl><div><dt>Package</dt><dd>{entry.installed === true ? `Installed${typeof entry.version === 'string' ? ` · ${entry.version}` : ''}` : entry.installed === false ? 'Not installed' : 'Not established'}</dd></div><div><dt>Runtime test</dt><dd>{entry.runtimeTested === true ? 'Executed fixture smoke test' : 'Not executed'}</dd></div></dl>{typeof entry.error === 'string' ? <p className="risk-text">{entry.error}</p> : null}<SourceLink entry={entry} registry={registry} /></article>)}</div></section>
    <section className="al-coverage-section"><header><h2>Engine analyses behind the family aliases</h2><p>Separate analysis entries name the algorithms and controls that broad threat families reference. Native analyses do not require an optional engine.</p></header>{registry.engineAnalyses?.length ? <RegisterRows entries={registry.engineAnalyses} registry={registry} /> : <Notice>No executable analysis catalogue was supplied.</Notice>}</section>
  </div>;
}
