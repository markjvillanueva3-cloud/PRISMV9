# MCP-OOM-FIX/U-WATCHDOG-MEM-PROBE — [MAIN] [MCP-OOM-FIX]/U-WATCHDOG-MEM-PROBE (slot:kilo iter10): permanent fix — watchdog preemptive restart on RSS pressure (3GB threshold + 30min cooldown). Parses /health JSON for memory.rss_mb. Fires same kill+respawn path as wedge case. Replaces OOM crash with orderly recycle masked by bridge retry. Fixed pre-existing per-chunk-slice body-truncation bug.

**Commit:** `8cbd06cf5a2d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T22:53:32-05:00
**Tags:** mcp-oom-fix, u-watchdog-mem-probe, auto-distilled

## Subject
[MAIN] [MCP-OOM-FIX]/U-WATCHDOG-MEM-PROBE (slot:kilo iter10): permanent fix — watchdog preemptive restart on RSS pressure (3GB threshold + 30min cooldown). Parses /health JSON for memory.rss_mb. Fires same kill+respawn path as wedge case. Replaces OOM crash with orderly recycle masked by bridge retry. Fixed pre-existing per-chunk-slice body-truncation bug.

## Body
```
[MAIN] [MCP-OOM-FIX]/U-WATCHDOG-MEM-PROBE (slot:kilo iter10): permanent fix — watchdog preemptive restart on RSS pressure (3GB threshold + 30min cooldown). Parses /health JSON for memory.rss_mb. Fires same kill+respawn path as wedge case. Replaces OOM crash with orderly recycle masked by bridge retry. Fixed pre-existing per-chunk-slice body-truncation bug.
```

## Files touched (2)
- scripts/mcp-server-watchdog.mjs | 302 ++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 302 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8cbd06cf5a2d`
- Milestone envelope: `mcp-server/data/milestones/MCP-OOM-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._