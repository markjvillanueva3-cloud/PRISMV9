---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Review a single-unit change (U-QP-OUTBOUND-PROMOTE-GATE) in PRISM's quoting clos"
date: "2026-06-09"
first_ts: "2026-06-09T20:44:26.785Z"
last_ts: "2026-06-09T20:45:42.356Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-aff5d6117253fa7d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review a single-unit change (U-QP-OUTBOUND-PROMOTE-GATE) in PRISM's quoting clos

> **claude-code-cli** | 2026-06-09 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-aff5d6117253fa7d9.jsonl`

## Transcript

### User | 2026-06-09T20:44:26.785Z

Review a single-unit change (U-QP-OUTBOUND-PROMOTE-GATE) in PRISM's quoting closed-loop. Grade PASS/FAIL with explicit P0/P1. Concise: VERDICT + P0/P1 (or "none") + 2-3 sentence rationale. 60 tests pass + tsc clean already confirmed -- focus on correctness/grain/safety, not restating that.

CONTEXT: charlie added a SECONDARY promote gate so the OODA loop can additionally check that the cycle's predicted PRICE distribution aligns with JM's REAL outbound sold-price distribution (OutboundPriceIndexEngine.compareToPredicted, PRICE-grain). The loop is PRICE-grain end-to-end (predicted_quote_usd=FMV sell price vs actual_invoice_usd=realized revenue), so a cost-grain source (ActualCostEngine) was REJECTED as a grain violation. This unit ships the verifiable CORE (pure gate fn + dispatcher action + real test); the runCycle deps-wire is a deliberate follow-up (R13 logical order).

FILES (read all + the scoped diff `cd /h/prism && git diff -- mcp-server/src/engines/QuotingClosedLoopEngine.ts mcp-server/src/tools/dispatchers/quotingDispatcher.ts mcp-server/src/schemas/quotingActionSchemas.ts mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts mcp-server/src/__tests__/quotingDispatcher.test.ts`):
- engine: new `gateOutboundAlignment(match,{driftTolerance?})` -> {verdict: aligned|withheld-outbound-drift|unverified, block, signals} + OutboundMatchLike/OutboundAlignmentGate interfaces
- schema: new `outbound_promote_check` enum + z.object
- dispatcher: new case composing compareToPredicted({against: against??'line'}) + gateOutboundAlignment
- tests: 7 pure gate + 4 dispatcher round-trips over REAL state/shared/quoting/jm-sold-orders.json

REVIEW FOCUS:
1. GRAIN: is `against:'line'` (per-part-job ext_price) the correct default for FMV/predicted_quote_usd grain? Does the gate/dispatcher ever silently compare mismatched grains?
2. FAIL-CLOSED correctness: block:true ONLY on a reliable HIGH drift (ratio>1+tol); unverified (unreliable ref) + aligned + predicted-low all block:false
... [+769 chars truncated]

### Assistant | 2026-06-09T20:44:33.243Z

I'll review this unit by reading the scoped diff and the relevant files.

### Assistant | 2026-06-09T20:44:35.566Z

[tool_use: Bash]

### User | 2026-06-09T20:44:40.458Z

[tool_result] warning: in the working copy of 'mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'mcp-server/src/engines/QuotingClosedLoopEngine.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts b/mcp-server/src/__tests__/QuotingClose
... [+18820 chars truncated]

### Assistant | 2026-06-09T20:44:47.174Z

Let me read the engine context and the OutboundPriceIndexEngine.compareToPredicted contract to verify grain handling and reliability semantics.

### Assistant | 2026-06-09T20:44:47.490Z

[tool_use: Bash]

### User | 2026-06-09T20:44:51.534Z

[tool_result] 14: * calibrate its output price distribution against JM's REAL sold-price distribution (quantile anchoring
15: * / distribution match) instead of against the synthetic bootstrap.
126:  /** Which real-outbound GRAIN the predicted set was compared against (must match the grain of `predicted`). */
127:  against: "unit" | "line" | "order";
129:  alignTolerance: number;
135:  medianRatio: number | nul
... [+3226 chars truncated]

### Assistant | 2026-06-09T20:44:58.267Z

The contract aligns with the gate's assumptions. Let me verify the key reliability-degenerate detail and check whether `referenceReliable` actually catches the OCR-$1 spike, plus confirm grain default and the `degenerate-reference` IQR-collapse logic.

### Assistant | 2026-06-09T20:44:58.905Z

[tool_use: Bash]

### User | 2026-06-09T20:45:05.315Z

[tool_result]  * This flags BOTH conditions; it NEVER drops observations (conservative — degeneracy is surfaced,
 * not silently filtered, per the non-conservative-filter refusal). `minReferenceN` and
 * `maxConcentration` are dimensionless SAMPLE-QUALITY bounds (NOT shop-rate / margin constants),
 * overridable by the caller.
 */
function assessReferenceReliability(
  reference: PriceDistribution | null,
  min
... [+1627 chars truncated]

### Assistant | 2026-06-09T20:45:11.152Z

Now I have the full picture. Let me verify the `shouldPromote`/`classifyOutcomeProvenance` are untouched (no softening) and confirm the gate's `block` path is genuinely additive (not wired into runCycle this unit, per R13).

### Assistant | 2026-06-09T20:45:12.887Z

[tool_use: Bash]

### User | 2026-06-09T20:45:20.170Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/QuotingClosedLoopEngine.ts', CRLF will be replaced by LF the next time Git touches it
 mcp-server/src/engines/QuotingClosedLoopEngine.ts | 90 +++++++++++++++++++++++
 1 file changed, 90 insertions(+)
---shouldPromote/provenance touched?---
warning: in the working copy of 'mcp-server/src/engines/QuotingClosedLoopEngine.ts', CRLF will be replac
... [+281 chars truncated]

### Assistant | 2026-06-09T20:45:42.356Z

The diff is purely additive (90 insertions, 0 deletions on the engine; `shouldPromote`/provenance bodies untouched — the only matches are the new function and its doc comment). Let me confirm the dispatcher passes `minConfidence`/`alignTolerance` through correctly via the spread, and check the one subtle correctness concern: the dispatcher reads `against` explicitly but `driftTolerance`/`alignTolerance` flow via the `{...parsed.data}` spread.

The diff and contracts give me everything needed. Let me record my verdict.

---

**VERDICT: PASS**

**P0/P1: none**

**Rationale:**

1. **Grain is correct and never silently mismatched.** `against:'line'` (per-part-job `ext_price`) is the right FMV default — predicted_quote_usd is per-part-job sell price, which maps to line ext_price, not unit price or order total. The schema documents "Must match the grain of `predicted`," the dispatcher forwards `against` explicitly (`p.against ?? "line"`), and `compareToPredicted` echoes `against` into the result so the gate is grain-traceable. Cost-grain (ActualCostEngine) rejection is sound — the loop is sell-price end-to-end. No silent cross-grain compare exists.

2. **Fail-closed/directional semantics are correct.** `block:true` fires only on the reliable-HIGH path (`referenceReliable===true && ratio > 1+tol`); unreliable (`unverified`), aligned, and predicted-low all return `block:false`. The directional-only rule is right: a thin/degenerate reference must never veto a MAPE-validated real-data improvement, and under-pricing is bid left on the table, not a margin hazard. Gating on `ratio` directly (rather than the engine's `verdict` string) is the *more* correct choice because it keeps a tighter `driftTolerance` override meaningful — the engine `verdict` is computed only against `alignTolerance`. The `tol`/`ratio` null-guards and the `ok:false`/null/undefined → `unverified` path (test-covered, never throws) close the edge cases.

3. **No soul-refuse violations.** Tolerance comes solely
... [+1549 chars truncated]
