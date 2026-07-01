# SFC-WIRING-MS0/U-SFC-WIKI-VALIDATION-LESSON — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-WIKI-VALIDATION-LESSON (slot:oscar): wiki lesson -- live validation caught a regression unit tests could not

**Commit:** `fba4eb2f59d7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T13:55:07-05:00
**Tags:** sfc-wiring-ms0, u-sfc-wiki-validation-lesson, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-WIKI-VALIDATION-LESSON (slot:oscar): wiki lesson -- live validation caught a regression unit tests could not

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-WIKI-VALIDATION-LESSON (slot:oscar): wiki lesson -- live validation caught a regression unit tests could not

Bug-finding->wiki gate: captures the compounding lesson from the shop_recommended default
arc. A force-safe, type-clean, all-green change (universal shop_recommended default) still
DEGRADED the real vendor-agreement metric (best 71%->41%, turning overshoot +32..+56%);
only the R15 VALIDATE step on the 17-cell vendor set caught it. Iterative validation
narrowed the scope twice (universal -> operation -> P/M-group) to the net-win config.
Rules: unit tests verify the mechanism, validation verifies the OUTCOME; re-validate a
memory hypothesis on the FULL population before generalizing; scope a regime-specific knob,
don't average it (R7). Refs commits 9d97e4aa12 / ccf687af9f / 4fbec2e9fb / c212207b0c.
```

## Files touched (2)
- .../lessons/shop-recommended-validation-caught-regression.md     | 54 ++++++++++++++++++++++++++++++
- 1 file changed, 54 insertions(+)

## Lessons surfaced in commit body
- LESSON (slot:oscar): wiki lesson -- live validation caught a regression unit tests could not
- lesson from the shop_recommended default
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fba4eb2f59d7`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._