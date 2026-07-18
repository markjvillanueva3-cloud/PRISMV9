/**
 * cam-corpus-order-learn.mjs — learn the lathe operation ORDER from the corpus's real pairwise
 * preferences, so PRISM's LATHE_OP_ORDER is DERIVED from 16,558 JM programs instead of hand-set.
 * This is the offline loop's "self-improve" step: the sequence inversions the oracle surfaced
 * become a data-driven order recommendation.
 *
 * Method (Copeland-style, robust to JM's variability):
 *   - For each program's family sequence (consecutive-deduped), tally every ordered pair (i<j).
 *   - For each unordered pair {X,Y}: which order JM uses more, with what confidence + support.
 *   - Copeland score per family = (#pairs it dominates) - (#pairs it loses), counting only pairs
 *     with enough support + confidence (so a 1-program fluke can't flip the order).
 *   - suggestedOrder = families by Copeland score desc — the corpus's consensus op order.
 *   - compareToLatheOrder flags where the CURRENT LATHE_OP_ORDER contradicts a high-confidence
 *     JM-dominant pair (the refinement candidates).
 *
 * Pure (no I/O). Does NOT overfit: refinement candidates require minSupport + minConfidence.
 */

/** consecutive de-dupe so multi-pass repeats don't inflate pair counts */
function dedupe(seq) {
  return seq.filter((f, i) => i === 0 || f !== seq[i - 1]);
}

/**
 * @param {string[][]} refSequences  per-program ordered family lists (JM's actual order)
 * @returns {{ pairs:Array<{a:string,b:string,ab:number,ba:number,total:number,confidence:number,dominant:[string,string]}>,
 *            copeland:Record<string,number>, families:string[], suggestedOrder:string[] }}
 */
export function learnPairwiseOrder(refSequences) {
  if (!Array.isArray(refSequences)) throw new Error("learnPairwiseOrder: refSequences[][] is required");
  // counts[a][b] = # programs where family a appears before family b
  const counts = new Map();
  const families = new Set();
  const bump = (a, b) => {
    if (!counts.has(a)) counts.set(a, new Map());
    const m = counts.get(a);
    m.set(b, (m.get(b) || 0) + 1);
  };
  for (const rawSeq of refSequences) {
    if (!Array.isArray(rawSeq)) continue;
    const seq = dedupe(rawSeq.filter(Boolean));
    for (const f of seq) families.add(f);
    // each UNORDERED pair counted once per program (use set of families present, ordered by first-seen)
    const firstSeen = new Map();
    seq.forEach((f, i) => { if (!firstSeen.has(f)) firstSeen.set(f, i); });
    const uniq = [...firstSeen.keys()];
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        // uniq is in first-seen order, so uniq[i] appeared before uniq[j] in THIS program
        bump(uniq[i], uniq[j]);
      }
    }
  }

  const famList = [...families];
  const pairs = [];
  const copeland = Object.fromEntries(famList.map((f) => [f, 0]));
  for (let i = 0; i < famList.length; i++) {
    for (let j = i + 1; j < famList.length; j++) {
      const X = famList[i], Y = famList[j];
      const ab = counts.get(X)?.get(Y) || 0; // X before Y
      const ba = counts.get(Y)?.get(X) || 0; // Y before X
      const total = ab + ba;
      if (total === 0) continue;
      const confidence = Number((Math.max(ab, ba) / total).toFixed(4));
      const dominant = ab >= ba ? [X, Y] : [Y, X];
      pairs.push({ a: X, b: Y, ab, ba, total, confidence, dominant });
      // Copeland: winner +1, loser -1 (ties: no change)
      if (ab > ba) { copeland[X]++; copeland[Y]--; }
      else if (ba > ab) { copeland[Y]++; copeland[X]--; }
    }
  }

  const suggestedOrder = [...famList].sort((p, q) =>
    (copeland[q] - copeland[p]) || p.localeCompare(q)
  );
  return { pairs, copeland, families: famList, suggestedOrder };
}

/**
 * Flag where the CURRENT LATHE_OP_ORDER contradicts a high-confidence JM-dominant pair.
 * @param {object} learned  learnPairwiseOrder result
 * @param {Record<string,number>} latheOrder  current LATHE_OP_ORDER (family -> rank)
 * @param {{minSupport?:number, minConfidence?:number}} opts
 * @returns {Array<{x:string,y:string,jm_dominant:[string,string],jm_confidence:number,jm_support:number,
 *           prism_x_rank:number,prism_y_rank:number,recommendation:string}>}
 *   one entry per pair where JM strongly prefers X-before-Y but LATHE_OP_ORDER ranks X AFTER Y.
 */
export function compareToLatheOrder(learned, latheOrder, opts = {}) {
  const minSupport = opts.minSupport ?? 20;
  const minConfidence = opts.minConfidence ?? 0.7;
  const out = [];
  for (const p of learned.pairs) {
    if (p.total < minSupport || p.confidence < minConfidence) continue;
    const [first, second] = p.dominant; // JM does `first` before `second`
    const rFirst = latheOrder[first];
    const rSecond = latheOrder[second];
    if (rFirst === undefined || rSecond === undefined) continue;
    if (rFirst > rSecond) {
      // PRISM ranks `first` AFTER `second` — contradicts JM's dominant order.
      out.push({
        x: first, y: second,
        jm_dominant: p.dominant,
        jm_confidence: p.confidence,
        jm_support: p.total,
        prism_x_rank: rFirst,
        prism_y_rank: rSecond,
        recommendation: `move '${first}' before '${second}' in LATHE_OP_ORDER (JM does so in ${Math.round(p.confidence * 100)}% of ${p.total} programs)`,
      });
    }
  }
  // strongest signals first (support * confidence)
  return out.sort((a, b) => (b.jm_support * b.jm_confidence) - (a.jm_support * a.jm_confidence));
}
