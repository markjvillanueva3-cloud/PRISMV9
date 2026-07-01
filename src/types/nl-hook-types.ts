/**
 * PRISM F6: Natural Language Hook Authoring — Type Definitions
 * =============================================================
 * 
 * Users describe hooks in natural language. The system parses, compiles,
 * validates, sandbox-tests, and deploys them as live HookDefinitions.
 * 
 * SAFETY: NL-authored hooks are NEVER blocking by default. Only admin
 * promotion can elevate to blocking mode. LLM-generated hooks require
 * human approval before deployment.
 * 
 * @version 1.0.0
 * @feature F6
 */

import type { HookPhase, HookCategory, HookMode, HookPriority } from '../engines/HookExecutor.js';

// ============================================================================
// HOOK SPEC — Structured representation of user intent
// ============================================================================

/** Condition types the template library supports natively (no LLM needed) */
export type ConditionType =
  | 'threshold'    // numeric comparison: value > 0.7
  | 'range'        // numeric range: 100 <= value <= 500
  | 'regex'        // string pattern match
  | 'enum'         // value in set: material_type in ['steel', 'aluminum']
  | 'presence'     // field exists / is truthy
  | 'compound'     // AND/OR of other conditions
  | 'custom';      // requires LLM compilation

export interface HookCondition {
  readonly type: ConditionType;
  readonly field: string;           // dot-path: e.g. 'context.quality.safety'
  readonly operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'not_in' | 'matches' | 'exists' | 'and' | 'or';
  readonly value: unknown;          // comparison value
  readonly children?: HookCondition[];  // for compound conditions
}

export interface HookAction {
  readonly type: 'log' | 'warn' | 'block' | 'emit_event' | 'modify_context' | 'recommend';
  readonly message?: string;
  readonly event?: string;          // for emit_event
  readonly field?: string;          // for modify_context
  readonly value?: unknown;         // for modify_context
  readonly recommendation?: string; // for recommend
}

export interface HookSpec {
  readonly name: string;
  readonly description: string;
  readonly natural_language: string;   // original user input
  readonly phase: HookPhase;
  readonly category: HookCategory;
  readonly mode: HookMode;
  readonly priority: HookPriority;
  readonly conditions: HookCondition[];
  readonly actions: HookAction[];
  readonly tags: string[];
}

// ============================================================================
// PARSE RESULT — NL → HookSpec
// ============================================================================

export type ParseConfidence = 'high' | 'medium' | 'low';

export interface NLParseResult {
  readonly success: boolean;
  readonly spec: HookSpec | null;
  readonly confidence: ParseConfidence;
  readonly ambiguities: string[];       // things the parser wasn't sure about
  readonly suggestions: string[];       // alternative interpretations
  readonly needs_clarification: boolean;
  readonly clarification_questions: string[];
}

// ============================================================================
// COMPILE RESULT — HookSpec → handler function code
// ============================================================================

export type CompileMethod = 'template' | 'llm';

export interface CompileResult {
  readonly success: boolean;
  readonly method: CompileMethod;
  readonly handler_code: string;        // generated TypeScript function body
  readonly condition_code: string;      // generated condition function body
  readonly requires_approval: boolean;  // true if LLM-generated
  readonly warnings: string[];
  readonly estimated_latency_ms: number;
}

// ============================================================================
// VALIDATION RESULT — Static analysis of compiled code
// ============================================================================

export interface ValidationViolation {
  readonly rule: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly line?: number;
}

export interface ValidationResult {
  readonly passed: boolean;
  readonly violations: ValidationViolation[];
  readonly checks_run: string[];
  readonly static_analysis: {
    has_imports: boolean;
    has_fs_access: boolean;
    has_network_access: boolean;
    has_eval: boolean;
    has_process_access: boolean;
    estimated_complexity: number;    // cyclomatic
    max_nesting_depth: number;
  };
}

// ============================================================================
// SANDBOX RESULT — Runtime testing of compiled hook
// ============================================================================

export interface SandboxTestCase {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly expected_outcome: 'pass' | 'warn' | 'block';
  readonly is_boundary: boolean;
}

export interface SandboxTestResult {
  readonly test: SandboxTestCase;
  readonly actual_outcome: 'pass' | 'warn' | 'block' | 'error';
  readonly matched: boolean;
  readonly duration_ms: number;
  readonly error?: string;
}

export interface SandboxResult {
  readonly passed: boolean;
  readonly total_tests: number;
  readonly passed_tests: number;
  readonly failed_tests: number;
  readonly error_tests: number;
  readonly results: SandboxTestResult[];
  readonly total_duration_ms: number;
  readonly timeout_exceeded: boolean;
}

// ============================================================================
// DEPLOY RESULT — Live registration
// ============================================================================

export type DeployStatus = 'deployed' | 'rolled_back' | 'pending_approval' | 'failed';

export interface DeployResult {
  readonly status: DeployStatus;
  readonly hook_id: string;
  readonly registered: boolean;
  readonly shadow_tested: boolean;
  readonly error_count: number;
  readonly rollback_reason?: string;
  readonly approval_required: boolean;
}

// ============================================================================
// NL HOOK REGISTRY — Tracks all NL-authored hooks
// ============================================================================

export interface NLHookRecord {
  readonly id: string;
  readonly created_at: number;          // unix ms
  readonly updated_at: number;
  readonly natural_language: string;
  readonly spec: HookSpec;
  readonly compile_method: CompileMethod;
  readonly handler_code: string;
  readonly condition_code: string;
  readonly validation: ValidationResult;
  readonly sandbox: SandboxResult;
  readonly deploy_status: DeployStatus;
  readonly error_count: number;          // runtime errors since deploy
  readonly execution_count: number;
  readonly auto_rollback_threshold: number;  // default 10
  readonly approved_by?: string;
  readonly tags: string[];
}

// ============================================================================
// CONFIG
// ============================================================================

export interface NLHookConfig {
  max_hooks: number;                    // max NL-authored hooks allowed
  auto_rollback_threshold: number;      // errors before auto-rollback (default 10)
  sandbox_timeout_ms: number;           // max sandbox test time (default 100ms per test)
  require_approval_for_llm: boolean;    // require human approval for LLM-compiled hooks
  default_mode: HookMode;              // default mode for NL hooks (never 'blocking')
  default_priority: HookPriority;      // default priority for NL hooks
  allowed_phases: HookPhase[];         // phases NL hooks can target
  blocked_phases: HookPhase[];         // phases NL hooks CANNOT target
}

export const DEFAULT_NL_HOOK_CONFIG: NLHookConfig = {
  max_hooks: 100,
  auto_rollback_threshold: 10,
  sandbox_timeout_ms: 100,
  require_approval_for_llm: true,
  default_mode: 'warning',            // NEVER blocking by default
  default_priority: 'normal',
  allowed_phases: [],                  // empty = all except blocked
  blocked_phases: [                    // safety-critical phases NL hooks cannot target
    'pre-output',                      // output gates are system-only
  ],
};
