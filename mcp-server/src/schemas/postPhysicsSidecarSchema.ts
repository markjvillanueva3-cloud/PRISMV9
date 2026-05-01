/**
 * PostPhysicsSidecar — sidecar JSON schema for slim CPS posts.
 *
 * MS0/U-PPGM01: defines the canonical sidecar carried alongside every emitted
 * .cps post. The post stays slim (≤2k LOC); the sidecar carries physics
 * constants (Kienzle/Taylor/EDM/...) sourced from src/physics/constants.ts at
 * generation time. SHA-256 verifies the sidecar matches what the engine emitted.
 *
 * On post load: SHA mismatch fails closed; programmer must regenerate.
 * Hard rule: NEVER inline physics constants in post .cps source — they must
 * come through the sidecar so canonical recalibration in constants.ts
 * propagates without re-exporting every post.
 *
 * References:
 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
 * - Taylor:  Taylor (1907), Modern: ISO 3685:1993
 * - EDM:     Klocke "Fertigungsverfahren Band 3", DiBitonto (1989), Sato (1990)
 */

import { z } from "zod";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_TOOL_MODULUS,
  WHITE_LAYER_THRESHOLDS,
  EDM_PHYSICS,
  CANONICAL_TURNING_SPEEDS,
  CANONICAL_TURNING_FEEDS,
  CANONICAL_MILLING_SPEEDS,
  CANONICAL_MILLING_FEEDS,
  extendedTaylorExponents,
  type ISOGroup,
  type ToolMaterial,
} from "../physics/constants.js";

// ============================================================================
// PRIMITIVE GUARDS — reject NaN/Infinity early at the schema boundary
// ============================================================================

/** Strictly positive finite number — rejects 0, NaN, Infinity, negatives. */
const finitePositive = z
  .number()
  .refine((v) => Number.isFinite(v) && v > 0, {
    message: "must be a finite positive number (no NaN/Infinity/<=0)",
  });

/** Non-negative finite number — rejects NaN, Infinity, negatives; allows 0. */
const finiteNonNegative = z
  .number()
  .refine((v) => Number.isFinite(v) && v >= 0, {
    message: "must be a finite non-negative number (no NaN/Infinity/<0)",
  });

/** Bounded exponent for Taylor n / Kienzle mc — physically meaningful range. */
const physicsExponent = z
  .number()
  .refine((v) => Number.isFinite(v) && v > 0 && v < 1, {
    message: "physics exponent must be in (0, 1)",
  });

// ============================================================================
// ISO GROUP ENUM (mirrors the type from constants.ts)
// ============================================================================

const isoGroupSchema = z.enum(["P", "M", "K", "N", "S", "H"]);
const toolMaterialSchema = z.enum([
  "carbide",
  "cermet",
  "ceramic",
  "cbn",
  "pcd",
  "hss",
  "diamond",
]);

// ============================================================================
// KIENZLE — per ISO group
// ============================================================================

export const kienzleEntrySchema = z.object({
  /** Specific cutting force at h=1mm [N/mm²] */
  kc1_1: finitePositive,
  /** Material exponent (typically 0.20-0.30) */
  mc: physicsExponent,
});
export type KienzleEntry = z.infer<typeof kienzleEntrySchema>;

export const kienzleTableSchema = z.object({
  P: kienzleEntrySchema,
  M: kienzleEntrySchema,
  K: kienzleEntrySchema,
  N: kienzleEntrySchema,
  S: kienzleEntrySchema,
  H: kienzleEntrySchema,
});

// ============================================================================
// TAYLOR — per ISO group
// ============================================================================

export const taylorEntrySchema = z.object({
  /** Speed for 1-min tool life [m/min] */
  C: finitePositive,
  /** Taylor exponent (typically 0.10-0.40) */
  n: physicsExponent,
});
export type TaylorEntry = z.infer<typeof taylorEntrySchema>;

export const taylorTableSchema = z.object({
  P: taylorEntrySchema,
  M: taylorEntrySchema,
  K: taylorEntrySchema,
  N: taylorEntrySchema,
  S: taylorEntrySchema,
  H: taylorEntrySchema,
});

// ============================================================================
// EXTENDED TAYLOR — feed/depth exponents (a, b)
// ============================================================================

export const extendedTaylorEntrySchema = z.object({
  a: physicsExponent,
  b: physicsExponent,
});

export const extendedTaylorTableSchema = z.object({
  P: extendedTaylorEntrySchema,
  M: extendedTaylorEntrySchema,
  K: extendedTaylorEntrySchema,
  N: extendedTaylorEntrySchema,
  S: extendedTaylorEntrySchema,
  H: extendedTaylorEntrySchema,
});

// ============================================================================
// TOOL MODULUS — per tool material [MPa = N/mm²]
// ============================================================================

export const toolModulusTableSchema = z.object({
  carbide: finitePositive,
  cermet: finitePositive,
  ceramic: finitePositive,
  cbn: finitePositive,
  pcd: finitePositive,
  hss: finitePositive,
  diamond: finitePositive,
});

// ============================================================================
// CANONICAL SPEED/FEED RECOMMENDATIONS (per ISO group)
// ============================================================================

export const speedFeedEntrySchema = z.object({
  rough: finitePositive,
  finish: finitePositive,
});

export const speedFeedTableSchema = z.object({
  P: speedFeedEntrySchema,
  M: speedFeedEntrySchema,
  K: speedFeedEntrySchema,
  N: speedFeedEntrySchema,
  S: speedFeedEntrySchema,
  H: speedFeedEntrySchema,
});

// ============================================================================
// WHITE LAYER THRESHOLDS — surface integrity gates
// Reference: Klocke "Manufacturing Processes 2"; Boothroyd (1963).
// Shape: { threshold_C: number, source: string } per material.
// ============================================================================

export const whiteLayerThresholdSchema = z
  .object({
    /** White-layer formation temperature threshold [°C] */
    threshold_C: finitePositive,
    /** Literature reference for the threshold */
    source: z.string().min(1),
  })
  .passthrough(); // accept additional vendor-specific fields

export const whiteLayerThresholdsTableSchema = z.record(
  z.string(),
  whiteLayerThresholdSchema,
);

// ============================================================================
// PER-BLOCK S/F ANNOTATIONS — MS0/U-PPGM07 (schema 1.1.0)
// ----------------------------------------------------------------------------
// Carries one entry per emitted G-code block whose S/F values were derived
// from physics — not just the canonical recommendation tables. This lets the
// closed-loop SFC compare actual (operator-cut) values against what the post
// emitted, attribute drift to a specific physics chain, and refuse to load a
// post whose block-level numerics don't match the sidecar (NoInlinePhysics
// gate, U-PPGM04).
//
// Backward compat: optional. Pre-1.1.0 sidecars omit this field; loaders
// must tolerate `undefined` and treat as "no per-block telemetry".
// ============================================================================

/** Discriminator for which physics path produced the block's S/F values. */
const physicsBasisSchema = z.enum([
  "kienzle",            // Specific cutting force model (Sandvik / ISO 3685)
  "taylor",             // Tool life equation (Taylor 1907 / ISO 3685)
  "sle_chatter",        // Stability lobe envelope (Altintas / Budak)
  "empirical_table",    // CANONICAL_*_SPEEDS / CANONICAL_*_FEEDS lookup
  "operator_override",  // Manual override — emitted, but not physics-derived
]);
export type PhysicsBasis = z.infer<typeof physicsBasisSchema>;

const emittedSpeedFeedSchema = z.object({
  /** Surface speed [m/min]. */
  vc_mpm: finitePositive,
  /** Feed per tooth [mm]. Optional (turning ops use fn instead). */
  fpt_mm: finitePositive.optional(),
  /** Feed per revolution [mm/rev]. Optional (milling uses fpt). */
  fn_mmrev: finitePositive.optional(),
  /** Axial depth of cut [mm]. */
  ap_mm: finitePositive.optional(),
  /** Radial depth / stepover [mm]. */
  ae_mm: finitePositive.optional(),
  /** Spindle speed [rpm]. Required — every block has an emitted S. */
  S_rpm: finitePositive,
  /** Linear feed [mm/min]. Required — every block has an emitted F. */
  F_mmpm: finitePositive,
});
export type EmittedSpeedFeed = z.infer<typeof emittedSpeedFeedSchema>;

export const blockAnnotationSchema = z.object({
  /**
   * Block identifier matching the post output. Convention: "N<seq>" for
   * sequence-numbered posts, or any non-empty string the post emits as a
   * stable label. MUST be unique within a single sidecar's block_annotations.
   */
  block_id: z.string().min(1),
  /** Operation identifier from the caller's CAM job (e.g., "rough_pocket_1"). */
  op_id: z.string().min(1),
  /** ISO material group of the cut workpiece for this block. */
  iso_group: isoGroupSchema,
  /** Tool material substrate for this block. */
  tool_material: toolMaterialSchema,
  /** S/F values actually emitted to the .cps post for this block. */
  emitted: emittedSpeedFeedSchema,
  /** Which physics chain produced the emitted values. */
  physics_basis: physicsBasisSchema,
  /**
   * Stochastic confidence in [0,1] from the physics chain.
   * 1.0 = canonical certainty, 0.0 = pure guess. Operator overrides should
   * report 1.0 (they bypass uncertainty propagation by definition).
   */
  confidence: z
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {
      message: "confidence must be in [0, 1]",
    }),
  /**
   * Multiplicative safety margin applied to the physics-derived value.
   * 1.0 = no derate; 0.85 = 15% conservative. Strictly positive and ≤1.5
   * (a margin >1.5 is a sign of upstream bug, not legitimate safety).
   */
  safety_margin: z
    .number()
    .refine((v) => Number.isFinite(v) && v > 0 && v <= 1.5, {
      message: "safety_margin must be in (0, 1.5]",
    }),
  /**
   * Names of canonical constants pulled from src/physics/constants.ts that
   * drove this block's values (e.g. ["CANONICAL_KIENZLE.P","CANONICAL_TAYLOR.P"]).
   * Empty array iff physics_basis === "operator_override".
   */
  source_constants: z.array(z.string().min(1)),
});
export type BlockAnnotation = z.infer<typeof blockAnnotationSchema>;

/**
 * Validate block_annotations array as a whole — catches duplicate block_ids
 * and the operator_override invariant (must have empty source_constants).
 * Used as a refinement on the master schema below.
 */
function validateBlockAnnotationsArray(
  arr: BlockAnnotation[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (seen.has(a.block_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, "block_id"],
        message: `duplicate block_id "${a.block_id}" — block_ids must be unique within a sidecar`,
      });
    }
    seen.add(a.block_id);
    if (a.physics_basis === "operator_override" && a.source_constants.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, "source_constants"],
        message: "operator_override blocks must have empty source_constants (override bypasses physics)",
      });
    }
    if (a.physics_basis !== "operator_override" && a.source_constants.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, "source_constants"],
        message: `physics_basis "${a.physics_basis}" requires at least one source constant reference`,
      });
    }
  }
}

// ============================================================================
// EDM PHYSICS — verbatim subtree from EDM_PHYSICS (passthrough — verified by SHA)
// ============================================================================

/**
 * EDM_PHYSICS is a deep nested subtree (spark erosion, gap voltage, kerf
 * overcut, skim Ra cascade, Klocke Ra models). We accept it as-is and rely
 * on SHA verification at load time for integrity. Strict typing is enforced
 * upstream in src/physics/constants.ts.
 */
export const edmPhysicsSchema = z.record(z.string(), z.any());

// ============================================================================
// METADATA
// ============================================================================

/** Lowercase hex SHA-256 (64 chars) of the sidecar canonical form. */
const sha256HexSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "sha256 must be 64-char lowercase hex");

export const sidecarMetaSchema = z.object({
  /** Schema version — bump on breaking change. */
  schema_version: z.string().min(1),
  /** Sidecar payload SHA-256 (excludes meta.sha256 itself). */
  sha256: sha256HexSchema,
  /** ISO 8601 UTC timestamp of sidecar generation. */
  generated_at: z.string().datetime(),
  /** Source engine git SHA / package version map. */
  source_engine_versions: z.record(z.string(), z.string()),
  /**
   * Constants source path (e.g. src/physics/constants.ts) — informational
   * only; SHA verification is the actual integrity guarantee.
   */
  constants_source: z.string().min(1),
});

// ============================================================================
// MASTER SIDECAR SCHEMA
// ============================================================================

export const postPhysicsSidecarSchema = z
  .object({
    meta: sidecarMetaSchema,
    kienzle: kienzleTableSchema,
    taylor: taylorTableSchema,
    extended_taylor: extendedTaylorTableSchema,
    tool_modulus_MPa: toolModulusTableSchema,
    white_layer_thresholds: whiteLayerThresholdsTableSchema,
    edm_physics: edmPhysicsSchema,
    canonical_turning_speeds: speedFeedTableSchema,
    canonical_turning_feeds: speedFeedTableSchema,
    canonical_milling_speeds: speedFeedTableSchema,
    canonical_milling_feeds: speedFeedTableSchema,
    /**
     * Per-block S/F annotations. Optional — pre-1.1.0 sidecars omit this
     * field, and loaders treat absence as "no per-block telemetry available".
     * MS0/U-PPGM07 introduces this field at schema 1.1.0 (additive, backward
     * compatible).
     */
    block_annotations: z
      .array(blockAnnotationSchema)
      .superRefine(validateBlockAnnotationsArray)
      .optional(),
  });

export type PostPhysicsSidecar = z.infer<typeof postPhysicsSidecarSchema>;

// ============================================================================
// CURRENT SCHEMA VERSION
// ----------------------------------------------------------------------------
// 1.0.0 — initial sealed sidecar (kienzle/taylor/EDM/canonical S+F tables)
// 1.1.0 — additive: optional block_annotations[] (MS0/U-PPGM07)
// ============================================================================

export const POST_PHYSICS_SIDECAR_SCHEMA_VERSION = "1.1.0";

// ============================================================================
// CANONICAL BUILDER — pulls from src/physics/constants.ts (no inlining)
// ============================================================================

/**
 * Build the canonical sidecar payload from the current src/physics/constants.ts
 * exports. The caller (PhysicsSidecarBuilderEngine, MS0/U-PPGM02) attaches
 * meta + SHA before persisting. This function does NOT compute the SHA; that
 * is a separate concern owned by U-PPGM02.
 *
 * Returns DEEP COPIES (via structuredClone) of every canonical object so the
 * resulting sidecar is decoupled from the live constants module — callers
 * cannot accidentally mutate src/physics/constants.ts via the returned tree,
 * and serializing the sidecar to JSON cannot capture aliased references that
 * downstream consumers might mutate.
 *
 * @returns sidecar payload sans meta — caller must attach meta before parse.
 */
export function buildCanonicalSidecarPayload(): Omit<PostPhysicsSidecar, "meta"> {
  const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
  const extendedTaylor = isoGroups.reduce<Record<ISOGroup, { a: number; b: number }>>(
    (acc, g) => {
      acc[g] = { ...extendedTaylorExponents(g) };
      return acc;
    },
    { P: { a: 0, b: 0 }, M: { a: 0, b: 0 }, K: { a: 0, b: 0 }, N: { a: 0, b: 0 }, S: { a: 0, b: 0 }, H: { a: 0, b: 0 } },
  );

  // structuredClone gives a true deep copy: defensive isolation from constants.ts
  return {
    kienzle: structuredClone(CANONICAL_KIENZLE) as Record<ISOGroup, { kc1_1: number; mc: number }>,
    taylor: structuredClone(CANONICAL_TAYLOR) as Record<ISOGroup, { C: number; n: number }>,
    extended_taylor: extendedTaylor,
    tool_modulus_MPa: structuredClone(CANONICAL_TOOL_MODULUS) as Record<ToolMaterial, number>,
    white_layer_thresholds: structuredClone(WHITE_LAYER_THRESHOLDS) as Record<string, z.infer<typeof whiteLayerThresholdSchema>>,
    edm_physics: structuredClone(EDM_PHYSICS) as Record<string, unknown>,
    canonical_turning_speeds: structuredClone(CANONICAL_TURNING_SPEEDS) as Record<ISOGroup, { rough: number; finish: number }>,
    canonical_turning_feeds: structuredClone(CANONICAL_TURNING_FEEDS) as Record<ISOGroup, { rough: number; finish: number }>,
    canonical_milling_speeds: structuredClone(CANONICAL_MILLING_SPEEDS) as Record<ISOGroup, { rough: number; finish: number }>,
    canonical_milling_feeds: structuredClone(CANONICAL_MILLING_FEEDS) as Record<ISOGroup, { rough: number; finish: number }>,
  };
}

// ============================================================================
// PARSE / VALIDATE HELPERS
// ============================================================================

/**
 * Parse-or-throw with descriptive error path. Use this at sidecar load time
 * in CPS posts (via the loader helper, U-PPGM03).
 */
export function parseSidecarStrict(input: unknown): PostPhysicsSidecar {
  return postPhysicsSidecarSchema.parse(input);
}

/**
 * Safe parse — returns discriminated union for non-throwing flows
 * (e.g. error-tolerant validators in MS9 drift canary).
 */
export function parseSidecarSafe(input: unknown):
  | { ok: true; sidecar: PostPhysicsSidecar }
  | { ok: false; issues: z.ZodIssue[] } {
  const r = postPhysicsSidecarSchema.safeParse(input);
  if (r.success) return { ok: true, sidecar: r.data };
  return { ok: false, issues: r.error.issues };
}

// Re-export for downstream consumer convenience (PostProcessorPipelineEngine, loader).
export type { ISOGroup, ToolMaterial };
