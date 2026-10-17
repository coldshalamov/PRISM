export function num(value: unknown, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—';
}

/** A fraction as a percentage. A non-zero value never rounds to "0%", and a value below 1 never rounds to "100%". */
export function pct(value: unknown, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const points = value * 100;
  const step = 10 ** -digits;
  if (value > 0 && points < step / 2) return `<${num(step, digits)}%`;
  if (value > 0 && value < 1 && points > 100 - step / 2) return `>${num(100 - step, digits)}%`;
  return `${num(points, digits)}%`;
}

/** Signed difference between two fractions, in percentage points. A real difference never reads as "0 pts". */
export function pointsDelta(from: number | null | undefined, to: number | null | undefined, digits = 1): string {
  if (typeof from !== 'number' || typeof to !== 'number') return '—';
  const delta = (to - from) * 100;
  if (Math.abs(delta) < 1e-9) return '0 pts';
  const step = 10 ** -digits;
  const sign = delta > 0 ? '+' : '−';
  if (Math.abs(delta) < step / 2) return `${sign}<${num(step, digits)} pts`;
  return `${sign}${num(Math.abs(delta), digits)} pts`;
}

/** Signed difference between two numbers. A non-zero difference never rounds to "+0" or "−0". */
export function numDelta(from: number | null | undefined, to: number | null | undefined, digits = 2): string {
  if (typeof from !== 'number' || typeof to !== 'number') return '—';
  const delta = to - from;
  if (Math.abs(delta) < 1e-9) return '0';
  const step = 10 ** -digits;
  const sign = delta > 0 ? '+' : '−';
  if (Math.abs(delta) < step / 2) return `${sign}<${num(step, digits)}`;
  return `${sign}${num(Math.abs(delta), digits)}`;
}

export function signed(value: unknown, digits = 3): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const text = num(Math.abs(value), digits);
  return value < 0 ? `−${text}` : value > 0 ? `+${text}` : text;
}

export function cell(value: unknown): string {
  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) return '∅';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : num(value, 3);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function title(value: string): string {
  const spaced = value.replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${num(count, 0)} ${count === 1 ? one : many}`;
}

export function ago(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (Number.isNaN(seconds)) return '';
  if (seconds < 8) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

export function groupLabel(group: Record<string, unknown> | undefined): string {
  const entries = Object.entries(group ?? {});
  if (!entries.length) return 'All rows';
  return entries.map(([key, value]) => `${key} = ${cell(value)}`).join(' · ');
}

export function scalar(value: unknown): string {
  if (typeof value === 'number') return num(value, 4);
  if (Array.isArray(value)) return `${value.length} cohorts`;
  return value === null || value === undefined ? 'Unavailable' : cell(value);
}

export function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    : [];
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
