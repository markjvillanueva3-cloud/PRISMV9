#!/usr/bin/env node
// tier: T3
/**
 * Meta-Learning Trigger — PostToolUse Hook
 *
 * Triggers meta-learning operations when data thresholds are reached:
 * - After 20+ dev outcomes: Suggest MetaLearningOptimizerEngine
 * - After 5+ failures: Suggest SelfImprovementPatternEngine
 * - After accuracy drift: Suggest EngineAccuracyTrackerEngine recalibration
 *
 * This ensures the AI system continuously improves from development activity.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TRIGGER_STATE_PATH = 'H:/prism/mcp-server/data/state/meta-learning-trigger-state.json';
const DEV_OUTCOMES_PATH = 'H:/prism/mcp-server/data/state/dev-outcomes.jsonl';

// Read stdin
let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const tool = payload.tool_name || payload.tool || '';

// Only trigger on certain tools
if (!['Bash', 'Write', 'Edit'].includes(tool)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// ============================================================================
// LOAD STATE
// ============================================================================

let state = {
  lastMetaLearningCheck: null,
  lastSelfImprovementCheck: null,
  lastAccuracyCheck: null,
  outcomeCountAtLastCheck: 0,
  failureCountAtLastCheck: 0
};

try {
  if (existsSync(TRIGGER_STATE_PATH)) {
    state = JSON.parse(readFileSync(TRIGGER_STATE_PATH, 'utf8'));
  }
} catch { /* use defaults */ }

// Count outcomes
let outcomeCount = 0;
let failureCount = 0;
try {
  if (existsSync(DEV_OUTCOMES_PATH)) {
    const lines = readFileSync(DEV_OUTCOMES_PATH, 'utf8').trim().split('\n').filter(Boolean);
    outcomeCount = lines.length;
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (record.outcome === 'failure') failureCount++;
      } catch { /* skip */ }
    }
  }
} catch { /* ignore */ }

// ============================================================================
// CHECK THRESHOLDS
// ============================================================================

const actions = [];
const OUTCOMES_THRESHOLD = 20;
const FAILURES_THRESHOLD = 5;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const now = Date.now();

// Meta-learning threshold
const newOutcomesSinceLastCheck = outcomeCount - (state.outcomeCountAtLastCheck || 0);
const timeSinceMetaLearning = state.lastMetaLearningCheck
  ? now - new Date(state.lastMetaLearningCheck).getTime()
  : Infinity;

if (newOutcomesSinceLastCheck >= OUTCOMES_THRESHOLD && timeSinceMetaLearning > CHECK_INTERVAL_MS) {
  actions.push({
    engine: 'MetaLearningOptimizerEngine',
    action: 'optimize()',
    reason: `${newOutcomesSinceLastCheck} new outcomes since last check`,
    command: 'prism_ai:meta_learn'
  });
  state.lastMetaLearningCheck = new Date().toISOString();
  state.outcomeCountAtLastCheck = outcomeCount;
}

// Self-improvement threshold
const newFailuresSinceLastCheck = failureCount - (state.failureCountAtLastCheck || 0);
const timeSinceSelfImprovement = state.lastSelfImprovementCheck
  ? now - new Date(state.lastSelfImprovementCheck).getTime()
  : Infinity;

if (newFailuresSinceLastCheck >= FAILURES_THRESHOLD && timeSinceSelfImprovement > CHECK_INTERVAL_MS) {
  actions.push({
    engine: 'SelfImprovementPatternEngine',
    action: 'detect()',
    reason: `${newFailuresSinceLastCheck} new failures to analyze`,
    command: 'prism_dev:detect_improvement_patterns'
  });
  state.lastSelfImprovementCheck = new Date().toISOString();
  state.failureCountAtLastCheck = failureCount;
}

// Save state
try {
  const dir = dirname(TRIGGER_STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(TRIGGER_STATE_PATH, JSON.stringify(state, null, 2));
} catch { /* ignore */ }

// ============================================================================
// OUTPUT
// ============================================================================

if (actions.length === 0) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const parts = ['## Meta-Learning Activation'];
parts.push('Thresholds reached — learning opportunities available:');
for (const action of actions) {
  parts.push(`  - **${action.engine}.${action.action}**: ${action.reason}`);
  parts.push(`    → Invoke via: ${action.command}`);
}

console.log(JSON.stringify({
  continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: parts.join('\n'),
      }
    }));
