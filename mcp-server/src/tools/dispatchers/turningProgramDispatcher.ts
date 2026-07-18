/**
 * prism_turning_program — Turning Print-to-Program Dispatcher
 *
 * 36 actions across 17 engines (12 pipeline + lathe_ui_submit/lathe_orchestrate + 4 emit + 4 toolpath + 2 quality-gate + 7 advanced-ops + 4 knowledge + 1 physics):
 *   LatheResourceKnowledgeEngine (4): turning_knowledge_detect_mistakes, turning_knowledge_score_practices,
 *     turning_knowledge_improve, turning_knowledge_stats — tribal-knowledge program QA (amateur-mistake
 *     detection + best-practice scoring + improvement recs); was a dispatcher-orphan.
 *   LatheUnifiedPhysicsOrchestrationEngine (1): turning_physics_analyze — unified Kienzle/Taylor/Jaeger/
 *     Johnson-Cook/deflection/chip turning physics (constants-clean, from physics/constants.ts); was orphan.
 *   LatheAdvancedOperationsEngine (7): turning_advanced_{live_tooling,polygon,threading,grooving,
 *     eccentric,contour,list} — advanced/specialized lathe operation parameter intelligence (was a
 *     dispatcher-orphan; 1 of the 67 unwired lathe engines per AWARENESS-SNAPSHOT).
 *   LatheQualityGateEngine (2): turning_program_quality_gate (6-gate PhD validation of a program
 *     string + S(x) omega hard-block -> FullValidationReport), turning_program_validate_safety
 *     -> SafetyReport. The closed-loop ASSESS side; engine was a dispatcher-orphan before this.
 *   LathePrintProgramEmitterEngine (4): turning_program_emit, turning_program_emit_dry_run,
 *     turning_program_emit_validate, turning_program_emit_controllers — move-level production
 *     post, same engine wired to prism_cam (lathe_p2p_*), now on the lathe-native surface.
 *   LathePrintToolpathGeneratorEngine (4): turning_toolpath_generate, turning_toolpath_validate,
 *     turning_toolpath_gcode, turning_toolpath_cycle_time — SequencePlan -> ToolpathProgram; the
 *     GENERATE half of the generate->emit chain, same engine wired to prism_cam (lathe_p2p_toolpath_*).
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
  // Production move-level emit on the lathe-native surface (same LathePrintProgramEmitterEngine
  // already wired to prism_cam as lathe_p2p_*) — CLAUDE.md §ENGINE WIRING "wire to all sources".
  "turning_program_emit",
  "turning_program_emit_dry_run",
  "turning_program_emit_validate",
  "turning_program_emit_controllers",
  // Move-level toolpath GENERATE on the lathe-native surface (same LathePrintToolpathGeneratorEngine
  // wired to prism_cam as lathe_p2p_toolpath_*) — completes the generate->emit chain here.
  "turning_toolpath_generate",
  "turning_toolpath_validate",
  "turning_toolpath_gcode",
  "turning_toolpath_cycle_time",
  // Closed-loop ASSESS on the lathe surface — LatheQualityGateEngine was a dispatcher-orphan
  // (wired nowhere). Completes generate->emit->ASSESS: 6-gate PhD-level program validation
  // (safety/parameter/sequence/physics/quality/shop) + S(x) omega hard-block.
  "turning_program_quality_gate",
  "turning_program_validate_safety",
  // Advanced lathe operations parameter intelligence — LatheAdvancedOperationsEngine was a
  // dispatcher-orphan (1 of the 67 unwired lathe engines). Live tooling / polygon / advanced
  // threading / complex grooving / eccentric / contour parameter calculators.
  "turning_advanced_live_tooling",
  "turning_advanced_polygon",
  "turning_advanced_threading",
  "turning_advanced_grooving",
  "turning_advanced_eccentric",
  "turning_advanced_contour",
  "turning_advanced_list",
  // Tribal-knowledge program QA — LatheResourceKnowledgeEngine was a genuine dispatcher-orphan
  // (confirmed post detector-fix; not WIRE-EXEMPT, whiskey-lane, no physics constants). Complements
  // the U-CL11 quality gate with tribal/amateur-mistake detection + best-practice scoring.
  "turning_knowledge_detect_mistakes",
  "turning_knowledge_score_practices",
  "turning_knowledge_improve",
  "turning_knowledge_stats",
  // Unified turning physics — LatheUnifiedPhysicsOrchestrationEngine was a genuine orphan; it imports
  // ALL constants from physics/constants.ts (Kienzle/Taylor/Jaeger/Johnson-Cook — verified, none inlined),
  // so exposing analyzeFullPhysics is constants-clean. Engine internals remain physics-reviewer territory.
  "turning_physics_analyze",
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
Toolpath gen (move-level, same engine as prism_cam lathe_p2p_toolpath_*): turning_toolpath_generate (sequence_plan + features + material -> ToolpathProgram), turning_toolpath_validate, turning_toolpath_gcode, turning_toolpath_cycle_time.
Quality gate (closed-loop ASSESS): turning_program_quality_gate (program string + context -> 6-gate validation report + S(x) omega block), turning_program_validate_safety (program safety report).
Advanced ops (parameter intelligence): turning_advanced_live_tooling / polygon / threading / grooving / eccentric / contour (per-op parameter recommendations), turning_advanced_list (catalog).
Tribal-knowledge QA: turning_knowledge_detect_mistakes (amateur-mistake regex scan), turning_knowledge_score_practices (best-practice score: G50-cap, coolant, op-order, canned cycles), turning_knowledge_improve, turning_knowledge_stats.
Production emit (move-level post, same engine as prism_cam lathe_p2p_*): turning_program_emit (ToolpathProgram -> controller G-code + sign-off dossier, ISO 16090-1 envelope hard-block), turning_program_emit_dry_run, turning_program_emit_validate, turning_program_emit_controllers.
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
            // PIPELINE-VAR U-PV02: Auto-chain PostProcessor for per-block S/F optimization.
            // LATHE-OKUMA-POST: SKIP this generic re-codegen when the engine ALREADY applied the
            // verified Okuma OSP master post (postprocessor_applied===true). The generic pipeline
            // re-parses program_text into motion blocks and re-emits in its DEFAULT (Fanuc) dialect
            // -- it does not carry the controller here -- which would CLOBBER the OSP cycles
            // (G85 LAP, G71 threading) back to Fanuc, re-introducing the exact wrong-dialect bug
            // this routing fixes. The OSP program from the master post is already final + authoritative.
            if (!turningResult?.postprocessor_applied && turningResult?.program_text && turningResult.program_text.length > 0) {
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
          case "turning_program_emit": {
            // Move-level production post: ToolpathProgram -> controller G-code + sign-off dossier.
            // Envelope hard-block (ISO 16090-1) lives in the engine; do NOT soften it here.
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            const result = lathePrintProgramEmitterEngine.emit((params as any).program, (params as any).options || {});
            return dispatcherResult(result);
          }
          case "turning_program_emit_dry_run": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            const result = lathePrintProgramEmitterEngine.dryRun((params as any).program, (params as any).options || {});
            return dispatcherResult(result);
          }
          case "turning_program_emit_validate": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            const result = lathePrintProgramEmitterEngine.validate((params as any).emitted);
            return dispatcherResult(result);
          }
          case "turning_program_emit_controllers": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            const result = { controllers: lathePrintProgramEmitterEngine.listControllers() };
            return dispatcherResult(result);
          }
          case "turning_toolpath_generate": {
            // SequencePlan + features + material -> ToolpathProgram (per-op moves, envelope check, cycle time).
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            const result = lathePrintToolpathGeneratorEngine.generateProgram(
              (params as any).sequence_plan,
              (params as any).features,
              (params as any).material,
              (params as any).machine_limits,
            );
            return dispatcherResult(result);
          }
          case "turning_toolpath_validate": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            const result = lathePrintToolpathGeneratorEngine.validate((params as any).program);
            return dispatcherResult(result);
          }
          case "turning_toolpath_gcode": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            const result = { gcode: lathePrintToolpathGeneratorEngine.exportGCode((params as any).program) };
            return dispatcherResult(result);
          }
          case "turning_toolpath_cycle_time": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            const result = lathePrintToolpathGeneratorEngine.getCycleTimeBreakdown((params as any).program);
            return dispatcherResult(result);
          }
          case "turning_program_quality_gate": {
            // 6-gate PhD-level validation of a lathe program string + S(x) omega hard-block.
            const { latheQualityGateEngine } = await import(
              "../../engines/LatheQualityGateEngine.js"
            );
            const result = latheQualityGateEngine.validateProgram((params as any).program, (params as any).context);
            return dispatcherResult(result);
          }
          case "turning_program_validate_safety": {
            const { latheQualityGateEngine } = await import(
              "../../engines/LatheQualityGateEngine.js"
            );
            const result = latheQualityGateEngine.validateSafety((params as any).program, (params as any).context);
            return dispatcherResult(result);
          }
          case "turning_advanced_live_tooling": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = latheAdvancedOperationsEngine.getLiveToolingParams(params as any);
            return dispatcherResult(result);
          }
          case "turning_advanced_polygon": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = latheAdvancedOperationsEngine.getPolygonTurningParams(params as any);
            return dispatcherResult(result);
          }
          case "turning_advanced_threading": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = latheAdvancedOperationsEngine.getAdvancedThreadingParams(params as any);
            return dispatcherResult(result);
          }
          case "turning_advanced_grooving": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = latheAdvancedOperationsEngine.getGroovingParams(params as any);
            return dispatcherResult(result);
          }
          case "turning_advanced_eccentric": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = latheAdvancedOperationsEngine.getEccentricParams(params as any);
            return dispatcherResult(result);
          }
          case "turning_advanced_contour": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = latheAdvancedOperationsEngine.getContourParams(params as any);
            return dispatcherResult(result);
          }
          case "turning_advanced_list": {
            const { latheAdvancedOperationsEngine } = await import(
              "../../engines/LatheAdvancedOperationsEngine.js"
            );
            const result = { operations: latheAdvancedOperationsEngine.listAdvancedOperations() };
            return dispatcherResult(result);
          }
          case "turning_knowledge_detect_mistakes": {
            const { latheResourceKnowledgeEngine } = await import(
              "../../engines/LatheResourceKnowledgeEngine.js"
            );
            const program = (params as any).program ?? (params as any).content ?? "";
            const result = { detected: latheResourceKnowledgeEngine.detectMistakes(program) };
            return dispatcherResult(result);
          }
          case "turning_knowledge_score_practices": {
            const { latheResourceKnowledgeEngine } = await import(
              "../../engines/LatheResourceKnowledgeEngine.js"
            );
            const program = (params as any).program ?? (params as any).content ?? "";
            const result = latheResourceKnowledgeEngine.scoreProgramPractices(program);
            return dispatcherResult(result);
          }
          case "turning_knowledge_improve": {
            const { latheResourceKnowledgeEngine } = await import(
              "../../engines/LatheResourceKnowledgeEngine.js"
            );
            const program = (params as any).program ?? (params as any).content ?? "";
            const result = latheResourceKnowledgeEngine.generateImprovements(program, (params as any).material);
            return dispatcherResult(result);
          }
          case "turning_knowledge_stats": {
            const { latheResourceKnowledgeEngine } = await import(
              "../../engines/LatheResourceKnowledgeEngine.js"
            );
            const result = latheResourceKnowledgeEngine.getStats();
            return dispatcherResult(result);
          }
          case "turning_physics_analyze": {
            // Unified turning physics (Kienzle/Taylor/Jaeger/Johnson-Cook/deflection/chip) — all
            // constants from physics/constants.ts. params is the UnifiedPhysicsInput.
            const { latheUnifiedPhysicsOrchestrationEngine } = await import(
              "../../engines/LatheUnifiedPhysicsOrchestrationEngine.js"
            );
            const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(params as any);
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
