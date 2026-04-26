/**
 * Tests for sfc-provenance-guard.mjs
 * @module hooks/sfc-provenance-guard.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import hook from "./sfc-provenance-guard.mjs";

describe("sfc-provenance-guard", () => {
  const originalEnv = process.env.PRISM_SFC_PROVENANCE_HARD_BLOCK;

  beforeEach(() => {
    delete process.env.PRISM_SFC_PROVENANCE_HARD_BLOCK;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PRISM_SFC_PROVENANCE_HARD_BLOCK = originalEnv;
    } else {
      delete process.env.PRISM_SFC_PROVENANCE_HARD_BLOCK;
    }
  });

  // Valid provenance fixture - uses refs not inline values
  const validProvenance = {
    recommendation_id: "sfc-abc123-xyz-0001",
    timestamp: "2026-04-26T03:00:00.000Z",
    engine: "UltimateSpeedFeedEngine",
    fps_source: "formula",
    kc11_source: { group: "P", kc1_1: "from_constants", mc: "from_constants", ref: "constants.ts:CANONICAL_KIENZLE[P]" },
    taylor_source: { group: "P", C: "from_constants", n: "from_constants", ref: "constants.ts:CANONICAL_TAYLOR[P]" },
    citations: [
      { source_type: "constant", source_id: "CANONICAL_KIENZLE[P]", confidence: 1.0 },
    ],
    audit_hash: "abc123def456ghij",
  };

  describe("non-SFC actions passthrough", () => {
    it("allows non-SFC dispatcher tools without inspection", () => {
      const result = hook({
        tool: "prism_memory",
        input: { action: "store" },
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
      expect(result.hookSpecificOutput).toBe(undefined);
    });

    it("allows non-SFC actions on SFC dispatchers without inspection", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "get_material_info" },
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });
  });

  describe("valid provenance acceptance", () => {
    it("accepts SFC action with valid provenance at root level", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: validProvenance },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.status).toBe("valid");
      expect(result.hookSpecificOutput.fps_source).toBe("formula");
      expect(result.hookSpecificOutput.citation_count).toBe(1);
      expect(result.hookSpecificOutput.recommendation_id).toBe("sfc-abc123-xyz-0001");
    });

    it("accepts SFC action with provenance nested in data field", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "recommend" },
        result: { ok: true, data: { provenance: validProvenance } },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.status).toBe("valid");
      expect(result.hookSpecificOutput.recommendation_id).toBe("sfc-abc123-xyz-0001");
    });

    it("accepts SFC action with provenance nested in result.result", () => {
      const result = hook({
        tool: "prism_turning",
        input: { action: "calculate" },
        result: { ok: true, result: { provenance: validProvenance } },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.status).toBe("valid");
    });

    it("accepts fps_source=rag with correct status", () => {
      const prov = { ...validProvenance, fps_source: "rag" };
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.fps_source).toBe("rag");
    });

    it("accepts fps_source=adapter with correct status", () => {
      const prov = { ...validProvenance, fps_source: "adapter" };
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.fps_source).toBe("adapter");
    });

    it("accepts fps_source=iql with correct status", () => {
      const prov = { ...validProvenance, fps_source: "iql" };
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.fps_source).toBe("iql");
    });

    it("accepts fps_source=hybrid with correct status", () => {
      const prov = { ...validProvenance, fps_source: "hybrid" };
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.fps_source).toBe("hybrid");
    });
  });

  describe("advisory mode warnings", () => {
    it("warns but allows when provenance missing entirely", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, sfm: 320 },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/WARNING.*missing provenance/);
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("calculate");
    });

    it("warns with specific error when recommendation_id missing", () => {
      const { recommendation_id, ...provWithoutId } = validProvenance;
      const result = hook({
        tool: "prism_calc",
        input: { action: "optimize" },
        result: { ok: true, provenance: provWithoutId },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing recommendation_id/);
      expect(result.hookSpecificOutput.errors).toContain("Missing recommendation_id");
    });

    it("warns with specific error when fps_source missing", () => {
      const { fps_source, ...provWithoutFps } = validProvenance;
      const result = hook({
        tool: "prism_calc",
        input: { action: "constrain" },
        result: { ok: true, provenance: provWithoutFps },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing fps_source/);
      expect(result.hookSpecificOutput.errors).toContain("Missing fps_source (formula|rag|adapter|iql|hybrid)");
    });

    it("warns with specific error when citations array empty", () => {
      const provEmptyCitations = { ...validProvenance, citations: [] };
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: provEmptyCitations },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/empty citations/);
      expect(result.hookSpecificOutput.errors).toContain("Missing or empty citations array - recommendation source unknown");
    });

    it("warns with specific error when audit_hash missing", () => {
      const { audit_hash, ...provWithoutHash } = validProvenance;
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: provWithoutHash },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing audit_hash/);
      expect(result.hookSpecificOutput.errors).toContain("Missing audit_hash - tamper detection disabled");
    });
  });

  describe("hard block mode", () => {
    beforeEach(() => {
      process.env.PRISM_SFC_PROVENANCE_HARD_BLOCK = "1";
    });

    it("blocks when provenance missing entirely in hard mode", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, sfm: 320 },
      });
      expect(result.allow).toBe(false);
      expect(result.message).toMatch(/BLOCKED.*ITAR\/AS9100/);
      expect(result.hookSpecificOutput.status).toBe("blocked");
      expect(result.hookSpecificOutput.action).toBe("calculate");
    });

    it("blocks when fps_source has invalid value", () => {
      const provBadFps = { ...validProvenance, fps_source: "magic" };
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: provBadFps },
      });
      expect(result.allow).toBe(false);
      expect(result.message).toMatch(/Invalid fps_source: magic/);
      expect(result.hookSpecificOutput.status).toBe("blocked");
    });

    it("blocks and reports multiple missing fields", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true, provenance: {} },
      });
      expect(result.allow).toBe(false);
      expect(result.hookSpecificOutput.errors.length).toBe(4);
      expect(result.hookSpecificOutput.errors).toContain("Missing recommendation_id");
      expect(result.hookSpecificOutput.errors).toContain("Missing fps_source (formula|rag|adapter|iql|hybrid)");
    });
  });

  describe("error result bypass", () => {
    it("skips validation when result.ok is false", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: false, error: "Material not found" },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });

    it("skips validation when result has error field", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { error: "Something went wrong" },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });
  });

  describe("null/missing input handling", () => {
    it("handles null result with advisory warning", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: null,
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/WARNING.*missing provenance/);
      expect(result.hookSpecificOutput.status).toBe("warning");
    });

    it("handles missing input object by skipping SFC check", () => {
      const result = hook({
        tool: "prism_calc",
        input: null,
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });
  });

  describe("dispatcher coverage", () => {
    it("triggers on prism_sfc dispatcher", () => {
      const result = hook({
        tool: "prism_sfc",
        input: { action: "calculate" },
        result: { ok: true, sfm: 320 },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("calculate");
    });

    it("triggers on prism_turning dispatcher", () => {
      const result = hook({
        tool: "prism_turning",
        input: { action: "recommend" },
        result: { ok: true, sfm: 280 },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("recommend");
    });

    it("triggers on prism_lathe dispatcher", () => {
      const result = hook({
        tool: "prism_lathe",
        input: { action: "optimize" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("optimize");
    });

    it("triggers on prism_milling dispatcher", () => {
      const result = hook({
        tool: "prism_milling",
        input: { action: "constrain" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("constrain");
    });
  });

  describe("action coverage", () => {
    it("triggers on analyze_surface action", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "analyze_surface" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.action).toBe("analyze_surface");
    });

    it("triggers on estimate_tool_life action", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "estimate_tool_life" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.action).toBe("estimate_tool_life");
    });
  });
});
