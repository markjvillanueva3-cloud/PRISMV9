/**
 * HyperMillCAMAdvancedArtifactGeneratorEngine — CAM Advanced Artifact Batch Generator
 *
 * U-HKC27: Generates skill templates, AC Python setter scripts, and DFM hook
 * validation rules from the 7 CAM advanced parameter schema files (82+ types,
 * 800+ params across 7 domains: 5-axis tool axis, 5-axis collision, 5-axis blade,
 * 5-axis surface quality, turning, probing, grinding).
 *
 * @domain CAM-AdvancedArtifactGeneration
 * @milestone HM-KC-MS4/U-HKC27
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP,
  FIVE_AXIS_TOOL_AXIS_METADATA,
} from "../../schemas/hypermill/cam/fiveAxisToolAxisSchemas.js";

import {
  FIVE_AXIS_COLLISION_SCHEMA_MAP,
  FIVE_AXIS_COLLISION_METADATA,
} from "../../schemas/hypermill/cam/fiveAxisCollisionSchemas.js";

import {
  FIVE_AXIS_BLADE_SCHEMA_MAP,
  FIVE_AXIS_BLADE_METADATA,
} from "../../schemas/hypermill/cam/fiveAxisBladeSchemas.js";

import {
  FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP,
  FIVE_AXIS_SURFACE_QUALITY_METADATA,
} from "../../schemas/hypermill/cam/fiveAxisSurfaceQualitySchemas.js";

import {
  TURNING_SCHEMA_MAP,
  TURNING_METADATA,
} from "../../schemas/hypermill/cam/turningSchemas.js";

import {
  PROBING_SCHEMA_MAP,
  PROBING_METADATA,
} from "../../schemas/hypermill/cam/probingSchemas.js";

import {
  GRINDING_SCHEMA_MAP,
  GRINDING_METADATA,
} from "../../schemas/hypermill/cam/grindingSchemas.js";

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
export interface CAMAdvancedArtifactResult {
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
    domain: "CAM-5Axis-ToolAxis",
    schemaMap: FIVE_AXIS_TOOL_AXIS_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: FIVE_AXIS_TOOL_AXIS_METADATA,
  },
  {
    domain: "CAM-5Axis-Collision",
    schemaMap: FIVE_AXIS_COLLISION_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: FIVE_AXIS_COLLISION_METADATA,
  },
  {
    domain: "CAM-5Axis-Blade",
    schemaMap: FIVE_AXIS_BLADE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: FIVE_AXIS_BLADE_METADATA,
  },
  {
    domain: "CAM-5Axis-SurfaceQuality",
    schemaMap: FIVE_AXIS_SURFACE_QUALITY_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: FIVE_AXIS_SURFACE_QUALITY_METADATA,
  },
  {
    domain: "CAM-Turning",
    schemaMap: TURNING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: TURNING_METADATA,
  },
  {
    domain: "CAM-Probing",
    schemaMap: PROBING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: PROBING_METADATA,
  },
  {
    domain: "CAM-Grinding",
    schemaMap: GRINDING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: GRINDING_METADATA,
  },
];

// ── DFM Hook Rule Definitions ──────────────────────────────────────────────────

/**
 * Static DFM-critical hook rules covering manufacturing-critical parameters
 * across all 7 CAM advanced domains. At least 15 rules covering tilt limits
 * (5-axis), collision distance, blade cusp height, channel type, CSS max RPM,
 * S_max_clamp, threading feed sync, probe approach speed, grinding burn risk,
 * nose_radius, and creep feed depth.
 *
 * Ranges derived from hyperMILL best-practice guides, ISO 13399, and
 * machining handbook recommendations for safe 5-axis / turning / probing
 * / grinding operation windows.
 */
const DFM_HOOK_RULES: HookRule[] = [
  // ── 5-Axis Tool Axis domain ──
  {
    paramName: "tilt_angle",
    domain: "CAM-5Axis-ToolAxis",
    minSafe: -45,
    maxSafe: 45,
    severity: "CRITICAL",
    description: "5-axis tilt angle outside safe range (-45 to 45 deg) — axis singularity and collision risk at extremes",
  },
  {
    paramName: "lead_angle",
    domain: "CAM-5Axis-ToolAxis",
    minSafe: -15,
    maxSafe: 15,
    severity: "WARNING",
    description: "Lead angle outside recommended range (-15 to 15 deg) — excessive chip thinning compensation error",
  },
  // ── 5-Axis Collision domain ──
  {
    paramName: "tilt_limit_min",
    domain: "CAM-5Axis-Collision",
    minSafe: -60,
    maxSafe: 0,
    severity: "CRITICAL",
    description: "Collision tilt limit minimum outside safe range (-60 to 0 deg) — insufficient avoidance or over-constrained motion",
  },
  {
    paramName: "tilt_limit_max",
    domain: "CAM-5Axis-Collision",
    minSafe: 0,
    maxSafe: 60,
    severity: "CRITICAL",
    description: "Collision tilt limit maximum outside safe range (0 to 60 deg) — holder collision at large tilt values",
  },
  {
    paramName: "collision_distance",
    domain: "CAM-5Axis-Collision",
    minSafe: 0.5,
    maxSafe: 50,
    severity: "CRITICAL",
    description: "Collision clearance distance outside safe range (0.5-50 mm) — too tight causes crashes, too loose wastes motion",
  },
  // ── 5-Axis Blade domain ──
  {
    paramName: "blade_cusp_height",
    domain: "CAM-5Axis-Blade",
    minSafe: 0.002,
    maxSafe: 0.1,
    severity: "CRITICAL",
    description: "Blade cusp height outside precision range (0.002-0.1 mm) — aerodynamic surface non-conformance or excessive cycle time",
  },
  {
    paramName: "channel_type",
    domain: "CAM-5Axis-Blade",
    minSafe: 0,
    maxSafe: 2,
    severity: "WARNING",
    description: "Channel type selection (open/closed/semi_open) affects access strategy — closed channels require shorter tools and tighter collision margins",
  },
  {
    paramName: "roughing_allowance",
    domain: "CAM-5Axis-Blade",
    minSafe: 0.05,
    maxSafe: 5,
    severity: "WARNING",
    description: "Blade roughing allowance outside recommended range (0.05-5 mm) — too thin risks gouging, too thick overloads finishing",
  },
  // ── 5-Axis Surface Quality domain ──
  {
    paramName: "target_height",
    domain: "CAM-5Axis-SurfaceQuality",
    minSafe: 0.001,
    maxSafe: 0.1,
    severity: "CRITICAL",
    description: "Scallop target height outside precision range (0.001-0.1 mm) — surface finish exceeds drawing tolerance or wastes cycle time",
  },
  // ── Turning domain ──
  {
    paramName: "s_max_clamp",
    domain: "CAM-Turning",
    minSafe: 100,
    maxSafe: 12000,
    severity: "CRITICAL",
    description: "CSS max RPM clamp outside safe range (100-12000 RPM) — spindle overspeed at small diameters or insufficient surface speed at large diameters",
  },
  {
    paramName: "nose_radius",
    domain: "CAM-Turning",
    minSafe: 0.1,
    maxSafe: 3.2,
    severity: "CRITICAL",
    description: "Turning insert nose radius outside standard range (0.1-3.2 mm) — TNRC compensation error and surface finish deviation",
  },
  {
    paramName: "pitch",
    domain: "CAM-Turning",
    minSafe: 0.2,
    maxSafe: 6.0,
    severity: "CRITICAL",
    description: "Threading pitch outside standard range (0.2-6.0 mm) — feed/spindle sync failure causes tap breakage",
  },
  // ── Probing domain ──
  {
    paramName: "approach_feed",
    domain: "CAM-Probing",
    minSafe: 50,
    maxSafe: 2000,
    severity: "CRITICAL",
    description: "Probe approach feed outside safe range (50-2000 mm/min) — too fast risks stylus damage or trigger overshoot, too slow wastes cycle time",
  },
  // ── Grinding domain ──
  {
    paramName: "depth_of_cut",
    domain: "CAM-Grinding",
    minSafe: 0.05,
    maxSafe: 5,
    severity: "CRITICAL",
    description: "Creep-feed grinding depth of cut outside safe range (0.05-5 mm) — thermal burn and wheel loading at excessive depth",
  },
  {
    paramName: "burn_risk_threshold",
    domain: "CAM-Grinding",
    minSafe: 0.3,
    maxSafe: 0.95,
    severity: "CRITICAL",
    description: "Grinding burn risk threshold outside useful range (0.3-0.95) — too low triggers false alarms, too high misses real burn events",
  },
  {
    paramName: "depth_per_pass",
    domain: "CAM-Grinding",
    minSafe: 0.001,
    maxSafe: 0.2,
    severity: "WARNING",
    description: "Surface grinding depth per pass outside safe range (0.001-0.2 mm) — exceeding causes thermal damage and wheel glazing",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts parameter descriptors from a Zod object schema by inspecting its shape.
 * @param schema - Zod object schema to introspect
 * @returns Array of parameter descriptors with name, type, range, default, and unit
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
    const numSchema = inner as z.ZodNumber & { minValue?: number | null; maxValue?: number | null };
    const min = numSchema.minValue != null ? String(numSchema.minValue) : "-Infinity";
    const max = numSchema.maxValue != null ? String(numSchema.maxValue) : "Infinity";
    if (min !== "-Infinity" || max !== "Infinity") return `[${min}, ${max}]`;
    return "unbounded";
  }
  if (inner instanceof z.ZodEnum) {
    const enumDef = (inner as z.ZodEnum<never>)._def as unknown as { entries: Record<string, string> };
    const values = Object.keys(enumDef.entries);
    return values.join(" | ");
  }
  if (inner instanceof z.ZodBoolean) return "true | false";
  return "—";
}

function resolveZodDefault(field: z.ZodTypeAny): string {
  if (field instanceof z.ZodDefault) {
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
  // Check compound units BEFORE simple units to avoid partial matches
  if (desc.match(/\bmm\/min\b/)) return "mm/min";
  if (desc.match(/\bmm\/rev\b/)) return "mm/rev";
  if (desc.match(/\bm\/min\b/)) return "m/min";
  if (desc.match(/\bm\/s\b/)) return "m/s";
  if (desc.match(/\bl\/min\b/)) return "l/min";
  if (desc.match(/\bmm\b/)) return "mm";
  if (desc.match(/\bdegrees?\b/)) return "degrees";
  if (desc.match(/\bbar\b/)) return "bar";
  if (desc.match(/\bRPM\b/)) return "RPM";
  if (desc.match(/\bsec\b/)) return "sec";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

/**
 * HyperMillCAMAdvancedArtifactGeneratorEngine generates all CAM advanced artifacts:
 * skill templates, AC Python scripts, and DFM hook rules from the 7 CAM advanced
 * parameter schema sources (5-axis tool axis, collision, blade, surface quality,
 * turning, probing, grinding).
 */
export class HyperMillCAMAdvancedArtifactGeneratorEngine {
  /**
   * Generates all CAM advanced artifacts: skill templates, AC Python scripts, and DFM hook rules.
   * @returns CAMAdvancedArtifactResult with skills, scripts, hooks, and summary counts
   */
  generate(): CAMAdvancedArtifactResult {
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
export const hyperMillCAMAdvancedArtifactGeneratorEngine =
  new HyperMillCAMAdvancedArtifactGeneratorEngine();
