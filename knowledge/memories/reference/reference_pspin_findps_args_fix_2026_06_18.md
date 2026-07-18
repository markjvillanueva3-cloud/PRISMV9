---
name: reference_pspin_findps_args_fix_2026_06_18
description: ps-window-pin findPsAncestorPid never resolved a PID on any host (-Command does not bind $args) -> window-pin never written -> terminal-pin/auto-resume ran on the fleet-global family-latest wrong-slot fallback. Fixed 2026-06-18.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.136Z
aliases: reference_pspin_findps_args_fix_2026_06_18
---


**SESSION-CONTINUITY-FIX/U-PSPIN-ARGS (slot:alpha, 2026-06-18, commit 601b51fb53).**

**Symptom (operator-reported):** "last chat checked into papa; the auto-checkin keeps going to the same slot." A fresh post-/clear session was directed to `/startup-papa` (the prior occupant's slot) instead of the slot the terminal was switching to.

**Root cause (deterministic, all hosts):** `.claude/helpers/ps-window-pin.mjs` `findPsAncestorPid` built a PowerShell ancestry-walk script that read `$args[0]`/`$args[1]`, but invoked it as `powershell -Command "<script>" <startPid> <maxHops>`. With **`-Command` (unlike `-File`) trailing positional args are NOT bound to `$args`** — PowerShell appends them to the command text -> `ParserError: Unexpected token` -> non-zero exit -> the fn returned `null` for EVERY input. So `state/shared/ps-window-pins.json` was **never written on any host** since the helper shipped. The window->slot binding therefore never existed, and BOTH consumers fell back:
- `session-start-auto-resume.mjs` `getHandoffPreferSlot` -> no slot resolves -> `getHandoff(stableId)` = `per-agent-handoff.mjs read --terminal <freshId>` -> a brand-new session id misses exact/fuzzy/same-instance -> lands on **`family-latest`** (per-agent-handoff.mjs:796-813) = "newest handoff across ALL chats" (every chat is family `claude`). The newest handoff fleet-wide (the just-/cleared papa chat) wins -> wrong-slot resume. This is the "can return a PEER's handoff" hazard the code's own comments warn about.
- `session-start-terminal-pin.mjs` priorSlot resolution likewise fell to handoff/cache heuristics.

**Why it survived:** the existing `_spawn` mocks in `ps-window-pin.test.mjs` returned a fixed PID **ignoring the args entirely** — so the test was green while the real spawn was 100% broken. Classic R9 failure (test didn't verify the contract that mattered).

**Fix:** validate `startPid`/`maxHops` are positive integers, then **interpolate them directly into the script string** (no `$args`), and drop the trailing positional args. Also switched the spawn bin to an absolute `PS_BIN` (`C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`, bare fallback) for `findPsAncestorPid` + `isPidAlive` — the same robustness pattern as `stable-session-id.mjs` `WIN_PS`. +3 regression tests asserting the **spawn-args contract** (no trailing positionals after `-Command`, interpolated pid in the script body, fail-closed on non-integer). 29/29.

**Validated live:** shipped module `findPsAncestorPid({startPid:<claude pid>})` now resolves the WT-tab `powershell.exe` anchor (was `null`); write->read pin round-trips; this terminal correctly pinned `alpha->claude-14b038a1`.

**Free win (Unit 2):** `chat-slots.mjs:1610-1617` already calls `tryWritePinForCurrentWindow` after every successful claim — so `/checkin-<nato>` now repoints the window pin on a slot SWITCH automatically. It just never executed before because `findPsAncestorPid` always returned null.

**Open follow-up (Unit 3, deferred — low urgency now the pin works):** harden `getHandoffPreferSlot` to resolve THIS terminal's slot from `terminalWindowId` <-> `chat-slots.json` (the signal that IS functional on this host) BEFORE the `family-latest` fallthrough, as defense-in-depth for the case where `findPsAncestorPid` times out under load.

**Lessons:** (1) `powershell -Command "<script>" a b` does NOT bind a/b to `$args` — interpolate or use `-File`. (2) A `_spawn`/subprocess mock that ignores its args can hide a 100%-broken integration indefinitely (R9: assert the invocation contract, not just the return). (3) Absolute Windows binary paths beat bare names under portable-node (PATH may lack System32). See [[feedback_verify_actual_contract_not_proxy]].
