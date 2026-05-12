/**
 * WEDMProcessCausalityEngine — WEDM AGI Phase 2 / U-P2-01
 *
 * Domain-specific wrapper around the generic CausalReasoningEngine. Loads
 * the WEDM_CAUSAL_GRAPH.json graph (≥50 edges, P2-MS1 exit gate) and
 * exposes WEDM-flavoured queries:
 *
 *   - whatAffects(variable)       — which parameters drive this outcome?
 *   - whatIsAffectedBy(variable)  — which outcomes does this parameter drive?
 *   - interventionOn(variable)    — full downstream impact trace with signs
 *   - rootCausesOf(symptom)       — BFS back to root parameters
 *
 * Delegates all graph mechanics (BFS, polarity composition, confidence
 * product) to CausalReasoningEngine — no duplicate algorithm implementation.
 *
 * @see CausalReasoningEngine   — generic graph primitives
 * @see data/state/WEDM_CAUSAL_GRAPH.json — 53 canonical WEDM causal edges
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CausalReasoningEngine,
  type CausalEdge,
  type ImpactReport,
  type ImpactPath,
  type Polarity,
} from "./CausalReasoningEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface WEDMCausalGraphFile {
  schemaVersion: number;
  graphId: string;
  generatedAt: string;
  lastUpdated: string;
  sources: string[];
  notes?: string;
  edges: CausalEdge[];
}

export interface DirectRelation {
  variable: string;
  confidence: number;
  polarity: Polarity;
  reason?: string;
}

export interface WEDMInterventionResult {
  source: string;
  maxHops: number;
  affects: ImpactPath[];
  summary: {
    positive_effects: number;
    negative_effects: number;
    unknown_effects: number;
    highest_confidence: ImpactPath | null;
  };
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMProcessCausalityEngine {
  private readonly core = new CausalReasoningEngine();
  private readonly graphPath: string;
  private loaded = false;
  private cachedEdges: readonly CausalEdge[] = [];

  constructor(graphPath?: string) {
    this.graphPath = graphPath ?? defaultGraphPath();
  }

  /** Lazy-load the canonical graph. Idempotent. */
  ensureLoaded(): void {
    if (this.loaded) return;
    const raw = readFileSync(this.graphPath, "utf8");
    const file = JSON.parse(raw) as WEDMCausalGraphFile;
    if (!Array.isArray(file.edges) || file.edges.length === 0) {
      throw new Error(
        `WEDM causal graph at ${this.graphPath} has no edges — file corrupt?`,
      );
    }
    this.core.addEdges(file.edges);
    this.cachedEdges = file.edges;
    this.loaded = true;
  }

  /** Total edge count — used by exit-gate assertion (≥50). */
  edgeCount(): number {
    this.ensureLoaded();
    return this.core.edgeCount();
  }

  nodeCount(): number {
    this.ensureLoaded();
    return this.core.nodeCount();
  }

  /** Direct parents of `variable`. */
  whatAffects(variable: string): DirectRelation[] {
    this.ensureLoaded();
    return this.cachedEdges
      .filter((e) => e.to === variable)
      .map((e) => ({
        variable: e.from,
        confidence: e.confidence,
        polarity: e.polarity,
        reason: e.reason,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Direct children of `variable`. */
  whatIsAffectedBy(variable: string): DirectRelation[] {
    this.ensureLoaded();
    return this.cachedEdges
      .filter((e) => e.from === variable)
      .map((e) => ({
        variable: e.to,
        confidence: e.confidence,
        polarity: e.polarity,
        reason: e.reason,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Full downstream trace — delegates BFS + polarity composition to the
   * generic engine, summarises by sign.
   */
  interventionOn(variable: string, maxHops = 3): WEDMInterventionResult {
    this.ensureLoaded();
    const report: ImpactReport = this.core.traceImpact(variable, maxHops);
    const affects = report.paths;
    let positive = 0;
    let negative = 0;
    let unknown = 0;
    for (const p of affects) {
      if (p.polarity === "positive") positive += 1;
      else if (p.polarity === "negative") negative += 1;
      else unknown += 1;
    }
    return {
      source: variable,
      maxHops,
      affects,
      summary: {
        positive_effects: positive,
        negative_effects: negative,
        unknown_effects: unknown,
        highest_confidence: affects.length > 0 ? affects[0] : null,
      },
    };
  }

  /** Symptom → ordered root-cause parameters (delegated). */
  rootCausesOf(symptom: string, maxHops = 3): string[] {
    this.ensureLoaded();
    return this.core.rootCauses(symptom, maxHops);
  }

  /** Read-only edge access for diagnostics. */
  edges(): readonly CausalEdge[] {
    this.ensureLoaded();
    return this.cachedEdges;
  }
}

function defaultGraphPath(): string {
  return resolve(process.cwd(), "data/state/WEDM_CAUSAL_GRAPH.json");
}

export const wedmProcessCausalityEngine = new WEDMProcessCausalityEngine();
