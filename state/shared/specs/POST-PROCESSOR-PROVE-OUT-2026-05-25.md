# Post-Processor Prove-Out — 2026-05-25

**Slot:** india · **Milestone:** PRISM-LAUNCH-READINESS-MS0 · **Unit:** P0-U06
**Batch:** 001 · **Mode:** full · **Ω floor:** 0.98

## Result 🔴

- **Evaluated:** 200
- **Pass:** 0 (0.0%)
- **Fail:** 200 (structural 0 · runtime 200)
- **Ω met:** NO — below floor

## By Controller

| Controller | Pass | Fail | Rate |
|---|---|---|---|
| fanuc-30i | 0 | 40 | 0.0% |
| okuma-osp-p300 | 0 | 40 | 0.0% |
| haas-ngc | 0 | 40 | 0.0% |
| heidenhain-itnc640 | 0 | 40 | 0.0% |
| mitsubishi-m800 | 0 | 40 | 0.0% |

## By Operation

| Operation | Pass | Fail | Rate |
|---|---|---|---|
| turning | 0 | 41 | 0.0% |
| milling | 0 | 42 | 0.0% |
| boring | 0 | 42 | 0.0% |
| threading | 0 | 45 | 0.0% |
| drilling | 0 | 30 | 0.0% |

## Error Classes (failure mode breakdown)

| Class | Count |
|---|---|
| `quality-below-omega-floor` | 200 |

## Sample failures (first 10)

- **PP-S-00001** (fanuc-30i/turning/thread-turn): quality-below-omega-floor:0<98
- **PP-S-00002** (fanuc-30i/milling/contour): quality-below-omega-floor:0<98
- **PP-S-00003** (fanuc-30i/milling/face): quality-below-omega-floor:0<98
- **PP-S-00004** (fanuc-30i/turning/rough-turn): quality-below-omega-floor:0<98
- **PP-S-00005** (fanuc-30i/turning/finish-turn): quality-below-omega-floor:0<98
- **PP-S-00006** (fanuc-30i/boring/bore): quality-below-omega-floor:0<98
- **PP-S-00007** (fanuc-30i/threading/tap-rigid): quality-below-omega-floor:0<98
- **PP-S-00008** (fanuc-30i/milling/pocket): quality-below-omega-floor:0<98
- **PP-S-00009** (fanuc-30i/boring/bore): quality-below-omega-floor:0<98
- **PP-S-00010** (fanuc-30i/milling/contour): quality-below-omega-floor:0<98
