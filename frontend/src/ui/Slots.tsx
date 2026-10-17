import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/* The shell owns the toolbar and inspector regions; each view fills them through portals so that
   tools and details always sit in the same place, like a native document application. */
export interface SlotTargets { toolbar: HTMLElement | null; inspector: HTMLElement | null }
export const SlotContext = createContext<SlotTargets>({ toolbar: null, inspector: null });

export function ToolbarSlot({ children }: { children: ReactNode }) {
  const { toolbar } = useContext(SlotContext);
  return toolbar ? createPortal(children, toolbar) : null;
}
export function InspectorSlot({ children }: { children: ReactNode }) {
  const { inspector } = useContext(SlotContext);
  return inspector ? createPortal(children, inspector) : null;
}
