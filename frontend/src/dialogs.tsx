import { createContext, useContext } from 'react';

export type DialogId = 'import' | 'audit' | 'review' | 'clear' | 'privacy' | 'shortcuts' | 'catalog';

export interface DialogControls {
  open: (id: DialogId) => void;
  close: () => void;
  current: DialogId | null;
}

export const DialogContext = createContext<DialogControls>({ open: () => undefined, close: () => undefined, current: null });
export const useDialogs = () => useContext(DialogContext);
