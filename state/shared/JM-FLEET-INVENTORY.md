# JM Die Company — Fleet Inventory (Auto-Populated)

**Generated:** 2026-05-02
**Method:** Tri-source reconciliation (A=910-machine registry / B=memory / C=filesystem)
**Authoritative source for "what JM owns":** Source B (memory `jm-die-shop.md`) + jm-die-profile.ts JM_DIE_CONTROLLER_MAP (15 production CNC + 6 support = 21 machines)
**Status counts:** 14 active · 1 standby · 0 down · 0 retired · 6 support (out of fleet scope)

---

## CNC PRODUCTION FLEET (15 controllers)

### LTH-01 — Okuma GENOS L300-M
```yaml
fleet_id: jm-machine-001
display_name: "Okuma GENOS L300-M"
generic_machine_id: prism://machine/okuma-genos-l300m
make: Okuma
model: GENOS L300-M
year: unknown (document later)
serial: null
process_class: mill_turn  # 'M' suffix = milling capability via live tools
controller:
  make: Okuma OSP
  model: OSP-P300L-R
  firmware_version: unknown
  dialect: okuma-osp-p300l
  custom_macros_installed: [G50_clamp, G96_css, common_variables]  # inferred from jmdie_okuma_lb250ii kin
physics_envelope:
  spindle: { interface: "A2-6 (assumed)", max_rpm: 5000, rated_power_kw: unmeasured, max_torque_nm: unmeasured, torque_curve_data_available: false, last_balance_check: unknown }
  travels: { x_mm: unmeasured, y_mm: unmeasured, z_mm: unmeasured }
  rapids_mm_per_min: unmeasured
  way_type: hardened_box  # B (test fixture) for LB250 family; assumed for GENOS
  build_quality_class: high_precision
  accuracy_capability: { iso230_positioning_um: unmeasured, volumetric_error_um: unmeasured, last_ballbar: unknown }
attached_hardware:
  tool_changer: { capacity: 12, type: turret }  # standard GENOS L300-M
  probing: { spindle_probe: null, tool_setter: unknown }
  coolant: { flood: true, tsc_pressure_bar: unmeasured, mql_capable: false, cryogenic: false }
  workholding: { standard_chucks: ["3-jaw hydraulic"], standard_jaws: unmeasured, fixture_plates: [], vises: [] }
  lathe_specific: { tailstock: standard, steady_rest: unmeasured, sub_spindle: null, bar_feeder: unknown }
software:
  preferred_post: "H:\\PRISM\\JM DIE\\POSTS\\OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps"
  alternate_posts: []
  cam_systems_targeting: [mastercam, hypermill, fusion360]
calibration: { warmup_procedure: "JM Die Okuma safe start G28 U0 W0 / G50 S3500 / G96 / G99", warmup_duration_min: unmeasured, characteristic_chatter_freq_hz: unmeasured, thermal_drift_um_per_hour: unmeasured, last_full_calibration: unknown }
quirks: ["JM Die safe start order is mandatory — operators have tribal-coded G50 first"]
production: { status: active, current_job: null, shift_schedule: unmeasured, primary_operator: unmeasured, secondary_operators: [], last_maintenance: unknown, next_pm_due: unknown }
linkages:
  posts_in_resources: ["JM DIE/POSTS/OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps"]
  programs_in_jm_die: see CNC LATHE folder (19,839 total lathe files; per-machine split unmeasured)
  recent_jobs_30d: unmeasured
  preferred_for_processes: [od_rough, od_finish, threading, light_milling]
  avoid_for_processes: [heavy_pocketing, large_diameter_turning]
billing: { shop_rate_per_hour: 55 (labor) + 30 (overhead) = 85 baseline, setup_rate_per_hour: 65 }
source_provenance:
  display_name: B
  controller.model: A (jm-die-profile.ts)
  controller.dialect: A
  preferred_post: A
  travels: unmeasured
  spindle.max_rpm: A (assumed standard GENOS L300-M)
  way_type: A (Okuma category default)
last_indexed: 2026-05-02
```

### LTH-02 — Okuma GENOS L200E-M
```yaml
fleet_id: jm-machine-002
display_name: "Okuma GENOS L200E-M"
make: Okuma; model: GENOS L200E-M
process_class: mill_turn
controller: { make: Okuma OSP, model: OSP-P200LA-R, dialect: okuma-osp-p200la }
preferred_post: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps"
spindle.max_rpm: 5000 (assumed); tool_changer: { capacity: 12, type: turret }
production.status: active
source_provenance: { display_name: B, controller.model: A, preferred_post: A, rest: unmeasured }
```

### LTH-03 — Okuma LNC8
```yaml
fleet_id: jm-machine-003
display_name: "Okuma LNC8"
make: Okuma; model: LNC8
process_class: 2axis_lathe
controller: { make: Okuma OSP, model: OSP-U10L, dialect: okuma-osp-u10l }
preferred_post: "OKUMA_LNC8_PRISM.cps"
production.status: active
source_provenance: { display_name: B, controller.model: A, preferred_post: A }
```

### LTH-04 — Okuma Crown L1060
```yaml
fleet_id: jm-machine-004
display_name: "Okuma Crown L1060"
make: Okuma; model: Crown L1060
process_class: 2axis_lathe
controller: { make: Okuma OSP, model: OSP-U10L, dialect: okuma-osp-u10l }
preferred_post: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps"
production.status: active
source_provenance: { display_name: B, controller.model: A, preferred_post: A }
```

### LTH-05 — Okuma GENOS L400II-E
```yaml
fleet_id: jm-machine-005
display_name: "Okuma GENOS L400II-E"
make: Okuma; model: GENOS L400II-E
process_class: 2axis_lathe
controller: { make: Okuma OSP, model: OSP-P300LA-E, dialect: okuma-osp-p300la }
preferred_post: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps"
production.status: active
source_provenance: { display_name: B, controller.model: A, preferred_post: A }
```

### LTH-06 — Okuma LB 3000EX Big Bore
```yaml
fleet_id: jm-machine-006
display_name: "Okuma LB 3000EX Big Bore"
make: Okuma; model: LB 3000EX Big Bore
process_class: 2axis_lathe (big-bore variant)
controller: { make: Okuma OSP, model: OSP-P500, dialect: okuma-osp-p500 }
preferred_post: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps"
quirks: ["Big-bore variant — preferred for large-diameter parting and deep through-bores"]
production.status: active
source_provenance: { display_name: B, controller.model: A, preferred_post: A }
```

### LTH-07 — Okuma Multus B250II  ★ FLAGSHIP
```yaml
fleet_id: jm-machine-007
display_name: "Okuma Multus B250II"
generic_machine_id: prism://machine/okuma-multus-b250ii
make: Okuma; model: Multus B250IIW (W = sub-spindle wide variant per filesystem header)
process_class: sub_spindle_mill_turn  # 5-axis B-axis multitasking
controller:
  make: Okuma OSP
  model: OSP-P300SA
  dialect: okuma-osp-p300sa
  custom_macros_installed: [G50_clamp, G96_css, G126_polar_milling, G140_canned_cycle, G15_workoffset, G323_tool_index, M101_spindle_orient, M175_chuck_clamp, V1-V99_common_variables]
  evidence: NSTRT/G140/G15/G126/G136/G50/TD=050050/M323 sequence in MARK'S COMMON VARIABLES PART COUNTER.min
physics_envelope:
  spindle: { interface: "Capto C6 (B-axis tool spindle)", max_rpm: 5000, rated_power_kw: 22, max_torque_nm: 200, torque_curve_data_available: false }
  travels: { x_mm: 350, y_mm: 200, z_mm: 1100, b_deg: 240, c_deg: 360 }  # Multus B250II factory spec
  way_type: hardened_box
  build_quality_class: high_precision
attached_hardware:
  tool_changer: { capacity: 60, type: chain }  # JM-confirmed via MachineStrategyConstraintEngine (jmdie_okuma_lb250ii=60)
  probing: { spindle_probe: unknown (document later), tool_setter: unknown }
  coolant: { flood: true, tsc_pressure_bar: unmeasured, mql_capable: false }
  lathe_specific: { tailstock: yes, steady_rest: unmeasured, sub_spindle: yes (W variant), bar_feeder: unmeasured }
  five_axis_specific: { head_type: swivel, rotary_table: c_axis }
software:
  preferred_post: "H:\\PRISM\\JM DIE\\POSTS\\OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps"
  in-shop_post: "H:\\PRISM\\JM DIE\\CNC OKUMA MULTUS\\OKUMA MULTUS B250 3.15.24 REV A.cps"  # 163,701 bytes — production post in active rotation
  alternate_posts: []
  cam_systems_targeting: [mastercam, hypermill, fusion360]
calibration:
  warmup_procedure: "JM Die Okuma safe start G28 U0 W0 / G50 S3500 / G96 / G99"
  characteristic_chatter_freq_hz: unmeasured (document later)
  thermal_drift_um_per_hour: unmeasured
quirks:
  - "Sub-spindle transfer macro: M38 sync engage / M39 sync release / RPM verify before transfer (JM tribal tip, confidence 0.93)"
  - "C-axis milling: home C first via M76, use G12.1 polar mode for face patterns (confidence 0.92)"
  - "Live tooling max 6000 RPM via M23/M24 (confidence 0.94)"
  - "Mark's working spindle GRAB-PULL-CUTOFF macro at SP2-Z=1.17 OR SP2-Z=-0.8 (two variants in shop folder)"
  - "Common variables programs: V1=22.0 set at top, used for part counter increment"
production: { status: active, current_job: null, shift_schedule: unmeasured, last_maintenance: unknown }
linkages:
  posts_in_resources: ["POSTS/OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps", "CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps"]
  programs_in_jm_die: 18 files in CNC OKUMA MULTUS/ folder (verified)
  preferred_for_processes: [done_in_one, sub_spindle_handoff, c_axis_milling, b_axis_5_face]
billing: { shop_rate_per_hour: 95 (premium for multitasking), setup_rate_per_hour: 75 }
source_provenance:
  display_name: B (memory: "Multus B250II")
  model_W_variant: C (filesystem header: "OKUMA MULTUS B250IIW")
  controller.model: A (jm-die-profile.ts: OSP-P300SA)
  custom_macros: C (NC header inspection)
  preferred_post: A
  in-shop_post: C (filesystem)
  travels: A (Okuma factory spec — needs B confirmation from Mark)
  programs count: C (filesystem `find` count = 18)
last_indexed: 2026-05-02
```

### VMC-01 — Hurco VM30i
```yaml
fleet_id: jm-machine-008
display_name: "Hurco VM30i"
make: Hurco; model: VM30i
process_class: 3axis_mill
controller: { make: Hurco WinMAX, model: WinMAX v10, dialect: hurco-winmax-v11 }
preferred_post: "HURCO_VM30i_PRISM_v11.cps"
physics_envelope: { way_type: linear_rail, build_quality: precision, rigidity: medium, machine_class: vmc_3axis }
attached_hardware: { tool_changer: { capacity: 24, type: umbrella } }  # JM-confirmed in fleet test
production.status: active
source_provenance: { display_name: B, controller: A, way_type: B (test fixture), tool_changer: B (canonical 24 ATC) }
```

### VMC-02 — Okuma M460V-5AX (a.k.a. GENOS M460V-5AX)
```yaml
fleet_id: jm-machine-009
display_name: "Okuma M460V-5AX"
make: Okuma; model: GENOS M460V-5AX
process_class: 5axis_mill
controller: { make: Okuma OSP, model: OSP-P300MA-H, dialect: okuma-osp-p300ma }
preferred_post: "OKUMA_M460V-5AX-Ai Enhanced-(iMachining).cps"
physics_envelope: { way_type: linear_rail, build_quality: high_precision, rigidity: high, machine_class: vmc_5axis_trunnion }
attached_hardware: { tool_changer: { capacity: 48, type: chain }, five_axis_specific: { head_type: trunnion } }  # JM-confirmed
production.status: active
source_provenance: { display_name: B, controller: A, way_type: B, tool_changer: B (canonical 48 ATC), head: B }
```

### VMC-03 — Haas VF-2
```yaml
fleet_id: jm-machine-010
display_name: "Haas VF-2"
make: Haas; model: VF-2
process_class: 3axis_mill
controller: { make: Haas, model: PRE-NGC, dialect: haas-pre-ngc }
preferred_post: "HAAS_VF2_-Ai-Enhanced_(iMachining).cps"
physics_envelope: { way_type: linear_rail, build_quality: production, rigidity: medium, machine_class: vmc_3axis }
attached_hardware: { tool_changer: { capacity: 20, type: umbrella } }  # JM-confirmed (HAAS_VF2_ATC=20)
production.status: active
linkages: { programs_in_jm_die: 533 files in CNC MILL HAAS folder }
source_provenance: { display_name: B, controller: A, way_type: B, tool_changer: B (canonical 20 ATC) }
```

### VMC-04 — Haas OM-2
```yaml
fleet_id: jm-machine-011
display_name: "Haas OM-2"
make: Haas; model: OM-2 (Office Mill)
process_class: 3axis_mill (compact tabletop)
controller: { make: Haas, model: PRE-NGC, dialect: haas-pre-ngc }
preferred_post: "HAAS_OM-2_PRE-NGC_PRISM.cps"
production.status: standby  # ★ inferred — no folder evidence in JM DIE/, listed in profile but no programs
source_provenance: { display_name: B, controller: A, status: INFERRED (no filesystem programs found) }
```

### VMC-05 — Roku-Roku HC 658-II
```yaml
fleet_id: jm-machine-012
display_name: "Roku-Roku HC 658-II"
make: Roku-Roku; model: HC 658-II
process_class: 3axis_mill (high-precision)
controller: { make: Fanuc, model: 31i-B5, dialect: fanuc-31i-b5 }
preferred_post: null  # ★ NO POST CONFIGURED — engine surfaces no_post_available
physics_envelope: { way_type: hand_scraped, build_quality: ultra_precision, rigidity: ultra_high, spindle: integral_motor, machine_class: vmc_3axis, tier: high_performance }
attached_hardware: { tool_changer: { capacity: 30, type: chain } }  # JM-confirmed (ROKUROKU_HC658_ATC=30)
production.status: active
linkages: { programs_in_jm_die: 1108 files in ROKU-ROKU folder }
quirks: ["Highest-tier machine in fleet — hand-scraped ways + integral-motor spindle. POST PROCESSOR NOT YET WIRED — flag for engine surfaces 'no_post_available'."]
source_provenance: { display_name: B, controller: A, physics: B (canonical fixture: ultra_precision), tool_changer: B (canonical 30 ATC), no_post: A }
```

### EDM-01 — Mitsubishi EA12S
```yaml
fleet_id: jm-machine-013
display_name: "Mitsubishi EA12S"
make: Mitsubishi; model: EA12S
process_class: sinker_edm
controller: { make: Mitsubishi, model: FP80S, dialect: mitsubishi-fp80s }
preferred_post: "MITSUBISHI_EA12S_FP80S_PRISM.cps"
production.status: standby  # ★ no SINKER EDM/ folder programs found on disk
source_provenance: { display_name: B, controller: A, preferred_post: A, status: INFERRED }
```

### EDM-02 — Mitsubishi EA12D
```yaml
fleet_id: jm-machine-014
display_name: "Mitsubishi EA12D"
make: Mitsubishi; model: EA12D
process_class: sinker_edm
controller: { make: Mitsubishi, model: C30EA-2, dialect: mitsubishi-c30ea-2 }
preferred_post: "MITSUBISHI_EA12D_C30EA-2_PRISM.cps"
production.status: standby  # ★ same as EA12S
source_provenance: { display_name: B, controller: A, preferred_post: A, status: INFERRED }
```

### WEDM-01 — Mitsubishi FA10S
```yaml
fleet_id: jm-machine-015
display_name: "Mitsubishi FA10S"
make: Mitsubishi; model: FA10S
process_class: wedm
controller: { make: Mitsubishi, model: W31MV-2, dialect: mitsubishi-w31mv2 }
preferred_post: "MITSUBISHI_FA10S_W31MV-2_PRISM.cps"
attached_hardware: { wire_diameter_mm: 0.25 (typical), uv_axis: yes (taper) }
quirks:
  - "Bi-material cutting (steel + brazed carbide) — wire crosses material boundaries, parameters must adapt per-zone"
  - "H-offsets decrease through passes (0.216→0.163→0.147→0.135mm for 0.25mm wire)"
  - "Skim feeds FASTER than rough (2× ratio typical)"
  - "M01 glue stop between rough and skims for slug retention"
production.status: active
linkages: { programs_in_jm_die: 4058 files in WIRE EDM folder }
source_provenance: { display_name: B, controller: A, preferred_post: A, quirks: B (wedm_shop_programs.md, user_shop_profile.md) }
```

---

## SUPPORT EQUIPMENT (6 — out of CNC fleet scope)
Surface Grinder · Band Saw · Manual Lathe · Manual Mill · CMM · Optical Comparator
*Source: B (jm-die-shop.md memory). Not modeled in JM_DIE_CONTROLLER_MAP — no NC programs.*

---

## STATUS SUMMARY

| Status | Count | Machines |
|--------|------:|----------|
| active | 12 | LTH-01..07, VMC-01,02,03,05, WEDM-01 |
| standby | 3 | VMC-04 (Haas OM-2), EDM-01, EDM-02 |
| down | 0 | — |
| retired | 0 | — |
| **CNC total** | **15** | per JM_DIE_CONTROLLER_MAP |
| support | 6 | per memory (untracked in profile) |
| **fleet total** | **21** | matches JM_DIE_MACHINE_COUNT |

---

## EVIDENCE FILES SAMPLED
- `mcp-server/src/data/jm-die-profile.ts` — JM_DIE_CONTROLLER_MAP (15 entries, restored 2026-05-01)
- `mcp-server/src/__tests__/MachineStrategyConstraintEngine.JMDieFleet.test.ts` — canonical ATC counts: Hurco=24, Genos=48, VF-2=20, LB-250-II=60, Roku-Roku=30
- `state/shared/memory-mirror/jm-die-shop.md` — 21-machine breakdown
- `state/shared/memory-mirror/user_shop_profile.md` — material portfolio + bi-material WEDM workflow
- `state/shared/memory-mirror/wedm_shop_programs.md` — Mitsubishi WEDM programming details
- `JM DIE/CNC OKUMA MULTUS/MARK'S COMMON VARIABLES PART COUNTER.min` — Multus B250IIW header (NSTRT/G140/G15/G126)
- `JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps` — 163,701-byte production post (in shop folder, NOT in POSTS/)
