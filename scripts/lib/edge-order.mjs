/**
 * edge-order.mjs — RAG-UPGRADE-MS0 / U-RAG-4 (2026-05-22, slot golf).
 *
 * "Lost in the middle": LLMs attend most strongly to the START and END of
 * their context window and skim the middle (Liu et al. 2023; echoed in the
 * 2026 RAG research and concept #7 of the source thread). When a retrieval
 * inject hook emits a score-ranked top-K block, dumping it in plain
 * best→worst order buries ranks 2-3 in the low-attention middle.
 *
 * edgeOrder() reorders a best→worst list so the highest-ranked items land at
 * BOTH edges of the block and the weakest items fall in the middle:
 *
 *   input  [1,2,3,4,5,6]   (1 = best)
 *   output [1,3,5,6,4,2]   → rank 1 first, rank 2 last, weakest in the middle
 *
 * Pure, stable, total — every input element appears exactly once, no value
 * is dropped or duplicated. Works on primitives or objects alike.
 */

/**
 * Reorder a score-DESCENDING list so the top-ranked items sit at both edges.
 * The input MUST already be sorted best→worst. Returns a new array; the
 * input is not mutated. Non-array input → []. Lists of length ≤2 are
 * returned as-is (no middle exists to protect).
 *
 * @template T
 * @param {readonly T[]} ranked - items sorted best (index 0) → worst
 * @returns {T[]} a new edge-weighted ordering
 */
export function edgeOrder(ranked) {
  if (!Array.isArray(ranked)) return [];
  const n = ranked.length;
  if (n <= 2) return ranked.slice();
  const head = [];
  const tail = [];
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) head.push(ranked[i]); // ranks 1,3,5,… → front, in order
    else tail.push(ranked[i]);             // ranks 2,4,6,… → back
  }
  // tail is [rank2, rank4, rank6, …]; the block must read [… ,6,4,2] so the
  // best of the tail (rank 2) lands at the very end. Reverse it.
  tail.reverse();
  return head.concat(tail);
}

/**
 * Convenience: take a list, sort it best→worst by a numeric score selector,
 * then edge-order it. `scoreOf` must return a number; higher = better.
 *
 * @template T
 * @param {readonly T[]} items
 * @param {(item: T) => number} scoreOf
 * @returns {T[]}
 */
export function edgeOrderByScore(items, scoreOf) {
  if (!Array.isArray(items)) return [];
  if (typeof scoreOf !== "function") return items.slice();
  const ranked = items
    .slice()
    .sort((a, b) => (Number(scoreOf(b)) || 0) - (Number(scoreOf(a)) || 0));
  return edgeOrder(ranked);
}
