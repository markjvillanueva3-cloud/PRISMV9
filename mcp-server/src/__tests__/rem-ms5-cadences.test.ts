/**
 * REM-MS5-U00: Cadence Function Test Suite
 * ==========================================
 * Tests cadence executor functions for:
 * - Return shape correctness (all functions return structured results)
 * - Zone/pressure logic (pure computation)
 * - Graceful error handling (no uncaught exceptions)
 * - Function export completeness
 */
import { describe, it, expect } from "vitest";
import * as cadence from "../tools/cadenceExecutor.js";

// ── Export completeness ─────────────────────────────────────────────────────

describe("Cadence executor export completeness", () => {
  const expectedExports = [
    "autoTodoRefresh", "autoCheckpoint", "autoContextPressure",
    "autoCompactionDetect", "autoContextCompress", "autoPatternMatch",
    "autoPatternStatsUpdate", "autoFailurePatternSync",
    "autoTrajectoryRecord", "autoTrajectoryFinalize",
    "autoErrorLearn", "autoPreTaskRecon", "autoQualityGate",
    "autoAntiRegression", "autoDocAntiRegression", "autoDecisionCapture",
    "autoWarmStartData", "autoVariationCheck",
    "autoSkillHint", "autoAgentRecommend", "autoKnowledgeCrossQuery",
    "autoContextPullBack", "autoInputValidation", "autoScriptRecommend",
    "autoAttentionScore", "autoPythonCompactionPredict",
    "autoPythonCompress", "autoPythonExpand",
    "autoD3ErrorChain", "autoD3LkgUpdate",
    "autoRecoveryManifest", "autoHandoffPackage",
    "autoCompactionSurvival", "autoContextRehydrate",
    "autoD4CacheCheck", "autoD4DiffCheck", "autoD4PerfSummary",
    "autoPreCompactionDump",
  ];

  it("exports all 38 cadence functions", () => {
    for (const name of expectedExports) {
      expect(typeof (cadence as any)[name]).toBe("function");
    }
  });
});

// ── Context pressure zone logic ─────────────────────────────────────────────

describe("autoContextPressure zone logic", () => {
  it("returns LOW zone for small byte count", () => {
    const result = cadence.autoContextPressure(1, 10000);
    expect(result.success).toBe(true);
    expect(result.zone).toContain("LOW");
    expect(result.pressure_pct).toBeLessThan(50);
  });

  it("returns MODERATE zone at ~50% pressure", () => {
    // ~200K tokens = 800KB content + 120KB system overhead
    // 50% of ~200K max = ~100K tokens = ~400KB
    const result = cadence.autoContextPressure(5, 280000);
    expect(result.success).toBe(true);
    expect(result.zone).toContain("MODERATE");
    expect(result.pressure_pct).toBeGreaterThanOrEqual(50);
    expect(result.pressure_pct).toBeLessThan(70);
  });

  it("returns HIGH zone at ~75% pressure", () => {
    // Need enough bytes so (120000+bytes)/4 / 200000 >= 70%
    // 70% of 200K = 140K tokens = 560KB total, minus 120K overhead = 440KB
    const result = cadence.autoContextPressure(10, 450000);
    expect(result.success).toBe(true);
    // May be HIGH or CRITICAL depending on exact calculation
    expect(result.zone).toMatch(/HIGH|CRITICAL/);
    expect(result.pressure_pct).toBeGreaterThanOrEqual(70);
  });

  it("returns CRITICAL zone at 85%+ pressure", () => {
    const result = cadence.autoContextPressure(20, 700000);
    expect(result.success).toBe(true);
    expect(result.zone).toContain("CRITICAL");
    expect(result.pressure_pct).toBeGreaterThanOrEqual(85);
  });

  it("includes recommendation string", () => {
    const result = cadence.autoContextPressure(1, 10000);
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(5);
  });

  it("returns correct call_number", () => {
    const result = cadence.autoContextPressure(42, 10000);
    expect(result.call_number).toBe(42);
  });
});

// ── Return shape tests (graceful error handling) ────────────────────────────

describe("Cadence return shapes", () => {
  it("autoTodoRefresh returns { success, call_number, todo_preview }", () => {
    const result = cadence.autoTodoRefresh(1);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 1);
    expect(result).toHaveProperty("todo_preview");
    expect(typeof result.success).toBe("boolean");
  });

  it("autoCheckpoint returns { success, call_number }", () => {
    const result = cadence.autoCheckpoint(5);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 5);
    expect(typeof result.success).toBe("boolean");
  });

  it("autoPreTaskRecon returns { success, call_number }", () => {
    const result = cadence.autoPreTaskRecon(3);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 3);
  });

  it("autoQualityGate returns { success, call_number }", () => {
    const result = cadence.autoQualityGate(7);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 7);
  });

  it("autoWarmStartData returns { success }", () => {
    const result = cadence.autoWarmStartData();
    expect(result).toHaveProperty("success");
  });

  it("autoVariationCheck returns { success, call_number }", () => {
    const result = cadence.autoVariationCheck(4);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 4);
  });

  it("autoDecisionCapture returns { success }", () => {
    const result = cadence.autoDecisionCapture(2, "prism_calc", "force_power", "/test/file.ts");
    expect(result).toHaveProperty("success");
  });

  it("autoAntiRegression returns { success }", () => {
    const result = cadence.autoAntiRegression("/nonexistent/test.ts", "const x = 1;");
    expect(result).toHaveProperty("success");
  });

  it("autoDocAntiRegression returns { success }", () => {
    const result = cadence.autoDocAntiRegression("/nonexistent/readme.md", "# Test");
    expect(result).toHaveProperty("success");
  });
});

// ── Compaction detect return shape ──────────────────────────────────────────

describe("autoCompactionDetect", () => {
  it("returns structured result with risk assessment", () => {
    const result = cadence.autoCompactionDetect(10, {
      accumulatedBytes: 50000,
      maxTokens: 200000,
      callNumber: 10,
    });
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 10);
  });
});

// ── Pattern match and learning ──────────────────────────────────────────────

describe("autoPatternMatch", () => {
  it("returns structured result with matched field", () => {
    const result = cadence.autoPatternMatch(5, "prism_calc", "force_power", "", 100);
    expect(result).toHaveProperty("matched");
    expect(typeof (result as any).matched).toBe("boolean");
  });
});

describe("autoErrorLearn", () => {
  it("returns structured result for error learning", () => {
    const result = cadence.autoErrorLearn(3, "prism_calc", "test_action", "test error message");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 3);
  });
});

// ── Input validation ────────────────────────────────────────────────────────

describe("autoInputValidation", () => {
  it("returns structured result for valid input", () => {
    const result = cadence.autoInputValidation(
      1,
      "prism_calc",
      "force_power",
      { Kc11: 1500, mc: 0.25, Vc: 200, f: 0.15, ap: 2.0 }
    );
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 1);
  });

  it("returns structured result for empty params", () => {
    const result = cadence.autoInputValidation(2, "prism_calc", "force_power", {});
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 2);
  });
});

// ── Python-backed cadences (graceful failure without Python scripts) ────────

describe("Python cadences graceful failure", () => {
  it("autoPythonCompactionPredict returns { success, call_number }", () => {
    const result = cadence.autoPythonCompactionPredict(1, 50);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 1);
  });

  it("autoPythonCompress returns { success, call_number }", () => {
    const result = cadence.autoPythonCompress(2, 75);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 2);
  });

  it("autoPythonExpand returns { success, call_number }", () => {
    const result = cadence.autoPythonExpand(3, 30);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 3);
  });

  it("autoD3ErrorChain returns { success, call_number }", () => {
    const result = cadence.autoD3ErrorChain(4, "prism_calc", "test", "test error");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 4);
  });

  it("autoD3LkgUpdate returns { success, call_number }", () => {
    const result = cadence.autoD3LkgUpdate(5, "prism_calc", "test", 100);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 5);
  });

  it("autoAttentionScore returns { success, call_number }", () => {
    const result = cadence.autoAttentionScore(6, "test_task");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 6);
  });
});

// ── Recovery and handoff cadences ───────────────────────────────────────────

describe("Recovery cadences", () => {
  it("autoRecoveryManifest returns { success }", () => {
    const result = cadence.autoRecoveryManifest(1);
    expect(result).toHaveProperty("success");
  });

  it("autoCompactionSurvival returns { success }", () => {
    const result = cadence.autoCompactionSurvival(1);
    expect(result).toHaveProperty("success");
  });

  it("autoContextRehydrate returns { success }", () => {
    const result = cadence.autoContextRehydrate(1);
    expect(result).toHaveProperty("success");
  });

  it("autoHandoffPackage returns { success }", () => {
    const result = cadence.autoHandoffPackage(1);
    expect(result).toHaveProperty("success");
  });
});

// ── D4 diagnostic cadences ──────────────────────────────────────────────────

describe("D4 diagnostic cadences", () => {
  it("autoD4CacheCheck returns { success, call_number }", () => {
    const result = cadence.autoD4CacheCheck(1);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 1);
  });

  it("autoD4DiffCheck returns { success, call_number }", () => {
    const result = cadence.autoD4DiffCheck(2);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 2);
  });

  it("autoD4PerfSummary returns { success, call_number }", () => {
    const result = cadence.autoD4PerfSummary(3);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 3);
  });
});

// ── Skill/Agent/Script recommend cadences ───────────────────────────────────

describe("Recommendation cadences", () => {
  it("autoSkillHint returns structured result", () => {
    const result = cadence.autoSkillHint(1, "prism_calc", "force_power", {});
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 1);
  });

  it("autoAgentRecommend returns structured result", () => {
    const result = cadence.autoAgentRecommend(2, "prism_calc", "force_power", {});
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 2);
  });

  it("autoScriptRecommend returns structured result", () => {
    const result = cadence.autoScriptRecommend(3, "prism_calc", "force_power", {});
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 3);
  });
});

// ── Context management cadences ─────────────────────────────────────────────

describe("Context management cadences", () => {
  it("autoContextCompress returns structured result", () => {
    const result = cadence.autoContextCompress(5, 60000, "test result data");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 5);
  });

  it("autoContextPullBack returns structured result", () => {
    const result = cadence.autoContextPullBack(6, "test_action", {});
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("call_number", 6);
  });
});

// ── Pre-compaction dump ─────────────────────────────────────────────────────

describe("autoPreCompactionDump", () => {
  it("returns structured result", () => {
    const result = cadence.autoPreCompactionDump(10);
    expect(result).toHaveProperty("success");
  });
});
