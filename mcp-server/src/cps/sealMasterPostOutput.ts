/**
 * sealMasterPostOutput — MS0/U-PPGM15 dispatcher-side helper.
 *
 * Bridges a master-post engine's generateProgram() output to the sealed
 * sidecar + (optional) gate verdict expected by physics-driven callers.
 * Eliminates the boilerplate that would otherwise repeat at every
 * camDispatcher case calling a master post engine.
 *
 * Contract:
 *   1. Caller passes the engine's output (must contain `gcode: string[]`
 *      and `block_annotations: BlockAnnotation[]`) + a tier override.
 *   2. We seal a v1.1.0 sidecar with the engine's block_annotations and
 *      a fixed source_engine_versions map (caller-supplied).
 *   3. If `verify_tier` is provided, run verifyBlockAnnotations and
 *      attach the result; otherwise omit the verify field.
 *   4. Return the engine output extended with { sidecar, verify? }.
 *
 * The helper is opt-in: callers that don't pass an engine output with
 * block_annotations still get a clean pass-through (sidecar sealed
 * against an empty block_annotations array — semantically v1.1.0 with
 * "no telemetry"). This keeps backward compat for legacy callers and
 * avoids forcing every dispatcher case to know about the sidecar.
 */

import type {
  BlockAnnotation,
  PostPhysicsSidecar,
  WEDMBlockAnnotation,
} from "../schemas/postPhysicsSidecarSchema.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import {
  verifyBlockAnnotations,
  type Tier,
  type VerifyResult,
} from "./verifyBlockAnnotations.js";
import {
  verifyWEDMBlockAnnotations,
  type WEDMTier,
  type WEDMVerifyResult,
} from "./verifyWEDMBlockAnnotations.js";

export interface SealMasterPostOptions {
  /** Map of source engine name -> version/git-SHA. Required, may be empty. */
  source_engine_versions: Record<string, string>;
  /** Override generated_at for deterministic test snapshots. */
  generated_at?: string;
  /**
   * If provided, run verifyBlockAnnotations at this tier and attach the
   * result. Omit to skip the gate (sidecar is still sealed).
   */
  verify_tier?: Tier;
  /** Constants source path; default "src/physics/constants.ts". */
  constants_source?: string;
}

export interface SealedMasterPostResult<T extends { gcode: string[]; block_annotations: BlockAnnotation[] }> {
  /** Original engine output passed through verbatim. */
  engine_output: T;
  /** Sealed sidecar (schema 1.1.0) carrying the engine's block_annotations. */
  sidecar: PostPhysicsSidecar;
  /**
   * Gate verdict when verify_tier was provided; undefined when the
   * caller skipped verification.
   */
  verify?: VerifyResult;
}

/**
 * Seal a sidecar from a master-post engine output and (optionally) run
 * the per-block S/F gate. Pure function — no I/O, no global state.
 *
 * Throws on:
 *   - non-object / null engineOutput
 *   - missing/non-array gcode field
 *   - missing/non-array block_annotations field (engines must populate
 *     it; if no annotations apply, pass [])
 *   - downstream throws from buildAndSeal (schema validation) or
 *     verifyBlockAnnotations (shape violation in sidecar)
 */
export function sealMasterPostOutput<
  T extends { gcode: string[]; block_annotations: BlockAnnotation[] },
>(engineOutput: T, opts: SealMasterPostOptions): SealedMasterPostResult<T> {
  if (!engineOutput || typeof engineOutput !== "object") {
    throw new Error("sealMasterPostOutput: engineOutput must be a non-null object");
  }
  if (!Array.isArray(engineOutput.gcode)) {
    throw new Error("sealMasterPostOutput: engineOutput.gcode must be an array of strings");
  }
  if (!Array.isArray(engineOutput.block_annotations)) {
    throw new Error(
      "sealMasterPostOutput: engineOutput.block_annotations must be an array (pass [] for engines that do not annotate per-block)",
    );
  }
  if (!opts || typeof opts !== "object") {
    throw new Error("sealMasterPostOutput: opts is required");
  }
  if (!opts.source_engine_versions || typeof opts.source_engine_versions !== "object") {
    throw new Error("sealMasterPostOutput: opts.source_engine_versions must be an object");
  }

  const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
    source_engine_versions: opts.source_engine_versions,
    constants_source: opts.constants_source,
    generated_at: opts.generated_at,
    block_annotations: engineOutput.block_annotations,
  });

  const out: SealedMasterPostResult<T> = {
    engine_output: engineOutput,
    sidecar: sealed,
  };

  if (opts.verify_tier) {
    out.verify = verifyBlockAnnotations(
      engineOutput.gcode.join("\n"),
      sealed as unknown as Record<string, unknown>,
      { tier: opts.verify_tier },
    );
  }

  return out;
}

// ============================================================================
// WEDM VARIANT — PPG-WIRE-MS6/U-PPGM17a
// ============================================================================

/**
 * Options envelope for sealWEDMMasterPostOutput. Same shape as the milling
 * variant's SealMasterPostOptions but the `verify_tier` accepts the WEDM
 * tier alias (currently structurally identical — sim/proven_out/production/
 * shop_floor — but kept separate so the two domains can diverge without a
 * cross-cut refactor).
 */
export interface SealWEDMMasterPostOptions {
  source_engine_versions: Record<string, string>;
  generated_at?: string;
  /** When set, run verifyWEDMBlockAnnotations and attach the result. */
  verify_tier?: WEDMTier;
  constants_source?: string;
}

/**
 * Result envelope returned by sealWEDMMasterPostOutput. Parallel to
 * SealedMasterPostResult but carries WEDM-shaped block annotations and
 * (when opts.verify_tier is provided) a WEDMVerifyResult.
 */
export interface SealedWEDMMasterPostResult<
  T extends { gcode: string[]; block_annotations: WEDMBlockAnnotation[] },
> {
  /** Original engine output passed through verbatim. */
  engine_output: T;
  /**
   * Sealed sidecar (schema 1.2.0) carrying the engine's block_annotations
   * stored under the schema's `wedm_block_annotations` field — sealing
   * coverage matches milling/turning so any tamper invalidates the SHA.
   */
  sidecar: PostPhysicsSidecar;
  /**
   * Gate verdict when verify_tier was provided. Reasons over the
   * sidecar's wedm_block_annotations[] against PASS_DEFAULTS /
   * E_PACK_TABLE source-of-truth (PPG-WIRE-MS6/U-PPGM17b).
   */
  verify?: WEDMVerifyResult;
}

/**
 * Seal a sidecar from a Wire EDM master-post engine output. Pure function —
 * no I/O, no global state. The Mitsubishi engine emits its annotations on a
 * field still called `block_annotations` (typed as WEDMBlockAnnotation[]);
 * this helper routes them into the schema's `wedm_block_annotations` slot.
 *
 * Throws on:
 *   - non-object / null engineOutput
 *   - missing/non-array gcode field
 *   - missing/non-array block_annotations field (WEDM engines must populate
 *     it; if no annotations apply, pass [])
 *   - downstream throws from buildAndSeal (schema validation incl.
 *     duplicate block_id, operator_override empty-source-constants
 *     invariant, off_time/on_time heat-soak invariant)
 */
export function sealWEDMMasterPostOutput<
  T extends { gcode: string[]; block_annotations: WEDMBlockAnnotation[] },
>(engineOutput: T, opts: SealWEDMMasterPostOptions): SealedWEDMMasterPostResult<T> {
  if (!engineOutput || typeof engineOutput !== "object") {
    throw new Error("sealWEDMMasterPostOutput: engineOutput must be a non-null object");
  }
  if (!Array.isArray(engineOutput.gcode)) {
    throw new Error("sealWEDMMasterPostOutput: engineOutput.gcode must be an array of strings");
  }
  if (!Array.isArray(engineOutput.block_annotations)) {
    throw new Error(
      "sealWEDMMasterPostOutput: engineOutput.block_annotations must be an array (pass [] for engines that do not annotate per-block)",
    );
  }
  if (!opts || typeof opts !== "object") {
    throw new Error("sealWEDMMasterPostOutput: opts is required");
  }
  if (!opts.source_engine_versions || typeof opts.source_engine_versions !== "object") {
    throw new Error("sealWEDMMasterPostOutput: opts.source_engine_versions must be an object");
  }

  const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
    source_engine_versions: opts.source_engine_versions,
    constants_source: opts.constants_source,
    generated_at: opts.generated_at,
    wedm_block_annotations: engineOutput.block_annotations,
  });

  const out: SealedWEDMMasterPostResult<T> = {
    engine_output: engineOutput,
    sidecar: sealed,
  };

  if (opts.verify_tier) {
    out.verify = verifyWEDMBlockAnnotations(
      sealed as unknown as Record<string, unknown>,
      { tier: opts.verify_tier },
    );
  }

  return out;
}
