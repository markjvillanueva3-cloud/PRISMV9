---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "RE-REVIEW (arm C, wiring/contract) of U-QP-OUTBOUND-PROMOTE-GATE in PRISM quotin"
date: "2026-06-09"
first_ts: "2026-06-09T20:57:01.102Z"
last_ts: "2026-06-09T20:58:47.059Z"
cwd: "H:\\prism\\mcp-server"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a2b8b98393fef735f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# RE-REVIEW (arm C, wiring/contract) of U-QP-OUTBOUND-PROMOTE-GATE in PRISM quotin

> **claude-code-cli** | 2026-06-09 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a2b8b98393fef735f.jsonl`

## Transcript

### User | 2026-06-09T20:57:01.102Z

RE-REVIEW (arm C, wiring/contract) of U-QP-OUTBOUND-PROMOTE-GATE in PRISM quoting, after closing your prior P2. The engine + dispatcher logic is UNCHANGED from the prior PASS; the delta is: (1) mcp-server/src/schemas/quotingActionSchemas.ts added minReferenceN + maxConcentration optional fields to the outbound_promote_check z.object; (2) mcp-server/src/__tests__/quotingDispatcher.test.ts rewritten to hermetic fixtures.

Grade PASS/FAIL + explicit P0/P1. Concise. 62 tests pass + tsc clean confirmed.

Read the final diff: `cd /h/prism && git diff -- mcp-server/src/schemas/quotingActionSchemas.ts mcp-server/src/tools/dispatchers/quotingDispatcher.ts mcp-server/src/__tests__/quotingDispatcher.test.ts`

VERIFY:
1. SCHEMA delta: are minReferenceN + maxConcentration correct (z.number().positive().optional(), mirroring outbound_price_calibration lines ~876-877)? Do they now flow through the dispatcher's `{...(parsed.data as any), against: ...}` spread into compareToPredicted (since z.object no longer strips them)? The maxConcentration:1000 test asserts referenceReliable:false -- consistent with compareToPredicted treating (p75-p25)/median < maxConcentration as degenerate?
2. TRIPLE-MATCH still intact: outbound_promote_check in quotingActionEnum + QUOTING_ACTION_SCHEMAS + dispatcher case; action count only went UP. No accidental edit to the enum or other schemas?
3. No regression in the dispatcher case or the unchanged outbound_price_calibration/outbound_price_prior handlers.
4. The schema field descriptions are honest (dimensionless, NOT price constants -- no soul-refuse)?
Report only real P0/P1. If the schema delta is correct and wiring intact, say PASS.

### Assistant | 2026-06-09T20:57:07.646Z

I'll re-review the U-QP-OUTBOUND-PROMOTE-GATE delta. Let me read the final diff and verify the schema changes against the dispatcher wiring.

### Assistant | 2026-06-09T20:57:09.625Z

[tool_use: Bash]

### User | 2026-06-09T20:57:17.954Z

[tool_result] diff --git a/mcp-server/src/__tests__/quotingDispatcher.test.ts b/mcp-server/src/__tests__/quotingDispatcher.test.ts
index 420f48d6f4..4823b5248a 100644
--- a/mcp-server/src/__tests__/quotingDispatcher.test.ts
+++ b/mcp-server/src/__tests__/quotingDispatcher.test.ts
@@ -2,7 +2,10 @@
  * Tests for quotingDispatcher — QUOTING-PIPELINE-MS0 / U-QP08.
  * Round-trip through each of 8 actions via a fake
... [+12658 chars truncated]

### Assistant | 2026-06-09T20:57:23.629Z

The diff is self-contained and the engine/dispatcher logic is unchanged. Let me verify the two claims that need source confirmation: the schema mirror against `outbound_price_calibration`, and that `compareToPredicted` actually consumes `minReferenceN`/`maxConcentration` so the `maxConcentration:1000 → referenceReliable:false` assertion is honest.

### Assistant | 2026-06-09T20:57:25.412Z

[tool_use: Bash]

### Assistant | 2026-06-09T20:57:26.460Z

[tool_use: Bash]

### User | 2026-06-09T20:57:31.238Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
29 matches in 20 files:

147:0:boolean;
149:0:"ok" | "insufficient-reference" | "degenerate-reference";
297:0:number,
298:0:number,
300:0:boolean;
301:0:"ok" | "insufficient-reference" | "degenerate-reference";
306:0:false,
307
... [+1574 chars truncated]

### User | 2026-06-09T20:57:36.217Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 6 files:

871:0:z.object({
876:0:z.number().positive().optional().describe("Sample-quality floor (default 30):...
877:0:z.number().positive().optional().describe("Sample-quality bound (default 0.02...
886:0:z.numbe
... [+292 chars truncated]

### Assistant | 2026-06-09T20:57:43.416Z

RTK is mangling the grep output. Let me read the engine's reliability pivot and the calibration schema directly.

### Assistant | 2026-06-09T20:57:44.326Z

[tool_use: Read]

### User | 2026-06-09T20:57:45.249Z

[tool_result] 288	 * to calibrate against, or (b) a pathological SPIKE — a mass of OCR "$1" rows collapses the
289	 * inter-quartile span, so `medianRatio`/`verdict` reflect the spike, not a real price distribution.
290	 * This flags BOTH conditions; it NEVER drops observations (conservative — degeneracy is surfaced,
291	 * not silently filtered, per the non-conservative-filter refusal). `minReferenceN` and
292
... [+2395 chars truncated]

### Assistant | 2026-06-09T20:57:46.330Z

[tool_use: Read]

### Assistant | 2026-06-09T20:57:46.335Z

[tool_use: Read]

### User | 2026-06-09T20:57:47.879Z

[tool_result] 535	   * `withinBandPct` (coverage) are reported but do NOT gate the verdict — a same-median, different-shape
536	   * prediction can read `aligned` with a high `ksGap`. A consumer judging full distribution match (not
537	   * just central tendency) must inspect `ksGap`/`withinBandPct` too, not `verdict` alone.
538	   */
539	  compareToPredicted(
540	    predicted: number[],
541	    params: { minC
... [+1712 chars truncated]

### User | 2026-06-09T20:57:47.897Z

[tool_result] 860	      "material", "outside-process", "freight-shipping", "tooling-consumable",
861	      "inspection-quality", "overhead-utility", "misc",
862	    ]).optional().describe("Cost category; omit to return all categories + totals"),
863	    indexPath: z.string().optional().describe("Override the jm-vendor-cost-index.json path (testing/override)"),
864	  }),
865	  // U-QP-OUTBOUND-PRICE-PRIOR (charl
... [+3857 chars truncated]

### Assistant | 2026-06-09T20:57:54.003Z

All four verification points are confirmed against source. Let me verify the triple-match (enum + schema map + dispatcher case all present, no accidental edits to siblings) and confirm `gateOutboundAlignment` reads the reliability field so the `unverified` path is honest.

### Assistant | 2026-06-09T20:57:57.382Z

[tool_use: Bash]

### Assistant | 2026-06-09T20:57:58.700Z

[tool_use: Bash]

### User | 2026-06-09T20:58:02.429Z

[tool_result] mcp-server/src/schemas/quotingActionSchemas.ts:6
mcp-server/src/tools/dispatchers/quotingDispatcher.ts:3
---enum/map/case occurrences per action---
outbound_promote_check: schema=2 dispatcher=1
outbound_price_calibration: schema=2 dispatcher=1
outbound_price_prior: schema=2 dispatcher=1

### User | 2026-06-09T20:58:07.178Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
56 matches in 33 files:

104:0:"real" | "synthetic" | "empty";
136:0:
165:0:(report: AccuracyReport) => Promise<{ factors: CalibrationFactors; verdict: C...
350:0:"empty", mayPromote: false, real_outcome_count: 0, signals };
36
... [+2296 chars truncated]

### Assistant | 2026-06-09T20:58:20.410Z

The triple-match counts confirm: each action appears exactly twice in the schema file (enum comment line + the `z.object` map key) and once in the dispatcher case — identical structure to the two unchanged sibling actions, no over/under count. Let me read the `gateOutboundAlignment` reliability branch directly to confirm the `unverified` path honors `referenceReliable:false`.

### Assistant | 2026-06-09T20:58:21.701Z

[tool_use: Read]

### User | 2026-06-09T20:58:22.619Z

[tool_result] 438	 */
439	export function gateOutboundAlignment(
440	  match: OutboundMatchLike | null | undefined,
441	  options: { driftTolerance?: number } = {},
442	): OutboundAlignmentGate {
443	  const signals: string[] = [];
444	  const tol =
445	    typeof options.driftTolerance === "number" && options.driftTolerance > 0
446	      ? options.driftTolerance
447	      : typeof match?.alignTolerance === "nu
... [+1645 chars truncated]

### Assistant | 2026-06-09T20:58:47.059Z

All four verification points are confirmed against source. The gate logic chains correctly: `compareToPredicted` sets `referenceReliable` via `assessReferenceReliability`, and `gateOutboundAlignment:451` reads `match.referenceReliable !== true → unverified, block:false`. The `maxConcentration:1000` test assertion is honest.

---

## Code Quality Analysis Report — U-QP-OUTBOUND-PROMOTE-GATE (arm C re-review)

**Grade: PASS**

### Verification 1 — SCHEMA delta correctness ✓
`minReferenceN` + `maxConcentration` in `outbound_promote_check` (`quotingActionSchemas.ts:886-887`) are `z.number().positive().optional()`, byte-identical typing to the calibration sibling at lines 876-877. Both are `.describe()`d as **"Dimensionless, NOT a price constant"** — honest, no soul-refuse risk (no shop-rate/margin constant inlined into a schema default).

The flow-through is real and verified end-to-end:
- Dispatcher spreads `{ ...(parsed.data as any), against: p.against ?? "line" }` into `compareToPredicted` (`quotingDispatcher.ts:97`). Because the zod object now *declares* these keys, zod no longer strips them — they survive into `parsed.data` and reach the engine.
- `compareToPredicted` (`OutboundPriceIndexEngine.ts:541,547-550,560`) reads `params.minReferenceN`/`params.maxConcentration`, applies them to `assessReferenceReliability`.
- The IQR-collapse branch (`OutboundPriceIndexEngine.ts:327-334`): `iqrSpread = (p75-p25)/median < maxConcentration → degenerate-reference → referenceReliable:false`. With `maxConcentration:1000`, the OCR fixture's wide-but-noisy IQR spread falls below 1000 → degenerate → `referenceReliable:false`. The test assertion is **consistent with engine behavior**, not a fabricated expectation. R9 satisfied — reverting the schema (re-stripping the field) pins default `0.02`, the spread exceeds it, `referenceReliable:true`, and the test fails.

### Verification 2 — TRIPLE-MATCH intact ✓
Per-action occurrence counts are identical for the new action and both unchang
... [+1948 chars truncated]
