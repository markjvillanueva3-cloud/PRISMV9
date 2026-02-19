/**
 * PRISM Master Schema — Single Source of Truth
 * ==============================================
 * 
 * ALL shared interfaces live here. Every dispatcher, cadenceExecutor,
 * and autoHookWrapper imports from this file. Schema mismatch = build error.
 * 
 * RULE: If a type is used in more than one file, it MUST be defined here.
 * Local-only types (used in one function) can stay local.
 * 
 * @version 1.1.0
 * @date 2026-02-09
 * @status COMPLETE — All 9 consumer files wired
 * 
 * WIRING STATUS (all ✅):
 *   cadenceExecutor.ts      → 15+ cadence result types
 *   contextDispatcher.ts    → TodoState, TodoStep, isStepDone, getStepLabel
 *   autoHookWrapper.ts      → HookResult, ToolCallContext, ProofValidation, FactVerify, HookExecution, RecordedAction
 *   guardDispatcher.ts      → HookExecution
 *   sessionDispatcher.ts    → StateEvent
 *   spDispatcher.ts         → CogState, BrainstormConfig, BrainstormResult
 *   omegaDispatcher.ts      → OmegaHistoryEntry
 *   atcsDispatcher.ts       → TaskManifest, WorkUnit, StubScanResult, TaskStatus, UnitStatus
 *   autonomousDispatcher.ts → AutonomousConfig, ExecutionPlan, UnitExecutionResult, AuditEntry
 * 
 * EXPORTS: ~50 types, 3 helpers, 8 constants
 * LINES: 674
 */

// ============================================================================
// CORE STATE — Todo, Session, Checkpoint
// ============================================================================

/** Canonical step shape. Both text+status AND description+complete are supported
 *  via union, but text+status is the PRIMARY format used by callers. */
export interface TodoStep {
  /** Step label (PRIMARY field — use this) */
  text?: string;
  /** Step label (LEGACY alias for text) */
  description?: string;
  /** Step state: 'done' | 'active' | 'pending' (PRIMARY) */
  status?: 'done' | 'active' | 'pending';
  /** Step state (LEGACY alias for status==='done') */
  complete?: boolean;
  /** Unique step ID (optional) */
  id?: number;
}

/** Helper: normalize any TodoStep to canonical form */
export function isStepDone(step: TodoStep): boolean {
  return step.complete === true || step.status === 'done';
}
export function getStepLabel(step: TodoStep, fallback: string = 'Unnamed step'): string {
  return step.text || step.description || fallback;
}

export interface QualityGates {
  S: number | null;
  omega: number | null;
}

export interface TodoState {
  taskName: string;
  sessionId: string;
  currentFocus: string;
  steps: TodoStep[];
  blockingIssues: string[];
  qualityGates: QualityGates;
  recentDecisions: string[];
  nextAction: string;
  lastUpdated: string;
}

// ============================================================================
// CADENCE RESULTS — All auto-fire function return types
// ============================================================================

export interface TodoRefreshResult {
  success: boolean;
  call_number: number;
  todo_preview: string;
  error?: string;
}

export interface CheckpointResult {
  success: boolean;
  call_number: number;
  zone: string;
  checkpoint_id: string | null;
  error?: string;
}

export interface ContextPressureResult {
  success: boolean;
  call_number: number;
  accumulated_bytes: number;
  estimated_tokens: number;
  pressure_pct: number;
  zone: string;
  recommendation: string;
}

export interface CompactionDetectResult {
  success: boolean;
  call_number: number;
  risk_level: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'IMMINENT';
  risk_score: number;
  signals: string[];
  action_required: boolean;
}

export interface ContextCompressResult {
  success: boolean;
  call_number: number;
  snapshot_saved: boolean;
  recommendations: string[];
  bytes_externalizable: number;
}

export interface ErrorLearnResult {
  success: boolean;
  call_number: number;
  error_id: string;
  pattern_matched: boolean;
  pattern_id: string | null;
  prevention: string | null;
  occurrences: number;
}

export interface ReconResult {
  success: boolean;
  call_number: number;
  recent_errors: Array<{ tool: string; type: string; message: string; when: string }>;
  recurring_patterns: Array<{ type: string; domain: string; occurrences: number; prevention: string }>;
  session_context: { session: any; phase: any; last_checkpoint: string | null };
  warnings: string[];
}

export interface QualityGateResult {
  success: boolean;
  call_number: number;
  gate_passed: boolean;
  checks: { safety_verified: boolean; omega_verified: boolean; evidence_level: string };
  blockers: string[];
}

export interface AntiRegressionResult {
  success: boolean;
  passed: boolean;
  old_metrics: CodeMetrics;
  new_metrics: CodeMetrics;
  regressions: string[];
}

export interface CodeMetrics {
  lines: number;
  exports: number;
  functions: number;
}

export interface DecisionCaptureResult {
  success: boolean;
  decision_id: string | null;
  file_changed: string;
  auto_captured: boolean;
}

export interface WarmStartResult {
  success: boolean;
  registry_status: Record<string, number>;
  recent_errors: Array<{ tool: string; type: string; when: string }>;
  top_failures: Array<{ type: string; domain: string; count: number; prevention: string }>;
  session_info: { session: any; phase: any; quick_resume: string };
  roadmap_next: string[];
}

export interface VariationCheckResult {
  success: boolean;
  call_number: number;
  variation_needed: boolean;
  repetitive_patterns: string[];
  recommendation: string;
}

export interface SkillHintResult {
  success: boolean;
  call_number: number;
  hints: string[];
  skill_ids: string[];
  loaded_excerpts: number;
  // D1.4: Bundle-aware fields
  bundle_name?: string;
  bundle_purpose?: string;
  chain_suggestion?: string;
  domain?: string;
  pressure_mode?: string;
  cache_stats?: { cached: number; hits: number; misses: number };
}

export interface KnowledgeCrossQueryResult {
  success: boolean;
  call_number: number;
  domain: string;
  material_hints: string[];
  formula_hints: string[];
  alarm_hints: string[];
  total_enrichments: number;
}

export interface ContextPullBackResult {
  success: boolean;
  call_number: number;
  pressure_pct: number;
  available_files: number;
  pulled_back: string[];
  pulled_back_bytes: number;
  skipped_reason: string | null;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface InputValidationResult {
  success: boolean;
  valid: boolean;
  warnings: ValidationWarning[];
  corrected_params: Record<string, any> | null;
}

export interface ScriptRecommendResult {
  success: boolean;
  call_number: number;
  scripts: Array<{ name: string; description: string; relevance: string }>;
  count: number;
}

// ============================================================================
// COMPACTION SURVIVAL — Cross-compaction state persistence
// ============================================================================

export interface CompactionSurvivalData {
  captured_at: string;
  call_number: number;
  pressure_pct: number;
  current_task: string;
  key_findings: string[];
  active_files: string[];
  recent_decisions: string[];
  recent_actions: string[];
  todo_snapshot: string;
  quick_resume: string;
  session_id: string;
  phase: string;
  next_action: string;
  warnings: string[];
}

// ============================================================================
// HOOK WRAPPER — Tool call tracking and validation
// ============================================================================

export interface HookResult {
  hook_id: string;
  success: boolean;
  data?: any;
  error?: string;
  duration_ms: number;
}

export interface ToolCallContext {
  tool_name: string;
  inputs: Record<string, any>;
  start_time: number;
  result?: any;
  error?: Error;
}

export interface ProofValidationResult {
  is_valid: boolean;
  validity_score: number;
  conclusion?: string;
  issues: string[];
}

export interface FactVerifyResult {
  verdict: 'VERIFIED' | 'LIKELY' | 'UNCERTAIN' | 'DISPUTED' | 'UNVERIFIED';
  confidence: number;
  phi_score: number;
  caveats: string[];
}

export interface HookExecution {
  timestamp: string;
  hook_id: string;
  tool_name: string;
  event: string;
  success: boolean;
  duration_ms: number;
  data?: any;
}

export interface RecordedAction {
  seq: number;
  ts: string;
  tool: string;
  action: string;
  params_summary: string;
  success: boolean;
  duration_ms: number;
  result_preview: string;
  error?: string;
}

// ============================================================================
// CADENCE METADATA — Attached to every dispatcher response
// ============================================================================

export interface CadenceAction {
  call_number: number;
  actions: string[];
}

// ============================================================================
// BUFFER ZONES — Context management thresholds
// ============================================================================

export type BufferZone = 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';

export const BUFFER_THRESHOLDS = {
  GREEN:  { min: 0,  max: 8,  label: '🟢 GREEN',  action: 'Normal operations' },
  YELLOW: { min: 9,  max: 14, label: '🟡 YELLOW', action: 'Plan checkpoint' },
  RED:    { min: 15, max: 18, label: '🔴 RED',    action: 'IMMEDIATE checkpoint' },
  BLACK:  { min: 19, max: 999, label: '⚫ BLACK', action: 'STOP ALL WORK' },
} as const;

export function getBufferZone(callNumber: number): BufferZone {
  if (callNumber >= 19) return 'BLACK';
  if (callNumber >= 15) return 'RED';
  if (callNumber >= 9) return 'YELLOW';
  return 'GREEN';
}

// ============================================================================
// SAFETY & QUALITY CONSTANTS — Non-negotiable thresholds
// ============================================================================

export const SAFETY_THRESHOLD = 0.70;      // S(x) >= 0.70 HARD BLOCK
export const OMEGA_RELEASE = 0.70;         // Ω >= 0.70 for release
export const OMEGA_ACCEPTABLE = 0.65;      // Ω >= 0.65 acceptable
export const OMEGA_WARNING = 0.50;         // Ω >= 0.50 warning
export const OMEGA_BLOCKED = 0.40;         // Ω < 0.40 blocked
export const MAX_TOKENS_ESTIMATE = 150000; // Practical context limit
export const BYTES_PER_TOKEN = 4;          // Conservative estimate
export const SYSTEM_PROMPT_OVERHEAD = 120000; // ~30K tokens system prompt

// ============================================================================
// PYTHON CLI CONTRACTS — What each script expects and returns
// ============================================================================

/**
 * D2 Python Modules (C:\PRISM\scripts\core\)
 * 
 * attention_scorer.py
 *   CLI: --task "text" --content "text" [--json]
 *   Returns: { segments: [{text, score, reason}], overall_score: float }
 * 
 * focus_optimizer.py
 *   CLI: --budget N --items "json_array" [--json]
 *   Returns: { allocations: [{item, priority, budget_pct}], strategy: str }
 * 
 * relevance_filter.py
 *   CLI: --task "text" --file path [--threshold 0.5] [--json]
 *   Returns: { kept: int, dropped: int, items: [{text, score, kept}] }
 * 
 * context_monitor.py
 *   CLI: --tokens N [--max N] [--json]
 *   Returns: { pressure_pct: int, zone: str, recommendation: str }
 * 
 * compaction_detector.py
 *   CLI: --tokens N [--calls N] [--json]
 *   Returns: { risk: str, score: float, signals: [str] }
 * 
 * auto_compress.py
 *   CLI: --tokens N [--json]
 *   Returns: { actions: [str], freed_estimate: int }
 * 
 * context_expander.py
 *   CLI: --tokens N [--json]
 *   Returns: { expanded: bool, reason: str }
 * 
 * D3 Python Modules
 * 
 * pattern_detector.py
 *   CLI: --detect [file] | --list [--json]
 *   Returns: { patterns: [{id, type, confidence, description}] }
 * 
 * learning_store.py
 *   CLI: --stats | --lookup "topic" | --rules | --learn TYPE TRIGGER ACTION EXPLAIN
 *   Returns: { entries: [{type, trigger, action, explain}] } (for lookup)
 * 
 * error_extractor.py
 *   CLI: --log path | --text "error" | --recent [--json]
 *   Returns: { errors: [{message, type, source, severity}] }
 * 
 * lkg_tracker.py
 *   CLI: mark|get|restore|validate|history|compare|auto [--json]
 *   Returns: { status: str, checkpoint?: str, timestamp?: str } | null (no LKG)
 * 
 * priority_scorer.py
 *   CLI: --file path | --content "text" | --target N (int, not string!)
 *   Returns: { score: float, priority: str, factors: [{name, weight}] }
 * 
 * D1 Python Modules
 * 
 * wip_capturer.py
 *   CLI: capture|list|restore [--key str] [--json]
 *   Returns: { captured?: str, items?: [...], restored?: str }
 * 
 * state_rollback.py
 *   CLI: rollback|list|diff [checkpoint_id] [--json]
 *   Returns: { rolled_back?: bool, checkpoints?: [...] }
 * 
 * recovery_scorer.py
 *   CLI: --session str [--json]
 *   Returns: { score: float, factors: [{name, value}], recommendation: str }
 * 
 * checkpoint_mgr.py
 *   CLI: create|list|restore|diff [--metadata json] [--json]
 *   Returns: { checkpoint_id?: str, checkpoints?: [...] }
 */

// ============================================================================
// DISPATCHER PARAM SHAPES — Standardized input for key actions
// ============================================================================

export interface TodoUpdateParams {
  task_name?: string;
  current_focus?: string;
  steps?: TodoStep[];
  next_action?: string;
  blocking_issues?: string[];
  quality_S?: number;
  quality_omega?: number;
}

export interface ContextMonitorParams {
  tokens?: number;
  max_tokens?: number;
}

export interface LkgStatusParams {
  subcommand?: 'mark' | 'get' | 'restore' | 'validate' | 'history' | 'compare' | 'auto';
  checkpoint?: string;
  reason?: string;
}

export interface PatternScanParams {
  file?: string;
  content?: string;
}

export interface LearningSaveParams {
  type: string;
  trigger: string;
  action: string;
  explain: string;
}

export interface PriorityScoreParams {
  file?: string;
  content?: string;
  target?: number;  // MUST be number, not string
}

// ============================================================================
// SESSION DISPATCHER — State event logging
// ============================================================================

export interface StateEvent {
  ts: string;
  type: string;
  session?: number;
  phase?: string;
  data?: any;
}

// ============================================================================
// SP DISPATCHER — Superpowers cognitive state and brainstorm
// ============================================================================

export interface CogState {
  bayes_priors: Record<string, number>;
  opt_objectives: string[];
  rl_policy: Record<string, any>;
  metrics: { R: number; C: number; P: number; S: number; L: number; omega: number };
  decisions: any[];
  errors: any[];
}

export interface BrainstormConfig {
  problem: string;
  context?: Record<string, any>;
  domain?: string;
  depth?: 'quick' | 'standard' | 'deep';
  constraints?: string[];
  max_lenses?: number;
}

export interface BrainstormResult {
  status: string;
  depth: string;
  problem: string;
  domain_context: {
    relevant_skills: Array<{ id: string; name: string; relevance: number }>;
    relevant_formulas: Array<{ id: string; name: string; domain: string }>;
    knowledge_enrichments: number;
    cross_references: string[];
  };
  lenses: Record<string, string[]>;
  synthesis: {
    recommended_approach: string;
    gap_inventory: string[];
    risk_matrix: Array<{ risk: string; likelihood: string; impact: string; mitigation: string }>;
    phased_plan: Array<{ phase: number; name: string; deliverable: string; effort: string }>;
    recommended_tools: string[];
  };
  api_calls_made: number;
  tokens_used: { input: number; output: number };
  next: string;
}

// ============================================================================
// OMEGA DISPATCHER — Quality scoring history
// ============================================================================

export interface OmegaHistoryEntry {
  timestamp: string;
  score: number;
  components: { R: number; C: number; P: number; S: number; L: number };
  status: string;
}

// ============================================================================
// ATCS DISPATCHER — Autonomous Task Completion System
// ============================================================================

export type TaskStatus = 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'VALIDATING' | 'ASSEMBLING' | 'COMPLETE' | 'FAILED';
export type UnitStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'NEEDS_RESEARCH' | 'HALTED' | 'DELEGATED';

export interface TaskManifest {
  task_id: string;
  task_type: string;
  objective: string;
  created: string;
  status: TaskStatus;
  decomposition: {
    strategy: string;
    total_units: number;
    batch_size: number;
    total_batches: number;
    dependency_mode: 'independent' | 'sequential' | 'dag';
    replan_enabled: boolean;
    replan_trigger: string;
  };
  progress: {
    completed_units: number;
    completed_batches: number;
    failed_units: number;
    retried_units: number;
    current_batch: number;
    current_unit_pointer: number;
    last_checkpoint: string | null;
    last_ralph_loop: string | null;
    estimated_sessions_remaining: number | null;
  };
  quality: {
    safety_gate: string;
    omega_gate: string;
    ralph_loop_enabled: boolean;
    ralph_max_iterations: number;
    stub_scan_enabled: boolean;
    validation_frequency: string;
    zero_tolerance_policy: string;
  };
  data_integrity: {
    require_real_data: boolean;
    require_source_attribution: boolean;
    require_completeness_check: boolean;
    blocked_patterns: string[];
    completeness_rule: string;
  };
  context_management: {
    checkpoint_every_n_units: number;
    max_units_per_session: number;
    save_on_exit: boolean;
  };
  resume_instructions: string;
}

export interface WorkUnit {
  unit_id: number;
  type: string;
  description: string;
  status: UnitStatus;
  batch: number;
  depends_on: number[];
  retry_count: number;
  output_ref: string | null;
  omega_score: number | null;
  error: string | null;
  created: string;
  completed: string | null;
  /** F2.3: Manus task ID when unit is delegated to Claude API */
  manus_task_id?: string;
  /** F2.3: Manus delegation metadata */
  manus_delegated_at?: string;
}

export interface StubScanResult {
  clean: boolean;
  hits: Array<{
    field: string;
    value: string;
    pattern: string;
    category: string;
  }>;
  scanned_fields: number;
  timestamp: string;
}

// ============================================================================
// AUTONOMOUS DISPATCHER — Execution engine config and results
// ============================================================================

export interface AutonomousConfig {
  backend: 'internal' | 'manus' | 'hybrid';
  default_tier: 'opus' | 'sonnet' | 'haiku';
  tool_budget_per_unit: number;
  max_cost_per_task: number;
  max_cost_per_batch: number;
  max_failure_rate: number;
  chunk_size: number;
  rate_limit_ms: number;
  enable_safety_escalation: boolean;
  enable_anti_regression: boolean;
  enable_ralph_auto: boolean;
  enable_audit_log: boolean;
  dry_run: boolean;
}

export interface ExecutionPlan {
  task_id: string;
  total_units: number;
  unit_agent_map: Array<{
    unit_id: number;
    description: string;
    agent_tier: string;
    swarm_pattern: string;
    estimated_tokens: number;
    estimated_cost_usd: number;
    safety_critical: boolean;
    context_package_keys: string[];
  }>;
  total_estimated_cost_usd: number;
  total_estimated_tokens: number;
  execution_strategy: string;
  estimated_duration_minutes: number;
  chunks: number;
}

export interface UnitExecutionResult {
  unit_id: number;
  status: 'success' | 'failed' | 'safety_escalated' | 'dry_run';
  output: any;
  agent_tier: string;
  model: string;
  tokens: { input: number; output: number };
  duration_ms: number;
  cost_usd: number;
  tool_calls_made: number;
  stub_scan_clean: boolean;
  safety_check: string;
  error?: string;
}

export interface AuditEntry {
  timestamp: string;
  unit_id: number;
  action: string;
  prompt_hash: string;
  model: string;
  tokens: { input: number; output: number };
  duration_ms: number;
  cost_usd: number;
  result_status: string;
  safety_flags: string[];
}


// ============================================================================
// DA-MS11: Phase-Aware Skill Loading & NL Hook Evaluation Types
// ============================================================================

export interface PhaseSkillLoadResult {
  success: boolean;
  call_number: number;
  current_phase: string;
  skills_matched: number;
  skills_loaded: number;
  skill_ids: string[];
  excerpts: Array<{ skill_id: string; title: string; content: string }>;
  pressure_mode: string;
  cache_hit: boolean;
}

export interface SkillContextMatchResult {
  success: boolean;
  call_number: number;
  matches: Array<{ skill_id: string; trigger: string; score: number }>;
  total_matched: number;
  context_key: string;
}

export interface NLHookEvalResult {
  success: boolean;
  call_number: number;
  hooks_evaluated: number;
  hooks_fired: number;
  fired_hooks: Array<{ hook_id: string; name: string; result: string }>;
  errors: number;
}

export interface HookActivationCheckResult {
  success: boolean;
  call_number: number;
  current_phase: string;
  expected_hooks: number;
  active_hooks: number;
  missing_hooks: string[];
  extra_hooks: string[];
  coverage_pct: number;
}
