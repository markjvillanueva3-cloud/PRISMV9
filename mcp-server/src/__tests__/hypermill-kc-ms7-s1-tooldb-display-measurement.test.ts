/**
 * HM-KC-MS7 U-HKC37 — Tool DB, Display, Measurement, VIRTUAL Machining, nightSHIFT Schema Tests
 *
 * Verifies Zod schemas parse with defaults, enum values are correct,
 * schema map sizes match metadata, and total param counts meet minimums.
 */

import { describe, it, expect } from "vitest";

// Tool DB
import {
  toolDatabasePathSettingsSchema,
  toolCouplingSettingsSchema,
  toolFilterSettingsSchema,
  TOOL_DB_SCHEMA_MAP,
  TOOL_DB_METADATA,
  TOOL_DB_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/toolDbSchemas.js";

// Display
import {
  shadingSettingsSchema,
  colorSettingsSchema,
  meshQualitySettingsSchema,
  annotationSettingsSchema,
  layerSettingsSchema,
  DISPLAY_SCHEMA_MAP,
  DISPLAY_METADATA,
  DISPLAY_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/displaySchemas.js";

// Measurement
import {
  measurementSystemSettingsSchema,
  measurementConsistencySettingsSchema,
  MEASUREMENT_SCHEMA_MAP,
  MEASUREMENT_METADATA,
  MEASUREMENT_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/measurementSchemas.js";

// Virtual Machining
import {
  simQualitySettingsSchema,
  simDisplaySettingsSchema,
  simBehaviorSettingsSchema,
  VIRTUAL_MACHINING_SCHEMA_MAP,
  VIRTUAL_MACHINING_METADATA,
  VIRTUAL_MACHINING_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/virtualMachiningSchemas.js";

// nightSHIFT
import {
  batchConfigSettingsSchema,
  batchBehaviorSettingsSchema,
  NIGHTSHIFT_SCHEMA_MAP,
  NIGHTSHIFT_METADATA,
  NIGHTSHIFT_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/nightShiftSchemas.js";

// ============================================================================
// TOOL DB SCHEMAS
// ============================================================================

describe("Tool DB Schemas", () => {
  it("toolDatabasePathSettings — parses with all defaults", () => {
    const result = toolDatabasePathSettingsSchema.parse({});
    expect(result.auto_load_on_open).toBe(true);
    expect(result.tdb_format).toBe("hmt");
    expect(typeof result.default_tdb_path).toBe("string");
    expect(result.default_tdb_path.length).toBeGreaterThan(0);
  });

  it("toolDatabasePathSettings — accepts xml format", () => {
    const result = toolDatabasePathSettingsSchema.parse({ tdb_format: "xml" });
    expect(result.tdb_format).toBe("xml");
  });

  it("toolCouplingSettings — parses with all defaults", () => {
    const result = toolCouplingSettingsSchema.parse({});
    expect(result.coupling_type).toBe("rigid");
    expect(result.grade_mapping_mode).toBe("auto");
    expect(result.auto_update_on_change).toBe(true);
  });

  it("toolCouplingSettings — accepts floating coupling type", () => {
    const result = toolCouplingSettingsSchema.parse({ coupling_type: "floating" });
    expect(result.coupling_type).toBe("floating");
  });

  it("toolFilterSettings — parses with all defaults", () => {
    const result = toolFilterSettingsSchema.parse({});
    expect(result.default_filter_type).toBe("all");
    expect(result.show_assemblies).toBe(true);
    expect(result.show_retired).toBe(false);
    expect(result.max_results).toBe(200);
  });

  it("toolFilterSettings — max_results respects range 10–1000", () => {
    expect(() => toolFilterSettingsSchema.parse({ max_results: 9 })).toThrow();
    expect(() => toolFilterSettingsSchema.parse({ max_results: 1001 })).toThrow();
    const result = toolFilterSettingsSchema.parse({ max_results: 500 });
    expect(result.max_results).toBe(500);
  });

  it("TOOL_DB_SCHEMA_MAP — has 3 entries matching metadata", () => {
    expect(Object.keys(TOOL_DB_SCHEMA_MAP).length).toBe(Object.keys(TOOL_DB_METADATA).length);
    expect(Object.keys(TOOL_DB_SCHEMA_MAP).length).toBe(3);
  });

  it("TOOL_DB_TOTAL_PARAM_COUNT — is at least 14", () => {
    expect(TOOL_DB_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(14);
  });

  it("TOOL_DB_METADATA — all entries have valid acPythonSetter starting with hm.settings", () => {
    for (const meta of Object.values(TOOL_DB_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.settings\./);
    }
  });
});

// ============================================================================
// DISPLAY SCHEMAS
// ============================================================================

describe("Display Schemas", () => {
  it("shadingSettings — parses with all defaults", () => {
    const result = shadingSettingsSchema.parse({});
    expect(result.shading_mode).toBe("shaded");
    expect(result.transparency_level).toBe(0);
    expect(result.edge_display).toBe(true);
    expect(result.silhouette_edges).toBe(true);
  });

  it("shadingSettings — shading_mode enum contains expected values", () => {
    expect(() => shadingSettingsSchema.parse({ shading_mode: "wireframe" })).not.toThrow();
    expect(() => shadingSettingsSchema.parse({ shading_mode: "shaded_wireframe" })).not.toThrow();
    expect(() => shadingSettingsSchema.parse({ shading_mode: "realistic" })).not.toThrow();
    expect(() => shadingSettingsSchema.parse({ shading_mode: "unknown" })).toThrow();
  });

  it("colorSettings — parses with all defaults and all fields are hex strings", () => {
    const result = colorSettingsSchema.parse({});
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    expect(hexPattern.test(result.background_color)).toBe(true);
    expect(hexPattern.test(result.stock_color)).toBe(true);
    expect(hexPattern.test(result.fixture_color)).toBe(true);
    expect(hexPattern.test(result.toolpath_color)).toBe(true);
    expect(hexPattern.test(result.collision_highlight_color)).toBe(true);
    expect(hexPattern.test(result.selection_color)).toBe(true);
  });

  it("colorSettings — rejects invalid hex strings", () => {
    expect(() => colorSettingsSchema.parse({ background_color: "red" })).toThrow();
    expect(() => colorSettingsSchema.parse({ background_color: "#GGGGGG" })).toThrow();
    expect(() => colorSettingsSchema.parse({ background_color: "#FFF" })).toThrow();
  });

  it("colorSettings — accepts valid hex strings", () => {
    const result = colorSettingsSchema.parse({ background_color: "#AABBCC" });
    expect(result.background_color).toBe("#AABBCC");
  });

  it("meshQualitySettings — parses with all defaults", () => {
    const result = meshQualitySettingsSchema.parse({});
    expect(result.mesh_density).toBe("medium");
    expect(result.deviation_tolerance_mm).toBe(0.01);
    expect(result.adaptive_refinement).toBe(true);
  });

  it("meshQualitySettings — mesh_density enum has exactly 4 values", () => {
    expect(() => meshQualitySettingsSchema.parse({ mesh_density: "coarse" })).not.toThrow();
    expect(() => meshQualitySettingsSchema.parse({ mesh_density: "medium" })).not.toThrow();
    expect(() => meshQualitySettingsSchema.parse({ mesh_density: "fine" })).not.toThrow();
    expect(() => meshQualitySettingsSchema.parse({ mesh_density: "ultra" })).not.toThrow();
    expect(() => meshQualitySettingsSchema.parse({ mesh_density: "extreme" })).toThrow();
  });

  it("annotationSettings — parses with all defaults", () => {
    const result = annotationSettingsSchema.parse({});
    expect(result.show_dimensions).toBe(true);
    expect(result.dimension_text_size).toBe(10);
    expect(result.leader_line_style).toBe("solid");
  });

  it("annotationSettings — dimension_text_size respects range 6–24", () => {
    expect(() => annotationSettingsSchema.parse({ dimension_text_size: 5 })).toThrow();
    expect(() => annotationSettingsSchema.parse({ dimension_text_size: 25 })).toThrow();
    expect(annotationSettingsSchema.parse({ dimension_text_size: 12 }).dimension_text_size).toBe(12);
  });

  it("layerSettings — parses with all defaults", () => {
    const result = layerSettingsSchema.parse({});
    expect(result.default_layer_name).toBe("Layer_0");
    expect(result.auto_assign_layers).toBe(true);
    expect(result.layer_color_scheme).toBe("by_type");
    expect(result.max_layers).toBe(64);
  });

  it("layerSettings — max_layers respects range 1–256", () => {
    expect(() => layerSettingsSchema.parse({ max_layers: 0 })).toThrow();
    expect(() => layerSettingsSchema.parse({ max_layers: 257 })).toThrow();
    expect(layerSettingsSchema.parse({ max_layers: 128 }).max_layers).toBe(128);
  });

  it("DISPLAY_SCHEMA_MAP — has 5 entries matching metadata", () => {
    expect(Object.keys(DISPLAY_SCHEMA_MAP).length).toBe(Object.keys(DISPLAY_METADATA).length);
    expect(Object.keys(DISPLAY_SCHEMA_MAP).length).toBe(5);
  });

  it("DISPLAY_TOTAL_PARAM_COUNT — is at least 23", () => {
    expect(DISPLAY_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(23);
  });

  it("DISPLAY_METADATA — all entries have valid acPythonSetter starting with hm.settings", () => {
    for (const meta of Object.values(DISPLAY_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.settings\./);
    }
  });
});

// ============================================================================
// MEASUREMENT SCHEMAS
// ============================================================================

describe("Measurement Schemas", () => {
  it("measurementSystemSettings — parses with all defaults", () => {
    const result = measurementSystemSettingsSchema.parse({});
    expect(result.unit_system).toBe("metric");
    expect(result.decimal_places_linear).toBe(3);
    expect(result.decimal_places_angular).toBe(1);
    expect(result.angle_format).toBe("decimal_degrees");
    expect(result.coordinate_display).toBe("absolute");
  });

  it("measurementSystemSettings — unit_system enum has exactly 2 values", () => {
    expect(() => measurementSystemSettingsSchema.parse({ unit_system: "metric" })).not.toThrow();
    expect(() => measurementSystemSettingsSchema.parse({ unit_system: "imperial" })).not.toThrow();
    expect(() => measurementSystemSettingsSchema.parse({ unit_system: "si" })).toThrow();
    expect(() => measurementSystemSettingsSchema.parse({ unit_system: "us" })).toThrow();
  });

  it("measurementSystemSettings — decimal_places_linear range 0–6", () => {
    expect(() => measurementSystemSettingsSchema.parse({ decimal_places_linear: -1 })).toThrow();
    expect(() => measurementSystemSettingsSchema.parse({ decimal_places_linear: 7 })).toThrow();
    expect(measurementSystemSettingsSchema.parse({ decimal_places_linear: 4 }).decimal_places_linear).toBe(4);
  });

  it("measurementSystemSettings — decimal_places_angular range 0–4", () => {
    expect(() => measurementSystemSettingsSchema.parse({ decimal_places_angular: -1 })).toThrow();
    expect(() => measurementSystemSettingsSchema.parse({ decimal_places_angular: 5 })).toThrow();
    expect(measurementSystemSettingsSchema.parse({ decimal_places_angular: 2 }).decimal_places_angular).toBe(2);
  });

  it("measurementConsistencySettings — parses with all defaults", () => {
    const result = measurementConsistencySettingsSchema.parse({});
    expect(result.enforce_consistency).toBe(true);
    expect(result.warn_on_mixed_units).toBe(true);
    expect(result.auto_convert_on_import).toBe(true);
    expect(result.conversion_rounding_mode).toBe("round");
  });

  it("measurementConsistencySettings — conversion_rounding_mode enum values", () => {
    expect(() => measurementConsistencySettingsSchema.parse({ conversion_rounding_mode: "round" })).not.toThrow();
    expect(() => measurementConsistencySettingsSchema.parse({ conversion_rounding_mode: "truncate" })).not.toThrow();
    expect(() => measurementConsistencySettingsSchema.parse({ conversion_rounding_mode: "ceil" })).not.toThrow();
    expect(() => measurementConsistencySettingsSchema.parse({ conversion_rounding_mode: "floor" })).toThrow();
  });

  it("MEASUREMENT_SCHEMA_MAP — has 2 entries matching metadata", () => {
    expect(Object.keys(MEASUREMENT_SCHEMA_MAP).length).toBe(Object.keys(MEASUREMENT_METADATA).length);
    expect(Object.keys(MEASUREMENT_SCHEMA_MAP).length).toBe(2);
  });

  it("MEASUREMENT_TOTAL_PARAM_COUNT — is at least 9", () => {
    expect(MEASUREMENT_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(9);
  });
});

// ============================================================================
// VIRTUAL MACHINING SCHEMAS
// ============================================================================

describe("VIRTUAL Machining Schemas", () => {
  it("simQualitySettings — parses with all defaults", () => {
    const result = simQualitySettingsSchema.parse({});
    expect(result.simulation_quality).toBe("standard");
    expect(result.collision_tolerance_mm).toBe(0.1);
    expect(result.stock_mesh_density).toBe("medium");
    expect(result.animation_speed).toBe(1.0);
  });

  it("simQualitySettings — collision_tolerance_mm range 0.01–1.0", () => {
    expect(() => simQualitySettingsSchema.parse({ collision_tolerance_mm: 0.005 })).toThrow();
    expect(() => simQualitySettingsSchema.parse({ collision_tolerance_mm: 1.5 })).toThrow();
    expect(simQualitySettingsSchema.parse({ collision_tolerance_mm: 0.5 }).collision_tolerance_mm).toBe(0.5);
  });

  it("simQualitySettings — animation_speed range 0.1–10.0", () => {
    expect(() => simQualitySettingsSchema.parse({ animation_speed: 0.05 })).toThrow();
    expect(() => simQualitySettingsSchema.parse({ animation_speed: 11 })).toThrow();
    expect(simQualitySettingsSchema.parse({ animation_speed: 5.0 }).animation_speed).toBe(5.0);
  });

  it("simDisplaySettings — parses with all defaults", () => {
    const result = simDisplaySettingsSchema.parse({});
    expect(result.show_tool_path).toBe(true);
    expect(result.show_stock_removal).toBe(true);
    expect(result.highlight_gouge).toBe(true);
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    expect(hexPattern.test(result.gouge_color)).toBe(true);
    expect(hexPattern.test(result.material_removal_color)).toBe(true);
  });

  it("simBehaviorSettings — parses with all defaults", () => {
    const result = simBehaviorSettingsSchema.parse({});
    expect(result.auto_simulate_after_calculate).toBe(false);
    expect(result.pause_on_collision).toBe(true);
    expect(result.save_simulation_results).toBe(true);
    expect(result.max_simulation_time_min).toBe(60);
  });

  it("VIRTUAL_MACHINING_SCHEMA_MAP — has 3 entries matching metadata", () => {
    expect(Object.keys(VIRTUAL_MACHINING_SCHEMA_MAP).length).toBe(Object.keys(VIRTUAL_MACHINING_METADATA).length);
    expect(Object.keys(VIRTUAL_MACHINING_SCHEMA_MAP).length).toBe(3);
  });

  it("VIRTUAL_MACHINING_TOTAL_PARAM_COUNT — is at least 14", () => {
    expect(VIRTUAL_MACHINING_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(14);
  });
});

// ============================================================================
// NIGHTSHIFT SCHEMAS
// ============================================================================

describe("nightSHIFT Schemas", () => {
  it("batchConfigSettings — parses with all defaults", () => {
    const result = batchConfigSettingsSchema.parse({});
    expect(result.max_parallel_jobs).toBe(4);
    expect(result.job_priority).toBe("normal");
    expect(result.notification_on_complete).toBe(true);
    expect(result.notification_on_error).toBe(true);
  });

  it("batchConfigSettings — max_parallel_jobs range 1–16", () => {
    expect(() => batchConfigSettingsSchema.parse({ max_parallel_jobs: 0 })).toThrow();
    expect(() => batchConfigSettingsSchema.parse({ max_parallel_jobs: 17 })).toThrow();
    expect(batchConfigSettingsSchema.parse({ max_parallel_jobs: 8 }).max_parallel_jobs).toBe(8);
    expect(batchConfigSettingsSchema.parse({ max_parallel_jobs: 1 }).max_parallel_jobs).toBe(1);
    expect(batchConfigSettingsSchema.parse({ max_parallel_jobs: 16 }).max_parallel_jobs).toBe(16);
  });

  it("batchConfigSettings — job_priority enum values", () => {
    expect(() => batchConfigSettingsSchema.parse({ job_priority: "low" })).not.toThrow();
    expect(() => batchConfigSettingsSchema.parse({ job_priority: "normal" })).not.toThrow();
    expect(() => batchConfigSettingsSchema.parse({ job_priority: "high" })).not.toThrow();
    expect(() => batchConfigSettingsSchema.parse({ job_priority: "critical" })).not.toThrow();
    expect(() => batchConfigSettingsSchema.parse({ job_priority: "urgent" })).toThrow();
  });

  it("batchBehaviorSettings — parses with all defaults", () => {
    const result = batchBehaviorSettingsSchema.parse({});
    expect(result.auto_post_after_calculate).toBe(false);
    expect(result.auto_simulate).toBe(false);
    expect(result.retry_on_failure).toBe(true);
    expect(result.max_retries).toBe(1);
    expect(result.queue_timeout_hours).toBe(8);
  });

  it("batchBehaviorSettings — max_retries range 0–5", () => {
    expect(() => batchBehaviorSettingsSchema.parse({ max_retries: -1 })).toThrow();
    expect(() => batchBehaviorSettingsSchema.parse({ max_retries: 6 })).toThrow();
    expect(batchBehaviorSettingsSchema.parse({ max_retries: 3 }).max_retries).toBe(3);
  });

  it("batchBehaviorSettings — queue_timeout_hours range 1–72", () => {
    expect(() => batchBehaviorSettingsSchema.parse({ queue_timeout_hours: 0 })).toThrow();
    expect(() => batchBehaviorSettingsSchema.parse({ queue_timeout_hours: 73 })).toThrow();
    expect(batchBehaviorSettingsSchema.parse({ queue_timeout_hours: 24 }).queue_timeout_hours).toBe(24);
  });

  it("NIGHTSHIFT_SCHEMA_MAP — has 2 entries matching metadata", () => {
    expect(Object.keys(NIGHTSHIFT_SCHEMA_MAP).length).toBe(Object.keys(NIGHTSHIFT_METADATA).length);
    expect(Object.keys(NIGHTSHIFT_SCHEMA_MAP).length).toBe(2);
  });

  it("NIGHTSHIFT_TOTAL_PARAM_COUNT — is at least 9", () => {
    expect(NIGHTSHIFT_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(9);
  });

  it("NIGHTSHIFT_METADATA — all entries have valid acPythonSetter starting with hm.settings", () => {
    for (const meta of Object.values(NIGHTSHIFT_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.settings\./);
    }
  });
});
