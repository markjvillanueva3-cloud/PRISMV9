#!/usr/bin/env node
// tier: T4
/**
 * session-learning-feedback.mjs — Stop Hook
 * ==========================================
 *
 * Captures session outcomes for the AI augmentation learning loop.
 * Feeds successful patterns and failed approaches to the learning engines.
 *
 * What it captures:
 * - Task success/failure signals from transcript
 * - Approaches used (MCP actions, tools, reasoning patterns)
 * - Token spend per task category
 * - Error→fix pairs that worked
 *
 * Where it writes:
 * - state/shared/session-learning-log.jsonl (append-only, atomic)
 * - Optionally: OutcomeCaptureBus via MCP action
 *
 * @hook Stop
 * @milestone CAM-EXHAUST-MS0 / AI-AUGMENT
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const REPO_ROOT = "H:/prism";
const STATE_DIR = `${REPO_ROOT}/state/shared`;
const LEARNING_LOG = `${STATE_DIR}/session-learning-log.jsonl`;
const SESSION_METRICS = `${REPO_ROOT}/state/token-economy.json`;

// Patterns that indicate task success
const SUCCESS_SIGNALS = [
  /✓|✔|completed|success|done|fixed|resolved|built|created|implemented|wired/i,
  /tests? pass/i,
  /build succeeded/i,
  /committed/i,
  /\[completed\]/i,
];

// Patterns that indicate task failure
const FAILURE_SIGNALS = [
  /✗|✘|failed|error|exception|blocked|rejected|aborted/i,
  /tests? fail/i,
  /build failed/i,
  /could not|cannot|unable/i,
];

// MCP actions worth tracking for pattern learning
const TRACKED_ACTIONS = [
  /prism_ai\.(deep_reason|extended_think|deep_learn)/,
  /prism_intelligence\.(physics_validate|search_tribal|ai_route)/,
  /prism_calc\./,
  /prism_cam\./,
];

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function parseStdinSync() {
  try {
    const input = readFileSync(0, "utf8").trim();
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}

function extractSessionSignals(transcript) {
  const signals = {
    tasks: [],
    approaches: [],
    errors: [],
    fixes: [],
    mcpActions: [],
    successCount: 0,
    failureCount: 0,
  };

  if (!transcript) return signals;

  const lines = transcript.split("\n");
  let currentTask = null;

  for (const line of lines) {
    // Detect task boundaries
    if (/^#?\s*Task\s+\d+|^\*\*Task/i.test(line)) {
      if (currentTask) signals.tasks.push(currentTask);
      currentTask = { description: line.trim(), outcome: "unknown", approaches: [] };
    }

    // Detect success
    if (SUCCESS_SIGNALS.some(p => p.test(line))) {
      signals.successCount++;
      if (currentTask) currentTask.outcome = "success";
    }

    // Detect failure
    if (FAILURE_SIGNALS.some(p => p.test(line))) {
      signals.failureCount++;
      if (currentTask && currentTask.outcome !== "success") {
        currentTask.outcome = "failure";
      }
    }

    // Detect MCP actions
    for (const pattern of TRACKED_ACTIONS) {
      const match = line.match(pattern);
      if (match) {
        signals.mcpActions.push(match[0]);
        if (currentTask) currentTask.approaches.push(match[0]);
      }
    }

    // Detect error→fix pairs
    if (/error|exception|failed/i.test(line)) {
      signals.errors.push(line.substring(0, 200));
    }
    if (/fixed|resolved|solution:/i.test(line)) {
      signals.fixes.push(line.substring(0, 200));
    }
  }

  if (currentTask) signals.tasks.push(currentTask);

  return signals;
}

function buildLearningEvent(input, signals, tokenMetrics) {
  return {
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: input.session_id || process.env.CLAUDE_SESSION_ID || "unknown",
    agent_id: process.env.CLAUDE_AGENT_ID || "claude-code",

    // Task-level outcomes
    tasks_completed: signals.tasks.filter(t => t.outcome === "success").length,
    tasks_failed: signals.tasks.filter(t => t.outcome === "failure").length,
    tasks_unknown: signals.tasks.filter(t => t.outcome === "unknown").length,

    // Approach effectiveness
    mcp_actions_used: [...new Set(signals.mcpActions)],
    mcp_action_count: signals.mcpActions.length,

    // Error→fix pairs (valuable for ErrorPatternMemoryEngine)
    error_fix_pairs: signals.errors.slice(0, 5).map((e, i) => ({
      error: e,
      fix: signals.fixes[i] || null,
    })),

    // Token economy
    tokens_spent: tokenMetrics?.total || null,
    tokens_by_category: tokenMetrics?.byCategory || null,

    // Raw signal counts for trend analysis
    success_signals: signals.successCount,
    failure_signals: signals.failureCount,
  };
}

function atomicAppend(filePath, line) {
  ensureDir(filePath);
  try {
    appendFileSync(filePath, line + "\n", { flag: "a" });
    return true;
  } catch (err) {
    console.error(`[session-learning] Append failed: ${err.message}`);
    return false;
  }
}

async function main() {
  const input = parseStdinSync();

  // Read transcript if available
  const transcriptPath = input.transcript_path;
  let transcript = "";
  if (transcriptPath && existsSync(transcriptPath)) {
    try {
      // Read last 50KB of transcript (recent context)
      const stats = readFileSync(transcriptPath);
      transcript = stats.toString("utf8").slice(-50000);
    } catch {
      // Non-blocking: proceed without transcript
    }
  }

  // Extract signals from transcript
  const signals = extractSessionSignals(transcript);

  // Read token metrics if available
  const tokenMetrics = readJson(SESSION_METRICS, null);

  // Build learning event
  const event = buildLearningEvent(input, signals, tokenMetrics);

  // Append to learning log (atomic, append-only)
  const eventLine = JSON.stringify(event);
  const writeOk = atomicAppend(LEARNING_LOG, eventLine);

  // Build summary for Claude
  const summary = [];
  if (event.tasks_completed > 0) {
    summary.push(`✓ ${event.tasks_completed} tasks completed`);
  }
  if (event.tasks_failed > 0) {
    summary.push(`✗ ${event.tasks_failed} tasks failed`);
  }
  if (event.mcp_actions_used.length > 0) {
    summary.push(`AI actions: ${event.mcp_actions_used.slice(0, 3).join(", ")}`);
  }
  if (event.error_fix_pairs.length > 0) {
    summary.push(`${event.error_fix_pairs.length} error→fix pairs captured`);
  }

  // Output for Stop hook — must use top-level systemMessage. The Stop event
  // is not in the harness hookSpecificOutput allow-list, and a bare
  // additionalContext key at top level is rejected with "unknown top-level
  // key" so the learning summary is silently dropped.
  console.log(JSON.stringify({
    continue: true,
    systemMessage: summary.length > 0
      ? `Session learning captured: ${summary.join("; ")}.`
      : "Session learning: no significant patterns detected.",
  }));
}

main().catch(err => {
  console.error("[session-learning] Hook error:", err.message);
  console.log(JSON.stringify({}));
  process.exit(0); // Never block session end
});
