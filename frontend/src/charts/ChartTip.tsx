import { useCallback, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

export interface TipState { x: number; y: number; content: ReactNode }

/* Shared tooltip for hand-built SVG/HTML charts. Marks call show() on pointermove and on focus,
   so keyboard users read exactly what pointer users read. Tooltips never gate information: every
   value is also available in the chart's "View as table" disclosure. */
export function useChartTip(): {
  container: RefObject<HTMLDivElement | null>;
  tip: TipState | null;
  showAt: (clientX: number, clientY: number, content: ReactNode) => void;
  showFor: (element: Element, content: ReactNode) => void;
  hide: () => void;
} {
  const container = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const showAt = useCallback((clientX: number, clientY: number, content: ReactNode) => {
    const rect = container.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: clientX - rect.left, y: clientY - rect.top, content });
  }, []);
  const showFor = useCallback((element: Element, content: ReactNode) => {
    const box = element.getBoundingClientRect();
    showAt(box.left + box.width / 2, box.top, content);
  }, [showAt]);
  const hide = useCallback(() => setTip(null), []);
  return { container, tip, showAt, showFor, hide };
}

export function ChartTipLayer({ tip, width }: { tip: TipState | null; width: number }) {
  if (!tip) return null;
  const flipX = tip.x > width * 0.62;
  return (
    <div
      className={`chart-tip${flipX ? ' flip' : ''}`}
      style={{ left: tip.x, top: Math.max(tip.y, 40) }}
      role="presentation"
    >
      {tip.content}
    </div>
  );
}

export const SEQ_ORANGE = ['#fdeee3', '#fad3b6', '#f3a672', '#e2702f', '#c2410c', '#8a2b05'];
export function ramp(stops: string[], t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const parse = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(stops[index]);
  const b = parse(stops[index + 1]);
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * mix);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}
export const inkOn = (t: number) => (t > 0.5 ? '#ffffff' : '#0f1218');

export function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max * i) / count);
}
