# PRISM Reorganized Backend Build Order
## Claude's Lane — Backend-First, Dependency-Ordered
Generated: 2026-03-28T02:00:00Z

## Principles
1. Dependencies flow downward — nothing starts until its blockers are done
2. Backend contracts first, then routes, then tests
3. Machine-type roadmaps are execution detail inside v24 phases
4. Convergence point: when backend APIs are stable enough for Codex to wire frontend

---

## TIER 0: CRITICAL BLOCKERS (do these FIRST)
*These unlock everything downstream*

### T0-1: Persistence Layer (v24 Session 5-1)
- PostgreSQL schema: 12 ERP tables (work_orders, time_entries, invoices, GL, POs, employees)
- IBusinessStore adapter pattern (Postgres + InMemory)
- Migrate top 6 engines to persistence
- **UNLOCKS**: All Phase 5-6 business logic, QuickBooks, approval workflows

### T0-2: Pipeline Architecture Fix (v24 0-D-ARCH + CAMX-MS0.3/0.5)
- Break pipeline silos — 6/8 pipelines currently isolated
- Shared registry wiring (Tool/Material/Machine) across all pipelines
- Inline constants → canonical imports
- **UNLOCKS**: All Phase 3-4 physics improvements, machine-type hardening

### T0-3: Infrastructure Hardening (v24 0-D-INFRA + EIGC-MS1)
- Typed dispatcher schemas for top 10 dispatchers
- ESLint v9 flat config as hard gate
- **UNLOCKS**: Type-safe action development at scale

---

## TIER 1: BUSINESS PLATFORM (E2/Xometry/Fictiv parity)
*After persistence layer is live*

### T1-1: QuickBooks Online Connector (v24 Session 6-5)
- OAuth 2.0, GL mapping, 3-way matching, webhooks
- Dependencies: T0-1

### T1-2: Approval Workflows + Audit Trails (v24 Session 6-6)
- State machine for quote/PO/invoice/quality approvals
- Persistent audit trail
- Dependencies: T0-1

### T1-3: Job Traveler + Time Tracking (v24 Session 6-7)
- Route step history, setup/cycle time split, operator entry
- Dependencies: T0-1

### T1-4: Shop Configuration (v24 Session 5-2)
- Machine rates, labor, overhead, material markups, tax
- Dependencies: T0-1

### T1-5: Physics-Fed Costing (v24 Session 5-3)
- Cost from SpeedFeedOrchestrator cycle time + material/tool/overhead
- Dependencies: T0-1, T0-2

### T1-6: Role-Based Desks API (v24 Session 6-8)
- Queue counts, role-filtered views, full-text search
- Dependencies: T0-1
- **CONVERGENCE POINT**: Codex wires frontend to these APIs

### T1-7: Customer Portal Backend (v24 Session 6-9)
- Portal auth, quote/order tracking, document access
- Dependencies: T1-2

### T1-8: Learning Backend (v24 Session 6-10 + ULT-MS2)
- Course progression, checkpoint gates, media bundles
- Dependencies: T0-1

---

## TIER 2: PHYSICS & PROCESS HARDENING
*After pipeline architecture is fixed*

### T2-1: Thermal-Wear-Force-Finish Coupling (v24 Session 3-7)
- Coupled feedback: thermal→wear→force + force→deflection→finish
- Dependencies: T0-2

### T2-2: Uncertainty + SPC Wiring (v24 Session 3-8)
- Per-stage uncertainty, SPC charting (X-bar/R, CUSUM, EWMA)
- Dependencies: T0-2

### T2-3: Cross-Material Validation (v24 Session 3-9)
- 5 materials × published data validation (±15% tolerance)
- Dependencies: T0-2

### T2-4: Stock Model + Voxel Wiring (v24 0-D-VARIABILITY + Session 3-2)
- VoxelStockEngine per-pass geometry, ToleranceStackUp propagation
- Dependencies: T0-2

### T2-5: Process Physics — Threading + Helical + Plunge (v24 Sessions 3-3, 3-4)
- Thread milling force, helical bore engagement, plunge thrust
- Dependencies: T0-2

---

## TIER 3: MACHINE-TYPE PIPELINE COMPLETION
*After physics hardening + persistence*

### T3-1: Lathe Completion (LATHE roadmap MS4-MS8, 39 units)
- Exotic materials, live tooling, sub-spindle, probing, real parts
- Dependencies: T0-2, T2-1

### T3-2: Milling Pipeline Rebuild (MILLING roadmap, 93 units)
- PrintToProgramPipelineEngine from SCAFFOLD → production
- Pocket/contour, hole making, 3D surface, adaptive/trochoidal
- Dependencies: T0-2, T2-1, T2-4

### T3-3: Wire EDM Hardening (WIRE-EDM roadmap, 20 units)
- Multi-material validation, corner control, taper compensation
- Dependencies: T0-2 (lightest dependency — nearly production already)

### T3-4: Laser + Waterjet Physics (LASER + WATERJET roadmaps, 70 units)
- Schulz thermal model (laser), Zeng-Kim model (waterjet)
- Material-specific parameters, pierce strategies
- Dependencies: T0-2, T2-1

### T3-5: Mill-Turn Multi-Channel (MILL-TURN roadmap, 138 units)
- Multi-channel sync dialects, sub-spindle transfer, bar feeder
- Dependencies: T3-1 (lathe base), T3-2 (milling base), T0-2

### T3-6: Five-Axis Kinematics (FIVE-AXIS roadmap, 125 units)
- TCP management, kinematics inverse solver, singularity detection
- Dependencies: T3-2 (milling base), T0-2

### T3-7: Grinding Full Build (GRINDING roadmap, 65 units)
- Malkin energy model, 6 controller paradigms, dressing, burn detection
- Dependencies: T0-2, T2-1 (HIGHEST complexity — last to start)

---

## TIER 4: INTEGRATION & VALIDATION
*After machine pipelines converge*

### T4-1: Simulation Gates (v24 Session 4-1)
- CNCSimulationPipeline, Backplot, CollisionPrevention as 3-gate verification

### T4-2: QuoteToShip E2E Validation (v24 Session 5-9)
- Full pipeline: CAD → instant quote → job → routing → costing → invoice

### T4-3: Benchmark Suite (BENCH-MS0 through MS4, 31 units)
- 15 parts, 8,640 S/F combos, 1,500 pipeline tests, 10 industry parts

### T4-4: Production Gate (PROD-GATE-MS0)
- Ship-readiness unified gate

---

## TIER 5: CONVERGENCE AUDIT (Claude ↔ Codex swap)
*After backend APIs stable + frontend shells wired*

### T5-1: Claude audits frontend — find gaps, fix missing data contracts
### T5-2: Codex audits backend — find gaps, validate dispatcher completeness
### T5-3: Generate final convergence roadmap from audit findings

---

## BACKEND vs FRONTEND OWNERSHIP

| Owner | Scope | % of Work |
|-------|-------|-----------|
| Claude (Backend) | Engines, dispatchers, routes, DB, physics, registries | 95% |
| Codex (Frontend) | React pages, providers, shells, workflow UX | 5% |
| Shared | API contracts (T1-6), learning UI (T1-8), ULT shop OS | convergence point |

## IMMEDIATE NEXT 3 SESSIONS (Claude Backend)
1. **T0-1: Persistence Layer** (v24 Session 5-1) — critical blocker
2. **T1-1: QuickBooks Connector** (v24 Session 6-5) — business ops
3. **T0-2: Pipeline Architecture** (v24 0-D-ARCH) — physics blocker

## Current Status
- Session 6-4 COMPLETE (DFM + GD&T + InstantQuote fixes)
- Build: PASS | Tests: 57/57 | Review: PASS
- SVI: 1.8 × 10^43 | Psi: 40.8%
