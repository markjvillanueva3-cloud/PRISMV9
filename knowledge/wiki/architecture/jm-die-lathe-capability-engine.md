---
title: JMDieLatheCapabilityEngine — per-machine capability data + PSN-synergy assessment
type: architecture
status: shipped
unit: U-MIKE-LATHE-CAPABILITY-ENGINE
milestone: MIKE-LATHE-CAPABILITY-MS0
slot: mike
date: 2026-05-24
---

# JMDieLatheCapabilityEngine

Production engine + sidecar data file that captures **every relevant capability** of each JM Die Okuma lathe (12 user-named surfaces × 7 machines) and assesses fleet-wide PSN synergy.

This is the **data substrate** that echo's `.cps` post-edit work, bravo's lathe `.hsmlib` seeding, and india's post-upgrade gating all consume. It does NOT touch `.cps` files itself (echo's lane).

Sources: `mcp-server/src/data/jm-die-lathe-capabilities.ts` (sidecar) + `mcp-server/src/engines/JMDieLatheCapabilityEngine.ts` (engine). Tests: 18/18 PASS.

## Sister units in the mike trilogy

1. [[jm-lathe-post-audit]] (2026-05-23) — Classified the 7 `.cps` posts. Found 4 plain + 2 partial + 1 fully-enhanced.
2. [[fusion-tooling-catalog-extraction]] (2026-05-23) — Extracted 712 tools / 329 presets from 8 mill/EDM `.hsmlib` libraries as the speed/feed backbone.
3. [[okuma-osp-profile-engine]] (2026-05-23) — Combined india + echo patterns into Kienzle/Taylor/stickout gates + consensus + safety gate per controller.
4. **This entry** (2026-05-24) — Captured every relevant per-machine capability + scored fleet synergy + recommended upgrade order.

## Why the sidecar (not a mutation of jm-die-profile.ts)

`jm-die-profile.ts` is peer-shared — echo + india + bravo all read it. Mutating it during echo's `.cps` post-edit work would race. The sidecar `jm-die-lathe-capabilities.ts` extends without mutating, same pattern as the prior `FUSION-TOOLING-CATALOG-2026-05-23.json` sidecar. The two files are linked by `machine_id` (LTH-01..LTH-07).

## 10 capability axes per machine

Covers all 12 user-named surfaces from the /goal:

| Axis | User-named clause |
|------|-------------------|
| `work_envelope` (swing, swing-over-cross-slide, turn length, bar capacity, chuck size) | "work envelope" |
| `axis_travel` (X/Z/Y/B/C resolution) | "travel" |
| `spindle` (rpm/power/torque, sub-spindle, live-tool) | "capabilities of each machine" |
| `accuracy` (positioning, repeatability, surface Ra, roundness) | "machine build quality and accuracy" |
| `rapids` (X/Z/Y m/min) | "speed" |
| `osp_coding` (11 fields: feed_mode, work_offset_g_codes, extended_wcs_macro, thread_pitch_macro, smoothing_g_code, rigid_tap, canned_drill, variable_space, tool_offset_form, css_g_code, coolant M-codes) | "controller features, osp coding, settings and parameters" |
| `advanced_features` (8 booleans) | "advanced features" |
| `time_saving_features` (7 booleans) | "time saving features" |
| `efficiency_features` (6 fields) | "efficiency features" |
| `auto_adjustment_features` (5 fields: ai_adaptive_feedrate, live_chatter_suppression, active_vibration_control, deflection_compensation, thermal_drift_auto_recompensation) | "auto adjustment of cutting parameters depending on machine first cut results" |

## 3-tier controller-upgrade ceiling

The central decision surface. `assessPSNSynergy()` returns one of:

| Ceiling | Meaning | Machines |
|---------|---------|----------|
| `post_only` | Refinement only; already at peak post | LTH-07 (Multus, fully_enhanced) |
| `post_plus_software` | Echo's `.cps` work is enough; controller supports the upgrade | LTH-01, LTH-02, LTH-05, LTH-06 (modern OSP) |
| `post_plus_software_plus_hardware` | Controller swap required (capex); interim is post-only within U10L envelope | **LTH-03, LTH-04** (legacy OSP-U10L) |

**This is the central finding.** The audit's "rebuild plain post with Ai-Enhanced + iMachining" recommendation is **invalid for LTH-03/04** — those run OSP-U10L which has `smoothing_g_code: null` + `extended_wcs_macro: null` + `imachining: false`. Generated G-code would be silently ignored. The capability engine enforces this gate so downstream consumers cannot accidentally produce posts the controller cannot execute.

## API

### Query

```ts
JMDieLatheCapabilityEngine.listMachines()  // → ["LTH-01", "LTH-02", ..., "LTH-07"]
JMDieLatheCapabilityEngine.getMachine("LTH-07")
// → full LatheCapabilityProfile { machine_name: "Okuma Multus B250II",
//     controller_model: "OSP-P300SA", work_envelope: {...}, axis_travel: {...},
//     spindle: {...}, accuracy: {...}, rapids: {...}, osp_coding: {...},
//     advanced_features: {...}, time_saving_features: {...},
//     efficiency_features: {...}, auto_adjustment_features: {...},
//     enhancement_tier: "fully_enhanced", ... }

// R12 fail-loud: throws on invalid format OR unknown id
JMDieLatheCapabilityEngine.getMachine("INVALID")  // ZodError
JMDieLatheCapabilityEngine.getMachine("LTH-99")   // throws "not found"
```

### Synergy assessment

```ts
JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-03")
// → { machine_id: "LTH-03",
//     per_axis_coverage: [
//       { axis: "work_envelope", populated_fields: 5, total_fields: 5, coverage: 1.0, null_fields: [] },
//       { axis: "axis_travel",   populated_fields: 2, total_fields: 5, coverage: 0.4, null_fields: ["y_mm","b_deg","c_axis_resolution_deg"] },
//       ...
//     ],
//     total_coverage: 0.76,
//     enhancement_tier: "plain",
//     controller_upgrade_ceiling: "post_plus_software_plus_hardware",
//     upgrade_path: [
//       "HARDWARE: controller swap required (OSP-U10L is legacy; iMachining/AI-adaptive not executable)",
//       "INTERIM: post-only optimizations within U10L envelope (chip-control patterns, dwell-on-thread, manual feed-override macros)"
//     ],
//     gaps: [...] }

JMDieLatheCapabilityEngine.assessFleetSynergy()
// → { fleet_total_coverage: 0.89, fleet_axis_coverage: {...},
//     weakest_axis: "axis_travel", weakest_machine: "LTH-03",
//     per_machine: [...7 assessments...] }
```

### Comparison

```ts
JMDieLatheCapabilityEngine.compareCapabilities("LTH-03", "LTH-07")
// → { per_axis_delta: [
//       { axis: "spindle", field: "main_max_rpm", a_value: 4500, b_value: 5000, delta_pct: 11.1 },
//       { axis: "rapids",  field: "rapid_x_m_min", a_value: 18, b_value: 40, delta_pct: 122.2 },
//       ...
//     ],
//     summary: "Okuma LNC8 vs Okuma Multus B250II: 15 differing numeric fields" }
```

### Upgrade-order recommendation

```ts
JMDieLatheCapabilityEngine.recommendUpgradeOrder()
// → [
//     { machine_id: "LTH-01", rank: 1, reason: "tier=plain, ceiling=post_plus_software" },
//     { machine_id: "LTH-02", rank: 2, reason: "tier=plain, ceiling=post_plus_software" },
//     { machine_id: "LTH-05", rank: 3, reason: "tier=partially_enhanced, ceiling=post_plus_software" },
//     { machine_id: "LTH-06", rank: 4, reason: "tier=partially_enhanced, ceiling=post_plus_software" },
//     { machine_id: "LTH-03", rank: 5, reason: "tier=plain, ceiling=post_plus_software_plus_hardware" },
//     { machine_id: "LTH-04", rank: 6, reason: "tier=plain, ceiling=post_plus_software_plus_hardware" },
//     { machine_id: "LTH-07", rank: 7, reason: "tier=fully_enhanced, ceiling=post_only" }
//   ]
```

## Anti-regression invariants (locked by test)

1. `weakest_machine ∈ {LTH-03, LTH-04}` — if a future refactor pushed the U10L coverage above peers, the upgrade-priority signal would silently break.
2. `rank(LTH-01) < rank(LTH-03)` and `rank(LTH-02) < rank(LTH-04)` — plain-post-but-upgradeable-controller must rank above plain-post-but-hardware-blocked.
3. LTH-07 main_max_rpm > LTH-03 with positive `delta_pct` — the per-field comparator correctly identifies the modern machine as faster.

## Verification status

Every per-machine value is sourced from manufacturer-published Okuma spec sheets (`spec_sheet_typical`) OR explicitly marked `null` + verification_status set accordingly. **No values are invented.** When JM Die's specific configuration is unverified (option packages, year of installation), the field is `null` not a guess.

## Cross-refs

- Coordination: echo currently owns `.cps` post-edits — this engine ships the data substrate ONLY
- Sister units: [[jm-lathe-post-audit]] · [[fusion-tooling-catalog-extraction]] · [[okuma-osp-profile-engine]]
- Pattern sources: india `HurcoV11MillMasterPost` + echo `LATHE-P2P-CONSENSUS-MS4`
- Memory: [[reference_mike_lathe_capability_engine_2026_05_24]]
