import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside an overlay that is not a native modal dialog. */
export function trapTab(event: ReactKeyboardEvent, container: HTMLElement) {
  if (event.key !== 'Tab') return;
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(item => item.getClientRects().length > 0);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && (current === first || !container.contains(current))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (current === last || !container.contains(current))) { event.preventDefault(); first.focus(); }
}

/** The open modal <dialog>, if any. A modal sits in the browser's top layer, so anything that must stay visible
 *  while it is open (toasts, tooltips) has to be rendered inside it rather than at the end of <body>. */
export function useModalHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => setHost(document.querySelector<HTMLElement>('dialog[open]'));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);
  return host;
}

export function useSize<T extends HTMLElement | SVGElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize(current => (Math.abs(current.width - rect.width) < 0.5 && Math.abs(current.height - rect.height) < 0.5 ? current : { width: rect.width, height: rect.height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

/** Moves focus into a container when it mounts and restores it afterwards. */
export function useFocusReturn(active: boolean) {
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    previous.current = document.activeElement as HTMLElement | null;
    return () => previous.current?.focus?.();
  }, [active]);
}

export function useEscape(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') handler(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, handler]);
}
