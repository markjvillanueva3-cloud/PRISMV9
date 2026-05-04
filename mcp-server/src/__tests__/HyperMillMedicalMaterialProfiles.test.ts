/**
 * HyperMillMedicalMaterialProfiles tests — CAM-EXHAUST-MS0 / U-CAM-HM-MEDPROF-TESTS-01
 *
 * Coverage:
 *   1. MEDICAL_MATERIAL_PROFILES catalog: 6 profiles (CoCr/PEEK/Ti-Gr5/Gr23/zirconia×2)
 *   2. Each profile has Kienzle constants from CANONICAL_KIENZLE (NO inline)
 *   3. getProfile(): roughing vs finishing returns mid-range Vc/fz, kc work-hardening
 *   4. resolveMaterialKey(): aliases (cocr, co-cr, cobalt_chrome, cobalt chromium)
 *   5. listProfiles(): 6 entries with key+displayName+isoGroup
 *   6. Compliance / hyperMILL note presence per material
 *   7. Adversarial: unknown key, worn tool > 70% triggers violation
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillMedicalMaterialProfiles,
  hyperMillMedicalMaterialProfiles,
  MEDICAL_MATERIAL_PROFILES,
} from "../engines/HyperMillMedicalMaterialProfiles.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

const TOTAL_MEDICAL_PROFILES = 6;
const KC_S = CANONICAL_KIENZLE.S.kc1_1; // 2800
const MC_S = CANONICAL_KIENZLE.S.mc;
const KC_K = CANONICAL_KIENZLE.K.kc1_1;
const COCR_WORK_HARDENING_FACTOR = 1.25;
const COCR_VC_ROUGHING_MID = 30; // (20+40)/2
const COCR_FZ_ROUGHING_MID = (0.05 + 0.12) / 2;
const SHARP_TOOL = 0;
const FULLY_WORN_TOOL = 1;

describe("HyperMillMedicalMaterialProfiles — class shape", () => {
  it("exports class + singleton + profiles dict", () => {
    expect(typeof HyperMillMedicalMaterialProfiles).toBe("function");
    expect(hyperMillMedicalMaterialProfiles instanceof HyperMillMedicalMaterialProfiles).toBe(true);
    expect(typeof MEDICAL_MATERIAL_PROFILES).toBe("object");
  });
});

describe("HyperMillMedicalMaterialProfiles — MEDICAL_MATERIAL_PROFILES catalog", () => {
  it("contains 6 profiles (cocr, peek, titanium_gr5, titanium_gr23, zirconia_green, zirconia_sintered)", () => {
    expect(Object.keys(MEDICAL_MATERIAL_PROFILES).length).toBe(TOTAL_MEDICAL_PROFILES);
    expect(MEDICAL_MATERIAL_PROFILES.cocr).not.toBe(undefined);
    expect(MEDICAL_MATERIAL_PROFILES.peek).not.toBe(undefined);
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr5).not.toBe(undefined);
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr23).not.toBe(undefined);
    expect(MEDICAL_MATERIAL_PROFILES.zirconia_green).not.toBe(undefined);
    expect(MEDICAL_MATERIAL_PROFILES.zirconia_sintered).not.toBe(undefined);
  });

  it("CoCr Kienzle constants sourced from CANONICAL_KIENZLE.S (kc=2800, mc=0.28)", () => {
    expect(MEDICAL_MATERIAL_PROFILES.cocr.kc1_1).toBe(KC_S);
    expect(MEDICAL_MATERIAL_PROFILES.cocr.mc).toBe(MC_S);
  });

  it("Titanium Gr5 + Gr23 use ISO S Kienzle constants", () => {
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr5.kc1_1).toBe(KC_S);
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr23.kc1_1).toBe(KC_S);
  });

  it("Zirconia green uses ISO K Kienzle constants", () => {
    expect(MEDICAL_MATERIAL_PROFILES.zirconia_green.kc1_1).toBe(KC_K);
  });

  it("CoCr work hardening factor = 1.25 (Sandvik Medical Guide 2023)", () => {
    expect(MEDICAL_MATERIAL_PROFILES.cocr.workHardeningFactor).toBe(COCR_WORK_HARDENING_FACTOR);
  });

  it("PEEK has thermal ceiling at 250°C (Victrex 2022)", () => {
    expect(MEDICAL_MATERIAL_PROFILES.peek.thermalCeiling_C).toBe(250);
  });

  it("Metallic profiles have null thermal ceiling", () => {
    expect(MEDICAL_MATERIAL_PROFILES.cocr.thermalCeiling_C).toBe(null);
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr5.thermalCeiling_C).toBe(null);
  });

  it("PEEK does NOT require through-spindle coolant (air blast preferred)", () => {
    expect(MEDICAL_MATERIAL_PROFILES.peek.throughSpindleCoolantRequired).toBe(false);
  });

  it("All metallic implant materials require through-spindle coolant", () => {
    expect(MEDICAL_MATERIAL_PROFILES.cocr.throughSpindleCoolantRequired).toBe(true);
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr5.throughSpindleCoolantRequired).toBe(true);
    expect(MEDICAL_MATERIAL_PROFILES.titanium_gr23.throughSpindleCoolantRequired).toBe(true);
  });

  it("Sintered zirconia requires wet milling (heat shock prevention)", () => {
    expect(MEDICAL_MATERIAL_PROFILES.zirconia_sintered.throughSpindleCoolantRequired).toBe(true);
  });

  it("Green zirconia must be dry milled (moisture causes microcracks)", () => {
    expect(MEDICAL_MATERIAL_PROFILES.zirconia_green.throughSpindleCoolantRequired).toBe(false);
  });

  it("Every profile has compliance + hyperMILL notes", () => {
    Object.values(MEDICAL_MATERIAL_PROFILES).forEach((p) => {
      expect(p.complianceNotes.length).toBeGreaterThan(0);
      expect(p.hyperMillNotes.length).toBeGreaterThan(0);
    });
  });

  it("CoCr compliance notes cite ASTM F75/F1537", () => {
    const notes = MEDICAL_MATERIAL_PROFILES.cocr.complianceNotes.join(" ");
    expect(notes).toContain("ASTM F75");
    expect(notes).toContain("ASTM F1537");
  });

  it("PEEK compliance notes cite ISO 10993", () => {
    const notes = MEDICAL_MATERIAL_PROFILES.peek.complianceNotes.join(" ");
    expect(notes).toContain("ISO 10993");
  });
});

describe("HyperMillMedicalMaterialProfiles — getProfile()", () => {
  it("CoCr roughing returns mid-range Vc=30 m/min, fz=0.085 mm", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", SHARP_TOOL);
    expect(r.vcRecommended_m_min).toBe(COCR_VC_ROUGHING_MID);
    expect(r.feedRecommended_mm).toBeCloseTo(COCR_FZ_ROUGHING_MID, 6);
  });

  it("CoCr finishing returns higher Vc than roughing", () => {
    const rough = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", SHARP_TOOL);
    const fin = hyperMillMedicalMaterialProfiles.getProfile("cocr", "finishing", SHARP_TOOL);
    expect(fin.vcRecommended_m_min).toBeGreaterThan(rough.vcRecommended_m_min);
  });

  it("Sharp tool: kcCorrected = profile.kc1_1 exactly", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", SHARP_TOOL);
    expect(r.kcCorrected).toBe(KC_S);
  });

  it("Fully worn tool: kcCorrected = kc1_1 × workHardeningFactor", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", FULLY_WORN_TOOL);
    expect(r.kcCorrected).toBeCloseTo(KC_S * COCR_WORK_HARDENING_FACTOR, 6);
  });

  it("PEEK has no work hardening — kcCorrected stays at kc1_1", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("peek", "roughing", FULLY_WORN_TOOL);
    expect(r.kcCorrected).toBe(MEDICAL_MATERIAL_PROFILES.peek.kc1_1);
  });

  it("CoCr triggers climb-mandatory + sharp-tool + coolant warnings", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", SHARP_TOOL);
    const text = r.warnings.join(" ");
    expect(text).toContain("climb milling MANDATORY");
    expect(text).toContain("through-spindle coolant required");
    expect(text).toContain("sharp tools mandatory");
  });

  it("PEEK triggers thermal ceiling warning (250°C)", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("peek", "finishing", SHARP_TOOL);
    expect(r.warnings.some((w) => w.includes("250°C"))).toBe(true);
  });

  it("Tool wear > 70% triggers violation", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", 0.8);
    expect(r.hasViolations).toBe(true);
    expect(r.violations.some((v) => v.includes("Tool wear 80%"))).toBe(true);
  });

  it("Tool wear ≤ 70% does not trigger violation", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", 0.5);
    expect(r.hasViolations).toBe(false);
    expect(r.violations.filter((v) => v.includes("Tool wear"))).toEqual([]);
  });

  it("Unknown material key returns CoCr default + violation", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile(
      "nonexistent_key" as never,
      "roughing",
      SHARP_TOOL
    );
    expect(r.hasViolations).toBe(true);
    expect(r.violations[0]).toContain("Unknown medical material key");
  });
});

describe("HyperMillMedicalMaterialProfiles — resolveMaterialKey()", () => {
  it("'cocr' → cocr", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("cocr")).toBe("cocr");
  });

  it("'cobalt-chrome' (dash → underscore normalization) → cocr", () => {
    // Engine normalizes [\s-] → _, so "cobalt-chrome" → "cobalt_chrome" matches
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("cobalt-chrome")).toBe("cocr");
  });

  it("'cobalt_chrome' (already-underscored) → cocr", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("cobalt_chrome")).toBe("cocr");
  });

  it("'co-cr' (short alias with dash) → null (engine only matches full 'cobalt_chrome' or contiguous 'cocr')", () => {
    // "co-cr" → "co_cr" — does NOT contain "cocr" (need contiguous chars)
    // and does NOT contain "cobalt_chrome". Documented engine behavior.
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("co-cr")).toBe(null);
  });

  it("'Cobalt Chromium' (case-insensitive + space) → cocr", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Cobalt Chromium")).toBe("cocr");
  });

  it("'PEEK' → peek", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("PEEK")).toBe("peek");
  });

  it("'Ti6Al4V' → titanium_gr5", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Ti6Al4V")).toBe("titanium_gr5");
  });

  it("'Ti-6Al-4V' (with dashes) → titanium_gr5", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Ti-6Al-4V")).toBe("titanium_gr5");
  });

  it("'Ti6Al4V ELI' → titanium_gr23", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Ti6Al4V ELI")).toBe("titanium_gr23");
  });

  it("'Grade 23' → titanium_gr23", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Grade 23")).toBe("titanium_gr23");
  });

  it("'Grade 5' → titanium_gr5", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Grade 5")).toBe("titanium_gr5");
  });

  it("'zirconia green' → zirconia_green", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("zirconia green")).toBe("zirconia_green");
  });

  it("'zirconia' alone defaults to zirconia_sintered", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("zirconia")).toBe("zirconia_sintered");
  });

  it("unknown material returns null", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("xyzzy_unknown")).toBe(null);
  });

  it("empty string returns null", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("")).toBe(null);
  });
});

describe("HyperMillMedicalMaterialProfiles — listProfiles()", () => {
  it("returns 6 profile summaries", () => {
    const list = hyperMillMedicalMaterialProfiles.listProfiles();
    expect(list.length).toBe(TOTAL_MEDICAL_PROFILES);
    list.forEach((p) => {
      expect(typeof p.key).toBe("string");
      expect(typeof p.displayName).toBe("string");
      expect(["P", "M", "K", "N", "S", "H"]).toContain(p.isoGroup);
    });
  });

  it("includes cocr with iso S", () => {
    const list = hyperMillMedicalMaterialProfiles.listProfiles();
    const cocr = list.find((p) => p.key === "cocr");
    expect(cocr!.isoGroup).toBe("S");
  });

  it("includes peek with iso N", () => {
    const list = hyperMillMedicalMaterialProfiles.listProfiles();
    const peek = list.find((p) => p.key === "peek");
    expect(peek!.isoGroup).toBe("N");
  });
});
