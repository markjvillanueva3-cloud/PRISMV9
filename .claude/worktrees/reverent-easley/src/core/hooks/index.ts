/**
 * PRISM Hook System - Public API
 * ==============================
 * 
 * 147 hook points across 25 categories:
 * 
 * BASE HOOKS (107):
 * - Session lifecycle (7)
 * - Task lifecycle (10)
 * - Microsession (5)
 * - Database mutations (10)
 * - Material-specific (6)
 * - Physics/Calculation (8)
 * - Formula evolution (8)
 * - Prediction tracking (5)
 * - Agent execution (6)
 * - Swarm orchestration (6)
 * - Ralph Loop (6)
 * - Learning pipeline (7)
 * - Verification chain (5)
 * - Quality gates (4)
 * - Skill loading (4)
 * - Script execution (4)
 * - Plugin/Extension (6)
 * 
 * EXTENDED HOOKS (40) - v1.1:
 * - Transaction (5)
 * - Health/Monitoring (5)
 * - Cache (5)
 * - Circuit Breaker (4)
 * - Rate Limiting (4)
 * - Audit Trail (4)
 * - Feature Flags (4)
 * - MCP Integration (5)
 * - Planning Integration (4)
 * 
 * @module prism/core/hooks
 * @version 1.1.0
 */

// ============================================================================
// BASE TYPES
// ============================================================================
export * from './HookSystem.types';

// ============================================================================
// EXTENDED TYPES (v1.1)
// ============================================================================
export * from './HookSystem.extended';

// ============================================================================
// IMPLEMENTATION
// ============================================================================
export {
  PRISMHookManager,
  getHookManager,
  resetHookManager,
  executeHooks,
  registerHook
} from './HookManager';

// ============================================================================
// COMMONLY USED TYPES
// ============================================================================
export type {
  // Core types
  HookFn,
  HookResult,
  HookContext,
  HookRegistration,
  HookManager,
  PRISMHookRegistry,
  HookPoint,
  // Payload types
  SessionPayload,
  TaskPayload,
  MicrosessionPayload,
  DatabaseMutationPayload,
  MaterialPayload,
  CalculationPayload,
  FormulaPayload,
  PredictionPayload,
  AgentExecutionPayload,
  SwarmPayload,
  RalphLoopPayload,
  LearningPayload,
  VerificationPayload,
  QualityGatePayload,
  SkillPayload,
  ScriptPayload,
  PluginPayload
} from './HookSystem.types';

// Extended payload types (v1.1)
export type {
  TransactionPayload,
  TransactionStepPayload,
  TransactionRollbackPayload,
  TransactionCompletePayload,
  HealthCheckPayload,
  MemoryPressurePayload,
  ResourceAlertPayload,
  SystemHeartbeatPayload,
  CacheOperationPayload,
  CacheHitPayload,
  CacheInvalidatePayload,
  CacheWarmPayload,
  CircuitBreakerPayload,
  CircuitFailurePayload,
  CircuitStateChangePayload,
  CircuitRecoveryPayload,
  RateLimitPayload,
  RateLimitHitPayload,
  QuotaCheckPayload,
  AuditEventPayload,
  ComplianceCheckPayload,
  ChangeLogPayload,
  FeatureFlagPayload,
  FeatureEvaluationPayload,
  FeatureRolloutPayload,
  MCPServerPayload,
  MCPToolCallPayload,
  MCPToolResultPayload,
  MCPConnectionErrorPayload,
  PlanningOverheadPayload,
  EffortAdjustmentPayload
} from './HookSystem.extended';

// ============================================================================
// CONSTANTS
// ============================================================================
export { 
  PRIORITY, 
  HOOK_COUNTS, 
  QUALITY_GATES, 
  SYSTEM_HOOKS 
} from './HookSystem.types';

export {
  EXTENDED_HOOK_COUNTS,
  NEW_COEFFICIENTS
} from './HookSystem.extended';

// ============================================================================
// PLANNING FORMULA UPDATES
// ============================================================================
export type {
  UpdatedEffortFormula,
  UpdatedTimeFormula
} from './HookSystem.extended';
