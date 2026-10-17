import { Eye, Fingerprint, Lock, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Role } from '../types';

/* One symbol per field role, used wherever a field is named: table headers, the recipe inspector, the attacker panel.
   Orange names a person on their own, slate identifies in combination, ink is held back, violet is what must be preserved. */
export const ROLE_META: Partial<Record<Role, { label: string; icon: (size: number) => ReactNode }>> = {
  direct_identifier: { label: 'Direct identifier', icon: size => <Fingerprint size={size} /> },
  quasi_identifier: { label: 'Quasi-identifier', icon: size => <Eye size={size} /> },
  sensitive: { label: 'Sensitive', icon: size => <Lock size={size} /> },
  research_target: { label: 'Research target', icon: size => <Target size={size} /> },
};

/** `reserve` keeps the icon's column in a grid for fields that have no role symbol, so rows stay aligned. */
export function RoleIcon({ role, size = 13, reserve = false }: { role: Role | undefined; size?: number; reserve?: boolean }) {
  const meta = role ? ROLE_META[role] : undefined;
  if (!role || !meta) return reserve ? <span className="role-badge ghost" aria-hidden="true" /> : null;
  return <span className={`role-glyph role-badge r-${role}`} role="img" title={meta.label} aria-label={meta.label}>{meta.icon(size)}</span>;
}
