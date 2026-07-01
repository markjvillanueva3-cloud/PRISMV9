/**
 * Risk Tier Classification for PRISM Dispatchers
 * ================================================
 * Classifies each dispatcher by the risk level of its actions.
 * Used for permission gating, audit logging, and UI safety indicators.
 *
 * Inspired by clean-room analysis of tool permission patterns in
 * agentic coding tools — implements our own classification scheme
 * tailored to manufacturing safety.
 *
 * @module types/RiskTier
 * @version 1.0.0
 */

/**
 * Risk tiers for dispatcher actions:
 * - READ_ONLY: Data lookups, searches, calculations — no side effects
 * - COMPUTE: Physics calculations that inform decisions — no mutations
 * - MUTATE: State changes (session, memory, config) — reversible
 * - GENERATE: Code/program generation — review before use
 * - EXECUTE: Live machine commands, file writes — potentially destructive
 */
export enum RiskTier {
  READ_ONLY = "READ_ONLY",
  COMPUTE = "COMPUTE",
  MUTATE = "MUTATE",
  GENERATE = "GENERATE",
  EXECUTE = "EXECUTE",
}

/** MCP tool annotation derived from risk tier */
export interface ToolAnnotation {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/** Map risk tier to MCP tool annotations */
export function riskTierToAnnotation(tier: RiskTier): ToolAnnotation {
  switch (tier) {
    case RiskTier.READ_ONLY:
      return { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
    case RiskTier.COMPUTE:
      return { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
    case RiskTier.MUTATE:
      return { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
    case RiskTier.GENERATE:
      return { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
    case RiskTier.EXECUTE:
      return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
  }
}

/**
 * Dispatcher → Risk Tier registry.
 * Every prism_* dispatcher is classified. New dispatchers default to MUTATE (safe middle ground).
 */
export const DISPATCHER_RISK_TIERS: Record<string, RiskTier> = {
  // === READ_ONLY: Pure lookups, no side effects ===
  prism_data:               RiskTier.READ_ONLY,
  prism_knowledge:          RiskTier.READ_ONLY,
  prism_knowledge_ext:      RiskTier.READ_ONLY,
  prism_doc_learn:          RiskTier.READ_ONLY,
  prism_thread:             RiskTier.READ_ONLY,   // thread specs are lookups
  prism_machining_kb:       RiskTier.READ_ONLY,
  prism_cad_drawing_kb:     RiskTier.READ_ONLY,
  prism_parts:              RiskTier.READ_ONLY,

  // === COMPUTE: Physics calculations, deterministic, no mutations ===
  prism_calc:               RiskTier.COMPUTE,
  prism_safety:             RiskTier.COMPUTE,
  prism_toolpath:           RiskTier.COMPUTE,
  prism_vibration_physics:  RiskTier.COMPUTE,
  prism_fluid_thermal:      RiskTier.COMPUTE,
  prism_mechanical:         RiskTier.COMPUTE,
  prism_scientific_math:    RiskTier.COMPUTE,
  prism_adaptive_control:   RiskTier.COMPUTE,
  prism_validate:           RiskTier.COMPUTE,
  prism_quality:            RiskTier.COMPUTE,
  prism_l2:                 RiskTier.COMPUTE,
  prism_diagnosis:          RiskTier.COMPUTE,
  prism_grinding:           RiskTier.COMPUTE,
  prism_edm:                RiskTier.COMPUTE,
  prism_turning:            RiskTier.COMPUTE,
  prism_5axis:              RiskTier.COMPUTE,
  prism_forming:            RiskTier.COMPUTE,
  prism_welding:            RiskTier.COMPUTE,
  prism_material_processing: RiskTier.COMPUTE,
  prism_secondary_ops:      RiskTier.COMPUTE,

  // === MUTATE: State changes — session, memory, config ===
  prism_session:            RiskTier.MUTATE,
  prism_memory:             RiskTier.MUTATE,
  prism_hook:               RiskTier.MUTATE,
  prism_nl_hook:            RiskTier.MUTATE,
  prism_context:            RiskTier.MUTATE,
  prism_guard:              RiskTier.MUTATE,
  prism_telemetry:          RiskTier.MUTATE,
  prism_pfp:                RiskTier.MUTATE,
  prism_compliance:         RiskTier.MUTATE,
  prism_tenant:             RiskTier.MUTATE,
  prism_monitoring:         RiskTier.MUTATE,
  prism_auth:               RiskTier.MUTATE,
  prism_scheduling:         RiskTier.MUTATE,
  prism_process_control:    RiskTier.MUTATE,
  prism_industry:           RiskTier.MUTATE,
  prism_product:            RiskTier.MUTATE,
  prism_ralph:              RiskTier.MUTATE,
  prism_omega:              RiskTier.MUTATE,
  prism_gsd:                RiskTier.MUTATE,
  prism_sp:                 RiskTier.MUTATE,
  prism_skill_script:       RiskTier.MUTATE,
  prism_shop_practice:      RiskTier.MUTATE,

  // === GENERATE: Code/program output — needs review before use ===
  prism_cam:                RiskTier.GENERATE,
  prism_cad:                RiskTier.GENERATE,
  prism_turning_program:    RiskTier.GENERATE,
  prism_multiaxis_program:  RiskTier.GENERATE,
  prism_hole_pattern:       RiskTier.GENERATE,
  prism_threading_pipeline: RiskTier.GENERATE,
  prism_generator:          RiskTier.GENERATE,
  prism_doc:                RiskTier.GENERATE,
  prism_export:             RiskTier.GENERATE,
  prism_business:           RiskTier.GENERATE,
  prism_multi_op:           RiskTier.GENERATE,
  prism_cnc_ops:            RiskTier.GENERATE,
  prism_machine_setup:      RiskTier.GENERATE,

  // === EXECUTE: Live machine interaction, file I/O, external comms ===
  prism_machine_live:       RiskTier.EXECUTE,
  prism_bridge:             RiskTier.EXECUTE,
  prism_realtime:           RiskTier.EXECUTE,
  prism_integration:        RiskTier.EXECUTE,
  prism_dev:                RiskTier.EXECUTE,
  prism_manus:              RiskTier.EXECUTE,
  prism_automation:         RiskTier.EXECUTE,
  prism_autopilot_d:        RiskTier.EXECUTE,

  // === ORCHESTRATION: Agent/swarm execution — risk depends on sub-actions ===
  prism_orchestrate:        RiskTier.EXECUTE,
  prism_atcs:               RiskTier.EXECUTE,
  prism_autonomous:         RiskTier.EXECUTE,
  prism_intelligence:       RiskTier.EXECUTE,
};

/** Get risk tier for a dispatcher, defaulting to MUTATE for unknown dispatchers */
export function getDispatcherRiskTier(dispatcherName: string): RiskTier {
  return DISPATCHER_RISK_TIERS[dispatcherName] ?? RiskTier.MUTATE;
}
