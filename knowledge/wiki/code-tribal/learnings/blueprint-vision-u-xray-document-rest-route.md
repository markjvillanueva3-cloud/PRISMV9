# BLUEPRINT-VISION/U-XRAY-DOCUMENT-REST-ROUTE — [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-DOCUMENT-REST-ROUTE (slot:xray): REST surface parity for the document extraction chain

**Commit:** `4f810a918e37` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:58:03-05:00
**Tags:** blueprint-vision, u-xray-document-rest-route, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-DOCUMENT-REST-ROUTE (slot:xray): REST surface parity for the document extraction chain

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-DOCUMENT-REST-ROUTE (slot:xray): REST surface parity for the document extraction chain

routes/document.ts (createDocumentRouter): POST /api/v1/document/extract-{contract,route} -> prism_resource_extraction:document_extract_{contract,route}. The blueprint chain had a REST surface (/api/v1/cad/blueprint-extract-*, routes/cad.ts) the web app binds to; the document chain (office/OCR/documentLearning -> contract -> consumer fan-out) was MCP-only. Faithful clone of the blueprint route pattern ({result} envelope, catch->next(e)); registered in routes/index.ts, base distinct from /doc + /doc-learn + /data (no express prefix-shadow). Test: 4 cases invoking handlers off the express Router stack (supertest is NOT resolvable in mcp-server) -- proves tool+action+body forwarding, {result} envelope, error->next(e), DISTINCT actions. tsc-clean, per-file 2-arm scrutiny both PASS (arm B mutation-tested all 3 failure axes). [MAIN-FORCE]: slot/xray worktree stale.
```

## Files touched (4)
- mcp-server/src/__tests__/document-routes.test.ts | 84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/document.ts                | 49 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/index.ts                   |  6 ++++++
- 3 files changed, 139 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f810a918e37`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._