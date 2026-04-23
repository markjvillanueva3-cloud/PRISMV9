/**
 * cadCatiaCaaV5Schema — U-CAD-APP-04 (PHASE-48)
 *
 * Dassault CATIA V5/V6 bridge types. Models a subset of CATIA's specification
 * tree reachable through CAA V5 (Component Application Architecture) + EKL
 * (Engineering Knowledge Language) scripting: parameters, features, the
 * Update/Save lifecycle, and EKL relations (rules + checks + reactions).
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadCatiaCaaV5Schema
 */

import { z } from "zod";

// ── Units + parameters ──────────────────────────────────────────────────────

/** CATIA unit groups ("MKS" = SI, "IPS" = inch/lbm/sec). */
export const CATIA_UNIT_SYSTEMS = ["mks", "mmks", "ips", "fps"] as const;
export type CatiaUnitSystem = (typeof CATIA_UNIT_SYSTEMS)[number];

/** CATIA V5 parameter magnitudes: these are the built-in Knowledge types. */
export const CATIA_PARAM_TYPES = [
  "Length",
  "Real",
  "Integer",
  "Angle",
  "Boolean",
  "String",
  "Mass",
  "Force",
  "Time",
] as const;
export type CatiaParamType = (typeof CATIA_PARAM_TYPES)[number];

/** Units carried through the bridge. CATIA names them exactly like this. */
export const CATIA_DIMENSION_UNITS = [
  "mm",
  "cm",
  "m",
  "in",
  "ft",
  "deg",
  "rad",
  "kg",
  "lb",
  "N",
  "lbf",
  "s",
  "none",
] as const;
export type CatiaDimensionUnit = (typeof CATIA_DIMENSION_UNITS)[number];

/**
 * CATIA parameter. Names are case-sensitive and may contain letters, digits,
 * underscore and dot (e.g. `Pad.1\Length`). We restrict to the documented safe
 * subset to keep bridge round-trips deterministic.
 */
export const CatiaParameterSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .regex(/^[A-Za-z][A-Za-z0-9_.\\]*$/, "CATIA param uses letters/digits/_.\\")
      .describe("Parameter name, e.g. 'PartBody\\Pad.1\\Length'"),
    type: z.enum(CATIA_PARAM_TYPES).describe("Knowledge magnitude"),
    value: z
      .union([z.number(), z.string(), z.boolean()])
      .describe("Current value — type must match `type`"),
    unit: z
      .enum(CATIA_DIMENSION_UNITS)
      .default("none")
      .describe("Unit for Length/Angle/Mass/etc."),
    formula: z
      .string()
      .optional()
      .describe("EKL/Knowledge formula driving the value, if any"),
    isPublished: z
      .boolean()
      .default(false)
      .describe("Published parameters are visible to assemblies"),
    description: z.string().optional(),
  })
  .strict();

export type CatiaParameter = z.infer<typeof CatiaParameterSchema>;

// ── Features ────────────────────────────────────────────────────────────────

/** CATIA V5 part / assembly specification kinds (subset). */
export const CATIA_FEATURE_KINDS = [
  "Sketch",
  "Pad",
  "Pocket",
  "Shaft",
  "Groove",
  "Hole",
  "Fillet",
  "Chamfer",
  "Rib",
  "Slot",
  "Shell",
  "Draft",
  "Pattern",
  "Mirror",
  "Plane",
  "Axis",
  "Point",
  "Body",
  "Component",
  "Constraint",
] as const;
export type CatiaFeatureKind = (typeof CATIA_FEATURE_KINDS)[number];

export const CATIA_FEATURE_STATUS = [
  "active",
  "deactivated",
  "failed",
  "hidden",
] as const;
export type CatiaFeatureStatus = (typeof CATIA_FEATURE_STATUS)[number];

export const CatiaFeatureSchema = z
  .object({
    featureId: z.number().int().nonnegative(),
    name: z.string().min(1),
    kind: z.enum(CATIA_FEATURE_KINDS),
    status: z.enum(CATIA_FEATURE_STATUS).default("active"),
    /** Order inside the PartBody specification tree. */
    sequence: z.number().int().nonnegative(),
    paramNames: z.array(z.string()).default([]),
  })
  .strict();

export type CatiaFeature = z.infer<typeof CatiaFeatureSchema>;

// ── EKL (Engineering Knowledge Language) relations ──────────────────────────

export const CATIA_EKL_RELATION_KINDS = [
  "rule",
  "check",
  "reaction",
  "set_of_equations",
  "law",
] as const;
export type CatiaEklRelationKind = (typeof CATIA_EKL_RELATION_KINDS)[number];

/**
 * CATIA relations live under `Relations` in the spec tree. Checks return a
 * boolean verdict; rules fire side-effects; reactions respond to events.
 */
export const CatiaEklRelationSchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(CATIA_EKL_RELATION_KINDS),
    script: z.string().min(1).describe("EKL script body"),
    isActive: z.boolean().default(true),
    /** Most recent output from this relation (verdict for check, null for rule). */
    lastVerdict: z.boolean().nullable().default(null),
    lastMessage: z.string().optional(),
  })
  .strict();

export type CatiaEklRelation = z.infer<typeof CatiaEklRelationSchema>;

// ── Model ───────────────────────────────────────────────────────────────────

export const CATIA_MODEL_KINDS = [
  "CATPart",
  "CATProduct",
  "CATDrawing",
  "CATAnalysis",
] as const;
export type CatiaModelKind = (typeof CATIA_MODEL_KINDS)[number];

export const CATIA_PLM_STATES = [
  "in_work",
  "frozen",
  "released",
  "obsolete",
] as const;
export type CatiaPlmState = (typeof CATIA_PLM_STATES)[number];

export const CatiaModelSchema = z
  .object({
    modelName: z
      .string()
      .min(1)
      .describe("CATIA file name, e.g. 'BRACKET.CATPart'"),
    kind: z.enum(CATIA_MODEL_KINDS),
    units: z.enum(CATIA_UNIT_SYSTEMS),
    parameters: z.array(CatiaParameterSchema).default([]),
    features: z.array(CatiaFeatureSchema).default([]),
    relations: z.array(CatiaEklRelationSchema).default([]),
    /** CATIA update count — increments every time Update is issued. */
    updateCount: z.number().int().nonnegative().default(0),
    plmState: z.enum(CATIA_PLM_STATES).default("in_work"),
    revision: z.string().default("A"),
    lastModified: z.string().min(1),
  })
  .strict();

export type CatiaModel = z.infer<typeof CatiaModelSchema>;

// ── Transport protocol ─────────────────────────────────────────────────────

export const CATIA_COMMANDS = [
  "read_model",
  "list_models",
  "set_parameter",
  "update_model",
  "deactivate_feature",
  "activate_feature",
  "run_ekl_relation",
  "set_plm_state",
  "save",
] as const;
export type CatiaCommand = (typeof CATIA_COMMANDS)[number];

export const CatiaResponseSchema = z
  .object({
    ok: z.boolean(),
    error: z.string().optional(),
    result: z.unknown().optional(),
  })
  .strict();

export type CatiaResponse = z.infer<typeof CatiaResponseSchema>;
