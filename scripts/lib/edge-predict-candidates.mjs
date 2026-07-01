// scripts/lib/edge-predict-candidates.mjs
//
// BLACKWELL-AI-MS0 / MS3 U-GNN-EDGE-PREDICT (slot:india) — PATH-A candidate generation.
//
// The graph-COUPLED half of edge-prediction: turns the live knowledge graph into a
// list of CANDIDATE edges (node pairs NOT already linked) for the pure core
// (edge-predict.mjs) to score + rank. Kept SEPARATE from the core so the core stays
// graph-independent (the coupling — id-prefix node typing + the existing-edge file —
// is isolated here). Operator decision 2026-06-08: build path-A (knowledge /
// cross-substrate edges over the existing 543-node embedding set) now; path-B
// (engine→dispatcher, needs a regenerated embedding set incl eng/disp nodes) after.
//
// "Missing edge" = a (source, target) pair where both nodes ARE embedded but the
// pair is NOT in the existing cross-substrate edge set. High cosine similarity of
// their embeddings ⇒ a likely-but-undocumented relationship (e.g. a ghost that
// should be documented-by a wiki/memory node). The score is the core's sigmoid(cosine).
//
// NODE TYPING is by id PREFIX (the segment before the first '.'): the live ids are
// `wiki.*`, `vault.*`, `ghost.*`, `memory_reference.*`, `memory_feedback.*`,
// `tribal-tip.*`, `reg.*`, `ms-envelope.*`, … (the knowledge-corpus graph; it has NO
// `eng.*`/`disp.*` nodes — that is the path-B regen gap). Edge typing is a coarse
// prefix, sufficient to scope source/target type filters.
//
// Karpathy 5-step edges handled: empty map, no nodes of a requested type, every
// candidate already-existing (→ []), self-pair, a candidate explosion (hard
// maxCandidates cap with a SURFACED `capped` flag — never a silent truncation, R12),
// malformed existing-edge file (fail-soft → empty existing set).

import { readFileSync } from "node:fs";

const DEFAULT_MAX_CANDIDATES = 500_000; // safety bound; the 543-node set is far under this

/** Undirected-aware edge key for set membership. */
export const edgeKey = (u, v) => `${u}\t${v}`;

/**
 * Coarse node type = the id segment before the first '.'. `wiki.architecture.x` →
 * "wiki"; `memory_reference.foo` → "memory_reference"; a bare id (no dot) → itself;
 * a leading-dot id (".foo") → "" (empty type — never matches an explicit type filter,
 * so it is silently excluded from type-filtered runs and included only in all×all).
 * @param {string} id @returns {string}
 */
export function nodeType(id) {
  if (typeof id !== "string" || id.length === 0) return "unknown";
  const dot = id.indexOf(".");
  return dot === -1 ? id : id.slice(0, dot);
}

/**
 * Load the existing cross-substrate edges into a Set of BOTH-direction keys, so a
 * candidate is excluded whether the existing edge points either way (the knowledge
 * relationships we predict are undirected for exclusion purposes). Reads the
 * `newEdges[]` of state/shared/system-viz/cross-substrate-edges-augmentation.json
 * (shape `{from,to,type,...}`). Fail-soft: a missing/malformed file → empty set
 * (predict against everything) rather than throwing — but returns `{set, edgeCount,
 * ok}` so the caller can SEE whether exclusion data was actually loaded (R12: an
 * empty set from a read failure is NOT the same as "no existing edges").
 * @param {string} path
 * @param {(p:string,enc:string)=>string} [readFile]
 * @returns {{ set: Set<string>, edgeCount: number, ok: boolean }}
 */
export function loadExistingEdgeKeys(path, readFile = readFileSync) {
  const set = new Set();
  let edgeCount = 0;
  let ok = false;
  try {
    const j = JSON.parse(readFile(path, "utf8"));
    const edges = Array.isArray(j?.newEdges) ? j.newEdges : [];
    for (const e of edges) {
      if (e && typeof e.from === "string" && typeof e.to === "string") {
        set.add(edgeKey(e.from, e.to));
        set.add(edgeKey(e.to, e.from));
        edgeCount++; // counts rows processed, NOT distinct edges — a duplicate newEdges row inflates it (diagnostic only; the Set dedups membership so exclusion stays correct)
      }
    }
    ok = true;
  } catch {
    // missing/malformed → empty set, ok stays false so the caller knows exclusion is off
  }
  return { set, edgeCount, ok };
}

/**
 * Generate candidate (source, target) edge pairs from an embeddings Map for the
 * core to score. Pairs every source-type node with every target-type node, EXCLUDING
 * self-pairs and any pair already in `existingEdges`. Returns the candidate list plus
 * honest accounting (srcCount/tgtCount/excludedExisting/capped) — never silently
 * truncates: hitting `maxCandidates` sets `capped=true` so the caller can report it.
 * @param {Map<string, number[]>} embeddings
 * @param {{ sourceTypes?: string[], targetTypes?: string[], existingEdges?: Set<string>, maxCandidates?: number }} [opts]
 * @returns {{ candidates: Array<[string,string]>, srcCount:number, tgtCount:number, excludedExisting:number, capped:boolean }}
 */
export function generateCandidates(embeddings, opts = {}) {
  const {
    sourceTypes,
    targetTypes,
    existingEdges = new Set(),
    maxCandidates = DEFAULT_MAX_CANDIDATES,
  } = opts;
  const empty = { candidates: [], srcCount: 0, tgtCount: 0, excludedExisting: 0, capped: false };
  if (!(embeddings instanceof Map)) return empty;

  const srcSet = Array.isArray(sourceTypes) ? new Set(sourceTypes) : null;
  const tgtSet = Array.isArray(targetTypes) ? new Set(targetTypes) : null;
  const ids = [...embeddings.keys()];
  const srcs = srcSet ? ids.filter((i) => srcSet.has(nodeType(i))) : ids;
  const tgts = tgtSet ? ids.filter((i) => tgtSet.has(nodeType(i))) : ids;

  const candidates = [];
  let excludedExisting = 0;
  let capped = false;
  outer: for (const u of srcs) {
    for (const v of tgts) {
      if (u === v) continue;
      if (existingEdges.has(edgeKey(u, v))) {
        // DIRECTIONAL count: candidates are ordered pairs, so in an all×all run (no
        // type filter) ONE undirected existing edge suppresses BOTH (u,v) and (v,u)
        // and increments this twice. That is honest — excludedExisting counts
        // candidates removed, not distinct edges. Type-filtered runs where source
        // type ≠ target type generate each pair one way only, so no doubling there.
        excludedExisting++;
        continue;
      }
      candidates.push([u, v]);
      if (candidates.length >= maxCandidates) {
        capped = true;
        break outer;
      }
    }
  }
  return { candidates, srcCount: srcs.length, tgtCount: tgts.length, excludedExisting, capped };
}

export { DEFAULT_MAX_CANDIDATES };
