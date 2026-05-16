#!/usr/bin/env node
/**
 * set-window-title.mjs — set THIS chat's Windows Terminal tab title instantly.
 *
 * Why this exists: nothing run inside a Claude tool/hook can write to the
 * user's terminal via stdout — Claude Code captures stdout as a pipe, so an
 * OSC title escape never reaches the tab. The ONLY mechanism that works from
 * an external process on Windows is Win32 AttachConsole(<claude host pid>)
 * followed by SetConsoleTitleW — that targets the ConPTY of the user's tab
 * directly, independent of our own stdio. (Verified: AttachConsole +
 * SetConsoleTitleW both return TRUE against the parent claude.exe.)
 *
 * Pure-ish + injectable for tests. Never throws. No-op on non-Windows.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import os from "node:os";

const IS_WIN = process.platform === "win32";
const MAX_TITLE_LEN = 80;
const PS_TIMEOUT_MS = 5000;
const MAX_ANCESTRY_HOPS = 12;
const ATTACH_PARENT_PROCESS = 4294967295; // (DWORD)-1 — Win32 ATTACH_PARENT_PROCESS

/**
 * Strip C0/C1/DEL control chars, collapse whitespace, cap length. Keeps
 * printable incl. / - _ . : and spaces. The control-char class is written
 * with \x escapes so it survives Read-tool rendering + Edit matching
 * (see memory: feedback_read_tool_strips_control_chars).
 */
export function sanitizeTitle(s) {
  if (typeof s !== "string") return "";
  const cleaned = s.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, MAX_TITLE_LEN);
}

function defaultRunPs(script, env = {}) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { encoding: "utf8", timeout: PS_TIMEOUT_MS, windowsHide: true, env: { ...process.env, ...env } }
  );
}

/**
 * Walk the Win32 process ancestry from startPid up to the first claude.exe.
 * Returns the integer pid, or null if not found / not Windows.
 * `runPs` is injectable for tests.
 */
export function resolveClaudeHostPid(startPid, { runPs = defaultRunPs } = {}) {
  if (!IS_WIN) return null;
  const sp = Number(startPid);
  if (!Number.isInteger(sp) || sp <= 0) return null;
  try {
    const script =
      "$p=[int]$env:PRISM_WT_START;for($i=0;$i -lt " + MAX_ANCESTRY_HOPS + ";$i++){" +
      "$pr=Get-CimInstance Win32_Process -Filter \"ProcessId=$p\" -ErrorAction SilentlyContinue;" +
      "if(-not $pr){break};" +
      "if($pr.Name -ieq 'claude.exe'){$pr.ProcessId;break};" +
      "$p=$pr.ParentProcessId}";
    const out = runPs(script, { PRISM_WT_START: String(sp) });
    const m = String(out || "").match(/\d+/);
    return m ? Number(m[0]) : null;
  } catch {
    return null;
  }
}

const ATTACH_PS =
  "$code=@'\n" +
  "using System;using System.Runtime.InteropServices;\n" +
  "public static class WT{\n" +
  " [DllImport(\"kernel32.dll\",SetLastError=true)]public static extern bool FreeConsole();\n" +
  " [DllImport(\"kernel32.dll\",SetLastError=true)]public static extern bool AttachConsole(uint p);\n" +
  " [DllImport(\"kernel32.dll\",SetLastError=true,CharSet=CharSet.Unicode)]public static extern bool SetConsoleTitleW(string t);\n" +
  "}\n" +
  "'@\n" +
  "Add-Type -TypeDefinition $code | Out-Null\n" +
  "$tpid=[uint32]$env:PRISM_WT_PID\n" +
  "$t=$env:PRISM_WT_TITLE\n" +
  "[WT]::FreeConsole() | Out-Null\n" +
  "$a=[WT]::AttachConsole($tpid)\n" +
  "$s=$false\n" +
  "if($a){ $s=[WT]::SetConsoleTitleW($t) }\n" +
  "[WT]::FreeConsole() | Out-Null\n" +
  "[WT]::AttachConsole([uint32]" + ATTACH_PARENT_PROCESS + ") | Out-Null\n" +
  "if($s){'OK'}else{'FAIL'}";

function readStamp(stampFile) {
  try {
    if (stampFile && existsSync(stampFile)) return readFileSync(stampFile, "utf8").trim();
  } catch { /* ignore */ }
  return null;
}
function writeStamp(stampFile, title) {
  if (!stampFile) return;
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    writeFileSync(stampFile, title, "utf8");
  } catch { /* ignore */ }
}

/**
 * Set the terminal tab title for the claude.exe host of `startPid`.
 * - Non-Windows → { ok:false, skipped:'non-win32' } (never throws).
 * - Stamp cache: if the last-set title equals this one, skip the PowerShell
 *   spawn entirely (steady-state cost = one file read). This is what makes
 *   "re-assert on every prompt" cheap enough to run fleet-wide.
 * Returns { ok, title, hostPid, cached, error? }.
 */
export function setWindowTitle(rawTitle, opts = {}) {
  const title = sanitizeTitle(rawTitle);
  const {
    startPid = process.ppid,
    stampFile = null,
    hostPid: hostPidOverride = null,
    runPs = defaultRunPs,
    force = false,
  } = opts;

  if (!title) return { ok: false, error: "empty_title" };
  if (!IS_WIN) return { ok: false, skipped: "non-win32", title };

  if (!force && stampFile && readStamp(stampFile) === title) {
    return { ok: true, title, cached: true };
  }

  const hostPid = hostPidOverride ?? resolveClaudeHostPid(startPid, { runPs });
  if (!hostPid) return { ok: false, error: "no_host_pid", title };

  try {
    const out = runPs(ATTACH_PS, {
      PRISM_WT_PID: String(hostPid),
      PRISM_WT_TITLE: title,
    });
    const ok = /OK/.test(String(out));
    if (ok) writeStamp(stampFile, title);
    return { ok, title, hostPid, cached: false, raw: String(out).trim() };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), title, hostPid };
  }
}

/** Default per-session stamp path under the OS temp dir. */
export function defaultStampFile(sessionId) {
  const id = String(sessionId || "unknown").replace(/[^\w.-]/g, "_").slice(0, 64);
  return `${os.tmpdir()}/prism-wt-title-${id}.stamp`;
}

// CLI: node set-window-title.mjs "<title>" [hostPid]
if (process.argv[1]?.endsWith("set-window-title.mjs")) {
  const t = process.argv[2];
  const hp = process.argv[3] ? Number(process.argv[3]) : null;
  const r = setWindowTitle(t, { hostPid: hp, stampFile: defaultStampFile(process.env.CLAUDE_SESSION_ID) });
  process.stdout.write(JSON.stringify(r) + "\n");
  process.exit(r.ok ? 0 : 1);
}
