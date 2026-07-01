# MCP-CONCURRENCY-FIX/U-MCP-FACTORY-REFACTOR — [MAIN] [MCP-CONCURRENCY-FIX]/U-MCP-FACTORY-REFACTOR (slot:golf): fresh McpServer per /mcp request

**Commit:** `1297b0a8f5bf` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T19:12:37-05:00
**Tags:** mcp-concurrency-fix, u-mcp-factory-refactor, auto-distilled

## Subject
[MAIN] [MCP-CONCURRENCY-FIX]/U-MCP-FACTORY-REFACTOR (slot:golf): fresh McpServer per /mcp request

## Body
```
[MAIN] [MCP-CONCURRENCY-FIX]/U-MCP-FACTORY-REFACTOR (slot:golf): fresh McpServer per /mcp request

ROOT CAUSE (confirmed from live supervisor.log): the /mcp POST handler called
server.connect(transport) on the MODULE-LEVEL shared McpServer per request. The MCP
SDK enforces ONE transport per Server (sdk/shared/protocol.js:217); two overlapping
requests (constant with multiple active chats) => the 2nd connect() throws 'Already
connected to a transport' BEFORE handleRequest => client gets NO response => timeout =>
'MCP DISCONNECTED'. Not a memory leak (heap stable ~640MB). The disconnects + watchdog
restarts the operator saw for weeks.

FIX (official SDK stateless pattern): split registerTools() into bootstrapServices()
(heavy global I/O, idempotent, once) + bindDispatchers(server) (side-effect-free per-server
tool registration) + a _postBindDone-guarded once-only tail (synergies/SVI/bridge/startup
event, run only on the shared server). New buildRequestServer() builds a FRESH McpServer per
/mcp request so server.connect() never contends. Shared server still bound for REST + /health
+ bridge. Hoisted 4 engine .init() calls (telemetry/pfp/memoryGraph/certificate) to bootstrap
(were per-bind). bindDispatchers async (SVI/import awaits). §4b httpServer keep-alive tuning.

VALIDATED: tsc --noEmit clean; esbuild clean; isolation :3199 — 115 reqs incl 30 concurrent,
0 'Already connected', warm latency ~30ms, heap stable; LIVE :3100 cutover — 36 concurrent
reqs ok=36 bad=0, single clean listener. Co-authored with rate-limited subagent (did the
bootstrap/bind split + init-hoist); golf completed guard/handler/callsites/§4b/async + cutover.
```

## Files touched (2)
- mcp-server/src/index.ts | 115 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------------
- 1 file changed, 98 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- till bound for REST + /health

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1297b0a8f5bf`
- Milestone envelope: `mcp-server/data/milestones/MCP-CONCURRENCY-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._