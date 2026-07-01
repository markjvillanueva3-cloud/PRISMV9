---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Independent review of a single new test file (U-FT-12, SFC-FULLTUNE, slot:oscar)"
date: "2026-06-15"
first_ts: "2026-06-15T02:47:02.698Z"
last_ts: "2026-06-15T02:49:35.573Z"
cwd: "H:\\prism-slot-oscar"
messages: 44
user_msgs: 19
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-aceb0fe0bcdcb8a90.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Independent review of a single new test file (U-FT-12, SFC-FULLTUNE, slot:oscar)

> **claude-code-cli** | 2026-06-15 | 44 msgs (19 user / 25 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-aceb0fe0bcdcb8a90.jsonl`

## Transcript

### User | 2026-06-15T02:47:02.698Z

Independent review of a single new test file (U-FT-12, SFC-FULLTUNE, slot:oscar):
H:/prism-slot-oscar/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-coherence.test.ts

Verify the claim it encodes by reading the source it tests:
- H:/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts:444-450 (composeSegmentKey -> `${iso}|${tool}|${regime}`, tool=canonToolType(toolMaterial) -> "_" when undefined, regime=canonRegime -> only CutType members accepted)
- :1428-1432 (recordFeedback WRITE: composeSegmentKey({material: context.material, regime: context.regime}) -- toolMaterial OMITTED)
- H:/prism-slot-oscar/mcp-server/src/engines/UltimateSpeedFeedEngine.ts:2842 (APPLY: composeSegmentKey({material: input.material, regime: cutType}) -- toolMaterial OMITTED)
- the exports it imports: UltimateSpeedFeedEngine, setSfcCalibrationProvider, composeSegmentKey (confirm all are exported)

The test asserts apply-key == write-key == "P|_|roughing" and that a tool-augmented key "P|carbide|roughing" differs (regression guard against reintroducing toolMaterial at apply). Builder empirically confirmed these exact values via a tsx oracle on the real engine.

WEIGHT toward what could make this test WRONG or FRAGILE in CI:
1. Is "P|_|roughing" stable? Confirm resolveISOGroup("1045 steel") deterministically -> "P" (read the resolver / its alias table) and that canonRegime("roughing") -> "roughing" (roughing is a CUT_TYPES member). If either could change, the hardcoded literal is brittle -- but the test ALSO asserts apply-key == composeSegmentKey({material, regime: cut_type}), which is robust. Is the belt-and-suspenders OK or is the literal a liability?
2. Could the apply site's internal `cutType` differ from input.cut_type "roughing" (normalization), making appliedKey != composeSegmentKey({material, regime: input.cut_type})? The empirical run says they match -- confirm the apply path uses input.cut_type directly.
3. Test isolation: does setSfcCalibrationProvider(null) 
... [+584 chars truncated]

### Assistant | 2026-06-15T02:47:08.083Z

I'll read all the relevant source files before rendering judgment.

### Assistant | 2026-06-15T02:47:08.461Z

[tool_use: Read]

### Assistant | 2026-06-15T02:47:09.027Z

[tool_use: Read]

### User | 2026-06-15T02:47:10.085Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\UltimateSpeedFeedEngine.calib-coherence.test.ts' was already read 7s ago in this session and is unchanged (mtime 1781491544242). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new stat
... [+40 chars truncated]

### User | 2026-06-15T02:47:12.616Z

[tool_result] 420	
421	/** Canonicalize a tool material to the known set, else "_" (UNKNOWN bucket - never a guessed named bucket). */
422	function canonToolType(toolMaterial: string | undefined): string {
423	  if (!toolMaterial) return "_";
424	  const t = toolMaterial.toLowerCase().trim();
425	  return SEG_TOOL_TYPES.includes(t) ? t : "_";
426	}
427	
428	/** Canonicalize a regime; only explicit CutType membe
... [+2827 chars truncated]

### Assistant | 2026-06-15T02:47:18.026Z

The read-once guard tells me the test file is already in context. Let me retrieve it via Grep to access its content, then read the remaining source sections I need.

### Assistant | 2026-06-15T02:47:20.301Z

[tool_use: Grep]

### Assistant | 2026-06-15T02:47:20.966Z

[tool_use: Read]

### User | 2026-06-15T02:47:22.807Z

[tool_result] 1:/**
2: * U-FT-12 (SFC-FULLTUNE): LOCK the calibration WRITE-key == APPLY-key coherence.
3: * ==============================================================================
4: *
5: * The SFC self-learning loop is coherent ONLY because three sites compose the SAME segment key:
6: *   - DL recordFeedback WRITE site  (SpeedFeedDeepLearningEngine.ts:1432) -- composeSegmentKey({material, regime})
7: *
... [+4567 chars truncated]

### User | 2026-06-15T02:47:24.029Z

[tool_result] 1420	    }
1421	
1422	    this.selfLearning.recordFeedback({
1423	      job_id: jobId,
1424	      timestamp: Date.now(),
1425	      predicted,
1426	      actual,
1427	      error_pct: errorPct,
1428	      // U-OSC9: speed/feed are the segmented metrics; key = (iso|_|regime), tool-agnostic to match the
1429	      // carbide-assumed speed/feed prediction model. composeSegmentKey here uses the SAME {
... [+1114 chars truncated]

### Assistant | 2026-06-15T02:47:27.783Z

[tool_use: Read]

### Assistant | 2026-06-15T02:47:28.352Z

[tool_use: Read]

### User | 2026-06-15T02:47:30.729Z

[tool_result] 2825	    //  2. NEVER override a user-pinned operating point -- if the caller pinned ANY of cutting_speed /
2826	    //     spindle_rpm / feed_per_tooth / feed_per_rev / feed_rate, calibration is skipped entirely
2827	    //     (we correct PRISM's OWN recommendation, never the operator's explicit instruction).
2828	    //  3. CLAMP each factor to [CALIB_FACTOR_MIN, CALIB_FACTOR_MAX] = [0.4, 2.5] 
... [+2534 chars truncated]

### User | 2026-06-15T02:47:30.754Z

[tool_result] 1	/**
2	 * SpeedFeedDeepLearningEngine — SF-AI-L1
3	 *
4	 * First-layer AI hardening for Calculator Studio (Speed/Feed).
5	 * Neural networks, Monte Carlo, Bayesian optimization, chain-of-thought,
6	 * and self-learning feedback for cutting parameter optimization.
7	 *
8	 * AI Capabilities:
9	 * ----------------
10	 * 1. NEURAL NETWORK MODELS
11	 *    - Speed prediction from material/tool/operatio
... [+2013 chars truncated]

### Assistant | 2026-06-15T02:47:34.732Z

[tool_use: Grep]

### Assistant | 2026-06-15T02:47:35.422Z

[tool_use: Grep]

### User | 2026-06-15T02:47:37.365Z

[tool_result] 444:export function composeSegmentKey(ctx: { material?: string; toolMaterial?: string; regime?: string } | undefined): string {

### User | 2026-06-15T02:47:37.989Z

[tool_result] 214:export function setSfcCalibrationProvider(provider: SfcCalibProvider | null): void {
2009:export class UltimateSpeedFeedEngine {
3490:export const ultimateSpeedFeedEngine = new UltimateSpeedFeedEngine();

### Assistant | 2026-06-15T02:47:41.088Z

Good, all three exports are confirmed. Now I need to verify the `resolveISOGroup` function for "1045 steel" → "P", and confirm `cutType` at the apply site comes from `input.cut_type` directly.

### Assistant | 2026-06-15T02:47:41.847Z

[tool_use: Grep]

### Assistant | 2026-06-15T02:47:42.804Z

[tool_use: Grep]

### User | 2026-06-15T02:47:43.423Z

[tool_result] 410:function resolveISOGroup(material: string): string {
439: * NOTE: resolveISOGroup defaults an UNRECOGNIZED material to "P" (steel); until
446:  const iso = ctx.material ? resolveISOGroup(ctx.material) : "_";
767:    const isoGroup = resolveISOGroup(material);
845:    const isoGroup = resolveISOGroup(material);
934:    const isoGroup = resolveISOGroup(material);
1069:    const isoGroup = resolv
... [+73 chars truncated]

### User | 2026-06-15T02:47:50.693Z

[tool_result] 115:  cut_type?: CutType;
459:    cut_type: CutType;
1595:function inferCornerRadius(Dc_mm: number, operation: Operation, cut_type: CutType): number {
1597:  if (cut_type === "finishing") return Math.max(0.2, Dc_mm * 0.04);
2085:    const cutType = input.cut_type || inferCutType(input.optimize_for);
2086:    if (!input.cut_type) inferred.push("cut_type");
2162:      if (toolMat === "cermet" && cut
... [+705 chars truncated]

### Assistant | 2026-06-15T02:47:53.434Z

Good. I can see `cutType` at line 2085. Let me read the `resolveISOGroup` body and the `cutType` assignment context around line 2085 to confirm the normalization path.

### Assistant | 2026-06-15T02:47:54.105Z

[tool_use: Read]

### Assistant | 2026-06-15T02:47:54.523Z

[tool_use: Read]

### User | 2026-06-15T02:47:56.442Z

[tool_result] 405	// ============================================================================
406	// PHYSICS-BASED CALCULATIONS
407	// ============================================================================
408	
409	/** Get ISO group from material name */
410	function resolveISOGroup(material: string): string {
411	  const m = material.toLowerCase();
412	  if (m.includes("steel") || m.includes("1045") 
... [+899 chars truncated]

### User | 2026-06-15T02:47:56.449Z

[tool_result] 2080	    // STEP 2: Resolve operation, cut type, tool params
2081	    // ──────────────────────────────────────────────────
2082	    const operation = input.operation || inferOperation();
2083	    if (!input.operation) inferred.push("operation (defaulted to milling)");
2084	
2085	    const cutType = input.cut_type || inferCutType(input.optimize_for);
2086	    if (!input.cut_type) inferred.push("cu
... [+420 chars truncated]

### Assistant | 2026-06-15T02:47:59.319Z

[tool_use: Grep]

### Assistant | 2026-06-15T02:48:00.204Z

[tool_use: Grep]

### User | 2026-06-15T02:48:01.333Z

[tool_result] 1585:function inferCutType(optimize_for?: string): CutType {
2085:    const cutType = input.cut_type || inferCutType(input.optimize_for);

### User | 2026-06-15T02:48:01.398Z

[tool_result] 86:const CUT_TYPES: CutType[] = ["roughing", "semi_finishing", "finishing"];
87:const SEG_TOOL_TYPES = ["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"];
425:  return SEG_TOOL_TYPES.includes(t) ? t : "_";
431:  return (CUT_TYPES as string[]).includes(regime) ? regime : "_";

### Assistant | 2026-06-15T02:48:04.183Z

Good. Now read `inferCutType` body and check the `setSfcCalibrationProvider` reset path and `sfcCalibApplyEnabled`.

### Assistant | 2026-06-15T02:48:05.038Z

[tool_use: Read]

### Assistant | 2026-06-15T02:48:05.512Z

[tool_use: Read]

### User | 2026-06-15T02:48:49.449Z

[tool_result] 1585	function inferCutType(optimize_for?: string): CutType {
1586	  if (optimize_for === "surface_finish") return "finishing";
1587	  if (optimize_for === "productivity") return "roughing";
1588	  return "roughing";
1589	}
1590	
1591	function inferOperation(): Operation {
1592	  return "milling"; // most common
1593	}
1594	
1595	function inferCornerRadius(Dc_mm: number, operation: Operation, cut_t
... [+578 chars truncated]

### User | 2026-06-15T02:48:49.450Z

[tool_result] 200	/** Calibration factors for one regime segment. Injectable so tests get deterministic factors. */
201	type SfcCalibProvider = (segmentKey: string) => { speed: number; feed: number };
202	
203	const defaultCalibProvider: SfcCalibProvider = (segmentKey) => {
204	  const f = speedFeedDeepLearningEngine.getCalibrationFactors(segmentKey);
205	  return { speed: f.speed, feed: f.feed };
206	};
207	le
... [+1955 chars truncated]

### Assistant | 2026-06-15T02:48:54.168Z

I have everything I need. Let me now do a final check on the `afterEach` isolation concern — whether `setSfcCalibrationProvider(null)` restores `defaultCalibProvider` (not null), and whether any state leaks to a sibling test suite.

### Assistant | 2026-06-15T02:48:55.767Z

[tool_use: Grep]

### Assistant | 2026-06-15T02:48:56.334Z

[tool_use: Grep]

### User | 2026-06-15T02:48:58.253Z

[tool_result] 7: * read", SFC-OPEN-THREADS §2b). Flag-gated (PRISM_SFC_CALIB_APPLY, DEFAULT OFF).
17: * Calibration factors are injected via setSfcCalibrationProvider (deterministic, no DL-singleton
18: * contamination); env PRISM_SFC_CALIB_APPLY is toggled per assertion and restored in afterEach.
23:  setSfcCalibrationProvider,
46:  const prev = process.env.PRISM_SFC_CALIB_APPLY;
47:  process.env.PRISM_SFC_CAL
... [+607 chars truncated]

### User | 2026-06-15T02:48:58.399Z

[tool_result] 207:let activeCalibProvider: SfcCalibProvider = defaultCalibProvider;
215:  activeCalibProvider = provider ?? defaultCalibProvider;
2843:      const rawFactors = activeCalibProvider(segKey);

### Assistant | 2026-06-15T02:49:35.573Z

I have all the data I need. Here is the review.

---

VERDICT: PASS

summary: The test correctly locks the write-key == apply-key coherence invariant for the SFC self-learning loop. All three exports (`UltimateSpeedFeedEngine`, `setSfcCalibrationProvider`, `composeSegmentKey`) are confirmed exported at their stated lines. The hardcoded literal "P|_|roughing" is deterministic (verified below). `afterEach` isolation is complete. The regression guard is load-bearing. One low-severity convention finding and one documentation imprecision are noted below.

---

findings:

- [P2] `/prism-slot-oscar/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-coherence.test.ts:63` -- The literal `"P|_|roughing"` has a double-anchor risk. It is correct today because `resolveISOGroup` at `SpeedFeedDeepLearningEngine.ts:412` has `m.includes("1045")` as an explicit match for "P", and `CUT_TYPES` at line 86 includes `"roughing"` as a member, so `canonRegime("roughing")` returns `"roughing"`. However, the `resolveISOGroup` fallback at line 418 is also `"P"` (default-to-steel), meaning a typo'd material would also produce "P" rather than a sentinel. The doc comment at line 439 already acknowledges this (U-OSC9-ISO-UNKNOWN-SENTINEL is a tracked gap), so the literal is not wrong — but it means the concrete assertion `"P|_|roughing"` would survive a broken material resolver silently. This is **mitigated** by the adjacent algebraic assertion on line 62 (`appliedKey == writeKey`, which is robust regardless of what "P" resolves to), and by the `/|_|/` guard on line 64. No fix required, but a comment citing the `1045` branch (not just the fallback) would make the brittleness surface clearer. Fix: add an inline comment on line 63 noting that the "P" comes from the explicit `m.includes("1045")` branch at `SpeedFeedDeepLearningEngine.ts:412`, not the default fallback, to aid future maintainers.

- [P2] `/prism-slot-oscar/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-coherence.test.ts:77-
... [+3500 chars truncated]
