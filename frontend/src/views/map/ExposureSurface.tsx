import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { CSSProperties } from 'react';
import { num, pct } from '../../format';
import type { ExposureSubset, RiskResult } from '../../types';
import { Empty, Notice } from '../../ui/Feedback';
import { Tabs, panelProps } from '../../ui/Tabs';
import { Tip } from '../../ui/Tip';

type Exposure = RiskResult['exposure'] | undefined;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const subsetKey = (subset: ExposureSubset) => JSON.stringify(subset.columns);
const heatStyle = (value: unknown): CSSProperties => finite(value) && value >= 0 && value <= 1 ? { backgroundColor: `rgba(217, 72, 15, ${0.06 + value * 0.32})` } : {};

function SubsetDetail({ subset, rowCount }: { subset: ExposureSubset; rowCount: number | undefined }) {
  return <div className="km-subset-detail"><strong className="km-field-text">{subset.columns.join(' + ')}</strong><p><b>{pct(subset.unique_fraction)}</b> of {num(rowCount, 0)} released records are unique for this combination. Minimum group size: <b>{num(subset.k_min, 0)}</b>.</p><p>Exact released values, including missing values as a category. This is sample uniqueness, not verified identity linkage.</p></div>;
}

export function ExposureSurface({ exposure, fields, rowCount }: { exposure: Exposure; fields?: string[]; rowCount?: number }) {
  const [view, setView] = useState<'surface' | 'table'>('surface');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('all');
  const [sort, setSort] = useState('exposure');
  const [page, setPage] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const subsets = exposure?.subsets ?? [];
  const coverage = exposure?.coverage;
  const columns = fields ?? [...new Set(subsets.flatMap(subset => subset.columns))];
  const sizes = [...new Set(subsets.map(subset => subset.columns.length))].sort((a, b) => a - b);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return subsets.filter(subset => (size === 'all' || subset.columns.length === Number(size)) && (!needle || subset.columns.join(' ').toLocaleLowerCase().includes(needle))).sort((a, b) => {
      if (sort === 'size') return a.columns.length - b.columns.length || a.columns.join().localeCompare(b.columns.join());
      if (sort === 'k') return (finite(a.k_min) ? a.k_min : Infinity) - (finite(b.k_min) ? b.k_min : Infinity);
      return (finite(b.unique_fraction) ? b.unique_fraction : -1) - (finite(a.unique_fraction) ? a.unique_fraction : -1) || a.columns.length - b.columns.length;
    });
  }, [subsets, query, size, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 24));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * 24, (currentPage + 1) * 24);
  const selected = subsets.find(subset => subsetKey(subset) === selectedKey);
  if (!exposure) return <Notice tone="warn" title="Exposure results were not returned.">This candidate has no subset measurements to display. Re-evaluate the snapshot to request them; absence is not zero exposure.</Notice>;
  if (rowCount === 0) return <Empty title="No exposure surface for an empty release">Zero records remain. Return to the Workbench to inspect the recipe and row loss.</Empty>;
  return <>
    <div className="km-coverage-line"><b>{num(coverage?.evaluated, 0)} / {num(coverage?.total_possible, 0)} subsets evaluated</b><span>{coverage?.skipped === undefined ? 'Skipped count not reported' : `${num(coverage.skipped, 0)} skipped`}{coverage?.max_subset_size !== undefined ? ` · up to ${num(coverage.max_subset_size, 0)} fields per tested subset` : ''}</span></div>
    {coverage?.exhaustive !== true ? <p className="km-bounded-note">{coverage?.exhaustive === false ? `Search is bounded${coverage.subset_cap !== undefined ? ` to ${num(coverage.subset_cap, 0)} subsets` : ''}. Untested combinations may distinguish more records.` : 'The service did not report exhaustive coverage. Treat these as tested combinations only.'}{coverage?.full_qi_evaluated === true ? ' The full known-field partition was also evaluated for the summary above.' : ''}</p> : null}
    {!subsets.length ? <Empty title={columns.length === 0 ? 'No released known fields in scope' : 'No tested subsets were returned'}>Select the observer’s known fields in the inspector and re-evaluate. No cells here means no subset evidence, never an all-clear.</Empty> : <>
      <div className="km-controls"><Tabs idPrefix="km-surface" variant="segment" value={view} onChange={setView} label="Exposure presentation" items={[{ id: 'surface', label: 'Heatmap' }, { id: 'table', label: 'Results table' }]} /><label className="km-search"><Search size={14} aria-hidden="true" /><span className="sr-only">Find a field combination</span><input type="search" placeholder="Find fields…" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label><label className="km-select-label"><span>Fields</span><select value={size} onChange={event => { setSize(event.target.value); setPage(0); }}><option value="all">All sizes</option>{sizes.map(value => <option key={value} value={value}>{value} known</option>)}</select></label><label className="km-select-label"><span>Sort</span><select value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="exposure">Most unique</option><option value="size">Fewest fields</option><option value="k">Smallest k</option></select></label></div>
      <div {...panelProps('km-surface', view)} className="km-table-panel">
        {visible.length ? <div className="km-matrix-scroll" role="region" aria-label="Tested field combinations, horizontally scrollable" tabIndex={0}><table className={`data-table km-matrix ${view}`}>
          <caption className="sr-only">Exact measured subset results. Sample uniqueness fraction uses all {num(rowCount, 0)} records in the active candidate. A marked field is included in a combination.</caption>
          <thead><tr><th scope="col">Known combination</th>{view === 'surface' ? columns.map((column, index) => <th scope="col" className="km-field-head" key={column}><Tip content={column}><span tabIndex={0}>{index + 1}<span>{column}</span></span></Tip></th>) : <th scope="col" className="num">Fields</th>}<th scope="col" className="num">Sample-unique{rowCount !== undefined ? ` (n=${num(rowCount, 0)})` : ''}</th><th scope="col" className="num">Min k</th>{view === 'table' ? <th scope="col" className="num">Guess fraction</th> : null}</tr></thead>
          <tbody>{visible.map(subset => {
            const key = subsetKey(subset);
            const valid = finite(subset.unique_fraction) && subset.unique_fraction >= 0 && subset.unique_fraction <= 1;
            return <tr key={key} className={selectedKey === key ? 'km-selected-row' : ''}><th scope="row"><Tip content={<SubsetDetail subset={subset} rowCount={rowCount} />}><button type="button" className="km-combination" aria-pressed={selectedKey === key} aria-label={`Inspect ${subset.columns.join(' plus ')}, ${valid ? pct(subset.unique_fraction) + ' sample unique' : 'uniqueness unavailable'}`} onClick={() => setSelectedKey(selectedKey === key ? null : key)}>{subset.columns.map((column, index) => <span key={column}>{index ? <i aria-hidden="true"> + </i> : null}{column}</span>)}</button></Tip></th>{view === 'surface' ? columns.map(column => <td key={column} className="km-field-cell" style={subset.columns.includes(column) ? heatStyle(subset.unique_fraction) : undefined}>{subset.columns.includes(column) ? <><span className="km-field-mark" aria-hidden="true" /><span className="sr-only">Included</span></> : <span className="sr-only">Not included</span>}</td>) : <td className="num">{subset.columns.length}</td>}<td className={`num km-value${valid ? '' : ' km-missing'}`} style={valid ? heatStyle(subset.unique_fraction) : undefined}>{valid ? pct(subset.unique_fraction) : 'Unavailable'}</td><td className="num">{num(subset.k_min, 0)}</td>{view === 'table' ? <td className="num">{pct(subset.p_guess)}</td> : null}</tr>;
          })}</tbody>
        </table></div> : <Empty title="No combinations match these filters">Try another field name or choose all sizes. The underlying measurements have not changed.</Empty>}
      </div>
      <div className="km-table-foot"><div className="km-legend"><span aria-hidden="true" className="km-ramp" /><span>0 → 100% sample-unique</span></div><span role="status">{filtered.length ? `${num(currentPage * 24 + 1, 0)}–${num(Math.min((currentPage + 1) * 24, filtered.length), 0)} of ${num(filtered.length, 0)}` : '0 matching subsets'}</span><div className="km-page-buttons"><button type="button" className="icon-btn" disabled={currentPage === 0} aria-label="Previous combinations" onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><button type="button" className="icon-btn" disabled={currentPage >= pageCount - 1} aria-label="Next combinations" onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
      {selected ? <section className="km-pinned-detail" aria-label="Selected combination"><p className="km-eyebrow">Selected combination</p><SubsetDetail subset={selected} rowCount={rowCount} /><p className="small muted">Conditional single-guess correctness: {pct(selected.p_guess)}. Assumes a uniformly selected present target and uniform guessing within its matching group.</p></section> : <p className="km-interaction-note">Hover, focus or select a combination for its measurement and assumptions. Use Results table for a compact text alternative.</p>}
    </>}
  </>;
}

export function KnowledgeHistogram({ exposure, rowCount }: { exposure: Exposure; rowCount?: number }) {
  const histogram = exposure?.minimal_histogram;
  const exhaustive = exposure?.coverage?.exhaustive === true;
  if (!histogram?.length || rowCount === 0) return <Notice>{rowCount === 0 ? 'No record counts are meaningful for an empty release.' : 'The service returned no minimum-known-fields histogram. This measurement is unavailable.'}</Notice>;
  const total = histogram.reduce((sum, bin) => sum + (finite(bin.count) ? bin.count : 0), 0);
  const max = Math.max(1, ...histogram.map(bin => finite(bin.count) ? bin.count : 0));
  return <div className="km-histogram"><table className="km-hist-table"><caption className="sr-only">Records by {exhaustive ? 'exact minimum' : 'smallest tested'} distinguishing field count</caption><thead><tr><th scope="col">{exhaustive ? 'Smallest distinguishing set' : 'Smallest tested distinguishing set'}</th><th scope="col"><span className="sr-only">Record count bar</span></th><th scope="col" className="num">Records</th></tr></thead><tbody>{histogram.map((bin, index) => <tr key={index} className={bin.known_fields === null ? 'km-undistinguished' : ''}><th scope="row">{bin.known_fields === null ? 'Not distinguished' : `${num(bin.known_fields, 0)} known field${bin.known_fields === 1 ? '' : 's'}`}{bin.known_fields === null ? <small>{exhaustive ? 'by any declared-field subset' : 'among tested subsets only'}</small> : null}</th><td><div className="km-bar-track"><span style={{ width: finite(bin.count) ? `${bin.count / max * 100}%` : '0%' }} /></div></td><td className="num">{num(bin.count, 0)}{rowCount && rowCount > 0 && finite(bin.count) ? <small className="muted"> · {pct(bin.count / rowCount)}</small> : null}</td></tr>)}</tbody><tfoot><tr><th scope="row">Histogram total</th><td /><td className="num">{num(total, 0)} / {num(rowCount, 0)}</td></tr></tfoot></table>{rowCount !== undefined && total !== rowCount ? <Notice tone="warn">Histogram counts total {num(total, 0)}, while the candidate reports {num(rowCount, 0)} rows. These counts do not cover the complete candidate.</Notice> : null}<p className="km-hist-note">{exhaustive ? 'All nonempty subsets were tested, so found minima are exact within the declared released-field model.' : 'Found sizes are upper bounds on the true minima. “Not distinguished” can include rows that an untested combination would distinguish.'} No inference about outside populations is made.</p></div>;
}
