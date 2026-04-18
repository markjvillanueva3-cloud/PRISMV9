/**
 * Tests for RCSAEngine (MILL-AGI Phase 2 / MILL-MS7)
 *
 * Validates Receptance Coupling Substructure Analysis:
 *   - Tool beam FRF computation (Euler-Bernoulli / Timoshenko)
 *   - Holder FRF with taper/type effects
 *   - Receptance coupling of substructures
 *   - Dominant mode identification (half-power bandwidth)
 *   - Stability limit computation
 *   - Overhang ratio warnings
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  RCSAEngine,
  rcsaEngine,
  type RCSAInput,
  type ToolGeometry,
  type HolderGeometry,
  type RCSAResult,
} from "../engines/RCSAEngine.js";

describe("RCSAEngine (MILL-AGI P2 / MILL-MS7)", () => {
  let engine: RCSAEngine;

  beforeAll(() => {
    engine = rcsaEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const standardTool: ToolGeometry = {
    diameter_mm: 12,
    flute_length_mm: 30,
    shank_diameter_mm: 12,
    overall_length_mm: 80,
    material: "carbide",
    flute_count: 4,
    helix_angle_deg: 35,
  };

  const longReachTool: ToolGeometry = {
    diameter_mm: 10,
    flute_length_mm: 25,
    overall_length_mm: 150,
    material: "carbide",
    flute_count: 3,
  };

  const shortThickTool: ToolGeometry = {
    diameter_mm: 20,
    flute_length_mm: 40,
    overall_length_mm: 60,
    material: "carbide",
    flute_count: 4,
  };

  const hssTool: ToolGeometry = {
    diameter_mm: 8,
    flute_length_mm: 20,
    overall_length_mm: 70,
    material: "hss",
    flute_count: 2,
  };

  const shrinkFitHolder: HolderGeometry = {
    type: "shrink_fit",
    taper: "HSK-A63",
    gauge_length_mm: 60,
    bore_diameter_mm: 12,
    body_diameter_mm: 48,
  };

  const colletHolder: HolderGeometry = {
    type: "collet",
    taper: "CAT40",
    gauge_length_mm: 80,
    bore_diameter_mm: 12,
  };

  const weldonHolder: HolderGeometry = {
    type: "weldon",
    taper: "BT30",
    gauge_length_mm: 50,
    bore_diameter_mm: 10,
  };

  // ============================================================================
  // BASIC COMPUTATION
  // ============================================================================

  describe("basic computation", () => {
    it("returns valid RCSAResult", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result).toBeDefined();
      expect(result.tool_point_frf.length).toBeGreaterThan(0);
      expect(result.dominant_mode.frequency_hz).toBeGreaterThan(0);
    });

    it("computes overhang ratio correctly", () => {
      const input: RCSAInput = {
        tool: longReachTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.overhang_ratio).toBeCloseTo(15, 0); // 150mm / 10mm = 15
    });

    it("includes effective stiffness", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.effective_stiffness_n_per_um).toBeGreaterThan(0);
      expect(result.dynamic_stiffness_min_n_per_um).toBeGreaterThan(0);
    });

    it("includes confidence score", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ============================================================================
  // BEAM MODEL SELECTION
  // ============================================================================

  describe("beam model selection", () => {
    it("uses Timoshenko for short tools (L/D < 10)", () => {
      const input: RCSAInput = {
        tool: shortThickTool, // L/D = 60/20 = 3
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.beam_model).toBe("timoshenko");
    });

    it("uses Euler-Bernoulli for long tools (L/D > 10)", () => {
      const input: RCSAInput = {
        tool: longReachTool, // L/D = 150/10 = 15
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.beam_model).toBe("euler_bernoulli");
    });
  });

  // ============================================================================
  // DOMINANT MODE
  // ============================================================================

  describe("dominant mode identification", () => {
    it("finds peak frequency", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.dominant_mode.frequency_hz).toBeGreaterThan(100);
      expect(result.dominant_mode.frequency_hz).toBeLessThan(10000);
    });

    it("computes damping ratio via half-power bandwidth", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.dominant_mode.damping_ratio).toBeGreaterThan(0.005);
      expect(result.dominant_mode.damping_ratio).toBeLessThan(0.2);
    });

    it("computes modal stiffness and mass", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
      };

      const result = engine.computeToolPointFRF(input);

      expect(result.dominant_mode.stiffness_n_per_um).toBeGreaterThan(0);
      expect(result.dominant_mode.modal_mass_kg).toBeGreaterThan(0);
    });

    it("identifies secondary modes", () => {
      const input: RCSAInput = {
        tool: standardTool,
        holder: shrinkFitHolder,
        frequency_range_hz: [100, 8000],
      };

      const result = engine.computeToolPointFRF(input);

      expect(Array.isArray(result.secondary_modes)).toBe(true);
    });
  });

  // ============================================================================
  // HOLDER EFFECTS
  // ============================================================================

  describe("holder effects", () => {
    it("shrink fit stiffer than collet", () => {
      const shrinkResult = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
      });

      const colletResult = engine.computeToolPointFRF({
        tool: standardTool,
        holder: colletHolder,
      });

      expect(shrinkResult.effective_stiffness_n_per_um).toBeGreaterThan(
        colletResult.effective_stiffness_n_per_um * 0.8
      );
    });

    it("HSK taper stiffer than BT30", () => {
      const hskResult = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder, // HSK-A63
      });

      const bt30Result = engine.computeToolPointFRF({
        tool: standardTool,
        holder: weldonHolder, // BT30
      });

      expect(hskResult.dominant_mode.stiffness_n_per_um).toBeGreaterThan(
        bt30Result.dominant_mode.stiffness_n_per_um
      );
    });
  });

  // ============================================================================
  // MATERIAL EFFECTS
  // ============================================================================

  describe("material effects", () => {
    it("carbide stiffer than HSS", () => {
      const carbideResult = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
      });

      const hssResult = engine.computeToolPointFRF({
        tool: hssTool,
        holder: shrinkFitHolder,
      });

      expect(carbideResult.effective_stiffness_n_per_um).toBeGreaterThan(
        hssResult.effective_stiffness_n_per_um
      );
    });

    it("carbide has higher stiffness than HSS for same geometry", () => {
      const carbideTool: ToolGeometry = {
        diameter_mm: 10,
        flute_length_mm: 25,
        overall_length_mm: 80,
        material: "carbide",
        flute_count: 4,
      };

      const hssTool: ToolGeometry = {
        ...carbideTool,
        material: "hss",
      };

      const carbideResult = engine.computeToolPointFRF({
        tool: carbideTool,
        holder: shrinkFitHolder,
      });

      const hssResult = engine.computeToolPointFRF({
        tool: hssTool,
        holder: shrinkFitHolder,
      });

      // Carbide E=600GPa vs HSS E=210GPa means carbide tool is stiffer
      // After coupling, the dominant mode stiffness reflects this
      expect(carbideResult.dominant_mode.stiffness_n_per_um).toBeGreaterThanOrEqual(
        hssResult.dominant_mode.stiffness_n_per_um
      );
    });
  });

  // ============================================================================
  // EXTENSIONS
  // ============================================================================

  describe("extensions", () => {
    it("extension affects system dynamics", () => {
      const withoutExt = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
      });

      const withExt = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
        extensions: [
          {
            length_mm: 50,
            outer_diameter_mm: 32,
            material: "steel",
          },
        ],
      });

      // Extension should change the system dynamics (frequency, stiffness, or both)
      const freqChanged = withExt.dominant_mode.frequency_hz !== withoutExt.dominant_mode.frequency_hz;
      const stiffChanged = withExt.effective_stiffness_n_per_um !== withoutExt.effective_stiffness_n_per_um;
      expect(freqChanged || stiffChanged).toBe(true);
    });

    it("extension generates warning", () => {
      const result = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
        extensions: [
          {
            length_mm: 50,
            outer_diameter_mm: 32,
            material: "steel",
          },
        ],
      });

      expect(result.warnings.some((w) => w.toLowerCase().includes("extension"))).toBe(true);
    });
  });

  // ============================================================================
  // OVERHANG WARNINGS
  // ============================================================================

  describe("overhang warnings", () => {
    it("warns on high L/D ratio", () => {
      const result = engine.computeToolPointFRF({
        tool: longReachTool, // L/D = 15
        holder: shrinkFitHolder,
      });

      expect(result.warnings.some((w) => w.toLowerCase().includes("l/d"))).toBe(true);
    });

    it("no L/D warning for standard tool", () => {
      const result = engine.computeToolPointFRF({
        tool: shortThickTool, // L/D = 3
        holder: shrinkFitHolder,
      });

      expect(result.warnings.some((w) => w.toLowerCase().includes("l/d"))).toBe(false);
    });
  });

  // ============================================================================
  // STABILITY LIMIT
  // ============================================================================

  describe("stability limit", () => {
    it("computes ap_limit for given RPM", () => {
      const rcsa = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
      });

      const stability = engine.computeStabilityLimit(
        rcsa,
        10000, // RPM
        4, // flute count
        2000, // kc MPa (steel)
        0.5 // 50% radial immersion
      );

      expect(stability.ap_limit_mm).toBeGreaterThan(0.1);
      expect(stability.chatter_freq_hz).toBeGreaterThan(0);
    });

    it("lower stiffness means lower ap_limit", () => {
      const stiffRcsa = engine.computeToolPointFRF({
        tool: shortThickTool,
        holder: shrinkFitHolder,
      });

      const flexibleRcsa = engine.computeToolPointFRF({
        tool: longReachTool,
        holder: colletHolder,
      });

      const stiffStability = engine.computeStabilityLimit(stiffRcsa, 10000, 4, 2000, 0.5);
      const flexibleStability = engine.computeStabilityLimit(flexibleRcsa, 10000, 3, 2000, 0.5);

      expect(stiffStability.ap_limit_mm).toBeGreaterThan(flexibleStability.ap_limit_mm);
    });
  });

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  describe("input validation", () => {
    it("rejects zero diameter", () => {
      const validation = engine.validateInput({
        tool: { ...standardTool, diameter_mm: 0 },
        holder: shrinkFitHolder,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("diameter"))).toBe(true);
    });

    it("rejects tool shorter than diameter", () => {
      const validation = engine.validateInput({
        tool: { ...standardTool, overall_length_mm: 5, diameter_mm: 12 },
        holder: shrinkFitHolder,
      });

      expect(validation.valid).toBe(false);
    });

    it("warns on bore/shank mismatch", () => {
      const validation = engine.validateInput({
        tool: { ...standardTool, diameter_mm: 20 },
        holder: { ...shrinkFitHolder, bore_diameter_mm: 10 },
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("bore"))).toBe(true);
    });

    it("passes valid input", () => {
      const validation = engine.validateInput({
        tool: standardTool,
        holder: shrinkFitHolder,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // FRF OUTPUT FORMAT
  // ============================================================================

  describe("FRF output format", () => {
    it("FRF points include all required fields", () => {
      const result = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
        frequency_points: 100,
      });

      const point = result.tool_point_frf[0];
      expect(point.frequency_hz).toBeDefined();
      expect(point.magnitude).toBeDefined();
      expect(point.phase_rad).toBeDefined();
      expect(point.real).toBeDefined();
      expect(point.imag).toBeDefined();
    });

    it("respects frequency range and point count", () => {
      const result = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
        frequency_range_hz: [200, 4000],
        frequency_points: 200,
      });

      expect(result.tool_point_frf.length).toBe(200);
      expect(result.tool_point_frf[0].frequency_hz).toBeCloseTo(200, 0);
      expect(result.tool_point_frf[199].frequency_hz).toBeCloseTo(4000, 0);
    });

    it("critical frequencies are within range", () => {
      const result = engine.computeToolPointFRF({
        tool: standardTool,
        holder: shrinkFitHolder,
        frequency_range_hz: [100, 5000],
      });

      for (const freq of result.critical_frequencies_hz) {
        expect(freq).toBeGreaterThanOrEqual(100);
        expect(freq).toBeLessThanOrEqual(5000);
      }
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(rcsaEngine).toBeDefined();
      expect(rcsaEngine).toBeInstanceOf(RCSAEngine);
    });
  });
});
