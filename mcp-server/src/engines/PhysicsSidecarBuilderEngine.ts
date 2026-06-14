/**
 * PhysicsSidecarBuilderEngine — MS0/U-PPGM02.
 *
 * Wraps PostPhysicsSidecarSchema (U-PPGM01) with deterministic canonicalisation,
 * SHA-256 sealing, atomic file write, and round-trip verification. Every emitted
 * .cps post is paired with a sidecar.json built and sealed by this engine; the
 * post loader (U-PPGM03) refuses to emit if the sidecar SHA mismatches.
 *
 * Determinism contract:
 *   canonicalize(payload) is byte-identical for equal payloads, regardless of
 *   key ordering at construction time. This is the single hardest invariant —
 *   any non-determinism in canonicalisation manifests as a phantom drift alarm
 *   in MS9 drift canary.
 *
 * References:
 * - SHA-256 — FIPS 180-4
 * - JCS canonical JSON — RFC 8785 (we implement a strict subset: sorted-key recursion)
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

import {
  postPhysicsSidecarSchema,
  parseSidecarSafe,
  buildCanonicalSidecarPayload,
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  type PostPhysicsSidecar,
  type BlockAnnotation,
  type WEDMBlockAnnotation,
} from "../schemas/postPhysicsSidecarSchema.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface BuildSidecarOptions {
  /** Map of source engine names → version/git-SHA strings. Required, may be empty. */
  source_engine_versions: Record<string, string>;
  /** Path to the constants source (default: "src/physics/constants.ts"). */
  constants_source?: string;
  /** Override generated_at for deterministic test snapshots. */
  generated_at?: string;
  /**
   * Optional per-block S/F annotations (MS0/U-PPGM08, schema 1.1.0).
   * When provided, every entry must satisfy blockAnnotationSchema, block_ids
   * must be unique, and operator_override blocks must have empty
   * source_constants. The array is included in the SHA seal so any tamper to
   * a block annotation invalidates verification.
   */
  block_annotations?: BlockAnnotation[];
  /**
   * Optional per-block WEDM annotations (PPG-WIRE-MS6/U-PPGM16, schema 1.2.0).
   * Mutually exclusive with `block_annotations` — milling/turning posts emit
   * `block_annotations`, Wire EDM posts emit `wedm_block_annotations`. Same
   * SHA-seal coverage so any tamper invalidates verification.
   */
  wedm_block_annotations?: WEDMBlockAnnotation[];
}

export interface VerifyResult {
  ok: boolean;
  recomputed_sha: string;
  expected_sha: string;
  reason?: "sha_mismatch" | "schema_invalid" | "ok";
}

// ============================================================================
// ENGINE
// ============================================================================

export class PhysicsSidecarBuilderEngine {
  /**
   * Canonicalize an arbitrary JSON value into a byte-deterministic string.
   * Object keys are recursively sorted. Numbers serialise via Number.prototype.toString
   * (matches JSON.stringify); arrays preserve order. Throws on circular refs and
   * on non-finite numbers (NaN/Infinity) — those should have been rejected by
   * Zod schema upstream.
   */
  static canonicalize(value: unknown): string {
    return PhysicsSidecarBuilderEngine._stringify(value);
  }

  private static _stringify(value: unknown): string {
    if (value === null) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(`PhysicsSidecarBuilder.canonicalize: non-finite number ${String(value)} cannot be canonicalised`);
      }
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return "[" + value.map((v) => PhysicsSidecarBuilderEngine._stringify(v)).join(",") + "]";
    }
    if (typeof value === "object") {
      // Omit undefined-valued keys before canonicalisation — exactly JSON.stringify semantics
      // (`{a:undefined}` serialises as `{}`). A schema-valid payload that carries an absent optional
      // field as an explicit `undefined` must NOT crash the sidecar; the round-trip schema gate in
      // buildAndSeal still rejects a genuinely-malformed payload. No backward-compat risk: any prior
      // payload with an undefined value could never have been sealed (it threw here), so none exist.
      const rec = value as Record<string, unknown>;
      const keys = Object.keys(rec).filter((k) => rec[k] !== undefined).sort();
      const parts = keys.map((k) => {
        return JSON.stringify(k) + ":" + PhysicsSidecarBuilderEngine._stringify(rec[k]);
      });
      return "{" + parts.join(",") + "}";
    }
    // A bare `undefined` (top-level or array element) canonicalises as null — JSON-compatible, total.
    if (value === undefined) return "null";
    throw new Error(`PhysicsSidecarBuilder.canonicalize: unsupported type ${typeof value}`);
  }

  /** SHA-256 of a UTF-8 encoded string, returned as 64-char lowercase hex. */
  static computeSha256(text: string): string {
    return createHash("sha256").update(text, "utf8").digest("hex");
  }

  /**
   * Build + seal a canonical sidecar from current src/physics/constants.ts state
   * plus caller-supplied metadata. The returned object passes schema validation.
   *
   * SHA-256 is computed over the canonicalisation of the payload-without-meta
   * concatenated with the canonicalisation of meta-without-sha256 — this lets
   * a verifier recompute the SHA without circular dependence on its own value.
   */
  static buildAndSeal(opts: BuildSidecarOptions): PostPhysicsSidecar {
    if (!opts || typeof opts !== "object") {
      throw new Error("PhysicsSidecarBuilder.buildAndSeal: opts is required");
    }
    if (!opts.source_engine_versions || typeof opts.source_engine_versions !== "object") {
      throw new Error("PhysicsSidecarBuilder.buildAndSeal: source_engine_versions must be an object");
    }

    const payload = buildCanonicalSidecarPayload();
    const generated_at = opts.generated_at ?? new Date().toISOString();
    const constants_source = opts.constants_source ?? "src/physics/constants.ts";

    const metaWithoutSha = {
      schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
      generated_at,
      source_engine_versions: { ...opts.source_engine_versions },
      constants_source,
    };
    if (opts.block_annotations !== undefined && opts.wedm_block_annotations !== undefined) {
      throw new Error(
        "PhysicsSidecarBuilder.buildAndSeal: block_annotations and wedm_block_annotations are mutually exclusive — milling/turning vs Wire EDM emit shapes differ",
      );
    }
    // Attach optional per-block annotations BEFORE SHA computation so any
    // tamper to a block entry invalidates verification (U-PPGM08, U-PPGM16).
    let payloadWithBlocks: Omit<PostPhysicsSidecar, "meta"> = payload;
    if (opts.block_annotations !== undefined) {
      payloadWithBlocks = { ...payload, block_annotations: structuredClone(opts.block_annotations) };
    } else if (opts.wedm_block_annotations !== undefined) {
      payloadWithBlocks = {
        ...payload,
        wedm_block_annotations: structuredClone(opts.wedm_block_annotations),
      };
    }
    const sealable = { ...payloadWithBlocks, _meta_without_sha: metaWithoutSha };
    const sha256 = PhysicsSidecarBuilderEngine.computeSha256(
      PhysicsSidecarBuilderEngine.canonicalize(sealable),
    );

    const sealed: PostPhysicsSidecar = {
      ...payloadWithBlocks,
      meta: { ...metaWithoutSha, sha256 },
    };

    // Round-trip through schema as the final integrity gate
    const r = parseSidecarSafe(sealed);
    if (!r.ok) {
      throw new Error(
        `PhysicsSidecarBuilder.buildAndSeal: produced sidecar fails schema (${r.issues.length} issues): ${JSON.stringify(r.issues.slice(0, 3))}`,
      );
    }
    return r.sidecar;
  }

  /**
   * Verify a sidecar's SHA-256 by recomputing it from the payload + meta-without-sha.
   * Returns a discriminated result; never throws on integrity failure.
   */
  static verify(sidecar: unknown): VerifyResult {
    const r = parseSidecarSafe(sidecar);
    if (!r.ok) {
      return { ok: false, recomputed_sha: "", expected_sha: "", reason: "schema_invalid" };
    }
    const { meta, ...payload } = r.sidecar;
    const { sha256: expected, ...metaWithoutSha } = meta;
    const sealable = { ...payload, _meta_without_sha: metaWithoutSha };
    const recomputed = PhysicsSidecarBuilderEngine.computeSha256(
      PhysicsSidecarBuilderEngine.canonicalize(sealable),
    );
    if (recomputed === expected) {
      return { ok: true, recomputed_sha: recomputed, expected_sha: expected, reason: "ok" };
    }
    return { ok: false, recomputed_sha: recomputed, expected_sha: expected, reason: "sha_mismatch" };
  }

  /**
   * Atomically write a sealed sidecar to disk. Writes to a temp file then
   * renames; concurrent emits to the same target are safe (last writer wins;
   * neither sees a half-written file).
   */
  static async writeToFile(sidecar: PostPhysicsSidecar, filepath: string): Promise<void> {
    const r = parseSidecarSafe(sidecar);
    if (!r.ok) {
      throw new Error(`PhysicsSidecarBuilder.writeToFile: refused — sidecar fails schema (${r.issues.length} issues)`);
    }
    await mkdir(dirname(filepath), { recursive: true });
    const tmp = `${filepath}.tmp.${randomBytes(8).toString("hex")}`;
    const text = JSON.stringify(sidecar, null, 2) + "\n";
    await writeFile(tmp, text, "utf8");
    await rename(tmp, filepath);
  }

  /**
   * Load a sidecar JSON from disk and verify its SHA. Returns the parsed
   * sidecar on success; throws on parse failure or SHA mismatch.
   */
  static async loadAndVerify(filepath: string): Promise<PostPhysicsSidecar> {
    const text = await readFile(filepath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`PhysicsSidecarBuilder.loadAndVerify: ${filepath} is not valid JSON: ${(err as Error).message}`);
    }
    const v = PhysicsSidecarBuilderEngine.verify(parsed);
    if (!v.ok) {
      throw new Error(
        `PhysicsSidecarBuilder.loadAndVerify: ${filepath} failed (${v.reason}); expected=${v.expected_sha} got=${v.recomputed_sha}`,
      );
    }
    return postPhysicsSidecarSchema.parse(parsed);
  }
}

// Singleton export for dispatcher lazy-import pattern (`getEngine("physicsSidecarBuilder")`).
export const physicsSidecarBuilderEngine = PhysicsSidecarBuilderEngine;
