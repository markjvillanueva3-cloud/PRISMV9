// autostart-bus.mjs — cross-hook autostart coalescer.
// HIGH-ROI-TS2 audit-final/iter2 (2026-05-22). Closes Finding F3 from
// OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md.
//
// Problem: SessionStart fires 4+ autostart hooks (ollama, nim, http,
// mcp-daemon, ...). Each independently does an HTTP probe to check if its
// service is running. The probes are concurrent and the 26-chat fleet
// generates 4 × 26 = ~104 probes per SessionStart wave — pure overhead when
// the services are already up.
//
// Each hook already has a per-service lock (e.g. ollama-autostart.lock) that
// prevents 26 chats from racing to start the SAME service. This bus is a
// HIGHER-level coalescer: it lets a chat skip the probe entirely if any
// peer chat probed THIS service within the last 30s.
//
// Usage in an autostart hook:
//
//   import { recentlyProbed, markProbed } from "../../scripts/lib/autostart-bus.mjs";
//   if (recentlyProbed("ollama")) return { skip: true };
//   // ... do probe + maybe start ...
//   markProbed("ollama", { running, started, error });
//
// Cross-host safe: lock file is per-host (uses os.hostname() in the key).
// Atomic-write per-PID temp + rename. Schema: { [serviceName]: { ts, result } }.
//
// Disable knob: PRISM_AUTOSTART_BUS_DISABLE=1 — every recentlyProbed call
// returns false (each hook does its own work, same as pre-bus behavior).

import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { hostname } from "node:os";
import { dirname } from "node:path";

const BUS_FILE = "H:/prism/.claude/cache/autostart-bus.json";
const DEFAULT_TTL_MS = 30_000;

function _hostKey(serviceName) {
  return `${hostname()}::${serviceName}`;
}

function _loadBus() {
  try { return JSON.parse(readFileSync(BUS_FILE, "utf8")); }
  catch { return {}; }
}

function _saveBus(state) {
  try {
    const dir = dirname(BUS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = `${BUS_FILE}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    try { renameSync(tmp, BUS_FILE); }
    catch { try { unlinkSync(tmp); } catch { /* gone */ } }
  } catch { /* fail-soft */ }
}

/**
 * Has any peer chat probed this service in the last `ttlMs` ms?
 * Returns false if the bus is disabled (PRISM_AUTOSTART_BUS_DISABLE=1) so
 * the caller falls through to its normal probe path.
 *
 * @param {string} serviceName  canonical service id (ollama, nim, http, mcp-daemon)
 * @param {number} [ttlMs]      coalescing window — default 30s
 * @returns {{ skip: boolean, lastResult?: object, ageMs?: number }}
 */
export function recentlyProbed(serviceName, ttlMs = DEFAULT_TTL_MS) {
  if (process.env.PRISM_AUTOSTART_BUS_DISABLE === "1") return { skip: false };
  if (!serviceName) return { skip: false };
  const state = _loadBus();
  const entry = state[_hostKey(serviceName)];
  if (!entry || typeof entry.ts !== "number") return { skip: false };
  const ageMs = Date.now() - entry.ts;
  if (ageMs > ttlMs) return { skip: false };
  return { skip: true, lastResult: entry.result, ageMs };
}

/**
 * Mark that THIS process just probed this service. Stores `result` so the
 * next peer's `recentlyProbed` can surface it (advisory). Best-effort write
 * — never throws.
 *
 * @param {string} serviceName
 * @param {object} result        e.g. { running: true, started: false }
 */
export function markProbed(serviceName, result) {
  if (process.env.PRISM_AUTOSTART_BUS_DISABLE === "1") return;
  if (!serviceName) return;
  const state = _loadBus();
  state[_hostKey(serviceName)] = {
    ts: Date.now(),
    result: result && typeof result === "object" ? result : null,
  };
  // Prune entries older than 10 × TTL to keep the bus file lean.
  const cutoff = Date.now() - 10 * DEFAULT_TTL_MS;
  for (const [k, v] of Object.entries(state)) {
    if (!v || typeof v.ts !== "number" || v.ts < cutoff) delete state[k];
  }
  _saveBus(state);
}

/**
 * For tests + debug: read current bus state.
 * @returns {object}  copy of bus state
 */
export function readBus() {
  return _loadBus();
}
