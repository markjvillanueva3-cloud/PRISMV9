---
title: HERMES-CAPABILITY-EXPANSION-CANDIDATES
unit: HERMES-CAPABILITY-EXPANSION-MS0 / Unit 9
milestone: CAD-FUSION-LIVE-MS0
generated: 2026-06-15
author: subagent (agent-orchestration researcher, slot bravo research lane)
status: CANDIDATE — operator review required before build
safety: all candidates preserve existing safety gates; none weaken scrutiny or bypass ZuluFleetGovernor authority hierarchy
already_wired_excluded:
  - ZuluFleetGovernorEngine (HZD-02)
  - DreamMarkerScannerEngine
  - ModelAttributionEngine
  - OpusCapabilityEngine
  - MultiModelConsensusEngine (octopus)
  - MoonshotInvocationEngine
  - self-reflect populater
  - dream-cycle synthesizer
---

# HERMES CAPABILITY EXPANSION — Ranked Candidate Spec

## Research Basis

Recon surfaces examined:
- `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` — open unit queue, already-wired list, B-track keystone blockers
- All 10 existing Zulu*/Hermes*/MultiModelConsensus engine source files (first-60-line recon + dispatcher wiring audit)
- `state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md` — fleet-control NO-GO root causes
- 2025-2026 multi-agent orchestration literature: EvoAgent adaptive skill learning, AgentNet decentralized routing, A2A protocol, delegation contract patterns, LLM observability closed-loop patterns (arXiv 2604.08224; getmaxim.ai/articles/llm-observability-best-practices-for-2025; arize.com/blog/best-ai-observability-tools-for-autonomous-agents-in-2026)

Existing gap in HermesParallelFanoutPlannerEngine (HZP01): emits ONLY wave_1 (leaf subtasks with no depends_on edges). The multi-wave DAG execution engine is structurally absent.

---

## Candidate Ranking (by leverage + safety + effort)

### C1 — Dependency-Ordered Multi-Wave DAG Scheduler

**Capability:** Extend HZP01 to emit and execute wave_2+ after wave_1 completes. Given the SubtaskSchema already carries `depends_on` DAG edges, the planner already encodes the full dependency graph — it just never drives it beyond the leaf (wave_1) set.

**Why high-leverage:**
- Every multi-step parallel build currently bottlenecks at "wave_1 completes, Zulu manually inspects, fan-out restarts" — a human-in-the-loop that eliminates the automation benefit of fan-out planning
- The gap was independently confirmed by reading HZP01's source: `wave_1: subtasks.filter(s => !s.depends_on || s.depends_on.length === 0)` with no subsequent wave emission
- 2025 orchestration literature identifies DAG-scheduled wave execution as table-stakes for production multi-agent pipelines (EvoAgent, AgentNet)
- Wire-onto: HermesParallelFanoutPlannerEngine (HZP01) — add `computeWaveN(completedIds, plan)` pure function + `FanoutWaveScheduler` that drives hermesDispatcher:fan_out_wave_n

**Wire-onto:** HermesParallelFanoutPlannerEngine (HZP01) → new `ZuluWaveSchedulerEngine` (HZP-NEW-01) + wire hermesDispatcher action `schedule_wave`

**Est-effort:** S (3-5 days — incremental; SubtaskSchema + DAG already exist, adds wave driver + completion signaling)

**Safety:** Pure additive. ZuluFleetGovernorEngine authority check runs before every fan-out wave. No existing gate bypassed.

---

### C2 — Cross-Session Task Continuity Tracker

**Capability:** A Zulu-level durable store of mid-flight tasks that survives /compact events. Currently slot-task-claim.mjs tracks claimed→building→testing→committing state per slot but the record is in-memory/session-scoped — a /compact event during a multi-wave build loses the in-progress wave context for all 26 slots simultaneously, and Zulu has no recovery oracle.

**Why high-leverage:**
- Documented symptom: "a /compact event during multi-wave build loses mid-flight task state fleet-wide" — every long-running parallel build is vulnerable
- The BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md B-track "fleet-control readiness" blocker explicitly requires "durable task registry visible to Zulu across restarts"
- 2025 observability research consensus: "execution traces that link each action to its causal antecedents" are baseline for orchestrator recovery (CHI 2025 Awareness/Monitoring/Intervention/Operability model)
- PRISM already has the persistence layer (AgentDB SQLite WAL, schema-versioned JSON state); this adds the Zulu-scoped read/write surface

**Wire-onto:** New `ZuluTaskContinuityEngine` (HZD-NEW-01) — writes per-unit continuation records to `mcp-server/data/state/zulu-task-continuity.json` (schema-versioned); hermesDispatcher actions `continuity_checkpoint`, `continuity_resume`, `continuity_list_midflights`

**Est-effort:** M (1-2 weeks — new engine + durable state + hermesDispatcher wiring + integration with slot-task-claim.mjs heartbeat)

**Safety:** Read/write only to zulu-task-continuity store; no authority over slot operations. ZuluFleetGovernorEngine gates any slot-affecting action. Fail-CLOSED on corrupted state (never trusts a record older than 24h without re-verification).

---

### C3 — Fleet Health Synthesis Engine

**Capability:** Synthesize cross-slot health signals into a scored vector Zulu can use for routing decisions. Currently ZuluDashboardControlEngine (HZD-05) issues HTTP commands to the control server but receives only `{ok, audit_id, reason, error}` — it has no engine that aggregates slot health (last heartbeat age, queue depth, error rate, galaxy domain coverage) into a single ranked readiness vector.

**Why high-leverage:**
- HERMES-CONTROL-READINESS-2026-06-01.md diagnosis: "Fleet-control readiness = NO-GO — governance absent + 12/34 galaxies slot-unaddressable." The governance half is covered by ZuluFleetGovernorEngine. The addressability half requires Zulu to KNOW which slots are alive, which are saturated, and which galaxies are unaddressed — this engine is that awareness surface.
- ZuluTaskAuctionEngine bids factor `queue_penalty` — but queue depth is currently estimated from static soul YAML, not live heartbeat data. A health synthesis engine makes bid scoring empirically grounded.
- The 2025 LLM fleet observability baseline ("distributed tracing, token accounting, automated evals") requires a health synthesis layer to be actionable by the orchestrator, not just logged to a dashboard

**Wire-onto:** New `ZuluFleetHealthSynthesisEngine` (HZD-NEW-02) — consumes chat-slots.json heartbeats + slot-task-claim.mjs queue depth + galaxy coverage map; emits `FleetHealthVector` scored per-slot; wire hermesDispatcher actions `fleet_health_snapshot`, `fleet_health_slot_readiness`; also feed ZuluTaskAuctionEngine as the live `queue_penalty` source

**Est-effort:** M (1-2 weeks — new engine + hermesDispatcher wiring + ZuluTaskAuction integration; most input data already exists in flat files)

**Safety:** Read-only from existing sources; synthesizes but never modifies slot state directly. Health synthesis cannot override the ZuluFleetGovernorEngine authority hierarchy.

---

### C4 — Delegation Contract Engine

**Capability:** Express bounded authority grants between Zulu and worker slots as typed contracts with deadlines, token caps, and failure semantics. Currently ZuluFleetGovernorEngine checks authority binary (ORCHESTRATOR_ROLES set; operations enum) but has no notion of a time-bounded scoped delegation — "slot alpha may perform assign/veto on mill-galaxy tasks for 30 minutes or 50K tokens, whichever comes first."

**Why high-leverage:**
- 2025 A2A protocol and delegation contract patterns identify this as the principal mechanism for preventing authority scope creep in multi-agent hierarchies — a slot that was delegated "mill specialist authority" should not be able to exercise that delegation indefinitely or on unrelated galaxies
- EvoAgent literature: "adaptive skill-based delegation with expiry semantics" is a key differentiator between ad-hoc role assignment and principled orchestration
- Pairs naturally with ZuluFleetGovernorEngine (HZD-02) as a pre-check layer: "is this action within the active delegation contract?" before "is this role authorized?"

**Wire-onto:** New `ZuluDelegationContractEngine` (HZD-NEW-03) — DelegationContract schema {grantee_slot, operations[], galaxy_scope, deadline_utc, token_cap, failure_semantics}; wire as a pre-gate in hermesDispatcher before ZuluFleetGovernor authority check; hermesDispatcher actions `delegation_grant`, `delegation_revoke`, `delegation_status`

**Est-effort:** M (1-2 weeks — new engine + schema + hermesDispatcher pre-gate integration)

**Safety:** STRICTLY additive gate — narrows authority, never widens. ZuluFleetGovernorEngine runs after delegation check. Expired/revoked contract → authority denied immediately (fail-CLOSED). Delegation can only be granted by ORCHESTRATOR_ROLES, never by a worker slot.

---

### C5 — Adaptive Back-Pressure / Load Balancer

**Capability:** Trend-aware fan-out throttle that reads queue-depth and error-rate trajectories over a sliding window before issuing the next wave, preventing the orchestrator from overwhelming slots that are already saturated.

**Why high-leverage:**
- HermesParallelBudgetEnvelopeEngine (HZP03) is per-call budget check (within/over/refused) but is not trend-aware — it has no model of "slot alpha has had queue_depth > 8 for the last 5 checks and has a 40% error rate: do not fan-out more tasks to it"
- The 2025 observability literature identifies "adaptive load balancing with back-pressure" as the gap between a budget-capped orchestrator and a self-healing one
- Protects against cascading failures: a saturated slot receiving more tasks will produce more failures, which produce more correction attempts (HermesSelfCorrectionEngine HZP07), which produce more retries — a classic overload cascade

**Wire-onto:** New `ZuluAdaptiveBackPressureEngine` (HZP-NEW-02) — sliding-window aggregation of slot queue depth + error rate from ZuluFleetHealthSynthesisEngine (C3 dependency); emits `BackPressureSignal` {slot, pressure_level: low/medium/high/blocked, recommended_delay_ms, cause}; wire into hermesDispatcher fan-out paths as advisory pre-check

**Est-effort:** M (but DEPENDS on C3 fleet health synthesis; wire C3 first; 1 week after C3 lands)

**Safety:** Advisory by default (PRISM_BACKPRESSURE_ENFORCE=0 for initial rollout); never vetoes a ZuluFleetGovernor-authorized action unilaterally; escalates to human via AGENT_CHAT if blocked duration > threshold.

---

### C6 — Live Capability Registry

**Capability:** Slots advertise their current actual capabilities at runtime, not just their static soul YAML domain_filter. A slot that has just been /compact'd has different actual capabilities than one that has been running for 2 hours with a warm Obsidian brain and primed Ollama models.

**Why high-leverage:**
- ZuluTaskAuctionEngine currently bids using static soul YAML `domain_filter` — it cannot distinguish between a slot that just cold-started vs. a warm expert slot
- A2A protocol (2025) treats capability advertisement as a first-class primitive: `agent://` URI scheme exposes "what this agent can do right now" as a live resource
- The existing `prism_session:slot_context` and `chat-slots.json` heartbeats contain runtime signals (lastHeartbeat, active claim, galaxy domain) that could power a live registry without any new data collection

**Wire-onto:** New `ZuluCapabilityRegistryEngine` (HZD-NEW-04) — aggregates runtime signals from chat-slots.json + slot-task-claim.mjs + session sidecar into a `CapabilityAttestation` per slot {slot, domain_affinity, warm_since, active_models, queue_depth, attested_at}; refreshed on every ZuluTaskAuction bid cycle; hermesDispatcher action `capability_registry_snapshot`

**Est-effort:** L (2-3 weeks — new engine + refresh lifecycle + ZuluTaskAuction integration)

**Safety:** Read-only aggregation of existing data; no side effects on slot state.

---

### C7 — Capability Attestation Engine (Outcome-Correlated Trust Scores)

**Capability:** Score each slot's domain-claim credibility by correlating soul-declared domain expertise against actual task outcome history. A slot that claims `mill` expertise but consistently produces test failures on mill tasks should have its `domain_match` bid weight discounted.

**Why high-leverage:**
- ZuluTaskAuctionEngine's `domain_match` bid component (W=4.0, highest weight) currently trusts soul YAML completely — there is no outcome feedback loop
- EvoAgent and AgentNet research (2025) identify "self-claimed vs. attested capability scores" as the principal mechanism for preventing incompetent agents from winning bids they can't fulfill
- PRISM already has the outcome record infrastructure (slot-task-claim.mjs commit confirmations, SCRUTINY_LEDGER.json, per-slot git commit log) — this adds the correlation layer

**Wire-onto:** New `ZuluCapabilityAttestationEngine` (HZD-NEW-05) — reads per-slot commit history + scrutiny ledger + slot-task-claim outcomes; emits `AttestationScore` per domain-slot pair {slot, domain, declared_affinity, empirical_success_rate, sample_n, confidence}; feeds ZuluTaskAuction as a bid modifier on `domain_match`

**Est-effort:** L (2-3 weeks — outcome correlation requires ≥20 completed tasks per slot per domain for statistical significance; early deployments advisory-only)

**Safety:** Attested scores are advisory multiplicative modifiers on `domain_match` bid weight, never a veto. ZuluFleetGovernorEngine authority hierarchy unchanged.

---

### C8 — Outcome-Based Soul Evolution (Advisory-Only)

**Capability:** Propose amendments to a slot's soul YAML `domain_filter` and `refuse_list` based on sustained patterns in task outcome history. A slot that repeatedly succeeds on `cam` tasks but fails on `lathe` tasks has empirical evidence that its declared soul should be amended.

**Why high-leverage:**
- PRISM souls are currently static YAML files — they are updated only by manual operator edits. This means the fleet's routing table can drift from reality as slots accumulate real-world expertise
- 2025 retrospective learning research: "closed-loop outcome feedback → soul/profile amendment proposals" is identified as the highest-leverage improvement for production multi-agent fleets
- CRITICALLY: this must be ADVISORY-ONLY (never auto-amend). A soul amendment that removes a `refuse_list` entry (e.g., removes "do not touch scrutiny gates") from a slot is a safety violation. All proposed amendments must be emitted as human-readable proposals routed to AGENT_CHAT for operator approval, never applied programmatically.

**Wire-onto:** New `ZuluSoulEvolutionAdvisorEngine` (HZD-NEW-06) — reads ZuluCapabilityAttestationEngine (C7 dependency) + current soul YAML; emits `SoulAmendmentProposal` {slot, proposed_change, evidence_summary, confidence, operator_approval_required: true}; writes proposals to AGENT_CHAT + `state/shared/soul-amendment-proposals.jsonl` ONLY; hermesDispatcher action `soul_evolution_proposals_list`

**Est-effort:** L (3-4 weeks — DEPENDS on C7 attestation; advisory output only; operator approval gate mandatory)

**Safety:** NEVER auto-amends soul YAML. Proposals are append-only to AGENT_CHAT and a dedicated proposals JSONL. The refuse_list entries in any soul are treated as immutable by this engine — only non-refuse domain_filter expansions/contractions are proposed. A separate operator action is required to accept any proposal.

---

## Summary Table

| # | Capability | Effort | Depends On | Key Wire Target |
|---|---|---|---|---|
| C1 | Multi-Wave DAG Scheduler | S | None | HZP01 + hermesDispatcher |
| C2 | Cross-Session Task Continuity | M | None | New HZD engine + hermesDispatcher |
| C3 | Fleet Health Synthesis | M | None | New HZD engine + ZuluTaskAuction |
| C4 | Delegation Contract Engine | M | None | New HZD + hermesDispatcher pre-gate |
| C5 | Adaptive Back-Pressure | M | C3 | New HZP + hermesDispatcher fan-out |
| C6 | Live Capability Registry | L | None (reads existing) | New HZD + ZuluTaskAuction |
| C7 | Capability Attestation | L | C6 recommended | New HZD + ZuluTaskAuction bid modifier |
| C8 | Soul Evolution Advisor | L | C7 | New HZD + AGENT_CHAT advisory only |

---

## Top-3 Recommendation (wire first)

### 1. C1 — Multi-Wave DAG Scheduler (S effort, highest parallelism leverage)
Wire immediately. HZP01 already encodes the full depends_on DAG; this is a pure completion of infrastructure already designed. Every multi-step parallel build benefits on day 1. No new data sources required. Lowest risk, highest velocity unlock.

### 2. C2 — Cross-Session Task Continuity Tracker (M effort, /compact recovery)
Wire second. Addresses the documented "mid-flight task loss on /compact" failure mode that affects every long-running parallel build. Pairs with slot-task-claim.mjs without modifying it. Prerequisite for the B-track fleet-control lift.

### 3. C3 — Fleet Health Synthesis Engine (M effort, prerequisite for NO-GO lift)
Wire third. The HERMES-CONTROL-READINESS-2026-06-01.md diagnoses the B-track NO-GO as requiring Zulu to have a live slot-health oracle. This engine is that oracle. It also powers C5 (back-pressure) and empirically grounds ZuluTaskAuction bid scoring. Without it, the fleet-control NO-GO remains, and the entire Hermes automation story is blocked.

### Defer for now
- C4 (delegation contracts) — M effort, but the B-track governance gaps in the ledger must be resolved before delegation semantics are meaningful. Wire after C2+C3.
- C5 (back-pressure) — depends on C3; wire after C3.
- C6/C7/C8 (capability registry / attestation / soul evolution) — L effort, require 20+ task outcomes per slot for statistical validity; wire after the fleet has been running multi-wave builds (C1) for 4+ weeks.

---

## Safety Checklist (all candidates)

All 8 candidates:
- [ ] Preserve ZuluFleetGovernorEngine as the authority gate — no candidate routes around it
- [ ] Preserve scrutiny-3way PASS requirement — no candidate proposes reducing the 3-of-3 gate
- [ ] Preserve R12 fail-LOUD — all candidates emit explicit error states, never silent success
- [ ] C8 soul evolution: advisory-only, never auto-amends soul YAML, refuse_list entries are immutable to this engine
- [ ] C4 delegation contracts: can only narrow authority, never widen it; granted only by ORCHESTRATOR_ROLES
- [ ] C5 back-pressure: advisory-default, never unilaterally vetoes a governor-authorized action
