# PRISM Master Unit Plan — Comprehensive Expansion & Autonomous Build

**Status**: Organizing phase initiated 2026-07-02; Domain 1 units in progress (7 atomic units created)
**Owner**: Zulu (hermes-fleet-orchestrator)
**Execution Mode**: Fully autonomous — no further user input required
**Target Completion**: Overnight autonomous execution via engineered loops, harnesses, and crons

---

## Purpose

This Master Unit Plan compiles every area identified during the multi-turn expansion process into a structured, executable set of units. Each unit is designed to be:

- Self-contained
- Wireable to all relevant dispatchers
- Testable with real data
- Scrutinized via 3-of-3 before merge
- Capable of being completed by autonomous loops/harnesses/crons

The plan is organized into logical domains for parallel execution.

---

## Domain Structure

### Domain 1: Physics & Material Science (IN PROGRESS — 7 units created)
- Units covering material behavior, wear mechanisms, strain rate, phase transformations, serrated chip formation, built-up edge chemistry, work hardening, dynamic strain aging, minimum chip thickness, size effect, etc.
- **Created units**:
  - UNIT-0002: Domain 1 Overview and Breakdown
  - UNIT-0003: Material Behavior Modeling (Core Physics)
  - UNIT-0004: Tool Wear Mechanisms and Prediction
  - UNIT-0005: Strain Rate Effects and Serrated Chip Formation
  - UNIT-0006: Phase Transformations and Built-Up Edge Chemistry
  - UNIT-0007: Work Hardening and Dynamic Strain Aging
  - UNIT-0008: Minimum Chip Thickness and Size Effect
- Whiskey chat (lathe domain) contributed physics/lathe-specific inputs during the prior expansion phase; now centralized here under Zulu orchestration.

### Domain 2: Tool & Wear Modeling
- Units covering tool wear prediction, reconditioning quality, built-up edge, diffusive/adhesive/abrasive/chemical wear, tool life extension, tool breakage recovery, etc.

### Domain 3: Machine & Process Specific
- Units covering per-machine capability, spindle bearing health, way cover/ball screw condition, thermal management, vibration damping, multi-spindle synchronization, hard turning/milling, grinding integration, laser/ultrasonic/magnetic-assisted machining, etc.

### Domain 4: Data, AI & Knowledge Systems
- Units covering data governance, knowledge graph construction/maintenance, version control of physics/rules/souls, forward compatibility, exception pattern learning, automated rule generation, long-term data retention, digital thread completeness auditing, etc.

### Domain 5: Operator & Human Factors
- Units covering operator decision fatigue, bias modeling, cognitive state monitoring, training effectiveness, override long-term impact analysis, knowledge capture from retiring experts, etc.

### Domain 6: System Governance, Ethics & Future-Proofing
- Units covering ethical AI governance, regulatory change impact assessment, multi-company collaboration, supply chain resilience, energy market & carbon pricing integration, shop floor digital twin, long-term system evolution & technical debt, deprecation strategy, etc.

### Domain 7: Integration & Metrology
- Units covering in-machine & post-process metrology, predictive scrap/quality modeling, tool reconditioning economics, cross-machine capability translation, multi-lingual/regional standards support, etc.

### Domain 8: Advanced & Emerging Phenomena
- Units covering all niche and emerging areas identified (cryogenic, hybrid processes, micro/nano phenomena, etc.)

---

## Execution Instructions (Autonomous)

1. Each unit will be broken into atomic, executable tasks.
2. Engineered loops will pick up units from this plan.
3. Harnesses will ensure wiring, testing, and 3-of-3 scrutiny.
4. Crons will run overnight to advance units without user presence.
5. All work will be logged in this file and in the hermes-outputs directory.
6. No stubs or partials will be accepted — full working artifacts only.

**This plan will be updated in real time by the autonomous system as units are completed or refined.**

---

## Progress Log (Autonomous Updates)

- 2026-07-02: Infrastructure (UNIT-0001) complete. Domain 1 overview + 6 core physics units created (0002–0008). Whiskey chat lathe/physics contributions folded in. Harness live in scripts/hermes-unit-plan-harness.mjs (full ROI queue + Hermes/Ollama drafting + ledger + status updates). 27 units + template exist. Work/ has queues/gaps + 1 successful draft (UNIT-0018 via stepfun free lane; 0002 attempts failed on proxy 401/404 + Ollama 503). Ledger: 3 entries logged.

- 2026-07-02: UNIT-0018 drafted via hermes (stepfun/step-3.7-flash:free), roi=5, verdict=extend -> units/work/UNIT-0018-draft.md [harness]. Gap analysis (india) + draft verified real, dedup-aware, UNREVIEWED header, effort 4.5h, pre-validation steps, schema plan. No stubs.
- 2026-07-02: UNIT-0023 drafted via ollama (qwen2.5-coder:32b), roi=7, verdict=extend -> units/work/UNIT-0023-draft.md [harness]
- 2026-07-02: UNIT-0019 drafted via hermes (stepfun/step-3.7-flash:free), roi=6, verdict=extend -> units/work/UNIT-0019-draft.md [harness]
- 2026-07-02: UNIT-0020 drafted via hermes (stepfun/step-3.7-flash:free), roi=5, verdict=extend -> units/work/UNIT-0020-draft.md [harness]
- 2026-07-02: UNIT-0021 drafted via ollama (qwen2.5-coder:32b), roi=4, verdict=extend -> units/work/UNIT-0021-draft.md [harness]
- 2026-07-02 (slot:oscar /loop, Opus): **UNIT-0002 knowledge-only DELIVERED (specialist, not a harness draft)** -> `units/work/UNIT-0002-DOMAIN1-WIRING-MAP.md` (Domain-1 sub-units 0003-0008 mapped to LIVE prism_calc/prism_safety actions + engines, every citation Grep-verified this session) + `units/work/UNIT-0002-VALIDATION-STRATEGY.md` (acceptance criteria re-based on real in-repo substrate: exhaustive-sweep invariants + proven-S/F mining + tri-vendor parity; measured force/chip/wear datasets flagged as an operator capture dependency; recommend Domain-1 = 6 units + close DSA). **KEY FINDING: the ONLY genuine new-code gap in Domain-1 is DSA / dynamic strain aging (UNIT-0007) -- `strain.?aging|portevin|dynamic.?strain|blue.?brittle` = 0 matches fleet-wide (verified); 0003/0004/0005/0006/0008 are "extend/wire" over already-wired engines.** Also shipped this session: `U-OSC-SFC-MRR-VC-IDENTITY` -- the exhaustive combinatorial sweep (goal-clear part B) drove ~45M real ProductEngine.productSFC combos, caught + fixed a silent-wrong `mrr_inconsistent` accuracy defect (integer-rounded vc broke the vc<->rpm<->MRR identity; oracle 11360->0 post-fix; 46+109 tests green). Note: the 6 Fable subagents dispatched earlier this loop ALL died on Fable quota with ZERO deliverables -- specialist Domain-1 units are being built directly on Opus, not via those agents.
---

## Next Autonomous Actions

- [x] Parse this plan into individual unit files under `knowledge/hermes-outputs/units/` (27 units + template live)
- [x] Set up overnight crons and harnesses for autonomous execution -> `scripts/hermes-unit-plan-harness.mjs` + cron `PRISM Unit Plan Harness` (23min, --cap 2, S4U, node.exe) + checked-in `scripts/install-unit-plan-harness-task.ps1`
- [x] Gap-analyze units vs existing PRISM assets -> 6-agent Workflow shipped 4 queue fragments + 14 `units/work/UNIT-*-gap.md` (verdicts already-covered|wire-only|extend|build|knowledge-only + ROI + file:line)
- [x] ROI-ordered autonomous drafting live -> UNIT-0018/0019/0020/0021/0023 drafted (un-owned domains 4/6) via Hermes(:8645 stepfun free) + Ollama fallback
- [x] Ownership routing -> `units/work/claims.json` reserves oscar=SFC, whiskey=lathe, foxtrot=mill units; harness drafts only un-owned cross-cutting domains 4-8

### Remaining (autonomous + specialist)
- [ ] Cron continues draining un-owned domains 4-8 (0022, 0024-0027) in ROI order -- no intervention needed
- [ ] Specialist slots verify+build the UNREVIEWED drafts and their OWN claimed units (oscar/whiskey/foxtrot); clear the unit's `claims.json` entry when done
- [ ] (optional) re-run gap analysis for the 2 empty fragments (domain-1b lathe-physics, domain-3 machine) -- both cover claimed units, so low priority
- [ ] Wire each built unit to `prism_calc` + validate against real JM Die data (specialist step, per-unit acceptance criteria)

**Autonomous execution mode LIVE. The harness+cron run with no further user confirmation. Drafts are UNREVIEWED seed material -- specialists own the verified build.**