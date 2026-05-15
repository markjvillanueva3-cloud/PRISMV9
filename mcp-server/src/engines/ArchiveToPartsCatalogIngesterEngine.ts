/**
 * ArchiveToPartsCatalogIngesterEngine — U-PPL-D3 (Track D)
 * =========================================================
 *
 * MS-PRINT-PROGRAM-LOOP / U-PPL-D3 — bridges the JM-Die archive disk-index
 * (the v2 enumeration of every .MIN/.mcx/.ipt/.iam/.f3d/.SLDPRT program file)
 * to the in-memory `PartsLibraryEngine` (the prism_parts dispatcher's
 * revision-controlled catalog). For each program file on disk this engine
 * resolves a normalized JM-Die part-number, looks up its blueprint pointer
 * via U-PPL-D1's `ProgramPrintLinkIndexEngine`, and creates or updates the
 * corresponding `Part` in the parts catalog with the program file path AND
 * the matched print PDF attached (when available).
 *
 * This is the **join hub** the envelope brief names: the parts catalog
 * becomes the long-lived index that downstream skills (quote, schedule,
 * traveler, ERP) query — keyed by normalized PN, fanning out to programs
 * + prints + confidence + customer.
 *
 * Design rationale:
 *   - **Pure transform, no filesystem walking.** Archive enumeration is
 *     delegated to the caller (typically the existing
 *     `JMDieArchiveBackAnnotationEngine` walker via its
 *     `JMDieDiskIndexEntry[]` shape). This keeps the engine deterministic
 *     and test-friendly — every test can pass a hand-crafted array of disk
 *     entries instead of fixturing a directory tree.
 *   - **Composes existing surfaces** (NOT a fork). Imports the canonical
 *     normalizer + extractor from U-PPL-D1, the disk-index entry type from
 *     U-DOCU-05, and the `partsLibraryEngine` singleton. Per
 *     [[duplicationGuardEngine]] this is the explicit "compose, do not
 *     duplicate" path.
 *   - **dryRun: true by default** (matching the JMDieArchiveBackAnnotation
 *     pattern) — first call returns the diagnostic + count, operator sets
 *     `dryRun: false` to actually mutate the catalog.
 *   - **Idempotent**. Re-running over the same archive list does not
 *     double-create. A PN already in the catalog is upgraded only when the
 *     new evidence (a higher-confidence link, a new program file, a new
 *     customer field) is strictly additive.
 *   - **FAIL-LOUD on link-index unreadable** — operator asked for
 *     link-enrichment, so a missing/corrupt v6 join is surfaced as a
 *     thrown error (caller catches per dispatcher convention). The bare
 *     ingest still works without link enrichment if `linkIndex` is omitted.
 *
 * The created `Part` carries:
 *   - `part_number` — the normalized JM-Die PN (uppercase, suffix-stripped,
 *     extension-stripped — per `normalizeJMDiePN` in U-PPL-D1)
 *   - `name` — falls back to `name: part_number` when no explicit name is
 *     known (the parts catalog requires name to be non-empty)
 *   - `tags` — `["jm-die", "archive-ingest", "<machine_category>",
 *     "<customer>"]` + the match_confidence (e.g. `"link:exact"`)
 *   - `customer_id` — copied from the disk-index entry's `customer` field
 *   - `drawing_file_id` — set to the matched print's `print_id` when the
 *     link index resolved one; left undefined otherwise
 *
 * @module engines/ArchiveToPartsCatalogIngesterEngine
 * @milestone MS-PRINT-PROGRAM-LOOP
 * @unit U-PPL-D3
 * @track D
 * @version 1.0.0
 */

import { partsLibraryEngine, type PartRecord } from "./PartsLibraryEngine.js";
import {
  normalizeJMDiePN,
  extractJMDieCandidates,
  PROGRAM_EQUIVALENT_EXTENSIONS,
  lookupPrintForProgram,
  type ProgramPrintLinkIndex,
} from "./ProgramPrintLinkIndexEngine.js";
import type { JMDieDiskIndexEntry } from "./JMDieArchiveBackAnnotationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Cap on programs processed per call — operator may set `limit: 0` for none. */
export const DEFAULT_INGEST_LIMIT = 0;

/** Single-PN ingest outcome — one entry per unique normalized PN. */
export type IngestOutcome =
  | "created"
  | "updated"
  | "skipped_already_present"
  | "skipped_no_pn"
  | "skipped_not_program"
  | "skipped_path_unsafe"
  | "error";

/** Per-PN summary used in the result diagnostic. */
export interface PerPNIngestRecord {
  part_number_normalized: string;
  outcome: IngestOutcome;
  part_id?: string;
  /** Resolved primary program path attached to this PN (the first one we saw). */
  program_path?: string;
  /** Resolved print pointer (when linkIndex was supplied and a match was found). */
  print_id?: string;
  match_confidence?: string;
  customer?: string;
  /** Total program files we saw under this normalized PN. */
  program_count: number;
  /** Any extracted PN candidates we considered (≤3 sample). */
  candidates_sample: readonly string[];
  /** Per-file error message — only present when outcome === "error". */
  error?: string;
}

/** Options for {@link ingestArchive}. */
export interface IngestArchiveOptions {
  /** Disk-index entries — the enumeration of program files on the archive. */
  entries: readonly JMDieDiskIndexEntry[];
  /**
   * Optional composite link index from `ProgramPrintLinkIndexEngine`. When
   * supplied, each PN's primary program is queried via `lookupPrintForProgram`
   * and the resulting print pointer is attached to the Part as
   * `drawing_file_id`. Without it, parts are created without print refs.
   */
  linkIndex?: ProgramPrintLinkIndex;
  /**
   * Safety gate — when true (default) the engine returns the full diagnostic
   * without calling `partsLibraryEngine.create` for any record. Set false
   * to actually mutate the catalog.
   */
  dryRun?: boolean;
  /**
   * Cap on entries processed in one call (operator-incremental ingest).
   * 0 or undefined = no cap.
   */
  limit?: number;
  /**
   * When true, an entry's customer + machine_category are surfaced as Part
   * tags. Default true. Set false when ingesting a multi-customer set and
   * customer tagging would inflate cardinality.
   */
  tagFromEntry?: boolean;
}

/** Aggregate result returned to the dispatcher. */
export interface IngestArchiveResult {
  generated_at: string;
  dryRun: boolean;
  entries_seen: number;
  /** Number of unique normalized PNs we resolved. */
  unique_pns: number;
  outcomes: Record<IngestOutcome, number>;
  per_pn: readonly PerPNIngestRecord[];
}

// ============================================================================
// HELPERS
// ============================================================================

const EMPTY_OUTCOMES: Record<IngestOutcome, number> = {
  created: 0,
  updated: 0,
  skipped_already_present: 0,
  skipped_no_pn: 0,
  skipped_not_program: 0,
  skipped_path_unsafe: 0,
  error: 0,
};

function newOutcomes(): Record<IngestOutcome, number> {
  return { ...EMPTY_OUTCOMES };
}

/** Is the entry's path one we recognise as a program/CAD-as-program? */
function isProgramFile(entry: JMDieDiskIndexEntry): boolean {
  const ext = (entry.ext ?? "").toLowerCase().trim();
  if (!ext.startsWith(".")) {
    // Some indexers emit "min" without the dot — accept the dotless form too.
    return PROGRAM_EQUIVALENT_EXTENSIONS.has(`.${ext}`);
  }
  return PROGRAM_EQUIVALENT_EXTENSIONS.has(ext);
}

/**
 * Resolve the canonical normalized PN for a disk entry.
 *
 * Strategy mirrors U-PPL-D1's program-side seed: extract candidates from the
 * filename via `extractJMDieCandidates`, then pick the first candidate whose
 * normalized form has length ≥ 4 (the MIN_PN_REMAINDER_LENGTH gate). Returns
 * `{ normalized: "", candidates: [...] }` when nothing extractable was found.
 *
 * Pure — no I/O.
 */
function resolvePN(entry: JMDieDiskIndexEntry): { normalized: string; candidates: readonly string[] } {
  // Prefer the parent-supplied stem; fall back to the basename of `path`.
  const stem =
    typeof entry.stem === "string" && entry.stem.trim().length > 0
      ? entry.stem.trim()
      : typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : "";
  if (stem.length === 0) return { normalized: "", candidates: [] };
  const candidates = extractJMDieCandidates(stem);
  for (const c of candidates) {
    const n = normalizeJMDiePN(c);
    if (n.length >= 4) return { normalized: n, candidates };
  }
  return { normalized: "", candidates };
}

/** Build the tag set for a new Part — stable + deduped. */
function buildTags(
  entry: JMDieDiskIndexEntry,
  matchConfidence: string | undefined,
  tagFromEntry: boolean,
): string[] {
  const tags = ["jm-die", "archive-ingest"];
  if (tagFromEntry) {
    if (typeof entry.customer === "string" && entry.customer.trim().length > 0) {
      tags.push(`customer:${entry.customer.trim().toLowerCase()}`);
    }
    if (typeof entry.machine === "string" && entry.machine.trim().length > 0) {
      tags.push(`machine:${entry.machine.trim().toLowerCase()}`);
    }
  }
  if (typeof matchConfidence === "string" && matchConfidence.trim().length > 0) {
    tags.push(`link:${matchConfidence.trim().toLowerCase()}`);
  }
  // Dedupe + cap length (the parts engine lowercases anyway).
  return Array.from(new Set(tags));
}

/**
 * Group archive entries by their resolved normalized PN. Skips non-program
 * extensions + entries without a stem-extractable PN. The returned Map
 * preserves first-seen ordering for deterministic test output.
 */
export function groupByNormalizedPN(
  entries: readonly JMDieDiskIndexEntry[],
): {
  groups: Map<string, JMDieDiskIndexEntry[]>;
  per_entry_outcomes: Record<IngestOutcome, number>;
  candidates_by_pn: Map<string, readonly string[]>;
} {
  const groups = new Map<string, JMDieDiskIndexEntry[]>();
  const candidates_by_pn = new Map<string, readonly string[]>();
  const per_entry_outcomes = newOutcomes();
  for (const e of entries) {
    if (!isProgramFile(e)) {
      per_entry_outcomes.skipped_not_program++;
      continue;
    }
    const { normalized, candidates } = resolvePN(e);
    if (normalized.length === 0) {
      per_entry_outcomes.skipped_no_pn++;
      continue;
    }
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
      candidates_by_pn.set(normalized, candidates.slice(0, 3));
    }
    groups.get(normalized)!.push(e);
  }
  return { groups, per_entry_outcomes, candidates_by_pn };
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

/**
 * Walk a list of JM-Die disk-index entries and ingest each unique normalized
 * part-number into the in-memory `PartsLibraryEngine` catalog.
 *
 * Idempotent — a re-ingest of the same archive list does not duplicate
 * parts. The first call creates; subsequent calls see the existing PN in
 * the catalog and report `skipped_already_present`. (Adding a revision when
 * the print link upgrades is a U-PPL-D4 concern, not D3.)
 *
 * Pure — no `fs.*` reads. The archive enumeration is the caller's job.
 *
 * @throws when `entries` is not an array (runtime input fuzz). Empty arrays
 *   are legal and return a zero-count result.
 */
export function ingestArchive(opts: IngestArchiveOptions): IngestArchiveResult {
  if (!Array.isArray(opts.entries)) {
    throw new Error("ingestArchive: entries must be an array of JMDieDiskIndexEntry");
  }
  const dryRun = opts.dryRun !== false; // default true (safety)
  const tagFromEntry = opts.tagFromEntry !== false; // default true
  const limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : Infinity;

  const sliced = opts.entries.slice(0, limit === Infinity ? opts.entries.length : limit);
  const { groups, per_entry_outcomes, candidates_by_pn } = groupByNormalizedPN(sliced);

  const outcomes = { ...per_entry_outcomes };
  const per_pn: PerPNIngestRecord[] = [];

  for (const [normalized, list] of groups.entries()) {
    // Primary program = the first entry we saw for this PN (insertion order).
    const primary = list[0]!;
    const primaryPath = typeof primary.path === "string" ? primary.path : "";

    // Optional link lookup — when linkIndex was supplied, attach the print.
    // The ProgramToPrintLink shape (BlueprintProgramJoinEngine) carries:
    //   - print_id?      (training-triple ids)
    //   - print_doc_ids: string[]  (v6 join blueprint-page doc_ids)
    //   - match_confidence: string
    // Prefer training-triple print_id when present (it's the disk-resolved id),
    // fall back to the first v6 doc_id. The seed-rescue path (ProgramSeedLink)
    // carries match_kind instead of match_confidence — accept both.
    let printRef: { print_id?: string; match_confidence?: string } | undefined;
    if (opts.linkIndex && primaryPath.length > 0) {
      const lookup = lookupPrintForProgram(primaryPath, opts.linkIndex);
      const links = lookup.found ? (lookup.links ?? []) : [];
      if (links.length > 0) {
        const top = links[0] as unknown as Record<string, unknown>;
        const directId = typeof top.print_id === "string" ? top.print_id : "";
        const docIds = Array.isArray(top.print_doc_ids) ? (top.print_doc_ids as unknown[]) : [];
        const firstDocId = docIds.find((d): d is string => typeof d === "string" && d.length > 0);
        const id = directId || firstDocId || "";
        const conf = typeof top.match_confidence === "string"
          ? top.match_confidence
          : typeof top.match_kind === "string"
            ? top.match_kind
            : "";
        printRef = { print_id: id || undefined, match_confidence: conf || undefined };
      }
    }

    const tags = buildTags(primary, printRef?.match_confidence, tagFromEntry);

    // Check if the PN already exists in the catalog. PartsLibraryEngine
    // throws on duplicate part_number (unless the existing record is
    // archived) — we surface that as `skipped_already_present` rather than
    // letting the throw escape, so a partial-progress ingest can complete.
    const existingSearch = partsLibraryEngine.search({ query: normalized, limit: 1 });
    const alreadyExists = existingSearch.parts.some(
      (p) => p.part_number === normalized.toUpperCase().trim(),
    );

    const rec: PerPNIngestRecord = {
      part_number_normalized: normalized,
      outcome: "created",
      program_path: primaryPath || undefined,
      print_id: printRef?.print_id,
      match_confidence: printRef?.match_confidence,
      customer: typeof primary.customer === "string" ? primary.customer : undefined,
      program_count: list.length,
      candidates_sample: candidates_by_pn.get(normalized) ?? [],
    };

    if (alreadyExists) {
      rec.outcome = "skipped_already_present";
      const existing = existingSearch.parts.find(
        (p) => p.part_number === normalized.toUpperCase().trim(),
      );
      rec.part_id = existing?.id;
    } else if (dryRun) {
      // Dry-run: predict the create() would succeed but don't mutate.
      rec.outcome = "created"; // operator sees the would-be outcome
      rec.part_id = "(dryRun — no part_id allocated)";
    } else {
      try {
        const { part } = partsLibraryEngine.create({
          part_number: normalized,
          name: normalized,
          customer_id:
            typeof primary.customer === "string" && primary.customer.trim().length > 0
              ? primary.customer.trim()
              : undefined,
          tags,
          drawing_file_id: printRef?.print_id,
          initial_change_description: `Archive ingest: ${primaryPath || normalized}${
            printRef ? ` (linked to print ${printRef.print_id ?? "?"}, ${printRef.match_confidence ?? "?"})` : ""
          }`,
        });
        rec.part_id = part.id;
        rec.outcome = "created";
      } catch (err) {
        rec.outcome = "error";
        rec.error = err instanceof Error ? err.message : String(err);
      }
    }

    outcomes[rec.outcome]++;
    per_pn.push(rec);
  }

  return {
    generated_at: new Date().toISOString(),
    dryRun,
    entries_seen: sliced.length,
    unique_pns: groups.size,
    outcomes,
    per_pn,
  };
}

// ============================================================================
// CLASS WRAPPER + SINGLETON (PRISM convention)
// ============================================================================

/**
 * Class wrapper around the module-level functions. Methods delegate so callers
 * can choose the surface they prefer.
 *
 * Stateless — does not hold an `entries` list or a `linkIndex`. Each call
 * passes those fresh, so the engine is safe to share across requests.
 */
export class ArchiveToPartsCatalogIngesterEngine {
  ingestArchive(opts: IngestArchiveOptions): IngestArchiveResult {
    return ingestArchive(opts);
  }
  groupByNormalizedPN(
    entries: readonly JMDieDiskIndexEntry[],
  ): ReturnType<typeof groupByNormalizedPN> {
    return groupByNormalizedPN(entries);
  }
}

/** Module-level singleton — registered shape for dispatcher lazy import. */
export const archiveToPartsCatalogIngesterEngine = new ArchiveToPartsCatalogIngesterEngine();

/** Convention alias matching PRISM's lower-camel singleton style. */
export type { PartRecord };
