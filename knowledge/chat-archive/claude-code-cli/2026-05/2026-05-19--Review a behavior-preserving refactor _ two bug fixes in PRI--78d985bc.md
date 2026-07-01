---
type: "chat-session"
source: "claude-code-cli"
session_id: "78d985bc-f0d6-4fd8-9af6-476977d7db15"
title: "Review a behavior-preserving refactor + two bug fixes in PRISM's U-TDP06 CNC gro"
date: "2026-05-19"
first_ts: "2026-05-19T03:00:36.237Z"
last_ts: "2026-05-19T03:02:09.178Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/78d985bc-f0d6-4fd8-9af6-476977d7db15/subagents/agent-a7b9c59711f17b50f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a behavior-preserving refactor + two bug fixes in PRISM's U-TDP06 CNC gro

> **claude-code-cli** | 2026-05-19 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/78d985bc-f0d6-4fd8-9af6-476977d7db15/subagents/agent-a7b9c59711f17b50f.jsonl`

## Transcript

### User | 2026-05-19T03:00:36.237Z

Review a behavior-preserving refactor + two bug fixes in PRISM's U-TDP06 CNC ground-truth pipeline. Read all THREE files end-to-end:

1. H:/prism/scripts/lib/cnc-ground-truth-lib.mjs  — pure core lib
2. H:/prism/scripts/cnc-ground-truth-build.mjs    — CLI shell
3. H:/prism/scripts/lib/cnc-ground-truth-lib.test.mjs — node:test suite

WHAT CHANGED (verify each claim against the code):
- Lib: NEW `analyzeNcResult(ncResult, opts)` — single-pass: tokenizes ONCE, returns `{record, parsed, units, hasFeatures, partClass}`. NEW `createBatchSummary()` — streaming accumulator with `.add(analysis)` / `.result()`. `buildGtRecordFromNc` refactored to `return analyzeNcResult(...).record` (back-compat). `summarizeBatch` refactored to feed `analyzeNcResult` through `createBatchSummary` (back-compat).
- CLI: streaming loop — was retaining every NC file's full text in an `ncResults[]` array AND re-tokenizing it via summarizeBatch; ~16,565 NC files in JM DIE/CNC LATHE alone OOM'd it. Now: analyze each file once, accumulate incrementally, let content GC. Also: all `process.exit(N)` replaced with `main()` returning the code + `process.exitCode = code` — `process.exit()` was force-truncating buffered stdout/stderr on a non-TTY pipe (the `--json` report silently vanished — empirically confirmed: dry-run --json returned 0 bytes before the fix, full JSON after).

VERIFY:
- Parity: is `summarizeBatch` (new) byte-identical in output to the old version? Old: `total=arr.length`; per entry skip if bad content (NOT counted in `parsed`); `byUnits` over parsed; `byPartClass` over gt_produced files keyed by `inferPartClassFromNcPath(file_path)` default "general". Check the new path produces the SAME numbers including the `total`-counts-malformed-entries detail.
- Is `buildGtRecordFromNc` output identical (record shape: pdf_path, cnc_source, part_class, dimensions[], derivation{source,units,op_count,subprogram_calls})?
- Streaming correctness: does `content` actually become unreferenced each iteration
... [+558 chars truncated]

### Assistant | 2026-05-19T03:00:46.565Z

I'll review all three files end-to-end against the stated claims.

### Assistant | 2026-05-19T03:00:46.957Z

[tool_use: Read]

### Assistant | 2026-05-19T03:00:47.412Z

[tool_use: Read]

### Assistant | 2026-05-19T03:00:47.633Z

[tool_use: Read]

### User | 2026-05-19T03:00:53.292Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.mjs
2	//
3	// U-TDP06 - CNC-derived Ground Truth (pure core).
4	//
5	// Converts a CNC program's G/M-code content into BlueprintExtraction-shape
6	// ground-truth records for the U-TDP04 OCR-extraction benchmark. This is the
7	// CNC half of the user directive "you can also compare to cad files and cnc
8	// programs to determine if you extracted the correct da
... [+15410 chars truncated]

### User | 2026-05-19T03:00:54.161Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/cnc-ground-truth-build.mjs
3	//
4	// U-TDP06 — CNC-derived Ground Truth CLI shell.
5	//
6	// Walks a CNC program corpus, derives presence-only BlueprintExtraction-shape
7	// ground truth from each program's G-code (via the pure
8	// scripts/lib/cnc-ground-truth-lib.mjs), and writes one
9	// <part_class>.json per class in the U-TDP04 benchmark's ground-truth schem
... [+9301 chars truncated]

### User | 2026-05-19T03:00:54.623Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.test.mjs
2	//
3	// U-TDP06 — tests for the CNC-derived ground-truth pure core.
4	// Reference values are derived from real JM Die .MIN structure and from
5	// hand-verified canonical G-code patterns. The final test proves a CNC GT
6	// record grades correctly through the actual U-TDP04 benchmark presence path
7	// (the integration seam that round-1 scrutiny fl
... [+19403 chars truncated]

### Assistant | 2026-05-19T03:01:00.064Z

I've read all three files end-to-end. Let me verify each claim against the code.

I need to check the `compareExtractionToGroundTruth` import that the integration test depends on, since that's the only external coupling.

### Assistant | 2026-05-19T03:01:01.099Z

[tool_use: Grep]

### User | 2026-05-19T03:01:05.414Z

[tool_result] 87:export function compareExtractionToGroundTruth(extracted, groundTruth, opts = {}) {
88-  const tol = Number.isFinite(Number(opts.matchToleranceMm))
89-    ? Number(opts.matchToleranceMm)
90-    : DEFAULT_DIM_MATCH_TOLERANCE_MM;
91-  const eDims = (extracted && Array.isArray(extracted.dimensions)) ? extracted.dimensions : [];
92-  const gDims = (groundTruth && Array.isArray(groundTruth.dimension
... [+511 chars truncated]

### Assistant | 2026-05-19T03:02:09.178Z

The integration seam is sound. Now let me do the full verification analysis.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 3
- Issues Found: 2 (1 P2, 1 P3) — no P0/P1
- Technical Debt Estimate: ~0.5 hours (cosmetic only)

I traced every stated claim against the code. The refactor is behavior-preserving and both bug fixes hold.

---

### Claim 1 — `summarizeBatch` byte-identical parity: **VERIFIED**

Old contract reconstructed from the doc comments + test expectations, new path traced through `analyzeNcResult` → `createBatchSummary.add`:

- **`total = arr.length`** — `add()` increments `out.total` unconditionally on line 290, before the `parsed !== true` early-return. `summarizeBatch` (line 316) calls `acc.add()` once per array element. So `total` counts every entry including malformed/`null`/empty-content rows. The test at `cnc-ground-truth-lib.test.mjs:388-400` pins exactly this: 3 `.add()` calls (`undefined`, `null`, `{parsed:false}`) → `total=3, parsed=0`. **Matches old "total counts malformed entries" detail.**
- **bad content NOT counted in `parsed`** — `analyzeNcResult` returns `parsed:false` for non-object/missing-path/empty-content (lib lines 209-210); `add()` returns early before `out.parsed += 1`. Correct.
- **`byUnits` over parsed files** — incremented at line 293-294, inside the `parsed===true` gate, *before* the `hasFeatures` check — so both featureless AND feature-bearing parsed files tally units. The featureless-file test (`:402-411`) confirms `byUnits.inch=1` with `gt_produced=0`. Correct.
- **`byPartClass` over `gt_produced` files** — incremented at line 300-301, only after `gt_produced += 1`. Correct.
- **`byPartClass` default `"general"`** — line 300 `analysis.partClass ... : "general"`. Belt-and-suspenders: `analyzeNcResult` already resolves `partClass` via `inferPartClassFromNcPath(..., {default: opts.partClassDefault})` which itself defaults to `"general"` (lib line 183). The `summarizeBatch` path
... [+8782 chars truncated]
