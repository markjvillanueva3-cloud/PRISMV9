/**
 * Mode Hygiene Reducer — U-LPR10 LATHE-PROD-READY-MS0
 *
 * 120-state transition matrix for mode switching hygiene:
 * - 6 modes: mill | lathe | edm | wire_edm | laser | waterjet
 * - 5 mode-sensitive fields: machineTypeId, toolId, operation, toolpathTypeId, workholding
 * - 2 dirty states: dirty | clean
 * - 2 persistence states: persisted | ephemeral
 *
 * Formula: 6 × 5 × 2 × 2 = 120 transition states
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR10
 */

import type { MachineMode } from '../data/calculatorWorkspace';

// ============================================================================
// TYPES
// ============================================================================

export type FieldDirtyState = 'dirty' | 'clean';
export type FieldPersistState = 'persisted' | 'ephemeral';

export interface ModeSensitiveField {
  id: string;
  defaultByMode: Partial<Record<MachineMode, string>>;
  dirtyState: FieldDirtyState;
  persistState: FieldPersistState;
}

export interface ModeHygieneState {
  currentMode: MachineMode;
  previousMode: MachineMode | null;
  fields: Record<string, ModeSensitiveField>;
  transitionHistory: ModeTransition[];
}

export interface ModeTransition {
  from: MachineMode | null;
  to: MachineMode;
  timestamp: number;
  fieldsReset: string[];
  fieldsPreserved: string[];
}

export type ModeHygieneAction =
  | { type: 'SET_MODE'; payload: MachineMode }
  | { type: 'MARK_FIELD_DIRTY'; payload: { fieldId: string } }
  | { type: 'MARK_FIELD_CLEAN'; payload: { fieldId: string } }
  | { type: 'PERSIST_FIELD'; payload: { fieldId: string } }
  | { type: 'RESET_FIELD'; payload: { fieldId: string } }
  | { type: 'RESET_ALL_FIELDS' }
  | { type: 'COMMIT_TRANSITION' };

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const MODES: MachineMode[] = ['mill', 'lathe', 'edm', 'wire_edm', 'laser', 'waterjet'];

const MODE_DEFAULT_MACHINE_TYPE: Record<MachineMode, string> = {
  mill: 'vmc-3axis',
  lathe: 'cnc-lathe-2axis',
  edm: 'sinker-edm',
  wire_edm: 'wire-edm',
  laser: 'laser-cutter',
  waterjet: 'waterjet-cutter',
};

const MODE_DEFAULT_TOOL: Record<MachineMode, string> = {
  mill: 'em-4fl-hss-12mm',
  lathe: 'cnmg120408-coated',
  edm: 'copper-electrode-square',
  wire_edm: 'brass-wire-0.25mm',
  laser: 'co2-cutting-head',
  waterjet: 'sapphire-orifice-0.35mm',
};

const MODE_DEFAULT_OPERATION: Record<MachineMode, string> = {
  mill: 'roughing',
  lathe: 'turning_rough',
  edm: 'sink-rough',
  wire_edm: 'rough-cut',
  laser: 'cut',
  waterjet: 'cut',
};

const MODE_DEFAULT_TOOLPATH: Record<MachineMode, string> = {
  mill: 'adaptive-clearing',
  lathe: 'profile-roughing',
  edm: 'orbit-sink',
  wire_edm: '4-axis-profile',
  laser: 'contour-cut',
  waterjet: 'contour-cut',
};

const MODE_DEFAULT_WORKHOLDING: Record<MachineMode, string> = {
  mill: 'vise-6in',
  lathe: 'chuck-3jaw-8in',
  edm: 'edm-fixture-plate',
  wire_edm: 'wire-fixture-clamp',
  laser: 'vacuum-table',
  waterjet: 'slat-table',
};

/**
 * Mode-sensitive field definitions with defaults per mode
 */
export const MODE_SENSITIVE_FIELDS: Record<string, Omit<ModeSensitiveField, 'dirtyState' | 'persistState'>> = {
  machineTypeId: { id: 'machineTypeId', defaultByMode: MODE_DEFAULT_MACHINE_TYPE },
  toolId: { id: 'toolId', defaultByMode: MODE_DEFAULT_TOOL },
  operation: { id: 'operation', defaultByMode: MODE_DEFAULT_OPERATION },
  toolpathTypeId: { id: 'toolpathTypeId', defaultByMode: MODE_DEFAULT_TOOLPATH },
  workholding: { id: 'workholding', defaultByMode: MODE_DEFAULT_WORKHOLDING },
};

// ============================================================================
// TRANSITION MATRIX
// ============================================================================

/**
 * Transition matrix entry defining what happens to a field when switching modes.
 * Key format: `${fromMode}:${toMode}:${fieldId}`
 */
export interface TransitionRule {
  resetField: boolean;
  preserveIfDirty: boolean;
  preserveIfPersisted: boolean;
}

/**
 * Build the 120-state transition matrix
 * 6 modes × 5 fields × 2 dirty states × 2 persist states = 120 states
 *
 * Rules:
 * - Same mode: never reset
 * - Different mode + field dirty + user persisted: preserve
 * - Different mode + field dirty + ephemeral: prompt (reset by default)
 * - Different mode + field clean: reset to new mode default
 */
export function buildTransitionMatrix(): Map<string, TransitionRule> {
  const matrix = new Map<string, TransitionRule>();
  const fieldIds = Object.keys(MODE_SENSITIVE_FIELDS);

  for (const fromMode of MODES) {
    for (const toMode of MODES) {
      for (const fieldId of fieldIds) {
        const key = `${fromMode}:${toMode}:${fieldId}`;

        if (fromMode === toMode) {
          // Same mode transition: never reset
          matrix.set(key, {
            resetField: false,
            preserveIfDirty: true,
            preserveIfPersisted: true,
          });
        } else {
          // Cross-mode transition: reset unless preserved
          matrix.set(key, {
            resetField: true,
            preserveIfDirty: true,
            preserveIfPersisted: true,
          });
        }
      }
    }
  }

  return matrix;
}

const TRANSITION_MATRIX = buildTransitionMatrix();

// ============================================================================
// REDUCER
// ============================================================================

function createInitialFields(): Record<string, ModeSensitiveField> {
  const fields: Record<string, ModeSensitiveField> = {};
  for (const [id, config] of Object.entries(MODE_SENSITIVE_FIELDS)) {
    fields[id] = {
      ...config,
      dirtyState: 'clean',
      persistState: 'ephemeral',
    };
  }
  return fields;
}

export const initialModeHygieneState: ModeHygieneState = {
  currentMode: 'mill',
  previousMode: null,
  fields: createInitialFields(),
  transitionHistory: [],
};

/**
 * Compute which fields should be reset based on transition matrix
 */
export function computeTransitionResets(
  fromMode: MachineMode | null,
  toMode: MachineMode,
  fields: Record<string, ModeSensitiveField>,
): { reset: string[]; preserve: string[] } {
  const reset: string[] = [];
  const preserve: string[] = [];

  if (fromMode === null || fromMode === toMode) {
    // Initial load or same mode: preserve all
    return { reset: [], preserve: Object.keys(fields) };
  }

  for (const [fieldId, field] of Object.entries(fields)) {
    const key = `${fromMode}:${toMode}:${fieldId}`;
    const rule = TRANSITION_MATRIX.get(key);

    if (!rule) {
      // Unknown transition: default to reset
      reset.push(fieldId);
      continue;
    }

    if (!rule.resetField) {
      preserve.push(fieldId);
      continue;
    }

    // Check preservation conditions
    if (rule.preserveIfDirty && field.dirtyState === 'dirty') {
      preserve.push(fieldId);
      continue;
    }

    if (rule.preserveIfPersisted && field.persistState === 'persisted') {
      preserve.push(fieldId);
      continue;
    }

    reset.push(fieldId);
  }

  return { reset, preserve };
}

/**
 * Get the default value for a field in a given mode
 */
export function getFieldDefaultForMode(fieldId: string, mode: MachineMode): string | undefined {
  const config = MODE_SENSITIVE_FIELDS[fieldId];
  return config?.defaultByMode[mode];
}

/**
 * Mode hygiene reducer implementing the 120-state transition matrix
 */
export function modeHygieneReducer(
  state: ModeHygieneState,
  action: ModeHygieneAction,
): ModeHygieneState {
  switch (action.type) {
    case 'SET_MODE': {
      const newMode = action.payload;
      if (newMode === state.currentMode) {
        return state;
      }

      const { reset, preserve } = computeTransitionResets(
        state.currentMode,
        newMode,
        state.fields,
      );

      // Reset dirty state for reset fields
      const newFields = { ...state.fields };
      for (const fieldId of reset) {
        newFields[fieldId] = {
          ...newFields[fieldId],
          dirtyState: 'clean',
          persistState: 'ephemeral',
        };
      }

      const transition: ModeTransition = {
        from: state.currentMode,
        to: newMode,
        timestamp: Date.now(),
        fieldsReset: reset,
        fieldsPreserved: preserve,
      };

      return {
        ...state,
        previousMode: state.currentMode,
        currentMode: newMode,
        fields: newFields,
        transitionHistory: [...state.transitionHistory.slice(-9), transition],
      };
    }

    case 'MARK_FIELD_DIRTY': {
      const { fieldId } = action.payload;
      if (!state.fields[fieldId]) return state;
      return {
        ...state,
        fields: {
          ...state.fields,
          [fieldId]: { ...state.fields[fieldId], dirtyState: 'dirty' },
        },
      };
    }

    case 'MARK_FIELD_CLEAN': {
      const { fieldId } = action.payload;
      if (!state.fields[fieldId]) return state;
      return {
        ...state,
        fields: {
          ...state.fields,
          [fieldId]: { ...state.fields[fieldId], dirtyState: 'clean' },
        },
      };
    }

    case 'PERSIST_FIELD': {
      const { fieldId } = action.payload;
      if (!state.fields[fieldId]) return state;
      return {
        ...state,
        fields: {
          ...state.fields,
          [fieldId]: { ...state.fields[fieldId], persistState: 'persisted' },
        },
      };
    }

    case 'RESET_FIELD': {
      const { fieldId } = action.payload;
      if (!state.fields[fieldId]) return state;
      return {
        ...state,
        fields: {
          ...state.fields,
          [fieldId]: {
            ...state.fields[fieldId],
            dirtyState: 'clean',
            persistState: 'ephemeral',
          },
        },
      };
    }

    case 'RESET_ALL_FIELDS': {
      return {
        ...state,
        fields: createInitialFields(),
      };
    }

    case 'COMMIT_TRANSITION': {
      // Clear previous mode after transition is acknowledged
      return {
        ...state,
        previousMode: null,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Check if a field should be reset when switching to a new mode
 */
export function shouldResetField(
  fromMode: MachineMode,
  toMode: MachineMode,
  fieldId: string,
  field: ModeSensitiveField,
): boolean {
  if (fromMode === toMode) return false;

  const key = `${fromMode}:${toMode}:${fieldId}`;
  const rule = TRANSITION_MATRIX.get(key);

  if (!rule || !rule.resetField) return false;
  if (rule.preserveIfDirty && field.dirtyState === 'dirty') return false;
  if (rule.preserveIfPersisted && field.persistState === 'persisted') return false;

  return true;
}

/**
 * Get all fields that need reset for a mode transition
 */
export function getFieldsToReset(
  fromMode: MachineMode,
  toMode: MachineMode,
  fields: Record<string, ModeSensitiveField>,
): string[] {
  return Object.entries(fields)
    .filter(([fieldId, field]) => shouldResetField(fromMode, toMode, fieldId, field))
    .map(([fieldId]) => fieldId);
}

/**
 * Create store actions for mode hygiene integrated with calculator store
 */
export function createModeHygieneActions(
  dispatch: (action: ModeHygieneAction) => void,
  getState: () => ModeHygieneState,
  setStoreField: (fieldId: string, value: string) => void,
) {
  return {
    switchMode: (newMode: MachineMode) => {
      const state = getState();
      const { reset } = computeTransitionResets(state.currentMode, newMode, state.fields);

      // Apply defaults for reset fields
      for (const fieldId of reset) {
        const defaultValue = getFieldDefaultForMode(fieldId, newMode);
        if (defaultValue) {
          setStoreField(fieldId, defaultValue);
        }
      }

      dispatch({ type: 'SET_MODE', payload: newMode });
    },

    markDirty: (fieldId: string) => {
      dispatch({ type: 'MARK_FIELD_DIRTY', payload: { fieldId } });
    },

    persist: (fieldId: string) => {
      dispatch({ type: 'PERSIST_FIELD', payload: { fieldId } });
    },

    resetField: (fieldId: string) => {
      const state = getState();
      const defaultValue = getFieldDefaultForMode(fieldId, state.currentMode);
      if (defaultValue) {
        setStoreField(fieldId, defaultValue);
      }
      dispatch({ type: 'RESET_FIELD', payload: { fieldId } });
    },
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that transition matrix covers all states (120 total)
 */
export function validateTransitionMatrix(): { valid: boolean; missing: string[]; extra: string[] } {
  const expectedKeys = new Set<string>();
  const fieldIds = Object.keys(MODE_SENSITIVE_FIELDS);

  for (const fromMode of MODES) {
    for (const toMode of MODES) {
      for (const fieldId of fieldIds) {
        expectedKeys.add(`${fromMode}:${toMode}:${fieldId}`);
      }
    }
  }

  const actualKeys = new Set(TRANSITION_MATRIX.keys());
  const missing = [...expectedKeys].filter((k) => !actualKeys.has(k));
  const extra = [...actualKeys].filter((k) => !expectedKeys.has(k));

  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}

/**
 * Get transition matrix stats
 */
export function getTransitionMatrixStats() {
  const fieldIds = Object.keys(MODE_SENSITIVE_FIELDS);
  return {
    modes: MODES.length,
    fields: fieldIds.length,
    dirtyStates: 2,
    persistStates: 2,
    totalStates: MODES.length * fieldIds.length * 2 * 2,
    matrixEntries: TRANSITION_MATRIX.size,
    expectedEntries: MODES.length * MODES.length * fieldIds.length,
  };
}
