/**
 * WEDM Training Template Schemas — TRAINING-LEARNING-MS0 / U-TL-U4
 *
 * Zod schemas for the 4 actions exposed by WEDMPartFamilyTemplateExtractorEngine
 * via prism_edm dispatcher:
 *   - wedm_training_corpus_status       — catalog the WEDM corpus
 *   - wedm_training_template_match      — extract one family template (writes <family>.json)
 *   - wedm_training_template_list       — list on-disk templates
 *   - wedm_training_template_extract_all— bulk extract every family in the snapshot
 *
 * All paths are optional — the engine resolves defaults from
 * `PRISM_WEDM_CORPUS_SNAPSHOT` / `PRISM_WEDM_TEMPLATE_DIR` env or the canonical
 * `mcp-server/data/training/templates/wedm/` location.
 */

import { z } from "zod";
import { WEDM_TEMPLATE_FAMILIES } from "../engines/WEDMPartFamilyTemplateExtractorEngine.js";

/** The 7 WEDM template families (6 spec families + `unknown` fallback) —
 *  DERIVED from `WEDM_TEMPLATE_FAMILIES` in the engine (reviewer-B P3
 *  drift-proofing). When the engine adds a family, this enum picks it up
 *  automatically. The cast to `[string, ...string[]]` is required because
 *  Zod's enum signature requires a non-empty tuple type at the type level —
 *  the engine const is a ReadonlyArray, so we widen for Zod consumption only. */
const WEDMTemplateFamilyEnum = z
  .enum(WEDM_TEMPLATE_FAMILIES as unknown as [string, ...string[]])
  .describe("WEDM template family — one of the 6 spec families or 'unknown' fallback");

const CorpusStatusSchema = z
  .object({
    snapshotPath: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Absolute path to the WEDM corpus snapshot JSON. Defaults to " +
          "$PRISM_WEDM_CORPUS_SNAPSHOT or " +
          "mcp-server/data/training/templates/wedm/_corpus-scan.json."
      ),
  })
  .describe(
    "Catalog the WEDM corpus — returns per-family counts + classification " +
      "coverage from the snapshot. Read-only; does not write any files."
  );

const TemplateMatchSchema = z
  .object({
    family: WEDMTemplateFamilyEnum.describe("Family to extract — must be a valid WEDM template family"),
    snapshotPath: z
      .string()
      .min(1)
      .optional()
      .describe("Override snapshot path (defaults to the env / canonical path)."),
    outDir: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Override output directory for <family>.json. Defaults to " +
          "$PRISM_WEDM_TEMPLATE_DIR or " +
          "mcp-server/data/training/templates/wedm/."
      ),
    dryRun: z
      .boolean()
      .optional()
      .describe("When true, builds the template in memory but does NOT write the JSON file"),
  })
  .describe(
    "Extract one WEDM family template — returns the WEDMTrainingTemplate and " +
      "writes <family>.json to outDir (unless dryRun=true). SAFETY-CRITICAL " +
      "READ-ONLY: never emits runnable G-code or controller dialect output."
  );

const TemplateListSchema = z
  .object({
    outDir: z
      .string()
      .min(1)
      .optional()
      .describe("Override directory to list (defaults to the canonical WEDM template dir)."),
  })
  .describe(
    "List all on-disk WEDM training templates under outDir, sorted alphabetically " +
      "by family. Ignores `_`-prefixed files (corpus-scan snapshot) and files " +
      "whose stem is not a valid WEDM template family."
  );

const TemplateExtractAllSchema = z
  .object({
    snapshotPath: z
      .string()
      .min(1)
      .optional()
      .describe("Override snapshot path (defaults to the env / canonical path)."),
    outDir: z
      .string()
      .min(1)
      .optional()
      .describe("Override output directory (defaults to the canonical WEDM template dir)."),
    dryRun: z
      .boolean()
      .optional()
      .describe("When true, builds every family's template in memory without writing any files."),
  })
  .describe(
    "Bulk-extract every family present in the snapshot. Skips families whose " +
      "name is not in the WEDM taxonomy (returned in the `skipped` array)."
  );

// ──────────────────────────────────────────────────────────────────────
// TaptiteElectrodeMacroBridgeEngine schemas (engine 2 of U-TL-U4 — 3 actions).

const TaptiteMacroBridgeSchema = z
  .object({
    template: z
      .object({
        family: z.string(),
        schemaVersion: z.number(),
      })
      .passthrough()
      .optional()
      .describe(
        "WEDMTrainingTemplate for the taptite-electrode family — typically obtained " +
          "by chaining wedm_training_template_match first. Required."
      ),
  })
  .describe(
    "Build a TaptiteElectrodeMacroBridge artifact from a taptite-electrode template. " +
      "Returns the bridge + VC variable schema for downstream MacroFillOrchestrator. " +
      "SAFETY-CRITICAL READ-ONLY (no file writes)."
  );

const TaptiteMacroVariablesSchema = z
  .object({
    template: z
      .object({
        family: z.string(),
        schemaVersion: z.number(),
      })
      .passthrough()
      .optional()
      .describe(
        "Optional WEDMTrainingTemplate — when provided, VC pulse variables are " +
          "hydrated with values from the template's pass_schedule_seed."
      ),
  })
  .describe(
    "List the canonical taptite-electrode VC variable schema. Without a template, " +
      "every initialValue is null (operator must fill). With a template, pulse-related " +
      "variables are hydrated from the pass schedule."
  );

const TaptiteMacroPlaceTemplateSchema = z
  .object({
    bridge: z
      .object({
        source_family: z.literal("taptite-electrode"),
        bridge_id: z.string().min(1),
      })
      .passthrough()
      .describe("TaptiteElectrodeMacroBridge artifact (typically from wedm_training_taptite_bridge)"),
    partFolderPath: z
      .string()
      .min(1)
      .describe("Absolute or repo-relative path to the part folder under the part library"),
    partLibraryRoot: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional containment root — defaults to parent of partFolderPath. Used by " +
          "the path-traversal guard."
      ),
    overwrite: z
      .boolean()
      .optional()
      .describe("When true, overwrites an existing labelled template file. Default false."),
  })
  .describe(
    "Place a _MACRO-TEMPLATE_<id>.min labelled placeholder under <partFolderPath>/CNC PROGRAM/. " +
      "The placeholder carries a DO-NOT-RUN-AS-IS header and contains NO runnable G-code. " +
      "Refuses to overwrite by default."
  );

export const WEDM_TRAINING_TEMPLATE_SCHEMAS = {
  wedm_training_corpus_status: CorpusStatusSchema,
  wedm_training_template_match: TemplateMatchSchema,
  wedm_training_template_list: TemplateListSchema,
  wedm_training_template_extract_all: TemplateExtractAllSchema,
  wedm_training_taptite_bridge: TaptiteMacroBridgeSchema,
  wedm_training_taptite_variables: TaptiteMacroVariablesSchema,
  wedm_training_taptite_place_template: TaptiteMacroPlaceTemplateSchema,
};

export type WEDMTrainingTemplateAction = keyof typeof WEDM_TRAINING_TEMPLATE_SCHEMAS;
