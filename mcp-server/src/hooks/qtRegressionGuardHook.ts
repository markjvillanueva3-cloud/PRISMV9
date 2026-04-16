/**
 * QT Regression Guard Hook
 * RES-MS18 U-QTV03: Validates that QT golden-standard parsing hasn't regressed.
 *
 * Fires on: pipeline_validate, program_generate, test_suite events
 * Mode: WARNING — alerts on regression but doesn't block pipeline
 *
 * Checks:
 * - All 13 QT cases parseable from disk
 * - Tool counts match frozen expectations (QT3-12: 2 tools, Q1: 1 tool)
 * - ZMIN depths match within 0.001" tolerance
 * - Safety blocks present in all programs
 * - Self-comparison scores 1.0 for all cases
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

/** Frozen golden expectations — any change here means the parser regressed */
const EXPECTED_TOOL_COUNTS: Record<string, number> = {
  Q1: 1,
  Q2: 1,
  Q3: 2, // T1 flat end mill (appears twice in header comments)
  QT3: 2,
  QT4: 2,
  QT5: 2,
  QT6: 2,
  QT7: 2,
  QT8: 2,
  QT9: 2,
  QT10: 2,
  QT11: 2,
  QT12: 2,
};

/** Frozen ZMIN (deepest T13 face mill cut) per case from program headers */
const EXPECTED_ZMIN: Record<string, number> = {
  QT3: -1.1875,
  QT4: -1.3125,
  QT5: -1.4375,
  QT6: -1.5625,
  QT7: -1.6875,
  QT8: -1.8125,
  QT9: -0.5625,
  QT10: -0.6875,
  QT11: -0.75,
  QT12: -0.8125,
};

export const qtRegressionGuardHook: HookDefinition = {
  id: "qt-regression-guard",
  name: "QT Golden Standard Regression Guard",
  description:
    "Validates that QT3-QT12 golden standard parsing hasn't regressed: tool counts, ZMIN depths, safety blocks, and self-comparison scores.",
  phase: "pre-output",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["qt", "regression", "golden-standard", "validation", "RES-MS18"],

  handler: async (context: HookContext): Promise<HookResult> => {
    const warnings: string[] = [];

    try {
      const { QTValidationSuiteEngine } = await import(
        "../engines/QTValidationSuiteEngine.js"
      );

      const { suite, stats } = await QTValidationSuiteEngine.loadFromDisk();

      // Check 1: All programs loaded
      if (stats.loadedPrograms < 13) {
        warnings.push(
          `Only ${stats.loadedPrograms}/13 programs loaded (failed: ${stats.failedLoads.join(", ")})`
        );
      }

      // Check 2: Tool counts match expectations
      for (const tc of suite) {
        if (!tc.golden) continue;
        const expected = EXPECTED_TOOL_COUNTS[tc.id];
        if (expected !== undefined && tc.golden.tools.length !== expected) {
          warnings.push(
            `${tc.id}: tool count regression — expected ${expected}, got ${tc.golden.tools.length}`
          );
        }
      }

      // Check 3: ZMIN depths match within tolerance
      for (const tc of suite) {
        if (!tc.golden) continue;
        const expected = EXPECTED_ZMIN[tc.id];
        if (expected !== undefined) {
          const tolerance = 0.001;
          if (Math.abs(tc.golden.extents.zMin - expected) > tolerance) {
            warnings.push(
              `${tc.id}: ZMIN regression — expected ${expected}, got ${tc.golden.extents.zMin}`
            );
          }
        }
      }

      // Check 4: Safety blocks present in all programs
      for (const tc of suite) {
        if (!tc.golden) continue;
        if (!tc.golden.safetyBlockPresent) {
          warnings.push(`${tc.id}: missing safety block — parser regression`);
        }
        if (!tc.golden.programEndPresent) {
          warnings.push(`${tc.id}: missing program end — parser regression`);
        }
      }

      // Check 5: Self-comparison scores 1.0 for all loaded cases
      for (const tc of suite) {
        if (!tc.golden) continue;
        const result = QTValidationSuiteEngine.comparePrograms(
          tc.golden,
          tc.golden
        );
        if (result.overallScore !== 1) {
          warnings.push(
            `${tc.id}: self-comparison score ${result.overallScore} (expected 1.0)`
          );
        }
      }

      if (warnings.length > 0) {
        log.warn(
          `qt-regression-guard: ${warnings.length} regression(s) detected`,
          { warnings }
        );
        return hookWarning(qtRegressionGuardHook, warnings.join("; "), {
          warnings,
          data: {
            warningCount: warnings.length,
            loadedPrograms: stats.loadedPrograms,
            goldenParsed: stats.goldenParsed,
          },
        });
      }

      return hookSuccess(qtRegressionGuardHook, "QT golden standards: all 13 cases pass regression checks", {
        data: {
          loadedPrograms: stats.loadedPrograms,
          goldenParsed: stats.goldenParsed,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`qt-regression-guard failed: ${msg}`);
      return hookWarning(qtRegressionGuardHook, `Hook error: ${msg}`, {
        warnings: [`Hook execution error: ${msg}`],
        data: { error: msg },
      });
    }
  },
};

export const QT_REGRESSION_HOOKS: HookDefinition[] = [qtRegressionGuardHook];
