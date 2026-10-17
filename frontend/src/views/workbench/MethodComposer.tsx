import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, Copy, Download, Plus, Trash2 } from 'lucide-react';
import { cleanSteps } from '../../api';
import { title } from '../../format';
import {
  METHOD_GROUPS, METHODS, PRESETS, diffSteps, methodById, newUid, normalizeSteps, parseRecipeJson, sameSteps, validateStep, withUid,
} from '../../recipe';
import type { MethodSpec, PresetId, RecipeStep } from '../../recipe';
import { Notice } from '../../ui/Feedback';
import { MenuButton } from '../../ui/Menu';
import type { MenuItem } from '../../ui/Menu';
import { Term } from '../../ui/Tip';
import { useWorkspace } from '../../workspace';
import type { ColumnSpec, RegistryEntry } from '../../types';

const GLOSSARY_FOR: Record<string, string> = {
  drop: 'drop', band: 'band', zip_prefix: 'zip_prefix', date_generalize: 'date_generalize', rare_group: 'rare_group', permute: 'permute', noise: 'noise',
};

function StepCard({ step, index, count, schema, onChange, onRemove, onMove }: {
  step: RecipeStep; index: number; count: number; schema: ColumnSpec[];
  onChange: (next: RecipeStep) => void; onRemove: () => void; onMove: (delta: number) => void;
}) {
  const method = methodById(step.method);
  const fixed = step.method === 'suppress_rows';
  const issues = useMemo(() => (step.disabled ? [] : validateStep(step, schema)), [step, schema]);
  const toggleColumn = (name: string, checked: boolean) => onChange({ ...step, columns: checked ? [...step.columns, name] : step.columns.filter(c => c !== name) });
  const heading = fixed ? 'Capped k-suppression' : method?.label ?? title(step.method);
  return (
    <li className={`step${step.disabled ? ' off' : ''}`}>
      <div className="step-head">
        <span className="step-n">{index + 1}</span>
        <b>{heading}</b>
        {method?.experimental ? <span className="exp">experimental</span> : null}
        <span className="step-actions">
          <button type="button" role="switch" aria-checked={!step.disabled} aria-label={`${heading} enabled`} className="switch small" onClick={() => onChange({ ...step, disabled: !step.disabled })}><span /></button>
          <button type="button" className="icon-btn" aria-label={`Move ${heading} up`} disabled={fixed || index === 0} onClick={() => onMove(-1)}><ArrowUp size={14} /></button>
          <button type="button" className="icon-btn" aria-label={`Move ${heading} down`} disabled={fixed || index >= count - 1} onClick={() => onMove(1)}><ArrowDown size={14} /></button>
          <button type="button" className="icon-btn" aria-label={`Remove ${heading}`} onClick={onRemove}><Trash2 size={14} /></button>
        </span>
      </div>
      <p className="step-desc">
        {fixed ? 'Removes rows in groups smaller than k among the known fields that remain, only up to the cap. The service re-checks k and the cap on the result. Always the final step.' : method?.description}
        {GLOSSARY_FOR[step.method] ? <Term id={GLOSSARY_FOR[step.method]} label={heading} /> : null}
      </p>
      {method?.warning ? <p className="step-warning"><AlertTriangle size={12} aria-hidden="true" />{method.warning}</p> : null}
      {step.disabled ? <p className="muted small">Disabled: kept in the list but not part of the next evaluation.</p> : null}
      {!fixed ? (
        <fieldset className="step-cols" disabled={step.disabled}>
          <legend>Applies to ({method?.appliesTo})</legend>
          {schema.map(column => (
            <label key={column.name}><input type="checkbox" checked={step.columns.includes(column.name)} onChange={event => toggleColumn(column.name, event.target.checked)} />{column.name}</label>
          ))}
        </fieldset>
      ) : null}
      <div className="step-params">
        {fixed ? (
          <>
            <label>Minimum group size k
              <input type="number" min={1} max={1000} value={Number(step.params.k ?? 5)} disabled={step.disabled} onChange={event => onChange({ ...step, params: { ...step.params, k: Math.max(1, Math.round(Number(event.target.value) || 1)) } })} />
            </label>
            <label>Largest share removed
              <input type="number" min={0} max={1} step={0.01} value={Number(step.params.max_fraction ?? 0.05)} disabled={step.disabled} onChange={event => onChange({ ...step, params: { ...step.params, max_fraction: Math.min(1, Math.max(0, Number(event.target.value) || 0)) } })} />
            </label>
          </>
        ) : method?.params.map(param => (
          <label key={param.key}>{param.label}
            {param.kind === 'select' ? (
              <select value={String(step.params[param.key] ?? method.defaults[param.key])} disabled={step.disabled} onChange={event => onChange({ ...step, params: { ...step.params, [param.key]: event.target.value } })}>
                {param.options?.map(option => <option key={option} value={option}>{title(option)}</option>)}
              </select>
            ) : (
              <input
                type={param.kind === 'number' ? 'number' : 'text'} min={param.min} max={param.max} step={param.step} disabled={step.disabled}
                value={String(step.params[param.key] ?? method.defaults[param.key] ?? '')}
                onChange={event => onChange({ ...step, params: { ...step.params, [param.key]: param.kind === 'number' ? Number(event.target.value) : event.target.value } })}
              />
            )}
          </label>
        ))}
        {step.method === 'permute' ? (
          <label>Shuffle within groups of
            <select multiple size={Math.min(4, schema.length)} disabled={step.disabled} value={(step.params.strata as string[]) ?? []} onChange={event => onChange({ ...step, params: { ...step.params, strata: Array.from(event.target.selectedOptions).map(o => o.value) } })}>
              {schema.map(column => <option key={column.name}>{column.name}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      {method ? <p className="step-limit"><b>Limit:</b> {method.limitation}</p> : null}
      {issues.length ? <ul className="step-issues" aria-live="polite">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
    </li>
  );
}

function Deferred({ entries }: { entries: RegistryEntry[] }) {
  if (!entries.length) return null;
  return (
    <details className="deferred">
      <summary>Not installed or not verified ({entries.length})</summary>
      <p className="muted small">These need engines or reviews this prototype does not have. They are listed so their absence is visible, and none can be run.</p>
      <ul>
        {entries.map(entry => (
          <li key={entry.id}>
            <b>{entry.name ?? entry.id}</b>
            <small>{Array.isArray(entry.limitations) ? entry.limitations.join(' ') : String(entry.limitations ?? entry.limitation ?? '')}</small>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function MethodComposer() {
  const ws = useWorkspace();
  const { dataset, steps, setSteps, threat, registry } = ws;
  const [draft, setDraft] = useState('');
  const [importError, setImportError] = useState('');
  const [parsed, setParsed] = useState<RecipeStep[] | null>(null);
  const [copied, setCopied] = useState(false);
  if (!dataset) return null;
  const schema = dataset.schema;
  const json = JSON.stringify(cleanSteps(steps), null, 2);

  const update = (index: number, next: RecipeStep) => setSteps(steps.map((step, i) => (i === index ? next : step)));
  const remove = (index: number) => setSteps(steps.filter((_, i) => i !== index));
  const move = (index: number, delta: number) => {
    const next = [...steps];
    const target = index + delta;
    if (target < 0 || target >= next.length || next[target].method === 'suppress_rows') return;
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  };
  const add = (method: MethodSpec) => {
    const first = schema.find(c => c.role === 'quasi_identifier')?.name ?? schema[0]?.name;
    const step = withUid({ method: method.id, columns: first ? [first] : [], params: { ...method.defaults } });
    const tail = steps.findIndex(s => s.method === 'suppress_rows');
    setSteps(tail < 0 ? [...steps, step] : [...steps.slice(0, tail), step, ...steps.slice(tail)]);
  };
  const addSuppression = () => {
    if (steps.some(step => step.method === 'suppress_rows')) return;
    setSteps(normalizeSteps([...steps, { uid: newUid(), method: 'suppress_rows', columns: [], params: { qi: threat.known, k: 5, max_fraction: 0.05 } }], threat.known));
  };

  const menuItems: MenuItem[] = METHOD_GROUPS.flatMap(group => [
    { id: `h-${group.id}`, heading: true, label: group.label },
    ...METHODS.filter(method => method.group === group.id).map(method => ({
      id: method.id, label: method.label, hint: method.appliesTo, onSelect: () => add(method),
    })),
    ...(group.id === 'suppression' ? [{ id: 'suppress_rows', label: 'Capped k-suppression', hint: 'removes small groups, up to a cap', disabled: steps.some(s => s.method === 'suppress_rows'), onSelect: addSuppression }] : []),
  ]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(json); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { ws.notify('Copy was blocked by the browser. Select the text and copy it manually.', 'warn'); }
  };
  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'prism-recipe.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const check = (text: string) => {
    setDraft(text);
    if (!text.trim()) { setParsed(null); setImportError(''); return; }
    const result = parseRecipeJson(text, schema);
    setParsed(result.steps ?? null);
    setImportError(result.error ?? '');
  };
  const importDiff = parsed ? diffSteps(steps, parsed, schema) : [];
  const deferred = (registry?.methods ?? []).filter(method => method.status === 'unsupported');

  return (
    <div className="steps-tab">
      <section className="insp-section">
        <div className="field-label">Precision preset</div>
        <div className="seg preset-seg" role="group" aria-label="Precision presets">
          {PRESETS.map(preset => (
            <button key={preset.id} type="button" title={preset.summary} onClick={() => ws.requestPreset(preset.id as PresetId)}>{preset.label}</button>
          ))}
        </div>
        <p className="muted small">The ends are <b>minimal edits</b> and <b>coarser data</b>, never “unsafe” and “safe”. A preset replaces the standard steps; extra methods you added are kept only if you choose to.</p>
      </section>

      <div className="step-add">
        <MenuButton className="btn" label="Add method" icon={<Plus size={14} />} items={menuItems} />
        <span className="muted small">{steps.length} step{steps.length === 1 ? '' : 's'} · seed 42 (not differential privacy)</span>
      </div>

      <ol className="step-list">
        {steps.map((step, index) => (
          <StepCard key={step.uid ?? `${index}-${step.method}`} step={step} index={index} count={steps.length} schema={schema}
            onChange={next => update(index, next)} onRemove={() => remove(index)} onMove={delta => move(index, delta)} />
        ))}
      </ol>
      {!steps.length ? <p className="muted">No transformations. Direct identifiers remain, and protected CSV export will be blocked.</p> : null}

      <Deferred entries={deferred} />

      <details className="advanced-json">
        <summary>Advanced: recipe JSON</summary>
        <p className="muted small">For power users and review. The normal workflow never needs this. Contains steps only; no rows or keys.</p>
        <textarea readOnly rows={6} value={json} aria-label="Current recipe JSON" />
        <div className="threat-actions">
          <button type="button" className="btn small" onClick={() => void copy()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" className="btn small" onClick={download}><Download size={13} />Download .json</button>
        </div>
        <label className="field-label" htmlFor="recipe-import">Import a recipe</label>
        <textarea id="recipe-import" rows={5} value={draft} onChange={event => check(event.target.value)} placeholder='[{"method":"band","columns":["age"],"params":{"width":10}}]' spellCheck={false} />
        {importError ? <p className="form-error" role="alert">{importError}</p> : null}
        {parsed ? (
          <div className="import-preview">
            <b>{parsed.length} step{parsed.length === 1 ? '' : 's'} parsed.</b>
            {sameSteps(parsed, steps) ? <p className="muted small">Identical to the current recipe.</p> : (
              <ul>{importDiff.length ? importDiff.map(line => <li key={line}>{line}</li>) : <li>Order or parameters differ.</li>}</ul>
            )}
            <Notice tone="warn">Importing replaces the whole current recipe. The server still validates every step.</Notice>
            <button type="button" className="btn small primary" onClick={() => { setSteps(normalizeSteps(parsed, threat.known)); setDraft(''); setParsed(null); }}>Replace recipe</button>
          </div>
        ) : null}
      </details>
    </div>
  );
}
