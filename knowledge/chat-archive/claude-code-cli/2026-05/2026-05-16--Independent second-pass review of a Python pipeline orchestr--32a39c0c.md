---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Independent second-pass review of a Python pipeline orchestrator: `H:\\prism\\Docu"
date: "2026-05-16"
first_ts: "2026-05-16T05:10:16.131Z"
last_ts: "2026-05-16T05:15:21.746Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a6257f13c12f27bf3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of a Python pipeline orchestrator: `H:\prism\Docu

> **claude-code-cli** | 2026-05-16 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a6257f13c12f27bf3.jsonl`

## Transcript

### User | 2026-05-16T05:10:16.131Z

Independent second-pass review of a Python pipeline orchestrator: `H:\prism\Docustrata\.index\docustrata-pipeline.py` (~340 lines). Read the WHOLE file end-to-end. Review fresh — do NOT assume a logic-specialist caught everything.

PURPOSE: it is the unified orchestrator for PRISM's Docustrata document-print-reading pipeline. It sequences 7 stages (delta-detect, delta-page-count, text-density, deep-rescan, verified-rollup [EXTERNAL — no script], split-containers, gpu-ocr) in cost-cascade order. Each stage shells out to an existing `phaseN-*.py` script in the same `.index/` directory via `subprocess.run`. The orchestrator does NOT reimplement stages — it sequences, gates preconditions, gates GPU readiness, times, and appends a run record to `docustrata-pipeline-runs.jsonl`.

Weight your review toward what a correctness-specialist is LESS likely to catch:
- INTEGRATION with the real stage scripts: the orchestrator declares each stage's `consumes`/`produces` files. Are those declarations ACCURATE? Check at least these against the actual sibling scripts in `H:/prism/Docustrata/.index/`: phase22-delta-detector.py (does it produce `phase22-delta-pdfs.jsonl`? consume `pdf-page-counts.jsonl`?), phase6b-delta-page-count.py (produces by appending `pdf-page-counts.jsonl`?), phase7-text-density-scan.py (consumes `pdf-page-counts.jsonl`, produces `phase7-drawing-candidates.jsonl`?), phase15-deep-rescan-parallel.py, phase21-split-containers.py (consumes `phase20-verified-prints-by-doc.jsonl`, produces `_organized/PRINTS/_split-manifest.jsonl`?), phase9-unified-blueprint-pipeline.py. A wrong `consumes`/`produces` path means a stage is falsely BLOCKED or falsely allowed to run.
- A subtle dependency hazard: stage `delta-page-count` (phase6b) lists `produces: [pdf-page-counts.jsonl]` but it APPENDS to that file, which ALSO appears as `consumes` of the SAME stage and of `text-density`. Does the orchestrator's gating logic do anything wrong when a file is simultaneously a consume and 
... [+1460 chars truncated]

### Assistant | 2026-05-16T05:10:20.700Z

I'll review the orchestrator and verify its stage declarations against the actual sibling scripts.

### Assistant | 2026-05-16T05:10:21.139Z

[tool_use: Read]

### User | 2026-05-16T05:10:21.591Z

[tool_result] read-once-guard: 'H:\prism\Docustrata\.index\docustrata-pipeline.py' was already read 17s ago in this session and is unchanged (mtime 1778908119331). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T05:10:21.710Z

[tool_use: Bash]

### User | 2026-05-16T05:10:25.432Z

[tool_result] FUTURE_WORK_GCODE_EXTRACTION.md
__pycache__/
_phase10_mineru_work/
blueprint-program-join-full-v2.jsonl
blueprint-program-join-full-v3.jsonl
blueprint-program-join-full-v4.jsonl
blueprint-program-join-full-v5.jsonl
blueprint-program-join-full-v6.jsonl
blueprint-program-join-full.jsonl
blueprint-program-join.jsonl
classification-summary.md
disk-ghosts.jsonl
disk-index.json
documents-classified-v2.j
... [+1762 chars truncated]

### Assistant | 2026-05-16T05:10:27.965Z

I have the orchestrator content in context. Let me find the actual sibling phase scripts the orchestrator declares.

### Assistant | 2026-05-16T05:10:28.765Z

[tool_use: Bash]

### User | 2026-05-16T05:10:32.766Z

[tool_result] phase15-deep-rescan-huge-chunked.py
phase15-deep-rescan-parallel-memsafe.py
phase15-deep-rescan-parallel.jsonl
phase15-deep-rescan-parallel.py
phase15-deep-rescan-seq.py
phase15-deep-rescan.jsonl
phase15-deep-rescan.py
phase15-memsafe-run.log
phase15-memsafe-summary.md
phase15-paddle-driver.py
phase15-shards/
phase15-skipped-huge.jsonl
phase15-summary.md
phase20-electrode-coverage-audit.py*
phase2
... [+582 chars truncated]

### Assistant | 2026-05-16T05:10:35.309Z

All phase scripts exist. Let me read the orchestrator and the relevant phase scripts to verify the `consumes`/`produces` declarations.

### Assistant | 2026-05-16T05:10:35.738Z

[tool_use: Read]

### Assistant | 2026-05-16T05:10:36.118Z

[tool_use: Read]

### User | 2026-05-16T05:10:36.206Z

[tool_result] read-once-guard: 'H:\prism\Docustrata\.index\docustrata-pipeline.py' was already read 31s ago in this session and is unchanged (mtime 1778908119331). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T05:10:36.580Z

[tool_result] read-once-guard: 'H:\prism\Docustrata\.index\phase22-delta-detector.py' was already read 17m ago in this session and is unchanged (mtime 1778907117272). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-05-16T05:10:38.836Z

The read-once guard says these files are in my context, but I need to actually see them. Let me disable the cache to read fresh.

### Assistant | 2026-05-16T05:10:39.807Z

[tool_use: Bash]

### User | 2026-05-16T05:10:44.975Z

[tool_result] #!/usr/bin/env python3
"""
docustrata-pipeline.py — unified print-reading pipeline orchestrator.

WHAT THIS IS:
  One command that sequences the Docustrata print-extraction phases in
  cost-cascade order (cheap CPU stages gate the expensive GPU stage) and
  reports per-stage status + timing. It is a SEQUENCER, not a re-implementation
  — every stage shells out to the existing `phaseN-*.py` script 
... [+15420 chars truncated]

### Assistant | 2026-05-16T05:10:47.883Z

Now let me read the actual phase scripts to verify the `consumes`/`produces` declarations.

### Assistant | 2026-05-16T05:10:49.148Z

[tool_use: Bash]

### Assistant | 2026-05-16T05:10:49.744Z

[tool_use: Bash]

### User | 2026-05-16T05:10:53.266Z

[tool_result] #!/usr/bin/env python3
"""
phase22-delta-detector.py — find Docustrata PDFs not yet processed by phase6.

WHY THIS EXISTS (Karpathy R12 — fail loud on a wrong premise):
  A prior audit reported "104K unscanned PDFs". That number was a counting
  artifact: a raw `*.pdf` walk of Docustrata/ returns ~252K files, but
  ~141K of those live under `_organized/` — physical COPIES made by
  phase4-reorg-co
... [+14016 chars truncated]

### User | 2026-05-16T05:10:57.658Z

[tool_result] #!/usr/bin/env python3
"""
phase6b-delta-page-count.py — page-count the phase22 delta PDFs and append them
into phase6's ledger so the existing phase7 -> phase15 chain ingests them.

WHY THIS EXISTS:
  phase6-pdf-page-audit.py is driven by the document index
  (documents-classified.jsonl) — it only page-counts PDFs the Evernote /
  Docustrata import catalogued. phase22-delta-detector.py found sour
... [+12795 chars truncated]

### Assistant | 2026-05-16T05:11:00.237Z

phase22 and phase6b declarations verified — both accurate. Now the remaining stages.

### Assistant | 2026-05-16T05:11:01.972Z

[tool_use: Bash]

### Assistant | 2026-05-16T05:11:02.609Z

[tool_use: Bash]

### User | 2026-05-16T05:11:05.898Z

[tool_result] """
Phase 7 (fast) — text-density scan to find pages that LOOK like engineering
drawings without using vision LLM.

Heuristic: scanned engineering drawings have very low extractable text per page
(typically 0-200 chars from any embedded text layer; the actual title-block
characters are baked into the image and only OCR can read them). Business docs
have hundreds-thousands of chars per page. Photos
... [+6394 chars truncated]

### User | 2026-05-16T05:11:11.318Z

[tool_result] #!/usr/bin/env python3
"""
phase21-split-containers.py — burst multi-print container PDFs into per-print PDFs.

Consumes phase20-verified-prints-by-doc.jsonl (each record: disk_path + a flat
0-based `verified_print_pages` list). For every source PDF it extracts each
verified print page into its own single-page PDF under _organized/PRINTS/, so the
JM Die archive's container scans become one-drawing
... [+10250 chars truncated]

### Assistant | 2026-05-16T05:11:15.720Z

phase7 and phase21 verified — declarations accurate. Now the deep-rescan and gpu-ocr stages.

### Assistant | 2026-05-16T05:11:19.150Z

[tool_use: Bash]

### Assistant | 2026-05-16T05:11:21.060Z

[tool_use: Bash]

### User | 2026-05-16T05:11:25.780Z

[tool_result] """
Phase 15 (parallel) — multiprocess deep rescan over unprocessed Phase 7 candidates.

Improvements over phase15-deep-rescan.py:
  1. multiprocessing.Pool (default 12 workers) for ~12x throughput
  2. Tightened CUSTOMER_RE + post-filter to reject:
       - keyword self-matches (BILL TO, JOB, CUSTOMER, etc.)
       - <4 alphanumeric chars
       - non-letter dominant strings
       - multi-line C
... [+3613 chars truncated]

### User | 2026-05-16T05:11:31.258Z

[tool_result] """
Phase 9 — Unified Blueprint Pipeline (GPU-accelerated)

Stack:
  Tier 1: PyMuPDF render + numpy image heuristic (50ms/page, CPU, free)
  Tier 2: Tesseract title-block OCR (1-2s/page, CPU, free)
  Tier 3: Qwen2.5-VL-7B-Instruct on RTX 4080 SUPER (~3-5s/page, GPU)

Caching: HF model weights cached at H:/Tools/huggingface_cache (avoids C: drive).
Resumability: streaming JSONL output, skip already
... [+2728 chars truncated]

### Assistant | 2026-05-16T05:11:34.206Z

All five executable stage scripts verified. Now let me check whether `phase20-verified-prints-by-doc.jsonl` actually exists with content, and confirm the GPU stage's input source consistency.

### Assistant | 2026-05-16T05:11:37.360Z

[tool_use: Bash]

### User | 2026-05-16T05:13:38.910Z

[tool_result] Command running in background with ID: bq7ado9f9. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\32a39c0c-ec85-4b35-bb0c-265f75d8b968\tasks\bq7ado9f9.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-16T05:13:41.779Z

[tool_use: Read]

### User | 2026-05-16T05:13:42.612Z

[tool_result] 1	EXISTS  1778290529 30076168  pdf-page-counts.jsonl
2	EXISTS  1778907273 1033876  phase22-delta-pdfs.jsonl
3	EXISTS  1778291755 14950541  phase7-drawing-candidates.jsonl
4	EXISTS  1778849767 64190749  phase15-deep-rescan-parallel.jsonl
5	EXISTS  1778766979 6425253  phase20-verified-prints-by-doc.jsonl
6	EXISTS  1778353578 3164987  phase9-unified-pages.jsonl
7	MISSING                  docustrata-p
... [+49 chars truncated]

### Assistant | 2026-05-16T05:15:21.746Z

I have everything I need. Critical finding: comparing mtimes — `phase20-verified-prints-by-doc.jsonl` (1778766979) is **OLDER** than `phase15-deep-rescan-parallel.jsonl` (1778849767). The verified-rollup stage will correctly report `stale-external`, and the chain will continue into `split-containers` against the stale file. This is the exact hazard the review brief flagged, and it's live right now.

Let me write up the full review.

---

# Independent Second-Pass Review — `docustrata-pipeline.py`

**File:** `H:\prism\Docustrata\.index\docustrata-pipeline.py` (~340 lines)
**Method:** Read whole file end-to-end; verified all 5 executable stages' `consumes`/`produces` against the actual sibling scripts; checked the EXTERNAL stage's freshness contract; compared live artifact mtimes on disk.

## Stage-wiring verification (consumes/produces — all 5 executable stages)

| Stage | Orchestrator declares | Sibling script reality | Verdict |
|---|---|---|---|
| `delta-detect` (phase22) | consumes `pdf-page-counts.jsonl`, produces `phase22-delta-pdfs.jsonl` | `PHASE6 = pdf-page-counts.jsonl` (in), `OUT = phase22-delta-pdfs.jsonl` (out) | ✅ ACCURATE |
| `delta-page-count` (phase6b) | consumes `phase22-delta-pdfs.jsonl`, produces `pdf-page-counts.jsonl` | `DELTA = phase22-delta-pdfs.jsonl` (in), `LEDGER = pdf-page-counts.jsonl` (append) | ✅ ACCURATE |
| `text-density` (phase7) | consumes `pdf-page-counts.jsonl`, produces `phase7-drawing-candidates.jsonl` | `PAGE_COUNTS` (in), `OUT = phase7-drawing-candidates.jsonl` (out) | ✅ ACCURATE |
| `deep-rescan` (phase15) | consumes `phase7-drawing-candidates.jsonl`, produces `phase15-deep-rescan-parallel.jsonl` | `CANDIDATES` (in), `OUT = phase15-deep-rescan-parallel.jsonl` (out) | ✅ ACCURATE |
| `split-containers` (phase21) | consumes `phase20-verified-prints-by-doc.jsonl`, produces `_organized/PRINTS/_split-manifest.jsonl` | `PHASE20` (in), `MANIFEST = OUT_DIR/_split-manifest.jsonl` (out) | ✅ ACCURATE |
| `gpu-ocr` (phase9) | consumes `ph
... [+15526 chars truncated]
