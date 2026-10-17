import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { isAudit } from '../../analysis';
import { personUnit, threatFromSchema, threatSentence, UNASSESSED } from '../../threat';
import { Notice } from '../../ui/Feedback';
import { ROLE_META, RoleIcon } from '../../ui/RoleIcon';
import { Term } from '../../ui/Tip';
import { useWorkspace } from '../../workspace';
const MAX_KNOWN = 20;
const MAX_SECRET = 10;

/* ThreatBuilder: who is assumed to know what. Only assumptions PRISM can actually test are editable;
   everything else is listed as unassessed so the absence of a control is never read as a pass. */
export function ThreatPanel() {
  const ws = useWorkspace();
  const { dataset, threat, setThreat, rowUnit, active } = ws;
  const unit = personUnit(rowUnit);
  const sentence = useMemo(() => threatSentence({
    known: threat.known, secret: threat.secret, membershipKnown: threat.membershipKnown, unit, publicRule: Boolean(active && !isAudit(active)),
  }), [threat, unit, active]);
  if (!dataset) return null;
  const direct = dataset.schema.filter(c => c.role === 'direct_identifier').map(c => c.name);
  const knownDirect = threat.known.filter(name => direct.includes(name));
  const toggle = (list: 'known' | 'secret', name: string, on: boolean) => {
    const next = on ? [...threat[list], name] : threat[list].filter(item => item !== name);
    setThreat({ ...threat, [list]: next });
  };
  const seeded = threatFromSchema(dataset.schema);
  const changed = JSON.stringify([...seeded.known].sort()) !== JSON.stringify([...threat.known].sort()) || JSON.stringify([...seeded.secret].sort()) !== JSON.stringify([...threat.secret].sort()) || !threat.membershipKnown;

  return (
    <div className="threat-panel">
      <p className="threat-sentence" aria-live="polite">{sentence}</p>
      <fieldset className="radio-stack">
        <legend>Does the observer know a target is in this file? <Term id="membership" label="source membership" /></legend>
        <label className={threat.membershipKnown ? 'selected' : ''}>
          <input type="radio" name="membership" checked={threat.membershipKnown} onChange={() => setThreat({ ...threat, membershipKnown: true })} />
          <span><b>Yes, membership is known</b><small>The strongest simple model: every target is present.</small></span>
        </label>
        <label className={!threat.membershipKnown ? 'selected' : ''}>
          <input type="radio" name="membership" checked={!threat.membershipKnown} onChange={() => setThreat({ ...threat, membershipKnown: false })} />
          <span><b>No, membership is unknown</b><small>Exact-linkage replay and present-target guessing become not applicable; they are never reported as zero.</small></span>
        </label>
      </fieldset>
      {!threat.membershipKnown ? <Notice tone="warn">Unknown membership needs independent non-member controls that PRISM does not have. Row metrics stay descriptive and conditional.</Notice> : null}

      <h3 className="inspector-sub">Fields in scope <span>{threat.known.length}/{MAX_KNOWN} known · {threat.secret.length}/{MAX_SECRET} secret</span></h3>
      <table className="data-table compact threat-table">
        <thead><tr><th scope="col">Field</th><th scope="col">Known</th><th scope="col">Secret</th></tr></thead>
        <tbody>
          {dataset.schema.map(column => {
            const glyph = ROLE_META[column.role];
            return (
              <tr key={column.name}>
                <th scope="row"><span className="field-name">{column.name}</span>{glyph ? <small className="role-note"><RoleIcon role={column.role} size={12} />{glyph.label}</small> : null}</th>
                <td><input type="checkbox" aria-label={`Observer knows ${column.name}`} checked={threat.known.includes(column.name)} disabled={!threat.known.includes(column.name) && threat.known.length >= MAX_KNOWN} onChange={event => toggle('known', column.name, event.target.checked)} /></td>
                <td><input type="checkbox" aria-label={`${column.name} is a secret the observer seeks`} checked={threat.secret.includes(column.name)} disabled={!threat.secret.includes(column.name) && threat.secret.length >= MAX_SECRET} onChange={event => toggle('secret', column.name, event.target.checked)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {knownDirect.length ? <Notice tone="warn">{knownDirect.join(', ')} {knownDirect.length === 1 ? 'is a' : 'are'} direct identifier{knownDirect.length === 1 ? '' : 's'}. If it stays in the release, every row is unique by definition; drop it in the recipe.</Notice> : null}
      <div className="threat-actions">
        <button type="button" className="btn small" disabled={!changed} onClick={() => setThreat(seeded)}><RotateCcw size={13} />Use confirmed roles</button>
        <span className="muted small">Defaults come from the roles you confirmed. Changing the scenario marks earlier evidence stale.</span>
      </div>

      <h3 className="inspector-sub">Person versus row</h3>
      <p className="small">{unit === 'confirmed'
        ? 'One row per person is confirmed by the data owner. Person-level wording is allowed.'
        : unit === 'repeated'
          ? 'Repeated entity keys were detected, so rows are records or visits, not people.'
          : 'One row per person is not confirmed, so every figure is record-level.'}
        {rowUnit?.entityColumn ? <> Person key: <span className="field-name inline">{rowUnit.entityColumn}</span>.</> : ' No person key is set.'}</p>

      <h3 className="inspector-sub">Not assessed <span>no control exists</span></h3>
      <ul className="unassessed">
        {UNASSESSED.map(item => <li key={item.id}><b>{item.label}</b><small>{item.why}</small></li>)}
      </ul>
    </div>
  );
}
