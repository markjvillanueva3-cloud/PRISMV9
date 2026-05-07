/**
 * WEDMReasoningExplainEngine — Natural-language reasoning over the WEDM
 * embedding lattice.
 *
 * MS-P5-GNN / U-P5-GNN-05
 *
 * Given a prediction target (mat × mach × wire × th × Ra) and an optional
 * predicted outcome (Ra, break probability, recast), this engine:
 *
 *   1. Queries WEDMNeighborQueryEngine for the top-K analogous nodes
 *   2. Extracts the defining attribute match for each citation (same material,
 *      adjacent thickness, same wire, etc.)
 *   3. Composes a short rationale string citing each node by its stable ID
 *   4. Returns a structured ReasoningExplanation carrying the citations and
 *      a machine-readable breakdown for the /wedm-reason skill to render.
 *
 * Exit-gate contract (U-P5-GNN-05):
 *   - Every explanation cites ≥1 real node ID
 *   - `wedm-xai-required` hook (future) passes on 20 test predictions
 *
 * @module engines/WEDMReasoningExplainEngine
 */

import { wedmNeighborQueryEngine, type NeighborQueryResult } from "./WEDMNeighborQueryEngine.js";
import type {
  LatticeMaterial,
  LatticeController,
  LatticeWire,
  WEDMLatticeNode,
} from "../schemas/wedmLatticeGraphSchema.js";

export interface ReasoningQuery {
  /** Cell coords we are explaining a prediction for. */
  mat: LatticeMaterial | string;
  mach?: LatticeController;
  wire?: LatticeWire;
  wireDiameterMm: number;
  thicknessMm: number;
  raTargetUm: number;
  peakCurrentA?: number;
  pulseOnUs?: number;
  pulseOffUs?: number;

  /** Optional model output being explained (one of these). */
  predictedRaUm?: number;
  predictedBreakProb?: number;
  predictedRecastUm?: number;

  /** Number of citations to include. Default 3. */
  topCitations?: number;
}

export interface ReasoningCitation {
  /** Lattice node id. */
  nodeId: string;
  /** Cosine similarity to the query. */
  similarity: number;
  /** One-phrase justification (e.g. "same material, adjacent thickness"). */
  evidence: string;
  /** Snapshot of salient node attributes for rendering. */
  attrs: {
    mat: LatticeMaterial;
    mach: LatticeController;
    wire: LatticeWire;
    thicknessMm: number;
    wireDiameterMm: number;
    raTargetUm: number;
  };
}

export interface ReasoningExplanation {
  /** Short prose suitable for logs or chat. */
  rationale: string;
  /** Structured citations (≥1 guaranteed when the lattice is non-empty). */
  citations: ReasoningCitation[];
  /** The top-cited node — useful for downstream `cited_node` hook payloads. */
  topCitation: ReasoningCitation | null;
  /** The 3 most common evidence tags across citations. */
  evidenceHistogram: Record<string, number>;
  /** What was explained. */
  queryEcho: {
    mat: string;
    mach: string;
    wire: string;
    thicknessMm: number;
    wireDiameterMm: number;
    raTargetUm: number;
    predictedRaUm?: number;
    predictedBreakProb?: number;
    predictedRecastUm?: number;
  };
}

const LATTICE_MATERIALS = new Set<LatticeMaterial>([
  "low_carbon_steel", "tool_steel", "stainless_steel", "hardened_steel",
  "aluminum", "copper", "brass", "tungsten_carbide", "titanium", "inconel",
  "graphite", "other",
]);

function resolveMaterial(m: string | LatticeMaterial): LatticeMaterial {
  const s = String(m || "").toLowerCase();
  if (LATTICE_MATERIALS.has(s as LatticeMaterial)) return s as LatticeMaterial;
  // Alias normalization (same map the predictors use)
  if (s === "steel") return "low_carbon_steel";
  if (["d2", "a2", "m2", "s7"].includes(s)) return "tool_steel";
  if (s === "h13") return "hardened_steel";
  if (["ss", "304", "316"].includes(s)) return "stainless_steel";
  if (["al", "6061", "7075"].includes(s)) return "aluminum";
  if (["wc", "carbide"].includes(s)) return "tungsten_carbide";
  if (["ti", "ti6al4v"].includes(s)) return "titanium";
  if (s === "in718") return "inconel";
  if (s === "cu") return "copper";
  return "other";
}

function classifyEvidence(query: {
  mat: LatticeMaterial;
  mach: LatticeController;
  wire: LatticeWire;
  wireDiameterMm: number;
  thicknessMm: number;
  raTargetUm: number;
}, node: WEDMLatticeNode): string {
  const parts: string[] = [];
  if (node.mat === query.mat) parts.push("same material");
  if (node.mach === query.mach) parts.push("same controller");
  if (node.wire === query.wire) parts.push("same wire");
  if (Math.abs(node.wireDiameterMm - query.wireDiameterMm) < 0.03) parts.push("matching wire Ø");
  const thRatio = Math.abs(Math.log2(node.thicknessMm / Math.max(0.1, query.thicknessMm)));
  if (thRatio < 0.5) parts.push("similar thickness");
  const raRatio = Math.abs(Math.log2(node.raTargetUm / Math.max(0.05, query.raTargetUm)));
  if (raRatio < 0.5) parts.push("similar Ra target");
  if (parts.length === 0) parts.push("cosine-similarity neighbor");
  return parts.join(", ");
}

function formatNum(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "?";
  return Number.parseFloat(x.toFixed(digits)).toString();
}

export class WEDMReasoningExplainEngine {
  /**
   * Produce a reasoning explanation for a cell / prediction. Returns a
   * structured result with ≥1 citation when the lattice is populated.
   */
  explain(q: ReasoningQuery): ReasoningExplanation {
    const mat = resolveMaterial(q.mat);
    const mach: LatticeController = q.mach ?? "fanuc";
    const wire: LatticeWire = q.wire ?? "brass";
    const topN = Math.max(1, Math.min(20, q.topCitations ?? 3));

    const queryEcho: ReasoningExplanation["queryEcho"] = {
      mat,
      mach,
      wire,
      thicknessMm: q.thicknessMm,
      wireDiameterMm: q.wireDiameterMm,
      raTargetUm: q.raTargetUm,
      predictedRaUm: q.predictedRaUm,
      predictedBreakProb: q.predictedBreakProb,
      predictedRecastUm: q.predictedRecastUm,
    };

    // Ensure lattice bound; silently fall through if still empty.
    if (wedmNeighborQueryEngine.size() === 0) {
      wedmNeighborQueryEngine.loadFromLattice();
    }
    if (wedmNeighborQueryEngine.size() === 0) {
      return {
        rationale:
          "Lattice unavailable; no neighbor citations could be generated. " +
          "Run `wedm_lattice_build` first, then retry.",
        citations: [],
        topCitation: null,
        evidenceHistogram: {},
        queryEcho,
      };
    }

    const neighbors: NeighborQueryResult[] = wedmNeighborQueryEngine.nearestForCell(
      {
        mat,
        mach,
        wire,
        wireDiameterMm: q.wireDiameterMm,
        thicknessMm: q.thicknessMm,
        raTargetUm: q.raTargetUm,
        peakCurrentA: q.peakCurrentA,
        pulseOnUs: q.pulseOnUs,
        pulseOffUs: q.pulseOffUs,
      },
      { k: topN, ef: Math.max(16, topN * 3) },
    );

    if (neighbors.length === 0) {
      return {
        rationale:
          `No analogues found for ${mat}/${mach}/${wire} @ ${formatNum(q.thicknessMm, 0)} mm, ` +
          `Ra ${formatNum(q.raTargetUm, 2)} µm.`,
        citations: [],
        topCitation: null,
        evidenceHistogram: {},
        queryEcho,
      };
    }

    const citations: ReasoningCitation[] = neighbors.map((n) => ({
      nodeId: n.nodeId,
      similarity: n.similarity,
      evidence: classifyEvidence(
        { mat, mach, wire, wireDiameterMm: q.wireDiameterMm, thicknessMm: q.thicknessMm, raTargetUm: q.raTargetUm },
        n.node,
      ),
      attrs: {
        mat: n.node.mat,
        mach: n.node.mach,
        wire: n.node.wire,
        thicknessMm: n.node.thicknessMm,
        wireDiameterMm: n.node.wireDiameterMm,
        raTargetUm: n.node.raTargetUm,
      },
    }));

    const evidenceHistogram: Record<string, number> = {};
    for (const c of citations) {
      for (const tag of c.evidence.split(",").map((s) => s.trim())) {
        evidenceHistogram[tag] = (evidenceHistogram[tag] ?? 0) + 1;
      }
    }

    const top = citations[0];
    const predPart =
      q.predictedRaUm !== undefined ? `Predicted Ra ${formatNum(q.predictedRaUm, 2)} µm. ` :
      q.predictedBreakProb !== undefined ? `Predicted break ${formatNum(100 * q.predictedBreakProb, 1)} %. ` :
      q.predictedRecastUm !== undefined ? `Predicted recast ${formatNum(q.predictedRecastUm, 1)} µm. ` :
      "";

    const rationale =
      `${predPart}Reasoning grounded in ${citations.length} lattice node(s). ` +
      `Top match: ${top.nodeId} (cosine ${formatNum(top.similarity, 3)}) — ${top.evidence}. ` +
      `${top.attrs.mat} / ${top.attrs.mach} / ${top.attrs.wire} at ` +
      `${formatNum(top.attrs.thicknessMm, 0)} mm, Ra ${formatNum(top.attrs.raTargetUm, 2)} µm.`;

    return {
      rationale,
      citations,
      topCitation: top,
      evidenceHistogram,
      queryEcho,
    };
  }
}

export const wedmReasoningExplainEngine = new WEDMReasoningExplainEngine();
