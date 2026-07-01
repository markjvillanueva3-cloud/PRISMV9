/**
 * MCAT-MS0 U-MCAT12: Machine-Aware Speed/Feed Engine Tests
 */

import { describe, it, expect } from "vitest";
import {
  machineAwareSpeedFeedEngine,
  type SpeedFeedInput,
} from "../engines/MachineAwareSpeedFeedEngine.js";
import type { CanonicalMachinePackage } from "../types/MachinePackage.js";

// Mock Haas VF-2 machine package
const mockHaasVF2: CanonicalMachinePackage = {
  canonical_id: "haas-vf-2",
  source_record_ids: ["haas-vf-2-v1"],
  version: 1,
  manufacturer: "Haas",
  manufacturer_id: "haas",
  model: "VF-2",
  raw_type: "VMC",
  canonical_type: "VMC",
  topology: "3-axis",
  controller: {
    manufacturer: "Haas",
    model: "NGC",
    type: "Haas",
  },
  spindle: {
    max_rpm: 8100,
    min_rpm: 100,
    power: 22.4,
    base_rpm: 1750,
    torque: 122,
    taper: "CAT40",
  },
  envelope: {
    x_travel: 762,
    y_travel: 406,
    z_travel: 508,
  },
  axes: {
    linear_axes: 3,
    rotary_axes: 0,
    max_cutting_feed_mmmin: 16500,
    x_rapid: 25400,
  },
  controller_packages: [],
  spindle_packages: [],
  coolant_strategies: [],
  allowed_options: [],
  confidence: {
    controller: 0.9,
    spindle: 0.95,
    coolant: 0.5,
    envelope: 0.9,
    axes: 0.85,
    tool_changer: 0.8,
    overall: 0.85,
  },
  provenance: {},
  ambiguities: [],
  enrichment_history: [],
  primary_layer: "LEVEL5",
  generated_at: new Date().toISOString(),
} as any;

// Mock DMG MORI DMU 50 (5-axis)
const mockDMU50: CanonicalMachinePackage = {
  canonical_id: "dmg-dmu-50",
  source_record_ids: ["dmg-dmu-50-v1"],
  version: 1,
  manufacturer: "DMG MORI",
  manufacturer_id: "dmg-mori",
  model: "DMU 50",
  raw_type: "5-axis",
  canonical_type: "5AXIS",
  topology: "5-axis",
  controller: {
    manufacturer: "Siemens",
    model: "840D sl",
    type: "Siemens",
  },
  spindle: {
    max_rpm: 20000,
    min_rpm: 50,
    power: 35,
    base_rpm: 2500,
    torque: 130,
    taper: "HSK-A63",
  },
  envelope: {
    x_travel: 500,
    y_travel: 450,
    z_travel: 400,
  },
  axes: {
    linear_axes: 3,
    rotary_axes: 2,
    max_cutting_feed_mmmin: 30000,
    x_rapid: 42000,
  },
  controller_packages: [],
  spindle_packages: [],
  coolant_strategies: [],
  allowed_options: [],
  confidence: { overall: 0.9 },
  provenance: {},
  ambiguities: [],
  enrichment_history: [],
  primary_layer: "LEVEL5",
  generated_at: new Date().toISOString(),
} as any;

describe("MachineAwareSpeedFeedEngine — MCAT-MS0 U-MCAT12", () => {
  describe("extractConstraints", () => {
    it("extracts constraints from Haas VF-2", () => {
      const constraints = machineAwareSpeedFeedEngine.extractConstraints(mockHaasVF2);

      expect(constraints.maxRpm).toBe(8100);
      expect(constraints.minRpm).toBe(100);
      expect(constraints.maxPower).toBe(22.4);
      expect(constraints.maxTorque).toBe(122);
      expect(constraints.baseRpm).toBe(1750);
      expect(constraints.maxFeedRate).toBe(16500);
    });

    it("extracts constraints from DMU 50", () => {
      const constraints = machineAwareSpeedFeedEngine.extractConstraints(mockDMU50);

      expect(constraints.maxRpm).toBe(20000);
      expect(constraints.maxPower).toBe(35);
      expect(constraints.maxFeedRate).toBe(30000);
    });
  });

  describe("torqueAtRpm", () => {
    it("returns max torque in constant torque region", () => {
      const torque = machineAwareSpeedFeedEngine.torqueAtRpm(1500, 122, 1750);
      expect(torque).toBe(122);
    });

    it("reduces torque above base RPM", () => {
      // At 3500 RPM (2x base), torque should be halved
      const torque = machineAwareSpeedFeedEngine.torqueAtRpm(3500, 122, 1750);
      expect(torque).toBe(61);
    });

    it("calculates torque at 8100 RPM for Haas VF-2", () => {
      // T = 122 * (1750 / 8100) = 26.4 Nm
      const torque = machineAwareSpeedFeedEngine.torqueAtRpm(8100, 122, 1750);
      expect(torque).toBeCloseTo(26.4, 1);
    });
  });

  describe("constrain", () => {
    it("passes through values within limits", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 5000,
        feedRate: 2000,
        requiredPower: 10,
        requiredTorque: 50,
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      expect(result.constrained.rpm).toBe(5000);
      expect(result.constrained.feedRate).toBe(2000);
      expect(result.constraints.rpmLimited).toBe(false);
      expect(result.constraints.feedLimited).toBe(false);
    });

    it("clamps RPM to machine max", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 12000, // Exceeds 8100
        feedRate: 2000,
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      expect(result.constrained.rpm).toBe(8100);
      expect(result.constraints.rpmLimited).toBe(true);
      expect(result.constraints.limitingFactor).toBe("spindle_max_rpm");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("clamps feed rate to machine max", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 5000,
        feedRate: 25000, // Exceeds 16500
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      expect(result.constrained.feedRate).toBe(16500);
      expect(result.constraints.feedLimited).toBe(true);
    });

    it("flags power exceeding capacity", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 5000,
        feedRate: 5000,
        requiredPower: 30, // Exceeds 22.4 kW
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      expect(result.constraints.powerLimited).toBe(true);
      expect(result.safety.passed).toBe(false);
      expect(result.recommendations.some(r => r.includes("power"))).toBe(true);
    });

    it("flags torque exceeding availability at high RPM", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 8100,
        feedRate: 5000,
        requiredTorque: 50, // Available is only ~26 Nm at 8100 RPM
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      expect(result.constraints.torqueLimited).toBe(true);
      expect(result.safety.passed).toBe(false);
    });

    it("calculates headroom percentages", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 4050, // 50% of 8100
        feedRate: 8250, // 50% of 16500
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      expect(result.headroom.rpm).toBe(50);
      expect(result.headroom.feed).toBe(50);
    });

    it("recalculates feed per tooth when RPM limited", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 12000,
        feedPerTooth: 0.1,
        numberOfFlutes: 4,
        // feedRate = 0.1 * 4 * 12000 = 4800 mm/min
      };

      const result = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);

      // RPM clamped to 8100
      // New fpt = feedRate / (flutes * rpm) = 4800 / (4 * 8100) = 0.148
      expect(result.constrained.rpm).toBe(8100);
      expect(result.constrained.feedPerTooth).toBeCloseTo(0.148, 2);
    });
  });

  describe("willFit", () => {
    it("returns true for parameters within limits", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 5000,
        feedRate: 5000,
        requiredPower: 15,
        requiredTorque: 30,
      };

      expect(machineAwareSpeedFeedEngine.willFit(input, mockHaasVF2)).toBe(true);
    });

    it("returns false when RPM exceeds max", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 10000,
        feedRate: 5000,
      };

      expect(machineAwareSpeedFeedEngine.willFit(input, mockHaasVF2)).toBe(false);
    });

    it("returns false when power exceeds max", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 5000,
        requiredPower: 30,
      };

      expect(machineAwareSpeedFeedEngine.willFit(input, mockHaasVF2)).toBe(false);
    });
  });

  describe("optimalRpmForTorque", () => {
    it("returns base RPM when torque is achievable", () => {
      const result = machineAwareSpeedFeedEngine.optimalRpmForTorque(100, mockHaasVF2);

      expect(result.rpm).toBe(1750);
      expect(result.availableTorque).toBe(122);
      expect(result.inConstantTorqueRegion).toBe(true);
    });
  });

  describe("achievableMRR", () => {
    it("calculates power-limited MRR for steel", () => {
      const result = machineAwareSpeedFeedEngine.achievableMRR(
        mockHaasVF2,
        20, // 20mm tool
        5,  // 5mm DOC
        2000 // kc for steel
      );

      expect(result.maxMRR).toBeGreaterThan(0);
      expect(result.limitingFactor).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("returns higher MRR for more powerful machine", () => {
      const haasResult = machineAwareSpeedFeedEngine.achievableMRR(
        mockHaasVF2,
        20,
        5,
        2000
      );

      const dmuResult = machineAwareSpeedFeedEngine.achievableMRR(
        mockDMU50,
        20,
        5,
        2000
      );

      // DMU 50 has 35kW vs Haas 22.4kW
      expect(dmuResult.maxMRR).toBeGreaterThan(haasResult.maxMRR);
    });
  });

  describe("machine comparison", () => {
    it("shows DMU 50 has more capability than VF-2", () => {
      const input: SpeedFeedInput = {
        spindleRpm: 15000,
        feedRate: 20000,
        requiredPower: 25,
      };

      const haasResult = machineAwareSpeedFeedEngine.constrain(input, mockHaasVF2);
      const dmuResult = machineAwareSpeedFeedEngine.constrain(input, mockDMU50);

      // Haas limited on all fronts
      expect(haasResult.constraints.rpmLimited).toBe(true);
      expect(haasResult.constraints.feedLimited).toBe(true);
      expect(haasResult.constraints.powerLimited).toBe(true);

      // DMU 50 can handle it
      expect(dmuResult.constraints.rpmLimited).toBe(false);
      expect(dmuResult.constraints.feedLimited).toBe(false);
      expect(dmuResult.constraints.powerLimited).toBe(false);
    });
  });
});
