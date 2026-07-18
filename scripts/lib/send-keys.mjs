/**
 * send-keys.mjs — thin Node wrapper around .claude/helpers/send-keys-to-window.ps1
 * for the CHAT-ORCHESTRATOR-MS0 fleet orchestrator (U-CHO04 Node-facing seam).
 *
 * The PowerShell script does the actual P/Invoke + SendInput work; this
 * module just spawns it with consistent args, parses the JSON output,
 * surfaces errors uniformly, and provides a test-friendly seam via
 * `_spawn` injection.
 *
 * Pure-core + injected-spawner — fully testable without actually spawning
 * PowerShell.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
export const SEND_KEYS_SCRIPT_PATH = join(REPO_ROOT, ".claude", "helpers", "send-keys-to-window.ps1");
export const DEFAULT_SCRIPT_TIMEOUT_MS = 30000;
export const SPAWN_OVERHEAD_MS = 5000;  // wall-clock cushion above script's own timeout

/**
 * Parse the PowerShell script's JSON stdout into a structured result.
 * The PS script always emits exactly one JSON object on stdout, even on
 * error — never throws. We return a uniform shape so the orchestrator
 * doesn't have to special-case parse failures.
 *
 * Pure function — exported for testability.
 */
export function parseSendKeysOutput(stdout, fallbackError = null) {
  const raw = String(stdout || "").trim();
  if (!raw) {
    return { ok: false, error: fallbackError || "no-stdout-from-script", chars: 0, dryRun: false };
  }
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj;
    return { ok: false, error: "json-parse-non-object", chars: 0, dryRun: false };
  } catch (e) {
    return { ok: false, error: `json-parse-failed:${e?.message || e}`, chars: 0, dryRun: false, rawSnippet: raw.slice(0, 200) };
  }
}

/**
 * Send keystrokes to a target window. Default is DRY-RUN — pass
 * `confirm: true` to actually type. Returns the parsed PS script result.
 *
 * @param {object} opts
 * @param {number|string} opts.hwnd       — target window handle (integer)
 * @param {string} opts.text              — text to type (ENTER appended by PS)
 * @param {boolean} [opts.confirm=false]  — false=dry-run, true=actually send
 * @param {number} [opts.delayMs=15]      — per-character delay
 * @param {number} [opts.timeoutMs=30000] — PS script's internal timeout
 * @param {Function} [opts._spawn]        — injected spawnSync for tests
 * @returns {{ ok: boolean, hwnd?, className?, windowTitle?, chars, dryRun, durationMs?, error?, classWarning?, exitCode? }}
 */
export function sendKeysToWindow({ hwnd, text, confirm = false, delayMs = 15, timeoutMs = DEFAULT_SCRIPT_TIMEOUT_MS, _spawn = spawnSync } = {}) {
  if (hwnd === undefined || hwnd === null) {
    return { ok: false, error: "missing-hwnd", chars: 0, dryRun: false };
  }
  if (typeof text !== "string" || text.length === 0) {
    return { ok: false, error: "missing-text", chars: 0, dryRun: false };
  }
  const hwndInt = Number(hwnd);
  if (!Number.isFinite(hwndInt) || !Number.isInteger(hwndInt) || hwndInt <= 0) {
    return { ok: false, error: `invalid-hwnd:${String(hwnd)}`, chars: 0, dryRun: false };
  }
  // On non-Windows, the PS script is unrunnable; surface a clean error
  // rather than spawning a nonexistent powershell binary.
  if (process.platform !== "win32") {
    return { ok: false, error: "non-windows-platform", chars: 0, dryRun: false };
  }
  // NOTE: do NOT pass `-Confirm:$true`/`-Confirm:$false` here. PowerShell's
  // `-File` mode binds every argv token as a STRING, and the param-binder
  // refuses to coerce a literal "$true"/"true"/"1" string into the script's
  // [bool]$Confirm param -- it exits with a binding error BEFORE the script
  // body runs (verified: -Confirm:$true, -Confirm:0, -Confirm:false all fail
  // identically). The PS script (send-keys-to-window.ps1, U-ZM2-01) reads the
  // PRISM_SENDKEYS_CONFIRM env var natively instead -- no string coercion --
  // which is the same execute-mode seam zulu-orchestrator-sweep already uses.
  const args = [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", SEND_KEYS_SCRIPT_PATH,
    "-Hwnd", String(hwndInt),
    "-Text", text,
    "-DelayBetweenCharsMs", String(delayMs),
    "-TimeoutMs", String(timeoutMs),
  ];
  // Explicitly set "0" on dry-run -- never inherit a parent's "1". A bare
  // {...process.env} would let a sweep context that exported
  // PRISM_SENDKEYS_CONFIRM=1 silently turn a dry-run into a real send.
  const childEnv = { ...process.env, PRISM_SENDKEYS_CONFIRM: confirm ? "1" : "0" };
  let result;
  try {
    result = _spawn(
      "powershell.exe", args,
      { encoding: "utf8", timeout: timeoutMs + SPAWN_OVERHEAD_MS, windowsHide: true, env: childEnv },
    );
  } catch (e) {
    return { ok: false, error: `spawn-threw:${e?.message || e}`, chars: 0, dryRun: false };
  }
  if (!result) {
    return { ok: false, error: "spawn-returned-null", chars: 0, dryRun: false };
  }
  if (result.error) {
    return { ok: false, error: `spawn-error:${result.error.code || result.error.message}`, chars: 0, dryRun: false };
  }
  const parsed = parseSendKeysOutput(result.stdout, result.status !== 0 ? `script-exit-${result.status}` : null);
  if (typeof result.status === "number") parsed.exitCode = result.status;
  return parsed;
}
