/**
 * aiReasoningDispatcher U-WIRE42 round-trip tests — MaterialHardnessStateClassifierEngine.
 *
 * Validates hardness_classify / hardness_list_materials /
 * hardness_list_with_aliases / hardness_convert through prism_ai. Engine
 * is a STATIC class (no instance, no state) so isolation is trivially
 * guaranteed.
 *
 * Engine internals (verified by these tests):
 *   - classify() looks up material in MATERIAL_DATABASE (case-insensitive,
 *     supports aliases + substring matching), interpolates kc1.1 across
 *     hardness bands, returns ISO group + recommended insert + max speed.
 *   - Unknown materials fall back to band-based generic defaults at
 *     confidence 0.6 with a warning. Known materials → confidence 0.95.
 *   - Hardness band breakpoints: soft<20, medium<35, pre_hard<45, hard<58, ultra_hard>=58.
 *   - Ultra-hard band always emits a CBN/PCBN warning.
 *   - hbToHrc / hrcToHb are piecewise-linear conversions.
 *   - getJMDieMaterials() returns names only; getAllMaterialsWithAliases()
 *     returns the full alias map.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE42
 */

import { describe, it, expect } from "vitest";
import { MaterialHardnessStateClassifierEngine } from "../engines/MaterialHardnessStateClassifierEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["hardness_classify", "hardness_list_materials", "hardness_list_with_aliases", "hardness_convert"] as const;

// Hardness band breakpoints (engine internal: classifyBand).
const SOFT_MAX_HRC = 20;       // hrc < 20 -> soft
const MEDIUM_MAX_HRC = 35;     // hrc < 35 -> medium
const PRE_HARD_MAX_HRC = 45;   // hrc < 45 -> pre_hard
const HARD_MAX_HRC = 58;       // hrc < 58 -> hard, else ultra_hard
// Material-specific known values from MATERIAL_DATABASE seed (4140 + D2).
const KNOWN_4140_NAME = "4140";
const KNOWN_4140_QT_HRC = 32;
const KNOWN_4140_QT_KC1_1 = 2260;
const KNOWN_D2_NAME = "D2";
const KNOWN_D2_HARD_HRC = 60;
const KNOWN_D2_ISO = "H";
// Confidence levels documented in engine.
const KNOWN_MATERIAL_CONFIDENCE = 0.95;
const UNKNOWN_MATERIAL_CONFIDENCE = 0.6;
const SENTINEL = "__MISSING__";

describe("U-WIRE42 — engine direct: MaterialHardnessStateClassifierEngine", () => {
  it("classifyBand returns correct band for HRC breakpoint values", () => {
    expect(MaterialHardnessStateClassifierEngine.classifyBand(10)).toBe("soft");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(SOFT_MAX_HRC - 1)).toBe("soft");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(SOFT_MAX_HRC)).toBe("medium");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(MEDIUM_MAX_HRC - 1)).toBe("medium");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(MEDIUM_MAX_HRC)).toBe("pre_hard");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(PRE_HARD_MAX_HRC - 1)).toBe("pre_hard");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(PRE_HARD_MAX_HRC)).toBe("hard");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(HARD_MAX_HRC - 1)).toBe("hard");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(HARD_MAX_HRC)).toBe("ultra_hard");
    expect(MaterialHardnessStateClassifierEngine.classifyBand(65)).toBe("ultra_hard");
  });

  it("hbToHrc / hrcToHb conversions are inverses within rounding tolerance", () => {
    // Round-trip check at multiple sample points
    const samples = [25, 35, 45, 55];
    for (const hrc of samples) {
      const hb = MaterialHardnessStateClassifierEngine.hrcToHb(hrc);
      const back = MaterialHardnessStateClassifierEngine.hbToHrc(hb);
      // Engine uses piecewise-linear conversions; allow 0.5 HRC tolerance.
      expect(Math.abs(back - hrc)).toBeLessThan(0.5);
    }
  });

  it("hbToHrc clamps below 100 HB to 0 and above 739 HB to 68", () => {
    expect(MaterialHardnessStateClassifierEngine.hbToHrc(50)).toBe(0);
    expect(MaterialHardnessStateClassifierEngine.hbToHrc(99)).toBe(0);
    expect(MaterialHardnessStateClassifierEngine.hbToHrc(800)).toBe(68);
    expect(MaterialHardnessStateClassifierEngine.hbToHrc(1000)).toBe(68);
  });

  it("findMaterial resolves known material name (case-insensitive)", () => {
    const m = MaterialHardnessStateClassifierEngine.findMaterial(KNOWN_4140_NAME);
    if (!m) throw new Error("4140 should exist in MATERIAL_DATABASE");
    expect(m.name).toBe(KNOWN_4140_NAME);
    expect(m.iso_group).toBe("P");
  });

  it("findMaterial resolves alias (e.g. 'AISI 4140' -> 4140 entry)", () => {
    const m = MaterialHardnessStateClassifierEngine.findMaterial("AISI 4140");
    if (!m) throw new Error("AISI 4140 alias should resolve");
    expect(m.name).toBe(KNOWN_4140_NAME);
  });

  it("findMaterial returns null for unknown material", () => {
    const m = MaterialHardnessStateClassifierEngine.findMaterial("imaginary_alloy_xyz");
    expect(m ?? SENTINEL).toBe(SENTINEL);
  });

  it("classify on known material 4140 at QT 32 HRC interpolates kc1.1 to 2260 MPa", () => {
    const r = MaterialHardnessStateClassifierEngine.classify({
      material_name: KNOWN_4140_NAME,
      hardness_hrc: KNOWN_4140_QT_HRC,
    });
    expect(r.material_name).toBe(KNOWN_4140_NAME);
    expect(r.hardness_hrc).toBe(KNOWN_4140_QT_HRC);
    expect(r.kc1_1_MPa).toBe(KNOWN_4140_QT_KC1_1);
    expect(r.iso_group).toBe("P");
    expect(r.band).toBe("medium"); // 32 < 35 → medium
    expect(r.confidence).toBe(KNOWN_MATERIAL_CONFIDENCE);
    expect(r.warnings.length).toBe(0);
  });

  it("classify on D2 at hard HRC returns ISO H + ultra_hard warning logic", () => {
    const r = MaterialHardnessStateClassifierEngine.classify({
      material_name: KNOWN_D2_NAME,
      hardness_hrc: KNOWN_D2_HARD_HRC,
    });
    expect(r.iso_group).toBe(KNOWN_D2_ISO);
    expect(r.band).toBe("ultra_hard"); // 60 >= 58 → ultra_hard
    // Ultra-hard band emits a CBN/PCBN warning per engine source line 339-341.
    expect(r.warnings.some((w) => /CBN|PCBN/i.test(w))).toBe(true);
  });

  it("classify on unknown material falls back to generic defaults at confidence 0.6", () => {
    const r = MaterialHardnessStateClassifierEngine.classify({
      material_name: "imaginary_unobtainium_42",
      hardness_hrc: 30,
    });
    expect(r.confidence).toBe(UNKNOWN_MATERIAL_CONFIDENCE);
    expect(r.warnings.some((w) => w.includes("not found"))).toBe(true);
    expect(r.band).toBe("medium");
  });

  it("classify with no hardness defaults to 25 HRC + warning", () => {
    const r = MaterialHardnessStateClassifierEngine.classify({
      material_name: KNOWN_4140_NAME,
    });
    // Engine sets hrc=25 then converts; rounded result should be 25.
    expect(r.hardness_hrc).toBe(25);
    expect(r.warnings.some((w) => w.includes("No hardness provided"))).toBe(true);
  });

  it("classify with HB only converts to HRC internally", () => {
    // 240 HB → 20 HRC per piecewise-linear formula at the breakpoint.
    const r = MaterialHardnessStateClassifierEngine.classify({
      material_name: KNOWN_4140_NAME,
      hardness_hb: 240,
    });
    expect(r.hardness_hrc).toBe(20);
    expect(r.hardness_hb).toBe(240);
  });

  it("classify includes case_hardened warning when band=hard + heat_treatment=case_hardened", () => {
    const r = MaterialHardnessStateClassifierEngine.classify({
      material_name: KNOWN_4140_NAME,
      hardness_hrc: 50,
      heat_treatment: "case_hardened",
    });
    expect(r.band).toBe("hard");
    expect(r.warnings.some((w) => w.includes("Case-hardened"))).toBe(true);
  });

  it("getJMDieMaterials returns at least one material name", () => {
    const materials = MaterialHardnessStateClassifierEngine.getJMDieMaterials();
    expect(materials.length).toBeGreaterThan(0);
    expect(materials.includes(KNOWN_4140_NAME)).toBe(true);
    expect(materials.includes(KNOWN_D2_NAME)).toBe(true);
  });

  it("getAllMaterialsWithAliases returns name + aliases array per entry", () => {
    const list = MaterialHardnessStateClassifierEngine.getAllMaterialsWithAliases();
    expect(list.length).toBeGreaterThan(0);
    const sample4140 = list.find((m) => m.name === KNOWN_4140_NAME);
    if (!sample4140) throw new Error("4140 must be in alias list");
    expect(sample4140.aliases.length).toBeGreaterThan(0);
    expect(sample4140.aliases.includes("AISI 4140")).toBe(true);
  });
});

describe("U-WIRE42 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      hardness_classify: { material_name: "4140" },
      hardness_list_materials: {},
      hardness_list_with_aliases: {},
      hardness_convert: { from: "hrc", value: 30 },
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("hardness_classify rejects empty material_name (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["hardness_classify"];
    expect(() => schema.parse({ material_name: "" })).toThrow();
    expect(() => schema.parse({})).toThrow();
  });

  it("hardness_classify rejects out-of-range hardness values (failure modes)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["hardness_classify"];
    expect(() => schema.parse({ material_name: "4140", hardness_hrc: -1 })).toThrow();
    expect(() => schema.parse({ material_name: "4140", hardness_hrc: 100 })).toThrow();
    expect(() => schema.parse({ material_name: "4140", hardness_hb: 49 })).toThrow();
    expect(() => schema.parse({ material_name: "4140", hardness_hb: 801 })).toThrow();
  });

  it("hardness_classify rejects invalid heat_treatment enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["hardness_classify"];
    expect(() => schema.parse({ material_name: "4140", heat_treatment: "vacuum_baked" })).toThrow();
    const ok = schema.parse({ material_name: "4140", heat_treatment: "annealed" }) as { heat_treatment: string };
    expect(ok.heat_treatment).toBe("annealed");
  });

  it("hardness_convert rejects invalid 'from' enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["hardness_convert"];
    expect(() => schema.parse({ from: "vickers", value: 200 })).toThrow();
    const ok = schema.parse({ from: "hb", value: 200 }) as { from: string };
    expect(ok.from).toBe("hb");
  });

  it("hardness_convert rejects negative value (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["hardness_convert"];
    expect(() => schema.parse({ from: "hrc", value: -5 })).toThrow();
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE42 — dispatcher round-trip: prism_ai", () => {
  it("hardness_classify on 4140 at QT returns full HardnessClassificationResult", async () => {
    const out = await executeAIReasoningAction("hardness_classify", {
      material_name: KNOWN_4140_NAME,
      hardness_hrc: KNOWN_4140_QT_HRC,
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      material_name: string;
      hardness_hrc: number;
      hardness_hb: number;
      band: string;
      kc1_1_MPa: number;
      iso_group: string;
      recommended_insert_material: string;
      max_cutting_speed_m_min: number;
      confidence: number;
    };
    expect(data.material_name).toBe(KNOWN_4140_NAME);
    expect(data.hardness_hrc).toBe(KNOWN_4140_QT_HRC);
    expect(data.kc1_1_MPa).toBe(KNOWN_4140_QT_KC1_1);
    expect(data.iso_group).toBe("P");
    expect(data.band).toBe("medium");
    expect(data.confidence).toBe(KNOWN_MATERIAL_CONFIDENCE);
    expect(data.recommended_insert_material.length).toBeGreaterThan(0);
    expect(data.max_cutting_speed_m_min).toBeGreaterThan(0);
  });

  it("hardness_list_materials returns {materials, count} matching engine direct", async () => {
    const out = await executeAIReasoningAction("hardness_list_materials", {});
    expect(out.success).toBe(true);
    const data = out.data as { materials: string[]; count: number };
    const direct = MaterialHardnessStateClassifierEngine.getJMDieMaterials();
    expect(data.count).toBe(direct.length);
    expect(data.materials.length).toBe(direct.length);
    expect(data.materials.includes(KNOWN_4140_NAME)).toBe(true);
  });

  it("hardness_list_with_aliases returns full alias map", async () => {
    const out = await executeAIReasoningAction("hardness_list_with_aliases", {});
    expect(out.success).toBe(true);
    const data = out.data as { materials: { name: string; aliases: string[] }[]; count: number };
    const sample = data.materials.find((m) => m.name === KNOWN_4140_NAME);
    if (!sample) throw new Error("4140 missing from dispatcher response");
    expect(sample.aliases.length).toBeGreaterThan(0);
    expect(sample.aliases.includes("AISI 4140")).toBe(true);
  });

  it("hardness_convert from=hrc value=30 returns HB conversion", async () => {
    const out = await executeAIReasoningAction("hardness_convert", { from: "hrc", value: 30 });
    expect(out.success).toBe(true);
    const data = out.data as { input: { hrc: number }; output: { hb: number } };
    expect(data.input.hrc).toBe(30);
    // 30 HRC should map into the 240..450 HB range per engine formula.
    expect(data.output.hb).toBeGreaterThan(240);
    expect(data.output.hb).toBeLessThan(450);
  });

  it("hardness_convert from=hb value=240 returns 20 HRC at the breakpoint", async () => {
    const out = await executeAIReasoningAction("hardness_convert", { from: "hb", value: 240 });
    expect(out.success).toBe(true);
    const data = out.data as { output: { hrc: number } };
    expect(data.output.hrc).toBe(20);
  });

  it("hardness_classify with empty material_name returns success:false", async () => {
    const out = await executeAIReasoningAction("hardness_classify", { material_name: "" });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/material_name|min/i);
  });

  it("hardness_classify with out-of-range HRC returns success:false", async () => {
    const out = await executeAIReasoningAction("hardness_classify", {
      material_name: KNOWN_4140_NAME,
      hardness_hrc: 150,
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/hardness_hrc|max/i);
  });

  it("hardness_convert with invalid 'from' returns success:false", async () => {
    const out = await executeAIReasoningAction("hardness_convert", { from: "vickers", value: 200 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/from|enum|vickers/i);
  });

  it("dispatcher classify is equivalent to engine direct (deterministic)", async () => {
    const direct = MaterialHardnessStateClassifierEngine.classify({
      material_name: KNOWN_4140_NAME,
      hardness_hrc: 40,
    });
    const out = await executeAIReasoningAction("hardness_classify", {
      material_name: KNOWN_4140_NAME,
      hardness_hrc: 40,
    });
    expect(out.success).toBe(true);
    const data = out.data as { kc1_1_MPa: number; band: string; iso_group: string };
    expect(data.kc1_1_MPa).toBe(direct.kc1_1_MPa);
    expect(data.band).toBe(direct.band);
    expect(data.iso_group).toBe(direct.iso_group);
  });
});
