# CAMX RESTRUCTURED ROADMAP v24 — Optimal Compaction Boundaries + Tool Integration
## Every session boundary designed for maximum context quality
## Skills, hooks, and scripts annotated at every step where beneficial

Generated: 2026-03-23 | Based on: CAMX-CONSOLIDATED-ROADMAP-v20.md (v17+v18+v19+v20 merged)
Restructured for: Compaction-optimized execution with tool annotations
**SCRUTINIZED: 2026-03-24 by 23 specialist agents across 3 rounds**
  Round 1 (3 agents): machinist + physicist + architect → 87 findings
  Round 2 (10 agents): 10 specialist roles → ~200 findings, CRITICAL fixes applied
  Round 3 (10 agents): 10 specialist roles → 73 findings (63% reduction), convergence confirmed
    - 6/10 agents declared their domain "clean" or "ready to execute"
    - Remaining findings are internal consistency + WORK block specification
  Live bugs fixed: MonteCarlo.ts Sobol sort bug, Ti kc1.1 test data, plunge milling formula
  Sessions added: 3-EXT-THERM, 3-EXT-PROBE, 3-EXT-PPAP, 3-EXT-GCODE, 4-3 (lights-out)
  Total pre-Phase-5 sessions: ~76 | Phase 5 ERP Hardening: 10 sessions | Phase 6 Backend Platform: 10 sessions | Total estimated with Phases 5-12: ~220+

**MANUFACTURING SOFTWARE DATA BASELINE (extracted 2026-03-25):**
  HSMAdvisor (22 machines + tool library), GWizard (59 machines), hyperMILL (tools + materials + ISO fits),
  Fusion 360 (651 CPS posts). Use as validation baseline — PRISM should meet-or-exceed these tools.
  Data location: H:/prism/mcp-server/src/data/ (hsm-advisor-*.json, gwizard-*.json, hypermill-*.json)

---

## ULT Merge Overlay (2026-03-27)

This roadmap remains the single canonical plan for PRISM. The Ultimate Shop OS roadmap is now a subordinate execution overlay for the connected-shop business/frontend track, not a competing roadmap.

Execution ownership is intentionally split:

- Claude owns backend implementation: persistence, routes, event fanout, websocket/live state, ERP/accounting sync, and production contracts.
- Codex owns frontend implementation: provider seams, typed adapter contracts, role-aware shells, workflow primitives, desk convergence, loading/error states, and contract-ready UI integration.

Frontend execution order for the merged track is now:

1. Merge roadmap and handoff intent into v24-facing docs.
2. Build frontend API/provider seams and shared domain/view-model adapters in the web app.
3. Refactor key desks (`Jobs`, `Scheduling`, `Shop Floor Clock`, shell search/counts) to consume those seams.
4. Build the role-aware employee shell on backend-shaped bootstrap claims.
5. Swap fixture providers for Claude-owned live payloads incrementally as backend contracts land.

Guardrails for this overlay:

- v24 remains canonical; ULT is detail, not authority.
- Codex should not implement backend routes, persistence engines, or final server contracts while Claude owns backend.
- Frontend should keep backend contract notes at the provider/type layer rather than scattering new assumptions through page components.
- Viewer-performance work, calculator parity, and shell visual polish remain secondary unless they block the connected shop workflow spine.

### Universal Print/CAD Intake Anchor (2026-03-27)

The universal "Print to CNC" plan plugs into the canonical roadmap here:

- `Session 6-2` owns the backend spine for file upload, CAD storage, attachments, and the parts library.
- `Session 6-3` owns instant quote generation, revision posture, and quote-share linkage for that same intake packet.
- `Session 6-4` owns DFM, GD&T, and manufacturability review on top of the stored geometry and drawing packet.
- `Session 5-9` remains the deeper QuoteToShip validation gate once the intake packet can drive a full routed program, setup sheet, and quote.

Frontend execution should therefore use a provider-backed universal intake desk now:

- one dropbox that accepts any file type and every CAD family without blocking the operator on extension support
- one PRISM-native design-entry lane for users who need to start the design brief inside PRISM
- one release workspace that keeps machine, holder, tooling, fixture, stock, setup-sheet, collision, simulation, and quote posture visible before Claude's live backend contracts land

### Tribal Knowledge Propagation Overlay (2026-03-27)

The next canonical knowledge-system overlay is:

- `H:/prism/mcp-server/data/docs/roadmap/TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md`

This overlay exists to solve one specific gap: PRISM already has tribal tips, playbook rules, formulas, learned shop signals, and machine-domain intelligence, but those assets are not yet guaranteed to propagate into every relevant consumer and pipeline.

The canonical rule is now:

- no tribal machining knowledge should remain trapped in one engine, one page, one shop, or one terminal
- all meaningful learned machining data should normalize once, route through canonical contracts, and reach all relevant consumers
- new tribal-knowledge capabilities should follow forge-triple discipline where relevant: engine/pipeline + MCP action + skill/slash surface + protective hook

Execution timing:

- design and audit work can begin immediately
- full execution should follow the current backend/frontend convergence tranche instead of interrupting it

### Quote-to-Machining Decision Pipeline Overlay (2026-03-28)

The full RFQ-to-machining-decision flow is now merged into the canonical `v24` + `ULT` Track A build. It does not create a competing roadmap. It defines how document intake, quoting, process planning, program release, inventory, and actuals feedback must converge into one operating-system pipeline.

Canonical stages:

1. RFQ + document + CAD intake
2. requirements extraction and manufacturability fit
3. shop-capability match by machine, axis count, material, tolerance, finish, inspection, and schedule
4. in-house process-plan generation: machine, holder, tooling, workholding, stock, setup count, and operation order
5. CAM / strategy / parameter planning: toolpath family, holder-tool compatibility, speeds, feeds, DOC, WOC, prove-out posture
6. full burdened costing: material, tooling consumption, fixtures, setup, runtime, inspection, certs, utilities, rent, overhead, maintenance, scrap reserve, and logistics
7. outsource compare: supplier fit, margin dollars, margin per constrained hour, risk posture, and strategic fit
8. quote / price strategy / release handoff
9. actuals feedback loop from labor, quantity, inserts, tooling, scrap, delays, and inspection back into the next quote

Ownership until convergence remains explicit:

- Claude owns backend orchestration, compatibility logic, costing and outsource engines, canonical contracts, persistence, and event fanout.
- Codex owns frontend RFQ intake UX, price-strategy explainability, route / scenario / release review surfaces, loading and error posture, and simulation-driven hardening against live backend behavior.

Execution rule:

- do not fork a separate quote-engine roadmap
- do not let frontend pages invent final backend decision logic in parallel
- do wire every relevant frontend desk so it can consume this pipeline the moment live contracts land
- once the remaining planned frontend queue is complete, Codex continues frontend hardening plus simulation-style walkthroughs against Claude's live backend to expose gaps before formal testing

### Accounting, Legal, and Automated Customer Service Clarification (2026-03-28)

The active repo and archive audit show three different states that the roadmap now needs to reflect accurately:

- accounting is not hypothetical anymore; core accounting/finance engines, routes, and web surfaces already exist in the active tree
- legal/compliance exists only partially through compliance, HR, quality, and standards infrastructure; it is not yet a full legal operations system
- customer service exists only partially through CRM, messages, and the token-based customer portal; it is not yet a fully automated customer-service platform

Canonical roadmap rule:

- accounting/finance remains inside the active Phase 5 + Phase 6 convergence stack and should not be treated as a post-MVP side system
- legal/compliance closure must be added to the same canonical business-platform track so audit, retention, approvals, and customer-facing documents do not remain half-built
- automated customer service must extend the existing customer portal, CRM, messaging, and milestone flows into a full service pipeline rather than a collection of isolated features

Minimum required end-state for this clarification:

1. accounting close-cycle convergence
   - GL, invoicing, payroll, exports, financial analysis, purchasing/AP, and quote-to-cash signals all read from the same persisted business state
2. legal/compliance operating layer
   - contract and terms tracking
   - NDA / customer requirement acknowledgement
   - document retention and audit holds
   - regulatory/certification packet traceability
   - legal-review-required workflow gates where compliance engines already flag them
3. automated customer service system
   - omni-channel intake from portal, email, messages, and status-triggered events
   - automatic case/ticket creation tied to quote, order, invoice, job, shipment, or quality record
   - SLA / escalation routing
   - templated and AI-assisted responses
   - self-service customer status, documents, and follow-up history
   - full linkage back into CRM, milestones, quality documents, and accounting state

### Comprehensive Convergence Audit + Resource Learning Hardening Overlay (2026-03-29)

The active repo, archive mirror, and Box mirror were audited together on `2026-03-29`. That audit is recorded in:

- `H:\prism\state\shared\COMPREHENSIVE_CONVERGENCE_AUDIT_2026-03-29.md`

Key findings now folded into the canonical roadmap:

- the active repo already has a very large execution surface:
  - `1283` backend engines
  - `57` backend route files
  - `51` frontend page surfaces
- major operating-system desks are already live-backed:
  - shell bootstrap
  - employee shell bootstrap
  - desk counts
  - global search
  - Jobs
  - Scheduling
  - Program Release
  - Shop Floor
- major backend features still remain underused by the rebuilt frontend:
  - customer portal and service-state linkage
  - compliance/legal operating routes
  - parts/files/revision lineage
  - quote revision/share/history
  - deeper simulation, handbook, PDF, video, formula, and algorithm engines
- staged or only partially converged seams still include:
  - `messages`
  - `hotJobs`
  - deeper `programRelease` lineage
  - `inventoryOperations` custody and insert/tool lifecycle
  - `commerce` beyond billing posture
  - cross-shop learning propagation

The audit also created one new subordinate side-roadmap:

- `H:\prism\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

This side-roadmap governs:

- `pdf-learn`
- `video-learn`
- `handbook-learn`
- course and catalog ingestion
- formula and algorithm promotion
- skills / hooks / scripts generated from validated resource knowledge
- simulation-asset activation from archive and Box machine/holder/part/workholding corpora

Execution rule:

- this overlay is allowed to begin immediately as audit, registry, extraction-normalization, and spec work
- heavy rollout should follow the current finish-first gate instead of interrupting the active convergence tranche
- archive and Box recoveries should feed `v24` and existing subordinate overlays, not create a second master roadmap

### Main Path + Side Quest Branch Model (2026-03-29)

Canonical supporting plan:

- `H:\prism\state\shared\ULTIMATE_V24_BRANCH_PLAN_2026-03-29.md`

This branch model turns `v24` into one full ultimate roadmap with one true path and bounded hardening side quests.

### Mathematical Governance Overlay (2026-03-29)

The scrutiny pass added one more canonical rule:

- formulas, constants, thresholds, scores, constraints, and state machines must become first-class platform assets rather than scattered implementation detail

Required canonical registries:

- `FormulaRegistry`
- `ConstantsAndUnitsRegistry`
- `DecisionPolicyRegistry`
- `ConstraintAndToleranceRegistry`
- `AutomationPolicyRegistry`

Global rules:

- no inline business, physics, or automation constants in routes, pages, or local scripts
- every ranking, recommendation, prioritization, and automation decision must expose its score equation and weights
- every optimizer must declare objective function, hard constraints, soft constraints, penalty function, and fallback behavior
- every important formula must define how actuals recalibrate it over time
- formula outputs do not count as complete until named consumers are wired and SVI coverage reflects that consumption

Minimum SVI/Psi equations to preserve:

- `SurfaceCoverage = weighted_live_surfaces / weighted_required_surfaces`
- `Reachability = reachable_valid_states / expected_valid_states`
- `Drift = weighted_sum(|declared_state - observed_state|)`
- `ConsumerPropagation = active_consumers_of_capability / declared_consumers_of_capability`
- `AuthorityScore = authoritative_surfaces / total_surfaces`
- `PromotionConfidence = provenance * validation * test_coverage * runtime_health * freshness`
- `SVI Delta = new_reachable_capabilities - new_isolated_capabilities`
- `Psi = weighted_reachability * weighted_authority * weighted_consumption * weighted_survival * weighted_observability`

Automation rule:

- no workflow gets live automation until it has a canonical state machine, confidence formula, exception formula, approval threshold, fallback policy, and recalibration path from actuals

### Hardening Overlay (2026-03-29)

The five-loop hardening pass adds five more canonical rules:

1. failure-mode governance
   - authoritative state invariants for `live`, `live-fallback`, `staged`, and `local-only`
   - deterministic state machines
   - fail-closed automation
   - idempotency and replay policy
   - rollback / compensation policy
2. propagation governance
   - declared consumers
   - consumer matrix
   - orphan-capability review
   - propagation proof
3. schema and registry governance
   - canonical schema registry
   - provenance contract
   - freshness / TTL policy
   - drift gate
   - validation ladder
4. layered proof governance
   - `smoke -> mounted chain -> mutation/event propagation -> simulation fidelity -> business-scenario proof`
5. business autonomy governance
   - quote-to-cash decision policy
   - financial reconciliation
   - legal/compliance state machine
   - automated customer-service policy
   - business trust gate

#### Main Path — True Path

The only branch that decides when PRISM is ready for user-supplied business-scenario simulation is:

1. `MP-0 Contract Surface Repair`
   - fix route and mount mismatches
   - remove the highest-impact orphaned endpoint blockers
   - make fallback posture explicit rather than accidental
   - bootstrap math governance: canonical formula registry, constants/unit registry, scoring/constraint schema, validation-tolerance schema, and consumer-mapping schema
   - bootstrap failure-mode, schema, propagation, and proof governance for the target flows
2. `MP-1A Frontline Operating Convergence`
   - close the execution-critical operating seams first:
     - shell bootstrap and employee shell truth
     - jobs and scheduling authority
     - Program Release packet and workspace authority
     - shop floor execution truth
     - inventory intake and receiving truth
3. `MP-1B Commercial And Business Convergence`
   - then close the commercial and service seams:
     - `messages`
     - `hotJobs`
     - Program Release lineage
     - portal and service continuity
     - quote, billing, portal, legal, accounting, and customer-service continuity
4. `MP-2 Realtime And Cross-Desk State`
   - ensure mutations propagate across jobs, scheduling, shop floor, shell counts, messaging, and service state
5. `MP-3 Business Operating Completeness`
   - finish accounting, legal/compliance, customer service, and quote-to-machining continuity
6. `MP-4 Simulation Readiness Gate`
   - only here should the user begin supplying business-scenario simulations for end-to-end testing

Simulation rule:

- scenario simulation should begin only after the targeted workflow family has passed `MP-0` through `MP-3` for its dependency chain
- this is the point where the user should supply test scenarios for realistic business-operation walkthroughs
- the target flow's formulas, constants, and tolerances should be registered and validated before business-scenario simulation starts

Main-path gate additions from the 2026-03-29 scrutiny pass:

- `MP-0` is a hard prerequisite for every downstream main-path unit
- `MP-1B` should not advance ahead of `MP-1A` stability
- `MP-2` should not be treated as cosmetic fanout; it depends on authoritative event sources first
- side quests may do audit, registry, extraction, formula, and generator work while the gate is active, but they must not change canonical schemas, production route wiring, or UI defaults if that slows blocker closure
- no side-quest output becomes canonical until a named main-path owner accepts the integration target
- no side quest may add new canonical formulas, schemas, or automation defaults until `MP-0` route/contract parity is mathematically green
- no roadmap item should move past `implemented` until it has a consumer-matrix row, at least one authoritative consumer, and one propagation proof test

#### Side Quest A — Auto Generation + Auto Wiring

Canonical child roadmap:

- `H:\prism\mcp-server\data\docs\roadmap\MCP-FULL-AUTOMATION-BLUEPRINT.md`
- `H:\prism\mcp-server\data\docs\roadmap\MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md`
- `H:\prism\mcp-server\data\docs\roadmap\MCP-AUTOMATION-HARDENING-ROADMAP.md`

Purpose:

- generate skills, scripts, algorithms, engines, formulas, provider seams, and frontend wiring in a controlled way

Track:

- lives primarily under `Track C`

Rule:

- allowed now as registry/generator/spec work
- must not outrun main-path blocker closure
- should also own specialist-role registry hardening, role-persistence fixes, and auto-wiring safeguards for spawned-agent identity metadata
- should own coordination-math and formula-governance tooling rather than letting those rules drift page by page
- should own conflict-arbitration logging and temporary-priority rules for duplicate shared blockers so multi-terminal Claude/Codex execution stays deterministic
- should own the code-entry reaction pipeline so new code immediately triggers artifact census, improvement planning, proof generation, and safe promotion or deterministic queuing
- should absorb useful session-level execution detail from `ULTIMATE-PRISM-ROADMAP-v25.md` and `MCP-AUTOMATION-HARDENING-ROADMAP.md` without letting either become a competing roadmap authority

#### Side Quest B — PDF / Video / Handbook Learning

Canonical child roadmap:

- `H:\prism\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

Purpose:

- turn resource corpora into validated, production-consumed knowledge

#### Side Quest C — Database And Corpus Hardening

Purpose:

- strengthen machines, tooling, holders, catalogs, CAD files, simulation assets, and test corpora so they act as canonical system truth instead of disconnected storage

#### Side Quest D — Business Platform Hardening

Purpose:

- deepen ERP, quoting, cost efficiency, accounting, legal/compliance, and automated customer service without replacing the main path

Branching rule:

1. the main path always has priority
2. side quests may run only when they do not slow the active main-path blocker closure
3. side quests must feed the main path instead of creating new islands
4. any side quest that produces production-consumed capability must register SVI/Psi impact explicitly
5. the canonical authority stack remains: `ROADMAP_COLLABORATION_STATE.md` -> `v24` -> `ULTIMATE_V24_BRANCH_PLAN_2026-03-29.md` -> child roadmaps
6. `ULTIMATE-PRISM-ROADMAP-v25.md` is reference-only and must not compete with this roadmap
7. external chat layers such as Slack/Discord may mirror status and notifications, but PRISM shared files remain the canonical coordination truth
8. coordination, routing, lease, and conflict formulas should be explicit for multi-agent execution rather than left as informal policy
9. no business-scenario simulation or production-grade automation claim should be made until the target workflow has passed the proof ladder and rollback/auditability checks

### Tomorrow Smoke-Test Rule (2026-03-29)

Tomorrow should begin with button/system smoke testing, not full business-scenario simulation.

Primary smoke scope:

1. shell launch, login/gateway, navigation, global search, desk counts, and main action buttons
2. core click-through:
   `Customers -> Quote Builder -> Program Release -> Jobs -> Shop Floor -> Messages`
3. secondary desk responsiveness:
   `Inventory`, `Purchasing`, `Scheduling`, `Employee Portal`, `Alarm`, `Capture Ops`, `PPG`, `Learning`, `Dashboard`
4. finance/admin responsiveness:
   `Invoices`, `General Ledger`, `Financial Analysis`, `Payroll`, `Order Tracking`, `Exports`

Do not hard-fail the smoke pass for intentionally staged areas if they show honest staged/fallback messaging and coherent UI behavior:

- `messages` delivery/reply authority
- `hotJobs` backend truth and realtime fanout
- deeper `Program Release` file/revision lineage
- inventory custody / insert indexing / tool checkout authority
- billing and commerce actions beyond status posture
- cross-shop learning propagation and resource-promotion outputs

## Unified All-In-One Canonical Merge (2026-03-27)

This roadmap is now the all-in-one canonical roadmap for PRISM. No separate roadmap or archive plan should outrank it. Older and parallel roadmap artifacts are now merged into v24 by reference and execution mapping.

### Roadmap Families Audited Into This Merge

The following families were reviewed and absorbed into this canonical plan:

- active CAMX lineage in the repo root:
  - `CAMX-FINAL-ROADMAP-v17.md`
  - `CAMX-ROADMAP-v18-AMENDMENTS.md`
  - `CAMX-ROADMAP-v19-AMENDMENTS.md`
  - `CAMX-CONSOLIDATED-ROADMAP-v20.md`
  - `CAMX-ROADMAP-v21-GAP-FIXES.md`
  - `CAMX-ROADMAP-v22-QUALITY-FIXES.md`
  - `CAMX-ROADMAP-v23-QUALITY-CHECKPOINTS.md`
  - `CAMX-RESTRUCTURED-ROADMAP-v24.md`
- current detailed operating-system overlay:
  - `mcp-server/data/docs/roadmap/ULTIMATE-SHOP-OS-roadmap.md`
  - `mcp-server/data/milestones/ULT-MS0.json` through `ULT-MS5.json`
- specialized manufacturing domain roadmaps at the repo root:
  - `MILLING-COMPREHENSIVE-ROADMAP.md`
  - `LATHE-COMPREHENSIVE-ROADMAP.md`
  - `MILL-TURN-COMPREHENSIVE-ROADMAP.md`
  - `FIVE-AXIS-COMPREHENSIVE-ROADMAP.md`
  - `GRINDING-COMPREHENSIVE-ROADMAP.md`
  - `LASER-COMPREHENSIVE-ROADMAP.md`
  - `WATERJET-COMPREHENSIVE-ROADMAP.md`
  - `WIRE-EDM-COMPREHENSIVE-ROADMAP.md`
- platform, utilization, skills, and orchestration roadmaps from archives:
  - `archives/legacy-roadmaps/DEV_INFRASTRUCTURE_ROADMAP.md`
  - `archives/legacy-roadmaps/MCP_ENHANCEMENT_ROADMAP_v2.md`
  - `archives/legacy-roadmaps/PRISM_SUPERPOWERS_COMPLETE_ROADMAP.md`
  - `archives/legacy-roadmaps/SKILL_UTILIZATION_AUDIT_ROADMAP.md`
  - `archives/legacy-roadmaps/PRISM_HYBRID_REBUILD_ROADMAP.md`
  - `archives/legacy-roadmaps/PRISM_v9_INTEGRATED_MASTER_ROADMAP.md`
  - representative archive mirrors under `C:/PRISM_ARCHIVE_2026-02-01`
- system and roadmap-generation guidance:
  - `AGENTIC-PATTERNS-ROADMAP.md`
  - `.claude/commands/generate-roadmap.md`
  - `.claude/commands/rgs-sync.md`
  - `C:/Users/Admin.DIGITALSTORM-PC/.claude/commands/forge-triple.md`
  - `SLASH_COMMANDS.md`
  - `ROADMAP_QUEUE.json`
  - shared roadmap coordination state under `state/shared/`
  - Claude/Codex command and coordination surfaces used for roadmap generation and sync

### Canonical Merge Policy

From this point forward:

1. `v24` is the only canonical roadmap.
2. `ULT` is the detailed connected-shop execution overlay inside `v24`, not a second roadmap.
3. machine-domain comprehensive roadmaps are subordinate domain annexes and backlog sources that feed the canonical phase structure here.
4. dev infrastructure, MCP enhancement, skill/superpowers, utilization, hybrid rebuild, and agentic-pattern roadmaps are platform source material for `v24`, not parallel execution authorities.
5. future roadmap generation must extend `v24` or attach subordinate milestone packs to it, never fork a new competing master roadmap.

### Merge Tracks Inside v24

All audited roadmap families now collapse into five canonical tracks:

#### Track A — Connected Shop Operating System

This is the current highest-priority build track and absorbs:

- Phase 5 ERP & Business Management Hardening
- Phase 6 Backend Business Platform
- `ULT-MS0` through `ULT-MS5`
- current jobs, scheduling, traveler, quote, shell, employee, and Print-to-CNC convergence work
- the canonical quote-to-machining decision pipeline from RFQ intake through actuals feedback
- accounting/finance close-cycle convergence
- legal/compliance operating closure
- automated customer service convergence across CRM, portal, messages, milestones, and status workflows

Interpretation:

- Claude owns canonical backend state, routes, persistence, sync, and realtime event flow.
- Codex owns frontend shells, desks, provider seams, workflow UX, and contract-ready integration.

#### Track B — Manufacturing Domain Depth

This track absorbs the specialized machine roadmaps:

- milling
- lathe
- mill-turn
- 5-axis
- grinding
- laser
- waterjet
- wire EDM

Interpretation:

- core chipmaking domains feed the Print-to-CNC program pipeline, setup-sheet generation, simulation posture, quoting depth, and real-part validation.
- non-chipmaking and specialty domains remain merged into `v24`, but are sequenced after the current operating-system convergence stack is stable enough to support them cleanly.
- these roadmaps are now domain annexes to `v24`, not separate strategic programs.

#### Track C — Platform Enablement, MCP, Hooks, Skills, Learning

This track absorbs:

- dev infrastructure roadmap
- MCP enhancement roadmaps
- superpowers and skill-utilization roadmaps
- hybrid rebuild and integrated master plans
- command-generation and forge-triple guidance
- agentic patterns and orchestration backlog
- the `2026-03-29` resource-learning hardening side-roadmap for PDF/video/handbook/course extraction and knowledge promotion

Interpretation:

- hooks, skills, scripts, indexes, MCP surfaces, memory, token efficiency, and self-learning stay strategically important
- but they should support the current delivery stack rather than becoming a competing lane that delays convergence
- when a capability directly improves current delivery quality, safety, or retention, it may be pulled forward into active work

#### Track D — Launch Hardening And Production Proof

This track absorbs:

- Phase 12 exhaustive testing with real parts
- Phase 13 final wiring, commands, web UI, and deployment readiness
- production-hardening intent from `PHASE_R6_PRODUCTION.md`
- launch/readiness intent from `ULT-MS5`

Interpretation:

- this is the home for end-to-end proof, real-world validation, release gates, rollback confidence, and production readiness
- this is not the current “build everything at once” lane; it is the formal ship gate after convergence

#### Track E — Post-Convergence SVI Closure

This track absorbs:

- the gap-closing intent from v21-v23 quality/gap checkpoint documents
- the remaining unresolved capability opportunities from `AGENTIC-PATTERNS-ROADMAP.md`
- the follow-on cross-audit plan where Claude audits frontend gaps and Codex audits backend gaps

Interpretation:

- this track begins only after the current backend/frontend convergence tranche is stable
- its goal is to drive the next `/rgs-sync` roadmap pass and close the remaining SVI/Psi gaps

### Dependency-Ordered Execution Until Convergence

The canonical execution order is now:

#### Wave 1 — Backend Source-of-Truth Spine

Execute first:

- Phase 5 sessions that stabilize persistence, cross-engine wiring, and quote-to-ship proof
- Phase 6 sessions `6-1` through `6-8`
- `ULT-MS0` through `ULT-MS3`

This wave establishes:

- canonical persistence
- file/CAD storage
- quote posture
- DFM/GD&T backend
- traveler and labor tracking
- approvals and audit trails
- RFQ packet lineage across documents, CAD, revisions, and quote state
- the backend decision spine for capability fit, route generation, burdened costing, and outsource comparison
- role-aware desks and global search
- live event and websocket-ready business state

#### Wave 2 — Frontend Convergence On Live Contracts

Execute in parallel with Wave 1, but never ahead of backend contract authority:

- employee shell
- jobs desk
- scheduling desk
- shop floor clock
- shell search/counts/pins/recents
- Print-to-CNC / Program Release
- quote-to-machining explainability surfaces: price strategy, route compare, release posture, requirements review, and simulation-ready handoff

Rule:

- Codex keeps the frontend provider-first and contract-ready.
- Claude lands the backend payloads that replace fixtures and local seam placeholders.

#### Wave 3 — External Sync, Customer, And Learning Expansion

Begin only after the current source-of-truth workflow spine is stable:

- Phase 5 `5-10`
- Phase 6 `6-5`, `6-9`, `6-10`
- `ULT-MS4`

This wave absorbs the strongest remaining business-platform items from the archive roadmap families without re-fragmenting the build order.

#### Wave 4 — Manufacturing Domain Roll-In

Once the operating spine and live workflow contracts are reliable:

- pull milling, lathe, mill-turn, 5-axis, and grinding depth into the live Print-to-CNC system
- keep laser, waterjet, and wire EDM as merged but later-sequenced domain annexes unless a business-critical contract forces them forward
- use the specialized roadmaps as deep domain references, not as standalone programs

#### Wave 5 — Launch Proof And Release Gate

After the current system converges:

- Phase 12 real-part validation
- Phase 13 final integration and deployment
- `ULT-MS5`
- production-hardening checks from R6-style reference work

#### Wave 6 — Cross-Audit And SVI-Maximizing Expansion

Only after convergence:

- Claude audits frontend gaps and fills them
- Codex audits backend gaps and fills them
- then run another `/rgs-sync` and generate the next gap-closing roadmap pass

### Role Split Until Convergence

- Claude: backend-first until convergence
- Codex: frontend-first until convergence
- after the remaining planned frontend queue is complete, Codex continues with frontend hardening and simulation-driven gap finding against the live backend while Claude continues backend closure
- after convergence: swap audit direction before generating the next roadmap expansion pass

### Most Important Sequencing Reminder

Treat Phase 5 + Phase 6 + the ULT overlay as the active live build program.
Treat the machine-domain comprehensive roadmaps as domain annexes feeding that program.
Treat archive platform/MCP/skill roadmaps and R6-R11-style strategic docs as reference tracks and post-convergence backlog sources unless they directly unblock the current delivery tranche.

---

## DESIGN PRINCIPLES FOR THIS RESTRUCTURE

```
1. MICRO-SESSIONS: Each session does 2-3 units MAX, then compacts
2. SELF-CONTAINED: Every session block has its own startup protocol + exit gate
3. HANDOFF-FIRST: Session exit writes EVERYTHING the next session needs
4. TOOLS ANNOTATED: Every step shows which /skill, hook, or script fires
5. NO CONTEXT DEPENDENCY: Session N+1 never depends on remembering Session N
6. STATE ON DISK: All progress tracked in milestone JSONs + HANDOFF.md
7. HOOKS ENFORCE: PostToolUse hooks catch stubs and test anti-patterns automatically
8. TOKEN OPTIMIZED: 7 hook improvements active (fingerprint dedup, path normalization,
   auto Read limits, 4-tier graduated compression, predictive file hints, mtime dedup,
   project-wide digest redirect). Current optimization: ~95%. See TOKEN_OPTIMIZATION_AUDIT.
9. MULTI-ROLE SCRUTINY: Every session exit runs /prism-review with domain-adaptive agents
   (flexible count: 2-10 based on scope). See /prism-review command for role pools.
10. AGENTIC PATTERNS: Inter-step validation, trajectory evaluation, and operator escalation
    gates active from Phase 0-B onward. Generator-critic loops from Phase 1 onward.
```

---

## SESSION TEMPLATE (every session follows this exactly)

```
┌─ SESSION START ─────────────────────────────────────────┐
│ AUTO-FIRES: session-start-unified.sh (loads context)    │
│ AUTO-FIRES: auto-approve.sh (safe ops pre-approved)     │
│                                                         │
│ /startup → /handoff read                                │
│ /smart [role for this session's units]                   │
│ Read THIS ROADMAP → find current session block           │
│ Read reference_system_capabilities.md                    │
│ Read files listed in unit's "FILES TO READ FIRST"        │
│                                                         │
│ HOOKS RUNNING SILENTLY:                                  │
│   pretooluse-unified → file routing + safety             │
│   posttooluse-unified → syntax checks + compression      │
│   PostToolUse prompt → engine stub detector              │
│   PostToolUse prompt → test quality enforcer             │
│   PreToolUse prompt → knowledge graph reminder           │
├─ WORK (per unit) ───────────────────────────────────────┤
│                                                         │
│ PLAN (before building — mandatory for new engines/logic):│
│   Enter plan mode → outline:                             │
│     What to build (specific methods, interfaces, logic)  │
│     Which knowledge sources to consult first             │
│     What the machinist-facing output should look like    │
│     Which edge cases and materials to handle             │
│     Which existing engines to wire to                    │
│   In autopilot: auto-confirm plan and proceed            │
│   For simple fixes/audits: skip plan, just execute       │
│                                                         │
│ BUILD: Execute the plan                                  │
│   npx tsc --noEmit → 0 errors                           │
│                                                         │
│ LOOP 1 — SCRUTINIZE (multi-role team review):             │
│   /prism-review (FLEXIBLE agent count, domain-adaptive): │
│     Auto-detect domain from changed files                 │
│     Launch 3-10 agents from domain role pools:            │
│       PHYSICS: machinist+physicist+numerics+architect+... │
│       CAM: CAM engineer+CNC programmer+post dev+...       │
│       BUSINESS: shop mgr+accountant+ERP+supply chain+...  │
│       QUALITY: QE+metrologist+PPAP+NDT+...                │
│       INFRA: API architect+test eng+perf eng+hook eng     │
│       FUSION: machinist+numerics PhD+pipeline arch+...    │
│     Each agent reviews from their specialist perspective  │
│     Consolidate: CRITICAL/MAJOR/MINOR per role            │
│   /scrutinize team on changed files                       │
│   Ask: "Is this REAL logic or a stub?"                   │
│   Ask: "Would a machinist accept this output?"           │
│   Ask: "Does the physics match published data?"          │
│   Fix ALL CRITICAL+MAJOR findings before proceeding       │
│                                                         │
│ LOOP 2 — GAP FILL (completeness check):                  │
│   Run affected tests → 0 failures                        │
│   Check: Is the engine WIRED? (import + call + result)   │
│   Check: Are constants from canonical source?             │
│   Check: Were tribal tips/playbook consulted?             │
│   Check: Are ALL edge cases handled?                     │
│   Check: Are there missing test scenarios?                │
│   Check: Does output include justification/reasoning?     │
│   Fill ALL gaps found — missing tests, unwired engines,   │
│   unhandled edge cases, missing knowledge references      │
│                                                         │
│ LOOP 3 — TIE UP (final polish):                          │
│   Verify: No TODO/FIXME left in committed code            │
│   Verify: No new `any` types introduced                   │
│   Verify: Every decision includes reasoning[]             │
│   Verify: Output matches expected format                  │
│   Verify: Cross-engine consistency (force computed once)  │
│   Verify: Golden snapshot saved if correct output exists  │
│   Update: MASTER_INDEX if new engine/action created       │
│   Update: Test count if new tests added                   │
│                                                         │
│ LOOP 4 — VALIDATE (re-verification after fixes):          │
│   Re-run /prism-review with SAME agents on fixed files    │
│   Compare: findings count decreased (MUST be ≤ previous)  │
│   If NEW findings introduced by fixes: fix those too      │
│   Run full test suite on changed engines → 0 failures     │
│   Verify: review-gate counter shows review completed      │
│   Confirm: "This unit is DONE — nothing left to do"       │
│                                                         │
│ FORGE-TRIPLE OUTPUT (per milestone, after units complete):│
│                                                         │
│   /forge-triple generates 3 PRODUCTS from what was built: │
│                                                         │
│   1. PROTECTIVE HOOK — prevent degradation of what's new: │
│      Built collision avoidance? → forge hook that BLOCKS   │
│      any future edit that removes collision checks         │
│      Built force model? → forge hook that validates force  │
│      values against canonical constants in output          │
│      Built controller dialect? → forge hook that verifies  │
│      controller-specific syntax in generated G-code        │
│      These hooks COMPOUND — each milestone makes the       │
│      enforcement layer stronger for ALL future sessions    │
│                                                         │
│   2. MCP DISPATCHER ACTION — make it callable by PRISM app:│
│      Built collision avoidance? → wire prism_cam:collision_check │
│        as dispatchable action with Zod schema              │
│      Built force model? → wire prism_calc:force_predict    │
│      Built tool selection? → wire prism_cam:tool_select    │
│      The PRISM web app calls these SAME actions via        │
│      Claude API + MCP bridge — instant computation         │
│      without re-implementing logic in the frontend         │
│                                                         │
│   3. SLASH COMMAND / SKILL — make it usable by operators:  │
│      Built collision avoidance? → forge /collision-check   │
│      Built S/F optimization? → forge /auto-speed-feed      │
│      Built cost model? → forge /estimate                   │
│      Operators and engineers call these directly in        │
│      Claude Code for quick answers without full pipeline   │
│                                                         │
│   FORGE-TRIPLE RULE:                                      │
│     Every capability built = 1 engine + 1 hook + 1 action │
│     No engine ships without a protective hook              │
│     No engine ships without an MCP action                  │
│     No engine ships without a user-facing skill            │
│     This is HOW the system grows:                          │
│       Session N builds capability                          │
│       Session N forge-triples it into hook+action+skill    │
│       Session N+1 is PROTECTED by the hook                 │
│       Session N+1 can CALL the action via PRISM app        │
│       Users can ACCESS the skill immediately               │
│                                                         │
│ Only after ALL 3 LOOPS + FORGE-TRIPLE → next unit         │
│                                                         │
├─ SESSION EXIT ──────────────────────────────────────────┤
│ /compact → writes HANDOFF.md + COMPACTION_SURVIVAL.json  │
│ AUTO-FIRES: precompact-save.sh (saves state)             │
│ AUTO-FIRES: stop-completion-check.sh (warns if unfinished)│
│ Next session: /startup → /roadmap-quality-check          │
└─────────────────────────────────────────────────────────┘
```

---

## KNOWLEDGE SOURCES + INTENT MAP
### For every phase: WHERE to find domain knowledge + WHAT the end user experiences

```
PURPOSE OF THIS SECTION:
  When building, you need to understand:
  1. WHERE the relevant expertise lives (PDFs, catalogs, tips, videos, engines)
  2. WHAT the machinist/user will ultimately DO with what you're building
  3. HOW this piece fits into the complete Print-to-CNC-Program pipeline

  Without this context, you build code that compiles but doesn't serve
  the user. A machinist doesn't care about "wiring" — they care about
  getting a correct G-code program that won't crash their machine.
```

### Phase 0-PRE (Full System Quality Audit — ALL 1,245 Engines × 52 Categories):
```
SCOPE: 19 sessions auditing ALL 1,245 engines across 52 domain categories
METHOD: Session 1 builds automated triage → Sessions 2-15 deep-audit by domain
        → Session 16 algorithms → Session 17 registries → Session 18 wiring
        → Session 19 consolidated scorecard + gate check

KNOWLEDGE SOURCES:
  - MASTER_INDEX.md — 1,895 lines, 52 engine categories, 11 sections, EVERYTHING listed
  - ENGINE_DIGEST.md — 1,245/1,245 engines indexed with descriptions
  - DISPATCHER_DIGEST.md — 77 dispatchers with action counts
  - reference_system_capabilities.md — master list of all capabilities
  - Knowledge graph: search_graph for architecture, trace_call_path for wiring
  - 127 scrutiny findings — cross-referenced against MASTER_INDEX

INTENT: Audit EVERY engine for real logic vs stubs. A machinist who sends in
  a drawing expects a working program back. If 546 engines are "uncategorized"
  and unknown quality, we can't trust the system. This audit classifies ALL
  engines, grades them PRODUCTION/PARTIAL/STUB/EMPTY, and produces an honest
  scorecard that determines what needs rebuilding before we wire anything new.
  Quality standard: PhD/Fortune500/world-class for every domain category.
```

### Phase 0-A (Print Reading):
```
KNOWLEDGE SOURCES:
  - data/docs/haas-lathe-workbook-full.txt — real drawings with dimensions
  - data/docs/haas-mill-workbook-full.txt — real mill drawings
  - H:\prism\BOX\*.step — real STEP CAD files
  - data/docs/sandvik-*.txt, walter-*.txt — reference catalogs
  - CADDrawingKnowledgeEngine — GD&T interpretation rules
  - ISO 1101 GD&T standard — tolerance frame interpretation

INTENT: A machinist hands you a drawing (paper, PDF, or CAD file). The system
  MUST correctly read every dimension, tolerance, and GD&T frame. If it reads
  "50mm pocket" as "5mm pocket", the program will crash the tool into the part.
  Print reading is the FOUNDATION — every downstream decision uses these numbers.

  END USER EXPERIENCE: Upload a drawing → see extracted dimensions listed back
  with confidence scores → confirm or correct → proceed to programming.
```

### Phase 0-B (Bug Fixes):
```
KNOWLEDGE SOURCES:
  - Machinery's Handbook threading chapter — multi-start thread geometry
  - ISO 261/262 — metric thread specifications
  - Fanuc 0i-TD manual — G76 threading cycle parameters
  - Haas NGC manual — G76 parameter differences from Fanuc
  - controller-knowledge-tips.ts — controller-specific quirks

INTENT: These are bugs that would make a real machine do the WRONG thing.
  Multi-start threading generating only 1 pass = thread doesn't fit the nut.
  Missing assembleProgram() = mill-turn crashes at runtime.
  Wrong Kienzle correction = force prediction off = tool breaks or part chatters.

  A machinist running these programs would scrap parts or damage tooling.
```

### Phase 0-C (Test Infrastructure):
```
KNOWLEDGE SOURCES:
  - Sandvik Coromant General Turning catalog — Vc/fz ranges per material
  - Kennametal NOVO database — alternative S/F data for cross-reference
  - Fanuc/Siemens/Heidenhain/Haas/Mazak/Okuma programming manuals — G-code syntax
  - ISO 4287 — surface roughness measurement standards
  - src/physics/constants.ts — canonical Kienzle/Taylor constants

INTENT: Tests that say "program contains G83" prove nothing. A test must say
  "G83 Z-25.0 Q5.0 R2.0 F150" and verify each value matches physics:
    Z depth matches drawing, Q peck = 3×D for steel (chip evacuation),
    R retract = 2mm above surface, F = fz × z × RPM from Kienzle-safe parameters.

  The test infrastructure built here makes EVERY future test meaningful.
  Without it, we'd pass 1000 tests while outputting programs that crash machines.
```

### Phase 0-D (Registry + Algorithm Wiring):
```
KNOWLEDGE SOURCES:
  - src/registries/*.ts — all 11 registries (752 strategies, 1662L materials, etc.)
  - src/algorithms/*.ts — all 50 algorithms
  - Sandvik Metal Cutting Technical Guide — physics model validation data
  - Machining Data Handbook — empirical cutting data across materials
  - Research papers: Altintas (chatter), Oxley (oblique cutting), Usui (wear)

INTENT: The system has 752 toolpath strategies but pipelines only see 28.
  It has 50 algorithms but only uses MonteCarlo. It has 11 registries that
  nobody queries. This is like having a library card but never entering the library.

  After this phase, when a machinist asks "what's the best strategy for this
  pocket in Inconel?", the system searches ALL 752 strategies (not just 28),
  uses assembly dynamics for chatter prediction (not just simplified cantilever),
  and optimizes pass depth with dynamic programming (not just "3×D" rules).
```

### Phase 1 (Knowledge + Decision Architecture):
```
KNOWLEDGE SOURCES:
  - src/data/*-cam-tips.ts — 3,700+ tribal tips across 18 CAM systems
  - src/engines/MachiningPlaybookEngine.ts — 296 best-practice rules
  - data/docs/haas-*-full.txt — 4 OCR'd Haas manuals
  - data/video-learned/ — video learning registry
  - controller-knowledge-tips.ts — 27 Mazatrol references, Okuma, Haas VQC
  - MultiCamStrategyEngineExt.ts — 22 Mazatrol strategy mappings

INTENT: This is the "brain" phase. Currently, decisions are made with simple
  lookup tables. After this phase, EVERY decision:
  1. Consults tribal knowledge ("old machinists say: never dwell in stainless")
  2. Checks the playbook ("anti-pattern: plunging a flat endmill")
  3. Queries decision trees for traceable reasoning
  4. Produces an explanation the machinist can read and verify

  Mazatrol/Okuma/Haas conversational output means operators who DON'T use
  G-code can still program their machines through PRISM.
```

### Phase 2 (Business Logic):
```
KNOWLEDGE SOURCES:
  - src/engines/MachineRateDatabaseEngine.ts — hourly machine rates
  - src/engines/CapacityPlanningEngine.ts — shop floor scheduling
  - src/engines/MakeVsBuyDecisionEngine.ts — outsource analysis
  - src/engines/ShopNetworkEngine.ts — external vendor capabilities
  - ISO 16949 / AS9100 quality standards for cost estimation

INTENT: The shop owner asks: "Which machine should run this job?" PRISM answers:
  "Haas VF-2 at $85/hr × 23 min = $32.58. Alternative: DMG MORI at $145/hr
  × 14 min = $33.83. Recommendation: Haas (0.4% cheaper, 9 min slower,
  sufficient tolerance capability Cpk 1.45)."

  This is where engineering meets business. Cheapest isn't always best.
  The RIGHT answer considers capability, cost, availability, and quality.
```

### Phase 3 (Level 3 Decisions + Physics):
```
KNOWLEDGE SOURCES:
  - Advanced Machining Processes (textbook) — thread/helical/plunge force models
  - Altintas "Manufacturing Automation" — process damping chapter
  - Sandvik Technical Guide — stock allowances by operation
  - ISO 4288 — surface roughness measurement rules
  - Statistical methods: Sobol indices, bootstrap CI, SPRT, PCA, Hotelling T²

INTENT: Level 3 = every decision evaluates ≥3 alternatives with physics scoring.
  Instead of "use adaptive clearing", the system says:
  "Option A: Adaptive clearing — 23 min, $18.40, Ra 3.2μm, Cpk 1.67
   Option B: Trochoidal — 28 min, $22.10, Ra 2.1μm, Cpk 1.89
   Option C: Zigzag — 18 min, $14.20, Ra 4.8μm, Cpk 1.12
   Recommendation: A (best cost/quality balance for ±0.05mm tolerance)"

  The machinist SEES the tradeoffs and can override with judgment.
```

### Phases 5-11 (Per-Machine Pipelines):
```
KNOWLEDGE SOURCES PER MACHINE TYPE:

  TURNING:
    - Haas Lathe Workbook (22 programs) — reference programs with drawings
    - Sandvik Turning catalog — insert grades, approach angles, CSS tables
    - Machinery's Handbook — threading, taper, spherical turning formulas
    - Titans of CNC Academy lathe tutorials
    - ISO 3685 (tool life testing), ISO 1832 (insert designation)

  MILLING:
    - Haas Mill Workbook (programs with drawings)
    - NIST SMS Test Bed (reference programs for validation)
    - NAS 979 (test specimen standard)
    - Sandvik Solid Round Tools catalog
    - Mastercam Dynamic Motion white papers

  5-AXIS:
    - DMG MORI 5-axis application guides
    - Impeller/blisk test geometry standards
    - RTCP/TCP compensation theory (machine kinematics)
    - G68.2 tilted work plane specification (Fanuc)

  MILL-TURN/SWISS:
    - Mazak Integrex programming manuals
    - Multi-channel synchronization (Siemens 840D)
    - Swiss-type guide bushing theory
    - Star/Citizen/Tsugami programming guides

  GRINDING:
    - Studer/Junker application guides
    - Malkin "Grinding Technology" textbook
    - ISO 1302 (surface finish designation)
    - Dressing diamond specifications

  EDM:
    - Sodick/Makino/AgieCharmilles operator manuals
    - Sato EDM gap model theory
    - Wire electrode specifications (brass/coated/molybdenum)
    - Die/mold industry standards

  LASER:
    - TRUMPF/Bystronic application data
    - Schulz thermal model for laser cutting
    - Gas assist pressure tables (N2, O2, air)
    - Beam quality (BPP) specifications

  WATERJET:
    - Flow/OMAX application guides
    - Zeng-Kim abrasive waterjet model
    - Garnet mesh size selection tables
    - Taper compensation theory

INTENT FOR ALL MACHINE TYPES:
  A machinist with a drawing in hand puts it into PRISM and gets:
  1. A COMPLETE CNC program (not a skeleton — real G-code they can load)
  2. Correct speeds and feeds (per-block variable, not constant per tool)
  3. Collision-free certification (no crash surprises on the machine)
  4. Setup sheet (tool list, WCS, fixture instructions)
  5. Cost estimate (cycle time × machine rate + tooling + material)
  6. Decision audit trail (WHY each choice was made)

  They load this program, set up the machine, prove it out, and make parts.
  If PRISM says G83 Z-25.0 Q5.0, the peck depth IS 5mm, the Z IS -25mm,
  and the force at those parameters WON'T break the drill.
```

### Phase 12 (Exhaustive Testing):
```
KNOWLEDGE SOURCES:
  - H:/prism/mcp-server/data/docs/EXTERNAL-REFERENCE-PROGRAMS-INDEX.md
    62 external sources: 21 GOLD (NIST, Haas), 30 SILVER, 9 BRONZE, 4 TEXTBOOK
  - Golden snapshots from Phases 5-11 (the programs we already validated)
  - Cross-material testing: same part in 3+ materials → different output

INTENT: Battle testing. Take real parts from real sources, run them through
  PRISM, compare output to the KNOWN CORRECT reference program. If PRISM
  generates Z-25.0 but the reference says Z-25.4, find out WHY and fix it.
  After this phase, we can PROVE PRISM generates correct programs for
  92 real parts across 9 machine types in 15+ materials.
```

---

## PHASE 0-PRE: FULL SYSTEM QUALITY AUDIT (ALL 1,245 ENGINES × 52 CATEGORIES)
### Purpose: Audit EVERY engine for real logic vs stubs, across ALL 52 domain categories
### Scope: 1,245 engines, 51 algorithms, 77 dispatchers, 22 registries, 808 test files
### Method: Automated triage → domain deep-audits → structural audits → gate check
### Cross-reference: 127 scrutiny findings against MASTER_INDEX (1,895 lines, 52 categories)

**EXECUTION ORDER (R3 FIX — overrides session numbering):**
```
0-PRE-1  → Automated triage (builds tooling)
0-PRE-14a/b → Uncategorized engine reclassification (546 engines → proper categories)
0-PRE-2 through 0-PRE-13 → Domain deep-audits (now include reclassified engines)
0-PRE-15 through 0-PRE-19 → Structural audits + gate
```
Session 0-PRE-14 MUST run BEFORE domain audits. Its number is historical — follow this order.

---

### SESSION 0-PRE-1: Automated Triage of ALL 1,245 Engines (U-TRIAGE)
```
SMART CONFIG: Role=code archaeologist + automation engineer | OPUS | MAX
UNITS: U-TRIAGE (1 unit — builds tooling for all subsequent sessions)
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - MASTER_INDEX.md — all 1,245 engines across 52 categories (READ FIRST)
  - ENGINE_DIGEST.md — 1,245 engine descriptions
  - reference_system_capabilities.md — pipelines, CAMX engines, all domains
  - 127 scrutiny findings (from prior sessions) — cross-reference against index

INTENT:
  Before deep-auditing 1,245 engines one by one, we need a TRIAGE. Build an
  automated scanner that reads every engine file and classifies it:
    PRODUCTION — real compute(), real math, real domain logic, >100 LOC in methods
    PARTIAL    — has structure + some logic but missing edge cases / hardcoded values
    STUB       — has compute() but returns placeholder/default values
    EMPTY      — class shell only, no meaningful methods

  This gives us a per-category scorecard BEFORE we spend sessions deep-diving.
  Categories where 100% engines are PRODUCTION can be SKIPPED in deep audit.
  Categories with STUB/EMPTY engines are PRIORITY for deep audit sessions.

  ALSO: cross-reference 127 scrutiny findings. For each finding:
    - Does the engine EXIST in MASTER_INDEX? → mark "wire existing"
    - Does the engine NOT exist? → mark "build new"
    - Is it listed but a STUB? → mark "upgrade to production"

STARTUP:
  /startup → /handoff read
  /smart code archaeologist + automation

SKILLS TO USE:
  /forge-audit quick       — codebase quality scan
  /engine-browse           — explore engine implementations
  /forge-cleanup           — dead code detection
  /codebase-memory-quality — unused function detection

WORK:
  1. Build triage script: ~/.claude/hooks/lib/_audit_engine_quality.py
     Input: engine file path
     Output: { verdict: PRODUCTION|PARTIAL|STUB|EMPTY, loc: N, methods: N, reasons: [] }
     Detection rules:
       EMPTY: no compute/run/execute method, or method body <5 lines
       STUB: method returns literal/default value, hardcoded { score: 0.5 }, etc.
       PARTIAL: has logic but uses magic numbers, missing material checks, <3 branches
       PRODUCTION: real math, canonical constant imports, material-aware, >3 branches

  2. Run triage across ALL 52 categories, producing per-category scorecard:
     | Category (52)              | Total | PROD | PARTIAL | STUB | EMPTY |
     Each row = one of the 52 MASTER_INDEX categories

  3. Cross-reference 127 scrutiny findings:
     | Finding | Engine | Exists? | Quality | Action |
     Action = wire-existing / upgrade-to-production / build-new

  4. Save results to: H:/prism/state/AUDIT/triage-scorecard.json
     + H:/prism/state/AUDIT/scrutiny-crossref.json

EXIT GATE:
  ✓ Triage scorecard for all 1,245 engines across 52 categories
  ✓ 127 scrutiny findings cross-referenced (wire/upgrade/build)
  ✓ Priority queue generated: which categories need deep audit
  ✓ /compact → HANDOFF includes scorecard summary + priority queue
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-2: Pipeline Engine Deep Audit (U-AUDIT-PIPE)
```
SMART CONFIG: Role=CNC programmer + code archaeologist | OPUS | MAX
UNITS: U-AUDIT-PIPE (1 unit — heavy)
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard (from HANDOFF.md) — which engines are stubs
  - Pipeline & Orchestration category (24 engines) from MASTER_INDEX
  - Haas Lathe Workbook (data/docs/haas-lathe-workbook-full.txt) — test inputs
  - Haas Mill Workbook (data/docs/haas-mill-workbook-full.txt) — test inputs
  - src/physics/constants.ts — canonical Kienzle/Taylor values

INTENT:
  This session answers: "If a machinist sends us a drawing right now,
  which of our 9 pipelines can actually produce a usable CNC program?"
  Not "does it compile" — does it produce REAL coordinates, REAL speeds, REAL G-code?
  A pipeline that returns X0 Y0 S1000 F200 for every part is BROKEN even if it compiles.

WORK:
  Run EACH of 9 pipeline engines with REAL test input:
    1. PrintToProgramPipelineEngine — pocket plate (4140, 50×50×15mm)
    2. TurningPrintToProgramEngine — stepped shaft (4140, 50mm OD)
    3. MultiAxisPrintToProgramEngine — angled hole plate (3 holes at 15°/30°/45°)
    4. MillTurnSwissPipelineEngine — shaft with cross-hole
    5. GrindingProgramAssemblerEngine — OD cylindrical (52100, 50mm)
    6. EDMProgramAssemblerEngine — die profile (D2, 25×25mm)
    7. LaserProgramAssemblerEngine — bracket (mild steel 1.5mm)
    8. WaterjetProgramAssemblerEngine — plate profile (6061, 6mm)
    9. QuoteToShipOrchestratorEngine — simple turning part

  For EACH: verdict = PRODUCTION / SCAFFOLD / STUB / BROKEN
  Deep-audit remaining 15 Pipeline & Orchestration engines from triage

  /prism-review after all audited

EXIT GATE:
  ✓ 24-engine Pipeline scorecard with verdicts
  ✓ /compact → HANDOFF includes scorecard
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-3: Core Physics Domain Audit (U-AUDIT-PHYS)
```
SMART CONFIG: Role=cutting science physicist + code quality | OPUS | MAX
UNITS: 4 categories, ~53 engines
ESTIMATED CONTEXT: 65-75%

CATEGORIES (deep audit — physics MUST be correct):
  Cutting Physics & Force (17) — Kienzle, power, torque, deflection force
  Speed & Feed (6) — UltimateSpeedFeed, material-specific Vc/fz
  Chatter & Stability (13) — SLD, FRF, RCSA, dynamic stiffness
  Deflection & Surface (17) — tool deflection, Ra/Rz prediction, spring pass

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard — which of these 53 are STUB vs PRODUCTION
  - src/physics/constants.ts — canonical kc1.1, Taylor C/n, Johnson-Cook
  - Altintas "Manufacturing Automation" — stability lobe theory
  - Sandvik Technical Guide — published Vc/fz ranges
  - FormulaRegistry (499 formulas) — verify engines use registered formulas

INTENT:
  Physics engines are the FOUNDATION of every CNC program PRISM generates.
  If Kienzle is wrong, speeds are wrong. If SLD is wrong, chatter occurs.
  Every engine in these 4 categories MUST use canonical constants, handle
  material-specific parameters, and produce values within ±10% of published data.

WORK:
  For EACH of 53 engines:
    1. Check triage verdict — skip PRODUCTION engines (spot-check 2 randomly)
    2. Deep-audit PARTIAL/STUB/EMPTY:
       - Does compute() use constants from src/physics/constants.ts?
       - Is there material-specific logic (not one-size-fits-all)?
       - Do force/speed/feed values match published data within tolerance?
       - Are edge cases handled (deep cuts, thin walls, hardened steel)?
    3. Grade: PRODUCTION / PARTIAL / STUB / EMPTY + specific fix needed

  /prism-review with physics-reviewer agent after all 4 categories

EXIT GATE:
  ✓ 53-engine physics scorecard
  ✓ All STUB physics engines flagged for Phase 0-B rebuild
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-4: Thermal + Material + Tool Domain Audit (U-AUDIT-TMT)
```
SMART CONFIG: Role=materials scientist + tool engineer | OPUS | MAX
UNITS: 5 categories, ~74 engines
ESTIMATED CONTEXT: 65-75%

CATEGORIES:
  Thermal & Temperature (24) — cutting temp, thermal expansion, heat treatment
  Material Science (12) — machinability, material properties, alloy selection
  Tool Selection (20) — tool recommender, geometry, coating
  Tool Wear & Life (9) — Taylor, Usui, flank/crater wear
  Toolpath & Strategy (14) — adaptive, trochoidal, HSM strategy selection

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - src/physics/constants.ts — Taylor C/n, wear coefficients
  - ToolpathStrategyRegistry (752 strategies)
  - Sandvik/Walter catalog data (data/docs/sandvik-*.txt, walter-*.txt)
  - ISO 3685 tool life testing standard

INTENT:
  Thermal engines that ignore material conductivity are wrong. Tool selection that
  doesn't consider coating/geometry/material interaction recommends bad tools.
  Wear models that use one C/n for all materials predict nonsense tool life.
  Every engine must be material-aware and use real catalog data.

WORK:
  For EACH of 74 engines: triage-driven deep audit (skip PRODUCTION, audit rest)
  Special focus:
    - Do thermal engines use material-specific thermal conductivity?
    - Do tool engines query the 95K+ tool catalog?
    - Do wear engines use material-specific Taylor constants?
    - Do strategy engines query the 752-strategy registry?

EXIT GATE:
  ✓ 74-engine scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-5: Process Domain Audit — Turning + Milling + Multi-Axis (U-AUDIT-PROC1)
```
SMART CONFIG: Role=CNC machinist + process engineer | OPUS | MAX
UNITS: 3 categories, ~65 engines
ESTIMATED CONTEXT: 65-75%

CATEGORIES:
  Turning & Lathe (32) — threading, facing, boring, grooving, parting
  Milling (25) — pocket, contour, slot, face, ramp, helical
  5-Axis & Multi-Axis (8) — SWARF, port, impeller, simultaneous 5-axis

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - Haas Lathe/Mill Workbooks
  - Machinery's Handbook — threading, turning, milling chapters
  - Tribal tips: mastercam-cam-tips.ts, fusion-cam-tips.ts (strategy parameters)

INTENT:
  A turning engine that can't handle G76 multi-start threads is incomplete.
  A milling engine that ignores stepover/stepdown ratios produces bad toolpaths.
  A 5-axis engine that doesn't handle tool axis orientation crashes the machine.
  These are the core processes machinists use EVERY DAY — they must be bulletproof.

WORK:
  For EACH of 65 engines: triage-driven deep audit
  Special focus:
    - Do turning engines handle ALL standard operations (OD/ID/face/groove/thread/part)?
    - Do milling engines handle geometric edge cases (thin walls, deep pockets)?
    - Do 5-axis engines compute correct tool vectors?

EXIT GATE:
  ✓ 65-engine process scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-6: Process Domain Audit — Grinding + EDM + Non-Traditional (U-AUDIT-PROC2)
```
SMART CONFIG: Role=grinding/EDM specialist + process engineer | OPUS | MAX
UNITS: 5 categories, ~58 engines
ESTIMATED CONTEXT: 60-70%

CATEGORIES:
  Grinding (14) — OD/ID/surface/centerless grinding, wheel selection
  EDM Wire & Sinker (24) — wire EDM, die sinker, electrode selection
  Mill-Turn & Swiss (3) — combined operations, bar feeding
  Non-Traditional Machining (4) — ECM, EBM, USM
  Laser Cutting (8) — fiber/CO2 laser, kerf, pierce

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - WEDM-P2B track data (12 engines built, 20 milestones)
  - Grinding formulas: specific energy, MRR, wheel speed, depth of cut
  - EDM formulas: gap voltage, pulse on/off, MRR, surface finish

WORK:
  For EACH of 58 engines: triage-driven deep audit
  Special focus:
    - Do grinding engines compute wheel speed, specific energy, MRR correctly?
    - Do EDM engines handle pulse parameters and gap control?
    - Do laser engines compute kerf width, pierce time, gas pressure?

EXIT GATE:
  ✓ 58-engine scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-7: CAM Bridges + Post-Processing + Simulation (U-AUDIT-CAM)
```
SMART CONFIG: Role=CAM application engineer + post processor developer | OPUS | MAX
UNITS: 3 categories, ~72 engines
ESTIMATED CONTEXT: 65-75%

CATEGORIES:
  CAM System Bridges (40) — Mastercam, Fusion360, NX, hyperMILL, etc.
  Post-Processing (20) — Fanuc, Siemens, Okuma, Haas, Mazak post processors
  Simulation (12) — Vericut bridge, collision check, material removal sim

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - All 18 CAM tip files (src/data/*-cam-tips.ts) — per-CAM knowledge
  - hyperMILL CAM Manual (1632pp) — strategy parameters
  - Post processor templates in src/engines/post-processing/
  - 651 Fusion 360 CPS post processors available at Fusion cache (comprehensive controller coverage) ← CATALOGED 2026-03-25
  - Custom AI-enhanced posts in Box: HAAS, OKUMA MULTUS, HURCO (shop-validated)
  - hyperMILL post processor XML configs at H:/prism/HYPERMILL/NcGenerator/ ← EXTRACTED 2026-03-25
    Reference for controller-specific formatting patterns and cycle definitions

INTENT:
  A CAM bridge that doesn't map PRISM tool data to CAM-specific formats is useless.
  A post processor that outputs G-code Haas can't read crashes the machine.
  A simulation bridge that doesn't validate against machine limits misses collisions.
  40 CAM bridges × 20 post processors = the output layer machinists actually USE.

WORK:
  For EACH of 72 engines: triage-driven deep audit
  Special focus:
    - Do CAM bridges produce format-specific output (not generic JSON)?
    - Do post processors handle controller-specific G/M codes?
    - Does simulation bridge validate against real machine limits?

EXIT GATE:
  ✓ 72-engine CAM/Post/Sim scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-8: CAD + Geometry + GD&T + Feature Recognition (U-AUDIT-CAD)
```
SMART CONFIG: Role=CAD engineer + metrology specialist | OPUS | MAX
UNITS: 4 categories, ~31 engines
ESTIMATED CONTEXT: 55-65%

CATEGORIES:
  CAD & Geometry (20) — STEP import, geometry analysis, CAD feature extraction
  Feature Recognition (5) — pocket/hole/boss/slot detection from CAD
  GD&T & Tolerance (6) — geometric dimensioning, tolerance interpretation
  Inspection & Measurement (14) — CMM, surface roughness, dimensional checks

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - ISO 1101 GD&T standard
  - STEP AP203/AP214 specifications
  - BOX data: 33 STEP models at H:\prism\BOX\*.step
  - hyperMILL ISO fit catalog: src/data/hypermill-iso-fits.json ← EXTRACTED 2026-03-25
    ISO 286 bore/shaft tolerance classes — reference for GD&T interpretation + tolerance zone validation

WORK:
  For EACH of 45 engines: triage-driven deep audit
  Special focus:
    - Do CAD engines parse real STEP/IGES formats?
    - Does feature recognition detect standard machining features?
    - Does GD&T interpretation handle datum frames + composite tolerances?

EXIT GATE:
  ✓ 45-engine CAD/GD&T scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-9: Business + Cost + Optimization + Statistics (U-AUDIT-BIZ)
**SPLIT NOTE (from scrutiny):** 95 engines is too heavy for one session. Split into:
  0-PRE-9a: Cost & Quoting (22) + Business & ERP (20) = 42 engines
  0-PRE-9b: Optimization (30) + Statistics & Uncertainty (23) = 53 engines
  Add /compact between them.
```
SMART CONFIG: Role=manufacturing cost engineer + statistician | OPUS | MAX
UNITS: 4 categories, ~95 engines
ESTIMATED CONTEXT: 70-80%

CATEGORIES:
  Cost & Quoting (22) — job costing, quote generation, price breaks
  Business & ERP (20) — order management, scheduling, MRP
  Optimization (30) — parameter optimization, multi-objective, constraint solvers
  Statistics & Uncertainty (23) — Bayesian, Monte Carlo, confidence intervals

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - MachineRateDatabaseEngine — real $/hr rates
  - Manufacturing cost models — 10-component breakdown methodology

INTENT:
  Cost engines must compute REAL multi-component breakdowns (material + tooling +
  machine time + setup + inspection + overhead), not return { total: 100 }.
  Optimization engines must solve real constraint problems, not return defaults.
  Statistics engines must compute real distributions, not hardcode confidence=0.95.

WORK:
  For EACH of 95 engines: triage-driven deep audit (HEAVY session)
  NOTE: 95 engines is a lot. Use triage to skip PRODUCTION, focus on PARTIAL/STUB.
  If >50 need deep audit, split across TWO mini-sessions within this session.

EXIT GATE:
  ✓ 95-engine business/optimization scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-10: AI + Decision + Learning + Prediction (U-AUDIT-AI)
```
SMART CONFIG: Role=ML engineer + manufacturing domain expert | OPUS | MAX
UNITS: 4 categories, ~45 engines
ESTIMATED CONTEXT: 55-65%

CATEGORIES:
  AI & Machine Learning (12) — neural models, training pipelines, inference
  Decision & Reasoning (8) — multi-criteria decision, trade-off analysis
  Prediction (7) — tool life prediction, quality prediction, cycle time
  Learning & Knowledge Base (18) — tribal knowledge, CAM learning, video learning

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - Video learning registry (data/video-learned/learning-registry.json)
  - PDF learning data (haas/sandvik/walter manuals)
  - Tribal tips (3,700+ across 20 CAM systems)

WORK:
  For EACH of 45 engines: triage-driven deep audit
  Special focus:
    - Do ML engines have real model architectures (not just predict() → 0.5)?
    - Do decision engines use weighted criteria from real data?
    - Do prediction engines use physics-informed models?
    - Do knowledge engines query the 3,700+ tribal tips?

EXIT GATE:
  ✓ 45-engine AI/Decision scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-11: Quality + Safety + Sustainability + Surface (U-AUDIT-QSS)
```
SMART CONFIG: Role=quality engineer + sustainability analyst | OPUS | MAX
UNITS: 5 categories, ~46 engines
ESTIMATED CONTEXT: 55-65%

CATEGORIES:
  Quality & SPC (10) — SPC charts, Cpk, process capability
  Collision & Safety (12) — rapid override, tool length check, axis limits
  Sustainability (12) — energy consumption, carbon footprint, waste reduction
  Surface Treatment (6) — anodizing, plating, heat treatment
  Stock & Raw Material (6) — bar stock selection, near-net shape optimization

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - ISO 9001/IATF 16949 quality standards
  - MachiningPlaybookEngine (296 rules) — safety anti-patterns
  - Secondary ops data (data/secondary-ops/)

WORK:
  For EACH of 46 engines: triage-driven deep audit
  Special focus:
    - Do quality engines compute real Cpk/Ppk from data arrays?
    - Do safety engines check ALL machine limits (axis, spindle, rapid)?
    - Do sustainability engines compute real energy models?

EXIT GATE:
  ✓ 46-engine scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-12: Infrastructure + Scheduling + Sensing + Controllers (U-AUDIT-INFRA)
```
SMART CONFIG: Role=systems architect + automation engineer | OPUS | MAX
UNITS: 5 categories, ~58 engines
ESTIMATED CONTEXT: 60-70%

CATEGORIES:
  System Infrastructure (33) — utility engines, data transforms, config
  OEE & Scheduling (7) — overall equipment effectiveness, job scheduling
  Sensing & Monitoring (9) — vibration, temperature, current monitoring
  Controller Knowledge (2) — Fanuc/Siemens controller specifics
  Machine Selection (7) — machine capability matching, cost optimization

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - DISPATCHER_DIGEST.md — which infrastructure engines are wired
  - Machine catalog (910 machines, 48 manufacturers)

WORK:
  For EACH of 58 engines: triage-driven deep audit
  Special focus:
    - Are infrastructure engines utility or dead weight?
    - Do OEE engines compute from real shift/downtime data?
    - Do sensing engines process real signal data formats?

EXIT GATE:
  ✓ 58-engine infrastructure scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-13: Sheet Metal + Nesting + Waterjet + Welding + Workholding (U-AUDIT-FAB)
```
SMART CONFIG: Role=fabrication engineer + fixture designer | OPUS | MAX
UNITS: 5 categories, ~51 engines
ESTIMATED CONTEXT: 55-65%

CATEGORIES:
  Forming & Sheet Metal (10) — bend, stamp, progressive die
  Nesting & Sheet (7) — part nesting, sheet utilization, remnant tracking
  Waterjet (4) — abrasive waterjet, pure waterjet, taper compensation
  Welding & Joining (15) — MIG/TIG/laser weld, joint design, distortion
  Workholding (15) — vise, fixture, vacuum, magnetic chuck selection

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard
  - Sheet metal formulas (bend allowance, K-factor, springback)
  - Welding standards (AWS D1.1, ISO 5817)
  - Workholding force calculations (clamping force vs cutting force)

WORK:
  For EACH of 51 engines: triage-driven deep audit
  Special focus:
    - Do forming engines compute real bend allowance / K-factor?
    - Do nesting engines optimize for material utilization?
    - Do welding engines compute real heat input and distortion?
    - Do workholding engines verify clamping force > cutting force?

EXIT GATE:
  ✓ 51-engine fabrication scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-14: Uncategorized Engines Triage + Categorization (U-AUDIT-UNCAT)
**SPLIT NOTE (from scrutiny):** 546 engines too heavy. Split into 0-PRE-14a (1-273) and 0-PRE-14b (274-546) with /compact between. Add 3rd micro-compact within each half.
**REORDER NOTE (from architect scrutiny):** Run AFTER 0-PRE-1 (triage) but BEFORE domain audits (0-PRE-2 through 0-PRE-13) so reclassified engines are audited in their correct category.
```
SMART CONFIG: Role=code archaeologist + domain classifier | OPUS | MAX
UNITS: Uncategorized (546 engines — the largest bucket!)
ESTIMATED CONTEXT: 70-80%

KNOWLEDGE SOURCES:
  - 0-PRE-1 triage scorecard (546 uncategorized engine verdicts already computed)
  - MASTER_INDEX.md Uncategorized section (lines 769-1316)
  - ENGINE_DIGEST.md — 1-line descriptions for classification

INTENT:
  546 "Uncategorized" engines = 44% of ALL engines. These MUST be:
  1. CLASSIFIED into the correct domain category (or a new category if needed)
  2. GRADED: PRODUCTION / PARTIAL / STUB / EMPTY
  3. Cross-referenced against scrutiny findings

  This session does NOT deep-audit each engine — it CLASSIFIES and triages.
  Deep audit of reclassified engines happens in their new category's session
  (if that session hasn't run yet) or in a dedicated fix session (Phase 0-B).

  Strategy: batch-process using engine name + DIGEST description + file header.
  Most engines can be classified from their name alone:
    "ThreadMillingEngine" → Milling
    "WeldDistortionPredictorEngine" → Welding & Joining
    "BayesianParameterEstimatorEngine" → Statistics & Uncertainty

WORK:
  1. Read Uncategorized section of MASTER_INDEX.md (546 engines)
  2. For EACH engine, classify into one of 51 named categories
     (or create new categories if >10 engines don't fit anywhere)
  3. Update MASTER_INDEX.md: move engines from Uncategorized to correct category
  4. Re-run _gen_master_index.py to regenerate clean index
  5. Triage verdict summary: X PRODUCTION / Y PARTIAL / Z STUB / W EMPTY

  Process in batches of ~100:
    Batch 1: engines 1-100 → classify + grade
    Batch 2: engines 101-200 → classify + grade
    → MICRO-COMPACT here (save progress to HANDOFF)
    Batch 3: engines 201-300 → classify + grade
    Batch 4: engines 301-400 → classify + grade
    → MICRO-COMPACT here
    Batch 5: engines 401-546 → classify + grade

EXIT GATE:
  ✓ 0 engines remain in "Uncategorized" (all reclassified)
  ✓ Updated MASTER_INDEX.md with correct categories
  ✓ Triage verdicts for all 546
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-15: Additive + Documentation + Process Routing (U-AUDIT-MISC)
```
SMART CONFIG: Role=manufacturing generalist + documentation | OPUS | MAX
UNITS: 3 categories, ~13 engines (light session)
ESTIMATED CONTEXT: 40-50%

CATEGORIES:
  Additive Manufacturing (6) — FDM, SLA, SLS, DMLS
  Documentation & Reporting (6) — setup sheets, tool lists, inspection reports
  Process Routing (1) — manufacturing routing optimization

WORK:
  For EACH of 13 engines: triage-driven deep audit
  Quick session — use remaining context for consolidated scorecard prep

EXIT GATE:
  ✓ 13-engine scorecard
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-16: Algorithm Verification (U-AUDIT-ALGO)
```
SMART CONFIG: Role=cutting science mathematician + physics reviewer | OPUS | MAX
UNITS: U-AUDIT-ALGO (1 unit — heavy math)
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/physics/constants.ts — canonical kc1.1 (ISO P=1800, M=2100, K=1100, N=700), Taylor C/n values
  - Sandvik Coromant Technical Guide — published Vc/fz ranges for hand-calculation verification
  - Machining Data Handbook — empirical cutting data across materials
  - Altintas "Manufacturing Automation" Ch.3 — stability lobe theory, FRF, RCSA
  - Ti-6Al-4V Johnson-Cook constants: A=997, B=653, n=0.45, C=0.0198, m=0.7 (published)
  - ISO 3685 — tool life testing standard (Taylor model validation)
  - Usui wear model — published wear test data for verification

INTENT:
  Every physics number PRISM outputs depends on these 51 algorithms. If Kienzle computes
  Fc=500N but the real answer is 1550N, the tool will break or the part will chatter.
  This session hand-calculates 20 expected values and compares to algorithm output.
  Any algorithm off by more than tolerance gets FIXED here.

SKILLS TO USE:
  /algorithm-inspect       — inspect each algorithm implementation
  /physics-verify          — cross-pipeline physics consistency
  /formula-browse          — verify formulas against algorithm implementations
  /calibrate               — compare output against known calibration data
  /what-if                 — delta analysis across physics models

WORK:
  Verify TOP 20 algorithms with hand calculations:
    KienzleForceModel: Fc for 4140 (kc1.1=1800, mc=0.25, ap=3, fz=0.15)
    StabilityLobeDiagram: f_n=800Hz, 4-flute → critical RPM
    JohnsonCookModel: Ti-6Al-4V published constants
    TaylorToolLife: C=350, n=0.25, Vc=200
    UsuiWearModel: published wear test data
    ... (15 more of the 51 total)

  For EACH: PASS (within tolerance) / FAIL (fix formula)
  FIX any failed algorithms before proceeding

  /prism-review with physics-reviewer agent

EXIT GATE:
  ✓ 51-algorithm verification scorecard
  ✓ All failures fixed and re-verified
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-17: Registries + Constants + Tests (U-AUDIT-REG)
```
SMART CONFIG: Role=systems architect + QA engineer | OPUS | MAX
UNITS: U-AUDIT-REG1, U-AUDIT-REG2, U-AUDIT-REG3 (3 units)
ESTIMATED CONTEXT: 70-80%

KNOWLEDGE SOURCES:
  - src/registries/*.ts — all 22 registries
  - src/physics/constants.ts — THE canonical source for all physics constants
  - Sandvik Coromant catalog — verify MaterialRegistry kc1.1 values match published
  - All test files (808 files) — grep for anti-patterns

INTENT:
  Registries with data nobody queries = wasted assets. Constants that conflict across
  engines = wrong answers. Tests that always pass = false confidence.

SKILLS TO USE:
  /forge-wiring, /forge-drift, /forge-tests scan, /forge-audit
  /system-audit, /forge-cleanup, /trace, /unwired-review

WORK:
  U-AUDIT-REG1: Verify 22 registries have REAL queryable data
  U-AUDIT-REG2: Physics constants consistency
    1. Extract canonical values from src/physics/constants.ts
    2. Grep ALL 1,245 engines for inline kc1.1/kc1_1 values
    3. FIX every conflict (replace inline with canonical import)
  U-AUDIT-REG3: Test quality audit (808 test files)
    1. Grep for || true → FIX ALL
    2. Grep for bare .includes() → upgrade to parametric
    3. Create test quality report

EXIT GATE:
  ✓ Registry scorecard (X queryable / Y empty)
  ✓ Constants: X consistent / Y conflicting (fixed)
  ✓ Tests: X real / Y keyword-only / Z always-pass (fixed)
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-18: Wiring + Dispatcher Audit (U-AUDIT-WIRE)
```
SMART CONFIG: Role=pipeline architect + dispatcher wiring | OPUS | MAX
UNITS: U-AUDIT-WIRE1, U-AUDIT-WIRE2 (2 units)
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - DISPATCHER_DIGEST.md — all 77 dispatchers with action counts
  - src/tools/dispatchers/*.ts — z.enum action lists
  - Knowledge graph: trace_call_path for wiring analysis

INTENT:
  After auditing all 1,245 engines, we know which are REAL. Now verify:
  which real engines are actually WIRED into dispatchers? An engine that
  exists but nobody can call it is dead code. A dispatcher action with
  no backing engine crashes at runtime.

SKILLS TO USE:
  /forge-wiring, /trace, /unwired-review, /codebase-memory-tracing

WORK:
  U-AUDIT-WIRE1: Wiring reality audit for ALL 9 pipelines
    For EACH import: verify CALL SITE exists, RESULT is USED
    Classify: WIRED+USED / WIRED+UNUSED / DEAD IMPORT
  U-AUDIT-WIRE2: Dispatcher action coverage for ALL 77 dispatchers
    For EACH action in z.enum: engine method EXISTS?
    Schema matches engine interface? Flag phantoms + orphans.

EXIT GATE:
  ✓ Wiring: X real / Y dead imports / Z unused results
  ✓ Dispatchers: X valid / Y phantom / Z orphan
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-PRE-19: Consolidated Scorecard + Gate Check (U-AUDIT-GATE)
```
SMART CONFIG: Role=engineering manager + quality director | OPUS | MAX
UNITS: U-AUDIT-GATE (1 unit — synthesis)
ESTIMATED CONTEXT: 50-60%

INTENT:
  Combine ALL prior 0-PRE session scorecards into ONE consolidated system
  quality report. This is the honest foundation for all remaining work.
  The gate check determines: can we proceed to Phase 0-A, or must we fix
  critical quality issues first?

WORK:
  1. Read all scorecard data from H:/prism/state/AUDIT/
  2. Produce CONSOLIDATED SCORECARD:
     | Category (52+)          | Total | PROD | PARTIAL | STUB | EMPTY | % Real |
     + Summary row: X/1245 PRODUCTION, Y PARTIAL, Z STUB, W EMPTY
  3. Cross-reference with 127 scrutiny findings:
     X resolved (engine exists + PRODUCTION)
     Y partially resolved (engine exists but PARTIAL/STUB)
     Z unresolved (engine doesn't exist → Phase 0-B build list)
  4. Save to: H:/prism/state/AUDIT/CONSOLIDATED-SCORECARD.md
  5. Update CURRENT_POSITION.md with audit results

PHASE 0-PRE GATE:
  If >20% engines are STUB/EMPTY → MANDATORY fix session before Phase 0-A
  If >10% algorithms fail → MANDATORY fix before Phase 0-A
  If >5% constants conflict → MANDATORY fix before Phase 0-A
  If gate PASSES → proceed to Phase 0-A
  If gate FAILS → insert Phase 0-PRE-FIX sessions (scope determined by scorecard)
```

**`/compact` CHECKPOINT 0-PRE COMPLETE → new session → `/roadmap-quality-check`**

---

## PHASE 0-A: PRINT READING VALIDATION (6 units in 3 sessions)
**PIPELINE SCRUTINY NOTE:** PrintToProgramPipelineEngine has ALL coordinates at X0 Y0
(line 1494: "// Simplified"). Phase 0-A Session 0-A-3 (end-to-end drawing→program) MUST
fix coordinate generation as its primary deliverable. Without real coordinates, the
pipeline produces non-runnable G-code. Also: AutoSpeedFeedEngine integration is async-in-sync
and silently skips — must be fixed to either await properly or use sync path.

---

### SESSION 0-A-1: Blueprint OCR + Geometry (U01-U02)
```
SMART CONFIG: Role=OCR/vision + CAD/geometry + Python | OPUS | MAX
UNITS: U01, U02
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - data/docs/haas-lathe-workbook-full.txt — REAL drawings with known dimensions (O00075, O0106, O0107)
  - data/docs/haas-mill-workbook-full.txt — REAL mill drawings with known dimensions
  - src/engines/BlueprintOCREngine.ts — current OCR implementation
  - src/engines/PrintToGeometryEngine.ts — CadQuery 3D model generation
  - ISO 1101 — GD&T frame interpretation rules
  - CadQuery documentation — Python API for 3D model verification
  - CADDrawingKnowledgeEngine — GD&T interpretation intelligence we already built

INTENT:
  A machinist hands you a crumpled shop drawing. Can PRISM read EVERY dimension on it?
  If OCR reads "50mm pocket" as "5mm pocket", the G-code program will ram the tool into
  the vise. If it misses a tolerance callout, the part will be out of spec. This session
  tests with REAL Haas workbook drawings where we KNOW the correct dimensions — so we
  can verify our OCR gets them RIGHT, not just "produces output."

STARTUP:
  /startup → /handoff read → read 0-PRE scorecard
  /smart OCR/vision + CAD/geometry

SKILLS TO USE:
  /blueprint-read          — engineering drawing OCR & analysis
  /print-to-program        — upload print → get CNC program (for testing flow)

WORK:
  U01: Test BlueprintOCREngine with Real Haas Drawings
    Extract 3 drawings from haas-lathe-workbook-full.txt (O00075, O0106, O0107)
    Feed through analyzeBlueprint()
    Verify EVERY dimension extracted correctly
    Create vitest: blueprint-ocr-real-data.test.ts

  U02: Test PrintToGeometryEngine — EXECUTE CadQuery Output
    Feed OCR-extracted dims through PrintToGeometryEngine.generate()
    Execute the Python script: python -c "import cadquery as cq; ..."
    Verify dimensions match input ±0.05mm
    Create vitest for script structure

  /prism-review after both units
  /test on new test files

EXIT GATE:
  ✓ 3 real drawings processed, dims ≥95% accurate
  ✓ CadQuery script executes, model matches input
  ✓ 2 new vitest files pass
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-A-2: STEP Import + Feature Recognition (U03-U04)
```
SMART CONFIG: Role=CAD import + feature recognition | OPUS | HIGH
UNITS: U03, U04
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - H:\prism\BOX\*.step — REAL STEP CAD files (33 models from BOX data source)
  - ISO 10303 AP203/AP214 — STEP file format specification
  - src/engines/StepImportEngine.ts — current STEP parser
  - src/engines/FeatureRecognitionEngine.ts — 21 feature types recognized
  - src/engines/FeatureToZoneEngine.ts — zone decomposition (bulk/corner/wall)
  - CADKernelEngine — core CAD operations we already built

INTENT:
  Most real shops send CAD files, not paper drawings. Can PRISM import a STEP file
  and correctly identify: "this is a 50mm deep pocket, this is a 10mm hole, this is
  a 0.5mm chamfer"? Feature recognition is what tells the system WHAT to machine.
  Wrong feature = wrong strategy = wrong tool = wrong program = scrapped part.

STARTUP:
  /startup → /handoff read
  /smart CAD import + feature recognition

SKILLS TO USE:
  /codebase-memory-exploring — find related engines via graph

WORK:
  U03: Import 3 STEP files from H:\prism\BOX
    Extract face/edge/feature data
    Create vitest with REAL STEP file data

  U04: Run FeatureRecognitionEngine on imported geometry
    Verify feature types correct (pocket IS pocket, hole IS hole)
    Run FeatureToZoneEngine for zone decomposition
    Create vitest

  /prism-review after both

EXIT GATE:
  ✓ 3 STEP files imported, features correctly typed
  ✓ Zone decomposition produces valid zones
  ✓ /compact
```

**`/compact` → new session → `/roadmap-quality-check`**

---

### SESSION 0-A-3: End-to-End Drawing→Program (U05-U06)
```
SMART CONFIG: Role=pipeline architect | OPUS | MAX
UNITS: U05, U06
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - Haas Lathe Workbook O0106 (stepped shaft) — KNOWN drawing with dimensions + reference program
  - Haas Mill Workbook (pocket plate drawing) — KNOWN drawing with reference program
  - src/engines/AutoPrintToProgramBridgeEngine.ts — routing logic
  - src/engines/PrintToProgramPipelineEngine.ts — milling pipeline
  - src/engines/TurningPrintToProgramEngine.ts — turning pipeline
  - Fanuc 0i programming manual — verify G-code syntax correctness
  - src/physics/constants.ts — verify S/F values are physics-backed

INTENT:
  This is the FIRST end-to-end test. Drawing goes in → CNC program comes out.
  The turning program for O0106 must have coordinates that match the KNOWN dimensions
  of the stepped shaft. If the drawing says 50mm OD and the program says X50.0, that's
  correct. If it says X0.0, it's a stub. This session proves the pipeline WORKS
  end-to-end, even if the output quality is scaffold-level.

STARTUP:
  /startup → /handoff read
  /smart pipeline architect

SKILLS TO USE:
  /print-to-program        — test the full flow
  /program-validate        — G-code verification
  /trace                   — verify wiring chain

WORK:
  U05: Drawing → Turning Program (Haas Lathe Workbook O0106)
    BlueprintOCR → detect turning → route → TurningPrintToProgram → verify coords

  U06: Drawing → Milling Program (Haas Mill Workbook)
    BlueprintOCR → detect milling → route → PrintToProgramPipeline → verify routing

  /prism-review after both

EXIT GATE:
  ✓ Drawing → turning program with correct coordinates
  ✓ Drawing → milling program with correct routing
  ✓ /compact
```

**`/compact` CHECKPOINT 0-A COMPLETE**

---

## PHASE 0-B: CRITICAL BUG FIXES + SAFETY P0s (7 units in 3 sessions + 1 agentic safety session)

**AGENTIC PATTERNS INTEGRATION (from 10-agent analysis of Gulli's "Agentic Design Patterns"):**
Sprint 1 (Safety P0s) inserts here because these are SAFETY-CRITICAL gaps that should be
fixed alongside bug fixes. Source: H:/prism/AGENTIC-PATTERNS-ROADMAP.md

**ARCHITECTURAL NOTE (from architect scrutiny — CRITICAL):** The 3 main pipeline engines
(PrintToProgramPipelineEngine, TurningPrintToProgramEngine, EDMProgramAssemblerEngine)
are self-contained silos with inline KIENZLE_DB, TAYLOR_DB, SPEED_RANGES that bypass
registries. This is the BIGGEST wiring gap in the system. Session 0-B bug fixes should
include refactoring these pipelines from self-contained to delegate-to-registry using
the lazy-import pattern from QuoteToShipOrchestratorEngine. Without this, Phase 0-D
registry wiring has no effect on the main pipelines. The circular dependency barrier
(mentioned in PrintToProgramPipelineEngine line 23) is solved by dynamic import().

---

### SESSION 0-B-1: Threading + Facing Fixes (U07-U08)
```
SMART CONFIG: Role=CNC programmer + physics | OPUS | HIGH
UNITS: U07 (multi-start threading), U08 (facing G72)
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - Machinery's Handbook Ch.31 — multi-start thread geometry (lead = pitch × starts)
  - ISO 261/262 — metric thread specifications, minor/major/pitch diameter formulas
  - Fanuc 0i-TD programming manual — G76 threading cycle: P/Q/R/X/Z parameters
  - Haas NGC manual — G76 differences from Fanuc (Q in mm not microns)
  - src/engines/ThreadingPipelineEngine.ts — current threading implementation
  - src/engines/TurningPrintToProgramEngine.ts — facing G72 cycle
  - G72 canned cycle specification — Fanuc pattern repetition format

INTENT:
  Multi-start threading that generates only 1 G76 block = thread won't fit the nut.
  A 2-start M16×2 thread has 4mm lead, and the program needs 2 G76 blocks offset
  by 180° (C0/C180 or phase shift). Facing G72 that doesn't generate = no facing pass.
  These are bugs machinists will hit on the FIRST program they try to run.

SKILLS TO USE:
  /gcode                   — quick G-code snippet verification
  /physics-verify          — physics consistency after fix
  /test                    — smart test runner

WORK:
  U07: Fix multi-start threading (only generates 1 G76 block)
  U08: Fix facing G72 generation
  Create regression tests for each fix

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for regression protection + MCP action for fixed functionality + /gcode verification skill
EXIT GATE: ✓ Both bugs fixed + regression tests + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-B-2: MillTurn Crash + Routing (U09-U10)
```
SMART CONFIG: Role=CNC programmer + pipeline architect | OPUS | HIGH
UNITS: U09 (MillTurn assembleProgram), U10 (routing fix)

KNOWLEDGE SOURCES:
  - src/engines/MillTurnSwissPipelineEngine.ts — the crash is at line 543 (assembleProgram dispatched but never implemented)
  - src/engines/QuoteToShipOrchestratorEngine.ts — routes to wrong pipeline for EDM/laser/waterjet
  - src/engines/MultiProcessCAMBridgeEngine.ts — inline handlers instead of lazy-load orchestrators
  - Mazak Integrex programming guide — mill-turn program structure (multi-channel, sync codes)
  - EDMQualityOrchestratorEngine — the CORRECT 20-stage entry point for wire EDM routing

INTENT:
  assembleProgram() crash = mill-turn pipeline is 100% broken. Any mill-turn job fails at runtime.
  Wrong routing = EDM jobs get sent to milling pipeline = nonsense output. A shop that machines
  a part requiring turning + milling + EDM gets the wrong pipeline for 1 of 3 operations.

SKILLS TO USE:
  /trace — wiring chain verification
  /test — affected test runner

WORK:
  U09: Fix MillTurn assembleProgram() crash (method dispatched but never implemented)
  U10: Fix pipeline routing (QuoteToShip + MultiProcessCAMBridge route all 9 machine types)
  Create regression tests

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for routing validation + MCP action prism_cam:route_program + skill enhancement
EXIT GATE: ✓ Both fixed + tests + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-B-3: Physics + Robustness Fixes (U11-U13)
```
SMART CONFIG: Role=cutting science + safety | OPUS | MAX
UNITS: U11 (Kienzle approach angle), U12 (robustness weight), U13 (grooving G75 Q)

KNOWLEDGE SOURCES:
  - src/physics/constants.ts — canonical Kienzle kc1.1 values + approach angle correction factors
  - Sandvik "Metal Cutting Technical Guide" — Kienzle approach angle correction table (κr effect on chip thickness)
  - src/engines/PipelineDecisionOrchestratorEngine.ts — robustness weight in scoring
  - Fanuc G75 grooving cycle spec — Q parameter = peck amount (NOT Q5000 = 5 meters!)
  - Machining Data Handbook — grooving recommended peck depths by material

INTENT:
  Kienzle without approach angle correction overestimates force by 15-30% for non-90° tools.
  That means S/F is too conservative = longer cycle time = money wasted. Robustness weight
  wrong = decisions favor fragile strategies over robust ones. G75 Q wrong = grooving tool
  pecks 5 meters instead of 5mm = machine alarm or crash.

SKILLS TO USE:
  /physics-verify          — verify Kienzle fix against canonical
  /calibrate               — compare to published data
  /test                    — run affected physics tests

WORK:
  U11: Fix Kienzle approach angle correction
  U12: Fix robustness weight in decision scoring
  U13: Fix grooving G75 Q parameter generation
  Create regression tests for each

  /prism-review with physics-reviewer agent

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for physics constant validation + MCP action prism_calc:kienzle_verify + /physics-verify enhancement
EXIT GATE: ✓ All 3 fixed + physics verified + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-B-SAFETY: Agentic Safety P0s + Quick Wins (from Agentic Patterns Sprint 1)
```
SMART CONFIG: Role=safety engineer + MCP protocol specialist | OPUS | MAX
UNITS: U-SAFE1, U-SAFE2

KNOWLEDGE SOURCES:
  - H:/prism/AGENTIC-PATTERNS-ROADMAP.md — Sprint 1 table (7 items, ~400 LOC)
  - src/hooks/SafetyQualityHooks.ts — existing safety hooks (has enabled property bypass!)
  - src/middleware/crossFieldPhysics.ts — CHECK 1 only fires for superalloy/soft, not medium/hard
  - src/mcp/agentConfig.ts — subagent definitions for A2A Agent Card
  - 6 bypass paths identified by safety expert (auth disabled=admin, STDIO=admin, etc.)

INTENT:
  10-agent analysis of Gulli's "Agentic Design Patterns" found P0 safety gaps:
  (1) No operator confirmation gate for G-code output — safety hooks validate bounds
  but can't validate context (right tool loaded? part clamped? WCS probed?).
  (2) Cross-field physics missing medium/hard material checks — 4140, 1045, 304SS
  (the most common job shop materials) have ZERO force plausibility validation.
  (3) Machine limits optional in safety calcs — without them, 60K RPM generic cap applies.
  These are the highest-ROI items from the book analysis (ROI 4.67-6.50).

WORK:
  U-SAFE1: Safety P0 fixes (~200 LOC)
    - Operator confirmation gate: HITL pause between PRISM recommendation and machine execution
      with structured operator checklist (tool loaded? offset probed? clamp verified?)
    - Extend crossFieldPhysics.ts: add medium (Fc 1000-8000N) and hard (Fc 2000-15000N) ranges
    - Make machine limits required OR emit "NOT MACHINE-VALIDATED" warning prominently
    - Add calculation audit trail: log full input/intermediate/output for safety-critical calcs
    - Close 6 bypass paths: guard against disabling safety hooks, validate unknown materials
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-SAFE2: MCP/Protocol quick wins (~250 LOC)
    - Confidence-based operator escalation: when AtomicValue.confidence < 0.5, require operator review
    - A2A Agent Card at /.well-known/agent.json (built from PRISM_SUBAGENTS — 5 agents)
    - Scoped state prefixes (user:/app:/temp:) — prevents multi-operator state collisions
    - Action-level completions for prism_calc (1,130+ actions need autocomplete on action param)
    → 4-LOOP with MULTI-ROLE SCRUTINY

EXIT GATE: ✓ Operator gate fires on G-code output + cross-field covers medium/hard + machine limits required + A2A card serves
```

**`/compact` → new session**

---

### SESSION 0-B-SECURITY: Security Hardening (from 10-agent exploration + security audit)
```
SMART CONFIG: Role=security engineer + compliance specialist | OPUS | MAX
UNITS: U-SEC1, U-SEC2

KNOWLEDGE SOURCES:
  - AGENTIC-PATTERNS-ROADMAP.md — 6 bypass paths identified by safety expert
  - src/mcp/auth.ts, authMiddleware.ts — OAuth 2.1, RBAC, in-memory tokens
  - src/engines/ComplianceEngine.ts — ITAR framework (template only, no DB enforcement)
  - src/engines/AuditEngine.ts — in-memory 50K cap audit log
  - src/db/schema.sql — unencrypted PII fields

INTENT:
  6 auth bypass paths confirmed by security audit. In-memory tokens lost on restart.
  No encryption at rest for customer/pricing data. FDA 21 CFR 11 compliance gap.
  ITAR framework exists as template but not enforced at DB layer. Fix all before production.

WORK:
  U-SEC1: Close 6 auth bypass paths (~250 LOC)
    - Auth disabled=admin: require explicit --unsafe-auth flag + startup warning
    - Stdio auto-admin: log admin grant, require --admin flag for write operations
    - Safety hooks disableable: mark critical hooks as immutable (no toggle)
    - Unknown materials bypass: emit WARNING + use worst-case ISO group (not silent skip)
    - No schema=pass-through: log unvalidated actions prominently
    - Cross-field physics: add medium (Fc 1000-8000N) and hard (Fc 2000-15000N) ranges
    → 4-LOOP with MULTI-ROLE SCRUTINY → /compact

  U-SEC2: Compliance infrastructure (~250 LOC)
    - Database-backed audit logging (replace in-memory 50K cap)
    - Field-level encryption for customer PII + pricing data in schema.sql
    - ITAR flag enforcement at DB layer (itar_controlled → encrypted + access-controlled)
    - Calculation audit trail: log material, physics path, safety score before returning
    - Token persistence: file-backed or DB-backed (not volatile in-memory)
    → 4-LOOP with MULTI-ROLE SCRUTINY → /compact

  U-SEC3: Server-side validation layer — client-agnostic enforcement (~300 LOC)
    - Build MCP action validation middleware that fires on EVERY dispatcher call
    - Replicate critical CLI hook logic at the server level:
      - Constants validation: reject/warn if action params contain inline kc1.1 values
      - Material sanity: reject unknown materials with helpful suggestion instead of silent skip
      - Machine limits: require machine context or emit "NOT MACHINE-VALIDATED" warning
      - Cross-field physics: validate force/speed plausibility for all ISO groups
      - Output validation: no NaN, no negative force, no impossible speeds in results
    - This makes enforcement work for ANY client (CLI, Desktop, API, external agents)
    - Wire as Express middleware before dispatcher routing
    - Log all validation failures to audit trail
    → 4-LOOP with MULTI-ROLE SCRUTINY → /compact

EXIT GATE: ✓ All 6 bypasses closed + audit log persistent + PII encrypted + ITAR enforced + server-side validation on all MCP actions
```

**`/compact` CHECKPOINT 0-B COMPLETE**

---

## PHASE 0-C: TEST INFRASTRUCTURE HARDENING (6 units in 3 sessions + 2 additional sessions)

---

### SESSION 0-C-1: Fix Anti-Patterns + Pipeline Validator + Golden Snapshots (U-TEST1, U-TEST2)
**ADDITION (test engineer scrutiny — CRITICAL):** U-TEST1 must ALSO build golden snapshot
infrastructure: tests/golden-snapshots/ directory structure, snapshot save/load utilities,
tolerance-aware coordinate comparison engine (±0.1mm coords, ±5% S/F, ±10% cycle time),
snapshot versioning when physics models change. Phase 12 DEPENDS on this infrastructure
but no session was building it. Also: parseGCode() utility needs its OWN test suite —
6 controller dialects × 10+ G-code constructs = 60+ parse test cases minimum.
Also: build checkpoint smoke test vitest files (checkpoint-N-smoke.test.ts) that can be
run at each CHECKPOINT gate to catch inter-phase regressions automatically.
```
SMART CONFIG: Role=test quality engineer + pipeline architect | OPUS | MAX
UNITS: U-TEST1, U-TEST2
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - All test files: src/__tests__/*.test.ts, tests/*.ts — grep for anti-patterns
  - Vitest documentation — proper assertion patterns (expect().toBe, toBeCloseTo, toMatchObject)
  - G-code syntax per controller — needed for parseGCode() utility design
  - Pipeline stage definitions from CAMX-PIPELINE-ENGINE-MATRIX.md — 14 stages with I/O types

INTENT:
  A test that says `expect(output.includes("G83") || true).toBe(true)` ALWAYS passes.
  It could return "Hello World" and still pass. After this session, every test that validates
  G-code checks ACTUAL coordinates and parameters, not just keyword presence. The
  parseGCode() utility makes this easy for all future tests: extract X/Y/Z values, S/F
  values, tool numbers — then compare to expected physics-computed values.

SKILLS TO USE:
  /forge-tests scan        — test gap discovery
  /test                    — run affected tests after changes

HOOKS ESPECIALLY RELEVANT:
  PostToolUse test quality  — will BLOCK any new || true patterns

WORK:
  U-TEST1: Audit and fix ALL || true and keyword-only assertions
    grep for || true → FIX ALL
    grep for .includes( in assertions → upgrade to parametric where appropriate
    Create parseGCode() utility: src/__tests__/helpers/gcode-parser.ts

  U-TEST2: Define 14-stage pipeline validation matrix
    Create src/__tests__/helpers/pipeline-stage-validator.ts
    14 stages with input/output types + validation functions
    Pipeline test harness chains all 14

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for test quality enforcement + MCP action prism_calc:parse_gcode + /test enhancement
EXIT GATE: ✓ ZERO || true + parseGCode + 14-stage validator + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-C-2: Cross-Material Ranges + Controller Assertions (U-TEST3, U-TEST4)
```
SMART CONFIG: Role=manufacturing domain expert + CNC controller specialist | OPUS | MAX
UNITS: U-TEST3, U-TEST4
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - Sandvik Coromant General Turning catalog — Vc/fz ranges per ISO group + alloy
  - Kennametal NOVO database — alternative S/F data for cross-reference
  - Fanuc 0i/31i programming manual — G83 peck drill syntax
  - Siemens 840D programming manual — CYCLE83 syntax
  - Heidenhain iTNC 530 manual — CYCL DEF 200 drilling syntax
  - Haas NGC programming manual — G83 Q in mm (not microns like Fanuc)
  - Mazak Mazatrol/EIA programming — Mazak-specific drill cycle
  - Okuma OSP-P programming — Okuma-specific syntax

INTENT:
  If PRISM says Vc=500 m/min for titanium, the tool melts. If it says Vc=50 for aluminum,
  the cycle takes 10× longer than it should. Published ranges from Sandvik/Kennametal are
  the ground truth — our tests must verify output falls WITHIN these ranges. Controller
  assertion library means every future G-code test can say `assertFanucPeckDrill(gcode,
  {depth: -25, peck: 5, retract: 2, feed: 150})` instead of `expect(gcode.includes("G83"))`.

SKILLS TO USE:
  /material-lookup         — verify material properties against database
  /defaults                — check S/F defaults against ranges

WORK:
  U-TEST3: Create cross-material S/F range tables
    src/__tests__/fixtures/material-sf-ranges.ts
    15+ alloys with Vc/fz/ap ranges from Sandvik + Kennametal published data
    assertSFInRange() helper function

  U-TEST4: Create controller dialect assertion library
    src/__tests__/helpers/controller-assertions.ts
    6 controller families × 10+ operation types
    assertFanucPeckDrill(), assertSiemensCycle83(), etc.

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for S/F range validation + MCP action prism_calc:validate_sf_range + /defaults enhancement
EXIT GATE: ✓ Range table + assertion library + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-C-3: Negative Tests + Parameter Sanity (U-TEST5, U-TEST6)
```
SMART CONFIG: Role=QA engineer + manufacturing domain expert | OPUS | HIGH
UNITS: U-TEST5, U-TEST6
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - Machining Data Handbook — physical limits by material/operation
  - Sandvik "Troubleshooting Guide" — common machining failures and root causes
  - ISO 1302 — surface roughness designation limits
  - Machine specifications (MachineRegistry) — travel limits, RPM max, power max
  - Tool geometry limits — ap < 3×D (physically impossible otherwise), ae ≤ D

INTENT:
  A machinist enters "-5mm depth" or "HRC 100 hardness" or "10m peck depth". Does PRISM
  crash, return garbage, or give a clear error message? Every edge case a real user might
  enter must produce a helpful response, not a stack trace. The parameter sanity guard
  catches impossible values BEFORE they reach physics engines — catching bugs like the
  5-axis G83 Q5000 (5-meter peck depth) that made it into production code.

SKILLS TO USE:
  /test                    — run full negative test battery
  /forge-tests             — verify test gap closure

WORK:
  U-TEST5: Create negative/error input test battery
    50+ negative test cases across material/dims/machine/tool/tolerance/features
    Every error message must be ACTIONABLE

  U-TEST6: Create parameter sanity guard
    src/__tests__/helpers/parameter-sanity.ts
    Physical limits: feed_per_rev_max=5mm, Vc_steel_max=500m/min, Q_max=50mm, etc.
    Applied to all 9 pipeline outputs
    Catches bugs like 5-axis G83 Q5000

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for parameter sanity enforcement + MCP action prism_calc:validate_params + /defaults enhancement
EXIT GATE: ✓ 50+ negative tests + sanity guard + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-C-AGENTIC: Agentic Testing Patterns (from Agentic Patterns Sprint 3)
```
SMART CONFIG: Role=test engineer + evaluation specialist | OPUS | HIGH
UNITS: U-ATEST1, U-ATEST2

KNOWLEDGE SOURCES:
  - H:/prism/AGENTIC-PATTERNS-ROADMAP.md — Sprint 3 table (4 items, ~600 LOC)
  - Gulli Ch.19: Evaluation and Testing (trajectory evaluation, LLM-as-Judge)
  - src/__tests__/helpers/engineTestHarness.ts — existing test infrastructure

INTENT:
  Standard unit tests verify engine OUTPUTS but never validate the SEQUENCE of engine calls
  orchestrators produce. If SpeedFeedOrchestratorEngine skips the safety check step, unit
  tests on the final output might still pass. Trajectory evaluation catches this.

WORK:
  U-ATEST1: Trajectory evaluation + golden baseline drift (~350 LOC)
    - TrajectoryRecorder: records sequence of engine calls during orchestrator execution
    - Expected trajectory definitions for top 5 orchestrators (SpeedFeed, PostProcessor,
      QuoteToShip, PrintToProgram, TurningPrintToProgram)
    - Test: actual call sequence matches expected trajectory within tolerance
    - Golden baseline drift detection: versioned output snapshots, alert on drift beyond tolerance
    → 4-LOOP

  U-ATEST2: Published data accuracy + safety fuzz (~250 LOC)
    - Published data accuracy tests: compare PRISM predictions against Sandvik/Walter/Kennametal
      catalog values (tolerance: ±15% for force, ±20% for feed)
    - Safety combinatorial fuzz tests: randomized parameters near boundaries, verify safety gates
      never pass dangerous values (RPM > machine max, force > tool TRS, deflection > tolerance)
    → 4-LOOP

EXIT GATE: ✓ Trajectory eval catches skipped safety steps + golden baselines for 5 orchestrators + fuzz finds 0 bypass
```

**`/compact` → new session**

---

### SESSION 0-C-REALDATA: Real-World Validation Data Collection (42+ parts)
```
SMART CONFIG: Role=CNC instructor + validation engineer | OPUS | MAX
UNITS: U-DATA1, U-DATA2

KNOWLEDGE SOURCES:
  - data/docs/haas-lathe-workbook-full.txt, haas-mill-workbook-full.txt (OCR'd)
  - data/docs/sandvik-general-turning-full.txt, sandvik-general-milling-full.txt
  - data/docs/walter-turning-full.txt, walter-milling-full.txt
  - H:\prism\BOX\PART MODELS FOR LEARNING ENGINE\ (33 STEP files)
  - H:\prism\HYPERMILL\doc\33.0\PDF\CAM\CAM_Manual-en-US.pdf (1632pp tutorials)
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md

INTENT:
  Every machining test must be verifiable against REAL parts. This session collects
  reference data from manufacturers, training manuals, and published test cuts.
  Phase A MATCHES reference programs. Phase B IMPROVES upon them — proving PRISM
  adds value beyond reproduction.

WORK:
  U-DATA1: Harvest reference data from all sources (~300 LOC)
    PER MACHINE TYPE minimum:
      TURNING: 10 parts (5 Haas workbook + 3 Sandvik + 2 handbook)
      MILLING: 10 parts (5 Haas workbook + 3 Sandvik + 2 hyperMILL tutorials)
      5-AXIS: 5 parts (2 hyperMILL + 2 benchmarks + 1 STEP model)
      GRINDING: 3 parts (Studer examples + Malkin textbook)
      EDM: 5 parts (3 benchmarks + 2 Makino)
      LASER: 3 parts (TRUMPF app notes)
      WATERJET: 3 parts (OMAX data + Zeng-Kim)
    For EACH: extract {print/CAD, material, tools, expected S/F, expected G-code, measured results}
    Store in: tests/golden-snapshots/real-world/{source}/{part}/
    → /compact after turning+milling (20 parts)

  U-DATA2: Match-then-improve validation framework (~300 LOC)
    Phase A — MATCH: run reference through PRISM, compare ±10% S/F, ±0.1mm coords
    Phase B — IMPROVE: full optimization (fusion Tier 3, per-block variability, chatter avoidance,
      probing injection, thermal compensation)
    Improvement report: "Original: 23.4 min. PRISM Optimized: 19.1 min (-18%), Ra improved -25%"
    Store in: tests/real-world-validation/
    → /compact

EXIT GATE: ✓ 42+ parts harvested + match framework validates ±10% + improvement report generates
```

**`/compact` CHECKPOINT 0-C COMPLETE**

---

## PHASE 0-D: REGISTRY + ALGORITHM + ORPHAN WIRING (20 units in 7 sessions)

---

### SESSION 0-D-1: Wire ToolpathStrategy + Material Registries (U-REG1, U-REG2)
**CAM ENGINEER SCRUTINY NOTES:**
- Per-CAM strategy engines (Mastercam, hyperMILL, SolidCAM, NX, etc.) return static parameters
  with NO physics validation. Each must call physics layer to verify ae/ap/Vc won't exceed
  force/chatter/deflection limits for the specific material+tool. Currently Inconel gets same
  generic ae_pct as aluminum.
- ToolpathStrategyRegistry (762 strategies) lacks per-CAM-system tags — system may recommend
  a strategy the user's CAM software cannot execute.
- hyperMILL base tips file is MISSING (only hypermill-cam-tips-ext.ts exists with 83 MAXX/5X tips).
  Need to create hypermill-cam-tips.ts covering 2D/3D cycle strategies from the 1632-page manual.
- 50+ "PRISM Novel Invention" strategies are unvalidated — flag with "theoretical_only" confidence
  tag until validated against measured cutting data in Phase 12.
```
SMART CONFIG: Role=pipeline architect + toolpath specialist | OPUS | MAX
UNITS: U-REG1, U-REG2
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - src/registries/ToolpathStrategyRegistry.ts — 752 strategies (the FULL database)
  - src/engines/OptimalStrategySelectionEngine.ts — has only 28-entry private STRATEGY_DB
  - src/registries/MaterialRegistry.ts — 1,662 lines of material properties
  - src/engines/SpeedFeedOrchestratorEngine.ts — has only 13-material inline table
  - Sandvik material classification — ISO P/M/K/N/S/H group mappings
  - hyperMILL materials catalog — 2,544 entries with machinability corrections

INTENT:
  OptimalStrategy currently evaluates 28 strategies. The registry has 752. That's like
  having a library of 752 books but only reading 28. After this session, complex pockets
  in Inconel get evaluated against ALL available strategies — including niche ones like
  "barrel cutter lens surface" or "plunge roughing for deep cavities" that the 28-entry
  table doesn't know about. Similarly, SFO's 13-material table misses alloy-specific
  properties — 4140 at 28 HRC vs 4140 at 42 HRC have VERY different kc1.1 values.

SKILLS TO USE:
  /forge-wiring            — verify wiring completeness
  /trace                   — confirm query chain works
  /registry-browse         — explore registry contents

WORK:
  U-REG1: Wire ToolpathStrategyRegistry (752) into OptimalStrategySelection
    Replace 28-entry private STRATEGY_DB with registry query as primary source
  U-REG2: Wire MaterialRegistry (1,662L) into SpeedFeedOrchestrator
    Replace 13-material inline MATERIAL_DB with registry query

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for registry query validation + MCP action prism_cam:strategy_search + /registry-browse enhancement
EXIT GATE: ✓ Registries queried + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-2: Wire Remaining Registries (U-REG3, U-REG4, U-REG5)
```
SMART CONFIG: Role=pipeline architect | OPUS | HIGH
UNITS: U-REG3, U-REG4, U-REG5 (3 units — lighter)
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/registries/FormulaRegistry.ts — 499 formulas with equations, variables, units, provenance
  - src/registries/CoatingRegistry.ts — coating properties by ISO group
  - src/registries/CoolantRegistry.ts — coolant types with thermal/lubricity properties
  - src/registries/PostProcessorRegistry.ts — post configs per controller
  - src/registries/AlgorithmRegistry.ts — 50 algorithms cataloged
  - src/registries/MachineRegistry.ts — machine profiles database
  - src/registries/ToolRegistry.ts — index into 95K tool catalog

INTENT:
  Formula provenance = when PRISM says "Ra = 0.32μm", the output includes "calculated
  using fz²/32r per ISO 4287" — the machinist can VERIFY the formula. Coating registry
  wiring means CoatingSelectionEngine queries ALL coatings, not its 5-entry hardcoded list.
  After this session, ALL 11 registries are live data sources instead of dead databases.

SKILLS TO USE:
  /forge-wiring, /trace, /registry-browse

WORK:
  U-REG3: Wire FormulaRegistry into physics (formula provenance in output)
  U-REG4: Wire CoatingRegistry + CoolantRegistry + PostProcessorRegistry
  U-REG5: Wire AlgorithmRegistry + MachineRegistry + ToolRegistry

  /prism-review after all 3

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for formula provenance in output + MCP action prism_calc:formula_lookup + /formula-browse enhancement
EXIT GATE: ✓ 11/11 registries + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-3: Wire CWE + Stability Algorithms (U-ALG1, U-ALG2)
**CRITICAL PHYSICS FIX (from physicist scrutiny):** The canonical kienzleForce() in constants.ts
uses fz directly as chip thickness h. In milling, actual h = fz × sin(arccos(1 - ae/R)).
At ae < D, every milling force prediction is biased. This session MUST also fix the Kienzle
function to accept actual chip thickness (from CWE Z-buffer) instead of raw fz. Both the
force model AND the feed rate must be corrected: force uses actual h, feed compensates via
chip-thinning factor. Also add rake angle correction: K_gamma = 1 - 0.01×(gamma - gamma_ref).
```
SMART CONFIG: Role=cutting science + vibration analysis | OPUS | MAX
UNITS: U-ALG1, U-ALG2 (heavy physics)
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - src/algorithms/CWEZBuffer.ts — cutter workpiece engagement via Z-buffer
  - src/algorithms/StabilityLobeDiagram.ts — classic chatter prediction
  - src/algorithms/FRFStabilityLobe.ts — frequency response function SLD
  - src/algorithms/RCSA.ts — receptance coupling substructure analysis
  - Altintas "Manufacturing Automation" Ch.4-5 — SLD theory, FRF, RCSA math
  - Published FRF data for common spindle/holder combos (BT40, HSK-A63, CAT50)
  - InstantaneousEngagementEngine — current analytical engagement (upgrade target)

INTENT:
  Current per-block S/F uses simple analytical engagement (works for straight cuts,
  fails for curved walls and rest stock). CWE Z-buffer gives EXACT engagement for any
  geometry. Current chatter prediction uses simplified cantilever beam — ignoring holder
  and spindle dynamics. RCSA models the FULL assembly (tool + holder + spindle). After
  this session, a 10mm endmill in a BT40 holder produces DIFFERENT stable zones than
  the same endmill in an HSK-A63 — because the assembly dynamics are different.

SKILLS TO USE:
  /algorithm-inspect       — inspect algorithm implementation
  /physics-verify          — verify physics correctness
  /what-if                 — delta analysis with/without new algorithms

WORK:
  U-ALG1: Wire CWEZBuffer into per-block S/F (complex geometry upgrade)
  U-ALG2: Wire StabilityLobeDiagram + FRFStabilityLobe + RCSA
    Full assembly dynamics for chatter prediction

  /prism-review with physics-reviewer

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for CWE engagement validation + MCP action prism_calc:cwe_engagement + /spindle-optimize enhancement
EXIT GATE: ✓ CWE + assembly dynamics + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-4: Wire Optimization + Roughing Algorithms (U-ALG3, U-ALG4, U-ALG5)
```
SMART CONFIG: Role=optimization + manufacturing | OPUS | HIGH
UNITS: U-ALG3, U-ALG4, U-ALG5
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/algorithms/AntColonyTSP.ts — TSP solver for tool change sequence
  - src/algorithms/DPMultiPass.ts — dynamic programming for roughing pass optimization
  - src/algorithms/GeneticOptimizer.ts — genetic algorithm for parameter space search
  - src/algorithms/ParticleSwarm.ts — particle swarm optimization
  - ToolChangeOptimizationEngine + IntelligentSequencingEngine — wire targets for TSP
  - Research: "Optimization of cutting parameters" — joint {Vc,fz,ap,ae} search theory

INTENT:
  Tool change sequence for a 15-tool job: greedy = 45 seconds of turret travel, TSP = 28
  seconds. That's 17 seconds per part × 1000 parts = 4.7 hours saved. DPMultiPass finds
  the OPTIMAL number of roughing passes — not "3 passes at equal depth" but maybe "2 heavy
  + 1 light" which is 20% faster. Joint S/F optimization searches the FULL parameter space
  instead of solving Vc, fz, ap, ae independently (which misses interaction effects).

SKILLS TO USE:
  /algorithm-inspect, /forge-wiring, /trace

WORK:
  U-ALG3: Wire AntColonyTSP for tool change optimization (>10 tool jobs)
  U-ALG4: Wire DPMultiPass for roughing depth optimization
  U-ALG5: Wire GeneticOptimizer + ParticleSwarm for joint S/F optimization

  /prism-review after all 3

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for TSP solution validation + MCP action prism_calc:optimize_sequence + /cycle-time-crush enhancement
EXIT GATE: ✓ 3 optimization algorithms + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-5: Wire Monitoring + Chip Algorithms (U-ALG6, U-ALG7)
```
SMART CONFIG: Role=monitoring + chip mechanics | OPUS | HIGH
UNITS: U-ALG6, U-ALG7
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - src/algorithms/FFTAnalyzer.ts — frequency-domain vibration analysis
  - src/algorithms/STFTChatter.ts — time-frequency chatter onset detection
  - src/algorithms/WaveletBreakage.ts — tool breakage signature detection
  - src/algorithms/ChipBreakingModel.ts — chip form prediction (continuous/segmented/broken)
  - src/algorithms/ChipEvacuationModel.ts — chip clearance in deep features
  - src/algorithms/ChipVolumeRate.ts — volumetric chip rate → coolant flow requirement
  - Published chatter frequency data for common tool/material combinations

INTENT:
  Programs include monitoring comments: `(EXPECTED FORCE: 1200N, ALARM AT: 1800N)`.
  A machine with monitoring can auto-stop before tool breakage. Chip breaking model
  modifies feed when continuous chips are predicted (wrap around workpiece = crash).
  Deep hole peck depth is calculated from chip evacuation model, not arbitrary rules.
  Coolant flow rate matched to actual chip volume production rate.

SKILLS TO USE:
  /algorithm-inspect, /forge-wiring

WORK:
  U-ALG6: Wire FFTAnalyzer + STFTChatter + WaveletBreakage for monitoring thresholds
  U-ALG7: Wire ChipBreakingModel + ChipEvacuationModel + ChipVolumeRate

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for monitoring threshold validation + MCP action prism_calc:chip_analysis + /process-health enhancement
EXIT GATE: ✓ Monitoring + chip control + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-6: Wire Learning Algorithms + Material Engines (U-ALG8, U-MAT1, U-MAT2)
```
SMART CONFIG: Role=machine learning + materials science | OPUS | HIGH
UNITS: U-ALG8, U-MAT1, U-MAT2
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/algorithms/KalmanFilter.ts — state estimation from noisy sensor data
  - src/algorithms/ExtendedTaylorModel.ts — variable-Vc tool life (not just constant cutting)
  - src/algorithms/BayesianWearModel.ts — probabilistic wear updating from measurements
  - src/engines/SuperalloyMachiningEngine.ts — Inconel/Hastelloy/Waspaloy specific physics
  - src/engines/CeramicsMachiningEngine.ts — brittle fracture, diamond tooling, no coolant
  - src/engines/MagnesiumMachiningEngine.ts — FIRE RISK with water-based coolant
  - Published Inconel 718 cutting data — notch wear, work hardening, thermal damage thresholds

INTENT:
  Learning loop: machine runs a program → actual force/wear data comes back → KalmanFilter
  estimates true state → ExtendedTaylor recalculates remaining tool life → BayesianWear
  updates model → next program uses BETTER predictions. This is how PRISM gets smarter
  over time. Superalloy engine means Inconel parts get ceramic insert recommendations and
  notch-wear-aware speeds (not the generic ISO S table). Magnesium engine PREVENTS fire
  by blocking water-based coolant — this is a SAFETY-CRITICAL material handler.

SKILLS TO USE:
  /algorithm-inspect, /forge-wiring, /material-lookup

WORK:
  U-ALG8: Wire KalmanFilter + ExtendedTaylorModel + BayesianWearModel (learning loop)
  U-MAT1: Wire SuperalloyMachiningEngine into ISO S handling
  U-MAT2: Wire CeramicsMachiningEngine + MagnesiumMachiningEngine

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for learning loop data validation + MCP action prism_calc:wear_predict + /wear-analysis enhancement
EXIT GATE: ✓ Learning loop + exotic materials + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-7a: Wire Composites + Orphans (U-MAT3, U-MAT4)
```
SMART CONFIG: Role=composites specialist + process planner | OPUS | HIGH
UNITS: U-MAT3, U-MAT4 (split from original 5-unit session for quality)
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - src/engines/CompositesMachiningPhysicsEngine.ts — CFRP/fiberglass delamination physics
  - src/engines/WorkholdingSurfaceInferenceEngine.ts (E1085) — orphaned, needs wiring
  - src/engines/QuoteToShipOrchestratorEngine.ts (E1086) — orphaned, needs wiring
  - src/engines/HoningProcessEngine.ts — precision bore finishing (Ra 0.1-0.4μm)
  - src/engines/GrindingWheelDressingOptimizationEngine.ts — dressing parameter optimization
  - src/engines/ScrapRootCauseEngine.ts + ToolSubstitutionRiskEngine.ts — feedback loop
  - Composites machining literature — delamination-safe feed/speed, fiber direction effects

INTENT:
  Composites use COMPLETELY different physics (no thermal damage from cutting — matrix melts
  instead; delamination risk replaces chatter; diamond-coated tools mandatory; dust extraction
  instead of coolant). Two of our own CAMX engines (E1085, E1086) are orphaned — we built
  them but never wired them to anything! Honing/burnishing are post-machining processes that
  tight-tolerance parts NEED — auto-suggesting them when Ra < 0.2μm required. Tool
  substitution risk assessment prevents quality problems when crib tool ≠ catalog best.

SKILLS TO USE:
  /forge-wiring, /trace, /unwired-review

WORK:
  U-MAT3: Wire CompositesMachiningPhysicsEngine
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-MAT4: Wire orphaned CAMX engines (E1085 Workholding, E1086 QuoteToShip)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for orphan detection + MCP action prism_cam:composite_check + /feasibility-check enhancement
EXIT GATE: ✓ Composites + orphans + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-7b: Wire Process Engines (U-PROC1, U-PROC2, U-PROC3)
```
SMART CONFIG: Role=process planner + finishing specialist | OPUS | HIGH
UNITS: U-PROC1, U-PROC2, U-PROC3
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - src/engines/HoningProcessEngine.ts — precision bore finishing (Ra 0.1-0.4μm)
  - src/engines/BurnishingPolishingEngine.ts — VERIFY EXISTS in codebase before wiring
  - src/engines/GrindingWheelDressingOptimizationEngine.ts — dressing parameters
  - src/engines/ScrapRootCauseEngine.ts + ToolSubstitutionRiskEngine.ts — feedback loop
  - MachiningPlaybookEngine — post-machining finishing rules

INTENT:
  Honing/burnishing are what machinists use when turning/grinding can't hit the tolerance.
  Bore at ±0.001mm needs honing. Surface at Ra 0.1μm needs burnishing. PRISM should
  auto-suggest these when tolerance requirements exceed primary operation capability.
  Tool substitution risk prevents quality surprises when using a crib tool instead of catalog best.

WORK:
  U-PROC1: Wire HoningProcessEngine + BurnishingPolishingEngine (verify exists first — W3)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-PROC2: Wire GrindingWheelDressingOptimizationEngine
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-PROC3: Wire ScrapRootCauseEngine + ToolSubstitutionRiskEngine + WearCompensationEngine (M5)
    Include: progressive radial offset as VB increases — wear-compensated toolpath generation
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for finishing recommendation trigger + MCP action prism_cam:suggest_finishing + /secondary-ops enhancement
EXIT GATE: ✓ Process engines + wear compensation + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 0-D-FUSION-1: Physics Fusion Types + Plugin Registry (U-FUS-T1, U-FUS-T2)
```
SMART CONFIG: Role=numerical methods engineer + systems architect | OPUS | MAX
UNITS: U-FUS-T1, U-FUS-T2
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - Plan: C:\Users\Admin.DIGITALSTORM-PC\.claude\plans\playful-frolicking-pudding.md (READ FIRST)
  - src/engines/SpeedFeedOrchestratorEngine.ts — OrchestratorInput/OrchestratorResult interfaces
  - src/engines/ThermalWearCouplingEngine.ts — existing coupled ODE system (RK4)
  - src/engines/KienzleForceModelEngine.ts — force model interface shape
  - src/physics/constants.ts — canonical Kienzle/Taylor/material database
  - src/engines/UncertaintyPropagationPipelineEngine.ts — existing MC/FOSM chain architecture

INTENT:
  Build the FOUNDATION of the Physics Fusion system. A machinist doesn't see this layer
  directly, but every downstream computation depends on it. The plugin interface must be
  right the first time — 24 plugins will implement it. The registry's topological sort
  determines execution order. Get this wrong and everything built on top fails.

WORK:
  U-FUS-T1: PhysicsFusionOrchestrator.types.ts (~300 LOC)
    - PhysicsPlugin interface (descriptor, compute, canRun)
    - PhysicsPluginDescriptor (id, level, min_tier, depends_on, feedback_from, outputs, penalties)
    - PluginContext, PluginOutput, FusionState, ConvergenceConfig interfaces
    - fusion_detail extension for OrchestratorResult
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-FUS-T2: PhysicsPluginRegistry.ts (~500 LOC)
    - Plugin registration + topological sort (feed-forward deps only)
    - feedback_from tracking (separate from topological sort — for convergence engine)
    - getExecutionOrder(available_inputs, tier) → ordered plugin list
    - getSkippedPlugins() → list with confidence penalties
    - Graceful degradation: missing plugin → skip with penalty
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

MULTI-ROLE SCRUTINY (at session exit):
  Launch 3 agents: machinist (will these interfaces capture shop floor reality?),
  physicist (are the dependency declarations physically correct?),
  architect (is the plugin contract extensible without breaking 24 implementations?)

EXIT GATE: ✓ Types compile + Registry topological sort passes 10 test cases + 3-agent scrutiny clean
  ✓ INTERFACE FREEZE GATE: PhysicsFusionOrchestrator.types.ts is LOCKED after this session.
    Any interface change after 0-D-FUSION-2 starts requires mandatory impact analysis on all
    8 downstream fusion sessions. This prevents cascading rework.
```

**`/compact` → new session**

---

### SESSION 0-D-FUSION-2: Convergence Engine (U-FUS-CONV)
**CRITICAL ADDITIONS (numerics + physicist scrutiny, RECONCILED R3):**
- Spectral radius: compute PER-LOOP, not combined. FTW is 3x3 (6 central-diff evals), FES is 2x2 (4 evals),
  FDT is 2x2 (4 evals) = 14 evaluations total. alpha_max = min(0.9, 0.8/max(rho_FTW, rho_FES, rho_FDT)).
  [R3 FIX: was "0.8/rho" unbounded — now capped at 0.9. Was 6x4 non-square — now per-loop square matrices.]
- Convergence acceleration: Anderson acceleration (m=3) is PRIMARY for Tier 3+.
  Broyden quasi-Newton is FALLBACK — activates only if Anderson stalls (residual not decreasing 5+ iters).
  On Broyden activation: init B0=I, rebuild from last 3 (iterate, residual) pairs. Never mix both.
  [R3 FIX: was ambiguous which runs first. Now explicitly: Anderson primary, Broyden fallback.]
- RK4→RK45 upgrade in ThermalWearCouplingEngine: TWO MODES required.
  Trajectory mode (standalone): full adaptive stepping. Convergence slave mode (FTW inner loop):
  adaptive internal steps but interpolate to FIXED reporting grid (dt=1s) for residual comparison.
  [R3 FIX: adaptive stepping creates grid mismatch — Hermite dense output solves this.]
- Temperature model tempFromForce() MUST include material thermal conductivity (k_thermal from constants.ts).
- Central differences: 8 convergence runs (was 4). Reconciled everywhere.
- 20+ convergence tests (was 4). Reconciled in exit gate.
- Oscillation detection: windowed spectral test on last 8 residuals (dominant frequency > 0.25 = oscillation).
  3x/4x heuristics are FALLBACK for early iterations where window not yet full.
  [R3 FIX: was heuristic-only. Now spectral primary, heuristic fallback.]
- MonteCarlo.ts "sensitivity_indices" are R-squared (correlation), NOT true Sobol. Rename to
  "correlation_indices" or implement Saltelli scheme (see StochasticCuttingForceEngine as reference).
- Unscented Transform: for n≥5, use alpha=1.0 (not 1e-3) to avoid W_0 → -10^6 weight explosion.
  Or switch to Cubature Kalman Transform (2n points, equal weights, no negative weights).
- PlungeMillingEngine has inline KC1_VALUES that disagree with canonical by 9-14%. Add to constants sweep.
```
SMART CONFIG: Role=numerical methods specialist + manufacturing physics | OPUS | MAX
UNITS: U-FUS-CONV (1 unit — heavy numerical code)
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - PhysicsFusionOrchestrator.types.ts (from previous session)
  - src/engines/ThermalWearCouplingEngine.ts — existing coupled ODE (FTW inner loop delegate)
  - Altintas "Manufacturing Automation" Ch.3 — stability lobe theory for FES loop
  - Plan convergence section: adaptive relaxation, material-specific alpha, oscillation detection

INTENT:
  This is the mathematical heart of the fusion system. Three nested feedback loops
  (FTW innermost, FES middle, FDT outermost) must converge reliably for ALL materials
  including notoriously difficult titanium and Inconel. If convergence fails silently,
  the machinist gets garbage parameters that break tools. Every failure mode must be
  handled: oscillation, divergence, degenerate solutions.

WORK:
  U-FUS-CONV: PhysicsFusionConvergenceEngine.ts (~1000 LOC)
    - Nested loop structure: for each FDT { for each FES { run FTW to convergence } }
    - Adaptive relaxation: spectral-radius method, material defaults (ISO N=0.85, P/K=0.7, M=0.5, H=0.25, S=0.2)
    - Oscillation detection: residual increase 3x OR sign alternation 4x → halve alpha
    - Divergence handling: best-so-far tracker, degenerate guard (ae/ap < 5% initial)
    - NaN/Infinity guard: replace with last-known-good, halve alpha
    - Convergence status: "converged" | "max_iterations" | "degenerate" | "diverged"
    - Iteration history recording for traceability
    - Under-relaxation damping: F_new = F_old + alpha × (F_computed - F_old)
    → 4-LOOP: SCRUTINIZE (with physics-reviewer agent) → GAP FILL → TIE UP

    UNIT TESTS (critical — convergence must be verified):
    - Steel (ISO P): converge in <8 iterations with alpha=0.7
    - Titanium (ISO S): converge in <15 iterations with alpha=0.2
    - Forced divergence: verify oscillation detection triggers alpha halving
    - Degenerate: impossible tolerance → clean "degenerate" status returned

MULTI-ROLE SCRUTINY:
  physicist (is convergence mathematically guaranteed for each material class?),
  machinist (do the failure messages make sense to a shop floor operator?),
  architect (is the iteration history serializable for checkpoint/resume?)

EXIT GATE: ✓ All 20+ convergence tests pass (all 6 ISO classes + NaN injection + nested loop + mid-loop serialization + oscillation detection) + 3-agent scrutiny clean + /compact
  [RECONCILED R3: was "4 tests" — expanded to 20+ per numerics scrutiny]
```

**`/compact` → new session**

---

### SESSION 0-D-FUSION-3: Orchestrator + Core Plugins + Wiring (U-FUS-ORCH, U-FUS-P5)
```
SMART CONFIG: Role=pipeline architect + CNC programmer | OPUS | MAX
UNITS: U-FUS-ORCH, U-FUS-P5
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - PhysicsFusionOrchestrator.types.ts + PhysicsPluginRegistry.ts + PhysicsFusionConvergenceEngine.ts
  - src/engines/SpeedFeedOrchestratorEngine.ts — delegation point for fusion_tier >= 2
  - src/engines/KienzleForceModelEngine.ts, CuttingTemperatureEngine.ts,
    ToolDeflectionPredictionEngine.ts, ChatterStabilityLobeEngine.ts, SurfaceFinishPredictorEngine.ts
  - Haas Mill Workbook — test input for integration test

INTENT:
  Wire it all together. After this session, a user can call SpeedFeedOrchestrator with
  fusion_tier=2 and get converged multi-model physics instead of single-pass estimates.
  The 5 core plugins wrap the most critical engines. The Jacobian delta mechanism enables
  per-block variability without per-block re-convergence.

WORK:
  U-FUS-ORCH: PhysicsFusionOrchestratorEngine.ts (~1500 LOC)
    - Tier routing (1-4), auto-selection via quality-based scoring
    - Plugin execution via registry topological order
    - Jacobian computation via CENTRAL finite differences (8 extra convergence runs, cached)
      [RECONCILED R3: was "4 runs" — central differences need ±h per input = 2×4 = 8 runs]
    - Jacobian validity threshold: |dx/x| > 0.30 → full re-convergence
    - Per-operation cache integration (ComputationCache, SHA-256 key)
    - FusionState creation/management/serialization
    - EventBus: physics_fusion_completed events
    - Wire fusion_tier into SpeedFeedOrchestratorEngine.OrchestratorInput
    - Extend OrchestratorResult with fusion_detail
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-FUS-P5: 5 core plugin wrappers (~650 LOC)
    - plugins/KienzleForcePlugin.ts (L1, min_tier=1, penalty=0.30)
    - plugins/CuttingTemperaturePlugin.ts (L2, min_tier=2, penalty=0.10)
    - plugins/ToolDeflectionPlugin.ts (L4, min_tier=2, penalty=0.10)
    - plugins/ChatterStabilityPlugin.ts (L5, min_tier=2, penalty=0.12)
    - plugins/SurfaceFinishPlugin.ts (L6, min_tier=1, penalty=0.08)
    → 4-LOOP per plugin

    INTEGRATION TEST: 4140 steel pocket milling at Tier 2
    - Input: material=alloy_steel, tool_dia=12mm, flutes=4, ap=3mm, ae=6mm, machine=VMC-40
    - Expected: Fc ≈ 1773N (kc1.1=2100 for alloy_steel per constants.ts), converge in <5 FDT iterations
      [R3 FIX: was 1519N using generic steel kc1.1=1800. Alloy steel (4140) canonical kc1.1=2100]
    - Verify: per-block Jacobian delta produces S/F variation for corner entry

MULTI-ROLE SCRUTINY:
  machinist (does the integration test input match real shop parameters?),
  physicist (does the Jacobian delta produce physically reasonable corrections?),
  architect (is the cache key correct? does checkpoint/resume work?)

EXIT GATE: ✓ Integration test passes + Tier 1 regression (401 gauntlet tests) + 3-agent scrutiny
  ✓ ALSO (from architect scrutiny): Wire MINIMAL physics_fusion action to calcDispatcher here
    (basic Zod schema, Tier 1-2 callable). Don't wait until 3-FUSION-3 — too long a gap.
  ✓ ALSO: Add lightweight per-block chip-thinning for Tier 1 (ae_actual/ae_nominal feed adjust)
    so novice users get per-block variability without fusion convergence.
  ✓ ALSO: FusionState serialization round-trip test: serialize after op1, deserialize for op2,
    verify Jacobian delta applies correctly, results match fresh compute within 0.1%.
```

**`/compact` → new session**

---

### SESSION 0-D-MACHINE-SYNC: Per-Machine Roadmap Synchronization
```
SMART CONFIG: Role=pipeline architect + documentation | OPUS | HIGH
UNITS: U-SYNC1, U-SYNC2

INTENT:
  8 per-machine roadmaps (6,495 lines, 77 milestones, 690 units) have ZERO fusion_tier
  references, probing in only 2/8, per-block variability unwired, and test baselines at 0
  for 6/8 machine types. Synchronize all 8 to match CAMX roadmap standards.

WORK:
  U-SYNC1: Update all 8 per-machine roadmaps
    - Add fusion_tier >= 2 reference to every S/F computation milestone
    - Add probing units to LATHE, MILLING, GRINDING, LASER, WATERJET (already in MILL-TURN, 5-AXIS)
    - Add explicit POST-ULT wiring unit to each machine's MS0.5
    - Add multi-role scrutiny (/prism-review with domain-adaptive agents) to every session
    - Files: LATHE/MILLING/5-AXIS/MILL-TURN/GRINDING/WIRE-EDM/LASER/WATERJET-COMPREHENSIVE-ROADMAP.md
    → /compact

  U-SYNC2: Test baselines + Machine-Type Selector
    - Define minimum test baseline per machine before Phase 5:
      MILLING 50+ | 5-AXIS 50+ | MILL-TURN 30+ | GRINDING 30+ | LASER 30+ | WATERJET 30+
    - Add Machine-Type Selector note: input geometry+tolerance → recommended machine type
    - Add match-then-improve validation references to Phase 12 per-machine testing
    → /compact

EXIT GATE: ✓ All 8 roadmaps reference fusion_tier + probing + POST-ULT + test baselines defined
```

**`/compact` → new session**

---

### SESSION 0-D-CAD: CAD Engine Integration (CadQuery/OpenCascade → MCP pipeline)
```
SMART CONFIG: Role=CAD engineer + systems integration | OPUS | MAX
UNITS: U-CAD1, U-CAD2

KNOWLEDGE SOURCES:
  - H:/prism/cad-engine/ — 176 Python files, CadQuery 2.x + OpenCascade (OCP)
  - H:/prism/cad-engine/src/cad_kernel.py — solid modeling ops + introspect() unified geometry analysis
  - H:/prism/cad-engine/src/feature_translator.py — feature→CadQuery: gear, airfoil, sweep (helix/spline), loft (multi-section)
  - H:/prism/cad-engine/primitives/library.py — 26 primitives (20 mfg + 5 gears + 1 airfoil via cq_gears/parafoil)
  - H:/prism/cad-engine/src/prompts/cad_prompts.py — extraction prompt + CADQUERY_CODEGEN_PROMPT (full API ref)
  - H:/prism/cad-engine/mcp_cad_converter.py — MCP server: 5 tools, STEP/IGES/STL/BREP/DXF/3MF/glTF
  - H:/prism/cqask/ — CQAsk clone: conversational CadQuery MCP (4 tools), dual LLM provider
  - H:/prism/mcp-server/src/engines/CadQueryCodeGeneratorEngine.ts — generates CadQuery scripts
  - H:/prism/mcp-server/scripts/cadquery-executor.py — executes CadQuery → STEP/STL
  - H:/prism/BOX/PART MODELS FOR LEARNING ENGINE/ — 33 production STEP files
  - H:/prism/cad-engine/exports/ — 23 generated STEP files, 10 roundtrip verifications
  - HuggingFace datasets (NOT YET DOWNLOADED): CADCoder/GenCAD-Code (163K image→CadQuery pairs),
    ricemonster/NeurIPS11092 (170K text→CadQuery pairs) — sketch-extrude only, no holes/fillets/threads

BASELINE (added 2026-03-24 from scout/CQAsk merge):
  - Primitives: 26 total (20 mfg + spur/bevel/rack/ring/worm gears + NACA airfoil)
  - Feature translator: gear (6 types), airfoil (NACA + camber-thickness), sweep (helix/spline/Frenet),
    loft (multi-section/ruled/smooth) — all with correct cq_gears/parafoil imports
  - Code-gen prompt: CADQUERY_CODEGEN_PROMPT — complete CadQuery API ref (30+ methods, selectors,
    patterns, assemblies, gear/airfoil libs, 3 worked examples). EXTRACTION prompt already existed.
  - Geometry introspection: cad_kernel.introspect() — bbox, volume, surface area, CoM, topology counts
  - MCP servers: cad-converter (batch STEP/STL/etc), cqask (NL→CadQuery generation)
  - GAPS STILL OPEN: no moment-of-inertia, no feature recognition from introspect, no symmetry
    detection, no wall thickness analysis, no parametric CurveArc/thread/helix primitives,
    no assembly primitives, code-gen prompt not yet wired into CadQueryCodeGeneratorEngine.ts,
    HuggingFace datasets not downloaded, sweep/loft translators untested on complex geometry

INTENT:
  CadQuery/OpenCascade CAD kernel EXISTS with solid baseline capabilities (26 primitives,
  code-gen prompt, introspection, gear/airfoil support). Wire it deeper into the MCP pipeline.
  120 CAD models exist but no test compares generated geometry to reference.
  Wire the CAD engine and prove PRISM can READ a part, UNDERSTAND features, RECREATE it.

WORK:
  U-CAD1: Audit + wire CAD engine capabilities
    - Map cad_kernel.py (Python) vs CADKernelEngine.ts (TypeScript): which is canonical for what?
    - Python path: solid modeling (extrude, revolve, loft, boolean ops) + 26 primitives + introspect()
    - TypeScript path: lightweight geometry analysis (NURBS eval, BVH, Voronoi)
    - Wire cadquery-executor.py as solid modeling backend
    - Wire CADQUERY_CODEGEN_PROMPT into CadQueryCodeGeneratorEngine.ts (prompt exists, not yet connected)
    - Verify CadQueryCodeGeneratorEngine → executor → STEP output works end-to-end
    - Test gear primitives: generate spur/bevel/rack via cq_gears, verify STEP export
    - Test airfoil primitives: generate NACA 2412 via parafoil, verify STEP export
    → /compact

  U-CAD2: CAD validation test suite
    - Roundtrip test: 10 reference_parts/ → STEP import → features → CadQuery regen → STEP export
    - Compare using introspect(): volume ±1%, surface area ±2%, bounding box ±0.1mm, topology exact
    - Production part test: 5 BOX STEP files → attempt to recreate from extracted features
    - Full pipeline test: STEP → FeatureRecognition → ProcessPlan → S/F → G-code
    - Sweep/loft stress test: helix sweep, spline sweep, 3+ section loft on non-trivial geometry
    - Consider: download HuggingFace datasets (163K+170K) as extended test fixtures (sketch-extrude only)
    → /compact

EXIT GATE: ✓ CAD roundtrip passes for 10 parts + 5 production parts attempted + full pipeline tested
           ✓ introspect() produces valid metrics for all roundtrip parts
           ✓ gear + airfoil primitives generate valid STEP files
```

**`/compact` → new session**

---

### SESSION 0-PRE-BROAD: Broader Asset Audit (3 missed directories)
```
SMART CONFIG: Role=code archaeologist + asset manager | OPUS | HIGH
UNITS: U-BROAD1, U-BROAD2

INTENT:
  Phase 0-PRE only audited mcp-server/src/engines/ (1,245 TypeScript engines). Three
  additional asset directories were missed: cad-engine (176 Python files), PRISM_ARCHIVE
  (may have unmigrated engines), BOX (production data). Audit them now.

WORK:
  U-BROAD1: Audit cad-engine + extracted_modules
    - Classify 176 Python modules: PRODUCTION / PARTIAL / STUB
    - Map Python capabilities to TypeScript equivalents
    - Identify Python-only capabilities not available in TypeScript
    - Check PRISM_OCCT_KERNEL.js + other monolith extractions for lost capabilities
    → /compact

  U-BROAD2: Audit PRISM_ARCHIVE + BOX
    - C:/PRISM_ARCHIVE_2026-02-01/: search for engines not migrated
    - C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM: verify all assets indexed in reference_box_data.md
    - Inventory: production parts, CPS posts, Okuma macros, STEP models, manufacturer catalogs
    → /compact

EXIT GATE: ✓ All 3 directories audited + unmigrated capabilities identified + BOX index verified
```

---

### SESSION 0-D-TORQUE: Machine Spindle Torque Curve Acquisition (910 machines → validated power envelopes)
```
SMART CONFIG: Role=mechanical engineer + data engineer + manufacturing domain expert | OPUS | MAX
UNITS: U-TQ1, U-TQ2, U-TQ3, U-TQ4
ESTIMATED CONTEXT: 60-70% per session (heavy data work + web research + validation)

KNOWLEDGE SOURCES:
  - H:/prism/mcp-server/src/data/machine-profiles-catalog-ext2.ts — 679 machines, single-point torque_nm
  - H:/prism/mcp-server/src/data/machine-profiles-catalog-ext.ts — 180 machines
  - H:/prism/mcp-server/src/data/machine-profiles-catalog.ts — 54 machines (may overlap)
  - H:/prism/mcp-server/src/engines/SpindleTorqueCurveEngine.ts — two-region model (constant torque / constant power)
  - H:/prism/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts — 80% power budget, torque check (lines ~1800-1900)
  - H:/prism/mcp-server/src/data/machine-kinematics-enriched.ts — 430KB drive type data (belt/direct/gear/integral)
  - Manufacturer spec sheets: Haas, Okuma, Mazak, DMG Mori, Makino, Doosan, Matsuura, Hermle, Hurco, Mori Seiki
  - HSMAdvisor community machine profiles (via HSMAdvisorCore.dll if accessible, else manual reference)
  - HSMAdvisor machine profiles: src/data/hsm-advisor-machines.json (22 machines, 106 power curve points) ← EXTRACTED 2026-03-25
  - GWizard machine database: src/data/gwizard-machines.json (59 machines with metadata) ← EXTRACTED 2026-03-25
  - Haas ES0088 Rev BP PDF: comprehensive spindle torque charts for ALL Haas models
  - Machine manuals in BOX: C:\Users\Admin.DIGITALSTORM-PC\Box\ (check for spindle spec PDFs)
  NOTE: HSMAdvisor and GWizard extracted data are PRIMARY KNOWLEDGE SOURCES for U-TQ2 and U-TQ3.
        Use hsm-advisor-machines.json power curves as ground truth for Tier-A classification.
        Use gwizard-machines.json as cross-reference for machine metadata validation.

INTENT:
  910 machines have single-point torque_nm and power_kw values but NO RPM-dependent torque curves.
  SpindleTorqueCurveEngine models the two-region power envelope (constant torque below base speed,
  constant power above) but most machine entries lack the critical base_speed_rpm parameter needed
  to compute the curve. Without real curves, PRISM cannot detect:
  - Torque starvation at low RPM (large tools, tough materials)
  - Power limiting at high RPM (small tools, high-speed aluminum)
  - Optimal RPM pockets between torque and power limits
  - Gear range transitions (machines with 2-3 speed gearboxes)

  This data directly feeds SpeedFeedOrchestratorEngine's torque/power checks, ChatterStabilityLobeEngine's
  RPM selection, and every pipeline's final S/F validation. Without it, PRISM's physics advantage over
  tools like HSMAdvisor is incomplete — we have the models but not the machine-specific data to drive them.

  GOAL: Every machine in the database gets a validated torque-power envelope with base speed, peak torque,
  continuous rating, and gear range breakpoints where applicable.

WORK:
  U-TQ1: Audit + classify machine spindle data
    - Read all 3 machine profile catalogs, extract unique machines
    - For each machine: catalog what exists (max_rpm, power_kw, torque_nm, taper, drive_type)
    - Classify into tiers:
      TIER-A: Has torque_nm + power_kw + base_speed_rpm + drive_type (curve computable) → how many?
      TIER-B: Has torque_nm + power_kw but MISSING base_speed_rpm (curve estimable from P=T×ω) → how many?
      TIER-C: Missing torque OR power (needs manufacturer lookup) → how many?
    - Cross-reference machine-kinematics-enriched.ts for drive_type (belt/direct/gear/integral)
    - Identify machines with known gearbox (gear drive → multiple torque ranges)
    - Priority list: YOUR shop machines first (Haas, Okuma, Hurco from BOX data), then top 50 by popularity
    - Output: H:/prism/state/torque-curve-audit.json with per-machine classification
    → /compact

  U-TQ2: Retrieve torque curves — Tier A+B machines (computable/estimable)
    - For TIER-B machines: compute base_speed_rpm from P_kw = T_nm × (2π × RPM_base / 60000)
      → RPM_base = (P_kw × 60000) / (2π × T_nm)
    - For each machine with known drive type:
      BELT DRIVE: Single constant-torque/constant-power curve, base speed from P=Tω
      DIRECT DRIVE: Flat torque to max RPM (electric motor characteristic), may have field weakening
      GEAR DRIVE: Multiple torque ranges (low gear: high torque / low RPM, high gear: low torque / high RPM)
        → Need gear ratios or at minimum 2 torque-speed points per gear
      INTEGRAL: Motor-in-spindle, typically flat torque with thermal derating above continuous duty
    - Generate torque curve arrays: [{rpm: N, torque_nm: T, power_kw: P}] at 10+ RPM points per machine
    - For YOUR shop machines (Haas VF-2, Okuma Multus, Hurco):
      → Check BOX for actual machine manuals with spindle spec sheets
      → Use exact manufacturer data, not estimates
    - Validate: T_curve(max_rpm) × max_rpm = rated_power_kw (energy conservation check)
    - Output: torque_curves field added to each machine profile
    → /compact

  U-TQ3: Web research — Tier C machines + gear-drive specifics
    - For TIER-C machines missing torque or power: search manufacturer spec sheets
      → WebSearch per manufacturer: "Haas VF-2 spindle torque curve specifications"
      → WebSearch: "DMG Mori NLX 2500 spindle power diagram"
      → WebSearch: "Okuma MULTUS spindle torque specifications"
    - For gear-drive machines: find gear range specifications
      → Most manufacturers publish torque at low gear and high gear
      → Some publish full S-N diagrams (speed vs torque with gear transitions)
    - Cross-reference against HSMAdvisor database where available
    - Cross-reference against GWizard machine profiles where available
    - For machines where NO data is findable:
      → Estimate from similar machines in same class (same power/taper/drive type)
      → Mark confidence: "manufacturer_spec" vs "estimated_from_class" vs "computed_from_PT"
    - /prism-review with physics-reviewer agent on curve data
    → /compact

  U-TQ4: Wire curves into physics pipeline + validation tests
    - Update SpindleTorqueCurveEngine to accept curve arrays (not just two-region model)
      → Interpolate between curve points for any RPM query
      → Support multi-gear machines (select gear by RPM range)
      → Continuous vs 30-min vs S3 duty ratings if available
    - Update SpeedFeedOrchestratorEngine to use real curves:
      → Replace: torque_check = Fc * D/2 < max_torque (single point)
      → With: torque_check = Fc * D/2 < torque_at_rpm(selected_rpm) (curve lookup)
      → Add: power_check = Pc < power_at_rpm(selected_rpm) (not just rated power)
    - Write validation tests:
      → Test: Haas VF-2 at 500 RPM must return constant-torque region value
      → Test: Haas VF-2 at 8000 RPM must return constant-power region value
      → Test: gear-drive machine selects correct gear for requested RPM
      → Test: SpeedFeedOrchestrator rejects S/F that exceeds torque curve
      → Test: same material/tool on two different machines gives different optimal RPM
      → Golden test: compare PRISM torque limit vs HSMAdvisor for 5 common setups
    - Update MachineRegistry interface to include torque_curve field
    - Update MachineProfileEngine to expose curve data via MCP action
    → /compact

EXIT GATE:
  ✓ All 910 machines classified (TIER-A/B/C counts documented)
  ✓ YOUR shop machines have manufacturer-verified torque curves
  ✓ Top 50 machines by popularity have validated curves
  ✓ Remaining machines have computed/estimated curves with confidence ratings
  ✓ SpindleTorqueCurveEngine accepts and interpolates real curve data
  ✓ SpeedFeedOrchestratorEngine uses curve-based torque/power checks
  ✓ Gear-drive machines correctly model multiple speed ranges
  ✓ 10+ validation tests pass including cross-machine comparison
  ✓ Energy conservation check: T(RPM) × RPM = P(RPM) for all curve points
  ✓ /prism-review with physics-reviewer confirms curve data integrity
```

**`/compact` → new session**

---

**`/compact` CHECKPOINT 0-D COMPLETE (including fusion + CAD + sync + torque curves + broad audit)**

---

## PHASE 1: WIRE ALL KNOWLEDGE + DECISION ARCHITECTURE (22 units in 8 sessions + 1 fusion session)

---

### SESSION 1-1: Tribal Knowledge Bridge + Action Engine (U14-U15)
```
SMART CONFIG: Role=knowledge engineering + manufacturing domain expert | OPUS | MAX
UNITS: U14, U15 (heavy — 1000+ lines of new code)
ESTIMATED CONTEXT: 70-80%

KNOWLEDGE SOURCES:
  - src/data/mastercam-cam-tips.ts — 261 Mastercam Dynamic Motion tips
  - src/data/solidcam-cam-tips.ts — 200+ SolidCAM iMachining tips
  - src/data/hypermill-cam-tips-ext.ts — 83 hyperMILL MAXX/5X tips
  - src/data/*-cam-tips.ts — ALL 18 CAM system tip files (3,700+ total)
  - src/engines/MachiningPlaybookEngine.ts — 296 rules with anti-patterns
  - src/data/controller-knowledge-tips.ts — 27 Mazatrol + Okuma + Haas entries
  - academy course data — college-level machining courses for educational references
  - TribalKnowledgeEngine — existing query interface to understand how tips are structured

INTENT:
  3,700+ tribal tips exist but are TEXT. A tip saying "reduce engagement to 60% for
  stainless in Dynamic Motion" is useless unless it becomes an ACTIONABLE parameter
  modifier: `{applies_when: {strategy: "dynamic_mill", iso: "M"}, action: {parameter:
  "ae_pct", operation: "multiply", value: 0.6}}`. After this session, 200 of the most
  impactful tips become code that AUTOMATICALLY adjusts parameters. A machinist doesn't
  need to KNOW these rules — PRISM applies them silently and shows what it changed in
  the justification output.

SKILLS TO USE:
  /playbook                — machining best practice advisor
  /engine-browse           — explore TribalKnowledge + Playbook engines
  /forge-engines           — engine creation pipeline
  /codebase-memory-tracing — trace who uses tribal knowledge

WORK:
  U14: Build TribalKnowledgeDecisionBridge
    Query TribalKnowledge + Playbook + controller tips + academy courses
    Wire to calcDispatcher: tribal_decision_query
    vitest: query for "ISO M + od_rough + mastercam" returns MC stainless tips

  U15: Build TribalKnowledgeActionEngine (200 actionable rules)
    Convert TOP 200 tips to parameter modifiers
    50 turning + 50 milling + 30 5-axis + 20 grinding + 20 EDM + 15 laser + 15 waterjet
    Wire to calcDispatcher: tribal_action_query, tribal_action_apply
    vitest: 316L dynamic → ae_pct reduced to 60%

  /prism-review after both

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for tribal tip coverage validation + MCP action prism_cam:tribal_query + /playbook enhancement
EXIT GATE: ✓ 200 actionable rules + vitest + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 1-2: Wire Tribal Knowledge + Conversational Output (U16-U17)
```
SMART CONFIG: Role=pipeline wiring + CNC controller specialist | OPUS | HIGH
UNITS: U16, U17
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - Session 1-1 output — TribalKnowledgeDecisionBridge + ActionEngine (just built)
  - src/engines/PipelineDecisionOrchestratorEngine.ts — decision scoring to modify with tips
  - src/data/controller-knowledge-tips.ts — 27 Mazatrol references for conversational output
  - src/engines/MultiCamStrategyEngineExt.ts — 22 Mazatrol strategy mappings (UNIT/SHAPE)
  - Mazatrol programming guide — UNIT+SHAPE+TOOL DATA+CUT COND format
  - Okuma AOT (Advanced One Touch) guide — process template selection flow
  - Haas VQC (Visual Quick Code) guide — operation selection interface

INTENT:
  U16 is the connection point: tribal tips now MODIFY decision scores. A strategy that
  violates a playbook anti-pattern gets penalized. A strategy endorsed by experienced
  machinists gets boosted. The justification[] shows WHY: "Score boosted +0.15 by
  Mastercam tip #47: Dynamic Motion excels in ISO M stainless."
  U17 serves operators who use Mazatrol/Okuma/Haas conversational programming — they
  don't write G-code, they fill in operation templates. PRISM outputs BOTH.

SKILLS TO USE:
  /trace — verify tribal knowledge wiring chain
  /gcode — G-code verification
  /forge-engines — for ConversationalOutputEngine

WORK:
  U16: Wire TribalKnowledgeBridge into ALL pipeline decision points
    PipelineDecisionOrchestrator.decide() → tips modify scores
    vitest: decision WITH tips differs from WITHOUT for stainless

  U17: Build ConversationalOutputEngine (Mazatrol + Okuma AOT + Haas VQC)
    Wire to camDispatcher: conversational_format_*
    vitest: simple shaft → Mazatrol UNIT output

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for decision tip influence tracking + MCP action prism_cam:conversational_format + /gcode enhancement
EXIT GATE: ✓ Tips modify decisions + conversational output + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 1-3: Decision Architecture (U-DA1, U-DA2, U-DA3)
```
SMART CONFIG: Role=decision architecture + reasoning systems | OPUS | MAX
UNITS: U-DA1, U-DA2, U-DA3

KNOWLEDGE SOURCES:
  - src/engines/DecisionTreeEngine.ts — 7 structured decision trees
  - src/engines/InferenceChainEngine.ts — multi-step reasoning chains
  - src/engines/ExplainableAIEngine.ts — XAI for decision transparency
  - src/engines/PipelineDecisionOrchestratorEngine.ts (E1080) — decision scoring framework
  - Decision science literature — traceability, reasoning chains, explanation generation

INTENT:
  Currently decisions produce a score but no explanation. After this session, every
  decision includes reasoning[]: step-by-step logic path. "Step 1: Material is ISO M
  (stainless) → eliminate ceramic inserts. Step 2: Feature is deep pocket → prefer
  adaptive over zigzag. Step 3: Machine has 80-block lookahead → limit path complexity."
  The machinist can READ this reasoning and say "that makes sense" or "no, override
  step 2 because I know this material work-hardens — use trochoidal instead."

SKILLS TO USE:
  /forge-wiring, /trace, /algorithm-inspect

WORK:
  U-DA1: Wire DecisionTreeEngine (7 trees → reasoning[] in output)
  U-DA2: Wire InferenceChainEngine (multi-step reasoning for complex decisions)
  U-DA3: Wire XAIEngine (explainable AI for decision transparency)

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook for reasoning chain presence validation + MCP action prism_cam:explain_decision + /trace enhancement
EXIT GATE: ✓ Reasoning chains + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 1-4: Decision Architecture (U-DA4, U-DA5, U-DA6)
```
SMART CONFIG: Role=optimization + simulation | OPUS | HIGH
UNITS: U-DA4, U-DA5, U-DA6

KNOWLEDGE SOURCES:
  ENGINES:
    - GeneticOptimizerEngine — genetic algorithm for parameter space search
    - ParticleSwarmEngine — PSO for multi-parameter optimization
    - SimulatedAnnealingEngine — SA for global optimization with local search
    - ConvexOptimizationEngine — constrained optimization (power, force, deflection limits)
    - NelderMeadEngine — simplex method for derivative-free optimization
    - GradientDescentEngine — gradient-based for smooth parameter landscapes
    - DifferentialEvolutionEngine — DE for noisy fitness landscapes
    - ToolBreakagePredictionEngine (E1149) — P(breakage) per operation
    - ProcessCapabilityPredictionEngine — Cpk (500 MC samples)
    - QualityPredictionEngine — quality metrics prediction
    - StochasticToolLifeEngine — Weibull tool life distribution
    - SurfaceFinishPredictorEngine — real Ra prediction
    - ToolpathThermalEngine — thermal field prediction
    - CNCSimulationPipelineEngine — material removal simulation
  TRIBAL KNOWLEDGE:
    - MachiningPlaybookEngine — optimization rules ("never optimize past 80% machine capacity")
    - src/data/*-cam-tips.ts — optimization tips across 18 CAM systems
    - TribalKnowledgeActionEngine — 200 actionable rules as optimization constraints
    - tribal tips: "optimize for TOTAL cost not just cycle time — tool wear matters"
  FORMULAS:
    - Multi-objective: Pareto front for {cycle_time, cost, quality, tool_life}
    - Cpk = (USL-LSL)/(6σ) — process capability prediction
    - P(breakage) = 1 - R(t) where R = reliability from Weibull distribution
    - Optimization convergence: population_size × generations ≥ 1000 for reliable results
  REFERENCE:
    - FormulaRegistry — optimization-related formulas
    - AlgorithmRegistry — all 50 algorithms (17 are optimization)
    - Published multi-objective machining optimization papers
    - src/physics/constants.ts — constraint values for force/power limits

INTENT:
  17 optimization engines exist but none are called by pipelines. A machinist gets "use
  adaptive clearing at 200 m/min" but NOT "I tested 47 parameter combinations and this
  one minimizes cycle time while keeping force below 80% machine capacity." After this
  session, decisions are OPTIMIZED not just SELECTED. Prediction engines warn BEFORE
  problems happen: "P(tool breakage) = 12% at these parameters — consider reducing feed."

SKILLS: /algorithm-inspect, /forge-wiring, /trace, /what-if, /physics-verify

WORK:
  U-DA4: Wire 17 optimization engines into pipeline decisions
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-DA5: Wire 6 prediction engines (failure, cost, quality)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-DA6: Wire simulation gate (CNCSimulationPipeline as verification)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  FORGE-TRIPLE: protective hook for optimization + MCP action prism_calc:optimize_params + /what-if skill

EXIT GATE: ✓ Optimization + prediction + simulation wired + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 1-5: Decision Architecture + Knowledge Wiring (U-DA7, U-DA8, U-KW1)
```
SMART CONFIG: Role=optimization + manufacturing data | OPUS | HIGH
UNITS: U-DA7, U-DA8, U-KW1

KNOWLEDGE SOURCES:
  - src/engines/ConvexOptimizationEngine.ts — constrained parameter optimization
  - src/engines/FuzzyLogicEngine.ts — human-like reasoning under uncertainty
  - src/data/manufacturer-speed-feed-data.ts — 2,423 lines of brand-specific S/F
  - src/data/guhring-iscar-speed-feed-data.ts, helical-speed-feed-data.ts, osg-speed-feed-data.ts
  - src/engines/UltimateSpeedFeedEngine.ts — 31 physics models, inline ISO tables
  - Sandvik Coromant catalog — brand-specific Vc/fz for CNMG/DNMG inserts
  - HSMAdvisor tool library: src/data/hsm-advisor-tools.json — real-world cutting parameters as validation BASELINE ← EXTRACTED 2026-03-25
    PRISM should MEET OR EXCEED HSMAdvisor's recommendations (not match — beat)
  - hyperMILL tool database: src/data/hypermill-tools.json — additional cross-reference for S/F validation ← EXTRACTED 2026-03-25

INTENT:
  Fuzzy logic handles "the material is sort of hard" — real machinists don't always know
  exact HRC. Convex optimization finds the MATHEMATICALLY optimal {Vc, fz, ap, ae} subject
  to machine power + force + deflection + chatter constraints simultaneously. Manufacturer
  S/F data means a Sandvik CNMG 120408 in 4140 gets Sandvik's SPECIFIC recommendation
  (Vc=220 m/min) instead of generic ISO P table (Vc=180 m/min) — 22% faster, still safe.

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "fuzzy logic for uncertain hardness, convex for constrained optimization"
  - src/data/*-cam-tips.ts — S/F optimization tips across 18 CAM systems
  - tribal tips: "manufacturer S/F data is 20-30% more aggressive than generic ISO tables — use it"

FORMULAS:
  - Convex optimization: minimize f(x) subject to g_i(x) ≤ 0 (power, force, deflection, chatter)
  - Fuzzy membership: μ(hardness) = trapezoidal(25, 28, 32, 35) for "medium hard"
  - Manufacturer Vc lookup: brand + insert_code + material → specific Vc (not ISO generic)

SKILLS: /algorithm-inspect, /forge-wiring, /trace, /auto-speed-feed, /calibrate

WORK:
  U-DA7: Wire ConvexOptimizationEngine for constrained parameter optimization
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-DA8: Wire FuzzyLogicEngine for human-like reasoning under uncertainty
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-KW1: Wire manufacturer S/F data (2,423 lines) into UltimateSpeedFeedEngine
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for manufacturer S/F validation + MCP action prism_calc:fuzzy_evaluate + /defaults skill

EXIT GATE: ✓ All DA units + manufacturer S/F wired + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 1-6: Knowledge Wiring (U-KW2, U-KW3, U-KW4)
```
SMART CONFIG: Role=knowledge engineering + controller specialist | OPUS | HIGH
UNITS: U-KW2, U-KW3, U-KW4

KNOWLEDGE SOURCES:
  - src/engines/MachiningKnowledgeBaseEngine.ts — 56 actions, 3,667 lines of knowledge
  - src/data/controller-knowledge-tips.ts — 27 Mazatrol refs, Okuma, Haas specifics
  - academy course data — college-level machining education (turning, milling, 5-axis fundamentals)
  - Mazatrol conversational programming format — UNIT/SHAPE/TOOL DATA/CUT COND
  - Haas NGC operator manual — alarm codes, macro variables, settings

INTENT:
  MachiningKnowledgeBase has 56 queryable actions but nothing CALLS them during pipeline
  decisions. After this session, when PRISM selects a strategy, it also queries the KB for
  relevant educational context: "This uses trochoidal milling — see Academy Course: Advanced
  Milling Strategies, Module 4." Controller tips mean Haas-specific programs get Haas-specific
  advice: "Use G187 P1 for rough, P3 for finish (Haas smoothing mode)."

SKILLS TO USE:
  /controller-enrich       — controller knowledge enrichment
  /forge-learn             — learning pipeline orchestrator

TRIBAL KNOWLEDGE:
  - TribalKnowledgeEngine — all 3,700+ tips queryable during decisions
  - MachiningPlaybookEngine — 296 rules as decision constraints
  - All 18 CAM tip files — CAM-system-specific controller advice
  - Academy courses — educational references for decision explanations

FORMULAS:
  - KB query relevance scoring: match(domain, operation, material, controller) → ranked tips
  - Controller dialect mapping: controller_name → syntax_rules + custom_cycles + M-codes

WORK:
  U-KW2: Wire KB functions (MachiningKnowledgeBase 56 actions) into decision points
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-KW3: Wire controller-knowledge-tips (27 Mazatrol refs) into ControllerDialect selection
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-KW4: Wire academy courses as educational references in output
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for KB query validation + MCP action prism_cam:kb_query + /playbook skill enhancement

EXIT GATE: ✓ KB + controller + academy wired + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 1-7: Knowledge Wiring + Wiring Verification (U-KW5, U-KW6)
```
SMART CONFIG: Role=materials science + post-processing | OPUS | HIGH
UNITS: U-KW5, U-KW6

KNOWLEDGE SOURCES:
  - hyperMILL materials catalog — 2,544 entries with machinability corrections per material group
  - hyperMILL materials database (extracted): src/data/hypermill-materials.json ← EXTRACTED 2026-03-25
    Cross-reference against PRISM's 3,181 materials for validation (MaterialRegistry + machine-profiles)
  - POST-ULT pipeline: 17 engines (PostPhysicsFoundation, LineByLineAdaptive, MotionControllerInjection,
    PostVerificationSafety, PostOutputGeneration, PostValidationSuite, etc.) — 24,746 lines total
  - src/engines/PostProcessorPipelineEngine.ts — current 35-stage pipeline
  - Controller dialect specifications — Fanuc/Siemens/Heidenhain/Haas/Mazak/Okuma syntax differences
  - G93 (inverse time feed) specification — required for 5-axis TCP mode

INTENT:
  hyperMILL's 2,544 materials have machinability corrections that our 13-material inline table
  doesn't. Alloy-specific data means 17-4PH stainless gets DIFFERENT speeds than 304 (same ISO M
  group but very different machinability). POST-ULT is our most powerful pipeline (17 engines,
  35 stages) but it's NOT WIRED into ANY program generator. After this session, every G-code
  program passes through POST-ULT: per-block S/F optimization, HSM injection, controller-specific
  formatting, safety verification. This is the difference between "G-code that runs" and
  "G-code that's OPTIMIZED for this specific machine."

SKILLS TO USE:
  /forge-wiring — comprehensive wiring verification
  /trace — verify POST-ULT chain

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "alloy-specific properties matter more than ISO group averages"
  - src/data/*-cam-tips.ts — post-processing tips across 18 CAM systems
  - tribal tips: "POST-ULT per-block optimization can save 15-30% cycle time on complex programs"
  - controller-knowledge-tips.ts — HSM activation codes per controller (G05.1, CYCLE832, G187)

FORMULAS:
  - Material machinability: Vc_alloy = Vc_ISO × machinability_factor (from hyperMILL catalog)
  - Per-block S/F: F_adjusted = F_base × (ae_ref/ae_actual)^chip_thinning_factor
  - HSM mode: G05.1 Q1 (Fanuc AICC), CYCLE832 (Siemens HDCS), G187 P3 (Haas)

SKILLS: /forge-wiring, /trace, /auto-speed-feed, /material-lookup, /program-validate

WORK:
  U-KW5: Wire hyperMILL materials catalog (2,544 entries) as material data source
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-KW6: Wire POST-ULT pipeline (17 engines) into PRODUCTION-READY program generators
    NOTE (D2 fix): Wire into 4-5 pipelines that work after Phase 0 (turning, milling, WEDM, laser, waterjet).
    Remaining pipelines (5-axis, mill-turn, grinding, sinker EDM) get POST-ULT wiring in their
    respective Phase 5-11 sessions AFTER their generators produce real output. Don't wire into scaffolds.
    Per-pipeline specifics from Amendment 3 (U08a-U08i)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for POST-ULT integration validation + MCP action prism_cam:post_process + /auto-speed-feed enhancement

EXIT GATE: ✓ Materials + POST-ULT wired + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 1-8: Wire Remaining Engines (U19-U22)
```
SMART CONFIG: Role=toolpath + CNC programming + verification | OPUS | HIGH
UNITS: U19, U20, U21, U22

KNOWLEDGE SOURCES:
  - src/engines/AdaptiveToolpathRouterEngine.ts — 35 algorithms in ALGORITHM_REGISTRY
  - src/engines/ProductionToolpathEngine.ts — polygon offset HSM with G-code output
  - src/engines/WorkCoordinateEngine.ts — G54-G59 WCS assignment logic
  - src/engines/ProgramStructureEngine.ts — subprograms M98/CALL, safety blocks
  - src/engines/BackplotEngine.ts — fast verification before full simulation
  - Fanuc G54.1 P-code spec — extended WCS for tombstone/pallet fixtures
  - M98/M99 subprogram spec — Fanuc vs Siemens CALL syntax differences

INTENT:
  AdaptiveToolpathRouter has 35 algorithms but OptimalStrategy only sees 28 strategies.
  After wiring, complex pockets get ALGORITHM-SPECIFIC parameters (not just strategy name).
  WorkCoordinate auto-assigns G54-G59 for multi-setup parts (currently hardcoded G54 everywhere).
  BackplotEngine as FIRST verification gate means we catch toolpath errors FAST (seconds)
  before committing to full simulation (minutes). A machinist loading the program sees
  correct WCS assignments and properly structured subprograms — not a monolithic block.

SKILLS TO USE:
  /forge-wiring, /trace, /engine-browse

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "35 algorithms > 28 strategies — wire router for algorithm-specific params"
  - src/data/*-cam-tips.ts — toolpath algorithm tips, WCS assignment tips, subprogram tips
  - tribal tips: "backplot first (seconds), full sim second (minutes) — catch errors FAST"

FORMULAS:
  - Algorithm routing: feature_type + material + machine → optimal algorithm from 35 options
  - WCS assignment: single_setup → G54, multi_setup → G54-G59, tombstone → G54.1 P1-P4
  - Subprogram call: Fanuc M98 P vs Siemens CALL vs Heidenhain CALL LBL

SKILLS: /forge-wiring, /trace, /engine-browse, /program-validate, /gcode

WORK:
  U19: Wire AdaptiveToolpathRouterEngine (35 algos) into OptimalStrategySelection
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U20: Wire ProductionToolpathEngine into milling pipeline (HSM polygon offset)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U21: Wire WorkCoordinateEngine + ProgramStructureEngine into ALL pipelines
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U22: Wire BackplotEngine as FIRST verification gate
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for WCS validation + MCP action prism_cam:backplot_verify + /program-validate enhancement

EXIT GATE: ✓ All Phase 1 units complete + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 1-FUSION-HOOKS: Physics Fusion Hook Integration + Novice Support (U-FUS-H1, U-FUS-H2)
```
SMART CONFIG: Role=UX engineer + manufacturing educator + hook developer | OPUS | HIGH
UNITS: U-FUS-H1, U-FUS-H2
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - PhysicsFusionOrchestratorEngine.ts (from Phase 0-D)
  - ~/.claude/hooks/lib/enforce-knowledge-consult.py — existing hook patterns
  - src/engines/MachiningPlaybookEngine.ts — 296 rules for context-aware guidance
  - src/engines/OnboardingEngine.ts — 5-level progressive disclosure
  - src/engines/ApprenticeEngine.ts — skill levels (beginner/intermediate/advanced)
  - Plan: novice blind spots section (stickout, stiffness, material grade, friction, coolant)

INTENT:
  A novice machinist who types "aluminum milling" should get USEFUL results (Tier 1 with
  smart defaults), not an error. An experienced programmer who provides full data should
  automatically get Tier 3 fused physics. The hooks GUIDE users toward better data without
  blocking them. "Provide tool_coating to improve accuracy by +0.08" is helpful.
  "ERROR: missing tool_coating" is not.

WORK:
  U-FUS-H1: PostToolUse Fusion Suggestion Hook
    - Detect single-model physics calls (cutting_force, tool_life, thermal standalone)
    - Emit WARN (not BLOCK): "For coupled physics, use physics_fusion with tier=2+"
    - Only trigger when context suggests coupling matters (tight tolerance, difficult material, long overhang)
    - Low-confidence escalation: when confidence < 0.60, suggest top 3 missing inputs with impact
    - PreToolUse convergence warning for difficult material+geometry combinations
    → 4-LOOP

  U-FUS-H2: Novice Defaults + Tier Auto-Selection
    - Tool stickout estimation: diameter + flute_length + 1×D clearance + PROMINENT warning
    - Machine stiffness defaults by class: VMC-40=20 N/µm, VMC-50=40, HMC-50=60
    - Material grade guidance: show kc range, question tree for classification
    - Workholding friction defaults: µ=0.12 worst case, with override guidance
    - Coolant delivery quality: default 0.85 pessimistic
    - Wire tier auto-selection to OnboardingEngine skill levels
    - Quality-based tier scoring (tolerance + material + overhang + interruption + thin_wall)
    → 4-LOOP

MULTI-ROLE SCRUTINY:
  machinist (are the novice defaults safe? would a new operator trust these suggestions?),
  architect (do the hooks integrate with existing pretooluse-unified without conflicts?),
  physicist (are the confidence improvement estimates (+0.08, +0.15) physically justified?)

EXIT GATE: ✓ Hooks fire on test calls + Tier auto-selection correct for 5 test scenarios + 3-agent scrutiny
```

**`/compact` → new session**

---

### SESSION 1-AGENTIC: Chain Quality + MCP Protocol (from Agentic Patterns Sprint 2)
```
SMART CONFIG: Role=inference chain architect + MCP protocol expert | OPUS | HIGH
UNITS: U-CHAIN1, U-CHAIN2

KNOWLEDGE SOURCES:
  - H:/prism/AGENTIC-PATTERNS-ROADMAP.md — Sprint 2 table (5 items, ~800 LOC)
  - src/engines/InferenceChainEngine.ts — existing chain step architecture
  - src/mcp/elicitation.ts — existing 8 structured forms for operator interaction
  - Gulli Ch.1 (Prompt Chaining), Ch.4 (Reflection), Ch.13 (Human-in-the-Loop)

INTENT:
  InferenceChainEngine passes {{previous_output}} as raw text between steps with ZERO
  validation. Hallucinated kc1.1 values or impossible Fc numbers propagate unchecked.
  Generator-critic loops catch physics nonsense before it reaches the user.

WORK:
  U-CHAIN1: Inter-step validation + generator-critic loop (~550 LOC)
    - ChainStepValidator: optional validator on each ChainStep, post-step validation
      (e.g., "if step outputs Fc, verify 10 < Fc < 100000 N")
    - CriticStep: optional critic on ChainStep that challenges the output
      ("Is this kc1.1 value physically reasonable for this ISO group?")
    - Wire into InferenceChainEngine.runInferenceChain() execution loop
    → 4-LOOP

  U-CHAIN2: User-reviewable plans + batch meta-tool + MCP (~350 LOC)
    - User-reviewable machining plans: present plan via MCP elicitation, operator approves/modifies
    - Batch meta-tool: prism_batch accepting {dispatcher, action, params}[] arrays
    - Resource list callbacks: cursor-based pagination for machines/materials/tools
    → 4-LOOP

EXIT GATE: ✓ Chain validation catches hallucinated values + critic catches wrong physics + batch tool works
```

**`/compact` → new session**

---

### SESSION 1-UX: Day 1 User Journey + Onboarding Integration
```
SMART CONFIG: Role=UX engineer + manufacturing educator | OPUS | HIGH
UNITS: U-UX1, U-UX2

KNOWLEDGE SOURCES:
  - src/engines/OnboardingEngine.ts — 5 disclosure levels, progressive feature reveal (EXISTS, NOT wired to UI)
  - src/engines/ApprenticeEngine.ts — 20 lessons, 5 challenges (EXISTS, NOT rendered)
  - src/mcp/elicitation.ts — 8 structured JSON schemas for guided input (EXISTS, NO form UI)
  - web/src/components/learning/ — 8 React components (EXISTS, isolated from main app)
  - web/src/pages/ — 45 page components (no welcome flow, no guided tour)

INTENT:
  OnboardingEngine and ApprenticeEngine are world-class backend systems (progressive disclosure,
  20 lessons, skill assessment, material-specific reasoning). But ZERO frontend integration.
  A new user sees 45 nav items with no guidance. Wire the existing engines to create a
  "first 5 minutes" experience that builds trust and demonstrates value.

WORK:
  U-UX1: New user flow
    - First visit: OnboardingEngine.welcome() → display modal with example queries
    - Progressive disclosure: show 3 features at Tier 0, reveal more as user interacts
    - Skill-level routing: beginner sees simplified results, advanced sees full physics
    - Wire ApprenticeEngine skill levels to fusion tier auto-selection
    - Error messages that help: "Material not found. Did you mean 4140 steel?" (fuzzy match)
    → /compact

  U-UX2: Web app integration checkpoint
    - Verify learning components are accessible from dashboard
    - Wire elicitation schemas to form UI (when data missing, show structured form)
    - Add user profile page (OnboardingEngine.UserProfile interface already exists)
    - Document web app gaps for Phase 13
    → /compact

EXIT GATE: ✓ New user sees welcome + 3 example queries + skill assessment offered after 5 interactions
```

**`/compact` CHECKPOINT 1 COMPLETE (including fusion hooks + agentic + UX)**
INTEGRATION SMOKE TEST (from architect scrutiny): Run 1 turning part + 1 milling part
through full pipeline available at this point. Compare to previous checkpoint output.
Criteria: 200+ actionable tribal rules, reasoning[] in decisions, POST-ULT smoke passes.

---

## PHASE 2: MACHINE SELECTION + BUSINESS LOGIC (5 units in 2 sessions)

---

### SESSION 2-1: Machine Selection + ROI (U-MACH1, U-MACH2)
**CRITICAL NOTES (ERP specialist + physicist scrutiny):**
- ERPIntegrationEngine has HARDCODED cost rates ($85/hr machine, $45/hr labor) — must replace
  with MachineRateDatabaseEngine queries. Otherwise ERP-imported WOs show different costs than pipeline.
- Three independent work order models exist (ERPIntegration.WorkOrder, OrderManager.WorkOrder,
  QuoteToShip pipeline) with no shared interface. Create canonical WorkOrder type.
- Taylor tool life model uses basic T=(C/Vc)^(1/n) — must upgrade to Extended Taylor:
  T = C_ext / (Vc^(1/n) × f^(a/n) × ap^(b/n)) with published a≈0.15, b≈0.10 for steel.
  Without feed/depth dependence, tool life predictions are only valid at reference conditions.
- CapacityPlanningEngine uses `estimated_time_min ?? Math.round(5 + Math.random() * 10)` —
  must consume pipeline-computed cycle times instead of random placeholders.
```
SMART CONFIG: Role=manufacturing process planning + cost analysis | OPUS | HIGH
UNITS: U-MACH1, U-MACH2

KNOWLEDGE SOURCES:
  - src/engines/MachineSelectionEngine.ts — machine selection logic
  - src/engines/MachineMatcherEngine.ts — feature→machine capability matching
  - src/engines/MachineRateDatabaseEngine.ts — $/hr rates by machine
  - src/engines/CapacityPlanningEngine.ts — shop floor availability
  - src/engines/ROIAdvisorEngine.ts — equipment purchase justification
  - src/engines/MakeVsBuyDecisionEngine.ts (E1083) — outsource analysis
  - MachineRegistry — 910 machine profiles from 48 manufacturers
  - Shop economics: machine depreciation, operator rates, overhead allocation

INTENT:
  A job shop with 15 machines needs to know: which machine runs THIS part most profitably?
  Not just "can it make it" but "VF-2 at $85/hr for 23 min vs DMU-50 at $145/hr for 14 min
  — VF-2 is $0.80 cheaper per part but DMU-50 frees up faster for the next job." When NO
  machine can make a feature, PRISM says "outsource this EDM operation to vendor X at ~$45/part"
  instead of silently dropping the feature.

SKILLS TO USE:
  /machine-check           — validate parameters vs machine limits
  /machine-optimize        — machine utilization analysis
  /machine-roi             — which machine for which jobs
  /feasibility-check       — can this part be machined?

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "always check outsource option for features beyond shop capability"
  - src/data/*-cam-tips.ts — machine selection tips across 18 CAM systems
  - tribal tips: "cheapest machine isn't always best — consider Cpk capability for tolerance"
  - Academy courses — process planning fundamentals

FORMULAS:
  - Machine cost: C = (cycle_time / 60) × hourly_rate + setup_time × rate + tooling_amortization
  - ROI: payback_months = (machine_price - trade_in) / (monthly_savings)
  - Capability: Cpk = (USL-LSL) / (6σ_machine) — machine must be capable for part tolerance

SKILLS: /machine-check, /machine-optimize, /machine-roi, /feasibility-check, /cost-optimize

WORK:
  U-MACH1: Wire Machine Selection into pipeline (capability × cost × availability)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-MACH2: Wire ROI Advisory (equipment purchase justification)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for machine capability validation + MCP action prism_cam:machine_select + /machine-check skill

EXIT GATE: ✓ Machine selection + ROI + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 2-2: Shop Network + Tool ROI + OEE (U-MACH3, U-MACH4, U-MACH5)
```
SMART CONFIG: Role=process planning + business intelligence | OPUS | HIGH
UNITS: U-MACH3, U-MACH4, U-MACH5

KNOWLEDGE SOURCES:
  - src/engines/ShopNetworkEngine.ts (E1134) — external vendor capability matching
  - src/engines/ToolROIEngine.ts (E1081) — 3 price points with ROI math
  - src/engines/OEECalculatorEngine.ts — Overall Equipment Effectiveness tracking
  - src/engines/ToolCostPerPartEngine.ts — tool amortization per part
  - src/engines/InventoryAwareToolSelectorEngine.ts — check crib before catalog
  - ToolCatalogEngine — 95,608 tools with pricing data
  - OEE industry benchmarks: world-class=85%, average=60%, availability×performance×quality

INTENT:
  Shop owner asks "should I buy that $350 endmill or use my $45 HSS?" PRISM answers:
  "Carbide: 200 parts/edge × $350/3 edges = $0.58/part. HSS: 15 parts/regrind × $45 =
  $3.00/part. ROI payback: 28 parts." ShopNetwork means when a feature needs a capability
  you don't have, PRISM finds a vendor. OEE tracking shows where machine utilization is
  being lost — a machine running at 55% OEE has 30% upside potential.

SKILLS TO USE:
  /tool-select, /tool-life-max, /cost-optimize

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "check crib FIRST, catalog SECOND, purchase LAST"
  - src/data/*-cam-tips.ts — tool economics tips across 18 CAM systems
  - tribal tips: "carbide ROI payback is usually 20-50 parts — always calculate"

FORMULAS:
  - Tool ROI: cost_per_part = tool_price / (edges × parts_per_edge)
  - OEE: availability × performance × quality (target ≥ 85% world-class)
  - Outsource decision: in_house_cost vs vendor_quote + lead_time_cost + quality_risk

SKILLS: /tool-select, /tool-life-max, /cost-optimize, /quote-job, /roi-analysis

WORK:
  U-MACH3: Wire ShopNetworkEngine for outsource recommendations
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-MACH4: Wire ToolROIEngine with 3-price-point model
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-MACH5: Wire OEECalculatorEngine for utilization tracking
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for cost calculation validation + MCP action prism_calc:tool_roi + /roi-analysis skill

EXIT GATE: ✓ Business logic + forge-triple complete + /compact

AMENDMENTS (from scrutiny — machinist MAJOR + physicist HIGH):
  (1) Wire BatchSizeStrategyEngine into pipeline decisions:
      Add batch_size + run_type (prototype|production|medium_batch) to PipelineInput.
      Prototype: minimize setup, conservative S/F. Production: minimize cycle time, sister tools.
  (2) Wire Weibull tool life distribution into cost estimation:
      Expected tool changes per batch = f(Weibull params, cycle_time, batch_size).
      Cost per part includes tool uncertainty range, not just point estimate.
  (3) Cost outputs must include CI95 ranges: "$32.58 (CI95: $28.40-$37.20)"
      Wire FOSM uncertainty propagation from fusion into cost calculations.
  (4) [R3 FIX] Add DELIVERY DATE computation: wire CapacityPlanningEngine (after fixing random
      cycle times) to lead time estimator. Combine: machine queue + setup + run + material lead time.
      Output: "Delivery: 15 business days (CI95: 12-19 days)." A quote without delivery date is incomplete.
  (5) [R3 FIX] Add BlueprintToQuoteBridgeEngine end-to-end validation: Drawing → OCR → QuoteEstimator
      → customer-facing quote. This is the Xometry-competitor instant quoting workflow.
  (6) [R3 FIX] Add predictedRaBallNose(stepover, R_ball) to constants.ts — current predictedRa()
      is invalid for ball-nose (off by 1000x). Uses cusp height: Ra = ae^2 / (8 × R_ball).
```

**`/compact` → new session**

---

### SESSION 2-ERP: ERP/Business Engine Audit + Wiring
**NOTE: This session is the LIGHT PASS. Full hardening is in PHASE 5 (10 sessions, 28 units).**
```
SMART CONFIG: Role=ERP specialist + business analyst | OPUS | HIGH
UNITS: U-ERP1, U-ERP2, U-ERP3

KNOWLEDGE SOURCES:
  - src/tools/dispatchers/businessDispatcher.ts — 42 wired engines, 169 actions
  - 80+ orphaned business engines (QuoteToShip, MultiProcessCAM, etc.)
  - 3 duplicate quoting engines: QuoteEngine, QuotingEngine, QuoteEstimatorEngine

WORK:
  U-ERP1: Audit all 29+ business engines
    - Run triage script on businessDispatcher engines (PRODUCTION/PARTIAL/STUB)
    - Identify duplicates (3 quoting engines → unify to QuoteEstimatorEngine)
    - Map orphaned engines that should be wired
    → /compact

  U-ERP2: Wire top 10 to QuoteToShip pipeline
    - ActualCostEngine → variance tracking (Stage 19 feedback)
    - CapacityPlanningEngine → delivery date (fix random cycle times)
    - QuoteAnalyticsEngine → accuracy calibration loop
    - InventoryAwareToolSelectorEngine → tool crib before catalog
    - MaterialCertTraceabilityEngine → cert at procurement (Stage 9)
    → /compact

  U-ERP3: Scope boundary + QuoteToShip wiring
    - Export QuoteToShipOrchestrator from index.ts (currently unreachable!)
    - Wire to dispatcher + add MCP tool + create test
    - Scope boundary update: Accounting/HR/Customer are active Phase 5/6 scope now; defer only post-convergence expansion beyond the current live business-platform tranche
    → /compact

EXIT GATE: ✓ 29 engines triaged + top 10 wired + QuoteToShip reachable + scope boundary documented
```

**`/compact` → new session**

---

### SESSION 2-LEAN: Lean Manufacturing + Six Sigma Expansion
```
SMART CONFIG: Role=lean manufacturing consultant + process engineer | OPUS | HIGH
UNITS: U-LEAN1, U-LEAN2

KNOWLEDGE SOURCES:
  - EXISTING: LeanSixSigmaEngine, ContinuousImprovementEngine, OEECalculatorEngine,
    BottleneckAnalysisEngine, SetupReductionEngine (SMED), WasteDetectorEngine
  - MISSING: ValueStreamMapping, KaizenEvent, 5S, Andon, Heijunka, Pokayoke

WORK:
  U-LEAN1: Build 3 high-impact lean engines (~400 LOC)
    - ValueStreamMappingEngine: map current state → future state → improvement plan
    - KaizenEventEngine: structured PDCA improvement events with tracking
    - AndonAlertEngine: real-time shop floor alert system (wire to EventBus + Grafana)
    → /compact

  U-LEAN2: Build 3 more lean engines + wire to scheduling (~400 LOC)
    - 5SWorkplaceEngine: Sort/Set/Shine/Standardize/Sustain auditing
    - HeijunkaLevelingEngine: production leveling/smoothing
    - PokayokeVerificationEngine: mistake-proofing checks in process plan
    - Wire all 6 new + 6 existing to businessDispatcher
    → /compact

EXIT GATE: ✓ 6 new lean engines + 6 existing wired + VSM generates improvement plan
```

**`/compact` CHECKPOINT 2 COMPLETE (including ERP + lean)**
INTEGRATION SMOKE TEST: Machine selection produces different results for 3 machines.
ROI calculation within 5% of manual. Cost estimates include CI95 ranges (not just point values).

---

## PHASE 3: LEVEL 3 DECISIONS + PROCESS PHYSICS (16 units in 6 sessions)

---

### SESSION 3-1: Multi-Alternative Decision Framework (U18, U23)
```
SMART CONFIG: Role=decision science + manufacturing | OPUS | MAX
UNITS: U18 (Level 3 framework), U23 (cost comparison matrices)

KNOWLEDGE SOURCES:
  - src/engines/PipelineDecisionOrchestratorEngine.ts (E1080) — current decision scoring
  - src/engines/ToolpathCostComparisonEngine.ts — strategy × tool cost matrix
  - src/engines/StrategyComparisonEngine.ts (E1099) — radar chart + explanation
  - src/engines/StrategyBenchmarkEngine.ts (E1096) — Monte Carlo strategy comparison
  - Manufacturing economics — cycle time × machine rate + tooling amortization + scrap cost
  - Multi-criteria decision analysis (MCDA) theory — weighted scoring, Pareto frontiers

INTENT:
  Level 2 = pick the best option. Level 3 = show the machinist WHY it's best by comparing
  3+ alternatives with full physics + cost scoring. "Adaptive: $18.40, 23 min, Ra 3.2μm.
  Trochoidal: $22.10, 28 min, Ra 2.1μm. Zigzag: $14.20, 18 min, Ra 4.8μm." The machinist
  picks based on what matters for THIS job — cheapest? fastest? best surface? PRISM shows
  the tradeoffs, the machinist decides.

SKILLS TO USE:
  /what-if                 — delta analysis across alternatives
  /cost-optimize           — cost minimization pipeline

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "Level 3 = show alternatives, let machinist override with judgment"
  - TribalKnowledgeActionEngine — tips modify strategy scores in comparison
  - src/data/*-cam-tips.ts — strategy comparison tips across 18 CAM systems

FORMULAS:
  - MCDA weighted scoring: S = Σ(wi × xi) where wi = weight, xi = normalized score per criterion
  - Pareto front: set of non-dominated solutions in {time, cost, quality} space
  - Cost comparison: C_strategy = (cycle_time × machine_rate) + (tool_cost / parts_per_edge) + scrap_risk

SKILLS: /what-if, /cost-optimize, /forge-wiring, /trace, /physics-verify

WORK:
  U18: Every decision evaluates ≥3 alternatives with physics scoring
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U23: ToolpathCostComparisonEngine: strategy × tool matrix with costs
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for multi-alternative validation + MCP action prism_cam:compare_strategies + /what-if skill

EXIT GATE: ✓ 3+ alternatives + cost matrices + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 3-2: Stock Model + Uncertainty (U-STK1, U-STK2, U-STK3)
```
SMART CONFIG: Role=CAM + uncertainty quantification | OPUS | MAX
UNITS: U-STK1, U-STK2, U-STK3

KNOWLEDGE SOURCES:
  - src/engines/StockModelEngine.ts — track stock shape through operations
  - src/engines/VoxelStockEngine.ts + VoxelStockIntegrationEngine.ts — voxel-based representation
  - src/engines/StockSizeOptimizerEngine.ts — optimal raw material selection
  - src/algorithms/MonteCarlo.ts — uncertainty propagation
  - src/engines/UncertaintyPropagationPipelineEngine.ts — chain uncertainty through pipeline
  - GUM (Guide to Expression of Uncertainty in Measurement) — uncertainty propagation standard
  - Tolerance stack-up analysis — RSS vs worst-case methods

INTENT:
  After roughing, the stock shape changes — finish passes must know WHAT'S LEFT, not assume
  original stock. Voxel representation handles complex remaining stock (rest material in
  corners, cusps from ball-nose). Monte Carlo on every decision means output includes
  confidence intervals: "Cycle time: 23.4 min (CI95: 21.8-25.1)" and "Cpk: 1.45 (CI95:
  1.31-1.59)." The machinist knows HOW CONFIDENT the prediction is.

SKILLS TO USE:
  /stock-optimize          — raw material size selection
  /physics-verify          — verify stock tracking physics

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "finish passes must know remaining stock, not assume original"
  - src/data/*-cam-tips.ts — rest material tips, adaptive clearing from actual stock
  - tribal tips: "MC 500 samples minimum for reliable CI95 on cycle time and Cpk"

FORMULAS:
  - Voxel stock: discretize stock into voxel grid, subtract tool swept volume per operation
  - MC propagation: sample each input N times → output distribution → CI95 = μ ± 1.96σ
  - Tolerance stack: σ_total = √(Σσi²) (RSS) or Σ|δi| (worst-case)

SKILLS: /stock-optimize, /physics-verify, /what-if, /forge-wiring, /trace

WORK:
  U-STK1: Wire StockModelEngine for operation-to-operation stock tracking
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-STK2: Wire VoxelStockEngine for complex stock representation
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-STK3: Wire uncertainty chain (Monte Carlo for all pipeline decisions)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for MC sample count validation + MCP action prism_calc:uncertainty_propagate + /predict skill

EXIT GATE: ✓ Stock tracking + MC uncertainty + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 3-3: Process Physics - Threading + Helical (U-PHYS1, U-PHYS2)
```
SMART CONFIG: Role=cutting science + force modeling | OPUS | MAX
UNITS: U-PHYS1, U-PHYS2

KNOWLEDGE SOURCES:
  - Thread milling force model literature — radial + axial forces from helical path
  - Helical interpolation mechanics — effective diameter changes along helix
  - src/engines/ThreadingPipelineEngine.ts — current threading implementation
  - src/engines/PrintToProgramPipelineEngine.ts — helical entry strategy section
  - ISO 261/262 — thread geometry (major/minor/pitch diameter relationships)
  - Sandvik thread milling application guide — recommended ae, fz for thread milling

INTENT:
  Thread milling forces are NOT the same as standard milling — radial forces from the helical
  path can deflect the tool and produce out-of-tolerance threads. Helical bore milling
  (G2/G3 with Z) has variable chip thickness along the helix. Without these force models,
  PRISM uses generic milling forces for thread milling → wrong feed → bad thread or broken tool.

SKILLS TO USE:
  /physics-verify, /calibrate, /formula-browse

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "thread milling radial force deflects tool — reduce feed for tight tolerance threads"
  - Sandvik thread milling application guide tips
  - src/data/*-cam-tips.ts — threading tips across 18 CAM systems

FORMULAS:
  - Thread milling radial force: Fr = Fc × cos(helix_angle) × engagement_factor
  - Thread milling axial force: Fa = Fc × sin(helix_angle) × pitch_engagement
  - Helical engagement: ae_eff = f(helix_diameter, tool_diameter, helix_angle)
  - Thread form accuracy: deflection_at_pitch_diameter < tolerance/3

SKILLS: /physics-verify, /calibrate, /formula-browse, /gcode, /program-validate

WORK:
  U-PHYS1: Thread milling force model (radial + axial from helical path)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-PHYS2: Helical interpolation force model (variable engagement along helix)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for thread force validation + MCP action prism_calc:thread_force + /calc enhancement

EXIT GATE: ✓ Thread + helical force models + forge-triple complete + /compact

AMENDMENT (from scrutiny — physicist HIGH): Add U-PHYS1b: ThreadMethodSelectionEngine
  Evaluates all 5 threading methods (single-point, thread mill, tap, roll form, whirl)
  and recommends best for given thread spec + material + feature.
  Add U-PHYS1c: Ball-Nose End Mill Force Model (Lee/Altintas 1996)
  Discretized flute method for 3D surface finishing and 5-axis work.
  Ball-nose has zero cutting speed at center — Kienzle is wrong for this geometry.
```

**`/compact` → new session**

---

### SESSION 3-4: Process Physics - Plunge + Hard Milling (U-PHYS3, U-PHYS4)
```
SMART CONFIG: Role=cutting science + dynamics | OPUS | MAX
UNITS: U-PHYS3, U-PHYS4

KNOWLEDGE SOURCES:
  - Plunge milling mechanics — forces primarily AXIAL (spindle thrust limit, not torque)
  - Altintas "Manufacturing Automation" Ch.6 — process damping at low speeds in hard materials
  - src/engines/ChatterStabilityLobeEngine.ts — current SLD (needs process damping extension)
  - src/engines/OptimalStrategySelectionEngine.ts — ISO H strategy selection
  - HSM in hardened steel literature — why specific speed ranges work (process damping)
  - Typical spindle thrust capacities: BT40=5kN, HSK-A63=8kN, CAT50=15kN

INTENT:
  Plunge milling is the SAFEST roughing option for deep cavities — but it's limited by
  spindle THRUST, not torque. Without this model, PRISM might recommend plunge milling
  at forces that exceed thrust capacity. Hard milling has INVERTED stability — at LOW speeds,
  process damping STABILIZES the cut. The standard SLD says "go faster to avoid chatter"
  but for ISO H, sometimes SLOWER is more stable. This is why HSM works in hardened steel.

SKILLS TO USE:
  /physics-verify, /calibrate, /spindle-optimize

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "plunge milling = safest deep cavity roughing, limited by THRUST not torque"
  - tribal tips: "hard milling: slower CAN be more stable (process damping) — counterintuitive"
  - src/data/*-cam-tips.ts — plunge milling + hard milling tips across 18 CAM systems

FORMULAS:
  - Plunge axial force: Fa = kc_axial × ap × fz^(1-mc) where kc_axial ≈ 0.5-0.7 × kc1.1
    [FIXED: was sin(90°)=1 which is a no-op. Plunge milling has axial-specific kc coefficient.]
  - Thrust check: Fa < spindle_thrust_capacity × SF (BT40=5kN, HSK=8kN, CAT50=15kN)
  - Process damping: K_pd = C_pd × (V_c)^(-n) — increases stability at LOW speeds
  - Modified SLD: a_lim_damped = a_lim + a_damping_contribution (wider stable zone)

SKILLS: /physics-verify, /calibrate, /spindle-optimize, /formula-browse, /what-if

WORK:
  U-PHYS3: Plunge milling force model (axial-dominant, spindle thrust limit)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-PHYS4: Hard milling dynamics — process damping (ISO H stability inversion)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for thrust limit validation + MCP action prism_calc:plunge_force + /spindle-optimize enhancement

EXIT GATE: ✓ Plunge + hard milling + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 3-5: Remaining Level 3 Decisions (U24-U27)
**SPLIT NOTE (from scrutiny):** U24-U26 + U27a-U27d = 7 sub-units too heavy. Split into:
  3-5a: U24 (adaptive refinement) + U25 (multi-setup) + U26 (process sequence)
  /compact
  3-5b: U27a (SobolSensitivity) + U27b (BootstrapCI) + U27c (KDE) + U27d (DOETaguchi)
```
SMART CONFIG: Role=pipeline architect + optimization | OPUS | HIGH
UNITS: U24, U25, U26, U27

KNOWLEDGE SOURCES:
  - src/engines/ProcessSequenceEngine.ts — multi-process part sequencing
  - src/algorithms/CSPSetupPlan.ts — constraint satisfaction for setup planning
  - Statistical methods: Sobol sensitivity indices, bootstrap confidence intervals, SPRT
  - PCA for process monitoring, Hotelling T² for multivariate SPC, HMM for state estimation
  - Bayesian network theory — probabilistic decision graphs for process routing

INTENT:
  Multi-process parts (turn + mill + grind + EDM) need sequencing: which operation FIRST?
  Wrong sequence = scrapped part (e.g., grinding before hardening = waste). 7 missing
  statistical methods give PRISM the mathematical rigor for uncertainty quantification
  that manufacturing engineers expect. Sobol indices tell us WHICH parameter matters most.
  Bootstrap gives confidence intervals without assuming normal distribution.

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "multi-process: turn before mill, mill before grind, grind before EDM"
  - src/data/*-cam-tips.ts — process sequencing tips, setup minimization tips
  - tribal tips: "wrong sequence = scrap (e.g., grinding before heat treat = waste of grinding)"

FORMULAS:
  - CSP setup planning: constraint satisfaction for minimum setups covering all features
  - Sobol indices: Si = V[E(Y|Xi)] / V(Y) — which parameter matters MOST
  - Bootstrap CI: resample N times → percentile confidence interval (no normality assumption)
  - SPRT: sequential probability ratio test for in-process accept/reject decisions
  - PCA: reduce multi-sensor data to principal components for monitoring
  - Hotelling T²: multivariate SPC control chart (multiple quality characteristics)

SKILLS: /algorithm-inspect, /forge-wiring, /trace, /physics-verify, /what-if

WORK:
  U24: Adaptive parameter refinement (in-process adjustment logic)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U25: Multi-setup optimization (minimize setups with CSP)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U26: Wire ProcessSequenceEngine for multi-process parts
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

> **`/compact` after U24-U26 — context heavy with 3 units + 3 loops each**

  U27a: Wire Sobol sensitivity + bootstrap CI + SPRT (foundational statistical methods)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U27b: Wire PCA + Hotelling T² (multivariate monitoring)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U27c: Wire HMM + Bayesian Networks (state estimation + probabilistic reasoning)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U27d: Build DOEEngine — Taguchi L9/L18/L27 arrays for practical parameter screening
    + regression fitting for empirical model calibration from shop-floor data
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for process sequence validation + MCP action prism_calc:sensitivity_analysis + /predict enhancement

EXIT GATE: ✓ Level 3 + statistical methods + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 3-6: Remaining Level 3 + Gate Check (U28-U29)
```
SMART CONFIG: Role=pipeline architect | OPUS | HIGH
UNITS: U28, U29

KNOWLEDGE SOURCES:
  - src/engines/PredictionCalibrationEngine.ts (E1147) — calibrated kc1.1/Taylor from actuals
  - MTConnect/OPC-UA data model — machine monitoring data ingest format
  - All Phase 3 engines built in sessions 3-1 through 3-5 — integration verification
  - /forge-wiring output — comprehensive wiring audit of everything connected so far
  - /system-audit — full system health check after major wiring phase

INTENT:
  Production feedback loop: actual cutting data comes back from the machine (via MTConnect/OPC-UA),
  PredictionCalibrationEngine compares actual vs predicted, adjusts kc1.1 and Taylor constants
  for THIS specific machine + material combo. After 10 jobs, PRISM's predictions for this
  machine are better than any textbook. This session also does the final Phase 3 gate check —
  verify EVERYTHING from sessions 3-1 through 3-5 is properly wired and working together.

SKILLS TO USE:
  /forge-wiring — comprehensive Phase 3 wiring check
  /system-audit — system health after Phase 3

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "feedback loop: actual data ALWAYS beats theoretical after 10+ jobs"
  - tribal tips: "calibrated kc1.1 for YOUR machine is more accurate than Sandvik's generic value"
  - src/data/*-cam-tips.ts — calibration and feedback tips

FORMULAS:
  - Calibration: kc1.1_calibrated = kc1.1_theoretical × (F_actual / F_predicted)
  - Taylor recalibration: fit actual tool life data to VcT^n = C → updated C, n
  - Prediction improvement: RMSE_after / RMSE_before < 0.7 (30%+ improvement target)

SKILLS: /forge-wiring, /system-audit, /calibrate, /physics-verify, /forge-drift

WORK:
  U28: Wire production feedback loop (actual vs predicted → calibration)
    NOTE (D4 fix — bootstrap problem): Initial optimization (Session 1-4) uses THEORETICAL
    constants. After THIS session's calibration engine is active, re-optimization with
    CALIBRATED constants produces better results. The system improves iteratively:
    theoretical → first production run → calibrate → re-optimize → better predictions.
    Add explicit regression fitting (nonlinear: VcT^n = C → fit C,n from data points).
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U29: Final Phase 3 integration verification — /forge-wiring full audit
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for calibration data validation + MCP action prism_calc:calibrate_model + /calibrate skill

EXIT GATE: ✓ Phase 3 + calibration bootstrap noted + wiring verified + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 3-FUSION-1: Remaining Physics Plugins (U-FUS-RP1, U-FUS-RP2)
```
SMART CONFIG: Role=cutting science engineer + code quality | OPUS | MAX
UNITS: U-FUS-RP1, U-FUS-RP2
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - PhysicsFusionOrchestratorEngine.ts, PhysicsPluginRegistry.ts (from Phase 0-D)
  - Plan: 6 new plugins from machinist scrutiny + remaining existing engine wrappers
  - src/engines/RunoutEffectEngine.ts, AdvancedWearPhysicsEngine.ts, etc.
  - Altintas Ch.2 (Kienzle corrections), Smithey (2000) wear-force, Archard (1953) abrasive wear

INTENT:
  Fill out the full plugin set. After this session, ALL 24 physics factors are available.
  The interrupted cut, work hardening, breakage risk, chip evacuation, runout, and BUE
  plugins address the machinist's CRITICAL findings — real shop floor scenarios that would
  break tools without these models.

WORK:
  U-FUS-RP1: 6 NEW plugins from scrutiny (~900 LOC)
    - InterruptedCutImpactPlugin (L1): 2-5x entry impact, thermal cycling fatigue
    - WorkHardeningPlugin (L3): Hollomon kc progression between passes
    - BreakageRiskPlugin (L3): stress vs TRS, fatigue cycles, breakage_probability
    - ChipEvacuationForcePlugin (L1): volume vs gullet capacity, MRR ceiling
    - RunoutEffectPlugin (L1): TIR per holder type → per-flute chip loads
    - BUEDetectionPlugin (L3): speed/material threshold, Ra uncertainty widening
    → 4-LOOP per plugin

  U-FUS-RP2: 8 remaining existing engine wrappers (~500 LOC)
    - AdvancedChipThicknessPlugin (L1), SizeEffectPloughingPlugin (L1)
    - CoolantEffectivenessPlugin (L2), ThermalSofteningPlugin (L2)
    - ThermalWearCouplingPlugin (L3), AdvancedWearPlugin (L3)
    - PartDeflectionPlugin (L4), SurfaceIntegrityPlugin (L6)
    → 4-LOOP per plugin

MULTI-ROLE SCRUTINY: machinist + physicist + architect
EXIT GATE: ✓ All 24 plugins registered + topological sort valid + 3-agent scrutiny
```

**`/compact` → new session**

---

### SESSION 3-FUSION-2: Stochastic Tier + Uncertainty (U-FUS-UQ1, U-FUS-UQ2)
```
SMART CONFIG: Role=statistical physicist + uncertainty quantification | OPUS | MAX
UNITS: U-FUS-UQ1, U-FUS-UQ2
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - src/engines/MonteCarloEngine.ts — LHS, bootstrap, percentiles
  - src/engines/AdvancedUncertaintyEngine.ts — Kriging, QMC, Gaussian Copula
  - src/engines/StochasticCuttingForceEngine.ts — Sobol sensitivity indices
  - Plan: correlated inputs (Cholesky), per-sample convergence, Unscented Transform
  - JCGM 100:2008 (GUM) — measurement uncertainty framework

INTENT:
  A machinist who doesn't know exact material properties should still get USEFUL answers
  with HONEST uncertainty bounds. "Force is 1200-1800N (95% CI)" is more useful than
  "Force is 1519N" when the input kc1.1 could be off by ±15%.

WORK:
  U-FUS-UQ1: Unscented Transform for Tier 2 (~300 LOC)
    - 2n+1 sigma points (n capped at 15 → max 31 evaluations)
    - Weighted mean + covariance propagation through L1-L6 chain
    - Handles nonlinearity (Kienzle power law, exponential wear) correctly
    → 4-LOOP

  U-FUS-UQ2: Cholesky MC for Tier 3-4 (~400 LOC)
    - Correlated input sampling: default corr(kc1.1, mc) = -0.7, corr(C1, C2) = +0.5
    - Positive-definiteness check with eigenvalue clipping fallback
    - Per-sample convergence: each MC trial runs own convergence, >5% failure → confidence penalty
    - LHS (Latin Hypercube) instead of pure MC — 5-10x fewer samples needed
    - Early termination: CV of mean < 1% after 50 trials
    - 4 stochastic plugin wrappers: stochastic_force, stochastic_chatter, stochastic_surface, stochastic_thermal
    → 4-LOOP

MULTI-ROLE SCRUTINY: physicist (are distributions correct per variable?), architect (compute time within budget?), machinist (do uncertainty bounds make sense to operator?)
EXIT GATE: ✓ UT produces narrower CI than single-model + Cholesky MC matches analytical for linear case + 3-agent scrutiny
```

**`/compact` → new session**

---

### SESSION 3-FUSION-3: Dispatcher Wiring + MCP Schema (U-FUS-W1, U-FUS-W2)
```
SMART CONFIG: Role=API architect + dispatcher wiring | OPUS | HIGH
UNITS: U-FUS-W1, U-FUS-W2
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/tools/dispatchers/calcDispatcher.ts — action routing, z.enum, Zod schemas
  - src/schemas/calcActionSchemas.ts — per-action parameter schemas
  - src/engines/ActionSchemaCacheEngine.ts — tool annotation system

INTENT:
  Make physics_fusion CALLABLE by Claude and the PRISM app. Without this wiring, the
  fusion orchestrator exists but nobody can invoke it. The MCP schema tells Claude
  WHEN to suggest fusion (tight tolerance, difficult material) via elicitation.

WORK:
  U-FUS-W1: Wire physics_fusion action to calcDispatcher
    - Add to z.enum action list
    - Zod schema for FusionInput (material, tool, machine, engagement, fusion_tier, tolerance)
    - Output schema for FusionOutput (converged results + fusion_detail)
    - Tool annotations: description, parameter hints, tier-aware suggestions
    → 4-LOOP

  U-FUS-W2: Elicitation flow + integration tests
    - Progressive input gathering: start with material → suggest adding tool → suggest machine
    - Each suggestion shows confidence improvement: "Add tool_coating for +0.08 confidence"
    - Integration test: full MCP call → calcDispatcher → physics_fusion → result with fusion_detail
    - Verify: Tier 1/2/3 all callable via MCP
    → 4-LOOP

MULTI-ROLE SCRUTINY: architect (schema correct? backward compatible?), machinist (are parameter names intuitive?), physicist (does elicitation suggest the RIGHT inputs for each scenario?)
EXIT GATE: ✓ MCP call works end-to-end + all 3 tiers callable + 3-agent scrutiny
```

**`/compact` → new session**

---

### SESSION 3-FUSION-4: PostProcessor + Per-Block Variability (U-FUS-PP1, U-FUS-PP2)
```
SMART CONFIG: Role=post processor developer + CNC programmer | OPUS | MAX
UNITS: U-FUS-PP1, U-FUS-PP2
ESTIMATED CONTEXT: 70-80%

KNOWLEDGE SOURCES:
  - src/engines/PostProcessorPipelineEngine.ts — Phase 1 Stage 1.1 (UltimateSF call site)
  - src/engines/EngagementAdaptiveFeedEngine.ts — per-block feed multipliers
  - src/engines/StabilityRPMRewriterEngine.ts — SLD-based RPM optimization
  - src/engines/InstantaneousEngagementEngine.ts — per-block ae/ap computation
  - MachineContext interface — look_ahead, accel_mm_s2, jerk_mm_s3, spindle_inertia

INTENT:
  THIS IS WHERE THE MACHINIST SEES THE RESULT. Every G-code block gets physics-optimized
  S/F that varies along the toolpath. Full speed in supported areas, reduced over air.
  Stable RPM pockets chosen per-block. Feed transitions respect machine accel limits.
  No controller stutter from blocks that are too short.

WORK:
  U-FUS-PP1: Wire fusion into PostProcessor Phase 1
    - Add fusion_tier to PipelineInput interface
    - Add _getEngine("fusionOrchestrator") lazy loader
    - When fusion_tier >= 2: Phase 1 Stage 1.1 delegates to fusion instead of UltimateSF
    - Per-block Jacobian delta application (from converged per-operation baseline)
    - Also wire PrintToProgramPipelineEngine to route through SpeedFeedOrchestrator
    → 4-LOOP

  U-FUS-PP2: Feed transition filter + controller constraints
    - min_block_time: machine.look_ahead × block_processing_ms × feed / 60000
    - Feed transition filter: smooth S/F changes, no step > machine max_feed_step_pct
    - Spindle accel constraint: group blocks needing similar RPM, minimize transitions
    - Arc subdivision: G2/G3 compute force at entry/mid/exit, use worst case
    - Test: 10,000-block program with varying engagement → verify no controller stutter
    → 4-LOOP

MULTI-ROLE SCRUTINY: machinist (run output through Haas NGC simulator — would it stutter?), architect (PostProcessor regression — do all 35 stages still work?), physicist (are Jacobian deltas accurate for typical engagement changes?)
EXIT GATE: ✓ G-code output with per-block S/F + no feed steps > accel limit + PostProcessor regression clean
```

**`/compact` → new session**

---

### SESSION 3-FUSION-5: Workholding + Deflection + Adaptive + Drilling (U-FUS-DS1, U-FUS-DS2)
```
SMART CONFIG: Role=fixture design + adaptive control + drilling specialist | OPUS | MAX
UNITS: U-FUS-DS1, U-FUS-DS2
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - src/engines/WorkholdingVerificationEngine.ts — clamping margin check
  - src/engines/ToolDeflectionPredictionEngine.ts — cantilever deflection
  - src/engines/ThinWallMachiningEngine.ts — thin wall derating
  - src/engines/AdaptiveFeedControlEngine.ts — PID feed control
  - src/engines/AdaptiveSpindleControlEngine.ts — chatter SSV
  - src/engines/DrillBreakthroughForceEngine.ts, PeckDrillingEngine.ts, TappingTorqueEngine.ts
  - Plan: unsupported zone derating (0.6-0.8×), breakage risk threshold (P > 0.15)

INTENT:
  Long overhanging parts over air with not much support from the fixture area need
  automatic speed/feed changes. This session wires ALL the downstream safety systems
  to consume fused physics. Also adds drilling/tapping fusion support.

WORK:
  U-FUS-DS1: Workholding + deflection + adaptive wiring
    - WorkholdingVerificationEngine: per-block Fc vector check against clamping margin
    - Unsupported zone detection: auto-derating factor 0.6-0.8× when over air
    - ToolDeflection: per-block check using Fc_PEAK (not avg), derate feed if δ > tolerance/3
    - ThinWallMachining: auto-engage for walls < 2mm thickness
    - BreakageRiskPlugin: per-block P(break) check, force feed reduction when P > 0.15
    - AdaptiveFeedControl: fused Fc as PID target for each segment
    - AdaptiveSpindleControl: fused SLD for safe RPM window per block
    → 4-LOOP

  U-FUS-DS2: Drilling + tapping plugins
    - DrillChipPackingPlugin (L1): depth/diameter ratio → thrust/torque amplification
    - TappingTorquePlugin (L1): torque vs spindle capacity check
    - Wire to PostProcessor drilling/tapping stages
    → 4-LOOP

    TEST: Part with fixture gap (100mm overhang over air)
    - Verify: S/F automatically reduces 30-40% in unsupported zone
    - Verify: breakage risk flagged if force exceeds safe threshold
    - Verify: drilling peck cycle optimized by chip evacuation model

MULTI-ROLE SCRUTINY: machinist (would YOU trust this output for a $500 titanium part hanging over air?), physicist (is the unsupported-zone derating physically justified?), architect (does state persist across tool changes?)
EXIT GATE: ✓ Overhang test passes + drilling fusion works + 3-agent scrutiny clean
```

**`/compact` → new session**

---

### SESSION 3-FUSION-6: Calibration + ERP + Setup Sheet + Strategy Feedback (U-FUS-CAL, U-FUS-OUT)
```
SMART CONFIG: Role=shop manager + quality engineer + CAM programmer | OPUS | HIGH
UNITS: U-FUS-CAL, U-FUS-OUT
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/engines/PredictionCalibrationEngine.ts — Bayesian kc1.1/Taylor calibration
  - src/engines/CrossPhysicsCouplingEngine.ts — 8 cross-domain formulas (subsume into fusion)
  - src/engines/QuoteToShipOrchestratorEngine.ts — cost estimation pipeline
  - PostProcessorPipelineEngine Stage 6.3 — setup sheet generation
  - MachiningPlaybookEngine — 296 rules for toolpath strategy suggestions

INTENT:
  Close all the loops. Shop floor measurement data feeds back to calibrate the model.
  Cost estimates reflect the actual (fused) cycle time, not the optimistic single-model estimate.
  Setup sheets warn the operator about convergence-limited zones. The playbook suggests
  toolpath strategy changes when physics reveals problems.

WORK:
  U-FUS-CAL: Calibration + CrossPhysics subsumption
    - Wire PredictionCalibrationEngine: Bayesian kc1.1/Taylor C update from measured forces
    - Subsume CrossPhysicsCouplingEngine as L6 plugin (8 formulas → post-convergence aggregations)
    - Sobol sensitivity through full convergence chain (Tier 4 only)
    → 4-LOOP

  U-FUS-OUT: Downstream outputs
    - ERP/Quoting: cycle_time_impact field (original vs fused, derating breakdown)
    - Setup sheet: fusion summary section (convergence status, per-zone warnings, derating zones)
    - Toolpath strategy feedback via PlaybookEngine: suggest trochoidal for high-deflection zones,
      alternating-side for thin walls, dwell for thermal hotspots
    - Wire CrossPhysicsCouplingEngine formulas into appropriate DAG levels (begin migration)
    → 4-LOOP

MULTI-ROLE SCRUTINY: machinist (does the setup sheet give actionable info?), architect (does QuoteToShip get fused cycle time without code change?), physicist (is Bayesian calibration numerically stable?)

FORGE-TRIPLE: hook for fusion quality gate (blocks non-converged results from shipping) + MCP action prism_calc:physics_fusion + /physics-fusion skill

EXIT GATE: ✓ Calibration loop works + Setup sheet shows fusion data + ERP gets correct cycle time + forge-triple
```

**`/compact` → new session**

---

### SESSION 3-AGENTIC: Learning Loop + Feedback Evolution (from Agentic Patterns Sprint 4)
```
SMART CONFIG: Role=ML engineer + knowledge management | OPUS | HIGH
UNITS: U-LEARN1, U-LEARN2

KNOWLEDGE SOURCES:
  - H:/prism/AGENTIC-PATTERNS-ROADMAP.md — Sprint 4 table (3 items, ~1,000 LOC)
  - src/engines/StrategyRankingUpdateEngine.ts — existing Wilson score ranking
  - src/engines/MachiningPlaybookEngine.ts — 296 rules with static EvidenceLevel
  - src/engines/MemoryGraphEngine.ts — WAL-backed JSONL decision graph
  - Gulli Ch.9 (Learning and Adaptation), Ch.8 (Memory Management)

INTENT:
  Playbook rules are STATIC — they never evolve from outcomes. Strategy rankings use Wilson
  scores but playbook rules have fixed EvidenceLevel. When a playbook rule consistently
  leads to good outcomes, its confidence should increase. When a rule fails, it should be
  demoted. Auto-extraction should synthesize "lessons learned" as new tribal tips.

WORK:
  U-LEARN1: Playbook rule confidence evolution (~400 LOC)
    - Beta distribution tracker per playbook rule: alpha=successes, beta=failures
    - After each job outcome, update rules that fired: success → alpha++, failure → beta++
    - Confidence = alpha / (alpha + beta), with Bayesian credible intervals
    - Rules with confidence < 0.3 after 20+ observations → flag for review
    - Rules with confidence > 0.8 after 50+ observations → promote to "proven"
    → 4-LOOP

  U-LEARN2: Auto memory extraction + trajectory evaluation (~600 LOC)
    - Auto-extract "lessons learned" from session outcomes using SamplingWorkflowEngine
    - Pattern: "Job X used strategy Y for material Z, outcome was [good/bad] because [reason]"
    - Store as new tribal tips with auto-generated tags, low initial confidence
    - Trajectory evaluation: define expected engine call sequences for top 5 orchestrators,
      verify actual execution matches expected trajectory
    → 4-LOOP

EXIT GATE: ✓ Playbook rules evolve from outcomes + auto-extraction generates valid tips + trajectory eval catches deviations
```

**`/compact` CHECKPOINT 3-FUSION COMPLETE**

---

## PHASE 3-EXT: SCRUTINY GAP FIXES (from v24 scrutiny — CRITICAL findings)

---

### SESSION 3-7: Thermal-Wear-Force-Finish Coupling Chain (M1 + M2)
```
SMART CONFIG: Role=cutting science + thermal modeling + surface integrity | OPUS | MAX
UNITS: U-COUPLE1, U-COUPLE2

KNOWLEDGE SOURCES:
  ENGINES:
    - KienzleForceModelEngine — cutting force (input to thermal model)
    - ToolpathThermalEngine — temperature field along toolpath
    - StochasticToolLifeEngine — Weibull wear distribution
    - ToolDeflectionPredictionEngine — deflection from computed force
    - SurfaceFinishPredictorEngine — Ra from deflection + feed marks + vibration
    - SurfaceIntegrityPredictorEngine — white layer, residual stress from temperature
  TRIBAL KNOWLEDGE:
    - MachiningPlaybookEngine — "force→temperature→wear is a COUPLED system, not independent"
    - tribal tips: "progressive wear increases force by 15-30% over tool life"
    - src/data/*-cam-tips.ts — thermal management tips, finish quality tips
  FORMULAS:
    - Thermal-wear coupling: T_interface = f(Fc, Vc, k_workpiece) → VB_rate = A×e^(-Q/RT)×σ×V_slide
    - Wear-force feedback: Fc_worn = Fc_sharp × (1 + 0.012 × VB_mm) — force grows with wear
    - Force-deflection chain: δ = Fc × L³/(3EI) → dimensional_error = δ × sin(approach_angle)
    - Deflection-finish: Ra_actual = Ra_kinematic + Ra_deflection + Ra_vibration
    - Full chain: Fc → T → VB → Fc_updated → δ → dim_error → Ra_degradation
  REFERENCE:
    - Altintas "Manufacturing Automation" Ch.2-3 — coupled force/thermal/wear
    - Usui wear model — published constants per material combination
    - Published tool wear progression data (VB vs cutting time)
    - src/physics/constants.ts — canonical thermal + force constants

INTENT:
  Currently force, temperature, wear, deflection, and finish are computed INDEPENDENTLY.
  In reality, worn tool → more force → higher temperature → faster wear → MORE force.
  And force → deflection → dimensional error → actual finish worse than predicted.
  After this session, the FULL coupled chain runs as one computation. A machinist sees
  "Ra predicted: 1.2μm at start, degrading to 2.1μm at tool change" — not a single number.

PLAN: Outline coupling chain architecture before building
SKILLS: /physics-verify, /calibrate, /formula-browse, /what-if, /wear-analysis

WORK:
  U-COUPLE1: Build ThermalWearForceCouplingEngine — iterative coupled model
    Force→Temperature→Wear→Force loop with convergence check
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-COUPLE2: Build ForceDeflectionFinishChainEngine — downstream chain
    Force→Deflection→DimensionalError→SurfaceFinish degradation over tool life
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for coupled model convergence check + MCP action prism_calc:coupled_prediction + /predict enhancement
EXIT GATE: ✓ Coupled chain runs end-to-end + hand-calculated validation + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 3-8: Per-Stage Uncertainty + SPC WIRING (M3 + S1)
**REFRAMED (quality engineer scrutiny):** Original plan was to BUILD SPCMonitoringEngine.
But SPCChartingEngine (EWMA, CUSUM, Moving Average, X-bar-S), SPCProcessCapabilityEngine
(Cp/Cpk/Pp/Ppk/Cpm + Nelson violations), LeanSixSigmaEngine (bootstrap Cpk CI, X-bar-R),
and NelsonSPCRulesEngine (all 8 Western Electric rules) ALL ALREADY EXIST.
This session should WIRE these existing engines, not build a 5th SPC implementation.
Also: Cpk formula at line ~2293 is WRONG — uses (USL-LSL)/(6sigma) which is Cp, not Cpk.
Correct: Cpk = min[(USL-mu)/(3sigma), (mu-LSL)/(3sigma)].
```
SMART CONFIG: Role=uncertainty quantification + statistical process control | OPUS | MAX
UNITS: U-UQ1, U-SPC1

KNOWLEDGE SOURCES:
  ENGINES:
    - UncertaintyPropagationPipelineEngine — existing chain (needs per-stage expansion)
    - MonteCarlo algorithm — uncertainty sampling
    - ProcessCapabilityPredictionEngine — Cpk from MC output
    - OEECalculatorEngine — companion for SPC monitoring
  TRIBAL KNOWLEDGE:
    - MachiningPlaybookEngine — "uncertainty compounds through pipeline — ±10% force → ±15% S/F → ±20% time"
    - tribal tips: "Cpk ≥ 1.33 minimum, ≥ 1.67 for aerospace, ≥ 2.0 for medical"
  FORMULAS:
    - Per-stage uncertainty propagation:
      Stage 1 OCR: ±0.1mm on dimensions
      Stage 3 Material: ±5% on kc1.1 → ±5% on force
      Stage 7 S/F: ±10% on Vc → ±10% on feed → ±15% on cycle time
      Stage 9 Force: ±10% on Fc → ±15% on deflection → ±20% on Ra
      Stage 13 Cost: ±20% on cycle time → ±15% on total cost
    - SPC X-bar/R chart: UCL = X̄ + A₂R̄, LCL = X̄ - A₂R̄ (constants from table)
    - CUSUM: S_i = max(0, S_{i-1} + (x_i - μ₀) - k) — cumulative sum for trend detection
    - EWMA: z_i = λx_i + (1-λ)z_{i-1} — exponentially weighted for small shifts
  REFERENCE:
    - GUM (Guide to Expression of Uncertainty in Measurement) — ISO standard
    - AIAG SPC Reference Manual — automotive quality standard
    - Montgomery "Introduction to Statistical Quality Control" — SPC theory
    - Published Cpk requirements per industry (automotive, aerospace, medical)

INTENT:
  Without per-stage uncertainty, output says "cycle time: 23.4 min" with no indication of
  confidence. With it: "23.4 min (CI95: 21.8-25.1)". SPC charts let the machinist monitor
  process stability: "dimension trending toward UCL — adjust before out-of-spec." These are
  the MOST USED quality tools in real manufacturing — we can't ship without them.

PLAN: Map uncertainty sources per pipeline stage before building
SKILLS: /physics-verify, /predict, /quality-gate, /what-if, /calibrate

WORK:
  U-UQ1: Expand UncertaintyPropagation with explicit per-stage uncertainty sources and chain
    Map 14 pipeline stages → uncertainty source → propagation formula → output CI
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-SPC1: Build SPCMonitoringEngine — X-bar/R, CUSUM, EWMA control charts
    Wire to OEECalculatorEngine for production monitoring
    Generate control limits from first 25 parts, monitor subsequent parts
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for CI presence in output + MCP action prism_calc:spc_chart + /quality-check enhancement
EXIT GATE: ✓ Per-stage CI + SPC charts + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 3-9: Cross-Material Validation Tests (T1 + T2)
```
SMART CONFIG: Role=manufacturing domain expert + test engineer | OPUS | MAX
UNITS: U-XMAT1, U-PHYS-VAL1

KNOWLEDGE SOURCES:
  ENGINES:
    - ALL pipeline engines — run same part through each with different materials
    - MaterialRegistry (1,662L) — alloy-specific properties
    - UltimateSpeedFeedEngine — S/F must differ per material
    - KienzleForceModelEngine — force must differ per material
  TRIBAL KNOWLEDGE:
    - MachiningPlaybookEngine — "same pocket in 4140 vs Ti-6Al-4V → completely different S/F"
    - src/data/*-cam-tips.ts — material-specific tips
    - Sandvik material cutting data — published Vc/fz per alloy
  FORMULAS:
    - Cross-material verification: same geometry, 5 materials:
      4140 (ISO P, kc1.1=1800): Vc=150-240, fz=0.12-0.25
      316L (ISO M, kc1.1=2100): Vc=100-170, fz=0.08-0.20
      Ti-6Al-4V (ISO S, kc1.1=2800): Vc=35-80, fz=0.06-0.15  [FIXED: was 1400, canonical=2800 per constants.ts]
      6061-T6 (ISO N, kc1.1=700): Vc=300-600, fz=0.15-0.35
      D2 at 60HRC (ISO H, kc1.1=2800): Vc=50-120, fz=0.04-0.10
    - Physics validation: hand-calculate expected Fc for each material+geometry:
      Thread milling 4140: published Fr ±15% (Session 3-3 model)
      Plunge milling D2: published Fa ±15% (Session 3-4 model)
      Helical bore 316L: published engagement force ±15%
  REFERENCE:
    - Sandvik Coromant catalogs — Vc/fz per material per operation
    - Kennametal NOVO — cross-reference S/F data
    - Cross-material S/F range tables (from Phase 0-C U-TEST3)
    - Published force measurement data for validation
    - HSMAdvisor tool library: src/data/hsm-advisor-tools.json — real-world S/F baseline ← EXTRACTED 2026-03-25
      PRISM should MEET OR EXCEED HSMAdvisor's recommendations (not match — beat)
    - hyperMILL tool database: src/data/hypermill-tools.json — additional S/F cross-reference ← EXTRACTED 2026-03-25

INTENT:
  If PRISM outputs the SAME speed for titanium and aluminum, it's broken — titanium at
  aluminum speeds = instant tool failure. This session proves EVERY material gets DIFFERENT
  parameters, and those parameters fall within PUBLISHED ranges. We catch material handling
  bugs HERE (Phase 3) instead of Phase 12 (months later).

PLAN: Define test matrix (geometry × 5 materials) before running tests
SKILLS: /test-speed-feed, /physics-verify, /calibrate, /material-lookup, /defaults

WORK:
  U-XMAT1: Create cross-material test suite — same 50mm pocket in 5 materials
    Assert: different Vc, fz, force, cycle time per material
    Assert: all values within Sandvik/Kennametal published ranges
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-PHYS-VAL1: Create physics model validation tests with published data
    Thread milling, plunge milling, helical bore — each with specific published values
    Assert: model output within ±15% of published measurement
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for cross-material range validation + MCP action prism_calc:validate_material_sf + /test-speed-feed enhancement
EXIT GATE: ✓ Cross-material tests pass + physics validated vs published + 4-loop + forge-triple + /compact
```

**`/compact` CHECKPOINT 3-EXT COMPLETE**

---

## PHASE 3-EXT-2: MACHINE COVERAGE + DEPENDENCY FIXES

---

### SESSION 3-10: Sinker EDM Coverage + Phase 12 Independence (MT1 + D1)
```
SMART CONFIG: Role=EDM process engineer + systems architect | OPUS | MAX
UNITS: U-SEDM1, U-P12-1

KNOWLEDGE SOURCES:
  ENGINES:
    - EDMProgramAssemblerEngine — base EDM (needs sinker-specific extension)
    - EDMQualityOrchestratorEngine — 20-stage pipeline (wire-focused, needs sinker stages)
  TRIBAL KNOWLEDGE:
    - MachiningPlaybookEngine — "sinker EDM: electrode wear ratio, orbiting, jump cycle — NOT wire"
    - src/data/*-cam-tips.ts — sinker EDM tips
  FORMULAS:
    - Sinker-specific: electrode wear ratio = volume_electrode_lost / volume_workpiece_removed
    - Orbiting: electrode traces X-Y path during sinking to improve flushing + reduce taper
    - Jump cycle: electrode periodically lifts for debris flushing (frequency = f(depth, area))
    - Electrode material selection: copper (general), graphite (fine detail), tungsten (carbide)
  REFERENCE:
    - Sodick sinker EDM specifications
    - Published sinker EDM wear ratio data per electrode-workpiece combination
    - Sinker EDM programming examples (electrode path, orbit pattern, jump parameters)

INTENT:
  Sinker EDM is a DIFFERENT PROCESS from wire EDM. Wire cuts profiles through stock.
  Sinker SINKS a shaped electrode INTO stock. The physics is different (electrode wear,
  not wire tension). The programming is different (orbiting, not contouring). A shop
  with a sinker EDM gets NO support from PRISM today. This session fixes that gap.

  Phase 12 independence means: when turning pipeline completes (Phase 5), turning tests
  can run IMMEDIATELY — not blocked on grinding (Phase 9) completing first.

PLAN: Design sinker EDM extension architecture + Phase 12 restructure
SKILLS: /forge-engines, /forge-wiring, /trace, /physics-verify

WORK:
  U-SEDM1: Create SINKER-EDM-COMPREHENSIVE-ROADMAP.md OR add sinker milestones to WIRE-EDM roadmap
    Define: 4 milestones (electrode design, orbiting/jump, flushing, testing)
    Define: sinker-specific physics (wear ratio, gap model, surface roughness)
    Define: per-milestone knowledge sources (full ENGINES+TRIBAL+FORMULAS+REFERENCE)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-P12-1: Restructure Phase 12 for per-machine-type independence
    Each machine type's tests can run as soon as its Phase 5-11 work completes
    Remove: requirement that ALL Phases 5-11 complete before ANY Phase 12 testing
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for sinker EDM coverage check + MCP action prism_cam:sinker_edm_program + /cnc-simulate extension
EXIT GATE: ✓ Sinker EDM covered + Phase 12 independent + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 3-11: Wiring Clarity + File Verification (W1 + W2 + K1 + I1 + C1)
```
SMART CONFIG: Role=systems architect + QA | OPUS | HIGH
UNITS: U-WIRE1, U-WIRE2, U-VERIFY1

KNOWLEDGE SOURCES:
  ENGINES:
    - ToolpathThermalEngine — needs explicit wiring destination specified
    - SurfaceFinishPredictorEngine — needs explicit output location specified
    - QualityPredictionEngine — needs output schema defined
  REFERENCE:
    - All 8 per-machine roadmap files — verify existence + milestone count
    - ENGINE_DIGEST.md — verify all referenced engines exist

INTENT:
  Three engines are referenced but never explicitly wired to a pipeline output location.
  Eight per-machine roadmap files are referenced but never verified to exist. Session
  0-PRE-1 tries to audit 9 pipelines in one session (too heavy). Fix all of these so
  the roadmap executes cleanly.

WORK:
  U-WIRE1: Add explicit wiring for ToolpathThermalEngine + SurfaceFinishPredictorEngine
    Specify: WHERE in the pipeline each engine's output appears (decision scoring, setup sheet, program comments)
    Add to: Session 1-4 WORK block as explicit sub-tasks
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-WIRE2: Define QualityPredictionEngine output schema + downstream consumers
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-VERIFY1: Add file existence check to Session 0-PRE-1
    Verify all 8 per-machine roadmap files exist with expected milestone counts
    Reframe 0-PRE-2/3 intents to be machinist-facing
    Split 0-PRE-1 recommendation: 5 pipelines per session (0-PRE-1a, 0-PRE-1b)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for pipeline output completeness + MCP action prism_cam:quality_predict + /quality-check enhancement
EXIT GATE: ✓ All wiring explicit + files verified + intents reframed + 4-loop + forge-triple + /compact
```

**`/compact` → new session**

---

### SESSION 3-EXT-THERM: Thermal Expansion Compensation (CRITICAL — from scrutiny)
```
SMART CONFIG: Role=precision machining specialist + thermal engineer | OPUS | MAX
UNITS: U-THERM1, U-THERM2

KNOWLEDGE SOURCES:
  - src/engines/ThermalExpansionEngine.ts — EXISTS but not in any roadmap session!
  - src/engines/ThermalExpansionJointEngine.ts — EXISTS, also unwired
  - src/physics/constants.ts — CTE values per material
  - MaterialRegistry — thermal properties (conductivity, CTE, specific heat)

INTENT:
  For precision machining (tolerance < 0.01mm), thermal expansion is the DOMINANT
  error source. An aluminum block 300mm long grows 7μm per degree C. A 5°C rise
  from cutting heat = 35μm = exceeds a 10μm tolerance. This was demoted to "minor"
  but physicist scrutiny flagged it as CRITICAL. Wire the existing engines NOW.

WORK:
  U-THERM1: Wire ThermalExpansionEngine + ThermalExpansionJointEngine
    - Predict workpiece bulk temperature rise from cutting energy input
    - Compute dimensional growth using CTE from MaterialRegistry
    - Predict machine thermal drift from spindle power history
    - Generate compensation values (G10 L2 or parameter write in G-code)
    → 4-LOOP with MULTI-ROLE SCRUTINY (/prism-review)

  U-THERM2: Integration into PostProcessor pipeline
    - Add thermal compensation as PostProcessor Phase 2 stage
    - Per-block thermal growth prediction from cumulative cutting energy
    - Machine drift model: spindle growth ~0.005mm/hour typical
    → 4-LOOP with MULTI-ROLE SCRUTINY

EXIT GATE: ✓ Thermal compensation active for tolerance < 0.01mm + tested on aluminum 300mm part
```

**`/compact` → new session**

---

### SESSION 3-EXT-PROBE: In-Process Probing (CRITICAL — 4 engines exist, 0 wired)
```
SMART CONFIG: Role=CMM/probing specialist + CNC programmer | OPUS | MAX
UNITS: U-PROBE1, U-PROBE2

KNOWLEDGE SOURCES:
  - src/engines/ProbeRoutineEngine.ts — EXISTS, unwired
  - src/engines/ProbeRoutineGeneratorEngine.ts — EXISTS, unwired
  - src/engines/ProbingCycleEngine.ts — EXISTS, unwired
  - src/engines/ProbingProgramEngine.ts — EXISTS, unwired
  - Renishaw probing cycle documentation
  - Controller-specific probe macros (Haas G65 P9023, Fanuc custom macro, etc.)

INTENT:
  A CNC program without probing is amateurish. Every production program needs:
  (1) Pre-cycle datum pickup (G54 X/Y/Z from probe), (2) Stock face verification,
  (3) In-cycle feature check for critical dimensions, (4) Post-cycle inspection.
  Four probing engines exist and ZERO are wired into any pipeline. Fix immediately.

WORK:
  U-PROBE1: Wire all 4 probing engines to pipeline
    - Pre-cycle: probe part datum → update WCS automatically
    - Tool setting: G65 P9023 tool length measurement, broken tool detection
    - Controller-specific: Renishaw macros for Haas/Fanuc/Siemens/Okuma
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-PROBE2: Integrate probing into PostProcessor output
    - Pre-cycle probing block generation (before first cutting move)
    - In-cycle probing at critical features (when tolerance < 0.025mm)
    - Post-cycle inspection routine generation
    - SPC data collection from probe results
    → 4-LOOP with MULTI-ROLE SCRUTINY

EXIT GATE: ✓ All 4 probing engines wired + G-code output includes probing routines
```

**`/compact` → new session**

---

### SESSION 3-EXT-PPAP: PPAP/FMEA/Control Plan (CRITICAL — quality engineer scrutiny)
```
SMART CONFIG: Role=quality engineer (AS9100/IATF 16949) + systems architect | OPUS | MAX
UNITS: U-PPAP1, U-PPAP2, U-PPAP3

KNOWLEDGE SOURCES:
  - src/engines/FirstArticleInspectionPipelineEngine.ts — existing AS9102 FAI (wired)
  - src/engines/SPCProcessCapabilityEngine.ts — Cp/Cpk/Pp/Ppk (EXISTS, needs wiring)
  - src/engines/MaterialCertTraceabilityEngine.ts — full chain-of-custody (EXISTS, UNWIRED)
  - src/engines/MetrologyUncertaintyEngine.ts — GUM-compliant uncertainty (EXISTS)
  - src/engines/GaugingEngine.ts — Gauge R&R (EXISTS)
  - src/engines/QualityManagementEngine.ts — NCR/CAPA workflows (EXISTS)
  - src/engines/NelsonSPCRulesEngine.ts — all 8 Western Electric rules (EXISTS)
  - AIAG PPAP Manual (18 elements), APQP phases, FMEA handbook (AIAG-VDA)
  - IATF 16949 Clause 8.3.4.4, AS9100 Clause 8.1.1

INTENT:
  IATF 16949 shops CANNOT ship production parts without PPAP. AS9100 shops need FMEA.
  12 quality/metrology engines EXIST in the codebase but are INVISIBLE to the roadmap.
  Session 3-8 was going to BUILD SPC engines that already exist — reframe as WIRING.
  This session creates the missing quality infrastructure that compliance requires.

WORK:
  U-PPAP1: Build PPAPPackageEngine + ProcessFMEAEngine + ControlPlanEngine
    - PPAPPackageEngine: assembles all 18 PPAP elements from existing engines
    - ProcessFMEAEngine: S/O/D ranking, RPN calculation from pipeline decision data
    - ControlPlanEngine: per-operation inspection spec from process plan + capability data
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-PPAP2: Wire 12 existing quality engines to qualityDispatcher
    - SPCProcessCapabilityEngine → qualityDispatcher: REPLACE inline spc_calculate with delegation
      [R3 FIX: qualityDispatcher line 75-89 does inline Cpk math — must delegate to full engine]
    - NelsonSPCRulesEngine → qualityDispatcher
    - MetrologyUncertaintyEngine → qualityDispatcher + wire MSA workflow (PPAP Element #10)
    - MaterialCertTraceabilityEngine → qualityDispatcher (CRITICAL — AS9100 Clause 8.5.2)
    - CMMPathPlanningEngine, GDTStackupEngine, ToleranceStackUpEngine → qualityDispatcher
    - GaugingEngine → qualityDispatcher: REPLACE gauge_rr placeholder with real engine delegation
      [R3 FIX: qualityDispatcher line 150-160 uses placeholder values — GaugingEngine is real]
    - LeanSixSigmaEngine → qualityDispatcher
    - QualityManagementEngine NCR/CAPA workflow → qualityDispatcher
    - Add calibration status gate to FirstArticleInspectionPipelineEngine (verify equipment_id is calibrated)
    - Add GD&T stack-up as uncertainty source in Session 3-8 per-stage chain
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-PPAP3: Reframe Session 3-8 scope
    - Session 3-8 currently says "Build SPCMonitoringEngine with CUSUM/EWMA"
    - SPCChartingEngine ALREADY implements CUSUM/EWMA
    - Reframe 3-8 as WIRING session for existing SPC engines + per-stage uncertainty
    - Wire probe results → SPC engine → control chart update → alarm → adjustment recommendation
    → 4-LOOP with MULTI-ROLE SCRUTINY

FORGE-TRIPLE: hook for PPAP completeness gate + MCP action prism_quality:ppap_package + /quality-gate enhancement
EXIT GATE: ✓ PPAP package generates from existing data + FMEA produces RPN scores + Control Plan links to inspection methods + 12 quality engines wired
```

**`/compact` → new session**

---

### SESSION 3-EXT-GCODE: G-Code Output Completeness (CRITICAL — machinist + CNC programmer scrutiny)
```
SMART CONFIG: Role=production CNC programmer + post processor developer | OPUS | MAX
UNITS: U-GCODE1, U-GCODE2

KNOWLEDGE SOURCES:
  - src/engines/ProgramStructureEngine.ts — milling program assembly (needs fixes)
  - src/engines/TurningProgramAssemblerEngine.ts — turning program assembly (reference)
  - src/engines/PostProcessorPipelineEngine.ts — 35-stage pipeline
  - src/engines/ControllerDialectEngine.ts — controller-specific syntax
  - Controller manuals: Fanuc 31i, Haas NGC, Siemens 840D, Heidenhain TNC640, Mazak SmoothAi
  - 651 Fusion 360 CPS post processors — reference for controller-specific G/M code patterns ← CATALOGED 2026-03-25
  - Custom AI-enhanced posts in Box: HAAS, OKUMA MULTUS, HURCO — shop-validated G-code output reference
  - hyperMILL post processor XML configs at H:/prism/HYPERMILL/NcGenerator/ — cycle definitions per controller ← EXTRACTED 2026-03-25

INTENT:
  10-agent scrutiny revealed fundamental G-code output gaps that make every generated
  program non-production-ready. These are NOT exotic features — they are standard CNC
  programming practice that every manual programmer includes. Fix them all in one session.

WORK:
  U-GCODE1: Program structure fixes (ProgramStructureEngine + PostProcessor)
    - G41/G42 cutter radius compensation (milling) + TNRC (turning) — per-controller
    - G96/G97 Constant Surface Speed with G50 S-clamp for turning
    - G49 cancel tool length comp in safety preamble
    - G28/G30 safe retract before tool change (controller-specific return position)
    - M01 optional stops between operations for attended machining
    - M00 program stops at critical inspection points
    - Block skip (/) lines for prove-out (skip finish pass on first article)
    - Part counter (macro variable) for production batch completion
    - Arc-on/arc-off approach moves for profile finishing (no dig marks)
    - Per-controller safety preamble templates (not just Fanuc)
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-GCODE2: Controller dialect completeness
    - Siemens turning CYCLE93/95/97/98 in LathePostProcessorEngine
    - G93 inverse time feed for 5-axis wired into PostProcessorPipelineEngine
    - Controller-specific canned cycle availability map (per-controller)
    - Feed-per-rev vs feed-per-min guard for drilling cycles (F-word ambiguity)
    - Per-controller parameter scaling table (Q in mm vs microns — systemic fix)
    - Cycle time estimator: replace flat 0.55s/block with distance/feed + accel ramp
    - Tool change time: use MachineContext.tool_change_time_s, not hardcoded 8s
    → 4-LOOP with MULTI-ROLE SCRUTINY

EXIT GATE: ✓ Safety preamble correct per 6 controllers + G41/G42 in milling + G96/G97 in turning + M01 between ops + cycle time uses distance/feed
```

**`/compact` CHECKPOINT 3-EXT-2 COMPLETE → Phase 4**

---

## PHASE 4: SIMULATION GATE + MONITORING (6 units in 2 sessions + 1 lights-out session)

---

### SESSION 4-1: Simulation Gates (U-SIM1, U-SIM2, U-SIM3)
```
SMART CONFIG: Role=simulation + verification | OPUS | HIGH
UNITS: U-SIM1, U-SIM2, U-SIM3

KNOWLEDGE SOURCES:
  - src/engines/CNCSimulationPipelineEngine.ts — simulation verification pipeline
  - src/engines/BackplotEngine.ts — fast toolpath verification
  - src/engines/CollisionPreventionEngine.ts (E1139) — AABB + narrow-phase collision
  - src/engines/SafetyVetoEngine.ts (E1098) — 8 hard vetoes with physics
  - src/engines/GCodeSafetyAnalyzerEngine.ts — 24 rules × 6 controllers
  - Vericut simulation concepts — material removal verification, collision detection
  - ISO 14649 / STEP-NC — machine-readable manufacturing data for simulation

INTENT:
  No program leaves PRISM without proving it's SAFE. Triple gate: BackplotEngine (fast,
  seconds — catches obvious path errors), CollisionPreventionEngine (geometry-based —
  tool holder vs fixture/stock), CNCSimulationPipeline (full material removal simulation).
  SafetyVeto has 8 hard blocks: rapid into stock, spindle off during cut, missing M-codes.
  A machinist loading a PRISM program can trust it won't crash their $500K machine.

SKILLS TO USE:
  /cnc-simulate            — Vericut-class simulation
  /program-validate        — G-code verification

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "triple gate: backplot (seconds) → collision (geometry) → simulation (full removal)"
  - src/data/*-cam-tips.ts — simulation and verification tips across 18 CAM systems
  - tribal tips: "ZERO tolerance on collision — one pass = one crash = machine destroyed"
  - GCodeSafetyAnalyzerEngine — 24 safety rules × 6 controllers

FORMULAS:
  - Backplot time: O(n_blocks) — milliseconds per block, seconds total
  - Collision check: AABB broad phase → narrow phase mesh intersection
  - Simulation: voxel material removal → compare to target geometry → deviation map
  - Safety margin: all rapids must clear stock by ≥ 2mm (configurable per machine)

SKILLS: /cnc-simulate, /program-validate, /forge-wiring, /trace, /safety-audit

WORK:
  U-SIM1: Wire CNCSimulationPipelineEngine as verification gate
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-SIM2: Wire BackplotEngine as fast pre-check
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-SIM3: Wire CollisionPreventionEngine as absolute gate (ZERO collisions pass)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for collision-free certification + MCP action prism_cam:simulate_verify + /cnc-simulate skill

EXIT GATE: ✓ Triple simulation gate + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 4-2: Digital Twin + Monitoring (U-DT1, U-DT2, U-DT3)
```
SMART CONFIG: Role=Industry 4.0 + monitoring | OPUS | HIGH
UNITS: U-DT1, U-DT2, U-DT3

KNOWLEDGE SOURCES:
  - MTConnect standard — machine monitoring data model (XML schema, data items, streams)
  - OPC-UA specification — industrial communication protocol for CNC machines
  - src/algorithms/FFTAnalyzer.ts, STFTChatter.ts — vibration analysis algorithms
  - src/engines/PredictionCalibrationEngine.ts (E1147) — actual vs predicted feedback
  - src/algorithms/KalmanFilter.ts — state estimation for sensor fusion
  - Digital twin architecture — ISO 23247 (digital twin framework for manufacturing)

INTENT:
  Programs include inline monitoring thresholds: `(EXPECTED Fc: 1200N, ALARM: 1800N)`.
  MTConnect/OPC-UA ingest means real machine data flows back into PRISM. KalmanFilter
  fuses noisy sensor data into clean state estimates. The learning loop closes:
  program → machine runs → actual data back → predictions calibrated → BETTER next program.
  This is how PRISM becomes smarter with every job — a digital twin that improves over time.

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "monitoring thresholds = force alarm at 150% of predicted"
  - src/data/*-cam-tips.ts — monitoring and feedback tips across 18 CAM systems
  - tribal tips: "KalmanFilter for sensor fusion, not raw signals — noise kills predictions"
  - Academy courses — Industry 4.0 fundamentals, digital twin concepts

FORMULAS:
  - Monitoring threshold: F_alarm = F_predicted × 1.5 (configurable per operation)
  - KalmanFilter: x̂(k) = A×x̂(k-1) + K×(z(k) - H×A×x̂(k-1)) — fuse noisy sensor data
  - Learning rate: kc1.1_new = α×kc1.1_measured + (1-α)×kc1.1_old (exponential smoothing)
  - MTConnect data rate: typical 100-1000 Hz for force/vibration, 1-10 Hz for position

SKILLS: /physics-verify, /calibrate, /forge-wiring, /trace, /predict

WORK:
  U-DT1: Wire monitoring threshold generation into programs
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-DT2: Wire MTConnect/OPC-UA data ingest for feedback
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  U-DT3: Wire learning loop (actual→predicted→calibration→better next time)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for monitoring threshold validation + MCP action prism_cam:monitoring_thresholds + /process-health skill

EXIT GATE: ✓ Monitoring + digital twin + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 4-3: Lights-Out / Unmanned Operation Safety Package (CRITICAL — from scrutiny)
```
SMART CONFIG: Role=automation engineer + production night-shift supervisor | OPUS | MAX
UNITS: U-LIGHTS1, U-LIGHTS2

KNOWLEDGE SOURCES:
  - src/engines/BarFeederEngine.ts — EXISTS, unwired (end-of-bar detection)
  - src/engines/ChipConveyorEngine.ts — EXISTS, unwired (conveyor monitoring)
  - src/engines/ToolBreakagePredictionEngine.ts — breakage risk per block
  - src/engines/ToolChangeOptimizationEngine.ts — sister tool logic
  - Controller-specific: Haas M135 (coolant level), Mazak M215, Fanuc alarm handling

INTENT:
  Lights-out machining is where shops make real money — 2nd/3rd shifts with nobody there.
  This requires sister tooling, breakage detection, coolant monitoring, chip evacuation,
  and alarm handling. A tool break at 2AM with no operator = scrap part + crashed spindle.
  This session wires the safety package that makes unmanned operation viable.

WORK:
  U-LIGHTS1: Wire BarFeederEngine + ChipConveyorEngine + sister tool logic
    - Bar feeder end-of-bar detection → automatic bar change or alarm
    - Chip conveyor monitoring macros → alarm if conveyor stalls
    - Sister tooling: T01 backup = T21, auto-switchover on tool life counter
    - Add `unmanned_mode: boolean` flag to PipelineInput
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-LIGHTS2: Breakage detection + alarm handling + coolant monitoring
    - Wire ToolBreakagePredictionEngine per-block breakage_probability
    - G65 P9100 probe-after-N-parts routine for breakage detection
    - Coolant level monitoring M-codes (controller-specific)
    - Alarm handling subroutine (retract, stop spindle, send alert)
    → 4-LOOP with MULTI-ROLE SCRUTINY

EXIT GATE: ✓ Unmanned mode adds sister tools + breakage detection + monitoring macros to G-code
```

**`/compact` → new session**

---

### SESSION 4-PERF: Performance & Scale Testing
```
SMART CONFIG: Role=performance engineer + load tester | OPUS | HIGH
UNITS: U-PERF1, U-PERF2

KNOWLEDGE SOURCES:
  - src/__tests__/stressTest.test.ts — current: 200 reqs, 5 concurrent (reduced for CI)
  - src/engines/CacheEngine.ts — LRU 50MB, local only
  - src/engines/index.ts — 4,518 lines, 150 engines eager-loaded
  - dist/index.js — 61MB bundle

WORK:
  U-PERF1: Load testing (~200 LOC)
    - 1000+ request stress test (not 200): 10 concurrent, <500ms P95 for S/F
    - 50,000-block program through PostProcessor: verify no OOM, <30s, <500MB heap
    - Startup time benchmark: measure cold-start to first-request-served
    - Memory leak detection: run same program 100 times, verify heap stable
    - Add connection pooling to Express HTTP transport
    → /compact

  U-PERF2: Caching + lazy loading optimization (~200 LOC)
    - Verify engine lazy-loading (dynamic import for unused engines)
    - Wire ComputationCache to SpeedFeedOrchestrator (SHA-256 key per operation)
    - LRU cache for material/tool registry lookups
    - Bundle size audit: identify top 10 largest engines
    - Add memory guard to PostProcessor: reject programs >100K blocks with warning
    → /compact

EXIT GATE: ✓ 1000-req stress passes <500ms P95 + 50K-block program <30s + startup <5s + cache reduces re-computation
```

**`/compact` CHECKPOINT 4 COMPLETE (including performance)**
INTEGRATION SMOKE TEST: Full pipeline — print read → feature recognition → strategy
selection → physics fusion (tier 2) → S/F optimization → G-code generation → POST-ULT
→ probing routines → simulation verification. Run on 1 turning + 1 milling part.
Compare to previous checkpoint. Verify per-block S/F variability in output.

---

## PHASE 5: ERP & BUSINESS MANAGEMENT HARDENING (28 units in 10 sessions)

Brings the 42+ business engines, 169 dispatcher actions, and 46 frontend pages to the
same production-grade quality as the machining/physics layer. Currently: in-memory Maps,
hardcoded rates ($85/hr machine, $45/hr labor), simple Vc lookup (5 if-statements),
no real ERP connectors, Math.random() for actuals. After this phase: PostgreSQL-persisted,
physics-fed costing from SpeedFeedOrchestrator, registry-backed material/tool/machine data,
real E2 Shop System connector with bidirectional sync, and end-to-end QuoteToShip validation.

PREREQUISITE: Phase 4-PERF (performance baseline established), SESSION 0-D-ARCH (registries wired)
EXISTING LIGHT PASS: SESSION 2-ERP (audit + top-10 wiring) — Phase 5 supersedes and completes it.

**FRONTEND ALIGNMENT NOTE (from 2026-03-27 HANDOFF):**
  Backend work in this phase MUST plan for the upgraded frontend shell and E2/QuickBooks/Xometry/Fictiv-style UX.
  Required backend support to build now:
  - saved views, queue counts, and role-based desk payloads
  - record timelines, audit history, comments, attachments, and linked documents
  - approval/assignment workflows across quotes, purchasing, invoicing, payroll, HR, and quality
  - quote revision history, file upload, DFM feedback, and customer status tracking
  - job traveler, route-step history, machine queue/dispatch state, and shortage-linked purchasing/inventory actions
  - calculator/toolpath/PPG preset libraries, compare history, controller/post validation payloads
  - learning progression, checkpoints/exams, and media/reference bundles

---

### SESSION 5-1: Persistence Layer Migration (U-PERS1, U-PERS2, U-PERS3)
```
SMART CONFIG: Role=database architect + backend engineer | OPUS | MAX
UNITS: U-PERS1, U-PERS2, U-PERS3
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/db/schema.sql — existing PostgreSQL schema (jobs, quotes, machines, materials, tools, customers, audit_log)
  - src/db/connection.ts — connection pooling (20 connections), transaction support
  - src/engines/ERPIntegrationEngine.ts lines 153-170 — 5 in-memory Maps (workOrders, plans, costFeedback, qualityRecords, toolInventory)
  - src/engines/JobLifecycleEngine.ts — in-memory job state
  - src/engines/TimeClockEngine.ts — in-memory clock entries
  - src/engines/InvoicingEngine.ts — in-memory invoice storage
  - src/engines/CustomerManagementEngine.ts — in-memory CRM data
  - src/engines/GeneralLedgerEngine.ts — in-memory journal entries
  - src/engines/PurchaseOrderEngine.ts — in-memory PO storage
  - src/engines/EmployeeEngine.ts — in-memory employee records

INTENT:
  Every business engine stores data in JavaScript Maps that vanish on restart. A shop that
  enters 50 work orders, tracks 200 time entries, and builds 30 invoices loses EVERYTHING
  when the server restarts. This is the single biggest gap between "demo" and "production."
  After this session, all business state survives restarts via PostgreSQL. The in-memory
  fallback stays for development/testing, but production uses real persistence.

WORK:
  U-PERS1: Extend PostgreSQL schema for ERP state
    - Add tables: work_orders, prism_plans, cost_feedback, quality_records, quality_measurements
    - Add tables: time_entries, invoices, invoice_line_items, employees, purchase_orders, po_line_items
    - Add tables: gl_journal_entries, gl_accounts, customer_communications
    - Migration script: src/db/migrations/001-erp-persistence.sql
    - Indexes on: wo_number, part_number, customer_id, job_status, invoice_date
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-PERS2: Create persistence adapter pattern
    - Interface: IBusinessStore<T> { save, findById, findAll, update, delete, query }
    - PostgresBusinessStore<T> implements IBusinessStore — uses connection pool
    - InMemoryBusinessStore<T> implements IBusinessStore — current Maps (fallback)
    - Factory: getStore(entity) returns Postgres if DATABASE_URL set, else InMemory
    - Transaction wrapper: withTransaction(fn) for multi-table operations
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-PERS3: Migrate top 6 engines to persistence adapter
    - ERPIntegrationEngine: workOrders Map → getStore("work_orders")
    - ERPIntegrationEngine: plans Map → getStore("prism_plans")
    - ERPIntegrationEngine: costFeedback array → getStore("cost_feedback")
    - InvoicingEngine: invoices Map → getStore("invoices")
    - TimeClockEngine: entries → getStore("time_entries")
    - GeneralLedgerEngine: accounts/entries → getStore("gl_accounts") + getStore("gl_entries")
    - Test: restart server → data survives (integration test with test DB)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook blocking new in-memory Maps in business engines + MCP action prism_dev:erp_persistence_health + /erp-health skill
EXIT GATE: ✓ 12 new tables + adapter pattern + 6 engines migrated + restart survival test + /compact
```

**`/compact` → new session**

---

### SESSION 5-2: Shop Configuration System (U-CONF1, U-CONF2)
```
SMART CONFIG: Role=shop operations + configuration architect | OPUS | MAX
UNITS: U-CONF1, U-CONF2
ESTIMATED CONTEXT: 45-55%

KNOWLEDGE SOURCES:
  - src/engines/ERPIntegrationEngine.ts lines 223-228 — hardcoded: $85/hr machine, $45/hr labor, $25/part material, $15/op tooling
  - src/engines/JobCostingEngine.ts — embedded rates: labor $45/hr, overhead $35/hr, machines $75-150/hr
  - src/engines/CapacityPlanningEngine.ts — hardcoded 8 machines with fixed efficiency factors
  - src/engines/MachineRateDatabaseEngine.ts — machine rate lookup (exists but disconnected from costing)
  - src/registries/MachineRegistry.ts — 910 machines with hourly_rate_usd field
  - Machinist's Handbook — shop rate calculation methodology

INTENT:
  Every shop has different rates. A garage shop in Ohio runs $65/hr machine; an aerospace
  job shop in Connecticut runs $225/hr for 5-axis. Hardcoding $85/hr means quotes are wrong
  for EVERY shop except the imaginary one we coded for. After this session, shops configure
  their own rates, machines, overhead multipliers, and material markups — and every quote,
  cost estimate, and schedule uses THEIR numbers, not ours.

WORK:
  U-CONF1: ShopConfigurationEngine (~400 LOC)
    - Interface: ShopProfile { name, rates: ShopRates, machines: ShopMachine[], overhead_pct, material_markup_pct }
    - ShopRates: { labor_per_hr, overhead_per_hr, admin_per_hr, setup_per_hr, programming_per_hr, inspection_per_hr }
    - ShopMachine: { id, name, type, hourly_rate, efficiency_factor, capabilities[] }
    - Default profile pre-populated from current hardcoded values (no regression)
    - Persist to PostgreSQL (shop_profiles table)
    - Actions: shop_config_get, shop_config_update, shop_config_machines, shop_config_rates, shop_config_reset
    - Wire MachineRateDatabaseEngine as data source for defaults
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-CONF2: Wire shop config into all costing engines
    - ERPIntegrationEngine.importWorkOrder(): replace hardcoded $85/$45/$25/$15 with shopConfig.rates
    - JobCostingEngine: replace embedded rates with shopConfig lookup
    - CapacityPlanningEngine: replace hardcoded 8 machines with shopConfig.machines[]
    - QuoteEstimatorEngine: wire shopConfig.overhead_pct and material_markup_pct
    - ShopSchedulerEngine: machine capabilities from shopConfig
    - ActualCostEngine: shop-specific overhead calculation
    - Test: change shop rate → quote changes proportionally
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook validating shop rates are within sane bounds (labor $20-300/hr, overhead 0-200%) + MCP action prism_product:shop_config + /shop-setup wizard skill
EXIT GATE: ✓ ShopConfigEngine + all costing engines wired + rate change test + /compact
```

**`/compact` → new session**

---

### SESSION 5-3: Physics-Fed Costing (U-PHYSCOST1, U-PHYSCOST2, U-PHYSCOST3)
```
SMART CONFIG: Role=manufacturing economist + cutting science | OPUS | MAX
UNITS: U-PHYSCOST1, U-PHYSCOST2, U-PHYSCOST3
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - src/engines/SpeedFeedOrchestratorEngine.ts — 2,963 LOC, 8 resolvers, Monte Carlo UQ
  - src/engines/KienzleForceModelEngine.ts — Fc = kc1_1 × ap × h^(1-mc) with corrections
  - src/engines/ERPIntegrationEngine.ts lines 174-181 — 5-line Vc lookup (replacing this)
  - src/engines/QuoteEstimatorEngine.ts — feature-based estimation (already has some physics)
  - src/engines/JobCostingEngine.ts — material-specific cycle time from physics
  - src/physics/constants.ts — CANONICAL_MATERIAL_DB (13 materials), Kienzle/Taylor constants
  - src/engines/StochasticToolLifeEngine.ts — Weibull tool life distribution
  - src/engines/ToolCostPerPartEngine.ts — tool amortization per quantity
  - Sandvik Coromant Technical Guide — published Vc/fz ranges for cost validation

INTENT:
  The ERPIntegrationEngine calculates cycle time with 5 if-statements that return 400 m/min
  for aluminum and 35 m/min for Inconel — no tool geometry, no ap/ae, no force checking.
  A quote based on this is ±50% at best. After this session, cycle times flow from
  SpeedFeedOrchestrator (Kienzle force + Taylor life + chatter check), meaning quotes
  carry physics-backed CI95 uncertainty bands. A shop owner sees: "This part costs $47.20
  (95% CI: $42.10 - $53.80)" instead of a made-up number.

WORK:
  U-PHYSCOST1: Replace ERPIntegrationEngine Vc lookup with SpeedFeedOrchestrator
    - Replace getVc() function (lines 174-181) with lazy import of SpeedFeedOrchestrator
    - importWorkOrder() calls orchestrator per routing step: material + tool + machine → S/F + cycle time
    - Fallback: if orchestrator fails, use CANONICAL_MATERIAL_DB Vc (not 5 if-statements)
    - Remove Math.random() from cost feedback (line 274) — require real actuals or mark as "estimated"
    - Remove hardcoded cycleTime = 5 + Math.random() * 10 (line 201)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-PHYSCOST2: Wire Kienzle + Taylor into JobCostingEngine
    - Cycle time: from SpeedFeedOrchestrator (material removal rate → time per feature)
    - Tool cost: from Taylor tool life → tools consumed per batch → ToolCostPerPartEngine
    - Power cost: from KienzleForceModel → power_kW × rate_per_kWh × time
    - Replace static $15/op tooling with physics-based tool consumption estimate
    - Replace static $25/part material with MaterialRegistry price × stock volume
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-PHYSCOST3: Uncertainty-aware quoting
    - QuoteEstimatorEngine: propagate SpeedFeedOrchestrator's CI95 through cost model
    - Output: { estimated_cost, ci95_low, ci95_high, confidence, dominant_uncertainty_source }
    - dominant_uncertainty_source tells shop: "tool life is the biggest cost driver for this quote"
    - Test: quote for Ti-6Al-4V part must show wider CI than 6061 aluminum
    - Test: CI95 must bracket actual cost for 5 historical parts (from cost_feedback table)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook blocking hardcoded Vc in business engines + MCP action prism_product:physics_quote + /quote-physics skill
EXIT GATE: ✓ SpeedFeedOrchestrator in ERP + Kienzle/Taylor in JobCosting + CI95 quotes + Ti vs Al uncertainty test + /compact
```

**`/compact` → new session**

---

### SESSION 5-4: Registry Wiring for Business Engines (U-BIZREG1, U-BIZREG2, U-BIZREG3)
```
SMART CONFIG: Role=data integration + registry specialist | OPUS | MAX
UNITS: U-BIZREG1, U-BIZREG2, U-BIZREG3
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/registries/MaterialRegistry.ts — 2,957 materials × 127 parameters (4-layer resolution)
  - src/registries/MachineRegistry.ts — 910 machines × 4 data layers
  - src/registries/ToolRegistry.ts — 95,608 tools × 85 parameters
  - src/engines/QuoteEstimatorEngine.ts — already uses MaterialRegistry + ToolRegistry (reference pattern)
  - src/engines/PipelineRegistryBridge.ts — 3 resolvers (resolveMaterial, resolveMachine, resolveTool)
  - src/engines/InventoryOptimizationEngine.ts — EOQ/safety stock (no registry connection)
  - src/engines/CapacityPlanningEngine.ts — 8 hardcoded machines
  - src/engines/MarketMaterialPricingEngine.ts — material pricing (disconnected from MaterialRegistry)

INTENT:
  The business engines hardcode data that the registries have at 100x the depth. CapacityPlanning
  knows 8 machines; MachineRegistry knows 910. InventoryOptimization calculates EOQ with no
  knowledge of which tools actually exist. MarketMaterialPricing has its own material list that
  doesn't match MaterialRegistry. After this session, every business engine queries the same
  registries that the physics layer uses — one source of truth for materials, tools, and machines.

WORK:
  U-BIZREG1: Wire MaterialRegistry into business engines
    - QuoteEstimatorEngine: already wired (verify + document pattern)
    - JobCostingEngine: material_prices lookup → MaterialRegistry.findByName() → price_per_kg
    - MarketMaterialPricingEngine: internal DB → MaterialRegistry as primary, internal as override
    - StockSizeOptimizerEngine: material density/stock sizes from MaterialRegistry
    - ActualCostEngine: material variance uses MaterialRegistry unit price
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-BIZREG2: Wire MachineRegistry into business engines
    - CapacityPlanningEngine: replace 8 hardcoded machines with MachineRegistry.findByType()
    - ShopSchedulerEngine: machine capabilities from MachineRegistry.getCapabilities()
    - MachineRateDatabaseEngine: merge with MachineRegistry hourly_rate_usd field
    - OEECalculatorEngine: machine specs from registry for theoretical max output
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-BIZREG3: Wire ToolRegistry into business engines
    - InventoryOptimizationEngine: tool catalog from ToolRegistry (95K tools)
    - ToolUsageEngine: tool specs from ToolRegistry for wear tracking
    - ToolCostPerPartEngine: tool price from ToolRegistry.findById()
    - InventoryAwareToolSelectorEngine: available tools from ToolRegistry + inventory levels
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook blocking hardcoded material/machine/tool data in business engines + MCP action prism_dev:registry_coverage + /registry-audit skill
EXIT GATE: ✓ 3 registries wired into 12+ business engines + single source of truth verified + /compact
```

**`/compact` → new session**

---

### SESSION 5-5: E2 Shop System Connector (U-E2-1, U-E2-2, U-E2-3)
```
SMART CONFIG: Role=integration engineer + ERP specialist | OPUS | MAX
UNITS: U-E2-1, U-E2-2, U-E2-3
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - src/engines/ERPIntegrationEngine.ts lines 346-354 — ERP_SYSTEMS array (E2 listed as "jobboss")
  - src/tools/dispatchers/integrationDispatcher.ts — existing ERP action routing
  - src/engines/CAMIntegrationEngine.ts — external API client pattern (reference)
  - src/engines/DNCTransferEngine.ts — external system connector pattern (reference)
  - src/engines/BatchCAMToolBridgeEngines.ts — node-fetch lazy import pattern
  - E2 Shop System REST API documentation (endpoints: /workorders, /routings, /inventory, /timeclock)
  - src/db/schema.sql — e2_integrations table (added in U-PERS1)

INTENT:
  E2 Shop System is one of the most common ERPs in small-to-mid machine shops. The user's
  shop runs E2. Currently, PRISM says E2 is "supported" but there's no actual connector.
  After this session, a shop can point PRISM at their E2 instance, import work orders,
  let PRISM optimize speeds/feeds/tooling, and push the optimized routing back to E2.
  The feedback loop means every completed job makes the next quote more accurate.

WORK:
  U-E2-1: E2 API client engine (~500 LOC)
    - E2ShopConnectorEngine with actions:
      e2_connect (validate credentials + test endpoint)
      e2_import_wo (pull work order → PRISM WorkOrder interface)
      e2_import_batch (pull multiple WOs by date range or status)
      e2_export_plan (push PRISM-optimized routing back to E2)
      e2_sync_inventory (pull tool crib inventory → ToolInventoryItem[])
      e2_get_time_tracking (pull time entries → TimeClockEngine format)
      e2_get_job_status (pull job status from E2)
    - Auth: API key stored encrypted in e2_integrations table
    - HTTP client: lazy-import node-fetch, configurable timeout (30s default)
    - Error handling: connection timeout → structured error with retry hint
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-E2-2: Field mapping + data normalization
    - E2WorkOrder → PRISM WorkOrder bidirectional mapper
    - E2RoutingStep → PRISM RoutingStep (map E2 work center codes → PRISM machine IDs)
    - E2ToolItem → PRISM ToolInventoryItem (map E2 crib locations → PRISM tool IDs)
    - E2TimeEntry → PRISM TimeClockEngine format
    - E2 material names → MaterialRegistry ISO group resolution (fuzzy match with ISO gating)
    - Validation: unmappable fields logged as warnings, not errors
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-E2-3: Bidirectional sync + feedback loop
    - Sync scheduler: configurable poll interval (default: 5 min for WO status, 1hr for inventory)
    - Change detection: compare E2 timestamps to last_sync in e2_integrations table
    - Conflict resolution: E2 wins for WO status, PRISM wins for optimized parameters
    - Feedback loop: E2 actual times → ActualCostEngine → QuoteEstimatorEngine calibration
    - Test: mock E2 API server + round-trip import/optimize/export test
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook validating E2 credentials never logged or exposed + MCP action prism_integration:e2_connect + /e2-setup wizard skill
EXIT GATE: ✓ E2 connector 7 actions + field mapping + bidirectional sync + mock API test + /compact
```

**`/compact` → new session**

---

### SESSION 5-6: Cross-Engine Wiring (U-XWIRE1, U-XWIRE2, U-XWIRE3)
```
SMART CONFIG: Role=systems integrator + process engineer | OPUS | MAX
UNITS: U-XWIRE1, U-XWIRE2, U-XWIRE3
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/engines/JobLifecycleEngine.ts — 13-state lifecycle (quoted → shipped)
  - src/engines/ActualCostEngine.ts — cost variance (labor + material + tooling + machine + overhead)
  - src/engines/TimeClockEngine.ts — clock in/out, job time tracking
  - src/engines/QualityManagementEngine.ts — SPC, calibration, NCR, FAI, material certs
  - src/engines/ToolUsageEngine.ts — tool usage start/stop, regrind, job cost
  - src/engines/InventoryOptimizationEngine.ts — EOQ, safety stock, ABC analysis
  - src/engines/PurchaseOrderEngine.ts — PO creation, approval, receiving, 3-way match
  - src/engines/MarketMaterialPricingEngine.ts — material pricing, surcharges
  - src/engines/OEECalculatorEngine.ts — availability × performance × quality

INTENT:
  Business engines are islands. A job completes in JobLifecycle but ActualCostEngine doesn't
  know. TimeClock records 8 hours on a job but JobCosting still uses estimated time. Quality
  finds a defect but the job status doesn't update. After this session, completing a job
  automatically: records actual time from TimeClock, calculates cost variance via ActualCost,
  triggers quality check, updates OEE, and posts to GeneralLedger. One action → full cascade.

WORK:
  U-XWIRE1: JobLifecycle ↔ ActualCost ↔ TimeClock chain
    - job_update_status("complete") triggers:
      → TimeClockEngine.getJobTotalHours(job_id) → actual labor hours
      → ActualCostEngine.calculate(job_id, actual_hours) → variance report
      → GeneralLedgerEngine.recordJobCompletion(job_id, actual_cost) → GL posting
    - job_update_status("in_progress") triggers:
      → TimeClockEngine.startJobTimer(job_id, operator_id)
    - Test: complete a job → verify GL entry created with correct amounts
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-XWIRE2: Quality ↔ Inspection ↔ JobLifecycle chain
    - quality_fai_create(job_id) triggers:
      → JobLifecycleEngine.updateStatus(job_id, "qc_pending")
    - quality_fai pass/fail triggers:
      → pass: JobLifecycleEngine.updateStatus(job_id, "qc_passed")
      → fail: JobLifecycleEngine.updateStatus(job_id, "qc_failed") + NCR auto-create
    - OEECalculatorEngine: quality_rate pulled from QualityManagement pass_rate
    - Test: FAI failure → job status "qc_failed" + NCR exists + OEE quality drops
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-XWIRE3: Inventory ↔ PurchaseOrder ↔ MaterialPricing chain
    - ToolUsageEngine.endUsage(tool_id) → check if below reorder_point
      → below: auto-generate PurchaseOrderEngine.create(tool_id, reorder_qty)
    - InventoryOptimizationEngine.reorderAlert(tool_id) → PO suggestion with EOQ quantity
    - PurchaseOrderEngine.receive(po_id) → InventoryOptimization update stock + actual price
    - MarketMaterialPricingEngine: feed actual purchase prices back for quote calibration
    - Test: tool falls below reorder → PO auto-created with EOQ quantity
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook enforcing cross-engine event propagation for new business actions + MCP action prism_dev:business_wiring_audit + /biz-health skill
EXIT GATE: ✓ 3 wiring chains + job→cost→GL cascade + quality→lifecycle chain + inventory→PO chain + /compact
```

**`/compact` → new session**

---

### SESSION 5-7: Engine Consolidation (U-CONSOL1, U-CONSOL2)
```
SMART CONFIG: Role=code archaeologist + refactoring specialist | OPUS | MAX
UNITS: U-CONSOL1, U-CONSOL2
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - src/engines/QuotingEngine.ts — basic quote generation
  - src/engines/QuoteEstimatorEngine.ts — physics-backed estimation (canonical target)
  - src/engines/CostEstimationEngine.ts — cycle time based costing
  - src/engines/CostEstimatorEngine.ts — similar to CostEstimation (near-duplicate)
  - src/engines/PipelineCostModelEngine.ts — aggregate pipeline cost
  - src/engines/ShopSchedulerEngine.ts — priority dispatch (770 LOC)
  - src/engines/JobShopSchedulingEngine.ts — job-shop scheduling (duplicate concept)
  - src/tools/dispatchers/businessDispatcher.ts — 169 actions (identify duplicates)

INTENT:
  3 quoting engines, 3 costing engines, 2 schedulers — built by different sessions without
  checking for overlap. A shop owner calling "quote" might hit QuotingEngine (basic) or
  QuoteEstimatorEngine (physics-backed) depending on which dispatcher action they call.
  After this session, one canonical engine per domain: QuoteEstimatorEngine (quoting),
  JobCostingEngine (costing), ShopSchedulerEngine (scheduling). Duplicates deprecated
  with redirect wrappers for backwards compatibility.

WORK:
  U-CONSOL1: Merge 3 quoting + 3 costing engines
    - QuoteEstimatorEngine becomes canonical quote engine
    - QuotingEngine: merge unique features into QuoteEstimator, deprecate with wrapper
    - CostEstimatorEngine: merge into JobCostingEngine, deprecate with wrapper
    - CostEstimationEngine: merge into JobCostingEngine, deprecate with wrapper
    - PipelineCostModelEngine: wire as aggregation layer ON TOP of JobCostingEngine (not parallel)
    - Update businessDispatcher: redirect deprecated actions to canonical engines
    - NO action names change (backwards compatible) — only internal routing changes
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-CONSOL2: Merge 2 schedulers + clean dispatcher
    - ShopSchedulerEngine becomes canonical scheduler
    - JobShopSchedulingEngine: merge unique algorithms into ShopScheduler, deprecate
    - Audit businessDispatcher 169 actions: identify and merge any remaining duplicates
    - Document canonical engine map: { domain → engine } in businessDispatcher header comment
    - Test: all 169 business actions still resolve correctly after consolidation
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook blocking creation of new engines that duplicate existing canonical engines + MCP action prism_dev:engine_overlap_scan + /dedup skill
EXIT GATE: ✓ 1 canonical per domain + deprecated wrappers + 169 actions still resolve + /compact
```

**`/compact` → new session**

---

### SESSION 5-8: Frontend → Backend Wiring (U-FEWIRE1, U-FEWIRE2, U-FEWIRE3)
```
SMART CONFIG: Role=full-stack + API integration | OPUS | HIGH
UNITS: U-FEWIRE1, U-FEWIRE2, U-FEWIRE3
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - web/src/pages/ — 46+ business pages (QuoteBuilder, JobPlanner, Inventory, Invoices, etc.)
  - src/tools/dispatchers/businessDispatcher.ts — 169 actions = the API surface
  - src/routes/erp.ts — 10 REST endpoints (quote, job, analytics)
  - src/routes/index.ts — route registration
  - web/src/api/ — existing API client patterns (speedfeed.ts)
  - DISPATCHER_DIGEST.md — all dispatchers with action counts

INTENT:
  Codex built 46 frontend pages. The backend has 169 business actions. But many pages render
  static/mock data instead of calling the real dispatchers. After this session, every frontend
  page calls real backend endpoints. A shop owner clicks "Generate Quote" and gets a physics-
  backed cost estimate, not a hardcoded placeholder.

WORK:
  U-FEWIRE1: Wire 15 financial/quote pages
    - QuoteBuilderPage → POST /erp/quote/generate (prism_product:shop_quote)
    - QuoteAnalyticsPage → POST /erp/analytics/* (prism_product:analytics_*)
    - BlueprintQuotePage → POST /erp/quote/blueprint (prism_product:blueprint_to_quote)
    - InvoicesPage → businessDispatcher:invoice_* (5 actions)
    - PurchaseOrdersPage → businessDispatcher:po_* (7 actions)
    - GeneralLedgerPage → businessDispatcher:gl_* (9 actions)
    - FinancialAnalysisPage → businessDispatcher:financial_* (4 actions)
    - MaterialPricingPage → businessDispatcher:material_price_* (4 actions)
    - Add API endpoints in erp.ts for any missing routes
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-FEWIRE2: Wire 10 operational pages
    - JobPlannerPage → POST /erp/job/plan + businessDispatcher:job_*
    - SchedulingPage → businessDispatcher:scheduling_* (4 actions)
    - InventoryPage → businessDispatcher:inventory_* (4 actions)
    - CapacityPlanningPage → businessDispatcher:capacity_* (7 actions)
    - QualityManagementPage → businessDispatcher:quality_* (12 actions)
    - OrderTrackingPage → businessDispatcher:order_* (8 actions)
    - DashboardPage → businessDispatcher:reporting_dashboard
    - ReportsPage → businessDispatcher:reporting_* (6 actions)
    - BatchPlanningPage → businessDispatcher:batch_* (4 actions)
    - SafetyMonitorPage → already wired (verify)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-FEWIRE3: Wire 6 HR/admin + 5 specialty quote pages
    - ShopFloorClockPage → businessDispatcher:clock_* + job_time_* (7 actions)
    - EmployeeDirectoryPage → businessDispatcher:employee_* (5 actions)
    - PayrollPage → businessDispatcher:payroll_* (3 actions)
    - HRCompliancePage → businessDispatcher:hr_* (15 actions)
    - CustomersPage → businessDispatcher:customer_* (14 actions)
    - AdditiveQuotePage → businessDispatcher:additive_* (3 actions)
    - SheetMetalQuotePage → businessDispatcher:sheet_metal_* (1 action)
    - InjectionMoldPage → businessDispatcher:injection_mold_* (3 actions)
    - Verify all 46 pages have at least one real backend call
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
EXIT GATE: ✓ 46 pages verified wired + 0 pages with only mock data + /compact
```

**`/compact` → new session**

---

### SESSION 5-9: QuoteToShip End-to-End Validation (U-Q2S1, U-Q2S2)
```
SMART CONFIG: Role=manufacturing process + integration test | OPUS | MAX
UNITS: U-Q2S1, U-Q2S2
ESTIMATED CONTEXT: 70-80%

KNOWLEDGE SOURCES:
  - src/engines/QuoteToShipOrchestratorEngine.ts — 21-stage pipeline (2,851 LOC)
  - src/engines/index.ts — QuoteToShip NOT exported (noted in SESSION 2-ERP)
  - All 21 stage engines (lazy-loaded):
    BlueprintReaderEngine, FeatureRecognitionEngine, DFMCheckEngine, FeasibilityOrchestratorEngine,
    QuoteEstimatorEngine, (approval gate), ProcessPlannerEngine, MakeVsBuyEngine,
    MaterialProcurementEngine, SmartToolSelectorEngine, OptimalStrategySelectionEngine,
    SpeedFeedOrchestratorEngine, PrintToProgramPipelineEngine, PostProcessorPipelineEngine,
    SetupSheetEngine, ProbeRoutineEngine, CNCSimulationPipelineEngine, ProductionPackageEngine,
    JobLifecycleEngine, QualityManagementEngine, ShippingEngine
  - src/engines/E2ShopConnectorEngine.ts — E2 connector (from SESSION 5-5)

INTENT:
  The crown jewel: 21 stages from blueprint to shipping. Currently not even exported from
  index.ts. After this session, a shop owner can: import a work order from E2 → PRISM runs
  all 21 stages → optimized program + setup sheet + quote → results pushed back to E2.
  End-to-end integration test proves the FULL business pipeline works, not just individual engines.

WORK:
  U-Q2S1: Export + wire + validate all 21 stages
    - Export QuoteToShipOrchestratorEngine from src/engines/index.ts
    - Wire to dispatcher: prism_intelligence:quote_to_ship_run
    - Verify each of the 21 stage engines exists and is importable
    - Fix any lazy-import failures (engine renamed/moved since pipeline was written)
    - Add Zod schema for pipeline input/output
    - Wire E2 connector as input source (e2_import_wo → QuoteToShip pipeline)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-Q2S2: End-to-end integration test
    - Test part: 6061 aluminum bracket, 10 qty, 5 features (2 pockets, 2 holes, 1 slot)
    - Run all 21 stages, verify each stage produces non-empty output
    - Verify: quote has CI95 bounds, program has real G-code, setup sheet has real tool list
    - Verify: cost breakdown matches physics-fed calculation (not hardcoded)
    - Verify: job created in JobLifecycle with "quoted" status
    - Feedback test: simulate job completion → actual cost recorded → variance calculated
    - Performance: full pipeline < 30 seconds for simple part
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook blocking removal of QuoteToShip export + MCP action prism_intelligence:quote_to_ship_status + /quote-to-ship skill
EXIT GATE: ✓ QuoteToShip exported + 21 stages verified + E2E test passes + feedback loop works + /compact
```

**`/compact` → new session**

---

### SESSION 5-10: Multi-ERP Connector Framework (U-MULTIERP1, U-MULTIERP2)
```
SMART CONFIG: Role=integration architect + API designer | OPUS | HIGH
UNITS: U-MULTIERP1, U-MULTIERP2
ESTIMATED CONTEXT: 45-55%

KNOWLEDGE SOURCES:
  - src/engines/E2ShopConnectorEngine.ts — E2 connector (built in SESSION 5-5, reference pattern)
  - src/engines/ERPIntegrationEngine.ts — ERP_SYSTEMS array (7 systems listed)
  - src/engines/IntegrationAdapterEngine.ts — QuickBooks/CSV/payroll export (existing)
  - src/engines/BatchCAMToolBridgeEngines.ts — multi-system bridge pattern (reference)
  - Epicor Kinetic REST API documentation
  - ProShop ERP API documentation
  - Global Shop Solutions API documentation

INTENT:
  E2 is wired (Session 5-5), but shops run different ERPs. The connector abstraction means
  adding a new ERP is writing one adapter class, not rewiring the whole system. After this
  session, PRISM supports 4 ERPs (E2, Epicor, ProShop, Generic CSV) through a unified
  interface, plus a Generic CSV connector for shops with no API-capable ERP.

WORK:
  U-MULTIERP1: IERPConnector abstraction
    - Interface: IERPConnector {
        connect(config): Promise<ConnectionResult>
        importWorkOrders(filter): Promise<WorkOrder[]>
        exportPlan(plan): Promise<ExportResult>
        syncInventory(): Promise<ToolInventoryItem[]>
        getTimeEntries(dateRange): Promise<TimeEntry[]>
        getJobStatus(jobId): Promise<JobStatus>
      }
    - E2ShopConnectorEngine refactored to implement IERPConnector
    - ERPConnectorFactory: getConnector(systemId) → IERPConnector
    - ERPIntegrationEngine: use factory instead of switch statement
    - Generic CSV connector: import/export via CSV files (no API needed)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  U-MULTIERP2: Epicor + ProShop connectors (scaffold)
    - EpicorConnectorEngine implements IERPConnector (~300 LOC scaffold)
      - Epicor Kinetic REST endpoints: /api/v2/Erp.BO.JobEntryBo, /api/v2/Erp.BO.QuoteBo
      - Auth: Epicor uses Basic + API key
    - ProShopConnectorEngine implements IERPConnector (~300 LOC scaffold)
      - ProShop REST endpoints: /api/workorders, /api/inventory, /api/timeentries
      - Auth: ProShop uses OAuth 2.0
    - Both scaffolded with real endpoint paths but NOT tested against live instances
    - Marked status: "scaffold" in ERP_SYSTEMS array (honest about readiness)
    - GenericCSVConnectorEngine: fully functional CSV import/export
    - Test: CSV round-trip (export WO → import WO → data matches)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: hook enforcing IERPConnector interface for new ERP connectors + MCP action prism_integration:erp_status + /erp-status skill
EXIT GATE: ✓ IERPConnector interface + factory pattern + CSV connector tested + Epicor/ProShop scaffolded + /compact
```

**`/compact` CHECKPOINT 5 COMPLETE (ERP & Business Management Hardening)**
INTEGRATION SMOKE TEST: Import E2 work order → PRISM optimizes (physics-fed) → export plan back →
verify cost estimate has CI95 bounds and uses shop-configured rates, not hardcoded $85/hr.
QuoteToShip 21-stage pipeline runs end-to-end for 1 test part. All 46 frontend pages call real backend.

---

## PHASE 6: BACKEND BUSINESS PLATFORM — E2/QB/Xometry/Fictiv Feature Parity (28 units in 10 sessions)

Extends Phase 5 ERP Hardening with competitive-parity backend capabilities informed by E2 Shop
System, QuickBooks Online, Xometry, and Fictiv. BACKEND ONLY — Claude Code builds it, Codex
handles frontend. Produces 17 new engines, 23 new DB tables, 12 new route files, ~120 new API
endpoints that the frontend consumes through documented REST contracts.

PREREQUISITE: Phase 5 complete (PostgreSQL persistence, shop config, physics-fed costing, registry
wiring, E2 connector, cross-engine wiring, engine consolidation, frontend wiring, QuoteToShip E2E,
multi-ERP framework).

**COMPETITIVE INTELLIGENCE BASELINE:**
  - E2 Shop System: routing-step execution, dual time (setup+cycle), planning board, QR-scan shop floor
  - QuickBooks Online: OAuth 2.0, webhook sync, GL mapping, 3-way matching (PO/Receipt/Invoice)
  - Xometry: CAD upload → instant DFM → instant price, qty breaks, lead times, 12+ milestone tracking
  - Fictiv: Parts Library with revisions, pre/post DFM, GD&T, FAI/certs as first-class, cross-workspace sharing

**DB MIGRATION SEQUENCE (8 files, 23 tables):**
  002-file-storage.sql → 003-quote-revisions.sql → 004-integrations.sql → 005-workflows.sql →
  006-job-routing.sql → 007-desks.sql → 008-milestones.sql → 009-presets-learning.sql

---

### SESSION 6-1: Route Contract Stabilization (U-ROUTEFIX1, U-ROUTEFIX2, U-ROUTEFIX3)
```
SMART CONFIG: Role=API architect + integration engineer | OPUS | MAX
UNITS: U-ROUTEFIX1, U-ROUTEFIX2, U-ROUTEFIX3
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/routes/index.ts — 35 route modules, mount registry
  - src/routes/speedfeed.ts — 8 speed-feed routes calling prism_calc:sf_*
  - src/routes/sfc.ts — 7 SFC routes calling prism_product:sfc_*
  - src/routes/cam.ts — 4 CAM routes calling prism_cam:*
  - src/routes/ppg.ts — 8 PPG routes calling prism_product:ppg_*
  - src/routes/erp.ts — 10 ERP routes (oee_calculate, predictive_maintenance)
  - src/routes/context.ts — 26 context routes (catalog returns zero entries)
  - src/tools/dispatchers/calcDispatcher.ts — oee_calculate, predictive_maintenance actions
  - src/tools/dispatchers/productDispatcher.ts — PPG_ACTIONS array
  - src/tools/dispatchers/camDispatcher.ts — cam_generate/post contract
  - mcp-server/docs/superpowers/specs/2026-03-25-prism-app-surface-legitimacy-roadmap-design.md — PASL misalignment spec

INTENT:
  Five route misalignments mean the frontend calls endpoints that silently fail or return empty
  data. A shop owner clicking "OEE Dashboard" gets nothing because the route calls oee_calculate
  with the wrong param shape. The PPG page calls ppg_syntax but the dispatcher expects a different
  action name. After this session, every mounted route resolves to a dispatcher action that exists,
  accepts the params the route sends, and returns the shape the frontend expects. Zero silent failures.

STARTUP:
  /startup → /handoff read
  /smart API architect + integration engineer

WORK:
  U-ROUTEFIX1: Fix speed-feed / SFC split-brain
    - Map every /api/v1/speed-feed/* endpoint → dispatcher action → engine method
    - Map every /api/v1/sfc/* endpoint → dispatcher action → engine method
    - Ensure sf_orchestrate, sf_quick, sf_stochastic, sf_resolve_* all resolve
    - Verify param shapes match between route req.body and Zod schema
    - Integration test: POST each endpoint with valid body → 200
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-ROUTEFIX2: Fix CAM generate/post contract + PPG action drift
    - cam.ts: verify toolpath_generate, toolpath_simulate, post_process, collision_check all exist
    - Fix positional-args-vs-params-object mismatch in cam_generate
    - ppg.ts: verify ppg_validate, ppg_translate, ppg_templates, ppg_generate, ppg_controllers,
      ppg_compare, ppg_syntax, ppg_batch, ppg_feature_select all exist in dispatcher z.enum
    - Fix the 6 PPG action names that don't exist → add handlers or rename route calls
    - Integration tests for all 4 CAM + 8 PPG routes
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-ROUTEFIX3: Fix ERP analytics drift + context catalog zero-entries
    - erp.ts: oee_calculate, predictive_maintenance — verify param schema match
    - context.ts: catalog_overview, catalog_search — trace why zero entries returned
    - Wire catalog actions to EngineDigest / MASTER_INDEX data sources
    - Integration tests for 4 ERP analytics + 4 context catalog endpoints
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review — INFRA agent pool

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook blocking new routes calling non-existent dispatcher actions + MCP action prism_dev:route_health_audit + /route-audit skill
EXIT GATE: ✓ All speed-feed routes resolve + all CAM/PPG routes resolve + ERP analytics return data + context catalog >0 entries + 24+ integration tests + /compact
```

**`/compact` → new session**

---

### SESSION 6-2: File Upload + CAD Storage + Parts Library (U-BLOB1, U-BLOB2, U-BLOB3)
```
SMART CONFIG: Role=storage architect + CAD systems engineer | OPUS | MAX
UNITS: U-BLOB1, U-BLOB2, U-BLOB3
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - src/db/schema.sql — existing PostgreSQL schema (no file/blob tables)
  - src/db/connection.ts — connection pooling, transaction support
  - src/engines/ParametricPartLibraryEngine.ts — existing part library (in-memory)
  - src/engines/PartSimilarityEngine.ts — multi-dimensional similarity scoring
  - cad-engine/src/ — Python CAD engine (CadQuery + OpenCascade, 176 files)
  - Fictiv: revision-controlled Parts Library, dedup, cross-workspace sharing

INTENT:
  PRISM has no file upload capability. A shop owner cannot attach a STEP file to a quote, a
  drawing to a job, or a material cert to a quality record. After this session, PRISM has:
  blob storage (local + optional S3), file metadata in PostgreSQL, revision tracking with
  SHA-256 dedup, and a Parts Library engine that links CAD files to quotes/jobs/quality records.

STARTUP:
  /startup → /handoff read
  /smart storage architect + CAD systems

WORK:
  U-BLOB1: File storage infrastructure (~600 LOC)
    - DB migration 002-file-storage.sql: tables files, file_versions, file_attachments
    - FileStorageEngine: upload(stream) → {file_id, version}, download, getVersions, attachTo
    - Storage backends: LocalFileStorage (./uploads/), S3FileStorage (optional)
    - SHA-256 dedup: if hash matches existing file, link instead of re-store
    - Route: POST /api/v1/files/upload (multipart), GET /files/:id/download, GET /files/:id/versions
    - Security: verifyToken required, 100MB per file limit (configurable)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-BLOB2: Parts Library engine (~500 LOC)
    - DB tables: parts (part_number, current_revision, material_id, customer_id, tags)
    - DB tables: part_revisions (revision, cad_file_id, drawing_file_id, change_description)
    - PartsLibraryEngine: part_create, part_search, part_add_revision, part_find_similar, part_deduplicate
    - Wire PartSimilarityEngine for find_similar; wire ParametricPartLibraryEngine for parametric parts
    - Full-text search on name/description + tag filter + material filter
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-BLOB3: Dispatcher + schema + route wiring
    - partsLibraryDispatcher.ts with z.enum of all part_* + file_* actions
    - Zod schemas for every action
    - Routes: POST /api/v1/parts, GET /parts/:id, GET /parts, POST /parts/:id/revisions
    - Register in routes/index.ts
    - Test: upload STEP file → create part → add revision → find by hash (dedup)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook blocking raw FS writes outside FileStorageEngine + MCP action prism_data:parts_library_search + /part-lookup skill
EXIT GATE: ✓ File upload/download with SHA-256 dedup + Parts Library with revisions + file attachments linkable to quotes/jobs/quality + /compact
```

**`/compact` → new session**

---

### SESSION 6-3: Instant Quote Pipeline (U-IQUOTE1, U-IQUOTE2, U-IQUOTE3)
```
SMART CONFIG: Role=manufacturing economist + API architect | OPUS | MAX
UNITS: U-IQUOTE1, U-IQUOTE2, U-IQUOTE3
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - src/engines/QuoteEstimatorEngine.ts — physics-backed estimation (canonical)
  - src/engines/BlueprintToQuoteBridgeEngine.ts — drawing→quote bridge
  - src/engines/DFMFeedbackEngine.ts — manufacturability analysis
  - src/engines/SpeedFeedOrchestratorEngine.ts — physics pipeline for cycle time
  - src/engines/PartSimilarityEngine.ts — similar-part pricing reference
  - src/db/schema.sql — existing quotes + quote_line_items tables
  - Xometry: CAD → instant DFM → instant price, qty breaks, lead time options (standard/expedited/rush)

INTENT:
  Xometry gives an instant price when you upload a CAD file. PRISM has the physics engines
  to do this but they aren't wired into a single "upload CAD → get price" pipeline. After this
  session: instant price with CI95 bounds, quantity breaks (1/5/10/25/50/100), lead time options
  (standard/expedited/rush), DFM warnings, and process breakdown. The Xometry-killer backend.

STARTUP:
  /startup → /handoff read
  /smart manufacturing economist + API architect

WORK:
  U-IQUOTE1: InstantQuoteEngine (~700 LOC)
    - Pipeline: feature extraction → DFM analysis → SpeedFeedOrchestrator cycle time →
      QuoteEstimator cost aggregation → Wright's law qty breaks → lead time multipliers →
      PartSimilarity sanity check
    - Output: unit_price, total_price, ci95_low, ci95_high, quantity_breaks[],
      lead_time_options[], dfm{score, issues[]}, cost_breakdown, similar_parts[], confidence
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-IQUOTE2: Quote revision tracking + persistence (~400 LOC)
    - DB migration 003-quote-revisions.sql: quote_revisions, quote_status_history
    - QuoteRevisionEngine: quote_revise, quote_get_history, quote_compare_revisions,
      quote_status_change (draft→sent→viewed→accepted→rejected→expired),
      quote_generate_share_token (for customer portal)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-IQUOTE3: Routes + dispatcher + schema
    - Route: POST /api/v1/quotes/instant, POST /quotes/:id/revise, GET /quotes/:id/history,
      POST /quotes/:id/status, GET /quotes/:id/share, POST /quotes/qty-breaks, POST /quotes/lead-time
    - Zod validation for InstantQuoteInput
    - Test: instant quote for 6061 bracket, 10 qty → price > $0, CI95 exists, qty breaks descend
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook enforcing CI95 bounds on all quotes + MCP action prism_product:instant_quote + /instant-quote skill
EXIT GATE: ✓ Instant quote with CI95 + qty breaks + lead times + DFM + quote revision tracking + share tokens + /compact
```

**`/compact` → new session**

---

### SESSION 6-4: DFM Analysis + GD&T Backend (U-DFM1, U-DFM2)
```
SMART CONFIG: Role=manufacturing engineer + computational geometry specialist | OPUS | MAX
UNITS: U-DFM1, U-DFM2
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - src/engines/DFMFeedbackEngine.ts — existing DFM rules (wall, depth, corner, tolerance)
  - src/engines/DfMRulesEngine.ts — additional DFM rules
  - src/engines/AccessibilityAnalysisEngine.ts — tool access analysis
  - src/engines/CADDrawingKnowledgeEngine.ts — GD&T knowledge
  - cad-engine/src/feature_analyze.py — Python feature analysis
  - Fictiv: pre+post DFM, GD&T annotation, AI+human review, draft angle visualization
  - Xometry: instant DFM with CAD upload

INTENT:
  Fictiv runs two DFM passes: pre-order (catch problems early) and post-order (engineer review
  with GD&T annotations). PRISM's DFMFeedbackEngine checks basic rules but doesn't integrate
  with the CAD engine, doesn't support GD&T tolerance stack-ups, and has no structured feedback
  pipeline. After this session: issue-by-issue feedback with severity + cost impact, 3D feature
  references, GD&T tolerance feasibility (Cpk analysis), and structured response for the frontend.

WORK:
  U-DFM1: DFMPipelineEngine (~600 LOC)
    - New rules: undercut detection, thread depth ratio, internal sharp corners, flatness/parallelism,
      draft angle (injection mold), material-specific DFM (Ti thin wall = deflection × 3)
    - Pipeline: feature extraction → DFM rules → accessibility analysis → GD&T Cpk → cost impact → prioritize
    - Output: overall_score (0-100), manufacturability, issues[] with feature_ref + cost_impact_usd,
      tolerance_feasibility[], recommended_process, savings_if_fixed
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-DFM2: GD&T backend + routes
    - Tolerance stack-up: linear + RSS for assembly fits
    - Process capability mapping: tolerance_mm → required Cpk → required process
    - Routes: POST /api/v1/dfm/analyze, POST /dfm/quick, POST /dfm/tolerance-check,
      POST /dfm/cost-impact, GET /dfm/rules
    - Test: 0.3mm wall + 8:1 depth pocket + ±0.005mm tolerance → 3+ critical issues with $ impact
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook enforcing physics_basis on DFM issues + MCP action prism_calc:dfm_analyze + /dfm-check skill
EXIT GATE: ✓ DFM pipeline with cost impact per issue + GD&T Cpk analysis + undercut/thread/corner/draft rules + /compact
```

**`/compact` → new session**

---

### SESSION 6-5: QuickBooks Online Connector (U-QBO1, U-QBO2, U-QBO3)
```
SMART CONFIG: Role=accounting systems engineer + OAuth specialist | OPUS | MAX
UNITS: U-QBO1, U-QBO2, U-QBO3
ESTIMATED CONTEXT: 60-70%

KNOWLEDGE SOURCES:
  - src/engines/IntegrationAdapterEngine.ts — existing QB/CSV export
  - src/engines/GeneralLedgerEngine.ts — GL journal entries
  - src/engines/InvoicingEngine.ts — invoice CRUD
  - src/engines/PurchaseOrderEngine.ts — PO management
  - src/middleware/auth.ts — existing auth middleware
  - QuickBooks API: OAuth 2.0, /Account, /Invoice, /Bill, /Payment, /Customer, /Vendor
  - QBO rate limit: 500 req/min, webhook events for real-time sync

INTENT:
  Most small machine shops use QuickBooks for accounting. Currently PRISM exports CSV that
  someone manually imports. After this session: OAuth 2.0 connection, customer bidirectional
  sync, invoice push when jobs ship, payment pull via webhooks, GL account mapping, custom
  3-way matching (PO/Receipt/Invoice since QBO doesn't have it natively), rate-limited queue.

WORK:
  U-QBO1: OAuth 2.0 flow + token management (~500 LOC)
    - DB migration 004-integrations.sql: oauth_tokens (encrypted), integration_sync_log, webhook_events
    - OAuthFlowEngine: getAuthUrl, exchangeCode, refreshToken, revokeToken, getValidToken
    - AES-256-GCM encryption for tokens at rest
    - Routes: GET /integrations/qbo/authorize, GET /callback, POST /disconnect, GET /status
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-QBO2: GL mapping + entity sync (~600 LOC)
    - QBOConnectorEngine: rate-limited queue (500 req/min token bucket)
    - Sync: customers ↔ QBO, push invoices, push bills, pull payments, sync chart of accounts
    - GLMappingEngine: map PRISM GL categories → QBO account IDs, custom overrides
    - 3-way matching: match_po_receipt_invoice() → {matched, discrepancies[]}
    - Dual reporting: cash vs accrual method flag
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-QBO3: Webhook handler + dispatcher
    - POST /integrations/qbo/webhook — HMAC signature verification, async event processing
    - Events: Payment.Create, Invoice.Update, Customer.Update
    - Dispatcher actions: qbo_connect, qbo_sync_customers, qbo_push_invoice, qbo_pull_payments,
      qbo_gl_mapping, qbo_three_way_match
    - Test: mock QBO API → push invoice → verify sync_log; webhook Payment.Create → invoice marked paid
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook blocking plaintext token storage + MCP action prism_integration:qbo_sync + /qbo-setup skill
EXIT GATE: ✓ OAuth 2.0 with encrypted tokens + rate-limited sync + webhook handler + 3-way matching + GL mapping + /compact
```

**`/compact` → new session**

---

### SESSION 6-6: Approval Workflows + Audit Trails (U-APPR1, U-APPR2, U-APPR3)
```
SMART CONFIG: Role=workflow architect + compliance engineer | OPUS | MAX
UNITS: U-APPR1, U-APPR2, U-APPR3
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/engines/AuditEngine.ts — existing audit trail (in-memory, 50K limit)
  - src/engines/EventBus.ts — pub/sub event system
  - src/engines/PurchaseOrderEngine.ts — PO approval concept
  - src/engines/QualityManagementEngine.ts — FAI, NCR, CAPA
  - E2: quote→WO→job→invoice lifecycle with manager approvals at each gate

INTENT:
  PRISM has no approval workflows. A quote goes from draft to sent without review. A PO is
  created without manager approval. After this session: generic approval workflow engine for
  any entity (quote, PO, invoice, payroll, NCR), configurable approval chains per entity type,
  immutable record timelines, threaded comments with file attachments.

WORK:
  U-APPR1: ApprovalWorkflowEngine (~700 LOC)
    - DB migration 005-workflows.sql: approval_workflows, approval_instances, approval_decisions
    - Configurable steps: [{role_required, action, auto_approve_below_usd?, timeout_hours?}]
    - Default workflows: quote (→sales_mgr), PO (→purchasing_mgr), invoice (→finance_mgr),
      payroll (→finance_mgr), NCR (→quality_mgr)
    - Auto-approve logic: amount < threshold → skip step
    - EventBus: emit approval.submitted, approval.decided, approval.completed
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-APPR2: Record timeline + comments (~500 LOC)
    - DB tables: record_timeline, comments (threaded, with file attachments)
    - RecordTimelineEngine: auto-create entries from EventBus events
    - Event types: created, updated, status_changed, approval_decided, file_attached, comment_added
    - Wire AuditEngine to persist to DB (replace in-memory 50K limit)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-APPR3: Routes + cross-entity wiring
    - Routes: POST /api/v1/workflows, POST /workflows/submit, POST /workflows/decide,
      GET /workflows/pending, GET /workflows/:type/:id/timeline, POST /comments, GET /comments/:type/:id
    - Wire: quote > $500 → auto-submit approval; PO create → auto-submit; invoice create → auto-submit
    - Test: create quote > $500 → approval submitted → approve → status "approved"
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook blocking status changes that bypass approval + MCP action prism_business:workflow_pending + /approvals skill
EXIT GATE: ✓ Generic workflows + 5 defaults + record timelines + comments + AuditEngine persisted to DB + /compact
```

**`/compact` → new session**

---

### SESSION 6-7: Job Traveler + Dual Time Tracking (U-TRAV1, U-TRAV2, U-TRAV3)
```
SMART CONFIG: Role=shop floor systems engineer + process planner | OPUS | MAX
UNITS: U-TRAV1, U-TRAV2, U-TRAV3
ESTIMATED CONTEXT: 65-75%

KNOWLEDGE SOURCES:
  - src/engines/JobLifecycleEngine.ts — 13-state lifecycle
  - src/engines/TimeClockEngine.ts — clock in/out + job time
  - src/engines/ShopSchedulerEngine.ts — priority dispatch
  - src/engines/OEECalculatorEngine.ts — availability × performance × quality
  - E2: routing-step-centric, dual time (setup + cycle), QR scan, planning board

INTENT:
  E2's strength is the job traveler: routing steps (Op 10 Saw, Op 20 Mill, Op 30 Inspect),
  each tracking setup time and cycle time separately, with QR scan to start/stop. PRISM has
  a job with 13 states but no routing steps, no dual time tracking, and no dispatch board.
  After this session: ordered operations per job, setup_time and cycle_time per step, operator
  clock into specific operations, dispatch board showing queued jobs per machine.

WORK:
  U-TRAV1: Job traveler / routing steps (~600 LOC)
    - DB migration 006-job-routing.sql: job_routing_steps, routing_time_entries
    - JobTravelerEngine: traveler_create, traveler_start_setup, traveler_start_cycle,
      traveler_complete_step, traveler_get_active
    - Wire: all steps complete → JobLifecycleEngine.updateStatus("complete")
    - Wire: setup_time + cycle_time → ActualCostEngine for variance
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-TRAV2: Machine dispatch + queue engine (~500 LOC)
    - DB table: machine_queue (machine_id, job_id, routing_step_id, priority, estimated_start/complete)
    - MachineDispatchEngine: dispatch_queue_job, dispatch_get_queue, dispatch_reorder,
      dispatch_get_all_queues (planning board data), dispatch_what_if
    - Planning board shape: {machines: [{id, name, queue: [{job, step, priority, est_start, est_end}]}]}
    - Wire OEECalculatorEngine: setup_time → availability, est_cycle vs actual → performance
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-TRAV3: Routes + mobile-friendly endpoints
    - Routes: GET /api/v1/traveler/:job_id, POST /traveler/:job_id/steps/:step/start-setup,
      POST /start-cycle, POST /complete, GET /dispatch/board, POST /dispatch/assign,
      POST /dispatch/reorder, POST /dispatch/what-if, POST /traveler/scan (QR/barcode)
    - Test: create job → create traveler → setup → cycle → complete → verify times + OEE
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook enforcing dual time (setup+cycle) on routing step completion + MCP action prism_business:dispatch_board + /traveler skill
EXIT GATE: ✓ Job routing steps + dual time tracking + dispatch queue + planning board + what-if + QR scan endpoint + /compact
```

**`/compact` → new session**

---

### SESSION 6-8: Role-Based Desks + Global Search (U-DESK1, U-DESK2)
```
SMART CONFIG: Role=UX systems architect + search engineer | OPUS | HIGH
UNITS: U-DESK1, U-DESK2
ESTIMATED CONTEXT: 50-60%

KNOWLEDGE SOURCES:
  - state/CURRENT_POSITION.md — frontend alignment requirements
  - src/middleware/auth.ts — role extraction (admin, engineer, operator, viewer)
  - src/db/schema.sql — users table with role field
  - src/engines/EventBus.ts — event system
  - E2: role-based views (owner sees money, operator sees current job)
  - Fictiv: unified search across parts/quotes/orders

INTENT:
  A shop owner should see: revenue, quotes pending, overdue jobs, machine utilization.
  An operator should see: current job, next in queue, clock status. Currently everyone sees
  the same dashboard. After this session: role-specific desk payloads with live counts, saved
  views, pinned/recent entities, and global search across ALL entity types with ranked results.

WORK:
  U-DESK1: Role-based desk payloads + saved views (~600 LOC)
    - DB migration 007-desks.sql: saved_views, user_pins, user_recents
    - DeskPayloadEngine with 4 role payloads:
      admin/owner: revenue_mtd, quotes_pending, jobs_overdue, machine_utilization, ar_aging
      engineer: parts_needing_review, open_ncrs, programs_pending, dfm_queue
      operator: current_job, next_job, clock_status, quality_alerts, my_time_today
      viewer: public_dashboard_metrics
    - Saved views CRUD, pin/unpin, recent entity tracking
    - Routes: GET /api/v1/desk, GET /desk/counts, POST /views, GET /pins, GET /recents
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-DESK2: Global search engine (~500 LOC)
    - GlobalSearchEngine: search across parts, quotes, jobs, customers, tools, machines,
      invoices, POs, employees, quality records
    - PostgreSQL pg_trgm trigram indexes for fuzzy matching
    - Result shape: {results: [{entity_type, entity_id, title, subtitle, match_score, preview}], facets}
    - Routes: GET /api/v1/search?q=query&types=, GET /search/suggest (autocomplete)
    - Test: search "aluminum" → returns materials + parts + quotes mentioning aluminum
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook ensuring desk_get returns role-appropriate data only + MCP action prism_data:search_global + /find skill
EXIT GATE: ✓ 4 role-specific desks + saved views + pins/recents + global search with fuzzy + autocomplete + /compact
```

**`/compact` → new session**

---

### SESSION 6-9: Customer Portal + Milestone Tracking (U-PORTAL1, U-PORTAL2, U-PORTAL3)
```
SMART CONFIG: Role=customer experience architect + security engineer | OPUS | MAX
UNITS: U-PORTAL1, U-PORTAL2, U-PORTAL3
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/engines/JobLifecycleEngine.ts — 13-state lifecycle
  - src/engines/QualityManagementEngine.ts — FAI, material certs, inspection
  - src/engines/FileStorageEngine.ts — file attachments (from 6-2)
  - src/engines/QuoteRevisionEngine.ts — quote share tokens (from 6-3)
  - Xometry: 12+ milestone order tracking (ordered→programming→setup→shipped)
  - Fictiv: FAI (AS9102), material certs, inspection reports as first-class

INTENT:
  Xometry customers track orders through 12+ milestones. Currently PRISM has no customer
  portal. After this session: 14-milestone template auto-advances from job lifecycle, customer
  receives share link, sees quote/order/milestones, can view FAI reports and material certs,
  and can approve quotes — all without a PRISM account.

WORK:
  U-PORTAL1: MilestoneTrackingEngine (~500 LOC)
    - DB migration 008-milestones.sql: order_milestones
    - 14-milestone template: quote_sent → quote_accepted → order_confirmed → design_review →
      material_ordered → material_received → programming → setup → first_article →
      production → quality_inspection → finishing → packing_shipping → delivered
    - Auto-advance: JobLifecycleEngine status → milestone progression
    - EventBus: emit milestone.advanced (for notification triggers)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-PORTAL2: Customer portal API (~600 LOC)
    - CustomerPortalEngine: token-based access (no account needed)
    - portal_quote_view, portal_order_status, portal_quote_respond (accept/reject/request_changes),
      portal_documents (list quality docs), portal_document_download, portal_messages
    - Security: time-limited tokens (30 days), scope-limited, rate-limited (10 req/min per token)
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-PORTAL3: Quality documents as first-class + routes
    - DB table: quality_documents (doc_type: fai_as9102|material_cert|coc|inspection_report|ndt_report,
      file_id FK, status: draft|pending_review|approved|rejected)
    - Routes: GET /api/v1/portal/quote/:token, POST /portal/quote/:token/respond,
      GET /portal/order/:token (milestones), GET /portal/order/:token/documents,
      POST /portal/order/:token/messages
    - Internal: POST /api/v1/quality-docs, GET /quality-docs/:job_id
    - Test: full customer journey — receive quote link → accept → track → download FAI
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook ensuring portal endpoints never expose internal cost data + MCP action prism_business:milestone_advance + /order-status skill
EXIT GATE: ✓ 14-milestone tracking + customer portal (token-based) + quality docs first-class + customer messaging + /compact
```

FOLLOW-ON CANONICAL REQUIREMENT:
  Session 6-9 is now the customer-service foundation, not the finish line. After portal, milestones,
  and customer messaging land, the roadmap must continue into full automated customer service:
  - portal/email/message events open linked support cases automatically
  - cases route by SLA, priority, commercial record, and quality/shipping/accounting context
  - self-service status and document flows reduce manual back-and-forth
  - AI-assisted replies and escalation rules stay tied to canonical CRM, portal, and job/order state
  - customer service automation must never become a disconnected inbox separate from PRISM's operating state

**`/compact` → new session**

---

### SESSION 6-10: Preset Libraries + Learning Backend (U-PRESET1, U-LEARN1, U-LEARN2)
```
SMART CONFIG: Role=machinist knowledge engineer + learning systems architect | OPUS | HIGH
UNITS: U-PRESET1, U-LEARN1, U-LEARN2
ESTIMATED CONTEXT: 55-65%

KNOWLEDGE SOURCES:
  - src/engines/SpeedFeedOrchestratorEngine.ts — calculator presets concept
  - src/engines/PostLibraryConfiguratorEngine.ts — post processor library
  - src/engines/ShopToolLibraryEngine.ts — shop-specific tool library
  - src/engines/LearningPathEngine.ts — learning paths
  - src/engines/AssessmentEngine.ts — knowledge assessment
  - src/engines/ApprenticeEngine.ts — apprentice progression
  - src/routes/learning.ts — 10+ learning endpoints
  - state/CURRENT_POSITION.md lines 37-41 — learning desk requirements

INTENT:
  Machinists save their favorite setups: "6061 pocket on VF-2 with 3-flute = S8000 F2400."
  Currently these live on sticky notes. Preset libraries let operators save, name, and share
  calculator configurations, toolpath parameter sets, and PPG configs. The learning backend
  provides course progression with gated checkpoints and searchable knowledge facets.

WORK:
  U-PRESET1: PresetLibraryEngine (~500 LOC)
    - DB migration 009-presets-learning.sql: presets (type, name, params JSONB, tags, machine_id,
      material_id, is_shared, use_count), preset_compare_history
    - 7 preset types: speed_feed, toolpath, ppg_controller, machine_setup, fixture, holder, tool_assembly
    - Actions: preset_save, preset_list, preset_search, preset_share, preset_compare, preset_validate
    - Controller validation: ppg_controller presets validated against PostProcessorRegistry
    - Routes: POST /api/v1/presets, GET /presets, POST /presets/:id/share, POST /presets/compare
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-LEARN1: LearningProgressionEngine (~500 LOC)
    - DB tables: learning_courses, learning_enrollments, learning_checkpoints (quiz/exam/practical),
      learning_media (video/pdf/image/interactive/reference)
    - Actions: course_create, course_enroll, course_progress, checkpoint_submit (→ score + pass/fail),
      enrollment_summary, course_search (by domain, difficulty, material, machine)
    - Progression: module N+1 unlocked only when module N checkpoint passed
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  U-LEARN2: Knowledge facets + routes
    - Routes: POST /api/v1/learning/courses, GET /courses, POST /enroll, GET /my-progress,
      POST /checkpoint, POST /media, GET /facets (machine type × material × control × CAM × process)
    - Knowledge facets: search "Haas VF-2" → courses about VMC setup, Haas alarms, 3-axis strategies
    - Test: create course → enroll → pass checkpoint → advance → complete
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE

  /prism-review

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP → VALIDATE
FORGE-TRIPLE: hook validating preset params within sane machining ranges + MCP action prism_data:preset_search + /my-presets skill
EXIT GATE: ✓ Preset library (7 types, share, compare, validate) + learning courses with gated checkpoints + knowledge facets + /compact
```

**`/compact` CHECKPOINT 6 COMPLETE (Backend Business Platform)**
INTEGRATION SMOKE TEST: Upload STEP file → instant quote with DFM → create job with routing steps →
operator clocks setup+cycle via traveler → milestone auto-advances → customer views via portal →
invoice pushed to QuickBooks → payment webhook updates PRISM → quality docs accessible via portal.
Full planning board shows queued jobs across all machines. Global search finds parts/quotes/jobs.
Role-based desks show appropriate data per user role.

---

## SESSION 0-D-ARCH: Pipeline Interconnection Architecture (CRITICAL — from pipeline scrutiny)

**This is the single highest-impact session in the entire roadmap.** 6 of 8 manufacturing
pipelines are isolated islands. No pipeline uses registries. Helper engines are milling-exclusive.
The roadmap builds 10 fusion sessions and 10 registry wiring sessions — but the pipeline
engines themselves IGNORE all of it because they use inline constants. Fix this FIRST.

```
SMART CONFIG: Role=pipeline architect + systems integration | OPUS | MAX
UNITS: U-ARCH1, U-ARCH2, U-ARCH3

KNOWLEDGE SOURCES:
  - Pipeline scrutiny results (7 agents): all 9 pipeline flow maps + interconnection audit
  - src/engines/QuoteToShipOrchestratorEngine.ts — lazy-import pattern (reference)
  - src/engines/GrindingProgramAssemblerEngine.ts — canonical enrichment pattern (reference)
  - src/registries/ — 24 registries with real data (95K tools, 2.9K materials, 910 machines)
  - src/physics/constants.ts — canonical Kienzle/Taylor constants

INTENT:
  After this session, EVERY pipeline delegates to canonical sources and shared engines.
  A change to constants.ts propagates to ALL pipelines. A user-configured tool library
  affects ALL pipelines. SmartToolSelector helps turning, not just milling.

WORK:
  U-ARCH1: Break pipeline silos — migrate inline constants to canonical
    - PrintToProgramPipelineEngine: replace inline KIENZLE_DB/TAYLOR_DB/SPEED_RANGES with
      lazy import from physics/constants.ts (fix TAYLOR_DB divergence: ISO M/N/H wrong)
    - TurningPrintToProgramEngine: wire 11 dead KB imports or remove them, replace inline
      TURNING_SPEEDS/TURNING_FEEDS with canonical getSpeed() calls
    - MillTurnSwissPipelineEngine: replace inline KIENZLE_ISO with canonical import (currently
      ZERO imports — most isolated engine in the system)
    - MultiAxisPrintToProgramEngine: verify KB imports are active (already uses MachKB)
    - Apply GrindingProgramAssembler's canonical enrichment pattern to EDM/Laser/Waterjet
    - Fix MultiProcessCAMBridgeEngine: delegate to actual pipeline engines instead of inline physics
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-ARCH2: Share helper engines across all chip-cutting pipelines
    - SmartToolSelectorEngine: make available to Turning, 5-Axis, MillTurn (currently milling-only)
    - CoolantStrategyEngine: share across all pipelines
    - EntryExitStrategyEngine: share (turning approach is different but engine should still be consulted)
    - WorkholdingVerificationEngine: share (already called by PrintToProgram, add to others)
    - IntelligentSequencingEngine: share for operation ordering
    - Add PipelineCheckpointManager to all 8 manufacturing pipelines (currently milling-only)
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-ARCH3: Wire registries into pipeline resolution + fix live bugs
    - Wire ToolRegistry (95K tools) into pipeline tool selection fallback
    - Wire MaterialRegistry (2.9K materials) into pipeline material resolution
    - Wire MachineRegistry (910 machines) into pipeline machine context
    - Fix SpeedFeedOrchestrator: Ti kc1.1 1600→2800 (43% force underestimate LIVE BUG)
    - Fix SpeedFeedOrchestrator: Taylor n per-material (not hardcoded 0.25)
    - Fix SpeedFeedOrchestrator: MC engine redundant re-generation bug
    - Export QuoteToShipOrchestrator from index.ts + wire to dispatcher + add test
    - Define stock-state-passing interface (Op1 output stock → Op2 input stock via VoxelStockEngine)
    → 4-LOOP with MULTI-ROLE SCRUTINY

FORGE-TRIPLE: hook blocking inline physics constants in pipeline engines + MCP action prism_dev:pipeline_health + /pipeline-health skill
EXIT GATE: ✓ All pipelines import canonical constants + 6 helper engines shared + 3 registries wired + 4 live bugs fixed + QuoteToShip reachable
```

**`/compact` → new session**

---

## SESSION 0-D-INFRA: Infrastructure Hardening (from infrastructure audit)
```
SMART CONFIG: Role=platform engineer + type system specialist | OPUS | HIGH
UNITS: U-INFRA1, U-INFRA2

KNOWLEDGE SOURCES:
  - Infrastructure audit: 8.2/10 overall, 2 YELLOW areas
  - src/tools/dispatchers/*.ts — 77 dispatchers with z.any() pattern
  - src/schemas/ — existing Zod schemas (calcActionSchemas, etc.)

INTENT:
  Two systematic weaknesses: (1) 77 dispatchers use z.any() for params — no type safety on
  1,718 actions. (2) 2,224 ": any" annotations throughout codebase. Fix the dispatcher
  schema pattern for the top 10 dispatchers (covers ~60% of actions). The rest can migrate
  incrementally.

WORK:
  U-INFRA1: Typed dispatcher schemas for top 10 dispatchers
    - calcDispatcher (1,191 actions) — already has ACTION_CALC_SCHEMAS partially
    - camDispatcher (794 actions) — add per-action Zod schemas
    - physicsDispatcher, qualityDispatcher, businessDispatcher — top 5
    - Pattern: z.object({...}) per action, validated before engine dispatch
    - Migrate from z.record(z.string(), z.any()) to typed schemas
    → 4-LOOP

  U-INFRA2: ESLint v9 migration + type cleanup
    - Migrate ESLint config to flat config format (v9+)
    - Audit top-50 most-used engines for unnecessary ": any" — replace with proper types
    - Add "no-explicit-any" ESLint rule as warning (not error — too many to fix at once)
    → 4-LOOP

EXIT GATE: ✓ Top 10 dispatchers have typed schemas + ESLint v9 config + any-count reduced by 200+
```

**`/compact` → new session**

---

## SESSION 0-D-VARIABILITY: Deep Variability Infrastructure (from pipeline scrutiny)
```
SMART CONFIG: Role=manufacturing physics + computational geometry | OPUS | MAX
UNITS: U-VAR1, U-VAR2

KNOWLEDGE SOURCES:
  - src/engines/VoxelStockEngine.ts — stock model (EXISTS, not wired to any pipeline)
  - src/engines/InstantaneousEngagementEngine.ts — per-block ae/ap (only in PostProcessor)
  - src/engines/ToleranceStackUpEngine.ts — multi-op tolerance propagation (EXISTS, unwired)
  - PostProcessorPipelineEngine Stage 2.1 — engagement analysis pattern
  - hyperMILL ISO fit catalog: src/data/hypermill-iso-fits.json ← EXTRACTED 2026-03-25
    ISO 286 bore/shaft tolerance classes — feed into ToleranceStackUpEngine for fit validation

INTENT:
  Three variability gaps no pipeline addresses: (1) workpiece rigidity changes during
  machining, (2) actual per-block engagement from stock geometry (not flat ae/ap from
  operation definition), (3) tolerance stack-up between operations. These are the
  prerequisites for the fusion system to produce physically meaningful results.

WORK:
  U-VAR1: Wire VoxelStockEngine into pipeline flow
    - After each roughing pass, update stock model geometry
    - Feed updated rigidity into next pass's deflection computation
    - Compute actual ae/ap per block from stock-tool intersection (replaces flat values)
    - Interface: pipeline passes VoxelStock to fusion orchestrator as stock_model input
    - This enables PostProcessor Stage 2.1 to use REAL engagement, not operation-defined
    → 4-LOOP with MULTI-ROLE SCRUTINY

  U-VAR2: Wire tolerance stack-up between operations
    - ToleranceStackUpEngine: propagate dimensional uncertainty across multi-op sequences
    - Each operation adds uncertainty: RSS stack of process capability + setup error
    - Output: predicted Cpk at each operation based on cumulative uncertainty
    - Wire to ProcessSequenceEngine for automatic sequence validation
    - Feed into QuoteToShip Stage 5 for tolerance-aware cost estimation
    → 4-LOOP with MULTI-ROLE SCRUTINY

EXIT GATE: ✓ VoxelStock updates per-pass + real ae/ap per-block + tolerance stack validates sequences
```

**`/compact` → new session**

---

## SESSION 2-3: Delivery Date + Quote Completeness (from shop manager scrutiny)
```
SMART CONFIG: Role=shop manager + scheduling specialist | OPUS | HIGH
UNITS: U-DELIV1, U-QUOTE1

WORK:
  U-DELIV1: Delivery date computation
    - Wire CapacityPlanningEngine (after fixing random cycle time placeholder)
    - Combine: machine queue + setup + run + inspection + material lead time
    - Output: "Delivery: 15 business days (CI95: 12-19 days)"
    - Wire into QuoteToShip Stage 5 (quote includes delivery date)
    → 4-LOOP

  U-QUOTE1: Customer-facing quote document
    - QuoteDocumentEngine: assemble customer-ready quote PDF/markdown from pipeline outputs
    - Include: part number, revision, qty, unit price, price breaks, delivery date, Cpk prediction
    - Wire BlueprintToQuoteBridgeEngine end-to-end validation (Xometry-competitor flow)
    → 4-LOOP

EXIT GATE: ✓ Quotes include delivery date with CI95 + customer document generated + Blueprint→Quote validates
```

**`/compact` → new session**

---

## PHASE 14: Missing Processes + Agentic Infrastructure + Future Expansion
```
Added from pipeline scrutiny — CNC-programmable processes without pipelines:

PLANNED PIPELINES:
  1. PlasmaProgramAssemblerEngine — fab shop CNC plasma tables, Hypertherm/Fanuc controllers
     Pattern: copy LaserProgramAssembler, replace laser physics with plasma arc physics
     (plasma kerf, dross, HAZ, pierce, arc voltage control)

  2. PressBrakeProgramEngine — CNC press brake bend sequence programming
     New paradigm: bend sequence optimization, tonnage calc, back gauge positioning,
     springback compensation, K-factor. NOT a toolpath — a bend plan.

  3. AdditiveBuildParameterEngine — FDM/SLM/SLS build parameter optimization
     Slicer integration for FDM (G-code), build file parameters for SLM/SLS.
     Layer time, support strategy, thermal management, distortion prediction.

  4. DMISInspectionProgramEngine — standalone CMM offline programming
     DMIS code generation from feature/tolerance data. TSP path optimization
     (CMMPathPlanningEngine already exists). Probe strategy per feature type.

  5. RoboticWeldProgramEngine — offline robot welding path generation
     Joint design, heat input, distortion prediction, multi-pass strategy.
     WeldingJoiningEngine exists for physics; needs path generation layer.

ALSO IN PHASE 14:
  - Pipeline interconnection hardening (any gaps remaining from 0-D-ARCH)
  - Dispatcher schema migration (remaining 67 dispatchers after top 10 in 0-D-INFRA)
  - FMEA/reliability engineering (process FMEA from pipeline decision data)
  - Multi-site/multi-plant ERP model
  - Barcode/RFID shop floor data collection
  - MES protocol adapter (ISA-95/B2MML)

AGENTIC PATTERNS SPRINT 5: Embedding Infrastructure (~3,000 LOC, ~3-4 weeks)
  - @xenova/transformers + better-sqlite3 local embedding foundation (~500 LOC)
  - Semantic Knowledge RAG: vectorize 3,700+ tribal tips + manual chunks (~1,000 LOC)
    Currently ALL search is String.includes() — "reduce chatter on thin walls" can't find
    tips tagged as "vibration_dynamics" unless exact keywords match
  - Semantic Router: embedding-based intent routing for 2,700+ actions (~800 LOC)
    "my part is chattering" can't route to VibrationDiagEngine with string matching
  - Semantic Memory: vector-indexed past decisions and outcomes (~700 LOC)

AGENTIC PATTERNS SPRINT 6: Multi-Agent Architecture (~8,200 LOC, ~10+ sessions)
  - 3-level agent hierarchy: Planner(Opus) → Setup(Sonnet) → Calc(Haiku) (~3,000 LOC)
  - Conflict resolution protocol: constraint intersection → weighted consensus →
    safety-first override → human escalation (4-step) (~1,500 LOC)
  - SMART goal monitoring per operation (~1,200 LOC)
  - Shared state protocol between subagents (~800 LOC)
  - Debate/consensus for safety decisions (~500 LOC)
  - A2A external agent integration (ERP, CAM, machine monitor) (~1,200 LOC)
  Blueprint: H:/prism/mcp-server/src/architecture/MULTI_AGENT_BLUEPRINT.ts (730 lines, 0 TS errors)

SCOPE NOTE: Phase 14 items are POST-MVP. Ship Phases 0-13 first.
```

---

## MVP REVENUE MILESTONES (shop manager scrutiny — ship incrementally, not all at once)
```
After Phase 0-B+0-C: Programs can be generated (basic, not fully optimized) → INTERNAL TESTING
After Phase 2:       Quotes with physics-backed pricing + CI95 ranges → QUOTE CUSTOMERS
After Phase 5:       Turning pipeline complete → SHIP TURNING PROGRAMS TO CUSTOMERS
After Phase 6:       Milling pipeline complete → SHIP MILLING PROGRAMS
After Phase 7:       5-Axis complete → SHIP 5-AXIS PROGRAMS
Each subsequent phase: ship that machine type's pipeline the week it completes.
DO NOT wait for all 13 phases before any revenue. Ship turning the week Phase 5 finishes.
```

## PHASES 5-11: PER-MACHINE PIPELINE COMPLETION
### Each machine type follows its own comprehensive roadmap
### NOTE (from scrutiny): ALL per-machine sessions MUST use fusion_tier >= 2 for per-block S/F

```
COMPACTION STRATEGY FOR PER-MACHINE PHASES:
  - Each machine type has its own comprehensive roadmap file
  - /compact after EVERY sub-milestone (not every 2-3 units — milestones are the boundary)
  - Each sub-milestone is 8-15 units, designed to fit in 1-2 sessions
  - Golden snapshot saved after EACH correct pipeline output

SKILLS TO USE AT EVERY MACHINE-TYPE SESSION:
  /smart [CNC programmer for target machine type]

  BUILDING:
    /forge-engines         — check if engine exists before creating new
    /forge-triple          — engines + skills + hooks pipeline per milestone
    /forge-wiring          — verify wiring after every build
    /trace                 — wiring chain verification
    /scope                 — impact analysis before edits

  TESTING:
    /program-gen           — complete CNC program generator
    /auto-speed-feed       — physics-optimized per-line S/F
    /program-validate      — G-code verification per controller
    /test                  — run machine-specific tests
    /test-speed-feed       — speed/feed gauntlet (if S/F related)
    /physics-verify        — cross-pipeline consistency
    /quality-gate          — full QA pipeline
    /calibrate             — compare to published reference data

  DOMAIN:
    /calc                  — quick CNC calculation
    /defaults              — smart machining defaults per operation
    /playbook              — best practice rules for this machine type
    /tool-select           — tool selection pipeline
    /machine-check         — validate params vs machine limits
    /gcode                 — quick G-code snippet verification
    /cnc-simulate          — Vericut-class simulation
    /cycle-time-crush      — find every second hiding in the program
    /first-part-right      — zero-scrap first article pipeline
    /wear-analysis         — tool wear + force compensation

  SESSION MANAGEMENT:
    /prism-review          — 3-agent review (MANDATORY after every build)
    /scrutinize            — standalone code quality review
    /roadmap-quality-check — post-compact scrutiny
    /compact               — save state before compaction
    /checkpoint            — named context checkpoint

  SCRIPTS:
    prism-build.sh         — quick build check
    prism-scan.sh          — quick code scan

QUALITY CHECKPOINT PER MACHINE TYPE (from v23):
  ROLE: /smart [machine-specific expert]
  FUNCTIONAL: Run test part → verify REAL coordinates + REAL physics values
  WIRING: Show import → call → result used for every engine
  PHYSICS: Hand-calculate expected force/speed → compare to output ±tolerances
  CONFLICT: Verify constants from canonical source
```

---

### Phase 5: TURNING (adopt LATHE-COMPREHENSIVE-ROADMAP v3.0)
**PIPELINE SCRUTINY FINDINGS (24 gaps in TurningPrintToProgramEngine):**
  CRITICAL: Wire BoringBarDeflectionEngine (bore ops unvalidated), wire PartOffForceEngine
  (cutoff is crash-prone), fix multi-start thread G76 (accepted but ignored), fix controller
  field (ignored for 95% of output — Fanuc-only regardless of input), wire tailstock G-code
  generation (currently advisory text only). Remove 11 dead KB imports. Wire 3 live-tooling
  stubs (cross_tap, keyway, flat_mill produce comments only). Add PostProcessor integration.
  Add per-block S/F variability (currently per-operation only except profile_points).
  Wire SpeedFeedOrchestrator as canonical S/F source (currently inline physics only).
```
Roadmap file: H:/prism/LATHE-COMPREHENSIVE-ROADMAP.md
104 units across 12 milestones (LATHE-MS0 through MS10 + testing)
Current baseline: 172/172 tests passing

SESSIONS (~15, /compact after each milestone):
  SESSION 5-MS0: Foundation fixes (8 units)
  /compact
  SESSION 5-MS1: G-code hardening (10 units)
  /compact
  SESSION 5-MS2: Multi-op turning (8 units)
  /compact
  ... (continue per milestone)

EXTERNAL REFERENCE PROGRAMS:
  - Haas Lathe Workbook (22 programs with matching drawings)
  - Titans of CNC Academy lathe programs
  - Machinery's Handbook turning examples
```

**`/compact` CHECKPOINT 5 after each sub-milestone**

---

### Phase 6: MILLING
```
Roadmap file: H:/prism/MILLING-COMPREHENSIVE-ROADMAP.md
113 units across 11 milestones

SESSIONS (~16, /compact after each milestone)
EXTERNAL REFERENCE: Haas Mill Workbook, NIST SMS Test Bed, NAS 979
```

**`/compact` CHECKPOINT 6 after each sub-milestone**

---

### Phase 7: 5-AXIS
```
Roadmap file: H:/prism/FIVE-AXIS-COMPREHENSIVE-ROADMAP.md
125 units across 12 milestones (3+2 AND simultaneous tracks)

SESSIONS (~18, /compact after each milestone)
EXTERNAL REFERENCE: DMG MORI 5-axis examples, impeller/blisk test cases
```

**`/compact` CHECKPOINT 7 after each sub-milestone**

---

### Phase 8: MILL-TURN/SWISS
```
Roadmap file: H:/prism/MILL-TURN-COMPREHENSIVE-ROADMAP.md
147 units across 12 milestones (most complex)

SESSIONS (~22, /compact after each milestone)
EXTERNAL REFERENCE: Mazak/Okuma mill-turn examples, Swiss screw machine parts
```

**`/compact` CHECKPOINT 8 after each sub-milestone**

---

### Phase 9: GRINDING
```
Roadmap file: H:/prism/GRINDING-COMPREHENSIVE-ROADMAP.md
65+ units across 9 milestones

SESSIONS (~10, /compact after each milestone)
EXTERNAL REFERENCE: Studer/Junker grinding examples, bearing race finishing

CRITICAL FROM SCRUTINY (physicist): Add grinding thermal/burn model milestone:
  - Jaeger moving heat source model for workzone temperature
  - Specific grinding energy partition (Malkin: eps = u × ae × vw / vs)
  - Burn threshold prediction (temperature > tempering temperature)
  - Barkhausen noise correlation
  - GrindingThermalEngine + GrindingBurnPredictionEngine
  - Wire as fusion plugin (GrindingForcePlugin + GrindingThermalPlugin)
  This is NOT optional — grinding without thermal modeling produces rejects.
```

**`/compact` CHECKPOINT 9 after each sub-milestone**

---

### Phase 10: WIRE EDM + SINKER EDM
```
Roadmap file: H:/prism/WIRE-EDM-COMPREHENSIVE-ROADMAP.md
40 units across 6 milestones (testing pipeline already built — 151 tests, 12 engines)

SESSIONS (~7, /compact after each milestone)
EXTERNAL REFERENCE: Sodick/Makino/AgieCharmilles example programs
```

**`/compact` CHECKPOINT 10 after each sub-milestone**

---

### Phase 11A: LASER (separate tracking from waterjet — different physics)
```
Roadmap: H:/prism/LASER-COMPREHENSIVE-ROADMAP.md — 55+ units, 8 milestones
Physics: Schulz thermal model (beam absorption, melt/vaporize, gas assist, HAZ)
SESSIONS (~8, /compact after each milestone)
EXTERNAL REFERENCE: TRUMPF/Bystronic laser examples, Amada ENSIS data
```

**`/compact` CHECKPOINT 11A after each laser sub-milestone**

### Phase 11B: WATERJET (separate tracking — mechanical erosion, not thermal)
```
Roadmap: H:/prism/WATERJET-COMPREHENSIVE-ROADMAP.md — 50+ units, 8 milestones
Physics: Zeng-Kim abrasive model (jet pressure, garnet entrainment, erosion rate)
SESSIONS (~7, /compact after each milestone)
EXTERNAL REFERENCE: Flow/OMAX waterjet examples, KMT technical handbook
```

**`/compact` CHECKPOINT 11B after each waterjet sub-milestone**

---

## PHASE 12: EXHAUSTIVE TESTING WITH REAL COMPLEX PARTS

```
INDEPENDENCE RULE (D1 fix): Each machine type's Phase 12 testing runs
  as soon as its Phase 5-11 work completes. Do NOT wait for ALL machine
  types to finish before starting ANY Phase 12 testing.

12 Tiers × 9 Machine Types (but each machine tested independently)
92 real test parts with cross-material testing

ACCEPTANCE CRITERIA (T3 fix):
  PASS: ≥90% of parts produce programs within:
    ±5% of reference S/F values
    ±0.1mm of reference coordinates
    ±10% of reference cycle time
    Controller-correct syntax (assertion library validates)
  FAIL: any part where S/F is outside published range for the material
  FAIL: any part where collision is not detected (false negative)
  FAIL: any part where safe program is flagged as collision (false positive)

FALSE POSITIVE / FALSE NEGATIVE TESTS (T4 fix):
  Include 10 deliberately UNSAFE programs that MUST be caught:
    - Rapid into stock (Z rapid before X clearance)
    - Spindle off during cut (missing M03/M04)
    - Wrong tool (T01 programmed but T05 geometry)
    - Excessive force (50mm DOC in titanium)
    - Collision (tool holder hits fixture)
  Include 10 known-SAFE programs that must NOT be flagged:
    - Standard Haas workbook programs
    - Golden snapshots from Phases 5-11
  False positive rate target: <2%
  False negative rate target: 0% (ZERO missed collisions)

SESSIONS (~12, /compact after each tier — but run per machine as available):
  SESSION 12-T1: Tier 1 simple parts (available machines) — golden snapshots
  /compact
  SESSION 12-T2: Tier 2 moderate parts — golden snapshots
  /compact
  ... (continue through Tier 12)

VALIDATION DATA (from physicist scrutiny — HIGH):
  - NIST SMS Test Bed cutting force datasets: download and compare PRISM force
    predictions to dynamometer-measured Fx/Fy/Fz. Target: within +-15% for Fc, +-20% for Ff.
  - Published FEM cutting simulation results (Arrazola et al.): compare fusion convergence
    output against independent coupled solutions for 3+ material/geometry combinations.
  - Uncertainty calibration: for N test cuts, verify ~95% of measured values fall within
    predicted CI95. If only 80% do, the uncertainty model needs input adjustment.

SKILLS PER TIER:
  /test-speed-feed         — exhaustive S/F gauntlet per machine
  /physics-verify          — cross-pipeline physics consistency
  /quality-gate            — full QA per machine type
  /print-to-program        — test the full pipeline
  /program-validate        — verify G-code per controller
  /calibrate               — compare to reference programs
  /cnc-simulate            — false positive/negative validation
  /prism-review team       — multi-role scrutiny on each tier's results

GOLDEN SNAPSHOT RULE:
  When pipeline generates correct output:
    Save G-code: tests/golden-snapshots/{machine}/{part}.gcode
    Save input: tests/golden-snapshots/{machine}/{part}.input.json
    Create vitest comparing output to snapshot
```

**`/compact` → new session**

---

### SESSION 12-VALIDATE: Real-World Match-Then-Improve Validation (42+ parts)
```
SMART CONFIG: Role=validation engineer + CNC instructor | OPUS | MAX
UNITS: U-VAL1 per machine type (9 units, compact after each)

INTENT:
  For EACH machine type: Phase A MATCHES reference programs (prove correctness),
  Phase B IMPROVES upon them (prove value). This is the ultimate proof of PRISM's
  capability — showing it can reproduce AND exceed human-programmed results.

WORK:
  Per machine type (TURNING, MILLING, 5-AXIS, MILL-TURN, GRINDING, EDM, LASER, WATERJET, QUOTE):
    Phase A — MATCH: Run 3-10 real-world parts through PRISM pipeline
      - Compare to reference: S/F ±10%, coordinates ±0.1mm, G-code syntax correct
      - Use harvested data from SESSION 0-C-REALDATA
      - If NO MATCH: investigate, fix physics model, retry
    Phase B — IMPROVE: Full optimization on matched programs
      - Fusion Tier 3, per-block variability, chatter avoidance, probing injection
      - Generate improvement report per part
    /compact after EACH machine type (9 compactions)

IMPROVEMENT TARGETS:
  TURNING: 15% cycle time reduction average
  MILLING: 20% cycle time reduction average
  5-AXIS:  25% reduction (most optimization headroom)
  GRINDING: burn prevention + 10% cycle reduction
  EDM:     fewer skim passes, better Ra
  LASER/WATERJET: nesting optimization, pierce reduction

EXIT GATE: ✓ 42+ parts matched + 42+ improved + improvement report for each + aggregate accuracy by material/machine
```

**`/compact` CHECKPOINT 12 after each tier**

---

## PHASE 13: FINAL WIRING + WEB UI + COMMANDS (6 units in 2 sessions + 1 deployment session)

---

### SESSION 13-1: Web UI Integration (3 units)
```
SMART CONFIG: Role=full-stack + UI | OPUS | HIGH

KNOWLEDGE SOURCES:
  - DISPATCHER_DIGEST.md — all 67+ dispatchers with action counts (web UI calls these)
  - MCP server architecture — port 18361, 77 dispatchers, 2,700+ actions
  - src/tools/dispatchers/*.ts — dispatcher schemas (Zod) = API contracts for web UI
  - PRISM web app architecture — Claude API for AI judgment, MCP for computation
  - All 14 pipeline stages — each is an MCP action the web UI must be able to trigger

INTENT:
  The PRISM web app is how real machinists interact with the system. They upload a drawing,
  click "Generate Program", and get G-code + setup sheet + cost breakdown. Behind the scenes,
  the web UI calls MCP dispatcher actions for every pipeline stage. This session wires the
  web UI to all 77 dispatchers and creates slash commands for common workflows. If a dispatcher
  action exists but the web UI can't call it, that feature is invisible to users.

SKILLS TO USE:
  /forge-app-wire          — PRISM app full feature wiring
  /forge-mcp-wire          — MCP server integration wiring

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "MCP actions = computation backend, Claude API = AI judgment only"
  - DISPATCHER_DIGEST.md — all 67+ dispatchers with action counts (web UI calls these)
  - tribal tips: "every pipeline stage IS a dispatchable MCP action — no frontend logic duplication"

FORMULAS:
  - MCP call: dispatcher_name:action_name(params) → result (Zod-validated I/O)
  - Pipeline flow: 14 stages, each an MCP action, chained by web UI orchestrator
  - Latency budget: MCP call < 500ms for interactive, < 5s for computation, < 30s for simulation

SKILLS: /forge-app-wire, /forge-mcp-wire, /forge-wiring, /trace, /action-search

WORK:
  Wire web UI to call MCP actions for all 14 pipeline stages
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  Create /slash commands for common user workflows
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  Verify all 77 dispatchers accessible via web UI
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: hook for MCP action availability + all 14 pipeline actions wired + /print-to-program as user entry point

EXIT GATE: ✓ Web UI → MCP → pipeline + forge-triple complete + /compact
```

**`/compact` → new session**

---

### SESSION 13-2: Final Integration + Release Gate (3 units)
```
SMART CONFIG: Role=release engineer + QA | OPUS | MAX

KNOWLEDGE SOURCES:
  - /release-ready checklist — pre-release validation suite requirements
  - All golden snapshots from Phases 5-11 — regression anchors
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — 62 sources for validation
  - /forge-drift output — registry + doc drift must be ZERO
  - /system-audit output — complete system health
  - All 11 registries — verify all queryable and current
  - ISO 9001 / AS9100 quality management — release gate criteria

INTENT:
  This is the LAST gate before PRISM ships to real machinists. Every pipeline must produce
  correct G-code for every machine type. Every test must pass. Every registry must be current.
  Every engine must be wired. Zero drift. Zero stubs. Zero always-pass tests. A machinist
  uploading a drawing on day 1 must get a program they can TRUST on a REAL machine.

SKILLS TO USE:
  /release-ready           — pre-release validation suite
  /system-audit            — complete system health
  /forge-drift             — zero drift verification
  /counts                  — live system metrics

TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "release gate: ZERO stubs, ZERO always-pass tests, ZERO drift"
  - ALL 3,700+ tribal tips — validated against test outcomes
  - ALL 296 playbook rules — verified in final integration

FORMULAS:
  - Release criteria: 0 TS errors + 0 test failures + 0 registry drift + 0 inline constants
  - Coverage: all 9 machine types × 3+ materials × 2+ controllers = minimum test matrix
  - Quality: Cpk ≥ 1.33 for every tolerance prediction

SKILLS: /release-ready, /system-audit, /forge-drift, /counts, /forge-wiring, /test-speed-feed

WORK:
  Final integration testing across all 9 machine types
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  Documentation sweep — all indices current, all counts match
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP
  Release gate verification — /release-ready full suite
    → 4-LOOP: SCRUTINIZE → GAP FILL → TIE UP

FORGE-TRIPLE: final verification hook for release readiness + all MCP actions documented + /status shows complete system

EXIT GATE: ✓ RELEASE READY + all forge-triple outputs verified + ROADMAP COMPLETE
```

**`/compact` → new session**

---

### SESSION 13-DEPLOY: Production Deployment Readiness
```
SMART CONFIG: Role=DevOps engineer + platform architect | OPUS | HIGH
UNITS: U-DEPLOY1, U-DEPLOY2

KNOWLEDGE SOURCES:
  - H:/prism/mcp-server/Dockerfile — multi-stage, Node 22-alpine, non-root
  - H:/prism/mcp-server/docker-compose.yml — PostgreSQL + Prometheus + Grafana
  - src/mcp/healthProbes.ts — K8s-compatible /health, /ready, /live
  - src/utils/Logger.ts — Winston structured logging
  - src/db/connection.ts — PostgreSQL pooling (20 connections)
  - .github/workflows/ — CI for lint/test, Pages deploy

INTENT:
  Docker foundation is solid (multi-stage builds, health checks, Prometheus).
  But production needs: database backup, log aggregation, secret management,
  TLS certificates, rate limiting middleware. Bridge the staging→production gap.

WORK:
  U-DEPLOY1: Production hardening (~250 LOC)
    - Database backup script (pg_dump daily, 30-day retention)
    - Schema migration tool (version tracking + up/down scripts)
    - Secret management: move credentials from .env to environment-only injection
    - TLS termination in nginx (Let's Encrypt or self-signed for internal)
    - Rate limiting middleware on all HTTP endpoints (express-rate-limit)
    → /compact

  U-DEPLOY2: Monitoring + CI/CD completion (~250 LOC)
    - Wire GrafanaBridgeEngine (1,060 lines, exists!) to Prometheus metrics
    - Add business logic metrics: actions/min, engine latency P95, cache hit rate
    - Alerting: Slack/PagerDuty webhook integration for critical alerts
    - CI/CD: GitHub Actions → Docker build → push to registry → deploy
    - Document production runbook: startup, shutdown, backup, restore, scale
    → /compact

EXIT GATE: ✓ docker-compose up → healthy + backup/restore tested + metrics in Grafana + CI deploys
```

**`/compact` CHECKPOINT 13 — CORE ROADMAP COMPLETE**

---

## ═══════════════════════════════════════════════════════════════
## UNIFIED TRACKS: ALL PLANS MERGED INTO v24 (2026-03-28)
## ═══════════════════════════════════════════════════════════════
##
## Everything below was merged from: 9 machine roadmaps, EIGC (11 MS),
## MXU (11 MS), ACP (8 MS), BENCH (5 MS), ULT (6 MS), APP-MS0,
## GAP-MS0, PROD-GATE-MS0, CAMX MS0-MS22, CAMX-V17, Agentic Patterns,
## 11 spec docs, and archive plans. v24 is now the SINGLE SOURCE OF TRUTH.
##
## Owner split: Claude = backend, Codex = frontend
## Per-machine roadmap files remain as EXECUTION DETAIL for their phases.
## ═══════════════════════════════════════════════════════════════

---

## PHASE 15: ENGINE INTEGRITY GAP CLOSURE (EIGC track — 11 milestones, 44 units)

Source: mcp-server/docs/superpowers/specs/2026-03-25-engine-integrity-gap-closure-roadmap-design.md
Envelopes: EIGC-MS0A through EIGC-MS10

**PURPOSE**: Close the gap between what engines CLAIM to do and what they ACTUALLY do.
Fix silent no-ops, fail-closed patches, capability contracts, and provenance.

```
DEPENDENCY: Can start immediately. No blockers.
OWNER: Claude (backend)
ESTIMATED: 44 units across 11 milestones, ~15 sessions

MILESTONES:
  EIGC-MS0A: Design Contracts — Capability Taxonomy + Truth Hierarchy (2 units)
    - Define capability levels: PRODUCTION / SCAFFOLD / STUB / BROKEN
    - Engine truth manifest schema: what each engine can actually deliver
    → 4-LOOP

  EIGC-MS0: Baseline Truth Manifest — Full Engine Capability Audit (5 units)
    - Audit all 1,245 engines against capability taxonomy
    - Tag each: inputs it accepts, outputs it produces, physics it uses, stubs it hides
    → 4-LOOP

  EIGC-MS1: Restore ESLint Flat Config as Hard Gate (3 units)
    - ESLint v9 flat config, no-explicit-any as error for new code
    - CI gate: build fails if ESLint fails
    → 4-LOOP

  EIGC-MS2: Fix Runtime Honesty — Fail-Closed Patches (6 units)
    - Find all try/catch blocks that swallow errors silently
    - Replace with structured error returns or explicit fallback with warning
    → 4-LOOP

  EIGC-MS3: Fix Silent No-Ops and Helper Correctness (3 units)
    - Find engines that return default/empty results on invalid input
    - Add explicit rejection with error message
    → 4-LOOP

  EIGC-MS4: Feature Promotion vs Downgrade Decisions (3 units)
    - For each SCAFFOLD engine: decide promote to PRODUCTION or downgrade to documented STUB
    → 4-LOOP

  EIGC-MS5: Reconcile Roadmap Truth After Code Truth (3 units)
    - Update roadmap-index.json to reflect actual capability audit results
    → 4-LOOP

  EIGC-MS6: Direct Integrity Test Coverage >=80% Branch (4 units)
    - Write tests targeting error paths, boundary conditions, rejection logic
    → 4-LOOP

  EIGC-MS7: Canonical Manufacturing Domain Model (3 units)
    - Shared TypeScript interfaces for Part, Feature, Operation, Setup, Tool, Material, Machine
    - All engines reference these — no more ad-hoc type duplication
    → 4-LOOP

  EIGC-MS8: Provenance + Confidence Contracts + Physics Fusion (3 units)
    - Every engine output carries: source, confidence, uncertainty, method
    - Wire AtomicValue pattern into top 20 most-used engines
    → 4-LOOP

  EIGC-MS9: Product Capability Support Matrix (3 units)
    - Per-machine × per-operation matrix of what PRISM can actually deliver today
    → 4-LOOP

  EIGC-MS10: Golden-Path E2E Proof + Calibration (6 units)
    - 5 golden reference parts: 3-axis bracket, turned shaft, 5-axis impeller, EDM die, ground bearing
    - Each runs full pipeline → verify output matches published reference data ±15%
    → 4-LOOP

EXIT GATE: ✓ Every engine tagged PRODUCTION/SCAFFOLD/STUB + silent no-ops eliminated + 80% branch coverage + 5 golden E2E paths verified
```

---

## PHASE 16: AUTOMATION CONTROL PLANE (ACP track — 8 milestones, 43 units)

Source: mcp-server/docs/superpowers/specs/2026-03-25-mcp-automation-control-plane-roadmap-design.md
Envelopes: ACP-MS0A through ACP-MS7

**PURPOSE**: Build the automation chains that let Claude/Codex operate PRISM autonomously —
entry routing, build guards, context management, and product autopilots.

```
DEPENDENCY: EIGC-MS1 (ESLint gate) should be done first.
OWNER: Claude (backend) + Codex (frontend hooks)
ESTIMATED: 43 units across 8 milestones, ~12 sessions

MILESTONES:
  ACP-MS0A: Automation Contract + Chain Schema (5 units)
    - Define chain schema: trigger → condition → action → validation → rollback
    - Registry of all existing hooks, skills, scripts, crons
    → 4-LOOP

  ACP-MS0: Existing Automation Census + Gap Map (5 units)
    - Catalog 25+ hooks, 257+ skills, 15+ scripts
    - Identify: which fire reliably, which are dead, which conflict
    → 4-LOOP

  ACP-MS1: Entry Router — Prompt, Session, Command Activation (5 units)
    - Smart routing: user prompt → intent classification → skill/action dispatch
    - Session startup automation chain
    → 4-LOOP

  ACP-MS2: Coding + Build Guard Chain (5 units)
    - Pre-edit validation: is this file safe to modify?
    - Post-edit chain: lint → type-check → affected-tests → review-gate
    → 4-LOOP

  ACP-MS2B: Chain Failure Recovery (3 units)
    - When a chain step fails: structured retry → graceful degradation → user notification
    → 4-LOOP

  ACP-MS3: Context, Compaction + Handoff Chain (5 units)
    - Auto-compact at threshold, preserve critical facts, HANDOFF.md automation
    → 4-LOOP

  ACP-MS4: Speed/Feed Product Autopilot — Physics Fusion (5 units)
    - /auto-speed-feed chain: material → tool → machine → physics → per-block S/F
    - Fully automated with confidence bounds
    → 4-LOOP

  ACP-MS5: Post Processor + Print-to-Program Autopilots (6 units)
    - /print-to-program chain: drawing → OCR → features → pipeline → G-code → validate
    - /ppg-quick-start chain: controller → post config → code generation
    → 4-LOOP

  ACP-MS6: ERP/Quote Autopilot + Telemetry (5 units)
    - /quote-job chain: part → DFM → cycle time → costing → qty breaks → quote doc
    → 4-LOOP

  ACP-MS7: Automation Consolidation + Hardening (4 units)
    - Merge duplicate hooks, remove dead chains, harden failure recovery
    → 4-LOOP

EXIT GATE: ✓ 7+ product autopilots running E2E + chain failure recovery + telemetry dashboard
```

---

## PHASE 17: MAX UTILIZATION + PRODUCT SURFACE (MXU + APP tracks — 12 milestones, 66 units)

Source: mcp-server/docs/superpowers/specs/2026-03-25-mcp-max-utilization-roadmap-design.md
Envelopes: MXU-MS0A through MXU-MS10, APP-MS0

**PURPOSE**: Maximize utilization of existing 1,245 engines, 2,700+ actions, 257 skills.
Most capability is BUILT but UNREACHABLE — users can't find or use it.

```
DEPENDENCY: EIGC-MS0 (capability audit) should be done first.
OWNER: Claude (backend activation) + Codex (frontend exposure)
ESTIMATED: 66 units across 12 milestones, ~18 sessions

MILESTONES:
  MXU-MS0A: Utilization Contract Hardening (2 units)
  MXU-MS0: Capability Census + Activation Matrix (6 units)
    - Map every engine → dispatcher → action → skill → UI surface
    - Identify unreachable capabilities (engine exists, no user path)
    → 4-LOOP

  MXU-MS1: Coding + Build Copilot Plane (6 units)
    - Smart code suggestions using PRISM's own engine knowledge
    → 4-LOOP

  MXU-MS2: Token Economy + Context Kernel (6 units)
    - Optimal token allocation per task type
    - Context compression preserving manufacturing-critical facts
    → 4-LOOP

  MXU-MS3: Persistent Memory Fabric (6 units)
    - Cross-session learning: what worked, what failed, operator preferences
    - Semantic memory with vector indexing (from Agentic Patterns gap)
    → 4-LOOP

  MXU-MS4: Course-to-Capability Transformation (6 units)
    - Learning paths that unlock PRISM capabilities as user progresses
    → 4-LOOP

  MXU-MS5: Hook, Script, Agent + Worktree Orchestration (6 units)
    - Multi-agent coordination for complex manufacturing tasks
    → 4-LOOP

  MXU-MS6: Product-Pillar Capability Packages (5 units)
    - Bundle engines into product pillars: Calculator, Toolpath, Quote, Quality
    → 4-LOOP

  MXU-MS7: Discoverability + Exposure Surface (4 units)
    - Users can FIND capabilities: search, browse, recommend
    → 4-LOOP (CONVERGENCE — Codex wires frontend)

  MXU-MS8: Web Surface Activation (4 units)
    - Wire capability packages into web app pages
    → 4-LOOP (Codex-heavy)

  MXU-MS9: E2E Validation + Token Benchmarks (5 units)
    - Validate each capability package works end-to-end
    → 4-LOOP

  MXU-MS10: Bundle Effectiveness + Continuous Improvement (4 units)
    - Telemetry: which capabilities get used, which don't
    → 4-LOOP

  APP-MS0: Product + UI Overhaul — Pricing, Features, Web App (12 units)
    - Product packaging, pricing tiers, feature gates
    → 4-LOOP (Codex-heavy)

EXIT GATE: ✓ 80%+ of built capabilities reachable by users + token economy optimized + capability search works
```

---

## PHASE 18: ULTIMATE SHOP OS (ULT track — 6 milestones, 30 units)

Source: mcp-server/data/docs/roadmap/ULTIMATE-SHOP-OS-roadmap.md
Envelopes: ULT-MS0 through ULT-MS5

**PURPOSE**: Transform PRISM from a calculation tool into a connected shop operating system.
Live execution, role-aware desks, workflow automation, external sync.

```
DEPENDENCY: Phase 5 (ERP sessions 5-1 through 5-10) + Phase 6 (backend platform sessions 6-1 through 6-10)
OWNER: Claude (backend state, routes, events) + Codex (frontend shells, provider seams)
ESTIMATED: 30 units across 6 milestones, ~10 sessions

MILESTONES:
  ULT-MS0: Canonical Shop Domain + Event Spine (5 units)
    - ShopStateEngine: single source of truth for shop floor state
    - Event bus: job.created, operation.started, tool.changed, quality.flagged
    - WebSocket fanout for live UI updates
    → 4-LOOP

  ULT-MS1: Live Shop Execution Core (5 units)
    - Traveler barcode scanning: operator scans → status auto-updates
    - Labor timer: concurrent timers per operation per employee
    - Live machine queue: which jobs are where, who's working what
    → 4-LOOP

  ULT-MS2: Role-Aware Experience Layer (5 units)
    - Employee portal with sign-in
    - Permission policy: shop manager sees all, operator sees assigned jobs
    - Role-based desk API responses (query filters by role)
    → 4-LOOP (CONVERGENCE — Codex builds role shells)

  ULT-MS3: Operational Workflow OS (5 units)
    - Approval chains: quote → PO → WO → ship (state machine)
    - Comments + attachments on any entity
    - Shortage detection + purchasing triggers
    - Command-center queue for shop managers
    → 4-LOOP

  ULT-MS4: External Sync + Intelligence Fabric (5 units)
    - QuickBooks sync (from Session 6-5)
    - E2 Shop System sync (if available)
    - Analytics dashboard: OEE, on-time delivery, scrap rate
    - Offline recovery: queue actions while disconnected, sync on reconnect
    → 4-LOOP

  ULT-MS5: Launch, Hardening, Adoption (5 units)
    - Production deployment readiness
    - User onboarding flow
    - Replay/audit: reconstruct any past state from event log
    → 4-LOOP

EXIT GATE: ✓ Live shop execution with barcode scanning + role-aware desks + approval workflows + external sync + offline recovery
```

---

## PHASE 19: BENCHMARK SUITE + PRODUCTION GATE (BENCH + PROD-GATE — 6 milestones, 37 units)

Source: Envelopes BENCH-MS0 through MS4, PROD-GATE-MS0

**PURPOSE**: Prove PRISM produces correct results with rigorous, repeatable benchmarks.
Then ship.

```
DEPENDENCY: Phase 12 (testing) + EIGC-MS10 (golden paths)
OWNER: Claude (backend benchmarks)
ESTIMATED: 37 units across 6 milestones, ~10 sessions

MILESTONES:
  BENCH-MS0: Benchmark Core — 15 Parts + Formula Proofs (8 units)
    - 8,640 S/F tests (6 ISO groups × 8 ops × 12 tools × 5 machines × 3 DOC)
    - 1,728 deflection tests + 1,200 Ra tests
    → 4-LOOP

  BENCH-MS1: Parametric Sweeps (6 units)
    - Full parameter space coverage: speed × feed × DOC × material × tool
    → 4-LOOP

  BENCH-MS2: Cross-Engine + E2E Pipelines (6 units)
    - 1,500 pipeline tests × 20 dialects + 75 consistency checks
    → 4-LOOP

  BENCH-MS3: Machine Coverage (6 units)
    - 205 machines × 3 operations + 2,730 machine-specific tests
    → 4-LOOP

  BENCH-MS4: Real-World Benchmark (5 units)
    - 10 industry parts: beat CAM defaults + report generator
    - Match-then-improve: PRISM output ≥ manufacturer recommended values
    → 4-LOOP

  PROD-GATE-MS0: Unified Production Gate — Ship-Readiness (6 units)
    - Requires: EIGC-MS10, MXU-MS10, ACP-MS7 all PASS
    - Final checklist: security audit, performance baseline, backup/restore, monitoring
    - Ship decision: GO / NO-GO with documented rationale
    → 4-LOOP

EXIT GATE: ✓ 8,640+ S/F benchmarks pass + 10 industry parts beat CAM defaults + production gate GO
```

---

## PHASE 20: CAM SYSTEM INFRASTRUCTURE (CAMX milestones — 23 milestones, ~220 units)

Source: Envelopes CAMX-MS0 through MS22
Per-CAM detail: Mastercam, hyperMILL, Fusion 360, SolidCAM, NX CAM, PowerMill, CATIA, Tebis, Cimatron, Edgecam + 8 more

**PURPOSE**: Full CAM system coverage — every major CAM package gets strategy bridges,
tool export, post-processor templates, and add-in framework.

```
DEPENDENCY: Phase 7 Turning + Phase 8 Milling pipelines working
OWNER: Claude (backend bridges + strategy engines)
ESTIMATED: ~220 units across 23 milestones, ~35 sessions

KEY MILESTONES:
  CAMX-MS0:   Strategy Taxonomy + Normalization (8 units)
  CAMX-MS0.3: Pipeline Decision Orchestrator (24 units)
  CAMX-MS0.5: Pipeline Desiloing (16 units)
  CAMX-MS0.7: Uncertainty Chain Completion (10 units)
  CAMX-MS1:   Optimal Strategy Selection Engine (16 units)
  CAMX-MS2:   Controller + Machine Strategy Validation (8 units)
  CAMX-MS3:   Mastercam Dedicated Infrastructure (12 units)
  CAMX-MS4:   SolidCAM Dedicated Infrastructure (12 units)
  CAMX-MS5:   NX CAM Dedicated Infrastructure (10 units)
  CAMX-MS6:   PowerMill + CATIA Infrastructure (10 units)
  CAMX-MS7:   Tebis + Cimatron + Edgecam Infrastructure (10 units)
  CAMX-MS8:   Remaining CAM Systems Batch (16 units)
  CAMX-MS9:   hyperMILL AC Bridge + Fusion 360 Parity (10 units)
  CAMX-MS10:  Tool Export/Sync for All CAM Systems (8 units)
  CAMX-MS11:  CAM Add-In Framework (10 units)
  CAMX-MS12:  Feature-to-Strategy Intelligence (13 units)
  CAMX-MS13:  Cost-Optimal Pipeline Decision (8 units)
  CAMX-MS14:  Safety-First Decision Engine (8 units)
  CAMX-MS15:  Self-Learning Strategy Optimizer (12 units)
  CAMX-MS16:  Complete Dispatcher Wiring Sweep (8 units)
  CAMX-MS17:  Comprehensive Slash Commands + MCP (8 units)
  CAMX-MS18:  Comprehensive Test Suite (10 units)
  CAMX-MS19:  PrintToProgram v2 + Multi-Process + Web UI (15 units)
  CAMX-MS20:  Standards + Interoperability (8 units)
  CAMX-MS21:  Make-vs-Buy + Full Lifecycle Pipeline (10 units)
  CAMX-MS22:  Test-Driven Pipeline Validation — Every Machine Type (20 units)

EXIT GATE: ✓ 18 CAM systems bridged + strategy selection intelligence + per-CAM tool export + add-in framework
```

---

## PHASE 21: MINOR GAPS + AGENTIC INTELLIGENCE + FUTURE PROCESSES

Source: GAP-MS0, Agentic Patterns Roadmap, Phase 14 (expanded)

```
GAP-MS0: Minor Gap Engines (5 units)
  - Diamond Turning Engine, Laser Interferometry, STEP Parser enhancements
  → 4-LOOP

AGENTIC PATTERNS — CONFIRMED GAPS (from 10-agent audit, 482-page source):
  1. Semantic Knowledge RAG — vectorize 3,700+ tribal tips (currently String.includes() only)
  2. Inter-step Validation Gates — InferenceChainEngine needs validation between chain steps
  3. Semantic Memory with Embeddings — MemoryGraphEngine.find_similar uses string matching
  4. Scoped State Prefixes — flat file storage needs namespacing (user:/app:/temp:)
  5. A2A Agent Card — /.well-known/agent.json for multi-agent ecosystem
  6. Shared State Protocol — real-time state between subagents during pipeline execution
  7. Semantic Router — embedding-based intent classification for 2,700+ actions

SAFETY P0 (from Agentic Patterns audit):
  - Operator Confirmation Gate for G-code output (HITL checklist)
  - Cross-field physics for medium/hard materials (Fc plausibility ranges 4140, 1045, 304SS)

FUTURE PROCESSES (from Phase 14):
  1. PlasmaProgramAssemblerEngine — CNC plasma tables
  2. PressBrakeProgramEngine — bend sequence optimization
  3. AdditiveBuildParameterEngine — FDM/SLM/SLS
  4. DMISInspectionProgramEngine — CMM offline programming
  5. RoboticWeldProgramEngine — offline robot welding

INFRASTRUCTURE:
  - MES protocol adapter (ISA-95/B2MML)
  - Barcode/RFID shop floor data collection
  - Multi-site/multi-plant ERP model
  - FMEA/reliability engineering from pipeline decision data
```

---

## ═══════════════════════════════════════════════════════════════
## PHASE ∞: SVI → 100% GAP-FILL (/rgs-sync)
## ═══════════════════════════════════════════════════════════════
##
## After ALL phases above are complete, run `/rgs-sync` to:
##
## 1. Recompute SVI and Psi (currently 1.8 × 10^43, Psi = 40.8%)
## 2. Identify EVERY remaining gap that prevents Psi from reaching 100%
## 3. Generate a final gap-fill roadmap targeting:
##    - Every unwired engine → wire it
##    - Every unreachable action → expose it
##    - Every untested formula → validate it
##    - Every uncovered machine × material × operation combination → test it
##    - Every registry entry without physics backing → add physics
##    - Every pipeline with < 100% stage coverage → complete stages
## 4. Claude and Codex coordinate: Claude fills backend gaps, Codex fills frontend gaps
## 5. Both agents then SWAP and audit opposite work (convergence audit)
## 6. Final /rgs-sync generates the LAST roadmap to close remaining items
##
## TARGET: Psi = 100% (every subsystem fully wired, tested, and reachable)
##
## Current SVI Subsystem Coverage (as of 2026-03-28):
##   Materials:    85% wired → target 100%
##   Tools:        40% wired → target 100%
##   Machines:     60% wired → target 100%
##   Tribal Tips:  30% wired → target 100%
##   Formulas:     70% wired → target 100%
##   Algorithms:   55% wired → target 100%
##   Strategies:   50% wired → target 100%
##   Engines:      65% wired → target 100%
##   Dispatchers:  90% wired → target 100%
##   Actions:      85% wired → target 100%
##   Pipelines:    100% wired ✓
##   Dialects:     80% wired → target 100%
##   Tests:        100% wired ✓
##
## When Psi = 100%, PRISM has achieved full system coverage:
##   every engine reachable, every formula validated, every material tested,
##   every machine covered, every tribal tip actionable, every pipeline complete.
##
## ═══════════════════════════════════════════════════════════════

---

## TOTAL SESSION COUNT (UNIFIED — ALL TRACKS MERGED)

| Phase | Description | Units | Sessions | Owner |
|-------|------------|-------|----------|-------|
| 0-PRE | System Audit | 8 | 6 | Claude |
| 0-A | Print Reading | 6 | 3 | Claude |
| 0-B | Bug Fixes + Safety | 7 | 3 | Claude |
| 0-C | Test Infrastructure | 6 | 3 | Claude |
| 0-D | Registry/Algorithm Wiring | 20 | 7 | Claude |
| Phase 1 | Knowledge + Decisions | 22 | 8 | Claude |
| Phase 2 | Business Logic | 5 | 2 | Claude |
| Phase 3 | Level 3 + Physics | 16 | 6 | Claude |
| Phase 4 | Simulation + Monitoring | 6 | 2 | Claude |
| Sessions 5-X | ERP + Business Hardening | 28 | 10 | Claude |
| Sessions 6-X | Backend Platform | 28 | 10 | Claude |
| Phase 5 | Turning Pipeline | 104 | ~15 | Claude |
| Phase 6 | Milling Pipeline | 113 | ~16 | Claude |
| Phase 7 | 5-Axis Pipeline | 125 | ~18 | Claude |
| Phase 8 | Mill-Turn/Swiss Pipeline | 147 | ~22 | Claude |
| Phase 9 | Grinding Pipeline | 65 | ~10 | Claude |
| Phase 10 | EDM Pipeline | 40 | ~7 | Claude |
| Phase 11 | Laser + Waterjet Pipelines | 105 | ~15 | Claude |
| Phase 12 | Exhaustive Testing | 92 | ~12 | Claude |
| Phase 13 | Final Wiring + Deployment | 6 | 2 | Claude |
| Phase 14 | Future Processes + Agentic | ~30 | ~8 | Claude |
| Phase 15 | EIGC — Engine Integrity | 44 | ~15 | Claude |
| Phase 16 | ACP — Automation Control Plane | 43 | ~12 | Claude |
| Phase 17 | MXU + APP — Utilization + Product | 66 | ~18 | Claude+Codex |
| Phase 18 | ULT — Ultimate Shop OS | 30 | ~10 | Claude+Codex |
| Phase 19 | BENCH + PROD-GATE | 37 | ~10 | Claude |
| Phase 20 | CAMX — CAM System Infrastructure | ~220 | ~35 | Claude |
| Phase 21 | Gaps + Agentic + Future | ~30 | ~8 | Claude |
| Phase ∞ | SVI → 100% Gap-Fill | TBD | TBD | Claude+Codex |
| **TOTAL** | **ALL TRACKS UNIFIED** | **~1,543** | **~285** | **Both** |

---

## MCP FULL UTILIZATION PROTOCOL — MANDATORY EVERY SESSION

**Current utilization: ~3% of 576+ MCP actions. This protocol fixes that.**
**Non-compliance = wasted context, lost state, rediscovered tools, duplicated work.**

### SESSION START (before ANY code work):
```
1. prism_session:context_boot           — Full context hydration from prior session
2. prism_session:dispatcher_map         — Discover ALL available dispatchers + actions (live count)
3. prism_session:memory_recall          — Load cross-session knowledge (tribal tips, formulas, decisions)
4. prism_session:system_snapshot        — Capture baseline system state before changes
5. prism_session:action_search "<goal>" — Find the right MCP action for this session's WORK
```

### DURING WORK (every 5-10 tool calls):
```
6. prism_session:auto_checkpoint        — Save incremental state (prevents loss on crash/compact)
7. prism_session:action_search "<need>" — Route intent to optimal dispatcher (don't guess — ASK the MCP)
8. prism_session:tool_route_best        — Let MCP recommend the best tool for current task
9. prism_session:wip_capture            — Snapshot work-in-progress at natural breakpoints
```

### SESSION END / PRE-COMPACT:
```
10. prism_session:memory_save           — Persist cross-session knowledge for next session
11. prism_session:system_snapshot       — Capture post-work state (diff against baseline)
12. prism_session:checkpoint_enhanced   — Detailed checkpoint with metadata + artifact list
```

### PLUGIN & EXTENSION UTILIZATION:
```
Vitest MCP:       mcp__vitest__run_tests, analyze_coverage, list_tests
ESLint MCP:       mcp__eslint__lint-files (TypeScript quality gate)
Taskmaster:       mcp__taskmaster-ai__get_tasks, next_task, set_task_status
Codebase Memory:  codebase-memory-mcp search_graph, trace_call_path
Excel MCP:        mcp__excel__excel_read_sheet (data import/validation)
```

### CONTEXT RETENTION & FEATURE CASCADE:
```
SESSION_ARTIFACTS.json  — Tracks new engines/hooks/skills built per session (auto-written by PostCompact)
.compaction-survival.md — Preserves critical state across compaction boundaries
HANDOFF.md              — Per-agent state written on stop, read on startup
SVI-compact.md          — System health snapshot auto-generated pre-compact
MEMORY.md               — Shared memory auto-synced across sessions/machines
```

### ENFORCEMENT:
- Sessions that skip context_boot + memory_recall at start = NON-COMPLIANT
- Sessions that skip memory_save + system_snapshot at end = NON-COMPLIANT
- PostCompact hook auto-writes SESSION_ARTIFACTS.json (Feature Cascade)
- SessionStart hook auto-reads Feature Cascade and reports live counts

---

## BUILDING TOOLKIT — Skills, Scripts & Hooks for Every Build Task

### When CREATING a new engine (every session that writes to src/engines/):
```
BEFORE WRITING:
  /forge-engines           — engine discovery: does a similar engine already exist?
  /navigate <topic>        — zero-IO file routing to find related engines
  /codebase-memory-exploring — architecture search via knowledge graph
  /engine-browse           — explore existing engines for patterns

DURING WRITING:
  PostToolUse stub detector — AUTO-BLOCKS stub returns in engines (hook fires silently)
  pretooluse-unified       — routes file access, prevents duplicate reads
  posttooluse-unified      — syntax checks after every edit

AFTER WRITING:
  /prism-review            — 3 parallel agents (physics + wiring + test review)
  /scrutinize              — standalone code quality review
  /forge-wiring            — verify new engine is WIRED (not orphaned)
  /trace                   — trace wiring chain: engine → dispatcher → schema
  /forge-postflight        — shared integration protocol
  /test                    — smart test runner on affected files
  /forge-types             — TypeScript type coverage check
```

### When WIRING an engine to a pipeline:
```
  /forge-wiring            — architecture wiring validator (finds orphans/phantoms)
  /trace                   — engine→dispatcher→schema chain tracer
  /unwired-review          — structured unwired engine triage
  /codebase-memory-tracing — who calls what via knowledge graph
  /forge-schema            — JSON schema validation for dispatcher schemas
  /action-search           — find which dispatcher action to wire to
  /action-help             — quick parameter lookup for existing actions
```

### When WRITING tests:
```
  /forge-tests             — test gap discovery + generation
  /test                    — smart test runner
  /test-speed-feed         — speed/feed exhaustive gauntlet (if S/F related)
  PostToolUse test quality  — AUTO-BLOCKS || true and bare .includes() patterns
  /physics-verify          — cross-pipeline physics consistency
  /calibrate               — compare to calibration data from published sources
```

### When FIXING bugs:
```
  /forge-debug             — structured debugging pipeline
  /scope                   — change impact analysis before editing
  /forge-deps              — dependency health check
  prism-build.sh           — quick build verification script
  prism-scan.sh            — quick code scan script
```

### When doing SESSION QUALITY work:
```
  /roadmap-quality-check   — post-compact scrutiny (runs AFTER /compact)
  /forge-drift             — registry + documentation drift detector
  /forge-cleanup           — dead code + file detector
  /forge-audit             — codebase quality scan
  /forge-metrics           — codebase metrics dashboard
  /system-audit            — complete system health check
  /forge-safety            — safety chain audit + hardening
  /health                  — quick system health check
  /counts                  — live system metrics
```

### When doing PHYSICS work:
```
  /physics-verify          — cross-pipeline physics consistency check
  /formula-browse          — browse formula registry
  /algorithm-inspect       — inspect algorithm implementation
  /calibrate               — compare to published calibration data
  /what-if                 — delta analysis across physics models
  /spindle-optimize        — harmonic-aware RPM selection
  /auto-speed-feed         — physics-optimized line-by-line S/F
```

### When doing MANUFACTURING domain work:
```
  /calc                    — quick CNC calculation (zero overhead)
  /defaults                — smart machining parameter defaults
  /material-lookup         — materials database query
  /tool-select             — complete tool selection pipeline
  /tool-catalog            — unified cutting tool database
  /machine-check           — validate parameters vs machine limits
  /playbook                — machining best practice advisor
  /quote-job               — manufacturing quote with physics
  /process-calc            — unified manufacturing process calculator
```

### Scripts available at ~/.claude/hooks/lib/:
```
  prism-build.sh           — quick TypeScript build check
  prism-scan.sh            — quick codebase scan
  common.sh                — shared utilities
  mcp-health-check.sh      — MCP server health
  self_healing.py          — auto-repair schema drift, invalid hooks
  adaptive_optimizer.py    — ML-based auto-tuning
  team-aggregator.py       — agent team result aggregation
  telemetry_analyzer.py    — tool failure and performance analysis
```

---

## AUTOMATIC TOOL USAGE MATRIX

Every session has access to these. Use the RIGHT tool for the RIGHT task:

| Task | Primary Tool | Backup |
|------|-------------|--------|
| Find an engine | /navigate or /codebase-memory-exploring | /engine-browse |
| Verify wiring | /trace + /forge-wiring | grep for import/call |
| Check physics | /physics-verify + /calibrate | /what-if |
| Run tests | /test | npx vitest run [file] |
| S/F verification | /test-speed-feed | /auto-speed-feed |
| Code quality | /scrutinize + /prism-review | /forge-audit |
| System health | /health or /status | /system-audit |
| Registry data | /registry-browse + /material-lookup | /formula-browse |
| Session context | /context + /pressure | /context-map |
| File discovery | /navigate + /code-index | /digest-all |
| G-code testing | /program-validate + /cnc-simulate | /gcode |
| Cost analysis | /quote-job + /estimate | /cost-optimize |
| Tool selection | /tool-select + /tool-catalog | /tool-life-max |
| Machine check | /machine-check + /machine-optimize | /feasibility-check |
| Quality gate | /quality-gate + /quality-check | /first-part-right |

---

## HOOKS THAT FIRE AUTOMATICALLY (never invoke these)

| Hook | Event | What It Does |
|------|-------|-------------|
| session-start-unified | SessionStart | Loads context + efficiency rules |
| precompact-save | PreCompact | Saves COMPACTION_SURVIVAL.json |
| postcompact-handler | PostCompact | Restores critical facts |
| stop-completion-check | Stop | Warns if work incomplete |
| task-completed-chain | TaskCompleted | Suggests next milestone |
| pretooluse-unified | PreToolUse | File routing, safety, dedup |
| posttooluse-unified | PostToolUse | Syntax checks, compression |
| auto-approve | PreToolUse | Auto-approves safe operations |
| **Engine stub detector** | **PostToolUse** | **Blocks stubs in src/engines/*.ts** |
| **Test quality enforcer** | **PostToolUse** | **Blocks || true and bare .includes() in tests** |
| KG reminder | PreToolUse | Reminds to use knowledge graph |

---

## SCRIPTS AVAILABLE (use for token savings)

| Script | Location | Use When |
|--------|----------|----------|
| prism-build.sh | ~/.claude/hooks/lib/ | Quick build check |
| prism-scan.sh | ~/.claude/hooks/lib/ | Quick code scan |
| watchlist-to-urls.sh | ~/.claude/hooks/lib/ | Video URL discovery |
| video-watchlist-batch.sh | ~/.claude/hooks/lib/ | Transcript download |
| transcript-prefilter.sh | ~/.claude/hooks/lib/ | Reduce transcript size |

---

## CONTEXT QUALITY RULES

```
FRESH > ACCUMULATED:
  A fresh 20% context window produces better output than a 90% filled one.
  Compact EARLY, compact OFTEN.

NEVER BUILD IN DEGRADED CONTEXT:
  If you've been working >50 tool calls without compacting, the quality
  of your output is degrading. Compact NOW, even mid-unit.

STATE ON DISK BEATS STATE IN MEMORY:
  Write findings to HANDOFF.md, not just to conversation.
  Next session reads the file, not your memory.

KNOWLEDGE GRAPH BEATS RE-READING:
  The 103K-node graph knows every function and connection.
  Query it instead of reading 50 files.

HOOKS ENFORCE WHAT YOU FORGET:
  The stub detector catches placeholder returns you might miss at hour 3.
  The test quality hook catches || true you might type on autopilot.
  Let the hooks do their job — they're your safety net.
```

---

## v24 SCRUTINY AMENDMENTS (MAJOR + MINOR fixes from scrutinization pass)

### MAJOR FIXES APPLIED INLINE:
- S2: U27 split into U27a/b/c/d (3 statistical + 1 DOE/Taguchi)
- M4: DOE/Taguchi added as U27d
- S3: Regression fitting added to U28
- M5: Wear compensation added to U-PROC3
- E3: Session 0-D-7 split into 0-D-7a + 0-D-7b
- MT3: Phase 11 split into 11A (Laser) + 11B (Waterjet)
- D2: POST-ULT phased wiring note on U-KW6
- D4: Calibration-optimization bootstrap note on U28
- T3: Phase 12 acceptance criteria (±5% S/F, ±0.1mm coords, ±10% cycle time)
- T4: Phase 12 false positive/negative test suite (10 unsafe + 10 safe programs)

### MAJOR FIXES — DOCUMENTATION AMENDMENTS:

**K2 — Tool Grade-Specific Data Linkage:**
Session 1-5 (U-KW1) when wiring manufacturer S/F data: link ToolRegistry grade codes
(from 95K catalog) to manufacturer S/F lookup. When a Sandvik CNMG 120408 grade 4325
is selected, query guhring-iscar-speed-feed-data.ts for grade-specific Vc/fz, not just
ISO group defaults. Add this as explicit sub-task in U-KW1.

**K3 — Materials Database Clarification:**
MaterialRegistry (1,662 lines) contains typed material properties. The 2,957 count includes
knowledge-base materials (less structured). The 3,316 gap (6,338 knowledge - 3,022 typed)
represents materials with tips/text but no structured kc1.1/mc/thermal properties. Session
0-D-1 (U-REG2) should note: wire BOTH typed (1,662L) AND knowledge-based (text) material
data, with typed as primary and knowledge as fallback context.

**W3 — BurnishingPolishingEngine Verification:**
Session 0-D-7b (U-PROC1) must VERIFY BurnishingPolishingEngine EXISTS in codebase before
attempting to wire it. If it doesn't exist, BUILD it in that session (add to unit scope).
Add explicit check: `grep -r "BurnishingPolishing" src/engines/` — if no result, create engine.

**W4 — QualityPredictionEngine Output Schema:**
Session 1-4 (U-DA5) when wiring prediction engines: QualityPredictionEngine must output:
  { predicted_cpk: number, predicted_scrap_rate: number, dimensional_accuracy_mm: number,
    surface_integrity: { white_layer: boolean, residual_stress_mpa: number },
    confidence: number, recommendations: string[] }
This output goes to: (1) decision scoring as quality criterion, (2) setup sheet as quality
prediction, (3) cost estimation as scrap risk factor.

**W5 — WEDM Engine Audit in Phase 0-PRE:**
Add to Session 0-PRE-3 or create Session 0-PRE-3b: audit the 12 WEDM-P2P engines
(15,900 lines, 249 tests) alongside the CAMX engine batches. These are PRODUCTION QUALITY
and should be verified separately from the scaffold CAMX engines. Confirm 249 tests still pass.

**E4 — Standardized SKILLS Format:**
All sessions should use consistent format. Sessions 1-4 through 1-8 use compact one-line
"SKILLS: /x, /y, /z" — acceptable for shorter sessions. Early sessions (0-PRE through 0-C)
use multi-line "SKILLS TO USE:" with descriptions — preferred for complex sessions.
RULE: sessions with 3+ units → multi-line format. Sessions with 1-2 units → compact OK.

**I2 — Machinist-Facing Intent for 0-D Sessions:**
Sessions 0-D-1 through 0-D-7 wire registries and algorithms. Reframe intents:
  0-D-1: "After this, the machinist asking about a SPECIFIC alloy gets ALLOY-specific speeds, not generic ISO group averages"
  0-D-3: "After this, a long tool in a BT40 holder produces DIFFERENT stable zones than in HSK — because assembly dynamics matter"
  0-D-5: "After this, the program includes force monitoring thresholds — the machine can auto-stop before tool breakage"
  (Apply similar machinist-facing language to all 0-D sessions)

**MT2 — Grinding Depth Review:**
GRINDING-COMPREHENSIVE-ROADMAP.md has 65 units / 8 milestones. Review coverage:
  ✓ OD/ID cylindrical (MS0), ✓ Surface grinding (MS1), ✓ Creep-feed (MS5),
  ✓ Centerless (MS3), ✓ Form profiles (MS5), ✓ Tool grinding (MS7 testing)
  VERIFY: jig grinding explicitly covered? If not, add 3-5 units to MS5 or create MS5.5.
  Jig grinding is critical for die/mold (±0.002mm hole position accuracy).

**D3 — Move Sobol to Earlier Phase:**
Sobol sensitivity indices should be available BEFORE optimization engines are wired (Session 1-4).
Move U27a (Sobol + bootstrap + SPRT) from Session 3-5 to Session 0-D-4 or create 0-D-4b.
This way, optimization in Phase 1 can use Sobol to identify which parameters matter MOST
before running expensive GA/PSO searches.

**C2 — Split Session 0-PRE-5:**
Session 0-PRE-5 has 3 units (U-AUDIT4, U-AUDIT5, U-AUDIT6) at 70-80% context.
Split into: 0-PRE-5a (U-AUDIT4: verify 11 registries) and 0-PRE-5b (U-AUDIT5 + U-AUDIT6:
constants consistency + test quality audit). This prevents context degradation.

**C3 — Session 1-4 Knowledge Source Reduction:**
Session 1-4 lists 14 engines in knowledge sources. Reading all 14 before 3 units of wiring
work is excessive. Reduce to: read only the engines DIRECTLY needed per unit:
  U-DA4: read GeneticOptimizer + ParticleSwarm + 2-3 target engines to wire into
  U-DA5: read ToolBreakagePrediction + ProcessCapability + QualityPrediction
  U-DA6: read CNCSimulationPipeline + BackplotEngine
  Don't read all 14 upfront — read per-unit as needed.

### MINOR FIXES (from scrutinization — addressed here for completeness):

**M6**: Thermal expansion of workpiece/machine: add NOTE to Session 3-7 (thermal-wear coupling)
  that machine thermal drift (spindle growth ~0.005mm/hour) and workpiece thermal expansion
  (large parts grow 10-50μm during machining) should be modeled in future phase.

**S4**: Reliability engineering (FMEA, hazard rate): add as future-phase placeholder after Phase 12.
  Not critical for MVP but important for production deployment.

**K4**: Video learning data (20 tips, 2 runs): add to Session 1-1 knowledge sources as additional
  tribal knowledge input alongside the 3,700+ CAM tips.

**E5**: Session 0-A-2 uses OPUS|HIGH — intentional for lighter STEP import work. Keep as-is.

**I3**: Session 4-2 role "Industry 4.0 + monitoring" → change to "machine monitoring + adaptive control"

**MT4**: Additive manufacturing (DED/PBF hybrid): add as Phase 14 placeholder for future expansion.
  Not in scope for current Print-to-CNC-Program roadmap.

**T5**: Performance/latency tests: add to Phase 12 testing — verify MCP call latency < 500ms
  for interactive, < 5s for computation, < 30s for simulation.

**C4**: After adding FORGE-TRIPLE to all sessions, estimated context per session increases ~5-10%.
  Sessions marked 70-80% should be treated as 80-90% and may need splitting.

**D5**: Sessions 0-A-1 → 0-A-2 → 0-A-3 linear dependency is correct by design. No change needed.

---

## POST-CONVERGENCE NOTE — RUN `/rgs-sync` AGAIN FOR SVI 100%

When the current backend/frontend convergence tranche is complete and stable:

1. run `/rgs-sync`
2. audit the remaining gaps across `v24`, the merged archive roadmaps, the machine-domain annexes, and the Claude/Codex plan-generation surfaces
3. generate the next dependency-ordered roadmap pass dedicated to closing all remaining SVI/Psi gaps
4. keep `v24` as canonical and attach any new milestone packs or overlays under it rather than forking a new master roadmap

Target of that follow-on pass:

- fill all remaining capability, wiring, learning, hook, script, skill, MCP, and validation gaps required to drive the SVI engine toward a `100%` score
