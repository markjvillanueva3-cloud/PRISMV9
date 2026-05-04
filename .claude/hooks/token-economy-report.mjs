#!/usr/bin/env node
/**
 * token-economy-report.mjs — Stop hook (INTEL-OLLAMA-OBSIDIAN-MS0/P9-U05)
 *
 * Generates an end-of-session token report by category and persists it to
 * mcp-server/data/state/token-economy-session.json. Surfaces the top 3 waste
 * patterns to stderr as advisory output (non-blocking).
 *
 * Categories tracked:
 *   - hooks       — hook scripts that fired this session
 *   - injections  — UserPromptSubmit context blocks injected
 *   - tool_calls  — Bash / Edit / Read / Write / Grep / Glob / Agent invocations
 *   - file_reads  — file read events (Read tool + ReadFile-equivalent)
 *
 * Token estimates come from session counters where available; otherwise the
 * hook records a best-effort snapshot with `estimated: true` so downstream
 * dashboards know the row is incomplete.
 *
 * continueOnError: true — never blocks user exit (Stop hooks must be soft).
 *
 * Inputs (any are optional, hook degrades gracefully):
 *   - mcp-server/data/state/ollama-offload-stats.json (offload telemetry)
 *   - state/shared/AGENT_CHAT.md                        (last messages, optional)
 *   - .claude/cache/session-counters.json               (counters from peer hooks)
 *
 * Output: mcp-server/data/state/token-economy-session.json
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// ──────────────────────────────────────────────────────────────────────────
// Path resolution — robust to invocation from varying CWDs
// ──────────────────────────────────────────────────────────────────────────

const HOOK_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/"));
// Detect whether we're in main repo (.claude/hooks) or a worktree (.claude/hooks)
const REPO_ROOT = path.resolve(HOOK_DIR, "../..");
const STATE_DIR = path.join(REPO_ROOT, "mcp-server", "data", "state");
const REPORT_PATH = path.join(STATE_DIR, "token-economy-session.json");
const COUNTERS_PATH = path.join(REPO_ROOT, ".claude", "cache", "session-counters.json");
const OLLAMA_STATS_PATH = path.join(STATE_DIR, "ollama-offload-stats.json");

// Heuristic per-call token estimates (conservative, kept in sync with engine
// budget profiles when available). Used only when concrete usage isn't tracked.
const APPROX_TOKENS_PER = {
  hook_fire: 200,        // average system-reminder injection length
  injection: 500,        // UserPromptSubmit context block
  tool_call: 300,        // tool input/output summary
  file_read: 800,        // average file read content + cat -n prefix
};

const TOP_WASTE_LIMIT = 3;
const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4h cap for "this session"

// ──────────────────────────────────────────────────────────────────────────
// Stdin payload — Claude hook protocol
// ──────────────────────────────────────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function parsePayload(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ──────────────────────────────────────────────────────────────────────────
// Counter source — read peer-hook counters if available
// ──────────────────────────────────────────────────────────────────────────

function readCounters() {
  if (!fs.existsSync(COUNTERS_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(COUNTERS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function readOllamaStats() {
  if (!fs.existsSync(OLLAMA_STATS_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(OLLAMA_STATS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Estimation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Build a best-effort breakdown by category. If a peer hook left counters
 * we use them; otherwise we estimate zero (better than fabricating numbers).
 */
function estimateByCategory(counters) {
  const c = counters ?? {};
  const fireCount = Number.isFinite(c.hook_fires) ? c.hook_fires : 0;
  const injCount = Number.isFinite(c.injections) ? c.injections : 0;
  const toolCount = Number.isFinite(c.tool_calls) ? c.tool_calls : 0;
  const readCount = Number.isFinite(c.file_reads) ? c.file_reads : 0;
  const uniqueReads = Number.isFinite(c.unique_files_read) ? c.unique_files_read : readCount;
  const searchCount = Number.isFinite(c.searches) ? c.searches : 0;
  const agentCount = Number.isFinite(c.agent_spawns) ? c.agent_spawns : 0;

  return {
    hooks: { count: fireCount, est_tokens: fireCount * APPROX_TOKENS_PER.hook_fire },
    injections: { count: injCount, est_tokens: injCount * APPROX_TOKENS_PER.injection },
    tool_calls: { count: toolCount, est_tokens: toolCount * APPROX_TOKENS_PER.tool_call },
    file_reads: { count: readCount, est_tokens: readCount * APPROX_TOKENS_PER.file_read },
    raw: { unique_files_read: uniqueReads, searches: searchCount, agent_spawns: agentCount },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Waste detection — light port of TokenEconomyEngine.detectWaste rules so
// the hook is self-contained and doesn't need to spawn a Node import chain
// just to compute three thresholds.
// ──────────────────────────────────────────────────────────────────────────

const WASTE_RULES = [
  {
    pattern: "duplicate_reads",
    description: "Same files read multiple times — context churn",
    severity: "high",
    fix: "Snapshot file content into context, read once",
    test: (b) => b.file_reads.count > b.raw.unique_files_read * 1.5 && b.file_reads.count > 5,
  },
  {
    pattern: "broad_search",
    description: "Excessive grep/glob calls (>10) — narrow searches first",
    severity: "medium",
    fix: "Use index-first lookup (ENGINE_DIGEST.md, DISPATCHER_DIGEST.md)",
    test: (b) => b.raw.searches > 10,
  },
  {
    pattern: "agent_over_spawn",
    description: "Too many parallel agents (>5) — coordination tax dominates",
    severity: "medium",
    fix: "Consolidate agents or use sequential delegation",
    test: (b) => b.raw.agent_spawns > 5,
  },
  {
    pattern: "context_bloat",
    description: "File reads dominate tool calls (>40%) — context overload",
    severity: "high",
    fix: "Read with offset/limit; prefer Glob/Grep over full Read",
    test: (b) => b.tool_calls.count > 0 && b.file_reads.count > b.tool_calls.count * 0.4,
  },
  {
    pattern: "hook_storm",
    description: "Hook fires per tool call >2 — hook chain inflation",
    severity: "medium",
    fix: "Disable advisory hooks (DISABLED_TOKEN_REDUX_2026_04_23 marker)",
    test: (b) => b.tool_calls.count > 0 && b.hooks.count > b.tool_calls.count * 2,
  },
];

function detectWaste(breakdown) {
  return WASTE_RULES
    .filter((r) => r.test(breakdown))
    .map((r) => ({
      pattern: r.pattern,
      description: r.description,
      severity: r.severity,
      fix: r.fix,
    }));
}

// ──────────────────────────────────────────────────────────────────────────
// Session-id resolution — best-effort, falls back to "unknown"
// ──────────────────────────────────────────────────────────────────────────

function sessionId(payload) {
  if (payload.session_id) return String(payload.session_id);
  if (payload.sessionId) return String(payload.sessionId);
  // Attempt to read from the stable-id helper
  const helper = path.join(REPO_ROOT, ".claude", "helpers", "stable-session-id.mjs");
  if (fs.existsSync(helper)) {
    try {
      const r = spawnSync(process.execPath, [helper], { encoding: "utf-8", timeout: 1500 });
      const id = (r.stdout || "").trim();
      if (id) return id;
    } catch { /* swallow */ }
  }
  return "unknown";
}

// ──────────────────────────────────────────────────────────────────────────
// Persistence
// ──────────────────────────────────────────────────────────────────────────

function persist(report) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main — pure function for testability
// ──────────────────────────────────────────────────────────────────────────

export function buildSessionReport(payload, opts = {}) {
  const counters = opts.counters ?? readCounters();
  const ollama = opts.ollamaStats ?? readOllamaStats();
  const breakdown = estimateByCategory(counters);
  const waste = detectWaste(breakdown);
  const top3 = waste.slice(0, TOP_WASTE_LIMIT);

  const total = breakdown.hooks.est_tokens
    + breakdown.injections.est_tokens
    + breakdown.tool_calls.est_tokens
    + breakdown.file_reads.est_tokens;

  return {
    schemaVersion: "1.0.0",
    session_id: sessionId(payload),
    timestamp: new Date().toISOString(),
    estimated: counters === null,                  // no counters → fully estimated
    estimated_total_tokens: total,
    breakdown_by_category: {
      hooks: breakdown.hooks,
      injections: breakdown.injections,
      tool_calls: breakdown.tool_calls,
      file_reads: breakdown.file_reads,
    },
    raw_counters: breakdown.raw,
    top_waste_patterns: top3,
    all_waste_patterns: waste,
    ollama_offload_savings: ollama && Number.isFinite(ollama.tokens_saved)
      ? { tokens_saved: ollama.tokens_saved, offload_count: ollama.offloaded ?? 0 }
      : null,
    advisory: top3.length > 0
      ? `Top waste: ${top3.map((w) => w.pattern).join(", ")}`
      : "No waste patterns detected this session.",
  };
}

async function main() {
  const raw = readStdinSafe();
  const payload = parsePayload(raw);

  const report = buildSessionReport(payload);
  const wrote = persist(report);

  // Emit advisory to stderr — non-blocking (Stop hooks must continue).
  if (report.top_waste_patterns.length > 0) {
    const lines = [
      `[token-economy] session ${report.session_id} — ~${report.estimated_total_tokens.toLocaleString()} tokens (${report.estimated ? "estimated" : "tracked"})`,
      ...report.top_waste_patterns.map((w, i) =>
        `[token-economy] [${i + 1}/${TOP_WASTE_LIMIT}] ${w.severity.toUpperCase()} ${w.pattern} — ${w.fix}`,
      ),
    ];
    process.stderr.write(lines.join("\n") + "\n");
  }

  // Honor Claude Code hook contract: emit JSON {continue: true} on stdout
  process.stdout.write(JSON.stringify({
    continue: true,
    advisory: report.advisory,
    persisted: wrote,
    persisted_to: wrote ? REPORT_PATH : null,
  }));
  process.exit(0);
}

// Only run main() when invoked as a script (not when imported by tests)
const __isMain = (() => {
  try {
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const self = new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/");
    return path.resolve(self) === argv1;
  } catch { return true; }
})();

if (__isMain) {
  main().catch(() => process.exit(0));
}
