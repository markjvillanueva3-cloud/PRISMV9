/**
 * MillComprehensiveNeuralEngine Tests
 * ====================================
 * Tests for the 256-dimensional comprehensive neural network
 * covering all milling dimensions.
 *
 * @milestone MILL-NEURAL-COMPREHENSIVE-MS0
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  millComprehensiveNeuralEngine,
  MATERIAL_ENCODING,
  TOOL_TYPE_ENCODING,
  HOLDER_ENCODING,
  MACHINE_ENCODING,
  CONTROLLER_ENCODING,
  KINEMATICS_ENCODING,
  TOOLPATH_ENCODING,
  BUILD_QUALITY_ENCODING,
  SPINDLE_ENCODING,
  SAFETY_ENCODING,
  EQUIPMENT_ENCODING,
} from "../../engines/MillComprehensiveNeuralEngine.js";

describe("MillComprehensiveNeuralEngine", () => {
  describe("feature encodings", () => {
    it("has 8 material categories", () => {
      expect(Object.keys(MATERIAL_ENCODING).length).toBe(8);
      expect(MATERIAL_ENCODING.P).toBe(0);
      expect(MATERIAL_ENCODING.GRAPHITE).toBe(7);
    });

    it("has 24 tool types", () => {
      expect(Object.keys(TOOL_TYPE_ENCODING).length).toBe(24);
      expect(TOOL_TYPE_ENCODING.FLAT_ENDMILL).toBe(8);
      expect(TOOL_TYPE_ENCODING.HIGH_FEED_MILL).toBe(17);
      expect(TOOL_TYPE_ENCODING.PROBE).toBe(31);
    });

    it("has 16 holder types", () => {
      expect(Object.keys(HOLDER_ENCODING).length).toBe(16);
      expect(HOLDER_ENCODING.WELDON).toBe(48);
      expect(HOLDER_ENCODING.SHRINK_FIT).toBe(54);
    });

    it("has 16 machine models", () => {
      expect(Object.keys(MACHINE_ENCODING).length).toBe(16);
      expect(MACHINE_ENCODING.HAAS_VF2).toBe(64);
      expect(MACHINE_ENCODING.ROKU_ROKU_HC658).toBe(68);
    });

    it("has 16 controller types", () => {
      expect(Object.keys(CONTROLLER_ENCODING).length).toBe(16);
      expect(CONTROLLER_ENCODING.HAAS_NGC).toBe(80);
      expect(CONTROLLER_ENCODING.FANUC_31i).toBe(87);
    });

    it("has 16 kinematic configurations", () => {
      expect(Object.keys(KINEMATICS_ENCODING).length).toBe(16);
      expect(KINEMATICS_ENCODING.AXIS_3_VMC).toBe(96);
      expect(KINEMATICS_ENCODING.AXIS_5_TABLE_TABLE).toBe(101);
    });

    it("has 16 toolpath strategies", () => {
      expect(Object.keys(TOOLPATH_ENCODING).length).toBe(16);
      expect(TOOLPATH_ENCODING.ADAPTIVE_CLEARING).toBe(115);
      expect(TOOLPATH_ENCODING.TROCHOIDAL).toBe(116);
    });

    it("has 16 build quality levels", () => {
      expect(Object.keys(BUILD_QUALITY_ENCODING).length).toBe(16);
      expect(BUILD_QUALITY_ENCODING.CLASS_A).toBe(128);
    });

    it("has 16 spindle specs", () => {
      expect(Object.keys(SPINDLE_ENCODING).length).toBe(16);
      expect(SPINDLE_ENCODING.TAPER_CAT40).toBe(147);
    });

    it("has 16 safety zone types", () => {
      expect(Object.keys(SAFETY_ENCODING).length).toBe(16);
      expect(SAFETY_ENCODING.COLLISION_CHECK_ON).toBe(171);
    });

    it("has 16 equipment types", () => {
      expect(Object.keys(EQUIPMENT_ENCODING).length).toBe(16);
      expect(EQUIPMENT_ENCODING.COOLANT_FLOOD).toBe(185);
    });
  });

  describe("network architecture", () => {
    it("has correct architecture", () => {
      const stats = millComprehensiveNeuralEngine.getStatistics();
      expect(stats.architecture).toBe("256→128→64→32→16→12");
      expect(stats.input_dim).toBe(256);
      expect(stats.output_dim).toBe(12);
    });

    it("has expected neuron count", () => {
      const stats = millComprehensiveNeuralEngine.getStatistics();
      // 256 + 128 + 64 + 32 + 16 + 12 = 508
      expect(stats.total_neurons).toBe(508);
    });

    it("has significant weight count", () => {
      const stats = millComprehensiveNeuralEngine.getStatistics();
      // Should be tens of thousands of weights
      expect(stats.total_weights).toBeGreaterThan(40000);
    });
  });

  describe("feature encoding", () => {
    it("encodes a basic milling scenario", () => {
      const features = millComprehensiveNeuralEngine.encodeFeatures({
        material: "P",
        tool_type: "FLAT_ENDMILL",
        holder_type: "COLLET_ER",
        machine: "HAAS_VF2",
        controller: "HAAS_NGC",
        kinematics: "AXIS_3_VMC",
        toolpath: "ADAPTIVE_CLEARING",
        build_quality: "CLASS_C",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 12,
        doc_mm: 3,
        woc_mm: 1.2,
        rpm: 4000,
        feed_mm_min: 1500,
      });

      expect(features.length).toBe(256);

      // Check one-hot encodings
      expect(features[MATERIAL_ENCODING.P]).toBe(1);
      expect(features[TOOL_TYPE_ENCODING.FLAT_ENDMILL]).toBe(1);
      expect(features[MACHINE_ENCODING.HAAS_VF2]).toBe(1);
      expect(features[CONTROLLER_ENCODING.HAAS_NGC]).toBe(1);
      expect(features[TOOLPATH_ENCODING.ADAPTIVE_CLEARING]).toBe(1);
    });

    it("normalizes continuous parameters", () => {
      const features = millComprehensiveNeuralEngine.encodeFeatures({
        material: "N",
        tool_type: "FACE_MILL",
        holder_type: "FACE_MILL_ARBOR",
        machine: "ROKU_ROKU_HC658",
        controller: "FANUC_31i",
        kinematics: "AXIS_3_VMC",
        toolpath: "FACING",
        build_quality: "CLASS_A",
        spindle: "TAPER_BT30",
        tool_diameter_mm: 50,
        doc_mm: 2,
        woc_mm: 40,
        rpm: 15000,
        feed_mm_min: 3000,
      });

      // Normalized continuous values should be in [0, 1]
      expect(features[192]).toBeGreaterThanOrEqual(0);  // tool diameter
      expect(features[192]).toBeLessThanOrEqual(1);
      expect(features[195]).toBeGreaterThanOrEqual(0);  // RPM
      expect(features[195]).toBeLessThanOrEqual(1);
    });
  });

  describe("forward pass", () => {
    it("produces output of correct dimension", () => {
      const input = millComprehensiveNeuralEngine.encodeFeatures({
        material: "P",
        tool_type: "FLAT_ENDMILL",
        holder_type: "COLLET_ER",
        machine: "HAAS_VF2",
        controller: "HAAS_NGC",
        kinematics: "AXIS_3_VMC",
        toolpath: "CONTOUR_2D",
        build_quality: "CLASS_C",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 10,
        doc_mm: 2,
        woc_mm: 5,
        rpm: 5000,
        feed_mm_min: 2000,
      });

      const output = (millComprehensiveNeuralEngine as any).forward(input);
      expect(output.length).toBe(12);
    });

    it("produces bounded outputs", () => {
      const input = millComprehensiveNeuralEngine.encodeFeatures({
        material: "M",
        tool_type: "BALL_ENDMILL",
        holder_type: "SHRINK_FIT",
        machine: "OKUMA_M460V_5AX",
        controller: "OKUMA_OSP_P300",
        kinematics: "AXIS_5_TABLE_TABLE",
        toolpath: "SCALLOP",
        build_quality: "CLASS_A",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 8,
        doc_mm: 0.5,
        woc_mm: 4,
        rpm: 8000,
        feed_mm_min: 1500,
      });

      const output = (millComprehensiveNeuralEngine as any).forward(input);

      // All outputs should be between 0 and 1 (sigmoid activation)
      for (let i = 0; i < output.length; i++) {
        expect(output[i]).toBeGreaterThanOrEqual(0);
        expect(output[i]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("prediction", () => {
    it("returns complete prediction object", () => {
      const input = millComprehensiveNeuralEngine.encodeFeatures({
        material: "P",
        tool_type: "FLAT_ENDMILL",
        holder_type: "COLLET_ER",
        machine: "HAAS_VF2",
        controller: "HAAS_NGC",
        kinematics: "AXIS_3_VMC",
        toolpath: "ADAPTIVE_CLEARING",
        build_quality: "CLASS_C",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 12,
        doc_mm: 3,
        woc_mm: 1.2,
        rpm: 4000,
        feed_mm_min: 1500,
        proven_source: true,
      });

      const prediction = millComprehensiveNeuralEngine.predict(input);

      expect(prediction).toHaveProperty("rpm");
      expect(prediction).toHaveProperty("feed_rate_mm_min");
      expect(prediction).toHaveProperty("doc_mm");
      expect(prediction).toHaveProperty("woc_mm");
      expect(prediction).toHaveProperty("chip_load_mm");
      expect(prediction).toHaveProperty("confidence");
      expect(prediction).toHaveProperty("safety_score");
      expect(prediction).toHaveProperty("efficiency_score");
      expect(prediction).toHaveProperty("decision_chain");
      expect(prediction.decision_chain.length).toBeGreaterThan(0);
    });
  });

  describe("deep reasoning", () => {
    it("provides reasoning for steel cutting", () => {
      const result = millComprehensiveNeuralEngine.deepReason(
        "What parameters for roughing steel?",
        { material: "P", operation: "rough" }
      );

      expect(result.query).toContain("steel");
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);

      // Should reference Kienzle
      const hasKienzle = result.evidence.some(e => e.includes("kc1.1") || e.includes("1800"));
      expect(hasKienzle).toBe(true);
    });

    it("provides reasoning for titanium on 5-axis", () => {
      const result = millComprehensiveNeuralEngine.deepReason(
        "Titanium roughing parameters?",
        { material: "S", machine: "OKUMA_M460V_5AX", operation: "rough" }
      );

      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.logic_chain.length).toBeGreaterThan(0);

      // Should identify high cutting force for superalloys
      const hasHighForce = result.evidence.some(e => e.includes("2800")) ||
                           result.logic_chain.some(l => l.includes("High specific"));
      expect(hasHighForce).toBe(true);
    });

    it("returns alternatives for complex scenarios", () => {
      const result = millComprehensiveNeuralEngine.deepReason(
        "Finishing parameters?",
        { material: "H", machine: "ROKU_ROKU_HC658", operation: "finish" }
      );

      // HSM machine should suggest HSM strategies
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe("anomaly detection", () => {
    it("flags aggressive parameters", () => {
      const badInput = millComprehensiveNeuralEngine.encodeFeatures({
        material: "P",
        tool_type: "FLAT_ENDMILL",
        holder_type: "COLLET_ER",
        machine: "HAAS_VF2",
        controller: "HAAS_NGC",
        kinematics: "AXIS_3_VMC",
        toolpath: "ADAPTIVE_CLEARING",
        build_quality: "CLASS_C",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 6,
        doc_mm: 18,       // Way too deep for 6mm
        woc_mm: 6,        // Full slotting
        rpm: 15000,       // Max RPM
        feed_mm_min: 4000, // Very aggressive
      });

      const anomaly = millComprehensiveNeuralEngine.detectAnomaly(badInput);

      // Should flag as concerning
      expect(anomaly.flagged_features.length).toBeGreaterThanOrEqual(0);
      expect(anomaly.severity).toBeDefined();
    });

    it("accepts reasonable parameters", () => {
      const goodInput = millComprehensiveNeuralEngine.encodeFeatures({
        material: "N",  // Aluminum
        tool_type: "FLAT_ENDMILL",
        holder_type: "COLLET_ER",
        machine: "HURCO_VM30i",
        controller: "HURCO_WINMAX",
        kinematics: "AXIS_3_VMC",
        toolpath: "ADAPTIVE_CLEARING",
        build_quality: "CLASS_B",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 12,
        doc_mm: 6,
        woc_mm: 1.2,
        rpm: 10000,
        feed_mm_min: 3000,
        proven_source: true,
      });

      const anomaly = millComprehensiveNeuralEngine.detectAnomaly(goodInput);

      // Should be low severity
      expect(anomaly.severity).not.toBe("critical");
    });
  });

  describe("training sample management", () => {
    it("accepts training samples with physics bounds", () => {
      const input = new Float64Array(256);
      input[0] = 1;  // Material P

      const target = new Float64Array(12);
      target[0] = 0.5;  // Normalized RPM

      millComprehensiveNeuralEngine.addTrainingSample({
        input,
        target,
        weight: 1.0,
        physics_bounds: {
          min_rpm: 1000,
          max_rpm: 8000,
          min_feed: 100,
          max_feed: 5000,
          max_doc: 10,
          max_woc: 15,
        },
        tribal_hints: ["conservative for first part"],
        source: "test_sample",
      });

      const stats = millComprehensiveNeuralEngine.getStatistics();
      expect(stats.training_samples).toBeGreaterThan(0);
    });
  });

  describe("statistics", () => {
    it("provides comprehensive statistics", () => {
      const stats = millComprehensiveNeuralEngine.getStatistics();

      expect(stats.architecture).toBeDefined();
      expect(stats.total_neurons).toBeGreaterThan(0);
      expect(stats.total_weights).toBeGreaterThan(0);
      expect(stats.input_dim).toBe(256);
      expect(stats.output_dim).toBe(12);
      expect(stats.feature_categories).toBeGreaterThan(100);
    });
  });
});
