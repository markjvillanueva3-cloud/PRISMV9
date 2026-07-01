# KIENZLE-LATHE-WIZARD/U-W-TRIBAL-CLASSIFY-GUARD — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-CLASSIFY-GUARD (slot:whiskey): quantitative-evidence guard suppresses the FF2 factor-hallucination

**Commit:** `6d723b68f595` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T13:03:43-05:00
**Tags:** kienzle-lathe-wizard, u-w-tribal-classify-guard, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-CLASSIFY-GUARD (slot:whiskey): quantitative-evidence guard suppresses the FF2 factor-hallucination

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-TRIBAL-CLASSIFY-GUARD (slot:whiskey): quantitative-evidence guard suppresses the FF2 factor-hallucination

Auto-fix of the documented false-positive in U-W-TRIBAL-CLASSIFY: the model invented a
parametric factor from a control-code mention ("Use FF2 for the feedrate" -> feed_factor 1.2).
New hasFactorEvidence/hasSfmEvidence guards: a relative rpm/feed/doc factor is accepted ONLY when
the tip TEXT states a directional CHANGE verb + a number; an sfm cap only with a surface-speed
context + number. No tipText -> guard inert (backward-compat). Monotonically SAFE -- only RESTRICTS
acceptance (can never introduce a false adjustment). Runner now passes tipText=e.tip.

LIVE behavior: "Use FF2 ..." -> advisory_only (was a hallucinated feed_factor 1.2); "Reduce feed
20% for interrupted cuts" -> feed_factor kept. 20/20 tests (4 new guard regressions incl FF2 + sfm-context).
Hardens the classifier seam so IF the structured-adjustment path is ever revisited, its parametric
output is trustworthy (the path itself remains data-retired: ~0% real yield).
```

## Files touched (4)
- scripts/lathe-tribal-classify.mjs       |  2 +-
- scripts/lib/lathe-tip-classify.mjs      | 27 ++++++++++++++++++++++++---
- scripts/lib/lathe-tip-classify.test.mjs | 23 +++++++++++++++++++++++
- 3 files changed, 48 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6d723b68f595`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._