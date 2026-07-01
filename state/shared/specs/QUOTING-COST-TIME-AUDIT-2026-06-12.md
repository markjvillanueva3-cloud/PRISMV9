# Quoting Cost/Time System Audit + Build Roadmap (2026-06-12, slot:charlie)

> Operator directive: *"check the engines, algorithms, formulas and calculations we're using... see if we have enough for cost management, quoting, material costs, shop operations, machine shop rates... a formula or algorithm that can take all the shop's data (DocuStrata, CNC programs, CAD models, prints)... an engine to accurately calculate times based solely off G and M code and the machine it's running on (tool change, rapid, linear, etc.)."*
> Method: 4-arm parallel ultracode Workflow `wf_ccc3a5e4-a90` (sonnet audit arms reading actual engine bodies; synthesized inline by charlie). Honest (R12): status = REAL / PARTIAL / STUB / ABSENT with file:line.

## HEADLINE (inverts the framing — good news)
**We do NOT need to build a G-code time engine — `CycleTimeEstimatorEngine` (1325 lines) already IS one, and it's best-in-class.** The engine stack is largely REAL + sophisticated. The problem is **DISCONNECTION**: the real engines are not wired into the quote path, which falls back to inline stub rates + an MRR time estimate. The work is **HARDEN + WIRE + FEED-REAL-DATA**, not build-new. (Dedup-guard would have THROWN on a new time engine.)

## WHAT'S REAL (don't rebuild)
- **`CycleTimeEstimatorEngine`** [REAL] — full line-by-line G-code parser: S-curve (7-phase jerk-limited) velocity profiles, corner decel `v_corner=sqrt(2·a·tol/(1−cos(θ/2)))`, look-ahead blend, servo settling, M06 tool-change, G4 dwell, spindle ramp ∝ RPM delta. THE engine the operator asked for. Profiles: haas_vf2/umc750, dmg_dmu50, mazak, fanuc_robodrill, okuma_mb5000h.
- **`JobCostingEngine`** [REAL] — physics-backed cost (Kienzle/Taylor from constants.ts) across material+setup+machining+programming+inspection+finishing+tooling+power+overhead+admin.
- **`ShopConfigurationEngine`** [REAL] — per-shop profile store; all 21 JM machines w/ per-machine hourly_rate + ShopRates; `toJobCostingRates()`/`toCostingParams()` adapters.
- **`AdaptiveShopRateEngine`** [REAL] — Bayesian conjugate update of shop-rate prior from actual-vs-predicted outcomes (95% CrI, margin-drift signal).
- **`MachineRateDatabaseEngine`** [REAL] — TCO rate catalog, 50+ machine categories (prior seed for AdaptiveShopRate).
- **`DynamicShopRateEngine`** [REAL] — utilization-band rate multiplier + rush uplift.
- **`BlueprintToQuoteBridgeEngine`** [REAL] — OCR→quote-input (consumes BlueprintOCREngine). The blueprint→quote path.
- **`InstantQuoteEngine` / `QuoteEstimatorEngine`** [PARTIAL] — real Wright's-law qty breaks (`C(n)=C(1)·n^b`), AACE CI95 bands, margin gates — but cost kernel uses inline stubs (below).
- **`PPToolChangeValidatorEngine`** [REAL] — M06 safety linter (not a time engine).

## THE GAPS (the real work)
### G1 — Per-machine KINEMATICS absent (blocks accurate G-code time)
`ShopMachine` (ShopConfigurationEngine.ts:40-85) has NO `rapid_traverse_mm_min` / `atc_time_s` / `axis_accel_mm_s2`. All time engines default to a generic **30000 mm/min** regardless of machine. **Real values are KNOWN**: Hurco VM30i=40000, Haas VF-2=25400, Okuma M460V-5AX=36000 mm/min (in `GCodeRuntimePredictorEngine.MACHINE_LIBRARY:44-85`). Single-source them.
### G2 — Quote cost kernel uses INLINE STUB rates (per-shop is a dead wire)
`QuoteEstimatorEngine` has hardcoded `MACHINE_RATE_HR` (cnc_mill_3axis=$85/hr, :258-264) + `MATERIAL_PRICE_PER_KG` (:240-247) + setup_rate $55/programming $75 (:690,733) — **never reads ShopConfigurationEngine/MachineRateDatabaseEngine**. Duplicate of the real rate source; silent divergence.
### G3 — G-code time engine NOT wired to the quote path
`CycleTimeEstimatorEngine` output has no path into JobCostingEngine/QuoteEstimatorEngine. Cycle time is always MRR-estimate (volume÷MRR from one assumed tool) or complexity-flat (simple=5/medium=15 min) — **never from G-code**. No dispatcher action found for CycleTimeEstimatorEngine or GCodeRuntimePredictorEngine.
### G4 — Real material prices not wired
DocuStrata `.index/documents-classified-v3.jsonl` has **972 real JMD quotes + confirmed Dec-2025 prices** (H13 DCF round $2.30-2.40/lb, M2 DCF $9.30-10.60/lb, carbide preforms $180.57/pc — Cincinnati Tool Steel + Creative Carbide). `MarketMaterialPricingEngine` uses static 2024-Q4 estimates instead.
### G5 — AdaptiveShopRate learning loop BROKEN (built-but-unwired)
No persistence (posteriors vanish on restart) + never read back at quote-time. The Bayesian self-calibration delivers ZERO production value. `DynamicShopRateEngine` reads `ShopProfileTemplateEngine` not `ShopConfigurationEngine` (profile-store split).
### G6 — CycleTimeEstimatorEngine hardening
(a) No canned-cycle G81-G89 (peck-drill/rigid-tap/bore time missing — falls through as non-motion); (b) JM machines absent from its `MACHINE_PROFILES`.
### G7 — Real bugs
`CycleTimeAccuracyEngine:140` `/1000` unit bug (~31× accel underestimate); `GCodeTimeEstimatorEngine:154` arc length as Euclidean chord (undercounts arc time).
### G8 — Deprecated engines still serve live traffic
`CostEstimationEngine` + `CostEstimatorEngine` (@deprecated) still wired to `shopDispatcher` (:1428,:1435) with fully hardcoded rates — competing with the real engines.
### G9 — Shop rates UNVERIFIED + no second-shop import
ShopConfigurationEngine rates are "Midwest tool & die" planning-handoff ESTIMATES, not real JM financials (no QuickBooks/timecard extraction). No CSV/JSON/ERP path to bootstrap a *new* shop's real rates → the hotel/ERP dependency.

## DATA SUFFICIENCY (operator's "do we have enough?")
- **Time:** ✅ ABUNDANT + deterministic — **134,485 lathe + 533 mill CNC programs** (JM archive). Run through CycleTimeEstimatorEngine → accurate per-part cycle times. **This breaks the data ceiling** (no hotel/xray pair dependency).
- **Machine kinematics:** ◐ values KNOWN for the JM fleet but not in the data model (G1).
- **Material costs:** ✅ REAL in DocuStrata (Dec 2025) — not wired (G4).
- **Shop rates:** ❌ UNVERIFIED estimates — need real JM financials via hotel/ERP (G9). `resources/` (167,599 files) is CAM/hyperMILL training only; zero cost-accounting content.

## BUILD ROADMAP (HARDEN + WIRE — dedup-respecting)
**P0 — accurate, per-shop time (the operator's core ask; charlie-internal, no cross-galaxy block):**
1. `U-QP-MACHINE-KINEMATICS` — add `rapid_traverse_mm_min`/`atc_time_s`/`axis_accel_mm_s2` to `ShopMachine`; populate JM fleet from known values. Single source of truth. (G1)
2. `U-QP-CYCLETIME-JM-PROFILES` — add JM machine profiles to `CycleTimeEstimatorEngine.MACHINE_PROFILES` sourced from #1. (G6b)
3. `U-QP-CANNED-CYCLES` — add G81-G89 parsing to CycleTimeEstimatorEngine (peck/tap/bore). (G6a)
4. `U-QP-GCODE-TIME-WIRE` — dispatcher action + wire CycleTimeEstimatorEngine into the quote path: when a program exists, cycle_time from G-code (real) not MRR. (G3)
**P1 — per-shop-variable + real data:**
5. `U-QP-RATE-WIRE` — QuoteEstimatorEngine rates → ShopConfigurationEngine (kill inline MACHINE_RATE_HR/MATERIAL stubs). (G2)
6. `U-QP-DOCUSTRATA-MATERIAL` — wire DocuStrata Dec-2025 real prices → MarketMaterialPricingEngine. (G4)
7. `U-QP-ADAPTIVE-PERSIST` — persist AdaptiveShopRate posteriors + read at quote-time; unify DynamicShopRate→ShopConfigurationEngine. (G5)
**P2 — fixes + cleanup:**
8. `U-QP-TIME-BUGS` — fix CycleTimeAccuracyEngine /1000 + GCodeTimeEstimatorEngine arc-chord. (G7)
9. `U-QP-DEPRECATED-UNWIRE` — unwire the 2 deprecated cost engines from shopDispatcher. (G8)

## INTEGRATION ROADMAP (operator vision — quoting as the hub)
- **Tri-wizards (mill foxtrot / lathe whiskey / wire mike):** CycleTimeEstimatorEngine handles mill G-code today; **lathe (134K programs!) + wire need dialect support**. Wizards own cut physics/strategy; quoting consumes their cycle-time. Cross-galaxy.
- **CAD/CAM (delta/kilo):** print → CAD → CAM → **G-code** → CycleTimeEstimatorEngine → real time → quote. The full print-to-quote pipeline; G3 is the seam.
- **Blueprint reading (xray):** print → `BlueprintToQuoteBridgeEngine` (REAL) → quote input. Already bridged; harden the OCR confidence gate.
- **Auto-redaction (OLD, needs updating):** `PIIComplianceEngine` + `InputSanitizationEngine` + `SourcePoisoningSanitizerEngine` — for sharing quotes externally + training-data privacy. Audit + modernize (separate unit).
- **Hotel ERP (full domain):** real shop rates (replace G9 estimates) + real job actuals → AdaptiveShopRate learning + quote-vs-actual close-loop. **This is WHERE the `listJobIds()=0` gate plugs in** — quoting's accuracy ceiling is hotel populating real financials/actuals.

## DEDUP WARNINGS (do NOT build new)
CycleTimeEstimatorEngine (G-code time — REAL, harden it), JobCostingEngine (cost — REAL), ShopConfigurationEngine (per-shop — REAL), AdaptiveShopRateEngine (learning — REAL, wire it), MarketMaterialPricingEngine (material price — wire DocuStrata), BlueprintToQuoteBridgeEngine (print→quote — REAL). The 2 deprecated estimators are to be UNWIRED, not extended.
