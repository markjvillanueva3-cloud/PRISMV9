# HIGH-ROI-TOKEN-SAVINGS/U-WIKI-OFFLOAD-ADVISORY — [MAIN] [HIGH-ROI-TOKEN-SAVINGS]/U-WIKI-OFFLOAD-ADVISORY (slot:golf): PreToolUse:Read hook surfaces /route-to-obsidian for large wiki entries

**Commit:** `6853d3525755` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T12:42:35-05:00
**Tags:** high-roi-token-savings, u-wiki-offload-advisory, auto-distilled

## Subject
[MAIN] [HIGH-ROI-TOKEN-SAVINGS]/U-WIKI-OFFLOAD-ADVISORY (slot:golf): PreToolUse:Read hook surfaces /route-to-obsidian for large wiki entries

## Body
```
[MAIN] [HIGH-ROI-TOKEN-SAVINGS]/U-WIKI-OFFLOAD-ADVISORY (slot:golf): PreToolUse:Read hook surfaces /route-to-obsidian for large wiki entries

closes audit-finding F1 (HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17): ollama
offload ratio 13.8% target 30%. Hook fires on Read of any
knowledge/wiki/**/*.md >=500 lines; injects an advisory pointing at
/route-to-obsidian (already-shipped skill, gitignored local-only). Bumps
ollama-offload-stats.json byHook.wiki-read-offload-advisory.suggested so
high-roi-skill-rank.mjs can measure lift. Pure exports + impure shell;
4 knobs (DISABLE, MIN_LINES, VERBOSE); 20/20 node:test pass; tier T3.
```

## Files touched (2)
- .claude/hooks/wiki-read-offload-advisory.mjs | 196 +++++++++++++++++++++++++++
- 1 file changed, 196 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6853d3525755`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._