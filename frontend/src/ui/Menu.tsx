import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface MenuItem {
  id: string;
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  hint?: string;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
  separator?: boolean;
  heading?: boolean;
  onSelect?: () => void;
}

function enabledItems(container: HTMLElement | null): HTMLElement[] {
  return container ? Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"])')) : [];
}

function MenuPopup({ items, labelledBy, onClose, align = 'left' }: { items: MenuItem[]; labelledBy: string; onClose: (restoreFocus: boolean) => void; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { enabledItems(ref.current)[0]?.focus(); }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = enabledItems(ref.current);
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); entries[(index + 1) % entries.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); entries[(index - 1 + entries.length) % entries.length]?.focus(); }
    else if (event.key === 'Home') { event.preventDefault(); entries[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); entries[entries.length - 1]?.focus(); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(true); }
    else if (event.key === 'Tab') onClose(false);
  };
  return (
    <div ref={ref} className={`menu-popup ${align}`} role="menu" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {items.map(item => item.separator ? <div key={item.id} className="menu-sep" role="separator" /> : item.heading ? <div key={item.id} className="menu-heading" role="presentation">{item.label}</div> : (
        <button
          key={item.id}
          type="button"
          role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
          aria-checked={item.checked}
          aria-disabled={item.disabled || undefined}
          tabIndex={-1}
          className={`menu-item${item.danger ? ' danger' : ''}`}
          onClick={() => { if (item.disabled) return; onClose(true); item.onSelect?.(); }}
        >
          <span className="menu-icon" aria-hidden="true">{item.checked ? '✓' : item.icon}</span>
          <span className="menu-label">{item.label}{item.hint ? <small>{item.hint}</small> : null}</span>
          {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
        </button>
      ))}
    </div>
  );
}

/** Stand-alone dropdown button (used in toolbars and the library). */
export function MenuButton({ label, icon, items, className = 'btn', align = 'left', caret = true, ariaLabel }: {
  label?: ReactNode; icon?: ReactNode; items: MenuItem[]; className?: string; align?: 'left' | 'right'; caret?: boolean; ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const id = useId();
  const close = useCallback((restore: boolean) => { setOpen(false); if (restore) button.current?.focus(); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);
  return (
    <span className="menu-wrap" ref={wrap}>
      <button ref={button} id={id} type="button" className={className} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(value => !value)}>
        {icon}{label ? <span>{label}</span> : null}{caret ? <ChevronDown size={14} aria-hidden="true" /> : null}
      </button>
      {open ? <MenuPopup items={items} labelledBy={id} onClose={close} align={align} /> : null}
    </span>
  );
}

/** Document-style menu bar (File, Data, View, Help) with roving arrow-key navigation. */
export function MenuBar({ menus }: { menus: { id: string; label: string; items: MenuItem[] }[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const bar = useRef<HTMLDivElement>(null);
  const base = useId();
  const closeMenu = useCallback((restore: boolean) => {
    setOpenId(current => {
      if (restore && current) buttons.current[current]?.focus();
      return null;
    });
  }, []);
  useEffect(() => {
    if (!openId) return undefined;
    const onPointer = (event: PointerEvent) => { if (!bar.current?.contains(event.target as Node)) setOpenId(null); };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [openId]);

  const move = (current: string, delta: number) => {
    const index = menus.findIndex(menu => menu.id === current);
    const next = menus[(index + delta + menus.length) % menus.length].id;
    buttons.current[next]?.focus();
    if (openId) setOpenId(next);
  };

  return (
    <div className="menubar" role="menubar" aria-label="Application" ref={bar}>
      {menus.map(menu => (
        <div className="menubar-item" key={menu.id}>
          <button
            ref={node => { buttons.current[menu.id] = node; }}
            id={`${base}-${menu.id}`}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openId === menu.id}
            className={openId === menu.id ? 'open' : ''}
            onClick={() => setOpenId(current => (current === menu.id ? null : menu.id))}
            onPointerEnter={() => { if (openId && openId !== menu.id) setOpenId(menu.id); }}
            onKeyDown={event => {
              if (event.key === 'ArrowRight') { event.preventDefault(); move(menu.id, 1); }
              else if (event.key === 'ArrowLeft') { event.preventDefault(); move(menu.id, -1); }
              else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpenId(menu.id); }
            }}
          >
            {menu.label}
          </button>
          {openId === menu.id ? (
            <div onKeyDown={event => {
              if (event.key === 'ArrowRight') { event.preventDefault(); move(menu.id, 1); }
              if (event.key === 'ArrowLeft') { event.preventDefault(); move(menu.id, -1); }
            }}>
              <MenuPopup items={menu.items} labelledBy={`${base}-${menu.id}`} onClose={closeMenu} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
