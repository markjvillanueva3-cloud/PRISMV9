#!/usr/bin/env node
/**
 * terminal-window-id.mjs — Stable identity for the PowerShell/terminal WINDOW
 * hosting this Claude session.
 *
 * Why this exists:
 *   The PRISM fleet uses slot-bound handoffs (alpha..foxtrot + golf, expanding
 *   to alpha..india + juliett). Today slot↔chat binding uses the session UUID
 *   as the key — which means EVERY new chat (and every /clear) inside the
 *   same terminal window claims a NEW slot. Operator-observed pathology:
 *   chat A in Window-1 claims alpha, /compact spawns chat B in Window-1, chat
 *   B claims bravo because alpha already has a stale chatId. Lane drift.
 *
 *   With a stable per-window id, slot↔window binding survives /compact,
 *   /clear, and any new chat spawned in the same PowerShell window. 10
 *   concurrent windows = 10 distinct ids = 10 deterministic slots, never
 *   drifting.
 *
 * Resolution order (each step is best-effort; falls through on failure):
 *   0. Cache hit — keyed on Claude session id. Within a single chat, every
 *      resolver call returns the same id (kills the "wmic flaked once" drift
 *      class — the most common observed pathology).
 *   1. WT_SESSION env var — Windows Terminal sets a UUID per tab/pane that
 *      persists for the tab's entire lifetime. Inherited by every child
 *      process (claude.exe, node, bash). This is the canonical id when
 *      Windows Terminal hosts the session.
 *   2. Ancestor PowerShell PID — walk `process.ppid` upward via `Get-CimInstance`
 *      (Win11-native, replaces deprecated wmic) until we find a powershell.exe /
 *      pwsh.exe / cmd.exe. The shell PID persists for the window's lifetime.
 *      Used when WT_SESSION is absent (conhost.exe directly, VS Code integrated
 *      terminal, SSH session).
 *   3. First non-shell-child ancestor — walk past bash.exe / cmd.exe / sh.exe
 *      / wsh.exe and use the first NON-shell-child ancestor PID. This is more
 *      stable than tier-4 because bash.exe is per-tool-call (varies) while its
 *      grandparent claude.exe is per-chat (stable).
 *   4. Immediate ppid — the direct parent process PID. Last resort.
 *
 * Output format: a stable string `tw-<scheme>-<id>` where scheme ∈
 *   { wt, ps, pa, pp } (Windows Terminal session, PowerShell ancestor,
 *   Non-bash-child Parent Ancestor, parent PID). Same window resolves to the
 *   same id across multiple invocations regardless of which scheme actually
 *   fires (caches first resolved id in cache/terminal-window-cache.json).
 *
 * Never-downgrade rule: once a session has resolved to a high-tier id
 * (tw-wt-*, tw-ps-*, tw-pa-*), it can never overwrite with a lower-tier
 * id (tw-pp-*). Prevents the "wmic worked once then flaked" drift class.
 *
 * Pure / no side effects beyond the cache write.
 * Bounded runtime: each spawn has a 2-second hard timeout. If everything
 * is slow, scheme degrades to `pp`.
 *
 * Knobs:
 *   PRISM_TERMINAL_WINDOW_ID         — explicit override (CI / tests)
 *   PRISM_TERMINAL_WINDOW_ID_DISABLE — return null (disables pinning)
 *   PRISM_TWID_TIMEOUT_MS            — ancestry-walk budget (default 2000)
 *   PRISM_TWID_CACHE_DISABLE         — skip tier-0 cache
 *   PRISM_TWID_CACHE_FILE            — override cache path (tests)
 *
 * @returns {string|null}
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TIMEOUT_MS = Number(process.env.PRISM_TWID_TIMEOUT_MS || 2000);
const DEFAULT_CACHE_FILE = "H:/prism/.claude/cache/terminal-window-cache.json";
const SHELL_BASENAMES = new Set(["powershell.exe", "pwsh.exe", "cmd.exe"]);
const SHELL_CHILD_BASENAMES = new Set(["bash.exe", "sh.exe", "wsh.exe", "conhost.exe", "node.exe"]);
const MAX_ANCESTOR_HOPS = 8;

// Tier ranking: higher number = higher priority. Used by never-downgrade rule.
const TIER_RANK = { "wt": 4, "ps": 3, "pa": 2, "pp": 1 };
const MAX_TIER = 4;

// Cache-hit auto-upgrade probe throttle. When the cached entry's tier is below
// MAX_TIER, the resolver re-attempts a fresh resolution at most once per this
// many ms — if the fresh tier is higher, the cache entry upgrades.
// Closes Reviewer B P2 (CHECKIN-UPGRADE-MS0 commit 59465d7c2 follow-up): a
// session that first resolved to tw-pp-* (wmic flaked) would otherwise freeze
// at tier 1 forever, defeating the never-downgrade rule's intent.
const AUTOUPGRADE_THROTTLE_MS = Number(process.env.PRISM_TWID_AUTOUPGRADE_THROTTLE_MS || 30000);

function cacheFile() {
  return process.env.PRISM_TWID_CACHE_FILE || DEFAULT_CACHE_FILE;
}

function readCache() {
  try {
    const p = cacheFile();
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, "utf-8");
    if (!raw || raw.trim().length === 0) return {};
    const j = JSON.parse(raw);
    return (j && typeof j === "object") ? j : {};
  } catch { return {}; }
}

function writeCache(obj) {
  try {
    const p = cacheFile();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
    return true;
  } catch { return false; }
}

export function tierOf(id) {
  if (typeof id !== "string") return 0;
  const m = id.match(/^tw-([a-z]+)-/);
  if (!m) return 0;
  return TIER_RANK[m[1]] || 0;
}

function safeSpawnSync(cmd, args, opts = {}) {
  try {
    return spawnSync(cmd, args, {
      encoding: "utf-8",
      timeout: TIMEOUT_MS,
      windowsHide: true,
      ...opts,
    });
  } catch {
    return { status: 1, stdout: "", stderr: "" };
  }
}

/**
 * Single-step PID → {name, ppid} lookup. Tries Get-CimInstance first
 * (Win11-native), falls back to wmic (Win10-legacy), then tasklist.
 *
 * Returns { name: lowercase-basename, ppid: number } or null.
 */
export function getProcessInfo(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return null;

  // Tier A: PowerShell Get-CimInstance — Win11-native, structured JSON
  const psCmd = `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object Name,ParentProcessId | ConvertTo-Json -Compress`;
  const psResult = safeSpawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", psCmd]);
  if (psResult.status === 0 && psResult.stdout) {
    try {
      const j = JSON.parse(psResult.stdout.trim());
      if (j && j.Name) {
        return { name: String(j.Name).toLowerCase().trim(), ppid: Number(j.ParentProcessId) };
      }
    } catch { /* fall through */ }
  }

  // Tier B: wmic (deprecated on Win11 but often still installed)
  const wmicResult = safeSpawnSync("wmic", [
    "process", "where", `ProcessId=${pid}`,
    "get", "ParentProcessId,Name", "/format:csv",
  ]);
  if (wmicResult.status === 0 && wmicResult.stdout) {
    const lines = wmicResult.stdout.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("Node,"));
    if (lines.length > 0) {
      const cols = lines[0].split(",");
      if (cols.length >= 3) {
        const name = (cols[1] || "").toLowerCase().trim();
        const ppid = parseInt(cols[2], 10);
        if (name) return { name, ppid: Number.isFinite(ppid) ? ppid : 0 };
      }
    }
  }

  return null;
}

/**
 * Walk PID ancestry. Stops at first match of `stopPredicate(name) → true`
 * or after MAX_ANCESTOR_HOPS. Returns the PID of the matching ancestor,
 * or null if no match (still respects timeout).
 */
function walkAncestors(startPid, stopPredicate) {
  if (!Number.isFinite(startPid) || startPid <= 0) return null;
  let pid = startPid;
  for (let hop = 0; hop < MAX_ANCESTOR_HOPS; hop++) {
    if (!Number.isFinite(pid) || pid <= 0) return null;
    const info = getProcessInfo(pid);
    if (!info) return null;
    if (stopPredicate(info.name, pid)) return pid;
    if (!Number.isFinite(info.ppid) || info.ppid <= 0 || info.ppid === pid) return null;
    pid = info.ppid;
  }
  return null;
}

export function findAncestorShellPid(startPid) {
  return walkAncestors(startPid, (name) => SHELL_BASENAMES.has(name));
}

/**
 * Tier-3 helper: find the first ancestor that is NOT a shell-child (not
 * bash.exe / sh.exe / cmd.exe / conhost.exe / node.exe). The intent: skip
 * past the per-tool-call bash.exe and short-lived helpers to reach the
 * stable claude.exe / harness process. Its PID is per-chat-stable.
 */
export function findStableAncestorPid(startPid) {
  return walkAncestors(startPid, (name) => !SHELL_CHILD_BASENAMES.has(name) && !SHELL_BASENAMES.has(name));
}

/**
 * @param {Object} [opts]
 * @param {number} [opts.ppid] — override parent pid (tests)
 * @param {string} [opts.sessionId] — Claude session id for cache key
 * @returns {string|null}
 */
export function resolveTerminalWindowId(opts = {}) {
  if (process.env.PRISM_TERMINAL_WINDOW_ID_DISABLE === "1") return null;

  const override = process.env.PRISM_TERMINAL_WINDOW_ID;
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }

  const useCache = process.env.PRISM_TWID_CACHE_DISABLE !== "1";
  const sessionId = (opts.sessionId && typeof opts.sessionId === "string") ? opts.sessionId : null;

  // TIER 0: cache by sessionId — with throttled auto-upgrade probe.
  // If the cached entry is below MAX_TIER (i.e. a degraded tw-pp/tw-pa/tw-ps
  // resolution), we re-attempt fresh resolution at most once per
  // AUTOUPGRADE_THROTTLE_MS. If the fresh tier is HIGHER, we upgrade the
  // cache entry. This closes Reviewer B P2 — the never-downgrade rule's
  // write-side compare was unreachable on cache-hit, freezing degraded
  // entries at their first-resolution tier forever.
  if (useCache && sessionId) {
    const cache = readCache();
    const hit = cache[sessionId];
    if (hit && typeof hit.id === "string" && hit.id.length > 0) {
      const cachedTier = tierOf(hit.id);
      const now = Date.now();
      const lastProbeMs = Number(Date.parse(hit.lastProbeAt || hit.recordedAt || "")) || 0;
      const ageMs = now - lastProbeMs;
      const upgradeDisabled = process.env.PRISM_TWID_AUTOUPGRADE_DISABLE === "1";
      const shouldProbe = !upgradeDisabled
        && cachedTier > 0
        && cachedTier < MAX_TIER
        && ageMs >= AUTOUPGRADE_THROTTLE_MS;

      if (shouldProbe) {
        const fresh = computeFreshId(opts);
        if (fresh && tierOf(fresh) > cachedTier) {
          cache[sessionId] = {
            id: fresh,
            tier: tierOf(fresh),
            recordedAt: hit.recordedAt || new Date(now).toISOString(),
            lastSeenAt: new Date(now).toISOString(),
            lastProbeAt: new Date(now).toISOString(),
            upgradedFrom: hit.id,
          };
          writeCache(cache);
          return fresh;
        }
        // Probe ran but didn't beat the cached tier — record the attempt
        // so we don't probe again until the throttle window passes.
        hit.lastProbeAt = new Date(now).toISOString();
        hit.lastSeenAt = new Date(now).toISOString();
        cache[sessionId] = hit;
        writeCache(cache);
        return hit.id;
      }

      // No probe needed (cache is MAX_TIER, throttle window unexpired, or
      // upgrade disabled). Refresh lastSeenAt and return.
      hit.lastSeenAt = new Date(now).toISOString();
      cache[sessionId] = hit;
      writeCache(cache);
      return hit.id;
    }
  }

  // Compute fresh
  const fresh = computeFreshId(opts);
  if (!fresh) return null;

  // Persist with never-downgrade
  if (useCache && sessionId) {
    const cache = readCache();
    const existing = cache[sessionId];
    if (existing && tierOf(existing.id) >= tierOf(fresh)) {
      // Never overwrite a higher-or-equal-tier cached entry with a lower one.
      // This is the never-downgrade rule: tw-ps stays even if a later
      // resolve returns tw-pp due to transient process-walk failure.
      existing.lastSeenAt = new Date().toISOString();
      cache[sessionId] = existing;
      writeCache(cache);
      return existing.id;
    }
    cache[sessionId] = {
      id: fresh,
      tier: tierOf(fresh),
      recordedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    writeCache(cache);
  }

  return fresh;
}

function computeFreshId(opts = {}) {
  // 1. Windows Terminal session UUID (most reliable; per-pane lifetime).
  const wt = process.env.WT_SESSION;
  if (typeof wt === "string" && /^[0-9a-f-]{8,}$/i.test(wt)) {
    return `tw-wt-${wt.toLowerCase()}`;
  }

  const ppid = Number.isFinite(opts.ppid) ? opts.ppid : process.ppid;

  // 2. PowerShell/cmd ancestor — survives child-process churn within the window.
  const shellPid = findAncestorShellPid(ppid);
  if (Number.isFinite(shellPid) && shellPid > 0) {
    return `tw-ps-${shellPid}`;
  }

  // 3. First non-shell-child ancestor — skip bash.exe/conhost.exe/etc to
  //    reach the stable claude.exe harness. Per-chat-stable (not as good as
  //    per-window but better than per-bash-call ppid).
  const stablePid = findStableAncestorPid(ppid);
  if (Number.isFinite(stablePid) && stablePid > 0) {
    return `tw-pa-${stablePid}`;
  }

  // 4. Bare parent pid — last resort. Per-bash-call so unstable.
  if (Number.isFinite(ppid) && ppid > 0) {
    return `tw-pp-${ppid}`;
  }

  return null;
}

// CLI: `node terminal-window-id.mjs [sessionId]` prints the resolved id (or "null").
const __cliArgv1 = (process.argv[1] || "").replace(/\\/g, "/");
const __cliArgv1Basename = __cliArgv1.split("/").pop() || "";
if (__cliArgv1Basename && import.meta.url.endsWith(__cliArgv1Basename)) {
  const cliSessionId = process.argv[2] || null;
  process.stdout.write((resolveTerminalWindowId({ sessionId: cliSessionId }) || "null") + "\n");
}
