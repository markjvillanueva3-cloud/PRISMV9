/**
 * PostProcessorMachineKinematicsEngine Tests
 * ============================================
 * Tests for comprehensive machine engineering knowledge engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  postProcessorMachineKinematicsEngine,
  KINEMATIC_TOPOLOGIES,
  WAY_TYPES,
  BUILD_QUALITY_TIERS,
  REPRESENTATIVE_MACHINES,
  type MachineKinematicProfile
} from "../engines/PostProcessorMachineKinematicsEngine.js";

describe("PostProcessorMachineKinematicsEngine", () => {
  beforeEach(() => {
    postProcessorMachineKinematicsEngine.clearRuntimeMachines();
  });

  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorMachineKinematicsEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.topologies).toBeGreaterThan(15);
      expect(stats.wayTypes).toBe(5);
      expect(stats.buildQualityTiers).toBe(5);
      expect(stats.representativeMachines).toBeGreaterThan(8);
    });

    it("should track covered brands", () => {
      const stats = postProcessorMachineKinematicsEngine.getStatistics();

      expect(stats.coveredBrands.length).toBeGreaterThan(5);
      expect(stats.coveredBrands).toContain("Haas");
      expect(stats.coveredBrands).toContain("Okuma");
    });
  });

  describe("Kinematic Topologies", () => {
    it("should have 3-axis topologies", () => {
      const three = postProcessorMachineKinematicsEngine.getTopologiesByAxes(3);
      expect(three.length).toBeGreaterThan(2);
    });

    it("should have 5-axis topologies", () => {
      const five = postProcessorMachineKinematicsEngine.getTopologiesByAxes(5);
      expect(five.length).toBeGreaterThan(3);
    });

    it("should include trunnion 5-axis", () => {
      const trunnion = postProcessorMachineKinematicsEngine.getTopology("5ax-trunnion");
      expect(trunnion).toBeDefined();
      expect(trunnion?.axes).toBe(5);
    });

    it("should include swivel head 5-axis", () => {
      const swivel = postProcessorMachineKinematicsEngine.getTopology("5ax-swivel-head");
      expect(swivel).toBeDefined();
    });

    it("should include lathe topologies", () => {
      const lathes = postProcessorMachineKinematicsEngine.getTopologiesByCategory("lathe");
      expect(lathes.length).toBeGreaterThan(2);
    });

    it("should include Swiss-type", () => {
      const swiss = postProcessorMachineKinematicsEngine.getTopology("lathe-swiss");
      expect(swiss).toBeDefined();
      expect(swiss?.typicalBrands).toContain("Citizen");
    });

    it("should include mill-turn", () => {
      const millTurn = postProcessorMachineKinematicsEngine.getTopology("millturn-b-axis");
      expect(millTurn).toBeDefined();
    });

    it("should include wire EDM", () => {
      const wedm = postProcessorMachineKinematicsEngine.getTopologiesByCategory("wire-edm");
      expect(wedm.length).toBeGreaterThan(0);
    });

    it("should include grinders", () => {
      const grinders = postProcessorMachineKinematicsEngine.getTopologiesByCategory("grinder");
      expect(grinders.length).toBeGreaterThan(1);
    });

    it("should include gantry portal", () => {
      const gantry = postProcessorMachineKinematicsEngine.getTopology("gantry-portal");
      expect(gantry).toBeDefined();
    });

    it("should have kinematic chain for each topology", () => {
      for (const t of KINEMATIC_TOPOLOGIES) {
        expect(t.chain.length).toBeGreaterThan(0);
        expect(t.typicalBrands.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Way Types", () => {
    it("should have all 5 way types", () => {
      expect(WAY_TYPES.length).toBe(5);
    });

    it("should have box ways", () => {
      const box = postProcessorMachineKinematicsEngine.getWayType("box-way");
      expect(box).toBeDefined();
      expect(box?.rigidity).toBe("highest");
    });

    it("should have linear rolling guides", () => {
      const linear = postProcessorMachineKinematicsEngine.getWayType("linear-rolling");
      expect(linear).toBeDefined();
      expect(linear?.speed_limit_m_min).toBeGreaterThan(50);
    });

    it("should have hydrostatic ways", () => {
      const hydro = postProcessorMachineKinematicsEngine.getWayType("hydrostatic");
      expect(hydro).toBeDefined();
      expect(hydro?.dampening).toContain("superior");
    });

    it("should have air bearings", () => {
      const air = postProcessorMachineKinematicsEngine.getWayType("air-bearing");
      expect(air).toBeDefined();
      expect(air?.heavy_cut_capable).toBe(false);
    });

    it("should have linear motors", () => {
      const lm = postProcessorMachineKinematicsEngine.getWayType("linear-motor");
      expect(lm).toBeDefined();
      expect(lm?.acceleration_g).toBeGreaterThanOrEqual(2);
    });

    it("should recommend way type for heavy cutting", () => {
      const recs = postProcessorMachineKinematicsEngine.recommendWayType({
        heavyCut: true,
        highSpeed: false,
        precision: "standard"
      });

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].heavy_cut_capable).toBe(true);
    });

    it("should recommend way type for high-speed", () => {
      const recs = postProcessorMachineKinematicsEngine.recommendWayType({
        heavyCut: false,
        highSpeed: true,
        precision: "precision"
      });

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].speed_limit_m_min).toBeGreaterThanOrEqual(50);
    });

    it("should recommend air/hydrostatic for ultra precision", () => {
      const recs = postProcessorMachineKinematicsEngine.recommendWayType({
        heavyCut: false,
        highSpeed: false,
        precision: "ultra"
      });

      expect(recs.length).toBeGreaterThan(0);
      expect(["air-bearing", "hydrostatic"]).toContain(recs[0].id);
    });
  });

  describe("Build Quality Tiers", () => {
    it("should have all 5 tiers", () => {
      expect(BUILD_QUALITY_TIERS.length).toBe(5);
    });

    it("should have production tier", () => {
      const prod = postProcessorMachineKinematicsEngine.getBuildQualityTier("production");
      expect(prod).toBeDefined();
      expect(prod?.positioning_accuracy_mm).toBeGreaterThan(0.01);
    });

    it("should have precision tier", () => {
      const prec = postProcessorMachineKinematicsEngine.getBuildQualityTier("precision");
      expect(prec).toBeDefined();
      expect(prec?.positioning_accuracy_mm).toBeLessThan(0.01);
    });

    it("should have ultra-precision tier", () => {
      const ultra = postProcessorMachineKinematicsEngine.getBuildQualityTier("ultra-precision");
      expect(ultra).toBeDefined();
      expect(ultra?.positioning_accuracy_mm).toBeLessThan(0.001);
    });

    it("should have metrology-grade tier", () => {
      const met = postProcessorMachineKinematicsEngine.getBuildQualityTier("metrology-grade");
      expect(met).toBeDefined();
      expect(met?.positioning_accuracy_mm).toBeLessThan(0.0005);
    });

    it("should recommend tier for coarse tolerance", () => {
      const tier = postProcessorMachineKinematicsEngine.recommendBuildQualityTier(0.05);
      expect(tier).toBeDefined();
      expect(tier.positioning_accuracy_mm).toBeLessThanOrEqual(0.05 / 3);
    });

    it("should recommend tier for tight tolerance", () => {
      const tier = postProcessorMachineKinematicsEngine.recommendBuildQualityTier(0.001);
      expect(["high-precision", "ultra-precision", "metrology-grade"]).toContain(tier.tier);
    });

    it("should have accuracy progression across tiers", () => {
      for (let i = 1; i < BUILD_QUALITY_TIERS.length; i++) {
        expect(BUILD_QUALITY_TIERS[i].positioning_accuracy_mm).toBeLessThan(
          BUILD_QUALITY_TIERS[i - 1].positioning_accuracy_mm
        );
      }
    });
  });

  describe("Representative Machines", () => {
    it("should have Haas VF-2 profile", () => {
      const haas = postProcessorMachineKinematicsEngine.getMachineProfile("haas-vf2");
      expect(haas).toBeDefined();
      expect(haas?.brand).toBe("Haas");
      expect(haas?.travels.X_mm).toBe(762);
    });

    it("should have Okuma M460V-5AX profile", () => {
      const okuma = postProcessorMachineKinematicsEngine.getMachineProfile("okuma-m460v-5ax");
      expect(okuma).toBeDefined();
      expect(okuma?.travels.A_deg).not.toBeNull();
      expect(okuma?.travels.C_deg).not.toBeNull();
    });

    it("should have Roku-Roku HC-658 profile", () => {
      const rokuRoku = postProcessorMachineKinematicsEngine.getMachineProfile("roku-roku-hc658");
      expect(rokuRoku).toBeDefined();
      expect(rokuRoku?.buildQualityTier).toBe("ultra-precision");
    });

    it("should have Zimmermann portal for large format", () => {
      const zim = postProcessorMachineKinematicsEngine.getMachineProfile("zimmermann-fz37");
      expect(zim).toBeDefined();
      expect(zim?.travels.X_mm).toBeGreaterThan(3000);
    });

    it("should have Swiss-type", () => {
      const swiss = postProcessorMachineKinematicsEngine.getMachineProfile("citizen-cincom-l20");
      expect(swiss).toBeDefined();
    });

    it("should have Wire EDM", () => {
      const wedm = postProcessorMachineKinematicsEngine.getMachineProfile("mitsubishi-mv1200");
      expect(wedm).toBeDefined();
      expect(wedm?.travels.U_mm).toBeDefined();
    });

    it("should have complete data for all representative machines", () => {
      for (const m of REPRESENTATIVE_MACHINES) {
        expect(m.travels.X_mm).toBeGreaterThanOrEqual(0);
        expect(m.accuracy.positioning_mm).toBeGreaterThan(0);
        expect(m.accelerations.rapidRate_m_min).toBeGreaterThan(0);
        expect(m.collisionEnvelope.toolChangeZone).toBeDefined();
      }
    });
  });

  describe("Machine Search", () => {
    it("should find machines by brand", () => {
      const okumaMachines = postProcessorMachineKinematicsEngine.findMachines({ brand: "Okuma" });
      expect(okumaMachines.length).toBeGreaterThan(0);
    });

    it("should find 5-axis machines", () => {
      const fiveAxis = postProcessorMachineKinematicsEngine.findMachines({ axes: 5 });
      expect(fiveAxis.length).toBeGreaterThan(0);
    });

    it("should find machines by travel range", () => {
      const large = postProcessorMachineKinematicsEngine.findMachines({ minTravelX_mm: 1000 });
      expect(large.length).toBeGreaterThan(0);
    });

    it("should find high-speed machines", () => {
      const hsm = postProcessorMachineKinematicsEngine.findMachines({ minSpindleRPM: 15000 });
      expect(hsm.length).toBeGreaterThan(0);
    });

    it("should find high-accuracy machines", () => {
      const precise = postProcessorMachineKinematicsEngine.findMachines({ maxAccuracy_mm: 0.005 });
      expect(precise.length).toBeGreaterThan(0);
    });
  });

  describe("Work Volume Calculation", () => {
    it("should calculate usable work volume", () => {
      const result = postProcessorMachineKinematicsEngine.calculateUsableWorkVolume(
        "haas-vf2", 100, 50
      );

      expect(result).toBeDefined();
      expect(result?.usable_mm3).toBeGreaterThan(0);
      expect(result?.usablePct).toBeGreaterThan(50);
    });

    it("should handle tool too long for travel", () => {
      const result = postProcessorMachineKinematicsEngine.calculateUsableWorkVolume(
        "haas-vf2", 1000, 500
      );

      expect(result?.usable_mm3).toBe(0);
      expect(result?.limitingDimension).toContain("Z");
    });

    it("should return null for unknown machine", () => {
      const result = postProcessorMachineKinematicsEngine.calculateUsableWorkVolume(
        "nonexistent", 100, 50
      );
      expect(result).toBeNull();
    });
  });

  describe("Cutting Condition Validation", () => {
    it("should validate safe cutting conditions", () => {
      const result = postProcessorMachineKinematicsEngine.validateCuttingCondition(
        "okuma-m460v-5ax",
        { cuttingPower_kW: 10, requiredAccel_g: 0.3, spindleRPM: 8000, requiredAccuracy_mm: 0.05 }
      );

      expect(result.valid).toBe(true);
    });

    it("should flag power overload", () => {
      const result = postProcessorMachineKinematicsEngine.validateCuttingCondition(
        "haas-vf2",
        { cuttingPower_kW: 25, requiredAccel_g: 0.2, spindleRPM: 5000, requiredAccuracy_mm: 0.05 }
      );

      expect(result.valid).toBe(false);
      expect(result.warnings.some(w => w.includes("Power"))).toBe(true);
    });

    it("should flag excessive acceleration", () => {
      const result = postProcessorMachineKinematicsEngine.validateCuttingCondition(
        "haas-vf2",
        { cuttingPower_kW: 5, requiredAccel_g: 5, spindleRPM: 3000, requiredAccuracy_mm: 0.05 }
      );

      expect(result.warnings.some(w => w.includes("Acceleration"))).toBe(true);
    });

    it("should flag RPM near max", () => {
      const result = postProcessorMachineKinematicsEngine.validateCuttingCondition(
        "haas-vf2",
        { cuttingPower_kW: 5, requiredAccel_g: 0.2, spindleRPM: 8000, requiredAccuracy_mm: 0.05 }
      );

      expect(result.utilizations.rpmPct).toBeGreaterThan(90);
    });

    it("should flag accuracy shortfall", () => {
      const result = postProcessorMachineKinematicsEngine.validateCuttingCondition(
        "haas-vf2",
        { cuttingPower_kW: 5, requiredAccel_g: 0.2, spindleRPM: 3000, requiredAccuracy_mm: 0.005 }
      );

      expect(result.valid).toBe(false);
      expect(result.warnings.some(w => w.includes("accuracy"))).toBe(true);
    });

    it("should handle unknown machine", () => {
      const result = postProcessorMachineKinematicsEngine.validateCuttingCondition(
        "nonexistent",
        { cuttingPower_kW: 5, requiredAccel_g: 0.2, spindleRPM: 3000, requiredAccuracy_mm: 0.05 }
      );

      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toContain("not found");
    });
  });

  describe("Collision Avoidance", () => {
    it("should generate collision recommendations", () => {
      const result = postProcessorMachineKinematicsEngine.generateCollisionAvoidance(
        "haas-vf2",
        { minX: 0, maxX: 500, minY: 0, maxY: 300, minZ: 0, maxZ: 400 }
      );

      expect(result).toBeDefined();
      expect(result?.safetyRetracts.length).toBeGreaterThan(0);
    });

    it("should flag travel boundary violations", () => {
      const result = postProcessorMachineKinematicsEngine.generateCollisionAvoidance(
        "haas-vf2",
        { minX: 0, maxX: 1000, minY: 0, maxY: 300, minZ: 0, maxZ: 400 }
      );

      expect(result?.safe).toBe(false);
      expect(result?.warnings.some(w => w.includes("X travel"))).toBe(true);
    });

    it("should flag tool change zone conflicts", () => {
      const result = postProcessorMachineKinematicsEngine.generateCollisionAvoidance(
        "haas-vf2",
        { minX: 700, maxX: 762, minY: 380, maxY: 406, minZ: 450, maxZ: 508 }
      );

      expect(result?.warnings.some(w => w.includes("tool change"))).toBe(true);
    });

    it("should report danger zones", () => {
      const result = postProcessorMachineKinematicsEngine.generateCollisionAvoidance(
        "okuma-m460v-5ax",
        { minX: 0, maxX: 500, minY: 0, maxY: 300, minZ: 0, maxZ: 400 }
      );

      expect(result?.warnings.some(w => w.includes("DANGER"))).toBe(true);
    });

    it("should provide approach strategy", () => {
      const result = postProcessorMachineKinematicsEngine.generateCollisionAvoidance(
        "haas-vf2",
        { minX: 100, maxX: 500, minY: 100, maxY: 300, minZ: 100, maxZ: 400 }
      );

      expect(result?.approach).toBeDefined();
    });
  });

  describe("Runtime Ingestion", () => {
    it("should ingest new machine profile", () => {
      const profile: MachineKinematicProfile = {
        id: "test-machine-001",
        name: "Test Machine",
        brand: "TestBrand",
        controller: "TestController",
        topologyId: "vmc-xyz-table",
        wayTypeId: "linear-rolling",
        buildQualityTier: "production",
        travels: { X_mm: 500, Y_mm: 400, Z_mm: 400, A_deg: null, B_deg: null, C_deg: null },
        tableSize_mm: { X: 600, Y: 400 },
        maxWorkLoad_kg: 500,
        spindle: { maxRPM: 10000, maxTorque_Nm: 100, maxPower_kW: 15, taperType: "CAT40", coolantThrough: false },
        accelerations: { rapidAccel_g: 0.5, cuttingAccel_g: 0.3, rapidRate_m_min: 30 },
        accuracy: { positioning_mm: 0.015, repeatability_mm: 0.008, squareness_mm: 0.020 },
        workVolume_mm3: 500 * 400 * 400,
        collisionEnvelope: {
          toolChangeZone: { X: [450, 500], Y: [350, 400], Z: [350, 400] },
          probeZone: { X: [0, 500], Y: [0, 400], Z: [100, 350] },
          dangerZones: []
        }
      };

      postProcessorMachineKinematicsEngine.ingestMachine(profile);

      const retrieved = postProcessorMachineKinematicsEngine.getMachineProfile("test-machine-001");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test Machine");
    });

    it("should include runtime machines in search", () => {
      const profile: MachineKinematicProfile = {
        id: "runtime-brand-test",
        name: "Runtime Test",
        brand: "RuntimeBrand",
        controller: "Test",
        topologyId: "vmc-xyz-table",
        wayTypeId: "linear-rolling",
        buildQualityTier: "production",
        travels: { X_mm: 500, Y_mm: 400, Z_mm: 400, A_deg: null, B_deg: null, C_deg: null },
        tableSize_mm: { X: 600, Y: 400 },
        maxWorkLoad_kg: 500,
        spindle: { maxRPM: 10000, maxTorque_Nm: 100, maxPower_kW: 15, taperType: "CAT40", coolantThrough: false },
        accelerations: { rapidAccel_g: 0.5, cuttingAccel_g: 0.3, rapidRate_m_min: 30 },
        accuracy: { positioning_mm: 0.015, repeatability_mm: 0.008, squareness_mm: 0.020 },
        workVolume_mm3: 500 * 400 * 400,
        collisionEnvelope: {
          toolChangeZone: { X: [450, 500], Y: [350, 400], Z: [350, 400] },
          probeZone: { X: [0, 500], Y: [0, 400], Z: [100, 350] },
          dangerZones: []
        }
      };

      postProcessorMachineKinematicsEngine.ingestMachine(profile);

      const found = postProcessorMachineKinematicsEngine.findMachines({ brand: "RuntimeBrand" });
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe("Engineering Summary", () => {
    it("should generate engineering summary", () => {
      const summary = postProcessorMachineKinematicsEngine.getEngineeringSummary("haas-vf2");

      expect(summary).toBeDefined();
      expect(summary).toContain("Haas VF-2");
      expect(summary).toContain("TRAVELS");
      expect(summary).toContain("SPINDLE");
      expect(summary).toContain("ACCURACY");
    });

    it("should include topology name", () => {
      const summary = postProcessorMachineKinematicsEngine.getEngineeringSummary("okuma-m460v-5ax");

      expect(summary).toContain("5-axis");
    });

    it("should handle unknown machine", () => {
      const summary = postProcessorMachineKinematicsEngine.getEngineeringSummary("unknown");
      expect(summary).toBeNull();
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorMachineKinematicsEngine.getContextForAI();

      expect(context).toContain("MACHINE KINEMATICS ENGINE");
      expect(context).toContain("kinematic topologies");
      expect(context).toContain("way types");
      expect(context).toContain("build quality tiers");
      expect(context).toContain("API METHODS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown topology ID", () => {
      const t = postProcessorMachineKinematicsEngine.getTopology("unknown");
      expect(t).toBeUndefined();
    });

    it("should handle unknown way type", () => {
      const w = postProcessorMachineKinematicsEngine.getWayType("unknown");
      expect(w).toBeUndefined();
    });

    it("should handle unknown build quality tier", () => {
      const t = postProcessorMachineKinematicsEngine.getBuildQualityTier("unknown");
      expect(t).toBeUndefined();
    });

    it("should handle empty search criteria", () => {
      const all = postProcessorMachineKinematicsEngine.findMachines({});
      expect(all.length).toBeGreaterThan(0);
    });
  });
});
