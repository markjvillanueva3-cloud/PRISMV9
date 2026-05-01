# WEDM Dependency Graph Audit - Technical Details

**Generated:** 2026-03-31
**Tool:** Dependency Graph Analyzer (DFS + DAG validation)

---

## Raw Dependency Data

### MS0 Units (21 total)

```
U-WEDM01: [] (no dependencies)
U-WEDM02: [U-WEDM01]
U-WEDM03: [U-WEDM02]
U-WEDM04: [U-WEDM03]
U-WEDM05: [U-WEDM02]
U-WEDM06: [U-WEDM02]
U-WEDM07: [U-WEDM04, U-WEDM03]
U-WEDM08: [U-WEDM07, U-WEDM05]
U-WEDM09: [U-WEDM07, U-WEDM08]
U-WEDM10: [U-WEDM09]
U-WEDM11: [U-WEDM10]
U-WEDM12: [U-WEDM10, U-WEDM11]
U-WEDM13: [U-WEDM12]
U-WEDM14: [U-WEDM13]
U-WEDM15: [U-WEDM13, U-WEDM14]
U-WEDM16: [U-WEDM15]
U-WEDM17: [U-WEDM16]
U-WEDM18: [U-WEDM16, U-WEDM17]
U-WEDM19: [U-WEDM18]
U-WEDM20: [U-WEDM19]
U-WEDM21: [U-WEDM20]
```

### MS1 Units (24 total)

```
U-WEDM22: [U-WEDM15]
U-WEDM23: [U-WEDM22]
U-WEDM24: [U-WEDM22]
U-WEDM25: [U-WEDM15]
U-WEDM26: [U-WEDM15]
U-WEDM27: [U-WEDM26]
U-WEDM28: [U-WEDM15]
U-WEDM29: [U-WEDM28]
U-WEDM30: [U-WEDM29]
U-WEDM31: [U-WEDM29]
U-WEDM32: [U-WEDM31]
U-WEDM33: [U-WEDM32]
U-WEDM34: [U-WEDM15]
U-WEDM35: [U-WEDM34]
U-WEDM36: [U-WEDM34]
U-WEDM37: [U-WEDM15]
U-WEDM38: [U-WEDM15]
U-WEDM39: [U-WEDM38]
U-WEDM40: [U-WEDM15]
U-WEDM41: [U-WEDM40]
U-WEDM42: [U-WEDM41]
U-WEDM43: [U-WEDM15]
U-WEDM44: [U-WEDM43]
U-WEDM45: [U-WEDM44]
```

---

## Compaction Checkpoint Violations (Detailed)

### Unsafe Sessions

**WEDM-0-S2: Context + 2D Profile Canvas**
- Checkpoint: YES
- Units: [U-WEDM04, U-WEDM05, U-WEDM06]
- Violations:
  - U-WEDM04 depends on [U-WEDM03] (in WEDM-0-S1, OUTSIDE)
  - U-WEDM05 depends on [U-WEDM02] (in WEDM-0-S1, OUTSIDE)
  - U-WEDM06 depends on [U-WEDM02] (in WEDM-0-S1, OUTSIDE)
- Status: UNSAFE (3 external dependencies)

**WEDM-0-S3: Step 1 (Import) + Step 2 (Review & Setup)**
- Checkpoint: YES
- Units: [U-WEDM07, U-WEDM08, U-WEDM09]
- Violations:
  - U-WEDM07 depends on [U-WEDM04, U-WEDM03] (both OUTSIDE)
  - U-WEDM08 depends on [U-WEDM07, U-WEDM05] (both OUTSIDE)
- Status: UNSAFE (5 external dependencies)

**WEDM-0-S4: Step 3 (Machine + Job Setup)**
- Checkpoint: YES
- Units: [U-WEDM10, U-WEDM11, U-WEDM12]
- Violations: U-WEDM10 depends on [U-WEDM09] (OUTSIDE in WEDM-0-S3)
- Status: UNSAFE (1 external dependency)

**WEDM-0-S5: Step 4 (Execute + Monitor)**
- Checkpoint: YES
- Units: [U-WEDM13, U-WEDM14, U-WEDM15]
- Violations:
  - U-WEDM13 depends on [U-WEDM12] (OUTSIDE in WEDM-0-S4)
  - U-WEDM14 depends on [U-WEDM13] (OUTSIDE indirectly)
- Status: UNSAFE (3+ external dependencies)

**WEDM-0-S6: Step 5 (Refinement) + Step 6 (Post-Processing)**
- Checkpoint: YES
- Units: [U-WEDM16, U-WEDM17, U-WEDM18]
- Violations:
  - U-WEDM16 depends on [U-WEDM15] (OUTSIDE in WEDM-0-S5)
  - U-WEDM17 depends on [U-WEDM16] (OUTSIDE)
- Status: UNSAFE (3+ external)

**WEDM-0-S7: Final Integration**
- Checkpoint: YES
- Units: [U-WEDM19, U-WEDM20, U-WEDM21]
- Violations:
  - U-WEDM19 depends on [U-WEDM18] (OUTSIDE in WEDM-0-S6)
  - U-WEDM20 depends on [U-WEDM19] (OUTSIDE)
- Status: UNSAFE (3+ external)

### Violation Summary
- Total unsafe units: 20
- Total violations: 20 (one per unsafe unit)

---

## Inter-Milestone Dependencies

### All Direct Cross-Milestone Links

From MS1 to MS0 (9 total):
```
U-WEDM22 -> U-WEDM15
U-WEDM25 -> U-WEDM15
U-WEDM26 -> U-WEDM15
U-WEDM28 -> U-WEDM15
U-WEDM34 -> U-WEDM15
U-WEDM37 -> U-WEDM15
U-WEDM38 -> U-WEDM15
U-WEDM40 -> U-WEDM15
U-WEDM43 -> U-WEDM15
```

**Key Observation:** All 9 dependencies converge on U-WEDM15. No fragmentation of entry points.

---

## Parallelizability Analysis

### MS1 Within-Session Parallelization

**WEDM-1-S1:**
- Parallel pair: {U-WEDM23, U-WEDM24} (both depend on U-WEDM22)

**WEDM-1-S2:**
- Parallel pair: {U-WEDM25, U-WEDM26} (both depend on U-WEDM15)

**WEDM-1-S3:**
- Parallel pair: {U-WEDM30, U-WEDM31} (both depend on U-WEDM29)

**WEDM-1-S5:**
- Parallel pair: {U-WEDM35, U-WEDM36} (both depend on U-WEDM34)

### MS1 Between-Session Parallelization

After U-WEDM15 completes, these 9 entry units can execute in parallel:
- U-WEDM22, U-WEDM25, U-WEDM26, U-WEDM28, U-WEDM34, U-WEDM37, U-WEDM38, U-WEDM40, U-WEDM43

Requires: Async session execution (not sequential)

---

## Validation Results

### Cycle Detection
- Result: **PASS - 0 cycles detected**
- Method: Depth-First Search (DFS) with recursion stack tracking
- Coverage: All 45 nodes

### Reference Validation
- Result: **PASS - 0 undefined references**
- All dependencies point to valid unit IDs

### Topological Sort
Valid execution order exists (units can be ordered by dependencies)

---

## Recommendations Summary

| Priority | Issue | Fix |
|----------|-------|-----|
| CRITICAL | Compaction violations | Remove checkpoint flag from S2-S7 or move units |
| HIGH | U-WEDM15 validation | Document why all MS1 units depend on U-WEDM15 |
| HIGH | MS0 linear chain | Create parallel branches after U-WEDM15 |
| MEDIUM | MS1 parallelization | Enable async execution of 8 sessions |
| MEDIUM | Checkpoint gaps | Add checkpoints after U-WEDM10, U-WEDM15 |

---

END TECHNICAL DETAILS
