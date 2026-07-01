/**
 * JMDiePartLibraryEngine — runtime query surface for the consolidated JM Die part-library
 * index: `state/shared/databases/jm-part-library.jsonl` (30,890 part-number-keyed records,
 * built by scripts/build-jm-part-library.mjs from the orphaned `part.json` extraction sidecars).
 *
 * WHY THIS EXISTS (DB-EXPANSION / DB-GAP-LIST B2, slot:juliett 2026-06-08):
 *   The 30,890 `part.json` sidecars under `H:/PRISM/JM DIE/Prism JM Die/**` are the
 *   phase18-build-part-library.py output — each carries the blueprint-program-join-v6
 *   result for one part number (prints[], cncPrograms[], cadCam[], matchConfidence). They
 *   were PRODUCED but never databased and had NO runtime consumer (67% land `_UNASSIGNED`).
 *   The B2 ingest consolidated them into one JSONL; this engine is the consumer that closes
 *   the gap so the print-to-program part index is reachable for the fleet.
 *
 * PATTERN: mirrors JMDieDocIndexEngine (U-DB-B1) — exported functions (NOT a physics class),
 *   readFileSync-then-split load (mtime-cached; measured far faster than readline for a one-shot
 *   batch-built corpus of this size), a pure filter query, and FAIL-LOUD load (THROWS on a
 *   missing/empty corpus rather than silently returning [] over a phantom store).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/** One consolidated part-library record (extra fields tolerated). */
export interface JMDiePartRecord {
  schemaVersion?: string;
  partNumber: string;
  partNumberNormalized?: string;
  customer: string;
  customerSource?: string | null;
  matchConfidence?: string; // miss | loose | ambiguous | exact | other
  rawMatchConfidence?: string;
  assigned?: boolean;
  printCount?: number;
  programCount?: number;
  cadCamCount?: number;
  hasProgramLink?: boolean;
  hasCadLink?: boolean;
  joinTableSource?: string | null;
  prints?: unknown[];
  cncPrograms?: unknown[];
  cadCam?: unknown[];
  sourceSidecar?: string;
  /** present on the explicit malformed-sidecar bucket (zero-drop ingest). */
  malformed?: boolean;
  [k: string]: unknown;
}

export interface JMDiePartIndex {
  parts: JMDiePartRecord[];
  byMatchConfidence: Record<string, number>;
  stats: {
    path: string;
    totalLines: number;
    parsed: number;
    parseErrors: number;
    malformed: number;
    assigned: number;
    unassigned: number;
    withProgramLink: number;
    withCadLink: number;
    loadedAt: number;
  };
}

export interface LoadPartIndexOptions {
  /** Override the store path. Default resolves the canonical jm-part-library.jsonl. */
  storeJsonlPath?: string;
}

export interface PartQueryFilter {
  /** Case-insensitive exact partNumber match (normalized — trims, upper). */
  partNumber?: string;
  /** Case-insensitive substring match on partNumber (for prefix/fuzzy lookup). */
  partNumberContains?: string;
  /** Case-insensitive exact customer match. */
  customer?: string;
  /** Case-insensitive substring match on customer. */
  customerContains?: string;
  /** Exact matchConfidence (miss | loose | ambiguous | exact | other). */
  matchConfidence?: string;
  /** true → only assigned (non-`_UNASSIGNED`); false → only unassigned. */
  assigned?: boolean;
  /** true → only records with a CNC program join; false → only without. */
  hasProgramLink?: boolean;
  /** true → only records with a CAD/CAM join. */
  hasCadLink?: boolean;
  /** Max records returned (default 50, hard cap 500). */
  limit?: number;
}

export interface PartQueryResult {
  matches: JMDiePartRecord[];
  /** Count of ALL parts matching the filter (pre-limit). */
  total: number;
  /** Count actually returned (post-limit). */
  returned: number;
  /** matchConfidence histogram of the matched set (pre-limit). */
  matchConfidenceHistogram: Record<string, number>;
  filter: PartQueryFilter;
}

const DEFAULT_CANDIDATES = [
  "state/shared/databases/jm-part-library.jsonl", // from repo root
  "../state/shared/databases/jm-part-library.jsonl", // from mcp-server/ cwd
  "H:/prism/state/shared/databases/jm-part-library.jsonl", // absolute fallback
];

const QUERY_LIMIT_DEFAULT = 50;
const QUERY_LIMIT_MAX = 500;

let _cache: { path: string; mtimeMs: number; index: JMDiePartIndex } | null = null;

function resolveStorePath(override?: string): string {
  if (override) return resolve(override);
  for (const rel of DEFAULT_CANDIDATES) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return abs;
  }
  return resolve(process.cwd(), DEFAULT_CANDIDATES[0]);
}

function buildIndex(raw: string, path: string): JMDiePartIndex {
  const lines = raw.split("\n");
  const parts: JMDiePartRecord[] = [];
  const byMatchConfidence: Record<string, number> = {};
  let totalLines = 0;
  let parseErrors = 0;
  let malformed = 0;
  let assigned = 0;
  let unassigned = 0;
  let withProgramLink = 0;
  let withCadLink = 0;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    totalLines++;
    let rec: JMDiePartRecord;
    try {
      rec = JSON.parse(line) as JMDiePartRecord;
    } catch {
      parseErrors++;
      continue;
    }
    if (!rec || typeof rec !== "object") {
      parseErrors++;
      continue;
    }
    parts.push(rec);
    if (rec.malformed === true) {
      malformed++;
      continue; // a malformed-sidecar row carries no queryable fields
    }
    const mc = typeof rec.matchConfidence === "string" ? rec.matchConfidence : "other";
    byMatchConfidence[mc] = (byMatchConfidence[mc] || 0) + 1;
    if (rec.assigned === true) assigned++;
    else unassigned++;
    if (rec.hasProgramLink === true) withProgramLink++;
    if (rec.hasCadLink === true) withCadLink++;
  }
  if (parts.length === 0) {
    throw new Error(
      `JMDiePartLibraryEngine: store at ${path} has ${totalLines} non-blank line(s) but ZERO parseable records — refusing an empty index (corrupt/truncated store). Rebuild via 'node scripts/build-jm-part-library.mjs'.`,
    );
  }
  return {
    parts,
    byMatchConfidence,
    stats: {
      path,
      totalLines,
      parsed: parts.length,
      parseErrors,
      malformed,
      assigned,
      unassigned,
      withProgramLink,
      withCadLink,
      loadedAt: Date.now(),
    },
  };
}

/**
 * Load the consolidated part-library index. Reads the JSONL fully (mtime-cached; re-read on
 * mtime change). THROWS if the store is missing (FAIL-LOUD — never a silent empty index).
 * @param options - optional store-path override
 * @returns the loaded {@link JMDiePartIndex}
 */
export async function loadPartIndex(options: LoadPartIndexOptions = {}): Promise<JMDiePartIndex> {
  const path = resolveStorePath(options.storeJsonlPath);
  if (!existsSync(path)) {
    throw new Error(
      `JMDiePartLibraryEngine: store not found at ${path}. Build it via 'node scripts/build-jm-part-library.mjs'. Refusing to query a phantom store.`,
    );
  }
  const mtimeMs = statSync(path).mtimeMs;
  if (_cache && _cache.path === path && _cache.mtimeMs === mtimeMs) return _cache.index;
  const index = buildIndex(readFileSync(path, "utf8"), path);
  _cache = { path, mtimeMs, index };
  return index;
}

function normPN(s: unknown): string {
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

function matchesFilter(p: JMDiePartRecord, f: PartQueryFilter): boolean {
  if (p.malformed === true) return false; // malformed rows never satisfy a field filter
  if (f.partNumber) {
    if (normPN(p.partNumber) !== normPN(f.partNumber)) return false;
  }
  if (f.partNumberContains) {
    if (!normPN(p.partNumber).includes(normPN(f.partNumberContains))) return false;
  }
  if (f.customer) {
    const c = typeof p.customer === "string" ? p.customer.trim().toUpperCase() : "";
    if (c !== f.customer.trim().toUpperCase()) return false;
  }
  if (f.customerContains) {
    const c = typeof p.customer === "string" ? p.customer.toLowerCase() : "";
    if (!c.includes(f.customerContains.toLowerCase())) return false;
  }
  if (f.matchConfidence && p.matchConfidence !== f.matchConfidence) return false;
  if (typeof f.assigned === "boolean" && Boolean(p.assigned) !== f.assigned) return false;
  if (typeof f.hasProgramLink === "boolean" && Boolean(p.hasProgramLink) !== f.hasProgramLink) return false;
  if (typeof f.hasCadLink === "boolean" && Boolean(p.hasCadLink) !== f.hasCadLink) return false;
  return true;
}

/**
 * Pure query over a loaded part index. Returns the matched set (pre-limit total + post-limit page)
 * plus a matchConfidence histogram of the full match. Deterministic — same (filter, index) → same result.
 * @param filter - field filters; an empty/invalid filter matches all non-malformed rows
 * @param index - a loaded {@link JMDiePartIndex}
 * @returns the {@link PartQueryResult}
 */
export function queryParts(filter: PartQueryFilter, index: JMDiePartIndex): PartQueryResult {
  const f = filter && typeof filter === "object" ? filter : {};
  const limit = Math.min(
    QUERY_LIMIT_MAX,
    Math.max(1, Number.isFinite(f.limit) ? Number(f.limit) : QUERY_LIMIT_DEFAULT),
  );
  const matchConfidenceHistogram: Record<string, number> = {};
  const matched: JMDiePartRecord[] = [];
  for (const p of index.parts) {
    if (!matchesFilter(p, f)) continue;
    matched.push(p);
    const mc = typeof p.matchConfidence === "string" ? p.matchConfidence : "other";
    matchConfidenceHistogram[mc] = (matchConfidenceHistogram[mc] || 0) + 1;
  }
  return {
    matches: matched.slice(0, limit),
    total: matched.length,
    returned: Math.min(matched.length, limit),
    matchConfidenceHistogram,
    filter: f,
  };
}

/** Test/maintenance hook — clears the mtime cache so the next load re-reads. */
export function _resetPartIndexCache(): void {
  _cache = null;
}
