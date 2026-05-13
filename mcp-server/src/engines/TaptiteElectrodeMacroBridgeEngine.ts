/**
 * TaptiteElectrodeMacroBridgeEngine
 * ========================================
 *
 * Bridges a WEDM `taptite-electrode` family template (produced by
 * `WEDMPartFamilyTemplateExtractorEngine` — TRAINING-LEARNING-MS0/U-TL-U4)
 * into the macro-fill layer consumed by `MacroFillOrchestratorEngine`
 * (MACRO-PROGRAM-PIPELINE-MS0/U2, downstream). This engine is the **sidecar
 * to engine 1** in U-TL-U4 — engine 1 extracts the family template; this
 * engine projects the `taptite-electrode` template into a VC-variable schema
 * + a labelled template placeholder ready for safety-gated emit.
 *
 * Owns (3 methods, all SAFETY-CRITICAL READ-ONLY against the upstream template):
 *   - bridge(template)                      → TaptiteElectrodeMacroBridgeResult
 *   - listRequiredVariables(template?)      → list of canonical taptite-electrode VC vars
 *   - placeLabelledTemplate({bridge, ...})  → writes _MACRO-TEMPLATE_<id>.min placeholder
 *                                              (NEVER runnable — header carries DO-NOT-RUN
 *                                              warning per MacroLibraryEngine convention).
 *
 * Wires to (per pattern; lathe MacroLibraryEngine wires to prism_cad + prism_turning;
 * this is the WEDM analog so wires to prism_edm):
 *   - prism_edm: wedm_taptite_macro_bridge / wedm_taptite_macro_variables /
 *                wedm_taptite_macro_place_template
 *
 * Safety (SAFETY-CRITICAL READ-ONLY):
 *   - NEVER emits runnable G-code or WEDM controller dialect.
 *   - The single fs.write call (placeLabelledTemplate) always prefixes the
 *     output filename with `_MACRO-TEMPLATE_` and embeds a DO-NOT-RUN-AS-IS
 *     header — so the file is NEVER mistaken for a runnable program.
 *   - Rejects out-of-base outDir paths to prevent traversal.
 *   - Refuses to overwrite an existing file (idempotency guard — operator
 *     must explicitly delete or use a different partFolderPath).
 *   - Bridges material_class through verbatim — never lowers the per-pass
 *     suitability bar without operator review.
 *
 * Reuses:
 *   - WEDMPartFamilyTemplateExtractorEngine (the `taptite-electrode`
 *     `WEDMTrainingTemplate` is this engine's INPUT contract; never imported
 *     directly to keep the bridge engine pure / synchronously testable).
 *
 * Why a separate engine (not folded into engine 1):
 *   - U-TL-U4 spec lists two engines explicitly. The extractor is generic
 *     across all 6 WEDM families; the bridge is taptite-electrode-specific.
 *     Keeping them separate avoids family-conditional logic in the extractor
 *     and gives MACRO-PROGRAM-PIPELINE-MS0 a clean import surface.
 *   - The bridge engine never depends on a corpus snapshot — it only
 *     consumes the extractor's output type. Decoupled lifecycle.
 *
 * @module engines/TaptiteElectrodeMacroBridgeEngine
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U4
 * @safety SAFETY-CRITICAL READ-ONLY (single write is to a `_MACRO-TEMPLATE_`-prefixed
 *         labelled file; never emits runnable code).
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import type {
  WEDMTrainingTemplate,
  WEDMStrategySeed,
} from "./WEDMPartFamilyTemplateExtractorEngine.js";
import { log } from "../utils/Logger.js";

// ───────────────────────────────────────────────────────────────────────────────
// Canonical taptite-electrode VC variable schema.

/** The canonical taptite-electrode VC variables that downstream
 *  MacroFillOrchestratorEngine (MS0-U2) fills from the parsed print. The
 *  schema is closed (not extensible at runtime) — adding a variable here
 *  requires a coordinated change in MacroFillOrchestrator + a schema bump. */
export const TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA = Object.freeze({
  // ── Geometry ────────────────────────────────────────────────────────
  VC_ELECTRODE_OD_MM:        { category: "geometry", required: true,  description: "Electrode outside diameter (mm)" },
  VC_ELECTRODE_LENGTH_MM:    { category: "geometry", required: true,  description: "Total electrode length (mm)" },
  VC_TIP_LENGTH_MM:          { category: "geometry", required: true,  description: "Taptite tip length (mm)" },
  VC_TIP_ANGLE_DEG:          { category: "geometry", required: true,  description: "Taptite tip included angle (degrees)" },
  VC_TIP_FLAT_DIAMETER_MM:   { category: "geometry", required: false, description: "Tip flat diameter — 0 = sharp point" },
  VC_LOBE_COUNT:             { category: "geometry", required: true,  description: "Taptite lobe count (typically 3, 5, or 6)" },
  VC_LOBE_OFFSET_MM:         { category: "geometry", required: true,  description: "Lobe radial offset from nominal (mm)" },
  // ── Process (pulse) ─────────────────────────────────────────────────
  VC_ROUGH_ON_TIME_US:       { category: "process",  required: true,  description: "Rough-pass on-time (µs)" },
  VC_ROUGH_PEAK_CURRENT_A:   { category: "process",  required: true,  description: "Rough-pass peak current (A)" },
  VC_SKIM1_ON_TIME_US:       { category: "process",  required: true,  description: "Skim-1 on-time (µs)" },
  VC_SKIM1_PEAK_CURRENT_A:   { category: "process",  required: true,  description: "Skim-1 peak current (A)" },
  VC_SKIM2_ON_TIME_US:       { category: "process",  required: true,  description: "Skim-2 on-time (µs)" },
  VC_SKIM2_PEAK_CURRENT_A:   { category: "process",  required: true,  description: "Skim-2 peak current (A)" },
  VC_SKIM3_ON_TIME_US:       { category: "process",  required: false, description: "Skim-3 on-time (µs) — optional 4th pass" },
  VC_SKIM3_PEAK_CURRENT_A:   { category: "process",  required: false, description: "Skim-3 peak current (A) — optional 4th pass" },
  // ── Wire ────────────────────────────────────────────────────────────
  VC_WIRE_TENSION_N:         { category: "wire",     required: true,  description: "Wire tension (N)" },
  VC_WIRE_DIAMETER_MM:       { category: "wire",     required: true,  description: "Wire diameter (mm)" },
  // ── Material ────────────────────────────────────────────────────────
  VC_MATERIAL_CLASS:         { category: "material", required: true,  description: "Electrode substrate class (copper / graphite)" },
  // ── Quality target ──────────────────────────────────────────────────
  VC_TARGET_RA_UM:           { category: "quality",  required: true,  description: "Target surface roughness Ra (µm)" },
  VC_DIMENSIONAL_TOLERANCE_MM: { category: "quality",  required: true,  description: "Dimensional tolerance (±mm)" },
} as const);

/** Compute the canonical variable iteration ORDER on demand from the schema —
 *  single source of truth (reviewer B P0-2 fix; previously a separately-declared
 *  array could silently drift from the schema map). Sort key: category asc,
 *  then name asc. Stable + deterministic. */
function getCanonicalVariableOrder(): ReadonlyArray<keyof typeof TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA> {
  return (Object.keys(TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA) as Array<
    keyof typeof TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA
  >)
    .slice()
    .sort((a, b) => {
      const ca = TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA[a].category;
      const cb = TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA[b].category;
      if (ca !== cb) return ca.localeCompare(cb);
      return a.localeCompare(b);
    });
}

/** Variable names ordered by `category` then alphabetic — DERIVED from the
 *  schema map (reviewer B P0-2 fix). Computed once at module load; consumers
 *  who need fresh iteration call `getCanonicalVariableOrder()` directly. */
export const TAPTITE_ELECTRODE_VC_VARIABLES: ReadonlyArray<string> =
  Object.freeze(getCanonicalVariableOrder().slice());

const TEMPLATE_PREFIX = "_MACRO-TEMPLATE_";
const TEMPLATE_FILE_EXT = ".min";

const DO_NOT_RUN_HEADER = [
  "( ============================================================ )",
  "(  _MACRO-TEMPLATE_  —  TAPTITE-ELECTRODE  —  DO NOT RUN AS-IS )",
  "( ============================================================ )",
  "(  This file is a LABELLED TEMPLATE PLACEHOLDER, not a runnable )",
  "(  program. Operator must fill every VCxxx variable, run sim,   )",
  "(  obtain S(x) >= 0.70 from the safety gate, and sign off       )",
  "(  before this file is renamed off the _MACRO-TEMPLATE_ prefix. )",
  "(  Source: TaptiteElectrodeMacroBridgeEngine v1.0.0             )",
  "(  Pipeline: TRAINING-LEARNING-MS0/U-TL-U4 → MACRO-PROGRAM-     )",
  "(            PIPELINE-MS0/MS0-U2 (fill) → MS0-U4 (safety) →    )",
  "(            MS0-U5 (per-machine emit)                          )",
  "( ============================================================ )",
].join("\n");

const TEMPLATE_BODY_PLACEHOLDER = [
  "",
  "( --- VC VARIABLES (operator fills) --- )",
  "( VC_ELECTRODE_OD_MM     = ??.??   )",
  "( VC_ELECTRODE_LENGTH_MM = ??.??   )",
  "( VC_TIP_LENGTH_MM       = ??.??   )",
  "( VC_TIP_ANGLE_DEG       = ??.??   )",
  "( VC_LOBE_COUNT          = ?       )",
  "( VC_LOBE_OFFSET_MM      = ??.??   )",
  "( ... see listRequiredVariables() for full list )",
  "",
  "( --- NO RUNNABLE CODE BELOW — placeholder only --- )",
  // Reviewer-B P1-2: M30 wrapped inside a comment so it's syntactically inert
  // across ALL WEDM dialects (Mitsubishi/Sodick/Makino/AgieCharmilles/Fanuc).
  // Even if a downstream operator strips the _MACRO-TEMPLATE_ prefix, the
  // file contains zero column-0 G/M/T codes — the file is a pure comment block.
  "( M30 marker — placeholder only; never emitted bare )",
  "",
].join("\n");

// ───────────────────────────────────────────────────────────────────────────────
// Public types.

/** A single VC-variable entry within the canonical taptite-electrode schema. */
export interface TaptiteVCVariableEntry {
  name: string;
  category: string;
  required: boolean;
  description: string;
  /** Suggested initial value sourced from the template's `pass_schedule_seed`
   *  when the template is provided. Null when no template was provided OR the
   *  variable has no source in the extracted template (operator must fill). */
  initialValue: number | string | null;
}

/** The artifact this engine emits — consumed by MacroFillOrchestratorEngine
 *  (MS0-U2) and SafetyOrchestratorEngine (MS0-U4) downstream. */
export interface TaptiteElectrodeMacroBridge {
  schemaVersion: number;
  bridge_id: string;
  generated_at: string;
  /** Source family — always `"taptite-electrode"` for this engine. */
  source_family: "taptite-electrode";
  /** Material class carried verbatim from the template. */
  material_class: string | null;
  /** VC variable schema — canonical 20-variable list (see
   *  `TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA`). */
  vc_variables: TaptiteVCVariableEntry[];
  /** Pass schedule reference (carried verbatim from template). */
  pass_schedule_seed: WEDMStrategySeed[];
  /** Tribal tips relevant to taptite electrodes — carried verbatim from
   *  the upstream template. */
  tribal_tips_count: number;
  /** Header to be placed at the top of any labelled template file. */
  do_not_run_header: string;
  /** Notes for downstream consumers (gaps, hydration source, etc). */
  notes: string[];
  /** Reserved for downstream pipeline — null at bridge emit time. */
  sx_score: null;
}

export interface BridgeResult {
  ok: true;
  bridge: TaptiteElectrodeMacroBridge;
}

export interface BridgeErrorResult {
  ok: false;
  error:
    | "template_missing"
    | "wrong_family"
    | "template_schema_mismatch";
  detail?: string;
}

export interface VariableListEntry {
  name: string;
  category: string;
  required: boolean;
  description: string;
  /** Hydrated suggested initial value when a template is provided AND the
   *  variable has a source field in the template. Null otherwise. */
  initialValue: number | string | null;
}

export interface VariableListResult {
  ok: true;
  variables: VariableListEntry[];
  /** Required variable count — derived from the schema. */
  required_count: number;
  /** Optional variable count. */
  optional_count: number;
}

export interface PlaceLabelledTemplateRequest {
  bridge: TaptiteElectrodeMacroBridge;
  /** Absolute or repo-relative path to the part folder. The labelled
   *  template file is written under `<partFolderPath>/CNC PROGRAM/`. */
  partFolderPath: string;
  /** When provided, must contain `partFolderPath` (used by the path-traversal
   *  guard). Defaults to the parent dir of partFolderPath. */
  partLibraryRoot?: string;
  /** When true, overwrites an existing labelled template file. Default is
   *  false (refuse to overwrite, return `already_exists`). */
  overwrite?: boolean;
}

export interface PlaceLabelledTemplateResult {
  ok: true;
  written_to: string;
  bytes_written: number;
}

export interface PlaceLabelledTemplateErrorResult {
  ok: false;
  error:
    | "invalid_bridge"
    | "missing_part_folder"
    | "outdir_escape"
    | "already_exists"
    | "write_failed"
    | "filename_unsafe";
  detail?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// Internal helpers.

/** Match a strategy by `category` (e.g., "roughing", "finishing") and an
 *  optional ordinal within that category. Returns the matching strategy seed
 *  or null when not found. The roughing pass is always ordinal 0; skim passes
 *  are taken in declared order (skim_1 first, then skim_2, etc). */
function findStrategySeed(
  seeds: WEDMStrategySeed[],
  category: string,
  ordinal: number
): WEDMStrategySeed | null {
  let seen = 0;
  for (const s of seeds) {
    if (s.category === category) {
      if (seen === ordinal) return s;
      seen += 1;
    }
  }
  return null;
}

/** Derive the VC variable initial-value hydration from a template's pass
 *  schedule seed. Variables not represented in the seed get `null` (operator
 *  must fill). */
function hydrateVariablesFromTemplate(
  template: WEDMTrainingTemplate | undefined
): Map<string, number | string | null> {
  const m = new Map<string, number | string | null>();
  if (!template) return m;
  const seeds = template.pass_schedule_seed ?? [];
  const rough = findStrategySeed(seeds, "roughing", 0);
  const skim1 = findStrategySeed(seeds, "finishing", 0);
  const skim2 = findStrategySeed(seeds, "finishing", 1);
  const skim3 = findStrategySeed(seeds, "finishing", 2);
  if (rough) {
    m.set("VC_ROUGH_ON_TIME_US", rough.on_time_us);
    m.set("VC_ROUGH_PEAK_CURRENT_A", rough.peak_current_A);
    m.set("VC_WIRE_TENSION_N", rough.wire_tension_N);
  }
  if (skim1) {
    m.set("VC_SKIM1_ON_TIME_US", skim1.on_time_us);
    m.set("VC_SKIM1_PEAK_CURRENT_A", skim1.peak_current_A);
  }
  if (skim2) {
    m.set("VC_SKIM2_ON_TIME_US", skim2.on_time_us);
    m.set("VC_SKIM2_PEAK_CURRENT_A", skim2.peak_current_A);
  }
  if (skim3) {
    m.set("VC_SKIM3_ON_TIME_US", skim3.on_time_us);
    m.set("VC_SKIM3_PEAK_CURRENT_A", skim3.peak_current_A);
  }
  if (template.material_class) {
    m.set("VC_MATERIAL_CLASS", template.material_class);
  }
  return m;
}

/** Build the canonical 20-variable list, hydrating from template where the
 *  template provides a value, else leaving `initialValue: null`. */
function buildVariableEntries(
  template?: WEDMTrainingTemplate
): TaptiteVCVariableEntry[] {
  const hydration = hydrateVariablesFromTemplate(template);
  return TAPTITE_ELECTRODE_VC_VARIABLES.map((name) => {
    const spec = TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA[
      name as keyof typeof TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA
    ];
    return {
      name,
      category: spec.category,
      required: spec.required,
      description: spec.description,
      initialValue: hydration.get(name) ?? null,
    };
  });
}

/** Generate a stable bridge_id — deterministic per material_class + pass count
 *  so that re-bridging the same template produces the same id (idempotency
 *  for downstream caching). */
function buildBridgeId(template: WEDMTrainingTemplate): string {
  const passCount = (template.pass_schedule_seed ?? []).length;
  const matSlug = (template.material_class ?? "no-mat").replace(/[^a-z0-9_-]/gi, "-");
  return `taptite-electrode--${matSlug}--p${passCount}--v1`;
}

/** Sanitize a filename component — strips path separators + control chars + DOT
 *  (because the engine appends `.min` extension SEPARATELY, allowing `.` in the
 *  id sanitization would let `..` survive sanitization and create a path-traversal
 *  vector through the basename — exploited in `placeLabelledTemplate` test
 *  "bridge_id with unsafe filename chars is sanitized into _"). Preserves only
 *  `[A-Za-z0-9_-]` then collapses repeated underscores. Returns null if the
 *  resulting string is empty OR consists only of underscores after sanitize
 *  (reviewer B P1-1: `____.min` is a useless filename and indicates that the
 *  caller's bridge_id had zero alphanumeric content — refuse rather than
 *  produce a degenerate filename). */
function sanitizeFilenameComponent(s: string): string | null {
  // Note: hyphen MUST come at the end of the character class (or be escaped) to
  // be treated as a literal — otherwise "_-" would be interpreted as a range.
  const cleaned = s.replace(/[^A-Za-z0-9_-]/g, "_").replace(/_+/g, "_");
  if (cleaned.length === 0) return null;
  // Reject all-underscore (or single underscore) — defensive against pathological
  // bridge_ids that consist entirely of non-allowed chars. This makes the
  // `filename_unsafe` error variant reachable in practice.
  if (/^_+$/.test(cleaned)) return null;
  return cleaned;
}

/** Sanitize a string for safe injection into a G-code COMMENT body — strips
 *  newlines (would break out of the parenthesized comment + land at column 0),
 *  CR (same), and `)` (would terminate the comment early). Reviewer-B P0-1 fix
 *  for the multiline-injection vector: a caller-mutated `bridge_id` containing
 *  `"foo\nG01 X0 Y0"` would otherwise inject ostensibly-runnable text into the
 *  labelled template body. The DO-NOT-RUN header already protects file-identity
 *  intent, but the comment-body interpolation needs explicit sanitization too. */
function sanitizeCommentBody(s: string): string {
  return String(s).replace(/[\r\n)]/g, "_");
}

/** Verify that resolvedPath is contained under baseDir. Returns null if it
 *  escapes (path-traversal block). Cross-platform via `path.relative`. */
function isContained(resolvedPath: string, baseDir: string): boolean {
  const rel = path.relative(baseDir, resolvedPath);
  // Empty rel means resolvedPath === baseDir (allowed). Otherwise must NOT
  // start with `..` or be absolute.
  if (rel === "") return true;
  return !(rel.startsWith("..") || path.isAbsolute(rel));
}

// ───────────────────────────────────────────────────────────────────────────────
// Engine class.

/**
 * Taptite-electrode-specific bridge from extracted WEDM template → macro-fill
 * layer. SAFETY-CRITICAL READ-ONLY against the upstream template; the single
 * write is to a `_MACRO-TEMPLATE_`-prefixed labelled file with a DO-NOT-RUN
 * header — never a runnable program.
 */
export class TaptiteElectrodeMacroBridgeEngine {
  /** Build the bridge artifact from a `taptite-electrode` template. */
  bridge(template: WEDMTrainingTemplate | undefined): BridgeResult | BridgeErrorResult {
    if (!template) {
      return { ok: false, error: "template_missing", detail: "template is required" };
    }
    if (template.family !== "taptite-electrode") {
      return {
        ok: false,
        error: "wrong_family",
        detail: `bridge supports only 'taptite-electrode', got '${template.family}'`,
      };
    }
    if (typeof template.schemaVersion !== "number") {
      return {
        ok: false,
        error: "template_schema_mismatch",
        detail: "template.schemaVersion must be a number",
      };
    }
    const notes: string[] = [];
    const passCount = (template.pass_schedule_seed ?? []).length;
    if (passCount === 0) {
      notes.push(
        "WARNING: pass_schedule_seed is empty — VC pulse variables will all be null. " +
          "Re-run extractTemplate against a snapshot that has WEDM_CUTTING_STRATEGIES entries."
      );
    } else if (passCount < 3) {
      notes.push(
        `pass_schedule_seed has only ${passCount} entry/entries — taptite electrodes typically use 3-4 passes (rough + 2-3 skim).`
      );
    }
    if (!template.material_class) {
      notes.push(
        "material_class is null — VC_MATERIAL_CLASS must be filled by operator (copper or graphite)."
      );
    }
    const vcVariables = buildVariableEntries(template);
    const bridgeArtifact: TaptiteElectrodeMacroBridge = {
      schemaVersion: 1,
      bridge_id: buildBridgeId(template),
      generated_at: new Date().toISOString(),
      source_family: "taptite-electrode",
      material_class: template.material_class,
      vc_variables: vcVariables,
      pass_schedule_seed: template.pass_schedule_seed ?? [],
      tribal_tips_count: (template.tribal_tips ?? []).length,
      do_not_run_header: DO_NOT_RUN_HEADER,
      notes,
      sx_score: null,
    };
    return { ok: true, bridge: bridgeArtifact };
  }

  /** Canonical taptite-electrode VC variable list, optionally hydrated from a
   *  template. When no template is passed, every `initialValue` is null. */
  listRequiredVariables(template?: WEDMTrainingTemplate): VariableListResult {
    const variables = buildVariableEntries(template);
    let required = 0;
    let optional = 0;
    for (const v of variables) {
      if (v.required) required += 1;
      else optional += 1;
    }
    return { ok: true, variables, required_count: required, optional_count: optional };
  }

  /** Write a labelled `_MACRO-TEMPLATE_<id>.min` placeholder under
   *  `<partFolderPath>/CNC PROGRAM/`. Refuses to overwrite unless explicitly
   *  asked. Rejects path traversal. */
  placeLabelledTemplate(
    req: PlaceLabelledTemplateRequest
  ): PlaceLabelledTemplateResult | PlaceLabelledTemplateErrorResult {
    if (!req || !req.bridge || req.bridge.source_family !== "taptite-electrode") {
      return {
        ok: false,
        error: "invalid_bridge",
        detail: "bridge must be a taptite-electrode TaptiteElectrodeMacroBridge",
      };
    }
    if (typeof req.partFolderPath !== "string" || req.partFolderPath.length === 0) {
      return {
        ok: false,
        error: "missing_part_folder",
        detail: "partFolderPath is required and must be non-empty",
      };
    }
    const partFolder = path.resolve(req.partFolderPath);
    const baseDir = path.resolve(req.partLibraryRoot ?? path.dirname(partFolder));
    if (!isContained(partFolder, baseDir)) {
      return { ok: false, error: "outdir_escape", detail: `${partFolder} escapes ${baseDir}` };
    }
    const cncDir = path.join(partFolder, "CNC PROGRAM");
    const sanitizedId = sanitizeFilenameComponent(req.bridge.bridge_id);
    if (!sanitizedId) {
      return {
        ok: false,
        error: "filename_unsafe",
        detail: `bridge_id sanitized to empty string: ${JSON.stringify(req.bridge.bridge_id)}`,
      };
    }
    const fileName = `${TEMPLATE_PREFIX}${sanitizedId}${TEMPLATE_FILE_EXT}`;
    const outFile = path.join(cncDir, fileName);
    // Re-verify outFile is still contained (defense in depth).
    if (!isContained(outFile, baseDir)) {
      return { ok: false, error: "outdir_escape", detail: `${outFile} escapes ${baseDir}` };
    }
    if (!req.overwrite && fs.existsSync(outFile)) {
      return {
        ok: false,
        error: "already_exists",
        detail: `${outFile} already exists — set overwrite=true to replace`,
      };
    }
    try {
      fs.mkdirSync(cncDir, { recursive: true });
      // Reviewer-B P0-1 fix: sanitize every interpolated value before embedding
      // in the comment body. A caller-mutated bridge could carry a multiline
      // bridge_id / material_class / generated_at that would otherwise inject
      // arbitrary text at column 0 ABOVE the M30 placeholder — defeating the
      // "never mistaken for runnable" property.
      const safeBridgeId = sanitizeCommentBody(req.bridge.bridge_id);
      const safeGeneratedAt = sanitizeCommentBody(req.bridge.generated_at);
      const safeMaterialClass = sanitizeCommentBody(
        req.bridge.material_class ?? "(operator-fill)"
      );
      const passCount = req.bridge.pass_schedule_seed.length;
      const body =
        req.bridge.do_not_run_header +
        "\n" +
        `( bridge_id: ${safeBridgeId} )\n` +
        `( generated_at: ${safeGeneratedAt} )\n` +
        `( material_class: ${safeMaterialClass} )\n` +
        `( pass_count: ${passCount} )\n` +
        TEMPLATE_BODY_PLACEHOLDER;
      fs.writeFileSync(outFile, body, "utf8");
      const stat = fs.statSync(outFile);
      log.info(
        `[TaptiteElectrodeMacroBridgeEngine] wrote labelled template ${outFile} (${stat.size} bytes)`
      );
      return { ok: true, written_to: outFile, bytes_written: stat.size };
    } catch (e) {
      return {
        ok: false,
        error: "write_failed",
        detail: String((e as Error)?.message ?? e),
      };
    }
  }
}

export const taptiteElectrodeMacroBridgeEngine = new TaptiteElectrodeMacroBridgeEngine();
