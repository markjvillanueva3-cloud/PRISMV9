#!/usr/bin/env node
// tier: T3
/**
 * session-start-ollama-chat-probe.mjs — SessionStart hook
 *
 * PSN-OLLAMA-CHAT-DOWN-SUPPRESS/U-POCS02 (2026-05-24, slot:alpha)
 *
 * Once per session, probes Ollama `/api/chat` with a trivial request to
 * detect the "tags-up but chat-dead" failure mode (GPU contention / stuck
 * model). Writes result to tmpdir/prism-hook-state/ollama-chat-state.json
 * so downstream Ollama-routing hooks (prompt-rewriter, ollama-pipeline-injector,
 * etc.) can read isOllamaChatDown() and short-circuit.
 *
 * Knobs:
 *   PRISM_OLLAMA_CHAT_PROBE_DISABLE=1
 *   PRISM_OLLAMA_CHAT_PROBE_TIMEOUT_MS (default 8000)
 *   OLLAMA_URL (default http://127.0.0.1:11434)
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

const DEFAULT_TIMEOUT_MS = 8000;
const STATE_FILE = join(tmpdir(), "prism-hook-state", "ollama-chat-state.json");

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function probeChat(url, timeoutMs) {
  const start = Date.now();
  const ctl = new AbortController();
  const deadline = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen2.5-coder:32b", stream: false, prompt: "ok", options: { num_predict: 2 } }),
      signal: ctl.signal,
    });
    if (!res.ok) return { chatOk: false, latencyMs: Date.now() - start, error: `HTTP-${res.status}` };
    await res.json(); // ensure body parses
    return { chatOk: true, latencyMs: Date.now() - start, error: null };
  } catch (e) {
    return { chatOk: false, latencyMs: Date.now() - start, error: e?.name === "AbortError" ? "timeout" : (e?.message || "unknown") };
  } finally {
    clearTimeout(deadline);
  }
}

function writeState(state) {
  try {
    if (!existsSync(dirname(STATE_FILE))) mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state), "utf8");
  } catch { /* fail-soft */ }
}

async function main() {
  if (process.env.PRISM_OLLAMA_CHAT_PROBE_DISABLE === "1") return pass();
  const url = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const timeoutMs = Number.parseInt(process.env.PRISM_OLLAMA_CHAT_PROBE_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS), 10);
  const result = await probeChat(url, timeoutMs);
  writeState({ lastProbeAt: Date.now(), ...result });
  if (!result.chatOk) {
    // Surface 1-line at SessionStart so the model knows the routing surface is degraded
    const msg = `## ⚠ Ollama \`/api/chat\` is dead (${result.error}, ${result.latencyMs}ms)\nPrompt-rewriter + ollama-routing hooks will silently skip until recovery. Restart Ollama or free GPU.\n_Disable probe: \`PRISM_OLLAMA_CHAT_PROBE_DISABLE=1\`._`;
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: msg },
    }));
    return;
  }
  pass();
}

if (process.argv[1] && process.argv[1].endsWith("session-start-ollama-chat-probe.mjs")) {
  main().catch(() => pass());
}
