/**
 * prism_ai — AI Reasoning Dispatcher
 * ====================================
 * Routes AI reasoning requests through MillMasterOrchestratorFacadeEngine.
 *
 * Actions (6):
 *   ai_route_mill_pipeline     — Full P2P pipeline orchestration
 *   ai_mill_agi_reason         — Multi-mode AGI reasoning
 *   ai_mill_awareness_query    — Query mill engine capabilities
 *   ai_mill_scientific_analyze — Physics-backed calculations
 *   ai_mill_wisdom_query       — Tribal knowledge queries
 *   ai_mill_adaptive_strategy  — Adaptive toolpath strategies
 *
 * @module tools/dispatchers/aiReasoningDispatcher
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { resolveRepoRoot } from "../../utils/resolve-repo-root.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../../schemas/aiReasoningActionSchemas.js";
import {
  AI_CAPABILITY_ACTIONS,
  ACTION_AI_CAPABILITY_SCHEMAS,
  type AICapabilityAction,
} from "../../schemas/aiCapabilityActionSchemas.js";
// Type-only imports to narrow `params.*` casts to the engine's actual shapes
// (was Record<string, unknown> / string — too loose for typed signatures).
import type { ToolGeometry } from "../../engines/MillMasterOrchestratorFacadeEngine.js";
import type { TaskCategoryT } from "../../schemas/successPatternSchema.js";

// ============================================================================
// AI-MAX-MS0/U-AIMAX10 — merge capability/resource/training action surface
// into the existing prism_ai dispatcher so callers see one unified action set.
// ALL_AI_ACTIONS is the wire-level tuple used by z.enum(...); ALL_AI_SCHEMAS
// is the per-action Zod validation map handed to validateActionParams.
// ============================================================================
// PSN-SYNERGY/OUTCOME-WIRING cross-wire pass-throughs for the 4 most-consumed
// Outcome actions. Canonical home is prism_outcome (outcomeDispatcher); these
// thin pass-throughs let callers already on prism_ai invoke them without
// migrating. Schemas are permissive here — outcomeDispatcher holds the strict
// Zod validation. Adding them to ALL_AI_ACTIONS makes the switch exhaustive.
const OUTCOME_CROSSWIRE_ACTIONS = [
  "outcome_trace_record",
  "outcome_log",
  "outcome_query",
  "outcome_stats",
] as const;
type OutcomeCrosswireAction = (typeof OUTCOME_CROSSWIRE_ACTIONS)[number];
const OUTCOME_CROSSWIRE_SCHEMAS: Record<OutcomeCrosswireAction, z.ZodTypeAny> = {
  outcome_trace_record: z.record(z.string(), z.unknown()),
  outcome_log: z.record(z.string(), z.unknown()),
  outcome_query: z.record(z.string(), z.unknown()),
  outcome_stats: z.record(z.string(), z.unknown()),
};

// ============================================================================
// U-RAG-PSN-AI-WIRE (2026-05-22, slot golf) — synergize RAG with PSN leg #11.
// RAG-UPGRADE-MS0 shipped U-RAG-1..5 with wiring into system-viz / obsidian /
// wiki / GNN. The aiReasoningDispatcher (canonical AI surface, 257+ actions)
// was the missing leg — operators routing through prism_ai had zero RAG
// retrieval surface. This cross-wires ReRankerEngine (canonical home is
// prism_ml) so RAG retrieval is reachable from the AI dispatcher too.
// Per dispatcher convention "cross-dispatcher calls forbidden — use shared
// engines instead", both prism_ml:rag_rerank and prism_ai:rag_rerank call the
// same static ReRankerEngine.rerank/diverseRerank — no delegation chain.
// ============================================================================
const RAG_CROSSWIRE_ACTIONS = [
  "rag_rerank",
] as const;
type RagCrosswireAction = (typeof RAG_CROSSWIRE_ACTIONS)[number];
const RAG_CROSSWIRE_SCHEMAS: Record<RagCrosswireAction, z.ZodTypeAny> = {
  // ReRankerEngine validates input internally via ReRankInputSchema; this
  // outer schema is intentionally permissive so callers see uniform error
  // shape from the engine validator (not split between zod+engine).
  rag_rerank: z.record(z.string(), z.unknown()),
};

// U-PSN-AI-DISP-LORA (papa /loop iter6, 2026-05-23) — close
// BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8 spec "Wire to: prism_ai" requirement.
// Mirror of cadDispatcher's blueprint_lora_* actions. Same engine singleton
// (BlueprintLoRABridgeEngine), always-on anonymization HARD RULE applies.
// LoRA bundle production IS AI-routing work — fine-tuned endpoint registers
// back into AISystemRouterEngine as a new backend (closing the loop).
const BLUEPRINT_LORA_ACTIONS = [
  "blueprint_lora_prepare_set",
  "blueprint_lora_export",
  "blueprint_lora_register_endpoint",
  "blueprint_lora_history",
] as const;
type BlueprintLoRAAction = (typeof BLUEPRINT_LORA_ACTIONS)[number];
const BLUEPRINT_LORA_SCHEMAS: Record<BlueprintLoRAAction, z.ZodTypeAny> = {
  blueprint_lora_prepare_set: z.record(z.string(), z.unknown()),
  blueprint_lora_export: z.record(z.string(), z.unknown()),
  blueprint_lora_register_endpoint: z.record(z.string(), z.unknown()),
  blueprint_lora_history: z.record(z.string(), z.unknown()),
};

// ============================================================================
// CAD-FUSION-LIVE-MS0/iter4 — wire 38 unwired AI/ML/reasoning engines into
// prism_ai so they are reachable through the MCP interface.
// Skipped (3): EnsembleMLEngine (no singleton), reactiveChainBootstrap
//   (module-level side-effect, no callable singleton),
//   TribalKnowledgeOutcomeBridgeEngine + KnowledgeGraphFeatureProjectorEngine +
//   XProcNeuralAutoFireEngine (already wired via XPROC_ROUTES above — 3
//   counted as 1 skip group since they surface through xproc_* actions).
// ============================================================================
const ITER4_AI_ACTIONS = [
  // Uncertainty / metrology
  "mixer_agitator_calculate",
  "metrology_uncertainty_type_a",
  "metrology_uncertainty_type_b",
  "metrology_uncertainty_combined",
  "uncertainty_propagation_analytical",
  "uncertainty_propagation_monte_carlo",
  "uncertainty_pipeline_run",
  // ML formulas / ensemble
  "aiml_feature_importance",
  "aiml_model_selection",
  "aiml_anomaly_detection",
  "aiml_time_series",
  "aiml_reinforcement_learning",
  "aiml_calculate",
  "ensemble_random_forest",
  "ensemble_gradient_boosting",
  "ensemble_gaussian_mixture",
  // Video e-learning / inference
  "video_elearning_search",
  "video_elearning_recommend",
  "video_elearning_process_course",
  "chain_executor_execute",
  "inference_chain_run",
  // Orchestration / reasoning
  "unified_ppagi_orchestrate",
  "unified_ppagi_stats",
  "formula_integration_query",
  "formula_integration_stats",
  "force_neural_predict",
  "force_neural_predict_batch",
  "fusion_strategy_select",
  "fusion_strategy_compare",
  "paired_bundle_register",
  "paired_bundle_validate",
  "decision_reasoning_decide",
  "decision_reasoning_select_machine",
  "dependency_graph_impact",
  "dependency_graph_stats",
  "domain_orchestrator_find",
  "domain_orchestrator_list",
  // Knowledge graph / neural bridge / LoRA
  "kg_neural_bridge_search",
  "kg_neural_bridge_add",
  "mit_course_knowledge_query",
  "catia_test_run_step",
  "catia_test_register",
  "machine_lora_base_info",
  "ml_lineage_link",
  "ml_lineage_trace",
  "ml_lineage_stats",
  "lora_adapter_register",
  "lora_adapter_resolve",
  "lora_adapter_list",
  "lora_adapter_stats",
  "training_snapshot_create",
  "training_snapshot_load",
  "training_snapshot_list",
  "training_snapshot_stats",
  "detached_lora_runner_info",
  // Deep AI / error / consensus / cross-process
  "deep_ai_reason",
  "deep_ai_learn",
  "deep_ai_logic",
  "deep_ai_extended_thinking",
  "error_explainer_explain",
  "error_explainer_categories",
  "consensus_ai_bridge_reason",
  "cross_process_ai_classify",
  "cross_process_ai_orchestrate",
  "consensus_neural_feedback_record",
  "consensus_neural_feedback_recent",
  // Knowledge injection / tribal / coordinator / cross-domain
  "knowledge_injection_plan",
  "knowledge_injection_execute",
  "knowledge_injection_record_outcome",
  "tribal_applicator_apply",
  "full_system_coordinator_coordinate",
  "full_system_coordinator_route_specialist",
  "cross_domain_orchestrate",
] as const;
type Iter4AIAction = (typeof ITER4_AI_ACTIONS)[number];
const ITER4_AI_SCHEMAS = Object.fromEntries(
  ITER4_AI_ACTIONS.map((a) => [a, z.record(z.string(), z.unknown())])
) as unknown as Record<Iter4AIAction, z.ZodTypeAny>;

// ──────────────────────────────────────────────────────────────────────
// WIRE-AI-DIRECT-MS0/U-VICTOR-AI-DIRECT (slot:victor, 2026-05-26)
// 4 actions for previously-unwired AI/knowledge sub-engines from the fresh
// audit. Passthrough schemas at the dispatcher edge — engines own their
// input validation. Bridge value: tribal-outcome telemetry + KG features +
// PPR ranking + approval-chain status all become MCP-callable as a unified
// AI surface, instead of being dead engines on disk.
// ──────────────────────────────────────────────────────────────────────
const VICTOR_AI_DIRECT_ACTIONS = [
  "tribal_outcome_bridge_status",
  "knowledge_graph_project",
  "graph_importance_rank_global",
  "graph_context_lens_extract",
  "graphrag_retrieve",
  "approval_chain_get",
] as const;
type VictorAIDirectAction = typeof VICTOR_AI_DIRECT_ACTIONS[number];
const VICTOR_AI_DIRECT_SCHEMAS = {
  tribal_outcome_bridge_status: z.object({}).passthrough()
    .describe("TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes — read-only status check of the outcome-feed subscription."),
  knowledge_graph_project: z.object({}).passthrough()
    .describe("KnowledgeGraphFeatureProjectorEngine.project — project a graph node into the dense feature space (returns ProjectResult). Engine validates input."),
  graph_importance_rank_global: z.object({}).passthrough()
    .describe("GraphImportanceEngine.rankGlobal — global PageRank-style importance over the supplied graph. Inputs: { graph, topK?, damping? }. Returns PPROutput."),
  graph_context_lens_extract: z.object({
    nodeId: z.string().min(1).optional().describe("Center node id for the ego-graph (e.g. eng.mill.facemill)"),
    domain: z.string().min(1).optional().describe("Extract a whole domain slice instead of an ego-graph (e.g. 'mill')"),
    hops: z.number().int().min(0).max(12).optional().describe("Ego-graph radius (default 1, clamped to 12; 0 = center node only)"),
    maxNodes: z.number().int().min(1).optional().describe("Max nodes in the slice (default 200)"),
    format: z.enum(["json", "markdown", "mermaid"]).optional().describe("Render projection format (default json)"),
    enrich: z.boolean().optional().describe("Enrich nodes with label/layer/kind/status via seekCard (default true)"),
  }).refine((d) => Boolean(d.nodeId) || Boolean(d.domain), { message: "graph_context_lens_extract requires nodeId or domain" })
    .describe("GraphContextLensEngine -- scoped ego-graph or domain slice of the system-viz graph as LLM context (GRAPH-AS-LLM-CONTEXT-MS0 U-GAC01)."),
  graphrag_retrieve: z.object({
    query: z.string().min(1).describe("Free-text query to retrieve relevant graph entities for"),
    topK: z.number().int().min(1).max(50).optional().describe("Entities returned (default 10)"),
    topSeeds: z.number().int().min(1).max(20).optional().describe("Query-matched seeds ego-expanded (default 5)"),
    hops: z.number().int().min(0).max(3).optional().describe("Ego expansion radius (default 1)"),
    maxNodes: z.number().int().min(1).optional().describe("Per-seed ego cap (default 50)"),
    useLlm: z.boolean().optional().describe("Opt in to Ollama summarization (default: deterministic extractive, no network)"),
    noLlm: z.boolean().optional().describe("Force the deterministic extractive summary (the default; overrides useLlm)"),
  }).describe("GraphRAGRetrievalEngine.retrieve -- GraphRAG over wiki + system-graph: query-matched entities + ego-graph expansion + summary. Summary deterministic by default; useLlm=true opts into fail-soft Ollama (GRAPH-AS-LLM-CONTEXT-MS0 U-GAC02)."),
  approval_chain_get: z.object({
    chain_id: z.string().min(1).describe("Approval-chain identifier"),
  }).passthrough()
    .describe("ApprovalChainEngine.getChain — read an approval chain (status + steps + signoffs). Read-only operator query."),
} as const;

// ──────────────────────────────────────────────────────────────────────
// BLACKWELL-AI-MS0/U-CAP-PROBE (slot:india, 2026-06-03) — runtime capability
// probe. OllamaCapabilityProbeEngine does the live nvidia-smi + /api/tags I/O
// that ModelRoutingEngine (pure scorer) deliberately delegates to callers:
// detect the HardwareProfile, WDDM-correct free VRAM, list present + loaded +
// runnable Ollama models. Read-only; fail-soft (degrades to cloud_only on
// missing GPU / Ollama down). The keystone the Blackwell-AI consumers gate on.
// ──────────────────────────────────────────────────────────────────────
const CAP_PROBE_ACTIONS = [
  "capability_probe",
] as const;
type CapProbeAction = typeof CAP_PROBE_ACTIONS[number];
const CAP_PROBE_SCHEMAS = {
  capability_probe: z.object({
    force: z.boolean().optional().describe("Bypass the 5-min snapshot cache and re-probe the live host."),
  }).passthrough()
    .describe("OllamaCapabilityProbeEngine.probe — runtime host capability snapshot: detected HardwareProfile, WDDM-corrected free VRAM, present + loaded + runnable Ollama models, backend availability. The sole runtime authority feeding ModelRoutingEngine."),
} as const;

// ULTRACODE-SYNERGY-MS0 / Order 3 — GRPO group-relative reward normalizer.
// Critic-free across-N-trajectory advantage normalization (DeepSeek-R1 GRPO).
// Canonical home is the AI surface — it turns a GROUP of trajectory rewards (from
// the reward shapers / PolicyExperienceLedger.reward_total) into the advantage
// tensor a policy-gradient step consumes. Pure engine; permissive outer schema,
// the engine validates internally and never throws.
// RBA/U-RBA-ENGINE-02 (slot:india) -- reason-before-action pre-flight gate.
// Classifies a proposed tool action's risk and consults a LOCAL-ONLY Ollama
// consensus panel (octopus) -> PROCEED|REVISE|BLOCK. Fail-open, $0, no-recursion.
const REASON_BEFORE_ACTION_ACTIONS = ["reason_before_action"] as const;
type ReasonBeforeActionAction = (typeof REASON_BEFORE_ACTION_ACTIONS)[number];
const REASON_BEFORE_ACTION_SCHEMAS: Record<ReasonBeforeActionAction, z.ZodTypeAny> = {
  reason_before_action: z.object({
    intent: z.string().min(1),
    tool_name: z.string().optional(),
    tool_input: z.record(z.string(), z.unknown()).optional(),
    risk_level: z.enum(["low", "medium", "high"]).optional(),
  }).describe("Multi-model pre-flight reasoning gate (octopus, local-only Ollama panel). Returns verdict(PROCEED|REVISE|BLOCK)+rationale+agreementScore. Read-only, never mutates."),
};

const GRPO_ACTIONS = [
  "group_normalize_reward",
  // ULTRACODE-SYNERGY-MS0 / Order 4 — RULER trajectory ranking. Judge ranks N
  // trajectories relative to the system prompt → relative reward → GRPO advantage.
  "rank_trajectories",
] as const;
type GrpoAction = (typeof GRPO_ACTIONS)[number];
const GRPO_SCHEMAS: Record<GrpoAction, z.ZodTypeAny> = {
  group_normalize_reward: z.record(z.string(), z.unknown()),
  rank_trajectories: z.record(z.string(), z.unknown()),
};

// INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11) -- surfaces the DATA introspection of india's
// dispatcher-DARK AI-systems engines (built + in-process-consumed but with ZERO MCP surface).
// Classified by an ultracode sonnet fan-out (wf_4ebeaa0f-2cc): 8 of 21 dark AI engines are
// WIRE_SAFE_DATA. R12 INVARIANT (carried from the SFC sweep): expose deterministic DATA / stats /
// readiness / provenance ONLY -- NEVER trained-model NN inference (india keeps inference gated until
// trained). Unit 1 = KnowledgeLineageEngine (pure read-only provenance graph; getLineageReport/
// getStats/getPendingConflicts are deterministic graph/ledger reads -- no NN path).
const INDIA_AI_ORPHAN_ACTIONS = [
  // Unit 1 -- KnowledgeLineageEngine (pure read-only provenance graph).
  "knowledge_lineage_report",
  "knowledge_lineage_stats",
  "knowledge_lineage_pending_conflicts",
  // Unit 2 -- LocalEmbeddingEngine (zero-service ONNX MiniLM embedding backbone; the india-AI-core
  // RAG vectorizer, dispatcher-dark with 3 dispatcher-dark consumers). status = readiness/model;
  // similarity = pure cosine math over caller-supplied vectors. embed() is intentionally NOT surfaced
  // (it lazy-loads a ~90MB ONNX model -- heavyweight for an MCP call; memory/index pipelines call it
  // in-process). Both wired actions are deterministic DATA -- no NN inference/prediction.
  "local_embedding_status",
  "local_embedding_similarity",
  // Unit 3 -- IntentClassifierEngine (PUOA tier-routing classifier; pure regex/keyword over
  // CATEGORY_PATTERNS/ENTITY_PATTERNS/TIER_ESCALATION_KEYWORDS -- no NN). All three methods are
  // deterministic string analysis; classify/quickClassify return routing metadata, extractEntities
  // returns matched entities. R12-safe DATA only.
  "classify_intent",
  "quick_classify_intent",
  "extract_intent_entities",
  // Unit 4 -- PolicyExperienceLedgerEngine (append-only RL (s,a,r,s') JSONL store; offline-RL feed).
  // Read-only surfaces ONLY: stats() = totals/by-domain/by-adapter/reward summary; query() = filtered
  // tuple read (safeParse-guarded, never throws). append() is a WRITE -- deliberately NOT wired (R12 DATA-only).
  "policy_experience_stats",
  "policy_experience_query",
  // Unit 5 -- TemporalReasoningEngine (in-memory timeline ledger; deterministic OLS linear-regression).
  // snapshots() = chronological series read; project() = slope/intercept/r2 over the last window;
  // forecast() = ETA-to-target from the projection. All pure math over recorded snapshots; record() is a
  // WRITE -- NOT wired. R12-safe DATA only (no NN).
  "temporal_snapshots",
  "temporal_project",
  "temporal_forecast",
  // Unit 6 -- RealTimeAnomalyDetectionEngine (5 deterministic statistical detectors:
  // CUSUM/EWMA/Mahalanobis/FFT/Wavelet -- NO trained model). detect() is a pure function of the input
  // sensor window (process-health monitoring, never machine control). The case guards samples/rate so a
  // bad caller gets a specific error, not an engine throw. R12-safe DATA only.
  "detect_cutting_anomalies",
  // Unit 7 -- KnowledgeIngestionOrchestratorEngine (resource discovery + ingestion orchestrator).
  // getStats() = processed-count snapshot (cheap, sync); getPending() = read-only pending-resource scan
  // (triggers a bounded disk discoverResources() scan -- no writes). runPipeline()/ingestResource() are
  // side-effecting -- NOT wired. R12-safe DATA only.
  "knowledge_ingestion_stats",
  "knowledge_ingestion_pending",
  // Unit 8 -- blueprint closed-loop drain (U-BPA-LOOP-DRAIN-DISPATCH). The offline
  // blueprint-accuracy consumer is print-only; this action is the LIVE final arrow:
  // it reads the accuracy ledger past the consumer's (isolated) offset, and routes the
  // 4 GENERAL cross-process learning primitives (drift/replay/ewc/predlog) in-process
  // via routeXprocAction. outcome_record is SKIPPED (CrossProcessOutcomeStore validates
  // process in {mill,lathe,wedm}; a blueprint extraction is process-agnostic -> its
  // ground truth stays ledger-only). Idempotent via the consumer-state offset; dryRun
  // computes the plan without dispatching or advancing.
  "blueprint_loop_drain",
] as const;
type IndiaAIOrphanAction = (typeof INDIA_AI_ORPHAN_ACTIONS)[number];
const INDIA_AI_ORPHAN_SCHEMAS: Record<IndiaAIOrphanAction, z.ZodTypeAny> = {
  // Permissive outer schema -- the case handler owns input validation so the
  // caller gets a specific error message (not a generic zod failure), matching
  // the SFC-wire pattern.
  knowledge_lineage_report: z.record(z.string(), z.unknown()),
  knowledge_lineage_stats: z.record(z.string(), z.unknown()),
  knowledge_lineage_pending_conflicts: z.record(z.string(), z.unknown()),
  local_embedding_status: z.record(z.string(), z.unknown()),
  local_embedding_similarity: z.record(z.string(), z.unknown()),
  classify_intent: z.record(z.string(), z.unknown()),
  quick_classify_intent: z.record(z.string(), z.unknown()),
  extract_intent_entities: z.record(z.string(), z.unknown()),
  policy_experience_stats: z.record(z.string(), z.unknown()),
  policy_experience_query: z.record(z.string(), z.unknown()),
  temporal_snapshots: z.record(z.string(), z.unknown()),
  temporal_project: z.object({
    series: z.string().min(1).describe("Series name (non-empty)"),
    windowSize: z.number().int().min(2).optional().describe("OLS window size (>= 2)"),
  }).passthrough(),
  temporal_forecast: z.record(z.string(), z.unknown()),
  detect_cutting_anomalies: z.record(z.string(), z.unknown()),
  knowledge_ingestion_stats: z.record(z.string(), z.unknown()),
  knowledge_ingestion_pending: z.record(z.string(), z.unknown()),
  // Permissive outer; the case validates dryRun + owns the fs/offset logic.
  blueprint_loop_drain: z.record(z.string(), z.unknown()),
};

// CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09/10 -- the closed-loop training ledger
// (MasterAITrainingLedgerEngine: every LoRA run across the 8 CAM pipelines) + the
// cross-pipeline drift coordinator (LoRADriftCoordinatorEngine: fires a master-retrain
// trigger when >=k pipelines drift inside a rolling window). Both engines shipped under
// the milestone but were never dispatcher-wired on this branch -- this group relands the
// surface the ai-dispatcher-ledger-wire.test.ts contract was written against. Read/compute
// DATA + a single config mutator; validation guards early-return dispatcherError.
const CAM_ML_LEDGER_ACTIONS = [
  "ledger_ingest",
  "ledger_query",
  "ledger_replay",
  "ledger_compare",
  "ledger_slo",
  "ledger_status",
  "ledger_drift_record",
  "ledger_drift_active",
  "ledger_drift_check",
  "ledger_drift_config",
] as const;
type CamMlLedgerAction = (typeof CAM_ML_LEDGER_ACTIONS)[number];
const CAM_ML_LEDGER_SCHEMAS: Record<CamMlLedgerAction, z.ZodTypeAny> = {
  // Permissive outer schemas -- each case owns input validation for a specific error.
  ledger_ingest: z.record(z.string(), z.unknown()),
  ledger_query: z.record(z.string(), z.unknown()),
  ledger_replay: z.record(z.string(), z.unknown()),
  ledger_compare: z.record(z.string(), z.unknown()),
  ledger_slo: z.record(z.string(), z.unknown()),
  ledger_status: z.record(z.string(), z.unknown()),
  ledger_drift_record: z.record(z.string(), z.unknown()),
  ledger_drift_active: z.record(z.string(), z.unknown()),
  ledger_drift_check: z.record(z.string(), z.unknown()),
  ledger_drift_config: z.record(z.string(), z.unknown()),
};

// WIRE-UNWIRED-PAPA / U-WIRE-XFER (slot:papa, 2026-06-15) -- surfaces the
// TransferLearningAdapterEngine (MILL-AGI P0.4 domain-adaptation; built +
// in-process but dispatcher-DARK). Deterministic registration / query / stats
// surface. NOTE: xfer_adapt runs the engine's simulated adaptation which uses
// Math.random internally -- its numeric outputs are non-deterministic by design;
// the wire passes data through faithfully and returns the engine's shaped result.
// Typed .passthrough() schemas validate required params at the boundary; the
// case handlers additionally guard the engine's throw-paths (createTask/adapt
// throw on a missing domain/task) so the caller gets a specific error.
const XFER_LEARN_ACTIONS = [
  "xfer_register_domain",
  "xfer_create_task",
  "xfer_domain_similarity",
  "xfer_feature_alignment",
  "xfer_instance_weights",
  "xfer_adapt",
  "xfer_get_tasks",
  "xfer_get_result",
  "xfer_statistics",
  "xfer_get_config",
] as const;
type XferLearnAction = (typeof XFER_LEARN_ACTIONS)[number];
const _xferDomain = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["material", "machine", "tool", "process"]),
    properties: z.record(z.string(), z.union([z.number(), z.string()])),
    sample_count: z.number(),
  })
  .passthrough();
const _xferSourcePoint = z.object({ features: z.array(z.number()), label: z.number() }).passthrough();
const _xferTargetPoint = z.object({ features: z.array(z.number()), label: z.number().optional() }).passthrough();
// instance-weights needs features ONLY (no label); features stays REQUIRED -- the
// engine derefs features.length unconditionally (computeBandwidth/gaussianKernel).
const _xferFeaturePoint = z.object({ features: z.array(z.number()) }).passthrough();
const XFER_LEARN_SCHEMAS: Record<XferLearnAction, z.ZodTypeAny> = {
  xfer_register_domain: z.object({ domain: _xferDomain }).passthrough(),
  xfer_create_task: z
    .object({
      source_id: z.string(),
      target_id: z.string(),
      task_type: z.enum(["force", "thermal", "tool_life", "surface", "chatter"]),
      method: z.enum(["fine_tune", "reweight", "align", "ewc"]).optional(),
    })
    .passthrough(),
  xfer_domain_similarity: z.object({ source_id: z.string(), target_id: z.string() }).passthrough(),
  xfer_feature_alignment: z
    .object({ source_features: z.array(z.string()), target_features: z.array(z.string()) })
    .passthrough(),
  xfer_instance_weights: z
    .object({ source_data: z.array(_xferFeaturePoint), target_data: z.array(_xferFeaturePoint) })
    .passthrough(),
  xfer_adapt: z
    .object({ task_id: z.string(), source_data: z.array(_xferSourcePoint), target_data: z.array(_xferTargetPoint) })
    .passthrough(),
  xfer_get_tasks: z.object({}).passthrough(),
  xfer_get_result: z.object({ task_id: z.string() }).passthrough(),
  xfer_statistics: z.object({}).passthrough(),
  xfer_get_config: z.object({}).passthrough(),
};

// WIRE-UNWIRED-PAPA / U-WIRE-ATTR (slot:papa, 2026-06-15) -- surfaces the
// AttractorDetectionEngine (dynamical-systems analysis; built + in-process but
// dispatcher-DARK). Deterministic (NO Math.random) read/analysis surface over an
// observed state trajectory: fixed points, limit cycles, Lyapunov exponent,
// stability, recurrence plot. detectBifurcations is intentionally NOT surfaced --
// it takes a (param) => StateVector[] closure that cannot cross a JSON boundary
// (same reason as the worklist DEFERRED engines). clear()/setConfig/import/export
// are state-mutating singleton ops, also withheld from the read surface.
const ATTR_DETECT_ACTIONS = [
  "attr_observe",
  "attr_observe_batch",
  "attr_detect_fixed_points",
  "attr_detect_limit_cycles",
  "attr_analyze",
  "attr_lyapunov",
  "attr_stability_metrics",
  "attr_recurrence_plot",
  "attr_get_attractors",
  "attr_trajectory_length",
  "attr_current_state",
  "attr_has_converged",
  "attr_get_config",
] as const;
type AttrDetectAction = (typeof ATTR_DETECT_ACTIONS)[number];
const _attrStateVector = z
  .object({ values: z.array(z.number()), timestamp: z.number().optional(), label: z.string().optional() })
  .passthrough();
const ATTR_DETECT_SCHEMAS: Record<AttrDetectAction, z.ZodTypeAny> = {
  attr_observe: z.object({ state: _attrStateVector }).passthrough(),
  attr_observe_batch: z.object({ states: z.array(_attrStateVector) }).passthrough(),
  attr_detect_fixed_points: z.object({}).passthrough(),
  attr_detect_limit_cycles: z.object({}).passthrough(),
  attr_analyze: z.object({}).passthrough(),
  attr_lyapunov: z.object({}).passthrough(),
  attr_stability_metrics: z.object({}).passthrough(),
  attr_recurrence_plot: z.object({ threshold: z.number().optional() }).passthrough(),
  attr_get_attractors: z.object({}).passthrough(),
  attr_trajectory_length: z.object({}).passthrough(),
  attr_current_state: z.object({}).passthrough(),
  attr_has_converged: z.object({}).passthrough(),
  attr_get_config: z.object({}).passthrough(),
};

// WIRE-UNWIRED-PAPA / U-WIRE-TPE (slot:papa, 2026-06-15) -- surfaces the
// TPEHyperparameterSearchEngine (Tree-structured Parzen Estimator, Optuna-style
// LoRA hyperparameter search; built + in-process but dispatcher-DARK). Full
// suggest/tell ask-tell loop + persistence (snapshot/load) + lifecycle (clear).
// Seeded PRNG (mulberry32) -> deterministic given a fixed seed + call sequence;
// clear() re-seeds. tpe_clear IS surfaced (unlike other engines' reset) because
// the budget exhausts at total_budget=8 -- without a reset the singleton search
// is single-use and unusable over MCP. tell() throws on a non-finite loss /
// out-of-order trial_id / invalid sample -> outer try/catch -> dispatcherError.
const TPE_SEARCH_ACTIONS = [
  "tpe_suggest",
  "tpe_tell",
  "tpe_best_trial",
  "tpe_list_trials",
  "tpe_get_config",
  "tpe_is_exhausted",
  "tpe_snapshot",
  "tpe_load_snapshot",
  "tpe_clear",
] as const;
type TpeSearchAction = (typeof TPE_SEARCH_ACTIONS)[number];
const _tpeHpSample = z
  .object({
    rank: z.union([z.literal(8), z.literal(16), z.literal(32), z.literal(64)]),
    alpha: z.number(),
    dropout: z.number(),
    lr: z.number(),
    warmup_ratio: z.number(),
    target_modules: z.enum(["qkvo", "all-linear"]),
  })
  .passthrough();
const _tpeSearchConfig = z
  .object({
    total_budget: z.number(),
    warmup_trials: z.number(),
    gamma_split: z.number(),
    candidates_per_tpe_step: z.number(),
    seed: z.number(),
  })
  .passthrough();
const TPE_SEARCH_SCHEMAS: Record<TpeSearchAction, z.ZodTypeAny> = {
  tpe_suggest: z.object({}).passthrough(),
  tpe_tell: z
    .object({
      trial_id: z.number(),
      sample: _tpeHpSample,
      loss: z.number(),
      elapsed_ms: z.number(),
      completed_at: z.number(),
      source: z.enum(["warmup", "tpe"]),
      note: z.string().optional(),
    })
    .passthrough(),
  tpe_best_trial: z.object({}).passthrough(),
  tpe_list_trials: z.object({}).passthrough(),
  tpe_get_config: z.object({}).passthrough(),
  tpe_is_exhausted: z.object({}).passthrough(),
  tpe_snapshot: z.object({}).passthrough(),
  tpe_load_snapshot: z
    .object({
      snapshot: z
        .object({ schemaVersion: z.number(), config: _tpeSearchConfig, trials: z.array(z.unknown()) })
        .passthrough(),
    })
    .passthrough(),
  tpe_clear: z.object({}).passthrough(),
};

const ALL_AI_ACTIONS = [
  ...AI_REASONING_ACTIONS,
  ...AI_CAPABILITY_ACTIONS,
  ...OUTCOME_CROSSWIRE_ACTIONS,
  ...RAG_CROSSWIRE_ACTIONS,
  ...BLUEPRINT_LORA_ACTIONS,
  ...ITER4_AI_ACTIONS,
  ...VICTOR_AI_DIRECT_ACTIONS,
  ...CAP_PROBE_ACTIONS,
  ...REASON_BEFORE_ACTION_ACTIONS,
  ...GRPO_ACTIONS,
  ...INDIA_AI_ORPHAN_ACTIONS,
  ...CAM_ML_LEDGER_ACTIONS,
  ...XFER_LEARN_ACTIONS,
  ...ATTR_DETECT_ACTIONS,
  ...TPE_SEARCH_ACTIONS,
] as const;
const ALL_AI_SCHEMAS = {
  ...ACTION_AI_REASONING_SCHEMAS,
  ...ACTION_AI_CAPABILITY_SCHEMAS,
  ...OUTCOME_CROSSWIRE_SCHEMAS,
  ...RAG_CROSSWIRE_SCHEMAS,
  ...BLUEPRINT_LORA_SCHEMAS,
  ...ITER4_AI_SCHEMAS,
  ...VICTOR_AI_DIRECT_SCHEMAS,
  ...CAP_PROBE_SCHEMAS,
  ...REASON_BEFORE_ACTION_SCHEMAS,
  ...GRPO_SCHEMAS,
  ...INDIA_AI_ORPHAN_SCHEMAS,
  ...CAM_ML_LEDGER_SCHEMAS,
  ...XFER_LEARN_SCHEMAS,
  ...ATTR_DETECT_SCHEMAS,
  ...TPE_SEARCH_SCHEMAS,
} as const;
type AIAction = AIReasoningAction | AICapabilityAction | OutcomeCrosswireAction | RagCrosswireAction | BlueprintLoRAAction | Iter4AIAction | VictorAIDirectAction | CapProbeAction | ReasonBeforeActionAction | GrpoAction | IndiaAIOrphanAction | CamMlLedgerAction | XferLearnAction | AttrDetectAction | TpeSearchAction;

// Lazy-loaded engine singletons
let _millFacade: typeof import("../../engines/MillMasterOrchestratorFacadeEngine.js").millMasterOrchestratorFacadeEngine | null = null;
let _millAwareness: typeof import("../../engines/MillAISelfAwarenessIntegrationEngine.js").millAISelfAwarenessIntegrationEngine | null = null;
let _aiRouter: typeof import("../../engines/AISystemRouterEngine.js").aiSystemRouterEngine | null = null;
let _aiAuto: typeof import("../../engines/AIAutoUtilizationEngine.js").aiAutoUtilizationEngine | null = null;
let _aiExtract: typeof import("../../engines/AIExtractionReasonerEngine.js").aiExtractionReasoner | null = null;
async function getAiRouter() { if (!_aiRouter) { _aiRouter = (await import("../../engines/AISystemRouterEngine.js")).aiSystemRouterEngine; } return _aiRouter; }
async function getAiAuto() { if (!_aiAuto) { _aiAuto = (await import("../../engines/AIAutoUtilizationEngine.js")).aiAutoUtilizationEngine; } return _aiAuto; }
async function getAiExtract() { if (!_aiExtract) { _aiExtract = (await import("../../engines/AIExtractionReasonerEngine.js")).aiExtractionReasoner; } return _aiExtract; }

// ============================================================================
// U-XPROC-T2-T12-PRISM-AI-WIRE — unified xproc routing
// All 138 xproc_* actions across 38 engines (Tiers 2-12) flow through this
// helper. Per CLAUDE.md "wire to all consumers" rule: reasoning engines belong
// on both prism_intelligence and prism_ai. The flat XPROC_ROUTES map mirrors
// the CORE_ROUTING table in intelligenceDispatcher.ts so both surfaces stay
// in lock-step. Lazy-imports cache by engine key.
// ============================================================================

type XprocEngineLoader = () => Promise<(action: string, params: Record<string, unknown>) => unknown>;

const XPROC_ROUTES: Record<string, XprocEngineLoader> = {
  // Tier 8 — Neuro-symbolic
  xproc_symbolic_project: () => import("../../engines/CrossProcessSymbolicConstraintEnforcerEngine.js").then(m => m.crossProcessSymbolicEnforcer),
  xproc_symbolic_violations: () => import("../../engines/CrossProcessSymbolicConstraintEnforcerEngine.js").then(m => m.crossProcessSymbolicEnforcer),
  xproc_safety_verify: () => import("../../engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.js").then(m => m.crossProcessNeuroSymbolicSafetyVerifier),
  xproc_safety_escalate: () => import("../../engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.js").then(m => m.crossProcessNeuroSymbolicSafetyVerifier),
  xproc_extract_rules: () => import("../../engines/CrossProcessRuleExtractedNeuralInferenceEngine.js").then(m => m.crossProcessRuleExtractedNeuralInference),
  xproc_rule_explain_prediction: () => import("../../engines/CrossProcessRuleExtractedNeuralInferenceEngine.js").then(m => m.crossProcessRuleExtractedNeuralInference),
  xproc_blend_predict: () => import("../../engines/CrossProcessFormulaNeuralEnsembleEngine.js").then(m => m.crossProcessFormulaNeuralEnsemble),
  xproc_blend_weight_report: () => import("../../engines/CrossProcessFormulaNeuralEnsembleEngine.js").then(m => m.crossProcessFormulaNeuralEnsemble),
  // Tier 9 — Causal inference
  xproc_causal_learn_dag: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
  xproc_causal_test_independence: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
  xproc_causal_export_graph: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
  xproc_do_identify: () => import("../../engines/CrossProcessDoCalculusEngine.js").then(m => m.crossProcessDoCalculus),
  xproc_do_intervene: () => import("../../engines/CrossProcessDoCalculusEngine.js").then(m => m.crossProcessDoCalculus),
  xproc_counterfactual_query: () => import("../../engines/CrossProcessCounterfactualPredictorEngine.js").then(m => m.crossProcessCounterfactualPredictor),
  xproc_mediation_decompose: () => import("../../engines/CrossProcessMediationAnalyzerEngine.js").then(m => m.crossProcessMediationAnalyzer),
  xproc_mediation_path_strength: () => import("../../engines/CrossProcessMediationAnalyzerEngine.js").then(m => m.crossProcessMediationAnalyzer),
  // Tier 11 — Active learning & curiosity
  xproc_active_select: () => import("../../engines/CrossProcessUncertaintyDrivenSamplerEngine.js").then(m => m.crossProcessUncertaintyDrivenSampler),
  xproc_active_rationale: () => import("../../engines/CrossProcessUncertaintyDrivenSamplerEngine.js").then(m => m.crossProcessUncertaintyDrivenSampler),
  xproc_novelty_score: () => import("../../engines/CrossProcessNoveltyDetectorEngine.js").then(m => m.crossProcessNoveltyDetector),
  xproc_novelty_alert: () => import("../../engines/CrossProcessNoveltyDetectorEngine.js").then(m => m.crossProcessNoveltyDetector),
  xproc_curiosity_propose: () => import("../../engines/CrossProcessCuriosityDrivenExplorationEngine.js").then(m => m.crossProcessCuriosityDrivenExploration),
  xproc_curiosity_score: () => import("../../engines/CrossProcessCuriosityDrivenExplorationEngine.js").then(m => m.crossProcessCuriosityDrivenExploration),
  xproc_doe_plan: () => import("../../engines/CrossProcessBayesianDOEPlannerEngine.js").then(m => m.crossProcessBayesianDOEPlanner),
  xproc_doe_evaluate_completion: () => import("../../engines/CrossProcessBayesianDOEPlannerEngine.js").then(m => m.crossProcessBayesianDOEPlanner),
  // Tier 12 — Master orchestration
  xproc_route_query: () => import("../../engines/CrossProcessTierRouterEngine.js").then(m => m.crossProcessTierRouter),
  xproc_route_explain: () => import("../../engines/CrossProcessTierRouterEngine.js").then(m => m.crossProcessTierRouter),
  xproc_orchestrate_full: () => import("../../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js").then(m => m.crossProcessHierarchicalNeuralOrchestrator),
  xproc_orchestrate_brief: () => import("../../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js").then(m => m.crossProcessHierarchicalNeuralOrchestrator),
  xproc_orchestrate_live: () => import("../../engines/CrossProcessHierarchicalNeuralOrchestratorEngine.js").then(m => m.crossProcessHierarchicalNeuralOrchestratorAsync),
  // Tier 2 — Memory & replay
  xproc_episodic_store: () => import("../../engines/CrossProcessEpisodicMemoryEngine.js").then(m => m.crossProcessEpisodicMemory),
  xproc_episodic_recall: () => import("../../engines/CrossProcessEpisodicMemoryEngine.js").then(m => m.crossProcessEpisodicMemory),
  xproc_episodic_stats: () => import("../../engines/CrossProcessEpisodicMemoryEngine.js").then(m => m.crossProcessEpisodicMemory),
  xproc_replay_add: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_sample: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_update_priority: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_stats: () => import("../../engines/CrossProcessPrioritizedReplayEngine.js").then(m => m.crossProcessPrioritizedReplay),
  xproc_replay_balanced_batch: () => import("../../engines/CrossProcessExperienceReplaySamplerEngine.js").then(m => m.crossProcessExperienceReplaySampler),
  xproc_replay_default_clusters: () => import("../../engines/CrossProcessExperienceReplaySamplerEngine.js").then(m => m.crossProcessExperienceReplaySampler),
  xproc_episodic_semantic_join: () => import("../../engines/CrossProcessEpisodicSemanticLinkerEngine.js").then(m => m.crossProcessEpisodicSemanticLinker),
  // Tier 3 — Online learning & drift
  xproc_online_update: () => import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js").then(m => m.crossProcessOnlineMLPUpdater),
  xproc_online_init_state: () => import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js").then(m => m.crossProcessOnlineMLPUpdater),
  xproc_online_constants: () => import("../../engines/CrossProcessOnlineMLPUpdaterEngine.js").then(m => m.crossProcessOnlineMLPUpdater),
  xproc_drift_observe: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_observe_batch: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_history: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_reset: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_drift_constants: () => import("../../engines/CrossProcessDriftDetectorEngine.js").then(m => m.crossProcessDriftDetector),
  xproc_shift_decide: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_shift_history: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_shift_reset: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_shift_constants: () => import("../../engines/CrossProcessConceptShiftHandlerEngine.js").then(m => m.crossProcessConceptShiftHandler),
  xproc_ewc_compute_fisher: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_reg_loss: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_consolidate: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_get_fisher: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_reset: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  xproc_ewc_constants: () => import("../../engines/CrossProcessEWCMemoryPreservationEngine.js").then(m => m.crossProcessEWCMemoryPreservation),
  // Tier 4 — Reinforcement learning
  xproc_reward_shape: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  xproc_reward_audit: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  xproc_reward_default_weights: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  xproc_reward_constants: () => import("../../engines/CrossProcessRewardShaperEngine.js").then(m => m.crossProcessRewardShaper),
  // XPROC-NEURAL-CONNECT-MS0/U-CN05 — KG semantic-search → NN feature projector
  xproc_kg_project_features: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
  xproc_kg_feature_layout: () => import("../../engines/KnowledgeGraphFeatureProjectorEngine.js").then(m => m.knowledgeGraphFeatureProjectorDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN04 — TribalKnowledge outcome subscriber bridge
  xproc_tribal_subscribe_outcomes: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_unsubscribe_outcomes: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_subscription_status: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_configure: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_stats: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  xproc_tribal_outcome_reset: () => import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js").then(m => m.tribalKnowledgeOutcomeBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN06 — drift/calibration/concept-shift outcome bridge
  xproc_drift_subscribe: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_unsubscribe: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_status: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_configure: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_stats: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  xproc_drift_bridge_reset: () => import("../../engines/OutcomeDriftCalibrationBridgeEngine.js").then(m => m.outcomeDriftCalibrationBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN07 — replay/sampler outcome bridge
  xproc_replay_bridge_subscribe: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_unsubscribe: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_status: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_configure: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_stats: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_sample_stratified: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_sample_prioritized: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  xproc_replay_bridge_reset: () => import("../../engines/OutcomeReplayBufferBridgeEngine.js").then(m => m.outcomeReplayBufferBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN08 — episodic memory outcome bridge
  xproc_episodic_bridge_subscribe: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_unsubscribe: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_status: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_configure: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_stats: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  xproc_episodic_bridge_reset: () => import("../../engines/OutcomeEpisodicMemoryBridgeEngine.js").then(m => m.outcomeEpisodicMemoryBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN09 — closed-loop ignition: one idempotent call
  // turns on the NN auto-train subscription (CrossProcessNeuralLearningEngine.enableAutoTrain)
  // + all five fan-out bridges (CN04 tribal, CN06 drift/calibration, CN07 replay, CN08 episodic, CN12 RL).
  // Also invoked at MCP-server boot (index.ts) behind PRISM_XPROC_AUTOFIRE.
  xproc_autofire_activate: () => import("../../engines/XProcNeuralAutoFireEngine.js").then(m => m.xProcNeuralAutoFireDispatch),
  xproc_autofire_deactivate: () => import("../../engines/XProcNeuralAutoFireEngine.js").then(m => m.xProcNeuralAutoFireDispatch),
  xproc_autofire_status: () => import("../../engines/XProcNeuralAutoFireEngine.js").then(m => m.xProcNeuralAutoFireDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN12 — RL fan-out bridge: outcome.completed → (state, action,
  // reward via CrossProcessRewardShaperEngine) → QLearningTabular + PolicyGradient + MultiArmedBandit.
  xproc_rl_bridge_subscribe: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_unsubscribe: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_status: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_configure: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_stats: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_replay: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  xproc_rl_bridge_reset: () => import("../../engines/OutcomeRLBridgeEngine.js").then(m => m.outcomeRLBridgeDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN11 — EWC consolidation controls on the NN learner
  // (the auto-train EWC λ is set via xproc_autofire_activate({autoTrainEwcLambda}); these are
  // the manual status / clear / consolidate-from-store controls).
  xproc_neural_ewc_status: () => import("../../engines/CrossProcessNeuralLearningEngine.js").then(m => m.crossProcessNeuralEwcDispatch),
  xproc_neural_ewc_clear: () => import("../../engines/CrossProcessNeuralLearningEngine.js").then(m => m.crossProcessNeuralEwcDispatch),
  xproc_neural_ewc_consolidate: () => import("../../engines/CrossProcessNeuralLearningEngine.js").then(m => m.crossProcessNeuralEwcDispatch),
  // XPROC-NEURAL-CONNECT-MS0/U-CN01 — domain-engine outcome publish adapter
  xproc_outcome_publish: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_publish_with_actuals: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_publish_failure: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_publish_override: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_update: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_adapter_stats: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_outcome_adapter_reset: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
  xproc_policy_step: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_commit: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_select_action: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_get_policy: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_get_baseline: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_configure: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_reset: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_stats: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_policy_constants: () => import("../../engines/CrossProcessPolicyGradientEngine.js").then(m => m.crossProcessPolicyGradient),
  xproc_qlearn_update: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_argmax: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_epsilon_greedy: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_get_q_row: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_configure: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_reset: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_stats: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_qlearn_constants: () => import("../../engines/CrossProcessQLearningTabularEngine.js").then(m => m.crossProcessQLearningTabular),
  xproc_bandit_register_arm: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_select: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_update: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_stats: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_reset: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  xproc_bandit_constants: () => import("../../engines/CrossProcessMultiArmedBanditEngine.js").then(m => m.crossProcessMultiArmedBandit),
  // Tier 5 — Bayesian / uncertainty
  xproc_bayes_predict: () => import("../../engines/CrossProcessBayesianMLPEngine.js").then(m => m.crossProcessBayesianMLP),
  xproc_bayes_uncertainty: () => import("../../engines/CrossProcessBayesianMLPEngine.js").then(m => m.crossProcessBayesianMLP),
  xproc_bayes_constants: () => import("../../engines/CrossProcessBayesianMLPEngine.js").then(m => m.crossProcessBayesianMLP),
  xproc_conformal_calibrate: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_set: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_stats: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_reset: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  xproc_conformal_constants: () => import("../../engines/CrossProcessConformalPredictionEngine.js").then(m => m.crossProcessConformalPrediction),
  // U-NN-CONFORMAL01: split-conformal classification (LAC, Sadinle 2019).
  // Sibling to the regression engine — sets over discrete classes instead
  // of intervals. Wraps the cross-process NN's softmax output with
  // marginal-coverage-guaranteed prediction sets.
  xproc_conformal_classify_calibrate: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_set: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_stats: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_reset: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  xproc_conformal_classify_constants: () => import("../../engines/CrossProcessConformalClassificationEngine.js").then(m => m.crossProcessConformalClassification),
  // U-NN-CONFORMAL02: rolling empirical-coverage monitor + drift detector.
  // Closes the loop on the LAC classifier — detects when production
  // distribution drift breaks the marginal-coverage assumption.
  xproc_calibration_monitor_configure: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_record: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_status: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_reset: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  xproc_calibration_monitor_constants: () => import("../../engines/ConformalCalibrationMonitorEngine.js").then(m => m.conformalCalibrationMonitor),
  // U-NN-CONFORMAL03: APS adaptive prediction sets (Romano et al. 2020).
  // Same coverage guarantee as LAC, smaller average set on hetero data.
  xproc_aps_calibrate: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_set: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_stats: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_reset: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  xproc_aps_constants: () => import("../../engines/CrossProcessAPSClassificationEngine.js").then(m => m.crossProcessAPSClassification),
  // U-NN-CONFORMAL04: RAPS regularized adaptive prediction sets
  // (Angelopoulos et al 2021). λ=0 ⇒ APS; λ>0 caps set growth past k_reg.
  xproc_raps_calibrate: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_set: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_stats: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_reset: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  xproc_raps_constants: () => import("../../engines/CrossProcessRAPSClassificationEngine.js").then(m => m.crossProcessRAPSClassification),
  // U-NN-CONFORMAL05: prediction-log bridge — pairs predictedSet at log
  // time with actualLabel at outcome time, feeds CalibrationMonitor.
  // Closes the predictor ↔ monitor loop end-to-end.
  xproc_predlog_log: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_pair: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_prune: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_configure: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_status: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_pending_ids: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_enable_autosync: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_disable_autosync: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_reset: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  xproc_predlog_constants: () => import("../../engines/ConformalPredictionLogEngine.js").then(m => m.conformalPredictionLog),
  // U-NN-MONDRIAN01: class-conditional conformal classification (Vovk 2003).
  // Per-class buckets give P(Y∈S|Y=c) ≥ 1−α for every c, not just marginal.
  xproc_mondrian_calibrate: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_set: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_stats: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_reset: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_mondrian_constants: () => import("../../engines/CrossProcessMondrianClassificationEngine.js").then(m => m.crossProcessMondrianClassification),
  xproc_ensemble_predict: () => import("../../engines/CrossProcessDeepEnsembleEngine.js").then(m => m.crossProcessDeepEnsemble),
  xproc_ensemble_disagreement: () => import("../../engines/CrossProcessDeepEnsembleEngine.js").then(m => m.crossProcessDeepEnsemble),
  xproc_ensemble_constants: () => import("../../engines/CrossProcessDeepEnsembleEngine.js").then(m => m.crossProcessDeepEnsemble),
  xproc_calibration_score: () => import("../../engines/CrossProcessCalibrationAuditorEngine.js").then(m => m.crossProcessCalibrationAuditor),
  xproc_calibration_recommend: () => import("../../engines/CrossProcessCalibrationAuditorEngine.js").then(m => m.crossProcessCalibrationAuditor),
  xproc_calibration_constants: () => import("../../engines/CrossProcessCalibrationAuditorEngine.js").then(m => m.crossProcessCalibrationAuditor),
  // Tier 6 — Federated
  xproc_fed_aggregate: () => import("../../engines/CrossProcessFedAvgAggregatorEngine.js").then(m => m.crossProcessFedAvgAggregator),
  xproc_fed_round_summary: () => import("../../engines/CrossProcessFedAvgAggregatorEngine.js").then(m => m.crossProcessFedAvgAggregator),
  xproc_fed_constants: () => import("../../engines/CrossProcessFedAvgAggregatorEngine.js").then(m => m.crossProcessFedAvgAggregator),
  xproc_secure_mask: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_secure_unmask: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_secure_verify: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_secure_constants: () => import("../../engines/CrossProcessSecureAggregationEngine.js").then(m => m.crossProcessSecureAggregation),
  xproc_fed_gate: () => import("../../engines/CrossProcessDriftAwareFederationEngine.js").then(m => m.crossProcessDriftAwareFederation),
  xproc_fed_drift_report: () => import("../../engines/CrossProcessDriftAwareFederationEngine.js").then(m => m.crossProcessDriftAwareFederation),
  xproc_fed_drift_constants: () => import("../../engines/CrossProcessDriftAwareFederationEngine.js").then(m => m.crossProcessDriftAwareFederation),
  xproc_fed_select_clients: () => import("../../engines/CrossProcessClientSelectionSchedulerEngine.js").then(m => m.crossProcessClientSelectionScheduler),
  xproc_fed_round_plan: () => import("../../engines/CrossProcessClientSelectionSchedulerEngine.js").then(m => m.crossProcessClientSelectionScheduler),
  xproc_fed_scheduler_constants: () => import("../../engines/CrossProcessClientSelectionSchedulerEngine.js").then(m => m.crossProcessClientSelectionScheduler),
  // Tier 7 — Meta-learning
  xproc_maml_inner_loop: () => import("../../engines/CrossProcessMAMLLiteEngine.js").then(m => m.crossProcessMAMLLite),
  xproc_maml_meta_train: () => import("../../engines/CrossProcessMAMLLiteEngine.js").then(m => m.crossProcessMAMLLite),
  xproc_maml_constants: () => import("../../engines/CrossProcessMAMLLiteEngine.js").then(m => m.crossProcessMAMLLite),
  xproc_proto_compute: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_proto_classify: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_proto_regress: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_proto_constants: () => import("../../engines/CrossProcessPrototypicalNetEngine.js").then(m => m.crossProcessPrototypicalNet),
  xproc_meta_lr_init: () => import("../../engines/CrossProcessLearnedLRSchedulerEngine.js").then(m => m.crossProcessLearnedLRScheduler),
  xproc_meta_lr_step: () => import("../../engines/CrossProcessLearnedLRSchedulerEngine.js").then(m => m.crossProcessLearnedLRScheduler),
  xproc_meta_lr_constants: () => import("../../engines/CrossProcessLearnedLRSchedulerEngine.js").then(m => m.crossProcessLearnedLRScheduler),
  xproc_hyper_propose: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  xproc_hyper_evaluate: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  xproc_hyper_record_outcome: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  xproc_hyper_constants: () => import("../../engines/CrossProcessHyperparameterMetaTunerEngine.js").then(m => m.crossProcessHyperparameterMetaTuner),
  // Tier 10 — Multimodal fusion (already wired by U-XPROC-T10-PRISM-AI-WIRE; included here so all xproc_* flow through one helper)
  xproc_vision_fuse: () => import("../../engines/CrossProcessVisionTabularFusionEngine.js").then(m => m.crossProcessVisionTabularFusion),
  xproc_vision_explain_attention: () => import("../../engines/CrossProcessVisionTabularFusionEngine.js").then(m => m.crossProcessVisionTabularFusion),
  xproc_vision_constants: () => import("../../engines/CrossProcessVisionTabularFusionEngine.js").then(m => m.crossProcessVisionTabularFusion),
  xproc_timeseries_fuse: () => import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js").then(m => m.crossProcessTimeSeriesTabularFusion),
  xproc_timeseries_segment: () => import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js").then(m => m.crossProcessTimeSeriesTabularFusion),
  xproc_timeseries_constants: () => import("../../engines/CrossProcessTimeSeriesTabularFusionEngine.js").then(m => m.crossProcessTimeSeriesTabularFusion),
  xproc_audio_fuse: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_audio_chatter_score: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_audio_spectral: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_audio_constants: () => import("../../engines/CrossProcessAudioTabularFusionEngine.js").then(m => m.crossProcessAudioTabularFusion),
  xproc_modality_dropout: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
  xproc_modality_predict: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
  xproc_modality_availability: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
  xproc_modality_constants: () => import("../../engines/CrossProcessModalityDropoutRobustifierEngine.js").then(m => m.crossProcessModalityDropoutRobustifier),
};

const _xprocCache = new Map<string, (action: string, params: Record<string, unknown>) => unknown>();

// ============================================================================
// U-XPROC-TIER1-PRISM-AI-WIRE — Tier 1 baseline (5 engines, 23 actions)
// Mirrors intelligenceDispatcher's inline xproc_outcome_*/neural_*/transfer_*/
// attention_*/agi_compose handlers. These engines export singletons (not action
// wrappers), so they need per-action dispatch. Returns raw result objects;
// the outer prism_ai dispatcher wraps in {success, data}.
// ============================================================================

type XprocTier1Handler = (params: Record<string, unknown>) => Promise<unknown>;

const XPROC_TIER1_HANDLERS: Record<string, XprocTier1Handler> = {
  // T1-01 OutcomeStore
  xproc_outcome_record: async (params) => {
    const { ensureXprocLedgerDurable } = await import("../../engines/XprocOutcomeLedgerDurability.js");
    await ensureXprocLedgerDurable();
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const id = crossProcessOutcomeStore.record({
      bridge: params.bridge as Parameters<typeof crossProcessOutcomeStore.record>[0]["bridge"],
      process: params.process as Parameters<typeof crossProcessOutcomeStore.record>[0]["process"],
      request_summary: params.request_summary as Parameters<typeof crossProcessOutcomeStore.record>[0]["request_summary"],
      response_summary: params.response_summary as Parameters<typeof crossProcessOutcomeStore.record>[0]["response_summary"],
      outcome: params.outcome as Parameters<typeof crossProcessOutcomeStore.record>[0]["outcome"],
      operator: params.operator as Parameters<typeof crossProcessOutcomeStore.record>[0]["operator"],
    });
    return { id };
  },
  xproc_outcome_record_outcome: async (params) => {
    const { ensureXprocLedgerDurable } = await import("../../engines/XprocOutcomeLedgerDurability.js");
    await ensureXprocLedgerDurable();
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const id = params.id as string | undefined;
    if (!id) throw new Error("xproc_outcome_record_outcome requires `id`");
    const outcome = params.outcome as Parameters<typeof crossProcessOutcomeStore.recordOutcome>[1];
    return { updated: crossProcessOutcomeStore.recordOutcome(id, outcome) };
  },
  xproc_outcome_query: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const records = crossProcessOutcomeStore.query(params as Parameters<typeof crossProcessOutcomeStore.query>[0]);
    return { count: records.length, records };
  },
  xproc_outcome_retrieve_similar: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const k = (params.k as number | undefined) ?? 5;
    const ctx = (params.context ?? params) as Parameters<typeof crossProcessOutcomeStore.retrieveSimilar>[0];
    const results = crossProcessOutcomeStore.retrieveSimilar(ctx, k);
    return { count: results.length, results };
  },
  xproc_outcome_stats: async () => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    return crossProcessOutcomeStore.stats();
  },
  xproc_outcome_clear: async () => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    crossProcessOutcomeStore.clear();
    return { cleared: true };
  },
  // INFRA-NEURAL-LEDGER-MS1/P0-U03 — replay capability
  xproc_outcome_replay: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const limit = params.limit;
    const records =
      limit === undefined
        ? crossProcessOutcomeStore.replay()
        : crossProcessOutcomeStore.replay(limit as number);
    return { count: records.length, records };
  },
  xproc_outcome_replay_job: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const jobId = params.jobId as string | undefined;
    if (!jobId) throw new Error("xproc_outcome_replay_job requires `jobId`");
    const records = crossProcessOutcomeStore.replayJob(jobId);
    return { count: records.length, records };
  },
  xproc_outcome_replay_since: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    const timestamp = params.timestamp as string | undefined;
    if (!timestamp) throw new Error("xproc_outcome_replay_since requires `timestamp`");
    const records = crossProcessOutcomeStore.replaySince(timestamp);
    return { count: records.length, records };
  },
  xproc_outcome_stream_from_disk: async (params) => {
    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");
    // Dispatcher collects records into an array (caller wants a JSON
    // response, not a stream); engine still reads JSONL line-by-line so
    // memory cost is bounded by `limit`, not by file size.
    const records: unknown[] = [];
    const observed = await crossProcessOutcomeStore.streamReplayFromDisk({
      handler: (e) => {
        records.push(e);
      },
      limit: params.limit as number | undefined,
      jobId: params.jobId as string | undefined,
      since: params.since as string | undefined,
    });
    return { count: observed, records };
  },
  // T1-02 NeuralLearning
  xproc_neural_train: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const records = (params.records as Parameters<typeof crossProcessNeuralLearningEngine.train>[0]) ?? [];
    const opts = params.opts as Parameters<typeof crossProcessNeuralLearningEngine.train>[1] | undefined;
    return crossProcessNeuralLearningEngine.train(records, opts);
  },
  xproc_neural_predict: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const record = params.record as Parameters<typeof crossProcessNeuralLearningEngine.predictFromRecord>[0] | undefined;
    if (!record) throw new Error("xproc_neural_predict requires `record`");
    return crossProcessNeuralLearningEngine.predictFromRecord(record);
  },
  // XPROC-NEURAL-CONNECT-MS0/U-CN02 — SF-orchestrator NN consumer (gated emit)
  xproc_neural_consult_speedfeed: async (params) => {
    const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
    return speedFeedOrchestratorEngine.consultNeuralPredictor(params);
  },
  xproc_neural_evaluate: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const records = (params.records as Parameters<typeof crossProcessNeuralLearningEngine.evaluate>[0]) ?? [];
    return crossProcessNeuralLearningEngine.evaluate(records);
  },
  xproc_neural_save: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const filePath = params.path as string | undefined;
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("xproc_neural_save requires `path` (non-empty string)");
    }
    crossProcessNeuralLearningEngine.saveTo(filePath);
    return { path: filePath };
  },
  xproc_neural_load: async (params) => {
    const { CrossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const filePath = params.path as string | undefined;
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("xproc_neural_load requires `path` (non-empty string)");
    }
    const loaded = CrossProcessNeuralLearningEngine.loadFrom(filePath);
    return { path: filePath, metrics: loaded.getMetrics() };
  },
  xproc_neural_metrics: async () => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    return {
      metrics: crossProcessNeuralLearningEngine.getMetrics(),
      config: crossProcessNeuralLearningEngine.getConfig(),
    };
  },
  xproc_neural_reset: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const seed = params.seed as number | undefined;
    crossProcessNeuralLearningEngine.reset(seed);
    return { seed: seed ?? null };
  },
  // T1-03 TransferLearning
  xproc_transfer_classify: async (params) => {
    const { crossProcessTransferLearningEngine } = await import("../../engines/CrossProcessTransferLearningEngine.js");
    const material = params.material as string | undefined;
    if (typeof material !== "string") throw new Error("xproc_transfer_classify requires `material` (string)");
    return { material, cluster: crossProcessTransferLearningEngine.classifyMaterial(material) };
  },
  xproc_transfer_pairs: async () => {
    const { crossProcessTransferLearningEngine, MATERIAL_CLUSTERS } = await import("../../engines/CrossProcessTransferLearningEngine.js");
    const pairs = crossProcessTransferLearningEngine.listTransferPairs();
    return { pairs, clusters: MATERIAL_CLUSTERS, count: pairs.length };
  },
  xproc_transfer_check: async (params) => {
    const { crossProcessTransferLearningEngine, MATERIAL_CLUSTERS } = await import("../../engines/CrossProcessTransferLearningEngine.js");
    const source = params.source as string | undefined;
    const target = params.target as string | undefined;
    if (typeof source !== "string" || typeof target !== "string") {
      throw new Error("xproc_transfer_check requires `source` and `target` cluster strings");
    }
    const validClusters = MATERIAL_CLUSTERS as readonly string[];
    const sourceCluster = validClusters.includes(source)
      ? (source as (typeof MATERIAL_CLUSTERS)[number])
      : crossProcessTransferLearningEngine.classifyMaterial(source);
    const targetCluster = validClusters.includes(target)
      ? (target as (typeof MATERIAL_CLUSTERS)[number])
      : crossProcessTransferLearningEngine.classifyMaterial(target);
    const trusted = sourceCluster && targetCluster
      ? crossProcessTransferLearningEngine.isTrustedPair(sourceCluster, targetCluster)
      : false;
    return { source, target, sourceCluster, targetCluster, trusted };
  },
  // T1-04 AttentionExplain (uses T1-02 singleton as donor model)
  xproc_attention_explain: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const record = params.record as Parameters<typeof crossProcessNeuralLearningEngine.featurize>[0] | undefined;
    if (!record) throw new Error("xproc_attention_explain requires `record`");
    const opts = params.opts as Parameters<typeof crossProcessAttentionExplainEngine.explainPrediction>[2] | undefined;
    return crossProcessAttentionExplainEngine.explainPrediction(crossProcessNeuralLearningEngine, record, opts);
  },
  xproc_attention_ece: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const records = (params.records as Parameters<typeof crossProcessAttentionExplainEngine.computeECE>[1]) ?? [];
    const numBins = params.numBins as number | undefined;
    return crossProcessAttentionExplainEngine.computeECE(crossProcessNeuralLearningEngine, records, numBins);
  },
  xproc_attention_baseline_add: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const records = (params.records as Parameters<typeof crossProcessAttentionExplainEngine.registerBaseline>[1]) ?? [];
    return crossProcessAttentionExplainEngine.registerBaseline(crossProcessNeuralLearningEngine, records);
  },
  xproc_attention_anomaly: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    const record = params.record as Parameters<typeof crossProcessAttentionExplainEngine.scoreAnomaly>[1] | undefined;
    if (!record) throw new Error("xproc_attention_anomaly requires `record`");
    const threshold = params.threshold as number | undefined;
    return crossProcessAttentionExplainEngine.scoreAnomaly(crossProcessNeuralLearningEngine, record, threshold);
  },
  xproc_attention_baseline_get: async () => {
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    return crossProcessAttentionExplainEngine.getBaseline();
  },
  xproc_attention_baseline_reset: async () => {
    const { crossProcessAttentionExplainEngine } = await import("../../engines/CrossProcessAttentionExplainEngine.js");
    crossProcessAttentionExplainEngine.resetBaseline();
    return { reset: true };
  },
  // T1-05 AGIBridge composer
  xproc_agi_compose: async (params) => {
    const { crossProcessNeuralLearningEngine } = await import("../../engines/CrossProcessNeuralLearningEngine.js");
    const { crossProcessAGIBridge } = await import("../../engines/CrossProcessAGIBridge.js");
    const reqParam = params.request as Parameters<typeof crossProcessAGIBridge.compose>[1] | undefined;
    if (!reqParam || typeof reqParam !== "object" || typeof reqParam.intent !== "string") {
      throw new Error("xproc_agi_compose requires `request` with `intent` (non-empty string)");
    }
    const opts = params.opts as Parameters<typeof crossProcessAGIBridge.compose>[2] | undefined;
    return crossProcessAGIBridge.compose(crossProcessNeuralLearningEngine, reqParam, opts);
  },
  // U-NN-FEAT03: PhysicsFeatureExtractorEngine — 5 physics-derived features
  xproc_physics_features: async (params) => {
    const { PhysicsFeatureExtractorEngine, PHYSICS_FEATURE_INDEX } =
      await import("../../engines/PhysicsFeatureExtractorEngine.js");
    const record = params.record as Parameters<typeof PhysicsFeatureExtractorEngine.extract>[0] | undefined;
    if (!record) throw new Error("xproc_physics_features requires `record`");
    const features = PhysicsFeatureExtractorEngine.extract(record);
    return { features: Array.from(features), index: PHYSICS_FEATURE_INDEX };
  },
  xproc_physics_features_batch: async (params) => {
    const { PhysicsFeatureExtractorEngine, PHYSICS_FEATURE_DIM } =
      await import("../../engines/PhysicsFeatureExtractorEngine.js");
    const records = params.records as Parameters<typeof PhysicsFeatureExtractorEngine.extractBatch>[0] | undefined;
    if (!Array.isArray(records)) throw new Error("xproc_physics_features_batch requires `records` (array)");
    const flat = PhysicsFeatureExtractorEngine.extractBatch(records);
    return { features: Array.from(flat), rows: records.length, cols: PHYSICS_FEATURE_DIM };
  },
  // U-NN-FEAT04: WikiRAGFeatureEngine — 8 RAG features from tribal knowledge
  xproc_rag_features: async (params) => {
    const { WikiRAGFeatureEngine, RAG_FEATURE_INDEX } =
      await import("../../engines/WikiRAGFeatureEngine.js");
    const record = params.record as Parameters<typeof WikiRAGFeatureEngine.extractRAGFeatures>[0] | undefined;
    if (!record) throw new Error("xproc_rag_features requires `record`");
    const features = WikiRAGFeatureEngine.extractRAGFeatures(record);
    return {
      features: Array.from(features),
      index: RAG_FEATURE_INDEX,
      cacheSize: WikiRAGFeatureEngine.cacheSize(),
      tipsLoaded: WikiRAGFeatureEngine.tipsLoaded(),
    };
  },
  xproc_rag_clear_cache: async () => {
    const { WikiRAGFeatureEngine } = await import("../../engines/WikiRAGFeatureEngine.js");
    WikiRAGFeatureEngine.clearCache();
    return { cleared: true };
  },
  // U-NN-LOOP01: FeedbackBusEngine — in-process pub/sub control plane.
  // subscribe/unsubscribe stay engine-internal (callbacks can't cross MCP).
  xproc_feedbackbus_publish: async (params) => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    const topic = params.topic;
    if (typeof topic !== "string" || topic.length === 0) {
      throw new Error("xproc_feedbackbus_publish requires `topic` (non-empty string)");
    }
    if (topic === "*") {
      throw new Error("xproc_feedbackbus_publish: cannot publish to wildcard '*'");
    }
    feedbackBusEngine.publish(topic, params.payload);
    return { topic, subscriberCount: feedbackBusEngine.subscriberCount(topic) };
  },
  xproc_feedbackbus_stats: async () => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    return { stats: feedbackBusEngine.stats() };
  },
  xproc_feedbackbus_topics: async () => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    return { topics: feedbackBusEngine.topics() };
  },
  xproc_feedbackbus_subscriber_count: async (params) => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    const topic = params.topic;
    if (typeof topic !== "string" || topic.length === 0) {
      throw new Error("xproc_feedbackbus_subscriber_count requires `topic` (non-empty string)");
    }
    return { topic, count: feedbackBusEngine.subscriberCount(topic) };
  },
  xproc_feedbackbus_reset: async () => {
    const { feedbackBusEngine } = await import("../../engines/FeedbackBusEngine.js");
    feedbackBusEngine.reset();
    return { reset: true };
  },
};

async function routeXprocAction(action: string, params: Record<string, unknown>): Promise<unknown> {
  // Tier 1: per-action handler (singleton-based engines, no uniform wrapper).
  const tier1 = XPROC_TIER1_HANDLERS[action];
  if (tier1) return tier1(params);

  // Tier 2-12: uniform wrapper-function engines, lazy-loaded + cached.
  let wrapper = _xprocCache.get(action);
  if (!wrapper) {
    const loader = XPROC_ROUTES[action];
    if (!loader) {
      throw new Error(`xproc routing has no entry for action '${action}' (prism_ai)`);
    }
    wrapper = await loader();
    _xprocCache.set(action, wrapper);
  }
  return wrapper(action, params);
}

async function getMillFacade() {
  if (!_millFacade) {
    const mod = await import("../../engines/MillMasterOrchestratorFacadeEngine.js");
    _millFacade = mod.millMasterOrchestratorFacadeEngine;
  }
  return _millFacade;
}

async function getMillAwareness() {
  if (!_millAwareness) {
    const mod = await import("../../engines/MillAISelfAwarenessIntegrationEngine.js");
    _millAwareness = mod.millAISelfAwarenessIntegrationEngine;
  }
  return _millAwareness;
}

/** Dispatcher definition for MCP registration */
export const aiReasoningDispatcherDef = {
  name: "prism_ai",
  description: "AI reasoning dispatcher — routes AGI, scientific, wisdom, and adaptive strategy requests through MillMasterOrchestratorFacadeEngine.",
  inputSchema: z.object({
    action: z.enum(ALL_AI_ACTIONS).describe("AI reasoning action to execute"),
    params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
  }),
};

/** Execute AI reasoning action */
export async function executeAIReasoningAction(
  action: AIAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
  // validateActionParams indexes the map by action; passing a single Zod object made it always pass).
  // U-AIMAX10: merged map covers both the legacy AI_REASONING_ACTIONS and the new AI_CAPABILITY_ACTIONS.
  const validation = validateActionParams(action, params, ALL_AI_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(validation.error ?? "Validation failed", action, "prism_ai");
  }

  try {
    let result: unknown;

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // capability_probe — BLACKWELL-AI-MS0/U-CAP-PROBE (slot:india)
      // Runtime host capability snapshot (detected HardwareProfile +
      // WDDM-corrected free VRAM + present/loaded/runnable models). Read-only,
      // fail-soft. The sole runtime authority ModelRoutingEngine consumes via
      // routableCatalog() / toRoutingContext(). `params.force` re-probes live.
      // ─────────────────────────────────────────────────────────────────────
      case "capability_probe": {
        const { ollamaCapabilityProbeEngine } = await import(
          "../../engines/OllamaCapabilityProbeEngine.js"
        );
        result = await ollamaCapabilityProbeEngine.probe({ force: params.force === true });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // reason_before_action -- RBA/U-RBA-ENGINE-02 (slot:india)
      // Multi-model pre-flight reasoning gate: classify a proposed tool action's
      // risk and consult a LOCAL-ONLY Ollama consensus panel -> PROCEED|REVISE|BLOCK.
      // Fail-open, $0, no-recursion. The PreToolUse gate hook actuates this action.
      // ─────────────────────────────────────────────────────────────────────
      case "reason_before_action": {
        const { reasonBeforeActionEngine } = await import(
          "../../engines/ReasonBeforeActionEngine.js"
        );
        result = await reasonBeforeActionEngine.plan({
          intent: String(params.intent ?? ""),
          tool_name: typeof params.tool_name === "string" ? params.tool_name : undefined,
          tool_input:
            params.tool_input && typeof params.tool_input === "object"
              ? (params.tool_input as Record<string, unknown>)
              : undefined,
          risk_level:
            params.risk_level === "low" || params.risk_level === "medium" || params.risk_level === "high"
              ? params.risk_level
              : undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // group_normalize_reward — ULTRACODE-SYNERGY-MS0/Order 3 (GRPO)
      // Critic-free across-N-trajectory advantage normalization (DeepSeek-R1
      // GRPO). params.rewards = number[] of N trajectory rewards (from the reward
      // shapers / PolicyExperienceLedger.reward_total). Returns z-scored advantages
      // (mean≈0) + mode + group stats; rank-fallback on degenerate std; never throws.
      // ─────────────────────────────────────────────────────────────────────
      case "group_normalize_reward": {
        const { GroupRelativeRewardNormalizerEngine } = await import(
          "../../engines/GroupRelativeRewardNormalizerEngine.js"
        );
        const rewards = Array.isArray(params.rewards) ? (params.rewards as number[]) : [];
        result = GroupRelativeRewardNormalizerEngine.normalizeGroup(rewards);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // rank_trajectories — ULTRACODE-SYNERGY-MS0/Order 4 (RULER)
      // Judge ranks N agentic trajectories relative to the system prompt (the
      // reward spec) → relative 0-1 reward → GRPO advantage. params: { trajectories:
      // [{id?,content}], systemPrompt?, rubric?, prismContext?, timeoutMs? }.
      // ─────────────────────────────────────────────────────────────────────
      case "rank_trajectories": {
        const { multiModelConsensusEngine } = await import(
          "../../engines/MultiModelConsensusEngine.js"
        );
        result = await multiModelConsensusEngine.rankTrajectories({
          trajectories: Array.isArray(params.trajectories)
            ? (params.trajectories as { id?: string; content: string }[])
            : [],
          systemPrompt: typeof params.systemPrompt === "string" ? params.systemPrompt : undefined,
          rubric: typeof params.rubric === "string" ? params.rubric : undefined,
          prismContext: params.prismContext === true,
          timeoutMs: typeof params.timeoutMs === "number" ? params.timeoutMs : undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_route_mill_pipeline — Full P2P pipeline
      // ─────────────────────────────────────────────────────────────────────
      // ─────────────────────────────────────────────────────────────────────
      // system_coordinate — Tier-1 → Tier-2 (FullSystemAICoordinatorEngine)
      // PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-AI-TIER1-TIER2. The canonical command
      // path Claude uses to dispatch a DomainAGIIntent. The coordinator
      // validates, delegates the mfg slice through ProcessIntelligenceRouter,
      // appends `coordinator_metadata` audit envelope, and publishes a
      // coordinator-level outcome event tagged `coordinator_dispatch`.
      // ─────────────────────────────────────────────────────────────────────
      case "system_coordinate": {
        const { fullSystemAICoordinatorEngine } = await import(
          "../../engines/FullSystemAICoordinatorEngine.js"
        );
        // The coordinator re-validates the intent against DomainAGIIntentSchema
        // at its own boundary, so we pass `params.intent` through as the
        // canonical contract type. Coordinator-boundary failure returns a
        // structured DomainAGIResult with error.code:"INVALID_INTENT".
        const coordResponse = await fullSystemAICoordinatorEngine.coordinate(
          params.intent as Parameters<typeof fullSystemAICoordinatorEngine.coordinate>[0],
        );
        result = coordResponse;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // system_route_specialist — Tier-2 → Tier-3 routing for non-mfg domains
      // PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-AI-TIER2-TIER3. Returns a structured
      // route decision naming the canonical specialist engine + dispatcher
      // action for cad/cam/safety/quality. Caller executes the named action.
      // ─────────────────────────────────────────────────────────────────────
      case "system_route_specialist": {
        const { fullSystemAICoordinatorEngine } = await import(
          "../../engines/FullSystemAICoordinatorEngine.js"
        );
        const routeResponse = await fullSystemAICoordinatorEngine.routeSpecialist(
          params.domain as Parameters<typeof fullSystemAICoordinatorEngine.routeSpecialist>[0],
          (params.payload as Record<string, unknown>) ?? {},
        );
        result = routeResponse;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // outcome_override_{ingest,get,keys} — same-session learning loop
      // PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-LEARN-CAM-SFC. OutcomeFeedbackOverride
      // StoreEngine ingests successful high-confidence outcomes into a
      // per-domain override map that downstream CAM/SFC engines consult
      // before computing. Read-side actions expose the store for query.
      // ─────────────────────────────────────────────────────────────────────
      case "outcome_override_ingest": {
        const { outcomeFeedbackOverrideStoreEngine } = await import(
          "../../engines/OutcomeFeedbackOverrideStoreEngine.js"
        );
        const mutated = outcomeFeedbackOverrideStoreEngine.ingest(params as Parameters<typeof outcomeFeedbackOverrideStoreEngine.ingest>[0]);
        result = { mutated, totalIngested: outcomeFeedbackOverrideStoreEngine.totalIngested, lastFilteredCount: outcomeFeedbackOverrideStoreEngine.lastFilteredCount };
        break;
      }
      case "outcome_override_get": {
        const { outcomeFeedbackOverrideStoreEngine } = await import(
          "../../engines/OutcomeFeedbackOverrideStoreEngine.js"
        );
        const record = outcomeFeedbackOverrideStoreEngine.get(
          params.domain as Parameters<typeof outcomeFeedbackOverrideStoreEngine.get>[0],
          params.key as string,
        );
        result = { record: record ?? null };
        break;
      }
      case "outcome_override_keys": {
        const { outcomeFeedbackOverrideStoreEngine } = await import(
          "../../engines/OutcomeFeedbackOverrideStoreEngine.js"
        );
        const keys = outcomeFeedbackOverrideStoreEngine.keys(
          params.domain as Parameters<typeof outcomeFeedbackOverrideStoreEngine.keys>[0],
        );
        result = { domain: params.domain, keys };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // shopfloor_{translate,publish} — MTConnect telemetry → outcome bus
      // PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-SHOPFLOOR-LEARN.
      // ─────────────────────────────────────────────────────────────────────
      case "shopfloor_translate": {
        const { mtconnectToOutcomeBridgeEngine } = await import(
          "../../engines/MTConnectToOutcomeBridgeEngine.js"
        );
        const outcome = mtconnectToOutcomeBridgeEngine.translate(params as Parameters<typeof mtconnectToOutcomeBridgeEngine.translate>[0]);
        result = { outcome: outcome ?? null, successCount: mtconnectToOutcomeBridgeEngine.successCount, failureCount: mtconnectToOutcomeBridgeEngine.failureCount, malformedCount: mtconnectToOutcomeBridgeEngine.malformedCount };
        break;
      }
      case "shopfloor_publish": {
        const { mtconnectToOutcomeBridgeEngine } = await import(
          "../../engines/MTConnectToOutcomeBridgeEngine.js"
        );
        const outcome = await mtconnectToOutcomeBridgeEngine.publishTranslated(params as Parameters<typeof mtconnectToOutcomeBridgeEngine.publishTranslated>[0]);
        result = { outcome: outcome ?? null, published: outcome !== null };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // jm_die_lathe_upgrade — per-machine S/F upgrade for JM Die lathe programs
      // JM-DIE-LATHE-UPGRADE-MS0. Returns 7 variants (one per JM Die lathe).
      // ─────────────────────────────────────────────────────────────────────
      case "jm_die_lathe_upgrade": {
        const { jmDieLatheProgramUpgraderEngine } = await import(
          "../../engines/JMDieLatheProgramUpgraderEngine.js"
        );
        const upgrade = jmDieLatheProgramUpgraderEngine.upgradeOne(
          params as unknown as Parameters<typeof jmDieLatheProgramUpgraderEngine.upgradeOne>[0],
        );
        result = upgrade;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // jm_die_lathe_upgrade_v2 — physics-driven upgrade via UltimateSpeedFeed
      // JM-DIE-LATHE-UPGRADE-MS0/U-V2-PHYSICS. Returns 7 variants with
      // confidence-scored RPM/feedrate/DoC + provenance + ISO group routing.
      // ─────────────────────────────────────────────────────────────────────
      case "jm_die_lathe_upgrade_v2": {
        const { jmDieLatheProgramUpgraderV2Engine } = await import(
          "../../engines/JMDieLatheProgramUpgraderV2Engine.js"
        );
        const upgrade = await jmDieLatheProgramUpgraderV2Engine.upgradeOne(
          params as unknown as Parameters<typeof jmDieLatheProgramUpgraderV2Engine.upgradeOne>[0],
        );
        result = upgrade;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // jm_die_lathe_audit — 3-stage audit pipeline: gcSafetyAnalyzer +
      // parseLatheProgram + screenCollisionsLathe → verdict PASS/PASS_WITH_NOTES/
      // WARN/FAIL. Built per /goal #5 "assess, analyze and test each program
      // against our collision avoidance + code auditing capabilities".
      // JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-PIPELINE.
      // ─────────────────────────────────────────────────────────────────────
      case "jm_die_lathe_audit": {
        const { LatheProgramAuditPipelineEngine } = await import(
          "../../engines/LatheProgramAuditPipelineEngine.js"
        );
        const audit = LatheProgramAuditPipelineEngine.auditOne(
          params as unknown as Parameters<typeof LatheProgramAuditPipelineEngine.auditOne>[0],
        );
        result = audit;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // jm_die_lathe_program_library — frontend-facing aggregator for the
      // lathe-wizard / lathe-studio / shop-mgmt / biz-mgmt / employee-portal
      // nodes + camera-recognition consumers. Returns per-machine variants,
      // optimized-star indicator, dispatchable-machine list for the "send to
      // machine" pop-up. JM-DIE-LATHE-UPGRADE-MS0/U-PROGRAM-LIBRARY.
      // ─────────────────────────────────────────────────────────────────────
      case "jm_die_lathe_program_library": {
        const { LatheProgramLibraryEngine } = await import(
          "../../engines/LatheProgramLibraryEngine.js"
        );
        result = LatheProgramLibraryEngine.list(
          params as unknown as Parameters<typeof LatheProgramLibraryEngine.list>[0],
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // jm_die_lathe_program_recognize — OCR/barcode/QR/vision recognized
      // partNumber → library lookup with fuzzy alternates + routing hint.
      // Closes camera-recognition leg of operator /goal #6.
      // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-PROGRAM-RECOGNITION-BRIDGE.
      // ─────────────────────────────────────────────────────────────────────
      case "jm_die_lathe_program_recognize": {
        const { LatheProgramRecognitionBridgeEngine } = await import(
          "../../engines/LatheProgramRecognitionBridgeEngine.js"
        );
        result = LatheProgramRecognitionBridgeEngine.recognize(
          params as unknown as Parameters<typeof LatheProgramRecognitionBridgeEngine.recognize>[0],
        );
        break;
      }

      case "ai_route_mill_pipeline": {
        const facade = await getMillFacade();
        // Catch NotWiredError from not-yet-built sub-engines: the routing itself
        // succeeds (request_type is known, facade dispatched), so we return
        // success:true at the routing layer with wired:false for the sub-pipeline.
        try {
          const response = await facade.orchestrate({
            request_type: "print_to_program",
            material: params.material as string | undefined,
            iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
            // Cast through unknown: schema validates shape at runtime via Zod;
            // tsc requires the unknown bridge because Record<string,unknown>
            // lacks the required ToolGeometry fields (diameter_mm, flutes).
            tool: params.tool as unknown as ToolGeometry | undefined,
            params: params.params as Record<string, unknown> | undefined,
            machine: params.machine as Record<string, unknown> | undefined,
            features: params.features as Record<string, unknown>[] | undefined,
            geometry: params.geometry,
            include_provenance: params.include_provenance as boolean | undefined,
          });
          result = response;
        } catch (routeErr: unknown) {
          // NotWiredError: routing succeeded but sub-engine not yet built.
          // Return a structured partial so callers can distinguish routing
          // success from sub-pipeline failure (intent: verify routing, not P2P).
          const isNotWired = routeErr instanceof Error && (routeErr as any).code === "NOT_WIRED";
          if (isNotWired) {
            const nwe = routeErr as any;
            result = {
              success: true,
              request_type: "print_to_program",
              wired: false,
              roadmap_ref: nwe.roadmapRef ?? "pending",
              partial: nwe.partial ?? {},
            };
          } else {
            throw routeErr;
          }
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_agi_reason — AGI reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_agi_reason": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "agi",
          intent: params.intent as string,
          reasoning_mode: params.reasoning_mode as string | undefined,
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          // Cast through unknown: schema validates shape at runtime via Zod;
          // tsc requires the unknown bridge because Record<string,unknown>
          // lacks the required ToolGeometry fields (diameter_mm, flutes).
          tool: params.tool as unknown as ToolGeometry | undefined,
          params: params.params as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = response;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_awareness_query — Query capabilities
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_awareness_query": {
        const awareness = await getMillAwareness();
        const query = params.query as string;
        const category = params.category as string | undefined;
        const topK = (params.top_k as number | undefined) ?? 10;

        // Find matching engines
        const matches = awareness.findEngines(query);

        // Filter by category if specified
        const filtered = category && category !== "all"
          ? matches.filter(m => m.category === category)
          : matches;

        // Limit results
        const limited = filtered.slice(0, topK);

        result = {
          query,
          category: category ?? "all",
          matches: limited,
          total_found: filtered.length,
          registry_stats: awareness.getStats(),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_scientific_analyze — Physics analysis
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_scientific_analyze": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "scientific",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          // Cast through unknown: schema validates shape at runtime via Zod;
          // tsc requires the unknown bridge because Record<string,unknown>
          // lacks the required ToolGeometry fields (diameter_mm, flutes).
          tool: params.tool as unknown as ToolGeometry | undefined,
          params: params.params as Record<string, unknown> | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          analysis_type: params.analysis_type ?? "all",
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_wisdom_query — Tribal knowledge
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_wisdom_query": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "wisdom",
          query: params.query as string,
          domain: params.domain as string | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          query: params.query,
          domain: params.domain ?? "general",
          material: params.material,
          operation: params.operation,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ai_mill_adaptive_strategy — Adaptive toolpath
      // ─────────────────────────────────────────────────────────────────────
      case "ai_mill_adaptive_strategy": {
        const facade = await getMillFacade();
        const response = await facade.orchestrate({
          request_type: "adaptive",
          material: params.material as string | undefined,
          iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
          // Cast through unknown: schema validates shape at runtime via Zod;
          // tsc requires the unknown bridge because Record<string,unknown>
          // lacks the required ToolGeometry fields (diameter_mm, flutes).
          tool: params.tool as unknown as ToolGeometry | undefined,
          machine: params.machine as Record<string, unknown> | undefined,
          include_provenance: params.include_provenance as boolean | undefined,
        });
        result = {
          operation: params.operation,
          feature_type: params.feature_type,
          stock_to_leave: params.stock_to_leave,
          ...response,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_record — Record a success pattern
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_record": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.record({
          task_category: params.task_category as unknown as TaskCategoryT,
          task_description: params.task_description as string,
          task_keywords: params.task_keywords as string[],
          approach_summary: params.approach_summary as string,
          mcp_actions_used: params.mcp_actions_used as string[] | undefined,
          tools_used: params.tools_used as string[] | undefined,
          engines_invoked: params.engines_invoked as string[] | undefined,
          confidence: params.confidence as "high" | "medium" | "low" | undefined,
          domain: params.domain as string | undefined,
          constraints: params.constraints as string[] | undefined,
          lineage_id: params.lineage_id as string | undefined,
          pattern_id: params.pattern_id as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_query — Query patterns
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_query": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.query({
          task_category: params.task_category as unknown as TaskCategoryT | undefined,
          keywords: params.keywords as string[] | undefined,
          domain: params.domain as string | undefined,
          min_confidence: params.min_confidence as "high" | "medium" | "low" | undefined,
          min_success_count: params.min_success_count as number | undefined,
          limit: params.limit as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_reinforce — Reinforce a pattern (success/failure)
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_reinforce": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.reinforce({
          pattern_id: params.pattern_id as string,
          success: params.success as boolean,
          note: params.note as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // pattern_stats — Get pattern bank statistics
      // ─────────────────────────────────────────────────────────────────────
      case "pattern_stats": {
        const { successPatternBankEngine } = await import("../../engines/SuccessPatternBankEngine.js");
        result = successPatternBankEngine.stats();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // sfc_drift_canary_check — SFC drift detection
      // ─────────────────────────────────────────────────────────────────────
      case "sfc_drift_canary_check": {
        const { sfcDriftCanaryEngine } = await import("../../engines/SFCDriftCanaryEngine.js");
        result = sfcDriftCanaryEngine.recordOverride(
          params as unknown as Parameters<typeof sfcDriftCanaryEngine.recordOverride>[0],
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ppg_drift_canary_check — PPG drift detection
      // ─────────────────────────────────────────────────────────────────────
      case "ppg_drift_canary_check": {
        const { ppgDriftCanaryEngine } = await import("../../engines/PPGDriftCanaryEngine.js");
        result = ppgDriftCanaryEngine.recordAlarm(
          params as unknown as Parameters<typeof ppgDriftCanaryEngine.recordAlarm>[0],
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // sfc_fewshot_predict — Few-shot material prediction
      // ─────────────────────────────────────────────────────────────────────
      case "sfc_fewshot_predict": {
        const { sfcFewShotNewMaterialEngine } = await import("../../engines/SFCFewShotNewMaterialEngine.js");
        const p = params as {
          customer: string;
          material: string;
          tool_class: string;
          query_features: Parameters<typeof sfcFewShotNewMaterialEngine.predict>[3];
        };
        result = sfcFewShotNewMaterialEngine.predict(
          p.customer,
          p.material,
          p.tool_class,
          p.query_features,
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ppg_sfc_closed_loop — E2E closed-loop orchestration
      // ─────────────────────────────────────────────────────────────────────
      case "ppg_sfc_closed_loop": {
        const { ppgSFCClosedLoopOrchestratorEngine } = await import("../../engines/PPGSFCClosedLoopOrchestratorEngine.js");
        result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(params as any);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // submit_sfm_override / get_override_history_size — CL-1 (iter317)
      // Operator-facing closed-loop override capture for PPG-SFC training.
      // See [[reference_lathe_wizard_build_wire_plan_2026_05_27]].
      // ─────────────────────────────────────────────────────────────────────
      case "submit_sfm_override": {
        const { ppgSFCClosedLoopOrchestratorEngine } = await import("../../engines/PPGSFCClosedLoopOrchestratorEngine.js");
        const p = params as {
          adapter_key: string;
          lineage_id: string;
          recommended_sfm: number;
          actual_sfm: number;
          override_factor: number;
          reason?: string;
        };
        const override = {
          lineage_id: p.lineage_id,
          recommended_sfm: p.recommended_sfm,
          actual_sfm: p.actual_sfm,
          override_factor: p.override_factor,
          reason: p.reason,
        };
        result = ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(p.adapter_key, [override]);
        break;
      }
      case "get_override_history_size": {
        const { ppgSFCClosedLoopOrchestratorEngine } = await import("../../engines/PPGSFCClosedLoopOrchestratorEngine.js");
        const p = params as { adapter_key: string };
        const size = ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize(p.adapter_key);
        result = { adapter_key: p.adapter_key, history_size: size, threshold: 30, ready_for_training: size >= 30 };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // iterate_retrieve — progressive context refinement (DISPATCH→EVALUATE→REFINE→LOOP)
      // ──────────────────────────────────────────────────────────────────────
      case "iterate_retrieve": {
        const { iterativeRetrievalEngine } = await import("../../engines/IterativeRetrievalEngine.js");
        result = iterativeRetrievalEngine.retrieve({
          query: params.query as string,
          dispatch_target: params.dispatch_target as any,
          max_cycles: params.max_cycles as number | undefined,
          target_count: params.target_count as number | undefined,
          min_relevance: params.min_relevance as number | undefined,
          initial_keywords: params.initial_keywords as string[] | undefined,
          exclude_patterns: params.exclude_patterns as string[] | undefined,
          max_files_per_cycle: params.max_files_per_cycle as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_explain_decision": {
        const { aiDecisionExplanationEngine } = await import("../../engines/AIDecisionExplanationEngine.js");
        result = aiDecisionExplanationEngine.explainDecision(
          params as unknown as Parameters<typeof aiDecisionExplanationEngine.explainDecision>[0],
        );
        break;
      }
      case "ai_extract_classify": {
        const { aiExtractionReasoner } = await import("../../engines/AIExtractionReasonerEngine.js");
        result = await aiExtractionReasoner.classifyContent(params.content);
        break;
      }
      case "ai_physics_optimize": {
        const { aiPhysicsOptimizationEngine } = await import("../../engines/AIPhysicsOptimizationEngine.js");
        result = await aiPhysicsOptimizationEngine.optimize(
          params as unknown as Parameters<typeof aiPhysicsOptimizationEngine.optimize>[0],
        );
        break;
      }
      case "ai_knowledge_query": {
        const { aiDeepKnowledgeIntegration } = await import("../../engines/AIDeepKnowledgeIntegrationEngine.js");
        result = await aiDeepKnowledgeIntegration.query(
          params as unknown as Parameters<typeof aiDeepKnowledgeIntegration.query>[0],
        );
        break;
      }
      case "ai_material_lookup": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getMaterialParameters(params.material as string);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_milling_deep_reason": {
        const { millingDeepReasoningEngine } = await import("../../engines/MillingDeepReasoningEngine.js");
        const p = params as { query: string; context: Record<string, unknown>; mode?: "analytical"|"comparative"|"diagnostic"|"predictive"|"creative" };
        result = millingDeepReasoningEngine.reason(
          p.query,
          p.context as unknown as Parameters<typeof millingDeepReasoningEngine.reason>[1],
          p.mode,
        );
        break;
      }
      case "ai_wedm_deep_logic": {
        const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
        const p = params as { query: string; context?: Record<string, unknown> };
        result = wireEDMDeepLogicEngine.reason(p.query, p.context);
        break;
      }
      case "ai_wedm_deep_neural": {
        const { wireEDMDeepNeuralReasoningEngine } = await import("../../engines/WireEDMDeepNeuralReasoningEngine.js");
        result = await wireEDMDeepNeuralReasoningEngine.reason(
          params as unknown as Parameters<typeof wireEDMDeepNeuralReasoningEngine.reason>[0],
        );
        break;
      }
      case "ai_milling_synthesize": {
        const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
        result = await millingDeepKnowledgeSynthesisEngine.synthesize(
          params as unknown as Parameters<typeof millingDeepKnowledgeSynthesisEngine.synthesize>[0],
        );
        break;
      }
      case "ai_lathe_reason": {
        const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
        result = await latheAIReasoningEngine.reason(
          params as unknown as Parameters<typeof latheAIReasoningEngine.reason>[0],
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
      // ─────────────────────────────────────────────────────────────────────
      case "ai_milling_agi": {
        const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
        result = millingAGIOrchestrationEngine.analyzeWithAGI(
          params as unknown as Parameters<typeof millingAGIOrchestrationEngine.analyzeWithAGI>[0],
        );
        break;
      }
      case "ai_milling_twin_simulate": {
        const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
        const p = params as { duration_s: number; parameter_changes?: Record<string, unknown> };
        result = millingDigitalTwinEngine.simulate(
          p.duration_s,
          p.parameter_changes as unknown as Parameters<typeof millingDigitalTwinEngine.simulate>[1],
        );
        break;
      }
      case "ai_wedm_master": {
        const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
        result = await wireEDMMasterAIEngine.analyze(
          params as unknown as Parameters<typeof wireEDMMasterAIEngine.analyze>[0],
        );
        break;
      }
      case "ai_wedm_neural_orchestrate": {
        const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
        result = wireEDMNeuralOrchestrationEngine.orchestrate(
          params as unknown as Parameters<typeof wireEDMNeuralOrchestrationEngine.orchestrate>[0],
        );
        break;
      }
      case "ai_lathe_train": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        const p = params as { programs: Array<{ content: string; filepath: string }> };
        result = latheAITrainingEngine.trainFromPrograms(p.programs);
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
      case "ai_wedm_advanced_neural": {
        const { wireEDMAdvancedNeuralEngine } = await import("../../engines/WireEDMAdvancedNeuralEngine.js");
        const p = params as {
          material: string;
          thickness_mm: number;
          target_ra_um: number;
          target_accuracy_mm?: number;
          wire_diameter_mm?: number;
          taper_angle_deg?: number;
          machine?: string;
        };
        // Normalize flat params into WEDMFeatureVector
        const KNOWN_MATERIALS = ["D2","M2","A2","S7","H13","carbide","Ti6Al4V","Inconel_718","AL6061"];
        const matIdx = KNOWN_MATERIALS.findIndex(m => p.material.toLowerCase().includes(m.toLowerCase()));
        const matEmbedding = KNOWN_MATERIALS.map((_, i) => i === matIdx ? 1 : 0);
        const KNOWN_MACHINES = ["mitsubishi","makino","sodick","fanuc","agie","charmilles"];
        const machLower = (p.machine ?? "").toLowerCase();
        const machIdx = KNOWN_MACHINES.findIndex(m => machLower.includes(m));
        const machEmbedding = KNOWN_MACHINES.map((_, i) => i === machIdx ? 1 : 0);
        const featureVector = {
          material_embedding: matEmbedding,
          thickness_normalized: Math.min(p.thickness_mm / 150, 1),
          taper_angle_normalized: Math.min((p.taper_angle_deg ?? 0) / 30, 1),
          corner_count_normalized: 0.5,
          path_length_normalized: 0.5,
          machine_embedding: machEmbedding,
          wire_diameter_normalized: Math.min((p.wire_diameter_mm ?? 0.25) / 0.35, 1),
          target_ra_normalized: Math.min(p.target_ra_um / 10, 1),
          target_accuracy_normalized: Math.min((p.target_accuracy_mm ?? 0.005) / 0.1, 1),
        };
        result = wireEDMAdvancedNeuralEngine.predictParameters(featureVector);
        break;
      }
      case "ai_wedm_agi_orchestrate": {
        const { wireEDMAGIOrchestrator } = await import("../../engines/WireEDMAGIOrchestrator.js");
        const p = params as {
          query: string;
          material: string;
          thickness_mm: number;
          wire_diameter_mm: number;
          target_ra_um?: number;
          target_accuracy_mm?: number;
          machine?: string;
          mode?: string;
          include_counterfactuals?: boolean;
          include_causal_analysis?: boolean;
        };
        // Normalize flat params into AGIRequest shape
        const agiRequest = {
          query: p.query,
          context: {
            material: p.material,
            thickness_mm: p.thickness_mm,
            wire_diameter_mm: p.wire_diameter_mm,
            machine: p.machine,
            target_ra_um: p.target_ra_um,
            target_accuracy_mm: p.target_accuracy_mm,
          },
          mode: p.mode as Parameters<typeof wireEDMAGIOrchestrator.process>[0]["mode"],
          include_counterfactuals: p.include_counterfactuals,
          include_causal_analysis: p.include_causal_analysis,
        };
        result = wireEDMAGIOrchestrator.process(agiRequest);
        break;
      }
      case "ai_wedm_print_to_program": {
        const { wireEDMAIPrintToProgramEngine } = await import("../../engines/WireEDMAIPrintToProgramEngine.js");
        const p = params as unknown as Parameters<typeof wireEDMAIPrintToProgramEngine.generate>[0];
        result = await wireEDMAIPrintToProgramEngine.generate(p);
        break;
      }
      case "ai_wedm_cam_knowledge": {
        const { wireEDMCAMKnowledgeEngine } = await import("../../engines/WireEDMCAMKnowledgeEngine.js");
        const p = params as { query: string; category?: "toolpath" | "parameter" | "workflow" | "optimization" | "safety" };
        result = wireEDMCAMKnowledgeEngine.searchKnowledge(p.query, p.category);
        break;
      }
      case "ai_wedm_synthesize_knowledge": {
        const { wireEDMKnowledgeSynthesisEngine } = await import("../../engines/WireEDMKnowledgeSynthesisEngine.js");
        const { question, material, thickness_mm, wire_diameter, target_ra_um, machine, urgency, confidence_threshold, max_hypotheses, ...rest } = params as {
          question: string;
          material?: string;
          thickness_mm?: number;
          wire_diameter?: string;
          target_ra_um?: number;
          machine?: string;
          urgency?: "low" | "normal" | "high" | "critical";
          confidence_threshold?: number;
          max_hypotheses?: number;
          [key: string]: unknown;
        };
        result = await wireEDMKnowledgeSynthesisEngine.synthesize({
          question,
          context: { material, thickness_mm, wire_diameter, target_ra_um, machine, urgency, ...rest },
          confidence_threshold,
          max_hypotheses,
        });
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
      case "ai_lathe_orchestrate": {
        const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
        const p = params as {
          program: string | Record<string, unknown>;
          context?: { material?: string; machineId?: string; controller?: string; constraints?: Record<string, unknown> };
          strategy?: "full_coverage" | "fast_path" | "quality_optimized" | "cost_optimized" | "safety_first" | "learning_focused" | "adaptive";
        };
        result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
          p.program as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[0],
          (p.context ?? {}) as unknown as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[1],
          p.strategy as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>[2],
        );
        break;
      }
      case "ai_lathe_active_learn_select": {
        const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
        const p = params as {
          labeled_data: unknown[];
          pool_data?: unknown[];
          n_samples?: number;
          query_strategy?: string;
          budget?: Record<string, unknown>;
        };
        latheActiveLearningEngine.initialize(
          p.labeled_data as Parameters<typeof latheActiveLearningEngine.initialize>[0],
          p.pool_data as Parameters<typeof latheActiveLearningEngine.initialize>[1],
          p.budget as Parameters<typeof latheActiveLearningEngine.initialize>[2],
        );
        result = latheActiveLearningEngine.selectSamples(
          p.pool_data as Parameters<typeof latheActiveLearningEngine.selectSamples>[0],
          p.n_samples,
          p.query_strategy as Parameters<typeof latheActiveLearningEngine.selectSamples>[2],
        );
        break;
      }
      case "ai_lathe_bayesian_fit_gp": {
        const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
        const p = params as {
          observations: Array<{ x: number[]; y: number; timestamp?: number }>;
          kernel_config: { type: string; length_scales?: number[]; signal_variance?: number; noise_variance?: number; matern_nu?: 1.5 | 2.5; alpha?: number };
        };
        const obs = p.observations.map(o => ({ x: o.x, y: o.y, timestamp: o.timestamp ?? Date.now() }));
        // Engine requires length_scales[]; broadcast a unit length-scale per input dimension if caller omitted it.
        const dim = obs[0]?.x.length ?? 1;
        const kernelConfig = {
          ...p.kernel_config,
          length_scales: p.kernel_config.length_scales ?? Array.from({ length: dim }, () => 1.0),
        };
        result = latheBayesianOptimizationEngine.fitGP(
          obs as Parameters<typeof latheBayesianOptimizationEngine.fitGP>[0],
          kernelConfig as Parameters<typeof latheBayesianOptimizationEngine.fitGP>[1],
        );
        break;
      }
      case "ai_lathe_attention_compute": {
        const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
        const p = params as {
          tokens: Array<{ id: number; token: string; type: string; position: number; embedding: number[]; value?: number; line_number?: number; semantic_role?: string }>;
        };
        result = latheAttentionMechanismEngine.computeManufacturingAttention(
          p.tokens as Parameters<typeof latheAttentionMechanismEngine.computeManufacturingAttention>[0],
        );
        break;
      }
      case "ai_lathe_adaptive_engagement": {
        const { latheAdaptiveMachiningEngine } = await import("../../engines/LatheAdaptiveMachiningEngine.js");
        const p = params as {
          operation_type: string;
          diameter: number;
          depth_of_cut: number;
          feed_per_rev: number;
          lead_angle: number;
          nose_radius: number;
          cutting_speed: number;
        };
        result = latheAdaptiveMachiningEngine.calculateTurningEngagement({
          operationType: p.operation_type as Parameters<typeof latheAdaptiveMachiningEngine.calculateTurningEngagement>[0]["operationType"],
          diameter: p.diameter,
          depthOfCut: p.depth_of_cut,
          feedPerRev: p.feed_per_rev,
          leadAngle: p.lead_angle,
          noseRadius: p.nose_radius,
          cuttingSpeed: p.cutting_speed,
        });
        break;
      }

      // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
      case "ai_code_gate_pending": {
        const { aiGeneratedCodeApprovalGateEngine } = await import("../../engines/AIGeneratedCodeApprovalGateEngine.js");
        const p = params as { status?: string; approver?: string; request_type?: string };
        result = aiGeneratedCodeApprovalGateEngine.getPending(p as Parameters<typeof aiGeneratedCodeApprovalGateEngine.getPending>[0]);
        break;
      }
      case "ai_self_mod_propose_batch": {
        const { selfModificationProposalEngine } = await import("../../engines/SelfModificationProposalEngine.js");
        const p = params as { observations: Array<Record<string, unknown>>; at?: string };
        // Zod has already validated each observation matches the PatternObservation shape.
        result = selfModificationProposalEngine.proposeBatch(
          p.observations as unknown as Parameters<typeof selfModificationProposalEngine.proposeBatch>[0],
          p.at,
        );
        break;
      }
      case "ai_self_mod_is_approved": {
        const { selfModificationApprovalEngine } = await import("../../engines/SelfModificationApprovalEngine.js");
        const p = params as { proposal_id: string; proposal_hash: string; now_ms?: number };
        result = { approved: selfModificationApprovalEngine.isApproved(p.proposal_id, p.proposal_hash, p.now_ms) };
        break;
      }
      case "ai_intelligence_maximize": {
        const { aiIntelligenceMaximizer } = await import("../../engines/AIIntelligenceMaximizerEngine.js");
        // Zod-validated MaximizerInput; cast through unknown for structural-overlap satisfaction.
        result = await aiIntelligenceMaximizer.maximize(
          params as unknown as Parameters<typeof aiIntelligenceMaximizer.maximize>[0],
        );
        break;
      }
      case "ai_hook_rule_match": {
        const { hookRuleMatcherEngine } = await import("../../engines/HookRuleMatcherEngine.js");
        const p = params as { tool: string; params: Record<string, unknown> };
        result = hookRuleMatcherEngine.match(p.tool, p.params);
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // INTEL-OLLAMA-OBSIDIAN-MS0/P5: 4 orphan reasoning engines
      // ───────────────────────────────────────────────────────────────────────
      case "creative_solve": {
        const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
        const p = params as {
          problem: Parameters<typeof prismCreativeReasoningEngine.explore>[0];
          mode?: Parameters<typeof prismCreativeReasoningEngine.explore>[1];
        };
        result = prismCreativeReasoningEngine.explore(p.problem, p.mode);
        break;
      }
      case "causal_analyze": {
        const { CausalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
        type CausalEdge = Parameters<InstanceType<typeof CausalReasoningEngine>["addEdges"]>[0][number];
        const p = params as {
          edges: ReadonlyArray<CausalEdge>;
          target?: string;
          source?: string;
          maxHops?: number;
        };
        const engine: InstanceType<typeof CausalReasoningEngine> = new CausalReasoningEngine();
        if (p.edges) engine.addEdges(p.edges);
        const out: Record<string, unknown> = {
          nodeCount: engine.nodeCount(),
          edgeCount: engine.edgeCount(),
        };
        if (p.target) out.rootCauses = engine.rootCauses(p.target, p.maxHops ?? 3);
        if (p.source) out.impact = engine.traceImpact(p.source, p.maxHops ?? 3);
        result = out;
        break;
      }
      // WIRE-MS0/U-WIRE07: CausalReasoningEngine granular singleton actions.
      // Unlike causal_analyze (which creates a fresh engine per call), these
      // operate on the shared singleton so state accumulates across calls in a
      // session -- enabling multi-step add -> trace -> root-cause workflows.
      case "causal_add_edge": {
        const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
        const edge = causalReasoningEngine.addEdge({
          from: params.from as string,
          to: params.to as string,
          confidence: params.confidence as number,
          polarity: params.polarity as "positive" | "negative" | "unknown",
          reason: typeof params.reason === "string" ? params.reason : undefined,
        });
        result = { ...edge };
        break;
      }
      case "causal_trace_impact": {
        const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
        const maxHops = typeof params.maxHops === "number" ? params.maxHops : 3;
        const report = causalReasoningEngine.traceImpact(params.source as string, maxHops);
        result = report;
        break;
      }
      case "causal_root_causes": {
        const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
        const maxHopsR = typeof params.maxHops === "number" ? params.maxHops : 3;
        const roots = causalReasoningEngine.rootCauses(params.target as string, maxHopsR);
        result = { target: params.target as string, rootCauses: roots };
        break;
      }
      case "counterfactual_predict": {
        const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
        type GraphVariables = Parameters<typeof counterfactualReasoningEngine.createCausalGraph>[0];
        type GraphDomain = Parameters<typeof counterfactualReasoningEngine.createCausalGraph>[1];
        const p = params as {
          // Schema declares graphSpec as { domain, variables, relations } wrapper — unpack
          // for the engine which takes (variables[], domain) directly.
          graphSpec: { domain?: GraphDomain; variables: GraphVariables; relations?: unknown[] };
          intervention: { variable: string; value: number | string | boolean };
        };
        const graph = counterfactualReasoningEngine.createCausalGraph(
          p.graphSpec.variables,
          p.graphSpec.domain ?? "machining",
        );
        const counterfactual = counterfactualReasoningEngine.generateCounterfactual(
          graph.id,
          p.intervention.variable,
          p.intervention.value,
        );
        result = { graphId: graph.id, counterfactual };
        break;
      }
      case "scientific_reason": {
        const { ScientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
        type ScientificEngineInstance = InstanceType<typeof ScientificReasoningEngine>;
        type ReasonInputs = Parameters<ScientificEngineInstance["reason"]>[1];
        const p = params as {
          problem: string;
          inputs: ReasonInputs;
          calculationType: string;
        };
        const engine: ScientificEngineInstance = new ScientificReasoningEngine();
        result = engine.reason(p.problem, p.inputs, p.calculationType);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian beliefs
      // ─────────────────────────────────────────────────────────────────────
      case "belief_set": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as {
          id: string;
          distribution: Record<string, number>;
          description?: string;
        };
        const entry = beliefStateReasoningEngine.set(p.id, p.distribution, p.description);
        result = {
          id: entry.id,
          description: entry.description,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
        };
        break;
      }
      case "belief_update": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as { id: string; likelihood: Record<string, number> };
        const entry = beliefStateReasoningEngine.update(p.id, p.likelihood);
        result = {
          id: entry.id,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
        };
        break;
      }
      case "belief_query": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as {
          id: string;
          topK?: number;
          state?: string;
          includeEntropy?: boolean;
        };
        const entry = beliefStateReasoningEngine.get(p.id);
        if (!entry) {
          return dispatcherError(`Unknown belief id: ${p.id}`, action, "prism_ai");
        }
        const out: Record<string, unknown> = {
          id: entry.id,
          distribution: entry.distribution,
          updatedAt: entry.updatedAt,
          topK: beliefStateReasoningEngine.topK(p.id, p.topK ?? 3),
        };
        if (p.includeEntropy !== false) {
          out.entropy_bits = beliefStateReasoningEngine.entropy(p.id);
        }
        if (typeof p.state === "string" && p.state.length > 0) {
          out.probability_of_state = beliefStateReasoningEngine.probabilityOf(p.id, p.state);
        }
        result = out;
        break;
      }
      case "belief_list": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const all = beliefStateReasoningEngine.list();
        result = {
          count: beliefStateReasoningEngine.size(),
          beliefs: all.map(e => ({
            id: e.id,
            description: e.description,
            stateCount: Object.keys(e.distribution).length,
            updatedAt: e.updatedAt,
          })),
        };
        break;
      }
      case "belief_delete": {
        const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
        const p = params as { id: string };
        const removed = beliefStateReasoningEngine.delete(p.id);
        result = { ok: removed, id: p.id };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — step-by-step reasoning
      // ─────────────────────────────────────────────────────────────────────
      case "cot_reason": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ReasoningProblemArg = Parameters<typeof ChainOfThoughtEngine.reason>[0];
        const p = params as unknown as ReasoningProblemArg;
        const chain = ChainOfThoughtEngine.reason(p);
        result = {
          chain_id: chain.chain_id,
          step_count: chain.steps.length,
          current_confidence: chain.current_confidence,
          dead_end_count: chain.dead_ends.length,
          final_answer: chain.final_answer ?? null,
          meta: chain.meta,
          steps: chain.steps.map(s => ({
            step_id: s.step_id,
            type: s.type,
            content: s.content,
            confidence: s.confidence,
            premises: s.premises,
          })),
        };
        break;
      }
      case "cot_reason_tree": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ReasoningProblemArg = Parameters<typeof ChainOfThoughtEngine.reasonTree>[0];
        const p = params as unknown as ReasoningProblemArg & { beam_width?: number };
        const beamWidth = typeof p.beam_width === "number" ? p.beam_width : 3;
        const tree = ChainOfThoughtEngine.reasonTree(p, beamWidth);
        result = {
          tree_id: tree.tree_id,
          best_path: tree.best_path,
          beam_width: tree.beam_width,
          explored_nodes: tree.explored_nodes,
          final_answer: tree.final_answer ?? null,
        };
        break;
      }
      case "cot_explain": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        type ChainArg = Parameters<typeof ChainOfThoughtEngine.explainChain>[0];
        const p = params as { chain: ChainArg };
        if (!p.chain || typeof p.chain !== "object") {
          return dispatcherError("Missing required 'chain' parameter (ReasoningChain object)", action, "prism_ai");
        }
        const explanation = ChainOfThoughtEngine.explainChain(p.chain);
        result = { explanation };
        break;
      }
      case "cot_apply_heuristics": {
        const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
        const p = params as { problem?: string; context?: Record<string, unknown> };
        const problem = typeof p.problem === "string" ? p.problem : "";
        const ctx = (p.context && typeof p.context === "object") ? p.context : {};
        const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(problem, ctx);
        result = {
          problem,
          context: ctx,
          heuristics,
          count: heuristics.length,
        };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE24: ActiveLearningStrategyEngine — info-gain ranking
      // ─────────────────────────────────────────────────────────────────────
      case "learning_rank": {
        const { activeLearningStrategyEngine } = await import("../../engines/ActiveLearningStrategyEngine.js");
        type RankArg = Parameters<typeof activeLearningStrategyEngine.rank>[0];
        const p = params as { candidates: RankArg };
        const ranked = activeLearningStrategyEngine.rank(p.candidates);
        result = {
          count: ranked.length,
          totalInfoGain: ranked.reduce((a, r) => a + r.infoGain, 0),
          topRank: ranked[0] ?? null,
          ranked,
        };
        break;
      }
      case "learning_summary": {
        const { activeLearningStrategyEngine } = await import("../../engines/ActiveLearningStrategyEngine.js");
        type SummaryArg = Parameters<typeof activeLearningStrategyEngine.summary>[0];
        const p = params as { ranked: SummaryArg };
        const summary = activeLearningStrategyEngine.summary(p.ranked);
        result = summary;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE25: MetaLearningOptimizerEngine — learn-to-learn
      // The singleton holds the (scenario, strategy) → stats ledger across
      // calls; that's the whole point of this engine, so we MUST use the
      // singleton (a fresh class instance per call would have empty state).
      // ─────────────────────────────────────────────────────────────────────
      case "meta_learning_record": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        type OutcomeArg = Parameters<typeof metaLearningOptimizerEngine.record>[0];
        const p = params as unknown as OutcomeArg;
        const stats = metaLearningOptimizerEngine.record(p);
        result = { recorded: true, stats };
        break;
      }
      case "meta_learning_recommend": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { scenario: string; minAttempts?: number };
        const recommendation = metaLearningOptimizerEngine.recommend(
          p.scenario,
          typeof p.minAttempts === "number" ? p.minAttempts : 1,
        );
        // Return flat fields when a recommendation exists so callers can read
        // strategy/wilsonLowerBound/rationale directly; include scenario always
        // so null-result callers can identify which scenario had no candidates.
        result = recommendation !== null
          ? { recommendation, ...recommendation, scenario: p.scenario }
          : { scenario: p.scenario, recommendation: null };
        break;
      }
      case "meta_learning_stats": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { scenario: string; strategy: string };
        const stats = metaLearningOptimizerEngine.statsFor(p.scenario, p.strategy);
        result = { stats };
        break;
      }
      case "meta_learning_list": {
        const { metaLearningOptimizerEngine } = await import("../../engines/MetaLearningOptimizerEngine.js");
        const p = params as { mode?: "scenarios" | "all" };
        const mode = p.mode ?? "all";
        if (mode === "scenarios") {
          const scenarios = metaLearningOptimizerEngine.listScenarios();
          result = { mode, scenarios, count: scenarios.length };
        } else {
          const all = metaLearningOptimizerEngine.listAll();
          result = { mode, stats: all, count: all.length, size: metaLearningOptimizerEngine.size() };
        }
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE26: PeerLearningCoordinatorEngine — broker for
      // cross-session insight sharing. Singleton-only (state lives across calls).
      // ─────────────────────────────────────────────────────────────────────
      case "peer_broadcast": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        type BroadcastArg = Parameters<typeof peerLearningCoordinatorEngine.broadcast>[0];
        const p = params as unknown as BroadcastArg;
        const ingestion = peerLearningCoordinatorEngine.broadcast(p);
        result = ingestion;
        break;
      }
      case "peer_query": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        type QueryArg = Parameters<typeof peerLearningCoordinatorEngine.query>[0];
        const p = params as QueryArg;
        const insights = peerLearningCoordinatorEngine.query(p);
        result = { insights, count: insights.length };
        break;
      }
      case "peer_get": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        const p = params as { id: string };
        const insight = peerLearningCoordinatorEngine.get(p.id);
        result = { insight };
        break;
      }
      case "peer_size": {
        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
        result = { size: peerLearningCoordinatorEngine.size() };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE27: NeuralIntegrationEngine — neural cortex routing
      // Singleton holds learningHistory across calls (capped at 100).
      // ─────────────────────────────────────────────────────────────────────
      case "neural_route": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        type QueryArg = Parameters<typeof neuralIntegrationEngine.route>[0];
        const p = params as unknown as QueryArg;
        const route = neuralIntegrationEngine.route(p);
        result = route;
        break;
      }
      case "neural_recommend": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const p = params as { query: string };
        const recommendations = neuralIntegrationEngine.recommendCommands(p.query);
        result = { recommendations, count: recommendations.length };
        break;
      }
      case "neural_synthesize": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const p = params as { query: string };
        const synthesis = neuralIntegrationEngine.synthesize(p.query);
        result = synthesis;
        break;
      }
      case "neural_stats": {
        const { neuralIntegrationEngine } = await import("../../engines/NeuralIntegrationEngine.js");
        const stats = neuralIntegrationEngine.getLearningStats();
        result = stats;
        break;
      }
      // -----------------------------------------------------------------------
      // U-WIRE11-SYNC: AISystemSynchronizerEngine -- 3 granular actions
      // Replaces the deleted composite ai_system_sync action (modes bundled).
      // -----------------------------------------------------------------------
      case "ai_system_status": {
        const { aiSystemSynchronizerEngine } = await import("../../engines/AISystemSynchronizerEngine.js");
        result = aiSystemSynchronizerEngine.getStatus();
        break;
      }
      case "ai_system_summary": {
        const { aiSystemSynchronizerEngine } = await import("../../engines/AISystemSynchronizerEngine.js");
        result = { summary: aiSystemSynchronizerEngine.getSummary() };
        break;
      }
      case "ai_system_synergize": {
        const { aiSystemSynchronizerEngine } = await import("../../engines/AISystemSynchronizerEngine.js");
        result = aiSystemSynchronizerEngine.getSynergizedCapabilities(String((params as Record<string, unknown>).problem ?? ""));
        break;
      }
      // -----------------------------------------------------------------------
      // AI-WIRE-MS0/U-AIW05: 3 remaining neural engines -- determinism testing,
      // weight persistence, deep logic trace. (NeuralIntegrationEngine wired via
      // neural_route/recommend/synthesize/stats; NeuralModelRegistryEngine via
      // neural_model_register/list — both already invokable above.)
      // ─────────────────────────────────────────────────────────────────────
      case "neural_determinism_test": {
        const { neuralDeterminismTestingEngine } = await import("../../engines/NeuralDeterminismTestingEngine.js");
        const p = params as { actual: number[]; expected: number[]; seed?: number; tolerance?: number };
        result = neuralDeterminismTestingEngine.compareOutputs(p.actual, p.expected, {
          seed: p.seed ?? 42,
          tolerance: p.tolerance ?? 0.001,
          distributionTesting: false,
        });
        break;
      }
      case "neural_weight_persist": {
        const { neuralWeightPersistenceEngine } = await import("../../engines/NeuralWeightPersistenceEngine.js");
        const p = params as { modelId?: string };
        const weights = await neuralWeightPersistenceEngine.listWeights(p.modelId);
        result = { weights, count: weights.length };
        break;
      }
      case "deep_logic_trace": {
        const { deepLogicTraceEngine } = await import("../../engines/DeepLogicTraceEngine.js");
        const p = params as { traceId?: string };
        result = p.traceId
          ? deepLogicTraceEngine.getSummary(p.traceId)
          : deepLogicTraceEngine.getStats();
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // AI-WIRE-MS0/U-AIW09: 3 learning engines — transfer / continual / few-shot.
      // (MetaLearningOptimizerEngine already invokable via meta_learning_*.)
      // ─────────────────────────────────────────────────────────────────────
      case "ai_transfer_learn": {
        const { transferLearningEngine } = await import("../../engines/TransferLearningEngine.js");
        type Arg = Parameters<typeof transferLearningEngine.materialTransfer>[0];
        result = transferLearningEngine.materialTransfer(params as unknown as Arg);
        break;
      }
      case "ai_continual_learn": {
        const { continualLoRAEngine } = await import("../../engines/ContinualLoRAEngine.js");
        type Arg = Parameters<typeof continualLoRAEngine.train>[0];
        result = continualLoRAEngine.train(params as unknown as Arg);
        break;
      }
      case "ai_few_shot_learn": {
        const { protoMAMLFewShotEngine } = await import("../../engines/ProtoMAMLFewShotEngine.js");
        type Arg = Parameters<typeof protoMAMLFewShotEngine.predict>[0];
        result = protoMAMLFewShotEngine.predict(params as unknown as Arg);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE28: CNCControllerDeepLearningEngine — controller
      // knowledge: selection, dialect translation, comparison, macro gen,
      // post-debug. Pure (no I/O) — singleton OK but per-call is also fine.
      // ─────────────────────────────────────────────────────────────────────
      case "controller_select": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type ReqArg = Parameters<typeof cncControllerDeepLearning.selectControllerForJob>[0];
        const p = params as unknown as ReqArg;
        const recommendation = cncControllerDeepLearning.selectControllerForJob(p);
        result = recommendation;
        break;
      }
      case "controller_translate": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type SrcArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[0];
        type TgtArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[1];
        const p = params as { sourceController: SrcArg; targetController: TgtArg; code: string };
        const translation = cncControllerDeepLearning.translateGCode(
          p.sourceController,
          p.targetController,
          p.code,
        );
        result = translation;
        break;
      }
      case "controller_compare": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.compareControllers>[0];
        const p = params as { a: CtrlArg; b: CtrlArg };
        const comparison = cncControllerDeepLearning.compareControllers(p.a, p.b);
        result = comparison;
        break;
      }
      case "controller_macro": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.generateMacro>[1];
        const p = params as { taskDescription: string; controller: CtrlArg };
        const macro = cncControllerDeepLearning.generateMacro(p.taskDescription, p.controller);
        result = macro;
        break;
      }
      case "controller_debug": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.debugPostIssue>[1];
        const p = params as { errorMessage: string; controller: CtrlArg };
        const debug = cncControllerDeepLearning.debugPostIssue(p.errorMessage, p.controller);
        result = debug;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4: corpus-learned pattern
      // consumer. controller_ingest_learned bootstraps the engine from the
      // single canonical learned-patterns ledger; controller_recommend_macro
      // recommends a macro (built-in MACRO_PATTERNS → learned-corpus fallback).
      // ─────────────────────────────────────────────────────────────────────
      case "controller_ingest_learned": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        const { resolve: resolvePath } = await import("node:path");
        const { existsSync } = await import("node:fs");
        // The caller passes NO path: resolve the single canonical learned-patterns
        // ledger. cwd is the mcp-server root under vitest and the running server;
        // fall back to the repo-root layout for ad-hoc invocations.
        const rel = "data/state/learned-cnc-controller-patterns.json";
        const candidates = [
          resolvePath(process.cwd(), rel),
          resolvePath(process.cwd(), "mcp-server", rel),
        ];
        const ledgerPath = candidates.find(p => existsSync(p)) ?? candidates[0];
        result = cncControllerDeepLearning.ingestLearnedPatterns(ledgerPath);
        break;
      }
      case "controller_recommend_macro": {
        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
        type CtrlArg = Parameters<typeof cncControllerDeepLearning.recommendMacro>[1];
        const p = params as { operation: string; controller: CtrlArg };
        const macro = cncControllerDeepLearning.recommendMacro(p.operation, p.controller);
        // null is a legitimate "no recommendation" answer, not an error —
        // surface it explicitly so callers do not mistake it for a failure.
        result = { found: macro !== null, pattern: macro };
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE29: StatisticalLearningBoundsEngine — PAC/VC/Rademacher
      // Pure math; no state. Per-call `new` is fine (the singleton export
      // exists for callers that want a stable identity, not for state).
      // ─────────────────────────────────────────────────────────────────────
      case "bounds_pac_complexity": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.pacSampleComplexity>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.pacSampleComplexity(p);
        break;
      }
      case "bounds_vc": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.vcBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.vcBound(p);
        break;
      }
      case "bounds_rademacher": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.rademacherBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.rademacherBound(p);
        break;
      }
      case "bounds_pac_bayes": {
        const { statisticalLearningBoundsEngine } = await import("../../engines/StatisticalLearningBoundsEngine.js");
        type Arg = Parameters<typeof statisticalLearningBoundsEngine.pacBayesBound>[0];
        const p = params as unknown as Arg;
        result = statisticalLearningBoundsEngine.pacBayesBound(p);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE30: ProactiveLearningEngine — auto-trigger
      // detection + knowledge-quality monitoring. Singleton (uses event bus).
      // ─────────────────────────────────────────────────────────────────────
      case "proactive_detect": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        type Arg = Parameters<typeof proactiveLearningEngine.detectLearningTriggers>[0];
        const p = params as { context: Arg };
        const triggers = proactiveLearningEngine.detectLearningTriggers(p.context);
        result = { triggers, count: triggers.length };
        break;
      }
      case "proactive_classify": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        type Arg = Parameters<typeof proactiveLearningEngine.classifyTrigger>[0];
        const p = params as { trigger: Arg };
        const classification = proactiveLearningEngine.classifyTrigger(p.trigger);
        result = classification;
        break;
      }
      case "proactive_quality_report": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        const report = proactiveLearningEngine.monitorKnowledgeQuality();
        result = report;
        break;
      }
      case "proactive_stats": {
        const { proactiveLearningEngine } = await import("../../engines/ProactiveLearningEngine.js");
        const stats = proactiveLearningEngine.getCategorizationStats();
        result = stats;
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-MS0/U-WIRE31: ExceptionLearningEngine — capture, analyze,
      // and learn from unexpected events instead of failing. Singleton-only
      // (the class is not exported as a value — only the instance + types).
      // The lifecycle is: handle → record_outcome (writes), pending/stats
      // (reads). recordOutcome on a 'success' outcome additionally synthesizes
      // a tribal tip, and for parameter_outlier with data.value an envelope
      // proposal at value × 1.10.
      // ─────────────────────────────────────────────────────────────────────
      case "exception_handle": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        type Arg = Parameters<typeof exceptionLearningEngine.handleUnexpected>[0];
        // Schema-validated upstream; cast to the engine's omit shape.
        const response = exceptionLearningEngine.handleUnexpected(params as Arg);
        result = response;
        break;
      }
      case "exception_record_outcome": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        const p = params as { eventId: string; outcome: "success" | "failure" | "neutral" };
        const learned = exceptionLearningEngine.recordOutcome(p.eventId, p.outcome);
        // Engine returns null when eventId is unknown; surface an error field so
        // callers can pattern-match on body.error. Also spread the LearnedException
        // fields at the top level so callers can read outcome/tribalTip/envelopeProposal
        // directly from data without an extra .learned indirection.
        result = learned === null
          ? {
              learned: null,
              recorded: false,
              reason: `Unknown eventId: ${p.eventId}`,
              error: `eventId not found: ${p.eventId}`,
            }
          : { learned, recorded: true, ...learned };
        break;
      }
      case "exception_pending": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        const pending = exceptionLearningEngine.getPendingExceptions();
        result = { events: pending, count: pending.length };
        break;
      }
      case "exception_stats": {
        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearningEngine.js");
        result = exceptionLearningEngine.getStatistics();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // U-XPROC-T2-T12-PRISM-AI-WIRE — XPROC-NEURAL fleet (Tiers 2-12, 38 engines, 138 actions)
      // All xproc_* actions flow through the unified routeXprocAction helper above.
      // CORE_ROUTING table mirrors intelligenceDispatcher.ts so both surfaces stay in lock-step.
      // Engines validate their own params via internal Zod schemas; the wrapper functions
      // dispatch by action name with no extra normalization.
      // ─────────────────────────────────────────────────────────────────────
      case "xproc_symbolic_project":
      case "xproc_symbolic_violations":
      case "xproc_safety_verify":
      case "xproc_safety_escalate":
      case "xproc_extract_rules":
      case "xproc_rule_explain_prediction":
      case "xproc_blend_predict":
      case "xproc_blend_weight_report":
      case "xproc_causal_learn_dag":
      case "xproc_causal_test_independence":
      case "xproc_causal_export_graph":
      case "xproc_do_identify":
      case "xproc_do_intervene":
      case "xproc_counterfactual_query":
      case "xproc_mediation_decompose":
      case "xproc_mediation_path_strength":
      case "xproc_active_select":
      case "xproc_active_rationale":
      case "xproc_novelty_score":
      case "xproc_novelty_alert":
      case "xproc_curiosity_propose":
      case "xproc_curiosity_score":
      case "xproc_doe_plan":
      case "xproc_doe_evaluate_completion":
      case "xproc_route_query":
      case "xproc_route_explain":
      case "xproc_orchestrate_full":
      case "xproc_orchestrate_brief":
      case "xproc_orchestrate_live":
      case "xproc_episodic_store":
      case "xproc_episodic_recall":
      case "xproc_episodic_stats":
      case "xproc_replay_add":
      case "xproc_replay_sample":
      case "xproc_replay_update_priority":
      case "xproc_replay_stats":
      case "xproc_replay_balanced_batch":
      case "xproc_replay_default_clusters":
      case "xproc_episodic_semantic_join":
      case "xproc_online_update":
      case "xproc_online_init_state":
      case "xproc_online_constants":
      case "xproc_drift_observe":
      case "xproc_drift_observe_batch":
      case "xproc_drift_history":
      case "xproc_drift_reset":
      case "xproc_drift_constants":
      case "xproc_shift_decide":
      case "xproc_shift_history":
      case "xproc_shift_reset":
      case "xproc_shift_constants":
      case "xproc_ewc_compute_fisher":
      case "xproc_ewc_reg_loss":
      case "xproc_ewc_consolidate":
      case "xproc_ewc_get_fisher":
      case "xproc_ewc_reset":
      case "xproc_ewc_constants":
      case "xproc_reward_shape":
      case "xproc_reward_audit":
      case "xproc_reward_default_weights":
      case "xproc_reward_constants":
      // XPROC-NEURAL-CONNECT-MS0/U-CN02 — SF-orchestrator NN consumer
      case "xproc_neural_consult_speedfeed":
      // XPROC-NEURAL-CONNECT-MS0/U-CN05 — KG semantic-search → NN feature projector
      case "xproc_kg_project_features":
      case "xproc_kg_feature_layout":
      // XPROC-NEURAL-CONNECT-MS0/U-CN04 — TribalKnowledge outcome subscriber bridge
      case "xproc_tribal_subscribe_outcomes":
      case "xproc_tribal_unsubscribe_outcomes":
      case "xproc_tribal_outcome_subscription_status":
      case "xproc_tribal_outcome_configure":
      case "xproc_tribal_outcome_stats":
      case "xproc_tribal_outcome_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN06 — drift/calibration/concept-shift outcome bridge
      // (xproc_drift_bridge_reset is namespaced to avoid collision with the
      // pre-existing CrossProcessDriftDetectorEngine xproc_drift_reset action.)
      case "xproc_drift_subscribe":
      case "xproc_drift_unsubscribe":
      case "xproc_drift_status":
      case "xproc_drift_configure":
      case "xproc_drift_stats":
      case "xproc_drift_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN07 — replay/sampler outcome bridge
      // (all bridge_* actions namespaced to avoid colliding with the pre-existing
      // xproc_replay_{add,sample,update_priority,stats,balanced_batch,
      // default_clusters} actions on the underlying engines.)
      case "xproc_replay_bridge_subscribe":
      case "xproc_replay_bridge_unsubscribe":
      case "xproc_replay_bridge_status":
      case "xproc_replay_bridge_configure":
      case "xproc_replay_bridge_stats":
      case "xproc_replay_bridge_sample_stratified":
      case "xproc_replay_bridge_sample_prioritized":
      case "xproc_replay_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN08 — episodic memory outcome bridge
      // (all bridge_* actions namespaced to avoid colliding with the pre-existing
      // xproc_episodic_{store,recall,stats,semantic_join} actions on
      // CrossProcessEpisodicMemoryEngine.)
      case "xproc_episodic_bridge_subscribe":
      case "xproc_episodic_bridge_unsubscribe":
      case "xproc_episodic_bridge_status":
      case "xproc_episodic_bridge_configure":
      case "xproc_episodic_bridge_stats":
      case "xproc_episodic_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN09 — closed-loop ignition (auto-train + all fan-out bridges)
      case "xproc_autofire_activate":
      case "xproc_autofire_deactivate":
      case "xproc_autofire_status":
      // XPROC-NEURAL-CONNECT-MS0/U-CN12 — RL fan-out bridge (Q-learning + policy-gradient + bandit)
      case "xproc_rl_bridge_subscribe":
      case "xproc_rl_bridge_unsubscribe":
      case "xproc_rl_bridge_status":
      case "xproc_rl_bridge_configure":
      case "xproc_rl_bridge_stats":
      case "xproc_rl_bridge_replay":
      case "xproc_rl_bridge_reset":
      // XPROC-NEURAL-CONNECT-MS0/U-CN11 — EWC consolidation controls
      case "xproc_neural_ewc_status":
      case "xproc_neural_ewc_clear":
      case "xproc_neural_ewc_consolidate":
      // XPROC-NEURAL-CONNECT-MS0/U-CN01 — outcome publish adapter
      case "xproc_outcome_publish":
      case "xproc_outcome_publish_with_actuals":
      case "xproc_outcome_publish_failure":
      case "xproc_outcome_publish_override":
      case "xproc_outcome_update":
      case "xproc_outcome_adapter_stats":
      case "xproc_outcome_adapter_reset": {
        // XPROC-FALLTHROUGH-FIX (slot:india): terminal routeXprocAction handler for the
        // contiguous xproc bare-case sub-block ABOVE this line. The cross-wire cases that
        // follow (outcome_trace_record/log/query/stats + rag_rerank, inserted by commit
        // 0fd90359de PSN-SYNERGY/U-OUTCOME-WIRE and U-RAG-PSN-AI-WIRE) carry their own
        // case bodies, which SEVERED the xproc switch fall-through chain: every xproc case
        // from xproc_episodic_stats (.../online_constants/drift_constants/ewc_constants/
        // symbolic_violations) down to here was falling into outcome_trace_record's body
        // and never reaching routeXprocAction (silent regression -- 5 tier10-wire tests
        // caught it; ~115 untested xproc actions in the same range were also affected).
        // This break terminates the upper sub-block; the lower sub-block keeps its sibling
        // terminal handler at case "xproc_feedbackbus_reset".
        result = await routeXprocAction(action, params);
        break;
      }
      // PSN-SYNERGY/OUTCOME-WIRING — cross-wire: prism_ai pass-throughs for the 4 most-consumed
      // outcome actions so callers already on prism_ai need not migrate to prism_outcome.
      // Canonical home is prism_outcome (outcomeDispatcher); these are thin delegates.
      case "outcome_trace_record": {
        const { outcomeTraceEngine } = await import("../../engines/OutcomeTraceEngine.js");
        result = outcomeTraceEngine.record(params as Parameters<typeof outcomeTraceEngine.record>[0]);
        break;
      }
      case "outcome_log": {
        const { outcomeTrackingEngine } = await import("../../engines/OutcomeTrackingEngine.js");
        result = await outcomeTrackingEngine.log(
          params as Parameters<typeof outcomeTrackingEngine.log>[0],
        );
        break;
      }
      case "outcome_query": {
        const { outcomeTrackingEngine } = await import("../../engines/OutcomeTrackingEngine.js");
        const records = await outcomeTrackingEngine.query(
          params as Parameters<typeof outcomeTrackingEngine.query>[0],
        );
        result = { count: records.length, records };
        break;
      }
      case "outcome_stats": {
        const { outcomeTrackingEngine } = await import("../../engines/OutcomeTrackingEngine.js");
        result = await outcomeTrackingEngine.stats(
          params as Parameters<typeof outcomeTrackingEngine.stats>[0],
        );
        break;
      }
      // U-RAG-PSN-AI-WIRE — cross-wire RAG retrieval (canonical home is
      // prism_ml:rag_rerank). Same shared ReRankerEngine — no dispatcher
      // delegation chain. With/without diversity_weight branches mirror the
      // prism_ml implementation. Both `rerank` and `diverseRerank` are
      // static methods that validate input internally via ReRankInputSchema.
      case "rag_rerank": {
        const { reRankerEngine } = await import("../../engines/ReRankerEngine.js");
        const diversityWeight = params.diversity_weight as number | undefined;
        const rerankInput = {
          query: params.query as string,
          candidates: params.candidates as Array<{
            id: string;
            score: number;
            source_type: string;
            title: string | null;
            excerpt: string | null;
            metadata?: Record<string, unknown>;
          }>,
          top_k: (params.top_k as number) ?? 3,
        };
        result = diversityWeight !== undefined
          ? reRankerEngine.diverseRerank(rerankInput, diversityWeight)
          : reRankerEngine.rerank(rerankInput);
        break;
      }
      case "xproc_policy_step":
      case "xproc_policy_commit":
      case "xproc_policy_select_action":
      case "xproc_policy_get_policy":
      case "xproc_policy_get_baseline":
      case "xproc_policy_configure":
      case "xproc_policy_reset":
      case "xproc_policy_stats":
      case "xproc_policy_constants":
      case "xproc_qlearn_update":
      case "xproc_qlearn_argmax":
      case "xproc_qlearn_epsilon_greedy":
      case "xproc_qlearn_get_q_row":
      case "xproc_qlearn_configure":
      case "xproc_qlearn_reset":
      case "xproc_qlearn_stats":
      case "xproc_qlearn_constants":
      case "xproc_bandit_register_arm":
      case "xproc_bandit_select":
      case "xproc_bandit_update":
      case "xproc_bandit_stats":
      case "xproc_bandit_reset":
      case "xproc_bandit_constants":
      case "xproc_bayes_predict":
      case "xproc_bayes_uncertainty":
      case "xproc_bayes_constants":
      case "xproc_conformal_calibrate":
      case "xproc_conformal_set":
      case "xproc_conformal_stats":
      case "xproc_conformal_reset":
      case "xproc_conformal_constants":
      case "xproc_conformal_classify_calibrate":
      case "xproc_conformal_classify_set":
      case "xproc_conformal_classify_stats":
      case "xproc_conformal_classify_reset":
      case "xproc_conformal_classify_constants":
      case "xproc_calibration_monitor_configure":
      case "xproc_calibration_monitor_record":
      case "xproc_calibration_monitor_status":
      case "xproc_calibration_monitor_reset":
      case "xproc_calibration_monitor_constants":
      case "xproc_aps_calibrate":
      case "xproc_aps_set":
      case "xproc_aps_stats":
      case "xproc_aps_reset":
      case "xproc_aps_constants":
      case "xproc_raps_calibrate":
      case "xproc_raps_set":
      case "xproc_raps_stats":
      case "xproc_raps_reset":
      case "xproc_raps_constants":
      case "xproc_predlog_log":
      case "xproc_predlog_pair":
      case "xproc_predlog_prune":
      case "xproc_predlog_configure":
      case "xproc_predlog_status":
      case "xproc_predlog_pending_ids":
      case "xproc_predlog_enable_autosync":
      case "xproc_predlog_disable_autosync":
      case "xproc_predlog_reset":
      case "xproc_predlog_constants":
      case "xproc_mondrian_calibrate":
      case "xproc_mondrian_set":
      case "xproc_mondrian_stats":
      case "xproc_mondrian_reset":
      case "xproc_mondrian_constants":
      case "xproc_ensemble_predict":
      case "xproc_ensemble_disagreement":
      case "xproc_ensemble_constants":
      case "xproc_calibration_score":
      case "xproc_calibration_recommend":
      case "xproc_calibration_constants":
      case "xproc_fed_aggregate":
      case "xproc_fed_round_summary":
      case "xproc_fed_constants":
      case "xproc_secure_mask":
      case "xproc_secure_unmask":
      case "xproc_secure_verify":
      case "xproc_secure_constants":
      case "xproc_fed_gate":
      case "xproc_fed_drift_report":
      case "xproc_fed_drift_constants":
      case "xproc_fed_select_clients":
      case "xproc_fed_round_plan":
      case "xproc_fed_scheduler_constants":
      case "xproc_maml_inner_loop":
      case "xproc_maml_meta_train":
      case "xproc_maml_constants":
      case "xproc_proto_compute":
      case "xproc_proto_classify":
      case "xproc_proto_regress":
      case "xproc_proto_constants":
      case "xproc_meta_lr_init":
      case "xproc_meta_lr_step":
      case "xproc_meta_lr_constants":
      case "xproc_hyper_propose":
      case "xproc_hyper_evaluate":
      case "xproc_hyper_record_outcome":
      case "xproc_hyper_constants":
      case "xproc_vision_fuse":
      case "xproc_vision_explain_attention":
      case "xproc_vision_constants":
      case "xproc_timeseries_fuse":
      case "xproc_timeseries_segment":
      case "xproc_timeseries_constants":
      case "xproc_audio_fuse":
      case "xproc_audio_chatter_score":
      case "xproc_audio_spectral":
      case "xproc_audio_constants":
      case "xproc_modality_dropout":
      case "xproc_modality_predict":
      case "xproc_modality_availability":
      case "xproc_modality_constants":
      // U-XPROC-TIER1-PRISM-AI-WIRE — 23 Tier 1 actions (5 baseline engines)
      case "xproc_outcome_record":
      case "xproc_outcome_record_outcome":
      case "xproc_outcome_query":
      case "xproc_outcome_retrieve_similar":
      case "xproc_outcome_stats":
      case "xproc_outcome_clear":
      // INFRA-NEURAL-LEDGER-MS1/P0-U03 — replay capability
      case "xproc_outcome_replay":
      case "xproc_outcome_replay_job":
      case "xproc_outcome_replay_since":
      case "xproc_outcome_stream_from_disk":
      case "xproc_neural_train":
      case "xproc_neural_predict":
      case "xproc_neural_evaluate":
      case "xproc_neural_save":
      case "xproc_neural_load":
      case "xproc_neural_metrics":
      case "xproc_neural_reset":
      case "xproc_transfer_classify":
      case "xproc_transfer_pairs":
      case "xproc_transfer_check":
      case "xproc_attention_explain":
      case "xproc_attention_ece":
      case "xproc_attention_baseline_add":
      case "xproc_attention_anomaly":
      case "xproc_attention_baseline_get":
      case "xproc_attention_baseline_reset":
      case "xproc_agi_compose":
      case "xproc_physics_features":
      case "xproc_physics_features_batch":
      case "xproc_rag_features":
      case "xproc_rag_clear_cache":
      case "xproc_feedbackbus_publish":
      case "xproc_feedbackbus_stats":
      case "xproc_feedbackbus_topics":
      case "xproc_feedbackbus_subscriber_count":
      case "xproc_feedbackbus_reset": {
        result = await routeXprocAction(action, params);
        break;
      }

      // ── XPROC-AI-01: Cross-Process AI Bridge (separate from xproc_* fleet) ──
      case "cross_process_ai_classify": {
        const { CrossProcessAIBridge } = await import(
          "../../engines/CrossProcessAIBridge.js"
        );
        const intent = params.intent as string | undefined;
        if (typeof intent !== "string") {
          return dispatcherError(
            "cross_process_ai_classify requires `intent` (non-empty string)",
            action,
            "prism_ai",
          );
        }
        const context = {
          process: params.process as ("mill" | "lathe" | "wedm") | undefined,
          features: params.features as string[] | undefined,
          material: params.material as string | undefined,
        };
        result = CrossProcessAIBridge.classify(intent, context);
        break;
      }
      case "cross_process_ai_orchestrate": {
        const { CrossProcessAIBridge } = await import(
          "../../engines/CrossProcessAIBridge.js"
        );
        const intent = params.intent as string | undefined;
        if (typeof intent !== "string") {
          return dispatcherError(
            "cross_process_ai_orchestrate requires `intent` (non-empty string)",
            action,
            "prism_ai",
          );
        }
        result = await CrossProcessAIBridge.orchestrate({
          intent,
          process: params.process as ("mill" | "lathe" | "wedm") | undefined,
          features: params.features as string[] | undefined,
          material: params.material as string | undefined,
          mill_request: params.mill_request as Record<string, unknown> | undefined,
          lathe_request: params.lathe_request as Record<string, unknown> | undefined,
          wedm_request: params.wedm_request as Record<string, unknown> | undefined,
          dry_run: params.dry_run as boolean | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // ENGINE-WIRE-AI-MS0/U-WIRE-AI-BATCH1: 12 unwired AI engines
      // ─────────────────────────────────────────────────────────────────────
      case "cognitive_budget_allocate": {
        const { cognitiveBudgetAllocatorEngine } = await import("../../engines/CognitiveBudgetAllocatorEngine.js");
        result = cognitiveBudgetAllocatorEngine.allocate(
          params as unknown as Parameters<typeof cognitiveBudgetAllocatorEngine.allocate>[0],
        );
        break;
      }
      case "ensemble_register_member": {
        const { ensembleModelSelectorEngine } = await import("../../engines/EnsembleModelSelectorEngine.js");
        const p = params as { member: Parameters<typeof ensembleModelSelectorEngine.registerMember>[0] };
        ensembleModelSelectorEngine.registerMember(p.member);
        result = { registered: true, total_members: ensembleModelSelectorEngine.getAllPerformances().length };
        break;
      }
      case "ensemble_predict": {
        const { ensembleModelSelectorEngine } = await import("../../engines/EnsembleModelSelectorEngine.js");
        const p = params as { input: Record<string, number>; domain?: "force" | "thermal" | "tool_life" | "surface" | "chatter" };
        const memberMap = new Map<string, number>(Object.entries(p.input ?? {}));
        result = ensembleModelSelectorEngine.predict(memberMap, p.domain);
        break;
      }
      case "ensemble_update_weights": {
        // Actuals-feedback side of the ensemble loop: observed per-member errors re-weight the
        // members (multiplicative-weights). Without this wired, predict() ran on frozen weights.
        const { ensembleModelSelectorEngine } = await import("../../engines/EnsembleModelSelectorEngine.js");
        const p = params as { member_errors?: Record<string, number>; actual?: number };
        if (typeof p.member_errors !== "object" || p.member_errors === null) {
          throw new TypeError("ensemble_update_weights: 'member_errors' object (memberId -> error) required");
        }
        for (const [id, e] of Object.entries(p.member_errors)) {
          if (typeof e !== "number" || !Number.isFinite(e)) {
            throw new TypeError(`ensemble_update_weights: member_errors['${id}'] must be a finite number`);
          }
        }
        if (typeof p.actual !== "number" || !Number.isFinite(p.actual)) {
          throw new TypeError("ensemble_update_weights: 'actual' must be a finite number");
        }
        const errorMap = new Map<string, number>(Object.entries(p.member_errors));
        const upd = ensembleModelSelectorEngine.updateWeights(errorMap, p.actual);
        // Maps do not JSON-serialize -- convert to plain objects.
        result = {
          updated_weights: Object.fromEntries(upd.updated_weights),
          best_member: upd.best_member,
          worst_member: upd.worst_member,
        };
        break;
      }
      case "ensemble_get_weights": {
        const { ensembleModelSelectorEngine } = await import("../../engines/EnsembleModelSelectorEngine.js");
        result = { weights: Object.fromEntries(ensembleModelSelectorEngine.getWeights()) };
        break;
      }
      case "neural_model_register": {
        const { neuralModelRegistryEngine } = await import("../../engines/NeuralModelRegistryEngine.js");
        const p = params as { checkpoint: Parameters<typeof neuralModelRegistryEngine.registerModel>[0] };
        result = await neuralModelRegistryEngine.registerModel(p.checkpoint);
        break;
      }
      case "neural_model_list": {
        const { neuralModelRegistryEngine } = await import("../../engines/NeuralModelRegistryEngine.js");
        const p = params as { filter?: Parameters<typeof neuralModelRegistryEngine.listModels>[0] };
        result = neuralModelRegistryEngine.listModels(p.filter);
        break;
      }
      case "reasoning_chain_register": {
        const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
        const p = params as { chain: Parameters<typeof reasoningChainSharingEngine.registerChain>[0]; createdBy: string; domain?: string; tags?: string[] };
        result = reasoningChainSharingEngine.registerChain(p.chain, p.createdBy, p.domain, p.tags);
        break;
      }
      case "reasoning_chain_query": {
        const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
        result = reasoningChainSharingEngine.queryChains(
          params as unknown as Parameters<typeof reasoningChainSharingEngine.queryChains>[0],
        );
        break;
      }
      case "reasoning_explain": {
        const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
        result = reasoningExplainerEngine.explain(
          params as unknown as Parameters<typeof reasoningExplainerEngine.explain>[0],
        );
        break;
      }
      case "reasoning_explain_formula": {
        const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
        const p = params as { formula: string; audience?: string };
        result = {
          formula: String(p.formula),
          audience: (p.audience as string | undefined) ?? "machinist",
          explanation: reasoningExplainerEngine.explainFormula(
            String(p.formula),
            p.audience as Parameters<typeof reasoningExplainerEngine.explainFormula>[1] | undefined,
          ),
        };
        break;
      }
      case "reasoning_reading_level": {
        const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
        const grade = Number((params as { grade: number }).grade);
        result = {
          grade,
          label: reasoningExplainerEngine.getReadingLevelLabel(grade),
        };
        break;
      }
      case "transfer_bridge_register": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        const p = params as { problem: Parameters<typeof transferLearningBridgeEngine.register>[0] };
        transferLearningBridgeEngine.register(p.problem);
        result = { registered: true, total: transferLearningBridgeEngine.size() };
        break;
      }
      case "transfer_bridge_find_analogies": {
        const { transferLearningBridgeEngine } = await import("../../engines/TransferLearningBridgeEngine.js");
        const p = params as { query: string | Record<string, unknown>; limit?: number; minScore?: number; crossDomainOnly?: boolean };
        result = transferLearningBridgeEngine.findAnalogies(
          p.query as never,
          { limit: p.limit, minScore: p.minScore, crossDomainOnly: p.crossDomainOnly },
        );
        break;
      }
      case "memory_pressure_sample": {
        const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
        const p = params as { nowIso?: string };
        result = memoryPressureMonitorEngine.sampleNow(p.nowIso);
        break;
      }
      case "memory_pressure_trend": {
        const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
        result = memoryPressureMonitorEngine.trend();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN01: moonshot_invoke — mid-tier Kimi-K2 tentacle
      // ─────────────────────────────────────────────────────────────────────
      case "moonshot_invoke": {
        const { moonshotClientEngine } = await import("../../engines/MoonshotClientEngine.js");
        result = await moonshotClientEngine.exec({
          prompt: params.prompt as string,
          model: params.model as string | undefined,
          apiKey: params.api_key as string | undefined,
          temperature: params.temperature as number | undefined,
          maxTokens: params.max_tokens as number | undefined,
          system: params.system as string | undefined,
          timeoutMs: params.timeout_ms as number | undefined,
          stream: params.stream as boolean | undefined,
          retries: params.retries as number | undefined,
          retryBaseDelayMs: params.retry_base_delay_ms as number | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN04: cascade_calibrate — read-only over MCP
      // The live invocation path requires function-typed inputs (tier.invoke,
      // probe.score) which can't cross JSON; over MCP this action returns an
      // explicit ok:false error so naive callers DO NOT silently believe their
      // calibration ran. In-process callers (scripts, other engines) must
      // import cascadeCalibrationEngine directly.
      // (Reviewer P2#3: previously returned ok:true with an instructional
      // message, which is the worst kind of silent skip.)
      // ─────────────────────────────────────────────────────────────────────
      case "cascade_calibrate": {
        result = {
          ok: false,
          error: "cascade_calibrate cannot run over MCP: tier.invoke and probe.score are function-typed inputs that don't survive JSON serialization. The calibration did NOT run.",
          in_process_api: "import { cascadeCalibrationEngine } from 'mcp-server/src/engines/CascadeCalibrationEngine.js'; await cascadeCalibrationEngine.calibrate({ tiers, probes, ... })",
          cli: "scripts/cascade-calibrate.mjs (writes state/shared/cascade-thresholds.json) — to be added in a downstream unit",
          summary: params.summary ?? null,
        };
        break;
      }

      // INFRA-CONSENSUS-WIRE-MS0/P0-U01 — consensus_decide
      // 4-way model consensus via MultiModelConsensusEngine.ask().
      // Caller-facing schema (question/options/voices/agreementThreshold/
      // sandboxBudget) translates to engine ConsensusInput shape (prompt/
      // voteOptions/include{Claude,Grok,Gemini}/timeoutMs). codex+ollama are
      // always-on per engine contract; voices controls only claude/grok/gemini.
      // sandboxBudget takes precedence over timeoutMs when both present.
      // agreementThreshold is the CALLER's gate (independent of engine's
      // internal ACCEPT_THRESHOLD); echoed back as meetsCallerThreshold.
      // ─────────────────────────────────────────────────────────────────────
      case "consensus_decide": {
        const { multiModelConsensusEngine } = await import("../../engines/MultiModelConsensusEngine.js");
        // KEEP IN SYNC with the `voices` z.enum literal in aiReasoningActionSchemas.ts
        // (consensus_decide entry). If new voices are added there, extend this union or
        // — preferably — replace with a shared `as const` tuple imported from the schema.
        type Voice = "claude" | "codex" | "ollama" | "grok" | "gemini";
        const p = params as {
          question: string;
          options?: string[];
          voices: Voice[];
          hermesAgents?: boolean;
          agreementThreshold?: number;
          sandboxBudget?: number;
          timeoutMs?: number;
          taskType?: string;
          context?: string;
          persist?: boolean;
          prismContext?: boolean;
          usePerformanceWeights?: boolean;
        };

        // sandboxBudget (1s–10min cap) is preferred when set — caller's wall
        // bound wins over the per-call default. Both already schema-bounded.
        const effectiveTimeoutMs = p.sandboxBudget ?? p.timeoutMs;
        const callerThreshold = p.agreementThreshold ?? 0.70;
        const consensusMode: "vote" | "compare" = (p.options && p.options.length > 0) ? "vote" : "compare";

        const consensusResult = await multiModelConsensusEngine.ask({
          prompt: p.question,
          context: p.context,
          mode: consensusMode,
          voteOptions: p.options,
          // Voice toggles — codex + primary ollama are always invoked by the
          // engine regardless of these flags; including/excluding them in the
          // voices list is informational acknowledgement.
          includeClaude: p.voices.includes("claude"),
          includeGrok: p.voices.includes("grok"),
          includeGemini: p.voices.includes("gemini"),
          // OCTOPUS-HERMES-AGENTS control surface: the 5-lens persona panel is default-ON in the engine
          // (when grok/proxy is live); expose the per-call override so a caller can force (`true`) or opt
          // out (`false`, e.g. a quick single-voice baseline). Undefined => engine default (on).
          ...(p.hermesAgents !== undefined ? { includeHermesAgentLenses: p.hermesAgents } : {}),
          ...(effectiveTimeoutMs !== undefined ? { timeoutMs: effectiveTimeoutMs } : {}),
          ...(p.taskType !== undefined ? { taskType: p.taskType } : {}),
          ...(p.persist !== undefined ? { persist: p.persist } : {}),
          ...(p.prismContext !== undefined ? { prismContext: p.prismContext } : {}),
          ...(p.usePerformanceWeights !== undefined ? { usePerformanceWeights: p.usePerformanceWeights } : {}),
        });

        result = {
          ...consensusResult,
          callerAgreementThreshold: callerThreshold,
          meetsCallerThreshold: consensusResult.agreementScore >= callerThreshold,
        };
        break;
      }

      // INFRA-CONSENSUS-WIRE-MS0/P0-U04 — consensus_audit_query
      // Reads the consensus-decisions.jsonl provenance log written by every
      // MultiModelConsensusEngine.ask() call. Pure read — no side effects.
      // ─────────────────────────────────────────────────────────────────────
      case "consensus_audit_query": {
        const { ConsensusAuditLogEngine } = await import("../../engines/ConsensusAuditLogEngine.js");
        const p = (params ?? {}) as { limit?: number; sinceMs?: number; callerEngine?: string };
        const records = ConsensusAuditLogEngine.read({
          ...(p.limit !== undefined ? { limit: p.limit } : {}),
          ...(p.sinceMs !== undefined ? { sinceMs: p.sinceMs } : {}),
          ...(p.callerEngine !== undefined ? { callerEngine: p.callerEngine } : {}),
        });
        result = { records, count: records.length };
        break;
      }

      // INFRA-CONSENSUS-WIRE-MS0/P0-U03 — consensus_escalate
      // Retry + escalation policy over the 4-way consensus fan-out. Defers to
      // ConsensusCoordinatorEngine.runWithEscalation with the real engine
      // (no askFn injection). Returns the discriminated EscalationOutcome.
      // ─────────────────────────────────────────────────────────────────────
      case "consensus_escalate": {
        const { consensusCoordinatorEngine } = await import("../../engines/ConsensusCoordinatorEngine.js");
        const p = params as {
          prompt: string;
          context?: string;
          mode?: "compare" | "vote";
          voteOptions?: string[];
          agreementThreshold?: number;
          maxRetries?: number;
          timeoutMs?: number;
          callerEngine?: string;
        };
        result = await consensusCoordinatorEngine.runWithEscalation({
          prompt: p.prompt,
          ...(p.context !== undefined ? { context: p.context } : {}),
          ...(p.mode !== undefined ? { mode: p.mode } : {}),
          ...(p.voteOptions !== undefined ? { voteOptions: p.voteOptions } : {}),
          ...(p.agreementThreshold !== undefined ? { agreementThreshold: p.agreementThreshold } : {}),
          ...(p.maxRetries !== undefined ? { maxRetries: p.maxRetries } : {}),
          ...(p.timeoutMs !== undefined ? { timeoutMs: p.timeoutMs } : {}),
          ...(p.callerEngine !== undefined ? { callerEngine: p.callerEngine } : {}),
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN03: neural_route_decision — learned routing
      // k-NN over the scrutiny ledger; cold-start fires hardcoded rules when
      // the ledger has < 50 entries.
      // ─────────────────────────────────────────────────────────────────────
      case "neural_route_decision": {
        const { neuralRoutingEngine } = await import("../../engines/NeuralRoutingEngine.js");
        result = neuralRoutingEngine.route({
          changeClass: params.change_class as string,
          fileTypes: (params.file_types as string[] | undefined) ?? [],
          peerCount: params.peer_count as number,
          filesCount: params.files_count as number | undefined,
          fingerprint: params.fingerprint as string | undefined,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // OCTOPUS-NEURAL-MS0/U-OCN02: moa_aggregate — MoA Layer-2 aggregator
      // Distills N proposer outputs (typically 3-of-3 scrutiny verdicts) into a
      // single calibrated verdict + rationale + dissent + entropy.
      // No live aggregatorCall is wired by default — invocation through the
      // dispatcher falls back to majority_vote. Programmatic callers can pass
      // an aggregatorCall via the engine API for senior-model distillation.
      // ─────────────────────────────────────────────────────────────────────
      case "moa_aggregate": {
        const { moaLayer2Engine } = await import("../../engines/MoaLayer2Engine.js");
        result = await moaLayer2Engine.aggregate({
          proposers: params.proposers as Parameters<typeof moaLayer2Engine.aggregate>[0]["proposers"],
          task: params.task as string | undefined,
          seniorAggregator: params.senior_aggregator as string | undefined,
          maxProposerChars: params.max_proposer_chars as number | undefined,
        });
        break;
      }

      // ── LoRADriftCoordinatorEngine actions (CAM-FUSION-LIVE-MS0/U-WIRE-LORA-DRIFT) ──
      case "lora_drift_record": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = loRADriftCoordinatorEngine.record({
          pipelineType: params.pipeline_type as Parameters<typeof loRADriftCoordinatorEngine.record>[0]["pipelineType"],
          delta: params.delta as number,
          observedAt: params.observed_at as string,
          baselineEvalScore: params.baseline_eval_score as number,
          currentEvalScore: params.current_eval_score as number,
        });
        break;
      }
      case "lora_drift_active": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = { active: loRADriftCoordinatorEngine.activePipelines() };
        break;
      }
      case "lora_drift_should_retrain": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = { shouldTrigger: loRADriftCoordinatorEngine.shouldTriggerMasterRetrain() };
        break;
      }
      case "lora_drift_check_all_clear": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = { event: loRADriftCoordinatorEngine.checkAllClear() };
        break;
      }
      case "lora_drift_buffer_size": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = { size: loRADriftCoordinatorEngine.bufferSize() };
        break;
      }
      case "lora_drift_reset": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        loRADriftCoordinatorEngine.reset();
        result = { reset: true, size: loRADriftCoordinatorEngine.bufferSize() };
        break;
      }
      case "lora_drift_get_config": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = loRADriftCoordinatorEngine.getConfig();
        break;
      }
      case "lora_drift_set_config": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        const patch: Record<string, number> = {};
        if (typeof params.window_ms === "number") patch.windowMs = params.window_ms;
        if (typeof params.coordinated_threshold === "number") patch.coordinatedThreshold = params.coordinated_threshold;
        if (typeof params.drift_delta_floor === "number") patch.driftDeltaFloor = params.drift_delta_floor;
        result = loRADriftCoordinatorEngine.setConfig(patch);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AUTO-LEARNING-LOOP-MS0/U-ALL02 — NoveltyDetectionEngine
      // ─────────────────────────────────────────────────────────────────────
      case "novelty_detect": {
        const { noveltyDetectionEngine } = await import("../../engines/NoveltyDetectionEngine.js");
        const items = (params.items ?? []) as Array<{
          source: string;
          guid: string;
          title: string;
          link?: string;
          published?: string;
          summary?: string;
        }>;
        const detectR = await noveltyDetectionEngine.detect(items);
        let addR: { added: number; embeddedFailures: string[]; skipped: string[] } | undefined;
        if (params.commit === true) {
          addR = await noveltyDetectionEngine.addVerifiedNovel(detectR.results, items);
        }
        result = {
          detect: detectR,
          add: addR,
          catalogLoaded: noveltyDetectionEngine.isCatalogLoaded(),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AUTO-LEARNING-LOOP-MS0/U-ALL12 — SourcePoisoningSanitizerEngine
      // ─────────────────────────────────────────────────────────────────────
      case "source_poisoning_sanitize": {
        const { sourcePoisoningSanitizerEngine } = await import("../../engines/SourcePoisoningSanitizerEngine.js");
        const items = (params.items ?? []) as Array<Parameters<typeof sourcePoisoningSanitizerEngine.sanitize>[0][number]>;
        result = sourcePoisoningSanitizerEngine.sanitize(items);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // COST-CASCADE-MS0/U-DISPATCHER-ACTION-TWO-PASS — TwoPassCascadeEngine
      // Cheap-then-strong cascade: run a cheap model, score via a rule-based
      // judge, escalate to a strong model only when the score is below
      // qualityThreshold (FrugalGPT, arXiv:2305.05176). Both tentacles default
      // to the local Ollama client; a both-passes failure throws
      // TwoPassCascadeError → caught below → dispatcherError envelope.
      // ─────────────────────────────────────────────────────────────────────
      case "two_pass": {
        const { twoPassCascadeEngine, makeOllamaTentacle } = await import(
          "../../engines/TwoPassCascadeEngine.js"
        );
        const { ollamaClientEngine } = await import(
          "../../engines/OllamaClientEngine.js"
        );
        // Adapt the Ollama client result ({ ok, value, error }) to the shape
        // makeOllamaTentacle expects ({ ok, data?, error? }).
        const ollamaGenerate = async (o: { model: string; prompt: string }) => {
          const r = await ollamaClientEngine.generate({
            model: o.model,
            prompt: o.prompt,
          });
          return {
            ok: r.ok,
            data: r.value ?? undefined,
            error: r.error ?? undefined,
          };
        };
        // Defaults must name models INSTALLED on this host. The Blackwell
        // migration (U-BW-RESEARCH-REFINE, 2026-06-04) RETIRED the 3b/7b/14b
        // small-GPU roster; the 96GB RTX PRO 6000 now pulls qwen2.5-coder:1.5b
        // (cheap) + qwen2.5-coder:32b (strong, ~20GB, often resident). The prior
        // :3b/:7b defaults pointed at un-pulled tags → silent offload failure.
        // Operators override per-tier via the PRISM_TWOPASS_* env knobs.
        const cheapModel =
          (params.cheapModel as string | undefined) ??
          process.env.PRISM_TWOPASS_CHEAP_MODEL ??
          "qwen2.5-coder:1.5b";
        const strongModel =
          (params.strongModel as string | undefined) ??
          process.env.PRISM_TWOPASS_STRONG_MODEL ??
          "qwen2.5-coder:32b";
        const costModel =
          params.cheapCostUSD !== undefined || params.strongCostUSD !== undefined
            ? {
                cheapUSD: params.cheapCostUSD as number | undefined,
                strongUSD: params.strongCostUSD as number | undefined,
              }
            : undefined;
        result = await twoPassCascadeEngine.run({
          prompt: params.prompt as string,
          qualityThreshold: params.qualityThreshold as number | undefined,
          forceStrong: params.forceStrong as boolean | undefined,
          invokeCheap: makeOllamaTentacle(cheapModel, ollamaGenerate),
          invokeStrong: makeOllamaTentacle(strongModel, ollamaGenerate),
          costModel,
        });
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // COST-CASCADE-MS0/U-COST-ALARM — CostAlarmEngine.check
      // Reads cost telemetry + active config, evaluates thresholds, fires
      // alarms with cool-down de-dup. Returns { ok, fired[], skipped[],
      // snapshot, configMissing? }.
      // ─────────────────────────────────────────────────────────────────────
      case "cost_alarm_check": {
        const { costAlarmEngine, makeFsDeps } = await import(
          "../../engines/CostAlarmEngine.js"
        );
        const prismRoot =
          (params.prismRoot as string | undefined) ??
          process.env.PRISM_ROOT ??
          process.cwd();
        result = costAlarmEngine.check(makeFsDeps({ prismRoot }));
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // COST-CASCADE-MS0/U-CASCADE-FALLBACK-CHAIN — CascadeFallbackChainEngine.run
      // Cheap→mid→strong cascade with per-tentacle circuit-breaker
      // (closed/open/half-open). Ships in calibrate-stub mode via
      // STUB_CALIBRATION; U-CASCADE-CALIBRATE remains externally blocked by
      // K2-CLOUD-MS0::K2-K0.
      // ─────────────────────────────────────────────────────────────────────
      case "cascade_run": {
        const { cascadeFallbackChainEngine, STUB_CALIBRATION } = await import(
          "../../engines/CascadeFallbackChainEngine.js"
        );
        const { ollamaClientEngine } = await import(
          "../../engines/OllamaClientEngine.js"
        );
        // Defaults must name models INSTALLED on this host. The Blackwell
        // migration (U-BW-RESEARCH-REFINE, 2026-06-04) RETIRED the 3b/7b/14b
        // small-GPU roster; the 96GB RTX PRO 6000 pulls qwen2.5-coder:1.5b
        // (cheap) + gpt-oss:20b (mid, 20.9B MoE, 185 tok/s) + qwen2.5-coder:32b
        // (strong, ~20GB, often resident). The prior :3b/:7b/:14b defaults all
        // pointed at un-pulled tags → the cascade silently failed. Operators
        // override per-tier via the PRISM_CASCADE_* env knobs.
        const cheapModel =
          (params.cheapModel as string | undefined) ??
          process.env.PRISM_CASCADE_CHEAP_MODEL ??
          "qwen2.5-coder:1.5b";
        const midModel =
          (params.midModel as string | undefined) ??
          process.env.PRISM_CASCADE_MID_MODEL ??
          "gpt-oss:20b";
        const strongModel =
          (params.strongModel as string | undefined) ??
          process.env.PRISM_CASCADE_STRONG_MODEL ??
          "qwen2.5-coder:32b";
        const modelByTentacle: Record<string, string> = {
          cheap: cheapModel,
          mid: midModel,
          strong: strongModel,
        };
        result = await cascadeFallbackChainEngine.run(
          {
            taskClass: params.taskClass as string,
            prompt: params.prompt as string,
            forceTentacle:
              (params.forceTentacle as string | undefined) ?? null,
          },
          {
            config: STUB_CALIBRATION,
            tentacles: {
              cheap: { id: "cheap", costEstimate: "low" },
              mid: { id: "mid", costEstimate: "medium" },
              strong: { id: "strong", costEstimate: "high" },
            },
            runTentacle: async (spec, input) => {
              const model = modelByTentacle[spec.id];
              if (!model) {
                return {
                  ok: false,
                  output: null,
                  failureReason: `no model mapped for tentacle ${spec.id}`,
                };
              }
              const r = await ollamaClientEngine.generate({
                model,
                prompt: input.prompt,
              });
              return r.ok
                ? { ok: true, output: r.value }
                : {
                    ok: false,
                    output: null,
                    failureReason: r.error ?? "ollama-down",
                  };
            },
            now: () => new Date(),
            logWarn: (m: string) => log.warn?.(m),
          },
        );
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // COST-CASCADE-MS0/U-CASCADE-FALLBACK-CHAIN — CascadeFallbackChainEngine.status
      // Read-only snapshot of the per-tentacle circuit-breaker state.
      // ─────────────────────────────────────────────────────────────────────
      case "cascade_status": {
        const { cascadeFallbackChainEngine } = await import(
          "../../engines/CascadeFallbackChainEngine.js"
        );
        result = cascadeFallbackChainEngine.status();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AUTO-LEARNING-LOOP-MS0/U-ALL06 — RoadmapAutoAppendEngine
      // ─────────────────────────────────────────────────────────────────────
      case "roadmap_auto_append": {
        const { roadmapAutoAppendEngine } = await import("../../engines/RoadmapAutoAppendEngine.js");
        const inputs = (params.inputs ?? []) as Array<Parameters<typeof roadmapAutoAppendEngine.proposeBatch>[0][number]>;
        result = roadmapAutoAppendEngine.proposeBatch(inputs);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AUTO-LEARNING-LOOP-MS0/U-ALL05 — VizAutoAugmentationEngine
      // ─────────────────────────────────────────────────────────────────────
      case "viz_auto_augment": {
        const { vizAutoAugmentationEngine } = await import("../../engines/VizAutoAugmentationEngine.js");
        const inputs = (params.inputs ?? []) as Array<Parameters<typeof vizAutoAugmentationEngine.emit>[0][number]>;
        result = vizAutoAugmentationEngine.emit(inputs);
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AUTO-LEARNING-LOOP-MS0/U-ALL04 — SynergyClassifierEngine
      // ─────────────────────────────────────────────────────────────────────
      case "synergy_classify": {
        const { synergyClassifierEngine } = await import("../../engines/SynergyClassifierEngine.js");
        type Features = {
          semantic_match: number;
          novelty_strength: number;
          ai_priority_score: number;
          duplication_risk: number;
          effort_estimate: number;
          blast_radius: number;
        };
        const single = params.features as Features | undefined;
        const batch = params.batch as Features[] | undefined;
        const verdict = single ? synergyClassifierEngine.classify(single) : undefined;
        const batchResult = batch ? synergyClassifierEngine.classifyBatch(batch) : undefined;
        result = {
          verdict,
          batchResult,
          rubricSchemaVersion: synergyClassifierEngine.getRubric().schemaVersion,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AUTO-LEARNING-LOOP-MS0/U-ALL03 — AutoResearchOrchestratorEngine
      // ─────────────────────────────────────────────────────────────────────
      case "auto_research_dispatch": {
        const { autoResearchOrchestratorEngine } = await import("../../engines/AutoResearchOrchestratorEngine.js");
        const items = (params.items ?? []) as Array<{
          source: string;
          guid: string;
          title: string;
          link?: string;
          published?: string;
          summary?: string;
        }>;
        const enqueueOut = items.length > 0 ? autoResearchOrchestratorEngine.enqueue(items) : undefined;
        const flushOut = params.flush === true ? await autoResearchOrchestratorEngine.flush() : undefined;
        result = {
          enqueue: enqueueOut,
          flush: flushOut,
          stats: autoResearchOrchestratorEngine.getStats(),
          dailyUsage: autoResearchOrchestratorEngine.getDailyUsage(),
          dispatchConfigured: autoResearchOrchestratorEngine.isDispatchConfigured(),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // AI-MAX-MS0/U-AIMAX10 — Capability / Resource / Training (46 actions)
      // Engines wired:
      //   AICapabilityMaximizerEngine (9)
      //   AIResourceLearningEngine (14)
      //   MasterAITrainingLedgerEngine (8)
      //   LatheAITrainingEngine (7)
      //   TrainingLedgerEngine (8)
      // ─────────────────────────────────────────────────────────────────────

      // Capability — AICapabilityMaximizerEngine
      case "ai_capability_compute_metrics": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.computeMetrics();
        break;
      }
      case "ai_capability_get_metrics": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.getMetrics();
        break;
      }
      case "ai_capability_enhancement_recommendations": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.getEnhancementRecommendations();
        break;
      }
      case "ai_capability_reasoning_patterns": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.getReasoningPatterns();
        break;
      }
      case "ai_capability_reasoning_pattern_get": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.getReasoningPattern(params.id as string);
        break;
      }
      case "ai_capability_knowledge_sources": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.getKnowledgeSources();
        break;
      }
      case "ai_capability_enhancement_strategy": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.getEnhancementStrategy(
          params.area as Parameters<typeof aiCapabilityMaximizerEngine.getEnhancementStrategy>[0],
        );
        break;
      }
      case "ai_capability_apply_reasoning_pattern": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.applyReasoningPattern(
          params.pattern_id as string,
          params.input as Parameters<typeof aiCapabilityMaximizerEngine.applyReasoningPattern>[1],
        );
        break;
      }
      case "ai_capability_report": {
        const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
        result = aiCapabilityMaximizerEngine.generateCapabilityReport();
        break;
      }

      // Resource — AIResourceLearningEngine
      case "ai_resource_code_quality": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getCodeQualityRecommendations(
          params.language as "typescript" | "python",
          params.context as "engine" | "dispatcher" | "cam_script" | "test",
        );
        break;
      }
      case "ai_resource_material_parameters": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getMaterialParameters(params.material as string);
        break;
      }
      case "ai_resource_hypermill_patterns": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getHyperMillAPIPatterns(params.module as string | undefined);
        break;
      }
      case "ai_resource_okuma_pattern": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getOkumaGCodePattern(params.cycle as string);
        break;
      }
      case "ai_resource_okuma_all": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getAllOkumaPatterns();
        break;
      }
      case "ai_resource_edm_defaults": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getEDMElectrodeDefaults();
        break;
      }
      case "ai_resource_patterns_by_type": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getPatternsByType(
          params.type as Parameters<typeof aiResourceLearningEngine.getPatternsByType>[0],
        );
        break;
      }
      case "ai_resource_stats": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getStats();
        break;
      }
      case "ai_resource_training_context": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getTrainingContext();
        break;
      }
      case "ai_resource_extract_gcode": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.extractGCodePatterns(params.program_content as string);
        break;
      }
      case "ai_resource_speed_feed": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getRecommendedSpeedFeed(
          params.material as string,
          params.operation as "roughing" | "finishing",
        );
        break;
      }
      case "ai_resource_generate_hypermill_template": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.generateHyperMillTemplate(
          params.task as Parameters<typeof aiResourceLearningEngine.generateHyperMillTemplate>[0],
        );
        break;
      }
      case "ai_resource_training_data": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getAITrainingData();
        break;
      }
      case "ai_resource_knowledge_coverage": {
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getKnowledgeCoverage();
        break;
      }
      case "ai_college_corpus_pointers": {
        // Returns paths + counts for the iter15..iter20 AUTOGEN-SPEC corpus
        // (1401 college courses + 893 H:/PRISM/resources PDFs + 2541 bridge edges).
        // AI training pipelines read the spec dirs to pull training material.
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getCollegeCorpus();
        break;
      }
      case "ai_cadcam_corpus_pointers": {
        // Returns the india iter23/24/25 3-layer cad+cam training-corpus handoff:
        // routing JSON (21 CAD + 598 CAM) + per-resource tribal jsonl + per-domain
        // wiki indexes + /system-viz roost (622 nodes). Pointers, not payloads —
        // Claude orchestration / DL+NN/GNN pipelines fetch source files on demand.
        // Audience routing: cad→delta, cam→kilo.
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getCadCamCorpus();
        break;
      }
      case "ai_domain_corpus_pointers": {
        // Returns the zulu all-domain feeder handoff: per-domain tribal-corpus jsonl
        // pointers + LIVE line-counts + audience routing for the 10 non-cadcam
        // manufacturing domains (mill/lathe/wedm/speed-feed/post-processor/quality/
        // tooling/grinding/business/safety). Closes the R15 orphan -- zulu's feeder
        // wrote these corpora but only cad+cam had a consumer. Pointers, not payloads:
        // DL/NN/GNN/LoRA/RAG pipelines fetch source on demand. cad+cam -> ai_cadcam_corpus_pointers.
        const { aiResourceLearningEngine } = await import("../../engines/AIResourceLearningEngine.js");
        result = aiResourceLearningEngine.getDomainCorpus();
        break;
      }

      // Training (Master Ledger) — MasterAITrainingLedgerEngine
      // Snake_case wire → camelCase engine contract for LedgerEntry / LedgerQuery.
      case "ai_training_master_ingest": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        const p = params as Record<string, unknown>;
        result = masterAITrainingLedgerEngine.ingest({
          runId: p.run_id as string,
          pipelineType: p.pipeline_type as Parameters<typeof masterAITrainingLedgerEngine.ingest>[0]["pipelineType"],
          datasetFingerprint: p.dataset_fingerprint as string,
          version: p.version as string,
          trainingMetrics: p.training_metrics as Parameters<typeof masterAITrainingLedgerEngine.ingest>[0]["trainingMetrics"],
          deploymentStatus: p.deployment_status as Parameters<typeof masterAITrainingLedgerEngine.ingest>[0]["deploymentStatus"],
          sloTargets: p.slo_targets as Parameters<typeof masterAITrainingLedgerEngine.ingest>[0]["sloTargets"],
          actualVsPredicted: p.actual_vs_predicted as Parameters<typeof masterAITrainingLedgerEngine.ingest>[0]["actualVsPredicted"],
          createdAt: p.created_at as string,
          promotedAt: p.promoted_at as string | undefined,
          notes: p.notes as string | undefined,
        });
        break;
      }
      case "ai_training_master_replay": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = masterAITrainingLedgerEngine.replay(params.run_id as string);
        break;
      }
      case "ai_training_master_query": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        const p = params as Record<string, unknown>;
        const filter: Parameters<typeof masterAITrainingLedgerEngine.query>[0] = {};
        if (p.pipeline_type !== undefined) filter.pipelineType = p.pipeline_type as NonNullable<typeof filter.pipelineType>;
        if (p.deployment_status !== undefined) filter.deploymentStatus = p.deployment_status as NonNullable<typeof filter.deploymentStatus>;
        if (p.created_after !== undefined) filter.createdAfter = p.created_after as string;
        if (p.created_before !== undefined) filter.createdBefore = p.created_before as string;
        if (p.min_eval_score !== undefined) filter.minEvalScore = p.min_eval_score as number;
        result = masterAITrainingLedgerEngine.query(filter);
        break;
      }
      case "ai_training_master_supported_pipelines": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = masterAITrainingLedgerEngine.supportedPipelines();
        break;
      }
      case "ai_training_master_pipeline_stability": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = masterAITrainingLedgerEngine.pipelineStability(
          params.pipeline_type as Parameters<typeof masterAITrainingLedgerEngine.pipelineStability>[0],
        );
        break;
      }
      case "ai_training_master_compare": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = masterAITrainingLedgerEngine.compare(
          params.pipeline_a as Parameters<typeof masterAITrainingLedgerEngine.compare>[0],
          params.pipeline_b as Parameters<typeof masterAITrainingLedgerEngine.compare>[1],
        );
        break;
      }
      case "ai_training_master_slo_status": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = masterAITrainingLedgerEngine.sloStatus();
        break;
      }
      case "ai_training_master_total_runs": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = masterAITrainingLedgerEngine.totalRuns();
        break;
      }

      // Training (Lathe) — LatheAITrainingEngine
      case "ai_training_lathe_parse": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.parseProgram(
          params.content as string,
          params.filepath as string,
        );
        break;
      }
      case "ai_training_lathe_extract_params": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.extractParams(
          params.block as Parameters<typeof latheAITrainingEngine.extractParams>[0],
        );
        break;
      }
      case "ai_training_lathe_analyze": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.analyzeProgram(
          params.program as Parameters<typeof latheAITrainingEngine.analyzeProgram>[0],
        );
        break;
      }
      case "ai_training_lathe_rewrite": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.rewriteProgram(
          params.analysis as Parameters<typeof latheAITrainingEngine.rewriteProgram>[0],
        );
        break;
      }
      case "ai_training_lathe_train": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.trainFromPrograms(
          params.programs as Parameters<typeof latheAITrainingEngine.trainFromPrograms>[0],
        );
        break;
      }
      case "ai_training_lathe_stats": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.getTrainingStats();
        break;
      }
      case "ai_training_lathe_patterns": {
        const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
        result = latheAITrainingEngine.getLearnedPatterns();
        break;
      }

      // Training (Generic Ledger) — TrainingLedgerEngine (snake_case throughout, no remap)
      case "ai_training_ledger_open_run": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.openRun(
          params as unknown as Parameters<typeof trainingLedgerEngine.openRun>[0],
        );
        break;
      }
      case "ai_training_ledger_close_run": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.closeRun(
          params as unknown as Parameters<typeof trainingLedgerEngine.closeRun>[0],
        );
        break;
      }
      case "ai_training_ledger_get_run": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.getRun(params.run_id as string);
        break;
      }
      case "ai_training_ledger_list_runs": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.listRuns(
          params as unknown as Parameters<typeof trainingLedgerEngine.listRuns>[0],
        );
        break;
      }
      case "ai_training_ledger_drift_report": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.driftReport(params.experiment_id as string);
        break;
      }
      case "ai_training_ledger_snapshot": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.toSnapshot();
        break;
      }
      case "ai_training_ledger_load_snapshot": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        trainingLedgerEngine.loadSnapshot(
          params.snapshot as Parameters<typeof trainingLedgerEngine.loadSnapshot>[0],
        );
        result = { ok: true };
        break;
      }
      case "ai_training_ledger_stats": {
        const { trainingLedgerEngine } = await import("../../engines/TrainingLedgerEngine.js");
        result = trainingLedgerEngine.getStats();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // MILL-AGI-P0.3 / U-NN-WIRE-PNB — PhysicsNeuralBridgeEngine
      // ─────────────────────────────────────────────────────────────────────
      case "physics_neural_bridge_predict": {
        const { physicsNeuralBridgeEngine } = await import("../../engines/PhysicsNeuralBridgeEngine.js");
        result = physicsNeuralBridgeEngine.predict(
          params as unknown as Parameters<typeof physicsNeuralBridgeEngine.predict>[0],
        );
        break;
      }
      case "physics_neural_bridge_version": {
        const { physicsNeuralBridgeEngine } = await import("../../engines/PhysicsNeuralBridgeEngine.js");
        // Action contract key is `version` (matches the action name + the U-NN-WIRE-PNB
        // wiring test + the sibling `version:` usage). The engine's internal `model_version`
        // field name must not leak into the external action shape; no consumer reads model_version.
        result = { version: physicsNeuralBridgeEngine.getModelVersion() };
        break;
      }

      // ─── U-PSN-AI-DISP-LORA (papa /loop iter6, 2026-05-23) ───
      // BlueprintLoRABridgeEngine on prism_ai. Closes MS1/U-MS1-U8 spec wiring.
      case "blueprint_lora_prepare_set": {
        // U-BPA-LORA-PAIRS-WIRE (slot:india): clone of the cadDispatcher rewire
        // (R15 clone-don't-fork -- SAME engine singleton, SAME contract). precomputedPairs[]
        // is now OPTIONAL; caller-supplied non-empty pairs win, otherwise training data
        // DEFAULTS from the closed-loop ledger via the canonical builder -- closing
        // predictions->outcomes->RETRAIN on the prism_ai path too. CWD-independent repo-root
        // anchor mirrors recordOutcome (cadDispatcher ~L3447): dist/tools/dispatchers
        // ../../.. = mcp-server, +1 .. = repo root where scripts/ lives.
        const p = params as Record<string, unknown>;
        if (!p.confidenceTier) {
          return dispatcherError(
            new Error("blueprint_lora_prepare_set requires confidenceTier (precomputedPairs[] optional -- defaults from the closed-loop ledger when absent)"),
            action, "prism_ai",
          );
        }
        const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
        const pathMod = await import("path");
        const urlMod = await import("url");
        // repo root via resolveRepoRoot() (depth-independent). The old 3-level
        // climb broke under the esbuild dist/index.js bundle -- U-DISPATCHER-REPO-ROOT-FIX.
        const repoMcpRoot = pathMod.resolve(resolveRepoRoot(), "mcp-server");
        const builderPath = pathMod.resolve(repoMcpRoot, "..", "scripts/lib/blueprint-lora-pair-builder.mjs");
        const { resolveLoRATrainingPairs } = await import(urlMod.pathToFileURL(builderPath).href);
        const { pairs, source: pairSource, empty: trainingDataEmpty } = resolveLoRATrainingPairs({
          precomputedPairs: p.precomputedPairs,
          tier: p.confidenceTier,
        });
        const selection = await blueprintLoRABridgeEngine.prepareTrainingSet({
          confidenceTier: p.confidenceTier as Parameters<typeof blueprintLoRABridgeEngine.prepareTrainingSet>[0]["confidenceTier"],
          ...(typeof p.sizeCap === "number" ? { sizeCap: p.sizeCap } : {}),
          io: { loadTrainingPairs: async () => pairs as Awaited<ReturnType<NonNullable<NonNullable<Parameters<typeof blueprintLoRABridgeEngine.prepareTrainingSet>[0]["io"]>["loadTrainingPairs"]>>> },
        });
        // R12 loud signal: a 0-pair LEDGER default must not be mistaken for a real set.
        result = { ...selection, pairSource, ...(trainingDataEmpty ? { empty: true, note: "no confirmed ground-truth in the closed-loop ledger at this tier yet -- training set is empty; do NOT export as a real LoRA bundle" } : {}) };
        break;
      }
      case "blueprint_lora_export": {
        const p = params as Record<string, unknown>;
        if (!p.setId || !p.provider || !p.outputPath) {
          return dispatcherError(
            new Error("blueprint_lora_export requires setId + provider + outputPath"),
            action, "prism_ai",
          );
        }
        const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
        result = await blueprintLoRABridgeEngine.exportBundle(
          params as Parameters<typeof blueprintLoRABridgeEngine.exportBundle>[0],
        );
        break;
      }
      case "blueprint_lora_register_endpoint": {
        const p = params as Record<string, unknown>;
        if (!p.bundleId || !p.endpointURL || !p.providerType) {
          return dispatcherError(
            new Error("blueprint_lora_register_endpoint requires bundleId + endpointURL + providerType"),
            action, "prism_ai",
          );
        }
        const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
        result = blueprintLoRABridgeEngine.registerExternalEndpoint(
          params as Parameters<typeof blueprintLoRABridgeEngine.registerExternalEndpoint>[0],
        );
        break;
      }
      case "blueprint_lora_history": {
        const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
        result = {
          history: blueprintLoRABridgeEngine.getExportHistory(),
          active: blueprintLoRABridgeEngine.getActiveBundles(),
        };
        break;
      }

      // ================================================================
      // CAD-FUSION-LIVE-MS0/iter4 — 38-engine AI wiring pass
      // ================================================================

      // --- Uncertainty / metrology ---
      case "mixer_agitator_calculate": {
        const { mixerAgitatorEngine } = await import("../../engines/MixerAgitatorEngine.js");
        result = { success: true, data: (mixerAgitatorEngine as any).calculate?.(params as any) ?? { engine: "MixerAgitatorEngine", note: "method not callable" } };
        break;
      }
      case "metrology_uncertainty_type_a": {
        const { metrologyUncertaintyEngine } = await import("../../engines/MetrologyUncertaintyEngine.js");
        result = { success: true, data: (metrologyUncertaintyEngine as any).typeAEvaluation?.(params as any) ?? { engine: "MetrologyUncertaintyEngine", note: "method not callable" } };
        break;
      }
      case "metrology_uncertainty_type_b": {
        const { metrologyUncertaintyEngine } = await import("../../engines/MetrologyUncertaintyEngine.js");
        result = { success: true, data: (metrologyUncertaintyEngine as any).typeBEvaluation?.(params as any) ?? { engine: "MetrologyUncertaintyEngine", note: "method not callable" } };
        break;
      }
      case "metrology_uncertainty_combined": {
        const { metrologyUncertaintyEngine } = await import("../../engines/MetrologyUncertaintyEngine.js");
        result = { success: true, data: (metrologyUncertaintyEngine as any).combinedUncertainty?.(params as any) ?? { engine: "MetrologyUncertaintyEngine", note: "method not callable" } };
        break;
      }
      case "uncertainty_propagation_analytical": {
        const { UncertaintyPropagationEngine } = await import("../../engines/UncertaintyPropagationEngine.js");
        result = { success: true, data: (UncertaintyPropagationEngine as any).propagateAnalytical?.(params as any) ?? { engine: "UncertaintyPropagationEngine", note: "method not callable" } };
        break;
      }
      case "uncertainty_propagation_monte_carlo": {
        const { UncertaintyPropagationEngine } = await import("../../engines/UncertaintyPropagationEngine.js");
        result = { success: true, data: (UncertaintyPropagationEngine as any).propagateMonteCarlo?.(params as any) ?? { engine: "UncertaintyPropagationEngine", note: "method not callable" } };
        break;
      }
      case "uncertainty_pipeline_run": {
        // FIX (U-UNCERTAINTY-PIPELINE-WIRE): facade probed run/execute/process (none
        // exist); the real method is `propagate` (now self-validating its
        // uncertain_params + stages). Bare result -> executeAIReasoningAction wraps the
        // {success,data} envelope; the AtomicValue<PipelineResult> is at data.value.
        const { uncertaintyPropagationPipelineEngine } = await import("../../engines/UncertaintyPropagationPipelineEngine.js");
        result = uncertaintyPropagationPipelineEngine.propagate(params as unknown as Parameters<typeof uncertaintyPropagationPipelineEngine.propagate>[0]);
        break;
      }

      // --- ML formulas / ensemble ---
      case "aiml_feature_importance": {
        const { aimlFormulasEngine } = await import("../../engines/AIMLFormulasEngine.js");
        result = { success: true, data: (aimlFormulasEngine as any).featureImportance?.(params as any) ?? { engine: "AIMLFormulasEngine", note: "method not callable" } };
        break;
      }
      case "aiml_model_selection": {
        const { aimlFormulasEngine } = await import("../../engines/AIMLFormulasEngine.js");
        result = { success: true, data: (aimlFormulasEngine as any).modelSelection?.(params as any) ?? { engine: "AIMLFormulasEngine", note: "method not callable" } };
        break;
      }
      case "aiml_anomaly_detection": {
        const { aimlFormulasEngine } = await import("../../engines/AIMLFormulasEngine.js");
        result = { success: true, data: (aimlFormulasEngine as any).anomalyDetection?.(params as any) ?? { engine: "AIMLFormulasEngine", note: "method not callable" } };
        break;
      }
      case "aiml_time_series": {
        const { aimlFormulasEngine } = await import("../../engines/AIMLFormulasEngine.js");
        result = { success: true, data: (aimlFormulasEngine as any).timeSeriesML?.(params as any) ?? { engine: "AIMLFormulasEngine", note: "method not callable" } };
        break;
      }
      case "aiml_reinforcement_learning": {
        const { aimlFormulasEngine } = await import("../../engines/AIMLFormulasEngine.js");
        result = { success: true, data: (aimlFormulasEngine as any).reinforcementLearning?.(params as any) ?? { engine: "AIMLFormulasEngine", note: "method not callable" } };
        break;
      }
      case "aiml_calculate": {
        const { aimlFormulasEngine } = await import("../../engines/AIMLFormulasEngine.js");
        result = { success: true, data: (aimlFormulasEngine as any).calculate?.(params as any) ?? { engine: "AIMLFormulasEngine", note: "method not callable" } };
        break;
      }
      case "ensemble_random_forest": {
        const mod = await import("../../engines/EnsembleMLEngine.js");
        const eng = new (mod as any).EnsembleMLEngine();
        result = { success: true, data: eng.randomForest?.(params as any) ?? { engine: "EnsembleMLEngine", note: "method not callable" } };
        break;
      }
      case "ensemble_gradient_boosting": {
        const mod = await import("../../engines/EnsembleMLEngine.js");
        const eng = new (mod as any).EnsembleMLEngine();
        result = { success: true, data: eng.gradientBoosting?.(params as any) ?? { engine: "EnsembleMLEngine", note: "method not callable" } };
        break;
      }
      case "ensemble_gaussian_mixture": {
        const mod = await import("../../engines/EnsembleMLEngine.js");
        const eng = new (mod as any).EnsembleMLEngine();
        result = { success: true, data: eng.gaussianMixture?.(params as any) ?? { engine: "EnsembleMLEngine", note: "method not callable" } };
        break;
      }

      // --- Video e-learning / inference ---
      case "video_elearning_search": {
        const { videoELearningAIEngine } = await import("../../engines/VideoELearningAIEngine.js");
        result = { success: true, data: (videoELearningAIEngine as any).searchVideoKnowledge?.((params as any).query ?? "", (params as any).top_k ?? 10) ?? { engine: "VideoELearningAIEngine", note: "method not callable" } };
        break;
      }
      case "video_elearning_recommend": {
        const { videoELearningAIEngine } = await import("../../engines/VideoELearningAIEngine.js");
        const p = params as any;
        result = { success: true, data: (videoELearningAIEngine as any).recommendTutorial?.(p.skill_level, p.topic) ?? { engine: "VideoELearningAIEngine", note: "method not callable" } };
        break;
      }
      case "video_elearning_process_course": {
        const { videoELearningAIEngine } = await import("../../engines/VideoELearningAIEngine.js");
        result = { success: true, data: await (videoELearningAIEngine as any).processELearningCourse?.((params as any).course_path ?? "") ?? { engine: "VideoELearningAIEngine", note: "method not callable" } };
        break;
      }
      case "chain_executor_execute": {
        const { chainExecutorEngine } = await import("../../engines/ChainExecutorEngine.js");
        result = { success: true, data: await (chainExecutorEngine as any).execute?.(params as any) ?? { engine: "ChainExecutorEngine", note: "method not callable" } };
        break;
      }
      case "inference_chain_run": {
        const { runInferenceChain, listChainTypes } = await import("../../engines/InferenceChainEngine.js");
        const p = params as any;
        // REAL executor (was a discovery-only stub): when `steps` (ChainStep[]) are provided, run the
        // multi-step inference chain through the now-free Ollama-first parallelAPICalls substrate
        // (no ANTHROPIC_API_KEY required). With no `steps`, fall back to surfacing the available chain
        // types so the action stays useful for discovery. R12: an offline run returns status "partial"
        // with empty output -- never fabricated reasoning.
        if (Array.isArray(p.steps) && p.steps.length > 0) {
          const chainResult = await runInferenceChain({
            name: p.name ?? "prism_ai-inference-chain",
            steps: p.steps,
            input: p.input ?? {},
            chain_id: p.chain_id,
            response_level: p.response_level ?? "summary",
            log_to_disk: p.log_to_disk ?? false,
            timeout_ms: p.timeout_ms,
          });
          // Named-field convention (this dispatcher wraps to { success, data: slimResponse(result) },
          // so callers read r.data.* directly). `mode` discriminates the two return shapes so a
          // consumer never has to infer execute-vs-discovery from the presence of `status`.
          result = { success: true, mode: "execute", ...chainResult };
        } else {
          result = {
            success: true,
            mode: "discovery",
            chain_types: listChainTypes(),
            note: "provide `steps` (ChainStep[]: {name, prompt_template, model_tier}) + `input` to execute a chain",
          };
        }
        break;
      }

      // --- Orchestration / reasoning ---
      case "unified_ppagi_orchestrate": {
        const { unifiedPPAGIOrchestrationEngine } = await import("../../engines/UnifiedPPAGIOrchestrationEngine.js");
        result = { success: true, data: await (unifiedPPAGIOrchestrationEngine as any).orchestrate?.(params as any) ?? { engine: "UnifiedPPAGIOrchestrationEngine", note: "method not callable" } };
        break;
      }
      case "unified_ppagi_stats": {
        const { unifiedPPAGIOrchestrationEngine } = await import("../../engines/UnifiedPPAGIOrchestrationEngine.js");
        result = { success: true, data: (unifiedPPAGIOrchestrationEngine as any).getStatistics?.() ?? { engine: "UnifiedPPAGIOrchestrationEngine", note: "method not callable" } };
        break;
      }
      case "formula_integration_query": {
        const { formulaIntegrationEngine } = await import("../../engines/FormulaIntegrationEngine.js");
        result = { success: true, data: await (formulaIntegrationEngine as any).query?.(params as any) ?? { engine: "FormulaIntegrationEngine", note: "method not callable" } };
        break;
      }
      case "formula_integration_stats": {
        const { formulaIntegrationEngine } = await import("../../engines/FormulaIntegrationEngine.js");
        result = { success: true, data: await (formulaIntegrationEngine as any).getStats?.() ?? { engine: "FormulaIntegrationEngine", note: "method not callable" } };
        break;
      }
      case "force_neural_predict": {
        const { forceNeuralPredictorEngine } = await import("../../engines/ForceNeuralPredictorEngine.js");
        result = { success: true, data: (forceNeuralPredictorEngine as any).predict?.(params as any) ?? { engine: "ForceNeuralPredictorEngine", note: "method not callable" } };
        break;
      }
      case "force_neural_predict_batch": {
        const { forceNeuralPredictorEngine } = await import("../../engines/ForceNeuralPredictorEngine.js");
        result = { success: true, data: (forceNeuralPredictorEngine as any).predictBatch?.(params as any) ?? { engine: "ForceNeuralPredictorEngine", note: "method not callable" } };
        break;
      }
      case "fusion_strategy_select": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        result = { success: true, data: (fusionStrategyKnowledgeEngine as any).selectStrategy?.(params as any) ?? { engine: "FusionStrategyKnowledgeEngine", note: "method not callable" } };
        break;
      }
      case "fusion_strategy_compare": {
        const { fusionStrategyKnowledgeEngine } = await import("../../engines/FusionStrategyKnowledgeEngine.js");
        result = { success: true, data: (fusionStrategyKnowledgeEngine as any).compareStrategies?.(params as any) ?? { engine: "FusionStrategyKnowledgeEngine", note: "method not callable" } };
        break;
      }
      case "paired_bundle_register": {
        const { pairedPrintProgramBundleEngine } = await import("../../engines/PairedPrintProgramBundleEngine.js");
        result = { success: true, data: (pairedPrintProgramBundleEngine as any).registerBundle?.(params as any) ?? { engine: "PairedPrintProgramBundleEngine", note: "method not callable" } };
        break;
      }
      case "paired_bundle_validate": {
        const { pairedPrintProgramBundleEngine } = await import("../../engines/PairedPrintProgramBundleEngine.js");
        result = { success: true, data: (pairedPrintProgramBundleEngine as any).validateProgram?.(params as any) ?? { engine: "PairedPrintProgramBundleEngine", note: "method not callable" } };
        break;
      }
      case "decision_reasoning_decide": {
        const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
        result = { success: true, data: (DecisionReasoningEngine as any).decide?.(params as any) ?? { engine: "DecisionReasoningEngine", note: "method not callable" } };
        break;
      }
      case "decision_reasoning_select_machine": {
        const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
        result = { success: true, data: (DecisionReasoningEngine as any).selectMachine?.(params as any) ?? { engine: "DecisionReasoningEngine", note: "method not callable" } };
        break;
      }
      case "dependency_graph_impact": {
        const { dependencyGraphEngine } = await import("../../engines/DependencyGraphEngine.js");
        result = { success: true, data: await (dependencyGraphEngine as any).impactedBy?.((params as any).filePath ?? "") ?? { engine: "DependencyGraphEngine", note: "method not callable" } };
        break;
      }
      case "dependency_graph_stats": {
        const { dependencyGraphEngine } = await import("../../engines/DependencyGraphEngine.js");
        result = { success: true, data: await (dependencyGraphEngine as any).getStats?.() ?? { engine: "DependencyGraphEngine", note: "method not callable" } };
        break;
      }
      case "domain_orchestrator_find": {
        const { domainOrchestratorPluginRegistry } = await import("../../engines/DomainOrchestratorPluginRegistry.js");
        const p = params as any;
        result = { success: true, data: (domainOrchestratorPluginRegistry as any).findByIntent?.(p.intent ?? "") ?? (domainOrchestratorPluginRegistry as any).findByDomain?.(p.domain ?? "") ?? { engine: "DomainOrchestratorPluginRegistry", note: "method not callable" } };
        break;
      }
      case "domain_orchestrator_list": {
        const { domainOrchestratorPluginRegistry } = await import("../../engines/DomainOrchestratorPluginRegistry.js");
        result = { success: true, data: { domains: (domainOrchestratorPluginRegistry as any).listDomains?.(), stats: (domainOrchestratorPluginRegistry as any).getStats?.() } };
        break;
      }

      // --- Knowledge graph / neural bridge / LoRA ---
      case "kg_neural_bridge_search": {
        const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
        const p = params as any;
        result = { success: true, data: (knowledgeGraphNeuralBridgeEngine as any).search?.(p.query ?? p, p.k ?? 10) ?? { engine: "KnowledgeGraphNeuralBridgeEngine", note: "method not callable" } };
        break;
      }
      case "kg_neural_bridge_add": {
        const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
        result = { success: true, data: (knowledgeGraphNeuralBridgeEngine as any).add?.(params as any) ?? { engine: "KnowledgeGraphNeuralBridgeEngine", note: "method not callable" } };
        break;
      }
      case "mit_course_knowledge_query": {
        // FIX (U-MIT-KNOWLEDGE-QUERY-WIRE): facade probed query/search/getCourse (none
        // exist); the real searches are searchAlgorithms + searchCourses. Sound-logic
        // router: `scope` selects algorithms | courses | both (default both -- both ARE
        // MIT course-knowledge, nothing dropped). The searches do query.toLowerCase()
        // with no guard, so require a non-empty query here (fail loud).
        const { mitCourseKnowledgeEngine } = await import("../../engines/MITCourseKnowledgeEngine.js");
        const p = params as { query?: unknown; scope?: string; limit?: number };
        if (typeof p.query !== "string" || p.query.trim() === "") {
          throw new Error("mit_course_knowledge_query requires a non-empty 'query' string");
        }
        const limit = typeof p.limit === "number" ? p.limit : 20;
        const scope = p.scope === "algorithms" || p.scope === "courses" ? p.scope : "both";
        const algorithms = scope === "courses" ? [] : (mitCourseKnowledgeEngine.searchAlgorithms(p.query, limit) ?? []);
        const courses = scope === "algorithms" ? [] : (mitCourseKnowledgeEngine.searchCourses(p.query, limit) ?? []);
        result = { query: p.query, scope, algorithms, courses };
        break;
      }
      case "catia_test_run_step": {
        const { catiaIntegrationTestSuiteEngine } = await import("../../engines/CATIAIntegrationTestSuiteEngine.js");
        result = { success: true, data: await (catiaIntegrationTestSuiteEngine as any).runStep?.(params as any) ?? { engine: "CATIAIntegrationTestSuiteEngine", note: "method not callable" } };
        break;
      }
      case "catia_test_register": {
        const { catiaIntegrationTestSuiteEngine } = await import("../../engines/CATIAIntegrationTestSuiteEngine.js");
        result = { success: true, data: (catiaIntegrationTestSuiteEngine as any).register?.(params as any) ?? { engine: "CATIAIntegrationTestSuiteEngine", note: "method not callable" } };
        break;
      }
      case "machine_lora_base_info": {
        // FIX (U-MACHINE-LORA-INFO-WIRE): facade probed getInfo()/.info -- neither
        // existed on the machineLoRABase factory object -> "method not callable".
        // Added the real getInfo(): pure introspection of the shared LoRA
        // foundation (helpers + canonical DEFAULT_SPLIT/DEFAULT_CADENCE + the 8
        // machine-type pipelines). BARE payload -- executeAIReasoningAction wraps
        // as {success, data:result}; an inner {success,data} would double-wrap.
        const { machineLoRABase } = await import("../../engines/MachineLoRABaseEngine.js");
        result = machineLoRABase.getInfo();
        break;
      }
      case "ml_lineage_link": {
        const { mlLineageEngine } = await import("../../engines/MLLineageEngine.js");
        result = { success: true, data: (mlLineageEngine as any).link?.(params as any) ?? { engine: "MLLineageEngine", note: "method not callable" } };
        break;
      }
      case "ml_lineage_trace": {
        const { mlLineageEngine } = await import("../../engines/MLLineageEngine.js");
        result = { success: true, data: (mlLineageEngine as any).trace?.(params as any) ?? { engine: "MLLineageEngine", note: "method not callable" } };
        break;
      }
      case "ml_lineage_stats": {
        const { mlLineageEngine } = await import("../../engines/MLLineageEngine.js");
        result = { success: true, data: (mlLineageEngine as any).stats?.() ?? { engine: "MLLineageEngine", note: "method not callable" } };
        break;
      }
      case "lora_adapter_register": {
        const { loraAdapterRegistryEngine } = await import("../../engines/LoRAAdapterRegistryEngine.js");
        result = { success: true, data: (loraAdapterRegistryEngine as any).register?.(params as any) ?? { engine: "LoRAAdapterRegistryEngine", note: "method not callable" } };
        break;
      }
      case "lora_adapter_resolve": {
        const { loraAdapterRegistryEngine } = await import("../../engines/LoRAAdapterRegistryEngine.js");
        result = { success: true, data: (loraAdapterRegistryEngine as any).resolve?.(params as any) ?? { engine: "LoRAAdapterRegistryEngine", note: "method not callable" } };
        break;
      }
      case "lora_adapter_list": {
        const { loraAdapterRegistryEngine } = await import("../../engines/LoRAAdapterRegistryEngine.js");
        const p = params as any;
        result = { success: true, data: (loraAdapterRegistryEngine as any).list?.(p.domain, p.status) ?? { engine: "LoRAAdapterRegistryEngine", note: "method not callable" } };
        break;
      }
      case "lora_adapter_stats": {
        const { loraAdapterRegistryEngine } = await import("../../engines/LoRAAdapterRegistryEngine.js");
        result = { success: true, data: (loraAdapterRegistryEngine as any).stats?.() ?? { engine: "LoRAAdapterRegistryEngine", note: "method not callable" } };
        break;
      }
      case "training_snapshot_create": {
        const { trainingDatasetSnapshotEngine } = await import("../../engines/TrainingDatasetSnapshotEngine.js");
        result = { success: true, data: (trainingDatasetSnapshotEngine as any).create?.(params as any) ?? { engine: "TrainingDatasetSnapshotEngine", note: "method not callable" } };
        break;
      }
      case "training_snapshot_load": {
        const { trainingDatasetSnapshotEngine } = await import("../../engines/TrainingDatasetSnapshotEngine.js");
        result = { success: true, data: (trainingDatasetSnapshotEngine as any).load?.((params as any).snapshot_id ?? "") ?? { engine: "TrainingDatasetSnapshotEngine", note: "method not callable" } };
        break;
      }
      case "training_snapshot_list": {
        const { trainingDatasetSnapshotEngine } = await import("../../engines/TrainingDatasetSnapshotEngine.js");
        result = { success: true, data: (trainingDatasetSnapshotEngine as any).list?.(params as any) ?? { engine: "TrainingDatasetSnapshotEngine", note: "method not callable" } };
        break;
      }
      case "training_snapshot_stats": {
        const { trainingDatasetSnapshotEngine } = await import("../../engines/TrainingDatasetSnapshotEngine.js");
        result = { success: true, data: (trainingDatasetSnapshotEngine as any).stats?.() ?? { engine: "TrainingDatasetSnapshotEngine", note: "method not callable" } };
        break;
      }
      case "detached_lora_runner_info": {
        const mod = await import("../../engines/DetachedLoRARunnerEngine.js");
        result = { success: true, data: { engine: "DetachedLoRARunnerEngine", class: typeof (mod as any).DetachedLoRARunnerEngine, note: "instantiate with new DetachedLoRARunnerEngine(config) — no singleton" } };
        break;
      }

      // --- Deep AI / error / consensus / cross-process ---
      case "deep_ai_reason": {
        const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
        result = { success: true, data: await (deepAIIntelligenceEngine as any).deepReason?.(params as any) ?? { engine: "DeepAIIntelligenceEngine", note: "method not callable" } };
        break;
      }
      case "deep_ai_learn": {
        const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
        result = { success: true, data: await (deepAIIntelligenceEngine as any).deepLearn?.(params as any) ?? { engine: "DeepAIIntelligenceEngine", note: "method not callable" } };
        break;
      }
      case "deep_ai_logic": {
        const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
        result = { success: true, data: await (deepAIIntelligenceEngine as any).deepLogic?.(params as any) ?? { engine: "DeepAIIntelligenceEngine", note: "method not callable" } };
        break;
      }
      case "deep_ai_extended_thinking": {
        const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
        result = { success: true, data: await (deepAIIntelligenceEngine as any).extendedThinking?.((params as any).query ?? "") ?? { engine: "DeepAIIntelligenceEngine", note: "method not callable" } };
        break;
      }
      case "error_explainer_explain": {
        const { errorExplainerEngine } = await import("../../engines/ErrorExplainerEngine.js");
        result = { success: true, data: (errorExplainerEngine as any).explain?.(params as any) ?? { engine: "ErrorExplainerEngine", note: "method not callable" } };
        break;
      }
      case "error_explainer_categories": {
        const { errorExplainerEngine } = await import("../../engines/ErrorExplainerEngine.js");
        result = { success: true, data: { categories: (errorExplainerEngine as any).categories?.() ?? [] } };
        break;
      }
      case "consensus_ai_bridge_reason": {
        const { consensusAIBridgeEngine } = await import("../../engines/ConsensusAIBridgeEngine.js");
        result = { success: true, data: await (consensusAIBridgeEngine as any).reason?.(params as any) ?? { engine: "ConsensusAIBridgeEngine", note: "method not callable" } };
        break;
      }
      case "cross_process_ai_classify": {
        const { CrossProcessAIBridge } = await import("../../engines/CrossProcessAIBridge.js");
        result = { success: true, data: (CrossProcessAIBridge as any).classify?.((params as any).intent ?? "", params as any) ?? { engine: "CrossProcessAIBridge", note: "method not callable" } };
        break;
      }
      case "cross_process_ai_orchestrate": {
        const { CrossProcessAIBridge } = await import("../../engines/CrossProcessAIBridge.js");
        result = { success: true, data: await (CrossProcessAIBridge as any).orchestrate?.(params as any) ?? { engine: "CrossProcessAIBridge", note: "method not callable" } };
        break;
      }
      case "consensus_neural_feedback_record": {
        const { consensusNeuralFeedbackEngine } = await import("../../engines/ConsensusNeuralFeedbackEngine.js");
        result = { success: true, data: (consensusNeuralFeedbackEngine as any).record?.(params as any) ?? { engine: "ConsensusNeuralFeedbackEngine", note: "method not callable" } };
        break;
      }
      case "consensus_neural_feedback_recent": {
        const { consensusNeuralFeedbackEngine } = await import("../../engines/ConsensusNeuralFeedbackEngine.js");
        result = { success: true, data: (consensusNeuralFeedbackEngine as any).recent?.((params as any).n ?? 50) ?? { engine: "ConsensusNeuralFeedbackEngine", note: "method not callable" } };
        break;
      }

      // --- Knowledge injection / tribal / coordinator / cross-domain ---
      case "knowledge_injection_plan": {
        const { knowledgeInjectionPipelineEngine } = await import("../../engines/KnowledgeInjectionPipelineEngine.js");
        result = { success: true, data: (knowledgeInjectionPipelineEngine as any).plan?.(params as any) ?? { engine: "KnowledgeInjectionPipelineEngine", note: "method not callable" } };
        break;
      }
      case "knowledge_injection_execute": {
        const { knowledgeInjectionPipelineEngine } = await import("../../engines/KnowledgeInjectionPipelineEngine.js");
        result = { success: true, data: (knowledgeInjectionPipelineEngine as any).executeInjection?.(params as any) ?? { engine: "KnowledgeInjectionPipelineEngine", note: "method not callable" } };
        break;
      }
      case "knowledge_injection_record_outcome": {
        const { knowledgeInjectionPipelineEngine } = await import("../../engines/KnowledgeInjectionPipelineEngine.js");
        result = { success: true, data: (knowledgeInjectionPipelineEngine as any).recordOutcome?.(params as any) ?? { engine: "KnowledgeInjectionPipelineEngine", note: "method not callable" } };
        break;
      }
      case "tribal_applicator_apply": {
        const { tribalKnowledgeApplicatorEngine } = await import("../../engines/TribalKnowledgeApplicatorEngine.js");
        result = { success: true, data: (tribalKnowledgeApplicatorEngine as any).apply?.(params as any) ?? { engine: "TribalKnowledgeApplicatorEngine", note: "method not callable" } };
        break;
      }
      case "full_system_coordinator_coordinate": {
        const { FullSystemAICoordinatorEngine } = await import("../../engines/FullSystemAICoordinatorEngine.js");
        result = { success: true, data: await (FullSystemAICoordinatorEngine as any).coordinate?.(params as any) ?? { engine: "FullSystemAICoordinatorEngine", note: "method not callable" } };
        break;
      }
      case "full_system_coordinator_route_specialist": {
        const { FullSystemAICoordinatorEngine } = await import("../../engines/FullSystemAICoordinatorEngine.js");
        result = { success: true, data: await (FullSystemAICoordinatorEngine as any).routeSpecialist?.(params as any) ?? { engine: "FullSystemAICoordinatorEngine", note: "method not callable" } };
        break;
      }
      case "cross_domain_orchestrate": {
        // FIX (U-XDOMAIN-ORCH-WIRE): the bulk-sweep facade probed orchestrate/plan/execute
        // (none exist) -> always "method not callable". The real method is the static
        // planJob, which SELF-VALIDATES via OrchestrationInputSchema.parse (throws on bad
        // input -> dispatcherError), so no extra dispatcher schema is needed.
        const { crossDomainOrchestratorEngine } = await import("../../engines/CrossDomainOrchestratorEngine.js");
        // return the bare plan as `result`; executeAIReasoningAction adds the
        // {success, data} envelope (the prior facade's inner {success,data} wrap
        // double-wrapped -> data.data; this action was dark so no consumer relied on it).
        result = crossDomainOrchestratorEngine.planJob(params as unknown as Parameters<typeof crossDomainOrchestratorEngine.planJob>[0]);
        break;
      }
      // ─── WIRE-AI-DIRECT-MS0/U-VICTOR-AI-DIRECT (slot:victor 2026-05-26) ───
      case "tribal_outcome_bridge_status": {
        const { TribalKnowledgeOutcomeBridgeEngine } = await import("../../engines/TribalKnowledgeOutcomeBridgeEngine.js");
        result = { success: true, data: { isSubscribed: TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes() } };
        break;
      }
      case "knowledge_graph_project": {
        const { KnowledgeGraphFeatureProjectorEngine } = await import("../../engines/KnowledgeGraphFeatureProjectorEngine.js");
        result = { success: true, data: KnowledgeGraphFeatureProjectorEngine.project(params as any) };
        break;
      }
      case "graph_importance_rank_global": {
        const { graphImportanceEngine } = await import("../../engines/GraphImportanceEngine.js");
        result = { success: true, data: graphImportanceEngine.rankGlobal(params as any) };
        break;
      }
      case "graph_context_lens_extract": {
        // result is the bare EgoGraph; the function tail wraps it as
        // { success:true, data: slimResponse(result) }, so callers read r.data.* directly.
        const { graphContextLensEngine } = await import("../../engines/GraphContextLensEngine.js");
        const p = params as any;
        const lensOpts = { maxNodes: p?.maxNodes, enrich: p?.enrich };
        const ego = p?.domain
          ? await graphContextLensEngine.extractByDomain(String(p.domain), lensOpts)
          : await graphContextLensEngine.extractEgoGraph(String(p?.nodeId ?? ""), Number.isFinite(p?.hops) ? p.hops : 1, lensOpts);
        result = p?.format && p.format !== "json"
          ? { ...ego, rendered: graphContextLensEngine.render(ego, p.format) }
          : ego;
        break;
      }
      case "graphrag_retrieve": {
        // result is the bare GraphRAGResult; the function tail wraps it as {success,data}.
        const { graphRAGRetrievalEngine } = await import("../../engines/GraphRAGRetrievalEngine.js");
        const p = params as any;
        result = await graphRAGRetrievalEngine.retrieve(String(p?.query ?? ""), {
          topK: p?.topK,
          topSeeds: p?.topSeeds,
          hops: p?.hops,
          maxNodes: p?.maxNodes,
          useLlm: p?.useLlm,
          noLlm: p?.noLlm,
        });
        break;
      }
      case "approval_chain_get": {
        const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
        const p = params as any;
        result = { success: true, data: approvalChainEngine.getChain(String(p?.chain_id ?? "")) };
        break;
      }

      // INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11) -- KnowledgeLineageEngine was dispatcher-DARK
      // (zero real consumers; pure read-only knowledge-provenance graph). These 3 actions expose its
      // DATA surface so the fleet can audit atom provenance + lineage health via MCP. All three methods
      // are deterministic graph/ledger reads (no NN inference). getLineageReport NEVER throws (returns
      // atom:undefined for a missing id). R12-safe DATA only.
      case "knowledge_lineage_report": {
        const atomId = params.atomId;
        if (typeof atomId !== "string" || !atomId) {
          result = { success: false, error: "atomId (string) is required -- the knowledge-atom id to trace provenance for" };
          break;
        }
        const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
        result = { success: true, ...knowledgeLineageEngine.getLineageReport(atomId) };
        break;
      }
      case "knowledge_lineage_stats": {
        const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
        result = { success: true, stats: knowledgeLineageEngine.getStats() };
        break;
      }
      case "knowledge_lineage_pending_conflicts": {
        const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
        const conflicts = knowledgeLineageEngine.getPendingConflicts();
        result = { success: true, count: conflicts.length, conflicts };
        break;
      }

      // INDIA-AI-ORPHAN-WIRE unit 2 -- LocalEmbeddingEngine (zero-service ONNX MiniLM embedding
      // backbone; dispatcher-dark). status = readiness/model name; similarity = pure cosine math over
      // caller-supplied vectors. R12-safe DATA only -- embed() (model-loading inference) NOT surfaced.
      case "local_embedding_status": {
        const { localEmbeddingEngine } = await import("../../engines/LocalEmbeddingEngine.js");
        result = { success: true, loaded: localEmbeddingEngine.isLoaded(), model: localEmbeddingEngine.getModel() };
        break;
      }
      case "local_embedding_similarity": {
        const a = params.a;
        const b = params.b;
        const finiteNumArray = (v: unknown): v is number[] =>
          Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number" && Number.isFinite(x));
        if (!finiteNumArray(a) || !finiteNumArray(b)) {
          result = { success: false, error: "a and b must both be non-empty arrays of finite numbers (the two vectors to compare)" };
          break;
        }
        if (a.length !== b.length) {
          result = { success: false, error: `vector length mismatch: a.length=${a.length} b.length=${b.length}` };
          break;
        }
        const { localEmbeddingEngine } = await import("../../engines/LocalEmbeddingEngine.js");
        result = { success: true, similarity: localEmbeddingEngine.cosineSimilarity(a, b) };
        break;
      }

      // INDIA-AI-ORPHAN-WIRE unit 3 -- IntentClassifierEngine (PUOA tier-routing; pure regex/keyword
      // classifier, no NN). normalizeIntent() assumes a string -- the cases guard a non-empty string so
      // a bad caller gets a specific error, not an engine throw. R12-safe DATA only (no inference).
      case "classify_intent": {
        const intent = params.intent;
        if (typeof intent !== "string" || !intent.trim()) {
          result = { success: false, error: "intent (non-empty string) is required -- the raw user intent text to classify" };
          break;
        }
        const { intentClassifierEngine } = await import("../../engines/IntentClassifierEngine.js");
        result = { success: true, ...intentClassifierEngine.classify(intent, params.context ?? null) };
        break;
      }
      case "quick_classify_intent": {
        const intent = params.intent;
        if (typeof intent !== "string" || !intent.trim()) {
          result = { success: false, error: "intent (non-empty string) is required -- the raw user intent text to classify" };
          break;
        }
        const { intentClassifierEngine } = await import("../../engines/IntentClassifierEngine.js");
        result = { success: true, ...intentClassifierEngine.quickClassify(intent) };
        break;
      }
      case "extract_intent_entities": {
        const intent = params.intent;
        if (typeof intent !== "string" || !intent.trim()) {
          result = { success: false, error: "intent (non-empty string) is required -- the raw user intent text to extract entities from" };
          break;
        }
        const { intentClassifierEngine } = await import("../../engines/IntentClassifierEngine.js");
        result = { success: true, entities: intentClassifierEngine.extractEntities(intent) };
        break;
      }

      // ----------------------------------------------------------------------
      // INDIA-AI-ORPHAN-WIRE unit 4 -- PolicyExperienceLedgerEngine (offline-RL
      // (s,a,r,s') ledger). Read-only: stats() never throws; query() safeParses
      // its filter and returns {tuples:[],truncated:false} on bad input. append()
      // (write) is deliberately unwired (R12 DATA-only).
      // ----------------------------------------------------------------------
      case "policy_experience_stats": {
        const { policyExperienceLedgerEngine } = await import("../../engines/PolicyExperienceLedgerEngine.js");
        result = { success: true, ...policyExperienceLedgerEngine.stats() };
        break;
      }
      case "policy_experience_query": {
        const { policyExperienceLedgerEngine } = await import("../../engines/PolicyExperienceLedgerEngine.js");
        // query() safeParses the filter internally -- a bad filter yields an empty
        // result set, never a throw. Pass the caller params straight through.
        const q = policyExperienceLedgerEngine.query(params as unknown as Parameters<typeof policyExperienceLedgerEngine.query>[0]);
        result = { success: true, tuples: q.tuples, truncated: q.truncated, count: q.tuples.length };
        break;
      }

      // ----------------------------------------------------------------------
      // INDIA-AI-ORPHAN-WIRE unit 5 -- TemporalReasoningEngine (in-memory series
      // ledger + OLS projection/forecast). Reads return empty/null for an unknown
      // series; the cases guard a non-empty series string + finite forecast target
      // so a bad caller gets a specific error. record() (write) is unwired.
      // ----------------------------------------------------------------------
      case "temporal_snapshots": {
        const series = params.series;
        if (typeof series !== "string" || !series.trim()) {
          result = { success: false, error: "series (non-empty string) is required -- the timeline series name to read" };
          break;
        }
        const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
        const snaps = temporalReasoningEngine.snapshots(series);
        result = { success: true, series, snapshots: snaps, count: snaps.length };
        break;
      }
      case "temporal_project": {
        const series = params.series;
        if (typeof series !== "string" || !series.trim()) {
          result = { success: false, error: "series (non-empty string) is required -- the timeline series name to project" };
          break;
        }
        const rawWindowSize = params.windowSize;
        if (rawWindowSize !== undefined && (typeof rawWindowSize !== "number" || !Number.isFinite(rawWindowSize) || rawWindowSize < 2)) {
          result = { success: false, error: "windowSize must be an integer >= 2" };
          break;
        }
        const windowSize = typeof rawWindowSize === "number" ? rawWindowSize : undefined;
        const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
        const projection = temporalReasoningEngine.project(series, windowSize);
        // null = fewer than 2 snapshots; surface that honestly rather than a fake zero-slope line.
        result = { success: true, series, projection, hasProjection: projection !== null };
        break;
      }
      case "temporal_forecast": {
        const series = params.series;
        if (typeof series !== "string" || !series.trim()) {
          result = { success: false, error: "series (non-empty string) is required -- the timeline series name to forecast" };
          break;
        }
        const target = params.target;
        if (typeof target !== "number" || !Number.isFinite(target)) {
          result = { success: false, error: "target (finite number) is required -- the value to forecast an ETA to" };
          break;
        }
        const windowSize = typeof params.windowSize === "number" && Number.isFinite(params.windowSize) ? params.windowSize : undefined;
        const nowIso = typeof params.nowIso === "string" ? params.nowIso : undefined;
        const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
        result = { success: true, ...temporalReasoningEngine.forecast(series, target, windowSize, nowIso) };
        break;
      }

      case "temporal_record": {
        // ENGINE-WIRE-MS0/U-WIRE09: wire TemporalReasoningEngine.record (previously unwired write path)
        const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
        const snap = temporalReasoningEngine.record(
          params.series as string,
          params.value as number,
          params.at as string | undefined,
          params.note as string | undefined,
        );
        result = { success: true, ...snap };
        break;
      }
      case "cognitive_classify": {
        // ENGINE-WIRE-MS0/U-WIRE09: wire CognitiveBudgetAllocatorEngine.classify (previously unwired)
        const { cognitiveBudgetAllocatorEngine } = await import("../../engines/CognitiveBudgetAllocatorEngine.js");
        const depth = cognitiveBudgetAllocatorEngine.classify(params.score as number);
        result = { depth, score: params.score };
        break;
      }
      // ----------------------------------------------------------------------
      // INDIA-AI-ORPHAN-WIRE unit 6 -- RealTimeAnomalyDetectionEngine (5
      // deterministic detectors; no trained model). detect() does NOT guard its
      // input, so the case enforces a non-empty finite-number sample window + a
      // positive finite sample_rate_hz (else .slice/FFT throw). Process-health
      // MONITORING only -- recommended_action is advisory text, not machine
      // control. R12-safe DATA only.
      // ----------------------------------------------------------------------
      case "detect_cutting_anomalies": {
        const samples = params.samples;
        const finiteNumArray = (v: unknown): v is number[] =>
          Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number" && Number.isFinite(x));
        if (!finiteNumArray(samples)) {
          result = { success: false, error: "samples must be a non-empty array of finite numbers (the sensor time-series window)" };
          break;
        }
        if (samples.length > 250000) {
          // Wire-policy DoS guard: detect() runs FFT/wavelet O(n log n) over caller samples.
          // Real sensor windows are far smaller (<<250k); cap pathological inputs.
          result = { success: false, error: `samples too large: max 250000 per call (got ${samples.length}) -- guards against resource exhaustion` };
          break;
        }
        const rate = params.sample_rate_hz;
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
          result = { success: false, error: "sample_rate_hz (positive finite number) is required -- the sensor sampling rate in Hz" };
          break;
        }
        const { realTimeAnomalyDetectionEngine } = await import("../../engines/RealTimeAnomalyDetectionEngine.js");
        const detected = realTimeAnomalyDetectionEngine.detect(params as unknown as Parameters<typeof realTimeAnomalyDetectionEngine.detect>[0]);
        result = { success: true, ...detected };
        break;
      }

      // ----------------------------------------------------------------------
      // INDIA-AI-ORPHAN-WIRE unit 7 -- KnowledgeIngestionOrchestratorEngine.
      // getStats() = cheap sync processed-count snapshot. getPending() = read-only
      // pending-resource list (triggers a bounded disk discoverResources() scan;
      // no writes). runPipeline()/ingestResource() (side-effecting) are unwired.
      // ----------------------------------------------------------------------
      case "knowledge_ingestion_stats": {
        const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
        result = { success: true, ...knowledgeIngestionOrchestratorEngine.getStats() };
        break;
      }
      case "knowledge_ingestion_pending": {
        const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
        const pending = await knowledgeIngestionOrchestratorEngine.getPending();
        result = { success: true, pending, count: pending.length };
        break;
      }
      case "blueprint_loop_drain": {
        // U-BPA-LOOP-DRAIN-DISPATCH (slot:india) -- the LIVE final arrow of the
        // blueprint closed loop. Reads the accuracy ledger past the consumer's
        // ISOLATED offset, dispatches the 4 GENERAL cross-process learning
        // primitives (drift/replay/ewc/predlog) in-process via routeXprocAction, and
        // SKIPS outcome_record: CrossProcessOutcomeStore.record validates process in
        // {mill,lathe,wedm}, but a blueprint extraction is process-agnostic, so its
        // ground truth stays ledger-only (reference_bpa_outcome_store_mismatch). Idempotent
        // via the consumer-state offset; dryRun computes the plan without dispatch/advance.
        const dryRun = params.dryRun === true;
        const pathMod = await import("path");
        const urlMod = await import("url");
        const fsMod = await import("fs");
        // repo root via resolveRepoRoot() (depth-independent). The old 3-level
        // climb broke under the esbuild dist/index.js bundle -- U-DISPATCHER-REPO-ROOT-FIX.
        const repoMcpRoot = pathMod.resolve(resolveRepoRoot(), "mcp-server");
        const drainPath = pathMod.resolve(repoMcpRoot, "..", "scripts/lib/blueprint-loop-drain-lib.mjs");
        const consumerLibPath = pathMod.resolve(repoMcpRoot, "..", "scripts/lib/blueprint-accuracy-consumer-lib.mjs");
        const { drainEvents } = await import(urlMod.pathToFileURL(drainPath).href);
        const { migrateState, advanceOffset, CONSUMER_STATE_FILENAME } = await import(urlMod.pathToFileURL(consumerLibPath).href);
        const eventsFile = process.env.PRISM_BPA_EVENTS_FILE || pathMod.resolve(repoMcpRoot, "..", "state", "shared", "blueprint-accuracy-events.jsonl");
        const stateFile = process.env.PRISM_BPA_STATE_FILE || pathMod.resolve(repoMcpRoot, "..", "state", "shared", CONSUMER_STATE_FILENAME);
        let prior: unknown = null;
        try { if (fsMod.existsSync(stateFile)) prior = JSON.parse(fsMod.readFileSync(stateFile, "utf8")); } catch { prior = null; }
        const priorState = migrateState(prior);
        let offset: number = Number(priorState.lastProcessedOffset) || 0;
        const fullBuf = fsMod.existsSync(eventsFile) ? fsMod.readFileSync(eventsFile) : Buffer.alloc(0);
        if (fullBuf.length < offset) offset = 0; // ledger rotated/shrank -> reprocess from 0
        const tailBlob = fullBuf.subarray(offset).toString("utf8");
        const dispatch = dryRun ? undefined : async (a: string, p: Record<string, unknown>) => routeXprocAction(a, p);
        const drainRes = await drainEvents({
          tailBlob,
          priorState,
          dispatch,
          dryRun,
          // outcome_record is ledger-only for blueprint: CrossProcessOutcomeStore
          // validates process in {mill,lathe,wedm}; a print is process-agnostic.
          skipActions: ["xproc_outcome_record", "xproc_outcome_record_outcome"],
        });
        const newOffset = advanceOffset(offset, Buffer.byteLength(tailBlob, "utf8"));
        if (!dryRun) {
          const newState = { ...drainRes.newState, lastProcessedOffset: newOffset };
          const tmp = `${stateFile}.tmp-${process.pid}-drain`;
          fsMod.writeFileSync(tmp, JSON.stringify(newState, null, 2));
          fsMod.renameSync(tmp, stateFile);
        }
        result = {
          success: true,
          dryRun,
          offset: { prior: Number(priorState.lastProcessedOffset) || 0, new: dryRun ? (Number(priorState.lastProcessedOffset) || 0) : newOffset },
          summary: drainRes.summary,
          dispatched: Array.isArray(drainRes.dispatched) ? drainRes.dispatched.slice(0, 50) : [],
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-UNWIRED-PAPA / U-WIRE-XFER -- TransferLearningAdapterEngine.
      // Domain-adaptation for milling transfer (material/machine/tool/process).
      // Singleton; reset() clears tasks/results but NOT domains (callers use
      // unique domain ids). createTask/adapt throw on a missing domain/task ->
      // the outer try/catch returns a dispatcherError.
      // ─────────────────────────────────────────────────────────────────────
      case "xfer_register_domain": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        const domain = params.domain as Parameters<typeof transferLearningAdapterEngine.registerDomain>[0];
        if (!domain || typeof domain.id !== "string" || domain.id.length === 0) {
          return dispatcherError("xfer_register_domain requires params.domain with a non-empty string id", action, "prism_ai");
        }
        transferLearningAdapterEngine.registerDomain(domain);
        result = { registered: true, domain_id: domain.id };
        break;
      }
      case "xfer_create_task": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        const task = transferLearningAdapterEngine.createTask(
          params.source_id as string,
          params.target_id as string,
          params.task_type as Parameters<typeof transferLearningAdapterEngine.createTask>[2],
          params.method as Parameters<typeof transferLearningAdapterEngine.createTask>[3],
        );
        result = { task };
        break;
      }
      case "xfer_domain_similarity": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        result = transferLearningAdapterEngine.computeDomainSimilarity(
          params.source_id as string,
          params.target_id as string,
        );
        break;
      }
      case "xfer_feature_alignment": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        const alignment = transferLearningAdapterEngine.computeFeatureAlignment(
          params.source_features as string[],
          params.target_features as string[],
        );
        // mapping is a Map<string,string> -- not JSON-serializable; emit as a plain object.
        result = {
          source_features: alignment.source_features,
          target_features: alignment.target_features,
          mapping: Object.fromEntries(alignment.mapping),
          alignment_score: alignment.alignment_score,
        };
        break;
      }
      case "xfer_instance_weights": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        result = {
          weights: transferLearningAdapterEngine.computeInstanceWeights(
            params.source_data as Parameters<typeof transferLearningAdapterEngine.computeInstanceWeights>[0],
            params.target_data as Parameters<typeof transferLearningAdapterEngine.computeInstanceWeights>[1],
          ),
        };
        break;
      }
      case "xfer_adapt": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        // Engine simulates adaptation with Math.random internally -- numeric
        // outputs are non-deterministic by design; the shape is stable.
        result = transferLearningAdapterEngine.adapt(
          params.task_id as string,
          params.source_data as Parameters<typeof transferLearningAdapterEngine.adapt>[1],
          params.target_data as Parameters<typeof transferLearningAdapterEngine.adapt>[2],
        );
        break;
      }
      case "xfer_get_tasks": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        result = { tasks: transferLearningAdapterEngine.getTasks() };
        break;
      }
      case "xfer_get_result": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        result = { result: transferLearningAdapterEngine.getResult(params.task_id as string) };
        break;
      }
      case "xfer_statistics": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        result = transferLearningAdapterEngine.getStatistics();
        break;
      }
      case "xfer_get_config": {
        const { transferLearningAdapterEngine } = await import("../../engines/TransferLearningAdapterEngine.js");
        result = transferLearningAdapterEngine.getConfig();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-UNWIRED-PAPA / U-WIRE-ATTR -- AttractorDetectionEngine.
      // Dynamical-systems analysis over an observed state trajectory. Singleton;
      // clear() resets the trajectory. Deterministic (no Math.random). Read /
      // analysis surface only -- detectBifurcations (closure input) withheld.
      // ─────────────────────────────────────────────────────────────────────
      case "attr_observe": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        attractorDetectionEngine.observe(params.state as Parameters<typeof attractorDetectionEngine.observe>[0]);
        result = { observed: true, trajectory_length: attractorDetectionEngine.getTrajectoryLength() };
        break;
      }
      case "attr_observe_batch": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        const states = params.states as Parameters<typeof attractorDetectionEngine.observeBatch>[0];
        attractorDetectionEngine.observeBatch(states);
        result = { observed: states.length, trajectory_length: attractorDetectionEngine.getTrajectoryLength() };
        break;
      }
      case "attr_detect_fixed_points": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { fixed_points: attractorDetectionEngine.detectFixedPoints() };
        break;
      }
      case "attr_detect_limit_cycles": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { limit_cycles: attractorDetectionEngine.detectLimitCycles() };
        break;
      }
      case "attr_analyze": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = attractorDetectionEngine.analyze();
        break;
      }
      case "attr_lyapunov": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { lyapunov_exponent: attractorDetectionEngine.estimateLyapunovExponent() };
        break;
      }
      case "attr_stability_metrics": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = attractorDetectionEngine.getStabilityMetrics();
        break;
      }
      case "attr_recurrence_plot": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { recurrence_plot: attractorDetectionEngine.computeRecurrencePlot(params.threshold as number | undefined) };
        break;
      }
      case "attr_get_attractors": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { attractors: attractorDetectionEngine.getAttractors() };
        break;
      }
      case "attr_trajectory_length": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { trajectory_length: attractorDetectionEngine.getTrajectoryLength() };
        break;
      }
      case "attr_current_state": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { state: attractorDetectionEngine.getCurrentState() };
        break;
      }
      case "attr_has_converged": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = { converged: attractorDetectionEngine.hasConverged() };
        break;
      }
      case "attr_get_config": {
        const { attractorDetectionEngine } = await import("../../engines/AttractorDetectionEngine.js");
        result = attractorDetectionEngine.getConfig();
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // WIRE-UNWIRED-PAPA / U-WIRE-TPE -- TPEHyperparameterSearchEngine.
      // Optuna-style ask-tell hyperparameter search (suggest -> tell loop) +
      // persistence (snapshot/load) + lifecycle (clear). Seeded PRNG; singleton.
      // tell() throws on non-finite loss / out-of-order trial_id / invalid sample.
      // ─────────────────────────────────────────────────────────────────────
      case "tpe_suggest": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        result = { suggestion: tpeHyperparameterSearchEngine.suggest() };
        break;
      }
      case "tpe_tell": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        // Schema-validated above; build the tell input with per-field casts from unknown.
        type TellInput = Parameters<typeof tpeHyperparameterSearchEngine.tell>[0];
        result = tpeHyperparameterSearchEngine.tell({
          trial_id: params.trial_id as number,
          sample: params.sample as TellInput["sample"],
          loss: params.loss as number,
          elapsed_ms: params.elapsed_ms as number,
          completed_at: params.completed_at as number,
          source: params.source as TellInput["source"],
          note: params.note as string | undefined,
        });
        break;
      }
      case "tpe_best_trial": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        result = { best: tpeHyperparameterSearchEngine.bestTrial() };
        break;
      }
      case "tpe_list_trials": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        result = { trials: tpeHyperparameterSearchEngine.listTrials() };
        break;
      }
      case "tpe_get_config": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        result = tpeHyperparameterSearchEngine.getConfig();
        break;
      }
      case "tpe_is_exhausted": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        result = { exhausted: tpeHyperparameterSearchEngine.isExhausted() };
        break;
      }
      case "tpe_snapshot": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        result = tpeHyperparameterSearchEngine.toSnapshot();
        break;
      }
      case "tpe_load_snapshot": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        tpeHyperparameterSearchEngine.loadSnapshot(
          params.snapshot as Parameters<typeof tpeHyperparameterSearchEngine.loadSnapshot>[0],
        );
        result = { loaded: true, trial_count: tpeHyperparameterSearchEngine.listTrials().length };
        break;
      }
      case "tpe_clear": {
        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
        tpeHyperparameterSearchEngine.clearAll();
        result = { cleared: true };
        break;
      }

      // ----------------------------------------------------------------------
      // CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09/10 -- MasterAITrainingLedger (closed-loop
      // training ledger across the 8 CAM pipelines) + LoRADriftCoordinator (cross-
      // pipeline drift -> master-retrain trigger). Validation guards early-return
      // dispatcherError (top-level r.error); engine throws (invalid pipelineType,
      // dup runId, threshold<2 ...) also surface via the outer catch -> r.error.
      // Success payloads ride r.data. Reland of the never-wired U-CMCCL09/10 surface.
      // ----------------------------------------------------------------------
      case "ledger_ingest": {
        if (!params.pipelineType) return dispatcherError("missing pipelineType", action, "prism_ai");
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        // ingest() throws on invalid pipelineType / missing runId|datasetFingerprint /
        // non-finite metrics / duplicate runId -> caught by the outer try -> r.error.
        const entry = masterAITrainingLedgerEngine.ingest(
          params as unknown as Parameters<typeof masterAITrainingLedgerEngine.ingest>[0],
        );
        result = { success: true, entry };
        break;
      }
      case "ledger_query": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        const entries = masterAITrainingLedgerEngine.query(
          params as unknown as Parameters<typeof masterAITrainingLedgerEngine.query>[0],
        );
        result = { success: true, count: entries.length, entries };
        break;
      }
      case "ledger_replay": {
        const runId = params.runId;
        if (typeof runId !== "string" || !runId.trim()) {
          return dispatcherError("runId (non-empty string) is required", action, "prism_ai");
        }
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        const entry = masterAITrainingLedgerEngine.replay(runId);
        result = { success: true, found: entry !== null, entry };
        break;
      }
      case "ledger_compare": {
        const a = params.pipelineA;
        const b = params.pipelineB;
        if (typeof a !== "string" || typeof b !== "string") {
          return dispatcherError("pipelineA and pipelineB (pipeline-type strings) are required", action, "prism_ai");
        }
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        // compare()/pipelineStability() throw on an invalid pipeline type -> r.error.
        const comparison = masterAITrainingLedgerEngine.compare(
          a as Parameters<typeof masterAITrainingLedgerEngine.compare>[0],
          b as Parameters<typeof masterAITrainingLedgerEngine.compare>[1],
        );
        result = { success: true, ...comparison };
        break;
      }
      case "ledger_slo": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        result = { success: true, slos: masterAITrainingLedgerEngine.sloStatus() };
        break;
      }
      case "ledger_status": {
        const { masterAITrainingLedgerEngine } = await import("../../engines/MasterAITrainingLedgerEngine.js");
        const supportedPipelines = masterAITrainingLedgerEngine.supportedPipelines();
        const stability = supportedPipelines.map((p) => masterAITrainingLedgerEngine.pipelineStability(p));
        result = {
          success: true,
          totalRuns: masterAITrainingLedgerEngine.totalRuns(),
          supportedPipelines,
          stability,
        };
        break;
      }
      case "ledger_drift_record": {
        if (params.delta === undefined || params.delta === null) {
          return dispatcherError("missing delta", action, "prism_ai");
        }
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        // record() throws on missing pipelineType / non-finite delta / missing observedAt.
        const event = loRADriftCoordinatorEngine.record(
          params as unknown as Parameters<typeof loRADriftCoordinatorEngine.record>[0],
        );
        result = { success: true, event };
        break;
      }
      case "ledger_drift_active": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = { success: true, activePipelines: loRADriftCoordinatorEngine.activePipelines() };
        break;
      }
      case "ledger_drift_check": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        result = { success: true, shouldTriggerMasterRetrain: loRADriftCoordinatorEngine.shouldTriggerMasterRetrain() };
        break;
      }
      case "ledger_drift_config": {
        const { loRADriftCoordinatorEngine } = await import("../../engines/LoRADriftCoordinatorEngine.js");
        if (params.set !== undefined && params.set !== null) {
          // setConfig() throws on coordinatedThreshold<2 / windowMs<=0 / driftDeltaFloor<0 -> r.error.
          const config = loRADriftCoordinatorEngine.setConfig(
            params.set as Parameters<typeof loRADriftCoordinatorEngine.setConfig>[0],
          );
          result = { success: true, config };
        } else {
          result = { success: true, config: loRADriftCoordinatorEngine.getConfig() };
        }
        break;
      }

      case "ai_route_task": {
        const router = await getAiRouter();
        result = router.route(String(params.task ?? ""));
        break;
      }
      case "ai_health_report": {
        const router = await getAiRouter();
        if (params.backend) {
          result = router.probe(params.backend as Parameters<typeof router.probe>[0]);
        } else {
          result = { backends: router.healthReport() };
        }
        break;
      }
      case "ai_recommend_capability": {
        const auto = await getAiAuto();
        // AIAutoUtilizationEngine.analyze takes Partial<UserContext>
        // (recent_files/recent_engines/domain_focus/session_goals/error_history) --
        // it has no experience-level field, so we route on the input prompt alone.
        // (The vestigial `experience` param -- inherited from the pre-clobber ancestor
        // whose UserContext had experienceLevel -- was dropped from the schema; it was
        // a silent no-op against the current engine. Re-add experience-aware context
        // here only after AIAutoUtilizationEngine.UserContext gains that field.)
        result = auto.analyze(String(params.input ?? ""));
        break;
      }
      case "ai_classify_content": {
        const reasoner = await getAiExtract();
        result = await reasoner.classifyContent(params.content);
        break;
      }

      default: {
        const _exhaustive: never = action;
        return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_ai");
      }
    }

    const duration = Date.now() - startTime;
    log.info(`[prism_ai] ${action} completed in ${duration}ms`);

    // Slim response
    const slimmed = slimResponse(result);

    return { success: true, data: slimmed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`[prism_ai] ${action} failed: ${message}`);
    return dispatcherError(message, action, "prism_ai");
  }
}

/** MCP tool handler entry point */
export async function aiReasoningDispatcher(
  args: { action: AIAction; params?: Record<string, unknown> }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeAIReasoningAction(args.action, args.params ?? {});
}

/** Export action lists for registration (legacy + U-AIMAX10 merged). */
export { AI_REASONING_ACTIONS, ALL_AI_ACTIONS };

/** Register dispatcher with MCP server */
export function registerAIReasoningDispatcher(server: { tool: Function }): void {
  server.tool(
    aiReasoningDispatcherDef.name,
    aiReasoningDispatcherDef.description,
    aiReasoningDispatcherDef.inputSchema.shape,
    async ({ action, params = {} }: { action: AIAction; params?: Record<string, unknown> }) => {
      const result = await executeAIReasoningAction(action, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
