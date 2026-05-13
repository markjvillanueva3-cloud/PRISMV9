#!/usr/bin/env node
// tier: T2
/**
 * cog-bridge-context-auto-compact.mjs — COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10
 * =============================================================================
 *
 * UserPromptSubmit hook that monitors context pressure and emits an advisory
 * compaction recommendation when usage crosses a configurable threshold
 * (default 80%). Closes one of the 3 architectural feedback loops identified
 * in COGNITIVE-STACK-AUDIT-2026-05-07.json:
 *
 *   Context: Pressure detection exists but compaction strategy is manual; no
 *            automated "compress when >80% full" trigger.
 *
 * Behavior: read CLAUDE_CONTEXT_TOKENS env (or estimate from session size if
 *           absent), compare to a 200K (Sonnet) / 1M (Opus) cap inferred from
 *           the model id, and append an advisory to additionalContext if the
 *           pressure ratio is above PRESSURE_THRESHOLD (default 0.80).
 *
 * The hook is non-blocking — it never sets `continue: false` or returns a
 * block decision. It writes a single advisory line to stdout's JSON envelope.
 *
 * Wire into .claude/settings.json under "hooks.UserPromptSubmit":
 *   { "matcher": "*", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/cog-bridge-context-auto-compact.mjs" }] }
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH10
 */

import fs from "node:fs";

const PRESSURE_THRESHOLD = Number(process.env.COG_BRIDGE_PRESSURE_THRESHOLD ?? "0.80");
const OPUS_CAP = 1_000_000;
const SONNET_CAP = 200_000;
const HAIKU_CAP = 200_000;

function readStdin() {
  try {
    const data = fs.readFileSync(0, "utf8");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function inferCap(modelId) {
  if (typeof modelId !== "string") return SONNET_CAP;
  const lower = modelId.toLowerCase();
  if (lower.includes("opus") && lower.includes("1m")) return OPUS_CAP;
  if (lower.includes("opus")) return OPUS_CAP;
  if (lower.includes("sonnet")) return SONNET_CAP;
  if (lower.includes("haiku")) return HAIKU_CAP;
  return SONNET_CAP;
}

function getCurrentTokens(event) {
  const envTokens = Number(process.env.CLAUDE_CONTEXT_TOKENS ?? "0");
  if (envTokens > 0) return envTokens;
  // Fallback estimate from event payload size
  const promptText = event?.user_prompt ?? event?.prompt ?? "";
  if (typeof promptText === "string") return Math.ceil(promptText.length / 4);
  return 0;
}

function emitAdvisory(text) {
  // UserPromptSubmit hook protocol: print JSON with hookSpecificOutput.additionalContext
  // (or just stdout) to inject context.
  const envelope = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: text,
    },
  };
  process.stdout.write(JSON.stringify(envelope) + "\n");
}

function main() {
  const event = readStdin();
  if (!event) {
    process.exit(0);
    return;
  }
  const modelId = event.model || event.session_metadata?.model || process.env.CLAUDE_MODEL_ID || "";
  const cap = inferCap(modelId);
  const current = getCurrentTokens(event);
  if (current <= 0 || cap <= 0) {
    process.exit(0);
    return;
  }
  const ratio = current / cap;
  if (ratio < PRESSURE_THRESHOLD) {
    process.exit(0);
    return;
  }
  const pct = Math.round(ratio * 100);
  emitAdvisory(
    `## ⚠️ Context pressure ${pct}% (cog-bridge auto-compact advisory)\n` +
    `Current ~${current.toLocaleString()} tokens of ~${cap.toLocaleString()} cap (${pct}%).\n` +
    `Threshold: ${Math.round(PRESSURE_THRESHOLD * 100)}%. Recommended: invoke /precompact or /compact ` +
    `before starting new non-trivial work to preserve handoff fidelity.`
  );
  process.exit(0);
}

main();
