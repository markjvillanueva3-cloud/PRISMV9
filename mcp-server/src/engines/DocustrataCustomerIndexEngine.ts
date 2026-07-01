/**
 * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
 * customer-folder index (phase23-customer-folder-index.json).
 *
 * The Docustrata print-reading pipeline (Docustrata/.index/docustrata-pipeline.py)
 * ends with a `customer-rollup` stage that aggregates the blueprint <-> program
 * join into one record per JM-Die customer folder: the customer's CNC programs,
 * CAD files, Docustrata prints matched to its part numbers, machine categories,
 * and a match-confidence breakdown. This engine surfaces that artifact to PRISM
 * (the prism_cad dispatcher) — list / get / search customers, totals, and a
 * reverse part-number -> customers lookup.
 *
 * The index lives in the UNVERSIONED Docustrata/.index/ scratch tree. On a
 * machine where the pipeline has never run the file is absent; every method
 * then returns a structured `{ available: false }` result and never throws.
 * The parsed index is cached and invalidated on file mtime change, so a fresh
 * pipeline run is picked up without a process restart.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES — public
// ============================================================================

/** One customer-folder record, as stored under `customers[<name>]`. */
export interface CustomerEntry {
  resolved: boolean;
  coverage: string;
  program_count: number;
  cad_count: number;
  matched_print_count: number;
  matched_print_exact: number;
  machine_categories: string[];
  match_confidence: Record<string, number>;
  part_number_count: number;
  part_numbers: string[];
  programs: unknown[];
  cad: unknown[];
  matched_prints: unknown[];
}

/** Lightweight per-customer row — list/search results omit the heavy
 * programs/cad/part_numbers arrays so a list call stays bounded. */
export interface CustomerSummary {
  name: string;
  resolved: boolean;
  coverage: string;
  program_count: number;
  cad_count: number;
  matched_print_count: number;
  matched_print_exact: number;
  part_number_count: number;
  machine_categories: string[];
}

export interface CustomerFolderIndex {
  schemaVersion?: string;
  generatedAt?: string;
  max_list?: number;
  totals?: Record<string, unknown>;
  noise?: Record<string, unknown>;
  customers: Record<string, CustomerEntry>;
}

export type SortKey = "programs" | "cad" | "prints" | "name";

export interface QueryOpts {
  /** Override the index-file location. Defaults to the resolved Docustrata
   * scratch path (or $PRISM_DOCUSTRATA_CUSTOMER_INDEX). */
  indexPath?: string;
}

export interface AvailabilityResult {
  available: boolean;
  path: string;
  error?: string;
}

// ============================================================================
// PATH RESOLUTION
// ============================================================================

const ENV_OVERRIDE = "PRISM_DOCUSTRATA_CUSTOMER_INDEX";
const INDEX_REL = path.join(
  "Docustrata", ".index", "phase23-customer-folder-index.json",
);

/** Resolve the default index path. Honors $PRISM_DOCUSTRATA_CUSTOMER_INDEX,
 * then walks up from this module looking for <root>/Docustrata/.index/<file>
 * (handles both dist/ and src/ layouts and sibling worktrees), and finally
 * falls back to the repo-root-relative path three levels up. */
export function defaultIndexPath(): string {
  const env = process.env[ENV_OVERRIDE];
  if (typeof env === "string" && env.trim().length > 0) return env.trim();
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, INDEX_REL);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // mcp-server/{dist,src}/engines -> three levels up is the repo root.
  return path.join(here, "..", "..", "..", INDEX_REL);
}

// ============================================================================
// LOAD + CACHE  (mtime-invalidated)
// ============================================================================

interface CacheEntry {
  path: string;
  mtimeMs: number;
  size: number;
  index: CustomerFolderIndex | null;
  error?: string;
}
let _cache: CacheEntry | null = null;

interface LoadResult {
  available: boolean;
  index?: CustomerFolderIndex;
  error?: string;
  path: string;
}

function loadIndex(indexPath: string): LoadResult {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(indexPath);
  } catch {
    return {
      available: false,
      error: "index file not found — run the Docustrata customer-rollup "
        + "pipeline stage (docustrata-pipeline.py --only customer-rollup)",
      path: indexPath,
    };
  }
  if (
    _cache && _cache.path === indexPath
    && _cache.mtimeMs === stat.mtimeMs && _cache.size === stat.size
  ) {
    return _cache.index
      ? { available: true, index: _cache.index, path: indexPath }
      : { available: false, error: _cache.error, path: indexPath };
  }
  try {
    const raw = fs.readFileSync(indexPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const customers = (parsed as { customers?: unknown } | null)?.customers;
    if (
      !parsed || typeof parsed !== "object" || Array.isArray(parsed)
      || typeof customers !== "object" || customers === null
      || Array.isArray(customers)
    ) {
      const error = "index file is malformed — missing or invalid "
        + "'customers' object";
      _cache = {
        path: indexPath, mtimeMs: stat.mtimeMs, size: stat.size,
        index: null, error,
      };
      return { available: false, error, path: indexPath };
    }
    const index = parsed as CustomerFolderIndex;
    _cache = {
      path: indexPath, mtimeMs: stat.mtimeMs, size: stat.size, index,
    };
    return { available: true, index, path: indexPath };
  } catch (e) {
    const error = `failed to read or parse index: ${(e as Error).message}`;
    _cache = {
      path: indexPath, mtimeMs: stat.mtimeMs, size: stat.size,
      index: null, error,
    };
    return { available: false, error, path: indexPath };
  }
}

/** Drop the in-process cache (forces a reload on the next call). */
function clearCache(): void {
  _cache = null;
}

// ============================================================================
// HELPERS
// ============================================================================

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** A non-null, non-array object — i.e. a usable customer-entry value. The
 * parsed index is unvalidated JSON, so a `customers` value could legally be
 * a primitive/array/null; query methods skip such entries rather than emit a
 * mis-shaped row. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Project a full CustomerEntry down to a bounded summary row. Defensive —
 * a malformed entry yields zeros rather than throwing. */
function summarize(name: string, entry: CustomerEntry | undefined): CustomerSummary {
  const e = (entry ?? {}) as Partial<CustomerEntry>;
  return {
    name,
    resolved: e.resolved === true,
    coverage: typeof e.coverage === "string" ? e.coverage : "unknown",
    program_count: num(e.program_count),
    cad_count: num(e.cad_count),
    matched_print_count: num(e.matched_print_count),
    matched_print_exact: num(e.matched_print_exact),
    part_number_count: num(e.part_number_count),
    machine_categories: strArray(e.machine_categories),
  };
}

const SORT_FIELD: Record<SortKey, (s: CustomerSummary) => number | string> = {
  programs: (s) => s.program_count,
  cad: (s) => s.cad_count,
  prints: (s) => s.matched_print_count,
  name: (s) => s.name,
};

function sortSummaries(rows: CustomerSummary[], sortBy: SortKey): CustomerSummary[] {
  const get = SORT_FIELD[sortBy];
  return [...rows].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv));
    }
    return bv - av; // numeric fields: descending (biggest customers first)
  });
}

/** Clamp a caller-supplied limit. An omitted / non-finite limit -> undefined
 * (no limit); a present finite number -> max(0, floor) so a present-but-
 * non-positive limit (0, negative, fractional < 1) yields an EMPTY list, never
 * a silently unbounded one. */
function cleanLimit(limit: unknown): number | undefined {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return undefined;
  return Math.max(0, Math.floor(limit));
}

// ============================================================================
// QUERY API
// ============================================================================

export interface ListResult {
  available: boolean;
  error?: string;
  path: string;
  sortBy?: SortKey;
  count?: number;
  total?: number;
  customers?: CustomerSummary[];
}

export interface GetResult {
  available: boolean;
  error?: string;
  path: string;
  found: boolean;
  customer?: CustomerEntry & { name: string };
}

export interface SearchResult {
  available: boolean;
  error?: string;
  path: string;
  query: string;
  count?: number;
  matches?: CustomerSummary[];
}

export interface TotalsResult {
  available: boolean;
  error?: string;
  path: string;
  generatedAt?: string;
  schemaVersion?: string;
  customerCount?: number;
  totals?: Record<string, unknown>;
}

export interface FindByPartNumberResult {
  available: boolean;
  error?: string;
  path: string;
  partNumber: string;
  count?: number;
  customers?: string[];
}

/** Is the customer-folder index present and parseable? */
function isAvailable(opts: QueryOpts = {}): AvailabilityResult {
  const p = opts.indexPath ?? defaultIndexPath();
  const r = loadIndex(p);
  return { available: r.available, path: r.path, error: r.error };
}

/** Index-wide totals + provenance. */
function getTotals(opts: QueryOpts = {}): TotalsResult {
  const p = opts.indexPath ?? defaultIndexPath();
  const r = loadIndex(p);
  if (!r.available || !r.index) {
    return { available: false, error: r.error, path: r.path };
  }
  return {
    available: true,
    path: r.path,
    generatedAt: r.index.generatedAt,
    schemaVersion: r.index.schemaVersion,
    customerCount: Object.keys(r.index.customers).length,
    totals: r.index.totals ?? {},
  };
}

/** All customers as bounded summary rows, sorted and optionally limited. */
function listCustomers(
  opts: QueryOpts & { sortBy?: SortKey; limit?: number } = {},
): ListResult {
  const p = opts.indexPath ?? defaultIndexPath();
  const r = loadIndex(p);
  if (!r.available || !r.index) {
    return { available: false, error: r.error, path: r.path };
  }
  // `?? "programs"` only guards null/undefined; an invalid string sortBy
  // (e.g. "foo", "__proto__") must NOT index SORT_FIELD — hasOwnProperty
  // rejects both unknown keys and prototype-chain keys like "__proto__".
  const sortBy: SortKey =
    typeof opts.sortBy === "string"
    && Object.prototype.hasOwnProperty.call(SORT_FIELD, opts.sortBy)
      ? (opts.sortBy as SortKey)
      : "programs";
  const rows = Object.entries(r.index.customers)
    .filter(([, e]) => isPlainObject(e))
    .map(([name, e]) => summarize(name, e as CustomerEntry));
  const sorted = sortSummaries(rows, sortBy);
  const limit = cleanLimit(opts.limit);
  const out = limit !== undefined ? sorted.slice(0, limit) : sorted;
  return {
    available: true,
    path: r.path,
    sortBy,
    total: rows.length,
    count: out.length,
    customers: out,
  };
}

/** One customer's full record (case-insensitive, whitespace-trimmed match). */
function getCustomer(name: unknown, opts: QueryOpts = {}): GetResult {
  const p = opts.indexPath ?? defaultIndexPath();
  if (typeof name !== "string" || name.trim().length === 0) {
    return {
      available: false, path: p, found: false,
      error: "a non-empty customer name is required",
    };
  }
  const r = loadIndex(p);
  if (!r.available || !r.index) {
    return { available: false, error: r.error, path: r.path, found: false };
  }
  const target = name.trim().toLowerCase();
  for (const [k, v] of Object.entries(r.index.customers)) {
    if (k.toLowerCase() !== target) continue;
    if (!isPlainObject(v)) {
      return {
        available: true, path: r.path, found: false,
        error: `customer entry '${k}' is malformed (not an object)`,
      };
    }
    return {
      available: true, path: r.path, found: true,
      customer: { name: k, ...(v as CustomerEntry) },
    };
  }
  return { available: true, path: r.path, found: false };
}

/** Customers whose name contains `query` (case-insensitive substring). */
function searchCustomers(
  query: unknown,
  opts: QueryOpts & { limit?: number } = {},
): SearchResult {
  const p = opts.indexPath ?? defaultIndexPath();
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length === 0) {
    return {
      available: false, path: p, query: "",
      error: "a non-empty search query is required",
    };
  }
  const r = loadIndex(p);
  if (!r.available || !r.index) {
    return { available: false, error: r.error, path: r.path, query: q };
  }
  const ql = q.toLowerCase();
  const matches = Object.entries(r.index.customers)
    .filter(([name, e]) => isPlainObject(e) && name.toLowerCase().includes(ql))
    .map(([name, e]) => summarize(name, e as CustomerEntry));
  const sorted = sortSummaries(matches, "programs");
  const limit = cleanLimit(opts.limit);
  const out = limit !== undefined ? sorted.slice(0, limit) : sorted;
  return {
    available: true, path: r.path, query: q,
    count: out.length, matches: out,
  };
}

/** Reverse lookup — which customers list `partNumber` among their part
 * numbers (case-insensitive, whitespace-trimmed exact match). */
function findByPartNumber(
  partNumber: unknown,
  opts: QueryOpts = {},
): FindByPartNumberResult {
  const p = opts.indexPath ?? defaultIndexPath();
  const pn = typeof partNumber === "string" ? partNumber.trim() : "";
  if (pn.length === 0) {
    return {
      available: false, path: p, partNumber: "",
      error: "a non-empty part number is required",
    };
  }
  const r = loadIndex(p);
  if (!r.available || !r.index) {
    return { available: false, error: r.error, path: r.path, partNumber: pn };
  }
  const target = pn.toLowerCase();
  const hits: string[] = [];
  for (const [name, e] of Object.entries(r.index.customers)) {
    if (!isPlainObject(e)) continue;
    const pns = strArray((e as Partial<CustomerEntry>).part_numbers);
    if (pns.some((x) => x.trim().toLowerCase() === target)) hits.push(name);
  }
  hits.sort((a, b) => a.localeCompare(b));
  return {
    available: true, path: r.path, partNumber: pn,
    count: hits.length, customers: hits,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const docustrataCustomerIndexEngine = {
  defaultIndexPath,
  clearCache,
  isAvailable,
  getTotals,
  listCustomers,
  getCustomer,
  searchCustomers,
  findByPartNumber,
};

export type DocustrataCustomerIndexEngine = typeof docustrataCustomerIndexEngine;
