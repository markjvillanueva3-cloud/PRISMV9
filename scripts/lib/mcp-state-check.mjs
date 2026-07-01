// scripts/lib/mcp-state-check.mjs
// -------------------------------
// PSN-MCP-DOWN-SUPPRESS/U-PMDS01 (2026-05-24, slot:alpha)
//
// Shared helper for any hook that wants to suppress route-suggest / dispatcher
// nudges when the MCP daemon is unreachable. Reads the connectivity-state
// sidecar written by mcp-connectivity-check.mjs (already wired UserPromptSubmit
// position 0). Stale data (>2× throttle window) is treated as 'unknown'
// (do NOT suppress — fail-safe surfaces nudges if state is gone).
//
// Pure helpers exported for tests:
//   - isMcpDown(state, opts) → {down, reason, ageMs}
//   - readMcpState(path) → state | null

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEFAULT_STATE_FILE = join(tmpdir(), "prism-hook-state", "mcp-connectivity-state.json");
export const DEFAULT_STALE_MS = 5 * 60_000; // 5min — 10× the 30s probe throttle

export function readMcpState(path = DEFAULT_STATE_FILE) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch { return null; }
}

/**
 * Pure: classify whether MCP is known-down.
 * state shape: { lastProbeAt: number, lastStatus: { ok: bool, error?, status? } }
 * Returns { down: bool, reason: string, ageMs: number|null }.
 *
 * Fail-safe semantics: when state is missing/stale/malformed, returns down=false
 * (don't suppress nudges based on absent data — better to over-emit than to
 * hide a working surface).
 */
export function isMcpDown(state, { staleMs = DEFAULT_STALE_MS, nowMs = Date.now() } = {}) {
  if (!state || typeof state !== "object") return { down: false, reason: "no-state", ageMs: null };
  if (!state.lastStatus || typeof state.lastStatus !== "object") return { down: false, reason: "no-status", ageMs: null };
  const ageMs = nowMs - (Number(state.lastProbeAt) || 0);
  if (ageMs > staleMs) return { down: false, reason: `stale (${ageMs}ms > ${staleMs}ms)`, ageMs };
  if (state.lastStatus.ok === false) return { down: true, reason: `mcp-disconnect (${state.lastStatus.error || "unknown-error"})`, ageMs };
  return { down: false, reason: "mcp-up", ageMs };
}
