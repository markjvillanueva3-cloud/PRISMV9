/**
 * JMDieArchiveBackAnnotationEngine — U-DOCU-05 / MS-DOCU-INGEST
 *
 * Back-annotates the JM-Die program archive with print-pointer sidecars and a
 * `prism_parts/` index keyed by part-number, using the v6 blueprint↔program
 * join (`Docustrata/.index/blueprint-program-join-full-v6.jsonl`) + the
 * title-block-verified training triples (`training-triples-v4.jsonl`) that
 * BlueprintProgramJoinEngine (U-DOCU-04) already loads into a singleton cache.
 *
 * Two artifact families:
 *
 *   1.  Per-program sidecar — `<program_path>.print-pointer.json`
 *       lives ALONGSIDE the program file. Lets shop-floor tools resolve
 *       "what print does this NC file come from?" without loading the 60MB
 *       v6 join JSONL. One sidecar per program.
 *
 *   2.  Per-part index entry — `<archiveRoot>/Docustrata/.index/prism_parts/<pn-norm>.json`
 *       keyed by normalized part-number. Lets quoting / part-history tools
 *       resolve "what programs and prints exist for this PN?" without
 *       scanning the archive. One entry per part-number with ≥1 program.
 *
 * Gap report (FAIL-LOUD per CLAUDE.md R12): two surfaces.
 *
 *   (a) join-side gap — rows in the v6 join with ambiguous/garbage/miss
 *       confidence (we have a row, but no usable program match).
 *
 *   (b) DISK-side gap — programs that exist on disk in the JM-Die archive
 *       (per `jm-die-index-v2.json`) but appear in NO v6 join row. These
 *       are the ~16K g-code + ~15K CAM-project programs the envelope brief
 *       explicitly demands FAIL-LOUD on. This is the canonical reading of
 *       "full coverage isn't reachable from Docustrata alone" — and the
 *       gap report MUST surface (a) and (b), not just (a).
 *
 * Confidence policy:
 *   - "exact" matches → annotate without operator approval (high precision)
 *   - "loose" matches → annotate by default, but caller can opt-out via
 *     `confidenceFilter: ["exact"]`. Loose carries higher false-positive
 *     risk per the v5→v6 confidence-calibration analysis in
 *     phase16-v6-summary.md.
 *   - "ambiguous" / "garbage" / "miss" → NEVER annotated. Counted in the
 *     gap report.
 *
 * I/O policy:
 *   - All writes use `safeWriteSync` from utils/atomicWrite for
 *     crash-safe replace (write to .tmp, fsync, rename).
 *   - `dryRun: true` (the default) plans the work and returns counts
 *     without touching disk — required for the dispatcher's first call
 *     so operators can preview blast radius before opting into mutation.
 *   - Programs whose `source_path` does not currently exist on disk are
 *     skipped (counted as `missing_program_file`), not failed.
 *   - The engine NEVER overwrites a sidecar that was last modified by
 *     anything other than itself (we tag every sidecar with `annotator`
 *     == this engine's CANONICAL_ANNOTATOR id; foreign sidecars are
 *     preserved and counted as `skipped_foreign`).
 *   - Trust boundary: every program path is validated to resolve under
 *     an allow-listed root (the archiveRoot, e.g. `H:/PRISM`). Paths that
 *     escape — `..` traversal, drive switches, UNC paths — are rejected
 *     and counted as `skipped_path_unsafe`. The v6 join's `source_path`
 *     field is Python-emitted and not signed; we treat it as untrusted.
 *
 * Concurrency: parts-index entries are FULLY derivable from
 * (row, triple) — two writers compute the SAME content, so the
 * atomic-write last-writer-wins is data-safe. Sidecars are likewise
 * idempotent per (program, row). No file-lock is required.
 *
 * Wiring:
 *   - prism_dev:back_annotate_archive       — execute (with dryRun gate)
 *   - prism_dev:back_annotate_gap_report    — just the gap report
 *   - prism_dev:read_print_pointer          — fast sidecar lookup
 *   - prism_cam:cam_read_print_pointer      — same lookup, mirrored
 *     for CAM-side consumers (matches U-DOCU-04's prism_cam mirror
 *     pattern for cam_program_for_print / cam_print_for_program).
 */

import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import {
  blueprintProgramJoinEngine,
  type JoinIndex,
  type JoinIndexRow,
  type JoinIndexProgramRef,
  type V6MatchConfidence,
  type TrainingTripleRow,
} from "./BlueprintProgramJoinEngine.js";
import { PATHS } from "../constants.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const CANONICAL_ANNOTATOR = "JMDieArchiveBackAnnotationEngine";
export const SIDECAR_SCHEMA_VERSION = "1.0.0";
export const ANNOTATABLE_CONFIDENCE: readonly V6MatchConfidence[] = ["exact", "loose"] as const;
export const GAP_CONFIDENCE: readonly V6MatchConfidence[] = ["ambiguous", "garbage", "miss"] as const;
export const SIDECAR_SUFFIX = ".print-pointer.json";
export const PARTS_INDEX_SUBDIR = "prism_parts";
export const GAP_REPORT_REL_PATH = "jm-die-back-annotation-gap-report.json";

/** Cap on per-outcome sample arrays in the result diagnostic. */
export const PER_OUTCOME_SAMPLE_CAP = 50;

/** JM-Die disk index — the enumeration of programs on disk under JM DIE/. */
export const JM_DIE_INDEX_REL = "Docustrata/.index/jm-die-index-v2.json";

// ============================================================================
// TYPES
// ============================================================================

export interface SidecarPrintRef {
  source: "join_v6" | "training_triple";
  doc_id?: string;
  filename?: string;
  page_index?: number;
  drawing_score?: number;
  print_id?: string;
  print_disk_path?: string;
}

export interface PrintPointerSidecar {
  schemaVersion: string;
  annotated_at: string;
  annotator: string;
  annotation_source: string;
  program_path: string;
  part_number: string;
  part_number_normalized: string;
  match_confidence: V6MatchConfidence;
  via?: string;
  customer?: string;
  machine_category?: string;
  kind?: string;
  kind3?: string;
  prints: SidecarPrintRef[];
}

export interface PartsIndexEntry {
  schemaVersion: string;
  annotated_at: string;
  annotator: string;
  part_number: string;
  part_number_normalized: string;
  match_confidence: V6MatchConfidence;
  prints: SidecarPrintRef[];
  programs: Array<{
    source_path: string;
    customer?: string;
    machine_category?: string;
    kind?: string;
    kind3?: string;
    relation?: string;
    via?: string;
  }>;
}

/** One JM-Die archive disk-index entry — shape of `jm-die-index-v2.json` rows. */
export interface JMDieDiskIndexEntry {
  path: string;
  name?: string;
  stem?: string;
  ext?: string;
  customer?: string;
  machine?: string;
  kind?: string;
  size?: number;
  mtime?: string;
}

/**
 * Options for {@link backAnnotateArchive}.
 * @param dryRun - default true (safety gate). Set false to actually write.
 * @param confidenceFilter - which v6 match_confidence values to annotate.
 *   Default ["exact","loose"]. "ambiguous"/"garbage"/"miss" go to gap report.
 * @param archiveRoot - explicit override for the archive root (the directory
 *   containing `Docustrata/.index/` AND `JM DIE/`). Default is auto-resolved
 *   from PATHS.PRISM_ROOT's sibling `PRISM/`.
 * @param writePartsIndex - default true. Writes per-PN entries under
 *   `<archiveRoot>/Docustrata/.index/prism_parts/<pn-norm>.json`.
 * @param limit - cap on programs processed in one call (operator-incremental
 *   back-annotation). 0/undefined = no cap.
 * @param joinIndex - test-injection point. If supplied, the engine skips the
 *   blueprintProgramJoinEngine singleton and uses this index directly.
 * @param allowRoots - explicit allow-list of archive-root prefixes for the
 *   trust-boundary check. Default: [archiveRoot]. Paths that don't resolve
 *   under one of these are rejected (counted as skipped_path_unsafe).
 */
export interface BackAnnotateOptions {
  dryRun?: boolean;
  confidenceFilter?: V6MatchConfidence[];
  archiveRoot?: string;
  writePartsIndex?: boolean;
  limit?: number;
  joinIndex?: JoinIndex;
  allowRoots?: string[];
}

export type BackAnnotateOutcome =
  | "annotated"
  | "would_annotate"
  | "skipped_existing_self"
  | "skipped_foreign"
  | "skipped_confidence_excluded"
  | "skipped_no_part_number"
  | "skipped_no_source_path"
  | "skipped_path_unsafe"
  | "missing_program_file";

export interface BackAnnotateResult {
  schemaVersion: string;
  ranAt: string;
  dryRun: boolean;
  archiveRoot: string;
  confidenceFilter: V6MatchConfidence[];
  totals: {
    rows_seen: number;
    programs_seen: number;
    annotated: number;
    would_annotate: number;
    skipped_existing_self: number;
    skipped_foreign: number;
    skipped_confidence_excluded: number;
    skipped_no_part_number: number;
    skipped_no_source_path: number;
    skipped_path_unsafe: number;
    missing_program_file: number;
    parts_index_planned_or_written: number;
    errors: number;
  };
  /** Up to PER_OUTCOME_SAMPLE_CAP outcomes per non-zero category. */
  samples: Partial<Record<BackAnnotateOutcome, Array<{ programPath: string; partNumber: string }>>>;
  errors: Array<{ programPath?: string; partNumber?: string; message: string }>;
  partsIndexDir: string;
  gapReportPath: string;
}

export interface GapReportOptions {
  archiveRoot?: string;
  /** If true (default false), don't persist; just return the report. */
  dryRun?: boolean;
  joinIndex?: JoinIndex;
  /** Path to jm-die-index-v2.json. Default: archiveRoot+JM_DIE_INDEX_REL. */
  diskIndexPath?: string;
  /** Direct test-injection of the disk index (skips read). */
  diskIndex?: JMDieDiskIndexEntry[];
}

export interface GapReport {
  schemaVersion: string;
  generatedAt: string;
  archiveRoot: string;
  /** Join-side: per-confidence row counts. */
  confidenceBreakdown: Record<string, number>;
  /** Join-side: program counts inside the v6 join, by confidence. */
  programs: {
    total_in_v6_join: number;
    covered_exact: number;
    covered_loose: number;
    covered_ambiguous: number;
    covered_garbage: number;
  };
  /** Disk-side: full archive enumeration vs join coverage. */
  disk: {
    /** Whether the disk-index was loaded; if false, disk-gap is "unknown". */
    indexLoaded: boolean;
    diskIndexPath: string | null;
    total_programs_on_disk: number;
    /** Programs on disk that ALSO appear in the v6 join (by normalized path). */
    covered_by_join: number;
    /** Programs on disk with NO row in the v6 join (the canonical gap). */
    orphan_count: number;
    orphan_by_kind: Record<string, number>;
    orphan_by_customer: Record<string, number>;
    /** Up to PER_OUTCOME_SAMPLE_CAP orphan-path samples for diagnostic. */
    orphan_samples: string[];
  };
  gap: {
    summary: string;
    rows_without_programs: number;
    rows_in_gap_confidence: number;
    by_confidence: Record<string, number>;
    by_program_kind3: Record<string, number>;
    sample_part_numbers: string[];
  };
}

// ============================================================================
// PURE TRANSFORMS — testable in isolation, no I/O
// ============================================================================

/** Build a sidecar object from a v6 join row + one program ref + optional triple. Pure. */
export function buildSidecarFromJoinRow(
  row: JoinIndexRow,
  program: JoinIndexProgramRef,
  opts: { triple?: TrainingTripleRow | undefined; annotatedAt?: string | undefined } = {},
): PrintPointerSidecar {
  const prints: SidecarPrintRef[] = [];
  for (const bp of row.blueprints || []) {
    prints.push({
      source: "join_v6",
      doc_id: bp.doc_id,
      filename: bp.filename,
      page_index: bp.page_index,
      drawing_score: bp.drawing_score,
    });
  }
  if (opts.triple) {
    prints.push({
      source: "training_triple",
      print_id: opts.triple.print_id,
      filename: opts.triple.print_filename,
      print_disk_path: opts.triple.print_disk_path,
    });
  }
  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    annotated_at: opts.annotatedAt ?? new Date().toISOString(),
    annotator: CANONICAL_ANNOTATOR,
    annotation_source: "blueprint-program-join-v6+training-triples-v4",
    program_path: program.source_path,
    part_number: row.part_number,
    part_number_normalized: row.part_number_normalized,
    match_confidence: row.match_confidence,
    via: program.via,
    customer: program.customer,
    machine_category: program.machineCategory,
    kind: program.kind,
    kind3: program.kind3,
    prints,
  };
}

/** Build a per-PN parts-index entry from a v6 join row + optional triple. Pure. */
export function buildPartsIndexEntry(
  row: JoinIndexRow,
  opts: { triple?: TrainingTripleRow | undefined; annotatedAt?: string | undefined } = {},
): PartsIndexEntry {
  const prints: SidecarPrintRef[] = [];
  for (const bp of row.blueprints || []) {
    prints.push({
      source: "join_v6",
      doc_id: bp.doc_id,
      filename: bp.filename,
      page_index: bp.page_index,
      drawing_score: bp.drawing_score,
    });
  }
  if (opts.triple) {
    prints.push({
      source: "training_triple",
      print_id: opts.triple.print_id,
      filename: opts.triple.print_filename,
      print_disk_path: opts.triple.print_disk_path,
    });
  }
  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    annotated_at: opts.annotatedAt ?? new Date().toISOString(),
    annotator: CANONICAL_ANNOTATOR,
    part_number: row.part_number,
    part_number_normalized: row.part_number_normalized,
    match_confidence: row.match_confidence,
    prints,
    programs: (row.programs || []).map((p) => ({
      source_path: p.source_path,
      customer: p.customer,
      machine_category: p.machineCategory,
      kind: p.kind,
      kind3: p.kind3,
      relation: p.relation,
      via: p.via,
    })),
  };
}

/** Sidecar path for a program path. Pure (no fs check). */
export function sidecarPathFor(programPath: string): string {
  if (typeof programPath !== "string" || programPath.length === 0) {
    throw new Error("sidecarPathFor: programPath must be a non-empty string");
  }
  return programPath + SIDECAR_SUFFIX;
}

/** Parts-index path. Rejects path-traversal in the normalized PN. Pure. */
export function partsIndexPathFor(archiveRoot: string, partNumberNormalized: string): string {
  if (typeof partNumberNormalized !== "string" || partNumberNormalized.length === 0) {
    throw new Error("partsIndexPathFor: partNumberNormalized must be a non-empty string");
  }
  if (/[\\/\0]/.test(partNumberNormalized) || partNumberNormalized.includes("..")) {
    throw new Error(
      `partsIndexPathFor: partNumberNormalized contains illegal characters: ${JSON.stringify(partNumberNormalized)}`,
    );
  }
  return path.join(
    archiveRoot,
    "Docustrata",
    ".index",
    PARTS_INDEX_SUBDIR,
    `${partNumberNormalized}.json`,
  );
}

/**
 * Normalize a path for prefix-comparison on Windows (case-insensitive) and
 * POSIX (case-sensitive). Returns the resolved-absolute form with a trailing
 * separator (so prefix-check is unambiguous). Pure.
 */
export function normalizePathForCompare(p: string): string {
  if (typeof p !== "string" || p.length === 0) return "";
  let r = path.resolve(p);
  if (process.platform === "win32") r = r.toLowerCase();
  if (!r.endsWith(path.sep)) r = r + path.sep;
  return r;
}

/**
 * True iff `candidate` resolves under at least one of `allowRoots`.
 * On Windows the comparison is case-insensitive. Pure.
 */
export function isPathUnderAllowedRoot(candidate: string, allowRoots: string[]): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  if (!Array.isArray(allowRoots) || allowRoots.length === 0) return false;
  let resolved = path.resolve(candidate);
  if (process.platform === "win32") resolved = resolved.toLowerCase();
  const resolvedPlus = resolved + path.sep;
  for (const root of allowRoots) {
    const normRoot = normalizePathForCompare(root);
    if (resolved === normRoot.slice(0, -path.sep.length)) return true;
    if (resolvedPlus.startsWith(normRoot)) return true;
  }
  return false;
}

/**
 * Build the gap report. Pure — produces the analytical numbers without
 * touching disk. The disk-side gap requires the disk-index to be passed
 * via `opts.diskIndex`; if absent, `disk.indexLoaded === false`.
 */
export function computeGapReport(
  index: JoinIndex,
  archiveRoot: string,
  opts: { diskIndex?: JMDieDiskIndexEntry[]; diskIndexPath?: string | null } = {},
): GapReport {
  let totalPrograms = 0;
  let coveredExact = 0;
  let coveredLoose = 0;
  let coveredAmbiguous = 0;
  let coveredGarbage = 0;
  let rowsWithoutPrograms = 0;
  let rowsInGapConfidence = 0;
  const confidenceBreakdown: Record<string, number> = {};
  const byKind3: Record<string, number> = {};
  const sampleGapPartNumbers: string[] = [];

  // Build the set of program-paths the v6 join knows about (normalized form).
  // Keyed off byProgramPath whose key already comes from
  // BlueprintProgramJoinEngine.normalizeProgramPathKey — the same normalizer
  // we use here for the disk-side comparison. Same key shape on both sides.
  const joinPathSet = new Set<string>();
  for (const k of index.byProgramPath.keys()) joinPathSet.add(k);

  for (const row of index.byNormalizedPN.values()) {
    confidenceBreakdown[row.match_confidence] =
      (confidenceBreakdown[row.match_confidence] || 0) + 1;
    const np = Array.isArray(row.programs) ? row.programs.length : 0;
    if (np === 0) rowsWithoutPrograms++;
    totalPrograms += np;
    switch (row.match_confidence) {
      case "exact":
        coveredExact += np;
        break;
      case "loose":
        coveredLoose += np;
        break;
      case "ambiguous":
        coveredAmbiguous += np;
        rowsInGapConfidence++;
        break;
      case "garbage":
        coveredGarbage += np;
        rowsInGapConfidence++;
        break;
      case "miss":
        rowsInGapConfidence++;
        break;
    }
    if (GAP_CONFIDENCE.includes(row.match_confidence)) {
      if (sampleGapPartNumbers.length < PER_OUTCOME_SAMPLE_CAP && row.part_number) {
        sampleGapPartNumbers.push(row.part_number);
      }
      for (const p of row.programs || []) {
        const k3 = p.kind3 || "unknown";
        byKind3[k3] = (byKind3[k3] || 0) + 1;
      }
    }
  }

  // Disk-side: walk the JM-Die disk index and classify each entry as
  // covered (in join) or orphan (not in join).
  const diskEntries = opts.diskIndex;
  const diskIndexPath = opts.diskIndexPath ?? null;
  const orphanByKind: Record<string, number> = {};
  const orphanByCustomer: Record<string, number> = {};
  const orphanSamples: string[] = [];
  let totalOnDisk = 0;
  let coveredByJoin = 0;
  let orphanCount = 0;

  if (Array.isArray(diskEntries)) {
    for (const entry of diskEntries) {
      if (!entry || typeof entry.path !== "string" || entry.path.length === 0) continue;
      // Only count actual program files (kind == "g_code" or "cam_project").
      // The disk-index also has un-classified rows we shouldn't blame.
      const kind = typeof entry.kind === "string" ? entry.kind : "";
      if (kind !== "g_code" && kind !== "cam_project") continue;
      totalOnDisk++;
      const normKey = (entry.path || "").toLowerCase().replace(/\\/g, "/");
      if (joinPathSet.has(normKey)) {
        coveredByJoin++;
      } else {
        orphanCount++;
        orphanByKind[kind] = (orphanByKind[kind] || 0) + 1;
        const cust = entry.customer || "(none)";
        orphanByCustomer[cust] = (orphanByCustomer[cust] || 0) + 1;
        if (orphanSamples.length < PER_OUTCOME_SAMPLE_CAP) orphanSamples.push(entry.path);
      }
    }
  }

  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    archiveRoot,
    confidenceBreakdown,
    programs: {
      total_in_v6_join: totalPrograms,
      covered_exact: coveredExact,
      covered_loose: coveredLoose,
      covered_ambiguous: coveredAmbiguous,
      covered_garbage: coveredGarbage,
    },
    disk: {
      indexLoaded: Array.isArray(diskEntries),
      diskIndexPath,
      total_programs_on_disk: totalOnDisk,
      covered_by_join: coveredByJoin,
      orphan_count: orphanCount,
      orphan_by_kind: orphanByKind,
      orphan_by_customer: orphanByCustomer,
      orphan_samples: orphanSamples,
    },
    gap: {
      summary:
        Array.isArray(diskEntries)
          ? `Disk-side: ${orphanCount} programs on disk (of ${totalOnDisk} g-code+cam_project) have NO row in the v6 join. These cannot be back-annotated from Docustrata alone — full coverage needs other join sources (CAD link, programmer notes, ERP tie-in).`
          : `Disk-index NOT loaded — disk-side gap is UNKNOWN. Pass diskIndexPath or call generateGapReport() with a default-resolved diskIndex to compute the canonical gap. Join-side: ${rowsInGapConfidence} v6 rows have ambiguous/garbage/miss confidence (cannot back-annotate without operator review).`,
      rows_without_programs: rowsWithoutPrograms,
      rows_in_gap_confidence: rowsInGapConfidence,
      by_confidence: confidenceBreakdown,
      by_program_kind3: byKind3,
      sample_part_numbers: sampleGapPartNumbers,
    },
  };
}

// ============================================================================
// I/O HELPERS
// ============================================================================

/**
 * Resolve the archive root. Default heuristic: PRISM lives at H:/prism;
 * Docustrata + JM DIE live at H:/PRISM/. So the parent of PRISM_ROOT
 * joined with the canonical PRISM dir name. Caller-supplied opt always wins.
 */
function resolveArchiveRoot(opt?: string): string {
  if (typeof opt === "string" && opt.length > 0) return opt;
  const prismRoot = PATHS.PRISM_ROOT;
  // path.join normalizes any double-separator artifacts from path.dirname.
  return path.join(path.dirname(prismRoot), "PRISM");
}

/**
 * Read + parse a sidecar file in ONE pass, returning either the parsed
 * sidecar (and its self/foreign provenance) or null when the file is
 * missing/unreadable/unparseable. Combines what was previously two reads.
 */
function readSidecarWithProvenance(p: string): { sidecar: PrintPointerSidecar; isSelf: boolean } | null {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    // We deliberately DO NOT cast the unknown parsed value to PrintPointerSidecar
    // until we've inspected `annotator`. A foreign file that happens to JSON-parse
    // is treated as "exists but not ours" → isSelf:false → skipped, never trusted.
    const obj = parsed as Record<string, unknown>;
    const isSelf = obj.annotator === CANONICAL_ANNOTATOR;
    return { sidecar: obj as unknown as PrintPointerSidecar, isSelf };
  } catch {
    return null;
  }
}

function sidecarsEqualIgnoreTimestamp(a: PrintPointerSidecar, b: PrintPointerSidecar): boolean {
  const a2 = { ...a, annotated_at: "" };
  const b2 = { ...b, annotated_at: "" };
  return JSON.stringify(a2) === JSON.stringify(b2);
}

/** Pick the highest-confidence triple from the per-PN list. Pure. */
function pickBestTriple(triples: TrainingTripleRow[] | undefined): TrainingTripleRow | undefined {
  if (!Array.isArray(triples) || triples.length === 0) return undefined;
  // Array.prototype.sort is stable in modern Node — multiple ties resolve
  // deterministically by input order. .slice() avoids mutating the cache.
  return triples.slice().sort((a, b) => b.match_confidence - a.match_confidence)[0];
}

// ============================================================================
// I/O ORCHESTRATOR
// ============================================================================

/**
 * Back-annotate the JM-Die archive. The U-DOCU-05 entrypoint.
 *
 * @param opts See {@link BackAnnotateOptions}. The `dryRun: true` default is
 *   a safety gate — operators should preview before mutating.
 * @returns A {@link BackAnnotateResult} with per-outcome totals, error
 *   array, and a per-outcome sample (capped at PER_OUTCOME_SAMPLE_CAP).
 * @throws If the v6 join file is missing or yields zero valid rows (forwarded
 *   from blueprintProgramJoinEngine.getJoinIndex).
 */
export async function backAnnotateArchive(
  opts: BackAnnotateOptions = {},
): Promise<BackAnnotateResult> {
  const dryRun = opts.dryRun !== false;
  const filter = (opts.confidenceFilter && opts.confidenceFilter.length > 0
    ? opts.confidenceFilter
    : [...ANNOTATABLE_CONFIDENCE]) as V6MatchConfidence[];
  const archiveRoot = resolveArchiveRoot(opts.archiveRoot);
  const writePartsIndex = opts.writePartsIndex !== false;
  const limit = typeof opts.limit === "number" && opts.limit > 0 ? Math.floor(opts.limit) : 0;
  const allowRoots = Array.isArray(opts.allowRoots) && opts.allowRoots.length > 0
    ? opts.allowRoots
    : [archiveRoot];

  const index = opts.joinIndex ?? (await blueprintProgramJoinEngine.getJoinIndex());

  const partsIndexDir = path.join(archiveRoot, "Docustrata", ".index", PARTS_INDEX_SUBDIR);
  const gapReportPath = path.join(PATHS.STATE_DIR, "shared", GAP_REPORT_REL_PATH);

  const totals: BackAnnotateResult["totals"] = {
    rows_seen: 0,
    programs_seen: 0,
    annotated: 0,
    would_annotate: 0,
    skipped_existing_self: 0,
    skipped_foreign: 0,
    skipped_confidence_excluded: 0,
    skipped_no_part_number: 0,
    skipped_no_source_path: 0,
    skipped_path_unsafe: 0,
    missing_program_file: 0,
    parts_index_planned_or_written: 0,
    errors: 0,
  };
  const samples: BackAnnotateResult["samples"] = {};
  const errors: BackAnnotateResult["errors"] = [];

  function recordSample(outcome: BackAnnotateOutcome, programPath: string, partNumber: string): void {
    const bucket = samples[outcome] ?? (samples[outcome] = []);
    if (bucket.length < PER_OUTCOME_SAMPLE_CAP) bucket.push({ programPath, partNumber });
  }

  let processedPrograms = 0;
  const triplesByPN = index.triplesByPN;
  const annotatedAt = new Date().toISOString();

  rowLoop: for (const row of index.byNormalizedPN.values()) {
    totals.rows_seen++;

    if (!row.part_number || row.part_number.length === 0) {
      totals.skipped_no_part_number++;
      recordSample("skipped_no_part_number", "(no part_number)", "(empty)");
      continue;
    }

    const programs = row.programs || [];
    totals.programs_seen += programs.length;

    if (!filter.includes(row.match_confidence)) {
      for (const p of programs) {
        totals.skipped_confidence_excluded++;
        recordSample("skipped_confidence_excluded", p.source_path, row.part_number);
      }
      continue;
    }

    const triple = pickBestTriple(triplesByPN?.get?.(row.part_number_normalized));

    for (const program of programs) {
      if (limit > 0 && processedPrograms >= limit) break rowLoop;
      processedPrograms++;

      if (!program.source_path) {
        totals.skipped_no_source_path++;
        recordSample("skipped_no_source_path", "(no source_path)", row.part_number);
        continue;
      }

      // Trust-boundary check: program path MUST resolve under an allowed root.
      // The v6 join's source_path field is Python-emitted from program-labels.json;
      // we treat it as untrusted input. Without this check, a tampered/poisoned
      // join row could trick this engine into writing a .print-pointer.json
      // sidecar outside the archive (anywhere on disk).
      if (!isPathUnderAllowedRoot(program.source_path, allowRoots)) {
        totals.skipped_path_unsafe++;
        recordSample("skipped_path_unsafe", program.source_path, row.part_number);
        continue;
      }

      if (!fs.existsSync(program.source_path)) {
        totals.missing_program_file++;
        recordSample("missing_program_file", program.source_path, row.part_number);
        continue;
      }

      const sidecarPath = sidecarPathFor(program.source_path);

      try {
        const proposed = buildSidecarFromJoinRow(row, program, { triple, annotatedAt });

        const existing = readSidecarWithProvenance(sidecarPath);
        if (existing) {
          if (!existing.isSelf) {
            totals.skipped_foreign++;
            recordSample("skipped_foreign", program.source_path, row.part_number);
            continue;
          }
          if (sidecarsEqualIgnoreTimestamp(existing.sidecar, proposed)) {
            totals.skipped_existing_self++;
            recordSample("skipped_existing_self", program.source_path, row.part_number);
            continue;
          }
        }

        if (dryRun) {
          totals.would_annotate++;
          recordSample("would_annotate", program.source_path, row.part_number);
          continue;
        }

        safeWriteSync(sidecarPath, JSON.stringify(proposed, null, 2));
        totals.annotated++;
        recordSample("annotated", program.source_path, row.part_number);
      } catch (err) {
        totals.errors++;
        errors.push({
          programPath: program.source_path,
          partNumber: row.part_number,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Parts-index entry: once per row, outside the per-program loop, only
    // when ≥1 program existed AND the row passed the confidence filter
    // (we'd have `continue`'d above otherwise). The entry is FULLY
    // derivable from (row, triple) — two writers compute identical
    // content, so atomic-write is data-safe under concurrency.
    if (writePartsIndex && programs.length > 0) {
      try {
        const entry = buildPartsIndexEntry(row, { triple, annotatedAt });
        const entryPath = partsIndexPathFor(archiveRoot, row.part_number_normalized);
        if (!dryRun) {
          safeWriteSync(entryPath, JSON.stringify(entry, null, 2));
        }
        totals.parts_index_planned_or_written++;
      } catch (err) {
        totals.errors++;
        errors.push({
          partNumber: row.part_number,
          message: `parts_index_write_failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    if (limit > 0 && processedPrograms >= limit) break;
  }

  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    ranAt: annotatedAt,
    dryRun,
    archiveRoot,
    confidenceFilter: filter,
    totals,
    samples,
    errors,
    partsIndexDir,
    gapReportPath,
  };
}

/**
 * Build + (optionally) persist the gap report. Loads the JM-Die disk
 * index from `<archiveRoot>/Docustrata/.index/jm-die-index-v2.json` so
 * the disk-side gap can be computed; falls back to join-side-only when
 * the disk index is absent (and FAILS LOUD via `disk.indexLoaded:false`
 * in the report).
 */
export async function generateGapReport(opts: GapReportOptions = {}): Promise<GapReport> {
  const archiveRoot = resolveArchiveRoot(opts.archiveRoot);
  const index = opts.joinIndex ?? (await blueprintProgramJoinEngine.getJoinIndex());

  const diskIndexPath =
    typeof opts.diskIndexPath === "string" && opts.diskIndexPath.length > 0
      ? opts.diskIndexPath
      : path.join(archiveRoot, "Docustrata", ".index", "jm-die-index-v2.json");

  let diskIndex: JMDieDiskIndexEntry[] | undefined = opts.diskIndex;
  if (!diskIndex) {
    try {
      if (fs.existsSync(diskIndexPath)) {
        const raw = fs.readFileSync(diskIndexPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) diskIndex = parsed as JMDieDiskIndexEntry[];
      }
    } catch {
      // Leave diskIndex undefined; report will mark indexLoaded:false.
    }
  }

  const report = computeGapReport(index, archiveRoot, {
    diskIndex,
    diskIndexPath: diskIndex ? diskIndexPath : null,
  });

  if (opts.dryRun !== true) {
    const out = path.join(PATHS.STATE_DIR, "shared", GAP_REPORT_REL_PATH);
    safeWriteSync(out, JSON.stringify(report, null, 2));
  }
  return report;
}

/**
 * Fast sidecar lookup. Returns null when no sidecar exists OR when the
 * sidecar exists but wasn't written by us (foreign provenance).
 */
export function readPrintPointer(programPath: string): PrintPointerSidecar | null {
  if (typeof programPath !== "string" || programPath.length === 0) return null;
  const p = sidecarPathFor(programPath);
  const v = readSidecarWithProvenance(p);
  if (!v) return null;
  if (!v.isSelf) return null;
  return v.sidecar;
}

// ============================================================================
// CLASS + SINGLETON (mirrors BlueprintProgramJoinEngine's dual-export pattern
// so dispatcher lazy-imports can pick whichever form they prefer).
// ============================================================================

export class JMDieArchiveBackAnnotationEngine {
  static CANONICAL_ANNOTATOR = CANONICAL_ANNOTATOR;
  static SIDECAR_SCHEMA_VERSION = SIDECAR_SCHEMA_VERSION;
  static ANNOTATABLE_CONFIDENCE = ANNOTATABLE_CONFIDENCE;
  static GAP_CONFIDENCE = GAP_CONFIDENCE;
  static SIDECAR_SUFFIX = SIDECAR_SUFFIX;
  static PARTS_INDEX_SUBDIR = PARTS_INDEX_SUBDIR;
  static PER_OUTCOME_SAMPLE_CAP = PER_OUTCOME_SAMPLE_CAP;
  static JM_DIE_INDEX_REL = JM_DIE_INDEX_REL;

  static buildSidecarFromJoinRow = buildSidecarFromJoinRow;
  static buildPartsIndexEntry = buildPartsIndexEntry;
  static sidecarPathFor = sidecarPathFor;
  static partsIndexPathFor = partsIndexPathFor;
  static normalizePathForCompare = normalizePathForCompare;
  static isPathUnderAllowedRoot = isPathUnderAllowedRoot;
  static computeGapReport = computeGapReport;
  static backAnnotateArchive = backAnnotateArchive;
  static generateGapReport = generateGapReport;
  static readPrintPointer = readPrintPointer;
}

export const jmDieArchiveBackAnnotationEngine = {
  CANONICAL_ANNOTATOR,
  SIDECAR_SCHEMA_VERSION,
  ANNOTATABLE_CONFIDENCE,
  GAP_CONFIDENCE,
  SIDECAR_SUFFIX,
  PARTS_INDEX_SUBDIR,
  PER_OUTCOME_SAMPLE_CAP,
  JM_DIE_INDEX_REL,
  buildSidecarFromJoinRow,
  buildPartsIndexEntry,
  sidecarPathFor,
  partsIndexPathFor,
  normalizePathForCompare,
  isPathUnderAllowedRoot,
  computeGapReport,
  backAnnotateArchive,
  generateGapReport,
  readPrintPointer,
};
