/**
 * SpatialAddressBookEngine -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05 (slot:sierra)
 *
 * A canonical-node-id ADDRESS BOOK so N agents sharing a fixed spatial layout
 * coordinate by node-id mention instead of paraphrased text. When every agent
 * references the same `eng.mill` instead of "the mill engine" / "milling module"
 * / "the mill galaxy", coordination collapses from O(N^2) paraphrase reconciliation
 * to O(1) node-id lookup (the spec's "locked viz coordinates as shared address space").
 *
 * Composes (does NOT duplicate):
 *   - GraphRAGRetrievalEngine (U-GAC02) -- reuses its mtime-cached find-cache loader
 *     (`loadNodes`) and `tokenize`; the find-cache (id/label/info/layer) IS the
 *     canonical address space. No second 65MB loader.
 *
 * Resolution ladder (resolveAlias):
 *   exact-id  -> the text already IS a canonical id (confidence 1.0)
 *   exact-label -> unique case-insensitive label match (0.95); >1 match -> ambiguous
 *   fuzzy     -> token-overlap rank over id+label; clear winner -> fuzzy (graded),
 *                near-tie -> ambiguous (return candidates), nothing -> unknown
 *
 * @engine SpatialAddressBookEngine
 * @milestone GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05
 * @classification STANDARD (text resolution over the graph node set, no physics)
 */
import { graphRAGRetrievalEngine, type FindCacheNode } from "./GraphRAGRetrievalEngine.js";

export type ResolveMethod = "exact-id" | "exact-label" | "fuzzy" | "ambiguous" | "unknown";

export interface ResolveCandidate {
  id: string;
  label?: string;
  layer?: string;
  score: number;
}

export interface ResolveResult {
  query: string;
  nodeId: string | null;
  confidence: number; // 0..1
  method: ResolveMethod;
  candidates: ResolveCandidate[];
}

export interface ResolveOpts {
  /** Inject the node set (hermetic tests) instead of loading the find-cache. */
  nodes?: FindCacheNode[];
  /** Override the find-cache path (tests / non-default deployments). */
  findCachePath?: string;
  /** Max candidates returned for ambiguous/fuzzy. Default 5. */
  maxCandidates?: number;
  /** Min fuzzy score (0..1) to consider a match at all. Default 0.34. */
  minFuzzy?: number;
  /** Relative margin by which the top fuzzy hit must beat the second to NOT be ambiguous. Default 0.15. */
  ambiguityMargin?: number;
}

const DEFAULT_MAX_CANDIDATES = 5;
const DEFAULT_MIN_FUZZY = 0.34;
const DEFAULT_AMBIGUITY_MARGIN = 0.15;
const EXACT_LABEL_CONFIDENCE = 0.95;
// fuzzy confidence is the raw overlap score clamped into this band so a fuzzy hit
// is never reported as more certain than an exact-label match.
const FUZZY_CONFIDENCE_CEIL = 0.9;

export class SpatialAddressBookEngine {
  private loadCanonical(opts: ResolveOpts): FindCacheNode[] {
    return opts.nodes ?? graphRAGRetrievalEngine.loadNodes(opts.findCachePath);
  }

  /** True iff `id` is a canonical node id in the address space (exact id match). */
  isCanonical(id: string, opts: ResolveOpts = {}): boolean {
    if (typeof id !== "string" || id.trim() === "") return false;
    const nodes = this.loadCanonical(opts);
    const t = id.trim();
    return nodes.some((n) => n.id === t);
  }

  /**
   * Resolve a free-text alias / paraphrase to a single canonical node-id (or a
   * candidate list when ambiguous). Throws on a malformed (empty / non-string) alias.
   */
  resolveAlias(text: string, opts: ResolveOpts = {}): ResolveResult {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("SpatialAddressBookEngine.resolveAlias: alias must be a non-empty string");
    }
    const maxCandidates = opts.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
    const minFuzzy = opts.minFuzzy ?? DEFAULT_MIN_FUZZY;
    const margin = opts.ambiguityMargin ?? DEFAULT_AMBIGUITY_MARGIN;
    const nodes = this.loadCanonical(opts);
    const q = text.trim();
    const qLower = q.toLowerCase();

    // 1) exact id
    const idHit = nodes.find((n) => n.id === q);
    if (idHit) {
      return { query: text, nodeId: idHit.id, confidence: 1, method: "exact-id", candidates: [this.cand(idHit, 1)] };
    }

    // 2) exact label (case-insensitive)
    const labelHits = nodes.filter((n) => (n.label ?? "").toLowerCase() === qLower);
    if (labelHits.length === 1) {
      return {
        query: text,
        nodeId: labelHits[0].id,
        confidence: EXACT_LABEL_CONFIDENCE,
        method: "exact-label",
        candidates: [this.cand(labelHits[0], EXACT_LABEL_CONFIDENCE)],
      };
    }
    if (labelHits.length > 1) {
      return {
        query: text,
        nodeId: null,
        confidence: 0,
        method: "ambiguous",
        candidates: labelHits.slice(0, maxCandidates).map((n) => this.cand(n, EXACT_LABEL_CONFIDENCE)),
      };
    }

    // 3) fuzzy: token overlap on id + label, with a small substring boost
    const qTokens = graphRAGRetrievalEngine.tokenize(text);
    if (qTokens.length === 0) {
      return { query: text, nodeId: null, confidence: 0, method: "unknown", candidates: [] };
    }
    const qSet = new Set(qTokens);
    const scored: ResolveCandidate[] = [];
    for (const n of nodes) {
      const hay = `${n.id} ${n.label ?? ""}`.toLowerCase();
      const hayTokens = graphRAGRetrievalEngine.tokenize(hay);
      if (hayTokens.length === 0) continue;
      let overlap = 0;
      for (const t of new Set(hayTokens)) if (qSet.has(t)) overlap++;
      if (overlap === 0) continue;
      // base = fraction of the QUERY tokens matched (so a short precise alias scores high)
      let score = overlap / qSet.size;
      if (hay.includes(qLower)) score = Math.min(1, score + 0.25); // whole-phrase substring boost
      scored.push(this.cand(n, score));
    }
    if (scored.length === 0) {
      return { query: text, nodeId: null, confidence: 0, method: "unknown", candidates: [] };
    }
    // ASCII tiebreak (NOT localeCompare -- a locale-sensitive sort, e.g. tr-TR i/I,
    // would make two agents on different locales disagree, breaking the determinism
    // invariant that lets concurrent resolvers converge without coordination).
    scored.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const top = scored[0];
    if (top.score < minFuzzy) {
      return { query: text, nodeId: null, confidence: 0, method: "unknown", candidates: scored.slice(0, maxCandidates) };
    }
    const second = scored[1];
    // near-tie -> ambiguous (the operator/agent must disambiguate)
    if (second && top.score - second.score < margin) {
      return {
        query: text,
        nodeId: null,
        confidence: 0,
        method: "ambiguous",
        candidates: scored.slice(0, maxCandidates),
      };
    }
    return {
      query: text,
      nodeId: top.id,
      confidence: Math.min(FUZZY_CONFIDENCE_CEIL, top.score),
      method: "fuzzy",
      candidates: scored.slice(0, maxCandidates),
    };
  }

  /** Resolve a batch of aliases (handoff-canonicalization). Skips malformed entries (records them as unknown). */
  resolveMany(aliases: string[], opts: ResolveOpts = {}): ResolveResult[] {
    if (!Array.isArray(aliases)) {
      throw new Error("SpatialAddressBookEngine.resolveMany: aliases must be an array");
    }
    // Load once, share across every alias (avoid N find-cache loads).
    const nodes = this.loadCanonical(opts);
    const shared: ResolveOpts = { ...opts, nodes };
    return aliases.map((a) => {
      if (typeof a !== "string" || a.trim() === "") {
        return { query: String(a), nodeId: null, confidence: 0, method: "unknown" as const, candidates: [] };
      }
      return this.resolveAlias(a, shared);
    });
  }

  private cand(n: FindCacheNode, score: number): ResolveCandidate {
    return { id: n.id, label: n.label, layer: n.layer, score: Number(score.toFixed(4)) };
  }
}

export { SpatialAddressBookEngine as _SpatialAddressBookEngine };
export const spatialAddressBookEngine = new SpatialAddressBookEngine();
