/**
 * PRISM MCP Server - Hooks Index (COMPLETE)
 * D1.2 Enhancement: Agent + Orchestration Hooks Added
 * 
 * Central export point for ALL hook modules.
 * 
 * HOOK INVENTORY:
 * - EnforcementHooks: 17 hooks (anti-regression, safety, quality gates, skill quality)
 * - LifecycleHooks: 14 hooks (session, checkpoint, context pressure)
 * - ManufacturingHooks: 9 hooks (force, thermal, deflection, MRR)
 * - CognitiveHooks: 10 hooks (Bayesian, patterns, learning)
 * - ObservabilityHooks: 11 hooks (performance, usage, audit)
 * - AutomationHooks: 11 hooks (indexing, cache, backup, sync)
 * - CrossReferenceHooks: 12 hooks (integrity, compatibility, batch)
 * - AdvancedManufacturingHooks: 8 hooks (chip, chatter, power, G-code)
 * - RecoveryHooks: 9 hooks (circuit breaker, retry, rollback)
 * - SchemaHooks: 7 hooks (version, deprecation, migration)
 * - ControllerHooks: 5 hooks (FANUC, SIEMENS, HAAS specific)
 * - AgentHooks: 7 hooks (tier selection, cost, escalation, safety)
 * - OrchestrationHooks: 7 hooks (swarm patterns, pipeline, consensus, ATCS bridge)
 * - SafetyQualityHooks: 20 hooks (spindle, collision, workholding, SPC)
 * - CadenceHooks: 6 hooks (daily, weekly, hourly, shift, monthly, quarterly)
 * - SpecialtyManufacturingHooks: 20 hooks (turning, 5-axis, EDM, grinding)
 * - SpecialtyCadences: 6 hooks (M97-M102 automation cadences)
 *
 * TOTAL: see `hookCounts.total` (computed at module init from spread arrays — never hardcoded).
 * Past snapshot for context only: 220 hooks across 17 categories at v3.0.0 (2026-02).
 *
 * @version 3.0.0
 * @author PRISM Development Team
 */

// ============================================================================
// CORE HOOK MODULES
// ============================================================================

import { enforcementHooks } from "./EnforcementHooks.js";
import { lifecycleHooks } from "./LifecycleHooks.js";
import { manufacturingHooks } from "./ManufacturingHooks.js";
import { cognitiveHooks } from "./CognitiveHooks.js";
import { observabilityHooks } from "./ObservabilityHooks.js";
import { automationHooks } from "./AutomationHooks.js";

// ============================================================================
// ENHANCED HOOK MODULES
// ============================================================================

import { crossReferenceHooks } from "./CrossReferenceHooks.js";
import { advancedManufacturingHooks } from "./AdvancedManufacturingHooks.js";
import { recoveryHooks } from "./RecoveryHooks.js";
import { schemaHooks } from "./SchemaHooks.js";
import { controllerHooks } from "./ControllerHooks.js";
import { agentHooks } from "./AgentHooks.js";
import { orchestrationHooks } from "./OrchestrationHooks.js";
import { safetyQualityHooks } from "./SafetyQualityHooks.js";
import { cadenceHooks } from "./CadenceDefinitions.js";
import { specialtyManufacturingHooks } from "./SpecialtyManufacturingHooks.js";
import { specialtyCadences } from "./SpecialtyCadences.js";
import { forgeTripleHooks } from "./ForgeTripleHooks.js";
import { hyperMillMillTurnHooks } from "./HyperMillMillTurnHooks.js";
import { hyperMillDataFreshnessHooks } from "./HyperMillDataFreshnessHook.js";
import { resourceWatcherHooks } from "./ResourceWatcherHook.js";
import { knowledgeHooks } from "./KnowledgeHooks.js";
import { wedmSafetyHooks } from "./WEDMSafetyHooks.js";
import { wedmSVIHooks } from "./WEDMSVIHooks.js";
import { wedmPerceptionHooks } from "./WEDMPerceptionHooks.js";
import { wedmLearningHooks } from "./WEDMLearningHooks.js";
import { wedmCoordinationHooks } from "./WEDMCoordinationHooks.js";
import { machineValidationHooks } from "./MachineValidationHooks.js";
import { CAD_REGRESSION_SAFETY_HOOKS } from "./CADRegressionSafetyHooks.js";

// ============================================================================
// RE-EXPORT INDIVIDUAL HOOKS
// ============================================================================

export * from "./EnforcementHooks.js";
export * from "./LifecycleHooks.js";
export * from "./ManufacturingHooks.js";
export * from "./CognitiveHooks.js";
export * from "./ObservabilityHooks.js";
export * from "./AutomationHooks.js";
export * from "./CrossReferenceHooks.js";
export * from "./AdvancedManufacturingHooks.js";
export * from "./RecoveryHooks.js";
export * from "./SchemaHooks.js";
export * from "./ControllerHooks.js";
export * from "./AgentHooks.js";
export * from "./OrchestrationHooks.js";
export * from "./SafetyQualityHooks.js";
export * from "./CadenceDefinitions.js";
export * from "./SpecialtyManufacturingHooks.js";
export * from "./SpecialtyCadences.js";
export * from "./ForgeTripleHooks.js";
export * from "./HyperMillMillTurnHooks.js";
export * from "./HyperMillDataFreshnessHook.js";
export * from "./hookBridge.js";
export * from "./frontendFeatureAuditHook.js";
export * from "./ResourceWatcherHook.js";
export * from "./KnowledgeHooks.js";
export * from "./WEDMPerceptionHooks.js";
export * from "./WEDMLearningHooks.js";
export * from "./MachineValidationHooks.js";

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

/**
 * All hooks combined into a single array
 */
export const allHooks = [
  ...enforcementHooks,
  ...lifecycleHooks,
  ...manufacturingHooks,
  ...cognitiveHooks,
  ...observabilityHooks,
  ...automationHooks,
  ...crossReferenceHooks,
  ...advancedManufacturingHooks,
  ...recoveryHooks,
  ...schemaHooks,
  ...controllerHooks,
  ...agentHooks,
  ...orchestrationHooks,
  ...safetyQualityHooks,
  ...cadenceHooks,
  ...specialtyManufacturingHooks,
  ...specialtyCadences,
  ...hyperMillMillTurnHooks,        // HM-REV-MS7: CSS limit + biomedical validation
  ...hyperMillDataFreshnessHooks,   // HM-REV-MS8: data freshness warning
  ...resourceWatcherHooks,          // KAR-MS1: Resource file watcher
  ...knowledgeHooks,                // KAR-MS1: Knowledge wiring + validation
  ...wedmSafetyHooks,               // PP-0.3: 16 WEDM safety hooks
  ...wedmSVIHooks,                  // PP-0.10: 2 WEDM SVI coupling hooks
  ...wedmPerceptionHooks,           // WEDM-AGI P1-MS1: sensor anomaly + twin sync
  ...wedmLearningHooks,             // WEDM-AGI P3-MS1: learning trigger + drift alert
  ...wedmCoordinationHooks,         // MS-P0.5-COORD U-01: awareness coverage gate
  ...machineValidationHooks,        // MCAT-MS0/U-MCAT08: 5 machine safety hooks
  ...CAD_REGRESSION_SAFETY_HOOKS,   // CAD-INFRA-MS0/U-CINF13: 7 CAD regression safety hooks (3 blocking + 2 warning + 2 logging)
];

/**
 * Hook counts by category
 */
export const hookCounts = {
  enforcement: enforcementHooks.length,
  lifecycle: lifecycleHooks.length,
  manufacturing: manufacturingHooks.length,
  cognitive: cognitiveHooks.length,
  observability: observabilityHooks.length,
  automation: automationHooks.length,
  crossReference: crossReferenceHooks.length,
  advancedManufacturing: advancedManufacturingHooks.length,
  recovery: recoveryHooks.length,
  schema: schemaHooks.length,
  controller: controllerHooks.length,
  agent: agentHooks.length,
  orchestration: orchestrationHooks.length,
  safetyQuality: safetyQualityHooks.length,
  cadence: cadenceHooks.length,
  specialtyManufacturing: specialtyManufacturingHooks.length,
  specialtyCadence: specialtyCadences.length,
  hyperMillMillTurn: hyperMillMillTurnHooks.length,          // HM-REV-MS7
  hyperMillDataFreshness: hyperMillDataFreshnessHooks.length, // HM-REV-MS8
  resourceWatcher: resourceWatcherHooks.length,              // KAR-MS1
  knowledge: knowledgeHooks.length,                          // KAR-MS1
  wedmSafety: wedmSafetyHooks.length,                        // PP-0.3
  wedmSVI: wedmSVIHooks.length,                              // PP-0.10
  wedmPerception: wedmPerceptionHooks.length,                // WEDM-AGI P1-MS1
  wedmLearning: wedmLearningHooks.length,                    // WEDM-AGI P3-MS1
  machineValidation: machineValidationHooks.length,          // MCAT-MS0/U-MCAT08
  cadRegressionSafety: CAD_REGRESSION_SAFETY_HOOKS.length,   // CAD-INFRA-MS0/U-CINF13
  total: 0 // Computed below
};

hookCounts.total = Object.values(hookCounts).reduce((a, b) => a + b, 0) - hookCounts.total;

/**
 * Hook arrays by category
 */
export const hooksByCategory = {
  enforcement: enforcementHooks,
  lifecycle: lifecycleHooks,
  manufacturing: manufacturingHooks,
  cognitive: cognitiveHooks,
  observability: observabilityHooks,
  automation: automationHooks,
  crossReference: crossReferenceHooks,
  advancedManufacturing: advancedManufacturingHooks,
  recovery: recoveryHooks,
  schema: schemaHooks,
  controller: controllerHooks,
  agent: agentHooks,
  orchestration: orchestrationHooks,
  safetyQuality: safetyQualityHooks,
  cadence: cadenceHooks,
  specialtyManufacturing: specialtyManufacturingHooks,
  specialtyCadence: specialtyCadences,
  forgeTriple: forgeTripleHooks,
  machineValidation: machineValidationHooks,
  cadRegressionSafety: CAD_REGRESSION_SAFETY_HOOKS,   // CAD-INFRA-MS0/U-CINF13
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

import { HookDefinition } from "../engines/HookExecutor.js";

/**
 * Get hooks by category name
 */
export function getHooksByCategory(category: string): HookDefinition[] {
  const categoryMap: Record<string, HookDefinition[]> = {
    enforcement: enforcementHooks,
    lifecycle: lifecycleHooks,
    manufacturing: manufacturingHooks,
    cognitive: cognitiveHooks,
    observability: observabilityHooks,
    automation: automationHooks,
    crossReference: crossReferenceHooks,
    "cross-reference": crossReferenceHooks,
    advancedManufacturing: advancedManufacturingHooks,
    "advanced-manufacturing": advancedManufacturingHooks,
    recovery: recoveryHooks,
    schema: schemaHooks,
    controller: controllerHooks,
    agent: agentHooks,
    orchestration: orchestrationHooks,
    safetyQuality: safetyQualityHooks,
    "safety-quality": safetyQualityHooks,
    cadence: cadenceHooks,
    specialtyManufacturing: specialtyManufacturingHooks,
    "specialty-manufacturing": specialtyManufacturingHooks,
    specialtyCadence: specialtyCadences,
    "specialty-cadence": specialtyCadences,
    cadRegressionSafety: CAD_REGRESSION_SAFETY_HOOKS,
    "cad-regression-safety": CAD_REGRESSION_SAFETY_HOOKS,
    "cadregression-safety": CAD_REGRESSION_SAFETY_HOOKS,
    validation: [...enforcementHooks, ...schemaHooks].filter(h => h.category === "validation" || h.tags?.includes("validation"))
  };
  
  return categoryMap[category] || [];
}

/**
 * Get all critical hooks (priority = "critical")
 */
export function getCriticalHooks(): HookDefinition[] {
  return allHooks.filter(h => h.priority === "critical");
}

/**
 * Get all safety-related hooks
 */
export function getSafetyHooks(): HookDefinition[] {
  return allHooks.filter(h => 
    h.tags?.includes("safety") || 
    h.id.includes("safety") ||
    h.category === "manufacturing"
  );
}

/**
 * Get all anti-regression hooks
 */
export function getAntiRegressionHooks(): HookDefinition[] {
  return allHooks.filter(h => 
    h.tags?.includes("anti-regression") || 
    h.id.includes("antiregression") ||
    h.id.includes("anti-regression")
  );
}

/**
 * Get hooks by phase
 */
export function getHooksByPhase(phase: string): HookDefinition[] {
  return allHooks.filter(h => h.phase === phase);
}

/**
 * Get hooks by tag
 */
export function getHooksByTag(tag: string): HookDefinition[] {
  return allHooks.filter(h => h.tags?.includes(tag));
}

/**
 * Get hooks for controller family
 */
export function getHooksForController(controller: string): HookDefinition[] {
  const lowerController = controller.toLowerCase();
  return allHooks.filter(h => 
    h.tags?.includes(lowerController) ||
    h.id.includes(lowerController)
  );
}

/**
 * Get blocking hooks only
 */
export function getBlockingHooks(): HookDefinition[] {
  return allHooks.filter(h => h.mode === "blocking");
}

/**
 * Get hook system summary
 */
export function getHookSystemSummary() {
  const byPriority = {
    critical: allHooks.filter(h => h.priority === "critical").length,
    high: allHooks.filter(h => h.priority === "high").length,
    normal: allHooks.filter(h => h.priority === "normal").length,
    low: allHooks.filter(h => h.priority === "low").length,
    background: allHooks.filter(h => h.priority === "background").length
  };
  
  const byMode = {
    blocking: allHooks.filter(h => h.mode === "blocking").length,
    warning: allHooks.filter(h => h.mode === "warning").length,
    logging: allHooks.filter(h => h.mode === "logging").length,
    silent: allHooks.filter(h => h.mode === "silent").length
  };
  
  const byPhase: Record<string, number> = {};
  for (const hook of allHooks) {
    byPhase[hook.phase] = (byPhase[hook.phase] || 0) + 1;
  }
  
  return {
    totalHooks: allHooks.length,
    categories: hookCounts,
    byPriority,
    byMode,
    byPhase,
    criticalBlockingHooks: allHooks.filter(h => h.priority === "critical" && h.mode === "blocking").length,
    safetyHooks: getSafetyHooks().length,
    antiRegressionHooks: getAntiRegressionHooks().length
  };
}

// ============================================================================
// CATEGORY DESCRIPTIONS
// ============================================================================

export const categoryDescriptions = {
  enforcement: "Anti-regression, safety gates, quality gates, validation - BLOCKS bad data",
  lifecycle: "Session management, checkpoints, context pressure, compaction handling",
  manufacturing: "Force limits, thermal limits, deflection, MRR, tool life - PHYSICAL SAFETY",
  cognitive: "Bayesian inference, pattern detection, anomaly detection, learning",
  observability: "Performance tracking, usage analytics, error logging, audit trails",
  automation: "Auto-indexing, cache management, backup creation, sync operations",
  crossReference: "Referential integrity, compatibility matrices, batch operations",
  advancedManufacturing: "Chip breaking, chatter/stability, power/torque, G-code safety",
  recovery: "Circuit breakers, retry logic, rollback, graceful degradation",
  schema: "Schema versions, field deprecation, migration safety, format validation",
  controller: "FANUC/SIEMENS/HAAS/MAZAK specific validation",
  agent: "Agent tier selection, cost control, escalation, performance tracking, safety auto-escalation",
  orchestration: "Swarm pattern validation, pipeline quality gates, consensus integrity, ATCS bridge",
  safetyQuality: "Safety gates (5 blocking), quality gates (4), business hooks (4), system hooks (7) — L4-P0",
  cadence: "Scheduled hooks: daily tool wear, weekly maintenance, hourly health, shift handoff, monthly cost, quarterly calibration",
  specialtyManufacturing: "20 PASS2 specialty hooks: 6 blocking (singularity, RTCP, envelope, crush, live tool, reach) + 14 warning (turning, EDM, grinding, finishing, quality)",
  specialtyCadence: "6 PASS2 cadences: FRF matching, tolerance risk scoring, operator skill match, tool standardization, machine utilization, NCR trending"
};

// ============================================================================
// LOGGING
// ============================================================================

console.error(`[Hooks] Loaded ${allHooks.length} hooks across ${Object.keys(hookCounts).length - 1} categories`);
console.error(`[Hooks] Critical: ${getCriticalHooks().length}, Blocking: ${getBlockingHooks().length}, Safety: ${getSafetyHooks().length}`);
