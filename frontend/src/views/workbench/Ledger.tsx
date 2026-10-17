import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { findingCoverage, isAudit, isLinkageFinding, linkageOf, queryOutcome, rowCountNote, STALE_LABEL } from '../../analysis';
import { num, numDelta, pct, pointsDelta } from '../../format';
import { queryValue, resultUnit } from '../intent/QueryResults';
import { Empty, Notice } from '../../ui/Feedback';
import { Facts } from '../../ui/Facts';
import { NumberTicker } from '../../ui/NumberTicker';
import { Status } from '../../ui/Status';
import { Tabs, panelProps } from '../../ui/Tabs';
import { Term } from '../../ui/Tip';
import { useWorkspace } from '../../workspace';
import type { Candidate, Finding } from '../../types';

type LedgerTab = 'measures' | 'queries' | 'findings';

export interface Measure {
  id: string;
  label: string;
  glossary: string;
  from: number | null;
  to: number | null;
  /** Shown instead of a number when the measure does not apply; never rendered as zero. */
  naText?: string;
  fromText?: string;
  toText?: string;
  format: (value: number) => string;
  higherIsBetter: boolean;
  bar?: boolean;
  delta?: (from: number, to: number) => string;
}

/** Fraction of source rows missing from a release; unknown (never zero) when the source size is unknown. */
function rowsMissing(candidate: Candidate, originalRows: number): number | null {
  if (typeof candidate.suppression_rate === 'number') return candidate.suppression_rate;
  return originalRows > 0 ? (originalRows - candidate.rowCount) / originalRows : null;
}

export function measuresFor(candidate: Candidate, baseline: Candidate | null, originalRows: number, membershipKnown: boolean | null): Measure[] {
  const m = candidate.risk.metrics;
  const b = baseline?.risk.metrics;
  const membershipUnavailable = membershipKnown === null ? 'Not returned: membership assumption' : 'Not applicable: membership unknown';
  const get = (source: typeof m | undefined, key: string): number | null => {
    const value = source?.[key];
    return typeof value === 'number' ? value : null;
  };
  /* An external release has an unknown mechanism: a smaller file is a row-count difference, not proof of suppression. */
  const external = isAudit(candidate);
  const missing = rowsMissing(candidate, originalRows);
  const moreRows = missing !== null && missing < 0;
  const baselineMissing = baseline ? rowsMissing(baseline, originalRows) : null;
  const link = linkageOf(candidate);
  const baseLink = linkageOf(baseline);
  const linkNa = link.state === 'measured' ? undefined : link.state === 'absent' ? 'Not returned' : link.state === 'not_assessed' ? 'Not assessed' : 'Not applicable';
  return [
    { id: 'sample_unique', label: 'Rows unique on known fields', glossary: 'sample_unique', from: get(b, 'sample_unique'), to: get(m, 'sample_unique'), format: v => pct(v), higherIsBetter: false, bar: true, delta: (f, t) => pointsDelta(f, t) },
    {
      id: 'linkage', label: 'Verified exact linkage (unique correct matches)', glossary: 'linkage',
      from: baseLink.state === 'measured' ? baseLink.rate : null, to: link.state === 'measured' ? link.rate : null, naText: linkNa,
      fromText: baseLink.state === 'measured' ? `${num(baseLink.numerator, 0)} / ${num(baseLink.denominator, 0)}` : undefined,
      toText: link.state === 'measured' ? `${num(link.numerator, 0)} / ${num(link.denominator, 0)}` : undefined,
      format: v => pct(v), higherIsBetter: false, bar: true, delta: (f, t) => pointsDelta(f, t),
    },
    { id: 'k_min', label: 'Smallest group (k)', glossary: 'k_min', from: get(b, 'k_min'), to: get(m, 'k_min'), format: v => num(v, 0), higherIsBetter: true, delta: (f, t) => numDelta(f, t, 0) },
    { id: 'sensitive_guess_advantage', label: 'Sensitive inference advantage', glossary: 'guess_advantage', from: get(b, 'sensitive_guess_advantage'), to: get(m, 'sensitive_guess_advantage'), format: v => pct(v), higherIsBetter: false, bar: true, delta: (f, t) => pointsDelta(f, t) },
    { id: 'p_guess', label: 'Single-guess correctness', glossary: 'p_guess', from: membershipKnown ? get(b, 'p_guess') : null, to: membershipKnown ? get(m, 'p_guess') : null, naText: membershipKnown ? undefined : membershipUnavailable, format: v => pct(v), higherIsBetter: false, bar: true, delta: (f, t) => pointsDelta(f, t) },
    { id: 'row_entropy_bits', label: 'Row-index uncertainty (bits)', glossary: 'row_entropy', from: membershipKnown ? get(b, 'row_entropy_bits') : null, to: membershipKnown ? get(m, 'row_entropy_bits') : null, naText: membershipKnown ? undefined : membershipUnavailable, format: v => num(v, 2), higherIsBetter: true, delta: (f, t) => numDelta(f, t, 2) },
    {
      id: 'suppression', label: external ? 'Rows fewer than the source' : 'Rows suppressed', glossary: 'suppression',
      from: baselineMissing !== null ? Math.max(0, baselineMissing) : null, to: moreRows ? null : missing,
      naText: moreRows ? 'More rows than the source' : missing === null ? 'Source size unknown' : undefined,
      format: v => pct(v), higherIsBetter: false, bar: true, delta: (f, t) => pointsDelta(f, t),
    },
    {
      id: 'loss', label: 'Research-query loss', glossary: 'loss', from: baseline ? baseline.utility.loss ?? null : null, to: candidate.utility.loss,
      naText: candidate.utility.queries.length ? 'Unavailable: a weighted question could not be computed' : 'Unavailable: no research questions', format: v => num(v, 3), higherIsBetter: false,
      delta: (f, t) => numDelta(f, t, 3),
    },
  ];
}

function MeasureRow({ measure }: { measure: Measure }) {
  const { from, to } = measure;
  const direction = from === null || to === null ? 'unknown' : Math.abs(to - from) < 1e-9 ? 'same' : (to > from) === measure.higherIsBetter ? 'better' : 'worse';
  const signGlyph = from === null || to === null || Math.abs(to - from) < 1e-9 ? '·' : to < from ? '▾' : '▴';
  const unavailable = to === null;
  return (
    <tr className={unavailable ? 'row-na' : ''}>
      <th scope="row">{measure.label}<Term id={measure.glossary} label={measure.label} /></th>
      <td className="num">{from === null ? '—' : measure.fromText ?? <NumberTicker value={from} format={measure.format} />}</td>
      <td className="num strong">
        {to === null
          ? <span className="na" title="This is not zero. The measurement does not apply or was not made.">{measure.naText ?? 'Unavailable'}</span>
          : measure.toText ? <>{measure.toText}<small className="rate"> {measure.format(to)}</small></> : <NumberTicker value={to} format={measure.format} />}
      </td>
      <td className={`delta ${direction}`}>
        {from !== null && to !== null && measure.delta ? (
          <>
            <span aria-hidden="true">{signGlyph}</span>
            <span>{measure.delta(from, to)}</span>
            <span className="sr-only">{direction === 'better' ? ' (improved)' : direction === 'worse' ? ' (worse)' : ''}</span>
          </>
        ) : '—'}
      </td>
      <td className="bars" aria-hidden="true">
        {measure.bar && to !== null ? (
          <>
            <i className="bar orig" style={{ width: `${Math.min(100, (from ?? 0) * 100)}%`, opacity: from === null ? 0 : 1 }} />
            <i className="bar prot" style={{ width: `${Math.min(100, to * 100)}%` }} />
          </>
        ) : null}
      </td>
    </tr>
  );
}

function LinkageCard({ finding }: { finding: Finding }) {
  const coverage = findingCoverage(finding);
  const measured = finding.status === 'implemented' && typeof finding.numerator === 'number';
  return (
    <li className={`finding linkage c-${coverage}`}>
      <div className="finding-head">
        <Status kind={coverage} label={measured ? 'Measured' : `Uncovered · ${finding.status.replaceAll('_', ' ')}`} />
        <b>Verified exact linkage</b>
        <span className="muted">Different from “rows unique on known fields”</span>
      </div>
      {measured ? (
        <p className="linkage-figure">
          <span className="big">{num(finding.numerator, 0)}</span> of <span className="big">{num(finding.denominator, 0)}</span> source targets have a unique, correct exact match
          {typeof finding.metricValue === 'number' ? <> ({pct(finding.metricValue)})</> : null}.
        </p>
      ) : null}
      <p>{finding.narrative}</p>
      {measured ? (
        <dl className="facts compact">
          {finding.matchedTargets !== undefined ? <div><dt>Matched at all</dt><dd>{num(finding.matchedTargets, 0)}</dd></div> : null}
          {finding.ambiguousTargets !== undefined ? <div><dt>Ambiguous</dt><dd>{num(finding.ambiguousTargets, 0)} (several candidates)</dd></div> : null}
          {finding.uniqueIncorrectMatches !== undefined ? <div><dt>Unique but wrong</dt><dd>{num(finding.uniqueIncorrectMatches, 0)}</dd></div> : null}
          {finding.suppressedTargets !== undefined ? <div><dt>Suppressed targets</dt><dd>{num(finding.suppressedTargets, 0)} (kept in the denominator)</dd></div> : null}
          {finding.expectedCorrectRandomTiebreakFraction !== undefined ? <div><dt>Random tie-break comparator</dt><dd>{pct(finding.expectedCorrectRandomTiebreakFraction)} expected correct</dd></div> : null}
        </dl>
      ) : null}
      {finding.assumptions?.length || finding.caveats?.length ? (
        <details>
          <summary>Assumptions and caveats</summary>
          <ul>{finding.assumptions?.map(text => <li key={text}>{text}</li>)}{finding.caveats?.map(text => <li key={text}>{text}</li>)}</ul>
        </details>
      ) : null}
    </li>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const coverage = findingCoverage(finding);
  return (
    <li className={`finding c-${coverage}`}>
      <div className="finding-head">
        <Status kind={coverage} label={coverage === 'run' ? (finding.severity === 'high' ? 'Run · high severity' : 'Run') : coverage === 'partial' ? 'Partly run' : `Uncovered · ${finding.status.replaceAll('_', ' ')}`} />
        <span className="muted">{finding.attackId?.replaceAll('_', ' ')}</span>
      </div>
      <p>{finding.narrative}</p>
      {finding.assumptions?.length || finding.caveats?.length ? (
        <details>
          <summary>Assumptions and caveats</summary>
          <ul>
            {finding.assumptions?.map(text => <li key={text}>{text}</li>)}
            {finding.caveats?.map(text => <li key={text}>{text}</li>)}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

export function Ledger({ onShowSubgroups }: { onShowSubgroups: () => void }) {
  const ws = useWorkspace();
  const { active, baseline, baselineUsable, dataset, prefs, setPrefs, stale, busy } = ws;
  const [tab, setTab] = useState<LedgerTab>('measures');
  const open = prefs.ledger;
  const queries = active?.utility.queries ?? [];
  const findings = active?.risk.findings ?? [];
  const linkageFindings = findings.filter(isLinkageFinding);
  const otherFindings = findings.filter(finding => !isLinkageFinding(finding));
  const uncoveredFindings = findings.filter(f => findingCoverage(f) !== 'run').length;
  const uncoveredQueries = queries.filter(q => queryOutcome(q) === 'uncovered').length;
  const pending = busy.apply || busy.assess;
  const membershipKnown = (active?.threatContext ?? active?.risk.threat_context)?.membershipKnown ?? null;

  return (
    <section className={`ledger${open ? ' open' : ''}${pending ? ' is-pending' : stale.length ? ' is-stale' : ''}`} aria-label="Measurement ledger">
      <header className="ledger-head">
        <Tabs<LedgerTab>
          idPrefix="ledger"
          variant="sheet"
          label="Ledger sections"
          value={tab}
          onChange={next => { setTab(next); if (!open) setPrefs({ ledger: true }); }}
          items={[
            { id: 'measures', label: 'Measurements' },
            { id: 'queries', label: 'Research questions', badge: queries.length || undefined },
            { id: 'findings', label: 'Findings and coverage', badge: findings.length ? (uncoveredFindings ? `${uncoveredFindings} uncovered` : findings.length) : undefined },
          ]}
        />
        {pending ? <span className="ledger-stale">Evaluating… previous snapshot</span> : stale.length ? <span className="ledger-stale">Stale · {stale.map(reason => STALE_LABEL[reason]).join(', ')} changed</span> : null}
        <span className="ledger-gate"><ShieldAlert size={14} aria-hidden="true" />Not cleared for release · sample measurements</span>
        <button type="button" className="icon-btn" aria-label={open ? 'Collapse ledger' : 'Expand ledger'} aria-expanded={open} onClick={() => setPrefs({ ledger: !open })}>
          {open ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </header>
      {open ? (
        <div className="ledger-body" {...panelProps('ledger', tab)}>
          {!active || !dataset ? (
            <Empty title="No candidate evaluated yet">Create a candidate to measure uniqueness, linkage, inference and research-question changes on the full dataset.</Empty>
          ) : tab === 'measures' ? (
            <>
              <table className="data-table ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Measured on the full dataset</th>
                    <th scope="col" className="num">{baseline ? (baselineUsable ? 'Unprotected' : 'Unprotected (stale)') : 'Unprotected (unavailable)'}</th>
                    <th scope="col" className="num">{ws.labelOf(active.candidateId)}</th>
                    <th scope="col">Change</th>
                    <th scope="col" aria-hidden="true"><span className="legend-key"><i className="orig" />unprotected <i className="prot" />candidate</span></th>
                  </tr>
                </thead>
                <tbody>{measuresFor(active, baselineUsable ? baseline : null, dataset.rowCount, membershipKnown).map(measure => <MeasureRow key={measure.id} measure={measure} />)}</tbody>
              </table>
              <p className="ledger-note">
                {active.risk.assessment === 'mixed' ? <b>Mixed result: at least one finding is high severity. </b> : null}
                {rowCountNote(active, dataset.rowCount) ?? 'Row count unchanged.'} Exact linkage counts verified correct matches under a stated attacker; “unique on known fields” counts one-row classes. They answer different questions. All figures are descriptive, not anonymity, population risk or legal compliance.
              </p>
              {active.risk.limitations?.length ? <ul className="warn-list">{active.risk.limitations.map(text => <li key={text}>{text}</li>)}</ul> : null}
            </>
          ) : tab === 'queries' ? (
            <>
              {stale.includes('workload') ? <Notice tone="warn">Research questions changed after this snapshot was evaluated. Re-evaluate to refresh these results.</Notice> : null}
              {queries.length ? (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr><th scope="col">Research question</th><th scope="col" className="num">Original</th><th scope="col" className="num">Protected</th><th scope="col" className="num">Largest error</th><th scope="col" className="num">Tolerance</th><th scope="col">Outcome</th></tr>
                    </thead>
                    <tbody>
                      {queries.map(query => {
                        const outcome = queryOutcome(query);
                        const grouped = Array.isArray(query.original) || Array.isArray(query.protected);
                        const type = query.type ?? active.workload?.find(item => item.id === query.id)?.type;
                        const unit = resultUnit(query, active.workload ?? [], active.schema ?? []);
                        const show = (value: unknown) => (Array.isArray(value) ? `${value.length} cohorts` : queryValue(value, type, unit));
                        return (
                          <tr key={query.id}>
                            <th scope="row">
                              {query.label}
                              {query.inputUnit && query.comparisonUnit ? (
                                <small className="muted" style={{ display: 'block', fontWeight: 400 }}>
                                  Compared in {query.comparisonUnit} (converted from source {query.inputUnit}{query.inputTolerance !== undefined ? `; tolerance ${num(query.inputTolerance, 3)} ${query.inputUnit} → ${num(query.tolerance, 3)} ${query.comparisonUnit}` : ''})
                                </small>
                              ) : null}
                              {query.issues?.length ? <small className="issue">{query.issues.join(' · ')}</small> : null}
                              {query.warnings?.length ? <small className="muted" style={{ display: 'block', fontWeight: 400 }}>{query.warnings.join(' · ')}</small> : null}
                              {query.filterCoverage !== undefined || query.inclusionBounds !== undefined ? (
                                <details className="why" open={outcome === 'uncovered'}>
                                  <summary>Interval filter coverage and inclusion bounds</summary>
                                  {query.filterCoverage !== undefined ? <div><b>Filter coverage</b><Facts value={query.filterCoverage} /></div> : null}
                                  {query.inclusionBounds !== undefined ? <div><b>Inclusion bounds</b><Facts value={query.inclusionBounds} /></div> : null}
                                </details>
                              ) : null}
                            </th>
                            <td className="num">{grouped ? <button type="button" className="link" onClick={onShowSubgroups}>{show(query.original)}</button> : show(query.original)}</td>
                            <td className="num">{grouped ? <button type="button" className="link" onClick={onShowSubgroups}>{show(query.protected)}</button> : show(query.protected)}</td>
                            <td className="num">{queryValue(query.error, type, unit, true)}</td>
                            <td className="num">≤ {queryValue(query.tolerance, type, unit, true)}</td>
                            <td><Status kind={outcome} label={outcome === 'uncovered' ? 'Unavailable' : undefined} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="No research questions evaluated">Utility is unavailable, not perfect. Add questions on the Research Intent view; the tolerance you set there decides pass or fail.</Empty>}
              {uncoveredQueries ? <p className="ledger-note">{uncoveredQueries} question{uncoveredQueries === 1 ? ' is' : 's are'} uncovered. An unavailable result is not a pass.</p> : null}
              {active.utility.worstSubgroup ? <div className="subgroup-note"><b>Worst subgroup reported by the evaluator</b><Facts value={active.utility.worstSubgroup} /></div> : null}
              {active.utility.warnings?.length ? <ul className="warn-list">{active.utility.warnings.map(text => <li key={text}>{text}</li>)}</ul> : null}
            </>
          ) : (
            <>
              {uncoveredFindings ? <Notice tone="warn">{uncoveredFindings} test{uncoveredFindings === 1 ? ' was' : 's were'} unsupported, inapplicable, unassessed or failed. Uncovered tests are never treated as passes or as zero risk.</Notice> : null}
              <ul className="finding-list">
                {linkageFindings.map(finding => <LinkageCard key={finding.id} finding={finding} />)}
                {otherFindings.map(finding => <FindingRow key={finding.id} finding={finding} />)}
              </ul>
              {!findings.length ? <Empty title="No findings returned" /> : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
