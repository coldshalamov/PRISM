import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Eye, Fingerprint, Lock, Target } from 'lucide-react';
import { cell } from '../../format';
import type { ColumnSpec, Role, Row } from '../../types';

/* `removed` columns exist in the original but not in the protected release: shown dimmed. */
/* `note` says what the recipe did to this column's values; it replaces the source type, which no longer describes them. */
export interface TableColumn { name: string; spec?: ColumnSpec; removed?: boolean; note?: string | null }

const ROLE_ICON: Partial<Record<Role, { icon: React.ReactNode; label: string }>> = {
  direct_identifier: { icon: <Fingerprint size={12} />, label: 'Direct identifier' },
  quasi_identifier: { icon: <Eye size={12} />, label: 'Quasi-identifier' },
  sensitive: { icon: <Lock size={12} />, label: 'Sensitive' },
  research_target: { icon: <Target size={12} />, label: 'Research target' },
};

/* Spreadsheet-style preview. Column selection is shared between the two panes. Rows are independent
   unless the caller can prove row correspondence (verified, unsuppressed), which is the only case
   where hover and changed-cell highlighting are shown. Row numbers are preview positions, not ids. */
export function DataTable({ side, columns, rows, compareTo, aligned, hoverRow, onHoverRow, scrollRef, onScroll, caption, selectedColumn, highlightedColumns = [], onSelectColumn }: {
  side: 'original' | 'protected';
  columns: TableColumn[];
  rows: Row[];
  compareTo?: Row[];
  aligned: boolean;
  hoverRow: number | null;
  onHoverRow: (index: number | null) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  caption: string;
  selectedColumn: string | null;
  highlightedColumns?: string[];
  onSelectColumn: (name: string | null) => void;
}) {
  const heads = useRef<Record<string, HTMLTableCellElement | null>>({});
  useEffect(() => {
    const container = scrollRef.current;
    const head = selectedColumn ? heads.current[selectedColumn] : null;
    if (!container || !head) return;
    const left = head.offsetLeft - 60;
    const right = head.offsetLeft + head.offsetWidth + 12;
    if (left < container.scrollLeft || right > container.scrollLeft + container.clientWidth) container.scrollTo({ left: Math.max(0, head.offsetLeft - container.clientWidth / 2 + head.offsetWidth / 2) });
  }, [selectedColumn, scrollRef]);

  return (
    <div className="grid-scroll" ref={scrollRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={caption} data-side={side}>
      <table className="grid">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="rownum" aria-label="Preview row"> </th>
            {columns.map(column => {
              const role = column.spec ? ROLE_ICON[column.spec.role] : undefined;
              const selected = selectedColumn === column.name || highlightedColumns.includes(column.name);
              return (
                <th key={column.name} scope="col" ref={node => { heads.current[column.name] = node; }} className={`${column.removed ? 'removed' : ''}${selected ? ' col-selected' : ''}`}>
                  <button type="button" className="th-button" aria-pressed={selected} title={`Highlight ${column.name} in both panes`} onClick={() => onSelectColumn(selectedColumn === column.name ? null : column.name)}>
                    <span className="th-name">{column.name}</span>
                    <span className="th-meta">
                      {role ? <span className={`role-glyph r-${column.spec?.role}`} role="img" title={role.label} aria-label={role.label}>{role.icon}</span> : null}
                      <span>{column.removed ? 'removed in candidate' : column.note ?? column.spec?.dtype ?? ''}{column.spec?.unit ? ` · ${column.spec.unit}` : ''}</span>
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={aligned && hoverRow === index ? 'hover' : ''} onPointerEnter={aligned ? () => onHoverRow(index) : undefined} onPointerLeave={aligned ? () => onHoverRow(null) : undefined}>
              <th scope="row" className="rownum">{index + 1}</th>
              {columns.map(column => {
                const value = row[column.name];
                const changed = aligned && compareTo && !column.removed && String(compareTo[index]?.[column.name]) !== String(value);
                const classes = [typeof value === 'number' ? 'num' : '', changed ? 'changed' : '', column.removed ? 'removed' : '', selectedColumn === column.name || highlightedColumns.includes(column.name) ? 'col-selected' : '', value === null || value === undefined ? 'missing' : ''].filter(Boolean).join(' ');
                return (
                  <td key={column.name} className={classes} title={changed ? `Original: ${cell(compareTo?.[index]?.[column.name])}` : undefined}>
                    {cell(value)}
                    {changed ? <span className="sr-only"> (changed from {cell(compareTo?.[index]?.[column.name])})</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="grid-empty">No preview rows.</p> : null}
    </div>
  );
}
