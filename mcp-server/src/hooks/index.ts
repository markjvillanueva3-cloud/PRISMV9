/**
 * PRISM MCP Server - Hooks Index (COMPLETE)
 * D1.2 Enhancement: Agent + Orchestration Hooks Added
 * 
 * Central export point for ALL hook modules.
 * 
 * HOOK INVENTORY:
 * - EnforcementHooks: 18 hooks (anti-regression, safety, quality gates, skill quality)
 * - LifecycleHooks: 14 hooks (session, checkpoint, context pressure)
 * - ManufacturingHooks: 9 hooks (force, thermal, deflection, MRR)
 * - CognitiveHooks: 10 hooks (Bayesian, patterns, learning)
 * - ObservabilityHooks: 11 hooks (performance, usage, audit)
 * - AutomationHooks: 12 hooks (indexing, cache, backup, sync)
 * - CrossReferenceHooks: 12 hooks (integrity, compatibility, batch)
 * - AdvancedManufacturingHooks: 8 hooks (chip, chatter, power, G-code)
 * - RecoveryHooks: 10 hooks (circuit breaker, retry, rollback)
 * - SchemaHooks: 7 hooks (version, deprecation, migration)
 * - ControllerHooks: 5 hooks (FANUC, SIEMENS, HAAS specific)
 * - AgentHooks: 7 hooks (tier selection, cost, escalation, safety)
 * - OrchestrationHooks: 7 hooks (swarm patterns, pipeline, consensus, ATCS bridge)
 * 
 * TOTAL: 130 hooks across 13 categories
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
export * from "./hookBridge.js";

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
  ...specialtyCadences
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
  specialtyCadence: specialtyCadences
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

console.log(`[Hooks] Loaded ${allHooks.length} hooks across ${Object.keys(hookCounts).length - 1} categories`);
console.log(`[Hooks] Critical: ${getCriticalHooks().length}, Blocking: ${getBlockingHooks().length}, Safety: ${getSafetyHooks().length}`);
