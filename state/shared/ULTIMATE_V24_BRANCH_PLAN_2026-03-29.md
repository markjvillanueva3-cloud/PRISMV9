# Ultimate v24 Branch Plan — 2026-03-29

## Canonical Rule

This plan is an execution overlay for:

- `C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md`

It does not replace `v24`. It gives `v24` a single main path and four bounded side quests.

## Authority Stack

When roadmap documents disagree, use this priority order:

1. `C:\PRISM\state\shared\ROADMAP_COLLABORATION_STATE.md`
2. `C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md`
3. `C:\PRISM\state\shared\ULTIMATE_V24_BRANCH_PLAN_2026-03-29.md`
4. subordinate child roadmaps:
   - `C:\PRISM\mcp-server\data\docs\roadmap\MCP-FULL-AUTOMATION-BLUEPRINT.md`
   - `C:\PRISM\mcp-server\data\docs\roadmap\MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md`
   - `C:\PRISM\mcp-server\data\docs\roadmap\MCP-AUTOMATION-HARDENING-ROADMAP.md`
   - `C:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`
   - `C:\PRISM\mcp-server\data\docs\roadmap\TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md`
   - `C:\PRISM\mcp-server\data\docs\roadmap\MACHINE-HANDBOOK-INTELLIGENCE-ROADMAP.md`
5. reference-only historical inputs:
   - `C:\PRISM\state\shared\CONVERGENCE_PLAN_2026-03-28.md`
   - `C:\PRISM\state\shared\ROADMAP_REORGANIZED_BACKEND.md`
   - `C:\PRISM\state\shared\ROADMAP_CONVERGENCE_AUDIT_2026-03-27.md`

Non-canonical sketch:

- `C:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-PRISM-ROADMAP-v25.md`

If counts or gate state disagree, prefer `ROADMAP_COLLABORATION_STATE.md` over chat/workboard summaries.

## Inputs Used

- Codex comprehensive repo/archive/Box audit
- Claude shared `/rgs-sync` audit showing:
  - `32` fully wired pages
  - `78` orphaned backend endpoints
  - `12` fixture-only provider methods
  - critical `/quote/` vs `/quotes/` mismatch
  - `billing.ts` not mounted
- existing convergence plan
- existing resource-learning hardening roadmap

## Mathematical Governance Rule

PRISM should treat formulas, constants, scores, thresholds, and state machines as canonical system assets rather than scattered implementation detail.

Required canonical registries:

- `FormulaRegistry`
- `ConstantsAndUnitsRegistry`
- `DecisionPolicyRegistry`
- `ConstraintAndToleranceRegistry`
- `AutomationPolicyRegistry`

Every production formula or score must define:

- `formula_id`
- domain
- inputs
- units
- constants
- hard constraints
- soft constraints / penalty function
- output semantics
- target consumers
- tolerance target
- provenance
- validation suite
- promotion state

Global rules:

- no inline business, physics, or automation constants in routes, pages, or local scripts
- every ranking, recommendation, prioritization, and automation decision must expose its score equation and weights
- every optimizer must declare objective function, hard constraints, soft constraints, penalty function, and fallback behavior
- every important formula must define how actuals recalibrate it over time
- formula outputs do not count as complete until named consumers are wired and SVI coverage reflects that consumption

Core formula families that must exist across the main path and side quests:

- quoting and costing
- scheduling and dispatch
- inventory, tool life, and insert economics
- quality and tolerance risk
- simulation and capability fit
- learning promotion and contradiction handling
- automation eligibility, fallback, and override pressure
- coordination, routing, lease, and conflict risk

## SVI / Psi Math Rule

The roadmap should treat SVI/Psi as measurable formulas, not only narrative goals.

Minimum coverage equations to preserve:

- `SurfaceCoverage = weighted_live_surfaces / weighted_required_surfaces`
- `Reachability = reachable_valid_states / expected_valid_states`
- `Drift = weighted_sum(|declared_state - observed_state|)`
- `ConsumerPropagation = active_consumers_of_capability / declared_consumers_of_capability`
- `AuthorityScore = authoritative_surfaces / total_surfaces`
- `PromotionConfidence = provenance * validation * test_coverage * runtime_health * freshness`
- `CompactionSurvival = restored_critical_facts / saved_critical_facts`
- `SVI Delta = new_reachable_capabilities - new_isolated_capabilities`

Operational Psi interpretation:

- `Psi = weighted_reachability * weighted_authority * weighted_consumption * weighted_survival * weighted_observability`

If a feature is built but not consumed, Psi should not rise materially.

## Automation Governance Rule

Full automation is a roadmap goal only after initial shop setup and only when decision formulas, fallback posture, and recalibration loops are explicit.

No workflow gets live automation until it has:

1. a canonical state machine
2. a confidence formula
3. an exception formula
4. an approval threshold
5. a fallback policy
6. a recalibration path from actuals

Canonical automation-control formulas:

- `ConfidenceScore = w1(data_completeness) + w2(data_freshness) + w3(contract_health) + w4(model_agreement) + w5(validation_pass_rate)`
- `AutomationEligibility = ConfidenceScore >= threshold AND policy_ok AND required_inputs_present`
- `ExceptionSeverity = impact * urgency * probability * blast_radius`
- `ApprovalRequired = novelty + financial_risk + compliance_risk + customer_visibility >= threshold`
- `OptimizationObjective = a(margin_per_constrained_hour) + b(on_time_probability) + c(quality_confidence) - d(setup_cost) - e(schedule_disruption) - f(outsource_risk)`
- `EventRoutingPriority = severity * affected_records * downstream_dependency_count * freshness`
- `FallbackScore = reachable_contracts * complete_payload_fields * safe_default_availability`
- `RecalibrationDelta = actual - predicted`
- `HumanOverridePressure = repeated_manual_overrides / automation_attempts`

Design rule:

- do not invent bespoke formulas per page
- build a small canonical formula library and reuse it across flows

## Failure-Mode And Invariant Rule

PRISM should fail closed, not optimistically, whenever authority, confidence, or provenance is insufficient.

Required invariants:

- authoritative state invariant for `live`, `live-fallback`, `staged`, and `local-only`
- deterministic state-machine invariant for major flows:
  `RFQ -> Quote -> Order -> Job -> Program Release -> Shop Floor -> Invoice -> Service`
- fail-closed automation invariant
- idempotency and replay invariant for cross-desk events
- rollback / compensation invariant for automated mutations
- cross-desk consistency invariant
- manual override and freeze invariant
- decision explainability invariant
- freshness / provenance invariant for learned formulas and promoted knowledge

Canonical failure-mode formulas:

- `AutoActionAllowed = AuthorityScore * InputCompleteness * Freshness * Confidence * PolicyCompliance`
- `EscalationScore = Impact * SafetyRisk * FinancialRisk * ComplianceRisk * Uncertainty`
- `RetryAllowed = idempotent AND transient_failure AND retry_budget_remaining`
- `RollbackReadiness = compensation_path_exists * event_trace_complete * state_snapshot_available`
- `StateConsistency = matching_records_across_consumers / expected_records_across_consumers`
- `TransitionValidity = valid_transitions / attempted_transitions`
- `OverridePressure = manual_overrides / automation_attempts`
- `DriftRisk = |declared_state - observed_state| * affected_consumers * authority_weight`
- `FallbackSafety = reachable_safe_defaults * bounded_scope * explainability_present`
- `EventReplaySafety = idempotent_handlers / total_replayable_handlers`

Rules:

- no automated write without authoritative source-of-truth inputs
- no retry without idempotency or compensation
- no fallback that silently creates business truth
- no cross-desk mutation without audit trail and reversible state

## Propagation And Consumer Rule

No engine, route, formula, registry, learning asset, or feature should count as complete until its downstream consumers are declared and proven.

Required sections for new canonical artifacts:

- declared consumers
- authoritative source
- dependency readiness
- propagation proof
- orphan-capability review

Canonical propagation formulas:

- `ConsumerCoverage = active_consumers / declared_consumers`
- `OrphanCapabilityRate = orphan_capabilities / declared_capabilities`
- `PropagationCompleteness = verified_output_paths / required_output_paths`
- `DependencyReadiness = satisfied_dependencies / declared_dependencies`
- `AuthorityReach = authoritative_consumers / total_consumers`
- `ConsumerLag = median(days_from_producer_ready_to_consumer_wired)`
- `ProofCoverage = proven_consumer_paths / declared_consumer_paths`

Required matrices:

- `Producer-Consumer Matrix`
- `Dependency Matrix`
- `Orphan Matrix`
- `Propagation Test Matrix`

## Schema And Registry Governance Rule

Every route payload, provider contract, event, learning artifact, and formula output should have one versioned schema owner and explicit lifecycle.

Required governance artifacts:

- `SchemaRegistry`
- registry boundary rules for source registries, derived registries, cached views, and frontend projection models
- provenance contract
- freshness / TTL policy
- schema drift gate
- validation ladder
- registry lifecycle rules
- formula promotion rules
- learning artifact governance

Canonical schema-quality formulas:

- `DataQualityScore = 0.30*completeness + 0.25*validity + 0.20*consistency + 0.15*unit_integrity + 0.10*dedupe_integrity`
- `ProvenanceScore = 0.35*source_authority + 0.25*traceability + 0.20*transformation_auditability + 0.20*citation_coverage`
- `FreshnessScore = max(0, 1 - age / ttl)`
- `DriftScore = 0.40*schema_diff + 0.25*consumer_break_rate + 0.20*value_distribution_shift + 0.15*formula_output_shift`
- `RegistryTrustScore = 0.30*DataQualityScore + 0.25*ProvenanceScore + 0.20*FreshnessScore + 0.25*(1-DriftScore)`
- `ContractParityScore = matched_fields / required_fields`
- `AutomationReadinessScore = 0.25*RegistryTrustScore + 0.20*state_machine_coverage + 0.20*exception_path_coverage + 0.20*fallback_coverage + 0.15*consumer_propagation`
- `LearningPromotionScore = 0.30*ProvenanceScore + 0.25*repeatability + 0.20*cross_source_agreement + 0.15*domain_relevance + 0.10*consumer_validation_pass_rate`
- `VersionDisciplineScore = versioned_assets / total_canonical_assets`

Hard gates:

- no automation if `RegistryTrustScore < 0.85`
- no canonical formula promotion if `LearningPromotionScore < 0.80`
- no backend/frontend convergence closure if `ContractParityScore < 1.00` on required fields
- no realtime fanout authority if `FreshnessScore < 0.90` for operational registries

## Proof Stack Rule

PRISM should prove capability in layers, not with one vague test bucket.

Required proof ladder:

1. smoke
2. mounted chain
3. mutation / event propagation
4. simulation fidelity
5. business-scenario proof

Canonical proof formulas:

- `SmokeCoverage = passed_smoke_actions / required_smoke_actions`
- `ChainCoverage = green_mounted_chains / required_mounted_chains`
- `ScenarioCoverage = covered_scenarios / required_scenarios`
- `SimulationFidelity = validated_model_outputs / required_model_outputs`
- `EventPropagationScore = correctly_updated_desks / expected_updated_desks`
- `ProofReadiness = SmokeCoverage * ChainCoverage * EventPropagationScore * ObservabilityScore * RollbackReadiness`
- `BusinessScenarioReadiness = workflow_reachability * record_continuity * authority_score * simulation_fidelity * auditability`
- `BenchmarkConfidence = weighted_passed_benchmarks / weighted_required_benchmarks`

Proof rule:

- no business-scenario simulation or production-grade automation claim until the target workflow has passed the proof ladder in order

## Business Autonomy Rule

PRISM should not claim business-system autonomy until quote, finance, compliance, and service policies are explicit.

Required policy sections:

- quote-to-cash decision policy
- financial authority and reconciliation
- legal/compliance state machine
- automated customer-service policy
- customer trust / business trust gate
- business exception ledger
- post-setup autonomy policy

Canonical business formulas:

- `QuoteReleaseScore = margin_confidence * routing_confidence * schedule_confidence * quality_confidence * contract_health`
- `MarginRisk = target_margin - projected_margin`
- `LedgerIntegrity = matched_business_events / expected_business_events`
- `CostDrift = |actual_cost - estimated_cost| / estimated_cost`
- `ComplianceReady = required_acknowledgements * retention_state * legal_review_state * cert_traceability`
- `ServiceAutoRespond = intent_confidence * record_link_confidence * policy_match * freshness`
- `SLASeverity = customer_tier * delay_duration * affected_revenue * shipment_or_quality_impact`
- `CasePriority = severity * customer_visibility * downstream_dependency_count * recurrence`
- `InvoiceReady = shipment_or_completion_truth * approved_pricing * tax_policy_ok * dispute_state_clear`
- `BusinessTrust = financial_integrity * compliance_integrity * service_reliability * quote_accuracy * customer_record_continuity`

## Recent-Plan Merge Rules

Recent docs from `2026-03-27` through `2026-03-29` should sharpen this branch plan, but they should not become parallel authorities.

Reference by merge, not repetition:

- `C:\PRISM\state\shared\COMPREHENSIVE_CONVERGENCE_AUDIT_2026-03-29.md`
- `C:\PRISM\state\shared\ROADMAP_CONVERGENCE_AUDIT_2026-03-27.md`
- `C:\PRISM\state\shared\CONVERGENCE_PLAN_2026-03-28.md`
- `C:\PRISM\state\shared\ROADMAP_REORGANIZED_BACKEND.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\MACHINE-HANDBOOK-INTELLIGENCE-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

Non-canonical duplicate by structure only:

- `C:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-PRISM-ROADMAP-v25.md`

Rule:

- `v25` is a planning sketch that may contribute structure or wording, but it must not outrank this branch plan or `v24`.
- `v25` has been reviewed and absorbed for tactical session structure; its `M-0..M-5` and `SQ1..SQ4` phrasing may be used as shorthand, but canonical authority remains `ROADMAP_COLLABORATION_STATE.md` -> `v24` -> this branch plan -> child roadmaps.
- `MCP-AUTOMATION-HARDENING-ROADMAP.md` is a valid Side Quest `A` child roadmap and should be treated as absorbed tactical detail, not as a separate roadmap root.
- convergence audits and backend/frontend reorganization docs are execution references, not parallel roadmap roots
- tribal, handbook, and resource-learning docs remain child tracks under Side Quests `B` and `C`, not new master branches

## Branch Model

### Main Path — True Path

This is the priority branch. It is the only branch that decides when PRISM is ready for business-scenario simulation.

#### MP-0 — Contract Surface Repair

Purpose:

- remove the remaining route and mount mismatches that prevent honest convergence

Core work:

- fix `/quote/` vs `/quotes/` path mismatch
- mount `billing.ts`
- reduce the highest-impact orphaned endpoint groups
- eliminate the most important fixture-only provider methods
- refresh backend status reporting so it is a reliable source again
- bootstrap math governance:
  - canonical formula registry
  - constants/unit registry
  - scoring/constraint schema
  - validation-tolerance schema
  - consumer-mapping schema
 - bootstrap failure-mode, schema, and proof governance:
   - declared state machines for target flows
   - fail-closed rules for `live/live-fallback/staged/local-only`
   - schema registry and provenance policy
   - drift and freshness gate
   - consumer matrix and propagation proof requirements
   - proof ladder for smoke, chain, event, simulation, and business-scenario readiness

Exit gate:

- active frontend desks point at mounted, reachable backend paths
- top-priority API mismatches are gone
- staged/fallback posture is accurate, not accidental
- canonical route map is published
- route-mount audit is green
- quote, billing, messages, hotJobs, and inventory-custody contract tests are green
- provider-surface status matches reality
- `RouteParityScore = mounted_expected_routes / expected_routes = 1.0`
- `ContractParityScore = passing_contract_tests / required_contract_tests = 1.0`
- `SchemaRegistry`, `ConstantsAndUnitsRegistry`, `FormulaRegistry`, `ProvenancePolicy`, and `DriftAndFreshnessGate` exist as real artifacts
- repaired surfaces have declared consumers, at least one authoritative consumer, and one propagation proof test
- target flows have declared state machines, fail-closed rules, retry/idempotency policy, and rollback/compensation policy

#### MP-1A — Frontline Operating Convergence

Purpose:

- finish the execution-critical operating flows that the rest of the platform depends on

Core work:

- shell bootstrap and employee shell truth
- jobs and scheduling authority
- Program Release packet and workspace authority
- shop floor execution truth
- inventory intake and receiving truth

Exit gate:

- no dead buttons on the target frontline desks
- every target desk is either `live` or honest `live-fallback`
- mounted continuity tests are green for:
  `Customer/RFQ -> Quote -> Print to CNC -> Jobs -> Shop Floor -> Messages`
- no target frontline flow still depends on accidental local-only authority
- `FrontlineCoverage >= 0.95`
- `DeadButtonRate = 0`
- `WorkflowReachability(Customers->Quote->Release->Jobs->ShopFloor->Messages) = 1.0`
- frontline flows use canonical formulas, constants, and tolerance contracts rather than page-local math
- `ConsumerCoverage > 0` and `ProofCoverage > 0` for every frontline artifact marked complete

#### MP-1B — Commercial And Business Convergence

Purpose:

- finish the commercial, service, and business flows after the frontline operating spine is materially stable

Core work:

- `messages`
- `hotJobs`
- parts/files/revision lineage for `Program Release`
- portal, milestones, and service-case continuity
- quote, billing, invoice, GL, customer portal, and customer-service continuity
- legal/compliance operating surfaces

Exit gate:

- quote, billing, invoice, GL, portal, customer-service, and legal flows mount end to end
- no staged-only actions remain on pages intended for the smoke-testing pass
- no critical active business workflow depends on fake local authority
- `CommercialCoverage >= 0.90`
- `StagedActionRate on smoke-test pages = 0`
- `RecordContinuityScore = preserved_record_links / expected_record_links >= 0.95`
- automation-control formulas are declared before deeper autonomous behavior is enabled
- quote-to-cash, compliance, and service policies exist before business-facing automation expands

#### MP-2 — Realtime And Cross-Desk State

Purpose:

- make mutations visible across all relevant desks without refresh-driven drift

Core work:

- websocket room model
- authoritative event sources for:
  - `messages`
  - `hotJobs`
  - inventory receipt / checkout / insert-index events
  - Program Release / revision changes
- event fanout for jobs, scheduling, shop floor, messages, hot jobs, service cases, and shell counts
- cross-desk refresh guarantees

Exit gate:

- changes propagate across the operating system in near-real time
- shell counts and workflow state agree across desks
- one-event-to-many-desk consistency checks are green for:
  - hot-job promotion
  - message/thread updates
  - inventory receipt/check-out/index events
  - release/revision changes
- `EventConsistency = desks_updated_correctly / desks_expected_to_update >= 0.95`
- `EventReplaySafety = idempotent_handlers / total_replayable_handlers = 1.0` for target realtime handlers

#### MP-3 — Business Operating Completeness

Purpose:

- close the business-platform loops required for realistic end-to-end operation

Core work:

- accounting close-cycle convergence
- legal/compliance operating layer
- automated customer service
- quote-to-machining decision spine closure
- quote/order/job/invoice/quality/service continuity

Exit gate:

- PRISM can represent a real running shop/business flow without isolated admin islands
- this phase should not begin until `MP-1A` is materially stable
- actuals recalibrate quote, schedule, tooling, and automation thresholds through named formulas
- `BusinessTrust` is high enough to justify expanded business automation for the target workflow family

#### MP-4 — Simulation Readiness Gate

Purpose:

- decide when the system is ready for user-supplied business-scenario simulation

Simulation should begin only when:

- the targeted scenario has passed `MP-0` through `MP-3` for its dependency chain
- critical staged seams are closed for the scenario family
- route/mount mismatches are resolved for that flow
- realtime/event posture is stable enough to trust state transitions
- quoting, operations, finance, and customer-service records stay attached end to end
- failure posture, auditability, and rollback/retry behavior are visible
- the target flow's formulas, constants, and tolerances are registered and validated
- the target flow has passed the proof ladder: smoke, chain, event propagation, simulation fidelity, and rollback/auditability checks

This is the point where the user should provide live simulation scenarios.

### Pre-Simulation Smoke Lane — Allowed Before MP-4

Purpose:

- support the user's near-term button and system checks without pretending the full business-scenario gate has already been reached

Scope:

- page reachability
- primary-button clickability
- form submission posture
- loading, empty, and error state visibility
- launcher-to-origin continuity across major desks

Rule:

- this smoke lane may run while the finish-first gate is active
- findings from this lane feed `MP-0` through `MP-3`; they do not create a new roadmap fork
- full business-scenario simulation still waits for `MP-4`

## Side Quest A — Auto Generation + Auto Wiring

Canonical child roadmap:

- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-FULL-AUTOMATION-BLUEPRINT.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-AUTOMATION-HARDENING-ROADMAP.md`

Purpose:

- generate and wire new capability faster without creating disconnected systems

Phases:

1. `AG-0 Registry + Contract Map`
   - index hooks, scripts, skills, routes, provider seams, shell catalogs, page entry points, and test attachment points
   - index specialist-agent roles, role labels, parent/child relationships, and shared chat/workboard persistence fields
   - index canonical formulas, constants, tolerance contracts, decision policies, and automation policies
2. `AG-1 Feature Scaffold Generator`
   - generate draft packages for engine, route/dispatcher, API client, provider contract, frontend entry, tests, and docs
   - generate formula, decision, and constraint stubs tied to the same feature package
3. `AG-2 Auto-Hook + Auto-Wiring Layer`
   - propose wiring into command bridge, shared indexes, provider surface status, shell navigation, route fallback surfaces, and tests
   - support write-through mirroring into shared coordination files and optional external chat adapters
4. `AG-3 Frontend/Backend Integration Templates`
   - generate route -> client -> provider -> page templates and route -> liveProvider -> staged fallback -> notice templates
5. `AG-4 Promotion + Observability`
   - promote only after tests, schema validation, index sync, and SVI coverage update
6. `AG-5 Specialist Registry + Orchestration Math`
   - persistent specialist-role registry
   - task priority, specialist routing, lease TTL, conflict risk, and communication-topology formulas
7. `AG-6 Conflict Arbitration + Shared Write Leasing`
   - shared RPS arbitration for duplicate shared blockers
   - lease-aware temporary priority ownership
   - canonical logging of arbitration outcomes into shared state
8. `AG-7 Code Entry Reaction Pipeline`
   - detect new code immediately
   - classify artifacts
   - generate improvement packs
   - block unsafe promotion until proof is complete

Safeguards:

- registry-first
- dry-run by default
- human approval gates for route creation, hook activation, frontend mounting, and formula/algorithm promotion
- review gate before auto-wiring reaches production surfaces
- contract drift checks
- SVI coverage update hooks
- rollback metadata for every generated feature
- no hidden route/page generation without explicit registration
- no silent auto-promotion for legal, accounting, pricing, or customer-facing logic
- no production route wiring, canonical model changes, schema changes, or UI defaults while the active main-path blocker would be slowed
- no external Slack/Discord adapter may become the source of truth for agent state or roadmap state
- no formula, automation policy, or orchestration policy promotes without owner acceptance and a defined integration target
- no conflict-arbitration result may override explicit user direction or an active queue claim
- no artifact may be treated as complete merely because code exists; it must pass the finite-resolution states through registered, wired, proved, and promoted

Start rule:

- allowed now as spec, generator, registry, and hook work
- must not compete with main-path blocker closure

## Side Quest B — PDF / Video / Handbook Learning

Canonical child roadmaps:

- `C:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\MACHINE-HANDBOOK-INTELLIGENCE-ROADMAP.md`

Purpose:

- turn resource corpora into validated, normalized, production-consumed knowledge

Core outcomes:

- unified `pdf-learn`, `video-learn`, `handbook-learn`
- normalized extraction outputs
- formula and algorithm candidate promotion
- explainable learning consumers in live product surfaces
- federated learning with shop-local privacy

Phases:

1. `LR-1 Canonical Resource Registry`
2. `LR-2 Unified Ingestion Contract`
3. `LR-3 Promotion Pipeline`
4. `LR-4 Consumer Wiring`
5. `LR-5 Cross-Shop Learning`

Validation rules:

- no direct raw-extraction-to-production promotion
- every promoted item needs provenance, confidence, reviewer acceptance, and a source excerpt/frame reference
- contradictory sources remain unresolved until reviewed
- promoted outputs do not become canonical until a named main-path owner accepts the integration target
- promoted formula and algorithm candidates must include explicit consumer mappings and tolerance/rollback posture

Start rule:

- audit/registry/spec work now
- heavy rollout after main-path blockers are under control

## Side Quest C — Database And Corpus Hardening

Purpose:

- improve the system’s canonical technical databases and test assets

Core domains:

- machines
- tooling
- tool holders
- workholding
- manufacturer catalogs
- materials
- CAD files
- simulation/test assets

Core outcomes:

- canonical registries
- deduplication
- provenance tracking
- validation suites
- consumer mappings into quoting, setup, simulation, alarms, PPG, and learning

Special emphasis:

- machine-model, holder-model, part-model, and fixture-catalog assets from archive/Box should become active simulation and capability-test inputs rather than dead storage

Phases:

1. `DB-1 Asset Census`
2. `DB-2 Schema Normalization`
3. `DB-3 Compatibility And Completeness Scoring`
4. `DB-4 Simulation/Test Activation`
5. `DB-5 Catalog-To-Workflow Wiring`

Validation rules:

- no asset enters canonical registries without source, revision/hash, compatibility tags, and provenance
- CAD/simulation assets must be tagged `reference only`, `test-ready`, or `production-validated`
- compatibility relationships fail closed when critical data is missing
- canonical schema changes remain blocked until they do not slow active main-path closure

## Side Quest D — Business Platform Hardening

Purpose:

- deepen the business side beyond basic convergence so PRISM can run a shop as a business system, not just an operations shell

Core domains:

- ERP
- quoting
- cost efficiency
- accounting
- legal/compliance
- automated customer service

Core outcomes:

- better close-cycle truth
- cost-efficiency and quote calibration loops
- legal acknowledgements and retention posture
- SLA/escalation/service workflows
- tighter customer-history continuity across quotes, jobs, invoices, and quality

Phases:

1. `BP-0 Route Parity And Mount Fixes`
2. `BP-1 ERP And Quote-To-Cash Spine`
3. `BP-2 Cost Efficiency And Actual-Cost Authority`
4. `BP-3 Accounting Close-Cycle And Finance Hardening`
5. `BP-4 Legal And Compliance Operations`
6. `BP-5 Automated Customer Service`
7. `BP-6 Business Simulation Gate`

Exit gate:

- a single customer issue or RFQ can travel through
  `CRM -> Quote -> Order/Job -> Program Release -> Inventory/Purchasing -> Invoice -> Customer Service -> GL/Financial Analysis`
  without losing record identity, legal state, or cost truth

## Branch Sequencing Rules

1. The main path always wins priority.
2. A side quest is allowed only if it does not slow the current main-path blocker closure.
3. Side quests should feed the main path, not fork authority away from it.
4. Any side quest that produces production-consumed capability must register SVI/Psi impact explicitly.
5. No side quest should invent frontend-only business authority or backend-only dark features that the rest of the system cannot see.
6. No side-quest output becomes canonical until a named main-path owner accepts it and a concrete integration point is assigned.
7. No side quest may add new canonical formulas, schemas, or automation defaults until `MP-0` route/contract parity is mathematically green.
8. No roadmap item should move past `implemented` until it has a consumer-matrix row, at least one authoritative consumer, and one propagation proof test.

## Multi-Terminal And Specialist-Agent Coordination Rule

This branch plan must remain executable by:

- multiple Claude Code terminals
- multiple Codex terminals
- named specialist agents launched under either family

Canonical shared state remains:

- `C:\PRISM\state\shared\TASK_QUEUE.json`
- `C:\PRISM\state\shared\AGENT_WORKBOARD.json`
- `C:\PRISM\state\shared\AGENT_CHAT.jsonl`
- `C:\PRISM\state\shared\ROADMAP_COLLABORATION_STATE.json`
- `C:\PRISM\state\shared\SUBAGENT_ACTIVITY.jsonl`

Every spawned or specialist agent should preserve:

- `role_name`
- `agent_family`
- `agent_instance`
- `parent_instance`
- `lane`
- `task_id` when applicable

If the role name is missing, that is a system-quality gap and should be treated as hardening work under Side Quest `A`, not ignored.

Additional coordination rules:

- task claims and heartbeat leases should be mandatory for all agent writes into roadmap/chat/workboard state
- specialist-role reuse should be registry-driven, not purely session-local
- the current specialist inventory in `C:\PRISM\.claude\agents` and `.swarm` should seed a persistent role registry rather than be rebuilt from scratch
- `AGENT_WORKBOARD.md` should not be used for participant totals until its generator matches `ROADMAP_COLLABORATION_STATE.md`
- `SUBAGENT_ACTIVITY.md` showing `spawned unknown` should be treated as a role-persistence hardening gap
- duplicate shared-blocker collisions should use the shared RPS helper and write the result to canonical shared state rather than being negotiated only in ephemeral chat

Canonical coordination formulas:

- `PriorityScore = w1*DependencyUnlock + w2*UserImpact + w3*SVIGain + w4*RiskReduction + w5*Readiness - w6*Effort - w7*ConflictRisk`
- `RouteScore(role, task) = CapabilityMatch * Confidence * Freshness * Availability * ContextFit * (1 - ConflictRisk)`
- `ReuseScore = PastSuccessRate * OutputQuality * RecencyFactor * PromptStability`
- `LeaseTTL = BaseTTL + α*EstimatedTaskSpan + β*ObservedToolLatency - γ*AgentFailureRate`
- stale lease when `now - last_heartbeat > LeaseTTL`
- `ConflictRisk = overlap(files, routes, schemas, tasks) * active_writers * authority_weight`
- `CoordCoverage = weighted_fraction(roles_registered, tasks_claimed, lanes_synced, outputs_announced, tests_attached, provenance_preserved)`
- `ChannelScore = AuthorityWeight + MachineReadability + Replayability + LatencyFit - NoiseCost`
- `AutomationReadiness = InputCompleteness * RuleCoverage * Confidence * Observability * RollbackSafety`
- `Promote = Confidence >= threshold AND OwnerAccepted = true AND IntegrationPointAssigned = true AND DriftRisk <= limit`

Recommended specialist registry fields:

- `role_id`
- `display_name`
- `purpose`
- `family_scope`
- `canonical_prompt_spec`
- `preferred_model_tier`
- `input_contract`
- `output_contract`
- `required_context_surfaces`
- `coordination_channel`
- `auto_announce`
- `reuse_policy`
- `past_success_rate`
- `confidence_score`
- `freshness_score`
- `conflict_scope`
- `default_lease_ttl`
- `last_validated`
- `owner_lane`
- `promotion_gate`

## External Chat Adapter Rule

Slack, Discord, or similar chat buses may be used for:

- mirrored status visibility
- notifications
- lightweight interaction by other model terminals or humans

They should not be used as canonical truth for:

- task ownership
- roadmap gate state
- workboard state
- subagent identity

If external chat is enabled, it should mirror from the canonical PRISM shared files and, when write-back is allowed, write through the same shared helpers rather than bypassing them.

## Tomorrow Testing Rule

Tomorrow's testing should be a smoke pass first, not a full business-scenario simulation.

Smoke-test first:

1. launch and shell sanity
   - app loads
   - login/gateway opens
   - shell navigation works
   - desk routes open without crashes
   - global search, counts, and main action buttons respond
2. core operational click-through
   - `Customers -> Quote Builder -> Program Release -> Jobs -> Shop Floor -> Messages`
   - buttons, tabs, modals, and downstream handoffs respond
   - record context stays attached
3. secondary desk smoke
   - `Inventory`, `Purchasing`, `Scheduling`, `Employee Portal`, `Alarm`, `Capture Ops`, `PPG`, `Learning`, `Dashboard`
4. finance/admin smoke
   - `Invoices`, `General Ledger`, `Financial Analysis`, `Payroll`, `Order Tracking`, `Exports`

Do not hard-fail the smoke pass for intentionally staged areas if they show clear staged/fallback messaging and the UI remains coherent:

- `messages` mailbox delivery and reply authority
- `hotJobs` backend authority and realtime fanout
- deeper `Program Release` file/revision lineage
- full inventory custody, insert indexing, and tool checkout authority
- billing and commerce actions beyond status posture
- cross-shop learning propagation and resource-promotion outputs
- advanced machine-live and knowledge-ext surfaces that are present but not yet authoritative

## Highest-Risk Blockers Right Now

1. `/quote/` vs `/quotes/` mismatch
2. `billing.ts` not mounted
3. `messages` and `hotJobs` still lacking live backend authority
4. parts/files/revision lineage not yet acting as the canonical Program Release spine
5. inventory custody and insert/tool lifecycle still partly staged

## SVI Impact

This branch model is designed to raise SVI/Psi by making sure:

- main-path capability closes real operational gaps first
- side quests generate reusable system leverage
- stranded archive/Box knowledge becomes active product capability
- new features auto-register into the rest of the platform instead of becoming isolated islands
