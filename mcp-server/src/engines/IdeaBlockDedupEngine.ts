/**
 * IdeaBlockDedupEngine
 * ====================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/E2/U-IDEABLOCK-DEDUP
 *
 * Iterative cosine-similarity deduplication of IdeaBlocks (the atomic
 * semantic units E1 extracts from `.md` notes). Near-duplicate blocks —
 * the same claim phrased slightly differently across many notes — are
 * collapsed to a single canonical block while their provenance
 * (source_path of every absorbed block) is preserved in a merge map so
 * D1 (provenance) and E3 (IdeaBlock-level RAG) lose nothing.
 *
 * Why ITERATIVE + CONNECTED-COMPONENTS (the load-bearing design point):
 *   - Within a round, clustering is the connected components of the
 *     ≥threshold cosine graph (union-find), NOT single-linkage to a
 *     seed. So a transitive family A≈B, B≈C, A≉C collapses in ONE round
 *     (A–B and B–C edges put all three in one component) and the result
 *     is invariant to input order AND to which content-hash id happens
 *     to be smallest (an earlier seed-linkage design was non-
 *     deterministic w.r.t. id assignment — fixed 2026-05-17 per E2
 *     scrutiny Arm-B P0-2).
 *   - After merging a component, its canonical's working VECTOR becomes
 *     the centroid (arithmetic mean) of the component's member vectors —
 *     a pure, deterministic, embedder-free operation. This is the real
 *     "re-embed". Its effect is bounded and honest: it lets a LATER round
 *     merge tight components whose centroids have crossed threshold where
 *     individual members were just under it. It does NOT manufacture
 *     merges between components all of whose members are >threshold-angle
 *     apart (a centroid lies in the convex cone of its members, so it
 *     cannot reach farther than they do). The bulk of duplicate collapse
 *     therefore happens in round 1 via connected components; the centroid
 *     adds marginal cross-component merges in later rounds. (An earlier
 *     design re-embedded the canonical's UNCHANGED text, a no-op on every
 *     real embedder — the iteration did nothing; fixed 2026-05-17 per
 *     E2 scrutiny Arm-B P0-1.)
 *   - Convergence is explicit: a round with zero new merges means the
 *     set is stable → stop early. Typical shape is 2 rounds (round 1
 *     collapses, round 2 confirms 0 merges); centroid bridging
 *     occasionally adds a round. `converged` is true ONLY when a real
 *     zero-merge round ran — never asserted on a maxRounds-capped set
 *     that may still hold an above-threshold pair (R12).
 * The canonical BLOCK is always a real, unmodified min-id member; only
 * its clustering vector is the centroid. We dedup, we never synthesize
 * merged text.
 *
 * Two-phase, mirroring the B3/B5/B6/D5 family:
 *   1. dedupVectors(items, opts)  — PURE deterministic core over
 *      {block, vector} pairs. No I/O, no embedder. Connected-components
 *      clustering + centroid re-embed + convergence. This is the
 *      hermetic-test surface AND the production engine — its behavior is
 *      identical on the wired path (no injected fixture needed to make
 *      the iteration meaningful).
 *   2. dedupBlocks(blocks, opts)  — public path: schema-validates each
 *      block (untrusted dispatcher input), embeds via the injected
 *      INITIAL embedder (DI; default = deterministic local fallback so it
 *      works with Qdrant/Ollama DOWN — the fleet's steady state per the
 *      2026-05-17 Docker-wedged regression), then delegates to
 *      dedupVectors.
 *
 * Determinism: clustering iterates blocks in ascending `id` order and the
 * canonical of every cluster is the lexicographically-smallest `id`, so
 * the same corpus always collapses to the same canonical set regardless
 * of input order. `now` is injectable for byte-stable timestamps in tests.
 *
 * Advisory / non-destructive: returns the canonical set + merge map; it
 * never deletes anything. The caller (E3 / governance) decides whether to
 * persist. Rollback per the unit spec is simply "don't apply the result".
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/E2/U-IDEABLOCK-DEDUP
 * @module engines/IdeaBlockDedupEngine
 */

import { z } from "zod";
import { IdeaBlockSchema, type IdeaBlock } from "../schemas/ideaBlockSchema.js";

// ---------- Public types -----------------------------------------------------

export interface DedupItem {
  block: IdeaBlock;
  /** Dense embedding of the block (question + answer). */
  vector: number[];
}

export interface IdeaBlockDedupResult {
  /** Canonical (deduplicated) blocks, ascending by id. */
  canonicalBlocks: IdeaBlock[];
  /** canonicalId → sorted list of absorbed (non-canonical) block ids. */
  mergeMap: Record<string, string[]>;
  inputCount: number;
  outputCount: number;
  /** Rounds actually executed (≤ maxRounds; fewer if it converged). */
  rounds: number;
  /** True iff a round produced zero new merges (stable set reached). */
  converged: boolean;
  /** Merges performed in each executed round (convergence evidence). */
  roundMerges: number[];
  /** Effective threshold after clamping. */
  threshold: number;
  /** Effective maxRounds after clamping. */
  maxRounds: number;
  /** True iff input exceeded maxBlocks and was deterministically capped. */
  truncated: boolean;
  warnings: string[];
  /** ISO-8601 (pinned via opts.now for determinism). */
  generatedAt: string;
}

export interface IdeaBlockDedupOptions {
  /** Cosine threshold 0..1 to treat two blocks as duplicates (default 0.82). */
  threshold?: number;
  /** Max clustering rounds 1..20 (default 4). */
  maxRounds?: number;
  /** Override "now" (ms epoch) for deterministic timestamps in tests. */
  now?: number;
  /**
   * Injected INITIAL embedder: block text → dense vector. Used ONLY by the
   * public dedupBlocks() path to turn raw blocks into vectors. Omitted →
   * deterministic local fallback (works with Qdrant/Ollama unreachable —
   * the fleet's steady state). It is NOT the re-embed: the spec's
   * "re-embed" step is the deterministic centroid of the merged
   * component's member vectors (see dedupVectors), so iteration works on
   * every embedder including the fallback. dedupVectors ignores this
   * option entirely (it receives vectors already).
   */
  embed?: (text: string) => number[];
  /** Hard cap on input blocks (default 5000) to bound the O(n²)/round cost. */
  maxBlocks?: number;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_THRESHOLD = 0.82;
const DEFAULT_MAX_ROUNDS = 4;
const DEFAULT_MAX_BLOCKS = 5000;
const FALLBACK_EMBED_DIM = 64;

const MAX_ROUNDS_CEIL = 20;
const MAX_BLOCKS_CEIL = 50_000;

export const IdeaBlockDedupOptionsSchema = z.object({
  threshold: z.number().min(0).max(1).optional(),
  maxRounds: z.number().int().min(1).max(MAX_ROUNDS_CEIL).optional(),
  now: z.number().finite().optional(),
  embed: z.function().optional(),
  maxBlocks: z.number().int().min(1).max(MAX_BLOCKS_CEIL).optional(),
}).passthrough();

function validateOptions(opts: IdeaBlockDedupOptions): IdeaBlockDedupOptions {
  IdeaBlockDedupOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers (pure) ---------------------------------------------------

/**
 * Dense cosine similarity. Convention-matched to KnowledgeDeduplicationEngine
 * (dotProduct / normA / normB / `denom === 0 ? 0`) but over number[] not a
 * sparse Map. Returns 0 (NOT a merge) for: dim mismatch, zero vector, or any
 * non-finite component — so embedding-poison (NaN/Infinity) can never force a
 * spurious merge (R12: a corrupt vector must degrade safe, not collapse the
 * corpus).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0 || !Number.isFinite(denom)) return 0;
  const sim = dotProduct / denom;
  if (!Number.isFinite(sim)) return 0;
  // Clamp tiny FP overshoot so a threshold of exactly 1 is well-defined.
  if (sim > 1) return 1;
  if (sim < -1) return -1;
  return sim;
}

/**
 * Deterministic local fallback embedder — a bag-of-char-bigrams hash into a
 * fixed-dim L2-normalizable vector. NOT semantically strong (production wires
 * a real Qdrant/Ollama embedder via opts.embed); its only contract is that
 * identical text → identical vector and near-identical text → high cosine,
 * so dedup degrades gracefully (not silently off) when embeddings are
 * unavailable. Pure + dependency-free.
 */
function fallbackEmbed(text: string): number[] {
  const v = new Array<number>(FALLBACK_EMBED_DIM).fill(0);
  const s = text.toLowerCase().normalize("NFC");
  for (let i = 0; i < s.length - 1; i++) {
    const bigram = s.charCodeAt(i) * 131 + s.charCodeAt(i + 1);
    v[bigram % FALLBACK_EMBED_DIM] += 1;
  }
  return v;
}

/** Canonical text of a block for the INITIAL embed (dedupBlocks only). */
function blockText(b: IdeaBlock): string {
  return `${b.question}\n${b.answer}`;
}

/**
 * Arithmetic-mean (centroid) of equal-dim vectors, skipping any vector
 * with a non-finite component (embedding-poison must not corrupt the
 * mean). Returns `fallback` (the canonical's own vector) when no finite
 * same-dim member exists. Pure + deterministic (order-free sum). This is
 * the spec's "re-embed" step — no embedder, works on the wired path.
 */
function centroid(vectors: number[][], dim: number, fallback: number[]): number[] {
  const acc = new Array<number>(dim).fill(0);
  let used = 0;
  for (const vec of vectors) {
    if (vec.length !== dim) continue;
    let finiteOk = true;
    for (let k = 0; k < dim; k++) {
      if (!Number.isFinite(vec[k])) { finiteOk = false; break; }
    }
    if (!finiteOk) continue;
    for (let k = 0; k < dim; k++) acc[k] += vec[k];
    used++;
  }
  if (used === 0) return fallback;
  for (let k = 0; k < dim; k++) acc[k] /= used;
  return acc;
}

// ---------- Engine -----------------------------------------------------------

export class IdeaBlockDedupEngine {
  readonly name = "IdeaBlockDedupEngine";

  /**
   * PURE core — iterative connected-components cosine clustering over
   * pre-embedded items. No I/O, no embedder. Deterministic: the result is
   * invariant to input array order AND to id assignment (connected
   * components depend only on the vector geometry; canonical = min-id;
   * centroid re-embed is an order-free mean). Never throws (bad options
   * are caught by validateOptions; everything else degrades to a warning
   * + safe result).
   *
   * @param items  {block, vector} pairs.
   * @param opts   threshold / maxRounds / maxBlocks / now (embed ignored).
   */
  dedupVectors(items: DedupItem[], opts: IdeaBlockDedupOptions = {}): IdeaBlockDedupResult {
    validateOptions(opts);
    const now = opts.now ?? Date.now();
    const generatedAt = new Date(now).toISOString();
    const threshold = clampUnit(opts.threshold, DEFAULT_THRESHOLD);
    const maxRounds = clampInt(opts.maxRounds, DEFAULT_MAX_ROUNDS, 1, MAX_ROUNDS_CEIL);
    const maxBlocks = clampInt(opts.maxBlocks, DEFAULT_MAX_BLOCKS, 1, MAX_BLOCKS_CEIL);
    const warnings: string[] = [];

    const inputCount = items.length;
    let working = items.slice();
    let truncated = false;
    if (working.length > maxBlocks) {
      // Deterministic cap (sorted by id) — surfaced LOUDLY, never silent (R12).
      working = working.slice().sort((x, y) => idOf(x).localeCompare(idOf(y))).slice(0, maxBlocks);
      truncated = true;
      warnings.push(`input ${inputCount} blocks exceeds maxBlocks ${maxBlocks}; processed the first ${maxBlocks} by ascending id (rest UNPROCESSED — re-run on the remainder)`);
    }

    // Provenance accumulator: canonicalId → Set(absorbed ids).
    const merges = new Map<string, Set<string>>();
    const roundMerges: number[] = [];
    let rounds = 0;
    let converged = false;

    while (rounds < maxRounds) {
      rounds++;
      // Sort by id only so the canonical (min id) of any component is
      // working[componentIndices[0]]; the COMPONENT STRUCTURE itself does
      // not depend on this order (it is the connected components of the
      // geometry-only similarity graph).
      working.sort((x, y) => idOf(x).localeCompare(idOf(y)));
      const n = working.length;

      // Union-find over the ≥threshold cosine graph. Transitive WITHIN the
      // round: A–B and B–C edges put A,B,C in one component even if
      // cos(A,C) < threshold (the iterative-dedup intent). Union-by-min-
      // index keeps roots deterministic.
      const parent = new Array<number>(n);
      for (let i = 0; i < n; i++) parent[i] = i;
      const find = (i: number): number => {
        let r = i;
        while (parent[r] !== r) r = parent[r];
        while (parent[i] !== r) { const nx = parent[i]; parent[i] = r; i = nx; }
        return r;
      };
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (cosineSimilarity(working[i].vector, working[j].vector) >= threshold) {
            const ri = find(i);
            const rj = find(j);
            if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
          }
        }
      }
      const compMap = new Map<number, number[]>();
      for (let i = 0; i < n; i++) {
        const r = find(i);
        const g = compMap.get(r);
        if (g) g.push(i);
        else compMap.set(r, [i]);
      }
      // Each component's indices ascending (= ascending id, working is
      // id-sorted) so element [0] is the min-id canonical; components
      // ordered by canonical id for a deterministic next-working order.
      const components = [...compMap.values()].sort(
        (a, b) => idOf(working[a[0]]).localeCompare(idOf(working[b[0]])),
      );

      const nextWorking: DedupItem[] = [];
      let mergesThisRound = 0;

      for (const g of components) {
        const canonical = working[g[0]];
        const canId = idOf(canonical);
        if (g.length === 1) {
          nextWorking.push(canonical);
          continue;
        }
        const absorbedSet = merges.get(canId) ?? new Set<string>();
        for (let k = 1; k < g.length; k++) {
          const aId = idOf(working[g[k]]);
          mergesThisRound++;
          absorbedSet.add(aId);
          // Carry forward provenance when an absorbed block was itself a
          // prior canonical (a component absorbing a prior component).
          const prior = merges.get(aId);
          if (prior) {
            for (const p of prior) absorbedSet.add(p);
            merges.delete(aId);
          }
        }
        merges.set(canId, absorbedSet);
        // Re-embed = centroid of the component's member vectors (g
        // includes the canonical's own index g[0], so the canonical's
        // vector is part of the mean — the centroid is the component's
        // representative point, not a shift away from it). The spec's
        // "re-embed" step — deterministic, embedder-free, so a LATER round
        // can merge whole components whose centroids have drifted within
        // threshold (an earlier text-re-embed design was a no-op).
        const dim = canonical.vector.length;
        const memberVecs = g.map((ix) => working[ix].vector);
        const canVec = centroid(memberVecs, dim, canonical.vector);
        const mismatched = memberVecs.filter((v) => v.length !== dim).length;
        if (mismatched > 0) {
          warnings.push(`component ${canId}: ${mismatched} member(s) had a mismatched vector dim — excluded from centroid`);
        }
        nextWorking.push({ block: canonical.block, vector: canVec });
      }

      roundMerges.push(mergesThisRound);
      working = nextWorking;
      if (mergesThisRound === 0) {
        converged = true;
        break;
      }
    }

    working.sort((x, y) => idOf(x).localeCompare(idOf(y)));
    const mergeMap: Record<string, string[]> = {};
    for (const [canId, set] of merges) {
      mergeMap[canId] = [...set].sort((a, b) => a.localeCompare(b));
    }

    return {
      canonicalBlocks: working.map((w) => w.block),
      mergeMap,
      inputCount,
      outputCount: working.length,
      rounds,
      converged,
      roundMerges,
      threshold,
      maxRounds,
      truncated,
      warnings,
      generatedAt,
    };
  }

  /**
   * Public path — schema-validate untrusted blocks, embed each (injected
   * embedder or deterministic fallback), then run the pure core. A block
   * that fails IdeaBlockSchema is dropped with a warning (fail-loud, never
   * a silent skip; the rest still dedup).
   *
   * @param blocks  Raw IdeaBlocks (e.g. dispatcher input — untrusted).
   * @param opts    Same options as dedupVectors.
   */
  dedupBlocks(blocks: unknown[], opts: IdeaBlockDedupOptions = {}): IdeaBlockDedupResult {
    validateOptions(opts);
    const embed = opts.embed ?? fallbackEmbed;
    const items: DedupItem[] = [];
    const preWarnings: string[] = [];
    if (!Array.isArray(blocks)) {
      const r = this.dedupVectors([], opts);
      r.warnings.unshift("blocks input is not an array — treated as empty");
      return r;
    }
    for (let i = 0; i < blocks.length; i++) {
      const parsed = IdeaBlockSchema.safeParse(blocks[i]);
      if (!parsed.success) {
        preWarnings.push(`block[${i}] failed IdeaBlockSchema (${parsed.error.issues.length} issue(s)) — dropped`);
        continue;
      }
      let vec: number[];
      try {
        vec = embed(blockText(parsed.data));
      } catch (e) {
        preWarnings.push(`embed for block[${i}] (${parsed.data.id}) threw — dropped (${e instanceof Error ? e.message : String(e)})`);
        continue;
      }
      if (!Array.isArray(vec) || vec.length === 0) {
        preWarnings.push(`embed for block[${i}] (${parsed.data.id}) returned empty — dropped`);
        continue;
      }
      items.push({ block: parsed.data, vector: vec });
    }
    const result = this.dedupVectors(items, opts);
    result.warnings = [...preWarnings, ...result.warnings];
    return result;
  }
}

// ---------- Helpers (pure, shared) ------------------------------------------

function idOf(it: DedupItem): string {
  return it.block.id;
}

function clampUnit(v: number | undefined, dflt: number): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return dflt;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function clampInt(v: number | undefined, dflt: number, lo: number, hi: number): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return dflt;
  const n = Math.trunc(v);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

// ---------- Helpers exported for tests --------------------------------------

/** @internal — exported for the test suite only; do NOT depend on from prod. */
export const _internals = {
  cosineSimilarity,
  fallbackEmbed,
  blockText,
  centroid,
  clampUnit,
  clampInt,
  DEFAULT_THRESHOLD,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_MAX_BLOCKS,
  FALLBACK_EMBED_DIM,
};

// ---------- Singleton --------------------------------------------------------

export const ideaBlockDedupEngine = new IdeaBlockDedupEngine();

export default IdeaBlockDedupEngine;

export function runIdeaBlockDedup(
  blocks: unknown[],
  opts: IdeaBlockDedupOptions = {},
): IdeaBlockDedupResult {
  validateOptions(opts);
  return ideaBlockDedupEngine.dedupBlocks(blocks, opts);
}
