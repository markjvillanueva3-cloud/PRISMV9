/**
 * LathePrintSetupSelectionEngine Tests — U-LTH38
 *
 * Physics-based workholding selection: L/D ratio thresholds, grip force,
 * tailstock engagement, steady rest placement. JM Die samples + adversarial inputs.
 *
 * @milestone LATHE-MASTER U-LTH38
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintSetupSelectionEngine,
  type PartGeometry,
  type ChuckSpec,
  type CuttingLoadInput,
} from "../engines/LathePrintSetupSelectionEngine.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STEEL_1018: MaterialInput = {
  name: "1018 Steel",
  iso_group: "P",
  tensile_strength_mpa: 440,
  machinability_factor: 0.8,
};

const ALUMINUM: MaterialInput = {
  name: "6061-T6 Aluminum",
  iso_group: "N",
  tensile_strength_mpa: 310,
  machinability_factor: 1.5,
};

const INCONEL: MaterialInput = {
  name: "Inconel 718",
  iso_group: "S",
  hardness_hrc: 36,
  tensile_strength_mpa: 1350,
  machinability_factor: 0.15,
};

const STANDARD_LOAD: CuttingLoadInput = {
  max_cutting_force_n: 2500,
  max_axial_force_n: 1000,
  max_radial_force_n: 900,
  dominant_operation: "roughing",
};

const LIGHT_LOAD: CuttingLoadInput = {
  max_cutting_force_n: 400,
  max_axial_force_n: 160,
  max_radial_force_n: 140,
  dominant_operation: "finishing",
};

// Short stubby part (L/D = 1) — chuck only
const SHORT_PART: PartGeometry = {
  max_od_mm: 50,
  min_od_mm: 50,
  overall_length_mm: 50,
};

// Medium part (L/D = 5) — tailstock needed
const MEDIUM_PART: PartGeometry = {
  max_od_mm: 30,
  min_od_mm: 25,
  overall_length_mm: 150,
};

// Long shaft (L/D = 12) — steady rest required
const LONG_SHAFT: PartGeometry = {
  max_od_mm: 25,
  min_od_mm: 20,
  overall_length_mm: 300,
};

// Thin-wall tube — soft jaws needed
const THIN_WALL_TUBE: PartGeometry = {
  max_od_mm: 40,
  min_od_mm: 40,
  overall_length_mm: 80,
  has_through_hole: true,
  through_hole_id_mm: 36,  // wall = 2mm = 5% of OD
};

// ============================================================================
// HAPPY PATH — L/D RATIO THRESHOLDS
// ============================================================================

describe("LathePrintSetupSelectionEngine", () => {
  describe("L/D Ratio Thresholds", () => {
    it("short part (L/D=1.0): chuck only, no tailstock, no steady rest", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, STANDARD_LOAD
      );

      expect(setup.ld_ratio).toBeCloseTo(1.0, 1);
      expect(setup.needs_tailstock).toBe(false);
      expect(setup.needs_steady_rest).toBe(false);
      expect(setup.tailstock_force_n).toBe(0);
      expect(setup.steady_rest_position_mm).toBeUndefined();
    });

    it("medium part (L/D=5): tailstock yes, steady rest no", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        MEDIUM_PART, STEEL_1018, STANDARD_LOAD
      );

      expect(setup.ld_ratio).toBeCloseTo(5.0, 1);
      expect(setup.needs_tailstock).toBe(true);
      expect(setup.needs_steady_rest).toBe(false);
      expect(setup.tailstock_force_n).toBeGreaterThan(0);
    });

    it("long shaft (L/D=12): steady rest required at ~65% length", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        LONG_SHAFT, STEEL_1018, STANDARD_LOAD
      );

      expect(setup.ld_ratio).toBeCloseTo(12.0, 1);
      expect(setup.needs_tailstock).toBe(true);
      expect(setup.needs_steady_rest).toBe(true);
      expect(setup.steady_rest_position_mm).toBeCloseTo(300 * 0.65, 1);
    });

    it("extreme L/D (>15) generates warning", () => {
      const extremePart: PartGeometry = {
        max_od_mm: 15, min_od_mm: 15, overall_length_mm: 300,  // L/D = 20
      };
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        extremePart, STEEL_1018, STANDARD_LOAD
      );

      expect(setup.ld_ratio).toBeCloseTo(20.0, 1);
      expect(setup.warnings.some(w => w.code === "EXTREME_LD_RATIO")).toBe(true);
    });
  });

  // ============================================================================
  // GRIP FORCE PHYSICS
  // ============================================================================

  describe("Grip Force Physics", () => {
    it("heavy load with weak chuck triggers GRIP_FORCE_INADEQUATE error", () => {
      const weakChuck: ChuckSpec = {
        type: "3_jaw_scroll",
        max_grip_diameter_mm: 100,
        max_grip_force_kn: 0.5,  // very weak
        jaw_style: "smooth_hard",
        num_jaws: 3,
      };
      const heavyLoad: CuttingLoadInput = {
        max_cutting_force_n: 20000,
        max_axial_force_n: 8000,
        max_radial_force_n: 8000,
        dominant_operation: "roughing",
      };

      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, heavyLoad, [weakChuck]
      );

      expect(setup.grip_force_adequate).toBe(false);
      expect(setup.warnings.some(w => w.code === "GRIP_FORCE_INADEQUATE")).toBe(true);
    });

    it("light load with heavy chuck has large positive margin", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, ALUMINUM, LIGHT_LOAD
      );

      expect(setup.grip_force_adequate).toBe(true);
      expect(setup.grip_force_margin_percent).toBeGreaterThan(20);
    });

    it("grip force scales with cutting force (invariant check)", () => {
      const setup1 = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, LIGHT_LOAD
      );
      const setup2 = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, STANDARD_LOAD
      );

      expect(setup2.estimated_grip_force_required_kn).toBeGreaterThan(
        setup1.estimated_grip_force_required_kn
      );
    });

    it("serrated jaws require less grip force than smooth (friction invariant)", () => {
      const loadForTest: CuttingLoadInput = {
        max_cutting_force_n: 1500,
        max_axial_force_n: 600,
        max_radial_force_n: 540,
        dominant_operation: "roughing",
      };

      const serratedChuck: ChuckSpec = {
        type: "3_jaw_scroll", max_grip_diameter_mm: 200,
        max_grip_force_kn: 45, jaw_style: "serrated_hard", num_jaws: 3,
      };
      const smoothChuck: ChuckSpec = {
        type: "3_jaw_scroll", max_grip_diameter_mm: 200,
        max_grip_force_kn: 45, jaw_style: "smooth_hard", num_jaws: 3,
      };

      const setupSerrated = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, loadForTest, [serratedChuck]
      );
      const setupSmooth = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, loadForTest, [smoothChuck]
      );

      expect(setupSerrated.estimated_grip_force_required_kn).toBeLessThan(
        setupSmooth.estimated_grip_force_required_kn
      );
    });
  });

  // ============================================================================
  // SOFT JAW DETECTION
  // ============================================================================

  describe("Soft Jaw Detection", () => {
    it("thin-wall tube requires soft jaws", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        THIN_WALL_TUBE, STEEL_1018, LIGHT_LOAD
      );

      expect(setup.soft_jaw_required).toBe(true);
      const reasoningText = setup.reasoning.join(" ").toLowerCase();
      expect(reasoningText).toMatch(/thin wall|soft jaw/);
    });

    it("solid part does not require soft jaws", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, STANDARD_LOAD
      );

      expect(setup.soft_jaw_required).toBe(false);
    });

    it("soft material (aluminum) requires soft jaws", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, ALUMINUM, LIGHT_LOAD
      );

      expect(setup.soft_jaw_required).toBe(true);
    });
  });

  // ============================================================================
  // FEATURE-BASED PIPELINE
  // ============================================================================

  describe("Feature-Based Pipeline", () => {
    const JM_BUSHING: FeatureInput[] = [
      { id: "F1", type: "face", diameter_mm: 38.1, depth_mm: 1, tolerance_total_mm: 0.02 },
      { id: "F2", type: "od_turn", diameter_mm: 38.1, length_mm: 25, tolerance_total_mm: 0.015, is_critical: true },
      { id: "F3", type: "id_bore", diameter_mm: 25.4, depth_mm: 25, tolerance_total_mm: 0.012, is_critical: true },
    ];

    it("inferGeometry extracts OD and length from features", () => {
      const geo = lathePrintSetupSelectionEngine.inferGeometry(JM_BUSHING);
      expect(geo.max_od_mm).toBe(38.1);
      expect(geo.overall_length_mm).toBeGreaterThanOrEqual(25);
      expect(geo.has_through_hole).toBe(true);
      expect(geo.through_hole_id_mm).toBe(25.4);
    });

    it("inferGeometry throws on empty features", () => {
      expect(() => {
        lathePrintSetupSelectionEngine.inferGeometry([]);
      }).toThrow(/empty feature list/);
    });

    it("planFromFeatures runs full pipeline", () => {
      const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_BUSHING, STEEL_1018
      );
      const stock: StockInput = { od_mm: 45, length_mm: 50, id_mm: 0 };
      const seq = lathePrintSequencePlannerEngine.planSequence(strat, stock, JM_BUSHING);

      const setup = lathePrintSetupSelectionEngine.planFromFeatures(
        JM_BUSHING, STEEL_1018, seq
      );

      expect(setup.setup_id).toMatch(/^setup_/);
      expect(setup.chuck).toBeTruthy();
      expect(setup.ld_ratio).toBeGreaterThan(0);
    });

    it("estimateLoads uses higher kc for harder materials", () => {
      const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_BUSHING, ALUMINUM
      );
      const stock: StockInput = { od_mm: 45, length_mm: 50, id_mm: 0 };
      const seq = lathePrintSequencePlannerEngine.planSequence(strat, stock, JM_BUSHING);

      const loadsAl = lathePrintSetupSelectionEngine.estimateLoads(seq, ALUMINUM);
      const loadsInconel = lathePrintSetupSelectionEngine.estimateLoads(seq, INCONEL);

      expect(loadsInconel.max_cutting_force_n).toBeGreaterThan(loadsAl.max_cutting_force_n);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("Validation", () => {
    it("validate returns valid=true for adequate setup", () => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, LIGHT_LOAD
      );
      const result = lathePrintSetupSelectionEngine.validate(setup);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("validate returns valid=false for inadequate grip", () => {
      const weakChuck: ChuckSpec = {
        type: "collet", max_grip_diameter_mm: 60,
        max_grip_force_kn: 0.1, jaw_style: "smooth_hard", num_jaws: 3,
      };
      const heavyLoad: CuttingLoadInput = {
        max_cutting_force_n: 30000, max_axial_force_n: 12000,
        max_radial_force_n: 12000, dominant_operation: "roughing",
      };

      const setup = lathePrintSetupSelectionEngine.selectSetup(
        SHORT_PART, STEEL_1018, heavyLoad, [weakChuck]
      );
      const result = lathePrintSetupSelectionEngine.validate(setup);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ADVERSARIAL INPUTS
  // ============================================================================

  describe("Adversarial Inputs", () => {
    it("rejects OD below 0.1mm (schema)", () => {
      expect(() => {
        lathePrintSetupSelectionEngine.selectSetup(
          { max_od_mm: 0.05, min_od_mm: 0.05, overall_length_mm: 50 },
          STEEL_1018, STANDARD_LOAD
        );
      }).toThrow();
    });

    it("rejects OD above 500mm (schema)", () => {
      expect(() => {
        lathePrintSetupSelectionEngine.selectSetup(
          { max_od_mm: 600, min_od_mm: 600, overall_length_mm: 100 },
          STEEL_1018, STANDARD_LOAD
        );
      }).toThrow();
    });

    it("rejects NaN cutting force (schema)", () => {
      expect(() => {
        lathePrintSetupSelectionEngine.selectSetup(
          SHORT_PART, STEEL_1018,
          { max_cutting_force_n: Number.NaN, max_axial_force_n: 100, max_radial_force_n: 100, dominant_operation: "roughing" }
        );
      }).toThrow();
    });

    it("rejects negative force (schema: min=0)", () => {
      expect(() => {
        lathePrintSetupSelectionEngine.selectSetup(
          SHORT_PART, STEEL_1018,
          { max_cutting_force_n: -500, max_axial_force_n: 100, max_radial_force_n: 100, dominant_operation: "roughing" }
        );
      }).toThrow();
    });

    it("throws when part OD exceeds all available chucks", () => {
      const tinyChuck: ChuckSpec = {
        type: "collet", max_grip_diameter_mm: 10,
        max_grip_force_kn: 30, jaw_style: "smooth_hard", num_jaws: 3,
      };
      const largePart: PartGeometry = {
        max_od_mm: 400, min_od_mm: 400, overall_length_mm: 500,
      };

      expect(() => {
        lathePrintSetupSelectionEngine.selectSetup(
          largePart, STEEL_1018, STANDARD_LOAD, [tinyChuck]
        );
      }).toThrow(/No chuck/);
    });

    it("estimateLoads throws on invalid sequence plan", () => {
      expect(() => {
        lathePrintSetupSelectionEngine.estimateLoads(null as any, STEEL_1018);
      }).toThrow(/Invalid sequence plan/);
    });
  });

  // ============================================================================
  // MATERIAL VARIABILITY
  // ============================================================================

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("selects valid setup for $name (ISO $iso_group)", (mat) => {
      const setup = lathePrintSetupSelectionEngine.selectSetup(
        MEDIUM_PART, mat, STANDARD_LOAD
      );

      expect(setup.chuck.max_grip_diameter_mm).toBeGreaterThanOrEqual(MEDIUM_PART.max_od_mm);
      expect(setup.ld_ratio).toBeCloseTo(5.0, 1);
    });
  });

  // ============================================================================
  // DISPATCHER INTEGRATION
  // ============================================================================

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_p2p_setup_select", () => {
      expect(camActions).toContain("lathe_p2p_setup_select");
    });

    it("ACTIONS contains lathe_p2p_setup_from_features", () => {
      expect(camActions).toContain("lathe_p2p_setup_from_features");
    });

    it("ACTIONS contains lathe_p2p_setup_validate", () => {
      expect(camActions).toContain("lathe_p2p_setup_validate");
    });

    it("ACTIONS contains lathe_p2p_setup_infer_geometry", () => {
      expect(camActions).toContain("lathe_p2p_setup_infer_geometry");
    });
  });
});
