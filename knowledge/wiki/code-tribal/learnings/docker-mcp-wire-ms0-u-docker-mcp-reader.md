# DOCKER-MCP-WIRE-MS0/U-DOCKER-MCP-READER — [JULIETT] [DOCKER-MCP-WIRE-MS0]/U-DOCKER-MCP-READER: read-only Docker MCP Toolkit reader

**Commit:** `c43a7820ee34` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T12:06:19-05:00
**Tags:** docker-mcp-wire-ms0, u-docker-mcp-reader, auto-distilled

## Subject
[JULIETT] [DOCKER-MCP-WIRE-MS0]/U-DOCKER-MCP-READER: read-only Docker MCP Toolkit reader

## Body
```
[JULIETT] [DOCKER-MCP-WIRE-MS0]/U-DOCKER-MCP-READER: read-only Docker MCP Toolkit reader

New scripts/docker-mcp.mjs — a callable reader giving PRISM structured
visibility into the local Docker MCP Toolkit (v0.40.4): registered MCP
catalogs, MCP client configs, and the servers wired into each client.
Modes: status | version | clients | catalog (+ --json).

Read-only by construction: shells `docker mcp <sub>` via execFile argv-array
(injection-safe) and only ever invokes version / client ls / catalog ls.
Mutating subcommands (connect/disconnect/publish/init) are intentionally
out of scope — config mutation is an operator action.

Exported pure parsers stripAnsi / parseCatalogLs / parseClientLs are the
stable surface the DOCKER-MCP-WIRE-MS0 synergy layers (system-viz, obsidian,
AI router, NN-graph) will consume. Modeled on the sibling scripts/ask-ollama.mjs
(pure parsers + thin impure shell + INVOKED_DIRECTLY guard, fail-loud R12).

Tests: scripts/docker-mcp.test.mjs - 25 node:test cases (fixtures from a live
docker mcp probe; injected execFileImpl, no real docker in the test path;
import oracle; colon-in-detail + CRLF parser-robustness cases). 25/25 pass.
Live smoke test against real docker also passed (status/clients/catalog).

Per-file scrutiny: code-analyzer + reviewer agents both PASS. 2 reviewer-B
P1s (colon-in-detail + CRLF coverage gaps) closed with the 2 added tests.
```

## Files touched (3)
- scripts/docker-mcp.mjs      | 287 ++++++++++++++++++++++++++++++++++++++++++
- scripts/docker-mcp.test.mjs | 295 ++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 582 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c43a7820ee34`
- Milestone envelope: `mcp-server/data/milestones/DOCKER-MCP-WIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._