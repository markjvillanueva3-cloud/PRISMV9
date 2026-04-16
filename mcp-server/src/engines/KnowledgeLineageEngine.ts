/**
 * KnowledgeLineageEngine.ts — KAR-MS0 U-KAR03
 * Tracks knowledge provenance: which source provided which value,
 * conflict resolution using authority ranking, and version history.
 *
 * Features:
 * - Lineage graph tracking (source → atom → consumer)
 * - Authority-based conflict resolution
 * - Version history with diff tracking
 * - Persistence to JSON state file
 * - Query APIs for tracing any value to its source
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import {
  KnowledgeAtom,
  KnowledgeSource,
  AuthorityLevel,
  AUTHORITY_RANK,
  KnowledgeAtomSchema,
} from "../types/KnowledgeAtom.js";
import { logger } from "../utils/Logger.js";

// ============================================================================
// Lineage Types
// ============================================================================

/**
 * A lineage node in the graph.
 */
export const LineageNodeSchema = z.object({
  /** Node ID (atom ID or source path) */
  id: z.string(),

  /** Node type */
  type: z.enum(["source", "atom", "consumer"]),

  /** Display label */
  label: z.string(),

  /** Metadata */
  metadata: z.record(z.string(), z.any()).optional(),

  /** Created timestamp */
  createdAt: z.string(),

  /** Last updated timestamp */
  updatedAt: z.string().optional(),
});
export type LineageNode = z.infer<typeof LineageNodeSchema>;

/**
 * An edge connecting two lineage nodes.
 */
export const LineageEdgeSchema = z.object({
  /** Unique edge ID */
  id: z.string(),

  /** Source node ID */
  from: z.string(),

  /** Target node ID */
  to: z.string(),

  /** Edge type */
  type: z.enum(["extracted_from", "wired_to", "derived_from", "supersedes", "conflicts_with"]),

  /** Confidence of this relationship */
  confidence: z.number().min(0).max(1).optional(),

  /** Timestamp */
  timestamp: z.string(),

  /** Additional metadata */
  metadata: z.record(z.string(), z.any()).optional(),
});
export type LineageEdge = z.infer<typeof LineageEdgeSchema>;

/**
 * Version record for an atom.
 */
export const VersionRecordSchema = z.object({
  /** Version number */
  version: z.number(),

  /** Atom ID */
  atomId: z.string(),

  /** Content at this version */
  content: z.string(),

  /** Source that provided this version */
  source: z.string(),

  /** Authority level */
  authority: z.string(),

  /** Timestamp */
  timestamp: z.string(),

  /** Diff from previous version (if any) */
  diff: z.object({
    added: z.array(z.string()).optional(),
    removed: z.array(z.string()).optional(),
    changed: z.array(z.object({
      field: z.string(),
      from: z.any(),
      to: z.any(),
    })).optional(),
  }).optional(),

  /** Reason for update */
  reason: z.string().optional(),
});
export type VersionRecord = z.infer<typeof VersionRecordSchema>;

/**
 * Conflict record when multiple sources provide conflicting values.
 */
export const ConflictRecordSchema = z.object({
  /** Conflict ID */
  id: z.string(),

  /** Atom ID with conflict */
  atomId: z.string(),

  /** Field with conflict */
  field: z.string(),

  /** Conflicting values with their sources */
  values: z.array(z.object({
    value: z.any(),
    source: z.string(),
    authority: z.string(),
    authorityRank: z.number(),
    timestamp: z.string(),
  })),

  /** Resolution status */
  status: z.enum(["pending", "resolved", "manual_review"]),

  /** Resolved value (if resolved) */
  resolvedValue: z.any().optional(),

  /** Resolution method */
  resolutionMethod: z.enum(["authority_rank", "latest", "manual", "consensus"]).optional(),

  /** Resolution timestamp */
  resolvedAt: z.string().optional(),

  /** Resolution notes */
  notes: z.string().optional(),
});
export type ConflictRecord = z.infer<typeof ConflictRecordSchema>;

/**
 * Complete lineage graph state.
 */
export const LineageGraphSchema = z.object({
  /** Schema version */
  schemaVersion: z.string().default("1.0.0"),

  /** Last updated */
  updatedAt: z.string(),

  /** All nodes */
  nodes: z.array(LineageNodeSchema),

  /** All edges */
  edges: z.array(LineageEdgeSchema),

  /** Version history by atom ID */
  versions: z.record(z.string(), z.array(VersionRecordSchema)),

  /** Active conflicts */
  conflicts: z.array(ConflictRecordSchema),

  /** Statistics */
  stats: z.object({
    totalNodes: z.number(),
    totalEdges: z.number(),
    totalVersions: z.number(),
    pendingConflicts: z.number(),
    resolvedConflicts: z.number(),
  }),
});
export type LineageGraph = z.infer<typeof LineageGraphSchema>;

// ============================================================================
// Engine Implementation
// ============================================================================

const STATE_FILE = "data/state/knowledge-lineage.json";

export class KnowledgeLineageEngine {
  private graph: LineageGraph;
  private dirty: boolean = false;
  private statePath: string;

  constructor(basePath?: string) {
    this.statePath = basePath
      ? path.join(basePath, STATE_FILE)
      : path.join(process.cwd(), STATE_FILE);
    this.graph = this.loadState();
  }

  // =========================================================================
  // State Persistence
  // =========================================================================

  private loadState(): LineageGraph {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
        const result = LineageGraphSchema.safeParse(data);
        if (result.success) {
          logger.info(`[KnowledgeLineage] Loaded state: ${result.data.stats.totalNodes} nodes, ${result.data.stats.totalEdges} edges`);
          return result.data;
        }
        logger.warn("[KnowledgeLineage] Invalid state file, initializing fresh");
      }
    } catch (err) {
      logger.warn("[KnowledgeLineage] Could not load state:", err);
    }

    return this.createEmptyGraph();
  }

  private createEmptyGraph(): LineageGraph {
    return {
      schemaVersion: "1.0.0",
      updatedAt: new Date().toISOString(),
      nodes: [],
      edges: [],
      versions: {},
      conflicts: [],
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        totalVersions: 0,
        pendingConflicts: 0,
        resolvedConflicts: 0,
      },
    };
  }

  /**
   * Persist state to disk.
   */
  save(): void {
    if (!this.dirty) return;

    try {
      // Ensure directory exists
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Update stats
      this.updateStats();
      this.graph.updatedAt = new Date().toISOString();

      fs.writeFileSync(this.statePath, JSON.stringify(this.graph, null, 2));
      this.dirty = false;
      logger.info(`[KnowledgeLineage] Saved: ${this.graph.stats.totalNodes} nodes, ${this.graph.stats.totalEdges} edges`);
    } catch (err) {
      logger.error("[KnowledgeLineage] Failed to save state:", err);
      throw err;
    }
  }

  private updateStats(): void {
    this.graph.stats = {
      totalNodes: this.graph.nodes.length,
      totalEdges: this.graph.edges.length,
      totalVersions: Object.values(this.graph.versions).reduce((sum, v) => sum + v.length, 0),
      pendingConflicts: this.graph.conflicts.filter((c) => c.status === "pending").length,
      resolvedConflicts: this.graph.conflicts.filter((c) => c.status === "resolved").length,
    };
  }

  // =========================================================================
  // Node Operations
  // =========================================================================

  /**
   * Register a source node (file, URL, etc.).
   */
  registerSource(sourcePath: string, metadata?: Record<string, unknown>): LineageNode {
    const existing = this.graph.nodes.find((n) => n.id === sourcePath && n.type === "source");
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      if (metadata) existing.metadata = { ...existing.metadata, ...metadata };
      this.dirty = true;
      return existing;
    }

    const node: LineageNode = {
      id: sourcePath,
      type: "source",
      label: path.basename(sourcePath),
      metadata,
      createdAt: new Date().toISOString(),
    };

    this.graph.nodes.push(node);
    this.dirty = true;
    return node;
  }

  /**
   * Register an atom node.
   */
  registerAtom(atom: KnowledgeAtom): LineageNode {
    const existing = this.graph.nodes.find((n) => n.id === atom.id && n.type === "atom");
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      existing.metadata = {
        ...existing.metadata,
        type: atom.type,
        category: atom.category,
        confidence: atom.confidence,
      };
      this.dirty = true;
      return existing;
    }

    const node: LineageNode = {
      id: atom.id,
      type: "atom",
      label: atom.title,
      metadata: {
        type: atom.type,
        category: atom.category,
        confidence: atom.confidence,
        authority: atom.source.authority,
      },
      createdAt: new Date().toISOString(),
    };

    this.graph.nodes.push(node);
    this.dirty = true;
    return node;
  }

  /**
   * Register a consumer node.
   */
  registerConsumer(consumerId: string, name: string, type: string): LineageNode {
    const existing = this.graph.nodes.find((n) => n.id === consumerId && n.type === "consumer");
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      this.dirty = true;
      return existing;
    }

    const node: LineageNode = {
      id: consumerId,
      type: "consumer",
      label: name,
      metadata: { consumerType: type },
      createdAt: new Date().toISOString(),
    };

    this.graph.nodes.push(node);
    this.dirty = true;
    return node;
  }

  // =========================================================================
  // Edge Operations
  // =========================================================================

  /**
   * Record extraction: source → atom.
   */
  recordExtraction(sourcePath: string, atom: KnowledgeAtom): LineageEdge {
    this.registerSource(sourcePath);
    this.registerAtom(atom);

    const edgeId = `ext-${this.simpleHash(sourcePath + atom.id)}`;
    const existing = this.graph.edges.find((e) => e.id === edgeId);
    if (existing) {
      existing.timestamp = new Date().toISOString();
      existing.confidence = atom.confidence;
      this.dirty = true;
      return existing;
    }

    const edge: LineageEdge = {
      id: edgeId,
      from: sourcePath,
      to: atom.id,
      type: "extracted_from",
      confidence: atom.confidence,
      timestamp: new Date().toISOString(),
      metadata: {
        extractionMethod: atom.source.extractionMethod,
        authority: atom.source.authority,
      },
    };

    this.graph.edges.push(edge);
    this.dirty = true;
    return edge;
  }

  /**
   * Record wiring: atom → consumer.
   */
  recordWiring(atomId: string, consumerId: string, action: string): LineageEdge {
    const edgeId = `wire-${this.simpleHash(atomId + consumerId + action)}`;
    const existing = this.graph.edges.find((e) => e.id === edgeId);
    if (existing) {
      existing.timestamp = new Date().toISOString();
      this.dirty = true;
      return existing;
    }

    const edge: LineageEdge = {
      id: edgeId,
      from: atomId,
      to: consumerId,
      type: "wired_to",
      timestamp: new Date().toISOString(),
      metadata: { action },
    };

    this.graph.edges.push(edge);
    this.dirty = true;
    return edge;
  }

  /**
   * Record derivation: atom → derived atom.
   */
  recordDerivation(sourceAtomId: string, derivedAtomId: string, method: string): LineageEdge {
    const edgeId = `deriv-${this.simpleHash(sourceAtomId + derivedAtomId)}`;

    const edge: LineageEdge = {
      id: edgeId,
      from: sourceAtomId,
      to: derivedAtomId,
      type: "derived_from",
      timestamp: new Date().toISOString(),
      metadata: { derivationMethod: method },
    };

    this.graph.edges.push(edge);
    this.dirty = true;
    return edge;
  }

  /**
   * Record supersession: new atom supersedes old.
   */
  recordSupersession(oldAtomId: string, newAtomId: string, reason: string): LineageEdge {
    const edgeId = `super-${this.simpleHash(oldAtomId + newAtomId)}`;

    const edge: LineageEdge = {
      id: edgeId,
      from: newAtomId,
      to: oldAtomId,
      type: "supersedes",
      timestamp: new Date().toISOString(),
      metadata: { reason },
    };

    this.graph.edges.push(edge);
    this.dirty = true;
    return edge;
  }

  // =========================================================================
  // Version Tracking
  // =========================================================================

  /**
   * Record a new version of an atom.
   */
  recordVersion(
    atom: KnowledgeAtom,
    reason?: string,
    previousAtom?: KnowledgeAtom
  ): VersionRecord {
    const versions = this.graph.versions[atom.id] || [];
    const newVersion = versions.length + 1;

    const record: VersionRecord = {
      version: newVersion,
      atomId: atom.id,
      content: atom.content,
      source: atom.source.path,
      authority: atom.source.authority,
      timestamp: new Date().toISOString(),
      reason,
    };

    // Compute diff if previous version provided
    if (previousAtom) {
      record.diff = this.computeDiff(previousAtom, atom);
    }

    versions.push(record);
    this.graph.versions[atom.id] = versions;
    this.dirty = true;

    return record;
  }

  /**
   * Get version history for an atom.
   */
  getVersionHistory(atomId: string): VersionRecord[] {
    return this.graph.versions[atomId] || [];
  }

  /**
   * Get a specific version of an atom.
   */
  getVersion(atomId: string, version: number): VersionRecord | undefined {
    const versions = this.graph.versions[atomId] || [];
    return versions.find((v) => v.version === version);
  }

  private computeDiff(
    old: KnowledgeAtom,
    current: KnowledgeAtom
  ): VersionRecord["diff"] {
    const changed: Array<{ field: string; from: unknown; to: unknown }> = [];

    const fieldsToCompare: (keyof KnowledgeAtom)[] = [
      "title",
      "content",
      "type",
      "category",
      "confidence",
    ];

    for (const field of fieldsToCompare) {
      if (old[field] !== current[field]) {
        changed.push({
          field,
          from: old[field],
          to: current[field],
        });
      }
    }

    // Compare tags
    const oldTags = new Set(old.tags || []);
    const newTags = new Set(current.tags || []);
    const addedTags = [...newTags].filter((t) => !oldTags.has(t));
    const removedTags = [...oldTags].filter((t) => !newTags.has(t));

    return {
      changed: changed.length > 0 ? changed : undefined,
      added: addedTags.length > 0 ? addedTags : undefined,
      removed: removedTags.length > 0 ? removedTags : undefined,
    };
  }

  // =========================================================================
  // Conflict Resolution
  // =========================================================================

  /**
   * Detect conflicts when adding new knowledge.
   */
  detectConflict(
    atomId: string,
    field: string,
    newValue: unknown,
    source: KnowledgeSource
  ): ConflictRecord | null {
    // Check for existing values from different sources
    const existingConflict = this.graph.conflicts.find(
      (c) => c.atomId === atomId && c.field === field && c.status !== "resolved"
    );

    if (existingConflict) {
      // Add to existing conflict
      existingConflict.values.push({
        value: newValue,
        source: source.path,
        authority: source.authority,
        authorityRank: AUTHORITY_RANK[source.authority],
        timestamp: new Date().toISOString(),
      });
      this.dirty = true;
      return existingConflict;
    }

    // Check version history for conflicting values
    const versions = this.graph.versions[atomId] || [];
    const latestVersion = versions[versions.length - 1];

    if (latestVersion && latestVersion.source !== source.path) {
      // Potential conflict - different source providing value
      const conflict: ConflictRecord = {
        id: `conflict-${this.simpleHash(atomId + field + Date.now())}`,
        atomId,
        field,
        values: [
          {
            value: newValue,
            source: source.path,
            authority: source.authority,
            authorityRank: AUTHORITY_RANK[source.authority],
            timestamp: new Date().toISOString(),
          },
        ],
        status: "pending",
      };

      this.graph.conflicts.push(conflict);
      this.dirty = true;
      return conflict;
    }

    return null;
  }

  /**
   * Resolve a conflict using authority ranking.
   */
  resolveConflictByAuthority(conflictId: string): ConflictRecord | null {
    const conflict = this.graph.conflicts.find((c) => c.id === conflictId);
    if (!conflict || conflict.status === "resolved") return null;

    // Sort by authority rank (highest first)
    const sorted = [...conflict.values].sort(
      (a, b) => b.authorityRank - a.authorityRank
    );

    const winner = sorted[0];
    conflict.resolvedValue = winner.value;
    conflict.resolutionMethod = "authority_rank";
    conflict.status = "resolved";
    conflict.resolvedAt = new Date().toISOString();
    conflict.notes = `Resolved to ${winner.authority} (rank ${winner.authorityRank}) from ${winner.source}`;

    this.dirty = true;
    logger.info(`[KnowledgeLineage] Resolved conflict ${conflictId}: ${conflict.notes}`);

    return conflict;
  }

  /**
   * Resolve a conflict with the latest value.
   */
  resolveConflictByLatest(conflictId: string): ConflictRecord | null {
    const conflict = this.graph.conflicts.find((c) => c.id === conflictId);
    if (!conflict || conflict.status === "resolved") return null;

    // Sort by timestamp (latest first)
    const sorted = [...conflict.values].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const winner = sorted[0];
    conflict.resolvedValue = winner.value;
    conflict.resolutionMethod = "latest";
    conflict.status = "resolved";
    conflict.resolvedAt = new Date().toISOString();
    conflict.notes = `Resolved to latest value from ${winner.source} at ${winner.timestamp}`;

    this.dirty = true;
    return conflict;
  }

  /**
   * Manually resolve a conflict.
   */
  resolveConflictManually(
    conflictId: string,
    resolvedValue: unknown,
    notes: string
  ): ConflictRecord | null {
    const conflict = this.graph.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return null;

    conflict.resolvedValue = resolvedValue;
    conflict.resolutionMethod = "manual";
    conflict.status = "resolved";
    conflict.resolvedAt = new Date().toISOString();
    conflict.notes = notes;

    this.dirty = true;
    return conflict;
  }

  /**
   * Get all pending conflicts.
   */
  getPendingConflicts(): ConflictRecord[] {
    return this.graph.conflicts.filter((c) => c.status === "pending");
  }

  /**
   * Get conflicts for an atom.
   */
  getConflictsForAtom(atomId: string): ConflictRecord[] {
    return this.graph.conflicts.filter((c) => c.atomId === atomId);
  }

  /**
   * Find atoms that conflict with the given atom.
   * Checks for atoms with same category/type from different sources.
   * Used by KnowledgeHooks for wiring conflict detection.
   */
  findConflicts(atom: KnowledgeAtom): KnowledgeAtom[] {
    const conflictingAtoms: KnowledgeAtom[] = [];

    // Find atom nodes with same category and type but different source
    for (const node of this.graph.nodes) {
      if (node.type !== "atom" || node.id === atom.id) continue;

      // Check if same category/type
      if (
        node.metadata?.category === atom.category &&
        node.metadata?.type === atom.type
      ) {
        // Check if different source
        const nodeEdges = this.graph.edges.filter(
          (e) => e.to === node.id && e.type === "extracted_from"
        );
        const atomSourcePath = atom.source.path;

        for (const edge of nodeEdges) {
          if (edge.from !== atomSourcePath) {
            // Different source - potential conflict
            // Reconstruct minimal atom for comparison
            conflictingAtoms.push({
              id: node.id,
              title: node.label,
              content: "",
              type: (node.metadata?.type as KnowledgeAtom["type"]) || "general",
              category: (node.metadata?.category as string) || "unknown",
              tags: [],
              confidence: (node.metadata?.confidence as number) || 0.5,
              source: {
                path: edge.from,
                sourceType: "unknown",
                category: "unknown",
                authority: (node.metadata?.authority as KnowledgeAtom["source"]["authority"]) || "unknown",
                authorityRank: AUTHORITY_RANK[(node.metadata?.authority as keyof typeof AUTHORITY_RANK) || "unknown"],
              },
              targets: [],
              extractedAt: node.createdAt,
              usageCount: 0,
              version: 1,
            });
          }
        }
      }
    }

    return conflictingAtoms;
  }

  /**
   * Resolve conflicts between multiple atoms using authority ranking.
   * Returns the winning atom and reason.
   * Used by KnowledgeHooks for wiring decisions.
   */
  resolveConflicts(atoms: KnowledgeAtom[]): { winner: KnowledgeAtom; reason: string } {
    if (atoms.length === 0) {
      throw new Error("Cannot resolve conflicts with empty atom array");
    }

    if (atoms.length === 1) {
      return { winner: atoms[0], reason: "single_atom" };
    }

    // Sort by authority rank (highest first), then by confidence, then by timestamp
    const sorted = [...atoms].sort((a, b) => {
      // Authority rank
      const rankDiff = AUTHORITY_RANK[b.source.authority] - AUTHORITY_RANK[a.source.authority];
      if (rankDiff !== 0) return rankDiff;

      // Confidence
      const confDiff = b.confidence - a.confidence;
      if (Math.abs(confDiff) > 0.01) return confDiff;

      // Timestamp (newer wins)
      return new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime();
    });

    const winner = sorted[0];
    const loser = sorted[1];

    let reason: string;
    if (AUTHORITY_RANK[winner.source.authority] > AUTHORITY_RANK[loser.source.authority]) {
      reason = `authority_rank: ${winner.source.authority} (${AUTHORITY_RANK[winner.source.authority]}) > ${loser.source.authority} (${AUTHORITY_RANK[loser.source.authority]})`;
    } else if (winner.confidence > loser.confidence) {
      reason = `confidence: ${winner.confidence.toFixed(2)} > ${loser.confidence.toFixed(2)}`;
    } else {
      reason = `timestamp: ${winner.extractedAt} > ${loser.extractedAt}`;
    }

    logger.info(`[KnowledgeLineage] Resolved conflict: ${winner.id} wins (${reason})`);

    return { winner, reason };
  }

  // =========================================================================
  // Lineage Queries
  // =========================================================================

  /**
   * Trace an atom back to its original source(s).
   */
  traceToSource(atomId: string): Array<{ path: string[]; source: LineageNode }> {
    const results: Array<{ path: string[]; source: LineageNode }> = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string, path: string[]): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      if (node.type === "source") {
        results.push({ path: [...path, nodeId], source: node });
        return;
      }

      // Find incoming edges
      const incomingEdges = this.graph.edges.filter(
        (e) => e.to === nodeId && (e.type === "extracted_from" || e.type === "derived_from")
      );

      for (const edge of incomingEdges) {
        traverse(edge.from, [...path, nodeId]);
      }
    };

    traverse(atomId, []);
    return results;
  }

  /**
   * Find all consumers of an atom.
   */
  findConsumers(atomId: string): Array<{ consumer: LineageNode; action: string }> {
    const results: Array<{ consumer: LineageNode; action: string }> = [];

    const outgoingEdges = this.graph.edges.filter(
      (e) => e.from === atomId && e.type === "wired_to"
    );

    for (const edge of outgoingEdges) {
      const consumer = this.graph.nodes.find(
        (n) => n.id === edge.to && n.type === "consumer"
      );
      if (consumer) {
        results.push({
          consumer,
          action: (edge.metadata?.action as string) || "unknown",
        });
      }
    }

    return results;
  }

  /**
   * Find all atoms from a source.
   */
  findAtomsFromSource(sourcePath: string): LineageNode[] {
    const outgoingEdges = this.graph.edges.filter(
      (e) => e.from === sourcePath && e.type === "extracted_from"
    );

    return outgoingEdges
      .map((e) => this.graph.nodes.find((n) => n.id === e.to))
      .filter((n): n is LineageNode => n !== undefined && n.type === "atom");
  }

  /**
   * Get full lineage report for an atom.
   */
  getLineageReport(atomId: string): {
    atom: LineageNode | undefined;
    sources: Array<{ path: string[]; source: LineageNode }>;
    consumers: Array<{ consumer: LineageNode; action: string }>;
    versions: VersionRecord[];
    conflicts: ConflictRecord[];
  } {
    return {
      atom: this.graph.nodes.find((n) => n.id === atomId && n.type === "atom"),
      sources: this.traceToSource(atomId),
      consumers: this.findConsumers(atomId),
      versions: this.getVersionHistory(atomId),
      conflicts: this.getConflictsForAtom(atomId),
    };
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Get graph statistics.
   */
  getStats(): LineageGraph["stats"] {
    this.updateStats();
    return this.graph.stats;
  }

  /**
   * Get authority distribution.
   */
  getAuthorityDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};

    for (const node of this.graph.nodes) {
      if (node.type === "atom" && node.metadata?.authority) {
        const auth = node.metadata.authority as string;
        dist[auth] = (dist[auth] || 0) + 1;
      }
    }

    return dist;
  }

  /**
   * Get source coverage statistics.
   */
  getSourceCoverage(): Array<{ source: string; atomCount: number; consumerCount: number }> {
    const sources = this.graph.nodes.filter((n) => n.type === "source");

    return sources.map((source) => {
      const atoms = this.findAtomsFromSource(source.id);
      let consumerCount = 0;
      for (const atom of atoms) {
        consumerCount += this.findConsumers(atom.id).length;
      }

      return {
        source: source.id,
        atomCount: atoms.length,
        consumerCount,
      };
    });
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.graph = this.createEmptyGraph();
    this.dirty = true;
  }

  /**
   * Get raw graph (for debugging).
   */
  getGraph(): LineageGraph {
    return this.graph;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const knowledgeLineageEngine = new KnowledgeLineageEngine();
