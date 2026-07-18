// scripts/lib/ollama-state-check.mjs
// ----------------------------------
// PSN-OLLAMA-CHAT-DOWN-SUPPRESS/U-POCS01 (2026-05-24, slot:alpha)
//
// Sister to mcp-state-check.mjs. Reads the ollama-chat-state sidecar written
// by session-start-ollama-chat-probe.mjs to let any Ollama-routing hook
// short-circuit when /api/chat is known-dead (NOT just /api/tags-up).
//
// This is the structural close for Audit Gap #1 from prior /goal cycle.
// The probe lives in SessionStart so the (slow) /api/chat call happens once
// per session, not on every tool call.
//
// Pure helpers exported for tests.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEFAULT_STATE_FILE = join(tmpdir(), "prism-hook-state", "ollama-chat-state.json");
export const DEFAULT_STALE_MS = 30 * 60_000; // 30min — session-lifetime probe

export function readOllamaChatState(path = DEFAULT_STATE_FILE) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch { return null; }
}

/**
 * Pure: classify whether Ollama /api/chat is known-dead.
 * state shape: { lastProbeAt: number, chatOk: bool, latencyMs?: number, error?: string }
 * Returns { down: bool, reason: string, ageMs: number|null }.
 *
 * Fail-safe: missing/stale state → down:false (don't suppress over absent data).
 */
export function isOllamaChatDown(state, { staleMs = DEFAULT_STALE_MS, nowMs = Date.now() } = {}) {
  if (!state || typeof state !== "object") return { down: false, reason: "no-state", ageMs: null };
  if (typeof state.chatOk !== "boolean") return { down: false, reason: "no-chatOk", ageMs: null };
  const ageMs = nowMs - (Number(state.lastProbeAt) || 0);
  if (ageMs > staleMs) return { down: false, reason: `stale (${ageMs}ms > ${staleMs}ms)`, ageMs };
  if (state.chatOk === false) return { down: true, reason: `ollama-chat-dead (${state.error || "unknown"})`, ageMs };
  return { down: false, reason: "ollama-chat-up", ageMs };
}
