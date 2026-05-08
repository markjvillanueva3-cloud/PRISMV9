/**
 * ContradictionDetectorEngine
 * ===========================
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR
 *
 * Flags new memory files that conflict with prior beliefs in the vault.
 * Two complementary signals:
 *   1. Numerical mismatch — same `key: value` line carries different
 *      values across files (e.g. `feedrate: 120` vs `feedrate: 240`).
 *   2. Direct negation — TF-IDF candidate selection picks the most-
 *      similar prior file, then a token-level negation sweep flags
 *      sentences whose nouns appear in both files but with one wrapped
 *      in `not|never|no|false` polarity.
 *
 * Determinism guarantee
 * ---------------------
 * Default execution path is fully deterministic on the same vault state:
 *   - File enumeration is sorted lexicographically
 *   - TF-IDF tie-breaks are alphabetical
 *   - Heuristic signals (numerical + negation) are pure functions of
 *     content
 *
 * An optional Ollama NLI hook (`opts.nliCall`) can layer over the
 * heuristic for higher recall on implicit contradictions; tests cover
 * the heuristic-only mode for determinism + the injected-NLI path.
 *
 * cyrilXBT framing: a vault that never disagrees with you is a vault
 * that has stopped helping you think.
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export type ConflictType = "direct" | "implicit" | "numerical";

export interface Conflict {
  /** Path of the prior vault file the new memory contradicts. */
  otherFile: string;
  /** Short excerpt of the conflicting assertion. */
  assertion: string;
  /** Conflict category. */
  conflictType: ConflictType;
  /** Confidence in [0, 1]. Heuristic mode: 0.5/0.7 fixed; NLI mode: model score. */
  confidence: number;
}

export interface DetectResult {
  conflicts: Conflict[];
  /** Number of vault files actually compared against. */
  candidates_examined: number;
  /** True when Ollama NLI was used; false for heuristic-only. */
  nli_used: boolean;
}

export interface DetectOptions {
  /** Override vault root (test injection). */
  vaultRoot?: string;
  /** Cap files examined (defense vs runaway vault). */
  maxFiles?: number;
  /** Top-K most-similar files by TF-IDF passed to deeper checks. */
  topK?: number;
  /** Optional NLI hook: (premise, hypothesis) => {label, score} | null. */
  nliCall?: (premise: string, hypothesis: string) => Promise<{ label: "ENTAIL" | "NEUTRAL" | "CONTRADICT"; score: number } | null>;
}

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_TOP_K = 5;
const NUMERICAL_CONFIDENCE = 0.75;
const DIRECT_CONFIDENCE = 0.7;
const IMPLICIT_CONFIDENCE = 0.4;
const MIN_TOKEN_LEN = 3;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "have", "has", "had", "are",
  "was", "were", "but", "not", "you", "your", "they", "them", "their", "there",
  "from", "into", "out", "over", "under", "about", "after", "before", "than",
  "then", "when", "what", "which", "who", "how", "why", "where", "all", "any",
  "some", "one", "two", "more", "most", "such", "only", "other", "its", "his",
  "her", "him", "she", "our", "way", "use", "used", "using", "can", "will",
  "would", "could", "should", "may", "might", "must", "also", "just", "very",
]);

const NEGATION_TOKENS = new Set([
  "not", "no", "never", "none", "false", "incorrect", "wrong", "negate",
  "without", "isn't", "wasn't", "aren't", "weren't", "doesn't", "don't",
  "didn't", "won't", "can't", "cannot",
]);

/** Strip frontmatter, code fences, links from markdown body. */
function stripMarkdown(raw: string): string {
  let text = raw;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end > 0) text = text.slice(end + 4);
  }
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`\n]+`/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  return text;
}

function tokenize(raw: string): string[] {
  const text = stripMarkdown(raw).toLowerCase();
  const tokens: string[] = [];
  for (const piece of text.split(/[^a-z0-9_-]+/)) {
    if (!piece || piece.length < MIN_TOKEN_LEN) continue;
    if (/^\d+$/.test(piece)) continue;
    if (STOPWORDS.has(piece)) continue;
    const tok = piece.replace(/^-+|-+$/g, "");
    if (tok.length < MIN_TOKEN_LEN) continue;
    tokens.push(tok);
  }
  return tokens;
}

/** Walk the vault and collect markdown files (sorted, capped). */
function listVaultMarkdown(root: string, maxFiles: number, exclude: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0 && out.length < maxFiles) {
    const dir = stack.pop()!;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    // Sort for deterministic traversal order.
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { stack.push(full); continue; }
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
      try { statSync(full); } catch { continue; }
      if (resolve(full) === resolve(exclude)) continue;
      // Skip prior daily briefs to avoid re-flagging synthesized output as conflict.
      if (/^brief-\d{4}-\d{2}-\d{2}/.test(ent.name)) continue;
      out.push(full);
      if (out.length >= maxFiles) break;
    }
  }
  out.sort();
  return out;
}

/** TF-IDF cosine similarity for candidate ranking. */
function rankCandidates(newTokens: string[], corpus: Array<{ path: string; tokens: string[] }>, topK: number): string[] {
  if (corpus.length === 0) return [];
  const N = corpus.length + 1;
  const df = new Map<string, number>();
  const allDocs = [{ path: "__new__", tokens: newTokens }, ...corpus];
  for (const doc of allDocs) {
    const seen = new Set<string>();
    for (const t of doc.tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  function tfidf(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const out = new Map<string, number>();
    let normSq = 0;
    for (const [t, c] of tf) {
      const idf = Math.log((N + 1) / ((df.get(t) ?? 1) + 1)) + 1;
      const w = (1 + Math.log(c)) * idf;
      out.set(t, w);
      normSq += w * w;
    }
    const norm = Math.sqrt(normSq) || 1;
    for (const [t, w] of out) out.set(t, w / norm);
    return out;
  }
  const newVec = tfidf(newTokens);
  const scored = corpus.map((doc) => {
    const docVec = tfidf(doc.tokens);
    let dot = 0;
    for (const [t, w] of newVec) {
      const dw = docVec.get(t);
      if (dw) dot += w * dw;
    }
    return { path: doc.path, score: dot };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.path < b.path ? -1 : 1));
  // Keep score-0 candidates so NLI mode can still run on lexically-disjoint
  // pairs (semantic inference works without shared tokens). Heuristic
  // direct-negation will silently no-op on disjoint pairs.
  return scored.slice(0, topK).map((s) => s.path);
}

/** Extract `key: value` numerical assertions from markdown body. */
function extractNumericAssertions(body: string): Map<string, { value: number; line: string }> {
  const out = new Map<string, { value: number; line: string }>();
  const text = stripMarkdown(body);
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([a-z][a-z0-9_]*)\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*([a-zA-Z%]*)?\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = Number(m[2]);
    if (!Number.isFinite(value)) continue;
    if (out.has(key)) continue; // first occurrence wins for determinism
    out.set(key, { value, line: line.trim() });
  }
  return out;
}

/** Detect direct negation: a content noun in newBody appears in candidate wrapped in negation. */
function detectDirectNegation(newBody: string, candidateBody: string): { triggered: boolean; assertion: string } {
  const newTokens = new Set(tokenize(newBody));
  const candText = stripMarkdown(candidateBody).toLowerCase();
  const sentences = candText.split(/[.!?\n]+/);
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const sentTokens = trimmed.split(/[^a-z0-9_-]+/).filter(Boolean);
    const hasNegation = sentTokens.some((t) => NEGATION_TOKENS.has(t));
    if (!hasNegation) continue;
    const sharedNoun = sentTokens.find((t) =>
      t.length >= MIN_TOKEN_LEN &&
      !STOPWORDS.has(t) &&
      !NEGATION_TOKENS.has(t) &&
      newTokens.has(t)
    );
    if (sharedNoun) {
      const excerpt = trimmed.slice(0, 160);
      return { triggered: true, assertion: excerpt };
    }
  }
  return { triggered: false, assertion: "" };
}

export class ContradictionDetectorEngine {
  readonly name = "ContradictionDetectorEngine";

  /**
   * Detect conflicts between a newly-written memory and the existing vault.
   *
   * @param newMemoryPath  absolute path to the new memory file
   * @param opts           optional vaultRoot / maxFiles / topK / nliCall overrides
   * @returns              {conflicts, candidates_examined, nli_used}
   */
  async detectConflicts(newMemoryPath: string, opts: DetectOptions = {}): Promise<DetectResult> {
    const vaultRoot = resolve(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
    const topK = opts.topK ?? DEFAULT_TOP_K;

    if (!newMemoryPath || !existsSync(newMemoryPath)) {
      return { conflicts: [], candidates_examined: 0, nli_used: false };
    }
    let newBody = "";
    try { newBody = readFileSync(newMemoryPath, "utf8"); } catch { return { conflicts: [], candidates_examined: 0, nli_used: false }; }
    if (!newBody.trim()) {
      return { conflicts: [], candidates_examined: 0, nli_used: false };
    }

    const newTokens = tokenize(newBody);
    if (newTokens.length === 0) {
      return { conflicts: [], candidates_examined: 0, nli_used: false };
    }

    const candidatePaths = listVaultMarkdown(vaultRoot, maxFiles, newMemoryPath);
    if (candidatePaths.length === 0) {
      return { conflicts: [], candidates_examined: 0, nli_used: false };
    }

    const corpus: Array<{ path: string; tokens: string[]; body: string }> = [];
    for (const p of candidatePaths) {
      let body = "";
      try { body = readFileSync(p, "utf8"); } catch { continue; }
      if (!body.trim()) continue;
      corpus.push({ path: p, tokens: tokenize(body), body });
    }
    if (corpus.length === 0) {
      return { conflicts: [], candidates_examined: 0, nli_used: false };
    }

    const ranked = rankCandidates(newTokens, corpus.map((c) => ({ path: c.path, tokens: c.tokens })), topK);
    const conflicts: Conflict[] = [];
    let nliUsed = false;

    // Numerical mismatch — scan ALL candidates, not only top-K, since
    // `feedrate: 240` would be missed if its file had low TF-IDF overlap.
    const newNums = extractNumericAssertions(newBody);
    if (newNums.size > 0) {
      for (const cand of corpus) {
        const candNums = extractNumericAssertions(cand.body);
        for (const [key, newRec] of newNums) {
          const candRec = candNums.get(key);
          if (!candRec) continue;
          if (candRec.value === newRec.value) continue;
          conflicts.push({
            otherFile: cand.path,
            assertion: `${candRec.line}  (new memory says: ${newRec.line})`,
            conflictType: "numerical",
            confidence: NUMERICAL_CONFIDENCE,
          });
        }
      }
    }

    // Direct negation on top-K most-similar candidates.
    for (const candPath of ranked) {
      const cand = corpus.find((c) => c.path === candPath);
      if (!cand) continue;
      const neg = detectDirectNegation(newBody, cand.body);
      if (neg.triggered) {
        conflicts.push({
          otherFile: cand.path,
          assertion: neg.assertion,
          conflictType: "direct",
          confidence: DIRECT_CONFIDENCE,
        });
      }
    }

    // Optional NLI layer for implicit contradictions.
    if (opts.nliCall) {
      for (const candPath of ranked) {
        const cand = corpus.find((c) => c.path === candPath);
        if (!cand) continue;
        try {
          const verdict = await opts.nliCall(cand.body.slice(0, 400), newBody.slice(0, 400));
          if (verdict && verdict.label === "CONTRADICT" && verdict.score > 0) {
            nliUsed = true;
            conflicts.push({
              otherFile: cand.path,
              assertion: cand.body.slice(0, 160).replace(/\s+/g, " ").trim(),
              conflictType: "implicit",
              confidence: Math.max(0, Math.min(1, verdict.score)),
            });
          }
        } catch {
          // NLI failure is non-fatal — heuristic results are still returned.
        }
      }
    }

    // Dedup by (otherFile, conflictType, assertion) — keep highest
    // confidence. Including the assertion text means numerical conflicts
    // on different keys (feedrate, spindle) survive as distinct entries
    // while a direct + implicit hit on the same file+sentence collapses.
    const dedup = new Map<string, Conflict>();
    for (const c of conflicts) {
      const k = `${c.otherFile}::${c.conflictType}::${c.assertion}`;
      const existing = dedup.get(k);
      if (!existing || c.confidence > existing.confidence) dedup.set(k, c);
    }
    const finalConflicts = [...dedup.values()].sort(
      (a, b) => (b.confidence - a.confidence) ||
                (a.otherFile < b.otherFile ? -1 : 1) ||
                (a.conflictType < b.conflictType ? -1 : 1)
    );

    return { conflicts: finalConflicts, candidates_examined: corpus.length, nli_used: nliUsed };
  }
}

export const contradictionDetectorEngine = new ContradictionDetectorEngine();
// Suppress unused-warning on the implicit-confidence constant (reserved for
// future NLI scoring fallback).
void IMPLICIT_CONFIDENCE;
