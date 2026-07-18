# Machine Database Completeness Audit (2026-06-26, slot:oscar)

> Regenerate: `node_modules/.bin/tsx mcp-server/scripts/audit-machine-completeness.mjs`
> Operator directive: ensure ALL machines have accurate kinematics/envelope/way-type/rigidity/
> thermo/spindle/table/g-forces/look-ahead/corner-rounding/surface-finish/controller caps.

## Total: 1015 machines (43 manufacturers)

## Per-attribute coverage (heterogeneity-aware, multi-path)
| Attribute | Have | Coverage | Band |
|---|---|---|---|
| spindle_taper | 1006 | 99.1% | STRONG |
| spindle_rpm | 1005 | 99% | STRONG |
| spindle_power | 997 | 98.2% | STRONG |
| spindle_torque | 995 | 98% | STRONG |
| work_envelope | 991 | 97.6% | STRONG |
| controller_model | 982 | 96.7% | STRONG |
| table_type | 717 | 70.6% | PARTIAL |
| table_load | 717 | 70.6% | PARTIAL |
| tool_changer | 697 | 68.7% | PARTIAL |
| machine_weight | 370 | 36.5% | PARTIAL |
| high_speed | 331 | 32.6% | PARTIAL |
| spindle_bearing | 325 | 32% | PARTIAL |
| look_ahead | 269 | 26.5% | PARTIAL |
| look_ahead_consistency | 269 | 26.5% | PARTIAL |
| kinematics | 212 | 20.9% | PARTIAL |
| rapid_rate | 150 | 14.8% | GAP |
| axis_accuracy | 104 | 10.2% | GAP |
| spindle_diameter | 71 | 7% | GAP |
| way_type | 68 | 6.7% | GAP |
| axis_repeatability | 51 | 5% | GAP |
| acceleration_gforce | 36 | 3.5% | GAP |
| spindle_thermal | 15 | 1.5% | GAP |
| corner_rounding | 13 | 1.3% | GAP |
| thermal_comp | 9 | 0.9% | GAP |
| jerk | 5 | 0.5% | GAP |
| spindle_balance | 1 | 0.1% | GAP |
| rigidity_frf | 0 | 0% | GAP |
| surface_finish | 0 | 0% | GAP |
| build_quality | 0 | 0% | GAP |
| robustness | 0 | 0% | GAP |

## #1 issue -- schema fragmentation (NOT normalized)
Spindle power is stored under 7 different keys:
- `power_continuous`: 985
- `power_kW`: 448
- `power_kw`: 222
- `peakHp`: 123
- `continuousHp`: 123
- `power_hp`: 57
- `power`: 1

Spindle rpm under: `max_rpm`(987), `rpm`(672), `maxRpm`(162), `ratedRpm`(1).

A consumer (e.g. `sf_orchestrate`) reading one canonical key silently drops every machine that
uses a variant. **Normalization to ONE canonical schema is prerequisite #1**, then gap-fill the
GAP-band attributes. Full key-variant union: see the JSON artifact.
