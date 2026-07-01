# SFC Axis-Awareness Enhancement Plan — close the inert-axis gap

> **Date:** 2026-06-08 · **Slot:** oscar (SFC galaxy) · **Status:** SCOPING (no physics changed yet — awaiting operator go-ahead)
> **Trigger:** operator asked whether the "all potential inputs" sweep covered machines/spindles/controllers/workholding/holder-physics/tooling+insert/coolant/toolpath/cutting-params. Honest answer: NO — and a one-axis-at-a-time probe found most of those axes are **inert** (the SFC accepts them but returns the same number). This plan closes that gap, factor by factor.

## Verified gap (probe: AISI 4140, Ø12, 4FL, flood, conventional, prism_optimized)

| Axis | In `NineAxisInput`? | Moves output today? | Evidence |
|------|---------------------|---------------------|----------|
| material ISO group | yes | ✅ yes | P/M/K/N/S/H distinct |
| tool diameter / flutes / cut_type | yes | ✅ yes | — |
| toolpath strategy | yes | ✅ yes | conventional 140 → adaptive 196 m/min |
| optimization mode | yes | ✅ yes | cost/aggressive/optimized |
| **tool material** | yes (`tooling.tool_material`) | ✅ **WIRED** (`e9b68da865`+`658c8280fe`) | carbide 1.0 / HSS 0.35 / ceramic-cbn-pcd 2.5; explicit-only safety |
| **coolant type** | yes (`coolant.type`) | ✅ **WIRED** (`585584e3ae`) | reused existing CoolantVcModifier 8.5; dry-S 0.55≪dry-P 0.78<dry-K 0.92; cryo-S 1.60 |
| **tool holder** (type + balance/maxRPM/rigidity/damping/accuracy) | type only | ❌ **INERT** | cat40 ≡ hsk63 ≡ er32 all Vc=140 |
| material within ISO group | yes | ❌ **INERT** | 6061≡7075, 304≡316, D2≡A2≡WC-Co |
| **machine** (rigidity) | yes (`machine`) | ❌ **INERT** | `machine_rigidity_factor` stays 1.0 |
| **spindle** (taper/power/maxRPM) | yes (`spindle`) | ❌ **INERT** | no effect |
| **controller** | yes (`controller`) | ❌ **INERT** | no effect |
| **workholding / fixture** | yes (`workholding`) | ❌ INERT (feasibility flag only) | no speed/feed effect |
| **insert** (grade/geometry/nose radius) | no | ❌ not modeled | — |

The `NineAxisInput` interface has slots for all of these — they are parsed but the physics ignores them.

## Why it matters
SFC is a saleable product. Ignoring **tool material** and **coolant** is a first-order correctness gap — both directly set achievable Vc (HSS runs ~⅓ of carbide; dry vs flood shifts the thermal-limited speed materially). A competitor CTO (or a machinist) will notice in one test. The "all potential inputs" sweep is only meaningful once these axes actually change the answer.

## Prioritized build order (by fundamentality × leverage; ascending risk)

Each factor: **WIRE → real-reference test (happy + ≥3 failure + ≥2 adversarial through the dispatcher) → LIVE-validate with numbers → S(x)≥0.98 gate → operator signoff.** All change recommended cutting speeds (scrap/tool-crash risk) → physics-reviewer agent + safety-physics gate mandatory.

1. ✅ **DONE** (`e9b68da865`+`658c8280fe`) — **Tool material** (carbide / HSS / cobalt-HSS / ceramic / cermet / CBN / PCD) — **HIGHEST**.
   - Physics: Taylor `VT^n = C` constants are tool-material-dependent; Vc base scales with the cutting-tool material. Source: `src/physics/constants.ts` (canonical Taylor C/n per material — extend with per-tool-material multipliers; NEVER inline).
   - Acceptance: HSS Vc ≈ 0.3–0.4× carbide on steel; ceramic/CBN > carbide on hardened. Distinctness test (carbide ≠ HSS ≠ ceramic) locks it.
   - **ROOT CAUSE (verified, `UltimateSpeedFeedEngine.ts`):** `toolMat` is resolved at **line 2038** but the Vc formula at **line 2080** is `Vc = baseVc × hFactor × stratMod.vc_factor` — it has **NO tool-material term**, so `toolMat` is dropped. The base params (`CUTTING_PARAMS`) are carbide-anchored (`base_vc_carbide`). There is also a **dead `machinabilityScale`** computed at line 2079 and never used (material machinability was meant to scale Vc but was dropped). **THE FIX is surgical:** add a canonical `toolMaterialSpeedFactor(toolMat, iso)` multiplier to line 2080 (`× toolMatFactor`), table in `constants.ts`. Low code-surface, HIGH consequence (changes recommended Vc) → safety-physics review + S(x)≥0.98 + operator signoff still mandatory. ~30–60 min build once approved.

2. ✅ **DONE** (`585584e3ae`) — **Coolant** (flood / mist / MQL / dry / high-pressure / cryo) — **HIGH**.
   - Physics: coolant shifts the thermal-limited Vc (a multiplier on the thermal cap) + affects tool life. Dry < flood < HP/cryo for thermally-limited materials (S/M groups most sensitive).
   - **SHIPPED via REUSE, not new build:** wired the EXISTING `CoolantVcModifier` (algo 8.5) into `UltimateSpeedFeedEngine.calculate()` — it was dispatcher-wired but never consumed by the engine. EXPLICIT-only gate; 7→5 coolant map (air_blast→dry, through_tool→flood). `taylor_C_multiplier` life-coupling NOT yet wired (P3 follow-up). **Lesson: the inert axes are WIRING gaps — dedup-check existing algorithms/engines BEFORE building.** See [[reference_oscar_sfc_coolant_axis_wired_2026_06_09]].

3. **Holder + machine + spindle rigidity** (the deflection/chatter cap) — **MEDIUM**.
   - Physics: holder type (shrink/hydraulic/collet/side-lock) + balance grade + machine rigidity + spindle stiffness set the deflection limit and the chatter stability lobe → a Vc/ap cap. Source: existing deflection + chatter-stability engines (wire them into the 9-axis orchestrator's axis_factors, which currently hardcode rigidity=1).

4. **Insert** (grade + geometry + nose radius + edge prep) — **MEDIUM**.
   - Physics: nose radius → fz/surface-finish coupling; grade → Taylor C/n; geometry → force.

5. **Controller / workholding** (second-order) — **LOW**.
   - Controller: lookahead/feedrate-limiting affects achievable feed, not Vc. Workholding: clamping adequacy → ap/engagement cap (mostly a safety gate, already partly present).

## Then — and only then — the genuine full sweep
Once axes 1–4 move the output, the `full` sample_mode grids extend to real tool-material / coolant / holder catalogs and the sweep becomes a true combinatorial comparison (the engine header's ~10⁹ space). Until then, sweeping inert axes is padding.

## Cross-refs
- Verified gap memory: `reference_oscar_sfc_axis_impact_gap_2026_06_08`
- The sweep this audits: `reference_oscar_sfc_full_input_sweep_2026_06_08`, spec `SFC-VC-ASSESSMENT-2026-06-08.md`
- Engine: `mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts` (`NineAxisInput` axes 1–9), `UltimateSpeedFeedEngine.ts` (core physics), `src/physics/constants.ts` (canonical Taylor/Kienzle)
- Pre-existing related (different code path): task #52 `prism_calc:speed_feed` cross-ISO same-Vc.
