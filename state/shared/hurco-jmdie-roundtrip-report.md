# Hurco V11 ↔ JM Die Roundtrip Report

**Generated:** 2026-05-25T02:01:37.839Z
**Source dir:** `H:/PRISM/JM DIE/HURCO CNC PROGRAMS`
**V11 method:** `generateProgramWithFullPSN()` (HURCO-VM30I-FULL-PSN-MS0)
**Files tested:** 3  ·  **Complete:** 0  ·  **Error:** 3

## Per-file results

| File | Stage | Orig lines | Re-emit lines | First-50 match | PSN engaged | Errors |
|------|-------|------------|---------------|----------------|-------------|--------|
| `1001.hnc` | no_ops | 281 | - | - | - | No recoverable operations from parse — skipping re-emit |
| `0520396.hnc` | no_ops | 545 | - | - | - | No recoverable operations from parse — skipping re-emit |
| `SACMA CUTOFF.hnc` | no_ops | 1050 | - | - | - | No recoverable operations from parse — skipping re-emit |

## PSN enrichment details (per file)

## Next steps for operator

1. Load each `reemit.hnc` file in your WinMax desktop app
2. Note whether the program loads without edits + simulates cleanly
3. Compare predicted-vs-actual cycle time on the real machine (target ≤5% error)
4. File each failure as a unit in HURCO-POST-REMEDIATION-MS2