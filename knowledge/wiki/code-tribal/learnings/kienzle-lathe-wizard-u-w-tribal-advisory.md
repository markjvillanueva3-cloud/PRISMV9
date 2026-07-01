# KIENZLE-LATHE-WIZARD/U-W-TRIBAL-ADVISORY — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-ADVISORY (slot:whiskey): wire the 675-tip maxed corpus into the closed-loop per-part (tribal knowledge factored in)

**Commit:** `c88511610c17` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T12:00:42-05:00
**Tags:** kienzle-lathe-wizard, u-w-tribal-advisory, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-ADVISORY (slot:whiskey): wire the 675-tip maxed corpus into the closed-loop per-part (tribal knowledge factored in)

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-ADVISORY (slot:whiskey): wire the 675-tip maxed corpus into the closed-loop per-part (tribal knowledge factored in)

Closes the "smaller interim win" from the tribal-not-in-generation gap memo: the 675-tip maxed
lathe corpus was consumed only by AIResourceLearningEngine -- NOT surfaced in the closed loop.
Now each scored part gets its most-relevant shop tips. ADVISORY only -- never alters program
params or the safety verdict (deeper structured-adjustment path is the deferred unit).

- lathe-tribal-advisory.mjs (pure, 11/11) -- word-boundary lexical matcher (od/id never hit
  method/fluids); topic-weighted; dedup; top-N score>0.
- step+ocr loops -- loadTribalTips (fail-soft) + per-part tribal_advisory + dashboard (clone).
- closed-loop-full.mjs -- folds tribal_advisory into rung_c + rung_c_step.

LIVE: AGRATI 9070219 OP2 -> 3 relevant tips (coatings, coolant for rough turning, finishing)
from 675. Per-file 2-arm scrutiny BOTH PASS; 3 P2s fixed (od/id word-boundary, OCR-fold parity,
collision test). Advisory is additive-only.
```

## Files touched (10)
- scripts/lathe-closed-loop-full.mjs                  |   2 +
- scripts/lathe-rungc-ocr-loop.mjs                    |  31 +++++++++-
- scripts/lathe-rungc-step-loop.mjs                   |  33 ++++++++++-
- scripts/lib/lathe-tribal-advisory.mjs               |  99 +++++++++++++++++++++++++++++++
- scripts/lib/lathe-tribal-advisory.test.mjs          |  93 +++++++++++++++++++++++++++++
- state/shared/dashboards/lathe-closed-loop-full.json |  31 +++++++++-
- state/shared/dashboards/lathe-closed-loop-full.md   |   2 +-
- state/shared/dashboards/lathe-rungc-step.json       | 177 ++++++++++++++++----------------------------------------
- state/shared/dashboards/lathe-rungc-step.md         |   5 +-
- 9 files changed, 339 insertions(+), 134 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c88511610c17`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._