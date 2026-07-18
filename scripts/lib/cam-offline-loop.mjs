/**
 * cam-offline-loop.mjs — the OFFLINE closed-loop measurement primitive for CAM lathe generation.
 *
 * The self-improvement signal that needs NO live Fusion: take a part's GENERATED plan (from
 * cam-part-program-planner.planPartProgram) and the SAME part as JM actually programmed it
 * (normalized from a real .MIN corpus program), and score how faithfully generation reproduces
 * the real operation structure + sequence. The gap (missing/extra ops, sequence inversions) IS
 * the learning signal the optimizer trains against — "closed loop" without a machine in the loop.
 *
 * SCOPE (honest): this scores OP-STRUCTURE fidelity (family coverage + sequence), NOT final
 * cutting numbers — the generated plan carries physics-DELEGATED directives, not resolved
 * SFM/feed values (those are computed at generation time by prism_calc/whiskey). Param-level
 * fidelity is a follow-on once the generator emits physics-resolved numbers. We do NOT fabricate
 * a param score from directives (that would be a fake signal).
 *
 * Pure (no I/O). Corpus .MIN parsing lives in CAMFeatureExtractorEngine — this module consumes
 * an already-normalized reference op-list (no duplication, R8/dedup).
 */

/**
 * @param {object} generated  planner output: { ordered_ops: [{ family, ... }], ... }
 * @param {object} reference  JM-actual normalized: { ops: [{ family, ... }], partId? }
 * @returns {{ op_coverage:number, sequence_fidelity:number, score:number,
 *            matched_families:string[], missing_families:string[], extra_families:string[],
 *            notes:string[] }}
 *   op_coverage     — fraction of the families JM used that generation also produced (recall).
 *   sequence_fidelity — fraction of common families emitted in JM's relative order.
 *   score           — 0.7*op_coverage + 0.3*sequence_fidelity (coverage-weighted).
 *   missing_families — JM did it, generation did NOT (under-generation — the primary gap to learn).
 *   extra_families   — generation produced it, JM did NOT (over-generation OR a genuine optimization).
 */
export function scoreGeneratedVsCorpus(generated, reference) {
  if (!generated || !Array.isArray(generated.ordered_ops)) {
    throw new Error("scoreGeneratedVsCorpus: generated.ordered_ops[] is required");
  }
  if (!reference || !Array.isArray(reference.ops)) {
    throw new Error("scoreGeneratedVsCorpus: reference.ops[] is required");
  }

  const genSeq = generated.ordered_ops.map((o) => o.family).filter(Boolean);
  const refSeq = reference.ops.map((o) => o.family).filter(Boolean);
  const genSet = new Set(genSeq);
  const refSet = new Set(refSeq);

  const matched_families = [...refSet].filter((f) => genSet.has(f));
  const missing_families = [...refSet].filter((f) => !genSet.has(f));
  const extra_families = [...genSet].filter((f) => !refSet.has(f));

  // Coverage (recall vs JM's actual op set). Empty reference -> defined as 1 (nothing to miss),
  // but flagged in notes so an empty-reference can't silently read as a perfect score.
  const op_coverage = refSet.size === 0 ? 1 : matched_families.length / refSet.size;

  // Sequence fidelity = Kendall concordance over the COMMON families' FIRST-APPEARANCE order.
  // Robust to repeats/re-visits (a family appearing twice no longer fabricates an inversion — the
  // earlier adjacent-rank-with-last-wins-Map approach did, see the unchanged-fidelity R12 catch).
  const common = new Set(matched_families);
  const firstOrder = (seq) => {
    const out = [];
    const at = new Set();
    for (const f of seq) if (common.has(f) && !at.has(f)) { at.add(f); out.push(f); }
    return out;
  };
  const gOrd = firstOrder(genSeq);
  const rRank = new Map(firstOrder(refSeq).map((f, i) => [f, i]));
  let concordant = 0;
  let totalPairs = 0;
  const inversions = [];
  for (let i = 0; i < gOrd.length; i++) {
    for (let j = i + 1; j < gOrd.length; j++) {
      const A = gOrd[i], B = gOrd[j]; // generation puts A before B
      totalPairs++;
      if (rRank.get(A) < rRank.get(B)) concordant++; // reference agrees (A before B)
      else inversions.push({ before: A, after: B }); // reference has B before A (real inversion)
    }
  }
  const sequence_fidelity = totalPairs === 0 ? 1 : Number((concordant / totalPairs).toFixed(4));

  const score = Number((0.7 * op_coverage + 0.3 * sequence_fidelity).toFixed(4));

  const notes = [];
  if (refSet.size === 0) notes.push("reference has zero ops — coverage defaults to 1 (no signal); verify the corpus normalization");
  if (missing_families.length) notes.push(`under-generation: JM used ${missing_families.join(", ")} that generation omitted`);
  if (extra_families.length) notes.push(`over-generation: generation added ${extra_families.join(", ")} JM did not (verify: optimization vs error)`);
  if (sequence_fidelity < 1) notes.push("sequence inversion vs JM order — check LATHE_OP_ORDER ranks");

  return { op_coverage: Number(op_coverage.toFixed(4)), sequence_fidelity, score, matched_families, missing_families, extra_families, inversions, notes };
}

/**
 * Build a closed-loop outcome record for the training ledger (cam.jsonl). Pure — caller supplies
 * the timestamp (deterministic/testable, no real-clock dependence here).
 * @returns {object} the outcome record to append.
 */
export function buildLoopOutcome(partId, generated, reference, nowIso) {
  const s = scoreGeneratedVsCorpus(generated, reference);
  return {
    schemaVersion: "1.0.0",
    kind: "cam_offline_loop_outcome",
    partId: partId ?? null,
    atIso: nowIso,
    op_coverage: s.op_coverage,
    sequence_fidelity: s.sequence_fidelity,
    score: s.score,
    matched_families: s.matched_families,
    missing_families: s.missing_families,
    extra_families: s.extra_families,
    notes: s.notes,
    // the learning signal: families to teach the generator (under-gen) + to scrutinize (over-gen)
    learn_targets: { add: s.missing_families, review: s.extra_families },
  };
}

/**
 * Aggregate many outcomes into a corpus-level self-improvement report (what to fix first).
 * @param {object[]} outcomes  buildLoopOutcome records
 * @returns {{ count:number, mean_score:number, mean_coverage:number,
 *            top_missing:Array<[string,number]>, top_extra:Array<[string,number]> }}
 */
export function aggregateLoopOutcomes(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    return { count: 0, mean_score: 0, mean_coverage: 0, top_missing: [], top_extra: [] };
  }
  const tally = (key) => {
    const m = new Map();
    for (const o of outcomes) for (const f of o[key] || []) m.set(f, (m.get(f) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const mean = (key) => Number((outcomes.reduce((s, o) => s + (o[key] || 0), 0) / outcomes.length).toFixed(4));
  return {
    count: outcomes.length,
    mean_score: mean("score"),
    mean_coverage: mean("op_coverage"),
    top_missing: tally("missing_families"),
    top_extra: tally("extra_families"),
  };
}
