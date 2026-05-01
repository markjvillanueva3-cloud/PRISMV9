# WEDM Dependency Graph Audit

**Date:** 2026-03-31  
**Scope:** WEDM-MS0 (21 units) + WEDM-MS1 (24 units) = 45 total  
**Auditor Role:** Dependency Graph Validator  

---

## Summary

| Metric | Result | Status |
|--------|--------|--------|
| Total Units | 45 | OK |
| Circular Dependencies | 0 | PASS |
| Invalid References | 0 | PASS |
| Cross-Milestone Dependencies | 9 (all on U-WEDM15) | WARNING |
| Unsafe Compaction Points | 20 violations | CRITICAL |
| Max Dependency Depth | 18 levels | HIGH |
| **Final Score** | **51/84 (60%)** | **FAIL** |

---

## Finding 1: CRITICAL - Compaction Checkpoint Safety

### Problem
20 units in compaction checkpoints depend on units OUTSIDE their checkpoint session.

**Examples:**
- `WEDM-0-S2/U-WEDM04` depends on `U-WEDM03` (in `WEDM-0-S1`)
- `WEDM-0-S2/U-WEDM05` depends on `U-WEDM02` (in `WEDM-0-S1`)
- `WEDM-0-S3/U-WEDM07` depends on `U-WEDM04` (in `WEDM-0-S2`)

**Impact:**
- Compaction will split dependent units across multiple sessions
- Leads to session bloat and re-open inefficiency
- Violates the single-checkpoint-per-session guarantee

**Recommendation:**
Either:
1. Move dependent units into the same checkpoint, OR
2. Remove `compact_checkpoint: true` from sessions with external dependencies

---

## Finding 2: HIGH - Maximum Dependency Depth = 18

### Data
```
U-WEDM21: depth 18 (deepest)
U-WEDM20: depth 17
U-WEDM33: depth 17
U-WEDM19: depth 16
U-WEDM32: depth 16
U-WEDM18: depth 15
U-WEDM30: depth 15
U-WEDM31: depth 15
U-WEDM42: depth 15
U-WEDM45: depth 15
```

**Critical Chain:**
```
U-WEDM21 <- U-WEDM20 <- U-WEDM19 <- U-WEDM18 <- ... <- U-WEDM01
```

**Impact:**
- No session can execute in parallel with U-WEDM21
- A single failure anywhere in the 18-unit chain blocks completion
- Context overhead: each subsequent session must load prior results
- Long "tail" risk if any unit stalls

**Recommendation:**
- Consider breaking MS0 into 2-3 smaller milestones
- Identify opportunities for fan-out (parallel branches) after U-WEDM15
- Current structure: mostly linear, should be more tree-like

---

## Finding 3: WARNING - U-WEDM15 as Single Inter-Milestone Bottleneck

### Data
All 9 direct MS1→MS0 dependencies converge on U-WEDM15:
```
U-WEDM22 <- U-WEDM15
U-WEDM25 <- U-WEDM15
U-WEDM26 <- U-WEDM15
U-WEDM28 <- U-WEDM15
U-WEDM34 <- U-WEDM15
U-WEDM37 <- U-WEDM15
U-WEDM38 <- U-WEDM15
U-WEDM40 <- U-WEDM15
U-WEDM43 <- U-WEDM15
```

### Analysis

**U-WEDM15 Details:**
- Title: "Integrate steps 5-6 into wizard page"
- Depends on: `U-WEDM13`, `U-WEDM14`
- Depth: 2 (from root)

**Alternative Options:**
- **U-WEDM18:** "Add EdmPage link + Quick Generate integration" (depth 15)
  - Includes routing + integration
  - Would allow MS1-S1..S3 to start earlier without full build
  
- **U-WEDM21:** "Full build verification + type check + integration test" (depth 18)
  - Guarantees system-level consistency
  - Best for QA-heavy features (Surface Integrity, Spec Compliance)

### Questions to Address
1. **Is U-WEDM15 correct?**
   - If MS1 features need routing/integration, should depend on U-WEDM18
   - If MS1 features need full validation, should depend on U-WEDM21

2. **Should MS1 features be stratified?**
   - Example: U-WEDM25 (Wire Management) might only need U-WEDM15
   - But U-WEDM31 (Spec Compliance FAI Reports) might need U-WEDM21

3. **Risk if U-WEDM15 fails:**
   - All 9 MS1 entry points blocked
   - No per-feature fallback or bypass

**Current Assessment:** This is a design choice, not a bug. But requires validation against actual feature requirements.

---

## Finding 4: LOW - MS1 Parallelization is Abundant but Underutilized

### Data
```
Session WEDM-1-S1: 3 units
  - U-WEDM22 depends on U-WEDM15
  - U-WEDM23 depends on U-WEDM22 (sequence)
  - U-WEDM24 depends on U-WEDM22 (sequence)
  
  Can parallelize: U-WEDM23 + U-WEDM24 (both depend on U-WEDM22)

Session WEDM-1-S2: 3 units
  - U-WEDM25, U-WEDM26 depend on U-WEDM15
  - U-WEDM27 depends on U-WEDM26
  
  Can parallelize: U-WEDM25 + U-WEDM26 (both depend on U-WEDM15)

Session WEDM-1-S3: 3 units
  - U-WEDM28 depends on U-WEDM15
  - U-WEDM29 depends on U-WEDM28
  - U-WEDM30, U-WEDM31 depend on U-WEDM29
  
  Can parallelize: U-WEDM30 + U-WEDM31

...and 5 more sessions with similar patterns
```

### Observation
- Each of 8 sessions has 2-3 units
- Within-session parallelization is possible in most sessions
- But **between-session parallelization is blocked by U-WEDM15 bottleneck**

**Recommendation:**
- After U-WEDM15 completes, execute all WEDM-1-S1..S8 entry units in parallel
- This requires: 1 session per feature (8 sessions) running in parallel, not sequentially
- Current roadmap assumes sequential session execution

---

## Finding 5: PASS - No Circular Dependencies

**Result:** 0 circular cycles detected. DAG is valid.

---

## Finding 6: PASS - All References Valid

**Result:** 0 undefined dependency references. All `depends_on` point to existing units.

---

## Finding 7: GOOD - MS1 Internal Consistency

**Result:**
- No cycles within MS1 units
- Proper layering (no tangled dependencies)
- Each session has clear internal structure

---

## Recommendations (Priority Order)

### CRITICAL (Must Fix)
1. **Fix compaction checkpoint safety**
   - Remove `compact_checkpoint: true` from sessions with external dependencies, OR
   - Move dependent units into the same session
   - This will prevent session fragmentation after compaction

### HIGH (Should Address)
2. **Validate U-WEDM15 as inter-milestone dependency**
   - Review MS1 feature requirements against U-WEDM15 capabilities
   - Consider if any features should depend on U-WEDM18 (routing) or U-WEDM21 (validation)
   - Document the rationale in each MS1 session's intent

3. **Break MS0 linear chain**
   - Currently: `U-WEDM01 -> U-WEDM02 -> U-WEDM03 -> ... -> U-WEDM21` (mostly linear)
   - Restructure: Create parallel branches after early units
   - Example: After U-WEDM10, create 2-3 independent feature branches that converge at U-WEDM18

### MEDIUM (Nice to Have)
4. **Exploit MS1 parallelization**
   - After U-WEDM15, schedule all 8 WEDM-1-S* sessions in parallel
   - Requires async session execution (not sequential)
   - Reduces total runway by ~7-8 sessions

5. **Add intermediate checkpoints**
   - Current: only final-session checkpoints
   - Proposed: Add checkpoint after U-WEDM10, U-WEDM15, U-WEDM18 in MS0
   - Reduces recompile scope on failures

---

## Scoring Breakdown

| Category | Score | Max | Notes |
|----------|-------|-----|-------|
| Circular Dependencies | 15 | 15 | PASS |
| Invalid References | 10 | 10 | PASS |
| Inter-milestone Dependencies | 12 | 12 | WARNING (all on U-WEDM15, but valid) |
| Compaction Safety | 0 | 15 | CRITICAL (20 unsafe units) |
| Dependency Depth | 2 | 10 | HIGH (depth 18, very linear) |
| Parallelization | 0 | 10 | LOW (MS1 parallel available but not exploited) |
| MS1 Internal Consistency | 12 | 12 | PASS |
| **TOTAL** | **51** | **84** | **60%** |

---

## Conclusion

**Overall Assessment:** CONDITIONAL PASS with mandatory fixes

The dependency graph is **structurally sound** (no cycles, valid references) but has **critical operational issues** that must be resolved before execution:

1. Compaction checkpoint violations will cause session fragmentation
2. U-WEDM15 bottleneck is acceptable but must be validated against feature needs
3. Linear dependency chain creates high risk and context bloat
4. MS1 parallelization potential is underutilized but not problematic

**Recommended Action:**
1. Fix compaction points (CRITICAL - blocks execution)
2. Validate U-WEDM15 dependencies (HIGH - blocks optimality)
3. Restructure for parallelization (MEDIUM - improves performance)

**Score: 60/100** (fails threshold, requires remediation)

