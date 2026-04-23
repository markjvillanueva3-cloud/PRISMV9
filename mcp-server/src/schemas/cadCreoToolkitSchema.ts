/**
 * cadCreoToolkitSchema — U-CAD-APP-01 (PHASE-48)
 *
 * PTC Creo (Pro/Engineer) Toolkit + J-Link bridge types. Represents a subset
 * of Creo's parametric model tree: parameters (with units), features, and
 * regenerate/save lifecycle events.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadCreoToolkitSchema
 */

import { z } from "zod";

// ── Units + parameters ──────────────────────────────────────────────────────

export const CREO_UNIT_SYSTEMS = ["mmns", "mks", "cgs", "ips", "fps"] as const;
export type CreoUnitSystem = (typeof CREO_UNIT_SYSTEMS)[number];

export const PARAM_TYPES = ["real", "integer", "string", "boolean", "note"] as const;
export type CreoParamType = (typeof PARAM_TYPES)[number];

/** Common Creo parameter units. Not exhaustive but covers the P2P envelope. */
export const CREO_DIMENSION_UNITS = [
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
export type CreoDimensionUnit = (typeof CREO_DIMENSION_UNITS)[number];

export const CreoParameterSchema = z
  .object({
    name: z.string().min(1).regex(/^[A-Z0-9_]+$/, "Creo params are UPPER_SNAKE"),
    type: z.enum(PARAM_TYPES),
    value: z.union([z.number(), z.string(), z.boolean()]),
    unit: z.enum(CREO_DIMENSION_UNITS).default("none"),
    designation: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

export type CreoParameter = z.infer<typeof CreoParameterSchema>;

// ── Features ────────────────────────────────────────────────────────────────

export const CREO_FEATURE_KINDS = [
  "sketch",
  "extrude",
  "revolve",
  "sweep",
  "blend",
  "hole",
  "round",
  "chamfer",
  "shell",
  "pattern",
  "mirror",
  "rib",
  "draft",
  "datum_plane",
  "datum_axis",
  "datum_point",
  "cosmetic_thread",
  "merge",
  "assembly_component",
] as const;
export type CreoFeatureKind = (typeof CREO_FEATURE_KINDS)[number];

export const FEATURE_STATUS = [
  "active",
  "suppressed",
  "failed",
  "hidden",
] as const;

export const CreoFeatureSchema = z
  .object({
    featureId: z.number().int().nonnegative(),
    name: z.string().min(1),
    kind: z.enum(CREO_FEATURE_KINDS),
    status: z.enum(FEATURE_STATUS).default("active"),
    /** Order in the regeneration tree. */
    sequence: z.number().int().nonnegative(),
    /** Child parameter names (resolved via model-level parameter registry). */
    paramNames: z.array(z.string()).default([]),
  })
  .strict();

export type CreoFeature = z.infer<typeof CreoFeatureSchema>;

// ── Model ───────────────────────────────────────────────────────────────────

export const CREO_MODEL_KINDS = ["part", "assembly", "drawing"] as const;
export type CreoModelKind = (typeof CREO_MODEL_KINDS)[number];

export const CreoModelSchema = z
  .object({
    modelName: z.string().min(1),
    kind: z.enum(CREO_MODEL_KINDS),
    units: z.enum(CREO_UNIT_SYSTEMS),
    parameters: z.array(CreoParameterSchema).default([]),
    features: z.array(CreoFeatureSchema).default([]),
    /** Creo internal revision counter incremented on every regen. */
    regenCount: z.number().int().nonnegative().default(0),
    lastModified: z.string().min(1),
  })
  .strict();

export type CreoModel = z.infer<typeof CreoModelSchema>;

// ── Transport protocol ─────────────────────────────────────────────────────

export const CREO_COMMANDS = [
  "read_model",
  "set_parameter",
  "regenerate",
  "suppress_feature",
  "resume_feature",
  "save",
  "list_models",
] as const;
export type CreoCommand = (typeof CREO_COMMANDS)[number];

export const CreoResponseSchema = z
  .object({
    ok: z.boolean(),
    error: z.string().optional(),
    result: z.unknown().optional(),
  })
  .strict();

export type CreoResponse = z.infer<typeof CreoResponseSchema>;
