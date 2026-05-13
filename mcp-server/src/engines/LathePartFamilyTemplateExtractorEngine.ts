/**
 * LathePartFamilyTemplateExtractorEngine
 * ========================================
 *
 * Reads the JM Die lathe corpus catalog (emitted by `Docustrata/.index/phase20-lathe-
 * template-corpus-scan.py`) and produces per-family `TrainingTemplate` artifacts under
 * `mcp-server/data/training/templates/lathe/<family>.json`. These templates are the
 * starting-skeleton inputs for the safety-gated emit pipeline (handled by
 * `MACRO-PROGRAM-PIPELINE-MS0`, NOT here — this engine never emits runnable G-code).
 *
 * Owns (per spec H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md, MS0-U1):
 *   - catalogCorpus({snapshot?, snapshotPath?})         → corpus catalog summary
 *   - extractTemplate(family, opts?)                     → TrainingTemplate (and writes <family>.json)
 *   - extractAllTemplates(opts?)                         → bulk version
 *   - listTemplates(opts?)                               → list of family names with mtimes
 *   - getTemplate(family, opts?)                         → TrainingTemplate | null
 *
 * Wires to (per spec line 57):
 *   - prism_turning: lathe_training_corpus_status / lathe_training_template_list / lathe_training_template_match
 *   - prism_cad:     cad_lathe_template_place (template-placement uses the macro path → re-uses
 *                    MacroLibraryEngine.placeMacroTemplate via its prism_cad:macro_place_template action)
 *
 * Safety:
 *   - READ-ONLY against the JM Die corpus + against `Automated Program_Corrected 5-25.xlsm`
 *     (the engine never opens .xlsm files at all).
 *   - NEVER emits runnable G-code. Templates are metadata; the safety-gated emit lives in
 *     `MACRO-PROGRAM-PIPELINE-MS0` (S(x) ≥ 0.70 + sim + operator-in-the-loop).
 *   - Historical S/F bands are intentionally OMITTED from `TrainingTemplate` per
 *     `feedback_box_programs_amateur` (historical S/F is DATA, NOT GROUND TRUTH —
 *     `SpeedFeedOrchestrator` is authoritative on disagreement).
 *
 * Reuses:
 *   - MacroLibraryEngine — for the 4 OSP-anchored families' seed op-sequence + VC-var schema
 *     (wafer-insert / casing / casing-counterbore / top-hat-casing).
 *   - phase20-lathe-template-corpus-scan.py — for the corpus catalog (this engine consumes
 *     the snapshot it emits; never re-walks the filesystem).
 *
 * @module engines/LathePartFamilyTemplateExtractorEngine
 * @milestone TRAINING-LEARNING-MS0 / MS0-U1
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { macroLibraryEngine } from "./MacroLibraryEngine.js";
import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";
import type { TribalKnowledgeEntry } from "./PRISMSelfAwarenessEngine.js";

export type { TribalKnowledgeEntry };

/** Per-family tribal-knowledge query terms — drives `searchTribalKnowledge()`. Generic family
 *  names (e.g. `"casing-counterbore"`) don't match well against the tribal index — we map each
 *  family to a domain-appropriate query keyword(s) that historically surface relevant tips.
 *  Empty string = skip the lookup (e.g. the `unknown` bucket has no anchored search term).
 *  Typed as `Record<LatheTemplateFamily, string>` so adding a new family without updating the
 *  map is a compile-time error (P1 fix per Reviewer A — silent enrichment loss otherwise). */
const FAMILY_TRIBAL_QUERY: Record<LatheTemplateFamily, string> = {
  "wafer-insert": "wafer insert",
  "casing": "casing",
  "casing-counterbore": "counterbore",
  "top-hat-casing": "top hat flange",
  "shaft": "shaft turning",
  "flange": "flange",
  "bushing": "bushing thin wall",
  "tube": "tube hollow",
  "taptite-blank": "taptite",
  "nut-blank": "nut blank",
  "electrode-rod-blank": "electrode",
  "unknown": "",
};

/** Max tribal-knowledge tips to attach per family — keeps templates compact + auditable. */
const MAX_TRIBAL_TIPS_PER_FAMILY = 10;

// ───────────────────────────────────────────────────────────────────────────────
// Family taxonomy — mirrors phase20-lathe-template-corpus-scan.py rules.

/** The 12 families this engine knows about — extends MacroLibraryEngine's 4 OSP-anchored
 *  families with the spec line 60 expansion families + `unknown` fallback. */
export type LatheTemplateFamily =
  | "wafer-insert"
  | "casing"
  | "casing-counterbore"
  | "top-hat-casing"
  | "shaft"
  | "flange"
  | "bushing"
  | "tube"
  | "taptite-blank"
  | "nut-blank"
  | "electrode-rod-blank"
  | "unknown";

/** Set of all family names — for runtime validation. */
export const LATHE_TEMPLATE_FAMILIES: ReadonlyArray<LatheTemplateFamily> = [
  "wafer-insert",
  "casing",
  "casing-counterbore",
  "top-hat-casing",
  "shaft",
  "flange",
  "bushing",
  "tube",
  "taptite-blank",
  "nut-blank",
  "electrode-rod-blank",
  "unknown",
];

/** The 4 MacroLibraryEngine-anchored families. Used to decide whether `op_sequence`,
 *  `tool_list`, and `vc_var_schema` should be seeded from MacroLibraryEngine output. */
const OSP_ANCHORED_FAMILIES: ReadonlySet<LatheTemplateFamily> = new Set([
  "wafer-insert",
  "casing",
  "casing-counterbore",
  "top-hat-casing",
]);

const TEMPLATE_SCHEMA_VERSION = 1;
const HISTORICAL_SF_NOTE =
  "Historical Speed/Feed values from this corpus are DATA, NOT GROUND TRUTH " +
  "(feedback_box_programs_amateur). Treat as a stochastic distribution to " +
  "compare against the PRISM physics-derived recommendation " +
  "(SpeedFeedOrchestrator) — never silently override the physics. This " +
  "template intentionally does NOT carry S/F bands.";

// ───────────────────────────────────────────────────────────────────────────────
// Public types

/** The shape the phase20 corpus-scan snapshot writes. Only the fields this engine
 *  consumes are typed — additional fields are tolerated and ignored. */
export interface CorpusSnapshot {
  schemaVersion: number;
  generated_at: string;
  corpus_root_hint: string;
  source_index: string;
  total_lathe_entries: number;
  total_classified_entries: number;
  classification_coverage: number;
  families: Record<
    string,
    {
      count: number;
      customers: Record<string, number>;
      ext_breakdown: Record<string, number>;
      kind_breakdown: Record<string, number>;
      sample_paths: string[];
      seed_macros: string[];
    }
  >;
  historical_sf_disclaimer?: string;
  warnings?: string[];
}

export interface TrainingTemplate {
  schemaVersion: number;
  family: LatheTemplateFamily;
  generated_at: string;
  controller_baseline: "okuma_osp" | null;
  seed_macros: string[];
  representative_parts: string[];
  customers_top: Array<{ customer: string; count: number }>;
  ext_breakdown: Record<string, number>;
  kind_breakdown: Record<string, number>;
  op_sequence: string[];
  vc_var_schema: Record<
    string,
    { initialValue?: number; formula?: string; comment?: string; category: string }
  > | null;
  /** Placeholder list of macro VC variables whose category appears tool-related — best-effort
   *  filter over `vc_var_schema` (NOT authoritative tool extraction). Real tool list comes
   *  from MACRO-PROGRAM-PIPELINE-MS0's safety-gated emit. Empty for non-OSP-anchored
   *  families. Field name renamed from `tool_list` to make placeholder semantics explicit. */
  tool_variables_placeholder: string[];
  /** Tribal-knowledge tips relevant to this family — pulled via
   *  `PRISMSelfAwarenessEngine.searchTribalKnowledge(FAMILY_TRIBAL_QUERY[family])`.
   *  Empty array if family has no anchored search term or tribal index unavailable. */
  tribal_tips: TribalKnowledgeEntry[];
  /** Playbook rules relevant to this family — derived from the same tribal lookup via
   *  `PRISMSelfAwarenessEngine.searchPlaybookRules()`. Distinct surface from `tribal_tips`
   *  (which carries full TribalKnowledgeEntry objects) so consumers can render rules + tips
   *  separately. */
  playbook_rules: string[];
  variability: {
    cycle_time_sec: null;
    dim_cpk: null;
    tool_life_min: null;
  };
  run_count: number;
  sx_score_distribution: null;
  classification_coverage_at_extract: number;
  source_index: string;
  total_corpus_count: number;
  historical_sf_note: string;
  notes: string[];
}

export interface CatalogResult {
  ok: true;
  total_lathe_entries: number;
  total_classified_entries: number;
  classification_coverage: number;
  families: Array<{
    family: string;
    count: number;
    top_customers: Array<{ customer: string; count: number }>;
    seed_macros: string[];
  }>;
  source_index: string;
  snapshot_generated_at: string;
}

export interface CatalogErrorResult {
  ok: false;
  error:
    | "snapshot_not_found"
    | "snapshot_unreadable"
    | "snapshot_malformed_json"
    | "snapshot_missing_families"
    | "snapshot_wrong_schema";
  detail?: string;
}

export interface ExtractResult {
  ok: true;
  family: LatheTemplateFamily;
  template: TrainingTemplate;
  written_to: string | null; // null in dry-run; absolute path on real write
}

export interface ExtractErrorResult {
  ok: false;
  /** Discriminated error token. Pass-2 fix per Reviewer B P1-1: widened to surface
   *  every distinct failure path from `loadSnapshot` (was previously collapsing
   *  unreadable/missing-families/wrong-schema into the generic malformed_json bucket,
   *  which misled operator triage). */
  error:
    | "unknown_family"
    | "family_not_in_snapshot"
    | "snapshot_not_found"
    | "snapshot_unreadable"
    | "snapshot_malformed_json"
    | "snapshot_missing_families"
    | "snapshot_wrong_schema"
    | "write_failed"
    | "outdir_escape";
  family?: string;
  detail?: string;
}

export interface ExtractAllResult {
  ok: true;
  extracted: Array<{ family: LatheTemplateFamily; written_to: string | null }>;
  skipped: Array<{ family: string; reason: string }>;
}

export interface TemplateListEntry {
  family: LatheTemplateFamily;
  path: string;
  size_bytes: number;
  modified_at: string;
}

export interface TemplateListResult {
  ok: true;
  dir: string;
  templates: TemplateListEntry[];
}

// ───────────────────────────────────────────────────────────────────────────────
// Path helpers (env-overridable for testing).

/** The default snapshot path. `PRISM_LATHE_CORPUS_SNAPSHOT` overrides. */
export function defaultSnapshotPath(): string {
  if (process.env.PRISM_LATHE_CORPUS_SNAPSHOT) {
    return process.env.PRISM_LATHE_CORPUS_SNAPSHOT;
  }
  // Resolve relative to this file's expected location under dist/ or src/.
  const candidates = [
    path.resolve(__dirname, "../../data/training/templates/lathe/_corpus-scan.json"),
    path.resolve(__dirname, "../../../mcp-server/data/training/templates/lathe/_corpus-scan.json"),
    path.resolve(process.cwd(), "mcp-server/data/training/templates/lathe/_corpus-scan.json"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return candidates[0];
}

/** The default template output directory. `PRISM_LATHE_TEMPLATE_DIR` overrides. */
export function defaultTemplateDir(): string {
  if (process.env.PRISM_LATHE_TEMPLATE_DIR) {
    return process.env.PRISM_LATHE_TEMPLATE_DIR;
  }
  const candidates = [
    path.resolve(__dirname, "../../data/training/templates/lathe"),
    path.resolve(__dirname, "../../../mcp-server/data/training/templates/lathe"),
    path.resolve(process.cwd(), "mcp-server/data/training/templates/lathe"),
  ];
  for (const c of candidates) {
    try {
      const stat = fs.statSync(c);
      if (stat.isDirectory()) return c;
    } catch {
      /* ignore */
    }
  }
  return candidates[0];
}

// ───────────────────────────────────────────────────────────────────────────────
// Internal helpers.

function isLatheTemplateFamily(s: string): s is LatheTemplateFamily {
  return (LATHE_TEMPLATE_FAMILIES as ReadonlyArray<string>).includes(s);
}

/** JSON.parse reviver that strips __proto__ keys to prevent prototype pollution
 *  from malicious snapshot/template payloads (P1 fix per Reviewer B P1-3). Internal
 *  files are trusted today, but the engine is wired into a multi-tenant runtime where
 *  the input set will grow — cheap defense is warranted. */
function safeJsonParse(raw: string): unknown {
  return JSON.parse(raw, (key, value) => (key === "__proto__" ? undefined : value));
}

function loadSnapshot(snapshotPath: string): CorpusSnapshot | CatalogErrorResult {
  if (!fs.existsSync(snapshotPath)) {
    return { ok: false, error: "snapshot_not_found", detail: snapshotPath };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(snapshotPath, "utf8");
  } catch (e) {
    return { ok: false, error: "snapshot_unreadable", detail: String((e as Error)?.message ?? e) };
  }
  let parsed: unknown;
  try {
    parsed = safeJsonParse(raw);
  } catch (e) {
    return {
      ok: false,
      error: "snapshot_malformed_json",
      detail: String((e as Error)?.message ?? e),
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "snapshot_malformed_json", detail: "root not an object" };
  }
  const ps = parsed as Record<string, unknown>;
  if (!ps.families || typeof ps.families !== "object" || Array.isArray(ps.families)) {
    return { ok: false, error: "snapshot_missing_families" };
  }
  if (typeof ps.schemaVersion !== "number") {
    return { ok: false, error: "snapshot_wrong_schema", detail: "schemaVersion must be number" };
  }
  // Tolerant cast — only the fields we use are validated above.
  return parsed as CorpusSnapshot;
}

function seedOpSequenceFor(family: LatheTemplateFamily): {
  op_sequence: string[];
  tool_variables_placeholder: string[];
  vc_var_schema: TrainingTemplate["vc_var_schema"];
  controller_baseline: "okuma_osp" | null;
} {
  if (!OSP_ANCHORED_FAMILIES.has(family)) {
    return {
      op_sequence: [],
      tool_variables_placeholder: [],
      vc_var_schema: null,
      controller_baseline: null,
    };
  }
  // Ask MacroLibraryEngine for the AST of this family's anchor macro. P0 fix per Reviewer B:
  // `macroLibraryEngine.listMacros()` returns `{macros, dir}` (see MacroLibraryEngine.ts:229),
  // NOT a flat array. Calling `.find()` directly on it threw TypeError which the surrounding
  // try/catch silently swallowed — meaning every OSP-anchored family quietly emitted empty
  // seeds. Destructure to `summaries` to fix.
  // P1 fix per Reviewer B: surface unexpected errors via console.error rather than fully
  // silent — graceful degradation should be distinguishable from real bugs. We only catch
  // here because MacroLibraryEngine's underlying file-system reads CAN legitimately fail
  // when the macro directory is missing (acceptable degradation path).
  // P1-B comment per Reviewer A: when MacroLibraryEngine surfaces `available: false`, the
  // `.find(...)` predicate matches no entry → falls to the !summary branch below → returns
  // controller_baseline: "okuma_osp" with empty seeds. This is intentional graceful degrade.
  try {
    const { macros: summaries } = macroLibraryEngine.listMacros();
    const summary = summaries.find((s) => s.family === family && s.available);
    if (!summary || !summary.ast) {
      // Family is OSP-anchored but no AST available (macro file missing or unparseable).
      return {
        op_sequence: [],
        tool_variables_placeholder: [],
        vc_var_schema: null,
        controller_baseline: "okuma_osp",
      };
    }
    const ast = summary.ast;
    return {
      op_sequence: Array.isArray(ast.operationSequence) ? ast.operationSequence.slice() : [],
      // Placeholder — surfaces VC variables whose category text mentions tool semantics.
      // The category vocabulary comes from MacroProgramIntelligenceEngine; this regex is a
      // best-effort filter, NOT authoritative tool extraction. Real tool extraction lands
      // in MACRO-PROGRAM-PIPELINE-MS0. Field is named `tool_variables_placeholder` (renamed
      // from `tool_list` per Reviewer B P1-5) so consumers can't mistake it for ground truth.
      tool_variables_placeholder: Object.entries(ast.variables || {})
        .filter(([, v]) => /^tool|^t_|tool/i.test(String(v?.category ?? "")))
        .map(([k]) => k),
      vc_var_schema: ast.variables ?? null,
      controller_baseline: "okuma_osp",
    };
  } catch (e) {
    // Log unexpected errors — distinguish "library returned bad shape / threw" from the
    // expected graceful-degrade case (missing macro dir, which MacroLibraryEngine handles
    // internally without throwing).
    console.error(
      `[LathePartFamilyTemplateExtractorEngine] seedOpSequenceFor(${family}) threw — ` +
        `degrading to empty seeds. Error: ${(e as Error)?.message ?? e}`,
    );
    return {
      op_sequence: [],
      tool_variables_placeholder: [],
      vc_var_schema: null,
      controller_baseline: "okuma_osp",
    };
  }
}

/** Fetch tribal-knowledge tips + playbook rules for a family. Async because
 *  `PRISMSelfAwarenessEngine.searchTribalKnowledge` is async. Returns `{tips:[], rules:[]}`
 *  when the family has no anchored query term, the tribal registry isn't present, or the
 *  search throws — never propagates exceptions. Capped at MAX_TRIBAL_TIPS_PER_FAMILY. */
async function fetchTribalContext(
  family: LatheTemplateFamily,
): Promise<{ tips: TribalKnowledgeEntry[]; rules: string[] }> {
  const query = FAMILY_TRIBAL_QUERY[family];
  if (!query) return { tips: [], rules: [] };
  try {
    const [tips, rules] = await Promise.all([
      prismSelfAwarenessEngine.searchTribalKnowledge(query),
      prismSelfAwarenessEngine.searchPlaybookRules(query),
    ]);
    return {
      tips: (tips ?? []).slice(0, MAX_TRIBAL_TIPS_PER_FAMILY),
      rules: (rules ?? []).slice(0, MAX_TRIBAL_TIPS_PER_FAMILY),
    };
  } catch {
    return { tips: [], rules: [] };
  }
}

async function buildTemplate(
  family: LatheTemplateFamily,
  snapshot: CorpusSnapshot,
): Promise<TrainingTemplate> {
  const famRec = snapshot.families[family];
  const customers_top = famRec
    ? Object.entries(famRec.customers ?? {})
        .map(([customer, count]) => ({ customer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];
  const seed = seedOpSequenceFor(family);
  const tribal = await fetchTribalContext(family);
  return {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    family,
    generated_at: new Date().toISOString(),
    controller_baseline: seed.controller_baseline,
    seed_macros: famRec?.seed_macros ? famRec.seed_macros.slice() : [],
    representative_parts: famRec?.sample_paths ? famRec.sample_paths.slice() : [],
    customers_top,
    ext_breakdown: famRec?.ext_breakdown ? { ...famRec.ext_breakdown } : {},
    kind_breakdown: famRec?.kind_breakdown ? { ...famRec.kind_breakdown } : {},
    op_sequence: seed.op_sequence,
    tool_variables_placeholder: seed.tool_variables_placeholder,
    vc_var_schema: seed.vc_var_schema,
    tribal_tips: tribal.tips,
    playbook_rules: tribal.rules,
    variability: {
      cycle_time_sec: null,
      dim_cpk: null,
      tool_life_min: null,
    },
    run_count: famRec?.count ?? 0,
    sx_score_distribution: null,
    classification_coverage_at_extract: snapshot.classification_coverage,
    source_index: snapshot.source_index,
    total_corpus_count: snapshot.total_lathe_entries,
    historical_sf_note: HISTORICAL_SF_NOTE,
    notes: famRec ? [] : ["family_absent_from_snapshot — template emits with empty corpus data"],
  };
}

function atomicWriteJson(targetPath: string, obj: unknown): string {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmpPath, targetPath);
  return targetPath;
}

// ───────────────────────────────────────────────────────────────────────────────
// Public engine.

export class LathePartFamilyTemplateExtractorEngine {
  /** Read the corpus snapshot and return a compact summary. Accepts an in-memory
   *  snapshot for tests, or reads from disk via `snapshotPath`. Returns either
   *  a `CatalogResult` (ok=true) or a `CatalogErrorResult` (ok=false) — never throws. */
  catalogCorpus(
    opts: { snapshot?: CorpusSnapshot; snapshotPath?: string } = {},
  ): CatalogResult | CatalogErrorResult {
    const snap = opts.snapshot ?? this._loadSnapshotOrError(opts.snapshotPath);
    if (!("families" in snap)) return snap; // CatalogErrorResult
    const families = Object.entries(snap.families)
      .map(([family, rec]) => ({
        family,
        count: rec.count,
        top_customers: Object.entries(rec.customers ?? {})
          .map(([customer, count]) => ({ customer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        seed_macros: rec.seed_macros ?? [],
      }))
      .sort((a, b) => b.count - a.count);
    return {
      ok: true,
      total_lathe_entries: snap.total_lathe_entries,
      total_classified_entries: snap.total_classified_entries,
      classification_coverage: snap.classification_coverage,
      families,
      source_index: snap.source_index,
      snapshot_generated_at: snap.generated_at,
    };
  }

  /** Extract a single family's template. By default writes to
   *  `<defaultTemplateDir>/<family>.json`; `dryRun: true` skips the write. Async because
   *  the tribal-knowledge enrichment via PRISMSelfAwarenessEngine is async. */
  async extractTemplate(
    family: string,
    opts: {
      snapshot?: CorpusSnapshot;
      snapshotPath?: string;
      outDir?: string;
      dryRun?: boolean;
    } = {},
  ): Promise<ExtractResult | ExtractErrorResult> {
    if (!isLatheTemplateFamily(family)) {
      return { ok: false, error: "unknown_family", family };
    }
    const snap = opts.snapshot ?? this._loadSnapshotOrError(opts.snapshotPath);
    if (!("families" in snap)) {
      // Propagate the original error token (P1 fix per Reviewer B P1-1 — was collapsing
      // every failure into snapshot_malformed_json which misled operator triage).
      return {
        ok: false,
        error: snap.error,
        detail: snap.detail,
      };
    }
    if (!(family in snap.families)) {
      return { ok: false, error: "family_not_in_snapshot", family };
    }
    const template = await buildTemplate(family, snap);
    if (opts.dryRun) {
      return { ok: true, family, template, written_to: null };
    }
    const dir = opts.outDir ?? defaultTemplateDir();
    // SECURITY: path-traversal guard (P1 fix per Reviewer B P1-2). When a caller supplies
    // `outDir`, refuse to write outside the resolved-default template directory unless the
    // caller explicitly opts out via the env knob. In-process callers are trusted today,
    // but a future MCP dispatcher action could inadvertently wire user-supplied paths.
    if (opts.outDir && !process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED) {
      const resolvedDir = path.resolve(dir);
      const resolvedDefault = path.resolve(defaultTemplateDir());
      if (!resolvedDir.startsWith(resolvedDefault)) {
        return {
          ok: false,
          error: "outdir_escape",
          family,
          detail: `opts.outDir resolves outside ${resolvedDefault} — set PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED=1 to override`,
        };
      }
    }
    const target = path.join(dir, `${family}.json`);
    let written: string;
    try {
      written = atomicWriteJson(target, template);
    } catch (e) {
      return { ok: false, error: "write_failed", family, detail: String((e as Error)?.message ?? e) };
    }
    return { ok: true, family, template, written_to: written };
  }

  /** Extract templates for every family present in the snapshot. Returns
   *  per-family success/skip rows so the caller can audit coverage. */
  async extractAllTemplates(
    opts: {
      snapshot?: CorpusSnapshot;
      snapshotPath?: string;
      outDir?: string;
      dryRun?: boolean;
    } = {},
  ): Promise<ExtractAllResult | ExtractErrorResult> {
    const snap = opts.snapshot ?? this._loadSnapshotOrError(opts.snapshotPath);
    if (!("families" in snap)) {
      // Propagate the original error token (P1 fix per Reviewer B P1-1).
      return {
        ok: false,
        error: snap.error,
        detail: snap.detail,
      };
    }
    const extracted: Array<{ family: LatheTemplateFamily; written_to: string | null }> = [];
    const skipped: Array<{ family: string; reason: string }> = [];
    for (const famKey of Object.keys(snap.families)) {
      if (!isLatheTemplateFamily(famKey)) {
        skipped.push({ family: famKey, reason: "unknown_family" });
        continue;
      }
      const r = await this.extractTemplate(famKey, { ...opts, snapshot: snap });
      if (r.ok) {
        extracted.push({ family: r.family, written_to: r.written_to });
      } else {
        skipped.push({ family: famKey, reason: r.error });
      }
    }
    return { ok: true, extracted, skipped };
  }

  /** List `<family>.json` templates already on disk in the template directory.
   *  Files starting with `_` (e.g. the corpus-scan snapshot, .gitkeep) are excluded. */
  listTemplates(opts: { dir?: string } = {}): TemplateListResult {
    const dir = opts.dir ?? defaultTemplateDir();
    const templates: TemplateListEntry[] = [];
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return { ok: true, dir, templates: [] };
    }
    for (const name of entries) {
      if (!name.endsWith(".json") || name.startsWith("_") || name.startsWith(".")) continue;
      const stem = name.slice(0, -".json".length);
      if (!isLatheTemplateFamily(stem)) continue;
      const full = path.join(dir, name);
      try {
        const stat = fs.statSync(full);
        templates.push({
          family: stem,
          path: full,
          size_bytes: stat.size,
          modified_at: new Date(stat.mtimeMs).toISOString(),
        });
      } catch {
        /* skip unreadable entries — never throw from a listing call */
      }
    }
    templates.sort((a, b) => a.family.localeCompare(b.family));
    return { ok: true, dir, templates };
  }

  /** Read one `<family>.json` template back. Returns `null` if missing or unreadable. */
  getTemplate(family: string, opts: { dir?: string } = {}): TrainingTemplate | null {
    if (!isLatheTemplateFamily(family)) return null;
    const dir = opts.dir ?? defaultTemplateDir();
    const target = path.join(dir, `${family}.json`);
    if (!fs.existsSync(target)) return null;
    try {
      const raw = fs.readFileSync(target, "utf8");
      // Use the same proto-stripping reviver (P1 fix per Reviewer B P1-3).
      const parsed = safeJsonParse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      // Schema check (tolerant — additive fields are accepted).
      if (typeof (parsed as Record<string, unknown>).schemaVersion !== "number") return null;
      if ((parsed as Record<string, unknown>).family !== family) return null;
      return parsed as TrainingTemplate;
    } catch {
      return null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internals exposed for testability (prefixed `_`; not part of public API).

  /** @internal */
  _loadSnapshotOrError(snapshotPath?: string): CorpusSnapshot | CatalogErrorResult {
    return loadSnapshot(snapshotPath ?? defaultSnapshotPath());
  }

  /** @internal */
  async _buildTemplate(family: LatheTemplateFamily, snapshot: CorpusSnapshot): Promise<TrainingTemplate> {
    return buildTemplate(family, snapshot);
  }

  /** @internal — exposed for tests so they can drive the tribal-context fetcher independently. */
  async _fetchTribalContext(family: LatheTemplateFamily): Promise<{ tips: TribalKnowledgeEntry[]; rules: string[] }> {
    return fetchTribalContext(family);
  }
}

export const lathePartFamilyTemplateExtractorEngine = new LathePartFamilyTemplateExtractorEngine();
