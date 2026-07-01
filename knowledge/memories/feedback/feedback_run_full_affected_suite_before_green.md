---
name: feedback_run_full_affected_suite_before_green
description: "Before claiming \"tests green\" on an engine change, run the FULL test file(s) that exercise that engine via its shared fixtures -- not just the new/related files you chose"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
aliases: feedback_run_full_affected_suite_before_green
---


When you change a SHARED engine, run the engine's OWN test file (and any file using its shared
fixtures), not just the new test you wrote + a hand-picked subset.

**Why:** U-OSC-SPINDLE-TSC (2026-06-09, slot:oscar) wired a +8% through-spindle-coolant bonus into
`coolant_effectiveness`. I ran 5 chosen SFC files (48/48) and committed claiming "48/48 SFC suite
green". The 3-of-3 scrutiny (arms B+C) then FAILED it: the engine's OWN file
`SpeedFeedNineAxisOrchestratorEngine.test.ts` (59 tests, NOT in my chosen 5) had a baseline assertion
":193 flood = exactly 1.0" using the full fixture `MILL_ALUMINUM_FULL_9AXIS`, which sets BOTH
`through_spindle_coolant:true` AND `coolant.type:"flood"` -- so my bonus made it 1.08 != 1.0. A
shared fixture that exercises ALL axes is exactly the thing a single-axis change silently breaks.

**How to apply:**
- After an engine edit, run `npx vitest run src/__tests__/<ThatEngine>.test.ts` (the engine's own
  suite) BEFORE claiming green -- the shared all-axes fixtures live there and are the most likely to
  break on a single-axis change.
- `git grep -l <SharedFixtureName>` to find every file asserting on that fixture; run them all.
- "48/48 green" is an R12 LIE if it's 48/48 of a SUBSET while the full set is 58/59. State the exact
  scope you ran ("ran files X,Y,Z" not "the suite") if you did not run everything.
- This error correlates with DEEP-CONTEXT FATIGUE -- when you catch yourself narrowing the test scope
  to "the obviously-related files", that's the signal to checkpoint/`/compact`, not to push another
  complex unit. The scrutiny gate caught it here; don't rely on that.

Related: [[reference_oscar_sfc_dead_axis_triage_2026_06_09]] (FIX-1 = U-OSC-SPINDLE-TSC) ·
the R12 fail-loud + R15 wire-test-validate doctrine.
