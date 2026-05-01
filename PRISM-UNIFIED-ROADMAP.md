# PRISM Unified Roadmap — 2026-03-30

**Last Updated**: March 30, 2026  
**Responsibility**: Core Team (Claude backend, Codex frontend)  
**Status**: Main Path active. Side Quests queued pending MP-1B convergence.

---

## Authority & Precedence (Binding)

When roadmap documents disagree, resolve in this priority order:

| Priority | Document | Path | Role |
|----------|----------|------|------|
| 1 (highest) | Collaboration State | state/shared/ROADMAP_COLLABORATION_STATE.md | Live gate, ownership, participant tracking |
| 2 | This File (Unified Roadmap) | PRISM-UNIFIED-ROADMAP.md | Structure, index, sequencing authority |
| 3 | v24 Canonical Source | CAMX-RESTRUCTURED-ROADMAP-v24.md (8,098 lines) | Detailed session execution, per-unit specs |
| 4 | v24 Branch Plan | state/shared/ULTIMATE_V24_BRANCH_PLAN_2026-03-29.md | Phase overlay, mathematical governance |
| 5 | Child Roadmaps | See Child Roadmap Index below | Domain-specific execution detail |
| 6 | Superpower Specs | mcp-server/docs/superpowers/specs/*.md | Design specifications for extended phases |

**Obsolete** (do not execute): v17, v18, v19, v20, v21, v22, v23 — all consolidated into v24.  
**Non-canonical** (reference only): ULTIMATE-PRISM-ROADMAP-v25.md — planning sketch.  
**Reference only** (no execution): Agentic Patterns, Pipeline Engine Matrix, Tool Selection guides, Phase R files.

**Mathematical Governance Rule**: All formulas, constants, scores, thresholds, and state machines are canonical system assets. Every production formula must define formula_id, domain, inputs, units, constants, constraints, output semantics, target consumers, tolerance target, provenance, and validation suite. No inline business, physics, or automation constants in routes, pages, or local scripts.

---

## Child Roadmap Index

### Automation Track (SQ-A parent)

| ID | Document | Path | Status |
|----|----------|------|--------|
| AUTO-BP | MCP Full Automation Blueprint | mcp-server/data/docs/roadmap/MCP-FULL-AUTOMATION-BLUEPRINT.md | Active (architecture) |
| AUTO-DEV | MCP Development Automation | mcp-server/data/docs/roadmap/MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md | Active |
| AUTO-HARD | MCP Automation Hardening | mcp-server/data/docs/roadmap/MCP-AUTOMATION-HARDENING-ROADMAP.md | COMPLETE (AUTO-0..AUTO-7) |

### Learning Track (SQ-B parent)

| ID | Document | Path | Status |
|----|----------|------|--------|
| RLH | Resource Learning Hardening | mcp-server/data/docs/roadmap/RESOURCE-LEARNING-HARDENING-ROADMAP.md | Planned |
| TKP | Tribal Knowledge Propagation | mcp-server/data/docs/roadmap/TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md | Planned |
| HBK | Machine Handbook Intelligence | mcp-server/data/docs/roadmap/MACHINE-HANDBOOK-INTELLIGENCE-ROADMAP.md | Planned (12 milestones) |

### Shop OS Track (MP-1A/1B parent)

| ID | Document | Path | Status |
|----|----------|------|--------|
| ULT | Ultimate Shop OS | mcp-server/data/docs/roadmap/ULTIMATE-SHOP-OS-roadmap.md | Planned (ULT-MS0..MS5) |

### Post Processor Track

| ID | Document | Path | Status |
|----|----------|------|--------|
| PPG | Post Processor Generator | data/roadmaps/POST_ULTIMATE_ROADMAP.md | Active (38-stage pipeline) |

### Fusion 360 Integration Track (Phase 22)

| ID | Document | Path | Status |
|----|----------|------|--------|
| F360 | Fusion 360 Desktop Control + Deep Integration | docs/roadmaps/FUSION360-DEEP-INTEGRATION-ROADMAP.md | Active (F360-MS0..MS5) |

### Convergence Engines (7 engines, ~1,500 LOC — created by CONVERGE plan)

| Engine | LOC | Purpose |
|--------|-----|---------|
| ShellBootstrapEngine | ~200 | Shell navigation + role profiles |
| JobDeskAggregatorEngine | ~300 | Job desk records + approvals |
| ProgramReleaseCatalogEngine | ~250 | Machine/tool/fixture catalog |
| SchedulingStudyAggregatorEngine | ~200 | Multi-algorithm study runner |
| ShopFloorCheckInEngine | ~200 | Department check-in + tasks |
| TelemetrySummaryEngine | ~150 | Dashboard aggregate data |
| StrategyAdvisorEngine | ~200 | Toolpath strategy ranking |

Source: state/shared/CONVERGENCE_PLAN_2026-03-28.md

---

## System State Summary

**Architecture**: MCP Server (TypeScript) + Web App (React/Vite) + CAD Engine (Python)

**Current Inventory**:
- 1,302 dispatched engines, 79 dispatcher modules, 3,898 actions
- 1,304+ engine files, 67 dispatcher files, 60+ algorithms
- 60+ web pages, 35+ API client modules, 40+ route files, 134+ schemas
- 95,608 tools, 910 machines, 2,957 materials, 3,700+ tribal tips
- 14 registries (29,569 entries)

**Test & Quality Status**:
- 152/152 tests passing (core suite)
- 0 TypeScript compilation errors
- Only 1/1,287 engines with quality score assigned
- Wiring score: 0.55 | Physics core: 0.7

**Layers Completed**: L0 (Data), L1 (Algorithms), L3 (Dispatchers), L4 (Hooks)  
**Layers In Progress**: L2 (Engines: 169/187), L5 (Skills: 201/269)  
**Layers Not Started**: L6 (API), L7 (SFC Product), L8 (Products 2-4), L9 (CAD/CAM), L10 (Enterprise)

**Collaboration Mode**: "Finish-current-delivery-first" — Claude owns backend, Codex owns frontend. Gate: complete current backend/frontend tranche before expanding scope.

**Known Blockers**:
- Route mount mismatch (/quote/ vs /quotes/)
- billing.ts not mounted to backend
- messages/hotJobs lacking live backend integration
- 78 orphaned endpoints, 12 fixture-only providers

---

## Main Path (Critical Path — Execute in Order)

### MP-0: Contract Surface Repair
**Purpose**: Restore routing integrity and establish math governance bootstrap.

**Core Work**:
- Fix route mount mismatch (/quote/ vs /quotes/, ensure consistent naming)
- Mount billing.ts to backend service layer
- Establish proof-stack rules (input -> transformation -> output verification)
- Bootstrap failure-mode governance (identify and gate known failure points)
- Validate dispatcher wiring (ensure all 79 dispatchers correctly connected)

**CONVERGE Binding**: CONVERGE Phase 1 (Foundation Fix, sessions 1-1..1-5) executes within MP-0. Targets: hook path errors 44+ -> 0, PipelineContext `any` types 88 -> <10.

**Exit Gate Criteria**:
- All route mounts validated and consistent
- billing.ts mounted and callable from frontend
- Proof-stack rules documented and enforced in 5+ critical paths
- Failure-mode registry established with at least 20 tagged failure points
- 0 route resolution errors in staging

**Status**: BLOCKED — requires immediate priority.  
**Dependencies**: None (foundation layer).

---

### MP-1A: Frontline Operating Convergence
**Purpose**: Deliver integrated shop-floor, scheduling, inventory, and job orchestration.

**Core Work**:
- Shell stability and nav mesh (resolve React routing edge cases)
- Jobs module: list, detail, create, dispatch to machines
- Scheduling surface: calendar view, task assignment, resource allocation
- Inventory integration: material levels, tool tracking, stock deduction
- Shop floor display: machine status, job progress, alarm aggregation
- Dispatcher->Engine wiring for all shop-floor operations (120+ engines)

**CONVERGE Binding**: CONVERGE Phase 2 (Pipeline Hardening, sessions 2-1..2-10) executes within MP-1A. Targets: pipeline stages 21 -> 27 (dual SAFETY gates, SECONDARY_OPS, SCHEDULING, OMEGA_GATE, MAGAZINE_LAYOUT), scientificMath actions 5 -> 12.

**Handoff Protocol**: Claude builds backend routes/persistence/dispatcher wiring first. Codex swaps frontend fixture providers for live backend after contracts land. Serial handoff, not parallel.

**Exit Gate Criteria**:
- Jobs CRUD fully wired (backend -> frontend, no fixtures)
- Scheduling calendar functional with real data
- Inventory queries return live material/tool levels
- Shop floor display updates in < 2 sec (proof: timing test)
- No route orphans, 0 console errors on shop floor pages
- Wiring score >= 0.70 for L2 engines in shop-floor domain

**Status**: IN PROGRESS  
**Dependencies**: MP-0 must complete before full integration.

---

### MP-1B: Commercial/Business Convergence
**Purpose**: Unify messages, billing, customer portal, and hot jobs.

**Core Work**:
- Messages module: inbox, reply, attachment support, real-time push
- Hot Jobs: live bid tracking, customer inquiry response, fulfillment status
- Billing surface: invoice generation, payment capture, ledger integration
- Customer portal: order history, quote requests, status tracking
- Notifications: websocket subscribers for job updates, payments, messages

**CONVERGE Binding**: CONVERGE Phase 2B (Business & Finance, sessions 2B-1..2B-4) executes within MP-1B. Targets: 31 existing engines wired (safety, quality, business, finance, physics). GL, invoicing, ROI, and quoting secondary ops.

**Exit Gate Criteria**:
- messages/hotJobs fully wired to backend (no fixtures)
- Billing produces correct invoices (proof: 10 invoice samples)
- Customer portal displays real orders and quotes
- Websocket connections stable for >= 1 hour under moderate load
- 0 orphaned endpoints in commercial domain
- Payment flow tested end-to-end (non-production gate)

**Status**: BLOCKED on MP-1A completion + MP-0  
**Dependencies**: MP-0 (routing), MP-1A (job data flow).

---

### MP-2: Realtime Cross-Desk State
**Purpose**: Establish websocket fanout and event aggregation to synchronize state.

**Core Work**:
- Websocket server: subscribe/broadcast for 8+ event types
- Event fanout: reliable delivery to subscribed clients
- State reconciliation: conflict resolution for concurrent updates
- Dashboard sync: shop floor, commercial, and management views update atomically
- Presence tracking: who's online, what they're viewing

**CONVERGE Binding**: CONVERGE Phase 3 (Compute Spine, sessions 3-1..3-4) and Phase 4 (Integration Mesh, sessions 4-1..4-5) execute within MP-2. Targets: 6 new engines (FormulaDAG, ComputeChain, ParametricSweep, OnlineTaylorCalibration, MultiFidelity, CostCalibration).

**Exit Gate Criteria**:
- Websocket connections stable, < 500ms latency, 0 dropped messages (proof: 1-hour load test)
- 8 event types broadcast correctly to all subscribers
- Concurrent edit conflict resolved correctly (proof: 20 concurrent scenarios)
- Dashboard views synchronize within 1 sec of state change
- Scaling proof for 50+ concurrent users

**Status**: PENDING  
**Dependencies**: MP-1A and MP-1B both converged.

---

### MP-3: Business Operating Completeness
**Purpose**: Integrate accounting, legal compliance, and customer service.

**Core Work**:
- Accounting: GL ledger, accounts reconciliation, P&L reporting
- Legal: contract templates, SLA tracking, compliance audit trail
- Customer Service: ticket system, SLA response times, satisfaction metrics
- Reporting: KPI dashboards, financial summaries, compliance status
- Audit trail: immutable log of all business transactions

**CONVERGE Binding**: CONVERGE Phase 5 (Forward Platform, sessions 5-1..5-7) executes within MP-3.

**Exit Gate Criteria**:
- GL reconciles with all payment transactions (proof: month-end close)
- Legal audit trail complete for 100% of contracts
- Customer service tickets tracked and resolved with SLA metrics
- Compliance reporting produces audit-ready statements
- Dashboard reports generated without error

**Status**: PENDING  
**Dependencies**: MP-2 (realtime state) complete, websocket stable.

---

### MP-4: Simulation Readiness Gate
**Purpose**: Verify all Main Path work integrates correctly.

**Core Work**:
- End-to-end integration tests: job creation through fulfillment
- Load testing: 50+ concurrent users, 100+ simultaneous jobs
- Data integrity verification: consistency across 10,000+ transactions
- Fallback activation: test all failure modes and recovery paths
- Wiring audit: verify 0 orphaned endpoints, 0 fixture dependencies
- Performance baseline: latency, throughput, resource utilization

**CONVERGE Binding**: CONVERGE Phase 6 (Convergence Gate, sessions 6-1..6-2) is the CONVERGE-side gate for MP-4 readiness.

**Exit Gate Criteria**:
- All integration tests pass (50+ test scenarios)
- System sustains 50+ users, 200+ ops/sec, < 2 sec p95 latency
- 0 data corruption incidents across full test run
- All failure modes gracefully recover
- 100% of endpoints wired to real services
- Wiring score >= 0.85 across all layers

**Status**: PENDING  
**Dependencies**: MP-0, MP-1A, MP-1B, MP-2, MP-3 all complete.

---

## Scrutiny Gap Sessions (v24 3-EXT — CRITICAL)

These sessions were added during v24's 23-agent, 3-round scrutiny pass. Full definitions: v24 lines 4707-5173. They gate Phase 4 entry.

| Session | Domain | Finding | Impact |
|---------|--------|---------|--------|
| 3-7 | Thermal-Wear-Force-Finish Coupling | Force/temp/wear computed independently; should be coupled chain | HIGH |
| 3-8 | Per-Stage Uncertainty + SPC Wiring | 12 quality engines exist, 0 wired to dispatchers | HIGH |
| 3-9 | Cross-Material Validation | Material-specific test coverage gaps | HIGH |
| 3-EXT-THERM | Thermal Expansion Compensation | Machine drift ~0.005mm/hr, workpiece growth 10-50um. 2 engines exist, 0 wired | CRITICAL |
| 3-EXT-PROBE | In-Process Probing | 4 probing engines exist, 0 wired to any pipeline | CRITICAL |
| 3-EXT-PPAP | PPAP/FMEA/Control Plan | IATF 16949/AS9100 compliance requires PPAP package, FMEA, control plans | CRITICAL |
| 3-EXT-GCODE | G-Code Output Completeness | Machinist + CNC programmer scrutiny: output gaps in generated programs | CRITICAL |

**Dependency**: 3-EXT sessions gate Phase 4 entry (v24 line 5173).  
**Owner**: Claude (backend).

---

## Side Quest A: Auto Generation + Auto Wiring (SQ-A)

**Purpose**: Autonomous code generation and wiring to accelerate remaining engine/skill layers.

**Scope**: 3 child roadmaps (AUTO-BP, AUTO-DEV, AUTO-HARD — see Child Roadmap Index)

### SQ-A-CORE: Infrastructure (COMPLETE)
AUTO-0 through AUTO-7 completed 2026-03-30. Quality scoring, auto-wiring, auto-scaffolding, test generation, quality dashboard all operational.

### SQ-A-SCALE: Volume Application (QUEUED)
- AG-1: Engine boilerplate generation (prototype -> 50+ engines)
- AG-2: Dispatcher wiring automation (auto-connect 100+ engines)
- AG-3: API route generation (auto-scaffold 60+ routes from schema)
- AG-4: Frontend hook generation (auto-create API consumers)
- AG-5: Test generation (unit, integration for all generated code)
- AG-6: Quality scoring automation (wiring audit per engine)
- AG-7: Skill scaffolding (create 200+ skill templates)

**Entry Gate**: MP-1A stable (routing infrastructure operational).  
**Exit Gate**: 100+ engines generated and auto-wired with >= 0.75 quality score, codegen validated on 5 different domains.  
**Status**: SQ-A-CORE COMPLETE, SQ-A-SCALE QUEUED  
**Dependencies**: MP-1A (routing infrastructure).

---

## Side Quest B: Learning Pipeline (SQ-B)

**Purpose**: PDF, video, and handbook intelligence for tribal knowledge propagation.

**Scope**: 3 child roadmaps (RLH, TKP, HBK — see Child Roadmap Index)

**Entry Task**: SQ2 Resource Learning Census (ACTIVE — inventorying PDF, video, handbook, course, catalog, simulation assets across active repo, archive, and Box storage). SQ2-0-CENSUS and SQ2-1-PDF already completed.

**Parallel Sub-Tasks**:
- LR-1: PDF ingestion (parse technical docs, index by domain)
- LR-2: Video transcription & indexing (CAM/CNC procedural content)
- LR-3: Handbook intelligence (tribal tips to searchable knowledge graph)
- LR-4: Expert Q&A (chatbot trained on handbook + videos)
- LR-5: Learning pathways (auto-suggest learning sequences by skill level)

**Canonical Rule** (from Tribal Knowledge Propagation overlay): No tribal machining knowledge should remain trapped in one engine, one page, one shop, or one terminal. All meaningful learned data must normalize once, route through canonical contracts, and reach all relevant consumers.

**Entry Gate**: MP-1A complete (job data stable).  
**Exit Gate**: 1,000+ documents indexed, 100+ videos processed, Q&A chatbot answers 90%+ of skill-related queries.  
**Status**: QUEUED (census active)  
**Dependencies**: MP-1A (scheduling stability).

---

## Side Quest C: Database & Corpus Hardening (SQ-C)

**Purpose**: Fortify data integrity, backup recovery, and corpus consistency.

**Core Work**:
- DB-1: Schema validation (ensure 100% of rows conform to latest schema)
- DB-2: Backup & recovery (3-2-1 strategy: 3 copies, 2 media types, 1 offsite)
- DB-3: Migration playbooks (upgrade paths for 5+ schema versions)
- DB-4: Corruption detection (CRC checks, consistency audits on startup)
- DB-5: Performance tuning (index analysis, query optimization, cache strategy)

**Entry Gate**: MP-2 complete (high transaction volume expected).  
**Exit Gate**: 100% corpus validated, recovery tested (restore from backup in < 30 min), 0 schema violations.  
**Status**: QUEUED  
**Dependencies**: MP-2 (realtime state volume).

---

## Side Quest D: Business Platform Hardening (SQ-D)

**Purpose**: Strengthen commercial features, payment security, and compliance.

**Core Work**:
- BP-0: Payment gateway hardening (PCI compliance, encryption, fraud detection)
- BP-1: Contract lifecycle (versioning, signature tracking, expiry alerts)
- BP-2: SLA enforcement (automated escalation, penalty calculation, customer notification)
- BP-3: Financial audit trail (immutable ledger, cryptographic proof)
- BP-4: Role-based access control (admin, manager, user, customer tiers)
- BP-5: Compliance reporting (GDPR, SOX, industry-specific regs)
- BP-6: Incident logging (security events, access logs, change audit)

**Entry Gate**: MP-3 complete (business operations live).  
**Exit Gate**: PCI compliance certification, audit-ready financials, 0 data breaches in 90-day test, RBAC enforced on 100% of endpoints.  
**Status**: QUEUED  
**Dependencies**: MP-3 (business completeness).

---

## Machine Domain Side Quests

**Authority**: Eight machine-specific roadmaps feed Main Path Phase 2 after convergence gates.

### Release Tiers (ship incrementally, not all at once)

**Tier 1 — Ship After MP-1A** (production-ready, do NOT wait for MP-4):

| ID | Machine | Tests | Status | Roadmap |
|----|---------|-------|--------|---------|
| SQ-M8 | Wire-EDM | 249/249 passing | PRODUCTION-READY | WIRE-EDM-COMPREHENSIVE-ROADMAP.md |
| SQ-M1 | Lathe | 172/172 passing | GREEN LIGHT | LATHE-COMPREHENSIVE-ROADMAP.md |

**Tier 2 — Ship After v24 Phase Completion + MP-1A**:

| ID | Machine | Tests | v24 Phase | Milestones | Roadmap |
|----|---------|-------|-----------|------------|---------|
| SQ-M2 | Milling | 0 (in progress) | Phase 6 | 11 | MILLING-COMPREHENSIVE-ROADMAP.md |
| SQ-M4 | Five-Axis | 0 | Phase 7 | 12 | FIVE-AXIS-COMPREHENSIVE-ROADMAP.md |
| SQ-M5 | Grinding | 0 | Phase 9 | 8 | GRINDING-COMPREHENSIVE-ROADMAP.md |
| SQ-M6 | Laser | 0 | Phase 11A | 8 | LASER-COMPREHENSIVE-ROADMAP.md |
| SQ-M7 | Waterjet | 0 | Phase 11B | 8 | WATERJET-COMPREHENSIVE-ROADMAP.md |

**Tier 3 — Needs Debug First**:

| ID | Machine | Issue | Milestones | Roadmap |
|----|---------|-------|------------|---------|
| SQ-M3 | Mill-Turn | Pipeline broken, no G-code output | 12 | MILL-TURN-COMPREHENSIVE-ROADMAP.md |

---

## Revenue & Shipping Milestones

Source: v24 lines 6831-6839. Ship incrementally per machine type — do NOT wait for all phases.

| Gate | Trigger | Revenue Action |
|------|---------|----------------|
| After Phase 0-B+0-C | Basic program generation works | INTERNAL TESTING only |
| After MP-1A stable | Physics-backed quoting operational | QUOTE CUSTOMERS (Wire-EDM + Lathe ready) |
| After v24 Phase 5 | Turning pipeline complete | SHIP TURNING PROGRAMS |
| After v24 Phase 6 | Milling pipeline complete | SHIP MILLING PROGRAMS |
| After v24 Phase 7 | 5-Axis pipeline complete | SHIP 5-AXIS PROGRAMS |
| Each subsequent phase | Machine-type pipeline done | Ship that type the week it completes |

**Rule**: DO NOT wait for MP-4 before any revenue. Ship production-ready pipelines the week their exit gate passes.

---

## Web Wiring Audit

**Source**: audits/web-wiring-roadmap.md (68 tasks, 9 sprints)  
**Baseline**: 50 routes audited, 47 load (94%), 0 fully live, 3 broken (fixed 2026-03-30)

| Tier | Tasks | Scope | MP Mapping | Status |
|------|-------|-------|------------|--------|
| 0: Critical Fixes | 3 | Broken pages (secondary-ops, quote-analytics, parts-library) | MP-0 | FIXED |
| 1: Global Infra | 4 | Billing auth, WebSocket, viewer scenes, CORS | MP-0 | Mostly Fixed |
| 2: Core Machining | 14 | Calculator, dashboard, alarms, toolpath, PPG, what-if | MP-1A | In Progress |
| 3: Quotes & Planning | 13 | Quote builder, blueprint-quote, batch-planning, scheduling | MP-1B | Planned |
| 4: Shop & ERP | 22 | Jobs, parts, messages, portal, inventory, GL, payroll | MP-1B/MP-2 | Planned |
| 5: Knowledge | 6 | Learning, documents, assessment, academy, knowledge search | SQ-B | Planned |
| 6: Employee Portal | 3 | Employee shell, scoped views | MP-2 | Planned |
| 7: Polish | 3 | Recharts charts, data tables, real-time indicators | MP-3 | Planned |

---

## QA Track

**Remaining Milestones**: QA-MS10 through QA-MS14 (5 gates)

| Gate | Scope | Start Gate | Status |
|------|-------|------------|--------|
| QA-MS10 | Hooks layer integration (L4 complete, verify L5 consumers) | START NOW (L4 complete) | Ready |
| QA-MS11 | Skills layer validation (201/269 skills, validate continuously) | START NOW | Ready |
| QA-MS12 | End-to-end integration (all layers 0-5 in production simulation) | After MP-2 stable | Pending |
| QA-MS13 | Performance benchmark (establish baseline, measure vs. target) | After MP-3 stable | Pending |
| QA-MS14 | Sign-off & release readiness (final audit, production gate) | Gates MP-4 | Pending |

**Execution**: QA-MS10 and QA-MS11 start immediately (no MP-3 dependency). QA-MS12-14 run parallel with MP-3/SQ work. QA-MS14 gates MP-4 sign-off.

---

## CONVERGE Plan Integration

**Source**: state/shared/memory/project_converge_roadmap.md  
**Status**: APPROVED | **Sessions**: 40 | **Estimated**: 100-130 hours

CONVERGE phases are absorbed into the Main Path (not a separate authority):

| CONVERGE Phase | Sessions | Target Version | Maps to MP |
|----------------|----------|----------------|------------|
| 1: Foundation Fix | 1-1..1-5 | v8.3.0 | MP-0 |
| 2: Pipeline Hardening | 2-1..2-10 | v8.4.0 | MP-1A |
| 2B: Business & Finance | 2B-1..2B-4 | v8.4.1 | MP-1B |
| 3: Compute Spine | 3-1..3-4 | v8.5.0 | MP-2 |
| 4: Integration Mesh | 4-1..4-5 | — | MP-2/MP-3 |
| 5: Forward Platform | 5-1..5-7 | — | MP-3 |
| 6: Convergence Gate | 6-1..6-2 | v9.0.0 | MP-4 |

**Key Metrics**:
- Pipeline stages: 21 -> 27 (dual SAFETY gates, SECONDARY_OPS, SCHEDULING, OMEGA_GATE, MAGAZINE_LAYOUT)
- scientificMath actions: 5 -> 12
- Existing engines wired: 31 (safety, quality, business, finance, physics)
- New engines created: 6 (FormulaDAG, ComputeChain, ParametricSweep, OnlineTaylorCalibration, MultiFidelity, CostCalibration)
- Hook path errors: 44+ -> 0

---

## Extended Phases (v24 Phases 14-21 — Post-MP-4)

These phases follow Main Path and Machine Domain completion. Full detail lives in v24 and the linked design specs. Execute ONLY after MP-4 and relevant SQ-M gates pass.

### Phase Summary

| Phase | Track ID | Name | Units | Sessions | Design Spec | Owner |
|-------|----------|------|-------|----------|-------------|-------|
| 14 | GAP/AGEN | Future Processes + Agentic | ~30 | ~8 | v24 lines 7688-7700 | Claude |
| 15 | EIGC | Engine Integrity Gap Closure | 44 | ~15 | engine-integrity-gap-closure-roadmap-design.md | Claude |
| 16 | ACP | Automation Control Plane | 43 | ~12 | mcp-automation-control-plane-roadmap-design.md | Claude |
| 17 | MXU+APP | Max Utilization + Product Surface | 66 | ~18 | mcp-max-utilization + app-surface-legitimacy specs | Claude+Codex |
| 18 | ULT | Ultimate Shop OS | 30 | ~10 | ULTIMATE-SHOP-OS-roadmap.md (ULT-MS0..MS5) | Claude+Codex |
| 19 | BENCH | Benchmark + Production Gate | 37 | ~10 | PROD-GATE milestone | Claude |
| 20 | CAMX | CAM System Infrastructure | ~220 | ~35 | v24 Phases 5-11 per-machine | Claude |
| 21 | MINOR | Gaps + Agentic + Future | ~30 | ~8 | v24 Phase infinity | Claude |
| 22 | F360 | Fusion 360 Desktop Control + Deep Integration | 24 | ~20 | fusion360-prism-addin-design.md | Claude+Codex |
| inf | SVI | SVI -> 100% Gap-Fill | TBD | TBD | /rgs-sync driven | Both |
| | **TOTAL POST-MP-4** | | **~524** | **~136** | | |

### Phase 14: Future Processes (Post-MVP)

| Process | Engine | Description |
|---------|--------|-------------|
| Plasma | PlasmaProgramAssemblerEngine | CNC plasma tables |
| Press Brake | PressBrakeProgramEngine | Bend sequence optimization |
| Additive | AdditiveBuildParameterEngine | FDM/SLM/SLS build parameters |
| DMIS | DMISInspectionProgramEngine | CMM offline programming |
| Robotic Welding | RoboticWeldProgramEngine | Offline robot welding paths |
| MES Adapter | — | ISA-95/B2MML protocol |
| Shop Floor Data | — | Barcode/RFID collection |
| Multi-Site ERP | — | Multi-plant model |
| FMEA | — | Reliability engineering from pipeline data |
| Agentic Sprint 5 | — | Embedding infrastructure (~3,000 LOC) |
| Agentic Sprint 6 | — | Multi-agent architecture (~8,200 LOC) |

### Superpower Design Spec Bindings

| Spec (in mcp-server/docs/superpowers/specs/) | Track | Phase | Milestones |
|-----------------------------------------------|-------|-------|------------|
| 2026-03-15-quality-synergy-roadmap-design.md | QS | Pre-15 | QS-MS0..QS-MS6 |
| 2026-03-25-engine-integrity-gap-closure-roadmap-design.md | EIGC | 15 | EIGC-MS0A..EIGC-MS11 |
| 2026-03-25-mcp-automation-control-plane-roadmap-design.md | ACP | 16 | ACP-MS0A..ACP-MS8 |
| 2026-03-25-mcp-max-utilization-roadmap-design.md | MXU | 17 | MXU-MS0A..MXU-MS11 |
| 2026-03-25-prism-app-surface-legitimacy-roadmap-design.md | PASL | 17 | PASL-MS0A..PASL-MS8 |
| 2026-03-25-prism-capability-conversion-roadmap-design.md | PCCA | 17 | PCCA-MS0A..PCCA-MS8 |
| 2026-03-20-prism-max-roadmap-design.md | MAX | Cross-phase | PRISM-MAX-roadmap.json |
| 2026-03-15-fusion360-prism-addin-design.md | F360 | 22 | F360-MS0..F360-MS5 |

**Note**: PASL and PCCA milestone JSONs do not yet exist in data/milestones/. Action required: generate from design specs.

---

## Milestone Track Registry

Source: mcp-server/data/roadmap-index.json (v8.2.0, 287 milestones, 189 complete)  
Envelopes: mcp-server/data/milestones/{TRACK}-{MSN}.json

| Track | Name | Milestones | Complete | Phase Binding |
|-------|------|------------|----------|---------------|
| S0-S4 | SFC Foundation | 8 | 8 | Pre-MP-0 |
| L0-L10 | Layer Architecture | 28 | varies | MP-0..MP-4 |
| QA | Quality Assurance | 15 (MS0..MS14) | 10 | QA Track |
| QS | Quality Synergy | 7 (MS0..MS6) | varies | Pre-Phase 15 |
| CC | Core Compute | 13 (MS0..MS11) | varies | CONVERGE |
| CCM | Compute Extended | 18 (MS0..MS17) | varies | CONVERGE |
| EIGC | Engine Integrity | 12 (MS0A..MS11) | 0 | Phase 15 |
| ACP | Automation Control | 10 (MS0A..MS8) | 0 | Phase 16 |
| MXU | Max Utilization | 13 (MS0A..MS11) | 0 | Phase 17 |
| ULT | Shop OS | 6 (MS0..MS5) | 0 | Phase 18 |
| HBK | Handbook Intel | 12 (MS0..MS11) | 0 | SQ-B |
| PP | Post Processor | 9 (MS0..MS8) | varies | Phase 20 |
| CAMX | CAM Infrastructure | 23 (MS0..MS22) | varies | Phase 20 |
| PROD-GATE | Production Gate | 1 | 0 | Phase 19 |
| F360 | Fusion 360 Integration | 6 (MS0..MS5) | 0 | Phase 22 |

**Missing milestone envelopes** (design specs exist, no JSON):
- PASL-MS0A..PASL-MS8 (App Surface Legitimacy)
- PCCA-MS0A..PCCA-MS8 (Capability Conversion)

---

## MCP Full Utilization Protocol (MANDATORY — Every Session)

Every roadmap session MUST use the MCP server's full capabilities. Current utilization is ~3% of 576+ available actions. This protocol raises it to 40%+ by mandating these calls at every session lifecycle stage.

### Session Start (before any code work)
```
1. prism_session:context_boot          — Full context hydration from prior session state
2. prism_session:dispatcher_map        — Discover all available dispatchers + actions (live count)
3. prism_session:memory_recall         — Load cross-session knowledge (tribal tips, formulas, decisions)
4. prism_session:system_snapshot       — Capture baseline system state before changes
5. prism_session:action_search "<goal>"— Find the right MCP action for this session's work
```

### During Work (every 5-10 tool calls)
```
6. prism_session:auto_checkpoint       — Save incremental state (prevents loss on crash/compact)
7. prism_session:action_search "<need>"— Route intent to optimal dispatcher action (not manual search)
8. prism_session:tool_route_best       — Let MCP recommend the best tool for current task
9. prism_session:wip_capture           — Snapshot work-in-progress at natural breakpoints
```

### Session End / Pre-Compact
```
10. prism_session:memory_save          — Persist cross-session knowledge for next session
11. prism_session:system_snapshot      — Capture post-work state (diff against baseline)
12. prism_session:checkpoint_enhanced  — Detailed checkpoint with metadata + artifacts list
```

### Skill Utilization (use these, don't reinvent)
```
/forge-engines    — Discover existing engines before building new
/forge-wiring     — Verify import + call + result chain
/prism-review     — Multi-role code review (physics, wiring, test agents)
/trace            — Follow wiring chain end-to-end
/physics-verify   — Cross-pipeline physics consistency
/forge-triple     — Engine + MCP action + skill + hook (complete capability)
/calibrate        — Live physics calibration from measured data
/navigate         — Zero-IO file routing (no Glob/Grep needed)
/playbook         — Machining best practice advisor (296 rules)
/scrutinize       — Standalone code quality review
/test             — Smart test runner (affected files only)
/action-search    — Find any dispatcher action by keyword
/action-help      — Quick parameter lookup for any action
```

### Plugin & Extension Utilization
```
Vitest MCP:       mcp__vitest__run_tests, analyze_coverage, list_tests
ESLint MCP:       mcp__eslint__lint-files (TypeScript quality gate)
Taskmaster:       mcp__taskmaster-ai__get_tasks, next_task, set_task_status
Codebase Memory:  codebase-memory-mcp search_graph, trace_call_path
Excel MCP:        mcp__excel__excel_read_sheet (for data import/validation)
```

### Auto-Firing Systems (hooks — these fire automatically, don't disable)
```
PreToolUse:       review-gate.sh (blocks edits without /prism-review after 3 engine edits)
PostToolUse:      compact-counter.mjs (tracks context pressure, warns at 50/75/100 calls)
PostToolUse:      enforce-auto-compact.py (blocks at 35 edits until /compact)
PostCompact:      post-compact-enhanced.mjs (Feature Cascade — writes SESSION_ARTIFACTS.json)
SessionStart:     session-start-compact.mjs (reads Feature Cascade, reports live system counts)
SessionStart:     svi-refresh.mjs (updates SVI/Psi metrics)
Stop:             compaction-survival.mjs (writes survival state for next session)
```

### Context Retention Protocol
```
1. Feature Cascade: SESSION_ARTIFACTS.json tracks new engines/hooks/skills per session
2. Compaction Survival: .compaction-survival.md preserves critical state across compaction
3. HANDOFF.md: Per-agent state written on stop, read on startup
4. SVI-compact.md: System health snapshot auto-generated pre-compact
5. MEMORY.md: Shared memory auto-synced across sessions/machines
```

**Enforcement**: Any session that does not call context_boot + memory_recall at start and memory_save at end is NON-COMPLIANT. The PostCompact hook verifies Feature Cascade artifacts exist.

---

## Governance Rules (Compact Summary)

### Proof Stack (Input -> Transform -> Output)
Every critical path must document:
1. **Input proof**: What data/state must be present before execution
2. **Transform proof**: How transformation preserves invariants
3. **Output proof**: Verify result matches proof spec before commit

### Failure-Mode Governance
- Tag all known failure points in code/docs
- Specify recovery: retry, fallback, escalation
- Test failure scenario at least once per release
- Maintain failure registry (>= 20 modes, 0 untested)

### Wiring Score & Quality Rules
- Wiring score: % of endpoints with real backend services (target >= 0.85)
- Quality score: per-engine (proof, test coverage, docs)
- Fixture = temporary; must migrate to real service before MP-4
- Orphaned endpoint = route with no implementation; gate MP-4 on 0 orphans

---

## Sequencing Rules

### Revised Dependency Graph

```
MP-0 (foundation) ─────────────────────────────────────────────────┐
  │                                                                 │
  ├──> MP-1A (shop floor) ──────────────────────────────────┐      │
  │      │ [Claude backend first, then Codex frontend]       │      │
  │      │                                                    │      │
  │      ├──> SQ-M1 (Lathe) SHIP ──────────────> REVENUE    │      │
  │      ├──> SQ-M8 (Wire-EDM) SHIP ──────────> REVENUE     │      │
  │      ├──> SQ-B (learning) — gate: MP-1A only             │      │
  │      ├──> SQ-A-SCALE (volume auto-wiring)                │      │
  │      │                                                    │      │
  │      └──> MP-1B (commercial) ──────────────────┐         │      │
  │             │                                    │         │      │
  │             └──> MP-2 (realtime) ──────────┐    │         │      │
  │                    │                         │    │         │      │
  │                    ├──> SQ-C (DB hardening)  │    │         │      │
  │                    │                         │    │         │      │
  │                    └──> MP-3 (business ops) ─┤    │         │      │
  │                           │                   │    │         │      │
  │                           ├──> SQ-D (platform)│    │         │      │
  │                           │                   │    │         │      │
  │                           └──> MP-4 (sim) ────┘    │         │      │
  │                                  │                  │         │      │
  │                                  ├──> Phases 14-21  │         │      │
  │                                  └──> SQ-M2-7       │         │      │
  │                                                     │         │      │
  QA-MS10 ──> START NOW ────────────────────────────────┘         │
  QA-MS11 ──> START NOW ──────────────────────────────────────────┘
  QA-MS12 ──> after MP-2
  QA-MS13 ──> after MP-3
  QA-MS14 ──> gates MP-4

CONVERGE: absorbed into MP-0..MP-4 (not separate authority)
SQ-A-CORE (AUTO-0..AUTO-7): ALREADY COMPLETE
```

### Strict Ordering

```
1.  MP-0 (foundation) — MUST complete before any other work
2.  MP-1A (shop floor) — parallel with MP-0 final validation
3.  SQ-M1 + SQ-M8 — ship after MP-1A (production-ready, don't wait for MP-4)
4.  SQ-B (learning) — after MP-1A stable (no SQ-A dependency)
5.  SQ-A-SCALE (auto-wiring) — after MP-1A stable
6.  MP-1B (commercial) — after MP-1A stable
7.  MP-2 (realtime) — after MP-1A + MP-1B
8.  SQ-C (DB hardening) — after MP-2 (async, parallel with MP-3)
9.  MP-3 (business ops) — after MP-2 stable
10. SQ-D (platform hardening) — after MP-3 (async, parallel with QA-MS12-14)
11. MP-4 (simulation readiness) — gate: MP-0-3 + SQ-A/B/C/D + QA-MS14 complete
12. SQ-M2-7 (remaining machines) — after their v24 phase + MP-1A, parallel
13. Phases 14-21 — post-MP-4, ~500 units, ~116 sessions
14. Phase infinity — SVI -> 100% gap-fill via /rgs-sync
```

### QA Track Scheduling

```
QA-MS10 (hooks):    START NOW — L4 complete, L5 at 201/269
QA-MS11 (skills):   START NOW — validate continuously as skills land
QA-MS12 (e2e):      after MP-2 stable — needs realtime state
QA-MS13 (perf):     after MP-3 stable — needs business load
QA-MS14 (sign-off): gates MP-4 — final gate (unchanged)
```

---

## Collaboration Locks

| Domain | Claude (backend) | Codex (frontend) |
|--------|-----------------|-------------------|
| MP-0 | Route fixes, billing mount, proof-stack | — |
| MP-1A | Backend routes, persistence, dispatchers (FIRST) | Provider swap, page wiring, UX (AFTER contracts) |
| MP-1B | Engine wiring, event contracts | Messages, billing UI, portal |
| MP-2 | Websocket server, event fanout | Dashboard sync, presence UI |
| MP-3 | Accounting, legal, customer service engines | Reporting dashboards |
| SQ-A | Codegen, wiring automation | — |
| SQ-B | Knowledge extraction, registry promotion | Learning UI, Q&A chatbot |
| SQ-C | Schema validation, backup, migration | — |
| SQ-D | Payment hardening, RBAC, compliance | — |

**Gate**: Finish current tranche (MP-1B frontend wiring) before expanding to new domains.

---

## v24 Total Session Count

Source: v24 lines 7750-7781.

| Phase | Description | Units | Sessions | Owner |
|-------|------------|-------|----------|-------|
| 0-PRE..0-D | System Audit through Registry Wiring | 47 | 22 | Claude |
| Phase 1-4 | Knowledge through Simulation | 49 | 18 | Claude |
| Sessions 5-X..6-X | ERP + Backend Platform | 56 | 20 | Claude |
| Phase 5-11 | Per-Machine Pipelines (Turning through Waterjet) | 699 | ~103 | Claude |
| Phase 12-13 | Exhaustive Testing + Final Wiring | 98 | ~14 | Claude |
| Phase 14-21 | Future Processes through Gaps | ~500 | ~116 | Both |
| Phase inf | SVI -> 100% | TBD | TBD | Both |
| **TOTAL** | **ALL TRACKS** | **~1,543** | **~285** | **Both** |

---

## Obsolete Files (Do Not Execute)

- CAMX-RESTRUCTURED-ROADMAP-v17.md through v23.md (all consolidated into v24)

## Reference Files (Information Only)

- AGENTIC-PATTERNS-ROADMAP.md (patterns research)
- CAMX-PIPELINE-ENGINE-MATRIX.md (architecture reference)
- CAMX-TOOL-SELECTION-GUIDE.md (tool trade-off analysis)
- PHASE_R5.md through PHASE_R15.md (historical phase definitions)
- ULTIMATE-PRISM-ROADMAP-v25.md (v25 planning sketch)

---

## How to Use This Document

1. **For Current Work**: Follow Main Path MP-0 -> MP-1A -> MP-1B -> MP-2 -> MP-3 -> MP-4 in order.
2. **For Dependencies**: Check each section's "Dependencies" field; gate must be satisfied before entry.
3. **For Gating**: Verify "Exit Gate Criteria" complete before advancing to next section.
4. **For Revenue**: Ship production-ready machine pipelines after MP-1A, not after MP-4.
5. **For Post-MP-4**: Reference Extended Phases section for ~500 units of remaining work.
6. **For Child Detail**: Follow links in Child Roadmap Index to domain-specific documents.
7. **For Scope Creep Prevention**: Any request outside current MP stage or assigned SQ belongs in v26 planning.
8. **For Governance**: Apply Proof Stack, Failure-Mode, and Wiring Score rules to all new work.

---

## Status Tracking

**Last Update**: 2026-03-30  
**Next Review**: Weekly (Monday 9 AM local time)  
**Owner**: Core Team Lead  
**Escalation**: If any Main Path stage stalls > 3 days, escalate blockers immediately.

---

**END OF UNIFIED ROADMAP**
