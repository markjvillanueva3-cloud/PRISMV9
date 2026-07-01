---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Review the SFC closed-loop calibration bridge (U-FT-11 keystone). Worktree: H:/p"
date: "2026-06-15"
first_ts: "2026-06-15T17:41:40.903Z"
last_ts: "2026-06-15T17:45:12.410Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 71
user_msgs: 28
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a92984b9bf18b0967.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Review the SFC closed-loop calibration bridge (U-FT-11 keystone). Worktree: H:/p

> **claude-code-cli** | 2026-06-15 | 71 msgs (28 user / 43 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a92984b9bf18b0967.jsonl`

## Transcript

### User | 2026-06-15T17:41:40.903Z

Review the SFC closed-loop calibration bridge (U-FT-11 keystone). Worktree: H:/prism-slot-oscar. Read files; cite file:line. Do NOT call mcp__prism__*.

FILES:
- mcp-server/scripts/sfc-calib-sync.mjs (NEW -- the bridge)
- mcp-server/scripts/sfc-calib-sync.test.mjs (NEW -- 6 node:test cases, all passing via tsx --test)

WHAT IT DOES: reads <out>/baseline-params.json (the sweep moat, now cut_type-resolved per U-FT-11-PRE), and for every vendor_corroborated regime calls SpeedFeedDeepLearningEngine.recordFeedback(jobId, predicted, actual, {material, regime}) to feed the (PRISM-vs-vendor) signal into the live calibration, closing the SFC self-learning loop.

VERIFY (cite file:line in the engine where relevant):
1. VENDOR INVERSION: bias_*_pct = mean signedPct(prism,vendor) = mean (prism-vendor)/vendor*100 (sfc-combinatorial-compare.ts:114). The bridge computes actual = prism / (1 + bias/100). Confirm this correctly reconstructs the vendor value. Is using prism=vc_mpm.p50 (a p50) with bias=mean-of-ratios a sound approximation? Any sign error (would it push calibration the WRONG way)?
2. SEGMENT-KEY COHERENCE: the bridge passes context {material: ISO_REP_MATERIAL[iso], regime: cut_type}; recordFeedback composes composeSegmentKey({material, regime}) = iso|_|cut_type (SpeedFeedDeepLearningEngine.ts:444). Confirm this is BYTE-IDENTICAL to the apply-read key at UltimateSpeedFeedEngine.ts:2842 (composeSegmentKey({material: input.material, regime: cutType})). i.e. a live calc for the SAME iso+cut_type reads the factor the bridge wrote. THIS is the load-bearing claim.
3. RESOLVEISOGROUP TRAP: resolveISOGroup (SpeedFeedDeepLearningEngine.ts:410) substring-matches material names + defaults unknowns to "P". Confirm each ISO_REP_MATERIAL entry resolves to its OWN iso letter (P=1045 steel, M=316 stainless, K=cast iron, N=6061 aluminum, S=ti-6al-4v titanium, H=hardened d2) -- watch the ordering trap (resolveISOGroup checks "steel" before "stainless"/"hardened", so an M/H material conta
... [+880 chars truncated]

### Assistant | 2026-06-15T17:41:43.648Z

I'll review the SFC closed-loop calibration bridge. Let me start by reading the core files in parallel.

### Assistant | 2026-06-15T17:41:44.129Z

[tool_use: Read]

### Assistant | 2026-06-15T17:41:44.622Z

[tool_use: Read]

### User | 2026-06-15T17:41:45.174Z

[tool_result] 1	/**
2	 * SFC closed-loop calibration BRIDGE (U-FT-11, SFC-FULLTUNE) -- the keystone that closes the loop.
3	 * ===================================================================================================
4	 *
5	 * Reads the full-sweep baseline moat (<out>/baseline-params.json, U-FT-06 + U-FT-11-PRE) and feeds
6	 * every VENDOR_CORROBORATED regime's (PRISM-vs-vendor) signal into the SFC de
... [+10999 chars truncated]

### User | 2026-06-15T17:41:45.701Z

[tool_result] 1	/**
2	 * Tests for sfc-calib-sync.mjs (U-FT-11) -- run via: tsx --test scripts/sfc-calib-sync.test.mjs
3	 * (node:test; needs tsx because the bridge imports the TS SpeedFeedDeepLearningEngine.)
4	 *
5	 * Covers: the ISO->material round-trip self-check (resolveISOGroup default-to-P trap), the pure
6	 * regime->recordFeedback mapping (vendor inversion + segment-key coherence + skip paths), and an

... [+6332 chars truncated]

### Assistant | 2026-06-15T17:41:47.317Z

Now let me read the critical engine functions to verify the load-bearing claims. Let me look at the key methods in parallel.

### Assistant | 2026-06-15T17:41:48.746Z

[tool_use: Read]

### Assistant | 2026-06-15T17:41:49.380Z

[tool_use: Read]

### User | 2026-06-15T17:41:51.903Z

[tool_result] 400	    },
401	    samples,
402	  };
403	}
404	
405	// ============================================================================
406	// PHYSICS-BASED CALCULATIONS
407	// ============================================================================
408	
409	/** Get ISO group from material name */
410	function resolveISOGroup(material: string): string {
411	  const m = material.toLowerCase();
412	
... [+2893 chars truncated]

### User | 2026-06-15T17:41:52.137Z

[tool_result] 630	  private saveState(): void {
631	    if (!this.persistEnabled) return;
632	    try {
633	      const segObj: Record<string, Record<string, number>> = {};
634	      for (const [k, v] of this.segmentFactors) segObj[k] = { ...v };
635	      const cntObj: Record<string, number> = {};
636	      for (const [k, v] of this.segmentSampleCount) cntObj[k] = v;
637	      const state: PersistedCalibState 
... [+2534 chars truncated]

### Assistant | 2026-06-15T17:41:56.174Z

I see a critical issue already. The bridge passes `recordFeedback(jobId, predicted, actual, context)` as 4 positional args, but the engine signature at line 651 is `recordFeedback(entry: FeedbackEntry): void` — a SINGLE object arg. Let me find the actual recordFeedback overload/wrapper and trace the full path carefully.

### Assistant | 2026-06-15T17:41:57.585Z

[tool_use: Grep]

### User | 2026-06-15T17:41:58.984Z

[tool_result] 62:// method + the captureSFC emit in recordFeedback close that loop.
69:// (a corrupt/unwritable state file can never break recordFeedback's contract).
627:   * Fail-soft atomic persist (tmp+rename via safeWriteSync). NEVER throws -- recordFeedback's contract
651:  recordFeedback(entry: FeedbackEntry): void {
674:    // persistence is off, so this never alters recordFeedback's observable contract
... [+261 chars truncated]

### Assistant | 2026-06-15T17:41:59.044Z

[tool_use: Grep]

### User | 2026-06-15T17:42:00.634Z

[tool_result] 63:// sandbox nobody read). The flag-gated apply below reads those factors; composeSegmentKey makes the
64:// apply READ-key == the DL recordFeedback WRITE-key (the coherence the loop depends on).
65:import { speedFeedDeepLearningEngine, composeSegmentKey } from "./SpeedFeedDeepLearningEngine.js";
485:    segment_key: string;
2085:    const cutType = input.cut_type || inferCutType(input.optimize_f
... [+828 chars truncated]

### Assistant | 2026-06-15T17:42:03.808Z

The bridge calls a wrapper at line 1401, not the low-level method at 651. Let me read both that wrapper and the apply-read site to verify the load-bearing claims precisely.

### Assistant | 2026-06-15T17:42:05.232Z

[tool_use: Read]

### Assistant | 2026-06-15T17:42:05.929Z

[tool_use: Read]

### User | 2026-06-15T17:42:08.392Z

[tool_result] 1395	  }
1396	
1397	  // ============================================================================
1398	  // SELF-LEARNING INTERFACE
1399	  // ============================================================================
1400	
1401	  recordFeedback(
1402	    jobId: string,
1403	    predicted: { speed_mpm: number; feed_mm: number; tool_life_min: number; Ra_um: number },
1404	    actual: { speed_m
... [+2736 chars truncated]

### User | 2026-06-15T17:42:08.607Z

[tool_result] 2840	    //  4. RE-RESPECT the machine RPM ceiling STEP 4 enforced -- a speed gain that would exceed maxRPM is
2841	    //     truncated at the spindle limit.
2842	    // The derived analytics (force/power/thermal/life) intentionally stay first-principles at the
2843	    // pre-calibration point; calibration is an empirical correction on the RECOMMENDED operating point,
2844	    // surfaced transp
... [+3500 chars truncated]

### Assistant | 2026-06-15T17:42:12.861Z

Now I have the critical pieces. Let me verify the inversion math claim (#1) and confirm the bias source at sfc-combinatorial-compare.ts:114, plus check the `applyWindow` direction (does the sign push the right way), and the persistence/atomic-write path.

### Assistant | 2026-06-15T17:42:14.408Z

[tool_use: Read]

### Assistant | 2026-06-15T17:42:15.710Z

[tool_use: Grep]

### User | 2026-06-15T17:42:15.728Z

[tool_result] <tool_use_error>Path does not exist: H:/prism-slot-oscar/mcp-server/src/algorithms/sfc-combinatorial-compare.ts. Note: your current working directory is H:\prism-slot-oscar\mcp-server.</tool_use_error>

### User | 2026-06-15T17:42:18.519Z

[tool_result] 688	        let next = factors[key] * (1 - avgError / 200); // Gentle adjustment
689	        if (!Number.isFinite(next)) next = 1.0;
690	        factors[key] = Math.min(SEG_FACTOR_MAX, Math.max(SEG_FACTOR_MIN, next));
691	      }
692	    }
693	  }
694	
695	  getCalibrationFactors(segmentKey?: string): Record<string, number> {
696	    // No segment / the global key / an unknown or starved (<5 sampl
... [+1122 chars truncated]

### Assistant | 2026-06-15T17:42:25.799Z

Let me find the actual location of the bias computation referenced as sfc-combinatorial-compare.ts:114.

### Assistant | 2026-06-15T17:42:26.275Z

[tool_use: Glob]

### Assistant | 2026-06-15T17:42:27.024Z

[tool_use: Grep]

### User | 2026-06-15T17:42:35.874Z

[tool_result] src\data\sfc-combinatorial-compare.ts

### User | 2026-06-15T17:42:38.831Z

[tool_result] Found 7 files
scripts\sfc-calib-sync.mjs
scripts\sfc-calib-sync.test.mjs
src\__tests__\calcDispatcher.sfc-csfh-wire.test.ts
src\__tests__\sfc\combinatorial-baseline-params.test.ts
src\data\sfc-combinatorial-baseline-params.ts
src\data\sfc-combinatorial-compare.ts
src\engines\StrategyPerformanceTrackerEngine.ts

### Assistant | 2026-06-15T17:42:42.856Z

[tool_use: Read]

### Assistant | 2026-06-15T17:42:44.499Z

[tool_use: Grep]

### User | 2026-06-15T17:42:46.561Z

[tool_result] 95	 * gate-passing subset (feedEligibleCount), never from citedCount.
96	 */
97	export interface CompareReport {
98	  comparisons: CellComparison[];
99	  total: number;
100	  drivenCount: number;
101	  /** cells with a resolved, non-null-vc vendor citation (counted even if the cell errored; a non-positive vendor vc still abstains from comparison). */
102	  citedCount: number;
103	  /** driven && c
... [+1495 chars truncated]

### User | 2026-06-15T17:42:47.266Z

[tool_result] 58: * STRIPS null-valued fields, so every `| null` field below (vc_mpm / fz_mm /
59: * bias_vc_pct / bias_fz_pct / containment_frac / divergent_frac) arrives ABSENT
72:  vc_mpm: BaselineEnvelope | null;
73:  /** As vc_mpm; can ALSO be null on a 'baseline' regime if PRISM fz was underivable (zero rpm/flutes) for every clean cell. */
74:  fz_mm: BaselineEnvelope | null;
76:  bias_vc_pct: number | nu
... [+399 chars truncated]

### Assistant | 2026-06-15T17:42:50.960Z

Now let me verify how `bias_vc_pct`/`bias_fz_pct` is actually computed in the baseline-params builder (mean of signedPct or a different aggregation) — this is critical for verification claim #1. Let me also check the apply READ direction: the bridge reconstructs vendor, then `errorPct.speed = (predicted - actual)/predicted`. I need to confirm the sign pushes calibration toward vendor.

### Assistant | 2026-06-15T17:42:52.102Z

[tool_use: Read]

### User | 2026-06-15T17:42:53.775Z

[tool_result] 225	        status = "baseline";
226	      }
227	
228	      if (status !== "baseline") {
229	        if (status === "segregated_operation") segregatedCount++;
230	        else insufficientCount++;
231	        regimes.push({
232	          regime: key, iso_group: g.iso, operation: g.op, cut_type: g.ct, status,
233	          vc_mpm: null, fz_mm: null, bias_vc_pct: null, bias_fz_pct: null,
234	       
... [+1671 chars truncated]

### Assistant | 2026-06-15T17:43:00.707Z

Confirmed: `bias_vc_pct = mean(vc_delta_pct)` where `vc_delta_pct = signedPct(prism, vendor) = (prism-vendor)/vendor*100` (line 241, 114). Now let me verify the inversion math and the calibration direction precisely. 

The key concern for #1: bias is `mean of (prism-vendor)/vendor` (mean of ratios), and the bridge reconstructs `actual = prism_p50 / (1 + bias/100)`. Then `errorPct.speed = (predicted - actual)/predicted = (prism - prism/(1+b/100))/prism = 1 - 1/(1+b/100) = b/(100+b)`. Then `applyWindow`: `next = factor * (1 - avgError/200)`. Let me check what direction calibration moves and how it's applied — does a positive error reduce speed (correct, since PRISM was higher than vendor)?

Let me verify the `vc_delta_pct` source field and confirm `fe` (feed-eligible) is the subset used for bias, and check the `mean`/`envelope` helpers for empty-array NaN behavior.

### Assistant | 2026-06-15T17:43:01.932Z

[tool_use: Read]

### User | 2026-06-15T17:43:03.057Z

[tool_result] 180	    // on cut_type (segment key iso|_|cut_type), so the baseline MUST resolve cut_type or roughing /
181	    // finishing cells average into one bucket the loop cannot read (U-FT-11-PRE).
182	    const groups = new Map<string, { iso: ISOGroup; op: Operation; ct: CutType; rows: CompareReport["comparisons"] }>();
183	    for (const c of report.comparisons) {
184	      const key = `${c.sample.iso
... [+1846 chars truncated]

### Assistant | 2026-06-15T17:43:08.334Z

Now I have the full picture for the inversion. Let me trace the calibration direction sign end-to-end to confirm it pushes the RIGHT way, and check `activeCalibProvider`/factor application: `Vc *= kSpeed`. If PRISM over-predicts (prism > vendor, bias > 0), we want kSpeed < 1 to bring it DOWN toward vendor.

Let me verify the apply direction by reading `applyWindow` math fully and the SEG_FACTOR clamps, plus the `safeWriteSync` atomicity and how the singleton's stateFile path compares to the bridge's default.

### Assistant | 2026-06-15T17:43:09.536Z

[tool_use: Read]

### User | 2026-06-15T17:43:11.374Z

[tool_result] 55	  CANONICAL_TAYLOR,
56	} from "../physics/constants.js";
57	// SF-PSN-WIRE-MS0/U-SFPSN-09 (slot:juliett, 2026-05-23): close the SF outcome
58	// feedback loop. Audit F9 measured: "sfcOutcomeWire is imported by 5 SF engines
59	// but NOT by SpeedFeedDeepLearningEngine, which holds the calibrationFactors
60	// self-learning state — so outcomes are captured at the calculator layer and
61	// discar
... [+2834 chars truncated]

### Assistant | 2026-06-15T17:43:14.967Z

Now let me find the canonical stateFile path the singleton uses (to verify persistence claim #6 — that the bridge writes the file the MCP singleton reads) and the constructor.

### Assistant | 2026-06-15T17:43:17.541Z

[tool_use: Grep]

### User | 2026-06-15T17:43:19.236Z

[tool_result] 67:// Persistence is OPT-IN at construction (the exported singleton persists; fresh `new` instances in
514: * Runaway guard on the persisted feedback log. Calibration feedback is inherently low-volume
517: * Authoritative globalFactors / segmentFactors / segmentSampleCount are persisted in full and restored
562:  // U-OSC9-CALIB-PERSIST: durable state is OPT-IN. The exported singleton persists sho
... [+2253 chars truncated]

### Assistant | 2026-06-15T17:43:22.839Z

There are TWO constructors at line 567 and 749 — that's suspicious. Let me read both regions plus `defaultCalibStateFile` and the singleton persist gating.

### Assistant | 2026-06-15T17:43:24.257Z

[tool_use: Read]

### Assistant | 2026-06-15T17:43:25.396Z

[tool_use: Read]

### User | 2026-06-15T17:43:25.595Z

[tool_result] 525	 * root in both layouts (`src/engines/X` and `dist/engines/X` both sit two levels under mcp-server/).
526	 */
527	function defaultCalibStateFile(): string {
528	  const engineDir = path.dirname(fileURLToPath(import.meta.url));
529	  const mcpRoot = path.resolve(engineDir, "..", "..");
530	  return path.resolve(mcpRoot, "data", "state", "sfc-calib-factors.json");
531	}
532	
533	/** Serialized f
... [+1585 chars truncated]

### Assistant | 2026-06-15T17:43:26.070Z

[tool_use: Read]

### User | 2026-06-15T17:43:26.981Z

[tool_result] 740	  private toolLifeNetwork = createToolLifeNetwork();
741	  private selfLearning: SelfLearningSystem;
742	
743	  /**
744	   * U-OSC9-CALIB-PERSIST: persistence is OPT-IN. The exported singleton constructs with
745	   * `{ persist: true }` so shop-floor calibration survives MCP-server restarts; a bare
746	   * `new SpeedFeedDeepLearningEngine()` (every test) stays hermetic (no disk read/write).

... [+790 chars truncated]

### User | 2026-06-15T17:43:27.863Z

[tool_result] 1505	
1506	/**
1507	 * U-OSC9-CALIB-PERSIST: should the SHARED singleton persist?
1508	 *
1509	 * The singleton is the live MCP surface that accumulates shop-floor actuals, so in production it
1510	 * persists. But pre-existing tests call the singleton directly (e.g. SFOutcomeFeedbackLoopWire.test.ts,
1511	 * speedfeed-dl-stats-wire.test.ts), so under the test runner persistence MUST be inert -- o
... [+813 chars truncated]

### Assistant | 2026-06-15T17:43:33.872Z

The two constructors are on different classes (the inner `SelfLearningSystem` at 567, the outer engine at 749) — both legitimate. Now the canonical state file is `mcp-server/data/state/sfc-calib-factors.json` (line 530). The bridge's default uses the engine's own default (no `--state-file`), so they coincide. 

Now let me verify the critical inversion direction end-to-end and check `safeWriteSync` for the concurrency claim (#6). Let me also resolve the `ISO_REP_MATERIAL` ordering trap (#3) — particularly "316 stainless" (contains "316" → M, good), "hardened d2" (contains "hardened" → H, but does it contain "steel"? no), and "cast iron" (K). Let me trace `resolveISOGroup` for each rep material precisely and confirm `safeWriteSync` atomicity.

### Assistant | 2026-06-15T17:43:34.380Z

[tool_use: Read]

### User | 2026-06-15T17:43:43.224Z

[tool_result] 1	/**
2	 * atomicWrite — async atomic file writer for JSON state files.
3	 *
4	 * Writes to <path>.tmp then renames to <path>. NTFS rename within same
5	 * volume is atomic, avoiding truncate-then-write race conditions.
6	 *
7	 * Unlike atomicSessionWrite.atomicWriteJson (sync, takes object), this:
8	 * - Is async (returns Promise)
9	 * - Takes pre-stringified content (caller controls formatting)

... [+1856 chars truncated]

### Assistant | 2026-06-15T17:43:53.086Z

I now have everything I need to verify all claims. Let me note a concurrency concern: `safeWriteSync` (engine, line 645) uses a FIXED tmp path `${targetPath}.tmp`, while the bridge's own `writeAtomic` (line 121) uses a PID-suffixed tmp `${p}.${process.pid}.tmp`. The engine's fixed-tmp-path matters for claim #6. Let me verify the inversion direction one final time by reading the apply-window adjustment and confirm there's no double-counting issue, plus check whether the singleton and the bridge engine could write the same file concurrently.

Let me also double check: in the E2E test, `singletonCalibPersistEnabled` returns false under test, BUT the bridge constructs `new SpeedFeedDeepLearningEngine({ persist: true, stateFile })` explicitly — so persist is forced true regardless of test env. Good, the test exercises real persistence. Let me verify the bias→error→factor sign chain with concrete numbers and confirm there's no warmup gate blocking single-regime learning.

The warmup gate at line 680: `if (history.length < 5) return;` — a feedback batch with only 2 regimes (like the E2E test) writes the segment but `applyWindow` does NOT adjust factors (history < 5). Let me verify this means the persisted segment factor stays at the seeded 1.0 (the test only asserts the KEY exists, not the value). This is an important nuance for the "loop closes" claim.

### Assistant | 2026-06-15T17:43:54.293Z

[tool_use: Read]

### User | 2026-06-15T17:43:56.647Z

[tool_result] 678	  /** Adjust a factor bucket from its history window (>=5 warmup, last-20, clamped + NaN-safe). */
679	  private applyWindow(factors: Record<string, number>, history: FeedbackEntry[]): void {
680	    if (history.length < 5) return;
681	    const recent = history.slice(-20);
682	    for (const key of Object.keys(factors)) {
683	      const errors = recent
684	        .filter(e => e.error_pct[ke
... [+421 chars truncated]

### Assistant | 2026-06-15T17:44:05.136Z

I now have complete verification of all the load-bearing claims. Let me trace the final sign analysis.

**Inversion + direction (claim #1):**
- bias = mean of `(prism − vendor)/vendor × 100`. Bridge: `actual = prism / (1 + bias/100)`.
- For a constant bias b on all cells: actual = prism/(1+b/100) reconstructs vendor exactly. With bias being a *mean of ratios* and prism being the *p50* (not the same prism per cell), it's an approximation — but a reasonable one-point summary. Mathematically: `actual = p50_prism / (1 + mean_ratio)`. This is a first-order reconstruction, not exact, but directionally correct and sound as a single training signal.
- errorPct.speed = `(predicted − actual)/predicted × 100 = (1 − 1/(1+b/100)) × 100 = b/(1+b/100)`. Sign of error = sign of b. If PRISM over-predicts (b>0), error>0.
- applyWindow: `next = factor × (1 − avgError/200)`. error>0 → next < factor → speed factor drops below 1 → `Vc *= kSpeed` brings Vc DOWN toward vendor. **Correct direction.** No sign error.

Let me do a final quick check on whether the bridge's `regime.regime` field (used in jobId) and the test's structure are consistent, and verify there are no other callers of `buildFeedbackArgs`/the exported symbols that could break.

### Assistant | 2026-06-15T17:44:06.544Z

[tool_use: Grep]

### Assistant | 2026-06-15T17:44:07.814Z

[tool_use: Grep]

### User | 2026-06-15T17:44:08.580Z

[tool_result] Found 4 files
scripts\sfc-calib-sync.mjs
scripts\sfc-calib-sync.test.mjs
src\data\sfc-combinatorial-baseline-params.ts
scripts\sfc-closed-loop-cron.mjs

### User | 2026-06-15T17:44:08.917Z

[tool_result] 207:let activeCalibProvider: SfcCalibProvider = defaultCalibProvider;
215:  activeCalibProvider = provider ?? defaultCalibProvider;
223:export function sfcCalibApplyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
2851:    if (sfcCalibApplyEnabled() && !operatingPointUserPinned) {
2853:      const rawFactors = activeCalibProvider(segKey);

### Assistant | 2026-06-15T17:44:11.979Z

There's a consumer I should check — `sfc-closed-loop-cron.mjs` references the bridge. Let me verify the default calib provider reads the singleton (so the apply read-side actually consumes what the bridge writes), and check the cron wiring isn't drifted from the bridge's contract.

### Assistant | 2026-06-15T17:44:12.904Z

[tool_use: Read]

### Assistant | 2026-06-15T17:44:14.507Z

[tool_use: Grep]

### User | 2026-06-15T17:44:24.446Z

[tool_result] 195	
196	/** Hard clamp on a learned calibration multiplier -- a runaway factor can never drive an unsafe Vc/feed. */
197	const CALIB_FACTOR_MIN = 0.4;
198	const CALIB_FACTOR_MAX = 2.5;
199	
200	/** Calibration factors for one regime segment. Injectable so tests get deterministic factors. */
201	type SfcCalibProvider = (segmentKey: string) => { speed: number; feed: number };
202	
203	const default
... [+1329 chars truncated]

### User | 2026-06-15T17:44:25.056Z

[tool_result] 125:  const sweepArgs = ["--out", outRoot, "--workers", String(workers)];
132:    steps.push(await runStep("aggregate", "scripts/sfc-aggregate.mjs", ["--out", outRoot], stepTimeout));
140:    ["triage", "scripts/sfc-divergence-triage.mjs", ["--out", outRoot]],
141:    ["calib-sync", "scripts/sfc-calib-sync.mjs", ["--out", outRoot]],

### Assistant | 2026-06-15T17:45:12.410Z

Fully verified. The read-side `defaultCalibProvider` (line 203-205) calls `speedFeedDeepLearningEngine.getCalibrationFactors(segmentKey)` on the **singleton**, which reads its in-memory factors loaded from `sfc-calib-factors.json` at construction. The bridge writes that same file. So the loop closes ONLY across an MCP-server restart (the singleton loads state at construction, line 569-570) — the bridge run does not hot-reload the live singleton's in-memory map. This is an important coherence nuance but matches the documented "MCP singleton reads" design (loadState on construct).

The cron wires `calib-sync` with `--out` only (no `--state-file`), so it uses the engine's default canonical file — correct, coherent with the singleton.

I have everything needed. Let me compile the verdict.

---

VERDICT: PASS

summary: The bridge correctly closes the SFC self-learning loop. The vendor inversion is directionally sound and pushes calibration the right way (PRISM over-prediction → speed factor < 1 → Vc down toward vendor); the segment key written by the bridge is byte-identical to the apply-read key; idempotency, sentinels, and fail-loud ISO verification all hold. No P0/P1 silent-breakage found. The findings below are P2 nuances worth logging, not blockers.

findings:

- [P2] `sfc-calib-sync.mjs:91,95` + `sfc-combinatorial-baseline-params.ts:241` — **Inversion is a first-order approximation, not an exact reconstruction (sound, no sign error).** `bias_vc_pct = mean((prism_i − vendor_i)/vendor_i × 100)` (a mean-of-ratios over feed-eligible cells), while the bridge feeds `predicted = vc_mpm.p50` (a p50 over the *clean* cells, a different/larger subset) and reconstructs `actual = p50/(1+bias/100)`. Because the bias subset (`fe`, line 205) differs from the envelope subset (`clean`, line 203) and a mean-of-ratios ≠ ratio-of-means, the reconstructed `actual` is a single-point summary of "where vendor sits relative to PRISM," not the true vendor value. Direction is provably correct
... [+6201 chars truncated]
