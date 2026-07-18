# HERMES-CRON-FIX/U-DREAM-CYCLE-TIMEOUT — [MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT (slot:bravo): 267014 was a PT2M task-timeout, NOT an OOM -- raise limit 2min->30min + bound the galaxy-cascade execFileSync (20min self-timeout, fail-soft). Synth=9s/19156 memos; ETIMEDOUT detection proven live on node22; live task now PT30M; 40/40 tests (+4 cascade-timeout). Corrects HERMES-FULL-ASSESSMENT OOM mislabel (R12).

**Commit:** `7122c1a99350` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T15:07:51-05:00
**Tags:** hermes-cron-fix, u-dream-cycle-timeout, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT (slot:bravo): 267014 was a PT2M task-timeout, NOT an OOM -- raise limit 2min->30min + bound the galaxy-cascade execFileSync (20min self-timeout, fail-soft). Synth=9s/19156 memos; ETIMEDOUT detection proven live on node22; live task now PT30M; 40/40 tests (+4 cascade-timeout). Corrects HERMES-FULL-ASSESSMENT OOM mislabel (R12).

## Body
```
[MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT (slot:bravo): 267014 was a PT2M task-timeout, NOT an OOM -- raise limit 2min->30min + bound the galaxy-cascade execFileSync (20min self-timeout, fail-soft). Synth=9s/19156 memos; ETIMEDOUT detection proven live on node22; live task now PT30M; 40/40 tests (+4 cascade-timeout). Corrects HERMES-FULL-ASSESSMENT OOM mislabel (R12).
```

## Files touched (5)
- .claude/helpers/install-hermes-dream-cycle-task.ps1     |  18 +++++++++++---
- scripts/hermes-dream-cycle-synth.mjs                    |  22 +++++++++++++++-
- scripts/hermes-dream-cycle-synth.test.mjs               |  53 +++++++++++++++++++++++++++++++++++++++
- state/shared/specs/HERMES-FULL-ASSESSMENT-2026-06-17.md | 101 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 190 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7122c1a99350`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CRON-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._