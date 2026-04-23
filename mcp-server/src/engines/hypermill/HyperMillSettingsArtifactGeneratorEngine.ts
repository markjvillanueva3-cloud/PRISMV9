/**
 * HyperMillSettingsArtifactGeneratorEngine — Settings Domain Artifact Batch Generator
 *
 * U-HKC39: Generates skill templates, AC Python setter scripts, and hook
 * validation rules from 9 hyperMILL settings parameter schema files covering
 * ~265 parameters across Calculation, Machine, NC Generation, Tool DB,
 * Display, Measurement, Virtual Machining, NightShift, and UI Feature domains.
 *
 * Hook rules enforce settings-critical constraints covering measurement system
 * consistency, calculation tolerance ranges, and machine settings validation.
 *
 * @domain Settings-ArtifactGeneration
 * @milestone HM-KC-MS7/U-HKC39
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

import {
  CALCULATION_SETTINGS_SCHEMA_MAP,
  CALCULATION_SETTINGS_METADATA,
} from "../../schemas/hypermill/settings/calculationSchemas.js";

import {
  MACHINE_SETTINGS_SCHEMA_MAP,
  MACHINE_SETTINGS_METADATA,
} from "../../schemas/hypermill/settings/machineSettingsSchemas.js";

import {
  NC_GEN_SETTINGS_SCHEMA_MAP,
  NC_GEN_SETTINGS_METADATA,
} from "../../schemas/hypermill/settings/ncGenSchemas.js";

import {
  TOOL_DB_SCHEMA_MAP,
  TOOL_DB_METADATA,
} from "../../schemas/hypermill/settings/toolDbSchemas.js";

import {
  DISPLAY_SCHEMA_MAP,
  DISPLAY_METADATA,
} from "../../schemas/hypermill/settings/displaySchemas.js";

import {
  MEASUREMENT_SCHEMA_MAP,
  MEASUREMENT_METADATA,
} from "../../schemas/hypermill/settings/measurementSchemas.js";

import {
  VIRTUAL_MACHINING_SCHEMA_MAP,
  VIRTUAL_MACHINING_METADATA,
} from "../../schemas/hypermill/settings/virtualMachiningSchemas.js";

import {
  NIGHTSHIFT_SCHEMA_MAP,
  NIGHTSHIFT_METADATA,
} from "../../schemas/hypermill/settings/nightShiftSchemas.js";

import {
  UI_FEATURE_SCHEMA_MAP,
  UI_FEATURE_METADATA,
} from "../../schemas/hypermill/settings/uiFeatureSchemas.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Parameter descriptor extracted from a Zod schema field */
export interface SettingsParamDescriptor {
  name: string;
  type: string;
  range: string;
  defaultValue: string;
  unit: string;
}

/** Skill template for one settings schema type */
export interface SettingsSkillTemplate {
  name: string;
  domain: string;
  description: string;
  parameterTable: SettingsParamDescriptor[];
  acPythonSetter: string;
}

/** AC Python script record for one settings schema type */
export interface SettingsACPythonScript {
  name: string;
  domain: string;
  script: string;
}

/** Hook validation rule with severity classification */
export interface HookRule {
  name: string;
  domain: string;
  severity: "CRITICAL" | "BLOCKING" | "WARNING";
  description: string;
}

/** Complete artifact generation result */
export interface SettingsArtifactResult {
  skills: SettingsSkillTemplate[];
  acPythonScripts: SettingsACPythonScript[];
  hookRules: HookRule[];
  summary: {
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
  }>;
}

const DOMAIN_SOURCES: DomainSource[] = [
  {
    domain: "Calculation",
    schemaMap: CALCULATION_SETTINGS_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: CALCULATION_SETTINGS_METADATA,
  },
  {
    domain: "Machine",
    schemaMap: MACHINE_SETTINGS_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: MACHINE_SETTINGS_METADATA,
  },
  {
    domain: "NC-Generation",
    schemaMap: NC_GEN_SETTINGS_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: NC_GEN_SETTINGS_METADATA,
  },
  {
    domain: "Tool-DB",
    schemaMap: TOOL_DB_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: TOOL_DB_METADATA,
  },
  {
    domain: "Display",
    schemaMap: DISPLAY_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: DISPLAY_METADATA,
  },
  {
    domain: "Measurement",
    schemaMap: MEASUREMENT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: MEASUREMENT_METADATA,
  },
  {
    domain: "Virtual-Machining",
    schemaMap: VIRTUAL_MACHINING_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: VIRTUAL_MACHINING_METADATA,
  },
  {
    domain: "NightShift",
    schemaMap: NIGHTSHIFT_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: NIGHTSHIFT_METADATA,
  },
  {
    domain: "UI-Features",
    schemaMap: UI_FEATURE_SCHEMA_MAP as unknown as Record<string, ZodObject<ZodRawShape>>,
    metadata: UI_FEATURE_METADATA,
  },
];

// ── Hook Rule Definitions ─────────────────────────────────────────────────────

/**
 * Static hook rules for Settings domain validation.
 *
 * 3 rules across 3 concerns:
 *  - measurementSystemConsistencyHook (Measurement, BLOCKING)
 *  - toleranceRangeHook (Calculation, WARNING)
 *  - machineSettingsValidationHook (Machine, WARNING)
 */
const SETTINGS_HOOK_RULES: HookRule[] = [
  {
    name: "measurementSystemConsistencyHook",
    domain: "Measurement",
    severity: "BLOCKING",
    description:
      "Blocks mixed metric/imperial parameter values — all settings parameters must use a consistent unit system. " +
      "Mixed units cause silent dimensional errors in NC output and part geometry.",
  },
  {
    name: "toleranceRangeHook",
    domain: "Calculation",
    severity: "WARNING",
    description:
      "Warns when calculation tolerance is unrealistic (<0.001 mm or >0.1 mm) — " +
      "values below 0.001 mm cause excessive calculation time with no accuracy benefit; " +
      "values above 0.1 mm produce visibly faceted toolpaths that exceed typical part tolerances.",
  },
  {
    name: "machineSettingsValidationHook",
    domain: "Machine",
    severity: "WARNING",
    description:
      "Validates machine settings against MachineRegistry limits — " +
      "axis travel limits, spindle speed range, and torque values are cross-checked against " +
      "the registered machine profile to detect configuration drift or data entry errors.",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts parameter descriptors from a Zod object schema by inspecting its shape.
 * @param schema - Zod object schema to extract parameters from
 * @returns Array of parameter descriptors with type, range, default, and unit info
 */
function extractParamDescriptors(schema: ZodObject<ZodRawShape>): SettingsParamDescriptor[] {
  const shape = schema.shape;
  const descriptors: SettingsParamDescriptor[] = [];

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
  if (/\bmm\b/.test(desc)) return "mm";
  if (/\bdegrees?\b/i.test(desc)) return "degrees";
  if (/\bRPM\b/i.test(desc)) return "RPM";
  if (/\bseconds?\b/.test(desc)) return "seconds";
  if (/\bminutes?\b/.test(desc)) return "minutes";
  if (/\b%\b/.test(desc)) return "%";
  if (/\bbar\b/.test(desc)) return "bar";
  return "";
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class HyperMillSettingsArtifactGeneratorEngine {
  /**
   * Generates all Settings domain artifacts: skill templates, AC Python scripts,
   * and hook validation rules across 9 schema domains.
   * @returns SettingsArtifactResult containing skills, scripts, hooks, and summary
   */
  generate(): SettingsArtifactResult {
    const skills: SettingsSkillTemplate[] = [];
    const acPythonScripts: SettingsACPythonScript[] = [];
    let totalParams = 0;

    for (const source of DOMAIN_SOURCES) {
      for (const [typeName, schema] of Object.entries(source.schemaMap)) {
        const meta = source.metadata[typeName];
        if (!meta) continue;

        // Extract param descriptors from the live Zod schema
        const parameterTable = extractParamDescriptors(schema);
        totalParams += meta.paramCount;

        // Skill template
        skills.push({
          name: typeName,
          domain: source.domain,
          description: meta.description,
          parameterTable,
          acPythonSetter: meta.acPythonSetter,
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
      hookRules: SETTINGS_HOOK_RULES,
      summary: {
        totalParams,
        totalSkills: skills.length,
        totalScripts: acPythonScripts.length,
        totalHooks: SETTINGS_HOOK_RULES.length,
      },
    };
  }
}

/** Singleton export */
export const hyperMillSettingsArtifactGeneratorEngine =
  new HyperMillSettingsArtifactGeneratorEngine();
