import { cleanSteps } from './api';
import type { RecipeStep } from './api';
import type { ColumnSpec, TransformStep } from './types';

/* Recipe helpers: translate between per-field "treatments" (the quick editing model) and the flat,
   ordered list of transformation steps the service validates and executes. Steps carry two
   UI-only fields (uid, disabled) that cleanSteps strips before anything is sent. */

export type { RecipeStep };
export type QuickKind = 'keep' | 'drop' | 'mask' | 'band' | 'centered_interval' | 'round' | 'zip_prefix' | 'date_generalize' | 'rare_group';
export interface Treatment { kind: QuickKind | 'custom'; value?: number | string }

export const QUICK_METHODS = new Set(['drop', 'mask', 'band', 'centered_interval', 'round', 'zip_prefix', 'date_generalize', 'rare_group']);
const NUMERIC = new Set(['integer', 'float']);

export const newUid = () => Math.random().toString(36).slice(2, 9);
export const withUid = (step: TransformStep | RecipeStep): RecipeStep => ({ ...step, uid: (step as RecipeStep).uid ?? newUid() });
export const seedSteps = (steps: TransformStep[]): RecipeStep[] => steps.map(step => withUid({ method: step.method, columns: [...step.columns], params: { ...step.params } }));

export const isZipColumn = (name: string) => /(^|[^a-z])(zip|zipcode|postal|postcode)([^a-z]|$)/i.test(name);
export const isWeightColumn = (spec: ColumnSpec) => /weight/i.test(spec.name);
export function weightUnit(spec: ColumnSpec): 'kg' | 'lb' | 'unset' {
  const unit = (spec.unit ?? '').toLowerCase();
  if (unit === 'kg') return 'kg';
  if (['lb', 'lbs', 'pounds'].includes(unit)) return 'lb';
  return 'unset';
}
export const weightNeedsUnit = (spec: ColumnSpec) => isWeightColumn(spec) && weightUnit(spec) === 'unset';

const enabled = (steps: RecipeStep[]) => steps.filter(step => !step.disabled);

export interface KindOption { kind: QuickKind; label: string }
export function kindOptions(spec: ColumnSpec): KindOption[] {
  const keep: KindOption = { kind: 'keep', label: 'Keep as is' };
  const drop: KindOption = { kind: 'drop', label: 'Remove column' };
  if (spec.role === 'direct_identifier') return [keep, drop, { kind: 'mask', label: 'Mask with a label' }];
  if (isZipColumn(spec.name)) return [keep, { kind: 'zip_prefix', label: 'Keep leading digits' }, drop];
  if (spec.dtype === 'date') return [keep, { kind: 'date_generalize', label: 'Coarser date' }, drop];
  if (NUMERIC.has(spec.dtype)) return [keep, { kind: 'band', label: 'Group into bands' }, ...(spec.dtype === 'integer' ? [{ kind: 'centered_interval' as QuickKind, label: 'Unsafe demo: centered interval' }] : []), { kind: 'round', label: 'Round' }, drop];
  return [keep, { kind: 'rare_group', label: 'Merge rare categories' }, drop];
}

export interface KindRange { min: number; max: number; step: number; unit: string; default: number }
export function kindRange(kind: QuickKind, spec: ColumnSpec): KindRange | null {
  switch (kind) {
    case 'band': return { min: 1, max: 25, step: 1, unit: spec.unit === 'kg' || isWeightColumn(spec) ? 'kg wide' : /age/i.test(spec.name) ? 'years wide' : 'wide', default: 5 };
    case 'centered_interval': return { min: 1, max: 10, step: 1, unit: '± radius', default: 1 };
    case 'round': return { min: -2, max: 3, step: 1, unit: 'decimals', default: 0 };
    case 'zip_prefix': return { min: 1, max: 5, step: 1, unit: 'digits kept', default: 3 };
    case 'rare_group': return { min: 2, max: 200, step: 1, unit: 'rows minimum', default: 5 };
    default: return null;
  }
}
export const DATE_PRECISIONS = ['year', 'quarter', 'month', 'week', 'day', 'hour'] as const;

export function readTreatment(steps: RecipeStep[], column: string): Treatment {
  for (const step of enabled(steps)) {
    if (!step.columns.includes(column) || step.method === 'suppress_rows') continue;
    switch (step.method) {
      case 'drop': return { kind: 'drop' };
      case 'mask': return { kind: 'mask', value: String(step.params.value ?? 'REDACTED') };
      case 'band': return { kind: 'band', value: Number(step.params.width) };
      case 'centered_interval': return { kind: 'centered_interval', value: Number(step.params.radius) };
      case 'round': return { kind: 'round', value: Number(step.params.decimals) };
      case 'zip_prefix': return { kind: 'zip_prefix', value: Number(step.params.length) };
      case 'date_generalize': return { kind: 'date_generalize', value: String(step.params.precision) };
      case 'rare_group': return { kind: 'rare_group', value: Number(step.params.min_count) };
      default: break;
    }
  }
  return { kind: 'keep' };
}

export function customStepsFor(steps: RecipeStep[], column: string): RecipeStep[] {
  return enabled(steps).filter(step => step.columns.includes(column) && !QUICK_METHODS.has(step.method) && step.method !== 'suppress_rows');
}

function paramsFor(kind: QuickKind, spec: ColumnSpec, value: number | string | undefined): Record<string, unknown> {
  switch (kind) {
    case 'band': {
      const params: Record<string, unknown> = { width: Number(value ?? 5) };
      if (isWeightColumn(spec) && weightUnit(spec) === 'lb') params.convertFrom = 'lb';
      return params;
    }
    case 'centered_interval': return { radius: Number(value ?? 1) };
    case 'round': return { decimals: Number(value ?? 0) };
    case 'zip_prefix': return { length: Number(value ?? 3) };
    case 'date_generalize': return { precision: String(value ?? 'year') };
    case 'rare_group': return { min_count: Number(value ?? 5) };
    case 'mask': return { value: String(value ?? 'REDACTED') };
    default: return {};
  }
}

function withoutColumn(steps: RecipeStep[], column: string, methods?: Set<string>): RecipeStep[] {
  const result: RecipeStep[] = [];
  for (const step of steps) {
    if (step.disabled || step.method === 'suppress_rows' || !step.columns.includes(column) || (methods && !methods.has(step.method))) {
      result.push(step);
      continue;
    }
    const columns = step.columns.filter(name => name !== column);
    if (columns.length) result.push({ ...step, columns });
  }
  return result;
}

export function setTreatment(steps: RecipeStep[], spec: ColumnSpec, kind: QuickKind, value?: number | string): RecipeStep[] {
  const rest = withoutColumn(steps, spec.name, QUICK_METHODS);
  if (kind === 'keep') return rest;
  if (kind === 'drop') {
    const existing = rest.findIndex(step => step.method === 'drop' && !step.disabled);
    if (existing >= 0) return rest.map((step, index) => (index === existing ? { ...step, columns: [...step.columns, spec.name] } : step));
    return [withUid({ method: 'drop', columns: [spec.name], params: {} }), ...rest];
  }
  const range = kindRange(kind, spec);
  const initial = value ?? (kind === 'date_generalize' ? 'year' : kind === 'mask' ? 'REDACTED' : range?.default);
  const next = withUid({ method: kind, columns: [spec.name], params: paramsFor(kind, spec, initial) });
  const tail = rest.findIndex(step => step.method === 'suppress_rows');
  if (tail < 0) return [...rest, next];
  return [...rest.slice(0, tail), next, ...rest.slice(tail)];
}

export function droppedColumns(steps: RecipeStep[]): Set<string> {
  return new Set(enabled(steps).filter(step => step.method === 'drop').flatMap(step => step.columns));
}

export function getSuppression(steps: RecipeStep[]): RecipeStep | undefined {
  return steps.find(step => step.method === 'suppress_rows' && !step.disabled);
}

/** Keeps the enabled suppression step last and aligned with the known fields still in the release. */
export function normalizeSteps(steps: RecipeStep[], known: string[]): RecipeStep[] {
  const dropped = droppedColumns(steps);
  const remaining = known.filter(name => !dropped.has(name));
  const suppression = getSuppression(steps);
  const others = steps.filter(step => step !== suppression);
  if (!suppression || !remaining.length) return others;
  return [...others, { ...suppression, columns: [], params: { ...suppression.params, qi: remaining } }];
}

export function setSuppression(steps: RecipeStep[], known: string[], on: boolean, k = 5, maxFraction = 0.05): RecipeStep[] {
  const others = steps.filter(step => step.method !== 'suppress_rows');
  if (!on) return others;
  return normalizeSteps([...others, withUid({ method: 'suppress_rows', columns: [], params: { qi: known, k, max_fraction: maxFraction } })], known);
}

const stepsKey = (steps: RecipeStep[] | TransformStep[]) => JSON.stringify(cleanSteps(steps as RecipeStep[]));
export const sameSteps = (a: RecipeStep[] | TransformStep[], b: RecipeStep[] | TransformStep[]) => stepsKey(a) === stepsKey(b);

export function recipeParts(steps: TransformStep[]): string[] {
  const parts: string[] = [];
  for (const step of steps) {
    const first = step.columns[0] ?? '';
    switch (step.method) {
      case 'drop': parts.push(`drop ${step.columns.length}`); break;
      case 'centered_interval': parts.push(`${first} ±${String(step.params.radius)} (recoverable)`); break;
      case 'band': parts.push(`${first} ${String(step.params.width)}`); break;
      case 'zip_prefix': parts.push(`${first} ${String(step.params.length)}d`); break;
      case 'date_generalize': parts.push(`${first} ${String(step.params.precision)}`); break;
      case 'round': parts.push(`${first} ±${String(step.params.decimals)}dp`); break;
      case 'rare_group': parts.push(`${first} ≥${String(step.params.min_count)}`); break;
      case 'suppress_rows': parts.push(`k ≥ ${String(step.params.k)}`); break;
      default: parts.push(step.method.replaceAll('_', ' '));
    }
  }
  return parts;
}

export function recipeLabel(steps: TransformStep[]): string {
  const parts = recipeParts(steps);
  if (!parts.length) return 'No transformations';
  return parts.slice(0, 3).join(' · ') + (parts.length > 3 ? ` +${parts.length - 3}` : '');
}

/** What a frozen recipe did to the values of one column, in the words a table header can carry (null when it left them exact). */
export function columnTreatmentNote(steps: TransformStep[], column: string): string | null {
  const notes: string[] = [];
  for (const step of steps) {
    if (!step.columns.includes(column)) continue;
    const params = step.params ?? {};
    switch (step.method) {
      case 'centered_interval': notes.push(`centered ±${String(params.radius)} · midpoint reveals source`); break;
      case 'band': notes.push(`[a,b) bands · width ${String(params.width)}`); break;
      case 'round': notes.push(`rounded · ${String(params.decimals)} dp`); break;
      case 'zip_prefix': notes.push(`${String(params.length)}-digit prefix`); break;
      case 'date_generalize': notes.push(`${String(params.precision)} only`); break;
      case 'date_shift': notes.push('dates shifted'); break;
      case 'rare_group': notes.push('rare values merged'); break;
      case 'mask': notes.push('masked'); break;
      case 'pseudonymize': notes.push('pseudonyms'); break;
      case 'redact': notes.push('patterns redacted'); break;
      case 'top_bottom': notes.push('top/bottom coded'); break;
      case 'noise': notes.push('noise added'); break;
      case 'permute': notes.push('values shuffled'); break;
      case 'suppress_cells': notes.push('some cells blanked'); break;
      default: break;
    }
  }
  return notes.length ? notes.join(' + ') : null;
}

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export function describeTreatment(treatment: Treatment, spec: ColumnSpec): string {
  switch (treatment.kind) {
    case 'keep': return 'Exact values';
    case 'drop': return 'Removed';
    case 'mask': return 'Masked';
    case 'centered_interval': return `Centered ±${treatment.value} · recoverable`;
    case 'band': return `${treatment.value}-${isWeightColumn(spec) ? 'kg' : /age/i.test(spec.name) ? 'year' : 'unit'} bands`;
    case 'round': return `Rounded to ${treatment.value} dp`;
    case 'zip_prefix': return `First ${treatment.value} digits`;
    case 'date_generalize': return `${cap(String(treatment.value))} only`;
    case 'rare_group': return `Categories under ${treatment.value} merged`;
    default: return 'Custom step';
  }
}

/** Plain-language list of what differs between two recipes, per column and per extra method. */
export function diffSteps(before: TransformStep[] | RecipeStep[], after: TransformStep[] | RecipeStep[], schema: ColumnSpec[]): string[] {
  const a = (before as RecipeStep[]).filter(step => !step.disabled);
  const b = (after as RecipeStep[]).filter(step => !step.disabled);
  const lines: string[] = [];
  for (const spec of schema) {
    const left = readTreatment(a, spec.name);
    const right = readTreatment(b, spec.name);
    if (JSON.stringify(left) !== JSON.stringify(right)) lines.push(`${spec.name}: ${describeTreatment(left, spec).toLowerCase()} → ${describeTreatment(right, spec).toLowerCase()}`);
  }
  const extras = (steps: RecipeStep[]) => steps.filter(step => !QUICK_METHODS.has(step.method));
  const key = (step: RecipeStep) => `${step.method}(${step.columns.join(',')})${JSON.stringify(step.params)}`;
  const leftExtras = new Set(extras(a).map(key));
  const rightExtras = new Set(extras(b).map(key));
  for (const item of extras(b)) if (!leftExtras.has(key(item))) lines.push(`added ${item.method.replaceAll('_', ' ')}${item.columns.length ? ` on ${item.columns.join(', ')}` : ''}`);
  for (const item of extras(a)) if (!rightExtras.has(key(item))) lines.push(`removed ${item.method.replaceAll('_', ' ')}${item.columns.length ? ` on ${item.columns.join(', ')}` : ''}`);
  return lines;
}

/* ---------- presets: named, explicit recipes derived from the service's own defaults ---------- */
export type PresetId = 'minimal' | 'default' | 'coarser';
export const PRESETS: { id: PresetId; label: string; summary: string }[] = [
  { id: 'minimal', label: 'Minimal edits', summary: 'Only removes direct identifiers; leaves every other value exact.' },
  { id: 'default', label: 'Service default', summary: 'The service\'s starting recipe for this dataset.' },
  { id: 'coarser', label: 'Coarser data', summary: 'Default recipe with wider bands, shorter ZIP prefixes and year-only dates.' },
];
export function presetSteps(id: PresetId, defaults: TransformStep[]): RecipeStep[] {
  if (id === 'default') return seedSteps(defaults);
  if (id === 'minimal') return seedSteps(defaults.filter(step => step.method === 'drop'));
  return seedSteps(defaults.map(step => {
    const params = { ...step.params };
    if (step.method === 'band') params.width = Math.min(1000, Number(params.width ?? 5) * 2);
    if (step.method === 'zip_prefix') params.length = Math.max(1, Number(params.length ?? 3) - 1);
    if (step.method === 'date_generalize') params.precision = 'year';
    return { ...step, params };
  }));
}
/** Steps in the working recipe that the chosen preset would delete (kept methods the user added). */
export function extraSteps(steps: RecipeStep[], defaults: TransformStep[]): RecipeStep[] {
  const defaultMethods = new Set(defaults.map(step => `${step.method}|${[...step.columns].sort().join(',')}`));
  const defaultColumnsByMethod = new Map<string, Set<string>>();
  for (const step of defaults) {
    const set = defaultColumnsByMethod.get(step.method) ?? new Set<string>();
    step.columns.forEach(column => set.add(column));
    defaultColumnsByMethod.set(step.method, set);
  }
  return steps.filter(step => {
    if (step.disabled) return false;
    const known = defaultColumnsByMethod.get(step.method);
    if (!known) return true;
    if (defaultMethods.has(`${step.method}|${[...step.columns].sort().join(',')}`)) return false;
    return step.columns.some(column => !known.has(column)) || step.method === 'suppress_rows';
  });
}

/* ---------- full transformation catalogue (visual method composer) ---------- */
export interface ParamSpec { key: string; label: string; kind: 'number' | 'select' | 'text'; min?: number; max?: number; step?: number; options?: string[] }
export type MethodGroup = 'identifiers' | 'precision' | 'suppression' | 'experimental';
export interface MethodSpec {
  id: string; label: string; group: MethodGroup; description: string; params: ParamSpec[]; defaults: Record<string, unknown>;
  appliesTo: string; warning?: string; limitation: string; experimental?: boolean;
}

export const METHOD_GROUPS: { id: MethodGroup; label: string }[] = [
  { id: 'identifiers', label: 'Identifiers' },
  { id: 'precision', label: 'Precision' },
  { id: 'suppression', label: 'Suppression and rare groups' },
  { id: 'experimental', label: 'Experimental perturbation (no formal guarantee)' },
];

export const METHODS: MethodSpec[] = [
  { id: 'drop', label: 'Remove columns', group: 'identifiers', appliesTo: 'any column', description: 'Remove the selected columns from the release.', params: [], defaults: {}, limitation: 'Dropping names alone leaves quasi-identifiers that can still single people out.' },
  { id: 'mask', label: 'Mask with a label', group: 'identifiers', appliesTo: 'any column', description: 'Replace every value with one constant label.', params: [{ key: 'value', label: 'Label', kind: 'text' }], defaults: { value: 'REDACTED' }, limitation: 'Masking one field leaves other disclosure routes.' },
  { id: 'pseudonymize', label: 'Keyed pseudonyms', group: 'identifiers', appliesTo: 'identifier columns', description: 'Replace values with HMAC tokens using a key held only by the service for this session.', params: [{ key: 'namespace', label: 'Namespace', kind: 'text' }], defaults: { namespace: 'prism' }, warning: 'Pseudonyms are still linkable: the same value always becomes the same token.', limitation: 'Not anonymous; frequencies and joins survive.' },
  { id: 'redact', label: 'Redact patterns', group: 'identifiers', appliesTo: 'text or category', description: 'Replace e-mail, phone and ID patterns inside text.', params: [{ key: 'replacement', label: 'Replacement', kind: 'text' }], defaults: { replacement: '[REDACTED]' }, limitation: 'Pattern matching misses names and narrative identifiers.' },
  { id: 'band', label: 'Numeric bands', group: 'precision', appliesTo: 'integer or float', description: 'Replace numbers with half-open intervals [a,b).', params: [{ key: 'width', label: 'Band width', kind: 'number', min: 1, max: 1000, step: 1 }], defaults: { width: 5 }, limitation: 'Utility decodes midpoints, which approximate within-band values.' },
  { id: 'centered_interval', label: 'Unsafe demo: centered interval', group: 'precision', appliesTo: 'whole-number integer', description: 'Display x as a closed interval [x−r,x+r], marked CI.', params: [{ key: 'radius', label: 'Radius (±)', kind: 'number', min: 1, max: 1000000, step: 1 }], defaults: { radius: 1 }, warning: 'The midpoint reveals the source value exactly. This display does not reduce distinguishability.', limitation: 'Use fixed nonoverlapping bands for actual precision reduction.' },
  { id: 'round', label: 'Round', group: 'precision', appliesTo: 'integer or float', description: 'Round numeric precision (negative decimals round to tens, hundreds).', params: [{ key: 'decimals', label: 'Decimals', kind: 'number', min: -6, max: 6, step: 1 }], defaults: { decimals: 0 }, limitation: 'Rounding is not formal privacy.' },
  { id: 'zip_prefix', label: 'ZIP prefix', group: 'precision', appliesTo: '5-digit ZIP text', description: 'Keep leading characters of a 5-digit ZIP code.', params: [{ key: 'length', label: 'Digits kept', kind: 'number', min: 1, max: 5, step: 1 }], defaults: { length: 3 }, warning: 'Three digits alone never establish HIPAA Safe Harbor.', limitation: 'Loses geographic resolution; population exceptions apply.' },
  { id: 'top_bottom', label: 'Top / bottom coding', group: 'precision', appliesTo: 'integer or float', description: 'Clamp numeric values to explicit lower and upper bounds.', params: [{ key: 'min', label: 'Lower bound', kind: 'number', step: 1 }, { key: 'max', label: 'Upper bound', kind: 'number', step: 1 }], defaults: { min: 0, max: 100 }, limitation: 'Flattens tails that may matter scientifically.' },
  { id: 'date_generalize', label: 'Coarser dates', group: 'precision', appliesTo: 'date', description: 'Keep UTC hour, day, ISO week, month, quarter or year.', params: [{ key: 'precision', label: 'Precision', kind: 'select', options: ['year', 'quarter', 'month', 'week', 'day', 'hour'] }], defaults: { precision: 'year' }, limitation: 'Residual dates and sequences still need review.' },
  { id: 'rare_group', label: 'Merge rare categories', group: 'suppression', appliesTo: 'category, text, boolean', description: 'Combine infrequent categories into "Other".', params: [{ key: 'min_count', label: 'Minimum rows', kind: 'number', min: 2, max: 100000, step: 1 }], defaults: { min_count: 5 }, limitation: 'Single-column rarity does not establish joint k.' },
  { id: 'suppress_cells', label: 'Suppress cells (seeded)', group: 'suppression', appliesTo: 'any column', description: 'Blank a seeded fraction of selected cells.', params: [{ key: 'fraction', label: 'Fraction', kind: 'number', min: 0, max: 1, step: 0.01 }], defaults: { fraction: 0.05 }, limitation: 'Missingness itself can be a distinguishing pattern.' },
  { id: 'date_shift', label: 'Shift dates (seeded)', group: 'experimental', appliesTo: 'date', description: 'Random displacement within ± days.', params: [{ key: 'days', label: 'Days (±)', kind: 'number', min: 0, max: 36500, step: 1 }], defaults: { days: 30 }, warning: 'Not differential privacy; can disturb temporal relationships.', limitation: 'Known-field exact linkage replay becomes not applicable.', experimental: true },
  { id: 'noise', label: 'Numeric noise (seeded)', group: 'experimental', appliesTo: 'integer or float', description: 'Add Gaussian or Laplace noise. Seed fixed at 42; the same candidate is not resampled on render.', params: [{ key: 'scale', label: 'Scale', kind: 'number', min: 0, step: 0.1 }, { key: 'distribution', label: 'Distribution', kind: 'select', options: ['gaussian', 'laplace'] }], defaults: { scale: 1, distribution: 'gaussian' }, warning: 'This is not differential privacy.', limitation: 'Exact linkage replay on a noised known field is not applicable, which is not the same as zero risk.', experimental: true },
  { id: 'permute', label: 'Permute within groups', group: 'experimental', appliesTo: 'any column', description: 'Shuffle values among rows, optionally within groups.', params: [], defaults: { strata: [] }, warning: 'This is not differential privacy and can reverse research relationships.', limitation: 'Preserves marginals while destroying joint structure.', experimental: true },
];
export const methodById = (id: string) => METHODS.find(method => method.id === id);

/** Client-side check that mirrors common server validation. The server stays authoritative. */
export function validateStep(step: RecipeStep, schema: ColumnSpec[]): string[] {
  if (step.method === 'suppress_rows') return [];
  const issues: string[] = [];
  const spec = methodById(step.method);
  if (!step.columns.length) return ['Select at least one column.'];
  for (const name of step.columns) {
    const column = schema.find(c => c.name === name);
    if (!column) { issues.push(`${name} is not a column of this dataset.`); continue; }
    const numeric = NUMERIC.has(column.dtype);
    if (['band', 'round', 'top_bottom', 'noise'].includes(step.method) && !numeric) issues.push(`${name} is ${column.dtype}; ${spec?.label ?? step.method} needs a numeric column.`);
    if (step.method === 'centered_interval' && column.dtype !== 'integer') issues.push(`${name} must contain whole-number integers for centered intervals.`);
    if (['date_generalize', 'date_shift'].includes(step.method) && column.dtype !== 'date') issues.push(`${name} is ${column.dtype}, not a date.`);
    if (step.method === 'zip_prefix' && !isZipColumn(name)) issues.push(`${name} does not look like a ZIP column; the service needs 5-digit ZIP text.`);
    if (step.method === 'rare_group' && !['category', 'text', 'boolean'].includes(column.dtype)) issues.push(`${name} is numeric; merge rare categories needs category, text or boolean.`);
    if (step.method === 'redact' && !['text', 'category'].includes(column.dtype)) issues.push(`${name} must be text or category for pattern redaction.`);
    if (step.method === 'band' && isWeightColumn(column) && weightUnit(column) === 'unset') issues.push(`${name} needs a reviewed unit (kg or lb) before banding.`);
  }
  if (step.method === 'top_bottom' && Number(step.params.min) > Number(step.params.max)) issues.push('Lower bound must not exceed upper bound.');
  return issues;
}

/** Advanced recipe import: strict shape check, known methods and columns only. */
export function parseRecipeJson(text: string, schema: ColumnSpec[]): { steps?: RecipeStep[]; error?: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { error: 'This is not valid JSON.' }; }
  const list = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { steps?: unknown }).steps) ? (parsed as { steps: unknown[] }).steps : null);
  if (!list) return { error: 'Expected an array of steps, or an object with a "steps" array.' };
  if (list.length > 64) return { error: 'A recipe can hold at most 64 steps.' };
  const names = new Set(schema.map(c => c.name));
  const known = new Set([...METHODS.map(m => m.id), 'suppress_rows']);
  const steps: RecipeStep[] = [];
  for (const [index, item] of list.entries()) {
    if (!item || typeof item !== 'object') return { error: `Step ${index + 1} is not an object.` };
    const { method, columns = [], params = {} } = item as { method?: unknown; columns?: unknown; params?: unknown };
    if (typeof method !== 'string' || !known.has(method)) return { error: `Step ${index + 1}: unknown method "${String(method)}".` };
    if (!Array.isArray(columns) || columns.some(c => typeof c !== 'string')) return { error: `Step ${index + 1}: columns must be a list of names.` };
    const missing = (columns as string[]).filter(c => !names.has(c));
    if (missing.length) return { error: `Step ${index + 1}: no such column ${missing.join(', ')}.` };
    if (!params || typeof params !== 'object' || Array.isArray(params)) return { error: `Step ${index + 1}: params must be an object.` };
    if (method === 'suppress_rows' && index !== list.length - 1) return { error: 'Capped suppression must be the last step.' };
    steps.push(withUid({ method, columns: columns as string[], params: params as Record<string, unknown> }));
  }
  return { steps };
}
