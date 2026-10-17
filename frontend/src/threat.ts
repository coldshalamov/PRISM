import type { Candidate, ColumnSpec, RowUnit } from './types';

/** What the observer is assumed to know. Defaults come from reviewed roles but can be varied without editing them. */
export interface Threat { known: string[]; secret: string[]; membershipKnown: boolean }

export const threatFromSchema = (schema: ColumnSpec[]): Threat => ({
  known: schema.filter(c => c.role === 'quasi_identifier').map(c => c.name),
  secret: schema.filter(c => c.role === 'sensitive').map(c => c.name),
  membershipKnown: true,
});

/** Assumptions PRISM does not model; shown beside every threat so absence of a test is never read as a pass. */
export const UNASSESSED = [
  { id: 'auxiliary', label: 'Auxiliary datasets and prior releases', why: 'No outside file is linked; composition across releases is only demonstrated in the Attack Lab.' },
  { id: 'trajectories', label: 'Longitudinal trajectories and event sequences', why: 'Row-level tables cannot show a distinctive sequence of dates or places.' },
  { id: 'genomics', label: 'Genomic or family information', why: 'No genotype or relative-inference analysis exists; specialist review is needed.' },
  { id: 'text', label: 'Free-text narratives', why: 'Pattern redaction misses names and unusual details.' },
] as const;

export function listPhrase(items: string[], none = 'no fields'): string {
  if (!items.length) return none;
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export type PersonUnit = 'confirmed' | 'unconfirmed' | 'repeated';
export function personUnit(rowUnit?: RowUnit | null): PersonUnit {
  if (!rowUnit) return 'unconfirmed';
  if (rowUnit.repeatedEntitiesDetected) return 'repeated';
  return rowUnit.oneRowPerPersonConfirmed ? 'confirmed' : 'unconfirmed';
}

/** The readable sentence frozen with a candidate; also used live in the threat builder. */
export function threatSentence(options: { known: string[]; secret: string[]; membershipKnown: boolean | null; unit: PersonUnit; publicRule?: boolean }): string {
  const { known, secret, membershipKnown, unit, publicRule } = options;
  const parts = [
    `This test assumes the observer knows ${listPhrase(known)}`,
    membershipKnown === null ? 'has an unrecorded membership assumption'
      : membershipKnown ? 'knows that each target is in this file' : 'does not know whether a target is in this file',
  ];
  if (publicRule) parts.push('knows the public generalization rule');
  const lead = `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  const seeks = secret.length ? ` and seeks ${listPhrase(secret)}` : ' and has no sensitive field in scope';
  const person = unit === 'confirmed' ? 'Each row is declared one person.'
    : unit === 'repeated' ? 'Repeated person keys were detected, so these are record-level measurements, not person-level.'
      : 'One row per person is not confirmed, so these are record-level measurements.';
  return `${lead}${seeks}. ${person}`;
}

export function candidateThreat(candidate: Candidate, fallback: Threat): Omit<Threat, 'membershipKnown'> & { membershipKnown: boolean | null; unit: PersonUnit } {
  const known = candidate.threatModel?.qi ?? candidate.risk.qi ?? fallback.known;
  const secret = candidate.threatModel?.sensitive ?? candidate.risk.sensitive_targets ?? fallback.secret;
  const context = candidate.threatContext ?? candidate.risk.threat_context;
  const unit: PersonUnit = context?.repeatedEntitiesDetected ? 'repeated' : context?.oneRowPerPersonConfirmed ? 'confirmed' : 'unconfirmed';
  return { known, secret, membershipKnown: context?.membershipKnown ?? null, unit };
}
