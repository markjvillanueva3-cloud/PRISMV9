/**
 * HyperMillLinkingArtifactGeneratorEngine — Linking Domain Artifact Generator
 *
 * U-HKC31: Generates skill templates, AC Python setter scripts, and DFM hook
 * validation rules from the 5 hyperMILL linking parameter schema files (29 types,
 * 162 params across 5 sub-domains).
 *
 * @domain CAM-Linking-ArtifactGeneration
 * @milestone HM-KC-MS5/U-HKC31
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  LEAD_IN_OUT_SCHEMA_MAP,
  LEAD_IN_OUT_METADATA,
} from "../../schemas/hypermill/linking/leadInOutSchemas.js";

import {
  RETRACT_SCHEMA_MAP,
  RETRACT_METADATA,
} from "../../schemas/hypermill/linking/retractSchemas.js";

import {
  TRANSITION_SCHEMA_MAP,
  TRANSITION_METADATA,
} from "../../schemas/hypermill/linking/transitionSchemas.js";

import {
  ENTRY_METHOD_SCHEMA_MAP,
  ENTRY_METHOD_METADATA,
} from "../../schemas/hypermill/linking/entryMethodSchemas.js";

import {
  STAY_DOWN_SCHEMA_MAP,
  STAY_DOWN_METADATA,
} from "../../schemas/hypermill/linking/stayDownSchemas.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Parameter descriptor extracted from a Zod schema field */
export interface LinkingParamDescriptor {
  name: string;
  type: string;
  range: string;
  defaultValue: string;
  unit: string;
}

/** Skill markdown template for one schema type */
export interface LinkingSkillTemplate {
  name: string;
  domain: string;
  description: string;
  parameterTable: LinkingParamDescriptor[];
  acPythonSetter: string;
  dfmWarnings: string[];
}

/** AC Python script record for one schema type */
export interface LinkingACPythonScript {
  name: string;
  domain: string;
  script: string;
}

/** DFM hook validation rule for linking domain */
export interface LinkingHookRule {
  paramName: string;
  domain: string;
  minSafe: number;
  maxSafe: number;
  severity: "CRITICAL" | "WARNING";
  description: string;
}

/** Complete linking artifact generation result */
export interface LinkingArtifactResult {
  skills: LinkingSkillTemplate[];
  acPythonScripts: LinkingACPythonScript[];
  hookRules: LinkingHookRule[];
  summary: {
    totalSchemaTypes: number;
    totalParams: number;
    totalSkills: number;
    totalScripts: number;
    totalHooks: number;
  };
}

// ── Domain source registry ─────────────────────────────────────────────────────

interface LinkingDomainSource {
  domain: string;
  schemaMap: Record<string, ZodObject<ZodRawShape>>;
  metadata: Record<string, { paramCount: number; acPythonSetter: string; description: string; dfmCriticalParams?: string[] }>;
}

const DOMAIN_SOURCES: LinkingDomainSource[] = [
  {
    domain: "Linking-LeadInOut",
    schemaMap: LEAD_IN_OUT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: LEAD_IN_OUT_METADATA,
  },
  {
    domain: "Linking-Retract",
    schemaMap: RETRACT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: RETRACT_METADATA,
  },
  {
    domain: "Linking-Transition",
    schemaMap: TRANSITION_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: TRANSITION_METADATA,
  },
  {
    domain: "Linking-EntryMethod",
    schemaMap: ENTRY_METHOD_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: ENTRY_METHOD_METADATA,
  },
  {
    domain: "Linking-StayDown",
    schemaMap: STAY_DOWN_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: STAY_DOWN_METADATA,
  },
];

// ── DFM Hook Rule Definitions ──────────────────────────────────────────────────

/**
 * Static DFM-critical hook rules for linking domain parameters.
 * These rules enforce manufacturing-safe ranges for geometry, angles,
 * clearances, and gap thresholds used in toolpath linking moves.
 *
 * Rule sources:
 *   - Arc radius: ISO 1101 general tolerancing; tool engagement geometry
 *   - Helix angle: hyperMILL recommended max 15 deg for carbide end mills
 *   - Ramp angle: hyperMILL / Sandvik Coromant ramp milling guidelines (max 10 deg)
 *   - Center cutting: ANSI B94.19 end mill geometry classification
 *   - Gap threshold: hyperMILL stay-down linking documentation
 *   - Fixture clearance: ISO 16090 machine tool safety, minimum 2 mm
 */
const LINKING_HOOK_RULES: LinkingHookRule[] = [
  // ── Lead-In/Out: arc_radius must be >= tool_radius for safe entry ──
  {
    paramName: "arc_radius",
    domain: "Linking-LeadInOut",
    minSafe: 0.5,
    maxSafe: 500,
    severity: "CRITICAL",
    description: "Arc lead-in radius must be >= tool_radius; values below 0.5 mm risk tool snap on entry",
  },
  // ── Lead-In/Out: helix_angle limit for helical lead-in ──
  {
    paramName: "helix_angle",
    domain: "Linking-LeadInOut",
    minSafe: 0.5,
    maxSafe: 15,
    severity: "CRITICAL",
    description: "Helix lead-in angle exceeding 15 degrees causes excessive axial load and risks cutter breakage",
  },
  // ── Entry Method: ramp_angle limit for ramp entry ──
  {
    paramName: "ramp_angle",
    domain: "Linking-EntryMethod",
    minSafe: 0.5,
    maxSafe: 10,
    severity: "CRITICAL",
    description: "Ramp entry angle above 10 degrees exceeds carbide end mill axial load limit — reduce angle or use helical entry",
  },
  // ── Lead-In/Out: center_cutting_required for plunge entry ──
  {
    paramName: "center_cutting_required",
    domain: "Linking-LeadInOut",
    minSafe: 1,
    maxSafe: 1,
    severity: "CRITICAL",
    description: "Plunge lead-in requires center-cutting tool geometry (boolean flag must be true) — non-center-cutting tools will fracture on axial plunge",
  },
  // ── Stay-Down / Retract: gap_threshold for stay-down linking ──
  {
    paramName: "gap_threshold",
    domain: "Linking-StayDown",
    minSafe: 0.5,
    maxSafe: 50,
    severity: "WARNING",
    description: "Stay-down gap threshold outside 0.5-50 mm range — too small causes unnecessary retracts, too large risks gouging on concave features",
  },
  // ── Stay-Down: fixture_clearance for collision avoidance ──
  {
    paramName: "fixture_clearance",
    domain: "Linking-StayDown",
    minSafe: 2,
    maxSafe: 200,
    severity: "CRITICAL",
    description: "Fixture clearance below 2 mm violates ISO 16090 minimum safety margin — collision with clamps, jaws, or vise body",
  },
  // ── Entry Method: helix_angle limit for helical entry ──
  {
    paramName: "helix_angle",
    domain: "Linking-EntryMethod",
    minSafe: 0.5,
    maxSafe: 15,
    severity: "CRITICAL",
    description: "Helical entry angle exceeding 15 degrees causes excessive radial deflection and risks chatter or tool breakage",
  },
  // ── Retract: retract_height too low ──
  {
    paramName: "retract_height",
    domain: "Linking-Retract",
    minSafe: 2,
    maxSafe: 5000,
    severity: "WARNING",
    description: "Retract height below 2 mm may not clear chips, clamps, or stock irregularities — verify against fixture height",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts parameter descriptors from a Zod object schema by inspecting its shape.
 * @param schema - A ZodObject whose shape fields are introspected for type, range, default, and unit
 * @returns Array of parameter descriptors with type, range, default, and unit metadata
 */
function extractParamDescriptors(schema: ZodObject<ZodRawShape>): LinkingParamDescriptor[] {
  const shape = schema.shape;
  const descriptors: LinkingParamDescriptor[] = [];

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
  const minMatch = desc.match(/\bmm\/min\b/);
  if (minMatch) return "mm/min";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class HyperMillLinkingArtifactGeneratorEngine {
  /**
   * Generates all linking artifacts: skill templates, AC Python scripts, and DFM hook rules.
   * @returns LinkingArtifactResult with skills, scripts, hooks, and summary counts
   */
  generate(): LinkingArtifactResult {
    const skills: LinkingSkillTemplate[] = [];
    const acPythonScripts: LinkingACPythonScript[] = [];
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
          const matchingRule = LINKING_HOOK_RULES.find(
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
      hookRules: LINKING_HOOK_RULES,
      summary: {
        totalSchemaTypes: skills.length,
        totalParams,
        totalSkills: skills.length,
        totalScripts: acPythonScripts.length,
        totalHooks: LINKING_HOOK_RULES.length,
      },
    };
  }
}

/** Singleton export */
export const hyperMillLinkingArtifactGeneratorEngine =
  new HyperMillLinkingArtifactGeneratorEngine();
