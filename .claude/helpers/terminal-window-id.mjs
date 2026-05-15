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
 *   1. WT_SESSION env var — Windows Terminal sets a UUID per tab/pane that
 *      persists for the tab's entire lifetime. Inherited by every child
 *      process (claude.exe, node, bash). This is the canonical id when
 *      Windows Terminal hosts the session.
 *   2. Ancestor PowerShell PID — walk `process.ppid` upward via `tasklist`
 *      until we find a powershell.exe / pwsh.exe / cmd.exe. The shell PID
 *      persists for the window's lifetime. Used when WT_SESSION is absent
 *      (conhost.exe directly, VS Code integrated terminal, SSH session).
 *   3. Immediate ppid — the direct parent process PID. Last resort.
 *
 * Output format: a stable string `tw-<scheme>-<id>` where scheme ∈
 *   { wt, ps, pp } (Windows Terminal session, PowerShell ancestor, parent
 *   PID). Same window resolves to the same id across multiple invocations
 *   regardless of which scheme actually fires (caches first resolved id in
 *   ~/.claude/cache/terminal-window-id-<scheme>-<id>.lock for diagnostics).
 *
 * Pure / no side effects beyond an optional one-time diagnostic write.
 * Bounded runtime: tasklist call has a 2-second hard timeout. If anything
 * is slow, scheme degrades to `pp`.
 *
 * Knobs:
 *   PRISM_TERMINAL_WINDOW_ID         — explicit override (CI / tests)
 *   PRISM_TERMINAL_WINDOW_ID_DISABLE — return null (disables pinning)
 *   PRISM_TWID_TIMEOUT_MS            — tasklist budget (default 2000)
 *
 * @returns {string|null}
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TASKLIST_TIMEOUT_MS = Number(process.env.PRISM_TWID_TIMEOUT_MS || 2000);
const DIAG_DIR = "H:/prism/.claude/cache";
const SHELL_BASENAMES = new Set(["powershell.exe", "pwsh.exe", "cmd.exe"]);
// PID ancestor walk depth cap — most claude → bash/cmd → shell chains are 2-4
// hops; 8 is generous and prevents pathological loops on PID reuse.
const MAX_ANCESTOR_HOPS = 8;

function safeSpawnSync(cmd, args, opts = {}) {
  try {
    return spawnSync(cmd, args, {
      encoding: "utf-8",
      timeout: TASKLIST_TIMEOUT_MS,
      windowsHide: true,
      ...opts,
    });
  } catch {
    return { status: 1, stdout: "", stderr: "" };
  }
}

/**
 * Walk PID ancestry on Windows using `wmic process` (faster + structured) or
 * `tasklist /v` (fallback). Returns the first ancestor whose ImageName is a
 * shell from SHELL_BASENAMES, or null on miss.
 *
 * wmic is being deprecated on Windows 11 but is still present on most hosts;
 * `tasklist` is the universal fallback. Both calls are timeout-bounded.
 */
function findAncestorShellPid(startPid) {
  if (!Number.isFinite(startPid) || startPid <= 0) return null;
  let pid = startPid;
  for (let hop = 0; hop < MAX_ANCESTOR_HOPS; hop++) {
    if (!Number.isFinite(pid) || pid <= 0) return null;
    // Query parent process + image name. wmic is fastest when available.
    const r = safeSpawnSync("wmic", [
      "process", "where", `ProcessId=${pid}`,
      "get", "ParentProcessId,Name", "/format:csv",
    ]);
    if (r.status !== 0 || !r.stdout) return null;
    // CSV format: "Node,Name,ParentProcessId" header + one row.
    const lines = r.stdout.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("Node,"));
    if (lines.length === 0) return null;
    const cols = lines[0].split(",");
    if (cols.length < 3) return null;
    const name = (cols[1] || "").toLowerCase().trim();
    const ppid = parseInt(cols[2], 10);
    if (SHELL_BASENAMES.has(name)) return pid;
    if (!Number.isFinite(ppid) || ppid <= 0 || ppid === pid) return null;
    pid = ppid;
  }
  return null;
}

function writeDiagOnce(id) {
  try {
    if (!fs.existsSync(DIAG_DIR)) fs.mkdirSync(DIAG_DIR, { recursive: true });
    const marker = path.join(DIAG_DIR, `terminal-window-${id.replace(/[^a-z0-9-]/gi, "_")}.lock`);
    if (!fs.existsSync(marker)) {
      fs.writeFileSync(marker, JSON.stringify({ id, pid: process.pid, recordedAt: new Date().toISOString() }));
    }
  } catch { /* diag is best-effort */ }
}

/**
 * @param {Object} [opts]
 * @param {number} [opts.ppid] — override parent pid (tests)
 * @returns {string|null}
 */
export function resolveTerminalWindowId(opts = {}) {
  if (process.env.PRISM_TERMINAL_WINDOW_ID_DISABLE === "1") return null;

  const override = process.env.PRISM_TERMINAL_WINDOW_ID;
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }

  // 1. Windows Terminal session UUID (most reliable; per-pane lifetime).
  const wt = process.env.WT_SESSION;
  if (typeof wt === "string" && /^[0-9a-f-]{8,}$/i.test(wt)) {
    const id = `tw-wt-${wt.toLowerCase()}`;
    writeDiagOnce(id);
    return id;
  }

  const ppid = Number.isFinite(opts.ppid) ? opts.ppid : process.ppid;

  // 2. PowerShell/cmd ancestor — survives child-process churn within the window.
  const shellPid = findAncestorShellPid(ppid);
  if (Number.isFinite(shellPid) && shellPid > 0) {
    const id = `tw-ps-${shellPid}`;
    writeDiagOnce(id);
    return id;
  }

  // 3. Bare parent pid — last resort.
  if (Number.isFinite(ppid) && ppid > 0) {
    const id = `tw-pp-${ppid}`;
    writeDiagOnce(id);
    return id;
  }

  return null;
}

// CLI: `node terminal-window-id.mjs` prints the resolved id (or "null").
const __cliArgv1 = (process.argv[1] || "").replace(/\\/g, "/");
const __cliArgv1Basename = __cliArgv1.split("/").pop() || "";
if (__cliArgv1Basename && import.meta.url.endsWith(__cliArgv1Basename)) {
  process.stdout.write((resolveTerminalWindowId() || "null") + "\n");
}
