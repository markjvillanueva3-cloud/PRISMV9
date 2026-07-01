# SYSTEM-VIZ-HYGIENE/U-SVH-ENVELOPE-CLEANUP — [MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-ENVELOPE-CLEANUP (slot:sierra): mark stale units in 2 closed-out milestones -> 0 false drift flags fleet-wide

**Commit:** `67465f115aea` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:09:56-05:00
**Tags:** system-viz-hygiene, u-svh-envelope-cleanup, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-ENVELOPE-CLEANUP (slot:sierra): mark stale units in 2 closed-out milestones -> 0 false drift flags fleet-wide

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-ENVELOPE-CLEANUP (slot:sierra): mark stale units in 2 closed-out milestones -> 0 false drift flags fleet-wide

Two milestones were status:completed (closed by real commits) but their phase-units carried no status, so MILESTONE_PROGRESS showed them falsely pending. MS-VIZ-ROADMAP-BIND: 10 placeholder units -> superseded (never-built placeholders superseded by the real deliverables per the envelope placeholder_disclosure; ca0840b4d0 + 42ad655bc4) + completed_units 0->10. MS-DOCU-FINISH: U-DOCU-01/02/03 -> shipped (cd1a0fc160 lists them shipped). Combined with U-SVH-MSPROGRESS-SUPERSEDED (vocabulary fix), zeroes out ALL false claims_completed_but_units_pending flags fleet-wide (3 -> 0). Validated: regen MILESTONE_PROGRESS -> both consistent, fleet false-drift count 0.
```

## Files touched (3)
- mcp-server/data/milestones/MS-DOCU-FINISH.json      |  9 ++++++---
- mcp-server/data/milestones/MS-VIZ-ROADMAP-BIND.json | 32 +++++++++++++++++++++-----------
- 2 files changed, 27 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 67465f115aea`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._