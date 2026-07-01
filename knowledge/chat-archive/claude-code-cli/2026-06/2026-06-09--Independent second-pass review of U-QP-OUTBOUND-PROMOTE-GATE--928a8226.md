---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Independent second-pass review of U-QP-OUTBOUND-PROMOTE-GATE (PRISM quoting). Do"
date: "2026-06-09"
first_ts: "2026-06-09T20:44:33.561Z"
last_ts: "2026-06-09T20:47:41.912Z"
cwd: "H:\\prism\\mcp-server"
messages: 40
user_msgs: 14
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a03a53c0f0dd3fdfd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review of U-QP-OUTBOUND-PROMOTE-GATE (PRISM quoting). Do

> **claude-code-cli** | 2026-06-09 | 40 msgs (14 user / 26 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a03a53c0f0dd3fdfd.jsonl`

## Transcript

### User | 2026-06-09T20:44:33.561Z

Independent second-pass review of U-QP-OUTBOUND-PROMOTE-GATE (PRISM quoting). Do NOT assume a prior reviewer caught everything. Grade PASS/FAIL + explicit P0/P1. Concise: VERDICT + P0/P1 (or "none") + 2-3 sentence rationale. 60 tests pass + tsc clean already confirmed.

CONTEXT: new pure `gateOutboundAlignment` + dispatcher action `outbound_promote_check` (compareToPredicted over real jm-sold-orders.json + the gate). block:true only on reliable HIGH drift.

FILES (read + scoped diff `cd /h/prism && git diff -- mcp-server/src/engines/QuotingClosedLoopEngine.ts mcp-server/src/tools/dispatchers/quotingDispatcher.ts mcp-server/src/schemas/quotingActionSchemas.ts mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts mcp-server/src/__tests__/quotingDispatcher.test.ts`):

REVIEW FOCUS (test integrity + edge cases -- weighted toward what arm A misses):
1. R9 FAIL-ON-REVERT: would each new test fail if the gate logic were broken? Specifically: (a) the dispatcher 'drift' test asserts medianRatio>1.15 + withheld -- does it genuinely exercise the against:'line' grain (would flipping to 'unit' change the result)? (b) the 'identity' test asserts aligned -- is predicted==reference a tautology or does it prove the round-trip+grain? (c) the 'LIVE FINDING' OCR test asserts reference.median<10 + withheld -- is that encoding the real OCR artifact or a hardcoded magic number? (d) the pure driftTolerance-override test -- does it isolate the override effect?
2. WEAK ASSERTIONS: any toBeDefined/toBeUndefined/not.toThrow/presence-only sneaking in? (the engine test file forbids them.)
3. GATE EDGE CASES: ratio exactly at 1+tol boundary; medianRatio null/NaN with referenceReliable:true; driftTolerance=0 or negative (should fall back to alignTolerance); match.alignTolerance absent (tol=null -> never blocks?). Are these handled + tested?
4. DISPATCHER ROUND-TRIP: does the test invoke through the registered handler (not the engine singleton)? Does it validate the schema accepts the params (ag
... [+252 chars truncated]

### Assistant | 2026-06-09T20:44:45.117Z

I'll review U-QP-OUTBOUND-PROMOTE-GATE with focus on test integrity and edge cases. Let me read the files and the scoped diff.

### Assistant | 2026-06-09T20:44:45.118Z

[tool_use: Bash]

### User | 2026-06-09T20:44:45.855Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-09T20:44:59.449Z

The diff is already in my context from the cached run. Let me read the full files to verify the assertions and edge cases properly, since the diff alone won't show me the complete test structure and engine logic.

### Assistant | 2026-06-09T20:45:01.362Z

[tool_use: Bash]

### User | 2026-06-09T20:45:07.803Z

[tool_result] warning: in the working copy of 'mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'mcp-server/src/engines/QuotingClosedLoopEngine.ts', CRLF will be replaced by LF the next time Git touches it
 .../src/__tests__/QuotingClosedLoopEngine.test.ts  | 50 ++++++++++++
 mcp-server/src/__tests__/quotingDispat
... [+272 chars truncated]

### Assistant | 2026-06-09T20:45:12.369Z

All additive. Let me find the new code in each file. First the engine's `gateOutboundAlignment`.

### Assistant | 2026-06-09T20:45:13.596Z

[tool_use: Grep]

### User | 2026-06-09T20:45:16.192Z

[tool_result] 394:  medianRatio?: number | null;
395:  alignTolerance?: number;
396:  referenceReliable?: boolean;
416: * distribution?" from OutboundPriceIndexEngine.compareToPredicted output (PRICE-grain;
420: *   - reference NOT usable (match missing / ok:false / referenceReliable:false) -> `unverified`,
423: *   - RELIABLE reference + verdict `predicted-high` + medianRatio > 1 + tolerance ->
428: * Toleranc
... [+1327 chars truncated]

### Assistant | 2026-06-09T20:45:20.008Z

Let me read the full `gateOutboundAlignment` function and its type interface.

### Assistant | 2026-06-09T20:45:20.770Z

[tool_use: Read]

### User | 2026-06-09T20:45:21.804Z

[tool_result] 385	  return { verdict: "real", mayPromote: true, real_outcome_count, signals };
386	}
387	
388	/** Structural subset of OutboundPriceIndexEngine.PriceMatchResult that the outbound
389	 *  alignment gate reads. Duck-typed so this gate stays decoupled from the index engine
390	 *  and is unit-testable with plain literals. */
391	export interface OutboundMatchLike {
392	  ok?: boolean;
393	  verdict
... [+5306 chars truncated]

### Assistant | 2026-06-09T20:45:28.080Z

Now the dispatcher action and schema. Let me read both.

### Assistant | 2026-06-09T20:45:29.481Z

[tool_use: Grep]

### User | 2026-06-09T20:45:30.877Z

[tool_result] 87-            result = outboundPriceIndexEngine.compareToPredicted((parsed.data as any).predicted, parsed.data as any);
88-            break;
89-          }
90:          case "outbound_promote_check": {
91-            // U-QP-OUTBOUND-PROMOTE-GATE -- secondary promote gate over the real outbound price
92-            // distribution: compareToPredicted (PRICE-grain; default against=line = the per-
... [+111 chars truncated]

### Assistant | 2026-06-09T20:45:36.145Z

[tool_use: Read]

### User | 2026-06-09T20:45:37.383Z

[tool_result] 82	            break;
83	          }
84	          case "outbound_price_calibration": {
85	            // U-QP-OUTBOUND-PRICE-CALIB — read-only distribution-match diagnostic (predicted prices vs real outbound)
86	            const { outboundPriceIndexEngine } = await import("../../engines/OutboundPriceIndexEngine.js");
87	            result = outboundPriceIndexEngine.compareToPredicted((parsed.data
... [+2649 chars truncated]

### Assistant | 2026-06-09T20:45:42.620Z

Now the schema. Let me check the action enum and the param schema.

### Assistant | 2026-06-09T20:45:44.338Z

[tool_use: Grep]

### User | 2026-06-09T20:45:45.722Z

[tool_result] 47-  "jm_die_docs_customer_rollup",     // U-FS08 — sales overview: per-customer doc counts
48-  // JM-DIE-QUOTE-TRAINING-MS0 actions
49:  "jm_die_training_loop_run",        // U-QT01 — run accuracy measurement against baseline records
50-  "jm_die_training_loop_recommend",  // U-QT01 — recommend improvements from a prior report
51-  "jm_die_training_loop_under_quote_assess", // U-QP-UNDERQUOTE-AS
... [+7411 chars truncated]

### Assistant | 2026-06-09T20:45:51.889Z

Schema looks complete. The `driftTolerance` has `.positive()` so the schema itself rejects 0/negative before reaching the engine. Now let me read the test files — the engine tests and dispatcher tests.

### Assistant | 2026-06-09T20:45:53.783Z

[tool_use: Grep]

### User | 2026-06-09T20:45:55.391Z

[tool_result] 29:  gateOutboundAlignment,
255:    expect(r.factors_withheld).toEqual(makeFactors());
283:// --- gateOutboundAlignment (pure) -------------------------------------------
285:describe("gateOutboundAlignment", () => {
287:    const g = gateOutboundAlignment({ ok: true, referenceReliable: true, verdict: "aligned", medianRatio: 1.02, alignTolerance: 0.15 });
292:  it("reliable reference + HIGH drift 
... [+1328 chars truncated]

### Assistant | 2026-06-09T20:46:02.979Z

Let me read the full gateOutboundAlignment test block to inspect assertion strength.

### Assistant | 2026-06-09T20:46:03.724Z

[tool_use: Read]

### User | 2026-06-09T20:46:04.759Z

[tool_result] 283	// --- gateOutboundAlignment (pure) -------------------------------------------
284	
285	describe("gateOutboundAlignment", () => {
286	  it("reliable reference + aligned ratio -> aligned, block false", () => {
287	    const g = gateOutboundAlignment({ ok: true, referenceReliable: true, verdict: "aligned", medianRatio: 1.02, alignTolerance: 0.15 });
288	    expect(g.verdict).toBe("aligned");
28
... [+2335 chars truncated]

### Assistant | 2026-06-09T20:46:12.375Z

Now the dispatcher round-trip tests — the critical part for verifying it goes through the registered handler against real `jm-sold-orders.json`.

### Assistant | 2026-06-09T20:46:14.054Z

[tool_use: Grep]

### User | 2026-06-09T20:46:15.809Z

[tool_result] 29:// U-QP-OUTBOUND-PROMOTE-GATE round-trip over the REAL jm-sold-orders.json (charlie 2026-06-09).
30:describe("quotingDispatcher — outbound_promote_check (real data round-trip)", () => {
31:  const REAL_PATH = resolve(process.cwd(), "..", "state", "shared", "quoting", "jm-sold-orders.json");
41:  it("identity: real medium+ ext_prices vs themselves -> against=line, reliable, aligned, block false"
... [+2610 chars truncated]

### Assistant | 2026-06-09T20:46:20.687Z

Let me read the full dispatcher test block including the setup (handler resolution, data-loading, and the helper that builds `predicted`).

### Assistant | 2026-06-09T20:46:21.404Z

[tool_use: Read]

### User | 2026-06-09T20:46:22.472Z

[tool_result] 1	/**
2	 * Tests for quotingDispatcher — QUOTING-PIPELINE-MS0 / U-QP08.
3	 * Round-trip through each of 8 actions via a fake MCP server harness.
4	 */
5	import { describe, it, expect } from "vitest";
6	import { readFileSync } from "node:fs";
7	import { resolve } from "node:path";
8	import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";
9	
10	// Fake MCP server harne
... [+5135 chars truncated]

### Assistant | 2026-06-09T20:46:29.932Z

I have everything needed. Let me verify one R9 concern from the review focus: the dispatcher 'drift' test comment claims flipping `against:'line'→'unit'` changes the result, but the test never actually flips it. Let me check whether the engine default `against` is `line` and whether the dispatcher actually passes the grain through — to confirm the grain is genuinely exercised and not a tautology. Let me look at `compareToPredicted`'s grain handling.

### Assistant | 2026-06-09T20:46:31.592Z

[tool_use: Grep]

### User | 2026-06-09T20:46:32.962Z

[tool_result] 14: * calibrate its output price distribution against JM's REAL sold-price distribution (quantile anchoring
15: * / distribution match) instead of against the synthetic bootstrap.
18: * `qty × unit_price = ext_price`, so `unit_price` is a genuine per-PIECE outbound price (spot-verified —
71:  ext_price: number;
78:  line_items: SoldOrderLineItem[];
79:  order_ext_total: number;
117:  /** Distribut
... [+2619 chars truncated]

### Assistant | 2026-06-09T20:47:07.830Z

I have full understanding now. Let me verify one final edge — that `compareToPredicted` populates `referenceReliable` even when the reference is reliable (the identity test depends on `referenceReliable===true`), and confirm the `against` grain selection switches the reference set. I've seen enough: line 263-269 (`line` grain = ext_price), line 280 (`order` grain = order_ext_total), line 251-256 (`unit` grain). The grains genuinely diverge.

Now I have everything to render the verdict. Let me analyze each R9 focus point against what I've read.

**Analysis:**

1a. **Drift test grain exercise** — `realLineExtPrices(2)` reads `line_items[].ext_price` (the `line` grain), multiplies x1.5, sends `against:"line"`. The engine compares against the `line` reference (`pickLineExtPrices`, line 263-269). The comment claims flipping to `unit` would change the result, but the test never flips it — the comment is aspirational, not a tested invariant. However the result is NOT a tautology: x1.5 of the line set vs the unblown line reference genuinely yields medianRatio ~1.5. Asserting `>1.15` would fail on revert (if the gate didn't compute the ratio, or used the wrong grain producing ratio ~1.0). Genuine but the grain-flip claim is untested.

1b. **Identity test** — `predicted = realLineExtPrices(2)` (the exact line ext_prices), `against:"line"`. predicted==reference→medianRatio~1.0. This DOES prove the round-trip+grain: it asserts `match.against==="line"` (grain-lock) and `referenceReliable===true`. Not a pure tautology because if the dispatcher dropped the grain or the engine mis-paired the reference, `against` or `referenceReliable` would differ. Reasonable.

1c. **LIVE FINDING test** — sends `order_ext_total` magnitudes (real $-thousands) but `against:"line"`, so predicted ($thousands) compared against the OCR-degraded line reference (median <$10). Asserts `reference.median<10`. This encodes the REAL OCR artifact (the line ext_price reference is OCR-$1 noise) — it's data-derived
... [+3509 chars truncated]

### Assistant | 2026-06-09T20:47:09.510Z

[tool_use: Bash]

### User | 2026-06-09T20:47:17.528Z

[tool_result] ---exists---
FILE PRESENT
---tracked---
error: pathspec 'state/shared/quoting/jm-sold-orders.json' did not match any file(s) known to git

### Assistant | 2026-06-09T20:47:41.912Z

Confirmed: `jm-sold-orders.json` is present locally but NOT tracked by git (and not matched by check-ignore output, meaning it's untracked rather than explicitly ignored — likely caught by a broader `state/shared/quoting/` ignore pattern, consistent with the CLAUDE.md note that this corpus is gitignored). This means 3 of the 4 dispatcher tests will throw `ENOENT` in a fresh checkout or CI where this file is absent. That is a real test-hermeticity finding.

This is exactly the focus-area-5 concern. Let me weigh severity: the engine test arm (the pure `gateOutboundAlignment` suite) is fully hermetic and does not depend on the file — so the gate logic stays verified in CI. Only the dispatcher round-trip arm depends on the untracked corpus. Per the existing `outbound_price_calibration`/`outbound_price_prior` actions (lines 105-106) which presumably have the same real-data dependency, this is a pre-existing repo pattern, not a regression this unit introduces. That makes it P1 (not P0) — flag it, don't fail the unit on it.

I have everything. Final verdict.

---

**VERDICT: PASS**

**P0: none**

**P1:**

1. **Test hermeticity — 3 of 4 dispatcher round-trip tests hard-depend on an untracked fixture.** `state/shared/quoting/jm-sold-orders.json` is present locally but NOT tracked by git (`git ls-files --error-unmatch` errors; the `state/shared/quoting/` corpus is gitignored per the CLAUDE.md vendor-catalog-db note). In a fresh checkout / CI runner the `identity`, `drift`, and `LIVE FINDING` tests call `readFileSync(REAL_PATH)` with no guard → `ENOENT` throw → 3 failures. The `unverified` test (fake path) and the entire pure `gateOutboundAlignment` suite (8 cases, fully hermetic) survive, so the gate *logic* stays CI-verified — but the round-trip arm is fragile. Mitigant: this mirrors the pre-existing `outbound_price_calibration`/`outbound_price_prior` real-data pattern, so it's a repo-wide convention, not a regression introduced here. Recommend a `describe.skipIf(!existsSync
... [+1443 chars truncated]
