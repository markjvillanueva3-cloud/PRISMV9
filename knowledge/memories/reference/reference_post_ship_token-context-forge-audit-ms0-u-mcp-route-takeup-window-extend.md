---
name: reference_post_ship_token-context-forge-audit-ms0-u-mcp-route-takeup-window-extend
description: Auto-distilled learnings from shipping TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND (commit 1e7327522). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.802Z
aliases: reference_post_ship_token-context-forge-audit-ms0-u-mcp-route-takeup-window-extend
---


# TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND (slot:alpha /goal iter2): widen takeup window 60s -> 600s (10min). Audit dashboard showed 5/2255 = 0.2% take-rate vs 30% target. Root cause: 60s window cut off legitimate take-ups happening mid-thinking. 10min covers realistic Pre->Post latency. Env-tunable via PRISM_MCP_ROUTE_TAKEUP_WINDOW_MS. Exported _WINDOW_MS so audit script can surface the actual window. PSN leg #11 (PRISM AI router) telemetry repaired.

**Shipped:** 2026-05-26T13:00:48-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[token-context-forge-audit-ms0-u-mcp-route-takeup-window-extend]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._