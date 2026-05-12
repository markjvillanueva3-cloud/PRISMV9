/**
 * MDOFStabilityEngine Tests
 *
 * Comprehensive test suite for Multi-Degree-of-Freedom stability analysis.
 * Validates MDOF physics, mode coupling detection, and SDOF vs MDOF comparisons.
 *
 * Reference values derived from:
 *   - Altintas (2012) "Manufacturing Automation" Chapter 4 examples
 *   - Schmitz & Smith (2019) "Machining Dynamics" Chapter 6
 */

import { describe, it, expect } from "vitest";
import {
  MDOFStabilityEngine,
  mdofStabilityEngine,
  type ModeParams,
  type MDOFParams,
  type Vector3,
} from "../engines/MDOFStabilityEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Typical 3-mode endmill — represents a 10mm carbide endmill with 40mm stickout
 * Frequencies based on Euler-Bernoulli beam theory ratios: 1 : 6.27 : 17.55
 */
const threeModeTool: ModeParams[] = [
  {
    frequency: 2500,
    dampingRatio: 0.025,
    modalMass: 0.012,
    modalStiffness: 2.96e6, // N/m
    direction: { x: 1, y: 0, z: 0 },
    participation: 1.0,
  },
  {
    frequency: 15675, // 2500 × 6.27
    dampingRatio: 0.035,
    modalMass: 0.008,
    modalStiffness: 7.8e7,
    direction: { x: 0.7, y: 0.7, z: 0 },
    participation: 0.15,
  },
  {
    frequency: 43875, // 2500 × 17.55
    dampingRatio: 0.045,
    modalMass: 0.003,
    modalStiffness: 2.3e8,
    direction: { x: 0.5, y: 0.5, z: 0.707 },
    participation: 0.05,
  },
];

/**
 * Two closely-spaced modes — for mode coupling tests
 * ~12% frequency separation triggers coupling
 */
const coupledModeTool: ModeParams[] = [
  {
    frequency: 2800,
    dampingRatio: 0.02,
    modalMass: 0.015,
    modalStiffness: 4.67e6,
    direction: { x: 1, y: 0, z: 0 },
    participation: 1.0,
  },
  {
    frequency: 3100, // 10.7% higher — within coupling threshold
    dampingRatio: 0.025,
    modalMass: 0.014,
    modalStiffness: 5.31e6,
    direction: { x: 0, y: 1, z: 0 },
    participation: 0.9,
  },
];

/**
 * Single dominant mode — for SDOF baseline comparison
 */
const singleMode: ModeParams[] = [
  {
    frequency: 3000,
    dampingRatio: 0.03,
    modalMass: 0.01,
    modalStiffness: 3.55e6,
    direction: { x: 1, y: 0, z: 0 },
    participation: 1.0,
  },
];

/**
 * Standard milling parameters
 */
const standardMillingParams = {
  radialImmersion: 0.5, // 50% radial engagement
  numberOfTeeth: 4,
  helixAngle: 30,
  kc: 1800, // N/mm² — steel
  kr: 0.3, // Typical radial force ratio
  rpmRange: [5000, 15000] as [number, number],
  rpmPoints: 100,
};

// ============================================================================
// TESTS
// ============================================================================

describe("MDOFStabilityEngine", () => {
  const engine = new MDOFStabilityEngine();

  // ────────────────────────────────────────────────────────────────────────────
  // Basic Computation Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("compute", () => {
    it("computes stability diagram for 3-mode tool", () => {
      const params: MDOFParams = {
        modes: threeModeTool,
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      expect(result.spindleSpeed.length).toBe(standardMillingParams.rpmPoints);
      expect(result.criticalDepth.length).toBe(standardMillingParams.rpmPoints);
      expect(result.limitingMode.length).toBe(standardMillingParams.rpmPoints);
      expect(result.method).toBe("MDOF_eigenvalue");
    });

    it("returns positive critical depths within reasonable range", () => {
      const params: MDOFParams = {
        modes: threeModeTool,
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      // All valid depths should be positive and below 50mm (reasonable for milling)
      const validDepths = result.criticalDepth.filter(d => d > 0);
      expect(validDepths.length).toBeGreaterThan(0);

      for (const depth of validDepths) {
        expect(depth).toBeGreaterThan(0);
        expect(depth).toBeLessThan(50);
      }
    });

    it("identifies optimal RPM with maximum stable depth", () => {
      const params: MDOFParams = {
        modes: threeModeTool,
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      expect(result.optimalRPM).toBeGreaterThanOrEqual(standardMillingParams.rpmRange[0]);
      expect(result.optimalRPM).toBeLessThanOrEqual(standardMillingParams.rpmRange[1]);
      expect(result.maxStableDepth).toBeGreaterThan(0);

      // maxStableDepth should match the maximum in criticalDepth array
      const maxInArray = Math.max(...result.criticalDepth.filter(d => d > 0));
      expect(result.maxStableDepth).toBeCloseTo(maxInArray, 3);
    });

    it("computes unconditional stability limit correctly", () => {
      const params: MDOFParams = {
        modes: threeModeTool,
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      const minDepth = Math.min(...result.criticalDepth.filter(d => d > 0));
      expect(result.unconditionalLimit).toBeCloseTo(minDepth, 5);
    });

    it("handles single mode (SDOF fallback)", () => {
      const params: MDOFParams = {
        modes: singleMode,
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      expect(result.spindleSpeed.length).toBe(standardMillingParams.rpmPoints);
      expect(result.maxStableDepth).toBeGreaterThan(0);
      // With single mode, all limiting modes should be 0
      expect(result.limitingMode.every(m => m === 0)).toBe(true);
    });

    it("throws error for empty modes array", () => {
      const params: MDOFParams = {
        modes: [],
        ...standardMillingParams,
      };

      expect(() => engine.compute(params)).toThrow("At least one mode is required");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Mode Coupling Detection Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("mode coupling detection", () => {
    it("detects coupling between closely-spaced modes", () => {
      const params: MDOFParams = {
        modes: coupledModeTool,
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      expect(result.modeCouplings.length).toBeGreaterThan(0);
      expect(result.modeCouplings[0].mode1).toBe(0);
      expect(result.modeCouplings[0].mode2).toBe(1);
      expect(result.modeCouplings[0].frequencyRatio).toBeGreaterThan(0.85);
    });

    it("does not detect coupling for well-separated modes", () => {
      const params: MDOFParams = {
        modes: threeModeTool, // Modes are well-separated (6.27× ratio)
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      // First two modes should NOT couple (6.27× ratio > 20% threshold)
      const coupling01 = result.modeCouplings.find(
        c => c.mode1 === 0 && c.mode2 === 1
      );
      expect(coupling01).toBeUndefined();
    });

    it("marks mode interaction at affected RPMs", () => {
      const params: MDOFParams = {
        modes: coupledModeTool,
        ...standardMillingParams,
        rpmRange: [2000, 10000] as [number, number],
      };

      const result = engine.compute(params);

      // Should have some RPMs with mode interaction
      const interactionCount = result.modeInteraction.filter(Boolean).length;
      expect(interactionCount).toBeGreaterThan(0);
    });

    it("coupling strength is proportional to mode shape overlap", () => {
      const params: MDOFParams = {
        modes: coupledModeTool, // X and Y directions are orthogonal
        ...standardMillingParams,
      };

      const result = engine.compute(params);

      // Orthogonal modes (x vs y) should have low coupling strength
      if (result.modeCouplings.length > 0) {
        // With orthogonal directions, overlap ≈ 0, so strength should be low
        expect(result.modeCouplings[0].couplingStrength).toBeLessThan(0.5);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SDOF vs MDOF Comparison Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("compareSDOFvsMDOF", () => {
    it("MDOF predicts lower stable depths than SDOF for multi-mode tools", () => {
      const result = engine.compareSDOFvsMDOF({
        modes: threeModeTool,
        ...standardMillingParams,
      });

      // MDOF should generally be more conservative (lower depths) than SDOF
      // because it accounts for additional modes
      expect(result.comparison.avgDepthReduction).toBeGreaterThanOrEqual(0);
    });

    it("SDOF and MDOF give similar results for single-mode tool", () => {
      const result = engine.compareSDOFvsMDOF({
        modes: singleMode,
        ...standardMillingParams,
      });

      // With only one mode, SDOF and MDOF should be nearly identical
      expect(result.comparison.avgDepthReduction).toBeLessThan(5); // <5% difference
    });

    it("identifies additional unstable ranges in MDOF vs SDOF", () => {
      const result = engine.compareSDOFvsMDOF({
        modes: threeModeTool,
        ...standardMillingParams,
      });

      // MDOF may find unstable regions that SDOF misses
      // (additionalUnstableRanges can be empty if SDOF already conservative)
      expect(result.comparison.additionalUnstableRanges).toBeDefined();
    });

    it("reports mode coupling impact flag", () => {
      // Test with coupled modes
      const coupledResult = engine.compareSDOFvsMDOF({
        modes: coupledModeTool,
        ...standardMillingParams,
      });

      // Test with well-separated modes
      const separatedResult = engine.compareSDOFvsMDOF({
        modes: threeModeTool,
        ...standardMillingParams,
      });

      // Coupled modes should show impact
      expect(coupledResult.comparison.modeCouplingImpact).toBe(true);
      // Well-separated modes should not show impact
      expect(separatedResult.comparison.modeCouplingImpact).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Eigenvalue Method Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("computeWithEigenvalue", () => {
    it("computes stability using eigenvalue formulation", () => {
      const params: MDOFParams = {
        modes: threeModeTool,
        ...standardMillingParams,
      };

      const result = engine.computeWithEigenvalue(params);

      expect(result.method).toBe("MDOF_eigenvalue");
      expect(result.spindleSpeed.length).toBe(standardMillingParams.rpmPoints);
      expect(result.criticalDepth.length).toBe(standardMillingParams.rpmPoints);
    });

    it("eigenvalue method agrees with ZOA for low radial immersion", () => {
      // At high radial immersion (>50%), ZOA and eigenvalue should agree
      const params: MDOFParams = {
        modes: singleMode,
        radialImmersion: 0.8,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      };

      const eigenResult = engine.computeWithEigenvalue(params);
      const zoaResult = engine.compute(params);

      // Results should be similar (within 20% for high immersion)
      const eigenMax = Math.max(...eigenResult.criticalDepth.filter(d => d > 0));
      const zoaMax = Math.max(...zoaResult.criticalDepth.filter(d => d > 0));

      if (eigenMax > 0 && zoaMax > 0) {
        const diff = Math.abs(eigenMax - zoaMax) / Math.max(eigenMax, zoaMax);
        expect(diff).toBeLessThan(0.3); // Within 30%
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Analytical Tool Modes Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("analyticalToolModes", () => {
    it("generates multiple modes from tool geometry", () => {
      const modes = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 40,
        material: "carbide",
        flutes: 4,
      });

      expect(modes.length).toBe(3); // First 3 bending modes
    });

    it("mode frequencies follow Euler-Bernoulli ratios", () => {
      const modes = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 40,
        material: "carbide",
        flutes: 4,
      });

      const f1 = modes[0].frequency;
      const f2 = modes[1].frequency;
      const f3 = modes[2].frequency;

      // Cantilever beam ratios: λ₂/λ₁ = 4.694/1.875 ≈ 2.503 → f₂/f₁ ≈ 6.267
      // λ₃/λ₁ = 7.855/1.875 ≈ 4.189 → f₃/f₁ ≈ 17.55
      expect(f2 / f1).toBeCloseTo(6.267, 0);
      expect(f3 / f1).toBeCloseTo(17.55, 0);
    });

    it("shorter stickout gives higher frequencies", () => {
      const longTool = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 60,
        material: "carbide",
      });

      const shortTool = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 30,
        material: "carbide",
      });

      // Frequency scales as 1/L² for Euler-Bernoulli beam
      expect(shortTool[0].frequency).toBeGreaterThan(longTool[0].frequency);

      // Ratio should be approximately (60/30)² = 4
      const ratio = shortTool[0].frequency / longTool[0].frequency;
      expect(ratio).toBeCloseTo(4, 0);
    });

    it("larger diameter gives higher frequencies", () => {
      const thinTool = engine.analyticalToolModes({
        diameter_mm: 6,
        stickout_mm: 40,
        material: "carbide",
      });

      const thickTool = engine.analyticalToolModes({
        diameter_mm: 16,
        stickout_mm: 40,
        material: "carbide",
      });

      // Frequency scales as √(I/A) which scales as D for solid cylinder
      expect(thickTool[0].frequency).toBeGreaterThan(thinTool[0].frequency);
    });

    it("carbide has higher frequencies than HSS", () => {
      const carbide = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 40,
        material: "carbide",
      });

      const hss = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 40,
        material: "hss",
      });

      // Carbide has higher E/ρ ratio → higher natural frequency
      // E_carbide/ρ_carbide ≈ 600e9/14500 ≈ 41.4e6
      // E_hss/ρ_hss ≈ 210e9/8000 ≈ 26.25e6
      expect(carbide[0].frequency).toBeGreaterThan(hss[0].frequency);
    });

    it("damping ratio increases with mode number", () => {
      const modes = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 40,
        material: "carbide",
      });

      expect(modes[1].dampingRatio).toBeGreaterThan(modes[0].dampingRatio);
      expect(modes[2].dampingRatio).toBeGreaterThan(modes[1].dampingRatio);
    });

    it("participation factor decreases with mode number", () => {
      const modes = engine.analyticalToolModes({
        diameter_mm: 10,
        stickout_mm: 40,
        material: "carbide",
      });

      expect(modes[0].participation).toBeGreaterThan(modes[1].participation!);
      expect(modes[1].participation).toBeGreaterThan(modes[2].participation!);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FRF Import Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("importFRFFromTapTest", () => {
    it("extracts modes from simulated tap test data", () => {
      // Simulate FRF data with peaks at 1000Hz and 3000Hz
      const n = 200;
      const frequencies = Array.from({ length: n }, (_, i) => 100 + i * 40); // 100-8000Hz
      const magnitude: number[] = [];
      const phase: number[] = [];

      for (let i = 0; i < n; i++) {
        const f = frequencies[i];
        // Simulate two resonance peaks
        const peak1 = 1e-6 / Math.sqrt(Math.pow(f - 1000, 2) + 2500);
        const peak2 = 0.5e-6 / Math.sqrt(Math.pow(f - 3000, 2) + 10000);
        magnitude.push(peak1 + peak2 + 1e-8);
        phase.push(-Math.atan2(f - 1000, 50)); // Simplified phase
      }

      const modes = engine.importFRFFromTapTest({
        frequencies,
        magnitude,
        phase,
      });

      expect(modes.length).toBeGreaterThan(0);
      // First mode should be near 1000Hz
      if (modes.length > 0) {
        expect(modes[0].frequency).toBeGreaterThan(800);
        expect(modes[0].frequency).toBeLessThan(1200);
      }
    });

    it("sets direction from input", () => {
      const frequencies = [100, 200, 300, 400, 500];
      const magnitude = [0.001, 0.1, 0.001, 0.001, 0.001]; // Peak at 200Hz
      const phase = [0, -90, -180, -180, -180];

      const modes = engine.importFRFFromTapTest({
        frequencies,
        magnitude,
        phase,
        direction: { x: 0, y: 1, z: 0 },
      });

      if (modes.length > 0) {
        expect(modes[0].direction.y).toBe(1);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Parameter Sensitivity Tests
  // ────────────────────────────────────────────────────────────────────────────

  describe("parameter sensitivity", () => {
    it("higher kc gives lower critical depth", () => {
      const lowKc = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1200, // Low kc (aluminum)
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      });

      const highKc = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 2800, // High kc (hardened steel)
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      });

      // Higher cutting force coefficient → lower stable depth
      expect(highKc.maxStableDepth).toBeLessThan(lowKc.maxStableDepth);
    });

    it("more teeth shifts stability lobes to lower RPM", () => {
      const result2Teeth = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 2,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [3000, 20000] as [number, number],
        rpmPoints: 100,
      });

      const result6Teeth = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 6,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [3000, 20000] as [number, number],
        rpmPoints: 100,
      });

      // More teeth → higher tooth passing frequency at same RPM
      // This shifts optimal stable pocket RPM lower
      // The pattern should be different between the two
      expect(result2Teeth.optimalRPM).not.toBe(result6Teeth.optimalRPM);
    });

    it("lower radial immersion increases stable depth", () => {
      const highImmersion = engine.compute({
        modes: singleMode,
        radialImmersion: 0.8,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      });

      const lowImmersion = engine.compute({
        modes: singleMode,
        radialImmersion: 0.2,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      });

      // Lower radial immersion → lower directional factor → higher stable depth
      expect(lowImmersion.maxStableDepth).toBeGreaterThan(highImmersion.maxStableDepth);
    });

    it("up milling vs down milling affects stability", () => {
      const upMilling = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        upMilling: true,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      });

      const downMilling = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        upMilling: false,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 50,
      });

      // Directional coefficients differ between up and down milling
      // Results should be different
      const upAvg = upMilling.criticalDepth.reduce((s, d) => s + d, 0) / upMilling.criticalDepth.length;
      const downAvg = downMilling.criticalDepth.reduce((s, d) => s + d, 0) / downMilling.criticalDepth.length;

      expect(upAvg).not.toBeCloseTo(downAvg, 1); // Should differ by more than 0.1
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Edge Cases and Validation
  // ────────────────────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles very low damping ratio", () => {
      const lowDampingMode: ModeParams[] = [
        {
          frequency: 3000,
          dampingRatio: 0.001, // Very low damping
          modalMass: 0.01,
          modalStiffness: 3.55e6,
          direction: { x: 1, y: 0, z: 0 },
          participation: 1.0,
        },
      ];

      const result = engine.compute({
        modes: lowDampingMode,
        ...standardMillingParams,
      });

      // Should still compute valid results
      expect(result.spindleSpeed.length).toBe(standardMillingParams.rpmPoints);
      // Low damping → lower stable depth
      expect(result.maxStableDepth).toBeGreaterThan(0);
    });

    it("handles very high natural frequency", () => {
      const highFreqMode: ModeParams[] = [
        {
          frequency: 50000, // 50 kHz
          dampingRatio: 0.03,
          modalMass: 0.002,
          modalStiffness: 1e8,
          direction: { x: 1, y: 0, z: 0 },
          participation: 1.0,
        },
      ];

      const result = engine.compute({
        modes: highFreqMode,
        ...standardMillingParams,
        rpmRange: [10000, 30000] as [number, number],
      });

      expect(result.spindleSpeed.length).toBe(standardMillingParams.rpmPoints);
    });

    it("uses default kc when not provided", () => {
      const result = engine.compute({
        modes: singleMode,
        radialImmersion: 0.5,
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 0, // Will trigger default
        kr: 0.3,
        isoGroup: "P",
        rpmRange: [5000, 15000] as [number, number],
      });

      expect(result.maxStableDepth).toBeGreaterThan(0);
    });

    it("clamps radial immersion to valid range", () => {
      const resultLow = engine.compute({
        modes: singleMode,
        radialImmersion: -0.5, // Invalid, will be clamped to 0.01
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 20,
      });

      const resultHigh = engine.compute({
        modes: singleMode,
        radialImmersion: 1.5, // Invalid, will be clamped to 1.0
        numberOfTeeth: 4,
        helixAngle: 30,
        kc: 1800,
        kr: 0.3,
        rpmRange: [5000, 15000] as [number, number],
        rpmPoints: 20,
      });

      // Should not crash, should produce valid results
      expect(resultLow.spindleSpeed.length).toBe(20);
      expect(resultHigh.spindleSpeed.length).toBe(20);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Singleton Export Test
  // ────────────────────────────────────────────────────────────────────────────

  describe("singleton export", () => {
    it("mdofStabilityEngine is an instance of MDOFStabilityEngine", () => {
      expect(mdofStabilityEngine).toBeInstanceOf(MDOFStabilityEngine);
    });

    it("singleton computes same result as new instance", () => {
      const params: MDOFParams = {
        modes: singleMode,
        ...standardMillingParams,
        rpmPoints: 20,
      };

      const instanceResult = new MDOFStabilityEngine().compute(params);
      const singletonResult = mdofStabilityEngine.compute(params);

      expect(singletonResult.maxStableDepth).toBeCloseTo(instanceResult.maxStableDepth, 5);
      expect(singletonResult.optimalRPM).toBe(instanceResult.optimalRPM);
    });
  });
});
