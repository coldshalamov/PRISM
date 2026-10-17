import type { SearchConstraints } from './api';

export interface Scenario {
  id: 'lab' | 'limited' | 'public' | 'aggregate';
  label: string;
  context: string;
  /** Row-release evaluation applies only to the first three contexts. */
  evaluated: boolean;
  limits: SearchConstraints;
}

/* Contextual planning defaults for the finite-sample search constraints.
   They are editable starting points, not standards, thresholds of law or release approvals. */
export const scenarios: Scenario[] = [
  {
    id: 'lab', label: 'Lab collaboration', evaluated: true,
    context: 'A named team under an agreement. Looser sample limits; direct identifiers should still be removed.',
    limits: { minK: 2, maxSuppression: 0.1, maxUnique: 0.25, maxLoss: 0.35 },
  },
  {
    id: 'limited', label: 'Limited research sharing', evaluated: true,
    context: 'Approved recipients under a data-use agreement. Moderate sample limits.',
    limits: { minK: 5, maxSuppression: 0.1, maxUnique: 0.1, maxLoss: 0.35 },
  },
  {
    id: 'public', label: 'Public release', evaluated: true,
    context: 'Anyone may obtain the file. Strictest sample limits; sample measurements still cannot establish anonymity.',
    limits: { minK: 10, maxSuppression: 0.2, maxUnique: 0.02, maxLoss: 0.5 },
  },
  {
    id: 'aggregate', label: 'Aggregate query only', evaluated: false,
    context: 'Counts and statistics rather than rows. PRISM evaluates row releases only; see the Attack Lab for why aggregate-only is not automatically private.',
    limits: { minK: 5, maxSuppression: 0.1, maxUnique: 0.1, maxLoss: 0.35 },
  },
];

export const defaultScenario = scenarios[1];
export const scenarioById = (id: string): Scenario => scenarios.find(item => item.id === id) ?? defaultScenario;
