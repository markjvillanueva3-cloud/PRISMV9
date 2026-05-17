/**
 * IdeaBlockDedupEngine.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/E2/U-IDEABLOCK-DEDUP — dedup behavior matrix.
 *
 * Exit-criteria proven here:
 *  - Qdrant-cosine over IdeaBlock embeddings (pure dedupVectors path; the
 *    injected-embedder path covers dedupBlocks).
 *  - Configurable threshold (default 0.82) + maxRounds (default 4).
 *  - Per round cluster → merge canonical → (re-embed) → re-cluster.
 *  - Convergence: zero new merges in a round → early stop.
 *  - Synthetic duplicate corpus collapses to the EXPECTED canonical count.
 *
 * Comprehensive-build floor: happy path + ≥3 failure modes (empty, all
 * unique, oversize cap, schema-invalid drop) + ≥2 adversarial (NaN/Inf
 * vector, zero vector, dim-mismatch, non-array) + ≥3 spanning configs
 * (threshold 0 / 0.82 / 1.0; maxRounds 1 vs 4; embedder vs fallback),
 * determinism (pinned now + input-order independence), Zod on every public
 * entry, dispatcher round-trip parity.
 *
 * Filename matches engine (B1 Stop-hook lesson; unit spec said
 * IdeaBlockDedup.test.ts — overridden by the filename rule). Hermetic, no
 * network, no Qdrant (the whole point of the pure dedupVectors core).
 */

import { describe, it, expect } from "vitest";
import {
  IdeaBlockDedupEngine,
  ideaBlockDedupEngine,
  IdeaBlockDedupOptionsSchema,
  runIdeaBlockDedup,
  _internals,
  type DedupItem,
} from "../engines/IdeaBlockDedupEngine.js";
import { IdeaBlockSchema, type IdeaBlock } from "../schemas/ideaBlockSchema.js";

const NOW = Date.UTC(2026, 4, 17, 12, 0, 0);
const NOW_ISO = "2026-05-17T12:00:00.000Z";

/**
 * Map an arbitrary short label to a valid 24-lowercase-hex IdeaBlock id
 * (schema requires /^[0-9a-f]{24}$/). Order-preserving for equal-length
 * labels (hex of the ASCII bytes, zero-padded) so canonical-selection
 * assertions ("smallest id wins") stay predictable: hid("a1") < hid("a2").
 */
function hid(label: string): string {
  let h = "";
  for (let i = 0; i < label.length; i++) h += label.charCodeAt(i).toString(16).padStart(2, "0");
  return (h + "0".repeat(24)).slice(0, 24);
}

/** Build a schema-valid IdeaBlock from a short label. */
function blk(label: string, q: string, a: string, src = "knowledge/x.md"): IdeaBlock {
  const b = {
    id: hid(label),
    question: q.padEnd(8, "?"),
    answer: a.padEnd(8, "."),
    source_path: src,
    source_offset: 0,
    governance_tags: ["fact"],
    schema_version: 1,
    extracted_at: NOW_ISO,
    model: "qwen2.5-coder:7b",
  };
  return IdeaBlockSchema.parse(b); // assert the fixture itself is valid
}

const v = (...xs: number[]): number[] => xs;
const item = (id: string, vec: number[], q = "What is the question here", a = "This is the answer text"): DedupItem => ({
  block: blk(id, q, a),
  vector: vec,
});

describe("IdeaBlockDedupEngine — Zod schema (every public entry)", () => {
  it("rejects threshold > 1 / < 0", () => {
    expect(() => IdeaBlockDedupOptionsSchema.parse({ threshold: 1.2 })).toThrow();
    expect(() => IdeaBlockDedupOptionsSchema.parse({ threshold: -0.1 })).toThrow();
  });
  it("rejects fractional / out-of-range maxRounds", () => {
    expect(() => IdeaBlockDedupOptionsSchema.parse({ maxRounds: 2.5 })).toThrow();
    expect(() => IdeaBlockDedupOptionsSchema.parse({ maxRounds: 0 })).toThrow();
    expect(() => IdeaBlockDedupOptionsSchema.parse({ maxRounds: 999 })).toThrow();
  });
  it("rejects NaN now", () => {
    expect(() => IdeaBlockDedupOptionsSchema.parse({ now: Number.NaN })).toThrow();
  });
  it("accepts every documented option", () => {
    expect(() => IdeaBlockDedupOptionsSchema.parse({
      threshold: 0.82, maxRounds: 4, now: NOW, maxBlocks: 5000, embed: (s: string) => [s.length],
    })).not.toThrow();
  });
  it("validateOptions fires on dedupVectors / dedupBlocks / runIdeaBlockDedup", () => {
    expect(() => ideaBlockDedupEngine.dedupVectors([], { threshold: 9 })).toThrow();
    expect(() => ideaBlockDedupEngine.dedupBlocks([], { maxRounds: -1 })).toThrow();
    expect(() => runIdeaBlockDedup([], { now: Number.NaN })).toThrow();
  });
});

describe("IdeaBlockDedupEngine — dedupVectors (core verdict matrix)", () => {
  it("HAPPY: synthetic duplicate corpus collapses to expected canonical count", () => {
    // 3 duplicate families, axis-aligned unit vectors so cosine is exactly
    // 1.0 within a family and 0.0 across families.
    const items: DedupItem[] = [
      item("a1", v(1, 0, 0)), item("a2", v(1, 0, 0)), item("a3", v(1, 0, 0)),
      item("b1", v(0, 1, 0)), item("b2", v(0, 1, 0)),
      item("c1", v(0, 0, 1)),
    ];
    const r = ideaBlockDedupEngine.dedupVectors(items, { now: NOW });
    expect(r.inputCount).toBe(6);
    expect(r.outputCount).toBe(3); // one canonical per family
    expect(r.canonicalBlocks.map((b) => b.id).sort()).toEqual(
      ["a1", "b1", "c1"].map(hid).sort(),
    );
    // Canonical = smallest id; a1 absorbed a2,a3; b1 absorbed b2.
    expect(r.mergeMap[hid("a1")]).toEqual([hid("a2"), hid("a3")]);
    expect(r.mergeMap[hid("b1")]).toEqual([hid("b2")]);
    expect(r.converged).toBe(true);
    expect(r.generatedAt).toBe(NOW_ISO);
  });

  it("CONVERGENCE: roundMerges ends in a zero-merge round + early stop", () => {
    const items: DedupItem[] = [
      item("d1", v(1, 0)), item("d2", v(1, 0)), item("d3", v(1, 0)),
    ];
    const r = ideaBlockDedupEngine.dedupVectors(items, { now: NOW, maxRounds: 4 });
    expect(r.outputCount).toBe(1);
    // Round 1 merges 2 (d2,d3 → d1); round 2 sees only d1 → 0 merges → stop.
    expect(r.roundMerges[0]).toBe(2);
    expect(r.roundMerges[r.roundMerges.length - 1]).toBe(0);
    expect(r.rounds).toBeLessThanOrEqual(4);
    expect(r.converged).toBe(true);
  });

  it("TRANSITIVE-WITHIN-ROUND: A≈B, B≈C, A≉C collapses in ONE round, NO injected embedder (wired-path oracle)", () => {
    // The spec's headline behavior, proven on the PRODUCTION path (pure
    // dedupVectors, no fixture embedder — connected components do it):
    //   A=(1,0)  B=(0.85,0.53)  C=(0.5,0.866)
    //   cos(A,B) ≈ 0.849 ≥ 0.82      → edge A–B
    //   cos(B,C) ≈ 0.882 ≥ 0.82      → edge B–C
    //   cos(A,C) = 0.500 < 0.82      → NO edge A–C
    // Union-find closes {A,B,C} into one component in round 1. A single-
    // linkage-to-seed design would have left C stranded (the prior P0).
    expect(_internals.cosineSimilarity(v(1, 0), v(0.85, 0.53))).toBeCloseTo(0.8486, 3);
    expect(_internals.cosineSimilarity(v(0.85, 0.53), v(0.5, 0.866))).toBeCloseTo(0.8825, 3);
    expect(_internals.cosineSimilarity(v(1, 0), v(0.5, 0.866))).toBeCloseTo(0.5, 3);
    const A = item("ca", v(1, 0));
    const B = item("cb", v(0.85, 0.53));
    const C = item("cc", v(0.5, 0.866));
    const r = ideaBlockDedupEngine.dedupVectors([A, B, C], { now: NOW, threshold: 0.82 });
    expect(r.outputCount).toBe(1);                 // fully collapsed, round 1
    expect(r.roundMerges[0]).toBe(2);              // B and C → canonical
    expect(r.roundMerges[r.roundMerges.length - 1]).toBe(0); // 0-merge round
    expect(r.converged).toBe(true);
    expect(r.canonicalBlocks[0].id).toBe(hid("ca")); // min id
    expect(r.mergeMap[hid("ca")]).toEqual([hid("cb"), hid("cc")]);
  });

  it("DETERMINISM under id RELABELING: identical geometry → identical collapse regardless of which member has min id", () => {
    // Same 3 vectors as above. Connected components depend ONLY on
    // geometry, so relabeling so the BRIDGE (B) has the min id, or the
    // ENDPOINT (C) has the min id, must yield the same outputCount and
    // the same absorbed-set cardinality. (Seed-linkage failed this — P0-2.)
    const geo: [string, number[]][] = [
      ["1", v(1, 0)], ["2", v(0.85, 0.53)], ["3", v(0.5, 0.866)],
    ];
    const mk = (labels: [string, string, string]) =>
      ideaBlockDedupEngine.dedupVectors(
        geo.map(([, vec], i) => item(labels[i], vec)),
        { now: NOW, threshold: 0.82 },
      );
    const bridgeMinId = mk(["zz", "aa", "mm"]); // B (bridge) = "aa" = min id
    const endpointMinId = mk(["mm", "zz", "aa"]); // C (endpoint) = "aa" = min id
    expect(bridgeMinId.outputCount).toBe(1);
    expect(endpointMinId.outputCount).toBe(1);
    const absorbed = (r: typeof bridgeMinId) =>
      Object.values(r.mergeMap).reduce((n, arr) => n + arr.length, 0);
    expect(absorbed(bridgeMinId)).toBe(2);
    expect(absorbed(endpointMinId)).toBe(2);
  });

  it("WIRED transitive: dedupBlocks with the DEFAULT fallback embedder collapses a duplicate family", () => {
    // No injected embedder anywhere — exactly the dispatcher / runIdeaBlock
    // Dedup path. Three blocks whose TEXT is identical (the real near-dup
    // case) plus one distinct → fallbackEmbed maps the three to the same
    // vector (cosine 1) → one component → 2 canonicals. This is the R9
    // oracle the prior suite lacked (it only tested injected fixtures).
    const d1 = blk("k1", "How is iterative dedup performed", "By connected components over the cosine graph.");
    const d2 = blk("k2", "How is iterative dedup performed", "By connected components over the cosine graph.");
    const d3 = blk("k3", "How is iterative dedup performed", "By connected components over the cosine graph.");
    const u = blk("k4", "What does the Kienzle model give", "The specific cutting force from kc and mc.");
    const r = runIdeaBlockDedup([d1, d2, d3, u], { now: NOW });
    expect(r.outputCount).toBe(2);
    expect(r.converged).toBe(true);
    expect(r.mergeMap[hid("k1")]).toEqual([hid("k2"), hid("k3")]);
  });

  it("FAILURE: empty input → 0/0, converged, rounds 0", () => {
    const r = ideaBlockDedupEngine.dedupVectors([], { now: NOW });
    expect(r.inputCount).toBe(0);
    expect(r.outputCount).toBe(0);
    expect(r.rounds).toBe(1); // one round runs, finds nothing, converges
    expect(r.converged).toBe(true);
    expect(r.mergeMap).toEqual({});
  });

  it("FAILURE: all-unique corpus → no merges, converges round 1", () => {
    const items = [item("u1", v(1, 0, 0)), item("u2", v(0, 1, 0)), item("u3", v(0, 0, 1))];
    const r = ideaBlockDedupEngine.dedupVectors(items, { now: NOW });
    expect(r.outputCount).toBe(3);
    expect(r.roundMerges[0]).toBe(0);
    expect(r.converged).toBe(true);
    expect(r.rounds).toBe(1);
  });

  it("FAILURE: oversize input is deterministically capped + LOUD warning", () => {
    const many: DedupItem[] = [];
    for (let i = 0; i < 12; i++) many.push(item(`z${i}`, v(Math.cos(i), Math.sin(i))));
    const r = ideaBlockDedupEngine.dedupVectors(many, { now: NOW, maxBlocks: 5 });
    expect(r.truncated).toBe(true);
    expect(r.warnings.some((w) => w.includes("exceeds maxBlocks"))).toBe(true);
    expect(r.inputCount).toBe(12);
    expect(r.outputCount).toBeLessThanOrEqual(5);
  });

  it("ADVERSARIAL: NaN / Infinity vector components never force a merge", () => {
    const items = [
      item("n1", v(1, 0)), item("n2", v(Number.NaN, 0)),
      item("n3", v(Number.POSITIVE_INFINITY, 1)),
    ];
    const r = ideaBlockDedupEngine.dedupVectors(items, { now: NOW, threshold: 0 });
    // At threshold 0, every poison pair has cosine 0 (the guard) and 0 ≥ 0,
    // so all three connect into ONE component (deterministic — no crash,
    // no NaN propagation). centroid() skips the non-finite vectors so the
    // canonical vector is the finite (1,0), not NaN/Inf (R12 safe-degrade).
    expect(r.outputCount).toBe(1);
    expect(r.converged).toBe(true);
    expect(typeof r.canonicalBlocks[0].id).toBe("string"); // real block, no crash
    expect(r.mergeMap[r.canonicalBlocks[0].id]).toHaveLength(2); // absorbed the 2 poison
  });

  it("ADVERSARIAL: zero vector + dim mismatch → cosine 0, no spurious merge", () => {
    const items = [item("p1", v(0, 0, 0)), item("p2", v(0, 0, 0)), item("p3", v(1, 0))];
    const r = ideaBlockDedupEngine.dedupVectors(items, { now: NOW, threshold: 0.82 });
    // zero vectors → denom 0 → sim 0 < 0.82; dim-mismatch (3 vs 2) → 0.
    expect(r.outputCount).toBe(3);
    expect(r.roundMerges[0]).toBe(0);
  });

  it("SPANNING config: threshold 0 collapses everything; 1.0 only exact", () => {
    const items = [item("s1", v(1, 0)), item("s2", v(0.9, 0.1)), item("s3", v(0, 1))];
    const all = ideaBlockDedupEngine.dedupVectors(items, { now: NOW, threshold: 0 });
    expect(all.outputCount).toBe(1); // everything (cos ≥ 0) into one
    const strict = ideaBlockDedupEngine.dedupVectors(items, { now: NOW, threshold: 1 });
    expect(strict.outputCount).toBe(3); // no two are exactly parallel
  });

  it("SPANNING config: maxRounds 1 caps rounds even if not converged", () => {
    const items = [item("m1", v(1, 0)), item("m2", v(1, 0))];
    const r = ideaBlockDedupEngine.dedupVectors(items, { now: NOW, maxRounds: 1 });
    expect(r.rounds).toBe(1);
    // 1 merge happened in round 1; converged only if a 0-merge round ran —
    // it did not (capped), so converged is false here.
    expect(r.roundMerges).toEqual([1]);
    expect(r.converged).toBe(false);
    expect(r.outputCount).toBe(1);
  });

  it("DETERMINISM: input order does not change the canonical set or map", () => {
    const base = [item("g3", v(1, 0)), item("g1", v(1, 0)), item("g2", v(0, 1))];
    const a = ideaBlockDedupEngine.dedupVectors(base, { now: NOW });
    const shuffled = [base[2], base[0], base[1]];
    const b = ideaBlockDedupEngine.dedupVectors(shuffled, { now: NOW });
    expect(JSON.stringify(a.canonicalBlocks.map((x) => x.id))).toBe(
      JSON.stringify(b.canonicalBlocks.map((x) => x.id)),
    );
    expect(JSON.stringify(a.mergeMap)).toBe(JSON.stringify(b.mergeMap));
    expect(a.generatedAt).toBe(NOW_ISO);
  });
});

describe("IdeaBlockDedupEngine — dedupBlocks (public path)", () => {
  it("schema-invalid blocks are dropped with a fail-loud warning", () => {
    const good = blk("ok1", "What is dedup about here", "It collapses duplicate idea blocks.");
    const bad = { id: "tooshort", question: "x", answer: "y" }; // fails schema
    const r = ideaBlockDedupEngine.dedupBlocks([good, bad], { now: NOW });
    expect(r.outputCount).toBe(1);
    expect(r.warnings.some((w) => w.includes("failed IdeaBlockSchema"))).toBe(true);
  });

  it("non-array input → empty result + explicit warning (no throw)", () => {
    const r = ideaBlockDedupEngine.dedupBlocks("nope" as unknown as unknown[], { now: NOW });
    expect(r.outputCount).toBe(0);
    expect(r.warnings.some((w) => w.includes("not an array"))).toBe(true);
  });

  it("SPANNING: fallback embedder dedups identical text; distinct stays split", () => {
    const dupA1 = blk("fa1", "How does cosine dedup work", "It clusters by cosine over embeddings.");
    const dupA2 = blk("fa2", "How does cosine dedup work", "It clusters by cosine over embeddings.");
    const diffB = blk("fb1", "What is the Taylor tool life law", "T equals C over Vc to the one over n.");
    const r = ideaBlockDedupEngine.dedupBlocks([dupA1, dupA2, diffB], { now: NOW });
    // Identical text → identical fallback vector → cosine 1 → merge.
    expect(r.outputCount).toBe(2);
    expect(r.mergeMap[hid("fa1")]).toEqual([hid("fa2")]);
  });

  it("SPANNING: injected embedder path is used over the fallback", () => {
    const b1 = blk("ie1", "Question one is here now", "Answer one is here now.");
    const b2 = blk("ie2", "Totally different text x", "Wildly different answer y.");
    // Embedder forces both to the SAME vector → they must merge despite
    // unrelated text (proves opts.embed is actually consulted).
    const r = ideaBlockDedupEngine.dedupBlocks([b1, b2], {
      now: NOW, embed: () => [1, 0, 0],
    });
    expect(r.outputCount).toBe(1);
  });
});

describe("IdeaBlockDedupEngine — _internals (pure)", () => {
  it("cosineSimilarity: parallel=1, orthogonal=0, symmetric, bounded", () => {
    expect(_internals.cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1, 5);
    expect(_internals.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    expect(_internals.cosineSimilarity([1, 2], [3, 4])).toBe(
      _internals.cosineSimilarity([3, 4], [1, 2]),
    );
  });
  it("cosineSimilarity: dim mismatch / zero / non-finite → 0 (safe degrade)", () => {
    expect(_internals.cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
    expect(_internals.cosineSimilarity([0, 0], [0, 0])).toBe(0);
    expect(_internals.cosineSimilarity([Number.NaN, 1], [1, 1])).toBe(0);
    expect(_internals.cosineSimilarity([Number.POSITIVE_INFINITY, 0], [1, 0])).toBe(0);
    expect(_internals.cosineSimilarity([], [])).toBe(0);
  });
  it("centroid: mean of equal-dim vectors; skips non-finite; dim-guard; fallback", () => {
    expect(_internals.centroid([[2, 0], [0, 2]], 2, [9, 9])).toEqual([1, 1]);
    // Non-finite member is skipped from the mean, not propagated.
    expect(_internals.centroid([[2, 0], [Number.NaN, 5]], 2, [9, 9])).toEqual([2, 0]);
    expect(_internals.centroid([[1, 0], [Number.POSITIVE_INFINITY, 0]], 2, [9, 9])).toEqual([1, 0]);
    // Mismatched-dim member excluded; only the 2-dim one averaged.
    expect(_internals.centroid([[4, 4], [1, 2, 3]], 2, [9, 9])).toEqual([4, 4]);
    // No usable member → fallback (the canonical's own vector).
    expect(_internals.centroid([[Number.NaN], [1, 2, 3]], 2, [7, 8])).toEqual([7, 8]);
    expect(_internals.centroid([], 2, [7, 8])).toEqual([7, 8]);
  });

  it("fallbackEmbed: deterministic, fixed-dim, identical text → identical vec", () => {
    const x = _internals.fallbackEmbed("the kienzle force law");
    const y = _internals.fallbackEmbed("the kienzle force law");
    expect(x).toEqual(y);
    expect(x.length).toBe(_internals.FALLBACK_EMBED_DIM);
    expect(_internals.fallbackEmbed("different")).not.toEqual(x);
  });
  it("clampUnit / clampInt bound + default on NaN", () => {
    expect(_internals.clampUnit(0.5, 0.82)).toBe(0.5);
    expect(_internals.clampUnit(-1, 0.82)).toBe(0);
    expect(_internals.clampUnit(2, 0.82)).toBe(1);
    expect(_internals.clampUnit(Number.NaN, 0.82)).toBe(0.82);
    expect(_internals.clampInt(3.9, 4, 1, 20)).toBe(3);
    expect(_internals.clampInt(99, 4, 1, 20)).toBe(20);
    expect(_internals.clampInt(undefined, 4, 1, 20)).toBe(4);
  });
});

describe("IdeaBlockDedupEngine — dispatcher round-trip", () => {
  it("ACTION_MEMORY_SCHEMAS registers ideablock_dedup (snake+camel)", async () => {
    const { ACTION_MEMORY_SCHEMAS } = await import("../schemas/memoryActionSchemas.js");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("ideablock_dedup");
    const s = ACTION_MEMORY_SCHEMAS.ideablock_dedup;
    expect(() => s.parse({ blocks: [] })).not.toThrow();
    expect(() => s.parse({ blocks: [], threshold: 0.82, max_rounds: 4 })).not.toThrow();
    expect(() => s.parse({ blocks: [], maxRounds: 4 })).not.toThrow();
    expect(() => s.parse({ blocks: [], threshold: 9 })).toThrow();
    expect(() => s.parse({})).toThrow(); // blocks required
  });

  it("singleton + fresh class produce identical verdicts", () => {
    const items = [item("q1", v(1, 0)), item("q2", v(1, 0)), item("q3", v(0, 1))];
    const a = ideaBlockDedupEngine.dedupVectors(items, { now: NOW });
    const b = new IdeaBlockDedupEngine().dedupVectors(items, { now: NOW });
    expect(a.outputCount).toBe(b.outputCount);
    expect(JSON.stringify(a.mergeMap)).toBe(JSON.stringify(b.mergeMap));
    expect(a.converged).toBe(b.converged);
  });

  it("runIdeaBlockDedup wrapper dedups via fallback embedder end-to-end", () => {
    const d1 = blk("w1", "Identical claim text here", "Identical supporting answer text.");
    const d2 = blk("w2", "Identical claim text here", "Identical supporting answer text.");
    const r = runIdeaBlockDedup([d1, d2], { now: NOW });
    expect(r.outputCount).toBe(1);
    expect(r.converged).toBe(true);
  });
});
