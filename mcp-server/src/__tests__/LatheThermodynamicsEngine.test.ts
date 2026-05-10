/**
 * LatheThermodynamicsEngine.test.ts
 *
 * Pins the deterministic surface of LatheThermodynamicsEngine against
 * exact values from the in-engine COATING / COOLANT / PHASE
 * databases (no mocks). All assertions are exact — homologous-temp
 * math is computed against derivation in the comment, DB lookups
 * pin the canonical literature values.
 *
 * Reference values from src/engines/LatheThermodynamicsEngine.ts:
 *   COATING_DATABASE.TiAlN  (line ~563)
 *   COOLANT_DATABASE.dry / air_blast / mist (line ~777)
 *   PHASE_TRANSFORMATION_DB.steel (line ~898)  — Ac1/Ac3/Ms canonical
 */
import { describe, it, expect } from "vitest";
import { latheThermodynamicsEngine } from "../engines/LatheThermodynamicsEngine.js";

// ---------------------------------------------------------------------------
// Reference temperatures (no magic numbers in assertions)
// ---------------------------------------------------------------------------
const ROOM_TEMP_C = 20;
const STEEL_MELT_C = 1500;
const MIDPOINT_C = 760;
// Derivation of midpoint T*: in K-space (T_room + 273 = 293, T_melt + 273 = 1773),
// (760 + 273 - 293) / (1773 - 293) = 740 / 1480 = 0.5 exactly.
const MIDPOINT_T_STAR_EXACT = 0.5;
// Reference Johnson-Cook softening exponents
const JC_M_LINEAR = 1.0;
const JC_M_QUADRATIC = 2.0;
const SOFTENING_AT_MIDPOINT_M1 = 0.5;   // 1 - 0.5^1
const SOFTENING_AT_MIDPOINT_M2 = 0.75;  // 1 - 0.5^2

// Canonical AISI/ASM phase transformation values for plain carbon steel
const STEEL_Ac1_C = 727;
const STEEL_Ac3_C = 850;
const STEEL_Ms_C  = 350;
const STEEL_TEMPERING_THRESHOLD_C = 200;
const ALLOY_Ac1_C = 740;
const ALLOY_Ms_C  = 320;

// Coating canonical values (TiAlN per Sandvik / Kennametal datasheets)
const TIALN_MAX_TEMP_C = 800;
const TIALN_K_THERMAL = 5;
const TIALN_FRICTION = 0.35;

// Coolant heat-transfer coefficients [W/m²K]
const H_DRY = 10;
const H_AIR_BLAST = 100;
const H_MIST = 500;

const TOTAL_COATINGS = 10;

describe("LatheThermodynamicsEngine — homologous temperature math", () => {
  it("T_room ⇒ T* = 0 exactly", () => {
    expect(latheThermodynamicsEngine.calculateHomologousTemperature(
      ROOM_TEMP_C, STEEL_MELT_C, ROOM_TEMP_C
    )).toBe(0);
  });

  it("T_melt ⇒ T* = 1 exactly", () => {
    expect(latheThermodynamicsEngine.calculateHomologousTemperature(
      STEEL_MELT_C, STEEL_MELT_C, ROOM_TEMP_C
    )).toBe(1);
  });

  it("midpoint ⇒ T* = 0.5 exactly (rational arithmetic 740/1480)", () => {
    expect(latheThermodynamicsEngine.calculateHomologousTemperature(
      MIDPOINT_C, STEEL_MELT_C, ROOM_TEMP_C
    )).toBe(MIDPOINT_T_STAR_EXACT);
  });

  it("T < T_room ⇒ T* clamped to 0 by Math.max guard", () => {
    expect(latheThermodynamicsEngine.calculateHomologousTemperature(
      -50, STEEL_MELT_C, ROOM_TEMP_C
    )).toBe(0);
  });
});

describe("LatheThermodynamicsEngine — Johnson-Cook thermal softening", () => {
  it("T_room, m=1 ⇒ softening = 1 (no softening)", () => {
    expect(latheThermodynamicsEngine.calculateThermalSofteningFactor(
      ROOM_TEMP_C, STEEL_MELT_C, JC_M_LINEAR, ROOM_TEMP_C
    )).toBe(1);
  });

  it("T_melt, m=1 ⇒ softening = 0.1 (residual-strength floor, not 0)", () => {
    // Engine clamps softening to Math.max(0.1, 1 - T*^m) so plastic strength
    // never drops to absolute zero — pinned for downstream stability.
    expect(latheThermodynamicsEngine.calculateThermalSofteningFactor(
      STEEL_MELT_C, STEEL_MELT_C, JC_M_LINEAR, ROOM_TEMP_C
    )).toBe(0.1);
  });

  it("midpoint, m=1 ⇒ 1 - 0.5^1 = 0.5 exactly", () => {
    expect(latheThermodynamicsEngine.calculateThermalSofteningFactor(
      MIDPOINT_C, STEEL_MELT_C, JC_M_LINEAR, ROOM_TEMP_C
    )).toBe(SOFTENING_AT_MIDPOINT_M1);
  });

  it("midpoint, m=2 ⇒ 1 - 0.5^2 = 0.75 exactly", () => {
    expect(latheThermodynamicsEngine.calculateThermalSofteningFactor(
      MIDPOINT_C, STEEL_MELT_C, JC_M_QUADRATIC, ROOM_TEMP_C
    )).toBe(SOFTENING_AT_MIDPOINT_M2);
  });
});

describe("LatheThermodynamicsEngine — coating database (TiAlN canonical)", () => {
  it("TiAlN max_temp_C = 800", () => {
    expect(latheThermodynamicsEngine.getCoatingProperties("TiAlN").max_temp_C).toBe(TIALN_MAX_TEMP_C);
  });

  it("TiAlN k_thermal = 5", () => {
    expect(latheThermodynamicsEngine.getCoatingProperties("TiAlN").k_thermal).toBe(TIALN_K_THERMAL);
  });

  it("TiAlN friction_coefficient = 0.35", () => {
    expect(latheThermodynamicsEngine.getCoatingProperties("TiAlN").friction_coefficient).toBe(TIALN_FRICTION);
  });

  it("getAvailableCoatings returns 10 entries including PCD and CBN", () => {
    const list = latheThermodynamicsEngine.getAvailableCoatings();
    expect(list.length).toBe(TOTAL_COATINGS);
    expect(list).toEqual(expect.arrayContaining([
      "uncoated", "TiN", "TiCN", "TiAlN", "AlTiN",
      "AlCrN", "Al2O3", "CVD_diamond", "PCD", "CBN",
    ]));
  });
});

describe("LatheThermodynamicsEngine — coolant heat-transfer coefficients", () => {
  it("dry coolant h_typical = 10 W/m²K (no convection assist)", () => {
    expect(latheThermodynamicsEngine.getCoolantProperties("dry").h_typical).toBe(H_DRY);
  });

  it("air_blast h_typical = 100 W/m²K (10× dry)", () => {
    expect(latheThermodynamicsEngine.getCoolantProperties("air_blast").h_typical).toBe(H_AIR_BLAST);
  });

  it("mist h_typical = 500 W/m²K (5× air_blast)", () => {
    expect(latheThermodynamicsEngine.getCoolantProperties("mist").h_typical).toBe(H_MIST);
  });
});

describe("LatheThermodynamicsEngine — phase transformation lookups", () => {
  it("steel: Ac1=727, Ac3=850, Ms=350, tempering_threshold=200 (AISI canonical)", () => {
    const p = latheThermodynamicsEngine.getPhaseTransformationData("steel");
    expect(p?.Ac1_C).toBe(STEEL_Ac1_C);
    expect(p?.Ac3_C).toBe(STEEL_Ac3_C);
    expect(p?.Ms_C).toBe(STEEL_Ms_C);
    expect(p?.tempering_threshold_C).toBe(STEEL_TEMPERING_THRESHOLD_C);
  });

  it("alloy_steel differs from plain (Ac1=740, Ms=320)", () => {
    const p = latheThermodynamicsEngine.getPhaseTransformationData("alloy_steel");
    expect(p?.Ac1_C).toBe(ALLOY_Ac1_C);
    expect(p?.Ms_C).toBe(ALLOY_Ms_C);
  });

  it("unknown material ⇒ undefined (DB miss)", () => {
    expect(latheThermodynamicsEngine.getPhaseTransformationData("__not_a_material__")).toBe(undefined);
  });
});
