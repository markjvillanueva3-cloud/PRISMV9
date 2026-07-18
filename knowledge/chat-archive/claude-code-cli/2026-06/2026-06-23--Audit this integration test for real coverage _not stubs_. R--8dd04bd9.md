---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Audit this integration test for real coverage (not stubs). Read it fully: - H:/p"
date: "2026-06-23"
first_ts: "2026-06-23T23:50:52.875Z"
last_ts: "2026-06-23T23:51:46.884Z"
cwd: "H:\\prism\\mcp-server"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a1dc8695b95dabc9f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Audit this integration test for real coverage (not stubs). Read it fully: - H:/p

> **claude-code-cli** | 2026-06-23 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a1dc8695b95dabc9f.jsonl`

## Transcript

### User | 2026-06-23T23:50:52.875Z

Audit this integration test for real coverage (not stubs). Read it fully:
- H:/prism/mcp-server/src/__tests__/reconcileCandidates.integration.test.ts

It proves the end-to-end seam: the .mjs source-adapters (buildPartCandidates from ../../../scripts/lib/reconcile-candidate-adapters.mjs) emit DimCandidate[] that the .ts CrossSourceDimensionReconciliationEngine (../engines/CrossSourceDimensionReconciliationEngine.js) reconciles into consensus dims.

Verify:
1. Assertions are real reference-value checks (concrete values: 12.7mm consensus, confidence > 0.95 noisy-OR lift, status "confirmed"/"presence_only", value_trusted true/false, sources arrayContaining cad/print/cnc) -- NOT toBeDefined/toBeTruthy stubs. (The test-legitimacy gate already rejected an earlier toBeTruthy version.)
2. Each test would FAIL if the seam broke (e.g. if the cnc adapter emitted a metric-trusted value instead of presence_only, test 2 fails; if confidence reverted to a single-source prior, test 1's >0.95 fails).
3. The metric (cad/print) vs presence (cnc) distinction is genuinely exercised.
4. No mocked SUT -- it uses the real engine + real adapters.
5. Coverage gaps: is there an obvious untested seam path worth adding (a conflict case, an empty case)?

It passes 3/3 vitest + is tsc-clean. Report P0/P1/P2 + a single verdict PASS or FAIL. Review only.

### Assistant | 2026-06-23T23:50:56.577Z

I'll audit this integration test for real coverage and seam integrity.

### Assistant | 2026-06-23T23:50:56.901Z

[tool_use: Read]

### User | 2026-06-23T23:50:57.747Z

[tool_result] 1	// reconcileCandidates.integration.test.ts -- U-XRAY-RECONCILE-CANDIDATES (end-to-end seam)
2	// Executable proof that the .mjs source-adapters (reconcile-candidate-adapters) emit DimCandidate[]
3	// the .ts CrossSourceDimensionReconciliationEngine consumes into a sensible consensus -- the R15
4	// round-trip THROUGH the consumer, not just unit-tested in isolation. Covers the metric (cad/print)

... [+3241 chars truncated]

### Assistant | 2026-06-23T23:50:59.614Z

Now let me verify the engine and adapters to confirm the real integration:

### Assistant | 2026-06-23T23:50:59.980Z

[tool_use: Read]

### Assistant | 2026-06-23T23:51:00.291Z

[tool_use: Read]

### User | 2026-06-23T23:51:00.409Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CrossSourceDimensionReconciliationEngine.ts' was already read 11m ago in this session and is unchanged (mtime 1780454818647). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disa
... [+24 chars truncated]

### User | 2026-06-23T23:51:00.715Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\reconcile-candidate-adapters.mjs' was already read 11m ago in this session and is unchanged (mtime 1782257924940). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-23T23:51:02.399Z

Good, they're cached. Let me check the specific confidence lift calculation and source handling in the engine:

### Assistant | 2026-06-23T23:51:03.173Z

[tool_use: Grep]

### User | 2026-06-23T23:51:04.074Z

[tool_result] 22- * The three are mutually independent observations of the same physical feature, so cross-source
23- * AGREEMENT among the DIMENSIONAL sources is strong corroborating evidence of the true value, and
24- * DISAGREEMENT is a real discrepancy worth operator attention — surfaced as a flagged conflict,
25: * NEVER silently averaged away (R12, xray-soul: per-field confidence mandatory, mm canonical, 
... [+7758 chars truncated]

### Assistant | 2026-06-23T23:51:06.029Z

Now let me verify the real noisy-OR formula and check that test assertions would actually fail on a regression:

### Assistant | 2026-06-23T23:51:07.002Z

[tool_use: Grep]

### User | 2026-06-23T23:51:08.037Z

[tool_result] 72-  // `status === "presence_only"` / `value_trusted === false` (both survive slimming); read those,
73-  // not `metric_sources.length`, on a slimmed payload.
74-  metric_sources: DimSource[];
75-  cnc_presence: boolean;            // a CNC toolpath corroborated this feature was machined (survives slimming)
76-  value_trusted: boolean;           // false for a presence_only (CNC-only) dim — valu
... [+1649 chars truncated]

### Assistant | 2026-06-23T23:51:11.749Z

Perfect. Now let me verify test 1's confidence calculation:

Test 1 feeds:
- cad confidence 0.95 (prior for cad)
- print confidence 0.70 (from OCR explicit)
- cnc confidence 0.90 (prior, but presence-only so excluded from value-confidence)

Noisy-OR over **METRIC sources only** (cad + print, NOT cnc):
```
1 - (1 - 0.95) * (1 - 0.70) = 1 - 0.05 * 0.30 = 1 - 0.015 = 0.985
```

The test expects `dim?.confidence > 0.95`, and 0.985 satisfies that. Let me now check the adapter outputs to confirm metric vs presence distinction:

### Assistant | 2026-06-23T23:51:13.038Z

[tool_use: Grep]

### User | 2026-06-23T23:51:13.926Z

[tool_result] 5- * WHY: that engine fuses print+cad+cnc dimension candidates into consensus dims + flagged conflicts,
6- * but it takes candidates IN -- its documented NEXT-ITER is "build 3 thin source-adapters feeding
7- * DimCandidate[] -- (a) print: OCR store, (b) cad: STEP geometry measure, (c) cnc: G-code". This
8- * module completes that trio: `cadGtToCandidates` already lives in cad-dimension-gt-lib (the
... [+2713 chars truncated]

### Assistant | 2026-06-23T23:51:15.441Z

Now let me check the buildPartCandidates itself:

### Assistant | 2026-06-23T23:51:16.294Z

[tool_use: Grep]

### User | 2026-06-23T23:51:17.191Z

[tool_result] 2- * reconcile-candidate-adapters.mjs -- the SOURCE-ADAPTER trio feeding `DimCandidate[]` to
3- * `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`, commit a57ef19c2d).
4- *
5- * WHY: that engine fuses print+cad+cnc dimension candidates into consensus dims + flagged conflicts,
6- * but it takes candidates IN -- its documented NEXT-ITER is "build 3 thin source-adapters
... [+2953 chars truncated]

### Assistant | 2026-06-23T23:51:18.808Z

Now let me check the printOcrToCandidates to verify it sets confidence explicitly:

### Assistant | 2026-06-23T23:51:19.700Z

[tool_use: Grep]

### User | 2026-06-23T23:51:20.592Z

[tool_result] 8- * module completes that trio: `cadGtToCandidates` already lives in cad-dimension-gt-lib (the (b)
9- * adapter); here are the (c) cnc and (a) print adapters + a `buildPartCandidates` merger. Pure -> no
10- * I/O; the engine performs the actual consensus.
11- *
12- * DimCandidate (engine contract): {value_mm:number, type:DimType, source:'print'|'cad'|'cnc',
13: *   confidence?:number, label?:stri
... [+4113 chars truncated]

### Assistant | 2026-06-23T23:51:46.884Z

Perfect. Now I have all the information I need. Let me provide the comprehensive audit report.

---

## Test Coverage Audit: `reconcileCandidates.integration.test.ts`

**Verdict: PASS** (with minor advisory note)

---

### 1. **Assertion Legitimacy — REAL reference values** ✓

**Test 1** (cad+print metric + cnc presence):
- **Concrete assertion**: `expect(dim?.value_mm).toBeCloseTo(12.7, 1)` — verifies the consensus clusters all three 12.7mm sources into a single dimension. **Would FAIL** if clustering broke (e.g. if a tolerance regression let 12.7 + 12.8 form separate clusters).
- **Concrete status**: `expect(dim?.status).toBe("confirmed")` — enforces ≥2 distinct METRIC sources voted. **Would FAIL** if the metric-source counting broke or if cnc was incorrectly treated as a metric source.
- **Concrete confidence lift**: `expect(dim?.confidence).toBeGreaterThan(0.95)` — tests the noisy-OR. The actual calculation: `1 - (1 - 0.95) * (1 - 0.70) = 0.985`, which **exceeds 0.95 by design**. **Would FAIL** if:
  - The noisy-OR formula broke (e.g. reverted to simple max: max(0.95, 0.70) = 0.95 would NOT exceed 0.95)
  - The confidence combine dropped to a single-source prior (max source prior 0.95 would NOT exceed 0.95)
  - CNCs were incorrectly included in the confidence combine
- **Concrete trusted flag**: `expect(dim?.value_trusted).toBe(true)` — metric-backed dimensions are trusted. **Would FAIL** if the metric-detection logic broke.
- **Concrete sources array**: `expect(dim?.sources).toEqual(expect.arrayContaining(["cad", "print", "cnc"]))` — confirms all three sources are recorded. **Would FAIL** if any source was dropped during reconciliation.

**Test 2** (cnc-only):
- **Concrete status**: `expect(dim?.status).toBe("presence_only")` — enforces CNC-only dims are flagged as such (not "confirmed" or "single_source").
- **Concrete trusted flag**: `expect(dim?.value_trusted).toBe(false)` — non-metric dimensions are untrusted. **Would FAIL** if trusted logic broke.

**Test 
... [+6160 chars truncated]
