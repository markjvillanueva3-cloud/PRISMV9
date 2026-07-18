---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Independent review of the WIRING for PRISM xray unit U-XRAY-READING-KNOWLEDGE --"
date: "2026-06-23"
first_ts: "2026-06-23T16:31:13.525Z"
last_ts: "2026-06-23T16:32:36.419Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a3051b8b31af7cec0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent review of the WIRING for PRISM xray unit U-XRAY-READING-KNOWLEDGE --

> **claude-code-cli** | 2026-06-23 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a3051b8b31af7cec0.jsonl`

## Transcript

### User | 2026-06-23T16:31:13.525Z

Independent review of the WIRING for PRISM xray unit U-XRAY-READING-KNOWLEDGE -- injecting a curated knowledge block into the LIVE blueprint VLM-extraction prompt. The #1 risk is a regression to the PROVEN extraction path (this file's history shows a prompt instruction was once proven IGNORED by the VLM, and prompt bloat can hurt VLM recall). Read END-TO-END:

1. H:\prism\scripts\lib\ollama-vision-extract-lib.mjs -- the `buildVisionPrompt(partClass, opts)` change (search "readingGuidance"; the new conditional append after the wireEdm block).
2. H:\prism\scripts\lib\vision-ensemble-fuse.mjs -- `ocrImageWithModelAsync` (search "injectReadingGuidance"/"buildReadingGuidanceBlock") + `runEnsembleOverImage` threading the flag.
3. H:\prism\scripts\probe-vision-model.mjs -- the `--reading-guidance` flag wiring.
4. H:\prism\scripts\lib\vision-ensemble-fuse.test.mjs -- the two new "reading-guidance threading" tests (search "DOMAIN READING GUIDANCE").

Verify, with file:line:
- ZERO-REGRESSION GUARANTEE: when the feature is OFF (no readingGuidance / injectReadingGuidance falsy), is the produced VLM prompt BYTE-IDENTICAL to before this change, on EVERY path (bare call, wireEdm call, ensemble call, probe call)? This is the load-bearing safety property -- the feature must be strictly opt-in. Trace each path and confirm. Flag any path where the default behavior changed.
- THREADING CORRECTNESS: injectReadingGuidance flows loop->runEnsembleOverImage->ocrImageWithModelAsync->buildVisionPrompt intact; the test at "reading-guidance threading" actually proves the block reaches EVERY model's request body (R9 -- would it fail if the wiring broke?).
- The append composes with wireEdm without disturbing the wireEdm output (order/prefix).
- ANTI-PATTERNS: any new import cycle (blueprint-reading-knowledge.mjs <-> ollama-vision-extract-lib.mjs)? buildReadingGuidanceBlock is pure (no I/O on the hot path)? Any inlined constant, any silent catch?
- Is the feature reachable + validatable (the pro
... [+174 chars truncated]

### Assistant | 2026-06-23T16:31:16.662Z

I'll review the wiring for U-XRAY-READING-KNOWLEDGE end-to-end. Let me read all four files in parallel.

### Assistant | 2026-06-23T16:31:17.080Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:17.973Z

[tool_use: Read]

### User | 2026-06-23T16:31:18.771Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-824 of 1081 total (27872 tokens, cap 25000). Call Read with offset=825 limit=824 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision 
... [+52802 chars truncated]

### Assistant | 2026-06-23T16:31:18.785Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:18.916Z

[tool_use: Read]

### User | 2026-06-23T16:31:19.712Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+33644 chars truncated]

### User | 2026-06-23T16:31:20.120Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/probe-vision-model.mjs
3	//
4	// U-XRAY-VISION-PROBE -- empirically test ANY vision model on a REAL print, bypassing the
5	// isThinkingTrap() pre-filter that the ensemble + bench-vision-ocr-ab use. Built because that filter
6	// ASSUMES any non-"-instruct" qwen3-vl tag is a thinking-trap and refuses to even run it, so there was
7	// no way to answer the zulu lad
... [+7982 chars truncated]

### User | 2026-06-23T16:31:20.523Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.test.mjs
2	// Tests for U-XRAY-VISION-ENSEMBLE pure fusion core. Reference values + algebraic
3	// invariants — no toBeDefined() stubs. The fusion decides a real, costly thing: which
4	// extracted dimensions are trusted as consensus ground truth vs flagged as hallucination
5	// candidates for the operator-confirm gate. Each test encodes WHY a verdict matters.
... [+31906 chars truncated]

### Assistant | 2026-06-23T16:31:24.679Z

I have all four target files. I must verify the dependency `blueprint-reading-knowledge.mjs` (the new import) — it is load-bearing for the import-cycle check, the purity check, and the "DOMAIN READING GUIDANCE" string the tests anchor on. Let me read it and confirm `buildOllamaRequestBody` puts the prompt under `body.prompt` (the test assertion depends on it).

### Assistant | 2026-06-23T16:31:25.668Z

[tool_use: Read]

### Assistant | 2026-06-23T16:31:26.362Z

[tool_use: Grep]

### User | 2026-06-23T16:31:27.420Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\blueprint-reading-knowledge.mjs' was already read 19s ago in this session and is unchanged (mtime 1782231824914). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-23T16:31:28.482Z

[tool_result] 885:export function buildOllamaRequestBody(prompt, imageBase64, opts = {}) {
886-  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
887-  return {
888-    model,
889-    prompt,
890-    images: [imageBase64],
891-    stream: false,
892-    \ format: "json" enables Ollama server-side grammar-constrained JSON decoding (GBNF). It
893-    // structurally 
... [+2150 chars truncated]

### Assistant | 2026-06-23T16:31:38.838Z

`buildOllamaRequestBody` confirms the prompt is placed at `body.prompt` (line 889), and `format` is default-off (line 900) — so the test assertions on `writeFile.parsed(0).prompt` and `!("format" in body)` are valid. The blueprint-reading-knowledge.mjs file content is already in my context from the earlier read this session, but it was NOT shown in this transcript. I must read it to verify the import-cycle, purity, and the "DOMAIN READING GUIDANCE" literal. Let me read it (the guard says it was read 19s ago — it's in the session context but not in MY visible transcript, so I'll read a fresh slice).

### Assistant | 2026-06-23T16:31:39.332Z

[tool_use: Read]

### User | 2026-06-23T16:31:41.770Z

[tool_result] 1	// scripts/lib/blueprint-reading-knowledge.mjs
2	//
3	// U-XRAY-READING-KNOWLEDGE -- ties PRISM knowledge substrates (GD&T / ASME Y14.5, shop-floor tribal
4	// callout-reading wisdom, customer conventions) INTO the live VLM extraction prompt as a BOUNDED,
5	// curated "reading guidance" block.
6	//
7	// Why a CURATED bundle, not a raw-corpus dump (R7 -- surface the conflict, do not average):
8	/
... [+8055 chars truncated]

### Assistant | 2026-06-23T16:31:45.460Z

Now I need the rest of `blueprint-reading-knowledge.mjs` — specifically `buildReadingGuidanceBlock` (the function consumed by all three callers, and where the "DOMAIN READING GUIDANCE" literal must live) plus its imports to confirm no cycle.

### Assistant | 2026-06-23T16:31:46.341Z

[tool_use: Read]

### User | 2026-06-23T16:31:48.478Z

[tool_result] 120	  let chars = 0;
121	  for (const e of candidates) {
122	    if (seen.has(e.id)) continue;
123	    if (out.length >= maxItems) break;
124	    const add = e.text.length + 3; // "- " bullet + newline budget
125	    if (out.length > 0 && chars + add > maxChars) continue; // never let the cap drop the first (highest-priority) entry
126	    out.push(e);
127	    seen.add(e.id);
128	    chars += add;
... [+870 chars truncated]

### Assistant | 2026-06-23T16:31:52.750Z

I now have every load-bearing piece. The file `blueprint-reading-knowledge.mjs` has NO imports (lines 1-40 are header + the frozen array; no `import` statement), so there is no import cycle. Let me verify that conclusively and confirm there are no other callers of `buildVisionPrompt` whose default behavior could have changed.

### Assistant | 2026-06-23T16:31:53.637Z

[tool_use: Grep]

### User | 2026-06-23T16:31:54.982Z

[tool_result] No matches found

### Assistant | 2026-06-23T16:31:55.237Z

[tool_use: Grep]

### Assistant | 2026-06-23T16:31:55.746Z

[tool_use: Grep]

### User | 2026-06-23T16:31:56.841Z

[tool_result] scripts\lib\blueprint-reading-knowledge.mjs:16:// What it deliberately does NOT repeat: rules ALREADY baked into buildVisionPrompt (the FCF left-to-right
scripts\lib\blueprint-reading-knowledge.mjs:135: * selected). The block is intentionally terse + bulleted. Pass the result as buildVisionPrompt's
scripts\lib\blueprint-reading-knowledge.test.mjs:17:import { buildVisionPrompt } from "./ollama-visi
... [+5532 chars truncated]

### User | 2026-06-23T16:32:02.537Z

[tool_result] mcp-server\data\state\session-file-ownership.json:447:    "scripts/lib/blueprint-reading-knowledge.mjs": {
mcp-server\data\state\session-file-ownership.json:459:    "scripts/lib/blueprint-reading-knowledge.test.mjs": {
scripts\probe-vision-model.mjs:27:import { buildReadingGuidanceBlock } from "./lib/blueprint-reading-knowledge.mjs";
scripts\probe-vision-model.mjs:88:  const readingGuidance = o.re
... [+2339 chars truncated]

### Assistant | 2026-06-23T16:32:36.419Z

All verification complete. Findings:

**Import cycle**: `blueprint-reading-knowledge.mjs` has ZERO imports (grep for `^import|require(` returned no matches; the file is a frozen array + pure selectors). Both `vision-ensemble-fuse.mjs:53` and `probe-vision-model.mjs:27` import FROM it; it imports from no one. No cycle possible.

**All other `buildVisionPrompt` callers** (`ocr-closed-loop.mjs:46`, `vision-ab-compare.mjs:414`, `run-ollama-vision-extract.mjs:158`) call with NO `readingGuidance` key — unaffected, byte-identical.

Let me trace the zero-regression property on each of the four named paths against the code.

**Path 1 — bare call** (`buildVisionPrompt(pc)` / `{}`): the new block is guarded by `if (typeof opts.readingGuidance === "string" && opts.readingGuidance.trim())` at `ollama-vision-extract-lib.mjs:132`. Absent/undefined → falsy → no push → identical `lines`. The wireEdm block at :124 is untouched and still pushed before. Confirmed by `blueprint-reading-knowledge.test.mjs:103-106` (bare, `{}`, `""`, `"   "` all == base).

**Path 2 — ensemble** (`ocrImageWithModelAsync`): line 502-505 — `readingGuidance = a.injectReadingGuidance ? buildReadingGuidanceBlock(...) : ""`. When `injectReadingGuidance` falsy → `""` → passed to `buildVisionPrompt(..., { wireEdm, readingGuidance: "" })` → the :132 guard's `.trim()` is empty → falsy → no append. Byte-identical.

**Path 3 — probe** (`probe-vision-model.mjs:88-89`): `readingGuidance = o.readingGuidance ? buildReadingGuidanceBlock(...) : ""`; `--reading-guidance` defaults to `has("--reading-guidance")` = false (line 62) → `""` → byte-identical.

**Path 4 — wireEdm composition**: at :124-129 wireEdm pushes its block first; the readingGuidance append at :132-134 runs AFTER, so wireEdm output is undisturbed and order is preserved. Confirmed by `blueprint-reading-knowledge.test.mjs:122-123` (wireEdm-only vs wireEdm+block).

**Threading**: `injectReadingGuidance` flows `runEnsembleOverImage` (a.injectReadingGuidance, :559
... [+3664 chars truncated]
