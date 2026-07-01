# SESSION-CONTINUITY/U-PRECOMPACT-TEST-HERMETIC — [MAIN-FORCE] [SESSION-CONTINUITY]/U-PRECOMPACT-TEST-HERMETIC (slot:alpha): pin precompact-auto-trigger test thresholds to the hook defaults

**Commit:** `c067d51fd4c7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T13:03:46-05:00
**Tags:** session-continuity, u-precompact-test-hermetic, auto-distilled

## Subject
[MAIN-FORCE] [SESSION-CONTINUITY]/U-PRECOMPACT-TEST-HERMETIC (slot:alpha): pin precompact-auto-trigger test thresholds to the hook defaults

## Body
```
[MAIN-FORCE] [SESSION-CONTINUITY]/U-PRECOMPACT-TEST-HERMETIC (slot:alpha): pin precompact-auto-trigger test thresholds to the hook defaults

R9 hermeticity fix surfaced during U-SLOT-RESOLVE-UNIFY: runHook spreads
`...process.env`, so the host OS env PRECOMPACT_{SOFT,HARD}_TOKENS (860000/900000
on this machine; 99M in prod to silence) leaked into the suite and made the 905K
SOFT/HARD-boundary test non-deterministic (905K > the host HARD 900000 -> hard
block, but the test expects SOFT at <940000 default). It read 19/20 under the
live env, 20/20 only with the vars unset.

Fix: pin PRECOMPACT_SOFT_TOKENS=880000 + PRECOMPACT_HARD_TOKENS=940000 (the
hooks DOCUMENTED defaults, precompact-auto-trigger.mjs:124-125) in the test
defaultIso. Threshold-specific tests (99M-clamp, PRECOMPACT_DISABLE) override via
extraEnv (spread last, still wins). NOT a softening -- pins to the documented
default so the suite verifies the intended boundary regardless of host env.

Verified: 20/20 under the live hostile OS env (HARD=900000/SOFT=860000); U2
clamp + DISABLE override tests still pass.
```

## Files touched (2)
- .claude/hooks/__tests__/precompact-auto-trigger.test.mjs | 9 +++++++++
- 1 file changed, 9 insertions(+)

## Lessons surfaced in commit body
- till wins). NOT a softening -- pins to the documented
- tile OS env (HARD=900000/SOFT=860000); U2
- till pass.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c067d51fd4c7`
- Milestone envelope: `mcp-server/data/milestones/SESSION-CONTINUITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._