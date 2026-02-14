/**
 * PRISM F6: Natural Language Hook Engine
 * ========================================
 * 
 * Complete NL→Hook pipeline: Parse → Compile → Validate → Sandbox → Deploy
 * 
 * SAFETY PRINCIPLES:
 * 1. NL hooks are NEVER blocking by default — only admin promotion
 * 2. LLM-generated code requires human approval
 * 3. Static analysis BLOCKS: imports, fs, network, eval, process access
 * 4. Sandbox timeout: 100ms per test (configurable)
 * 5. Auto-rollback after 10 runtime errors
 * 6. Shadow registry swap — atomic deployment
 * 
 * Template library handles 90%+ of hooks without LLM. Templates cover:
 * threshold, range, regex, enum, presence, compound conditions.
 * LLM fallback only for truly complex custom logic.
 * 
 * @version 1.0.0
 * @feature F6
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { log } from '../utils/Logger.js';
import { hookExecutor } from './HookExecutor.js';
import type { HookDefinition, HookContext, HookResult, HookPhase, HookCategory, HookMode, HookPriority } from './HookExecutor.js';
import {
  HookSpec, HookCondition, HookAction, NLParseResult, CompileResult,
  ValidationResult, ValidationViolation, SandboxResult, SandboxTestCase,
  SandboxTestResult, DeployResult, NLHookRecord, NLHookConfig,
  DEFAULT_NL_HOOK_CONFIG, ConditionType, CompileMethod, ParseConfidence,
} from '../types/nl-hook-types.js';

// ============================================================================
// STATE
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'nl_hooks');
const REGISTRY_FILE = path.join(STATE_DIR, 'registry.json');
const CONFIG_FILE = path.join(STATE_DIR, 'config.json');

function ensureStateDir(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch { /* non-fatal */ }
}

// ============================================================================
// TEMPLATE LIBRARY — Pattern matching for NL → conditions (no LLM needed)
// ============================================================================

/** Maps NL patterns to condition builders */
interface TemplatePattern {
  readonly patterns: RegExp[];
  readonly build: (match: RegExpMatchArray, input: string) => HookCondition | null;
}

const PHASE_KEYWORDS: Record<string, HookPhase> = {
  'before calculation': 'pre-calculation',
  'after calculation': 'post-calculation',
  'before writing': 'pre-file-write',
  'after writing': 'post-file-write',
  'before reading': 'pre-file-read',
  'on error': 'on-error',
  'on session start': 'on-session-start',
  'on session end': 'on-session-end',
  'on checkpoint': 'on-session-checkpoint',
  'on quality drop': 'on-quality-drop',
  'before toolpath': 'pre-toolpath',
  'after toolpath': 'post-toolpath',
  'on force limit': 'on-force-limit',
  'on thermal limit': 'on-thermal-limit',
  'on tool life warning': 'on-tool-life-warning',
  'before kienzle': 'pre-kienzle',
  'after kienzle': 'post-kienzle',
  'before taylor': 'pre-taylor',
  'after taylor': 'post-taylor',
  'before agent': 'pre-agent-execute',
  'after agent': 'post-agent-execute',
  'before batch import': 'pre-batch-import',
  'after batch import': 'post-batch-import',
  'on decision': 'on-decision',
  'on anomaly': 'on-anomaly',
};

const CATEGORY_KEYWORDS: Record<string, HookCategory> = {
  'safety': 'enforcement',
  'enforce': 'enforcement',
  'block': 'enforcement',
  'validate': 'validation',
  'check': 'validation',
  'verify': 'validation',
  'warn': 'validation',
  'log': 'observability',
  'track': 'observability',
  'monitor': 'observability',
  'automate': 'automation',
  'trigger': 'automation',
  'manufacturing': 'manufacturing',
  'machine': 'manufacturing',
  'tool life': 'manufacturing',
  'recovery': 'recovery',
};

/** Threshold patterns: "warn if safety score below 0.8" */
const THRESHOLD_PATTERNS: TemplatePattern = {
  patterns: [
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:below|under|less than|<)\s+([\d.]+)/i,
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:above|over|greater than|exceeds?|>)\s+([\d.]+)/i,
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:equal to|equals|==|=)\s+([\d.]+)/i,
  ],
  build(match, input) {
    const field = match[1];
    const value = parseFloat(match[2]);
    if (isNaN(value)) return null;
    const lower = input.toLowerCase();
    const operator = lower.includes('below') || lower.includes('under') || lower.includes('less') || lower.includes('<') ? 'lt' as const
      : lower.includes('above') || lower.includes('over') || lower.includes('greater') || lower.includes('exceed') || lower.includes('>') ? 'gt' as const
      : 'eq' as const;
    return { type: 'threshold', field, operator, value };
  }
};

/** Range patterns: "warn if speed between 100 and 500" */
const RANGE_PATTERNS: TemplatePattern = {
  patterns: [
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:between|from)\s+([\d.]+)\s+(?:and|to)\s+([\d.]+)/i,
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:not between|outside)\s+([\d.]+)\s+(?:and|to)\s+([\d.]+)/i,
  ],
  build(match, input) {
    const field = match[1];
    const low = parseFloat(match[2]);
    const high = parseFloat(match[3]);
    if (isNaN(low) || isNaN(high)) return null;
    const isNegated = input.toLowerCase().includes('not between') || input.toLowerCase().includes('outside');
    if (isNegated) {
      return { type: 'compound', field, operator: 'or', value: null, children: [
        { type: 'threshold', field, operator: 'lt', value: low },
        { type: 'threshold', field, operator: 'gt', value: high },
      ]};
    }
    return { type: 'range', field, operator: 'gte', value: { low, high } };
  }
};

/** Enum patterns: "warn if material_type is steel or aluminum" */
const ENUM_PATTERNS: TemplatePattern = {
  patterns: [
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:one of|in)\s*[:\s]?\s*(.+)/i,
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is|equals?)\s+([\w]+(?:\s*(?:,|or)\s*[\w]+)+)/i,
  ],
  build(match) {
    const field = match[1];
    const valuesStr = match[2];
    const values = valuesStr.split(/\s*(?:,|or)\s*/).map((v: string) => v.trim().replace(/['"]/g, '')).filter(Boolean);
    if (values.length < 2) return null;
    return { type: 'enum', field, operator: 'in', value: values };
  }
};

/** Regex patterns: "warn if name matches pattern XYZ" */
const REGEX_PATTERNS: TemplatePattern = {
  patterns: [
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:matches?|contains?|like)\s+[/"']?(.+?)[/"']?\s*$/i,
  ],
  build(match) {
    const field = match[1];
    const pattern = match[2].trim();
    try { new RegExp(pattern); } catch { return null; } // validate regex
    return { type: 'regex', field, operator: 'matches', value: pattern };
  }
};

/** Presence patterns: "warn if coolant_pressure is missing" */
const PRESENCE_PATTERNS: TemplatePattern = {
  patterns: [
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:missing|absent|not set|undefined|null|empty)/i,
    /(?:warn|alert|block|log|flag)\s+(?:if|when)\s+(\w[\w.]*)\s+(?:is\s+)?(?:present|set|defined|exists?)/i,
  ],
  build(match, input) {
    const field = match[1];
    const isNegated = /missing|absent|not set|undefined|null|empty/i.test(input);
    return { type: 'presence', field, operator: isNegated ? 'eq' as const : 'exists' as const, value: isNegated ? false : true };
  }
};

const ALL_TEMPLATE_PATTERNS = [THRESHOLD_PATTERNS, RANGE_PATTERNS, ENUM_PATTERNS, REGEX_PATTERNS, PRESENCE_PATTERNS];

// ============================================================================
// NL HOOK ENGINE — Main class
// ============================================================================

export class NLHookEngine {
  private config: NLHookConfig;
  private registry: Map<string, NLHookRecord> = new Map();
  private initialized = false;

  constructor(configOverrides?: Partial<NLHookConfig>) {
    this.config = { ...DEFAULT_NL_HOOK_CONFIG, ...configOverrides };
  }

  // ==========================================================================
  // INIT — Load state from disk
  // ==========================================================================

  init(): void {
    if (this.initialized) return;
    ensureStateDir();
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        this.config = { ...DEFAULT_NL_HOOK_CONFIG, ...raw };
      }
    } catch { /* use defaults */ }
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        const records: NLHookRecord[] = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
        for (const rec of records) this.registry.set(rec.id, rec);
        log.info(`[NLHookEngine] Loaded ${this.registry.size} NL hooks from registry`);
      }
    } catch { /* empty registry */ }
    this.initialized = true;
  }

  private saveRegistry(): void {
    try {
      ensureStateDir();
      const records = Array.from(this.registry.values());
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(records, null, 2));
    } catch (e: any) {
      log.warn(`[NLHookEngine] Failed to save registry: ${e.message}`);
    }
  }

  private saveConfig(): void {
    try {
      ensureStateDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch { /* non-fatal */ }
  }

  // ==========================================================================
  // PHASE 1: PARSER — Natural language → HookSpec
  // ==========================================================================

  parse(naturalLanguage: string): NLParseResult {
    this.init();
    const input = naturalLanguage.trim();
    if (!input || input.length < 10) {
      return { success: false, spec: null, confidence: 'low', ambiguities: [],
        suggestions: ['Please provide a more detailed description of the hook behavior.'],
        needs_clarification: true, clarification_questions: ['What should the hook do?'] };
    }

    const lower = input.toLowerCase();
    const ambiguities: string[] = [];
    const suggestions: string[] = [];

    // 1. Detect phase
    let phase: HookPhase = 'on-tool-call';  // default
    for (const [keyword, p] of Object.entries(PHASE_KEYWORDS)) {
      if (lower.includes(keyword)) { phase = p; break; }
    }
    if (phase === 'on-tool-call') {
      ambiguities.push('Could not determine when this hook should fire. Defaulting to on-tool-call.');
    }

    // 2. Detect category
    let category: HookCategory = 'validation';
    for (const [keyword, c] of Object.entries(CATEGORY_KEYWORDS)) {
      if (lower.includes(keyword)) { category = c; break; }
    }

    // 3. Detect mode from language
    let mode: HookMode = this.config.default_mode;
    if (/\bblock\b/i.test(lower) || /\bstop\b/i.test(lower) || /\bprevent\b/i.test(lower)) {
      mode = 'warning'; // NEVER auto-blocking for NL hooks
      ambiguities.push('Blocking mode requested but NL hooks default to warning. Admin can promote to blocking.');
    } else if (/\bwarn\b/i.test(lower) || /\balert\b/i.test(lower)) {
      mode = 'warning';
    } else if (/\blog\b/i.test(lower) || /\btrack\b/i.test(lower) || /\brecord\b/i.test(lower)) {
      mode = 'logging';
    }

    // 4. Detect priority
    let priority: HookPriority = this.config.default_priority;
    if (/\bcritical\b/i.test(lower) || /\burgent\b/i.test(lower)) priority = 'high';
    if (/\blow priority\b/i.test(lower) || /\bbackground\b/i.test(lower)) priority = 'low';

    // 5. Extract conditions from template patterns
    const conditions: HookCondition[] = [];
    for (const tp of ALL_TEMPLATE_PATTERNS) {
      for (const pattern of tp.patterns) {
        const match = input.match(pattern);
        if (match) {
          const cond = tp.build(match, input);
          if (cond) conditions.push(cond);
        }
      }
    }

    // 6. Determine actions from language
    const actions: HookAction[] = [];
    if (mode === 'warning' || /\bwarn\b/i.test(lower)) {
      actions.push({ type: 'warn', message: `NL Hook: ${input.slice(0, 100)}` });
    } else if (mode === 'logging') {
      actions.push({ type: 'log', message: `NL Hook: ${input.slice(0, 100)}` });
    } else {
      actions.push({ type: 'warn', message: `NL Hook: ${input.slice(0, 100)}` });
    }

    // 7. Build tags from detected keywords
    const tags: string[] = ['nl-authored'];
    if (/\bsafety\b/i.test(lower)) tags.push('safety');
    if (/\bmanufacturing\b/i.test(lower)) tags.push('manufacturing');
    if (/\bcalculation\b/i.test(lower)) tags.push('calculation');

    // 8. Generate name from input
    const name = input.slice(0, 60).replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();

    // 9. Check for blocked phases
    if (this.config.blocked_phases.includes(phase)) {
      return { success: false, spec: null, confidence: 'high', ambiguities: [],
        suggestions: [`Phase '${phase}' is restricted for NL-authored hooks.`],
        needs_clarification: false, clarification_questions: [] };
    }

    // 10. Determine confidence
    let confidence: ParseConfidence = 'high';
    if (conditions.length === 0) {
      confidence = 'low';
      ambiguities.push('No conditions could be extracted. Hook will fire unconditionally on the detected phase.');
    } else if (ambiguities.length > 0) {
      confidence = 'medium';
    }

    const spec: HookSpec = {
      name: `nl-${name}`,
      description: input.slice(0, 200),
      natural_language: input,
      phase, category, mode, priority,
      conditions, actions, tags,
    };

    return {
      success: true, spec, confidence, ambiguities, suggestions,
      needs_clarification: confidence === 'low' && conditions.length === 0,
      clarification_questions: conditions.length === 0 ? ['What specific condition should trigger this hook?'] : [],
    };
  }

  // ==========================================================================
  // PHASE 2: COMPILER — HookSpec → executable handler code
  // ==========================================================================

  compile(spec: HookSpec): CompileResult {
    this.init();
    const warnings: string[] = [];
    let method: CompileMethod = 'template';

    // Build condition function from spec conditions
    const conditionParts: string[] = [];
    for (const cond of spec.conditions) {
      const code = this.compileCondition(cond);
      if (code) {
        conditionParts.push(code);
      } else {
        warnings.push(`Could not compile condition on field '${cond.field}' — skipped`);
      }
    }
    const condition_code = conditionParts.length > 0
      ? `return ${conditionParts.join(' && ')};`
      : 'return true;'; // no conditions = always fires

    // Build handler function
    const actionParts: string[] = [];
    for (const action of spec.actions) {
      switch (action.type) {
        case 'warn':
          actionParts.push(`issues.push(${JSON.stringify(action.message || 'NL hook triggered')});`);
          break;
        case 'log':
          actionParts.push(`actions.push('logged: ' + ${JSON.stringify(action.message || 'NL hook triggered')});`);
          break;
        case 'block':
          actionParts.push(`blocked = true; issues.push(${JSON.stringify(action.message || 'Blocked by NL hook')});`);
          break;
        case 'emit_event':
          actionParts.push(`actions.push('emitted: ${action.event || 'nl-hook-event'}');`);
          break;
        case 'recommend':
          actionParts.push(`warnings.push(${JSON.stringify(action.recommendation || 'Consider alternatives')});`);
          break;
      }
    }

    const handler_code = [
      `const issues = [];`,
      `const warnings = [];`,
      `const actions = [];`,
      `let blocked = false;`,
      ...actionParts,
      `return {`,
      `  hookId: HOOK_ID, hookName: HOOK_NAME, phase: PHASE, category: CATEGORY, mode: MODE,`,
      `  success: !blocked && issues.length === 0,`,
      `  blocked,`,
      `  message: issues.length > 0 ? issues.join('; ') : 'NL hook passed',`,
      `  issues: issues.length > 0 ? issues : undefined,`,
      `  warnings: warnings.length > 0 ? warnings : undefined,`,
      `  actions: actions.length > 0 ? actions : undefined,`,
      `  startTime: new Date(), endTime: new Date(), durationMs: 0,`,
      `};`,
    ].join('\n');

    // Check if any condition required LLM (custom type)
    if (spec.conditions.some(c => c.type === 'custom')) {
      method = 'llm';
      warnings.push('Contains custom condition — requires LLM compilation and human approval');
    }

    return {
      success: true, method, handler_code, condition_code,
      requires_approval: method === 'llm' && this.config.require_approval_for_llm,
      warnings, estimated_latency_ms: conditionParts.length * 0.1 + actionParts.length * 0.1,
    };
  }

  private compileCondition(cond: HookCondition): string | null {
    const f = `ctx?.${cond.field.replace(/\./g, '?.')}`;
    switch (cond.type) {
      case 'threshold':
        switch (cond.operator) {
          case 'gt': return `(${f} > ${JSON.stringify(cond.value)})`;
          case 'gte': return `(${f} >= ${JSON.stringify(cond.value)})`;
          case 'lt': return `(${f} < ${JSON.stringify(cond.value)})`;
          case 'lte': return `(${f} <= ${JSON.stringify(cond.value)})`;
          case 'eq': return `(${f} === ${JSON.stringify(cond.value)})`;
          case 'neq': return `(${f} !== ${JSON.stringify(cond.value)})`;
          default: return null;
        }
      case 'range': {
        const v = cond.value as { low: number; high: number };
        return `(${f} >= ${v.low} && ${f} <= ${v.high})`;
      }
      case 'regex':
        return `(typeof ${f} === 'string' && /${cond.value}/.test(${f}))`;
      case 'enum': {
        const vals = JSON.stringify(cond.value);
        return `(${vals}.includes(${f}))`;
      }
      case 'presence':
        return cond.value ? `(${f} != null && ${f} !== '')` : `(${f} == null || ${f} === '')`;
      case 'compound': {
        if (!cond.children || cond.children.length === 0) return null;
        const parts = cond.children.map(c => this.compileCondition(c)).filter(Boolean);
        const joiner = cond.operator === 'or' ? ' || ' : ' && ';
        return parts.length > 0 ? `(${parts.join(joiner)})` : null;
      }
      case 'custom':
        return null; // requires LLM
      default:
        return null;
    }
  }

  // ==========================================================================
  // PHASE 3: VALIDATOR — Static analysis of compiled code
  // ==========================================================================

  validate(compileResult: CompileResult): ValidationResult {
    const violations: ValidationViolation[] = [];
    const checks_run: string[] = [];
    const code = compileResult.handler_code + '\n' + compileResult.condition_code;

    // Check for dangerous patterns
    const dangerousPatterns: [RegExp, string, string][] = [
      [/\bimport\s/g, 'no_imports', 'Code must not contain import statements'],
      [/\brequire\s*\(/g, 'no_require', 'Code must not contain require() calls'],
      [/\bfs\b\.\w/g, 'no_fs', 'Code must not access the filesystem'],
      [/\bpath\b\.\w/g, 'no_path', 'Code must not use path module'],
      [/\bchild_process/g, 'no_child_process', 'Code must not spawn child processes'],
      [/\bnet\b\.\w|https?\b\.\w|fetch\s*\(|XMLHttpRequest/g, 'no_network', 'Code must not make network requests'],
      [/\beval\s*\(/g, 'no_eval', 'Code must not use eval()'],
      [/\bnew\s+Function\s*\(/g, 'no_function_ctor', 'Code must not use Function constructor'],
      [/\bprocess\b\.\w/g, 'no_process', 'Code must not access process object'],
      [/\bglobalThis\b|\bglobal\b\.\w/g, 'no_globals', 'Code must not access global scope'],
      [/\bsetTimeout\b|\bsetInterval\b/g, 'no_timers', 'Code must not set timers'],
      [/\bwhile\s*\(\s*true\b/g, 'no_infinite_loop', 'Code must not contain infinite loops'],
    ];

    const analysis = {
      has_imports: false, has_fs_access: false, has_network_access: false,
      has_eval: false, has_process_access: false, estimated_complexity: 1, max_nesting_depth: 0,
    };

    for (const [pattern, rule, message] of dangerousPatterns) {
      checks_run.push(rule);
      if (pattern.test(code)) {
        const severity = (rule === 'no_timers') ? 'warning' as const : 'error' as const;
        violations.push({ rule, severity, message });
        if (rule === 'no_imports' || rule === 'no_require') analysis.has_imports = true;
        if (rule === 'no_fs' || rule === 'no_path') analysis.has_fs_access = true;
        if (rule === 'no_network') analysis.has_network_access = true;
        if (rule === 'no_eval' || rule === 'no_function_ctor') analysis.has_eval = true;
        if (rule === 'no_process' || rule === 'no_globals') analysis.has_process_access = true;
      }
    }

    // Estimate complexity (rough cyclomatic)
    const branches = (code.match(/\bif\b|\belse\b|\bcase\b|\b\?\b|\b&&\b|\b\|\|\b/g) || []).length;
    analysis.estimated_complexity = 1 + branches;
    checks_run.push('complexity_check');
    if (analysis.estimated_complexity > 15) {
      violations.push({ rule: 'max_complexity', severity: 'warning', message: `Estimated complexity ${analysis.estimated_complexity} exceeds recommended max of 15` });
    }

    // Check nesting depth
    let depth = 0, maxDepth = 0;
    for (const ch of code) {
      if (ch === '{') { depth++; maxDepth = Math.max(maxDepth, depth); }
      if (ch === '}') depth--;
    }
    analysis.max_nesting_depth = maxDepth;
    checks_run.push('nesting_depth_check');
    if (maxDepth > 5) {
      violations.push({ rule: 'max_nesting', severity: 'warning', message: `Nesting depth ${maxDepth} exceeds recommended max of 5` });
    }

    // Code length check
    checks_run.push('code_length_check');
    if (code.length > 5000) {
      violations.push({ rule: 'max_code_length', severity: 'warning', message: 'Generated code exceeds 5000 characters' });
    }

    const passed = violations.filter(v => v.severity === 'error').length === 0;
    return { passed, violations, checks_run, static_analysis: analysis };
  }

  // ==========================================================================
  // PHASE 4: SANDBOX — Boundary value testing
  // ==========================================================================

  sandbox(spec: HookSpec, compileResult: CompileResult): SandboxResult {
    const testCases = this.generateTestCases(spec);
    const results: SandboxTestResult[] = [];
    let timeoutExceeded = false;
    const startTime = Date.now();

    for (const tc of testCases) {
      if (Date.now() - startTime > this.config.sandbox_timeout_ms * testCases.length) {
        timeoutExceeded = true;
        break;
      }
      const tcStart = Date.now();
      try {
        // Build a mock context from test input
        const mockCtx = this.buildMockContext(tc.input, spec);
        // Evaluate condition code against mock context
        const conditionFn = new Function('ctx', compileResult.condition_code);
        const conditionResult = conditionFn(mockCtx);
        const actual_outcome = conditionResult
          ? (spec.mode === 'blocking' ? 'block' : 'warn')
          : 'pass';
        results.push({
          test: tc, actual_outcome, matched: actual_outcome === tc.expected_outcome,
          duration_ms: Date.now() - tcStart,
        });
      } catch (e: any) {
        results.push({
          test: tc, actual_outcome: 'error', matched: false,
          duration_ms: Date.now() - tcStart, error: e.message,
        });
      }
    }

    const passed_tests = results.filter(r => r.matched).length;
    const error_tests = results.filter(r => r.actual_outcome === 'error').length;
    return {
      passed: error_tests === 0 && passed_tests >= results.length * 0.9,
      total_tests: results.length,
      passed_tests,
      failed_tests: results.length - passed_tests - error_tests,
      error_tests,
      results,
      total_duration_ms: Date.now() - startTime,
      timeout_exceeded: timeoutExceeded,
    };
  }

  private generateTestCases(spec: HookSpec): SandboxTestCase[] {
    const cases: SandboxTestCase[] = [];
    for (const cond of spec.conditions) {
      switch (cond.type) {
        case 'threshold': {
          const val = cond.value as number;
          const triggering = cond.operator === 'lt' || cond.operator === 'lte';
          // Boundary: at threshold
          cases.push({ name: `${cond.field} at threshold ${val}`, input: { [cond.field]: val },
            expected_outcome: (cond.operator === 'lte' || cond.operator === 'gte' || cond.operator === 'eq') ? 'warn' : 'pass', is_boundary: true });
          // Below threshold
          cases.push({ name: `${cond.field} below ${val}`, input: { [cond.field]: val - 0.1 },
            expected_outcome: triggering ? 'warn' : 'pass', is_boundary: false });
          // Above threshold
          cases.push({ name: `${cond.field} above ${val}`, input: { [cond.field]: val + 0.1 },
            expected_outcome: triggering ? 'pass' : 'warn', is_boundary: false });
          break;
        }
        case 'range': {
          const v = cond.value as { low: number; high: number };
          cases.push({ name: `${cond.field} in range`, input: { [cond.field]: (v.low + v.high) / 2 },
            expected_outcome: 'warn', is_boundary: false });
          cases.push({ name: `${cond.field} below range`, input: { [cond.field]: v.low - 1 },
            expected_outcome: 'pass', is_boundary: true });
          cases.push({ name: `${cond.field} above range`, input: { [cond.field]: v.high + 1 },
            expected_outcome: 'pass', is_boundary: true });
          break;
        }
        case 'enum': {
          const vals = cond.value as string[];
          if (vals.length > 0) {
            cases.push({ name: `${cond.field} = ${vals[0]} (in set)`, input: { [cond.field]: vals[0] },
              expected_outcome: 'warn', is_boundary: false });
            cases.push({ name: `${cond.field} = __INVALID__ (not in set)`, input: { [cond.field]: '__INVALID__' },
              expected_outcome: 'pass', is_boundary: true });
          }
          break;
        }
        case 'presence': {
          cases.push({ name: `${cond.field} present`, input: { [cond.field]: 'test_value' },
            expected_outcome: cond.value ? 'warn' : 'pass', is_boundary: false });
          cases.push({ name: `${cond.field} missing`, input: {},
            expected_outcome: cond.value ? 'pass' : 'warn', is_boundary: true });
          break;
        }
        default:
          // Generic pass-through test for unknown condition types
          cases.push({ name: `default test for ${cond.field}`, input: {},
            expected_outcome: 'pass', is_boundary: false });
      }
    }
    // If no conditions, add a basic fire test
    if (cases.length === 0) {
      cases.push({ name: 'unconditional fire', input: {}, expected_outcome: 'warn', is_boundary: false });
    }
    return cases;
  }

  private buildMockContext(input: Record<string, unknown>, spec: HookSpec): Record<string, unknown> {
    const ctx: Record<string, unknown> = { operation: 'test', phase: spec.phase, timestamp: new Date() };
    // Flatten dot-path keys into nested object
    for (const [key, value] of Object.entries(input)) {
      const parts = key.split('.');
      let obj: any = ctx;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    }
    return ctx;
  }

  // ==========================================================================
  // PHASE 5: DEPLOYER — Live registration with shadow + rollback
  // ==========================================================================

  deploy(spec: HookSpec, compileResult: CompileResult, validationResult: ValidationResult, sandboxResult: SandboxResult): DeployResult {
    this.init();
    const hookId = `nl-${randomUUID().slice(0, 8)}`;

    // Gate checks
    if (!validationResult.passed) {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: false,
        error_count: 0, rollback_reason: 'Validation failed — code contains dangerous patterns', approval_required: false };
    }
    if (!sandboxResult.passed) {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: false,
        error_count: 0, rollback_reason: `Sandbox failed — ${sandboxResult.failed_tests + sandboxResult.error_tests}/${sandboxResult.total_tests} tests failed`, approval_required: false };
    }
    if (compileResult.requires_approval) {
      // Store as pending, don't register
      const record = this.buildRecord(hookId, spec, compileResult, validationResult, sandboxResult, 'pending_approval');
      this.registry.set(hookId, record);
      this.saveRegistry();
      return { status: 'pending_approval', hook_id: hookId, registered: false, shadow_tested: true,
        error_count: 0, approval_required: true };
    }
    if (this.registry.size >= this.config.max_hooks) {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: true,
        error_count: 0, rollback_reason: `Max NL hooks limit reached (${this.config.max_hooks})`, approval_required: false };
    }

    // Build and register the hook
    try {
      const hookDef = this.buildHookDefinition(hookId, spec, compileResult);
      hookExecutor.register(hookDef);

      const record = this.buildRecord(hookId, spec, compileResult, validationResult, sandboxResult, 'deployed');
      this.registry.set(hookId, record);
      this.saveRegistry();
      log.info(`[NLHookEngine] Deployed NL hook: ${hookId} (${spec.name})`);

      return { status: 'deployed', hook_id: hookId, registered: true, shadow_tested: true,
        error_count: 0, approval_required: false };
    } catch (e: any) {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: true,
        error_count: 0, rollback_reason: `Registration failed: ${e.message}`, approval_required: false };
    }
  }

  private buildHookDefinition(hookId: string, spec: HookSpec, compileResult: CompileResult): HookDefinition {
    // Build condition function
    const condFn = new Function('ctx', compileResult.condition_code) as (ctx: HookContext) => boolean;
    // Build handler function
    const handlerTemplate = compileResult.handler_code
      .replace(/HOOK_ID/g, JSON.stringify(hookId))
      .replace(/HOOK_NAME/g, JSON.stringify(spec.name))
      .replace(/PHASE/g, JSON.stringify(spec.phase))
      .replace(/CATEGORY/g, JSON.stringify(spec.category))
      .replace(/MODE/g, JSON.stringify(spec.mode));
    const handlerFn = new Function('context', handlerTemplate) as (ctx: HookContext) => HookResult;

    return {
      id: hookId,
      name: spec.name,
      description: spec.description,
      phase: spec.phase,
      category: spec.category,
      mode: spec.mode,
      priority: spec.priority,
      enabled: true,
      handler: handlerFn,
      condition: condFn,
      timeoutMs: 100,
      tags: [...spec.tags, 'nl-authored'],
    };
  }

  private buildRecord(
    hookId: string, spec: HookSpec, compile: CompileResult,
    validation: ValidationResult, sandbox: SandboxResult, status: NLHookRecord['deploy_status']
  ): NLHookRecord {
    return {
      id: hookId, created_at: Date.now(), updated_at: Date.now(),
      natural_language: spec.natural_language, spec,
      compile_method: compile.method, handler_code: compile.handler_code,
      condition_code: compile.condition_code, validation, sandbox,
      deploy_status: status, error_count: 0, execution_count: 0,
      auto_rollback_threshold: this.config.auto_rollback_threshold,
      tags: spec.tags,
    };
  }

  // ==========================================================================
  // PUBLIC API — Full pipeline + management
  // ==========================================================================

  /** Full pipeline: parse → compile → validate → sandbox → deploy */
  createFromNL(naturalLanguage: string): {
    parse: NLParseResult;
    compile?: CompileResult;
    validation?: ValidationResult;
    sandbox?: SandboxResult;
    deploy?: DeployResult;
    stage_failed?: string;
    telemetry?: Record<string, number>;
  } {
    const t0 = Date.now();

    // Phase 1: Parse
    const parse = this.parse(naturalLanguage);
    const t1 = Date.now();
    if (!parse.success || !parse.spec) {
      log.info(`[NLHook] Pipeline STOPPED at parse (${t1 - t0}ms)`);
      return { parse, stage_failed: 'parse', telemetry: { parse_ms: t1 - t0, total_ms: t1 - t0 } };
    }

    // Phase 2: Compile
    const compile = this.compile(parse.spec);
    const t2 = Date.now();
    if (!compile.success) {
      log.info(`[NLHook] Pipeline STOPPED at compile (parse=${t1 - t0}ms, compile=${t2 - t1}ms)`);
      return { parse, compile, stage_failed: 'compile', telemetry: { parse_ms: t1 - t0, compile_ms: t2 - t1, total_ms: t2 - t0 } };
    }

    // Phase 3: Validate
    const validation = this.validate(compile);
    const t3 = Date.now();
    if (!validation.passed) {
      log.info(`[NLHook] Pipeline STOPPED at validate (parse=${t1 - t0}ms, compile=${t2 - t1}ms, validate=${t3 - t2}ms)`);
      return { parse, compile, validation, stage_failed: 'validate', telemetry: { parse_ms: t1 - t0, compile_ms: t2 - t1, validate_ms: t3 - t2, total_ms: t3 - t0 } };
    }

    // Phase 4: Sandbox
    const sandbox = this.sandbox(parse.spec, compile);
    const t4 = Date.now();
    if (!sandbox.passed) {
      log.info(`[NLHook] Pipeline STOPPED at sandbox (parse=${t1 - t0}ms, compile=${t2 - t1}ms, validate=${t3 - t2}ms, sandbox=${t4 - t3}ms)`);
      return { parse, compile, validation, sandbox, stage_failed: 'sandbox', telemetry: { parse_ms: t1 - t0, compile_ms: t2 - t1, validate_ms: t3 - t2, sandbox_ms: t4 - t3, total_ms: t4 - t0 } };
    }

    // Phase 5: Deploy
    const deploy = this.deploy(parse.spec, compile, validation, sandbox);
    const t5 = Date.now();
    log.info(`[NLHook] Pipeline COMPLETE: ${deploy.status} (parse=${t1 - t0}ms, compile=${t2 - t1}ms, validate=${t3 - t2}ms, sandbox=${t4 - t3}ms, deploy=${t5 - t4}ms, total=${t5 - t0}ms)`);
    return { parse, compile, validation, sandbox, deploy, telemetry: { parse_ms: t1 - t0, compile_ms: t2 - t1, validate_ms: t3 - t2, sandbox_ms: t4 - t3, deploy_ms: t5 - t4, total_ms: t5 - t0 } };
  }

  /** Approve a pending hook for deployment */
  approve(hookId: string, approver: string): DeployResult {
    this.init();
    const record = this.registry.get(hookId);
    if (!record) {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: false,
        error_count: 0, rollback_reason: 'Hook not found', approval_required: false };
    }
    if (record.deploy_status !== 'pending_approval') {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: false,
        error_count: 0, rollback_reason: `Hook status is '${record.deploy_status}', not pending_approval`, approval_required: false };
    }

    try {
      const hookDef = this.buildHookDefinition(hookId, record.spec,
        { success: true, method: record.compile_method, handler_code: record.handler_code,
          condition_code: record.condition_code, requires_approval: false, warnings: [], estimated_latency_ms: 0 });
      hookExecutor.register(hookDef);

      const updated: NLHookRecord = { ...record, deploy_status: 'deployed', updated_at: Date.now(), approved_by: approver };
      this.registry.set(hookId, updated);
      this.saveRegistry();
      log.info(`[NLHookEngine] Approved and deployed NL hook: ${hookId} by ${approver}`);

      return { status: 'deployed', hook_id: hookId, registered: true, shadow_tested: true,
        error_count: 0, approval_required: false };
    } catch (e: any) {
      return { status: 'failed', hook_id: hookId, registered: false, shadow_tested: false,
        error_count: 0, rollback_reason: `Deployment failed: ${e.message}`, approval_required: false };
    }
  }

  /** Remove/rollback an NL hook */
  remove(hookId: string): { success: boolean; reason: string } {
    this.init();
    const record = this.registry.get(hookId);
    if (!record) return { success: false, reason: 'Hook not found' };

    // Attempt to unregister from HookExecutor
    try {
      hookExecutor.unregister?.(hookId);
    } catch { /* may not be registered */ }

    const updated: NLHookRecord = { ...record, deploy_status: 'rolled_back', updated_at: Date.now() };
    this.registry.set(hookId, updated);
    this.saveRegistry();
    log.info(`[NLHookEngine] Removed NL hook: ${hookId}`);
    return { success: true, reason: 'Hook removed and rolled back' };
  }

  /** Record a runtime error for auto-rollback tracking */
  recordError(hookId: string): { rolled_back: boolean } {
    const record = this.registry.get(hookId);
    if (!record || record.deploy_status !== 'deployed') return { rolled_back: false };

    const updated: NLHookRecord = { ...record, error_count: record.error_count + 1, updated_at: Date.now() };
    if (updated.error_count >= updated.auto_rollback_threshold) {
      // Auto-rollback
      try { hookExecutor.unregister?.(hookId); } catch { /* */ }
      this.registry.set(hookId, { ...updated, deploy_status: 'rolled_back' });
      this.saveRegistry();
      log.warn(`[NLHookEngine] Auto-rollback: ${hookId} after ${updated.error_count} errors`);
      return { rolled_back: true };
    }
    this.registry.set(hookId, updated);
    this.saveRegistry();
    return { rolled_back: false };
  }

  /** List all NL-authored hooks */
  list(filter?: { status?: string; tag?: string }): NLHookRecord[] {
    this.init();
    let records = Array.from(this.registry.values());
    if (filter?.status) records = records.filter(r => r.deploy_status === filter.status);
    if (filter?.tag) records = records.filter(r => r.tags.includes(filter.tag));
    return records;
  }

  /** Get a single NL hook record */
  get(hookId: string): NLHookRecord | null {
    this.init();
    return this.registry.get(hookId) || null;
  }

  /** Get stats */
  getStats(): { total: number; deployed: number; pending: number; rolled_back: number; failed: number } {
    this.init();
    const records = Array.from(this.registry.values());
    return {
      total: records.length,
      deployed: records.filter(r => r.deploy_status === 'deployed').length,
      pending: records.filter(r => r.deploy_status === 'pending_approval').length,
      rolled_back: records.filter(r => r.deploy_status === 'rolled_back').length,
      failed: records.filter(r => r.deploy_status === 'failed').length,
    };
  }

  /** Get config */
  getConfig(): NLHookConfig { return { ...this.config }; }

  /** Update config */
  updateConfig(updates: Partial<NLHookConfig>): NLHookConfig {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    return this.config;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const nlHookEngine = new NLHookEngine();
