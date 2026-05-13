#!/usr/bin/env node
// tier: T4
/**
 * session-reorient-inject.mjs — UserPromptSubmit hook
 *
 * For long sessions (especially 1M-context), context drift is real even
 * when nothing has been compacted. Important context gets buried under
 * exploration, errors, and intermediate work.
 *
 * This hook tracks per-session prompt count and tool call count via the
 * SessionReorientationEngine state file. When thresholds are met, it
 * generates a compact reorientation brief and injects it as additional
 * context on the user's next prompt — refreshing Claude's attention on
 * the current objective, active files, recent decisions, and open todos.
 *
 * Like a compaction without dropping anything from history.
 *
 * Triggers:
 *   - Every N user prompts (default 15)
 *   - Topic drift detected (tags shifted significantly)
 *
 * Non-blocking: never denies the prompt, only adds context.
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "node:child_process";

const STATE_DIR = "H:/prism/state/session-reorientation";
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";

// Resolve per-chat state file. Falls back to `default` only if stable-session-id
// cannot be reached — previously this hook ALWAYS used `default` because
// CLAUDE_SESSION_ID is unset by Claude Code, leading to 6+ concurrent chats
// sharing one reorientation state file and cross-contaminating their briefs.
function resolveSessionId(stdinSid) {
  if (stdinSid && typeof stdinSid === "string" && stdinSid.length >= 8) {
    return `claude-${stdinSid.slice(0, 8)}`;
  }
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { encoding: "utf-8", timeout: 1500 });
    const id = (r.stdout || "").trim();
    if (id && id.length >= 8) return id;
  } catch { /* ignore */ }
  if (process.env.CLAUDE_SESSION_ID) {
    return `claude-${process.env.CLAUDE_SESSION_ID.slice(0, 8)}`;
  }
  return "default";
}

const DEFAULT_PROMPT_INTERVAL = 15;
const DEFAULT_TOOL_CALL_INTERVAL = 50;
const DRIFT_WINDOW = 10;
const DRIFT_THRESHOLD = 0.7;
const MAX_BRIEF_TOKENS = 800;  // cap injection size

// loadState/saveState are per-chat — defined inline in main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) after SESSION_ID
// resolution, so each chat has its own reorientation-<sid>.json file.

function detectDrift(state) {
  const window = state.config?.driftWindowSize ?? DRIFT_WINDOW;
  const threshold = state.config?.driftThreshold ?? DRIFT_THRESHOLD;
  const active = (state.anchors || []).filter((a) => a.active);
  if (active.length < window * 2) {
    return { drifted: false, from: [], to: [] };
  }
  const olderSlice = active.slice(-window * 2, -window);
  const recentSlice = active.slice(-window);
  const collect = (xs) => {
    const s = new Set();
    for (const a of xs) for (const t of (a.tags || [])) s.add(t);
    return s;
  };
  const fromTags = collect(olderSlice);
  const toTags = collect(recentSlice);
  const intersect = [...fromTags].filter((t) => toTags.has(t));
  const overlap = fromTags.size > 0 ? intersect.length / fromTags.size : 1;
  const drifted = overlap < 1 - threshold;
  return {
    drifted,
    from: [...fromTags].filter((t) => !toTags.has(t)).slice(0, 5),
    to: [...toTags].filter((t) => !fromTags.has(t)).slice(0, 5),
  };
}

function buildBrief(state, trigger) {
  const active = (state.anchors || []).filter((a) => a.active);
  const objective = [...active].reverse().find(
    (a) => a.type === "task_anchor" || a.type === "user_directive"
  );
  const filesMap = new Map();
  for (let i = active.length - 1; i >= 0; i--) {
    for (const f of active[i].files || []) {
      if (!filesMap.has(f)) filesMap.set(f, i);
    }
  }
  const activeFiles = [...filesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([f]) => f);

  const decisions = active
    .filter((a) => a.type === "decision")
    .slice(-5);
  const milestones = active
    .filter((a) => a.type === "milestone")
    .slice(-7);
  const errors = (state.anchors || [])
    .filter((a) => a.type === "error_resolved")
    .slice(-5);

  const drift = detectDrift(state);

  const lines = [];
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("🧭 SESSION REORIENTATION (auto-injected — no compaction occurred)");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(
    `Trigger: ${trigger} | ${state.stats.promptsSeen} prompts | ${state.stats.toolCallsSeen} tool calls`
  );
  lines.push("");
  if (objective) {
    lines.push(`OBJECTIVE: ${objective.summary}`);
    if (objective.rationale) lines.push(`WHY: ${objective.rationale}`);
    lines.push("");
  }
  if (activeFiles.length > 0) {
    lines.push("ACTIVE FILES (recently touched):");
    for (const f of activeFiles) lines.push(`  - ${f}`);
    lines.push("");
  }
  if (decisions.length > 0) {
    lines.push("RECENT DECISIONS:");
    for (const d of decisions) {
      const why = d.rationale ? ` — ${d.rationale}` : "";
      lines.push(`  - ${d.summary}${why}`);
    }
    lines.push("");
  }
  if (milestones.length > 0) {
    lines.push("OPEN TODOS:");
    for (const m of milestones) lines.push(`  - ${m.summary}`);
    lines.push("");
  }
  if (errors.length > 0) {
    lines.push("RESOLVED ERRORS (do not re-attempt these failures):");
    for (const e of errors) lines.push(`  - ${e.summary}`);
    lines.push("");
  }
  if (drift.drifted) {
    lines.push("⚠️  TOPIC DRIFT DETECTED");
    lines.push(`  Was: ${drift.from.join(", ")}`);
    lines.push(`  Now: ${drift.to.join(", ")}`);
    lines.push("  If unintentional, return to the OBJECTIVE above.");
    lines.push("");
  }
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}

async function main() {
  let input;
  try {
    // Read from stdin fd=0 — portable across Windows/Linux unlike /dev/stdin
    input = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Resolve per-chat state file (was `default` for all chats — bug fixed 2026-04-23)
  const sessionId = resolveSessionId(input?.session_id || input?.sessionId);
  const STATE_FILE = path.join(STATE_DIR, `reorientation-${sessionId}.json`);

  function loadStateLocal() {
    try { if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
    return null;
  }
  function saveStateLocal(s) {
    try {
      if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
    } catch {}
  }
  // Shadow the closure-level load/save with per-chat variants
  const state = loadStateLocal();
  if (!state || !state.anchors || state.anchors.length === 0) {
    // No anchors recorded yet — nothing to reorient to
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Increment prompt counter
  state.stats = state.stats || {
    promptsSeen: 0,
    toolCallsSeen: 0,
    anchorsRecorded: 0,
    briefsGenerated: 0,
    lastBriefAt: null,
    promptsSinceLastBrief: 0,
    toolCallsSinceLastBrief: 0,
  };
  state.stats.promptsSeen += 1;
  state.stats.promptsSinceLastBrief += 1;

  const cfg = state.config || {};
  const promptInterval = cfg.promptInterval ?? DEFAULT_PROMPT_INTERVAL;
  const toolCallInterval = cfg.toolCallInterval ?? DEFAULT_TOOL_CALL_INTERVAL;

  let trigger = null;
  if (state.stats.promptsSinceLastBrief >= promptInterval) {
    trigger = `prompt_interval (${state.stats.promptsSinceLastBrief}/${promptInterval})`;
  } else if (state.stats.toolCallsSinceLastBrief >= toolCallInterval) {
    trigger = `tool_call_interval (${state.stats.toolCallsSinceLastBrief}/${toolCallInterval})`;
  } else {
    const drift = detectDrift(state);
    if (drift.drifted) trigger = "topic_drift";
  }

  if (!trigger) {
    saveStateLocal(state);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const brief = buildBrief(state, trigger);
  // Cap brief size to MAX_BRIEF_TOKENS * 4 chars
  const capped = brief.length > MAX_BRIEF_TOKENS * 4
    ? brief.slice(0, MAX_BRIEF_TOKENS * 4) + "\n[... brief truncated]"
    : brief;

  // Reset counters
  state.stats.briefsGenerated = (state.stats.briefsGenerated || 0) + 1;
  state.stats.lastBriefAt = new Date().toISOString();
  state.stats.promptsSinceLastBrief = 0;
  state.stats.toolCallsSinceLastBrief = 0;
  state.briefHistory = state.briefHistory || [];
  state.briefHistory.push({
    at: state.stats.lastBriefAt,
    tokens: Math.ceil(capped.length / 4),
    trigger,
  });
  if (state.briefHistory.length > 50) {
    state.briefHistory = state.briefHistory.slice(-50);
  }
  saveStateLocal(state);

  // Claude Code's UserPromptSubmit hook ignores `message:`. Correct field is
  // `hookSpecificOutput.additionalContext`. Before this fix the ENTIRE brief
  // was discarded by the harness — reorientation was a no-op for months.
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: capped,
      },
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
