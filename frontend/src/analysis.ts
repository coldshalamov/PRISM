import { cleanSteps, cleanWorkload } from './api';
import { normalizeSteps } from './recipe';
import type { RecipeStep } from './recipe';
import type { Candidate, ColumnSpec, Dataset, Finding, ResearchQuery, UtilityQuery } from './types';

/* Client-side readings of service results. Nothing here invents measurements: it only
   classifies, compares, or re-checks values the local service already computed. */

export type Outcome = 'within' | 'outside' | 'uncovered';

export function queryOutcome(query: UtilityQuery): Outcome {
  if (query.status === 'unavailable' || query.error === null || query.error === undefined) return 'uncovered';
  return query.pass ? 'within' : 'outside';
}

export type Coverage = 'run' | 'partial' | 'uncovered';
export function findingCoverage(finding: Finding): Coverage {
  if (finding.status === 'implemented') return 'run';
  if (finding.status === 'partial') return 'partial';
  return 'uncovered';
}

/* ---------- verified exact linkage: never conflated with sample uniqueness ---------- */
export const isLinkageFinding = (finding: Finding): boolean =>
  finding.attackId === 'verified_exact_linkage'
  || finding.id === 'verified-exact-linkage'
  || finding.id === 'verified-linkage-unavailable';

export interface LinkageReading {
  finding: Finding | null;
  state: 'measured' | 'not_applicable' | 'not_assessed' | 'absent';
  numerator: number | null;
  denominator: number | null;
  rate: number | null;
}
export function linkageOf(candidate: Candidate | null): LinkageReading {
  const finding = candidate?.risk.findings.find(isLinkageFinding) ?? null;
  if (!finding) return { finding: null, state: 'absent', numerator: null, denominator: null, rate: null };
  const measured = finding.status === 'implemented' && typeof finding.numerator === 'number';
  return {
    finding,
    state: measured ? 'measured' : finding.status === 'not_assessed' ? 'not_assessed' : 'not_applicable',
    numerator: measured ? finding.numerator ?? null : null,
    denominator: typeof finding.denominator === 'number' ? finding.denominator : null,
    rate: measured && typeof finding.metricValue === 'number' ? finding.metricValue : null,
  };
}

/* ---------- objectives and the Pareto frontier ---------- */
export const OBJECTIVES = [
  { key: 'sample_unique', label: 'Sample uniqueness', short: 'Unique rows', format: 'pct' },
  { key: 'sensitive_guess_advantage', label: 'Sensitive inference advantage', short: 'Inference advantage', format: 'pct' },
  { key: 'suppression_rate', label: 'Rows suppressed', short: 'Suppressed', format: 'pct' },
  { key: 'scientific_query_loss', label: 'Research-query loss', short: 'Query loss', format: 'num' },
] as const;
export type ObjectiveKey = typeof OBJECTIVES[number]['key'];

export function objectiveValues(candidate: Candidate, originalRows: number): Record<ObjectiveKey, number | null> {
  const metrics = candidate.risk.metrics;
  const suppression = candidate.suppression_rate
    ?? (originalRows > 0 ? Math.max(0, (originalRows - candidate.rowCount) / originalRows) : null);
  return {
    sample_unique: metrics.sample_unique ?? null,
    sensitive_guess_advantage: metrics.sensitive_guess_advantage ?? null,
    suppression_rate: suppression,
    scientific_query_loss: candidate.utility.loss ?? null,
  };
}

const vector = (values: Record<ObjectiveKey, number | null>) => OBJECTIVES.map(objective => values[objective.key]);
const dominates = (a: number[], b: number[]) => a.every((v, i) => v <= b[i]) && a.some((v, i) => v < b[i]);

/** Recomputes non-dominance from the four returned objective values so the flag is checkable. */
export function localFrontier(candidates: Candidate[], originalRows: number): Set<string> {
  const vectors = candidates.map(candidate => vector(objectiveValues(candidate, originalRows)));
  const members = new Set<string>();
  candidates.forEach((candidate, index) => {
    const current = vectors[index];
    if (!current.every((value): value is number => typeof value === 'number' && Number.isFinite(value))) return;
    if (!vectors.some((other, j) => j !== index
      && other.every((value): value is number => typeof value === 'number' && Number.isFinite(value))
      && dominates(other, current))) members.add(candidate.candidateId);
  });
  return members;
}

export const isFeasible = (candidate: Candidate): boolean =>
  candidate.feasible ?? (candidate.constraints.length > 0 && candidate.constraints.every(check => check.pass));

/** Cell highlighting is shown only when row correspondence is verified and unchanged in count. */
export function rowsAligned(candidate: Candidate | null, dataset: Dataset | null): boolean {
  if (!candidate || !dataset) return false;
  if (candidate.alignment !== 'verified') return false;
  if (candidate.rowCount !== dataset.rowCount) return false;
  return !candidate.recipe.steps.some(step => step.method === 'suppress_rows');
}

export const isAudit = (candidate: Candidate | null | undefined): boolean =>
  Boolean(candidate && (candidate.auditMode || candidate.recipe.version === 'external'));

export function rowCountNote(candidate: Candidate, originalRows: number): string | null {
  if (candidate.rowCount === originalRows) return null;
  const difference = originalRows - candidate.rowCount;
  const kind = !isAudit(candidate) && candidate.recipe.steps.some(step => step.method === 'suppress_rows')
    ? 'rows suppressed'
    : 'row-count change';
  return `${Math.abs(difference).toLocaleString()} ${difference > 0 ? 'fewer' : 'more'} rows than the original (${kind})`;
}

/* ---------- stale evidence: which current controls differ from a frozen snapshot ---------- */
export type StaleReason = 'recipe' | 'threat' | 'workload' | 'classifications';
export const STALE_LABEL: Record<StaleReason, string> = {
  recipe: 'recipe', threat: 'attacker assumptions', workload: 'research questions', classifications: 'field classifications',
};

const canonQuery = (query: ResearchQuery) => ({
  id: query.id, type: query.type, groupBy: query.groupBy ?? [], target: query.target ?? null, filter: query.filter ?? {},
  positiveValue: query.positiveValue ?? 1, weight: query.weight, tolerance: query.tolerance, minCohort: query.minCohort,
});
export const workloadKey = (workload: ResearchQuery[]) => JSON.stringify(cleanWorkload(workload).map(canonQuery));
const schemaKey = (schema: ColumnSpec[]) => JSON.stringify(schema.map(c => [c.name, c.dtype, c.role, c.unit ?? null]));
const setKey = (items: string[]) => JSON.stringify([...items].sort());

export interface CurrentControls {
  steps: RecipeStep[];
  known: string[];
  secret: string[];
  membershipKnown: boolean;
  workload: ResearchQuery[];
  schema: ColumnSpec[];
}

export function staleReasons(candidate: Candidate | null, current: CurrentControls | null): StaleReason[] {
  if (!candidate || !current) return [];
  const reasons: StaleReason[] = [];
  if (!isAudit(candidate)) {
    const wanted = JSON.stringify(cleanSteps(normalizeSteps(current.steps, current.known)));
    const frozen = JSON.stringify(candidate.recipe.steps.map(step => ({ method: step.method, columns: step.columns, params: step.params })));
    if (wanted !== frozen) reasons.push('recipe');
  }
  const frozenKnown = candidate.threatModel?.qi ?? candidate.risk.qi;
  const frozenSecret = candidate.threatModel?.sensitive ?? candidate.risk.sensitive_targets;
  const frozenMembership = (candidate.threatContext ?? candidate.risk.threat_context)?.membershipKnown;
  if ((frozenKnown && setKey(frozenKnown) !== setKey(current.known))
    || (frozenSecret && setKey(frozenSecret) !== setKey(current.secret))
    || frozenMembership !== current.membershipKnown) reasons.push('threat');
  if (candidate.workload && workloadKey(candidate.workload) !== workloadKey(current.workload)) reasons.push('workload');
  if (candidate.schema && schemaKey(candidate.schema) !== schemaKey(current.schema)) reasons.push('classifications');
  return reasons;
}

export function riskDirection(from: number | null | undefined, to: number | null | undefined): 'better' | 'worse' | 'same' | 'unknown' {
  if (typeof from !== 'number' || typeof to !== 'number') return 'unknown';
  if (Math.abs(to - from) < 1e-9) return 'same';
  return to < from ? 'better' : 'worse';
}
