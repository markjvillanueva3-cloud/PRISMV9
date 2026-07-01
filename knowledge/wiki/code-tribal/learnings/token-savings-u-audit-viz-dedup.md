# TOKEN-SAVINGS/U-AUDIT-VIZ-DEDUP — [MAIN-FORCE] [TOKEN-SAVINGS]/U-AUDIT-VIZ-DEDUP (slot:alpha): audit-viz-first-inject adopts the shared injection-dedup lib (input-keyed on intent::noun, so a dedup-hit skips BOTH the system-viz-query subprocess AND the re-injection); fires near-identically on most prompts fleet-wide

**Commit:** `8d344941fef4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T10:38:05-05:00
**Tags:** token-savings, u-audit-viz-dedup, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-AUDIT-VIZ-DEDUP (slot:alpha): audit-viz-first-inject adopts the shared injection-dedup lib (input-keyed on intent::noun, so a dedup-hit skips BOTH the system-viz-query subprocess AND the re-injection); fires near-identically on most prompts fleet-wide

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-AUDIT-VIZ-DEDUP (slot:alpha): audit-viz-first-inject adopts the shared injection-dedup lib (input-keyed on intent::noun, so a dedup-hit skips BOTH the system-viz-query subprocess AND the re-injection); fires near-identically on most prompts fleet-wide
```

## Files touched (3)
- .claude/hooks/__tests__/audit-viz-first-dedup.test.mjs | 98 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/audit-viz-first-inject.mjs               | 71 ++++++++++++++++++++++++++++++++++++------
- 2 files changed, 160 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8d344941fef4`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._