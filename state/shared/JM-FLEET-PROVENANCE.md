# JM Die Fleet — Per-Field Source Provenance

**Generated:** 2026-05-02
**Legend:** A = PRISM 910-machine registry / jm-die-profile.ts · B = memory recall / shared/memory-mirror · C = filesystem evidence (post + NC headers) · — = unmeasured

---

## PROVENANCE MATRIX

| Field | LTH-01 | LTH-02 | LTH-03 | LTH-04 | LTH-05 | LTH-06 | LTH-07★ | VMC-01 | VMC-02 | VMC-03 | VMC-04 | VMC-05 | EDM-01 | EDM-02 | WEDM-01 |
|-------|:------:|:------:|:------:|:------:|:------:|:------:|:-------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:-------:|
| display_name | B+A | B+A | B+A | B+A | B+A | B+A | B+A+C | B+A | B+A | B+A | B+A | B+A | B+A | B+A | B+A |
| model_variant | A | A | A | A | A | A | **C** (W) | A | A | A | A | A | A | A | A |
| make | B+A | B+A | B+A | B+A | B+A | B+A | B+A+C | B+A | B+A | B+A | B+A | B+A | B+A | B+A | B+A |
| year | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| serial | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| process_class | A | A | A | A | A | A | A+C | A | A | A | A | A | A | A | A |
| controller.make | A | A | A | A | A | A | A | A | A | A | A | A | A | A | A |
| controller.model | A | A | A | A | A | A | A | A | A | A | A | A | A | A | A |
| controller.firmware_version | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| controller.dialect | A | A | A | A | A | A | A | A | A | A | A | A | A | A | A |
| controller.custom_macros_installed | — | — | — | — | — | — | **C** | — | — | — | — | — | — | — | — |
| spindle.interface | A | A | A | A | A | A | A | — | — | — | — | — | n/a | n/a | n/a |
| spindle.max_rpm | A* | A* | A* | A* | A* | A* | A | — | — | — | — | — | n/a | n/a | n/a |
| spindle.rated_power_kw | — | — | — | — | — | — | A | — | — | — | — | — | n/a | n/a | n/a |
| spindle.max_torque_nm | — | — | — | — | — | — | A | — | — | — | — | — | n/a | n/a | n/a |
| travels.x_mm | — | — | — | — | — | — | A | — | — | — | — | — | — | — | — |
| travels.y_mm | — | — | — | — | — | — | A | — | — | — | — | — | — | — | — |
| travels.z_mm | — | — | — | — | — | — | A | — | — | — | — | — | — | — | — |
| travels.b_deg | n/a | n/a | n/a | n/a | n/a | n/a | A | n/a | A | n/a | n/a | n/a | n/a | n/a | n/a |
| rapids_mm_per_min | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| max_feed_mm_per_min | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| accel_limits_g | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| way_type | A* | A* | A* | A* | A* | A* | A* | **B** | **B** | **B** | **B** | **B** | n/a | n/a | n/a |
| build_quality_class | A* | A* | A* | A* | A* | A* | A | **B** | **B** | **B** | — | **B** | — | — | — |
| accuracy.iso230_positioning_um | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| accuracy.volumetric_error_um | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| accuracy.last_ballbar | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| tool_changer.capacity | A* | A* | A* | A* | A* | A* | **B** (60) | **B** (24) | **B** (48) | **B** (20) | — | **B** (30) | n/a | n/a | n/a |
| tool_changer.type | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | — | A* | n/a | n/a | n/a |
| probing.spindle_probe | — | — | — | — | — | — | — | — | — | — | — | — | n/a | n/a | n/a |
| probing.tool_setter | — | — | — | — | — | — | — | — | — | — | — | — | n/a | n/a | n/a |
| coolant.flood | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | n/a |
| coolant.tsc_pressure_bar | — | — | — | — | — | — | — | — | — | — | — | — | n/a | n/a | n/a |
| coolant.mql_capable | A* | A* | A* | A* | A* | A* | A* | — | — | — | — | — | n/a | n/a | n/a |
| lathe_specific.tailstock | A* | A* | A* | A* | A* | A* | A* | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| lathe_specific.sub_spindle | n/a | n/a | n/a | n/a | n/a | n/a | A+C | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| five_axis.head_type | n/a | n/a | n/a | n/a | n/a | n/a | A* | n/a | **B** (trunnion) | n/a | n/a | n/a | n/a | n/a | n/a |
| preferred_post | A | A | A | A | A | A | A | A | A | A | A | **null** | A | A | A |
| in_shop_post | — | — | — | — | — | — | **C** | — | — | — | — | — | — | — | — |
| cam_systems_targeting | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* | A* |
| calibration.warmup_procedure | A* | A* | A* | A* | A* | A* | A+C | — | — | — | — | — | — | — | — |
| calibration.warmup_duration_min | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| calibration.characteristic_chatter_freq_hz | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| quirks | A | A | A | A | A | A | A+B+C | — | — | — | — | **B** | — | — | A+B |
| production.status | A* | A* | A* | A* | A* | A* | A | A | A | A | **C** (none→standby) | A+C | **C** (none→standby) | **C** (none→standby) | A+C |
| production.current_job | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| production.shift_schedule | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| production.primary_operator | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| production.last_maintenance | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| linkages.posts_in_resources | A | A | A | A | A | A | A+C | A | A | A | A | — | A | A | A |
| linkages.programs_in_jm_die | — | — | — | — | — | — | **C** (18) | — | — | **C** (533) | — | **C** (1108) | **C** (0) | **C** (0) | **C** (4058) |
| linkages.preferred_for_processes | A+B | — | — | — | — | A+B | B+A | — | — | — | — | — | — | — | A+B |
| billing.shop_rate_per_hour | B (85) | B (85) | B (85) | B (85) | B (85) | B (85) | A+B (95) | B (85) | B (85) | B (85) | B (85) | B (85) | B (85) | B (85) | B (85) |

**Legend marks:**
- `A*` = registry-defaulted (factory-spec assumption, not measured at JM)
- `**B**` = canonical fixture (`MachineStrategyConstraintEngine.JMDieFleet.test.ts` — Mark explicitly confirmed via tests)
- `**C**` = filesystem evidence (NC header / post filename / find -type f count)
- `—` = no source yielded a value (see JM-FLEET-FIELDS-TO-FILL.md)
- `n/a` = field not applicable to this machine class

---

## SUMMARY METRICS

| Field bucket | Total cells | Filled | Provenance breakdown |
|--------------|------------:|-------:|----------------------|
| Identity (name/make/model/year/serial) | 75 | 45 (60%) | A+B for 45; year+serial all empty |
| Controller (make/model/dialect/firmware/macros) | 75 | 47 (63%) | A authoritative; macros only LTH-07 (C) |
| Physics envelope | 195 | 18 (9%) | A defaults + 1 fully-populated (LTH-07 from A) |
| Hardware (toolchanger/probing/coolant/lathe/5ax) | 165 | 73 (44%) | B canonical for ATC; probing all empty |
| Software (post/cam) | 60 | 56 (93%) | A near-complete; only VMC-05 missing post |
| Calibration | 75 | 8 (11%) | only warmup_procedure pattern |
| Production state | 90 | 18 (20%) | status from A+C; rest empty |
| Linkages | 75 | 28 (37%) | post linkages from A; program counts from C |
| Billing | 30 | 30 (100%) | global rate from B applied uniformly |
| **Total** | **840** | **323 (38%)** | A=180 / B=80 / C=63 (cumulative — fields with multi-source overlap counted once at highest-priority source) |

---

## KEY PROVENANCE INSIGHTS

1. **Source A (registry) covers identity + posts** — 60-93% fill rate on names, controllers, dialect, post-processor paths.
2. **Source B (memory + canonical fixture) covers tribal physics class** — way_type/build_quality/rigidity/ATC for the 5 mills come from `MachineStrategyConstraintEngine.JMDieFleet.test.ts` (Mark-confirmed test fixture).
3. **Source C (filesystem) corrects model variant + status** — Multus B250II → B250IIW; 3 standby machines flagged from empty folders.
4. **Physics envelope is the largest gap** — 91% of travel/spindle/accel cells are empty across the fleet. Only LTH-07 Multus B250II has factory-spec values.
5. **Calibration data is essentially absent** — chatter freq, thermal drift, ballbar dates all empty for all 15 machines. Blocks adaptive control.
