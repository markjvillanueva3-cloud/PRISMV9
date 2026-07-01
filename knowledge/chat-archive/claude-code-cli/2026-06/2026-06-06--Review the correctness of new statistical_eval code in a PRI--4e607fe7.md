---
type: "chat-session"
source: "claude-code-cli"
session_id: "4e607fe7-e3af-475c-8535-1d10b459c62c"
title: "Review the correctness of new statistical/eval code in a PRISM India-slot build."
date: "2026-06-06"
first_ts: "2026-06-06T04:21:17.258Z"
last_ts: "2026-06-06T04:26:34.197Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 18
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-a5363cdb6c6d44a48.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review the correctness of new statistical/eval code in a PRISM India-slot build.

> **claude-code-cli** | 2026-06-06 | 48 msgs (18 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4e607fe7-e3af-475c-8535-1d10b459c62c/subagents/agent-a5363cdb6c6d44a48.jsonl`

## Transcript

### User | 2026-06-06T04:21:17.258Z

Review the correctness of new statistical/eval code in a PRISM India-slot build. Read these files END-TO-END and verify the math + edge cases + conventions:

FILES:
- H:/prism/scripts/lib/nn-graph-eval.mjs  (NEW functions: SELECTIVE_THRESHOLDS, riskCoverageCurve, selectiveDeployPoint, gradeSelectiveDeploy; and their wiring into assessHoldout/runAssessment/renderReport). The existing computeBrier/computeMacroF1/computeAUROC/gradeMetrics are reused — verify the new code calls them correctly and does not duplicate/contradict them.
- H:/prism/scripts/nn-graph-calibration-analysis.mjs  (NEW: a calibration study. functions fitTemperature [golden-section NLL minimization], fitPlatt [Newton/IRLS logistic on logit feature], fitIsotonic [PAV], looCV [leave-one-out cross-val], murphy [Brier decomposition], analyzeCalibration). It imports computeBrier/riskCoverageCurve/selectiveDeployPoint from the eval lib.
- H:/prism/scripts/lib/nn-graph-eval.test.mjs  (added ~12 tests) and H:/prism/scripts/nn-graph-calibration-analysis.test.mjs  (new, ~14 tests).

VERIFY:
1. riskCoverageCurve: confidence>=τ filtering correct? coverage = emitted/total over ALL finite-confidence samples? Reuses computeBrier/computeMacroF1 correctly? Gate-clear flags correct direction (Brier ≤ gate, macroF1 ≥ gate)?
2. selectiveDeployPoint: returns the LOWEST τ (max coverage) clearing both — is the ascending-τ ordering + .find() correct for that? Edge: empty samples, no clearing point → {found:false}?
3. gradeSelectiveDeploy: pass iff global AUROC≥gate AND deployPoint.found. AUROC NOT thresholded (stays global) — correct?
4. fitTemperature: golden-section on T∈[0.2,5] minimizing NLL — sound? T<1 sharpens under-confident, T>1 softens over-confident — verify the direction is right (p'=sigmoid(logit(p)/T)).
5. fitPlatt: Newton-Raphson gradient+Hessian on (A,B) of NLL — correct gradient/Hessian for logistic? Hessian regularization sane?
6. murphy: reliability - resolution + uncertainty == Brier identity holds? bin 
... [+308 chars truncated]

### Assistant | 2026-06-06T04:21:30.216Z

I'll review the new statistical/eval code. Let me start by reading all four files end-to-end.

### Assistant | 2026-06-06T04:21:30.832Z

[tool_use: Read]

### Assistant | 2026-06-06T04:21:30.898Z

[tool_use: Read]

### User | 2026-06-06T04:21:35.799Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * NN-GRAPH calibration analysis — prove (with numbers) whether post-hoc confidence
4	 * calibration can clear the GNN tier-5 deploy Brier gate (<= 0.15), the HONEST way.
5	 *
6	 * Context: the deploy gate fails on Brier (0.179 > 0.15). The first calibration
7	 * attempt (U-GNN-CALIBRATE-NEG: isotonic fit by leave-one-out over the REFERENCE
8	 * pool) regressed the ho
... [+12163 chars truncated]

### User | 2026-06-06T04:21:35.897Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+43771 chars truncated]

### Assistant | 2026-06-06T04:21:38.495Z

Now let me read the two test files to verify they exercise the math correctly.

### Assistant | 2026-06-06T04:21:38.962Z

[tool_use: Read]

### Assistant | 2026-06-06T04:21:39.413Z

[tool_use: Read]

### User | 2026-06-06T04:21:43.691Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.test.mjs — node:test suite for the GNN tier-5 assessment
4	 * harness (NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS, U7).
5	 *
6	 * The pure metric functions are pinned to hand-computed reference values
7	 * (AUROC via Mann-Whitney, macro-F1, Brier) — a stub returning a constant
8	 * would fail. The end-to-end paths use a REAL GraphSAGE model from createModel
9	
... [+35727 chars truncated]

### User | 2026-06-06T04:21:43.862Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-calibration-analysis.test.mjs — node:test suite for the calibration
4	 * study. The calibrators (temperature scaling, Platt, isotonic), the LOO-CV
5	 * driver, and the Murphy decomposition are pinned to hand-verifiable reference
6	 * values / invariants — a stub returning a constant would fail. The end-to-end
7	 * `analyzeCalibration` is run on a determini
... [+7084 chars truncated]

### Assistant | 2026-06-06T04:21:48.630Z

I have all four files. Now let me verify the math carefully on the specific points raised, starting with the trickier ones. Let me check the `riskCoverageCurve` coverage denominator and the macro-F1 in the selective context, then the calibration math.

Let me first verify the test reference value for `selectiveDeployPoint` at τ=0.4 against the actual macro-F1 computation, since that's a load-bearing claim.

### Assistant | 2026-06-06T04:21:54.023Z

[tool_use: Bash]

### User | 2026-06-06T04:22:01.405Z

[tool_result] CURVE:
{"tau":0.4,"coverage":0.8,"emitted":4,"brier":0.1263,"macroF1":0.7333,"accuracy":0.75,"classesEmitted":2,"brierClears":true,"macroF1Clears":true}
{"tau":0.45,"coverage":0.8,"emitted":4,"brier":0.1263,"macroF1":0.7333,"accuracy":0.75,"classesEmitted":2,"brierClears":true,"macroF1Clears":true}
{"tau":0.5,"coverage":0.6,"emitted":3,"brier":0.1008,"macroF1":1,"accuracy":1,"classesEmitted":2,"br
... [+1076 chars truncated]

### Assistant | 2026-06-06T04:22:05.308Z

The coverage math is correct, and the deploy point is correct. Note the test comment on line 648 says "macro (0.8+0.667)/2 = 0.733" — the test asserts `dp.tau === 0.4` and `dp.emitted === 4` which pass, but it does NOT assert the exact macroF1 value, so the comment arithmetic being slightly imprecise (it's actually 0.7333) is harmless. Now let me verify the calibration math — temperature direction, Platt Newton, and Murphy identity.

### Assistant | 2026-06-06T04:22:16.779Z

[tool_use: Bash]

### User | 2026-06-06T04:22:21.102Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-06-06T04:22:22.828Z

rtk choked on the multiline `-e`. Let me write to a temp file and run with plain node.

### Assistant | 2026-06-06T04:22:33.172Z

[tool_use: Write]

### User | 2026-06-06T04:22:38.827Z

[tool_result] File created successfully at: H:/prism/scripts/_tmp_calib_review.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-06T04:22:41.580Z

That's a false-positive match (a temp file, not the engine). Let me run it.

### Assistant | 2026-06-06T04:22:42.664Z

[tool_use: Bash]

### User | 2026-06-06T04:22:50.687Z

[tool_result] murphy id: {"brier":0.07500000000000001,"recon":0.07500000000000001,"diff":0}
under-conf T: 0.2083 apply(0.6): 0.8750
over-conf T: 5.0000 apply(0.9): 0.6081
platt A,B: 36.8779 -0.0000 mono: true
murphy p=1 boundary: {"reliability":0,"resolution":0.22222222222222224,"uncertainty":0.22222222222222224,"base":0.6666666666666666}
looCV n=1: [0.5]
all-correct verdict0: raw Brier 0.025 vs gate 0.15; misc
... [+680 chars truncated]

### Assistant | 2026-06-06T04:22:56.932Z

This is very informative. The Murphy identity holds, temperature direction is correct (under-confident T=0.21<1 sharpens, over-confident T=5>1 softens). But I've found important edge-case behaviors. Let me dig into a few concerns:

1. The temperature hit the boundary `T=5.0000` (T_HI) for over-confident data — golden section converged to the boundary. That's expected but worth noting the bound binds.
2. `looCV n=1` returns `[0.5]` — temperature fits on an EMPTY training set. Let me check what `fitTemperature([],[])` returns and whether NaN can leak.
3. `n=1 analyze looCV` produced finite numbers but the LOO with n=1 fits each calibrator on an empty set — those numbers are meaningless artifacts. Let me check the degenerate empty-fit behavior precisely.

### Assistant | 2026-06-06T04:23:06.639Z

[tool_use: Write]

### User | 2026-06-06T04:23:14.432Z

[tool_result] File created successfully at: H:/prism/scripts/_tmp_calib_review2.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-06T04:23:17.395Z

[tool_use: Bash]

### User | 2026-06-06T04:23:22.276Z

[tool_result] fitTemperature([]): T= 4.999962546232004 apply(0.5)= 0.5
fitPlatt([]): A= 1 B= 0 apply(0.5)= 0.5
fitIsotonic([]): apply(0.5)= 0.5
murphy([],[]): {"reliability":null,"resolution":null,"uncertainty":null,"base":null}
all-wrong dp.found: false rawBrier: 0.125 verdict1: best honest (LOO-CV) calibrator: isotonic → 0 (still > 0.15)
NaN-conf THREW: Cannot read properties of undefined (reading 'n')
logit-
... [+155 chars truncated]

### Assistant | 2026-06-06T04:23:27.205Z

Found significant issues. Let me confirm the two notable findings:

1. **`murphy([],[])` returns all-null but does NOT throw** — good. But `analyzeCalibration` with NaN confidence throws inside murphy. Let me trace the NaN-confidence throw precisely.

2. **`all-wrong` verdict line is misleading**: `best honest (LOO-CV) calibrator: isotonic → 0 (still > 0.15)` — it says `0 (still > 0.15)` which is contradictory: 0 is NOT > 0.15. This is the `buildVerdict` using LOO isotonic Brier of 0 (overfit artifact on all-same-label data) but printing the static "(still > GATE)" string. Let me verify this is a real bug in the verdict text.

Let me trace the NaN throw and the verdict logic.

### Assistant | 2026-06-06T04:23:33.504Z

[tool_use: Write]

### User | 2026-06-06T04:23:50.146Z

[tool_result] File created successfully at: H:/prism/scripts/_tmp_calib_review3.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-06T04:23:52.793Z

[tool_use: Bash]

### User | 2026-06-06T04:24:05.889Z

[tool_result] murphy NaN THREW: Cannot read properties of undefined (reading 'n')
clearsGate: {"temperature":true,"platt":true,"isotonic":true,"ceiling":true}
looCV: {"temperature":{"brier":0.0069,"logloss":0.0691,"T":0.2},"platt":{"brier":0,"logloss":0,"A":12.8327,"B":-33.0857},"isotonic":{"brier":0}}
V0: raw Brier 0.125 vs gate 0.15; miscalibration (reliability) is only 0.125 of it
V1: best honest (LOO-CV) ca
... [+667 chars truncated]

### Assistant | 2026-06-06T04:24:21.287Z

Confirmed two real bugs. The verdict line `best honest (LOO-CV) calibrator: isotonic → 0 (still > 0.15)` hardcodes "(still > GATE)" even when `best <= GATE` — a logical contradiction with its own `clearsGate` field. This is a degenerate fixture (all-wrong, base rate 0) but it demonstrates the `buildVerdict` string is not guarded.

However, I should assess how load-bearing this is on the REAL data path. The real eval samples won't be all-same-label, and `raw Brier 0.179 > 0.15` is the documented case. But the contradiction is a genuine correctness defect in the verdict generation. Let me also confirm whether the NaN-confidence path can actually occur from real `NN-EVAL.json` — `assessHoldout` produces `confidence: round4(conf)` where `conf` defaults to 0 if non-finite, so samples written by the harness always have finite confidence. So the NaN throw is a robustness gap, not a live-data crash. Let me verify that claim by checking the sample-producing line.

The `assessHoldout` line 505: `const conf = c && Number.isFinite(c.confidence) ? c.confidence : 0;` — so confidence is always finite in harness-produced samples. The NaN throw in `murphy` is therefore a defensive-robustness P2 (only triggers on hand-crafted/corrupted input), not a live-data P1.

Now let me run the actual test suites to confirm they pass, and check the `__isMain` guard and import suffixes.

### Assistant | 2026-06-06T04:24:22.005Z

[tool_use: Bash]

### User | 2026-06-06T04:24:31.303Z

[tool_result]   ...
# Subtest: murphy — decomposition sums to Brier (reliability - resolution + uncertainty)
ok 82 - murphy — decomposition sums to Brier (reliability - resolution + uncertainty)
  ---
  duration_ms: 0.5361
  ...
# Subtest: murphy — perfectly-calibrated data has ~zero reliability (miscalibration)
ok 83 - murphy — perfectly-calibrated data has ~zero reliability (miscalibration)
  ---
  duration_m
... [+510 chars truncated]

### Assistant | 2026-06-06T04:24:39.373Z

All 85 tests pass. Now let me verify the remaining specific points: the `__isMain` guard in the calibration script (it uses a non-NodeNext-safe `file://${process.argv[1]}` pattern), the import suffixes, and whether `analyzeCalibration` is robust to the `dec` murphy when `n` makes binning collapse. Let me also double check the Platt Hessian/gradient signs are correct for NLL minimization (the code does `A -= dA` which is Newton step toward minimum).

Let me verify the Platt gradient/Hessian against a finite-difference check, since that's the most error-prone math.

### Assistant | 2026-06-06T04:24:45.016Z

[tool_use: Write]

### User | 2026-06-06T04:24:52.517Z

[tool_result] File created successfully at: H:/prism/scripts/_tmp_platt_check.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-06T04:24:55.250Z

[tool_use: Bash]

### User | 2026-06-06T04:25:01.166Z

[tool_result] grad analytic gA,gB: -1.650026 0.189003
grad finite-diff  : -1.650026 0.189003
gradient match: true
fitted A,B: 36.8779 -0.0000 grad at fit: -7.78e-6 -2.53e-6

### Assistant | 2026-06-06T04:25:07.303Z

The Platt gradient is analytically correct (matches finite-difference exactly), and the fit converges to ~zero gradient. The `A=36.88` is a large value — that's separable data driving the logistic to a steep slope (expected; not a bug, the data {z>0 → mostly 1} is near-separable so MLE pushes A large). The Hessian for logistic NLL is `H = Σ w·[z² z; z 1]` with `w=p(1-p)`, which is exactly what's coded (`hAA += w*z*z; hAB += w*z; hBB += w`), correctly positive-definite, with the `+HESS_REG` ridge regularization. Newton step `θ -= H⁻¹g` via the 2×2 inverse is correct.

Now let me clean up the temp files and check the `__isMain` guard and import conventions.

### Assistant | 2026-06-06T04:25:08.592Z

[tool_use: Bash]

### User | 2026-06-06T04:25:25.945Z

[tool_result]  M scripts/__tests__/build-system-viz-livediff.test.mjs
 M scripts/__tests__/build-wiring-domain-dict.test.mjs
 M scripts/__tests__/memory-garden-scan.test.mjs
 M scripts/__tests__/unwired-bridge-rank.test.mjs
 M scripts/add-parent-contains-edges.mjs
 M scripts/agents/spawned-agent-context-lib.mjs
 M scripts/append-closed-loop-india-section.mjs
 M scripts/audit-hook-wiring.test.mjs
 M scripts/back
... [+87 chars truncated]

### Assistant | 2026-06-06T04:25:38.515Z

Temp files cleaned. Now a final correctness review of two subtle points I want to confirm by reading the relevant code closely:

1. **`riskCoverageCurve` coverage denominator** (line 235): `n = all.length` where `all` filters to `Number.isFinite(s.confidence)`. So coverage = emitted / (all finite-confidence samples). This is correct — exactly as the task asks ("coverage = emitted/total over ALL finite-confidence samples"). A sample with NaN confidence is excluded from the denominator, which is right because it could never be emitted at any τ.

2. **`selectiveDeployPoint` ascending-τ + `.find()`** (lines 272-275): `riskCoverageCurve` iterates `thresholds` in given order (SELECTIVE_THRESHOLDS is ascending), pushing rows in that order. `.find()` returns the FIRST clearing row = lowest τ = max coverage. Correct. Edge: empty samples → curve is `[]` → `.find()` returns undefined → `{found:false}`. Correct.

3. **`gradeSelectiveDeploy`** (line 286-304): `pass = aurocPass && dp.found`, AUROC stays global (not thresholded). Correct per spec.

Let me verify one numerical subtlety in `riskCoverageCurve`: the `macroF1` is computed over the EMITTED set's predicted/truth — but macro-F1 over a filtered subset changes the class union. At high τ with one class emitted, macroF1 over a single correct class = 1.0. That's mathematically what the curve shows (τ≥0.75 → macroF1 1, classesEmitted 1). This is correct behavior but worth noting: macro-F1 on the emitted subset is a different denominator than the global macro-F1, which is exactly the intended selective-prediction semantics. The report labels it clearly as the emitted-set quality.

Let me confirm the calibration script's `__isMain` guard works on Windows (the `file://${process.argv[1]}` pattern) and check it doesn't accidentally execute `main()` on import in tests — the tests passed, so import didn't trigger `main()`, but let me confirm the guard logic for the suffix-endsWith fallback.

### Assistant | 2026-06-06T04:25:40.983Z

[tool_use: Bash]

### User | 2026-06-06T04:25:48.572Z

[tool_result] endsWith guard would fire for argv1 ending in name. In tests argv1 is the test runner / test file, not the analysis file, so main() is NOT called on import. Confirmed by 85 passing tests with no JSON.parse(EVAL_PATH) crash.

### Assistant | 2026-06-06T04:26:34.197Z

I have everything I need. Let me compile the final review.

## Code Quality Analysis Report

### Summary
- **Overall Quality Score: 9/10**
- **Files Analyzed: 4** (2 source, 2 test)
- **Issues Found: 4** (0 P0, 1 P1, 3 P2)
- **Technical Debt Estimate: ~1.5 hours**
- **Grade: PASS** (with one P1 fix recommended before the verdict text is relied upon downstream)

The math is sound and reference-verified. I independently confirmed: the Mann-Whitney AUROC, the Murphy decomposition identity (exact to 1e-16), the temperature-scaling direction, and — most error-prone — the **Platt Newton gradient/Hessian against finite differences (exact match, converges to ~1e-6 gradient)**. All 85 tests pass.

---

### Critical Issues
None. No P0.

---

### P1 Findings

**1. `buildVerdict` hardcodes "(still > GATE)" — contradicts its own `clearsGate` field**
- File: `H:/prism/scripts/nn-graph-calibration-analysis.mjs:236`
- Code: `lines.push(\`best honest (LOO-CV) calibrator: ${bestName} → ${round(best)} (still > ${GATE})\`);`
- The string literal `(still > ${GATE})` is emitted unconditionally, even when `best <= GATE`. Demonstrated live: a holdout where LOO-isotonic Brier rounds to `0` prints `isotonic → 0 (still > 0.15)` — a self-contradiction, since `0` is not `> 0.15`, and the object's own `clearsGate.isotonic` is simultaneously `true`. FINDING-1 prose ("calibration is a DEAD END") is likewise unconditional and would be flatly wrong if a calibrator actually cleared.
- This is the verdict that a human/downstream reader consumes to decide "calibration won't save the gate." On the documented live data (raw Brier 0.179, best LOO ~>0.15) it happens to be true, so the headline conclusion is correct for the real case — but the text generator is not guarded and will state a falsehood the moment a calibrator clears. R12 (fail-loud / no lying status strings) territory.
- Suggestion: branch the string on `best <= GATE` (and gate FINDING-1 on `!clearsGate.ceiling`): `best <= GATE ? \`→ ${round(b
... [+6189 chars truncated]
