---
name: reference_xray_document_rest_route_2026_06_24
description: "document extraction REST surface (routes/document.ts: POST /api/v1/document/extract-{contract,route}) mirroring the blueprint /api/v1/cad/blueprint-extract-* -- document chain was MCP-only; closes the REST surface-parity gap. Also: supertest is unavailable in mcp-server, test express routes off router.stack instead"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_document_rest_route_2026_06_24
---


**Document extraction REST surface (2026-06-24, slot xray, U-XRAY-DOCUMENT-REST-ROUTE).**

NEVER-IDLE / operator "build" unit after [[reference_xray_doclearn_normalizer_2026_06_24]]. The BLUEPRINT extraction chain has a REST surface (`/api/v1/cad/blueprint-extract-{contract,route}`, routes/cad.ts) the web app binds to; the DOCUMENT chain (office/OCR/documentLearning -> contract -> consumer fan-out) was reachable ONLY via the MCP dispatcher (prism_resource_extraction). Closed that surface-parity gap.

`mcp-server/src/routes/document.ts` (`createDocumentRouter`): 2 thin pass-through POST endpoints -- `/api/v1/document/extract-contract` -> prism_resource_extraction:document_extract_contract; `/api/v1/document/extract-route` -> prism_resource_extraction:document_extract_route. Faithful clone of the blueprint extract routes (same {result} envelope, catch->next(e), JSDoc). Registered in routes/index.ts (import + `app.use("/api/v1/document", ...)`); base distinct from /doc + /doc-learn + /data (no express prefix-shadow -- segment-boundary matching).

**Validation:** 4 tests; tsc-clean; per-file 2-arm scrutiny BOTH PASS (arm B mutation-tested all 3 failure axes -- wrong-action, swallowed-error, missing-{result}-envelope all fail correctly; express 5.2.1 stack-introspection confirmed stable). Pre-existing P2 (NOT this diff): index.ts hardcodes `routes: 35` / "49 route modules" log counts -- already drifted from ~80 actual mounts, left alone.

**LESSON (reusable):** `supertest` is NOT resolvable in mcp-server -- the existing `cadRegressionRoute.test.ts` that imports it is effectively broken (`Cannot find package 'supertest'`). To test an express route without an HTTP harness: invoke the handler directly off the Router layer stack -- `router.stack.find(l => l.route?.path === path && l.route.methods?.post)`, then `layer.route.stack[last].handle(req, res, next)` with mock `{body}` req + a res capturing `.json()`/`.status()` + a `next` capturing the error. Dependency-free, deterministic, and proves the forwarding contract (tool+action+body, {result} envelope, error->next(e)).
