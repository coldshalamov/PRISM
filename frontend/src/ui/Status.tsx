import { AlertTriangle, Check, CircleDashed, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Coverage, Outcome } from '../analysis';

/* Status is always glyph + text, never colour alone, and never green: there is no "safe" state. */
export type StatusKind = Outcome | Coverage | 'mixed' | 'info';

const META: Record<StatusKind, { icon: ReactNode; label: string }> = {
  within: { icon: <Check size={13} strokeWidth={2.6} />, label: 'Within tolerance' },
  outside: { icon: <X size={13} strokeWidth={2.6} />, label: 'Outside tolerance' },
  uncovered: { icon: <CircleDashed size={13} strokeWidth={2.4} />, label: 'Uncovered' },
  run: { icon: <Check size={13} strokeWidth={2.6} />, label: 'Run' },
  partial: { icon: <Minus size={13} strokeWidth={2.6} />, label: 'Partly run' },
  mixed: { icon: <AlertTriangle size={13} strokeWidth={2.4} />, label: 'Mixed' },
  info: { icon: <Minus size={13} strokeWidth={2.6} />, label: 'Info' },
};

export function Status({ kind, label }: { kind: StatusKind; label?: string }) {
  const meta = META[kind];
  return <span className={`status s-${kind}`}>{meta.icon}<span>{label ?? meta.label}</span></span>;
}
