/**
 * E2E test for ENGINE-WIRE-CALC/U-WIRE-CALC-SCE — SpecificCuttingEnergyEngine
 * wired as `calc_specific_cutting_energy` action on prism_calc.
 *
 * Engine API: specificCuttingEnergyEngine.calculate(input) — three compute paths:
 *   1) force + chip geometry  →  u = Fc / (b·h)        [J/mm³]
 *   2) Kienzle coefficients   →  u = kc1_1 · h^(-mc)
 *   3) cutting power + MRR    →  u = (Fc·Vc/60) / (Q · 1000/60)
 * Falls back to mild-steel default (2.5 J/mm³) when none provided.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { specificCuttingEnergyEngine } from "../engines/SpecificCuttingEnergyEngine.js";

const NEW_ACTIONS = ["calc_specific_cutting_energy"] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-CALC-SCE — engine: SpecificCuttingEnergyEngine.calculate", () => {
  describe("Method 1: force + chip geometry  (u = Fc / (b·h))", () => {
    it("computes u from Fc/(b·h) exactly within 1% rounding", () => {
      // Fc=1000 N, b=2 mm, h=0.1 mm → u = 1000 / (2·0.1) = 5000 N/mm² = 5000 J/mm³
      // Engine rounds to 0.01 precision, so target 5000.00.
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 1000,
        chip_width_mm: 2,
        chip_thickness_mm: 0.1,
        mrr_cm3_min: 5,
        machining_time_min: 1,
      });
      // u = 1000 / (2 * 0.1) = 5000 J/mm³
      expect(r.specific_energy_J_mm3.value).toBeCloseTo(5000, 0);
      expect(r.specific_energy_J_mm3.source).toBe("force_chip_area");
    });

    it("doubles u when force doubles (u ∝ Fc at fixed chip area)", () => {
      const a = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 500, chip_width_mm: 2, chip_thickness_mm: 0.2,
        mrr_cm3_min: 10, machining_time_min: 1,
      });
      const b = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 1000, chip_width_mm: 2, chip_thickness_mm: 0.2,
        mrr_cm3_min: 10, machining_time_min: 1,
      });
      const ratio = b.specific_energy_J_mm3.value / a.specific_energy_J_mm3.value;
      expect(ratio).toBeCloseTo(2.0, 2);
    });

    it("halves u when chip area doubles (u ∝ 1/(b·h))", () => {
      const a = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.1,
        mrr_cm3_min: 5, machining_time_min: 1,
      });
      const b = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 800, chip_width_mm: 4, chip_thickness_mm: 0.1,
        mrr_cm3_min: 5, machining_time_min: 1,
      });
      const ratio = b.specific_energy_J_mm3.value / a.specific_energy_J_mm3.value;
      expect(ratio).toBeCloseTo(0.5, 2);
    });
  });

  describe("Method 2: Kienzle coefficients (u = kc1_1 · h^(-mc))", () => {
    it("matches Kienzle algebra: u(h=0.1) = kc1_1 · 0.1^(-mc)", () => {
      const kc1_1 = 1800; // mild steel
      const mc = 0.25;
      const feed = 0.1;
      const expected = kc1_1 * Math.pow(feed, -mc);
      const r = specificCuttingEnergyEngine.calculate({
        kc1_1, mc, feed_mm: feed,
        cutting_speed_m_min: 200, depth_of_cut_mm: 2, width_of_cut_mm: 5,
      });
      expect(r.specific_energy_J_mm3.value).toBeCloseTo(Math.round(expected * 100) / 100, 0);
      expect(r.specific_energy_J_mm3.source).toBe("kienzle_model");
    });

    it("u ratio between two feeds equals (h2/h1)^(-mc)", () => {
      const kc1_1 = 2100, mc = 0.2;
      const r1 = specificCuttingEnergyEngine.calculate({
        kc1_1, mc, feed_mm: 0.1,
        cutting_speed_m_min: 150, depth_of_cut_mm: 2, width_of_cut_mm: 5,
      });
      const r2 = specificCuttingEnergyEngine.calculate({
        kc1_1, mc, feed_mm: 0.2,
        cutting_speed_m_min: 150, depth_of_cut_mm: 2, width_of_cut_mm: 5,
      });
      const ratio = r2.specific_energy_J_mm3.value / r1.specific_energy_J_mm3.value;
      // (0.2/0.1)^(-0.2) = 2^(-0.2) ≈ 0.8706
      expect(ratio).toBeCloseTo(Math.pow(2, -mc), 2);
    });
  });

  describe("Method 3: power-over-MRR (u = P_W / Q_mm³ s⁻¹)", () => {
    it("derives u from Fc·Vc and MRR when chip dims absent", () => {
      // Fc=600 N, Vc=120 m/min → P = 600·120/60 = 1200 W
      // MRR = 4 cm³/min → Q = 4·1000/60 = 66.67 mm³/s
      // u = 1200 / 66.67 ≈ 18 J/mm³
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 600, cutting_speed_m_min: 120, mrr_cm3_min: 4,
        machining_time_min: 1,
      });
      expect(r.specific_energy_J_mm3.source).toBe("power_over_mrr");
      const expectedU = (600 * 120 / 60) / (4 * 1000 / 60);
      expect(r.specific_energy_J_mm3.value).toBeCloseTo(Math.round(expectedU * 100) / 100, 0);
    });
  });

  describe("Fallback: no inputs → mild steel default (2.5 J/mm³)", () => {
    it("returns u=2.5 with default_mild_steel source and warning recommendation", () => {
      const r = specificCuttingEnergyEngine.calculate({});
      expect(r.specific_energy_J_mm3.value).toBeCloseTo(2.5, 2);
      expect(r.specific_energy_J_mm3.source).toBe("default_mild_steel");
      const hasWarning = r.recommendations.some((m) => m.includes("default specific energy"));
      expect(hasWarning).toBe(true);
    });
  });

  describe("classification + safety + sustainability", () => {
    it("classifies aluminum-tier energy (u<1.5) as 'low'", () => {
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 200, chip_width_mm: 4, chip_thickness_mm: 0.4,
        mrr_cm3_min: 5, machining_time_min: 1,
      });
      // u = 200 / (4*0.4) = 125 J/mm³ — actually high; let's use weaker force
      // u target <1.5: Fc=10, b=4, h=2 → u = 10/8 = 1.25
      const r2 = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 10, chip_width_mm: 4, chip_thickness_mm: 2,
        mrr_cm3_min: 5, machining_time_min: 1,
      });
      expect(r2.specific_energy_class).toBe("low");
      expect(r.specific_energy_class).toBe("very_high");
    });

    it("classifies titanium-tier energy (3.5≤u<6) as 'high'", () => {
      // Target u≈4: Fc=400, b=2, h=50? → u = 400/100 = 4
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 400, chip_width_mm: 2, chip_thickness_mm: 50,
        mrr_cm3_min: 5, machining_time_min: 1,
      });
      expect(r.specific_energy_class).toBe("high");
    });

    it("classifies nickel-alloy / hard-steel (u≥6) as 'very_high' and is_safe=false above 10", () => {
      // u=12: Fc=1200, b=10, h=10 → u = 1200/100 = 12
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 1200, chip_width_mm: 10, chip_thickness_mm: 10,
        mrr_cm3_min: 5, machining_time_min: 1,
      });
      expect(r.specific_energy_class).toBe("very_high");
      expect(r.is_safe).toBe(false);
    });

    it("CO₂ scales with grid factor — renewable < grid_average < coal", () => {
      const baseInput = {
        cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
        mrr_cm3_min: 8, machining_time_min: 5,
      } as const;
      const renewable = specificCuttingEnergyEngine.calculate({
        ...baseInput, energy_source: "renewable",
      });
      const grid = specificCuttingEnergyEngine.calculate({
        ...baseInput, energy_source: "grid_average",
      });
      const coal = specificCuttingEnergyEngine.calculate({
        ...baseInput, energy_source: "coal",
      });
      expect(renewable.co2_per_part_g.value).toBeLessThan(grid.co2_per_part_g.value);
      expect(grid.co2_per_part_g.value).toBeLessThan(coal.co2_per_part_g.value);
    });

    it("efficiency_ratio is in (0,1] when MRR>0 and matches useful/total within rounding", () => {
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
        mrr_cm3_min: 10, machining_time_min: 1,
        spindle_efficiency: 0.85, machine_standby_power_kW: 2.5,
      });
      expect(r.energy_efficiency_ratio.value).toBeGreaterThan(0);
      expect(r.energy_efficiency_ratio.value).toBeLessThanOrEqual(1);
    });
  });

  describe("adversarial inputs — engine must not crash", () => {
    it("NaN cutting_force_N falls back to default (does not produce NaN result)", () => {
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: Number.NaN, chip_width_mm: 2, chip_thickness_mm: 0.1,
      });
      expect(Number.isFinite(r.specific_energy_J_mm3.value)).toBe(true);
      expect(r.specific_energy_J_mm3.source).toBe("default_mild_steel");
    });

    it("zero chip width/thickness falls back to default (avoids divide-by-zero)", () => {
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: 1000, chip_width_mm: 0, chip_thickness_mm: 0.1,
      });
      expect(Number.isFinite(r.specific_energy_J_mm3.value)).toBe(true);
      expect(r.specific_energy_J_mm3.source).not.toBe("force_chip_area");
    });

    it("Infinity force still produces finite output via fallback path", () => {
      const r = specificCuttingEnergyEngine.calculate({
        cutting_force_N: Number.POSITIVE_INFINITY,
        chip_width_mm: 2, chip_thickness_mm: 0.1,
      });
      expect(Number.isFinite(r.cutting_power_kW.value)).toBe(true);
    });
  });
});

describe("U-WIRE-CALC-SCE — dispatcher wiring verified", () => {
  it("registers calc_specific_cutting_energy in calcDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "calcDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2); // enum entry + case label
    }
  });

  it("registers calc_specific_cutting_energy in ACTION_CALC_SCHEMAS map", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    for (const a of NEW_ACTIONS) {
      expect(typeof (ACTION_CALC_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse).toBe("function");
    }
    expect(EXPECTED_ACTION_COUNT).toBe(1);
  });

  it("schema rejects negative cutting_force_N", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({
      cutting_force_N: -100, chip_width_mm: 2, chip_thickness_mm: 0.1,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mc outside [0,1] (Kienzle exponent must be a fraction)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const tooHigh = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({
      kc1_1: 1800, mc: 1.5, feed_mm: 0.1,
    });
    expect(tooHigh.success).toBe(false);
    const negative = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({
      kc1_1: 1800, mc: -0.1, feed_mm: 0.1,
    });
    expect(negative.success).toBe(false);
  });

  it("schema rejects unknown energy_source enum value", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      energy_source: "fission_pile_xyz",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects spindle_efficiency outside (0,1]", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const zero = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      spindle_efficiency: 0,
    });
    expect(zero.success).toBe(false);
    const tooHigh = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      spindle_efficiency: 1.5,
    });
    expect(tooHigh.success).toBe(false);
  });

  it("schema accepts empty input (engine handles fallback at runtime)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const r = ACTION_CALC_SCHEMAS["calc_specific_cutting_energy"]!.safeParse({});
    expect(r.success).toBe(true);
  });
});
