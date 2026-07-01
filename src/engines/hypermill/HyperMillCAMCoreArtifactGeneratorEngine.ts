/**
 * HyperMillCAMCoreArtifactGeneratorEngine — CAM Core Artifact Batch Generator
 *
 * U-HKC22: Generates skill templates, AC Python setter scripts, and DFM hook
 * validation rules from the 8 CAM parameter schema files (49+ types,
 * 1000+ params across 8 domains: drilling, 2D core, 2D extended, 3D core,
 * 3D advanced, cutting data, tool compensation, coolant).
 *
 * @domain CAM-ArtifactGeneration
 * @milestone HM-KC-MS3/U-HKC22
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  DRILLING_SCHEMA_MAP,
  DRILLING_METADATA,
} from "../../schemas/hypermill/cam/drillingSchemas.js";

import {
  TWO_D_CORE_SCHEMA_MAP,
  TWO_D_CORE_METADATA,
} from "../../schemas/hypermill/cam/twoDSchemas.js";

import {
  TWO_D_EXTENDED_SCHEMA_MAP,
  TWO_D_EXTENDED_METADATA,
} from "../../schemas/hypermill/cam/twoDExtendedSchemas.js";

import {
  THREE_D_CORE_SCHEMA_MAP,
  THREE_D_CORE_METADATA,
} from "../../schemas/hypermill/cam/threeDCoreSchemas.js";

import {
  THREE_D_ADVANCED_SCHEMA_MAP,
  THREE_D_ADVANCED_METADATA,
} from "../../schemas/hypermill/cam/threeDAdvancedSchemas.js";

import {
  CUTTING_DATA_SCHEMA_MAP,
  CUTTING_DATA_METADATA,
} from "../../schemas/hypermill/cam/cuttingDataSchemas.js";

import {
  TOOL_COMP_SCHEMA_MAP,
  TOOL_COMP_METADATA,
} from "../../schemas/hypermill/cam/toolCompSchemas.js";

import {
  COOLANT_SCHEMA_MAP,
  COOLANT_METADATA,
} from "../../schemas/hypermill/cam/coolantSchemas.js";

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
export interface CAMCoreArtifactResult {
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
    domain: "CAM-Drilling",
    schemaMap: DRILLING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: DRILLING_METADATA,
  },
  {
    domain: "CAM-2D-Core",
    schemaMap: TWO_D_CORE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: TWO_D_CORE_METADATA,
  },
  {
    domain: "CAM-2D-Extended",
    schemaMap: TWO_D_EXTENDED_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: TWO_D_EXTENDED_METADATA,
  },
  {
    domain: "CAM-3D-Core",
    schemaMap: THREE_D_CORE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: THREE_D_CORE_METADATA,
  },
  {
    domain: "CAM-3D-Advanced",
    schemaMap: THREE_D_ADVANCED_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: THREE_D_ADVANCED_METADATA,
  },
  {
    domain: "CAM-CuttingData",
    schemaMap: CUTTING_DATA_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: CUTTING_DATA_METADATA,
  },
  {
    domain: "CAM-ToolComp",
    schemaMap: TOOL_COMP_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: TOOL_COMP_METADATA as unknown as Record<string, { paramCount: number; acPythonSetter: string; description: string; dfmCriticalParams?: string[] }>,
  },
  {
    domain: "CAM-Coolant",
    schemaMap: COOLANT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: COOLANT_METADATA,
  },
];

// ── DFM Hook Rule Definitions ──────────────────────────────────────────────────

/**
 * Static DFM-critical hook rules covering manufacturing-critical parameters
 * across all 8 CAM domains. At least 15 rules covering drilling L/D ratio,
 * peck depth, tap pitch/feed sync, 2D stepdown, 3D stepdown/stepover/cusp,
 * MAXX engagement, cutting data depth/pitch/HSC, tool comp nose radius,
 * and coolant high-pressure minimum.
 */
const DFM_HOOK_RULES: HookRule[] = [
  // ── Drilling domain ──
  {
    paramName: "ld_ratio_limit",
    domain: "CAM-Drilling",
    minSafe: 3,
    maxSafe: 12,
    severity: "CRITICAL",
    description: "Drill L/D ratio limit outside safe range (3-12x) — chip evacuation failure and drill breakage risk",
  },
  {
    paramName: "first_peck_depth",
    domain: "CAM-Drilling",
    minSafe: 0.5,
    maxSafe: 50,
    severity: "WARNING",
    description: "First peck depth outside recommended range (0.5-50 mm) — excessive tool load or poor chip clearing",
  },
  {
    paramName: "thread_pitch",
    domain: "CAM-Drilling",
    minSafe: 0.2,
    maxSafe: 6.0,
    severity: "CRITICAL",
    description: "Thread pitch outside standard range (0.2-6.0 mm) — feed/spindle sync failure causes tap breakage",
  },
  // ── 2D domain: stepdown engagement, rest tool diameter, chamfer angle ──
  {
    paramName: "stepdown",
    domain: "CAM-2D-Core",
    minSafe: 0.1,
    maxSafe: 25,
    severity: "WARNING",
    description: "2D pocket/contour stepdown outside safe range (0.1-25 mm) — tool overload or excessive passes",
  },
  {
    paramName: "max_engagement_angle",
    domain: "CAM-2D-Core",
    minSafe: 30,
    maxSafe: 180,
    severity: "CRITICAL",
    description: "Maximum cutter engagement angle exceeds safe limit — radial force spike and chatter risk",
  },
  {
    paramName: "previous_tool_diameter",
    domain: "CAM-2D-Extended",
    minSafe: 0.5,
    maxSafe: 200,
    severity: "WARNING",
    description: "Rest machining previous tool diameter outside range — incorrect rest area calculation",
  },
  {
    paramName: "chamfer_angle",
    domain: "CAM-2D-Extended",
    minSafe: 15,
    maxSafe: 75,
    severity: "WARNING",
    description: "Chamfer angle outside typical range (15-75 degrees) — non-standard tooling or weak edge",
  },
  // ── 3D Core domain: z-level stepdown, parallel stepover, scallop cusp ──
  {
    paramName: "stepdown",
    domain: "CAM-3D-Core",
    minSafe: 0.05,
    maxSafe: 10,
    severity: "CRITICAL",
    description: "Z-level stepdown outside safe range (0.05-10 mm) — surface quality degradation or tool overload",
  },
  {
    paramName: "stepover",
    domain: "CAM-3D-Core",
    minSafe: 0.01,
    maxSafe: 20,
    severity: "CRITICAL",
    description: "Parallel stepover outside safe range (0.01-20 mm) — scallop height exceeds tolerance or excessive cycle time",
  },
  {
    paramName: "cusp_height_target",
    domain: "CAM-3D-Core",
    minSafe: 0.001,
    maxSafe: 0.5,
    severity: "WARNING",
    description: "Scallop cusp height target outside precision range (0.001-0.5 mm) — surface finish non-conformance",
  },
  // ── 3D Advanced domain: MAXX engagement, MAXX HPC radial engagement ──
  {
    paramName: "engagement_angle",
    domain: "CAM-3D-Advanced",
    minSafe: 20,
    maxSafe: 120,
    severity: "CRITICAL",
    description: "MAXX offset roughing engagement angle outside safe range (20-120 deg) — tool deflection and chatter",
  },
  {
    paramName: "radial_engagement_pct",
    domain: "CAM-3D-Advanced",
    minSafe: 5,
    maxSafe: 40,
    severity: "CRITICAL",
    description: "MAXX HPC radial engagement percentage outside safe range (5-40%) — tool overload or insufficient MRR",
  },
  // ── Cutting Data domain: roughing depth_of_cut, threading pitch, HSC radial ──
  {
    paramName: "depth_of_cut",
    domain: "CAM-CuttingData",
    minSafe: 0.05,
    maxSafe: 50,
    severity: "CRITICAL",
    description: "Roughing depth of cut outside safe range (0.05-50 mm) — tool stability boundary exceeded",
  },
  {
    paramName: "pitch",
    domain: "CAM-CuttingData",
    minSafe: 0.2,
    maxSafe: 6.0,
    severity: "CRITICAL",
    description: "Threading pitch outside standard range (0.2-6.0 mm) — incorrect thread form or synchronization failure",
  },
  {
    paramName: "radial_engagement_pct",
    domain: "CAM-CuttingData",
    minSafe: 5,
    maxSafe: 50,
    severity: "WARNING",
    description: "HSC/HPC radial engagement percentage outside optimal range (5-50%) — chip thinning compensation error",
  },
  // ── Tool Compensation domain: turning nose_radius ──
  {
    paramName: "nose_radius",
    domain: "CAM-ToolComp",
    minSafe: 0.1,
    maxSafe: 3.2,
    severity: "CRITICAL",
    description: "Turning insert nose radius outside standard range (0.1-3.2 mm) — TNRC compensation error and surface finish deviation",
  },
  // ── Coolant domain: high pressure minimum ──
  {
    paramName: "pressure",
    domain: "CAM-Coolant",
    minSafe: 40,
    maxSafe: 300,
    severity: "CRITICAL",
    description: "High-pressure coolant below minimum (40 bar) — insufficient chip evacuation in deep holes and BTA drilling",
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
  const mmMatch = desc.match(/\bmm\b/);
  if (mmMatch) return "mm";
  const degMatch = desc.match(/\bdegrees?\b/);
  if (degMatch) return "degrees";
  const barMatch = desc.match(/\bbar\b/);
  if (barMatch) return "bar";
  const rpmMatch = desc.match(/\bRPM\b/);
  if (rpmMatch) return "RPM";
  const secMatch = desc.match(/\bsec\b/);
  if (secMatch) return "sec";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

/**
 * HyperMillCAMCoreArtifactGeneratorEngine generates all CAM core artifacts:
 * skill templates, AC Python scripts, and DFM hook rules from the 8 CAM
 * parameter schema sources.
 */
export class HyperMillCAMCoreArtifactGeneratorEngine {
  /**
   * Generates all CAM artifacts: skill templates, AC Python scripts, and DFM hook rules.
   * @returns CAMCoreArtifactResult with skills, scripts, hooks, and summary counts
   */
  generate(): CAMCoreArtifactResult {
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
export const hyperMillCAMCoreArtifactGeneratorEngine =
  new HyperMillCAMCoreArtifactGeneratorEngine();
