import { groupLabel, num, pct, signed, title } from '../format';
import type { SubgroupItem, WorstSubgroup } from '../types';

const LIMIT = 24;

/* Declared subgroups, measured by the evaluator. Counts come from each file; "retained" needs verified
   owner correspondence between rows, so it stays unknown (never zero) when the pairing is not verified. */
export function SubgroupTable({ subgroups, worst, alignment }: { subgroups?: SubgroupItem[]; worst?: WorstSubgroup; alignment: 'verified' | 'unpaired' }) {
  if (!subgroups?.length && !worst) {
    return (
      <div className="viz-empty">
        <b>No declared subgroups were returned.</b>
        <span>Declare group-by fields on the Research Intent view to compare subgroup counts and missingness. Absence here is not evidence that every subgroup is preserved.</span>
      </div>
    );
  }
  const shown = (subgroups ?? []).slice(0, LIMIT);
  const hidden = (subgroups?.length ?? 0) - shown.length;
  return (
    <div className="subgroups">
      {worst ? (
        <div className="subgroup-summary">
          <p>
            <b>{num(worst.assessed, 0)}</b> {worst.assessed === 1 ? 'subgroup' : 'subgroups'} assessed
            {worst.insufficientEvidence ? <> · <b>{num(worst.insufficientEvidence, 0)}</b> with too little support to judge</> : null}
            {worst.unavailableQueries ? <> · <b>{num(worst.unavailableQueries, 0)}</b> {worst.unavailableQueries === 1 ? 'question' : 'questions'} unavailable within subgroups</> : null}.
            {worst.worstRetention && alignment === 'verified'
              ? <> Lowest owner-verified retention: <b>{pct(worst.worstRetention.retention)}</b> in {groupLabel(worst.worstRetention.group)} ({num(worst.worstRetention.retainedCount, 0)} of {num(worst.worstRetention.countOriginal, 0)}).</>
              : null}
          </p>
          <p className="muted">
            Bounded coverage: {num(worst.coverage.evaluated, 0)} evaluated up to a cap of {num(worst.coverage.cap, 0)}
            {worst.coverage.skipped.length ? `; ${num(worst.coverage.skipped.length, 0)} skipped` : ''}. {worst.coverage.definition}
          </p>
        </div>
      ) : null}
      {shown.length ? (
        <div className="subgroup-scroll" role="region" aria-label="Declared subgroup comparison" tabIndex={0}>
          <table className="data-table compact">
            <caption className="sr-only">Declared subgroups: source and candidate counts, count change, owner-verified retention and status.</caption>
            <thead>
              <tr>
                <th scope="col">Subgroup</th><th scope="col" className="num">Source n</th><th scope="col" className="num">Candidate n</th>
                <th scope="col" className="num">Count change</th><th scope="col" className="num">Retained</th><th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item, index) => {
                const changed = item.missingness.filter(entry => entry.dropped || (typeof entry.delta === 'number' && entry.delta !== 0));
                return (
                  <tr key={`${groupLabel(item.group)}-${index}`}>
                    <th scope="row">
                      {groupLabel(item.group)}
                      {changed.length ? (
                        <small className="issue">{changed.map(entry => (entry.dropped ? `${entry.column} removed` : `${entry.column} missing ${num(entry.original, 0)} → ${num(entry.protected, 0)}`)).join(' · ')}</small>
                      ) : null}
                    </th>
                    <td className="num">{num(item.countOriginal, 0)}</td>
                    <td className="num">{typeof item.countProtected === 'number' ? num(item.countProtected, 0) : '—'}</td>
                    <td className="num">{typeof item.cohortCountDifference === 'number' ? signed(item.cohortCountDifference, 0) : '—'}</td>
                    <td className="num">
                      {typeof item.retention === 'number' && typeof item.retainedCount === 'number'
                        ? `${num(item.retainedCount, 0)} · ${pct(item.retention)}`
                        : <span className="na" title="Retention needs verified row correspondence. Unknown is not zero.">Unknown</span>}
                    </td>
                    <td>{title(item.status)}{item.reason ? <small className="issue">{item.reason}</small> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hidden > 0 ? <p className="viz-foot">and {num(hidden, 0)} more declared subgroups; the owner report lists them all.</p> : null}
        </div>
      ) : null}
      <p className="viz-foot">
        {alignment === 'verified'
          ? 'Retention uses the verified owner correspondence for utility only; it is never an attacker alignment or an export key.'
          : 'Row correspondence is not verified, so only counts per file are compared and retention stays unknown.'}
      </p>
    </div>
  );
}
