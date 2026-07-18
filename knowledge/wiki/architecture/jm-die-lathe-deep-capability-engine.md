---
title: JMDieLatheDeepCapabilityEngine — physics-derived per-material envelopes + threading + turret + cycle
type: architecture
status: shipped
unit: U-MIKE-LATHE-DEEP-CAPABILITY-ENGINE
milestone: MIKE-LATHE-CAPABILITY-MS0
slot: mike
date: 2026-05-24
---

# JMDieLatheDeepCapabilityEngine

The **depth layer** on top of `[[jm-die-lathe-capability-engine]]`. Where the sister engine ships breadth (10 axes per machine), this one ships physics-derived numerical envelopes that downstream consumers (echo's `.cps` post edits, bravo's lathe `.hsmlib` seeding, hotel's costing, delta's machine selection) can directly consume.

Source: `mcp-server/src/engines/JMDieLatheDeepCapabilityEngine.ts` · Tests: `mcp-server/src/__tests__/JMDieLatheDeepCapabilityEngine.test.ts` (22/22 PASS).

## What "depth" means here

Every envelope value is **physics-derived**, not invented:

| What | How |
|------|-----|
| Spindle Fc_max | `min(P_kW × 60000 / Vc, T_Nm × 2000 / D_mm)` |
| Vc bands | Taylor T = (C/Vc)^(1/n) for T=60, 30, 15 min |
| max_ap | Kienzle inverted: `Fc_max / (kc1_1 × fz^(1-mc))` |
| max_fz | Kienzle inverted: `(Fc_max / (kc1_1 × ap))^(1/(1-mc))` |
| max_MRR | `max_ap × max_fz × Vc × 1000 / 1000` [cm³/min] |
| Spindle headroom | At typical operating point (ap=1.5, fz=0.15) |

Zero inlined constants — `CANONICAL_KIENZLE` + `CANONICAL_TAYLOR` only.

## API

```ts
JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-07")
// → DeepCapabilityProfile {
//     cutting_envelopes_per_iso_group: { P, M, K, N, S, H },  // 6 envelopes
//     threading: { min_pitch_mm, max_pitch_mm, max_thread_length_mm,
//                  tapered_threading, sub_spindle_sync_threading, thread_types[] },
//     turret: { station_count, mount_standard, max_tool_weight_kg,
//               index_time_per_station_s, driven_stations, tool_change_time_s },
//     workholding: { chuck_type, max_chuck_rpm, bar_capacity_mm,
//                    steady_rest_capable, tailstock_stroke_mm, soft_jaw_machinable },
//     cycle_benchmarks: { tool_change_s, chuck_cycle_s, door_cycle_s,
//                         bar_advance_s, thermal_warmup_min, spindle_ramp_s },
//     macro_programming: { common_var_count, if_then_supported, while_do_supported,
//                          subprogram_call_depth, user_task_programmable },
//     derived_from: { source, physics_models, references }
//   }

JMDieLatheDeepCapabilityEngine.recommendParametersFor("LTH-07", "M")
// → { envelope, projected_life_min_at_recommended, projected_life_min_at_aggressive }

JMDieLatheDeepCapabilityEngine.rankFleetByMRR("N")
// → [{ machine_id, max_mrr_cm3_min }, ...] sorted descending

JMDieLatheDeepCapabilityEngine.estimateCycleOverhead("LTH-07", 5)
// → { tool_change_total_s: 17.5, chuck_s: 2.0, door_s: 1.5, overhead_per_part_s: 21.0 }

// Pure-function entry point for callers that want to compute without machine_id:
computeCuttingEnvelope(power_kW, torque_Nm, max_rpm, iso_group, target_life_min?, reference_D_mm?)
```

## Threading matrix per controller

| Controller | min pitch | max pitch | Tapered (NPT/BSPT) | Sub-spindle sync | Thread types |
|-----------|----------:|----------:|:-------------------:|:-----------------:|--------------|
| **OSP-U10L** (LTH-03/04) | **0.5** | **6.0** | **✗** | **✗** | metric, UN_inch only |
| OSP-P200LA / P300L / P300LA / P500 | 0.25 | 10.0 | ✓ | ✓ (if sub-spindle) | metric, UN, NPT, BSPT, BSPP, ACME, trapezoidal |
| OSP-P300SA (Multus) | 0.25 | 10.0 | ✓ | ✓ | all of above |

## Turret config per machine

| Machine | Stations | Mount | Driven | Index time | Tool change |
|---------|---------:|-------|-------:|-----------:|------------:|
| LTH-07 Multus B250II | **40** (ATC) | CAPTO C6 Custom | **40** | 1.8s | 3.5s |
| LTH-06 LB 3000EX | 12 | **BMT** | 6 | 0.6s | 1.2s |
| LTH-01/02/05 (GENOS L*) | 12 | VDI | 6 | 0.6s | 1.2s |
| LTH-03/04 (U10L) | 12 | VDI | **0** | 0.6s | 1.2s |

## Macro programming envelope per controller

| Controller | Common vars | IF..THEN | WHILE..DO | Subprogram depth | User Task (OSP-UTAS) |
|-----------|------------:|:--------:|:---------:|------------------:|:--------------------:|
| **OSP-U10L** | **100** | **✗** | **✗** | 4 | **✗** |
| OSP-P200LA..P500 | 200 | ✓ | ✓ | 8 | ✓ |
| OSP-P300SA (Multus) | **1000** | ✓ | ✓ | **16** | ✓ |

Echo can use this to gate `.cps` post-template generation: do NOT emit `IF..THEN` constructs for LTH-03/04 — controller will reject the program.

## R12 bug fixed this iteration

First-pass envelope computation clamped `max_ap` at 5mm and `max_fz` at 0.5mm/rev arbitrarily. Two machines with very different spindle power (LB3000 30kW vs LNC8 11kW) both hit the same arbitrary ceiling — MRR ranking showed them tied. **Fix:** removed arbitrary clamps, let raw physics drive. The engine now honestly reports what each spindle can deliver; consumers (e.g. AutoSpeedFeed) apply their own practical operating-point caps separately.

Locked by test: `LB3000 (30kW + 1500Nm) ranks above LNC8 (11kW + 110Nm) on steel`. If a future refactor re-introduces arbitrary clamps, this test fails immediately.

## Anti-regression invariants (locked by test)

1. `Vc[conservative] < Vc[recommended] < Vc[aggressive]` — Taylor ordering
2. `Vc[aluminum N] > Vc[hardened steel H]` — Taylor C ratio invariant
3. `max_fz[aluminum N] > max_fz[hardened steel H]` — Kienzle kc1_1 inverse invariant
4. `MRR[LB3000] > MRR[LNC8]` on steel — spindle-bound, not capped
5. RPM cap at small reference D — `Vc_recommended ≤ π × D × max_rpm / 1000`
6. `tapered_threading[U10L] = false` — controller limitation surfaced
7. `driven_stations[Multus] = 40` — mill-turn correctness
8. `mount_standard[LB3000] = "BMT"` — big-bore convention
9. `macro.if_then_supported[U10L] = false` — legacy controller gate
10. `R12 fail-loud: throws on invalid iso_group`

## Cross-refs

- Sister breadth engine: [[jm-die-lathe-capability-engine]]
- Sister units this session: [[jm-lathe-post-audit]] · [[fusion-tooling-catalog-extraction]] · [[okuma-osp-profile-engine]]
- Pattern sources: india `HurcoV11MillMasterPost` + echo `LATHE-P2P-CONSENSUS-MS4`
- Memory: [[reference_mike_lathe_deep_capability_2026_05_24]]
