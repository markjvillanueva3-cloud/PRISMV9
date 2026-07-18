# CHAT-ORCHESTRATOR-MS0/U-CHO04 — [MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO04: UI Automation SendKeys to target window — 23/23 tests + live PS smoke

**Commit:** `7b1a19655ca0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T17:32:08-05:00
**Tags:** chat-orchestrator-ms0, u-cho04, auto-distilled

## Subject
[MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO04: UI Automation SendKeys to target window — 23/23 tests + live PS smoke

## Body
```
[MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO04: UI Automation SendKeys to target window — 23/23 tests + live PS smoke

PowerShell P/Invoke SendInput typed-input to a target window by HWND, with a Node wrapper for the orchestrator main loop to invoke.

The PS script (.claude/helpers/send-keys-to-window.ps1):
  * Validates HWND is alive + reports window class (allowed: ConsoleWindowClass / CASCADIA_HOSTING_WINDOW_CLASS / PSHOST; unknown classes warn but proceed — operator gate via -Confirm is the real safety)
  * Foreground-attach workaround for Win10/11 SetForegroundWindow restrictions (AttachThreadInput → BringWindowToTop → SetForegroundWindow → detach)
  * SendInput one Unicode char at a time via KEYEVENTF_UNICODE (the only reliable way to type into a foreground console from another process — SendKeys-via-WinForms fails under elevated/RDP/non-interactive)
  * Appends ENTER via VK_RETURN
  * Restores previous foreground on success or failure (best-effort)
  * DRY-RUN default — operator MUST pass -Confirm:$true to actually send keys (per-slot opt-in gate enforced by orchestrator main loop)
  * Kill switch: $env:PRISM_SENDKEYS_DISABLE=1 → exit 4 silent no-op
  * JSON-on-stdout uniform output, exit codes 0=ok 1=invalid 2=mid-stream 3=timeout 4=disabled

The Node wrapper (scripts/lib/send-keys.mjs):
  * sendKeysToWindow({hwnd,text,confirm,delayMs,timeoutMs,_spawn?}) — input-validates hwnd/text/platform, spawns the PS script, parses JSON output, returns uniform {ok,error,chars,dryRun,exitCode,...}
  * parseSendKeysOutput(stdout, fallbackError?) — pure, handles empty/malformed/non-object JSON gracefully
  * SEND_KEYS_SCRIPT_PATH / DEFAULT_SCRIPT_TIMEOUT_MS / SPAWN_OVERHEAD_MS exports for testability
  * Non-Windows platform → clean error rather than spawning nonexistent powershell.exe

Tests (hermetic, no real PS spawn):
  6 parseSendKeysOutput edge cases (valid / empty / fallback / malformed / non-object / whitespace)
  7 sendKeysToWindow input validation (missing hwnd/text/empty/non-int/negative/float)
  10 sendKeysToWindow spawn paths (happy / confirm-true / error / threw / null / non-zero-exit / parseable-non-zero / args propagation / script-path / constants)
  PLUS live PS smoke: invalid-HWND returns {error:invalid-hwnd-not-a-window,exit:1}; kill-switch returns {error:disabled,exit:4}; em-dash UTF-8 issue caught + fixed (PS5.1 file-load codepage trips on em-dashes in string literals — replaced with ASCII hyphen).

Doctrine: orchestrator is a SEIZER only when explicitly authorised. -Confirm:$true is the contract — set per-slot via orchestrator config, never globally. The combination of (a) per-call -Confirm, (b) env kill-switch, (c) Node-side input validation, and (d) dry-run-by-default keeps this from being a fleet-wide footgun.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/helpers/send-keys-to-window.ps1 | 333 ++++++++++++++++++++++++++++++++
- scripts/lib/send-keys.mjs               | 102 ++++++++++
- scripts/lib/send-keys.test.mjs          | 200 +++++++++++++++++++
- 3 files changed, 635 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b1a19655ca0`
- Milestone envelope: `mcp-server/data/milestones/CHAT-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._