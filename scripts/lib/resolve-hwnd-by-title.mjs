// ZEBRA-ORCHESTRATOR-MS0 / G1b — title-based HWND resolver for chat-slot windows.
//
// resolve-hwnd.mjs (PID -> MainWindowHandle) is the WRONG primitive for the
// PRISM fleet: chat-slots.json stores an ephemeral `pid` that does not own a
// stable top-level window — `Get-Process -Id <pid>` routinely returns
// process-not-found once a chat has run for a while (the recorded pid is a
// transient child that has since exited).
//
// PRISM instead stamps a per-chat WINDOW TITLE: rename-window-intercept.mjs
// calls set-window-title.mjs on every prompt with the slot's `topic`, which
// lands as the console/window caption of the claude.exe host. So the robust
// primitive is: enumerate every top-level window, read its caption, match
// caption -> slot topic.
//
// SAFETY (load-bearing): this resolver gates SendKeys actuation. A wrong HWND
// means `/compact` is typed into the WRONG chat -> silent loss of that chat's
// uncommitted context. Therefore the resolver NEVER best-guesses:
//   - exact (sanitized, case-insensitive) caption match is the primary tier;
//   - a `contains` tier handles terminal/shell caption decoration, but BOTH
//     tiers require the match to be UNIQUE — >1 candidate => ambiguous error;
//   - 0 candidates => no-match error.
// On any ambiguous/no-match/enumeration error the caller MUST NOT actuate.
// Failing loud (R12) beat-for-beat: the orchestrator skips, it never guesses.
//
// CAVEAT (R12, honest): if the PRISM fleet ever runs as Windows Terminal
// *tabs* of a single WT window (rather than one window per chat), EnumWindows
// sees only ONE top-level WT HWND whose caption mirrors the *focused* tab.
// Title resolution is then only correct for the focused tab. This resolver is
// built for the separate-window fleet model (CLAUDE.md SESSION CONTINUITY
// STACK: "up to 26 PowerShell windows"). enumerateWindows() returns every
// captioned window so a caller can detect the degenerate single-WT case.
//
// Pure-core + injected `_spawn` so tests are hermetic. No file I/O — the
// caller (zebra-orchestrator-sweep.mjs) owns any caching.

import { spawnSync as nodeSpawnSync } from "node:child_process";
import { sanitizeTitle, MAX_TITLE_LEN } from "../../.claude/helpers/set-window-title.mjs";

const PS_TIMEOUT_MS_DEFAULT = 8000; // Add-Type compiles C# on first call (~1-2s)
const PS_MAX_BUFFER = 4 * 1024 * 1024;

// PowerShell that enumerates every captioned top-level window via Win32
// EnumWindows and emits one TSV row per window: hwnd \t pid \t visible \t title.
// The C# strips tab/CR/LF from each caption so every row is exactly one line
// with exactly three tabs — the JS parser never has to disambiguate.
const ENUM_PS =
  "$ErrorActionPreference='Stop'\n" +
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n" +
  "$code=@'\n" +
  "using System;\n" +
  "using System.Text;\n" +
  "using System.Collections.Generic;\n" +
  "using System.Runtime.InteropServices;\n" +
  "public static class PrismWinEnum {\n" +
  "  delegate bool EnumProc(IntPtr h, IntPtr l);\n" +
  "  [DllImport(\"user32.dll\")] static extern bool EnumWindows(EnumProc cb, IntPtr l);\n" +
  "  [DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);\n" +
  "  [DllImport(\"user32.dll\")] static extern int GetWindowTextLength(IntPtr h);\n" +
  "  [DllImport(\"user32.dll\")] static extern bool IsWindowVisible(IntPtr h);\n" +
  "  [DllImport(\"user32.dll\")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);\n" +
  "  public static List<string> List() {\n" +
  "    var rows = new List<string>();\n" +
  "    EnumWindows((h, l) => {\n" +
  "      int len = GetWindowTextLength(h);\n" +
  "      if (len > 0) {\n" +
  "        var sb = new StringBuilder(len + 2);\n" +
  "        GetWindowText(h, sb, sb.Capacity);\n" +
  "        uint pid; GetWindowThreadProcessId(h, out pid);\n" +
  "        bool vis = IsWindowVisible(h);\n" +
  "        string t = sb.ToString().Replace(\"\\t\",\" \").Replace(\"\\r\",\" \").Replace(\"\\n\",\" \");\n" +
  "        rows.Add(((long)h).ToString() + \"\\t\" + pid.ToString() + \"\\t\" + (vis?\"1\":\"0\") + \"\\t\" + t);\n" +
  "      }\n" +
  "      return true;\n" +
  "    }, IntPtr.Zero);\n" +
  "    return rows;\n" +
  "  }\n" +
  "}\n" +
  "'@\n" +
  "Add-Type -TypeDefinition $code | Out-Null\n" +
  "[PrismWinEnum]::List() | ForEach-Object { [Console]::Out.WriteLine($_) }";

// Pure: normalize a caption/topic to the canonical comparison form. We run the
// SAME sanitize set-window-title.mjs applies before stamping (strip control
// chars, collapse whitespace, cap at 80) so the comparison sees exactly what
// landed on the window — then lowercase for case-insensitive robustness.
function norm(s) {
  return sanitizeTitle(String(s ?? "")).toLowerCase();
}

// Pure: trim a window record down for inclusion in an error envelope.
function slim(w) {
  return { hwnd: w.hwnd, pid: w.pid, title: w.title };
}

// Pure: validate the expected-title input. Exported for tests.
export function validateTitle(title) {
  if (title === null || title === undefined) return { ok: false, error: "title-missing" };
  if (typeof title !== "string") return { ok: false, error: "title-not-string" };
  const t = title.trim();
  if (t === "") return { ok: false, error: "title-empty" };
  return { ok: true, title: t };
}

// Pure: parse the TSV emitted by ENUM_PS. Exported for tests.
// Each valid row is `hwnd \t pid \t visible \t title`. Malformed rows are
// skipped (never throw). Empty stdout with exit 0 => zero windows (valid).
export function parseWindowList(stdout, stderr, exitCode) {
  if (exitCode !== 0) {
    const reason = (stderr || "").trim().slice(0, 200) || `ps-exit-${exitCode}`;
    return { ok: false, error: "ps-failed", reason };
  }
  const text = (stdout || "").trim();
  if (text === "") return { ok: true, windows: [] };
  const windows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\r$/, "");
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue; // malformed -> skip, never throw
    const hwnd = Number(parts[0]);
    if (!Number.isFinite(hwnd) || hwnd <= 0) continue;
    const pidNum = Number(parts[1]);
    windows.push({
      hwnd,
      pid: Number.isFinite(pidNum) && pidNum > 0 ? pidNum : null,
      visible: parts[2] === "1",
      title: parts.slice(3).join("\t"),
    });
  }
  return { ok: true, windows };
}

// Pure: match a window list against an expected title. Exported for tests.
// Tiers (both require a UNIQUE candidate, else `ambiguous-*`):
//   1. exact   — sanitized caption === sanitized expected title
//   2. contains— sanitized caption includes sanitized expected title
//      (handles "<topic> - PowerShell" style terminal caption decoration)
// opts.visibleOnly  (default true)  — only consider visible windows
// opts.allowContains(default true)  — enable the contains fallback tier
export function matchWindowsByTitle(windows, expectedTitle, opts = {}) {
  if (!Array.isArray(windows)) return { ok: false, error: "windows-not-array" };
  const v = validateTitle(expectedTitle);
  if (!v.ok) return { ok: false, error: v.error };
  const want = norm(v.title);
  if (want === "") return { ok: false, error: "title-empty-after-sanitize" };

  // G1b safety: if the expected title was truncated to the MAX_TITLE_LEN cap,
  // suppress the `contains` fallback. The exact tier stays correct — both the
  // window caption and `want` truncate identically through sanitizeTitle — and
  // at cap length `contains` collapses into `exact` anyway (an <=cap-length
  // caption can only *contain* a cap-length `want` by equalling it). Dropping
  // contains here is therefore behavior-neutral but makes the safety argument
  // local: a reader never has to prove the symmetric-cap property.
  const mayBeTruncated = want.length >= MAX_TITLE_LEN;
  const visibleOnly = opts.visibleOnly !== false;
  const allowContains = opts.allowContains !== false && !mayBeTruncated;
  const pool = windows.filter(
    (w) => w && Number.isFinite(w.hwnd) && w.hwnd > 0 && (!visibleOnly || w.visible === true),
  );

  const exact = pool.filter((w) => norm(w.title) === want);
  if (exact.length === 1) {
    return { ok: true, hwnd: exact[0].hwnd, match: "exact", window: slim(exact[0]) };
  }
  if (exact.length > 1) {
    return { ok: false, error: "ambiguous-exact", count: exact.length, matches: exact.map(slim) };
  }

  if (allowContains) {
    const contains = pool.filter((w) => norm(w.title).includes(want));
    if (contains.length === 1) {
      return { ok: true, hwnd: contains[0].hwnd, match: "contains", window: slim(contains[0]) };
    }
    if (contains.length > 1) {
      return { ok: false, error: "ambiguous-contains", count: contains.length, matches: contains.map(slim) };
    }
  }
  return { ok: false, error: "no-match", searched: pool.length };
}

// Enumerate every captioned top-level window. Pure-core + injected spawn.
export function enumerateWindows(opts = {}) {
  const _spawn = opts._spawn || nodeSpawnSync;
  const _platform = opts._platform || process.platform;
  const timeoutMs = opts.timeoutMs || PS_TIMEOUT_MS_DEFAULT;

  if (_platform !== "win32") return { ok: false, error: "platform-not-windows", platform: _platform };

  let res;
  try {
    res = _spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ENUM_PS],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: PS_MAX_BUFFER },
    );
  } catch (e) {
    return { ok: false, error: "spawn-threw", reason: String(e?.message || e).slice(0, 200) };
  }
  if (!res) return { ok: false, error: "spawn-returned-null" };
  if (res.signal) return { ok: false, error: "spawn-signal", signal: res.signal };
  // spawnSync surfaces maxBuffer overflow / launch failure here (no signal).
  if (res.error) {
    return { ok: false, error: "spawn-error", reason: String(res.error?.message || res.error).slice(0, 200) };
  }
  return parseWindowList(res.stdout, res.stderr, res.status);
}

// Top-level resolver: title -> HWND. Pure-core + injected spawn for tests.
// Returns the matchWindowsByTitle envelope, or an enumeration-failure envelope.
export function resolveHwndByTitle(expectedTitle, opts = {}) {
  const v = validateTitle(expectedTitle);
  if (!v.ok) return { ok: false, error: v.error };
  const en = enumerateWindows(opts);
  if (!en.ok) return { ok: false, error: en.error, reason: en.reason };
  return matchWindowsByTitle(en.windows, v.title, opts);
}

// Convenience: resolve + return just the HWND (or null). Fail-soft for callers
// that prefer a nullable over an envelope.
export function tryResolveHwndByTitle(expectedTitle, opts) {
  const r = resolveHwndByTitle(expectedTitle, opts);
  return r.ok ? r.hwnd : null;
}
