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
// Sanitize a raw sid candidate to claude-<8 of [A-Za-z0-9-]> or null. Cloned
// in session-reorient-capture.mjs (resolveSid) -- keep the two in lockstep:
// traversal chars (. / \) must never reach STATE_FILE or the handoff prefix.
function safeSid8(raw) {
  if (!raw || typeof raw !== "string" || raw.length < 8) return null;
  const safe = raw.slice(0, 8).replace(/[^A-Za-z0-9-]/g, "");
  return safe.length >= 8 ? `claude-${safe}` : null;
}

function resolveSessionId(stdinSid) {
  const fromStdin = safeSid8(stdinSid);
  if (fromStdin) return fromStdin;
  // Harness per-process env anchor (HS-01): strictly THIS chat's id -- prefer it
  // over the stable-id subprocess (same answer the helper's anchor 1.5 returns,
  // minus a 1.5s-timeout spawn per prompt; keeps sid parity with the PostToolUse
  // capture companion which cannot afford the spawn on its hot path).
  const fromEnv = safeSid8(process.env.CLAUDE_CODE_SESSION_ID);
  if (fromEnv) return fromEnv;
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { encoding: "utf-8", timeout: 1500 });
    const id = (r.stdout || "").trim();
    if (id && id.length >= 8) return id;
  } catch { /* ignore */ }
  const fromLegacy = safeSid8(process.env.CLAUDE_SESSION_ID);
  if (fromLegacy) return fromLegacy;
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

const HANDOFF_DIR = "H:/prism/state/shared/handoffs";
const MAX_GOAL_CHARS = 600; // re-anchored goal cap (sub-bound of the MAX_BRIEF_TOKENS cap)

// Reliable mid-session GOAL source (operator directive 2026-06-11). The anchor
// capture pipeline is dormant for many live sessions (empty state.anchors), so the
// brief used to emit nothing. The per-chat HANDOFF resume directive is reliably
// written by precompact-handoff + /handoff and is what auto-resume trusts on
// /compact -- re-anchoring to it every promptInterval keeps attention on the ACTUAL
// objective deep into a 1M-context session (compaction-free refresh). Fail-soft: any
// error / no handoff -> null, brief omits the goal section. Pure awareness, not a
// context-pressure warning. Only emits on the interval brief, never per-prompt.
function extractResume(txt) {
  if (!txt || typeof txt !== "string") return null;
  // Line-scan: find the "## RESUME" header, collect lines until the next "## "
  // section header (robust to multi-line bodies; a regex with /m mis-truncates them).
  const lines = txt.replace(/\r/g, "").split("\n");
  // Match bare "## RESUME" and decorated variants ("## RESUME DIRECTIVE", "## RESUME (next)")
  // via \b, but NOT "## RESUMED..." (word boundary excludes it). 96.8% of handoffs use the
  // bare header the canonical writer emits; \b also covers the rare decorated minority.
  const i = lines.findIndex((l) => /^##\s+RESUME\b/.test(l));
  if (i < 0) return null;
  const body = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s/.test(lines[j])) break; // stop at the next section header
    body.push(lines[j]);
  }
  const out = body.join("\n").trim();
  if (!out) return null;
  return out.length > MAX_GOAL_CHARS ? out.slice(0, MAX_GOAL_CHARS).trim() + " ..." : out;
}

function readStandingGoal(sessionId, dir = HANDOFF_DIR) {
  try {
    if (!sessionId || sessionId === "default") return null;
    if (!fs.existsSync(dir)) return null;
    const prefix = `HANDOFF-${sessionId}-`;
    const cands = fs.readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
      .map((f) => {
        const p = path.join(dir, f);
        let mtime = 0;
        try { mtime = fs.statSync(p).mtimeMs; } catch { /* skip unreadable */ }
        return { p, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    if (!cands.length) return null;
    return extractResume(fs.readFileSync(cands[0].p, "utf8"));
  } catch { return null; }
}

function buildBrief(state, trigger, standingGoal) {
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
  if (standingGoal) {
    lines.push("STANDING GOAL (from this chat's handoff -- your current objective; do not lose it):");
    for (const ln of standingGoal.split("\n")) lines.push(`  ${ln}`);
    lines.push("");
  }
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
  // Disable knob (TOKEN-EFFICIENCY-INJECT/U-KNOB-CLOSE) -- silence the reorientation brief.
  if (process.env.PRISM_SESSION_REORIENT_DISABLE === "1") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
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

  // Read-parity with the capture companion (U-REORIENT-INJECT-READ-PARITY,
  // 2026-06-12): unreadable=true means the file EXISTS but could not be
  // read/parsed (AV lock, EBUSY, torn write). The caller must PASS THROUGH --
  // synthesizing a fresh state here and saving it would clobber capture's
  // anchors (the a3e6d3ca97 fail-open-read class; capture got this gate on
  // 06-12, inject kept the fail-open read until now -- scrutiny arm-B P2).
  function loadStateLocal() {
    let unreadable = false;
    try {
      if (fs.existsSync(STATE_FILE)) {
        return { unreadable: false, state: JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
      }
    } catch { unreadable = true; }
    return { unreadable, state: null };
  }
  function saveStateLocal(s) {
    // tmp+rename: the PostToolUse capture companion shares this file; a torn
    // plain write here would feed its loadState a corrupt file (clobber class).
    const tmp = `${STATE_FILE}.${process.pid}.tmp`;
    try {
      if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
      fs.renameSync(tmp, STATE_FILE);
    } catch {
      try { fs.unlinkSync(tmp); } catch { /* fail-soft: tmp may not exist */ }
    }
  }
  // Shadow the closure-level load/save with per-chat variants
  const loaded = loadStateLocal();
  if (loaded.unreadable) {
    // Existing file we could not read: writing ANY state over it would clobber
    // capture's anchors -- pure pass-through this prompt (mirrors capture).
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  let state = loaded.state;
  const hasAnchors = !!(state && Array.isArray(state.anchors) && state.anchors.length > 0);
  const sidReal = !!(sessionId && sessionId !== "default");
  // Track counters when we have anchors OR a real session id (which MAY carry a handoff
  // goal). The handoff is read LAZILY only when a brief actually fires (below), so the
  // per-prompt hot path never touches disk for the goal -- only every promptInterval.
  if (!hasAnchors && !sidReal) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  // Synthesize a minimal state so the counter/interval logic works even when the
  // anchor capture pipeline has not populated anchors yet (handoff-goal-only path).
  if (!state) state = { anchors: [], config: {}, stats: null, briefHistory: [] };
  if (!Array.isArray(state.anchors)) state.anchors = [];

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

  // Lazy handoff read: only now that a brief is firing (at most once per promptInterval),
  // never on the per-prompt hot path.
  const standingGoal = sidReal ? readStandingGoal(sessionId) : null;
  if (!hasAnchors && !standingGoal) {
    // Brief would be empty (no anchors AND no handoff goal) -- skip it, but reset the
    // counter so we re-check next interval rather than re-reading every prompt.
    state.stats.promptsSinceLastBrief = 0;
    state.stats.toolCallsSinceLastBrief = 0;
    saveStateLocal(state);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const brief = buildBrief(state, trigger, standingGoal);
  // Cap brief size to MAX_BRIEF_TOKENS * 4 chars
  const capped = brief.length > MAX_BRIEF_TOKENS * 4
    ? brief.slice(0, MAX_BRIEF_TOKENS * 4) + "\n[... brief truncated]"
    : brief;

  // Reset counters
  state.stats.briefsGenerated = (state.stats.briefsGenerated || 0) + 1;
  state.stats.lastBriefAt = new Date().toISOString();
  state.stats.promptsSinceLastBrief = 0;
  state.stats.toolCallsSinceLastBrief = 0;
  // A full brief just re-anchored this chat -- restart the capture companion's
  // mid-turn counter too, so its next re-anchor lands ~threshold tool calls AFTER
  // this brief instead of duplicating its content ~25 calls later (scrutiny P2
  // 2026-06-12). The empty-brief SKIP path above must NOT do this (no re-anchor
  // happened there -- pinned by the capture suite's coordination test).
  state.stats.toolCallsSinceMidTurnAnchor = 0;
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

// Export pure helpers for testing; gate main() so a test import does not block on stdin.
export { extractResume, readStandingGoal, buildBrief, detectDrift, resolveSessionId, safeSid8 };

import { fileURLToPath } from "node:url";
const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; }
  catch { return false; }
})();
if (__isCLI) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}
