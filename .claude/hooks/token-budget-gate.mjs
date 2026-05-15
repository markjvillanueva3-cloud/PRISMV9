#!/usr/bin/env node
// tier: T2
/**
 * token-budget-gate.mjs — Token Budget Awareness Hook
 * ====================================================
 *
 * UserPromptSubmit hook that reads THIS chat's transcript token count
 * (per-session, not shared) and:
 *   1. Warns when approaching context limit
 *   2. Blocks heavy operations when critically low
 *
 * FIRES ON: UserPromptSubmit
 *
 * Designed for up to 8 concurrent chats — token estimate comes from
 * stdin.transcript_path, never from a shared SESSION_MEMORY file.
 *
 * Budget tiers (1M context):
 *   GREEN  (>50% remaining): Full operations allowed
 *   YELLOW (30-50%): No nag (auto-compaction handles)
 *   RED    (15-30%): Warn on heavy ops only
 *   CRITICAL (<15%): Mark auto-compact, no nag
 */

import * as fs from "fs";
import * as path from "path";
import {
  getSessionId, getTranscriptTokens, readStdinJson, CONTEXT_CAP,
} from "../helpers/session-token-state.mjs";

const MAX_CONTEXT_TOKENS = Number(process.env.PRISM_MAX_CONTEXT_TOKENS) || CONTEXT_CAP;

// U-P4-TOKEN-BUDGET-TELEMETRY: append one row per fire. Always-on (telemetry
// is the load-bearing point of the unit).
//
// SID JOIN CONTRACT (load-bearing): `getSessionId()` returns the first 8 chars
// of stdin.session_id — a bare UUID prefix like "a61bbf34" with NO "claude-"
// prefix. The dashboard's join key is `chatId.slice(7)` from chat-slots.json
// (`chatId = "claude-a61bbf34"`). Both resolve to the same 8-char value; do NOT
// add a "claude-" prefix to row.sid or the join silently breaks.
//
// CONCURRENT-WRITE CONTRACT: up to 10 chats fire this hook simultaneously
// against the SAME ledger path. JSONL rows are <200 bytes, well under PIPE_BUF.
// POSIX guarantees O_APPEND atomicity at this size; Windows NTFS FILE_APPEND_DATA
// is atomic for sub-sector writes. `parseLedger` skips any malformed line that
// slips through, so worst-case impact of a torn row is one lost sample.
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const TELEMETRY_DIR = path.join(PRISM_ROOT, "mcp-server", "data", "state");
const TELEMETRY_PATH = process.env.PRISM_TOKEN_BUDGET_TELEMETRY_PATH
  || path.join(TELEMETRY_DIR, "token-budget-telemetry.jsonl");
// Read disable knob at call time (NOT at module import) so subprocess tests
// can flip it via env without re-importing the module.
function telemetryDisabled() {
  return process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE === "1";
}
export { telemetryDisabled };

const HEAVY_SKILLS = [
  "/autopilot-full", "/autopilot", "/forge-triple", "/forge",
  "/learn-everything", "/pdf-learn", "/video-learn", "/ingest"
];

function getBudgetTier(usedTokens) {
  const remaining = MAX_CONTEXT_TOKENS - usedTokens;
  const percentRemaining = (remaining / MAX_CONTEXT_TOKENS) * 100;

  if (percentRemaining > 50) return { tier: "GREEN", percent: percentRemaining };
  if (percentRemaining > 30) return { tier: "YELLOW", percent: percentRemaining };
  if (percentRemaining > 15) return { tier: "RED", percent: percentRemaining };
  return { tier: "CRITICAL", percent: percentRemaining };
}

function detectHeavySkill(prompt) {
  const p = (prompt || "").toLowerCase();
  for (const skill of HEAVY_SKILLS) {
    if (p.includes(skill.slice(1))) return skill;
  }
  return null;
}

// U-P4-TOKEN-BUDGET-TELEMETRY: append a single JSONL row per fire. Failures
// must NEVER propagate — the gate is hot-path UserPromptSubmit, and we'd rather
// lose a row than break the hook. Slot is intentionally NOT looked up here
// (cross-file read in the hot path); the dashboard joins it at query time.
export function buildTelemetryRow({ sid, tier, percent, used, heavy, ts }) {
  return {
    v: 1, // schemaVersion for parseLedger forward-compat
    ts: ts || new Date().toISOString(),
    sid: typeof sid === "string" ? sid.slice(0, 8) : "unknown",
    tier: typeof tier === "string" ? tier : "UNKNOWN",
    percent: Number.isFinite(percent) ? Math.round(percent * 10) / 10 : null,
    used: Number.isInteger(used) ? used : null,
    heavy: typeof heavy === "string" && heavy.length ? heavy : null,
  };
}

function recordTelemetry(row, opts) {
  if (telemetryDisabled()) return;
  const targetPath = (opts && opts.path) || TELEMETRY_PATH;
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.appendFileSync(targetPath, JSON.stringify(row) + "\n", "utf8");
  } catch { /* fail-safe — never break the gate */ }
}

export { recordTelemetry };

async function main() {
  const stdin = readStdinJson() || {};
  const sessionId = getSessionId(stdin);
  const prompt = stdin.prompt || stdin.message || "";

  // Per-session token count from transcript (authoritative, not shared)
  const usedTokens = getTranscriptTokens(stdin);
  const budget = getBudgetTier(usedTokens);
  const heavySkill = detectHeavySkill(prompt);

  // U-P4-TOKEN-BUDGET-TELEMETRY: emit ledger row before any decision branch
  // so RED/CRITICAL events are recorded even when the gate ultimately stays silent.
  recordTelemetry(buildTelemetryRow({
    sid: sessionId,
    tier: budget.tier,
    percent: budget.percent,
    used: usedTokens,
    heavy: heavySkill,
  }));

  let ctx = "";

  if (budget.tier === "CRITICAL") {
    // Auto-compaction handles exhaustion. Mark per-session marker so
    // handoff scripts can pick it up; do not nag.
    try {
      fs.writeFileSync(
        `H:/prism/.claude/cache/per-session/${sessionId}/auto-compact-triggered.txt`,
        new Date().toISOString()
      );
    } catch { /* ignore */ }
    ctx = "";
  } else if (budget.tier === "RED" && heavySkill) {
    ctx = `⚠️ Heavy operation "${heavySkill}" may exhaust remaining ${budget.percent.toFixed(0)}% — consider splitting the task.`;
  }

  if (ctx) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ctx,
      },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

// U-P4-TOKEN-BUDGET-TELEMETRY: gate the top-level invocation so tests can
// import { buildTelemetryRow, recordTelemetry } without triggering a stdin
// read (which blocks when no harness is piping JSON).
import { fileURLToPath } from "node:url";
const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; }
  catch { return false; }
})();
if (__isCLI) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }));
  });
}
