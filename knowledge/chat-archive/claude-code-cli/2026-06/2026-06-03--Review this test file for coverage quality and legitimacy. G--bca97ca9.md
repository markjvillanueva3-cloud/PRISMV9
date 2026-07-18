---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca97ca9-6098-4f88-a0cc-d28918dd42b6"
title: "Review this test file for coverage quality and legitimacy. Grade PASS/FAIL with "
date: "2026-06-03"
first_ts: "2026-06-03T05:34:33.682Z"
last_ts: "2026-06-03T05:35:27.239Z"
cwd: "H:\\prism\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/bca97ca9-6098-4f88-a0cc-d28918dd42b6/subagents/agent-a5ce718fe0f249e9f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review this test file for coverage quality and legitimacy. Grade PASS/FAIL with 

> **claude-code-cli** | 2026-06-03 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/bca97ca9-6098-4f88-a0cc-d28918dd42b6/subagents/agent-a5ce718fe0f249e9f.jsonl`

## Transcript

### User | 2026-06-03T05:34:33.682Z

Review this test file for coverage quality and legitimacy. Grade PASS/FAIL with P0/P1 issues (file:line). It currently passes 13/13.

FILE: H:/prism/mcp-server/src/__tests__/MillProgramCorpusEngine.test.ts
SUT: H:/prism/mcp-server/src/engines/MillProgramCorpusEngine.ts (a corpus PRODUCER: discovers JM mill .hmc files via an index, parses them via hmcProjectParserEngine into FeatureSequenceRecords, persists JSONL+manifest, serves a cached corpus to the replication engine).

Verify:
1. Do the assertions verify REAL behavior (R9 — test fails if business logic changes), not presence-only stubs? The build/persist/load/stats/calculate paths.
2. Is the producer→consumer SEAM test meaningful — does it actually prove a record this engine builds is retrievable+replicable by the REAL millProgramReplicationEngine.replicateFromPrint (not a mock)? (describe "→ MillProgramReplicationEngine seam")
3. Is the axis-gate test correct (a 5-axis corpus record rejected for a 3-axis target)?
4. Is the real-data E2E legitimately skip-LOUD (console.warn at collection) vs silently skipped, and does it make a real assertion when it runs?
5. Are injected readers (indexReader/fileReader/parser) legitimate dependency injection rather than mocking the SUT itself? (The SUT is the corpus engine; the parser/fs are its dependencies.)
6. Coverage gaps: any important branch of MillProgramCorpusEngine left untested (requireOperations, confidence gate, maxFiles cap, fail-soft per-file, cache invalidation, unknown-action throw)?
7. Any test that could pass vacuously (early return, conditional-only assertions)?

Do NOT edit. Report PASS/FAIL + findings.

### Assistant | 2026-06-03T05:34:44.275Z

I'll review this test file for coverage quality and legitimacy against the criteria you've outlined.

### Assistant | 2026-06-03T05:34:44.319Z

[tool_use: Read]

### Assistant | 2026-06-03T05:34:44.363Z

[tool_use: Read]

### User | 2026-06-03T05:34:52.125Z

[tool_result] 1	/**
2	 * MillProgramCorpusEngine tests.
3	 *
4	 * Verifies the PRODUCER for print-to-program replication:
5	 *  - injected-reader unit tests (discovery, fail-soft, requireOperations gate,
6	 *    confidence gate, stats, persist/load round-trip, calculate routing),
7	 *  - a REAL-`.hmc` end-to-end (skip-loud when the JM corpus is not on this host —
8	 *    the "ship a real-data E2E for injected-r
... [+16370 chars truncated]

### User | 2026-06-03T05:34:55.138Z

[tool_result] 1	/**
2	 * MillProgramCorpusEngine — the REAL fuel for print-to-program replication.
3	 *
4	 * {@link MillProgramReplicationEngine} ("generate a CNC program just by reading a
5	 * print") retrieves the most-similar existing program from a
6	 * `corpus: FeatureSequenceRecord[]` and adapts it. But nothing ever materialized
7	 * that corpus from the real shop history — so the capability was DARK for 
... [+23727 chars truncated]

### Assistant | 2026-06-03T05:35:27.239Z

Now I'll review the test file systematically against the criteria.

---

## TEST REVIEW: MillProgramCorpusEngine.test.ts

**VERDICT: PASS (with one MEDIUM observation)**

---

### 1. **Do assertions verify REAL behavior (R9), not presence-only stubs?**

✅ **PASS.** Each test assertion verifies concrete, business-critical behavior:
- Lines 100–112: Verify `buildCorpus` produces correct record counts, stat aggregations, and failure tallying when fed injected index/reader/parser. `expect(r.records.length).toBe(1)` paired with `expect(r.stats.filesFailed).toBe(1)` — real behavior (fail-soft enforcement).
- Lines 123–128: Confidence gate actually filters records; `expect(r.stats.filesSkippedLowConfidence).toBe(1)`.
- Lines 143–148: `maxFiles` cap genuinely limits parsing; `expect(r.records.length).toBe(1)` when `maxFiles: 1` despite 3 discovered.
- Lines 178–192: Persist→load round-trip validates JSONL serialization + cache invalidation. Manifest schema version, counts, and axis distribution asserted.
- Lines 206–224: `calculate()` dispatcher routing works: `corpus_stats` loads + aggregates; `corpus_build` throws on unknown actions.

All assertions fail if business logic changes (confidence gating, fail-soft skip counting, cache invalidation, dispatcher routing).

---

### 2. **Is the producer→consumer SEAM test meaningful? (lines 230–282)**

✅ **PASS — STRONG.** The seam test is legitimate and addresses a CRITICAL real-world issue:
- **Line 243:** Built corpus contains 1 record (real production path).
- **Line 245:** `replicateFromPrint()` called with the built record as fuel (`corpus: built.records`), not a mock.
- **Lines 256–261:** Assertions verify:
  - `result.ok === true` (consumed without error)
  - `provenance.sourceProgramId === "src1"` (proves the engine's provenance tags persist through replication)
  - `candidatesEvaluated === 1` (the record was retrieved and scored)
  - `candidatesRejectedByAxis === 0` (axis gate allowed a 3-axis record for 3-axis target)


... [+6926 chars truncated]
