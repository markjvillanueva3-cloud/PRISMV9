---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Review a rewritten Python pipeline orchestrator for correctness: `H:\\prism\\Docus"
date: "2026-05-16"
first_ts: "2026-05-16T05:20:15.601Z"
last_ts: "2026-05-16T05:21:05.676Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a1f062c9320fcd070.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a rewritten Python pipeline orchestrator for correctness: `H:\prism\Docus

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a1f062c9320fcd070.jsonl`

## Transcript

### User | 2026-05-16T05:20:15.601Z

Review a rewritten Python pipeline orchestrator for correctness: `H:\prism\Docustrata\.index\docustrata-pipeline.py` (~400 lines). Read the WHOLE file end-to-end.

This file was just rewritten to fix issues from a prior review. It sequences 7 stages of PRISM's Docustrata print-reading pipeline (each stage shells out to an existing `phaseN-*.py` script via `subprocess.run`); it does NOT reimplement stages.

The rewrite added these mechanisms — VERIFY each is correct:
1. TAINT PROPAGATION: a module-level `FAILING` set; `main()` keeps a `tainted` set; after each stage whose status is in `FAILING`, that stage's `produces` paths are added to `tainted`; `run_stage()` checks `tainted` against the stage's `consumes` BEFORE the file-existence check and returns `blocked-upstream` if any input is tainted. Confirm: (a) the taint check is genuinely before the existence check (a tainted file can still exist on disk); (b) `blocked-upstream` is itself in `FAILING` so taint propagates transitively; (c) `stale-external` and `blocked-external-missing` are in `FAILING` so a stale/missing external artifact taints `split-containers`.
2. PER-STAGE LOG CAPTURE: each stage's child stdout+stderr go to `docustrata-pipeline-<key>.log` via `subprocess.run(..., stdout=lf, stderr=subprocess.STDOUT)`. Confirm the `with open(...)` wraps `subprocess.run` correctly and the timeout/interrupt paths still close the file.
3. INTERRUPT HANDLING: `run_stage()` catches `KeyboardInterrupt` around the `subprocess.run`, records the stage as `interrupted` (status in `FAILING`), and returns normally; `main()` detects `interrupted` status and breaks; there is ALSO an outer `try/except KeyboardInterrupt` in main for a Ctrl-C between stages. Confirm the interrupted stage gets an honest result record (not mislabeled `not-run`), and the run log is still written.
4. EXIT CODES + HEADLINE: exit 0 only when no `FAILING` stage; exit 1 if any; exit 130 if interrupted; exit 2 for arg errors. A summary headline distinguishe
... [+534 chars truncated]

### Assistant | 2026-05-16T05:20:21.707Z

I'll review the pipeline orchestrator file end-to-end.

### Assistant | 2026-05-16T05:20:22.136Z

[tool_use: Read]

### User | 2026-05-16T05:20:22.931Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	docustrata-pipeline.py — unified print-reading pipeline orchestrator.
4	
5	WHAT THIS IS:
6	  One command that sequences the Docustrata print-extraction phases in
7	  cost-cascade order (cheap CPU stages gate the expensive GPU stage) and
8	  reports per-stage status + timing. It is a SEQUENCER, not a re-implementation
9	  — every stage shells out to the existing `ph
... [+21438 chars truncated]

### Assistant | 2026-05-16T05:21:05.676Z

I have the full file. Tracing every path now.

## Code Quality Analysis Report

### Summary
- Files Analyzed: 1 (`H:\prism\Docustrata\.index\docustrata-pipeline.py`, 467 lines)
- Overall Quality Score: 9/10
- Issues Found: 0 P0, 1 P1, 3 P2

### Verification of the 5 rewrite mechanisms

**1. TAINT PROPAGATION — CORRECT**

- **(a) Taint check before existence check:** Lines 227-232 (`tainted_in` → return `blocked-upstream`) execute strictly before lines 234-238 (`missing_in` existence check). A tainted file that still exists on disk is correctly blocked. CONFIRMED.
- **(b) `blocked-upstream` in `FAILING`:** Line 162-163 — `"blocked-upstream"` is in the `FAILING` set. So when stage X is blocked-upstream, line 408 sees its status in `FAILING` and line 409 taints `stage["produces"]`. Transitive propagation CONFIRMED.
- **(c) `stale-external` and `blocked-external-missing` in `FAILING`:** Line 161-162 — both present. `verified-rollup` (external) produces `phase20-verified-prints-by-doc.jsonl` (line 128), which is exactly what `split-containers` consumes (line 138). A stale/missing rollup → status in `FAILING` → line 409 taints `produces` → `split-containers` sees tainted input → `blocked-upstream`. CONFIRMED.

The full transitive chain works: any `FAILING` status taints `produces`; every downstream stage consuming a tainted path checks `tainted` first and blocks; `blocked-upstream` is itself `FAILING` so it re-taints its own `produces`. No stage can run against tainted data.

One important edge worth noting (not a bug): taint relies on exact string equality between a producer's `produces` entry and a consumer's `consumes` entry. All paths go through `_i()`/`_d()` with identical arguments, so the strings match byte-for-byte (e.g. `pdf-page-counts.jsonl` produced by `delta-page-count` line 102 == consumed by `text-density` line 109). CORRECT by construction.

**2. PER-STAGE LOG CAPTURE — CORRECT**

Lines 284-288: `with open(logpath, "w", ...) as lf:` wraps `subprocess.run(.
... [+6088 chars truncated]
