---
type: "chat-session"
source: "claude-code-cli"
session_id: "5378a15b-ade4-4ecb-9cb2-45f2dfeea317"
title: "3-of-3 scrutiny ARM B on the cumulative session diff for slot oscar (SFC closed-"
date: "2026-06-12"
first_ts: "2026-06-12T15:44:37.807Z"
last_ts: "2026-06-12T15:57:09.556Z"
cwd: "H:\\prism-slot-oscar"
messages: 66
user_msgs: 24
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/agent-a7578102618a57177.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# 3-of-3 scrutiny ARM B on the cumulative session diff for slot oscar (SFC closed-

> **claude-code-cli** | 2026-06-12 | 66 msgs (24 user / 42 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/agent-a7578102618a57177.jsonl`

## Transcript

### User | 2026-06-12T15:44:37.807Z

3-of-3 scrutiny ARM B on the cumulative session diff for slot oscar (SFC closed-loop). Weight toward TEST INTEGRITY, dispatcher/consumer WIRING completeness, and INLINED-CONSTANT detection (do NOT assume arm A caught these). See the diff:

  cd /h/prism-slot-oscar && git diff HEAD~5..HEAD -- 'mcp-server/**'

5 commits: U-OSC9-CALIB-PERSIST (persistence) + U-OSC9-CALIB-APPLY-WIRE keystone (STEP 18F calib apply, flag-gated) + U-CSFH-09-401-GAUNTLET (test) + U-CSFH-11-DRILLING-SEGREGATE (registry) + doc.

CHECK specifically:
1. TEST INTEGRITY (R9): are the new assertions in the 4 test files (SpeedFeedDeepLearningEngine.calib-persist.test.ts, UltimateSpeedFeedEngine.calib-apply.test.ts, UltimateSpeedFeedEngine.variability.test.ts GROUP 14, combinatorial-baseline-params.test.ts) load-bearing? Any toBeDefined()-style stubs? Any assertion that would pass on broken behavior? The byte-identical anti-regression (calib-apply T1/T2) and the persistence round-trip (calib-persist T1) are the load-bearing ones — verify they're real.
2. INLINED CONSTANTS: confirm NO kc1.1/Taylor/material physics constants were inlined in the engine changes (only named calibration clamp bounds CALIB_FACTOR_MIN/MAX and SEG_FACTOR_MIN/MAX are acceptable).
3. WIRING: the keystone wires SpeedFeedDeepLearningEngine into UltimateSpeedFeedEngine (the loop closure). Confirm the import is correct + no circular dep. Confirm setSfcCalibrationProvider/sfcCalibApplyEnabled are exported. (The persistence singleton is gated inert under test.)
4. Verification was via tsx harness (no vitest in the slot worktree) + isolated tsc — is that disclosed honestly and is it adequate?

Report P0/P1 with file:line and a final verdict line exactly as **PASS** or **FAIL**.

### Assistant | 2026-06-12T15:44:42.808Z

I'll review the cumulative session diff for slot oscar, weighting toward test integrity, wiring completeness, and inlined-constant detection. Let me start by examining the diff.

### Assistant | 2026-06-12T15:44:43.773Z

[tool_use: Bash]

### User | 2026-06-12T15:44:44.947Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-12T15:44:47.829Z

[tool_use: Bash]

### Assistant | 2026-06-12T15:44:48.624Z

[tool_use: Bash]

### User | 2026-06-12T15:44:52.496Z

[tool_result] 2befa2bb80dfb28146e6142f4279f67a136e904b [oscar] [OSCAR-SFC-9AXIS-MS0]/U-CSFH-DOC-REFLECT: CSFH 13/13 COMPLETE -- closed loop shipped
f491d5ee8ab2460235e71c0e67116bf762d81102 [oscar] [OSCAR-SFC-9AXIS-MS0]/U-CSFH-11-DRILLING-SEGREGATE: data-driven non-calibratable-regime guard (CSFH unit 13/13 -- COMPLETE)
9a51a1678091f3f7412e702155ed91aa5319488a [oscar] [OSCAR-SFC-9AXIS-MS0]/U-CSFH-09-401-GAUNTLET
... [+361 chars truncated]

### User | 2026-06-12T15:45:02.575Z

[tool_result]  ...eedFeedDeepLearningEngine.calib-persist.test.ts | 257 +++++++++++++++++++++
 .../UltimateSpeedFeedEngine.calib-apply.test.ts    | 154 ++++++++++++
 .../UltimateSpeedFeedEngine.variability.test.ts    |  46 ++++
 .../sfc/combinatorial-baseline-params.test.ts      |  27 ++-
 .../src/data/sfc-combinatorial-baseline-params.ts  |  40 +++-
 .../src/engines/SpeedFeedDeepLearningEngine.ts     | 176 +++
... [+133 chars truncated]

### Assistant | 2026-06-12T15:45:04.833Z

Let me read the full diff for the engine and test files. I'll start with the engine changes which are the load-bearing surfaces.

### Assistant | 2026-06-12T15:45:05.683Z

[tool_use: Bash]

### User | 2026-06-12T15:46:03.392Z

[tool_result] diff --git a/mcp-server/src/engines/UltimateSpeedFeedEngine.ts b/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
index cbaaac9e0e..5844122bf6 100644
--- a/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
+++ b/mcp-server/src/engines/UltimateSpeedFeedEngine.ts
@@ -57,6 +57,12 @@ import { ToolWearPrediction } from "../algorithms/ToolWearPrediction.js";
 import { SandvikTurningForceModel } from ".
... [+9113 chars truncated]

### Assistant | 2026-06-12T15:46:06.248Z

The keystone engine diff is clear. Now let me read the DeepLearningEngine changes (persistence + the wiring exports it provides).

### Assistant | 2026-06-12T15:46:07.344Z

[tool_use: Bash]

### User | 2026-06-12T15:46:29.570Z

[tool_result] diff --git a/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts b/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
index d23bea91f2..0fa06ed539 100644
--- a/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
+++ b/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
@@ -61,6 +61,16 @@ import {
 // discarded before the AI-ladder sink." This import + the captureRecommendation
 // method 
... [+10773 chars truncated]

### Assistant | 2026-06-12T15:46:34.031Z

Now I need to verify the critical wiring claims: (1) `composeSegmentKey` and `getCalibrationFactors` exist and are exported; (2) the WRITE-key (recordFeedback) and READ-key (apply) coherence claim. Let me check the existing code (not just the diff) for these symbols, plus confirm `SEG_FACTOR_MIN/MAX`, `roundSig`, and verify there's no circular dependency issue.

### Assistant | 2026-06-12T15:46:36.809Z

[tool_use: Bash]

### User | 2026-06-12T15:46:58.489Z

[tool_result] /h/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts:88:const SEGMENT_GLOBAL_KEY = "_|_|_";
/h/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts:89:const SEG_FACTOR_MIN = 0.5;
/h/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts:90:const SEG_FACTOR_MAX = 2.0;
/h/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts:437
... [+3374 chars truncated]

### Assistant | 2026-06-12T15:47:02.740Z

Good. The exports and clamp constants are confirmed. Now I need to verify the critical coherence claim: the apply READ-key must equal the recordFeedback WRITE-key. The keystone composes `composeSegmentKey({ material: input.material, regime: cutType })` — only material + regime, no toolMaterial. Let me check how recordFeedback / capture composes its key, and check `getCalibrationFactors` return shape (the apply reads `.speed` and `.feed`).

### Assistant | 2026-06-12T15:47:03.725Z

[tool_use: Read]

### User | 2026-06-12T15:47:12.236Z

[tool_result] 444	export function composeSegmentKey(ctx: { material?: string; toolMaterial?: string; regime?: string } | undefined): string {
445	  if (!ctx) return SEGMENT_GLOBAL_KEY;
446	  const iso = ctx.material ? resolveISOGroup(ctx.material) : "_";
447	  const tool = canonToolType(ctx.toolMaterial);
448	  const regime = canonRegime(ctx.regime);
449	  return `${iso}|${tool}|${regime}`;
450	}
451	
452	/** G
... [+3081 chars truncated]

### Assistant | 2026-06-12T15:47:21.233Z

I see a coherence concern. The keystone calls `composeSegmentKey({ material: input.material, regime: cutType })` — `toolMaterial` is undefined, so it canonicalizes to whatever `canonToolType(undefined)` yields. The WRITE-side (recordFeedback via captureSFC) must use the same key. Let me trace the WRITE-key path and verify `getCalibrationFactors` returns `.speed`/`.feed` keys. Also note the apply READ at line 803/889 inside the DL engine itself composes the same `{material, regime: cutType}` shape (no toolMaterial), which is a good sign of consistency. Let me confirm.

### Assistant | 2026-06-12T15:47:22.205Z

[tool_use: Read]

### User | 2026-06-12T15:47:34.959Z

[tool_result] 644	      };
645	      safeWriteSync(this.stateFile, JSON.stringify(state, null, 2));
646	    } catch (err) {
647	      log.warn(`[SFC-CALIB-PERSIST] failed to persist ${this.stateFile}: ${(err as Error)?.message}`);
648	    }
649	  }
650	
651	  recordFeedback(entry: FeedbackEntry): void {
652	    this.feedbackHistory.push(entry);
653	    const segKey = entry.segment_key ?? SEGMENT_GLOBAL_KEY;
654
... [+2605 chars truncated]

### Assistant | 2026-06-12T15:47:39.473Z

[tool_use: Read]

### Assistant | 2026-06-12T15:47:39.989Z

[tool_use: Read]

### User | 2026-06-12T15:47:48.787Z

[tool_result] 703	    for (const key of Object.keys(this.globalFactors)) {
704	      const v = seg[key];
705	      out[key] = typeof v === "number" && Number.isFinite(v) ? v : (this.globalFactors[key] ?? 1.0);
706	    }
707	    return out;
708	  }
709	
710	  getStats(): { total_feedback: number; calibrated: boolean; avg_errors: Record<string, number>; segments: { count: number; keys: string[] } } {
711	    cons
... [+407 chars truncated]

### User | 2026-06-12T15:47:49.248Z

[tool_result] 520	const MAX_PERSISTED_HISTORY = 5000;
521	
522	/**
523	 * Default state-file: `mcp-server/data/state/sfc-calib-factors.json`, resolved from this module so it
524	 * works under both `tsx` (src/) and the esbuild bundle (dist/) -- `engineDir/../..` is the mcp-server
525	 * root in both layouts (`src/engines/X` and `dist/engines/X` both sit two levels under mcp-server/).
526	 */
527	function defaul
... [+1481 chars truncated]

### Assistant | 2026-06-12T15:47:55.687Z

Confirmed. `globalFactors` has keys `speed`, `feed`, `tool_life`, `surface_finish`, all defaulting to 1.0. `getCalibrationFactors` returns those keys, so the keystone's `f.speed` / `f.feed` reads are valid (and default to 1.0 when not learned — guaranteeing byte-identical pristine output when no learning has occurred). The WRITE-key in recordFeedback is `entry.segment_key`, which the captureSFC middleware must populate.

The coherence claim ("apply READ-key == DL recordFeedback WRITE-key") hinges on the captureSFC middleware composing `entry.segment_key` from the same `{material, regime}` the apply uses. This is a cross-module claim — let me verify the WRITE-side composes its key the same way.

### Assistant | 2026-06-12T15:47:57.299Z

[tool_use: Bash]

### User | 2026-06-12T15:48:33.310Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-12T15:48:36.163Z

No output — let me check where recordFeedback is called from with a segment_key and how that key is composed, to verify the WRITE/READ coherence is real and not just asserted in a comment.

### Assistant | 2026-06-12T15:48:37.570Z

[tool_use: Bash]

### User | 2026-06-12T15:51:22.934Z

[tool_result] /h/prism-slot-oscar/mcp-server/src/data/wedm-engine-registry.ts
/h/prism-slot-oscar/mcp-server/src/engines/AIExtractionReasonerEngine.ts
/h/prism-slot-oscar/mcp-server/src/engines/ElectrodeDeepLearningEngine.ts
/h/prism-slot-oscar/mcp-server/src/engines/LatheAGIContinuousLearningEngine.ts
/h/prism-slot-oscar/mcp-server/src/engines/MultiSignalAutoRollbackEngine.ts
/h/prism-slot-oscar/mcp-server/src
... [+2042 chars truncated]

### Assistant | 2026-06-12T15:51:27.099Z

This is the key coherence finding. The public `recordFeedback` overload (line 1422 region, and the dispatcher caller at calcDispatcher.ts:9530) accepts a `ctx` of `{material, toolMaterial, regime}`. Let me read the public recordFeedback wrapper to see how it composes the segment_key for the WRITE side, and compare against the keystone's READ key which uses only `{material, regime}` (no toolMaterial).

### Assistant | 2026-06-12T15:51:27.702Z

[tool_use: Read]

### User | 2026-06-12T15:51:41.911Z

[tool_result] 1400	
1401	  recordFeedback(
1402	    jobId: string,
1403	    predicted: { speed_mpm: number; feed_mm: number; tool_life_min: number; Ra_um: number },
1404	    actual: { speed_mpm?: number; feed_mm?: number; tool_life_min?: number; Ra_um?: number },
1405	    context?: { material?: string; toolMaterial?: string; regime?: CutType; operation?: Operation }
1406	  ): void {
1407	    const errorPct: Rec
... [+2711 chars truncated]

### Assistant | 2026-06-12T15:51:51.037Z

This is the decisive verification. The WRITE-side at line 1432 composes `composeSegmentKey({ material: context.material, regime: context.regime })` — exactly the same `{material, regime}` shape (tool-agnostic, toolMaterial omitted) that the keystone READ-side at UltimateSpeedFeedEngine.ts uses. **The coherence claim is real, not just asserted.** The READ-key == WRITE-key invariant holds: both resolve `iso = resolveISOGroup(material)`, `tool = canonToolType(undefined)`, `regime = canonRegime(regime/cutType)`.

One subtlety: the keystone passes `regime: cutType` and the WRITE passes `regime: context.regime`. Both flow through `canonRegime`. I need to confirm `cutType` (the keystone's variable) and the DL engine's `CutType` regime use the same canonicalization domain. The keystone's `cutType` comes from UltimateSpeedFeedEngine. Let me check the `canonRegime` function and what `cutType` values the keystone produces.

### Assistant | 2026-06-12T15:51:52.993Z

[tool_use: Bash]

### User | 2026-06-12T15:52:48.329Z

[tool_result] 410:function resolveISOGroup(material: string): string {
422:function canonToolType(toolMaterial: string | undefined): string {
429:function canonRegime(regime: string | undefined): string {
---cutType in Ultimate---
2049:    const cutType = input.cut_type || inferCutType(input.optimize_for);
2065:    const cornerRadius = input.corner_radius_mm || inferCornerRadius(Dc, operation, cutType);
2074:  
... [+681 chars truncated]

### Assistant | 2026-06-12T15:52:51.015Z

[tool_use: Read]

### User | 2026-06-12T15:53:01.692Z

[tool_result] 429	function canonRegime(regime: string | undefined): string {
430	  if (!regime) return "_";
431	  return (CUT_TYPES as string[]).includes(regime) ? regime : "_";
432	}
433	
434	/**
435	 * Compose the canonical L1 calibration segment key: `${iso}|${tool}|${regime}`.
436	 * Unknown/absent components degrade to "_" (the UNKNOWN bucket) - a typo\'d tool or regime
437	 * can NEVER silently land in a 
... [+484 chars truncated]

### Assistant | 2026-06-12T15:53:07.175Z

`canonRegime` accepts any value in `CUT_TYPES` (roughing/semi_finishing/finishing), else "_". The keystone's `cutType = input.cut_type || inferCutType(...)` produces a `CutType` from the same domain, so READ and WRITE land in the same regime bucket. Coherence is sound.

Now let me examine the test files for integrity. Start with the two load-bearing ones: calib-apply (byte-identical anti-regression T1/T2) and calib-persist (round-trip T1).

### Assistant | 2026-06-12T15:53:07.726Z

[tool_use: Read]

### User | 2026-06-12T15:53:10.096Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\UltimateSpeedFeedEngine.calib-apply.test.ts' was already read 4m ago in this session and is unchanged (mtime 1781274524623). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state fo
... [+36 chars truncated]

### Assistant | 2026-06-12T15:53:12.797Z

The read-once guard says I already have it. I don't see it in my context, so let me get it via the diff which is the authoritative source for what these commits added.

### Assistant | 2026-06-12T15:53:13.990Z

[tool_use: Bash]

### User | 2026-06-12T15:53:56.931Z

[tool_result] diff --git a/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-apply.test.ts b/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-apply.test.ts
new file mode 100644
index 0000000000..3b73665117
--- /dev/null
+++ b/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-apply.test.ts
@@ -0,0 +1,154 @@
+/**
+ * OSCAR-SFC-9AXIS-MS0 / U-OSC9-CALIB-APPLY-WIRE (slot:oscar, 2026-06-12) -- CSFH un
... [+8479 chars truncated]

### Assistant | 2026-06-12T15:54:08.236Z

This test file is genuinely strong. Assessing each:

- **T1 (anti-regression, OFF)**: `expect(b).toEqual(a)` proves determinism; `calibTag(a) === "ABSENT"` and `calibWarnCount(a) === 0` are concrete, load-bearing. Real.
- **T2 (anti-regression, ON+identity)**: `expect(onIdentity).toEqual(off)` — byte-identical to flag-OFF. This is the keystone safety proof and it's real: if the apply block leaked any perturbation under identity factors, this fails.
- **T3 (apply)**: scales Vc×0.9, fz×1.1, recomputes feed_rate and mrr, exact factor provenance, exactly 1 warning. Load-bearing — would fail if the math were wrong.
- **T4 (analytics untouched)**: `forces/power/thermal/tool_life` deep-equal between OFF and ON-with-non-identity. This is the critical "calibration only touches the operating point, not the derived physics" invariant. Real.
- **T5 (clamp)**: 3.0→2.5, 0.2→0.4, clamped flag, Vc reflects clamped 2.5. Real.
- **T6 (RPM ceiling)**: spindle_rpm ≤ 4000, re-cap warning present. Real.
- **T7 (user pin)**: pinned Vc untouched, calibration ABSENT. Real.
- **T8 (flag predicate)**: exact 4-outcome string `"true,true,false,false"`. Real.
- **T9 (adversarial NaN/negative)**: NaN/−2 → identity → byte-identical. Real.

No `toBeDefined()` stubs, no presence-only matchers, no assertion that would pass on broken behavior. This is exemplary R9 compliance. 

One small note on T3: `feed_rate` uses `toBeCloseTo(..., -1)` (tolerance ±5) and `mrr` uses `toBeCloseTo(..., 0)` (±0.5). These are loose but defensible given rounding in the recompute path — and T2/T4 lock down the exactness elsewhere. Not a finding.

Now the calib-persist test (round-trip T1 is the load-bearing one).

### Assistant | 2026-06-12T15:54:09.349Z

[tool_use: Bash]

### User | 2026-06-12T15:54:31.901Z

[tool_result] diff --git a/mcp-server/src/__tests__/SpeedFeedDeepLearningEngine.calib-persist.test.ts b/mcp-server/src/__tests__/SpeedFeedDeepLearningEngine.calib-persist.test.ts
new file mode 100644
index 0000000000..02b3e29a5c
--- /dev/null
+++ b/mcp-server/src/__tests__/SpeedFeedDeepLearningEngine.calib-persist.test.ts
@@ -0,0 +1,257 @@
+/**
+ * OSCAR-SFC-9AXIS-MS0 / U-OSC9-CALIB-PERSIST (slot:oscar, 2026-06
... [+13036 chars truncated]

### Assistant | 2026-06-12T15:54:44.532Z

(The error-triage system-reminder is a generic hook artifact keyed on the word "timeout" in the test file's `T = 90000` comment — it is not an actual test failure. No test was run here.)

The calib-persist test is also strong:

- **T1 (round-trip, load-bearing)**: drives 8 feedbacks → asserts `aFactors.speed ≈ 0.95^4` (hand-computed oracle from the documented `(1 - avgError/200)` damping — this is the R9 "fails if restore is lossy OR damping changes" property), asserts file exists, then instance B over the same file restores `aFactors` exactly via `toEqual`. This is a real restart simulant, not a stub. Load-bearing verified.
- **T2 (segment maturity)**: proves segment ≠ global divergence survives restart, and explicitly notes it fails if `segmentSampleCount` is not persisted (count would default 0 < 5 → collapse to global). Excellent — this catches a real, subtle persistence bug.
- **T3 (hermetic-off)**: pre-seeds a file, constructs with persist omitted, asserts `.speed === 1.0` (seed ignored) AND file byte-unchanged after feedback. Concrete.
- **T4 (schema gate)**: schemaVersion `0.0.0` → fresh defaults, no throw.
- **T5 (corrupt JSON)**: unparseable → fresh, no throw, then can still learn + re-persist.
- **T6 (clamp on load)**: 99→2.0, 0.01→0.5, in-range untouched, NaN→1.0, negative segment→floor. All concrete.
- **T7 (on-disk shape)**: schemaVersion, key set, in-bounds, history length 8.
- **T8 (over-cap)**: 6000 rows → restored as 5000. Validates `MAX_PERSISTED_HISTORY` cap on both ends.
- **T9 (gating)**: 6 env permutations, all concrete booleans.

No stubs, no presence-only matchers. The hand-computed `0.95^4` oracle is the gold standard for intent-verifying tests.

Now the variability GROUP 14 and the combinatorial-baseline-params test + the drilling-segregate data file.

### Assistant | 2026-06-12T15:54:46.158Z

[tool_use: Bash]

### User | 2026-06-12T15:55:00.565Z

[tool_result] diff --git a/mcp-server/src/__tests__/UltimateSpeedFeedEngine.variability.test.ts b/mcp-server/src/__tests__/UltimateSpeedFeedEngine.variability.test.ts
index 910ba335ad..75c34a6959 100644
--- a/mcp-server/src/__tests__/UltimateSpeedFeedEngine.variability.test.ts
+++ b/mcp-server/src/__tests__/UltimateSpeedFeedEngine.variability.test.ts
@@ -506,4 +506,50 @@ describe("UltimateSpeedFeedEngine — Max 
... [+6805 chars truncated]

### Assistant | 2026-06-12T15:55:09.056Z

The variability GROUP 14 and combinatorial test changes are sound. Notable integrity points:

- **GROUP 14**: The comment block is unusually honest (R12 compliance) — it explicitly states the "401-assertion bar was structurally met before this group" and the genuine deliverable is the previously-uncovered ISO×operation cross-product. The assertions are physics-law oracles (Vc-RPM identity, resultant-force identity, canonical units) — load-bearing. The two `it.todo()` entries are honestly tracked real gaps (turning Dc-vs-Dw, tapping torque model), not faked skips. This is exemplary — `it.todo` documents a known gap rather than `.skip`-ing a failing assertion.
- **combinatorial-baseline-params**: The drilling→tapping swap is consistent with the data-file change (U-CSFH-11). The new "drilling is NO LONGER segregated" test asserts `status === "baseline"` and `vc_mpm.n === 6` — concrete and load-bearing. The tapping segregation test now asserts `reason` contains both `"tapping"` AND `"pitch-locked"` — the latter guards against a stale hardcoded reason string.

I need to verify the data-file change actually backs these test claims (drilling now eligible, tapping segregated with "pitch-locked" reason). Let me read the data file diff.

### Assistant | 2026-06-12T15:55:09.915Z

[tool_use: Bash]

### User | 2026-06-12T15:55:21.267Z

[tool_result] diff --git a/mcp-server/src/data/sfc-combinatorial-baseline-params.ts b/mcp-server/src/data/sfc-combinatorial-baseline-params.ts
index a729458267..037f0b00c8 100644
--- a/mcp-server/src/data/sfc-combinatorial-baseline-params.ts
+++ b/mcp-server/src/data/sfc-combinatorial-baseline-params.ts
@@ -2,7 +2,7 @@
  * SFC combinatorial BASELINE GENERIC PARAMS -- the moat. Folds the COMPARE report
  * (U-CS
... [+5881 chars truncated]

### Assistant | 2026-06-12T15:55:31.036Z

The data file change fully backs the test assertions:

- `NON_CALIBRATABLE_OPERATIONS` registry: `tapping` reason string contains `"pitch-locked"` (the test's `r.reason).toContain("pitch-locked")` is real and load-bearing — it reads the actual reason from the registry, not a hardcode).
- `DEFAULT_SEGREGATE_OPERATIONS` = keys of registry = `["tapping"]`, drilling removed. The "drilling is NO LONGER segregated → status baseline" test is correctly backed.
- The reason is now data-driven (`NON_CALIBRATABLE_OPERATIONS[g.op] ?? fallback`), so the test asserting the operation-specific reason guards against the stale hardcode that was removed (it previously named drilling).

One R12/honesty point worth noting (not a defect): the claim "U-OSC9-DRILL-CHIPGEOM fixed its chip geometry (commit 81a3eb72c8, S(x)=0.92)" is cited but is a prior-unit commit outside this 5-commit window. The data-file comment relies on that fix being real. This is a cross-unit dependency; the drilling-eligible test only proves the *segregation registry* no longer lists drilling — it does NOT re-prove the drilling physics is actually sound. That's acceptable scoping (the test verifies the registry behavior, which is what this unit changed), but the comment makes a correctness claim about drilling physics that this unit's tests don't re-verify. Minor — the registry behavior is correctly tested.

Now let me address checks 2 (inlined constants), 3 (circular dep), and 4 (verification disclosure). First, scan for inlined physics constants in the engine changes and confirm no circular dependency between the two engines.

### Assistant | 2026-06-12T15:55:32.939Z

[tool_use: Bash]

### User | 2026-06-12T15:55:50.447Z

[tool_result] NO_IMPORT_OF_ULTIMATE_IN_DL (good — no circular dep)

### Assistant | 2026-06-12T15:55:55.588Z

No circular dependency — `SpeedFeedDeepLearningEngine` does not import `UltimateSpeedFeedEngine`. The keystone import is one-directional (Ultimate → DL). 

Now the inlined-constant check. The keystone diff introduced numeric literals — I need to confirm none are physics constants (kc1.1/Taylor/material). The numerics in the apply block: `0.4`/`2.5` (named CALIB_FACTOR_MIN/MAX), `1.0` (identity), `1000` (π·D·N/1000 unit conversion mm→m, standard), `Math.PI`, `Math.round`. Let me verify there are no Kienzle/Taylor/kc material values introduced and check the DL persist diff's `0.5`/`2.0` are the named SEG_FACTOR bounds.

### Assistant | 2026-06-12T15:55:58.079Z

[tool_use: Bash]

### User | 2026-06-12T15:56:26.071Z

[tool_result]       8 1.0
      3 2.5
      3 0.4

### Assistant | 2026-06-12T15:56:33.649Z

Decisive inlined-constant result. The only decimal literals added across both engine files are:
- `1.0` (×8) — identity factor / clamp neutral, not a physics constant.
- `2.5` (×3) — `CALIB_FACTOR_MAX` (named, declared once at line ~189, used in clamp + test).
- `0.4` (×3) — `CALIB_FACTOR_MIN` (named).

**Zero** kc1.1, Taylor (C/n), Johnson-Cook, or material constants were inlined. The `0.5`/`2.0` SEG_FACTOR bounds in the DL diff reference the pre-existing named `SEG_FACTOR_MIN`/`SEG_FACTOR_MAX` constants (lines 89-90, not introduced by these commits — they were already there). The `1000` and `Math.PI` in the recompute mirror are standard mm→m unit conversion and geometry, correctly mirroring STEP 8/STEP 10 of the existing code. Inlined-constant check: **PASS**.

Now the final check — verification disclosure honesty. The task states verification was via tsx harness (no vitest in the slot worktree) + isolated tsc. Let me confirm the commit messages disclose this honestly and that the test files are genuinely vitest-shaped (so they WILL run in CI even though they couldn't run in the slot worktree).

### Assistant | 2026-06-12T15:56:36.019Z

[tool_use: Bash]

### User | 2026-06-12T15:57:07.959Z

[tool_result] SAFETY INVARIANTS (all four verified):
safety-physics oracle gate + physics-review-agent PASS + independent reviewer PASS. 9 vitest tests +
24 tsx oracles PASS + tsc clean. No inlined physics constants (only named clamp bounds). No circular import.
===PERSIST COMMIT BODY===
 - singleton persist gated INERT under the test runner (VITEST/NODE_ENV=test) + PRISM_SFC_CALIB_PERSIST
9 vitest tests (T1-T9
... [+182 chars truncated]

### Assistant | 2026-06-12T15:57:09.556Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
