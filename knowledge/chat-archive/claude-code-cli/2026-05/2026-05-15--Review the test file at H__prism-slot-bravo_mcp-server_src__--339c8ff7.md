---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Review the test file at H:\\prism-slot-bravo\\mcp-server\\src\\__tests__\\CustomerMat"
date: "2026-05-15"
first_ts: "2026-05-15T20:08:11.266Z"
last_ts: "2026-05-15T20:08:57.520Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-aae18afac074dc3b4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Review the test file at H:\prism-slot-bravo\mcp-server\src\__tests__\CustomerMat

> **claude-code-cli** | 2026-05-15 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-aae18afac074dc3b4.jsonl`

## Transcript

### User | 2026-05-15T20:08:11.266Z

Review the test file at H:\prism-slot-bravo\mcp-server\src\__tests__\CustomerMaterialMapEngine.test.ts (just-written, ~500 LOC, ~46 it() blocks across 13 describe() blocks).

The engine under test is H:\prism-slot-bravo\mcp-server\src\engines\CustomerMaterialMapEngine.ts (MS-PRINT-PROGRAM-LOOP/U-PPL-C2 — a learned customer→material distribution map). It composes MATERIAL_KEYWORDS regex catalog from MaterialResolverForProgramsEngine.ts. The engine just shipped these critical changes via per-file scrutiny iteration:
  - Thread-context disambiguation in extractMaterialFromFilename (rejects M2/M5/S7 etc. when filename has SCREW/BOLT/TAPTITE/THREAD context — fix for Reviewer A P0-2).
  - MAX_FILENAME_LEN guard (1024 bytes) for ReDoS defense (Reviewer B P1-4).
  - Module-load assertion that no MATERIAL_KEYWORDS pattern has /g flag (Reviewer A P0-1).
  - Zod ProgramSampleEntrySchema for boundary validation (Reviewer B P1-1).
  - Instance-method convention waiver documented (Reviewer B P1-2, follows MaterialResolverForProgramsEngine sibling precedent).

What to check:
1. READ the whole test file end-to-end.
2. Coverage adequacy: every public export from the engine has at least one test? Both happy + sad + adversarial paths covered?
3. Real-value assertions (NOT toBeDefined() stubs — that class is hook-blocked). Every test should pin a specific numeric/string value, not just check non-null/non-undefined.
4. Reference values pinned to real JM-Die customer names (TOPURA, ALCOA, JACOBSON, TFI Aerospace, NATHANS USB) — are the integration tests using real shop data per [[reference_tribal_knowledge_search]]?
5. P0 fix coverage: does the thread-context describe block actually test the FIX (the inner re-scan loop that finds 4140 after rejecting M2)?  Specifically: is `M2-CAP-4140-SHAFT.MIN` tested and pinned to `raw_token=4140`?
6. Lock-test value: does the MATERIAL_KEYWORDS catalog lock describe block protect against the documented threat (future PR inserts new pattern at index 0,
... [+1148 chars truncated]

### Assistant | 2026-05-15T20:08:16.316Z

I'll review the test file comprehensively. Let me start by reading it end-to-end.

### Assistant | 2026-05-15T20:08:16.523Z

[tool_use: Read]

### User | 2026-05-15T20:08:27.940Z

[tool_result] 1	/**
2	 * CustomerMaterialMapEngine.test.ts — MS-PRINT-PROGRAM-LOOP / U-PPL-C2
3	 *
4	 * Covers the full public surface:
5	 *   - `extractMaterialFromFilename` (filename → MaterialHit | null) — happy path
6	 *     + thread-context disambiguation + MAX_FILENAME_LEN guard + word-boundary.
7	 *   - `extractMaterialFromCustomerFolder` (customer → MaterialHit | null).
8	 *   - `resolveEntryMaterial` —
... [+31579 chars truncated]

### Assistant | 2026-05-15T20:08:29.568Z

Now let me read the engine under test to verify the test coverage aligns with the actual implementation:

### Assistant | 2026-05-15T20:08:29.706Z

[tool_use: Read]

### User | 2026-05-15T20:08:40.178Z

[tool_result] 1	/**
2	 * CustomerMaterialMapEngine — learned customer → material distribution map
3	 *
4	 * MS-PRINT-PROGRAM-LOOP / Track C / U-PPL-C2 (= RES-MS21 core).
5	 *
6	 * Why this engine exists
7	 * ----------------------
8	 * `MaterialResolverForProgramsEngine._resolveFromCustomer()` resolves material
9	 * from a customer folder name today, BUT its comment explicitly says (line ~293):
10	 *
11	 *     
... [+30341 chars truncated]

### Assistant | 2026-05-15T20:08:57.520Z

## Review Complete — PASS

**Summary:** 46 `it()` blocks across 13 `describe()` suites. All critical paths covered with real-value assertions. P0 and P1 fixes verified. Test quality is excellent.

---

### Coverage Breakdown

**Strengths:**
1. **Lock tests (lines 47–67)** — P0-1 fix verified: regex /g flag assertion catches the documented idempotence threat. Catalog order pinned (first 4 entries) to prevent silent re-prioritization on insertion.
2. **Thread-context disambiguation (lines 189–228)** — P0-2 fix verified: test at line 217 specifically validates the re-scan loop (`M2-CAP-4140-SHAFT.MIN` → `raw_token=4140`). Both rejection path (M2-TAPTITE) and continuation path (M2-CAP-4140) exercised.
3. **MAX_FILENAME_LEN guard (lines 234–248)** — P1-4 fix verified: both boundary (exactly 1024 chars, still matches) and overflow (>1024, returns null) tested.
4. **Real-value assertions throughout** — Every test pins concrete ISO groups (P, M, K, N, S, H), material names, confidence scores, counts. No `toBeDefined()` stubs.
5. **All 6 ISO groups exercised** — P/M/N/S/H/K across multiple customer types (JACOBSON, ALCOA, TFI Aerospace, TOPURA, NATHANS USB).
6. **FAIL-LOUD coverage (lines 340–370)** — All 5 invalid-entry shapes tested: null, missing customer, empty string, 1-char, whitespace. TypeError correctly thrown on non-array input.
7. **Zod schema branches (lines 551–600)** — All 3 rejection paths tested: sub-min-length customer, empty filename, out-of-enum ISO group.
8. **Class wrapper delegation (lines 514–544)** — Singleton correctly delegates to pure functions. Structural equivalence verified (`customers` + `stats` fields compared).
9. **Distribution math (lines 372–478)** — Shares calculated correctly (0.6, 0.2, 0.2 at line 386–388), primary fallback tested (P when with_material=0), tie-breaking by declaration order confirmed.
10. **Adversarial inputs (lines 607–646)** — 1000-entry batch, Unicode customer names, non-string filenames (counted invalid), multiple al
... [+1551 chars truncated]
