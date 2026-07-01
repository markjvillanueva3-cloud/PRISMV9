---
name: mike-lathe-deep-capability-2026-05-24
description: "2026-05-24 mike /goal follow-up — JMDieLatheDeepCapabilityEngine ships PHYSICS-DERIVED per-material cutting envelopes for all 7 Okuma lathes (Kienzle Fc_max from spindle power × torque × Vc, Taylor C/Vc^(1/n) for life). 6 ISO groups × 7 machines × {conservative/recommended/aggressive} Vc bands. Plus threading capability matrix + turret config + workholding + cycle benchmarks + macro envelope per controller. 22/22 PASS."
aliases: reference_mike_lathe_deep_capability_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.656Z
---


# JMDieLatheDeepCapabilityEngine — mike 2026-05-24

## Mandate

User follow-up to the /goal: *"dig much deeper into each machining capabilities"*. Goes from breadth (10 axes per machine, sister engine [[mike-lathe-capability-engine-2026-05-24]]) to **depth** — physics-derived cutting envelopes per material, threading capability matrix, turret/tooling layout, cycle benchmarks, macro programming envelope.

## Shipped (slot/mike)

Commit subject: `[MIKE-LATHE-CAPABILITY-MS0]/U-MIKE-LATHE-DEEP-CAPABILITY-ENGINE`
- `mcp-server/src/engines/JMDieLatheDeepCapabilityEngine.ts` (~290 LOC)
- `mcp-server/src/__tests__/JMDieLatheDeepCapabilityEngine.test.ts` (**22/22 vitest PASS**)

## Physics-derived cutting envelopes per material

For each (machine × ISO group), `computeCuttingEnvelope()` solves:

1. **Spindle Fc_max** = min(P_kW × 60000 / Vc, T_Nm × 2000 / D_mm)
2. **Vc bands** from Taylor T = (C/Vc)^(1/n):
   - conservative (T=60 min)
   - recommended (T=30 min)
   - aggressive (T=15 min)
3. **max_ap** from Kienzle inverted: Fc_max / (kc1_1 × fz^(1-mc))
4. **max_fz** from Kienzle inverted: (Fc_max / (kc1_1 × ap))^(1/(1-mc))
5. **MRR_max** = max_ap × max_fz × Vc × 1000 / 1000 [cm³/min]

Zero inlined constants — imports `CANONICAL_KIENZLE` + `CANONICAL_TAYLOR`.

## Per-machine deep capability surfaces (5 areas)

### 1. Cutting envelopes per ISO group
6 ISO groups (P/M/K/N/S/H) × 7 machines = 42 envelope cells, each carrying:
- vc_conservative_m_min · vc_recommended_m_min · vc_aggressive_m_min
- max_ap_mm · max_fz_mm_rev · max_mrr_cm3_min
- spindle_rpm_at_D50
- spindle_force_headroom_pct (at typical operating point ap=1.5 fz=0.15)

### 2. Threading capability matrix
| Controller | min pitch | max pitch | Tapered | Sub-spindle sync | Thread types |
|-----------|----------:|----------:|:-------:|:----------------:|--------------|
| OSP-U10L (LTH-03/04) | 0.5 | 6.0 | ✗ | ✗ | metric, UN_inch |
| OSP-P200LA / P300L / P300LA / P500 | 0.25 | 10.0 | ✓ | ✓ (if sub-spindle) | metric, UN, NPT, BSPT, BSPP, ACME, trapezoidal |
| OSP-P300SA (LTH-07) | 0.25 | 10.0 | ✓ | ✓ | all of above |

### 3. Turret config
| Machine | Stations | Mount | Driven | Index time | Tool change |
|---------|---------:|-------|-------:|-----------:|------------:|
| LTH-07 Multus | 40 | CAPTO C6 Custom (ATC) | 40 | 1.8s | 3.5s |
| LTH-06 LB3000 | 12 | BMT | 6 | 0.6s | 1.2s |
| LTH-01/02/05 GENOS | 12 | VDI | 6 | 0.6s | 1.2s |
| LTH-03/04 (U10L) | 12 | VDI | 0 | 0.6s | 1.2s |

### 4. Cycle benchmarks
Per-machine `tool_change_s`, `chuck_cycle_s`, `door_cycle_s`, `bar_advance_s`, `thermal_warmup_min`, `spindle_ramp_s`. `estimateCycleOverhead(machine_id, n_tool_changes)` returns batch-cost helper.

### 5. Macro programming envelope
| Controller | Common vars | IF..THEN | WHILE..DO | Subprogram depth | User Task |
|-----------|------------:|:--------:|:---------:|------------------:|:---------:|
| OSP-U10L | 100 | ✗ | ✗ | 4 | ✗ |
| OSP-P200LA..P500 | 200 | ✓ | ✓ | 8 | ✓ |
| OSP-P300SA (Multus) | 1000 | ✓ | ✓ | 16 | ✓ |

## API

```ts
JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-07")
// → full DeepCapabilityProfile

JMDieLatheDeepCapabilityEngine.recommendParametersFor("LTH-07", "M")
// → { envelope: {vc_recommended: 200/2^0.20 = 158, max_ap, max_fz, max_mrr_cm3_min, ...},
//     projected_life_min_at_recommended: 30,
//     projected_life_min_at_aggressive: 15 }

JMDieLatheDeepCapabilityEngine.rankFleetByMRR("N")
// → [{ machine_id: "LTH-07", max_mrr_cm3_min: ... }, ...] sorted descending

JMDieLatheDeepCapabilityEngine.estimateCycleOverhead("LTH-07", 5)
// → { tool_change_total_s: 17.5, chuck_s: 2.0, door_s: 1.5, overhead_per_part_s: 21.0 }
```

## Bug found + fixed (R12 fail-loud)

**Issue 1:** First pass capped max_ap at 5mm and max_fz at 0.5mm/rev arbitrarily. This made the LB3000 (30kW/1500Nm) report the SAME max_mrr as the LNC8 (11kW/110Nm) — both hit the arbitrary ceiling, spindle differences vanished. **Fix:** removed clamps; consumers apply their own practical caps. The engine now reports HONEST spindle-bound physics.

**Issue 2:** After clamp removal, leftover refs to `used_ap`/`used_fz` (the clamped values) broke compilation. **Fix:** renamed to `max_ap`/`max_fz` per the now-honest values.

**Issue 3:** `spindle_force_headroom_pct` computed at `max_ap × max_fz / 2` was wrong because max_ap and max_fz were INDEPENDENTLY maxed against a reference, so their product is way past Fc_max. Reported negative headroom. **Fix:** compute headroom at a fixed TYPICAL operating point (ap=1.5, fz=0.15) so the value is meaningful to consumers planning real cuts. Locked by test "spindle_force_headroom_pct is non-negative when envelope is feasible".

## Anti-regression invariants locked

- `Vc_conservative < Vc_recommended < Vc_aggressive` (Taylor ordering)
- `Vc[aluminum] > Vc[hardened steel]` (Taylor C ratio)
- `max_fz[aluminum] > max_fz[hardened steel]` (Kienzle kc1_1 ratio)
- LB3000 (30kW) MRR > LNC8 (11kW) on steel (spindle-bound, not capped)
- RPM cap kicks in at small reference D on high-rpm spindle (Vc_recommended ≤ π × D × max_rpm / 1000)
- LTH-03/04 (U10L) cannot do tapered threading; no NPT in thread_types
- LTH-07 Multus driven_stations = 40 (mill-turn)
- LTH-06 LB3000 uses BMT mount (big-bore standard)
- OSP-U10L: no IF..THEN, no WHILE..DO, 100 vars max
- OSP-P300SA: 1000 vars, IF/WHILE, subprogram depth 16

## Downstream PSN consumers

| Domain | Question | API call |
|--------|----------|----------|
| **echo** (`.cps` post edits) | What G-code/macro features can I emit for LTH-04? | `getDeepCapabilities("LTH-04").macro_programming` |
| **echo** | Can I emit G92 P/Q tapered thread on LTH-03? | `getDeepCapabilities("LTH-03").threading.tapered_threading` → `false` |
| **bravo** (lathe domain) | Recommended speed/feed for 304SS on LTH-07? | `recommendParametersFor("LTH-07", "M")` |
| **india** (post-processor) | What's the macro var budget for OSP-U10L? | `getDeepCapabilities("LTH-03").macro_programming.common_var_count` → 100 |
| **delta** (CAD/CAM bridge) | Which lathe should I send this aluminum roughing job to? | `rankFleetByMRR("N")` → top entry |
| **hotel** (ERP) | Cycle-time overhead for 5-tool job on LTH-07? | `estimateCycleOverhead("LTH-07", 5)` |
| **quote-to-ship** | Tool-life budget for steel turning on LTH-01? | `recommendParametersFor("LTH-01", "P").projected_life_min_at_recommended` |

## Verification commands

```bash
cd H:/prism-slot-mike/mcp-server && npx vitest run src/__tests__/JMDieLatheDeepCapabilityEngine.test.ts
# expect: 22 PASS / 0 FAIL
```

## Cross-refs

- Sister units this session: [[reference_jm_lathe_post_audit_2026_05_23]] · [[reference_fusion_tooling_catalog_2026_05_23]] · [[reference_mike_osp_profile_engine_2026_05_23]] · [[reference_mike_lathe_capability_engine_2026_05_24]]
- Pattern sources: india `HurcoV11MillMasterPost` (physics gates) + echo `LATHE-P2P-CONSENSUS-MS4` (cross-machine ranking)
- Coordination: echo currently owns `.cps` post edits — this engine is the data layer echo consumes
