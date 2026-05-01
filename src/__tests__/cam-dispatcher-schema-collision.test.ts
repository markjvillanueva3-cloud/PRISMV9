/**
 * cam-dispatcher-schema-collision.test.ts
 *
 * Detects action-name collisions across the 9 schema modules that
 * camDispatcher merges into MERGED_CAM_SCHEMAS via object spread.
 *
 * Because JS spread silently overwrites earlier keys, a collision means
 * the later module's schema wins and the earlier one is silently lost.
 */
import { describe, it, expect } from 'vitest';
import { ACTION_CAM_SCHEMAS } from '../schemas/camActionSchemas.js';
import { ACTION_POST_PROCESSOR_EXT_SCHEMAS } from '../schemas/postProcessorExtActionSchemas.js';
import { ACTION_ADVANCED_SCIENCE_SCHEMAS } from '../schemas/advancedScienceActionSchemas.js';
import { ACTION_CNC_PROGRAMMING_SCHEMAS } from '../schemas/cncProgrammingActionSchemas.js';
import { ACTION_CK_PIPELINE_SCHEMAS } from '../schemas/ckPipelineActionSchemas.js';
import { ACTION_CAM_KERNEL_SCHEMAS } from '../schemas/camKernelActionSchemas.js';
import { ACTION_CK_MS10_SCHEMAS } from '../schemas/ckMs10ActionSchemas.js';
import { ACTION_CK_MS11_SCHEMAS } from '../schemas/ckMs11ActionSchemas.js';
import { ACTION_CK_MS12_SCHEMAS } from '../schemas/ckMs12ActionSchemas.js';

/** Every schema module that camDispatcher spreads into MERGED_CAM_SCHEMAS */
const SCHEMA_MODULES: Record<string, Record<string, unknown>> = {
  ACTION_CAM_SCHEMAS,
  ACTION_POST_PROCESSOR_EXT_SCHEMAS,
  ACTION_ADVANCED_SCIENCE_SCHEMAS,
  ACTION_CNC_PROGRAMMING_SCHEMAS,
  ACTION_CK_PIPELINE_SCHEMAS,
  ACTION_CAM_KERNEL_SCHEMAS,
  ACTION_CK_MS10_SCHEMAS,
  ACTION_CK_MS11_SCHEMAS,
  ACTION_CK_MS12_SCHEMAS,
};

describe('camDispatcher schema collision detection', () => {
  it('should have no action names duplicated across schema modules', () => {
    // Map: actionName -> list of module names that define it
    const actionSources = new Map<string, string[]>();

    for (const [moduleName, schemaObj] of Object.entries(SCHEMA_MODULES)) {
      for (const actionName of Object.keys(schemaObj)) {
        const existing = actionSources.get(actionName);
        if (existing) {
          existing.push(moduleName);
        } else {
          actionSources.set(actionName, [moduleName]);
        }
      }
    }

    // Find all actions that appear in more than one module
    const collisions: { action: string; modules: string[] }[] = [];
    for (const [action, modules] of actionSources) {
      if (modules.length > 1) {
        collisions.push({ action, modules });
      }
    }

    // Build a readable failure message
    if (collisions.length > 0) {
      const report = collisions
        .map(
          (c) =>
            `  "${c.action}" found in: ${c.modules.join(', ')}`
        )
        .join('\n');

      expect.fail(
        `Found ${collisions.length} action name collision(s) in camDispatcher MERGED_CAM_SCHEMAS:\n${report}\n\n` +
          'The later spread overwrites the earlier schema silently. ' +
          'Rename or relocate the duplicate action(s).'
      );
    }

    // Sanity: we actually checked something
    expect(actionSources.size).toBeGreaterThan(0);
  });

  it('should have at least one action in every schema module', () => {
    for (const [moduleName, schemaObj] of Object.entries(SCHEMA_MODULES)) {
      expect(
        Object.keys(schemaObj).length,
        `${moduleName} has zero actions — is the import correct?`
      ).toBeGreaterThan(0);
    }
  });
});
