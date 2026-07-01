---
name: reference_interactive_scheduled_task_window_popups_2026_06_24
description: "node.exe/git console windows popping over apps = PRISM scheduled tasks registered LogonType=Interactive; fix = switch to S4U (session 0, no window, no password/UAC). Sibling of the harness-conhost storm. (slot:golf, 2026-06-24)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.624Z
aliases: reference_interactive_scheduled_task_window_popups_2026_06_24
---


Operator-reported (2026-06-24, slot:golf): "node and git exe windows that randomly pop up over current windows, it keeps interrupting everything" -- specifically a persistent one logging `[drain] batch=N of 4224 remaining`.

**Root cause (distinct from [[reference_conhost_orphan_window_storm_2026_06_22]]):** several PRISM scheduled tasks were registered with `Principal.LogonType = Interactive`. A task that runs a CONSOLE app (`node.exe`, `git`, `python`, `powershell`) in the user's interactive session gets a **visible console window every run**. With tight repetition intervals (10-30 min) across ~7 tasks, that is a window popping over the user's work every few minutes. The persistent `[drain]` one was `PRISM Tribal Resources Drain` (`node drain-resources-tribal.mjs --max-pdfs 3 --no-embed`, every 20 min, ~15-min runs) -- a LIVE-parent window, so the conhost-orphan-janitor (which only closes DEAD-parent conhosts) deliberately never touched it.

**Fix = S4U principal** (`New-ScheduledTaskPrincipal -UserId $u -LogonType S4U -RunLevel Limited` + `Set-ScheduledTask -Principal`). S4U = "run whether logged on or not" WITHOUT a stored password and WITHOUT UAC (for your own task) -> runs in **session 0** -> no window ever. Action/schedule unchanged. Verified: after conversion the drain spawned `node` in `SessionId=0` and ran real work. Most PRISM tasks were ALREADY S4U; these were stragglers created ad-hoc.

**Why not the other tricks (verified on DESKTOP-N7MI1VB, Win11):** VBScript is `NotPresent` (`Get-WindowsCapability VBSCRIPT~~~~` = NotPresent) so a `wscript run-hidden.vbs` shim FAILS even though wscript.exe exists; `conhost.exe --headless <cmd>` did NOT propagate the child exit code (returned 0 for an `exit 7`), so it is unreliable. `powershell -WindowStyle Hidden` (the conhost-janitor pattern) can still flash per run -- fine for an AtLogon task, NOT for an every-10-min one. S4U is the clean flicker-free mechanism.

**Converted Interactive -> S4U (6):** PRISM Tribal Embed (30m), Ollama Wedge Guard (10m), SFC Closed Loop (15m), SFC Per-Machine Sweep (10m), Hermes Vault Digest (4h), Launch Readiness. Plus the drain. **Left Interactive on purpose:** `PRISM Conhost Janitor` (must see the user session to close orphan windows there).

**Reusable enforcer:** `H:\Tools\enforce-hidden-tasks.ps1` (idempotent; re-run if a task reverts to Interactive after a peer re-registers it). **Durable follow-up (flagged to owners):** bake `-LogonType S4U` into each task's installer (oscar=SFC, india/zulu=tribal+hermes) so a re-register does not revert to Interactive. Caveat: S4U runs in session 0 -- fine for local-drive headless node compute (incl. GPU/Ollama, which already runs S4U), would break only tasks needing a mapped network drive or the interactive desktop.

**Still not eliminable from PRISM code:** the ~284 harness per-turn hook spawns flash conhosts (see [[reference_conhost_orphan_window_storm_2026_06_22]]); the janitor closes those dead-parent windows within ~2-3s. The scheduled-task fix here removes the PERSISTENT/recurring poppers; the brief harness flashes remain janitor-mitigated only.
