# ROLE / MODEL / EFFORT MATRIX — ALL PHASES
# This is the canonical reference for every milestone assignment.
# Applied to roadmap v14.5 across all 12 phase docs.
#
# MODEL KEY:
#   Haiku  = Bulk ops, file scanning, grep, mechanical transforms, data extraction
#   Sonnet = Implementation, test writing, script creation, wiring, validation
#   Opus   = Architecture design, safety-critical review, cross-system integration, schema design
#
# EFFORT KEY:
#   XS = 1-3 calls | S = 4-8 calls | M = 8-15 calls | L = 15-25 calls | XL = 25-40 calls
#
# ROLE KEY:
#   Context Engineer, Data Architect, Safety Engineer, Systems Architect,
#   Platform Engineer, Production Engineer, Intelligence Architect,
#   UX Architect, Integration Engineer, Research Architect, Product Manager
#
# RULE: Every milestone MUST have exactly one Model assignment (or Model sequence for
#       multi-step milestones), one Role, one Effort rating, and Session estimate.

## ═══════════════════════════════════════════════════════════════
## PHASE DA: DEVELOPMENT ACCELERATION (11 milestones)
## ═══════════════════════════════════════════════════════════════

DA-MS0: Context Engineering Audit + Optimization + CLAUDE.md Hierarchy
  Role: Context Engineer
  Model: Sonnet (audit + optimization) → Haiku (bulk anchor placement)
  Effort: M (10-15 calls)
  Sessions: 1-2
  Why: Audit requires judgment (Sonnet), anchor placement is mechanical (Haiku)

DA-MS1: Session Continuity + Subagents with Persistent Memory
  Role: Systems Architect
  Model: Opus (subagent architecture) → Sonnet (implementation + testing)
  Effort: L (15-20 calls)
  Sessions: 2
  Why: Subagent design is architectural (Opus), wiring is implementation (Sonnet)

DA-MS2: Skill/Script/Hook Utilization + Slash Commands + Skill Conversion
  Role: Context Engineer
  Model: Sonnet (skill conversion + command creation)
  Effort: L (15-20 calls)
  Sessions: 2
  Why: Mechanical but needs judgment for trigger design

DA-MS3: Manus/Ralph/Superpowers/Automation Optimization
  Role: Systems Architect
  Model: Opus (optimization strategy) → Sonnet (implementation)
  Effort: M (10-15 calls)
  Sessions: 1
  Why: Strategy needs Opus-level thinking, execution is Sonnet

DA-MS4: Deterministic Hook Configuration (Claude Code)
  Role: Systems Architect
  Model: Sonnet (hook configuration + testing)
  Effort: S (5-8 calls)
  Sessions: 0.5
  Why: Well-defined scope, implementation-level work

DA-MS5: QA Tooling + Context Optimization
  Role: Context Engineer
  Model: Sonnet (scripts) → Opus (protocol split analysis)
  Effort: L (15-20 calls)
  Sessions: 2
  Why: Scripts are Sonnet, but deciding what to split needs Opus judgment

DA-MS6: Hierarchical Index — Code + Data Branches
  Role: Data Architect
  Model: Opus (schema design) → Haiku (scanning) → Sonnet (extraction scripts)
  Effort: XL (25-35 calls)
  Sessions: 3
  Why: Schema is architectural, scanning is bulk, extraction needs implementation skill

DA-MS7: Session Knowledge System
  Role: Intelligence Architect
  Model: Opus (extraction protocol design) → Sonnet (implementation)
  Effort: L (15-20 calls)
  Sessions: 2
  Why: Protocol design is architectural, implementation is Sonnet

DA-MS8: Phase Gate + E2E Integration Test + Companion Assets
  Role: Systems Architect
  Model: Sonnet (test creation + execution) → Opus (gate review)
  Effort: M (10-15 calls)
  Sessions: 1
  Why: Testing is Sonnet, final gate approval needs Opus judgment

DA-MS9: Skill Atomization Infrastructure
  Role: Data Architect
  Model: Opus (schema design for SKILL_INDEX.json) → Sonnet (automation scripts)
  Effort: L (15-20 calls)
  Sessions: 2
  Why: Index schema is architectural, scripts are implementation

DA-MS10: Skill Atomization Pilot + Course Pilot
  Role: Data Architect
  Model: Haiku (bulk extraction) → Sonnet (quality review) → Opus (pattern validation)
  Effort: XL (25-40 calls)
  Sessions: 4
  Why: Extraction is bulk work, review needs judgment, pattern validation needs Opus


## ═══════════════════════════════════════════════════════════════
## PHASE R1: REGISTRY + DATA FOUNDATION (12 milestones)
## ═══════════════════════════════════════════════════════════════

R1-MS0 thru MS4: COMPLETE (reference only, no changes needed)

R1-MS4.5: Data Validation Pipeline
  Role: Data Architect
  Model: Sonnet (validation scripts + test harness)
  Effort: M (12 calls)
  Sessions: 1
  Why: Pipeline creation is implementation work, needs Sonnet judgment for edge cases

R1-MS5: Tool Schema Normalization + ToolIndex (T-0)
  Role: Data Architect
  Model: Opus (schema design) → Haiku (bulk file scanning) → Sonnet (normalization scripts)
  Effort: L (18 calls)
  Sessions: 2
  Why: 85-param schema is architectural, scanning 5,238 files is bulk, normalization needs skill

R1-MS6: Material Enrichment Completion (M-0)
  Role: Data Architect
  Model: Haiku (bulk file scanning + gap identification) → Sonnet (enrichment scripts)
  Effort: L (14 calls)
  Sessions: 1-2
  Why: Scanning 3,518 materials is bulk, enrichment logic needs implementation judgment

R1-MS7: Machine Field Population (MCH-0)
  Role: Data Architect
  Model: Haiku (bulk scanning) → Sonnet (normalization + controller family mapping)
  Effort: L (14 calls)
  Sessions: 1-2
  Why: Scanning is bulk, controller family logic needs Sonnet judgment

R1-MS8: Formula Registry + Dispatcher Wiring
  Role: Systems Architect
  Model: Opus (wiring architecture) → Sonnet (implementation + test creation)
  Effort: L (18 calls)
  Sessions: 2
  Why: Dispatcher wiring patterns are architectural, implementation is Sonnet

R1-MS9: Quality Metrics + Phase Gate
  Role: Safety Engineer
  Model: Sonnet (metric collection + test execution) → Opus (gate review + quality judgment)
  Effort: M (12 calls)
  Sessions: 1
  Why: Collection is Sonnet, safety gate requires Opus scrutiny

R1-MS10: Registry Optimization (Optional)
  Role: Data Architect
  Model: Sonnet (optimization + benchmarking)
  Effort: S (6 calls)
  Sessions: 0.5
  Why: Performance tuning, straightforward implementation

## ═══════════════════════════════════════════════════════════════
## PHASE R2: SAFETY + ENGINE VALIDATION (7 milestones)
## ═══════════════════════════════════════════════════════════════

R2-MS0: 50-Calc Test Matrix
  Role: Safety Engineer
  Model: Opus (test case design + golden value verification) → Sonnet (test harness creation)
  Effort: XL (25 calls)
  Sessions: 2
  Why: SAFETY-CRITICAL — golden values MUST be verified by Opus, harness by Sonnet

R2-MS1: Safety Engine Activation (29 Actions)
  Role: Safety Engineer
  Model: Opus (safety action review) → Sonnet (activation + wiring) → Opus (safety gate)
  Effort: XL (30 calls)
  Sessions: 2-3
  Why: SAFETY-CRITICAL — every action needs Opus review before and after activation

R2-MS1.5: Calculation Regression Suite
  Role: Safety Engineer
  Model: Opus (regression criteria design) → Sonnet (suite implementation)
  Effort: M (8 calls)
  Sessions: 1
  Why: Regression criteria are safety-critical (Opus), implementation is Sonnet

R2-MS2: AI-Generated Edge Cases
  Role: Safety Engineer
  Model: Opus (edge case generation — needs creative adversarial thinking)
  Effort: M (10 calls)
  Sessions: 1
  Why: Generating edge cases that could cause injuries requires Opus-level reasoning

R2-MS3: Manual Edge Cases + Fix Cycle
  Role: Safety Engineer
  Model: Opus (fix review — every fix to safety code needs Opus) → Sonnet (fix implementation)
  Effort: L (15 calls)
  Sessions: 1-2
  Why: SAFETY-CRITICAL — fixes to safety calculations cannot be Haiku/Sonnet-only

R2-MS4: Build Gate + Phase Completion
  Role: Safety Engineer
  Model: Opus (MANDATORY for safety phase gate — no exceptions)
  Effort: M (10 calls)
  Sessions: 1
  Why: SAFETY-CRITICAL phase gate. S(x)≥0.70 verification requires Opus.

R2-MS5: Uncertainty Quantification (Optional)
  Role: Safety Engineer
  Model: Opus (uncertainty propagation design) → Sonnet (implementation)
  Effort: M (8 calls)
  Sessions: 1
  Why: Mathematical uncertainty design is architectural, implementation is Sonnet

## ═══════════════════════════════════════════════════════════════
## PHASE R3: INTELLIGENCE + DATA CAMPAIGNS (7 milestones)
## ═══════════════════════════════════════════════════════════════

R3-MS0: Job Planner + Setup Sheet
  Role: Systems Architect
  Model: Opus (cross-system integration design) → Sonnet (implementation)
  Effort: L (14 calls)
  Sessions: 1-2
  Why: Job planner chains multiple dispatchers — Opus designs the coupling, Sonnet implements

R3-MS0.5: Formula Registry Integration
  Role: Systems Architect
  Model: Sonnet (wiring implementation) → Opus (integration validation)
  Effort: M (10 calls)
  Sessions: 1
  Why: Wiring is Sonnet-level, but cross-registry integration needs Opus validation

R3-MS1: Advanced Calculations
  Role: Safety Engineer
  Model: Opus (formula verification — mathematical correctness is safety-critical)
  Effort: M (12 calls)
  Sessions: 1
  Why: SAFETY-CRITICAL — advanced cutting calcs (wear models, chatter) need Opus verification

R3-MS2: Toolpath Intelligence
  Role: Intelligence Architect
  Model: Sonnet (strategy implementation) → Opus (strategy selection logic design)
  Effort: M (8 calls)
  Sessions: 1
  Why: Strategy selection is architectural, implementation is Sonnet

R3-MS3: Cross-System Intelligence
  Role: Intelligence Architect
  Model: Opus (cross-system chain design) → Sonnet (implementation)
  Effort: M (12 calls)
  Sessions: 1-2
  Why: Cross-system chains require architectural thinking (Opus)

R3-MS4: Data Enrichment Campaigns + Workholding + Alarms
  Role: Data Architect
  Model: Haiku (bulk data extraction) → Sonnet (enrichment scripts + validation)
  Effort: L (20 calls)
  Sessions: 2
  Why: Bulk extraction of alarm codes/workholding data is Haiku, scripts need Sonnet

R3-MS5: Phase Gate
  Role: Systems Architect
  Model: Sonnet (test execution) → Opus (gate review + integration quality)
  Effort: M (10 calls)
  Sessions: 1
  Why: Phase gate judgment requires Opus


## ═══════════════════════════════════════════════════════════════
## PHASE R4: ENTERPRISE + API LAYER (5 milestones)
## Stubs — expand at phase start via Brainstorm-to-Ship
## ═══════════════════════════════════════════════════════════════

R4-MS0: Multi-Tenant Isolation
  Role: Platform Engineer
  Model: Opus (security architecture) → Sonnet (implementation)
  Effort: L (18 calls)
  Sessions: 1-2
  Why: Security isolation is architectural, must be Opus-designed

R4-MS1: API Layer (REST/GraphQL)
  Role: Platform Engineer
  Model: Opus (API schema design) → Sonnet (endpoint implementation)
  Effort: L (15 calls)
  Sessions: 1-2
  Why: API design is architectural, endpoint wiring is Sonnet

R4-MS2: Authentication + RBAC
  Role: Platform Engineer
  Model: Opus (security model design) → Sonnet (implementation)
  Effort: M (12 calls)
  Sessions: 1
  Why: SECURITY-CRITICAL — auth/RBAC design requires Opus

R4-MS3: External API Consumption Layer
  Role: Platform Engineer
  Model: Sonnet (bridge integration + endpoint creation)
  Effort: M (10 calls)
  Sessions: 1
  Why: F7 Bridge provides architecture, this is implementation

R4-MS4: Phase Gate
  Role: Platform Engineer
  Model: Opus (security audit + gate review)
  Effort: S (8 calls)
  Sessions: 0.5
  Why: Security gate requires Opus scrutiny

## ═══════════════════════════════════════════════════════════════
## PHASE R5: VISUAL PLATFORM (6 milestones)
## ═══════════════════════════════════════════════════════════════

R5-MS0: Dashboard Framework + Component Library
  Role: UX Architect
  Model: Opus (component architecture) → Sonnet (implementation)
  Effort: L (18 calls)
  Sessions: 2
  Why: Component architecture is Opus, React/UI implementation is Sonnet

R5-MS1: Calculator Page (9 formulas)
  Role: UX Architect
  Model: Sonnet (UI implementation) → Opus (formula display accuracy review)
  Effort: M (12 calls)
  Sessions: 1
  Why: UI is Sonnet, but formula display correctness is safety-adjacent (Opus review)

R5-MS2: Job Planner Page + Toolpath Advisor
  Role: UX Architect
  Model: Sonnet (page implementation + data binding)
  Effort: M (10 calls)
  Sessions: 1
  Why: UI implementation, data already structured by R3

R5-MS3: Real-Time Monitoring Dashboard
  Role: UX Architect
  Model: Sonnet (chart components + WebSocket binding)
  Effort: M (12 calls)
  Sessions: 1
  Why: Implementation work with real-time data considerations

R5-MS4: Report Generation + Export
  Role: UX Architect
  Model: Sonnet (PDF/Excel generation)
  Effort: S (6 calls)
  Sessions: 0.5
  Why: Straightforward implementation with existing libraries

R5-MS5: Phase Gate
  Role: UX Architect
  Model: Sonnet (test execution) → Opus (UX review + gate)
  Effort: S (6 calls)
  Sessions: 0.5
  Why: Gate review needs Opus for holistic UX assessment

## ═══════════════════════════════════════════════════════════════
## PHASE R6: PRODUCTION HARDENING (6 milestones)
## ═══════════════════════════════════════════════════════════════

R6-MS0: Performance Profiling + Optimization
  Role: Production Engineer
  Model: Sonnet (profiling scripts + optimization) → Haiku (load test execution)
  Effort: L (15 calls)
  Sessions: 1-2
  Why: Profiling needs judgment (Sonnet), load generation is mechanical (Haiku)

R6-MS1: Fault Injection + Recovery Testing
  Role: Production Engineer
  Model: Opus (fault scenario design) → Sonnet (injection implementation + recovery testing)
  Effort: L (15 calls)
  Sessions: 1
  Why: SAFETY-CRITICAL — fault scenarios must be Opus-designed to ensure comprehensive coverage

R6-MS2: Safety Score Under Load Validation
  Role: Safety Engineer
  Model: Opus (MANDATORY — safety validation under stress cannot degrade S(x))
  Effort: M (10 calls)
  Sessions: 1
  Why: SAFETY-CRITICAL — verifying S(x)≥0.70 holds under production load

R6-MS3: Monitoring + Alerting + Observability
  Role: Production Engineer
  Model: Sonnet (dashboard creation + alert configuration)
  Effort: M (10 calls)
  Sessions: 1
  Why: Implementation work, well-defined scope

R6-MS4: Deployment Pipeline + Rollback
  Role: Production Engineer
  Model: Sonnet (pipeline creation) → Opus (rollback safety review)
  Effort: M (10 calls)
  Sessions: 1
  Why: Pipeline is Sonnet, rollback safety needs Opus judgment

R6-MS5: Phase Gate (Production Readiness)
  Role: Production Engineer
  Model: Opus (MANDATORY — production release gate)
  Effort: M (10 calls)
  Sessions: 1
  Why: Production release requires Opus-level quality gate

## ═══════════════════════════════════════════════════════════════
## PHASE R7: INTELLIGENCE EVOLUTION (7 milestones)
## ═══════════════════════════════════════════════════════════════

R7-MS0: Physics-Informed Predictions (Surface Integrity, Thermal, Chatter)
  Role: Intelligence Architect
  Model: Opus (physics model design + formula verification) → Sonnet (engine wiring)
  Effort: L (20 calls)
  Sessions: 1-2
  Why: SAFETY-CRITICAL physics — Opus designs models, Sonnet wires them

R7-MS1: Constrained Optimization (Cost, Quality, Productivity)
  Role: Intelligence Architect
  Model: Opus (optimization algorithm design) → Sonnet (implementation)
  Effort: L (18 calls)
  Sessions: 1
  Why: Multi-objective optimization is architectural, implementation is Sonnet

R7-MS2: Workholding Intelligence
  Role: Intelligence Architect
  Model: Sonnet (fixture selection logic) → Opus (clamping force safety review)
  Effort: M (12 calls)
  Sessions: 1
  Why: Logic is Sonnet, but clamping force affects part quality (Opus review)

R7-MS3: Learning From Jobs
  Role: Intelligence Architect
  Model: Sonnet (learning pipeline implementation)
  Effort: M (12 calls)
  Sessions: 1
  Why: Well-defined pipeline, implementation-level work

R7-MS4: Advanced Algorithms (MIT Course Integration)
  Role: Intelligence Architect
  Model: Opus (algorithm selection + correctness) → Sonnet (integration)
  Effort: M (12 calls)
  Sessions: 1
  Why: Algorithm selection from courses requires Opus judgment on applicability

R7-MS5: Shop Floor Optimization (Scheduling, Machine Assignment)
  Role: Intelligence Architect
  Model: Opus (scheduling algorithm design) → Sonnet (implementation)
  Effort: L (15 calls)
  Sessions: 1
  Why: Scheduling optimization is algorithmic (Opus), implementation is Sonnet

R7-MS6: Manufacturer Catalog Extraction (9.7GB → Structured Data)
  Role: Data Architect
  Model: Haiku (bulk PDF parsing) → Sonnet (data normalization + validation)
  Effort: XL (30+ calls)
  Sessions: 2-3
  Why: Parsing 116 catalogs is bulk work (Haiku), normalization needs judgment (Sonnet)

## ═══════════════════════════════════════════════════════════════
## PHASE R8: USER EXPERIENCE & INTENT ENGINE (8 milestones)
## ═══════════════════════════════════════════════════════════════

R8-MS0: Intent Decomposition Engine
  Role: UX Architect
  Model: Opus (intent taxonomy + decomposition logic) → Sonnet (implementation)
  Effort: XL (25 calls)
  Sessions: 2
  Why: Intent decomposition is the most complex routing problem — needs Opus

R8-MS1: Persona-Adaptive Response Formatting
  Role: UX Architect
  Model: Sonnet (formatter implementation + persona templates)
  Effort: M (10 calls)
  Sessions: 1
  Why: Template-driven, well-defined scope

R8-MS2: Pre-Built Workflow Chains
  Role: UX Architect
  Model: Sonnet (chain construction) → Opus (chain validation for correctness)
  Effort: M (10 calls)
  Sessions: 1
  Why: Chains must produce correct results — Opus validates

R8-MS3: Onboarding & First 5 Minutes
  Role: UX Architect
  Model: Sonnet (flow implementation)
  Effort: S (5 calls)
  Sessions: 0.5
  Why: Straightforward UX flow

R8-MS4: Setup Sheet Generation
  Role: UX Architect
  Model: Sonnet (template + generation logic)
  Effort: M (10 calls)
  Sessions: 1
  Why: Implementation work, data available from R3

R8-MS5: Conversational Memory & Context
  Role: Intelligence Architect
  Model: Opus (memory integration design) → Sonnet (implementation)
  Effort: M (10 calls)
  Sessions: 1
  Why: Memory integration with MemoryGraphEngine is architectural

R8-MS6: User Workflow Skills (12 skills)
  Role: UX Architect
  Model: Sonnet (skill implementation) → Haiku (bulk testing)
  Effort: L (15 calls)
  Sessions: 1-2
  Why: 12 skills is moderate volume, needs Sonnet judgment for each

R8-MS7: User Assistance Skills (10 skills)
  Role: UX Architect
  Model: Sonnet (skill implementation)
  Effort: M (10 calls)
  Sessions: 1
  Why: Similar to MS6 but smaller scope

## ═══════════════════════════════════════════════════════════════
## PHASE R9: REAL-WORLD INTEGRATION (7 milestones)
## ═══════════════════════════════════════════════════════════════

R9-MS0: MTConnect / OPC-UA Data Ingestion
  Role: Integration Engineer
  Model: Opus (protocol architecture) → Sonnet (adapter implementation)
  Effort: XL (25 calls)
  Sessions: 2
  Why: Machine communication protocols require architectural design (Opus)

R9-MS1: CAM System Plugins
  Role: Integration Engineer
  Model: Opus (plugin architecture) → Sonnet (plugin implementation per CAM system)
  Effort: XL (30 calls)
  Sessions: 2-3
  Why: Multi-CAM support is architecturally complex

R9-MS2: DNC / File Transfer Integration
  Role: Integration Engineer
  Model: Sonnet (file transfer implementation)
  Effort: M (10 calls)
  Sessions: 1
  Why: Well-defined protocols, implementation work

R9-MS3: Mobile / Tablet Interface
  Role: UX Architect
  Model: Sonnet (responsive UI implementation)
  Effort: M (12 calls)
  Sessions: 1-2
  Why: UI work, builds on R5 component library

R9-MS4: ERP / MES Integration
  Role: Integration Engineer
  Model: Sonnet (API integration) → Opus (data mapping validation)
  Effort: M (10 calls)
  Sessions: 1-2
  Why: ERP data mapping needs careful validation (Opus)

R9-MS5: Measurement & Inspection Integration
  Role: Integration Engineer
  Model: Sonnet (CMM/probe data integration)
  Effort: M (10 calls)
  Sessions: 1
  Why: Implementation work with defined data formats

R9-MS6: AR-Guided Setup Verification (Future Vision)
  Role: Research Architect
  Model: Opus (AR architecture design) → Sonnet (prototype)
  Effort: XL (25 calls)
  Sessions: 2-3
  Why: Novel technology integration requires Opus-level design

## ═══════════════════════════════════════════════════════════════
## PHASE R10: MANUFACTURING REVOLUTION (6 milestones)
## ═══════════════════════════════════════════════════════════════

R10-MS0: Digital Twin Foundation
  Role: Research Architect
  Model: Opus (digital twin architecture — novel system design)
  Effort: XL (30 calls)
  Sessions: 3
  Why: Digital twin is the most architecturally complex feature — Opus mandatory

R10-MS1: Generative Process Planning
  Role: Research Architect
  Model: Opus (AI-driven process generation logic)
  Effort: XL (25 calls)
  Sessions: 2
  Why: Novel AI application, requires Opus-level reasoning

R10-MS2: Self-Optimizing Parameters
  Role: Intelligence Architect
  Model: Opus (optimization loop design) → Sonnet (implementation)
  Effort: L (20 calls)
  Sessions: 2
  Why: SAFETY-CRITICAL — self-modifying parameters must be Opus-reviewed

R10-MS3: Collaborative Multi-Machine Orchestration
  Role: Systems Architect
  Model: Opus (orchestration architecture) → Sonnet (implementation)
  Effort: L (18 calls)
  Sessions: 1-2
  Why: Multi-machine coordination is architecturally complex

R10-MS4: Predictive Supply Chain Integration
  Role: Intelligence Architect
  Model: Sonnet (API integration + prediction models)
  Effort: M (12 calls)
  Sessions: 1
  Why: Builds on existing prediction infrastructure

R10-MS5: Phase Gate
  Role: Research Architect
  Model: Opus (MANDATORY — revolutionary features gate)
  Effort: M (10 calls)
  Sessions: 1
  Why: Gate for most complex features requires Opus

## ═══════════════════════════════════════════════════════════════
## PHASE R11: PRODUCT PACKAGING (4 milestones)
## ═══════════════════════════════════════════════════════════════

R11-MS0: Packaging + Distribution
  Role: Product Manager
  Model: Sonnet (build pipeline + packaging scripts)
  Effort: L (15 calls)
  Sessions: 2
  Why: Build/package is implementation work

R11-MS1: Documentation + API Reference
  Role: Product Manager
  Model: Haiku (bulk doc generation from code) → Sonnet (editorial review + polish)
  Effort: L (18 calls)
  Sessions: 2
  Why: Doc generation is bulk (Haiku), quality review needs Sonnet

R11-MS2: Licensing + Compliance
  Role: Product Manager
  Model: Opus (compliance review — legal implications) → Sonnet (implementation)
  Effort: M (10 calls)
  Sessions: 1
  Why: Compliance decisions have legal weight, need Opus judgment

R11-MS3: Launch Gate
  Role: Product Manager
  Model: Opus (MANDATORY — final product release gate)
  Effort: M (12 calls)
  Sessions: 1
  Why: Product launch gate is the ultimate quality checkpoint

## ═══════════════════════════════════════════════════════════════
## PARALLEL TRACKS (ongoing alongside phases)
## ═══════════════════════════════════════════════════════════════

SKILL-BULK: Bulk Skill Atomization (34 existing → ~660 atomic)
  Role: Data Architect
  Model: Haiku (bulk splitting) → Sonnet (quality review per batch)
  Effort: Ongoing (5-8 sessions total)
  Runs alongside: R1+

COURSE-EXTRACT: Course Skill Extraction (206 courses → ~2,800 skills)
  Role: Data Architect
  Model: Haiku (content parsing + extraction) → Sonnet (skill quality review)
  Effort: Ongoing (20-40 sessions total, prioritized by tier)
  Runs alongside: R1+ (T1-T2 during R1, T3-T5 during R3, T6+ during R7)

CAM-EXTRACT: CNC/CAM Training Extraction (~25 resources → ~420 skills)
  Role: Data Architect
  Model: Haiku (bulk parsing) → Sonnet (manufacturing accuracy review)
  Effort: Ongoing (3-5 sessions total)
  Runs alongside: R3

CATALOG-EXTRACT: Manufacturer Catalog Extraction (116 catalogs → structured data)
  Role: Data Architect
  Model: Haiku (PDF parsing) → Sonnet (data normalization)
  Effort: R7-MS6 (2-3 sessions)
  Already scheduled in R7

