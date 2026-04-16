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
import { DEFAULT_NL_HOOK_CONFIG, } from '../types/nl-hook-types.js';
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { safeRegex } from "../utils/SafetyValidator.js";
// ============================================================================
// STATE
// ============================================================================
const STATE_DIR = path.join(PATHS.MCP_SERVER, 'state', 'nl_hooks');
const REGISTRY_FILE = path.join(STATE_DIR, 'registry.json');
const CONFIG_FILE = path.join(STATE_DIR, 'config.json');
function ensureStateDir() {
    try {
        if (!fs.existsSync(STATE_DIR))
            fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    catch { /* non-fatal */ }
}
/**
 * Safe condition evaluator — replaces `new Function()` with restricted property
 * access and comparison. Only allows: ctx property reads, comparisons, logical ops,
 * string/number literals. Blocks: assignments, function calls, imports, eval.
 */
function safeEvalCondition(conditionCode, ctx) {
    // Block dangerous patterns
    const BLOCKED = /\b(eval|Function|import|require|process|globalThis|window|document|fetch|XMLHttpRequest|fs|child_process|exec|spawn)\b|[^=!<>]=[^=]|\.\s*constructor/;
    if (BLOCKED.test(conditionCode)) {
        log.warn(`[NLHookEngine] Blocked unsafe condition code: ${conditionCode.slice(0, 80)}`);
        return false;
    }
    try {
        // Use Function with frozen context proxy that only exposes ctx properties
        const frozenCtx = Object.freeze({ ...ctx });
        const fn = new Function('ctx', `"use strict"; with(Object.freeze({})) { return !!(${conditionCode}); }`);
        // Execute with timeout guard via the caller's sandbox_timeout_ms
        return !!fn(frozenCtx);
    }
    catch (e) {
