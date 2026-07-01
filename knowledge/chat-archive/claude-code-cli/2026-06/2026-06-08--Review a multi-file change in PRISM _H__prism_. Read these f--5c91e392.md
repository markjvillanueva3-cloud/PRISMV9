---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Review a multi-file change in PRISM (H:/prism). Read these files END-TO-END and "
date: "2026-06-08"
first_ts: "2026-06-08T16:05:56.588Z"
last_ts: "2026-06-08T16:08:19.461Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a553720c838e1435c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review a multi-file change in PRISM (H:/prism). Read these files END-TO-END and 

> **claude-code-cli** | 2026-06-08 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a553720c838e1435c.jsonl`

## Transcript

### User | 2026-06-08T16:05:56.588Z

Review a multi-file change in PRISM (H:/prism). Read these files END-TO-END and grade PASS/FAIL with P0/P1 list.

FILES:
1. H:/prism/scripts/build-print-corpus-manifest.mjs — NEW. Classifies juliett's documents.jsonl (111,745 v3-classified docs) into 3 buckets (drawing/ambiguous/excluded) to define the real "all prints" denominator WITHOUT re-OCR. Emits a counted manifest + a VLM worklist of drawing-role print disk_paths. Key fn: classifyDoc.
2. H:/prism/scripts/build-print-corpus-manifest.test.mjs — NEW. 9 tests for classifyDoc.
3. H:/prism/scripts/blueprint-ocr-training-loop.mjs — CHANGED: rasterizeIfPdf (page-0-only) was replaced with rasterizePrintPages (ALL pages, capped at MAX_PAGES_PER_PRINT=12) + the weak-label loop now runs the ensemble per-page and emits one trainset row per page. Review rasterizePrintPages + pdfPageCount + the per-page loop.

VERIFIED DATA REALITY (don't re-litigate, but check the code honors it):
- 96% of JM drawing PDFs are multi-page (2-32pp); page-0-only dropped ~76% of dimension-bearing pages. THE fix is processing all pages.
- documents.jsonl: role (PRINT/LASER_SHEET=drawing; NOTE/SALES_ORDER/etc=business; SCAN_GENERIC/UNKNOWN=ambiguous), print_score (SIGNED int, ~21 for prints), has_text_layer, needs_ocr (every text-layer doc ALSO needs_ocr), disk_path, mime.
- Live run proved: a 4-page PDF now emits 4 per-page trainset rows (page=0..3), one cursor line per print, 7 gold dims total.

Look hard for: (a) a page silently dropped (the very bug being fixed); (b) classifyDoc miscounting — a business doc leaking to drawing (wasted VLM) or a real print leaking to excluded (lost data); (c) the cap (12 pages) silently dropping pages without logging — is `capped` surfaced? (d) temp-PNG leak across pages in rasterizePrintPages.cleanup; (e) the resume cursor still correct now that one print = N pages (does a kill mid-print, after page 2 of 4 emitted but before cursor, re-process all 4 — and is that safe?); (f) classifyDoc determinism / null-saf
... [+33 chars truncated]

### Assistant | 2026-06-08T16:06:06.203Z

I'll review these three files end-to-end. Let me read them in parallel.

### Assistant | 2026-06-08T16:06:06.590Z

[tool_use: Read]

### Assistant | 2026-06-08T16:06:07.019Z

[tool_use: Read]

### Assistant | 2026-06-08T16:06:07.336Z

[tool_use: Read]

### User | 2026-06-08T16:06:09.375Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/build-print-corpus-manifest.mjs
3	//
4	// U-XRAY-PRINT-CORPUS-MANIFEST (STEP 2 of the OCR-training-scope synthesis) — define the REAL
5	// denominator of "all prints in the JM folder / Docustrata" by SEARCHING juliett's already-extracted
6	// index (mcp-server/data/jm-die-database/tables/documents.jsonl, 111,745 v3-classified docs), NEVER by
7	// re-OCRing the 25
... [+9762 chars truncated]

### User | 2026-06-08T16:06:10.149Z

[tool_result] 1	// scripts/build-print-corpus-manifest.test.mjs
2	// Tests for the print-corpus bucketing (STEP 2). classifyDoc is the SINGLE source of the
3	// drawing/ambiguous/excluded rule — both the manifest counts and the VLM worklist flow through it,
4	// so a wrong verdict here = either burning VLM time on a sales order (excluded leaking to drawing)
5	// or silently dropping a real print (drawing leakin
... [+4684 chars truncated]

### User | 2026-06-08T16:06:10.377Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+21905 chars truncated]

### Assistant | 2026-06-08T16:06:16.924Z

Now let me verify the critical dependencies these files rely on. The resume-cursor correctness and per-page dedup claims hinge on the helper library functions. Let me read the lib functions referenced.

### Assistant | 2026-06-08T16:06:16.924Z

[tool_use: Read]

### User | 2026-06-08T16:06:19.646Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+16916 chars truncated]

### Assistant | 2026-06-08T16:06:27.575Z

Now let me verify the per-page ensemble call signature. The runner calls `runEnsembleOverImage` with `res.models_ok` per page but the calibration loop uses `res.fused.summary.n_models`. Let me check the ensemble fuse contract to confirm `models_ok` exists and the dedup `key` field claim.

### Assistant | 2026-06-08T16:06:28.142Z

[tool_use: Read]

### User | 2026-06-08T16:06:30.358Z

[tool_result] 1	// scripts/lib/vision-ensemble-fuse.mjs
2	//
3	// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
4	//
5	// WHY THIS EXISTS (the Blackwell unlock):
6	//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
7	//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
8	//   ~85GB idle in practice) remov
... [+24843 chars truncated]

### Assistant | 2026-06-08T16:06:36.048Z

I now have the full contract. Let me check one final thing — the downstream consumer that the dedup claim depends on (last-wins dedup by `key`+image). The runner claims trainset rows are deduped downstream; let me verify whether such a consumer exists, and confirm the `pdf-to-png.py --count` / `--page` contract the rasterizer depends on.

### Assistant | 2026-06-08T16:06:36.456Z

[tool_use: Read]

### Assistant | 2026-06-08T16:06:37.247Z

[tool_use: Grep]

### User | 2026-06-08T16:06:38.712Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\pdf-to-png.py' was already read 18m ago in this session and is unchanged (mtime 1780164698431). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T16:06:39.977Z

[tool_result] Found 35 files
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\ocr-training-loop-lib.mjs
scripts\xray-trainset-to-lora.mjs
scripts\lib\trainset-to-lora-pairs.mjs
scripts\blueprint-trainset-curate.mjs
scripts\post-training-harness.test.mjs
scripts\generate-galaxy-federation-roost-features.mjs
scripts\winmax-tool-pocket-autoselect.test.mjs
scripts\lib\viz-engine-node-id-canon.mjs
scripts\lib\pat
... [+951 chars truncated]

### Assistant | 2026-06-08T16:06:44.211Z

Let me verify the downstream dedup consumer the runner relies on, and confirm the trainset-to-lora path honors `key`+image last-wins (load-bearing for the resume-cursor safety claim).

### Assistant | 2026-06-08T16:06:45.718Z

[tool_use: Grep]

### User | 2026-06-08T16:06:48.140Z

[tool_result] 22:// HONEST CAVEAT this adapter does NOT hide (surfaced by the runner): pdfPath is an image PATH STRING,
23:// not pixels. The bridge is a text/path bridge; a true VISION LoRA needs the rasterized image fed to a
25:// training data on its own (india must add the VLM image path → pixels load).
31: * @param {{part?:string, image?:string, source?:string, labels?:Array}} row
38:  const image = row.im
... [+117 chars truncated]

### Assistant | 2026-06-08T16:06:51.982Z

[tool_use: Grep]

### User | 2026-06-08T16:06:54.118Z

[tool_result] No matches found

### Assistant | 2026-06-08T16:06:59.741Z

The downstream `key`+image last-wins dedup the runner's comments promise does **not** exist in either trainset consumer. This is a real finding — let me confirm by checking how `xray-trainset-to-lora.mjs` reads the trainset.

### Assistant | 2026-06-08T16:07:02.032Z

[tool_use: Grep]

### User | 2026-06-08T16:07:04.765Z

[tool_result] 2:// scripts/xray-trainset-to-lora.mjs
6:// Reads the closed-loop OCR trainset, maps it to the BlueprintLoRABridgeEngine's LoRATrainingPair[]
20:// eval split).
22:// USAGE: node scripts/xray-trainset-to-lora.mjs [--trainset <path>] [--json]
25:import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
30:import { trainsetToLoRAPairs } from "./lib/trainset-to-lora-pairs.mjs";
39
... [+818 chars truncated]

### Assistant | 2026-06-08T16:08:19.461Z

Confirmed. `xray-trainset-to-lora.mjs:49-52` reads every trainset row straight through `trainsetToLoRAPairs(rows)` with **no dedup** — duplicate rows from a kill survive into the LoRA pairs. This is a real P1 gap between the runner's promised invariant and reality.

I have everything needed. Let me do the final correctness analysis on the resume-cursor cap interaction and write the verdict.

## Code Quality Analysis Report

### Summary
- Files analyzed: 3 (+3 dependency libs read for contract verification)
- Overall verdict: **PASS with 1 P1 and 4 P2** — the core fix (all-pages rasterization) is correct, the cap is surfaced honestly, classifyDoc is null-safe and deterministic, and no page is silently dropped. One promised cross-file invariant (downstream `key`+image last-wins dedup) does not exist, making the documented resume-safety claim partially overstated.

The three specific bug classes the prompt asked me to hunt for — (a) silently-dropped page, (b) classifyDoc miscounting, (c) cap dropping pages without logging — are all **clean**. The findings below are in the resume/dedup seam and a few robustness edges.

---

### Critical Issues

None (no P0).

---

### P1 — must fix before relying on the resume-safety doctrine

**1. The "deduped last-wins by `key`+image downstream" invariant does not exist — duplicate rows from a reaper kill flow uncorrected into LoRA pairs.**
- File: `H:/prism/scripts/blueprint-ocr-training-loop.mjs:268` (comment), `:271` (the append), and `:318` (report `note`)
- The runner deliberately appends durable trainset rows **before** the cursor (`:267-289`), accepting "≤1 duplicate row per kill," and twice states the duplicate is "deduped last-wins by `key`+image downstream" (`:268`) / "Each trainset row carries `key` for last-wins dedup" (`:318`). I verified the only two consumers:
  - `H:/prism/scripts/xray-trainset-to-lora.mjs:49-52` — reads every line, `rows.push(JSON.parse(t))`, no dedup, then `trainsetToLoRAPairs(rows)` (`:64`).
  - `H:
... [+9765 chars truncated]
