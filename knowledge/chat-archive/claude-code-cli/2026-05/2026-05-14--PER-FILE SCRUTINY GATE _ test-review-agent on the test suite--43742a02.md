---
type: "chat-session"
source: "claude-code-cli"
session_id: "43742a02-0370-4652-8998-ee7176779c1a"
title: "PER-FILE SCRUTINY GATE — test-review-agent on the test suite for U-CLEANUP-B12. "
date: "2026-05-14"
first_ts: "2026-05-14T18:12:06.101Z"
last_ts: "2026-05-14T18:13:06.868Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 7
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/43742a02-0370-4652-8998-ee7176779c1a/subagents/agent-aa38dad2a2084b900.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# PER-FILE SCRUTINY GATE — test-review-agent on the test suite for U-CLEANUP-B12. 

> **claude-code-cli** | 2026-05-14 | 20 msgs (7 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/43742a02-0370-4652-8998-ee7176779c1a/subagents/agent-aa38dad2a2084b900.jsonl`

## Transcript

### User | 2026-05-14T18:12:06.101Z

PER-FILE SCRUTINY GATE — test-review-agent on the test suite for U-CLEANUP-B12.

File: `H:/prism/scripts/__tests__/export-ledger-lora.test.mjs`
SUT: `H:/prism/scripts/export-ledger-lora.mjs`

Verify the test suite meets the comprehensive-build floor from CLAUDE.md:
- happy path
- ≥3 failure modes (bad input, boundary, resource exhaustion)
- ≥2 adversarial inputs (NaN, Infinity, empty, oversize)
- ≥3 spanning variability configs (e.g. agent_type variants, severity)
- real reference values — NEVER toBeDefined() stubs, NEVER toBeTruthy() weakening
- if SUT exposes a renderRow / pure function, tests assert exact field values, not shape
- if there's an atomic-write path, at least one test goes through the real disk
- if there's a DB seam, at least one test exercises the failure case (open fail, missing table)
- training_ready boundary tested both above and below threshold
- exit codes verified through runCli

Bad signs to flag P0/P1:
- any `toBeDefined()` / `expect.anything()` instead of concrete value
- skipped tests / `it.skip` / `describe.skip`
- tests that always pass regardless of SUT behavior (tautologies)
- mock-only tests with no integration arm
- missing parseArgs adversarial / error coverage

The 36-test run already passes — your job is to look for tests that pass without verifying the underlying intent.

Read the WHOLE test file. Flag P0/P1/P2/P3 findings. Grade PASS/FAIL.

### Assistant | 2026-05-14T18:12:08.375Z

I'll read the test file and thoroughly review it against the comprehensive-build floor.

### Assistant | 2026-05-14T18:12:08.424Z

[tool_use: Read]

### User | 2026-05-14T18:12:11.450Z

[tool_result] 1	/**
2	 * export-ledger-lora.test.mjs — CLEANUP-MS0 / U-CLEANUP-B12 tests
3	 *
4	 * Real-value test suite — no toBeDefined() stubs. Covers:
5	 *   - happy path: 5 rows, spanning severity + agent_type
6	 *   - empty DB (db file missing)
7	 *   - empty bug_attribution table
8	 *   - dry-run (no writes)
9	 *   - training_ready threshold crossed
10	 *   - training_ready below threshold
11	 *   - 3 fa
... [+22860 chars truncated]

### Assistant | 2026-05-14T18:12:12.870Z

Now let me read the SUT to understand what the tests are verifying:

### Assistant | 2026-05-14T18:12:13.190Z

[tool_use: Read]

### User | 2026-05-14T18:12:15.540Z

[tool_result] read-once-guard: 'H:\prism\scripts\export-ledger-lora.mjs' was already read 20s ago in this session and is unchanged (mtime 1778782034165). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T18:12:16.456Z

Let me grep for the SUT to understand the implementation:

### Assistant | 2026-05-14T18:12:17.321Z

[tool_use: Grep]

### User | 2026-05-14T18:12:19.108Z

[tool_result] 82:export function parseArgs(argv) {
216:export function renderRow(row) {

### Assistant | 2026-05-14T18:12:20.203Z

Let me check specific parts of the implementation to verify test intent alignment:

### Assistant | 2026-05-14T18:12:20.822Z

[tool_use: Grep]

### User | 2026-05-14T18:12:22.556Z

[tool_result] 116:          throw new Error(`Unknown flag: ${a}`);
121:    throw new Error(`Invalid --month "${out.monthKey}"; expected YYYY-MM`);
146:  if (!Number.isFinite(d.getTime())) throw new Error(`Invalid timestamp: ${ms}`);
154:  if (!m) throw new Error(`Invalid monthKey: ${monthKey}`);
220:  const weight = SEVERITY_WEIGHT[severity] ?? 1.0;
240:  const output = sortKeys({
253:    input: JSON.stringify(
... [+375 chars truncated]

### Assistant | 2026-05-14T18:12:23.847Z

Now let me verify the actual weight mapping and severity handling:

### Assistant | 2026-05-14T18:12:24.063Z

[tool_use: Grep]

### User | 2026-05-14T18:12:25.135Z

[tool_result] 77:const SEVERITY_WEIGHT = { P0: 2.5, P1: 2.5, P2: 1.0, P3: 1.0 };
219:  const severity = VALID_SEVERITIES.has(row.severity) ? row.severity : "P3";
220:  const weight = SEVERITY_WEIGHT[severity] ?? 1.0;

### Assistant | 2026-05-14T18:12:27.207Z

Excellent. Now let me verify edge cases in the renderRow implementation, particularly around file_paths truncation and dispatch_prompt:

### Assistant | 2026-05-14T18:12:27.630Z

[tool_use: Grep]

### User | 2026-05-14T18:12:28.990Z

[tool_result] 71-export const DEFAULT_REPO_ROOT = "H:/prism";
72-export const DEFAULT_DB_RELATIVE = "state/shared/coordination.db";
73-export const DEFAULT_OUT_DIR_RELATIVE = "state/shared/lora-training";
74:export const DISPATCH_PROMPT_EXCERPT_MAX = 2_000;   // chars; bound JSONL row size
75:export const FILE_PATHS_MAX = 32;                   // cap files-per-bug to keep row small
76-
77-const SEVERITY_WEIGHT 
... [+989 chars truncated]

### Assistant | 2026-05-14T18:13:06.868Z

Now I have a complete picture of the test file and the SUT. Let me conduct my comprehensive review.

## COMPREHENSIVE TEST REVIEW — `export-ledger-lora.test.mjs`

### TEST STRUCTURE ANALYSIS

The test suite has **36 tests across 6 describe blocks**, testing:
1. `parseArgs` — 5 tests
2. `resolvePaths / monthKey / monthBoundsUtc` — 6 tests
3. `renderRow` — 11 tests
4. `safeCountAllBugs / fetchRowsForMonth` — 4 tests
5. `exportLedgerLora` — 7 tests
6. `runCli` — 3 tests

---

### DETAILED FINDINGS

#### **PASS — Happy Paths**
- ✅ `parseArgs` defaults (line 138)
- ✅ `parseArgs` with all flags (line 146)
- ✅ `renderRow` P1 row with full schema (line 211) — verifies schemaVersion, dataset, weight, labels, input/output JSON shapes, fingerprint
- ✅ `renderRow` severity weight mapping (line 230) — covers P0/P1→2.5, P2/P3→1.0
- ✅ `exportLedgerLora` happy path (line 350) — 3 rows, variability across agent_type (opus/sonnet/ollama), writes JSONL + stats sidecar
- ✅ `runCli` success round-trip (line 518) — JSON output with schema version

#### **PASS — Failure Modes (3+ required)**
- ✅ **Failure mode A: Bad input format** — `parseArgs` throws on invalid --month formats (line 154): tests "2026-13", "2026", "may-2026"
- ✅ **Failure mode B: Bad enum** — `renderRow` degrades gracefully on unknown severity (line 237): sets weight=1.0, severity="P3"
- ✅ **Failure mode C: Malformed JSON** — `renderRow` degrades on bad file_paths_json (line 251): file_count=0, file_paths=[]
- ✅ **Failure mode D: DB open error** — `exportLedgerLora` propagates DB-open failure (line 434): rethrows with context message
- ✅ **Failure mode E: Missing table (graceful)** — `safeCountAllBugs` returns 0 when table missing (line 305)
- ✅ **Failure mode F: DB missing entirely** — `exportLedgerLora` returns ok=true, reason="db_missing" (line 340)
- ✅ **Failure mode G: Bad timestamp (defence-in-depth)** — rows with NaN detected_at are skipped (line 444): rowsSkipped=1, skippedDetail[0].reason="bad_ts_detected"

**ST
... [+9290 chars truncated]
