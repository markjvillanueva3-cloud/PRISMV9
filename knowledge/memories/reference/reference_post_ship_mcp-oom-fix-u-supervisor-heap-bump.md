---
name: reference_post_ship_mcp-oom-fix-u-supervisor-heap-bump
description: Auto-distilled learnings from shipping MCP-OOM-FIX/U-SUPERVISOR-HEAP-BUMP (commit ee8be4fd2). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.934Z
aliases: reference_post_ship_mcp-oom-fix-u-supervisor-heap-bump
---


# MCP-OOM-FIX/U-SUPERVISOR-HEAP-BUMP

[MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096

**Shipped:** 2026-05-23T22:35:00-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[mcp-oom-fix-u-supervisor-heap-bump]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._