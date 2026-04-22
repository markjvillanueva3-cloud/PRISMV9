# PCCA + EIGC Integration into CAMX v24 Roadmap

## Current Roadmap Context

**File**: H:/prism/CAMX-RESTRUCTURED-ROADMAP-v24.md

The main roadmap currently positions EIGC and related tracks in Phase 15-20:
- Phase 15: ENGINE INTEGRITY GAP CLOSURE (EIGC — 11 MS, 44 units, ~15 sessions)
- Phase 16: AUTOMATION CONTROL PLANE (ACP — 8 MS, 43 units, ~12 sessions)
- Phase 17: MAX UTILIZATION + PRODUCT SURFACE (MXU + APP — 12 MS, 66 units, ~18 sessions)
- Phase 18-20: Ultimate Shop OS, Benchmark Suite, CAM System Infrastructure

**PCCA is not in the main roadmap yet** — exists only as design specification.

---

## Proposed Integration Strategy

### PART A: Immediate Extraction (Week 1-2)

Move 3 contract-freeze milestones OUT of their natural position and execute immediately in parallel:

**EIGC-MS0A → Execute Week 1 (standalone)**
- Current position in roadmap: Before EIGC-MS1, in Phase 15 sequence
- New position: Immediate prerequisite to EIGC-MS1 and EIGC-MS0
- Rationale: Design standards must freeze before any audit or patching
- Dependencies: None
- Impact on roadmap: +1 session, zero delay (parallel to current Phase 4 exit)

**EIGC-MS1 → Execute Week 1 (standalone, parallel to EIGC-MS0A)**
- Current position in roadmap: After EIGC-MS0, in Phase 15 sequence
- New position: Immediate successor to EIGC-MS0A, can run parallel to PCCA-MS0A
- Rationale: ESLint gate must be operational before Phase 5 validation work
- Dependencies: None (contextually benefits from EIGC-MS0A)
- Impact on roadmap: +1 session, zero delay (hard gate unblocks validation)

**PCCA-MS0A → Execute Week 1 (standalone, parallel)**
- Current position in roadmap: Does not exist yet
- New position: Immediate prerequisite to PCCA-MS0 and all PCCA work
- Rationale: Capability conversion rules must be frozen before asset census begins
- Dependencies: None
- Impact on roadmap: +1 session, zero delay (parallel to EIGC work)

**Subtotal Week 1**: 3 sessions, ~6 hours, parallel execution, zero impact on critical path

### PART B: Dependent Work (Week 2-3)

Sequential dependencies that must follow contract freezes:

**EIGC-MS0 → Execute Week 2 (after EIGC-MS0A)**
- Current position in roadmap: Phase 15, before EIGC-MS1 in sequence
- New position: Week 2, after EIGC-MS0A output available
- Rationale: Baseline audit requires contract standards to be frozen
- Dependencies: EIGC-MS0A
- Impact on roadmap: +1-2 sessions, moved earlier by ~12 weeks (from Phase 15 to Week 2)

**PCCA-MS0 → Execute Week 2-3 (after PCCA-MS0A)**
- Current position in roadmap: Does not exist
- New position: Week 2-3, after PCCA-MS0A output available
- Rationale: Asset census requires capability conversion rules to be frozen
- Dependencies: PCCA-MS0A
- Impact on roadmap: +1-2 sessions, inserted before Phase 15

**Subtotal Week 2-3**: 2-4 sessions, ~8 hours, sequential, zero impact on critical path

### PART C: Phase Injections (Week 3-16, overlaid on Phases 3-13)

Four PCCA/EIGC milestones injected into ongoing phases to enhance without delaying:

**Injection 1: EIGC-MS7 → Into Phase 5 (ERP & Business Management Hardening)**
- Current position in roadmap: Phase 15, position 7 of 11
- New position: Phase 5, as milestone gate before ERP routing contracts finalize
- Effort: 2 sessions (~4 hours)
- Rationale: Domain model must be unified before Phase 5 routes are locked
- Dependencies: EIGC-MS6 (Phase 15) — **BLOCKER**: Need to resolve dependency
  - Option A: Move EIGC-MS6 earlier too (parallel domain work)
  - Option B: Allow EIGC-MS7 to proceed on prior domain inventory (less ideal)
  - Option C: Accept that Phase 5 routes will be updated after Phase 15 completes (rework)
- **Recommended**: Option A — Move EIGC-MS6 to Phase 4-5 boundary

**Injection 2: PCCA-MS4 → Into Phase 3-Extended (Level 3 Decisions + Process Physics)**
- Current position in roadmap: Does not exist in main roadmap, PCCA-MS4 is design-only
- New position: Phase 3-Ext, as exit gate before Level 3 routing contracts finalize
- Effort: 2-3 sessions (~4-6 hours)
- Rationale: Speed/feed knowledge (holder, fixture, finish effects) must be first-class
- Dependencies: PCCA-MS0 (Week 2-3) — satisfied
- **Recommendation**: Execute after PCCA-MS0 complete, can fit in Phase 3-Ext timeline

**Injection 3: PCCA-MS6 → Into Phase 6 (Backend Business Platform — E2/QB/Xometry/Fictiv)**
- Current position in roadmap: Does not exist
- New position: Phase 6, as feature review before business routing contracts finalize
- Effort: 2-3 sessions (~4-6 hours)
- Rationale: ERP/quote intelligence must be integrated before business feature parity complete
- Dependencies: PCCA-MS0 (Week 2-3) — satisfied
- **Recommendation**: Execute in Phase 6 week 4-6 after PCCA-MS0 complete

**Injection 4: PCCA-MS1 → Into Phase 13 (Final Wiring + Web UI)**
- Current position in roadmap: Does not exist
- New position: Phase 13, as infrastructure gate before UI finalization
- Effort: 2-3 sessions (~4-6 hours)
- Rationale: Activation layer must be sound before UI exposes capabilities
- Dependencies: PCCA-MS0 (Week 2-3) — satisfied
- **Recommendation**: Execute in Phase 13 week 2-4 before UI contract finalization

**Subtotal Injections**: 8-11 sessions, ~16-22 hours, distributed across Phases 3-13, zero impact on phase exit gates (enhanced, not delayed)

### PART D: Phase 15-17 Proper (Phase 15+ timeline)

Remaining PCCA and EIGC milestones execute as originally scheduled after Phase 14:

**EIGC in Phase 15 (Rearranged sequence)**:
- EIGC-MS2 (Runtime Honesty) — after EIGC-MS1 complete
- EIGC-MS3 (No-Op Fixes) — after EIGC-MS2 complete
- EIGC-MS4 (Promotion/Downgrade) — after EIGC-MS3 complete
- EIGC-MS5 (Roadmap Reconciliation) — after EIGC-MS4 complete
- ~~EIGC-MS6~~ (Integrity Tests) — **MOVED EARLIER** to Phase 5 boundary (see Injection 1 blocker resolution)
- ~~EIGC-MS7~~ (Domain Model) — **MOVED EARLIER** to Phase 5 (see Injection 1)
- EIGC-MS8 (Provenance + Confidence) — after EIGC-MS7 complete
- EIGC-MS9 (Support Matrix) — after EIGC-MS8 complete
- EIGC-MS10 (Golden-Path E2E) — **MOVED TO PHASE 12** (Testing phase, more appropriate)

**PCCA in Phase 16-17** (Phase 15 prep):
- PCCA-MS2 (Course-to-Capability Compiler) — depends on Phase 13 UI finalization
- PCCA-MS3 (Controller, Post, Benchmark) — depends on Phase 6 post engine finalization
- PCCA-MS5 (Geometry Kernel Promotion) — depends on MIT module assessment
- ~~PCCA-MS1~~ (Activation Repair) — **MOVED EARLIER** to Phase 13 (see Injection 4)
- ~~PCCA-MS4~~ (Speed/Feed) — **MOVED EARLIER** to Phase 3-Ext (see Injection 2)
- ~~PCCA-MS6~~ (ERP Intelligence) — **MOVED EARLIER** to Phase 6 (see Injection 3)
- PCCA-MS7 (Context/Token/Memory) — depends on Phase 13 build wiring complete
- PCCA-MS8 (Truth Gates and Merge) — final capstone after all other PCCA complete

**Subtotal Phase 15-17 Proper**: ~19 sessions, 40+ hours, standard execution (after Phases 3-14 complete)

---

## Revised Roadmap Timeline

### Baseline (Current v24)
- Phases 0-14: Current work (unchanged)
- Phases 15-20: EIGC, ACP, MXU, ULT, BENCH, CAMX

### Proposed Integration
- **Week 1-2**: Extract 3 contract-freeze milestones + audit foundations
  - EIGC-MS0A, EIGC-MS1, PCCA-MS0A (parallel)
  - EIGC-MS0, PCCA-MS0 (sequential)
  - Total: ~13.5 hours
  
- **Phases 0-4 (unchanged)**: Continue current execution, EIGC-MS0A + EIGC-MS1 complete as prerequisite gates

- **Phase 3-Ext**: Inject PCCA-MS4 (Speed/Feed Knowledge) into Phase 3 exit gate
  - +2-3 sessions (~4-6 hours), no delay

- **Phase 4**: Finalize with EIGC-MS0A + EIGC-MS1 validation gates hardened
  - ESLint gate operational before Phase 5

- **Phase 5**: Inject EIGC-MS7 (Domain Model) as milestone gate + continue standard work
  - +2 sessions (~4 hours), no delay
  - Domain model frozen before ERP routes finalize
  - **Blocker resolution required**: Move EIGC-MS6 earlier (recommend Phase 4-5 boundary)

- **Phase 6**: Inject PCCA-MS6 (ERP Intelligence) into Phase 6 feature review + continue standard work
  - +2-3 sessions (~4-6 hours), no delay
  - Executable risk/scheduling/costing integrated before business routes finalize

- **Phases 7-12**: Standard execution + EIGC-MS10 (Golden-Path E2E) moved to Phase 12 (Testing)
  - EIGC-MS10 validates Phases 5-6 work end-to-end
  - More appropriate phase than Phase 15

- **Phase 13**: Inject PCCA-MS1 (Activation Repair) into Phase 13 UI wiring gate + continue standard work
  - +2-3 sessions (~4-6 hours), no delay
  - Activation layer sound before UI finalizes

- **Phases 14+**: Standard execution (unchanged)

- **Phase 15 (EIGC Rearranged)**: EIGC-MS2-MS5, EIGC-MS8-MS9 (11 MS reduced to 9 MS)
  - EIGC-MS6, EIGC-MS7 moved earlier to Phase 4-5 boundary
  - EIGC-MS10 moved to Phase 12
  - ~12-13 sessions instead of original 15

- **Phase 16 (ACP)**: Unchanged

- **Phase 17 (MXU + APP)**: Unchanged

- **Phase 18-20**: Unchanged (ULT, BENCH, CAMX infrastructure)

---

## Roadmap Impact Analysis

### Critical Path Impact
- **Week 1-2**: +6 hours (3 parallel sessions, zero delay on Phase 4 work)
- **Phase 3-13**: +16-22 hours injected as enhancement, zero delay on phase completion
- **Phase 15+**: -15% effort (milestones moved earlier, EIGC-MS10 moved to Phase 12)
- **Net Effect**: +22-28 hours over Weeks 1-2, -3-4 hours in Phase 15, +0 overall delay

### Validation Gates Hardened
- Week 1: ESLint gate operational (EIGC-MS1)
- Week 1: Design standards frozen (EIGC-MS0A, PCCA-MS0A)
- Phase 4: Capability audit baseline complete (EIGC-MS0)
- Phase 5: Domain model unified (EIGC-MS7)
- Phase 12: Golden paths validated (EIGC-MS10, moved from Phase 15)

### Knowledge Leverage Accelerated
- Phase 3-Ext: Speed/feed manufacturer knowledge first-class (PCCA-MS4)
- Phase 5: ERP contracts align to unified schema (EIGC-MS7)
- Phase 6: Executable business intelligence available (PCCA-MS6)
- Phase 13: UI wires activated rather than phantom capabilities (PCCA-MS1)

### Rework Reduction
- Without injection: Phase 5-6 build routes → Phase 15 discover domain conflicts → Phase 16 rework
- With injection: Phase 5 routes built with unified domain model → Phase 15 validates only

---

## Dependency Resolution Required

### BLOCKER: EIGC-MS6 ↔ EIGC-MS7 Dependency

Current state:
- EIGC-MS7 (Canonical Domain Model) depends on EIGC-MS6 completion (per JSON: `"dependencies": ["EIGC-MS6"]`)
- Want: EIGC-MS7 to execute in Phase 5 (Week 4-6)
- Current EIGC-MS6 position: Phase 15

**Resolution Options**:
1. **Move EIGC-MS6 to Phase 4-5 boundary** (Recommended)
   - Effort: 2-3 sessions, ~4-6 hours
   - Rationale: Test coverage is prerequisite to domain model completeness
   - Impact: Validates code integrity before domain model design
   - Action: Resequence EIGC milestones

2. **Allow EIGC-MS7 to proceed on prior domain inventory**
   - Effort: Same 2-3 sessions for EIGC-MS7
   - Rationale: Domain model can be built from current state, tests added in Phase 15
   - Impact: EIGC-MS7 proceeds faster, EIGC-MS6 adds validation after
   - Action: Update EIGC-MS7 dependency, mark as provisional

3. **Accept Phase 5-6 rework requirement**
   - Effort: EIGC-MS7 executes in Phase 15, Phase 5-6 routes updated after
   - Rationale: Phase 5-6 can proceed independently, harmonized in Phase 15
   - Impact: Domain model reconciliation in Phase 15
   - Action: No change needed, but accept rework

**Recommendation**: Option 1 (Move EIGC-MS6 to Phase 4-5 boundary)
- Validates code integrity before domain design
- Establishes coverage baseline early
- Allows EIGC-MS7 to proceed with confidence

---

## Documentation Updates Required

The following roadmap documents must be updated to reflect this integration:

1. **H:/prism/CAMX-RESTRUCTURED-ROADMAP-v24.md**
   - Add PCCA section before Phase 15
   - Resequence Phase 15 EIGC milestones (move MS6, MS7, MS10)
   - Add injection markers to Phases 3, 5, 6, 13
   - Update effort totals

2. **H:/prism/mcp-server/data/milestones/**
   - Create remaining PCCA-MS*.json files (MS2, MS3, MS5, MS7, MS8)
   - Update EIGC-MS7 dependency from MS6 to MS5 (if Option 1 chosen)
   - Add "injection_target" field to PCCA-MS1, MS4, MS6; EIGC-MS7

3. **H:/prism/state/HANDOFF.md**
   - Add PCCA-EIGC integration as part of next session resume
   - Link to this document for context

4. **Phase planning documents**
   - Phase 3-Ext: Add PCCA-MS4 to milestones
   - Phase 5: Add EIGC-MS7 to milestones
   - Phase 6: Add PCCA-MS6 to milestones
   - Phase 12: Add EIGC-MS10 to milestones
   - Phase 13: Add PCCA-MS1 to milestones
   - Phase 15: Remove MS6, MS7, MS10 and resequence

---

## Approval Checklist

Before executing this integration plan, confirm:

- [ ] EIGC-MS0A execution approved for Week 1
- [ ] EIGC-MS1 execution approved for Week 1 (parallel)
- [ ] PCCA-MS0A execution approved for Week 1 (parallel)
- [ ] Dependency blocker resolution chosen (recommend Option 1 for EIGC-MS6 ↔ MS7)
- [ ] Phase injection slots confirmed (Phase 3-Ext, 5, 6, 13)
- [ ] Roadmap documentation update schedule established
- [ ] EIGC-MS10 moved to Phase 12 (Testing) approved

---

## Files to Update

**Create**:
- (Already created by Loop 2 scrutiny)

**Modify**:
- H:/prism/CAMX-RESTRUCTURED-ROADMAP-v24.md (major resequencing)
- H:/prism/mcp-server/data/milestones/EIGC-MS*.json (add phase/injection context)
- H:/prism/mcp-server/data/milestones/PCCA-MS*.json (create remaining 4 files)
- H:/prism/state/HANDOFF.md (update resume section)

---

**Status**: Ready for approval to integrate PCCA/EIGC into v24 roadmap per this plan.
