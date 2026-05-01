# Sequencing Audit — Action Item Tracker

**Audit Date**: 2026-03-30  
**Audit Score**: 8.2/10  
**Status**: All findings catalogued, ready for assignment

---

## IMMEDIATE (Next 2 Days) — Priority: CRITICAL

### Task 1: Create ROADMAP_STATE_MACHINE.json
**Severity**: CRITICAL  
**Effort**: 2 hours  
**Owner**: [ASSIGN]  
**Deliverable**: `H:\prism\state\shared\ROADMAP_STATE_MACHINE.json`

**Scope**:
- [ ] Define JSON schema for phase state machine
- [ ] Map 14 phases (MP-0 through Phase ∞)
- [ ] Include exit gate criteria for each phase
- [ ] Document unlock_when logic (when blocker complete → unlock dependents)
- [ ] Add target_completion estimates
- [ ] Include version field + last_updated timestamp

**Acceptance Criteria**:
- [ ] Schema validates against custom JSON schema
- [ ] All 14 phases present with status + criteria arrays
- [ ] At least 3 phases have sample criteria (e.g., MP-0: routing-validation, billing-mount, proof-stack-doc)
- [ ] unlock_when references are consistent (no dangling references)
- [ ] File loads without errors in jq/Node

**Related Files**:
- Reference: PRISM-UNIFIED-ROADMAP.md (MP-0 exit gate criteria at lines 128-129)
- Reference: CONVERGE Plan (phase descriptions at state/shared/memory/project_converge_roadmap.md)

---

### Task 2: Add DEPENDS_ON Section to 10 Child Roadmaps
**Severity**: CRITICAL  
**Effort**: 4 hours (30 min per document)  
**Owner**: [ASSIGN]  
**Deliverables**: Updates to 10 roadmap files

**Target Documents** (copy HBK pattern from MACHINE-HANDBOOK-INTELLIGENCE-ROADMAP.md lines 20-22):
1. [ ] AUTO-BP — MCP-FULL-AUTOMATION-BLUEPRINT.md
2. [ ] AUTO-DEV — MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md
3. [ ] AUTO-HARD — MCP-AUTOMATION-HARDENING-ROADMAP.md
4. [ ] RLH — RESOURCE-LEARNING-HARDENING-ROADMAP.md
5. [ ] TKP — TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md
6. [ ] ULT — ULTIMATE-SHOP-OS-roadmap.md
7. [ ] PPG — POST_ULTIMATE_ROADMAP.md
8. [ ] SQ-M1 — LATHE-COMPREHENSIVE-ROADMAP.md
9. [ ] SQ-M8 — WIRE-EDM-COMPREHENSIVE-ROADMAP.md
10. [ ] v25 — ULTIMATE-PRISM-ROADMAP-v25.md

**Template to Add** (after line that lists milestones):
```markdown
## Dependencies

### Dependencies In (must be complete before this roadmap's entry gate)
- Parent Phase: MP-0 / MP-1A / [relevant]
- Registry: [if any, e.g., MachineRegistry, ToolRegistry]
- Engine: [if depends on specific engine, e.g., AlarmDiagnosticsEngine]

### Dependencies Out (gates downstream phases)
- Phase: [which MP or SQ depends on this roadmap's completion]

### Blocking Criteria
- [ ] Parent phase exit gates passed
- [ ] Registries populated/verified
- [ ] Referenced engines wired and tested
```

**Acceptance Criteria**:
- [ ] All 10 files have DEPENDS_ON section
- [ ] Each section includes "Dependencies In" + "Dependencies Out"
- [ ] For AUTO/RLH/TKP: correctly references MP-1A as blocker (SQ-B gate: "after MP-1A stable")
- [ ] For SQ-M1/8: correctly references MP-1A
- [ ] HBK already correct (don't modify)

**Validation**:
- [ ] Run new /roadmap-validate skill (WIP) to check all declarations
- [ ] No circular references detected

---

### Task 3: Create CONVERGE_COMPLETION_GATES.md
**Severity**: CRITICAL  
**Effort**: 3 hours  
**Owner**: [ASSIGN]  
**Deliverable**: `H:\prism\state\shared\CONVERGE_COMPLETION_GATES.md`

**Scope**:
- [ ] Define exit gate for each CONVERGE phase (1-6)
- [ ] Link to corresponding MP phase (MP-0 through MP-4)
- [ ] Specify what blocks if CONVERGE incomplete
- [ ] Include "if this slips, then that blocks" logic

**Template Section** (repeat for each of 6 phases):
```markdown
## CONVERGE Phase N: [Title] → [MP Phase]

### Sessions: N-1..N-X
### Target Version: [v8.3.0, etc.]
### Exit Gate Criteria:
- [ ] [criterion 1, e.g., "44+ → 0 hook path errors"]
- [ ] [criterion 2, e.g., "21 → 27 pipeline stages"]
- [ ] [criterion 3, e.g., "5 → 12 scientificMath actions"]

### If Incomplete:
- [ ] MP-0 exit gate NOT achieved → MP-1A remains blocked
- [ ] Estimated impact: [days delay on MP-1A start]

### Weekly Heartbeat:
- [ ] Sessions [last completed]:
- [ ] Current blocker: [session N-X is in progress]
- [ ] Expected completion: [date]
```

**Acceptance Criteria**:
- [ ] 6 sections (Phase 1–6)
- [ ] All link back to MP-0 through MP-4
- [ ] Each includes 3+ specific exit gate criteria from CONVERGE plan
- [ ] Blocking logic is explicit (if incomplete → what stalls)
- [ ] Weekly update slot prepared

**Related Files**:
- Reference: state/shared/memory/project_converge_roadmap.md (40 sessions, 6 phases)
- Reference: PRISM-UNIFIED-ROADMAP.md lines 448-471

---

## SHORT-TERM (Week 1) — Priority: HIGH

### Task 4: Build Phase Completion Detection Hook
**Severity**: HIGH  
**Effort**: 8-12 hours  
**Owner**: [ASSIGN]  
**Deliverable**: New MCP action `roadmap:phase_complete` + PostToolUse hook

**Scope**:
- [ ] New MCP action: `roadmap:phase_complete`
  - Input: phase_id, completion_proof (array of criterion IDs marked complete)
  - Validates all exit gate criteria met
  - Updates ROADMAP_STATE_MACHINE.json
  - Returns: unlocked phases, timestamp, notification
- [ ] PostToolUse hook: On write to any file in H:\prism\state\shared\* → check if ROADMAP_STATE_MACHINE.json should update
- [ ] Slack notification: "[phase_id] complete! Unlocking: [list of unlocked phases]. Owner assignments: [list]"
- [ ] Auto-update TASK_QUEUE.md: Mark blocked tasks as available

**Implementation**:
1. [ ] Create src/engines/PhaseCompletionDetectionEngine.ts
2. [ ] Export via src/tools/dispatchers/roadmapDispatcher.ts
3. [ ] Add hook rule: "on write to ROADMAP_STATE_MACHINE.json, check for status changes"
4. [ ] Wire notification: /hook-status skill can call Slack integration
5. [ ] Update TASK_QUEUE.md automatically (check for tasks with blocked_by: phase_id)

**Testing**:
- [ ] Dry run: Mark MP-0 criteria complete → verify MP-1A unlocks in output
- [ ] Verify Slack mock notification (non-prod)
- [ ] Verify TASK_QUEUE.md updates without errors
- [ ] Edge case: One criterion complete → phase still blocked (don't unlock)

**Acceptance Criteria**:
- [ ] Engine compiles without error
- [ ] Tests pass (mock Slack, mock state file)
- [ ] Dry run produces correct unlocked phase list
- [ ] Slack notification format is readable
- [ ] TASK_QUEUE updates are idempotent (safe to run multiple times)

---

### Task 5: Create MACHINE_RELEASE_GATES.md
**Severity**: HIGH  
**Effort**: 4 hours  
**Owner**: [ASSIGN]  
**Deliverable**: `H:\prism\state\shared\MACHINE_RELEASE_GATES.md`

**Scope** (3 tiers):
- [ ] Tier 1: SQ-M1 (Lathe) + SQ-M8 (Wire-EDM) — Ship after MP-1A
- [ ] Tier 2: SQ-M2-7 (remaining machines) — Ship after v24 phase + MP-1A
- [ ] Tier 3: SQ-M3 (Mill-Turn) — Debug required before shipping

**For Each Machine**:
```markdown
## SQ-M[N]: [Machine Name]
### Release Tier: [1/2/3]
### Shipping Rule: [explicit gate, e.g., "after MP-1A exits + Phase 6 exits"]

### Exit Gate Checklist:
- [ ] MP-1A.exit_gate_criteria == PASS
- [ ] [machine].test_suite passed (XXX/XXX)
- [ ] Machinist review: [signature lines]
- [ ] GCode samples verified: [link to validation]
- [ ] Operator manual complete: [link]
- [ ] Tribal knowledge capture: [count of tips merged]

### Auto-Computed Ship Date:
- Formula: max(MP-1A.completion + 2 days, v24_phase.completion + 1 day)
- Current estimate: [date]

### If Blocked (Tier 3):
- [ ] SQ-M3 blocker: Mill-Turn pipeline broken (no G-code output)
- [ ] Owner: [ASSIGN]
- [ ] Debug deadline: [date]
- [ ] Escalation: If not resolved by [date], defer to Phase 14+
```

**Tier 1 Machines** (2 entries):
- [ ] SQ-M1: Lathe (172/172 tests passing)
- [ ] SQ-M8: Wire-EDM (249/249 tests passing)

**Tier 2 Machines** (5 entries):
- [ ] SQ-M2: Milling (0 tests, Phase 6)
- [ ] SQ-M4: Five-Axis (0 tests, Phase 7)
- [ ] SQ-M5: Grinding (0 tests, Phase 9)
- [ ] SQ-M6: Laser (0 tests, Phase 11A)
- [ ] SQ-M7: Waterjet (0 tests, Phase 11B)

**Tier 3 Machines** (1 entry):
- [ ] SQ-M3: Mill-Turn (broken, awaiting debug)

**Acceptance Criteria**:
- [ ] 8 machine entries (7 viable + 1 broken)
- [ ] Shipping rules are explicit (not prose)
- [ ] Auto-compute formula documented
- [ ] Tier 3 has escalation path + owner assignment
- [ ] Links to actual test status + phase gates

---

### Task 6: Assign QA-MS10/11 Owner + Update ROADMAP_COLLABORATION_STATE.md
**Severity**: MINOR  
**Effort**: 1 hour  
**Owner**: [ASSIGN]  
**Deliverable**: Updated ROADMAP_COLLABORATION_STATE.md

**Scope**:
- [ ] Identify current owner for QA-MS10 (Hooks layer integration)
- [ ] Identify current owner for QA-MS11 (Skills validation)
- [ ] Add ownership entry to ROADMAP_COLLABORATION_STATE.md
- [ ] Set up weekly status update schedule

**Template Entry** (add to Active Participants section):
```markdown
- [Agent] — QA-MS10/11 Track Lead
  current: QA-MS10 [% complete]. QA-MS11 [% complete].
  next: [weekly deliverable]
  blockers: None (START NOW gate satisfied)
  needs: Weekly sync (Monday 10 AM), status update to ROADMAP_COLLABORATION_STATE.md
```

**Acceptance Criteria**:
- [ ] Owner assigned to both QA-MS10 and QA-MS11
- [ ] Entry added to ROADMAP_COLLABORATION_STATE.md
- [ ] Weekly meeting slot defined
- [ ] Status field updated with % complete

---

## MEDIUM-TERM (Weeks 2-3) — Priority: MEDIUM

### Task 7: Add /roadmap-validate Skill
**Severity**: MEDIUM  
**Effort**: 6-8 hours  
**Owner**: [ASSIGN]  
**Deliverable**: New skill `/roadmap-validate`

**Functionality**:
- [ ] Input: (optional) phase_id or "all"
- [ ] Scan child roadmaps for DEPENDS_ON declarations
- [ ] Check parent gates satisfied
- [ ] Validate exit gate criteria formats
- [ ] Report circular dependencies
- [ ] Output: JSON + human-readable report

**Implementation**:
```typescript
/roadmap-validate [phase_id | all]

Output:
{
  "status": "VALID" | "INVALID",
  "timestamp": "2026-03-31T...",
  "checks": [
    {"id": "child-deps-declared", "status": "PASS", "details": "11/11 roadmaps have DEPENDS_ON"},
    {"id": "parent-gates-satisfied", "status": "PASS", "details": "MP-0 satisfied for MP-1A entry"},
    {"id": "no-circular-deps", "status": "PASS", "details": "topological sort clean"},
    {"id": "exit-gate-format", "status": "WARN", "details": "MP-0 missing proof specs in 2/3 criteria"}
  ],
  "warnings": [...],
  "errors": [...]
}
```

**Acceptance Criteria**:
- [ ] Checks all 11 child roadmaps for DEPENDS_ON
- [ ] Validates against Unified Roadmap (14 phases)
- [ ] Detects circular refs (none expected, but tool should catch if added)
- [ ] Output is machine-readable (JSON) + human-readable (markdown)
- [ ] Tests pass: sample roadmap with valid, invalid, and circular deps

---

### Task 8: Proof-Stack Enforcement Hook
**Severity**: MEDIUM  
**Effort**: 8 hours  
**Owner**: [ASSIGN]  
**Deliverable**: New hook + engine for proof validation

**Scope**:
- [ ] Extended exit gate criteria to include proof specs
- [ ] Add validator: Check input→transform→output contracts exist
- [ ] Block phase entry if proof incomplete
- [ ] MCP action: `roadmap:validate-proof`

**Exit Gate Proof Template**:
```markdown
### Exit Gate Proof for [phase]:
#### Input Proof:
- [description of state that must exist before phase starts]
- Evidence: [link to validation check]

#### Transform Proof:
- [description of invariant that transform maintains]
- Validator: [link to test/check]

#### Output Proof:
- [description of result that must be present]
- Verification: [link to acceptance test]
```

**Example (MP-0)**:
```markdown
### Input Proof (MP-0 can start):
- System state: test_coverage >= 0.60, wiring_score >= 0.55
- Evidence: /quality-score output

### Transform Proof:
- Routing maintains backward compatibility
- Hook path error count is monotonic decreasing (no new errors)
- Validator: /hook-status hook_errors count

### Output Proof:
- All route mounts exist and resolve without error (0 404s)
- billing.ts mounted and callable
- Proof-stack rules documented in 5+ critical paths
- Verification: /roadmap:validate-proof MP-0 returns PASS
```

**Acceptance Criteria**:
- [ ] 5+ exit gates updated with proof specs
- [ ] Proof validator engine compiles
- [ ] Tests pass: valid proof → phase entry allowed, invalid proof → blocked
- [ ] Proof specs are unambiguous (can be auto-tested)

---

### Task 9: Weekly CONVERGE Heartbeat (Recurring)
**Severity**: MEDIUM  
**Effort**: 2 hours (first time), 30 min/week thereafter  
**Owner**: [ASSIGN]  
**Deliverable**: `H:\prism\state\shared\ROADMAP_CONVERGENCE_HEARTBEAT.md` (weekly sync)

**Scope**:
- [ ] Every Monday 9 AM: Read CONVERGE plan progress
- [ ] Compare to MP gate expectations
- [ ] Flag if CONVERGE phase is behind schedule
- [ ] Update "if this slips, then that blocks" logic
- [ ] Post summary to ROADMAP_COLLABORATION_STATE.md

**Template**:
```markdown
# CONVERGE Heartbeat — [date]

## Phase 1: Foundation Fix → MP-0
- **Status**: 4/5 sessions complete (session 1-5 in progress)
- **Exit Gate Target**: All 44+ hook path errors → 0
- **Current**: 12 hook path errors remain
- **Risk**: If session 1-5 extends > 2 days, MP-0 exit gate slips
- **Impact on MP-1A**: 2-day delay cascades to all downstream (MP-1B, MP-2, MP-3)

## Phase 2: Pipeline Hardening → MP-1A
- **Status**: Not started (waiting for Phase 1)
- **Expected Start**: After session 1-5 (est. 2026-04-02)
- **Exit Gate Target**: 21 stages → 27 stages, scientificMath 5 → 12
- **Sessions**: 2-1..2-10 (10 sessions, ~2 weeks)
- **Risk**: None (on track)

[repeat for phases 3-6]

## Overall CONVERGE Health
- **On Schedule**: YES/NO
- **Critical Path**: [phase that if delayed, impacts MP-4 most]
- **Next Escalation**: If Phase [N] not started by [date], escalate

---

## Action Items (for next week)
- [ ] Session 1-5 complete (est. 2026-04-02)
- [ ] Verify: hook path errors = 0
- [ ] Start Phase 2 sessions
```

**Acceptance Criteria**:
- [ ] Weekly sync scheduled + recurring reminder set
- [ ] Template includes all 6 CONVERGE phases
- [ ] Links to CONVERGE plan + MP gates
- [ ] Flags cascading delay risks
- [ ] Assigns action items + dates

---

## Scoring Summary (Post-Implementation)

| Task | Completion | New Score Impact |
|------|------------|-----------------|
| 1. ROADMAP_STATE_MACHINE.json | 70% | Self-update: 2/10 → 6/10 |
| 2. DEPENDS_ON declarations | 90% | Child tracking: 9/10 → 10/10 |
| 3. CONVERGE_COMPLETION_GATES | 80% | CONVERGE: 8/10 → 9/10 |
| 4. Phase completion hook | 100% | Self-update: 6/10 → 9/10 |
| 5. MACHINE_RELEASE_GATES | 85% | Machine gating: 7/10 → 9/10 |
| 6. QA owner assignment | 95% | QA tracking: 8/10 → 9/10 |
| 7. /roadmap-validate skill | 90% | Automation: varies → +2-3 points |
| 8. Proof-stack hook | 85% | Enforcement: 3/10 → 7/10 |
| 9. CONVERGE heartbeat | 80% | Governance: 4/10 → 8/10 |
| **OVERALL POST-IMPL** | **~85%** | **8.2 → 9.1** |

---

## Success Criteria (Audit Complete)

When ALL tasks are complete:
- [ ] 0 manual phase state transitions (all auto)
- [ ] All 11 child roadmaps declare DEPENDS_ON
- [ ] CONVERGE phase progress visible in MP gates
- [ ] Machine release tiers execute checklist (not prose)
- [ ] QA-MS10/11 tracked weekly
- [ ] /roadmap-validate runs without errors
- [ ] Exit gate proof specs auto-validated
- [ ] CONVERGE heartbeat weekly (no gaps)
- [ ] Overall audit score: 9.1/10

---

**END OF ACTION TRACKER**  
Last Updated: 2026-03-30 20:20 UTC
