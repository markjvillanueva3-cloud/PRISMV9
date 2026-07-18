/**
 * Memory Consolidation Engine — Background Pattern Distillation
 * ==============================================================
 * Periodically consolidates the MemoryGraphEngine's raw decision/outcome
 * nodes into distilled PATTERN nodes. Prunes stale context, surfaces
 * recurring error→fix chains as tribal knowledge.
 *
 * Clean-room implementation inspired by background memory consolidation
 * patterns in agentic tools (4-phase: collect → cluster → distill → prune).
 *
 * @module engines/MemoryConsolidationEngine
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";

/** Consolidation configuration */
interface ConsolidationConfig {
  /** Minimum sessions before consolidation runs */
  minSessionsBeforeConsolidate: number;
  /** Maximum age (hours) for CONTEXT nodes before pruning */
  contextMaxAgeHours: number;
  /** Minimum occurrences of an error→fix pattern to promote to PATTERN */
  minPatternOccurrences: number;
  /** Maximum number of PATTERN nodes to keep */
  maxPatterns: number;
}

const DEFAULT_CONFIG: ConsolidationConfig = {
  minSessionsBeforeConsolidate: 5,
  contextMaxAgeHours: 168,    // 7 days
  minPatternOccurrences: 3,
  maxPatterns: 200,
};

/** A distilled pattern from consolidation */
export interface ConsolidatedPattern {
  id: string;
  type: "error_fix" | "parameter_trend" | "material_preference" | "tool_choice" | "process_learning";
  description: string;
  occurrences: number;
  confidence: number;
  firstSeen: string;        // ISO timestamp
  lastSeen: string;
  context: Record<string, unknown>;
  source_nodes: string[];   // IDs of the nodes that contributed
}

/** Consolidation report */
export interface ConsolidationReport {
  timestamp: string;
  sessionCount: number;
  nodesBeforeCount: number;
  nodesAfterCount: number;
  patternsDiscovered: number;
  patternsPromoted: number;
  contextNodesPruned: number;
  errorNodesMerged: number;
  durationMs: number;
}

const STATE_DIR = PATHS.STATE_DIR;
const CONSOLIDATION_STATE_FILE = path.join(STATE_DIR, "memory_consolidation_state.json");
const PATTERNS_FILE = path.join(STATE_DIR, "consolidated_patterns.json");

/** Consolidation state persisted between runs */
interface ConsolidationState {
  lastConsolidation: string | null;
  sessionsSinceLastConsolidation: number;
  totalConsolidations: number;
  patterns: ConsolidatedPattern[];
}

class MemoryConsolidationEngineImpl {
  private state: ConsolidationState;
  private config: ConsolidationConfig;

  constructor(config?: Partial<ConsolidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.loadState();
  }

  private loadState(): ConsolidationState {
    try {
      if (fs.existsSync(CONSOLIDATION_STATE_FILE)) {
        return JSON.parse(fs.readFileSync(CONSOLIDATION_STATE_FILE, "utf-8"));
      }
    } catch (e) {
      log.warn(`[CONSOLIDATION] Failed to load state: ${(e as Error).message}`);
    }
    return {
      lastConsolidation: null,
      sessionsSinceLastConsolidation: 0,
      totalConsolidations: 0,
      patterns: [],
    };
  }

  private saveState(): void {
    try {
      fs.mkdirSync(path.dirname(CONSOLIDATION_STATE_FILE), { recursive: true });
      fs.writeFileSync(CONSOLIDATION_STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (e) {
      log.warn(`[CONSOLIDATION] Failed to save state: ${(e as Error).message}`);
    }
  }

  /** Record a session end — increments counter toward next consolidation */
  recordSessionEnd(): void {
    this.state.sessionsSinceLastConsolidation++;
    this.saveState();
  }

  /** Check if consolidation should run */
  shouldConsolidate(): boolean {
    return this.state.sessionsSinceLastConsolidation >= this.config.minSessionsBeforeConsolidate;
  }

  /**
   * Run the 4-phase consolidation process.
   * Safe to call frequently — it checks shouldConsolidate() internally.
   *
   * Phase 1: Collect — read raw graph nodes
   * Phase 2: Cluster — group similar decisions/errors
   * Phase 3: Distill — promote recurring clusters to PATTERN nodes
   * Phase 4: Prune — remove stale CONTEXT nodes, cap PATTERN count
   */
  async consolidate(): Promise<ConsolidationReport | null> {
    if (!this.shouldConsolidate()) {
      return null;
    }

    const startTime = Date.now();
    const report: ConsolidationReport = {
      timestamp: new Date().toISOString(),
      sessionCount: this.state.sessionsSinceLastConsolidation,
      nodesBeforeCount: 0,
      nodesAfterCount: 0,
      patternsDiscovered: 0,
      patternsPromoted: 0,
      contextNodesPruned: 0,
      errorNodesMerged: 0,
      durationMs: 0,
    };

    try {
      // Phase 1: Collect — read memory graph data
      const graphDir = path.join(STATE_DIR, "memory_graph");
      if (!fs.existsSync(graphDir)) {
        log.info("[CONSOLIDATION] No memory graph directory found, skipping");
        return null;
      }

      const nodes = this.readGraphNodes(graphDir);
      report.nodesBeforeCount = nodes.length;

      if (nodes.length === 0) {
        log.info("[CONSOLIDATION] No nodes to consolidate");
        return null;
      }

      // Phase 2: Cluster — group by action + error pattern
      const errorClusters = this.clusterErrors(nodes);
      const decisionClusters = this.clusterDecisions(nodes);

      // Phase 3: Distill — promote to patterns
      const newPatterns = this.distillPatterns(errorClusters, decisionClusters);
      report.patternsDiscovered = newPatterns.length;

      // Merge with existing patterns
      for (const np of newPatterns) {
        const existing = this.state.patterns.find(p => p.id === np.id);
        if (existing) {
          existing.occurrences += np.occurrences;
          existing.lastSeen = np.lastSeen;
          existing.confidence = Math.min(1, existing.confidence + 0.05);
        } else {
          this.state.patterns.push(np);
          report.patternsPromoted++;
        }
      }

      // Phase 4: Prune
      const pruned = this.pruneStaleNodes(nodes, graphDir);
      report.contextNodesPruned = pruned;

      // Cap pattern count
      if (this.state.patterns.length > this.config.maxPatterns) {
        this.state.patterns.sort((a, b) => b.confidence - a.confidence);
        this.state.patterns = this.state.patterns.slice(0, this.config.maxPatterns);
      }

      report.nodesAfterCount = report.nodesBeforeCount - report.contextNodesPruned;
      report.durationMs = Date.now() - startTime;

      // Update state
      this.state.lastConsolidation = report.timestamp;
      this.state.sessionsSinceLastConsolidation = 0;
      this.state.totalConsolidations++;
      this.saveState();
      this.savePatterns();

      log.info(`[CONSOLIDATION] Complete: ${report.patternsPromoted} new patterns, ${report.contextNodesPruned} pruned, ${report.durationMs}ms`);
      return report;

    } catch (e) {
      log.error(`[CONSOLIDATION] Failed: ${(e as Error).message}`);
      report.durationMs = Date.now() - startTime;
      return report;
    }
  }

  /** Read graph node files from the memory graph directory */
  private readGraphNodes(graphDir: string): Array<Record<string, unknown>> {
    const nodes: Array<Record<string, unknown>> = [];
    try {
      const files = fs.readdirSync(graphDir).filter(f => f.endsWith(".json"));
      for (const file of files.slice(0, 5000)) { // Cap at 5000 to prevent OOM
        try {
          const data = JSON.parse(fs.readFileSync(path.join(graphDir, file), "utf-8"));
          if (data && typeof data === "object") {
            nodes.push(data as Record<string, unknown>);
          }
        } catch { /* skip corrupt files */ }
      }
    } catch { /* dir read failure */ }
    return nodes;
  }

  /** Cluster error nodes by action + error code */
  private clusterErrors(nodes: Array<Record<string, unknown>>): Map<string, Array<Record<string, unknown>>> {
    const clusters = new Map<string, Array<Record<string, unknown>>>();
    for (const node of nodes) {
      if (node.type !== "ERROR") continue;
      const key = `${node.action || "unknown"}:${node.error_code || node.message || "unknown"}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(node);
    }
    return clusters;
  }

  /** Cluster decision nodes by action + chosen outcome */
  private clusterDecisions(nodes: Array<Record<string, unknown>>): Map<string, Array<Record<string, unknown>>> {
    const clusters = new Map<string, Array<Record<string, unknown>>>();
    for (const node of nodes) {
      if (node.type !== "DECISION") continue;
      const key = `${node.action || "unknown"}:${node.decision_type || "general"}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(node);
    }
    return clusters;
  }

  /** Promote recurring clusters to ConsolidatedPattern */
  private distillPatterns(
    errorClusters: Map<string, Array<Record<string, unknown>>>,
    decisionClusters: Map<string, Array<Record<string, unknown>>>,
  ): ConsolidatedPattern[] {
    const patterns: ConsolidatedPattern[] = [];

    // Error patterns
    for (const [key, nodes] of errorClusters) {
      if (nodes.length < this.config.minPatternOccurrences) continue;
      patterns.push({
        id: `err:${key}`,
        type: "error_fix",
        description: `Recurring error: ${key} (${nodes.length} occurrences)`,
        occurrences: nodes.length,
        confidence: Math.min(1, 0.5 + nodes.length * 0.1),
        firstSeen: String(nodes[0].timestamp || new Date().toISOString()),
        lastSeen: String(nodes[nodes.length - 1].timestamp || new Date().toISOString()),
        context: { error_key: key },
        source_nodes: nodes.map(n => String(n.id || "")).filter(Boolean),
      });
    }

    // Decision patterns
    for (const [key, nodes] of decisionClusters) {
      if (nodes.length < this.config.minPatternOccurrences) continue;
      patterns.push({
        id: `dec:${key}`,
        type: "process_learning",
        description: `Recurring decision: ${key} (${nodes.length} occurrences)`,
        occurrences: nodes.length,
        confidence: Math.min(1, 0.4 + nodes.length * 0.08),
        firstSeen: String(nodes[0].timestamp || new Date().toISOString()),
        lastSeen: String(nodes[nodes.length - 1].timestamp || new Date().toISOString()),
        context: { decision_key: key },
        source_nodes: nodes.map(n => String(n.id || "")).filter(Boolean),
      });
    }

    return patterns;
  }

  /** Prune CONTEXT nodes older than threshold */
  private pruneStaleNodes(nodes: Array<Record<string, unknown>>, graphDir: string): number {
    const maxAge = this.config.contextMaxAgeHours * 3600 * 1000;
    const now = Date.now();
    let pruned = 0;

    for (const node of nodes) {
      if (node.type !== "CONTEXT") continue;
      const ts = node.timestamp ? new Date(String(node.timestamp)).getTime() : 0;
      if (ts > 0 && now - ts > maxAge) {
        // Delete the node file if we can identify it
        const nodeId = String(node.id || "");
        if (nodeId) {
          try {
            const filePath = path.join(graphDir, `${nodeId}.json`);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              pruned++;
            }
          } catch { /* best effort */ }
        }
      }
    }

    return pruned;
  }

  /** Save consolidated patterns to disk */
  private savePatterns(): void {
    try {
      fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.state.patterns, null, 2));
    } catch (e) {
      log.warn(`[CONSOLIDATION] Failed to save patterns: ${(e as Error).message}`);
    }
  }

  /** Get current consolidated patterns */
  getPatterns(): ConsolidatedPattern[] {
    return [...this.state.patterns];
  }

  /** Get consolidation stats */
  getStats(): { totalConsolidations: number; patternsCount: number; sessionsSinceLast: number; lastConsolidation: string | null } {
    return {
      totalConsolidations: this.state.totalConsolidations,
      patternsCount: this.state.patterns.length,
      sessionsSinceLast: this.state.sessionsSinceLastConsolidation,
      lastConsolidation: this.state.lastConsolidation,
    };
  }
}

export const memoryConsolidationEngine = new MemoryConsolidationEngineImpl();
