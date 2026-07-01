# FLEET-HYGIENE/U-REAPER-GUARDIAN-TRANSIENT — [MAIN] [FLEET-HYGIENE]/U-REAPER-GUARDIAN-TRANSIENT (slot:golf): fix false 'reaper NOT REGISTERED' alarm -- distinguish transient schtasks timeout/spawn-refusal from genuine absence

**Commit:** `fc27bddc9940` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T12:06:14-05:00
**Tags:** fleet-hygiene, u-reaper-guardian-transient, auto-distilled

## Subject
[MAIN] [FLEET-HYGIENE]/U-REAPER-GUARDIAN-TRANSIENT (slot:golf): fix false 'reaper NOT REGISTERED' alarm -- distinguish transient schtasks timeout/spawn-refusal from genuine absence

## Body
```
[MAIN] [FLEET-HYGIENE]/U-REAPER-GUARDIAN-TRANSIENT (slot:golf): fix false 'reaper NOT REGISTERED' alarm -- distinguish transient schtasks timeout/spawn-refusal from genuine absence

queryScheduledTask treated spawnSync timeout/spawn-refusal (r.status===null, r.error set) the same as a clean not-found, so under fleet load (756-bash storm this session) it falsely reported the durable PRISM Fleet Reaper as NOT REGISTERED while dual-API ground truth showed it Running. Adds pure isTransientQueryResult() helper + transient:true flag + a soft 'registration UNKNOWN this pass' advisory branch (no false alarm) + main-guard for testability. 7/7 unit tests. Closes reference_reaper_guardian_false_negative_2026_05_26 (root-cause deferred 3wk).
```

## Files touched (3)
- .claude/hooks/golf-slot-reaper-guardian.mjs      | 54 ++++++++++++++++++++++++++++++++++++++++++++++++------
- .claude/hooks/golf-slot-reaper-guardian.test.mjs | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 103 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fc27bddc9940`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._