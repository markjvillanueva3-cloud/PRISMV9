# DOCKER-MCP-WIRE-MS0/U-CATALOG-AUDIT — [JULIETT] [DOCKER-MCP-WIRE-MS0]/U-CATALOG-AUDIT: R8 audit of 315-server Docker MCP Catalog vs PRISM

**Commit:** `8ca0b959e8b0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T10:37:18-05:00
**Tags:** docker-mcp-wire-ms0, u-catalog-audit, auto-distilled

## Subject
[JULIETT] [DOCKER-MCP-WIRE-MS0]/U-CATALOG-AUDIT: R8 audit of 315-server Docker MCP Catalog vs PRISM

## Body
```
[JULIETT] [DOCKER-MCP-WIRE-MS0]/U-CATALOG-AUDIT: R8 audit of 315-server Docker MCP Catalog vs PRISM

Headline: ZERO upstream CAM/CAD specialists (no mastercam/hypermill/fusion/
solidworks/inventor/esprit/hsm/autodesk/siemens-nx/catia). The 6 CAM bridges
queued in STAGE 8 PRISM-APP-QUEUE are net-new, NOT duplicating upstream.
R8 dedup-preflight PASS for that milestone.

7 wire-up candidates ordered XS->S under [DOCKER-MCP-WIRE-MS0]: git+
github-official, time, fetch, markitdown+markdownify, arxiv, playwright,
semgrep. DO NOT WIRE prometheus/filesystem/memory/obsidian — PRISM's
domain-specific semantics (file-claim, peer-claim, multi-namespace memory,
vault ownership) cannot be replicated upstream.

Per-file scrutiny: 2 reviewer agents FAIL on first pass, all P0/P1 fixed:
- arm A: invented PRISM dispatcher action names replaced with grepped reality
  (memoryDispatcher: remember/semantic_search/qdrant_*; sessionDispatcher:
  cross_session_*; guardDispatcher: prism_file_read). github-official + fetch
  presence verified in catalog cache (lines 880, 804).
- arm B: 'docker mcp client export' doesn't exist in v0.40.4 -> .mcp.json
  file-copy backup + rollback on failure + :3100/mcp curl pre-flight. Git
  swap scoped to NEW-CALLERS-ONLY (existing hooks parse text outputs by line).
  Secret-vault §5.5 added. Time-utility reframed as 'centralize' (10+
  scripts/lib helpers exist). Unit IDs conform [DOCKER-MCP-WIRE-MS0]/U-WIRE-*.
  Toolkit v0.40.4 + catalog 14-day TTL pinned. claude-code:disconnected
  caveat surfaced.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .../specs/DOCKER-MCP-CATALOG-AUDIT-2026-05-19.md   | 144 +++++++++++++++++++++
- 1 file changed, 144 insertions(+)

## Lessons surfaced in commit body
- tility reframed as 'centralize' (10+

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8ca0b959e8b0`
- Milestone envelope: `mcp-server/data/milestones/DOCKER-MCP-WIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._