---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Verify the wiring of a NEW dispatcher action `blueprint_extract_contract` added "
date: "2026-06-24"
first_ts: "2026-06-24T01:42:27.734Z"
last_ts: "2026-06-24T01:43:12.750Z"
cwd: "H:\\prism\\mcp-server"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-ae2106cbfdb779d46.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Verify the wiring of a NEW dispatcher action `blueprint_extract_contract` added 

> **claude-code-cli** | 2026-06-24 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-ae2106cbfdb779d46.jsonl`

## Transcript

### User | 2026-06-24T01:42:27.734Z

Verify the wiring of a NEW dispatcher action `blueprint_extract_contract` added this session to prism_cad. Read these and report P0/P1/P2 with file:line, then grade PASS/FAIL:

1. ACTION ENUM: H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts around line 278-281 -- confirm `"blueprint_extract_contract"` is in the ACTIONS z.enum array (so the MCP tool accepts it).
2. CASE BODY: same file, the `case "blueprint_extract_contract":` block (search for it, ~line 3516, right after the `blueprint_redact` case). Verify: (a) lazy import `await import("../../schemas/BlueprintExtractionContract.js")` -- confirm that path resolves from src/tools/dispatchers/ to src/schemas/BlueprintExtractionContract.ts (it does: ../.. = src); (b) the exactly-one-of-producer guard `hasFused === hasDrawing -> dispatcherError` is correct (rejects both neither AND both); (c) it calls normalizeFusedToContract OR normalizeDrawingExtractToContract then validateBlueprintExtractionContract; (d) the return shape `{success:true, data:{contract, producer, valid, errors}}` matches the dispatcher convention (compare to the sibling blueprint_redact case which returns {success:true, data}); (e) it follows the same dispatcherError(action,"prism_cad") error pattern as blueprint_redact.
3. ACTION-NAME UNIQUENESS: grep all of mcp-server/src/tools/dispatchers/*.ts for `"blueprint_extract_contract"` -- confirm it is NOT declared in any OTHER dispatcher (action names must be globally unique across dispatchers).
4. ANTI-REGRESSION: confirm this ADDS an action (count increases), does not remove/rename any existing action.
5. ROUTE: H:\prism\mcp-server\src\routes\cad.ts -- confirm the new POST /blueprint-extract-contract route calls callTool("prism_cad","blueprint_extract_contract", req.body) matching the blueprint-redact route precedent.
6. The exported normalizers exist: mcp-server/src/schemas/BlueprintExtractionContract.ts exports normalizeFusedToContract, normalizeDrawingExtractToContract, validateBlueprintE
... [+62 chars truncated]

### Assistant | 2026-06-24T01:42:32.821Z

I'll read all the relevant files in parallel to verify the wiring of `blueprint_extract_contract`.

### Assistant | 2026-06-24T01:42:33.614Z

[tool_use: Read]

### Assistant | 2026-06-24T01:42:34.397Z

[tool_use: Grep]

### Assistant | 2026-06-24T01:42:34.807Z

[tool_use: Read]

### User | 2026-06-24T01:42:34.949Z

[tool_result] 270	  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6 — BlueprintCorpusHarvestEngine
271	  "corpus_harvest_mit", "corpus_harvest_vendor", "corpus_harvest_online",
272	  "corpus_enumerate", "corpus_verify_fresh", "corpus_build_index",
273	  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7 — BlueprintExtractionRAGEngine (centerpiece)
274	  "blueprint_rag_extract", "blueprint_rag_explain", "blueprint_rag_compare_to_bas
... [+1149 chars truncated]

### Assistant | 2026-06-24T01:42:35.055Z

[tool_use: Read]

### User | 2026-06-24T01:42:35.960Z

[tool_result] 1	/**
2	 * PRISM MCP Server — CAD Routes
3	 * Geometry import, feature recognition, stock model, WCS setup
4	 */
5	import { Router } from "express";
6	import { requireFields } from "../middleware/validation.js";
7	import type { CallToolFn } from "./index.js";
8	
9	/** Creates cad router.
10	 * @param callTool - call tool
11	 * @returns router
12	 */
13	export function createCadRouter(callTool: Cal
... [+2785 chars truncated]

### User | 2026-06-24T01:42:36.160Z

[tool_result] 1	/**
2	 * BlueprintExtractionContract -- the VERSIONED, app-facing shape of a blueprint OCR extraction.
3	 *
4	 * WHY (the app-integration keystone, blueprint-vision-app-integration-plan-2026-06-23): the
5	 * blueprint-vision backend is mature (VLM-ensemble OCR -> fused dims/gd&t/notes), but the app stops
6	 * at "file uploaded" and every consumer (the upload->extract route, the quote autopopulat
... [+20051 chars truncated]

### User | 2026-06-24T01:42:36.316Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts-278-  // U-APP-REDACT-WIRE -- app-facing customer-identity redaction (shared blueprintRedaction lib)
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts-279-  "blueprint_redact",
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts-280-  // U-XRAY-EXTRACT-CONTRACT-WIRE -- normalize a producer extraction -> versioned BlueprintE
... [+2175 chars truncated]

### Assistant | 2026-06-24T01:42:43.265Z

Now I need to read the case body in the dispatcher and check for action-name uniqueness across all other dispatcher files.

### Assistant | 2026-06-24T01:42:44.806Z

[tool_use: Read]

### Assistant | 2026-06-24T01:42:45.535Z

[tool_use: Grep]

### User | 2026-06-24T01:42:46.468Z

[tool_result] 3490	            // U-APP-REDACT-WIRE -- make the tested blueprintRedaction lib reachable as an app surface.
3491	            // Pure + in-process (no I/O): redacts customer identity from a structured extraction (the SAFE
3492	            // field-mask path), free text (distinctive-tier scrub), and/or returns image mask regions from
3493	            // the region-classifier output. Privacy-critica
... [+4439 chars truncated]

### User | 2026-06-24T01:42:47.361Z

[tool_result] Found 1 file
src\tools\dispatchers\cadDispatcher.ts

### Assistant | 2026-06-24T01:43:12.750Z

All the data I need is now in hand. Here is the full wiring review.

---

## Dispatcher Wiring Review: `blueprint_extract_contract` on `prism_cad`

---

### Check 1 — ACTION ENUM

`H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts:281`

```
"blueprint_extract_contract",
```

The action name is present in the z.enum array, immediately after `"blueprint_redact"`, annotated with the correct milestone comment `// U-XRAY-EXTRACT-CONTRACT-WIRE`.

Result: PASS

---

### Check 2 — CASE BODY

`cadDispatcher.ts:3518-3548`

**(a) Lazy import path**

`cadDispatcher.ts:3533`:
```typescript
const contractMod = await import("../../schemas/BlueprintExtractionContract.js");
```
From `src/tools/dispatchers/`, `../..` resolves to `src/`, so the resolved path is `src/schemas/BlueprintExtractionContract.ts`. That file exists and exports the required symbols. The import is lazy (inside the case body, not top-level). PASS.

**(b) Exactly-one-of guard**

`cadDispatcher.ts:3525-3531`:
```typescript
const hasFused = params.fused != null && typeof params.fused === "object";
const hasDrawing = params.drawing != null && typeof params.drawing === "object";
if (hasFused === hasDrawing) {
  return dispatcherError(...)
```
When `hasFused === hasDrawing`, both are either `true` (caller supplied both) or `false` (caller supplied neither). The guard correctly rejects both cases. PASS.

**(c) Normalizer + validator calls**

`cadDispatcher.ts:3540-3543`:
```typescript
const contract = hasFused
  ? contractMod.normalizeFusedToContract(params.fused, cOpts)
  : contractMod.normalizeDrawingExtractToContract(params.drawing, cOpts);
const validation = contractMod.validateBlueprintExtractionContract(contract);
```
Both paths call the correct exported function; validation follows immediately. PASS.

**(d) Return shape**

`cadDispatcher.ts:3544-3547`:
```typescript
result = {
  success: true,
  data: { contract, producer: hasFused ? "fused" : "drawing", valid: validation.ok, errors: validation.errors ??
... [+2762 chars truncated]
