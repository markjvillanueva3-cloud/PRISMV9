#!/usr/bin/env node
// tier: T1
/**
 * command-telemetry-record.mjs — PostToolUse "Skill" hook
 *
 * U-CK26 — closes the ghost-orphan class for psk syscall_record. The kernel
 * writer at .claude/kernel/psk.mjs (syscall_record, l949) was correct and
 * canonical but had NO producer wired — state/shared/pipeline-telemetry.jsonl
 * was 100% test data, starving CK27/28/29 (adaptive-thresholds, auto skill-
 * tier loop, outcome→memory).
 *
 * This hook IS the producer. PostToolUse on the Skill tool fires for every
 * slash-command / model-invoked skill, which is the precise deterministic
 * signal for "a command was invoked" (UserPromptSubmit prompt-parsing misses
 * model-invoked skills + double-counts).
 *
 * LATENCY INVARIANT (LOAD-BEARING — ≤26 concurrent chats, every skill call):
 * the hook MUST NOT block. The psk writer is spawned DETACHED, fire-and-
 * forget; the hook returns {continue:true} in <5ms regardless of writer
 * outcome. NEVER use spawnSync. NEVER append to the jsonl directly (would
 * fork the canonical writer's DoS-clamp + fallback logic).
 *
 * Knobs:
 *   PRISM_CMD_TELEMETRY_DISABLE=1   — hard off (no-op)
 *   PRISM_CMD_TELEMETRY_PSK=<path>  — override psk.mjs path (TEST SEAM —
 *                                     mirror slot-bind-enforce; the
 *                                     integration test points this at a
 *                                     hermetic fake so the LIVE jsonl is
 *                                     never written).
 *   PRISM_TELEMETRY_PATH=<path>     — already honored by psk's syscall_record
 *                                     (resolveTelemetryFile); we pass it
 *                                     through unchanged.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test seam: PRISM_CMD_TELEMETRY_PSK lets the subprocess test point main()
// at a hermetic fake psk.mjs that records its invocation without writing the
// live pipeline-telemetry.jsonl. In production the env var is unset → real
// kernel.
const PSK_PATH =
  process.env.PRISM_CMD_TELEMETRY_PSK ||
  resolve(__dirname, "..", "kernel", "psk.mjs");

// Clamp to keep payloads sane — kernel re-clamps but we never want to
// push a 10 MB skill name through process.spawn's argv.
const MAX_SKILL_NAME_LEN = 256;

// ────────────────────────────────────────────────────────────────────────
// Pure decision core — no I/O. Given the PostToolUse payload, decide
// whether to record + extract the canonical fields. Adversarial-safe.
// ────────────────────────────────────────────────────────────────────────
/**
 * @param {{toolName?:string, toolInput?:any, toolResponse?:any}} args
 * @returns {{shouldRecord:boolean, event?:string, command?:string,
 *           outcome?:string, latency_ms?:number|null, reason:string}}
 */
export function decideRecord(args) {
  const p = args && typeof args === "object" ? args : {};
  if (p.toolName !== "Skill") {
    return { shouldRecord: false, reason: "non-skill-tool" };
  }
  const input = p.toolInput && typeof p.toolInput === "object" ? p.toolInput : null;
  if (!input) {
    return { shouldRecord: false, reason: "missing-tool-input" };
  }
  // Skill tool's canonical field is `skill`; fall back to `name` / `command`
  // defensively. We NEVER use toolName ("Skill") as command — that would
  // produce garbage rows.
  let rawSkill = null;
  for (const k of ["skill", "name", "command"]) {
    const v = input[k];
    if (typeof v === "string" && v.trim().length > 0) {
      rawSkill = v.trim();
      break;
    }
  }
  if (!rawSkill) {
    return { shouldRecord: false, reason: "missing-skill-name" };
  }
  const command = rawSkill.slice(0, MAX_SKILL_NAME_LEN);

  // Outcome detection. PostToolUse fires after execution; tool_response
  // shape varies. Treat explicit is_error:true as error, otherwise ok.
  // Missing tool_response → outcome="unknown" (still record — the producer
  // SHOULD emit even ambiguous outcomes; the loop wants raw events).
  let outcome = "ok";
  const resp = p.toolResponse;
  if (resp == null) {
    outcome = "unknown";
  } else if (typeof resp === "object" && resp.is_error === true) {
    outcome = "error";
  } else if (typeof resp === "object" && typeof resp.error === "string" && resp.error.length > 0) {
    outcome = "error";
  }

  // Latency — pass-through if the payload carries it, else null.
  let latency_ms = null;
  if (typeof input.latency_ms === "number" && Number.isFinite(input.latency_ms)) {
    latency_ms = input.latency_ms;
  } else if (resp && typeof resp === "object"
             && typeof resp.latency_ms === "number"
             && Number.isFinite(resp.latency_ms)) {
    latency_ms = resp.latency_ms;
  }

  return {
    shouldRecord: true,
    event: "command_invoked",
    command,
    outcome,
    latency_ms,
    reason: "skill-invocation",
  };
}

// ────────────────────────────────────────────────────────────────────────
// Detached writer — spawn the psk CLI, never block, never inherit stdio.
// Injectable so the test seam can swap in a recording fake.
// ────────────────────────────────────────────────────────────────────────
/**
 * @param {{event:string, command:string, outcome:string,
 *          latency_ms:number|null, chatId?:string|null}} decision
 * @param {{pskPath:string, spawnImpl?:typeof spawn, nodeBin?:string}} [opts]
 * @returns {{ok:boolean, spawnedArgv?:string[], error?:string}}
 */
export function recordViaPsk(decision, opts) {
  const o = opts || {};
  const pskPath = o.pskPath || PSK_PATH;
  const spawnImpl = o.spawnImpl || spawn;
  const nodeBin = o.nodeBin || process.execPath;

  // ARM-B P1 FIX (2026-05-19): use `--key=value` form for every string-valued
  // flag. The psk argv parser (parseArgs in psk.mjs) treats a value that
  // STARTS WITH `--` as a new flag, not a value — so a skill named
  // `--telemetry-file` would collide and silently set telemetryFile instead
  // of command. The `=` form is unambiguous (parser splits at first `=`).
  // Numeric latency stays positional (well-known coerced by parseArgs).
  const argv = [
    pskPath,
    "record",
    `--event=${decision.event}`,
    `--command=${decision.command}`,
    `--outcome=${decision.outcome}`,
  ];
  if (decision.latency_ms != null) {
    argv.push("--latency_ms", String(decision.latency_ms));
  }
  // extra is JSON-shaped per psk syscall_record contract. Keep it tiny —
  // kernel clamps to RECORD_MAX_EXTRA anyway. Use `=` form (same reason).
  const extra = {};
  if (decision.chatId) { extra.chatId = decision.chatId; }
  if (Object.keys(extra).length > 0) {
    argv.push(`--extra=${JSON.stringify(extra)}`);
  }

  try {
    const child = spawnImpl(nodeBin, argv, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    if (child && typeof child.unref === "function") { child.unref(); }
    return { ok: true, spawnedArgv: argv };
  } catch (err) {
    // Fail-safe: a spawn failure must NEVER bubble — the user's tool already
    // ran successfully; telemetry is non-load-bearing. Log to stderr for
    // operator visibility (R12 fail-loud where it costs nothing) — a silently
    // swallowed spawn failure makes a telemetry blackout undebuggable
    // post-incident. main() does not inspect writeResult.ok, so this catch
    // is the ONLY place the failure is observable; it MUST write here.
    const msg = err && err.message ? err.message : String(err);
    try {
      process.stderr.write(`[command-telemetry-record] psk spawn failed: ${msg}\n`);
    } catch { /* stderr itself unavailable — nothing left to do */ }
    return { ok: false, error: msg };
  }
}

// ────────────────────────────────────────────────────────────────────────
// chatId derivation — same convention as chat-state-isolator /
// slot-bind-enforce / precompact-handoff. NO case-fold.
// ────────────────────────────────────────────────────────────────────────
/**
 * @param {unknown} sessionId
 * @returns {string|null}
 */
export function deriveChatId(sessionId) {
  if (typeof sessionId !== "string" || sessionId.length < 8) { return null; }
  // Must be hex-ish (the harness ids are uuid4). Accept any ascii to be
  // permissive but cap at 8 chars to match the canonical claude-<8> form.
  const head = sessionId.slice(0, 8);
  if (!/^[A-Za-z0-9]+$/.test(head)) { return null; }
  return `claude-${head}`;
}

// ────────────────────────────────────────────────────────────────────────
// CLI / hook entry — reads stdin, decides, fires detached writer.
// Returns {continue:true, suppressOutput:true} on stdout. NEVER blocks.
// ────────────────────────────────────────────────────────────────────────
export async function main(opts) {
  const o = opts || {};
  const readStdin = o.readStdin || (() => {
    try { return readFileSync(0, "utf-8"); } catch { return ""; }
  });
  const stdoutWrite = o.stdoutWrite || ((s) => process.stdout.write(s));
  const env = o.env || process.env;

  // Always emit a valid JSON response so the harness never sees an empty
  // stdout (which would block).
  const ack = () => stdoutWrite(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");

  if (env.PRISM_CMD_TELEMETRY_DISABLE === "1") { ack(); return { acted: false, reason: "disabled" }; }

  let payload = null;
  try {
    const raw = readStdin();
    if (raw && raw.trim().length > 0) { payload = JSON.parse(raw); }
  } catch { /* malformed stdin → ack + no-op */ }

  if (!payload || typeof payload !== "object") { ack(); return { acted: false, reason: "no-payload" }; }

  // Claude Code PostToolUse stdin shape: { session_id, tool_name, tool_input, tool_response }
  const decision = decideRecord({
    toolName: payload.tool_name,
    toolInput: payload.tool_input,
    toolResponse: payload.tool_response,
  });
  if (!decision.shouldRecord) { ack(); return { acted: false, reason: decision.reason }; }

  const chatId = deriveChatId(payload.session_id);
  const writeResult = recordViaPsk(
    { ...decision, chatId },
    { pskPath: o.pskPath || PSK_PATH, spawnImpl: o.spawnImpl, nodeBin: o.nodeBin }
  );

  ack();
  return { acted: true, decision, chatId, writeResult };
}

// CLI entrypoint — only when invoked directly, never on import.
const isDirectInvoke =
  Array.isArray(process.argv) &&
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectInvoke) {
  main().catch((err) => {
    // Last-ditch fail-safe: never break the harness chain.
    process.stderr.write(`[command-telemetry-record] fatal: ${err && err.message ? err.message : String(err)}\n`);
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
    process.exit(0);
  });
}
