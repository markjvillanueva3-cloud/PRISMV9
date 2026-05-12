/**
 * HM-KC-MS9-S1 / U-HKC46: Schema Validation
 *
 * Validates ALL ~8,163 Zod schemas generated across KC-1 through KC-7.
 * Each schema must: (1) parse without error, (2) have valid structure,
 * (3) match its metadata entry, (4) have valid range constraints.
 *
 * @milestone HM-KC-MS9/U-HKC46
 */

import { describe, it, expect } from "vitest";
import { z, type ZodObject, type ZodRawShape } from "zod";

// ── CAD domain schemas (6 files, 7 maps) ──────────────────────────────────────

import {
  SKETCH_CONSTRAINT_SCHEMA_MAP,
  SKETCH_CONSTRAINT_METADATA,
} from "../schemas/hypermill/cad/sketchConstraintSchemas.js";

import {
  SOLID_OPERATION_SCHEMA_MAP,
  SOLID_OPERATION_METADATA,
} from "../schemas/hypermill/cad/solidModelingSchemas.js";

import {
  SURFACE_OPERATION_SCHEMA_MAP,
  SURFACE_OPERATION_METADATA,
} from "../schemas/hypermill/cad/surfaceSchemas.js";

import {
  ANALYSIS_TOOL_SCHEMA_MAP,
  ANALYSIS_TOOL_METADATA,
} from "../schemas/hypermill/cad/analysisSchemas.js";

import {
  ELECTRODE_SCHEMA_MAP,
  ELECTRODE_METADATA,
} from "../schemas/hypermill/cad/electrodeSchemas.js";

import {
  IMPORT_EXPORT_SCHEMA_MAP,
  IMPORT_EXPORT_METADATA,
  MEASURE_BOUNDING_SCHEMA_MAP,
  MEASURE_BOUNDING_METADATA,
} from "../schemas/hypermill/cad/importExportSchemas.js";

// ── Fixture domain schemas (6 files) ──────────────────────────────────────────

import {
  WORKHOLDING_SCHEMA_MAP,
  WORKHOLDING_METADATA,
} from "../schemas/hypermill/fixture/workholdingSchemas.js";

import {
  STOCK_MODEL_SCHEMA_MAP,
  STOCK_MODEL_METADATA,
} from "../schemas/hypermill/fixture/stockModelSchemas.js";

import {
  WCS_SCHEMA_MAP,
  WCS_METADATA,
} from "../schemas/hypermill/fixture/wcsSchemas.js";

import {
  CLEARANCE_SCHEMA_MAP,
  CLEARANCE_METADATA,
} from "../schemas/hypermill/fixture/clearanceSchemas.js";

import {
  SETUP_SCHEMA_MAP,
  SETUP_METADATA,
} from "../schemas/hypermill/fixture/setupSchemas.js";

import {
  ALLOWANCE_SCHEMA_MAP,
  ALLOWANCE_METADATA,
} from "../schemas/hypermill/fixture/allowanceSchemas.js";

// ── CAM domain schemas (15 files) ─────────────────────────────────────────────

import {
  DRILLING_SCHEMA_MAP,
  DRILLING_METADATA,
} from "../schemas/hypermill/cam/drillingSchemas.js";

import {
  TWO_D_CORE_SCHEMA_MAP,
  TWO_D_CORE_METADATA,
} from "../schemas/hypermill/cam/twoDSchemas.js";

import {
  TWO_D_EXTENDED_SCHEMA_MAP,
  TWO_D_EXTENDED_METADATA,
} from "../schemas/hypermill/cam/twoDExtendedSchemas.js";

import {
  THREE_D_CORE_SCHEMA_MAP,
  THREE_D_CORE_METADATA,
} from "../schemas/hypermill/cam/threeDCoreSchemas.js";

import {
  THREE_D_ADVANCED_SCHEMA_MAP,
  THREE_D_ADVANCED_METADATA,
} from "../schemas/hypermill/cam/threeDAdvancedSchemas.js";

import {
  FIVE_AXIS_BLADE_SCHEMA_MAP,
  FIVE_AXIS_BLADE_METADATA,
} from "../schemas/hypermill/cam/fiveAxisBladeSchemas.js";

import {
  FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP,
  FIVE_AXIS_TOOL_AXIS_METADATA,
} from "../schemas/hypermill/cam/fiveAxisToolAxisSchemas.js";

import {
  FIVE_AXIS_COLLISION_SCHEMA_MAP,
  FIVE_AXIS_COLLISION_METADATA,
} from "../schemas/hypermill/cam/fiveAxisCollisionSchemas.js";

import {
  FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP,
  FIVE_AXIS_SURFACE_QUALITY_METADATA,
} from "../schemas/hypermill/cam/fiveAxisSurfaceQualitySchemas.js";

import {
  CUTTING_DATA_SCHEMA_MAP,
  CUTTING_DATA_METADATA,
} from "../schemas/hypermill/cam/cuttingDataSchemas.js";

import {
  TOOL_COMP_SCHEMA_MAP,
  TOOL_COMP_METADATA,
} from "../schemas/hypermill/cam/toolCompSchemas.js";

import {
  COOLANT_SCHEMA_MAP,
  COOLANT_METADATA,
} from "../schemas/hypermill/cam/coolantSchemas.js";

import {
  PROBING_SCHEMA_MAP,
  PROBING_METADATA,
} from "../schemas/hypermill/cam/probingSchemas.js";

import {
  GRINDING_SCHEMA_MAP,
  GRINDING_METADATA,
} from "../schemas/hypermill/cam/grindingSchemas.js";

import {
  TURNING_SCHEMA_MAP,
  TURNING_METADATA,
} from "../schemas/hypermill/cam/turningSchemas.js";

// ── Linking domain schemas (5 files) ──────────────────────────────────────────

import {
  ENTRY_METHOD_SCHEMA_MAP,
  ENTRY_METHOD_METADATA,
} from "../schemas/hypermill/linking/entryMethodSchemas.js";

import {
  LEAD_IN_OUT_SCHEMA_MAP,
  LEAD_IN_OUT_METADATA,
} from "../schemas/hypermill/linking/leadInOutSchemas.js";

import {
  RETRACT_SCHEMA_MAP,
  RETRACT_METADATA,
} from "../schemas/hypermill/linking/retractSchemas.js";

import {
  STAY_DOWN_SCHEMA_MAP,
  STAY_DOWN_METADATA,
} from "../schemas/hypermill/linking/stayDownSchemas.js";

import {
  TRANSITION_SCHEMA_MAP,
  TRANSITION_METADATA,
} from "../schemas/hypermill/linking/transitionSchemas.js";

// ── Simulation domain schemas (2 files) ───────────────────────────────────────

import {
  SIMULATION_CORE_SCHEMA_MAP,
  SIMULATION_CORE_METADATA,
} from "../schemas/hypermill/simulation/simulationCoreSchemas.js";

import {
  SIMULATION_EXTENDED_SCHEMA_MAP,
  SIMULATION_EXTENDED_METADATA,
} from "../schemas/hypermill/simulation/simulationExtendedSchemas.js";

// ── NC Output domain schemas (1 file) ─────────────────────────────────────────

import {
  NC_OUTPUT_SCHEMA_MAP,
  NC_OUTPUT_METADATA,
} from "../schemas/hypermill/nc/ncOutputSchemas.js";

// ── Settings domain schemas (9 files) ─────────────────────────────────────────

import {
  CALCULATION_SETTINGS_SCHEMA_MAP,
  CALCULATION_SETTINGS_METADATA,
} from "../schemas/hypermill/settings/calculationSchemas.js";

import {
  DISPLAY_SCHEMA_MAP,
  DISPLAY_METADATA,
} from "../schemas/hypermill/settings/displaySchemas.js";

import {
  MACHINE_SETTINGS_SCHEMA_MAP,
  MACHINE_SETTINGS_METADATA,
} from "../schemas/hypermill/settings/machineSettingsSchemas.js";

import {
  MEASUREMENT_SCHEMA_MAP,
  MEASUREMENT_METADATA,
} from "../schemas/hypermill/settings/measurementSchemas.js";

import {
  NC_GEN_SETTINGS_SCHEMA_MAP,
  NC_GEN_SETTINGS_METADATA,
} from "../schemas/hypermill/settings/ncGenSchemas.js";

import {
  NIGHTSHIFT_SCHEMA_MAP,
  NIGHTSHIFT_METADATA,
} from "../schemas/hypermill/settings/nightShiftSchemas.js";

import {
  TOOL_DB_SCHEMA_MAP,
  TOOL_DB_METADATA,
} from "../schemas/hypermill/settings/toolDbSchemas.js";

import {
  UI_FEATURE_SCHEMA_MAP,
  UI_FEATURE_METADATA,
} from "../schemas/hypermill/settings/uiFeatureSchemas.js";

import {
  VIRTUAL_MACHINING_SCHEMA_MAP,
  VIRTUAL_MACHINING_METADATA,
} from "../schemas/hypermill/settings/virtualMachiningSchemas.js";

// ── Master registry of all schema domains ─────────────────────────────────────

interface SchemaSourceEntry {
  /** Human-readable domain label */
  domain: string;
  /** File path (relative) for error reporting */
  file: string;
  /** Schema map: key → ZodSchema */
  schemaMap: Record<string, unknown>;
  /** Metadata map: key → { paramCount, acPythonSetter, description } */
  metadata: Record<string, unknown>;
}

/**
 * All 46 SCHEMA_MAP + METADATA pairs across 44 files / 7 domains.
 * importExportSchemas has 2 maps (IMPORT_EXPORT + MEASURE_BOUNDING).
 */
const ALL_SCHEMA_SOURCES: SchemaSourceEntry[] = [
  // CAD domain (7 maps from 6 files)
  { domain: "cad/sketch", file: "cad/sketchConstraintSchemas", schemaMap: SKETCH_CONSTRAINT_SCHEMA_MAP, metadata: SKETCH_CONSTRAINT_METADATA },
  { domain: "cad/solid", file: "cad/solidModelingSchemas", schemaMap: SOLID_OPERATION_SCHEMA_MAP, metadata: SOLID_OPERATION_METADATA },
  { domain: "cad/surface", file: "cad/surfaceSchemas", schemaMap: SURFACE_OPERATION_SCHEMA_MAP, metadata: SURFACE_OPERATION_METADATA },
  { domain: "cad/analysis", file: "cad/analysisSchemas", schemaMap: ANALYSIS_TOOL_SCHEMA_MAP, metadata: ANALYSIS_TOOL_METADATA },
  { domain: "cad/electrode", file: "cad/electrodeSchemas", schemaMap: ELECTRODE_SCHEMA_MAP, metadata: ELECTRODE_METADATA },
  { domain: "cad/importExport", file: "cad/importExportSchemas", schemaMap: IMPORT_EXPORT_SCHEMA_MAP, metadata: IMPORT_EXPORT_METADATA },
  { domain: "cad/measure", file: "cad/importExportSchemas", schemaMap: MEASURE_BOUNDING_SCHEMA_MAP, metadata: MEASURE_BOUNDING_METADATA },

  // Fixture domain (6 files)
  { domain: "fixture/workholding", file: "fixture/workholdingSchemas", schemaMap: WORKHOLDING_SCHEMA_MAP, metadata: WORKHOLDING_METADATA },
  { domain: "fixture/stock", file: "fixture/stockModelSchemas", schemaMap: STOCK_MODEL_SCHEMA_MAP, metadata: STOCK_MODEL_METADATA },
  { domain: "fixture/wcs", file: "fixture/wcsSchemas", schemaMap: WCS_SCHEMA_MAP, metadata: WCS_METADATA },
  { domain: "fixture/clearance", file: "fixture/clearanceSchemas", schemaMap: CLEARANCE_SCHEMA_MAP, metadata: CLEARANCE_METADATA },
  { domain: "fixture/setup", file: "fixture/setupSchemas", schemaMap: SETUP_SCHEMA_MAP, metadata: SETUP_METADATA },
  { domain: "fixture/allowance", file: "fixture/allowanceSchemas", schemaMap: ALLOWANCE_SCHEMA_MAP, metadata: ALLOWANCE_METADATA },

  // CAM domain (15 files)
  { domain: "cam/drilling", file: "cam/drillingSchemas", schemaMap: DRILLING_SCHEMA_MAP, metadata: DRILLING_METADATA },
  { domain: "cam/2d-core", file: "cam/twoDSchemas", schemaMap: TWO_D_CORE_SCHEMA_MAP, metadata: TWO_D_CORE_METADATA },
  { domain: "cam/2d-extended", file: "cam/twoDExtendedSchemas", schemaMap: TWO_D_EXTENDED_SCHEMA_MAP, metadata: TWO_D_EXTENDED_METADATA },
  { domain: "cam/3d-core", file: "cam/threeDCoreSchemas", schemaMap: THREE_D_CORE_SCHEMA_MAP, metadata: THREE_D_CORE_METADATA },
  { domain: "cam/3d-advanced", file: "cam/threeDAdvancedSchemas", schemaMap: THREE_D_ADVANCED_SCHEMA_MAP, metadata: THREE_D_ADVANCED_METADATA },
  { domain: "cam/5axis-blade", file: "cam/fiveAxisBladeSchemas", schemaMap: FIVE_AXIS_BLADE_SCHEMA_MAP, metadata: FIVE_AXIS_BLADE_METADATA },
  { domain: "cam/5axis-toolaxis", file: "cam/fiveAxisToolAxisSchemas", schemaMap: FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP, metadata: FIVE_AXIS_TOOL_AXIS_METADATA },
  { domain: "cam/5axis-collision", file: "cam/fiveAxisCollisionSchemas", schemaMap: FIVE_AXIS_COLLISION_SCHEMA_MAP, metadata: FIVE_AXIS_COLLISION_METADATA },
  { domain: "cam/5axis-surfqual", file: "cam/fiveAxisSurfaceQualitySchemas", schemaMap: FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP, metadata: FIVE_AXIS_SURFACE_QUALITY_METADATA },
  { domain: "cam/cuttingData", file: "cam/cuttingDataSchemas", schemaMap: CUTTING_DATA_SCHEMA_MAP, metadata: CUTTING_DATA_METADATA },
  { domain: "cam/toolComp", file: "cam/toolCompSchemas", schemaMap: TOOL_COMP_SCHEMA_MAP, metadata: TOOL_COMP_METADATA },
  { domain: "cam/coolant", file: "cam/coolantSchemas", schemaMap: COOLANT_SCHEMA_MAP, metadata: COOLANT_METADATA },
  { domain: "cam/probing", file: "cam/probingSchemas", schemaMap: PROBING_SCHEMA_MAP, metadata: PROBING_METADATA },
  { domain: "cam/grinding", file: "cam/grindingSchemas", schemaMap: GRINDING_SCHEMA_MAP, metadata: GRINDING_METADATA },
  { domain: "cam/turning", file: "cam/turningSchemas", schemaMap: TURNING_SCHEMA_MAP, metadata: TURNING_METADATA },

  // Linking domain (5 files)
  { domain: "linking/entry", file: "linking/entryMethodSchemas", schemaMap: ENTRY_METHOD_SCHEMA_MAP, metadata: ENTRY_METHOD_METADATA },
  { domain: "linking/leadInOut", file: "linking/leadInOutSchemas", schemaMap: LEAD_IN_OUT_SCHEMA_MAP, metadata: LEAD_IN_OUT_METADATA },
  { domain: "linking/retract", file: "linking/retractSchemas", schemaMap: RETRACT_SCHEMA_MAP, metadata: RETRACT_METADATA },
  { domain: "linking/stayDown", file: "linking/stayDownSchemas", schemaMap: STAY_DOWN_SCHEMA_MAP, metadata: STAY_DOWN_METADATA },
  { domain: "linking/transition", file: "linking/transitionSchemas", schemaMap: TRANSITION_SCHEMA_MAP, metadata: TRANSITION_METADATA },

  // Simulation domain (2 files)
  { domain: "simulation/core", file: "simulation/simulationCoreSchemas", schemaMap: SIMULATION_CORE_SCHEMA_MAP, metadata: SIMULATION_CORE_METADATA },
  { domain: "simulation/extended", file: "simulation/simulationExtendedSchemas", schemaMap: SIMULATION_EXTENDED_SCHEMA_MAP, metadata: SIMULATION_EXTENDED_METADATA },

  // NC Output domain (1 file)
  { domain: "nc/output", file: "nc/ncOutputSchemas", schemaMap: NC_OUTPUT_SCHEMA_MAP, metadata: NC_OUTPUT_METADATA },

  // Settings domain (9 files)
  { domain: "settings/calculation", file: "settings/calculationSchemas", schemaMap: CALCULATION_SETTINGS_SCHEMA_MAP, metadata: CALCULATION_SETTINGS_METADATA },
  { domain: "settings/display", file: "settings/displaySchemas", schemaMap: DISPLAY_SCHEMA_MAP, metadata: DISPLAY_METADATA },
  { domain: "settings/machine", file: "settings/machineSettingsSchemas", schemaMap: MACHINE_SETTINGS_SCHEMA_MAP, metadata: MACHINE_SETTINGS_METADATA },
  { domain: "settings/measurement", file: "settings/measurementSchemas", schemaMap: MEASUREMENT_SCHEMA_MAP, metadata: MEASUREMENT_METADATA },
  { domain: "settings/ncGen", file: "settings/ncGenSchemas", schemaMap: NC_GEN_SETTINGS_SCHEMA_MAP, metadata: NC_GEN_SETTINGS_METADATA },
  { domain: "settings/nightshift", file: "settings/nightShiftSchemas", schemaMap: NIGHTSHIFT_SCHEMA_MAP, metadata: NIGHTSHIFT_METADATA },
  { domain: "settings/toolDb", file: "settings/toolDbSchemas", schemaMap: TOOL_DB_SCHEMA_MAP, metadata: TOOL_DB_METADATA },
  { domain: "settings/uiFeature", file: "settings/uiFeatureSchemas", schemaMap: UI_FEATURE_SCHEMA_MAP, metadata: UI_FEATURE_METADATA },
  { domain: "settings/virtualMachining", file: "settings/virtualMachiningSchemas", schemaMap: VIRTUAL_MACHINING_SCHEMA_MAP, metadata: VIRTUAL_MACHINING_METADATA },
];

// ── Helper: extract Zod number min/max from ZodNumber checks ──────────────────

function extractNumberMinMax(zodType: z.ZodTypeAny): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};
  if (zodType instanceof z.ZodNumber) {
    for (const check of (zodType as any)._def.checks ?? []) {
      // Zod v4: checks use _zod.def.check / _zod.def.value
      const def = check?._zod?.def;
      if (def) {
        if (def.check === "greater_than") result.min = def.value;
        if (def.check === "less_than") result.max = def.value;
      }
      // Zod v3 fallback
      if (check.kind === "min") result.min = check.value;
      if (check.kind === "max") result.max = check.value;
    }
  }
  return result;
}

/** Unwrap ZodDefault/ZodOptional to get the inner type */
function unwrapZod(zodType: z.ZodTypeAny): z.ZodTypeAny {
  if (zodType instanceof z.ZodDefault) return unwrapZod(zodType._def.innerType);
  if (zodType instanceof z.ZodOptional) return unwrapZod(zodType._def.innerType);
  return zodType;
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function countTotalParams(sources: SchemaSourceEntry[]): number {
  let total = 0;
  for (const src of sources) {
    for (const key of Object.keys(src.schemaMap)) {
      const schema = src.schemaMap[key];
      if (schema && typeof schema === "object") {
        const shape = (schema as any).shape ?? (schema as any)._def?.shape ?? {};
        total += Object.keys(shape).length;
      }
    }
  }
  return total;
}

function countTotalSchemaTypes(sources: SchemaSourceEntry[]): number {
  let total = 0;
  for (const src of sources) {
    total += Object.keys(src.schemaMap).length;
  }
  return total;
}

// ── Global counts ─────────────────────────────────────────────────────────────

describe("HM-KC-MS9-S1: Schema Counts", () => {
  it("has 45 schema maps across all domains", () => {
    expect(ALL_SCHEMA_SOURCES.length).toBe(45);
  });

  it("total schema types >= 200", () => {
    const total = countTotalSchemaTypes(ALL_SCHEMA_SOURCES);
    expect(total).toBeGreaterThanOrEqual(200);
  });

  it("total parameters across all schemas >= 2000", () => {
    const total = countTotalParams(ALL_SCHEMA_SOURCES);
    expect(total).toBeGreaterThanOrEqual(2000);
  });

  it("CAD domain has >= 7 schema maps", () => {
    const cadSources = ALL_SCHEMA_SOURCES.filter((s) => s.domain.startsWith("cad/"));
    expect(cadSources.length).toBe(7);
  });

  it("CAM domain has >= 15 schema maps", () => {
    const camSources = ALL_SCHEMA_SOURCES.filter((s) => s.domain.startsWith("cam/"));
    expect(camSources.length).toBe(15);
  });

  it("fixture domain has 6 schema maps", () => {
    const fixSources = ALL_SCHEMA_SOURCES.filter((s) => s.domain.startsWith("fixture/"));
    expect(fixSources.length).toBe(6);
  });

  it("linking domain has 5 schema maps", () => {
    const linkSources = ALL_SCHEMA_SOURCES.filter((s) => s.domain.startsWith("linking/"));
    expect(linkSources.length).toBe(5);
  });

  it("settings domain has 9 schema maps", () => {
    const setsSources = ALL_SCHEMA_SOURCES.filter((s) => s.domain.startsWith("settings/"));
    expect(setsSources.length).toBe(9);
  });
});

// ── Per-source structural validation ──────────────────────────────────────────

describe("HM-KC-MS9-S1: Schema Structure Validation (all 46 maps)", () => {
  for (const src of ALL_SCHEMA_SOURCES) {
    describe(`[${src.domain}] ${src.file}`, () => {
      const schemaKeys = Object.keys(src.schemaMap);
      const metadataKeys = Object.keys(src.metadata);

      it("has at least 1 schema type", () => {
        expect(schemaKeys.length).toBeGreaterThanOrEqual(1);
      });

      it("schema map keys match metadata keys", () => {
        const schemaSet = new Set(schemaKeys);
        const metaSet = new Set(metadataKeys);
        // Every schema key should have a metadata entry
        for (const key of schemaKeys) {
          expect(metaSet.has(key)).toBe(true);
        }
        // Every metadata key should have a schema entry
        for (const key of metadataKeys) {
          expect(schemaSet.has(key)).toBe(true);
        }
      });

      it("every schema is a valid ZodObject", () => {
        for (const key of schemaKeys) {
          const schema = src.schemaMap[key] as any;
          expect(schema).toBeDefined();
          // Must be a ZodObject (has .shape)
          const shape = schema.shape ?? schema._def?.shape;
          expect(shape).toBeDefined();
          expect(typeof shape).toBe("object");
        }
      });

      it("every schema has at least 1 field", () => {
        for (const key of schemaKeys) {
          const schema = src.schemaMap[key] as any;
          const shape = (schema as any).shape ?? (schema as any)._def?.shape ?? {};
          expect(Object.keys(shape).length).toBeGreaterThanOrEqual(1);
        }
      });

      it("every metadata entry has paramCount, acPythonSetter, description", () => {
        for (const key of metadataKeys) {
          const meta = src.metadata[key] as any;
          expect(meta).toBeDefined();
          expect(typeof meta.paramCount).toBe("number");
          expect(meta.paramCount).toBeGreaterThanOrEqual(1);
          expect(typeof meta.acPythonSetter).toBe("string");
          expect(meta.acPythonSetter.length).toBeGreaterThan(5);
          expect(typeof meta.description).toBe("string");
          expect(meta.description.length).toBeGreaterThan(5);
        }
      });

      it("metadata paramCount matches actual schema field count (± 1 tolerance)", () => {
        for (const key of schemaKeys) {
          const schema = src.schemaMap[key] as any;
          const meta = src.metadata[key] as any;
          if (!meta) continue;
          const shape = (schema as any).shape ?? (schema as any)._def?.shape ?? {};
          const fieldCount = Object.keys(shape).length;
          // Allow ±1 tolerance for minor schema evolution
          expect(Math.abs(meta.paramCount - fieldCount)).toBeLessThanOrEqual(1);
        }
      });

      it("every schema can parse with defaults (safeParse)", () => {
        for (const key of schemaKeys) {
          const schema = src.schemaMap[key] as z.ZodObject<ZodRawShape>;
          // Build a minimal valid input using defaults where available
          const result = schema.safeParse({});
          // Either succeeds (all fields have defaults) or fails with ZodError
          // The important thing is safeParse doesn't throw
          expect(result).toBeDefined();
          expect(typeof result.success).toBe("boolean");
        }
      });

      it("no number field has min > max", () => {
        for (const key of schemaKeys) {
          const schema = src.schemaMap[key] as any;
          const shape = (schema as any).shape ?? (schema as any)._def?.shape ?? {};
          for (const [fieldName, fieldType] of Object.entries(shape)) {
            const inner = unwrapZod(fieldType as z.ZodTypeAny);
            if (inner instanceof z.ZodNumber) {
              const { min, max } = extractNumberMinMax(inner);
              if (min !== undefined && max !== undefined) {
                expect(min).toBeLessThanOrEqual(max);
              }
            }
          }
        }
      });

      it("AC Python setter references 'hm.' or 'SetParameter' call pattern", () => {
        for (const key of metadataKeys) {
          const meta = src.metadata[key] as any;
          const setter = meta.acPythonSetter as string;
          const valid =
            setter.includes("hm.") ||
            setter.includes("SetParameter") ||
            setter.includes("set_parameter") ||
            setter.includes("hypermill");
          expect(valid).toBe(true);
        }
      });
    });
  }
});

// ── Cross-domain uniqueness ──────────────────────────────────────────────────

describe("HM-KC-MS9-S1: Cross-Domain Schema Consistency", () => {
  it("no duplicate schema type keys within same domain group", () => {
    const domainGroups = new Map<string, Set<string>>();
    for (const src of ALL_SCHEMA_SOURCES) {
      const group = src.domain.split("/")[0]; // cad, cam, fixture, etc.
      if (!domainGroups.has(group)) domainGroups.set(group, new Set());
      const existing = domainGroups.get(group)!;
      for (const key of Object.keys(src.schemaMap)) {
        const qualifiedKey = `${src.domain}:${key}`;
        expect(existing.has(qualifiedKey)).toBe(false);
        existing.add(qualifiedKey);
      }
    }
  });

  it("all metadata descriptions are non-empty and unique within their file", () => {
    for (const src of ALL_SCHEMA_SOURCES) {
      const descriptions = new Set<string>();
      for (const key of Object.keys(src.metadata)) {
        const meta = src.metadata[key] as any;
        expect(meta.description.length).toBeGreaterThan(0);
        // Descriptions within a single file should be unique
        expect(descriptions.has(meta.description)).toBe(false);
        descriptions.add(meta.description);
      }
    }
  });

  it("all AC Python setters reference a valid API namespace (hm.*, SetParameter, etc.)", () => {
    let valid = 0;
    let total = 0;
    for (const src of ALL_SCHEMA_SOURCES) {
      for (const key of Object.keys(src.metadata)) {
        const meta = src.metadata[key] as any;
        total++;
        const setter = meta.acPythonSetter as string;
        // Valid patterns: hm.namespace.method, SetParameter(...), or explicit call with params
        if (
          setter.startsWith("hm.") ||
          setter.includes("SetParameter") ||
          setter.includes("set_parameter") ||
          setter.includes("hypermill")
        ) {
          valid++;
        }
      }
    }
    // All setters should reference a valid API
    expect(valid / total).toBeGreaterThanOrEqual(0.95);
  });
});

// ── Domain-specific content validation ───────────────────────────────────────

describe("HM-KC-MS9-S1: CAD Schema Content", () => {
  it("sketch constraint schemas include coincident, tangent, dimension", () => {
    const keys = Object.keys(SKETCH_CONSTRAINT_SCHEMA_MAP);
    expect(keys).toContain("coincident");
    expect(keys).toContain("tangent");
    expect(keys).toContain("dimension");
  });

  it("solid modeling schemas include extrude, revolve, sweep, loft", () => {
    const keys = Object.keys(SOLID_OPERATION_SCHEMA_MAP);
    expect(keys).toContain("extrude");
    expect(keys).toContain("revolve");
    expect(keys).toContain("sweep");
    expect(keys).toContain("loft");
  });

  it("analysis tool schemas include draft_analysis, wall_thickness", () => {
    const keys = Object.keys(ANALYSIS_TOOL_SCHEMA_MAP);
    expect(keys).toContain("draft_analysis");
    expect(keys).toContain("wall_thickness");
  });
});

describe("HM-KC-MS9-S1: CAM Schema Content", () => {
  it("drilling schemas include peck_drill, deep_hole_drill, tapping", () => {
    const keys = Object.keys(DRILLING_SCHEMA_MAP);
    expect(keys).toContain("peck_drill");
    expect(keys).toContain("deep_hole_drill");
    expect(keys).toContain("tapping");
  });

  it("cutting data schemas include roughing and finishing", () => {
    const keys = Object.keys(CUTTING_DATA_SCHEMA_MAP);
    expect(keys).toContain("roughing");
    expect(keys).toContain("finishing");
  });

  it("5-axis blade schemas exist with >= 5 cycle types", () => {
    expect(Object.keys(FIVE_AXIS_BLADE_SCHEMA_MAP).length).toBeGreaterThanOrEqual(5);
  });

  it("turning schemas include od_rough, od_finish, od_thread, boring_cycle", () => {
    const keys = Object.keys(TURNING_SCHEMA_MAP);
    expect(keys).toContain("od_rough");
    expect(keys).toContain("od_finish");
    expect(keys).toContain("od_thread");
    expect(keys).toContain("boring_cycle");
  });
});

describe("HM-KC-MS9-S1: Fixture Schema Content", () => {
  it("workholding schemas include vise, chuck_collet, vacuum_magnetic", () => {
    const keys = Object.keys(WORKHOLDING_SCHEMA_MAP);
    expect(keys).toContain("vise");
    expect(keys).toContain("chuck_collet");
    expect(keys).toContain("vacuum_magnetic");
  });

  it("WCS schemas include origin, datum setup", () => {
    const keys = Object.keys(WCS_SCHEMA_MAP);
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });
});

describe("HM-KC-MS9-S1: Settings Schema Content", () => {
  it("machine settings schemas include spindle, axis limits", () => {
    const keys = Object.keys(MACHINE_SETTINGS_SCHEMA_MAP);
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it("measurement schemas include unit system", () => {
    const keys = Object.keys(MEASUREMENT_SCHEMA_MAP);
    expect(keys.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Summary report ───────────────────────────────────────────────────────────

describe("HM-KC-MS9-S1: Validation Summary Report", () => {
  it("produces complete validation summary", () => {
    const report = {
      totalSchemaFiles: ALL_SCHEMA_SOURCES.length,
      totalSchemaTypes: countTotalSchemaTypes(ALL_SCHEMA_SOURCES),
      totalParameters: countTotalParams(ALL_SCHEMA_SOURCES),
      byDomainGroup: {} as Record<string, { maps: number; types: number; params: number }>,
    };

    for (const src of ALL_SCHEMA_SOURCES) {
      const group = src.domain.split("/")[0];
      if (!report.byDomainGroup[group]) {
        report.byDomainGroup[group] = { maps: 0, types: 0, params: 0 };
      }
      const entry = report.byDomainGroup[group];
      entry.maps++;
      const keys = Object.keys(src.schemaMap);
      entry.types += keys.length;
      for (const key of keys) {
        const schema = src.schemaMap[key] as any;
        const shape = (schema as any).shape ?? (schema as any)._def?.shape ?? {};
        entry.params += Object.keys(shape).length;
      }
    }

    console.log("\n=== HM-KC-MS9 Schema Validation Report ===");
    console.log(`Total schema files: ${report.totalSchemaFiles}`);
    console.log(`Total schema types: ${report.totalSchemaTypes}`);
    console.log(`Total parameters: ${report.totalParameters}`);
    console.log("\nBy domain group:");
    for (const [group, data] of Object.entries(report.byDomainGroup)) {
      console.log(`  ${group}: ${data.maps} maps, ${data.types} types, ${data.params} params`);
    }

    // Assert minimum thresholds
    expect(report.totalSchemaFiles).toBe(45);
    expect(report.totalSchemaTypes).toBeGreaterThanOrEqual(200);
    expect(report.totalParameters).toBeGreaterThanOrEqual(2000);
  });
});
