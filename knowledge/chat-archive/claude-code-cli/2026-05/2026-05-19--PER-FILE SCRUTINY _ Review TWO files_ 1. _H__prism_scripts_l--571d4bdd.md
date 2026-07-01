---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "PER-FILE SCRUTINY — Review TWO files: 1. `H:\\prism\\scripts\\lib\\blueprint-extract"
date: "2026-05-19"
first_ts: "2026-05-19T05:01:32.325Z"
last_ts: "2026-05-19T05:02:31.887Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-afc9cc12e394e27be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# PER-FILE SCRUTINY — Review TWO files: 1. `H:\prism\scripts\lib\blueprint-extract

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-afc9cc12e394e27be.jsonl`

## Transcript

### User | 2026-05-19T05:01:32.325Z

PER-FILE SCRUTINY — Review TWO files:
1. `H:\prism\scripts\lib\blueprint-extract-io.mjs` (I/O orchestrator)
2. `H:\prism\scripts\run-ocr-benchmark.mjs` (U-TDP04 benchmark CLI, NEWLY WIRED with the cascade)

Context: U-TDP07 (BLUEPRINT-OCR-TRAINING-MS2). The I/O wrapper calls the Python sidecar (`blueprint-extract-sidecar.py`) for PDF text+raster extraction, then optionally calls Ollama qwen2.5-vl:7b for VLM-based feature presence detection on raster pages, then merges via the pure-core lib. The benchmark CLI now imports `makeCascadeExtractor` + `prewarmVlm` from the I/O wrapper.

Exports in scope (`blueprint-extract-io.mjs`): `runSidecar`, `callOllamaVlm`, `extractBlueprint`, `prewarmVlm`, `makeCascadeExtractor`.
Changes in scope (`run-ocr-benchmark.mjs`): new `--no-vlm` arg, `makeLiveExtractor` now returns the cascade (not null), prewarm step inserted before the walk.

Live smoke results this session:
- stub-mode: 11/11 classes pass (wiring intact)
- vector-only (--no-vlm) on real electrode PDF: 0/1 pass (honest — electrode text has no Ø/DIA/HOLE keywords; expected miss)
- full cascade on electrode with cold-load: 184s, VLM-aborted at timeout (cold-load = 110s; with my new 240s VLM_TIMEOUT_MS this should be covered)
- direct VLM call when warm: 14.8s, correctly emitted `["stepped_revolved_axis"]` for the electrode

Flag P0/P1/P2 with line numbers + concrete fix recommendations on:
1. **`extractBlueprint` failure-mode honesty**: sidecar-fail, VLM-fail, no-kinds-detected, missing-pdf_path — all should populate `notes[]` and never throw. Confirm by walking the code paths.
2. **`callOllamaVlm` timeout handling**: AbortController + clearTimeout pattern is correct? No timer leak on success path? No double-fire?
3. **`prewarmVlm` keep_alive sticking**: passes `keep_alive: "30m"` by default. Will this actually pin the model OR can other model loads still evict it? The orchestrator can't fix VRAM pressure but should at least document.
4. **`run-ocr-benchmark.mjs` prewarm fl
... [+864 chars truncated]

### Assistant | 2026-05-19T05:01:40.338Z

I'll review both files end-to-end with focus on the load-bearing failure modes.

### Assistant | 2026-05-19T05:01:40.774Z

[tool_use: Read]

### User | 2026-05-19T05:01:43.491Z

[tool_result] 1	// scripts/lib/blueprint-extract-io.mjs
2	//
3	// U-TDP07 - I/O orchestrator for the blueprint OCR cascade.
4	//
5	// Stitches three boundaries:
6	//   1) python sidecar  (PyMuPDF text+raster) ─┐
7	//                                              ├─► pure core (blueprint-extractor-lib.mjs)
8	//   2) Ollama          (qwen2.5-vl:7b VLM)   ─┘
9	//   3) U-TDP04 benchmark contract:
10	//        extrac
... [+14884 chars truncated]

### Assistant | 2026-05-19T05:01:46.474Z

[tool_use: Read]

### User | 2026-05-19T05:01:49.044Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/run-ocr-benchmark.mjs
3	//
4	// U-TDP04 — OCR Extraction Benchmark CLI shell.
5	//
6	// Reads a ground-truth JSON catalog, runs the extraction adapter on each
7	// listed print, compares results, emits per-class precision/recall/F1 +
8	// dimensional error percentiles. The "prove we can extract correct data"
9	// gate that decides whether to progress from print-r
... [+7946 chars truncated]

### Assistant | 2026-05-19T05:02:31.887Z

## Code Quality Analysis Report — U-TDP07 I/O orchestrator + benchmark CLI wiring

### Summary
- Files Analyzed: 2
- Both files: **PASS** (no P0/P1 blockers)
- P2 findings: 4

---

### File 1: `H:\prism\scripts\lib\blueprint-extract-io.mjs` — **PASS**

**1. `extractBlueprint` failure-mode honesty** (L177-266) — VERIFIED HONEST.
- missing-pdf_path L182-187 (returns, never throws)
- sidecar-spawn-failed L194-197 (try/catch around `runSc`)
- sidecar-ok-false L198-202 (with warnings appended)
- VLM per-page failure L233-236 (try/catch INSIDE the page loop — does NOT abort the walk; the merge L240 still runs with `vlm=null`, vector signal alone survives)
- no-kinds-detected L253-255 (only when notes is empty — correct: don't double-note)
- All paths return a structured `{dimensions, source:"live-cascade", notes, per_page, raw_kinds}`. R12 honest.

**2. `callOllamaVlm` timeout** (L116-159) — CORRECT.
- AbortController paired with single `setTimeout`; `clearTimeout(timer)` in `finally` covers success, throw, and abort. No timer leak. No double-fire (timer is one-shot, abort is idempotent on already-aborted controller). Success path returns from `try`, `finally` clears timer before return resolves.

**3. `prewarmVlm` keep_alive** (L278-321) — CORRECT but **P2: document VRAM eviction**.
- `keep_alive:"30m"` only TELLS Ollama to keep it loaded; another model request to the same Ollama server (nomic-embed-text, qwen2.5-coder, etc.) WILL evict on a 16GB VRAM 4080 since qwen2.5-vl:7b takes 15.4GB. Reference the existing comment block L53-60 in the prewarm docstring, or recommend setting `OLLAMA_MAX_LOADED_MODELS=1` for benchmark runs.

**4. SIDECAR_MAX_BUFFER** (L64) — OK. 128MB > 80MB b64 cap + JSON envelope (≈107MB worst-case at 1.33× b64 expansion). Headroom adequate.

**5. Per-page error isolation** — CORRECT. The `try/catch` is inside the `for (const page of sc.pages)` loop body L227-236, so a page-1 VLM throw is caught, noted, page-2 iterates normally.

**6. P2 — `runSidec
... [+3148 chars truncated]
