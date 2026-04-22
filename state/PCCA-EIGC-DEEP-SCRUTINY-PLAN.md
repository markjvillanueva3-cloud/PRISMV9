# DEEP SCRUTINY: PCCA + EIGC Activation Concrete Plan

## Executive Summary

**Status**: PCCA and EIGC are "designed but stranded" — complete design specs exist (200+ KB each) but **ZERO** milestone files for PCCA exist, and EIGC milestones are design-only with no execution infrastructure.

**Finding**: Both tracks must run BEFORE Phase 15-17 to unblock current quality work, but must be injected strategically into MP (Main Path) phases, not deferred.

---

## PART 1: PCCA (PRISM Capability Conversion and Activation) Status

### Design Specification Available
- File: H:/prism/mcp-server/docs/superpowers/specs/2026-03-25-prism-capability-conversion-roadmap-design.md
- Length: 715 lines, fully detailed with 9 milestones (PCCA-MS0A through PCCA-MS8)
- Last Updated: 2026-03-25
- **Status**: DESIGN ONLY — NO MILESTONE JSON FILES CREATED

### PCCA Milestones (Design Only)

| Milestone | Title | Mission | Est. Sessions | Status |
|-----------|-------|---------|---------------|--------|
| PCCA-MS0A | Capability Conversion Contract Freeze | Define rules before conversion | 1 | Design only |
| PCCA-MS0 | Unified Asset Census and Provenance Map | Build master ledger | 1-2 | Design only |
| PCCA-MS1 | Skill, Script, and Hook Activation Repair | Fix activation before adding | 2-3 | Design only |
| PCCA-MS2 | Course-to-Capability Compiler | Convert courses to executable | 2-3 | Design only |
| PCCA-MS3 | Controller, Post, and Benchmark Conversion | Handler refs → post truth | 2-3 | Design only |
| PCCA-MS4 | Speed/Feed Knowledge Activation | Promote latent physics knowledge | 2-3 | Design only |
| PCCA-MS5 | Print-to-Program and Geometry Promotion | Extract MIT kernels → production | 2-3 | Design only |
| PCCA-MS6 | ERP, Quote, and Operations Intelligence | Static knowledge → executable | 2-3 | Design only |
| PCCA-MS7 | Context, Token, Memory, and Build-Control | Sidecar substrate → control plane | 2-3 | Design only |
| PCCA-MS8 | Capability Truth Gates and Merge | Sustainable + mergeable | 1-2 | Design only |

**Total**: 9 milestones, ~18 sessions estimated

---

## PART 2: EIGC (Engine Integrity Gap Closure) Status

### Design Specification Available
- File: H:/prism/mcp-server/docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md
- Length: 200+ lines, fully detailed with 11 milestones (EIGC-MS0A through EIGC-MS10)
- Last Updated: 2026-03-25
- **Status**: DESIGN + PARTIAL MILESTONE JSON (11 files exist)

### EIGC Milestones (JSON + Design)

| Milestone | Title | Mission | Est. Sessions | Status | JSON File |
|-----------|-------|---------|---------------|--------|-----------|
| EIGC-MS0A | Design Contracts | Freeze 6 design standards | 1 | Ready | ✓ exists |
| EIGC-MS0 | Baseline Truth Manifest | Full engine capability audit | 1-2 | Ready | ✓ exists |
| EIGC-MS1 | Restore ESLint Flat Config | Hard gate for validation | 1 | Ready | ✓ exists |
| EIGC-MS2 | Fix Runtime Honesty | Fail-closed patches | 2-3 | Ready | ✓ exists |
| EIGC-MS3 | Fix Silent No-Ops | Mutation truth violations | 1-2 | Ready | ✓ exists |
| EIGC-MS4 | Feature Promotion/Downgrade | Decide partial features | 1-2 | Ready | ✓ exists |
| EIGC-MS5 | Reconcile Roadmap Truth | Update milestone states | 1 | Ready | ✓ exists |
| EIGC-MS6 | Direct Integrity Tests | >=80% branch coverage | 2-3 | Ready | ✓ exists |
| EIGC-MS7 | Canonical Domain Model | Unify shared entities | 2 | Ready | ✓ exists |
| EIGC-MS8 | Provenance + Confidence | Physics Fusion integration | 2 | Ready | ✓ exists |
| EIGC-MS9 | Product Capability Support Matrix | Machine-readable matrix | 2 | Ready | ✓ exists |
| EIGC-MS10 | Golden-Path E2E Proof | Per-pillar validation | 3-4 | Ready | ✓ exists |

**Total**: 11 milestones, 44 units, ~15 sessions estimated

---

## PART 3: WHICH MILESTONES CAN START NOW?

### EIGC Milestones That Can Start Immediately

**EIGC-MS0A: Design Contracts (START NOW)**
- Effort: 90 minutes (40 + 50)
- Dependencies: None
- Blocker Status: UNBLOCKS EIGC-MS0 and EIGC-MS1
- Rationale: Must freeze design standards before auditing or patching
- Output: 6 design standards documents frozen in state/EIGC-MS0A/
- Can run in parallel with: Any other track

**EIGC-MS1: ESLint Restoration (START NOW)**
- Effort: 150 minutes (70 + 50 + 30)
- Dependencies: None (not formally, but contextually benefits from EIGC-MS0A)
- Blocker Status: UNBLOCKS all subsequent EIGC and lint-dependent work
- Rationale: ESLint 10 flat config is currently broken; repair unblocks validation stack
- Can run in parallel with: EIGC-MS0A
- Output: npm run lint passes, hard gate established

### PCCA Milestones That Can Start Immediately

**PCCA-MS0A: Capability Conversion Contract Freeze (START NOW)**
- Effort: ~90 minutes (design phase only, no code)
- Dependencies: None
- Blocker Status: UNBLOCKS PCCA-MS0 and all later PCCA milestones
- Rationale: Must define rules before conversion work begins
- Output: Capability conversion schema frozen
- Can run in parallel with: EIGC-MS0A, EIGC-MS1, and any MP phase

**PCCA-MS0: Unified Asset Census (START AFTER PCCA-MS0A)**
- Effort: 1-2 sessions (120-180 minutes)
- Dependencies: PCCA-MS0A
- Blocker Status: UNBLOCKS PCCA-MS1 through PCCA-MS8
- Rationale: Must build inventory before deciding what to convert
- Output: Authoritative candidate ledger with source paths and priorities

---

## PART 4: WHICH MILESTONES SHOULD INJECT INTO MP PHASES?

### Strategic Injection Points (MUST RUN BEFORE PHASE 15-17)

**Injection 1: Into Phase 4 (Simulation Gate + Monitoring)**
- Inject: EIGC-MS0A + EIGC-MS1
- Rationale: Phase 4 is finishing now; ESLint hardening and design contracts are prerequisites
- Effort Impact: +2 sessions into Phase 4 exit sequence
- Gate Check: ESLint passes before Phase 5 starts

**Injection 2: Into Phase 5 (ERP & Business Management Hardening)**
- Inject: PCCA-MS0A + PCCA-MS0 (asynchronous)
- Inject: EIGC-MS7 (Canonical Domain Model)
- Rationale: Phase 5 builds business logic; must have unified domain model + asset census
- Effort Impact: +2 sessions (PCCA inventory) + 2 sessions (EIGC domain model)
- Gate Check: Domain model completed before ERP routing contracts freeze

**Injection 3: Into Phase 6 (Backend Business Platform)**
- Inject: PCCA-MS6 (ERP/Quote Intelligence Activation)
- Rationale: Phase 6 hardening ERP routes; can activate static knowledge into executable
- Effort Impact: +2-3 sessions
- Gate Check: Business route contracts validated against converted knowledge

**Injection 4: Into Phase 3-Extended (Level 3 Decisions + Process Physics)**
- Inject: PCCA-MS4 (Speed/Feed Knowledge Activation)
- Rationale: Speed/feed is core to Level 3; can activate latent manufacturer data now
- Effort Impact: +2-3 sessions
- Gate Check: Holder, fixture, finish effects are first-class by Phase 3 exit

**Injection 5: Into Phase 13 (Final Wiring + Web UI)**
- Inject: PCCA-MS1 (Skill/Script/Hook Activation Repair)
- Rationale: Phase 13 wires UI; must repair activation before exposing new capabilities
- Effort Impact: +2-3 sessions
- Gate Check: Script and skill indices match actual runtime surface

---

## PART 5: CONCRETE SESSION BLOCKS FOR IMMEDIATE EXECUTION

### SESSION EIGC-MS0A: Design Contracts (Can start this week)

```
SESSION EIGC-MS0A: Design Contracts — Capability Taxonomy + Truth Hierarchy
SMART CONFIG: Role=quality architect | OPUS | MAX
KNOWLEDGE SOURCES:
  - 2026-03-25-engine-integrity-gap-closure-roadmap-design.md (Design Gaps, Design Standards)
  - MASTER_INDEX.md (engine count and categories)
  - ENGINE_DIGEST.md (engine classification reference)
INTENT:
  Freeze the 6 design standards (capability status taxonomy, result contract rule, artifact integrity rule,
  mutation truth rule, truth hierarchy, legacy surface rule) that all later EIGC and production milestones
  enforce. No code changes — contracts only.
WORK:
  U-EIGC0A-01: Write capability-status-taxonomy.md (supported/partial/bridge_only/experimental/unsupported/planned)
    Effort: 40 minutes
    Output: Taxonomy document with definitions, examples, decision tree
    Exit: Can classify any engine action into exactly one status

  U-EIGC0A-02: Write design-standards-frozen.md (contract, integrity, mutation truth, hierarchy, legacy rules)
    Effort: 50 minutes
    Depends: U-EIGC0A-01
    Output: 6 standards documents with enforcement examples
    Exit: All 6 standards frozen before any EIGC audit or code work
EXIT GATE:
  ✓ Taxonomy document written and frozen in state/EIGC-MS0A/
  ✓ Design standards document written and frozen in state/EIGC-MS0A/
  ✓ 6 standards have enforcement examples and exception rules
  ✓ Ready for EIGC-MS0 (Baseline Audit) and EIGC-MS2 (Runtime Honesty)
```

### SESSION EIGC-MS1: ESLint Restoration (Can start this week, parallel to EIGC-MS0A)

```
SESSION EIGC-MS1: Restore ESLint Flat Config as Hard Gate
SMART CONFIG: Role=infrastructure engineer | OPUS | MAX
KNOWLEDGE SOURCES:
  - eslint.config.mjs current state (broken flat config)
  - 2026-03-25-engine-integrity-gap-closure-roadmap-design.md (EIGC-MS1 section)
  - src/engines/*.ts (scoped engines: ToolSync, BatchCAMTool, MultiProcessCAM, SolidEditing, SecondaryOps)
INTENT:
  Restore ESLint 10 flat config so lint serves as hard gate for all subsequent validation.
  This unblocks the full validation stack and prevents regressions in scoped engines.
WORK:
  U-EIGC1-01: Restore eslint.config.mjs with flat config for ESLint 10
    Effort: 70 minutes
    Output: Working eslint.config.mjs with proper flat config syntax
    Exit: npm run lint can execute without errors

  U-EIGC1-02: Fix or suppress pre-existing lint errors in scoped engines
    Effort: 50 minutes
    Depends: U-EIGC1-01
    Output: All scoped engines pass lint
    Exit: npm run lint passes on 7 scoped engines

  U-EIGC1-03: Verify npm run lint passes and wire to CI gate
    Effort: 30 minutes
    Depends: U-EIGC1-02
    Output: Lint wired to CI gate (GitHub Actions)
    Exit: Lint is non-bypassable gate for EIGC work
EXIT GATE:
  ✓ npm run lint passes on all scoped engines
  ✓ ESLint 10 flat config restored and functional
  ✓ Lint wired to CI (GitHub Actions)
  ✓ Pre-commit hook enforces lint gate
```

### SESSION PCCA-MS0A: Capability Conversion Contract Freeze (Can start this week)

```
SESSION PCCA-MS0A: Capability Conversion Contract Freeze
SMART CONFIG: Role=capability architect | OPUS | MAX
KNOWLEDGE SOURCES:
  - 2026-03-25-prism-capability-conversion-roadmap-design.md (Problem, Design Rules, Execution Loop)
  - MASTER_INDEX.md (inventory context)
  - SKILLS_AUDIT_2026-02-13.md (current skill state)
INTENT:
  Define the rules that prevent conversion work from becoming another pile of passive assets.
  Freeze capability conversion schema, source hierarchy, artifact types, conversion states,
  and retirement rules before any conversion work begins.
WORK:
  U-PCCA0A-01: Create capability-conversion-schema.md
    Effort: 45 minutes
    Output: JSON schema + Markdown documenting all conversion states and rules
    Includes: source hierarchy (active runtime > active docs > extracted > archive)
              artifact types (skill, script, hook, validator, benchmark, engine, algorithm, registry)
              conversion states (reference_only, candidate, partially_compiled, runtime_active, etc.)
    Exit: Every future candidate can be placed in one schema row

  U-PCCA0A-02: Write provenance-rule.md + surface-truth-rule.md + activation-rule.md
    Effort: 45 minutes
    Depends: U-PCCA0A-01
    Output: 3 documents defining when assets are "real" vs. advisory
    Includes: provenance chain requirements, surface-truth wiring checklist, activation determinism rules
    Exit: No converted asset ships without source provenance and activation intent
EXIT GATE:
  ✓ capability-conversion-schema.md written and frozen
  ✓ 7 design rules fully documented with enforcement examples
  ✓ Worktree and archival asset classification is explicit
  ✓ Ready for PCCA-MS0 (Asset Census)
```

---

## PART 6: RISK ASSESSMENT AND SEQUENCING

### Critical Path for Unblocking Current Work

1. **Week 1 (This week)**:
   - Start: EIGC-MS0A (Design Contracts) — 90 minutes
   - Start: EIGC-MS1 (ESLint) — 150 minutes (parallel)
   - Start: PCCA-MS0A (Conversion Contracts) — 90 minutes (parallel)
   - **Total**: 6 person-hours (finish in 1-2 sessions)

2. **Week 2**:
   - Start: EIGC-MS0 (Baseline Audit) — requires EIGC-MS0A output
   - Start: PCCA-MS0 (Asset Census) — requires PCCA-MS0A output
   - **Gate Check**: ESLint passes (EIGC-MS1 complete)
   - **Total**: 8-10 person-hours

3. **Week 3+**:
   - Inject EIGC-MS7 into Phase 5 (Domain Model alignment)
   - Inject PCCA-MS4 into Phase 3-Ext (Speed/Feed activation)
   - Inject PCCA-MS6 into Phase 6 (ERP Intelligence)

### Why These Must Run Now (Not Phase 15-17)

| Reason | Impact |
|--------|--------|
| **Validation Prerequisite** | EIGC-MS0A + EIGC-MS1 must finish before Phase 4 → 5 transition; lint gate prevents regression |
| **Knowledge Leverage** | PCCA-MS0 must finish before Phase 5/6 so ERP and physics can use inventory to avoid duplication |
| **Domain Model** | EIGC-MS7 must finish before ERP routes finalize in Phase 6; unified schema prevents later rework |
| **Roadmap Truth** | EIGC-MS5 depends on code fixes from EIGC-MS2-MS4; can't wait until Phase 15 |
| **Golden Paths** | EIGC-MS10 validates Phases 5-6 work; must run in Phase 12 (Testing), not Phase 15 |

---

## PART 7: WHICH MILESTONES STAY DEFERRED TO PHASE 15-17?

### EIGC Milestones for Phase 15 Proper

- **EIGC-MS2** (Runtime Honesty patches) — Engine-specific fixes, ~2-3 sessions
- **EIGC-MS3** (No-Op Fixes) — Engine-specific fixes, ~1-2 sessions
- **EIGC-MS4** (Promotion/Downgrade) — Feature-status decisions, ~1-2 sessions
- **EIGC-MS5** (Roadmap Reconciliation) — After code fixes, ~1 session
- **EIGC-MS6** (Integrity Test Coverage) — Depends on EIGC-MS2-MS5, ~2-3 sessions
- **EIGC-MS8** (Provenance + Confidence) — Physics integration, ~2 sessions
- **EIGC-MS9** (Support Matrix) — Organizational capstone, ~2 sessions
- **EIGC-MS10** (Golden Paths) — Phase 12 (Testing), not Phase 15, ~3-4 sessions

### PCCA Milestones for Phase 15-17+

These must wait because they depend on Phase 5/6 work:
- **PCCA-MS2** (Course-to-Capability Compiler) — Depends on academy review, ~2-3 sessions
- **PCCA-MS3** (Controller, Post, Benchmark) — Depends on post engine finalization, ~2-3 sessions
- **PCCA-MS5** (Geometry Kernel Promotion) — Depends on MIT module assessment, ~2-3 sessions
- **PCCA-MS7** (Context/Token/Memory) — Depends on Phase 13 build wiring, ~2-3 sessions
- **PCCA-MS8** (Truth Gates and Merge) — Final capstone, ~1-2 sessions

---

## PART 8: RECOMMENDATIONS

### Immediate Actions (This Week)

1. **Approve and fund 3 parallel tracks**:
   - EIGC-MS0A (Design Contracts) — 1 session, ~90 minutes
   - EIGC-MS1 (ESLint Restoration) — 1 session, ~150 minutes
   - PCCA-MS0A (Conversion Contracts) — 1 session, ~90 minutes

2. **Create session blocks** from concrete templates above

3. **Schedule injections** into Phase 4/5/6:
   - EIGC-MS7 (Domain Model) → Phase 5 milestone gate
   - PCCA-MS4 (Speed/Feed) → Phase 3-Ext exit gate
   - PCCA-MS6 (ERP Intelligence) → Phase 6 feature review

### Medium-Term (Phase 5-13)

1. **Complete EIGC-MS0 (Baseline Audit)** before Phase 5 finishes
2. **Complete PCCA-MS1 (Activation Repair)** before Phase 13 starts
3. **Integrate domain model** (EIGC-MS7) into Phase 5 ERP routing contracts

### Long-Term (Phase 15+)

1. **Execute remaining EIGC milestones** (EIGC-MS2 through MS9) as scheduled in Phase 15
2. **Execute PCCA-MS2, MS3, MS5, MS7, MS8** in Phase 16-17 after knowledge has been inventoried

---

## PART 9: EFFORT ESTIMATE SUMMARY

### Immediate Execution (Week 1-2)
| Track | Milestone | Sessions | Hours | Status |
|-------|-----------|----------|-------|--------|
| EIGC | MS0A | 1 | 1.5 | Ready now |
| EIGC | MS1 | 1 | 2.5 | Ready now |
| EIGC | MS0 | 1-2 | 4 | Ready after MS0A |
| PCCA | MS0A | 1 | 1.5 | Ready now |
| PCCA | MS0 | 1-2 | 4 | Ready after MS0A |
| **Total** | | **5-7** | **13.5** | **Complete in 1-2 weeks** |

### Phase Injections (Week 3-16)
| Track | Milestone | Phase | Sessions | Hours | Status |
|-------|-----------|-------|----------|-------|--------|
| EIGC | MS7 | 5 | 2 | 4 | Design ready |
| PCCA | MS4 | 3-Ext | 2-3 | 4-6 | Design ready |
| PCCA | MS6 | 6 | 2-3 | 4-6 | Design ready |
| PCCA | MS1 | 13 | 2-3 | 4-6 | Design ready |
| **Total** | | | **8-11** | **16-22** | **Injected across phases** |

### Phase 15-17 Proper (Later)
| Track | Milestones | Sessions | Hours | Status |
|-------|-----------|----------|-------|--------|
| EIGC | MS2-MS6, MS8-MS10 | 9 | 20+ | Design ready |
| PCCA | MS2, MS3, MS5, MS7, MS8 | 10 | 20+ | Design ready |
| **Total** | | **~19** | **40+** | **Phase 15-17 proper** |

---

## CONCLUSION

PCCA and EIGC are strategically critical but currently stranded at design stage. **The first 3 milestones (EIGC-MS0A, EIGC-MS1, PCCA-MS0A) can start immediately and must finish this week to unblock quality gates and knowledge leverage in Phases 5-6.** Subsequent injections into MP phases (EIGC-MS7, PCCA-MS4/MS6) will improve those phases without delaying downstream work. The bulk of PCCA and EIGC execution (PCCA-MS2-MS8, EIGC-MS2-MS9) remains appropriate for Phase 15-17 proper, once foundational knowledge and code quality work are in place.
