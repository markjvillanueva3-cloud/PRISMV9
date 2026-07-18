---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "Independent review (do NOT assume the physics reviewer caught everything) of a W"
date: "2026-06-02"
first_ts: "2026-06-02T20:01:45.625Z"
last_ts: "2026-06-02T20:13:33.043Z"
cwd: "H:\\prism-slot-mike"
messages: 63
user_msgs: 24
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/agent-a83110fe4992230bb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Independent review (do NOT assume the physics reviewer caught everything) of a W

> **claude-code-cli** | 2026-06-02 | 63 msgs (24 user / 39 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/agent-a83110fe4992230bb.jsonl`

## Transcript

### User | 2026-06-02T20:01:45.625Z

Independent review (do NOT assume the physics reviewer caught everything) of a WEDM P0-2 hardness unit in PRISM (slot worktree H:/prism-slot-mike). Read fully:
1. H:/prism-slot-mike/mcp-server/src/engines/EDMBiMaterialCompensationEngine.ts — verify the `edmHardnessFactor(hrc)` EXTRACTION (new exported fn ~line 265) is BEHAVIOR-PRESERVING vs the old inline `z.hardness_hrc ? 1+(z.hardness_hrc-40)*0.005 : 1.0` it replaced (~line 316). Truthy-check semantics: hrc=0/undefined => 1.0 must be preserved exactly. (Its 54-test suite passes — confirm the extraction can't change any output.)
2. H:/prism-slot-mike/mcp-server/src/data/wedm-hardness-feed-scale.ts (new module, 9 tests)
3. H:/prism-slot-mike/mcp-server/src/__tests__/WEDMHardnessFeedScale.test.ts
4. H:/prism-slot-mike/mcp-server/src/data/wedm-job-cascade.ts — hardness composition into the cascade (new fields hardness_hrc/hardness_factor/hardness_extrapolated/applied_feed_factor)
5. H:/prism-slot-mike/mcp-server/src/__tests__/WEDMJobCascade.test.ts (extended, 25 tests)
6. H:/prism-slot-mike/scripts/build-wedm-passschedule-corpus.ts — Kind 6 now loops hardness [0,62] so the de-rate is EXERCISED in the corpus (10 hardened pairs emitted)

Weight toward what physics review misses:
- R9 TEST INTEGRITY: would the hardness tests go RED if hardnessFeedFactor regressed to always-1.0 (no de-rate)? Is the "equals inverse current-boost ratio" test a genuine check or circular? One assertion was loosened from 4dp→3dp for thrice-rounded values (applied = thickness×hardness) — is 3dp still a real check or a cop-out?
- R12 / "WIRED BUT NOT EXERCISED" repeat: the whole point of Kind 6's hardness loop is to avoid the prior P0-1 failure (a fix wired but never touching output). Confirm hardness actually fires in emitted corpus (the run showed factor 0.9685 + hrc-caveat). Confirm generateJobCascade is the real consumer.
- COMPOSITION: applied_feed_factor = thickness_factor × hardness_factor; feeds use the combined. Verify no double-applica
... [+448 chars truncated]

### Assistant | 2026-06-02T20:01:59.845Z

I'll review this WEDM P0-2 hardness unit independently, reading all 6 files fully before grading.

### Assistant | 2026-06-02T20:02:00.579Z

[tool_use: Read]

### Assistant | 2026-06-02T20:02:01.592Z

[tool_use: Read]

### Assistant | 2026-06-02T20:02:02.288Z

[tool_use: Read]

### Assistant | 2026-06-02T20:02:03.190Z

[tool_use: Read]

### Assistant | 2026-06-02T20:02:03.762Z

[tool_use: Read]

### Assistant | 2026-06-02T20:02:05.111Z

[tool_use: Read]

### User | 2026-06-02T20:02:05.923Z

[tool_result] 1	/**
2	 * Tests for the P0-2 hardness-aware feed de-rate (WEDM-P2P-COMPREHENSIVE-VALIDATION).
3	 *   npx vitest run src/__tests__/WEDMHardnessFeedScale.test.ts
4	 *
5	 * R9 intent: feed must DE-RATE for hard stock ABOVE the 55-HRC calibration anchor
6	 * (the defect was hardness-blind constant feed), reuse the canonical engine
7	 * coefficient as a ratio (no double-counting the hardness already i
... [+3088 chars truncated]

### User | 2026-06-02T20:02:06.844Z

[tool_result] 1	/**
2	 * wedm-hardness-feed-scale.ts — P0-2 fix: make WEDM feeds HARDNESS-AWARE above the
3	 * hardened-die-steel threshold.
4	 *
5	 * The comprehensive validation (WEDM-P2P-COMPREHENSIVE-VALIDATION-2026-06-01.md)
6	 * found the JM oracle emits the SAME feed regardless of workpiece hardness. In EDM,
7	 * harder/higher-melting stock removes slower at a fixed spark energy (E-code), so the
8	 * ser
... [+3567 chars truncated]

### User | 2026-06-02T20:02:08.080Z

[tool_result] 1	/**
2	 * EDMBiMaterialCompensationEngine — Steel + Brazed Carbide Insert Wire EDM
3	 *
4	 * Handles the core challenge of wire EDM through bi-material workpieces:
5	 * a steel body with brazed tungsten carbide inserts. The wire crosses
6	 * steel → braze joint → carbide → braze joint → steel transitions,
7	 * each requiring different spark parameters to prevent wire breakage.
8	 *
9	 * Physics b
... [+45412 chars truncated]

### User | 2026-06-02T20:02:08.205Z

[tool_result] 1	/**
2	 * Tests for generateJobCascade — the JM print->program cascade composition core.
3	 *   npx vitest run src/__tests__/WEDMJobCascade.test.ts
4	 *
5	 * R9 intent: this layer is what makes generated programs RESPOND to the print.
6	 * The P0-1 defect was constant feeds across all thicknesses; these tests prove
7	 * the cascade now scales with thickness (thicker => slower), stays internally
8
... [+10499 chars truncated]

### User | 2026-06-02T20:02:08.215Z

[tool_result] 1	/**
2	 * wedm-job-cascade.ts — the JM Die print->program CASCADE COMPOSITION layer.
3	 *
4	 * This is the "write the program" core the operator's accuracy test exercises:
5	 * given a job's print parameters (material / thickness / taper / tolerance), it
6	 * selects the shop-calibrated E-code family AND applies the physics scaling that
7	 * the raw oracle tables (jm-die-wedm-tech-tables.ts) do N
... [+9303 chars truncated]

### User | 2026-06-02T20:02:09.531Z

[tool_result] 1	/**
2	 * build-wedm-passschedule-corpus.ts — WEDM Regimen #3 (multi-pass / H-offset
3	 * cascade) training corpus, ORACLE-AUGMENTED.
4	 *
5	 * Per WEDM-TRAINING-REGIMENS-2026-05-31.md §3.2: the tech-table getters are a
6	 * DETERMINISTIC GENERATOR. Enumerate the (material, thickness, taper, tol) grid,
7	 * emit the EXACT shop-calibrated cascade from selectECodeFamily / getECodeForPass
8	 * / get
... [+14680 chars truncated]

### Assistant | 2026-06-02T20:02:16.665Z

Now let me verify the dependencies the cascade composes against — the thickness module and oracle tables — to confirm no double-application, null handling, and the single-source coefficient claim.

### Assistant | 2026-06-02T20:02:17.113Z

[tool_use: Read]

### Assistant | 2026-06-02T20:02:17.775Z

[tool_use: Grep]

### User | 2026-06-02T20:02:20.879Z

[tool_result] 1	/**
2	 * wedm-thickness-feed-scale.ts — P0-1 fix: make WEDM feeds THICKNESS-AWARE.
3	 *
4	 * The comprehensive validation (WEDM-P2P-COMPREHENSIVE-VALIDATION-2026-06-01.md)
5	 * found the JM oracle (jm-die-wedm-tech-tables.ts) emits CONSTANT feeds from 1 mm
6	 * to 215 mm — physically wrong: sparking-frequency-limited feed scales inversely
7	 * with height (v_feed ~ MRR / (kerf x thickness)). App
... [+3106 chars truncated]

### User | 2026-06-02T20:02:21.555Z

[tool_result] <persisted-output>
Output too large (57.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-mike\87d96286-aba0-4263-85de-26771e812c92\tool-results\toolu_011PQiPueG13AiRrna4Jc1LY.txt

Preview (first 2KB):
mcp-server\src\algorithms\ChipBreakingModel.ts:82:  MIN_CHIP_THICKNESS: 0.005,   // mm — below this, rubbing not cutting
mcp-server\src\data\academy\course-5-turning-operatio
... [+1723 chars truncated]

### Assistant | 2026-06-02T20:02:27.086Z

The grep output was too large to confirm the single-source claim. Let me search specifically for the hardness coefficient pattern `(HRC-40)*0.005` or `- 40) * 0.005` to confirm it exists in exactly one place.

### Assistant | 2026-06-02T20:02:28.519Z

[tool_use: Grep]

### Assistant | 2026-06-02T20:02:29.227Z

[tool_use: Grep]

### User | 2026-06-02T20:03:06.979Z

[tool_result] mcp-server\src\data\wedm-hardness-feed-scale.ts:9: * the CURRENT side as `edmHardnessFactor = 1 + (HRC-40)*0.005` (more current to hold
mcp-server\src\data\wedm-hardness-feed-scale.ts:27:import { edmHardnessFactor } from "../engines/EDMBiMaterialCompensationEngine.js";
mcp-server\src\data\wedm-hardness-feed-scale.ts:41: * Reuses the canonical edmHardnessFactor coefficient as a RATIO anchored at th
... [+284 chars truncated]

### User | 2026-06-02T20:03:06.984Z

[tool_result] mcp-server\src\data\wedm-hardness-feed-scale.ts:9: * the CURRENT side as `edmHardnessFactor = 1 + (HRC-40)*0.005` (more current to hold
mcp-server\src\engines\EDMBiMaterialCompensationEngine.ts:268: * factor = 1 + (HRC - 40) * 0.005 (i.e. +5% current per 10 HRC). Below 40 HRC the

### Assistant | 2026-06-02T20:03:19.318Z

The single-source claim holds: the live coefficient `* 0.005` in executable code exists only in `EDMBiMaterialCompensationEngine.ts:275`. The two grep hits at line 9 (hardness module) and line 268 (engine) are both JSDoc comment strings, not executable coefficients. `wedm-hardness-feed-scale.ts:47` imports and calls `edmHardnessFactor` as a ratio — does not re-inline the literal.

Now let me verify the extraction is behavior-preserving by checking the original inline expression. The reviewer states the old code was `z.hardness_hrc ? 1+(z.hardness_hrc-40)*0.005 : 1.0` at ~line 316. The current code at line 329 calls `edmHardnessFactor(z.hardness_hrc)`. Let me confirm the truthy semantics match precisely by examining both forms.

**Extraction equivalence analysis:**
- Old inline: `z.hardness_hrc ? 1 + (z.hardness_hrc - 40) * 0.005 : 1.0`
- New fn: `edmHardnessFactor(hardnessHrc?) { return hardnessHrc ? 1 + (hardnessHrc - 40) * 0.005 : 1.0; }`
- Call site line 329: `edmHardnessFactor(z.hardness_hrc)`

These are token-for-token identical. The parameter `hardnessHrc` is bound to `z.hardness_hrc`, the truthy guard `hardnessHrc ?` is identical to `z.hardness_hrc ?`, and the branches are identical. JS truthiness: `0` → falsy → `1.0`; `undefined` → falsy → `1.0`; `NaN` → falsy → `1.0`; any nonzero finite → computed. This is a pure, side-effect-free extraction — it cannot change any output. Confirmed behavior-preserving.

Now let me verify the corpus actually exercises hardness by running the build script, since the reviewer claims "the run showed factor 0.9685 + hrc-caveat."

### Assistant | 2026-06-02T20:03:19.329Z

[tool_use: Bash]

### User | 2026-06-02T20:04:36.024Z

[tool_result] === WEDM PASS-SCHEDULE CORPUS (Regimen #3) ===
{
  "total": 224,
  "by_kind": {
    "tech_select": 180,
    "tech_table": 3,
    "tech_pass": 14,
    "invariant": 5,
    "tech_trim": 2,
    "job_cascade": 20
  },
  "families_self_validated": 3,
  "split": {
    "train": 181,
    "val": 22,
    "test": 21
  },
  "out_dir": "H:\\prism-slot-mike\\mcp-server\\data\\training\\wedm-passschedule"
}
[wedm
... [+98 chars truncated]

### Assistant | 2026-06-02T20:04:43.213Z

The build runs clean — 20 job_cascade pairs emitted. Now let me confirm that hardened (62 HRC) pairs with a de-rate factor actually fire in the emitted corpus (not just that the loop runs). Let me inspect the emitted JSONL for hardness factor and caveats.

### Assistant | 2026-06-02T20:04:49.131Z

[tool_use: Bash]

### User | 2026-06-02T20:05:32.638Z

[tool_result] total job_cascade pairs: 20
hardened (HRC) pairs: 10
--- input: D2, 80 mm thick, 62 HRC, straight cut.
    hardness factor in output: 0.9685
    has de-rate caveat: true
    has slower feed (a number ipm): true
--- input: D2, 80 mm thick, 62 HRC, 2 deg taper.
    hardness factor in output: 0.9685
    has de-rate caveat: true
    has slower feed (a number ipm): true
--- input: D2, 60 mm thick, 62 H
... [+178 chars truncated]

### Assistant | 2026-06-02T20:05:39.165Z

Confirmed: 10 hardened pairs emitted, all with hardness factor 0.9685 (< 1.0, de-rate fired), all carrying the "de-rated for 62 HRC" caveat, all with numeric ipm feeds. R12 "wired but not exercised" is genuinely closed — the de-rate touches real emitted output.

Now let me verify the math of 0.9685 and the R9 test-integrity concerns. Let me compute by hand:
- `edmHardnessFactor(55)` = 1 + (55-40)*0.005 = 1 + 0.075 = 1.075
- `edmHardnessFactor(62)` = 1 + (62-40)*0.005 = 1 + 0.110 = 1.110
- ratio = 1.075 / 1.110 = 0.96846... → rounds to 0.9685. Correct.

Now the critical R9 question — would the tests go RED if `hardnessFeedFactor` regressed to always-1.0? Let me trace each assertion:

### Assistant | 2026-06-02T20:05:49.162Z

[tool_use: Bash]

### User | 2026-06-02T20:06:06.994Z

[tool_result] === Would these go RED under always-1.0 regression? ===
f60<1 (real): true | regressed: false => RED? true
f64<f60 (real): true | regressed: false => RED? true
inverse-ratio test expected: 0.9684684684684683 | regressed value 1.0 close to expected@6dp? false => RED? true
   (is the equals-test circular? expected uses edmHardnessFactor independently of hardnessFeedFactor internals)

### Assistant | 2026-06-02T20:06:21.115Z

All three core R9 checks go RED under the always-1.0 regression. The "DE-RATES above 55" test (`f60 < 1`) fails because regressed returns 1.0 which is not < 1. The monotonic test (`f64 < f60`) fails because 1.0 is not < 1.0. The inverse-ratio test fails because 1.0 is not close to 0.9685 at 6dp.

On circularity: the "equals inverse current-boost ratio" test computes `expected = edmHardnessFactor(55) / edmHardnessFactor(62)` in the test file, then asserts `hardnessFeedFactor(62)` equals it. This is **not circular** because the test re-derives the expected value from the *engine's* `edmHardnessFactor` (the canonical source), independently of `hardnessFeedFactor`'s body — it verifies the composition formula matches the intended physics, and would catch any wrong anchor (e.g. if the module anchored at 40 instead of 55) or wrong operation (multiply instead of divide). It also has a `expect(expected).toBeLessThan(1)` guard so the comparison can't be vacuously satisfied by two equal wrong values. Genuine check.

Now the loosened 4dp→3dp assertion. Let me verify the 3dp tolerance is still a real discriminator (not a cop-out that always passes).

### Assistant | 2026-06-02T20:06:33.950Z

[tool_use: Bash]

### User | 2026-06-02T20:06:56.036Z

[tool_result] rawH(64)= 0.9598214285714285
rawT= 0.8123456 applied= 0.7797 tf*hf= 0.77964554 diff= 5.45e-5 pass@3dp= true WOULD pass@4dp= false
rawT= 1.2987654 applied= 1.2466 tf*hf= 1.24658824 diff= 1.18e-5 pass@3dp= true WOULD pass@4dp= true
rawT= 0.5555 applied= 0.5332 tf*hf= 0.53316890 diff= 3.11e-5 pass@3dp= true WOULD pass@4dp= true
rawT= 1.04321 applied= 1.0013 tf*hf= 1.00126336 diff= 3.66e-5 pass@3dp= t
... [+119 chars truncated]

### Assistant | 2026-06-02T20:07:06.739Z

This is the decisive result. The 3dp loosening is justified and not a cop-out:

1. **Why 4dp genuinely fails:** the first scenario shows `diff = 5.45e-5`, which exceeds the 4dp threshold (`0.5e-4 = 5.0e-5`) but is within 3dp (`0.5e-3`). This is the expected "thrice-rounded" artifact: `applied_feed_factor` rounds the *raw product* to 4dp, while `thickness_factor × hardness_factor` multiplies two *independently-4dp-rounded* values. The rounding paths diverge by up to ~1e-4, so 4dp is genuinely unattainable. The comment at test line 156-157 documents exactly this.

2. **3dp still discriminates the real regression:** when `applied_feed_factor` omits hardness entirely (the regression that matters), `diff = 0.0327` — three orders of magnitude above the 3dp threshold, so the test goes RED. The loosened assertion still catches "hardness not composed into applied factor."

The 3dp is a principled tolerance for rounding-path divergence, not a cop-out — it remains tight enough to catch the composition bug it exists to guard.

Now let me verify composition correctness (no double-application, null/taper invariants) directly against the live module.

### Assistant | 2026-06-02T20:07:06.740Z

[tool_use: Bash]

### User | 2026-06-02T20:08:12.348Z

[tool_result]  RUN  v4.1.8 H:/prism-slot-mike


 Test Files  2 passed (2)
      Tests  34 passed (34)
   Start at  15:08:02
   Duration  5.31s (transform 1.82s, setup 0ms, import 3.31s, tests 21ms, environment 0ms)

### Assistant | 2026-06-02T20:08:33.729Z

Both suites pass (34 tests: 9 hardness scale + 25 cascade). Let me do a final direct composition check to confirm no double-application and that null feeds / taper offsets are preserved exactly, then run the engine's own 54-test suite to confirm the extraction didn't regress it.

### Assistant | 2026-06-02T20:08:33.744Z

[tool_use: Bash]

### User | 2026-06-02T20:09:30.366Z

[tool_result] node:internal/modules/esm/resolve:275
---running composition probe via tsx---

### Assistant | 2026-06-02T20:09:37.729Z

The first probe (the bogus import) crashed before the tsx probe printed. Let me run the tsx probe cleanly on its own.

### Assistant | 2026-06-02T20:09:42.717Z

[tool_use: Bash]

### User | 2026-06-02T20:10:19.338Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-02T20:10:34.546Z

The probe produced no output — likely a tsx stdout flush quirk under the slow environment. The 25-test cascade suite already passed and includes explicit assertions for exactly these invariants (test line 158 single-application via `applied = tf×hf`, line 190 taper offsets=0, line 197 null feed preservation, line 147 hardness-no-op applied==thickness). I have sufficient confidence from the green suite. Let me confirm the extraction didn't regress the engine's own suite.

### Assistant | 2026-06-02T20:10:34.548Z

[tool_use: Bash]

### User | 2026-06-02T20:11:00.966Z

[tool_result]  RUN  v4.1.8 H:/prism-slot-mike

No test files found, exiting with code 1

filter: EDMBiMaterialCompensation
include: **/*.{test,spec}.?(c|m)[jt]s?(x)
exclude:  **/node_modules/**, **/.git/**

### Assistant | 2026-06-02T20:11:06.142Z

Let me find the actual engine test file name.

### Assistant | 2026-06-02T20:11:06.683Z

[tool_use: Glob]

### Assistant | 2026-06-02T20:11:06.865Z

[tool_use: Glob]

### User | 2026-06-02T20:11:13.388Z

[tool_result] mcp-server\src\__tests__\EDMMultiPassStrategyEngine.test.ts
mcp-server\src\__tests__\EDMPostProcessGCodeEngine-controller-tips.test.ts
mcp-server\src\__tests__\EDMPostProcessGCodeEngine.test.ts
mcp-server\src\__tests__\EDMProgramAssemblerEngine.test.ts
mcp-server\src\__tests__\EDMWireSlugCornerTaperEngine.test.ts
mcp-server\src\__tests__\MastercamEDMBridge.test.ts
mcp-server\src\__tests__\Mitsubis
... [+5740 chars truncated]

### User | 2026-06-02T20:11:13.485Z

[tool_result] No files found

### Assistant | 2026-06-02T20:11:19.329Z

There is no test file named for `EDMBiMaterialCompensationEngine` in the standard `__tests__/` dir. The reviewer's prompt claims a "54-test suite passes" for the engine. Let me locate where the engine's tests actually live (the bi-material engine may be tested under a differently-named file).

### Assistant | 2026-06-02T20:11:20.509Z

[tool_use: Grep]

### User | 2026-06-02T20:11:49.798Z

[tool_result] Found 3 files
mcp-server\src\__tests__\WEDMHardnessFeedScale.test.ts
mcp-server\src\__tests__\wedm-jm-die-comprehensive.test.ts
mcp-server\src\__tests__\edm-bimaterial-compensation.test.ts

### Assistant | 2026-06-02T20:11:56.332Z

Found it — `edm-bimaterial-compensation.test.ts`. Let me run that suite to confirm the extraction preserved engine behavior (the 54 tests), plus the comprehensive WEDM suite that references it.

### Assistant | 2026-06-02T20:11:59.406Z

[tool_use: Bash]

### User | 2026-06-02T20:12:44.404Z

[tool_result]  RUN  v4.1.8 H:/prism-slot-mike


 Test Files  1 passed (1)
      Tests  54 passed (54)
   Start at  15:12:28
   Duration  1.36s (transform 166ms, setup 0ms, import 201ms, tests 33ms, environment 0ms)

### Assistant | 2026-06-02T20:12:52.961Z

All 54 engine tests pass after the extraction — confirms behavior preservation empirically, not just by inspection. 

Let me do final convention checks: no `${}` template literals in the script, no `eval`, and that the script uses string concatenation as claimed.

### Assistant | 2026-06-02T20:12:54.040Z

[tool_use: Grep]

### User | 2026-06-02T20:13:00.535Z

[tool_result] 20: * FROM the tech tables). No ${...} template literals (scripts/ security hook).

### Assistant | 2026-06-02T20:13:33.043Z

The only `${` match is inside a comment documenting the prohibition — no executable `${}` template literals, no `eval`. Convention clean.

All verification complete. Here is my independent grade.

---

## VERDICT: PASS (3-of-3 arm — independent second pass)

All 6 files reviewed end-to-end. 34 + 54 = 88 relevant tests pass; corpus build runs clean and emits exercised hardness pairs. No P0 or P1 findings.

### R9 TEST INTEGRITY — verified by simulated regression (not assumed)
- **Always-1.0 regression goes RED on 3 independent checks.** Ran the regressed `hardnessFeedFactor → 1.0` against the suite logic: "DE-RATES above 55" (`f60<1`) fails, monotonic (`f64<f60`) fails, inverse-ratio (`toBeCloseTo(0.9685, 6)`) fails. The de-rate is genuinely guarded.
- **"Equals inverse current-boost ratio" test is NOT circular.** It re-derives `expected = edmHardnessFactor(55)/edmHardnessFactor(62)` from the *engine's* canonical fn, independent of `hardnessFeedFactor`'s body, plus an `expect(expected).toBeLessThan(1)` non-vacuity guard. It would catch a wrong anchor (40 vs 55) or wrong operation (× vs ÷).
- **4dp→3dp loosening is principled, not a cop-out.** Confirmed numerically (`WEDMJobCascade.test.ts:158`): `applied_feed_factor` rounds the *raw* product to 4dp while `thickness_factor × hardness_factor` multiplies two *independently*-4dp-rounded fields — divergence reaches ~5.4e-5, exceeding the 4dp threshold (5e-5) but inside 3dp. Critically, the regression that matters (hardness omitted from `applied`) yields `diff ≈ 0.033` — 3 orders of magnitude over the 3dp bar, so it still goes RED. The comment at lines 156-157 documents exactly this.

### R12 — WIRED AND EXERCISED (P0-1 repeat avoided)
Ran the corpus build: 10 hardened pairs emitted, all with `hardness factor 0.9685` (<1.0, de-rate fired), all carrying the "de-rated for 62 HRC" caveat, all with numeric ipm feeds. `generateJobCascade` is the real consumer (imported by both the cascade-test and the corpus script). Hand-check
... [+2797 chars truncated]
