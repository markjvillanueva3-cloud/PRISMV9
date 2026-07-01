# SFC Wiring-Completeness Audit — "is everything applied to the SFC wired so it's fully functional?"

> **Author:** slot:oscar · **Date:** 2026-06-19 · **Operator directive:** "go through ALL engines, algorithms
> and formulas to ensure everything applied to the speed feed calculator is wired where it needs to be so it's
> fully functional."
> **Method:** Ultracode fan-out workflow — 1 ground-truth mapper + 11 per-physics-category scanners (sonnet) +
> 1 synthesis (opus) over `src/engines/` + `src/algorithms/` + `src/physics/`, classifying each SFC-applicable
> asset WIRED / UNWIRED-BUT-APPLICABLE / DEAD-NA against the SFC calc path (the 3 orchestrators + `prism_calc`
> SFC actions). Full agent output: task `wgouelmpn` transcript.
> **R12 caveat:** the ground-truth-map agent + the coolant scan were RATE-LIMITED (server 429), so WIRED claims
> are graded on each scan's own file:line evidence, not an independent authority. Comment-only / type-only
> "wired" references were demoted to UNWIRED. Counts are honest-but-approximate (~) and need a re-verify pass
> once the ground-truth map runs.

---

## 0. VERDICT

**The SFC core works, but it is NOT "fully functional" in the sense of composing all applicable physics.**
The headline finding: **WIRED-via-dispatcher != wired-into-the-SFC-result.** ~95 assets are "wired" but the
majority are reachable ONLY as standalone `calcDispatcher` actions — a user who calls `speed_feed` /
`ultimate_speed_feed` does **not** get them. The 3 orchestrators **re-implement** force / thermal / deflection /
engagement / holder / chip-thinning physics **inline**, so the headline recommendation is **functional but
ISOLATED from ~40+ specialist engines** that already exist, are dispatcher-tested, and would materially improve
correctness/safety/accuracy. That isolation — not missing code — is the launch gap.

---

## 1. HEADLINE COUNTS (~, pending ground-truth re-verify)

| Metric | Count |
|---|---|
| Total SFC-applicable assets (de-duped across 11 scans) | **~233** |
| WIRED (orchestrator call OR dispatcher action w/ real call site) | **~95** |
| **UNWIRED-BUT-APPLICABLE (true functional gaps)** | **~96** |
| DEAD/NA (CAM/EDM/business/display, or duplicate) | **~62** |

Per-category (wired / unwired-applicable / dead):

| Category | Wired | Unwired-applicable | Dead |
|---|---|---|---|
| Force / Power / Kienzle / Merchant | 13 | 20 | 6 |
| Thermal / Cryo / LAM / Heat-treat | 8 | 17 | 15 |
| Tool wear / life | 5 | 19 | 2 |
| Chatter / stability / FRF | 6 | 9 | 2 |
| **Deflection** | **0** | **13** | 5 |
| Surface finish / integrity | 17 | 8 | 4 |
| Chip | 8 | 8 | 3 |
| Engagement geometry / CWE | 8 | 6 | 3 |
| Spindle / holder / runout | 29 | 1 | 0 |
| Material / machinability / ISO | 28 | 9 | 22 |
| Calibration / outcome / vendor | 17 | 19 | 14 |

**Most isolated categories:** Deflection (0 wired — entirely inline), Tool-wear (5/19), Calibration/outcome
(closed-loop sinks are comment/type-only), Force (13 wired but engagement/chip-thinning are inline approximations).

---

## 2. TOP-10 WIRING GAPS (prioritized by impact on the headline `speed_feed`/`ultimate_speed_feed` result)

| # | Asset | Why it matters to SFC | Wire target | Risk if unwired |
|---|---|---|---|---|
| 1 | `InstantaneousEngagementEngine` -> `CWEZBuffer` | Replaces inline `hex_mm = fz*sin(acos(1-2*ae/Dc))` approximation with true CWE per-tooth chip thickness (the input Kienzle force depends on). The inline form was the 2026-06-10 hex_mm force-collapse regression source. | `UltimateSpeedFeedEngine.calculate()` STEP-9 hex_mm block (~2303) — call when toolpath geometry present, inline fallback | Force error at non-standard radial engagement -> wrong power/deflection clamps. Highest physics-correctness risk. |
| 2 | `HeatTreatmentAwareSpeedFeedEngine` | Named for exactly this; applies HT-state (annealed/Q&T/case-hardened) to Vc/kc. `resolveMaterial()` does a manual hardness ratio today. | `SpeedFeedOrchestratorEngine.resolveMaterial()` after HB/HRC known | 25-40% Vc error on heat-treated stock (direct JM Die Q&T die-steel relevance) -> tool failure or under-feed. |
| 3 | `SFCFewShotNewMaterialEngine` | SFC-named; few-shot infers kc/Vc for unseen materials. Unknown material silently falls back to inline steel defaults today. | `resolveMaterial()` low-confidence branch | Silent wrong defaults for novel material (R12 fail-loud violation). |
| 4 | `ChipThinningCompensation` (algorithm) | Canonical algorithm exists; `UltimateSpeedFeedEngine` re-implements chip-thinning inline (R8 parallel-path divergence). | Replace inline `chipThinningFactor()` with the canonical singleton | Dispatcher `chip_thinning_compensation` and the inline path can give DIFFERENT answers for the same cut. |
| 5 | Deflection engines (`ToolDeflectionPrediction`, `ToolAssemblyDeflection`, `Timoshenko`) | **0 of the deflection category is wired to ANY orchestrator** — all use inline `delta=FL^3/3EI`, missing holder contribution + shear correction (stubby/high-L:D). | `SpeedFeedNineAxisOrchestratorEngine.run()` deflection-aware feed cap | Under-predicted deflection on long/holder-dominated tools -> scrap on finish passes. |
| 6 | `ResidualStressPredictionEngine` + `SurfaceIntegrityEngine` | SFC exposes a surface-finish output but NO integrity/residual-stress counterpart; both dispatcher-wired, never called by orchestrators. | `UltimateSpeedFeedEngine` output block — add `surface_integrity` + `residual_stress` sub-results | No surface-integrity output for aerospace/medical (HAZ, white-layer, tensile residual). |
| 7 | `StochasticToolWearEngine` + `BayesianWearModel` | Extend the wired `StochasticToolLifeEngine` (Weibull) with MC wear distributions + Bayesian update. `ToolWearRateEngine` is named at `UltimateSpeedFeedEngine.ts:26` as a planned input but never imported (declared gap). | `SpeedFeedOrchestratorEngine` Monte-Carlo block (~2059) | No wear-uncertainty band -> over-confident tool-life point estimate. |
| 8 | `EffectiveDiameterCompensator` + `BallEndMillEngine` | Both orchestrators compute `hex_mm` for ball tools inline WITHOUT Deff correction; both engines dispatcher-wired, not composed. | Ball-tool Vc path in both orchestrators — call `EffectiveDiameterCompensator.compute()` | Wrong Vc on ball/bull-nose at shallow DOC (Deff << nominal) -> poor finish, wrong SFM. |
| 9 | `CryogenicCuttingEngine` + `HPCVcBoostCalculator` | `CoolantVcModifier` IS wired, but cryo + HPC coolant modes are not — both materially change Vc/life on Ti/Inconel. | `UltimateSpeedFeedEngine` coolant block (~2103) — branch when `coolant in {cryogenic, HPC}` | Cryo/HPC cuts get flood-coolant Vc -> 20-40% productivity left or over-speed. |
| 10 | `SFCOutcomeCaptureWireEngine` + `CrossProcessOutcomeStore` | The closed-loop learning SINK: the wire engine is referenced only in a COMMENT (`SpeedFeedOrchestratorEngine.ts:3509`); the store is `import type` only (line 39) — never called at runtime. | `SpeedFeedOrchestratorEngine` outcome-capture path — import + call (not type/comment) | No outcome persistence -> the wired calibration/self-learn engines starve (no actuals to learn from). |

(Full ~96-gap list — incl. ConstitutiveModelEngine/Johnson-Cook, MaterialHardnessStateClassifier,
MaterialCoolantCompatibility, SFCDriftCanary, OutcomeDriftCalibrationBridge, GWizardComparatorBridge,
SpindleVibFFTModel, etc. — in the task `wgouelmpn` transcript.)

---

## 3. DEAD / NOT-SFC (excluded, ~62)

CAM material/physics bridges (hyperMILL/Mastercam/Fusion), EDM material engines, business/quoting/procurement
(Vendor*, *Price*, MaterialStock), post-processor (PP*), blueprint/CAD parsers, data-ingestion (PDF/Harvester),
and pure type files. These are correctly NOT in the SFC path.

---

## 4. IMPLEMENTATION ROADMAP (to make the SFC genuinely "fully functional")

> **RE-VERIFY ADDENDUM (2026-06-19 PM, slot:oscar — the ground-truth pass per step 1 below, since the
> original audit's ground-truth map was 429-rate-limited).** Correcting the Tier-1 framing after reading
> the live code + a physics-reviewer ruling:
> - **Gap #5 (deflection) — PARTIALLY SHIPPED.** `U-SFC-DEFLECTION-CANONICAL` (`0aa5e7e717`) wired the
>   inline `E=600000` Euler-Bernoulli estimate to canonical `toolDeflection()`+`getToolModulus()`
>   (material-aware, report-only). REMAINING: the Timoshenko shear + holder-stiffness UPGRADE (gap #5b).
> - **Gap #4 (chip-thinning) — FALSE GAP; do NOT "swap to the canonical singleton".** The canonical
>   `ChipThinningCompensationEngine` computes the AVERAGE chip thickness (`fz*sqrt(ae/D)`) for FEED
>   compensation; the SFC force path needs the MAX chip thickness (hmax) for the Kienzle PEAK force. A
>   swap under-reports peak Fc ~37% at 10% radial → unsafe clamps (physics-reviewer BLOCK). The SFC
>   ALREADY has both, correctly separated: hmax inline at STEP 9 (force) + a CTF feed comp via
>   `chipThinningFactor()` at STEP 7 (feed). Wiring the singleton as a feed axis would DOUBLE-COUNT.
>   Actionable residue only: removed the dead `millingMaxChipThickness()` helper (`U-SFC-DEAD-CHIPTHIN-RM`).
> - **Gap #1 (CWE engagement) — mostly a FALSE GAP for the headline SFC.** `InstantaneousEngagementEngine`
>   uses the SAME hmax form STEP 9 already computes; its added value is PER-BLOCK toolpath engagement,
>   which the single-point `speed_feed`/`ultimate_speed_feed` call has no geometry for. Real home is the
>   post-processor / per-block path, not the SFC headline. `CWEZBuffer` (named in gap #1) DOES NOT EXIST.
> - **Gap #8 — INFEASIBLE as written:** `EffectiveDiameterCompensator` DOES NOT EXIST; use
>   `BallEndMillEngine` Deff if pursued (Tier-2).
> Net: the Tier-1 "force-correctness" gaps are largely already-correct; the real remaining value is
> deflection-Timoshenko (gap #5b) + the Tier-2/3 accuracy/coverage items. The ~96 count must have this
> per-gap re-verification applied before being trusted. See memory `reference_oscar_sfc_wiring_tier1_2026_06_19`.

This is a multi-unit milestone, in dependency order:
1. **Re-run the ground-truth map** (was rate-limited) to confirm the WIRED set + de-flag false positives before
   wiring (avoid re-wiring an already-composed engine).
2. **Tier-1 (physics correctness, ship first):** gaps #1 (CWE engagement), #4 (chip-thinning canonical), #5
   (deflection) — these replace inline approximations the force/feed clamps depend on; each is a
   replace-inline-with-engine unit + a force-consistency test (the 2026-06-10 regression class).
3. **Tier-2 (accuracy/coverage):** #2 (HT-aware), #3 (few-shot new-material), #8 (Deff ball), #9 (cryo/HPC) —
   each materially improves a common recommendation; resolveMaterial()/coolant-block insertion + tests.
4. **Tier-3 (output richness + closed-loop):** #6 (surface integrity/residual), #7 (wear uncertainty), #10
   (outcome capture sink) — additive sub-results + the closed-loop persistence the calibration tier needs.
5. Each wire = WIRE -> TEST (force-consistency + reference-value) -> VALIDATE (live numbers) per R15, through
   the dispatcher, with physics-reviewer on any force/stability path.

**Honest scope:** ~96 applicable gaps; the Top-10 above are the launch-critical subset. Wiring all of them is a
dedicated milestone (SFC-WIRING-MS0), not a single session.

---

## Appendix — reproduce
Workflow: task `wgouelmpn` (sfc-wiring-audit). Full per-category tables + the full ~96-gap list are in the
transcript. Re-run the ground-truth map: re-invoke the workflow scriptPath (the rate-limited agents re-run live).
