/**
 * Tests for the tool-material cutting-speed factor (OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-VC).
 *
 * Closes the operator-found gap: the SFC ignored tool material (carbide ≡ HSS ≡
 * ceramic all returned the same Vc) because UltimateSpeedFeedEngine's Vc formula
 * had no tool-material term. The base cutting speeds are CARBIDE-anchored; this
 * factor scales them to the selected tool material.
 *
 * Reference values are the canonical multipliers (Machinery's Handbook 31st ed.;
 * Sandvik/Kennametal) — a regression in the table OR the clamp fails a test.
 * The carbide-identity case (1.0) guards the 401-assertion gauntlet: carbide
 * recommendations must be byte-unchanged.
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_TOOL_MATERIAL_SPEED_FACTOR,
  getToolMaterialSpeedFactor,
  TOOL_MATERIAL_SPEED_FACTOR_MIN,
  TOOL_MATERIAL_SPEED_FACTOR_MAX,
} from "../physics/constants.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

describe("getToolMaterialSpeedFactor — canonical multipliers (U-OSC-TOOLMAT-VC)", () => {
  it("carbide is the 1.0 baseline (the gauntlet-preserving identity)", () => {
    expect(getToolMaterialSpeedFactor("carbide")).toBe(1.0);
  });

  it("HSS runs ~1/3 of carbide (the dominant, safety-relevant case)", () => {
    // HSS anchored to carbide speed OVER-speeds it ~3x — this is the fix.
    expect(getToolMaterialSpeedFactor("hss")).toBeCloseTo(0.35, 5);
    expect(getToolMaterialSpeedFactor("hss")).toBeLessThan(1.0); // strictly slower = safer
  });

  it("orders the materials physically: HSS < carbide < cermet < ceramic/cbn/pcd", () => {
    const hss = getToolMaterialSpeedFactor("hss");
    const carbide = getToolMaterialSpeedFactor("carbide");
    const cermet = getToolMaterialSpeedFactor("cermet");
    const ceramic = getToolMaterialSpeedFactor("ceramic");
    expect(hss).toBeLessThan(carbide);
    expect(carbide).toBeLessThan(cermet);
    expect(cermet).toBeLessThan(ceramic);
    expect(getToolMaterialSpeedFactor("cbn")).toBeGreaterThan(carbide);
    expect(getToolMaterialSpeedFactor("pcd")).toBeGreaterThan(carbide);
  });

  it("is case-insensitive (HSS == hss == Hss)", () => {
    expect(getToolMaterialSpeedFactor("HSS")).toBe(getToolMaterialSpeedFactor("hss"));
    expect(getToolMaterialSpeedFactor("Carbide")).toBe(getToolMaterialSpeedFactor("carbide"));
  });

  // --- failure modes / fail-safe ---
  it("unknown material falls back to carbide (1.0), never a wild value", () => {
    expect(getToolMaterialSpeedFactor("unobtainium")).toBe(1.0);
    expect(getToolMaterialSpeedFactor("")).toBe(1.0);
  });

  it("null/undefined falls back to carbide (1.0)", () => {
    expect(getToolMaterialSpeedFactor(undefined)).toBe(1.0);
    expect(getToolMaterialSpeedFactor(null)).toBe(1.0);
  });

  it("every canonical value sits inside the clamp band (no wild factor escapes)", () => {
    for (const [mat, raw] of Object.entries(CANONICAL_TOOL_MATERIAL_SPEED_FACTOR)) {
      const applied = getToolMaterialSpeedFactor(mat);
      expect(applied).toBeGreaterThanOrEqual(TOOL_MATERIAL_SPEED_FACTOR_MIN);
      expect(applied).toBeLessThanOrEqual(TOOL_MATERIAL_SPEED_FACTOR_MAX);
      // within-band values pass through unclamped
      if (raw >= TOOL_MATERIAL_SPEED_FACTOR_MIN && raw <= TOOL_MATERIAL_SPEED_FACTOR_MAX) {
        expect(applied).toBe(raw);
      }
    }
  });
});

describe("UltimateSpeedFeedEngine — tool material now changes Vc (the wiring proof)", () => {
  // Integration: the same material/tool/operation with DIFFERENT tool materials
  // must now yield DIFFERENT Vc (before this unit they were identical).
  const base = {
    material: "AISI 4140 Alloy Steel",
    iso_group: "P" as const,
    tool_diameter_mm: 12,
    flutes: 4,
    operation: "milling" as const,
  };

  it("HSS yields a LOWER Vc than carbide on the same steel cut (~0.35x)", () => {
    const carbide = ultimateSpeedFeedEngine.calculate({ ...base, tool_material: "carbide" });
    const hss = ultimateSpeedFeedEngine.calculate({ ...base, tool_material: "hss" });
    const vcCarbide = carbide.cutting_speed.value;
    const vcHss = hss.cutting_speed.value;
    expect(vcHss).toBeLessThan(vcCarbide); // HSS must be slower — the core fix
    expect(vcHss / vcCarbide).toBeCloseTo(0.35, 1); // ratio tracks the canonical factor
  }, 30000);

  it("ceramic yields a HIGHER Vc than carbide on the same cut", () => {
    const carbide = ultimateSpeedFeedEngine.calculate({ ...base, tool_material: "carbide" });
    const ceramic = ultimateSpeedFeedEngine.calculate({ ...base, tool_material: "ceramic" });
    expect(ceramic.cutting_speed.value).toBeGreaterThan(carbide.cutting_speed.value);
  }, 30000);

  it("SAFETY: inferred tool material does NOT apply an aggressive factor (H-group → carbide-conservative, not cbn 2.5x)", () => {
    // inferToolMaterial(H) returns "cbn". Without this guard, a hardened cut with NO
    // explicit tool material would silently get the aggressive 2.5x CBN speed — unsafe
    // if the shop runs coated carbide. The factor applies ONLY to explicit materials.
    const hbase = { material: "AISI D2 Tool Steel", iso_group: "H" as const, tool_diameter_mm: 12, flutes: 4, operation: "milling" as const };
    const inferred = ultimateSpeedFeedEngine.calculate({ ...hbase }); // no tool_material
    const explicitCarbide = ultimateSpeedFeedEngine.calculate({ ...hbase, tool_material: "carbide" });
    const explicitCbn = ultimateSpeedFeedEngine.calculate({ ...hbase, tool_material: "cbn" });
    // inferred must equal the conservative carbide baseline (factor 1.0), NOT cbn 2.5x
    expect(inferred.cutting_speed.value).toBeCloseTo(explicitCarbide.cutting_speed.value, 1);
    // an EXPLICIT cbn choice DOES get the faster speed (the user opted in)
    expect(explicitCbn.cutting_speed.value).toBeGreaterThan(inferred.cutting_speed.value);
  }, 45000);
});
