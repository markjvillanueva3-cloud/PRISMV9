# SFC-ACCURACY/U-OSC-ORCH-FORCE-PARITY-TEST — [MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ORCH-FORCE-PARITY-TEST (slot:oscar): track the force-parity proving test (3-of-3 P0 fix)

**Commit:** `8e6383290453` · **By:** markjvillanueva3-cloud · **At:** 2026-06-27T13:26:11-05:00
**Tags:** sfc-accuracy, u-osc-orch-force-parity-test, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ORCH-FORCE-PARITY-TEST (slot:oscar): track the force-parity proving test (3-of-3 P0 fix)

## Body
```
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ORCH-FORCE-PARITY-TEST (slot:oscar): track the force-parity proving test (3-of-3 P0 fix)

R12 disclosure: the prior commit 6347cc480f (U-MACHDB-04) ACCIDENTALLY bundled a separate, pre-existing
uncommitted change -- U-OSC-ORCH-FORCE-PARITY -- because I 'git add'-ed the whole SpeedFeedOrchestratorEngine.ts
file (which already carried that uncommitted oscar SFC work) instead of only my resolveMachine hunk. That
force-model refactor routes the 4 inline kc1.1*ap*fz^(1-mc) tangential-force sites through the shared
calculateKienzleCuttingForce core (Martellotti mean-chip + engaged-teeth duty), removing inline duplication
and LOWERING an over-stated Fc for low-radial-engagement milling (the SAFE direction). The 3-of-3 scrutiny gate
correctly FAILED 6347cc480f on arm A: a safety-critical physics change shipped with its sole proving test left
UNTRACKED.

This commit resolves that: tracks SpeedFeedOrchestrator-force-parity.test.ts (6/6 -- specific energy in the
physical 2-7 J/mm^3 band not ~17.7, no 3x force blow-up at low ae/D, fz-reduction lever Fc proportionality
preserved through h_mean) so the shipped force change IS covered in version control + documents it for audit.
Verified: force-parity 6/6 + full SFC orchestrator/gauntlet/nine-axis 305/305 pass; engine tsc-clean. The
force change itself was independently validated PHYSICALLY-CORRECT by all 3 scrutiny arms (A/B/C).
```

## Files touched (2)
- mcp-server/src/__tests__/SpeedFeedOrchestrator-force-parity.test.ts | 106 ++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 106 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8e6383290453`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._