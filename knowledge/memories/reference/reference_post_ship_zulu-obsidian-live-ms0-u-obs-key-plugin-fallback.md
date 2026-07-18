---
name: reference_post_ship_zulu-obsidian-live-ms0-u-obs-key-plugin-fallback
description: Auto-distilled learnings from shipping ZULU-OBSIDIAN-LIVE-MS0/U-OBS-KEY-PLUGIN-FALLBACK (commit 8306cc5e1). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.119Z
aliases: reference_post_ship_zulu-obsidian-live-ms0-u-obs-key-plugin-fallback
---


# ZULU-OBSIDIAN-LIVE-MS0/U-OBS-KEY-PLUGIN-FALLBACK

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-OBSIDIAN-LIVE-MS0]/U-OBS-KEY-PLUGIN-FALLBACK: apiKey() falls back to the Local REST API plugin's own data.json -- env-only resolution silently failed under the SYSTEM-run MCP task (dotenv cwd blind; user-context identical spawn authenticated fine); plugin config IS single source of truth, env wins as operator override; 60s TTL cache, fail-soft no-key; 36/36 tests (9 new); supervisor spawnChild cwd pinned to mcp-server (dotenv for both launch paths); LIVE-VALIDATED live:true authenticated:true through supervised :3100

**Shipped:** 2026-06-10T08:04:11-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[zulu-obsidian-live-ms0-u-obs-key-plugin-fallback]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._