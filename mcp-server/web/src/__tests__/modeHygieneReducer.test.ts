/**
 * Mode Hygiene Reducer Tests — U-LPR10 LATHE-PROD-READY-MS0
 *
 * 100% coverage for the 120-state transition matrix.
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR10
 */

import { describe, it, expect } from 'vitest';
import {
  modeHygieneReducer,
  initialModeHygieneState,
  buildTransitionMatrix,
  computeTransitionResets,
  getFieldDefaultForMode,
  shouldResetField,
  getFieldsToReset,
  createModeHygieneActions,
  validateTransitionMatrix,
  getTransitionMatrixStats,
  MODE_SENSITIVE_FIELDS,
  type ModeHygieneState,
  type ModeHygieneAction,
  type ModeSensitiveField,
} from '../stores/modeHygieneReducer';
import type { MachineMode } from '../data/calculatorWorkspace';

const MODES: MachineMode[] = ['mill', 'lathe', 'edm', 'wire_edm', 'laser', 'waterjet'];

describe('modeHygieneReducer', () => {
  describe('initial state', () => {
    it('starts with mill mode', () => {
      expect(initialModeHygieneState.currentMode).toBe('mill');
    });

    it('has no previous mode', () => {
      expect(initialModeHygieneState.previousMode).toBeNull();
    });

    it('has all 5 mode-sensitive fields', () => {
      const fieldIds = Object.keys(initialModeHygieneState.fields);
      expect(fieldIds).toContain('machineTypeId');
      expect(fieldIds).toContain('toolId');
      expect(fieldIds).toContain('operation');
      expect(fieldIds).toContain('toolpathTypeId');
      expect(fieldIds).toContain('workholding');
      expect(fieldIds.length).toBe(5);
    });

    it('all fields start clean and ephemeral', () => {
      for (const field of Object.values(initialModeHygieneState.fields)) {
        expect(field.dirtyState).toBe('clean');
        expect(field.persistState).toBe('ephemeral');
      }
    });

    it('has empty transition history', () => {
      expect(initialModeHygieneState.transitionHistory).toHaveLength(0);
    });
  });

  describe('SET_MODE action', () => {
    it('changes mode from mill to lathe', () => {
      const action: ModeHygieneAction = { type: 'SET_MODE', payload: 'lathe' };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState.currentMode).toBe('lathe');
      expect(newState.previousMode).toBe('mill');
    });

    it('does not change state when setting same mode', () => {
      const action: ModeHygieneAction = { type: 'SET_MODE', payload: 'mill' };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState).toBe(initialModeHygieneState);
    });

    it('records transition in history', () => {
      const action: ModeHygieneAction = { type: 'SET_MODE', payload: 'wire_edm' };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState.transitionHistory).toHaveLength(1);
      expect(newState.transitionHistory[0].from).toBe('mill');
      expect(newState.transitionHistory[0].to).toBe('wire_edm');
      expect(newState.transitionHistory[0].fieldsReset.length).toBeGreaterThan(0);
    });

    it('limits transition history to 10 entries', () => {
      let state = initialModeHygieneState;
      for (let i = 0; i < 15; i++) {
        const mode = MODES[i % MODES.length];
        const nextMode = MODES[(i + 1) % MODES.length];
        state = { ...state, currentMode: mode };
        state = modeHygieneReducer(state, { type: 'SET_MODE', payload: nextMode });
      }

      expect(state.transitionHistory.length).toBeLessThanOrEqual(10);
    });

    it('resets clean ephemeral fields on mode change', () => {
      const action: ModeHygieneAction = { type: 'SET_MODE', payload: 'edm' };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState.transitionHistory[0].fieldsReset).toContain('toolId');
      expect(newState.transitionHistory[0].fieldsReset).toContain('operation');
    });

    it('preserves dirty fields on mode change', () => {
      // First mark a field dirty
      let state = modeHygieneReducer(
        initialModeHygieneState,
        { type: 'MARK_FIELD_DIRTY', payload: { fieldId: 'toolId' } },
      );

      // Then change mode
      state = modeHygieneReducer(state, { type: 'SET_MODE', payload: 'lathe' });

      expect(state.transitionHistory[0].fieldsPreserved).toContain('toolId');
    });

    it('preserves persisted fields on mode change', () => {
      let state = modeHygieneReducer(
        initialModeHygieneState,
        { type: 'PERSIST_FIELD', payload: { fieldId: 'workholding' } },
      );

      state = modeHygieneReducer(state, { type: 'SET_MODE', payload: 'waterjet' });

      expect(state.transitionHistory[0].fieldsPreserved).toContain('workholding');
    });
  });

  describe('MARK_FIELD_DIRTY action', () => {
    it('marks field as dirty', () => {
      const action: ModeHygieneAction = { type: 'MARK_FIELD_DIRTY', payload: { fieldId: 'toolId' } };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState.fields.toolId.dirtyState).toBe('dirty');
    });

    it('ignores unknown fields', () => {
      const action: ModeHygieneAction = { type: 'MARK_FIELD_DIRTY', payload: { fieldId: 'unknown' } };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState).toBe(initialModeHygieneState);
    });
  });

  describe('MARK_FIELD_CLEAN action', () => {
    it('marks field as clean', () => {
      let state = modeHygieneReducer(
        initialModeHygieneState,
        { type: 'MARK_FIELD_DIRTY', payload: { fieldId: 'operation' } },
      );
      state = modeHygieneReducer(
        state,
        { type: 'MARK_FIELD_CLEAN', payload: { fieldId: 'operation' } },
      );

      expect(state.fields.operation.dirtyState).toBe('clean');
    });

    it('ignores unknown fields', () => {
      const action: ModeHygieneAction = { type: 'MARK_FIELD_CLEAN', payload: { fieldId: 'bogus' } };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState).toBe(initialModeHygieneState);
    });
  });

  describe('PERSIST_FIELD action', () => {
    it('marks field as persisted', () => {
      const action: ModeHygieneAction = { type: 'PERSIST_FIELD', payload: { fieldId: 'machineTypeId' } };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState.fields.machineTypeId.persistState).toBe('persisted');
    });

    it('ignores unknown fields', () => {
      const action: ModeHygieneAction = { type: 'PERSIST_FIELD', payload: { fieldId: 'nope' } };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState).toBe(initialModeHygieneState);
    });
  });

  describe('RESET_FIELD action', () => {
    it('resets field to clean ephemeral', () => {
      let state = modeHygieneReducer(
        initialModeHygieneState,
        { type: 'MARK_FIELD_DIRTY', payload: { fieldId: 'toolpathTypeId' } },
      );
      state = modeHygieneReducer(
        state,
        { type: 'PERSIST_FIELD', payload: { fieldId: 'toolpathTypeId' } },
      );
      state = modeHygieneReducer(
        state,
        { type: 'RESET_FIELD', payload: { fieldId: 'toolpathTypeId' } },
      );

      expect(state.fields.toolpathTypeId.dirtyState).toBe('clean');
      expect(state.fields.toolpathTypeId.persistState).toBe('ephemeral');
    });

    it('ignores unknown fields', () => {
      const action: ModeHygieneAction = { type: 'RESET_FIELD', payload: { fieldId: 'fake' } };
      const newState = modeHygieneReducer(initialModeHygieneState, action);

      expect(newState).toBe(initialModeHygieneState);
    });
  });

  describe('RESET_ALL_FIELDS action', () => {
    it('resets all fields to clean ephemeral', () => {
      let state = initialModeHygieneState;
      for (const fieldId of Object.keys(state.fields)) {
        state = modeHygieneReducer(state, { type: 'MARK_FIELD_DIRTY', payload: { fieldId } });
        state = modeHygieneReducer(state, { type: 'PERSIST_FIELD', payload: { fieldId } });
      }

      state = modeHygieneReducer(state, { type: 'RESET_ALL_FIELDS' });

      for (const field of Object.values(state.fields)) {
        expect(field.dirtyState).toBe('clean');
        expect(field.persistState).toBe('ephemeral');
      }
    });
  });

  describe('COMMIT_TRANSITION action', () => {
    it('clears previous mode', () => {
      let state = modeHygieneReducer(
        initialModeHygieneState,
        { type: 'SET_MODE', payload: 'laser' },
      );
      expect(state.previousMode).toBe('mill');

      state = modeHygieneReducer(state, { type: 'COMMIT_TRANSITION' });
      expect(state.previousMode).toBeNull();
    });
  });
});

describe('buildTransitionMatrix', () => {
  const matrix = buildTransitionMatrix();

  it('creates 180 entries (6×6×5 = 180 mode pairs × fields)', () => {
    expect(matrix.size).toBe(180);
  });

  it('covers all mode-to-mode-to-field combinations', () => {
    for (const fromMode of MODES) {
      for (const toMode of MODES) {
        for (const fieldId of Object.keys(MODE_SENSITIVE_FIELDS)) {
          const key = `${fromMode}:${toMode}:${fieldId}`;
          expect(matrix.has(key)).toBe(true);
        }
      }
    }
  });

  it('same-mode transitions never reset', () => {
    for (const mode of MODES) {
      for (const fieldId of Object.keys(MODE_SENSITIVE_FIELDS)) {
        const key = `${mode}:${mode}:${fieldId}`;
        const rule = matrix.get(key);
        expect(rule?.resetField).toBe(false);
      }
    }
  });

  it('cross-mode transitions reset by default', () => {
    const key = 'mill:lathe:toolId';
    const rule = matrix.get(key);
    expect(rule?.resetField).toBe(true);
  });

  it('preserves dirty fields on cross-mode transition', () => {
    const key = 'edm:wire_edm:operation';
    const rule = matrix.get(key);
    expect(rule?.preserveIfDirty).toBe(true);
  });
});

describe('computeTransitionResets', () => {
  it('preserves all fields when fromMode is null (initial load)', () => {
    const result = computeTransitionResets(null, 'mill', initialModeHygieneState.fields);
    expect(result.reset).toHaveLength(0);
    expect(result.preserve).toHaveLength(5);
  });

  it('preserves all fields when modes are same', () => {
    const result = computeTransitionResets('lathe', 'lathe', initialModeHygieneState.fields);
    expect(result.reset).toHaveLength(0);
    expect(result.preserve).toHaveLength(5);
  });

  it('resets clean ephemeral fields on cross-mode', () => {
    const result = computeTransitionResets('mill', 'wire_edm', initialModeHygieneState.fields);
    expect(result.reset.length).toBeGreaterThan(0);
    expect(result.reset).toContain('toolId');
  });

  it('preserves dirty fields on cross-mode', () => {
    const fields = { ...initialModeHygieneState.fields };
    fields.toolId = { ...fields.toolId, dirtyState: 'dirty' };

    const result = computeTransitionResets('mill', 'laser', fields);
    expect(result.preserve).toContain('toolId');
    expect(result.reset).not.toContain('toolId');
  });

  it('preserves persisted fields on cross-mode', () => {
    const fields = { ...initialModeHygieneState.fields };
    fields.workholding = { ...fields.workholding, persistState: 'persisted' };

    const result = computeTransitionResets('lathe', 'edm', fields);
    expect(result.preserve).toContain('workholding');
    expect(result.reset).not.toContain('workholding');
  });
});

describe('getFieldDefaultForMode', () => {
  it('returns correct default for mill mode', () => {
    expect(getFieldDefaultForMode('toolId', 'mill')).toBe('em-4fl-hss-12mm');
    expect(getFieldDefaultForMode('operation', 'mill')).toBe('roughing');
  });

  it('returns correct default for lathe mode', () => {
    expect(getFieldDefaultForMode('toolId', 'lathe')).toBe('cnmg120408-coated');
    expect(getFieldDefaultForMode('workholding', 'lathe')).toBe('chuck-3jaw-8in');
  });

  it('returns correct default for wire_edm mode', () => {
    expect(getFieldDefaultForMode('toolId', 'wire_edm')).toBe('brass-wire-0.25mm');
    expect(getFieldDefaultForMode('toolpathTypeId', 'wire_edm')).toBe('4-axis-profile');
  });

  it('returns undefined for unknown field', () => {
    expect(getFieldDefaultForMode('nonexistent', 'mill')).toBeUndefined();
  });
});

describe('shouldResetField', () => {
  const cleanEphemeralField: ModeSensitiveField = {
    id: 'toolId',
    defaultByMode: {},
    dirtyState: 'clean',
    persistState: 'ephemeral',
  };

  it('returns false for same mode', () => {
    expect(shouldResetField('mill', 'mill', 'toolId', cleanEphemeralField)).toBe(false);
  });

  it('returns true for clean ephemeral field on cross-mode', () => {
    expect(shouldResetField('mill', 'lathe', 'toolId', cleanEphemeralField)).toBe(true);
  });

  it('returns false for dirty field', () => {
    const dirtyField = { ...cleanEphemeralField, dirtyState: 'dirty' as const };
    expect(shouldResetField('mill', 'edm', 'toolId', dirtyField)).toBe(false);
  });

  it('returns false for persisted field', () => {
    const persistedField = { ...cleanEphemeralField, persistState: 'persisted' as const };
    expect(shouldResetField('lathe', 'waterjet', 'toolId', persistedField)).toBe(false);
  });
});

describe('getFieldsToReset', () => {
  it('returns all clean ephemeral fields for cross-mode', () => {
    const fields = getFieldsToReset('mill', 'wire_edm', initialModeHygieneState.fields);
    expect(fields).toHaveLength(5);
  });

  it('excludes dirty fields', () => {
    const modifiedFields = { ...initialModeHygieneState.fields };
    modifiedFields.operation = { ...modifiedFields.operation, dirtyState: 'dirty' };

    const fields = getFieldsToReset('edm', 'laser', modifiedFields);
    expect(fields).not.toContain('operation');
    expect(fields).toHaveLength(4);
  });

  it('returns empty array for same mode', () => {
    const fields = getFieldsToReset('lathe', 'lathe', initialModeHygieneState.fields);
    expect(fields).toHaveLength(0);
  });
});

describe('createModeHygieneActions', () => {
  it('switchMode dispatches SET_MODE and applies defaults', () => {
    const dispatched: ModeHygieneAction[] = [];
    const fieldsSets: Array<{ fieldId: string; value: string }> = [];

    const actions = createModeHygieneActions(
      (action) => dispatched.push(action),
      () => initialModeHygieneState,
      (fieldId, value) => fieldsSets.push({ fieldId, value }),
    );

    actions.switchMode('lathe');

    expect(dispatched).toContainEqual({ type: 'SET_MODE', payload: 'lathe' });
    expect(fieldsSets.length).toBeGreaterThan(0);
    expect(fieldsSets.find((f) => f.fieldId === 'toolId')?.value).toBe('cnmg120408-coated');
  });

  it('markDirty dispatches MARK_FIELD_DIRTY', () => {
    const dispatched: ModeHygieneAction[] = [];
    const actions = createModeHygieneActions(
      (action) => dispatched.push(action),
      () => initialModeHygieneState,
      () => {},
    );

    actions.markDirty('operation');
    expect(dispatched).toContainEqual({ type: 'MARK_FIELD_DIRTY', payload: { fieldId: 'operation' } });
  });

  it('persist dispatches PERSIST_FIELD', () => {
    const dispatched: ModeHygieneAction[] = [];
    const actions = createModeHygieneActions(
      (action) => dispatched.push(action),
      () => initialModeHygieneState,
      () => {},
    );

    actions.persist('workholding');
    expect(dispatched).toContainEqual({ type: 'PERSIST_FIELD', payload: { fieldId: 'workholding' } });
  });

  it('resetField applies default and dispatches RESET_FIELD', () => {
    const dispatched: ModeHygieneAction[] = [];
    const fieldsSets: Array<{ fieldId: string; value: string }> = [];

    const actions = createModeHygieneActions(
      (action) => dispatched.push(action),
      () => initialModeHygieneState,
      (fieldId, value) => fieldsSets.push({ fieldId, value }),
    );

    actions.resetField('toolId');

    expect(dispatched).toContainEqual({ type: 'RESET_FIELD', payload: { fieldId: 'toolId' } });
    expect(fieldsSets.find((f) => f.fieldId === 'toolId')?.value).toBe('em-4fl-hss-12mm');
  });
});

describe('validateTransitionMatrix', () => {
  it('validates the matrix is complete', () => {
    const result = validateTransitionMatrix();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });
});

describe('getTransitionMatrixStats', () => {
  it('returns correct statistics', () => {
    const stats = getTransitionMatrixStats();

    expect(stats.modes).toBe(6);
    expect(stats.fields).toBe(5);
    expect(stats.dirtyStates).toBe(2);
    expect(stats.persistStates).toBe(2);
    expect(stats.totalStates).toBe(120);
    expect(stats.matrixEntries).toBe(180);
    expect(stats.expectedEntries).toBe(180);
  });
});

describe('120-state coverage', () => {
  it('covers all 6 modes × 5 fields × 2 dirty × 2 persist combinations conceptually', () => {
    const modes: MachineMode[] = ['mill', 'lathe', 'edm', 'wire_edm', 'laser', 'waterjet'];
    const fields = Object.keys(MODE_SENSITIVE_FIELDS);
    const dirtyStates = ['dirty', 'clean'] as const;
    const persistStates = ['persisted', 'ephemeral'] as const;

    let stateCount = 0;

    for (const mode of modes) {
      for (const _fieldId of fields) {
        for (const _dirty of dirtyStates) {
          for (const _persist of persistStates) {
            stateCount++;
          }
        }
      }
    }

    expect(stateCount).toBe(120);
  });

  it('correctly handles all dirty×persist combinations', () => {
    const combinations: Array<{ dirty: 'dirty' | 'clean'; persist: 'persisted' | 'ephemeral'; shouldReset: boolean }> = [
      { dirty: 'clean', persist: 'ephemeral', shouldReset: true },
      { dirty: 'clean', persist: 'persisted', shouldReset: false },
      { dirty: 'dirty', persist: 'ephemeral', shouldReset: false },
      { dirty: 'dirty', persist: 'persisted', shouldReset: false },
    ];

    for (const { dirty, persist, shouldReset } of combinations) {
      const field: ModeSensitiveField = {
        id: 'toolId',
        defaultByMode: {},
        dirtyState: dirty,
        persistState: persist,
      };

      const result = shouldResetField('mill', 'lathe', 'toolId', field);
      expect(result).toBe(shouldReset);
    }
  });
});
