# Hurco V11 ↔ JM Die Roundtrip Report (TSX runtime)

**Generated:** 2026-05-25T03:54:32.242Z
**Source dir:** `H:/PRISM/JM DIE/HURCO CNC PROGRAMS`
**Runtime:** tsx (src/.ts direct import — bypasses stale dist)
**Files tested:** 3  ·  **Complete:** 3  ·  **No-ops:** 0  ·  **Error:** 0

## Per-file results

| File | Stage | Orig lines | Re-emit lines | Ops re-emitted | First-50 match | PSN engaged | Errors |
|------|-------|------------|---------------|----------------|----------------|-------------|--------|
| `1001.hnc` | complete | 281 | 218 | 4 | 0% | ✅ | — |
| `0520396.hnc` | complete | 545 | 465 | 7 | 0% | ✅ | — |
| `SACMA CUTOFF.hnc` | complete | 1050 | 859 | 6 | 0% | ✅ | — |

## PSN enrichment per file

### 1001.hnc
- **Runtime:** 0.22 min on hurco_vmx24
- **Cost:** $0.68 (0.22 min · machine_time)
- **Optimizer recs:** 0 total
- **AI features:** 0 recommended
- **Re-emitted .hnc:** `H:\prism\state\shared\hurco-jmdie-roundtrip-tsx\reemit\1001.reemit.hnc` — load in WinMax to validate

### 0520396.hnc
- **Runtime:** 3.37 min on hurco_vmx24
- **Cost:** $10.33 (3.37 min · machine_time)
- **Optimizer recs:** 16 total
- **AI features:** 0 recommended
- **Re-emitted .hnc:** `H:\prism\state\shared\hurco-jmdie-roundtrip-tsx\reemit\0520396.reemit.hnc` — load in WinMax to validate

### SACMA CUTOFF.hnc
- **Runtime:** 4.65 min on hurco_vmx24
- **Cost:** $14.26 (4.65 min · machine_time)
- **Optimizer recs:** 32 total
- **AI features:** 0 recommended
- **Re-emitted .hnc:** `H:\prism\state\shared\hurco-jmdie-roundtrip-tsx\reemit\SACMA CUTOFF.reemit.hnc` — load in WinMax to validate

## Operator next steps

1. For each `.reemit.hnc` above, open in WinMax desktop app
2. Report load + simulation status (clean / needs-edit / rejected)
3. Compare predicted cycle (above) vs actual machine cycle
4. Failures become units in HURCO-POST-REMEDIATION-MS2