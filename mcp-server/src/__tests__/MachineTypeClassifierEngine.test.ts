/**
 * MachineTypeClassifierEngine Tests
 * @milestone LATHE-PROD-READY-MS0 U-LPR06
 */

import { describe, it, expect } from "vitest";
import {
  machineTypeClassifierEngine,
  type ClassificationInput,
  type CADFeatureSignature,
} from "../engines/MachineTypeClassifierEngine.js";

describe("MachineTypeClassifierEngine", () => {
  describe("classify", () => {
    it("should classify rotational part as lathe", () => {
      const input: ClassificationInput = {
        titleBlock: { title: "Drive Shaft Assembly" },
        cadFeatures: {
          turningFeatures: 8,
          millingFeatures: 1,
          drillingFeatures: 2,
          threadFeatures: 2,
          edmFeatures: 0,
          grindingFeatures: 0,
          primaryAxisOfSymmetry: "z_axis",
          maxAspectRatio: 3.5,
          hasInternalFeatures: false,
          hasBackworkFeatures: false,
          hasLiveToolFeatures: false,
        },
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("lathe");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should classify prismatic part as mill", () => {
      const input: ClassificationInput = {
        titleBlock: { title: "Mounting Bracket" },
        cadFeatures: {
          turningFeatures: 0,
          millingFeatures: 12,
          drillingFeatures: 8,
          threadFeatures: 0,
          edmFeatures: 0,
          grindingFeatures: 0,
          primaryAxisOfSymmetry: "none",
          maxAspectRatio: 1.2,
          hasInternalFeatures: true,
          hasBackworkFeatures: false,
          hasLiveToolFeatures: false,
        },
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("mill_3axis");
    });

    it("should classify high L/D with backwork as Swiss", () => {
      const input: ClassificationInput = {
        cadFeatures: {
          turningFeatures: 6,
          millingFeatures: 2,
          drillingFeatures: 3,
          threadFeatures: 2,
          edmFeatures: 0,
          grindingFeatures: 0,
          primaryAxisOfSymmetry: "z_axis",
          maxAspectRatio: 8.0,
          hasInternalFeatures: true,
          hasBackworkFeatures: true,
          hasLiveToolFeatures: true,
        },
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("swiss");
      expect(result.reasoning.join(" ")).toMatch(/Swiss|backwork|L\/D/i);
    });

    it("should classify hardened material as wire EDM", () => {
      const input: ClassificationInput = {
        titleBlock: { material: "D2 Tool Steel Hardened 60-62 HRC" },
        materialHardness_hrc: 61,
        partDescription: "Die insert blank for wire EDM finishing",
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("wire_edm");
    });

    it("should classify mixed features as mill-turn", () => {
      const input: ClassificationInput = {
        cadFeatures: {
          turningFeatures: 6,
          millingFeatures: 8,
          drillingFeatures: 4,
          threadFeatures: 1,
          edmFeatures: 0,
          grindingFeatures: 0,
          primaryAxisOfSymmetry: "z_axis",
          maxAspectRatio: 2.0,
          hasInternalFeatures: true,
          hasBackworkFeatures: false,
          hasLiveToolFeatures: true,
        },
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(["mill_turn", "lathe"]).toContain(result.primaryMachineType);
    });

    it("should classify based on GD&T symbols", () => {
      const input: ClassificationInput = {
        gdtFeatures: [
          { id: "g1", symbol: "concentricity", tolerance_value: 0.02, tolerance_unit: "mm", datum_references: ["A"], raw_text: "", confidence: 0.9 },
          { id: "g2", symbol: "circular_runout", tolerance_value: 0.01, tolerance_unit: "mm", datum_references: ["A"], raw_text: "", confidence: 0.9 },
          { id: "g3", symbol: "cylindricity", tolerance_value: 0.005, tolerance_unit: "mm", datum_references: [], raw_text: "", confidence: 0.9 },
        ],
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("lathe");
      expect(result.reasoning.join(" ")).toContain("turning");
    });

    it("should return low confidence with minimal input", () => {
      const result = machineTypeClassifierEngine.classify({});
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should classify grinding-required parts", () => {
      const input: ClassificationInput = {
        titleBlock: { finish: "Ra 0.1 μm mirror finish" },
        partDescription: "OD grinding required to final size",
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("grinder");
    });

    it("should classify 5-axis from complex GD&T", () => {
      const input: ClassificationInput = {
        gdtFeatures: [
          { id: "g1", symbol: "profile_surface", tolerance_value: 0.05, tolerance_unit: "mm", datum_references: ["A", "B", "C"], raw_text: "", confidence: 0.9 },
          { id: "g2", symbol: "position", tolerance_value: 0.02, tolerance_unit: "mm", datum_references: ["A", "B", "C", "D"], raw_text: "", confidence: 0.9 },
        ],
        cadFeatures: {
          turningFeatures: 0,
          millingFeatures: 15,
          drillingFeatures: 6,
          threadFeatures: 0,
          edmFeatures: 0,
          grindingFeatures: 0,
          primaryAxisOfSymmetry: "multi_axis",
          maxAspectRatio: 1.5,
          hasInternalFeatures: true,
          hasBackworkFeatures: false,
          hasLiveToolFeatures: false,
        },
      };
      const result = machineTypeClassifierEngine.classify(input);
      expect(result.primaryMachineType).toBe("mill_5axis");
    });
  });

  describe("quickClassify", () => {
    it("should classify shaft from description", () => {
      expect(machineTypeClassifierEngine.quickClassify("precision shaft")).toBe("lathe");
    });

    it("should classify EDM from description", () => {
      expect(machineTypeClassifierEngine.quickClassify("wire cut die blank")).toBe("wire_edm");
    });
  });

  describe("requiresMultiMachine", () => {
    it("should detect multi-machine requirement", () => {
      const input: ClassificationInput = {
        cadFeatures: {
          turningFeatures: 5,
          millingFeatures: 10,
          drillingFeatures: 5,
          threadFeatures: 2,
          edmFeatures: 3,
          grindingFeatures: 2,
          primaryAxisOfSymmetry: "z_axis",
          maxAspectRatio: 2.0,
          hasInternalFeatures: true,
          hasBackworkFeatures: true,
          hasLiveToolFeatures: true,
        },
        materialHardness_hrc: 55,
      };
      const result = machineTypeClassifierEngine.requiresMultiMachine(input);
      expect(result).toBe(true);
    });
  });
});
