# SIERRA-VAULT-OPS/U-MARK-SWITCH-CMD — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-MARK-SWITCH-CMD (slot:sierra): /mark-switch operator command -- one-word surface to stamp an account-switch boundary

**Commit:** `5be069f0705e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T15:22:30-05:00
**Tags:** sierra-vault-ops, u-mark-switch-cmd, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-MARK-SWITCH-CMD (slot:sierra): /mark-switch operator command -- one-word surface to stamp an account-switch boundary

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-MARK-SWITCH-CMD (slot:sierra): /mark-switch operator command -- one-word surface to stamp an account-switch boundary

Wraps the already-committed --mark-switch CLI (56b018b985) so the operator can reset
5h session-limit tracking to the current account after a manual login switch. The
banner (fleet-survival-advisory -> liveStatus) and the auto-switch decision
(account-switch-restart-coordinator) both read through the stamped boundary, so one
mark floors both per-account. Force-added past the .claude/commands/* catch-all
ignore, consistent with the 56 already-tracked authored commands -- an uncommitted
local-only command is an orphan (R15: build it whole).
```

## Files touched (2)
- .claude/commands/mark-switch.md | 38 ++++++++++++++++++++++++++++++++++++++
- 1 file changed, 38 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5be069f0705e`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._