/**
 * prism_cam_ai_training — CAM-AI Training Dispatcher (CAM-AI-TRAINING-MS0/U-CAMT-B-DISP)
 * =============================================================================
 *
 * Dedicated dispatcher for the 4 CAM-AI-Training engines built under
 * U-CAMT-B01..B03 + U-CAMT-A09:
 *
 *   CAMOperationTaxonomyEngine     (B01) — 67 canonical CAM ops × 25 systems
 *   CAMOperationInputSchemaEngine  (B02) — unified per-(op,system) input schemas
 *   CAMTemplateGeneratorEngine     (B03) — composes B01+B02 → CamTemplate
 *   CorpusProvenanceLedgerEngine   (A09) — synthetic-data hard-reject audit
 *
 * Action namespace `cam_*` (taxonomy / schema / template / provenance). Each
 * action has a Zod schema in CAM_AI_TRAINING_ACTION_SCHEMAS.
 *
 * Pattern mirrors camFunctionDispatcher (U-CAM79) — small focused surface,
 * dedicated schemas, lazy engine imports, slim response envelope.
 */
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { CAM_AI_TRAINING_ACTION_SCHEMAS } from "../../schemas/camAITrainingActionSchemas.js";

const ACTIONS = [
  // Taxonomy (B01)
  "cam_op_taxonomy_operations",
  "cam_op_taxonomy_spec",
  "cam_op_taxonomy_by_family",
  "cam_op_taxonomy_per_software",
  "cam_op_taxonomy_coverage",
  // Input-schema (B02)
  "cam_input_schema_get",
  "cam_input_schema_validate",
  "cam_input_schema_params",
  "cam_input_schema_coverage",
  // Template generator (B03)
  "cam_template_generate",
  "cam_template_for_op",
  "cam_template_all",
  "cam_template_stats",
  // Provenance ledger (A09)
  "cam_provenance_check",
  "cam_provenance_aggregate",
  "cam_provenance_reconcile",
  // Click-sequence (B-CLICK)
  "cam_click_sequence_build",
  "cam_click_sequence_from_catalog",
  "cam_click_param_label",
] as const;

export type CAMAITrainingAction = typeof ACTIONS[number];

export const CAM_AI_TRAINING_ACTIONS: ReadonlyArray<CAMAITrainingAction> = ACTIONS;

/**
 * Pure routing entry point. Tests + internal callers invoke this directly;
 * the MCP server harness wraps it for protocol delivery.
 */
export async function dispatchCamAITraining(
  action: CAMAITrainingAction,
  rawParams: Record<string, unknown> = {},
): Promise<unknown> {
  // snake_case → camelCase normalization (matches camDispatcher convention).
  let params: Record<string, unknown> = rawParams;
  try {
    const { normalizeParams } = await import("../../utils/paramNormalizer.js");
    params = normalizeParams(rawParams) as Record<string, unknown>;
  } catch {
    /* normalizer not available — proceed with raw params */
  }

  const validation = validateActionParams(action, params, CAM_AI_TRAINING_ACTION_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(
      `Invalid params for '${action}': ${validation.errorMessage}`,
      action,
      "prism_cam_ai_training",
    );
  }

  try {
    switch (action) {
      // ── Taxonomy (B01) ─────────────────────────────────────────────────
      case "cam_op_taxonomy_operations": {
        const { camOperationTaxonomyEngine } = await import("../../engines/CAMOperationTaxonomyEngine.js");
        return slimResponse({ operations: camOperationTaxonomyEngine.listOperations(), systems: camOperationTaxonomyEngine.listSystems() });
      }
      case "cam_op_taxonomy_spec": {
        const { camOperationTaxonomyEngine } = await import("../../engines/CAMOperationTaxonomyEngine.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spec = camOperationTaxonomyEngine.getSpec(params.op as any);
        return slimResponse({ spec });
      }
      case "cam_op_taxonomy_by_family": {
        const { camOperationTaxonomyEngine } = await import("../../engines/CAMOperationTaxonomyEngine.js");
        return slimResponse({ byFamily: camOperationTaxonomyEngine.byFamily() });
      }
      case "cam_op_taxonomy_per_software": {
        const { camOperationTaxonomyEngine } = await import("../../engines/CAMOperationTaxonomyEngine.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapping = camOperationTaxonomyEngine.getPerSoftware(params.op as any, params.system as any);
        return slimResponse({ mapping });
      }
      case "cam_op_taxonomy_coverage": {
        const { camOperationTaxonomyEngine } = await import("../../engines/CAMOperationTaxonomyEngine.js");
        return slimResponse({
          coverage: camOperationTaxonomyEngine.coverage(),
          stats: camOperationTaxonomyEngine.stats(),
        });
      }

      // ── Input schema (B02) ─────────────────────────────────────────────
      case "cam_input_schema_get": {
        const { camOperationInputSchemaEngine } = await import("../../engines/CAMOperationInputSchemaEngine.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schema = camOperationInputSchemaEngine.getSchema(params.op as any, params.system as any);
        return slimResponse({ schema });
      }
      case "cam_input_schema_validate": {
        const { camOperationInputSchemaEngine } = await import("../../engines/CAMOperationInputSchemaEngine.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = camOperationInputSchemaEngine.validateValues(params.op as any, params.system as any, (params.values ?? {}) as any);
        return slimResponse(result);
      }
      case "cam_input_schema_params": {
        const { camOperationInputSchemaEngine } = await import("../../engines/CAMOperationInputSchemaEngine.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ids = camOperationInputSchemaEngine.listParams(params.op as any, params.system as any);
        return slimResponse({ params: ids });
      }
      case "cam_input_schema_coverage": {
        const { camOperationInputSchemaEngine } = await import("../../engines/CAMOperationInputSchemaEngine.js");
        return slimResponse({ coverage: camOperationInputSchemaEngine.coverage() });
      }

      // ── Template generator (B03) ───────────────────────────────────────
      case "cam_template_generate": {
        const { camTemplateGeneratorEngine } = await import("../../engines/CAMTemplateGeneratorEngine.js");
        const template = camTemplateGeneratorEngine.generate(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.op as any, params.system as any, params.featureClass as any,
          { overrides: (params.overrides ?? {}) as Record<string, number | string | boolean> },
        );
        return slimResponse({ template });
      }
      case "cam_template_for_op": {
        const { camTemplateGeneratorEngine } = await import("../../engines/CAMTemplateGeneratorEngine.js");
        const templates = camTemplateGeneratorEngine.generateForOp(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.op as any, params.featureClass as any,
          { overrides: (params.overrides ?? {}) as Record<string, number | string | boolean> },
        );
        return slimResponse({ templates, count: templates.length });
      }
      case "cam_template_all": {
        const { camTemplateGeneratorEngine } = await import("../../engines/CAMTemplateGeneratorEngine.js");
        const all = camTemplateGeneratorEngine.generateAll();
        // Return aggregate counts only — full templates can be 100s of rows; consumer should call cam_template_for_op for materialization.
        return slimResponse({ total: all.total, perSystem: all.perSystem, perOp: all.perOp });
      }
      case "cam_template_stats": {
        const { camTemplateGeneratorEngine } = await import("../../engines/CAMTemplateGeneratorEngine.js");
        return slimResponse(camTemplateGeneratorEngine.stats());
      }

      // ── Provenance ledger (A09) ────────────────────────────────────────
      case "cam_provenance_check": {
        const { corpusProvenanceLedgerEngine } = await import("../../engines/CorpusProvenanceLedgerEngine.js");
        const check = corpusProvenanceLedgerEngine.checkRecord(params.record);
        return slimResponse(check);
      }
      case "cam_provenance_aggregate": {
        const { corpusProvenanceLedgerEngine } = await import("../../engines/CorpusProvenanceLedgerEngine.js");
        return slimResponse(corpusProvenanceLedgerEngine.aggregate());
      }
      case "cam_provenance_reconcile": {
        const { corpusProvenanceLedgerEngine } = await import("../../engines/CorpusProvenanceLedgerEngine.js");
        const r = corpusProvenanceLedgerEngine.reconcile((params.catalog ?? []) as string[]);
        return slimResponse(r);
      }

      // ── Click-sequence (B-CLICK) ───────────────────────────────────────
      case "cam_click_sequence_build": {
        const { camTemplateGeneratorEngine } = await import("../../engines/CAMTemplateGeneratorEngine.js");
        const { CAMClickSequenceEngine } = await import("../../engines/CAMClickSequenceEngine.js");
        const { loadCAMCatalog } = await import("../../engines/CAMCatalogLoader.js");
        const tpl = camTemplateGeneratorEngine.generate(
          // Cast narrows the params Record into the engine's exhaustive enum
          // types — these are validated by Zod above, so the unsafe cast is
          // bounded to the dispatcher boundary (not propagated to engines).
          params.op as Parameters<typeof camTemplateGeneratorEngine.generate>[0],
          params.system as Parameters<typeof camTemplateGeneratorEngine.generate>[1],
          params.featureClass as Parameters<typeof camTemplateGeneratorEngine.generate>[2],
          { overrides: (params.overrides ?? {}) as Record<string, number | string | boolean> },
        );
        if (!tpl) {
          return slimResponse({ sequence: null, reason: "unsupported (op,system,feature)" });
        }
        const seqEngine = new CAMClickSequenceEngine(loadCAMCatalog);
        const sequence = seqEngine.buildSequence(tpl);
        return slimResponse({ sequence });
      }
      case "cam_click_sequence_from_catalog": {
        const { camTemplateGeneratorEngine } = await import("../../engines/CAMTemplateGeneratorEngine.js");
        const { CAMClickSequenceEngine } = await import("../../engines/CAMClickSequenceEngine.js");
        const tpl = camTemplateGeneratorEngine.generate(
          params.op as Parameters<typeof camTemplateGeneratorEngine.generate>[0],
          params.system as Parameters<typeof camTemplateGeneratorEngine.generate>[1],
          params.featureClass as Parameters<typeof camTemplateGeneratorEngine.generate>[2],
          { overrides: (params.overrides ?? {}) as Record<string, number | string | boolean> },
        );
        if (!tpl) {
          return slimResponse({ sequence: null, reason: "unsupported (op,system,feature)" });
        }
        const seqEngine = new CAMClickSequenceEngine();
        const sequence = seqEngine.fromCatalog(
          tpl,
          params.catalog as Parameters<typeof seqEngine.fromCatalog>[1],
        );
        return slimResponse({ sequence });
      }
      case "cam_click_param_label": {
        const { camClickSequenceEngine } = await import("../../engines/CAMClickSequenceEngine.js");
        const label = camClickSequenceEngine.paramLabelFor(
          params.system as Parameters<typeof camClickSequenceEngine.paramLabelFor>[0],
          String(params.canonicalId),
        );
        return slimResponse({ label });
      }

      default: {
        // Defensive — should be unreachable given the enum.
        const exhaustive: never = action;
        return dispatcherError(`Unknown action: ${String(exhaustive)}`, "unknown", "prism_cam_ai_training");
      }
    }
  } catch (err) {
    log.error(`prism_cam_ai_training/${action} failed`, { error: err });
    return dispatcherError(
      `Engine error in '${action}': ${err instanceof Error ? err.message : String(err)}`,
      action,
      "prism_cam_ai_training",
    );
  }
}
