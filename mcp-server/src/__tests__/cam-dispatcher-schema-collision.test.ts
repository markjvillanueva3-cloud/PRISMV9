/**
 * cam-dispatcher-schema-collision.test.ts
 *
 * Detects action-name collisions across ALL schema modules that camDispatcher
 * merges into MERGED_CAM_SCHEMAS via object spread (83 as of 2026-07-01 --
 * 9 tracked statically below, the full population covered by the
 * source-derived meta-test at the bottom of this file).
 *
 * Because JS spread silently overwrites earlier keys, a collision means
 * the later module's schema wins and the earlier one is silently lost.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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

  it('should resolve every schema module to a defined object (broken-import guard)', () => {
    // As of 2026-07: 8 of the 9 modules are reserved EMPTY stubs ({}) — camDispatcher spreads
    // them into MERGED_CAM_SCHEMAS as reserved extension points to be populated per domain (only
    // ACTION_CAM_SCHEMAS is populated today). So a per-module "≥1 action" assertion is the wrong
    // check here: it tests feature-completeness of reserved slots, not import correctness, is
    // broadly false by design, and can't catch a genuinely broken import anyway (a missing named
    // export → undefined → Object.keys(undefined) throws before any length check runs). Aggregate
    // non-emptiness of the merged set is already covered by the collision test above
    // (expect(actionSources.size).toBeGreaterThan(0)). Here we guard the REAL failure mode a
    // broken import produces: a module that resolved to undefined / null / non-object. See memory
    // reference_cam_schema_collision_test_red_empty_stub_2026_07_01.
    for (const [moduleName, schemaObj] of Object.entries(SCHEMA_MODULES)) {
      expect(
        schemaObj,
        `${moduleName} import did not resolve to an object — is the import path/name correct?`
      ).toBeTypeOf('object');
      expect(schemaObj, `${moduleName} import resolved to null`).not.toBeNull();
    }
  });

  // ── Full-population collision detection (source-derived, self-maintaining) ──
  // The static SCHEMA_MODULES set above tracks only 9 modules, but camDispatcher spreads 83
  // into MERGED_CAM_SCHEMAS (enumerated 2026-07-01) -- collisions among the other 74 were
  // previously undetectable (arm-B/arm-C reviewer finding on 7df9594ee6). Rather than
  // hard-coding 83 imports (drifts every time a peer adds a spread), parse the dispatcher
  // SOURCE for the spread list + import map, dynamically import every schema module, and
  // collision-check the complete population. New spreads are covered automatically; an
  // unimported spread outside the known dispatcher-local set fails loudly.
  describe('full MERGED_CAM_SCHEMAS population (source-derived)', () => {
    const DISPATCHER_TS = join(
      dirname(fileURLToPath(import.meta.url)),
      '..', 'tools', 'dispatchers', 'camDispatcher.ts',
    );
    // Spreads defined as local consts inside camDispatcher.ts (not importable); their action
    // keys are extracted from source below. Extend DELIBERATELY if a new local spread is added
    // (prefer exporting from a schema module instead).
    const KNOWN_LOCAL_SPREADS = new Set(['PAPA_CAM_WIRE_SCHEMAS', 'ROMEO_HOLDER_SCHEMAS']);

    function parseDispatcher() {
      const src = readFileSync(DISPATCHER_TS, 'utf8');
      const block = src.match(/const MERGED_CAM_SCHEMAS\s*=\s*\{([\s\S]*?)\n\};/);
      expect(block, 'MERGED_CAM_SCHEMAS block not found in camDispatcher.ts').not.toBeNull();
      const spreadNames = [...block![1].matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
      const importMap = new Map<string, string>();
      for (const m of src.matchAll(/import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
        for (const raw of m[1].split(',')) {
          const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
          if (name) importMap.set(name, m[2]);
        }
      }
      return { src, spreadNames, importMap };
    }

    it('spread list parses with no duplicates and covers the statically-tracked modules', () => {
      const { spreadNames } = parseDispatcher();
      // Anti-regression floor: 83 spreads as of 2026-07-01. Growth is fine; shrinkage means
      // a schema group was silently dropped from the merge.
      expect(spreadNames.length).toBeGreaterThanOrEqual(83);
      expect(new Set(spreadNames).size, 'duplicate spread of the same module').toBe(spreadNames.length);
      for (const name of Object.keys(SCHEMA_MODULES)) {
        expect(spreadNames, `statically-tracked ${name} vanished from the spread`).toContain(name);
      }
    });

    it('has no action-name collisions across the FULL spread population', async () => {
      const { src, spreadNames, importMap } = parseDispatcher();
      const actionSources = new Map<string, string[]>();
      const addKeys = (moduleName: string, keys: string[]) => {
        for (const k of keys) {
          const arr = actionSources.get(k) ?? [];
          arr.push(moduleName);
          actionSources.set(k, arr);
        }
      };

      for (const name of spreadNames) {
        const importPath = importMap.get(name);
        if (importPath) {
          expect(
            importPath.startsWith('../../schemas/'),
            `${name} imported from unexpected path ${importPath}`,
          ).toBe(true);
          const base = importPath.replace('../../schemas/', '').replace(/\.js$/, '');
          // Import the .ts source directly: vite's dynamic-import-vars glob matches files on
          // disk, and the schema sources are .ts (the .js suffix in dispatcher imports is
          // NodeNext resolution convention, not a real file).
          const mod = await import(`../schemas/${base}.ts`);
          const obj = (mod as Record<string, unknown>)[name];
          expect(typeof obj, `${name} did not resolve from ${importPath}`).toBe('object');
          expect(obj, `${name} resolved to null`).not.toBeNull();
          addKeys(name, Object.keys(obj as Record<string, unknown>));
        } else {
          expect(
            KNOWN_LOCAL_SPREADS.has(name),
            `unimported spread ${name} is not in KNOWN_LOCAL_SPREADS -- export it from a schema module or extend the set deliberately`,
          ).toBe(true);
          const localBlock = src.match(new RegExp(`const ${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
          expect(localBlock, `could not locate local const ${name} in dispatcher source`).not.toBeNull();
          const keys = [...localBlock![1].matchAll(/^ {2}["']?([A-Za-z0-9_]+)["']?\s*:/gm)].map((m) => m[1]);
          expect(keys.length, `parsed zero action keys from local ${name}`).toBeGreaterThan(0);
          addKeys(name, keys);
        }
      }

      const collisions: string[] = [];
      for (const [action, modules] of actionSources) {
        if (modules.length > 1) collisions.push(`"${action}" in: ${modules.join(', ')}`);
      }
      if (collisions.length > 0) {
        expect.fail(
          `Found ${collisions.length} action-name collision(s) across the full ` +
            `${spreadNames.length}-module MERGED_CAM_SCHEMAS spread ` +
            `(the LATER spread silently overwrites the earlier schema):\n  ${collisions.join('\n  ')}`,
        );
      }
      // Self-calibrating sanity floor (not a magic number): ACTION_CAM_SCHEMAS is one of the
      // spread modules, so the merged population must contain at least every one of its keys --
      // proving the loop processed real data. (Measured 2026-07-01: 272 unique actions across
      // all 83 modules, zero collisions.)
      expect(actionSources.size).toBeGreaterThanOrEqual(Object.keys(ACTION_CAM_SCHEMAS).length);
      expect(actionSources.size).toBeGreaterThan(0);
    }, 60_000);
  });

  it('the one populated module (ACTION_CAM_SCHEMAS) must never silently empty', () => {
    // Closes the residual gap left by removing the per-module non-empty check: ACTION_CAM_SCHEMAS
    // is the sole populated contributor to MERGED_CAM_SCHEMAS today, so if it silently lost its
    // schemas the aggregate `actionSources.size > 0` guard (test 1) could stay green once any
    // reserved stub is later populated. Assert the real module directly so it can never empty
    // regardless of stub state. Scoped to the ONE known-populated module — does NOT re-introduce
    // the false-positive on the 8 reserved empty stubs.
    expect(
      Object.keys(ACTION_CAM_SCHEMAS).length,
      'ACTION_CAM_SCHEMAS (the sole populated CAM schema module) is empty — did it silently lose its schemas?'
    ).toBeGreaterThan(0);
  });
});
