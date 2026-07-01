/**
 * CADArchiveJoinAugmenterEngine — MS-PRINT-PROGRAM-LOOP / U-PPL-D4 (Track D)
 *
 * Bridges the CAD-archive master-index (`CADFileIndexerEngine` output —
 * `data/state/cad-file-index/master-index.json`) into the print↔program v6
 * join (`BlueprintProgramJoinEngine` / `ProgramPrintLinkIndexEngine.JoinIndex`)
 * so the join stops missing CAD-side hits (the envelope brief notes only 38
 * print→CAM-project hits today — that's because the v6 producer was built
 * from the .MIN/.mcx program corpus and CAD files were never seeded into the
 * augmentation pipeline).
 *
 * Why this engine exists (the JM-Die tribal rule):
 *   For mill jobs, Mazak/Okuma lathe saves `.MIN` with a `$<INTERNAL>%`
 *   line-1 header, but Inventor / Fusion / SolidWorks mill saves NO G-code —
 *   the `.ipt` / `.iam` / `.f3d` / `.SLDPRT` IS the program (G-code goes
 *   USB → discard). So for matching prints to mill jobs you MUST treat those
 *   CAD files as program-equivalent. Per
 *   `memory/reference_jm_die_program_save_practice.md`.
 *
 * Design — anti-dup by composition:
 *   - DOES NOT duplicate `buildProgramSeedAugmentation` (the PN-extraction +
 *     join-seeding kernel) — composes it. The augmentation function already
 *     handles `.ipt/.iam/.f3d/.f3z/.sldprt/.sldasm` extensions via
 *     `PROGRAM_EQUIVALENT_EXTENSIONS`.
 *   - DOES NOT duplicate `CADFileIndexerEngine` (the disk-walk + master-index
 *     producer). Consumes its output.
 *   - DOES NOT duplicate `BlueprintProgramJoinEngine.loadJoinIndex` — calls
 *     it for the load step in the orchestrator method.
 *
 * Three exports:
 *   (1) `MILL_PROGRAM_FORMATS` — CAD extensions JM Die treats as program-
 *       equivalent for mill jobs. PROGRAM_EQUIVALENT_EXTENSIONS in
 *       ProgramPrintLinkIndexEngine is the lower-level allowlist; this is
 *       the engine's own narrower default (mill-relevant CAD only — no STEP /
 *       IGES / drawings / mesh exchange formats).
 *
 *   (2) `filterMillEligibleEntries(entries, opts?)` — pure filter. Defaults
 *       to keeping every entry whose format is in MILL_PROGRAM_FORMATS.
 *       `opts.millOnly: true` additionally rejects lathe / EDM machine
 *       categories. Returns a NEW array — does NOT mutate input.
 *
 *   (3) `augmentJoinFromCADIndex(joinIndex, masterIndex, opts?)` — pure
 *       transform. Composes (2) + `buildProgramSeedAugmentation`. Enriches
 *       each ProgramSeedLink with the CAD entry's customer / machine
 *       category / complexity hint / size / fileId / format — those are
 *       *needed downstream* for cost-per-part / quoting / capacity routing
 *       (a CAD-as-program with `complexityHint: "large"` is a very different
 *       cost signal from a `simple` one).
 *
 * Orchestrator method `loadAndAugment(opts?)` is the one I/O surface:
 *   reads master-index.json + loads v6 join via
 *   `blueprintProgramJoinEngine.loadJoinIndex()` + calls (3). Used by the
 *   dispatcher.
 *
 * Determinism: pure functions are deterministic given the input MasterIndex
 * + JoinIndex. The CADFileEntry → ProgramSeedLink mapping uses path string
 * identity (`absolutePath`) — the CAD file's SHA-256 fileId is preserved
 * verbatim into the enriched link so consumers can cross-reference back
 * to the master-index without re-hashing.
 *
 * FAIL-LOUD policy (CLAUDE.md R12):
 *   - Malformed entries (missing `absolutePath` / `format` / `customer`)
 *     are counted into `stats.malformedEntries`, NOT silently dropped at
 *     zero — operators MUST see the count.
 *   - `masterIndex.files` not an array → throws (the schema guarantees it;
 *     a non-array here means the caller built the object by hand and got
 *     the shape wrong).
 *   - `joinIndex` null/undefined → throws (the orchestrator's job to load it).
 *
 * Wiring:
 *   - prism_cad:cad_archive_join_augment      — full augment, returns links + stats
 *   - prism_cad:cad_archive_join_augment_dry  — stats-only (token-light for prod dashboards)
 *
 * Reference values for tests:
 *   - filterMillEligibleEntries: input 6 entries (3 .ipt, 1 .step, 1 .sldprt,
 *     1 .stl) → output 4 (.ipt×3 + .sldprt×1). millOnly=true on input with
 *     1 mill + 1 lathe + 1 unknown CAD → output 1 (the mill one).
 *   - augmentJoinFromCADIndex: a CAD entry "T8047D3 ITW.ipt" against a join
 *     row keyed by normalized PN "8047D3" → 1 new link with
 *     `matched_normalized_pn: "8047D3"` (from normalizeJMDiePN) and
 *     `match_kind: "filename_exact"` — the prefix+suffix-stripped candidate
 *     "8047D3" (emitted by extractJMDieCandidates) IS its own normalization,
 *     so the kernel records exact rather than loose. Practical note: with the
 *     JM-Die extractor, virtually every filename match resolves to
 *     filename_exact because the extractor produces a digits-only / canonical
 *     candidate alongside the raw form, and the kernel's dedupe preserves the
 *     stronger match_kind across candidates that map to the same PN.
 *
 * @module engines/CADArchiveJoinAugmenterEngine
 */

import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import {
  CAD_FORMATS,
  COMPLEXITY_HINTS,
  MACHINE_CATEGORIES,
  type CADFileEntry,
  type CADFormat,
  type MachineCategory,
  type ComplexityHint,
  type MasterIndex,
} from "../schemas/cadFileIndexSchema.js";
// CONTRACT-LOCK: `ProgramSeedLink` MUST remain an `export interface` (not a
// `z.infer` type alias) — `CADAugmentedLink` extends it, and an interface→alias
// flip in the producer engine would silently break that extension. If anyone
// converts `ProgramSeedLink` to a Zod-inferred type, fix the consumer at the
// same time (refactor `CADAugmentedLink` to composition: { seed, cad_metadata }).
import {
  buildProgramSeedAugmentation,
  PROGRAM_EQUIVALENT_EXTENSIONS,
  type ProgramSeedLink,
} from "./ProgramPrintLinkIndexEngine.js";
import type { JoinIndex } from "./BlueprintProgramJoinEngine.js";

/** Stable SHA-256 hex length the master-index schema guarantees for fileId. */
const FILE_ID_HEX_LENGTH = 64;

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * CAD file extensions JM Die treats as PROGRAM-equivalent for mill jobs.
 * Per `memory/reference_jm_die_program_save_practice.md`: Inventor/Fusion/
 * SolidWorks mill saves NO G-code — the CAD file IS the program. Mastercam
 * `.mcx-8` belongs to U-PPL-D5 (separate binary-parser unit, highest-leverage
 * per the milestone brief) and is NOT included here. STEP / IGES / STL /
 * DWG / DXF are exchange formats, not authoring artifacts — also excluded.
 * Lathe `.MIN` is not a CAD format and ALREADY in the v6 producer's program
 * corpus — not part of this bridge's job.
 */
export const MILL_PROGRAM_FORMATS: ReadonlySet<CADFormat> = new Set<CADFormat>([
  ".ipt",
  ".iam",
  ".f3d",
  ".f3z",
  ".sldprt",
  ".sldasm",
]);

// Anti-drift assertion (P1-1 from per-file scrutiny gate): every element of
// MILL_PROGRAM_FORMATS must also live in (a) `CAD_FORMATS` — so the master-index
// scanner can actually discover it, AND (b) `PROGRAM_EQUIVALENT_EXTENSIONS` —
// so `buildProgramSeedAugmentation` doesn't reject it at the extension gate
// at `ProgramPrintLinkIndexEngine.ts:426`. If either parent set ever drops a
// format we declared mill-eligible, fail at module load — silent rejection
// in the augment pipeline is the failure mode we MUST avoid (it's how the v6
// join landed at "only 38 print→CAM-project hits" in the first place).
{
  const cadFormatsSet = new Set<string>(CAD_FORMATS);
  const missingFromCAD: string[] = [];
  const missingFromProgramEquiv: string[] = [];
  for (const f of MILL_PROGRAM_FORMATS) {
    if (!cadFormatsSet.has(f)) missingFromCAD.push(f);
    if (!PROGRAM_EQUIVALENT_EXTENSIONS.has(f)) missingFromProgramEquiv.push(f);
  }
  if (missingFromCAD.length > 0 || missingFromProgramEquiv.length > 0) {
    throw new Error(
      "CADArchiveJoinAugmenterEngine: MILL_PROGRAM_FORMATS drift — " +
        (missingFromCAD.length > 0
          ? "missing from CAD_FORMATS: [" + missingFromCAD.join(",") + "] "
          : "") +
        (missingFromProgramEquiv.length > 0
          ? "missing from PROGRAM_EQUIVALENT_EXTENSIONS: [" + missingFromProgramEquiv.join(",") + "]"
          : ""),
    );
  }
}

/**
 * Machine categories considered "mill-class" for the `millOnly` filter
 * option. `hurco` is a vertical machining center brand JM Die uses for
 * smaller mill jobs; `hypermill` is the strategy-pack category. `mill`
 * covers the rest. Lathe / EDM are rejected when `millOnly: true`.
 */
const MILL_MACHINE_CATEGORIES: ReadonlySet<MachineCategory> = new Set<MachineCategory>([
  "mill",
  "hurco",
  "hypermill",
]);

// ── Public types ─────────────────────────────────────────────────────────────

/**
 * A ProgramSeedLink enriched with the CAD-side metadata the master-index
 * provides. The base ProgramSeedLink already carries program_path /
 * program_filename / raw_candidate / matched_normalized_pn / match_kind;
 * the `cad_*` fields are the augmentation a downstream cost / quote /
 * capacity router needs.
 *
 * Why we carry the fields rather than just the fileId: downstream consumers
 * already pay a JoinIndex load (60 MB JSONL) — making them ALSO load the
 * master-index just to resolve fileId → customer/category is wasteful when
 * the augmentation step already has both in hand. We pay the 4 extra bytes
 * per link.
 */
export interface CADAugmentedLink extends ProgramSeedLink {
  /** SHA-256 fileId from the master-index — stable, path-derived. */
  cad_file_id: string;
  cad_customer: string;
  cad_machine_category: MachineCategory;
  cad_complexity_hint: ComplexityHint;
  cad_size_bytes: number;
  cad_format: CADFormat;
}

export interface AugmentStats {
  /** Total entries the master-index carried. */
  cadEntriesScanned: number;
  /** Entries that survived the format filter (and the millOnly filter, when set). */
  millEligibleEntries: number;
  /** Filter rejects — format not in MILL_PROGRAM_FORMATS / opts.formats. */
  skippedNonMillFormat: number;
  /** Filter rejects — machineCategory not in MILL_MACHINE_CATEGORIES (only when millOnly:true). */
  skippedNonMillCategory: number;
  /** Entries that failed the runtime shape check (missing absolutePath/format/customer). */
  malformedEntries: number;
  /** Forwarded from buildProgramSeedAugmentation — the CAD path was already a join row. */
  alreadyJoined: number;
  /** Forwarded — extractJMDieCandidates returned nothing. */
  noCandidates: number;
  /** Final count of new enriched links emitted. */
  newLinks: number;
  /** Forwarded — the CAD path had candidates but none normalized to a join key. */
  stillOrphan: number;
  /**
   * Engine-bug signal (P1-3 from per-file scrutiny gate): the base kernel
   * emitted a `ProgramSeedLink` whose `program_path` did NOT round-trip back
   * to a `CADFileEntry` in the enrichment map. Should be 0 in healthy
   * operation — `program_path` is the SAME string we passed in via
   * `programPaths[]` (verified at `ProgramPrintLinkIndexEngine.ts:454`).
   * A non-zero value is a FAIL-LOUD diagnostic (CLAUDE.md R12) — surface it
   * separately from `stillOrphan` so the operator can distinguish "no PN
   * match" (legitimate) from "engine internal-invariant broke" (bug).
   */
  cadZipMisses: number;
  /** Total wall time of the transform (filter + augment + enrichment) in ms. */
  buildMs: number;
}

export interface AugmentResult {
  newLinks: CADAugmentedLink[];
  stats: AugmentStats;
}

export interface FilterOptions {
  /**
   * When true, additionally reject entries whose machineCategory is NOT in
   * MILL_MACHINE_CATEGORIES (lathe / wire_edm / sinker_edm / unknown). Default
   * false — include every CAD entry of an eligible format regardless of the
   * folder it was discovered in (the master-index's machineCategory is a path
   * heuristic, not authoritative; a customer subfolder under CNC LATHE may
   * still hold an .ipt mill print).
   */
  millOnly?: boolean;
  /**
   * Optional override of the format allowlist. Defaults to MILL_PROGRAM_FORMATS.
   * Pass a custom set to (e.g.) widen to .step for export-format-aware tooling
   * — at the cost of false positives in the seed augmentation.
   *
   * Accepted at runtime as either a `ReadonlySet<CADFormat>` (in-process
   * callers) OR a `readonly CADFormat[]` (Zod-parsed dispatcher payloads —
   * JSON cannot serialize a Set across the MCP boundary). The augmenter
   * coerces arrays to Set internally so `.has()` lookups work for both.
   */
  formats?: ReadonlySet<CADFormat> | readonly CADFormat[];
}

export interface LoadAndAugmentOptions extends FilterOptions {
  /** Path to master-index.json. Defaults to `<cwd>/data/state/cad-file-index/master-index.json`. */
  masterIndexPath?: string;
  /** Forwarded to blueprintProgramJoinEngine.loadJoinIndex(). */
  joinJsonlPath?: string;
  triplesJsonlPath?: string;
  maxLineBytes?: number;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Runtime shape guard for one CADFileEntry — validates ALL 8 fields the
 * downstream enrichment step reads (P1-2 fix from per-file scrutiny gate).
 * We DON'T run full Zod here (would re-validate 20K+ entries on every
 * augment call), but the predicate's `e is CADFileEntry` narrowing means
 * downstream code at line 376-384 trusts the field shapes — so every
 * field that the augmenter actually reads MUST be validated here.
 *
 * Fields validated:
 *   - absolutePath   : string, non-empty                  (used as join key)
 *   - format         : string, non-empty                  (filter input)
 *   - customer       : string, non-empty                  (CAD enrichment)
 *   - machineCategory: string, non-empty + in MACHINE_CATEGORIES  (millOnly filter)
 *   - fileId         : string, exactly FILE_ID_HEX_LENGTH chars   (CAD enrichment)
 *   - sizeBytes      : finite non-negative number          (CAD enrichment)
 *   - complexityHint : string, in COMPLEXITY_HINTS         (CAD enrichment)
 *   - lastModified   : string, non-empty                   (not read but schema-mandatory)
 *
 * The MACHINE_CATEGORIES / COMPLEXITY_HINTS enum checks are runtime — a value
 * outside the enum slips Zod parse on the producer side, but a hand-built
 * MasterIndex object could carry "mille" or "siimple". Reject those at the
 * predicate; the entry counts into `malformedEntries`, not `eligible`.
 */
function isUsableEntry(e: unknown): e is CADFileEntry {
  if (e === null || typeof e !== "object") return false;
  const r = e as Record<string, unknown>;
  if (typeof r.absolutePath !== "string" || r.absolutePath.length === 0) return false;
  if (typeof r.format !== "string" || r.format.length === 0) return false;
  if (typeof r.customer !== "string" || r.customer.length === 0) return false;
  if (typeof r.machineCategory !== "string" || r.machineCategory.length === 0) return false;
  if (!(MACHINE_CATEGORIES as readonly string[]).includes(r.machineCategory)) return false;
  if (typeof r.fileId !== "string" || r.fileId.length !== FILE_ID_HEX_LENGTH) return false;
  if (typeof r.sizeBytes !== "number" || !Number.isFinite(r.sizeBytes) || r.sizeBytes < 0) return false;
  if (typeof r.complexityHint !== "string") return false;
  if (!(COMPLEXITY_HINTS as readonly string[]).includes(r.complexityHint)) return false;
  if (typeof r.lastModified !== "string" || r.lastModified.length === 0) return false;
  return true;
}

/**
 * Pure filter — given a list of CAD entries, keep only those whose format
 * is in the format allowlist (default MILL_PROGRAM_FORMATS) and, when
 * `millOnly: true`, whose machineCategory is in MILL_MACHINE_CATEGORIES.
 *
 * Returns a NEW array. Does NOT mutate input. Tolerates malformed entries
 * by silently skipping them — the augment-level caller counts those into
 * `stats.malformedEntries` BEFORE calling this filter (so they don't get
 * lost).
 */
export function filterMillEligibleEntries(
  entries: readonly CADFileEntry[],
  opts: FilterOptions = {},
): CADFileEntry[] {
  if (!Array.isArray(entries)) return [];
  const rawAllow = opts.formats ?? MILL_PROGRAM_FORMATS;
  const allow: ReadonlySet<CADFormat> = Array.isArray(rawAllow)
    ? new Set(rawAllow as readonly CADFormat[])
    : (rawAllow as ReadonlySet<CADFormat>);
  const result: CADFileEntry[] = [];
  for (const e of entries) {
    if (!isUsableEntry(e)) continue;
    if (!allow.has(e.format)) continue;
    if (opts.millOnly === true && !MILL_MACHINE_CATEGORIES.has(e.machineCategory)) continue;
    result.push(e);
  }
  return result;
}

/**
 * Pure transform — augment a JoinIndex with new ProgramSeedLinks rescued
 * from a CAD master-index, enriching each link with the CAD entry's
 * metadata.
 *
 * Composes `filterMillEligibleEntries` (this engine) with
 * `buildProgramSeedAugmentation` (ProgramPrintLinkIndexEngine). The
 * enrichment step builds a path→entry map for O(1) lookup when zipping the
 * base-engine output back to its source CAD entry.
 *
 * Algorithm:
 *   1. Pull `masterIndex.files`, count malformed.
 *   2. filterMillEligibleEntries to mill-eligible CAD entries.
 *   3. Extract `absolutePath` from each → `programPaths[]`.
 *   4. Call `buildProgramSeedAugmentation(joinIndex, programPaths)` →
 *      base ProgramSeedLink[] + stats.
 *   5. Build a map `absolutePath → CADFileEntry` from the filtered entries
 *      (NOT the unfiltered files, so a malformed entry can't poison the
 *      enrichment).
 *   6. Zip: for each base link, look up its source CADFileEntry via
 *      `program_path` and copy the cad_* fields. Should always hit
 *      (buildProgramSeedAugmentation only emits a link for a path it was
 *      given). If miss → count into `cadZipMisses` (separate FAIL-LOUD
 *      signal — see AugmentStats.cadZipMisses).
 *   7. Return enriched links + merged stats.
 *
 * TRUST BOUNDARY: `masterIndex` is producer-trusted — it's the output of
 * `CADFileIndexerEngine` (a co-owned engine). Path values inside it are
 * therefore NOT user input and don't need traversal / UNC / drive-switch
 * validation here. The base kernel `buildProgramSeedAugmentation` consumes
 * paths as opaque strings without I/O (validated at
 * `ProgramPrintLinkIndexEngine.ts:414-470`), so there's no surface for path
 * injection even if the trust boundary were ever broken.
 */
export function augmentJoinFromCADIndex(
  joinIndex: JoinIndex,
  masterIndex: MasterIndex,
  opts: FilterOptions = {},
): AugmentResult {
  const t0 = Date.now();

  if (joinIndex === null || joinIndex === undefined) {
    throw new Error(
      "augmentJoinFromCADIndex: joinIndex is required (call blueprintProgramJoinEngine.loadJoinIndex first)",
    );
  }
  if (masterIndex === null || masterIndex === undefined) {
    throw new Error("augmentJoinFromCADIndex: masterIndex is required");
  }
  if (!Array.isArray(masterIndex.files)) {
    throw new Error(
      "augmentJoinFromCADIndex: masterIndex.files must be an array (got " +
        typeof masterIndex.files +
        ") — pass the full MasterIndex schema",
    );
  }

  // Step 1 — count malformed entries before the filter (so they're visible
  // to the operator). A malformed entry survives the cad-file-index walk in
  // the rare corruption case but the join is paranoid about its inputs.
  const rawEntries = masterIndex.files as ReadonlyArray<unknown>;
  let malformedEntries = 0;
  const usable: CADFileEntry[] = [];
  for (const e of rawEntries) {
    if (isUsableEntry(e)) {
      usable.push(e);
    } else {
      malformedEntries++;
    }
  }

  // Step 2 — format / category filter. `opts.formats` may arrive as a Set
  // (in-process callers) OR as a plain Array (Zod-parsed dispatcher payloads —
  // the schema declares `z.array(z.string()).optional()` because JSON can't
  // carry a Set across the MCP boundary). Coerce arrays to Set so `.has()`
  // works regardless of caller. A non-array non-Set falls back to the default
  // — silent rejection of all entries here is the exact bug Arm C of the
  // end-of-task 3-of-3 scrutiny gate caught on the first pass.
  const allow: ReadonlySet<CADFormat> =
    opts.formats instanceof Set
      ? (opts.formats as ReadonlySet<CADFormat>)
      : Array.isArray(opts.formats)
        ? new Set<CADFormat>(opts.formats as readonly CADFormat[])
        : MILL_PROGRAM_FORMATS;
  const millOnly = opts.millOnly === true;
  let skippedNonMillFormat = 0;
  let skippedNonMillCategory = 0;
  const eligible: CADFileEntry[] = [];
  for (const e of usable) {
    if (!allow.has(e.format)) {
      skippedNonMillFormat++;
      continue;
    }
    if (millOnly && !MILL_MACHINE_CATEGORIES.has(e.machineCategory)) {
      skippedNonMillCategory++;
      continue;
    }
    eligible.push(e);
  }

  // Step 3 — extract path strings for the base augmentation kernel.
  const programPaths: string[] = eligible.map((e) => e.absolutePath);

  // Step 4 — call into the base kernel.
  const base = buildProgramSeedAugmentation(joinIndex, programPaths);

  // Step 5 — path → entry map for enrichment. Uses the raw absolutePath
  // string as the key. buildProgramSeedAugmentation does an internal
  // normalizeProgramPathKey on the join-side but emits the ORIGINAL string
  // verbatim in `program_path`, so the map stays in original-string space.
  const entryByPath = new Map<string, CADFileEntry>();
  for (const e of eligible) entryByPath.set(e.absolutePath, e);

  // Step 6 — zip and enrich. Invariant: every base link SHOULD have a
  // matching entry (its `program_path` is the SAME string we passed in via
  // `programPaths`, verified at `ProgramPrintLinkIndexEngine.ts:454`). A
  // non-zero `cadZipMisses` therefore indicates an engine-internal invariant
  // break (e.g. a future kernel refactor that normalizes `program_path`
  // before emission) — operators MUST see it surfaced separately from the
  // legitimate `stillOrphan` channel.
  const newLinks: CADAugmentedLink[] = [];
  let cadZipMisses = 0;
  for (const link of base.newLinks) {
    const e = entryByPath.get(link.program_path);
    if (e === undefined) {
      cadZipMisses++;
      continue;
    }
    newLinks.push({
      ...link,
      cad_file_id: e.fileId,
      cad_customer: e.customer,
      cad_machine_category: e.machineCategory,
      cad_complexity_hint: e.complexityHint,
      cad_size_bytes: e.sizeBytes,
      cad_format: e.format,
    });
  }

  // Step 7 — merged stats. `stillOrphan` is the kernel's pure value;
  // `cadZipMisses` is the engine-bug signal (kept separate).
  const stats: AugmentStats = {
    cadEntriesScanned: rawEntries.length,
    millEligibleEntries: eligible.length,
    skippedNonMillFormat,
    skippedNonMillCategory,
    malformedEntries,
    alreadyJoined: base.stats.alreadyJoined,
    noCandidates: base.stats.noCandidates,
    newLinks: newLinks.length,
    stillOrphan: base.stats.stillOrphan,
    cadZipMisses,
    buildMs: Date.now() - t0,
  };

  return { newLinks, stats };
}

// ── Engine class ─────────────────────────────────────────────────────────────

/**
 * Engine wrapper for the orchestrator method `loadAndAugment` and the
 * dispatcher. Pure-function consumers should import
 * `augmentJoinFromCADIndex` / `filterMillEligibleEntries` /
 * `MILL_PROGRAM_FORMATS` directly. The class exists to host the async I/O
 * surface and the engine-registry metadata (capabilities, info). It extends
 * `BaseEngine` to match the convention used by its INPUT producer
 * `CADFileIndexerEngine` (the producer/consumer pair stays inside one
 * convention family); a lighter plain-class pattern — used by the sibling
 * `ArchiveToPartsCatalogIngesterEngine` (U-PPL-D3) — would also have been
 * acceptable but adds a second convention family to the CAD subsystem.
 */
export class CADArchiveJoinAugmenterEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADArchiveJoinAugmenterEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Bridges CAD-archive master-index → BlueprintProgramJoinEngine v6 join " +
        "(treats .ipt/.iam/.f3d/.f3z/.sldprt/.sldasm as program-equivalent for mill " +
        "jobs per JM Die tribal rule). U-PPL-D4.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "filter_mill_eligible",
        description: "Filter CAD entries to mill-program-equivalent formats (.ipt/.iam/.f3d/.f3z/.sldprt/.sldasm)",
        actions: ["cad_archive_join_augment"],
      },
      {
        name: "augment_join",
        description:
          "Augment v6 join with CAD-side seed links (composes buildProgramSeedAugmentation + enriches with CAD metadata)",
        actions: ["cad_archive_join_augment", "cad_archive_join_augment_dry"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input === null || input === undefined || typeof input !== "object") {
      return "input must be an object (LoadAndAugmentOptions)";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    return this.loadAndAugment(input as LoadAndAugmentOptions);
  }

  /**
   * Orchestrator — load master-index.json + the v6 join, call the pure
   * transform, return the enriched result. One I/O surface for the
   * dispatcher.
   *
   * @param opts.masterIndexPath - defaults to `<cwd>/data/state/cad-file-index/master-index.json`
   * @param opts.joinJsonlPath  - forwarded to blueprintProgramJoinEngine.loadJoinIndex()
   * @param opts.millOnly        - forwarded to filterMillEligibleEntries
   * @param opts.formats         - forwarded to filterMillEligibleEntries
   */
  async loadAndAugment(opts: LoadAndAugmentOptions = {}): Promise<AugmentResult> {
    const fs = await import("fs");
    const nodePath = await import("path");

    const indexPath = opts.masterIndexPath
      ? opts.masterIndexPath
      : nodePath.resolve(process.cwd(), "data/state/cad-file-index/master-index.json");

    if (!fs.existsSync(indexPath)) {
      throw new Error(
        "loadAndAugment: master-index not found at " +
          indexPath +
          " — run cadFileIndexerEngine.index() first to produce it",
      );
    }

    const raw = fs.readFileSync(indexPath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        "loadAndAugment: master-index at " +
          indexPath +
          " is not valid JSON: " +
          (e instanceof Error ? e.message : String(e)),
      );
    }
    if (parsed === null || typeof parsed !== "object") {
      throw new Error("loadAndAugment: master-index must be a JSON object");
    }
    const masterIndex = parsed as MasterIndex;
    if (!Array.isArray((masterIndex as { files?: unknown }).files)) {
      throw new Error(
        "loadAndAugment: master-index.files must be an array (schemaVersion mismatch?)",
      );
    }

    // Lazy import — keeps the cold-start cost off the engine constructor.
    const { blueprintProgramJoinEngine } = await import("./BlueprintProgramJoinEngine.js");
    const joinIndex = await blueprintProgramJoinEngine.loadJoinIndex({
      joinJsonlPath: opts.joinJsonlPath,
      triplesJsonlPath: opts.triplesJsonlPath,
      maxLineBytes: opts.maxLineBytes,
    });

    return augmentJoinFromCADIndex(joinIndex, masterIndex, {
      millOnly: opts.millOnly,
      formats: opts.formats,
    });
  }
}

export const cadArchiveJoinAugmenterEngine = new CADArchiveJoinAugmenterEngine();
