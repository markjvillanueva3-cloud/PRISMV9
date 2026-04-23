/**
 * CADSearchUniversalEngine — U-FS-08 (PHASE-47)
 *
 * Unified search over CAD documents combining 5 signal types.
 *
 * Fusion strategy: Reciprocal Rank Fusion (RRF) across whichever modalities
 * the query activates, with k=60 (standard RRF parameter). Per-mode subscores
 * are normalized to [0,1] before fusion. This is O(N log N) per mode.
 *
 * Natural-language mode parses simple patterns like:
 *   "material=AL6061 depth<15 tag:bracket"
 * and falls back to using the raw string as a full-text query.
 *
 * @module engines/CADSearchUniversalEngine
 */

import {
  SearchDocumentSchema,
  SearchQuerySchema,
  SearchResultSchema,
  type SearchDocument,
  type SearchQuery,
  type SearchResult,
  type ToleranceRange,
  type SearchSpec,
} from "../schemas/cadSearchUniversalSchema.js";

const RRF_K = 60;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

// ── Cosine similarity (safe against zero vectors) ───────────────────────────
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function popcount8(b: number): number {
  b = b - ((b >> 1) & 0x55);
  b = (b & 0x33) + ((b >> 2) & 0x33);
  return (b + (b >> 4)) & 0x0f;
}

function hashSimilarity(h1: string, h2: string): number {
  if (h1.length !== h2.length) return 0;
  const a = hexToBytes(h1);
  const b = hexToBytes(h2);
  let hamming = 0;
  for (let i = 0; i < a.length; i++) hamming += popcount8(a[i] ^ b[i]);
  return 1 - hamming / (a.length * 8);
}

// Very small NL parser: supports key=value, key<N, key>N, tag:foo, plus leftover text.
interface ParsedNL {
  specEq: Record<string, string>;
  tolerance: ToleranceRange[];
  tags: string[];
  rest: string;
}

function parseNL(s: string): ParsedNL {
  const specEq: Record<string, string> = {};
  const tolerance: ToleranceRange[] = [];
  const tags: string[] = [];
  const rest: string[] = [];
  for (const raw of s.split(/\s+/)) {
    if (!raw) continue;
    let m: RegExpExecArray | null;
    m = /^([a-zA-Z_][\w]*)=([^\s]+)$/.exec(raw);
    if (m) {
      specEq[m[1].toLowerCase()] = m[2];
      continue;
    }
    m = /^([a-zA-Z_][\w]*)<([-+]?\d*\.?\d+)$/.exec(raw);
    if (m) {
      tolerance.push({ key: m[1], max: parseFloat(m[2]) });
      continue;
    }
    m = /^([a-zA-Z_][\w]*)>([-+]?\d*\.?\d+)$/.exec(raw);
    if (m) {
      tolerance.push({ key: m[1], min: parseFloat(m[2]) });
      continue;
    }
    m = /^tag:([^\s]+)$/.exec(raw);
    if (m) {
      tags.push(m[1]);
      continue;
    }
    rest.push(raw);
  }
  return { specEq, tolerance, tags, rest: rest.join(" ") };
}

export class CADSearchUniversalEngine {
  private docs = new Map<string, SearchDocument>();
  private embeddingDim: number | null = null;

  get size(): number {
    return this.docs.size;
  }

  index(doc: SearchDocument): SearchDocument {
    const parsed = SearchDocumentSchema.parse(doc);
    if (parsed.embedding) {
      if (this.embeddingDim === null) {
        this.embeddingDim = parsed.embedding.length;
      } else if (parsed.embedding.length !== this.embeddingDim) {
        throw new Error(
          `Embedding dim mismatch: expected ${this.embeddingDim}, got ${parsed.embedding.length}`,
        );
      }
    }
    this.docs.set(parsed.id, parsed);
    return parsed;
  }

  get(id: string): SearchDocument | undefined {
    return this.docs.get(id);
  }

  remove(id: string): boolean {
    return this.docs.delete(id);
  }

  clear(): void {
    this.docs.clear();
    this.embeddingDim = null;
  }

  // ── Per-mode scorers (return Map<id, normalizedScore in [0,1]>) ──────────

  private scoreFullText(text: string): Map<string, number> {
    const tokens = tokenize(text);
    const out = new Map<string, number>();
    if (tokens.length === 0) return out;
    for (const doc of this.docs.values()) {
      const hay = tokenize(
        `${doc.canonicalName} ${doc.description} ${doc.spec.tags.join(" ")}`,
      );
      let hits = 0;
      for (const t of tokens) if (hay.includes(t)) hits++;
      if (hits === 0) continue;
      out.set(doc.id, hits / tokens.length);
    }
    return out;
  }

  private scoreSemantic(embedding: number[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const doc of this.docs.values()) {
      if (!doc.embedding) continue;
      const c = cosine(embedding, doc.embedding);
      if (c > 0) out.set(doc.id, (c + 1) / 2); // cosine is [-1,1] → [0,1]
    }
    return out;
  }

  private scoreVisual(hash: string): Map<string, number> {
    const out = new Map<string, number>();
    for (const doc of this.docs.values()) {
      if (!doc.perceptualHash) continue;
      if (doc.perceptualHash.length !== hash.length) continue;
      out.set(doc.id, hashSimilarity(hash, doc.perceptualHash));
    }
    return out;
  }

  private scoreSpec(filter: Partial<SearchSpec>): Map<string, number> {
    const out = new Map<string, number>();
    for (const doc of this.docs.values()) {
      let total = 0;
      let matched = 0;
      if (filter.material !== undefined) {
        total++;
        if (
          doc.spec.material &&
          doc.spec.material.toLowerCase() === filter.material.toLowerCase()
        ) {
          matched++;
        }
      }
      if (filter.finish !== undefined) {
        total++;
        if (
          doc.spec.finish &&
          doc.spec.finish.toLowerCase() === filter.finish.toLowerCase()
        ) {
          matched++;
        }
      }
      if (filter.customer !== undefined) {
        total++;
        if (
          doc.spec.customer &&
          doc.spec.customer.toUpperCase() === filter.customer.toUpperCase()
        ) {
          matched++;
        }
      }
      if (filter.tags && filter.tags.length) {
        for (const t of filter.tags) {
          total++;
          if (doc.spec.tags.includes(t)) matched++;
        }
      }
      if (total === 0) continue;
      if (matched === 0) continue;
      out.set(doc.id, matched / total);
    }
    return out;
  }

  private scoreTolerance(ranges: ToleranceRange[]): Map<string, number> {
    const out = new Map<string, number>();
    if (ranges.length === 0) return out;
    for (const doc of this.docs.values()) {
      let hits = 0;
      for (const r of ranges) {
        const v = doc.spec.numericSpecs[r.key];
        if (v === undefined) continue;
        if (r.min !== undefined && v < r.min) continue;
        if (r.max !== undefined && v > r.max) continue;
        hits++;
      }
      if (hits === 0) continue;
      out.set(doc.id, hits / ranges.length);
    }
    return out;
  }

  // ── Fusion ────────────────────────────────────────────────────────────────

  private fuse(
    maps: {
      key: "full_text" | "semantic" | "visual" | "spec" | "tolerance";
      scores: Map<string, number>;
    }[],
  ): SearchResult[] {
    const combined = new Map<
      string,
      {
        total: number;
        subscores: NonNullable<SearchResult["subscores"]>;
      }
    >();

    for (const { key, scores } of maps) {
      // Rank docs in this mode by score desc
      const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      for (let rank = 0; rank < ranked.length; rank++) {
        const [id, sub] = ranked[rank];
        const rrf = 1 / (RRF_K + rank + 1);
        let entry = combined.get(id);
        if (!entry) {
          entry = { total: 0, subscores: {} };
          combined.set(id, entry);
        }
        entry.total += rrf;
        entry.subscores[key] = sub;
      }
    }

    if (combined.size === 0) return [];
    const maxTotal = Math.max(...[...combined.values()].map((e) => e.total));
    const results: SearchResult[] = [];
    for (const [id, e] of combined) {
      const doc = this.docs.get(id);
      if (!doc) continue;
      results.push(
        SearchResultSchema.parse({
          id,
          canonicalName: doc.canonicalName,
          score: e.total / maxTotal,
          subscores: e.subscores,
        }),
      );
    }
    return results.sort((a, b) => b.score - a.score);
  }

  // ── Entry point ───────────────────────────────────────────────────────────

  search(rawQuery: Partial<SearchQuery>): SearchResult[] {
    const query = SearchQuerySchema.parse(rawQuery);
    const mode = query.mode;
    const active: {
      key: "full_text" | "semantic" | "visual" | "spec" | "tolerance";
      scores: Map<string, number>;
    }[] = [];

    const runFullText = (txt: string) => {
      active.push({ key: "full_text", scores: this.scoreFullText(txt) });
    };
    const runSpec = (filter: Partial<SearchSpec>) => {
      active.push({ key: "spec", scores: this.scoreSpec(filter) });
    };
    const runTolerance = (rs: ToleranceRange[]) => {
      active.push({ key: "tolerance", scores: this.scoreTolerance(rs) });
    };

    if (mode === "full_text" || mode === "unified") {
      if (query.text) runFullText(query.text);
    }
    if (mode === "semantic" || mode === "unified") {
      if (query.embedding) {
        active.push({
          key: "semantic",
          scores: this.scoreSemantic(query.embedding),
        });
      }
    }
    if (mode === "visual" || mode === "unified") {
      if (query.perceptualHash) {
        active.push({
          key: "visual",
          scores: this.scoreVisual(query.perceptualHash),
        });
      }
    }
    if (mode === "spec" || mode === "unified") {
      if (query.specFilter) runSpec(query.specFilter);
    }
    if (mode === "tolerance" || mode === "unified") {
      if (query.toleranceRanges.length) runTolerance(query.toleranceRanges);
    }
    if (mode === "natural_language" || (mode === "unified" && query.naturalLanguage)) {
      if (query.naturalLanguage) {
        const nl = parseNL(query.naturalLanguage);
        if (nl.rest.trim()) runFullText(nl.rest);
        if (
          Object.keys(nl.specEq).length > 0 ||
          nl.tags.length > 0
        ) {
          const filter: Partial<SearchSpec> = {};
          if (nl.specEq.material) filter.material = nl.specEq.material;
          if (nl.specEq.finish) filter.finish = nl.specEq.finish;
          if (nl.specEq.customer) filter.customer = nl.specEq.customer;
          if (nl.tags.length > 0) filter.tags = nl.tags;
          runSpec(filter);
        }
        if (nl.tolerance.length) runTolerance(nl.tolerance);
      }
    }

    const results = this.fuse(active).slice(0, query.limit);
    return results;
  }
}

export const cadSearchUniversalEngine = new CADSearchUniversalEngine();
