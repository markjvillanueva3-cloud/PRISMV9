# SYSTEM-SYNERGY-AUDIT/U-HANDOFF-PRUNE — [MAIN] [SYSTEM-SYNERGY-AUDIT]/U-HANDOFF-PRUNE: supersession-aware handoff archiver (Track H6)

**Commit:** `79a9462921fa` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T16:07:15-05:00
**Tags:** system-synergy-audit, u-handoff-prune, auto-distilled

## Subject
[MAIN] [SYSTEM-SYNERGY-AUDIT]/U-HANDOFF-PRUNE: supersession-aware handoff archiver (Track H6)

## Body
```
[MAIN] [SYSTEM-SYNERGY-AUDIT]/U-HANDOFF-PRUNE: supersession-aware handoff archiver (Track H6)

SYSTEM-SYNERGY-AUDIT-2026-05-09 Track H6 / 3-#8 ('no LRU on handoffs',
876 live HANDOFF-*.md). Groups handoffs by chat instance, keeps newest
per instance, MOVES superseded siblings to handoffs/archive/ (never
deletes). Answers the audit's open-question #3 ('criteria for resolved')
= a NEWER handoff exists for the same instance. Age floor guards an
idle-but-live fleet (the single freshest file is never archived).

- scripts/handoff-prune.mjs: pure planPrune + side-effecting applyPlan
  (no-clobber) + R12 fail-loud CLI; pathToFileURL ESM main-detect
- scripts/handoff-prune.test.mjs: 27 node:test cases incl. subprocess
  oracle + deterministic applyPlan-failure-branch coverage
- install-handoff-prune-task.ps1: daily 03:47 + AtStartup S4U task

Per-file scrutiny: arm A (code-analyzer) PASS, arm B (reviewer) PASS
w/ P1 (untested failure branch) -> fixed -> re-verified PASS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/helpers/install-handoff-prune-task.ps1 | 145 +++++++++
- scripts/handoff-prune.mjs                      | 301 +++++++++++++++++++
- scripts/handoff-prune.test.mjs                 | 390 +++++++++++++++++++++++++
- 3 files changed, 836 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 79a9462921fa`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._