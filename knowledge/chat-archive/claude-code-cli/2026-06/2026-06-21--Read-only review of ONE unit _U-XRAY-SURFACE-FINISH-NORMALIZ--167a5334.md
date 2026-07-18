---
type: "chat-session"
source: "claude-code-cli"
session_id: "167a5334-51e0-44fa-a725-0b1efccb4ef7"
title: "Read-only review of ONE unit (U-XRAY-SURFACE-FINISH-NORMALIZE, slot:xray). Grade"
date: "2026-06-21"
first_ts: "2026-06-21T01:40:04.605Z"
last_ts: "2026-06-21T01:42:38.694Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 18
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/167a5334-51e0-44fa-a725-0b1efccb4ef7/subagents/agent-a231b82658864e3ab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Read-only review of ONE unit (U-XRAY-SURFACE-FINISH-NORMALIZE, slot:xray). Grade

> **claude-code-cli** | 2026-06-21 | 46 msgs (18 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/167a5334-51e0-44fa-a725-0b1efccb4ef7/subagents/agent-a231b82658864e3ab.jsonl`

## Transcript

### User | 2026-06-21T01:40:04.605Z

Read-only review of ONE unit (U-XRAY-SURFACE-FINISH-NORMALIZE, slot:xray). Grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Do NOT edit.

UNIT SPEC: A pure surface-finish callout normalizer added to the shared Ollama-vision OCR extraction lib, to recover surface-finish callouts the VLM emits as TEXT (e.g. "63 RMS", "125 µin", "N6", "Ra 0.8") that the extractor previously dropped (it read only a numeric ra_um). It must convert to a canonical Ra in micrometres using EXACT/chart-canonical conversions, and must NEVER silently guess an ambiguous unit (R12) — a bare number not in the ISO preferred series stays resolved:false.

FILES (read both end-to-end):
1. H:/prism/scripts/lib/ollama-vision-extract-lib.mjs — review the NEW additions: `normalizeSurfaceFinish()`, `ISO_N_GRADE_RA_UM`, `RA_UM_PREFERRED`, `RA_UIN_PREFERRED`, `round4`, the `sfRaValue()` helper, and the wiring into `extractSurfaceFinish()` (surface_finishes channel) and `extractDimension()` (the `surface_finish_ra:` line).
2. H:/prism/scripts/lib/ollama-vision-extract-lib.test.mjs — the new `normalizeSurfaceFinish` / `parseVisionResponse` round-trip tests.

FOCUS (your arm — silent breakage / regression / correctness):
- Conversion math: microinch->micrometre = value*(MM_PER_INCH/1000)=value*0.0254 (63 µin=1.6002 µm; 125=3.175; 32=0.8128). Verify every branch.
- RMS handling: is treating the RMS number as its microinch Ra-equivalent (no /1.11) defensible + documented? Any safety risk for downstream consumers (WEDM skim passes read ra_um)?
- The bare-number disambiguation via ISO preferred series: any value in BOTH RA_UM_PREFERRED and RA_UIN_PREFERRED (would be ambiguous)? Any common real callout misclassified?
- Regex correctness: the micron-sign matching uses literal µ (U+00B5) and μ (U+03BC); the word-anchored unit detection (\bin\b style). Does a unit substring inside a word ("ruin","aluminum") falsely resolve? Does the ISO N-grade regex correctly reject N13/N0?
- Did the change BREAK the e
... [+552 chars truncated]

### Assistant | 2026-06-21T01:40:09.101Z

I'll review this unit thoroughly. Let me start by reading both files end-to-end.

### Assistant | 2026-06-21T01:40:09.519Z

[tool_use: Read]

### Assistant | 2026-06-21T01:40:09.859Z

[tool_use: Read]

### User | 2026-06-21T01:40:10.985Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+41738 chars truncated]

### User | 2026-06-21T01:40:11.351Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.test.mjs
2	// Tests for the rich multi-zone Ollama vision extractor pure core
3	// (U-TDP06 + U-PSGB-XRAY-RICH-SCHEMA). Run: node --test <file>
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	
8	import {
9	  buildVisionPrompt,
10	  parseVisionResponse,
11	  buildOllamaRequestBody,
12	  repairTruncatedJson,
13	  repairLe
... [+37043 chars truncated]

### Assistant | 2026-06-21T01:40:14.375Z

Both files read end-to-end. Now let me verify the conversion math, run the tests, and trace the consumers to check for silent breakage.

### Assistant | 2026-06-21T01:40:15.789Z

[tool_use: Bash]

### Assistant | 2026-06-21T01:40:17.675Z

[tool_use: Bash]

### User | 2026-06-21T01:40:20.590Z

[tool_result]   ...
# Subtest: parseVisionResponse: text surface-finish callouts recovered to ra_um
ok 78 - parseVisionResponse: text surface-finish callouts recovered to ra_um
  ---
  duration_ms: 0.1882
  ...
# Subtest: parseVisionResponse: dimension.surface_finish_ra string callout normalized
ok 79 - parseVisionResponse: dimension.surface_finish_ra string callout normalized
  ---
  duration_ms: 0.1749
  ...

... [+104 chars truncated]

### User | 2026-06-21T01:40:24.759Z

[tool_result] 63 uin -> 1.6002
125 uin -> 3.175
32 uin -> 0.8128
250 uin -> 6.35
100 uin -> 2.54
1000 uin -> 25.4
2000 uin -> 50.8

### Assistant | 2026-06-21T01:40:27.524Z

79/79 pass and the conversion math is exact. Now let me check the ambiguity question (any value in both preferred sets) and trace the consumers for shape breakage.

### Assistant | 2026-06-21T01:40:31.769Z

[tool_use: Bash]

### Assistant | 2026-06-21T01:40:32.473Z

[tool_use: Grep]

### User | 2026-06-21T01:40:36.492Z

[tool_result] values in BOTH sets: []
0.4 um  
0.8 um  
1.6 um  
3.2 um  
6.3 um  
16  uin 
32  uin 
63  uin 
125  uin 
0.05 um  
0.025 um  
0.32   UNRESOLVED
0.63   UNRESOLVED
1.25   UNRESOLVED
2.5   UNRESOLVED
5   UNRESOLVED
10   UNRESOLVED
100   ->uin(>50)

### User | 2026-06-21T01:40:38.448Z

[tool_result] Found 15 files
scripts\lib\ollama-vision-extract-lib.test.mjs
scripts\lib\ollama-vision-extract-lib.mjs
scripts\probe-vision-model.mjs
scripts\lib\vision-model-select.mjs
scripts\lib\vision-ensemble-fuse.mjs
scripts\lib\page-classifier-lib.mjs
scripts\run-ollama-vision-extract.mjs
.claude\hooks\__tests__\ollama-nav-enforce-inject.test.mjs
scripts\batch-ollama-vision-extract.mjs
scripts\bench-visio
... [+188 chars truncated]

### Assistant | 2026-06-21T01:40:43.532Z

No overlap between the preferred sets (clean disambiguation), and common metric Ra callouts like 0.32/0.63/1.25/2.5 correctly stay UNRESOLVED rather than being misclassified. Now let me trace how the consumers read the surface_finish fields to check for silent shape breakage.

### Assistant | 2026-06-21T01:40:43.817Z

[tool_use: Grep]

### User | 2026-06-21T01:40:45.842Z

[tool_result] <persisted-output>
Output too large (22.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\167a5334-51e0-44fa-a725-0b1efccb4ef7\tool-results\toolu_01GB2cpQQXjY8u2Rt4kTvMNw.txt

Preview (first 2KB):
scripts\course-to-tribal-tips.mjs-57-\ The valid members are: setup, tooling, speeds_feeds, fixturing,
scripts\course-to-tribal-tips.mjs:58:// surface_finish, thread, safety, maintenan
... [+1808 chars truncated]

### Assistant | 2026-06-21T01:40:49.257Z

Let me look at the actual consumers of the extraction output — specifically how `surface_finishes` and `surface_finish_ra` are read downstream in the key consumers (ocr-closed-loop, vision-ensemble-fuse, dimension-set-score, blueprint-extract-io).

### Assistant | 2026-06-21T01:40:50.682Z

[tool_use: Grep]

### Assistant | 2026-06-21T01:40:51.729Z

[tool_use: Grep]

### Assistant | 2026-06-21T01:40:53.026Z

[tool_use: Grep]

### User | 2026-06-21T01:40:53.190Z

[tool_result] No matches found

### Assistant | 2026-06-21T01:40:53.798Z

[tool_use: Grep]

### User | 2026-06-21T01:40:53.883Z

[tool_result] No matches found

### User | 2026-06-21T01:40:56.146Z

[tool_result] No matches found

### User | 2026-06-21T01:40:56.526Z

[tool_result] No matches found

### Assistant | 2026-06-21T01:41:01.110Z

None of the key consumers read `surface_finish` fields at all, so the additive fields can't break them by shape. Let me confirm how `vision-ensemble-fuse.mjs` and `dimension-set-score.mjs` iterate the extraction (to be sure they don't blanket-spread/serialize in a way the new fields would disrupt) and check `extractDimension`'s `surface_finish_ra` regression path more directly.

### Assistant | 2026-06-21T01:41:03.467Z

[tool_use: Grep]

### Assistant | 2026-06-21T01:41:04.627Z

[tool_use: Grep]

### User | 2026-06-21T01:41:06.689Z

[tool_result] scripts\lib\vision-ensemble-fuse.mjs:135:    for (const raw of dims) {
scripts\lib\vision-ensemble-fuse.mjs:185: *        (extraction.dimensions is the per-model dim list — the parseVisionResponse shape).
scripts\lib\vision-ensemble-fuse.mjs:208:    dims: Array.isArray(r.extraction.dimensions) ? r.extraction.dimensions : [],
scripts\lib\vision-ensemble-fuse.mjs:276:  for (const d of dimensions) hi
... [+360 chars truncated]

### User | 2026-06-21T01:41:08.384Z

[tool_result] scripts\lib\vision-ensemble-fuse.mjs:21://       real dim) → surfaced low-trust for the operator-confirm gate, never silently kept
scripts\lib\vision-ensemble-fuse.mjs:109: * Pure: cluster dimensions across N models into agreement groups.
scripts\lib\vision-ensemble-fuse.mjs:185: *        (extraction.dimensions is the per-model dim list — the parseVisionResponse shape).
scripts\lib\vision-ensemble
... [+1852 chars truncated]

### Assistant | 2026-06-21T01:41:13.046Z

`vision-ensemble-fuse` only reads `extraction.dimensions` and clusters on dim fields — it ignores `surface_finishes` and the new dim sub-field entirely, so no shape break. The fusion operates on per-dim properties; `surface_finish_ra` was already a field on dimensions (now possibly a normalized value instead of raw string). Let me verify that the pre-change behavior of `surface_finish_ra` is preserved/improved, not regressed, and check the ISO N-grade regex edge cases (N0, N13, leading-char collision) directly.

### Assistant | 2026-06-21T01:41:19.350Z

[tool_use: Bash]

### User | 2026-06-21T01:41:24.589Z

[tool_result] "N0"                   ra_um=null     sys=null    resolved=false assumed=false
"N13"                  ra_um=null     sys=null    resolved=false assumed=false
"N1"                   ra_um=0.025    sys=ISO-N   resolved=true assumed=false
"N12"                  ra_um=50       sys=ISO-N   resolved=true assumed=false
"N6"                   ra_um=0.8      sys=ISO-N   resolved=true assumed=false
"N 6"   
... [+2479 chars truncated]

### Assistant | 2026-06-21T01:41:29.919Z

This surfaces several findings worth examining. Let me dig into the most concerning ones: the material-designation `D2` collision and the `Rq` handling, and check whether the `surface_finishes` channel ever passes a material/raw_text that could trip these. Let me look at how `extractSurfaceFinish` is reached vs `extractDimension.surface_finish_ra` — the entry points matter for blast radius.

### Assistant | 2026-06-21T01:41:37.017Z

[tool_use: Bash]

### User | 2026-06-21T01:41:43.025Z

[tool_result] "60 HRC"       ra_um=1.524     sys=Ra-uin  resolved=true
"Rc 60"        ra_um=1.524     sys=Ra-uin  resolved=true
"RC60"         ra_um=1.524     sys=Ra-uin  resolved=true
"HRC 62"       ra_um=1.5748    sys=Ra-uin  resolved=true
"2X"           ra_um=0.0508    sys=Ra-uin  resolved=true
"M6"           ra_um=null      sys=null    resolved=false
"1/4-20"       ra_um=0.0254    sys=Ra-uin  resolved=true

... [+231 chars truncated]

### Assistant | 2026-06-21T01:41:47.956Z

This confirms a key point about the blast radius: these collisions (`60 HRC` → 1.524 um, `1/4-20` → 0.0254 um) only matter if such a string actually reaches `normalizeSurfaceFinish`. Let me confirm the two entry points are tightly scoped — they receive only `surface_finishes[].raw_text` (a finish-channel field) and `dimensions[].surface_finish_ra` (a finish field), NOT arbitrary notes/material. Let me also check git history to confirm this is the actual diff under review and there are no other changed call sites.

### Assistant | 2026-06-21T01:41:50.183Z

[tool_use: Bash]

### User | 2026-06-21T01:41:56.403Z

[tool_result] 40b613afa7 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-FORMAT-JSON-WIRE: thread format:json constrained-decode into the production training ensemble
84a78522f8 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-STEPPED-BORE-PROMPT (slot:xray): extraction prompt now captures far-side smaller IDs + lead-in chamfers on stepped bores
9b61cfb734 [MAIN-FORCE] [INDIA-AI-OUTCOME]/U-XPROC-LEDGER-DURABLE-HARDEN (slo
... [+2895 chars truncated]

### Assistant | 2026-06-21T01:42:02.688Z

Confirmed: the normalizer is wired only at the two scoped finish-channel sites (lines 318, 390), both of which receive finish-specific fields, not arbitrary notes/material strings. The diff is exactly the two files described.

Now let me verify the critical regression question: does a model-provided numeric `ra_um` still take primacy over normalized raw_text, and does the legacy numeric path stay intact? The code at line 383-391 guards `if (ra == null && raw != null)`, so numeric primacy holds (test 78 confirms `sf[2].ra_um===0.4`, untagged). And `sfRaValue` (line 288-296) returns the numeric immediately if present.

Let me do one final check on the `0` edge case (ra_um:0 is falsy but valid `asNum` returns 0) and the `value < 0` guard interplay, plus confirm the `surface_finishes` channel when raw is unresolvable doesn't accidentally null an existing value.

### Assistant | 2026-06-21T01:42:09.851Z

[tool_use: Bash]

### User | 2026-06-21T01:42:15.776Z

[tool_result] ra_um:0 -> {"ra_um":0,"location":null,"raw_text":"polished"}
unresolvable raw -> {"ra_um":null,"location":"x","raw_text":"Ra 10"}
dim sfr:0 -> 0
dim sfr unresolvable str -> null

### Assistant | 2026-06-21T01:42:38.694Z

All edge cases behave safely: numeric primacy holds, `ra_um:0` is preserved (no fabrication), unresolvable raw_text stays null (no silent guess), and unresolvable dim strings return null (matching the pre-change `asNum(string)===null` behavior — no regression). The investigation is complete.

VERDICT: PASS

summary: The surface-finish normalizer is a clean, purely-additive change. Conversion math is exact (verified: 63 µin=1.6002, 125=3.175, 32=0.8128 µm); the ISO preferred-series sets have zero overlap (no ambiguous value); the two wiring sites are tightly scoped to finish-channel fields; numeric `ra_um`/`surface_finish_ra` primacy is preserved (no regression to the legacy numeric path); and unresolvable callouts stay `resolved:false`/`null` rather than silently guessing (R12 honored). 79/79 tests pass. The new fields (`ra_um_source`, `finish_system`, `ra_um_assumed`) are additive and no downstream consumer (ocr-closed-loop, vision-ensemble-fuse, dimension-set-score, blueprint-extract-io) reads them or the `surface_finishes` channel, so no shape break is possible.

findings:
- [P2] `H:/prism/scripts/lib/ollama-vision-extract-lib.mjs:263` -- The `hasRms` regex matches `\brq\b`, so an input like `"Rq 0.4"` (a genuine RMS-family root-mean-square callout) is mapped via `uin(value)` and yields `0.0102 µm` (treating `0.4` as 0.4 microinch). For an `Rq` callout already in micrometres this is a 25.4x under-scale. This is a low-probability path (a drawing rarely prints a bare `Rq` with no unit in the finish channel, and Rq != Ra anyway), and it cannot reach arbitrary text -- only `surface_finishes[].raw_text` / `dimensions[].surface_finish_ra`. Trigger is narrow; behavior is "wrong-but-flagged-as-RMS" not silent. Consider: only treat `rq`/`rms` as microinch when no explicit µm token is present, or drop the `\brq\b` alias since Rq has no clean Ra equivalence. -- Not blocking; documented RMS doctrine (line 212-214) is defensible for the RMS case itself.
- [P2] `H:/prism/scrip
... [+1516 chars truncated]
