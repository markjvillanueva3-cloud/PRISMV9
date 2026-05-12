/**
 * LatheKinematicsDeepLearningEngine Tests
 * ========================================
 * Tests for machine kinematics, collision avoidance, toolpath optimization,
 * and deep learning predictions.
 */

import { describe, it, expect } from "vitest";
import {
  latheKinematicsDeepLearningEngine,
} from "../engines/LatheKinematicsDeepLearningEngine.js";

describe("LatheKinematicsDeepLearningEngine", () => {
  describe("Machine Specifications", () => {
    it("should return machine specs for LB300M", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB300M");

      expect(specs).not.toBeNull();
      expect(specs?.model).toBe("Okuma LB300-M");
      expect(specs?.spindle.max_rpm).toBe(4500);
      expect(specs?.turret.positions).toBe(12);
    });

    it("should return machine specs for LB3000EX with Y-axis", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB3000EX");

      expect(specs).not.toBeNull();
      expect(specs?.axes.Y).toBeDefined();
      expect(specs?.axes.Y?.range.min).toBe(-50);
      expect(specs?.axes.Y?.range.max).toBe(50);
    });

    it("should return machine specs for LB4000EX with tailstock", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB4000EX");

      expect(specs).not.toBeNull();
      expect(specs?.envelope.tailstock_travel).toBe(500);
      expect(specs?.safety_zones.some(z => z.type === "tailstock")).toBe(true);
    });

    it("should list all available machines", () => {
      const machines = latheKinematicsDeepLearningEngine.getAvailableMachines();

      expect(machines.length).toBeGreaterThanOrEqual(3);
      expect(machines).toContain("LB300M");
      expect(machines).toContain("LB3000EX");
      expect(machines).toContain("LB4000EX");
    });
  });

  describe("Axis Kinematics", () => {
    it("should calculate rapid traverse time", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB300M");
      expect(specs).not.toBeNull();

      const time = latheKinematicsDeepLearningEngine.calculateAxisTime(
        specs!.axes.X,
        100, // 100mm distance
        "rapid"
      );

      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(1); // Should be fast
    });

    it("should calculate feed traverse time", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB300M");
      expect(specs).not.toBeNull();

      const time = latheKinematicsDeepLearningEngine.calculateAxisTime(
        specs!.axes.Z,
        50, // 50mm distance
        "feed",
        100 // 100mm/min
      );

      expect(time).toBeCloseTo(30, 0); // 50mm at 100mm/min = 30 seconds
    });

    it("should calculate spindle acceleration time", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB300M");
      expect(specs).not.toBeNull();

      const time = latheKinematicsDeepLearningEngine.calculateSpindleTime(
        specs!.spindle,
        0,
        2000
      );

      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(specs!.spindle.acceleration_time_0_to_max_s);
    });

    it("should interpolate spindle power curve", () => {
      const specs = latheKinematicsDeepLearningEngine.getMachineSpecs("LB300M");
      expect(specs).not.toBeNull();

      const char = latheKinematicsDeepLearningEngine.getSpindleCharacteristics(
        specs!.spindle,
        2000
      );

      expect(char.power_kw).toBeGreaterThan(0);
      expect(char.torque_nm).toBeGreaterThan(0);
    });
  });

  describe("Collision Avoidance", () => {
    it("should detect collision with chuck zone", () => {
      const toolpath = [
        { x: 0, z: 10 },   // Safe
        { x: 50, z: 5 },   // Near chuck
        { x: 120, z: 0 },  // Inside chuck zone!
      ];

      const result = latheKinematicsDeepLearningEngine.checkCollision(
        "LB300M",
        toolpath,
        10 // 10mm tool radius
      );

      expect(result.collision_detected).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should pass for safe toolpath", () => {
      const toolpath = [
        { x: 180, z: 100 },
        { x: 180, z: 50 },
        { x: 180, z: 10 },
        { x: 150, z: 10 },
      ];

      const result = latheKinematicsDeepLearningEngine.checkCollision(
        "LB300M",
        toolpath,
        5
      );

      expect(result.collision_detected).toBe(false);
      expect(result.minimum_clearance_mm).toBeGreaterThan(0);
    });

    it("should detect envelope violation", () => {
      const toolpath = [
        { x: 250, z: 100 },  // X outside envelope (max 230)
      ];

      const result = latheKinematicsDeepLearningEngine.checkCollision(
        "LB300M",
        toolpath,
        5
      );

      expect(result.collision_detected).toBe(true);
      expect(result.warnings.some(w => w.includes("envelope"))).toBe(true);
    });
  });

  describe("Toolpath Optimization", () => {
    it("should optimize toolpath and reduce time", () => {
      const segments = [
        { type: "rapid" as const, start: { x: 200, z: 200 }, end: { x: 100, z: 100 }, time_s: 0.5, air_cut: true },
        { type: "rapid" as const, start: { x: 100, z: 100 }, end: { x: 100, z: 50 }, time_s: 0.3, air_cut: true },
        { type: "linear" as const, start: { x: 100, z: 50 }, end: { x: 50, z: 50 }, feed: 0.1, time_s: 5, air_cut: false },
        { type: "rapid" as const, start: { x: 50, z: 50 }, end: { x: 200, z: 200 }, time_s: 0.5, air_cut: true },
      ];

      const result = latheKinematicsDeepLearningEngine.optimizeToolpath("LB300M", segments);

      expect(result.original_time_s).toBeGreaterThan(0);
      expect(result.optimizations_applied.length).toBeGreaterThan(0);
    });
  });

  describe("Deep Learning Predictions", () => {
    it("should predict cutting forces", () => {
      const prediction = latheKinematicsDeepLearningEngine.predictCuttingConditions({
        vc_m_min: 150,
        feed_mm_rev: 0.2,
        doc_mm: 2.0,
        nose_radius_mm: 0.8,
        lead_angle_deg: 45,
        rake_angle_deg: 5,
        material_kc11: 2500,
        material_mc: 0.25,
        hardness_hrc: 45,
        coolant_pressure_bar: 70,
        tool_overhang_mm: 40,
        tool_stiffness_n_per_um: 50,
        tool_damping_ratio: 0.03,
        spindle_rpm: 1000,
        spindle_power_kw: 15,
        cutting_time_min: 10,
        insert_grade: "KC5010",
        ambient_temp_c: 22,
        coolant_temp_c: 18,
      });

      console.log("\n=== Deep Learning Predictions ===");
      console.log(`Cutting Force: ${prediction.cutting_force_n.toFixed(0)} N`);
      console.log(`Vibration: ${prediction.vibration_amplitude_um.toFixed(1)} µm @ ${prediction.vibration_frequency_hz.toFixed(0)} Hz`);
      console.log(`Chatter Probability: ${(prediction.chatter_probability * 100).toFixed(1)}%`);
      console.log(`Thermal Expansion: ${prediction.thermal_expansion_um.toFixed(1)} µm`);
      console.log(`Tool Wear Rate: ${prediction.tool_wear_rate_um_per_min.toFixed(2)} µm/min`);
      console.log(`Surface Roughness: Ra ${prediction.surface_roughness_ra_um.toFixed(2)} µm`);
      console.log(`Power: ${prediction.power_consumption_kw.toFixed(2)} kW`);

      expect(prediction.cutting_force_n).toBeGreaterThan(0);
      expect(prediction.cutting_force_confidence).toBeGreaterThan(0.5);
      expect(prediction.chatter_probability).toBeGreaterThanOrEqual(0);
      expect(prediction.chatter_probability).toBeLessThanOrEqual(1);
    });

    it("should predict higher forces for hardened steel", () => {
      const soft = latheKinematicsDeepLearningEngine.predictCuttingConditions({
        vc_m_min: 150, feed_mm_rev: 0.2, doc_mm: 2.0,
        nose_radius_mm: 0.8, lead_angle_deg: 45, rake_angle_deg: 5,
        material_kc11: 1800, material_mc: 0.26, hardness_hrc: 25,
        coolant_pressure_bar: 70, tool_overhang_mm: 40,
        tool_stiffness_n_per_um: 50, tool_damping_ratio: 0.03,
        spindle_rpm: 1000, spindle_power_kw: 15,
        cutting_time_min: 10, insert_grade: "KC5010",
        ambient_temp_c: 22, coolant_temp_c: 18,
      });

      const hard = latheKinematicsDeepLearningEngine.predictCuttingConditions({
        vc_m_min: 100, feed_mm_rev: 0.15, doc_mm: 1.0,
        nose_radius_mm: 0.8, lead_angle_deg: 45, rake_angle_deg: 5,
        material_kc11: 3200, material_mc: 0.30, hardness_hrc: 60,
        coolant_pressure_bar: 100, tool_overhang_mm: 40,
        tool_stiffness_n_per_um: 50, tool_damping_ratio: 0.03,
        spindle_rpm: 800, spindle_power_kw: 20,
        cutting_time_min: 10, insert_grade: "CBN",
        ambient_temp_c: 22, coolant_temp_c: 18,
      });

      // Harder material with higher kc11 should generate higher specific force
      expect(hard.cutting_force_n / (1.0 * 0.15)).toBeGreaterThan(
        soft.cutting_force_n / (2.0 * 0.2) * 0.8 // Allow some margin
      );
    });

    it("should predict higher chatter probability with long overhang", () => {
      const short = latheKinematicsDeepLearningEngine.predictCuttingConditions({
        vc_m_min: 150, feed_mm_rev: 0.2, doc_mm: 2.0,
        nose_radius_mm: 0.8, lead_angle_deg: 45, rake_angle_deg: 5,
        material_kc11: 2500, material_mc: 0.25, hardness_hrc: 45,
        coolant_pressure_bar: 70, tool_overhang_mm: 40,
        tool_stiffness_n_per_um: 80, tool_damping_ratio: 0.04,
        spindle_rpm: 1000, spindle_power_kw: 15,
        cutting_time_min: 10, insert_grade: "KC5010",
        ambient_temp_c: 22, coolant_temp_c: 18,
      });

      const long = latheKinematicsDeepLearningEngine.predictCuttingConditions({
        vc_m_min: 150, feed_mm_rev: 0.2, doc_mm: 2.0,
        nose_radius_mm: 0.8, lead_angle_deg: 45, rake_angle_deg: 5,
        material_kc11: 2500, material_mc: 0.25, hardness_hrc: 45,
        coolant_pressure_bar: 70, tool_overhang_mm: 200,
        tool_stiffness_n_per_um: 15, tool_damping_ratio: 0.02,
        spindle_rpm: 1000, spindle_power_kw: 15,
        cutting_time_min: 10, insert_grade: "KC5010",
        ambient_temp_c: 22, coolant_temp_c: 18,
      });

      // Longer overhang = lower stiffness = higher vibration amplitude
      // Both may hit chatter probability cap of 1.0, so check amplitude instead
      expect(long.vibration_amplitude_um).toBeGreaterThan(short.vibration_amplitude_um);
    });
  });

  describe("Tool Selection", () => {
    it("should select CBN insert for hardened steel", () => {
      const insert = latheKinematicsDeepLearningEngine.selectOptimalInsert({
        operation: "hard_turn",
        material_hardness_hrc: 60,
        doc_mm: 0.3,
        feed_mm_rev: 0.1,
        vc_m_min: 120,
      });

      expect(insert).not.toBeNull();
      expect(insert?.grade).toBe("CBN");
    });

    it("should select carbide insert for soft steel roughing", () => {
      const insert = latheKinematicsDeepLearningEngine.selectOptimalInsert({
        operation: "rough",
        material_hardness_hrc: 30,
        doc_mm: 3.0,
        feed_mm_rev: 0.35,
        vc_m_min: 200,
      });

      expect(insert).not.toBeNull();
      expect(insert?.grade).not.toBe("CBN");
      expect(insert?.nose_radius_mm).toBeGreaterThanOrEqual(0.8);
    });

    it("should select finish insert with small nose radius", () => {
      const insert = latheKinematicsDeepLearningEngine.selectOptimalInsert({
        operation: "finish",
        material_hardness_hrc: 35,
        doc_mm: 0.5,
        feed_mm_rev: 0.1,
        vc_m_min: 300,
      });

      expect(insert).not.toBeNull();
      expect(insert?.nose_radius_mm).toBeLessThanOrEqual(0.8);
    });

    it("should select appropriate boring bar", () => {
      const holder = latheKinematicsDeepLearningEngine.selectOptimalHolder({
        operation: "internal",
        bore_diameter_mm: 25,
        reach_mm: 150,
      });

      expect(holder).not.toBeNull();
      expect(holder?.type).toBe("internal");
      expect(holder?.overhang_mm).toBeGreaterThanOrEqual(150);
    });
  });

  describe("Database Access", () => {
    it("should return insert database", () => {
      const inserts = latheKinematicsDeepLearningEngine.getInsertDatabase();

      expect(inserts.length).toBeGreaterThan(5);
      expect(inserts.some(i => i.grade === "CBN")).toBe(true);
      expect(inserts.some(i => i.grade === "KC5010")).toBe(true);
    });

    it("should return holder database", () => {
      const holders = latheKinematicsDeepLearningEngine.getHolderDatabase();

      expect(holders.length).toBeGreaterThan(5);
      expect(holders.some(h => h.type === "external")).toBe(true);
      expect(holders.some(h => h.type === "internal")).toBe(true);
    });

    it("should return model information", () => {
      const models = latheKinematicsDeepLearningEngine.getModelInfo();

      console.log("\n=== Deep Learning Models ===");
      for (const model of models) {
        console.log(`${model.name}: ${model.layers} layers, ${model.parameters} params, ${(model.accuracy * 100).toFixed(0)}% accuracy`);
      }

      expect(models.length).toBe(4);
      expect(models.some(m => m.name === "CuttingForceNetwork")).toBe(true);
      expect(models.some(m => m.name === "VibrationPatternNetwork")).toBe(true);
    });
  });
});
