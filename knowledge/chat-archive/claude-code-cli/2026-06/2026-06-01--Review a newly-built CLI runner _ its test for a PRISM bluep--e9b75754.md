---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Review a newly-built CLI runner + its test for a PRISM blueprint-vision tool. Re"
date: "2026-06-01"
first_ts: "2026-06-01T16:51:41.000Z"
last_ts: "2026-06-01T16:53:14.258Z"
cwd: "H:\\prism-slot-xray"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-affebceee22199a04.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review a newly-built CLI runner + its test for a PRISM blueprint-vision tool. Re

> **claude-code-cli** | 2026-06-01 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-affebceee22199a04.jsonl`

## Transcript

### User | 2026-06-01T16:51:41.000Z

Review a newly-built CLI runner + its test for a PRISM blueprint-vision tool. Read END TO END:

1. H:\prism\scripts\page-classify.mjs  (the live actuator / CLI)
2. H:\prism\scripts\page-classify.test.mjs  (pure-report tests — 7/7 pass)

It depends on (already reviewed + PASSED, 29/29 tests): H:\prism\scripts\lib\page-classifier-lib.mjs — buildPageClassifierPrompt / buildClassifierRequestBody / parsePageClassifierResponse / decidePageVerdict (DEFAULT_VISION_MODEL, DEFAULT_CLASSIFIER_TIMEOUT_MS).

PURPOSE: a cheap drawing-vs-paperwork PAGE gate. Given a rendered page PNG, it curls Ollama /api/generate with the classifier prompt, parses the verdict, decides extract|skip. Run before the expensive full OCR extraction to skip non-drawing pages.

CONTRACT / INTENT to verify:
- TRANSPORT must mirror the proven pattern in scripts/ocr-closed-loop.mjs: curl -s --max-time <sec> <ollama>/api/generate -d @reqfile (node fetch fails on localhost Ollama). Verify the curl invocation, reqfile write+cleanup, JSON.parse(stdout).response unwrap, maxBuffer.
- LOAD-BEARING SAFETY: EVERY failure path (image not found, read error, curl non-zero, response not JSON, parse failure) must fall through to verdict:"extract" — a classifier failure must NEVER skip a page (data loss). Verify there is no failure branch that returns or defaults to "skip".
- buildClassificationReport is PURE (no I/O): verify it correctly tallies total/classified/errors/extract/skip/skip_rate/by_kind, that errors count as extract (not skip), and divide-by-zero is guarded (empty input).
- main(): arg parsing (--image/--dir/--min-confidence/--report/--json), honest exit gating (exit 2 when total>0 but classified==0, i.e. everything errored).

Flag every P0 (a failure path that could skip a page = data loss; a transport bug that would never work live; a wrong tally; a test that passes against wrong logic — R9) and P1 (real defect). Confirm the live transport would actually function (compare against ocr-closed-loop.mjs lines 
... [+415 chars truncated]

### Assistant | 2026-06-01T16:52:34.662Z

I'll review both files end-to-end against the contract. Let me read all three files (the lib too, since the CLI depends on it and I need to verify the unwrap/parse contract) plus the reference transport.

### Assistant | 2026-06-01T16:52:34.662Z

[tool_use: Read]

### Assistant | 2026-06-01T16:52:34.667Z

[tool_use: Read]

### Assistant | 2026-06-01T16:52:34.850Z

[tool_use: Read]

### Assistant | 2026-06-01T16:52:35.611Z

[tool_use: Read]

### User | 2026-06-01T16:52:37.299Z

[tool_result] read-once-guard: 'H:\prism\scripts\page-classify.mjs' was already read 11s ago in this session and is unchanged (mtime 1780332313436). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-01T16:52:37.304Z

[tool_result] read-once-guard: 'H:\prism\scripts\page-classify.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1780332375880). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-01T16:52:38.057Z

[tool_result] 1	// scripts/lib/page-classifier-lib.mjs
2	//
3	// U-PSGB-XRAY-PAGE-CLASSIFIER — drawing-vs-paperwork page classifier (pure core).
4	//
5	// THE PROBLEM this solves (overnight corpus, 2026-06-01): of 253 OCR-reachable
6	// pages, only 60 (~24%) were actual engineering drawings; 193 were non-drawing
7	// pages (cover sheets, notes pages, BOM tables, text documents) bundled into
8	// multi-page PDFs
... [+14161 chars truncated]

### User | 2026-06-01T16:52:38.676Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ocr-closed-loop.mjs
3	//
4	// U-PSGB-XRAY-CLOSED-LOOP — the OCR print-reading closed loop, end to end:
5	//   GENERATE a clean synthetic dimensioned print with KNOWN ground-truth dims
6	//   → OCR it with qwen3-vl:8b-instruct (the concurrent GPU-resident model)
7	//   → SCORE the extracted dims vs ground truth (value-recovery precision/recall/F1/MAE)
8	//   → AGG
... [+5357 chars truncated]

### Assistant | 2026-06-01T16:53:14.258Z

I have all three files plus the reference transport. The CLI and test are already in my context. Let me verify the exact transport lines in `page-classify.mjs` and the test once more by referencing what I read. I have everything needed — let me also confirm the `decidePageVerdict` import and how the CLI threads `minConfidence` through.

Both files are fully in context. Here is my end-to-end review.

---

## Review: `page-classify.mjs` + `page-classify.test.mjs`

### Transport verification (vs `ocr-closed-loop.mjs` lines 44-61, the proven reference)

`page-classify.mjs` `classifyPng()` mirrors the reference exactly:
- `b64 = readFileSync(image).toString("base64")` — same as ref L45.
- `body = buildClassifierRequestBody(buildPageClassifierPrompt(), b64, {...})` — lib-built, same pattern as ref L46.
- `writeFileSync(reqFile, JSON.stringify(body))` then `spawnSync("curl", ["-s", "--max-time", String(timeoutSec), OLLAMA, "-d", "@" + reqFile], { encoding: "utf8", maxBuffer: 64*1024*1024 })` — byte-for-byte the proven invocation (ref L48-49): `-s`, `--max-time <sec>`, URL, `-d @reqfile`, 64 MB maxBuffer.
- `try { unlinkSync(reqFile); } catch {}` — reqfile cleanup, same as ref L50.
- `JSON.parse(r.stdout).response` unwrap inside a try/catch — same as ref L53.
- `OLLAMA = (env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate"` — same endpoint resolution as ref L31.

The live transport would function. The `curl exit=56` cold-load fall-through to `extract` you observed is the intended failure path, confirming it.

### Safety verification (every failure path → `extract`)

I traced all five failure branches in `classifyPng()`:
1. image not found (`!existsSync`) → `{ error, verdict: "extract" }`
2. read/base64 error (catch around `readFileSync`) → `{ error, verdict: "extract" }`
3. curl non-zero (`r.status !== 0`) → `{ error: "curl exit=...", verdict: "extract" }`
4. `JSON.parse(r.stdout)` throw / empty response → `{ error, verdict: "extract" }`
5. `parsePageClassifierRes
... [+3300 chars truncated]
