---
type: "chat-session"
source: "claude-code-cli"
session_id: "96e6ce13-234c-4fb1-9680-b3d4bd9b68cb"
title: "You are auditing the test coverage gap for 3 new CLI scripts shipped this sessio"
date: "2026-05-25"
first_ts: "2026-05-25T00:28:39.545Z"
last_ts: "2026-05-25T00:29:32.088Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/96e6ce13-234c-4fb1-9680-b3d4bd9b68cb/subagents/agent-a06177ff5ff56b136.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are auditing the test coverage gap for 3 new CLI scripts shipped this sessio

> **claude-code-cli** | 2026-05-25 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/96e6ce13-234c-4fb1-9680-b3d4bd9b68cb/subagents/agent-a06177ff5ff56b136.jsonl`

## Transcript

### User | 2026-05-25T00:28:39.545Z

You are auditing the test coverage gap for 3 new CLI scripts shipped this session. Per PRISM doctrine (CLAUDE.md §SCRUTINY GATE + slot soul §4 india post-processor specialty: Ω≥0.98 for program-emit) + the hook-emitted TEST COVERAGE REMINDER warning, these scripts need tests before they support shop-floor production.

**Files (read all 3 end-to-end + count exports + identify pure logic):**
1. `H:/prism/scripts/generate-post-processor-scenarios.mjs` (v1+v2 generator; ~600 LOC, ~9 exports including `generateCorpus`, `SCHEMA_VERSION`, `CONTROLLERS`, `OPERATIONS`, `CYCLES_BY_OPERATION`, `AXIS_COUNTS`, `MATERIALS`, `ENVELOPES`, `DIALECT_FEATURES`)
2. `H:/prism/scripts/lib/post-processor-catalog.mjs` (~250 LOC, ~9 exports including `CONTROLLER_FEATURES`, `CONTROLLER_IDS`, `SPINDLE_TAPERS`, `OPTIONAL_FEATURES`, `featureValidForController`, `loadMachines`, `filterMachinesByType`, `spindleForMachine`, `controllersForMake`)
3. `H:/prism/scripts/post-processor-validate-corpus.mjs` (~400 LOC; validateStructural, validateRuntime, runBatch, emitReports)

**Sibling test conventions to match:** `H:/prism/scripts/generate-priority-queue-features.test.mjs`, `H:/prism/scripts/generate-misc-tasks-features.test.mjs`, `H:/prism/scripts/lib/master-index-search-lib.test.mjs` — all use `node:test` + plain assert.

**Your job — return a TEST PLAN with:**
1. **Critical test cases (must-have for ship):** name each test by what it asserts (e.g. "featureValidForController rejects tsc on fanuc"). Target ≥10 critical cases across the 3 files. Each must have an algebraic or canonical reference value (per CLAUDE.md R9: stubs/`toBeDefined()` REJECTED).
2. **High-value test cases (should-have, lifts confidence):** ≥10 more. Focus on: cross-dialect leak detection (the bug we just caught — codify it as a regression test), deterministic seed reproducibility, stratification correctness, runtime-vs-structural mode parity, coverage matrix accuracy.
3. **Edge cases (empty, null, unknown controller, missing m
... [+527 chars truncated]

### Assistant | 2026-05-25T00:28:44.790Z

I'll read the three scripts to understand their structure and then create a focused test plan.

### Assistant | 2026-05-25T00:28:44.948Z

[tool_use: Read]

### Assistant | 2026-05-25T00:28:45.125Z

[tool_use: Read]

### Assistant | 2026-05-25T00:28:45.134Z

[tool_use: Read]

### User | 2026-05-25T00:28:49.670Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * post-processor-validate-corpus.mjs — PRISM-LAUNCH-READINESS-MS0 P0-U06
4	 *
5	 * Validation harness for the post-processor scenario corpus.
6	 * Owned by slot:india per JULIETT-12CHAT-ALLOCATION-MS0.
7	 *
8	 * Per india slot soul:
9	 *   - Resolve controller dialect BEFORE any G-code emit (each scenario
10	 *     mandates it; harness verifies the resolved profile m
... [+16224 chars truncated]

### User | 2026-05-25T00:28:49.681Z

[tool_result] 1	/**
2	 * post-processor-catalog.mjs — sourced from PRISM real catalogs.
3	 *
4	 * Owned by slot:india (P0-U06 / PRISM-LAUNCH-READINESS-MS0).
5	 *
6	 * Two data sources, BOTH internal:
7	 *   1. mcp-server/src/data/gwizard-machines.json — 99 real machines
8	 *      (Bridgeport, Haas, Mazak, DMG MORI, etc.) with taperType, rpmLimit,
9	 *      hpLimit, type (Mill/Lathe/Router).
10	 *   2. mcp-serve
... [+10997 chars truncated]

### User | 2026-05-25T00:28:49.734Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-post-processor-scenarios.mjs — PRISM-LAUNCH-READINESS-MS0 P0-U06
4	 *
5	 * Generates the post-processor cross-controller validation corpus.
6	 * Owned by slot:india per JULIETT-12CHAT-ALLOCATION-MS0.
7	 *
8	 * Output: state/shared/scenarios/post-processor/batch-<NNN>/
9	 *   - manifest.json   (corpus metadata + coverage matrix)
10	 *   - scenarios/<id>.jso
... [+27113 chars truncated]

### Assistant | 2026-05-25T00:28:51.162Z

Now let me check the sibling test conventions to understand the testing pattern.

### Assistant | 2026-05-25T00:28:51.788Z

[tool_use: Read]

### Assistant | 2026-05-25T00:28:51.971Z

[tool_use: Read]

### User | 2026-05-25T00:29:00.909Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-misc-tasks-features.test.mjs — node:test suite.
4	 *
5	 * Real-value assertions (CLAUDE.md R9): roost/child counts, parent pointers,
6	 * kind tags, idempotency and dedup are all checked against fixture inventories.
7	 */
8	
9	import test from "node:test";
10	import assert from "node:assert/strict";
11	import {
12	  generate, MISC_ROOST_ID, PLANNED_PARENT,
... [+4036 chars truncated]

### User | 2026-05-25T00:29:00.939Z

[tool_result] 1	/**
2	 * master-index-search-lib.test.mjs
3	 *
4	 * Real-value coverage for the shared keyword search lib used by both
5	 * master-index-precheck-inject.mjs and spawned-agent-context-lib.mjs.
6	 *
7	 * Uses node:test (matches the rest of .claude/helpers/ test pattern) so it
8	 * works under the portable node runner without vitest harness setup.
9	 *
10	 * Coverage:
11	 *   - tokenize: stopwords,
... [+3255 chars truncated]

### Assistant | 2026-05-25T00:29:32.088Z

Based on my analysis of the three scripts, here is the test plan:

---

## TEST COVERAGE PLAN: Post-Processor CLI Scripts

### Overview
Three interdependent scripts (generator, catalog lib, validator) need 20+ critical tests covering stratified corpus generation, structural cross-dialect rejection, runtime oracle validation, and seeded RNG determinism. **Key risk:** the forced-controller retry logic (generator line 442) can leak old-controller tokens into `expected_gcode_shape` if not carefully re-derived — codify as a regression test.

---

### FILE 1: `generate-post-processor-scenarios.mjs`

| # | Test name | Assertion | Reference value | Severity |
|---|-----------|-----------|------------------|----------|
| 1 | Seeded RNG produces deterministic corpus | `generateCorpus({seed: 42})` emits same 5 scenarios on 2nd call with seed 42 | scenario IDs + cycle names exact-match | P0 |
| 2 | Stratified generation guarantees per-controller minimum | Target 200 → 7 controllers → ≥28 scenarios per dialect | `manifest.coverage.by_controller[*] >= 28` | P0 |
| 3 | expectedGCodeShape rejects cross-dialect tokens | Fanuc scenario must_contain `['G81','G54']` AND must_not_contain `['CYCL DEF','BEGIN PGM']` | tokens per lines 212–248 | P0 |
| 4 | Forced-controller retry re-derives expected_gcode_shape | Force 'heidenhain' dialect after retry exhausted → verify `must_contain` includes `'BEGIN PGM'` not `'G81'` | schema line 448 re-derive call present | P0 |
| 5 | Forced-controller retry re-gates optional_features | Feature list after force shrinks if previously-optional feature invalid for new controller | `optional_features.length` decreases, `rejected_features.length` increases | P0 |
| 6 | V2 scenario includes machine + spindle + real catalogs | `schemaVersion === '2.0.0'` → `scenario.machine.make` and `spindle.taper_id` are non-null | machine ∈ gwizard; spindle ∈ SPINDLE_TAPERS | P0 |
| 7 | V1 legacy path still works for schemaVersion '1.0.0' | `generateCorpus({schemaVersion: 
... [+7173 chars truncated]
