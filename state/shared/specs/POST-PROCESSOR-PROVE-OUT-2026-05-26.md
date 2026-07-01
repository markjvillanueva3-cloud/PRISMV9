# Post-Processor Prove-Out — 2026-05-26

**Slot:** india · **Milestone:** PRISM-LAUNCH-READINESS-MS0 · **Unit:** P0-U06
**Batch:** 001 · **Mode:** full · **Tier:** corpus · **Ω floor:** 0.8

## Result 🔴

- **Evaluated:** 200
- **Pass:** 120 (60.0%)
- **Fail:** 80 (structural 0 · runtime 80)
- **Ω met:** NO — below floor

## By Controller

| Controller | Pass | Fail | Rate |
|---|---|---|---|
| fanuc-30i | 40 | 0 | 100.0% |
| okuma-osp-p300 | 40 | 0 | 100.0% |
| haas-ngc | 40 | 0 | 100.0% |
| heidenhain-itnc640 | 0 | 40 | 0.0% |
| mitsubishi-m800 | 0 | 40 | 0.0% |

## By Operation

| Operation | Pass | Fail | Rate |
|---|---|---|---|
| turning | 24 | 17 | 58.5% |
| milling | 27 | 15 | 64.3% |
| boring | 23 | 19 | 54.8% |
| threading | 26 | 19 | 57.8% |
| drilling | 20 | 10 | 66.7% |

## Error Classes (failure mode breakdown)

| Class | Count |
|---|---|
| `quality-below-omega-floor` | 80 |

## Sample failures (first 10)

- **PP-S-00121** (heidenhain-itnc640/threading/thread-turn): quality-below-omega-floor:50<80
- **PP-S-00122** (heidenhain-itnc640/drilling/spot-drill): quality-below-omega-floor:55<80
- **PP-S-00123** (heidenhain-itnc640/boring/bore): quality-below-omega-floor:55<80
- **PP-S-00124** (heidenhain-itnc640/milling/helical-bore): quality-below-omega-floor:50<80
- **PP-S-00125** (heidenhain-itnc640/threading/thread-mill): quality-below-omega-floor:50<80
- **PP-S-00126** (heidenhain-itnc640/boring/bore): quality-below-omega-floor:55<80
- **PP-S-00127** (heidenhain-itnc640/boring/bore-precision): quality-below-omega-floor:55<80
- **PP-S-00128** (heidenhain-itnc640/boring/bore): quality-below-omega-floor:55<80
- **PP-S-00129** (heidenhain-itnc640/boring/bore-precision): quality-below-omega-floor:55<80
- **PP-S-00130** (heidenhain-itnc640/threading/tap-rigid): quality-below-omega-floor:50<80
