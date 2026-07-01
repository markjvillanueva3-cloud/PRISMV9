/**
 * machineDispatcher.ts — prism_machine MCP dispatcher
 * =====================================================
 *
 * Wires 13 previously-dormant Machine-domain engines as a single coherent
 * MCP tool surface (PSN-SYNERGY / MACHINE-WIRING, slot oscar).
 *
 * Action map (43 actions, 13 engines):
 *
 *   MachineConfidenceCalculatorEngine (8 actions):
 *     confidence_calculate              → engine.calculateConfidence()
 *     confidence_queue_ambiguities      → engine.queueAmbiguities()
 *     confidence_get_next_to_resolve    → engine.getNextToResolve()
 *     confidence_get_machine_ambiguities→ engine.getMachineAmbiguities()
 *     confidence_resolve_ambiguity      → engine.resolveAmbiguity()
 *     confidence_defer_ambiguity        → engine.deferAmbiguity()
 *     confidence_claim_ambiguity        → engine.claimAmbiguity()
 *     confidence_get_queue_stats        → engine.getQueueStats()
 *
 *   MachineConsumerBindingEngine (7 actions):
 *     consumer_bind                     → engine.bind()
 *     consumer_for_all_consumers        → engine.forAllConsumers()
 *     consumer_for_print_to_cnc         → engine.forPrintToCNC()
 *     consumer_for_program_release      → engine.forProgramRelease()
 *     consumer_for_quoting              → engine.forQuoting()
 *     consumer_get_stats                → engine.getStats()
 *     consumer_invalidate               → engine.invalidate()
 *     consumer_invalidate_all           → engine.invalidateAll()
 *     consumer_list_bindable            → engine.listBindable()
 *
 *   MachineKinematicStateEngine (5 actions):
 *     kinematic_get_history             → engine.getHistory()
 *     kinematic_get_latest              → engine.getLatest()
 *     kinematic_render_markdown         → engine.renderMarkdown()
 *     kinematic_servo_lag_trend         → engine.servoLagTrend()
 *     kinematic_update                  → engine.update()
 *
 *   MachineLayerMerger (1 action):
 *     layer_merge                       → engine.merge()
 *
 *   MachineLoRABaseEngine (3 actions):
 *     lora_build_dataset                → machineLoRABase.buildDatasetHelper().build()
 *     lora_create_cadence               → machineLoRABase.createCadence()
 *     lora_geometry_hash                → geometryHash()
 *
 *   MachineModelAcquisitionEngine (2 actions):
 *     model_acquisition_generate_plan   → engine.generateAcquisitionPlan()
 *     model_acquisition_has_model       → engine.hasModel()
 *     (NOTE: get_missing removed — MachineModelAcquisitionEngine has no
 *     getMissingMachines() method. The equivalent surface is on
 *     MachineModelDownloaderEngine — use model_downloader_get_missing.)
 *
 *   MachineModelDownloaderEngine (3 actions):
 *     model_downloader_get_missing      → engine.getMissingMachines()
 *     model_downloader_playwright_script→ engine.generatePlaywrightScript()
 *     model_downloader_search_grabcad   → engine.searchGrabCAD()
 *
 *   MachineOptionContractEngine (6 actions):
 *     option_contract_generate_tests    → engine.generateContractTests()
 *     option_contract_get_renderable    → engine.getRenderableOptions()
 *     option_contract_is_valid_combo    → engine.isValidCombination()
 *     option_contract_run_tests         → engine.runContractTests()
 *     option_contract_validate_geometry → engine.validateGeometry()
 *     option_contract_validate_profile  → engine.validateProfile()
 *
 *   MachineOptionMatrixEngine (8 actions):
 *     option_matrix_calculate_price     → engine.calculatePriceAdder()
 *     option_matrix_get                 → engine.getMatrix()
 *     option_matrix_get_all             → engine.getAllMatrices()
 *     option_matrix_get_available       → engine.getAvailableOptions()
 *     option_matrix_get_by_manufacturer → engine.getMachinesByManufacturer()
 *     option_matrix_get_by_type         → engine.getMachinesByType()
 *     option_matrix_get_default         → engine.getDefaultConfiguration()
 *     option_matrix_validate_config     → engine.validateConfiguration()
 *
 *   MachinePackageAPIEngine (8 actions):
 *     package_api_check_compatibility   → engine.checkCompatibility()
 *     package_api_create_overlay        → engine.createOverlay()
 *     package_api_delete_overlay        → engine.deleteOverlay()
 *     package_api_get                   → engine.getPackage()
 *     package_api_get_coverage_stats    → engine.getCoverageStats()
 *     package_api_list                  → engine.listPackages()
 *     package_api_search                → engine.searchPackages()
 *     package_api_update_overlay        → engine.updateOverlay()
 *
 *   MachinePackageSelectionEngine (2 actions):
 *     package_select                    → engine.select()
 *     package_select_self_awareness     → engine.getSelfAwareness()
 *
 *   MachineProfilePropagationEngine (7 actions):
 *     propagation_compare_machines      → engine.compareMachines()
 *     propagation_get_feasibility       → engine.getFeasibilityContext()
 *     propagation_get_quote_context     → engine.getQuoteContext()
 *     propagation_get_quote_contexts    → engine.getQuoteContexts()
 *     propagation_get_scheduling        → engine.getSchedulingContext()
 *     propagation_propagate_all         → engine.propagateAll()
 *     propagation_run_what_if           → engine.runWhatIfAnalysis()
 *
 *   MachineToolErrorBudgetEngine (5 actions):
 *     tool_error_abbe                   → engine.abbeAmplification()
 *     tool_error_compute_budget         → engine.computeBudget()
 *     tool_error_rss_combine            → engine.rssCombine()
 *     tool_error_thermal_growth         → engine.thermalGrowth()
 *     tool_error_worst_case_combine     → engine.worstCaseCombine()
 *
 * Note: NO cross-wire to other dispatchers (Machine is a focused domain).
 *
 * @module tools/dispatchers/machineDispatcher
 * @milestone PSN-SYNERGY / MACHINE-WIRING (slot oscar)
 */

import { z } from "zod";
import {
  EmptyInputSchema,
  ConfidenceCalculateSchema,
  ConfidenceQueueAmbiguitiesSchema,
  ConfidenceResolveAmbiguitySchema,
  ConfidenceDeferAmbiguitySchema,
  ConfidenceClaimAmbiguitySchema,
  ConfidenceGetMachineAmbiguitiesSchema,
  ConfidenceIsCalculatorReadySchema,
  ConfidenceGetLowConfidenceMachinesSchema,
  ConsumerBindSchema,
  ConsumerForProgramReleaseSchema,
  ConsumerForPrintToCNCSchema,
  ConsumerForQuotingSchema,
  ConsumerForAllConsumersSchema,
  ConsumerInvalidateSchema,
  KinematicUpdateSchema,
  KinematicGetLatestSchema,
  KinematicGetHistorySchema,
  KinematicServoLagTrendSchema,
  KinematicRenderMarkdownSchema,
  LayerMergeSchema,
  LoRABuildDatasetSchema,
  LoRACreateCadenceSchema,
  LoRAGeometryHashSchema,
  AcquisitionGeneratePlanSchema,
  AcquisitionHasModelSchema,
  DownloaderSearchGrabCADSchema,
  DownloaderGeneratePlaywrightScriptSchema,
  ContractValidateProfileSchema,
  ContractGetRenderableOptionsSchema,
  ContractIsValidCombinationSchema,
  ContractValidateGeometrySchema,
  ContractGenerateTestsSchema,
  ContractRunTestsSchema,
  MatrixGetSchema,
  MatrixGetByTypeSchema,
  MatrixGetByManufacturerSchema,
  MatrixValidateConfigSchema,
  MatrixGetAvailableOptionsSchema,
  MatrixGetDefaultConfigSchema,
  MatrixCalculatePriceAdderSchema,
  MatrixRegisterSchema,
  PackageAPIGetSchema,
  PackageAPIListSchema,
  PackageAPISearchSchema,
  PackageAPICreateOverlaySchema,
  PackageAPIUpdateOverlaySchema,
  PackageAPIDeleteOverlaySchema,
  PackageAPICheckCompatibilitySchema,
  PackageSelectSchema,
  PropagationGetQuoteContextSchema,
  PropagationGetQuoteContextsSchema,
  PropagationGetSchedulingContextSchema,
  PropagationGetFeasibilityContextSchema,
  PropagationRunWhatIfSchema,
  PropagationCompareMachinesSchema,
  ErrorBudgetComputeSchema,
  ErrorBudgetAbbeSchema,
  ErrorBudgetThermalGrowthSchema,
  ErrorBudgetRSSCombineSchema,
  ErrorBudgetWorstCaseCombineSchema,
} from "../../schemas/machineActionSchemas.js";

// ─── Action enum groups (alphabetically sorted within each group) ─────────────

const CONFIDENCE_ACTIONS = [
  "confidence_calculate",
  "confidence_claim_ambiguity",
  "confidence_defer_ambiguity",
  "confidence_get_machine_ambiguities",
  "confidence_get_next_to_resolve",
  "confidence_get_queue_stats",
  "confidence_is_calculator_ready",
  "confidence_get_low_confidence_machines",
  "confidence_queue_ambiguities",
  "confidence_resolve_ambiguity",
] as const;

const CONSUMER_ACTIONS = [
  "consumer_bind",
  "consumer_for_all_consumers",
  "consumer_for_print_to_cnc",
  "consumer_for_program_release",
  "consumer_for_quoting",
  "consumer_get_stats",
  "consumer_invalidate",
  "consumer_invalidate_all",
  "consumer_list_bindable",
] as const;

const KINEMATIC_ACTIONS = [
  "kinematic_get_history",
  "kinematic_get_latest",
  "kinematic_render_markdown",
  "kinematic_servo_lag_trend",
  "kinematic_update",
] as const;

const LAYER_ACTIONS = [
  "layer_merge",
] as const;

const LORA_ACTIONS = [
  "lora_build_dataset",
  "lora_create_cadence",
  "lora_geometry_hash",
] as const;

const MODEL_ACQUISITION_ACTIONS = [
  "model_acquisition_generate_plan",
  "model_acquisition_has_model",
] as const;

const MODEL_DOWNLOADER_ACTIONS = [
  "model_downloader_get_missing",
  "model_downloader_playwright_script",
  "model_downloader_search_grabcad",
] as const;

const OPTION_CONTRACT_ACTIONS = [
  "option_contract_generate_tests",
  "option_contract_get_renderable",
  "option_contract_is_valid_combo",
  "option_contract_run_tests",
  "option_contract_validate_geometry",
  "option_contract_validate_profile",
] as const;

const OPTION_MATRIX_ACTIONS = [
  "option_matrix_calculate_price",
  "option_matrix_get",
  "option_matrix_get_all",
  "option_matrix_get_available",
  "option_matrix_get_by_manufacturer",
  "option_matrix_get_by_type",
  "option_matrix_get_default",
  "option_matrix_validate_config",
] as const;

const PACKAGE_API_ACTIONS = [
  "package_api_check_compatibility",
  "package_api_create_overlay",
  "package_api_delete_overlay",
  "package_api_get",
  "package_api_get_coverage_stats",
  "package_api_list",
  "package_api_search",
  "package_api_update_overlay",
] as const;

const PACKAGE_SELECT_ACTIONS = [
  "package_select",
  "package_select_self_awareness",
] as const;

const PROPAGATION_ACTIONS = [
  "propagation_compare_machines",
  "propagation_get_feasibility",
  "propagation_get_quote_context",
  "propagation_get_quote_contexts",
  "propagation_get_scheduling",
  "propagation_propagate_all",
  "propagation_run_what_if",
] as const;

const TOOL_ERROR_ACTIONS = [
  "tool_error_abbe",
  "tool_error_compute_budget",
  "tool_error_rss_combine",
  "tool_error_thermal_growth",
  "tool_error_worst_case_combine",
] as const;

const ALL_ACTIONS = [
  ...CONFIDENCE_ACTIONS,
  ...CONSUMER_ACTIONS,
  ...KINEMATIC_ACTIONS,
  ...LAYER_ACTIONS,
  ...LORA_ACTIONS,
  ...MODEL_ACQUISITION_ACTIONS,
  ...MODEL_DOWNLOADER_ACTIONS,
  ...OPTION_CONTRACT_ACTIONS,
  ...OPTION_MATRIX_ACTIONS,
  ...PACKAGE_API_ACTIONS,
  ...PACKAGE_SELECT_ACTIONS,
  ...PROPAGATION_ACTIONS,
  ...TOOL_ERROR_ACTIONS,
] as const;

type MachineAction = (typeof ALL_ACTIONS)[number];

// ─── Input schema lookup ──────────────────────────────────────────────────────

const ACTION_SCHEMAS: Record<MachineAction, z.ZodTypeAny> = {
  // Confidence
  confidence_calculate: ConfidenceCalculateSchema,
  confidence_claim_ambiguity: ConfidenceClaimAmbiguitySchema,
  confidence_defer_ambiguity: ConfidenceDeferAmbiguitySchema,
  confidence_get_machine_ambiguities: ConfidenceGetMachineAmbiguitiesSchema,
  confidence_get_next_to_resolve: EmptyInputSchema,
  confidence_get_queue_stats: EmptyInputSchema,
  confidence_get_low_confidence_machines: ConfidenceGetLowConfidenceMachinesSchema,
  confidence_is_calculator_ready: ConfidenceIsCalculatorReadySchema,
  confidence_queue_ambiguities: ConfidenceQueueAmbiguitiesSchema,
  confidence_resolve_ambiguity: ConfidenceResolveAmbiguitySchema,
  // Consumer binding
  consumer_bind: ConsumerBindSchema,
  consumer_for_all_consumers: ConsumerForAllConsumersSchema,
  consumer_for_print_to_cnc: ConsumerForPrintToCNCSchema,
  consumer_for_program_release: ConsumerForProgramReleaseSchema,
  consumer_for_quoting: ConsumerForQuotingSchema,
  consumer_get_stats: EmptyInputSchema,
  consumer_invalidate: ConsumerInvalidateSchema,
  consumer_invalidate_all: EmptyInputSchema,
  consumer_list_bindable: EmptyInputSchema,
  // Kinematic state
  kinematic_get_history: KinematicGetHistorySchema,
  kinematic_get_latest: KinematicGetLatestSchema,
  kinematic_render_markdown: KinematicRenderMarkdownSchema,
  kinematic_servo_lag_trend: KinematicServoLagTrendSchema,
  kinematic_update: KinematicUpdateSchema,
  // Layer merger
  layer_merge: LayerMergeSchema,
  // LoRA base
  lora_build_dataset: LoRABuildDatasetSchema,
  lora_create_cadence: LoRACreateCadenceSchema,
  lora_geometry_hash: LoRAGeometryHashSchema,
  // Model acquisition
  model_acquisition_generate_plan: AcquisitionGeneratePlanSchema,
  model_acquisition_has_model: AcquisitionHasModelSchema,
  // Model downloader
  model_downloader_get_missing: EmptyInputSchema,
  model_downloader_playwright_script: DownloaderGeneratePlaywrightScriptSchema,
  model_downloader_search_grabcad: DownloaderSearchGrabCADSchema,
  // Option contract
  option_contract_generate_tests: ContractGenerateTestsSchema,
  option_contract_get_renderable: ContractGetRenderableOptionsSchema,
  option_contract_is_valid_combo: ContractIsValidCombinationSchema,
  option_contract_run_tests: ContractRunTestsSchema,
  option_contract_validate_geometry: ContractValidateGeometrySchema,
  option_contract_validate_profile: ContractValidateProfileSchema,
  // Option matrix
  option_matrix_calculate_price: MatrixCalculatePriceAdderSchema,
  option_matrix_get: MatrixGetSchema,
  option_matrix_get_all: EmptyInputSchema,
  option_matrix_get_available: MatrixGetAvailableOptionsSchema,
  option_matrix_get_by_manufacturer: MatrixGetByManufacturerSchema,
  option_matrix_get_by_type: MatrixGetByTypeSchema,
  option_matrix_get_default: MatrixGetDefaultConfigSchema,
  option_matrix_validate_config: MatrixValidateConfigSchema,
  // Package API
  package_api_check_compatibility: PackageAPICheckCompatibilitySchema,
  package_api_create_overlay: PackageAPICreateOverlaySchema,
  package_api_delete_overlay: PackageAPIDeleteOverlaySchema,
  package_api_get: PackageAPIGetSchema,
  package_api_get_coverage_stats: EmptyInputSchema,
  package_api_list: PackageAPIListSchema,
  package_api_search: PackageAPISearchSchema,
  package_api_update_overlay: PackageAPIUpdateOverlaySchema,
  // Package selection
  package_select: PackageSelectSchema,
  package_select_self_awareness: EmptyInputSchema,
  // Propagation
  propagation_compare_machines: PropagationCompareMachinesSchema,
  propagation_get_feasibility: PropagationGetFeasibilityContextSchema,
  propagation_get_quote_context: PropagationGetQuoteContextSchema,
  propagation_get_quote_contexts: PropagationGetQuoteContextsSchema,
  propagation_get_scheduling: PropagationGetSchedulingContextSchema,
  propagation_propagate_all: EmptyInputSchema,
  propagation_run_what_if: PropagationRunWhatIfSchema,
  // Tool error budget
  tool_error_abbe: ErrorBudgetAbbeSchema,
  tool_error_compute_budget: ErrorBudgetComputeSchema,
  tool_error_rss_combine: ErrorBudgetRSSCombineSchema,
  tool_error_thermal_growth: ErrorBudgetThermalGrowthSchema,
  tool_error_worst_case_combine: ErrorBudgetWorstCaseCombineSchema,
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the prism_machine MCP tool on the server.
 * @param server — MCP server instance
 */
export function registerMachineDispatcher(server: any): void {
  server.tool(
    "prism_machine",
    [
      "Machine-domain intelligence dispatcher — 70 actions across 13 engines.",
      "Covers: machine confidence scoring (field-level provenance, ambiguity queue management),",
      "consumer binding (unified machine context for program-release / print-to-CNC / quoting / scheduling),",
      "kinematic state tracking (ISO 230-3 thermal expansion, servo lag trends, jerk derate, look-ahead validation),",
      "multi-layer data merging (BASIC/ENHANCED/LEVEL5/USER priority with zero data loss),",
      "LoRA dataset building and cadence scheduling for per-machine fine-tuning pipelines,",
      "3D model acquisition planning (GrabCAD, Haas, DMG MORI, Mazak, Okuma sources),",
      "option contract validation (legal controller/spindle/coolant combinations),",
      "option matrix management (5 machines pre-loaded: Okuma LB3000, Haas VF-2SS, Mazak QTN250, Mitsubishi MV1200R, DMG NLX2500),",
      "package CRUD API (get/list/search/create-overlay/update/delete),",
      "package-driven machine selection (confidence-scored, option-validated candidates),",
      "profile propagation (quote / scheduling / feasibility contexts, what-if analysis, machine comparison),",
      "and geometric error budget allocation (21-error ISO 230 model, Abbe offset, RSS/worst-case).",
    ].join(" "),
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]).describe(
        "Machine-domain engine action to invoke",
      ),
      params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
    },
    async ({
      action,
      params = {},
    }: {
      action: string;
      params?: Record<string, unknown>;
    }) => {
      // Validate params against the per-action schema before touching any engine.
      const schema = ACTION_SCHEMAS[action as MachineAction];
      if (schema) {
        const parsed = schema.safeParse(params);
        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  error: "invalid_params",
                  action,
                  details: parsed.error.issues.map((i) => ({
                    path: i.path.join(".") || "(root)",
                    message: i.message,
                  })),
                }),
              },
            ],
          };
        }
      }

      let result: unknown;

      switch (action as MachineAction) {

        // ── MachineConfidenceCalculatorEngine ─────────────────────────────

        case "confidence_calculate": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = machineConfidenceCalculatorEngine.calculateConfidence(
            (params as any).pkg,
            (params as any).provenance ?? {},
          );
          break;
        }
        case "confidence_queue_ambiguities": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          machineConfidenceCalculatorEngine.queueAmbiguities(
            (params as any).machineId,
            (params as any).ambiguities,
          );
          result = { ok: true, queued: (params as any).ambiguities?.length ?? 0 };
          break;
        }
        case "confidence_get_next_to_resolve": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = { ok: true, item: machineConfidenceCalculatorEngine.getNextToResolve() };
          break;
        }
        case "confidence_get_machine_ambiguities": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = {
            ok: true,
            items: machineConfidenceCalculatorEngine.getMachineAmbiguities((params as any).machineId),
          };
          break;
        }
        case "confidence_resolve_ambiguity": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = {
            ok: true,
            resolved: machineConfidenceCalculatorEngine.resolveAmbiguity(
              (params as any).ambiguityId,
              (params as any).resolution,
            ),
          };
          break;
        }
        case "confidence_defer_ambiguity": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = {
            ok: true,
            deferred: machineConfidenceCalculatorEngine.deferAmbiguity(
              (params as any).ambiguityId,
              (params as any).reason,
            ),
          };
          break;
        }
        case "confidence_claim_ambiguity": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = {
            ok: true,
            claimed: machineConfidenceCalculatorEngine.claimAmbiguity(
              (params as any).ambiguityId,
              (params as any).assignee,
            ),
          };
          break;
        }
        case "confidence_get_queue_stats": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = { ok: true, stats: machineConfidenceCalculatorEngine.getQueueStats() };
          break;
        }
        case "confidence_is_calculator_ready": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = {
            ok: true,
            ready: machineConfidenceCalculatorEngine.isCalculatorReady((params as any).machineId),
          };
          break;
        }
        case "confidence_get_low_confidence_machines": {
          const { machineConfidenceCalculatorEngine } = await import(
            "../../engines/MachineConfidenceCalculatorEngine.js"
          );
          result = {
            ok: true,
            machines: machineConfidenceCalculatorEngine.getLowConfidenceMachines((params as any).threshold),
          };
          break;
        }

        // ── MachineConsumerBindingEngine ───────────────────────────────────

        case "consumer_bind": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = machineConsumerBindingEngine.bind((params as any).shop_machine_id);
          break;
        }
        case "consumer_for_program_release": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = {
            ok: true,
            binding: machineConsumerBindingEngine.forProgramRelease((params as any).shop_machine_id),
          };
          break;
        }
        case "consumer_for_print_to_cnc": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = {
            ok: true,
            binding: machineConsumerBindingEngine.forPrintToCNC((params as any).shop_machine_id),
          };
          break;
        }
        case "consumer_for_quoting": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = {
            ok: true,
            binding: machineConsumerBindingEngine.forQuoting((params as any).shop_machine_id),
          };
          break;
        }
        case "consumer_for_all_consumers": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = {
            ok: true,
            bindings: machineConsumerBindingEngine.forAllConsumers((params as any).shop_machine_id),
          };
          break;
        }
        case "consumer_list_bindable": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = { ok: true, machines: machineConsumerBindingEngine.listBindable() };
          break;
        }
        case "consumer_invalidate": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          machineConsumerBindingEngine.invalidate((params as any).shop_machine_id);
          result = { ok: true, invalidated: (params as any).shop_machine_id };
          break;
        }
        case "consumer_invalidate_all": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          machineConsumerBindingEngine.invalidateAll();
          result = { ok: true, invalidated: "all" };
          break;
        }
        case "consumer_get_stats": {
          const { machineConsumerBindingEngine } = await import(
            "../../engines/MachineConsumerBindingEngine.js"
          );
          result = { ok: true, ...machineConsumerBindingEngine.getStats() };
          break;
        }

        // ── MachineKinematicStateEngine ────────────────────────────────────

        case "kinematic_update": {
          const { machineKinematicStateEngine } = await import(
            "../../engines/MachineKinematicStateEngine.js"
          );
          result = machineKinematicStateEngine.update(
            (params as any).snap,
            (params as any).tolerance_mm,
          );
          break;
        }
        case "kinematic_get_latest": {
          const { machineKinematicStateEngine } = await import(
            "../../engines/MachineKinematicStateEngine.js"
          );
          result = { ok: true, state: machineKinematicStateEngine.getLatest((params as any).machine_id) };
          break;
        }
        case "kinematic_get_history": {
          const { machineKinematicStateEngine } = await import(
            "../../engines/MachineKinematicStateEngine.js"
          );
          result = { ok: true, history: machineKinematicStateEngine.getHistory((params as any).machine_id) };
          break;
        }
        case "kinematic_servo_lag_trend": {
          const { machineKinematicStateEngine } = await import(
            "../../engines/MachineKinematicStateEngine.js"
          );
          result = {
            ok: true,
            trend: machineKinematicStateEngine.servoLagTrend(
              (params as any).machine_id,
              (params as any).axis,
            ),
          };
          break;
        }
        case "kinematic_render_markdown": {
          const { machineKinematicStateEngine } = await import(
            "../../engines/MachineKinematicStateEngine.js"
          );
          result = {
            ok: true,
            markdown: machineKinematicStateEngine.renderMarkdown((params as any).derived_state as any),
          };
          break;
        }

        // ── MachineLayerMerger ─────────────────────────────────────────────

        case "layer_merge": {
          const { machineLayerMerger } = await import(
            "../../engines/MachineLayerMerger.js"
          );
          result = machineLayerMerger.merge((params as any).inputs);
          break;
        }

        // ── MachineLoRABaseEngine ──────────────────────────────────────────

        case "lora_build_dataset": {
          const { machineLoRABase } = await import(
            "../../engines/MachineLoRABaseEngine.js"
          );
          const builder = machineLoRABase.buildDatasetHelper({
            machineType: (params as any).machineType,
            render: (job) => ({
              instruction: `Optimize parameters for ${(params as any).machineType} job`,
              input: JSON.stringify(job.features),
              output: JSON.stringify(job.actual),
            }),
          });
          result = builder.build((params as any).jobs, (params as any).split);
          break;
        }
        case "lora_create_cadence": {
          const { machineLoRABase } = await import(
            "../../engines/MachineLoRABaseEngine.js"
          );
          const cadence = machineLoRABase.createCadence((params as any).config);
          result = { ok: true, config: cadence.getConfig(), state: cadence.getState() };
          break;
        }
        case "lora_geometry_hash": {
          const { geometryHash } = await import(
            "../../engines/MachineLoRABaseEngine.js"
          );
          result = { ok: true, hash: geometryHash((params as any).fingerprint) };
          break;
        }

        // ── MachineModelAcquisitionEngine ──────────────────────────────────

        case "model_acquisition_generate_plan": {
          const { machineModelAcquisitionEngine } = await import(
            "../../engines/MachineModelAcquisitionEngine.js"
          );
          result = machineModelAcquisitionEngine.generateAcquisitionPlan((params as any).machines);
          break;
        }
        case "model_acquisition_has_model": {
          const { machineModelAcquisitionEngine } = await import(
            "../../engines/MachineModelAcquisitionEngine.js"
          );
          result = {
            ok: true,
            has_model: machineModelAcquisitionEngine.hasModel((params as any).machineId),
          };
          break;
        }

        // ── MachineModelDownloaderEngine ───────────────────────────────────

        case "model_downloader_search_grabcad": {
          const { machineModelDownloaderEngine } = await import(
            "../../engines/MachineModelDownloaderEngine.js"
          );
          result = { ok: true, results: await machineModelDownloaderEngine.searchGrabCAD((params as any).query) };
          break;
        }
        case "model_downloader_get_missing": {
          const { machineModelDownloaderEngine } = await import(
            "../../engines/MachineModelDownloaderEngine.js"
          );
          result = { ok: true, machines: machineModelDownloaderEngine.getMissingMachines() };
          break;
        }
        case "model_downloader_playwright_script": {
          const { machineModelDownloaderEngine } = await import(
            "../../engines/MachineModelDownloaderEngine.js"
          );
          result = machineModelDownloaderEngine.generatePlaywrightScript((params as any).machines);
          break;
        }

        // ── MachineOptionContractEngine ────────────────────────────────────

        case "option_contract_validate_profile": {
          const { machineOptionContractEngine } = await import(
            "../../engines/MachineOptionContractEngine.js"
          );
          result = machineOptionContractEngine.validateProfile((params as any).profile as any);
          break;
        }
        case "option_contract_get_renderable": {
          const { machineOptionContractEngine } = await import(
            "../../engines/MachineOptionContractEngine.js"
          );
          result = machineOptionContractEngine.getRenderableOptions(params as any);
          break;
        }
        case "option_contract_is_valid_combo": {
          const { machineOptionContractEngine } = await import(
            "../../engines/MachineOptionContractEngine.js"
          );
          result = machineOptionContractEngine.isValidCombination(
            (params as any).controllerId,
            (params as any).spindleId,
            (params as any).coolantIds,
            (params as any).allowedOptions,
          );
          break;
        }
        case "option_contract_validate_geometry": {
          const { machineOptionContractEngine } = await import(
            "../../engines/MachineOptionContractEngine.js"
          );
          result = machineOptionContractEngine.validateGeometry(
            (params as any).partWeight,
            (params as any).partDiameter,
            (params as any).restrictions,
          );
          break;
        }
        case "option_contract_generate_tests": {
          const { machineOptionContractEngine } = await import(
            "../../engines/MachineOptionContractEngine.js"
          );
          result = machineOptionContractEngine.generateContractTests((params as any).machineId);
          break;
        }
        case "option_contract_run_tests": {
          const { machineOptionContractEngine } = await import(
            "../../engines/MachineOptionContractEngine.js"
          );
          result = machineOptionContractEngine.runContractTests((params as any).machineId);
          break;
        }

        // ── MachineOptionMatrixEngine ──────────────────────────────────────

        case "option_matrix_get": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = { ok: true, matrix: machineOptionMatrixEngine.getMatrix((params as any).machineId) };
          break;
        }
        case "option_matrix_get_all": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = { ok: true, matrices: machineOptionMatrixEngine.getAllMatrices() };
          break;
        }
        case "option_matrix_get_by_type": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = {
            ok: true,
            matrices: machineOptionMatrixEngine.getMachinesByType((params as any).machineType),
          };
          break;
        }
        case "option_matrix_get_by_manufacturer": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = {
            ok: true,
            matrices: machineOptionMatrixEngine.getMachinesByManufacturer((params as any).manufacturer),
          };
          break;
        }
        case "option_matrix_validate_config": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = machineOptionMatrixEngine.validateConfiguration(params as any);
          break;
        }
        case "option_matrix_get_available": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = {
            ok: true,
            options: machineOptionMatrixEngine.getAvailableOptions(
              (params as any).machineId,
              (params as any).currentSelection,
            ),
          };
          break;
        }
        case "option_matrix_get_default": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = {
            ok: true,
            defaults: machineOptionMatrixEngine.getDefaultConfiguration((params as any).machineId),
          };
          break;
        }
        case "option_matrix_calculate_price": {
          const { machineOptionMatrixEngine } = await import(
            "../../engines/MachineOptionMatrixEngine.js"
          );
          result = machineOptionMatrixEngine.calculatePriceAdder(params as any);
          break;
        }

        // ── MachinePackageAPIEngine ────────────────────────────────────────

        case "package_api_get": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.getPackage((params as any).machine_id);
          break;
        }
        case "package_api_list": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.listPackages(params as any);
          break;
        }
        case "package_api_search": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.searchPackages(params as any);
          break;
        }
        case "package_api_create_overlay": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.createOverlay((params as any).input as any);
          break;
        }
        case "package_api_update_overlay": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.updateOverlay((params as any).input as any);
          break;
        }
        case "package_api_delete_overlay": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.deleteOverlay((params as any).overlay_id);
          break;
        }
        case "package_api_check_compatibility": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.checkCompatibility((params as any).input as any);
          break;
        }
        case "package_api_get_coverage_stats": {
          const { machinePackageAPIEngine } = await import(
            "../../engines/MachinePackageAPIEngine.js"
          );
          result = machinePackageAPIEngine.getCoverageStats();
          break;
        }

        // ── MachinePackageSelectionEngine ──────────────────────────────────

        case "package_select": {
          const { machinePackageSelectionEngine } = await import(
            "../../engines/MachinePackageSelectionEngine.js"
          );
          result = machinePackageSelectionEngine.select((params as any).requirements);
          break;
        }
        case "package_select_self_awareness": {
          const { machinePackageSelectionEngine } = await import(
            "../../engines/MachinePackageSelectionEngine.js"
          );
          result = { ok: true, ...machinePackageSelectionEngine.getSelfAwareness() };
          break;
        }

        // ── MachineProfilePropagationEngine ───────────────────────────────

        case "propagation_get_quote_context": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          result = {
            ok: true,
            context: machineProfilePropagationEngine.getQuoteContext((params as any).machine_id),
          };
          break;
        }
        case "propagation_get_quote_contexts": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          const ctxMap = machineProfilePropagationEngine.getQuoteContexts((params as any).machine_ids);
          result = { ok: true, contexts: Object.fromEntries(ctxMap) };
          break;
        }
        case "propagation_get_scheduling": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          result = {
            ok: true,
            context: machineProfilePropagationEngine.getSchedulingContext((params as any).machine_id),
          };
          break;
        }
        case "propagation_get_feasibility": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          result = {
            ok: true,
            context: machineProfilePropagationEngine.getFeasibilityContext((params as any).machine_id),
          };
          break;
        }
        case "propagation_run_what_if": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          result = machineProfilePropagationEngine.runWhatIfAnalysis((params as any).input as any);
          break;
        }
        case "propagation_compare_machines": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          result = machineProfilePropagationEngine.compareMachines((params as any).input as any);
          break;
        }
        case "propagation_propagate_all": {
          const { machineProfilePropagationEngine } = await import(
            "../../engines/MachineProfilePropagationEngine.js"
          );
          result = { ok: true, stats: machineProfilePropagationEngine.propagateAll() };
          break;
        }

        // ── MachineToolErrorBudgetEngine ───────────────────────────────────

        case "tool_error_compute_budget": {
          const { machineToolErrorBudgetEngine } = await import(
            "../../engines/MachineToolErrorBudgetEngine.js"
          );
          result = machineToolErrorBudgetEngine.analyze(params as any);
          break;
        }
        case "tool_error_abbe": {
          const { machineToolErrorBudgetEngine } = await import(
            "../../engines/MachineToolErrorBudgetEngine.js"
          );
          result = {
            ok: true,
            abbe_error_um: machineToolErrorBudgetEngine.abbeAmplification(
              (params as any).scaleError_um,
              (params as any).angularError_urad,
              (params as any).abbeOffset_mm,
            ),
          };
          break;
        }
        case "tool_error_thermal_growth": {
          const { machineToolErrorBudgetEngine } = await import(
            "../../engines/MachineToolErrorBudgetEngine.js"
          );
          result = {
            ok: true,
            thermal_growth_um: machineToolErrorBudgetEngine.thermalGrowth(
              (params as any).length_mm,
              (params as any).deltaT_C,
              (params as any).alpha_um_m_C,
            ),
          };
          break;
        }
        case "tool_error_rss_combine": {
          const { machineToolErrorBudgetEngine } = await import(
            "../../engines/MachineToolErrorBudgetEngine.js"
          );
          result = {
            ok: true,
            rss_total_um: machineToolErrorBudgetEngine.rssCombine((params as any).errors_um),
          };
          break;
        }
        case "tool_error_worst_case_combine": {
          const { machineToolErrorBudgetEngine } = await import(
            "../../engines/MachineToolErrorBudgetEngine.js"
          );
          result = {
            ok: true,
            worst_case_total_um: machineToolErrorBudgetEngine.worstCaseCombine((params as any).errors_um),
          };
          break;
        }

        default: {
          // TypeScript exhaustiveness: unreachable at runtime because the
          // z.enum guard above already rejects unknown actions.
          result = { ok: false, error: "unknown_action", action };
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );
}
