---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review a single-file change (arm C analyst, weighted to silent breakage / regres"
date: "2026-06-23"
first_ts: "2026-06-23T07:45:46.371Z"
last_ts: "2026-06-23T07:47:13.147Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-acef3b35dfea442c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a single-file change (arm C analyst, weighted to silent breakage / regres

> **claude-code-cli** | 2026-06-23 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-acef3b35dfea442c8.jsonl`

## Transcript

### User | 2026-06-23T07:45:46.371Z

Review a single-file change (arm C analyst, weighted to silent breakage / regression / integration coupling) for PRISM unit U-XRAY-ENSEMBLE-NONDIM-UNION (producer half).

FILE CHANGED: H:\prism\scripts\lib\vision-ensemble-fuse.mjs
TEST FILE: H:\prism\scripts\lib\vision-ensemble-fuse.test.mjs

WHAT THE CHANGE DOES (spec to verify against):
- `fuseEnsemble(modelExtractions, opts)` previously fused ONLY `dimensions` and SILENTLY DROPPED the per-model `gdt / notes / profiles / surface_finishes` that `parseVisionResponse` extracts. The change adds a recall-first UNION of those four non-dimension fields across the ensemble models, de-duped by a per-field identity key, each entry carrying `corroboration` / `n_models` / `models` / `hallucination_candidate` (mirroring the fused-dimension trust metadata). New summary counts `n_gdt/n_notes/n_profiles/n_surface_finishes/n_gdt_hallucination_candidates`. New top-level return keys `gdt/notes/profiles/surface_finishes`.
- New pure helpers: `nonDimKeyNorm`, `numKeyPart`, `gdtKey` (FCF identity: symbol+tolerance_value+material_condition+sorted datum_references+applied_to), `noteKey` (category+text), `profileKey` (name+type+width/height/diameter_mm), `surfaceFinishKey` (ra_um or raw_text, + location), `fuseNonDimField`.
- Representative of a de-duped group = highest-confidence member, ties -> first model seen (deterministic; repo bans Math.random/Date.now in scripts).

VERIFY (grade PASS/FAIL with P0/P1/P2 + file:line):
1. ADDITIVITY — is the change strictly additive? Existing consumers read only `fused.dimensions` and `fused.summary.n_models` (buildTrainsetRow) / `fused.summary.*` (classifyActiveLearning). Confirm those existing fields are byte-unchanged and no existing test could break. The element shapes come from `ollama-vision-extract-lib.mjs` (extractGdt/extractNote/extractProfile/extractSurfaceFinish) — confirm the key functions reference REAL fields (no fabricated field names).
2. DETERMINISM — is the union order-independent a
... [+752 chars truncated]

### Assistant | 2026-06-23T07:45:51.224Z

I'll review the producer-half change to `vision-ensemble-fuse.mjs` and its test file, plus verify the element shapes against the upstream extractor.

### Assistant | 2026-06-23T07:45:51.714Z

[tool_use: Read]

### Assistant | 2026-06-23T07:45:52.011Z

[tool_use: Read]

### User | 2026-06-23T07:45:53.189Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+32093 chars truncated]

### User | 2026-06-23T07:45:53.389Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.test.mjs
2	// Tests for U-XRAY-VISION-ENSEMBLE pure fusion core. Reference values + algebraic
3	// invariants — no toBeDefined() stubs. The fusion decides a real, costly thing: which
4	// extracted dimensions are trusted as consensus ground truth vs flagged as hallucination
5	// candidates for the operator-confirm gate. Each test encodes WHY a verdict matters.
... [+29160 chars truncated]

### Assistant | 2026-06-23T07:45:58.083Z

Now I need to verify the element shapes against the upstream extractor — the key functions must reference REAL fields. Let me read the extractor's `extractGdt/extractNote/extractProfile/extractSurfaceFinish` and trace the consumers (`buildTrainsetRow`, `classifyActiveLearning`, `buildRegionRoutedFused`).

### Assistant | 2026-06-23T07:45:59.499Z

[tool_use: Grep]

### Assistant | 2026-06-23T07:46:00.772Z

[tool_use: Grep]

### User | 2026-06-23T07:46:00.814Z

[tool_result] 675:function extractGdt(g) {
703:function extractNote(n) {
710:function extractProfile(p) {
724:function extractSurfaceFinish(s) {

### User | 2026-06-23T07:46:02.278Z

[tool_result] Found 16 files
scripts\lib\vision-ensemble-fuse.test.mjs
scripts\lib\vision-ensemble-fuse.mjs
scripts\validate-perfect-parts.mjs
scripts\region-classify.mjs
scripts\region-classify.test.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\region-glue-lib.test.mjs
scripts\lib\region-glue-lib.mjs
scripts\lib\ollama-vision-extract-lib.test.mjs
scripts\lib\ollama-vision-extract-lib.mjs
scripts\run-
... [+212 chars truncated]

### Assistant | 2026-06-23T07:46:08.819Z

Let me read the extractor's element-shape functions and the consumers to verify field names and additivity.

### Assistant | 2026-06-23T07:46:09.943Z

[tool_use: Read]

### User | 2026-06-23T07:46:10.917Z

[tool_result] 670	    if (GDT_ALIAS.has(head)) return GDT_ALIAS.get(head);
671	  }
672	  return null;
673	}
674	
675	function extractGdt(g) {
676	  if (!g || typeof g !== "object") return null;
677	  const symbol = asStr(g.symbol);
678	  const raw = asStr(g.raw_text);
679	  if (symbol == null && raw == null) return null;
680	  const datums = asArray(g.datum_references).map((d) => asStr(d)).filter(Boolean);
681	
... [+3110 chars truncated]

### Assistant | 2026-06-23T07:46:11.743Z

[tool_use: Grep]

### Assistant | 2026-06-23T07:46:12.624Z

[tool_use: Grep]

### User | 2026-06-23T07:46:13.339Z

[tool_result] 123: * @param {{dimensions:Array, summary:object}} fused  fuseEnsemble output
129:  const dims = fused && Array.isArray(fused.dimensions) ? fused.dimensions : [];
130:  const runNModels = fused && fused.summary && Number.isFinite(fused.summary.n_models) ? fused.summary.n_models : 0;
166:  const fused = perPart && perPart.fused ? perPart.fused : {};

### User | 2026-06-23T07:46:14.233Z

[tool_result] 178:export function buildRegionRoutedFused(mergedDimensions, fullPageFused, opts = {}) {

### Assistant | 2026-06-23T07:46:17.828Z

Field names verify against the extractor. Now let me confirm the `buildRegionRoutedFused` pass-through (the comment claims it "already ASSUMED the fused carried gdt/notes/...") and check `classifyActiveLearning` / `buildTrainsetRow` consumers don't break.

### Assistant | 2026-06-23T07:46:19.246Z

[tool_use: Read]

### Assistant | 2026-06-23T07:46:19.790Z

[tool_use: Read]

### User | 2026-06-23T07:46:20.443Z

[tool_result] 178	export function buildRegionRoutedFused(mergedDimensions, fullPageFused, opts = {}) {
179	  const dims = Array.isArray(mergedDimensions) ? mergedDimensions : [];
180	  // n_hallucination_candidates recomputed over the UNION dims so a region-only hallucination candidate
181	  // (a singleton a region crop recovered) still routes to active-learning review (classifyActiveLearning
182	  // triggers
... [+1946 chars truncated]

### User | 2026-06-23T07:46:21.790Z

[tool_result] 115	
116	/**
117	 * Pure: build a supervised trainset row from one print's fused ensemble result. Each consensus dim is
118	 * tiered by its agreement fraction. A label is TRAINABLE only if (a) its print had n_models ≥
119	 * MIN_ENSEMBLE_FOR_CORROBORATION (real corroboration was possible) AND (b) its tier is gold/silver.
120	 * This closes the calibration-domain leak: a single-model run (n_models
... [+3904 chars truncated]

### Assistant | 2026-06-23T07:46:47.574Z

I have everything I need. Let me trace the two remaining verification points precisely:

1. **`buildRegionRoutedFused` pass-through (line 197):** `const out = { ...fullPageFused, dimensions: dims }` — spreads the full-page fused, overriding only `dimensions`. So `gdt/notes/profiles/surface_finishes` now flow through automatically once `fuseEnsemble` produces them. Before this change, those keys did not exist on the fused object, so the spread carried nothing — the comment's claim that the pass-through "already ASSUMED" the fields is slightly aspirational, but the spread is correct either way and is strictly improved by the change. No break.

2. **Consumers (`buildTrainsetRow` L129-130, `classifyActiveLearning` L166-174):** read only `fused.dimensions` and `fused.summary.{n_models, n_ambiguous_pairs, n_hallucination_candidates}`. All of those existing fields are produced by byte-identical code paths (lines 304-399 of the fuse) — the union helpers append new keys after them and never touch them. No consumer reads `n_gdt` etc., so adding them is inert.

Now let me verify the remaining correctness concerns directly from the code I've read.

**Identity-key correctness analysis:**

- `gdtKey` (L207-209): sorts `datum_references` → order-insensitive (confirmed by test L439). Uses `nonDimKeyNorm` on each datum. **Edge case:** `nonDimKeyNorm(null) === ""`, so `["A", null]` and `["A"]` both normalize datum-parts but `[null].map(nonDimKeyNorm)=[""]` joins to `""` while `[]` joins to `""` too — these collapse. But the extractor (`extractGdt` L680) filters falsy datums (`.filter(Boolean)`), so the post-extraction shape never has null datums. The fuse runs on extractor output. Minor robustness gap only on hand-built input; not a real silent break.

- `surfaceFinishKey` (L216-218): distinguishes by location (test L500 confirms). Uses `Number.isFinite(s.ra_um)` so `ra_um:null` (text-only finish) falls to `raw:`-prefixed verbatim text. Correct — `ra:` vs `raw:` prefixes prevent a nu
... [+2089 chars truncated]

### Assistant | 2026-06-23T07:46:49.455Z

[tool_use: Grep]

### User | 2026-06-23T07:46:50.747Z

[tool_result] No matches found

### Assistant | 2026-06-23T07:46:50.766Z

[tool_use: Grep]

### User | 2026-06-23T07:46:52.070Z

[tool_result] 142:  const s = fused.summary;
147:  const top = fused.dimensions.slice(0, 12);
163:    const consensusScore = scoreDimensionSet(consensusToScoreable(fused.dimensions), truth.dimensions);
191:    fused_dimensions: fused.dimensions,

### Assistant | 2026-06-23T07:47:13.147Z

Confirmed. `vision-ensemble-extract.mjs` reads only `fused.summary` and `fused.dimensions` (L142/147/163/191) — the new keys are inert to it. `blueprint-ocr-training-loop.mjs` doesn't read any of the new fields. No consumer drifts.

One last check on the `summary` field ordering: the change appends `n_gdt/n_notes/n_profiles/n_surface_finishes/n_gdt_hallucination_candidates` (L394-398) AFTER all pre-existing summary keys (L379-392), and `dimensions/ambiguous_pairs/per_model` keep their positions in the return object (L401). Existing fields are byte-unchanged.

---

VERDICT: PASS

summary: The change is strictly additive — the four new union arrays (`gdt/notes/profiles/surface_finishes`) and five new `summary.n_*` counts are appended after all pre-existing fields; the dimension-fusion path (lines 304-399), `summary.n_models/n_ambiguous_pairs/n_hallucination_candidates`, and `per_model` are byte-unchanged. Every downstream consumer reads only the unchanged fields, so nothing breaks silently, and `buildRegionRoutedFused`'s `{...fullPageFused}` spread (region-glue-lib.mjs:197) now correctly propagates the previously-dropped fields. Identity keys reference REAL extractor fields (verified against `extractGdt/extractNote/extractProfile/extractSurfaceFinish` in ollama-vision-extract-lib.mjs:675-743), the union is deterministic and fail-soft, and the 9 new tests are genuine reference/invariant assertions.

findings:
- [P2] H:\prism\scripts\lib\vision-ensemble-fuse.mjs:262 — `fuseNonDimField`'s sort only orders by `corroboration` desc; two distinct groups with EQUAL corroboration keep Map-insertion order, which depends on which model first reported each distinct key. Across model reorderings the relative order of equal-corroboration non-dim entries can differ. The determinism test (test L521) only exercises groups with differing corroboration (1 vs 2), so this is unproven by the suite. Not a correctness break — no consumer depends on inter-group order of equal-trust non-dim en
... [+1782 chars truncated]
