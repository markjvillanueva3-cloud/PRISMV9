/**
 * GraphImportanceEngine — slot-personalized graph node-importance via
 * the canonical PersonalizedPageRank algorithm (ALGO-SYNERGY-MS0/U-ALGO-RET-04).
 *
 * Engine-namespace wrapper that exposes PPR to the rest of PRISM via a stable
 * singleton, so callers (/system-viz semantic-zoom, /impact blast-radius,
 * SubagentStart presearch, AuthorityRankingEngine ranks, master-index Boost
 * channel) don't bind to the algorithm internals directly.
 *
 * Concrete consumers planned:
 *   • /system-viz semantic-zoom — seed PPR by current-slot domain anchor
 *   • /impact blast-radius — replace unweighted BFS with edge-weighted PPR
 *   • Ghost-roost confidence — replace degree-based with topology-aware PPR score
 *   • Master-index — provide a PPR channel for hybrid retrieval (future RRF fusion)
 *
 * This engine adds nothing to the math — it's the engine-namespace surface that
 * makes PPR discoverable in ENGINE_DIGEST and consumable via dispatcher actions.
 *
 * @module engines/GraphImportanceEngine
 * @since ALGO-SYNERGY-MS0 Phase 2 (2026-05-25, slot:tango)
 */

import { PersonalizedPageRank } from "../algorithms/PersonalizedPageRank.js";
import type {
  GraphInput,
  PPRInput,
  PPROutput,
  PPRRankedNode,
} from "../algorithms/PersonalizedPageRank.js";

export type SlotDomain =
  | "mill"
  | "lathe"
  | "wedm"
  | "cad"
  | "cam"
  | "machining-knowhow"
  | "erp"
  | "post-processor"
  | "speed-feed"
  | "print-to-program"
  | "prism-academy"
  | "misc"
  | "database"
  | "any";

export interface RankByTaskInput {
  graph: GraphInput;
  /** Anchor nodes for this query (typically task-keyword matches + active dispatcher nodes). */
  anchors: ReadonlyArray<string>;
  /** Optional slot-domain weighting; nodes tagged for this domain receive an additional seed boost. */
  slotDomain?: SlotDomain;
  /**
   * Optional per-node domain map (nodeId → SlotDomain). When provided alongside
   * `slotDomain`, nodes matching the slot receive a 5× seed boost relative to anchors.
   */
  nodeDomains?: Readonly<Record<string, SlotDomain>>;
  /** Number of results to return (default 25). */
  topK?: number;
  /** Damping factor; default 0.85 (standard PageRank). */
  damping?: number;
}

export interface RankByTaskOutput extends PPROutput {
  /** Effective seed used (after slot-domain boost) — exposed for traceability. */
  effectiveSeed: Record<string, number>;
}

export class GraphImportanceEngine {
  /**
   * Vanilla PageRank over a graph (uniform seed). Useful for "what's important
   * globally" — equivalent to the classical Page-Brin formulation.
   */
  rankGlobal(input: { graph: GraphInput; topK?: number; damping?: number }): PPROutput {
    return PersonalizedPageRank.calculate({
      graph: input.graph,
      topK: input.topK ?? 50,
      damping: input.damping ?? 0.85,
    });
  }

  /**
   * Seeded PageRank — topic/task-personalized importance. Pass anchor nodes
   * (e.g., a current task's keyword matches) and the walker concentrates mass
   * in their neighborhood.
   */
  rankBySeed(input: PPRInput): PPROutput {
    return PersonalizedPageRank.calculate(input);
  }

  /**
   * Slot-aware ranker for /system-viz + /impact + presearch.
   *
   * Construction of the seed vector:
   *   - Each anchor node receives weight 1.0.
   *   - If `slotDomain` + `nodeDomains` are supplied, every node tagged with
   *     the active slot's domain receives an additional 5× weight (boost).
   *     This is what makes the SAME graph render with different important
   *     subtrees for different slots — sierra sees viz infra nodes weighted,
   *     india sees post-processor nodes weighted, etc.
   *   - Final seed L1-normalized by PPR.
   */
  rankByTask(input: RankByTaskInput): RankByTaskOutput {
    const seed: Record<string, number> = {};
    for (const a of input.anchors) seed[a] = (seed[a] ?? 0) + 1;

    if (input.slotDomain && input.slotDomain !== "any" && input.nodeDomains) {
      const SLOT_BOOST = 5;
      for (const [nodeId, domain] of Object.entries(input.nodeDomains)) {
        if (domain === input.slotDomain) {
          seed[nodeId] = (seed[nodeId] ?? 0) + SLOT_BOOST;
        }
      }
    }

    const out = PersonalizedPageRank.calculate({
      graph: input.graph,
      seed,
      topK: input.topK ?? 25,
      damping: input.damping ?? 0.85,
    });

    return { ...out, effectiveSeed: seed };
  }

  /**
   * Blast-radius scorer for /impact — given a "changed" node, returns the set
   * of nodes most likely to be affected, ranked by PPR mass.
   *
   * This is the topology-aware replacement for the current unweighted BFS in
   * /impact. The 0.15 default damping (α=0.85) means most mass stays within
   * 2-3 hops of the seed — matching the "real blast radius" of a code change.
   */
  blastRadius(input: {
    graph: GraphInput;
    changedNode: string;
    topK?: number;
    /** Lower damping = mass spreads further from seed. Default 0.5 (mid-range). */
    damping?: number;
  }): PPRRankedNode[] {
    const out = PersonalizedPageRank.calculate({
      graph: input.graph,
      seed: [input.changedNode],
      topK: input.topK ?? 30,
      damping: input.damping ?? 0.5,
    });
    return out.topK;
  }
}

export const graphImportanceEngine = new GraphImportanceEngine();
