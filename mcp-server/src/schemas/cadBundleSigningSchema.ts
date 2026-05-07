/**
 * cadBundleSigningSchema — U-FS-14 (PHASE-47)
 *
 * Sigstore-cosign-inspired bundle signing: each PHASE-32 bundle gets a
 * deterministic Ed25519-style signature over the canonical digest plus
 * versioning metadata. A tamper-evident hash chain links bundle versions.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadBundleSigningSchema
 */

import { z } from "zod";

// ── Semver ──────────────────────────────────────────────────────────────────

export const SEMVER = /^\d+\.\d+\.\d+(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i;

export const SEMVER_BUMPS = ["major", "minor", "patch"] as const;
export type SemverBump = (typeof SEMVER_BUMPS)[number];

// ── Key material (test-mode, no crypto secrets on disk) ─────────────────────

export const SigningKeySchema = z
  .object({
    keyId: z.string().min(1),
    alg: z.enum(["ed25519", "ed25519-hmac"]),
    /** Public key (hex). For the HMAC test variant this is derived from a shared seed. */
    publicKeyHex: z.string().regex(/^[0-9a-f]+$/),
    createdAt: z.string().min(1),
    /** Optional keyholder identifier (operator, CI, tenant). */
    issuer: z.string().optional(),
  })
  .strict();

export type SigningKey = z.infer<typeof SigningKeySchema>;

// ── Cosign-style attestation ────────────────────────────────────────────────

export const AttestationPredicateSchema = z
  .object({
    predicateType: z.string().min(1),
    builder: z.string().optional(),
    buildType: z.string().optional(),
    /** Arbitrary key/value metadata (e.g. git commit). */
    metadata: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export type AttestationPredicate = z.infer<typeof AttestationPredicateSchema>;

export const BundleSignatureSchema = z
  .object({
    bundleId: z.string().min(1),
    /** SHA-256 over the canonical bundle bytes. */
    bundleDigestSha256: z.string().regex(/^[0-9a-f]{64}$/),
    /** Canonical semver of this bundle (e.g. "3.2.0"). */
    version: z.string().regex(SEMVER),
    /** Hex Ed25519 signature (or HMAC digest in test mode). */
    signatureHex: z.string().regex(/^[0-9a-f]+$/),
    keyId: z.string().min(1),
    alg: z.enum(["ed25519", "ed25519-hmac"]),
    signedAt: z.string().min(1),
    predicate: AttestationPredicateSchema,
    /** Previous signed digest — builds the tamper-evident chain. */
    previousDigest: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable()
      .default(null),
  })
  .strict();

export type BundleSignature = z.infer<typeof BundleSignatureSchema>;

// ── Verification result ─────────────────────────────────────────────────────

export const VERIFY_STATUS = [
  "valid",
  "signature_mismatch",
  "unknown_key",
  "digest_mismatch",
  "chain_break",
  "algorithm_mismatch",
] as const;

export const VerifyResultSchema = z
  .object({
    status: z.enum(VERIFY_STATUS),
    reason: z.string(),
    bundleId: z.string(),
    verifiedAt: z.string(),
  })
  .strict();

export type VerifyResult = z.infer<typeof VerifyResultSchema>;
