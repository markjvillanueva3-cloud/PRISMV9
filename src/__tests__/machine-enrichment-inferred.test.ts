import { describe, it, expect } from "vitest";
import {
  inferTorqueCurve, inferTableLoad, inferAccuracy,
  inferCollisionZones, inferWeight, enrichMachine,
} from "../data/machine-enrichment-inferred.js";

describe("Machine Enrichment Inference", () => {
  describe("inferTorqueCurve", () => {
    it("T = P×9549/RPM at base speed", () => {
      const curve = inferTorqueCurve(22, 12000, "BT40");
      // BT40 ratio=0.50, base=6000. T=22*9549/6000=35.0Nm
      expect(curve.base_rpm).toBe(6000);
      expect(curve.max_torque_Nm).toBeCloseTo(35.0, 0);
      expect(curve.points).toHaveLength(5);
    });

    it("torque decreases above base RPM (constant power)", () => {
      const curve = inferTorqueCurve(15, 10000, "BT40");
      const atBase = curve.points.find(p => p.rpm === curve.base_rpm)!;
      const atMax = curve.points.find(p => p.rpm === curve.max_rpm)!;
      expect(atMax.torque_Nm).toBeLessThan(atBase.torque_Nm);
    });

    it("BT50 has lower base RPM ratio than BT30", () => {
      const bt50 = inferTorqueCurve(30, 8000, "BT50");
      const bt30 = inferTorqueCurve(30, 20000, "BT30");
      expect(bt50.base_rpm / bt50.max_rpm).toBeLessThan(bt30.base_rpm / bt30.max_rpm);
    });

    it("power invariant: T×RPM = constant above base", () => {
      const curve = inferTorqueCurve(22, 12000, "BT40");
      const p1 = curve.points[3];
      const p2 = curve.points[4];
      const power1 = p1.torque_Nm * p1.rpm / 9549;
      const power2 = p2.torque_Nm * p2.rpm / 9549;
      expect(power1).toBeCloseTo(power2, 0);
    });
  });

  describe("inferTableLoad", () => {
    it("VMC gets reasonable load", () => {
      const load = inferTableLoad("VMC", 1000, 500, "BT40");
      expect(load).toBeGreaterThan(200);
      expect(load).toBeLessThan(2000);
    });

    it("HMC gets higher load than VMC", () => {
      const vmc = inferTableLoad("VMC", 800, 400, "BT40");
      const hmc = inferTableLoad("HMC", 800, 400, "BT40");
      expect(hmc).toBeGreaterThan(vmc);
    });

    it("BT50 gets higher load than BT30", () => {
      const bt30 = inferTableLoad("VMC", 600, 400, "BT30");
      const bt50 = inferTableLoad("VMC", 600, 400, "BT50");
      expect(bt50).toBeGreaterThan(bt30);
    });
  });

  describe("inferAccuracy", () => {
    it("Kern gets ultra-precision accuracy", () => {
      const acc = inferAccuracy("5-axis", "Kern Micro");
      expect(acc.positioning_mm).toBeLessThanOrEqual(0.002);
      expect(acc.repeatability_mm).toBeLessThanOrEqual(0.001);
    });

    it("generic VMC gets standard accuracy", () => {
      const acc = inferAccuracy("VMC", "Generic");
      expect(acc.positioning_mm).toBe(0.005);
      expect(acc.repeatability_mm).toBe(0.003);
    });

    it("positioning always > repeatability", () => {
      for (const type of ["VMC", "HMC", "5-axis", "lathe"]) {
        const acc = inferAccuracy(type, "Generic");
        expect(acc.positioning_mm).toBeGreaterThan(acc.repeatability_mm);
      }
    });
  });

  describe("inferCollisionZones", () => {
    it("VMC gets spindle + column + ATC zones", () => {
      const zones = inferCollisionZones("VMC", { x: 500, y: 400, z: 300 });
      expect(zones.length).toBeGreaterThanOrEqual(3);
      expect(zones.some(z => z.id === "spindle_nose")).toBe(true);
      expect(zones.some(z => z.id === "column")).toBe(true);
      expect(zones.some(z => z.id === "tool_changer")).toBe(true);
    });

    it("lathe gets tailstock + chuck zones", () => {
      const zones = inferCollisionZones("CNC Lathe", { x: 300, y: 200, z: 200 });
      expect(zones.some(z => z.id === "tailstock")).toBe(true);
      expect(zones.some(z => z.id === "chuck")).toBe(true);
    });

    it("HMC gets pallet changer zone", () => {
      const zones = inferCollisionZones("HMC", { x: 600, y: 600, z: 500 });
      expect(zones.some(z => z.id === "pallet_changer")).toBe(true);
    });
  });

  describe("inferWeight", () => {
    it("bigger machine = heavier", () => {
      const small = inferWeight("VMC", { x: 300, y: 200, z: 200 });
      const big = inferWeight("VMC", { x: 1000, y: 600, z: 500 });
      expect(big).toBeGreaterThan(small);
    });

    it("weight is clamped to reasonable range", () => {
      const tiny = inferWeight("VMC", { x: 50, y: 50, z: 50 });
      const huge = inferWeight("gantry", { x: 10000, y: 5000, z: 3000 });
      expect(tiny).toBeGreaterThanOrEqual(500);
      expect(huge).toBeLessThanOrEqual(100000);
    });
  });

  describe("enrichMachine (master)", () => {
    it("fills all gaps for a machine with missing data", () => {
      const result = enrichMachine({
        power_kw: 22, max_rpm: 12000, taper: "BT40",
        machine_type: "VMC", manufacturer: "Haas",
        work_volume: { x: 762, y: 406, z: 508 },
      });
      expect(result.torque_curve).toBeDefined();
      expect(result.torque_curve!.max_torque_Nm).toBeGreaterThan(0);
      expect(result.table_max_load_kg).toBeGreaterThan(0);
      expect(result.positioning_accuracy_mm).toBeGreaterThan(0);
      expect(result.collision_zones!.length).toBeGreaterThanOrEqual(3);
      expect(result.weight_kg).toBeGreaterThan(0);
    });

    it("does not override existing data", () => {
      const result = enrichMachine({
        power_kw: 22, max_rpm: 12000,
        machine_type: "VMC",
        table_max_load_kg: 1500,
        positioning_accuracy_mm: 0.003,
        repeatability_mm: 0.002,
        weight_kg: 8000,
        has_collision_zones: true,
      });
      expect(result.table_max_load_kg).toBeUndefined();
      expect(result.positioning_accuracy_mm).toBeUndefined();
      expect(result.collision_zones).toBeUndefined();
      expect(result.weight_kg).toBeUndefined();
      // Torque curve always generated (adds value)
      expect(result.torque_curve).toBeDefined();
    });
  });
});
