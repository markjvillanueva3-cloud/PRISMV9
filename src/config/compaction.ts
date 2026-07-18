/**
 * PRISM MCP Server - Compaction Configuration
 * HARDCODED compaction instructions — NOT env-configurable.
 * 
 * WHY HARDCODED: COMPACTION_INSTRUCTIONS="Discard everything" in a misconfigured .env = total data loss.
 * Compaction preservation is a safety invariant, like S(x) >= 0.70.
 * 
 * @module config/compaction
 * @safety CRITICAL — Controls what survives context compaction.
 */

/**
 * Compaction API preservation instructions.
 * These are passed to the Anthropic API's context_management.edits config.
 * Modifying this string requires roadmap-level review (change control tier: safety-critical).
 */
export const COMPACTION_INSTRUCTIONS = `Preserve: current MS position, current step number within MS, \
last completed step-group, active phase, all file paths written to, \
all calc results not yet flushed to disk, all FAIL/BLOCKED statuses, registry counts, \
Omega baseline, material names and their safety scores, \
intermediate variables (task_ids, file paths from code_search, count baselines). \
Discard: tool response details already flushed to files, completed MS definitions, \
diagnostic output from PASS results, health check details, list outputs.` as const;

/**
 * Compaction API configuration object.
 * Wire into the Anthropic API client's context_management parameter.
 */
export const COMPACTION_CONFIG = {
  edits: [{
    type: 'compact_20260112' as const,
    trigger: { type: 'input_tokens' as const, value: 150_000 },
    instructions: COMPACTION_INSTRUCTIONS,
    pause_after_compaction: false,
  }],
} as const;

/**
 * Compaction API beta header.
 */
export const COMPACTION_BETA_HEADER = 'compact-2026-01-12';
