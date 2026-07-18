---
name: feedback_close_background_tasks_at_stop
description: Standing rule (2026-05-30) — close your own run_in_background Bash tasks / monitors / detached processes before Stop. Un-closed background tasks are the orphans the fleet-reaper then has to reap.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.420Z
aliases: feedback_close_background_tasks_at_stop
---


**R14 — Close your tool calls.** Every `run_in_background` Bash task, Monitor, or detached process you spawn, you close — `TaskStop` it (or kill its PID) the moment its purpose is served, and verify none linger before the turn ends. Un-closed background tasks are exactly the `bash.exe`/`node.exe` orphans the [[reference_fleet_reaper|fleet-reaper]] then has to clean.

**Why:** Demonstrated live 2026-05-29/30 (slot golf): a single golf session spawned ~6 `run_in_background` tasks (tail-monitors, ollama warms, copies); several tail-monitors died unclosed (exit 255) and others lingered, contributing to a 381-`bash.exe` pile golf then had to reap. The [[reference_fleet_reaper|fleet-reaper]] is a **safety net, not a substitute** — proactive closure keeps the 26-chat fleet's process count + RAM bounded and stops a chat's debris from blocking the next claim on its slot. Golf reaping its own orphans is the ironic anti-pattern this rule kills.

**How to apply:**
1. Any `run_in_background: true` Bash call → when its output is consumed (or it's no longer needed), `TaskStop <task_id>` it. Don't leave `tail -f`/`--monitor-loop`/poll-loops running across a Stop.
2. Before `/handoff` or `/compact` or ending a turn: mentally (or via `TaskList`) confirm no background tasks you started are still running.
3. A background task that *legitimately* must outlive the turn is rare — if so, it's a deliberate exception, not a forgotten orphan.
4. Detached processes you spawn (`detached:true`+`unref()`) escape the chat tree → the durable [[reference_fleet_reaper|fleet-reaper]] task catches those; your job is the non-detached `run_in_background` bash that stays a child of your `claude.exe`.

**Enforcement (planned, approved 2026-05-30):** Stop hook `stop-close-own-bg-tasks.mjs` (BLOCKING) — resolves this chat's `claude.exe` (nearest ancestor of the hook), flags live `bash.exe` descendants ≥10s old, and **blocks Stop** listing them + their `TaskStop` remediation, up to 2 attempts, then auto-reaps (deadlock-proof). Knobs `PRISM_CLOSE_BG_TASKS_{DISABLE,MODE,AGE_SEC,MAX_BLOCKS}`. Pure core `selectUnclosedBgTasks()` + `resolveChatPid()` + `decideEnforcement()`. **Status: coded + plan-approved, NOT yet landed** — it's a main-tree shared-state hook (`h:/prism/.claude/hooks/`) and the cross-worktree guard correctly blocks landing it from the golf worktree; build it from the main tree `h:/prism`. Plan: `H:/.claude/plans/stateful-mapping-bubble.md`.

Orthogonal to [[feedback_always_close_out]] (that's roadmap/doc close-out; this is *process* close-out). Related: [[feedback_golf_owns_reaper]] · [[feedback_golf_insession_tail_not_viable]] · [[reference_fleet_reaper]].
