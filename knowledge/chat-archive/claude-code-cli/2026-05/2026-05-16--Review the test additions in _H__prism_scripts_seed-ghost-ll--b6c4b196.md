---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the test additions in `H:/prism/scripts/seed-ghost-llm-classify.test.mjs`"
date: "2026-05-16"
first_ts: "2026-05-16T18:59:20.672Z"
last_ts: "2026-05-16T19:00:17.738Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a22ca5740bb44187c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Review the test additions in `H:/prism/scripts/seed-ghost-llm-classify.test.mjs`

> **claude-code-cli** | 2026-05-16 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a22ca5740bb44187c.jsonl`

## Transcript

### User | 2026-05-16T18:59:20.672Z

Review the test additions in `H:/prism/scripts/seed-ghost-llm-classify.test.mjs`. Use the Read tool on it now — do not rely on memory.

CONTEXT — unit U6 (U-NNG-INFERENCE-FIFTH-TIER) of NN-GRAPH-MS0. The file `seed-ghost-llm-classify.mjs` (the LLM/4th tier of a wiring-inference cascade) was edited to extract a new exported helper `classificationToGraphUpdate(node, c, fallbackModel)` — it mutates a ghost node + returns a proposed-wire edge (or null on an invalid dispatcher). A classification may carry its own `confidence`+`reason` (the GNN tier-5 path) or not (the LLM path → falls back to `LLM_CONFIDENCE` 0.55 + `"LLM-classified via <model>"`).

The test file is `node:test` style (`describe`/`test` from `node:test`, `assert` from `node:assert/strict`). It had 24 tests; a new `describe("classificationToGraphUpdate (tier-5 merge helper)", ...)` block of 7 tests was added. All 31 currently pass under `node --test`.

Assess ONLY the new `classificationToGraphUpdate` describe block (the prior 24 tests were reviewed before):
  - Are the assertions concrete real-value checks, or weak tautologies?
  - Does it pin the load-bearing SEMANTIC-REGRESSION invariant — that an LLM-shape classification `{engine,dispatcher}` (no confidence/reason) still yields EXACTLY `confidence===LLM_CONFIDENCE` and `reason==="LLM-classified via <model>"`? This is the invariant that, if broken, silently changes every graph the 4-tier cascade has ever produced.
  - Is the GNN path tested (a classification carrying its own confidence + reason → they are honored)?
  - Adversarial: `__proto__` / non-prism / empty dispatcher → null + node untouched; missing node/classification → null; non-finite confidence → falls back.
  - Is the returned edge shape asserted (deepEqual on from/to/type/relation/status/intensity)?
  - Any gap: is there a case the helper handles that no test exercises?

Report concrete P0/P1 findings with line numbers (a P0/P1 = a stub/tautological assertion or a missing critical-path test
... [+47 chars truncated]

### Assistant | 2026-05-16T18:59:23.544Z

I'll read the test file now to assess the new `classificationToGraphUpdate` describe block.

### Assistant | 2026-05-16T18:59:23.718Z

[tool_use: Read]

### User | 2026-05-16T18:59:24.522Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-llm-classify.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS2/U-LLM-CLASSIFY
4	 * Run: node --test scripts/seed-ghost-llm-classify.test.mjs
5	 */
6	import { test, describe } from "node:test";
7	import assert from "node:assert/strict";
8	import fs from "node:fs";
9	import os from "node:os";
10	import path from "node:path";
11	import {
12	  readEngineHeader
... [+11098 chars truncated]

### Assistant | 2026-05-16T18:59:27.214Z

Now let me read the helper implementation to verify the tests pin the actual contract.

### Assistant | 2026-05-16T18:59:27.670Z

[tool_use: Read]

### User | 2026-05-16T18:59:28.123Z

[tool_result] read-once-guard: 'H:\prism\scripts\seed-ghost-llm-classify.mjs' was already read 2m ago in this session and is unchanged (mtime 1778957765744). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T18:59:30.932Z

The guard says I already have the file content, but it's not actually in my visible context — I haven't read `seed-ghost-llm-classify.mjs` in this conversation. Let me grep for the helper definition to verify the contract.

### Assistant | 2026-05-16T18:59:32.438Z

[tool_use: Grep]

### User | 2026-05-16T18:59:33.054Z

[tool_result] 40-export const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
41-export const DEFAULT_MODEL = "qwen2.5-coder:7b";
42-export const DEFAULT_BATCH_SIZE = 10;
43-export const DEFAULT_HEADER_LINES = 30;
44:export const LLM_CONFIDENCE = 0.55;
45:export const VALID_DISPATCHERS = Object.freeze([
46-  "prism_calc", "prism_cam", "prism_cad", "prism_turning", "prism_5axis",
47-  "prism_ai"
... [+2845 chars truncated]

### Assistant | 2026-05-16T18:59:35.305Z

Let me see the rest of the helper — the edge object and the dispatcher regex it uses.

### Assistant | 2026-05-16T18:59:36.531Z

[tool_use: Grep]

### User | 2026-05-16T18:59:37.229Z

[tool_result] 127-      signal: controller.signal,
128-    });
129:    if (!res?.ok) return { ok: false, error: `HTTP ${res?.status}` };
130-    const data = await res.json();
131-    const raw = data?.response || "";
132:    return { ok: true, raw, parsed: parseBatchResponse(raw, engines) };
133-  } catch (err) {
134:    return { ok: false, error: err?.message || String(err) };
135-  } finally {
136-    clearT
... [+772 chars truncated]

### Assistant | 2026-05-16T19:00:17.738Z

I now have the full helper contract. Let me assess the new `classificationToGraphUpdate` describe block (lines 198–268) against the implementation (lines 192–222).

## Code Quality Analysis Report

### Summary
- Scope: 7 tests in `describe("classificationToGraphUpdate (tier-5 merge helper)")` (lines 198–268)
- Helper under test: `classificationToGraphUpdate` (`seed-ghost-llm-classify.mjs:202–222`)
- Assertions: concrete real-value checks throughout — no `toBeDefined()`-class stubs, no tautologies
- Issues found: 1 P1 (semantic gap), 2 P2 (advisory)

### Critical-invariant coverage — all the asked-for paths are pinned

**SEMANTIC-REGRESSION invariant — PINNED.** Test `"LLM-shape classification gets the LLM confidence + reason defaults"` (lines 204–213) feeds `{engine, dispatcher: "prism_cam"}` with NO `confidence`/`reason` and asserts EXACTLY `node.confidence === LLM_CONFIDENCE` (line 209) and `node.reason === "LLM-classified via qwen2.5-coder:7b"` (line 210). It uses the imported `LLM_CONFIDENCE` constant, not a hardcoded `0.55`, so the test tracks the source of truth — if the constant moves, the test moves with it. The reason string is an exact `assert.equal` against the model name interpolated, matching `mjs:209`. This is the load-bearing 4-tier invariant and it is concretely held.

**GNN path — PINNED.** Test at lines 215–226 supplies `confidence: 0.74` + a real reason string, asserts `node.confidence === 0.74`, `node.reason === c.reason`, `node.info` contains `"GNN tier-5"`, `edge.intensity === 0.74`. Honors the carried values — correct.

**Edge shape — PINNED.** Test at lines 228–235 does a full `assert.deepEqual` on `{from, to, type, relation, status, intensity}`. This exactly matches the return object at `mjs:214–221`, including the `to: "dispatcher.prism_calc"` prefix construction. Strong.

**Adversarial — PINNED.** Lines 237–245 loop `__proto__`, `constructor`, `notprism`, `""`, `prism_`, `PRISM_CAM` — each asserts `edge === null` AND `node.proposed_wiring 
... [+5280 chars truncated]
