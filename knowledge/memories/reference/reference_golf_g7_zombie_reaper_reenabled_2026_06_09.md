---
name: reference_golf_g7_zombie_reaper_reenabled_2026_06_09
description: "G7 (golf plan verify) FIX — 'PRISM Zombie Reaper v2' was a crash-critical reaper wrongly DISABLED (the all-session cry-wolf WARN was CORRECT). Re-enabled + kicked it; crashCritDegraded []→healthy, 44→45/50. R12 self-correction: my earlier-session 'it's superseded, don't re-enable' was an UNVERIFIED guess and WRONG. Recurring pattern (precedent 2bc54961b re-enabled 7) → wants an auto-re-enable guard."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_g7_zombie_reaper_reenabled_2026_06_09
---


**2026-06-09 (slot golf, /loop iter2 executing the golf completion plan's G7 = scheduled-task audit verify).**

**Finding (real):** `PRISM Zombie Reaper v2` was **DISABLED** but is in `CRASH_CRITICAL_TASKS` (`scripts/fleet-task-health-watch.mjs:129`) and is one of the 6 supporting reapers `/fleet-reaper` Step 0 fires. fleet-task-health correctly classified it `crashCritDegraded` → the scheduled-task safety-net WARN fired EVERY Stop all session. It was NOT in `EXPECTED_DISABLED_TASKS`. lastRun was today 17:06 result 0 (working until disabled).

**R12 SELF-CORRECTION:** earlier THIS session I told the operator "Zombie Reaper v2 is superseded by PRISM Fleet Reaper, disablement is fine, don't re-enable." That was an **unverified inference** from "Fleet Reaper is healthy." It was WRONG. The config (`CRASH_CRITICAL_TASKS` membership) + the `/startup-golf` skill (lists it as a fleet-reaper Step-0 supporting task) + the repo precedent `2bc54961b` ("re-enable 7 of 7 disabled crash-critical PRISM scheduled tasks", slot:alpha 2026-05-19) all prove it's a GENUINE crash-prevention task, not superseded. Lesson: **verify a 'superseded/expected-disabled' claim against `CRASH_CRITICAL_TASKS`/`EXPECTED_DISABLED_TASKS` before telling the operator a crash-critical reaper is safe to leave disabled** — the cry-wolf WARN may be correct.

**Fix:** `Enable-ScheduledTask "PRISM Zombie Reaper v2"` (non-elevated worked — golf owns the task; the soul refuses *disabling* safety tasks, not *restoring* them) + `Start-ScheduledTask` to clear the post-enable staleness. Verified: crashCritDegraded `[Zombie Reaper v2]`→`[]`, status disabled→healthy, healthy 44→45/50. Remaining WARN = only `PRISM Blueprint OCR Batch` (stale 3.5d, xray-domain OCR, non-crash-critical — flagged for xray, not golf-core).

**RECURRING PATTERN → follow-up unit (G10, hidden):** crash-critical PRISM scheduled tasks getting silently disabled is RECURRING (`2bc54961b` re-enabled 7; this is the 8th). Re-enabling by hand each time is a band-aid. **Proposed golf unit: a guard that detects a DISABLED `CRASH_CRITICAL_TASKS` member and auto-re-enables it (or surfaces an elevated one-liner if it can't), wired into the fleet-task-health Stop hook.** Root-cause of WHAT disables them (Windows task corruption? a crash mid-write? a peer disable?) is still open. This makes the cry-wolf WARN self-healing instead of nagging.

Relates to [[reference_golf_queue_completion_plan_2026_06_09]] (G7 in the plan), the fleet-task-health partition (`U-FTH-EXPECTED-DISABLED-PARTITION` 698cf12ad2), precedent `2bc54961b`.