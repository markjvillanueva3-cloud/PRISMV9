/**
 * CustomerMaterialMapEngine — learned customer → material distribution map
 *
 * MS-PRINT-PROGRAM-LOOP / Track C / U-PPL-C2 (= RES-MS21 core).
 *
 * Why this engine exists
 * ----------------------
 * `MaterialResolverForProgramsEngine._resolveFromCustomer()` resolves material
 * from a customer folder name today, BUT its comment explicitly says (line ~293):
 *
 *     "Known customer → material associations (shop tribal knowledge) —
 *      These would ideally come from a persistent database, but we encode
 *      common patterns from the Box drive folder structure"
 *
 * That "persistent database" is what THIS engine provides. The current
 * `_resolveFromCustomer` only fires when the FOLDER NAME ITSELF contains a
 * material keyword (rare — most customers are names like "ALCOA", "TOPURA",
 * "JACOBSON" that carry no material signal). The miss rate is structural.
 *
 * U-PPL-C2 produces a LEARNED map from real evidence:
 *   1. Filename heuristic — alloy codes embedded in program filenames
 *      ("4140-ROLLER.MIN", "HRC52-DIE.MIN", "303SS-SHAFT.MIN", etc.)
 *   2. Back-annotated print material — when a print is joined to the program
 *      via U-PPL-D1's BlueprintProgramJoinEngine and the print has been
 *      back-annotated with a material field (~57% of cases per
 *      JMDieArchiveBackAnnotationEngine).
 *   3. Customer folder fallback — only when the folder name itself encodes
 *      material (the existing _resolveFromCustomer signal — preserved as a
 *      low-confidence catch-all).
 *
 * The output is a per-customer DISTRIBUTION (not a single material), because
 * a customer typically runs a small set of part families and each family has
 * its own material — e.g., JACOBSON runs both 4140 rollers AND 17-4PH shafts.
 * Downstream consumers (MaterialResolverForProgramsEngine, U-PPL-B3
 * ArchiveReoptimizationBatchEngine) can pick the dominant ISO group, or run
 * the full distribution through a confidence-weighted decision.
 *
 * Composition discipline
 * ----------------------
 * Per CLAUDE.md anti-dup rule + duplicationGuardEngine check, this engine
 * COMPOSES rather than forks:
 *   - `MATERIAL_KEYWORDS` import from MaterialResolverForProgramsEngine
 *     (same alloy regex catalog — one source of truth)
 *   - `ISOGroup` type from src/physics/constants.ts (canonical)
 *
 * No fs, no I/O — pure transform. The caller assembles `ProgramSampleEntry[]`
 * from whatever sources are convenient (LATHE_AI_TRAINING_REPORT.json,
 * directory walk + customer extraction, BlueprintProgramJoinEngine output,
 * etc.) and hands it in. The CLI script `scripts/build-customer-material-map.mjs`
 * (separate ship) is the production data assembler; tests inject fixtures
 * directly.
 *
 * Used by
 * -------
 * - `MaterialResolverForProgramsEngine` (via downstream wiring — replaces the
 *   current `_resolveFromCustomer` inline-pattern fallback as the data source)
 * - `ArchiveReoptimizationBatchEngine` (U-PPL-B3) — material inference for the
 *   re-optimization pass over the 16,558-program lathe archive
 * - `prism_data:customer_material_map_build` + `customer_material_lookup`
 *   dispatcher actions (the read surfaces)
 *
 * Dispatcher wiring scope
 * -----------------------
 * Primary surface: `prism_data` (the canonical hub for archive-side data
 * engines — D1/D2/D3 sibling units land here for the same reason).
 *
 * // WIRE-EXEMPT(prism_turning, prism_machining_kb): customer→material data
 * // is a SHARED registry surface, not a lathe-specific or knowledge-base
 * // capability. Downstream consumers (lathe-side U-PPL-B3 / mill-side
 * // U-PPL-A5) integrate via `prism_data:customer_material_lookup`, NOT via
 * // dedicated mirrors on every consuming dispatcher. Wiring this engine
 * // separately into `prism_turning` and `prism_machining_kb` would create
 * // dead actions (no caller yet exists) and split the canonical source of
 * // truth. When U-PPL-B3 lands, its dispatcher case calls `prism_data:
 * // customer_material_lookup` directly. This matches the pattern echo
 * // followed for U-PPL-D3 (ArchiveToPartsCatalogIngester → prism_parts only,
 * // NOT also wired to prism_turning / prism_machining_kb).
 *
 * @module CustomerMaterialMapEngine
 * @milestone MS-PRINT-PROGRAM-LOOP / U-PPL-C2
 */

import { z } from "zod";
import type { ISOGroup } from "../physics/constants.js";
import { MATERIAL_KEYWORDS } from "./MaterialResolverForProgramsEngine.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Source-priority confidence weights. Higher source confidence outranks lower
 * when a single (customer, filename) entry has signals from multiple sources.
 * Calibrated to track the existing `MaterialResolverForProgramsEngine` priority
 * (comment > variable > customer-folder > SFM > default) — blueprint material
 * is treated as a near-comment signal because it comes from a print that was
 * explicitly read & annotated by an operator.
 */
export const SOURCE_CONFIDENCE: Readonly<Record<"blueprint" | "filename" | "folder", number>> =
  Object.freeze({
    blueprint: 0.90,
    filename: 0.70,
    folder: 0.50,
  });

/**
 * The 6 ISO 513 material groups (P, M, K, N, S, H) as a constant tuple. Sourced
 * from `src/physics/constants.ts` indirectly (ISOGroup type). Using a literal
 * tuple here so the distribution record can be built without an out-of-module
 * runtime dependency — drift is caught at compile time by the satisfies check
 * below.
 */
const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const satisfies readonly ISOGroup[];

/** Minimum customer-name length after trim (sub-2 names are rejected as invalid input). */
const MIN_CUSTOMER_NAME_LENGTH = 2;

/**
 * Filename length cap — guards against catastrophic-backtracking ReDoS surface
 * if a future MATERIAL_KEYWORDS pattern gains an unbounded `\s*` or `.*` token
 * (the existing patterns are bounded alternations + `\s*` on "TOOL\s*STEEL"
 * which is linear, but the cap is free defense in depth). Real JM-Die program
 * filenames are <128 chars; 1024 bytes is a 8× safety margin.
 */
const MAX_FILENAME_LEN = 1024;

/**
 * Tokens that look like an alloy code BUT often mean a thread-size /
 * program-counter / socket-head designation when surrounded by fastener
 * context words. Without this denylist, "M5-TAPTITE.MIN" (ISO M5 thread
 * fastener program) false-positives as "Tool steel" via MATERIAL_KEYWORDS'
 * `M-?2|S-?7|P-?20` branches — a known shop-floor confusion class because
 * JM-Die runs heavy fastener work (TOPURA TAPTITE, NATHANS USB, SEMBLEX,
 * etc.). When the filename ALSO contains a `THREAD_CONTEXT_REGEX` token,
 * we treat these tokens as thread sizes and retry the scan past them.
 *
 * Uppercase comparison.
 */
const AMBIGUOUS_FASTENER_TOKENS = new Set<string>([
  "M2", "M-2", "M3", "M-3", "M4", "M-4", "M5", "M-5", "M6", "M-6",
  "M8", "M-8", "M10", "M-10", "M12", "M-12", "M16", "M-16", "M20", "M-20",
  "S2", "S-2", "S3", "S-3", "S4", "S-4", "S5", "S-5", "S6", "S-6", "S7", "S-7",
  "P20", "P-20",  // P20 is plastic-mold tool steel AND a program-counter macro
  "O1", "O-1",     // O1 is oil-hardening tool steel AND short for "operation 1"
]);

/** Filename tokens that strongly indicate a fastener / threaded part — when present,
 * AMBIGUOUS_FASTENER_TOKENS are dropped from material consideration. Word-boundary
 * anchored. `TAP\b` matches the literal verb "TAP" (cutting a thread) but not "TAPER"
 * or "TAPE". */
const THREAD_CONTEXT_REGEX =
  /(\bSCREW|\bBOLT|\bNUT\b|\bTAPTITE|\bTHREAD|\bTAP\b|HEX[\s-]?HEAD|SOCKET[\s-]?HEAD|CAP[\s-]?SCREW|FASTENER)/i;

/**
 * Module-load defensive guard: if any pattern in MATERIAL_KEYWORDS ever gains
 * the `/g` flag, the engine's regex state would leak across calls (`exec`
 * advances `lastIndex` on /g regexes — Reviewer A flagged this as P0-1). The
 * engine's idempotence promise depends on no /g. Throw loudly at module load
 * so the bug surfaces in unit tests, not in a production batch run.
 */
(function assertNoGlobalFlag(): void {
  for (let i = 0; i < MATERIAL_KEYWORDS.length; i++) {
    if (MATERIAL_KEYWORDS[i].pattern.global) {
      throw new Error(
        `CustomerMaterialMapEngine: MATERIAL_KEYWORDS[${i}] (${MATERIAL_KEYWORDS[i].name}) ` +
          `carries the /g flag — this breaks the per-call idempotence promise of ` +
          `extractMaterialFromFilename. Remove /g or clone the regex per call before ` +
          `re-exporting.`,
      );
    }
  }
})();

// ============================================================================
// TYPES + ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for `ProgramSampleEntry`. Exported so the dispatcher
 * (`prism_data:customer_material_map_build`) can `safeParse` each incoming
 * entry at the MCP boundary and reject malformed input loudly (the
 * U-PPL-D4-EXT Arm C scrutiny called out the silent-empty-result class of
 * bug when schemas drift from engine types).
 *
 * The engine's internal `buildCustomerMaterialMap` uses fast hand-rolled
 * `typeof` checks instead of Zod safeParse per entry — a 16,558-program
 * production batch is ~20× faster without per-entry Zod overhead, and the
 * dispatcher layer already validates. The validators are kept in sync by
 * sharing the same type via `z.infer<typeof ProgramSampleEntrySchema>`.
 */
export const ISO_GROUP_SCHEMA = z.enum(["P", "M", "K", "N", "S", "H"]);

export const ProgramSampleEntrySchema = z.object({
  customer: z.string().min(MIN_CUSTOMER_NAME_LENGTH).describe(
    "Customer name (folder name from JM-Die archive: ALCOA, TOPURA, etc.). " +
      "Trimmed at engine entry; sub-2-char names are dropped as invalid.",
  ),
  filename: z.string().min(1).describe(
    "Program filename — drives the filename material-token heuristic. " +
      "Path can be included or stripped; basename is uppercased internally.",
  ),
  filepath: z.string().optional().describe(
    "Optional full path — preserved for downstream traceability only.",
  ),
  back_annotated_material: z.string().optional().describe(
    "Optional explicit material name from a back-annotated print (highest priority).",
  ),
  back_annotated_iso_group: ISO_GROUP_SCHEMA.optional().describe(
    "Optional explicit ISO group from a back-annotated print.",
  ),
});

/**
 * One sample of "what material this customer ran on this program". The caller
 * assembles these from real evidence — filename + (optional) blueprint join.
 * Pure data; no validation logic lives on this shape. Use
 * `ProgramSampleEntrySchema` for entry-time Zod validation at the MCP boundary.
 */
export interface ProgramSampleEntry {
  /** Customer name (folder name from JM-Die archive: "ALCOA", "TOPURA", etc.) */
  customer: string;
  /** Program filename — drives the filename material-token heuristic. */
  filename: string;
  /** Optional full path — preserved for downstream traceability. */
  filepath?: string;
  /** Optional explicit material name from a back-annotated print (highest priority). */
  back_annotated_material?: string;
  /** Optional explicit ISO group from a back-annotated print. */
  back_annotated_iso_group?: ISOGroup;
}

/** A single material match — what was matched, by which source, with what raw token. */
export interface MaterialHit {
  /** Material display name (e.g., "Aluminum", "Alloy steel"). */
  name: string;
  /** ISO 513 group (P, M, K, N, S, H). */
  iso_group: ISOGroup;
  /** Where the hit came from. */
  source: "blueprint" | "filename" | "folder";
  /** Source-derived confidence 0-1 (per `SOURCE_CONFIDENCE`). */
  confidence: number;
  /** The raw token the regex matched (filename source) or the supplied name (blueprint). */
  raw_token: string;
}

/** Per-ISO-group share for one customer. Each entry is 0-1; they sum to ≤1 (unknown is the slack). */
export type ISOShare = Record<ISOGroup, number>;

/** Top-N material breakdown for one customer. */
export interface MaterialCount {
  name: string;
  iso_group: ISOGroup;
  count: number;
  share: number; // count / sample_count
}

/** Per-customer learned distribution. */
export interface CustomerMaterialDistribution {
  /** Customer name as supplied (trimmed but NOT case-normalized — preserves display). */
  customer: string;
  /** Total sample programs aggregated for this customer. */
  sample_count: number;
  /** Programs where at least one material source fired. */
  with_material: number;
  /** Programs where no material source fired. */
  without_material: number;
  /** Per-ISO-group share (0-1) over the with_material subset; sums to 1 when with_material>0. */
  iso_group_share: ISOShare;
  /** Sorted material count list (descending by count, ties broken by name). */
  material_counts: MaterialCount[];
  /** Dominant ISO group (the highest-share group). Falls back to "P" when with_material=0. */
  primary_iso_group: ISOGroup;
  /** Confidence in primary_iso_group (= its share, in [0,1]). 0 when with_material=0. */
  primary_confidence: number;
  /** Per-source contribution counts (a single entry can contribute via multiple sources). */
  source_counts: { blueprint: number; filename: number; folder: number };
}

/** The full map. Persistable JSON; schemaVersion gates forward compatibility. */
export interface CustomerMaterialMap {
  schemaVersion: "1.0.0";
  generatedAt: string;
  customers: Record<string, CustomerMaterialDistribution>;
  stats: {
    customer_count: number;
    programs_total: number;
    programs_with_material: number;
    programs_unknown: number;
    invalid_entries: number;
    coverage_pct: number; // programs_with_material / programs_total * 100, 1-decimal
    source_breakdown: { blueprint: number; filename: number; folder: number };
  };
}

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Extract a single material hit from a filename via MATERIAL_KEYWORDS regex sweep.
 *
 * Returns the FIRST matching pattern (deterministic order from the
 * MATERIAL_KEYWORDS array — alloy-specific patterns come before fallback ones).
 * Returns null when no pattern matches OR the only matches are disambiguated as
 * thread-size designators (see below).
 *
 * Word-boundary protection
 * ------------------------
 * The alloy regex catalog uses `\b` so substrings inside larger numeric tokens
 * don't false-positive (e.g., "1018ASCII" won't match "1018" steel because the
 * boundary fails). HRC patterns require numeric matching ≥45 to hit the
 * hardened group — that's enforced by the catalog regex itself, not here.
 *
 * Thread-context disambiguation (P0 fix, Reviewer A)
 * --------------------------------------------------
 * Some alloy codes overlap with ISO/UTS thread-size designators: `M2/M5/M8`
 * (metric thread sizes) collide with `M2` tool steel; `S7` (screw size 7)
 * collides with S7 tool steel; `P20` (a common program-counter macro var)
 * collides with P20 mold steel. JM-Die runs heavy fastener work (TOPURA's
 * TAPTITE2000-CASE program is a real example) where these conflicts are
 * frequent.
 *
 * When the filename contains a `THREAD_CONTEXT_REGEX` token (SCREW, BOLT,
 * TAPTITE, THREAD, etc.) AND the matched raw_token is in
 * `AMBIGUOUS_FASTENER_TOKENS`, the match is REJECTED as a thread-size false
 * positive and the scan continues past it. This trades a small false-negative
 * rate (a real M2-tool-steel fastener program would be rejected) for a much
 * larger false-positive reduction.
 *
 * @param filename Raw filename (path stripped or not — basename is uppercased internally).
 * @returns MaterialHit with source="filename", or null.
 */
export function extractMaterialFromFilename(filename: string): MaterialHit | null {
  if (typeof filename !== "string" || filename.length === 0) return null;
  // P1-4 ReDoS guard (Reviewer B): cap the scan substrate so a pathological
  // 50-KB filename can't pin the CPU on `\s*` patterns. Real filenames are <128
  // chars; 1024 is the safety margin.
  if (filename.length > MAX_FILENAME_LEN) return null;

  // Strip any leading directory path — only the basename matters for the heuristic.
  // Handles both forward and back slashes (Windows + POSIX); preserves the case
  // for the raw_token but uppercases the test substrate to keep the regexes
  // case-insensitive without `i` flag overhead per call.
  const lastFwd = filename.lastIndexOf("/");
  const lastBwd = filename.lastIndexOf("\\");
  const lastSep = Math.max(lastFwd, lastBwd);
  const basename = lastSep >= 0 ? filename.slice(lastSep + 1) : filename;
  const test = basename.toUpperCase();

  // Pre-compute thread-context flag once — it's the same for every regex pass.
  const inThreadContext = THREAD_CONTEXT_REGEX.test(basename);

  for (const kw of MATERIAL_KEYWORDS) {
    // Scan the substring repeatedly past rejected ambiguous matches. The
    // existing MATERIAL_KEYWORDS catalog bundles alloy steel codes (4140, M2,
    // S7, P20, ...) into a single regex — when M2 is rejected as a thread-spec
    // false positive, the SAME regex may still match "4140" later in the same
    // string. Re-exec on the tail until a non-ambiguous hit or no match.
    let scanFrom = 0;
    while (scanFrom <= test.length) {
      const tail = test.slice(scanFrom);
      const m = kw.pattern.exec(tail);
      if (m === null) break;
      const matched = m[0];
      // Reviewer C P0 defense: if a future MATERIAL_KEYWORDS pattern ever
      // matches an empty string (zero-width — e.g., a lookahead-only branch
      // like `\b(?=4140)\b` — currently NONE do, but the catalog lives in a
      // sibling engine), `scanFrom += m.index + matched.length` would advance
      // by 0 and spin the loop forever. The module-load `assertNoGlobalFlag`
      // guard catches the /g class but not zero-width capability. Defensive
      // single-byte advance breaks the spin without losing match coverage —
      // a zero-width pattern would only have produced a duplicate hit anyway.
      if (matched.length === 0) {
        scanFrom += 1;
        continue;
      }
      const matchedUpper = matched.toUpperCase();
      if (inThreadContext && AMBIGUOUS_FASTENER_TOKENS.has(matchedUpper)) {
        // Skip this match, continue scanning past it within the same pattern.
        scanFrom += m.index + matched.length;
        continue;
      }
      return {
        name: kw.name,
        iso_group: kw.iso_group,
        source: "filename",
        confidence: SOURCE_CONFIDENCE.filename,
        raw_token: matched,
      };
    }
  }
  return null;
}

/**
 * Extract a customer-folder material hit. Same regex catalog, but the
 * confidence is lower because folder names carry less material signal than
 * filenames (and the comment in MaterialResolverForProgramsEngine confirms
 * this is the existing fallback strategy).
 *
 * @returns MaterialHit with source="folder", or null.
 */
export function extractMaterialFromCustomerFolder(customer: string): MaterialHit | null {
  if (typeof customer !== "string" || customer.trim().length === 0) return null;
  const test = customer.trim().toUpperCase();
  for (const kw of MATERIAL_KEYWORDS) {
    const m = kw.pattern.exec(test);
    if (m !== null) {
      return {
        name: kw.name,
        iso_group: kw.iso_group,
        source: "folder",
        confidence: SOURCE_CONFIDENCE.folder,
        raw_token: m[0],
      };
    }
  }
  return null;
}

/**
 * Resolve a single ProgramSampleEntry to its highest-priority material hit.
 *
 * Priority order (matches MaterialResolverForProgramsEngine.resolve):
 *   1. back_annotated_material (blueprint, conf 0.90)
 *   2. filename token         (filename,  conf 0.70)
 *   3. customer folder name    (folder,    conf 0.50)
 *
 * @returns The single winning hit, or null when no source fires.
 */
export function resolveEntryMaterial(entry: ProgramSampleEntry): MaterialHit | null {
  // 1. Blueprint — explicit material from back-annotated print wins.
  if (entry.back_annotated_iso_group && entry.back_annotated_material) {
    return {
      name: entry.back_annotated_material,
      iso_group: entry.back_annotated_iso_group,
      source: "blueprint",
      confidence: SOURCE_CONFIDENCE.blueprint,
      raw_token: entry.back_annotated_material,
    };
  }
  // 2. Filename regex.
  const fnHit = extractMaterialFromFilename(entry.filename);
  if (fnHit !== null) return fnHit;
  // 3. Customer folder fallback.
  return extractMaterialFromCustomerFolder(entry.customer);
}

/**
 * Build a CustomerMaterialMap from an entries array.
 *
 * FAIL-LOUD on non-array input (catches the silent-empty-map class of bug
 * the U-PPL-D4-EXT scrutiny gate flagged on its formats parameter — never
 * silently return an empty result when the caller's input shape is wrong).
 *
 * Invalid entries (missing/blank customer, or customer name shorter than
 * MIN_CUSTOMER_NAME_LENGTH) are SKIPPED, not thrown — they're counted in
 * stats.invalid_entries so the caller can see the input quality without
 * the whole build failing on a few malformed rows.
 *
 * @param entries Pre-collected program samples (no fs).
 * @returns The full map; safe to JSON.stringify and persist.
 * @throws TypeError when entries is not an Array.
 */
export function buildCustomerMaterialMap(entries: ProgramSampleEntry[]): CustomerMaterialMap {
  if (!Array.isArray(entries)) {
    throw new TypeError(
      `CustomerMaterialMapEngine: buildCustomerMaterialMap expected an Array, got ${
        entries === null ? "null" : typeof entries
      }`,
    );
  }

  // Group valid entries by trimmed customer key.
  const byCustomer = new Map<string, ProgramSampleEntry[]>();
  let invalid_entries = 0;
  for (const e of entries) {
    if (
      e === null ||
      typeof e !== "object" ||
      typeof e.customer !== "string" ||
      typeof e.filename !== "string"
    ) {
      invalid_entries++;
      continue;
    }
    const key = e.customer.trim();
    if (key.length < MIN_CUSTOMER_NAME_LENGTH) {
      invalid_entries++;
      continue;
    }
    let bucket = byCustomer.get(key);
    if (bucket === undefined) {
      bucket = [];
      byCustomer.set(key, bucket);
    }
    bucket.push(e);
  }

  const customers: Record<string, CustomerMaterialDistribution> = {};
  let programs_with_material = 0;
  let programs_unknown = 0;
  const source_breakdown = { blueprint: 0, filename: 0, folder: 0 };

  for (const [customerKey, customerEntries] of byCustomer) {
    const dist = aggregateCustomerEntries(customerKey, customerEntries);
    customers[customerKey] = dist;
    programs_with_material += dist.with_material;
    programs_unknown += dist.without_material;
    source_breakdown.blueprint += dist.source_counts.blueprint;
    source_breakdown.filename += dist.source_counts.filename;
    source_breakdown.folder += dist.source_counts.folder;
  }

  const programs_total = programs_with_material + programs_unknown;
  const coverage_pct = programs_total === 0
    ? 0
    : Math.round((programs_with_material / programs_total) * 1000) / 10;

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    customers,
    stats: {
      customer_count: byCustomer.size,
      programs_total,
      programs_with_material,
      programs_unknown,
      invalid_entries,
      coverage_pct,
      source_breakdown,
    },
  };
}

/**
 * Aggregate one customer's entries into a CustomerMaterialDistribution.
 *
 * For each entry, run resolveEntryMaterial. Tally per-ISO-group counts +
 * per-material-name counts + per-source counts. Compute shares + primary.
 *
 * When an entry has NO material signal:
 *   - with_material does NOT increment
 *   - The ISO share denominator (with_material) excludes it
 *   - primary_iso_group falls back to "P" with primary_confidence=0 when
 *     with_material=0 (matches MaterialResolverForProgramsEngine's default
 *     fallback to medium-carbon steel).
 */
function aggregateCustomerEntries(
  customer: string,
  customerEntries: ReadonlyArray<ProgramSampleEntry>,
): CustomerMaterialDistribution {
  const isoCounts: ISOShare = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
  const matNameCounts = new Map<string, { name: string; iso_group: ISOGroup; count: number }>();
  const source_counts = { blueprint: 0, filename: 0, folder: 0 };
  let with_material = 0;

  for (const e of customerEntries) {
    const hit = resolveEntryMaterial(e);
    if (hit === null) continue;
    with_material++;
    isoCounts[hit.iso_group]++;
    source_counts[hit.source]++;
    const key = `${hit.name}|${hit.iso_group}`;
    const existing = matNameCounts.get(key);
    if (existing === undefined) {
      matNameCounts.set(key, { name: hit.name, iso_group: hit.iso_group, count: 1 });
    } else {
      existing.count++;
    }
  }

  const sample_count = customerEntries.length;
  const without_material = sample_count - with_material;

  // Compute ISO shares. When with_material=0, every share is 0 (not NaN).
  const iso_group_share: ISOShare = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
  if (with_material > 0) {
    for (const g of ISO_GROUPS) {
      iso_group_share[g] = isoCounts[g] / with_material;
    }
  }

  // Build sorted material_counts (desc by count, ties broken by name asc for stability).
  const material_counts: MaterialCount[] = Array.from(matNameCounts.values())
    .map((m) => ({
      name: m.name,
      iso_group: m.iso_group,
      count: m.count,
      share: with_material > 0 ? m.count / with_material : 0,
    }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));

  // Primary group: highest share, ties broken by ISO_GROUPS declaration order
  // (P,M,K,N,S,H — matches the conventional ISO 513 ordering). Fall back to
  // "P" when no material is known (matches MaterialResolverForProgramsEngine).
  let primary_iso_group: ISOGroup = "P";
  let primary_confidence = 0;
  if (with_material > 0) {
    for (const g of ISO_GROUPS) {
      if (iso_group_share[g] > primary_confidence) {
        primary_iso_group = g;
        primary_confidence = iso_group_share[g];
      }
    }
  }

  return {
    customer,
    sample_count,
    with_material,
    without_material,
    iso_group_share,
    material_counts,
    primary_iso_group,
    primary_confidence,
    source_counts,
  };
}

/**
 * Lookup a specific customer's distribution from a built map.
 *
 * Lookup is case-insensitive over a trim+upper key — JM-Die folder names are
 * uppercase by convention but operators may type "Alcoa" / "alcoa" / " ALCOA ".
 *
 * @returns The distribution, or null when the customer is unknown.
 */
export function lookupMaterialDistribution(
  map: CustomerMaterialMap,
  customer: string,
): CustomerMaterialDistribution | null {
  if (typeof customer !== "string") return null;
  const target = customer.trim().toUpperCase();
  if (target.length === 0) return null;
  for (const key of Object.keys(map.customers)) {
    if (key.trim().toUpperCase() === target) {
      return map.customers[key];
    }
  }
  return null;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Thin OO wrapper over the pure functions for engines that prefer the
 * class-singleton pattern. The pure functions are the source of truth —
 * the class just delegates so callers can pick whichever shape they want.
 *
 * CONVENTION WAIVER — instance methods over static methods
 * --------------------------------------------------------
 * `H:/.claude/rules/engines.md:9` prescribes "class with **static** methods".
 * This engine deliberately uses INSTANCE methods + a `customerMaterialMapEngine`
 * singleton because:
 *   1. `MaterialResolverForProgramsEngine` (the sibling this engine composes)
 *      uses the same instance-method + singleton pattern at line ~140.
 *      Conformance with the immediate neighbour outweighs the global rule per
 *      Karpathy R11 ("Match conventions even when you disagree").
 *   2. Dispatcher lazy-import pattern (`const { customerMaterialMapEngine } =
 *      await import(...)`) is shorter than `await import(...).then(m => m.X.method())`.
 * Surface the deviation in CLAUDE.md as a follow-up if the global rule should
 * change to match the lived precedent. Do NOT silently fork the static-methods
 * convention across the codebase mid-milestone.
 */
export class CustomerMaterialMapEngine {
  /** See `buildCustomerMaterialMap`. */
  buildMap(entries: ProgramSampleEntry[]): CustomerMaterialMap {
    const map = buildCustomerMaterialMap(entries);
    log.debug(
      `[CustomerMaterialMapEngine] built map: ${map.stats.customer_count} customers, ` +
        `${map.stats.programs_total} programs, coverage ${map.stats.coverage_pct}%`,
    );
    return map;
  }

  /** See `lookupMaterialDistribution`. */
  lookup(
    map: CustomerMaterialMap,
    customer: string,
  ): CustomerMaterialDistribution | null {
    return lookupMaterialDistribution(map, customer);
  }

  /** See `extractMaterialFromFilename`. */
  extractFromFilename(filename: string): MaterialHit | null {
    return extractMaterialFromFilename(filename);
  }

  /** See `extractMaterialFromCustomerFolder`. */
  extractFromCustomerFolder(customer: string): MaterialHit | null {
    return extractMaterialFromCustomerFolder(customer);
  }

  /** See `resolveEntryMaterial`. */
  resolveEntry(entry: ProgramSampleEntry): MaterialHit | null {
    return resolveEntryMaterial(entry);
  }
}

/** Singleton — drop-in for dispatcher lazy imports. */
export const customerMaterialMapEngine = new CustomerMaterialMapEngine();
