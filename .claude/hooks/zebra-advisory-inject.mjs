#!/usr/bin/env node
// tier: T2
// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA06 — advisory inject hook.
//
// UserPromptSubmit hook. Reads THIS chat's transcript via CHO02
// readChatPressure, calls CHO01 decideClearOrCompact, emits an
// additionalContext advisory line when the decision is non-noop.
//
// This is the ADVISORY surface — distinct from the token-awareness-inject
// hook (which shows raw state) and from the U-ZEBRA02 main loop (which
// SendKeys the chat). The advisory says: "zebra's decision module
// recommends X for THIS chat". For chats that have NOT opted into
// SendKeys, this is the only signal they receive from zebra.
//
// Knobs:
//   PRISM_ZEBRA_DISABLE=1            — kill switch (cascade from sweep)
//   PRISM_ZEBRA_ADVISORY_DISABLE=1   — disable this hook only
//   PRISM_ZEBRA_ADVISE_ON_NOOP=1     — also inject when decision=noop (default off, token-save)
//
// R12 fail-safe: missing/corrupt sidecar → silent no-op; decision module
// throws → silent no-op (never blocks the prompt).

import fs from "node:fs";
import { decideClearOrCompact } from "../../scripts/lib/chat-orchestrator-decisions.mjs";
import { readChatPressure } from "../../scripts/lib/chat-token-watch.mjs";
import { resolveSlotShared } from "../../scripts/lib/slot-resolve-shared.mjs";

const PRISM = "H:/prism";
const SLOTS_FILE = process.env.PRISM_ZEBRA_TEST_SLOTS_FILE || `${PRISM}/state/shared/chat-slots.json`;
const LOOP_STATE_DIR = process.env.PRISM_ZEBRA_TEST_LOOP_DIR || `${PRISM}/state/shared/loop-state`;

function safeJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

export function resolveSlotFromSlotsFile(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return "unknown";
  // U-SLOT-RESOLVE-UNIFY-2 (2026-06-18): canonical shared resolver -- EXACT
  // claude-<8hex> (derived from the full UUID) before any lenient substring, so
  // a peer 8hex inside this chat's UUID can't mis-resolve the advisory's slot.
  const r = resolveSlotShared(slotsDoc, { sessionId });
  return r ? r.slot : "unknown";
}

// Build the slim chatState for the decision module. R12: conservative
// defaults — when we cannot determine a flag, prefer the direction that
// PRESERVES continuity (compact > clear). User goal: stay on task.
export function buildChatState(pressure, { hasActiveLoop, hasHandoff } = {}) {
  if (!pressure) return null;
  return {
    tokensEstimate: pressure.tokens || 0,
    pressureLevel: pressure.level,
    hasActiveLoop: hasActiveLoop === true,
    // Default true: a chat at critical pressure with uncommitted work
    // should prefer compact (preserve) over clear (wipe). Determining
    // this cheaply per-prompt is expensive (git status); the conservative
    // default biases the recommendation safely.
    hasUncommittedCriticalWork: true,
    hasUnresolvedHandoff: hasHandoff === true,
  };
}

function readLoopActive(sessionId) {
  if (!sessionId) return false;
  // loop-state files are keyed by full session id or 8-char prefix
  const shortId = sessionId.slice(0, 8);
  for (const name of [`loop-${sessionId}.json`, `loop-${shortId}.json`]) {
    const p = `${LOOP_STATE_DIR}/${name}`;
    const doc = safeJson(p);
    if (doc && doc.status === "running") return true;
  }
  return false;
}

// Pure render — exported for tests.
export function renderAdvisory(decision, slot, pressure) {
  if (!decision || !decision.action) return null;
  const a = decision.action;
  if (a === "noop") return null; // gated by PRISM_ZEBRA_ADVISE_ON_NOOP at caller
  const pct = pressure?.tokens ? `~${Math.round(pressure.tokens / 1000)}K tokens` : "(no measurement)";
  const lines = [];
  lines.push("## 🦓 Zebra advisory (CHO01 decision)");
  lines.push(`slot=\`${slot}\` · pressure=${pressure?.level || "unknown"} · ${pct}`);
  if (a === "advise-only") {
    lines.push(`→ zebra: **advise-only** — ${decision.reason}. No action recommended yet; build on.`);
  } else if (a === "clear") {
    lines.push(`→ zebra: **/clear** recommended — ${decision.reason}. Clean continuity state; cheaper than /compact.`);
  } else if (a === "compact") {
    lines.push(`→ zebra: **/compact** recommended — ${decision.reason}. Preserves /loop + handoff continuity.`);
  } else {
    lines.push(`→ zebra: action=${a} — ${decision.reason}`);
  }
  lines.push(`_(Per-slot SendKeys opt-in via \`/zebra-opt-in\`. Kill: \`PRISM_ZEBRA_DISABLE=1\`.)_`);
  return lines.join("\n");
}

async function main() {
  if (process.env.PRISM_ZEBRA_DISABLE === "1") process.exit(0);
  if (process.env.PRISM_ZEBRA_ADVISORY_DISABLE === "1") process.exit(0);

  let raw = "";
  try {
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) raw += chunk;
  } catch { process.exit(0); }
  let cc = {};
  try { cc = JSON.parse(raw || "{}"); } catch { process.exit(0); }

  const sessionId = cc.session_id || "";
  if (!sessionId) process.exit(0);

  const slotsDoc = safeJson(SLOTS_FILE);
  const slot = resolveSlotFromSlotsFile(sessionId, slotsDoc);

  // Read pressure. Failure → silent no-op (R12).
  let pressure;
  try {
    pressure = readChatPressure(sessionId, { slot });
  } catch { process.exit(0); }
  if (!pressure || !pressure.level) process.exit(0);

  const hasActiveLoop = readLoopActive(sessionId);
  const hasHandoff = false; // determined by handoff freshness; deferred to U-ZEBRA02

  const chatState = buildChatState(pressure, { hasActiveLoop, hasHandoff });
  let decision;
  try { decision = decideClearOrCompact(chatState); } catch { process.exit(0); }
  if (!decision || !decision.action) process.exit(0);

  if (decision.action === "noop" && process.env.PRISM_ZEBRA_ADVISE_ON_NOOP !== "1") {
    process.exit(0);
  }

  const block = renderAdvisory(decision, slot, pressure);
  if (!block) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: block },
  }));
  process.exit(0);
}

main().catch(() => process.exit(0));
