/**
 * multiActionSchemas.ts — Zod input schemas for the prism_multi dispatcher.
 *
 * Covers 9 Multi-domain engines (PSN-SYNERGY batch 4 / slot oscar):
 *
 *   MultiAgentCoordinatorEngine      → coordinator_coordinate
 *                                       coordinator_get_agents
 *                                       coordinator_get_agent_by_type
 *                                       coordinator_get_agents_with_capability
 *                                       coordinator_generate_reasoning
 *                                       coordinator_get_history
 *                                       coordinator_clear_history
 *
 *   MultiCamKnowledgeEngine          → cam_knowledge_get_archive
 *                                       cam_knowledge_list_archives
 *                                       cam_knowledge_query
 *                                       cam_knowledge_total_files
 *                                       cam_knowledge_offline_systems
 *                                       cam_knowledge_extraction_routing
 *                                       cam_knowledge_stats
 *                                       cam_knowledge_self_awareness
 *
 *   MultiObjectiveParetoEngine       → pareto_compute
 *
 *   MultiPathReasoningEngine         → path_explore
 *                                       path_compare_approaches
 *                                       path_get_available_approaches
 *                                       path_sensitivity_analysis
 *
 *   MultiSetupFeasibilityChainEngine → setup_analyze_feasibility
 *                                       setup_check_datum_chain
 *                                       setup_find_optimal_sequence
 *                                       setup_detect_dead_ends
 *
 *   MultiSignalAutoRollbackEngine    → rollback_set_config
 *                                       rollback_get_config
 *                                       rollback_set_fallback
 *                                       rollback_get_fallback
 *                                       rollback_record_feedback
 *                                       rollback_evaluate
 *                                       rollback_execute
 *                                       rollback_rearm
 *                                       rollback_is_latched
 *                                       rollback_list_feedback
 *                                       rollback_list_executions
 *                                       rollback_get_stats
 *                                       rollback_clear_all
 *
 *   MultiSpindleAutomaticEngine      → spindle_assign_stations
 *                                       spindle_analyze_cycle_balance
 *                                       spindle_decide_tooling
 *                                       spindle_optimize_index
 *                                       spindle_analyze_production
 *                                       spindle_plan_backworking
 *
 *   MultiTurretSyncEngine            → turret_plan_simultaneous_cuts
 *                                       turret_analyze_collisions
 *                                       turret_generate_sync_codes
 *                                       turret_analyze_balanced_cuts
 *                                       turret_optimize_cycle_time
 *
 *   MultiCamStrategyEngine           → cam_strategy_execute_action
 *
 * @module schemas/multiActionSchemas
 * @milestone PSN-SYNERGY / MULTI-WIRING (batch 4, slot oscar)
 */

import { z } from "zod";

// ─── Shared ───────────────────────────────────────────────────────────────────

export const EmptyInputSchema = z.object({}).describe("No parameters required");

// ─── MultiAgentCoordinatorEngine ─────────────────────────────────────────────

const AgentTypeSchema = z.enum([
  "physics", "optimization", "quality", "safety",
  "tribal", "planning", "materials", "tooling", "cam", "costing",
]).describe("Agent specialization type");

const CoordinationPatternSchema = z.enum([
  "parallel", "sequential", "consensus", "hierarchical",
]).describe("How agents are coordinated");

const AgentTaskSchema = z.object({
  task_id: z.string().describe("Unique task identifier"),
  description: z.string().describe("Human-readable task description"),
  input: z.record(z.string(), z.unknown()).describe("Task input data"),
  required_capabilities: z.array(z.string()).describe("Capabilities agents must have"),
  timeout_ms: z.number().optional().describe("Per-agent timeout (ms)"),
  priority: z.enum(["low", "medium", "high", "critical"]).describe("Task priority"),
});

export const CoordinatorCoordinateSchema = z.object({
  request_id: z.string().describe("Unique coordination request ID"),
  task: AgentTaskSchema.describe("Task to coordinate"),
  pattern: CoordinationPatternSchema,
  required_agents: z.array(AgentTypeSchema).optional().describe("Force specific agent types"),
  consensus_threshold: z.number().min(0).max(1).optional().describe("Min consensus score (0-1)"),
  timeout_ms: z.number().optional().describe("Total coordination timeout (ms)"),
  context: z.record(z.string(), z.unknown()).optional().describe("Shared context passed to agents"),
});

export const CoordinatorGetAgentByTypeSchema = z.object({
  type: AgentTypeSchema,
});

export const CoordinatorGetAgentsWithCapabilitySchema = z.object({
  capability: z.string().describe("Capability name to filter by (e.g. kienzle_force)"),
});

export const CoordinatorGenerateReasoningSchema = z.object({
  result: z.record(z.string(), z.unknown()).describe("CoordinationResult object from coordinator_coordinate"),
});

// ─── MultiCamKnowledgeEngine ─────────────────────────────────────────────────

const CamSystemSchema = z.enum([
  "mastercam", "hypermill", "solidworks_cam", "fusion360",
  "inventor", "haas_visual", "hurco_winmax", "okuma_advanced_oneface",
]).describe("CAM/CAD system identifier");

export const CamKnowledgeGetArchiveSchema = z.object({
  system: CamSystemSchema,
});

export const CamKnowledgeQuerySchema = z.object({
  system: CamSystemSchema.optional(),
  supports_offline: z.boolean().optional().describe("Filter: offline extraction supported"),
  min_count: z.number().int().optional().describe("Minimum file count to include"),
});

export const CamKnowledgeExtractionRoutingSchema = z.object({
  system: CamSystemSchema,
});

// ─── MultiObjectiveParetoEngine ──────────────────────────────────────────────

const ObjectiveSpecSchema = z.object({
  name: z.string().describe("Objective name: cycle_time | surface_finish | tool_life | cost | power | mrr | force"),
  minimize: z.boolean().describe("True = minimize, False = maximize"),
  weight: z.number().min(0).max(1).describe("Weight for weighted-sum fallback (0-1)"),
  target: z.number().optional().describe("Optional soft target value"),
  hard_limit: z.number().optional().describe("Hard constraint — solutions violating this are infeasible"),
});

export const ParetoComputeSchema = z.object({
  objectives: z.array(ObjectiveSpecSchema).min(2).describe("At least 2 objectives"),
  parameter_bounds: z.object({
    spindle_rpm: z.tuple([z.number(), z.number()]).describe("[min, max] spindle RPM"),
    feed_per_tooth_mm: z.tuple([z.number(), z.number()]).describe("[min, max] feed per tooth (mm)"),
    axial_depth_mm: z.tuple([z.number(), z.number()]).describe("[min, max] axial depth (mm)"),
    radial_depth_mm: z.tuple([z.number(), z.number()]).describe("[min, max] radial depth (mm)"),
  }),
  fixed: z.object({
    tool_diameter_mm: z.number().describe("Tool diameter (mm)"),
    flute_count: z.number().int().describe("Number of flutes"),
    material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
    cutting_speed_range_m_min: z.tuple([z.number(), z.number()]).optional(),
    geometry_volume_cm3: z.number().optional().describe("Part volume to remove (cm³)"),
  }),
  machine: z.object({
    max_power_kw: z.number().describe("Machine max power (kW)"),
    max_rpm: z.number().describe("Machine max spindle RPM"),
  }),
  grid_resolution: z.number().int().min(2).max(20).optional().describe("Grid points per dimension (default 8)"),
});

// ─── MultiPathReasoningEngine ─────────────────────────────────────────────────

const ManufacturingDomainSchema = z.enum([
  "machining", "tooling", "material", "quality",
  "safety", "cost", "scheduling", "maintenance",
]).describe("Manufacturing problem domain");

const GenerationStrategySchema = z.enum([
  "breadth_first", "best_first", "beam_search", "monte_carlo",
]).describe("Path generation strategy");

const ScoreWeightsSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  safety: z.number().min(0).max(1).optional(),
  cost: z.number().min(0).max(1).optional(),
  feasibility: z.number().min(0).max(1).optional(),
  complexity: z.number().min(0).max(1).optional(),
});

export const PathExploreSchema = z.object({
  problem: z.string().describe("Problem description"),
  goal: z.string().describe("Desired outcome"),
  domain: ManufacturingDomainSchema,
  constraints: z.array(z.string()).optional().describe("Physical or business constraints"),
  known_facts: z.array(z.string()).optional().describe("Known facts about the situation"),
  maxPaths: z.number().int().optional().describe("Max reasoning paths to generate (default 5)"),
  maxDepth: z.number().int().optional().describe("Max exploration depth (default 3)"),
  beamWidth: z.number().int().optional().describe("Beam search width (default 3)"),
  pruneThreshold: z.number().min(0).max(1).optional().describe("Prune paths scoring below this (default 0.3)"),
  strategy: GenerationStrategySchema.optional(),
  scoreWeights: ScoreWeightsSchema.optional(),
  timeoutMs: z.number().optional().describe("Exploration timeout (ms)"),
  approaches: z.array(z.string()).optional().describe("Force specific approach names"),
});

export const PathCompareApproachesSchema = z.object({
  problem: z.string(),
  goal: z.string(),
  domain: ManufacturingDomainSchema,
  constraints: z.array(z.string()).optional(),
  known_facts: z.array(z.string()).optional(),
  approach1: z.string().describe("First approach name"),
  approach2: z.string().describe("Second approach name"),
});

export const PathGetAvailableApproachesSchema = z.object({
  domain: ManufacturingDomainSchema,
});

export const PathSensitivityAnalysisSchema = z.object({
  problem: z.string(),
  goal: z.string(),
  domain: ManufacturingDomainSchema,
  constraints: z.array(z.string()).optional(),
  known_facts: z.array(z.string()).optional(),
  dimension: z.enum(["confidence", "safety", "cost", "feasibility", "complexity"])
    .describe("Score weight dimension to vary"),
});

// ─── MultiSetupFeasibilityChainEngine ─────────────────────────────────────────

const MSFeatureSchema = z.object({
  id: z.string(),
  type: z.string().describe("Feature type (e.g. pocket, hole, face)"),
  dimensions: z.object({
    x: z.number().describe("X extent (mm)"),
    y: z.number().describe("Y extent (mm)"),
    z: z.number().describe("Z depth (mm)"),
  }),
  tolerance: z.number().describe("Feature tolerance (mm)"),
  requires_access_from: z.array(z.string()).describe("Required access faces (e.g. top, front, left)"),
  depends_on: z.array(z.string()).optional().describe("Feature IDs that must be machined first"),
  surface_finish_ra: z.number().optional(),
  blocks_access_to: z.array(z.string()).optional(),
  setup_options: z.array(z.string()).optional(),
  priority: z.number().optional(),
});

const MSSetupSchema = z.object({
  id: z.string(),
  orientation: z.string().describe("Setup orientation description"),
  workholding: z.string(),
  accessible_faces: z.array(z.string()),
});

const MSToolSchema = z.object({
  diameter: z.number().describe("Tool diameter (mm)"),
  length: z.number().describe("Tool usable length (mm)"),
  type: z.string(),
  holder_diameter: z.number().optional(),
});

export const SetupAnalyzeFeasibilitySchema = z.object({
  features: z.array(MSFeatureSchema).min(1),
  available_setups: z.array(MSSetupSchema).min(1),
  tools: z.array(MSToolSchema).min(1),
  machine: z.object({
    x_travel: z.number(),
    y_travel: z.number(),
    z_travel: z.number(),
  }).optional(),
});

export const SetupCheckDatumChainSchema = z.object({
  setups: z.array(z.object({
    datum_features: z.array(z.string()),
    positioning_error_mm: z.number().describe("Setup positioning error (mm)"),
    repeatability_mm: z.number().describe("Fixture repeatability (mm)"),
  })).min(1),
  critical_tolerance: z.number().describe("Tightest tolerance in the part (mm)"),
});

export const SetupFindOptimalSequenceSchema = z.object({
  features: z.array(z.object({
    id: z.string(),
    setup_options: z.array(z.string()),
    priority: z.number().optional(),
  })).min(1),
  constraints: z.array(z.object({
    before: z.string().describe("Feature ID that must be machined first"),
    after: z.string().describe("Feature ID that must be machined second"),
  })),
  optimization: z.enum(["min_setups", "min_tool_changes", "min_datum_error"]),
});

export const SetupDetectDeadEndsSchema = z.object({
  features: z.array(z.object({
    id: z.string(),
    depends_on: z.array(z.string()).optional(),
    blocks_access_to: z.array(z.string()).optional(),
  })).min(1),
});

// ─── MultiSignalAutoRollbackEngine ────────────────────────────────────────────

export const RollbackSetConfigSchema = z.object({
  thumbs_down_window: z.number().int().optional().describe("Trailing window for thumbs-down rate (default 20)"),
  thumbs_down_max_rate: z.number().min(0).max(1).optional().describe("Max thumbs-down rate (default 0.15)"),
  error_rate_window_ms: z.number().optional().describe("Error rate window (ms, default 300000)"),
  error_rate_max: z.number().min(0).max(1).optional().describe("Max error rate (default 0.05)"),
  latency_p95_ms_max: z.number().optional().describe("Max p95 latency (ms, default 3000)"),
  safety_score_min: z.number().min(0).max(1).optional().describe("Min S(x) score (default 0.70)"),
  evt_threshold_quantile: z.number().optional().describe("GPD threshold quantile (default 0.20)"),
  evt_tail_p_value: z.number().optional().describe("EVT tail p-value trigger (default 0.01)"),
  evt_min_samples: z.number().int().optional().describe("Min samples for EVT (default 30)"),
  rollback_sla_ms: z.number().optional().describe("Rollback SLA (ms, default 60000)"),
});

export const RollbackSetFallbackSchema = z.object({
  artifact_id: z.string().describe("Active artifact ID"),
  fallback_id: z.string().describe("Last-known-good artifact ID to rollback to"),
});

export const RollbackGetFallbackSchema = z.object({
  artifact_id: z.string(),
});

const ProgramFeedbackSchema = z.object({
  program_id: z.string(),
  artifact_id: z.string(),
  timestamp: z.number().describe("Unix ms timestamp"),
  thumbs_up: z.boolean(),
  error: z.boolean(),
  latency_ms: z.number().min(0),
  safety_score: z.number().min(0).max(1).describe("S(x) from SafetyEngine"),
  physics_validity: z.number().min(0).max(1).optional(),
});

export const RollbackRecordFeedbackSchema = z.object({
  feedback: ProgramFeedbackSchema,
  now: z.number().optional().describe("Override current timestamp (ms) for testing"),
});

export const RollbackEvaluateSchema = z.object({
  artifact_id: z.string(),
  now: z.number().describe("Current timestamp (ms)"),
});

export const RollbackExecuteSchema = z.object({
  trigger: z.record(z.string(), z.unknown()).describe("RollbackTrigger object from rollback_evaluate or rollback_record_feedback"),
  initiated_at: z.number().describe("Unix ms when rollback initiated"),
  completed_at: z.number().describe("Unix ms when rollback completed"),
  outcome: z.enum(["success", "partial", "failed"]).optional(),
  to_artifact: z.string().optional().describe("Target artifact ID (overrides registered fallback)"),
  notes: z.string().optional(),
});

export const RollbackRearmSchema = z.object({
  artifact_id: z.string().describe("Artifact to re-arm after incident closeout"),
});

export const RollbackIsLatchedSchema = z.object({
  artifact_id: z.string(),
});

export const RollbackListFeedbackSchema = z.object({
  artifact_id: z.string().optional().describe("Filter by artifact ID (omit = all)"),
});

export const RollbackListExecutionsSchema = z.object({
  artifact_id: z.string().optional().describe("Filter by artifact ID (omit = all)"),
});

// ─── MultiSpindleAutomaticEngine ─────────────────────────────────────────────

const MultiSpindleMachineConfigSchema = z.object({
  machineId: z.string(),
  manufacturer: z.enum(["schutte", "index", "tornos", "gildemeister", "wickman", "davenport"]),
  model: z.string(),
  spindleCount: z.union([z.literal(6), z.literal(8)]),
  maxBarDiameter_mm: z.number(),
  maxPartLength_mm: z.number(),
  indexTime_seconds: z.number(),
  hasPickoffSpindle: z.boolean(),
  pickoffStations: z.number().int().optional(),
  crossSlideCount: z.number().int(),
  endWorkingCount: z.number().int(),
  hasBackworking: z.boolean(),
  coolantType: z.enum(["oil", "water_soluble"]),
  maxSpindleRpm: z.number(),
});

const SpindleOperationSchema = z.object({
  operationId: z.string(),
  type: z.enum([
    "od_turn", "face", "groove", "thread", "knurl", "form",
    "drill", "bore", "ream", "tap", "cutoff", "chamfer",
    "cross_drill", "slot", "polygon", "backwork",
  ]),
  cuttingTime_seconds: z.number(),
  toolType: z.string(),
  requiredPrecision: z.enum(["low", "medium", "high"]),
  canShareTool: z.boolean(),
  dependencies: z.array(z.string()),
  position: z.enum(["od", "id", "end", "back"]),
});

const MultiSpindlePartSchema = z.object({
  partId: z.string(),
  barDiameter_mm: z.number(),
  finishedLength_mm: z.number(),
  operations: z.array(SpindleOperationSchema),
  material: z.string(),
  tolerance_class: z.enum(["standard", "precision", "ultra_precision"]),
  annualVolume: z.number(),
  criticalDimensions: z.array(z.object({
    dimensionId: z.string(),
    type: z.enum(["diameter", "length", "thread", "concentricity"]),
    nominal_mm: z.number(),
    tolerance_mm: z.number(),
    affectedOperations: z.array(z.string()),
  })),
});

export const SpindleAssignStationsSchema = z.object({
  part: MultiSpindlePartSchema,
  machine: MultiSpindleMachineConfigSchema,
});

export const SpindleAnalyzeCycleBalanceSchema = z.object({
  assignment: z.record(z.string(), z.unknown()).describe("StationAssignment from spindle_assign_stations"),
  part: MultiSpindlePartSchema,
});

export const SpindleDecideToolingSchema = z.object({
  assignment: z.record(z.string(), z.unknown()).describe("StationAssignment from spindle_assign_stations"),
  part: MultiSpindlePartSchema,
  machine: MultiSpindleMachineConfigSchema,
});

export const SpindleOptimizeIndexSchema = z.object({
  machine: MultiSpindleMachineConfigSchema,
  assignment: z.record(z.string(), z.unknown()).describe("StationAssignment from spindle_assign_stations"),
});

export const SpindleAnalyzeProductionSchema = z.object({
  assignment: z.record(z.string(), z.unknown()).describe("StationAssignment from spindle_assign_stations"),
  part: MultiSpindlePartSchema,
  machine: MultiSpindleMachineConfigSchema,
  laborRate_perHour: z.number().optional().describe("Labor rate $/hr (default 50)"),
  machineRate_perHour: z.number().optional().describe("Machine rate $/hr (default 150)"),
});

export const SpindlePlanBackworkingSchema = z.object({
  part: MultiSpindlePartSchema,
  machine: MultiSpindleMachineConfigSchema,
});

// ─── MultiTurretSyncEngine ────────────────────────────────────────────────────

const TurretSpecSchema = z.object({
  turretId: z.enum(["upper", "lower", "third"]),
  toolStations: z.number().int(),
  hasLiveTooling: z.boolean(),
  maxLiveToolRpm: z.number().optional(),
  hasYAxis: z.boolean(),
  yAxisTravel_mm: z.number().optional(),
  hasBAxis: z.boolean(),
  bAxisRange_deg: z.number().optional(),
  xTravel_mm: z.number(),
  zTravel_mm: z.number(),
  turretType: z.enum(["drum", "disc", "gang"]),
});

const MultiTurretConfigSchema = z.object({
  machineId: z.string(),
  manufacturer: z.enum(["mazak", "okuma", "dmg_mori", "doosan", "nakamura", "miyano"]),
  model: z.string(),
  turrets: z.array(TurretSpecSchema),
  hasSubSpindle: z.boolean(),
  maxMainSpindleRpm: z.number(),
  maxSubSpindleRpm: z.number(),
  maxBarDiameter_mm: z.number(),
  swingOverBed_mm: z.number(),
  turretIndexTime_seconds: z.number(),
});

const TurretOperationSchema = z.object({
  operationId: z.string(),
  type: z.enum([
    "od_rough", "od_finish", "id_rough", "id_finish", "face", "groove",
    "thread", "drill", "bore", "cutoff", "mill", "cross_drill", "chamfer",
  ]),
  preferredTurret: z.enum(["upper", "lower", "third", "any"]).optional(),
  zStart_mm: z.number(),
  zEnd_mm: z.number(),
  diameter_mm: z.number().optional(),
  depth_mm: z.number().optional(),
  cuttingTime_seconds: z.number(),
  requiresSync: z.boolean(),
  syncDependency: z.string().optional(),
});

const MultiTurretPartSchema = z.object({
  partId: z.string(),
  stockDiameter_mm: z.number(),
  finishedLength_mm: z.number(),
  operations: z.array(TurretOperationSchema),
  material: z.string(),
  tolerance_class: z.enum(["standard", "precision", "ultra_precision"]),
  productionVolume: z.number(),
});

export const TurretPlanSimultaneousCutsSchema = z.object({
  part: MultiTurretPartSchema,
  machine: MultiTurretConfigSchema,
});

export const TurretAnalyzeCollisionsSchema = z.object({
  part: MultiTurretPartSchema,
  machine: MultiTurretConfigSchema,
});

export const TurretGenerateSyncCodesSchema = z.object({
  cutPlan: z.record(z.string(), z.unknown()).describe("SimultaneousCutPlan from turret_plan_simultaneous_cuts"),
  machine: MultiTurretConfigSchema,
  part: MultiTurretPartSchema,
});

export const TurretAnalyzeBalancedCutsSchema = z.object({
  part: MultiTurretPartSchema,
  machine: MultiTurretConfigSchema,
});

export const TurretOptimizeCycleTimeSchema = z.object({
  part: MultiTurretPartSchema,
  machine: MultiTurretConfigSchema,
});

// ─── MultiCamStrategyEngine ───────────────────────────────────────────────────

export const CamStrategyExecuteActionSchema = z.object({
  action: z.string().describe("Action string forwarded to MultiCamStrategyEngine.executeAction()"),
  params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
});
