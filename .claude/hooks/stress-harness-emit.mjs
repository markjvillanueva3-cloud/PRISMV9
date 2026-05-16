#!/usr/bin/env node
// tier: T4
/**
 * stress-harness-emit.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STRESS-HARNESS
 *
 * Multi-event hook that fires on UserPromptSubmit + Stop + SessionStart +
 * PreCompact, emitting a JSONL row per event to
 * state/shared/stress-test-AUTONOMOUS-FLEET-MS0.jsonl.
 *
 * Used to verify the session-continuity stack (AUTOCOMPACT-AUTONOMOUS-MS0 +
 * AUTONOMOUS-FLEET-MS0 force-hooks) doesn't crack under the GNN-build load.
 * Pure additive: never blocks, never modifies state beyond the JSONL append.
 *
 * The hook auto-detects which event-type it's serving via the stdin shape +
 * env CLAUDE_HOOK_EVENT (Claude Code sets this on every hook invocation).
 *
 * Knob:
 *   PRISM_STRESS_HARNESS_DISABLE=1   — skip emission entirely
 *
 * @milestone AUTONOMOUS-FLEET-MS0
 * @unit U-AF-STRESS-HARNESS
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";

const REPO_ROOT = "H:/prism";
const SLOTS_JSON = resolve(REPO_ROOT, "state/shared/chat-slots.json");
const HARNESS_LOG = resolve(REPO_ROOT, "state/shared/stress-test-AUTONOMOUS-FLEET-MS0.jsonl");

const DISABLED = process.env.PRISM_STRESS_HARNESS_DISABLE === "1";

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function approveAndExit() {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}

function resolveEventType(input) {
  // Claude Code sets CLAUDE_HOOK_EVENT on every invocation
  const fromEnv = process.env.CLAUDE_HOOK_EVENT;
  if (fromEnv) {
    if (fromEnv === "SessionStart") return "session_start";
    if (fromEnv === "Stop") return "stop";
    if (fromEnv === "PreCompact") return "pre_compact";
    if (fromEnv === "UserPromptSubmit") return "user_prompt";
  }
  // Heuristic fallback from stdin shape
  if (input?.prompt) return "user_prompt";
  if (input?.matcher === "compact") return "session_start";
  return "unknown";
}

function resolveSlot(sid) {
  if (!sid) return null;
  try {
    const slots = JSON.parse(readFileSync(SLOTS_JSON, "utf-8")).slots ?? {};
    for (const [slot, s] of Object.entries(slots)) {
      if (s?.chatId === sid) return slot;
    }
  } catch { /* ignore */ }
  return null;
}

function gitBranch() {
  try { return execFileSync("git", ["-C", REPO_ROOT, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf-8", timeout: 2000 }).trim(); }
  catch { return null; }
}

function gitTopic() {
  try {
    const subj = execFileSync("git", ["-C", REPO_ROOT, "log", "-1", "--pretty=%s"], { encoding: "utf-8", timeout: 2000 }).trim();
    const m = subj.match(/\[([A-Z0-9-]+)\]/);
    return m ? m[1].toLowerCase() : null;
  } catch { return null; }
}

function buildContext(eventType, input) {
  const ctx = {};
  if (eventType === "user_prompt") {
    ctx.prompt_preview = (input?.prompt ?? "").slice(0, 200);
  } else if (eventType === "stop") {
    ctx.stop_hook_active = input?.stop_hook_active ?? false;
  } else if (eventType === "pre_compact") {
    ctx.trigger = input?.trigger ?? "unknown"; // manual vs auto
    ctx.custom_instructions_present = Boolean(input?.custom_instructions);
  } else if (eventType === "session_start") {
    ctx.matcher = input?.matcher ?? "unknown"; // startup | resume | compact | clear
  }
  return ctx;
}

function main() {
  if (DISABLED) approveAndExit();
  const input = readStdinJson();
  const eventType = resolveEventType(input);
  if (eventType === "unknown") approveAndExit();

  const sid = input?.session_id ?? null;
  const slot = resolveSlot(sid);
  const branch = gitBranch();
  const topic = gitTopic();
  const ctx = buildContext(eventType, input);

  const row = {
    ts: new Date().toISOString(),
    event: eventType,
    sid,
    slot,
    branch,
    topic,
    ctx,
  };

  try {
    mkdirSync(dirname(HARNESS_LOG), { recursive: true });
    appendFileSync(HARNESS_LOG, JSON.stringify(row) + "\n");
  } catch { /* never crash a hook */ }

  approveAndExit();
}

try { main(); }
catch {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}
