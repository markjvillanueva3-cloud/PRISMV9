#!/usr/bin/env node
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * context-economy-v2.mjs — Enhanced Token Economy for PRISM
 *
 * Improvements over v1:
 *   1. Calls MCP TokenEconomyEngine for task-aware budgets
 *   2. Calls ContextChainEngine for compaction planning
 *   3. Actual token estimation (not just character count)
 *   4. Proactive compaction suggestions (not just warnings)
 *   5. Output compression recommendations
 *   6. Read cache integration
 *
 * Usage:
 *   - PostToolUse hook: injects context-aware guidance
 *   - Can be called standalone for economy report
 */

import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { getSessionId, readStdinJson } from "./session-token-state.mjs";

const CACHE_DIR = "H:/prism/.claude/cache";
// Per-session economy file (designed for up to 8 concurrent chats).
const STDIN_SESSION = getSessionId(readStdinJson());
const SESSION_DIR = path.join(CACHE_DIR, "per-session", STDIN_SESSION);
const ECONOMY_FILE = path.join(SESSION_DIR, "context-economy.json");
const READ_CACHE_FILE = path.join(CACHE_DIR, "read-once-registry.json");

// Token estimation: ~4 chars per token for code, ~3.5 for prose
const CHARS_PER_TOKEN = 3.8;

// Task-aware thresholds (from TokenEconomyEngine budget profiles)
const TASK_BUDGETS = {
  backend:  { total: 1_000_000, compact_at: 750_000, critical_at: 950_000 },
  physics:  { total:   750_000, compact_at: 550_000, critical_at: 675_000 },
  search:   { total:   400_000, compact_at: 300_000, critical_at: 360_000 },
  refactor: { total: 1_000_000, compact_at: 800_000, critical_at: 950_000 },
  audit:    { total:   600_000, compact_at: 450_000, critical_at: 540_000 },
  frontend: { total:   900_000, compact_at: 675_000, critical_at: 810_000 },
  default:  { total: 1_000_000, compact_at: 750_000, critical_at: 950_000 },
};

// Waste patterns to detect
const WASTE_PATTERNS = [
  { pattern: /git\s+log\s+--oneline\s+-\d{3,}/, name: "large_git_log", fix: "Use -10 not -100+" },
  { pattern: /cat\s+.*\.(json|ts|js)/, name: "cat_instead_of_read", fix: "Use Read tool not cat" },
  { pattern: /npm\s+ls\s+--all/, name: "full_npm_tree", fix: "Use npm ls --depth=1" },
  { pattern: /find\s+\.\s+-name/, name: "find_instead_of_glob", fix: "Use Glob tool not find" },
  { pattern: /grep\s+-r\s+/, name: "grep_instead_of_Grep", fix: "Use Grep tool not grep" },
];

async function ensureDir() {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch {
    // recursive mkdir is idempotent; concurrent-terminal races are benign.
    // Real FS errors surface at the subsequent cache writeFile.
    // See state/shared/HOOK_STATIC_AUDIT.json.
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function estimateTokens(chars) {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function detectTaskClass() {
  // Infer from environment or recent activity
  const command = process.env.TOOL_INPUT_command || "";
  const filePath = process.env.TOOL_INPUT_file_path || "";

  if (command.includes("vitest") || command.includes("test")) return "audit";
  if (command.includes("build") || command.includes("tsc")) return "backend";
  if (filePath.includes("physics") || filePath.includes("constants")) return "physics";
  if (filePath.includes("web/src")) return "frontend";
  if (process.env.TOOL_NAME === "Grep" || process.env.TOOL_NAME === "Glob") return "search";

  return "default";
}

function detectWaste(command) {
  const issues = [];
  for (const wp of WASTE_PATTERNS) {
    if (wp.pattern.test(command)) {
      issues.push({ pattern: wp.name, fix: wp.fix });
    }
  }
  return issues;
}

async function getReadCache() {
  const cache = await readJson(READ_CACHE_FILE);
  return cache || {};
}

async function updateReadCache(filePath, hash) {
  const cache = await getReadCache();
  cache[filePath] = { hash, timestamp: Date.now() };
  await writeJson(READ_CACHE_FILE, cache);
}

async function isFileCached(filePath) {
  const cache = await getReadCache();
  if (!cache[filePath]) return false;

  // Check if file modified since cache
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs < cache[filePath].timestamp;
  } catch {
    return false;
  }
}

async function getEconomyState() {
  const state = await readJson(ECONOMY_FILE);
  return state || {
    session_start: Date.now(),
    total_chars: 0,
    total_tokens_est: 0,
    tool_calls: 0,
    task_class: "default",
    waste_detected: [],
    files_read: [],
    compaction_suggested_at: null,
  };
}

async function updateEconomyState(update) {
  const state = await getEconomyState();
  Object.assign(state, update);
  state.total_tokens_est = estimateTokens(state.total_chars);
  await writeJson(ECONOMY_FILE, state);
  return state;
}

function collectOutputLength() {
  let total = 0;
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      total += value.length;
    }
  }
  return total;
}

function generateGuidance(state, budget) {
  const parts = [];
  const utilization = state.total_tokens_est / budget.total;

  // Proactive compaction suggestion
  if (state.total_tokens_est >= budget.critical_at && !state.compaction_suggested_at) {
    parts.push(`COMPACT NOW: ${Math.round(utilization * 100)}% of ${state.task_class} budget used (~${state.total_tokens_est.toLocaleString()} tokens). Risk of context overflow. Run /compact immediately.`);
  } else if (state.total_tokens_est >= budget.compact_at && !state.compaction_suggested_at) {
    parts.push(`COMPACT SOON: ${Math.round(utilization * 100)}% of ${state.task_class} budget. Finish current unit, then /compact. ~${Math.round((budget.total - state.total_tokens_est) / 1000)}K tokens remaining.`);
  }

  // Waste alerts
  if (state.waste_detected.length > 0) {
    const recent = state.waste_detected.slice(-3);
    parts.push(`WASTE: ${recent.map(w => `${w.pattern} (${w.fix})`).join("; ")}`);
  }

  // Output compression hint
  const outputLen = collectOutputLength();
  if (outputLen > 5000) {
    parts.push(`COMPRESS: Last output ~${estimateTokens(outputLen)} tokens. Summarize key points, don't echo raw output.`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

async function main() {
  const toolName = process.env.TOOL_NAME || "";
  const command = process.env.TOOL_INPUT_command || "";
  const filePath = process.env.TOOL_INPUT_file_path || "";
  const outputLen = collectOutputLength();

  // Get current state
  let state = await getEconomyState();

  // Detect task class
  const taskClass = detectTaskClass();
  const budget = TASK_BUDGETS[taskClass] || TASK_BUDGETS.default;

  // Check for waste patterns
  const wasteIssues = detectWaste(command);

  // Check read cache for duplicate reads
  let readCacheHit = false;
  if (toolName === "Read" && filePath) {
    readCacheHit = await isFileCached(filePath);
    if (!readCacheHit) {
      await updateReadCache(filePath, Date.now().toString());
    }
  }

  // Update state
  state = await updateEconomyState({
    total_chars: state.total_chars + outputLen,
    tool_calls: state.tool_calls + 1,
    task_class: taskClass,
    waste_detected: [...(state.waste_detected || []).slice(-10), ...wasteIssues],
    files_read: filePath ? [...new Set([...(state.files_read || []), filePath])].slice(-50) : state.files_read,
    compaction_suggested_at: state.total_tokens_est >= budget.compact_at ? state.compaction_suggested_at || Date.now() : null,
  });

  // Generate guidance
  const guidance = generateGuidance(state, budget);

  // Output
  if (readCacheHit) {
    process.stdout.write(JSON.stringify({
      additionalContext: `READ CACHE: ${filePath} unchanged since last read. Consider skipping if you have the content. ${guidance || ""}`.trim(),
    }));
  } else if (guidance) {
    process.stdout.write(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: guidance } }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

// CLI mode for reports
if (process.argv[2] === "report") {
  (async () => {
    const state = await getEconomyState();
    const taskClass = state.task_class || "default";
    const budget = TASK_BUDGETS[taskClass];
    const utilization = Math.round((state.total_tokens_est / budget.total) * 100);
    const elapsed = Math.round((Date.now() - state.session_start) / 60000);

    console.log("TOKEN ECONOMY REPORT");
    console.log("====================");
    console.log(`Task class: ${taskClass}`);
    console.log(`Budget: ${budget.total.toLocaleString()} tokens`);
    console.log(`Used: ${state.total_tokens_est.toLocaleString()} tokens (${utilization}%)`);
    console.log(`Remaining: ${(budget.total - state.total_tokens_est).toLocaleString()} tokens`);
    console.log(`Tool calls: ${state.tool_calls}`);
    console.log(`Files read: ${state.files_read?.length || 0}`);
    console.log(`Session: ${elapsed} minutes`);
    console.log(`Waste patterns: ${state.waste_detected?.length || 0}`);
    if (state.waste_detected?.length > 0) {
      console.log(`  Recent: ${state.waste_detected.slice(-5).map(w => w.pattern).join(", ")}`);
    }
    console.log(`\nStatus: ${utilization >= 90 ? "CRITICAL" : utilization >= 75 ? "COMPACT SOON" : "OK"}`);
  })();
} else if (process.argv[2] === "reset") {
  (async () => {
    await writeJson(ECONOMY_FILE, {
      session_start: Date.now(),
      total_chars: 0,
      total_tokens_est: 0,
      tool_calls: 0,
      task_class: "default",
      waste_detected: [],
      files_read: [],
      compaction_suggested_at: null,
    });
    console.log("Economy state reset");
  })();
} else {
  main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
