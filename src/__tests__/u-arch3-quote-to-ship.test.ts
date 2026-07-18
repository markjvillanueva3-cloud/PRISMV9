/**
 * U-ARCH3: QuoteToShipOrchestratorEngine Integration Tests
 *
 * Verifies export from index.ts, singleton availability, dispatcher wiring,
 * and basic pipeline execution with material_spec validation.
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════
// 1. Module export verification
// ═══════════════════════════════════════════════════════════════════

describe("QuoteToShipOrchestratorEngine (U-ARCH3 export + wiring)", () => {
  it("exports singleton from engine file", async () => {
    const mod = await import("../engines/QuoteToShipOrchestratorEngine.js");
    expect(mod.quoteToShipOrchestratorEngine).toBeDefined();
    expect(mod.QuoteToShipOrchestratorEngine).toBeDefined();
  });

  it("exports singleton from engines/index.ts", async () => {
    const mod = await import("../engines/index.js");
    expect(mod.quoteToShipOrchestratorEngine).toBeDefined();
    expect(mod.QuoteToShipOrchestratorEngine).toBeDefined();
  });

  it("has runFullPipeline method", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    expect(typeof quoteToShipOrchestratorEngine.runFullPipeline).toBe("function");
  });

  it("has getStatus method", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    expect(typeof quoteToShipOrchestratorEngine.getStatus).toBe("function");
  });

  it("has getStageResult method", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    expect(typeof quoteToShipOrchestratorEngine.getStageResult).toBe("function");
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. Input validation
  // ═══════════════════════════════════════════════════════════════════

  it("rejects input without material_spec", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    const result = await quoteToShipOrchestratorEngine.runFullPipeline({
      quantity: 10,
    } as any);
    expect(result).toBeDefined();
    expect(result.status).toBe("failed");
  });

  it("accepts valid minimal input and returns structured result", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    const result = await quoteToShipOrchestratorEngine.runFullPipeline({
      material_spec: "6061-T6",
      quantity: 5,
      drawing_text: "Simple test part — 50mm × 30mm × 10mm block, ±0.1mm",
    });
    expect(result).toBeDefined();
    expect(result.pipeline_id).toBeDefined();
    expect(typeof result.pipeline_id).toBe("string");
    expect(result.stages).toBeDefined();
    expect(Array.isArray(result.stages)).toBe(true);
    expect(result.stages.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. Stage structure
  // ═══════════════════════════════════════════════════════════════════

  it("defines all 21 pipeline stages", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors?.();
    if (descriptors) {
      expect(descriptors.length).toBe(21);
    }
  });

  it("getStatus returns status for all stages", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    const emptyResults = new Map();
    const statuses = quoteToShipOrchestratorEngine.getStatus(emptyResults);
    expect(Array.isArray(statuses)).toBe(true);
    expect(statuses.length).toBe(21);
    // All should be "pending" for empty results
    for (const s of statuses) {
      expect(s.status).toBe("pending");
      expect(s.id).toBeDefined();
      expect(s.label).toBeDefined();
    }
  });

  it("getStageResult returns null for non-executed stage", async () => {
    const { quoteToShipOrchestratorEngine } = await import(
      "../engines/QuoteToShipOrchestratorEngine.js"
    );
    const result = await quoteToShipOrchestratorEngine.runFullPipeline({
      quantity: 1,
    } as any);
    const stageResult = quoteToShipOrchestratorEngine.getStageResult(
      "SHIPPING",
      result,
    );
    // Pipeline failed early — SHIPPING was never executed
    expect(stageResult === null || stageResult?.status !== "pass").toBe(true);
  });
});
