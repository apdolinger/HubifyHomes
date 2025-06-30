import { useEffect, useRef } from "react";

interface HotkeyConfig {
  [key: string]: () => void;
}

function isInInputField(): boolean {
  const activeElement = document.activeElement;
  return !!(activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'SELECT' ||
    (activeElement as any).contentEditable === 'true' ||
    (activeElement as any).isContentEditable
  ));
}

export function useHotkeys(hotkeys: HotkeyConfig) {
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const handler = hotkeysRef.current[event.key];
      
      if (!handler) return;

      // Always handle Escape key regardless of input focus
      if (event.key === 'Escape') {
        handler();
        return;
      }

      // Don't trigger shortcuts when typing in form fields
      if (isInInputField()) {
        return;
      }

      // Prevent default behavior for space key to avoid page scroll
      if (event.key === ' ') {
        event.preventDefault();
      }

      handler();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
