/**
 * Tests for U-HKC32: Machine Config + Collision + Stock Verification + Travel Limit Schemas
 *
 * Validates 13 simulation core Zod schemas, metadata, DFM-critical params,
 * DFM-BLOCKING params, AC Python setter naming, and total parameter counts.
 *
 * @milestone HM-KC-MS6/U-HKC32
 */

import { describe, it, expect } from "vitest";
import {
  SIMULATION_CORE_SCHEMA_MAP,
  SIMULATION_CORE_METADATA,
  SIMULATION_CORE_TOTAL_PARAM_COUNT,
  loadKinematicSchema,
  configureAxesSchema,
  setLimitsSchema,
  fullSimulationSchema,
  quickCheckSchema,
  perOperationCheckSchema,
  perBlockCheckSchema,
  materialRemovalSchema,
  restMaterialSchema,
  gougeDetectionSchema,
  axisTravelCheckSchema,
  rotaryLimitsSchema,
  singularityAvoidanceSchema,
  type SimulationCoreType,
  type SimulationCoreMeta,
} from "../schemas/hypermill/simulation/simulationCoreSchemas.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeLoadKinematic(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    machine_id: "DMG_DMU50",
    machine_type: "5axis",
    kinematic_model: "dmu50_kinematic_v2",
    axis_names: ["X", "Y", "Z", "B", "C"],
    rotary_a_range: 0,
    rotary_b_range: 110,
    rotary_c_range: 360,
    linear_x_range: 500,
    linear_y_range: 450,
    linear_z_range: 400,
    home_position_xyz: [0, 0, 400],
    tool_change_position_xyz: [0, 0, 400],
    ...overrides,
  };
}

function makeFullSimulation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    check_scope: "all",
    collision_tolerance: 0.1,
    near_miss_distance: 2.0,
    check_tool: true,
    check_holder: true,
    check_spindle: true,
    check_fixtures: true,
    check_part: true,
    animation_speed: "5x",
    save_results: true,
    halt_on_collision: true,
    display_collision_zone: true,
    ...overrides,
  };
}

function makeGougeDetection(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gouge_tolerance: 0.01,
    detect_mode: "both",
    highlight_gouges: true,
    gouge_color: "#FF0000",
    max_gouge_depth: 0.5,
    report_gouge_locations: true,
    gouge_coordinate_system: "wcs",
    auto_fix_suggestion: true,
    block_nc_on_gouge: false,
    export_gouge_report: true,
    severity_classification: "critical",
    ...overrides,
  };
}

function makeAxisTravelCheck(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    check_linear_x: true,
    check_linear_y: true,
    check_linear_z: true,
    check_rotary_a: true,
    check_rotary_b: true,
    check_rotary_c: true,
    margin_mm: 5,
    margin_deg: 2,
    block_on_exceed: true,
    report_exceeded_axes: true,
    ...overrides,
  };
}

// ── 1. Schema Map ───────────────────────────────────────────────────────────

describe("SIMULATION_CORE_SCHEMA_MAP", () => {
  it("contains exactly 13 types", () => {
    const keys = Object.keys(SIMULATION_CORE_SCHEMA_MAP);
    expect(keys).toHaveLength(13);
  });

  it("has all expected type keys", () => {
    const expected: SimulationCoreType[] = [
      "load_kinematic",
      "configure_axes",
      "set_limits",
      "full_simulation",
      "quick_check",
      "per_operation_check",
      "per_block_check",
      "material_removal",
      "rest_material",
      "gouge_detection",
      "axis_travel_check",
      "rotary_limits",
      "singularity_avoidance",
    ];
    for (const key of expected) {
      expect(SIMULATION_CORE_SCHEMA_MAP).toHaveProperty(key);
    }
  });
});

// ── 2. Total Param Count ────────────────────────────────────────────────────

describe("SIMULATION_CORE_TOTAL_PARAM_COUNT", () => {
  it("is at least 140 parameters", () => {
    expect(SIMULATION_CORE_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(140);
  });

  it("equals exactly 145 (12+12+11 + 12+10+11+12 + 12+12+11 + 10+10+10)", () => {
    expect(SIMULATION_CORE_TOTAL_PARAM_COUNT).toBe(145);
  });
});

// ── 3. Metadata ─────────────────────────────────────────────────────────────

describe("SIMULATION_CORE_METADATA", () => {
  it("has metadata for all 13 types", () => {
    expect(Object.keys(SIMULATION_CORE_METADATA)).toHaveLength(13);
  });

  it("all setters start with hm.simulation.", () => {
    for (const [key, meta] of Object.entries(SIMULATION_CORE_METADATA)) {
      expect(meta.acPythonSetter).toBe(`hm.simulation.${key}`);
    }
  });

  it("all descriptions are non-empty strings", () => {
    for (const meta of Object.values(SIMULATION_CORE_METADATA)) {
      expect(typeof meta.description).toBe("string");
      expect(meta.description.length).toBeGreaterThan(10);
    }
  });

  it("paramCount sums match SIMULATION_CORE_TOTAL_PARAM_COUNT", () => {
    const computed = Object.values(SIMULATION_CORE_METADATA).reduce(
      (sum, m) => sum + m.paramCount,
      0,
    );
    expect(computed).toBe(SIMULATION_CORE_TOTAL_PARAM_COUNT);
  });
});

// ── 4. Machine Config Schemas ───────────────────────────────────────────────

describe("Machine Config schemas", () => {
  describe("loadKinematicSchema", () => {
    it("parses valid 5-axis machine config", () => {
      const result = loadKinematicSchema.safeParse(makeLoadKinematic());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.machine_id).toBe("DMG_DMU50");
        expect(result.data.machine_type).toBe("5axis");
        expect(result.data.home_position_xyz).toEqual([0, 0, 400]);
      }
    });

    it("rejects invalid machine_type enum", () => {
      const result = loadKinematicSchema.safeParse(
        makeLoadKinematic({ machine_type: "6axis" }),
      );
      expect(result.success).toBe(false);
    });

    it("rejects rotary range outside -360..360", () => {
      const result = loadKinematicSchema.safeParse(
        makeLoadKinematic({ rotary_b_range: 400 }),
      );
      expect(result.success).toBe(false);
    });

    it("rejects home_position_xyz with wrong length", () => {
      const result = loadKinematicSchema.safeParse(
        makeLoadKinematic({ home_position_xyz: [0, 0] }),
      );
      expect(result.success).toBe(false);
    });

    it("has 12 parameters", () => {
      expect(SIMULATION_CORE_METADATA.load_kinematic.paramCount).toBe(12);
    });
  });

  describe("configureAxesSchema", () => {
    it("parses valid axis configuration", () => {
      const data = {
        a_axis_type: "rotary",
        b_axis_type: "rotary",
        c_axis_type: "none",
        a_axis_direction: "positive",
        b_axis_direction: "negative",
        c_axis_direction: "positive",
        pivot_point_x: 0,
        pivot_point_y: 0,
        pivot_point_z: 250,
        head_type: "fork",
        table_type: "trunnion",
        spindle_bearing_count: 4,
      };
      const result = configureAxesSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.head_type).toBe("fork");
        expect(result.data.table_type).toBe("trunnion");
      }
    });

    it("has 12 parameters", () => {
      expect(SIMULATION_CORE_METADATA.configure_axes.paramCount).toBe(12);
    });
  });

  describe("setLimitsSchema", () => {
    it("parses valid machine limits", () => {
      const data = {
        max_spindle_speed: 20000,
        max_feed_rate: 15000,
        max_rapid: 48000,
        min_spindle_speed: 50,
        acceleration_limit: 9.81,
        jerk_limit: 50,
        max_tool_weight: 25,
        max_tool_length: 400,
        max_tool_diameter: 125,
        coolant_pressure_max: 70,
        spindle_power: 35,
      };
      const result = setLimitsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max_spindle_speed).toBe(20000);
        expect(result.data.spindle_power).toBe(35);
      }
    });

    it("has 11 parameters", () => {
      expect(SIMULATION_CORE_METADATA.set_limits.paramCount).toBe(11);
    });

    it("DFM-critical params include max_spindle_speed and max_feed_rate", () => {
      expect(SIMULATION_CORE_METADATA.set_limits.dfmCriticalParams).toContain("max_spindle_speed");
      expect(SIMULATION_CORE_METADATA.set_limits.dfmCriticalParams).toContain("max_feed_rate");
    });
  });
});

// ── 5. Collision Simulation Schemas ─────────────────────────────────────────

describe("Collision Simulation schemas", () => {
  describe("fullSimulationSchema", () => {
    it("parses valid full simulation config", () => {
      const result = fullSimulationSchema.safeParse(makeFullSimulation());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collision_tolerance).toBe(0.1);
        expect(result.data.halt_on_collision).toBe(true);
      }
    });

    it("halt_on_collision defaults to true (DFM-BLOCKING)", () => {
      const input = makeFullSimulation();
      delete (input as Record<string, unknown>).halt_on_collision;
      const result = fullSimulationSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.halt_on_collision).toBe(true);
      }
    });

    it("collision_tolerance range 0.001..10", () => {
      const tooLow = fullSimulationSchema.safeParse(
        makeFullSimulation({ collision_tolerance: 0.0001 }),
      );
      expect(tooLow.success).toBe(false);

      const tooHigh = fullSimulationSchema.safeParse(
        makeFullSimulation({ collision_tolerance: 11 }),
      );
      expect(tooHigh.success).toBe(false);

      const justRight = fullSimulationSchema.safeParse(
        makeFullSimulation({ collision_tolerance: 0.001 }),
      );
      expect(justRight.success).toBe(true);
    });

    it("has 12 parameters", () => {
      expect(SIMULATION_CORE_METADATA.full_simulation.paramCount).toBe(12);
    });

    it("DFM-BLOCKING includes halt_on_collision", () => {
      expect(SIMULATION_CORE_METADATA.full_simulation.dfmBlockingParams).toContain(
        "halt_on_collision",
      );
    });
  });

  describe("quickCheckSchema", () => {
    it("parses valid quick check config", () => {
      const data = {
        scope: "all",
        tolerance: 0.05,
        check_rapid_only: false,
        approximate_model: true,
        skip_safe_zones: false,
        timeout_seconds: 300,
        report_near_miss: true,
        near_miss_threshold: 1.0,
        parallel_check: true,
        max_threads: 8,
      };
      const result = quickCheckSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max_threads).toBe(8);
      }
    });

    it("has 10 parameters", () => {
      expect(SIMULATION_CORE_METADATA.quick_check.paramCount).toBe(10);
    });
  });

  describe("perOperationCheckSchema", () => {
    it("parses valid per-operation check", () => {
      const data = {
        operation_id: "OP-001-ROUGH",
        detailed_report: true,
        check_approach: true,
        check_retract: true,
        check_linking: true,
        check_cut: true,
        min_clearance: 0.5,
        export_collision_points: true,
        collision_point_format: "json",
        include_tool_change: true,
        verify_holder_fit: true,
      };
      const result = perOperationCheckSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation_id).toBe("OP-001-ROUGH");
        expect(result.data.collision_point_format).toBe("json");
      }
    });

    it("has 11 parameters", () => {
      expect(SIMULATION_CORE_METADATA.per_operation_check.paramCount).toBe(11);
    });
  });

  describe("perBlockCheckSchema", () => {
    it("parses valid per-block check", () => {
      const data = {
        start_block: 100,
        end_block: 500,
        step_mode: "single_block",
        highlight_collision: true,
        collision_color: "#FF0000",
        pause_on_collision: true,
        record_tool_path: true,
        show_material_removal: true,
        show_rest_material: false,
        deviation_check: true,
        max_deviation: 0.01,
        block_feed_override: 100,
      };
      const result = perBlockCheckSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collision_color).toBe("#FF0000");
        expect(result.data.pause_on_collision).toBe(true);
      }
    });

    it("collision_color defaults to #FF0000", () => {
      const data = {
        start_block: 0,
        end_block: 100,
        step_mode: "continuous",
        highlight_collision: true,
        pause_on_collision: true,
        record_tool_path: false,
        show_material_removal: false,
        show_rest_material: false,
        deviation_check: false,
        max_deviation: 0.01,
        block_feed_override: 100,
      };
      const result = perBlockCheckSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collision_color).toBe("#FF0000");
      }
    });

    it("has 12 parameters", () => {
      expect(SIMULATION_CORE_METADATA.per_block_check.paramCount).toBe(12);
    });
  });
});

// ── 6. Stock Verification Schemas ───────────────────────────────────────────

describe("Stock Verification schemas", () => {
  describe("materialRemovalSchema", () => {
    it("parses valid material removal config", () => {
      const data = {
        verification_tolerance: 0.01,
        display_mode: "solid",
        color_by_operation: true,
        rest_material_color: "#808080",
        removed_material_color: "#00FF00",
        comparison_reference: "finished_part",
        section_view: false,
        section_plane: "xz",
        animation: true,
        save_each_operation: true,
        export_stl: false,
        stl_quality: "medium",
      };
      const result = materialRemovalSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.verification_tolerance).toBe(0.01);
        expect(result.data.comparison_reference).toBe("finished_part");
      }
    });

    it("verification_tolerance range 0.001..1.0", () => {
      const tooHigh = materialRemovalSchema.safeParse({
        verification_tolerance: 1.1,
        display_mode: "solid",
        color_by_operation: false,
        rest_material_color: "#808080",
        removed_material_color: "#00FF00",
        comparison_reference: "stock",
        section_view: false,
        section_plane: "xy",
        animation: false,
        save_each_operation: false,
        export_stl: false,
        stl_quality: "coarse",
      });
      expect(tooHigh.success).toBe(false);
    });

    it("has 12 parameters", () => {
      expect(SIMULATION_CORE_METADATA.material_removal.paramCount).toBe(12);
    });
  });

  describe("restMaterialSchema", () => {
    it("parses valid rest material config", () => {
      const data = {
        min_rest_threshold: 0.5,
        display_rest: true,
        rest_color: "#FFAA00",
        highlight_excess: true,
        excess_threshold: 2.0,
        rest_volume_compute: true,
        rest_mass_compute: true,
        material_density: 7850,
        compare_to_target: true,
        target_tolerance: 0.05,
        export_rest_model: false,
        auto_detect_uncut: true,
      };
      const result = restMaterialSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.material_density).toBe(7850);
        expect(result.data.min_rest_threshold).toBe(0.5);
      }
    });

    it("DFM-critical params include min_rest_threshold", () => {
      expect(SIMULATION_CORE_METADATA.rest_material.dfmCriticalParams).toContain(
        "min_rest_threshold",
      );
    });

    it("has 12 parameters", () => {
      expect(SIMULATION_CORE_METADATA.rest_material.paramCount).toBe(12);
    });
  });

  describe("gougeDetectionSchema", () => {
    it("parses valid gouge detection config", () => {
      const result = gougeDetectionSchema.safeParse(makeGougeDetection());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gouge_tolerance).toBe(0.01);
        expect(result.data.gouge_color).toBe("#FF0000");
      }
    });

    it("gouge_tolerance range 0.001..0.5", () => {
      const tooLow = gougeDetectionSchema.safeParse(
        makeGougeDetection({ gouge_tolerance: 0.0005 }),
      );
      expect(tooLow.success).toBe(false);

      const tooHigh = gougeDetectionSchema.safeParse(
        makeGougeDetection({ gouge_tolerance: 0.6 }),
      );
      expect(tooHigh.success).toBe(false);

      const atMin = gougeDetectionSchema.safeParse(
        makeGougeDetection({ gouge_tolerance: 0.001 }),
      );
      expect(atMin.success).toBe(true);

      const atMax = gougeDetectionSchema.safeParse(
        makeGougeDetection({ gouge_tolerance: 0.5 }),
      );
      expect(atMax.success).toBe(true);
    });

    it("gouge_color defaults to #FF0000", () => {
      const input = makeGougeDetection();
      delete (input as Record<string, unknown>).gouge_color;
      const result = gougeDetectionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gouge_color).toBe("#FF0000");
      }
    });

    it("block_nc_on_gouge is DFM-BLOCKING", () => {
      expect(SIMULATION_CORE_METADATA.gouge_detection.dfmBlockingParams).toContain(
        "block_nc_on_gouge",
      );
    });

    it("DFM-critical params include gouge_tolerance", () => {
      expect(SIMULATION_CORE_METADATA.gouge_detection.dfmCriticalParams).toContain(
        "gouge_tolerance",
      );
    });

    it("has 11 parameters", () => {
      expect(SIMULATION_CORE_METADATA.gouge_detection.paramCount).toBe(11);
    });
  });
});

// ── 7. Travel Limits Schemas ────────────────────────────────────────────────

describe("Travel Limits schemas", () => {
  describe("axisTravelCheckSchema", () => {
    it("parses valid axis travel check config", () => {
      const result = axisTravelCheckSchema.safeParse(makeAxisTravelCheck());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.margin_mm).toBe(5);
        expect(result.data.margin_deg).toBe(2);
        expect(result.data.block_on_exceed).toBe(true);
      }
    });

    it("block_on_exceed defaults to true (DFM-BLOCKING)", () => {
      const result = axisTravelCheckSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.block_on_exceed).toBe(true);
      }
    });

    it("DFM-BLOCKING includes block_on_exceed", () => {
      expect(SIMULATION_CORE_METADATA.axis_travel_check.dfmBlockingParams).toContain(
        "block_on_exceed",
      );
    });

    it("margin_mm range 0..50 with default 5", () => {
      const tooHigh = axisTravelCheckSchema.safeParse(
        makeAxisTravelCheck({ margin_mm: 51 }),
      );
      expect(tooHigh.success).toBe(false);

      const withDefault = axisTravelCheckSchema.safeParse({});
      expect(withDefault.success).toBe(true);
      if (withDefault.success) {
        expect(withDefault.data.margin_mm).toBe(5);
      }
    });

    it("margin_deg range 0..10 with default 2", () => {
      const tooHigh = axisTravelCheckSchema.safeParse(
        makeAxisTravelCheck({ margin_deg: 11 }),
      );
      expect(tooHigh.success).toBe(false);

      const withDefault = axisTravelCheckSchema.safeParse({});
      expect(withDefault.success).toBe(true);
      if (withDefault.success) {
        expect(withDefault.data.margin_deg).toBe(2);
      }
    });

    it("has 10 parameters", () => {
      expect(SIMULATION_CORE_METADATA.axis_travel_check.paramCount).toBe(10);
    });
  });

  describe("rotaryLimitsSchema", () => {
    it("parses valid rotary limits", () => {
      const data = {
        a_min: -120,
        a_max: 120,
        b_min: -110,
        b_max: 110,
        c_min: -360,
        c_max: 360,
        wrap_around: false,
        shortest_path: true,
        singularity_zone_start: -5,
        singularity_zone_end: 5,
      };
      const result = rotaryLimitsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.a_min).toBe(-120);
        expect(result.data.a_max).toBe(120);
        expect(result.data.shortest_path).toBe(true);
      }
    });

    it("wrap_around defaults to false", () => {
      const data = {
        a_min: 0,
        a_max: 360,
        b_min: 0,
        b_max: 360,
        c_min: 0,
        c_max: 360,
        shortest_path: true,
        singularity_zone_start: 0,
        singularity_zone_end: 0,
      };
      const result = rotaryLimitsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.wrap_around).toBe(false);
      }
    });

    it("shortest_path defaults to true", () => {
      const data = {
        a_min: 0,
        a_max: 360,
        b_min: 0,
        b_max: 360,
        c_min: 0,
        c_max: 360,
        wrap_around: false,
        singularity_zone_start: 0,
        singularity_zone_end: 0,
      };
      const result = rotaryLimitsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shortest_path).toBe(true);
      }
    });

    it("has 10 parameters", () => {
      expect(SIMULATION_CORE_METADATA.rotary_limits.paramCount).toBe(10);
    });
  });

  describe("singularityAvoidanceSchema", () => {
    it("parses valid singularity avoidance config", () => {
      const data = {
        singularity_check: true,
        singularity_threshold: 2.0,
        avoidance_strategy: "tilt_away",
        max_tilt_deviation: 5.0,
        warning_zone: 10,
        critical_zone: 3,
        auto_split: true,
        split_tolerance: 0.5,
        report_singularities: true,
        alternative_solution_count: 3,
      };
      const result = singularityAvoidanceSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.avoidance_strategy).toBe("tilt_away");
        expect(result.data.alternative_solution_count).toBe(3);
      }
    });

    it("singularity_threshold range 0.1..10 (DFM-critical)", () => {
      const tooLow = singularityAvoidanceSchema.safeParse({
        singularity_check: true,
        singularity_threshold: 0.05,
        avoidance_strategy: "retract",
        max_tilt_deviation: 5,
        warning_zone: 10,
        critical_zone: 3,
        auto_split: false,
        split_tolerance: 1,
        report_singularities: true,
        alternative_solution_count: 1,
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = singularityAvoidanceSchema.safeParse({
        singularity_check: true,
        singularity_threshold: 11,
        avoidance_strategy: "retract",
        max_tilt_deviation: 5,
        warning_zone: 10,
        critical_zone: 3,
        auto_split: false,
        split_tolerance: 1,
        report_singularities: true,
        alternative_solution_count: 1,
      });
      expect(tooHigh.success).toBe(false);
    });

    it("singularity_check defaults to true", () => {
      const data = {
        singularity_threshold: 2,
        avoidance_strategy: "split_path",
        max_tilt_deviation: 5,
        warning_zone: 10,
        critical_zone: 3,
        auto_split: true,
        split_tolerance: 0.5,
        report_singularities: true,
        alternative_solution_count: 2,
      };
      const result = singularityAvoidanceSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.singularity_check).toBe(true);
      }
    });

    it("alternative_solution_count range 1..5", () => {
      const tooHigh = singularityAvoidanceSchema.safeParse({
        singularity_check: true,
        singularity_threshold: 2,
        avoidance_strategy: "tilt_away",
        max_tilt_deviation: 5,
        warning_zone: 10,
        critical_zone: 3,
        auto_split: false,
        split_tolerance: 1,
        report_singularities: true,
        alternative_solution_count: 6,
      });
      expect(tooHigh.success).toBe(false);
    });

    it("DFM-critical params include singularity_threshold", () => {
      expect(SIMULATION_CORE_METADATA.singularity_avoidance.dfmCriticalParams).toContain(
        "singularity_threshold",
      );
    });

    it("has 10 parameters", () => {
      expect(SIMULATION_CORE_METADATA.singularity_avoidance.paramCount).toBe(10);
    });
  });
});
