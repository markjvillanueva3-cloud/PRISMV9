---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Review the SFC combinatorial harness DRIVER (the run loop that ties a validation"
date: "2026-06-12"
first_ts: "2026-06-12T00:22:04.409Z"
last_ts: "2026-06-12T00:23:41.736Z"
cwd: "H:\\prism-slot-oscar"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a2906124924ecd543.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Review the SFC combinatorial harness DRIVER (the run loop that ties a validation

> **claude-code-cli** | 2026-06-12 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a2906124924ecd543.jsonl`

## Transcript

### User | 2026-06-12T00:22:04.409Z

Review the SFC combinatorial harness DRIVER (the run loop that ties a validation harness together) + its test, for logic, type soundness, integration correctness, and test integrity (R9).

Module: H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-driver.ts
Test:   H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-driver.test.ts

Context: for each SampledCell (from the U-CSFH-04 sampler) the driver maps it to an UltimateSpeedFeedInput, runs the SFC engine (injected calculator -- the real engine is ~2.5s/call so DI + a maxCells cap lets tests use a fast fake while a real-data E2E runs a tiny N), applies the U-CSFH-05 gates (gateCell), attaches a U-CSFH-03 citation, and emits a DrivenCell record. Already verified live (tsx): DI fakes + a real-engine E2E that drove 8/8 cells through the actual ultimateSpeedFeedEngine, all gate-passed; tsc --noEmit clean on all CSFH files (gateCell(result) compiles with no cast -- UltimateSpeedFeedResult is structurally assignable to GateableResult).

Check:
- toInput cell->UltimateSpeedFeedInput mapping: complete + correct? Any field that SHOULD be passed (and the sampler has) that's dropped, or any mismapping (e.g. representative_material->material, hardness_hb, diameter->tool_diameter_mm, strategy union)?
- the gateCell(result) no-cast call: is relying on structural assignability of the full UltimateSpeedFeedResult to the narrow GateableResult sound, or fragile if the engine's result shape drifts?
- error handling: engine throw -> driven:false, summary null, error recorded. Is this fail-loud-and-resilient correct (record + continue, never fabricate)? Any swallow?
- maxCells slicing (slice(0, max(0,maxCells))), the gateTally[gate.overall]++ index access, citedCount logic
- determinism: seed forwards to sampler; is the record order stable?
- the toSummary projection: are the 6 summary fields the right ones (the values the compare/baseline-derivation consume)?
- test R9: DI fakes pin driven/throw/unstable-gate/citati
... [+292 chars truncated]

### Assistant | 2026-06-12T00:22:06.849Z

I'll read both files in parallel to perform a thorough analysis.

### Assistant | 2026-06-12T00:22:07.379Z

[tool_use: Read]

### Assistant | 2026-06-12T00:22:07.866Z

[tool_use: Read]

### User | 2026-06-12T00:22:10.932Z

[tool_result] 1	/**
2	 * SFC combinatorial harness DRIVER -- the run loop that ties the harness together.
3	 * For each sampled cell (U-CSFH-04) it: maps the cell to an UltimateSpeedFeedInput,
4	 * runs the SFC engine, applies the per-cell GATES (U-CSFH-05), attaches a cited
5	 * vendor row (U-CSFH-03), and emits one DrivenCell record. The output is the
6	 * dataset U-CSFH-07/08 compare + derive baseline params
... [+7449 chars truncated]

### User | 2026-06-12T00:22:10.969Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial harness DRIVER (U-CSFH-06-DRIVER).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Two layers (pure-core + injected-readers rule):
7	 *   1. DI unit tests with a fast FAKE calculator + fake vendor provider -- pin the
8	 *      driven/error/gate-tally/citation paths + the cell->input mapping + the
9	 *      NEVER-FABRICATE contract (engin
... [+8220 chars truncated]

### Assistant | 2026-06-12T00:22:14.018Z

Now let me pull in the supporting types from the referenced modules to check structural assignability and field contracts.

### Assistant | 2026-06-12T00:22:14.658Z

[tool_use: Glob]

### Assistant | 2026-06-12T00:22:15.612Z

[tool_use: Glob]

### User | 2026-06-12T00:22:15.925Z

[tool_result] mcp-server\src\data\sfc-combinatorial-gates.ts

### Assistant | 2026-06-12T00:22:16.017Z

[tool_use: Glob]

### User | 2026-06-12T00:22:16.917Z

[tool_result] mcp-server\src\data\sfc-combinatorial-sampler.ts

### User | 2026-06-12T00:22:18.418Z

[tool_result] mcp-server\src\engines\UltimateSpeedFeedEngine.ts

### Assistant | 2026-06-12T00:22:20.558Z

Now I'll read all three supporting files in parallel.

### Assistant | 2026-06-12T00:22:21.059Z

[tool_use: Read]

### Assistant | 2026-06-12T00:22:21.550Z

[tool_use: Read]

### Assistant | 2026-06-12T00:22:21.615Z

[tool_use: Read]

### User | 2026-06-12T00:22:22.498Z

[tool_result] 1	/**
2	 * SFC combinatorial per-cell GATES -- the honesty core of the validation harness.
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-05-GATES (slot:oscar, 2026-06-10).
5	 *
6	 * Three deterministic gates applied to each cell's UltimateSpeedFeedResult before
7	 * it is allowed to feed baseline-parameter derivation (U-CSFH-08):
8	 *   1. UNITS   -- the core OptimizedValues carry their canonical unit st
... [+8817 chars truncated]

### User | 2026-06-12T00:22:25.009Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-942 of 3325 total (74958 tokens, cap 25000). Call Read with offset=943 limit=942 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
3	 *
4	 * The most compre
... [+48841 chars truncated]

### User | 2026-06-12T00:22:25.024Z

[tool_result] 1	/**
2	 * SFC combinatorial DOE SAMPLER -- generates the sampled cell space the harness
3	 * driver runs through the SFC engine. Full-enumerates the discrete validity cells
4	 * (U-CSFH-02) and stratified-samples the continuous axes (diameter / flutes /
5	 * power / hardness / coolant) x the ISO-group axis, with a per-regime coverage
6	 * floor so even sparse operations (tapping has 2 valid cells
... [+7082 chars truncated]

### Assistant | 2026-06-12T00:22:28.761Z

I have enough context from the type definitions. Let me now check the datasource for `CitedDataRow` and `resolved` field shape, then check the `UltimateSpeedFeedResult.stability` type more precisely.

### Assistant | 2026-06-12T00:22:29.137Z

[tool_use: Glob]

### User | 2026-06-12T00:22:31.909Z

[tool_result] mcp-server\src\data\sfc-combinatorial-datasource.ts

### Assistant | 2026-06-12T00:22:34.592Z

[tool_use: Read]

### User | 2026-06-12T00:22:38.825Z

[tool_result] 1	/**
2	 * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
3	 * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
4	 * fabricates a value: every number it emits came from a provider and carries its
5	 * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
6	 * default. (Pairs with the U-CSFH-05 gates' silent-default det
... [+5431 chars truncated]

### Assistant | 2026-06-12T00:23:41.736Z

I have all the material I need. Now I have a complete picture of all the types. Let me perform the full analysis.

---

## Code Quality Analysis Report

### Summary
- **Overall Quality Score: 9/10**
- **Files Analyzed:** 2 (driver + test), with 3 supporting type files read for cross-verification
- **Issues Found:** 1 must-fix, 3 follow-up observations, 0 critical bugs
- **Technical Debt Estimate:** 1-2 hours

---

### Critical Issues

None. No fabricated values, no swallowed errors, no inlined physics constants, no structural breaks found.

---

### Must-Fix (P1)

**1. `gateTally[gate.overall]++` is unsafe against future `GateStatus` values**

- **File:** `H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-driver.ts:155`
- **Severity:** Medium-High (silent runtime no-op, not a throw)
- **Detail:** `gateTally` is initialized as `{ pass: 0, honest_limited: 0, fail: 0 }`. The index expression `gateTally[gate.overall]` is typed `number` only because all three current `GateStatus` literals are keys. If `GateStatus` ever gains a fourth literal (say `"not_applicable"`) the `++` on `undefined` silently produces `NaN`, the tally becomes corrupt, and no gate block fires. TypeScript catches this if `gateTally` is typed strictly:

  ```typescript
  // current (silently fragile)
  const gateTally = { pass: 0, honest_limited: 0, fail: 0 };
  gateTally[gate.overall]++;        // TS infers the index as the union literal, OK today

  // safer — make the exhaustiveness a compile-time guarantee
  const gateTally: Record<GateStatus, number> = { pass: 0, honest_limited: 0, fail: 0 };
  ```

  Adding the explicit `Record<GateStatus, number>` annotation makes tsc error the moment `GateStatus` is extended without also updating the initializer, turning a silent runtime `NaN` into a compile-time failure. This is especially relevant here because `GateStatus` lives in the gates module and could be extended independently. The test suite does not cover a `gateTally` corruption path becaus
... [+7882 chars truncated]
