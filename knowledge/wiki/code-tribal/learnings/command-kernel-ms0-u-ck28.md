# COMMAND-KERNEL-MS0/U-CK28 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK28 (slot:mike): close command-utilization → auto skill-tier loop

**Commit:** `2389e3365b1a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T12:41:35-05:00
**Tags:** command-kernel-ms0, u-ck28, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK28 (slot:mike): close command-utilization → auto skill-tier loop

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK28 (slot:mike): close command-utilization → auto skill-tier loop

SkillTierRegistryEngine extended from read-only classify to persist-tier-back + snapshot/restore + usage-driven reclassification. classifyAllAndPersist writes assigned tier back to each SkillRecord.explicitTier; when useInvocationCount=true, skills ranked by invocationCount desc (top-N → essential / next-M → intermediate / rest → advanced). Pre-classify snapshot captured in result for rollback per envelope exit condition.

- 16 vitest cases PASS (snapshot/restore + classifyAllAndPersist + usage-driven)
- Snapshot returned in-memory (caller-owned JSON-serializable) — descoped on-disk variant as redundant, restore(snap) round-trip preserves rollback capability
- envelope status flipped to completed with ship_record + scope_deviations honestly documented
```

## Files touched (4)
- .claude/hooks/memory-index-precheck-inject.mjs |  90 ++++++++
- scripts/lib/memory-index-search-lib.mjs        | 203 ++++++++++++++++
- scripts/lib/memory-index-search-lib.test.mjs   | 308 +++++++++++++++++++++++++
- 3 files changed, 601 insertions(+)

## Lessons surfaced in commit body
- tilization → auto skill-tier loop

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2389e3365b1a`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._