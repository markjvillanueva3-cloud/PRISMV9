/**
 * JMDieDocIndexEngine — runtime query surface for the consolidated JM Die / DocuStrata
 * document corpus: `mcp-server/data/jm-die-database/tables/documents.jsonl`
 * (111,745 classified docs — the `JMDieDocuStrataDB` store in `data/databases/DB_MANIFEST.json`).
 *
 * WHY THIS EXISTS (BLACKWELL-DB-GEN-MS0 / U-DB-B1, slot:juliett 2026-06-04):
 *   The store was built (by scripts/build-jm-die-database.mjs) and registered in DB_MANIFEST,
 *   but had NO runtime consumer — nothing in src/ loaded or queried it, and db-toolbelt only
 *   *builds* it. The manifest's "Query via prism_memory:semantic_search" was aspirational (no
 *   indexer fed the corpus into the vector store). This engine closes that gap with a real,
 *   wired keyword/field query so the JM historical-document corpus is reachable for the fleet.
 *
 * PATTERN: mirrors ProgramPrintLinkIndexEngine — exported functions (NOT a physics-style class),
 *   a load that reads the JSONL fully via readFileSync (mtime-cached; re-read only on mtime
 *   change — NOT streamed: measured ~40x faster than readline for this corpus), and a pure query.
 *   FAIL-LOUD: loadDocIndex THROWS on a missing/unreadable corpus (juliett's
 *   "claiming-a-write-succeeded-when-the-on-disk-file-is-empty" refuse — a query over a phantom
 *   corpus must never silently return []). Per-line parse errors are tolerated (counted), but a
 *   corpus that yields ZERO parseable records throws.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/** One classified DocuStrata document record (extra fields tolerated). */
export interface JMDieDocRecord {
  id: string;
  filename?: string;
  title?: string;
  role?: string;
  role_confidence?: number;
  role_tier?: string;
  notebook?: string | null;
  folder?: string | null;
  doc_date?: string | null;
  created_at?: string | null;
  mime?: string;
  size?: number;
  disk_path?: string;
  has_text_layer?: boolean;
  text_layer_chars?: number;
  needs_ocr?: boolean;
  print_score?: number;
  [k: string]: unknown;
}

export interface JMDieDocIndex {
  docs: JMDieDocRecord[];
  byRole: Record<string, number>;
  byTier: Record<string, number>;
  stats: {
    path: string;
    totalLines: number;
    parsed: number;
    parseErrors: number;
    loadedAt: number;
  };
}

export interface LoadDocIndexOptions {
  /** Override the corpus path. Default resolves the canonical jm-die-database documents.jsonl. */
  docsJsonlPath?: string;
}

export interface DocQueryFilter {
  /** Case-insensitive substring match across title + filename + disk_path. */
  text?: string;
  /** Exact classification role (e.g. "SCAN_GENERIC", "BLUEPRINT", "QUOTE"). */
  role?: string;
  /** Exact role tier (e.g. "T1".."T3"). */
  role_tier?: string;
  /** Exact notebook bucket. */
  notebook?: string;
  /** Case-insensitive substring match on folder. */
  folder?: string;
  /** Only docs that do / don't carry an extracted text layer. */
  hasTextLayer?: boolean;
  /** Only docs whose print_score >= this (0..1). */
  minPrintScore?: number;
  /** ISO/locale created_at lower bound (string compare on the stored created_at). */
  dateFrom?: string;
  /** created_at upper bound. */
  dateTo?: string;
  /** Max records returned (default 50, hard cap 500). */
  limit?: number;
}

export interface DocQueryResult {
  matches: JMDieDocRecord[];
  /** Count of ALL docs matching the filter (pre-limit). */
  total: number;
  /** Count actually returned (post-limit). */
  returned: number;
  /** Role histogram of the matched set (pre-limit). */
  roleHistogram: Record<string, number>;
  filter: DocQueryFilter;
}

const DEFAULT_CANDIDATES = [
  "mcp-server/data/jm-die-database/tables/documents.jsonl", // from repo root
  "data/jm-die-database/tables/documents.jsonl", // from mcp-server/ cwd
  "../mcp-server/data/jm-die-database/tables/documents.jsonl",
];

const QUERY_LIMIT_DEFAULT = 50;
const QUERY_LIMIT_MAX = 500;

let _cache: { path: string; mtimeMs: number; index: JMDieDocIndex } | null = null;

function resolveDocsPath(override?: string): string {
  if (override) return resolve(override);
  for (const rel of DEFAULT_CANDIDATES) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return abs;
  }
  // fall through to the canonical; loadDocIndex fail-louds on the missing file
  return resolve(process.cwd(), DEFAULT_CANDIDATES[0]);
}

function buildIndex(raw: string, path: string): JMDieDocIndex {
  // Read the corpus fully (readFileSync) then split — MEASURED 742ms for the live 111k-doc / 57MB
  // corpus vs >30s for a readline stream (per-line async-iterator overhead). The 57MB transient
  // (freed after parse; mtime-cached so only paid on cold load / post-rebuild) is bounded and far
  // under the server's RSS-pressure threshold. [U-DB-B1 scrutiny P1: honest that this does NOT
  // stream — speed wins for a runtime query surface. R7 surface-the-tradeoff, R12 don't overclaim.]
  const lines = raw.split("\n");
  const docs: JMDieDocRecord[] = [];
  const byRole: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  let totalLines = 0;
  let parseErrors = 0;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    totalLines++;
    try {
      const rec = JSON.parse(line) as JMDieDocRecord;
      if (rec && typeof rec === "object" && typeof rec.id === "string") {
        docs.push(rec);
        const role = typeof rec.role === "string" ? rec.role : "UNKNOWN";
        byRole[role] = (byRole[role] || 0) + 1;
        const tier = typeof rec.role_tier === "string" ? rec.role_tier : "UNKNOWN";
        byTier[tier] = (byTier[tier] || 0) + 1;
      } else {
        parseErrors++;
      }
    } catch {
      parseErrors++;
    }
  }
  if (docs.length === 0) {
    throw new Error(
      `JMDieDocIndexEngine: corpus at ${path} has ${totalLines} non-blank line(s) but ZERO parseable records — refusing an empty index (corrupt/truncated corpus). Rebuild via 'node scripts/build-jm-die-database.mjs'.`,
    );
  }
  return {
    docs,
    byRole,
    byTier,
    stats: { path, totalLines, parsed: docs.length, parseErrors, loadedAt: Date.now() },
  };
}

/**
 * Load the JM Die document corpus index. Reads the JSONL fully (mtime-cached; re-read on mtime change).
 * THROWS if the corpus file is missing (FAIL-LOUD — never a silent empty index over a phantom store).
 */
export async function loadDocIndex(options: LoadDocIndexOptions = {}): Promise<JMDieDocIndex> {
  const path = resolveDocsPath(options.docsJsonlPath);
  if (!existsSync(path)) {
    throw new Error(
      `JMDieDocIndexEngine: corpus not found at ${path}. Build it via 'node scripts/build-jm-die-database.mjs' (db-toolbelt: jm-die-db). Refusing to query a phantom corpus.`,
    );
  }
  // Cache key is (path, mtimeMs). mtime has ms resolution — a sub-ms content change that
  // preserves mtime would serve a stale index, but this corpus is a batch-rebuild artifact
  // (never mutated sub-ms in production); _resetDocIndexCache() forces a re-read.
  const mtimeMs = statSync(path).mtimeMs;
  if (_cache && _cache.path === path && _cache.mtimeMs === mtimeMs) return _cache.index;
  const index = buildIndex(readFileSync(path, "utf8"), path);
  _cache = { path, mtimeMs, index };
  return index;
}

/**
 * Parse a corpus date (`created_at`/`doc_date`) into a comparable UTC epoch at DATE granularity.
 * Handles the real corpus's US `MM/DD/YYYY[ HH:MM:SS]` format AND ISO `YYYY-MM-DD`, falling back
 * to Date.parse; returns null when unparseable. A plain lexicographic compare was WRONG for the
 * corpus's US-format created_at (e.g. "05/07/2026" sorts before "12/31/2025" but is later in time).
 * [U-DB-B1 scrutiny — date filter correctness on live data]
 */
function parseDocDate(s: unknown): number | null {
  if (typeof s !== "string" || s.trim() === "") return null;
  const t = s.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
  const p = Date.parse(t);
  return Number.isNaN(p) ? null : p;
}

function matchesFilter(d: JMDieDocRecord, f: DocQueryFilter, textLc: string): boolean {
  if (textLc) {
    const hay = `${d.title ?? ""}\n${d.filename ?? ""}\n${d.disk_path ?? ""}`.toLowerCase();
    if (!hay.includes(textLc)) return false;
  }
  if (f.role && d.role !== f.role) return false;
  if (f.role_tier && d.role_tier !== f.role_tier) return false;
  if (f.notebook && d.notebook !== f.notebook) return false;
  if (f.folder) {
    const folder = typeof d.folder === "string" ? d.folder.toLowerCase() : "";
    if (!folder.includes(f.folder.toLowerCase())) return false;
  }
  if (typeof f.hasTextLayer === "boolean" && Boolean(d.has_text_layer) !== f.hasTextLayer) return false;
  if (typeof f.minPrintScore === "number" && !(typeof d.print_score === "number" && d.print_score >= f.minPrintScore)) {
    return false;
  }
  if (f.dateFrom || f.dateTo) {
    const dt = parseDocDate(d.created_at);
    if (dt === null) return false; // an undatable doc cannot satisfy a date bound
    if (f.dateFrom) {
      const from = parseDocDate(f.dateFrom);
      if (from !== null && dt < from) return false;
    }
    if (f.dateTo) {
      const to = parseDocDate(f.dateTo);
      if (to !== null && dt > to) return false;
    }
  }
  return true;
}

/**
 * Pure query over a loaded index. Returns the matched set (pre-limit total + post-limit page)
 * plus a role histogram of the full match. Deterministic — same (filter, index) → same result.
 */
export function queryDocs(filter: DocQueryFilter, index: JMDieDocIndex): DocQueryResult {
  const f = filter && typeof filter === "object" ? filter : {};
  const textLc = typeof f.text === "string" ? f.text.trim().toLowerCase() : "";
  const limit = Math.min(
    QUERY_LIMIT_MAX,
    Math.max(1, Number.isFinite(f.limit) ? Number(f.limit) : QUERY_LIMIT_DEFAULT),
  );
  const roleHistogram: Record<string, number> = {};
  const matched: JMDieDocRecord[] = [];
  for (const d of index.docs) {
    if (!matchesFilter(d, f, textLc)) continue;
    matched.push(d);
    const role = typeof d.role === "string" ? d.role : "UNKNOWN";
    roleHistogram[role] = (roleHistogram[role] || 0) + 1;
  }
  return {
    matches: matched.slice(0, limit),
    total: matched.length,
    returned: Math.min(matched.length, limit),
    roleHistogram,
    filter: f,
  };
}

/** Test/maintenance hook — clears the mtime cache so the next load re-reads. */
export function _resetDocIndexCache(): void {
  _cache = null;
}
