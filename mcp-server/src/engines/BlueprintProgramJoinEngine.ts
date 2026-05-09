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
import * as readline from "node:readline";

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

export type MatchConfidence = "exact" | "loose" | "miss";

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
 *   exact — at least one candidate hit on the program side equals
 *           the blueprint candidate exactly (post-normalization).
 *   loose — at least one program hit on the loose-normalized form
 *           (material/rev stripped) but no exact hit.
 *   miss  — no program file matched any candidate.
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

  const summary: JoinSummary = {
    blueprint_pages_total: 0,
    blueprint_pages_with_part_number: 0,
    blueprint_pages_malformed: 0,
    unique_part_numbers: 0,
    joins_exact: 0,
    joins_loose: 0,
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
  static normalizePartNumber = normalizePartNumber;
  static extractPartNumberCandidates = extractPartNumberCandidates;
  static joinBlueprintsToPrograms = joinBlueprintsToPrograms;
  static indexProgramsFromLabels = indexProgramsFromLabels;
  static indexProgramsFromMasterIndex = indexProgramsFromMasterIndex;
}

export const blueprintProgramJoinEngine = {
  normalizePartNumber,
  extractPartNumberCandidates,
  joinBlueprintsToPrograms,
  indexProgramsFromLabels,
  indexProgramsFromMasterIndex,
};
