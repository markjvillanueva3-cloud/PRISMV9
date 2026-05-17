/**
 * PostProcessorPipelineEngine — public-surface contract tests
 *
 * Asserts the documented PipelineOutput contract: every public entry point
 * (process / analyze / reoptimize) returns the full envelope with non-null
 * required fields and the default aggressiveness / optimization_target
 * preserved when no override is supplied.
 */

import { describe, it, expect } from "vitest";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";

const DEFAULT_AGGRESSIVENESS = 0.5;
const DEFAULT_OPTIMIZATION_TARGET = "balanced";

describe("PostProcessorPipelineEngine", () => {
  describe("singleton identity", () => {
    it("is the same reference across import sites (no per-call instantiation)", async () => {
      const reimport = await import("../engines/PostProcessorPipelineEngine.js");
      expect(reimport.postProcessorPipelineEngine).toBe(postProcessorPipelineEngine);
    });
  });

  describe("PipelineOutput envelope (process on empty input)", () => {
    it("preserves the default 0.5 aggressiveness when none supplied", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(out.aggressiveness).toBe(DEFAULT_AGGRESSIVENESS);
    });

    it("preserves the 'balanced' optimization_target default", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(out.optimization_target).toBe(DEFAULT_OPTIMIZATION_TARGET);
    });

    it("supplies a string output_gcode field (may be empty)", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(typeof out.output_gcode).toBe("string");
    });

    it("returns an array of StageResult objects with status enum members", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(Array.isArray(out.stages)).toBe(true);
      for (const stage of out.stages) {
        expect(typeof stage.stage).toBe("string");
        expect(typeof stage.phase).toBe("number");
        expect(["pass", "warn", "fail", "skip", "skipped"]).toContain(stage.status);
        expect(stage.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("reports a non-negative total_duration_ms and a valid overall_status", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(out.total_duration_ms).toBeGreaterThanOrEqual(0);
      expect(["pass", "warn", "fail", "skip", "skipped"]).toContain(out.overall_status);
    });

    it("returns arrays (never undefined) for blocks, operations, warnings", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(Array.isArray(out.blocks)).toBe(true);
      expect(Array.isArray(out.operations)).toBe(true);
      expect(Array.isArray(out.warnings)).toBe(true);
    });

    it("carries a resolved.tools + resolved.holders array per the documented shape", async () => {
      const out = await postProcessorPipelineEngine.process({});
      expect(Array.isArray(out.resolved.tools)).toBe(true);
      expect(Array.isArray(out.resolved.holders)).toBe(true);
    });
  });

  describe("aggressiveness + optimization_target overrides flow through", () => {
    it("propagates an explicit aggressiveness=0.2 (conservative)", async () => {
      const out = await postProcessorPipelineEngine.process({ aggressiveness: 0.2 });
      expect(out.aggressiveness).toBe(0.2);
    });

    it("propagates an explicit aggressiveness=0.9 (aggressive)", async () => {
      const out = await postProcessorPipelineEngine.process({ aggressiveness: 0.9 });
      expect(out.aggressiveness).toBe(0.9);
    });

    it("propagates an explicit optimization_target='max_mrr'", async () => {
      const out = await postProcessorPipelineEngine.process({
        optimization_target: "max_mrr" as any,
      });
      expect(out.optimization_target).toBe("max_mrr");
    });
  });

  describe("analyze() — read-only flavor preserves the same envelope", () => {
    it("returns the same documented envelope as process() on empty input", async () => {
      const out = await postProcessorPipelineEngine.analyze({});
      expect(typeof out.output_gcode).toBe("string");
      expect(Array.isArray(out.stages)).toBe(true);
      expect(out.aggressiveness).toBe(DEFAULT_AGGRESSIVENESS);
    });
  });

  describe("reoptimize() — replay flavor", () => {
    it("returns a PipelineOutput-shaped envelope on a minimal input", async () => {
      const out = await postProcessorPipelineEngine.reoptimize({});
      expect(typeof out).toBe("object");
      expect(typeof out.aggressiveness).toBe("number");
      expect(typeof out.optimization_target).toBe("string");
    });
  });
});
