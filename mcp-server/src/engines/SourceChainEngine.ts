/**
 * SourceChainEngine — provenance / "why retrieved" trace decorator
 *
 * Closes Voxyz Layer 8 gap (https://x.com/Voxyz_ai/status/2058222816474919343):
 *   "Finding the right thing + citing the source is what makes the answer trustworthy."
 *
 * Every retrieval through PSN (master-index hits, tribal lookups, wiki backlinks,
 * memory queries, dispatcher round-trips) can wrap its return value with a citation
 * chain via this engine.  The result is a `DecoratedResult<T>` carrying:
 *   - the original value (untouched)
 *   - an ordered list of Citation objects (path, score, retrieved_at, used_for, etc.)
 *   - a deterministic SHA-256 digest of the citation set (cache key + audit ID)
 *
 * Pure-core: no I/O, no fs, no spawn.  Deterministic outputs for deterministic inputs
 * (modulo the caller-supplied `retrieved_at` timestamp).  Companion to U-HAGI08 in
 * HERMES-AGI-ARCHITECTURE-MS0.
 *
 * Engine conventions (per H:/.claude/rules/engines.md):
 *   - class with static methods
 *   - Zod schemas for input validation
 *   - typed return objects, never raw primitives
 *   - error handling: throw descriptive errors on invalid citations
 *
 * @module engines/SourceChainEngine
 */

import { z } from "zod";
import { createHash } from "node:crypto";

// ============================================================================
// CITATION SHAPE
// ============================================================================

/**
 * A single citation — one PSN-leg retrieval contributing to a downstream result.
 * - `path`: file path / dispatcher action / wiki entry id / memory file slug
 * - `source_type`: which PSN leg the citation came from
 * - `score`: relevance 0-1 (1.0 = perfect match, 0 = barely related)
 * - `retrieved_at`: ISO timestamp at retrieval time
 * - `used_for`: human-readable purpose ("kc1.1 lookup", "Kienzle constant")
 * - `excerpt`: optional <=500-char content sample for audit
 */
export const CitationSchema = z.object({
  path: z.string().min(1, "Citation.path must be non-empty"),
  source_type: z.enum(["wiki", "memory", "tribal", "engine", "dispatcher", "external"]),
  score: z.number().refine(
    (v) => Number.isFinite(v) && v >= 0 && v <= 1,
    { message: "Citation.score must be a finite number in [0, 1]" },
  ).optional(),
  retrieved_at: z.string().min(1, "Citation.retrieved_at must be non-empty"),
  used_for: z.string().max(200).optional(),
  excerpt: z.string().max(500, "Citation.excerpt must be <=500 chars").optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export interface DecoratedResult<T> {
  value: T;
  sources: Citation[];
  digest: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SourceChainEngine {
  /**
   * Decorate a value with a citation chain.  Validates every citation; throws on
   * invalid input.  Empty citation array is permitted (caller may legitimately
   * have no sources — e.g. a pure-calculation engine result).
   *
   * @throws if any citation fails CitationSchema validation
   */
  static decorate<T>(value: T, citations: readonly Citation[]): DecoratedResult<T> {
    const validated: Citation[] = [];
    for (const c of citations) {
      validated.push(CitationSchema.parse(c));
    }
    return {
      value,
      sources: validated,
      digest: SourceChainEngine.digest(validated),
    };
  }

  /**
   * Validate a single citation.  Returns the parsed citation or throws.
   */
  static validate(c: unknown): Citation {
    return CitationSchema.parse(c);
  }

  /**
   * Deduplicate citations by `path`.  When duplicates are found, keep the entry
   * with the highest `score` (citations without `score` lose to any scored peer).
   * Preserves insertion order of first-seen path.
   */
  static deduplicate(citations: readonly Citation[]): Citation[] {
    const byPath = new Map<string, Citation>();
    const order: string[] = [];
    for (const c of citations) {
      const existing = byPath.get(c.path);
      if (!existing) {
        byPath.set(c.path, c);
        order.push(c.path);
        continue;
      }
      const newScore = c.score ?? -1;
      const oldScore = existing.score ?? -1;
      if (newScore > oldScore) byPath.set(c.path, c);
    }
    return order.map((p) => byPath.get(p)!);
  }

  /**
   * Filter citations to one source_type.
   */
  static filterByType(
    citations: readonly Citation[],
    type: Citation["source_type"],
  ): Citation[] {
    return citations.filter((c) => c.source_type === type);
  }

  /**
   * Merge N decorated results into a single DecoratedResult whose value is the
   * array of input values and whose sources is the deduplicated union of all
   * citation chains.  Used for cross-PSN-leg synthesis (e.g. take 3 different
   * leg-specific retrievals and produce one combined answer with full provenance).
   */
  static merge<T>(results: readonly DecoratedResult<T>[]): DecoratedResult<T[]> {
    const values: T[] = [];
    const allCitations: Citation[] = [];
    for (const r of results) {
      values.push(r.value);
      for (const c of r.sources) allCitations.push(c);
    }
    const merged = SourceChainEngine.deduplicate(allCitations);
    return { value: values, sources: merged, digest: SourceChainEngine.digest(merged) };
  }

  /**
   * Compute a deterministic SHA-256 digest of a citation set.  Used as cache key
   * (same citations → same digest) and audit fingerprint.  Order-independent:
   * citations are sorted by path before hashing.
   */
  static digest(citations: readonly Citation[]): string {
    const sorted = [...citations].sort((a, b) => a.path.localeCompare(b.path));
    const canonical = JSON.stringify(
      sorted.map((c) => ({
        path: c.path,
        source_type: c.source_type,
        score: c.score ?? null,
      })),
    );
    return createHash("sha256").update(canonical).digest("hex");
  }

  /**
   * Render a citation chain as operator-visible markdown.  Used by Stop hooks,
   * dispatcher advisories, and PrismApp UI "why this recommendation" surfaces.
   */
  static renderMarkdown(citations: readonly Citation[]): string {
    if (citations.length === 0) return "_(no sources cited)_";
    const lines: string[] = ["**Sources:**"];
    for (const c of citations) {
      const scoreStr = typeof c.score === "number" ? ` (score=${c.score.toFixed(3)})` : "";
      const usedFor = c.used_for ? ` — ${c.used_for}` : "";
      lines.push(`- [${c.source_type}] \`${c.path}\`${scoreStr}${usedFor}`);
    }
    return lines.join("\n");
  }
}

export const sourceChainEngine = SourceChainEngine;
