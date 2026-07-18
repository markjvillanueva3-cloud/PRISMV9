---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Independent verification of a rewritten Python pipeline orchestrator: `H:\\prism\\"
date: "2026-05-16"
first_ts: "2026-05-16T05:20:32.958Z"
last_ts: "2026-05-16T05:21:20.484Z"
cwd: "H:\\prism\\Docustrata\\.index"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a5cccb8858cd5364b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent verification of a rewritten Python pipeline orchestrator: `H:\prism\

> **claude-code-cli** | 2026-05-16 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism\Docustrata\.index
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a5cccb8858cd5364b.jsonl`

## Transcript

### User | 2026-05-16T05:20:32.958Z

Independent verification of a rewritten Python pipeline orchestrator: `H:\prism\Docustrata\.index\docustrata-pipeline.py` (~400 lines). Read the WHOLE file end-to-end. A prior review of the previous version returned FAIL with 1 P0 + 4 P1; this is the rewrite. Verify each fix is correct AND complete, and that the rewrite introduced no new bug.

The file orchestrates 7 stages of PRISM's Docustrata document-print-reading pipeline; each stage shells out to an existing `phaseN-*.py` script. It is a sequencer, not a reimplementation.

The prior FAIL findings and their claimed fixes — VERIFY each:

1. P0 — a STALE external artifact (`verified-rollup`: `phase20-verified-prints-by-doc.jsonl` was ~23h older than its input `phase15-deep-rescan-parallel.jsonl`) was classified `stale-external`, which was NOT in `FAILING`, so the chain continued and `split-containers` ran against stale data AND the run exited 0 — failure masked as success. CLAIMED FIX: `stale-external` is now in `FAILING`; a `tainted` set in `main()` collects the `produces` of every `FAILING` stage; `run_stage` blocks any stage consuming a tainted path as `blocked-upstream`. So a stale `verified-rollup` should now taint `phase20-verified-prints-by-doc.jsonl`, `split-containers` consumes it -> `blocked-upstream`, and exit is 1. VERIFY this end-to-end, including that the exit code is genuinely non-zero.

2. P1 — a FAILING predecessor did not block successors that consume its output. CLAIMED FIX: same `tainted` mechanism. Verify a failed `delta-page-count` (which APPENDS to `pdf-page-counts.jsonl` — a file that still EXISTS even when phase6b fails) now taints `pdf-page-counts.jsonl` so `text-density` is `blocked-upstream`, NOT run against the stale ledger. Confirm the taint check precedes the file-existence check (critical — the file exists).

3. P1 — Ctrl-C mid-stage mislabeled the interrupted stage as `not-run`. CLAIMED FIX: `run_stage` catches `KeyboardInterrupt` around `subprocess.run`, records `status=interrupt
... [+1669 chars truncated]

### Assistant | 2026-05-16T05:20:37.553Z

I'll read the file end-to-end and verify each claimed fix.

### Assistant | 2026-05-16T05:20:37.940Z

[tool_use: Read]

### User | 2026-05-16T05:20:38.380Z

[tool_result] read-once-guard: 'H:\prism\Docustrata\.index\docustrata-pipeline.py' was already read 16s ago in this session and is unchanged (mtime 1778908777243). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T05:20:41.268Z

The read-once guard says the file is already in my context, but I don't actually have it. Let me read it with an explicit offset to bypass.

### Assistant | 2026-05-16T05:20:41.626Z

[tool_use: Bash]

### User | 2026-05-16T05:20:45.105Z

[tool_result] #!/usr/bin/env python3
"""
docustrata-pipeline.py — unified print-reading pipeline orchestrator.

WHAT THIS IS:
  One command that sequences the Docustrata print-extraction phases in
  cost-cascade order (cheap CPU stages gate the expensive GPU stage) and
  reports per-stage status + timing. It is a SEQUENCER, not a re-implementation
  — every stage shells out to the existing `phaseN-*.py` script 
... [+19677 chars truncated]

### Assistant | 2026-05-16T05:21:20.484Z

I have the full file. Let me verify each claimed fix and do a fresh pass for new bugs.

## Verification of Prior FAIL Findings

### P0 — Stale external artifact masking failure as success

**Fix verified CORRECT and COMPLETE.**

- Line 169-171: `FAILING` set now includes `"stale-external"` (and `"blocked-upstream"`, `"interrupted"`).
- Line 263-265: in `run_stage`, the `verified-rollup` external stage classifies as `stale-external` when `newest_mtime(prod) < newest_mtime(consumes)`.
- Line 380-381: `main()` does `if res["status"] in FAILING: tainted.update(stage["produces"])`. A `stale-external` `verified-rollup` taints `phase20-verified-prints-by-doc.jsonl`.
- Line 222-227: `split-containers` consumes `phase20-verified-prints-by-doc.jsonl`; the `tainted_in` check fires first → `blocked-upstream`.
- Line 422: `bad_n` counts both `stale-external` and `blocked-upstream` → `bad_n >= 2`.
- Line 442: `return 1 if bad_n else 0` → genuine non-zero exit.

End-to-end chain confirmed: stale rollup → taint → `split-containers` blocked → exit 1.

### P1 — FAILING predecessor not blocking successors

**Fix verified CORRECT and COMPLETE.** Specifically for the `delta-page-count` → `text-density` case:

- `delta-page-count` produces `pdf-page-counts.jsonl` (line 100). On failure → `failed` ∈ `FAILING` → line 380-381 `tainted.update({pdf-page-counts.jsonl})`.
- `text-density` consumes `pdf-page-counts.jsonl` (line 107).
- **Critical ordering confirmed:** lines 222-227 (`tainted_in` check) execute *before* lines 229-232 (`missing_in` existence check). Since phase6b *appends*, the ledger still exists on disk — but the taint check fires first → `text-density` is `blocked-upstream`, NOT run against the stale ledger. Correct.

### P1 — Ctrl-C mislabeled as `not-run`

**Fix verified CORRECT and COMPLETE.**

- Line 311-314: `run_stage` catches `KeyboardInterrupt` around `subprocess.run`, sets `status="interrupted"`, returns normally with an accurate record.
- Line 378: the result is appen
... [+4705 chars truncated]
