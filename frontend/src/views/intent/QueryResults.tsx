import { Fragment } from 'react';
import { queryOutcome } from '../../analysis';
import { groupLabel, num, pct } from '../../format';
import { Facts } from '../../ui/Facts';
import { Status } from '../../ui/Status';
import type { CohortRecord, ColumnSpec, QueryType, ResearchQuery, UtilityQuery } from '../../types';

export const QUERY_TYPES: { id: QueryType; label: string; description: string }[] = [
  { id: 'group_rate', label: 'Rate', description: 'The proportion matching a declared positive value, optionally within each cohort.' },
  { id: 'group_count', label: 'Count', description: 'The number of rows, optionally within each cohort.' },
  { id: 'group_mean', label: 'Mean', description: 'The mean of a numerical field, optionally within each cohort.' },
  { id: 'correlation', label: 'Correlation', description: 'Pearson correlation between two numerical fields. Undefined and reversed associations are flagged.' },
  { id: 'difference_in_rates', label: 'Difference in rates', description: 'The rate difference between exactly two observed cohorts on one field. The evaluator reports subtraction direction.' },
];

export function queryTitle(query: ResearchQuery): string {
  const type = QUERY_TYPES.find(item => item.id === query.type)?.label ?? query.type;
  if (query.type === 'correlation') return `${query.groupBy?.[0] ?? 'X'} × ${query.target ?? 'Y'}`;
  return `${type}${query.target ? ` of ${query.target}` : ''}${query.groupBy?.length ? ` by ${query.groupBy.join(', ')}` : ''}`;
}

/** The unit a mean is compared in: the service's comparison unit (kg after an explicit lb conversion) wins over the source label. */
export function resultUnit(query: UtilityQuery, workload: ResearchQuery[], schema: ColumnSpec[]): string {
  const spec = workload.find(item => item.id === query.id);
  return query.comparisonUnit ?? schema.find(item => item.name === spec?.target)?.unit ?? '';
}

export function queryValue(value: unknown, type: QueryType | undefined, unit = '', error = false): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  if (type === 'group_rate') return error ? `${num(value * 100, 3)} pp` : pct(value, 2);
  if (type === 'difference_in_rates') return `${num(value * 100, 3)} pp`;
  if (type === 'group_count') return `${num(value, error ? 3 : 0)} rows`;
  if (type === 'correlation') return `${num(value, 4)}${error ? ' Δr' : ' r'}`;
  return `${num(value, 4)}${unit ? ` ${unit}` : ''}`;
}

const keyOf = (record: CohortRecord) => JSON.stringify(Object.entries(record.group).sort(([a], [b]) => a.localeCompare(b)));

function CohortDetails({ query, unit }: { query: UtilityQuery; unit: string }) {
  const before = query.originalDetails ?? [];
  const after = query.protectedDetails ?? [];
  const keys = [...new Set([...before.map(keyOf), ...after.map(keyOf)])];
  if (!keys.length) return null;
  const left = new Map(before.map(record => [keyOf(record), record]));
  const right = new Map(after.map(record => [keyOf(record), record]));
  const estimate = (record: CohortRecord | undefined) => record ? queryValue(record.value, query.type, unit) : 'Cohort absent';
  return (
    <div className="intent-table-scroll" role="region" aria-label={`${query.label} cohort details`} tabIndex={0}>
      <table className="intent-results-table intent-cohort-table">
        <caption>Measured cohorts · support is valid observations; missing values are separate</caption>
        <thead><tr><th scope="col">Cohort</th><th scope="col">Source estimate</th><th scope="col">Candidate estimate</th><th scope="col">Source / candidate support</th><th scope="col">Missing source / candidate</th></tr></thead>
        <tbody>{keys.map(key => {
          const a = left.get(key); const b = right.get(key); const record = a ?? b;
          return <tr key={key}>
            <th scope="row">{groupLabel(record?.group)}</th>
            <td>{estimate(a)}{a?.ci95 ? <small>95% CI {pct(a.ci95[0], 2)}–{pct(a.ci95[1], 2)}</small> : null}</td>
            <td>{estimate(b)}{b?.ci95 ? <small>95% CI {pct(b.ci95[0], 2)}–{pct(b.ci95[1], 2)}</small> : null}</td>
            <td>{num(a?.count, 0)} / {num(b?.count, 0)}</td><td>{num(a?.missing, 0)} / {num(b?.missing, 0)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

export function QueryResults({ queries, workload = [], schema = [], candidateLabel }: { queries: UtilityQuery[]; workload?: ResearchQuery[]; schema?: ColumnSpec[]; candidateLabel: string }) {
  if (!queries.length) return <p className="intent-no-results">No research queries were evaluated in this snapshot. Add questions and evaluate to measure preservation.</p>;
  return (
    <div className="intent-table-scroll" role="region" aria-label="Research results, source compared with candidate" tabIndex={0}>
      <table className="intent-results-table">
        <caption>Source and {candidateLabel} · measurements from this candidate’s frozen evaluation</caption>
        <thead><tr><th scope="col">Research question</th><th scope="col">Source</th><th scope="col">{candidateLabel}</th><th scope="col">Absolute error</th><th scope="col">Tolerance</th><th scope="col">Result</th></tr></thead>
        <tbody>{queries.map(query => {
          const spec = workload.find(item => item.id === query.id);
          const type = query.type ?? spec?.type;
          const unit = resultUnit(query, workload, schema);
          const normalized = { ...query, type };
          const label = spec ? queryTitle(spec) : query.label;
          const grouped = Array.isArray(query.original) || Array.isArray(query.protected);
          return <Fragment key={query.id}>
            <tr>
              <th scope="row"><span className="intent-query-name">{label}</span><small>{query.id}{type === 'group_mean' && unit ? ` · ${unit}` : ''}{query.inputUnit && query.comparisonUnit ? ` · source ${query.inputUnit} converted` : ''}</small></th>
              <td>{grouped ? `${query.originalDetails?.length ?? (Array.isArray(query.original) ? query.original.length : 0)} cohorts` : queryValue(query.original, type, unit)}</td>
              <td>{grouped ? (query.protected === null ? 'Unavailable' : `${query.protectedDetails?.length ?? (Array.isArray(query.protected) ? query.protected.length : 0)} cohorts`) : queryValue(query.protected, type, unit)}</td>
              <td>{queryValue(query.error, type, unit, true)}</td><td>{queryValue(query.tolerance, type, unit, true)}</td>
              <td><Status kind={queryOutcome(query)} label={queryOutcome(query) === 'uncovered' ? 'Unavailable' : undefined} /></td>
            </tr>
            <tr className="intent-detail-row"><td colSpan={6}>
              <details>
                <summary>Inspect cohorts, support and caveats{query.signFlip ? ' · association reversed' : ''}{query.issues?.length ? ` · ${query.issues.length} issues` : ''}</summary>
                <div className="intent-result-detail">
                  <p>Weight {num(query.weight ?? spec?.weight)} · minimum cohort {num(query.minCohort ?? spec?.minCohort, 0)} · {query.status ?? 'Status not returned'}. Errors use the largest absolute difference across matched cohorts.</p>
                  {query.inputTolerance !== undefined && query.inputUnit ? <p>Input tolerance: {num(query.inputTolerance, 4)} {query.inputUnit}. Displayed comparison tolerance uses {query.comparisonUnit ?? unit}.</p> : null}
                  {query.issues?.length ? <ul className="intent-issues">{query.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul> : null}
                  {query.warnings?.length ? <ul className="intent-issues">{query.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : null}
                  <CohortDetails query={normalized} unit={unit} />
                  {(query.originalDetails ?? []).some(record => record.direction || record.cohorts) ? <details><summary>Rate-difference direction and component cohorts</summary><Facts value={{ source: query.originalDetails, candidate: query.protectedDetails }} /></details> : null}
                  {query.filterCoverage !== undefined ? <details><summary>Exact filter membership coverage</summary><Facts value={query.filterCoverage} /></details> : null}
                  {query.inclusionBounds !== undefined ? <details open><summary>Conservative inclusion bounds</summary><Facts value={query.inclusionBounds} /></details> : null}
                </div>
              </details>
            </td></tr>
          </Fragment>;
        })}</tbody>
      </table>
    </div>
  );
}
