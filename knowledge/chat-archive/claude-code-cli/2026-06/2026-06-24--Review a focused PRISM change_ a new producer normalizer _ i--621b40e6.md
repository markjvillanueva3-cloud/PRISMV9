---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Review a focused PRISM change: a new producer normalizer + its dispatcher wiring"
date: "2026-06-24"
first_ts: "2026-06-24T19:36:38.864Z"
last_ts: "2026-06-24T19:38:27.139Z"
cwd: "H:\\prism\\mcp-server"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a4bb95bba0b556024.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review a focused PRISM change: a new producer normalizer + its dispatcher wiring

> **claude-code-cli** | 2026-06-24 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a4bb95bba0b556024.jsonl`

## Transcript

### User | 2026-06-24T19:36:38.864Z

Review a focused PRISM change: a new producer normalizer + its dispatcher wiring. Grade PASS or FAIL with P0/P1/P2 + file:line. Read the changed regions end-to-end.

CHANGE 1 -- new normalizer in H:/prism/mcp-server/src/schemas/DocumentExtractionContract.ts:
`normalizeDocLearningToContract(ingestion, opts)` -- maps a documentLearning `ContentIngestionPipelineEngine.IngestionResult` (`.items[]` of `{title, body, category, confidence}`, defined at H:/prism/mcp-server/src/engines/ContentIngestionPipelineEngine.ts:39-60) into the versioned DocumentExtractionContract. Each item -> a procedure/note DocEntry carrying the item's OWN confidence; value = "title: body"; blank/dup dropped; uses the shared finalizeDocContract + clamp01 helpers + DOC_PER_FIELD_CONFIRM_FLOOR/OFFICE_REGEX_DEFAULT_CONFIDENCE constants. A DOCLEARN_PROCEDURE_HINT regex classifies procedure vs note.

CHANGE 2 -- dispatcher wire in H:/prism/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts, the `document_extract_contract` case (~line 256-277): added `?? params.ingestion` to the `ex` resolution, a `doclearn` branch to the producer selector, and `mod.normalizeDocLearningToContract` to the contract selection.

VERIFY (weighted to correctness / silent breakage):
1. The normalizer is TOTAL (never throws) on garbage: null, {items:"nope"}, {}, [{not:"item"}]. Confirm the guards handle each. Confirm it does NOT re-implement extraction (it maps already-structured items -- not a raw-text parser).
2. Confidence semantics: documentLearning items have a REAL per-item confidence, so the normalizer must carry `it.confidence` (NOT a flat regex default like the office normalizer). Confirm `needs_confirm = conf < floor` and that a missing/NaN confidence falls back to OFFICE_REGEX_DEFAULT_CONFIDENCE (0.6 -> below the 0.70 floor -> needs_confirm). Verify `clamp01` is applied.
3. The DOCLEARN_PROCEDURE_HINT classification: both "procedure" and "note" route ONLY to tribal_capture (kinds ["procedure","note"] in
... [+704 chars truncated]

### Assistant | 2026-06-24T19:36:42.910Z

I'll analyze this PRISM change focusing on silent breakage and correctness. Let me start by reading the changed regions end-to-end.

### Assistant | 2026-06-24T19:36:43.385Z

[tool_use: Read]

### Assistant | 2026-06-24T19:36:43.744Z

[tool_use: Read]

### User | 2026-06-24T19:36:44.289Z

[tool_result] 1	/**
2	 * DocumentExtractionContract -- the VERSIONED, app-facing shape of a NON-blueprint document extraction
3	 * (office docs / catalogs / manuals / setup sheets / spec docs / image OCR).
4	 *
5	 * WHY (blueprint-extraction-consumer-application-map-2026-06-24, section 3): the blueprint path is wired
6	 * (BlueprintExtractionContract + blueprintExtractionRouter -> 13 feature consumers), but the
... [+16261 chars truncated]

### User | 2026-06-24T19:36:44.808Z

[tool_result] 1	/**
2	 * ContentIngestionPipelineEngine — Unified Knowledge Ingestion Pipeline
3	 *
4	 * Single entry point for all knowledge ingestion:
5	 * - Text tips → auto-tag → dedup → TribalKnowledgeEngine
6	 * - Videos → VideoLearningEngine → knowledge items → TribalKnowledgeEngine
7	 * - Documents → DocumentLearning pipeline → knowledge items → TribalKnowledgeEngine
8	 * - URLs → fetch + detect type → 
... [+2471 chars truncated]

### Assistant | 2026-06-24T19:36:51.736Z

I've read the normalizer end-to-end. Now let me read the dispatcher wire and the router to verify routing and integration coupling.

### Assistant | 2026-06-24T19:36:52.749Z

[tool_use: Read]

### Assistant | 2026-06-24T19:36:53.081Z

[tool_use: Glob]

### User | 2026-06-24T19:36:53.784Z

[tool_result] 220	            const filePath = params.path || params.filePath || params.file_path;
221	            if (!filePath) {
222	              return { error: "path is required for office_process" };
223	            }
224	            // extractDocument(path, { sections, tables, metadata }) -- the engine derives text from
225	            // section content, so wrap a raw text param as a paragraph section 
... [+6846 chars truncated]

### User | 2026-06-24T19:36:55.121Z

[tool_result] src\engines\blueprint-vision\documentExtractionRouter.ts

### Assistant | 2026-06-24T19:37:00.769Z

Now let me read the router to verify the kinds vocabulary and confirm "procedure"/"note" route only to tribal_capture, plus check the producer-selector edge case where `params.ingestion` is the resolution source.

### Assistant | 2026-06-24T19:37:01.309Z

[tool_use: Read]

### User | 2026-06-24T19:37:01.752Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\blueprint-vision\documentExtractionRouter.ts' was already read 14m ago in this session and is unchanged (mtime 1782328783690). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### Assistant | 2026-06-24T19:37:06.214Z

The guard says it's in context, but I don't actually have it. Let me grep the specific kinds/routing logic I need to verify.

### Assistant | 2026-06-24T19:37:07.551Z

[tool_use: Grep]

### User | 2026-06-24T19:37:08.711Z

[tool_result] 4: * WHY (blueprint-extraction-consumer-application-map-2026-06-24, section 3): the DOCUMENT-reading path
5: * dead-ends -- office/OCR extraction of speeds/feeds/tool-codes/materials/procedures reaches the engines
6: * but never reaches a consumer. `DocumentExtractionContract` (the keystone) gave it a stable shape; THIS
8: * consumer each extracted entry can drive, with per-consumer payloads and -
... [+2240 chars truncated]

### Assistant | 2026-06-24T19:37:13.264Z

The router confirms the routing table. The "procedure" and "note" kinds both route ONLY to the `tribal_capture` consumer (kinds: ["procedure", "note"], line 169). Let me verify the producer-selector edge case more carefully — specifically what happens when `ex` resolves to `params.ingestion` but `producer` selection logic. Let me also check the `entriesOfKind` matching and verify no other consumer table entry could be hit by "procedure"/"note".

### Assistant | 2026-06-24T19:37:14.253Z

[tool_use: Read]

### User | 2026-06-24T19:37:15.122Z

[tool_result] 110	}
111	
112	const DOC_CONSUMERS: readonly DocConsumerSpec[] = Object.freeze([
113	  // ADVISORY: look the extracted tool codes up against tool-crib inventory (read-only)
114	  {
115	    consumer: "tool_crib_lookup",
116	    dispatcher: "prism_calc",
117	    action: "tool_crib_inventory",
118	    kind: "advisory",
119	    kinds: ["tool_code"],
120	    build: (m) => ({
121	      reason: m.length 
... [+3068 chars truncated]

### Assistant | 2026-06-24T19:37:20.548Z

I now have the full routing picture. Let me verify the producer-selector logic carefully for one subtle edge case, and confirm the `entriesOfKind` helper and the dedup `seen` Set scope. Let me also check what `entriesOfKind` matching does (line 83) and whether the `value`-based dedup across kinds in doclearn could cause issues. Let me read the router head (lines 40-110) and verify the test file exists.

### Assistant | 2026-06-24T19:37:22.409Z

[tool_use: Read]

### Assistant | 2026-06-24T19:37:23.588Z

[tool_use: Grep]

### User | 2026-06-24T19:37:24.078Z

[tool_result] 40	// TYPES
41	// ============================================================================
42	
43	export interface DocConsumerRoute {
44	  consumer: string;
45	  dispatcher: string;
46	  action: string;
47	  kind: DocConsumerKind;
48	  eligible: boolean;
49	  reason: string;
50	  requires_confirmation: boolean;
51	  blocking_fields: number;
52	  payload: Record<string, unknown>;
53	}
54	
55	ex
... [+2505 chars truncated]

### User | 2026-06-24T19:37:25.081Z

[tool_result] src\schemas\DocumentExtractionContract.ts:265:export function normalizeDocLearningToContract(ingestion: unknown, opts: NormalizeOpts = {}): DocumentExtractionContract {
src\tools\dispatchers\resourceExtractionDispatcher.ts:271:            // producer selects the normalizer: "ocr" (ImageOCRPipelineEngine), "doclearn"
src\tools\dispatchers\resourceExtractionDispatcher.ts:274:              : params.p
... [+2276 chars truncated]

### Assistant | 2026-06-24T19:37:29.052Z

The normalizer is wired and has a dedicated test file. Let me read the test files to confirm coverage of the garbage paths and the dispatcher round-trip, then verify the dispatcher's action enum includes `document_extract_contract`.

### Assistant | 2026-06-24T19:37:29.529Z

[tool_use: Read]

### Assistant | 2026-06-24T19:37:30.404Z

[tool_use: Read]

### User | 2026-06-24T19:37:30.661Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\DocumentExtractionContract.doclearn.test.ts' was already read 34s ago in this session and is unchanged (mtime 1782329701101). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### User | 2026-06-24T19:37:33.194Z

[tool_result] 90	    const plan = res.plan;
91	    expect(plan.schemaVersion).toBeTruthy();
92	    expect(plan.summary.n_eligible).toBe(4); // tool_crib_lookup+tool_catalog_lookup (tool_code) + speed_feed+material_price_lookup (material)
93	    expect(plan.summary.n_ineligible).toBe(1); // tribal_capture (no procedure/note in regex office output)
94	    const tc = plan.routes.find((r: any) => r.consumer === "to
... [+1774 chars truncated]

### Assistant | 2026-06-24T19:37:37.192Z

I have the doclearn test content already in context from the grep. Let me verify the dispatcher's action enum includes `document_extract_contract` (so the case is reachable) and check the `getEngine`/handler wiring isn't bypassed. Let me grep the action enum/registration.

### Assistant | 2026-06-24T19:37:38.971Z

[tool_use: Grep]

### User | 2026-06-24T19:37:43.007Z

[tool_result] 5: * 14 actions:
43:  "document_extract_contract",
45:  "document_extract_route",
91:    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
256:          case "document_extract_contract": {
263:              return { error: "document_extract_contract requires extraction (an OfficeDocumentPipelineEngine ExtractionResult, an ImageOCRPipelineEngine OCRResult, or a document
... [+492 chars truncated]

### Assistant | 2026-06-24T19:37:49.065Z

The action is in the `ACTIONS` enum (line 43), so the case is reachable and validated. Let me verify the `ACTIONS` array is the one bound to the enum at line 91 and confirm line 43's `document_extract_contract` is within that exported `ACTIONS` constant.

### Assistant | 2026-06-24T19:37:49.840Z

[tool_use: Read]

### User | 2026-06-24T19:37:52.158Z

[tool_result] 28	
29	// ── Actions ────────────────────────────────────────────────────
30	
31	const ACTIONS = [
32	  "archive_discover",
33	  "archive_analyze",
34	  "classify_dark",
35	  "dark_report",
36	  "ocr_process",
37	  "ocr_stats",
38	  "drawing_extract",
39	  "drawing_summary",
40	  "office_process",
41	  "office_search",
42	  // U-XRAY-DOCUMENT-EXTRACT-CONTRACT -- normalize an office/document extrac
... [+2383 chars truncated]

### Assistant | 2026-06-24T19:38:27.139Z

Everything is confirmed and wired. I now have full coverage of all five verification points. Let me trace through the critical correctness checks systematically against the exact code.

**Verification trace:**

**1. Totality on garbage** (DocumentExtractionContract.ts:265-289):
- `null` → `g = {}` (line 267), `Array.isArray(g.items)`=false, `Array.isArray(null)`=false → `items = []` → 0 entries. PASS
- `{items:"nope"}` → `Array.isArray("nope")`=false, `Array.isArray({...})`=false → `items = []`. PASS
- `{}` → `items = []`. PASS
- `[{not:"item"}]` → `ingestion` is an array, but `g = ingestion` (typeof array==="object"), `g.items` undefined → not array; then `Array.isArray(ingestion)`=true → `items = [{not:"item"}]`. Loop: `raw` is object, `title`/`body` both missing → `value` empty → dropped. PASS (matches test line 78)
- Each item: `if (!raw || typeof raw !== "object") continue` (line 273) guards null/non-object array members. No throw path. PASS — does NOT re-implement extraction; maps already-structured items.

**2. Confidence semantics** (lines 280-285):
- Carries `it.confidence` per-item when finite. Missing/NaN → falls back to `OFFICE_REGEX_DEFAULT_CONFIDENCE` (0.6). With default floor 0.70, 0.6 < 0.70 → `needs_confirm = true`. PASS (test line 50 → no confidence → routes confirm)
- `clamp01` applied (line 280). `needs_confirm = conf < floor` (line 285). PASS

**3. Procedure/note classification** (line 284): produces only `"procedure"` or `"note"` — both in `DocEntryKind` and both map exclusively to `tribal_capture` (router line 169). No other consumer's `kinds` array contains "procedure"/"note". Classification is semantic-only; cannot mis-route to tool_crib/speed_feed. PASS

**4. Producer selector non-regression** (dispatcher lines 261, 273-278):
- Office call (no ocr/ingestion/producer): `producer === "ocr"`=false, `params.ocr != null`=false, `producer === "doclearn"`=false, `params.ingestion != null`=false → "office". `ex` resolves from `params.extraction ?? 
... [+4842 chars truncated]
