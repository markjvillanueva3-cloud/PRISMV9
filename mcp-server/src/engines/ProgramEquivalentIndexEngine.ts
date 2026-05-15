/**
 * ProgramEquivalentIndexEngine — U-PPL-D4 (MS-PRINT-PROGRAM-LOOP Track D)
 *
 * Pure composition engine that joins the existing CAD master-index (from
 * UniversalCADIndexEngine / CADFileIndexerEngine) with the .MIN lathe-program
 * half of the archive into a single ProgramEquivalentIndex keyed by normalized
 * JM-Die part-number.
 *
 * Per the envelope brief (May overlap MS-RES-MACHINE-MODELS / RES-MS10 —
 * check cad_registry_scan first), this engine does NOT walk the filesystem or
 * implement a new scanner. It is a pure transform over already-enumerated
 * inputs:
 *
 *   1. `cadMasterIndex` — a MasterIndex from UniversalCADIndexEngine.index()
 *      or .load(). The "CAD as program" half. Each entry becomes a
 *      ProgramEquivalentEntry with `kind: "cad-as-program"`.
 *
 *   2. `latheProgramEntries` — JMDieDiskIndexEntry[] of `.MIN` files (or
 *      whatever the disk-side walker emits for the lathe half). Each entry
 *      becomes a ProgramEquivalentEntry with `kind: "lathe-gcode"`.
 *
 *   3. Optional `linkIndex` — composite link index from
 *      ProgramPrintLinkIndexEngine (U-PPL-D1). When supplied, each program's
 *      print pointer (print_id + match_confidence) is attached.
 *
 * The "for mill jobs" qualifier in the envelope refers to category 1 only —
 * for SolidWorks / Inventor / Fusion mill workflows, the CAD IS the program
 * of record (G-code is generated on-machine via post and discarded).
 * Category 2 (.MIN) is the lathe G-code program of record per
 * [[reference_jm_die_program_save_practice]].
 *
 * Output writes to `data/state/cad-file-index/program-equivalent-index.json`
 * (a SIBLING of the CAD master-index.json — never clobbers it). The CAD
 * master-index.json stays the pure CAD scanner output; this file is the
 * joined program-equivalent surface for the print-program-loop's purposes.
 *
 * @module engines/ProgramEquivalentIndexEngine
 */

import * as nodePath from "path";
import { promises as fsp } from "node:fs";
import { atomicWrite } from "../utils/atomicWrite.js";
import type { JMDieDiskIndexEntry } from "./JMDieArchiveBackAnnotationEngine.js";
import type {
  ProgramPrintLinkIndex,
  ProgramToPrintLink,
} from "./ProgramPrintLinkIndexEngine.js";
import {
  lookupPrintForProgram,
  extractJMDieCandidates,
  normalizeJMDiePN,
} from "./ProgramPrintLinkIndexEngine.js";
import type { MasterIndex, CADFileEntry } from "../schemas/cadFileIndexSchema.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Schema version — bump when ProgramEquivalentIndex shape changes. */
export const PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION = 1 as const;

/** Minimum length for an accepted normalized PN — matches D1/D3 floor. */
export const MIN_PN_REMAINDER_LENGTH = 4;

/**
 * Default output path — sibling of the CAD master-index.json so the original
 * CAD scanner output is never clobbered.
 */
export const DEFAULT_PROGRAM_EQUIVALENT_OUTPUT =
  "mcp-server/data/state/cad-file-index/program-equivalent-index.json";

/**
 * Recognized lathe-gcode extensions. .MIN per Mazak/Okuma; .MAC kept as a
 * sibling alias the archive sometimes carries.
 */
export const LATHE_GCODE_EXTENSIONS = new Set<string>([".min", ".mac"]);

// ============================================================================
// TYPES
// ============================================================================

export type ProgramEquivalentKind = "cad-as-program" | "lathe-gcode";

/**
 * One row in the unified index. Either a CAD file projected as a program
 * (mill-jobs convention) OR a lathe `.MIN` G-code program.
 */
export interface ProgramEquivalentEntry {
  kind: ProgramEquivalentKind;
  path: string;
  format: string;
  customer?: string;
  machine_category?: string;
  size_bytes?: number;
  last_modified?: string;
  part_number_normalized?: string;
  /** PN candidates we considered (sample, ≤3) — diagnostic. */
  pn_candidates?: readonly string[];
  /** Print reference, populated only when linkIndex supplied a match. */
  print_ref?: {
    print_id?: string;
    match_confidence?: string;
  };
}

/**
 * Aggregate output. Written to DEFAULT_PROGRAM_EQUIVALENT_OUTPUT when
 * `dryRun: false`.
 */
export interface ProgramEquivalentIndex {
  schemaVersion: typeof PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION;
  generatedAt: string;
  cad_source: {
    totalFiles: number;
    byFormat: Record<string, number>;
  };
  lathe_source: {
    totalEntries: number;
    recognized: number;
    skipped_not_lathe: number;
    skipped_no_pn: number;
  };
  entries: readonly ProgramEquivalentEntry[];
  byKind: Record<ProgramEquivalentKind, number>;
  byCustomer: Record<string, number>;
  byPartNumber: Record<string, number>;
  linked: number;
}

/**
 * Print-ref shape used internally by the engine. Tests can return this
 * directly via `lookupFn`; production passes a `linkIndex` and the engine
 * routes it through the real `lookupPrintForProgram`.
 */
export interface PrintRef {
  print_id?: string;
  match_confidence?: string;
}

/**
 * Lookup callable. The engine prefers an injected `lookupFn` over the
 * `linkIndex` → `lookupPrintForProgram` path so tests can exercise the
 * print-ref enrichment branch without standing up a full JoinIndex.
 */
export type PrintRefLookupFn = (programPath: string) => PrintRef | undefined;

export interface ComposeOptions {
  /** CAD scan output (from UniversalCADIndexEngine.index() or .load()). */
  cadMasterIndex: MasterIndex | null;
  /** Lathe-side disk entries; ext `.MIN` recognized as program-equivalent. */
  latheProgramEntries: readonly JMDieDiskIndexEntry[];
  /**
   * Optional U-PPL-D1 link index — enables print-ref attachment via the real
   * `lookupPrintForProgram`. Ignored when `lookupFn` is also supplied.
   */
  linkIndex?: ProgramPrintLinkIndex;
  /**
   * Optional direct lookup function — preferred over `linkIndex` when both
   * supplied. Test-friendly: stub this to return a fixed PrintRef per path.
   */
  lookupFn?: PrintRefLookupFn;
  /**
   * Safety gate — true (default) means compute + return only, never write.
   * Set false to atomically write the result to `outputPath`.
   */
  dryRun?: boolean;
  /** Override output path (defaults to DEFAULT_PROGRAM_EQUIVALENT_OUTPUT). */
  outputPath?: string;
  /** Cap on lathe entries processed in one call (0 = no cap). */
  limit?: number;
}

export interface ComposeResult {
  index: ProgramEquivalentIndex;
  wrote: boolean;
  outputPath?: string;
}

// ============================================================================
// PURE HELPERS
// ============================================================================

/** Resolve PN from a CAD basename — same strategy as D3's resolvePN. */
function resolvePNFromBasename(stem: string): {
  normalized: string;
  candidates: readonly string[];
} {
  if (!stem || stem.length === 0) return { normalized: "", candidates: [] };
  const candidates = extractJMDieCandidates(stem);
  for (const c of candidates) {
    const n = normalizeJMDiePN(c);
    if (n.length >= MIN_PN_REMAINDER_LENGTH) {
      return { normalized: n, candidates };
    }
  }
  return { normalized: "", candidates };
}

/** Project one CAD file entry into a ProgramEquivalentEntry. */
function cadEntryToProgramEquivalent(
  cad: CADFileEntry,
  lookup: PrintRefLookupFn | undefined,
): ProgramEquivalentEntry {
  const basename = nodePath.basename(cad.absolutePath);
  const stem = basename.replace(/\.[^.]+$/, "");
  const pn = resolvePNFromBasename(stem);
  const sample = pn.candidates.slice(0, 3);

  const entry: ProgramEquivalentEntry = {
    kind: "cad-as-program",
    path: cad.absolutePath,
    format: cad.format,
    customer: cad.customer,
    machine_category: cad.machineCategory,
    size_bytes: cad.sizeBytes,
    last_modified: cad.lastModified,
    part_number_normalized: pn.normalized || undefined,
    pn_candidates: sample.length > 0 ? sample : undefined,
  };

  if (lookup && cad.absolutePath.length > 0) {
    const printRef = lookup(cad.absolutePath);
    if (printRef && (printRef.print_id || printRef.match_confidence)) {
      entry.print_ref = printRef;
    }
  }

  return entry;
}

/**
 * Build a default PrintRef lookup from a ProgramPrintLinkIndex. Returns
 * `undefined` when the link index is undefined (caller branch never fires).
 */
function buildLookupFromIndex(
  linkIndex: ProgramPrintLinkIndex,
): PrintRefLookupFn {
  return (programPath: string): PrintRef | undefined => {
    const result = lookupPrintForProgram(programPath, linkIndex);
    if (!result.found) return undefined;
    // Prefer the v6 link surface (typed v6 confidence). Fall back to
    // seed_links (program-side seed augmentation from D1). Both surfaces
    // carry a `print_id`-equivalent reference: v6 links have an array of
    // `prints[]` (parent's join shape) or `print_doc_ids` depending on
    // source; seed_links carry one `print_doc_id`.
    const v6Links: readonly ProgramToPrintLink[] = (result.links ??
      []) as unknown as readonly ProgramToPrintLink[];
    for (const lk of v6Links) {
      const rec = lk as unknown as Record<string, unknown>;
      const directId = typeof rec.print_id === "string" ? rec.print_id : "";
      const docIds = Array.isArray(rec.print_doc_ids)
        ? (rec.print_doc_ids as unknown[])
        : [];
      const firstDocId = docIds.find(
        (d): d is string => typeof d === "string" && d.length > 0,
      );
      const id = directId || firstDocId || "";
      const conf =
        typeof rec.match_confidence === "string"
          ? rec.match_confidence
          : typeof rec.match_kind === "string"
            ? rec.match_kind
            : result.match_confidence ?? "";
      if (id || conf) {
        return {
          print_id: id || undefined,
          match_confidence: conf || undefined,
        };
      }
    }
    // Seed-link fallback — D1's enhanced normalizer rescues programs the
    // v6 join missed. ProgramSeedLink carries `print_doc_id` + a string
    // match_kind.
    const seedLinks = result.seed_links ?? [];
    if (seedLinks.length > 0) {
      const top = seedLinks[0] as unknown as Record<string, unknown>;
      const id =
        typeof top.print_doc_id === "string"
          ? top.print_doc_id
          : typeof top.print_id === "string"
            ? top.print_id
            : "";
      const conf =
        typeof top.match_kind === "string"
          ? top.match_kind
          : typeof top.match_confidence === "string"
            ? top.match_confidence
            : "";
      if (id || conf) {
        return {
          print_id: id || undefined,
          match_confidence: conf || undefined,
        };
      }
    }
    return undefined;
  };
}

/** Normalize a JMDieDiskIndexEntry extension to `.ext` lowercase. */
function normalizeExt(entry: JMDieDiskIndexEntry): string {
  const raw = (entry.ext ?? "").toLowerCase().trim();
  if (raw.length === 0) return "";
  return raw.startsWith(".") ? raw : `.${raw}`;
}

/** Is the lathe entry a recognized `.MIN`-class program? */
function isLatheProgram(entry: JMDieDiskIndexEntry): boolean {
  return LATHE_GCODE_EXTENSIONS.has(normalizeExt(entry));
}

/** Project one lathe disk entry into a ProgramEquivalentEntry. */
function latheEntryToProgramEquivalent(
  entry: JMDieDiskIndexEntry,
  lookup: PrintRefLookupFn | undefined,
): {
  entry?: ProgramEquivalentEntry;
  outcome: "recognized" | "skipped_not_lathe" | "skipped_no_pn";
} {
  if (!isLatheProgram(entry)) {
    return { outcome: "skipped_not_lathe" };
  }

  const stem =
    typeof entry.stem === "string" && entry.stem.trim().length > 0
      ? entry.stem.trim()
      : typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim().replace(/\.[^.]+$/, "")
        : nodePath.basename(entry.path).replace(/\.[^.]+$/, "");

  const pn = resolvePNFromBasename(stem);
  if (!pn.normalized) {
    return { outcome: "skipped_no_pn" };
  }

  const sample = pn.candidates.slice(0, 3);
  const programEntry: ProgramEquivalentEntry = {
    kind: "lathe-gcode",
    path: entry.path,
    format: normalizeExt(entry),
    customer:
      typeof entry.customer === "string" && entry.customer.length > 0
        ? entry.customer
        : undefined,
    machine_category:
      typeof entry.machine === "string" && entry.machine.length > 0
        ? entry.machine
        : "lathe",
    size_bytes: typeof entry.size === "number" ? entry.size : undefined,
    last_modified: typeof entry.mtime === "string" ? entry.mtime : undefined,
    part_number_normalized: pn.normalized,
    pn_candidates: sample.length > 0 ? sample : undefined,
  };

  if (lookup && entry.path.length > 0) {
    const printRef = lookup(entry.path);
    if (printRef && (printRef.print_id || printRef.match_confidence)) {
      programEntry.print_ref = printRef;
    }
  }

  return { entry: programEntry, outcome: "recognized" };
}

// ============================================================================
// CORE TRANSFORM
// ============================================================================

/**
 * Build a ProgramEquivalentIndex from a CAD master-index + lathe entries.
 * Pure — no fs writes regardless of `dryRun` (writing is `compose`'s job).
 *
 * Throws on non-array `latheProgramEntries` (runtime type-fuzz guard, matches
 * D3's FAIL-LOUD convention).
 */
export function buildProgramEquivalentIndex(
  opts: ComposeOptions,
): ProgramEquivalentIndex {
  if (!Array.isArray(opts.latheProgramEntries)) {
    throw new Error(
      "ProgramEquivalentIndexEngine: latheProgramEntries must be an array",
    );
  }

  const entries: ProgramEquivalentEntry[] = [];
  const byCustomer: Record<string, number> = {};
  const byPartNumber: Record<string, number> = {};

  // Resolve the print-ref lookup. Prefer the injected `lookupFn` (test-friendly,
  // also lets callers bring their own resolver), fall back to wrapping a
  // ProgramPrintLinkIndex via the real `lookupPrintForProgram`.
  const lookup: PrintRefLookupFn | undefined =
    opts.lookupFn ??
    (opts.linkIndex ? buildLookupFromIndex(opts.linkIndex) : undefined);

  // CAD half
  const cad = opts.cadMasterIndex;
  const cadByFormat: Record<string, number> = {};
  let cadTotalFiles = 0;
  if (cad && Array.isArray(cad.files)) {
    cadTotalFiles = cad.files.length;
    for (const f of cad.files) {
      cadByFormat[f.format] = (cadByFormat[f.format] ?? 0) + 1;
      const pe = cadEntryToProgramEquivalent(f, lookup);
      entries.push(pe);
      if (pe.customer) {
        byCustomer[pe.customer] = (byCustomer[pe.customer] ?? 0) + 1;
      }
      if (pe.part_number_normalized) {
        byPartNumber[pe.part_number_normalized] =
          (byPartNumber[pe.part_number_normalized] ?? 0) + 1;
      }
    }
  }

  // Lathe half (with limit cap)
  let recognized = 0;
  let skippedNotLathe = 0;
  let skippedNoPn = 0;
  const cap =
    typeof opts.limit === "number" && opts.limit > 0
      ? opts.limit
      : opts.latheProgramEntries.length;
  let processed = 0;
  for (const e of opts.latheProgramEntries) {
    if (processed >= cap) break;
    processed++;
    const projection = latheEntryToProgramEquivalent(e, lookup);
    if (projection.outcome === "skipped_not_lathe") {
      skippedNotLathe++;
      continue;
    }
    if (projection.outcome === "skipped_no_pn") {
      skippedNoPn++;
      continue;
    }
    if (projection.entry) {
      recognized++;
      entries.push(projection.entry);
      if (projection.entry.customer) {
        byCustomer[projection.entry.customer] =
          (byCustomer[projection.entry.customer] ?? 0) + 1;
      }
      if (projection.entry.part_number_normalized) {
        byPartNumber[projection.entry.part_number_normalized] =
          (byPartNumber[projection.entry.part_number_normalized] ?? 0) + 1;
      }
    }
  }

  let linked = 0;
  for (const e of entries) {
    if (e.print_ref && (e.print_ref.print_id || e.print_ref.match_confidence)) {
      linked++;
    }
  }

  const byKind: Record<ProgramEquivalentKind, number> = {
    "cad-as-program": 0,
    "lathe-gcode": 0,
  };
  for (const e of entries) byKind[e.kind]++;

  return {
    schemaVersion: PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    cad_source: {
      totalFiles: cadTotalFiles,
      byFormat: cadByFormat,
    },
    lathe_source: {
      totalEntries: opts.latheProgramEntries.length,
      recognized,
      skipped_not_lathe: skippedNotLathe,
      skipped_no_pn: skippedNoPn,
    },
    entries,
    byKind,
    byCustomer,
    byPartNumber,
    linked,
  };
}

/**
 * Top-level compose. Builds the index and (when `dryRun: false`) atomically
 * writes it to `outputPath`.
 */
export async function compose(opts: ComposeOptions): Promise<ComposeResult> {
  const index = buildProgramEquivalentIndex(opts);
  const dryRun = opts.dryRun ?? true;
  if (dryRun) return { index, wrote: false };

  const outputPath = opts.outputPath ?? DEFAULT_PROGRAM_EQUIVALENT_OUTPUT;
  const outDir = nodePath.dirname(outputPath);
  await fsp.mkdir(outDir, { recursive: true });
  await atomicWrite(outputPath, JSON.stringify(index, null, 2));
  return { index, wrote: true, outputPath };
}

// ============================================================================
// CLASS + SINGLETON (matches PRISM engine convention)
// ============================================================================

export class ProgramEquivalentIndexEngine {
  buildProgramEquivalentIndex(opts: ComposeOptions): ProgramEquivalentIndex {
    return buildProgramEquivalentIndex(opts);
  }

  async compose(opts: ComposeOptions): Promise<ComposeResult> {
    return compose(opts);
  }
}

export const programEquivalentIndexEngine = new ProgramEquivalentIndexEngine();
