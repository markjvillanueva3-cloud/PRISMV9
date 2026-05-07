/**
 * TransferLearningBridgeEngine — Cross-domain analogy finder
 *
 * Phase 0.18 U-AGI3 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a problem
 * description, finds previously-solved analogous problems in *other* PRISM
 * domains (milling → turning → grinding → wire-edm → welding → sinker-edm,
 * etc.) via lexical embedding + structural tag mapping.
 *
 * This is NOT machine-to-machine ML parameter transfer — that is
 * TransferLearningEngine / TransferLearningAdapterEngine / LatheTransferLearning
 * (those do GP / EWC / fine-tuning of numeric parameters).
 *
 * This engine answers: "I'm stuck on <problem>. Where else in PRISM has
 * someone solved something structurally similar?"
 *
 * Method:
 *   1. Each registered SolvedProblem is embedded as a normalized bag-of-words
 *      vector over title + description + tags (lowercased, deduped, stopword
 *      stripped). Simple, deterministic, no model weights required.
 *   2. Query is embedded the same way.
 *   3. Cosine similarity on the shared vocabulary gives semantic score.
 *   4. Jaccard on tag sets gives structural overlap.
 *   5. Combined score = 0.7·cosine + 0.3·jaccard (weighted to prefer semantic
 *      match, but reward explicit structural tags).
 *   6. Cross-domain bias: matches from a *different* domain than the query get
 *      a 10% multiplicative boost — the whole point is to transport solutions
 *      across domain boundaries.
 *
 * References:
 *   - Gentner (1983) "Structure-Mapping: A Theoretical Framework for Analogy"
 *     Cognitive Science 7(2) — structural-mapping theory of analogy.
 *   - Salton & Buckley (1988) "Term-Weighting Approaches in Automatic Text
 *     Retrieval" Information Processing & Management — cosine on tf vectors.
 *   - Jaccard (1912) "The Distribution of the Flora in the Alpine Zone"
 *     — set-overlap coefficient.
 *
 * Exit gate (plan:751):
 *   findAnalogies("adaptive spindle") returns ≥1 cross-domain match in <500ms
 *   after registering seed corpus.
 *
 * No I/O. No mutation of inputs. Pure in-memory state.
 *
 * @module engines/TransferLearningBridgeEngine
 * @milestone PP-0.18-U-AGI3
 */

export interface SolvedProblem {
  /** Unique id across all registered problems. */
  id: string;
  /** Canonical PRISM domain: milling | turning | grinding | wire-edm | sinker-edm | welding | cad | cam | post | quality | business | ... */
  domain: string;
  /** One-line problem statement. */
  title: string;
  /** Full problem description — the substrate for lexical matching. */
  description: string;
  /** Optional structural tags. Participate in Jaccard overlap term. */
  tags?: readonly string[];
  /** What was actually done to solve it. Reported back verbatim with the match. */
  solution: string;
}

export interface AnalogyQuery {
  /** Free-text problem statement. */
  description: string;
  /** Optional domain of the current problem — used for cross-domain boost and `excludeSameDomain`. */
  domain?: string;
  /** Optional structural tags describing the current problem. */
  tags?: readonly string[];
}

export interface AnalogyMatch {
  problem: SolvedProblem;
  /** Cosine similarity on shared vocabulary [0,1]. */
  cosine: number;
  /** Jaccard on tag sets [0,1]. 0 when either side has no tags. */
  jaccard: number;
  /** True iff problem.domain !== query.domain (and query.domain provided). */
  crossDomain: boolean;
  /** Combined ranking score. Cross-domain gets a 10% bonus. */
  score: number;
  rationale: string;
}

export interface FindAnalogiesOptions {
  /** Cap on returned matches. Default 5. */
  limit?: number;
  /** Minimum combined score to include. Default 0.05 (very permissive). */
  minScore?: number;
  /** If true, drop same-domain problems entirely. */
  crossDomainOnly?: boolean;
}

// ─── Implementation ───────────────────────────────────────────────────

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "but",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "should", "could", "can", "may",
  "with", "by", "from", "as", "that", "this", "these", "those", "it", "its",
  "we", "our", "your", "their", "i", "you", "he", "she", "they",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function tfVector(tokens: readonly string[]): Map<string, number> {
  const v = new Map<string, number>();
  for (const t of tokens) v.set(t, (v.get(t) ?? 0) + 1);
  return v;
}

function l2Norm(v: ReadonlyMap<string, number>): number {
  let s = 0;
  for (const c of v.values()) s += c * c;
  return Math.sqrt(s);
}

function cosine(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  const na = l2Norm(a);
  const nb = l2Norm(b);
  if (na === 0 || nb === 0) return 0;
  let dot = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [t, ca] of small) {
    const cb = large.get(t);
    if (cb !== undefined) dot += ca * cb;
  }
  return dot / (na * nb);
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (large.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

interface IndexedProblem {
  problem: SolvedProblem;
  vector: Map<string, number>;
  tagSet: Set<string>;
}

export class TransferLearningBridgeEngine {
  private readonly index = new Map<string, IndexedProblem>();

  /** Register a solved problem. Idempotent on id — re-registering overwrites. */
  register(problem: SolvedProblem): void {
    this.assertValid(problem);
    const tokens = tokenize(`${problem.title} ${problem.description} ${(problem.tags ?? []).join(" ")}`);
    const vector = tfVector(tokens);
    const tagSet = new Set((problem.tags ?? []).map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0));
    this.index.set(problem.id, { problem: { ...problem, tags: problem.tags ? [...problem.tags] : undefined }, vector, tagSet });
  }

  /** Bulk register. Throws on first invalid entry; already-inserted entries are kept. */
  registerMany(problems: readonly SolvedProblem[]): void {
    for (const p of problems) this.register(p);
  }

  /**
   * Find analogous solved problems. Accepts a free-text string or a structured
   * AnalogyQuery.
   *
   * Complexity: O(N·V) where N is registered problems and V is average shared
   * vocabulary — sufficient for the <500ms exit gate at the current corpus
   * scale (<10k problems). Swap in LSH/embedding retrieval if corpus grows.
   */
  findAnalogies(query: string | AnalogyQuery, opts: FindAnalogiesOptions = {}): AnalogyMatch[] {
    const q: AnalogyQuery = typeof query === "string" ? { description: query } : query;
    if (!q.description || q.description.trim() === "") {
      throw new Error("query description required");
    }
    const limit = opts.limit ?? 5;
    const minScore = opts.minScore ?? 0.05;
    const crossDomainOnly = opts.crossDomainOnly ?? false;

    const queryTokens = tokenize(`${q.description} ${(q.tags ?? []).join(" ")}`);
    const queryVec = tfVector(queryTokens);
    const queryTags = new Set((q.tags ?? []).map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0));
    const queryDomain = q.domain?.toLowerCase().trim();

    const matches: AnalogyMatch[] = [];
    for (const { problem, vector, tagSet } of this.index.values()) {
      const isCross = queryDomain !== undefined && problem.domain.toLowerCase() !== queryDomain;
      if (crossDomainOnly && !isCross) continue;

      const cos = cosine(queryVec, vector);
      const jac = jaccard(queryTags, tagSet);
      // 0.7·cosine + 0.3·jaccard — favors semantic match but honors explicit tags.
      let score = 0.7 * cos + 0.3 * jac;
      // 10% cross-domain bonus: the whole point is to transport across boundaries.
      if (isCross) score *= 1.1;

      if (score < minScore) continue;

      matches.push({
        problem,
        cosine: round4(cos),
        jaccard: round4(jac),
        crossDomain: isCross,
        score: round4(score),
        rationale: `cosine=${cos.toFixed(3)} jaccard=${jac.toFixed(3)}${isCross ? " +10% cross-domain" : ""}`,
      });
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Deterministic tiebreak: prefer cross-domain, then lexicographic id.
      if (a.crossDomain !== b.crossDomain) return a.crossDomain ? -1 : 1;
      return a.problem.id.localeCompare(b.problem.id);
    });

    return limit > 0 ? matches.slice(0, limit) : matches;
  }

  /** Return all registered problems (stable order by id). */
  list(): SolvedProblem[] {
    return [...this.index.values()]
      .map((i) => i.problem)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  size(): number {
    return this.index.size;
  }

  clear(): void {
    this.index.clear();
  }

  private assertValid(p: SolvedProblem): void {
    if (!p.id || p.id.trim() === "") throw new Error("id required");
    if (!p.domain || p.domain.trim() === "") throw new Error("domain required");
    if (!p.title || p.title.trim() === "") throw new Error("title required");
    if (!p.description || p.description.trim() === "") throw new Error("description required");
    if (!p.solution || p.solution.trim() === "") throw new Error("solution required");
    if (p.tags && !Array.isArray(p.tags)) throw new Error("tags must be an array");
  }
}

export const transferLearningBridgeEngine = new TransferLearningBridgeEngine();
