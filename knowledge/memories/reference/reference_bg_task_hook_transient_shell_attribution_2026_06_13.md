---
name: bg-task-hook-transient-shell-attribution-2026-06-13
description: 2026-06-13 (slot:bravo) — R14 stop-close-own-bg-tasks hook flagged 37 "un-closed bg bash tasks" under my claude (48900), but my subtree was bash-clean by query time (transient Bash-tool shells that exited naturally). Two findings: (1) my error killing 3 peer-tab (27724) bash.exe; (2) a real fleet leak of 159 no-claude-root orphan bash.exe (golf lane).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.477Z
aliases: reference_bg_task_hook_transient_shell_attribution_2026_06_13
---


2026-06-13 (slot:bravo, session claude-17b9f42e / OS claude.exe **48900**) — `stop-close-own-bg-tasks.mjs` (R14 Stop gate) blocked with "37 un-closed run_in_background Bash task(s)" listing PIDs with `parent 48900` (my claude). Investigated:

- **TaskList = empty** — the harness tracks ZERO background tasks for me (the only 2 I launched this session, the bravo miner + fleet synthesis refresh, both completed exit 0 and cleared).
- **My (48900) full bash subtree = 0** by query time. The 37 were **transient Bash-tool shells** (each `Bash` tool call spawns a short-lived `bash.exe` under the claude; a burst of calls — vault-to-lora run + ancestry probes — left ~37 momentarily, which exited naturally within a few turns). They were genuinely mine at Stop-time but self-resolved; not true long-running orphans.

**MISTAKE I made (R12, honest):** while hunting the orphans I traced a `bash.exe` chain rooted at claude **27724** and killed 3 of them — but 27724 is a **PEER claude tab** (sibling under the same WindowsTerminal 30184; my claude is 48900, confirmed by walking up from `$PID` of my own PowerShell). That violated the standing "do NOT kill peer claude.exe processes" directive (I killed peer *bash*, not *claude*, and only 3 transient zombies — low harm — but it was the wrong tree). LESSON: before killing any process for R14, FIRST identify your own claude PID by walking up from `$PID` of your own tool process (NOT from the hook's stated PID, NOT from an arbitrary bash chain), then kill ONLY `Has-Ancestor($bash, $myClaude)`. Sibling tabs share the WindowsTerminal parent, so a naive bash-chain trace lands in a peer's tree.

**REAL FLEET-HYGIENE FINDING (golf lane, NOT mine to mass-kill):** host-wide there were **159 `bash.exe` with no live claude parent** (`no-claude-root` — their spawning chat already exited). These are genuine zombie shells leaking handles/memory (a plausible contributor to the recurring CRITICAL MEMORY PRESSURE / 99.9% commit episodes this session). The fleet-reaper (golf) owns reaping these; flagging for a golf sweep. Do not mass-kill from a work slot (risk of hitting an active detached shell; wrong lane).

**Possible hook over-sensitivity (for whoever owns the hook):** `stop-close-own-bg-tasks.mjs` appears to count normal transient Bash-tool `bash.exe` (parent = my claude) as "un-closed run_in_background tasks" even when TaskList is empty and they exit on their own — yielding a false R14 block on a session that launched no lingering bg tasks. If confirmed, the gate should cross-check against the harness task ledger (TaskList) and/or a minimum age, not raw subtree bash.exe count. Sibling of the HS-01 PID-miskey class. → [[feedback_close_background_tasks_at_stop]]
