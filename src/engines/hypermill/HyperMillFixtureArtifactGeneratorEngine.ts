/**
 * HyperMillFixtureArtifactGeneratorEngine — Fixture Domain Artifact Batch Generator
 *
 * U-HKC15: Generates skill templates, AC Python setter scripts, and DFM hook
 * validation rules from the 6 fixture/setup parameter schema files (25 types,
 * 155 params across 6 domains).
 *
 * @domain Fixture-ArtifactGeneration
 * @milestone HM-KC-MS2/U-HKC15
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  WORKHOLDING_SCHEMA_MAP,
  WORKHOLDING_METADATA,
} from "../../schemas/hypermill/fixture/workholdingSchemas.js";

import {
  STOCK_MODEL_SCHEMA_MAP,
  STOCK_MODEL_METADATA,
} from "../../schemas/hypermill/fixture/stockModelSchemas.js";

import {
  WCS_SCHEMA_MAP,
  WCS_METADATA,
} from "../../schemas/hypermill/fixture/wcsSchemas.js";

import {
  CLEARANCE_SCHEMA_MAP,
  CLEARANCE_METADATA,
} from "../../schemas/hypermill/fixture/clearanceSchemas.js";

import {
  SETUP_SCHEMA_MAP,
  SETUP_METADATA,
} from "../../schemas/hypermill/fixture/setupSchemas.js";

import {
  ALLOWANCE_SCHEMA_MAP,
  ALLOWANCE_METADATA,
} from "../../schemas/hypermill/fixture/allowanceSchemas.js";

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

/** DFM hook validation rule — includes BLOCKING severity for fixture safety gates */
export interface HookRule {
  paramName: string;
  domain: string;
  minSafe: number;
  maxSafe: number;
  severity: "CRITICAL" | "WARNING" | "BLOCKING";
  description: string;
}

/** Complete artifact generation result */
export interface FixtureArtifactResult {
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
    domain: "Fixture-Workholding",
    schemaMap: WORKHOLDING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: WORKHOLDING_METADATA,
  },
  {
    domain: "Fixture-Stock",
    schemaMap: STOCK_MODEL_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: STOCK_MODEL_METADATA,
  },
  {
    domain: "Fixture-WCS",
    schemaMap: WCS_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: WCS_METADATA,
  },
  {
    domain: "Fixture-Clearance",
    schemaMap: CLEARANCE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: CLEARANCE_METADATA,
  },
  {
    domain: "Fixture-Setup",
    schemaMap: SETUP_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: SETUP_METADATA,
  },
  {
    domain: "Fixture-Allowance",
    schemaMap: ALLOWANCE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: ALLOWANCE_METADATA,
  },
];

// ── DFM Hook Rule Definitions ──────────────────────────────────────────────────

/**
 * Static DFM-critical hook rules covering manufacturing-critical parameters
 * across all 6 fixture domains. 12 rules total covering workholding force,
 * stock containment, WCS safety, clearance margins, and allowance gates.
 */
const DFM_HOOK_RULES: HookRule[] = [
  // ── Workholding domain ──
  {
    paramName: "grip_force",
    domain: "Fixture-Workholding",
    minSafe: 500,
    maxSafe: 500000,
    severity: "CRITICAL",
    description: "Chuck/collet grip force must be >= 2.5x cutting force — part ejection risk if insufficient",
  },
  {
    paramName: "bore_diameter",
    domain: "Fixture-Workholding",
    minSafe: 1,
    maxSafe: 1000,
    severity: "WARNING",
    description: "Soft jaw bore diameter must match part OD within tolerance — misfit causes runout and part damage",
  },
  {
    paramName: "jaw_width",
    domain: "Fixture-Workholding",
    minSafe: 25,
    maxSafe: 500,
    severity: "WARNING",
    description: "Vise jaw width outside standard range (25-500 mm) — verify fixture stability",
  },
  {
    paramName: "hold_force_per_zone",
    domain: "Fixture-Workholding",
    minSafe: 100,
    maxSafe: 50000,
    severity: "CRITICAL",
    description: "Vacuum/magnetic hold force per zone must exceed cutting force — part release risk during cut",
  },
  {
    paramName: "clamping_force",
    domain: "Fixture-Workholding",
    minSafe: 500,
    maxSafe: 100000,
    severity: "CRITICAL",
    description: "Vise clamping force must exceed cutting force — part shift causes scrap and tool breakage",
  },
  // ── Stock domain ──
  {
    paramName: "verify_containment",
    domain: "Fixture-Stock",
    minSafe: 0,
    maxSafe: 1,
    severity: "WARNING",
    description: "Stock body containment verification should be enabled — uncontained stock causes air cuts and crashes",
  },
  // ── WCS domain ──
  {
    paramName: "auto_update_wcs",
    domain: "Fixture-WCS",
    minSafe: 0,
    maxSafe: 1,
    severity: "WARNING",
    description: "Auto-update WCS from probe result is dangerous — unexpected deviation may shift all operations",
  },
  {
    paramName: "position_uncertainty",
    domain: "Fixture-WCS",
    minSafe: 0,
    maxSafe: 0.5,
    severity: "CRITICAL",
    description: "Multi-setup position uncertainty budget exceeds 0.5 mm — tolerance stack-up causes out-of-spec parts",
  },
  // ── Clearance domain ──
  {
    paramName: "safety_margin",
    domain: "Fixture-Clearance",
    minSafe: 0.1,
    maxSafe: 200,
    severity: "CRITICAL",
    description: "Clearance plane safety margin must be > 0 — zero margin causes tool-fixture collision on rapid moves",
  },
  {
    paramName: "plunge_feed_rate",
    domain: "Fixture-Clearance",
    minSafe: 1,
    maxSafe: 5000,
    severity: "WARNING",
    description: "Plunge feed rate outside safe range (1-5000 mm/min) — tool breakage or excessive cycle time",
  },
  // ── Allowance domain ──
  {
    paramName: "allow_negative",
    domain: "Fixture-Allowance",
    minSafe: 0,
    maxSafe: 0,
    severity: "BLOCKING",
    description: "Negative allowance cuts INTO finished surface — DFM-BLOCKING gate requires explicit confirmation",
  },
  {
    paramName: "max_negative_depth",
    domain: "Fixture-Allowance",
    minSafe: -10,
    maxSafe: 0,
    severity: "CRITICAL",
    description: "Maximum negative allowance depth exceeds safe limit — irreversible material removal from finished surface",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts parameter descriptors from a Zod object schema by inspecting its shape.
 * @param schema - Zod object schema to extract parameters from
 * @returns Array of ParamDescriptor records
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
  if (inner instanceof z.ZodObject) return "object";
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
  if (inner instanceof z.ZodObject) return "object";
  return "—";
}

function resolveZodDefault(field: z.ZodTypeAny): string {
  if (field instanceof z.ZodDefault) {
    const def = (field as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue;
    if (Array.isArray(def)) return `[${def.join(",")}]`;
    if (typeof def === "object" && def !== null) return JSON.stringify(def);
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
  const nMatch = desc.match(/\b[Nn]\b/);
  if (nMatch) return "N";
  const kgMatch = desc.match(/\bkg\b/);
  if (kgMatch) return "kg";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class HyperMillFixtureArtifactGeneratorEngine {
  /**
   * Generates all fixture artifacts: skill templates, AC Python scripts, and DFM hook rules.
   * @returns FixtureArtifactResult containing skills, scripts, hooks, and summary counts
   */
  generate(): FixtureArtifactResult {
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
export const hyperMillFixtureArtifactGeneratorEngine =
  new HyperMillFixtureArtifactGeneratorEngine();
