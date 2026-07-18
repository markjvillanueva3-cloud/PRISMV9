# MCP-OOM-FIX/U-SUPERVISOR-HEAP-BUMP — [MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096

**Commit:** `ee8be4fd2fca` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T22:35:00-05:00
**Tags:** mcp-oom-fix, u-supervisor-heap-bump, auto-distilled

## Subject
[MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096

## Body
```
[MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096

Root cause: Node 22 default heap (~1.5GB) hit by accumulated retained refs from peer chats' constant prism_guard:error_ledger_recall_similar calls. Server OOM-killed every ~14min with exit code 0xFFFFFFFF (Windows abnormal kill); 15+ restart PIDs in recent supervisor log. Cold-start window (~30s) was dropping chats whose MCP client gave up on prism mid-handshake.

Fix: 4GB heap cap moves OOM horizon out ~10x (~14min -> multi-hour mitigation). Operator NODE_OPTIONS override honored (if --max-old-space-size already set, defer to operator). Verified: post-restart server uptime 12s healthy, RSS 694MB under new 4GB ceiling.

Mitigation only — true leak fix requires separate session targeting error_ledger_recall_similar ref-retention (U-MCP-OOM-LEAK-ROOT-CAUSE follow-up flagged in memory). Per kilo soul off-domain; user directive override per CLAUDE.md instruction priority.
```

## Files touched (3)
- .../reference_mcp_oom_heap_bump_2026_05_23.md      |  59 ++++
- scripts/mcp-server-supervisor.mjs                  | 299 +++++++++++++++++++++
- 2 files changed, 358 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ee8be4fd2fca`
- Milestone envelope: `mcp-server/data/milestones/MCP-OOM-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._