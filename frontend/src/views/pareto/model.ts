import { linkageOf } from '../../analysis';
import type { Candidate, SearchResult } from '../../types';

export const ATTACK_METRICS = [
  { key: 'sample_unique', label: 'Sample uniqueness', note: 'Fraction of released records alone in their remaining known-field class. This is a sample statistic, not a population re-identification rate.' },
  { key: 'p_guess', label: 'Class-based guessing', note: 'Mean reciprocal class size among released records, assuming the observer knows the selected fields. This is not verified identity linkage.' },
  { key: 'sensitive_guess_advantage', label: 'Sensitive inference advantage', note: 'In-sample improvement in guessing a selected sensitive value from known-field classes, relative to its marginal baseline. Unsupported targets make this unavailable.' },
  { key: 'verified_linkage_rate', label: 'Verified exact linkage', note: 'Correct unique matches from the public deterministic replay, divided by its frozen target denominator. Only shown when the replay is applicable and implemented.' },
] as const;
export type AttackMetric = typeof ATTACK_METRICS[number]['key'];

export const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const fraction = (value: unknown): number | null => {
  const number = finite(value);
  return number !== null && number >= 0 && number <= 1 ? number : null;
};

export function attackValue(candidate: Candidate, metric: AttackMetric): number | null {
  if (metric === 'verified_linkage_rate') {
    const reading = linkageOf(candidate);
    return reading.state === 'measured' && reading.denominator !== null && reading.denominator > 0 ? fraction(reading.rate) : null;
  }
  if (metric === 'sensitive_guess_advantage') {
    const targets = candidate.threatModel?.sensitive ?? candidate.risk.sensitive_targets;
    const results = candidate.risk.sensitive;
    // A missing target, an unsupported analysis, or no requested target is not measured zero.
    if (!targets?.length || !results || targets.some(target => !results.some(result => result.column === target && result.status === 'implemented'))) return null;
    if (candidate.constraints.some(check => !check.pass && ['sensitive-target-coverage', 'sensitive-inference-coverage'].includes(check.id))) return null;
  }
  return fraction(candidate.risk.metrics[metric]);
}

export function rowLoss(candidate: Candidate, originalRows: number): number | null {
  const returned = fraction(candidate.suppression_rate ?? candidate.transformReport?.suppression_rate);
  if (returned !== null) return returned;
  const sourceRows = finite(candidate.utility.rows_original) ?? originalRows;
  if (candidate.recipe.releaseMode !== 'row_release' || candidate.auditMode || sourceRows <= 0 || candidate.rowCount > sourceRows) return null;
  return fraction((sourceRows - candidate.rowCount) / sourceRows);
}

export const workloadLoss = (candidate: Candidate): number | null => finite(candidate.utility.loss);
export function measuredVector(candidate: Candidate, originalRows: number): number[] | null {
  const values = [attackValue(candidate, 'sample_unique'), attackValue(candidate, 'sensitive_guess_advantage'), rowLoss(candidate, originalRows), workloadLoss(candidate)];
  return values.every((value): value is number => value !== null) ? values : null;
}

/** All four declared objectives are minimized, independently of hard-constraint feasibility.
 * Incomplete vectors are excluded; the service's unavailable=worst penalty is never a measurement. */
export function measuredFrontier(candidates: Candidate[], originalRows: number): Set<string> {
  const measured = candidates.map(candidate => ({ candidate, values: measuredVector(candidate, originalRows) })).filter((item): item is { candidate: Candidate; values: number[] } => item.values !== null);
  return new Set(measured.filter(({ values }, index) => !measured.some(({ values: other }, otherIndex) => index !== otherIndex && other.every((value, axis) => value <= values[axis]) && other.some((value, axis) => value < values[axis]))).map(item => item.candidate.candidateId));
}

export type Feasibility = 'met' | 'conflict' | 'unknown';
export function feasibility(candidate: Candidate): Feasibility {
  if (candidate.constraints.some(check => !check.pass) || candidate.feasible === false) return 'conflict';
  return candidate.constraints.length ? 'met' : 'unknown';
}

export interface InformationValue {
  column: string;
  status: string;
  recipeHash?: string;
  reason?: string;
  operation?: string;
  riskReduction?: Record<string, number | null>;
  utilityLoss?: number | null;
  utilityLossChange?: number | null;
  failedQueries?: string[];
  limitations?: string[];
}
export function informationValue(search: SearchResult): InformationValue[] {
  const value: unknown = (search as SearchResult & { informationValue?: unknown }).informationValue;
  return Array.isArray(value) ? value.filter((item): item is InformationValue => typeof item === 'object' && item !== null && typeof item.column === 'string' && typeof item.status === 'string') : [];
}

// Layout navigation may unmount the view. Retain only a bounded plan fingerprint, never rows.
export const searchPlans = new Map<string, { key: string; scenario: string; limits: string; budget: number }>();
export function rememberSearchPlan(jobId: string, plan: { key: string; scenario: string; limits: string; budget: number }) {
  searchPlans.set(jobId, plan);
  if (searchPlans.size > 12) searchPlans.delete(searchPlans.keys().next().value!);
}
