---
name: feedback-checkin-args-are-primary-work-order
description: "When the user types `/checkin-<slot> <task...>` the trailing text is the PRIMARY work order, not decoration. /checkin's heavy slot-claim + 15-section fleet report must run as minimal preamble — never swallow or deprioritize the actual request that follows the slash command."
source: prism-memory
synced: 2026-05-18T01:02:08.044Z
aliases: feedback_checkin_args_are_primary_work_order
---


# /checkin-<slot> args ARE the work order — don't let the report swallow them

When the user leads a message with `/checkin-bravo` (or any `/checkin-<nato>` /
bare `/checkin`) and then types a real instruction after it
("continue docustrata and print work until complete /loop /goal", "build X",
a filepath, etc.), **that trailing text is the primary thing they want done.**
The slash command forwards it verbatim as `/checkin` args; a task directive in
it is exactly what triggers the dev-pipeline phase (checkin.md Steps 8-14).

**Why:** the user observed that typing `/checkin-bravo <request>` made it
"seem like you ignore all other requests or words I type after it." That is a
real, accurate observation. `/checkin` runs an unconditional, verbose
slot-claim + 15-section fleet §Report (Steps 1-7) *first*. The actual work
order only fires afterward, and the report is loud enough that the real
instruction gets buried/deprioritized — functionally swallowed.

**How to apply:** treat `/checkin-<slot>` as lightweight preamble. Do the
slot-binding minimally (claim/heartbeat/handoff-bind), compress or skip the
full §Report unless something actionable surfaces, then **immediately act on
the trailing instruction** as the main task. Never end the turn having only
produced the check-in report when the user also gave a work order in the same
message. If the trailing directive contains `/loop` / `/goal` / "until
complete", enter the autonomous loop on the named task — don't stop after
check-in. Related: [[reference_checkin_loop_fullstack_2026_05_16]],
[[reference_checkin_autonomous_loop_2026_05_16]].


## Related
[[skills/checkin-|/checkin-]] • [[skills/checkin-bravo|/checkin-bravo]] • [[skills/checkin|/checkin]] • [[skills/loop|/loop]] • [[skills/goal|/goal]] • [[skills/deprioritized|/deprioritized]] • [[skills/heartbeat|/heartbeat]] • [[skills/handoff-bind|/handoff-bind]]