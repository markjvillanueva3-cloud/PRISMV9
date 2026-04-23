/**
 * cadAssemblyGraphSchema — Zod schemas for CADAssemblyGraphEngine (U-FS-02)
 *
 * Models a bidirectional parent→child reference graph across CAD assemblies.
 * Closes R14-FS-02: "no unit covers assembly→component graph, where-used
 * report, broken-reference detection, reference healing, impact analysis."
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadAssemblyGraphSchema
 */

import { z } from "zod";

// ── Component types encountered in CAD assemblies ────────────────────────────

export const ASSEMBLY_COMPONENT_TYPES = [
  "part",
  "sub_assembly",
  "drawing",
  "standard_library",
  "virtual_component",
  "suppressed",
] as const;

export type AssemblyComponentType = (typeof ASSEMBLY_COMPONENT_TYPES)[number];

// ── Reference-link status ────────────────────────────────────────────────────

export const REFERENCE_STATUS = [
  "resolved",        // child part exists in graph
  "broken",          // child ID referenced but not registered
  "healed",          // broken ref was re-pointed via content-hash lookup
  "suppressed",      // intentionally deactivated in parent
] as const;

export type ReferenceStatus = (typeof REFERENCE_STATUS)[number];

// ── Node = a part or assembly in the graph ───────────────────────────────────

export const AssemblyNodeSchema = z
  .object({
    /** Stable part identifier. Prefer SHA-256 content hash; falls back
     *  to absolute path if hash not yet computed. 1–256 chars. */
    partId: z.string().min(1).max(256),
    /** Human-readable name (usually drawing number or filename). */
    name: z.string().min(1),
    componentType: z.enum(ASSEMBLY_COMPONENT_TYPES),
    /** Known absolute paths (multiple if same content has been ingested
     *  from different locations — dedup handled upstream in U-FS-01). */
    paths: z.array(z.string().min(1)).default([]),
    /** Optional SHA-256 linking back to U-FS-01 registry. */
    contentHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
    /** Owning customer (uppercase). */
    customer: z.string().min(1).default("UNKNOWN"),
    /** Free-form tags (revision, drawing-number, part-family). */
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type AssemblyNode = z.infer<typeof AssemblyNodeSchema>;

// ── Edge = a parent → child reference inside an assembly ─────────────────────

export const AssemblyReferenceSchema = z
  .object({
    parentId: z.string().min(1),
    childId: z.string().min(1),
    /** Instance identifier within the parent (e.g. "<3>" SolidWorks suffix). */
    instanceName: z.string().optional(),
    /** Optional 4×4 transform (row-major, 16 floats). Kept lean:
     *  any non-identity placement just uses a label key. */
    transformRowMajor: z
      .array(z.number())
      .length(16)
      .optional(),
    /** Reference status at last resolve pass. */
    status: z.enum(REFERENCE_STATUS).default("resolved"),
    /** Suppression flag (mirrors 'suppressed' component state in CAD). */
    suppressed: z.boolean().default(false),
    /** Content hash of child at insert time — enables healing if renamed. */
    childContentHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
  })
  .strict();

export type AssemblyReference = z.infer<typeof AssemblyReferenceSchema>;

// ── Graph snapshot ──────────────────────────────────────────────────────────

export const AssemblyGraphSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().min(1),
    nodes: z.record(z.string(), AssemblyNodeSchema),
    edges: z.array(AssemblyReferenceSchema),
    stats: z
      .object({
        nodeCount: z.number().int().nonnegative(),
        edgeCount: z.number().int().nonnegative(),
        brokenCount: z.number().int().nonnegative(),
        healedCount: z.number().int().nonnegative(),
        rootCount: z.number().int().nonnegative(),
        leafCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type AssemblyGraph = z.infer<typeof AssemblyGraphSchema>;
