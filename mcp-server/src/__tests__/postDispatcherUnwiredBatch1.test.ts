/**
 * E2E test for ENGINE-WIRE-POST-MS0/U-WIRE-POST-BATCH1 — 6 unwired post
 * processor engines wired into camDispatcher (prism_cam).
 */
import { describe, it, expect } from "vitest";
import { gCodeSnippetEngine } from "../engines/GCodeSnippetEngine.js";
import { gcodeUnderstandingTransformerEngine } from "../engines/GCodeUnderstandingTransformerEngine.js";
import { fanucLegacyControllerEngine } from "../engines/FanucLegacyControllerEngine.js";
import { okumaLegacyControllerEngine } from "../engines/OkumaLegacyControllerEngine.js";
import { siemensLegacyControllerEngine } from "../engines/SiemensLegacyControllerEngine.js";

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
    it("produces exactly one token per G-code address word in single-line program", () => {
      // "G0 X10 Y20 Z5" → 4 tokens: G0, X10, Y20, Z5
      const tokens = gcodeUnderstandingTransformerEngine.tokenize("G0 X10 Y20 Z5");
      expect(tokens.length).toBe(4);
    });

    it("preserves numeric values on motion words (X10 → token has value 10)", () => {
      const tokens = gcodeUnderstandingTransformerEngine.tokenize("G0 X10 Y20.5");
      const xTok = tokens.find((t) => t.type === "X");
      const yTok = tokens.find((t) => t.type === "Y");
      expect(xTok?.value).toBe(10);
      expect(yTok?.value).toBe(20.5);
      expect(xTok?.raw).toBe("X10");
    });

    it("emits zero tokens for an entirely-empty input", () => {
      const tokens = gcodeUnderstandingTransformerEngine.tokenize("");
      expect(tokens.length).toBe(0);
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
    it("returns LegacyProgramAnalysis with detectedController, markers, and recommendations", () => {
      const okumaLines = [
        "% O0001 (TEST PROGRAM)",
        "N10 G50 S2000",
        "N20 G96 S150 M3",
        "N30 G71 P10 Q20 U0.2 W0.05 D200 F0.3",
        "N40 G73 P10 Q20 I2 K2",
        "N50 M30",
      ];
      const r = okumaLegacyControllerEngine.detectController(okumaLines);
      expect(typeof r.detectedController).toBe("string");
      expect(r.detectedController.length).toBeGreaterThan(0);
      expect(Array.isArray(r.markers)).toBe(true);
      expect(Array.isArray(r.recommendations)).toBe(true);
      expect(typeof r.memoryEstimate).toBe("number");
    });

    it("flags G71 (B-param) + G73 (U/W) turning cycles in features", () => {
      // Engine detection patterns: G71 needs B-param, G73 needs U + W
      const lines = [
        "G71 B0.05 P100 Q200 D200 F0.3",
        "G73 U1.0 W0.5 I2 K2",
        "G72 P100",
      ];
      const r = okumaLegacyControllerEngine.detectController(lines);
      expect(r.features.usesG71Threading).toBe(true);
      expect(r.features.usesG73PatternRepeat).toBe(true);
      expect(r.features.usesG72Finishing).toBe(true);
    });
  });

  describe("SiemensLegacyControllerEngine.getProfile", () => {
    it("returns a 3-axis-mill profile with ShopMill enabled and correct max axes", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      expect(profile.hasShopMill).toBe(true);
      expect(profile.hasShopTurn).toBe(false);
      expect(profile.maxAxes).toBe(3);
      expect(profile.parameterPrefix).toBe("MD");
      expect(profile.maxSpindleRPM).toBe(8000);
    });

    it("returns a 3-axis-lathe profile with ShopTurn + CYCLE95/96 turning cycles", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_lathe");
      expect(profile.hasShopTurn).toBe(true);
      expect(profile.hasShopMill).toBe(false);
      expect(profile.supportedCycles).toContain("CYCLE95");
      expect(profile.supportedCycles).toContain("CYCLE96");
    });

    it("falls back to NCK 3.4 capabilities when given an unknown nckVersion", () => {
      const a = siemensLegacyControllerEngine.getProfile("3_axis_mill", "9.99-bogus");
      const b = siemensLegacyControllerEngine.getProfile("3_axis_mill", "3.4");
      expect(a.lookAheadBlocks).toBe(b.lookAheadBlocks);
      expect(a.blockProcessingRate).toBe(b.blockProcessingRate);
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
