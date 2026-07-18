# HERMES-OBSIDIAN-COMBO/U-HVD-CRON — [MAIN-FORCE] [HERMES-OBSIDIAN-COMBO]/U-HVD-CRON (slot:zulu): durable scheduler for the Hermes vault digest -- sustained $0 hermes utilization

**Commit:** `9ae1ebd84bef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T13:38:32-05:00
**Tags:** hermes-obsidian-combo, u-hvd-cron, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-OBSIDIAN-COMBO]/U-HVD-CRON (slot:zulu): durable scheduler for the Hermes vault digest -- sustained $0 hermes utilization

## Body
```
[MAIN-FORCE] [HERMES-OBSIDIAN-COMBO]/U-HVD-CRON (slot:zulu): durable scheduler for the Hermes vault digest -- sustained $0 hermes utilization

install-hermes-vault-digest-task.ps1 (mirrors install-brain-refresh-task.ps1):
registers 'PRISM Hermes Vault Digest' to run scripts/hermes-vault-digest.mjs every
240min. Each run synthesizes the 8 most-recent vault notes through Hermes (Grok,
--no-fallback) -> knowledge/hermes-outputs/, keeping gradeHermesUtilization warm
(never >48h stale) + a fresh vault brief landing, $0 Claude. Default principal =
current-user (NO elevation). REGISTERED + verified live: LastTaskResult=0, scheduled
task produced vault-digest-recent-...18-37-24.md. --no-fallback fails loud if :8645 down.
```

## Files touched (2)
- .claude/helpers/install-hermes-vault-digest-task.ps1 | 95 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 95 insertions(+)

## Lessons surfaced in commit body
- tilization
- tilization warm

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9ae1ebd84bef`
- Milestone envelope: `mcp-server/data/milestones/HERMES-OBSIDIAN-COMBO.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._