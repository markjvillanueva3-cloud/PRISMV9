/**
 * VaultBacklinkEngine — score one ingested chunk against corpora of PRISM
 * engine / dispatcher-action / skill descriptions and return the top-K
 * "related PRISM" backlinks per kind. Pure-keyword IDF-weighted Jaccard
 * (no embeddings dependency); deterministic and offline-safe.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U03.
 *
 * Why this exists
 * ---------------
 * P14-U02 ingests PDFs into Qdrant under kind='wiki'. By itself the corpus
 * is a flat keyword index — useful for retrieval but not navigable. P14-U03
 * fixes that by computing, for each ingested chunk, a "Related PRISM" section
 * pointing at engines / dispatcher actions / skills whose descriptions
 * overlap the chunk.
 *
 * Open an Iscar tooling-catalog page in Obsidian → see relevant code links
 * (e.g. ToolingCatalogEngine, prism_calc:cutting_force, /tool-select).
 *
 * Design
 * ------
 * Pure functions over `Map<token, count>` token bags. The engine never does
 * I/O — corpora are passed in as arrays of `BacklinkCandidate`. Driver code
 * (scripts/auto-backlink-vault.mjs) handles disk reads of ENGINE_DIGEST.md /
 * DISPATCHER_DIGEST.md / commands/*.md.
 *
 * Scoring is IDF-weighted Jaccard:
 *
 *      idf(t)        = log(1 + |N| / df(t))
 *      score(c, q)   = Σ_{t ∈ q ∩ c}  idf(t) · min(q[t], c[t])
 *                     ──────────────────────────────────────
 *                          √(|q|·|c|)         (length-normalize)
 *
 * Length normalization matters: without it, very long descriptions
 * dominate purely because they contain more rare tokens.
 *
 * NaN / Infinity scores are filtered out before ranking so adversarial
 * candidates with empty token bags can't bubble to the top via 0/0.
 *
 * @module engines/VaultBacklinkEngine
 */

const MIN_TOKEN_LEN = 3;
const TOKEN_RE = new RegExp(`[a-z][a-z0-9_]{${MIN_TOKEN_LEN - 1},}`, "g");
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.05;
// Cap chunk length so adversarial 10MB chunks can't OOM tokenization.
const MAX_CHUNK_CHARS = 50_000;

export type BacklinkKind = "engine" | "dispatcher_action" | "skill";

export interface BacklinkCandidate {
  /** Stable id, e.g. "KnowledgeIngestEngine" or "prism_knowledge:wiki_ingest_pdf" or "/tool-select". */
  id: string;
  kind: BacklinkKind;
  /** One-line description used as the search corpus. */
  description: string;
}

export interface ScoredBacklink extends BacklinkCandidate {
  /** IDF-weighted Jaccard score, length-normalized into [0, ~]. */
  score: number;
  /** Distinct query tokens that hit this candidate. */
  uniqueOverlap: number;
}

export interface BacklinkResult {
  ok: boolean;
  chunkText: string;
  engines: ScoredBacklink[];
  dispatcher_actions: ScoredBacklink[];
  skills: ScoredBacklink[];
  totalScored: number;
  durationMs: number;
}

export interface BacklinkOpts {
  /** Per-kind top-K. Default 5. */
  topK?: number;
  /** Minimum score threshold (filters before ranking). Default 0.05. */
  minScore?: number;
  /** Engine corpus. */
  candidatesEngine?: readonly BacklinkCandidate[];
  /** Dispatcher-action corpus. */
  candidatesAction?: readonly BacklinkCandidate[];
  /** Skill corpus. */
  candidatesSkill?: readonly BacklinkCandidate[];
}

interface IndexedCorpus {
  candidates: BacklinkCandidate[];
  tokenBags: Map<string, number>[];
  idf: Map<string, number>;
}

export class VaultBacklinkEngine {
  /**
   * Score one chunk against three corpora and return top-K per kind.
   *
   * Throws when chunkText is not a string. Returns an empty BacklinkResult
   * (ok=true) when the chunk has no usable tokens.
   */
  findBacklinksForChunk(chunkText: string, opts: BacklinkOpts = {}): BacklinkResult {
    const start = Date.now();
    if (typeof chunkText !== "string") {
      throw new TypeError("VaultBacklinkEngine.findBacklinksForChunk: chunkText must be a string");
    }
    const topK = opts.topK ?? DEFAULT_TOP_K;
    const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
    if (!Number.isFinite(topK) || topK <= 0) {
      throw new RangeError("VaultBacklinkEngine: topK must be a positive finite number");
    }
    if (!Number.isFinite(minScore) || minScore < 0) {
      throw new RangeError("VaultBacklinkEngine: minScore must be a non-negative finite number");
    }

    const truncated = chunkText.length > MAX_CHUNK_CHARS ? chunkText.slice(0, MAX_CHUNK_CHARS) : chunkText;
    const queryTokens = this.tokenize(truncated);

    if (queryTokens.size === 0) {
      return {
        ok: true,
        chunkText,
        engines: [],
        dispatcher_actions: [],
        skills: [],
        totalScored: 0,
        durationMs: Date.now() - start,
      };
    }

    const engineIdx = this.indexCorpus(opts.candidatesEngine ?? []);
    const actionIdx = this.indexCorpus(opts.candidatesAction ?? []);
    const skillIdx = this.indexCorpus(opts.candidatesSkill ?? []);

    const engines = this.rankAgainst(queryTokens, engineIdx, topK, minScore);
    const dispatcher_actions = this.rankAgainst(queryTokens, actionIdx, topK, minScore);
    const skills = this.rankAgainst(queryTokens, skillIdx, topK, minScore);

    return {
      ok: true,
      chunkText,
      engines,
      dispatcher_actions,
      skills,
      totalScored: engineIdx.candidates.length + actionIdx.candidates.length + skillIdx.candidates.length,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Render a Markdown "## Related PRISM" section from a BacklinkResult.
   * Empty kinds are omitted entirely. Returns "" when nothing to show.
   *
   * Output is deterministic — same result always renders the same string —
   * so a follow-up run that finds no changes produces a no-op diff.
   */
  renderBacklinksMarkdown(result: BacklinkResult): string {
    const total = result.engines.length + result.dispatcher_actions.length + result.skills.length;
    if (total === 0) return "";
    const lines: string[] = ["", "## Related PRISM", ""];
    if (result.engines.length > 0) {
      lines.push("### Engines");
      for (const e of result.engines) {
        lines.push(`- \`${e.id}\` (score ${e.score.toFixed(3)}, overlap ${e.uniqueOverlap}) — ${this.escape(e.description)}`);
      }
      lines.push("");
    }
    if (result.dispatcher_actions.length > 0) {
      lines.push("### Dispatcher actions");
      for (const a of result.dispatcher_actions) {
        lines.push(`- \`${a.id}\` (score ${a.score.toFixed(3)}, overlap ${a.uniqueOverlap}) — ${this.escape(a.description)}`);
      }
      lines.push("");
    }
    if (result.skills.length > 0) {
      lines.push("### Skills");
      for (const s of result.skills) {
        lines.push(`- \`${s.id}\` (score ${s.score.toFixed(3)}, overlap ${s.uniqueOverlap}) — ${this.escape(s.description)}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  /**
   * Parse a digest file (one item per line, "ID — description" or "ID: description"
   * formats supported) into a BacklinkCandidate[]. Lines without a separator
   * are skipped silently. Used by the driver to read ENGINE_DIGEST.md /
   * DISPATCHER_DIGEST.md.
   *
   * Adversarial input handled:
   *   - empty string → []
   *   - lines with only whitespace → skipped
   *   - id or description longer than 500 chars → truncated
   */
  parseDigest(digestText: string, kind: BacklinkKind): BacklinkCandidate[] {
    if (typeof digestText !== "string") return [];
    const out: BacklinkCandidate[] = [];
    for (const raw of digestText.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.length === 0) continue;
      // Support both "id — description" (em-dash) and "id: description"
      // Prefer em-dash split; fall back to colon for digests that use it.
      let sep = line.indexOf(" — ");
      let sepLen = 3;
      if (sep < 0) {
        sep = line.indexOf(": ");
        sepLen = 2;
      }
      if (sep <= 0) continue;
      const id = line.slice(0, sep).replace(/^[`#\-*\s]+|[`\s]+$/g, "").slice(0, 500);
      const description = line.slice(sep + sepLen).trim().slice(0, 500);
      if (id.length === 0 || description.length === 0) continue;
      out.push({ id, kind, description });
    }
    return out;
  }

  /**
   * Lowercase word tokens of length ≥ MIN_TOKEN_LEN with frequencies.
   * Public for testing — same shape as ObsidianMemoryRagEngine.tokenize for
   * cross-engine consistency.
   */
  tokenize(text: string): Map<string, number> {
    const out = new Map<string, number>();
    if (typeof text !== "string") return out;
    const words = text.toLowerCase().match(TOKEN_RE) ?? [];
    for (const w of words) out.set(w, (out.get(w) ?? 0) + 1);
    return out;
  }

  // ---- internal helpers ----

  /**
   * Build an inverse-document-frequency index over a corpus.
   *
   *   df(t)  = number of candidates containing token t
   *   idf(t) = log(1 + N / df(t))
   *
   * The +1 in the log keeps idf strictly positive even when a token
   * appears in every candidate (idf = log(1 + 1) = log(2) > 0).
   */
  private indexCorpus(candidates: readonly BacklinkCandidate[]): IndexedCorpus {
    const filtered = candidates.filter((c) =>
      c && typeof c.id === "string" && c.id.length > 0
      && typeof c.description === "string" && c.description.length > 0,
    );
    const tokenBags = filtered.map((c) => this.tokenize(c.description));
    const N = filtered.length;
    const df = new Map<string, number>();
    for (const bag of tokenBags) {
      for (const [t] of bag) df.set(t, (df.get(t) ?? 0) + 1);
    }
    const idf = new Map<string, number>();
    for (const [t, n] of df) idf.set(t, Math.log(1 + N / Math.max(1, n)));
    return { candidates: filtered as BacklinkCandidate[], tokenBags, idf };
  }

  /**
   * Score every candidate in `corpus` against `queryTokens`, drop NaN /
   * Infinity / sub-threshold scores, sort descending, take top-K. Ties
   * broken by (1) higher uniqueOverlap, (2) lexicographic id for
   * deterministic output.
   */
  private rankAgainst(
    queryTokens: Map<string, number>,
    corpus: IndexedCorpus,
    topK: number,
    minScore: number,
  ): ScoredBacklink[] {
    const out: ScoredBacklink[] = [];
    const qLen = Math.max(1, this.bagSize(queryTokens));
    for (let i = 0; i < corpus.candidates.length; i++) {
      const cand = corpus.candidates[i];
      const cBag = corpus.tokenBags[i];
      const cLen = Math.max(1, this.bagSize(cBag));
      let raw = 0;
      let unique = 0;
      for (const [t, qc] of queryTokens) {
        const cc = cBag.get(t);
        if (cc === undefined) continue;
        const idfT = corpus.idf.get(t) ?? 0;
        // min(q,c) keeps the dot product bounded by the rarer of the two
        // counts so inflating a token in the description can't game the score.
        raw += idfT * Math.min(qc, cc);
        unique++;
      }
      const score = raw / Math.sqrt(qLen * cLen);
      if (!Number.isFinite(score) || score < minScore) continue;
      out.push({ ...cand, score, uniqueOverlap: unique });
    }
    out.sort((a, b) =>
      b.score - a.score
      || b.uniqueOverlap - a.uniqueOverlap
      || a.id.localeCompare(b.id),
    );
    return out.slice(0, topK);
  }

  private bagSize(bag: Map<string, number>): number {
    let n = 0;
    for (const [, c] of bag) n += c;
    return n;
  }

  /** Conservative escaper for markdown: strip backticks + newlines from inline content. */
  private escape(s: string): string {
    return s.replace(/[`\r\n]+/g, " ").trim().slice(0, 300);
  }
}

export const vaultBacklinkEngine = new VaultBacklinkEngine();
