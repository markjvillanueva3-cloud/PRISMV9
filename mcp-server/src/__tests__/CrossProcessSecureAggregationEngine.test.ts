/**
 * CrossProcessSecureAggregationEngine.test.ts — XPROC-NEURAL Tier 6 (T6-02)
 *
 * Verifies Bonawitz et al. 2017 pairwise additive masks. The Tier 6 R2
 * acceptance criterion ("round-trip preserves correctness with masks
 * zeroed") is verified by:
 *   1. Each client masks its plaintext with the agreed pair seeds.
 *   2. Aggregator unmask() returns Σ_i ŵ_i, which equals Σ_i w_i because
 *      pairwise masks cancel under summation.
 *   3. Compare against plaintext SUM — must match to 1e-9 (float
 *      cancellation tolerance).
 *   4. Compose with publicly-known sample counts to verify FedAvg-style
 *      weighted average can be recovered when caller pre-weights.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessSecureAggregationEngine,
  crossProcessSecureAggregation,
} from "../engines/CrossProcessSecureAggregationEngine.js";

// Deterministic LCG for synthetic plaintext + seed generation.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

function plaintextWeights(seed: number, dim: number): number[] {
  const r = lcg(seed);
  const w = new Array<number>(dim);
  for (let k = 0; k < dim; k++) {
    w[k] = ((r() & 0xFFFFFF) / 0x1000000 - 0.5) * 4; // ~[-2, 2)
  }
  return w;
}

// Build a fully-symmetric peer-seed table for N clients deterministically.
// pairSeed(i, j) = pairSeed(j, i) — both clients see the SAME seed for
// their shared pair. This is what an honest DH handshake would produce.
function buildSeeds(clientIds: string[], sessionSeed: number): Map<string, number> {
  const seeds = new Map<string, number>();
  const r = lcg(sessionSeed);
  const sorted = [...clientIds].sort();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const key = `${sorted[i]}|${sorted[j]}`;
      seeds.set(key, r() | 0); // signed int32
    }
  }
  return seeds;
}

function peerSeedsFor(
  clientId: string,
  allClients: string[],
  table: Map<string, number>,
): { peerId: string; sharedSeed: number }[] {
  const out: { peerId: string; sharedSeed: number }[] = [];
  for (const peer of allClients) {
    if (peer === clientId) continue;
    const a = clientId < peer ? clientId : peer;
    const b = clientId < peer ? peer : clientId;
    const seed = table.get(`${a}|${b}`)!;
    out.push({ peerId: peer, sharedSeed: seed });
  }
  return out;
}

// Reference: plaintext element-wise SUM (Bonawitz primitive).
function plaintextSum(clients: { weights: number[] }[]): number[] {
  const dim = clients[0].weights.length;
  const out = new Array<number>(dim).fill(0);
  for (const c of clients) {
    for (let k = 0; k < dim; k++) out[k] += c.weights[k];
  }
  return out;
}

// Reference: centralized FedAvg with PRISM 0.5x weighting (recovered by
// pre-multiplying each client's weights by share BEFORE masking).
function centralizedFedAvg(
  clients: { weights: number[]; sampleCount: number; isLocal: boolean }[],
): number[] {
  const dim = clients[0].weights.length;
  const eff = clients.map((c) => (c.isLocal ? c.sampleCount : 0.5 * c.sampleCount));
  const total = eff.reduce((a, x) => a + x, 0);
  const out = new Array<number>(dim).fill(0);
  for (let i = 0; i < clients.length; i++) {
    const share = eff[i] / total;
    for (let k = 0; k < dim; k++) out[k] += share * clients[i].weights[k];
  }
  return out;
}

describe("mask() — input validation", () => {
  it("rejects empty weights", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [], peerSeeds: [],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN in weights", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [1, Number.NaN, 3], peerSeeds: [],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects Infinity in weights", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [1, Number.POSITIVE_INFINITY], peerSeeds: [],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects self-pair (peerId === clientId)", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [1, 2, 3],
      peerSeeds: [{ peerId: "a", sharedSeed: 12345 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("invalid_input");
      expect(r.message).toMatch(/self-pair/);
    }
  });

  it("dedupes duplicate peerIds and warns", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [1, 2, 3],
      peerSeeds: [
        { peerId: "b", sharedSeed: 12345 },
        { peerId: "b", sharedSeed: 99999 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.appliedPeers).toBe(1);
      expect(r.warnings.some((w) => w.includes("duplicate peerId 'b'"))).toBe(true);
    }
  });

  it("warns on sharedSeed=0 (xorshift32 fixed point)", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [1, 2, 3],
      peerSeeds: [{ peerId: "b", sharedSeed: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("sharedSeed=0"))).toBe(true);
    }
  });
});

describe("mask() — sign convention + length preservation", () => {
  it("returns vector of identical length", () => {
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [1, 2, 3, 4, 5],
      peerSeeds: [{ peerId: "b", sharedSeed: 42 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.maskedWeights.length).toBe(5);
  });

  it("no peers → mask is identity (returns plaintext)", () => {
    const w = [1.5, -2.25, 3.0];
    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: w, peerSeeds: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (let k = 0; k < w.length; k++) {
        expect(r.maskedWeights[k]).toBeCloseTo(w[k], 12);
      }
    }
  });

  it("lex-smaller client ADDs, lex-larger SUBTRACTs (mirror image)", () => {
    const w = [0, 0, 0, 0]; // zero plaintext isolates the mask itself
    const seed = 0x1234ABCD | 0;
    const aRes = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: w, peerSeeds: [{ peerId: "b", sharedSeed: seed }],
    });
    const bRes = CrossProcessSecureAggregationEngine.mask({
      clientId: "b", weights: w, peerSeeds: [{ peerId: "a", sharedSeed: seed }],
    });
    expect(aRes.ok).toBe(true);
    expect(bRes.ok).toBe(true);
    if (aRes.ok && bRes.ok) {
      // aMasked + bMasked = 0 (masks are exact negatives of each other)
      for (let k = 0; k < w.length; k++) {
        expect(aRes.maskedWeights[k] + bRes.maskedWeights[k]).toBeCloseTo(0, 12);
      }
      // And neither is identically zero (PRG is not the zero stream)
      expect(aRes.maskedWeights.some((x) => Math.abs(x) > 0.01)).toBe(true);
    }
  });

  it("PRG is deterministic — same seed yields same mask twice", () => {
    const a1 = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [0, 0, 0, 0, 0],
      peerSeeds: [{ peerId: "b", sharedSeed: 7777 }],
    });
    const a2 = CrossProcessSecureAggregationEngine.mask({
      clientId: "a", weights: [0, 0, 0, 0, 0],
      peerSeeds: [{ peerId: "b", sharedSeed: 7777 }],
    });
    expect(a1.ok).toBe(true);
    expect(a2.ok).toBe(true);
    if (a1.ok && a2.ok) {
      for (let k = 0; k < 5; k++) {
        expect(a1.maskedWeights[k]).toBe(a2.maskedWeights[k]);
      }
    }
  });
});

describe("unmask() — input validation", () => {
  it("rejects empty client list", () => {
    const r = CrossProcessSecureAggregationEngine.unmask({ maskedClients: [] });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects mismatched maskedWeights length", () => {
    const r = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: [
        { clientId: "a", maskedWeights: [1, 2, 3], sampleCount: 10, isLocal: true },
        { clientId: "b", maskedWeights: [1, 2], sampleCount: 5, isLocal: true },
      ],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects when all clients have sampleCount=0 (invalid_state)", () => {
    const r = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: [
        { clientId: "a", maskedWeights: [1, 2], sampleCount: 0, isLocal: true },
        { clientId: "b", maskedWeights: [1, 2], sampleCount: 0, isLocal: true },
      ],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_state" });
  });

  it("skips zero-sample clients with warning", () => {
    const r = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: [
        { clientId: "a", maskedWeights: [1, 2], sampleCount: 10, isLocal: true },
        { clientId: "b", maskedWeights: [3, 4], sampleCount: 0, isLocal: true },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.participants).toBe(1);
      expect(r.warnings.some((w) => w.includes("'b'") && w.includes("sampleCount=0"))).toBe(true);
    }
  });
});

describe("Round-trip — Tier 6 R2 acceptance: masks cancel exactly", () => {
  it("2 clients: mask + sum = plaintext SUM (within 1e-9)", () => {
    const ids = ["c1", "c2"];
    const seeds = buildSeeds(ids, 0xCAFEBABE);
    const w1 = plaintextWeights(0xBADC0DE, 8);
    const w2 = plaintextWeights(0xFEEDBEEF, 8);

    const m1 = CrossProcessSecureAggregationEngine.mask({
      clientId: "c1", weights: w1, peerSeeds: peerSeedsFor("c1", ids, seeds),
    });
    const m2 = CrossProcessSecureAggregationEngine.mask({
      clientId: "c2", weights: w2, peerSeeds: peerSeedsFor("c2", ids, seeds),
    });
    expect(m1.ok).toBe(true);
    expect(m2.ok).toBe(true);
    if (!m1.ok || !m2.ok) return;

    const agg = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: [
        { clientId: "c1", maskedWeights: m1.maskedWeights, sampleCount: 100, isLocal: true },
        { clientId: "c2", maskedWeights: m2.maskedWeights, sampleCount: 100, isLocal: true },
      ],
    });
    expect(agg.ok).toBe(true);
    if (!agg.ok) return;

    const ref = plaintextSum([{ weights: w1 }, { weights: w2 }]);
    for (let k = 0; k < 8; k++) {
      expect(agg.summedWeights[k]).toBeCloseTo(ref[k], 9);
    }
    expect(agg.totalSamples).toBe(200);
    expect(agg.totalEffectiveSamples).toBe(200);
  });

  it("5 clients pairwise: mask + sum = plaintext SUM", () => {
    const ids = ["c1", "c2", "c3", "c4", "c5"];
    const seeds = buildSeeds(ids, 0xACEBEEF1);
    const dim = 12;
    const plain = ids.map((id, i) => plaintextWeights(0x1000 + i * 7, dim));
    const counts = [80, 100, 60, 40, 120];
    const isLocal = [true, true, true, false, false];

    const masked = ids.map((id, i) => {
      const r = CrossProcessSecureAggregationEngine.mask({
        clientId: id, weights: plain[i], peerSeeds: peerSeedsFor(id, ids, seeds),
      });
      expect(r.ok).toBe(true);
      return r.ok ? r.maskedWeights : [];
    });

    const agg = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: ids.map((id, i) => ({
        clientId: id,
        maskedWeights: masked[i],
        sampleCount: counts[i],
        isLocal: isLocal[i],
      })),
    });
    expect(agg.ok).toBe(true);
    if (!agg.ok) return;

    const ref = plaintextSum(plain.map((w) => ({ weights: w })));
    for (let k = 0; k < dim; k++) {
      expect(agg.summedWeights[k]).toBeCloseTo(ref[k], 9);
    }
    expect(agg.totalSamples).toBe(80 + 100 + 60 + 40 + 120);
    // PRISM SHARED_FACTOR: c4 and c5 are shared (40 + 120) * 0.5 = 80
    expect(agg.totalEffectiveSamples).toBeCloseTo(80 + 100 + 60 + 0.5 * 40 + 0.5 * 120, 9);
  });

  it("FedAvg recovery via pre-weighting — composability with T6-01", () => {
    // T6-01 callers compose by pre-multiplying client weights by share
    // BEFORE masking; then unmask SUM directly equals the weighted average.
    const ids = ["c1", "c2", "c3"];
    const seeds = buildSeeds(ids, 0x11223344);
    const dim = 6;
    const plain = ids.map((id, i) => plaintextWeights(0x500 + i, dim));
    const counts = [50, 100, 150];
    const isLocal = [true, false, true];
    const eff = counts.map((n, i) => (isLocal[i] ? n : 0.5 * n));
    const total = eff.reduce((a, x) => a + x, 0);
    const preWeighted = plain.map((w, i) => w.map((x) => (eff[i] / total) * x));

    const masked = ids.map((id, i) => {
      const r = CrossProcessSecureAggregationEngine.mask({
        clientId: id, weights: preWeighted[i], peerSeeds: peerSeedsFor(id, ids, seeds),
      });
      return r.ok ? r.maskedWeights : [];
    });

    const agg = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: ids.map((id, i) => ({
        clientId: id, maskedWeights: masked[i],
        sampleCount: counts[i], isLocal: isLocal[i],
      })),
    });
    expect(agg.ok).toBe(true);
    if (!agg.ok) return;

    const ref = centralizedFedAvg(
      ids.map((_, i) => ({ weights: plain[i], sampleCount: counts[i], isLocal: isLocal[i] })),
    );
    for (let k = 0; k < dim; k++) {
      expect(agg.summedWeights[k]).toBeCloseTo(ref[k], 9);
    }
  });

  it("aggregator-visible masked vectors are NOT plaintext (privacy)", () => {
    // The masked weights one client uploads must differ materially from
    // its plaintext — otherwise privacy is leaked. Verify magnitude.
    const ids = ["c1", "c2", "c3"];
    const seeds = buildSeeds(ids, 0xDEADBEEF);
    const plain = plaintextWeights(0xC0FFEE, 16);

    const r = CrossProcessSecureAggregationEngine.mask({
      clientId: "c1", weights: plain, peerSeeds: peerSeedsFor("c1", ids, seeds),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // L2 distance between masked and plaintext should be substantial
    // (mask is sum of 2 PRG vectors, each with std ~0.577 in [-1,1)).
    let l2 = 0;
    for (let k = 0; k < 16; k++) {
      l2 += (r.maskedWeights[k] - plain[k]) ** 2;
    }
    expect(Math.sqrt(l2)).toBeGreaterThan(0.5);
  });

  it("asymmetric pair seeds → masks DO NOT cancel (negative test)", () => {
    // Two clients with DIFFERENT seeds for their shared pair: aggregate is corrupted.
    const w1 = plaintextWeights(0x111, 6);
    const w2 = plaintextWeights(0x222, 6);
    const m1 = CrossProcessSecureAggregationEngine.mask({
      clientId: "c1", weights: w1,
      peerSeeds: [{ peerId: "c2", sharedSeed: 1000 }],
    });
    const m2 = CrossProcessSecureAggregationEngine.mask({
      clientId: "c2", weights: w2,
      peerSeeds: [{ peerId: "c1", sharedSeed: 2000 }], // DIFFERENT seed = adversarial
    });
    expect(m1.ok).toBe(true);
    expect(m2.ok).toBe(true);
    if (!m1.ok || !m2.ok) return;

    const agg = CrossProcessSecureAggregationEngine.unmask({
      maskedClients: [
        { clientId: "c1", maskedWeights: m1.maskedWeights, sampleCount: 50, isLocal: true },
        { clientId: "c2", maskedWeights: m2.maskedWeights, sampleCount: 50, isLocal: true },
      ],
    });
    expect(agg.ok).toBe(true);
    if (!agg.ok) return;

    const ref = plaintextSum([{ weights: w1 }, { weights: w2 }]);
    let maxDelta = 0;
    for (let k = 0; k < 6; k++) {
      const d = Math.abs(agg.summedWeights[k] - ref[k]);
      if (d > maxDelta) maxDelta = d;
    }
    expect(maxDelta).toBeGreaterThan(0.05);
  });
});

describe("verifyCancellation() — diagnostic", () => {
  it("symmetric seeds → residual ≈ 0 (cancels=true)", () => {
    const ids = ["c1", "c2", "c3", "c4"];
    const seeds = buildSeeds(ids, 0x55667788);
    const dim = 10;
    const clients = ids.map((id, i) => ({
      clientId: id,
      weights: plaintextWeights(0xA000 + i, dim),
      peerSeeds: peerSeedsFor(id, ids, seeds),
    }));

    const r = CrossProcessSecureAggregationEngine.verifyCancellation({ clients });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cancels).toBe(true);
      expect(r.maskCancellationResidual).toBeLessThan(1e-9);
    }
  });

  it("asymmetric seeds → residual is large (cancels=false)", () => {
    const r = CrossProcessSecureAggregationEngine.verifyCancellation({
      clients: [
        {
          clientId: "c1", weights: [0, 0, 0, 0],
          peerSeeds: [{ peerId: "c2", sharedSeed: 1000 }],
        },
        {
          clientId: "c2", weights: [0, 0, 0, 0],
          peerSeeds: [{ peerId: "c1", sharedSeed: 2000 }], // different seed
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cancels).toBe(false);
      expect(r.maskCancellationResidual).toBeGreaterThan(0.01);
    }
  });

  it("rejects mismatched weight lengths across clients", () => {
    const r = CrossProcessSecureAggregationEngine.verifyCancellation({
      clients: [
        { clientId: "c1", weights: [0, 0, 0], peerSeeds: [{ peerId: "c2", sharedSeed: 1 }] },
        { clientId: "c2", weights: [0, 0], peerSeeds: [{ peerId: "c1", sharedSeed: 1 }] },
      ],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("constants() + dispatcher wrapper", () => {
  it("constants snapshot exposes SHARED_FACTOR=0.5", () => {
    const c = CrossProcessSecureAggregationEngine.constants();
    expect(c.SHARED_FACTOR).toBe(0.5);
    expect(c.MAX_WEIGHTS).toBe(1_000_000);
    expect(c.MAX_CLIENTS).toBe(1024);
  });

  it("dispatcher wrapper routes xproc_secure_mask", () => {
    const r = crossProcessSecureAggregation("xproc_secure_mask", {
      clientId: "a", weights: [1, 2, 3], peerSeeds: [],
    }) as { ok: boolean; maskedWeights?: number[] };
    expect(r.ok).toBe(true);
    expect(r.maskedWeights).toEqual([1, 2, 3]); // no peers = identity
  });

  it("dispatcher wrapper routes xproc_secure_unmask (returns SUM)", () => {
    const r = crossProcessSecureAggregation("xproc_secure_unmask", {
      maskedClients: [
        { clientId: "a", maskedWeights: [2, 4], sampleCount: 1, isLocal: true },
        { clientId: "b", maskedWeights: [4, 8], sampleCount: 1, isLocal: true },
      ],
    }) as { ok: boolean; summedWeights?: number[] };
    expect(r.ok).toBe(true);
    if (r.summedWeights) {
      expect(r.summedWeights[0]).toBeCloseTo(6, 12); // 2+4
      expect(r.summedWeights[1]).toBeCloseTo(12, 12); // 4+8
    }
  });

  it("dispatcher wrapper routes xproc_secure_verify", () => {
    const r = crossProcessSecureAggregation("xproc_secure_verify", {
      clients: [
        { clientId: "a", weights: [0, 0], peerSeeds: [{ peerId: "b", sharedSeed: 5 }] },
        { clientId: "b", weights: [0, 0], peerSeeds: [{ peerId: "a", sharedSeed: 5 }] },
      ],
    }) as { ok: boolean; cancels?: boolean };
    expect(r.ok).toBe(true);
    expect(r.cancels).toBe(true);
  });

  it("dispatcher wrapper rejects unknown action", () => {
    expect(() =>
      crossProcessSecureAggregation("xproc_secure_bogus", {}),
    ).toThrow(/unknown action/);
  });
});
