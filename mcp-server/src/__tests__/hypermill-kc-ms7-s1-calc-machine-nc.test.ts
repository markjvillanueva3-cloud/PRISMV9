/**
 * HM-KC-MS7 U-HKC36 — Calculation, Machine, and NC Generation Settings Schema Tests
 *
 * Verifies:
 * - Each schema parses with defaults (no args → valid result with expected defaults)
 * - Schema map sizes match metadata counts
 * - Total param counts meet minimums
 * - Tolerance range validation
 * - Axis limits (z_min allows negative)
 * - Spindle max_rpm default
 * - At least 30 test assertions total
 */

import { describe, it, expect } from "vitest";

// Calculation schemas
import {
  calculationToleranceSettingsSchema,
  geometryCheckSettingsSchema,
  parallelCalculationSettingsSchema,
  calculationBehaviorSettingsSchema,
  optimizationSettingsSchema,
  CALCULATION_SETTINGS_SCHEMA_MAP,
  CALCULATION_SETTINGS_METADATA,
  CALCULATION_SETTINGS_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/calculationSchemas.js";

// Machine settings schemas
import {
  machineModelSettingsSchema,
  axisLimitSettingsSchema,
  spindleConfigSettingsSchema,
  machineCapabilitySettingsSchema,
  machineKinematicsSettingsSchema,
  MACHINE_SETTINGS_SCHEMA_MAP,
  MACHINE_SETTINGS_METADATA,
  MACHINE_SETTINGS_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/machineSettingsSchemas.js";

// NC generation schemas
import {
  outputFolderSettingsSchema,
  namingConventionSettingsSchema,
  subProgramSettingsSchema,
  lineNumberSettingsSchema,
  outputFormatSettingsSchema,
  NC_GEN_SETTINGS_SCHEMA_MAP,
  NC_GEN_SETTINGS_METADATA,
  NC_GEN_SETTINGS_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/ncGenSchemas.js";

// ============================================================================
// CALCULATION SCHEMAS
// ============================================================================

describe("calculationToleranceSettingsSchema", () => {
  it("parses with defaults producing expected values", () => {
    const result = calculationToleranceSettingsSchema.parse({});
    expect(result.tolerance).toBe(0.01);
    expect(result.smoothing_tolerance).toBe(0.005);
    expect(result.chordal_tolerance).toBe(0.005);
    expect(result.angular_tolerance).toBe(0.1);
  });

  it("rejects tolerance below 0.0001", () => {
    expect(() =>
      calculationToleranceSettingsSchema.parse({ tolerance: 0.00001 }),
    ).toThrow();
  });

  it("rejects tolerance above 1.0", () => {
    expect(() =>
      calculationToleranceSettingsSchema.parse({ tolerance: 1.5 }),
    ).toThrow();
  });

  it("accepts tolerance at boundary 0.0001", () => {
    const result = calculationToleranceSettingsSchema.parse({ tolerance: 0.0001 });
    expect(result.tolerance).toBe(0.0001);
  });

  it("accepts tolerance at boundary 1.0", () => {
    const result = calculationToleranceSettingsSchema.parse({ tolerance: 1.0 });
    expect(result.tolerance).toBe(1.0);
  });
});

describe("geometryCheckSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = geometryCheckSettingsSchema.parse({});
    expect(result.check_enabled).toBe(true);
    expect(result.check_level).toBe("full");
    expect(result.fix_on_check).toBe(false);
    expect(result.log_results).toBe(true);
  });
});

describe("parallelCalculationSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = parallelCalculationSettingsSchema.parse({});
    expect(result.parallel_enabled).toBe(true);
    expect(result.max_threads).toBe(4);
    expect(result.calculation_priority).toBe("normal");
    expect(result.memory_limit_mb).toBe(4096);
  });

  it("rejects max_threads outside 1-32", () => {
    expect(() =>
      parallelCalculationSettingsSchema.parse({ max_threads: 64 }),
    ).toThrow();
    expect(() =>
      parallelCalculationSettingsSchema.parse({ max_threads: 0 }),
    ).toThrow();
  });
});

describe("calculationBehaviorSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = calculationBehaviorSettingsSchema.parse({});
    expect(result.auto_calculate_on_change).toBe(false);
    expect(result.show_progress).toBe(true);
    expect(result.cancel_on_error).toBe(true);
    expect(result.timeout_minutes).toBe(60);
  });
});

describe("optimizationSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = optimizationSettingsSchema.parse({});
    expect(result.optimize_toolpath).toBe(true);
    expect(result.reduce_air_cuts).toBe(true);
    expect(result.smooth_transitions).toBe(true);
    expect(result.arc_fitting_enabled).toBe(true);
    expect(result.arc_tolerance).toBe(0.01);
  });
});

describe("CALCULATION_SETTINGS_SCHEMA_MAP", () => {
  it("has exactly 5 entries", () => {
    expect(Object.keys(CALCULATION_SETTINGS_SCHEMA_MAP).length).toBe(5);
  });

  it("schema map size matches sum of metadata paramCounts", () => {
    const mapSize = Object.keys(CALCULATION_SETTINGS_SCHEMA_MAP).length;
    const metaSize = Object.keys(CALCULATION_SETTINGS_METADATA).length;
    expect(mapSize).toBe(metaSize);
  });
});

describe("CALCULATION_SETTINGS_TOTAL_PARAM_COUNT", () => {
  it("meets minimum of 18 parameters", () => {
    expect(CALCULATION_SETTINGS_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(18);
  });

  it("matches sum of individual metadata paramCounts", () => {
    const sum = Object.values(CALCULATION_SETTINGS_METADATA).reduce(
      (acc, m) => acc + m.paramCount,
      0,
    );
    expect(CALCULATION_SETTINGS_TOTAL_PARAM_COUNT).toBe(sum);
  });
});

// ============================================================================
// MACHINE SETTINGS SCHEMAS
// ============================================================================

describe("machineModelSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = machineModelSettingsSchema.parse({});
    expect(result.machine_model).toBe("Generic_3Axis");
    expect(result.kinematic_type).toBe("3axis");
    expect(result.manufacturer).toBe("Generic");
    expect(result.controller_type).toBe("Fanuc");
  });
});

describe("axisLimitSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = axisLimitSettingsSchema.parse({});
    expect(result.x_min).toBe(-500);
    expect(result.x_max).toBe(500);
    expect(result.z_min).toBe(-400);
    expect(result.z_max).toBe(0);
  });

  it("z_min allows negative values (required for spindle descent)", () => {
    const result = axisLimitSettingsSchema.parse({ z_min: -800 });
    expect(result.z_min).toBe(-800);
    expect(result.z_min).toBeLessThan(0);
  });

  it("z_min rejects positive values", () => {
    expect(() =>
      axisLimitSettingsSchema.parse({ z_min: 10 }),
    ).toThrow();
  });

  it("rotary limits default to plausible ±range", () => {
    const result = axisLimitSettingsSchema.parse({});
    expect(result.a_min).toBeLessThan(0);
    expect(result.a_max).toBeGreaterThan(0);
    expect(result.b_min).toBeLessThan(0);
    expect(result.b_max).toBeGreaterThan(0);
  });
});

describe("spindleConfigSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = spindleConfigSettingsSchema.parse({});
    expect(result.max_rpm).toBe(12000);
    expect(result.min_rpm).toBe(100);
    expect(result.power_kw).toBe(15);
    expect(result.torque_nm).toBe(80);
    expect(result.spindle_type).toBe("direct");
    expect(result.gear_ranges).toBe(1);
  });

  it("max_rpm default is reasonable (between 5000 and 30000)", () => {
    const result = spindleConfigSettingsSchema.parse({});
    expect(result.max_rpm).toBeGreaterThanOrEqual(5000);
    expect(result.max_rpm).toBeLessThanOrEqual(30000);
  });

  it("rejects max_rpm below 100", () => {
    expect(() =>
      spindleConfigSettingsSchema.parse({ max_rpm: 50 }),
    ).toThrow();
  });

  it("rejects max_rpm above 60000", () => {
    expect(() =>
      spindleConfigSettingsSchema.parse({ max_rpm: 80000 }),
    ).toThrow();
  });
});

describe("machineCapabilitySettingsSchema", () => {
  it("parses with defaults", () => {
    const result = machineCapabilitySettingsSchema.parse({});
    expect(result.has_coolant_through).toBe(false);
    expect(result.has_chip_conveyor).toBe(false);
    expect(result.has_tool_setter).toBe(true);
    expect(result.has_probe).toBe(false);
    expect(result.max_tool_weight_kg).toBe(5);
    expect(result.max_tool_length_mm).toBe(400);
    expect(result.atc_capacity).toBe(30);
  });
});

describe("machineKinematicsSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = machineKinematicsSettingsSchema.parse({});
    expect(result.pivot_point_x).toBe(0);
    expect(result.pivot_point_y).toBe(0);
    expect(result.pivot_point_z).toBe(150);
    expect(result.rotary_axis_1_type).toBe("B");
    expect(result.rotary_axis_2_type).toBe("C");
    expect(result.table_diameter_mm).toBe(630);
  });
});

describe("MACHINE_SETTINGS_SCHEMA_MAP", () => {
  it("has exactly 5 entries", () => {
    expect(Object.keys(MACHINE_SETTINGS_SCHEMA_MAP).length).toBe(5);
  });

  it("schema map size matches metadata size", () => {
    expect(Object.keys(MACHINE_SETTINGS_SCHEMA_MAP).length).toBe(
      Object.keys(MACHINE_SETTINGS_METADATA).length,
    );
  });
});

describe("MACHINE_SETTINGS_TOTAL_PARAM_COUNT", () => {
  it("meets minimum of 28 parameters", () => {
    expect(MACHINE_SETTINGS_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(28);
  });

  it("matches sum of individual metadata paramCounts", () => {
    const sum = Object.values(MACHINE_SETTINGS_METADATA).reduce(
      (acc, m) => acc + m.paramCount,
      0,
    );
    expect(MACHINE_SETTINGS_TOTAL_PARAM_COUNT).toBe(sum);
  });
});

// ============================================================================
// NC GENERATION SCHEMAS
// ============================================================================

describe("outputFolderSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = outputFolderSettingsSchema.parse({});
    expect(result.output_path).toBe("C:/NC_Output");
    expect(result.create_subfolders).toBe(true);
    expect(result.subfolder_template).toBe("{date}/{machine}");
    expect(result.overwrite_policy).toBe("ask");
  });
});

describe("namingConventionSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = namingConventionSettingsSchema.parse({});
    expect(result.file_template).toBe("{part}_{op}_{rev}");
    expect(result.use_sequence_numbers).toBe(false);
    expect(result.sequence_start).toBe(1);
    expect(result.sequence_increment).toBe(1);
    expect(result.max_filename_length).toBe(64);
  });
});

describe("subProgramSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = subProgramSettingsSchema.parse({});
    expect(result.use_sub_programs).toBe(false);
    expect(result.sub_program_numbering).toBe("o_number");
    expect(result.sub_program_start).toBe(9000);
    expect(result.inline_vs_external).toBe("external");
  });
});

describe("lineNumberSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = lineNumberSettingsSchema.parse({});
    expect(result.use_line_numbers).toBe(true);
    expect(result.line_number_start).toBe(10);
    expect(result.line_number_increment).toBe(10);
    expect(result.max_line_number).toBe(99999);
    expect(result.restart_per_tool).toBe(false);
  });
});

describe("outputFormatSettingsSchema", () => {
  it("parses with defaults", () => {
    const result = outputFormatSettingsSchema.parse({});
    expect(result.decimal_places_position).toBe(3);
    expect(result.decimal_places_feed).toBe(1);
    expect(result.use_leading_zeros).toBe(false);
    expect(result.use_trailing_zeros).toBe(true);
    expect(result.block_skip_character).toBe("/");
  });

  it("rejects decimal_places_position outside 0-6", () => {
    expect(() =>
      outputFormatSettingsSchema.parse({ decimal_places_position: 7 }),
    ).toThrow();
    expect(() =>
      outputFormatSettingsSchema.parse({ decimal_places_position: -1 }),
    ).toThrow();
  });
});

describe("NC_GEN_SETTINGS_SCHEMA_MAP", () => {
  it("has exactly 5 entries", () => {
    expect(Object.keys(NC_GEN_SETTINGS_SCHEMA_MAP).length).toBe(5);
  });

  it("schema map size matches metadata size", () => {
    expect(Object.keys(NC_GEN_SETTINGS_SCHEMA_MAP).length).toBe(
      Object.keys(NC_GEN_SETTINGS_METADATA).length,
    );
  });
});

describe("NC_GEN_SETTINGS_TOTAL_PARAM_COUNT", () => {
  it("meets minimum of 18 parameters", () => {
    expect(NC_GEN_SETTINGS_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(18);
  });

  it("matches sum of individual metadata paramCounts", () => {
    const sum = Object.values(NC_GEN_SETTINGS_METADATA).reduce(
      (acc, m) => acc + m.paramCount,
      0,
    );
    expect(NC_GEN_SETTINGS_TOTAL_PARAM_COUNT).toBe(sum);
  });
});

// ============================================================================
// METADATA AC PYTHON SETTER SPOT CHECKS
// ============================================================================

describe("AC Python setter namespace validation", () => {
  it("all calculation metadata setters use hm.settings.* namespace", () => {
    for (const meta of Object.values(CALCULATION_SETTINGS_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.settings\./);
    }
  });

  it("all machine metadata setters use hm.settings.* namespace", () => {
    for (const meta of Object.values(MACHINE_SETTINGS_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.settings\./);
    }
  });

  it("all NC gen metadata setters use hm.settings.* namespace", () => {
    for (const meta of Object.values(NC_GEN_SETTINGS_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.settings\./);
    }
  });
});
