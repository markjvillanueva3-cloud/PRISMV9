# CAD-DRAW-MAX-MS1 -- Validation Baseline Report

**Verdict: FAIL** -- accuracy 0.0% vs gate 70.0%

- Orchestrator: **stub** (MOCK/stub -- NOT a real seat measurement)
- Gate-eligible (flips T2): **NO** -- a non-live or partial-corpus run never flips the existence-only T2 detector (anti-gaming)
- Corpus: 12/50 cases (isFull: false) -- expand via U-VALIDATION-50-EXPAND
- Totals: 0 passed / 12 failed / 0 errored of 12
- Ran at: 2026-06-27T23:23:01.571Z

## Per-domain accuracy

| Domain | Passed | Total | Accuracy |
|---|---:|---:|---:|
| mill | 0 | 4 | 0.0% |
| lathe | 0 | 4 | 0.0% |
| wedm | 0 | 4 | 0.0% |

## Per-case verdicts

| ID | Domain | Verdict | Iter | Exported | Stop | Reason |
|---|---|---|---:|---|---|---|
| MILL-001 | mill | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 2 |
| MILL-002 | mill | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 4 |
| MILL-003 | mill | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 2 |
| MILL-004 | mill | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 3 |
| LATHE-001 | lathe | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 2 |
| LATHE-002 | lathe | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 3 |
| LATHE-003 | lathe | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 2 |
| LATHE-004 | lathe | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 3 |
| WEDM-001 | wedm | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 4 |
| WEDM-002 | wedm | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 2 |
| WEDM-003 | wedm | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 2 |
| WEDM-004 | wedm | fail | 1 | yes | exported | opLog length 1 < expectedOpLogMin 5 |

## Next steps
1. Expand corpus 12 -> 50 (U-VALIDATION-50-EXPAND) from H:/PRISM/JM DIE/FUSION CAD AND CAM FILES.
2. Live hyperCAD-S seat run (--orchestrator live) for a REAL pre-train number.
3. operator_verified eval split before any adapter promotion (T1 deploy gate).

