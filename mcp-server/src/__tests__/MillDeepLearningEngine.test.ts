/**
 * MillDeepLearningEngine tests
 * Covers deepReason, getOptimizedParams, recommendSequence, getStatistics,
 * and learnFromProgram read-error path across a fresh network.
 */

import { describe, expect, it } from "vitest";
import { MillDeepLearningEngine } from "../engines/MillDeepLearningEngine.js";

const OP_NETWORK_TYPES = [
  "face", "rough_profile", "finish_profile", "rough_pocket", "finish_pocket",
  "contour", "spot_drill", "peck_drill", "drill", "tap", "ream", "bore",
  "chamfer", "engrave", "3d_rough", "3d_finish",
];

const EMPTY_CONTEXT_CONFIDENCE = 0.3;

describe("MillDeepLearningEngine.getStatistics (fresh instance)", () => {
  it("reports zero programs, zero ops, and zero neurons at construction", () => {
    const engine = new MillDeepLearningEngine();
    const stats = engine.getStatistics();
    expect(stats.programs_parsed).toBe(0);
    expect(stats.proven_programs).toBe(0);
    expect(stats.operations_learned).toBe(0);
    expect(stats.parameter_neurons).toBe(0);
    expect(stats.sequence_patterns).toBe(0);
    expect(stats.customers_learned).toEqual([]);
  });

  it("operation_frequencies is empty until ops are observed, even though nodes exist", () => {
    const engine = new MillDeepLearningEngine();
    const stats = engine.getStatistics();
    expect(Object.keys(stats.operation_frequencies)).toEqual([]);
  });
});

describe("MillDeepLearningEngine.deepReason", () => {
  it("returns insufficient-data conclusion when context is empty", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.deepReason("What parameters?", {});
    expect(out.question).toBe("What parameters?");
    expect(out.conclusion).toBe("Insufficient data for specific recommendation");
    expect(out.confidence).toBeCloseTo(EMPTY_CONTEXT_CONFIDENCE, 3);
    expect(out.evidence).toEqual([]);
  });

  it("echoes the SFM formula and material range when the question is about RPM", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.deepReason("What RPM for this cut?", { material_iso: "P" });
    expect(out.logic.some(l => l.includes("Surface speed (SFM)"))).toBe(true);
    expect(out.logic.some(l => l.includes("80-400") && l.includes("200"))).toBe(true);
  });

  it("echoes the feed formula and chip-load target when the question is about feed", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.deepReason("What feed and chip load?", { material_iso: "N" });
    expect(out.logic.some(l => l.includes("Feed rate = RPM"))).toBe(true);
    // N-group typical chip load is 0.008
    expect(out.logic.some(l => l.includes("0.008"))).toBe(true);
  });

  it("echoes the standard sequence rules when the question is about operation order", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.deepReason("In what order should we machine?", {});
    expect(out.logic.some(l => l.includes("Face → Rough → Finish"))).toBe(true);
    expect(out.logic.some(l => l.toLowerCase().includes("spot drill"))).toBe(true);
  });

  it("reports operation network evidence for known op types (even with zero frequency)", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.deepReason("how often is this done?", { operation_type: "face" });
    // fresh engine has face node with frequency=0, so evidence still has the seen-N-times line
    expect(out.evidence.some(e => e.includes("Operation face"))).toBe(true);
    expect(out.evidence.some(e => e.includes("0 times"))).toBe(true);
  });

  it("falls through to 'no specific pattern found' when both context keys present but no neurons match", () => {
    const engine = new MillDeepLearningEngine();
    // Fresh engine has op-network evidence for "face" (frequency=0) + SFM logic for rpm question.
    // With operation_type + material_iso both set but no neurons yet, the code emits the
    // "no specific pattern found — apply general guidelines" branch.
    const out = engine.deepReason("recommend rpm", {
      material_iso: "P",
      operation_type: "face",
    });
    expect(out.conclusion).toContain("no specific pattern found");
    expect(out.confidence).toBeGreaterThan(EMPTY_CONTEXT_CONFIDENCE);
  });
});

describe("MillDeepLearningEngine.getOptimizedParams", () => {
  it("returns null on a fresh network (no learned neurons)", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.getOptimizedParams("P", "flat_endmill", 12);
    expect(out).toBeNull();
  });

  it("returns null when the tool-diameter ±5 window excludes all existing neurons", () => {
    const engine = new MillDeepLearningEngine();
    // Still zero neurons, but exercise with unusual tool types — still null
    const out = engine.getOptimizedParams("N", "ball_endmill", 50);
    expect(out).toBeNull();
  });
});

describe("MillDeepLearningEngine.recommendSequence", () => {
  it("returns an empty sequence with low confidence for no features", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.recommendSequence([]);
    expect(out.sequence).toEqual([]);
    expect(out.confidence).toBe(0);
    expect(out.rationale).toContain("standard");
  });

  it("maps 'drill' and 'thread' features onto spot_drill + peck_drill + tap + drill", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.recommendSequence(["drill holes", "thread M8"]);
    expect(out.sequence).toContain("spot_drill");
    expect(out.sequence).toContain("drill");
    expect(out.sequence).toContain("tap");
    expect(out.sequence).toContain("peck_drill");
  });

  it("maps 'pocket' feature onto rough_pocket + finish_pocket", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.recommendSequence(["rectangular pocket"]);
    expect(out.sequence).toContain("rough_pocket");
    expect(out.sequence).toContain("finish_pocket");
  });

  it("maps 'profile' feature onto rough_profile + finish_profile", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.recommendSequence(["outer profile"]);
    expect(out.sequence).toContain("rough_profile");
    expect(out.sequence).toContain("finish_profile");
  });

  it("maps 'chamfer' feature onto a chamfer op", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.recommendSequence(["chamfer edges"]);
    expect(out.sequence).toContain("chamfer");
  });

  it("uses default-sequence rationale when no learned patterns match", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.recommendSequence(["pocket", "drill"]);
    expect(out.rationale).toContain("standard");
  });
});

describe("MillDeepLearningEngine.learnFromProgram — file read errors", () => {
  it("returns null for a nonexistent file path without throwing", async () => {
    const engine = new MillDeepLearningEngine();
    const out = await engine.learnFromProgram("H:/does/not/exist/ghost.nc");
    expect(out).toBeNull();
    // Statistics should stay at zero
    expect(engine.getStatistics().programs_parsed).toBe(0);
  });
});

describe("MillDeepLearningEngine operation network initialization", () => {
  it("initializes one node per canonical operation type (16 types)", () => {
    const engine = new MillDeepLearningEngine();
    // Probe each op type via deepReason's operation_type branch — evidence contains the op name
    for (const opType of OP_NETWORK_TYPES) {
      const out = engine.deepReason("probe", { operation_type: opType });
      expect(out.evidence.some(e => e.includes(`Operation ${opType}`))).toBe(true);
    }
  });

  it("unknown op types produce no operation-network evidence lines", () => {
    const engine = new MillDeepLearningEngine();
    const out = engine.deepReason("probe", { operation_type: "not_a_real_op" });
    expect(out.evidence.some(e => e.includes("Operation not_a_real_op"))).toBe(false);
  });
});
