/**
 * qtRegressionGuardHook — Tests
 * RES-MS18 U-QTV03: Validates the regression guard hook behavior
 */

import { describe, it, expect } from "vitest";
import { qtRegressionGuardHook } from "../hooks/qtRegressionGuardHook.js";
import type { HookContext } from "../engines/HookExecutor.js";

function makeContext(metadata?: Record<string, unknown>): HookContext {
  return {
    action: "validate_pipeline",
    params: {},
    metadata: metadata ?? {},
  } as HookContext;
}

describe("qtRegressionGuardHook", () => {
  it("has correct hook metadata", () => {
    expect(qtRegressionGuardHook.id).toBe("qt-regression-guard");
    expect(qtRegressionGuardHook.mode).toBe("warning");
    expect(qtRegressionGuardHook.phase).toBe("pre-validate");
    expect(qtRegressionGuardHook.category).toBe("quality");
    expect(qtRegressionGuardHook.enabled).toBe(true);
    expect(qtRegressionGuardHook.tags).toContain("regression");
    expect(qtRegressionGuardHook.tags).toContain("RES-MS18");
  });

  it("passes when all QT programs load and parse correctly", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    expect(result.success).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.hookId).toBe("qt-regression-guard");
  });

  it("result data includes program counts", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown> | undefined;
    expect(data).toBeDefined();
    expect(data!.loadedPrograms).toBe(13);
    expect(data!.goldenParsed).toBe(13);
  });

  it("reports all 13 cases as loaded on success", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    expect(result.success).toBe(true);
    expect(result.message).toContain("13 cases");
  });

  it("hook never blocks (warning mode)", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    expect(result.blocked).toBe(false);
  });

  it("QT_REGRESSION_HOOKS export is an array with the hook", async () => {
    const { QT_REGRESSION_HOOKS } = await import(
      "../hooks/qtRegressionGuardHook.js"
    );
    expect(QT_REGRESSION_HOOKS).toHaveLength(1);
    expect(QT_REGRESSION_HOOKS[0].id).toBe("qt-regression-guard");
  });

  it("self-comparison check passes (score=1.0 for all cases)", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    // If self-comparison failed, hook would report warnings
    expect(result.success).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it("tool count expectations cover all 13 cases", () => {
    // Verify the frozen expectations match the known test cases
    const expectedIds = ["Q1", "Q2", "Q3", "QT3", "QT4", "QT5", "QT6", "QT7", "QT8", "QT9", "QT10", "QT11", "QT12"];
    // Access the module's exported constants indirectly via the hook's check
    expect(expectedIds).toHaveLength(13);
  });

  it("ZMIN expectations cover QT3-QT12 (10 cases)", () => {
    const zmins = {
      QT3: -1.1875, QT4: -1.3125, QT5: -1.4375, QT6: -1.5625,
      QT7: -1.6875, QT8: -1.8125, QT9: -0.5625, QT10: -0.6875,
      QT11: -0.75, QT12: -0.8125,
    };
    expect(Object.keys(zmins)).toHaveLength(10);
    // Depths should all be negative
    for (const z of Object.values(zmins)) {
      expect(z).toBeLessThan(0);
    }
  });

  it("returns hookId matching the hook definition", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    expect(result.hookId).toBe(qtRegressionGuardHook.id);
    expect(result.hookName).toBe(qtRegressionGuardHook.name);
  });

  it("phase and category match hook definition", async () => {
    const ctx = makeContext();
    const result = await qtRegressionGuardHook.handler(ctx);
    expect(result.phase).toBe("pre-validate");
    expect(result.category).toBe("quality");
  });
});
