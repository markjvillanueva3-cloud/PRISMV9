# ZULU-ORCHESTRATOR-MS0/U-ZULU01 — [MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU01 (slot:bravo): HWND resolver + design spec — 30/30 tests

**Commit:** `f11b586f9912` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T11:21:23-05:00
**Tags:** zulu-orchestrator-ms0, u-zulu01, auto-distilled

## Subject
[MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU01 (slot:bravo): HWND resolver + design spec — 30/30 tests

## Body
```
[MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU01 (slot:bravo): HWND resolver + design spec — 30/30 tests

Closes the missing piece between chat-slots.json (stores stable PID via
terminal-window-id.mjs) and CHO04 send-keys-to-window.ps1 (consumes HWND).
PowerShell Get-Process -Id PID | %{ $_.MainWindowHandle } returns the Win32
window handle as a decimal integer. 0 means process exists with no GUI
window; empty means process not found.

Exports (all pure / pure-core+injected-spawn):
  * validatePid(pid) — coerces numeric strings, rejects null/NaN/Infinity/
    float/zero/negative; explicit error taxonomy
  * parsePsOutput(stdout, stderr, exitCode) — classifies ps-failed,
    process-not-found, process-has-no-window, hwnd-negative, ps-output-
    not-numeric, ok+hwnd
  * resolveHwndFromPid(pid, {_spawn,_platform,timeoutMs}) — top-level
    composition; non-Windows + invalid pid both fail BEFORE spawn (no
    wasted process); spawn-threw / spawn-signal / spawn-returned-null
    classified explicitly
  * tryResolveHwnd(pid, opts) — fail-soft convenience; returns null on
    any error (no throw). For U-ZULU02 main loop on slots that may
    not have a window.

R12: 0 = process-has-no-window (NOT a valid HWND; SendKeys would fail);
empty stdout = process-not-found (NOT same as platform error). Every
unknown state has a SAFE return with named reason; never throws, never
guesses.

Tests (30, all hermetic — no real PS spawn):
  * 10 validatePid (null/undefined/NaN/Infinity/float/zero/negative/
    garbage-string/numeric-string-coerced/valid)
  * 10 parsePsOutput (non-zero+stderr / non-zero+empty / empty stdout /
    whitespace-only / 0-value / negative / non-numeric / valid /
    large-value / multi-line-first-wins)
  * 8 resolveHwndFromPid (non-Windows / null-pid-pre-spawn / valid /
    process-not-found / non-zero-exit / spawn-signal / spawn-threw /
    spawn-returned-null)
  * 2 tryResolveHwnd (ok-returns-hwnd / errors-return-null-no-throw)

Spec: state/shared/specs/ZULU-ORCHESTRATOR-DESIGN.md — 7-unit milestone
plan (U-ZULU01..07), safety invariants (per-slot opt-in default false,
cascade kill switches PRISM_ZULU_DISABLE + PRISM_SENDKEYS_DISABLE, 24h
dry-run for new opt-ins, 5s stagger interval), iteration order
01→06→02→03→05→04→07.

Backbone already shipped under CHAT-ORCHESTRATOR-MS0 (2026-05-17):
  * U-CHO01 85703afab633 — chat-orchestrator-decisions.mjs (25 tests)
  * U-CHO02 5ece125d8b34 — chat-token-watch.mjs (26 tests)
  * U-CHO04 7b1a19655ca0 — send-keys.mjs + send-keys-to-window.ps1 (23 tests + live PS smoke)

ZULU-MS0 wires them. Original CHO doctrine said "golf is orchestrator";
this milestone corrects to "zulu is orchestrator; golf stays hygiene-only"
because overloading orchestrator on golf compromises both roles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (8)
- ...rence_infra_agi_router_ms2_p0_u01_2026_05_20.md | 122 ++++++++++++
- knowledge/wiki/architecture/domain-agi-contract.md | 188 +++++++++++++++++++
- .../data/milestones/INFRA-AGI-ROUTER-MS2.json      |  98 ++++++++++
- scripts/lib/resolve-hwnd.mjs                       |  89 +++++++++
- scripts/lib/resolve-hwnd.test.mjs                  | 145 +++++++++++++++
- state/shared/RECENT-SHIPMENTS-2026-05-20.md        |  54 ++++++
- state/shared/specs/ZULU-ORCHESTRATOR-DESIGN.md    | 204 +++++++++++++++++++++
- 7 files changed, 900 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f11b586f9912`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._