#!/usr/bin/env node
// tier: T4
/**
 * Self-Improvement Activation — SessionStart Hook
 *
 * Analyzes accumulated development patterns and surfaces improvement
 * opportunities at session start. Connects to:
 * - SelfImprovementPatternEngine (pattern detection)
 * - EngineAccuracyTrackerEngine (accuracy monitoring)
 * - MetaLearningOptimizerEngine (learning strategy)
 *
 * Enables continuous self-improvement by:
 * 1. Reading dev-outcomes.jsonl for historical patterns
 * 2. Computing improvement priorities
 * 3. Surfacing actionable suggestions
 */

import { readFileSync, existsSync } from 'node:fs';

const DEV_OUTCOMES_PATH = 'H:/prism/mcp-server/data/state/dev-outcomes.jsonl';
const PATTERN_SUMMARY_PATH = 'H:/prism/mcp-server/data/state/dev-pattern-summary.json';
const ERROR_MEMORY_PATH = 'H:/prism/mcp-server/data/state/error-memory.json';
const SUCCESS_PATTERNS_PATH = 'H:/prism/mcp-server/data/state/success-patterns.json';

// ============================================================================
// LOAD STATE
// ============================================================================

function loadJsonSafe(path, defaultVal) {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8'));
    }
  } catch { /* ignore */ }
  return defaultVal;
}

function loadJsonlSafe(path, limit = 100) {
  const records = [];
  try {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      for (const line of lines.slice(-limit)) {
        try {
          records.push(JSON.parse(line));
        } catch { /* skip malformed */ }
      }
    }
  } catch { /* ignore */ }
  return records;
}

const devOutcomes = loadJsonlSafe(DEV_OUTCOMES_PATH, 50);
const patternSummary = loadJsonSafe(PATTERN_SUMMARY_PATH, {});
const errorMemory = loadJsonSafe(ERROR_MEMORY_PATH, { errors: [], fixes: {} });
const successPatterns = loadJsonSafe(SUCCESS_PATTERNS_PATH, { stats: {} });

// ============================================================================
// PATTERN ANALYSIS
// ============================================================================

function analyzePatterns() {
  const improvements = [];

  // 1. Build failure patterns
  const buildFailures = devOutcomes.filter(o => o.type === 'build' && o.outcome === 'failure');
  if (buildFailures.length >= 3) {
    const errorDomains = buildFailures.map(f => f.domain || 'unknown');
    const commonDomain = mode(errorDomains);
    improvements.push({
      type: 'repeated_build_failure',
      priority: buildFailures.length * 0.8,
      suggestion: `Build failures (${buildFailures.length}x) in ${commonDomain} — consider adding pre-edit validation`,
      fixType: 'hook'
    });
  }

  // 2. Test instability
  const testOutcomes = devOutcomes.filter(o => o.type === 'test');
  const failingTests = testOutcomes.filter(o => o.outcome === 'partial' || o.outcome === 'failure');
  if (failingTests.length >= 2) {
    improvements.push({
      type: 'test_instability',
      priority: failingTests.length * 0.6,
      suggestion: `Test failures detected (${failingTests.length}x) — run focused test suite before commit`,
      fixType: 'script'
    });
  }

  // 3. Repeated errors (from error-memory.json)
  const repeatedErrors = Object.entries(
    errorMemory.errors?.reduce((acc, e) => {
      acc[e.key] = (acc[e.key] || 0) + 1;
      return acc;
    }, {}) || {}
  ).filter(([_, count]) => count >= 2);

  for (const [errorKey, count] of repeatedErrors) {
    const existingFix = errorMemory.fixes?.[errorKey];
    if (!existingFix) {
      improvements.push({
        type: 'unresolved_repeated_error',
        priority: count * 1.0,
        suggestion: `Error "${errorKey}" occurred ${count}x without recorded fix — document the solution`,
        fixType: 'knowledge'
      });
    }
  }

  // 4. Success patterns to amplify
  const stats = successPatterns.stats || {};
  const totalSuccess = (stats.builds || 0) + (stats.tests || 0) + (stats.commits || 0);
  if (totalSuccess >= 50) {
    improvements.push({
      type: 'success_pattern',
      priority: 0.3,
      suggestion: `${totalSuccess} successful operations — consider extracting reusable patterns`,
      fixType: 'skill'
    });
  }

  return improvements.sort((a, b) => b.priority - a.priority);
}

function mode(arr) {
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
}

// ============================================================================
// LEARNING OPPORTUNITIES
// ============================================================================

function identifyLearningOpportunities() {
  const opportunities = [];

  // Check for engines that could benefit from calibration
  const uniqueEngines = new Set(devOutcomes.map(o => o.domain).filter(Boolean));
  if (uniqueEngines.size >= 3) {
    opportunities.push({
      type: 'cross_engine_learning',
      action: 'EngineAccuracyTrackerEngine.getAccuracyReport()',
      reason: `${uniqueEngines.size} domains active — check for accuracy drift`
    });
  }

  // Check for meta-learning opportunity
  if (devOutcomes.length >= 20) {
    opportunities.push({
      type: 'meta_learning',
      action: 'MetaLearningOptimizerEngine.optimize()',
      reason: `${devOutcomes.length} outcomes logged — sufficient data for meta-learning`
    });
  }

  // Check for self-improvement pattern detection
  const failures = devOutcomes.filter(o => o.outcome === 'failure');
  if (failures.length >= 5) {
    opportunities.push({
      type: 'self_improvement',
      action: 'SelfImprovementPatternEngine.detect()',
      reason: `${failures.length} failures logged — detect recurring patterns`
    });
  }

  return opportunities;
}

// ============================================================================
// GENERATE OUTPUT
// ============================================================================

const improvements = analyzePatterns();
const learningOps = identifyLearningOpportunities();

if (improvements.length === 0 && learningOps.length === 0) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const parts = [];
parts.push('## Self-Improvement System');

if (improvements.length > 0) {
  parts.push('**Improvement Opportunities** (by priority):');
  for (const imp of improvements.slice(0, 3)) {
    parts.push(`  - [${imp.fixType}] ${imp.suggestion}`);
  }
}

if (learningOps.length > 0) {
  parts.push('');
  parts.push('**Learning Actions Available**:');
  for (const op of learningOps) {
    parts.push(`  - ${op.action} — ${op.reason}`);
  }
}

// Summary stats
const successRate = devOutcomes.length > 0
  ? devOutcomes.filter(o => o.outcome === 'success').length / devOutcomes.length
  : 1;
parts.push('');
parts.push(`Dev Success Rate: ${(successRate * 100).toFixed(0)}% (${devOutcomes.length} outcomes tracked)`);

console.log(JSON.stringify({
  continue: true,
  additionalContext: parts.join('\n')
}));
