/**
 * WEDM Lattice Graph Schema — v1
 *
 * Schema for `data/state/WEDM_LATTICE_GRAPH.json`, the embedding graph built by
 * `WEDMLatticeGraphEngine` (MS-P5-GNN / U-P5-GNN-01).
 *
 * Each node represents a (material × machine × wire × thickness × Ra_target)
 * cell in the WEDM parameter space; its `embedding` is a 64-dim f32 vector
 * computed deterministically from the cell attributes and physics-derived
 * features. Edges link cells that share enough attribute bits to be plausible
 * neighbors (same material, adjacent thickness, etc.) with a weight in [0,1].
 *
 * Design constraints (from MS-P5-GNN exit gate):
 *   - embeddingDim = 64 exactly (literal-typed)
 *   - ≥ 300 nodes after build
 *   - adjacencySparsity = edges / nodes² < 0.05 (avoid dense false positives)
 *
 * @module schemas/wedmLatticeGraphSchema
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Material groups covered by the lattice — matches EDMMaterialGroup in
 * `data/wedm-published-conditions.ts` plus an `other` escape hatch for
 * history-only materials that don't map to a canonical EDM group.
 */
export const LatticeMaterialSchema = z.enum([
  "low_carbon_steel",
  "tool_steel",
  "stainless_steel",
  "hardened_steel",
  "aluminum",
  "copper",
  "brass",
  "tungsten_carbide",
  "titanium",
  "inconel",
  "graphite",
  "other",
]);
export type LatticeMaterial = z.infer<typeof LatticeMaterialSchema>;

/** ISO material group (P/M/K/N/S/H) or `other` for unmapped. */
export const LatticeISOGroupSchema = z.enum(["P", "M", "K", "N", "S", "H", "other"]);
export type LatticeISOGroup = z.infer<typeof LatticeISOGroupSchema>;

/** Controller dialect — matches WEDMJobOutcomeSchema.controller. */
export const LatticeControllerSchema = z.enum([
  "fanuc",
  "sodick",
  "makino",
  "mitsubishi",
  "agiecharmilles",
  "accutex",
]);
export type LatticeController = z.infer<typeof LatticeControllerSchema>;

/** Wire material family. */
export const LatticeWireSchema = z.enum(["brass", "zinc_coated", "molybdenum", "tungsten"]);
export type LatticeWire = z.infer<typeof LatticeWireSchema>;

/** Evidence tag on a node (how it got into the lattice). */
export const LatticeNodeEvidenceSchema = z.enum([
  "manufacturer_table",
  "published_textbook",
  "peer_reviewed",
  "interpolated",
  "history",
  "composed",
]);
export type LatticeNodeEvidence = z.infer<typeof LatticeNodeEvidenceSchema>;

/** Evidence tag on an edge (why two nodes are linked). */
export const LatticeEdgeEvidenceSchema = z.enum([
  "same_material",
  "adjacent_thickness",
  "adjacent_ra",
  "same_controller",
  "shared_wire",
  "cosine_similarity",
  "history_cluster",
]);
export type LatticeEdgeEvidence = z.infer<typeof LatticeEdgeEvidenceSchema>;

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Fixed embedding dimension. Changing this is a breaking schema bump —
 * all downstream engines (GraphAttention, NeighborQuery, ReasoningExplain)
 * depend on it.
 */
export const LATTICE_EMBEDDING_DIM = 64 as const;

export const WEDMLatticeNodeSchema = z.object({
  /** Stable ID, e.g. "N-tool_steel-fanuc-brass-50-1.6". */
  id: z.string().min(1),

  /** Lattice material group. */
  mat: LatticeMaterialSchema,

  /** ISO P/M/K/N/S/H mapping (or `other`). */
  isoGroup: LatticeISOGroupSchema,

  /** Controller dialect. */
  mach: LatticeControllerSchema,

  /** Wire material family. */
  wire: LatticeWireSchema,

  /** Wire diameter in mm. */
  wireDiameterMm: z.number().finite().positive(),

  /** Workpiece thickness in mm. */
  thicknessMm: z.number().finite().positive(),

  /** Target surface roughness Ra (µm). */
  raTargetUm: z.number().finite().positive(),

  /** Optional physics hints carried into the embedding. */
  peakCurrentA: z.number().finite().nonnegative().optional(),
  pulseOnUs: z.number().finite().nonnegative().optional(),
  pulseOffUs: z.number().finite().nonnegative().optional(),

  /** Deterministic 64-dim feature embedding (f32 precision). */
  embedding: z
    .array(z.number().finite())
    .length(LATTICE_EMBEDDING_DIM),

  /** Provenance string (PPC id, job UUID, or "composed"). */
  source: z.string().min(1),

  /** Evidence tag. */
  evidence: LatticeNodeEvidenceSchema,
}).strict();

export type WEDMLatticeNode = z.infer<typeof WEDMLatticeNodeSchema>;

export const WEDMLatticeEdgeSchema = z.object({
  src: z.string().min(1),
  dst: z.string().min(1),
  /** Similarity weight in [0,1]. 1 = identical cell, 0 = unrelated. */
  weight: z.number().finite().min(0).max(1),
  evidence: LatticeEdgeEvidenceSchema,
}).strict();

export type WEDMLatticeEdge = z.infer<typeof WEDMLatticeEdgeSchema>;

export const WEDMLatticeGraphSchema = z.object({
  schemaVersion: z.literal(1),
  /** ISO-8601 timestamp of the last build. */
  generatedAt: z.string().datetime(),

  nodeCount: z.number().finite().nonnegative().int(),
  edgeCount: z.number().finite().nonnegative().int(),

  /** edges / nodes² — must stay < 0.05 per exit gate. */
  adjacencySparsity: z.number().finite().min(0).max(1),

  /** Literal 64 — engines rely on this. */
  embeddingDim: z.literal(LATTICE_EMBEDDING_DIM),

  nodes: z.array(WEDMLatticeNodeSchema),
  edges: z.array(WEDMLatticeEdgeSchema),

  /** Where the nodes came from (for audit). */
  sources: z.object({
    publishedConditions: z.number().finite().nonnegative().int(),
    jobHistory: z.number().finite().nonnegative().int(),
    composed: z.number().finite().nonnegative().int(),
  }),
}).strict();

export type WEDMLatticeGraph = z.infer<typeof WEDMLatticeGraphSchema>;

/** Canonical zero-state (pre-build). */
export const EMPTY_WEDM_LATTICE_GRAPH: WEDMLatticeGraph = {
  schemaVersion: 1,
  generatedAt: "1970-01-01T00:00:00.000Z",
  nodeCount: 0,
  edgeCount: 0,
  adjacencySparsity: 0,
  embeddingDim: LATTICE_EMBEDDING_DIM,
  nodes: [],
  edges: [],
  sources: {
    publishedConditions: 0,
    jobHistory: 0,
    composed: 0,
  },
};
