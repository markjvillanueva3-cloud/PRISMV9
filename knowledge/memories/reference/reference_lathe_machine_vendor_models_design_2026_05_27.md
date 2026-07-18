---
name: reference-lathe-machine-vendor-models-design-2026-05-27
description: Design notes for U-LATHE-MACHINE-VENDOR-MODELS — per-JM-fleet-machine specs JSON. Captures axis travels, spindle thermal map, ATC capacity, BMT/VDI turret type, sub-spindle presence, controller revision. Enables machine-aware program generation.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.638Z
aliases: reference_lathe_machine_vendor_models_design_2026_05_27
---


# Machine-vendor-models design

## Why this exists

Iter49-iter54 covered 5 JM-fleet controllers. But the wizard also needs **per-machine** geometry: axis travels (X/Z/Y/B/C), max bar diameter through spindle, sub-spindle presence + max chuck size, turret type (BMT/VDI) + station count, max RPM (G50 cap), spindle thermal map (warm-up time + drift per °C). Without these, the wizard can't reject a part that doesn't fit the machine envelope, or pick the right Y-axis program over a non-Y machine.

## Target machines (JM fleet)

Per CLAUDE.md JM-Die test shop notes — read live count from `mcp-server/src/data/jm-die-profile.ts`. Approximate inventory:

- **Okuma LB-3000 series** (primary lathe platform per CLAUDE.md)
- **Okuma LU-300 series** (longer-bed variant)
- **Mazak QT-Nexus / QT-COMPACT series** (Mazatrol-control)
- **Haas ST-series** (NGC-control)
- **Doosan/DN Solutions Puma 2600 series**
- Additional units per live `jm-die-profile.ts` reading

## Per-machine schema

```json
{
  "machine_id": "okuma-lb3000-ex-ii-m",
  "vendor": "Okuma",
  "model": "LB-3000 EX II M",
  "controller": "OSP-P300L",
  "machine_class": "horizontal_lathe",

  "envelope": {
    "max_swing_over_bed_mm": 460,
    "max_swing_over_carriage_mm": 280,
    "max_machining_diameter_mm": 350,
    "max_machining_length_mm": 1000,
    "bar_capacity_dia_mm": 65,
    "chuck_size_mm": 200
  },

  "axes": {
    "x_travel_mm": 270,
    "z_travel_mm": 1010,
    "y_travel_mm": null,
    "b_axis_present": false,
    "c_axis_present": true,
    "c_resolution_deg": 0.001
  },

  "spindle": {
    "max_rpm_main": 4200,
    "max_rpm_sub": 5000,
    "power_kw_main": 22,
    "torque_nm_main": 558,
    "spindle_taper": "A2-8",
    "bore_dia_mm": 66,
    "sub_spindle_present": true,
    "sub_chuck_size_mm": 165,
    "thermal_drift_um_per_C": 12,
    "warm_up_recommended_minutes": 20
  },

  "tooling": {
    "turret_type": "BMT-65",
    "turret_stations": 12,
    "live_tool_stations": 12,
    "live_tool_max_rpm": 6000,
    "max_tool_length_mm": 200
  },

  "kinematics": {
    "rapid_x_mpm": 30,
    "rapid_z_mpm": 30,
    "rapid_y_mpm": null,
    "max_cut_feed_mpm": 20,
    "min_programmable_increment_mm": 0.0001
  },

  "options": {
    "high_pressure_coolant_psi": 1000,
    "barfeeder_compatible": true,
    "robot_loading_compatible": true,
    "in_machine_probe": "renishaw_omp",
    "tool_probe": "renishaw_otp"
  },

  "manual_sources": {
    "operator_manual_pdf": "resources/.../okuma-lb3000-ex-ii-m-operator.pdf",
    "parts_book_pdf": "resources/.../okuma-lb3000-parts.pdf",
    "alarm_book_pdf": "resources/.../okuma-osp-p300l-alarms.pdf"
  },

  "jm_die_unit_count": 2,
  "jm_die_program_count": 0
}
```

## Validation rules per machine (wizard-side)

The wizard cross-checks every part candidate against its target machine:

1. **Diameter envelope** — part max OD ≤ envelope.max_machining_diameter_mm; if not, reject + suggest alternate machine
2. **Length envelope** — part length ≤ envelope.max_machining_length_mm; if not, reject
3. **Bar capacity** — if part is bar-stock, raw diameter ≤ envelope.bar_capacity_dia_mm
4. **Sub-spindle requirement** — part has 2-op operations? requires spindle.sub_spindle_present
5. **Y-axis requirement** — part has off-axis features (sloted bolt circle, key-slot)? requires axes.y_travel_mm != null
6. **C-axis requirement** — part has polar features? requires axes.c_axis_present
7. **Live tool requirement** — drilled cross-holes? requires tooling.live_tool_stations > 0
8. **High-pressure coolant requirement** — ISO-S/Inconel job? requires options.high_pressure_coolant_psi > 500
9. **Probing requirement** — closed-loop measurement? requires options.in_machine_probe != null
10. **Spindle warm-up** — first-of-shift program? prepend warm-up cycle per spindle.warm_up_recommended_minutes

## Implementation steps

1. Create `mcp-server/data/machine-specs/` directory
2. Write one JSON file per JM-fleet machine (~6-8 files)
3. Source data from operator manuals (per U-LATHE-VENDOR-PDF-DOWNLOAD Tier-3)
4. Build `LatheMachineSpecRegistry.ts` loader + cache
5. Add `selectMachine(part_spec)` API to wizard — given part requirements, recommend available machines
6. Wire 10 validation rules above into quality pipeline (`validateMachineFit` new sub-validator)
7. Hermetic tests with synthetic machine spec + 20 test-parts (each rule × 2 cases)

## What about non-JM machines?

The schema is generic. Adding a non-JM machine (e.g. customer-loaner) is just another JSON file dropped in. The wizard auto-discovers via directory scan.

## Estimated scope

- Schema + 6-8 machine JSON: ~80 lines of data per file × 7 ≈ 560 lines of JSON
- Registry loader: ~150 LOC
- Validators (10 rules × ~30 LOC): ~300 LOC
- selectMachine API: ~120 LOC
- Tests: ~400 LOC / 40 cases
- Total: ~970 LOC, ~5-6 hours (excluding operator PDF gathering)

## Why P1 not P0

P0 wizard can produce a generic program; P1 makes it machine-aware. Without machine specs:
- Wizard might propose Y-axis features for a non-Y-axis machine (silent failure at NC-load time)
- Wizard might exceed bar capacity (operator catches at setup; embarrassment but not crash)
- Wizard can't pre-flight reject "this part won't fit on this machine"

These are P1 quality-of-output improvements, not P0 wizard-doesn't-work issues.

## Doctrine alignment

This unit directly supports [[feedback_jm_machine_manual_coverage_doctrine]] — the standing rule that once PDFs are exhausted, JM-machine coverage is the default-next. Spec JSON files are the structured output of that doctrine's "extract every section into wiki/tribal/part-number-index/alarm-fix-lookup" step.

## Related

- [[feedback_jm_machine_manual_coverage_doctrine]] — doctrine driving this unit
- [[reference_lathe_vendor_pdf_download_design_2026_05_27]] — Tier-3 PDF download dependency
- [[reference_shop_tool_library_bridge_design_2026_05_27]] — co-loaded; bridges T-number per machine
- [[reference_lathe_canned_cycle_dialects_2026_05_27]] — controller-revision affects canned-cycle support
- [[reference_lathe_program_quality_rubric_2026_05_27]] — machine-fit becomes new scoring category
- `mcp-server/src/data/jm-die-profile.ts` — live machine count source
