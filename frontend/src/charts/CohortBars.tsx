import { useMemo } from 'react';
import { queryOutcome } from '../analysis';
import { groupLabel, num, signed } from '../format';
import { queryValue, resultUnit } from '../views/intent/QueryResults';
import { Status } from '../ui/Status';
import type { CohortRecord, ColumnSpec, ResearchQuery, UtilityQuery } from '../types';

type Side = 'original' | 'protected';

function detailsOf(query: UtilityQuery, side: Side): CohortRecord[] {
  const details = side === 'original' ? query.originalDetails : query.protectedDetails;
  if (details?.length) return details;
  const raw = side === 'original' ? query.original : query.protected;
  if (Array.isArray(raw)) return raw as CohortRecord[];
  if (typeof raw === 'number') return [{ group: {}, value: raw, count: 0 }];
  return [];
}

const keyOf = (group: Record<string, unknown>) => JSON.stringify(Object.entries(group).sort(([a], [b]) => a.localeCompare(b)));
const isRate = (query: UtilityQuery) => query.type === 'group_rate';
const isSigned = (query: UtilityQuery) => query.type === 'correlation' || query.type === 'difference_in_rates';

const NO_WORKLOAD: ResearchQuery[] = [];
const NO_SCHEMA: ColumnSpec[] = [];

/* One row per cohort. The bar is the estimate, the thin whisker is the Wilson interval where the
   service provides one, and on the protected side a tick marks where the original value was. */
export function CohortBars({ queries, side, workload = NO_WORKLOAD, schema = NO_SCHEMA }: { queries: UtilityQuery[]; side: Side; workload?: ResearchQuery[]; schema?: ColumnSpec[] }) {
  const prepared = useMemo(() => queries.map(raw => {
    /* The service may omit a query's type; the saved workload still knows it, and the type fixes the scale. */
    const query = raw.type ? raw : { ...raw, type: workload.find(item => item.id === raw.id)?.type };
    const own = detailsOf(query, side);
    const originalMap = new Map(detailsOf(query, 'original').map(record => [keyOf(record.group), record]));
    const values = [...detailsOf(query, 'original'), ...detailsOf(query, 'protected')].map(r => r.value).filter((v): v is number => typeof v === 'number');
    const max = isRate(query) ? 1 : isSigned(query) ? 1 : Math.max(0.0001, ...values.map(Math.abs)) * 1.08;
    return { query, own, originalMap, max };
  }), [queries, side, workload]);

  if (!queries.length) return <div className="viz-empty"><b>No research questions yet.</b><span>Define at least two on the Research Intent view.</span></div>;

  return (
    <div className="cohorts">
      {prepared.map(({ query, own, originalMap, max }) => {
        const outcome = queryOutcome(query);
        const type = query.type;
        const unit = resultUnit(query, workload, schema);
        const mean = type === 'group_mean';
        return (
          <section key={query.id} className="cohort-group" aria-label={query.label}>
            <header>
              <h4>{query.label}{mean && unit ? <span className="cohort-unit"> · {unit}</span> : null}</h4>
              {side === 'protected' ? <Status kind={outcome} label={outcome === 'uncovered' ? 'Unavailable' : undefined} /> : <span className="muted">tolerance ≤ {queryValue(query.tolerance, type, unit, true)}</span>}
            </header>
            {!own.length ? (
              <p className="muted cohort-none">{outcome === 'uncovered' ? 'Uncovered: this question could not be computed on this side.' : 'No cohorts.'}</p>
            ) : (
              <ul>
                {own.slice(0, 24).map((record, index) => {
                  const value = record.value;
                  const signedScale = isSigned(query);
                  const ghost = side === 'protected' ? originalMap.get(keyOf(record.group)) : undefined;
                  const pos = (v: number) => (signedScale ? ((v + max) / (2 * max)) * 100 : (Math.abs(v) / max) * 100);
                  const small = typeof record.count === 'number' && query.minCohort !== undefined && record.count > 0 && record.count < query.minCohort;
                  return (
                    <li key={`${keyOf(record.group)}-${index}`}>
                      <span className="cohort-label" title={groupLabel(record.group)}>{Object.keys(record.group).length ? groupLabel(record.group) : query.type === 'correlation' ? 'Pearson r' : query.type === 'difference_in_rates' ? 'Rate difference' : 'All rows'}</span>
                      <span className={`cohort-track${signedScale ? ' signed' : ''}`} role="img" aria-label={`${typeof value === 'number' ? num(value, 4) : 'unavailable'}`}>
                        {typeof value === 'number' ? (
                          signedScale
                            ? <span className={`cohort-fill ${side}`} style={{ left: `${Math.min(pos(value), 50)}%`, width: `${Math.abs(pos(value) - 50)}%` }} />
                            : <span className={`cohort-fill ${side}`} style={{ width: `${Math.min(100, pos(value))}%` }} />
                        ) : null}
                        {record.ci95 ? <span className="cohort-ci" style={{ left: `${pos(record.ci95[0])}%`, width: `${Math.max(0.5, pos(record.ci95[1]) - pos(record.ci95[0]))}%` }} /> : null}
                        {ghost && typeof ghost.value === 'number' ? <span className="cohort-ghost" style={{ left: `${pos(ghost.value)}%` }} title={`Original ${num(ghost.value, 4)}`} /> : null}
                        {signedScale ? <span className="cohort-zero" /> : null}
                      </span>
                      <span className="cohort-value">{typeof value === 'number' ? (signedScale ? signed(value, 3) : `${num(value, isRate(query) ? 3 : 2)}${mean && unit ? ` ${unit}` : ''}`) : '—'}</span>
                      <span className={`cohort-n${small ? ' warn' : ''}`}>{record.count ? `n ${num(record.count, 0)}` : ''}{small ? ' · small' : ''}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {side === 'protected' && query.issues?.length ? <p className="cohort-issue">{query.issues.join(' · ')}</p> : null}
            {side === 'protected' && query.warnings?.length ? <p className="cohort-issue soft">{query.warnings.join(' · ')}</p> : null}
          </section>
        );
      })}
    </div>
  );
}
