/**
 * WEDMPartFamilyTemplateExtractorEngine
 * ========================================
 *
 * Reads the JM Die WEDM (Wire EDM) corpus catalog (emitted by `Docustrata/.index/
 * phaseXX-wedm-template-corpus-scan.py` — pending; engine handles missing snapshot
 * gracefully) and produces per-family `WEDMTrainingTemplate` artifacts under
 * `mcp-server/data/training/templates/wedm/<family>.json`. These templates are
 * the starting-skeleton inputs for the safety-gated emit pipeline (handled by
 * `MACRO-PROGRAM-PIPELINE-MS0`, NOT here — this engine never emits runnable
 * G-code or runnable WEDM dialect output).
 *
 * Mirrors LathePartFamilyTemplateExtractorEngine (U-TL-U1) +
 * MillPartFamilyTemplateExtractorEngine (U-TL-U2) for the wire-EDM domain (U4).
 * Key differences from the lathe/mill siblings:
 *   - No MacroLibraryEngine equivalent (lathe's 4 OSP macros are turning-only).
 *     The taptite-electrode family has a companion bridge engine
 *     (`TaptiteElectrodeMacroBridgeEngine`) that links extracted templates to
 *     downstream macro fill — out of scope for this engine.
 *   - `controller_baseline` is always null (no anchored controller; WEDM dialects
 *     are post-processor concerns handled by master-post + dialect resolution).
 *   - Strategy seeds carry concrete pulse params (on_time, peak_current,
 *     gap_voltage) sourced from WEDMStrategyLibraryEngine's
 *     `WEDM_CUTTING_STRATEGIES` table — unlike mill's feature-type-only seeds.
 *     This is because WEDM strategies ARE the pass schedule (rough → skim_1 →
 *     skim_2 → ...), whereas mill strategies are feature-type alternatives.
 *   - WEDM family taxonomy = 6 spec families + `unknown` fallback.
 *
 * Owns (per spec U-TL-U4):
 *   - catalogCorpus({snapshot?, snapshotPath?})  → corpus catalog summary
 *   - extractTemplate(family, opts?)              → WEDMTrainingTemplate (writes <family>.json)
 *   - extractAllTemplates(opts?)                  → bulk version
 *   - listTemplates(opts?)                        → on-disk template directory listing
 *   - getTemplate(family, opts?)                  → WEDMTrainingTemplate | null
 *
 * Wires to (per pattern lathe→prism_turning / mill→prism_cam; WEDM→prism_edm):
 *   - prism_edm: wedm_training_corpus_status / wedm_training_template_match /
 *                wedm_training_template_list / wedm_training_template_extract_all
 *
 * Safety (SAFETY-CRITICAL READ-ONLY):
 *   - READ-ONLY against the JM Die corpus + against `Automated Program_Corrected
 *     5-25.xlsm` (the engine never opens .xlsm files at all).
 *   - NEVER emits runnable G-code or WEDM controller dialect. Templates are
 *     metadata; safety-gated emit lives in `MACRO-PROGRAM-PIPELINE-MS0` (S(x) ≥
 *     0.70 + sim + operator-in-the-loop).
 *   - Historical pulse parameters from the corpus are intentionally OMITTED from
 *     `WEDMTrainingTemplate` per `feedback_box_programs_amateur` (historical
 *     pulse values = DATA, not GROUND TRUTH; `WEDMStrategyLibraryEngine` is
 *     authoritative on disagreement).
 *   - Snapshot loader uses prototype-pollution-safe JSON.parse reviver.
 *   - outDir resolution rejects paths that escape the base directory.
 *
 * Reuses:
 *   - WEDMStrategyLibraryEngine — for per-family pass-schedule strategy seeds.
 *   - PRISMSelfAwarenessEngine — for tribal-knowledge tips + playbook rules.
 *
 * Snapshot lifecycle:
 *   The corpus scanner that produces `_corpus-scan.json` is a separate
 *   Docustrata Python script (out of scope for this engine). When missing, this
 *   engine returns `{ok: false, error: "snapshot_not_found"}` rather than
 *   throwing — callers can then trigger the scan or surface the error.
 *
 * @module engines/WEDMPartFamilyTemplateExtractorEngine
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U4
 * @safety SAFETY-CRITICAL READ-ONLY
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import {
  WEDM_CUTTING_STRATEGIES,
  type WEDMCuttingStrategy,
} from "./WEDMStrategyLibraryEngine.js";
import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";
import type { TribalKnowledgeEntry } from "./PRISMSelfAwarenessEngine.js";
import { log } from "../utils/Logger.js";

export type { TribalKnowledgeEntry };

// ───────────────────────────────────────────────────────────────────────────────
// Family taxonomy — 6 spec families + `unknown` fallback (U-TL-U4 spec).

/** The 7 WEDM template families (6 spec families + `unknown` fallback). */
export type WEDMTemplateFamily =
  | "taptite-electrode"
  | "carbide-die-insert"
  | "punch-die"
  | "pcd-tipped-tooling"
  | "aerospace-fir-tree"
  | "mold-insert"
  | "unknown";

/** Set of all family names — for runtime validation. */
export const WEDM_TEMPLATE_FAMILIES: ReadonlyArray<WEDMTemplateFamily> = [
  "taptite-electrode",
  "carbide-die-insert",
  "punch-die",
  "pcd-tipped-tooling",
  "aerospace-fir-tree",
  "mold-insert",
  "unknown",
];

/** Per-family tribal-knowledge query terms — drives `searchTribalKnowledge()`.
 *  Generic family names don't always hit the tribal index; specific keywords do.
 *  Typed as `Record<WEDMTemplateFamily, string>` so adding a new family without
 *  updating the map is a compile-time error (mirrors lathe/mill P1 hardening).
 *  Empty string = skip the lookup (the `unknown` bucket has no anchor term). */
const FAMILY_TRIBAL_QUERY: Record<WEDMTemplateFamily, string> = {
  "taptite-electrode": "taptite electrode",
  "carbide-die-insert": "carbide die wire edm",
  "punch-die": "punch die tool steel",
  "pcd-tipped-tooling": "pcd diamond wire edm",
  "aerospace-fir-tree": "fir tree aerospace inconel",
  "mold-insert": "mold insert wire edm",
  "unknown": "",
};

/** Per-family canonical pass schedule — ordered list of `WEDM_CUTTING_STRATEGIES`
 *  IDs that form the typical rough→skim cascade for that family. Different from
 *  mill's feature-type lookup: WEDM strategies are the pass schedule itself, not
 *  feature-type alternatives. Empty = no anchored schedule (graceful degrade). */
const FAMILY_STRATEGY_IDS: Record<WEDMTemplateFamily, ReadonlyArray<string>> = {
  // Taptite electrodes (copper/graphite for sinker EDM cavity forming) need fine
  // finish (Ra ≤ 0.4 µm) — full 4-pass cascade including skim_3.
  "taptite-electrode": ["rough_cut", "skim_1", "skim_2", "skim_3"],
  // Carbide is conductive but slow — standard 3-pass tool-steel-like schedule
  // with reduced energy on rough.
  "carbide-die-insert": ["rough_cut", "skim_1", "skim_2"],
  // Standard tool-steel punch/die — 3-pass schedule covers ±0.005 mm tolerance.
  "punch-die": ["rough_cut", "skim_1", "skim_2"],
  // PCD-tipped tooling needs ultra-precision finish on the substrate carrier —
  // full 4-pass including skim_3 for Ra ≤ 0.4 µm.
  "pcd-tipped-tooling": ["rough_cut", "skim_1", "skim_2", "skim_3"],
  // Inconel/titanium fir-tree blade roots — 3-pass; flushing-sensitive but no
  // extra finish pass typically needed.
  "aerospace-fir-tree": ["rough_cut", "skim_1", "skim_2"],
  // Mold insert tool steel — 3-pass standard.
  "mold-insert": ["rough_cut", "skim_1", "skim_2"],
  // No anchored schedule for the unknown bucket.
  "unknown": [],
};

/** Per-family default material class — used to look up `material_suitability`
 *  entries inside each `WEDMCuttingStrategy`. Null = no anchored material class
 *  (graceful degrade to first material_suitability entry). */
const FAMILY_MATERIAL_CLASS: Record<WEDMTemplateFamily, string | null> = {
  "taptite-electrode": "copper", // copper or graphite — copper has explicit WEDM data
  "carbide-die-insert": "carbide",
  "punch-die": "tool_steel",
  "pcd-tipped-tooling": "carbide", // PCD substrate is tungsten carbide
  "aerospace-fir-tree": "inconel", // nickel superalloy fir-tree blade roots
  "mold-insert": "tool_steel",
  "unknown": null,
};

/** Max tribal-knowledge tips to attach per family — keeps templates compact + auditable. */
const MAX_TRIBAL_TIPS_PER_FAMILY = 10;

const TEMPLATE_SCHEMA_VERSION = 1;
const HISTORICAL_PULSE_NOTE =
  "Historical pulse parameters (on_time/off_time/peak_current/gap_voltage) " +
  "from the WEDM corpus are DATA, NOT GROUND TRUTH (feedback_box_programs_" +
  "amateur). Treat as a stochastic distribution to compare against the PRISM " +
  "physics-derived recommendation (WEDMStrategyLibraryEngine) — never silently " +
  "override the strategy library. This template intentionally does NOT carry " +
  "historical pulse band bounds.";

// ───────────────────────────────────────────────────────────────────────────────
// Public types.

/** Shape the WEDM corpus-scan snapshot writes. Only the fields this engine
 *  consumes are typed — additional fields are tolerated and ignored. */
export interface WEDMCorpusSnapshot {
  schemaVersion: number;
  generated_at: string;
  corpus_root_hint: string;
  source_index: string;
  total_wedm_entries: number;
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

/** A per-family strategy seed — extracted from `WEDM_CUTTING_STRATEGIES` and
 *  hydrated with the material-specific speed/power factors when an anchored
 *  material class exists for the family. */
export interface WEDMStrategySeed {
  /** Strategy ID from `WEDM_CUTTING_STRATEGIES` (e.g., "rough_cut", "skim_1"). */
  strategy_id: string;
  /** Human-readable strategy name. */
  name: string;
  /** Strategy functional category. */
  category: string;
  /** Pulse on-time in microseconds (from typical_params). */
  on_time_us: number;
  /** Peak current in amperes (from typical_params). */
  peak_current_A: number;
  /** Gap voltage in volts (from typical_params). */
  gap_voltage_V: number;
  /** Wire tension in newtons (from typical_params). */
  wire_tension_N: number;
  /** Material suitability rating [0..1] for the family's default material class.
   *  Null when family has no anchored material class or the class is not present
   *  in this strategy's suitability table. */
  material_suitability: number | null;
}

/** A per-family WEDM training template — metadata only, never runnable code. */
export interface WEDMTrainingTemplate {
  schemaVersion: number;
  family: WEDMTemplateFamily;
  generated_at: string;
  /** Always null for WEDM — no anchored controller (post-processor concern). */
  controller_baseline: null;
  /** Default material class for this family (e.g., "tool_steel", "carbide").
   *  Null when family has no anchored material class. */
  material_class: string | null;
  /** Sample part paths from the corpus (up to 5). */
  representative_parts: string[];
  /** Top customers by program count (up to 10). */
  customers_top: Array<{ customer: string; count: number }>;
  /** File extension breakdown — pulled verbatim from the snapshot. */
  ext_breakdown: Record<string, number>;
  /** "kind" breakdown (e.g., punch/die/electrode classification) — pulled
   *  verbatim from the snapshot. */
  kind_breakdown: Record<string, number>;
  /** Ordered pass schedule — rough → skim_1 → skim_2 → [skim_3]. Each seed
   *  carries concrete pulse params from `WEDM_CUTTING_STRATEGIES`. Empty when
   *  family has no anchored schedule. */
  pass_schedule_seed: WEDMStrategySeed[];
  /** Coarse-grain op-sequence ordering — derived from `pass_schedule_seed`
   *  (strategy categories in order). Empty when seed is empty. */
  op_sequence: string[];
  /** Tribal-knowledge tips relevant to this family. */
  tribal_tips: TribalKnowledgeEntry[];
  /** Playbook rules relevant to this family. */
  playbook_rules: string[];
  /** Variability placeholders — populated by downstream MACRO-PROGRAM-PIPELINE
   *  emit telemetry, NOT this engine. */
  variability: {
    cycle_time_sec: null;
    dim_cpk: null;
    wire_life_min: null;
  };
  /** Total programs in this family within the corpus. */
  run_count: number;
  /** Reserved for downstream S(x) histogram — null at extract time. */
  sx_score_distribution: null;
  /** Classification coverage at the time of extract (audit field). */
  classification_coverage_at_extract: number;
  /** Source index file (e.g., the phaseXX scanner output path). */
  source_index: string;
  /** Total corpus count (all families, classified + unclassified). */
  total_corpus_count: number;
  /** Standard historical-pulse disclaimer (see HISTORICAL_PULSE_NOTE). */
  historical_pulse_note: string;
  /** Free-form notes for downstream readers. */
  notes: string[];
}

export interface WEDMCatalogResult {
  ok: true;
  total_wedm_entries: number;
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

export interface WEDMCatalogErrorResult {
  ok: false;
  error:
    | "snapshot_not_found"
    | "snapshot_unreadable"
    | "snapshot_malformed_json"
    | "snapshot_missing_families"
    | "snapshot_wrong_schema";
  detail?: string;
}

export interface WEDMExtractResult {
  ok: true;
  family: WEDMTemplateFamily;
  template: WEDMTrainingTemplate;
  written_to: string | null;
}

export interface WEDMExtractErrorResult {
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

export interface WEDMExtractAllResult {
  ok: true;
  extracted: Array<{ family: WEDMTemplateFamily; written_to: string | null }>;
  skipped: Array<{ family: string; reason: string }>;
}

export interface WEDMTemplateListEntry {
  family: WEDMTemplateFamily;
  path: string;
  size_bytes: number;
  modified_at: string;
}

export interface WEDMTemplateListResult {
  ok: true;
  dir: string;
  templates: WEDMTemplateListEntry[];
}

// ───────────────────────────────────────────────────────────────────────────────
// Path helpers (env-overridable for testing).

/** The default snapshot path. `PRISM_WEDM_CORPUS_SNAPSHOT` overrides. */
export function defaultWEDMSnapshotPath(): string {
  if (process.env.PRISM_WEDM_CORPUS_SNAPSHOT) {
    return process.env.PRISM_WEDM_CORPUS_SNAPSHOT;
  }
  const candidates = [
    path.resolve(__dirname, "../../data/training/templates/wedm/_corpus-scan.json"),
    path.resolve(__dirname, "../../../mcp-server/data/training/templates/wedm/_corpus-scan.json"),
    path.resolve(process.cwd(), "mcp-server/data/training/templates/wedm/_corpus-scan.json"),
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

/** The default template output directory. `PRISM_WEDM_TEMPLATE_DIR` overrides. */
export function defaultWEDMTemplateDir(): string {
  if (process.env.PRISM_WEDM_TEMPLATE_DIR) {
    return process.env.PRISM_WEDM_TEMPLATE_DIR;
  }
  const candidates = [
    path.resolve(__dirname, "../../data/training/templates/wedm"),
    path.resolve(__dirname, "../../../mcp-server/data/training/templates/wedm"),
    path.resolve(process.cwd(), "mcp-server/data/training/templates/wedm"),
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

function isWEDMTemplateFamily(s: string): s is WEDMTemplateFamily {
  return (WEDM_TEMPLATE_FAMILIES as ReadonlyArray<string>).includes(s);
}

/** JSON.parse reviver that strips __proto__ keys to prevent prototype pollution
 *  from malicious snapshot payloads (mirrors lathe/mill sibling P1 hardening).
 *  Snapshot input is trusted today, but the engine is wired into a multi-tenant
 *  runtime where the input set will grow — cheap defense is warranted. */
function safeJsonParse(raw: string): unknown {
  return JSON.parse(raw, (key, value) => (key === "__proto__" ? undefined : value));
}

function loadSnapshot(snapshotPath: string): WEDMCorpusSnapshot | WEDMCatalogErrorResult {
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
  return parsed as WEDMCorpusSnapshot;
}

/** Look up a strategy by ID from `WEDM_CUTTING_STRATEGIES`. Returns null if the
 *  ID is missing (defensive — the canonical strategy list could evolve). */
function findStrategyById(id: string): WEDMCuttingStrategy | null {
  for (const s of WEDM_CUTTING_STRATEGIES) {
    if (s.id === id) return s;
  }
  return null;
}

/** Seed the pass schedule for a family from `FAMILY_STRATEGY_IDS` +
 *  `WEDM_CUTTING_STRATEGIES`. Graceful degrade to empty arrays when the family
 *  has no anchored schedule or a referenced strategy ID has been removed from
 *  the canonical table. Material suitability is hydrated from the family's
 *  default material class when present. */
function seedScheduleFor(family: WEDMTemplateFamily): {
  pass_schedule_seed: WEDMStrategySeed[];
  op_sequence: string[];
  material_class: string | null;
} {
  const ids = FAMILY_STRATEGY_IDS[family];
  const materialClass = FAMILY_MATERIAL_CLASS[family];
  if (!ids || ids.length === 0) {
    return { pass_schedule_seed: [], op_sequence: [], material_class: materialClass };
  }
  const seeds: WEDMStrategySeed[] = [];
  for (const id of ids) {
    const strat = findStrategyById(id);
    if (!strat) continue; // canonical strategy table changed — skip silently
    let suitability: number | null = null;
    if (materialClass) {
      const m = strat.material_suitability.find(
        (e) => e.material_type === materialClass
      );
      suitability = m ? m.suitability : null;
    }
    seeds.push({
      strategy_id: strat.id,
      name: strat.name,
      category: strat.category,
      on_time_us: strat.typical_params.on_time_us,
      peak_current_A: strat.typical_params.peak_current_A,
      gap_voltage_V: strat.typical_params.gap_voltage_V,
      wire_tension_N: strat.typical_params.wire_tension_N,
      material_suitability: suitability,
    });
  }
  return {
    pass_schedule_seed: seeds,
    op_sequence: seeds.map((s) => s.category),
    material_class: materialClass,
  };
}

async function tribalLookup(
  family: WEDMTemplateFamily
): Promise<{ tips: TribalKnowledgeEntry[]; rules: string[] }> {
  const query = FAMILY_TRIBAL_QUERY[family];
  if (!query) return { tips: [], rules: [] };
  try {
    // Reviewer-B P1 hardening: Array.isArray() guard before `.slice()` so that
    // upstream shape drift (null on no-match, undefined, scalar) doesn't throw
    // synchronously and burn the catch frame. log.warn on unexpected shape so
    // contract drift surfaces in runtime logs (not only when DEBUG env is set).
    const tipsArr = await prismSelfAwarenessEngine.searchTribalKnowledge(query);
    const tips = Array.isArray(tipsArr)
      ? tipsArr.slice(0, MAX_TRIBAL_TIPS_PER_FAMILY)
      : ((): TribalKnowledgeEntry[] => {
          log.warn(
            `[WEDMPartFamilyTemplateExtractorEngine] tribal lookup returned non-array for ${family} (got ${typeof tipsArr})`
          );
          return [];
        })();
    const rulesArr = await prismSelfAwarenessEngine.searchPlaybookRules(query);
    const rulesEntries = Array.isArray(rulesArr)
      ? rulesArr.slice(0, MAX_TRIBAL_TIPS_PER_FAMILY)
      : ((): unknown[] => {
          log.warn(
            `[WEDMPartFamilyTemplateExtractorEngine] playbook lookup returned non-array for ${family} (got ${typeof rulesArr})`
          );
          return [];
        })();
    const rules = rulesEntries.map((r: unknown) => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object") {
        const o = r as { rule?: unknown; text?: unknown };
        if (typeof o.rule === "string") return o.rule;
        if (typeof o.text === "string") return o.text;
      }
      return JSON.stringify(r);
    });
    return { tips, rules };
  } catch (err) {
    if (process.env.PRISM_WEDM_TEMPLATE_DEBUG) {
      // Console used here intentionally: this is an engine-level debug breadcrumb
      // gated behind PRISM_WEDM_TEMPLATE_DEBUG; project logger is over-heavy for the
      // graceful-degrade path.
      // eslint-disable-next-line no-console
      console.error(
        `[WEDMPartFamilyTemplateExtractorEngine] tribal lookup failed for ${family}: ${(err as Error)?.message ?? err}`
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

/** Resolve outDir under a base; reject paths that escape the base (mirrors
 *  lathe/mill P1 hardening). */
function resolveSafeOutDir(baseDir: string, requestedSubpath?: string): string | null {
  if (!requestedSubpath) return baseDir;
  const resolved = path.resolve(baseDir, requestedSubpath);
  const rel = path.relative(baseDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return resolved;
}

// ───────────────────────────────────────────────────────────────────────────────
// Engine class.

export interface CatalogOpts {
  snapshot?: WEDMCorpusSnapshot;
  snapshotPath?: string;
}

export interface ExtractOpts {
  snapshot?: WEDMCorpusSnapshot;
  snapshotPath?: string;
  outDir?: string;
  dryRun?: boolean;
}

export interface ListOpts {
  outDir?: string;
}

/**
 * WEDM domain template extractor — mirror of MillPartFamilyTemplateExtractorEngine
 * for the wire-EDM domain. READ-ONLY against corpus; never emits G-code or
 * controller dialect output.
 */
export class WEDMPartFamilyTemplateExtractorEngine {
  /** Catalog the corpus — returns per-family counts + coverage. */
  catalogCorpus(opts: CatalogOpts = {}): WEDMCatalogResult | WEDMCatalogErrorResult {
    const snap = opts.snapshot ?? loadSnapshot(opts.snapshotPath ?? defaultWEDMSnapshotPath());
    if (!("schemaVersion" in snap) && (snap as WEDMCatalogErrorResult).ok === false) {
      return snap as WEDMCatalogErrorResult;
    }
    const s = snap as WEDMCorpusSnapshot;
    const families = Object.entries(s.families).map(([family, rec]) => ({
      family,
      count: rec.count,
      top_customers: topCustomers(rec.customers ?? {}, 5),
    }));
    return {
      ok: true,
      total_wedm_entries: s.total_wedm_entries,
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
  ): Promise<WEDMExtractResult | WEDMExtractErrorResult> {
    if (!isWEDMTemplateFamily(family)) {
      return { ok: false, error: "unknown_family", family, detail: `unknown family: ${family}` };
    }
    const snap = opts.snapshot ?? loadSnapshot(opts.snapshotPath ?? defaultWEDMSnapshotPath());
    if (!("schemaVersion" in snap) && (snap as WEDMCatalogErrorResult).ok === false) {
      const err = snap as WEDMCatalogErrorResult;
      return { ok: false, error: err.error, family, detail: err.detail };
    }
    const s = snap as WEDMCorpusSnapshot;
    const rec = s.families[family];
    if (!rec) {
      return {
        ok: false,
        error: "family_not_in_snapshot",
        family,
        detail: `family "${family}" has no entries in snapshot`,
      };
    }
    const { pass_schedule_seed, op_sequence, material_class } = seedScheduleFor(family);
    const { tips, rules } = await tribalLookup(family);
    const template: WEDMTrainingTemplate = {
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      family,
      generated_at: new Date().toISOString(),
      controller_baseline: null,
      material_class,
      representative_parts: (rec.sample_paths ?? []).slice(0, 5),
      customers_top: topCustomers(rec.customers ?? {}, 10),
      ext_breakdown: { ...(rec.ext_breakdown ?? {}) },
      kind_breakdown: { ...(rec.kind_breakdown ?? {}) },
      pass_schedule_seed,
      op_sequence,
      tribal_tips: tips,
      playbook_rules: rules,
      variability: { cycle_time_sec: null, dim_cpk: null, wire_life_min: null },
      run_count: rec.count,
      sx_score_distribution: null,
      classification_coverage_at_extract: s.classification_coverage,
      source_index: s.source_index,
      total_corpus_count: s.total_wedm_entries,
      historical_pulse_note: HISTORICAL_PULSE_NOTE,
      notes: [],
    };

    if (opts.dryRun) {
      return { ok: true, family, template, written_to: null };
    }

    const baseDir = opts.outDir ?? defaultWEDMTemplateDir();
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
  ): Promise<WEDMExtractAllResult | WEDMExtractErrorResult> {
    const snap = opts.snapshot ?? loadSnapshot(opts.snapshotPath ?? defaultWEDMSnapshotPath());
    if (!("schemaVersion" in snap) && (snap as WEDMCatalogErrorResult).ok === false) {
      const err = snap as WEDMCatalogErrorResult;
      return { ok: false, error: err.error, detail: err.detail };
    }
    const s = snap as WEDMCorpusSnapshot;
    const extracted: Array<{ family: WEDMTemplateFamily; written_to: string | null }> = [];
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
  listTemplates(opts: ListOpts = {}): WEDMTemplateListResult {
    const dir = opts.outDir ?? defaultWEDMTemplateDir();
    if (!fs.existsSync(dir)) return { ok: true, dir, templates: [] };
    const entries: WEDMTemplateListEntry[] = [];
    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch {
      return { ok: true, dir, templates: [] };
    }
    for (const f of files) {
      if (!f.endsWith(".json") || f.startsWith("_")) continue;
      const stem = f.replace(/\.json$/, "");
      if (!isWEDMTemplateFamily(stem)) continue;
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
  getTemplate(family: string, opts: ListOpts = {}): WEDMTrainingTemplate | null {
    if (!isWEDMTemplateFamily(family)) return null;
    const dir = opts.outDir ?? defaultWEDMTemplateDir();
    const file = path.join(dir, `${family}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = safeJsonParse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as WEDMTrainingTemplate;
    } catch {
      return null;
    }
  }
}

export const wedmPartFamilyTemplateExtractorEngine = new WEDMPartFamilyTemplateExtractorEngine();
