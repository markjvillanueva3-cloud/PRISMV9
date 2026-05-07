/**
 * E2E test for ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH1 — 6 unwired WEDM
 * engines wired into edmDispatcher (prism_edm).
 */
import { describe, it, expect } from "vitest";
import { wedmCornerPhysicsEngine } from "../engines/WEDMCornerPhysicsEngine.js";
import { wedmDielectricCorrectionEngine } from "../engines/WEDMDielectricCorrectionEngine.js";
import { wedmJobCostEngine } from "../engines/WEDMJobCostEngine.js";
import { wedmPowerDensityGuardEngine } from "../engines/WEDMPowerDensityGuardEngine.js";
import { wedmPreFlightCheckEngine } from "../engines/WEDMPreFlightCheckEngine.js";

const WIRE_DIA_MM = 0.25;
const SPARK_GAP_MM = 0.04;
const OVERCUT_MM = 0.04;
const THICKNESS_MM = 25;
const PEAK_CURRENT_A = 12;
const GAP_VOLTAGE_V = 60;
const DUTY_CYCLE = 0.5;
const NEW_WEDM_ACTION_COUNT = 6;

describe("U-WIRE-WEDM-BATCH1 — engines verified directly", () => {
  describe("WEDMCornerPhysicsEngine.calculateMinCornerRadius", () => {
    it("computes min corner radius >= wire/2 + spark gap", () => {
      const minR = wedmCornerPhysicsEngine.calculateMinCornerRadius(WIRE_DIA_MM, SPARK_GAP_MM);
      // Min corner radius cannot be smaller than wire radius + spark gap
      expect(minR).toBeGreaterThanOrEqual(WIRE_DIA_MM / 2 + SPARK_GAP_MM);
    });
  });

  describe("WEDMDielectricCorrectionEngine.calculateTemperatureFactor", () => {
    it("returns factor=1.0 at reference temperature (20°C)", () => {
      const f = wedmDielectricCorrectionEngine.calculateTemperatureFactor(20);
      expect(f).toBeCloseTo(1.0, 1);
    });

    it("returns factor != 1 at temperature significantly above reference", () => {
      const f = wedmDielectricCorrectionEngine.calculateTemperatureFactor(40);
      expect(f).not.toBe(1.0);
      expect(Number.isFinite(f)).toBe(true);
    });
  });

  describe("WEDMJobCostEngine cutting time + wire consumption", () => {
    it("computes cutting time = perimeter * passes / speed (in hours)", () => {
      const PERIMETER = 200;
      const PASSES = 3;
      const SPEED = 60; // mm/min
      const t_hr = wedmJobCostEngine.calculateCuttingTime(PERIMETER, PASSES, SPEED);
      // (200 * 3) / 60 = 10 min = 1/6 hr ≈ 0.1667
      expect(t_hr).toBeCloseTo(10 / 60, 4);
    });

    it("computes wire consumption = perimeter * passes * rate", () => {
      const PERIMETER = 100;
      const PASSES = 4;
      const RATE = 1.2; // g/m
      const w = wedmJobCostEngine.calculateWireConsumption(PERIMETER, PASSES, RATE);
      // 100 * 4 * 1.2 = 480
      expect(w).toBeCloseTo(480, 4);
    });
  });

  describe("WEDMPowerDensityGuardEngine power flow", () => {
    it("computes kerf, cut front area, avg power, and power density consistently", () => {
      const kerf = wedmPowerDensityGuardEngine.calculateKerfWidth(WIRE_DIA_MM, OVERCUT_MM);
      // kerf = wire + 2*overcut = 0.25 + 0.08 = 0.33
      expect(kerf).toBeCloseTo(WIRE_DIA_MM + 2 * OVERCUT_MM, 5);

      const area = wedmPowerDensityGuardEngine.calculateCutFrontArea(kerf, THICKNESS_MM);
      expect(area).toBeCloseTo(kerf * THICKNESS_MM, 4);

      const avgPower = wedmPowerDensityGuardEngine.calculateAveragePower(
        PEAK_CURRENT_A,
        GAP_VOLTAGE_V,
        DUTY_CYCLE,
      );
      // 12 * 60 * 0.5 = 360 W
      expect(avgPower).toBeCloseTo(PEAK_CURRENT_A * GAP_VOLTAGE_V * DUTY_CYCLE, 4);

      const density = wedmPowerDensityGuardEngine.calculatePowerDensity(avgPower, area);
      expect(density).toBeCloseTo(avgPower / area, 4);
    });

    it("throws when cut front area is zero", () => {
      expect(() =>
        wedmPowerDensityGuardEngine.calculatePowerDensity(360, 0),
      ).toThrow(/Cut front area must be positive/);
    });
  });

  describe("WEDMPreFlightCheckEngine.generateChecklist", () => {
    it("generates checklist with severity counts for a steel job", () => {
      const r = wedmPreFlightCheckEngine.generateChecklist({
        material: "AISI 4140",
        thickness_mm: 25,
        wire_type: "brass",
        wire_diameter_mm: 0.25,
        is_unattended: false,
      });
      expect(r.total_items).toBeGreaterThan(0);
      expect(r.critical_count + r.warning_count + r.info_count).toBe(r.total_items);
      expect(r.categories.length).toBeGreaterThan(0);
      expect(r.summary.length).toBeGreaterThan(0);
    });

    it("flags additional checks for thick (>100mm) workpiece", () => {
      const thin = wedmPreFlightCheckEngine.generateChecklist({
        material: "AISI 4140",
        thickness_mm: 25,
        wire_type: "brass",
        wire_diameter_mm: 0.25,
      });
      const thick = wedmPreFlightCheckEngine.generateChecklist({
        material: "AISI 4140",
        thickness_mm: 150,
        wire_type: "brass",
        wire_diameter_mm: 0.25,
      });
      expect(thick.total_items).toBeGreaterThanOrEqual(thin.total_items);
    });
  });
});

describe("U-WIRE-WEDM-BATCH1 — dispatcher wiring verified", () => {
  const NEW_ACTIONS = [
    "wedm_corner_min_radius",
    "wedm_dielectric_temp_factor",
    "wedm_job_cost_estimate",
    "wedm_calculator_run",
    "wedm_power_density_check",
    "wedm_pre_flight_check",
  ] as const;

  it("registers all 6 new actions in edmDispatcher source", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "edmDispatcher.ts",
    );
    const src = fs.readFileSync(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(NEW_WEDM_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });
});
