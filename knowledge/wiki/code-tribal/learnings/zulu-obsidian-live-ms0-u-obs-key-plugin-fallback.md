# ZULU-OBSIDIAN-LIVE-MS0/U-OBS-KEY-PLUGIN-FALLBACK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-OBSIDIAN-LIVE-MS0]/U-OBS-KEY-PLUGIN-FALLBACK: apiKey() falls back to the Local REST API plugin's own data.json -- env-only resolution silently failed under the SYSTEM-run MCP task (dotenv cwd blind; user-context identical spawn authenticated fine); plugin config IS single source of truth, env wins as operator override; 60s TTL cache, fail-soft no-key; 36/36 tests (9 new); supervisor spawnChild cwd pinned to mcp-server (dotenv for both launch paths); LIVE-VALIDATED live:true authenticated:true through supervised :3100

**Commit:** `8306cc5e1a85` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T08:04:11-05:00
**Tags:** zulu-obsidian-live-ms0, u-obs-key-plugin-fallback, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-OBSIDIAN-LIVE-MS0]/U-OBS-KEY-PLUGIN-FALLBACK: apiKey() falls back to the Local REST API plugin's own data.json -- env-only resolution silently failed under the SYSTEM-run MCP task (dotenv cwd blind; user-context identical spawn authenticated fine); plugin config IS single source of truth, env wins as operator override; 60s TTL cache, fail-soft no-key; 36/36 tests (9 new); supervisor spawnChild cwd pinned to mcp-server (dotenv for both launch paths); LIVE-VALIDATED live:true authenticated:true through supervised :3100

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-OBSIDIAN-LIVE-MS0]/U-OBS-KEY-PLUGIN-FALLBACK: apiKey() falls back to the Local REST API plugin's own data.json -- env-only resolution silently failed under the SYSTEM-run MCP task (dotenv cwd blind; user-context identical spawn authenticated fine); plugin config IS single source of truth, env wins as operator override; 60s TTL cache, fail-soft no-key; 36/36 tests (9 new); supervisor spawnChild cwd pinned to mcp-server (dotenv for both launch paths); LIVE-VALIDATED live:true authenticated:true through supervised :3100
```

## Files touched (4)
- mcp-server/src/__tests__/ObsidianRestBridgeEngine.test.ts | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++--
- mcp-server/src/engines/ObsidianRestBridgeEngine.ts        |  59 ++++++++++++++++++++++++++++++--
- scripts/mcp-server-supervisor.mjs                         |   8 +++++
- 3 files changed, 163 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8306cc5e1a85`
- Milestone envelope: `mcp-server/data/milestones/ZULU-OBSIDIAN-LIVE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._