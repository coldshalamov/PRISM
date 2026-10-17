import type { ColumnSpec, Row, TransformStep } from './types';

export interface DraftPreview {
  rows: Row[];
  columns: string[];
  supported: boolean;
  unsupportedMethods: string[];
  warnings: string[];
}

/** Only row-local deterministic operations can be previewed from thirty rows.
 * Full-table measurements always belong to the evaluated server snapshot. */
export function draftPreview(source: Row[], steps: TransformStep[], schema: ColumnSpec[]): DraftPreview {
  const originalColumns = schema.map(field => field.name);
  const specs = new Map(schema.map(field => [field.name, field]));
  let columns = [...originalColumns];
  let rows = source.map(row => ({ ...row }));
  const warnings: string[] = [];
  const supported = new Set(['drop', 'mask', 'band', 'centered_interval', 'round', 'top_bottom', 'zip_prefix', 'date_generalize']);
  const allowedParams: Record<string, string[]> = {
    drop: [], mask: ['value'], band: ['width', 'origin', 'convertFrom'],
    centered_interval: ['radius'], round: ['decimals'], top_bottom: ['min', 'max'],
    zip_prefix: ['length'], date_generalize: ['precision'],
  };
  const unavailable = [...new Set(steps.filter(step => !supported.has(step.method)).map(step => step.method))];
  const result = (ok: boolean, unavailableMethods = unavailable): DraftPreview => ({
    rows: ok ? rows : source, columns: ok ? columns : originalColumns,
    supported: ok, unsupportedMethods: unavailableMethods, warnings,
  });
  if (unavailable.length) return result(false);

  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  // Python's .12g formatting, used by the actual band labels.
  const format = (value: number): string => {
    if (Number.isInteger(value)) return String(value);
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    if (exponent < -4 || exponent >= 12) {
      const [mantissa, power] = value.toExponential(11).split('e');
      const trimmed = mantissa.replace(/\.?0+$/, '');
      const n = Number(power);
      return `${trimmed}e${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(2, '0')}`;
    }
    return value.toFixed(Math.max(0, 11 - exponent)).replace(/\.?0+$/, '');
  };
  const bankers = (value: number): number => {
    const floor = Math.floor(value);
    return value - floor === .5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(value);
  };
  try {
    for (const step of steps) {
      if (step.columns.some(column => !columns.includes(column)) || !step.columns.length || new Set(step.columns).size !== step.columns.length) return result(false, [step.method]);
      const params = step.params;
      if (!params || typeof params !== 'object' || Array.isArray(params)
        || Object.keys(params).some(key => !allowedParams[step.method].includes(key))) return result(false, [step.method]);
      // Validate parameters before inspecting cells: all-null previews must not
      // make an invalid recipe appear supported.
      if (step.method === 'mask' && params.value !== undefined
        && (typeof params.value !== 'string' || params.value.length > 200)) return result(false, [step.method]);
      if (step.method === 'band' && (!finite(params.width) || params.width < 1e-9 || params.width > 1e12
        || (params.origin !== undefined && !finite(params.origin))
        || (params.convertFrom !== undefined && params.convertFrom !== null && params.convertFrom !== 'lb'))) return result(false, [step.method]);
      if (step.method === 'centered_interval' && params.radius !== undefined
        && (!Number.isInteger(params.radius) || Number(params.radius) < 1 || Number(params.radius) > 1e6)) return result(false, [step.method]);
      if (step.method === 'round' && (!Number.isInteger(params.decimals) || Number(params.decimals) < -10 || Number(params.decimals) > 10)) return result(false, [step.method]);
      if (step.method === 'top_bottom' && ((params.min === undefined && params.max === undefined)
        || (params.min !== undefined && !finite(params.min)) || (params.max !== undefined && !finite(params.max))
        || (finite(params.min) && finite(params.max) && params.min > params.max))) return result(false, [step.method]);
      if (step.method === 'zip_prefix' && (!Number.isInteger(params.length) || Number(params.length) < 1 || Number(params.length) > 5)) return result(false, [step.method]);
      if (step.method === 'date_generalize' && !['year', 'quarter', 'month', 'week', 'day', 'hour'].includes(String(params.precision))) return result(false, [step.method]);
      if (step.method === 'drop') {
        columns = columns.filter(column => !step.columns.includes(column));
        rows = rows.map(row => Object.fromEntries(columns.map(column => [column, row[column]])));
        continue;
      }
      for (const column of step.columns) {
        const spec = specs.get(column)!;
        const numeric = ['integer', 'float'].includes(spec.dtype);
        if (['band', 'centered_interval', 'round', 'top_bottom'].includes(step.method) && !numeric) return result(false, [step.method]);
        if (step.method === 'centered_interval' && spec.dtype !== 'integer') return result(false, [step.method]);
        if (step.method === 'zip_prefix' && !['category', 'text'].includes(spec.dtype)) return result(false, [step.method]);
        if (step.method === 'date_generalize' && spec.dtype !== 'date') return result(false, [step.method]);
        if (step.method === 'band') {
          const unit = (spec.unit ?? '').toLowerCase();
          const weight = /weight/i.test(column) || ['kg', 'lb', 'lbs', 'pounds'].includes(unit);
          if (params.convertFrom === 'lb'
            ? !weight || !['', 'lb', 'lbs', 'pounds'].includes(unit)
            : weight && unit !== 'kg') return result(false, [step.method]);
        }
        for (const row of rows) {
          const raw = row[column];
          if (raw === null || raw === undefined) continue;
          if (step.method === 'mask') {
            const value = params.value === undefined ? '[masked]' : params.value;
            if (typeof value !== 'string' || value.length > 200) return result(false, [step.method]);
            row[column] = value;
          } else if (step.method === 'zip_prefix') {
            const length = params.length;
            if (!Number.isInteger(length) || Number(length) < 1 || Number(length) > 5 || typeof raw !== 'string' || !/^\d{5}(?:-\d{4})?$/.test(raw)) return result(false, [step.method]);
            row[column] = String(raw).slice(0, Number(length));
          } else if (step.method === 'date_generalize') {
            if (spec.dtype !== 'date' || typeof raw !== 'string') return result(false, [step.method]);
            const parts = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(raw);
            if (!parts) return result(false, [step.method]);
            const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
            const calendar = new Date(0);
            calendar.setUTCFullYear(year, month - 1, day);
            calendar.setUTCHours(0, 0, 0, 0);
            if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day
              || Number(parts[4] ?? 0) > 23 || Number(parts[5] ?? 0) > 59 || Number(parts[6] ?? 0) > 59) return result(false, [step.method]);
            const date = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : /(?:Z|[+-]\d\d:\d\d)$/.test(raw) ? raw : `${raw}Z`);
            if (!Number.isFinite(date.getTime())) return result(false, [step.method]);
            const iso = date.toISOString();
            switch (params.precision) {
              case 'year': row[column] = iso.slice(0, 4); break;
              case 'quarter': row[column] = `${iso.slice(0, 4)}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`; break;
              case 'month': row[column] = iso.slice(0, 7); break;
              case 'day': row[column] = iso.slice(0, 10); break;
              case 'hour': row[column] = `${iso.slice(0, 13)}:00Z`; break;
              case 'week': {
                const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
                thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
                const first = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
                const week = Math.ceil(((thursday.getTime() - first.getTime()) / 86400000 + 1) / 7);
                row[column] = `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
                break;
              }
              default: return result(false, [step.method]);
            }
          } else {
            if (!finite(raw)) return result(false, [step.method]);
            let value = raw;
            if (step.method === 'band') {
              const width = params.width;
              const origin = params.origin === undefined ? 0 : params.origin;
              if (!finite(width) || width < 1e-9 || width > 1e12 || !finite(origin)) return result(false, [step.method]);
              const unit = (spec.unit ?? '').toLowerCase();
              const weight = /weight/i.test(column) || ['kg', 'lb', 'lbs', 'pounds'].includes(unit);
              if (params.convertFrom === 'lb' && weight && ['', 'lb', 'lbs', 'pounds'].includes(unit)) value *= .45359237;
              else if (params.convertFrom != null || (weight && unit !== 'kg')) return result(false, [step.method]);
              const lower = Math.floor((value - origin) / width) * width + origin;
              const upper = lower + width;
              if (!finite(lower) || !finite(upper) || upper <= lower || Math.max(Math.abs(lower), Math.abs(upper)) > 1e15) return result(false, [step.method]);
              row[column] = `[${format(lower)},${format(upper)})`;
            } else if (step.method === 'centered_interval') {
              const radius = params.radius === undefined ? 1 : params.radius;
              if (spec.dtype !== 'integer' || !Number.isInteger(value) || Math.abs(value) > 1e12 || !Number.isInteger(radius) || Number(radius) < 1 || Number(radius) > 1e6) return result(false, [step.method]);
              row[column] = `CI[${value - Number(radius)},${value + Number(radius)}]`;
              warnings.push('Centered intervals reveal the original through their midpoint; they do not reduce distinguishability.');
            } else if (step.method === 'round') {
              const decimals = params.decimals;
              if (!Number.isInteger(decimals) || Number(decimals) < -10 || Number(decimals) > 10) return result(false, [step.method]);
              const scale = 10 ** Number(decimals);
              row[column] = bankers(value * scale) / scale;
              if (!finite(row[column])) return result(false, [step.method]);
            } else if (step.method === 'top_bottom') {
              const lower = params.min;
              const upper = params.max;
              if ((lower === undefined && upper === undefined) || (lower !== undefined && !finite(lower)) || (upper !== undefined && !finite(upper)) || (finite(lower) && finite(upper) && lower > upper)) return result(false, [step.method]);
              row[column] = Math.min(finite(upper) ? upper : Infinity, Math.max(finite(lower) ? lower : -Infinity, value));
            }
          }
        }
      }
    }
  } catch { return result(false, ['incompatible draft parameters']); }
  return { ...result(true), warnings: [...new Set(warnings)] };
}
