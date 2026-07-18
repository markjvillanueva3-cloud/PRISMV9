---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Analyst review (arm C) of U-QP-OUTBOUND-PROMOTE-GATE (PRISM quoting) -- weighted"
date: "2026-06-09"
first_ts: "2026-06-09T20:44:55.908Z"
last_ts: "2026-06-09T20:46:27.216Z"
cwd: "H:\\prism\\mcp-server"
messages: 20
user_msgs: 7
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-aaea9252ded0c5001.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Analyst review (arm C) of U-QP-OUTBOUND-PROMOTE-GATE (PRISM quoting) -- weighted

> **claude-code-cli** | 2026-06-09 | 20 msgs (7 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-aaea9252ded0c5001.jsonl`

## Transcript

### User | 2026-06-09T20:44:55.908Z

Analyst review (arm C) of U-QP-OUTBOUND-PROMOTE-GATE (PRISM quoting) -- weighted toward silent breakage, regression, wiring integrity. Do NOT assume arms A/B caught everything. Grade PASS/FAIL + explicit P0/P1. Concise: VERDICT + P0/P1 (or "none") + 2-3 sentence rationale. 60 tests pass + tsc clean confirmed.

FILES (read + scoped diff `cd /h/prism && git diff -- mcp-server/src/engines/QuotingClosedLoopEngine.ts mcp-server/src/tools/dispatchers/quotingDispatcher.ts mcp-server/src/schemas/quotingActionSchemas.ts mcp-server/src/__tests__/QuotingClosedLoopEngine.test.ts mcp-server/src/__tests__/quotingDispatcher.test.ts`):

REVIEW FOCUS:
1. WIRING TRIPLE-MATCH: does the new `outbound_promote_check` appear consistently in ALL THREE -- quotingActionEnum (schema), QUOTING_ACTION_SCHEMAS object (schema), and the dispatcher switch case? Any mismatch (enum without schema, schema without case, etc.)? Action-count anti-regression: count went UP (added 1), not down?
2. DISPATCHER CASE correctness: the lazy imports (OutboundPriceIndexEngine.js + QuotingClosedLoopEngine.js) resolve? compareToPredicted gets `predicted` as 1st arg + the params record (with against defaulted to 'line') as 2nd? The `as any` matches the sibling outbound_price_calibration convention (R11)? Does `{...(parsed.data as any), against: p.against ?? 'line'}` correctly override against while passing minConfidence/alignTolerance/indexPath through?
3. SCHEMA contract: does the z.object match what the handler reads (predicted required array; against/minConfidence/alignTolerance/driftTolerance/minReferenceN?/maxConcentration?/indexPath optional)? Note: handler spreads parsed.data into compareToPredicted -- does the schema allow all fields compareToPredicted accepts, or does an unknown-key get dropped by zod (z.object strips unknowns by default -- is minReferenceN/maxConcentration reachable)?
4. NO REGRESSION: the engine change dropped the `match.verdict==='predicted-high' &&` condition from the drift branch (now g
... [+554 chars truncated]

### Assistant | 2026-06-09T20:45:01.525Z

I'll review the diff for U-QP-OUTBOUND-PROMOTE-GATE, focusing on wiring integrity, silent breakage, and regression risk.

### Assistant | 2026-06-09T20:45:03.625Z

[tool_use: Bash]

### User | 2026-06-09T20:45:04.329Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-09T20:45:09.454Z

The diff is already in my context from the cached run. Let me read the actual files to verify the wiring claims against current source.

### Assistant | 2026-06-09T20:45:11.074Z

[tool_use: Bash]

### User | 2026-06-09T20:45:18.230Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/QuotingClosedLoopEngine.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/engines/QuotingClosedLoopEngine.ts b/mcp-server/src/engines/QuotingClosedLoopEngine.ts
index e43fbef85b..0781aacddb 100644
--- a/mcp-server/src/engines/QuotingClosedLoopEngine.ts
+++ b/mcp-server/src/engines/QuotingClosedLoopEngin
... [+10499 chars truncated]

### Assistant | 2026-06-09T20:45:24.449Z

Now let me verify the engine drift-branch claim (point 4) and the sibling `compareToPredicted` signature. Let me check the engine diff for the runCycle drift branch change and the OutboundPriceIndexEngine signature.

### Assistant | 2026-06-09T20:45:25.712Z

[tool_use: Bash]

### User | 2026-06-09T20:45:31.461Z

[tool_result] +    `outbound alignment ${match.verdict ?? "n/a"} (medianRatio ${ratio === null ? "n/a" : ratio.toFixed(3)}, tol ${tol ?? "n/a"}); reference reliable`,
+  );
+  return { verdict: "aligned", block: false, signals };
+}
+
 // ─── Engine ─────────────────────────────────────────────────────────────────
 
 export class QuotingClosedLoopEngine {

### Assistant | 2026-06-09T20:45:38.708Z

The engine diff shows ONLY the `gateOutboundAlignment` addition + `OutboundMatchLike`/`OutboundAlignmentGate` interfaces — no change to `runCycle`'s drift branch and the prior-commit provenance code is byte-unchanged. The reviewer's point 4 ("dropped `match.verdict==='predicted-high' &&` from the drift branch") refers to logic *inside the new gate function*, not a regression in `runCycle`. Let me confirm `compareToPredicted`'s real signature to validate the dispatcher call shape.

### Assistant | 2026-06-09T20:45:40.002Z

[tool_use: Grep]

### User | 2026-06-09T20:45:40.010Z

[tool_result] <tool_use_error>Path does not exist: mcp-server/src/engines/OutboundPriceIndexEngine.ts. Note: your current working directory is H:\prism\mcp-server.</tool_use_error>

### Assistant | 2026-06-09T20:45:46.311Z

cwd is already `mcp-server`. Let me correct the path.

### Assistant | 2026-06-09T20:45:47.652Z

[tool_use: Grep]

### User | 2026-06-09T20:45:48.897Z

[tool_result] 539:  compareToPredicted(
540-    predicted: number[],
541-    params: { minConfidence?: OrderConfidence; against?: "unit" | "line" | "order"; alignTolerance?: number; minReferenceN?: number; maxConcentration?: number; indexPath?: string } = {},
542-  ): PriceMatchResult {
543-    const minConfidence: OrderConfidence = params.minConfidence ?? "high";
544-    const against: "unit" | "line" | "order
... [+1389 chars truncated]

### Assistant | 2026-06-09T20:45:57.415Z

Now I have the real signature. Key finding on point 3/5: `compareToPredicted`'s `params` accepts `minReferenceN` and `maxConcentration`, and the dispatcher spreads the FULL `parsed.data` (`{...(parsed.data as any), against:...}`) into it. So whether those fields reach the engine depends entirely on whether the schema's `z.object` keeps them. The schema for `outbound_promote_check` does NOT include `minReferenceN`/`maxConcentration` — and `z.object` strips unknown keys by default. Let me confirm there's no `.passthrough()` and verify the sibling `outbound_price_calibration` schema for the R11 convention comparison.

### Assistant | 2026-06-09T20:45:58.338Z

[tool_use: Grep]

### User | 2026-06-09T20:45:59.670Z

[tool_result] 106:  "outbound_price_calibration",             // U-QP-OUTBOUND-PRICE-CALIB — KS/median-ratio/band match of predicted prices vs real outbound
107-  // U-QP-OUTBOUND-PROMOTE-GATE (charlie 2026-06-09) -- outbound-alignment promote gate (compareToPredicted + gateOutboundAlignment); read-only advisory
108:  "outbound_promote_check",                 // U-QP-OUTBOUND-PROMOTE-GATE -- block-decision over
... [+6844 chars truncated]

### Assistant | 2026-06-09T20:46:27.216Z

Now I have everything I need for an authoritative analyst verdict. Let me confirm the triple-match completeness and that there's no default zod `.strip` surprise affecting the `against` override.

Key facts established:
1. **Triple-match (point 1)**: `outbound_promote_check` appears in all three — `quotingActionEnum` (line 108), `QUOTING_ACTION_SCHEMAS` (line 881), and the dispatcher switch case. `QuotingAction` is `z.infer<typeof quotingActionEnum>` and `QUOTING_ACTION_SCHEMAS` is typed `Record<QuotingAction, z.ZodTypeAny>`, so an enum-without-schema would be a compile error — tsc-clean confirms it. Count went UP by 1. ✓

2. **Dispatcher case (point 2)**: Lazy imports mirror the sibling `outbound_price_calibration` case's `as any` convention (R11). `compareToPredicted(p.predicted, {...(parsed.data as any), against: p.against ?? "line"})` — the spread puts `against` LAST so it overrides any `against` already in `parsed.data` (last-wins in object spread). `minConfidence`/`alignTolerance`/`indexPath` pass through because they ARE in the schema. ✓

3. **The real silent gap (points 3 + 5)**: `compareToPredicted`'s `params` accepts `minReferenceN` and `maxConcentration` (sample-quality bounds — line 541), and the sibling `outbound_price_calibration` schema DOES expose both (lines 876-877). But the new `outbound_promote_check` schema OMITS them, and `z.object` strips unknown keys by default (no `.passthrough()`). So even though the dispatcher spreads the full `parsed.data`, zod has already stripped those two keys before the handler runs — they're unreachable through the dispatcher. The engine silently falls back to defaults (minReferenceN=30, maxConcentration=0.02). This is a **feature gap, not a break** — and it directly governs `referenceReliable`, which is the gate's veto pivot. Given the documented CAVEAT that the OCR-$1 reference makes `referenceReliable` read true falsely, the inability to tune `maxConcentration` through the dispatcher is materially relevant to the 
... [+2331 chars truncated]
