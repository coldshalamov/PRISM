import type { Candidate } from '../../types';
import { measuresFor } from './Ledger';

/* One derivation of "what the diagram and the strip show" for a snapshot, shared by the Workbench hero and the Report,
   so the two can never describe the same candidate differently. Every figure comes from `measuresFor`, the ledger's own readings. */
export function glanceFor(candidate: Candidate, baseline: Candidate | null, originalRows: number) {
  const membershipKnown = (candidate.threatContext ?? candidate.risk.threat_context)?.membershipKnown ?? null;
  const measures = measuresFor(candidate, baseline, originalRows, membershipKnown);
  const metric = (id: string) => measures.find(measure => measure.id === id);
  const values = {
    before: baseline && typeof baseline.risk.metrics.sample_unique === 'number' ? baseline.risk.metrics.sample_unique : null,
    after: metric('sample_unique')?.to ?? null,
    loss: metric('loss')?.to ?? null,
  };
  /* An unavailable figure keeps its stated reason in plain sight, exactly as the ledger table words it. */
  const reasons = [
    values.after === null ? `Rows unique on known fields: ${metric('sample_unique')?.naText ?? 'not measured'}` : null,
    values.loss === null ? `Research-query loss: ${metric('loss')?.naText ?? 'unavailable'}` : null,
    values.before === null ? 'Unprotected baseline unavailable, so nothing can be compared with it' : null,
  ].filter((reason): reason is string => reason !== null);
  return { measures, values, reasons };
}
