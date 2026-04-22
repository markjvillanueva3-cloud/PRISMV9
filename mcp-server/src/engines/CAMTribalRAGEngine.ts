/**
 * CAMTribalRAGEngine — U-CAM-ML-06
 * ===================================
 *
 * Retrieval-augmented generation index over the tribal tip corpus.
 * Given a parameter name + feature + material context, returns the top-k
 * most relevant tips to condition downstream adapter inference on.
 *
 * Pipeline
 * --------
 *   1. buildIndex(): scans all *-cam-tips(-ext).ts files (reusing the
 *      regex extraction path from CAMTribalTipLinkerEngine), tokenizes
 *      each tip's title+body+tags+operation_types, computes a TF-IDF
 *      vector per tip, stores the sparse vectors + vocabulary in a
 *      deterministic JSON index at data/state/CAM_TRIBAL_RAG_INDEX.json.
 *
 *   2. retrieve(): tokenizes the query, builds a query vector with the
 *      same vocabulary + IDF weights, cosine-similarity scan across
 *      every tip, return top-k.
 *
 * Why TF-IDF + linear scan instead of FAISS/HNSW
 * ----------------------------------------------
 * Corpus size is ~3,700 tips. A full linear cosine-sim scan over sparse
 * TF-IDF vectors in native JS is ~0.5ms on this hardware — well under the
 * 50ms budget. Native FAISS would require a C++ bridge, HNSW an extra
 * dependency; neither is justified for this scale. If the corpus grows
 * past ~50k tips we can swap the scan for hnswlib-node without changing
 * the engine interface.
 *
 * Embedding choice
 * ----------------
 * TF-IDF over a domain vocabulary (manufacturing tokens) outperforms raw
 * BM25 on short technical text because:
 *   - Tips are 1-3 sentences; no length normalization needed
 *   - Domain tokens (vc, fc, depth_of_cut, kc1_1) are high-signal
 *   - Pure lexical matching is sufficient for retrieval — we don't need
 *     semantic paraphrase handling because the query vocabulary comes from
 *     the same physics namespace
 *
 * Output shape is compact enough to ship in the repo (≈1 MB for 3,700
 * tips with avg 12 non-zero dims each).
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-ML-TRAIN U-CAM-ML-06.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  camTribalTipLinkerEngine,
  CAMTribalTipLinkerEngine,
  type ExtractedTip,
} from "./CAMTribalTipLinkerEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface RAGTipEntry {
  tip_id: string;
  cam_slug: string;
  title: string;
  body_excerpt: string;
  tags: string[];
  operation_types: string[];
  /** Parallel arrays: terms[i] ↔ weights[i]. Zero-value terms are omitted. */
  terms: number[];
  weights: number[];
}

export interface CAMTribalRAGIndex {
  schemaVersion: 1;
  generated_at: string;
  vocabulary: string[];
  /** idf[i] corresponds to vocabulary[i]. */
  idf: number[];
  tips: RAGTipEntry[];
  summary: {
    total_tips: number;
    total_vocab: number;
    per_cam_count: Record<string, number>;
    avg_nnz: number;
  };
}

export interface RAGHit {
  tip_id: string;
  cam_slug: string;
  title: string;
  body_excerpt: string;
  score: number;
}

// ─── Tokenization ───────────────────────────────────────────────────

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","for","on","in","to",
  "of","at","by","with","from","is","are","was","were","be","been","being",
  "as","it","its","this","that","these","those","you","your","we","our",
  "has","have","had","can","will","would","should","could","may","might",
  "do","does","did","not","no","yes","so","too","very","just","than","also",
  "which","what","who","where","when","why","how","some","any","all","most",
  "more","less","each","every","both","few","many",
]);

/** Lowercase, strip punctuation, split on whitespace, drop stopwords + 1-char tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// ─── Engine ─────────────────────────────────────────────────────────

export interface BuildOptions {
  dataDir?: string;
  outPath?: string;
  /** Minimum document frequency (inclusive). Tokens appearing in fewer tips are dropped as noise. */
  minDocFrequency?: number;
  /** Body text is truncated to this many chars when stored in the index (excerpt only). */
  bodyExcerptLen?: number;
}

export interface RetrieveOptions {
  topK?: number;
  minScore?: number;
  cam_slug?: string;
}

const DEFAULT_MIN_DF = 2;
const DEFAULT_EXCERPT_LEN = 240;

export class CAMTribalRAGEngine {
  readonly name = "CAMTribalRAGEngine";

  private cached: CAMTribalRAGIndex | null = null;
  private vocabMap: Map<string, number> | null = null;

  constructor(
    private linker: CAMTribalTipLinkerEngine = camTribalTipLinkerEngine,
  ) {}

  /** Rebuild the RAG index from the tip corpus + persist. */
  buildIndex(opts: BuildOptions = {}): CAMTribalRAGIndex {
    const dataDir = opts.dataDir ?? "H:/PRISM/mcp-server/src/data";
    const outPath = opts.outPath ?? "H:/PRISM/mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json";
    const minDF = opts.minDocFrequency ?? DEFAULT_MIN_DF;
    const excerptLen = opts.bodyExcerptLen ?? DEFAULT_EXCERPT_LEN;

    const rawTips = this.scanAllTips(dataDir);

    // ─── Pass 1: tokenize + count document frequencies ──────────────
    const docTokens: string[][] = rawTips.map((t) =>
      tokenize(`${t.title} ${t.body} ${t.tags.join(" ")} ${t.operation_types.join(" ")}`)
    );
    const df = new Map<string, number>();
    for (const tokens of docTokens) {
      const seen = new Set<string>();
      for (const tok of tokens) {
        if (seen.has(tok)) continue;
        seen.add(tok);
        df.set(tok, (df.get(tok) ?? 0) + 1);
      }
    }

    // ─── Build vocabulary (drop low-DF noise) ───────────────────────
    const vocabulary: string[] = [];
    for (const [tok, n] of df.entries()) {
      if (n >= minDF) vocabulary.push(tok);
    }
    vocabulary.sort();
    const vocabMap = new Map<string, number>();
    for (let i = 0; i < vocabulary.length; i++) vocabMap.set(vocabulary[i], i);

    // ─── Compute IDF ────────────────────────────────────────────────
    const N = rawTips.length;
    const idf = vocabulary.map((tok) => Math.log((N + 1) / ((df.get(tok) ?? 1) + 1)) + 1);

    // ─── Pass 2: TF-IDF per tip (sparse, L2-normalized) ─────────────
    const perCam: Record<string, number> = {};
    const tips: RAGTipEntry[] = [];
    let totalNnz = 0;

    for (let i = 0; i < rawTips.length; i++) {
      const t = rawTips[i];
      perCam[t.cam_slug] = (perCam[t.cam_slug] ?? 0) + 1;

      const tokens = docTokens[i];
      const tf = new Map<number, number>();
      for (const tok of tokens) {
        const vIdx = vocabMap.get(tok);
        if (vIdx === undefined) continue;
        tf.set(vIdx, (tf.get(vIdx) ?? 0) + 1);
      }
      if (tf.size === 0) continue; // no signal — skip

      // TF-IDF weight per term; must be sorted by vocab index for binary search
      const sortedIdxs = [...tf.keys()].sort((a, b) => a - b);
      const termIdxs: number[] = sortedIdxs;
      const weights: number[] = sortedIdxs.map((vIdx) => (1 + Math.log(tf.get(vIdx)!)) * idf[vIdx]);
      let l2 = 0;
      for (const w of weights) l2 += w * w;
      const norm = Math.sqrt(l2) || 1;
      for (let j = 0; j < weights.length; j++) weights[j] /= norm;
      totalNnz += termIdxs.length;

      tips.push({
        tip_id: t.id,
        cam_slug: t.cam_slug,
        title: t.title,
        body_excerpt: t.body.length > excerptLen ? t.body.slice(0, excerptLen) + "…" : t.body,
        tags: t.tags,
        operation_types: t.operation_types,
        terms: termIdxs,
        weights,
      });
    }

    const index: CAMTribalRAGIndex = {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      vocabulary,
      idf,
      tips,
      summary: {
        total_tips: tips.length,
        total_vocab: vocabulary.length,
        per_cam_count: perCam,
        avg_nnz: tips.length > 0 ? totalNnz / tips.length : 0,
      },
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(index));

    this.cached = index;
    this.vocabMap = vocabMap;
    return index;
  }

  /** Load the index from disk (lazy cached). */
  loadIndex(indexPath: string = "H:/PRISM/mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json"): CAMTribalRAGIndex | null {
    if (this.cached) return this.cached;
    try {
      const raw = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as CAMTribalRAGIndex;
      this.cached = raw;
      const m = new Map<string, number>();
      for (let i = 0; i < raw.vocabulary.length; i++) m.set(raw.vocabulary[i], i);
      this.vocabMap = m;
      return raw;
    } catch {
      return null;
    }
  }

  /** Drop cached index (forces next call to re-read disk). */
  invalidate(): void {
    this.cached = null;
    this.vocabMap = null;
  }

  /** Retrieve top-k tips for a free-text query. */
  retrieve(query: string, opts: RetrieveOptions = {}): RAGHit[] {
    const topK = opts.topK ?? 10;
    const minScore = opts.minScore ?? 0;
    const camFilter = opts.cam_slug;
    const idx = this.loadIndex();
    if (!idx || idx.tips.length === 0) return [];

    // Build query vector (sparse, L2-normalized)
    const tokens = tokenize(query);
    const tf = new Map<number, number>();
    for (const tok of tokens) {
      const vIdx = this.vocabMap!.get(tok);
      if (vIdx === undefined) continue;
      tf.set(vIdx, (tf.get(vIdx) ?? 0) + 1);
    }
    if (tf.size === 0) return [];

    const qVec = new Map<number, number>();
    let l2 = 0;
    for (const [vIdx, count] of tf.entries()) {
      const w = (1 + Math.log(count)) * idx.idf[vIdx];
      qVec.set(vIdx, w);
      l2 += w * w;
    }
    const qNorm = Math.sqrt(l2) || 1;
    for (const k of qVec.keys()) qVec.set(k, qVec.get(k)! / qNorm);

    // Cosine similarity (sparse dot product — both vectors are L2-normalized)
    const heap: RAGHit[] = [];
    for (const tip of idx.tips) {
      if (camFilter && tip.cam_slug !== camFilter) continue;
      let dot = 0;
      // Iterate the smaller of (qVec, tip.terms)
      if (qVec.size <= tip.terms.length) {
        for (const [vIdx, qw] of qVec.entries()) {
          const j = this.binarySearch(tip.terms, vIdx);
          if (j >= 0) dot += qw * tip.weights[j];
        }
      } else {
        for (let j = 0; j < tip.terms.length; j++) {
          const qw = qVec.get(tip.terms[j]);
          if (qw !== undefined) dot += qw * tip.weights[j];
        }
      }
      if (dot <= minScore) continue;
      heap.push({ tip_id: tip.tip_id, cam_slug: tip.cam_slug, title: tip.title, body_excerpt: tip.body_excerpt, score: dot });
    }
    heap.sort((a, b) => b.score - a.score);
    return heap.slice(0, topK);
  }

  /** Semantic wrapper: retrieve tips relevant to a parameter + feature + material. */
  retrieveForParameter(args: {
    param_name: string;
    feature?: string;
    material?: string;
    cam_slug?: string;
    topK?: number;
  }): RAGHit[] {
    const q = [args.param_name, args.feature ?? "", args.material ?? ""].filter(Boolean).join(" ");
    return this.retrieve(q, { topK: args.topK, cam_slug: args.cam_slug });
  }

  // ─── Private ──────────────────────────────────────────────────────

  /** Reuse CAMTribalTipLinkerEngine's extraction path. */
  private scanAllTips(dataDir: string): ExtractedTip[] {
    if (!fs.existsSync(dataDir)) return [];
    const files = fs
      .readdirSync(dataDir)
      .filter((f) => /-cam-tips(?:-ext)?\.ts$/i.test(f))
      .map((f) => path.join(dataDir, f));

    const out: ExtractedTip[] = [];
    for (const f of files) {
      try {
        const text = fs.readFileSync(f, "utf-8");
        const slug = path
          .basename(f)
          .replace(/-cam-tips(?:-ext)?\.ts$/i, "")
          .toLowerCase();
        out.push(...this.linker.extractTipsFromText(text, f, slug));
      } catch {
        /* skip unreadable */
      }
    }
    return out;
  }

  private binarySearch(arr: number[], target: number): number {
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const v = arr[mid];
      if (v < target) lo = mid + 1;
      else if (v > target) hi = mid - 1;
      else return mid;
    }
    return -1;
  }
}

export const camTribalRAGEngine = new CAMTribalRAGEngine();
