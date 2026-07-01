# PRISM UNIFIED MASTER ROADMAP
## Generated: 2026-04-04 | Based on 20-Agent Full System Audit
## Authority: This file merges and supersedes ALL prior roadmaps

---

# AUDIT SUMMARY (System State at Generation Time)

```
Build:        PASS | 0 TS errors | 58.3MB bundle | 2,951 .ts + 201 .tsx files
Engines:      1,354 on disk | 1,011 exported | 41 dispatcher-wired (3%)
Dispatchers:  80 total | 4,064 actions | 495 dead actions | 19 empty dispatchers
Routes:       782 backend endpoints | 262 client functions (31.7% sync)
Schemas:      ~2,100/4,407 actions have Zod schemas (48%)
Registries:   24 total | all healthy | 6,346 materials, 2,107 machines, 15,912 tools
Frontend:     68 pages | 56 live-backed (82%) | 12 hardcoded
Tests:        979 test files
Physics:      85% complete | 42 core + 16 stochastic engines | 27 formulas
Infra:        9.2/10 | DB+Auth+Logging+RateLimit+WebSocket DONE | Cache+Queue MISSING
Milestones:   338 envelopes | 49 complete | 163 unknown status
Roadmaps:     15 active plans | 346 milestones | 2,775 units | 57% complete
```

# GAPS NOT COVERED BY PRIOR ROADMAPS

These items were found by the audit but have NO existing plan:
1. 339 unexported engines (not in index.ts)
2. 495 dead dispatcher actions (declared in z.enum, no case handler)
3. 19 empty dispatchers (0 actions)
4. 163 milestone envelopes with unknown status
5. WEDM standalone pipeline plan (only in general machine roadmaps)
6. LATHE standalone pipeline plan (only in F360-AP-MS5)
7. Quality Management System dedicated plan
8. Tool crib lifecycle dedicated plan
9. Duplicate case in calcDispatcher (bottleneck_identify)
10. 3 unregistered dispatchers (exportDispatcher, feasibilityDispatcher, provenPipelineDispatcher)

---

# ROADMAP STRUCTURE

Organized as **9 Layers** from foundation to surface. Each layer contains **Branches**.
Each Branch is a self-contained work envelope for 1-3 chat sessions (2-5 units each).
Pick a branch like picking a branch off a tree — complete it fully before moving on.

**Execution Rule**: Complete all branches in Layer N before starting Layer N+1
(except where explicitly marked PARALLEL-OK).

---

# LAYER 0: CLEANUP & STABILIZATION
> Fix broken things before building new things.
> Sessions: ~4 | Dependencies: None

## Branch L0-B1: Build Hygiene [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Fix duplicate `bottleneck_identify` case in calcDispatcher.ts (line 7404 duplicates 2975)
- [x] ~~U02~~: Register 3 missing dispatchers in src/index.ts (exportDispatcher, feasibilityDispatcher, provenPipelineDispatcher)
- [x] ~~U03~~: Fix empty glob warnings in fluidThermalDispatcher.ts:21, mechanicalDesignDispatcher.ts:19, SourceCatalogAggregator.ts:71

## Branch L0-B2: Dead Action Cleanup [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: Audit devDispatcher — 495 dead actions. Remove from z.enum or add case handlers. (Largest single debt)
- [x] ~~U02~~: Audit gsdDispatcher (74 dead), manusDispatcher (77 dead), machineSetupDispatcher (51 dead)
- [x] ~~U03~~: Audit autoPilotDispatcher (52 dead), machiningKnowledgeBaseDispatcher (56 dead, 0 cases)
- [x] ~~U04~~: Audit shopPracticeDispatcher (23 dead, 0 cases), documentLearningDispatcher, threadingPipelineDispatcher
- [x] ~~U05~~: Audit remaining dead-action dispatchers: secondaryOpsDispatcher, cadDrawingKnowledgeDispatcher, nlHookDispatcher

## Branch L0-B3: Engine Export Reconciliation [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Triage 339 unexported engines — categorize as: wire, defer, or deprecate
- [x] ~~U02~~: Export batch 1 (physics/force/thermal/deflection engines) to index.ts
- [x] ~~U03~~: Export batch 2 (CAM/toolpath/post-processor engines) to index.ts
- [x] ~~U04~~: Export batch 3 (business/quality/learning engines) to index.ts

## Branch L0-B4: Milestone Envelope Reconciliation [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Script to scan all 338 envelopes, fix 163 with unknown status by checking unit completion
- [x] ~~U02~~: Reconcile roadmap-index.json (341) vs actual envelopes (338) — fix 3-count drift
- [x] ~~U03~~: Mark stale/abandoned milestones, update CURRENT_POSITION.md to reflect true state

---

# LAYER 1: INFRASTRUCTURE FOUNDATION
> Production-grade infrastructure that everything else depends on.
> Sessions: ~8 | Dependencies: L0 complete

## Branch L1-B1: PersistenceBridge Hardening [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Harden PersistenceBridge — write confirmation, retry with exponential backoff, connection pool=50
- [x] ~~U02~~: Seed MaterialRegistry (6,346) + MachineRegistry (2,107) into Postgres with round-trip verification
- [x] ~~U03~~: Wire EmployeeEngine + PayrollEngine to PersistenceBridge + update ENTITY_CONFIGS

## Branch L1-B2: Redis Caching Layer [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Add ioredis to package.json. Create CacheEngine with get/set/invalidate + TTL + per-key namespacing
- [x] ~~U02~~: Wire auth token store to Redis (migrate from in-memory Maps). Add TLS + Sentinel config
- [x] ~~U03~~: Cache hot paths: registry lookups, formula results, speed/feed calculations. Add cache-hit headers

## Branch L1-B3: Job Queue Infrastructure [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Add BullMQ to package.json. Create JobQueueEngine with submit/status/cancel + idempotency keys
- [x] ~~U02~~: Wire pipeline engines (PrintToProgram, Turning, EDM) as background jobs with progress events
- [x] ~~U03~~: Add dead letter queue, retry policies, dashboard endpoint for queue health

## Branch L1-B4: File Storage Production [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Add multer middleware. Configure S3-compatible storage (local fallback for dev)
- [x] ~~U02~~: Wire file upload routes with SHA-256 dedup, extension whitelist, 50MB limit, content-type check
- [x] ~~U03~~: Add file versioning + CAD metadata extraction for STEP/IGES/DXF uploads

## Branch L1-B5: Schema Coverage Sprint [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: Auto-generate Zod schemas for calcDispatcher (1,185 missing) — batch 1: 200 actions
- [x] ~~U02~~: Auto-generate schemas for calcDispatcher batch 2: 200 actions
- [x] ~~U03~~: Auto-generate schemas for camDispatcher (~400 missing) + businessDispatcher (~186 missing)
- [x] ~~U04~~: Wire schemas into 5 unvalidated dispatchers (atcsDispatcher, autonomousDispatcher, contextDispatcher, cplDispatcher, spDispatcher)
- [x] ~~U05~~: Verify schema coverage reaches 80%+ threshold

## Branch L1-B6: Empty Dispatcher Wiring [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Wire bridgeDispatcher, safetyDispatcher, telemetryDispatcher, tenantDispatcher — import engines, add actions
- [x] ~~U02~~: Wire dataDispatcher, integrationDispatcher, complianceDispatcher, infraDispatcher
- [x] ~~U03~~: Wire machineLiveDispatcher, toolpathDispatcher, diagnosisDispatcher, memoryDispatcher
- [x] ~~U04~~: Wire remaining: cplDispatcher, fluidThermalDispatcher, mechanicalDesignDispatcher, pfpDispatcher, knowledgeExtDispatcher, productDispatcher

---

# LAYER 2: SECURITY & AUTH HARDENING
> Every route authenticated, every input validated.
> Sessions: ~4 | Dependencies: L1-B1, L1-B2

## Branch L2-B1: ERP Route Security [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Add verifyToken middleware to ALL 50+ ERP routes. Add requireRole(hr_manager) to payroll/employee-create
- [x] ~~U02~~: Add ownership checks (employee can only see own data unless manager). Add timestamp validation
- [x] ~~U03~~: Add job_time_pause, job_time_resume, employee_update to z.enum + case handlers. Remove .passthrough()

## Branch L2-B2: Auth Context & RBAC Frontend [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Create AuthContext.tsx — login/logout, token storage, session timeout (15 min)
- [x] ~~U02~~: Create ProtectedRoute.tsx — clearance-based route access map (shop_floor/lead/hr_manager/admin)
- [x] ~~U03~~: Add sidebar filtering by clearance in shellCatalog.ts + Layout.tsx

## Branch L2-B3: Input Validation Hardening [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Create sanitizeText() helper — strip HTML, max 500 chars, reject script/onerror
- [x] ~~U02~~: Apply to all user text fields across ERP routes
- [x] ~~U03~~: Add CORS hardening for production, security headers audit, rate limit tuning

---

# LAYER 3: PHYSICS & FORMULA HARDENING
> Make the math bulletproof before building domain pipelines on it.
> Sessions: ~6 | Dependencies: L1 complete | PARALLEL-OK with L2

## Branch L3-B1: Physics Gap Closure [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Generalize crater wear model beyond current Usui diffusion — add coating-specific geometry parameters
- [x] ~~U02~~: Integrate grinding residual stress into SurfaceIntegrityEngine (currently framework-only)
- [x] ~~U03~~: Add chip breaking prediction standalone module (extracted from ChipMorphologyDiagnosticEngine)
- [x] ~~U04~~: Add grinding wheel glazing/clogging prediction (extend dressing optimization engine)

## Branch L3-B2: Formula Validation Suite [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Define expected input/output pairs from Sandvik/ISO/Kennametal for each of 27 formulas
- [x] ~~U02~~: Build continuous validation hook — block edits that drop accuracy below 0.90
- [x] ~~U03~~: Add manufacturer data tests for remaining physics engines without validation

## Branch L3-B3: Physics Fusion Convergence [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Implement PhysicsFusionConvergenceEngine core (Anderson acceleration + Broyden fallback)
- [x] ~~U02~~: Add oscillation/divergence detection, spectral radius estimation, NaN handling
- [x] ~~U03~~: Add material-specific alpha tuning for ISO S (Inconel) strong thermal-wear coupling

## Branch L3-B4: SCIMATH Phase A (Critical Math) [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: SVD engine — singular value decomposition for vibration analysis
- [x] ~~U02~~: QR/Cholesky factorization for stability computations
- [x] ~~U03~~: Eigenvalue solver for chatter frequency extraction
- [x] ~~U04~~: Monte Carlo PDF generation for uncertainty quantification
- [x] ~~U05~~: Wire all to calcDispatcher with schemas + tests

---

# LAYER 4: MANUFACTURING DOMAIN BACKENDS
> Complete the machine-specific pipelines.
> Sessions: ~18 | Dependencies: L3 complete

## Branch L4-B1: Lathe Pipeline Hardening [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: LathePostProcessorEngine — verify all 6 controllers generate valid G-code for canned cycles
- [x] ~~U02~~: Add G96/G97 mode selection logic with CSS speed clamp optimization
- [x] ~~U03~~: Wire threading cycles (G76/G92) with proper infeed calculations per thread form
- [x] ~~U04~~: Add sub-spindle/B-axis support for mill-turn operations
- [x] ~~U05~~: Tests: validate against real lathe programs from Haas ST-30, Mazak QT-250

## Branch L4-B2: WEDM Pipeline Completion [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: WEDM Studio Session 2 — WedmStudioContext + 2D ProfileCanvas (U-WEDM04..06)
- [x] ~~U02~~: Session 3 — File upload, geometry preview, feature classification, feasibility check
- [x] ~~U03~~: Session 4 — WCS origin placement, toolpath strategy, corner radius comp, tab generation
- [x] ~~U04~~: Session 5 — Multi-pass cascade, wire break risk, surface integrity, G-code editor
- [x] ~~U05~~: Session 6 — Routing, nav, Quick Generate, EdmPage link

## Branch L4-B3: Post-Processor Revision (PP-REV) [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: PP-REV-MS0 — Audit 38-stage pipeline for correctness across 20 controller dialects
- [x] ~~U02~~: Fix non-canonical DEFAULT_KC1_1 in PostProcessorPipelineEngine (P=2000 vs canonical 1800)
- [x] ~~U03~~: Add setup sheet generation + cycle time estimation from post-processed output
- [x] ~~U04~~: Wire PP revenue tier system (Free/Pro/$79/Production/$199/Enterprise/$499)
- [x] ~~U05~~: End-to-end test: DXF→features→toolpath→post→G-code for each controller dialect

## Branch L4-B4: F360 AutoProgram [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: F360-MS0 — Wire CAM API surface (setups, operations, tools, toolpaths)
- [x] ~~U02~~: Cloud library data endpoints for tool library sync
- [x] ~~U03~~: 10-stage orchestration pipeline: feature recognition → DFM → tool selection → strategy → S/F → CAM ops → verify → output
- [x] ~~U04~~: Safety verification gate between toolpath gen and post-process
- [x] ~~U05~~: Machine coverage: VMC, HMC, 5-axis routing with kinematic limits

## Branch L4-B5: CAM Exchange (CAMX) [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Strategy bridge wiring for 18 CAM systems (Fusion, Mastercam, hyperMILL, PowerMill, etc.)
- [x] ~~U02~~: Toolpath strategy normalization — map 762 strategies across systems
- [x] ~~U03~~: Post-processor routing table: CAM system × controller × machine → CPS file
- [x] ~~U04~~: Cross-CAM novelty algorithms: adaptive clearing, trochoidal, morphing, rest milling

## Branch L4-B6: Secondary Process Hardening [COMPLETE]
**Units: 4 | Sessions: 1**
- [x] ~~U01~~: Grinding program assembler — verify 5 types × 6 dialects
- [x] ~~U02~~: EDM program assembler — verify wire/sinker/micro × 6 dialects
- [x] ~~U03~~: Laser program assembler — verify cut/mark/weld/drill × 7 dialects
- [x] ~~U04~~: Waterjet program assembler — verify AWJ/pure/taper/depth × 6 dialects

---

# LAYER 5: BUSINESS & ERP BACKEND
> Complete the business logic that turns manufacturing into revenue.
> Sessions: ~12 | Dependencies: L2 complete | PARALLEL-OK with L4

## Branch L5-B1: ERP Route Stabilization [COMPLETE]
**Units: 4 | Sessions: 1**
- [x] ~~U01~~: Fix speed/feed route split-brain (unmounted /api/v1/speed-feed/* routes)
- [x] ~~U02~~: Fix CAM generate/post contract mismatch
- [x] ~~U03~~: Fix 6 PPG action names missing from dispatchers. Wire oee_calculate
- [x] ~~U04~~: Fix context catalog zero entries. 24 integration tests for route contracts

## Branch L5-B2: Business Platform Core [COMPLETE]
**Units: 5 | Sessions: 2**
- [x] ~~U01~~: FileStorageEngine with SHA-256 dedup + version tracking
- [x] ~~U02~~: PartsLibraryEngine with CAD metadata extraction + revision tracking
- [x] ~~U03~~: InstantQuoteEngine — CAD→feature recognition→physics-based price with CI95 bounds
- [x] ~~U04~~: DFM analysis pipeline — tolerance check, cost impact, rule-based feedback
- [x] ~~U05~~: Wire QuickBooks OAuth 2.0 connector (token management + encrypted storage)

## Branch L5-B3: Workflow & Job Management [COMPLETE]
**Units: 4 | Sessions: 1**
- [x] ~~U01~~: ApprovalWorkflowEngine — generic approval chains with audit trails
- [x] ~~U02~~: JobTravelerEngine — routing steps + dual time tracking (setup+cycle)
- [x] ~~U03~~: DeskPayloadEngine — role-based dashboard payloads
- [x] ~~U04~~: GlobalSearchEngine — cross-entity ranked search

## Branch L5-B4: Customer & Portal [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Customer portal — 14-milestone order template, token-based access
- [x] ~~U02~~: Quality document access, messaging, case creation
- [x] ~~U03~~: SLA tracking, escalation rules, customer satisfaction scoring

## Branch L5-B5: Quoting & Cost Hardening [COMPLETE]
**Units: 4 | Sessions: 1**
- [x] ~~U01~~: Add 8 missing formulas: activity-based costing, learning curve, batch sizing
- [x] ~~U02~~: Cpk prediction, OEE decomposition, quote calibration
- [x] ~~U03~~: Setup complexity scoring, scrap reserve calculation
- [x] ~~U04~~: Multi-ERP connector framework (E2, Epicor Kinetic, ProShop, generic CSV)

## Branch L5-B6: Compliance & Legal [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: NDA tracking, ITAR/EAR compliance check engine
- [x] ~~U02~~: AS9100/ISO 13485/NADCAP requirements registry
- [x] ~~U03~~: Audit trail, document retention policy, OSHA safety tracking

---

# LAYER 6: KNOWLEDGE & INTELLIGENCE
> Feed the system with data to make it smarter.
> Sessions: ~10 | Dependencies: L1 complete | PARALLEL-OK with L4, L5

## Branch L6-B1: Learning Pipeline [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: ContentIngestionPipelineEngine — PDF/video/handbook intake
- [x] ~~U02~~: ContentAutoTaggerEngine — auto-classify by domain, machine, material
- [x] ~~U03~~: KnowledgeDeduplicationEngine — prevent duplicate knowledge entries
- [x] ~~U04~~: Wire to knowledgeDispatcher + tests

## Branch L6-B2: Machine Handbook Intelligence [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: MachineHandbookRegistry data model + schema
- [x] ~~U02~~: Extraction pipeline — PDF parsing, OCR, table extraction for spindle/travel/magazine data
- [x] ~~U03~~: Alarm intelligence engine — map 2,500+ alarms to corrective actions
- [x] ~~U04~~: Machine capability engine — kinematic models + spindle torque curves

## Branch L6-B3: Tribal Knowledge Propagation [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Tribal knowledge capture workflow — operator tip intake with material/machine/operation tagging
- [x] ~~U02~~: Knowledge retrieval engine — context-aware tip delivery during program generation
- [x] ~~U03~~: Tribal knowledge validation — experienced machinist review/rating system

## Branch L6-B4: Resource Extraction [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: PDF processing pipeline for 1,162 PDFs across 3 archive locations
- [x] ~~U02~~: Video transcript extraction for 86 machining videos
- [x] ~~U03~~: CAD model metadata extraction for 297 CAD files

## Branch L6-B5: Tool & Holder Enrichment [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Enrich 15,912 tools: cutting data by ISO group, Taylor coefficients, geometry
- [x] ~~U02~~: Ingest tool holder models — build holder-to-tool compatibility matrix
- [x] ~~U03~~: Tool crib lifecycle: issue/return tracking, regrind counting, cost-per-edge

---

# LAYER 7: FRONTEND WIRING
> Every page talks to the real backend.
> Sessions: ~12 | Dependencies: L5 complete for business pages, L4 for manufacturing pages

## Branch L7-B1: Manufacturing Excellence Pages (12 hardcoded → live) [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Wire OEEDashboardPage to analyticsOEE() + backend OEE engine
- [x] ~~U02~~: Wire KaizenBoardPage + KanbanBoardPage to backend CRUD endpoints
- [x] ~~U03~~: Wire SPCDashboardPage to qualitySPCChart() + Nelson Rules engine
- [x] ~~U04~~: Wire ValueStreamPage + RootCausePage + A3ReportPage to backend engines

## Branch L7-B2: Employee & Operations Pages [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Wire LoginPage to AuthEngine (JWT flow, barcode scanner input)
- [x] ~~U02~~: Wire ShopFloorLivePage to machineLive dispatcher (57 actions)
- [x] ~~U03~~: Wire EmployeePortalPage to employee profile + skills + time history
- [x] ~~U04~~: Wire MessagesPage to real-time message endpoints + WebSocket

## Branch L7-B3: Business Pages [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Wire CaptureOpsPage to file upload + DXF/STEP intake pipeline
- [x] ~~U02~~: Wire PostProcessorPage to PP generation + preview + download
- [x] ~~U03~~: Wire ShellGatewayPage to role-based desk payload system
- [x] ~~U04~~: Verify all 68 pages make at least one real backend call

## Branch L7-B4: Route Sync Sprint [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Add client functions for top 50 high-value orphaned manufacturing routes
- [x] ~~U02~~: Add client functions for ERP/business orphaned routes
- [x] ~~U03~~: Add client functions for learning/knowledge orphaned routes
- [x] ~~U04~~: Verify sync rate reaches 60%+ (from current 31.7%)

## Branch L7-B5: UX Polish & Accessibility [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: WCAG 2.1 AA audit — aria-labels, touch targets (44px min), color contrast (4.5:1)
- [x] ~~U02~~: Loading skeletons for all data-fetching pages
- [x] ~~U03~~: Error handling: retry logic, timeout handling, offline banner, user-friendly messages

---

# LAYER 8: PRODUCTION & SCALE
> Make it production-ready, fast, and safe.
> Sessions: ~8 | Dependencies: L7 complete

## Branch L8-B1: Benchmarking Suite [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Performance benchmarks for all 9 pipelines (PrintToProgram through QuoteToShip)
- [x] ~~U02~~: Accuracy benchmarks vs manufacturer data (Sandvik, Kennametal, Walter)
- [x] ~~U03~~: Regression detection — auto-flag accuracy drops across releases
- [x] ~~U04~~: Load testing — 100 concurrent users, p95 < 200ms for API responses

## Branch L8-B2: Safety Hardening [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Safety gate audit — verify all 9 pipelines have mandatory safety checks before G-code output
- [x] ~~U02~~: Machine limit enforcement — verify spindle RPM, feed rate, travel limits checked against MachineRegistry
- [x] ~~U03~~: Collision detection — verify tool/fixture/part clearance validated before program release

## Branch L8-B3: Deployment Readiness [COMPLETE]
**Units: 4 | Sessions: 2**
- [x] ~~U01~~: Docker compose validation — `docker-compose up --build` succeeds end-to-end
- [x] ~~U02~~: Environment config — production .env template, secrets management, JWT_SECRET rotation
- [x] ~~U03~~: Health check endpoints — /health, /ready, /live for Kubernetes probes
- [x] ~~U04~~: Observability — OpenTelemetry traces, Prometheus metrics, structured log aggregation

## Branch L8-B4: Scale & Monitoring [COMPLETE]
**Units: 3 | Sessions: 1**
- [x] ~~U01~~: Connection pool tuning under load (Postgres 50 connections, Redis Sentinel)
- [x] ~~U02~~: Background job monitoring — queue depth alerts, failed job notifications
- [x] ~~U03~~: Real-time dashboard — machine status, job progress, system health in one view

---

# EXECUTION GUIDE

## How to Pick a Branch

1. Start at the lowest incomplete Layer
2. Within that Layer, pick any unblocked Branch
3. Complete ALL units in the Branch before moving to another
4. Mark the Branch complete in this file when done
5. Compact after each Branch (2-5 units = 1-3 sessions)

## Branch Size Targets

- **Small Branch** (1 session): 2-3 units, ~500 LOC, 1 compact cycle
- **Medium Branch** (2 sessions): 4-5 units, ~1,500 LOC, 2 compact cycles
- **Large Branch** (3 sessions): 5+ units, ~3,000 LOC, 3 compact cycles

## Parallel Execution (Claude + Codex)

Branches marked **PARALLEL-OK** can run simultaneously:
- Claude: Backend branches (L1-L6)
- Codex: Frontend branches (L7) once backend dependencies land
- Both: L0 cleanup (different dispatchers)

## Quality Gate Per Branch

Every Branch completion requires:
1. `npx tsc --noEmit` → 0 errors
2. All new code has companion tests
3. Build passes (`npm run build`)
4. No regressions in existing tests

---

# TOTAL SCOPE

| Layer | Branches | Units | Est. Sessions |
|-------|----------|-------|---------------|
| L0: Cleanup | 4 | 15 | 6 |
| L1: Infrastructure | 6 | 21 | 8 |
| L2: Security | 3 | 9 | 3 |
| L3: Physics | 4 | 15 | 6 |
| L4: Manufacturing | 6 | 28 | 11 |
| L5: Business | 6 | 23 | 7 |
| L6: Knowledge | 5 | 17 | 7 |
| L7: Frontend | 5 | 19 | 9 |
| L8: Production | 4 | 14 | 6 |
| **TOTAL** | **43** | **161** | **~63** |

---

# PRIOR ROADMAP MAPPING

This roadmap absorbs and supersedes:

| Prior Roadmap | Mapped To |
|--------------|-----------|
| sleepy-chasing-prism.md (unified v2) | L0-L8 (full merge) |
| CAMX-RESTRUCTURED-ROADMAP-v24.md | L3-B3, L4-B5, L4-B6 |
| ULTIMATE-PRISM-ROADMAP-v25.md | L5-B2, L5-B3, L7-B3 |
| Infrastructure Modernization | L1 (all branches) |
| EMP Employee/HR v3 | L2-B1, L2-B2, L7-B2 |
| BP Business Platform | L5-B1 through L5-B4 |
| F360 AutoProgram | L4-B4 |
| PP Maximization | L4-B3 |
| LEARN Pipeline | L6-B1, L6-B2 |
| SCIMATH Advanced | L3-B4 |
| Web UI v9 Rebuild | L7 (all branches) |
| Machine Handbook Intelligence | L6-B2 |
| TASK_QUEUE.md (79 tasks) | Distributed across L0-L8 |
| WEDM-MS0 through WEDM-HARDEN | L4-B2 |
| LATHE-MS0 | L4-B1 |
| BENCH-MS0 through MS4 | L8-B1 |
| ULT-MS0 through MS5 | L5-B3, L7-B2, L8-B4 |

**Archive**: All files in data/docs/roadmap/archive/ and completed-phases/ are historical.
Phase docs R5-R15 are superseded by this layered structure.
