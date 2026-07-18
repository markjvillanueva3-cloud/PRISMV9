---
name: nine-axis-orchestration
description: PRISM's 9-axis SFC orchestration architecture — the 9 physical input axes, the 3 economic modes, and (the keystone) the lever map that routes each binding safety check to the parameter it physically depends on. PHYSICS-SAFE (symbolic; constants stay in constants.ts). slot:oscar.
metadata:
  node_type: wiki
  type: architecture
  galaxy: speed-feed
  physicsSafe: true
---

# The 9-axis SFC orchestrator — axes, modes, and the lever map

> `SpeedFeedNineAxisOrchestratorEngine` (`OSCAR-SFC-9AXIS-MS0`) does **not** reinvent physics — it accepts an explicit 9-axis input model, derives per-axis multipliers/constraints, and pipes through the canonical `UltimateSpeedFeedEngine` (which imports every numeric constant from `src/physics/constants.ts`). This entry documents the *architecture* and the **lever map** — the single most load-bearing design rule in the SFC core, learned the hard way from the Vc-collapse regression ([[sfc-deflection-vc-lever]]).

## 1 — The 9 input axes

Each axis carries the physical context that constrains the cut. (Field lists are illustrative of the axis's scope, verbatim from the engine's model.)

| # | Axis | What it constrains |
|---|------|--------------------|
| 1 | **Machine** | kinematics, work envelope, build quality, way type, accuracy, G-force capacity, mass, motion control |
| 2 | **Spindle** | installed HP, torque curve, diameter (collision), thru-tool coolant |
| 3 | **Controller** | HSM mode, end-point control, smoothing, look-ahead, AICC |
| 4 | **Material** | type, hardness HB/HRC, ISO group (P/M/K/N/S/H) |
| 5 | **Workholding** | type, clamp force, parallel size, jaw depth, contact area, friction μ |
| 6 | **Tool holder** | type, BigPlus, balance class (ISO 1940), runout TIR |
| 7 | **Tooling** | diameter, flute count, substrate, coating, helix, corner radius, stickout |
| 8 | **Coolant** | type, brand, pH, concentration, flow, pressure |
| 9 | **Toolpath** | strategy, operation, cut type, DOC (ap/ae), current params (for delta) |

Every axis can produce a **binding constraint** — a check that, if violated, forces a parameter reduction. The art is choosing *which* parameter.

## 2 — The 3 economic modes

| Mode | Objective | Basis |
|------|-----------|-------|
| **cost_batch** | minimum $/part (large batch) | Gilbert minimum-cost speed V_min_cost |
| **aggressive_rush** | bias for MRR (rush jobs) | Gilbert maximum-production speed V_max_prod, factoring tool cost |
| **prism_optimized** | Pareto knee on the MRR × cost-efficiency frontier | both, balanced |

(Gilbert's V_min_cost / V_max_prod are the economic-speed forms of the Taylor tool-life curve; the numeric Taylor C/n live in `constants.ts`.)

## 3 — The lever map (the keystone)

When a binding check fails, the orchestrator must reduce a parameter — but **it must reduce the lever the violated quantity physically depends on.** Collapsing one shared knob (cutting speed Vc) for everything is both ineffective and destructive (the Vc-collapse regression: a deflection violation got "fixed" by collapsing Vc ~6×, yet deflection stayed at 291% — Vc is independent of force). The correct routing:

| Binding check | Physically effective lever | Why |
|---|---|---|
| **deflection** (δ = Fp·L³/3EI) | reduce **fz** | force-driven; Fc ∝ fz^(1−mc) ⟹ scale fz by **r^(1/(1−mc))**, Vc untouched |
| **workholding** retention (Fc vs clamp) | reduce **fz** | force-driven (same Kienzle relation) |
| **spindle torque** (T = Fc·D/2000) | reduce **fz** | force-driven; Vc cancels in torque |
| **feed_rate** ceiling | reduce **fz** | feed = fz·z·rpm |
| **rpm** / balance (ISO 1940) limit | clamp **Vc** | rpm = Vc·1000/(π·D) |
| **spindle power** (P = Fc·Vc/60000) | reduce **Vc**, *last* | the ONLY constraint Vc genuinely governs — apply after fz settles |

**The invariant:** force-driven checks (deflection, workholding, torque) reduce **fz**; only power reduces **Vc**. The exponent `1/(1−mc)` is part of the physics — a stand-in `sqrt` under-reduces for any material whose mc ≠ 0.5. See [[sfc-deflection-vc-lever]] for the full regression analysis and [[kienzle-force-depth]] for why Fp (the passive/radial force) is the deflection driver.

## 4 — Physics references (all canonical, none inlined here)

The orchestrator composes — it never inlines a constant. The downstream `UltimateSpeedFeedEngine` resolves all numeric values from `src/physics/constants.ts`:

- **Kienzle force:** Fc = kc1.1 · ap · fz^(1−mc)
- **Taylor tool life:** V·T^n = C
- **Gilbert economic speed:** V_min_cost, V_max_prod (modes §2)
- **Altintas SLD chatter:** stability lobes ([[chatter-solver-sld]])
- **ISO 1940 balance grade:** G2.5 / G6.3 / G16 / G40 → max safe RPM (axis 6 → rpm lever)
- **Brammertz surface finish:** Ra ≈ fz² / (32·r) at the nose cusp. **Note:** 8·r is the peak-to-valley Rt; Ra ≈ Rt/4 → 32·r. Using 8·r as Ra is a 4× unsafe error — the canonical `predictedRa()` in `constants.ts` uses 32·r.

## Cross-refs
- Engine: `mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts` (`OSCAR-SFC-9AXIS-MS0`), composes `UltimateSpeedFeedEngine`
- Owner-gated constants: `mcp-server/src/physics/constants.ts`
- Lever lesson (the why): [[sfc-deflection-vc-lever]]
- Force model (Fp → deflection): [[kienzle-force-depth]]
- Chatter/SLD axis: [[chatter-solver-sld]]
- Foundations: [[speed-feed-foundations-verified-2026-06-14]] · [[speed-feed-advanced-techniques]]
