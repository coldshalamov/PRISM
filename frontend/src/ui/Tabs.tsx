import { useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem<T extends string> { id: T; label: string; badge?: ReactNode; disabled?: boolean }

/* Roving-tabindex tablist. The panel gets id `${prefix}-panel` and aria-labelledby the active tab. */
export function Tabs<T extends string>({ items, value, onChange, label, variant = 'underline', idPrefix }: {
  items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string; variant?: 'underline' | 'segment' | 'sheet'; idPrefix?: string;
}) {
  const generated = useId();
  const prefix = idPrefix ?? generated;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = items.filter(item => !item.disabled);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = enabled.findIndex(item => item.id === value);
    let next: TabItem<T> | undefined;
    if (event.key === 'ArrowRight') next = enabled[(index + 1) % enabled.length];
    else if (event.key === 'ArrowLeft') next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    if (next) {
      event.preventDefault();
      onChange(next.id);
      refs.current[next.id]?.focus();
    }
  };
  return (
    <div className={`tabs ${variant}`} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map(item => (
        <button
          key={item.id}
          ref={node => { refs.current[item.id] = node; }}
          id={`${prefix}-tab-${item.id}`}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          aria-controls={`${prefix}-panel`}
          tabIndex={item.id === value ? 0 : -1}
          disabled={item.disabled}
          className={item.id === value ? 'active' : ''}
          onClick={() => onChange(item.id)}
        >
          {item.label}{item.badge !== undefined ? <span className="tab-badge">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export const panelProps = (prefix: string, active: string) => ({
  id: `${prefix}-panel`, role: 'tabpanel' as const, 'aria-labelledby': `${prefix}-tab-${active}`, tabIndex: 0,
});
