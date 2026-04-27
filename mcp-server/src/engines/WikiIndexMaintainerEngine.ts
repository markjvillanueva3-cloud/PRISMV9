// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine is consumed
// directly by wiki-bootstrap.mjs and (later) WikiIngestRouterEngine until then.
/**
 * WikiIndexMaintainerEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI02
 *
 * Owns `H:/prism/knowledge/wiki/index.md` and the `index.jsonl` sidecar.
 * Append-on-event semantics (NOT regenerated). Atomic upsert by slug, with a
 * file lock so multiple chats can call `.upsert()` concurrently without
 * truncating each other.
 *
 * Index entry format (per WIKI_SCHEMA.md §4.1):
 *   - [[slug]] — summary | category:X | sources:N | confidence:0.85 | last_verified:YYYY-MM-DD | source:path
 *
 * Sidecar: each line of `index.jsonl` is one JSON object so the
 * HNSW indexer can vectorize without re-parsing markdown.
 *
 * Conflict resolution per WIKI_SCHEMA.md §6.7 (3-way merge):
 *   (a) latest last_verified wins
 *   (b) larger sources array wins
 *   (c) content hash newer write wins
 */

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { withWikiLock } from "../utils/wikiLock.js";

const DEFAULT_INDEX_PATH = "H:/prism/knowledge/wiki/index.md";
const DEFAULT_JSONL_PATH = "H:/prism/knowledge/wiki/index.jsonl";

const CATEGORIES = [
  "concepts",
  "entities",
  "decisions",
  "patterns",
  "trajectories",
  "summaries",
  "code-tribal",
  "architecture",
  "software-engineering",
  "ux-design",
  "lessons",
];

const ENTRY_LINE_RE =
  /^-\s+\[\[([^\]]+)\]\]\s+—\s+(.*?)\s+\|\s+category:([\w-]+)\s+\|\s+sources:(\d+)\s+\|\s+confidence:([\d.]+)\s+\|\s+last_verified:(\d{4}-\d{2}-\d{2})(?:\s+\|\s+source:(\S+))?\s*$/;
const CATEGORY_HEADER_RE = /^##\s+([\w-]+)\s*$/;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,79}$/i;

export interface WikiEntry {
  slug: string;
  category: string;
  summary: string;
  sources: string[];
  confidence: number;
  last_verified: string;
  /** Provenance — `bootstrap` | `claude` | `ollama` | `manual` | `merge`. */
  source: string;
}

export interface UpsertResult {
  slug: string;
  added: boolean;
  updated: boolean;
  conflict_resolved?: "incoming-wins" | "existing-wins" | "merge";
}

export interface UpsertManyResult {
  added: number;
  updated: number;
  unchanged: number;
  results: UpsertResult[];
}

export class WikiIndexMaintainerEngine extends BaseEngine {
  private readonly indexPath: string;
  private readonly jsonlPath: string;

  constructor(
    indexPath: string = DEFAULT_INDEX_PATH,
    jsonlPath: string = DEFAULT_JSONL_PATH
  ) {
    super({
      name: "WikiIndexMaintainerEngine",
      version: "1.0.0",
      domain: "knowledge-wiki",
      description:
        "Owner of wiki/index.md and wiki/index.jsonl. Atomic upsert with file lock and 3-way conflict resolution.",
    });
    this.indexPath = indexPath;
    this.jsonlPath = jsonlPath;
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "upsert", description: "Insert or update one entry by slug. Atomic." },
      { name: "upsertMany", description: "Bulk upsert. Single lock + write." },
      { name: "read", description: "Return all entries (parsed)." },
      { name: "getBySlug", description: "Lookup one entry by slug." },
      { name: "getByCategory", description: "Filter entries by category." },
      { name: "remove", description: "Remove an entry by slug." },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    const e = input as Partial<WikiEntry>;
    if (!e.slug || typeof e.slug !== "string" || !SLUG_RE.test(e.slug)) {
      return "slug required, must match [a-z0-9-]{2,80}";
    }
    if (!e.category || !CATEGORIES.includes(e.category)) {
      return `category must be one of: ${CATEGORIES.join(", ")}`;
    }
    if (typeof e.summary !== "string" || e.summary.length === 0) return "summary required";
    if (!Array.isArray(e.sources) || e.sources.length < 1) return "sources must be non-empty array";
    if (typeof e.confidence !== "number" || !Number.isFinite(e.confidence)) {
      return "confidence must be finite number";
    }
    if (e.confidence < 0 || e.confidence > 1) return "confidence must be in [0, 1]";
    if (!e.last_verified || !/^\d{4}-\d{2}-\d{2}$/.test(e.last_verified)) {
      return "last_verified required (YYYY-MM-DD)";
    }
    if (!e.source || typeof e.source !== "string") return "source required";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<UpsertResult> {
    return this.upsert(input as WikiEntry);
  }

  async upsert(entry: WikiEntry): Promise<UpsertResult> {
    const err = this.validate(entry);
    if (err) throw new Error(`WikiIndexMaintainerEngine.upsert: ${err}`);
    const result = await this.upsertMany([entry]);
    return result.results[0];
  }

  /**
   * Bulk upsert. Acquires the index lock once and writes all entries
   * (plus the jsonl sidecar) in a single atomic pass.
   */
  async upsertMany(entries: WikiEntry[]): Promise<UpsertManyResult> {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { added: 0, updated: 0, unchanged: 0, results: [] };
    }
    for (const e of entries) {
      const err = this.validate(e);
      if (err) throw new Error(`WikiIndexMaintainerEngine.upsertMany: ${err} (slug=${(e as { slug?: unknown }).slug ?? "?"})`);
    }

    return withWikiLock(this.indexPath, "WikiIndexMaintainerEngine", async () => {
      const existing = await this.readUnlocked();
      const bySlug = new Map(existing.map((e) => [e.slug, e]));
      const results: UpsertResult[] = [];
      let added = 0;
      let updated = 0;
      let unchanged = 0;

      for (const incoming of entries) {
        const prior = bySlug.get(incoming.slug);
        if (!prior) {
          bySlug.set(incoming.slug, incoming);
          results.push({ slug: incoming.slug, added: true, updated: false });
          added++;
          continue;
        }

        const winner = resolveConflict(prior, incoming);
        if (winner === "incoming") {
          if (entriesEqual(prior, incoming)) {
            results.push({ slug: incoming.slug, added: false, updated: false });
            unchanged++;
          } else {
            bySlug.set(incoming.slug, incoming);
            results.push({
              slug: incoming.slug,
              added: false,
              updated: true,
              conflict_resolved: "incoming-wins",
            });
            updated++;
          }
        } else {
          results.push({
            slug: incoming.slug,
            added: false,
            updated: false,
            conflict_resolved: "existing-wins",
          });
          unchanged++;
        }
      }

      const merged = [...bySlug.values()];
      await this.writeIndex(merged);
      await this.writeJsonl(merged);
      return { added, updated, unchanged, results };
    });
  }

  async read(): Promise<WikiEntry[]> {
    return this.readUnlocked();
  }

  async getBySlug(slug: string): Promise<WikiEntry | undefined> {
    const all = await this.readUnlocked();
    return all.find((e) => e.slug === slug);
  }

  async getByCategory(category: string): Promise<WikiEntry[]> {
    const all = await this.readUnlocked();
    return all.filter((e) => e.category === category);
  }

  async remove(slug: string): Promise<boolean> {
    if (!slug) return false;
    return withWikiLock(this.indexPath, "WikiIndexMaintainerEngine", async () => {
      const all = await this.readUnlocked();
      const next = all.filter((e) => e.slug !== slug);
      if (next.length === all.length) return false;
      await this.writeIndex(next);
      await this.writeJsonl(next);
      return true;
    });
  }

  private async readUnlocked(): Promise<WikiEntry[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.indexPath, "utf-8");
    } catch {
      return [];
    }
    return parseIndex(raw);
  }

  private async writeIndex(entries: WikiEntry[]): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await atomicWrite(this.indexPath, formatIndex(entries, today));
  }

  private async writeJsonl(entries: WikiEntry[]): Promise<void> {
    const lines = entries.map((e) => JSON.stringify(e));
    await atomicWrite(this.jsonlPath, lines.join("\n") + (lines.length ? "\n" : ""));
  }

  getIndexPath(): string {
    return this.indexPath;
  }

  getJsonlPath(): string {
    return this.jsonlPath;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

export function parseIndex(raw: string): WikiEntry[] {
  if (!raw) return [];
  const out: WikiEntry[] = [];
  let currentCat: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const cat = CATEGORY_HEADER_RE.exec(line);
    if (cat && CATEGORIES.includes(cat[1])) {
      currentCat = cat[1];
      continue;
    }
    const m = ENTRY_LINE_RE.exec(line);
    if (!m) continue;
    out.push({
      slug: m[1],
      summary: m[2].trim(),
      category: m[3],
      sources: m[7] ? [m[7]] : [],
      confidence: parseFloat(m[5]),
      last_verified: m[6],
      source: "preserved",
    });
    void currentCat;
  }
  return out;
}

export function formatIndex(entries: WikiEntry[], today: string): string {
  const byCat = new Map<string, WikiEntry[]>();
  for (const e of entries) {
    const arr = byCat.get(e.category) ?? [];
    arr.push(e);
    byCat.set(e.category, arr);
  }
  const lines: string[] = [];
  lines.push("---");
  lines.push("title: PRISM Wiki Index");
  lines.push("category: meta");
  lines.push(`last_verified: ${today}`);
  lines.push("author: hybrid");
  lines.push("---");
  lines.push("");
  lines.push("# PRISM Wiki Index");
  lines.push("");
  lines.push("> LLM-maintained catalog. See `WIKI_SCHEMA.md` §4.1. Owned by `WikiIndexMaintainerEngine` — atomic upsert under `wikiLock`.");
  lines.push("");
  lines.push(`Total entries: ${entries.length}`);
  lines.push("");
  for (const cat of CATEGORIES) {
    const arr = byCat.get(cat);
    if (!arr || arr.length === 0) continue;
    arr.sort((a, b) => a.slug.localeCompare(b.slug));
    lines.push(`## ${cat}`);
    lines.push("");
    for (const e of arr) {
      const src = e.sources?.[0] ?? "";
      lines.push(
        `- [[${e.slug}]] — ${e.summary} | category:${cat} | sources:${e.sources.length} | confidence:${e.confidence} | last_verified:${e.last_verified}` +
          (src ? ` | source:${src}` : "")
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Content-equality. Deliberately IGNORES `source` (provenance metadata):
 * a re-read from disk loses the original provenance and parseIndex stamps
 * "preserved", so comparing on `source` would make every idempotent re-upsert
 * look like a content change. WIKI_SCHEMA §4.1 treats `source` as bookkeeping
 * for the index, not as part of the page's identity.
 */
export function entriesEqual(a: WikiEntry, b: WikiEntry): boolean {
  if (a.slug !== b.slug) return false;
  if (a.category !== b.category) return false;
  if (a.summary !== b.summary) return false;
  if (a.confidence !== b.confidence) return false;
  if (a.last_verified !== b.last_verified) return false;
  if (a.sources.length !== b.sources.length) return false;
  for (let i = 0; i < a.sources.length; i++) if (a.sources[i] !== b.sources[i]) return false;
  return true;
}

/** WIKI_SCHEMA.md §6.7 — 3-way conflict resolution. */
export function resolveConflict(prior: WikiEntry, incoming: WikiEntry): "incoming" | "existing" {
  // (a) latest last_verified wins
  if (prior.last_verified !== incoming.last_verified) {
    return incoming.last_verified > prior.last_verified ? "incoming" : "existing";
  }
  // (b) larger sources array wins
  if (prior.sources.length !== incoming.sources.length) {
    return incoming.sources.length > prior.sources.length ? "incoming" : "existing";
  }
  // (c) content hash — incoming wins if hashes differ (treat as more recent write)
  const ha = hashEntry(prior);
  const hb = hashEntry(incoming);
  return ha === hb ? "existing" : "incoming";
}

/** Content hash — must mirror entriesEqual's field set so identical content
 * collapses to the same digest regardless of provenance. */
function hashEntry(e: WikiEntry): string {
  return createHash("sha1")
    .update(`${e.slug}|${e.category}|${e.summary}|${e.confidence}|${e.last_verified}|${e.sources.join(",")}`)
    .digest("hex");
}

export const wikiIndexMaintainerEngine = new WikiIndexMaintainerEngine();
export const WIKI_INDEX_PATH_DEFAULT = DEFAULT_INDEX_PATH;
export const WIKI_INDEX_JSONL_PATH_DEFAULT = DEFAULT_JSONL_PATH;
export const WIKI_CATEGORIES = CATEGORIES;
