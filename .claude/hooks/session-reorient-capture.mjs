#!/usr/bin/env node
// tier: T3
/**
 * session-reorient-capture.mjs -- PostToolUse companion to session-reorient-inject.mjs
 *
 * The reorientation hook (session-reorient-inject.mjs) reads state but does
 * not populate it. This hook captures anchors after significant tool events
 * so the reorientation brief has content to inject, AND counts tool calls so
 * the inject hook's tool_call_interval trigger actually fires.
 *
 * MID-TURN RE-ANCHOR (operator directive 2026-06-12, 1M-context extension):
 * long agentic turns (one prompt, hundreds of tool calls -- the /loop + Hermes
 * pattern) never cross a UserPromptSubmit boundary, so the inject hook can
 * never re-anchor them. When the capture-LOCAL counter
 * toolCallsSinceMidTurnAnchor crosses
 * PRISM_REORIENT_MIDTURN_TOOLCALLS (default 75, 0 disables), this hook emits
 * the chat's STANDING GOAL (handoff resume directive -- the same reliable
 * source the inject hook uses) as PostToolUse additionalContext, mid-turn,
 * PLUS the working set this hook itself captured (recently-touched files +
 * recent decision anchors) and a PRISM search-first surfaces pointer -- the
 * per-prompt injectors (master-index/wiki/memory prechecks) only fire on
 * UserPromptSubmit, so mid-turn is exactly where that awareness decays.
 * Pure awareness re-injection -- never a context-pressure warning (the
 * operator disabled those fleet-wide; see feedback_context_growth_not_a_stop_signal).
 *
 * Anchor types:
 *   - decision:        file creation / major edit / dependency change
 *   - milestone:       commit / release / task completion
 *   - error_resolved:  successful build / test after prior failure
 *
 * Writes to: H:/prism/state/session-reorientation/reorientation-{sid}.json
 * (same per-chat file the inject hook resolves -- sid from stdin session_id,
 * falling back to CLAUDE_CODE_SESSION_ID. The pre-2026-06-12 version read the
 * WRONG env var, CLAUDE_SESSION_ID -- always unset -- so every chat wrote to
 * reorientation-default.json while inject read per-chat files: the dormant-
 * anchor bug. HS-01 class.)
 *
 * Non-blocking: always exits {continue: true}.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const STATE_DIR = "H:/prism/state/session-reorientation";
const MAX_ANCHORS = 500;
const DEFAULT_MIDTURN_TOOLCALLS = 75; // staggered vs inject's toolCallInterval (50); inject's EMIT path resets this counter so a fresh prompt-boundary brief DEFERS the next mid-turn re-anchor (not mere staggering)
const MIN_SID_CHARS = 8;
const MAX_BRIEF_HISTORY = 50;

// Same id shape the inject hook resolves (claude-<8hex>) so both hooks share
// one state file and the handoff prefix HANDOFF-<sid>-*.md matches.
// No subprocess on this hot path (PostToolUse fires per tool call) -- stdin
// session_id is reliably present; CLAUDE_CODE_SESSION_ID is the harness
// per-process env anchor (strictly this chat's id, never a peer's).
function resolveSid(stdinSid) {
  // Candidate chain mirrors inject's resolveSessionId order; each candidate is
  // sanitized to [A-Za-z0-9-] (kills path traversal -- needs . / \) and an
  // unsafe candidate FALLS THROUGH to the next (parity with inject; a hostile
  // stdin sid must not shadow a valid env anchor).
  const candidates = [
    typeof stdinSid === "string" ? stdinSid : "",
    process.env.CLAUDE_CODE_SESSION_ID || "",
    process.env.CLAUDE_SESSION_ID || "", // legacy, almost always unset
  ];
  for (const raw of candidates) {
    if (!raw || raw.length < MIN_SID_CHARS) continue;
    const safe = raw.slice(0, MIN_SID_CHARS).replace(/[^A-Za-z0-9-]/g, "");
    if (safe.length >= MIN_SID_CHARS) return `claude-${safe}`;
  }
  return "default";
}

function stateFileFor(sid) {
  return path.join(STATE_DIR, `reorientation-${sid}.json`);
}

// Returns { state, unreadable }. unreadable=true means the file EXISTS but could
// not be read/parsed (AV lock, EBUSY, torn write) -- the caller must NOT write a
// fresh state over it (fail-open-read clobber class; a3e6d3ca97 lesson).
function loadState(stateFile, sid) {
  let unreadable = false;
  try {
    if (fs.existsSync(stateFile)) {
      return { unreadable: false, state: JSON.parse(fs.readFileSync(stateFile, "utf8")) };
    }
  } catch { unreadable = true; }
  return {
    unreadable,
    state: {
      sessionId: sid,
      createdAt: new Date().toISOString(),
      anchors: [],
      stats: {
        promptsSeen: 0,
        toolCallsSeen: 0,
        anchorsRecorded: 0,
        briefsGenerated: 0,
        midTurnReanchors: 0,
        lastBriefAt: null,
        promptsSinceLastBrief: 0,
        toolCallsSinceLastBrief: 0,
        toolCallsSinceMidTurnAnchor: 0,
      },
      briefHistory: [],
    },
  };
}

// tmp+rename so the inject hook (or a parallel capture) never reads torn JSON.
// A lost increment under parallel tool calls is harmless; a torn file would
// reset state and drop anchors (the fail-open-read clobber class).
// Returns true iff the state landed on disk -- the mid-turn emission is gated
// on this (scrutiny P2 2026-06-12): if the counter reset never persists, an
// ungated emit would repeat on EVERY subsequent tool call.
function saveState(stateFile, state) {
  const tmp = `${stateFile}.${process.pid}.tmp`;
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, stateFile);
    return true;
  } catch {
    try { fs.unlinkSync(tmp); } catch { /* fail-soft: tmp may not exist */ }
    return false;
  }
}

function classify(toolName, toolInput, toolResult) {
  if (!toolName) return null;

  const filePath = toolInput?.file_path || toolInput?.notebook_path || "";
  const command = toolInput?.command || "";

  // Engine / dispatcher / schema / hook creation -> decision anchor
  if (toolName === "Write") {
    if (/Engine\.ts$/.test(filePath)) {
      return {
        type: "decision",
        summary: `Created engine: ${path.basename(filePath)}`,
        rationale: "Engine file creation indicates architectural choice",
        files: [filePath],
        tags: ["engine", "creation"],
      };
    }
    if (/Dispatcher\.ts$/.test(filePath)) {
      return {
        type: "decision",
        summary: `Wired dispatcher: ${path.basename(filePath)}`,
        rationale: "Dispatcher change affects MCP action surface",
        files: [filePath],
        tags: ["dispatcher", "wiring"],
      };
    }
    if (/schemas?\/.+\.ts$/.test(filePath.replace(/\\/g, "/"))) {
      return {
        type: "decision",
        summary: `Schema: ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["schema"],
      };
    }
    if (/\.test\.ts$/.test(filePath)) {
      return {
        type: "milestone",
        summary: `Wrote tests: ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["test"],
      };
    }
    if (/\.claude.*\.mjs$/.test(filePath.replace(/\\/g, "/"))) {
      return {
        type: "decision",
        summary: `Created hook: ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["hook"],
      };
    }
  }

  if (toolName === "Edit" || toolName === "MultiEdit") {
    if (/Engine\.ts$|Dispatcher\.ts$|schemas?\/|\.test\.ts$/.test(filePath.replace(/\\/g, "/"))) {
      return {
        type: "decision",
        summary: `Edited ${path.basename(filePath)}`,
        files: [filePath],
        tags: ["edit"],
      };
    }
  }

  if (toolName === "Bash") {
    if (/git commit/.test(command)) {
      // Capture the commit message hint if present
      const match = command.match(/-m\s+["']([^"']{1,120})/);
      return {
        type: "milestone",
        summary: match ? `Commit: ${match[1]}` : "Git commit",
        tags: ["commit", "milestone"],
      };
    }
    if (/npm\s+(run\s+)?(build|test)|vitest|tsc/.test(command)) {
      // Stringify lazily -- only this branch consumes the result text, and tool
      // results can be multi-MB (hot-path discipline: O(result) work only here).
      const resultText = typeof toolResult === "string"
        ? toolResult
        : JSON.stringify(toolResult || "");
      // Only record successful builds/tests as error_resolved anchors
      const looksSuccess =
        /PASS|passed|0 failing|✓|passed \(/.test(resultText) &&
        !/FAIL|failed|error TS/.test(resultText);
      if (looksSuccess) {
        return {
          type: "error_resolved",
          summary: `Build/test passed: ${command.slice(0, 60)}`,
          tags: ["build-green"],
        };
      }
    }
  }

  return null;
}

function midTurnThreshold(env = process.env) {
  const raw = env.PRISM_REORIENT_MIDTURN_TOOLCALLS;
  if (raw === undefined || raw === "") return DEFAULT_MIDTURN_TOOLCALLS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIDTURN_TOOLCALLS;
}

const MAX_MIDTURN_CHARS = 2400; // ~600 tokens -- sub-cap of inject's MAX_BRIEF_TOKENS discipline

// Working-set enrichment (U-MIDTURN-WORKINGSET, 2026-06-12): the goal alone
// re-anchors WHAT to do but not WHERE the work lives. Recently-touched files +
// recent decision anchors are the parts of a long agentic stretch most likely
// to be buried hundreds of tool calls deep, and the search-first surfaces line
// re-arms R8 exactly where the per-prompt injectors cannot (PostToolUse).
// Returns null when there is nothing beyond the header -- emitting a bare
// header would be pure noise.
function buildMidTurnBrief(standingGoal, toolCalls, state = null) {
  const lines = [];
  if (standingGoal) {
    lines.push("STANDING GOAL (from this chat's handoff -- your current objective; do not lose it):");
    for (const ln of standingGoal.split("\n")) lines.push(`  ${ln}`);
  }
  const active = Array.isArray(state?.anchors) ? state.anchors.filter((a) => a && a.active) : [];
  if (active.length > 0) {
    // Newest-first dedup: walk anchors from most recent; Map preserves insertion
    // order so the first 5 keys are the 5 most recently touched files.
    const filesMap = new Map();
    for (let i = active.length - 1; i >= 0; i--) {
      for (const f of active[i].files || []) if (!filesMap.has(f)) filesMap.set(f, true);
    }
    const files = [...filesMap.keys()].slice(0, 5);
    if (files.length > 0) {
      lines.push("ACTIVE FILES (your working set this stretch):");
      for (const f of files) lines.push(`  - ${f}`);
    }
    const decisions = active.filter((a) => a.type === "decision").slice(-3);
    if (decisions.length > 0) {
      lines.push("RECENT DECISIONS:");
      for (const d of decisions) lines.push(`  - ${d.summary}`);
    }
  }
  if (lines.length === 0) return null;
  lines.unshift(`🧭 MID-TURN RE-ANCHOR (${toolCalls} tool calls this stretch -- awareness refresh, NOT a context warning; keep working)`);
  lines.push("PRISM search-first surfaces (R8): /node-card <id> · /master-index <q> · knowledge/wiki/index.md · mcp-server/data/docs/ENGINE_DIGEST.md");
  const brief = lines.join("\n");
  return brief.length > MAX_MIDTURN_CHARS
    ? brief.slice(0, MAX_MIDTURN_CHARS) + "\n[... re-anchor truncated]"
    : brief;
}

async function main() {
  let input;
  try {
    // Read from stdin fd=0 -- portable across Windows/Linux unlike /dev/stdin
    input = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Shared disable knob with the inject hook + capture-specific one.
  if (process.env.PRISM_SESSION_REORIENT_DISABLE === "1" ||
      process.env.PRISM_REORIENT_CAPTURE_DISABLE === "1") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const sid = resolveSid(input?.session_id || input?.sessionId);
  const stateFile = stateFileFor(sid);
  const { state, unreadable } = loadState(stateFile, sid);
  if (unreadable) {
    // Existing file we could not read (lock/torn write): writing a fresh state
    // over it would clobber anchors -- pure pass-through this invocation.
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  state.stats = state.stats || {};
  state.stats.toolCallsSeen = (state.stats.toolCallsSeen || 0) + 1;
  // Shared counter: belongs to inject's tool_call_interval trigger -- capture
  // increments it but NEVER resets it (resetting starved inject's anchor-only
  // briefs; scrutiny P1 2026-06-12). Inject resets it when its brief fires.
  state.stats.toolCallsSinceLastBrief = (state.stats.toolCallsSinceLastBrief || 0) + 1;
  // Mid-turn counter: capture increments + resets it at threshold; inject ALSO
  // resets it when (and only when) its own brief EMITS -- a fresh full re-anchor
  // makes an immediate mid-turn repeat redundant.
  state.stats.toolCallsSinceMidTurnAnchor = (state.stats.toolCallsSinceMidTurnAnchor || 0) + 1;

  // Harness PostToolUse payload field is tool_response (tool_result kept for
  // back-compat with older payload shapes -- scrutiny P1 2026-06-12).
  const anchor = classify(input.tool_name, input.tool_input, input.tool_response ?? input.tool_result);
  if (anchor) {
    const now = new Date().toISOString();
    state.anchors = Array.isArray(state.anchors) ? state.anchors : [];
    state.anchors.push({
      ...anchor,
      createdAt: now,
      active: true,
      toolName: input.tool_name,
    });
    state.stats.anchorsRecorded = (state.stats.anchorsRecorded || 0) + 1;
    if (state.anchors.length > MAX_ANCHORS) {
      // Drop oldest non-milestone anchors first, then RE-SORT by createdAt --
      // inject's drift detector + file-recency map assume append-order recency
      // (the old front-loaded-milestones merge mixed epochs; scrutiny P2).
      const milestones = state.anchors.filter((a) => a.type === "milestone").slice(-MAX_ANCHORS);
      const keepRest = Math.max(0, MAX_ANCHORS - milestones.length);
      const rest = keepRest > 0 ? state.anchors.filter((a) => a.type !== "milestone").slice(-keepRest) : [];
      state.anchors = [...milestones, ...rest]
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
        .slice(-MAX_ANCHORS);
    }
  }

  // Mid-turn re-anchor: only past the threshold, only with a real per-chat sid,
  // and the handoff disk read is LAZY (only at the threshold crossing -- never on
  // the per-tool-call hot path). Counter resets either way so a goal-less chat
  // does not re-read the handoff on every subsequent tool call.
  let additionalContext = null;
  const threshold = midTurnThreshold();
  if (threshold > 0 && sid !== "default" && state.stats.toolCallsSinceMidTurnAnchor >= threshold) {
    const actualCalls = state.stats.toolCallsSinceMidTurnAnchor;
    let standingGoal = null;
    try {
      const inject = await import("./session-reorient-inject.mjs");
      standingGoal = inject.readStandingGoal(sid);
    } catch { /* fail-soft: no brief */ }
    state.stats.toolCallsSinceMidTurnAnchor = 0;
    // Goal AND/OR working set: emit whenever the brief has real content (null = neither).
    const brief = buildMidTurnBrief(standingGoal, actualCalls, state);
    if (brief) {
      additionalContext = brief;
      state.stats.midTurnReanchors = (state.stats.midTurnReanchors || 0) + 1;
      state.stats.lastBriefAt = new Date().toISOString();
      state.briefHistory = Array.isArray(state.briefHistory) ? state.briefHistory : [];
      state.briefHistory.push({
        at: state.stats.lastBriefAt,
        tokens: Math.ceil(additionalContext.length / 4),
        trigger: "mid_turn_tool_calls",
      });
      if (state.briefHistory.length > MAX_BRIEF_HISTORY) state.briefHistory = state.briefHistory.slice(-MAX_BRIEF_HISTORY);
    }
  }

  // Emission gates on the PERSISTED counter reset: when the write fails (disk
  // full / sustained AV rename lock), the reset never sticks and an ungated emit
  // would spam the full brief on every subsequent tool call. Dropping one brief
  // under a failing disk is the safe direction (scrutiny P2 2026-06-12).
  const saved = saveState(stateFile, state);

  if (additionalContext && saved) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext,
      },
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

// Export pure helpers for testing; gate main() so a test import does not block on stdin.
export { resolveSid, stateFileFor, classify, midTurnThreshold, buildMidTurnBrief, loadState, saveState };

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
