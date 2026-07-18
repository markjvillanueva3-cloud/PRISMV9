---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Audit a test change: H:\\prism\\mcp-server\\src\\__tests__\\cad-validation-corpus.tes"
date: "2026-06-24"
first_ts: "2026-06-24T02:07:01.170Z"
last_ts: "2026-06-24T02:07:52.800Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a2d93ba304a645801.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Audit a test change: H:\prism\mcp-server\src\__tests__\cad-validation-corpus.tes

> **claude-code-cli** | 2026-06-24 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a2d93ba304a645801.jsonl`

## Transcript

### User | 2026-06-24T02:07:01.170Z

Audit a test change: H:\prism\mcp-server\src\__tests__\cad-validation-corpus.test.ts

Context: a sibling fix converted the corpus's callouts from a type-invalid `{kind, value:string}` shape to the real `ToleranceCallout` `{tolerance_mm:number}` shape, folding surface/material annotations into intent/description (the type models tolerances only). This dropped MILL-003's callouts (its only annotation was a surface finish -> folded into intent), so the count of cases-with-callouts went 8 -> 7. The OLD test asserted `withCallouts.length >= 8`. It was REPLACED with two tests (search for "structured tolerance callouts" and "surface / material / GD&T detail is preserved").

VERIFY and report P0/P1/P2 with line:cite, grade PASS/FAIL:
1. Is the 8 -> 7 threshold change a LEGITIMATE correction (the data genuinely now has 7 tolerance-callout cases because surface/material are no longer callouts) or an illegitimate WEAKENING to make a test pass? Judge honestly -- the rule is "never weaken an assertion to make it pass," but correcting a threshold that encoded a now-fixed broken data model is legitimate IF intent is preserved + coverage is stronger.
2. Are the NEW assertions load-bearing (R9)? (a) the per-callout `typeof tolerance_mm === "number"` + `Number.isFinite` + `> 0` loop -- is this a real regression-lock against re-introducing {kind,value}? (b) the intent/description text-preservation assertion (/Ra\b/ + material regex) -- does it genuinely verify the folded surface/material info wasn't lost?
3. Net coverage: is the replacement STRONGER than the single `>= 8` count it replaced (type-shape lock + no-data-loss check vs a bare count)? Or did it lose meaningful coverage?
4. Any `.skip`/`.only`, any assertion that passes even if the data were wrong, any non-null `!` that could mask a bug?
5. Does each test description match what it asserts?
Read-only. Cite file:line. Grade PASS/FAIL.

### Assistant | 2026-06-24T02:07:06.926Z

I'll audit the test file carefully, reading the full context and verifying the claimed changes.

### Assistant | 2026-06-24T02:07:06.975Z

[tool_use: Read]

### User | 2026-06-24T02:07:11.016Z

[tool_result] 1	/**
2	 * cad-validation-corpus.test.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-50-CORPUS
3	 *
4	 * Tests for the curated JM Die starter corpus.
5	 */
6	
7	import { describe, it, expect } from "vitest";
8	import {
9	  JM_DIE_VALIDATION_CORPUS,
10	  JM_DIE_CORPUS_VERSION,
11	  JM_DIE_CORPUS_SCHEMA_VERSION,
12	  summarizeCorpus,
13	  corpusByDomain,
14	} from "../data/cad-validation-corpus.js";
15	
16	desc
... [+6019 chars truncated]

### Assistant | 2026-06-24T02:07:12.790Z

Now let me search for context on what was changed in the related data file to understand the full story:

### Assistant | 2026-06-24T02:07:13.625Z

[tool_use: Grep]

### User | 2026-06-24T02:07:15.292Z

[tool_result] src\data\cad-validation-corpus.ts:33:      // ToleranceCallout models tolerances only (tolerance_mm); surface/material annotations stay in
src\data\cad-validation-corpus.ts:35:      callouts: [
src\data\cad-validation-corpus.ts:51:    id: "MILL-003",
src\data\cad-validation-corpus.ts:63:      callouts: [
src\data\cad-validation-corpus.ts:79:      callouts: [
src\data\cad-validation-corpus.ts:98:  
... [+4774 chars truncated]

### Assistant | 2026-06-24T02:07:17.036Z

Now let me check the actual corpus data file to see the exact change:

### Assistant | 2026-06-24T02:07:17.625Z

[tool_use: Read]

### User | 2026-06-24T02:07:23.458Z

[tool_result] 1	/**
2	 * cad-validation-corpus.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-50-CORPUS
3	 *
4	 * Curated starter corpus of 12 JM-Die-derived validation cases spanning
5	 * mill / lathe / wire-EDM. Each case is a {@link ValidationTestCase} that
6	 * the CADDrawAnyPartValidationHarnessEngine can run end-to-end against
7	 * the orchestrator.
8	 *
9	 * Scope (v1, this unit):
10	 *   - 12 hand-crafted cases (4 
... [+7574 chars truncated]

### Assistant | 2026-06-24T02:07:25.822Z

Perfect. Now I have the full context. Let me verify the test audit by analyzing the key claims:

### Assistant | 2026-06-24T02:07:26.722Z

[tool_use: Grep]

### User | 2026-06-24T02:07:28.850Z

[tool_result] 128:  it("structured tolerance callouts conform to ToleranceCallout (tolerance_mm), on the cases that carry a tolerance", () => {
129:    // ToleranceCallout models TOLERANCES only ({tolerance_mm, gdt_symbol, feature}); surface/material
132:    const withCallouts = JM_DIE_VALIDATION_CORPUS.filter(
135:    expect(withCallouts.length).toBeGreaterThanOrEqual(7);
138:    for (const c of withCallouts) 
... [+422 chars truncated]

### Assistant | 2026-06-24T02:07:52.800Z

Excellent. Now I have all the information I need. Let me provide the audit report:

## Test Audit Report: `cad-validation-corpus.test.ts`

**File:** `H:\prism\mcp-server\src\__tests__\cad-validation-corpus.test.ts`

---

### 1. **Is the 8 → 7 threshold change LEGITIMATE?**

**PASS — LEGITIMATE CORRECTION**

**Evidence:**
- The corpus data file (lines 51-57 in `cad-validation-corpus.ts`) shows **MILL-003 now has NO callouts array** — only `intent: "mill a 0.187 wide by 0.625 long thru slot with sharp corners, 63 Ra interior"` with the surface finish `63 Ra` folded into intent text.
- **Before the fix**: MILL-003 had a structurally invalid `{kind, value:string}` callout (type-invalid per schema).
- **After the fix**: MILL-003 has NO callouts (surface/material annotations ARE preserved in intent/description, not modeled as callouts).
- This is **not a test weakening to hide a bug** — it's correcting the test threshold to match the actual *corrected data model*, where `ToleranceCallout` now **accurately models tolerances only** (tolerance_mm: number), not surface finishes or material specs.

**Data audit confirms 7 cases with real tolerances:**
- MILL-001: 2 callouts (width + length tolerance bands)
- MILL-004: 1 callout (surface tolerance)
- LATHE-001: 1 callout (OD tolerance)
- LATHE-003: 1 callout (OD tolerance)
- WEDM-001: 1 callout (feature tolerance)
- WEDM-002: 1 callout (edge tolerance)
- WEDM-004: 1 callout (contour tolerance)
- **MILL-003: 0 callouts** (63 Ra surface finish stays in intent only)

Count: 7 cases with callouts = **legitimate data state, not a test compromise.**

---

### 2. **Are the NEW assertions LOAD-BEARING (R9)?**

**GRADE: PASS** — Both new assertions are load-bearing regression locks.

**(a) Type-shape lock (lines 140-142):**
```typescript
expect(typeof co.tolerance_mm).toBe("number");
expect(Number.isFinite(co.tolerance_mm as number)).toBe(true);
expect(co.tolerance_mm as number).toBeGreaterThan(0);
```
- **Load-bearing: YES**
  - This *
... [+5044 chars truncated]
