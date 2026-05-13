#!/usr/bin/env node
// tier: T3
/**
 * Efficiency Monitor — PostToolUse Hook
 *
 * Tracks efficiency metrics and alerts on waste:
 * - Repeated file reads
 * - Duplicate searches
 * - Rework patterns
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const METRICS_PATH = 'H:/prism/mcp-server/data/state/efficiency-metrics.json';
const ALERT_THRESHOLD = 3;

function loadMetrics() {
  try {
    if (existsSync(METRICS_PATH)) {
      return JSON.parse(readFileSync(METRICS_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return {
    sessionStart: new Date().toISOString(),
    reads: {},
    greps: {},
    totalOps: 0,
    cacheHits: 0,
    duplicates: 0
  };
}

function saveMetrics(metrics) {
  try {
    writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));
  } catch { /* ignore */ }
}

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  const metrics = loadMetrics();
  metrics.totalOps++;

  let alert = null;

  // Track file reads
  if (toolName === 'Read') {
    const path = toolInput.file_path || '';
    if (path) {
      metrics.reads[path] = (metrics.reads[path] || 0) + 1;
      if (metrics.reads[path] >= ALERT_THRESHOLD) {
        metrics.duplicates++;
        alert = `File read ${metrics.reads[path]}x: ${path.split('/').pop()} — consider caching key info`;
      }
    }
  }

  // Track grep patterns
  if (toolName === 'Grep') {
    const pattern = toolInput.pattern || '';
    if (pattern) {
      metrics.greps[pattern] = (metrics.greps[pattern] || 0) + 1;
      if (metrics.greps[pattern] >= ALERT_THRESHOLD) {
        metrics.duplicates++;
        alert = `Same grep ${metrics.greps[pattern]}x: "${pattern.slice(0, 30)}" — result should be cached`;
      }
    }
  }

  // Save metrics every 10 ops
  if (metrics.totalOps % 10 === 0) {
    saveMetrics(metrics);
  }

  if (alert) {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `## Efficiency Alert\n${alert}`
    } }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
