# SFC-VENDOR-PARITY/U-OSC-JM-PROVEN-TRUST-POLICY — [MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-JM-PROVEN-TRUST-POLICY (slot:oscar): codify JM proven = test-baseline, NOT a trusted recommendation input

**Commit:** `ad8dee9a9305` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T02:53:00-05:00
**Tags:** sfc-vendor-parity, u-osc-jm-proven-trust-policy, auto-distilled

## Subject
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-JM-PROVEN-TRUST-POLICY (slot:oscar): codify JM proven = test-baseline, NOT a trusted recommendation input

## Body
```
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-JM-PROVEN-TRUST-POLICY (slot:oscar): codify JM proven = test-baseline, NOT a trusted recommendation input

Operator directive (2026-06-25) resolves the proven-blend fork: 'our programs are mostly written by
amateurs so don't trust the speeds, feeds and parameters, use them as the GUIDELINE to test against.'
So the orchestrator's 60% proven-blend must NOT trust JM amateur data -- and it correctly does not (the
SFM-stored cssSpeed is rejected by the [0.7,1.3] guard, so the blend is dormant for JM lathe data; the
comparison/divergence path already converts units for the apples-to-apples 'test against' use).

Decision record codifies: (1) keep the blend dormant/advisory; do NOT 'fix' units to activate it; (2) the
EMPIRICALLY VERIFIED units (css=SFM *0.3048, feed=IPR *25.4, read from raw CNC LATHE/*.MIN: G96 S200 on
inch machines + G95 F.005); (3) the correct fix-location (hydrate/consumer chokepoint, not ingestion) so
a future session never repeats the no-op. Closes the Task #12 fork (reference-only, per directive).
```

## Files touched (2)
- knowledge/wiki/lessons/jm-proven-speedfeed-is-a-test-baseline-not-a-trusted-recommendation-input.md | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 55 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ad8dee9a9305`
- Milestone envelope: `mcp-server/data/milestones/SFC-VENDOR-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._