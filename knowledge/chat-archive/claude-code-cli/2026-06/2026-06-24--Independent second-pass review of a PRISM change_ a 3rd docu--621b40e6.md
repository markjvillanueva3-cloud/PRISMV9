---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Independent second-pass review of a PRISM change: a 3rd document-producer normal"
date: "2026-06-24"
first_ts: "2026-06-24T19:36:51.369Z"
last_ts: "2026-06-24T19:39:18.428Z"
cwd: "H:\\prism\\mcp-server"
messages: 50
user_msgs: 18
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a6cc4fa26835540c1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent second-pass review of a PRISM change: a 3rd document-producer normal

> **claude-code-cli** | 2026-06-24 | 50 msgs (18 user / 32 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a6cc4fa26835540c1.jsonl`

## Transcript

### User | 2026-06-24T19:36:51.369Z

Independent second-pass review of a PRISM change: a 3rd document-producer normalizer + dispatcher wire + tests. Do NOT assume another reviewer caught everything. Grade PASS or FAIL with P0/P1/P2 + file:line. Weighted toward test integrity (R9), silent breakage, convention.

FILES (read the changed regions fully):
1. H:/prism/mcp-server/src/schemas/DocumentExtractionContract.ts -- new `normalizeDocLearningToContract` (maps documentLearning IngestionResult items {title,body,category,confidence} -> procedure/note DocEntries, carrying each item's own confidence; docType default "manual").
2. H:/prism/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts -- `document_extract_contract` case: added a "doclearn" producer branch (params.producer==="doclearn" || params.ingestion != null) calling the new normalizer; error message updated.
3. H:/prism/mcp-server/src/__tests__/DocumentExtractionContract.doclearn.test.ts -- 7 new unit tests.
4. H:/prism/mcp-server/src/__tests__/resourceExtractionDispatcher.documentContract.test.ts -- a new doclearn round-trip test (document_extract_contract producer:doclearn -> document_extract_route -> tribal_capture confirm-gated).

VERIFY:
1. R9 -- do the tests encode intent, would they FAIL on a real regression? Specifically: (a) the per-item-confidence test (0.92 -> not gated, 0.5 -> gated) -- would it fail if the normalizer used a flat default instead of the item's confidence? (b) the procedure-vs-note classification test -- would it fail if the hint regex were dropped? (c) the round-trip test's `tribal.blocking_fields === 1` / `requires_confirmation === true` -- hand-verify: items {procedure,conf 0.95} + {note,conf 0.5}, tribal routes both kinds, 1 below the 0.70 floor -> blocking 1. Correct?
2. Silent breakage: does adding the doclearn branch break the existing office/ocr round-trip assertions in the same test file (the office fixture n_eligible=4 test, the OCR path)? Confirm the producer selector precedence is safe.
3. Is `nor
... [+616 chars truncated]

### Assistant | 2026-06-24T19:36:54.989Z

I'll review this change thoroughly. Let me start by reading all four changed files end to end, plus the existing normalizers they should conform to.

### Assistant | 2026-06-24T19:36:55.941Z

[tool_use: Read]

### User | 2026-06-24T19:36:56.379Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\schemas\DocumentExtractionContract.ts' was already read 13s ago in this session and is unchanged (mtime 1782329658788). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-24T19:36:56.428Z

[tool_use: Read]

### Assistant | 2026-06-24T19:36:56.742Z

[tool_use: Read]

### User | 2026-06-24T19:36:57.408Z

[tool_result] 1	/**
2	 * Tests for normalizeDocLearningToContract -- the 3rd producer normalizer (documentLearning
3	 * ContentIngestionPipelineEngine IngestionResult -> DocumentExtractionContract). Closes the
4	 * DocumentLearningPage -> tribal-knowledge dead-end. Reference-value + invariant (R9): per-item
5	 * confidence carried through (NOT a flat regex default), procedure/note classification, dedup,
6	 * fa
... [+4079 chars truncated]

### User | 2026-06-24T19:36:57.718Z

[tool_result] 1	/**
2	 * Round-trip wire test for prism_resource_extraction:document_extract_contract
3	 * (U-XRAY-DOCUMENT-EXTRACT-CONTRACT). Proves the office extraction -> versioned
4	 * DocumentExtractionContract chain THROUGH the dispatcher (enum entry + case + normalizer reachable as
5	 * an app surface). The normalizer's own logic is covered by DocumentExtractionContract.test.ts; this
6	 * proves the DIS
... [+6948 chars truncated]

### Assistant | 2026-06-24T19:37:01.867Z

The schema file was already read this session. Let me retrieve its content via grep targeting the key regions I need to verify, since the read-once guard says it's in context but I want to confirm exact line numbers for citations.

### Assistant | 2026-06-24T19:37:02.342Z

[tool_use: Read]

### User | 2026-06-24T19:37:03.221Z

[tool_result] 1	/**
2	 * DocumentExtractionContract -- the VERSIONED, app-facing shape of a NON-blueprint document extraction
3	 * (office docs / catalogs / manuals / setup sheets / spec docs / image OCR).
4	 *
5	 * WHY (blueprint-extraction-consumer-application-map-2026-06-24, section 3): the blueprint path is wired
6	 * (BlueprintExtractionContract + blueprintExtractionRouter -> 13 feature consumers), but the
... [+4221 chars truncated]

### Assistant | 2026-06-24T19:37:06.019Z

Now let me read the rest of the schema file, focusing on the existing normalizers and the new `normalizeDocLearningToContract`.

### Assistant | 2026-06-24T19:37:06.790Z

[tool_use: Read]

### User | 2026-06-24T19:37:07.835Z

[tool_result] 80	    n_needs_confirm: z.number().int().nonnegative().describe("entries below the confirm floor"),
81	    by_kind: z.record(z.string(), z.number().int().nonnegative()).describe("entry count per kind (routing pre-aggregate)"),
82	  })
83	  .describe("rollup counts for the app trust banner + the router");
84	
85	export const documentExtractionContractSchema = z
86	  .object({
87	    schemaVersion: 
... [+11739 chars truncated]

### Assistant | 2026-06-24T19:37:12.592Z

I have the full schema file now. Let me read the dispatcher to verify the `document_extract_contract` case, the doclearn branch, producer precedence, error message, and the routing chain.

### Assistant | 2026-06-24T19:37:14.530Z

[tool_use: Grep]

### User | 2026-06-24T19:37:15.459Z

[tool_result] 43:  "document_extract_contract",
45:  "document_extract_route",
256:          case "document_extract_contract": {
260:            // office_process first, then calls this to get the stable contract. No producer run, no I/O.
263:              return { error: "document_extract_contract requires extraction (an OfficeDocumentPipelineEngine ExtractionResult, an ImageOCRPipelineEngine OCRResult, or a d
... [+1136 chars truncated]

### Assistant | 2026-06-24T19:37:19.439Z

Let me read the full dispatcher case block for both actions to verify precedence, the `ex` resolution, opts threading, and the routing chain.

### Assistant | 2026-06-24T19:37:20.333Z

[tool_use: Read]

### User | 2026-06-24T19:37:21.638Z

[tool_result] 250	              return { error: "keyword or partNumber is required for office_search" };
251	            }
252	            result = { count: matches.length, matches };
253	            break;
254	          }
255	
256	          case "document_extract_contract": {
257	            // U-XRAY-DOCUMENT-EXTRACT-CONTRACT -- normalize an office/document extraction into the
258	            // versioned Doc
... [+6772 chars truncated]

### Assistant | 2026-06-24T19:37:26.662Z

Now I need to verify the routing chain - specifically `routeDocumentToConsumers` and how `tribal_capture` computes `blocking_fields`, `requires_confirmation`, and `eligible`. This is critical for verifying the round-trip test claim that `blocking_fields === 1`.

### Assistant | 2026-06-24T19:37:27.893Z

[tool_use: Grep]

### User | 2026-06-24T19:37:30.003Z

[tool_result] 5: * dead-ends -- office/OCR extraction of speeds/feeds/tool-codes/materials/procedures reaches the engines
9: * (tribal_capture, which writes authoritative shop knowledge) -- a confirm-gate on below-floor entries.
32: * `commitment`: the consumer writes durable state from the entries -- `tribal_capture` adds authoritative
48:  eligible: boolean;
50:  requires_confirmation: boolean;
51:  blocking_
... [+1562 chars truncated]

### Assistant | 2026-06-24T19:37:33.472Z

Let me read the router's matching and blocking logic in full to hand-verify the `blocking_fields === 1` claim.

### Assistant | 2026-06-24T19:37:34.723Z

[tool_use: Read]

### User | 2026-06-24T19:37:37.371Z

[tool_result] 150	  },
151	  // ADVISORY: price the extracted material(s) (catalog/spec/manual docs often name a stock material)
152	  {
153	    consumer: "material_price_lookup",
154	    dispatcher: "prism_business",
155	    action: "material_price_lookup",
156	    kind: "advisory",
157	    kinds: ["material"],
158	    build: (m) => ({
159	      reason: m.length ? `material(s) ${values(m).join(", ")} -> price-
... [+3418 chars truncated]

### Assistant | 2026-06-24T19:37:41.820Z

I now have the router logic. Let me read the helper functions `entriesOfKind`, `nNeedsConfirm`, `entries`, and `values` to fully verify the routing math, plus confirm the `document_extract_contract` / `document_extract_route` enum entries exist.

### Assistant | 2026-06-24T19:37:42.913Z

[tool_use: Read]

### User | 2026-06-24T19:37:44.109Z

[tool_result] 75	// ============================================================================
76	// INTERNAL -- defensive entry access (total: never throws on a malformed contract)
77	// ============================================================================
78	
79	function entries(c: DocumentExtractionContract): DocEntry[] {
80	  return Array.isArray(c?.entries) ? c.entries : [];
81	}
82	/** entries wh
... [+3405 chars truncated]

### Assistant | 2026-06-24T19:37:53.305Z

I now have the complete routing logic. Let me hand-verify the `blocking_fields === 1` claim for the round-trip test, then confirm the enum entries are wired.

The round-trip test (lines 99-122) sends two items:
- `{title:"Deburr sequence", body:"deburr all edges...", category:"procedure", confidence:0.95}` → "procedure" hint matches category, conf 0.95 ≥ 0.70 → `kind:"procedure", needs_confirm:false`
- `{title:"Fixture note", body:"verify soft jaws seat", category:"workholding", confidence:0.5}` → "workholding" no procedure hint, title "Fixture note" no hint → `kind:"note", needs_confirm:true` (0.5 < 0.70)

For tribal_capture (`kinds: ["procedure", "note"]`): `matched` = both entries (len 2) → `eligible:true`. `blocking = nNeedsConfirm(matched)` = count of needs_confirm in matched = 1 (only the note). `requires_confirmation = commitment && eligible && blocking>0` = true. So `blocking_fields === 1`, `requires_confirmation === true`. The test assertions are correct and hand-verified.

Let me verify the enum entries and check there's no schema gate on the dispatcher params (the producer/ingestion params must be accepted).

### Assistant | 2026-06-24T19:37:54.110Z

[tool_use: Read]

### User | 2026-06-24T19:37:55.194Z

[tool_result] 30	
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
42	  // U-XRAY-DOCUMENT-EXTRACT-CONTRACT -- normalize an office/document extraction -> versioned DocumentExtractionContract
43	  "document_extract_contra
... [+3345 chars truncated]

### Assistant | 2026-06-24T19:38:01.944Z

The enum entries `document_extract_contract` and `document_extract_route` are present (lines 43, 45) and params is an open `z.record(z.string(), z.any())`, so `producer`/`ingestion`/`docType`/`confirmFloor` all pass through. The dispatcher case routes to the new normalizer (lines 277-278). The full chain is wired and reachable.

Now let me verify two things I want to be certain about for the silent-breakage and precedence checks: (1) the `paramNormalizer` doesn't mangle the nested `ingestion.items` array or `producer` string, and (2) whether `params.ingestion != null` could accidentally fire for the office/ocr fixtures (it can't, but let me confirm the office fixtures don't set `ingestion`/`ocr`/`producer`). Let me also check the `slimResponse` doesn't strip the `producer` field that the test asserts on.

### Assistant | 2026-06-24T19:38:03.618Z

[tool_use: Grep]

### User | 2026-06-24T19:38:04.590Z

[tool_result] No matches found

### Assistant | 2026-06-24T19:38:07.728Z

[tool_use: Grep]

### User | 2026-06-24T19:38:08.890Z

[tool_result] 26-import { log } from "../../utils/Logger.js";
27:import { slimResponse } from "../../utils/responseSlimmer.js";
28-
--
242-            // findByPartNumber / searchByKeyword return ExtractionResult[]; wrap in an object with a
243:            // stable count so slimResponse (which strips empty arrays) never erases a 0-match result.
244-            let matches: any[];
--
362-
363:        return sli
... [+64 chars truncated]

### Assistant | 2026-06-24T19:38:17.227Z

The graph context confirms `slimResponse` "strips empty arrays". The dispatcher returns `slimResponse({ action, ...result })` where result is `{ contract, producer, valid, errors }`. The `producer` field is a non-empty string ("doclearn"/"ocr"/"office"), so it survives slimming — the test's `expect(c.producer).toBe("doclearn")` assertion is safe. The `errors: []` empty array may be stripped, but no test asserts on it for the doclearn path.

Now let me confirm the office/OCR existing tests can't be broken by the new doclearn precedence. The selector (lines 273-275): `ocr` wins if `producer==="ocr"||params.ocr!=null`; else `doclearn` if `producer==="doclearn"||params.ingestion!=null`; else `office`. The office fixtures (lines 22-46, 83-97) set only `extraction`/`extractedData`, never `ocr`/`ingestion`/`producer` → fall through to `office`. The OCR fixture sets `producer:"ocr"` → ocr branch. None set `ingestion`, so the doclearn branch is never accidentally triggered. Precedence is safe.

Let me do one final check — confirm the doclearn test's classification assertions can't pass trivially (R9 mutation test for the hint regex), and verify there are no `.skip`/`.only` in either test file.

### Assistant | 2026-06-24T19:38:18.689Z

[tool_use: Grep]

### User | 2026-06-24T19:38:19.649Z

[tool_result] No matches found

### Assistant | 2026-06-24T19:38:23.132Z

No `.skip`/`.only`/`toBeDefined()` stubs in either test file. Let me also check the dispatcher round-trip test file for the same.

### Assistant | 2026-06-24T19:38:24.539Z

[tool_use: Grep]

### User | 2026-06-24T19:38:25.504Z

[tool_result] No matches found

### Assistant | 2026-06-24T19:38:39.528Z

Clean. Now let me complete the R9 mutation analysis for each doclearn test to confirm they'd fail on a real regression.

**Verifying R9 for each test:**

1. **Per-item confidence test (line 31-32):** asserts entry[0] `confidence:0.92, needs_confirm:false` and entry[1] `confidence:0.5, needs_confirm:true`. If the normalizer used a flat default (e.g., `OFFICE_REGEX_DEFAULT_CONFIDENCE=0.6`) instead of the item's confidence, entry[0] would be `0.6` (≠0.92) AND `needs_confirm:true` (0.6<0.70). Both `confidence` and `needs_confirm` assertions would FAIL. **Confirmed R9-valid.** The line-281 code reads `it.confidence` per item, not a flat default.

2. **Procedure-vs-note classification (lines 30-35, 55-58):** entry[0] expects `kind:"procedure"` (category "setup" matches `DOCLEARN_PROCEDURE_HINT`), entry[1] `kind:"note"` (category "general", no hint). Test line 55-58 additionally checks the hint fires on the TITLE ("How-to:" matches `how[- ]?to`) with a generic category "misc". If the hint regex were dropped (everything → "note"), entry[0] would be "note" (≠"procedure") and the title-hint test would fail (would be "note"). Also `by_kind` (line 35) expects `{procedure:1, note:1}` which would become `{note:2}`. **Confirmed R9-valid.**

3. **Round-trip `blocking_fields===1` / `requires_confirmation===true` (lines 119-121):** Hand-verified above: 2 matched entries (procedure+note), 1 below floor → blocking=1, requires_confirmation=true. **Correct and would fail** if confidence weren't carried per-item (if both got a flat ≥0.70, blocking would be 0 and requires_confirmation false; if both got flat <0.70, blocking would be 2).

Let me verify one edge in test line 51 — the comment says `0.6 // OFFICE_REGEX_DEFAULT_CONFIDENCE` for missing confidence. The code at line 281 confirms the fallback IS `OFFICE_REGEX_DEFAULT_CONFIDENCE` (0.6). Correct.

Let me do a final convention check by confirming the dispatcher's existing doclearn round-trip in the test exercises the full chain throug
... [+486 chars truncated]

### Assistant | 2026-06-24T19:38:41.235Z

[tool_use: Grep]

### User | 2026-06-24T19:38:42.186Z

[tool_result] 39:export interface IngestionItem {
41:  title: string;
42:  body: string;
44:  category: string;
51:export interface IngestionResult {
56:  items: IngestionItem[];
58:  source_attribution: string;
141:      items: allItems,
143:      source_attribution: input.default_source || "batch_import",
178:    title: string | undefined,
207:      items: item ? [item] : [],
209:      source_attribution: sou
... [+1068 chars truncated]

### Assistant | 2026-06-24T19:38:45.373Z

Let me confirm the `confidence` field exists on `IngestionItem` (the contract carries each item's own confidence — this is the load-bearing claim).

### Assistant | 2026-06-24T19:38:46.223Z

[tool_use: Read]

### User | 2026-06-24T19:38:47.131Z

[tool_result] 39	export interface IngestionItem {
40	  tip_id: string;
41	  title: string;
42	  body: string;
43	  tags: string[];
44	  category: string;
45	  source: string;
46	  confidence: number;
47	  dedup_action: DeduplicationResult["action_taken"];
48	  similarity_score: number;
49	}
50	
51	export interface IngestionResult {
52	  items_created: number;
53	  items_skipped_duplicate: number;
54	  items_lin
... [+179 chars truncated]

### Assistant | 2026-06-24T19:39:18.428Z

Confirmed: `IngestionItem` has exactly `{title, body, category, confidence}` (plus extras the normalizer ignores). The real producer shape matches the contract's claim, and `confidence: number` is present on every item — so carrying each item's own confidence is real, not aspirational. The normalizer correctly accepts both the full `IngestionResult` (`.items[]` + `.source_attribution`) and a bare `IngestionItem[]`.

I have now verified all five points end-to-end. Let me address the docType default and convention questions concretely.

**docType default "manual" (point 5):** `DOC_TYPES` includes `"manual"` (line 61), so "manual" is a valid classification. It is overridable via `opts.docType` (line 288, tested at line 69-70 → "spec", and the dispatcher threads `params.docType` at line 270). The choice is sensible: documentLearning ingests learned tips from manuals/shop docs, distinct from office "office" and ocr "ocr". The `doc_type` only drives "best-effort router doc-type gating" (per line 60 comment) and the router doesn't gate on doc_type for tribal_capture, so it's purely descriptive here. No concern.

**Convention conformance (point 4):** `normalizeDocLearningToContract` matches its two siblings: same `NormalizeOpts` shape, same `floor` resolution idiom (line 266 ≡ lines 199/227), same `clamp01` on confidence, same `finalizeDocContract` call (line 288 ≡ lines 210/243), same fail-soft total posture (guards non-object input, non-array items), same dedup-via-`seen`-Set pattern. One minor divergence: it inlines its own item loop rather than reusing `buildEntriesFromArrays` — but that's correct, because doclearn is per-item-confidence + title/body composition + kind-classification, which the array-based shared helper cannot express. This is justified divergence, not a violation. JSDoc density matches siblings.

I have everything needed. Final verdict.

---

VERDICT: PASS

summary: The 3rd producer normalizer (`normalizeDocLearningToContract`), its dispatcher wiring, 
... [+4233 chars truncated]
