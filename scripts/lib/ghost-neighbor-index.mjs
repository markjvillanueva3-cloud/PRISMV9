#!/usr/bin/env node
/**
 * ghost-neighbor-index.mjs -- GHOST-AWARE neighbor index for the GNN tier-5 ghost-holdout
 * head-to-head (slot:india 2026-06-21). The first (graph-free) piece of
 * U-GNN-GHOST-HOLDOUT-HEADTOHEAD.
 *
 * WHY: the shipped `buildNeighborIndex` (measure-neighbor-vote-loo.mjs) only links engines
 * where BOTH endpoints are in `stemToClass` (classifiable/wired) -- its `link()` guard
 * requires both classifiable. The deploy task classifies UNWIRED ghosts, which are NOT in
 * stemToClass, so their ghost->wired edges get dropped -- buildNeighborIndex cannot serve
 * the neighbor-vote arm of the ghost head-to-head. This builds the asymmetric index the
 * task needs: Map<ghostStem, Map<wiredStem, weight>> -- the GHOST is the queryable target
 * (no label needed), the WIRED engine is the voting reference (its single-dispatcher label
 * is the vote). The shipped `neighborVote(ghostStem, ghostIndex, stemToClass)` then works
 * unchanged: it reads only the neighbors' classes from stemToClass; the ghost's own label
 * never enters (the ghost is not its own neighbor and is not in stemToClass).
 *
 * LEAK DISCIPLINE (india soul): leak-free by construction -- only ghost->WIRED links are
 * stored; a wired engine's dispatcher label is a real codebase fact, and the unwired ghost
 * has no dispatcher label of its own to leak. Same homophilous leak-free edge set as the
 * arc (engine_import + shared_schema + shared_test; physics + action-engine excluded by the
 * caller). ghost->ghost and wired->wired links are intentionally NOT stored (a ghost->ghost
 * edge has no usable label; wired->wired is the wired-set arm, handled elsewhere).
 *
 * Pure-export contract (for tests): buildGhostNeighborIndex, ghostNeighborCoverage.
 *
 * Pure -- no I/O. The caller reads the edge augmentations + the ghost-stem set + stemToClass.
 */
import { extractStem } from "../measure-edge-class-homophily.mjs";

/**
 * Normalize an iterable of stems into a lowercased Set. Defensive (scrutiny P2): edge
 * stems are lowercased by extractStem and stemToClass keys by buildStemToClass, so the
 * ghost roster must be lowercased too or it silently fails to match (an uppercase ghost
 * stem links 0). Idempotent for already-lowercased callers. Non-iterable -> empty Set.
 */
function toLowerStemSet(stems) {
  const out = new Set();
  if (!stems || typeof stems[Symbol.iterator] !== "function") return out;
  for (const s of stems) if (typeof s === "string" && s) out.add(s.toLowerCase());
  return out;
}

/**
 * Build Map<ghostStem, Map<wiredStem, weight>> from leak-free edge groups. For each edge:
 *   direct (both endpoints engines): link iff exactly one endpoint is a ghost AND the other
 *     is wired (in stemToClass). ghost->ghost / wired->wired are skipped.
 *   shared (engine <-> intermediate): group engines by the non-engine intermediate; link
 *     every GHOST touching an intermediate to every WIRED engine also touching it.
 * Weights accumulate (a pair linked by multiple types/intermediates sums weightPerEdge).
 * A stem that is BOTH a ghost and wired is treated as WIRED (it has a real label -> not a
 * ghost target); such a collision should not occur (a ghost is unwired by definition).
 * Pure.
 *
 * @param {Array<{mode:string, edges:Array<{from:string,to:string}>}>} groups
 * @param {Set<string>|Iterable<string>} ghostStems  lowercased unwired-ghost stems (targets)
 * @param {Map<string,string>} stemToClass  wired engines (voting references)
 * @param {number} [weightPerEdge=1]
 * @returns {Map<string, Map<string, number>>}
 */
export function buildGhostNeighborIndex(groups, ghostStems, stemToClass, weightPerEdge = 1) {
  const wired = stemToClass instanceof Map ? stemToClass : new Map();
  const ghosts = toLowerStemSet(ghostStems); // defensive lowercase (matches edge/stemToClass casing)
  const w = Number.isFinite(weightPerEdge) && weightPerEdge > 0 ? weightPerEdge : 1;
  const idx = new Map();

  // A stem with a real wired label is never a ghost target (wired precedence).
  const isGhost = (s) => ghosts.has(s) && !wired.has(s);
  const isWired = (s) => wired.has(s);

  const link = (ghost, wiredStem) => {
    if (ghost === wiredStem) return; // defensive: never self-link
    if (!idx.has(ghost)) idx.set(ghost, new Map());
    const m = idx.get(ghost);
    m.set(wiredStem, (m.get(wiredStem) || 0) + w);
  };

  for (const g of Array.isArray(groups) ? groups : []) {
    const edges = g && Array.isArray(g.edges) ? g.edges : [];
    if (g && g.mode === "direct") {
      for (const e of edges) {
        if (!e || typeof e !== "object") continue;
        const a = extractStem(e.from);
        const b = extractStem(e.to);
        if (!a || !b || a === b) continue;
        // exactly one ghost + one wired -> ghost gets the wired neighbor.
        if (isGhost(a) && isWired(b)) link(a, b);
        else if (isGhost(b) && isWired(a)) link(b, a);
      }
    } else {
      // shared-intermediate: collect ghost + wired engines per intermediate, then cross-link.
      const byIntermediate = new Map(); // interId -> { ghosts:Set, wired:Set }
      for (const e of edges) {
        if (!e || typeof e !== "object") continue;
        const fromStem = extractStem(e.from);
        const toStem = extractStem(e.to);
        let engStem;
        let interId;
        if (fromStem && !toStem) { engStem = fromStem; interId = e.to; }
        else if (toStem && !fromStem) { engStem = toStem; interId = e.from; }
        else continue;
        if (typeof interId !== "string" || !interId) continue;
        let slot = byIntermediate.get(interId);
        if (!slot) { slot = { ghosts: new Set(), wired: new Set() }; byIntermediate.set(interId, slot); }
        if (isGhost(engStem)) slot.ghosts.add(engStem);
        else if (isWired(engStem)) slot.wired.add(engStem);
      }
      for (const { ghosts: gs, wired: ws } of byIntermediate.values()) {
        if (gs.size === 0 || ws.size === 0) continue;
        for (const ghost of gs) for (const wiredStem of ws) link(ghost, wiredStem);
      }
    }
  }
  return idx;
}

/**
 * Coverage of a ghost-aware index over a ghost-stem set: how many ghosts have >=1 wired
 * neighbor (so the neighbor-vote arm can classify them), + the average wired-neighbor count
 * over the COVERED ghosts. The graph-free validation of the index (no 542MB graph needed).
 * Returns { total, covered, coverage, avgNeighbors }. Pure.
 *
 * @param {Map<string, Map<string, number>>} index
 * @param {Set<string>|Iterable<string>} ghostStems
 */
export function ghostNeighborCoverage(index, ghostStems) {
  const idx = index instanceof Map ? index : new Map();
  const ghosts = toLowerStemSet(ghostStems); // index keys are lowercased -> match the roster
  const total = ghosts.size;
  let covered = 0;
  let neighborSum = 0;
  for (const g of ghosts) {
    const nbrs = idx.get(g);
    if (nbrs instanceof Map && nbrs.size > 0) {
      covered++;
      neighborSum += nbrs.size;
    }
  }
  return {
    total,
    covered,
    coverage: total > 0 ? covered / total : null,
    avgNeighbors: covered > 0 ? neighborSum / covered : null,
  };
}
