---
name: feedback-no-schedule-wakeup-in-loop
description: "Never call ScheduleWakeup in /loop dynamic mode — user wants continuous execution with no pauses between iterations, permanent for all chats"
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.007Z
aliases: feedback_no_schedule_wakeup_in_loop
---


# Never pause between /loop iterations

Standing rule (2026-05-13, user, mid-autonomous /loop): *"can you make it so its permanently off for all chats"* — referring to the ScheduleWakeup pause I was using between /loop iterations.

**Rule:** In `/loop` dynamic mode (when invoked with `<<autonomous-loop-dynamic>>` sentinel or when the user has explicitly invoked `/loop ...` and asked me to run it autonomously), **do NOT call `ScheduleWakeup`**. Continue picking + shipping the next unit in the same turn.

**Why:** The user values throughput over cost-cache-warmth optimization. They have repeatedly told me to "run /loops until this /goal is complete" and "continue where we left off" mid-pause — the wakeup pause was costing them another round-trip every time. They've now made this a permanent preference across all chats.

**How to apply:**
- When finishing a unit in /loop mode, immediately call `/pick-unit` (or the equivalent) and start the next unit in the same turn.
- End the turn naturally only when (a) the user's `/goal` is genuinely complete, (b) the picker returns no candidates with met dependencies and concrete deliverables, (c) the user interrupts, or (d) I hit a hard blocker (lock contention that won't clear, budget exhausted, etc.).
- If I have a one-off reason to actually pause (e.g., a downstream job needs N minutes to finish before I can verify it), explain the pause inline rather than silently scheduling.

**Override:** Only the user themselves can override this rule by explicitly asking me to schedule a wakeup for a specific reason.

Related: [[feedback_always_close_out]] · [[feedback_pick_unit_routing]] · [[feedback_always_build]]


## Related
[[skills/loop|/loop]] • [[skills/loops|/loops]] • [[skills/goal|/goal]] • [[skills/pick-unit|/pick-unit]]