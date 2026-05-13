/**
 * MillPartFamilyTemplateExtractorEngine
 * ========================================
 *
 * Reads the JM Die MILL corpus catalog (emitted by `Docustrata/.index/phase21-mill-
 * template-corpus-scan.py`) and produces per-family `MillTrainingTemplate` artifacts
 * under `mcp-server/data/training/templates/mill/<family>.json`. These templates are
 * the starting-skeleton inputs for the safety-gated emit pipeline (handled by
 * `MACRO-PROGRAM-PIPELINE-MS0`, NOT here — this engine never emits runnable G-code).
 *
 * Mirrors LathePartFamilyTemplateExtractorEngine (TRAINING-LEARNING-MS0/U1) for the
 * mill domain (U2). Key differences from the lathe sibling:
 *   - No `MacroLibraryEngine` equivalent for mill (the 4 OSP macros are lathe-only).
 *     Op-sequence + strategy seeds come from `MillingStrategyLibraryEngine` when a
 *     family maps cleanly to a feature type; otherwise empty (graceful degrade).
 *   - `controller_baseline` is always null (no anchored controller for mill).
 *   - Mill family taxonomy = 7 spec families + `unknown` fallback.
 *
 * Owns:
 *   - catalogCorpus({snapshot?, snapshotPath?})  → corpus catalog summary
 *   - extractTemplate(family, opts?)              → MillTrainingTemplate (writes <family>.json)
 *   - extractAllTemplates(opts?)                  → bulk version
 *   - listTemplates(opts?)                        → on-disk template directory listing
 *   - getTemplate(family, opts?)                  → MillTrainingTemplate | null
 *
 * Wires to (per spec MS0-U2):
 *   - prism_cam: mill_training_corpus_status / mill_training_template_match /
 *                mill_training_template_list / mill_training_template_extract_all
 *   - prism_cad: cad_mill_template_place (template-placement bridge — re-uses
 *                MacroLibraryEngine.placeMacroTemplate's file-copy mechanism, but
 *                writes a generic mill template header instead of an OSP macro one)
 *
 * Safety:
 *   - READ-ONLY against the JM Die corpus + against `Automated Program_Corrected
 *     5-25.xlsm` (the engine never opens .xlsm files at all).
 *   - NEVER emits runnable G-code. Templates are metadata; safety-gated emit lives
 *     in `MACRO-PROGRAM-PIPELINE-MS0` (S(x) ≥ 0.70 + sim + operator-in-the-loop).
 *   - Historical S/F bands intentionally OMITTED from `MillTrainingTemplate` per
 *     `feedback_box_programs_amateur` (historical S/F = DATA, not GROUND TRUTH;
 *     `SpeedFeedOrchestrator` is authoritative on disagreement).
 *
 * Reuses:
 *   - MillingStrategyLibraryEngine — for per-family feature-type → strategy seed.
 *   - phase21-mill-template-corpus-scan.py — for the corpus catalog (this engine
 *     consumes the snapshot it emits; never re-walks the filesystem).
 *   - PRISMSelfAwarenessEngine — for tribal-knowledge tips + playbook rules per family.
 *
 * @module engines/MillPartFamilyTemplateExtractorEngine
 * @milestone TRAINING-LEARNING-MS0 / MS0-U2
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { millingStrategyLibraryEngine } from "./MillingStrategyLibraryEngine.js";
import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";
import type { TribalKnowledgeEntry } from "./PRISMSelfAwarenessEngine.js";

export type { TribalKnowledgeEntry };

// ───────────────────────────────────────────────────────────────────────────────
// Family taxonomy — mirrors phase21-mill-template-corpus-scan.py rules.

/** The 8 mill template families (spec MS0-U2 list + `unknown` fallback). */
export type MillTemplateFamily =
  | "taptite-mill"
  | "electrode-mill"
  | "plate"
  | "bracket-housing"
  | "mold-die-insert"
  | "aerospace-bracket"
  | "sheet-metal-fixture"
  | "unknown";

/** Set of all family names — for runtime validation. */
export const MILL_TEMPLATE_FAMILIES: ReadonlyArray<MillTemplateFamily> = [
  "taptite-mill",
  "electrode-mill",
  "plate",
  "bracket-housing",
  "mold-die-insert",
  "aerospace-bracket",
  "sheet-metal-fixture",
  "unknown",
];

/** Per-family tribal-knowledge query terms — drives `searchTribalKnowledge()`.
 *  Generic family names don't always hit the tribal index; specific keywords do.
 *  Typed as `Record<MillTemplateFamily, string>` so adding a new family without
 *  updating the map is a compile-time error (mirrors lathe sibling P1 pattern).
 *  Empty string = skip the lookup (the `unknown` bucket has no anchor term). */
const FAMILY_TRIBAL_QUERY: Record<MillTemplateFamily, string> = {
  "taptite-mill": "taptite",
  "electrode-mill": "electrode",
  "plate": "plate flatness",
  "bracket-housing": "bracket housing",
  "mold-die-insert": "mold die insert",
  "aerospace-bracket": "aerospace bracket thin wall",
  "sheet-metal-fixture": "sheet metal fixture",
  "unknown": "",
};

/** Per-family seed feature-type — drives MillingStrategyLibraryEngine lookup. The
 *  feature-type string is sniffed against MillingStrategyLibraryEngine's
 *  `getStrategiesForFeature(featureType)`. Null = no anchored feature type
 *  (graceful degrade — emit empty op_sequence + null strategy_seed). */
const FAMILY_FEATURE_TYPE: Record<MillTemplateFamily, string | null> = {
  "taptite-mill": "hole",
  "electrode-mill": "pocket",
  "plate": "face",
  "bracket-housing": "pocket",
  "mold-die-insert": "pocket",
  "aerospace-bracket": "thin-wall",
  "sheet-metal-fixture": "slot",
  "unknown": null,
};

/** Max tribal-knowledge tips to attach per family — keeps templates compact + auditable. */
const MAX_TRIBAL_TIPS_PER_FAMILY = 10;

/** Max strategy seeds to attach per family — keeps templates compact. */
const MAX_STRATEGY_SEEDS_PER_FAMILY = 5;

const TEMPLATE_SCHEMA_VERSION = 1;
const HISTORICAL_SF_NOTE =
  "Historical Speed/Feed values from this corpus are DATA, NOT GROUND TRUTH " +
  "(feedback_box_programs_amateur). Treat as a stochastic distribution to " +
  "compare against the PRISM physics-derived recommendation " +
  "(SpeedFeedOrchestrator) — never silently override the physics. This " +
  "template intentionally does NOT carry S/F bands.";

// ───────────────────────────────────────────────────────────────────────────────
// Public types

/** The shape the phase21 corpus-scan snapshot writes. Only the fields this engine
 *  consumes are typed — additional fields are tolerated and ignored. */
export interface MillCorpusSnapshot {
  schemaVersion: number;
  generated_at: string;
  corpus_root_hint: string;
  source_index: string;
  total_mill_entries: number;
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
    }
  >;
  historical_sf_disclaimer?: string;
  warnings?: string[];
}

/** A per-family training template — metadata only, never runnable G-code. */
export interface MillTrainingTemplate {
  schemaVersion: number;
  family: MillTemplateFamily;
  generated_at: string;
  /** Always null for mill — no anchored controller (unlike lathe's OSP anchor). */
  controller_baseline: null;
  representative_parts: string[];
  customers_top: Array<{ customer: string; count: number }>;
  ext_breakdown: Record<string, number>;
  kind_breakdown: Record<string, number>;
  /** Suggested feature-type → strategy-id mapping. Empty when family has no
   *  anchored feature type or MillingStrategyLibraryEngine returned nothing. */
  strategy_seeds: Array<{
    strategy_id: string;
    name: string;
    category: string;
    feature_type: string;
  }>;
  /** Generic op-sequence ordering hint for this family — coarse-grain. */
  op_sequence: string[];
  /** Tribal-knowledge tips relevant to this family. */
  tribal_tips: TribalKnowledgeEntry[];
  /** Playbook rules relevant to this family. */
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

export interface MillCatalogResult {
  ok: true;
  total_mill_entries: number;
  total_classified_entries: number;
  classification_coverage: number;
  families: Array<{
    family: string;
    count: number;
    top_customers: Array<{ customer: string; count: number }>;
  }>;
  source_index: string;
  snapshot_generated_at: string;
}

export interface MillCatalogErrorResult {
  ok: false;
  error:
    | "snapshot_not_found"
    | "snapshot_unreadable"
    | "snapshot_malformed_json"
    | "snapshot_missing_families"
    | "snapshot_wrong_schema";
  detail?: string;
}

export interface MillExtractResult {
  ok: true;
  family: MillTemplateFamily;
  template: MillTrainingTemplate;
  written_to: string | null;
}

export interface MillExtractErrorResult {
  ok: false;
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

export interface MillExtractAllResult {
  ok: true;
  extracted: Array<{ family: MillTemplateFamily; written_to: string | null }>;
  skipped: Array<{ family: string; reason: string }>;
}

export interface MillTemplateListEntry {
  family: MillTemplateFamily;
  path: string;
  size_bytes: number;
  modified_at: string;
}

export interface MillTemplateListResult {
  ok: true;
  dir: string;
  templates: MillTemplateListEntry[];
}

// ───────────────────────────────────────────────────────────────────────────────
// Path helpers (env-overridable for testing).

/** The default snapshot path. `PRISM_MILL_CORPUS_SNAPSHOT` overrides. */
export function defaultMillSnapshotPath(): string {
  if (process.env.PRISM_MILL_CORPUS_SNAPSHOT) {
    return process.env.PRISM_MILL_CORPUS_SNAPSHOT;
  }
  const candidates = [
    path.resolve(__dirname, "../../data/training/templates/mill/_corpus-scan.json"),
    path.resolve(__dirname, "../../../mcp-server/data/training/templates/mill/_corpus-scan.json"),
    path.resolve(process.cwd(), "mcp-server/data/training/templates/mill/_corpus-scan.json"),
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

/** The default template output directory. `PRISM_MILL_TEMPLATE_DIR` overrides. */
export function defaultMillTemplateDir(): string {
  if (process.env.PRISM_MILL_TEMPLATE_DIR) {
    return process.env.PRISM_MILL_TEMPLATE_DIR;
  }
  const candidates = [
    path.resolve(__dirname, "../../data/training/templates/mill"),
    path.resolve(__dirname, "../../../mcp-server/data/training/templates/mill"),
    path.resolve(process.cwd(), "mcp-server/data/training/templates/mill"),
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

function isMillTemplateFamily(s: string): s is MillTemplateFamily {
  return (MILL_TEMPLATE_FAMILIES as ReadonlyArray<string>).includes(s);
}

/** JSON.parse reviver that strips __proto__ keys to prevent prototype pollution
 *  from malicious snapshot payloads (mirrors lathe sibling P1 hardening). */
function safeJsonParse(raw: string): unknown {
  return JSON.parse(raw, (key, value) => (key === "__proto__" ? undefined : value));
}

function loadSnapshot(snapshotPath: string): MillCorpusSnapshot | MillCatalogErrorResult {
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
  return parsed as MillCorpusSnapshot;
}

/** Seed the op_sequence + strategy_seeds for a family from
 *  MillingStrategyLibraryEngine.getStrategiesForFeature(). Graceful degrade
 *  to empty arrays when the family has no anchored feature type or the
 *  library returns nothing. */
function seedStrategiesFor(family: MillTemplateFamily): {
  op_sequence: string[];
  strategy_seeds: MillTrainingTemplate["strategy_seeds"];
} {
  const featureType = FAMILY_FEATURE_TYPE[family];
  if (!featureType) {
    return { op_sequence: [], strategy_seeds: [] };
  }
  try {
    // MillingStrategyLibraryEngine.getStrategiesForFeature takes FeatureType union
    // — we pass a string cast since our family→feature map may evolve faster than
    // the library's union type. Failures (typing or runtime) degrade gracefully.
    const strategies = (millingStrategyLibraryEngine as unknown as {
      getStrategiesForFeature(t: string): Array<{
        id: string;
        name: string;
        category: string;
      }>;
    }).getStrategiesForFeature(featureType);
    if (!Array.isArray(strategies) || strategies.length === 0) {
      return { op_sequence: [], strategy_seeds: [] };
    }
    const seeds = strategies.slice(0, MAX_STRATEGY_SEEDS_PER_FAMILY).map((s) => ({
      strategy_id: s.id,
      name: s.name,
      category: s.category,
      feature_type: featureType,
    }));
    // Op sequence is a coarse-grain ordering hint — first strategy's category is the
    // headline op type; we follow with generic mill ordering (rough → finish).
    const op_sequence =
      seeds.length > 0 ? [seeds[0].category, "finish", "deburr"] : [];
    return { op_sequence, strategy_seeds: seeds };
  } catch (err) {
    if (process.env.PRISM_MILL_TEMPLATE_DEBUG) {
      // Console used here intentionally: this is an engine-level debug breadcrumb
      // gated behind PRISM_MILL_TEMPLATE_DEBUG; project logger is over-heavy for the
      // graceful-degrade path.
      // eslint-disable-next-line no-console
      console.error(
        `[MillPartFamilyTemplateExtractorEngine] strategy seed lookup failed for ${family}: ${(err as Error)?.message ?? err}`
      );
    }
    return { op_sequence: [], strategy_seeds: [] };
  }
}

async function tribalLookup(
  family: MillTemplateFamily
): Promise<{ tips: TribalKnowledgeEntry[]; rules: string[] }> {
  const query = FAMILY_TRIBAL_QUERY[family];
  if (!query) return { tips: [], rules: [] };
  try {
    const tipsArr = await prismSelfAwarenessEngine.searchTribalKnowledge(query);
    const tips = tipsArr.slice(0, MAX_TRIBAL_TIPS_PER_FAMILY);
    const rulesArr = await prismSelfAwarenessEngine.searchPlaybookRules(query);
    const rulesEntries = rulesArr.slice(0, MAX_TRIBAL_TIPS_PER_FAMILY);
    const rules = rulesEntries.map((r: string | { rule?: string; text?: string }) =>
      typeof r === "string" ? r : r.rule ?? r.text ?? JSON.stringify(r)
    );
    return { tips, rules };
  } catch (err) {
    if (process.env.PRISM_MILL_TEMPLATE_DEBUG) {
      // Console used here intentionally: this is an engine-level debug breadcrumb
      // gated behind PRISM_MILL_TEMPLATE_DEBUG; project logger is over-heavy for the
      // graceful-degrade path.
      // eslint-disable-next-line no-console
      console.error(
        `[MillPartFamilyTemplateExtractorEngine] tribal lookup failed for ${family}: ${(err as Error)?.message ?? err}`
      );
    }
    return { tips: [], rules: [] };
  }
}

function topCustomers(
  customers: Record<string, number>,
  limit = 10
): Array<{ customer: string; count: number }> {
  return Object.entries(customers)
    .map(([customer, count]) => ({ customer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Resolve outDir under a base; reject paths that escape the base (mirrors lathe P1). */
function resolveSafeOutDir(baseDir: string, requestedSubpath?: string): string | null {
  if (!requestedSubpath) return baseDir;
  const resolved = path.resolve(baseDir, requestedSubpath);
  // Cross-platform containment check: resolved must equal or live under baseDir.
  const rel = path.relative(baseDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return resolved;
}

// ───────────────────────────────────────────────────────────────────────────────
// Engine class

export interface CatalogOpts {
  snapshot?: MillCorpusSnapshot;
  snapshotPath?: string;
}

export interface ExtractOpts {
  snapshot?: MillCorpusSnapshot;
  snapshotPath?: string;
  outDir?: string;
  dryRun?: boolean;
}

export interface ListOpts {
  outDir?: string;
}

/**
 * Mill domain template extractor — mirror of LathePartFamilyTemplateExtractorEngine.
 * READ-ONLY against corpus; never emits G-code.
 */
export class MillPartFamilyTemplateExtractorEngine {
  /** Catalog the corpus — returns per-family counts + coverage. */
  catalogCorpus(opts: CatalogOpts = {}): MillCatalogResult | MillCatalogErrorResult {
    const snap = opts.snapshot ?? loadSnapshot(opts.snapshotPath ?? defaultMillSnapshotPath());
    if (!("schemaVersion" in snap) && (snap as MillCatalogErrorResult).ok === false) {
      return snap as MillCatalogErrorResult;
    }
    const s = snap as MillCorpusSnapshot;
    const families = Object.entries(s.families).map(([family, rec]) => ({
      family,
      count: rec.count,
      top_customers: topCustomers(rec.customers ?? {}, 5),
    }));
    return {
      ok: true,
      total_mill_entries: s.total_mill_entries,
      total_classified_entries: s.total_classified_entries,
      classification_coverage: s.classification_coverage,
      families,
      source_index: s.source_index,
      snapshot_generated_at: s.generated_at,
    };
  }

  /** Build a single-family template — optionally writes <family>.json. */
  async extractTemplate(
    family: string,
    opts: ExtractOpts = {}
  ): Promise<MillExtractResult | MillExtractErrorResult> {
    if (!isMillTemplateFamily(family)) {
      return { ok: false, error: "unknown_family", family, detail: `unknown family: ${family}` };
    }
    const snap = opts.snapshot ?? loadSnapshot(opts.snapshotPath ?? defaultMillSnapshotPath());
    if (!("schemaVersion" in snap) && (snap as MillCatalogErrorResult).ok === false) {
      const err = snap as MillCatalogErrorResult;
      return { ok: false, error: err.error, family, detail: err.detail };
    }
    const s = snap as MillCorpusSnapshot;
    const rec = s.families[family];
    if (!rec) {
      return {
        ok: false,
        error: "family_not_in_snapshot",
        family,
        detail: `family "${family}" has no entries in snapshot`,
      };
    }
    const { op_sequence, strategy_seeds } = seedStrategiesFor(family);
    const { tips, rules } = await tribalLookup(family);
    const template: MillTrainingTemplate = {
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      family,
      generated_at: new Date().toISOString(),
      controller_baseline: null,
      representative_parts: (rec.sample_paths ?? []).slice(0, 5),
      customers_top: topCustomers(rec.customers ?? {}, 10),
      ext_breakdown: { ...(rec.ext_breakdown ?? {}) },
      kind_breakdown: { ...(rec.kind_breakdown ?? {}) },
      strategy_seeds,
      op_sequence,
      tribal_tips: tips,
      playbook_rules: rules,
      variability: { cycle_time_sec: null, dim_cpk: null, tool_life_min: null },
      run_count: rec.count,
      sx_score_distribution: null,
      classification_coverage_at_extract: s.classification_coverage,
      source_index: s.source_index,
      total_corpus_count: s.total_mill_entries,
      historical_sf_note: HISTORICAL_SF_NOTE,
      notes: [],
    };

    if (opts.dryRun) {
      return { ok: true, family, template, written_to: null };
    }

    const baseDir = opts.outDir ?? defaultMillTemplateDir();
    // Containment check: we always write directly into baseDir, no subpath traversal.
    const resolvedDir = resolveSafeOutDir(baseDir, undefined);
    if (!resolvedDir) {
      return { ok: false, error: "outdir_escape", family, detail: baseDir };
    }

    try {
      fs.mkdirSync(resolvedDir, { recursive: true });
      const outFile = path.join(resolvedDir, `${family}.json`);
      fs.writeFileSync(outFile, JSON.stringify(template, null, 2) + "\n", "utf8");
      return { ok: true, family, template, written_to: outFile };
    } catch (e) {
      return {
        ok: false,
        error: "write_failed",
        family,
        detail: String((e as Error)?.message ?? e),
      };
    }
  }

  /** Extract every family present in the snapshot. */
  async extractAllTemplates(
    opts: ExtractOpts = {}
  ): Promise<MillExtractAllResult | MillExtractErrorResult> {
    const snap = opts.snapshot ?? loadSnapshot(opts.snapshotPath ?? defaultMillSnapshotPath());
    if (!("schemaVersion" in snap) && (snap as MillCatalogErrorResult).ok === false) {
      const err = snap as MillCatalogErrorResult;
      return { ok: false, error: err.error, detail: err.detail };
    }
    const s = snap as MillCorpusSnapshot;
    const extracted: Array<{ family: MillTemplateFamily; written_to: string | null }> = [];
    const skipped: Array<{ family: string; reason: string }> = [];
    for (const family of Object.keys(s.families)) {
      const res = await this.extractTemplate(family, { ...opts, snapshot: s });
      if (res.ok) {
        extracted.push({ family: res.family, written_to: res.written_to });
      } else {
        skipped.push({ family, reason: res.error });
      }
    }
    return { ok: true, extracted, skipped };
  }

  /** List all on-disk templates with sizes + mtimes. */
  listTemplates(opts: ListOpts = {}): MillTemplateListResult {
    const dir = opts.outDir ?? defaultMillTemplateDir();
    if (!fs.existsSync(dir)) return { ok: true, dir, templates: [] };
    const entries: MillTemplateListEntry[] = [];
    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch {
      return { ok: true, dir, templates: [] };
    }
    for (const f of files) {
      if (!f.endsWith(".json") || f.startsWith("_")) continue;
      const stem = f.replace(/\.json$/, "");
      if (!isMillTemplateFamily(stem)) continue;
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        entries.push({
          family: stem,
          path: full,
          size_bytes: stat.size,
          modified_at: new Date(stat.mtimeMs).toISOString(),
        });
      } catch {
        /* skip unreadable */
      }
    }
    entries.sort((a, b) => a.family.localeCompare(b.family));
    return { ok: true, dir, templates: entries };
  }

  /** Read a single on-disk template back into memory (null if missing/unreadable). */
  getTemplate(family: string, opts: ListOpts = {}): MillTrainingTemplate | null {
    if (!isMillTemplateFamily(family)) return null;
    const dir = opts.outDir ?? defaultMillTemplateDir();
    const file = path.join(dir, `${family}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = safeJsonParse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as MillTrainingTemplate;
    } catch {
      return null;
    }
  }
}

export const millPartFamilyTemplateExtractorEngine = new MillPartFamilyTemplateExtractorEngine();
