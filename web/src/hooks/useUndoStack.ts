/**
 * useUndoStack — Per-step undo/redo for Wire EDM Studio
 * WEDM-MS0 U-WEDM19
 *
 * Tracks snapshots of step data with configurable depth (default 10).
 * Scoped per step — resets when step changes.
 * Covers: WCS origin, start holes, feature edits, toolpath params.
 */

import { useState, useCallback, useRef } from "react";

interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UndoActions<T> {
  /** Current value */
  value: T;
  /** Push a new snapshot */
  set: (val: T) => void;
  /** Undo to previous state — returns false if nothing to undo */
  undo: () => boolean;
  /** Redo to next state — returns false if nothing to redo */
  redo: () => boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Reset the stack with a new initial value */
  reset: (val: T) => void;
  /** Number of undo levels available */
  undoCount: number;
  /** Number of redo levels available */
  redoCount: number;
}

/**
 * Hook providing undo/redo with a capped history stack.
 * @param initial  Initial value
 * @param maxDepth Maximum undo levels (default 10)
 */
export function useUndoStack<T>(initial: T, maxDepth = 10): UndoActions<T> {
  const [state, setState] = useState<UndoState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  // Track whether initial has changed (for reset-on-step-change)
  const initialRef = useRef(initial);

  const set = useCallback((val: T) => {
    setState(prev => ({
      past: [...prev.past, prev.present].slice(-maxDepth),
      present: val,
      future: [], // clear redo on new action
    }));
  }, [maxDepth]);

  const undo = useCallback((): boolean => {
    let didUndo = false;
    setState(prev => {
      if (prev.past.length === 0) return prev;
      didUndo = true;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future].slice(0, maxDepth),
      };
    });
    return didUndo;
  }, [maxDepth]);

  const redo = useCallback((): boolean => {
    let didRedo = false;
    setState(prev => {
      if (prev.future.length === 0) return prev;
      didRedo = true;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present].slice(-maxDepth),
        present: next,
        future: prev.future.slice(1),
      };
    });
    return didRedo;
  }, [maxDepth]);

  const reset = useCallback((val: T) => {
    initialRef.current = val;
    setState({ past: [], present: val, future: [] });
  }, []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    reset,
    undoCount: state.past.length,
    redoCount: state.future.length,
  };
}
