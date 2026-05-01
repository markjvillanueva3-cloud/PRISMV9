/**
 * useKeyboardShortcuts — Global keyboard shortcut manager
 * UX-MS0-U05: Keyboard shortcuts for common actions
 */
import { useEffect, useRef } from "react";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      for (const s of shortcutsRef.current) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = s.alt ? e.altKey : !e.altKey;

        if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

/**
 * Default PRISM keyboard shortcuts.
 */
export function usePrismShortcuts(actions: {
  openCommandPalette?: () => void;
  goToDashboard?: () => void;
  goToJobs?: () => void;
  goToCalculator?: () => void;
  goToMaterials?: () => void;
  toggleHelp?: () => void;
}) {
  const shortcuts: Shortcut[] = [];

  if (actions.openCommandPalette) {
    shortcuts.push({
      key: "k", ctrl: true,
      description: "Open command palette",
      action: actions.openCommandPalette,
    });
  }
  if (actions.goToDashboard) {
    shortcuts.push({
      key: "d", alt: true,
      description: "Go to Dashboard",
      action: actions.goToDashboard,
    });
  }
  if (actions.goToJobs) {
    shortcuts.push({
      key: "j", alt: true,
      description: "Go to Jobs",
      action: actions.goToJobs,
    });
  }
  if (actions.goToCalculator) {
    shortcuts.push({
      key: "c", alt: true,
      description: "Go to Calculator",
      action: actions.goToCalculator,
    });
  }
  if (actions.goToMaterials) {
    shortcuts.push({
      key: "m", alt: true,
      description: "Go to Materials",
      action: actions.goToMaterials,
    });
  }
  if (actions.toggleHelp) {
    shortcuts.push({
      key: "?", shift: true,
      description: "Toggle keyboard shortcuts help",
      action: actions.toggleHelp,
    });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
