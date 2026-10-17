import { num } from '../../format';
import { ramp, SEQ_ORANGE } from '../../charts/ChartTip';
import type { Candidate, ExposureCoverage, ExposureSubset, HistogramBin } from '../../types';

/* Pure readings of one frozen snapshot's exposure block. Nothing is invented: every figure below is
   either returned by the local service or an exact arithmetic restatement of one (a count is the
   returned fraction times the returned row count). */

export const subsetKey = (columns: string[]): string => JSON.stringify([...columns].sort());

/** A fraction as an exact percentage. A non-zero value never renders as "0%", and a value just below 1 never as "100%". */
export function exactPct(fraction: number | null | undefined): string {
  if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return '—';
  if (fraction === 0) return '0%';
  const points = fraction * 100;
  if (points < 0.1) return '<0.1%';
  if (fraction < 1 && points >= 99.95) return '>99.9%';
  return `${num(points, 1)}%`;
}

/** Number of rows a returned fraction stands for (the fraction is count / rows, so this inverts it exactly). */
export const rowsOf = (fraction: number, rows: number): number => Math.round(fraction * rows);

export type SortMode = 'exposure' | 'fields' | 'group';
export const SORT_MODES: { id: SortMode; label: string; hint: string }[] = [
  { id: 'exposure', label: 'Most identifying', hint: 'Highest share of unique rows first' },
  { id: 'fields', label: 'Fewest fields', hint: 'Fewest known attributes first' },
  { id: 'group', label: 'Smallest group', hint: 'Smallest group size (k) first' },
];

export function sortSubsets(subsets: ExposureSubset[], mode: SortMode): ExposureSubset[] {
  const byName = (a: ExposureSubset, b: ExposureSubset) => a.columns.join('\u0001').localeCompare(b.columns.join('\u0001'));
  const exposure = (a: ExposureSubset, b: ExposureSubset) => b.unique_fraction - a.unique_fraction;
  const size = (a: ExposureSubset, b: ExposureSubset) => a.columns.length - b.columns.length;
  const group = (a: ExposureSubset, b: ExposureSubset) => a.k_min - b.k_min;
  const order = mode === 'exposure' ? [exposure, size, group, byName] : mode === 'fields' ? [size, exposure, group, byName] : [group, exposure, size, byName];
  return [...subsets].sort((a, b) => {
    for (const compare of order) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

/** Colour of a unique fraction on the FIXED 0-100% domain, so two snapshots are comparable by eye. */
export const exposureColor = (fraction: number): string => ramp(SEQ_ORANGE, fraction);

/** Black or white, whichever has the higher WCAG contrast against the given rgb() colour (>= 4.5:1 across this ramp). */
export function inkFor(color: string): '#000000' | '#ffffff' {
  const channels = (color.match(/\d+/g) ?? ['255', '255', '255']).slice(0, 3).map(Number).map(value => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return 1.05 / (luminance + 0.05) > (luminance + 0.05) / 0.05 ? '#ffffff' : '#000000';
}

export interface ExposureReading {
  subsets: ExposureSubset[];
  /** Known fields that actually remain in the snapshot, in declared order. */
  attributes: string[];
  removed: string[];
  declared: string[];
  rowCount: number;
  histogram: HistogramBin[];
  coverage: ExposureCoverage | undefined;
  membershipKnown: boolean | null;
}

export function readExposure(candidate: Candidate): ExposureReading {
  const { risk } = candidate;
  const subsets = risk.exposure?.subsets ?? [];
  const seen: string[] = [];
  for (const subset of subsets) for (const column of subset.columns) if (!seen.includes(column)) seen.push(column);
  const attributes = risk.qi?.length ? risk.qi : seen;
  const context = candidate.threatContext ?? risk.threat_context;
  return {
    subsets,
    attributes,
    removed: risk.removed_qi ?? [],
    declared: risk.declared_qi ?? attributes,
    rowCount: risk.row_count ?? candidate.rowCount,
    histogram: risk.exposure?.minimal_histogram ?? [],
    coverage: risk.exposure?.coverage,
    membershipKnown: context?.membershipKnown ?? null,
  };
}

export function lookupSubsets(subsets: ExposureSubset[]): Map<string, ExposureSubset> {
  return new Map(subsets.map(subset => [subsetKey(subset.columns), subset]));
}

export const fieldCount = (count: number): string => `${count} ${count === 1 ? 'field' : 'fields'}`;

/** What the histogram's final bar means, taken from the service's own wording and never stronger than the coverage allows. */
export function histogramReading(coverage: ExposureCoverage | undefined): { exact: boolean; headline: string; detail: string } {
  const exact = coverage?.exhaustive === true;
  return exact
    ? {
      exact,
      headline: coverage?.histogram_interpretation ?? 'exact minimum',
      detail: 'Every non-empty combination of the known fields was tested, so each bar is the exact smallest number of known fields that singles a row out.',
    }
    : {
      exact,
      headline: coverage?.histogram_interpretation ?? 'smallest tested distinguishing subset; upper bound only',
      detail: 'Not every combination was tested, so each bar is an upper bound: a row counted at 3 fields may be singled out by fewer fields that were not tested.',
    };
}
