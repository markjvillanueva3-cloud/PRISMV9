/**
 * Electrode Pipeline Tests — ELEC-PIPE-MS0
 *
 * Tests for:
 * 1. Graphite physics constants
 * 2. ColdHeadingToolConfiguratorEngine
 * 3. AI reasoning integration
 * 4. Sinker EDM electrode spark gaps and duty cycles
 *
 * @module __tests__/electrode-pipeline.test
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CANONICAL_MATERIAL_DB,
  EDM_PHYSICS,
  kienzleForce,
} from "../physics/constants.js";
import {
  coldHeadingToolConfiguratorEngine,
  type ConfiguratorInput,
  type ToolingType,
} from "../engines/ColdHeadingToolConfiguratorEngine.js";

// ============================================================================
// GRAPHITE PHYSICS CONSTANTS
// ============================================================================

describe("Graphite Physics Constants", () => {
  describe("kc1.1 values (Agent 2 scrutiny fix P8)", () => {
    it("EDM-200 kc1.1 should be 150 N/mm² (coarse grain)", () => {
      const graphite = CANONICAL_MATERIAL_DB.graphite_edm200;
      expect(graphite).toBeDefined();
      expect(graphite.kc1_1).toBe(150);
      expect(graphite.mc).toBe(0.20);
    });

    it("EDM-3 kc1.1 should be 250 N/mm² (fine grain)", () => {
      const graphite = CANONICAL_MATERIAL_DB.graphite_edm3;
      expect(graphite).toBeDefined();
      expect(graphite.kc1_1).toBe(250);
      expect(graphite.mc).toBe(0.22);
    });

    it("POCO AF-5 kc1.1 should be 350 N/mm² (ultra-fine grain)", () => {
      const graphite = CANONICAL_MATERIAL_DB.graphite_af5;
      expect(graphite).toBeDefined();
      expect(graphite.kc1_1).toBe(350);
      expect(graphite.mc).toBe(0.25);
    });

    it("All graphite kc1.1 values should be in 100-350 range (NOT 500-800)", () => {
      const graphites = [
        CANONICAL_MATERIAL_DB.graphite_edm200,
        CANONICAL_MATERIAL_DB.graphite_edm3,
        CANONICAL_MATERIAL_DB.graphite_af5,
      ];
      for (const g of graphites) {
        expect(g.kc1_1).toBeGreaterThanOrEqual(100);
        expect(g.kc1_1).toBeLessThanOrEqual(350);
      }
    });
  });

  describe("Graphite thermal properties", () => {
    it("EDM-200 thermal conductivity should be ~85 W/(m·K)", () => {
      expect(CANONICAL_MATERIAL_DB.graphite_edm200.k_thermal).toBe(85);
    });

    it("Graphite density should be ~1780-1850 kg/m³", () => {
      expect(CANONICAL_MATERIAL_DB.graphite_edm200.density_kg_m3).toBeGreaterThanOrEqual(1750);
      expect(CANONICAL_MATERIAL_DB.graphite_af5.density_kg_m3).toBeLessThanOrEqual(1900);
    });

    it("Graphite sublimation temp should be 3650°C (not melting point)", () => {
      expect(CANONICAL_MATERIAL_DB.graphite_edm200.melting_point_C).toBe(3650);
    });
  });

  describe("Graphite electrode properties", () => {
    it("EDM-200 grain size should be 15µm (coarse)", () => {
      expect(CANONICAL_MATERIAL_DB.graphite_edm200.grain_size_um).toBe(15);
    });

    it("AF-5 grain size should be 1µm (ultra-fine)", () => {
      expect(CANONICAL_MATERIAL_DB.graphite_af5.grain_size_um).toBe(1);
    });

    it("EDM wear ratio should decrease with finer grain", () => {
      const edm200Wear = CANONICAL_MATERIAL_DB.graphite_edm200.edm_wear_ratio!;
      const edm3Wear = CANONICAL_MATERIAL_DB.graphite_edm3.edm_wear_ratio!;
      const af5Wear = CANONICAL_MATERIAL_DB.graphite_af5.edm_wear_ratio!;

      expect(edm200Wear).toBeGreaterThan(edm3Wear);
      expect(edm3Wear).toBeGreaterThan(af5Wear);
    });
  });

  describe("Copper-tungsten electrode (for carbide)", () => {
    it("CuW70 should exist for carbide workpieces", () => {
      const cuw = CANONICAL_MATERIAL_DB.copper_tungsten_cuw70;
      expect(cuw).toBeDefined();
      expect(cuw.name).toContain("Copper-Tungsten");
    });

    it("CuW70 should have very low EDM wear ratio", () => {
      expect(CANONICAL_MATERIAL_DB.copper_tungsten_cuw70.edm_wear_ratio).toBe(0.1);
    });
  });
});

// ============================================================================
// SINKER EDM PHYSICS (P10 scrutiny fix)
// ============================================================================

describe("Sinker EDM Physics (P10 Scrutiny Fix)", () => {
  describe("Spark gap constants (E18 fix)", () => {
    it("should have rough/semi/finish spark gaps for graphite", () => {
      const gaps = EDM_PHYSICS.sinker_spark_gap;
      expect(gaps.rough_mm.graphite).toBe(0.15);
      expect(gaps.semi_mm.graphite).toBe(0.08);
      expect(gaps.finish_mm.graphite).toBe(0.03);
    });

    it("CuW spark gaps should be smaller than graphite", () => {
      const gaps = EDM_PHYSICS.sinker_spark_gap;
      expect(gaps.rough_mm.copper_tungsten).toBeLessThan(gaps.rough_mm.graphite);
    });
  });

  describe("Duty cycle fix (P10)", () => {
    it("finish duty cycle should be 33-40% (NOT 56%)", () => {
      const duty = EDM_PHYSICS.sinker_duty_cycle;
      expect(duty.finish.min).toBe(0.33);
      expect(duty.finish.max).toBe(0.40);
      expect(duty.finish.typical).toBe(0.36);
    });

    it("rough duty cycle should be ~50%", () => {
      const duty = EDM_PHYSICS.sinker_duty_cycle;
      expect(duty.rough.typical).toBe(0.50);
    });

    it("super_finish duty cycle should be lowest (~28%)", () => {
      const duty = EDM_PHYSICS.sinker_duty_cycle;
      expect(duty.super_finish.typical).toBe(0.28);
    });
  });

  describe("Electrode polarity", () => {
    it("graphite on steel should be negative polarity", () => {
      expect(EDM_PHYSICS.sinker_polarity.graphite_on_steel).toBe("negative");
    });

    it("CuW on carbide should be positive polarity", () => {
      expect(EDM_PHYSICS.sinker_polarity.cuw_on_carbide).toBe("positive");
    });
  });

  describe("Kunieda efficiency for graphite electrodes", () => {
    it("should have graphite-specific eta values", () => {
      expect(EDM_PHYSICS.kunieda.eta_graphite_rough).toBe(0.50);
      expect(EDM_PHYSICS.kunieda.eta_graphite_finish).toBe(0.45);
    });
  });
});

// ============================================================================
// KIENZLE FORCE WITH GRAPHITE
// ============================================================================

describe("Kienzle Force with Graphite", () => {
  it("should calculate lower force for graphite vs steel", () => {
    const steelForce = kienzleForce(1800, 0.25, 2, 0.1); // Steel
    const graphiteForce = kienzleForce(250, 0.22, 2, 0.1); // EDM-3 graphite

    expect(graphiteForce).toBeLessThan(steelForce);
    // Graphite is ~7x easier to cut
    expect(steelForce / graphiteForce).toBeGreaterThan(5);
  });

  it("should calculate realistic graphite cutting force", () => {
    // EDM-3: kc1.1=250, mc=0.22, ap=2mm, fz=0.1mm
    const force = kienzleForce(250, 0.22, 2, 0.1);
    // Expected: 250 × 2 × 0.1^(1-0.22) = 250 × 2 × 0.166 = ~83N
    expect(force).toBeGreaterThan(50);
    expect(force).toBeLessThan(150);
  });
});

// ============================================================================
// COLD HEADING TOOL CONFIGURATOR ENGINE
// ============================================================================

describe("ColdHeadingToolConfiguratorEngine", () => {
  describe("Basic configuration", () => {
    it("should configure a mailbox round punch", async () => {
      const input: ConfiguratorInput = {
        tooling_type: "mailbox_round",
        dimensions: {
          type: "mailbox_round",
          major_dia_in: 0.5,
          length_in: 1.0,
          width_in: 0.25,
          slot_depth_in: 0.375,
        },
        workpiece_material: "D2",
        target_finish_Ra_um: 1.6,
        customer: "Test Customer",
        part_number: "TEST-001",
        ai_assist: false, // Skip AI for unit test speed
      };

      const output = await coldHeadingToolConfiguratorEngine.configure(input);

      expect(output.job_id).toMatch(/^TEST-/);
      expect(output.tooling_type).toBe("mailbox_round");
      expect(output.cavity_geometry).toBeDefined();
      expect(output.cavity_geometry.profile_points.length).toBeGreaterThan(0);
      expect(output.estimates.total_min).toBeGreaterThan(0);
    });

    it("should configure a taptite/trilobe die", async () => {
      const input: ConfiguratorInput = {
        tooling_type: "taptite_single",
        dimensions: {
          type: "taptite_single",
          major_dia_in: 0.25,
          length_in: 0.5,
          c1_dia_in: 0.26,
          e1_dia_in: 0.24,
          lobe_count: 3,
        },
        workpiece_material: "M2",
        target_finish_Ra_um: 0.8,
        ai_assist: false,
      };

      const output = await coldHeadingToolConfiguratorEngine.configure(input);

      expect(output.cavity_geometry.is_lobed).toBe(true);
      expect(output.cavity_geometry.lobe_params).toBeDefined();
      expect(output.cavity_geometry.lobe_params?.lobe_count).toBe(3);
    });
  });

  describe("Validation warnings", () => {
    it("should warn about carbide + graphite incompatibility", async () => {
      const input: ConfiguratorInput = {
        tooling_type: "heading_die_serrated",
        dimensions: {
          type: "heading_die_serrated",
          major_dia_in: 0.75,
          length_in: 1.5,
        },
        workpiece_material: "carbide",
        target_finish_Ra_um: 1.0,
        ai_assist: false,
      };

      const output = await coldHeadingToolConfiguratorEngine.configure(input);

      expect(output.warnings).toContain(
        "SAFETY: Carbide workpiece requires CuW electrode — graphite causes microcracking"
      );
    });

    it("should warn about invalid trilobe dimensions", async () => {
      const input: ConfiguratorInput = {
        tooling_type: "taptite_single",
        dimensions: {
          type: "taptite_single",
          major_dia_in: 0.25,
          length_in: 0.5,
          c1_dia_in: 0.20, // Invalid: C(1) < E(1)
          e1_dia_in: 0.24,
          lobe_count: 3,
        },
        workpiece_material: "D2",
        target_finish_Ra_um: 1.6,
        ai_assist: false,
      };

      const output = await coldHeadingToolConfiguratorEngine.configure(input);

      expect(output.warnings.some(w => w.includes("C(1) must be > E(1)"))).toBe(true);
    });
  });

  describe("Job history", () => {
    it("should store and retrieve jobs", async () => {
      const input: ConfiguratorInput = {
        tooling_type: "square_recess",
        dimensions: {
          type: "square_recess",
          major_dia_in: 0.375,
          length_in: 0.75,
        },
        workpiece_material: "S7",
        target_finish_Ra_um: 3.2,
        part_number: "HISTORY-TEST",
        ai_assist: false,
      };

      const output = await coldHeadingToolConfiguratorEngine.configure(input);
      const retrieved = coldHeadingToolConfiguratorEngine.getJob(output.job_id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.input.part_number).toBe("HISTORY-TEST");
    });

    it("should list recent jobs", () => {
      const jobs = coldHeadingToolConfiguratorEngine.listJobs(5);
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe("Cycle time estimates", () => {
    it("should estimate milling + sinker burn time", async () => {
      const input: ConfiguratorInput = {
        tooling_type: "heading_die_serrated",
        dimensions: {
          type: "heading_die_serrated",
          major_dia_in: 1.0,
          length_in: 2.0,
        },
        workpiece_material: "H13",
        target_finish_Ra_um: 1.6,
        ai_assist: false,
      };

      const output = await coldHeadingToolConfiguratorEngine.configure(input);

      expect(output.estimates.electrode_milling_min).toBeGreaterThan(0);
      expect(output.estimates.sinker_burn_min).toBeGreaterThan(0);
      expect(output.estimates.total_min).toBe(
        output.estimates.electrode_milling_min + output.estimates.sinker_burn_min
      );
    });
  });

  describe("Engine statistics", () => {
    it("should report stats", () => {
      const stats = coldHeadingToolConfiguratorEngine.stats();
      expect(stats.tooling_types_supported).toBe(10);
      expect(stats.jobs_configured).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// TOOLING TYPE COVERAGE
// ============================================================================

describe("Tooling Type Coverage", () => {
  const toolingTypes: ToolingType[] = [
    "mailbox_round",
    "mailbox_square",
    "altracs_standard",
    "altracs_orbit",
    "square_recess",
    "heading_die_serrated",
    "taptite_single",
    "taptite_triple",
    "td_tooling",
    "template_custom",
  ];

  it.each(toolingTypes)("should handle %s tooling type", async (type) => {
    const isLobe = type === "taptite_single" || type === "taptite_triple";
    const isMailbox = type.startsWith("mailbox_");

    const dimensions: any = {
      type,
      major_dia_in: 0.5,
      length_in: 1.0,
    };

    if (isMailbox) {
      dimensions.width_in = 0.25;
      dimensions.slot_depth_in = 0.375;
    }

    if (isLobe) {
      dimensions.c1_dia_in = 0.52;
      dimensions.e1_dia_in = 0.48;
      dimensions.lobe_count = 3;
    }

    const input: ConfiguratorInput = {
      tooling_type: type,
      dimensions,
      workpiece_material: "D2",
      target_finish_Ra_um: 1.6,
      ai_assist: false,
    };

    const output = await coldHeadingToolConfiguratorEngine.configure(input);

    expect(output.tooling_type).toBe(type);
    expect(output.cavity_geometry).toBeDefined();
    expect(output.job_id).toBeDefined();
  });
});
