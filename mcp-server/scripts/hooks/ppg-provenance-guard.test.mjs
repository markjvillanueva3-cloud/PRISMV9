/**
 * Tests for ppg-provenance-guard.mjs
 * @module hooks/ppg-provenance-guard.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import hook from "./ppg-provenance-guard.mjs";

describe("ppg-provenance-guard", () => {
  const originalEnv = process.env.PRISM_PPG_PROVENANCE_HARD_BLOCK;

  beforeEach(() => {
    delete process.env.PRISM_PPG_PROVENANCE_HARD_BLOCK;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PRISM_PPG_PROVENANCE_HARD_BLOCK = originalEnv;
    } else {
      delete process.env.PRISM_PPG_PROVENANCE_HARD_BLOCK;
    }
  });

  const validProvenance = {
    emission_id: "ppg-abc123-xyz-0001",
    timestamp: "2026-04-26T04:00:00.000Z",
    engine: "PostProcessorEngine",
    ppg_source: "template",
    dialect_source: {
      controller: "fanuc",
      version: "31i-B",
      ref: "post-processors/fanuc-mill.cps",
    },
    post_template: {
      template_id: "fanuc-generic-mill",
      ref: "post-processors/fanuc-generic-mill.cps",
    },
    citations: [
      { source_type: "post_processor", source_id: "dialect-fanuc", confidence: 1.0 },
    ],
    audit_hash: "abc123def456ghij",
  };

  describe("non-PPG actions passthrough", () => {
    it("allows non-PPG dispatcher tools without inspection", () => {
      const result = hook({
        tool: "prism_memory",
        input: { action: "store" },
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
      expect(result.hookSpecificOutput).toBe(undefined);
    });

    it("allows non-PPG actions on CAM dispatchers without inspection", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "list_machines" },
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });

    it("allows prism_calc actions (not PPG)", () => {
      const result = hook({
        tool: "prism_calc",
        input: { action: "calculate" },
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput).toBe(undefined);
    });
  });

  describe("valid provenance acceptance", () => {
    it("accepts PPG action with valid provenance at root level", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: validProvenance },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.status).toBe("valid");
      expect(result.hookSpecificOutput.ppg_source).toBe("template");
      expect(result.hookSpecificOutput.citation_count).toBe(1);
      expect(result.hookSpecificOutput.emission_id).toBe("ppg-abc123-xyz-0001");
      expect(result.hookSpecificOutput.dialect).toBe("fanuc");
    });

    it("accepts PPG action with provenance nested in data field", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "post_process" },
        result: { ok: true, data: { provenance: validProvenance } },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.status).toBe("valid");
      expect(result.hookSpecificOutput.emission_id).toBe("ppg-abc123-xyz-0001");
    });

    it("accepts PPG action with provenance nested in result.result", () => {
      const result = hook({
        tool: "prism_post",
        input: { action: "generate" },
        result: { ok: true, result: { provenance: validProvenance } },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.status).toBe("valid");
    });

    it("accepts ppg_source=rag with correct status", () => {
      const prov = { ...validProvenance, ppg_source: "rag" };
      const result = hook({
        tool: "prism_cam",
        input: { action: "emit_gcode" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.ppg_source).toBe("rag");
    });

    it("accepts ppg_source=adapter with correct status", () => {
      const prov = { ...validProvenance, ppg_source: "adapter" };
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.ppg_source).toBe("adapter");
    });

    it("accepts ppg_source=hybrid with correct status", () => {
      const prov = { ...validProvenance, ppg_source: "hybrid" };
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.ppg_source).toBe("hybrid");
    });

    it("accepts ppg_source=custom with correct status", () => {
      const prov = { ...validProvenance, ppg_source: "custom" };
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: prov },
      });
      expect(result.allow).toBe(true);
      expect(result.hookSpecificOutput.ppg_source).toBe("custom");
    });
  });

  describe("advisory mode warnings", () => {
    it("warns but allows when provenance missing entirely", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, gcode: "G90\nM30" },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/WARNING.*missing provenance/);
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("generate");
    });

    it("warns with specific error when emission_id missing", () => {
      const { emission_id, ...provWithoutId } = validProvenance;
      const result = hook({
        tool: "prism_cam",
        input: { action: "post_process" },
        result: { ok: true, provenance: provWithoutId },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing emission_id/);
      expect(result.hookSpecificOutput.errors).toContain("Missing emission_id");
    });

    it("warns with specific error when ppg_source missing", () => {
      const { ppg_source, ...provWithoutSource } = validProvenance;
      const result = hook({
        tool: "prism_cam",
        input: { action: "emit" },
        result: { ok: true, provenance: provWithoutSource },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing ppg_source/);
      expect(result.hookSpecificOutput.errors).toContain("Missing ppg_source (template|rag|adapter|hybrid|custom)");
    });

    it("warns with specific error when dialect_source missing", () => {
      const { dialect_source, ...provWithoutDialect } = validProvenance;
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: provWithoutDialect },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing dialect_source/);
      expect(result.hookSpecificOutput.errors).toContain("Missing dialect_source - controller dialect unknown");
    });

    it("warns with specific error when post_template missing", () => {
      const { post_template, ...provWithoutTemplate } = validProvenance;
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: provWithoutTemplate },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing post_template/);
      expect(result.hookSpecificOutput.errors).toContain("Missing post_template - post processor source unknown");
    });

    it("warns with specific error when citations array empty", () => {
      const provEmptyCitations = { ...validProvenance, citations: [] };
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: provEmptyCitations },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/empty citations/);
      expect(result.hookSpecificOutput.errors).toContain("Missing or empty citations array - G-code source unknown");
    });

    it("warns with specific error when audit_hash missing", () => {
      const { audit_hash, ...provWithoutHash } = validProvenance;
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: provWithoutHash },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/Missing audit_hash/);
      expect(result.hookSpecificOutput.errors).toContain("Missing audit_hash - tamper detection disabled");
    });
  });

  describe("hard block mode", () => {
    beforeEach(() => {
      process.env.PRISM_PPG_PROVENANCE_HARD_BLOCK = "1";
    });

    it("blocks when provenance missing entirely in hard mode", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, gcode: "G90\nM30" },
      });
      expect(result.allow).toBe(false);
      expect(result.message).toMatch(/BLOCKED.*ITAR\/AS9100/);
      expect(result.hookSpecificOutput.status).toBe("blocked");
      expect(result.hookSpecificOutput.action).toBe("generate");
    });

    it("blocks when ppg_source has invalid value", () => {
      const provBadSource = { ...validProvenance, ppg_source: "magic" };
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: provBadSource },
      });
      expect(result.allow).toBe(false);
      expect(result.message).toMatch(/Invalid ppg_source: magic/);
      expect(result.hookSpecificOutput.status).toBe("blocked");
    });

    it("blocks and reports multiple missing fields", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, provenance: {} },
      });
      expect(result.allow).toBe(false);
      expect(result.hookSpecificOutput.errors.length).toBe(6);
      expect(result.hookSpecificOutput.errors).toContain("Missing emission_id");
      expect(result.hookSpecificOutput.errors).toContain("Missing ppg_source (template|rag|adapter|hybrid|custom)");
      expect(result.hookSpecificOutput.errors).toContain("Missing dialect_source - controller dialect unknown");
    });
  });

  describe("error result bypass", () => {
    it("skips validation when result.ok is false", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: false, error: "Machine not found" },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });

    it("skips validation when result has error field", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { error: "Post processor failed" },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });
  });

  describe("null/missing input handling", () => {
    it("handles null result with advisory warning", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: null,
      });
      expect(result.allow).toBe(true);
      expect(result.message).toMatch(/WARNING.*missing provenance/);
      expect(result.hookSpecificOutput.status).toBe("warning");
    });

    it("handles missing input object by skipping PPG check", () => {
      const result = hook({
        tool: "prism_cam",
        input: null,
        result: { ok: true },
      });
      expect(result.allow).toBe(true);
      expect(result.message).toBe(undefined);
    });
  });

  describe("dispatcher coverage", () => {
    it("triggers on prism_cam dispatcher with generate action", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, gcode: "G90" },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("generate");
    });

    it("triggers on prism_post dispatcher", () => {
      const result = hook({
        tool: "prism_post",
        input: { action: "post_process" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("post_process");
    });

    it("triggers on prism_gcode dispatcher", () => {
      const result = hook({
        tool: "prism_gcode",
        input: { action: "emit" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("emit");
    });

    it("triggers on prism_nc dispatcher", () => {
      const result = hook({
        tool: "prism_nc",
        input: { action: "generate_nc" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.status).toBe("warning");
      expect(result.hookSpecificOutput.action).toBe("generate_nc");
    });
  });

  describe("action coverage", () => {
    it("triggers on emit_gcode action", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "emit_gcode" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.action).toBe("emit_gcode");
    });

    it("triggers on convert action", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "convert" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.action).toBe("convert");
    });

    it("triggers on translate action", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "translate" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.action).toBe("translate");
    });

    it("triggers on post action", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "post" },
        result: { ok: true },
      });
      expect(result.hookSpecificOutput.action).toBe("post");
    });
  });

  describe("provenance location detection", () => {
    it("finds provenance in output field", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, output: { provenance: validProvenance } },
      });
      expect(result.hookSpecificOutput.status).toBe("valid");
    });

    it("finds provenance in gcode_result field", () => {
      const result = hook({
        tool: "prism_cam",
        input: { action: "generate" },
        result: { ok: true, gcode_result: { provenance: validProvenance } },
      });
      expect(result.hookSpecificOutput.status).toBe("valid");
    });
  });
});
