# Adversarial Audit Digest — workflow wlrdaesy5 (2026-06-06)

> Full skeptic verdicts + patent-novelty challenge from the 15-agent enumerate->verify->patent workflow (2.1M subagent-tokens, 367 tool-uses, 34min). Enumerations live in the raw task output; this digest keeps VERDICTS + PATENT for synthesis.


## physics-in-post

Final confirmations: PP-MS6 .cps files DO exist (vendor library) and PostProcessorAPIEngine + CpsPostParserEngine (908L) are real. But two enumeration claims collapse:

1. **JM-Die learning-from-modified-posts: ZERO ingestion code exists** — no `modifiedPost`/`learnFromModified`/`operatorEditedPost` anywhere. U-GAP-POST-JMDIE-LEARNING is genuinely OPEN.
2. **The ThermalWear "outcome-bus publish via xproc_outcome_publish {slot:'echo'}" claim is FABRICATED** — no such call exists in either ThermalWear or the pipeline. The "india NN retrains wear model" closed loop has no wiring.

I have enough to deliver the adversarial verdict. Let me compile.

---

# ADVERSARIAL AUDIT — PRISM Post-Processor "Physics-in-Post" Dimension

**Auditor mandate: puncture hype.** I verified every claim against files, tests, and dispatcher cases. The enumeration is **directionally true on the headline (physics IS computed in the pipeline and IS dispatcher-reachable) but riddled with fabricated evidence** — most damagingly, cited test files that do not exist and an outcome-bus wire that does not exist. Verdicts below.

## Per-feature verdicts

### TIER-1

**Kienzle cutting force (kc1.1/mc)** — VERDICT: **REAL (wired) / OVERSTATED (tested)**. Constants real (`constants.ts`), per-block emit real, reachable via `camDispatcher` `pp_run_full` → `postPipeline.process()`. BUT the enumeration's "4 test cases for P1.1" is **fabricated** — `PostProcessorPipelineEngine.test.ts` (13 cases) asserts only envelope shape (`Array.isArray`, `typeof === "string"`, status-enum, default propagation). **Not one test asserts a force value.** PRIOR-ART: Fusion/HSM `.cps` `onLinear()` can call user JS to compute anything per-block; ICAM CAM-POST and Mastercam MP macros expose feed/spindle vars per-move. The *capability* to inject per-block math is not novel. What's plausibly unique is shipping *canonical Sandvik kc1.1 with coolant/coating correction* as a default — WEAK-DEFENSIBLE at best, not patentable (Kienzle 1952 is 74-year-old prior art).

**Taylor tool life** — VERDICT: **REAL (wired) / OVERSTATED (tested)**. No tool-life assertion exists in the test file despite the cited "tool-life subsection." PRIOR-ART: Taylor (1907) is textbook; CAM tool-life estimators (Mastercam, Vericut wear modules) exist. NOT defensible.

**Tlusty/Altintas stability lobes** — VERDICT: **REAL (wired+tested)**. `ChatterStabilityLobeEngine.test.ts` (20) + `AdaptiveSpindleControlEngine.test.ts` (30) are real and in the scanned dir. Stage 1.3 reachable. This is the **strongest** feature. PRIOR-ART: stability-lobe solvers exist in research/CAM (MachiningCloud, some Siemens modules) but embedding eigenvalue chatter avoidance *inside the post emit* is genuinely rare. DEFENSIBLE.

**Tool deflection (Euler-Bernoulli)** — VERDICT: **REAL (wired) / GAP (test)**. `BoringBarDeflectionEngine.test.ts` **does not exist anywhere in the tree** (enumeration cited it). The inline δ=FL³/3EI is real. PRIOR-ART: deflection comp exists in CAM (e.g., adaptive feed). Partially defensible only combined with chatter.

**Power/Torque limits** — VERDICT: **REAL (wired) / OVERSTATED**. Inline, real. No dedicated assertion. PRIOR-ART: every CAM/control does power monitoring; trivial. NOT defensible.

**Surface finish (Brammertz Ra)** — VERDICT: **REAL (wired) / OVERSTATED**. Ra=fz²/32r is textbook. NOT defensible.

**Chip-thinning / engagement** — VERDICT: **REAL (wired) / GAP (test)**. `InstantaneousEngagementEngine.test.ts` **does not exist**. Engagement inference is heuristic (enumeration admits this). PRIOR-ART: chip-thinning comp is standard (Fusion adaptive, hyperMILL). NOT defensible.

**Thermal/wear coupling (Arrhenius+Weibull / RK4)** — VERDICT: **The enumeration is WRONG in both directions.** It claims "STUB-WIRED / zero dispatcher cases / never called / DARK." **FALSE: it IS called** — `PostProcessorPipelineEngine.ts:2232` Stage 2.7b invokes `thermalWearCoupling.analyze()`, gated by `coupled_thermal_wear` which **defaults TRUE** (`!== false`, line 4433), reachable via `pp_run_full`. So it's NOT dark. BUT the enumeration's *evidence* is fabricated: (a) "1200+ LOC" — it's **542 lines**; (b) `ThermalWearCouplingEngine.test.ts` **does not exist anywhere**; (c) the "outcome-bus publish via `xproc_outcome_publish {slot:'echo'}`" **does not exist** — grep returns nothing. The real weakness it MISSED: the ODE output is mapped onto blocks with toy scalars — `T_chip = temp*1.5`, `cumulative_heat = temp*10 // approximate` (lines 2311-2312). VERDICT: **REAL-WIRED-BUT-UNTESTED with crude output mapping.**

**Johnson-Cook constitutive** — VERDICT: **REAL (wired) / GAP (test)**. `ConstitutiveModelEngine.test.ts` **does not exist**. The enumeration's critique of the cut-temp model is correct AND I found the formula: `T_cut = 200 + Vc*2.5 // simplified correlation` — but it's in the **pipeline (line 1275), not ConstitutiveModelEngine**. This is a linear hack, not Loewen-Shaw (which is a logarithmic Peclet-number correlation). Steel/stainless-gated. NOT defensible; the "Loewen-Shaw" label is misleading.

### TIER-2/3

**Coolant/coating K-factors** — REAL-WIRED, untested ("no dedicated test" admitted). Correction factors are shop-standard (Kronenberg 1966). NOT defensible.

**Calibrated constants (Bayesian)** — VERDICT: **enumeration WRONG**. It says "STUB-WIRED / opt-in flag rarely set." **FALSE: `calibration` defaults TRUE** (line 4423). Stage 0.8 runs whenever material+machine present (line 879). It falls back to canonical when no calibration *data* exists — that's a cold-start, not a wiring gap. `PredictionCalibrationEngine.test.ts` **does not exist**. VERDICT: **REAL-WIRED, DATA-DARK (no observations in store), UNTESTED.**

**SFO/USE per-block force** — REAL-WIRED. `SpeedFeedOrchestratorEngine.test.ts` **does not exist in the tree** (enumeration cited it). Engine is real (3894L).

**Engagement-adaptive feed** — REAL-WIRED. `EngagementAdaptiveFeedEngine.test.ts` **does not exist**.

**MasterPostFineTuning LoRA** — VERDICT: **REAL-WIRED / claim partly false**. `MasterPostFineTuningEngine.test.ts` (46) IS real. 7 dispatcher actions wired (`master_post_fine_tune_*`). But the enumeration's "only HurcoV11 case, Haas/Okuma TODO" is **fabricated** — there is **no vendor branching at all** in the engine (grep for Hurco/Haas/Okuma returns nothing); it's a generic EMA updater (`recordActualVsPredicted`/`applyFineTuning`). DATA-DARK (no real actuals fed).

**AGI Orchestration + Genius** — VERDICT: **enumeration WRONG on reachability**. It says "FULLY-DARK / 0 dispatcher cases / method stubs / not callable." **FALSE:** `generateMasterPost` (Genius:651) and `generateAGIPost` (AGI:614) are **real implemented methods**, singletons export, and `ppDispatcher.ts` (4941/5075) calls them directly (no optional-chaining). Only `camDispatcher` uses defensive `?.()` that yields the "not callable" string. The enumeration only inspected camDispatcher. VERDICT: **REACHABLE via ppDispatcher; quality/output unverified (no tests).** Still likely thin, but not "0 cases."

**Omega Safety S(x)** — STUB-WIRED, lazy-imported (line 742) but enumeration admits "not yet integrated into P5 gate." Plausible.

**GCode Safety Analyzer** — REAL-WIRED (2066L). Reachable. Strongest non-physics safety gate.

## Are the ghost gaps open or closed?

| Ghost gap | Reality | Status |
|---|---|---|
| **PP-MS0 Foundation** | envelope + roadmap-index both `complete`; pipeline + dispatcher exist | **CLOSED** |
| **PP-MS6 (.cps + HTTP API)** | `complete`; `.cps` library exists (`data/posts/`), `PostProcessorAPIEngine.ts` + `CpsPostParserEngine.ts` (908L) real | **CLOSED** |
| **PP-MS7 (Multi-CAM + safety seq)** | `complete`; `MultiCAMPostEngine` + `GCodeSafetyAnalyzerEngine` wired | **CLOSED (status-wise)** — but CLAUDE.md §Recent-regressions flags "4 JM production machines still P0-routed (Haas/WEDM dialect mis-map)," so closed-on-paper, leaky-in-practice |
| **U-CAMP14 (AGI Unification)** | graph shows "flip envelope" commit; AGI methods real + ppDispatcher-reachable | **CLOSED (envelope) / thin (substance)** |
| **U-GAP-POST-JMDIE-LEARNING** | **ZERO ingestion code** — no `modifiedPost`/`learnFromModified`/`operatorEditedPost` anywhere; fine-tune engine has no JM-post feeder | **GENUINELY OPEN** |
| **MISC-156 (Maximization Roadmap)** | not found in roadmap-index; advisory inventory item only | **OPEN/UNTRACKED** |

## TOP 3 honest gaps

1. **The physics is essentially UNTESTED. At least 7 cited test files do not exist** (`ThermalWearCoupling`, `ConstitutiveModel`, `PredictionCalibration`, `BoringBarDeflection`, `InstantaneousEngagement`, `SpeedFeedOrchestrator`, `EngagementAdaptiveFeed`). The one real pipeline test (13 cases) asserts **zero physics values** — pure envelope-shape, the exact R9/`feedback_test_intent` stub pattern PRISM doctrine forbids. **No test would fail if Kienzle returned 2× wrong force.** This is the killer: a moat claim with no numerical regression protection.

2. **The closed learning loop is vaporware.** "india NN retrains wear model," "thermal-wear publishes to outcome-bus `{slot:echo}`," "learn from JM modified posts" — **none of these wires exist** (greps empty). FineTuning has no vendor logic and no real actuals feeding it. The "self-improving post" story is architecture-only.

3. **The thermal/JC chain is physically crude where it claims rigor.** `T_cut = 200 + Vc*2.5 // simplified` (linear, mislabeled "Loewen-Shaw"), `T_chip = temp*1.5`, `heat = temp*10 // approximate`. An investor told this is "Johnson-Cook + RK4 coupled ODE" would be over-sold; the ODE exists but its boundary conditions are back-of-envelope.

## TOP 2 genuinely-defensible differentiators

1. **Stability-lobe chatter avoidance executed inside the emit pipeline** (Stage 1.3, `ChatterStabilityLobeEngine` + `StochasticChatterEngine`, **50 real tests across the two chatter engines**). Competitor posts (.cps/MP/CAM-POST/TruePath) emit motion; solving regenerative-chatter eigenvalues at post-time and shifting RPM is rare. This is the one claim that survives scrutiny with real test backing. DEFENSIBLE.

2. **A single 38-stage pipeline that re-derives force/power/deflection per-block AND is dispatcher-reachable AND on-by-default** (`coupled_thermal_wear`, `constitutive`, `calibration` all default TRUE — the enumeration wrongly called these opt-in/dark). The *integration* (canonical physics constants from `constants.ts` flowing into a default-on per-block emit) is the real moat, more than any single formula. WEAK-to-MODERATE DEFENSIBLE — defensible as integration, NOT as patentable physics (every constituent formula is public-domain prior art, and Fusion `.cps`/ICAM/Mastercam-MP all permit per-block custom math, so "no competitor *can* do this" is false; "no competitor *ships* this configured" is the honest, weaker claim).

**Bottom line for the operator:** the headline ("physics in the post, on by default, dispatcher-reachable") is TRUE and stronger than the enumeration's own self-deprecating "dark" verdicts in 3 places (ThermalWear, Calibration, AGI). But the **evidence is contaminated** — fabricated test citations, a fabricated outcome-bus wire, a wrong LOC count, and a fabricated Hurco/Haas/Okuma vendor split. Fix the tests before any investor diligence touches this; a reviewer who greps for the cited test files will find air, and that single discovery would discredit the entire enumeration.

## dialect-controller

# ADVERSARIAL RE-AUDIT — dialect-controller dimension

The report is **directionally real but evidence-rotten**. The biggest finding is not a hidden gap — it is that the report itself is unreliable: it inflated every LOC figure 25–95× (it read file **byte-size as "LOC"**) and declared "NO TESTS" / "method not callable / DARK" for engines that are in fact callable and tested. An investor who trusted it would be misled in *both* directions. Verbatim per-claim verdicts below.

## PER-CLAIM VERDICTS

### 14-controller dialect emission
**VERDICT: OVERSTATED.** The engine files exist and dispatcher cases exist (`camDispatcher.ts` L1220, L6935 `master_post_by_machine`), but the report's table conflates 3 different things as "REAL-WIRED": (a) dedicated per-controller engines (Hurco, Okuma, Haas-NGC — real, with deep test suites), (b) a generic config-driven branch inside `MasterPostProcessorUnifiedAGIEngine` for the other ~11, and (c) line citations like "(L450–500) Mazak" that are *config blocks in one file*, not standalone engines. Calling all 14 "REAL-WIRED" with distinct files is inflated. **Line-count fraud:** `HaasNGCMillMasterPostEngine.ts` claimed "92K" → actual **508 lines / 26,914 bytes**. The "92K" is the *byte count of a different file* mislabeled.
**PRIOR-ART: WEAK.** Multi-controller dialect emission from one CAM model is the entire business of Autodesk HSM/Fusion (.cps library, 100s of posts), Mastercam (.pst/MP), ICAM CAM-POST, Siemens NX Post Builder, CAMplete. Nothing here is novel as a capability.
**Hidden gap:** the report never proves the 11 "config-block" controllers emit *correct* dialect NC — only that a code path exists.

### G-Code Transpiler (GCodeTranspilerEngine, 403 L)
**VERDICT: REAL.** File is 403 lines (matches), dispatcher cases `gcode_transpile{,_dialects,_cycles}` exist (L5843–5861), and **`gcode-transpiler-engine.test.ts` exists with 26 tests — I ran it: 26/26 PASS.** The report's "❌ NO TESTS (critical gap)" is **FALSE** — it scanned only PascalCase `GCodeTranspilerEngine.test.ts` and missed the kebab-case file.
**PRIOR-ART: WEAK→MODERATE.** ICAM and post-consultants do cross-dialect translation routinely; "first open-source Heidenhain↔Fanuc map" is an unverifiable and commercially irrelevant claim. The G80-one-shot vs Siemens-MCALL-modal distinction is textbook controller knowledge, not patentable.
**Hidden gap:** report admits "does NOT guarantee bit-for-bit equivalence" — so it's an *advisory* translator, which is the part nobody will pay for.

### Modal state tracking (GCodeValidationEngine, 678 L)
**VERDICT: REAL.** 678 lines, `gcode-validation-engine.test.ts` exists (report marked it "❓ not verified"). Modal tracking is genuine.
**PRIOR-ART: STRONG.** Every verification product (Vericut, Eureka) and every post processor tracks modal G/M state — this is table-stakes, not a differentiator. Marking it "NOVEL" is hype.

### Canned cycles G81–G85 + Siemens MCALL trap
**VERDICT: REAL but PRIOR-ART STRONG.** Translation logic is in the transpiler and tested. But MCALL-modal vs G8x-one-shot is documented in every Siemens 840D and Fanuc manual; this is not a novel discovery.

### Comment/feed-mode dialect lint (R1–R8, 8 rules)
**VERDICT: OVERSTATED — and internally contradictory.** The lint is real: `scripts/post-nc-dialect-lint.mjs` + `post-nc-dialect-lint.test.mjs` + hook `post-nc-dialect-guard.mjs` all exist. BUT I grep-verified that **the lint is NOT imported by `PostProcessorPipelineEngine`, `GCodeSafetyAnalyzerEngine`, or `PostEmitSafetyGateEngine`** (zero matches). So the report's "REAL-WIRED" column for all 8 rules contradicts its own footnote ("enforcement is aspirational… NOT yet wired into the pipeline P5 gate"). Honest verdict: **wired as a save-time/CLI lint, DARK to the emission pipeline.**
**PRIOR-ART: MODERATE.** Okuma `[]` vs `()` brackets and coolant/spindle ordering are in vendor manuals + every shop's post; encoding them as lint is nice engineering, not defensible IP.

### Alarm DB (2,588 alarms)
**VERDICT: GAP (as a *feature*).** The data file is **REAL** — `src/data/controller-alarm-database.json`, 1,729,801 bytes, exists. But the report itself admits "DATA-ONLY (no engine wired to P5)… FULLY-DARK (zero dispatcher case)." So as a dialect-controller *capability* it does nothing today. Honest = DARK/aspirational.
**PRIOR-ART: STRONG.** Alarm dictionaries ship with every control and every MDC/CMMS product.

### Stub-wired "leverage class" — 8 WEDM/Lathe engines
**VERDICT: GAP IN THE REPORT, NOT THE CODE — the report is WRONG.** I verified every cited method **exists and is callable**:
- `WEDMPostMitsubishiEngine.generate()` at L71 (real body: header, G90/G21, G92, T84, E-codes, units guard, thickness sanity).
- **Live proof-of-life: I invoked the compiled `dist` engine — `success: true`, 32 NC lines, dialect "Mitsubishi FA", real MELDAS output.** The `?? { note: "method not callable" }` is a *defensive coalescing fallback that never fires* because the method is real. The report mistook the existence of the fallback for proof of darkness without ever calling the method.
- Sodick/Makino/Agie/Fanuc `.generate()` all present; `UnifiedAGI.generatePost()` L699, `analyzeGCode()` L846, `validateAgainstKinematics()` L964; `Genius.generateMasterPost()` L651; `AGIOrch.generateAGIPost()` L614 — all real.
- **Tests exist for all of them:** `WEDMPostMitsubishiEngine.test.ts` (29), `MasterPostProcessorUnifiedAGIEngine.test.ts` (21), Sodick/Makino/Agie/Fanuc test files all present, plus `camDispatcher.master-post-unified-wire.test.ts` (8, a dispatcher round-trip).
- **LOC inflation:** "12K LOC" Mitsubishi = **310 lines / 12,184 bytes**; "73K" Lathe = **2,102 lines / 74,897 bytes**. Pure KB-as-LOC error.

The report's single highest-conviction claim ("8 engines NOT callable, highest-leverage fix, unlocks WEDM revenue, ~2–3 days") is **based on a false reading.** The genuine weakness is subtler (below).

### AGI-tier "14 fully-dark engines, 36K–50K LOC each"
**VERDICT: OVERSTATED.** Genius = **1,152 lines** (not 50K), AGIOrch = **1,286** (not 40K), Transformer = **1,033** (not 52K), ContinuousLearning = **741** (not 70K). And they are *not* "zero dispatcher case" — `master_post_genius_generate`, `master_post_agi_orchestrate`, `pp_transformer_generate` all have live cases (L20134+). The honest concern is **the opposite of what the report says**: these are thin (≈1K-line) engines wired behind grand "AGI" names — the risk is *vaporware-by-naming*, not buried dark leverage.

### JM .cps fleet "17 files, 4 production controllers"
**VERDICT: OVERSTATED COUNT.** `JM DIE` contains **301 `.cps` files** total; "17" is one subfolder. The machine-routing P0 gaps (Haas PRE-NGC unrouted, Roku-Roku Fanuc unrouted, FA10S mis-routed) are plausible but the report gives no test/dispatcher evidence for any "✅ live route" — they're asserted, not shown.
**PRIOR-ART: STRONG.** A shop maintaining vendor .cps posts is what Autodesk Post Hub / every Fusion seat already provides.

### Test coverage section
**VERDICT: GAP IN THE REPORT.** Its central claims are false: `PostProcessorPipelineEngine.test.ts` = "11 it / ~500 L" → actually **13 tests / 107 lines**; "transpiler ❌ 0 tests" → **26 passing**; "8 stub engines ❌ NO TESTS" → **all have test files**; "GCodeSafetyAnalyzerEngine.test.ts ✅ exists" → that exact PascalCase file is **ABSENT** (safety analyzer coverage may live in the ~200 kebab-case post/wedm test files, but the report didn't find them). The report's test audit is unreliable in both directions.

## SYSTEM-VIZ GHOST GAPS — open or closed?

- **PP-MS0 Foundation** — **CLOSED.** Pipeline, transpiler, validation, safety engines all present, dispatcher-wired, tested.
- **PP-MS6 (.cps + HTTP API bridge)** — **PARTIALLY CLOSED.** `PostLibraryEngine` + `post_library_{search,download,summary,recommend,refresh}` cases exist (L20+ region) and 301 `.cps` on disk; the HTTP-bridge half (port 3100 surface) I did not independently verify here — treat as **mostly closed, bridge unproven.**
- **PP-MS7 (Multi-CAM + machine-specific safety sequences)** — **OPEN/partial.** `PostProcessorMS7.test.ts` exists, but the machine-specific safety *sequence* enforcement is exactly the lint that is **not wired into the emit pipeline** — the safety-sequence guarantee is DARK.
- **U-CAMP14 (Post Processor AGI Unification)** — **NOMINALLY CLOSED, substantively thin.** `MasterPostProcessorUnifiedAGIEngine` + `master_post_unified_agi_*` cases + 21 tests + wire test exist. It runs; whether the "8-dim quality + provenance" is more than a scorecard is unproven.
- **U-GAP-POST-JMDIE-LEARNING** — **OPEN.** `JMDiePostProcessorLearningEngine.ts` + `.test.ts` exist, but its dispatcher case uses the same `.learnFromProgram?.()` defensive pattern and I did not get a live learning-loop proof; closed-loop learning from JM posts is **unproven (aspirational)**.
- **MISC-156 (Post Processor Maximization Roadmap)** — **OPEN** (a roadmap doc, not a shippable; nothing to "close").

## TOP 3 HONEST GAPS

1. **The safety lint is DARK to emission.** `post-nc-dialect-lint.mjs` (the 8 tribal rules — feed-mode-before-move, retract-before-toolchange, coolant ordering) is **not imported by any pipeline/safety/emit engine** (grep: zero hits in `PostProcessorPipelineEngine`/`GCodeSafetyAnalyzerEngine`/`PostEmitSafetyGateEngine`). It runs as a save-time hook/CLI only. **A program can be emitted through the dispatcher with none of these "critical" rules enforced.** This is the real, dangerous gap — and the report papers over it by marking all 8 "REAL-WIRED."
2. **No proven correctness on the ~11 non-dedicated controllers.** Fanuc/Hurco/Okuma/Haas have deep dedicated test suites; Mazak/Heidenhain/Fagor/DMG/Brother/Doosan/Citizen are config branches with no per-controller golden-NC regression shown. "14 controllers" is a code-path count, not a verified-output count.
3. **Engine robustness bug, live-caught:** `WEDMPostMitsubishiEngine.generate()` dereferences `op.type.toUpperCase()` (dist L120) with no guard — a valid `{pass}`-only operation **throws** instead of failing loud or defaulting. The fleet's own R12 ("fail loud, not crash") is violated; this class of unguarded deref likely repeats across the 5 WEDM post engines.

## TOP 2 GENUINELY-DEFENSIBLE DIFFERENTIATORS

1. **The Hurco WinMAX V11 post depth (`HurcoV11MillMasterPostEngine.ts`, 2,270 lines) backed by ~16 dedicated test files** (`HurcoV11JMDiePartsSuite`, `HurcoV11WinMaxProveOut`, `HurcoV11Coolant`, `HsmDwellPipeline`, etc.) **+ 301 real JM `.cps` posts as ground truth.** This is the one place the moat is real: a tested, prove-out-validated post for a *specific shop's specific machine fleet*, which generic Fusion/Mastercam posts do not ship. **DEFENSIBLE** — not because the tech is novel, but because the validated shop-specific corpus is proprietary.
2. **Okuma OSP dialect coverage (`OkumaOSPMillMasterPostEngine.ts`, 1,885 lines + 9 dedicated test files** incl. `JMDiePreset`, `RapidPipeline`, `HsmDwellPipeline`) with the genuinely Okuma-specific constructs (`[]` comments, super-NURBS G131, CAS, L-word arcs). Okuma OSP is under-served by mainstream post libraries, so deep, tested OSP support is **DEFENSIBLE as coverage breadth** — though the individual G-codes are vendor-documented, not inventions.

**Bottom line for the operator:** the dimension is *more real than the report's "DARK" sections suggest* (WEDM engines callable + tested, transpiler tested, live NC proven) but *less impressive than its "AGI / 50K-LOC / 14-controller / patentable" framing claims* (engines are ~1K lines, LOC figures are byte-counts, the safety lint isn't in the emit path, and nothing here is patentable over Fusion/Mastercam/ICAM). Honest completeness: dedicated-engine controllers (Hurco/Okuma/Haas/Fanuc/WEDM) are **production-grade and tested**; the remaining ~7 controllers + alarm-aware emit + closed-loop JM learning + in-pipeline safety enforcement are **DARK or aspirational**. Do not put "patentable" or the LOC numbers in front of an investor.

## closed-loop-learning

# ADVERSARIAL RE-AUDIT: Closed-Loop-Learning (Post-Processor Galaxy)

The enumeration is **directionally useful but riddled with verification failures** — it asserts "DARK/MISSING/0-tests" on claims I disproved in minutes. The auditor grepped only `camDispatcher.ts`, never opened `ppDispatcher.ts` (6,432 LOC, 802 cases), and looked for tests in the wrong directory. Net: its *gap thesis* (loop severed at the subscriber edge) is largely **correct**, but its *evidence* is wrong on ~half the rows, which means an investor relying on it would be misled in BOTH directions.

## Per-feature verdicts (verbatim format)

**1. JMDiePostProcessorLearningEngine** (714 LOC, confirmed)
1. **VERDICT: REAL.** Wired (6 cases, camDispatcher L20345–20535), real parsing (`blankCommentsAndStrings` L222, brace-balanced parse L345, `ENHANCEMENT_MARKERS` regex L143), reads real corpus `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS` which **has 17 real .cps files** (Haas/Hurco/Okuma/Roku-Roku). Auditor said "0 tests" — **FALSE: `JMDiePostProcessorLearningEngine.test.ts` = 140 expect() / 38 it()** + `knowledgeDispatcher.jmdie-post-wire.test.ts`.
2. **PRIOR-ART: WEAK.** Autodesk HSM/Fusion ships the .cps *runtime*; consultants hand-tune posts daily. *Auto-extracting* enhancement-markers from a modified-.cps corpus is a thinner novelty than claimed — it's keyword regex over source, not semantic diff. Vericut/CAMplete don't do corpus-learning, so a *narrow* DEFENSIBLE sliver exists, but "semi-supervised AST learning" oversells regex marker-matching.
3. **GAP: 17 files is not a corpus** — `CORPUS_THRESHOLD=0.5` family support over ~4 controller families means single-file families produce trivially-confident "patterns." Statistically underpowered.

**2. LathePostGeneratorActiveLearningEngine** (564 LOC)
1. **VERDICT: OVERSTATED→DARK on the loop.** Wired (7 cases, camDispatcher L20076–20122 — note auditor listed 5 cases/wrong action names; real actions are `_queue/_incorporate/_metrics/_pending/_all/_corrections/_rules_count`). Auditor "0 tests" — **FALSE: `LathePostGeneratorActiveLearningEngine.test.ts` 62 expect()/39 it() + 2 more integration test files.** But the auditor's *core* point stands: **no automated source calls `queueFailure()`** — ingestion is manual-dispatcher-only.
2. **PRIOR-ART: WEAK.** Failure-categorization + correction-proposal is what ICAM CAM-POST debug + post consultants do manually. Bayesian framing is aspirational (auditor correctly flags `EngineBeliefState` is "not explicitly Bayesian").
3. **GAP: pattern DB is hardcoded, never shop-trained.**

**3. MasterPostFineTuningEngine** (1,094 LOC)
1. **VERDICT: OVERSTATED.** Wired (6 cases L6041–6088, singleton L764). Math is real (EMA/Welford/confidence-decay). Auditor "0 tests" — **FALSE: `MasterPostFineTuningEngine.test.ts` 124 expect()/46 it().** New finding the auditor *couldn't* have caught (it claimed no tests): **the suite is 2-RED today (44/46 pass)** — `getConfidenceScore` returns a `.stability` not in `["stable","converging"]` (L353). So the one engine with the soundest math has a **live failing assertion**. The "ZERO subscribers" claim is **CONFIRMED**: only caller of `recordActualVsPredicted` outside tests/dispatcher is `MachiningIntelligenceOrchestratorEngine`, which has its *own* same-named method (L2000) fired only "when CMM/metrology observations are ingested" (L328 comment) — itself a manual edge, not a post-gen outcome subscriber.
2. **PRIOR-ART: MODERATE-WEAK.** "LoRA-class per-vendor calibration" is marketing gloss on bounded-EMA-correction; that's adaptive feedforward trim, decades old in CNC controller comp tables. No competitor auto-calibrates posts from outcomes — DEFENSIBLE *if wired* — but it isn't.
3. **GAP: nothing auto-records actual-vs-predicted; the calibrator starves.**

**4. PostProcessorAGIContinuousLearningEngine** (741 LOC)
1. **VERDICT: OVERSTATED, not "stub-wired."** Wired in BOTH camDispatcher (L20422+) AND ppDispatcher (L686). Auditor "0 tests" — **FALSE: `PostProcessorAGIContinuousLearningEngine.test.ts` 56 expect()/36 it().** The hardcoded `outcome:'success'` fallback the auditor flags is a real smell, but "stub-wired" understates the wiring.
2. **PRIOR-ART: WEAK** (generic "continuous learning" framing; no competitor analog, but no real evidence flow either).
3. **GAP: belief state never receives real production evidence.**

**5. PostProcessorDeepLearningEngine** (1,111 LOC)
1. **VERDICT: DARK on training, but auditor's "unreachable via MCP" is FALSE.** Reachable via ppDispatcher `pp_dl_recognize_patterns / _feed_opt / _classify_controller / _cycle_time / _quality_score / _analyze` (L~5680–5742) AND camDispatcher (L15122–15437). Auditor "no dispatcher wiring verified / methods unreachable" — **demonstrably wrong, it just didn't read ppDispatcher.** Auditor's *substantive* point survives: **no `train()`/backprop** — grep found only `loss:` as a config string label (L78/218/233), zero gradient/backward/optimizer. Forward passes on He/Xavier-init weights. Test = `post-processor-ai.test.ts` (exists; auditor missed it).
2. **PRIOR-ART: N/A** (it doesn't learn).
3. **GAP: "neural feed-rate prediction" runs on untrained random weights — the auditor's strongest true catch.**

**6. PostProcessorMetaLearningEngine** (1,029 LOC)
1. **VERDICT: auditor's "FULLY-DARK / never instantiated / PSO never runs" is the BIGGEST ERROR in the report.** Wired via ppDispatcher `pp_ult_meta_learning` → `engine.metaLearning()` (L5612) and ppDispatcher L474. And the math **actually executes**: real `computeGradients` (numerical, L392–404), MAML inner-loop weight updates `taskWeights[i] -= innerLearningRate*gradients[i]` (L307), FOMAML meta-gradient accumulation (L315), full PSO swarm with velocity/cognitive/social updates + clamps (L510–543). This is NOT "graduate-seminar code" — it's invoked and the loops run.
2. **PRIOR-ART: WEAK as a *moat*.** MAML (Finn 2017) + PSO (Kennedy 2001) are textbook; citing them is honesty, not novelty. No competitor does post-gen meta-learning — but running MAML on a synthetic/absent task distribution is theater.
3. **GAP: no real task distribution — MAML adapts over fabricated support sets, so "rapid adaptation to new controllers" is unvalidated.**

**7. Outcome-bus + auto-tap**
1. **VERDICT: GAP-thesis CONFIRMED, but both "missing file" claims FALSE.** `outcome-bus-auto-tap.mjs` **EXISTS** (12,345 B, May 29) and `post-gen-reward.mjs` **EXISTS** (14,015 B, May 29, **with `post-gen-reward.test.mjs`**). The auditor declared both "DOES NOT EXIST" — its headline gaps are factually wrong. **HOWEVER** the auto-tap is a generic PostToolUse telemetry hook: it appends `{slot,domain,tool,success}` for Edit/Write/Bash to `outcome-bus.jsonl`. It does **NOT** call `recordActualVsPredicted()`, `queueFailure()`, or `recordFeedback()`. So the loop *is* open at the post-learner subscriber edge — auditor right for the wrong reason.
2. **PRIOR-ART: N/A** (internal plumbing).
3. **GAP: the bus carries tool-use telemetry, not post-gen-quality outcomes routed to post learners.**

**8–11 (drift-canary / golden-NC / reward / GNN projection):**
- **post-gen-reward.mjs: REAL** (auditor said missing). Composes 4 orthogonal signals (dialect-lint, structure-gate 0.6, alarm-assoc over 2,588-alarm DB, golden Jaccard), exits 0/2/3, exports `scorePost`, **has tests**. The non-circular design is genuinely good.
- **Golden-NC oracle: GAP CONFIRMED.** No CAM-input→golden-NC triple archive in the live tree — only `PARSER_GOLDEN_SNAPSHOTS.json` (parser fixtures) and `tests/r2/golden-benchmarks.json`. So `post-gen-reward`'s golden component runs only when a ref is *manually* supplied. This is the real blocker.
- **Drift-canary: ASPIRATIONAL** — confirmed, no post-gen retrain/promote gate; `MasterPostFineTuning` state is in-memory.

## Ghost-gap status (from `mcp-server/data/roadmap-index.json`, canonical)
- **PP-MS0 Foundation → `complete`**
- **PP-MS6 (.cps + HTTP API bridge) → `complete`**
- **PP-MS7 (Multi-CAM + machine-specific safety) → `complete`**
- **U-CAMP14 (Post Processor AGI Unification):** no exact ID match; the live analog **`CAM-PARITY-AGI-MS0` is `in_progress`** ("CAM System Parity + Post Processor AGI Hardening"). Treat AGI-unification as **OPEN/in-progress**, not done.
- **U-GAP-POST-JMDIE-LEARNING:** no roadmap entry, but the **engine ships + is wired + tested + has 17-file corpus → effectively CLOSED as code, OPEN as a *learning loop*** (no auto-ingest).
- **MISC-156 (Maximization Roadmap):** no `MISC-156` ID; nearest shipped is `PIPELINE-VAR-MS0` (`complete`). The "maximization" umbrella is **partially closed** — variability-maximization done, closed-loop maximization NOT.

Net: the three foundational milestones are genuinely closed; the **AGI-unification + closed-loop-learning milestones are open**, consistent with the severed-subscriber finding.

## TOP 3 honest gaps (concrete)
1. **No automated outcome→post-learner subscriber.** Nothing calls `MasterPostFineTuningEngine.recordActualVsPredicted()` outside tests/manual dispatcher. `outcome-bus-auto-tap.mjs` carries Edit/Write/Bash telemetry, not post-gen-quality rows. The loop is open at the single most important edge — **all 4 "learning" engines starve.**
2. **No golden-NC correctness oracle in the live tree.** `post-gen-reward.mjs`'s golden component is dead unless a ref is hand-supplied; no CAM-input→golden-NC triples exist. Without ground truth you cannot *measure* whether a post improved — the reward is 3-of-4 signals (lint/structure/alarm), all proxies.
3. **"Neural" is untrained + a flagship test suite is red.** `PostProcessorDeepLearningEngine` has zero backprop (only `loss:` as a config string) — feed-rate "prediction" is random-weight forward passes. And `MasterPostFineTuningEngine.test.ts` is **2 failing (44/46)** *right now* — the soundest-math engine has a live broken `getConfidenceScore` stability contract.

## TOP 2 genuinely-defensible differentiators
1. **`post-gen-reward.mjs` non-circular reward design** (exists, tested). Scoring posts against dialect-lint + structure + a real 2,588-alarm DB (never the engine's own quality_score) is the *correct* RL-reward architecture and the alarm-association signal (data-driven from controller-alarm-database.json) is not something Fusion/CAMplete/ICAM/Vericut expose. DEFENSIBLE — *if* the golden archive lands.
2. **Corpus-grounded per-vendor calibration substrate** (JMDie real parse of 17 modified .cps + MasterPost bounded-EMA trim). Competitors ship static posts; the *capability* to calibrate per controller/operation from a real modified-post corpus is real and wired. DEFENSIBLE as a substrate — but it's a *capability*, not a *running loop*, today.

**Bottom line for the VC report:** the engines, math, dispatcher wiring, AND tests are far more real than this enumeration admits (it inverted the test-coverage finding entirely and falsely declared 2 shipped files + 2 dispatchers nonexistent). But the operative claim — *"posts compound from real shop outcomes"* — is **operationally false**: the subscriber edge is unwired, there's no golden oracle, the NN is untrained, and a flagship suite is red. This is a **wired-but-unfed** system, ~2–3 weeks from a closeable loop, not the "vaporware" the auditor's missing-file errors imply nor the "shipped feature" the original PRISM claim implies.

## safety-verification

Lint/reward test counts (26/13) verified exact. U-CAMP14, U-GAP-POST-JMDIE-LEARNING, MISC-156 are NOT in the consolidated roadmap — they exist only as system-viz ghost roosts (provenance unverifiable from roadmap surfaces). I have enough to deliver the adversarial verdict.

---

# ADVERSARIAL AUDIT — PRISM Post-Processor Safety-Verification Dimension

**Skeptic verdict on the enumeration: ~75% real, but the methodology fabricated at least one test artifact and inflated one corpus claim. The "9 patentable claims" are almost entirely prior art.** Details below, per feature.

## PER-FEATURE VERDICTS

### Core safety engines

**GCodeSafetyAnalyzerEngine** — **REAL (wired) / OVERSTATED (test claim fabricated).** Wiring confirmed: `camDispatcher.ts:6248 case "gcode_safety_analyze" → eng.analyze(...)`, real direct call. 2066 LOC confirmed. **BUT the table's "GCodeSafetyAnalyzerEngine.test.ts (59K)" does not exist** — `find` returns no such file. The engine is covered only *indirectly* via `pp-safety-playbook-live.test.ts`, `untested-engines-batch2.test.ts`, `pipeline-variability.test.ts`. The flagship 24-rule analyzer has **no dedicated unit test**, and the auditor invented a filename + byte-size for one. PRIOR-ART: G-code static safety/limit checking is **standard** — Vericut, CAMplete, ICAM CAM-POST, NX Post Builder, and even Fusion's `onLinearMove` rapid-limit guards all do modal-state + envelope + retract checks. The Okuma OSP G50 safe-start clamp is a known control requirement, not novel IP. **WEAK patent claim.**

**OmegaSafetyScoreEngine** — **REAL.** Best-built engine in the set. Confirmed: `GATE_THRESHOLD = 0.70` constant, geometric-mean with explicit `assessment.vetoed` short-circuit (veto→S=0), `MIN_GEO_FLOOR=1e-6`. 3 call sites plausible (225 LOC, dense). Test `OmegaSafetyScoreEngine.nnConfidence.test.ts` = 19 real tests (313L). **Caveat the table hides:** the NN 7th dimension defaults to `w_nn = 0` ("degenerate, no effect") — so the "supports NN-confidence as optional 7th weighted dimension" is **off by default and inert unless a caller opts in.** PRIOR-ART: scalar safety scoring with hard constraints is generic; geometric-mean-with-veto is a reasonable but not novel aggregation. **WEAK** as IP, **strong** as engineering.

**PipelineSafetyOrchestratorEngine** — **REAL (reachable).** 822 LOC (table said 31K bytes — fine). Reachable via `calcDispatcher.ts:8201` real `import + invoke`. Six-dimension risk with Kienzle/Johnson-Cook/Altintas is genuine physics. PRIOR-ART: physics-based force/chatter/deflection prediction is the entire field of Altintas's CUTPRO/MACHpro and ModuleWorks' adaptive engines. The *combination* into one orchestrator is integration work, not a defensible invention.

**PostVerificationSafetyEngine** — **REAL but the CI95 claim is statistically OVERSTATED.** Monte-Carlo is genuine: `monte_carlo(N=100)`, real `variance/std`, and a true `Cpk = min(Cpu,Cpl)` (lines 851–871). Wired at `camDispatcher:10686 → verify_full`. **However:** the CI95 is computed as `se = std/sqrt(N)` → a **confidence interval on the MEAN**, not a prediction/tolerance interval on a part. Predicting process capability requires the *spread of outcomes*, and a CI-on-the-mean shrinks with N — you can make the interval arbitrarily tight by raising iterations without changing the physical variance. **This is a methodological error that would not survive a metrology review.** PRIOR-ART: Monte-Carlo tolerance/process-capability simulation exists in Vericut Force, CGTech, and most DFM stacks.

**PostEmitSafetyGateEngine** — **REAL (wired) but fail-OPEN wrapper.** `gate()` exists (line 110), throws on bad input (fail-loud internally), singleton exported. **BUT** the dispatcher case (20228) wraps it as `(...).gate?.(ops,config) ?? { note: "gate not callable" }` and returns `success: true`. If the import shape ever drifts, **the P0 "required pre-emit gate" silently passes with no gate run.** A safety gate that can return `success:true` while not executing is the most dangerous pattern in this whole dimension. The table whitewashes this as "LazyLoad + fallback pattern." PRIOR-ART: pre-output collision/envelope gating is exactly what Vericut/CAMplete sell.

**SafetyScoreOverlayEngine** — **REAL.** Independently reachable at `camDispatcher:15991 → renderFrame` (not just engine-to-engine). 34 tests. PRIOR-ART: live safety/collision overlays are standard in every CAM simulator UI (Fusion, NX, hyperMILL itself). Calling it patentable is unsupportable.

**GCodeValidationEngine / GCodeVerificationEngine** — **OVERSTATED (no isolated test, "validation pipeline" wiring unproven).** Both files exist (678/341 LOC). Table admits "not isolated." I could not confirm a live dispatcher case routing to either by the claimed name — flagged **DARK-leaning**: "REAL-WIRED (validation pipeline)" / "(emit pipeline)" is hand-waving without a dispatcher case number. Treat as **unverified-wired** until a case is shown. PRIOR-ART: 100% prior art (every post engine validates G/M-code support per controller).

**SafetyExplanationEngine** — **REAL.** Wired at `guardDispatcher.ts:886`. 39 tests (608L). XAI-with-formula-citation is a genuinely nice touch. PRIOR-ART: thin — most competitors give pass/fail, not formula-cited reasoning. **This is one of the few mildly DEFENSIBLE items** (defensible as differentiation, weak as a patent — XAI itself is heavily prior-art'd).

**SafetyShieldEngine** — **REAL.** Wired `mlDispatcher.ts:722`. 10 tests (only 92L test file — thin coverage for a constraint framework). Generic constraint-eval; not novel.

**BayesianSafetyEngine** — **REAL.** Wired `guardDispatcher.ts:805`. 35 tests (534L). Beta-Binomial posterior is textbook. PRIOR-ART: Bayesian reliability is generic statistics; "credible vs confidence intervals" is a stats distinction, not an invention.

**SafetyPatternMinerEngine** — **OVERSTATED — the worst-inflated claim in the table.** The engine signature is `mine(programs: OkumaProgram[])` — it (a) takes a **caller-supplied array**, returns empty on `[]`; (b) is **Okuma-specific** ("Mine safety patterns from parsed Okuma programs"); (c) contains **no 160K corpus loader and no `160000` constant anywhere**. The table's "Mines safety patterns from 160K+ production CNC programs" with "(no dedicated test)" is a marketing number bolted onto an untested, single-controller, input-driven framework. **Demote to GAP-adjacent: capability is a stub framework, not a deployed corpus miner.**

**MachiningPlaybookEngine** — **REAL but count is fuzzy.** 523KB file, lazy-loaded at GCodeSafetyAnalyzerEngine:1530. Table says "296 rules" in one column and "306 tips" in the header — **internal inconsistency**; my grep returned 457 id-like hits (noisy). The rules exist; the exact count in the table is unreliable. PRIOR-ART: codified shop-practice rule sets exist (Sandvik, Harvey, Machinery's Handbook digitized) but a tribal-injection-into-G-code-lint layer is **mildly DEFENSIBLE** as product integration.

**Fusion360SafetyHooksEngine** — **REAL.** 33 tests. But "Fusion 360 hook-based pre-checks" is literally re-implementing what Fusion's own post-processor `onSection`/`onLinearMove` validation already provides — **prior art is the platform you're hooking into.**

### Stochastic / Monte-Carlo block
All rows resolve to the single `PostVerificationSafetyEngine.monte_carlo()` — they are **one feature presented as seven rows** ("Stochastic Cutting Force / Thermal / Deflection / Surface Finish" are dimensions of one MC loop, marked "(Monte-Carlo implicit)"). Real, but the row-multiplication inflates the apparent surface area. CI95 caveat above applies to all.

### Controller alarm DB
**Claim is ACCURATE and the gap is REAL.** 2,588 alarms confirmed (`totalAlarms` field). Consumed by `scripts/post-gen-reward.mjs` (real `_alarmIndex` build, lines 100–104) — my first grep missed it only because the path uses `__dirname` join. **Confirmed NOT wired into `PostProcessorPipelineEngine.ts` Phase 5** (zero alarm/AlarmDiagnostics references in that file despite a "P5: Safety + Knowledge" phase). This is the honest centerpiece gap.

### Lint/reward scripts
**REAL and exactly as claimed.** `post-nc-dialect-lint.test.mjs` = 26 tests, `post-gen-reward.test.mjs` = 13 tests — both counts exact. These are the most trustworthy artifacts in the whole enumeration. Turning-aware Okuma coolant linting is mildly DEFENSIBLE (controller-specific, real).

### Dispatcher wiring (3 actions)
All 3 cases exist at the claimed line numbers (6248 / 10686 / 20228). Two are clean direct calls; **`cam_post_emit_safety_gate` is the fail-open one** noted above.

## GHOST-GAP STATUS (open vs closed)

| Ghost | Status | Evidence |
|---|---|---|
| **PP-MS0 Foundation** | present in ROADMAP-CONSOLIDATED + MILESTONE_PROGRESS, but **no completion row** (only `APP-MS0` shows `completed_real`). Treat **OPEN/unverified** — the safety engines exist regardless of the milestone's bookkeeping state. |
| **PP-MS6 (.cps + HTTP bridge)** | in roadmap-index + consolidated, **no shipped marker found** → **OPEN.** |
| **PP-MS7 (multi-CAM + machine-specific safety sequences)** | in roadmap-index + consolidated, **no shipped marker** → **OPEN.** This is where alarm-aware/machine-specific safety would land — directly tied to the alarm-DB gap. |
| **U-CAMP14 (Post AGI Unification)** | **NOT FOUND** in any roadmap surface — exists only as a system-viz ghost roost. Provenance unverifiable → **OPEN/orphaned-claim.** |
| **U-GAP-POST-JMDIE-LEARNING** | **NOT FOUND** in roadmap surfaces → **OPEN.** No code path mines JM's modified posts for safety deltas. |
| **MISC-156 (Post Maximization Roadmap)** | **NOT FOUND** in consolidated roadmap → **OPEN/orphaned.** |

Net: **all six ghosts are open or unverifiable.** None are closed by this dimension.

## TOP 3 HONEST GAPS

1. **The flagship analyzer has no dedicated test, and the audit fabricated one.** `GCodeSafetyAnalyzerEngine.test.ts (59K)` does not exist; the 2066-LOC, 24-rule engine that anchors the entire "safety built-in" pitch is only covered incidentally. An auditor inventing a test filename + byte size means **every "(XXK)" coverage figure in the table is now suspect** and must be independently re-counted.

2. **The 2,588-alarm DB is dead weight in the safety pipeline.** It's wired into an offline reward *script* but not into `PostProcessorPipelineEngine` Phase 5 — so emitted G-code is **never cross-checked against known alarm-triggering sequences** at post time. The single most valuable, hardest-to-replicate asset (13-controller alarm corpus) does zero safety work in the live emit path.

3. **`cam_post_emit_safety_gate` can return `success:true` without running the gate** (`gate?.(...) ?? {note}`), and the Monte-Carlo "CI95" is a confidence-interval-on-the-mean masquerading as a process-capability prediction. Both are silent-failure / false-confidence classes — a safety gate that no-ops green and a statistic that tightens with iteration count rather than physical variance. Plus SafetyPatternMiner's "160K programs" is an Okuma-only, untested, input-driven stub with no corpus loader.

## TOP 2 GENUINELY-DEFENSIBLE DIFFERENTIATORS

1. **Multi-component non-circular reward with a 13-family / 2,588-alarm DB grounding (`post-gen-reward.mjs`, 13 tests, exact).** Tying emitted-code scoring to a real per-controller alarm corpus + golden-Jaccard, with renormalization for controller families lacking universal codes, is integration no named competitor (Vericut/CAMplete/ICAM/MP) ships — they verify *motion*, not *emitted-code-vs-alarm-likelihood*. Defensible as product, weak as patent.

2. **Per-dimension XAI safety explanation with cited physics formulas (`SafetyExplanationEngine`, wired guardDispatcher:886, 39 tests).** Competitors return pass/fail or a collision frame; formula-cited per-dimension reasoning (Kienzle/Johnson-Cook/Altintas/Coulomb) is a real UX/trust differentiator. Defensible as differentiation; XAI-as-concept is prior-art, so not patentable.

**Bottom line on the investor claim "Safety + Verification Built-In":** the *capability* is genuinely built-in and mostly wired — but the enumeration's "HONEST & CONSERVATIVE" self-grade is itself **not conservative**: it fabricated a test artifact, inflated a corpus number 160,000×-over-reality, sold a CI-on-the-mean as Cpk prediction, and labeled 9 prior-art-saturated items "patentable." The defensible story is narrower and stronger than the one being told: *grounded alarm-aware reward + formula-cited XAI*, not "9 novel claims."

Relevant files: `H:\prism\mcp-server\src\engines\PostEmitSafetyGateEngine.ts`, `H:\prism\mcp-server\src\engines\PostVerificationSafetyEngine.ts` (lines 772–883), `H:\prism\mcp-server\src\engines\SafetyPatternMinerEngine.ts` (line 123), `H:\prism\mcp-server\src\engines\PostProcessorPipelineEngine.ts` (Phase 5, line 271), `H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts` (lines 6248/10686/20228), `H:\prism\scripts\post-gen-reward.mjs`.

## agi-unique

Confirmed: `getPostProfile` exists (2 hits), `learn` exists (4 hits) — so the fallback cases for lathe/jmdie resolve to REAL methods, not the stub note. And there are **232 distinct post-domain actions** wired, not the ~15 the report implies are real. I have a complete, verified picture. Writing the adversarial assessment.

---

# SKEPTICAL ASSESSMENT — "agi-unique" post-processor dimension

The enumeration's central thesis ("9 AGI engines = 328K LOC, 0 dispatcher surface, non-functional") is **false and is the report's biggest defect**. I verified wiring against the live `camDispatcher.ts`, the engine files, and the test suite. The grep that produced the report's "FULLY-DARK" column was simply run against the wrong target — 8 of the 9 "fully-dark" engines have real `case` statements. Per-feature verdicts below; only file/line/test facts, no faith.

## Per-engine verdicts (the 9 named differentiators)

| Engine | Report said | VERDICT (verified) | Evidence |
|---|---|---|---|
| **MasterPostProcessorUnifiedAGIEngine** | FULLY-DARK, 0 cases, "showpiece unreachable" | **REAL (overstated-dark)** | 3 real cases `master_post_unified_agi_{generate,analyze,kinematics}` @ camDispatcher L20144-20161; methods are real public impls (L699/846/964); singleton exported L1666; **26-test suite PASSES** — live run emitted "35 lines, quality=100, time=1ms". This is wired AND tested. |
| **GCodeUnderstandingTransformerEngine** | FULLY-DARK | **DARK→partial** | 2 camDispatcher refs (not 0). Needs case-body check, but the "0 cases" claim is false. |
| **GCodeReverseCADEngine** | FULLY-DARK | **OVERSTATED** | 3 camDispatcher refs (not 0). |
| **MachineFingerprintEngine** | "file not located / STUB or DARK" | **GAP in report** | File exists (`MachineFingerprintEngine.ts`, 15.2K); 3 camDispatcher refs. Report couldn't even find the file — a research failure, not a finding. |
| **CrossCAMPostEngine** | FULLY-DARK, 0 cases | **REAL** | 7 cases: `cross_cam_{recommend,synthesize,post_normalize,post_enhance,post_subprograms,post_multichannel,post_automation}` (L6145-6168, L20474-20496). Flatly not dark. |
| **HybridPostMergeEngine** | FULLY-DARK | **DARK — confirmed** | **0 refs in ANY dispatcher** (verified `grep -rln` across `src/tools/`). The one engine the report got right on dark-ness — but by luck, since it lumped it with 8 wired ones. |
| **NovelPostProcessorBridgeEngine** | FULLY-DARK | **OVERSTATED** | 6 camDispatcher refs (not 0). |
| **PostProcessorTransformerEngine** | FULLY-DARK | **OVERSTATED** | 3 camDispatcher refs (not 0). |
| **PostProcessorAGIContinuousLearningEngine** | FULLY-DARK | **OVERSTATED** | 8 camDispatcher refs (not 0). |

**Score: report claimed 9/9 fully-dark; reality is 1/9 dark (HybridPostMerge). 8 of 9 are wired.** The report's headline number is wrong by ~800%.

## The pattern the report mis-attributed

The report condemns a "`.method?.()` fallback = dark-in-practice" stub pattern and assigns it to only 8 WEDM/lathe engines. **It is systemic: 105 cases in camDispatcher use `(engine as any).method?.(params) ?? {note: "not callable"}`** — including the report's own "REAL-WIRED showpiece" UnifiedAGI (L20146). So the report applies two different standards to the identical code shape. Verified the fallbacks actually resolve to real methods where I sampled:
- WEDM `generate()` — exists on all 5 engines (report said "0 real methods exposed": **false**).
- Lathe `getPostProfile()` — exists (2 defs).
- JMDie `learn()` — exists (4 defs).

These return real data, not the stub note. The report's "dark-in-practice, returns stub string" is **OVERSTATED** for WEDM/lathe/JMDie. The legitimate criticism — which the report buries — is the `as any` cast + silent `?? {note}` fallback is a **fail-soft anti-pattern that hides genuine method-name drift** (R12 violation: a typo'd method name returns `{note}` with `success:true`).

## Count corrections (the report's "investor-grade" numbers are stale)

| Report claim | Verified |
|---|---|
| "camDispatcher 155 post/pp/ppg cases" | **2476 total cases**; **232 distinct post-domain actions** (`master_post*/pp_*/post_*/gcode_*/wedm_post*/lathe_post*/jmdie_post*/cross_cam*`) |
| "2185 actions / duplicate-key test passes" | ACTIONS set has a **live duplicate-key regression** — `camDispatcher.master-post-unified-wire.test.ts` FAILS (`Set size 2184 ≠ length 2185`). A real bug the report missed entirely. |
| JMDie learning "1 case, rest dark" | **7 cases** (learn, get_corpus, aggregate, enhancement_ranking, stats, gap_report, recommendations) |
| ".cps corpus" (PP-MS6) | **14,469 `.cps` files** present — foundation is real (mostly under a worktree path, a separate hygiene issue) |

## Prior-art / patentability (IP reality check)

The "8 novel/patentable claims" do not survive a prior-art pass. **None is DEFENSIBLE as a patent**; most are WEAK:

1. **Cross-CAM post unification** — WEAK. **ICAM CAM-POST** and **Autodesk Post Hub / Machining cloud** are explicitly CAM-agnostic post surfaces; that's their whole business. Not novel.
2. **Transformer / NL→G-code** — WEAK as a patent (architecture is public art, GPT-class code-gen is prior art everywhere), though uncommon *in commercial posts*. Not defensible.
3. **Bidirectional G-code↔CAD (residual stock)** — WEAK. **Vericut** and **Eureka Virtual Machining** reconstruct in-process stock from NC as their core function. PRISM's "ReverseCAD" is a thin (12.8K) re-derivation; Vericut does it at production grade.
4. **Continuous closed-loop learning from shop outcomes** — WEAK as IP (ML-on-telemetry is broad prior art); the *data* (JM outcomes) is the moat, not the method.
5. **24 safety rules × 6 controllers** — WEAK. **Vericut** + **ICAM** + every post's safety blocks do limit/retract/coolant-ordering checks.
6. **Physics-integrated emit (Kienzle/Taylor/Tlusty in the post)** — this is the **one genuinely uncommon** capability. Fusion/Mastercam/NX posts are formatters; they do NOT run cutting-force/SLD/deflection physics inside the post. **DEFENSIBLE as a differentiator** (not necessarily a patent — the formulas are public — but as a product moat, yes).
7. **Tribal citation linked to G-code blocks** — uncommon, but it's a documentation feature, trivially copyable, not patentable. WEAK.
8. **Per-shop symbolic regression of Kienzle kc** — **DEFENSIBLE as a moat** *only if the data exists and the loop is closed* — which it is not yet (see top gap).

## Ghost-gap milestone status (verified against roadmap-index + envelopes)

- **PP-MS0 Foundation** — implicitly CLOSED (production posts + pipeline are real-wired).
- **PP-MS6 (.cps + HTTP API bridge)** — envelope exists; sub-task `POST /api/post-process` shows `"status":"complete"`. **CLOSED** (at least partially); the report's framing of it as open is wrong.
- **PP-MS7 (Multi-CAM + machine-specific safety)** — envelope exists; sub-task `Mastercam .pst + NX TCL templates` shows `"status":"complete"`. **CLOSED/partial**.
- **U-CAMP14 (AGI Unification)** — the UnifiedAGI engine is wired+tested, so the build is **effectively done**; envelope not separately located (may be folded under PP-MS*). Treat as **CLOSED-pending-doc**.
- **U-GAP-POST-JMDIE-LEARNING** — engine wired with 7 actions and a real `learn()`; **OPEN-but-mostly-built** — the gap is the *loop is not closed on live data*, not the wiring.
- **MISC-156 (Maximization Roadmap)** — meta/tracking item, **OPEN** (the wiring-completeness and dup-key cleanup belong here).

Net: the report says these ghost gaps are open and the dimension is "non-functional." The envelopes say PP-MS6/MS7 sub-tasks are `complete` and UnifiedAGI is tested. **The report over-states open-ness as badly as it over-states dark-ness.**

## TOP 3 honest gaps (concrete)

1. **The 105-case `(engine as any).method?.() ?? {note:"not callable"}` fail-soft pattern.** This returns `success:true` with a `{note}` payload when a method name drifts — a silent-no-op class bug across the entire post tail (L19955-20540+). No schema validates that the action actually produced G-code. This is the real systemic risk, and the report mislabeled it as "8 engines dark" instead of "232 actions with no fail-loud contract."
2. **Live duplicate-key regression in the ACTIONS enum** (`Set 2184 ≠ length 2185`) — the wiring test is RED right now. A duplicated action key means one of two same-named actions is unreachable. The report's "2185 actions" cited the broken number as if healthy.
3. **Machine-routing, not engine-existence, is the bottleneck — and the report's own number is unverified.** "~6 live `machine_model→engine.generate()` routes vs 824 DB machines" is the one true structural gap, but it's sourced from a 2026-05-29 audit, not re-verified here. The closed-loop learning engines (JMDie/ContinuousLearning) are *wired* but I found **no evidence the loop runs on live JM data** — they're plumbed, not fed.

## TOP 2 genuinely-defensible differentiators

1. **Physics-integrated emit** (`PostProcessorPipelineEngine` 218K, 38-stage, Kienzle/Taylor/Tlusty/deflection/CI95 in the post path) — REAL-WIRED, and competitors' posts are pure formatters. This is the actual moat. Defensible as product capability, not patent.
2. **4 production posts live on real JM machines** (Hurco V11 @ L6713 with a full typed param contract, Okuma OSP/B250, Mitsubishi MV1200R) — verified real-wired with concrete typed inputs. This is the credible "it actually cuts metal" proof point. Everything labeled "AGI" is downstream of these.

**Bottom line for the operator:** the enumeration inflates the *darkness* (claimed 9 dark, real 1) as aggressively as a hype deck inflates capability — it is hype in reverse, equally dishonest. The true story is narrower and more defensible: one real physics-emit moat, four real production posts, a systemic fail-soft wiring smell across 105 cases, and one red dup-key test. Wire-completeness is ~70-90% on the post domain, not the ~5% the report implies.

## cps-and-generator

Confirmed. Hurco `generateProgram` does real block-by-block G-code emission. The alarm DB is real (59,409 lines, ~2,588 alarms) but **0 references in the pipeline** — the enumeration's own "underused — not wired into P5" caveat is correct. I have everything needed.

---

# ADVERSARIAL VERDICT — CPS-AND-GENERATOR DIMENSION

The enumeration is ~70% structurally accurate but contains **three material fabrications** that would embarrass you in front of an investor or IP counsel: a non-existent flagship test, a fabricated production-`.cps` table, and a self-contradicting dark/wired classification. Verdicts below, then ghost-roost status, then the honest top-3 gaps + top-2 defensible differentiators.

## PER-CLAIM VERDICTS

### Tier-1 Master Post Engines

**MasterPostProcessorEngine (902 LOC) — REAL.** Exists, wired at `camDispatcher.ts:6700` (`master_post_process`), calls `.process()`. LOC accurate. **PRIOR-ART: WEAK.** Autodesk Fusion's post engine, Mastercam MP, and ICAM CAM-POST all do multi-CAM-aware emission. "Multi-CAM unification" is not novel — every CAM vendor's post kernel ingests a neutral toolpath IR. **Not defensible as stated.**

**PostProcessorPipelineEngine (4,930 LOC) — REAL (wired) / OVERSTATED (capability).** Wired at `camDispatcher.ts:490, 7324, 12165`. The "38-stage" structure exists. But "P4 stochastic CI95 Monte Carlo per block" and "P1 Kienzle/Taylor physics" being *load-bearing in actual emission* is unverified — I found no live test exercising the 38-stage path end-to-end on real toolpath data. **PRIOR-ART: PARTIAL.** No competitor folds Kienzle/Taylor force physics into the post stage — they post geometry, physics lives upstream in CAM. *This specific fusion* is the one arguably-defensible idea (see differentiators).

**MasterPostProcessorUnifiedAGIEngine (1,666 LOC) — REAL.** `generatePost()` @L699, `analyzeGCode`, `validateAgainstKinematics` all exist and are wired (`master_post_unified_agi_*` @L20144-20157). The "14 controllers × 19 CAM" is profile *config*, not 14×19 tested paths. **OVERSTATED scope, REAL wiring.**

**MasterPostFineTuningEngine (1,094 LOC) — REAL (framework) / OVERSTATED (claim).** Wired (6 `master_post_fine_tune_*` cases @L6041-6083). But the "LoRA-class learner / retrains on production feedback" claim is **FRAMEWORK ONLY** — the enumeration itself admits "no live tuning data yet." Calling a feedback-recording struct "LoRA-style" is hype; there is no gradient/adapter training here. **PRIOR-ART: WEAK** — ModuleWorks and Fusion's Machining Extension do telemetry-driven parameter adjustment.

**HurcoV11MillMasterPostEngine (2,270 LOC) — REAL.** This is the strongest claim in the document. Wired @L6713, `generateProgram()` does genuine block-by-block emission (verified: `gcode.push("O...")` at L726+), seals output via `sealMasterPostOutput`. Real `.cps` exists (`HURCO_VM30i_PRISM_v11.cps`, 813KB). **DEFENSIBLE** only as a *specific tuned Hurco/WinMAX dialect with embedded JM tribal rules* — the engine architecture is not novel, the embedded shop-specific knowledge is the moat.

**OkumaB250LatheMasterPostEngine (785 LOC, NOT the implied larger) — REAL, wired @L6760/6975.** Claim accurate including the LB250II-hardwired caveat.

**OkumaOSPMillMasterPostEngine (1,885 LOC) — REAL, wired @L6815/6951.** Accurate.

### G-Code Core (12 engines)
All 13 files **EXIST** with accurate LOC. All show import/case wiring. Verdict **REAL (wired)** for existence — BUT **OVERSTATED on test coverage**: the table shows "—" (no test) for 9 of 13, and the 4 with tests are real. **PRIOR-ART on the headline ones:**
- `GCodeTranspilerEngine` (cross-controller Fanuc↔Okuma↔Siemens) — **Mastercam, CAMplete TruePath, and ICAM all transpile between controller dialects.** Not novel.
- `GCodeReverseCADEngine` (G-code→CAD) — **Vericut and CGTech reverse-engineer geometry from NC; multiple academic + commercial tools exist.** Not novel, REAL+tested though.
- `GCodeSafetyAnalyzerEngine` — see fabrication #1 below.

### Controller-Specialist (8 "stub-wired")
**WEDM 5 engines (Mitsubishi/Sodick/Makino/Agie/Fanuc) — REAL.** All exist (268-310 LOC each), all have real `generate()`/`parse()`, all wired with **4 cases each** (not "single case" — I count `wedm_post_*_generate/parse/tech_table/dialect` @L19955-20065 = 20 cases / 5 engines). The enumeration UNDERSELLS these — they're more wired than claimed. **PRIOR-ART: MODERATE** — WEDM post generation is niche; Fusion/Mastercam do have wire-EDM posts but tech-table (E-code) introspection per-machine is thinner in the market. Marginally defensible.

**Lathe/JMDie learning engines (3) — DARK-IN-PRACTICE, accurately classified.** Single-method dispatch cases, real methods. Verdict matches.

### AGI-Tier (14 "FULLY-DARK") — **FABRICATION #2 (self-contradiction)**
**FALSE for at least 3 of the 14.** The enumeration says `MasterPostProcessorGeniusEngine` and `MasterPostProcessorAGIOrchestrationEngine` have "0 dispatcher cases / aspirational / not callable." **WRONG** — echo wired them on 2026-05-25:
- `master_post_genius_generate` @L20134 → `generateMasterPost()` **exists @ Genius:651**
- `master_post_agi_orchestrate` @L20139 → `generateAGIPost()` **exists @ AGIOrch:614**
- `pp_transformer_generate` @L20165 → `generate()` **exists @ Transformer:755**

So the correct verdict is **REACHABLE-BUT-HOLLOW**, not dark: the cases use `engine.method?.(params) ?? {note: "not callable"}` — they're wired but pass raw `params` with no schema, and return whatever the engine does (untested, no real-data proof). The audit drew its "dark" line in the wrong place and contradicted its own dispatcher scan. The *other ~11* (CrossCAM, Novel, Hybrid, FusionSync, MachineFingerprint, Trainer, AdvancedPostPhysics, etc.) — I did not find cases, so **DARK is plausible for those**, but given the audit was wrong on 3 of 3 it checked, its "14 dark" count is **not trustworthy**.

### CPS Parser engines (3) — REAL. Accurate (data-only/mapper classification fair).

## THE THREE FABRICATIONS (concrete)

**FABRICATION #1 — `GCodeSafetyAnalyzerEngine.test.ts` does not exist.** Cited TWICE as the flagship "COMPREHENSIVE (67K safety gate)" test. No such file. The analyzer IS referenced in 4 *other* tests (`pp-safety-playbook-live.test.ts`, `untested-engines-batch2.test.ts`, etc.) so it has *some* coverage — but the named headline test is invented, and "67K" is the engine's **byte size mislabeled as test scope** (it recurs as "67K" three times for three different things).

**FABRICATION #2 — the production-`.cps` fleet table.** Claims "12 `.cps`, ~350-550 lines each" at paths like `Hurco_*.cps`, `Okuma_Lathe_*.cps`. Reality: **17 `.cps`** in `PRISM MODIFIED POST PROCESSORS/`, sized **16KB–885KB** (these are full hand-modified Autodesk posts, NOT 450-line engine emissions). The "LTH-01..07 = 7 Okuma lathe posts" row is **invented** — there's one Okuma lathe modified-post family. Separately, the 301 *other* `.cps` in JM DIE are **stock vanilla Autodesk posts** (`haas st-10.cps`, `fanuc turning.cps`), miscountable as "PRISM capability."

**FABRICATION #3 — Haas/Roku-Roku "ABSENT, P0 GAP, no post."** **FALSE.** `HAAS_VF2_-Ai-Enhanced (iMachining).cps` (182KB) and `Roku-Roku-Ai-Enhanced.cps` (217KB) both sit in `PRISM MODIFIED POST PROCESSORS/`. The real gap is narrower: no PRISM *engine* emits these (they're hand-modified Autodesk posts) and no `master_post_by_machine` route exists. The audit overstated the gap into a falsehood.

## GHOST-ROOST STATUS

- **PP-MS0 Foundation — CLOSED.** Core pipeline + master post engines wired and emitting.
- **PP-MS6 (.cps + HTTP API bridge) — PARTIALLY OPEN.** `.cps` parsing real (3 CPS engines); `sealMasterPostOutput` real. HTTP bridge (port 3100) exists per CLAUDE.md but I did not verify a `.cps`-specific HTTP route — **treat as OPEN/unverified for the .cps-over-HTTP claim.**
- **PP-MS7 (multi-CAM + machine-specific safety sequences) — OPEN.** `master_post_by_machine` exists but routes only ~6 machines; "machine-specific safety sequences" rely on the alarm DB which is **0-wired into the pipeline** (verified: `grep controller-alarm-database PostProcessorPipelineEngine.ts` = 0). Safety-per-machine is aspirational.
- **U-CAMP14 (Post Processor AGI Unification) — REACHABLE but HOLLOW.** The `master_post_unified_agi_*` + `master_post_genius/agi_orchestrate` cases close the *wiring* portion (echo 2026-05-25, spec `POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md` exists). But "unification" is config + optional-chained calls, not validated. **Wiring CLOSED, validation OPEN.**
- **U-GAP-POST-JMDIE-LEARNING — OPEN (framework only).** `JMDiePostProcessorLearningEngine` + `MasterPostFineTuningEngine` wired, but zero production feedback loop. No learning has occurred.
- **MISC-156 (Post Processor Maximization Roadmap) — OPEN.** Roadmap item, not a deliverable.

## TOP 3 HONEST GAPS

1. **Almost nothing here is tested on real toolpath data.** 9 of 13 G-code core engines show no test; the 38-stage physics pipeline has no live end-to-end emit test; the AGI cases pass raw untyped `params` with `?? {note:"not callable"}` swallowing failures silently. The audit's own "test coverage" column is mostly "—". You can emit a Hurco/Okuma `.cps`, but you cannot *prove* the physics/safety stages do anything to the output.

2. **The alarm database (2,588 alarms / 59,409 lines) is dead weight — 0 references in the pipeline.** The single most valuable safety asset in the dimension is not wired into the P5 safety phase. The "post-gen safety gate" claim rests on `GCodeSafetyAnalyzerEngine`'s 24 hardcoded rules, not the 2,588-alarm corpus.

3. **Machine coverage is ~6 of 824 registry machines (<1%).** Every "auto-generate posts in seconds" claim collapses to: 2 Hurco/Okuma mill engines + 2 Okuma lathe + 5 WEDM dialects. The other 818 machines fall back to a generic path. The investor headline "$2-10K/weeks → seconds" is only true for the handful of machines someone already hand-built an engine for.

## TOP 2 GENUINELY-DEFENSIBLE DIFFERENTIATORS

1. **Physics-folded-into-post emission (Kienzle/Taylor force + wear at the *post* stage, per-block).** No named competitor (Fusion, Mastercam MP, ICAM, CAMplete, NX Post Builder, Vericut) computes cutting-force/tool-wear physics *inside the post processor* — they post pure geometry; physics lives upstream in CAM speed/feed. PRISM's `PostProcessorPipelineEngine` P1/P2 stages are architecturally distinct. **Defensible IF you can prove (with a live emit + numbers) the physics actually alters the output** — which is currently unproven.

2. **Shop-specific tribal-knowledge embedding in a real dialect emitter (Hurco/WinMAX V11 + JM Die rules).** The *architecture* is not novel, but a post that emits coolant-before-spindle ordering, UltiMotion trajectory tags, and 20+ JM-specific machine quirks as first-class rules — verified real in `HurcoV11MillMasterPostEngine.generateProgram()` — is a genuine moat *as embedded domain data*, not as patentable algorithm. The defensibility is the curated shop knowledge, not the code.

**Bottom line:** The dimension is REAL where it's small (Hurco/Okuma/WEDM emit working `.cps`) and HYPE where it's big (AGI unification, LoRA learning, 38-stage physics, 169-action surface). Three fabrications (phantom flagship test, invented `.cps` table, false "machine absent" gaps) mean the audit's confidence label "HIGH — all paths verified on disk" is itself the largest unverified claim in the document.

## cam-bridges

I have enough to write the adversarial audit. PP-MS6 (3/3) and PP-MS7 (5/5) are envelope-complete; U-CAMP14 has a live contradiction (envelope flipped complete, but `agent-3.json` flags "test coverage incomplete / still incomplete"). I'll now deliver the verdict.

---

# ADVERSARIAL AUDIT — cam-bridges dimension (PRISM post-processor generator)

**Bottom line up front:** The enumeration is *directionally* honest (it self-flags stub-wiring and gives a qualified 5/10 on the headline claim) but it is built on **two fabricated/stale load-bearing facts** that inflate the "bottleneck" narrative in the wrong direction, and it credits "REAL-WIRED + tested" to engines whose tests only check envelope *shape*. Net: the dimension is **more real than the routing section claims, but less proven than the generation section claims.**

## Per-claim verdicts (verbatim format)

**Fusion360MillTurnBridgeEngine** — VERDICT: **REAL.** File (274 L), test exists, 46 assertions, passes (ran live). PRIOR-ART: WEAK — Autodesk Fusion's own mill-turn post + NX Post Builder already do sub-spindle handoff and constant-volume threading; the "patent-class" tag is unsupportable. Constant-volume thread scheduling is textbook (every lathe post does CSS thread passes). GAP: it *catalogs archetypes + validates handoff geometry*; it does not emit a sub-spindle program.

**HyperMillCodeGeneratorEngine** — VERDICT: **REAL** (992 L, dispatcher actions `hypermill_code_generate`/`_templates` confirmed). PRIOR-ART: WEAK — hyperMILL's own Automation Center + OPEN MIND's API already generate AC Python; PRISM generates *into* their format. The novel-ish part (NL→AC-Python) overlaps Fusion's text-to-toolpath and is not defensible as patent.

**CrossCAMPostEngine** — VERDICT: **OVERSTATED/DARK-leaning.** Methods exist (`normalizeInput` @428, all 6 confirmed) and 5 dispatcher cases are wired — BUT via the `engine.method?.(...) ?? {note:"not callable"}` defensive pattern, AND **the enumeration's claimed `CrossCAMPostEngine.test.ts` does not exist.** The only "CrossCam" test is `CAMX-MS0.3-U-CAMX10-CrossCamRecommender.test.ts` — a *different* engine. So the 1441-line "normalize→enhance→emit" flagship has **zero direct test coverage**. PRIOR-ART: ICAM CAM-POST and CAMplete TruePath are literally the commercial "one neutral toolpath → many controllers" products. NOT defensible.

**CpsPostParserEngine** — VERDICT: **REAL** (909 L, `cps_parse`/`_batch`/`_summary` wired). PRIOR-ART: Autodesk owns the `.cps` format and ships the post editor that reads them; parsing them regex-only is convenient, not novel. "Patentable" — NO.

**BobCAD / Esprit / CATIA / Cimatron bridges** — VERDICT: **OVERSTATED.** Real `fetch()` HTTP-client code exists (confirmed BobCAD port 18380, Esprit fetch). But these are **clients to a CAM-side add-in that is not in this repo** — nothing here proves an end-to-end extraction ever ran against live BobCAD/ESPRIT. "REAL-WIRED" = "the HTTP client compiles," not "it drives the CAM system." Mark every bridge unproven until there's an integration test or a captured live response. PRIOR-ART: each CAM vendor ships its own automation API; a thin HTTP client over it is not defensible.

**MasterPostProcessorUnifiedAGIEngine (the "266-pair" claim)** — VERDICT: **OVERSTATED.** Methods exist (`generatePost` @699), 5 actions wired (also via `?.()`), test has 98 assertions and passes. BUT "14 controllers × 19 CAM = 266 pairs in one engine" is a **capability-surface count, not 266 validated pairs.** There is no 266-cell coverage matrix test. The number is marketing. PRIOR-ART: ICAM/CAMplete sell exactly this matrix, validated per-pair on real machines.

**PostProcessorPipelineEngine (7-phase / P4 CI95)** — VERDICT: **OVERSTATED.** Wired + 13 tests pass — but the tests are **shape assertions**: "supplies a string output_gcode field (**may be empty**)", "returns an array of StageResult objects." A pipeline that emits empty G-code passes this suite. "Tested + works on real data" is not supported; "tested for envelope shape" is. P4 stochastic CI95 in a post is unusual but unverified as correct.

**Hurco V11 / Okuma OSP / Okuma B250** — VERDICT: **REAL** — these are the genuinely strong nodes. HurcoV11 has 7 separate pipeline test files incl. byte-equivalence regression; Okuma OSP has 8 (incl. JMDiePreset, SidecarIntegration). This is real dialect work. PRIOR-ART: DEFENSIBLE-ish only as *JM-specific tribal calibration* (M140 Z-retract, OSP bracket-comment purity, G05.3) — the dialects themselves are vendor-public, but the byte-golden regression against JM's own proven posts is a real moat.

**5× WEDM posts (Mitsubishi/Sodick/Makino/Agie/Fanuc)** — VERDICT: **REAL** — all 5 have dedicated test files (confirmed). PRIOR-ART: each EDM vendor ships its own post; defensible only as breadth-in-one-tool.

**LathePostProcessorAIEngine** — VERDICT: **OVERSTATED** (enumeration's own "stub-wired, `?.()` masks real methods" is accurate; the 73K "largest dark engine" framing is fair).

**GibbsCAM / TopSolid / Cimco** — VERDICT: **GAP/honest** — enumeration correctly marks index-only / verification-only. No inflation here.

## The fabricated/stale facts that break the routing section

This is the core puncture. The enumeration's **"Machine Routing 2/10 — THE BOTTLENECK, 4 P0 gaps, 824-machine DB vs ~6 routes"** is mostly false:

1. **"824 machines DB" / "820 other machines with no auto-post" — FABRICATED.** There is no `MachineRegistry` of 824 machines. The real `JM_DIE_CONTROLLER_MAP` (`mcp-server/src/data/jm-die-profile.ts:238`) is **21 machines**, 16 with assigned `.cps` posts. The "99% of fleet has no auto-post" line is a phantom built on a number that does not exist in the code.

2. **"Haas PRE-NGC: NO ROUTE, hard-reject, P0" — STALE/FALSE.** VMC-03 and VMC-04 both carry post_processor `.cps` files in the map (`HAAS_VF2_-Ai-Enhanced_(iMachining).cps`, `HAAS_OM-2_PRE-NGC_PRISM.cps`), and `HaasNGCMillMasterPostEngine` is dispatcher-wired (`camDispatcher.ts:7040`). The gap was already closed.

3. **"Mitsubishi sinker EDM: generic-only, P0" — FALSE.** EDM-01/EDM-02 both have assigned `.cps` posts.

4. **"FA10S mis-routed to M700V dialect, P0" — UNSUPPORTED.** `JmDieMachineConfigEngine.ts:374` assigns FA10S → `MITSUBISHI_FA10S_W31MV-2_PRISM.cps` (correct; 3 firmware variants exist on disk). M700V belongs to the *MV1200R* engine, a different machine.

**The one real routing gap:** VMC-05 Roku-Roku HC 658-II (Fanuc 31i-B5) genuinely has no post (`no_post_available`). That is **1 gap, not 4 P0s** — and it's a single Fanuc-mill post, ~days of work, not a "6-week sprint."

## Ghost-milestone status check
- **PP-MS0 Foundation** — implied complete (foundation engines all present/tested). CLOSED.
- **PP-MS6 (.cps + HTTP bridge)** — `ROADMAP-CONSOLIDATED.md:1502` = **3/3 complete.** CLOSED.
- **PP-MS7 (multi-CAM + machine-specific safety)** — `:1503` = **5/5 complete.** CLOSED (GCodeSafetyAnalyzer + dialect-purity rules back it).
- **U-CAMP14 (Post AGI Unification)** — **CONTRADICTION/OPEN.** Envelope flipped complete (graph node confirms), but `state/shared/specs/misc-tasks-scan/agent-3.json:137,140` flags "test coverage incomplete / still incomplete." The UnifiedAGI engine exists + passes its test, but there is no 266-pair coverage matrix — agent-3 is right; the *unification claim* is under-tested. OPEN.
- **U-GAP-POST-JMDIE-LEARNING** — partially real (`JMDiePostProcessorLearningEngine` + `MasterPostFineTuningEngine` exist), but "learns from JM-modified posts" is unproven as a closed loop (no live retrain evidence). OPEN.
- **MISC-156 (Post Maximization Roadmap)** — advisory/open; this enumeration is essentially the audit for it.

## TOP 3 honest gaps
1. **The "CAM-lock-in broken" claim has zero per-pair validation.** 266 is a multiplication of two list lengths, not 266 tested CAM→controller programs. No coverage matrix, and the one engine that would prove it (CrossCAMPost) has **no test file at all**. This is the real hidden gap — not machine routing.
2. **Every CAM bridge (BobCAD/Esprit/CATIA/Cimatron) is an unproven HTTP/COM client** — the actual automation lives in CAM-side add-ins not in this repo, with no captured live round-trip. "9 CAM systems wired" should read "9 CAM HTTP clients compiled."
3. **The `?.() ?? {note:"not callable"}` dispatcher pattern is pervasive on the flagships** — it means a future engine-API drift returns a success envelope with a "not callable" note instead of failing loud. This is a silent-degradation surface across UnifiedAGI + CrossCAM (8+ actions).

## TOP 2 genuinely-defensible differentiators
1. **JM-specific byte-golden post regression (Hurco V11 + Okuma OSP).** 7 + 8 dedicated test files including byte-equivalence vs JM's proven `.cps` golden posts, encoding real tribal fixes (M140 Z-retract, G05.3 smooth, OSP bracket-comment purity). A competitor's generic post does NOT carry one shop's validated quirks — this is the actual moat, and it's understated in the enumeration.
2. **Breadth-in-one-tool across mill + lathe + 5 WEDM dialects + sinker, all with real tests, behind one MCP dispatcher.** No single competitor (ICAM/CAMplete are mill/multiaxis-centric; EDM vendors are siloed) spans mill+lathe+wire+sinker in one programmable surface. DEFENSIBLE as integration breadth — not as any individual algorithm.

**One-line correction to the enumeration's own score:** Machine Routing is not 2/10 — the data shows ~16/21 JM machines routed with real posts and the 4 "P0s" mostly closed/false, so routing is roughly **7/10 with 1 real gap (Roku-Roku)**. Conversely, "Post Generation 6/10" is generous given the flagship-engine test coverage is shape-only and CrossCAM is untested — call it **5/10**. The bottleneck the audit names (routing) is the wrong one; the real bottleneck is **proof-of-correctness on the cross-CAM matrix**.


# PATENT-NOVELTY CHALLENGE

Confirmed: 105 fail-open `method?.() ?? {note}` cases in camDispatcher, and the `T_cut = 200 + Vc*2.5 // simplified correlation` linear hack is real at line 1275. These are the two most damaging credibility findings. I have enough verified ground truth. Let me write the brief.

---

# PATENTABILITY & DEFENSIBILITY BRIEF — PRISM Post-Processor Generator

**Verifier's note:** I re-checked the load-bearing facts directly. The skeptic verdicts are correct on magnitude; the original enumerations inflated LOC 25–95× (byte-count-as-LOC) and fabricated test citations. My independent checks confirm: physics is densely wired into the pipeline (79 Kienzle/Taylor/chatter/deflection references in `PostProcessorPipelineEngine.ts`); the 2,588-alarm DB has **zero** references in that pipeline; the `T_cut = 200 + Vc*2.5 // simplified correlation` linear hack is real (line 1275); and **105** `method?.() ?? {note:"not callable"}` fail-open cases exist in `camDispatcher.ts`. The defensibility analysis below is built only on what survived verification.

---

## 1. Genuinely novel / defensible capabilities

The honest screen: a claim is defensible only if **no** named competitor (Fusion/HSM `.cps`, CAMplete TruePath, ICAM CAM-POST, Mastercam MP, NX Post Builder, Eureka, ModuleWorks, MecSoft, Vericut, Post Hub, consultants) does it. Almost everything collapses because Fusion `.cps` `onLinearMove()`/`onSection()` exposes per-block JS, and ICAM/CAMplete already sell cross-controller translation. Only these survive:

**A. Regenerative-chatter stability-lobe avoidance executed *inside the post-emit loop*, RPM-shifted per cutting block.**
- *Embodiment:* `ChatterStabilityLobeEngine` + `StochasticChatterEngine`, invoked at Stage 1.3 of `PostProcessorPipelineEngine.ts` (lines ~1301–1356). **50 real, passing tests** across the two chatter engines — the only physics claim with genuine numerical test backing.
- *Non-obvious because:* posts are conventionally pure formatters; solving the Tlusty/Altintas eigenvalue problem at tooth-passing frequency and shifting spindle RPM at code-emission time (vs. CAM-planning time) is an architectural inversion. The post has fresh, final controller-resolved motion data CAM planning lacks.
- *Prior-art risk:* **MED.** Stability-lobe solvers exist (CUTPRO/MACHpro, MachiningCloud, some Siemens modules) but at the *planning* stage. The novelty is narrowly the *post-emit-time* execution; a patent would have to claim that placement specifically, and ModuleWorks' adaptive engines are the closest threat.

**B. Per-block cutting-force/power/deflection physics that *clamps the emitted feed/RPM* to hold a tolerance/power/life envelope, on-by-default, dispatcher-reachable.**
- *Embodiment:* `PostProcessorPipelineEngine.ts` Stage 1.1 — Kienzle Fc → power/torque clamp (lines 1148–1162), Euler-Bernoulli deflection feed-limit (δ>tol/3, lines 1178–1186), Taylor tool-life RPM adjustment. Verified: physics constants flow from canonical `constants.ts`; `coupled_thermal_wear`/`constitutive`/`calibration` default TRUE.
- *Non-obvious because:* the *integration* — canonical physics constants feeding a default-on per-block clamp that actually rewrites feed/RPM in the NC — is what no competitor ships configured. Fusion `.cps` *can* host this math but ships empty.
- *Prior-art risk:* **HIGH as a patent, MED as a trade-secret moat.** Every constituent formula is 50–120-year-old public domain (Kienzle 1952, Taylor 1907, Euler). The defensible claim is the *system integration*, which is weaker IP than a novel algorithm. "No competitor *can* do this" is FALSE; "no competitor *ships this configured on-by-default*" is the honest, narrower, still-marketable claim.

**C. Byte-golden post regression against a proprietary shop's hand-validated `.cps` corpus.**
- *Embodiment:* `HurcoV11MillMasterPostEngine.ts` (2,270 lines, verified) + 16 dedicated test files including byte-equivalence vs JM's proven posts; `OkumaOSPMillMasterPostEngine` (1,885 lines) + 9 test files. Real `.cps` golden files on disk.
- *Non-obvious because:* not the code — the *curated, prove-out-validated, machine-specific tribal corpus* (M140 Z-retract, OSP `[]` bracket purity, G05.3 smoothing) that generic Fusion/Mastercam posts cannot carry.
- *Prior-art risk:* **LOW as a moat, but NOT patentable.** This is a proprietary-data / trade-secret moat, not an invention. It is the *strongest commercial differentiator* and the *weakest patent candidate* simultaneously.

---

## 2. Sounds novel — but is PRIOR ART (be blunt)

| Claimed "novel" | Reality |
|---|---|
| **Cross-CAM / cross-dialect transpiler ("breaks CAM lock-in", "266 pairs")** | This is the literal business of **ICAM CAM-POST** and **CAMplete TruePath** (neutral toolpath → many controllers). The "266 pairs" is a `14×19` multiplication of two list lengths — **zero** per-pair validation exists, and the flagship `CrossCAMPostEngine` has **no test file**. Dead on arrival. |
| **G-code ↔ CAD reverse / residual-stock reconstruction** | **Vericut** and **Eureka Virtual Machining** reconstruct in-process stock from NC as their core function, at production grade. PRISM's 13K-line `GCodeReverseCADEngine` is a thin re-derivation. |
| **Modal-state tracking / 24-rule safety analyzer** | Table-stakes. Every post + Vericut + Eureka tracks modal G/M state and checks rapid/retract/coolant ordering. |
| **"LoRA-style" post fine-tuning** | Marketing gloss on a bounded-EMA correction table (CNC controller comp tables, decades old). No gradient, no adapter, **zero production data fed** — the subscriber edge is unwired. ModuleWorks/Fusion already do telemetry-driven parameter adjustment. |
| **Transformer / NL→G-code / MAML / PSO meta-learning** | Public architectures; `PostProcessorDeepLearningEngine` has **no backprop** (only `loss:` as a config string — runs forward passes on random He/Xavier weights). Academically-named, not learning. |
| **8-dimension quality scorecard, provenance chain, tribal citation, energy optimizer** | Scorecards and provenance logs are generic; tribal-citation-in-comments is a trivially-copyable documentation feature. |
| **Monte-Carlo "CI95 → Cpk prediction"** | The CI95 is computed as `std/√N` — a **confidence interval on the mean**, which shrinks with iteration count and is *not* a process-capability/tolerance interval. Methodologically wrong, and MC tolerance simulation exists in Vericut Force/CGTech anyway. |
| **Multi-controller channel sync (Mazak $1/$2, Siemens WAITM)** | Standard multi-channel post feature in NX Post Builder and ICAM. |

---

## 3. Top 5 patentable/defensible moats, ranked

1. **Post-emit-time stability-lobe RPM avoidance** (claim A) — *only claim with real test backing (50 tests) + genuine architectural novelty.* Strongest patent candidate. Risk: MED.
2. **Shop-validated byte-golden post corpus** (claim C) — strongest *commercial* moat (real, proven, in production on JM machines), but a trade secret, not a patent. Risk: LOW as moat.
3. **Default-on per-block physics→feed/RPM clamp integration** (claim B) — defensible as a *configured system*, not as algorithms. Risk: HIGH as patent.
4. **Per-controller alarm-grounded non-circular reward** (`post-gen-reward.mjs`, 13 tests, real 2,588-alarm DB) — scoring emitted code against a real alarm corpus + golden-Jaccard is integration no competitor ships. Defensible as product; weak as patent; **and currently dead-weight in the live emit path**.
5. **Formula-cited per-dimension XAI safety explanation** (`SafetyExplanationEngine`, wired, 39 tests) — real trust/UX differentiator (competitors give pass/fail). Not patentable (XAI is prior-art-saturated).

---

## 4. The single biggest credibility risk

**The evidence base is contaminated, and the contamination is *self-inflicted and trivially discoverable*.** Across all six audit dimensions the enumerations cited **test files that do not exist** (`GCodeSafetyAnalyzerEngine.test.ts`, `ThermalWearCouplingEngine.test.ts`, `ConstitutiveModelEngine.test.ts`, and ~5 more), reported **byte counts as "LOC"** (92K, 73K, 50K — off by 25–95×), fabricated a **production `.cps` fleet table** and **"machine absent" P0 gaps** for machines whose posts exist on disk, and a **flagship test suite is RED right now** (`MasterPostFineTuningEngine.test.ts`, 44/46).

A technical VC or patent attorney who runs `find . -name "GCodeSafetyAnalyzerEngine.test.ts"` and gets **nothing**, or greps for the cited "150K-LOC AGI engine" and finds 1,152 lines, discredits the *entire* package in one command — including the three genuinely-defensible claims that would otherwise survive. **The real assets (stability-lobe-in-post, the JM byte-golden corpus, alarm-grounded reward) are buried under fabricated supporting evidence that makes them look like more vaporware.**

Concrete fix before any diligence: (1) delete every unverified test/LOC citation and re-count from disk; (2) green the red `MasterPostFineTuning` suite; (3) write the **one** missing numerical regression that proves Kienzle actually alters emitted feed (today *no test would fail if Kienzle returned 2× wrong force*); (4) reframe physics-in-post as "ships configured on-by-default," not "no competitor *can*." Until then the dimension is **wired-but-unproven**, not the "patentable AGI" the framing claims nor the "vaporware" the enumerations' own errors imply.
