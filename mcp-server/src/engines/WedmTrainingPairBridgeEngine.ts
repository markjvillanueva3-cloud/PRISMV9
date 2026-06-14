/**
 * WedmTrainingPairBridgeEngine — index + lookup over mike's WEDM training-corpus
 *
 * Closes U-OSC9-13 of OSCAR-SFC-9AXIS-MS0. Surfaces mike's Wire-EDM training pairs
 * (blueprint-PDF + reference-program-path records under `wedm-training-corpus/`) so
 * the SFC stack can answer "for THIS workpiece (by stem or customer), what reference
 * programs already exist in mike's corpus?" — without having to re-derive parameters
 * from scratch.
 *
 * Data source (verified 2026-05-26 on operator's machine):
 *   `state/shared/wedm-training-corpus/<pair_stem>-phase-a1.json` × 98 records
 *   `state/shared/wedm-training-corpus/_sweep-summary.json` × 1 metadata file
 *
 * Per-pair shape (schema 1.1.0):
 *   { pair_stem, pair_tier, pair_confidence, blueprint_paths[], reference_program_path,
 *     reference_metadata: { format, bytes_total, magic_verified, ... },
 *     parse: { ok, gap, gap_reason },
 *     wizard: { ok, skipped, skip_reason },
 *     compare: { done, gap_reason } }
 *
 * 97 of 98 pairs are currently PDF-only (parse-gap "blueprint set has no .dxf — only
 * PDF/STEP/IGES variants present. Awaits BlueprintVisionOCR for Phase-A.3 or
 * opencascade.js for STEP/IGES"). 1 has DXF + full wizard parse. This bridge surfaces
 * BOTH (parse-gap vs full-parse) — the operator decides whether the reference is
 * useful for the current job.
 *
 * Lookup keys:
 *   - by part stem (exact or prefix match)
 *   - by customer (extracted from blueprint_paths or reference_program_path —
 *     `JM DIE\_PART LIBRARY\<CUSTOMER>\...` or `JM DIE\WIRE EDM\<CUSTOMER>\...`)
 *   - by tier ("substring" | "exact" | other)
 *
 * Read-only. Lazy-loaded index (first call walks the dir; subsequent calls reuse).
 *
 * @module engines/WedmTrainingPairBridgeEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-13
 * @author oscar (slot:oscar, 2026-05-26)
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

function defaultCorpusDir(): string {
  const root = process.env["PRISM_WORKSPACE_ROOT"] ?? "H:/prism";
  return join(root, "state", "shared", "wedm-training-corpus");
}

/** Regex extracting customer name from a JM-Die-rooted path. Matches both `_PART LIBRARY\<CUST>\` and `WIRE EDM\<CUST>\` segments. */
const CUSTOMER_FROM_PATH_RE = /(?:_PART LIBRARY|WIRE EDM)[\\/]+([^\\/]+)/i;

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const WedmTrainingLookupInputSchema = z.object({
  /** Override the corpus dir (tests + alt installs). */
  corpus_dir: z.string().optional(),
  /** Part-stem match — exact when `stem_match_mode === "exact"`, otherwise prefix. */
  stem: z.string().optional(),
  stem_match_mode: z.enum(["exact", "prefix"]).default("prefix"),
  /** Customer-name match (case-insensitive substring). */
  customer: z.string().optional(),
  /** Filter to pairs with full parse (parse.ok && wizard.ok) vs all. */
  parse_ok_only: z.boolean().default(false),
  /** Cap on returned pairs (default 25). */
  top_k: z.number().int().positive().max(200).default(25),
});

export type WedmTrainingLookupInput = z.infer<typeof WedmTrainingLookupInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface WedmPair {
  pair_stem: string;
  pair_tier: string;
  pair_confidence: string;
  blueprint_paths: string[];
  reference_program_path: string;
  reference_format: string | undefined;
  reference_bytes_total: number | undefined;
  magic_verified: boolean | undefined;
  parse_ok: boolean;
  parse_gap_reason: string | undefined;
  wizard_ok: boolean;
  wizard_skip_reason: string | undefined;
  compare_done: boolean;
  /** Customer extracted from program/blueprint paths (best-effort). */
  customer: string | undefined;
  /** Pointer back to the source `<stem>-phase-a1.json` file. */
  source_file: string;
}

export interface WedmTrainingLookupSummary {
  corpus_total: number;
  filtered: number;
  returned: number;
  parse_ok_count: number;
  parse_gap_count: number;
}

export interface WedmTrainingLookupResult {
  pairs: WedmPair[];
  summary: WedmTrainingLookupSummary;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class WedmTrainingPairBridgeEngine {
  private _cache: { dir: string; mtime: number; pairs: WedmPair[] } | null = null;

  /**
   * Look up WEDM training pairs by stem / customer / parse-status.
   *
   * @param raw WedmTrainingLookupInput
   * @returns WedmTrainingLookupResult — filtered + capped pairs + summary + warnings
   */
  run(raw: unknown): WedmTrainingLookupResult {
    const input = WedmTrainingLookupInputSchema.parse(raw);
    const dir = input.corpus_dir ?? defaultCorpusDir();
    const warnings: string[] = [];

    // 1. Load (or reuse) the index.
    const allPairs = this.loadIndex(dir, warnings);
    if (allPairs.length === 0) {
      return {
        pairs: [],
        summary: {
          corpus_total: 0,
          filtered: 0,
          returned: 0,
          parse_ok_count: 0,
          parse_gap_count: 0,
        },
        warnings,
      };
    }

    // 2. Filter.
    let filtered = allPairs;

    if (input.stem) {
      const wanted = input.stem.toLowerCase();
      filtered = filtered.filter((p) =>
        input.stem_match_mode === "exact"
          ? p.pair_stem.toLowerCase() === wanted
          : p.pair_stem.toLowerCase().startsWith(wanted),
      );
    }

    if (input.customer) {
      const wanted = input.customer.toLowerCase();
      filtered = filtered.filter((p) => p.customer !== undefined && p.customer.toLowerCase().includes(wanted));
    }

    if (input.parse_ok_only) {
      filtered = filtered.filter((p) => p.parse_ok && p.wizard_ok);
    }

    // 3. Sort: parse_ok first, then pair_confidence (high > medium > low), then stem ASC.
    filtered = filtered.slice().sort((a, b) => {
      const okA = a.parse_ok ? 1 : 0;
      const okB = b.parse_ok ? 1 : 0;
      if (okA !== okB) return okB - okA;
      const confRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const ca = confRank[a.pair_confidence] ?? 0;
      const cb = confRank[b.pair_confidence] ?? 0;
      if (ca !== cb) return cb - ca;
      return a.pair_stem.localeCompare(b.pair_stem);
    });

    const returned = filtered.slice(0, input.top_k);

    // 4. Summary.
    const parseOkCount = allPairs.filter((p) => p.parse_ok && p.wizard_ok).length;
    return {
      pairs: returned,
      summary: {
        corpus_total: allPairs.length,
        filtered: filtered.length,
        returned: returned.length,
        parse_ok_count: parseOkCount,
        parse_gap_count: allPairs.length - parseOkCount,
      },
      warnings,
    };
  }

  /**
   * Walk the corpus dir, parse every `*-phase-a1.json`, build the cached index.
   * Cache invalidates when the dir's mtime changes (file added/removed).
   */
  private loadIndex(dir: string, warnings: string[]): WedmPair[] {
    if (!existsSync(dir)) {
      warnings.push(`WEDM training-corpus dir not found at ${dir}`);
      return [];
    }
    let dirMtime: number;
    try {
      dirMtime = statSync(dir).mtimeMs;
    } catch (err) {
      warnings.push(`failed to stat WEDM corpus dir: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
    if (this._cache && this._cache.dir === dir && this._cache.mtime === dirMtime) {
      return this._cache.pairs;
    }

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (err) {
      warnings.push(`failed to list WEDM corpus dir: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
    const pairFiles = entries.filter((f) => f.endsWith("-phase-a1.json"));
    const pairs: WedmPair[] = [];
    for (const f of pairFiles) {
      const full = join(dir, f);
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(full, "utf8"));
      } catch (err) {
        warnings.push(`failed to parse ${f}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      const mapped = this.mapPair(raw, full);
      if (mapped) pairs.push(mapped);
    }

    this._cache = { dir, mtime: dirMtime, pairs };
    return pairs;
  }

  private mapPair(raw: unknown, sourceFile: string): WedmPair | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const pairStem = typeof r.pair_stem === "string" ? r.pair_stem : null;
    const programPath = typeof r.reference_program_path === "string" ? r.reference_program_path : null;
    if (!pairStem || !programPath) return null;

    const refMeta = (r.reference_metadata && typeof r.reference_metadata === "object" ? r.reference_metadata : {}) as Record<string, unknown>;
    const parseBlock = (r.parse && typeof r.parse === "object" ? r.parse : {}) as Record<string, unknown>;
    const wizardBlock = (r.wizard && typeof r.wizard === "object" ? r.wizard : {}) as Record<string, unknown>;
    const compareBlock = (r.compare && typeof r.compare === "object" ? r.compare : {}) as Record<string, unknown>;

    const bpPaths: string[] = Array.isArray(r.blueprint_paths)
      ? r.blueprint_paths.filter((x): x is string => typeof x === "string")
      : [];

    // Customer extraction — try program path first (most reliable), then blueprint paths.
    const customer = this.extractCustomer(programPath) ?? this.extractCustomer(bpPaths[0] ?? "");

    return {
      pair_stem: pairStem,
      pair_tier: typeof r.pair_tier === "string" ? r.pair_tier : "unknown",
      pair_confidence: typeof r.pair_confidence === "string" ? r.pair_confidence : "unknown",
      blueprint_paths: bpPaths,
      reference_program_path: programPath,
      reference_format: typeof refMeta.format === "string" ? refMeta.format : undefined,
      reference_bytes_total: typeof refMeta.bytes_total === "number" ? refMeta.bytes_total : undefined,
      magic_verified: typeof refMeta.magic_verified === "boolean" ? refMeta.magic_verified : undefined,
      parse_ok: parseBlock.ok === true,
      parse_gap_reason: typeof parseBlock.gap_reason === "string" ? parseBlock.gap_reason : undefined,
      wizard_ok: wizardBlock.ok === true,
      wizard_skip_reason: typeof wizardBlock.skip_reason === "string" ? wizardBlock.skip_reason : undefined,
      compare_done: compareBlock.done === true,
      customer,
      source_file: sourceFile,
    };
  }

  /** Extract customer name from a JM-Die path. Returns undefined when no match. */
  extractCustomer(path: string): string | undefined {
    if (!path) return undefined;
    const m = path.match(CUSTOMER_FROM_PATH_RE);
    if (!m || !m[1]) return undefined;
    return m[1].trim();
  }

  /** Drop the cache — useful for tests that swap the corpus dir mid-suite. */
  resetCache(): void {
    this._cache = null;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmTrainingPairBridgeEngine = new WedmTrainingPairBridgeEngine();
