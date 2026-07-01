---
name: reference_post_ship_tribal-outcome-loop-ms0-u-ttob04
description: Auto-distilled learnings from shipping TRIBAL-OUTCOME-LOOP-MS0/U-TTOB04 (commit 9076f604a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.084Z
aliases: reference_post_ship_tribal-outcome-loop-ms0-u-ttob04
---


# TRIBAL-OUTCOME-LOOP-MS0/U-TTOB04

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TRIBAL-OUTCOME-LOOP-MS0]/U-TTOB04 (slot:foxtrot iter32): auto-instrumentation wrapper. lessonsForOperationWithRecording(operation, programId) returns ranked tips AND records each application against the program ID in one call. Opt-in via programId discriminator so retrieve-without-apply doesn't pollute the log. Recording errors are caught + warned, not thrown — read path stays robust even if write path breaks. Closes the WRITE side of the closed-loop pipeline; consumers (MillStudio, MillingWizard) can adopt with a single arg change.

**Shipped:** 2026-05-27T13:05:00-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[tribal-outcome-loop-ms0-u-ttob04]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._