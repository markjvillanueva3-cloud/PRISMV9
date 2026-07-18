---
type: "chat-session"
source: "claude-code-cli"
session_id: "b89c3f50-1cd2-448c-b2d0-f04ee6b13601"
title: "Review `H:/prism/scripts/__tests__/coord-db-sentinel.test.mjs` (~530 LOC) end-to"
date: "2026-05-13"
first_ts: "2026-05-13T23:28:57.125Z"
last_ts: "2026-05-13T23:29:25.572Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 11
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a550e4d3ff53ed158.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/__tests__/coord-db-sentinel.test.mjs` (~530 LOC) end-to

> **claude-code-cli** | 2026-05-13 | 31 msgs (11 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a550e4d3ff53ed158.jsonl`

## Transcript

### User | 2026-05-13T23:28:57.125Z

Review `H:/prism/scripts/__tests__/coord-db-sentinel.test.mjs` (~530 LOC) end-to-end for test quality.

Context: vitest suite for `H:/prism/scripts/coord-db-sentinel.mjs` (CLEANUP-MS0/U-CLEANUP-G2). 48/48 currently green. Sister test files for convention reference: `H:/prism/scripts/__tests__/build-system-viz-livediff.test.mjs`, `H:/prism/scripts/__tests__/build-headline-history.test.mjs`.

Test fixtures: real SQLite via better-sqlite3 (no mocking — file dbs in tmpdir per test). Helper `makeDb(root, {rows, dropTables, extraTables})` creates H8-schema dbs. Helper `makeWorkClaims(root, count)` writes pre-H8 JSON.

Check ALL of:
1. **Real reference values, not stubs** — every `expect(...).toBe(N)` / `toEqual(...)` asserts actual computed values, no `toBeDefined()` placeholders.
2. **Coverage floor met**: happy + ≥3 failure modes + ≥2 adversarial + ≥3 spanning configs + round-trip via CLI. Verify all present.
3. **Divergence math test** — covers 0/0, equal counts, 100% (one side 0), non-finite/negative clamp, the |Δ|/max identity at exact 9.0909%.
4. **generateAlerts coverage** — clean / integrity-fail / divergence-≥-threshold / divergence-below / custom-threshold / schema-drift / json-unreadable warn / db-unreadable short-circuit. ALL exercised?
5. **Integration tests via buildHealthReport** — happy 5/5, db-missing, db-zero-bytes, divergence-at-exactly-10%, retirement_candidate true case, retirement NOT-candidate empty case, schema-drift surfaces alert.
6. **Adversarial / spanning** — WORK_CLAIMS missing entirely, claims:'scalar' (non-object), 1/1 smallest scale, 100/108 (just below threshold), 50/100 (massive 50% divergence).
7. **Round-trip CLI** — --json no disk writes (asserts ZERO COORD_DB_HEALTH* files), default mode writes both files atomically, missing db produces failure (not throw), idempotency same-input twice → byte-identical markdown.
8. **writeAtomic** — 100 rapid writes never collide (PID+ts+random), no .tmp residue.
9. **Cleanup discipline** — every bef
... [+443 chars truncated]

### Assistant | 2026-05-13T23:29:00.095Z

I'll review the test file comprehensively against all 12 criteria.

### Assistant | 2026-05-13T23:29:00.105Z

[tool_use: Read]

### User | 2026-05-13T23:29:00.931Z

[tool_result] 1	/**
2	 * coord-db-sentinel.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-G2.
3	 *
4	 * Coverage floor:
5	 *   - happy path
6	 *   - >= 3 failure modes
7	 *   - >= 2 adversarial inputs
8	 *   - >= 3 spanning variability configs
9	 *   - round-trip through CLI entry
10	 *
11	 * Real reference values — no toBeDefined() stubs.
12	 */
13	
14	import { describe, it, expect, beforeEach, afterEach } f
... [+29588 chars truncated]

### Assistant | 2026-05-13T23:29:02.635Z

Now let me check the source file to understand the implementation being tested:

### Assistant | 2026-05-13T23:29:02.848Z

[tool_use: Read]

### User | 2026-05-13T23:29:03.556Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * coord-db-sentinel.mjs — Coordination Store Health Sentinel (CLEANUP-MS0/U-CLEANUP-G2)
4	 *
5	 * Two-pronged health check on the coordination state pair:
6	 *   1. SQLite WAL (`state/shared/coordination.db`) — H8 store, source of truth
7	 *   2. Legacy JSON (`state/shared/WORK_CLAIMS.json`) — pre-H8 store, retirement candidate
8	 *
9	 * Runs PRAGMA integrity_check +
... [+20955 chars truncated]

### Assistant | 2026-05-13T23:29:05.265Z

Now let me verify the test count and cross-check against the criteria:

### Assistant | 2026-05-13T23:29:05.648Z

[tool_use: Grep]

### User | 2026-05-13T23:29:05.900Z

[tool_result] scripts\__tests__\coord-db-sentinel.test.mjs:48

Found 48 total occurrences across 1 file.

### Assistant | 2026-05-13T23:29:07.384Z

Perfect. Now let me verify async handling and critical assertions:

### Assistant | 2026-05-13T23:29:07.609Z

[tool_use: Grep]

### User | 2026-05-13T23:29:08.157Z

[tool_result] scripts\__tests__\coord-db-sentinel.test.mjs:22

Found 22 total occurrences across 1 file.

### Assistant | 2026-05-13T23:29:09.216Z

Now let me verify the specifics on stub assertions (toBeDefined) and other concerns:

### Assistant | 2026-05-13T23:29:09.921Z

[tool_use: Grep]

### User | 2026-05-13T23:29:10.482Z

[tool_result] scripts\__tests__\coord-db-sentinel.test.mjs:86

Found 86 total occurrences across 1 file.

### Assistant | 2026-05-13T23:29:11.542Z

Excellent. Let me spot-check for any .skip or .only markers:

### Assistant | 2026-05-13T23:29:11.791Z

[tool_use: Grep]

### User | 2026-05-13T23:29:12.343Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-05-13T23:29:13.426Z

Good. Now let me verify cleanup discipline and stdout/stderr handling:

### Assistant | 2026-05-13T23:29:13.848Z

[tool_use: Grep]

### User | 2026-05-13T23:29:14.384Z

[tool_result] 15:import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
162:  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
195:  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
238:  afterEach(() => { rmSync(root, { recursive: true, force: true, 
... [+662 chars truncated]

### Assistant | 2026-05-13T23:29:15.525Z

Perfect. All cleanup is present. Let me verify the advertised coverage floor is met:

### Assistant | 2026-05-13T23:29:15.741Z

[tool_use: Grep]

### User | 2026-05-13T23:29:16.314Z

[tool_result] 125:describe("parseArgs", () => {
159:describe("loadSqliteDB", () => {
192:describe("queryIntegrity + getDbCounts", () => {
235:describe("getJsonCounts", () => {
283:describe("computeDivergence", () => {
313:describe("generateAlerts", () => {
419:describe("buildHealthReport (integration)", () => {
496:describe("adversarial + spanning configs", () => {
550:describe("renderMarkdown", () => {
617:des
... [+72 chars truncated]

### Assistant | 2026-05-13T23:29:17.457Z

Perfect. Now let me verify the spec requirements against the file header comments:

### Assistant | 2026-05-13T23:29:17.715Z

[tool_use: Read]

### User | 2026-05-13T23:29:18.414Z

[tool_result] 1	/**
2	 * coord-db-sentinel.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-G2.
3	 *
4	 * Coverage floor:
5	 *   - happy path
6	 *   - >= 3 failure modes
7	 *   - >= 2 adversarial inputs
8	 *   - >= 3 spanning variability configs
9	 *   - round-trip through CLI entry
10	 *
11	 * Real reference values — no toBeDefined() stubs.
12	 */

### Assistant | 2026-05-13T23:29:23.139Z

Excellent. Let me spot-check critical test cases to ensure they're testing real values:

### Assistant | 2026-05-13T23:29:24.876Z

[tool_use: Read]

### User | 2026-05-13T23:29:25.572Z

[tool_result] 283	describe("computeDivergence", () => {
284	  it("0/0 returns 0% (no division by zero)", () => {
285	    expect(computeDivergence(0, 0)).toEqual({ dbCount: 0, jsonCount: 0, absDelta: 0, divergencePct: 0 });
286	  });
287	
288	  it("equal counts return 0%", () => {
289	    expect(computeDivergence(100, 100).divergencePct).toBe(0);
290	  });
291	
292	  it("|Δ|/max identity: 100 vs 110 → 10/110 ≈ 9
... [+655 chars truncated]
