/**
 * HyperMillSimNCArtifactGeneratorEngine — Simulation + NC Artifact Batch Generator
 *
 * U-HKC35: Generates skill templates, AC Python setter scripts, and hook
 * validation rules from 3 hyperMILL parameter schema files (40 types
 * across Simulation-Core, Simulation-Extended, and NC-Output domains).
 *
 * Hook rules enforce DFM-critical and DFM-BLOCKING constraints covering
 * collision tolerance, gouge tolerance, travel limits, spindle load,
 * feed/speed safety, and NC output safety blocks.
 *
 * @domain SimNC-ArtifactGeneration
 * @milestone HM-KC-MS6/U-HKC35
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  SIMULATION_CORE_SCHEMA_MAP,
  SIMULATION_CORE_METADATA,
} from "../../schemas/hypermill/simulation/simulationCoreSchemas.js";

import {
  SIMULATION_EXTENDED_SCHEMA_MAP,
  SIMULATION_EXTENDED_METADATA,
} from "../../schemas/hypermill/simulation/simulationExtendedSchemas.js";

import {
  NC_OUTPUT_SCHEMA_MAP,
  NC_OUTPUT_METADATA,
} from "../../schemas/hypermill/nc/ncOutputSchemas.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Parameter descriptor extracted from a Zod schema field */
export interface SimNCParamDescriptor {
  name: string;
  type: string;
  range: string;
  defaultValue: string;
  unit: string;
}

/** Skill markdown template for one schema type */
export interface SimNCSkillTemplate {
  name: string;
  domain: string;
  description: string;
  parameterTable: SimNCParamDescriptor[];
  acPythonSetter: string;
  dfmWarnings: string[];
}

/** AC Python script record for one schema type */
export interface SimNCACPythonScript {
  name: string;
  domain: string;
  script: string;
}

/** Hook validation rule with severity classification */
export interface SimNCHookRule {
  paramName: string;
  domain: string;
  minSafe: number;
  maxSafe: number;
  severity: "CRITICAL" | "BLOCKING" | "WARNING";
  description: string;
}

/** Complete artifact generation result */
export interface SimNCArtifactResult {
  skills: SimNCSkillTemplate[];
  acPythonScripts: SimNCACPythonScript[];
  hookRules: SimNCHookRule[];
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
  metadata: Record<string, {
    paramCount: number;
    acPythonSetter: string;
    description: string;
    dfmCriticalParams?: string[];
    dfmBlockingParams?: string[];
  }>;
}

const DOMAIN_SOURCES: DomainSource[] = [
  {
    domain: "Simulation-Core",
    schemaMap: SIMULATION_CORE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: SIMULATION_CORE_METADATA,
  },
  {
    domain: "Simulation-Extended",
    schemaMap: SIMULATION_EXTENDED_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: SIMULATION_EXTENDED_METADATA,
  },
  {
    domain: "NC-Output",
    schemaMap: NC_OUTPUT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: NC_OUTPUT_METADATA,
  },
];

// ── Hook Rule Definitions ─────────────────────────────────────────────────────

/**
 * Static hook rules covering simulation and NC output DFM-critical parameters.
 * Includes BLOCKING severity for parameters that gate NC output generation.
 *
 * 9 rules across 3 domains:
 *  - collision_tolerance (Simulation-Core, CRITICAL)
 *  - halt_on_collision (Simulation-Core, BLOCKING)
 *  - gouge_tolerance (Simulation-Core, BLOCKING)
 *  - block_on_exceed (Simulation-Core, BLOCKING)
 *  - singularity_threshold (Simulation-Core, WARNING)
 *  - flag_zero_feed (Simulation-Extended, CRITICAL)
 *  - safe_start_block (NC-Output, CRITICAL)
 *  - max_spindle_speed (Simulation-Core, WARNING)
 *  - max_load_pct (Simulation-Extended, WARNING)
 */
const SIM_NC_HOOK_RULES: SimNCHookRule[] = [
  // ── Simulation-Core: Collision ──
  {
    paramName: "collision_tolerance",
    domain: "Simulation-Core",
    minSafe: 0.01,
    maxSafe: 5.0,
    severity: "CRITICAL",
    description: "Collision detection tolerance outside safe range (0.01-5.0 mm) — collision may go undetected or cause false positives",
  },
  {
    paramName: "halt_on_collision",
    domain: "Simulation-Core",
    minSafe: 1,
    maxSafe: 1,
    severity: "BLOCKING",
    description: "Halt-on-collision must be enabled — NC output must not proceed when collisions are detected",
  },
  // ── Simulation-Core: Gouge Detection ──
  {
    paramName: "gouge_tolerance",
    domain: "Simulation-Core",
    minSafe: 0.001,
    maxSafe: 0.1,
    severity: "BLOCKING",
    description: "Gouge tolerance outside safe range (0.001-0.1 mm) — part surface integrity compromised if gouges exceed tolerance",
  },
  // ── Simulation-Core: Travel Limits ──
  {
    paramName: "block_on_exceed",
    domain: "Simulation-Core",
    minSafe: 1,
    maxSafe: 1,
    severity: "BLOCKING",
    description: "Block-on-exceed must be enabled — NC output blocked when axis travel limits are exceeded",
  },
  // ── Simulation-Core: Singularity ──
  {
    paramName: "singularity_threshold",
    domain: "Simulation-Core",
    minSafe: 0.5,
    maxSafe: 5.0,
    severity: "WARNING",
    description: "Singularity detection threshold outside recommended range (0.5-5.0 degrees) — 5-axis motion may enter kinematic singularity zone",
  },
  // ── Simulation-Extended: Feed/Speed ──
  {
    paramName: "flag_zero_feed",
    domain: "Simulation-Extended",
    minSafe: 1,
    maxSafe: 1,
    severity: "CRITICAL",
    description: "Zero feed rate detection must be enabled — zero feed blocks cause tool breakage and spindle damage",
  },
  // ── NC-Output: Safety ──
  {
    paramName: "safe_start_block",
    domain: "NC-Output",
    minSafe: 1,
    maxSafe: 1,
    severity: "CRITICAL",
    description: "Safety start block must be present — program must begin with known safe machine state (G-codes for spindle, coolant, coords)",
  },
  // ── Simulation-Core: Spindle Limits ──
  {
    paramName: "max_spindle_speed",
    domain: "Simulation-Core",
    minSafe: 100,
    maxSafe: 60000,
    severity: "WARNING",
    description: "Maximum spindle speed outside typical range (100-60000 RPM) — verify machine capability and tool rating",
  },
  // ── Simulation-Extended: Spindle Load ──
  {
    paramName: "max_load_pct",
    domain: "Simulation-Extended",
    minSafe: 10,
    maxSafe: 90,
    severity: "WARNING",
    description: "Maximum spindle load percentage outside recommended range (10-90%) — risk of spindle stall or insufficient utilization",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts parameter descriptors from a Zod object schema by inspecting its shape.
 * @param schema - Zod object schema to extract parameters from
 * @returns Array of parameter descriptors with type, range, default, and unit info
 */
function extractParamDescriptors(schema: ZodObject<ZodRawShape>): SimNCParamDescriptor[] {
  const shape = schema.shape;
  const descriptors: SimNCParamDescriptor[] = [];

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
  const rpmMatch = desc.match(/\bRPM\b/i);
  if (rpmMatch) return "RPM";
  const secMatch = desc.match(/\bseconds?\b/);
  if (secMatch) return "seconds";
  const minMatch = desc.match(/\bminutes?\b/);
  if (minMatch) return "minutes";
  const pctMatch = desc.match(/\b%\b/);
  if (pctMatch) return "%";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class HyperMillSimNCArtifactGeneratorEngine {
  /**
   * Generates all Simulation + NC artifacts: skill templates, AC Python scripts,
   * and hook validation rules across 3 schema domains.
   * @returns SimNCArtifactResult containing skills, scripts, hooks, and summary
   */
  generate(): SimNCArtifactResult {
    const skills: SimNCSkillTemplate[] = [];
    const acPythonScripts: SimNCACPythonScript[] = [];
    let totalParams = 0;

    for (const source of DOMAIN_SOURCES) {
      for (const [typeName, schema] of Object.entries(source.schemaMap)) {
        const meta = source.metadata[typeName];
        if (!meta) continue;

        // Extract param descriptors from the live Zod schema
        const parameterTable = extractParamDescriptors(schema);
        totalParams += meta.paramCount;

        // Build DFM warnings from metadata dfmCriticalParams + dfmBlockingParams
        const dfmWarnings: string[] = [];
        const dfmCritical = (meta as { dfmCriticalParams?: string[] }).dfmCriticalParams ?? [];
        const dfmBlocking = (meta as { dfmBlockingParams?: string[] }).dfmBlockingParams ?? [];

        for (const dfmParam of dfmCritical) {
          const matchingRule = SIM_NC_HOOK_RULES.find(
            (r) => r.paramName === dfmParam && r.domain === source.domain
          );
          if (matchingRule) {
            dfmWarnings.push(
              `${dfmParam}: ${matchingRule.description} [${matchingRule.severity}]`
            );
          }
        }

        for (const dfmParam of dfmBlocking) {
          const matchingRule = SIM_NC_HOOK_RULES.find(
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
      hookRules: SIM_NC_HOOK_RULES,
      summary: {
        totalSchemaTypes: skills.length,
        totalParams,
        totalSkills: skills.length,
        totalScripts: acPythonScripts.length,
        totalHooks: SIM_NC_HOOK_RULES.length,
      },
    };
  }
}

/** Singleton export */
export const hyperMillSimNCArtifactGeneratorEngine =
  new HyperMillSimNCArtifactGeneratorEngine();
