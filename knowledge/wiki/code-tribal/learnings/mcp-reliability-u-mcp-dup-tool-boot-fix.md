# MCP-RELIABILITY/U-MCP-DUP-TOOL-BOOT-FIX — [MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-DUP-TOOL-BOOT-FIX (slot:bravo): fix fleet-wide MCP :3100 boot crash from duplicate tool registrations (SDK 1.27.1->1.29.0 caret drift)

**Commit:** `5010a01a8294` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T03:33:05-05:00
**Tags:** mcp-reliability, u-mcp-dup-tool-boot-fix, auto-distilled

## Subject
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-DUP-TOOL-BOOT-FIX (slot:bravo): fix fleet-wide MCP :3100 boot crash from duplicate tool registrations (SDK 1.27.1->1.29.0 caret drift)

## Body
```
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-DUP-TOOL-BOOT-FIX (slot:bravo): fix fleet-wide MCP :3100 boot crash from duplicate tool registrations (SDK 1.27.1->1.29.0 caret drift)

@modelcontextprotocol/sdk drifted ^1.27.1 -> 1.29.0 via the unpinned caret; 1.29.0's
McpServer.tool() HARD-THROWS "Tool <name> is already registered" where the prior
installed version silently last-wins. Two long-standing dispatcher collisions (harmless
for 3+ weeks of boots) turned into a fleet-wide boot crash:
- prism_ai: unwired the aiDispatcher STUB call+import (canonical 12-action aiReasoningDispatcher kept; stub was already overwritten at runtime).
- prism_auth: claudeAccountDispatcher mis-named its tool "prism_auth" (collided with SECURITY-CRITICAL authDispatcher); renamed -> prism_claude_account, RESTORES 4 dead Claude-account-pool actions (no external callers).
Plus: R12 un-swallowed the boot catch (was logging Error as {}); added a last-wins
dedup safety-net + loud [MCP-DEDUP] warning at the proxiedTool chokepoint.
Verified live: daemon restart healthy ~2s, /health=healthy, 0 dedup warnings, both
prism_auth + prism_claude_account registered. build:fast clean.
Pre-existing SDK-API tsc errors (index.ts ~816-818/1175) left for papa/server-core.
Committed [MAIN-FORCE] (not slot/bravo): fleet-critical infra hotfix already live in the shared tree; matches golf's [MCP-RELIABILITY] [MAIN] precedent.
```

## Files touched (3)
- mcp-server/src/index.ts                                     |  45 +++++++++++++++++++++++++++++++++++++++++++--
- mcp-server/src/tools/dispatchers/claudeAccountDispatcher.ts | 106 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 149 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5010a01a8294`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._