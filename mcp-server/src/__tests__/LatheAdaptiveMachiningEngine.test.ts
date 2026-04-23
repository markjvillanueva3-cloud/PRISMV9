/**
 * LatheAdaptiveMachiningEngine Tests
 *
 * Validates turning-specific adaptive intelligence.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheAdaptiveMachiningEngine,
  TurningEngagement,
} from "../engines/LatheAdaptiveMachiningEngine.js";

describe("LatheAdaptiveMachiningEngine", () => {
  describe("calculateTurningEngagement", () => {
    it("should calculate OD turning engagement", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });

      expect(engagement.operationType).toBe("od_turning");
      expect(engagement.currentDiameter).toBe(50);
      expect(engagement.rpm).toBeGreaterThan(0);
      expect(engagement.chipThickness).toBeGreaterThan(0);
      expect(engagement.chipWidth).toBeGreaterThan(0);
      expect(engagement.materialRemovalRate).toBeGreaterThan(0);
    });

    it("should calculate chip thickness from feed and lead angle", () => {
      // h = f * sin(κr)
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 90, // sin(90°) = 1
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });

      expect(engagement.chipThickness).toBeCloseTo(0.2, 2); // h ≈ f when κr = 90°
    });

    it("should calculate chip width from depth and lead angle", () => {
      // b = ap / sin(κr)
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 90,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });

      expect(engagement.chipWidth).toBeCloseTo(2, 2); // b ≈ ap when κr = 90°
    });

    it("should calculate correct RPM from cutting speed and diameter", () => {
      // RPM = (Vc * 1000) / (π * D)
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150, // m/min
      });

      const expectedRpm = (150 * 1000) / (Math.PI * 50);
      expect(engagement.rpm).toBeCloseTo(expectedRpm, 0);
    });

    it("should handle boring operation", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "id_boring",
        diameter: 30, // internal diameter
        depthOfCut: 1.5,
        feedPerRev: 0.15,
        leadAngle: 93,
        noseRadius: 0.4,
        cuttingSpeed: 120,
      });

      expect(engagement.operationType).toBe("id_boring");
      expect(engagement.rpm).toBeGreaterThan((150 * 1000) / (Math.PI * 50)); // higher RPM for smaller dia
    });
  });

  describe("calculateTurningForces", () => {
    it("should calculate forces using Kienzle model", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });

      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(
        engagement,
        1800, // kc1.1 for steel
        0.25  // mc
      );

      expect(forces.Fc).toBeGreaterThan(0);
      expect(Math.abs(forces.Ff)).toBeGreaterThan(0); // can be negative depending on lead angle
      expect(Math.abs(forces.Fp)).toBeGreaterThan(0); // can be negative depending on lead angle
      expect(forces.resultant).toBeGreaterThan(0);
    });

    it("should calculate power and torque", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });

      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      expect(forces.power).toBeGreaterThan(0);
      expect(forces.torque).toBeGreaterThan(0);
      // Power = Fc * Vc / 60000
      const expectedPower = (forces.Fc * 150) / 60000;
      expect(forces.power).toBeCloseTo(expectedPower, 1);
    });

    it("should apply wear factor", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });

      const forcesNew = latheAdaptiveMachiningEngine.calculateTurningForces(
        engagement, 1800, 0.25, { wearFactor: 1.0 }
      );
      const forcesWorn = latheAdaptiveMachiningEngine.calculateTurningForces(
        engagement, 1800, 0.25, { wearFactor: 1.3 }
      );

      expect(forcesWorn.Fc).toBeGreaterThan(forcesNew.Fc);
    });

    it("should return zero forces for zero chip area", () => {
      const engagement: TurningEngagement = {
        operationType: "od_turning",
        currentDiameter: 50,
        depthOfCut: 0,
        feedPerRev: 0,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
        rpm: 955,
        chipThickness: 0,
        chipWidth: 0,
        undeformedChipArea: 0,
        materialRemovalRate: 0,
      };

      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      expect(forces.Fc).toBe(0);
      expect(forces.power).toBe(0);
    });
  });

  describe("calculateTurningThermal", () => {
    it("should calculate thermal state during cutting", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const thermal = latheAdaptiveMachiningEngine.calculateTurningThermal(
        engagement, forces, "flood", 100, 50
      );

      expect(thermal.toolTemperature).toBeGreaterThan(100);
      expect(thermal.chipTemperature).toBeGreaterThan(thermal.toolTemperature);
      expect(thermal.partSurfaceTemperature).toBeGreaterThan(25);
    });

    it("should calculate diameter expansion", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const thermal = latheAdaptiveMachiningEngine.calculateTurningThermal(
        engagement, forces, "flood", 100, 50
      );

      expect(thermal.diameterExpansion).toBeGreaterThan(0);
      expect(thermal.lengthExpansion).toBeGreaterThan(0);
    });

    it("should show lower temps with better cooling", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const thermalDry = latheAdaptiveMachiningEngine.calculateTurningThermal(
        engagement, forces, "dry", 100, 50
      );
      const thermalHpc = latheAdaptiveMachiningEngine.calculateTurningThermal(
        engagement, forces, "hpc", 100, 50
      );

      expect(thermalHpc.toolTemperature).toBeLessThan(thermalDry.toolTemperature);
    });

    it("should sum heat partition to 100%", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const thermal = latheAdaptiveMachiningEngine.calculateTurningThermal(
        engagement, forces, "flood", 100, 50
      );

      const totalHeat = thermal.heatIntoChip + thermal.heatIntoPart + thermal.heatIntoTool;
      expect(totalHeat).toBeCloseTo(100, 0);
    });
  });

  describe("assessTurningVibration", () => {
    it("should assess stable conditions for supported part", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const vibration = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement,
        forces,
        { totalLength: 80, grippedLength: 30, minDiameter: 50, mass: 3 },
        { overhang: 25, shankSize: 20, isBoring: false },
        { tailstockEngaged: true, tailstockForce: 500, steadyRestPosition: null, steadyRestForce: 0 }
      );

      expect(vibration.chatterRisk).toBeLessThan(0.5);
      expect(vibration.dominantMode).not.toBe("chatter");
    });

    it("should detect high risk for slender unsupported part", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 20,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const vibration = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement,
        forces,
        { totalLength: 200, grippedLength: 30, minDiameter: 20, mass: 2 }, // L/D > 8
        { overhang: 30, shankSize: 20, isBoring: false },
        { tailstockEngaged: false, tailstockForce: 0, steadyRestPosition: null, steadyRestForce: 0 }
      );

      expect(vibration.ldRatio).toBeGreaterThan(6);
      expect(vibration.chatterRisk).toBeGreaterThan(0.3);
    });

    it("should reduce risk with tailstock support", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 30,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const vibWithoutSupport = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement, forces,
        { totalLength: 150, grippedLength: 30, minDiameter: 30, mass: 3 },
        { overhang: 30, shankSize: 20, isBoring: false },
        { tailstockEngaged: false, tailstockForce: 0, steadyRestPosition: null, steadyRestForce: 0 }
      );

      const vibWithSupport = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement, forces,
        { totalLength: 150, grippedLength: 30, minDiameter: 30, mass: 3 },
        { overhang: 30, shankSize: 20, isBoring: false },
        { tailstockEngaged: true, tailstockForce: 500, steadyRestPosition: null, steadyRestForce: 0 }
      );

      // With tailstock, effective length is reduced, improving stability
      expect(vibWithSupport.unsupportedLength).toBeLessThan(vibWithoutSupport.unsupportedLength);
    });

    it("should calculate natural frequency", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const vibration = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement, forces,
        { totalLength: 100, grippedLength: 30, minDiameter: 50, mass: 4 },
        { overhang: 30, shankSize: 20, isBoring: false },
        { tailstockEngaged: false, tailstockForce: 0, steadyRestPosition: null, steadyRestForce: 0 }
      );

      expect(vibration.partNaturalFrequency).toBeGreaterThan(0);
    });
  });

  describe("assessTurningWorkholding", () => {
    it("should calculate effective grip with centrifugal losses", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 200, // high speed
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const workholding = latheAdaptiveMachiningEngine.assessTurningWorkholding(
        { type: "3jaw_chuck", gripDiameter: 50, gripLength: 30, gripForce: 10000, jawType: "hard", jawMass: 0.5, numJaws: 3 },
        { mass: 3, maxDiameter: 50 },
        engagement.rpm,
        forces
      );

      expect(workholding.effectiveGrip).toBeLessThan(workholding.gripForce);
      expect(workholding.jawCentrifugalLoss).toBeGreaterThan(0);
    });

    it("should detect pull-out risk with insufficient clamping", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 4, // heavy cut
        feedPerRev: 0.3,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const workholding = latheAdaptiveMachiningEngine.assessTurningWorkholding(
        { type: "3jaw_chuck", gripDiameter: 50, gripLength: 20, gripForce: 2000, jawType: "hard", jawMass: 0.5, numJaws: 3 }, // weak grip
        { mass: 5, maxDiameter: 50 },
        engagement.rpm,
        forces
      );

      expect(workholding.pullOutRisk).toBeGreaterThan(0);
      expect(workholding.safetyFactor).toBeLessThan(2);
    });

    it("should calculate max safe RPM", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);

      const workholding = latheAdaptiveMachiningEngine.assessTurningWorkholding(
        { type: "3jaw_chuck", gripDiameter: 50, gripLength: 30, gripForce: 25000, jawType: "hard", jawMass: 0.5, numJaws: 3 },
        { mass: 3, maxDiameter: 50 },
        engagement.rpm,
        forces
      );

      // With strong grip, should have positive max safe RPM and good safety factor
      expect(workholding.maxSafeRpm).toBeGreaterThanOrEqual(0);
      expect(workholding.safetyFactor).toBeGreaterThan(0.5);
    });
  });

  describe("adaptTurningParameters", () => {
    it("should adapt feed for chip load control", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 50,
        depthOfCut: 2,
        feedPerRev: 0.1, // low feed
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);
      const thermal = latheAdaptiveMachiningEngine.calculateTurningThermal(engagement, forces, "flood", 100, 50);
      const vibration = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement, forces,
        { totalLength: 80, grippedLength: 30, minDiameter: 50, mass: 3 },
        { overhang: 25, shankSize: 20, isBoring: false },
        { tailstockEngaged: true, tailstockForce: 500, steadyRestPosition: null, steadyRestForce: 0 }
      );
      const workholding = latheAdaptiveMachiningEngine.assessTurningWorkholding(
        { type: "3jaw_chuck", gripDiameter: 50, gripLength: 30, gripForce: 10000, jawType: "hard", jawMass: 0.5, numJaws: 3 },
        { mass: 3, maxDiameter: 50 },
        engagement.rpm,
        forces
      );

      const result = latheAdaptiveMachiningEngine.adaptTurningParameters(
        engagement, forces, thermal, vibration, workholding,
        { targetChipThickness: 0.15 }
      );

      // Adaptation provides a feed adjustment
      expect(result.feedAdjustmentFactor).toBeGreaterThan(0);
      expect(result.feedAdjustmentFactor).toBeLessThanOrEqual(2);
      expect(result.adaptedFeed).toBeGreaterThan(0);
    });

    it("should reduce feed for vibration", () => {
      const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
        operationType: "od_turning",
        diameter: 30,
        depthOfCut: 2,
        feedPerRev: 0.2,
        leadAngle: 95,
        noseRadius: 0.8,
        cuttingSpeed: 150,
      });
      const forces = latheAdaptiveMachiningEngine.calculateTurningForces(engagement, 1800, 0.25);
      const thermal = latheAdaptiveMachiningEngine.calculateTurningThermal(engagement, forces, "flood", 100, 30);

      // Create high-vibration condition
      const highVibration = latheAdaptiveMachiningEngine.assessTurningVibration(
        engagement, forces,
        { totalLength: 200, grippedLength: 30, minDiameter: 20, mass: 2 }, // slender part
        { overhang: 50, shankSize: 16, isBoring: false },
        { tailstockEngaged: false, tailstockForce: 0, steadyRestPosition: null, steadyRestForce: 0 }
      );
      highVibration.chatterRisk = 0.6; // force high risk

      const workholding = latheAdaptiveMachiningEngine.assessTurningWorkholding(
        { type: "3jaw_chuck", gripDiameter: 30, gripLength: 30, gripForce: 10000, jawType: "hard", jawMass: 0.5, numJaws: 3 },
        { mass: 2, maxDiameter: 30 },
        engagement.rpm,
        forces
      );

      const result = latheAdaptiveMachiningEngine.adaptTurningParameters(
        engagement, forces, thermal, highVibration, workholding,
        { vibrationCompensation: true }
      );

      expect(result.feedAdjustmentFactor).toBeLessThan(1);
      expect(result.constraints.some(c => c.includes("vibration"))).toBe(true);
    });
  });

  describe("generateAdaptiveCSSProgram", () => {
    it("should generate CSS G-code", () => {
      const profile = {
        operationId: "op1",
        segments: [
          {
            startDiameter: 60,
            endDiameter: 50,
            engagement: {
              operationType: "od_turning" as const,
              currentDiameter: 55,
              depthOfCut: 2,
              feedPerRev: 0.2,
              leadAngle: 95,
              noseRadius: 0.8,
              cuttingSpeed: 150,
              rpm: 868,
              chipThickness: 0.199,
              chipWidth: 2.005,
              undeformedChipArea: 0.4,
              materialRemovalRate: 5000,
            },
            estimatedTime: 15,
            passNumber: 1,
          },
        ],
        diameterRange: { start: 60, end: 50 },
        cssMode: true,
        rpmRange: { min: 500, max: 3000 },
      };

      const gcode = latheAdaptiveMachiningEngine.generateAdaptiveCSSProgram(profile);

      expect(gcode.some(line => line.includes("G96"))).toBe(true);
      expect(gcode.some(line => line.includes("G50"))).toBe(true);
      expect(gcode.some(line => line.includes("PRISM"))).toBe(true);
    });
  });
});
