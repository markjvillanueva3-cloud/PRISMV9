/**
 * BlueprintProgramJoinEngine — Phase 8 → JM Die program join table
 *
 * Joins blueprint pages extracted by Phase 8 (cleaned JSONL with
 * part_numbers_clean) to JM Die program/CAD files indexed by:
 *   - program-labels.json   (mcp-server/data/state/program-labels.json,
 *                            real lathe labels with filePath/customer/etc)
 *   - master-index.json     (data/state/cad-file-index/master-index.json,
 *                            CAD master index — currently sparse)
 *
 * Output is a join JSONL where each record groups blueprint pages and
 * matching program/CAD files under a normalized part number with a
 * match-confidence tag (exact | loose | miss).
 *
 * The engine streams the phase8 JSONL line-by-line (readline) so memory
 * stays bounded regardless of corpus size. Program indexes are loaded
 * eagerly because they are small (~100s of entries).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES — public
// ============================================================================

export interface ProgramFileRef {
  source_path: string;
  filename: string;
  customer?: string;
  programNumber?: string;
  material?: string;
  machineCategory?: string;
  controllerFamily?: string;
  format?: string;
  fileId?: string;
}

export interface BlueprintRef {
  doc_id: string;
  filename: string;
  page_index: number;
  drawing_score: number;
}

export type MatchConfidence = "exact" | "loose" | "ambiguous" | "miss";

export interface JoinRecord {
  part_number: string;
  part_number_normalized: string;
  blueprints: BlueprintRef[];
  programs: ProgramFileRef[];
  match_confidence: MatchConfidence;
}

export interface JoinSummary {
  blueprint_pages_total: number;
  blueprint_pages_with_part_number: number;
  blueprint_pages_malformed: number;
  unique_part_numbers: number;
  joins_exact: number;
  joins_loose: number;
  joins_ambiguous: number;
  joins_miss: number;
  programs_indexed: number;
}

export interface JoinOptions {
  /** Path to program-labels.json (REAL lathe labels). */
  programLabelsPath?: string;
  /** Path to CAD master-index.json (currently stub). */
  masterIndexPath?: string;
  /** Optional path to write the join JSONL. */
  outPath?: string;
  /** Hard cap on a single JSONL line (bytes); over-cap lines counted malformed. */
  maxLineBytes?: number;
  /**
   * Cardinality threshold above which a match is demoted to confidence
   * "ambiguous". Real-world test: short numeric part numbers like "0001"
   * collide with hundreds of programs and drown out useful joins.
   * Default: 25. Set to 0 to disable.
   */
  maxProgramsPerMatch?: number;
}

// ============================================================================
// TYPES — internal (best-effort shape of source files)
// ============================================================================

interface ProgramLabelsFile {
  schemaVersion?: string;
  labels?: Array<{
    filePath: string;
    fileName: string;
    customer?: string;
    machineCategory?: string;
    controllerFamily?: string;
    materialHint?: string;
  }>;
}

interface MasterIndexFile {
  schemaVersion?: number;
  files?: Array<{
    fileId: string;
    absolutePath: string;
    format?: string;
    customer?: string;
    machineCategory?: string;
  }>;
}

interface Phase8Row {
  doc_id: string;
  filename: string;
  page_index: number;
  tier1?: { drawing_score?: number };
  tier2?: { part_numbers_clean?: string[]; part_numbers?: string[] };
}

// ============================================================================
// NORMALIZATION + EXTRACTION
// ============================================================================

/**
 * Material/heat-treat codes that programs append to part numbers and
 * blueprints typically omit. Stripped during loose-normalization so
 * `L-2845-D2.MIN` (program) and `2845` (blueprint) collide.
 */
const MATERIAL_CODE_RE =
  /-(?:D2|A2|S7|H13|O1|M2|HSS|4140|4340|6061|7075|2024|17-?4|303|304|316|410|420|440[CB]?)$/i;

/** Operation prefix the lathe shop puts on filenames: L- (lathe), M- (mill), G- (grind). */
const OP_PREFIX_RE = /^(?:L|M|G)-/i;

/** Trailing single-letter rev marker: -A, -B, …, -Z. */
const REV_LETTER_RE = /-[A-Z]$/i;

/** Trailing op-number suffix: -OP1, -OP2, -OP10. */
const OP_NUMBER_RE = /-OP\d+$/i;

/** Trailing common file extensions to strip from path-derived names. */
const EXT_RE = /\.(?:MIN|NC|NCM|TAP|EIA|SPF|MPF|PIM|DXF|STEP|STP|IGES|IGS|SLDPRT|IPT|F3D|PRT|CATPart)$/i;

/**
 * Normalize a part-number string for cross-corpus joining.
 *
 * Steps (idempotent):
 *   1. trim + uppercase
 *   2. strip a leading L-/M-/G- operation prefix
 *   3. strip a trailing -OPn op-number suffix
 *   4. strip a trailing material/heat-treat code (-D2/-4140/-6061/...)
 *   5. strip a trailing single-letter -A/-B revision marker
 *   6. collapse whitespace
 *
 * Returns "" on falsy/whitespace-only input.
 */
export function normalizePartNumber(raw: string): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim().toUpperCase();
  if (s.length === 0) return "";
  s = s.replace(OP_PREFIX_RE, "");
  s = s.replace(/\s+/g, "");
  // Loop to a fixed point: stripping a trailing rev letter can expose a new
  // material suffix (e.g. "2845-D2-A" -> "2845-D2" -> "2845"), so apply
  // the trailing-suffix strippers until no more changes occur.
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(OP_NUMBER_RE, "");
    s = s.replace(MATERIAL_CODE_RE, "");
    s = s.replace(REV_LETTER_RE, "");
  }
  return s;
}

/**
 * Pull candidate part-number strings out of a program filename / path.
 *
 * Strategy:
 *   - strip the file extension
 *   - keep the bare basename as one candidate
 *   - keep the basename with op-prefix stripped as another
 *   - keep the digits-only token if present (e.g. "2845")
 *   - keep "<digits>-<digits>" tokens (e.g. "1280-1")
 *
 * Filtered to non-empty unique strings, all uppercased.
 */
export function extractPartNumberCandidates(fileName: string): string[] {
  if (typeof fileName !== "string" || fileName.length === 0) return [];
  const base = fileName.replace(EXT_RE, "").toUpperCase();
  const cands = new Set<string>();
  cands.add(base);
  cands.add(base.replace(OP_PREFIX_RE, ""));
  const digits = base.match(/\d+/g);
  if (digits) {
    // Require digits-only candidates to be 3+ chars: a single "2" extracted
    // from "D2" (material code) or a 2-digit fragment yields too much
    // false-positive matching across the corpus.
    for (const d of digits) {
      if (d.length >= 3) cands.add(d);
    }
  }
  const compound = base.match(/\d+-\d+/g);
  if (compound) {
    for (const c of compound) cands.add(c);
  }
  cands.delete("");
  return [...cands];
}

// ============================================================================
// PROGRAM INDEXING
// ============================================================================

function pushProgram(
  index: Map<string, ProgramFileRef[]>,
  key: string,
  ref: ProgramFileRef,
): void {
  if (key.length === 0) return;
  const existing = index.get(key);
  if (existing) {
    // Multiple filename candidates often normalize to the same key; dedup
    // by source_path so a single program file appears once per key.
    if (!existing.some((e) => e.source_path === ref.source_path)) {
      existing.push(ref);
    }
  } else {
    index.set(key, [ref]);
  }
}

/**
 * Build a normalized-part-number → ProgramFileRef[] index from
 * program-labels.json. Each program's filename produces multiple
 * candidates (raw, op-stripped, digits-only); each candidate is
 * normalized and inserted as a separate index key so blueprint
 * lookups can hit any of them.
 */
function indexProgramsFromLabels(labelsPath: string): {
  index: Map<string, ProgramFileRef[]>;
  count: number;
} {
  if (!fs.existsSync(labelsPath)) {
    throw new Error(`program-labels.json not found at ${labelsPath}`);
  }
  const raw = fs.readFileSync(labelsPath, "utf-8");
  let parsed: ProgramLabelsFile;
  try {
    parsed = JSON.parse(raw) as ProgramLabelsFile;
  } catch (err) {
    throw new Error(
      `program-labels.json is not valid JSON: ${(err as Error).message}`,
    );
  }
  const labels = Array.isArray(parsed.labels) ? parsed.labels : [];
  const index = new Map<string, ProgramFileRef[]>();
  for (const label of labels) {
    if (typeof label?.filePath !== "string" || typeof label?.fileName !== "string") continue;
    const ref: ProgramFileRef = {
      source_path: label.filePath,
      filename: label.fileName,
      customer: label.customer,
      machineCategory: label.machineCategory,
      controllerFamily: label.controllerFamily,
      material: label.materialHint,
    };
    for (const cand of extractPartNumberCandidates(label.fileName)) {
      pushProgram(index, normalizePartNumber(cand), ref);
    }
  }
  return { index, count: labels.length };
}

/**
 * Build a normalized-part-number → ProgramFileRef[] index from a CAD
 * master-index.json. Skipped silently when the file is absent (the
 * master index is currently a stub on most workstations).
 */
function indexProgramsFromMasterIndex(masterIndexPath: string): {
  index: Map<string, ProgramFileRef[]>;
  count: number;
} {
  if (!fs.existsSync(masterIndexPath)) {
    return { index: new Map(), count: 0 };
  }
  const raw = fs.readFileSync(masterIndexPath, "utf-8");
  let parsed: MasterIndexFile;
  try {
    parsed = JSON.parse(raw) as MasterIndexFile;
  } catch (err) {
    throw new Error(
      `master-index.json is not valid JSON: ${(err as Error).message}`,
    );
  }
  const files = Array.isArray(parsed.files) ? parsed.files : [];
  const index = new Map<string, ProgramFileRef[]>();
  for (const f of files) {
    if (typeof f?.absolutePath !== "string") continue;
    const fileName = f.absolutePath.split(/[/\\]/).pop() ?? f.absolutePath;
    const ref: ProgramFileRef = {
      source_path: f.absolutePath,
      filename: fileName,
      customer: f.customer,
      machineCategory: f.machineCategory,
      format: f.format,
      fileId: f.fileId,
    };
    for (const cand of extractPartNumberCandidates(fileName)) {
      pushProgram(index, normalizePartNumber(cand), ref);
    }
  }
  return { index, count: files.length };
}

function mergeIndexes(
  a: Map<string, ProgramFileRef[]>,
  b: Map<string, ProgramFileRef[]>,
): Map<string, ProgramFileRef[]> {
  if (a.size === 0) return b;
  if (b.size === 0) return a;
  const merged = new Map<string, ProgramFileRef[]>(a);
  for (const [k, v] of b.entries()) {
    const existing = merged.get(k);
    if (existing) {
      merged.set(k, existing.concat(v));
    } else {
      merged.set(k, v);
    }
  }
  return merged;
}

// ============================================================================
// JOIN
// ============================================================================

const DEFAULT_MAX_LINE_BYTES = 1 * 1024 * 1024;

function isPhase8Row(v: unknown): v is Phase8Row {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.doc_id !== "string") return false;
  if (typeof r.filename !== "string") return false;
  if (typeof r.page_index !== "number" || !Number.isFinite(r.page_index)) return false;
  return true;
}

function partNumbersFromRow(row: Phase8Row): string[] {
  const clean = row.tier2?.part_numbers_clean;
  if (Array.isArray(clean) && clean.length > 0) return clean.filter((p) => typeof p === "string");
  const raw = row.tier2?.part_numbers;
  if (Array.isArray(raw)) return raw.filter((p) => typeof p === "string");
  return [];
}

/**
 * Stream Phase 8 cleaned JSONL and join each part-number-bearing page
 * to programs/CAD files indexed from program-labels.json (+ optional
 * master-index.json). Joins are aggregated by normalized part number;
 * each emitted record carries every blueprint page that contributed
 * and every program file that matched.
 *
 * Confidence:
 *   exact     — at least one candidate hit on the program side equals
 *               the blueprint candidate exactly (post-normalization).
 *   loose     — at least one program hit on the loose-normalized form
 *               (material/rev stripped) but no exact hit.
 *   ambiguous — a match was found but the program count exceeds
 *               `maxProgramsPerMatch` (default 25) — too many collisions
 *               to be useful (e.g. short numeric PNs like "0001").
 *   miss      — no program file matched any candidate.
 */
async function joinBlueprintsToPrograms(
  phase8Path: string,
  options: JoinOptions = {},
): Promise<{ summary: JoinSummary; joins: JoinRecord[] }> {
  if (!fs.existsSync(phase8Path)) {
    throw new Error(`phase8 JSONL not found at ${phase8Path}`);
  }

  const labelsIndex = options.programLabelsPath
    ? indexProgramsFromLabels(options.programLabelsPath)
    : { index: new Map<string, ProgramFileRef[]>(), count: 0 };
  const masterIndex = options.masterIndexPath
    ? indexProgramsFromMasterIndex(options.masterIndexPath)
    : { index: new Map<string, ProgramFileRef[]>(), count: 0 };
  const programIndex = mergeIndexes(labelsIndex.index, masterIndex.index);

  const maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES;

  const maxProgramsPerMatch = options.maxProgramsPerMatch ?? 25;

  const summary: JoinSummary = {
    blueprint_pages_total: 0,
    blueprint_pages_with_part_number: 0,
    blueprint_pages_malformed: 0,
    unique_part_numbers: 0,
    joins_exact: 0,
    joins_loose: 0,
    joins_ambiguous: 0,
    joins_miss: 0,
    programs_indexed: labelsIndex.count + masterIndex.count,
  };

  // normalized PN -> aggregator
  const aggregate = new Map<
    string,
    {
      part_number: string;
      blueprints: BlueprintRef[];
      programSet: Map<string, ProgramFileRef>; // dedup by source_path
      matchedExact: boolean;
    }
  >();

  const stream = fs.createReadStream(phase8Path, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.length === 0) continue;
    summary.blueprint_pages_total++;
    if (Buffer.byteLength(line, "utf-8") > maxLineBytes) {
      summary.blueprint_pages_malformed++;
      continue;
    }
    let row: unknown;
    try {
      row = JSON.parse(line);
    } catch {
      summary.blueprint_pages_malformed++;
      continue;
    }
    if (!isPhase8Row(row)) {
      summary.blueprint_pages_malformed++;
      continue;
    }

    const score = row.tier1?.drawing_score;
    const partNums = partNumbersFromRow(row);
    if (partNums.length === 0) continue;
    summary.blueprint_pages_with_part_number++;

    const blueprintRef: BlueprintRef = {
      doc_id: row.doc_id,
      filename: row.filename,
      page_index: row.page_index,
      drawing_score: typeof score === "number" && Number.isFinite(score) ? score : 0,
    };

    for (const pn of partNums) {
      const norm = normalizePartNumber(pn);
      if (norm.length === 0) continue;
      let entry = aggregate.get(norm);
      if (!entry) {
        entry = {
          part_number: pn,
          blueprints: [],
          programSet: new Map<string, ProgramFileRef>(),
          matchedExact: false,
        };
        aggregate.set(norm, entry);
      }
      entry.blueprints.push(blueprintRef);

      // Exact: blueprint candidate normalized == program key
      const exactHits = programIndex.get(norm);
      if (exactHits) {
        for (const ref of exactHits) entry.programSet.set(ref.source_path, ref);
        entry.matchedExact = true;
      }
      // Loose: try the digits-only version of the blueprint pn
      const digitsOnly = norm.match(/\d+/g)?.join("") ?? "";
      if (digitsOnly !== norm && digitsOnly.length >= 3) {
        const looseHits = programIndex.get(digitsOnly);
        if (looseHits) {
          for (const ref of looseHits) entry.programSet.set(ref.source_path, ref);
        }
      }
    }
  }

  const joins: JoinRecord[] = [];
  for (const [norm, entry] of aggregate.entries()) {
    const programs = [...entry.programSet.values()];
    let confidence: MatchConfidence;
    if (programs.length === 0) {
      confidence = "miss";
      summary.joins_miss++;
    } else if (maxProgramsPerMatch > 0 && programs.length > maxProgramsPerMatch) {
      // High-cardinality match: short numeric keys like "0001" collide
      // with hundreds of unrelated programs across the corpus. Demote so
      // training pipelines can filter ambiguous joins as untrustworthy.
      confidence = "ambiguous";
      summary.joins_ambiguous++;
    } else if (entry.matchedExact) {
      confidence = "exact";
      summary.joins_exact++;
    } else {
      confidence = "loose";
      summary.joins_loose++;
    }
    joins.push({
      part_number: entry.part_number,
      part_number_normalized: norm,
      blueprints: entry.blueprints,
      programs,
      match_confidence: confidence,
    });
  }
  summary.unique_part_numbers = joins.length;

  if (typeof options.outPath === "string" && options.outPath.length > 0) {
    // Sync write — joins are already aggregated in memory, so streaming
    // adds no benefit and the async flush races with downstream readers.
    const body = joins.map((j) => JSON.stringify(j)).join("\n") + (joins.length > 0 ? "\n" : "");
    fs.writeFileSync(options.outPath, body, "utf-8");
  }

  return { summary, joins };
}

// ============================================================================
// QUERY LAYER — load a pre-built join JSONL + serve point lookups
// (U-DOCU-04 / MS-DOCU-INGEST)
// ============================================================================
//
// The functions above PRODUCE a join JSONL (batch, streaming aggregation). The
// functions below LOAD a pre-built join JSONL — the v6 join from
// scripts/docustrata/phase16-blueprint-program-join-v6.py — plus the
// title-block-verified training-triples-v4.jsonl, and answer two point queries
// the producer cannot:
//
//   programForPrint(pn)       — given a part number, which programs/CAD files?
//   printForProgram(path)     — given a program file path, which print doc(s)?
//
// The v6 JSONL is a SUPERSET of JoinRecord (extra fields: n_programs,
// print_customers, raw_pn_variants; richer program refs with kind/relation/via).
// The training triples additionally carry the actual print-PDF disk path — the
// v6 join only carries blueprint doc_ids. Both files are streamed line-by-line
// so LOAD-time peak memory is bounded by the largest single line, not the file
// size — but the resulting Maps DO hold every row, so total resident memory
// scales with row count (fine for the ~74K-row v6 join). The Maps are held in a
// process-level singleton cache (mtime-guarded, single-flight) so dispatcher
// actions never re-stream the file.
//
// FAIL-LOUD policy (CLAUDE.md R12): loadJoinIndex throws on a missing join file
// AND on a file that exists but yields zero valid rows — a success-shaped empty
// index is worse than an error because every query then silently returns
// found:false and nothing tells the operator the file was corrupt/half-written.

/** A program reference as it appears in the v6 join JSONL (richer than ProgramFileRef). */
export interface JoinIndexProgramRef {
  source_path: string;
  filename?: string;
  customer?: string;
  machineCategory?: string;
  ext?: string;
  /** Coarse kind — "program" | "cad" | ... */
  kind?: string;
  /** Fine kind — "cam_project" | "g_code" | ... */
  kind3?: string;
  /** Relation label — "has_cam_project" | "has_g_code" | ... */
  relation?: string;
  /** How the program matched the print — "exact" | "loose" | ... */
  via?: string;
  customer_match?: string;
}

/**
 * match_confidence values emitted by the v6 Python join producer
 * (`scripts/docustrata/phase16-blueprint-program-join-v6.py`). A SUPERSET of
 * {@link MatchConfidence}: the v6 producer adds `"garbage"` for OCR-junk part
 * numbers (~6.6% of the real corpus — confirmed against the live join file +
 * `phase16-v6-summary.md`). `MatchConfidence` stays the 4-member union because
 * the in-process TS producer (`joinBlueprintsToPrograms`) never emits garbage —
 * only the Python v6 file does.
 */
export type V6MatchConfidence = MatchConfidence | "garbage";

/** One row of the v6 join JSONL. Superset of JoinRecord. */
export interface JoinIndexRow {
  part_number: string;
  part_number_normalized: string;
  blueprints: BlueprintRef[];
  programs: JoinIndexProgramRef[];
  match_confidence: V6MatchConfidence;
  n_programs?: number;
  print_customers?: string[];
  raw_pn_variants?: string[];
}

/** One candidate program from a training triple. */
export interface TrainingCandidateProgram {
  name: string;
  path: string;
  machine?: string;
  customer_folder?: string;
  score: number;
  reason?: string;
  program_kind?: string;
}

/** One row of training-triples-v4.jsonl — a title-block-verified print↔program triple. */
export interface TrainingTripleRow {
  print_id: string;
  print_filename: string;
  print_disk_path: string;
  tb_part_number: string | null;
  tb_drawing_number: string | null;
  tb_revision: string | null;
  tb_customer: string | null;
  tb_material: string | null;
  tb_description: string | null;
  candidate_programs: TrainingCandidateProgram[];
  candidate_cad: unknown[];
  match_confidence: number;
  has_program: boolean;
}

/** A resolved program→print link (the unit returned by printForProgram). */
export interface ProgramToPrintLink {
  program_path: string;
  part_number: string;
  part_number_normalized: string;
  /** Which corpus produced this link. */
  source: "join_v6" | "training_triple";
  /** v6 join confidence ("exact"/"loose"/...) or "triple:<numeric>" for triples. */
  match_confidence: string;
  /** Print blueprint-page doc_ids — populated from the v6 join. */
  print_doc_ids: string[];
  /** Actual print-PDF disk path — only training triples carry this. */
  print_disk_path?: string;
  /** Training-triple print id — only training triples carry this. */
  print_id?: string;
}

/** The loaded, queryable index. */
export interface JoinIndex {
  /** normalized part number → v6 join row */
  byNormalizedPN: Map<string, JoinIndexRow>;
  /** normalized program-path key → program→print links */
  byProgramPath: Map<string, ProgramToPrintLink[]>;
  /** normalized part number → training triples */
  triplesByPN: Map<string, TrainingTripleRow[]>;
  stats: {
    joinRows: number;
    /**
     * v6 join lines that were SKIPPED — over-cap, JSON-parse-fail, or
     * shape-fail. The producer (`joinBlueprintsToPrograms`) counts malformed
     * lines into its summary; the query layer carries the same signal here so
     * a half-written 60 MB JSONL doesn't load "successfully" while silently
     * dropping its truncated tail.
     */
    joinRowsMalformed: number;
    tripleRows: number;
    /** training-triple lines skipped — over-cap / parse-fail / shape-fail. */
    triplesRowsMalformed: number;
    programPaths: number;
    joinJsonlPath: string;
    triplesJsonlPath: string | null;
    joinMtimeMs: number;
    triplesMtimeMs: number;
    loadedAt: number;
  };
}

export interface ProgramForPrintResult {
  found: boolean;
  query: string;
  part_number_normalized: string;
  /**
   * Which corpora contributed:
   *   "join_v6"         — only the v6 join matched (programs[] + blueprints[] populated)
   *   "training_triple" — only a training triple matched (training_programs[] populated, programs[] EMPTY)
   *   "both"            — both matched
   *   "none"            — no match (found:false)
   * A consumer that only reads `programs[]` will see an empty array on a
   * "training_triple" hit — always check `source` and fall back to
   * `training_programs[]`.
   */
  source: "join_v6" | "training_triple" | "both" | "none";
  match_confidence: V6MatchConfidence | null;
  programs: JoinIndexProgramRef[];
  blueprints: BlueprintRef[];
  n_programs: number;
  print_customers: string[];
  /** Title-block-verified programs, if a training triple matched this PN. */
  training_programs: TrainingCandidateProgram[];
}

export interface PrintForProgramResult {
  found: boolean;
  query: string;
  program_path_key: string;
  links: ProgramToPrintLink[];
}

export interface LoadJoinIndexOptions {
  /** Path to the v6 join JSONL. Defaults to Docustrata/.index/blueprint-program-join-full-v6.jsonl. */
  joinJsonlPath?: string;
  /** Path to training-triples-v4.jsonl. Defaults to Docustrata/.index/training-triples-v4.jsonl; skipped if absent. */
  triplesJsonlPath?: string;
  /** Hard cap on a single JSONL line (bytes); over-cap lines skipped. Default 4 MiB. */
  maxLineBytes?: number;
}

const DEFAULT_JOIN_REL = "Docustrata/.index/blueprint-program-join-full-v6.jsonl";
const DEFAULT_TRIPLES_REL = "Docustrata/.index/training-triples-v4.jsonl";
const DEFAULT_MAX_QUERY_LINE_BYTES = 4 * 1024 * 1024;
/**
 * Levels to climb in {@link findRepoRoot} looking for `Docustrata/.index/`.
 * `<root>/mcp-server/src/engines/` is 3 levels; the esbuild bundle at
 * `<root>/mcp-server/dist/index.js` is 2 — 8 gives generous headroom.
 */
const MAX_REPO_ROOT_WALK_DEPTH = 8;
/**
 * The closed set of `match_confidence` values the v6 Python producer emits —
 * the 4 {@link MatchConfidence} members PLUS `"garbage"` (see
 * {@link V6MatchConfidence}). Must stay in sync with the producer: a value the
 * producer emits but this set omits would reject every such row as malformed
 * (the 2026-05-14 round-2 review caught exactly this — `"garbage"` is 6.6% of
 * the live corpus).
 */
const VALID_MATCH_CONFIDENCE: ReadonlySet<V6MatchConfidence> = new Set<V6MatchConfidence>([
  "exact",
  "loose",
  "ambiguous",
  "miss",
  "garbage",
]);

/**
 * Normalize a program file path into a stable lookup key — case-insensitive and
 * slash-agnostic so a Windows `H:\PRISM\JM DIE\...\X.MIN` reference and a
 * forward-slash form collide.
 */
export function normalizeProgramPathKey(p: string): string {
  if (typeof p !== "string") return "";
  return p.trim().replace(/\\/g, "/").toLowerCase();
}

/**
 * Walk up from this module's directory to find the PRISM repo root — the
 * directory that contains `Docustrata/.index/`. Works from both
 * `<root>/mcp-server/src/engines/` (tsx) and `<root>/mcp-server/dist/` (built).
 * Falls back to cwd, then null.
 */
function findRepoRoot(): string | null {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < MAX_REPO_ROOT_WALK_DEPTH; i++) {
    if (fs.existsSync(path.join(dir, "Docustrata", ".index"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (fs.existsSync(path.join(process.cwd(), "Docustrata", ".index"))) return process.cwd();
  return null;
}

function isJoinIndexRow(v: unknown): v is JoinIndexRow {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.part_number === "string" &&
    typeof r.part_number_normalized === "string" &&
    Array.isArray(r.blueprints) &&
    Array.isArray(r.programs) &&
    typeof r.match_confidence === "string" &&
    // The cast on the type guard claims `V6MatchConfidence` — so the guard must
    // actually verify membership, not just `typeof string`. A v6 row whose
    // producer emitted an out-of-union value genuinely does not fit JoinIndexRow
    // and is counted malformed rather than silently widened past the type.
    VALID_MATCH_CONFIDENCE.has(r.match_confidence as V6MatchConfidence)
  );
}

function isTrainingTripleRow(v: unknown): v is TrainingTripleRow {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.print_id === "string" &&
    typeof r.print_disk_path === "string" &&
    Array.isArray(r.candidate_programs)
  );
}

function pushLink(
  m: Map<string, ProgramToPrintLink[]>,
  key: string,
  link: ProgramToPrintLink,
): void {
  if (key.length === 0) return;
  const existing = m.get(key);
  if (existing) {
    // One program path can be joined by both corpora — dedup by (source, PN).
    if (
      !existing.some(
        (l) => l.source === link.source && l.part_number_normalized === link.part_number_normalized,
      )
    ) {
      existing.push(link);
    }
  } else {
    m.set(key, [link]);
  }
}

function pushTriple(
  m: Map<string, TrainingTripleRow[]>,
  key: string,
  row: TrainingTripleRow,
): void {
  const existing = m.get(key);
  if (existing) existing.push(row);
  else m.set(key, [row]);
}

/**
 * Stream a pre-built v6 join JSONL (+ optional training-triples JSONL) into an
 * in-memory {@link JoinIndex}. Lines are parsed one at a time so peak memory is
 * bounded by the largest line, not the file size — but the resulting Maps hold
 * every row. Prefer {@link getJoinIndex} for the cached singleton over calling
 * this directly per query.
 *
 * @param options - explicit JSONL paths + maxLineBytes; all default sensibly.
 * @returns the loaded, queryable JoinIndex.
 * @throws if the join JSONL cannot be found.
 */
export async function loadJoinIndex(options: LoadJoinIndexOptions = {}): Promise<JoinIndex> {
  const root = findRepoRoot();
  const joinPath =
    options.joinJsonlPath ?? (root ? path.join(root, DEFAULT_JOIN_REL) : DEFAULT_JOIN_REL);
  const triplesPath =
    options.triplesJsonlPath ?? (root ? path.join(root, DEFAULT_TRIPLES_REL) : null);
  const maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_QUERY_LINE_BYTES;

  if (!fs.existsSync(joinPath)) {
    throw new Error(
      `join JSONL not found at ${joinPath} ` +
        `(run scripts/docustrata/phase16-blueprint-program-join-v6.py to produce it)`,
    );
  }
  // Capture the join file's mtime ONCE here, right after the existsSync check —
  // not at return time. Re-statting after the whole 60 MB stream completes
  // widens the TOCTOU window (the file could vanish mid-read) and would throw
  // inside the return-object construction. The cache mtime-guard only needs the
  // value as of load start anyway.
  const joinMtimeMs = fs.statSync(joinPath).mtimeMs;

  const byNormalizedPN = new Map<string, JoinIndexRow>();
  const byProgramPath = new Map<string, ProgramToPrintLink[]>();
  const triplesByPN = new Map<string, TrainingTripleRow[]>();

  // ── Stream the v6 join ──
  // A skipped line (over-cap / parse-fail / shape-fail) is counted into
  // joinRowsMalformed — a half-written JSONL whose tail is truncated garbage
  // must not load "successfully" with the operator none the wiser.
  let joinRows = 0;
  let joinRowsMalformed = 0;
  {
    const rl = readline.createInterface({
      input: fs.createReadStream(joinPath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (line.length === 0) continue;
      if (Buffer.byteLength(line, "utf-8") > maxLineBytes) {
        joinRowsMalformed++;
        continue;
      }
      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch {
        joinRowsMalformed++;
        continue;
      }
      if (!isJoinIndexRow(row)) {
        joinRowsMalformed++;
        continue;
      }
      joinRows++;
      const norm = row.part_number_normalized || normalizePartNumber(row.part_number);
      if (norm.length === 0) continue;
      // Last-writer-wins — the v6 producer already aggregates one row per PN.
      byNormalizedPN.set(norm, row);
      for (const prog of row.programs) {
        if (typeof prog?.source_path !== "string" || prog.source_path.length === 0) continue;
        pushLink(byProgramPath, normalizeProgramPathKey(prog.source_path), {
          program_path: prog.source_path,
          part_number: row.part_number,
          part_number_normalized: norm,
          source: "join_v6",
          match_confidence: row.match_confidence,
          // `b?.doc_id` — isJoinIndexRow only checks `Array.isArray(blueprints)`,
          // not element shape, so a null/element-less blueprint must not crash
          // the .map; the type guard on .filter then drops any non-string id.
          print_doc_ids: row.blueprints
            .map((b) => b?.doc_id)
            .filter((d): d is string => typeof d === "string"),
        });
      }
    }
  }

  // FAIL-LOUD (CLAUDE.md R12): a join file that exists but yields zero valid
  // rows is corrupt / wrong-schema / half-written. A success-shaped empty index
  // makes every downstream query silently return found:false with nothing
  // telling the operator the file was bad — so throw instead.
  if (joinRows === 0) {
    throw new Error(
      `join JSONL at ${joinPath} yielded 0 valid rows ` +
        `(${joinRowsMalformed} malformed line(s) — file empty, corrupt, or wrong schema; ` +
        `re-run scripts/docustrata/phase16-blueprint-program-join-v6.py)`,
    );
  }

  // ── Stream the training triples (optional — skipped silently if absent) ──
  let tripleRows = 0;
  let triplesRowsMalformed = 0;
  let triplesMtimeMs = 0;
  const triplesResolved = triplesPath && fs.existsSync(triplesPath) ? triplesPath : null;
  if (triplesResolved) {
    triplesMtimeMs = fs.statSync(triplesResolved).mtimeMs;
    const rl = readline.createInterface({
      input: fs.createReadStream(triplesResolved, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (line.length === 0) continue;
      if (Buffer.byteLength(line, "utf-8") > maxLineBytes) {
        triplesRowsMalformed++;
        continue;
      }
      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch {
        triplesRowsMalformed++;
        continue;
      }
      if (!isTrainingTripleRow(row)) {
        triplesRowsMalformed++;
        continue;
      }
      tripleRows++;
      const pnNorm = normalizePartNumber(row.tb_part_number ?? "");
      if (pnNorm.length > 0) pushTriple(triplesByPN, pnNorm, row);
      for (const cand of row.candidate_programs) {
        if (typeof cand?.path !== "string" || cand.path.length === 0) continue;
        pushLink(byProgramPath, normalizeProgramPathKey(cand.path), {
          program_path: cand.path,
          part_number: row.tb_part_number ?? "",
          part_number_normalized: pnNorm,
          source: "training_triple",
          match_confidence: `triple:${row.match_confidence}`,
          print_doc_ids: [],
          print_disk_path: row.print_disk_path,
          print_id: row.print_id,
        });
      }
    }
  }

  return {
    byNormalizedPN,
    byProgramPath,
    triplesByPN,
    stats: {
      joinRows,
      joinRowsMalformed,
      tripleRows,
      triplesRowsMalformed,
      programPaths: byProgramPath.size,
      joinJsonlPath: joinPath,
      triplesJsonlPath: triplesResolved,
      joinMtimeMs,
      triplesMtimeMs,
      loadedAt: Date.now(),
    },
  };
}

/**
 * programForPrint — given a part number, return the programs/CAD files joined
 * to it in the v6 join, plus any title-block-verified training-triple programs
 * for the same PN. The PN is loose-normalized (op-prefix / material-code / rev
 * letter stripped) so a blueprint "2845" resolves a program "L-2845-D2.MIN".
 *
 * @param partNumber - raw part number from a print / title block.
 * @param index - a loaded JoinIndex (see {@link getJoinIndex}).
 * @returns the join row's programs + blueprints + the verified training programs.
 */
export function programForPrint(partNumber: string, index: JoinIndex): ProgramForPrintResult {
  const norm = normalizePartNumber(partNumber ?? "");
  const empty: ProgramForPrintResult = {
    found: false,
    query: partNumber ?? "",
    part_number_normalized: norm,
    source: "none",
    match_confidence: null,
    programs: [],
    blueprints: [],
    n_programs: 0,
    print_customers: [],
    training_programs: [],
  };
  if (norm.length === 0) return empty;

  const triples = index.triplesByPN.get(norm) ?? [];
  const trainingPrograms: TrainingCandidateProgram[] = [];
  for (const t of triples) {
    for (const c of t.candidate_programs) trainingPrograms.push(c);
  }

  const row = index.byNormalizedPN.get(norm);
  if (!row) {
    // No v6 join row, but a training triple may still verify programs for this PN.
    if (trainingPrograms.length === 0) return empty;
    // Full literal (not `{ ...empty, ... }`): a spread silently inherits
    // empty's defaults for any field not overridden, so a future required
    // field added to ProgramForPrintResult would compile-error on the literal
    // return below but NOT on a spread — keep both returns fully explicit.
    return {
      found: true,
      query: partNumber ?? "",
      part_number_normalized: norm,
      source: "training_triple",
      match_confidence: null,
      programs: [],
      blueprints: [],
      n_programs: 0,
      print_customers: [],
      training_programs: trainingPrograms,
    };
  }

  return {
    found: true,
    query: partNumber ?? "",
    part_number_normalized: norm,
    source: trainingPrograms.length > 0 ? "both" : "join_v6",
    match_confidence: row.match_confidence,
    // Spread-copy the Map-owned arrays: `row` lives inside the process-level
    // singleton cache, so handing out its arrays by reference would let a
    // consumer's `.sort()`/`.push()` silently corrupt the cached index for
    // every later query. (`trainingPrograms` is already a fresh array; its
    // elements are shared refs, which is fine — consumers serialize, not mutate.)
    programs: [...row.programs],
    blueprints: [...row.blueprints],
    n_programs: row.n_programs ?? row.programs.length,
    print_customers: row.print_customers ? [...row.print_customers] : [],
    training_programs: trainingPrograms,
  };
}

/**
 * printForProgram — given a program file path, return the print(s) it was
 * joined to. Resolves through BOTH corpora: the v6 join contributes blueprint
 * page doc_ids, the training triples contribute the actual print-PDF disk path
 * + print id. Path matching is case-insensitive and slash-agnostic.
 *
 * @param programPath - a program/CAD file path (any slash style, any case).
 * @param index - a loaded JoinIndex (see {@link getJoinIndex}).
 * @returns every program→print link found for the path (possibly from both corpora).
 */
export function printForProgram(programPath: string, index: JoinIndex): PrintForProgramResult {
  const key = normalizeProgramPathKey(programPath ?? "");
  // Spread-copy: `byProgramPath`'s arrays are owned by the singleton cache —
  // hand out a copy so a consumer cannot mutate the cached index.
  const links = key.length > 0 ? [...(index.byProgramPath.get(key) ?? [])] : [];
  return {
    found: links.length > 0,
    query: programPath ?? "",
    program_path_key: key,
    links,
  };
}

// ── Process-level singleton cache (mtime-guarded, single-flight) ──
let _cachedIndex: JoinIndex | null = null;
let _cacheLoad: Promise<JoinIndex> | null = null;

/**
 * Cached {@link JoinIndex} accessor. The first call streams the JSONL; later
 * calls return the cached index unless the join file's mtime changed (then it
 * reloads). Concurrent first-callers share one in-flight load (single-flight).
 *
 * Note: `options` is honored only by the caller that actually INITIATES the
 * load. A cache hit, and any concurrent caller that joins an in-flight load,
 * get the existing index regardless of the options they passed. Tests that
 * need a fresh load with different paths must call {@link clearJoinIndexCache}
 * first. The mtime guard watches the join file only; if you rebuild the triples
 * file without touching the join file, call clearJoinIndexCache() to reload.
 *
 * If the join file's mtime cannot be read on a cache hit — it vanished, or is
 * mid-atomic-rename during the weekly rebuild cron — the already-loaded index
 * is served STALE rather than nulled, so a transient rename window does not
 * turn every query into a hard error; the next call re-checks once the file
 * is back.
 */
export async function getJoinIndex(options: LoadJoinIndexOptions = {}): Promise<JoinIndex> {
  if (_cachedIndex) {
    // Capture a stable non-null reference: the `_cachedIndex = null` on the
    // mtime-changed path below would otherwise re-widen `_cachedIndex` back to
    // `JoinIndex | null` for the `catch`, so `return _cachedIndex` there would
    // not typecheck. `cached` keeps the narrowed type.
    const cached = _cachedIndex;
    try {
      const m = fs.statSync(cached.stats.joinJsonlPath).mtimeMs;
      if (m === cached.stats.joinMtimeMs) return cached;
      // mtime changed → the file was rebuilt → drop the cache and reload below.
      _cachedIndex = null;
    } catch {
      // statSync failed — file vanished or is mid-atomic-rename. The in-memory
      // index is still serviceable; serve it stale rather than forcing a hard
      // reload-error during the rename window.
      return cached;
    }
  }
  if (_cacheLoad) return _cacheLoad;
  _cacheLoad = loadJoinIndex(options)
    .then((idx) => {
      _cachedIndex = idx;
      _cacheLoad = null;
      return idx;
    })
    .catch((err) => {
      _cacheLoad = null;
      throw err;
    });
  return _cacheLoad;
}

/** Clear the singleton cache — used by tests and after a join rebuild. */
export function clearJoinIndexCache(): void {
  _cachedIndex = null;
  _cacheLoad = null;
}

/**
 * queryProgramForPrint — dispatcher-friendly one-call surface: loads (or reuses)
 * the cached {@link JoinIndex}, then runs {@link programForPrint}. Use THIS from
 * a dispatcher action — the pure `programForPrint(pn, index)` form takes a
 * JoinIndex object (not a Promise) and is for tests / batch callers that hold
 * the index across many lookups. Calling `programForPrint(pn, getJoinIndex())`
 * by mistake passes a Promise and throws at `.get` — these wrappers remove that
 * async/sync footgun.
 *
 * @param partNumber - raw part number from a print / title block.
 * @param options - optional explicit JSONL paths (see {@link LoadJoinIndexOptions});
 *   honored only if this call initiates the index load (see {@link getJoinIndex}).
 * @throws if the join JSONL cannot be loaded (missing / corrupt — fail loud).
 */
export async function queryProgramForPrint(
  partNumber: string,
  options: LoadJoinIndexOptions = {},
): Promise<ProgramForPrintResult> {
  const index = await getJoinIndex(options);
  return programForPrint(partNumber, index);
}

/**
 * queryPrintForProgram — dispatcher-friendly one-call surface: loads (or reuses)
 * the cached {@link JoinIndex}, then runs {@link printForProgram}. See
 * {@link queryProgramForPrint} for why the wrapper exists.
 *
 * @param programPath - a program/CAD file path (any slash style, any case).
 * @param options - optional explicit JSONL paths; honored only if this call
 *   initiates the index load (see {@link getJoinIndex}).
 * @throws if the join JSONL cannot be loaded (missing / corrupt — fail loud).
 */
export async function queryPrintForProgram(
  programPath: string,
  options: LoadJoinIndexOptions = {},
): Promise<PrintForProgramResult> {
  const index = await getJoinIndex(options);
  return printForProgram(programPath, index);
}

// ============================================================================
// CLASS WRAPPER (engines.md convention) + SINGLETON EXPORT
// ============================================================================

/**
 * BlueprintProgramJoinEngine — class wrapper exposing static methods so
 * call sites can use either form:
 *
 *   BlueprintProgramJoinEngine.joinBlueprintsToPrograms(...)
 *   blueprintProgramJoinEngine.joinBlueprintsToPrograms(...)
 */
export class BlueprintProgramJoinEngine {
  // ── producer (Phase 8 → join JSONL) ──
  static normalizePartNumber = normalizePartNumber;
  static extractPartNumberCandidates = extractPartNumberCandidates;
  static joinBlueprintsToPrograms = joinBlueprintsToPrograms;
  static indexProgramsFromLabels = indexProgramsFromLabels;
  static indexProgramsFromMasterIndex = indexProgramsFromMasterIndex;
  // ── query layer (load v6 join JSONL → point lookups) ──
  static normalizeProgramPathKey = normalizeProgramPathKey;
  static loadJoinIndex = loadJoinIndex;
  static getJoinIndex = getJoinIndex;
  static clearJoinIndexCache = clearJoinIndexCache;
  static programForPrint = programForPrint;
  static printForProgram = printForProgram;
  static queryProgramForPrint = queryProgramForPrint;
  static queryPrintForProgram = queryPrintForProgram;
}

export const blueprintProgramJoinEngine = {
  // producer
  normalizePartNumber,
  extractPartNumberCandidates,
  joinBlueprintsToPrograms,
  indexProgramsFromLabels,
  indexProgramsFromMasterIndex,
  // query layer
  normalizeProgramPathKey,
  loadJoinIndex,
  getJoinIndex,
  clearJoinIndexCache,
  programForPrint,
  printForProgram,
  queryProgramForPrint,
  queryPrintForProgram,
};
