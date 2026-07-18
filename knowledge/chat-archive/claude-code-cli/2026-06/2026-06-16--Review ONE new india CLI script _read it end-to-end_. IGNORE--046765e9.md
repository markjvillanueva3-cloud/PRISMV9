---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "Review ONE new india CLI script (read it end-to-end). IGNORE all other working-t"
date: "2026-06-16"
first_ts: "2026-06-16T18:08:06.998Z"
last_ts: "2026-06-16T18:11:32.836Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-abe84cd04850b9c4f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Review ONE new india CLI script (read it end-to-end). IGNORE all other working-t

> **claude-code-cli** | 2026-06-16 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-abe84cd04850b9c4f.jsonl`

## Transcript

### User | 2026-06-16T18:08:06.998Z

Review ONE new india CLI script (read it end-to-end). IGNORE all other working-tree changes.
FILE: H:/prism/scripts/nn-graph-conformal-audit.mjs

Purpose: a conformal coverage audit for the GNN tier-5 holdout. It WIRES two existing engines (R8, no reinvention): CrossProcessConformalClassificationEngine (LAC split-conformal: calibrate({pairs:[{probs,label}]}) + predictionSet({probs,alpha}) -> {classes, qHat, fullSet}) and ConformalCalibrationMonitorEngine (configure/record/status -> empiricalCoverage). Pipeline: split pairs cal/test -> calibrate(cal) -> for each test predictionSet -> monitor.record({predictedSet, actualLabel}) -> report empiricalCoverage vs targetCoverage(1-alpha).

INDIA DISCIPLINE (the key invariant): it must NEVER emit a coverage number on a meaningless holdout. Verify:
1. The REFUSE-GATE: n_test < MIN_MEANINGFUL_N (20, == monitor MIN_WINDOW_SIZE) -> returns {ok:false, refused:true}, CLI exits 2. Correct + un-bypassable?
2. The fullSet/trustworthy guard: when most predictions fall back to the full label set (tiny calibration), coverage is trivially ~1.0 -> flagged trustworthy:false + a warning. Correct threshold logic?
3. Correctness of the engine wiring: calibrate(append:false) resets state each run? windowSize=test.length so empiricalCoverage = exact test coverage? alpha validated in (0,1)? The predictionSet is known to GUARANTEE a non-empty set (Sadinle argmax fallback) -- confirm the code's comment + that feeding ps.classes to the monitor (min(1) schema) is always valid, and that a future empty-set regression fails LOUD (not silent miscount).
4. Edge/failure handling: empty pairs, empty calibration split, non-finite probs, monitor/calibrate returning ok:false -> all surface as {ok:false} cleanly (no unhandled throw)?
5. The run-if-main guard (Windows path normalization) + exit codes (2=refused/failed, 1=guarantee-unmet under --strict, 0=ok). Sound?
6. Any silent-failure, off-by-one in the cal/test split, or a way the tool reports a coverage it
... [+75 chars truncated]

### Assistant | 2026-06-16T18:11:32.836Z

API Error: 529 Overloaded. This is a server-side issue, usually temporary — try again in a moment. If it persists, check https://status.claude.com.
