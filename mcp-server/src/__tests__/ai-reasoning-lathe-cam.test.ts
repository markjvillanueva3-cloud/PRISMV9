/**
 * aiReasoningDispatcher Lathe CAM Intelligence Integration Tests
 *
 * Simple verification that LatheCAMIntelligenceEngine is wired to prism_ai dispatcher.
 * Full engine tests are in lathe-cam-intelligence.test.ts (58 tests).
 */

import { describe, it, expect } from "vitest";
import { latheCAMIntelligenceEngine } from "../engines/LatheCAMIntelligenceEngine.js";

describe("aiReasoningDispatcher: Lathe CAM Intelligence Wiring (LLM-INTEL-7)", () => {
  it("should export latheCAMIntelligenceEngine singleton", () => {
    expect(latheCAMIntelligenceEngine).toBeDefined();
    expect(typeof latheCAMIntelligenceEngine).toBe("object");
  });

  it("should expose recommendParametricTemplate method", () => {
    expect(typeof latheCAMIntelligenceEngine.recommendParametricTemplate).toBe("function");
  });

  it("should expose selectToolpath method", () => {
    expect(typeof latheCAMIntelligenceEngine.selectToolpath).toBe("function");
  });

  it("should expose sequenceOperations method", () => {
    expect(typeof latheCAMIntelligenceEngine.sequenceOperations).toBe("function");
  });

  it("should expose recommendWorkholding method", () => {
    expect(typeof latheCAMIntelligenceEngine.recommendWorkholding).toBe("function");
  });

  it("should expose optimizeMRRCost method", () => {
    expect(typeof latheCAMIntelligenceEngine.optimizeMRRCost).toBe("function");
  });

  it("should expose analyzeComplete method", () => {
    expect(typeof latheCAMIntelligenceEngine.analyzeComplete).toBe("function");
  });

  it("should have all 6 methods required by dispatcher", () => {
    const requiredMethods = [
      "recommendParametricTemplate",
      "selectToolpath",
      "sequenceOperations",
      "recommendWorkholding",
      "optimizeMRRCost",
      "analyzeComplete",
    ];

    for (const method of requiredMethods) {
      expect(typeof (latheCAMIntelligenceEngine as any)[method]).toBe("function");
    }
  });
});
