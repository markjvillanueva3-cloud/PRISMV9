---
name: reference_post_ship_mcp-oom-fix-u-watchdog-mem-probe
description: Auto-distilled learnings from shipping MCP-OOM-FIX/U-WATCHDOG-MEM-PROBE (commit 8cbd06cf5). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.934Z
aliases: reference_post_ship_mcp-oom-fix-u-watchdog-mem-probe
---


# MCP-OOM-FIX/U-WATCHDOG-MEM-PROBE

[MAIN] [MCP-OOM-FIX]/U-WATCHDOG-MEM-PROBE (slot:kilo iter10): permanent fix — watchdog preemptive restart on RSS pressure (3GB threshold + 30min cooldown). Parses /health JSON for memory.rss_mb. Fires same kill+respawn path as wedge case. Replaces OOM crash with orderly recycle masked by bridge retry. Fixed pre-existing per-chunk-slice body-truncation bug.

**Shipped:** 2026-05-23T22:53:32-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[mcp-oom-fix-u-watchdog-mem-probe]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._