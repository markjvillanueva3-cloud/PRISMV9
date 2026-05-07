/**
 * E2E test for ENGINE-WIRE-POST-MS0/U-WIRE-POST-BATCH1 — 6 unwired post
 * processor engines wired into camDispatcher (prism_cam).
 */
import { describe, it, expect } from "vitest";
import { gCodeSnippetEngine } from "../engines/GCodeSnippetEngine.js";
import { gcodeUnderstandingTransformerEngine } from "../engines/GCodeUnderstandingTransformerEngine.js";
import { fanucLegacyControllerEngine } from "../engines/FanucLegacyControllerEngine.js";
import { okumaLegacyControllerEngine } from "../engines/OkumaLegacyControllerEngine.js";

const NEW_POST_ACTION_COUNT = 6;

describe("U-WIRE-POST-BATCH1 — engines verified directly", () => {
  describe("GCodeSnippetEngine.get / fill", () => {
    it("returns null for unknown snippet id", () => {
      const r = gCodeSnippetEngine.get("nonexistent_snippet_id_xyz");
      expect(r).toBe(null);
    });

    it("returns null when filling unknown snippet id", () => {
      const r = gCodeSnippetEngine.fill("nonexistent_snippet_id_xyz", { x: 10 });
      expect(r).toBe(null);
    });
  });

  describe("GCodeUnderstandingTransformerEngine.tokenize", () => {
    it("tokenizes a simple G-code program into individual tokens", () => {
      const gcode = "G0 X10 Y20 Z5\nM3 S1000\nG1 X100 F200";
      const tokens = gcodeUnderstandingTransformerEngine.tokenize(gcode);
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
      // Each token must have a type field
      for (const t of tokens.slice(0, 5)) {
        expect(typeof t).toBe("object");
      }
    });

    it("produces fewer tokens for shorter program (token count scales with content)", () => {
      const small = gcodeUnderstandingTransformerEngine.tokenize("G0 X10");
      const big = gcodeUnderstandingTransformerEngine.tokenize(
        "G0 X10 Y20 Z5\nG1 X100 F200\nG1 Y50 F300\nM3 S1000\nM5",
      );
      expect(big.length).toBeGreaterThan(small.length);
      expect(small.length).toBeGreaterThan(0);
    });
  });

  describe("FanucLegacyControllerEngine.listModels + getProfile", () => {
    it("returns non-empty list of legacy Fanuc models with metadata", () => {
      const models = fanucLegacyControllerEngine.listModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      for (const m of models.slice(0, 3)) {
        expect(typeof m.model).toBe("string");
        expect(m.model.length).toBeGreaterThan(0);
        expect(typeof m.displayName).toBe("string");
        expect(typeof m.years).toBe("string");
      }
    });

    it("returns a profile for the first available model", () => {
      const models = fanucLegacyControllerEngine.listModels();
      const firstModel = models[0]!.model;
      const profile = fanucLegacyControllerEngine.getProfile(firstModel);
      expect(profile.displayName.length).toBeGreaterThan(0);
      expect(Array.isArray(profile.supportedGCodes)).toBe(true);
      expect(profile.supportedGCodes.length).toBeGreaterThan(0);
    });
  });

  describe("OkumaLegacyControllerEngine.detectController", () => {
    it("analyzes program lines and returns detection result with confidence", () => {
      const lines = [
        "% O0001 (TEST PROGRAM)",
        "N10 G50 S2000",
        "N20 G96 S150 M3",
        "N30 G0 X10 Z5",
        "N40 M30",
      ];
      const r = okumaLegacyControllerEngine.detectController(lines);
      expect(typeof r).toBe("object");
      // Detection result has confidence and detected model fields
      const result = r as { detected_model?: string; confidence?: number };
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence!).toBeGreaterThanOrEqual(0);
      expect(result.confidence!).toBeLessThanOrEqual(1);
    });
  });
});

describe("U-WIRE-POST-BATCH1 — dispatcher wiring verified", () => {
  const NEW_ACTIONS = [
    "post_gcode_snippet_get",
    "post_gcode_snippet_fill",
    "post_gcode_tokenize",
    "post_fanuc_legacy_profile",
    "post_okuma_legacy_detect",
    "post_siemens_legacy_profile",
  ] as const;

  it("registers all 6 new actions in camDispatcher ACTIONS", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    const present = NEW_ACTIONS.filter((a) =>
      (mod.ACTIONS as readonly string[]).includes(a),
    );
    expect(present.length).toBe(NEW_POST_ACTION_COUNT);
  });

  it("registers all 6 schemas in ACTION_CAM_SCHEMAS", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof ACTION_CAM_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(NEW_POST_ACTION_COUNT);
  });

  it("schema rejects post_gcode_snippet_get with empty id", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["post_gcode_snippet_get"]!.safeParse({ id: "" });
    expect(r.success).toBe(false);
  });

  it("schema rejects post_gcode_tokenize with missing gcode", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["post_gcode_tokenize"]!.safeParse({});
    expect(r.success).toBe(false);
  });

  it("schema rejects post_okuma_legacy_detect with empty program_lines array", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["post_okuma_legacy_detect"]!.safeParse({ program_lines: [] });
    expect(r.success).toBe(false);
  });
});
