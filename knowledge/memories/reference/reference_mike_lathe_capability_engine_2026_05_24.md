---
name: mike-lathe-capability-engine-2026-05-24
description: "2026-05-24 mike /goal session — JMDieLatheCapabilityEngine + per-machine capability sidecar (10 axes × 7 Okuma lathes, 12 user-named capability surfaces). PSN-synergy scorer + fleet rollup + upgrade-order recommender. Echo currently owns .cps edits; this is the DATA substrate echo + bravo + india consume. 18/18 vitest PASS."
aliases: reference_mike_lathe_capability_engine_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.208Z
---


# JMDieLatheCapabilityEngine — mike 2026-05-24

## Mandate

User /goal:
> "assess JM die fleet synergy to PSN | ensure all relevant data pertaining to each machine's capabilities, controller features, osp coding, settings and parameters of each machine, capabilities of each machine, work envelope, travel, machine build quality and accuracy and speed, advanced features, time saving features, efficiency features, auto adjustment of cutting parameters depending on machine first cut results | final objective: assess and enhance current enhanced versions of all lathe programs in the jm die system"

User clarification: *"echo is the one that is currently working on cps post upgrades."* — so mike ships the **DATA SUBSTRATE** that echo's post-edit work consumes, NOT .cps edits themselves.

## Shipped (slot/mike)

Commit subject: `[MIKE-LATHE-CAPABILITY-MS0]/U-MIKE-LATHE-CAPABILITY-ENGINE` (slot/mike)
- `mcp-server/src/data/jm-die-lathe-capabilities.ts` — sidecar data (~280 LOC) with all 7 Okuma lathes
- `mcp-server/src/engines/JMDieLatheCapabilityEngine.ts` — query + assessment engine (~220 LOC)
- `mcp-server/src/__tests__/JMDieLatheCapabilityEngine.test.ts` — **18/18 vitest PASS**

## Sidecar pattern (anti-race)

The canonical `mcp-server/src/data/jm-die-profile.ts` is peer-shared (echo + india + bravo all read it). Mutating it during echo's `.cps` post-edit work would race. Sidecar `jm-die-lathe-capabilities.ts` extends without mutating — same pattern as the prior `FUSION-TOOLING-CATALOG-2026-05-23.json` sidecar.

## 10 capability axes per machine (covers all 12 user-named clauses)

| Axis | Fields | User-named clause covered |
|------|--------|---------------------------|
| `work_envelope` | swing, swing-over-cross-slide, turn length, bar capacity, chuck size | "work envelope" |
| `axis_travel` | X / Z / Y / B / C-axis resolution | "travel" |
| `spindle` | main rpm/power/torque, sub-spindle, live-tool rpm | "capabilities of each machine" |
| `accuracy` | positioning, repeatability, surface Ra, roundness | "machine build quality and accuracy" |
| `rapids` | X / Z / Y rapid (m/min) | "speed" |
| `osp_coding` | feed_mode, work_offset_g_codes, extended_wcs_macro, thread_pitch_macro, smoothing_g_code, rigid_tap, canned_drill, variable_space, tool_offset_form, css_g_code, coolant M-codes | "controller features, osp coding, settings and parameters" |
| `advanced_features` | imachining, ai_adaptive_feedrate, CAS, thermo-friendly, servo_navi, thermo_comp, one_touch_igf, spindle_accel_control | "advanced features" |
| `time_saving_features` | bar_feeder, tool_eye, parts_catcher, auto_door, sub_spindle_pickup, in_process_gauging, live_tooling | "time saving features" |
| `efficiency_features` | through_spindle_coolant, hp_coolant_bar, chip_conveyor, mist_collector, power_off_mode, spindle_load_monitor | "efficiency features" |
| `auto_adjustment_features` | ai_adaptive_feedrate, live_chatter_suppression, active_vibration_control, deflection_compensation, thermal_drift_auto_recompensation | **"auto adjustment of cutting parameters depending on machine first cut results"** |

## OSP coding extraction (per-controller dialect)

| Controller | Smoothing G-code | Extended WCS macro | Smoothing/iMachining? |
|-----------|------------------|--------------------|----------------------|
| OSP-P300SA (LTH-07 Multus) | `G05.1 Q1` (fine HSS) | `G15 H<n>` | ✓ + ✓ |
| OSP-P300L / P300LA / P500 / P200LA | `G05.1` | `G15 H<n>` | ✓ + ✓ |
| **OSP-U10L (LTH-03 LNC8 + LTH-04 Crown)** | **null** | **null** | **✗ + ✗** |

OSP-U10L explicit nulls force the upgrade-path engine to return `post_plus_software_plus_hardware` for those 2 machines — they CANNOT execute Ai-Enhanced/iMachining instructions; the audit's "rebuild plain post with Ai-Enhanced" recommendation is therefore **invalid** for LTH-03/04 (would generate G-code the controller silently ignores).

## 3-tier controller-upgrade ceiling

`assessPSNSynergy()` returns one of:
- **`post_only`** — fully_enhanced machines (LTH-07); only refinement available
- **`post_plus_software`** — modern-controller plain/partial posts (LTH-01/02/05/06); echo's .cps edit work is sufficient
- **`post_plus_software_plus_hardware`** — legacy U10L machines (LTH-03/04); requires controller swap (capex), so the recommended interim is post-only optimization within U10L envelope

This 3-tier ceiling is the **central finding** the user named: which machines can actually be enhanced via post upgrades vs which need hardware investment.

## Fleet-synergy rollup

`assessFleetSynergy()` aggregates all 7 machines:
- `fleet_total_coverage` — mean per-machine coverage
- `fleet_axis_coverage` — mean per-axis coverage (which capability axis has the worst data density across the fleet)
- `weakest_machine` — locked-by-test as LTH-03 or LTH-04 (legacy U10L → null axes pull coverage down)
- `weakest_axis` — surfaces which capability dimension the fleet captures least well

## Upgrade-order recommender

`recommendUpgradeOrder()` ranks all 7 by upgrade-priority score:
- `tier=plain` + `ceiling=post_plus_software` → highest priority (LTH-01, LTH-02 — software-only, immediate ROI)
- `tier=partially_enhanced` + `ceiling=post_plus_software` → next (LTH-05, LTH-06 — finish what's started)
- `tier=plain` + `ceiling=post_plus_software_plus_hardware` → lower (LTH-03, LTH-04 — capex-blocked)
- `tier=fully_enhanced` → last (LTH-07 — only refinement)

Anti-regression test locks: `rank(LTH-01) < rank(LTH-03)` and `rank(LTH-02) < rank(LTH-04)`.

## PSN consumption surfaces

| Domain owner | What they read | Use |
|--------------|----------------|-----|
| **echo** (.cps post edits) | `osp_coding` per controller | Know which G-codes the target controller supports before writing post-template fragments |
| **bravo** (lathe domain) | `spindle`, `work_envelope`, `auto_adjustment_features` | Seed `OKUMA_LATHE_*.hsmlib` libraries (pairs with [[fusion-tooling-catalog-2026-05-23]]) |
| **india** (post-processor) | `enhancement_tier`, `controller_upgrade_ceiling` | Gate which upgrade strategy applies per machine — refuse "rebuild with Ai-Enhanced" for U10L lathes |
| **delta** (CAD/CAM bridge) | `accuracy`, `rapids` | Pick machine based on tolerance + cycle-time requirements |
| **PSN viz** | All 10 axes | Render per-machine capability radar |

## Verification commands

```bash
cd H:/prism-slot-mike/mcp-server && npx vitest run src/__tests__/JMDieLatheCapabilityEngine.test.ts
# expect: 18 PASS / 0 FAIL
```

## Cross-refs

- Sister units this session: [[jm-lathe-post-audit-2026-05-23]] · [[fusion-tooling-catalog-2026-05-23]] · [[mike-osp-profile-engine-2026-05-23]]
- Pattern sources: india `HurcoV11MillMasterPost` + echo `LATHE-P2P-CONSENSUS-MS4`
- Coordination: echo currently owns .cps post edits — this unit is the DATA substrate, NOT a .cps edit
- Slot soul: JULIETT-12CHAT mike = misc-catcher; user /goal explicit override authorizes this lathe-domain extraction
