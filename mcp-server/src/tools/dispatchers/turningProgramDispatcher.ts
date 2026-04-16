/**
 * prism_turning_program — Turning Print-to-Program Dispatcher
 *
 * 12 actions across 11 engines:
 *   TurningPrintToProgramEngine (2): turning_print_to_program, turning_process_plan
 *   TurningPrintIntakeEngine (1): turning_blueprint_intake
 *   MaterialCalloutParserEngine (1): turning_parse_material
 *   ToleranceExtractionEngine (1): turning_parse_tolerance
 *   TurningCADImportEngine (1): turning_cad_import
 *   StockSelectionEngine (1): turning_stock_select
 *   AmbiguityResolutionEngine (1): turning_resolve_ambiguity
 *   TurningRevProfileEngine (1): turning_rev_profile
 *   TurningFeatureTaxonomyEngine (1): turning_feature_taxonomy
 *   FitNotationParserEngine (1): turning_parse_fit
 *   ISO2768ApplicatorEngine (1): turning_apply_iso2768
 *
 * Full pipeline: photo/CAD → rev profile → taxonomy → tolerances → stock → program.
 *
 * @milestone PIPE-MS2, LATHE-PRO-MS-1
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_TURNING_PROGRAM_SCHEMAS } from "../../schemas/turningProgramActionSchemas.js";

// Lazy engine cache
let _turningProg: any;
let _printIntake: any;
let _materialParser: any;
let _toleranceExtract: any;
let _cadImport: any;
let _stockSelect: any;
let _ambiguityResolve: any;
let _revProfile: any;
let _taxonomy: any;
let _fitParser: any;
let _iso2768: any;

async function getEngine(): Promise<any> {
  return _turningProg ??= (
    await import("../../engines/TurningPrintToProgramEngine.js")
  ).turningPrintToProgramEngine;
}

async function getIntakeEngine(): Promise<any> {
  return _printIntake ??= (
    await import("../../engines/TurningPrintIntakeEngine.js")
  ).turningPrintIntakeEngine;
}

async function getMaterialParser(): Promise<any> {
  return _materialParser ??= (
    await import("../../engines/MaterialCalloutParserEngine.js")
  ).materialCalloutParserEngine;
}

async function getToleranceExtractor(): Promise<any> {
  return _toleranceExtract ??= (
    await import("../../engines/ToleranceExtractionEngine.js")
  ).toleranceExtractionEngine;
}

async function getCADImport(): Promise<any> {
  return _cadImport ??= (
    await import("../../engines/TurningCADImportEngine.js")
  ).turningCADImportEngine;
}

async function getStockSelect(): Promise<any> {
  return _stockSelect ??= (
    await import("../../engines/StockSelectionEngine.js")
  ).stockSelectionEngine;
}

async function getAmbiguityResolve(): Promise<any> {
  return _ambiguityResolve ??= (
    await import("../../engines/AmbiguityResolutionEngine.js")
  ).ambiguityResolutionEngine;
}

async function getRevProfile(): Promise<any> {
  return _revProfile ??= (
    await import("../../engines/TurningRevProfileEngine.js")
  ).TurningRevProfileEngine;
}

async function getTaxonomy(): Promise<any> {
  return _taxonomy ??= (
    await import("../../engines/TurningFeatureTaxonomyEngine.js")
  ).TurningFeatureTaxonomyEngine;
}

async function getFitParser(): Promise<any> {
  return _fitParser ??= (
    await import("../../engines/FitNotationParserEngine.js")
  ).FitNotationParserEngine;
}

async function getISO2768(): Promise<any> {
  return _iso2768 ??= (
    await import("../../engines/ISO2768ApplicatorEngine.js")
  ).ISO2768ApplicatorEngine;
}

const ACTIONS = [
  "turning_print_to_program",
  "turning_process_plan",
  "turning_blueprint_intake",
  "turning_parse_material",
  "turning_parse_tolerance",
  "turning_cad_import",
  "turning_stock_select",
  "turning_resolve_ambiguity",
  "turning_rev_profile",
  "turning_feature_taxonomy",
  "turning_parse_fit",
  "turning_apply_iso2768",
  "lathe_ui_submit",
  "lathe_orchestrate",
] as const;

const actionEnum = z.enum(ACTIONS);

/**
 * Registers turning program dispatcher.
 * @param server - MCP server instance
 */
export function registerTurningProgramDispatcher(server: any): void {
  server.tool(
    "prism_turning_program",
    `Turning Print-to-Program — generates CNC lathe programs from part features or blueprints.
Photo/CAD intake: turning_blueprint_intake converts BlueprintVisionOCR output to TurningFeature[].
CAD import: turning_cad_import extracts turning profile from STEP/IGES 3D geometry.
Rev profile: turning_rev_profile extracts 2D XZ revolution silhouette with inertia-tensor axis detection.
Feature taxonomy: turning_feature_taxonomy classifies XZ profile segments into 20+ turning feature types.
Material: turning_parse_material resolves AISI/DIN/JIS/UNS callouts to ISO group + Kienzle/Taylor params.
Tolerance: turning_parse_tolerance extracts ISO 286 fits + ISO 2768 defaults + GD&T strategy.
Fit parser: turning_parse_fit resolves H7/g6 fit notation to actual µm deviations (ISO 286-1:2010).
ISO 2768: turning_apply_iso2768 applies general tolerances to un-toleranced dimensions (Part 1 + Part 2).
Stock: turning_stock_select picks optimal bar stock (metric/imperial/tube/hex).
Ambiguity: turning_resolve_ambiguity detects gaps, applies ISO 2768-m defaults, generates user questions.
Program gen: turning_print_to_program, turning_process_plan.
Actions: ${ACTIONS.join(", ")}.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_turning_program] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_TURNING_PROGRAM_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_turning_program"
        );
      }

      try {
        switch (action) {
          case "turning_print_to_program": {
            const eng = await getEngine();
            const turningResult = eng.calculate(action, params) as any;
            // PIPELINE-VAR U-PV02: Auto-chain PostProcessor for per-block S/F optimization
            if (turningResult?.program_text && turningResult.program_text.length > 0) {
              try {
                const { postProcessorPipelineEngine } = await import("../../engines/PostProcessorPipelineEngine.js");
                const ppOutput = await postProcessorPipelineEngine.process({
                  gcode: turningResult.program_text,
                  material: {
                    name: (params as any)?.material?.material_name || turningResult.material,
                    iso_group: (params as any)?.material?.iso_group,
                  },
                  machine: {
                    name: (params as any)?.machine_model || "generic-lathe",
                  },
                  optimization_target: (params as any)?.optimization_target || "balanced",
                });
                if (ppOutput?.output_gcode) {
                  turningResult.program_text = ppOutput.output_gcode;
                  turningResult.postprocessor_applied = true;
                }
              } catch {
                // PostProcessor is non-blocking — fallback to original G-code
              }
            }
            return dispatcherResult(turningResult);
          }
          case "turning_process_plan": {
            const eng = await getEngine();
            const result = eng.calculate(action, params);
            return dispatcherResult(result);
          }
          case "turning_blueprint_intake": {
            const intake = await getIntakeEngine();
            const result = await intake.convertBlueprint(params);
            return dispatcherResult(result);
          }
          case "turning_parse_material": {
            const parser = await getMaterialParser();
            const callout = (params as any)?.callout || (params as any)?.material || "";
            const result = parser.parse(callout);
            return dispatcherResult(result);
          }
          case "turning_parse_tolerance": {
            const extractor = await getToleranceExtractor();
            const result = extractor.extract(
              (params as any)?.dimensions || [],
              (params as any)?.gdts || [],
              (params as any)?.general_tolerance_class || "m",
            );
            return dispatcherResult(result);
          }
          case "turning_cad_import": {
            const cadEng = await getCADImport();
            const result = cadEng.importSolid(params);
            return dispatcherResult(result);
          }
          case "turning_stock_select": {
            const stockEng = await getStockSelect();
            const result = stockEng.select(params);
            return dispatcherResult(result);
          }
          case "turning_resolve_ambiguity": {
            const ambEng = await getAmbiguityResolve();
            const result = ambEng.resolve(params);
            return dispatcherResult(result);
          }
          case "turning_rev_profile": {
            const RevProfile = await getRevProfile();
            const result = RevProfile.extract(params);
            return dispatcherResult(result);
          }
          case "turning_feature_taxonomy": {
            const Taxonomy = await getTaxonomy();
            const result = Taxonomy.classify(params);
            return dispatcherResult(result);
          }
          case "turning_parse_fit": {
            const FitParser = await getFitParser();
            const notation = (params as any)?.notation || "";
            const diameter = (params as any)?.nominal_diameter_mm || 25;
            const result = FitParser.parse(notation, diameter);
            return dispatcherResult(result);
          }
          case "turning_apply_iso2768": {
            const ISO2768 = await getISO2768();
            const result = ISO2768.apply(params);
            return dispatcherResult(result);
          }
          case "lathe_ui_submit": {
            // Full pipeline from UI wizard: intake → pipeline → result
            // Accepts the same TurningInput the UI wizard produces
            const eng = await getEngine();
            const result = eng.calculate("turning_print_to_program", params);
            return dispatcherResult(result);
          }
          case "lathe_orchestrate": {
            const { latheOrchestrationEngine } = await import(
              "../../engines/LatheOrchestrationEngine.js"
            );
            const result = latheOrchestrationEngine.calculate("lathe_orchestrate", params);
            return dispatcherResult(result);
          }
          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_turning_program");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_turning_program");
      }
    }
  );
}
