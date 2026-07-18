# AI-SYNERGY-AUDIT-MS0/U-GOAL-LOSS-FN-DETECT-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-GOAL-LOSS-FN-DETECT-FIX (slot:tango): apply 3-of-3 scrutiny P1s -- lazy-import fail-open + drop ambiguous bare metric nouns

**Commit:** `3a2e1b6b4f18` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:21:17-05:00
**Tags:** ai-synergy-audit-ms0, u-goal-loss-fn-detect-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-GOAL-LOSS-FN-DETECT-FIX (slot:tango): apply 3-of-3 scrutiny P1s -- lazy-import fail-open + drop ambiguous bare metric nouns

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-GOAL-LOSS-FN-DETECT-FIX (slot:tango): apply 3-of-3 scrutiny P1s -- lazy-import fail-open + drop ambiguous bare metric nouns

Two P1s from the 3-of-3 scrutiny of 0e9b6ef88a (all 3 arms PASS; these strengthen it):

P1 (arm C, regression/silent-breakage): the detector was a STATIC top-level import in
goal-prereq-inject.mjs -- the first in a hook that deliberately lazy-imports every local
helper in try/catch precisely so it can never crash-on-load and silently kill /goal
pre-flight across all 34 galaxies (a static import links before any try/catch runs). Latent
today (lib is pure+present) but a future rename/C->H desync would emit NO JSON fleet-wide.
Fix: lazy await-import inside the guarded nudge block, matching loadVerifyUnitReady; pass the
raw prompt so extractGoalText also runs inside the catch (closes arm C P1-2).

P1 (arm B, classifier soundness): bare metric/state WORDS (recall|precision|accuracy|
coverage|loss|exists|present|validated) were check signals -- but in this MACHINING codebase
those are everyday nouns ('precision machining', 'loss-leader', 'improve recall of search'),
so genuinely-unbounded prose was false-suppressed. Fix: drop them as bare signals; they still
count WHEN paired with a number via the existing comparison/%/ratio signals. +2 boundary tests
pinning 'bare metric word => still unbounded' vs 'metric+number => bounded'.

VALIDATE: 17/17 tests; live hook smoke -- 'improve recall across all galaxies' now correctly
fires (was wrongly suppressed); 'recall to >= 0.9' still suppressed; lazy-import path emits
valid JSON. P3 (length<8 guard swallows 6-char verbs polish/refine/harden) DEFERRED -- benign,
logged. Pairs with 0e9b6ef88a.
```

## Files touched (4)
- .claude/hooks/goal-prereq-inject.mjs           | 14 +++++++++-----
- scripts/lib/goal-loss-function-detect.mjs      |  9 +++++++--
- scripts/lib/goal-loss-function-detect.test.mjs | 23 +++++++++++++++++++++++
- 3 files changed, 39 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till
- till unbounded' vs 'metric+number => bounded'.
- wrongly suppressed); 'recall to >= 0.9' still suppressed; lazy-import path emits

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3a2e1b6b4f18`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._