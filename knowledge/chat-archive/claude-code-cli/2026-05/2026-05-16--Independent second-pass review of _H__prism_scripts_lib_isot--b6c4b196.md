---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Independent second-pass review of `H:/prism/scripts/lib/isotonic-calibrator.mjs`"
date: "2026-05-16"
first_ts: "2026-05-16T05:02:11.573Z"
last_ts: "2026-05-16T05:03:17.811Z"
cwd: "H:\\prism\\scripts\\lib"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-af7cf1b05ca2803af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of `H:/prism/scripts/lib/isotonic-calibrator.mjs`

> **claude-code-cli** | 2026-05-16 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism\scripts\lib
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-af7cf1b05ca2803af.jsonl`

## Transcript

### User | 2026-05-16T05:02:11.573Z

Independent second-pass review of `H:/prism/scripts/lib/isotonic-calibrator.mjs` — component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of the NN-GRAPH-MS0 GNN milestone. It is a pure ES-module library implementing isotonic-regression probability calibration (Pool Adjacent Violators). `scripts/lib/*.mjs` + `node:test` convention.

Another reviewer is checking the PAV / interpolation math. YOU are weighted toward what they may miss:

1. **Serialization contract** — the milestone's U4 checkpoint-loader component will persist a fitted calibrator as plain JSON. `fitIsotonicCalibrator` returns `{breakpoints, fitted, n, dropped}` and `predictCalibrated(breakpoints, x)` is a standalone pure function over just `breakpoints`. Verify the breakpoints array is genuinely plain-JSON-serializable (no functions, no typed arrays, no NaN/Infinity that JSON.stringify would turn to null) and that a round-trip `JSON.parse(JSON.stringify(breakpoints))` still works with `predictCalibrated`. This is the key design property.
2. **R12 fail-loud vs fail-soft** (PRISM CLAUDE.md) — `fitIsotonicCalibrator` THROWS on a non-array / length-mismatch (caller error) but DROPS non-finite (score,label) pairs and counts them in `dropped`. Is that the right split? Compare to the sibling libs `H:/prism/scripts/lib/graph-random-walk.mjs` and `node2vec-embedder.mjs` (read them) — they throw on bad *params* but fail-soft on bad *data*. Is `dropped` observable enough? `brierScore` returns NaN for empty input — is that honest or should it throw?
3. **Convention conformance** — header doc style, `clamp01` helper, export style, `RangeError` messages — does it read like its U3 siblings `graph-random-walk.mjs` / `node2vec-embedder.mjs` / `systemviz-node-feature-projector.mjs`? Read at least one.
4. **API ergonomics for the downstream consumers** — U5 (GraphSAGE predict) and U7 (eval harness) will consume this. Is the `{breakpoints, fitted, n, dropped}` shape clean? Is `fitted:false` (empty-fit) handled gracefully end-t
... [+589 chars truncated]

### Assistant | 2026-05-16T05:02:15.956Z

I'll review the file and its siblings.

### Assistant | 2026-05-16T05:02:16.808Z

[tool_use: Read]

### Assistant | 2026-05-16T05:02:17.235Z

[tool_use: Read]

### User | 2026-05-16T05:02:17.283Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\isotonic-calibrator.mjs' was already read 13s ago in this session and is unchanged (mtime 1778907700288). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T05:02:17.341Z

[tool_use: Read]

### User | 2026-05-16T05:02:17.855Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graph-random-walk.mjs' was already read 30m ago in this session and is unchanged (mtime 1778904770518). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T05:02:17.931Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node2vec-embedder.mjs' was already read 23m ago in this session and is unchanged (mtime 1778906148309). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T05:02:20.993Z

The read-once guard says these files are already in my context, but I'm a fresh agent invocation — I don't actually have their contents. Let me bypass the cache.

### Assistant | 2026-05-16T05:02:21.487Z

[tool_use: Read]

### Assistant | 2026-05-16T05:02:22.204Z

[tool_use: Bash]

### User | 2026-05-16T05:02:22.214Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\isotonic-calibrator.mjs' was already read 18s ago in this session and is unchanged (mtime 1778907700288). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T05:02:27.208Z

[tool_result] #!/usr/bin/env node
/**
 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
 *
 * Why this exists: a trained classifier's raw output score is rarely a
 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
 * cases that are positive only 60% of the time. The NN-GRAPH-MS0 risk
 * registe
... [+7567 chars truncated]

### Assistant | 2026-05-16T05:02:29.453Z

Now let me read the sibling libs to verify convention conformance.

### Assistant | 2026-05-16T05:02:31.859Z

[tool_use: Bash]

### User | 2026-05-16T05:02:36.322Z

[tool_result] #!/usr/bin/env node
/**
 * graph-random-walk.mjs — node2vec 2nd-order biased random walks over the
 * normalized PRISM system graph. Foundation for U-NNG-NODE2VEC-TOPOLOGY:
 * the walk corpus feeds the skip-gram embedder (Node2Vec part 2).
 *
 * Reference: Grover & Leskovec, "node2vec: Scalable Feature Learning for
 * Networks" (KDD 2016). The 2nd-order transition from (prev → cur → next):
 *   - 
... [+7319 chars truncated]

### Assistant | 2026-05-16T05:02:39.273Z

I have everything needed. Let me verify the JSON round-trip and check the test file exists.

### Assistant | 2026-05-16T05:02:45.847Z

[tool_use: Bash]

### User | 2026-05-16T05:02:49.723Z

[tool_result] fit: {"breakpoints":[{"x":0.1,"y":0},{"x":0.2,"y":0.3333333333333333},{"x":0.3,"y":0.3333333333333333},{"x":0.5,"y":0.5},{"x":0.7,"y":1},{"x":0.9,"y":1},{"x":0.95,"y":1}],"fitted":true,"n":9,"dropped":0}
roundtrip equal: true
predict 0.4 orig: 0.4166666666666667 rt: 0.4166666666666667
has non-finite bp: false
empty fit: {"breakpoints":[],"fitted":false,"n":0,"dropped":2} predict identity 0.6 => 0.
... [+141 chars truncated]

### Assistant | 2026-05-16T05:03:17.811Z

All edge cases verified. Here is my independent second-pass review.

---

## Review: `isotonic-calibrator.mjs` (Arm B — independent second pass)

**Scope per assignment:** serialization, fail-loud split, convention, ergonomics, magic numbers, footguns. PAV/interpolation math left to Arm A.

### 1. Serialization contract — VERIFIED CLEAN
`breakpoints` is `[{x:number,y:number}]` — plain objects, finite numbers only. Live round-trip confirmed: `JSON.parse(JSON.stringify(breakpoints))` is byte-identical and `predictCalibrated` over the parsed copy returns identical output (`0.4166...` both ways). No functions, no typed arrays. NaN/Infinity cannot reach `breakpoints` — `fitIsotonicCalibrator` drops every non-finite pair *before* PAV (line ~92), and block means `sumWY/sumW` are finite-over-positive. The U4 checkpoint loader can persist this as-is. **No finding.**

### 2. Fail-loud vs fail-soft split — CORRECT, matches siblings
THROW-on-bad-param / DROP-on-bad-data matches `graph-random-walk.mjs` (`buildAdjacency` returns empty on `!graph`, skips bad edges) and `node2vec-embedder.mjs` (rejects a one-shot generator loudly, tolerates bad walks). `dropped` is observable in the returned shape — good. `brierScore` returning `NaN` on empty input is honest *and* documented ("loud — surfaces in any report") — `NaN <= 0.15` is false, so the exit gate cannot silently pass on zero samples. **No finding.**

**P1 — `isotonic-calibrator.mjs:~108`** — `n` (usable-pair count) is the *only* signal that a fit is thin. A fit on `n=1` returns `fitted:true` with a single flat breakpoint that maps **every** input to one constant (verified: single point `(0.5,1)` → `predict(0.3)=1`, `predict(0.9)=1`). That is a degenerate, useless calibrator that downstream U5 cannot distinguish from a healthy one without manually inspecting `n`. Recommend either documenting a minimum-`n` expectation in the header or having U5/U7 treat low `n` as `fitted:false`-equivalent. Not a P0 (the data *is* there in `n`), 
... [+2400 chars truncated]
