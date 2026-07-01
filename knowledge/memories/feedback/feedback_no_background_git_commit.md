---
name: feedback_no_background_git_commit
description: "NEVER run `git commit` via run_in_background — a hung pre-commit hook orphans the git process holding the shared index.lock invisibly; commit in the foreground so a hang surfaces immediately"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
aliases: feedback_no_background_git_commit
---


**Rule:** On the shared `H:/prism` main tree, run `git commit` in the **FOREGROUND**, never via
`run_in_background`. (Discovered 2026-05-30, slot alpha, U-GALAXY-SYNTH-CLAIM commit.)

**Why:** A background `git commit` that wedges on a pre-commit hook (the PRISM hook chain —
comprehensive-build-enforce, test/lint hooks, fsmonitor IPC, etc.) leaves an **orphaned git process
holding `H:/prism/.git/index.lock` open**. The harness marks the background task "failed" (exit 255)
but the child git keeps running, hung, holding the lock. Every subsequent fleet commit then fails
with `fatal: Unable to create '.git/index.lock': File exists` or `rm: Device or resource busy` — and
because the lock is genuinely held-open (not just a stale file), `rm` cannot clear it. It masquerades
as peer contention, so you wait on a lock that will never release. Observed: an 8-min-hung orphan
(PID identified by its CommandLine = my exact commit message) blocked the whole fleet's main-tree
commits.

**How to apply:**
1. **Commit in the foreground.** `git -C H:/prism commit -m "..." -- <pathspec>` directly — a hung
   hook then blocks YOUR visible turn (you see it immediately + can Ctrl-C / diagnose), instead of
   silently orphaning.
2. **Diagnosing a "busy"/held index.lock:** check the lock's age (`stat -c %Y`) AND enumerate git
   processes with command lines: `Get-CimInstance Win32_Process -Filter "Name='git.exe'" | Select
   ProcessId,CreationDate,CommandLine`. A `git commit` holding the lock >30s is hung (real commits
   are sub-second). Match its CommandLine to YOUR commit message to confirm ownership.
3. **Only kill an orphan you've PROVEN is yours** (CommandLine matches your message). A single
   `Stop-Process -Force` may not free a git blocked in an uninterruptible wait on a hung hook child —
   use a **tree kill** (`taskkill /F /T /PID <pid>`) to take down the hung child too. THEN the OS
   releases the handle and `rm .git/index.lock` succeeds.
4. **A fresh lock held by a peer's live commit (small age, CommandLine = a peer's file) → POLL, never
   kill.** The discipline is: kill only your own proven-hung orphan; wait on everyone else's live
   lock. [[feedback_conflict_fork_rule]] sibling.

Sister to R14 (close your own background tasks) — a background `git commit` is the one bg task whose
orphan blocks the entire fleet, so the rule is stronger than "close it after": don't background it at
all.
