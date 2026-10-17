import { useMemo, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { cell, title } from '../format';
import { isWeightColumn, weightUnit } from '../recipe';
import { Dialog } from '../ui/Dialog';
import { Notice } from '../ui/Feedback';
import { Term } from '../ui/Tip';
import { useWorkspace } from '../workspace';
import type { ColumnSpec, Dtype, Role } from '../types';

const ROLES: { id: Role; label: string; help: string }[] = [
  { id: 'direct_identifier', label: 'Direct identifier', help: 'Names the person on its own (name, email, record ID).' },
  { id: 'quasi_identifier', label: 'Quasi-identifier', help: 'Can single someone out in combination (age, ZIP, weight).' },
  { id: 'sensitive', label: 'Sensitive', help: 'A value an observer should not be able to infer.' },
  { id: 'research_target', label: 'Research target', help: 'Analysed by your research questions; kept unchanged by automatic search.' },
  { id: 'other', label: 'Other', help: 'Neither identifying nor analysed.' },
];
const DTYPES: Dtype[] = ['integer', 'float', 'category', 'date', 'text', 'boolean'];

/* SchemaInspector: every column, not only the ones with familiar names. Roles, types, units and the
   person key decide what is removed, what an observer is assumed to know and whether any figure may
   be read as person-level. Nothing is assumed correct until the owner confirms. */
export function SchemaReview({ onClose }: { onClose: () => void }) {
  const ws = useWorkspace();
  const { dataset } = ws;
  const [schema, setSchema] = useState<ColumnSpec[]>(() => (dataset?.schema ?? []).map(column => ({ ...column })));
  const [entity, setEntity] = useState<string>(dataset?.rowUnit?.entityColumn ?? '');
  const [oneRow, setOneRow] = useState<boolean>(dataset?.rowUnit?.oneRowPerPersonConfirmed ?? false);
  const [acknowledged, setAcknowledged] = useState(false);
  const update = (index: number, change: Partial<ColumnSpec>) => setSchema(current => current.map((column, i) => (i === index ? { ...column, ...change } : column)));

  const unitProblems = useMemo(() => schema.filter(column => isWeightColumn(column) && weightUnit(column) === 'unset').map(column => column.name), [schema]);
  const counts = useMemo(() => ({
    direct: schema.filter(c => c.role === 'direct_identifier').length,
    qi: schema.filter(c => c.role === 'quasi_identifier').length,
    sensitive: schema.filter(c => c.role === 'sensitive').length,
    target: schema.filter(c => c.role === 'research_target').length,
  }), [schema]);
  const sample = (name: string) => (dataset?.preview ?? []).slice(0, 3).map(row => cell(row[name])).join(' · ');

  if (!dataset) return null;
  const repeated = dataset.rowUnit?.repeatedEntitiesDetected && entity && entity === (dataset.rowUnit.entityColumn ?? '');
  const save = async () => {
    const ok = await ws.saveSchema(schema, { entityColumn: entity || null, oneRowPerPersonConfirmed: oneRow }, !ws.candidates.length);
    if (ok) onClose();
  };

  return (
    <Dialog
      title="Review classifications"
      description="Every column is listed. These choices decide what is removed, what an observer is assumed to know, and which results matter."
      size="lg"
      onClose={onClose}
      backdropClose={false}
      footer={(
        <>
          <span className="foot-note"><ShieldCheck size={14} aria-hidden="true" /> {counts.direct} direct · {counts.qi} quasi-identifying · {counts.sensitive} sensitive · {counts.target} research target{counts.target === 1 ? '' : 's'}</span>
          <button type="button" className="btn primary" disabled={!acknowledged || unitProblems.length > 0 || ws.busy.schema} onClick={() => void save()}>
            <Check size={15} />{ws.busy.schema ? 'Saving…' : ws.candidates.length ? 'Confirm classifications' : 'Confirm and create first candidate'}
          </button>
        </>
      )}
    >
      <Notice>Automatic suggestions can miss identifiers and sensitive free text. Classification is the data owner’s decision, and changing it makes earlier evidence stale.</Notice>
      <div className="table-scroll review-scroll">
        <table className="data-table review-table">
          <thead>
            <tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Role</th><th scope="col">Unit</th><th scope="col">Importance</th></tr>
          </thead>
          <tbody>
            {schema.map((column, index) => (
              <tr key={column.name}>
                <th scope="row" data-label="Field">
                  <span className="field-name">{column.name}</span>
                  <small className="field-sample" title="Values from the first preview rows">{sample(column.name)}</small>
                </th>
                <td data-label="Type">
                  <select aria-label={`${column.name} data type`} value={column.dtype} onChange={event => update(index, { dtype: event.target.value as Dtype })}>
                    {DTYPES.map(type => <option key={type} value={type}>{title(type)}</option>)}
                  </select>
                </td>
                <td data-label="Role">
                  <select aria-label={`${column.name} role`} value={column.role} onChange={event => update(index, { role: event.target.value as Role })} title={ROLES.find(r => r.id === column.role)?.help}>
                    {ROLES.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                  </select>
                </td>
                <td data-label="Unit">
                  {isWeightColumn(column) ? (
                    <select aria-label={`${column.name} unit`} aria-invalid={weightUnit(column) === 'unset'} value={weightUnit(column) === 'unset' ? '' : weightUnit(column)} onChange={event => update(index, { unit: event.target.value || null })}>
                      <option value="">Choose unit…</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="lb">Pounds (lb)</option>
                    </select>
                  ) : (
                    <input aria-label={`${column.name} unit`} placeholder="—" value={column.unit ?? ''} onChange={event => update(index, { unit: event.target.value || null })} />
                  )}
                </td>
                <td data-label="Importance">
                  <input aria-label={`${column.name} importance`} type="number" min={0} max={100} step={0.5} value={column.importance}
                    onChange={event => update(index, { importance: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unitProblems.length ? (
        <Notice tone="warn" title="Choose a unit for weight.">
          {unitProblems.join(', ')} must be kilograms or pounds. Pounds are converted explicitly before kilogram banding, and values and tolerances after that conversion are labelled kg; PRISM never assumes kilograms.
          <Term id="unit_conversion" label="explicit unit conversion" />
        </Notice>
      ) : null}
      {!counts.qi ? <Notice tone="warn">No quasi-identifiers are declared, so uniqueness measurements will describe a single group of every row.</Notice> : null}

      <fieldset className="row-unit">
        <legend>Records versus people</legend>
        <p className="muted">PRISM counts <b>rows</b>. A group of five rows is five-person anonymity only when five different people each appear once. Repeated visits from one patient break that reading.</p>
        <div className="row-unit-grid">
          <label>Person key (optional)
            <select value={entity} onChange={event => setEntity(event.target.value)} aria-describedby="entity-help">
              <option value="">No person key</option>
              {schema.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
            </select>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={oneRow} onChange={event => setOneRow(event.target.checked)} />
            <span>I confirm each person appears in <b>exactly one row</b> of this table.</span>
          </label>
        </div>
        <p id="entity-help" className="muted small">A key lets the service look for repeated people; it cannot prove the declaration. Without both, results are labelled record-level.</p>
        {repeated ? <Notice tone="warn">Repeated values were found in the current person key, so rows are visits, not people. Person-level labels stay off.</Notice> : null}
      </fieldset>

      <label className="check-row">
        <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
        <span>I reviewed every field’s role, type and unit, including which fields directly identify a person.</span>
      </label>
    </Dialog>
  );
}
