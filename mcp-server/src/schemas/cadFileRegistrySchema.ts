/**
 * cadFileRegistrySchema — Zod schemas for CADFileRegistryEngine (U-CADC02)
 *
 * Persistent content-addressable registry that complements the path-keyed
 * master index produced by CADFileIndexerEngine (U-CINF01). Where master-index
 * hashes the *path*, CAD_FILE_REGISTRY.json hashes the *content* — enabling:
 *   - deduplication of identical files at different paths (e.g. revision copies)
 *   - integrity verification (content hash matches on re-scan)
 *   - cross-customer IP leak detection (same SHA-256 across tenants)
 *
 * schemaVersion: 1 — bump on breaking field change.
 *
 * @module schemas/cadFileRegistrySchema
 */

import { z } from "zod";

// ── Provenance: how did the registry learn about this file? ─────────────────

export const REGISTRY_SOURCES = [
  "initial_scan",
  "intake_queue",
  "customer_upload",
  "migration_import",
  "manual",
] as const;

export type RegistrySource = (typeof REGISTRY_SOURCES)[number];

// ── Content classification (provenance tags for tenant-isolation) ───────────

export const TENANT_VISIBILITY = ["private", "shared", "public"] as const;
export type TenantVisibility = (typeof TENANT_VISIBILITY)[number];

// ── BLAKE3 chunk manifest (U-FS-01: resumable upload + block-level dedup) ───

export const CADRegistryChunkSchema = z
  .object({
    /** Byte offset in the original file where this chunk begins. */
    offset: z.number().int().nonnegative(),
    /** Chunk size in bytes. Last chunk may be smaller than CHUNK_SIZE. */
    size: z.number().int().positive(),
    /** BLAKE3 hex digest of the chunk content. 64 lowercase hex. */
    blake3: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "blake3 must be 64-char lowercase hex"),
  })
  .strict();

export type CADRegistryChunk = z.infer<typeof CADRegistryChunkSchema>;

// ── Per-entry record ────────────────────────────────────────────────────────

export const CADRegistryEntrySchema = z
  .object({
    /** SHA-256 hex digest of the FULL file content (not path, not first 4KB).
     *  U-FS-01 supersedes U-CADC02's 4KB-prefix hash defect. 64 lowercase hex. */
    contentHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "contentHash must be 64-char lowercase hex"),
    /** All known absolute paths where this content has been observed. */
    paths: z.array(z.string().min(1)).min(1),
    /** File extension, lowercased, including leading dot (e.g. ".ipt"). */
    format: z.string().regex(/^\.[a-z0-9_-]+$/i),
    /** Byte count of the content at scan time. */
    sizeBytes: z.number().int().nonnegative(),
    /** ISO timestamp first observed by this registry. */
    firstSeenAt: z.string().min(1),
    /** ISO timestamp most recent observation / path-add. */
    lastSeenAt: z.string().min(1),
    /** How this entry entered the registry. */
    source: z.enum(REGISTRY_SOURCES),
    /** Customer attribution (uppercase). Unknown customers use "UNKNOWN". */
    customer: z.string().min(1),
    /** Tenant-isolation flag (SE-06 support). */
    visibility: z.enum(TENANT_VISIBILITY),
    /** Arbitrary tags (drawing-number, revision, part-family). */
    tags: z.array(z.string()).default([]),
    /** Optional BLAKE3 chunk manifest for resumable upload + block-level dedup.
     *  Only populated for files ≥ CHUNK_SIZE; smaller files omit this field. */
    chunks: z.array(CADRegistryChunkSchema).optional(),
    /** ISO timestamp of last integrity re-scan (re-hash content → verify). */
    integrityLastVerifiedAt: z.string().optional(),
  })
  .strict();

export type CADRegistryEntry = z.infer<typeof CADRegistryEntrySchema>;

// ── Registry metadata ───────────────────────────────────────────────────────

export const CADRegistryMetaSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().min(1),
    totalEntries: z.number().int().nonnegative(),
    totalPaths: z.number().int().nonnegative(),
    duplicateContentCount: z.number().int().nonnegative(),
    byFormat: z.record(z.string(), z.number().int().nonnegative()),
    byCustomer: z.record(z.string(), z.number().int().nonnegative()),
    byVisibility: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();

export type CADRegistryMeta = z.infer<typeof CADRegistryMetaSchema>;

// ── Registry file shape ─────────────────────────────────────────────────────

export const CADFileRegistrySchema = z
  .object({
    meta: CADRegistryMetaSchema,
    entries: z.record(z.string(), CADRegistryEntrySchema),
  })
  .strict()
  .refine(
    (data) => data.meta.totalEntries === Object.keys(data.entries).length,
    { message: "meta.totalEntries must equal Object.keys(entries).length" },
  );

export type CADFileRegistry = z.infer<typeof CADFileRegistrySchema>;

// ── Upsert input ────────────────────────────────────────────────────────────

export const CADRegistryUpsertSchema = z
  .object({
    contentHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "contentHash must be 64-char lowercase hex"),
    absolutePath: z.string().min(1),
    format: z.string().regex(/^\.[a-z0-9_-]+$/i),
    sizeBytes: z.number().int().nonnegative(),
    source: z.enum(REGISTRY_SOURCES),
    customer: z.string().min(1).default("UNKNOWN"),
    visibility: z.enum(TENANT_VISIBILITY).default("private"),
    tags: z.array(z.string()).default([]),
    /** Optional BLAKE3 chunk manifest (populated by U-FS-01 chunked hasher). */
    chunks: z.array(CADRegistryChunkSchema).optional(),
  })
  .strict();

export type CADRegistryUpsert = z.infer<typeof CADRegistryUpsertSchema>;
