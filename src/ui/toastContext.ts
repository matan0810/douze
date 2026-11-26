import { createContext, useContext } from 'react';

export const ToastContext = createContext<(message: string) => void>(() => undefined);

/** Shows a short message at the bottom of the screen for a moment. */
export function useToast() {
  return useContext(ToastContext);
}
