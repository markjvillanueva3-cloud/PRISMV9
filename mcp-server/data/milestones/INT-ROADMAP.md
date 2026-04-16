# INT Track — Full System Integration & Synchronization Roadmap

## Generated: 2026-04-06
## Scope: Wire ALL built capabilities into full system surface

---

## AUDIT FINDINGS

| Metric | Count | Status |
|--------|-------|--------|
| Total engine files | 1,477 | — |
| Engines wired to dispatchers | 1,152 (78%) | 325 dark |
| Total dispatcher actions | ~3,100 | across 81 dispatchers |
| Skills | 260 | many reference stale/missing engines |
| Hooks (Python) | 71 | using old patterns, not new engines |
| Hooks (MJS) | 2 | WEDM-specific only |
| Test files | 1,085 | unknown coverage gap |
| CLAUDE.md | stale | missing ACP+MXU (17 engines, 57 actions) |
| ENGINE_DIGEST.md | stale | missing recent engines |
| DISPATCHER_DIGEST.md | stale | missing recent actions |
| MEMORY.md | stale | missing ACP+MXU completion |
| CURRENT_POSITION.md | stale | still says WEDM-HARDEN-MS0 |
| AUTOMATION_CENSUS.json | partially updated | ACP gaps fixed, MXU not reflected |

---

## MILESTONE OVERVIEW

```
INT-MS0: Document & Digest Sync (3 units) — Update all stale documents
INT-MS1: Hook Modernization (6 units) — Wire new engines into auto-fire hooks
INT-MS2: Slash Command Surface (6 units) — New + updated slash commands
INT-MS3: Existing Command Integration (3 units) — Update startup/compact/forge/autopilot
INT-MS4: State & Memory Sync (3 units) — MEMORY.md, position, census, roadmap-index
INT-MS5: Dark Engine Triage (6 units) — Classify 325 dark engines: wire, mark internal, or deprecate
INT-MS6: Skill Audit & Refresh (3 units) — Verify 260 skills reference live engines
INT-MS7: E2E Validation Suite (3 units) — Run CapabilityEffectivenessEngine validation across all pillars
```

**Total: 8 milestones, 33 units, ~11 sessions**

---

## INT-MS0: Document & Digest Sync
**Priority: CRITICAL — all other work depends on accurate digests**
**Sessions: 1**

### SESSION INT-S1: Document Synchronization
SMART CONFIG: Role=System integrator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: ENGINE_DIGEST.md, DISPATCHER_DIGEST.md, CLAUDE.md, MASTER_INDEX_COMPACT.md

U-INT01: Regenerate ENGINE_DIGEST.md
  → Scan all 1,477 engine files, generate 1-line descriptions
  → Include domain classification, wiring status (wired/dark/internal)
  → EXIT: Digest has entries for ALL engine files

U-INT02: Regenerate DISPATCHER_DIGEST.md
  → Scan all 81 dispatchers, count actions per dispatcher
  → Include new ACP+MXU actions (57 new in devDispatcher)
  → EXIT: Digest action counts match live grep

U-INT03: Update CLAUDE.md Architecture section
  → Add ACP track (7 engines: AutomationChain, BuildGuard, ChainFailureRecovery, ContextChain, SpeedFeedAutopilot, PostProcessorAutopilot, QuoteAutopilot)
  → Add MXU track (10 engines: UtilizationContract, CapabilityCensus, CodingCopilot, TokenEconomy, PersistentMemory, CapabilityPath, WorkflowOrchestration, ProductPillar, Discoverability, CapabilityEffectiveness)
  → Update counts: engines, dispatchers, actions, tests
  → Add "Automation Chains" and "Product Pillars" to "What's Built" section
  → EXIT: All counts match live system, no stale references

/compact checkpoint

---

## INT-MS1: Hook Modernization
**Priority: HIGH — makes engines auto-fire on every session**
**Sessions: 2**

### SESSION INT-S2: Core Auto-Fire Hooks
SMART CONFIG: Role=Hook engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%

U-INT04: BuildGuardChain → PostToolUse Write|Edit hook
  → Replace/augment enforce-smart-test-after-edit.py
  → Node.js hook calling BuildGuardChainEngine.trackEdit() + resolveAffectedTests()
  → EXIT: Hook fires on every .ts edit, suggests tests after 3 edits

U-INT05: ContextChain → PreCompact hook
  → Augment existing precompact hook
  → Call ContextChainEngine.planCompaction() for critical fact preservation
  → EXIT: Handoff includes context chain critical_facts

U-INT06: TokenEconomy → PostToolUse tracking hook
  → Track token spending category per tool call
  → Detect waste patterns in real-time
  → EXIT: Token spending tracked, waste alerts fire

/compact checkpoint

### SESSION INT-S3: Intelligence Hooks
SMART CONFIG: Role=Hook engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%

U-INT07: AutomationChain → UserPromptSubmit hook
  → Classify each prompt into 9 task classes
  → Inject context bundles for detected class
  → EXIT: Every prompt classified, bundles suggested

U-INT08: CodingCopilot → PreToolUse Write (new engine files)
  → Dedup check before creating engine files
  → Warn if overlap > 60% with existing engine
  → EXIT: New engine creation triggers dedup check

U-INT09: ChainFailureRecovery → PostToolUseFailure hook
  → Classify failures, compute recovery plans
  → Inject retry/skip/abort guidance
  → EXIT: Tool failures get structured recovery

/compact checkpoint

---

## INT-MS2: Slash Command Surface
**Priority: HIGH — user-facing discoverability**
**Sessions: 2**

### SESSION INT-S4: New Slash Commands
SMART CONFIG: Role=Skill author | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%

U-INT10: Create /discover skill
  → DiscoverabilityEngine.search() + .whatCanIDo() + .browse()
  → EXIT: /discover 'speed feed' returns ranked results

U-INT11: Create /census skill
  → CapabilityCensusEngine.runLiveReport()
  → EXIT: /census shows utilization %, dark engines, gaps

U-INT12: Create /pillar skill
  → ProductPillarEngine.getSummary()
  → EXIT: /pillar shows 8 pillars with completeness scores

/compact checkpoint

### SESSION INT-S5: More New Slash Commands
SMART CONFIG: Role=Skill author | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%

U-INT13: Create /token-economy skill
  → TokenEconomyEngine.getBudget() + .detectWaste() + .generateReport()
  → EXIT: /token-economy shows budget, waste patterns, ROI

U-INT14: Create /learn-path skill
  → CapabilityPathEngine.suggestNext() + .getProgress()
  → EXIT: /learn-path shows available paths, progress, next step

U-INT15: Create /workflow skill
  → WorkflowOrchestrationEngine.listWorkflows() + .planExecution()
  → EXIT: /workflow lists built-in workflows, plans execution

/compact checkpoint

---

## INT-MS3: Existing Command Integration
**Priority: HIGH — existing commands leverage new engines**
**Sessions: 1**

### SESSION INT-S6: Update Existing Commands
SMART CONFIG: Role=System integrator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%

U-INT16: Update /startup
  → Add Step 4F: pillar summary line (ProductPillarEngine)
  → Add utilization % from CapabilityCensusEngine
  → Add task classification hint from AutomationChainEngine
  → EXIT: Startup shows pillar readiness + utilization %

U-INT17: Update /precompact + /compact flow
  → Precompact calls ContextChainEngine.planCompaction()
  → Critical facts auto-preserved in handoff
  → EXIT: Context chain guides compaction

U-INT18: Update /forge-engines + /forge-triple
  → Forge calls CodingCopilotEngine.checkDuplication() before creating
  → Forge uses .generateTemplate() for scaffolding
  → Forge-triple validates hook+action+skill from ProductPillarEngine
  → EXIT: Forge shows dedup check, uses copilot template

/compact checkpoint

---

## INT-MS4: State & Memory Sync
**Priority: MEDIUM — accurate system state**
**Sessions: 1**

### SESSION INT-S7: State File Updates
SMART CONFIG: Role=State manager | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=25%

U-INT19: Update MEMORY.md
  → Record ACP track complete (7 engines, 200 tests, 22 actions)
  → Record MXU track complete (10 engines, 165 tests, 35 actions)
  → Record architectural decisions (product pillars, token economy, persistent memory)
  → EXIT: Memory entries present for ACP + MXU

U-INT20: Update CURRENT_POSITION.md + roadmap-index.json
  → Mark ACP-MS0→MS7 complete
  → Mark MXU-MS0A→MS10 complete
  → Register INT track in roadmap-index
  → EXIT: Milestone counts accurate, position updated

U-INT21: Refresh AUTOMATION_CENSUS.json
  → Run CapabilityCensusEngine.saveCensus() for live snapshot
  → Update gap map to reflect all new wiring
  → EXIT: Census matches live system state

/compact checkpoint

---

## INT-MS5: Dark Engine Triage
**Priority: MEDIUM — reduce 325 dark engines**
**Sessions: 2**

### SESSION INT-S8: Classify Dark Engines (batch 1)
SMART CONFIG: Role=System architect | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=40%

U-INT22: Classify first 100 dark engines
  → For each: internal utility? → mark internal. Has tests? → wire to dispatcher. Deprecated? → mark for removal.
  → EXIT: 100 engines classified as wire/internal/deprecate

U-INT23: Wire top 20 highest-value dark engines to dispatchers
  → Prioritize by domain: physics, post_processor, business, quality
  → EXIT: 20 engines newly wired, dispatcher actions created

U-INT24: Mark internal/utility engines in ENGINE_DIGEST
  → Tag engines like BaseEngine, *Helper, *Adapter, *Bridge as internal
  → EXIT: Internal engines clearly marked, excluded from utilization metrics

/compact checkpoint

### SESSION INT-S9: Classify Dark Engines (batch 2)
SMART CONFIG: Role=System architect | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=40%

U-INT25: Classify remaining 225 dark engines
  → Same triage: wire/internal/deprecate
  → EXIT: All 325 dark engines classified

U-INT26: Wire next 30 highest-value dark engines
  → EXIT: 30 more engines wired, total dark reduced to <275

U-INT27: Generate Dark Engine Report
  → Summary: X wired, Y internal, Z deprecated, W remaining
  → EXIT: Report saved to data/state/DARK_ENGINE_REPORT.json

/compact checkpoint

---

## INT-MS6: Skill Audit & Refresh
**Priority: MEDIUM — ensure 260 skills reference live engines**
**Sessions: 1**

### SESSION INT-S10: Skill Health Check
SMART CONFIG: Role=Quality auditor | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=35%

U-INT28: Scan all 260 skills for stale engine references
  → Check each SKILL.md for engine names that no longer exist
  → Check for action names that don't match dispatcher reality
  → EXIT: Stale reference report generated

U-INT29: Fix top 20 broken skills
  → Update engine references to current names
  → Update action references to live dispatcher actions
  → EXIT: 20 skills fixed, no broken references

U-INT30: Cross-reference skills with ProductPillarEngine
  → Map each skill to a product pillar
  → Identify skills with no pillar home → assign or deprecate
  → EXIT: Every active skill mapped to a pillar

/compact checkpoint

---

## INT-MS7: E2E Validation Suite
**Priority: LOW — validation after all wiring is done**
**Sessions: 1**

### SESSION INT-S11: End-to-End Validation
SMART CONFIG: Role=QA engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%

U-INT31: Run CapabilityEffectivenessEngine.getValidationTests() suite
  → Execute each validation test via dispatcher actions
  → Verify output fields match expectations
  → EXIT: Pass rate >= 80% across all pillars

U-INT32: Run CapabilityCensusEngine.runLiveReport()
  → Verify utilization % increased from baseline
  → Verify dark engine count decreased
  → EXIT: Utilization > 85%, dark < 250

U-INT33: Final integration verification
  → Run full test suite (rtk vitest run)
  → Verify build (npx tsc --noEmit)
  → Run /startup and verify all new lines appear
  → EXIT: Build PASS, tests PASS, startup shows new data

/compact checkpoint

---

## EXIT GATE (Full Track)

- [ ] ENGINE_DIGEST.md has entries for ALL 1,477+ engines
- [ ] DISPATCHER_DIGEST.md action counts match live
- [ ] CLAUDE.md updated with ACP+MXU in Architecture
- [ ] 6 new hooks auto-fire (build-guard, context-chain, token-economy, prompt-classifier, copilot-dedup, chain-recovery)
- [ ] 6 new slash commands work (/discover, /census, /pillar, /token-economy, /learn-path, /workflow)
- [ ] 3 existing commands updated (/startup, /precompact, /forge-engines)
- [ ] MEMORY.md reflects ACP+MXU completion
- [ ] CURRENT_POSITION.md accurate
- [ ] 325 dark engines classified (wire/internal/deprecate)
- [ ] 50+ dark engines newly wired
- [ ] 260 skills audited for stale references
- [ ] E2E validation pass rate >= 80%
- [ ] Utilization > 85%
- [ ] Build: PASS | Tests: PASS
