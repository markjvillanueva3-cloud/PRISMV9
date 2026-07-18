# PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-FLEET-P1-LEG-STARVATION-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-OCTOPUS-FLEET-SYNERGY-MS0]/U-FLEET-P1-LEG-STARVATION-FIX (slot:bravo): fs legs run before the slow index stage so the octopus stops starving to 1/5 legs (smoke: 1->4 legs, 17.7s->2.6s); +PRISM_OCTOPUS_SKIP_INDEX_LEGS escape hatch; 3 fail-on-revert tests, 2x scrutiny PASS

**Commit:** `a6e4f165a8de` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T19:24:43-05:00
**Tags:** psn-octopus-fleet-synergy-ms0, u-fleet-p1-leg-starvation-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-OCTOPUS-FLEET-SYNERGY-MS0]/U-FLEET-P1-LEG-STARVATION-FIX (slot:bravo): fs legs run before the slow index stage so the octopus stops starving to 1/5 legs (smoke: 1->4 legs, 17.7s->2.6s); +PRISM_OCTOPUS_SKIP_INDEX_LEGS escape hatch; 3 fail-on-revert tests, 2x scrutiny PASS

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-OCTOPUS-FLEET-SYNERGY-MS0]/U-FLEET-P1-LEG-STARVATION-FIX (slot:bravo): fs legs run before the slow index stage so the octopus stops starving to 1/5 legs (smoke: 1->4 legs, 17.7s->2.6s); +PRISM_OCTOPUS_SKIP_INDEX_LEGS escape hatch; 3 fail-on-revert tests, 2x scrutiny PASS
```

## Files touched (3)
- scripts/lib/octopus-corpus-loader.mjs      | 53 ++++++++++++++++++++++++++++++++++++++---------------
- scripts/lib/octopus-corpus-loader.test.mjs | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 112 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a6e4f165a8de`
- Milestone envelope: `mcp-server/data/milestones/PSN-OCTOPUS-FLEET-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._