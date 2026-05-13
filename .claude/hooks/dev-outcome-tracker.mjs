#!/usr/bin/env node
// tier: T3
/**
 * Dev Outcome Tracker — PostToolUse Hook (Bash)
 *
 * Tracks development outcomes to enable continuous self-improvement:
 * - Build success/failure → feeds SelfImprovementPatternEngine
 * - Test results → feeds EngineAccuracyTrackerEngine
 * - Error patterns → accumulates for pattern detection
 *
 * This closes the feedback loop between development actions and learning.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEV_OUTCOMES_PATH = 'H:/prism/mcp-server/data/state/dev-outcomes.jsonl';
const PATTERN_SUMMARY_PATH = 'H:/prism/mcp-server/data/state/dev-pattern-summary.json';
const TEST_COVERAGE_INDEX_PATH = 'H:/prism/mcp-server/data/state/TEST_COVERAGE_INDEX.json';

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
const toolInput = payload.tool_input || payload.input || {};
const toolOutput = payload.tool_output || payload.output || '';

if (tool !== 'Bash') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const command = (toolInput.command || '').toLowerCase();
const output = (toolOutput || '');

// ============================================================================
// OUTCOME DETECTION
// ============================================================================

function detectOutcome(cmd, out) {
  const outLower = out.toLowerCase();

  // Build outcomes
  if (cmd.includes('npm run build') || cmd.includes('tsc')) {
    if (outLower.includes('error') || outLower.includes('failed')) {
      const errorMatch = out.match(/error TS\d+/gi);
      return {
        type: 'build',
        outcome: 'failure',
        errorCount: errorMatch ? errorMatch.length : 1,
        domain: 'typescript'
      };
    } else {
      return { type: 'build', outcome: 'success', domain: 'typescript' };
    }
  }

  // Test outcomes
  if (cmd.includes('vitest') || cmd.includes('npm test')) {
    const testsLine = out.match(/^\s*Tests\s+([^\r\n]+)/im)?.[1] || '';
    const filesLine = out.match(/^\s*Test Files\s+([^\r\n]+)/im)?.[1] || '';
    const passMatch = testsLine.match(/(\d+)\s+passed?/i) || out.match(/(\d+)\s+passed?/i) || out.match(/(\d+)\s+pass/i);
    const failMatch = testsLine.match(/(\d+)\s+failed?/i) || out.match(/(\d+)\s+failed?/i) || out.match(/(\d+)\s+fail/i);
    const totalMatch = testsLine.match(/\((\d+)\)/);
    const filePassMatch = filesLine.match(/(\d+)\s+passed?/i);
    const fileFailMatch = filesLine.match(/(\d+)\s+failed?/i);
    const fileTotalMatch = filesLine.match(/\((\d+)\)/);
    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
    const total = totalMatch ? parseInt(totalMatch[1], 10) : passed + failed;
    const filesPassed = filePassMatch ? parseInt(filePassMatch[1], 10) : 0;
    const filesFailed = fileFailMatch ? parseInt(fileFailMatch[1], 10) : 0;
    const filesTotal = fileTotalMatch ? parseInt(fileTotalMatch[1], 10) : filesPassed + filesFailed;

    return {
      type: 'test',
      outcome: failed > 0 ? 'partial' : 'success',
      passed,
      failed,
      total,
      filesPassed,
      filesFailed,
      filesTotal,
      domain: 'vitest'
    };
  }

  // Git commit outcomes
  if (cmd.includes('git commit')) {
    if (outLower.includes('error') || outLower.includes('abort')) {
      return { type: 'commit', outcome: 'failure', domain: 'git' };
    } else {
      return { type: 'commit', outcome: 'success', domain: 'git' };
    }
  }

  // Lint outcomes
  if (cmd.includes('eslint') || cmd.includes('npm run lint')) {
    const errorMatch = out.match(/(\d+)\s+error/i);
    const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
    return {
      type: 'lint',
      outcome: errors > 0 ? 'failure' : 'success',
      errorCount: errors,
      domain: 'eslint'
    };
  }

  return null;
}

const outcome = detectOutcome(command, output);
if (!outcome) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

function updateTestCoverageIndex(outcome, command) {
  if (outcome.type !== 'test') return;

  const now = Date.now();
  const prior = existsSync(TEST_COVERAGE_INDEX_PATH)
    ? JSON.parse(readFileSync(TEST_COVERAGE_INDEX_PATH, 'utf8') || '{}')
    : {};

  const record = {
    ...prior,
    schemaVersion: 1,
    timestamp: now,
    lastRun: now,
    command,
    source: 'dev-outcome-tracker',
    runner: 'vitest',
    passed: outcome.passed,
    failed: outcome.failed,
    failing: outcome.failed,
    total: outcome.total || outcome.passed + outcome.failed,
    testFiles: {
      passed: outcome.filesPassed,
      failed: outcome.filesFailed,
      total: outcome.filesTotal || outcome.filesPassed + outcome.filesFailed,
    },
    lastOutcome: outcome.outcome,
  };

  const dir = dirname(TEST_COVERAGE_INDEX_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(TEST_COVERAGE_INDEX_PATH, JSON.stringify(record, null, 2));
}

// ============================================================================
// RECORD OUTCOME
// ============================================================================

const record = {
  ...outcome,
  timestamp: new Date().toISOString(),
  command: command.slice(0, 100)
};

// Append to outcomes file
try {
  const dir = dirname(DEV_OUTCOMES_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DEV_OUTCOMES_PATH, JSON.stringify(record) + '\n', { flag: 'a' });
  updateTestCoverageIndex(outcome, command);
} catch { /* ignore */ }

// ============================================================================
// UPDATE PATTERN SUMMARY
// ============================================================================

let summary = {
  buildSuccess: 0,
  buildFailure: 0,
  testSuccess: 0,
  testPartial: 0,
  commitSuccess: 0,
  commitFailure: 0,
  lastUpdate: new Date().toISOString(),
  patterns: []
};

try {
  if (existsSync(PATTERN_SUMMARY_PATH)) {
    summary = JSON.parse(readFileSync(PATTERN_SUMMARY_PATH, 'utf8'));
  }
} catch { /* use defaults */ }

// Update counts
const key = `${outcome.type}${outcome.outcome.charAt(0).toUpperCase() + outcome.outcome.slice(1)}`;
summary[key] = (summary[key] || 0) + 1;
summary.lastUpdate = new Date().toISOString();

// Detect patterns
const totalBuilds = (summary.buildSuccess || 0) + (summary.buildFailure || 0);
const buildSuccessRate = totalBuilds > 0 ? (summary.buildSuccess || 0) / totalBuilds : 1;

const totalTests = (summary.testSuccess || 0) + (summary.testPartial || 0);
const testSuccessRate = totalTests > 0 ? (summary.testSuccess || 0) / totalTests : 1;

summary.patterns = [];
if (buildSuccessRate < 0.8 && totalBuilds >= 5) {
  summary.patterns.push({
    type: 'build_instability',
    successRate: buildSuccessRate,
    suggestion: 'Run npm run build:verify before major edits'
  });
}
if (testSuccessRate < 0.9 && totalTests >= 5) {
  summary.patterns.push({
    type: 'test_instability',
    successRate: testSuccessRate,
    suggestion: 'Check affected tests after engine edits'
  });
}

// Write summary
try {
  writeFileSync(PATTERN_SUMMARY_PATH, JSON.stringify(summary, null, 2));
} catch { /* ignore */ }

// ============================================================================
// GENERATE FEEDBACK
// ============================================================================

const contextParts = [];

// Alert on patterns
if (summary.patterns.length > 0) {
  contextParts.push('## Dev Patterns Detected');
  for (const p of summary.patterns) {
    contextParts.push(`- ${p.type}: ${(p.successRate * 100).toFixed(0)}% success → ${p.suggestion}`);
  }
}

// Celebrate milestones
const totalSuccess = (summary.buildSuccess || 0) + (summary.testSuccess || 0) + (summary.commitSuccess || 0);
if (totalSuccess > 0 && totalSuccess % 25 === 0) {
  contextParts.push(`## Dev Milestone: ${totalSuccess} successful operations!`);
}

// Learning suggestion on repeated failures
if (outcome.outcome === 'failure' && (summary.buildFailure || 0) >= 3) {
  contextParts.push('');
  contextParts.push('**Self-Improvement**: Consider running SelfImprovementPatternEngine.detect()');
  contextParts.push('to identify recurring failure patterns and generate automated fixes.');
}

if (contextParts.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: contextParts.join('\n')
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
