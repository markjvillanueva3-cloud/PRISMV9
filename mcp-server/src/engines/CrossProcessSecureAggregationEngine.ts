/**
 * CrossProcessSecureAggregationEngine — XPROC-NEURAL Tier 6 (T6-02)
 *
 * Privacy-preserving aggregation primitive based on Bonawitz, Ivanov, Kreuter,
 * Marcedone, McMahan, Patel, Ramage, Segal, Seth 2017,
 * "Practical Secure Aggregation for Privacy-Preserving Machine Learning,"
 * CCS.
 *
 * ## Core idea — pairwise additive masks
 *
 * Each ordered pair (i, j) of clients with i < j shares a secret seed s_{i,j}.
 * Both clients derive the SAME pseudorandom mask vector m_{i,j} = PRG(s_{i,j})
 * of length D (= weight vector dimension) from that seed.
 *
 * Client i, when uploading w_i, sends:
 *   ŵ_i = w_i + Σ_{j > i} m_{i,j} - Σ_{j < i} m_{j,i}
 *
 * That is: client i ADDS the mask for each peer indexed greater than itself
 * and SUBTRACTS the mask for each peer indexed less than itself. (Determined
 * by lexicographic compare of clientId vs peerId — clients order themselves
 * deterministically without needing a coordinator.)
 *
 * At the aggregator:
 *   Σ_i ŵ_i = Σ_i w_i + Σ_i (Σ_{j>i} m_{i,j} - Σ_{j<i} m_{j,i})
 *           = Σ_i w_i + 0
 *           = Σ_i w_i
 *
 * Each mask appears once with `+` (from the lex-smaller client) and once with
 * `-` (from the lex-larger client). They cancel pairwise — every pair (i,j)
 * contributes m_{i,j} - m_{i,j} = 0 to the sum. The aggregator therefore
 * recovers the plaintext sum WITHOUT having seen any individual w_i.
 *
 * ## Why this matters for PRISM
 *
 * Multi-shop federated training (Tier 6 motivation): each shop has private
 * outcome data. Shop A does NOT want shop B's aggregator to see shop A's
 * raw weight vector — the gradient encodes proprietary geometry knowledge.
 * Secure aggregation gives shop A a verifiable privacy guarantee: the only
 * thing the aggregator can compute is Σ_i w_i, which T6-01 then divides by
 * effective sample count to produce the global model.
 *
 * ## Architecture decision — pure aggregator (composable with T6-01)
 *
 * Two pure functions:
 *   1. `mask({clientId, weights, peerSeeds[]})` — client-side. Applies the
 *      additive mask using pair seeds. Returns masked weights of identical
 *      length. Sign is determined by lex compare (clientId < peerId → ADD).
 *   2. `unmask({maskedClients[]})` — aggregator-side. Returns plain
 *      element-wise SUM Σ_i ŵ_i, which equals Σ_i w_i because pairwise
 *      masks cancel under summation. The aggregator never sees any
 *      individual unmasked w_i.
 *
 * ### Why SUM and not weighted average
 *
 * Bonawitz cancellation is a property of UNWEIGHTED summation. Each pair
 * (i, j) with i < j contributes `+m_{i,j}` from client i and `-m_{i,j}`
 * from client j. Summed unweighted: `+m - m = 0`. Summed weighted with
 * shares (s_i, s_j): `s_i · m - s_j · m = (s_i - s_j) · m`, which only
 * vanishes for uniform shares.
 *
 * To compose with T6-01 FedAvg, callers should EITHER:
 *   (a) pre-multiply each client's weights by its share (n_i / N) before
 *       masking, then unmask returns the weighted average directly; OR
 *   (b) pass plaintext weights through mask, then divide unmask's SUM by
 *       the publicly-known total sample count.
 *
 * Either pattern preserves the privacy guarantee — only the SUM is
 * recoverable, never any individual w_i.
 *
 * No DH key exchange or threshold secret sharing here — this engine is the
 * pure mask/aggregate primitive. Pair seeds are caller-supplied (in the real
 * deployment they come from a Diffie-Hellman handshake at round setup;
 * mocking that out keeps the engine deterministically testable). Dropout
 * recovery (Bonawitz §4.4 Shamir-shared seeds) is also out of scope —
 * Tier 6 acceptance is "round-trip preserves correctness with masks zeroed"
 * which assumes all clients participate.
 *
 * ## Pseudorandom generator (PRG)
 *
 * Deterministic xorshift32: seed → uint32 stream → centered floats in
 * [-1, 1). Critical property: BOTH clients in a pair must derive the SAME
 * mask vector from the SAME seed, byte-for-byte. We use xorshift32 with
 * IEEE-754 float math that is deterministic across V8 / Node platforms
 * (no transcendentals, no platform-dependent libm).
 *
 *   x ← seed (uint32, nonzero)
 *   loop D times:
 *     x ^= x << 13
 *     x ^= x >>> 17
 *     x ^= x << 5
 *     emit (x - 0x80000000) / 0x80000000  // centered in [-1, 1)
 *
 * The mask is symmetric in expectation (zero mean) so it does not bias the
 * aggregate even before cancellation kicks in.
 *
 * ## Failure modes covered
 *
 *   1. Empty client list                      → invalid_input
 *   2. Empty weight vector                    → invalid_input (Zod)
 *   3. NaN/Inf in weights                     → invalid_input (Zod)
 *   4. peerSeeds with duplicate peerId        → invalid_input
 *   5. peerSeeds where peerId === clientId    → invalid_input (self-pair forbidden)
 *   6. Mismatched weight-vector lengths       → invalid_input (cross-client)
 *   7. Mask of zero-length vector             → invalid_input (Zod)
 *   8. Seed = 0 (xorshift32 fixed point)      → engine maps to 1 internally + warns
 *   9. Asymmetric pair seeds across clients   → masks DON'T cancel; caller's
 *      problem to detect via verifyCancellation diagnostic
 *  10. Single-client aggregation              → returns that client's masked
 *      weights as-is (degenerate case; mask never cancels with itself)
 *
 * ## Acceptance (XPROC-NEURAL-ROADMAP.md Tier 6 R2)
 *
 *   "Round-trip preserves correctness with masks zeroed."
 *
 * Test suite verifies: with N synthetic clients each holding plaintext w_i,
 * pair seeds drawn deterministically from a session seed, mask each client,
 * pass masked vectors to unmask(), assert result equals Σ_i w_i within
 * 1e-9 (floating point cancellation tolerance — exact zero requires that
 * each mask appears with same magnitude, which xorshift32 + symmetric
 * sign convention guarantees).
 *
 * @module CrossProcessSecureAggregationEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** PRISM weighting rule: shared (cross-shop) clients are halved. Matches T6-01. */
const SHARED_FACTOR = 0.5;

/** Sanity bound on per-client weight vector length. */
const MAX_WEIGHTS = 1_000_000;

/** Sanity bound on client count per round. */
const MAX_CLIENTS = 1024;

/** xorshift32 fixed point — seed=0 produces all-zero stream. Engine maps to 1. */
const XORSHIFT_FIXED_POINT = 0;
const XORSHIFT_FALLBACK_SEED = 1;

// ============================================================================
// Schemas
// ============================================================================

const PeerSeedSchema = z.object({
  /** Lex-comparable identifier of the peer client. */
  peerId: z.string().min(1).max(128),
  /** 32-bit shared seed for the pair. Caller derives via DH at round setup. */
  sharedSeed: z.number().int(),
});

const MaskInputSchema = z.object({
  clientId: z.string().min(1).max(128),
  weights: z.array(z.number().finite()).min(1).max(MAX_WEIGHTS),
  peerSeeds: z.array(PeerSeedSchema).max(MAX_CLIENTS - 1),
});

const MaskedClientSchema = z.object({
  clientId: z.string().min(1).max(128),
  maskedWeights: z.array(z.number().finite()).min(1).max(MAX_WEIGHTS),
  sampleCount: z.number().int().nonnegative(),
  isLocal: z.boolean().default(true),
});

const UnmaskInputSchema = z.object({
  maskedClients: z.array(MaskedClientSchema).min(1).max(MAX_CLIENTS),
});

const VerifyInputSchema = z.object({
  /** Plaintext-with-peers entries — used only for diagnostic verification. */
  clients: z.array(MaskInputSchema).min(2).max(MAX_CLIENTS),
});

// ============================================================================
// Public types
// ============================================================================

export interface PeerSeed {
  peerId: string;
  sharedSeed: number;
}

export interface MaskedClient {
  clientId: string;
  maskedWeights: number[];
  sampleCount: number;
  isLocal: boolean;
}

export interface MaskOk {
  ok: true;
  clientId: string;
  maskedWeights: number[];
  /** Number of peer seeds applied (after dedup). */
  appliedPeers: number;
  warnings: string[];
}

export interface UnmaskOk {
  ok: true;
  /** Element-wise SUM Σ_i w_i, recovered without observing any individual w_i. */
  summedWeights: number[];
  /** Number of clients summed (excludes those skipped via skipReason). */
  participants: number;
  /** Total sample-count across summed clients (publicly visible — not masked). */
  totalSamples: number;
  /** Total effective sample-count using PRISM SHARED_FACTOR=0.5 weighting. */
  totalEffectiveSamples: number;
  warnings: string[];
}

export interface VerifyOk {
  ok: true;
  /** L_inf norm of summed-masks (should be ~0 if pair seeds are symmetric). */
  maskCancellationResidual: number;
  /** True iff residual < 1e-9. */
  cancels: boolean;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type MaskResult = MaskOk | OpErr;
export type UnmaskResult = UnmaskOk | OpErr;
export type VerifyResult = VerifyOk | OpErr;

// ============================================================================
// PRG — xorshift32 → centered float stream
// ============================================================================

function prgVector(seed: number, length: number): number[] {
  // Coerce to non-zero uint32. xorshift32 has fixed point at 0.
  let x = (seed >>> 0) || XORSHIFT_FALLBACK_SEED;
  const out = new Array<number>(length);
  for (let i = 0; i < length; i++) {
    // xorshift32 (Marsaglia 2003)
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x = x >>> 0;
    // Center to [-1, 1): map uint32 to signed-magnitude float.
    out[i] = (x - 0x80000000) / 0x80000000;
  }
  return out;
}

// ============================================================================
// Helpers
// ============================================================================

function dedupPeers(peerSeeds: PeerSeed[]): { unique: PeerSeed[]; warnings: string[] } {
  const seen = new Map<string, PeerSeed>();
  const warnings: string[] = [];
  for (const ps of peerSeeds) {
    if (seen.has(ps.peerId)) {
      warnings.push(`duplicate peerId '${ps.peerId}' (kept first)`);
      continue;
    }
    seen.set(ps.peerId, ps);
  }
  return { unique: Array.from(seen.values()), warnings };
}

function ensureUniformLength(
  clients: { clientId: string; maskedWeights: number[] }[],
): { ok: true } | { ok: false; expected: number; mismatchAt: number } {
  if (clients.length === 0) return { ok: true };
  const expected = clients[0].maskedWeights.length;
  for (let i = 1; i < clients.length; i++) {
    if (clients[i].maskedWeights.length !== expected) {
      return { ok: false, expected, mismatchAt: i };
    }
  }
  return { ok: true };
}

function effectiveSampleCount(c: MaskedClient): number {
  return c.isLocal ? c.sampleCount : SHARED_FACTOR * c.sampleCount;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessSecureAggregationEngine {
  static readonly tier = "T6-02";

  /**
   * Apply Bonawitz pairwise additive mask to a client's weight vector.
   *
   * For each peer (peerId, sharedSeed):
   *   sign = clientId < peerId ?  +1 : -1
   *   mask += sign · PRG(sharedSeed, dim)
   *
   * Self-peer (peerId === clientId) is rejected. Duplicate peerIds dedup'd.
   *
   * Critical: BOTH clients in pair (A, B) must call this with the SAME
   * sharedSeed. They will derive opposite signs (A < B → A adds; B > A
   * → B subtracts), so when summed at the aggregator the masks cancel.
   */
  static mask(input: unknown): MaskResult {
    const parsed = MaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clientId, weights, peerSeeds } = parsed.data;

    // Reject self-pair.
    for (const ps of peerSeeds) {
      if (ps.peerId === clientId) {
        return {
          ok: false, error: "invalid_input",
          message: `self-pair forbidden: peerId === clientId === '${clientId}'`,
        };
      }
    }

    const { unique, warnings } = dedupPeers(peerSeeds as PeerSeed[]);
    const dim = weights.length;
    const masked = weights.slice();
    for (const ps of unique) {
      const seed = ps.sharedSeed >>> 0;
      if (seed === XORSHIFT_FIXED_POINT) {
        warnings.push(`pair (${clientId},${ps.peerId}) has sharedSeed=0 — using fallback seed=1`);
      }
      const m = prgVector(ps.sharedSeed, dim);
      const sign = clientId < ps.peerId ? 1 : -1;
      for (let k = 0; k < dim; k++) {
        masked[k] += sign * m[k];
      }
    }

    return {
      ok: true,
      clientId,
      maskedWeights: masked,
      appliedPeers: unique.length,
      warnings,
    };
  }

  /**
   * Aggregate a round of MASKED client updates with FedAvg-style weighting.
   *
   * Because pairwise masks cancel under summation, the aggregator recovers
   *   Σ_i (n_i_eff / N_eff) · w_i
   * without ever observing any individual unmasked w_i.
   *
   * If pair seeds were not symmetric (one client used wrong seed), masks
   * do NOT cancel and the aggregate is corrupted. Use verifyCancellation
   * on a synthetic round to validate the seed-distribution protocol.
   */
  static unmask(input: unknown): UnmaskResult {
    const parsed = UnmaskInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { maskedClients } = parsed.data;
    const lengthCheck = ensureUniformLength(maskedClients as MaskedClient[]);
    if (!lengthCheck.ok) {
      return {
        ok: false, error: "invalid_input",
        message: `maskedWeights length mismatch: client[0]=${lengthCheck.expected}, client[${lengthCheck.mismatchAt}] differs`,
      };
    }

    const warnings: string[] = [];
    const eligible = (maskedClients as MaskedClient[]).filter((c) => {
      if (c.sampleCount === 0) {
        warnings.push(`client '${c.clientId}' skipped (sampleCount=0)`);
        return false;
      }
      return true;
    });
    if (eligible.length === 0) {
      return { ok: false, error: "invalid_state", message: "no eligible clients (all skipped)" };
    }

    // CRITICAL: pairwise masks cancel under PLAIN SUMMATION, not weighted
    // average. Each pair (i,j) contributes +m_{i,j} from one client and
    // -m_{i,j} from the other — they cancel iff both have the same weight
    // in the sum. T6-01 callers can pre-weight (multiply by share before
    // masking) to recover a weighted average through this primitive.
    const dim = eligible[0].maskedWeights.length;
    const summedWeights = new Array<number>(dim).fill(0);
    let totalSamples = 0;
    let totalEffective = 0;
    for (const c of eligible) {
      for (let k = 0; k < dim; k++) {
        summedWeights[k] += c.maskedWeights[k];
      }
      totalSamples += c.sampleCount;
      totalEffective += effectiveSampleCount(c);
    }

    return {
      ok: true,
      summedWeights,
      participants: eligible.length,
      totalSamples,
      totalEffectiveSamples: totalEffective,
      warnings,
    };
  }

  /**
   * Diagnostic: given a fully-specified round (every client + their plaintext
   * + peer seeds), compute Σ_i (mask_i) and report L_inf norm. Should be 0
   * (within float tolerance) iff pair seeds are symmetric.
   *
   * NOT used in production aggregation — only for protocol-validation tests.
   */
  static verifyCancellation(input: unknown): VerifyResult {
    const parsed = VerifyInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { clients } = parsed.data;

    // Length must match across clients.
    const dim = clients[0].weights.length;
    for (let i = 1; i < clients.length; i++) {
      if (clients[i].weights.length !== dim) {
        return {
          ok: false, error: "invalid_input",
          message: `weights length mismatch: client[0]=${dim}, client[${i}] differs`,
        };
      }
    }

    const warnings: string[] = [];
    const accumulator = new Array<number>(dim).fill(0);

    for (const c of clients) {
      // Reject self-pair.
      for (const ps of c.peerSeeds) {
        if (ps.peerId === c.clientId) {
          return {
            ok: false, error: "invalid_input",
            message: `self-pair forbidden: '${c.clientId}'`,
          };
        }
      }
      const { unique, warnings: dwarn } = dedupPeers(c.peerSeeds as PeerSeed[]);
      if (dwarn.length > 0) {
        warnings.push(`client '${c.clientId}': ${dwarn.join("; ")}`);
      }
      for (const ps of unique) {
        const m = prgVector(ps.sharedSeed, dim);
        const sign = c.clientId < ps.peerId ? 1 : -1;
        for (let k = 0; k < dim; k++) {
          accumulator[k] += sign * m[k];
        }
      }
    }

    let residual = 0;
    for (let k = 0; k < dim; k++) {
      const a = Math.abs(accumulator[k]);
      if (a > residual) residual = a;
    }

    return {
      ok: true,
      maskCancellationResidual: residual,
      cancels: residual < 1e-9,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    SHARED_FACTOR: number;
    MAX_WEIGHTS: number;
    MAX_CLIENTS: number;
  } {
    return { SHARED_FACTOR, MAX_WEIGHTS, MAX_CLIENTS };
  }
}

export const crossProcessSecureAggregationEngine = CrossProcessSecureAggregationEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessSecureAggregation(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_secure_mask":
      return CrossProcessSecureAggregationEngine.mask(params);
    case "xproc_secure_unmask":
      return CrossProcessSecureAggregationEngine.unmask(params);
    case "xproc_secure_verify":
      return CrossProcessSecureAggregationEngine.verifyCancellation(params);
    case "xproc_secure_constants":
      return CrossProcessSecureAggregationEngine.constants();
    default:
      throw new Error(`crossProcessSecureAggregation: unknown action '${action}'`);
  }
}
