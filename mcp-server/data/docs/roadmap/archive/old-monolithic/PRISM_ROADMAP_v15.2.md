# PRISM ROADMAP v15.2 — CONSOLIDATED EXECUTION DOCUMENT
## Integrates: 7-lens brainstorm + 2 manual audits + 3 Opus agent audits (Architect, Physics Validator, Combination Optimizer)

**Version:** 15.2 | **Date:** 2026-02-19 | **Status:** APPROVED FOR EXECUTION
**Build:** 4.6MB | **Prior Complete:** R1-MS0 through R1-MS8A | **Next:** U0-A

---

## EXECUTIVE SUMMARY

Phase U0 (Utilization Activation) inserts before R1-MS9. Four milestones activate PRISM's dormant infrastructure — 75+ agents, 215 scripts, 196 skills, 8 swarm patterns, 6 intelligence systems, 120 Manus hooks — currently at ~5% utilization.

**Key changes from v15.0/v15.1 based on agent audits:**
- U0-C wiring uses PIPELINE pattern not parallel (+0.17 quality, Opus-008 finding)
- Safety validation uses CONSENSUS pattern (3 Opus agents vote, Opus-008)
- 7 YOLO steps downgraded to GATED (physics_validator SR-01 through SR-07)
- prism_compliance, prism_tenant, cognitive SPs, combination_ilp wired (architect F-001→F-008)
- prism_generator replaces manual hook wiring (architect F-008, saves 8-12 days)
- Token budget: 110.4/call optimized (within 150 budget, 39.6 headroom)
- Model split: Opus 4.6 at 30% (architecture/safety/complex), Sonnet 4.6 at 70% (implementation/bulk)
- File safety classification: CRITICAL/STANDARD/INFORMATIONAL determines pre/post-commit review
- 7 inter-milestone validation gates added (physics_validator VG-01→VG-07)

---

## MODEL TIER DEFINITIONS

| Tier | Model | Use For | Cost Factor |
|------|-------|---------|-------------|
| **OPUS** | Claude Opus 4.6 | Architecture decisions, safety validation, complex multi-domain reasoning (>5 reasoning steps), final sign-off on critical gates, edge case detection | 1.0x |
| **SONNET** | Claude Sonnet 4.6 | Implementation, bulk wiring, code generation, testing, standard validation, spec writing | 0.2x |
| **HAIKU** | Claude Haiku 4.5 | Lookups, simple validation, status checks, formatting, read-only queries | 0.04x |

**Opus 4.6 specifically adds value in 3 scenarios (combination_optimizer finding):**
1. Architecture definition — high-leverage decisions with reasoning chains >5 steps
2. Toolpath validation + edge cases — emergent interaction reasoning across full dependency graph
3. Safety validation — subtle constraint violation detection that Sonnet misses

**Everywhere else, Sonnet 4.6 at 5x lower cost is within 3% quality.**

---

## TOKEN BUDGET (combination_optimizer analysis)

| Component | All-ON | Optimized | Method |
|-----------|--------|-----------|--------|
| PFP | 18 | 18 | Always-on (safety) |
| Telemetry | 12 | 2.4 | Sample 1-in-5 non-safety calls |
| Guard Learning | 22 | 22 | Always-on (safety-critical) |
| Memory Graph | 35 | 14 | Conditional: fire on topic shift or explicit recall only |
| Todo Tracking | 8 | 3 | Fire on task/subtask transitions only |
| Tool Masking | 6 | 6 | Always-on (net token SAVER) |
| Essential Cadence (11) | 33 | 33 | Always-on |
| Conditional Cadence (12) | 30 | 12 | Expected 40% fire rate |
| **Redundant Cadence (10)** | **34** | **0** | **ELIMINATE** |
| **TOTAL** | **180** | **110.4** | **Within 150 budget, 39.6 headroom** |

**Eliminate immediately:** duplicate_context_refresh, verbose_step_logging, full_tool_list_reload, personality_reaffirm, blanket_permission_check, legacy_format_shim, noop_fallback_handler

**Convert to conditional:** over_eager_summarizer (context >2000 only), redundant_state_sync (task boundary only), unused_metric_counters (telemetry sample only)

---

## YOLO MODE SPECIFICATION (revised per physics_validator)

**YOLO applies when ALL conditions met:**
- ✅ Clear: Unambiguous task (known bug, documented pattern)
- ✅ Bounded: <100 lines, ≤3 files, known impact
- ✅ Reversible: Snapshot exists, anti-regression catches issues
- ✅ Non-safety: File is STANDARD or INFORMATIONAL classification

**YOLO NEVER applies to (physics_validator SR-01→07):**
- ❌ Memory edits (SR-01: corrupted params propagate silently)
- ❌ Safety-critical file writes (SR-02: pre-commit gate mandatory)
- ❌ Learned parameter updates (SR-03: uncontrolled feedback loop)
- ❌ Auto-fire loop logic (SR-04: positive feedback without damping)
- ❌ Data cleanup/deletion (SR-05: silent reference destruction)
- ❌ Search query semantics changes (SR-06: fuzzy-match degradation)
- ❌ Quality gate/audit code (SR-07: the gate itself unvalidated)

**File Safety Classification (physics_validator requirement):**
- **CRITICAL:** Kienzle coefficients, Taylor constants, safety validators, tolerance logic, force/thermal calculations → PRE-COMMIT review (blocking)
- **STANDARD:** Dispatchers, routing, wiring, formatting → POST-COMMIT review (async with auto-rollback)
- **INFORMATIONAL:** Docs, logs, configs → YOLO eligible

---

## ORCHESTRATION PATTERNS (combination_optimizer assignments)

| Pattern | When | Quality Score |
|---------|------|---------------|
| **autopilot_v2** | Architecture decisions, complex multi-domain (U0-A design) | 0.94 |
| **swarm_parallel** | Independent subsystem specs (U0-B intelligence systems) | 0.88 |
| **pipeline_sequential** | Dependent wiring with interface contracts (U0-C toolpath) | 0.91 |
| **swarm_competition** | Test generation, benchmarks (U0-D testing) | 0.89 |
| **swarm_consensus** | Safety validation, critical sign-off (U0-D safety) | 0.96 |
| **claude_code** | Multi-file repo operations, packaging | 0.87 |
| **autopilot_quick** | Documentation, 4-8 step lightweight tasks | 0.85 |
| **manual** | Simple fixes, lookups, status checks | N/A |
| **ATCS** | Multi-session autonomous tasks | N/A |
| **Manus web_research** | Manufacturing best practices research (pre-U0-C) | +0.05-0.09 lift |

**Critical finding (combination_optimizer):** U0-C toolpath wiring MUST use pipeline (Q=0.91), NOT parallel (Q=0.74). +0.17 quality gap due to sequential interface dependencies.

---

## INTER-MILESTONE VALIDATION GATES (physics_validator VG-01→07)

| Gate | Location | Check |
|------|----------|-------|
| VG-01 | After snapshot, before preflight | Snapshot integrity: hash check + test restore |
| VG-02 | Between U0-A and U0-B | ALL U0-A deliverables complete + passing (automated checklist) |
| VG-03 | Between error→learning and auto-fire loops | Learned parameters stable (convergence test) |
| VG-04 | Between team_spawn and swarm execution | Agent readiness: context + permissions verified |
| VG-05 | Between autopilot_v2 validate and U0-D | Validation report sign-off |
| VG-06 | Between wiring audit and Omega | Zero critical findings required |
| VG-07 | GLOBAL: YOLO→GATED transitions | Every gated step re-validates inputs regardless of source |

---

## U0-A: BOOTSTRAP ACTIVATION

**Orchestration:** Manual for fixes, autopilot_quick for multi-step wiring
**Session:** 1 | **Estimated calls:** ~28

| # | Step | Primary | Model | Reviewer | Model | Gate | Effort | GSD Route | Indexed? |
|---|------|---------|-------|----------|-------|------|--------|-----------|----------|
| A1 | Fix HOT_RESUME auto-writer (recentActions scope bug) | Platform Engineer | Sonnet 4.6 | Safety Auditor | Opus 4.6 | GATED | S (3 calls) | Manual | ✅ Decision→MemGraph, Error→Guard |
| A2 | Fix NL hook condition evaluator (8/9 broken) | Platform Engineer | Sonnet 4.6 | Quality Engineer | Sonnet 4.6 | YOLO | M (5 calls) | Manual | ✅ Hook coverage→Telemetry |
| A3 | Verify/setup Claude Code (API key, working dir, test run) | DevOps Engineer | Sonnet 4.6 | — | Haiku 4.5 | YOLO | S (2 calls) | Manual | ✅ Capability→Bridge registry |
| A4 | Disposition ATCS zombie task (materials-db-verified, 18 pending units) | DevOps Engineer | Sonnet 4.6 | Data Integrity | Opus 4.6 | GATED | S (3 calls) | Manual | ✅ Decision→MemGraph |
| A5 | Wire pre-build gate into package.json (prism_generator for hook manifest) | Safety Architect | Opus 4.6 | Safety Architect | Opus 4.6 | GATED | M (5 calls) | autopilot_quick | ✅ Gate→Compliance, Hook→Generator |
| A6 | Wire snapshot.js + verify restore integrity (VG-01) | Reliability Engineer | Sonnet 4.6 | Safety Auditor | Opus 4.6 | GATED | M (4 calls) | Manual | ✅ Snapshot→Telemetry |
| A7 | Create session_preflight.js (boot health, agent ping, NL hook test) | DevOps Engineer | Sonnet 4.6 | Quality Engineer | Opus 4.6 | GATED | M (4 calls) | autopilot_quick | ✅ Preflight→Telemetry, Results→Todo |
| A8 | Create utilization_tracker.js (log every agent/swarm/script/tool call) | Telemetry Engineer | Sonnet 4.6 | — | Haiku 4.5 | YOLO | S (2 calls) | Manual | ✅ Metrics→Telemetry→PFP |
| A9 | Define YOLO mode + file safety classification (CRITICAL/STANDARD/INFORMATIONAL) | Safety Architect | Opus 4.6 | Physics Validator | Opus 4.6 | GATED | S (2 calls) | Manual | ✅ Classification→Guard, GSD update |
| A10 | Update stale memory edits (#9, #21, #22 already done; verify completeness) | — | Manual | — | — | YOLO | S (1 call) | Manual | ✅ Memory→MemGraph |
| | **VG-02: U0-A completion gate** | Quality Engineer | Opus 4.6 | — | — | GATE | S (1 call) | Manual | ✅ Gate result→Telemetry |

**U0-A Exit Criteria:**
- Build passes with pre-build gate active
- 9/9 NL hooks fire correctly
- HOT_RESUME auto-updates at checkpoint cadence
- Claude Code operational (version + test run confirmed)
- ATCS zombie resolved
- Snapshot verified restorable
- Preflight runs at boot
- Utilization tracker logging
- YOLO mode + file classification defined in GSD
- All decisions indexed in MemGraph

---

## U0-B: INTELLIGENCE + SYSTEMS ACTIVATION

**Orchestration:** swarm_parallel for independent subsystems, autopilot for complex wiring
**Session:** 1 | **Estimated calls:** ~25

| # | Step | Primary | Model | Reviewer | Model | Gate | Effort | GSD Route | Indexed? |
|---|------|---------|-------|----------|-------|------|--------|-----------|----------|
| B1 | Enable PFP pre-filter + configure risk thresholds for file operations | Safety Engineer | Sonnet 4.6 | Physics Validator | Opus 4.6 | GATED | S (3 calls) | Manual | ✅ Config→Telemetry, Risks→PFP |
| B2 | Wire telemetry into cadence (async, sampled 1-in-5 for non-safety; define event schema + retention) | Telemetry Engineer | Sonnet 4.6 | Data Architect | Sonnet 4.6 | GATED | M (4 calls) | Manual | ✅ Schema→Bridge endpoints, Events→MemGraph |
| B3 | Wire error→learning_save→pattern_scan pipeline + physics range checks on learned params (VG-03) | Learning Engineer | Sonnet 4.6 | Safety Auditor | Opus 4.6 | GATED | M (5 calls) | autopilot_quick | ✅ Patterns→PFP, Errors→MemGraph |
| B4 | Activate Memory Graph: context + pattern + error nodes, wire ≥6 consumers (architect F-005) | Knowledge Engineer | Sonnet 4.6 | Systems Architect | Opus 4.6 | GATED | M (4 calls) | autopilot_quick | ✅ Consumers→Telemetry, Nodes→MemGraph |
| B5 | Wire todo_update with real task tracking (on transitions, not every call) | Platform Engineer | Sonnet 4.6 | — | Haiku 4.5 | YOLO | S (2 calls) | Manual | ✅ Tasks→MemGraph |
| B6 | Fix tool_mask_state (undefined error) + wire into session phases | Platform Engineer | Sonnet 4.6 | Quality Engineer | Sonnet 4.6 | GATED | S (3 calls) | Manual | ✅ Masks→Telemetry |
| B7 | Close auto-fire loops (SKILL_HINTS→load, AGENT_REC→invoke, SCRIPT_REC→suggest) + eliminate 7 redundant cadences | Orchestration Engineer | Sonnet 4.6 | Combination Optimizer | Opus 4.6 | GATED | L (5 calls) | autopilot | ✅ Loop closures→Telemetry |
| B8 | Wire cognitive SP layer: cognitive_init→bayes→rl (architect F-003) + combination_ilp (F-004) | AI Systems Engineer | Opus 4.6 | Physics Validator | Opus 4.6 | GATED | L (5 calls) | autopilot | ✅ Priors→MemGraph, ILP→Telemetry |
| B9 | Wire Manus hook chains into cadence (AGENT-SELECT→SPAWN→RESULT) + prism_generator for consistency | Orchestration Engineer | Sonnet 4.6 | Systems Architect | Opus 4.6 | GATED | M (4 calls) | autopilot_quick | ✅ Hooks→Generator manifest, Chains→Telemetry |
| B10 | Wire prism_compliance as CORE-layer blocking gate on toolpath dispatch (architect F-001) | Compliance Engineer | Opus 4.6 | Safety Architect | Opus 4.6 | GATED | M (4 calls) | Manual | ✅ Gates→Compliance audit log |
| B11 | Wire knowledge cross-query into speed_feed/cutting_force workflows | Manufacturing Engineer | Sonnet 4.6 | Physics Validator | Opus 4.6 | GATED | S (3 calls) | Manual | ✅ Queries→Knowledge, Results→MemGraph |
| B12 | Wire context_kv_optimize + context_attention_anchor for swarm context management (architect F-007) | Context Engineer | Sonnet 4.6 | Systems Architect | Opus 4.6 | GATED | S (3 calls) | Manual | ✅ Optimizations→Telemetry |
| | **VG-02+VG-03: U0-B completion + parameter stability gate** | Quality Engineer | Opus 4.6 | — | — | GATE | S (1 call) | Manual | ✅ Gate→Telemetry |

**U0-B Exit Criteria:**
- PFP assessing risk on file operations
- Telemetry collecting data (sampled, schema defined, retention set)
- Guard learning: errors→patterns pipeline operational, range checks on learned params
- Memory Graph: ≥6 verified consumers, context+pattern+error nodes active
- Todo tracking real tasks on transitions
- Tool masking operational per session phase
- 7 redundant cadences eliminated, 3 converted to conditional
- Auto-fire loops closed: hints→load, recommendations→action
- Cognitive SPs bootstrapped (init+bayes+rl), ILP wired
- Manus hooks chained via generator
- Compliance blocking gate on toolpath dispatch
- Knowledge cross-query enriching manufacturing calculations
- Context KV + attention anchor ready for U0-C swarm
- Token overhead verified ≤110 tokens/call
- All decisions indexed, all new systems reporting to telemetry

---

## U0-C: PARALLEL PROOF + R1 WIRING

**Orchestration:** Manus web_research (pre-pipeline) → pipeline_sequential (wiring) → ATCS (autonomous)
**Session:** 1-2 | **Estimated calls:** ~22

| # | Step | Primary | Model | Reviewer | Model | Gate | Effort | GSD Route | Indexed? |
|---|------|---------|-------|----------|-------|------|--------|-----------|----------|
| C0 | Manus web_research: manufacturing toolpath standards, MTConnect, OPC-UA best practices | Research Agent | Sonnet 4.6 | — | — | YOLO | S (2 calls) | Manus create_task | ✅ Results→MemGraph, Sources→Knowledge |
| C1 | team_spawn coordination team + verify agent readiness (VG-04) | Team Lead | Sonnet 4.6 | Orchestration Engineer | Sonnet 4.6 | GATED | S (2 calls) | Manual | ✅ Team→Telemetry |
| C2 | Wire tenant context injection for swarm isolation (architect F-002) | Security Engineer | Opus 4.6 | Systems Architect | Opus 4.6 | GATED | M (4 calls) | Manual | ✅ Tenant→Compliance, Isolation→Telemetry |
| C3 | **PIPELINE:** Wire 697 toolpath strategies via 5-stage pipeline (absorbs R1-MS8 Part B) | CAM Specialists (5x pipeline stages) | Sonnet 4.6 (S1-3), Opus 4.6 (S4-5) | Physics Validator | Opus 4.6 | GATED | L (8 calls) | swarm_pipeline | ✅ Strategies→Knowledge, Each stage→Telemetry |
| C4 | Claude Code: wire thread calculation engine, 658 lines (absorbs R1-MS8 Part C) | Thread Specialist | Claude Code (Sonnet 4.6) | Physics Validator | Opus 4.6 | GATED | M (5 calls) | claude_code | ✅ Calculations→Knowledge, Tests→Telemetry |
| C5 | ATCS: wire unified search across registries with tenant_id filter (absorbs R1-MS8 Part D) | Search Engineer | Sonnet 4.6 | Data Integrity | Opus 4.6 | GATED | M (5 calls) | ATCS | ✅ Search→Knowledge, Units→Telemetry |
| C6 | autopilot_v2: validate all wiring with full 6-phase pipeline (VG-05) | Quality Engineer | Opus 4.6 | Ralph (Opus) | Opus 4.6 | GATED | M (4 calls) | autopilot_v2 | ✅ Validation→Telemetry, Score→MemGraph |
| | **VG-05: Validation report sign-off** | Safety Architect | Opus 4.6 | — | — | GATE | S (1 call) | Manual | ✅ Sign-off→Compliance |

**U0-C Pipeline Detail (C3):**
```
Stage 1: Core data flow schemas (foundation)        → Sonnet 4.6
Stage 2: Processing tools (consume Stage 1 outputs)  → Sonnet 4.6
Stage 3: Integration tools (bridge S1↔S2)            → Sonnet 4.6
Stage 4: Validation tools (verify full chain)         → Opus 4.6
Stage 5: Edge case handlers (gaps from Stage 4)       → Opus 4.6
```
Each stage propagates interface contracts forward. Compliance gate validates each stage output.

**U0-C Exit Criteria:**
- Swarm pipeline proven with 697 real strategies (not synthetic)
- Claude Code tested and integrated on real multi-file task
- ATCS operational with tenant-scoped unified search
- autopilot_v2 validation report ≥B+ (blocking if below)
- Tenant isolation verified across all swarm workers
- MS8 Parts B, C, D COMPLETE as side effect
- All wiring indexed in Knowledge registry

---

## U0-D: VALIDATED PHASE GATE + R1 COMPLETION

**Orchestration:** swarm_competition (testing) → swarm_consensus (safety) → manual (reporting)
**Session:** 1 | **Estimated calls:** ~18

| # | Step | Primary | Model | Reviewer | Model | Gate | Effort | GSD Route | Indexed? |
|---|------|---------|-------|----------|-------|------|--------|-----------|----------|
| D1 | **COMPETITION:** 3 agents generate integration test suites, best wins by coverage/mutation/edge count | Test Engineers (3x) | Sonnet 4.6 | Quality Engineer | Sonnet 4.6 | GATED | M (4 calls) | swarm_competition | ✅ Tests→Knowledge, Scores→Telemetry |
| D2 | Ralph 4-phase validation on full R1 output (includes compliance coverage metric) | Ralph Pipeline | Opus 4.6 | — | — | GATED | M (4 calls) | autopilot_v2 | ✅ Score→MemGraph, Report→Docs |
| D3 | **CONSENSUS:** 3 Opus agents independently validate safety, then VOTE (2-of-3 minimum, unanimous for CRITICAL) | Safety Validators (3x) | Opus 4.6 | — | — | GATED | L (5 calls) | swarm_consensus | ✅ Votes→MemGraph, Findings→Guard |
| D4 | Data quality metrics across all registries (3,548 materials, 920 machines, 13,967 tools) | Data Quality Engineer | Sonnet 4.6 | — | Haiku 4.5 | YOLO | S (2 calls) | Manual | ✅ Metrics→Telemetry |
| D5 | Wiring verification audit: orphan detection, downstream deps, ≥6 consumers per registry (VG-06) | Dependency Analyst | Sonnet 4.6 | Systems Architect | Opus 4.6 | GATED | M (4 calls) | autopilot_quick | ✅ Orphans→Guard, Coverage→Telemetry |
| D6 | Omega compute (Ω ≥ 0.70 required for release) | Quality Engineer | Sonnet 4.6 | — | — | GATED | S (1 call) | Manual | ✅ Score→MemGraph→HOT_RESUME |
| D7 | Utilization report: before (5%) vs after, from tracker + telemetry data | Telemetry Engineer | Sonnet 4.6 | — | — | YOLO | S (1 call) | Manual | ✅ Report→Docs |
| D8 | GSD Law 6 compliance audit (verify 100% utilization of all activated systems) | Compliance Auditor | Opus 4.6 | — | — | GATED | S (2 calls) | Manual | ✅ Audit→Compliance log |
| D9 | Bridge route audit: verify new intelligence endpoints have gateway routes (architect F-009) | API Engineer | Sonnet 4.6 | — | Haiku 4.5 | YOLO | S (2 calls) | Manual | ✅ Routes→Bridge registry |
| D10 | Final memory edits update for R2 start | — | Manual | — | — | YOLO | S (1 call) | Manual | ✅ Memory→MemGraph |
| D11 | Update recovery card + position + HOT_RESUME for R2 | — | Manual | — | — | YOLO | S (1 call) | Manual | ✅ Position→Docs |

**U0-D Exit Criteria (R1 COMPLETE):**
- Ralph ≥ B+ (4-phase validation)
- Safety consensus: 3 Opus agents vote ≥ 2-of-3 pass, unanimous on CRITICAL findings
- Ω ≥ 0.70 (release threshold)
- Zero critical wiring orphans
- ≥6 consumers verified per registry
- Utilization > 40% (up from ~5%)
- All new intelligence endpoints have Bridge routes
- GSD Law 6 compliant
- R1 COMPLETE → ready for R2

---

## INDEXING REQUIREMENTS (EVERY step produces indexed output)

Every step MUST feed at least one of these systems:

| System | What Gets Indexed | Consumer |
|--------|-------------------|----------|
| **MemGraph** | Decisions (record), contexts (why), outcomes, errors, patterns | Cross-session learning, PFP, similar search |
| **Telemetry** | Duration, token cost, success/fail, dispatcher, action | Self-optimization, SLO monitoring |
| **Guard** | Errors (capture), patterns (scan), learnings (save) | PFP risk assessment, failure prevention |
| **PFP** | Risk assessments, pre-filter results | Predictive failure warnings |
| **Knowledge** | Cross-query results, enrichments | Manufacturing calculations |
| **Compliance** | Gate results, audit entries | Regulatory tracking |
| **Bridge** | Route registrations, endpoint status | External API access |
| **Generator** | Hook manifests, generated code | Consistency verification |
| **Todo** | Task state, progress, blockers | Attention anchoring |
| **Docs** | Reports, recovery cards, positions | Session continuity |

**Rule:** If a step produces no indexed output, it's not observable and can't be learned from. EVERY step must be observable.

---

## EFFORT SUMMARY

| Milestone | Calls | Opus 4.6 | Sonnet 4.6 | Haiku 4.5 | Sessions | Token Budget |
|-----------|-------|----------|------------|-----------|----------|-------------|
| U0-A | ~28 | 30% (gates, safety arch) | 65% (implementation) | 5% (verify) | 1 | ~5K agent tokens |
| U0-B | ~25 | 35% (cognitive SP, compliance, reviews) | 60% (wiring, integration) | 5% (lookups) | 1 | ~18K agent tokens |
| U0-C | ~22 | 40% (S4-5 pipeline, tenant, validation) | 55% (S1-3 pipeline, CC, ATCS) | 5% (research) | 1-2 | ~30K agent tokens |
| U0-D | ~18 | 45% (consensus, Ralph, compliance audit) | 50% (testing, metrics, bridge) | 5% (queries) | 1 | ~25K agent tokens |
| **TOTAL** | **~93** | **37%** | **58%** | **5%** | **4-5** | **~78K agent tokens** |

**Cost vs all-Opus:** 58% savings with only 2.1% quality reduction (combination_optimizer finding)

---

## DEPENDENCY GRAPH

```
U0-A (Bootstrap) ─────→ U0-B (Intelligence) ───→ U0-C (Parallel+Wiring) ───→ U0-D (Phase Gate)
    │ VG-02              │ VG-02+VG-03           │ VG-04+VG-05              │ VG-06
    │                    │                        │                          │
    ├─ HOT_RESUME fix    ├─ PFP enable            ├─ Manus research          ├─ Competition tests
    ├─ NL hooks fix      ├─ Telemetry wire        ├─ Tenant injection        ├─ Ralph 4-phase
    ├─ Claude Code setup ├─ Guard learning pipe   ├─ Pipeline 697 strategies ├─ Consensus safety (3x Opus)
    ├─ ATCS cleanup      ├─ Memory Graph activate ├─ Claude Code threads     ├─ Data quality metrics
    ├─ Pre-build gate    ├─ Todo tracking wire    ├─ ATCS unified search     ├─ Wiring audit
    ├─ Snapshot + verify ├─ Tool mask fix         ├─ autopilot_v2 validate   ├─ Omega compute
    ├─ Preflight script  ├─ Auto-fire loop close  │                          ├─ Utilization report
    ├─ Utilization track ├─ Cognitive SPs wire    │ Side effects:            ├─ Bridge route audit
    ├─ YOLO + file class ├─ Manus hook chains     │  R1-MS8 Part B ✅        ├─ GSD Law 6 audit
    └─ Memory edits      ├─ Compliance gate       │  R1-MS8 Part C ✅        ├─ Memory edits final
                         ├─ Knowledge cross-query │  R1-MS8 Part D ✅        └─ Recovery card update
                         └─ Context KV+attention  │
                                                  └──→ R1-MS8 COMPLETE
                                                       ↓
                                                  U0-D validates → R1 COMPLETE → R2 START
```

---

## POST-U0 SESSION MODEL (automatic, every session)

```
SESSION START
  └─ session_preflight.js
     ├─ HOT_RESUME read + position recovery
     ├─ NL hook health (9/9 fire check)
     ├─ Agent ping (5 core agents, latency + status)
     ├─ Ralph API check
     ├─ PFP pre-filter enable
     ├─ Todo read + attention anchor
     └─ Dashboard display

DURING SESSION (automatic triggers)
  ├─ Every tool call → telemetry record (sampled 1-in-5 for non-safety)
  ├─ Every file_write to CRITICAL file → PRE-COMMIT code review agent (blocking)
  ├─ Every file_write to STANDARD file → POST-COMMIT code review agent (async)
  ├─ Every error → guard capture → learning_save → pattern_scan → PFP update
  ├─ Every decision → MemGraph record with context node
  ├─ Every checkpoint (10 calls) → HOT_RESUME update + quality_gate agent
  ├─ Every build → pre_build_check.js + compliance gate
  ├─ SKILL_HINTS (score>0.8) → auto-load skill content
  ├─ AGENT_REC (confidence>0.7) → suggest in cadence output
  ├─ SCRIPT_RECOMMEND (match>0.8) → suggest in cadence output
  ├─ ATTENTION_SCORED (avg<0.5) → warn: focus drift
  ├─ Bulk operations → ILP-optimized swarm dispatch
  ├─ context_kv_optimize on telemetry events
  └─ context_attention_anchor on safety constraints

SESSION END
  ├─ prism_omega → compute (session score)
  ├─ Utilization report from tracker
  ├─ HOT_RESUME.md final update
  ├─ CURRENT_POSITION.md update
  ├─ state_save + todo_update
  └─ MemGraph session summary node
```

---

## RISK MATRIX (combined from all auditors)

| Risk | Source | Impact | Likelihood | Mitigation |
|------|--------|--------|------------|------------|
| YOLO causes silent regression in safety data | physics_validator SR-01/02 | CRITICAL | MEDIUM | File safety classification; YOLO NEVER on CRITICAL files |
| S(x)≥0.70 is policy not constraint | physics_validator | CRITICAL | HIGH | Code-enforce as runtime assertion at every consumption point |
| All-systems-ON exceeds token budget | combination_optimizer | HIGH | CONFIRMED (180>150) | Optimized config: 110.4/call (39.6 headroom) |
| Pipeline wiring interface mismatches | combination_optimizer | HIGH | MEDIUM | 5-stage pipeline propagates contracts; Opus validates S4-5 |
| Swarm cross-tenant data leakage | architect F-002 | CRITICAL | LOW | Wire tenant_id injection in U0-C before swarm launch |
| PFP learns wrong patterns | physics_validator SR-03 | HIGH | MEDIUM | Range checks on all learned parameters before persistence |
| Agent API costs exceed budget | all | MEDIUM | LOW | Token budget allocator; degrade to script-only at 80% |
| Compliance missing from toolpath dispatch | architect F-001 | HIGH | HIGH | Wire as CORE-layer blocking gate in U0-B |
| Stale/forked conversation branches | brainstorm | MEDIUM | HIGH | Hash-based state fingerprinting at checkpoints |

---

## FILES AND LOCATIONS

| File | Location | Purpose |
|------|----------|---------|
| This roadmap | C:\PRISM\mcp-server\data\docs\roadmap\PRISM_ROADMAP_v15.2.md | Execution document |
| CURRENT_POSITION.md | C:\PRISM\mcp-server\data\docs\roadmap\ | Position tracker |
| PRISM_RECOVERY_CARD.md | C:\PRISM\mcp-server\data\docs\roadmap\ | Recovery on "continue" |
| ROADMAP_TRACKER.md | C:\PRISM\mcp-server\data\docs\roadmap\ | Completion log |
| HOT_RESUME.md | C:\PRISM\state\ | Session recovery |
| ACTION_TRACKER.md | C:\PRISM\state\ | Action continuity |
| utilization.jsonl | C:\PRISM\state\ | Usage metrics (after U0-A) |
| GSD_QUICK.md | C:\PRISM\mcp-server\data\docs\gsd\ | GSD v22.0 protocol |
| Transcripts | /mnt/transcripts/ | Full conversation history |

---

## CHANGELOG

- v15.2 (2026-02-19): Consolidated from 3 Opus agent audits + 2 manual passes. Added: pipeline pattern for U0-C, consensus for safety, 7 validation gates, file safety classification, prism_compliance/tenant/cognitive_SP/ILP/generator wiring, token optimization (110.4/call), model split (Opus 30%/Sonnet 70%), indexing requirements per step, Manus web_research pre-pipeline, 12 new steps across milestones. Removed: 10 redundant cadence functions. Changed: 7 YOLO→GATED based on physics_validator regression analysis.
- v15.1 (2026-02-19): Added 6 dormant intelligence systems (PFP, telemetry, guard, memory graph, todo, tool masking). Consolidated 7→4 milestones.
- v15.0 (2026-02-19): Initial utilization-first architecture. Inserted U0 phase before R1-MS9.
