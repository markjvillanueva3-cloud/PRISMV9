/**
 * HyperMillCADArtifactGeneratorEngine — CAD Artifact Generator
 *
 * U-HKC11: Generates skill templates, AC Python setter scripts, and DFM hook
 * validation rules from the 6 hyperCAD-S parameter schema files (58 types,
 * 241 params across 7 domains).
 *
 * @domain CAD-ArtifactGeneration
 * @milestone HM-KC-MS1/U-HKC11
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  SKETCH_CONSTRAINT_SCHEMA_MAP,
  SKETCH_CONSTRAINT_METADATA,
} from "../../schemas/hypermill/cad/sketchConstraintSchemas.js";

import {
  SOLID_OPERATION_SCHEMA_MAP,
  SOLID_OPERATION_METADATA,
} from "../../schemas/hypermill/cad/solidModelingSchemas.js";

import {
  SURFACE_OPERATION_SCHEMA_MAP,
  SURFACE_OPERATION_METADATA,
} from "../../schemas/hypermill/cad/surfaceSchemas.js";

import {
  ANALYSIS_TOOL_SCHEMA_MAP,
  ANALYSIS_TOOL_METADATA,
} from "../../schemas/hypermill/cad/analysisSchemas.js";

import {
  ELECTRODE_SCHEMA_MAP,
  ELECTRODE_METADATA,
} from "../../schemas/hypermill/cad/electrodeSchemas.js";

import {
  IMPORT_EXPORT_SCHEMA_MAP,
  IMPORT_EXPORT_METADATA,
  MEASURE_BOUNDING_SCHEMA_MAP,
  MEASURE_BOUNDING_METADATA,
} from "../../schemas/hypermill/cad/importExportSchemas.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Parameter descriptor extracted from a Zod schema field */
export interface ParamDescriptor {
  name: string;
  type: string;
  range: string;
  defaultValue: string;
  unit: string;
}

/** Skill markdown template for one schema type */
export interface SkillTemplate {
  name: string;
  domain: string;
  description: string;
  parameterTable: ParamDescriptor[];
  acPythonSetter: string;
  dfmWarnings: string[];
}

/** AC Python script record for one schema type */
export interface ACPythonScript {
  name: string;
  domain: string;
  script: string;
}

/** DFM hook validation rule */
export interface HookRule {
  paramName: string;
  domain: string;
  minSafe: number;
  maxSafe: number;
  severity: "CRITICAL" | "WARNING";
  description: string;
}

/** Complete artifact generation result */
export interface CADArtifactResult {
  skills: SkillTemplate[];
  acPythonScripts: ACPythonScript[];
  hookRules: HookRule[];
  summary: {
    totalSchemaTypes: number;
    totalParams: number;
    totalSkills: number;
    totalScripts: number;
    totalHooks: number;
  };
}

// ── Domain source registry ─────────────────────────────────────────────────────

interface DomainSource {
  domain: string;
  schemaMap: Record<string, ZodObject<ZodRawShape>>;
  metadata: Record<string, { paramCount: number; acPythonSetter: string; description: string; dfmCriticalParams?: string[] }>;
}

const DOMAIN_SOURCES: DomainSource[] = [
  {
    domain: "CAD-Sketch",
    schemaMap: SKETCH_CONSTRAINT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: SKETCH_CONSTRAINT_METADATA,
  },
  {
    domain: "CAD-Solid",
    schemaMap: SOLID_OPERATION_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: SOLID_OPERATION_METADATA,
  },
  {
    domain: "CAD-Surface",
    schemaMap: SURFACE_OPERATION_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: SURFACE_OPERATION_METADATA,
  },
  {
    domain: "CAD-Analysis",
    schemaMap: ANALYSIS_TOOL_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: ANALYSIS_TOOL_METADATA,
  },
  {
    domain: "CAD-Electrode",
    schemaMap: ELECTRODE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: ELECTRODE_METADATA,
  },
  {
    domain: "CAD-ImportExport",
    schemaMap: IMPORT_EXPORT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: IMPORT_EXPORT_METADATA,
  },
  {
    domain: "CAD-Measure",
    schemaMap: MEASURE_BOUNDING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: MEASURE_BOUNDING_METADATA,
  },
];

// ── DFM Hook Rule Definitions ──────────────────────────────────────────────────

/**
 * Static DFM-critical hook rules covering manufacturing-critical parameters.
 * These are the rules generated for all DFM-critical params across all domains.
 */
const DFM_HOOK_RULES: HookRule[] = [
  // ── Sketch domain: dimension tolerance ranges ──
  {
    paramName: "tolerance_upper",
    domain: "CAD-Sketch",
    minSafe: 0.005,
    maxSafe: 0.5,
    severity: "WARNING",
    description: "Dimension upper tolerance outside typical machining range (0.005-0.5 mm)",
  },
  {
    paramName: "tolerance_lower",
    domain: "CAD-Sketch",
    minSafe: -0.5,
    maxSafe: -0.005,
    severity: "WARNING",
    description: "Dimension lower tolerance outside typical machining range (-0.5 to -0.005 mm)",
  },
  // ── Sketch domain: radius min/max bounds ──
  {
    paramName: "min_radius",
    domain: "CAD-Sketch",
    minSafe: 0.1,
    maxSafe: 500,
    severity: "WARNING",
    description: "Minimum radius constraint below practical tool radius limit (0.1 mm)",
  },
  {
    paramName: "max_radius",
    domain: "CAD-Sketch",
    minSafe: 0.5,
    maxSafe: 10000,
    severity: "WARNING",
    description: "Maximum radius constraint at extreme values — verify clamping feasibility",
  },
  {
    paramName: "value",
    domain: "CAD-Sketch",
    minSafe: 0.05,
    maxSafe: 50000,
    severity: "WARNING",
    description: "Radius value outside practical manufacturing range — verify tooling availability",
  },
  // ── Solid domain: taper_angle ──
  {
    paramName: "taper_angle",
    domain: "CAD-Solid",
    minSafe: -5,
    maxSafe: 5,
    severity: "CRITICAL",
    description: "Extrusion taper angle exceeds 5 degrees — mold release may fail or part warps",
  },
  // ── Solid domain: wall_thickness ──
  {
    paramName: "wall_thickness",
    domain: "CAD-Solid",
    minSafe: 0.8,
    maxSafe: 200,
    severity: "CRITICAL",
    description: "Wall thickness below 0.8 mm (injection) or 1.0 mm (CNC) — structural failure risk",
  },
  // ── Solid domain: draft_angle ──
  {
    paramName: "draft_angle",
    domain: "CAD-Solid",
    minSafe: 1.0,
    maxSafe: 3.0,
    severity: "WARNING",
    description: "Draft angle outside typical 1-3 degree range for mold release",
  },
  // ── Solid domain: fillet radius ──
  {
    paramName: "radius",
    domain: "CAD-Solid",
    minSafe: 0.5,
    maxSafe: 5000,
    severity: "CRITICAL",
    description: "Fillet radius below minimum tool radius — internal corner not machinable",
  },
  // ── Analysis domain: min_draft_angle ──
  {
    paramName: "min_draft_angle",
    domain: "CAD-Analysis",
    minSafe: 0.5,
    maxSafe: 10,
    severity: "CRITICAL",
    description: "Minimum draft angle for mold release analysis set below industry minimum (0.5 degrees)",
  },
  // ── Analysis domain: threshold_angle ──
  {
    paramName: "threshold_angle",
    domain: "CAD-Analysis",
    minSafe: 1.0,
    maxSafe: 15,
    severity: "WARNING",
    description: "Draft threshold angle outside recommended DFM range (1-15 degrees)",
  },
  // ── Analysis domain: min_depth ──
  {
    paramName: "min_depth",
    domain: "CAD-Analysis",
    minSafe: 0.05,
    maxSafe: 50,
    severity: "WARNING",
    description: "Undercut minimum depth detection threshold outside practical range",
  },
  // ── Analysis domain: min_thickness ──
  {
    paramName: "min_thickness",
    domain: "CAD-Analysis",
    minSafe: 0.8,
    maxSafe: 10,
    severity: "CRITICAL",
    description: "Wall thickness DFM gate below 0.8 mm — part may not survive ejection or machining forces",
  },
  // ── Analysis domain: max_thickness ──
  {
    paramName: "max_thickness",
    domain: "CAD-Analysis",
    minSafe: 5,
    maxSafe: 200,
    severity: "WARNING",
    description: "Maximum wall thickness threshold outside range — sink marks and warpage risk above 200 mm",
  },
  // ── Electrode domain: spark_gap ──
  {
    paramName: "spark_gap",
    domain: "CAD-Electrode",
    minSafe: 0.01,
    maxSafe: 1.0,
    severity: "CRITICAL",
    description: "Spark gap outside safe EDM range (0.01-1.0 mm) — arcing or no material removal",
  },
  // ── Electrode domain: overcut_rough ──
  {
    paramName: "overcut_rough",
    domain: "CAD-Electrode",
    minSafe: 0.1,
    maxSafe: 1.5,
    severity: "CRITICAL",
    description: "Rough overcut outside practical range (0.1-1.5 mm) — electrode wear or insufficient removal",
  },
  // ── Electrode domain: overcut_finish ──
  {
    paramName: "overcut_finish",
    domain: "CAD-Electrode",
    minSafe: 0.01,
    maxSafe: 0.3,
    severity: "CRITICAL",
    description: "Finish overcut outside precision range (0.01-0.3 mm) — surface quality or dimensional risk",
  },
  // ── Electrode domain: min_draft on virtual electrode ──
  {
    paramName: "min_draft",
    domain: "CAD-Electrode",
    minSafe: 0.5,
    maxSafe: 15,
    severity: "WARNING",
    description: "Virtual electrode minimum draft angle outside practical range — flushing and extraction risk",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts parameter descriptors from a Zod object schema by inspecting its shape.
 */
function extractParamDescriptors(schema: ZodObject<ZodRawShape>): ParamDescriptor[] {
  const shape = schema.shape;
  const descriptors: ParamDescriptor[] = [];

  for (const [name, fieldDef] of Object.entries(shape)) {
    const field = fieldDef as z.ZodTypeAny;
    descriptors.push({
      name,
      type: resolveZodType(field),
      range: resolveZodRange(field),
      defaultValue: resolveZodDefault(field),
      unit: extractUnit(field),
    });
  }

  return descriptors;
}

/** Unwraps ZodDefault / ZodOptional to get the inner type */
function unwrap(field: z.ZodTypeAny): z.ZodTypeAny {
  let current = field;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (current instanceof z.ZodDefault) {
      current = (current as z.ZodDefault<z.ZodTypeAny>)._def.innerType;
    } else if (current instanceof z.ZodOptional) {
      current = (current as z.ZodOptional<z.ZodTypeAny>)._def.innerType;
    } else {
      break;
    }
  }
  return current;
}

function resolveZodType(field: z.ZodTypeAny): string {
  const inner = unwrap(field);
  if (inner instanceof z.ZodNumber) return "number";
  if (inner instanceof z.ZodString) return "string";
  if (inner instanceof z.ZodBoolean) return "boolean";
  if (inner instanceof z.ZodEnum) return "enum";
  if (inner instanceof z.ZodArray) return "array";
  return "unknown";
}

function resolveZodRange(field: z.ZodTypeAny): string {
  const inner = unwrap(field);
  if (inner instanceof z.ZodNumber) {
    // Zod v4: minValue/maxValue are direct properties on the ZodNumber instance
    const numSchema = inner as z.ZodNumber & { minValue?: number | null; maxValue?: number | null };
    const min = numSchema.minValue != null ? String(numSchema.minValue) : "-Infinity";
    const max = numSchema.maxValue != null ? String(numSchema.maxValue) : "Infinity";
    if (min !== "-Infinity" || max !== "Infinity") return `[${min}, ${max}]`;
    return "unbounded";
  }
  if (inner instanceof z.ZodEnum) {
    // Zod v4: entries is a Record<string, string>, not an array
    const enumDef = (inner as z.ZodEnum<never>)._def as unknown as { entries: Record<string, string> };
    const values = Object.keys(enumDef.entries);
    return values.join(" | ");
  }
  if (inner instanceof z.ZodBoolean) return "true | false";
  return "—";
}

function resolveZodDefault(field: z.ZodTypeAny): string {
  if (field instanceof z.ZodDefault) {
    // Zod v4: defaultValue is a plain value, not a function
    const def = (field as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue;
    if (Array.isArray(def)) return `[${def.join(",")}]`;
    if (typeof def === "string" && def === "") return '""';
    return String(def);
  }
  if (field instanceof z.ZodOptional) return "optional";
  return "required";
}

function extractUnit(field: z.ZodTypeAny): string {
  const desc = field.description ?? "";
  const mmMatch = desc.match(/\bmm\b/);
  if (mmMatch) return "mm";
  const degMatch = desc.match(/\bdegrees?\b/);
  if (degMatch) return "degrees";
  const barMatch = desc.match(/\bbar\b/);
  if (barMatch) return "bar";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class HyperMillCADArtifactGeneratorEngine {
  /**
   * Generates all CAD artifacts: skill templates, AC Python scripts, and DFM hook rules.
   */
  generate(): CADArtifactResult {
    const skills: SkillTemplate[] = [];
    const acPythonScripts: ACPythonScript[] = [];
    let totalParams = 0;

    for (const source of DOMAIN_SOURCES) {
      for (const [typeName, schema] of Object.entries(source.schemaMap)) {
        const meta = source.metadata[typeName];
        if (!meta) continue;

        // Extract param descriptors from the live Zod schema
        const parameterTable = extractParamDescriptors(schema);
        totalParams += meta.paramCount;

        // Build DFM warnings from metadata dfmCriticalParams
        const dfmWarnings: string[] = [];
        const dfmParams = (meta as { dfmCriticalParams?: string[] }).dfmCriticalParams ?? [];
        for (const dfmParam of dfmParams) {
          const matchingRule = DFM_HOOK_RULES.find(
            (r) => r.paramName === dfmParam && r.domain === source.domain
          );
          if (matchingRule) {
            dfmWarnings.push(
              `${dfmParam}: ${matchingRule.description} [${matchingRule.severity}]`
            );
          }
        }

        // Skill template
        skills.push({
          name: typeName,
          domain: source.domain,
          description: meta.description,
          parameterTable,
          acPythonSetter: meta.acPythonSetter,
          dfmWarnings,
        });

        // AC Python script
        acPythonScripts.push({
          name: typeName,
          domain: source.domain,
          script: meta.acPythonSetter,
        });
      }
    }

    return {
      skills,
      acPythonScripts,
      hookRules: DFM_HOOK_RULES,
      summary: {
        totalSchemaTypes: skills.length,
        totalParams,
        totalSkills: skills.length,
        totalScripts: acPythonScripts.length,
        totalHooks: DFM_HOOK_RULES.length,
      },
    };
  }
}

/** Singleton export */
export const hyperMillCADArtifactGeneratorEngine =
  new HyperMillCADArtifactGeneratorEngine();
