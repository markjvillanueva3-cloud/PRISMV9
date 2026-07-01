# Machine Database Enrichment Verification (2026-06-26, slot:oscar)

> U-MACHDB-03 / Phase 3 live-data proof. Regenerate: `node_modules/.bin/tsx mcp-server/scripts/enrich-machine-completeness.mjs`
> Pipeline: machineRegistry (1015) -> normalizeMachine (U-MACHDB-02) -> enrichMachine (U-MACHDB-03).
> Coverage is independently re-measured here (true-only booleans, same predicate as the audit).

## Coverage: BEFORE (normalized only) -> AFTER (normalized + class/physics enrichment)
| Attribute | Before | After | Delta | Band(after) |
|---|---|---|---|---|
| rigidity_frf | 0% | 100% | +100 | STRONG |
| surface_finish | 0% | 100% | +100 | STRONG |
| build_quality | 0% | 100% | +100 | STRONG |
| robustness | 0% | 100% | +100 | STRONG |
| spindle_balance | 0.1% | 100% | +99.9 | STRONG |
| corner_rounding | 0.9% | 100% | +99.1 | STRONG |
| jerk | 0.5% | 97.6% | +97.1 | STRONG |
| acceleration_gforce | 3.5% | 97.6% | +94.1 | STRONG |
| way_type | 6.6% | 100% | +93.4 | STRONG |
| axis_repeatability | 5% | 97.6% | +92.6 | STRONG |
| axis_accuracy | 10.2% | 97.6% | +87.4 | STRONG |
| spindle_diameter | 7% | 92.7% | +85.7 | PARTIAL |
| rapid_rate | 14.8% | 97.6% | +82.8 | STRONG |
| kinematics | 20.9% | 100% | +79.1 | STRONG |
| look_ahead | 26.5% | 100% | +73.5 | STRONG |
| spindle_thermal | 0% | 70.7% | +70.7 | PARTIAL |
| thermal_comp | 0% | 70.7% | +70.7 | PARTIAL |
| machine_weight | 36.5% | 91.3% | +54.8 | PARTIAL |
| table_type | 70.6% | 100% | +29.4 | STRONG |
| high_speed | 0.6% | 17.4% | +16.8 | PARTIAL |

## Class distribution (classified from the normalized record, pre-enrich)
- **kind**: vmc=391, 5axis=243, lathe=156, hmc=92, millturn=71, swiss=34, unknown=18, edm=6, grinder=3, router=1
- **tier**: premium=451, production=394, heavy_duty=118, precision=52
- **wayType**: linear_guide=732, box_way=190, hydrostatic=52, roller=41
- **rpmClass**: medium=474, high=294, low=227, ultra_hs=20

## Provenance accounting (inferred class-estimate vs OEM-sourced)
- `way_type`: 948 inferred + 0 OEM = 948/1015
- `spindle.balance_grade`: 1014 inferred + 0 OEM = 1014/1015
- `spindle.bore_mm`: 870 inferred + 0 OEM = 870/1015
- `frf`: 1015 inferred + 0 OEM = 1015/1015
- `kinematics`: 803 inferred + 0 OEM = 803/1015
- `build_quality`: 1015 inferred + 0 OEM = 1015/1015

> Every gap-fill is tagged `inferred:<basis>` in the machine's `_provenance` so a downstream
> consumer (sf_orchestrate / SFC page, wired in P5) can weight a class estimate below a datasheet value.
> Source-dependent fields stay < 100% where the source is absent (bore needs a taper, weight an
> envelope) -- NOT fabricated (R12).

## 5 sample enriched machines
```json
[
  {
    "id": "HAAS_VF_1",
    "manufacturer": "Haas",
    "model": "VF-1",
    "class": "kind=vmc;tier=production;rpmClass=medium;way=box_way",
    "way_type": "box_way",
    "balance": "G2.5",
    "bore_mm": 70,
    "frf": {
      "natural_frequency_hz": 102,
      "damping_ratio": 0.06,
      "stiffness_n_um": 150
    },
    "build_quality": "production",
    "robustness": "high (continuous production / heavy roughing)",
    "best_ra_um": 0.4,
    "kinematics": "serial_XYZ",
    "gforce": "inferred:accel/9.80665=0.41g",
    "inferred_field_count": 15
  },
  {
    "id": "HAAS_VF_2",
    "manufacturer": "Haas",
    "model": "VF-2",
    "class": "kind=vmc;tier=production;rpmClass=medium;way=box_way",
    "way_type": "box_way",
    "balance": "G2.5",
    "bore_mm": 70,
    "frf": {
      "natural_frequency_hz": 96,
      "damping_ratio": 0.06,
      "stiffness_n_um": 150
    },
    "build_quality": "production",
    "robustness": "high (continuous production / heavy roughing)",
    "best_ra_um": 0.4,
    "kinematics": "serial_XYZ",
    "gforce": "inferred:accel/9.80665=0.41g",
    "inferred_field_count": 15
  },
  {
    "id": "HAAS_VF_2_TR",
    "manufacturer": "Haas",
    "model": "VF-2TR",
    "class": "kind=5axis;tier=production;rpmClass=high;way=box_way",
    "way_type": "box_way",
    "balance": "G1.0",
    "bore_mm": 70,
    "frf": {
      "natural_frequency_hz": 84,
      "damping_ratio": 0.06,
      "stiffness_n_um": 150
    },
    "build_quality": "production",
    "robustness": "high (continuous production / heavy roughing)",
    "best_ra_um": 0.4,
    "kinematics": "table_table",
    "gforce": "inferred:accel/9.80665=0.41g",
    "inferred_field_count": 16
  },
  {
    "id": "HAAS_VF_2_TRT100",
    "manufacturer": "Haas",
    "model": "VF-2 WITH TRT100",
    "class": "kind=5axis;tier=production;rpmClass=medium;way=linear_guide",
    "way_type": "linear_guide",
    "balance": "G2.5",
    "bore_mm": 70,
    "frf": {
      "natural_frequency_hz": 67,
      "damping_ratio": 0.03,
      "stiffness_n_um": 80
    },
    "build_quality": "production",
    "robustness": "medium-high (production duty)",
    "best_ra_um": 0.4,
    "kinematics": "table_table",
    "gforce": "inferred:accel/9.80665=0.70g",
    "inferred_field_count": 19
  },
  {
    "id": "HAAS_VF_2SSYT",
    "manufacturer": "Haas",
    "model": "VF-2SSYT",
    "class": "kind=vmc;tier=production;rpmClass=medium;way=linear_guide",
    "way_type": "linear_guide",
    "balance": "G2.5",
    "bore_mm": 70,
    "frf": {
      "natural_frequency_hz": 69,
      "damping_ratio": 0.03,
      "stiffness_n_um": 80
    },
    "build_quality": "production",
    "robustness": "medium-high (production duty)",
    "best_ra_um": 0.4,
    "kinematics": "serial_XYZ",
    "gforce": "inferred:accel/9.80665=0.70g",
    "inferred_field_count": 19
  }
]
```
