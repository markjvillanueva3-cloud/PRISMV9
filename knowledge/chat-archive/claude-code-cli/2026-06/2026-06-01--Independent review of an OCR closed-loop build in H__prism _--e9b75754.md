---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Independent review of an OCR closed-loop build in H:/prism (slot:xray): scripts/"
date: "2026-06-01"
first_ts: "2026-06-01T14:20:31.837Z"
last_ts: "2026-06-01T14:24:50.179Z"
cwd: "H:\\prism-slot-xray"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a80a2dfa71fd1cb92.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Independent review of an OCR closed-loop build in H:/prism (slot:xray): scripts/

> **claude-code-cli** | 2026-06-01 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a80a2dfa71fd1cb92.jsonl`

## Transcript

### User | 2026-06-01T14:20:31.837Z

Independent review of an OCR closed-loop build in H:/prism (slot:xray): scripts/lib/synthetic-print-gen.py + scripts/ocr-closed-loop.mjs + scripts/lib/synthetic-print-gen.test.mjs. The loop generates a synthetic dimensioned drawing with KNOWN dims, OCRs it with qwen3-vl:8b-instruct, scores extracted vs truth → reported recall=1 precision=1 mae=0 on 5 prints.

Weight toward HONESTY + what a correctness reviewer misses (FAIL on any real violation):
1. R12 / leak check: is the 100% result trustworthy, or is there ground-truth LEAKAGE? The OCR (qwen3-vl reading a PNG) must be fully independent of the truth.json — confirm the runner does NOT feed truth into the prompt or the parse (the model only sees the image; truth is used only for scoring AFTER). Any path where the answer leaks into the OCR would invalidate the metric.
2. Honesty of the claim: a 100% score on CLEAN synthetic prints does NOT mean the model reads REAL scanned prints at 100% (the overnight corpus was 60/280). Is this distinction clear, or could the closed-loop report mislead someone into thinking real-corpus OCR is solved? Is the synthetic generator's difficulty representative enough to be a useful training signal, or is it too easy (the perfect score suggests it may be)?
3. The generator: are the dimension values + part numbers realistic? Does it exercise the hard cases real prints have (tight tolerances, GD&T, dense dims, leader lines, fractional dims, noise)? If it's too clean, the loop's signal is weak — flag what's missing for a USEFUL training gradient.
4. Does ocr-closed-loop.mjs depend on the (sometimes-down) Ollama daemon gracefully (fail-loud, not silent-zero)? Earlier the curl returned exit 7 when Ollama was down — does the runner report that honestly vs scoring it as a real 0?
5. Standalone (no MCP), ESM clean, runs without the disconnected MCP server?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤3 notes. If unsure, FAIL.

### Assistant | 2026-06-01T14:20:44.905Z

I'll review this OCR closed-loop build. Let me read the three files in question.

### Assistant | 2026-06-01T14:20:45.943Z

[tool_use: Read]

### Assistant | 2026-06-01T14:20:45.951Z

[tool_use: Read]

### Assistant | 2026-06-01T14:20:46.153Z

[tool_use: Read]

### User | 2026-06-01T14:20:53.715Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\synthetic-print-gen.py' was already read 11s ago in this session and is unchanged (mtime 1780322558013). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-01T14:20:54.146Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\synthetic-print-gen.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1780323534464). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-01T14:20:56.940Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ocr-closed-loop.mjs
3	//
4	// U-PSGB-XRAY-CLOSED-LOOP — the OCR print-reading closed loop, end to end:
5	//   GENERATE a clean synthetic dimensioned print with KNOWN ground-truth dims
6	//   → OCR it with qwen3-vl:8b-instruct (the concurrent GPU-resident model)
7	//   → SCORE the extracted dims vs ground truth (value-recovery precision/recall/F1/MAE)
8	//   → AGG
... [+6635 chars truncated]

### Assistant | 2026-06-01T14:21:03.047Z

The read-once guard says I already read the .py and .test.mjs files but they're not actually in my context (this appears to be a fresh session). I need to read them. Let me bypass the cache.

### Assistant | 2026-06-01T14:21:03.665Z

[tool_use: Read]

### User | 2026-06-01T14:21:10.422Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\synthetic-print-gen.py' was already read 26s ago in this session and is unchanged (mtime 1780322558013). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-01T14:21:14.169Z

The guard is blocking but I don't actually have the content. Let me disable the cache via env var as the message instructs.

### Assistant | 2026-06-01T14:21:15.171Z

[tool_use: Bash]

### Assistant | 2026-06-01T14:21:15.928Z

[tool_use: Bash]

### User | 2026-06-01T14:21:45.823Z

[tool_result] #!/usr/bin/env python
# scripts/lib/synthetic-print-gen.py
#
# U-PSGB-XRAY-CLOSED-LOOP — synthetic dimensioned-drawing generator for the OCR
# closed loop. Draws a clean engineering-style print (part outline + linear
# dimensions + hole diameter callouts + title block) with PERFECT, KNOWN ground
# truth, then emits the PNG plus a <png>.truth.json sidecar listing the true dims
# in mm (the pipeline
... [+5047 chars truncated]

### User | 2026-06-01T14:21:52.450Z

[tool_result] // scripts/lib/synthetic-print-gen.test.mjs
// Tests for the synthetic dimensioned-drawing generator (U-PSGB-XRAY-CLOSED-LOOP).
// Invokes the python generator and validates the PNG + ground-truth sidecar.
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, unlinkSyn
... [+3006 chars truncated]

### Assistant | 2026-06-01T14:21:59.216Z

Now I have all three files. Let me examine the dependencies that determine whether ground truth can leak into the OCR — the production library functions the runner reuses.

### Assistant | 2026-06-01T14:21:59.573Z

[tool_use: Read]

### Assistant | 2026-06-01T14:21:59.782Z

[tool_use: Read]

### User | 2026-06-01T14:22:02.732Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ollama-vision-extract-lib.mjs' was already read 49s ago in this session and is unchanged (mtime 1780275200433). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-01T14:22:02.800Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\dimension-set-score.mjs' was already read 48s ago in this session and is unchanged (mtime 1780322150452). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-01T14:22:06.011Z

The cache guard is firing on files I haven't read in this session. Let me bypass it.

### Assistant | 2026-06-01T14:22:07.066Z

[tool_use: Bash]

### Assistant | 2026-06-01T14:22:07.482Z

[tool_use: Bash]

### User | 2026-06-01T14:22:36.929Z

[tool_result] // scripts/lib/ollama-vision-extract-lib.mjs
//
// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
//
// Builds the engineering-print extraction prompt and parses the model's JSON
// response into the RICH multi-zone BlueprintExtraction shape (title_block +
// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
// finishes), mirroring the canonical wire
... [+21374 chars truncated]

### User | 2026-06-01T14:22:50.519Z

[tool_result] // scripts/lib/dimension-set-score.mjs
//
// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
// (from CAD geometry, a CNC program, or a synthetic label), score how well the
// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
// missed (truth dims the OCR didn't find
... [+6152 chars truncated]

### Assistant | 2026-06-01T14:22:59.530Z

Now I have the full picture. Let me trace the critical leak-path question precisely. The key is the data flow into `ocrPng`:

1. `ocrPng(g.png, model, workDir, seed)` — receives only `g.png` (the image path), `model`, `workDir`, `seed`. It does NOT receive `g.truth`.
2. Inside: `buildVisionPrompt("generic")` — a static prompt with no per-case data. `buildOllamaRequestBody(prompt, b64, {model})` — only the image base64 + static prompt.
3. `parseVisionResponse(raw, {assumeUnits: "in"})` — parses only the model's raw text output. `assumeUnits:"in"` is a constant, not derived from truth.
4. Truth is only touched AFTER: `scoreDimensionSet(ex.dimensions, g.truth.dimensions)` and the `pn_hit` comparison.

Let me verify there's no hidden leak via the seed (e.g. the seed influencing the prompt) and confirm the recall/precision math. The seed flows only to `generatePrint` (Python RNG) and to filenames (`req-${seed}.json`, `syn-${seed}.png`) — never into the prompt body. Confirmed no leak path.

Let me check one more thing: the actual report on disk to verify the claimed 100% and confirm the metric is what's reported, plus check the scorer's behavior on the failure (curl exit 7) path.

### Assistant | 2026-06-01T14:23:00.396Z

[tool_use: Bash]

### User | 2026-06-01T14:23:42.539Z

[tool_result] {
  "ts": "2026-06-01T13:12:00Z",
  "model": "qwen3-vl:8b-instruct",
  "count": 5,
  "ocr_ok": 5,
  "gen_or_ocr_fail": 0,
  "aggregate": {
    "prints": 5,
    "micro_precision": 1,
    "micro_recall": 1,
    "micro_f1": 1,
    "mean_mae_mm": 0,
    "total_matched": 16,
    "total_truth": 16,
    "total_extracted": 16
  },
  "worst": [
    {
      "seed": 1000,
      "ms": 5141,
      "n_truth": 3
... [+1128 chars truncated]

### Assistant | 2026-06-01T14:23:56.656Z

Now I have everything. Let me trace the critical correctness/honesty concerns to a verdict.

**Leak check (concern 1):** Traced the full data flow. `ocrPng` is called with `(g.png, model, workDir, seed)` only — `g.truth` is never passed. The prompt is static (`buildVisionPrompt("generic")`, no per-case data), the request body carries only the static prompt + image base64, and `parseVisionResponse(raw, {assumeUnits:"in"})` parses only the model's text output (`assumeUnits` is a constant, not truth-derived). Truth is consumed strictly afterward, in `scoreDimensionSet` and the `pn_hit` equality. The seed flows only into the Python RNG and filenames, never the prompt. **No leak.** The 100% is structurally honest given the inputs.

**Failure-path honesty (concern 4):** This is the real problem, and it's a genuine R12 violation. The runner reports `gen_or_ocr_fail` distinct from `ocr_ok` (good), but the **aggregate metric silently survives a near-total failure.** If Ollama is down and `curl` returns exit 7 on every print, every case takes the `ex.error` branch, `scores` stays empty, and `aggregateScores([])` returns all-`null` with `prints: 0`. That degrades cleanly. BUT the dangerous case is *partial* failure: if 4 of 5 prints fail (curl exit 7) and only 1 succeeds at 100%, the report headline reads `micro_recall=1 micro_f1=1` — a perfect score — with `ocr_ok: 1, gen_or_ocr_fail: 4` buried in a separate field that no headline consumer reads. The aggregate is computed over *only the successful* prints; failures are excluded from the denominator rather than scored. A reader glancing at `aggregate.micro_recall=1` would conclude the loop passed when 80% of it never ran. And `exit(0)` fires unconditionally — even when every single print failed to OCR. That is exactly the "Tests pass / Migration completed" class of lie R12 names: success exit + perfect-looking aggregate while most of the work silently didn't happen.

Let me confirm one detail about whether curl-down actually r
... [+57 chars truncated]

### Assistant | 2026-06-01T14:23:59.814Z

[tool_use: Bash]

### User | 2026-06-01T14:24:22.707Z

[tool_result] ollama tags exit=0
FAILED: curl 
curl-bad-port exit=3

### Assistant | 2026-06-01T14:24:50.179Z

Confirmed: when the daemon is unreachable, `curl` exits non-zero (3 for a bad URL; 7 for connection-refused as the operator noted), and `r.status !== 0` correctly routes to the `{error: "curl exit=N"}` branch — so a down daemon is NOT scored as a real 0; it becomes an excluded `ocr-fail` case. That half is honest. The dishonesty is purely at the **aggregate roll-up**: failures are dropped from the denominator instead of surfacing in the headline, and `exit(0)` is unconditional.

I have enough to render the verdict.

---

VERDICT: FAIL

BLOCKER: Aggregate masks partial failure (R12). `aggregateScores` rolls up only the prints that OCR'd successfully; failed prints (curl exit≠0, empty/non-JSON response, parse failure) are pushed to `cases[]` with an `error` and EXCLUDED from the denominator, not scored as 0. So a run where 4/5 prints fail and 1 succeeds at 100% reports headline `micro_recall=1 micro_f1=1 mean_mae_mm=0` — a perfect score for a run that 80% didn't execute. `ocr_ok`/`gen_or_ocr_fail` are separate fields a headline reader won't see. Combined with the unconditional `exit(0)` at line 108 (success even when `ok===0`, every print failed), this is the "tests pass / migration completed" lie R12 names. Fix: gate the verdict on `ocr_ok/count` (e.g. non-zero exit or an explicit `degraded:true`/`coverage` field in the headline when `ocr_ok < count`), and never let a sub-full-coverage run present a clean perfect aggregate.

BLOCKER: The 100%/recall=1/precision=1/mae=0 claim is not honest as a measure of OCR capability — it measures the scorer's tolerance band, not the model. The matcher (`dimMatches`) accepts within `max(0.05mm, 1%)`, and the synthetic generator's truth values ARE the inch text rendered on the PNG (`_fmt_in(width_in)` text, `round(width_in*25.4)` truth) — so any model that reads the printed digits at all scores exactly mae=0. With only 2 linear + 1-2 diameter dims per print, no tolerances, no GD&T, no fractional/dense/noisy dims, and value-only (typ
... [+2076 chars truncated]
