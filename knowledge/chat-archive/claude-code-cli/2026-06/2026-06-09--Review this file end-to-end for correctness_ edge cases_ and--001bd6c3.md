---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Review this file end-to-end for correctness, edge cases, and silent-failure risk"
date: "2026-06-09"
first_ts: "2026-06-09T17:59:22.886Z"
last_ts: "2026-06-09T18:00:50.034Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-af9146055e293591c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review this file end-to-end for correctness, edge cases, and silent-failure risk

> **claude-code-cli** | 2026-06-09 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-af9146055e293591c.jsonl`

## Transcript

### User | 2026-06-09T17:59:22.886Z

Review this file end-to-end for correctness, edge cases, and silent-failure risks. Report ONLY P0/P1 issues and give a final verdict PASS or FAIL.

FILE: H:/prism-slot-bravo/scripts/ollama-capability-probe.mjs
TEST: H:/prism-slot-bravo/scripts/ollama-capability-probe.test.mjs

What it must do (the contract): a DETERMINISTIC per-model capability probe for a local Ollama setup. For each model in PROBE_SPECS (gpt-oss:20b, gpt-oss:120b, qwen2.5-coder:32b, nomic-embed-text) it must prove (a) the model LOADS and (b) returns CORRECT representative output — a CONTENT assertion, not just HTTP 200: gpt-oss must emit a structured tool_calls array; qwen2.5-coder:32b must emit a code block (NOT tool_calls — it text-emits); nomic must return a 768-dim finite non-zero vector. (c) gradeReport must FAIL the whole run if any model fails OR if a wired-auto-used model (WIRED_AUTO_USED: search→gpt-oss:20b, codegen→qwen2.5-coder:32b) is not in the passing set. It has two CLI exit contracts: --ship (writes a JSON report, exit 0 on PASS / 1 on FAIL) and --gate (exit non-zero on any regression). It must FAIL LOUD: a model absent from /api/tags is recorded as a fail (never a silent skip that reads green). Models are probed SEQUENTIALLY with keep_alive:"0s" so gpt-oss:120b(~65GB)+qwen2.5-coder:32b(~37GB) never collide on a 96GB GPU.

It was LIVE-validated on the real host: all 4 models PASS, autoRunOk=true. It composes nothing external (self-contained). Ollama lists a bare-named pull as `name:latest` — tagMatches() must tolerate that (this was a bug already fixed).

Focus your review on: (1) any path where a model that DIDN'T actually work could be graded PASS (false-green) — the most important failure class; (2) the loads-assertion logic (residentVram via /api/ps, the embed-model 0-vram tolerance — is it too lax?); (3) timeout/abort handling per model; (4) the gradeReport verdict logic correctness; (5) the --gate vs --ship exit-code correctness; (6) any unhandled-rejection / resource leak. D
... [+104 chars truncated]

### Assistant | 2026-06-09T17:59:36.770Z

I'll review this file end-to-end. Let me read both the implementation and its test.

### Assistant | 2026-06-09T17:59:37.258Z

[tool_use: Read]

### Assistant | 2026-06-09T17:59:37.718Z

[tool_use: Read]

### User | 2026-06-09T17:59:39.832Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ollama-capability-probe.mjs
3	//
4	// U-OAB-U10 (OLLAMA-AUTORUN-BUILDLOOP) -- DETERMINISTIC per-model capability probe. The goal's
5	// "prove the most powerful available local LLMs actively run + auto-run per task" clause: for
6	// each model the fleet relies on, prove (a) it LOADS into VRAM and (b) it returns a CORRECT
7	// representative output -- a CONTENT as
... [+11370 chars truncated]

### User | 2026-06-09T17:59:39.925Z

[tool_result] 1	// scripts/ollama-capability-probe.test.mjs
2	// R9 tests for the capability-probe assertions (U-OAB-U10). Pure logic only -- the live model
3	// calls are validated by the `--ship` run at ship time (hermetic here: no Ollama). These lock
4	// the (b)-output assertions (the "correct content, not just HTTP 200" gate) + the gradeReport
5	// verdict incl the (c) auto-run cross-check, which is the wh
... [+4147 chars truncated]

### Assistant | 2026-06-09T17:59:48.095Z

I have both files. Let me trace the false-green paths carefully — that's the most important failure class per the contract.

Let me verify the critical question on the loads-assertion logic: in `probeModel`, `out.loads` is set, but does `out.correct` (the content assertion) actually gate the final pass? In `gradeReport`, `pass = r.loads === true && r.correct === true`. So both must hold. Good. Now let me trace each path for a model that didn't actually work being graded PASS.

Let me check one thing in the live Ollama API contract — the embeddings response shape — to confirm the `assertEmbedding(json.embedding)` read is correct.

### Assistant | 2026-06-09T17:59:49.714Z

[tool_use: Grep]

### User | 2026-06-09T18:00:00.987Z

[tool_result] H:\prism-slot-bravo\scripts\audit-wiki-coverage.mjs:121:  "embedding", "vector", "cache", "cdn", "object_store", "dnc", "mtconnect", "opcua", "mqtt",
H:\prism-slot-bravo\scripts\build-node-embeddings.mjs:3: * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
H:\prism-slot-bravo\scripts\build-node-embeddings.mjs:8: * state/shared/system-viz/_node-embeddings.jsonl — the semantic featu
... [+5369 chars truncated]

### Assistant | 2026-06-09T18:00:50.034Z

Confirmed: the sibling scripts read the embeddings response as `j.embedding` (with a `j.data[0].embedding` fallback). The probe at line 118 reads only `json.embedding` — this is the canonical `/api/embeddings` shape, so that's correct. Note the newer `/api/embed` endpoint returns `embeddings[[...]]`, but the probe uses the legacy `/api/embeddings` endpoint which returns `embedding`, matching the read. No issue there.

I have everything I need. Let me finalize my analysis of the false-green and loads-assertion paths.

## Code Quality Analysis Report — ollama-capability-probe.mjs

### Summary
- Files Analyzed: 2 (implementation + test)
- The contract's central invariant — `pass = loads && correct`, with a CONTENT assertion, and `gradeReport` failing on any model failure or any missing wired-auto-used model — holds. The verdict logic, `--ship`/`--gate` exit codes, sequential `keep_alive:"0s"` teardown, abort/timeout handling, and the `tagMatches(:latest)` tolerance are all correct.
- No P0 false-green path found. The most dangerous classes (200-but-wrong-content reads green; absent model reads green; vacuous empty PASS) are all explicitly defended in code and locked by tests.
- Two P1 findings below: one real false-green vector specific to the `tool`/`code` loads-assertion, and one silent-failure risk in the `loads` VRAM check.

### Critical Issues

None at P0. The core false-green protections are intact:
- Absent model → recorded `{loads:false, correct:false, why:"ABSENT"}` (line 143), never skipped.
- `gradeReport` requires `loads===true && correct===true` per model AND `autoRunOk` (lines 85-90); empty results → `allPass=false` → FAIL (line 89, locked by test line 67-69).
- Content assertions are real (tool_calls array + fn name; fenced/code tokens; 768-dim finite non-zero vector), not HTTP-200 checks.

### P1 Issues

**1. `out.loads` can be `true` while the model never actually loaded — VRAM check races the teardown (false-green vector).**
- File: `H:/prism-slot-bra
... [+5938 chars truncated]
