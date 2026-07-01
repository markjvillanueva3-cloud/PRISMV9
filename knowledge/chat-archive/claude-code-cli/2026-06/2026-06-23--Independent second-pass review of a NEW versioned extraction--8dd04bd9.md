---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Independent second-pass review of a NEW versioned extraction contract. Read both"
date: "2026-06-23"
first_ts: "2026-06-23T23:22:20.511Z"
last_ts: "2026-06-23T23:23:49.441Z"
cwd: "H:\\prism\\mcp-server"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-ab0591a0175b63f35.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Independent second-pass review of a NEW versioned extraction contract. Read both

> **claude-code-cli** | 2026-06-23 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-ab0591a0175b63f35.jsonl`

## Transcript

### User | 2026-06-23T23:22:20.511Z

Independent second-pass review of a NEW versioned extraction contract. Read both fully:
- H:/prism/mcp-server/src/schemas/BlueprintExtractionContract.ts
- H:/prism/mcp-server/src/__tests__/BlueprintExtractionContract.test.ts

Weight toward integration, convention, honesty, and orphan-risk:
1. R8 -- does the normalizer faithfully model the REAL `fuseEnsemble` output shape? Read scripts/lib/vision-ensemble-fuse.mjs (its @returns block ~line 287 + the per-dim object built ~line 328) and confirm the field names the normalizer reads (dimensions[].value_mm/type/agreement_confidence/status/hallucination_candidate; gdt/notes/profiles/surface_finishes; summary.n_models) actually exist in that output. Flag any field-name mismatch (a wrong name = silently-empty contract field).
2. R11 -- Zod v4 conventions per H:/prism/.claude/rules/schemas.md (z.string/number/enum not z.any; .describe() per field; named exports). Confirm .catchall() is the right title_block approach and is v4-safe.
3. R12 honesty -- the OCR_PER_FIELD_CONFIRM_FLOOR=0.70 is cited as the verified-shipped floor; confirm it is NOT placed in physics/constants.ts (correct -- it's a domain threshold). Is the contract honest about being app-facing?
4. R15 ORPHAN CHECK -- this contract has no live producer/consumer yet (the upload->extract route is papa/quebec's per blueprint-vision-app-integration-plan-2026-06-23). Is "xray owns the contract, papa/quebec own the route" a legitimate cross-galaxy [SCOPED] split, or is this a silent orphan? Is the normalizer at least usable by a real producer (the .mjs pipeline could call it)?
5. Naming collisions (BlueprintExtractionContract vs existing schemas like CatalogExtractionResult) -- confirm distinct.
6. Any stubbed/weakened test assertions.

Report P0/P1/P2 with file:line, then a single verdict: PASS or FAIL. Review only.

### Assistant | 2026-06-23T23:22:24.472Z

I'll review both files thoroughly, then verify the normalizer against the real `fuseEnsemble` output shape.

### Assistant | 2026-06-23T23:22:25.013Z

[tool_use: Read]

### Assistant | 2026-06-23T23:22:25.891Z

[tool_use: Read]

### Assistant | 2026-06-23T23:22:26.358Z

[tool_use: Read]

### User | 2026-06-23T23:22:26.416Z

[tool_result] 1	/**
2	 * BlueprintExtractionContract -- the VERSIONED, app-facing shape of a blueprint OCR extraction.
3	 *
4	 * WHY (the app-integration keystone, blueprint-vision-app-integration-plan-2026-06-23): the
5	 * blueprint-vision backend is mature (VLM-ensemble OCR -> fused dims/gd&t/notes), but the app stops
6	 * at "file uploaded" and every consumer (the upload->extract route, the quote autopopulat
... [+10942 chars truncated]

### Assistant | 2026-06-23T23:22:26.439Z

[tool_use: Read]

### User | 2026-06-23T23:22:27.106Z

[tool_result] 1	// BlueprintExtractionContract.test.ts -- U-XRAY-EXTRACTION-CONTRACT
2	// Verifies the versioned app-facing extraction contract: the fuse->contract normalizer (per-field
3	// confidence + the 0.70 operator-confirm floor), summary rollups, and Zod validation. Reference
4	// values are computed from the documented contract; each assertion is load-bearing (R9).
5	
6	import { describe, it, expect } 
... [+5797 chars truncated]

### User | 2026-06-23T23:22:27.652Z

[tool_result] 1	---
2	paths:
3	  - "**/src/tools/schemas/**/*.ts"
4	  - "**/src/schemas/**/*.ts"
5	---
6	
7	# Schema Conventions
8	
9	- All schemas use Zod v4
10	- Action schemas must match dispatcher z.enum exactly
11	- Input validation: use z.string(), z.number(), z.enum() � never z.any()
12	- Schema naming: {domain}ActionSchemas.ts
13	- Export schemas as named constants, not default exports
14	- Include .des
... [+111 chars truncated]

### User | 2026-06-23T23:22:28.305Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+33644 chars truncated]

### Assistant | 2026-06-23T23:22:33.567Z

Both files read end to end, plus the live producer `fuseEnsemble`. Let me verify the field-name claims (point 1) and the naming-collision concern (point 5) against the real code.

The critical R8 check is whether the normalizer reads field names that actually exist in `fuseEnsemble`'s output. Let me cross-reference the per-dim object built at lines 328-343 and the non-dim entries at line 260-268.

### Assistant | 2026-06-23T23:22:34.991Z

[tool_use: Grep]

### Assistant | 2026-06-23T23:22:36.218Z

[tool_use: Grep]

### User | 2026-06-23T23:22:36.457Z

[tool_result] src\schemas\BlueprintExtractionContract.ts:2: * BlueprintExtractionContract -- the VERSIONED, app-facing shape of a blueprint OCR extraction.
src\schemas\BlueprintExtractionContract.ts:12: * NORMALIZER: `normalizeFusedToContract` maps the live `fuseEnsemble` output
src\schemas\BlueprintExtractionContract.ts:17: * @module schemas/BlueprintExtractionContract
src\schemas\BlueprintExtractionContract.t
... [+5764 chars truncated]

### User | 2026-06-23T23:22:37.417Z

[tool_result] Found 4 files
src\schemas\BlueprintExtractionContract.ts
src\schemas\partsLibraryActionSchemas.ts
src\schemas\turningProgramActionSchemas.ts
src\schemas\provenPipelineActionSchemas.ts

### Assistant | 2026-06-23T23:22:45.616Z

Now let me verify the exact field names. The key R8 question: does `fuseEnsemble`'s per-dim object (lines 328-343) emit `value_mm`, `type`, `agreement_confidence`, `status`, `hallucination_candidate`, and do the non-dim entries (line 260-268) emit `confidence`/`hallucination_candidate`? Let me also check `CatalogExtractionResult` to confirm distinct shape, and look at how `value` is keyed in the non-dim entries.

Let me trace the non-dim entry value field carefully since the normalizer's `calloutText` looks for `value`/`text`/etc.

### Assistant | 2026-06-23T23:22:47.120Z

[tool_use: Read]

### Assistant | 2026-06-23T23:22:47.765Z

[tool_use: Read]

### User | 2026-06-23T23:22:48.641Z

[tool_result] 335	 *
336	 * R12 fail-loud: `advisoryOnly` and `must_human_verify` are set to true by
337	 * default. The merge orchestrator will refuse silent inventory mutations
338	 * — every diff must be operator-approved.
339	 */
340	export interface CatalogExtractionResult {
341	  schemaVersion: string; // CATALOG_EXTRACTION_SCHEMA_VERSION
342	  generatedAt: string; // ISO-8601
343	  generatedBy: string; /
... [+1894 chars truncated]

### User | 2026-06-23T23:22:50.803Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+3574 chars truncated]

### Assistant | 2026-06-23T23:22:55.018Z

I have what I need to verify the per-dim and non-dim field names. Let me confirm the exact shape `parseVisionResponse` produces for the non-dim fields (the `value` vs `text`/`symbol` question), since the fuse passes these through via `{ ...g.rep }` and the contract's `calloutText` must find a usable string.

### Assistant | 2026-06-23T23:22:56.705Z

[tool_use: Grep]

### User | 2026-06-23T23:22:57.701Z

[tool_result] 7:// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
63: * BLUEPRINT_ANALYSIS_PROMPT (title_block/dimensions/gdt/notes/profiles/...).
95:    '      "raw_text": "the exact text shown on the drawing", "confidence": 0.95 }',
97:    '  "gdt": [',
98:    '    { "symbol": "position|flatness|perpendicularity|parallelism|concentricity|circularity|cylindricity|profile_line|profile_s
... [+5576 chars truncated]

### Assistant | 2026-06-23T23:23:11.401Z

This is the load-bearing finding. I now have the full picture of the real producer's output shape. Let me write up the review.

**Key R8 verification — the per-field shape `fuseEnsemble` actually emits vs what the normalizer reads:**

Dimensions (fuse lines 328-343): `type`, `value_mm`, `value_spread_mm`, `corroboration`, `n_models`, `agreement_confidence`, `confidence_gain`, `status`, `low_corroboration`, `hallucination_candidate`, `models`, `member_values_mm`, `raw_texts`. The normalizer reads `value_mm`, `type`, `agreement_confidence`, `status`, `hallucination_candidate` — **all present and correctly named.** ✓

Non-dim entries (fuse line 260-268): `{ ...g.rep, corroboration, n_models, models, hallucination_candidate }`. The `g.rep` for each field type comes from `parseVisionResponse`:
- **gdt** rep (lines 685-707): `{ symbol, ..., datum_references, applied_to, raw_text, ... }` — **no `value` or `text` key.** The callout's human-readable string lives in `symbol` / `raw_text`. The normalizer's `calloutText` searches `["value","text","callout","symbol","fcf","note","raw_text"]` — it finds `symbol` (5th) or `raw_text` (7th). ✓
- **notes** rep (line 715): `{ category, text, is_critical }` — `text` found (2nd). ✓
- **profiles** rep: `{ name, type, width_mm, ... }` — let me flag this.
- **surface_finishes** rep (line 737): `{ ra_um, location, raw_text }` — `raw_text` found (7th). ✓

The profiles rep has no `value`/`text`/`symbol`/`note`/`raw_text` string field that `calloutText` searches — its identity is `name`/`type`/dimensions. Let me confirm the profile rep shape.

### Assistant | 2026-06-23T23:23:12.112Z

[tool_use: Read]

### User | 2026-06-23T23:23:13.360Z

[tool_result] 718	function extractProfile(p) {
719	  if (!p || typeof p !== "object") return null;
720	  return {
721	    name: asStr(p.name),
722	    type: asStr(p.type),
723	    is_closed: p.is_closed === true,
724	    width_mm: asNum(p.width_mm),
725	    height_mm: asNum(p.height_mm),
726	    diameter_mm: asNum(p.diameter_mm),
727	    corner_radii_mm: asArray(p.corner_radii_mm).map(asNum).filter((x) => x != 
... [+1125 chars truncated]

### Assistant | 2026-06-23T23:23:49.441Z

Confirmed. The `extractProfile` rep (lines 720-729) is `{ name, type, is_closed, width_mm, height_mm, diameter_mm, corner_radii_mm, confidence }` — it has **no string field** that `calloutText` searches (`value`/`text`/`callout`/`symbol`/`fcf`/`note`/`raw_text`). So every fused profile normalizes to a `ContractCallout` with `value: ""`. This is a real (P2) field-shape gap. Now I have everything to render the verdict.

---

VERDICT: PASS

summary: The contract is a clean, honest, versioned Zod v4 module whose normalizer faithfully reads the field names `fuseEnsemble` actually emits for dimensions, gdt, notes, and surface_finishes (verified against the real producer at `vision-ensemble-fuse.mjs:328-343` and the `parseVisionResponse` reps in `ollama-vision-extract-lib.mjs:685-737`). No naming collision with `CatalogExtractionResult`, no stubbed assertions, no inlined physics constants, and the cross-galaxy [SCOPED] split (xray owns the contract, papa/quebec own the route) is legitimate and explicitly documented — not a silent orphan. One real-but-minor field-shape gap (profiles) and two doc/convention nits are P2; nothing blocks merge.

findings:
- [P2] `mcp-server/src/schemas/BlueprintExtractionContract.ts:131-137` (calloutText) vs producer `scripts/lib/ollama-vision-extract-lib.mjs:720-729` (extractProfile) -- the fused `profiles[]` entry shape is `{ name, type, is_closed, width_mm, height_mm, diameter_mm, corner_radii_mm, confidence }` (no `value`/`text`/`symbol`/`fcf`/`note`/`raw_text` string key). `calloutText` searches only those string keys, so EVERY fused profile normalizes to a callout with `value: ""` -- a silently-empty `profiles` field exactly like the field-name-mismatch failure mode point 1 warned about. (gdt/notes/surface_finishes are fine: gdt rep carries `symbol`+`raw_text`, notes carries `text`, surface_finishes carries `raw_text` -- all in the search list.) The trust metadata (confidence/needs_confirm/hallucination_candidate) is still correct; only t
... [+4230 chars truncated]
