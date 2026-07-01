# R2→R3 Transition Design
## Date: 2026-02-21 | Status: APPROVED (self-transition)

---

## R2 Final State (Complete)

| Metric | Score |
|--------|-------|
| Golden benchmarks | 150/150 (100%) |
| Spot checks | 6/6 (all ISO groups) |
| Edge cases | 20/20 (5 categories) |
| Build | 3.93MB, 7 symbols, 0 bad patterns |
| Omega | 0.77 (RELEASE_READY) |
| Safety | S(x) = 0.85 |
| Git tag | `r2-complete` |
| Milestones | MS0-MS5 all ✅ |

### R2 Deliverables for R3
- **Calibrated Kienzle/Taylor** per-material coefficients for all 6 ISO groups
- **Stability engine** with corrected Re[G] formula (Altintas)
- **Safety validation** with SAFETY_LIMITS enforcement on all inputs
- **Response level** (pointer/summary/full) wired in calcDispatcher + safetyDispatcher
- **Test infrastructure**: run-benchmarks.ts, spot-check.ts, run-edge-cases.ts

### R2 Gap Fixes Applied
- Spot checks expanded 5→6 (added H-group B031)
- INDEX.md rewritten from stale MS0 data to current MS4/MS5 state
- Param normalization timing verified (aliases before hooks ✅)
- Skill audit: 52% reduction recommended (21K→10K lines)
- Ralph audit: KEEP + wire into release pipeline

---

## R3 Entry Criteria (Per PHASE_R3_v19.md)

| Criterion | Status |
|-----------|--------|
| R2 complete | ✅ Tag `r2-complete` |
| Ω ≥ 0.70 | ✅ 0.77 |
| Benchmarks ≥ 80% | ✅ 100% |

---

## R3 Architecture Overview

**Phase:** R3 — Intelligence Extraction + Features + Campaigns
**Layers:** L3 (Domain Rules) → L4 (Composed Features) → L5 (Scale Validation)
**Mode:** Code 65% / Chat 35%
**Sessions:** 3-4 estimated

### R3 Milestones
| MS | Name | Tasks | Key Deliverable |
|----|------|-------|----------------|
| MS0 | Intelligence Feature Design | T1-T3 | INTELLIGENCE_SPEC.md + IntelligenceEngine.ts scaffold |
| MS1 | Intelligence Implementation | T1-T4 | 11 composed actions fully implemented |
| MS2 | Material Enrichment | T1a-T2d | Enriched material data (4 parallel code agents) |
| MS3 | Campaign Engine | T1-T2 | CampaignEngine.ts + batch runner |
| MS4 | Batch Campaigns | T1-T3 | 17K+ datapoints validated |
| MS5 | Phase Gate | T1-T3 | Ω ≥ 0.70, intelligence actions verified |

### 11 Intelligence Actions (R3 Core)
1. `job_plan` — operation sequence + tool selection + params per op
2. `setup_sheet` — workholding, datums, tools, G-code references
3. `process_cost` — cost breakdown (machine time, tool cost, overhead)
4. `material_recommend` — ranked material candidates with tradeoff analysis
5. `tool_recommend` — ranked tool candidates with justification
6. `machine_recommend` — best machine match with utilization estimate
7. `what_if` — delta analysis (force, life, finish, safety, cost)
8. `failure_diagnose` — root cause + fix procedure
9. `parameter_optimize` — Pareto-optimal params
10. `cycle_time_estimate` — total time breakdown per operation
11. `quality_predict` — expected Ra, Rz, dimensional accuracy

### Architecture Decision: Compose, Don't Rewrite
Each intelligence action COMPOSES existing calibrated engines:
- `job_plan` = MaterialRegistry lookup + speed_feed + cutting_force + stability check + tool_life
- `what_if` = current params + delta + re-run relevant engines + diff
- `quality_predict` = surface_finish + deflection + thermal effects

This preserves R2 calibration investment — no engine rewrites needed.

---

## R3-MS0 Starting Approach

**MS0-T1 (Chat/Opus):** Design INTELLIGENCE_SPEC.md with:
- Full input/output schemas for all 11 actions
- Engine composition map per action
- Safety gates per action
- Uncertainty propagation chains

**MS0-T2 (Code/Sonnet):** Scaffold IntelligenceEngine.ts:
- Import existing engines
- Stub all 11 actions with validation + NOT_IMPLEMENTED
- Wire into calcDispatcher.ts as new MCP actions
- Build + verify

**MS0-T3 (Code/Sonnet):** Implement first action (job_plan):
- Most complex action — validates architecture
- Exercises all three engine files + all three registries
- Sets pattern for remaining 10 actions

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| IntelligenceEngine.ts grows too large | Split into domain-specific sub-engines (JobPlanner, Recommender, etc.) |
| Response level not carried through compound actions | Every action accepts response_level, uses formatByLevel |
| Material enrichment corrupts existing data | Enrichment is ADDITIVE (new fields only), never modifies existing |
| Campaign batch size overwhelms memory | Streaming architecture, batch-of-100 with checkpoint |
| R2 calibration values drift | Golden benchmarks run as regression test before each R3 commit |

---

## Carry-Forward Items from MS5 Audit

### For R3:
1. Wire Ralph Loop into release gate (MS5-T2 recommended)
2. All new intelligence actions must include response_level support
3. IntelligenceEngine.ts must have its own test suite (tests/r3/intelligence-tests.ts)
4. Campaign engine must validate each result against SAFETY_LIMITS

### For R4 (later):
1. Roll out response_level to remaining 29 dispatchers
2. Consolidate 14 skills → 10 per SKILL_AUDIT.md recommendations
