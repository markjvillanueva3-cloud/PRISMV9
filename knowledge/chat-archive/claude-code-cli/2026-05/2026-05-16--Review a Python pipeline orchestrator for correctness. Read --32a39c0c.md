---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Review a Python pipeline orchestrator for correctness. Read the WHOLE file end-t"
date: "2026-05-16"
first_ts: "2026-05-16T05:09:59.145Z"
last_ts: "2026-05-16T05:10:57.791Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a711b7258c5d33fc5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a Python pipeline orchestrator for correctness. Read the WHOLE file end-t

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a711b7258c5d33fc5.jsonl`

## Transcript

### User | 2026-05-16T05:09:59.145Z

Review a Python pipeline orchestrator for correctness. Read the WHOLE file end-to-end: `H:\prism\Docustrata\.index\docustrata-pipeline.py` (~340 lines).

CONTEXT: This is the keystone deliverable of PRISM's Docustrata print-reading pipeline. It sequences 7 stages (each an existing `phaseN-*.py` script in the same `.index/` directory) in cost-cascade order: delta-detect -> delta-page-count -> text-density -> deep-rescan -> verified-rollup (EXTERNAL, no script) -> split-containers -> gpu-ocr. It is a pure SEQUENCER — it shells out to each stage script via `subprocess.run([sys.executable, script], cwd=INDEX_DIR)`, it does NOT reimplement any stage. It adds: dependency ordering, precondition gating (BLOCKED if a stage's input files are missing), GPU-readiness gating (the gpu-ocr stage probes torch+CUDA and is skipped cleanly if unavailable), per-stage timing, and an append-only run log `docustrata-pipeline-runs.jsonl`.

A live run already confirmed: `--list` and `--dry-run` both work; the dry-run plan correctly shows 6 RUN + 1 VERIFY-external and `gpu-ocr -> RUN (GPU ready)`.

VERIFY:
1. The declarative `STAGES` table + `select_stages()` — does `--from`/`--to`/`--only` slicing produce the correct sublist in canonical order? Does `--only` combined with `--from`/`--to` get rejected?
2. `run_stage()` state machine — trace every return path: blocked (missing inputs), external stage (script=None: blocked-external-missing / stale-external / ok-external — never runs a subprocess), error-no-script, skipped-gpu, skipped-gpu-not-ready, ok, failed, timeout. Is each status classified correctly? Is the EXTERNAL branch genuinely incapable of executing a subprocess?
3. `probe_gpu()` — correct interpretation of returncode 0 vs 1 vs torch-missing? Timeout handled?
4. The `FAILING` set vs the statuses actually produced — is every genuine failure status in `FAILING`? Note `stale-external` and `skipped-gpu*` and `ok-external` are deliberately NOT failures — is that the right call given dow
... [+859 chars truncated]

### Assistant | 2026-05-16T05:10:04.060Z

I'll review the pipeline orchestrator end-to-end.

### Assistant | 2026-05-16T05:10:04.375Z

[tool_use: Read]

### User | 2026-05-16T05:10:06.019Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	docustrata-pipeline.py — unified print-reading pipeline orchestrator.
4	
5	WHAT THIS IS:
6	  One command that sequences the Docustrata print-extraction phases in
7	  cost-cascade order (cheap CPU stages gate the expensive GPU stage) and
8	  reports per-stage status + timing. It is a SEQUENCER, not a re-implementation
9	  — every stage shells out to the existing `ph
... [+16857 chars truncated]

### Assistant | 2026-05-16T05:10:57.791Z

# Code Quality Analysis Report

## Summary
- Overall Quality Score: 8/10
- Files Analyzed: 1 (`H:\prism\Docustrata\.index\docustrata-pipeline.py`, 386 lines)
- Issues Found: 1 P1, 3 P2, 2 positive observations
- Technical Debt Estimate: ~1 hour

This is a clean, well-disciplined sequencer. I traced every requirement and found no P0. One genuine P1 (Unicode crash risk) and a few P2 robustness gaps.

## Verification of each requested item

### 1. `STAGES` table + `select_stages()` — PASS
- Lines 182-189. Canonical order is preserved: `select_stages()` filters `STAGES` in-place by index range, so the output is always a contiguous sublist in canonical order regardless of `--from`/`--to` ordering.
- `--from`/`--to` slicing is correct: `lo`/`hi` are `keys.index(...)` and the comprehension keeps `lo <= idx <= hi` — inclusive both ends, matching the docstring ("stop *after* stage KEY").
- Edge case verified: if `--from` is *after* `--to` (e.g. `--from gpu-ocr --to delta-detect`), `lo > hi` yields an empty list. `main()` line 335-336 then does `stages[0]` / `stages[-1]` → **`IndexError` crash**. See P2-A below.
- `--only` + `--from`/`--to` rejection: **correctly rejected** at lines 323-325, exit 2. Invalid keys for all three flags rejected at 316-322, exit 2. Both happen *before* `select_stages()` is reached, so `STAGE_BY_KEY[args.only]` (line 185) can never `KeyError`.

### 2. `run_stage()` state machine — PASS
Traced all 11 return paths (lines 192-258):
- `blocked` (198-203): missing `consumes` inputs — returned before any script logic. Correct.
- EXTERNAL branch (206-220): `script is None`. Three sub-paths — `blocked-external-missing` (208), `stale-external` (213), `ok-external` (217). **Genuinely incapable of running a subprocess**: the branch `return res` at line 220 unconditionally, before the `subprocess.run` at line 244 is ever reachable. Confirmed.
- `error-no-script` (222-225): script path set but file absent. Correct.
- `skipped-gpu` (228-231) and `skipped-gpu-not
... [+6766 chars truncated]
