# JM CAM Library Audit -- gap/error/conflict findings

Root: `H:/prism/state/shared/jm-fusion-tools`
Files: 2 mcam - 2 hmt - 135 fusion-csv - 2702 tools audited

**Severity:** P0=2 - P1=4 - P2=4 - info=81
**By dimension:** D2-unit=4 - D1-complete=2 - D7-uniformity=4 - D6-dup=80 - D5-xcam=1

## Top P0/P1 findings (first 60)

- **P0** [D2-unit] `JM_CRIB.mcam-tools` (  SXZCR2020K15): diameter_mm 161.29 outside [0.1,100] -- possible 25.4x scale error
- **P0** [D2-unit] `JM_CRIB.mcam-tools` (  SXZCR2020K15): shank_diameter_mm 161.29 > 100mm -- gross 25.4x scale error (CAM will reject)
- **P1** [D1-complete] `JM_CRIB.mcam-tools` (PRISM-JM_DIE-154): flute_length_mm missing/<=0 (0)
- **P1** [D1-complete] `JM_CRIB.mcam-tools` (OD THREADING): flute_length_mm missing/<=0 (0)
- **P1** [D2-unit] `JM_CRIB.mcam-tools` (ID Grooving): overall_length_mm 2.79 outside [3,600]
- **P1** [D2-unit] `JM_CRIB.mcam-tools` (  SXZCR2020K15): overall_length_mm 762 outside [3,600]