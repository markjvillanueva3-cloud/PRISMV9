// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA01 — HWND resolver for chat-slot windows.
//
// CHO04 SendKeys needs an HWND (Win32 window handle); chat-slots.json stores
// only a stable PID via terminal-window-id.mjs. This module bridges them:
// PowerShell `Get-Process -Id <pid> | %{ $_.MainWindowHandle }` returns the
// MainWindowHandle as a decimal integer. 0 = no top-level window (process
// exists but has no GUI). Empty = process not found.
//
// Pure-core + injected `_spawn` so tests are hermetic. No file I/O — the
// caller (U-ZEBRA02 main loop) owns caching.

import { spawnSync as nodeSpawnSync } from "node:child_process";

const PS_TIMEOUT_MS_DEFAULT = 4000;

// Pure: validate input, classify outcome. Exported for tests.
export function validatePid(pid) {
  if (pid === null || pid === undefined) return { ok: false, error: "pid-missing" };
  const n = typeof pid === "string" ? Number(pid) : pid;
  if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false, error: "pid-not-numeric" };
  if (!Number.isInteger(n)) return { ok: false, error: "pid-not-integer" };
  if (n <= 0) return { ok: false, error: "pid-not-positive" };
  return { ok: true, pid: n };
}

// Pure: parse PowerShell output. Exported for tests.
// PS `Get-Process -Id $pid | Select -Expand MainWindowHandle` emits one
// decimal integer per process. 0 means "process exists, no GUI window".
// Empty stdout means "process not found" (PS swallows the error to stderr).
export function parsePsOutput(stdout, stderr, exitCode) {
  if (exitCode !== 0) {
    const reason = (stderr || "").trim().slice(0, 200) || `ps-exit-${exitCode}`;
    return { ok: false, error: "ps-failed", reason };
  }
  const trimmed = (stdout || "").trim();
  if (trimmed === "") return { ok: false, error: "process-not-found" };
  // Take the first non-empty line — multi-process PIDs would emit multiple,
  // but Get-Process -Id is single-process so we expect one number.
  const firstLine = trimmed.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0) || "";
  if (!/^-?\d+$/.test(firstLine)) return { ok: false, error: "ps-output-not-numeric", raw: firstLine };
  const hwnd = Number(firstLine);
  if (!Number.isFinite(hwnd)) return { ok: false, error: "hwnd-not-finite" };
  if (hwnd === 0) return { ok: false, error: "process-has-no-window" };
  if (hwnd < 0) return { ok: false, error: "hwnd-negative" };
  return { ok: true, hwnd };
}

// Top-level resolver. Pure-core + injected spawn for hermetic tests.
export function resolveHwndFromPid(pid, opts = {}) {
  const _spawn = opts._spawn || nodeSpawnSync;
  const _platform = opts._platform || process.platform;
  const timeoutMs = opts.timeoutMs || PS_TIMEOUT_MS_DEFAULT;

  const v = validatePid(pid);
  if (!v.ok) return { ok: false, error: v.error };

  if (_platform !== "win32") return { ok: false, error: "platform-not-windows", platform: _platform };

  let res;
  try {
    res = _spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        // SilentlyContinue swallows the "process not found" exception to stderr;
        // we then see empty stdout and exitCode 0 → classify as process-not-found.
        `try { (Get-Process -Id ${v.pid} -ErrorAction Stop).MainWindowHandle } catch { exit 2 }`,
      ],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true }
    );
  } catch (e) {
    return { ok: false, error: "spawn-threw", reason: String(e?.message || e).slice(0, 200) };
  }

  if (!res) return { ok: false, error: "spawn-returned-null" };
  if (res.signal) return { ok: false, error: "spawn-signal", signal: res.signal };

  return parsePsOutput(res.stdout, res.stderr, res.status);
}

// Convenience: resolve + return just the HWND (or null). For callers that
// want fail-soft (U-ZEBRA02 main loop on a slot that may not have a window).
export function tryResolveHwnd(pid, opts) {
  const r = resolveHwndFromPid(pid, opts);
  return r.ok ? r.hwnd : null;
}
