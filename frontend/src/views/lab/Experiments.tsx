import { ArrowRight, Check, Minus } from 'lucide-react';
import { num, pct, signed } from '../../format';
import type { LabExperiment } from '../../types';
import { Facts } from '../../ui/Facts';
import { Notice } from '../../ui/Feedback';
import { Capability } from './ThreatRegister';

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const numberList = (value: unknown): number[] | null => Array.isArray(value) && value.every(finite) ? value : null;
const fractionWidth = (value: unknown): string | undefined => finite(value) && value >= 0 && value <= 1 ? `${value * 100}%` : undefined;

export function ExperimentView({ experiment }: { experiment: LabExperiment }) {
  const { id, title, explanation, inputs, result, lesson, assumptions, status } = experiment;
  return <article className="al-experiment" aria-label={title}>
    <header><h2>{title}</h2><p>{explanation}</p><Capability status={status} /></header>
    {status !== 'implemented' ? <Notice tone="warn">This experiment is {status || 'unassessed'}. No completed result is inferred.</Notice> : id === 'differencing' ? <>
      <div className="al-equation" aria-label={`${num(inputs.all_positive_count)} minus ${num(inputs.all_except_target_positive_count)} equals ${num(result.inferred_target_value)}`}><div><strong>{num(inputs.all_positive_count, 0)}</strong><span>All positives</span><small>{num(inputs.people, 0)} fictional people</small></div><Minus size={20} aria-hidden="true" /><div><strong>{num(inputs.all_except_target_positive_count, 0)}</strong><span>Positives, except target</span><small>Same group, one exclusion</small></div><span className="al-equals" aria-hidden="true">=</span><div className="al-inferred"><strong>{num(result.inferred_target_value, 0)}</strong><span>Target’s inferred value</span><small>Binary attribute</small></div></div>
      <p className="al-verification">{result.correct === true ? <><Check size={14} />Verified against fictional ground truth: {num(result.verified_target_value, 0)}.</> : result.correct === false ? 'The inferred value did not match fixture ground truth.' : 'Correctness was not returned by the service.'}</p>
    </> : id === 'composition' ? <>
      <div className="al-composition-bars" aria-label="Sample uniqueness before and after combining releases">{[{ label: 'Age decade alone', key: 'age_alone_unique_fraction', note: 'Release A' }, { label: 'ZIP prefix alone', key: 'zip_alone_unique_fraction', note: 'Release B' }, { label: 'Both facts combined', key: 'combined_unique_fraction', note: 'Linked intersection' }].map((entry, index) => <div key={entry.key} className={index === 2 ? 'combined' : ''}><span><b>{entry.label}</b><small>{entry.note}</small></span><div className="al-composition-track">{fractionWidth(result[entry.key]) !== undefined ? <i style={{ width: fractionWidth(result[entry.key]) }} /> : <span className="al-unavailable-bar">Unavailable</span>}</div><strong>{pct(result[entry.key])}</strong></div>)}</div><p className="al-chart-caption">Sample-unique fraction among {num(inputs.rows, 0)} fictional records. The releases must be linkable for their facts to be combined.</p>
    </> : id === 'correlation' ? <CorrelationExperiment experiment={experiment} /> : id === 'linkage' ? <LinkageExperiment experiment={experiment} /> : <Facts value={result} />}
    <div className="al-lesson"><ArrowRight size={16} aria-hidden="true" /><div><h3>What this demonstrates</h3><p>{lesson}</p></div></div>
    <details className="al-experiment-details"><summary>Inputs, complete result & assumptions</summary><div><h4>Inputs</h4><Facts value={inputs} /><h4>Computed result</h4><Facts value={result} /><h4>Assumptions</h4><ul className="al-assumptions">{assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></div></details>
  </article>;
}

function LinkageExperiment({ experiment }: { experiment: LabExperiment }) {
  const { inputs, result } = experiment;
  const targets = result.targets;
  const matched = result.unique_correct_matches;
  const ambiguous = result.ambiguous_targets;
  const valid = finite(targets) && targets > 0 && finite(matched) && matched >= 0 && matched <= targets;
  return <div className="al-linkage"><div className="al-linkage-headline"><strong>{num(matched, 0)}<span> / {num(targets, 0)}</span></strong><p>unique correct matches<small>verified against fictional ground truth after matching</small></p></div>{valid ? <div className="al-linkage-bar" role="img" aria-label={`${num(matched, 0)} unique correct matches among ${num(targets, 0)} targets; ${num(ambiguous, 0)} ambiguous`}><span style={{ width: `${matched / targets * 100}%` }} /></div> : <Notice>The linkage denominator or result is unavailable.</Notice>}<dl className="al-linkage-facts"><div><dt>Known fields</dt><dd>{Array.isArray(inputs.known_fields) ? inputs.known_fields.join(' + ') : 'Unavailable'}</dd></div><div><dt>Public rules</dt><dd>{num(inputs.age_width, 0)}-year age bins · ZIP prefix {num(inputs.zip_prefix_length, 0)}</dd></div><div><dt>Ambiguous targets</dt><dd>{num(ambiguous, 0)}<small>not verified identities</small></dd></div></dl><p className="al-chart-caption">The matcher receives generalized known facts. Private fixture alignment is used only afterward to check whether each unique candidate is correct. This is a synthetic exact-match demonstration, not operational external linkage.</p></div>;
}

function CorrelationExperiment({ experiment }: { experiment: LabExperiment }) {
  const { inputs, result } = experiment;
  const x = numberList(inputs.x);
  const source = numberList(inputs.original_y);
  const changed = numberList(inputs.permuted_y);
  const valid = x && source && changed && x.length >= 2 && x.length === source.length && x.length === changed.length;
  const xLow = valid ? Math.min(...x) : 0;
  const xHigh = valid ? Math.max(...x) : 1;
  const yLow = valid ? Math.min(...source, ...changed) : 0;
  const yHigh = valid ? Math.max(...source, ...changed) : 1;
  const px = (value: number) => 44 + (value - xLow) / (xHigh - xLow || 1) * 372;
  const py = (value: number) => 194 - (value - yLow) / (yHigh - yLow || 1) * 160;
  return <div className="al-correlation"><div className="al-correlation-figures"><div><span>Original correlation</span><strong>{signed(result.original_correlation, 3)}</strong></div><ArrowRight size={20} aria-hidden="true" /><div><span>Permuted correlation</span><strong>{signed(result.protected_correlation, 3)}</strong></div></div>{valid ? <><svg className="al-correlation-plot" viewBox="0 0 452 232" role="img" aria-label={`On identical scales, original correlation ${signed(result.original_correlation)} and permuted correlation ${signed(result.protected_correlation)}. Exact point values in the table below.`}><line x1="44" y1="194" x2="426" y2="194" className="al-axis" /><line x1="44" y1="24" x2="44" y2="194" className="al-axis" />{[0, 1, 2, 3, 4].map(tick => <line key={tick} x1="44" y1={34 + tick * 40} x2="416" y2={34 + tick * 40} className="al-gridline" />)}<polyline points={x.map((value, index) => `${px(value)},${py(source[index])}`).join(' ')} fill="none" stroke="var(--original)" strokeWidth="2" /><polyline points={x.map((value, index) => `${px(value)},${py(changed[index])}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" />{x.map((value, index) => <g key={index}><circle cx={px(value)} cy={py(source[index])} r="4" fill="var(--original)" /><circle cx={px(value)} cy={py(changed[index])} r="4" fill="var(--accent)" /></g>)}<text x="44" y="214">{num(xLow)}</text><text x="411" y="214">{num(xHigh)}</text><text x="226" y="228">x</text><text x="20" y="38">{num(yHigh)}</text><text x="20" y="198">{num(yLow)}</text><text x="18" y="17">y</text></svg><div className="al-plot-legend"><span><i />Original</span><span><i />Permuted</span></div></> : <Notice>Point inputs are unavailable or misaligned; no relationship chart can be drawn.</Notice>}<table className="data-table compact al-stat-table"><caption>Same marginal summaries, different relationship</caption><thead><tr><th scope="col">Statistic</th><th scope="col" className="num">Original</th><th scope="col" className="num">Permuted</th></tr></thead><tbody><tr><th scope="row">Mean</th><td className="num">{num(result.original_mean, 3)}</td><td className="num">{num(result.protected_mean, 3)}</td></tr><tr><th scope="row">Standard deviation</th><td className="num">{num(result.original_std, 3)}</td><td className="num">{num(result.protected_std, 3)}</td></tr><tr><th scope="row">Correlation with x</th><td className="num">{signed(result.original_correlation, 3)}</td><td className="num">{signed(result.protected_correlation, 3)}</td></tr></tbody></table>{valid ? <details className="al-point-details"><summary>Exact chart values · table alternative</summary><table className="data-table compact"><thead><tr><th scope="col">x</th><th scope="col">Original y</th><th scope="col">Permuted y</th></tr></thead><tbody>{x.map((value, index) => <tr key={index}><th scope="row">{num(value)}</th><td>{num(source[index])}</td><td>{num(changed[index])}</td></tr>)}</tbody></table></details> : null}</div>;
}
