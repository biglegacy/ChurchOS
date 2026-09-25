import { useEffect } from 'react';

/**
 * Automatically dismisses notifications (success, error, warning, informational)
 * 2 seconds (2000ms) after they are displayed.
 * Starts timer immediately upon notification display.
 * Cleans up previous timers when multiple notifications are triggered.
 * Does not block or undo any underlying operations.
 */
export function useAutoDismissNotification(
  value: any,
  clearValue: (val: any) => void,
  delayMs: number = 2000
) {
  useEffect(() => {
    if (value) {
      const timer = setTimeout(() => {
        clearValue(null);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [value, clearValue, delayMs]);
}
