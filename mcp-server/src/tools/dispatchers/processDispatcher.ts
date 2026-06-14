/**
 * processDispatcher.ts — prism_process MCP dispatcher
 * =====================================================
 *
 * Wires 7 previously-dormant Process-domain engines as a single coherent
 * MCP tool surface (PSN-SYNERGY / PROCESS-WIRING).
 *
 * Action map (18 actions, 7 engines):
 *
 *   capability_predict          → ProcessCapabilityPredictionEngine.predict()
 *
 *   digital_twin_compute        → ProcessDigitalTwinEngine.compute()
 *
 *   env_add_coefficient         → processEnvironmentSensitivityEngine.addCoefficient()
 *   env_assess_risks            → processEnvironmentSensitivityEngine.assessEnvironmentalRisks()
 *   env_calculate_corrections   → processEnvironmentSensitivityEngine.calculateCorrections()
 *   env_get_coefficients        → processEnvironmentSensitivityEngine.getCoefficients()
 *   env_optimal_window          → processEnvironmentSensitivityEngine.calculateOptimalWindow()
 *   env_record                  → processEnvironmentSensitivityEngine.recordEnvironment()
 *   env_trends                  → processEnvironmentSensitivityEngine.getEnvironmentTrends()
 *
 *   robustness_compute          → ProcessRobustnessEngine.compute()
 *
 *   router_full_pipeline        → ProcessIntelligenceRouterEngine.fullPipeline()
 *   router_list_stages          → ProcessIntelligenceRouterEngine.listSupportedStages()
 *   router_orchestrate          → ProcessIntelligenceRouterEngine.orchestrate()
 *   router_route                → ProcessIntelligenceRouterEngine.route()
 *
 *   validation_stats            → processValidationIQOQPQEngine.getStats()
 *   validation_validate         → processValidationIQOQPQEngine.validate()
 *
 *   variability_analyze         → processVariabilityIntegrationEngine.analyze()
 *
 * Note: NO cross-wire to aiReasoningDispatcher this round (PSN-SYNERGY scope).
 *
 * @module tools/dispatchers/processDispatcher
 * @milestone PSN-SYNERGY / PROCESS-WIRING
 */

import { z } from "zod";
import {
  EmptyInputSchema,
  CapabilityPredictSchema,
  DigitalTwinComputeSchema,
  EnvCalculateCorrectionsSchema,
  EnvAssessRisksSchema,
  EnvOptimalWindowSchema,
  EnvRecordSchema,
  EnvTrendsSchema,
  EnvAddCoefficientSchema,
  RouterRouteSchema,
  RouterFullPipelineSchema,
  RouterOrchestrateSchema,
  RobustnessComputeSchema,
  ValidationValidateSchema,
  VariabilityAnalyzeSchema,
} from "../../schemas/processActionSchemas.js";

// ─── Action enum (alphabetically sorted within logical groups) ────────────────

const CAPABILITY_ACTIONS = [
  "capability_predict",
] as const;

const DIGITAL_TWIN_ACTIONS = [
  "digital_twin_compute",
] as const;

const ENV_ACTIONS = [
  "env_add_coefficient",
  "env_assess_risks",
  "env_calculate_corrections",
  "env_get_coefficients",
  "env_optimal_window",
  "env_record",
  "env_trends",
] as const;

const ROBUSTNESS_ACTIONS = [
  "robustness_compute",
] as const;

const ROUTER_ACTIONS = [
  "router_full_pipeline",
  "router_list_stages",
  "router_orchestrate",
  "router_route",
] as const;

const VALIDATION_ACTIONS = [
  "validation_stats",
  "validation_validate",
] as const;

const VARIABILITY_ACTIONS = [
  "variability_analyze",
] as const;

const ALL_ACTIONS = [
  ...CAPABILITY_ACTIONS,
  ...DIGITAL_TWIN_ACTIONS,
  ...ENV_ACTIONS,
  ...ROBUSTNESS_ACTIONS,
  ...ROUTER_ACTIONS,
  ...VALIDATION_ACTIONS,
  ...VARIABILITY_ACTIONS,
] as const;

type ProcessAction = (typeof ALL_ACTIONS)[number];

// ─── Input schema lookup ──────────────────────────────────────────────────────

const ACTION_SCHEMAS: Record<ProcessAction, z.ZodTypeAny> = {
  capability_predict: CapabilityPredictSchema,
  digital_twin_compute: DigitalTwinComputeSchema,
  env_add_coefficient: EnvAddCoefficientSchema,
  env_assess_risks: EnvAssessRisksSchema,
  env_calculate_corrections: EnvCalculateCorrectionsSchema,
  env_get_coefficients: EmptyInputSchema,
  env_optimal_window: EnvOptimalWindowSchema,
  env_record: EnvRecordSchema,
  env_trends: EnvTrendsSchema,
  robustness_compute: RobustnessComputeSchema,
  router_full_pipeline: RouterFullPipelineSchema,
  router_list_stages: EmptyInputSchema,
  router_orchestrate: RouterOrchestrateSchema,
  router_route: RouterRouteSchema,
  validation_stats: EmptyInputSchema,
  validation_validate: ValidationValidateSchema,
  variability_analyze: VariabilityAnalyzeSchema,
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the prism_process MCP tool on the server.
 * @param server — MCP server instance
 */
export function registerProcessDispatcher(server: any): void {
  server.tool(
    "prism_process",
    [
      "Process-domain intelligence dispatcher — 18 actions across 7 engines.",
      "Covers: pre-production capability prediction (Cp/Cpk/PPM via RSS + Monte Carlo),",
      "multi-physics digital twin (Kienzle→beam→Jaeger→Taylor→Brammertz→cost cascade),",
      "environmental sensitivity (corrections, risk assessment, optimal operating window,",
      "trend analysis), process robustness index (Taguchi perturbation, SNR),",
      "cross-process intelligence routing (classify/feature/speedfeed/post/ai pipeline),",
      "FDA IQ/OQ/PQ process validation (Cpk gating, consecutive runs), and",
      "unified variability pipeline (stochastic multi-physics Monte Carlo, variance budget).",
    ].join(" "),
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]).describe(
        "Process engine action to invoke",
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
      const schema = ACTION_SCHEMAS[action as ProcessAction];
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

      switch (action as ProcessAction) {
        // ── Capability Prediction ──────────────────────────────────────────
        case "capability_predict": {
          const { processCapabilityPredictionEngine } = await import(
            "../../engines/ProcessCapabilityPredictionEngine.js"
          );
          result = processCapabilityPredictionEngine.predict(params as any);
          break;
        }

        // ── Digital Twin ───────────────────────────────────────────────────
        case "digital_twin_compute": {
          const { processDigitalTwinEngine } = await import(
            "../../engines/ProcessDigitalTwinEngine.js"
          );
          result = processDigitalTwinEngine.compute(params as any);
          break;
        }

        // ── Environmental Sensitivity ──────────────────────────────────────
        case "env_calculate_corrections": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          const { environment, parameters } = params as any;
          result = {
            ok: true,
            corrections: processEnvironmentSensitivityEngine.calculateCorrections(
              environment,
              parameters,
            ),
          };
          break;
        }
        case "env_assess_risks": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          result = {
            ok: true,
            risks: processEnvironmentSensitivityEngine.assessEnvironmentalRisks(
              (params as any).environment,
            ),
          };
          break;
        }
        case "env_optimal_window": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          result = processEnvironmentSensitivityEngine.calculateOptimalWindow(
            (params as any).environment,
          );
          break;
        }
        case "env_record": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          processEnvironmentSensitivityEngine.recordEnvironment((params as any).environment);
          result = { ok: true, recorded: true };
          break;
        }
        case "env_trends": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          result = {
            ok: true,
            trends: processEnvironmentSensitivityEngine.getEnvironmentTrends(
              (params as any).hours,
            ),
          };
          break;
        }
        case "env_add_coefficient": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          processEnvironmentSensitivityEngine.addCoefficient(params as any);
          result = { ok: true, added: true };
          break;
        }
        case "env_get_coefficients": {
          const { processEnvironmentSensitivityEngine } = await import(
            "../../engines/ProcessEnvironmentSensitivityEngine.js"
          );
          result = {
            ok: true,
            coefficients: processEnvironmentSensitivityEngine.getCoefficients(),
          };
          break;
        }

        // ── Robustness ─────────────────────────────────────────────────────
        case "robustness_compute": {
          const { processRobustnessEngine } = await import(
            "../../engines/ProcessRobustnessEngine.js"
          );
          result = processRobustnessEngine.compute(params as any);
          break;
        }

        // ── Intelligence Router ────────────────────────────────────────────
        case "router_route": {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          result = await ProcessIntelligenceRouterEngine.route(params as any);
          break;
        }
        case "router_full_pipeline": {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          result = await ProcessIntelligenceRouterEngine.fullPipeline(params as any);
          break;
        }
        case "router_list_stages": {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          result = {
            ok: true,
            stages: ProcessIntelligenceRouterEngine.listSupportedStages(),
          };
          break;
        }
        case "router_orchestrate": {
          const { ProcessIntelligenceRouterEngine } = await import(
            "../../engines/ProcessIntelligenceRouterEngine.js"
          );
          // params already validated against RouterOrchestrateSchema which mirrors
          // DomainAGIIntentSchema — pass through directly; engine re-validates internally.
          result = await ProcessIntelligenceRouterEngine.orchestrate(params as any);
          break;
        }

        // ── Validation IQ/OQ/PQ ────────────────────────────────────────────
        case "validation_validate": {
          const { processValidationIQOQPQEngine } = await import(
            "../../engines/ProcessValidationIQOQPQEngine.js"
          );
          result = processValidationIQOQPQEngine.validate(params as any);
          break;
        }
        case "validation_stats": {
          const { processValidationIQOQPQEngine } = await import(
            "../../engines/ProcessValidationIQOQPQEngine.js"
          );
          result = { ok: true, ...processValidationIQOQPQEngine.getStats() };
          break;
        }

        // ── Variability Pipeline ───────────────────────────────────────────
        case "variability_analyze": {
          const { processVariabilityIntegrationEngine } = await import(
            "../../engines/ProcessVariabilityIntegrationEngine.js"
          );
          result = processVariabilityIntegrationEngine.analyze(params as any);
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
