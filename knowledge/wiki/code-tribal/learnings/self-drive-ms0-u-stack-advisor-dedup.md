# SELF-DRIVE-MS0/U-STACK-ADVISOR-DEDUP — [MAIN-FORCE] [SELF-DRIVE-MS0]/U-STACK-ADVISOR-DEDUP (slot:alpha): skip /goal advisor append when prompt also triggers /loop (arm C P2.1)

**Commit:** `6f117a436f23` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T11:59:58-05:00
**Tags:** self-drive-ms0, u-stack-advisor-dedup, auto-distilled

## Subject
[MAIN-FORCE] [SELF-DRIVE-MS0]/U-STACK-ADVISOR-DEDUP (slot:alpha): skip /goal advisor append when prompt also triggers /loop (arm C P2.1)

## Body
```
[MAIN-FORCE] [SELF-DRIVE-MS0]/U-STACK-ADVISOR-DEDUP (slot:alpha): skip /goal advisor append when prompt also triggers /loop (arm C P2.1)

A combined "/loop 10m /goal build x" turn fires BOTH hooks -> two OPTIMAL STACK USE blocks (~4KB). The /loop hook already injects the rotating advisor that turn, so goal-prereq-inject now guards its append with !/(^|\s)\/loop(\s|$)/.test(prompt). Bare /goal still injects (verified 1); combined -> goal-side 0, loop-side 1 (no double). Efficiency is the feature's own goal.
```

## Files touched (2)
- .claude/hooks/goal-prereq-inject.mjs | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till injects (verified 1); combined -> goal-side 0, loop-side 1 (no double). Efficiency is the feature's own goal.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6f117a436f23`
- Milestone envelope: `mcp-server/data/milestones/SELF-DRIVE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._