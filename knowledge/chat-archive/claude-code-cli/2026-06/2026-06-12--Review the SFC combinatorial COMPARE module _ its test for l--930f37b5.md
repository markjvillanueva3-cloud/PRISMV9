---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Review the SFC combinatorial COMPARE module + its test for logic, type soundness"
date: "2026-06-12"
first_ts: "2026-06-12T02:04:48.194Z"
last_ts: "2026-06-12T02:07:04.134Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a0549f926c451a877.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Review the SFC combinatorial COMPARE module + its test for logic, type soundness

> **claude-code-cli** | 2026-06-12 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a0549f926c451a877.jsonl`

## Transcript

### User | 2026-06-12T02:04:48.194Z

Review the SFC combinatorial COMPARE module + its test for logic, type soundness, and test integrity (R9).

Module: H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-compare.ts
Test:   H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-compare.test.ts

Context: this is U-CSFH-07-COMPARE. It folds the DrivenCell[] records from the U-CSFH-06 driver into per-cell verdicts (match / prism_higher / vendor_higher / divergent / uncited / error) + a signed-delta distribution. Each DrivenCell carries a PRISM summary (cutting_speed_mpm, spindle_rpm, feed_rate_mmmin, ...) and ONE cited vendor row (citation: {resolved, vc_mpm|null, fz_mm|null, provenance.detail}). The comparison is 2-way PRISM-vs-cited-vendor (NOT the full tri-vendor matrix). PRISM fz is DERIVED as feed_rate/(rpm*flutes) since vendor catalogs cite fz per-tooth. Already verified live (tsx): all verdict paths + stats + a real-engine E2E (8/8 driven, all uncited) pass; tsc --noEmit clean.

Check rigorously:
- The classify() threshold logic: divergent (>40%) checked first, then match (vc<=25% AND fz<=30%-or-absent), else directional by vc sign. Is the ordering correct? Is the vc-sign tie-break at exactly 0 a problem (an fz-only disagreement with vc delta exactly 0 lands in 'vendor_higher')? Acceptable edge or a real defect?
- signedPct (prism-vendor)/vendor*100: direction correct (+ => PRISM higher)? Div-by-zero guarded (vendor_vc>0 check before the call)?
- prismFz: feed/(rpm*flutes) with the `!(denom>0)` guard returning null -- does this correctly prevent NaN/Infinity from entering the fz distribution? Any path where NaN still reaches statsOf?
- The honesty contract: an uncited cell (resolved:false OR vc_mpm null OR vendor vc<=0) must ABSTAIN -- verdict 'uncited', no delta, NOT counted in comparableCount/vcDeltas. Is there ANY path where a fabricated or absent benchmark produces a delta or counts as a comparison? This is the cardinal correctness property.
- comparableCount / citedCount / feedEl
... [+1072 chars truncated]

### Assistant | 2026-06-12T02:04:54.152Z

I'll read both files thoroughly before analyzing.

### Assistant | 2026-06-12T02:04:54.641Z

[tool_use: Read]

### Assistant | 2026-06-12T02:04:54.649Z

[tool_use: Read]

### User | 2026-06-12T02:04:56.050Z

[tool_result] 1	/**
2	 * SFC combinatorial COMPARE -- diffs each driven cell's PRISM result against its
3	 * CITED vendor row (U-CSFH-03) and classifies the per-cell agreement. Consumes the
4	 * DrivenCell[] the DRIVER (U-CSFH-06) emits; produces the per-cell verdicts +
5	 * delta distribution that BASELINE-PARAMS (U-CSFH-08) derives the per-regime moat
6	 * from. Reuse, not rewrite: the comparison tolerances +
... [+10417 chars truncated]

### User | 2026-06-12T02:04:56.146Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial COMPARE step (U-CSFH-07-COMPARE).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Two layers:
7	 *   1. DI unit tests with hand-built DrivenCell fixtures -- pin each verdict path
8	 *      (match / prism_higher / vendor_higher / divergent / uncited / error), the
9	 *      signed-delta direction, the fz envelope gate, the non-positive-ven
... [+10368 chars truncated]

### Assistant | 2026-06-12T02:04:58.764Z

Now I have both files fully. Let me analyze every dimension requested.

### Assistant | 2026-06-12T02:05:00.042Z

[tool_use: Grep]

### User | 2026-06-12T02:05:01.277Z

[tool_result] src\data\sfc-combinatorial-compare.ts:51: * (GWIZARD_VC_ENVELOPE_PCT / GWIZARD_FZ_ENVELOPE_PCT / DIVERGENT_THRESHOLD_PCT are
src\data\sfc-combinatorial-compare.ts:55:const VC_ENVELOPE_PCT = 25;
src\data\sfc-combinatorial-compare.ts:56:const FZ_ENVELOPE_PCT = 30;
src\data\sfc-combinatorial-compare.ts:57:const DIVERGENT_THRESHOLD_PCT = 40;
src\data\sfc-combinatorial-compare.ts:129:  if (vcAbs > DIVE
... [+1898 chars truncated]

### Assistant | 2026-06-12T02:05:03.898Z

[tool_use: Read]

### User | 2026-06-12T02:05:04.800Z

[tool_result] 340	
341	/** Hard cap on cells per call. ~10K runs in <60s on the orchestrator. */
342	const DEFAULT_MAX_CELLS = 10_000;
343	/** Per-call cap on results[] inline; full results visible through ledger stream. */
344	const DEFAULT_RESULT_CAP = 5_000;
345	const DEFAULT_TOP_K_DIVERGENT = 25;
346	
347	/** G-Wizard matching: tool diameter must be within ±X mm of cell diameter. */
348	const GWIZARD_DIAMET
... [+960 chars truncated]

### Assistant | 2026-06-12T02:05:08.487Z

Good. The canonical values in `SpeedFeedTriVendorBatchComparatorEngine.ts` confirm: VC=25, FZ=30, DIVERGENT=40. Now let me check the `classify` logic and the `signedPct` direction carefully, then verify every arithmetic claim in the tests.

### Assistant | 2026-06-12T02:05:10.033Z

[tool_use: Grep]

### Assistant | 2026-06-12T02:05:11.218Z

[tool_use: Grep]

### User | 2026-06-12T02:05:11.261Z

[tool_result] 5: * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
12: * It returns metric `vc_mpm`/`fz_mm` directly, so there is no unit-conversion risk.
36:export type DataSource = "vendor_catalog" | "unresolved";
51:/** A resolved cited row, or an explicit unresolved (vc/fz null). */
53:  resolved: boolean;
54:  /** null when unresolved -- NEVER a fabricated number. */
55:  vc_m
... [+984 chars truncated]

### User | 2026-06-12T02:05:12.722Z

[tool_result] src\data\benchmark-industry-programs.ts:96:  fz_mm: number,
src\data\benchmark-industry-programs.ts:98:  return kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);
src\data\okuma-osp-program-examples.ts:940:    body: "After the alarm condition is resolved, set VDOUT[99x]=0 to clear the alarm state. If the alarm was triggered in a loop, make sure the clear happens outside the loop or the alarm will immediatel
... [+4394 chars truncated]

### Assistant | 2026-06-12T02:07:04.134Z

Now I have everything I need for a complete analysis. Let me work through each dimension rigorously.

---

## Code Quality Analysis Report

### Summary
- **Overall Quality Score: 9/10**
- **Files Analyzed:** 2 (`sfc-combinatorial-compare.ts`, `combinatorial-compare.test.ts`)
- **Issues Found:** 5 (0 must-fix, 2 follow-up defects, 3 minor observations)
- **Technical Debt Estimate:** 1.5 hours

---

### Detailed Analysis

#### 1. `classify()` threshold ordering — CORRECT

The ordering is correct and intentional:

```
divergent first  (|vc| > 40%)
match second     (|vc| <= 25% AND fz within 30% or absent)
directional last (vcDeltaPct > 0 ? prism_higher : vendor_higher)
```

The divergent-first rule is load-bearing: a cell with |vc|=45% and fz within 30% must be divergent, not match. If match were checked first it would incorrectly absorb it (since fz is within envelope and vc 45% passes no check). The order is correct.

**The vc-sign tie-break at exactly 0 — a real edge but acceptable.**

When `vcDeltaPct === 0` exactly but fz is outside 30% (e.g., PRISM fz is 40% over vendor with vc equal), `classify` falls through to `return vcDeltaPct > 0 ? "prism_higher" : "vendor_higher"` and since `0 > 0` is false, returns `"vendor_higher"`. The reasoning: the only disagreement is fz-up, which is equivalent to a higher feed per tooth. Calling this `vendor_higher` is misleading — vendor is not recommending a higher cutting speed, it is PRISM that is recommending a higher feed rate. The more defensible verdict would be `prism_higher` or a dedicated `fz_only_divergent`. However:

- This edge (vc delta exactly 0 AND fz out of envelope) is vanishingly rare in floating point arithmetic. Exact 0 from `signedPct` requires `prism_vc == vendor_vc` to the bit.
- The consequence is a misclassified direction label, not a honesty violation (the cell IS comparable, IS counted, the raw `fz_delta_pct` value is correct in the output).
- U-CSFH-08 consumes vcDeltas, not verdicts, for baseline deriv
... [+14805 chars truncated]
