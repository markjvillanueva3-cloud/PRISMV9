# AGENTIC-SUBSTRATE-BRIDGE/U-PLAN-CORRECT-R2 — [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-PLAN-CORRECT-R2 (slot:bravo): record 3 shipped units + R12 round-2 corrections (harness-only-tools wall)

**Commit:** `9a8400faa3c4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T02:57:14-05:00
**Tags:** agentic-substrate-bridge, u-plan-correct-r2, auto-distilled

## Subject
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-PLAN-CORRECT-R2 (slot:bravo): record 3 shipped units + R12 round-2 corrections (harness-only-tools wall)

## Body
```
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-PLAN-CORRECT-R2 (slot:bravo): record 3 shipped units + R12 round-2 corrections (harness-only-tools wall)

SHIPPED ledger += U-CAG-STATS-DISPATCH (0babcb5f2f), U-CROSS-PC-VERIFY-CLI-BOUND
(59c4ca58f6), U-CAG-HITRATE-HEADLINE (d24f48cd16) -- the 3 substituted genuine
units (iter 6/7/8) closing the CAG telemetry chain + the CLI OOM follow-up.

PLAN CORRECTIONS round 2 (R12): #6 cron-registry-autoreconcile + round-2
agentworkflow-control-actions + atcs-queue-push were falsified/redundant. Root
cause recorded as fleet doctrine: harness-only tools (CronCreate/CronList/Workflow/
Agent) CANNOT be driven from a hook (.mjs) or dispatcher (.ts) -- they are
model-only. Many "agentic" units silently assumed a Node-side surface could drive
them. The genuinely-buildable shape is pure-file/compute hooks + engine-wrapping
dispatcher actions -- which the 3 substituted units are. Round-3/4 premises still
need live re-verification (R8) + must respect the cross-boundary wall.
```

## Files touched (2)
- state/shared/specs/AGENTIC-SUBSTRATE-BRIDGE-PLAN-2026-06-14.md | 10 ++++++++++
- 1 file changed, 10 insertions(+)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9a8400faa3c4`
- Milestone envelope: `mcp-server/data/milestones/AGENTIC-SUBSTRATE-BRIDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._