#!/usr/bin/env node
// tier: T2
// TOKEN-AWARENESS-MS0 / U-TA05 — model-visible inject hook.
//
// UserPromptSubmit hook. Reads the per-slot sidecar written by
// token-awareness-sidecar.mjs and emits a 3-line `additionalContext` block so
// the model SEES its current ctx/quota state and can self-pace.
//
// Wording is STATE not INSTRUCTION (per the Reddit r/ClaudeAI thread's
// "model anxiety" warning — telling the model "you must compact" makes it
// rush; showing it "ctx 87%, zone RED" lets it decide). The CLAUDE.md doctrine
// §TOKEN-AWARENESS-MS0 carries the actual rules; this hook just surfaces data.
//
// Knobs:
//   PRISM_TOKEN_AWARE_INJECT=0       — disable injection
//   PRISM_TOKEN_AWARE_INJECT_GREEN=1 — also inject when zone=GREEN (default off to save tokens)
//
// Fail-safe: missing sidecar → silent no-op (no inject); never blocks.

import fs from "node:fs";
import {
  applyStaleness,
  DEFAULT_STALE_TTL_MS,
} from "../../scripts/lib/token-awareness-state.mjs";

const PRISM = "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;

function safeJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function resolveSlot(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return "unknown";
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    if (data.chatId && sessionId.includes(data.chatId.replace(/^claude-/, ""))) return name;
  }
  return "unknown";
}

function fmtTokens(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "0";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return Math.round(v / 1_000) + "K";
  return String(Math.round(v));
}

// Detect /loop-class keywords in the user prompt. When the user is driving
// an autonomous loop (U-TA07), a RED+ zone needs a stronger advisory because
// the next iteration WILL spend more tokens — declining gracefully NOW saves
// the trailing iterations.
export function isAutonomousLoopPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return false;
  return /\/loop\b|\/autopilot-full\b|\/checkin-\w+\s+\/loop|until complete|keep going|continuous/i.test(prompt);
}

// Build the additionalContext block. Pure fn for testability.
export function renderInject(state, { injectOnGreen = false, isLoop = false } = {}) {
  if (!state || typeof state !== "object") return null;
  if (!injectOnGreen && state.zone === "GREEN" && !state.stale) return null;

  const lines = [];
  lines.push("## 🎚️ Token-awareness state");

  // Line 1 — headline percentages
  const ctxPct = state.ctx?.pct != null ? (state.ctx.pct * 100).toFixed(0) + "%" : "—";
  const fhPct = state.quota?.fiveHour?.pct != null ? (state.quota.fiveHour.pct * 100).toFixed(0) + "%" : "—";
  const sdPct = state.quota?.sevenDay?.pct != null ? (state.quota.sevenDay.pct * 100).toFixed(0) + "%" : "—";
  const offloadPct = state.offload?.ratio != null ? (state.offload.ratio * 100).toFixed(0) + "%" : "—";

  const zoneEmoji =
    state.zone === "GREEN" ? "🟢"
    : state.zone === "YELLOW" ? "🟡"
    : state.zone === "RED" ? "🔴"
    : state.zone === "CRITICAL" ? "⛔"
    : "⚪";

  lines.push(`${zoneEmoji} **zone=${state.zone}** · ctx=${ctxPct} · 5h=${fhPct} · 7d=${sdPct} · ollama-offload=${offloadPct}`);

  // Line 2 — worst-of + cumulative usage
  const worstLabel = {
    ctx: "context-window",
    "5h": "5h quota",
    "7d": "7d quota",
    unknown: "(no signal)",
  }[state.worstSource || "unknown"];
  const cumIn = state.cumulative ? fmtTokens(state.cumulative.input) : "—";
  const cumCR = state.cumulative ? fmtTokens(state.cumulative.cache_read) : "—";
  const cumOut = state.cumulative ? fmtTokens(state.cumulative.output) : "—";
  lines.push(`bottleneck=${worstLabel} (${(state.worstPct * 100).toFixed(0)}%) · session-cumul: in=${cumIn} cache_read=${cumCR} out=${cumOut}`);

  // Line 3 — recommended action (STATE not INSTRUCTION — phrased as advisory)
  if (state.zone === "YELLOW") {
    lines.push("→ approaching budget — prefer Ollama offload, batch tool calls, avoid exploratory subagents");
  } else if (state.zone === "RED") {
    lines.push("→ near hard limit — voluntary /compact now preserves cleaner handoff than a forced trip");
  } else if (state.zone === "CRITICAL") {
    lines.push("→ at hard limit — write handoff + /compact immediately to avoid forced truncation");
  }

  // /loop-specific advisory — fires only when the prompt looks autonomous
  // AND the zone is RED+ (next iteration will spend more tokens than this
  // session can afford). Phrased as a budget-survival observation, not an
  // instruction.
  if (isLoop && (state.zone === "RED" || state.zone === "CRITICAL")) {
    lines.push("→ /loop detected: next iteration will likely exceed budget — voluntarily /precompact then /compact NOW preserves the next 3–6 iterations cleanly. Forced trip mid-iteration corrupts handoff.");
  }

  // Staleness flag — always last
  if (state.stale) {
    const ageS = state.ageMs ? `${Math.round(state.ageMs / 1000)}s` : "unknown";
    lines.push(`⚠ sidecar stale (age=${ageS} > ${DEFAULT_STALE_TTL_MS / 1000}s) — values may not reflect current state`);
  }

  return lines.join("\n");
}

async function main() {
  if (process.env.PRISM_TOKEN_AWARE_INJECT === "0") {
    process.exit(0);
  }

  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  let cc = {};
  try {
    cc = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }

  const sessionId = cc.session_id || "";
  if (!sessionId) process.exit(0);

  const slotsDoc = safeJson(SLOTS_FILE);
  const slot = resolveSlot(sessionId, slotsDoc);
  const sidecarPath = `${PRISM}/state/shared/token-budget-${slot}.json`;
  const sidecar = safeJson(sidecarPath);
  if (!sidecar) {
    // No sidecar yet (first prompt of a session, or hook disabled) → silent.
    process.exit(0);
  }

  const aged = applyStaleness(sidecar, Date.now());
  const injectOnGreen = process.env.PRISM_TOKEN_AWARE_INJECT_GREEN === "1";
  // U-TA07 — /loop detection: stronger advisory when an autonomous iteration
  // is about to run with insufficient budget.
  const isLoop = isAutonomousLoopPrompt(cc.prompt || "");
  const block = renderInject(aged, { injectOnGreen, isLoop });
  if (!block) process.exit(0);

  // Emit Claude Code hookSpecificOutput.additionalContext envelope
  const out = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: block,
    },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

main().catch(() => process.exit(0));
