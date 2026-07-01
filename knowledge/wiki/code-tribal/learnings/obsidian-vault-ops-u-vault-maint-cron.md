# OBSIDIAN-VAULT-OPS/U-VAULT-MAINT-CRON — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-MAINT-CRON (slot:sierra): ship promote + rot-sentinel cron installers (migration-safe, NOT armed)

**Commit:** `8c4dff660a42` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T11:33:15-05:00
**Tags:** obsidian-vault-ops, u-vault-maint-cron, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-MAINT-CRON (slot:sierra): ship promote + rot-sentinel cron installers (migration-safe, NOT armed)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-MAINT-CRON (slot:sierra): ship promote + rot-sentinel cron installers (migration-safe, NOT armed)

Gap-B3/P1. promote-memory-to-wiki.mjs + vault-rot-sentinel.mjs work + ran but only
BY HAND (no scheduler refs). Ships two installers cloned from the verified
install-wiki-tribal-audit-task.ps1 pattern (current-user S4U, knob-aware Action,
idempotent): promote --apply --backlink daily 02:47; rot --write daily 00:38
(off-peak, distinct, no collision).

MIGRATION-SAFE: each adds a -Disabled switch (Register then Disable-ScheduledTask) +
do-not-run-during-migration header. SHIPPED but NOT executed -- zero Windows tasks
created. Operator arms post-migration. Knobs PRISM_VAULT_{PROMOTION,ROT}_CRON_DISABLE=1.

Tests install-vault-crons.test.mjs 15/15 (mutation-verified: FAILS on SYSTEM principal,
removed-knob, removed-Disabled, -RunNow-not-suppressed). 2-reviewer PASS. Known inherited
P2 (handoff): $env:TEMP action-script fragility shared by whole installer family.
```

## Files touched (4)
- .claude/helpers/install-vault-crons.test.mjs        |  88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/install-vault-promotion-cron.ps1    | 117 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/install-vault-rot-sentinel-cron.ps1 | 107 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 312 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8c4dff660a42`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._