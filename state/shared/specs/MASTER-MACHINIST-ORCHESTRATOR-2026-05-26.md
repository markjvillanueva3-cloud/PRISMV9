---
spec_id: MASTER-MACHINIST-ORCHESTRATOR-MS0
created: 2026-05-26
slot: sierra
author: claude-5c0bd535
status: proposed
must_human_verify: true
brainstorming_rounds: 3 (15 parallel research agents)
companion_html: false
---

# MASTER-MACHINIST-ORCHESTRATOR-MS0 — Specification

## Thesis

PRISM has the engines (3,500+ wired, world-class adaptive-algorithm depth). It is **missing the composing layer** that turns 16 production stages × 87 adaptive algorithms × 200+ toolpaths × 8 controller dialects × 4 stakeholder roles into a single answer per RFQ.

The orchestrator's first visible product is the **dry-run quote**: every RFQ runs the full 16-stage plan in simulation; every dollar traces to a pipeline stage; quote-actual variance collapses because the quote IS the plan.

## Source of design

3 brainstorming rounds (sierra slot, 2026-05-26):
- Round 1: 5 agents → 16-stage pipeline + 200+ toolpath catalog + alternative production paths + stakeholder coverage + missing-stages gap analysis
- Round 2: 5 agents → 87 adaptive-algorithm catalog + per-stage observable signals + outcome-bus architecture + safety risk matrix + stakeholder UX
- Round 3: 4 agents (5th died on session limit) → 593 orphan engines → orchestrator-fit map + hub identification + cross-domain duplication audit + granularity guide

15 agent reports synthesized in this session's assistant turns. Full conversation transcript preserved.

## The 16-stage pipeline + 2 side-channels + 3 routers + 2 closed loops

```
┌────────────────────────────────────────────────────────────────┐
│ SIDE-CHANNEL A: GD&T payload propagates through every stage    │
│ SIDE-CHANNEL B: Confidence trace propagates through every stage│
└────────────────────────────────────────────────────────────────┘

1.  INPUT (RFQ + blueprint/photo/STEP)
2.  MATERIAL-RESOLVE (spec + heat-treat + supplier)
3.  FEASIBILITY-GATE (pre-quote — fixes wrong-order regression)
4.  CAD (text/blueprint/photo → 3D + featureDAG) ← DOMAIN-ROUTER
5.  SETUP-PLAN (workholding + datum + multi-op sequence)
6.  METHOD-ROUTER (CAM vs Fanuc macro vs Mazatrol vs on-machine)
7.  CAM-STRATEGY / MACRO-COMPOSE / CONVERSATIONAL-COMPOSE
8.  SSF (Kienzle + Taylor + chatter + chip-thinning)
9.  TOOL-CRIB (JM Die real inventory + substitute/order)
10. POST (controller-dialect emit + capability-matrix gate)
11. SETUP-VALIDATION (air-cut + datum-offset proof)
12. SIM/QA (collision + safety Ω≥0.95/S(x)≥0.98)
13. FAI-GATE (CMM + Cpk + PPAP form 3)
14. SECONDARY-OPS (heat-treat/grind/anodize/plate routing)
15. EXECUTE (MACHINE_RUN — currently MISSING dispatcher)
16. ERP/COST + QUOTE-DRY-RUN

Closed-loop A: pre-quote feasibility (fixes Agent D's P0)
Closed-loop B: outcome bus → confidence weights + Kienzle/Taylor +
               LoRA + Wright curve + win/lose pricing
```

## Hub map — what to compose with (DO NOT bypass)

| Stage | Coarse hub | Status |
|---|---|---|
| INPUT | `PrintToProgramPipelineEngine` | ✓ wired |
| MATERIAL | `MaterialEquivalenceEngine` | ✓ wired |
| FEASIBILITY | `FeasibilityOrchestratorEngine` | ✓ wired |
| CAD | `CADSystemRouterEngine` (367 + 564 actions) | ✓ wired (sink: 3,212 in / 10 out — fan-out gap) |
| SETUP | **MISSING** — `SetupOrchestrationEngine` to build | ✗ no coarse hub |
| METHOD | **MISSING** — `ProgrammingMethodOrchestratorEngine` to build | ✗ god gap |
| CAM | `CAMKernelOrchestratorEngine` (2,475 actions) | ✓ wired (god-engine: needs MS1 decomp) |
| SSF | `SpeedFeedOrchestratorEngine` (2,851 LOC, 67 integration points) | ✓ wired (mislabeled "orchestrator" — IS the hub) |
| TOOL-CRIB | `ToolInventoryOrchestratorEngine` | ✓ wired |
| POST | `MasterPostProcessorEngine` → `PostProcessorPipelineEngine` | ✓ wired (38-stage god engine — MS1 decomp candidate) |
| SETUP-VALID | `CalibratedSimulationEngine` | ✓ wired |
| SIM/QA | `SimulationEngine` | ✓ wired |
| FAI-GATE | `PRISMOmegaSafetyEngine` | ✓ wired (UNIVERSAL gate) |
| SECONDARY | `SecondaryOpsEngine` | ✓ wired |
| EXECUTE | **MISSING** — `prism_machine_run` dispatcher to build | ✗ structural gap |
| QUOTE | `QuoteToShipOrchestratorEngine` + `QuoteEstimatorEngine` + `JobCostingEngine` | ✓ wired |

## Honest amendments to prior brainstorming agents

**Agent I (safety)** overstated the EWC gap:
- CLAIM: "CrossProcessEWCMemoryPreservationEngine built+tested but never invoked"
- REALITY (verified inline 2026-05-26): EWC IS wired into `CrossProcessNeuralLearningEngine.ts` lines 1090, 1173, 1192, 1219, 1618 — `regLoss`, `computeFisher`, `consolidateCurrentTask`, `reset` all called
- TRUE GAP: EWC NOT wired into `CAMLoRAAdapterTrainerEngine.trainAll()` — LoRA adapter trainer uses simpler LS optimization without Fisher-info regularization. This is a P1 design unit (non-trivial integration), not the 20-LOC wire claimed.
- Lesson: per `feedback_verify_actual_contract_not_proxy`, ALL Agent I claims of "BUILT but UNWIRED" must be inline-verified before becoming a unit.

**Agent A (system-viz crawler)** claimed `QuotingEngine` + `JobCostingEngine` + `JobShopSchedulingEngine` are all ○ ghost:
- Agent K (round 3) corrected: `QuotingEngine` + `JobCostingEngine` ARE wired. `JobShopSchedulingEngine` is the actual ghost.
- Verification (inline 2026-05-26): not done; flagged for spec reviewer.

## Unit inventory — 20 units across 5 slots

### P0 — must ship to call MS0 complete (13 units)

| # | Unit | Slot | Effort | Type | Description |
|---|---|---|---|---|---|
| 1 | U-MMO-PIPELINE-SHELL | sierra | M | NEW | 16-stage `OrchestratorPipelineEngine` skeleton with facade adapters. Stage-by-stage cost-emit contract. Foundation for all downstream units. |
| 2 | U-MMO-QUOTE-DRY-RUN | sierra | M | NEW | Dry-run mode on the pipeline shell. Returns `{quote_low_p50, quote_med_p95, quote_high_p99, decomposition[16], alt_methods[], should_cost, margin_floor, risk_premium, win_probability, wright_curve}`. Wraps `QuoteEstimatorEngine` + `JobCostingEngine` + `QuoteToShipOrchestratorEngine`. THE THESIS. |
| 3 | U-MMO-FEASIBILITY-GATE | sierra | S | WIRE | Wire `FeasibilityOrchestratorEngine` to run BEFORE `QuoteEstimatorEngine` (fixes Agent D's wrong-order P0). |
| 4 | U-MMO-OUTCOME-BUS-CONTROLLER | juliett | L | NEW | Unified subscriber to `outcome.completed`. Fan-out: fast-loop override store + per-part replay buffer + per-batch calibration + nightly LoRA/GNN retrain. Audit log + 7-day rolling weight snapshots + auto-rollback on AUROC drop >5% + confidence gate (>2σ delta). |
| 5 | U-MMO-MULTI-AGENT-MODEL-LOCK | juliett | S | WIRE-ONLY | Wrap `CAMLoRAAdapterTrainerEngine.trainAll()` and `CrossProcessNeuralLearningEngine.train()` in `DistributedLockManager.withLock("model-<id>", ...)`. Add concurrent-train regression test (3 slots, deterministic final loss). |
| 6 | U-MMO-DRIFT-REGRESSION-NIGHTLY | golf | M | NEW | `scripts/cam-ml-regression-check.mjs` cron. Evaluate baseline + current model on held-out CAMMLSplitEngine test set. Alert if `MAE_current > MAE_baseline * 1.05`; auto-rollback if `>1.15`. Manager dashboard surface. |
| 7 | U-MMO-DARK-STAGE-INSTRUMENTATION | sierra | M | NEW | Wire observable-signal capture into MATERIAL-RESOLVE, FEASIBILITY-GATE, SETUP-PLAN (currently 0 observables per Agent G). 3 new events to `FeedbackBusEngine`. |
| 8 | U-MMO-OVERRIDE-RECEIPT-LOOP | sierra | M | WIRE + UI | Operator override capture → receipt UI ("Recorded. Retrain at 5 overrides. Current: 2/5") → auto-trigger `/queue-model-refresh` → manager dashboard. Closes the open loop. |
| 9 | U-MMO-LORA-PIPELINE-COLLAPSE | juliett | L | REFACTOR | Collapse 67 LoRA engines (50 LatheLoRA* + 17 MillingLoRA* + 1 WEDMLoRA) → 1 generic `LoRATrainingPipelineEngine` + 3 thin domain adapters. Biggest compounding cleanup. -64 files. |
| 10 | U-MMO-MACHINE-RUN-DISPATCHER | india | L | NEW | Create `prism_machine_run` dispatcher + wire `MTConnectIngester` (ghost — verify/build) + `SlotSessionHistoryEngine` (26KB unwired) + `ShopOutcomeIngestProcessorEngine` (14KB unwired). The execution-edge gap. |
| 11 | U-MMO-SETUP-ORCHESTRATION-ENGINE | sierra | M | NEW | Coarse hub for Stage 5. Composes `FeasibilityOrchestrator` + `FeatureClusteringEngine` + `FixtureDesignEngine` + `WorkCoordinateEngine` + `TombstoneLayoutEngine`. Currently no hub exists per Agent N. |
| 12 | U-MMO-METHOD-ROUTER | india | M | NEW | Create `ProgrammingMethodOrchestratorEngine` + `prism_method` dispatcher. Decision tree: feature graph + machine + operator skill + volume → CAM/macro/conversational/on-machine ranked methods with confidence. |
| 13 | U-MMO-MATERIAL-RESOLVE-STAGE | sierra | S | WIRE | Stage 2 standalone wiring `MaterialEquivalenceEngine` + `MaterialDatabaseBridgeEngine` + `HeatTreatmentResponseEngine`. Drives every downstream stage. |

### P1 — compounds with P0 (7 units)

| # | Unit | Slot | Effort | Type | Description |
|---|---|---|---|---|---|
| 14 | U-MMO-CONFIDENCE-EXPLAIN-TRACE | hotel | M | NEW | `explain()` contract on every adaptive recommendation: `{recommendation, prior: {n, distribution}, evidence[], confidence_interval, tribal_rules, alternatives[], drift_status, last_calibrated}`. Doctrine: never show single number when N<20 or drift>0.15. |
| 15 | U-MMO-TOOL-CRIB-STAGE | sierra | S | WIRE | Wrap `ToolInventoryOrchestratorEngine` as Stage 9. Gate POST on inventory availability. |
| 16 | U-MMO-TOOLPATH-CONTEXT | sierra | L | REFACTOR | Define `ToolpathSelectorContext` schema (8 missing dimensions: rigidity, coolant, IT-class, volume, chatter history, rework penalty, spindle kW, prior-part match). Wire through 91 strategy engines (incremental — start with `MillingStrategyLibraryEngine` + `LatheStrategyLibrary` + 5 most-used). |
| 17 | U-MMO-WRIGHT-CURVE | hotel | M | NEW | Wright's 80% learning curve in `QuoteEstimatorEngine`. Quote N=1 vs N=10 vs N=100 each priced. |
| 18 | U-MMO-WIN-LOSE-LOOP | hotel | M | WIRE | `QuoteAnalyticsEngine` outcome bus → pricing model training loop. Win/lose feeds Wright calibration. |
| 19 | U-MMO-FIXTURE-DESIGN-REFACTOR | sierra | M | REFACTOR | Invert-of-control: `FixtureDesignEngine` stays generic + `LatheWorkholdingAdapter` + `MillWorkholdingAdapter` + `WEDMWorkholdingAdapter`. Compounds with U-MMO-SETUP-ORCHESTRATION-ENGINE. |
| 20 | U-MMO-CAD-FANOUT-STREAMING | sierra | M | NEW | dispatcher-cad is a sink (3,212 in / 10 out). Add per-feature streaming output so downstream consumes incrementally. |

### Deferred to MS1

- U-MMO-EWC-LORA-TRAINER-WIRE — design EWC integration for LoRA adapter trainer (Fisher-info on LS optimization is non-trivial — was overstated by Agent I)
- U-MMO-DISPATCHER-CAM-DECOMP — shard god dispatcher (6,822 total degree) into 4 sub-dispatchers
- U-MMO-POST-PIPELINE-DECOMP — split `PostProcessorPipelineEngine` 38 stages into 5 phases
- U-MMO-LATHE-RL-WIRE / U-MMO-MILL-RL-WIRE — wire the unwired `LatheReinforcementLearningEngine` + `MillingReinforcementLearningEngine`
- U-MMO-CPK-SURROGATE-GENERALIZE — `TurningCpkSurrogateEngine` → `CpkSurrogateEngine[domain]` (missed reuse)
- U-MMO-HRL-OPTIONS-FRAMEWORK — Hierarchical RL options framework (entirely missing — Agent F finding)
- U-MMO-CAD-ADVERSARIAL-FILTER — pre-orchestrator CAD adversarial-input detector
- U-MMO-FANUC-MACRO-EMITTER — close the Fanuc Macro-B stub (dialect captured, emitter missing)
- U-MMO-MAZATROL-EMITTER — first conversational emitter for Mazak machines at JM Die

## Slot assignments

| Slot | Units | Total effort | Notes |
|---|---|---|---|
| sierra | 1, 2, 3, 7, 8, 11, 13, 15, 16, 19, 20 | ~6 weeks | This slot. Open-work-slot per soul. |
| india | 10, 12 | ~3 weeks | Post-processor specialist per soul. MACHINE-RUN + METHOD-ROUTER fit india's domain. |
| juliett | 4, 5, 9 | ~3 weeks | SSF + AI training specialist (per chat-id claude-d63af58b's current PSN-SELF-IMPROVING-LOOP work). |
| golf | 6 | ~1 week | Hygiene + cron. |
| hotel | 14, 17, 18 | ~2 weeks | Business wrapper. |

Concurrent elapsed: 4-6 weeks assuming PIPELINE-SHELL (U1) lands week 1 — all other units depend on its stage contract.

## Sequencing constraints (DAG)

```
U1 (PIPELINE-SHELL) ──→ U2 (QUOTE-DRY-RUN) ──→ U3 (FEASIBILITY-GATE)
                  ──→ U7 (DARK-STAGE-INSTRUMENTATION)
                  ──→ U11 (SETUP-ORCH) ──→ U19 (FIXTURE-REFACTOR)
                  ──→ U13 (MATERIAL-RESOLVE)
                  ──→ U15 (TOOL-CRIB)
                  ──→ U16 (TOOLPATH-CONTEXT)
                  ──→ U20 (CAD-FANOUT)

U4 (OUTCOME-BUS) ──→ U5 (MODEL-LOCK)
                ──→ U9 (LORA-COLLAPSE)
                ──→ U6 (DRIFT-NIGHTLY)
                ──→ U8 (OVERRIDE-RECEIPT)

U10 (MACHINE-RUN) — independent; can ship in parallel
U12 (METHOD-ROUTER) — independent; can ship in parallel
U14 (CONFIDENCE-EXPLAIN) — independent; wires INTO existing engines
U17 (WRIGHT-CURVE) ──→ U18 (WIN-LOSE-LOOP) ──→ feeds U2 QUOTE-DRY-RUN
```

## Safety doctrine — non-negotiable

Per CLAUDE.md and `feedback_no_weakening_safety_gates`:
- Never weaken `Ω≥0.95` or `S(x)≥0.98` to make a model pass
- Every adaptive update writes audit trace (event_id, part_id, prior, new, delta_sigma)
- Cold-start defaults to physics-safe minimum, NOT mid-tier
- Multi-agent training is locked (DistributedLockManager) — no concurrent weight writes
- EWC++ wraps LoRA training where Fisher information applies (P1 design unit)
- Drift detection auto-rollback on AUROC drop >5%
- Operator override carries intent classification (tribal | emergency | over-conservative | over-aggressive); only tribal + emergency feed RL

## Quote dry-run output contract (U2)

```typescript
{
  quote_low_p50:  { dollars, lead_days, confidence },
  quote_med_p95:  { dollars, lead_days, confidence },  // recommended
  quote_high_p99: { dollars, lead_days, confidence },
  decomposition: [{ stage, cost, source, confidence }, ...×16],
  alt_methods: [{ method, total, savings, tradeoff }],
  should_cost,        // theoretical optimum
  margin_floor,       // below this = walk away
  risk_premium,       // unknowns
  win_probability,    // from QuoteAnalyticsEngine prior data
  wright_curve: { n1, n10, n100 }
}
```

## Acceptance criteria (MS0 ships when)

1. All 13 P0 units land with per-file scrutiny (2 parallel reviewers each)
2. Quote-actual variance on historical JM Die archive (24,545 files) within ±15% on N=50 sample (target: ±10% per Quoting Expert Mode)
3. Zero god-engine safety bypasses (Ω/S(x) thresholds intact)
4. Outcome bus closes loop on ≥1 retrain cycle (auditable in `OUTCOME_AUDIT_LOG.jsonl`)
5. Multi-agent model-write test passes (3 concurrent trains, deterministic final loss)
6. MACHINE-RUN dispatcher emits ≥1 MTConnect-sourced outcome to bus

## Open questions for spec reviewer

- (P0) Is `JobShopSchedulingEngine` actually ghost per Agent A or wired per Agent K? Verify before assuming.
- (P1) Should U16 TOOLPATH-CONTEXT wire all 91 strategy engines or just top-5 most-used in MS0? Incremental scope.
- (P1) U9 LORA-COLLAPSE: does collapsing 67 engines break any existing in-flight cron / scheduled task? Audit before refactor.
- (P2) Does the per-stage cost-emit contract belong on the engine interface or as a separate Decorator? Discuss before U1.

## Next actions for sierra (this slot)

1. **Iter 5 (this session if budget allows):** Build U-MMO-LORA-PIPELINE-COLLAPSE FOUNDATION — `scripts/lib/lora-training-pipeline.mjs` (generic) + 3 domain-adapter stubs + test suite. Collapse migration is a follow-up wave.
2. **Iter 6+:** Build U1 PIPELINE-SHELL + U2 QUOTE-DRY-RUN as sierra's primary plate.
3. **Post to chat-bus:** Notify india + juliett + golf + hotel of their assigned units.

## Anti-regression / R12 fail-loud

- Agent I's EWC claim was wrong (verified inline). Future audit agents must verify "BUILT-but-UNWIRED" claims before promoting to unit.
- Agent A's `QuotingEngine`/`JobCostingEngine` ghost claim contradicted by Agent K. Resolve before U2 ships.
- dispatcher-cam (god engine, 6,822 total degree) — composing with it works for MS0 but is a known scaling risk for MS1.

## References

- Brainstorming session transcript: this session 2026-05-26, slot sierra, claude-5c0bd535
- 15 parallel agent reports synthesized in assistant turns (3 rounds × 5 agents, 1 died on session limit)
- CLAUDE.md §SCRUTINY GATE, §HOOK ENFORCEMENT GATES, §NN-GRAPH-MS0/MS1/MS2
- `state/shared/system-viz/domain-pipeline-augmentation.json` (13 domain pipelines, 86 stages mapped)
- `state/shared/AWARENESS-SNAPSHOT.md` (current wiring coverage)
- `state/shared/specs/HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md` (cross-ref for closed-loop architecture)
- akshay_pachaar X tweet 2056714042455343160 (RAG vs CAG — substrate already shipped this session as commit 3787ba822a)
- cyrilXBT X tweet 2052923836090167526 (Obsidian writes back — formally HMEMV04+05+06 envelope)

## Status

- [x] Design proposed
- [ ] User reviews this spec (gate before envelope JSON write)
- [ ] User approves
- [ ] Envelope JSON written to `mcp-server/data/milestones/MASTER-MACHINIST-ORCHESTRATOR-MS0/envelope.json`
- [ ] Per-unit specs written to `mcp-server/data/milestones/MASTER-MACHINIST-ORCHESTRATOR-MS0/units/U-MMO-*.json`
- [ ] Chat-bus broadcast posted to india/juliett/golf/hotel
- [ ] First unit claimed
