# SFC Deep Audit — Agent 7: JM Die Fleet Coverage

## Per-Machine Coverage Matrix (12 machines)

### MILLS (5)
| ID | Machine | max_rpm | torque (Nm) | power (kW) | SFC Profile |
|---|---|---:|---:|---:|:-:|
| MILL-01 | Haas VF-2 | 8,100 | 122 | 22.4 | ✓ |
| MILL-02 | Hurco VM30i | 12,000 | 95 | 18 | ✓ |
| MILL-03 | Haas OM-2 | — | — | — | ✗ MISSING |
| MILL-04 | Okuma M460V-5AX | 15,000 | 88 | 22 | ✓ |
| MILL-05 | Roku-Roku HC-658-II | — | — | — | ✗ MISSING (Fanuc only) |

### LATHES (7)
| ID | Machine | max_rpm | torque (Nm) | SFC Profile |
|---|---|---:|---:|:-:|
| LTH-01 | Okuma GENOS L300-M | 5,000 | 350 | ✗ MISSING |
| LTH-02 | Okuma GENOS L200E-M | 5,000 | 280 | ✗ MISSING |
| LTH-03 | Okuma LNC8 | 4,000 | 300 | ✗ MISSING |
| LTH-04 | Okuma Crown L1060 | 3,800 | 280 | ✗ MISSING |
| LTH-05 | Okuma GENOS L400II-E | 3,800 | 560 | ✗ MISSING |
| LTH-06 | Okuma LB 3000EX Big Bore | 3,800 | 411 | ✓ |
| LTH-07 | Okuma Multus B250II | 4,000 | 410 | ✓ |

## Generic vs Machine-Aware
SFC accepts `machine_name` input but falls back to **generic type defaults** when machines aren't in `MACHINE_CATALOG_QUICK`:
- Lathe default: 4,000 RPM / 300 Nm
- Vertical mill default: 12,000 RPM / 80 Nm

`ShopConfigurationEngine` HAS complete per-machine profiles with actual spindle limits, but `SpeedFeedOrchestratorEngine` does NOT query them. The bridge is missing.

## Strengths
- Haas VF-2, Okuma M460V-5AX, Okuma Multus B250II, Okuma LB 3000EX Big Bore covered with accurate torque curves
- `MachineEnvelopeGuardEngine` enforces RPM/feed/power clamping post-calculation
- 6 of 12 machines have valid envelope data when used

## Gaps
- **6 of 12 machines missing** (50% coverage)
- **5 critical Okuma lathes missing** (L300M, L200E, LNC8, Crown L1060, L400II-E) — backbone of JM Die lathe fleet
- Haas OM-2 and Roku-Roku HC-658-II completely absent
- No integration between `ShopConfigurationEngine.getMachine()` and `SpeedFeedOrchestratorEngine.compute()`

## Score: 42/100
Mills well-covered, lathe fleet severely under-represented despite ShopConfig having all spindle specs.

## Remediation
1. Add missing 6 machines to `MACHINE_CATALOG_QUICK` (4h)
2. Wire `ShopConfigurationEngine` lookups into `SpeedFeedOrchestratorEngine` initialization (8h)
3. Auto-populate max_rpm/torque/power from shop profile (4h)
4. Add per-machine SFC validation tests (8h)
