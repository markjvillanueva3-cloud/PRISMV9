---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "Review a NEW promotion-decision engine (U-LLR-META) for GATE-LOGIC + STATISTICAL"
date: "2026-05-30"
first_ts: "2026-05-30T16:05:47.492Z"
last_ts: "2026-05-30T16:07:39.613Z"
cwd: "H:\\prism-slot-whiskey\\mcp-server"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/agent-a88486ff43389b703.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:13"
---

# Review a NEW promotion-decision engine (U-LLR-META) for GATE-LOGIC + STATISTICAL

> **claude-code-cli** | 2026-05-30 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-whiskey\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/agent-a88486ff43389b703.jsonl`

## Transcript

### User | 2026-05-30T16:05:47.492Z

Review a NEW promotion-decision engine (U-LLR-META) for GATE-LOGIC + STATISTICAL CORRECTNESS as part of PRISM's per-file scrutiny gate. Read the WHOLE engine + test end-to-end.

FILE: H:\prism-slot-whiskey\mcp-server\src\engines\LatheLoRAMetaAdaptationEngine.ts
TEST: H:\prism-slot-whiskey\mcp-server\src\__tests__\LatheLoRAMetaAdaptationEngine.test.ts
CANONICAL GATE (it mirrors this): H:\prism-slot-whiskey\scripts\lib\nn-graph-eval.mjs — function gradeMetrics (~line 188) + GATE_THRESHOLDS (AUROC≥0.78, macroF1≥0.55, Brier≤0.15).

WHAT IT DOES: Decides promote|hold|reject for a retrained lathe LoRA adapter. Two gates: (1) absolute deploy-ready gate mirroring nn-graph gradeMetrics; (2) measured lift over the incumbent — candidate must beat incumbent by ≥ minLift on a higher-is-better metric.

VERIFY (P0/P1):
1. Absolute-gate parity with gradeMetrics: AUROC < threshold fails; macroF1 < threshold fails; Brier > threshold fails (LOWER is better — confirm the direction is `>` not `<`). A missing/non-finite metric must be a FAILURE not a silent pass (matches gradeMetrics' `!Number.isFinite(...) || ...`). Confirm exact threshold values 0.78/0.55/0.15.
2. Verdict logic correctness:
   - fails absolute gate → reject (regardless of lift)
   - passes gate + no incumbent → promote
   - passes gate + incumbent + delta ≥ minLift → promote
   - passes gate + incumbent + delta < minLift (incl negative) → hold
   - passes gate + lift metric unmeasurable (missing on either side) → hold (NOT promote — never promote on unmeasurable lift)
   Confirm there is NO path where a candidate that fails the absolute gate gets promoted, and NO path where an unmeasurably-better or worse candidate gets promoted.
3. Lift math: delta = candidate[liftMetric] − incumbent[liftMetric] for higher-is-better metrics (auroc/macroF1/successRate). Sign correct (positive delta = improvement)? minLift clamped to ≥0 (a negative required-lift would promote a worse model)? liftMetric restricted to higher-is-better (br
... [+684 chars truncated]

### Assistant | 2026-05-30T16:05:57.682Z

I'll review this promotion-decision engine for gate-logic and statistical correctness. Let me read the canonical gate, the engine, and the test end-to-end.

### Assistant | 2026-05-30T16:05:58.620Z

[tool_use: Read]

### Assistant | 2026-05-30T16:05:59.637Z

[tool_use: Read]

### Assistant | 2026-05-30T16:06:00.842Z

[tool_use: Read]

### User | 2026-05-30T16:06:06.274Z

[tool_result] 1	/**
2	 * LatheLoRAMetaAdaptationEngine — LATHE-LORA-MS0/U-LLR-META
3	 *
4	 * The meta-adaptation / promotion-decision capstone of the lathe self-improving-AI loop.
5	 * After a retrain (driven by the ledger #2 → extractor #1 → fusion #4 → calibration #5 →
6	 * select/ensemble #6/#7 cycle), this engine answers: should the newly-adapted lathe LoRA
7	 * adapter REPLACE the incumbent in production?

... [+8748 chars truncated]

### User | 2026-05-30T16:06:07.494Z

[tool_result] 1	/**
2	 * LATHE-LORA-MS0/U-LLR-META — real-behavior tests for the promotion-decision capstone.
3	 *
4	 * Pure + deterministic. Two gates: absolute deploy-ready (mirrors nn-graph gradeMetrics —
5	 * AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15, missing=fail) AND measured lift over the incumbent.
6	 * Every verdict (promote/hold/reject) is asserted on hand-chosen metric sets so the test fails
7	 * if eit
... [+6328 chars truncated]

### User | 2026-05-30T16:06:08.559Z

[tool_result] 170	    const meanProb = count > 0 ? bk.probs.reduce((s, x) => s + x, 0) / count : null;
171	    const accuracy = count > 0 ? bk.outcomes.reduce((s, x) => s + (x === 1 ? 1 : 0), 0) / count : null;
172	    return {
173	      range: `[${bk.lo.toFixed(2)}, ${bk.hi.toFixed(2)})`,
174	      count,
175	      meanProb: round4(meanProb),
176	      accuracy: round4(accuracy),
177	      brier: count > 0 ? r
... [+3299 chars truncated]

### Assistant | 2026-05-30T16:06:12.392Z

Let me verify the canonical GATE_THRESHOLDS values and confirm the dispatcher/schema wiring referenced by the test.

### Assistant | 2026-05-30T16:06:13.788Z

[tool_use: Grep]

### Assistant | 2026-05-30T16:06:15.208Z

[tool_use: Grep]

### User | 2026-05-30T16:06:18.444Z

[tool_result] 51:export const GATE_THRESHOLDS = Object.freeze({ auroc: 0.78, macroF1: 0.55, brier: 0.15 });
52-
53-export const HARNESS_DEFAULTS = Object.freeze({
54-  holdout: 200,        // held-out reference ghosts (capped at half the pool)
55-  seed: 1337,          // deterministic holdout shuffle
56-  refMinConf: 0.8,     // a ghost is a reference + holdout candidate at/above this

### User | 2026-05-30T16:06:24.977Z

[tool_result] 301-  "lathe_lora_ensemble_history",            // latheLoRAEnsembleVoterEngine.getHistory — past vote audit/replay
302-
303-  // LATHE-LORA-MS0/U-LLR-META: meta-adaptation / promotion-decision capstone (deploy-ready gate + measured lift over incumbent)
304:  "lathe_lora_meta_adapt_decide",           // latheLoRAMetaAdaptationEngine.decide — promote|hold|reject a retrained adapter
305-
306-  // FE
... [+587 chars truncated]

### Assistant | 2026-05-30T16:06:28.558Z

Canonical thresholds confirmed: `{ auroc: 0.78, macroF1: 0.55, brier: 0.15 }` — exactly mirrored by the engine constants (`GATE_AUROC=0.78`, `GATE_MACRO_F1=0.55`, `GATE_BRIER=0.15`). Dispatcher case + ACTIONS entry both present. Let me confirm the dispatcher case wiring is correct and the schema exists.

### Assistant | 2026-05-30T16:06:29.499Z

[tool_use: Read]

### Assistant | 2026-05-30T16:06:30.799Z

[tool_use: Grep]

### User | 2026-05-30T16:06:35.648Z

[tool_result] 2552	          // LATHE-LORA-MS0/U-LLR-META: promotion-decision capstone (deploy-ready gate + measured lift)
2553	          case "lathe_lora_meta_adapt_decide": {
2554	            const { latheLoRAMetaAdaptationEngine } = await import(
2555	              "../../engines/LatheLoRAMetaAdaptationEngine.js"
2556	            );
2557	            const p = (params as any) ?? {};
2558	            result = 
... [+1563 chars truncated]

### User | 2026-05-30T16:06:36.803Z

[tool_result] 2002-
2003-// LATHE-LORA-MS0/U-LLR-META: meta-adaptation / promotion-decision capstone
2004-const _adapterMetrics = z.object({
2005-  auroc: z.number().optional().describe("Area under ROC ∈ [0,1] (higher better)."),
2006-  macroF1: z.number().optional().describe("Macro-averaged F1 ∈ [0,1] (higher better)."),
2007-  brier: z.number().optional().describe("Brier score ∈ [0,1] (LOWER better)."),
2008-
... [+1457 chars truncated]

### Assistant | 2026-05-30T16:06:43.369Z

I now have everything I need. Let me work through each verification axis adversarially.

Let me verify the schema's `liftMetric` enum constraint, since the test exercises an invalid `liftMetric` value at the engine layer but the schema also matters.

### Assistant | 2026-05-30T16:06:44.367Z

[tool_use: Read]

### User | 2026-05-30T16:06:46.828Z

[tool_result] 2018	  minLift: z.number().optional().describe("Minimum measured lift over the incumbent to promote (default 0.02; clamped ≥0)."),
2019	  liftMetric: z.enum(["auroc", "macroF1", "successRate"]).optional().describe("Higher-is-better metric defining lift (default auroc)."),
2020	}).passthrough().describe("Decide whether to promote a retrained lathe LoRA adapter (deploy-ready gate + measured lift) — 
... [+725 chars truncated]

### Assistant | 2026-05-30T16:07:39.613Z

Everything verifies. Let me now systematically work through each of the six verification axes against the code I've read, hunting for any input that promotes a model that should be held or rejected.

**Axis 1 — Absolute-gate parity with `gradeMetrics`:**
- `gradeAbsolute` (lines 98-113) is a faithful mirror. AUROC: `!isFiniteNum(m.auroc) || m.auroc < gates.auroc` → fail (line 103) — matches `!Number.isFinite || < ` (nn-graph line 191). macroF1 same direction (line 106). Brier: `!isFiniteNum(m.brier) || m.brier > gates.brier` → fail (line 109) — `>` is the correct lower-is-better direction, matching nn-graph line 197. Missing/non-finite = failure in all three. Thresholds 0.78/0.55/0.15 confirmed against the frozen canonical (line 51). **PASS.**
- One *subtle improvement* over the canonical: the canonical prints `m.auroc == null ? "n/a"` but if `auroc` were `NaN` (finite-fails but not null), the canonical would call `NaN.toFixed(4)` → "NaN". The engine uses `isFiniteNum(...) ? ... : "n/a"` (line 104) — strictly more correct. Behaviorally the pass/fail is identical; only the message differs. Not a defect.

**Axis 2 — Verdict logic (lines 160-177):** The branch order is `!absoluteGate.pass → reject` first, so a failed absolute gate can NEVER promote regardless of lift. Then `!hasIncumbent → promote`. Then `delta == null → hold` (unmeasurable). Then `liftMeets → promote`, else `hold`. There is exactly one `promote` reachable with an incumbent, and it requires `delta != null && delta >= minLift`. **PASS — no promote path bypasses the gate or promotes on unmeasurable/negative lift.**

**Axis 3 — Lift math:**
- `delta = round4(candVal - incVal)` (line 147), candidate − incumbent → positive = improvement. Correct sign.
- `minLift = Math.max(0, ...)` (line 130) — negative required-lift clamped to 0. A worse model (negative delta) can never meet `delta >= 0`. ✓
- `liftMetric` restricted via `VALID_LIFT_METRICS.includes(...)` to `["auroc","macroF1","successRate"]` (lines 45, 13
... [+7801 chars truncated]
