# PRISM UNIFIED ROADMAP v2.5
## Updated: 2026-04-12 | Lane Launch Status + Task Completion Sync + 141 Roadmap Fixes + DEVOPS-MS Track
## Authority: This file SUPERSEDES all prior roadmaps including PRISM-UNIFIED-MASTER-ROADMAP.md
## Amendments: 48 findings from 20-agent scrutiny (2026-04-10) + 10 specialist agents (2026-04-11) + 34 tribal knowledge findings from 20-agent scrutiny (2026-04-12)
## New: Lanes 14-17 added from Haas/Hurco/Mastercam/Setup/Cost/Digital Twin/Supply Chain/Scheduling/hyperMILL analysis
## New: Lane 18 (TRIBAL KNOWLEDGE PROPAGATION) added from 20-agent tribal knowledge scrutiny (2026-04-12)
## New: Lane 20 (KAR-UO) added — Knowledge-Augmented Reasoning + Unified Orchestration (14 milestones, 72 units)

---

# SYSTEM STATE AT GENERATION TIME

```
Build:           PASS | 0 TS errors | ~61MB bundle | 3,200+ .ts source files
Engines:         1,506 on disk | 81 dispatchers | ~71,000 registry entries
Tests:           1,323 test files | 1,231 .ts tests
Frontend (Claude): canonical target | PRISM/mcp-server/web/ | React 19 + Vite + Tailwind
Frontend (Codex):  donor-only review tree | PRISM/web/ | React 19 + Vite + Tailwind (historical divergence, not an active deploy target)
Algorithms:      52 modules | 196 schemas | 24 registries
Hooks:           26 files (~361 hooks) | 14 cadence functions
Skills:          42 directories | 160+ scripts
Roadmap Index:   v8.5.0 | 530 milestones | 133 complete | 15 in_progress | 382 not_started
Health Check:    STALE (2026-02-25, 46 days old — needs regeneration)
```

## 📱 CANONICAL FRONTEND REFERENCE (added 2026-04-16)

**Scrutiny R5 is the authoritative reference for what Codex built on the web frontend and where the gaps are:**
`H:/prism/SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`

Consult BEFORE proposing any work that touches `mcp-server/web/`, the calculator, post-processor UI, or MachineMode surfaces. Detailed breakdown (backend gaps PRISM must support + frontend gaps the web app still needs + 18 MILL-AGI units retired as redundant with Phase 0 + CALC-MILL-MS0..MS3 expansion plan) lives in the scrutiny doc AND in the `## CANONICAL FRONTEND REFERENCE` section of `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`. Do not duplicate — cross-reference.

# CANONICAL TEST SHOP: JM DIE COMPANY

All PRISM development and testing targets JM Die Company as the reference shop.
Profile: `src/data/jm-die-profile.ts` | Config: `src/engines/ShopConfigurationEngine.ts`
Default profile ID: `"jm-die"` (ShopConfigurationEngine.DEFAULT_PROFILE_ID)

```
Industry:     Cold heading die & tooling (fastener industry, 100+ customers)
Machines:     21 total — 7 Okuma lathes, 5 mills, 2 sinker EDMs, 1 wire EDM, 6 support
Programs:     20,157 files (5,297 .MIN, 3,713 .mcx-8, 1,825 legacy .MCX)
CAM Software: Mastercam (Mill/Lathe/Wire seats), Esprit Wire, Fusion 360 (4 seats, 2 w/ machining), hyperMILL (1 seat)
Posts:         25 JM Die machine posts (2 production, 21 testing, 1 deprecated) + 644 stock library
Controllers:  OSP-P300/P200/P500 (Okuma), WinMAX v10 (Hurco), PRE-NGC (Haas), Fanuc 31i-B5 (Roku-Roku),
              FP80S/C30EA-2 (Mitsubishi sinker), W21FAS-2/W30FAS-2/W31MV-2 (Mitsubishi wire)
```

**Upcoming JM Die Data Phases** (see Lane 5 + new Lane 11):
- Employee database (operators, setup techs, programmers, inspectors)
- Tool holder inventory (CAT40/BT40/HSK per machine)
- Cutting tool inventory (shop crib stock)
- Material stock (M2, D2, S7, A2, H13, graphite grades, copper, carbide)
- Print/drawing library (customer prints, electrode prints, die prints)

---

# 20-AGENT SCRUTINY AMENDMENTS (48 findings)

The following fixes from the 2026-04-10 audit are incorporated into the lanes below:

## Safety (Agent 1 — was 38/100)
- [S1] Collision detection gate added to ALL G-code pipelines (Lane 0, PP-H0)
- [S2] Laser safety interlocks added (Lane 8, LASER-PIPE)
- [S3] Waterjet pressure safety added (Lane 8, WATER-PIPE)
- [S4] M-code safety expanded to ALL controllers including Hurco WinMAX, Okuma OSP (7 variants), Fanuc 31i, Mitsubishi FP80S/C30EA-2 (Lane 0)
- [S5] Div-by-zero audit expanded to EDM/laser/waterjet engines (Lane 0)
- [S6] Sinker EDM burn parameter limits added (Lane 7)
- [S7] Graphite dust extraction as Lane 0 safety item (NFPA 652/654)

## Physics (Agent 2 — was 72/100)
- [P8] Graphite kc1.1 corrected to 100-350 N/mm² (was "500-800") (Lane 7)
- [P9] FRF data requirement flagged for SLD outputs (Lane 6)
- [P10] Sinker EDM finish duty cycle fixed: pulseOff = 1.5-2.0 × pulseOn (Lane 7)

## Dependencies (Agent 3 — was 78/100)
- [D11] Missing DAG edges added: Lane 5→7, Lane 7→4, Lane 0 re-validation from Lane 5
- [D12] Lane 2 start moved to Phase 2 (was starved until Phase 5)
- [D13] LASER-PIPE and WATER-PIPE decoupled from Lane 7 (only SINKER-FULL depends on it)
- [D14] Lane 1 (Frontend Merge) can start Phase 1 — no Lane 0 dependency

## Frontend (Agent 4 — was 38/100)
- [F15] Build output path fixed: `mcp-server/dist/web/` (Lane 1)
- [F16] FMERGE increased from 4 to 8-10 sessions (51 unique pages, 30+ hooks)
- [F17] Added units: API contract unification, test migration, WEDM Studio vs Wizard UX, 3 new React Contexts

## EDM Process (Agent 5 — was 72/100)
- [E18] Spark gap unification: use ElectrodeDesignEngine stage-based values (Lane 7)
- [E19] Electrode inspection stage added BETWEEN milling and sinker burn (Lane 7)
- [E20] Multi-cavity programming as 3 separate units (Lane 7)
- [E21] Orbit engine added (circular/square/planetary/random) (Lane 7)
- [E22] Fusion 360 API strategy specified (Lane 7)

## Data Engineering (Agent 6 — was 38/100)
- [DE23] Data licensing/legal review for web scraping (Lane 5)
- [DE24] Dedup strategy for Lane 5 added
- [DE25] Data storage architecture: indexing strategy for 100K+ tools (Lane 5)
- [DE26] Machine target revised: 5,000→2,500 realistic; cutting data 40-60% coverage + physics fallback

## Knowledge/ML (Agent 7 — was 31/100)
- [K27] PDF table accuracy raised: 70%→95%+ with physics plausibility gate (Lane 4)
- [K28] Epistemic tags added: {source_type, physics_verified, conflict_status} (Lane 4)
- [K29] Conflict resolution protocol as dedicated unit (Lane 4)
- [K30] Video target reduced: 1,000→50-100 curated with manual QA (Lane 3)
- [K31] Safety gate between extraction pipelines and live registries (Lanes 3-5)

## Scope (Agent 8 — was 58/100)
- [SC32] 4-loop overhead: real session count ~290-330, not 220
- [SC33] Lane 2 decomposed into session-level blocks
- [SC34] Electrode pipeline increased from 6 to 9 sessions (per velvet-twirling-flute.md)

## CAM Strategy (Agent 9 — was 61/100)
- [CS35] 18 CAM bridges → tiered: Tier 1 native (Fusion/hyperMILL/Mastercam), Tier 2 export (NX/PowerMill/SolidCAM), Tier 3 generic
- [CS36] 762 strategies → ~80 real after dedup (762 is registry artifact)
- [CS37] Mazatrol removed from Lane 6 (no Mazak in shop). Okuma OSP specifics added
- [CS38] Controller-specific HSM names: G187 (Haas), UltiMotion (Hurco), Super-NURBS/NAVI-G (Okuma)

## DevOps (Agent 10 — was 28/100)
- [DO39] tsc + vitest + build added to CI pipeline (Lane 10)
- [DO40] Per-seat git branches: seat/2-video, seat/3-pdf, seat/4-db (Lane 10)
- [DO41] Inter-seat coordination.json with per-milestone signaling (Lane 10)
- [DO42] Seat-specific CLAUDE.md expanded from 5→30+ lines (Lane 10)

## Quality/Metrology (Agent 14 — was 18/100)
- [QM43] NEW: Quality & Metrology lane added (QM-MS0 through QM-MS7) — see Lane 11 below

## Business (Agent 13 — was 52/100)
- [B44] Electrode cost wired to quoting (Lane 7 → QuoteEstimatorEngine)
- [B45] Make-vs-buy decision engine (Lane 2, BIZ track)

## Shop Owner Priority (Agent 20 — was 72/100)
- [SO46] Electrode pipeline moved to Phase 1 (alongside Lane 0 safety)
- [SO47] Production scheduling lane added (Lane 2, new SCHED track)
- [SO48] DNC/file transfer added (Lane 2, INFRA track)

---

# RECONCILIATION: TWO VIEWS OF TRUTH

The system has TWO roadmap views that DISAGREE:

1. **PRISM-UNIFIED-MASTER-ROADMAP.md** (Apr 4): Shows 9 layers, 43 branches, 161 units — ALL marked [COMPLETE]. This reflects actual Claude session work building the platform.

2. **roadmap-index.json** (v8.5.0, 525 milestones): Shows 133/525 complete (25.3%). This is the RGS-tracked milestone system with granular envelopes.

**Resolution**: The Unified Master Roadmap L0-L8 work IS done — infrastructure, security, physics, manufacturing backends, business logic, knowledge pipelines, frontend wiring, and production readiness were all built. The roadmap-index tracks a BROADER scope including product tracks (SFC, PPG, CAM Kernel), domain-specific hardening, and feature verticals that remain.

**This v2 roadmap unifies both views.**

Current execution truth as of 2026-04-10: `H:/PRISM/mcp-server/web` is the only canonical frontend target. `H:/PRISM/web` remains a donor tree for selective FMERGE review and must not be treated as a second active frontend build.

---

# LANE LAUNCH STATUS (Updated 2026-04-12)

## Active Now — Main Seat
| Lane | Status | Notes |
|------|--------|-------|
| **Lane 0** | ACTIVE | Safety-critical. PP-H0 through PP-H6 + CWEDM-MS0 |
| **Lane 1** | ACTIVE | No Lane 0 dependency (D14 amendment). Can run in parallel |
| **Lane 2** | ACTIVE | MCAT-MS0 in_progress, CAMX-MS2 ready, S1-MS2 in_progress |
| **Lane 6** | READY | Depends on Lane 0 PP-H0, which is WIP |
| **Lane 7** | READY | Full EDM pipeline. Deps met |
| **Lane 8** | READY | Secondary processes (laser/waterjet) |

## Ready to Launch — Dedicated Seats (LAUNCH IMMEDIATELY)
| Lane | Status | Dependencies | Action |
|------|--------|--------------|--------|
| **Lane 3 (Video)** | **LAUNCH NOW** | VL-MS0 ✅ complete | Spin up Claude Seat #2 |
| **Lane 4 (PDF)** | **LAUNCH NOW** | CC-EXT-MS0/1 → can parallelize, RX-MS0 in_progress but not blocking | Spin up Claude Seat #3 |
| **Lane 5 (DB)** | **LAUNCH NOW** | HBK ✅ complete, MCAT-MS0 in_progress but not blocking first milestone | Spin up Claude Seat #4 |

**Why launch now?** Lanes 3-5 have been blocked for 44+ days despite dependencies being complete since 2026-02-27. Each lane runs on a DEDICATED Claude seat and can proceed independently. The JM DIE program archive (36,929 files) and Resources folder (128,000+ files, 60GB) are ready for extraction.

## Blocked Lanes
| Lane | Blocker | ETA |
|------|---------|-----|
| **Lane 9 (CAM Kernel)** | Needs CAMX-MS2+ | After Lane 2 CAMX track |
| **Lane 10 (QA)** | Post-feature hardening | Runs after feature milestones |

---

# TRACK STATUS SUMMARY (133 complete / 525 total)

## FULLY COMPLETE TRACKS (no remaining work)
| Track | Done | Description |
|-------|------|-------------|
| REM (6/6) | 100% | Safety-critical remediation |
| PP (9/9) | 100% | Post-processor pipeline (38 stages) |
| QS (7/7) | 100% | Canonical physics & quality synergy |
| HBK (12/12) | 100% | Machine handbook intelligence |
| HM-REV (14/14) | 100% | hyperMILL revision & integration |
| RT (2/2) | 100% | Real-time WebSocket infrastructure |
| VAR (2/2) | 100% | Stochastic physics extensions |
| VL (1/1) | 100% | Video learning engine |
| EMP (1/1*) | 100%* | Core employee/HR shell built; APPW fail-closed auth/mobile/commercial-truth hardening still required before release |
| CALC-HARDEN (1/1) | 100% | Calculator accuracy hardening |
| PIPELINE-VAR (1/1) | 100% | Per-block variability maximization |
| WEDM-INT (1/1) | 100% | WEDM integration wiring |

## MOSTLY COMPLETE TRACKS (>50%)
| Track | Done | Remaining |
|-------|------|-----------|
| BOX-AUDIT (9/10) | 90% | BOX-MS9: Program Intelligence Dashboard |
| SYS (6/8) | 75% | SYS-MS1, SYS-MS3 |
| CK (7/14) | 50% | 7 milestones: tool wear → process planning |
| PP-REV (5/8) | 63% | PP-REV-MS5..7 |
| F360-AP (4/9) | 44% | 5 milestones: probing → learning |
| CAMK (2/4) | 50% | CAMK-MS2, CAMK-MS3 |
| WEDM (3/3) | 100% | Done (but WEDM-HARDEN + WEDM-100PCT remain) |

## IN PROGRESS (6 milestones)
| ID | Track | Title |
|----|-------|-------|
| MCAT-MS0 | MCAT | Machine Catalog Convergence |
| WEDM-HARDEN-MS0 | WEDM-HARDEN | WEDM 20-Agent Scrutiny Remediation |
| CAMX-MS2 | CAMX | Controller & Machine Strategy Validation |
| CAMX-MS12 | CAMX | Feature-to-Strategy Intelligence |
| CAMX-V17-P0A | CAMX-v17 | Print Reading & CAD Validation |
| RX-MS0 | RX | Resource Archive Extraction Pipeline |

## NOT STARTED — BY DOMAIN (360 milestones)
| Domain | Milestones | Key Tracks |
|--------|------------|------------|
| CAM/Toolpath | 89 | CAMX(24), CAMX-v17(14), CCM(18), CK(7), CAMK(2), LATHE(11), LATHE-PRO(17) |
| Products/UI | 48 | L8(7), L9(3), L10(4), APPW(8), APP(1), S0-S4(9), PRISM-MAX(1), PRISM-PRODUCT(1) |
| Quality/Audit | 30 | QA(15), BENCH(5), ACP(10) |
| CAD/CAM Kernel | 19 | CC(12), CC-EXT(7) |
| Fusion 360 | 22 | F360(6), F360-AP(5), F360-FULL(8), F360-REV(11) |
| Business/ERP | 15 | BIZ(7), MF(6), BP(1), PPG-REAL(1) |
| Infrastructure | 26 | L0(5), L1(4), L2(5), L3(2), L4(2), L5(3), L6(2), L7(1), INFRA(1), DEVOPS(5) |
| Learning | 18 | LEARN(6), EIGC(12) |
| Tribal Knowledge | 31 | TK-MS0(4), TK-MS1(5), TK-MS2(6), TK-MS3(4), TK-MS4(6), TK-MS5(3), TK-MS6(3) |
| **KAR-UO (NEW)** | **14** | **KAR-MS0..MS7 (72 units) — Unified Orchestration + Knowledge Wiring** |
| hyperMILL | 18 | HM-KC(10), HM-PLUGIN(8) |
| Post-Processor | 12 | PP-MOAT(4), PP-REV(3), CPL(2), PPG-VAR(1), PCCA(5) |
| Science/Math | 12 | SCIMATH(8), SCI(3), MXU(12) |
| Other | 12 | ARCH(4), SYS(2), PROD(2), ULT(5), PIPE(1), etc. |

---

# ROADMAP ARCHITECTURE

## Lane Model (Parallel Execution Across Claude Seats)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRISM UNIFIED ROADMAP v2.5                             │
│                                                                             │
│  LANE 0: SAFETY CRITICAL              ← Main seat (you)                   │
│  LANE 1: FRONTEND CONVERGENCE         ← Main seat + Codex sync            │
│  LANE 2: CORE PLATFORM                ← Main seat                         │
│  LANE 3: VIDEO EXTRACTION             ← Dedicated Claude Seat #2          │
│  LANE 4: PDF & COURSE EXTRACTION      ← Dedicated Claude Seat #3          │
│  LANE 5: DATABASE EXPANSION           ← Dedicated Claude Seat #4          │
│  LANE 6: PROCESS HARDENING            ← Main seat (milling/lathe/wire)    │
│  LANE 7: FULL EDM ELECTRODE PIPELINE  ← Main seat (print→mill→sinker)    │
│  LANE 8: SECONDARY PROCESS PIPELINES  ← Main seat (laser/waterjet/sinker) │
│  LANE 9: CAM/CAD KERNEL               ← Main seat or future seat          │
│  LANE 10: QA & HARDENING              ← Any seat, post-feature            │
│  ...                                                                        │
│  LANE 18: TRIBAL KNOWLEDGE PROPAGATION ← Main seat (TK-MS0..MS6)          │
│  LANE 19: DEVOPS/INFRASTRUCTURE        ← Main or infra seat               │
│  LANE 20: KAR-UO (PRISM BRAIN)         ← Main seat (unified orchestration)│
│                                                                             │
│  Lanes 3, 4, 5 run FULLY PARALLEL on separate Claude seats                │
│  Lane 20 CONSUMES outputs from Lanes 3, 4, 5 — does not duplicate         │
│  Lanes 9, 10 run when upstream dependencies land                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# LANE 0: SAFETY CRITICAL
> **Priority**: P0 — MUST complete before any other lane advances
> **Seat**: Main
> **Dependencies**: None
> **Source**: PP-HARDENING-ROADMAP.md + CWEDM-CALCULATOR-WIRING-ROADMAP.md

## Branch L0-S1: Post-Processor Safety Hardening [PP-HARDENING]
**Milestones**: 7 | **Units**: 29 | **Sessions**: ~12
**Why**: 20-agent audit found 58 CRITICAL + 101 HIGH findings. M-code conflicts could crash real machines.

### PP-H0: Safety & M-Code Fixes (P0-CRITICAL) — 4 units, 2 sessions
```
SMART CONFIG: Role=CNC Safety Engineer + Physics Validator | Model=OPUS | Effort=MAXIMUM
KNOWLEDGE: Haas NGC manual, Siemens 840D, Mazak Smooth, Heidenhain TNC640, src/physics/constants.ts
INTENT: No M-code in PRISM conflicts with a safety-critical function on any supported controller
```
- U-PPH01: Fix CoolantControlConfigEngine M-code conflicts (M13/M7/M30/M29/M7.1)
- U-PPH02: Fix PostProcessorPipelineEngine physics errors (unit mismatch, hardcoded diameter)
- U-PPH03: Fix division-by-zero paths in 5 engines (SafeSpeedCalculator, FeedOptimizer, etc.)
- U-PPH04: Fix Heidenhain arc direction (G2/G3 both emit CC)
```
EXIT GATE: Zero M-code conflicts | Zero div-by-zero paths | All 1,323 tests pass
FORGE-TRIPLE: hook=pp-safety-mcode-guard | action=prism_validation:pp_safety_check | skill=/pp-safety-audit
```

### PP-H1: Validation Layer — 5 units, 2 sessions
### PP-H2: API & Error Handling — 4 units, 2 sessions
### PP-H3: Type Unification & Consistency — 4 units, 2 sessions
### PP-H4: Performance & State Management — 4 units, 2 sessions
### PP-H5: Test Hardening — 5 units, 2 sessions
### PP-H6: Product & UX Polish — 3 units, 1 session

## Branch L0-S2: WEDM Calculator Wiring [CWEDM]
**Milestones**: 1 | **Units**: 12 | **Sessions**: 5
**Why**: 51 backend actions + 19 engines sit ready. Calculator makes ZERO backend calls.

### CWEDM-MS0: Wire EDM Calculator → Backend — 12 units, 5 sessions
```
SMART CONFIG: Role=Full-Stack Wire EDM Engineer | Model=OPUS | Effort=HIGH
KNOWLEDGE: edmDispatcher (51 actions), calculatorPrismMode.ts, MachineRegistry wire EDM entries
INTENT: Wire EDM calculator tab is fully live — physics-backed solve, real costs, pass plans
```
- Session 1 (U-CWEDM01..03): API client + machine catalog + wire/tool catalog
- Session 2 (U-CWEDM04..06): Wire settings + multipass + parameter optimization
- Session 3 (U-CWEDM07..09): Cost estimation + wire break prediction + corner compensation
- Session 4 (U-CWEDM10..11): Taper solving + result display panel
- Session 5 (U-CWEDM12): Integration testing + livePhysics=true
```
EXIT GATE: livePhysics=true for wire_edm | All 51 actions callable | Cost no longer hardcoded $72/hr
FORGE-TRIPLE: hook=wedm-calc-live-guard | action=prism_edm:wedm_full_multipass | skill=/wedm-calc
```

---

# LANE 1: FRONTEND CONVERGENCE
> **Priority**: P1 — Two diverging frontends is unsustainable
> **Seat**: Main + Codex coordination
> **Dependencies**: None (can start immediately)
> **NOTE**: Codex is generating a frontend test plan. Coordinate via /rgs-sync.
>   BOTH web builds (PRISM/web/ and PRISM/mcp-server/web/) need to merge into ONE.

## Branch L1-MERGE: Frontend Unification
**Sessions**: ~4 | **New Track**: FMERGE

### FMERGE-MS0: Audit & Decide — 3 units, 1 session
```
SMART CONFIG: Role=Frontend Architect | Model=OPUS | Effort=HIGH
INTENT: Single canonical frontend with all pages from both apps
```
- U-FMERGE01: Diff both apps — catalog every page, component, hook, API module unique to each
  - Claude app (mcp-server/web/): 101 pages, 373 files
  - Codex app (web/): 108 pages, 531 files
  - Shared: ~85 pages | Claude-only: ~16 pages | Codex-only: ~23 pages
- U-FMERGE02: Decide canonical target (executed recommendation: `PRISM/mcp-server/web` — active routed ERP/business shell, protected-route posture, and APPW baseline source of truth)
  - Treat `PRISM/web/` as donor-only; absorb only the surviving donor manufacturing/product surfaces into the canonical app
- U-FMERGE03: Create migration plan — file-by-file merge checklist with API compatibility notes
```
EXIT GATE: Documented merge plan | Zero ambiguity on canonical app | API diff cataloged
```

### FMERGE-MS1: Execute Merge — 5 units, 2 sessions
- U-FMERGE04: Copy Claude-unique pages to canonical app, resolve import conflicts
- U-FMERGE05: Copy Claude-unique components (calculator/, operating-system/ fixtures)
- U-FMERGE06: Generate route inventory + backend consumer audit from live mounted vs dormant routes
- U-FMERGE06A: Publish page-level `mount|remap|waive` ledger for every surviving donor route dependency
- U-FMERGE07: Converge only required hooks, contexts, utils, and canonical client mappings; do not union-copy donor `api/` or `hooks/`
- U-FMERGE08: Run `prism_dev:build`, `prism_dev:test_smoke`, `route_health_audit`, and `auto_wiring_analyze`, then publish survivor proof or unchanged-target waiver
```
EXIT GATE: Single canonical app builds | Donor survivors or waivers are explicit | Route dependencies are mounted, remapped, or waived with proof | Tests pass
```

### FMERGE-MS2: Deprecate Old App — 2 units, 1 session
- U-FMERGE09: Update all build scripts, CLAUDE.md, package.json to point to canonical app
- U-FMERGE10: Archive non-canonical app (move to PRISM/archive/web-legacy/)
```
EXIT GATE: Only ONE web/ directory active | CI/CD updated | No broken references
FORGE-TRIPLE: hook=frontend-canonical-guard | action=prism_dev:frontend_health | skill=/app-health
```

---

# LANE 2: CORE PLATFORM
> **Priority**: P2 — Continue building the platform
> **Seat**: Main
> **Dependencies**: Lane 0 complete for safety-adjacent tracks

## Branch L2-MCAT: Machine Catalog Convergence [IN PROGRESS]
**Track**: MCAT | **Status**: in_progress
- MCAT-MS0: Machine Catalog Convergence for Calculator + Shop Profiles

## Branch L2-CAMX: CAM Exchange Pipeline
**Track**: CAMX + CAMX-v17 | **Milestones**: 40 (26+14) | **Sessions**: ~20
- CAMX-MS2 through CAMX-MS25: Controller validation, strategies, multi-axis
- CAMX-V17-P0A through CAMX-V17-P14: Print reading, physics hardening

## Branch L2-SCIMATH: Scientific Mathematics
**Track**: SCIMATH + SCI | **Milestones**: 12 (9+3) | **Sessions**: ~6
- SCIMATH-MS1..8: Tensor analysis, PDE solvers, spectral methods
- SCI-MS1..3: Sensor integration, signal processing

## Branch L2-BIZ: Business & ERP Hardening
**Track**: BIZ + MF + BP | **Milestones**: 14 (7+6+1) | **Sessions**: ~7

## Branch L2-F360: Fusion 360 Ecosystem
**Track**: F360 + F360-AP + F360-FULL + F360-REV | **Milestones**: 30 | **Sessions**: ~15

## Branch L2-HM: hyperMILL Ecosystem
**Track**: HM-KC + HM-PLUGIN | **Milestones**: 18 (10+8) | **Sessions**: ~9

## Branch L2-PP: Post-Processor Ecosystem
**Track**: PP-MOAT + PP-REV + CPL + PCCA | **Milestones**: 14 | **Sessions**: ~7

## Branch L2-INFRA: Infrastructure & Products
**Track**: L0-L10 + INFRA + ARCH | **Milestones**: 47 | **Sessions**: ~24

## Branch L2-LEARN: Learning & Intelligence
**Track**: LEARN + EIGC | **Milestones**: 18 (6+12) | **Sessions**: ~9
- LEARN-MS0: Content Ingestion Pipeline (ContentAutoTaggerEngine + KnowledgeDeduplicationEngine) — **2/6 units DONE** (roadmap-index shows not_started, INCORRECT — engines exist and are wired) **→ depends on KAR-MS0 for unified schema**
- LEARN-MS1: Video + Interactive Learning Wiring
- LEARN-MS2: Knowledge Graph Enrichment + Cross-Reference
- LEARN-MS3: Course Auto-Generation (CourseBuilderEngine exists, auto-gen from tribal clusters NOT done)
- LEARN-MS4: Feedback + Fleet Learning Wiring
- LEARN-MS5: Web UI — Knowledge Ingestion + Browser + Courses
- See **Lane 18** for the tribal knowledge propagation pipeline that builds ON TOP of LEARN infrastructure

---

# LANE 3: VIDEO EXTRACTION (Dedicated Claude Seat #2)
> **Priority**: P2-PARALLEL — Runs independently on its own seat
> **Seat**: Dedicated Claude seat #2
> **Dependencies**: VL-MS0 (complete), CC-MS1 (absorb)
> **New Track**: VID-EXT

## Briefing for Seat #2 Operator

This seat's sole mission is extracting manufacturing knowledge from video sources.

### VID-EXT-MS0: Video Pipeline Infrastructure — 4 units, 2 sessions
```
SMART CONFIG: Role=ML Engineer + Manufacturing Video Analyst | Model=OPUS | Effort=HIGH
KNOWLEDGE:
  ENGINES: VisionAnalysisEngine, VideoLearningEngine, ContentIngestionPipelineEngine,
           ContentAutoTaggerEngine, KnowledgeDeduplicationEngine, TranscriptEngine
  TRIBAL: TribalKnowledgeEngine (3,700+ tips), MachiningPlaybookEngine (296 rules)
INTENT: Operator can point PRISM at any machining video and get structured knowledge out
SKILLS: /video-learn, /video-follow, /video-replay, /youtube-transcript
```

- U-VID01: **Video Source Registry** — Create registry with 20+ machining YouTube channels:
  Titans of CNC, NYC CNC, Edge Precision, Haas, This Old Tony, Abom79, Clickspring,
  Mazak, DMG MORI, Okuma, Sandvik Coromant, Kennametal, ISCAR, etc.
- U-VID02: **Transcript Extraction Pipeline** — Batch pipeline from VideoSourceRegistry.
  YouTube Data API v3, rate-limited, with timestamps + speaker detection.
- U-VID03: **Visual Frame Analysis** — Key frame extraction at operation transitions.
  OCR on DRO readouts for RPM, feed, DOC. Tool change + part flip detection.
- U-VID04: **Knowledge Extraction & Tagging** — Transcript + frame data → TribalKnowledge entries.
  Auto-tag: material, operation, machine, technique, problem/solution pairs.
  Dedup against existing 3,700+ entries.
```
EXIT GATE: ≥100 new tribal knowledge entries | Zero duplicates
FORGE-TRIPLE: hook=video-knowledge-quality-gate | action=prism_knowledge:video_extract | skill=/video-extract
```

### VID-EXT-MS1: Channel-Scale Extraction — 5 units, 2 sessions
- U-VID05: Batch channel crawler (500-1,000 videos from top 5 channels)
- U-VID06: Manufacturer training videos (Sandvik Academy, Kennametal, Walter, Seco)
- U-VID07: Conference & webinar extraction (IMTS, AMT, SME)
- U-VID08: Shop floor video processing (user-uploaded phone recordings)
- U-VID09: Knowledge quality audit + confidence scoring

### VID-EXT-MS2: Learning Academy Integration — 4 units, 2 sessions
- U-VID10: Auto-course generator from video knowledge clusters
- U-VID11: Interactive video-follow lessons with pause points + quizzes
- U-VID12: Continuous ingestion daemon (weekly channel crawl via cron)
- U-VID13: Analytics dashboard (videos processed, entries generated, coverage gaps)

---

# LANE 4: PDF & COURSE EXTRACTION (Dedicated Claude Seat #3)
> **Priority**: P2-PARALLEL — Runs independently on its own seat
> **Seat**: Dedicated Claude seat #3
> **Dependencies**: CC-EXT-MS0/MS1 (absorb), RX-MS0 (in_progress)
> **New Track**: PDF-EXT

## Briefing for Seat #3 Operator

Extract knowledge from machining PDFs (handbooks, catalogs, papers) and MIT OCW courses.

### PDF-EXT-MS0: Machining Source Pipeline — 5 units, 2 sessions
```
SMART CONFIG: Role=Technical Librarian + Manufacturing Data Scientist | Model=OPUS | Effort=MAXIMUM
KNOWLEDGE:
  ENGINES: ContentIngestionPipelineEngine, BlueprintOCREngine, ContentAutoTaggerEngine
  DATA: MaterialRegistry (6,346), FormulaRegistry (499 formulas → target 750+)
  REFERENCE: Machinery's Handbook, Sandvik/Kennametal/Walter/ISCAR catalogs
INTENT: Every major machining reference book's data is queryable in PRISM
```

- U-PDF01: **PDF Source Registry** — Seed with priority sources:
  Handbooks (P0): Machinery's Handbook, Kalpakjian, Shaw, Boothroyd, SME Handbook
  Catalogs (P1): Sandvik, Kennametal, Walter, ISCAR, Mitutoyo, Renishaw
  Standards (P2): ISO 513/3685/8688, ASME Y14.5, ISO 1101
- U-PDF02: **Table Extraction Engine** — OCR + table detection for cutting data tables
- U-PDF03: **Formula Extraction Engine** — Detect + parse formulas → FormulaRegistry format
- U-PDF04: **Material Property Extraction** — Enrich MaterialRegistry with handbook data
- U-PDF05: **Handbook Batch Processing** — Process Machinery's Handbook + Kalpakjian + Shaw
```
EXIT GATE: ≥50 new formulas | ≥500 materials enriched | ≥80% handbook tables extracted
FORGE-TRIPLE: hook=pdf-extraction-quality | action=prism_knowledge:pdf_extract | skill=/pdf-extract
```

### PDF-EXT-MS1: Catalog Extraction Sprint — 4 units, 2 sessions
- U-PDF06: Sandvik Main Catalog cutting data → merge with 2,418 existing entries
- U-PDF07: Kennametal + Walter + ISCAR catalogs → merge with existing entries
- U-PDF08: Standards extraction (thread data, GD&T, tool classification, surface finish)
- U-PDF09: Quality audit & merge — resolve conflicts, apply authority ranking

### PDF-EXT-MS2: MIT & Academic Course Extraction — 5 units, 2 sessions
```
INTENT: MIT-level manufacturing science is embedded in PRISM's physics and learning engines
```
- U-PDF10: **MIT OCW Course Registry** — Catalog 12+ relevant courses:
  2.008 Design & Mfg II, 2.810 Mfg Processes, 2.830J Control of Mfg,
  2.852 Mfg Systems Analysis, 3.051J Materials Processing, 3.032 Mechanical Behavior,
  2.72 Elements of Mechanical Design, 2.737 Mechatronics, 6.041 Probabilistic Systems,
  18.06 Linear Algebra
- U-PDF11: Lecture note extraction → formulas, problem/solution pairs, diagrams
- U-PDF12: Academic paper pipeline (Merchant, Kienzle, Taylor, Altintas, Oxley)
- U-PDF13: Course-to-Academy bridge — MIT course structure → PRISM learning paths
- U-PDF14: Formula calibration sprint — validate PRISM constants against published values

---

# LANE 5: DATABASE EXPANSION (Dedicated Claude Seat #4)
> **Priority**: P2-PARALLEL — Runs independently on its own seat
> **Seat**: Dedicated Claude seat #4
> **Dependencies**: HBK (complete), MCAT-MS0 (in_progress)
> **New Track**: DB-EXP

## Briefing for Seat #4 Operator

Expand machine, controller, tool holder, tooling, and fixturing databases to production completeness.

### DB-EXP-MS0: Machine Database Expansion — 5 units, 2 sessions
```
SMART CONFIG: Role=CNC Machine Data Specialist | Model=OPUS | Effort=HIGH
DATA: MachineRegistry (~2,107 machines) | TARGET: 5,000+ machines
INTENT: Any machine a user owns is in PRISM with full specs
```
- U-DB01: Machine manufacturer census (Tier 1: Haas/Mazak/DMG/Okuma/Makino/Doosan/Hurco/Fanuc/Brother/Matsuura)
- U-DB02: Haas complete catalog (40+ models: VMC/HMC/Lathe/Mill-Turn/5-Axis)
- U-DB03: Mazak + DMG MORI + Okuma catalogs (~150 models)
- U-DB04: Tier 2 & 3 machine bulk import
- U-DB05: Machine data quality audit + torque curve verification

### DB-EXP-MS1: Controller Database Expansion — 4 units, 2 sessions
```
TARGET: 200+ controller models with full capability maps + G-code dialect maps
```
- U-DB06: Controller family census (Fanuc/Siemens/Mitsubishi/Haas/Mazak/Okuma/Heidenhain/Hurco)
- U-DB07: G-code dialect maps — every deviation from ISO 6983 per controller
- U-DB08: Alarm code database expansion (target: 10,000+ codes)
- U-DB09: Controller capability matrix (RTCP, NURBS, rigid tapping, etc.)

### DB-EXP-MS2: Tool Holder Database — 4 units, 2 sessions
```
TARGET: 10,000+ tool holders covering all major systems
```
- U-DB10: Tool holder system census (CAT/BT/HSK/Capto taper × holder types × manufacturers)
- U-DB11: Holder geometry extraction (length, diameter, clamping range, balance grade, runout)
- U-DB12: Holder-to-spindle compatibility matrix + adapter combinations
- U-DB13: Tool assembly builder (tool + holder + extension → stickout, MoI, max RPM)

### DB-EXP-MS3: Cutting Tool Database Enrichment — 4 units, 2 sessions
```
DATA: 71,000+ tools | TARGET: 100,000+ with complete cutting data per ISO group
```
- U-DB14: Cutting data gap analysis (how many tools have Vc/fz/ap per ISO group?)
- U-DB15: Manufacturer cutting data import (from Lane 4 PDF extraction)
- U-DB16: Physics-based cutting data generation (Kienzle/Taylor/chatter → recommendations)
- U-DB17: Tool catalog unification + search index

### DB-EXP-MS4: Fixturing & Workholding Database — 4 units, 2 sessions
```
TARGET: 5,000+ fixtures covering all workholding methods
```
- U-DB18: Fixture type taxonomy (vises/chucks/collets/tombstones/pallets/vacuum/magnetic)
- U-DB19: Clamping force calculator data per fixture type
- U-DB20: Fixture selection engine data (50+ decision rules from tribal knowledge)
- U-DB21: Zero-point pallet system database (System 3R, Erowa, Lang, Jergens, Mate)

---

# LANE 6: PROCESS HARDENING + JM DIE PROGRAM UPGRADE PIPELINE
> **Priority**: P1 — Harden processes using JM Die's real programs as training + validation
> **Seat**: Main
> **Dependencies**: Lane 0 complete for safety-adjacent; Lane 12 MS1 for tooling data
> **Tracks**: MILL-HARD, LATHE-HARD, WEDM-HARD, PROG-UPGRADE
> **Program Archive**: 22,811 total programs — 1,358 newer (Fusion baseline, mid-2025 to Jan 2026), 21,453 older (to upgrade)

## JM Die Program Upgrade Strategy
```
BASELINE: 1,358 newer programs (Fusion 360, mid-2025 to Jan 2026) have accurate S/F parameters.
  - 669 .MIN lathe programs + 689 .mcx-8 CAM files
  - These programs serve as GROUND TRUTH for PRISM engine validation.
TARGET:   21,453 older programs — written by varying skill levels, suboptimal S/F.
  - Parse each program → extract operations, tools, S/F, DOC
  - Compare against PRISM physics engines (Kienzle, Taylor, chatter, deflection)
  - Generate optimized replacement parameters
  - Output: upgraded program + delta report (what changed and why)
VALIDATION: Cross-check PRISM-optimized outputs against the 1,358 baseline programs.
  If PRISM's recommendations match the newer programs within 10%, engines are validated.
  If they diverge, investigate — either the program or the engine needs correction.
TRAINING: Feed validated program→result pairs into PRISM's learning pipeline for continuous improvement.
```

## Branch L6-MILL: Milling Capability Hardening
**New Track**: MILL-HARD | **Milestones**: 8 | **Sessions**: ~12 | **Micro-sessions**: 24

### MILL-HARD-MS0: Core Milling Physics Audit
**Micro-sessions**: 4 | **Compaction point**: after each micro-session
```
SMART CONFIG: Role=Milling Process Engineer + Physics Specialist | Model=OPUS | Effort=MAXIMUM
MACHINES: Haas VF-2 (PRE-NGC), Haas OM-2 (PRE-NGC 30K), Hurco VM30i (WinMAX), Okuma M460V-5AX (OSP), Roku-Roku HC 658-II (Fanuc 31i)
```
- μS-01: Validate SpeedFeedOrchestrator for ISO P (steel) on all 5 mills — endmill, face mill, ball nose
  ⟶ COMPACT: save validated S/F tables per machine×material
- μS-02: Validate ISO M (stainless) + K (cast iron) + N (aluminum) on all 5 mills
  ⟶ COMPACT: save material coverage matrix
- μS-03: Chatter SLD per spindle — Haas VF-2 8,100RPM, OM-2 30,000RPM, Hurco 12,000RPM, Okuma 15,000RPM, Roku-Roku 30,000RPM
  ⟶ COMPACT: save SLD data per machine
- μS-04: Deflection validation — boring bar, long-reach, face mill on each machine
  ⟶ COMPACT: save deflection limits per tool×machine
```
EXIT GATE: <5% deviation from manufacturer data | SLD for all 5 spindles | deflection bounds set
```

### MILL-HARD-MS1: 3-Axis Milling Strategies
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-05: Trochoidal/adaptive clearing — chip thinning comp, engagement angle, radial DOC on Haas VF-2 + Hurco
  ⟶ COMPACT: validated adaptive clearing parameters
- μS-06: Pocket milling strategies — 2D pocket, island avoidance, rest milling on all machines
  ⟶ COMPACT: pocket strategy matrix
- μS-07: Contour/profile milling — climb vs conventional, stepover, finish pass on D2/S7/A2 steels
  ⟶ COMPACT: contour strategy per material
```
EXIT GATE: 3-axis strategies validated on JM Die tool steel programs
```

### MILL-HARD-MS2: 4-Axis + Indexing Strategies
**Micro-sessions**: 2 | **Compaction point**: after each
- μS-08: 4th axis rotary indexing — tombstone/fixture plate work on Haas VF-2 + Hurco VM30i
  ⟶ COMPACT: indexing strategy per machine
- μS-09: Wrap milling / cylindrical milling — C-axis interpolation for electrode profiles
  ⟶ COMPACT: rotary interpolation params

### MILL-HARD-MS3: 5-Axis Milling (Okuma M460V-5AX)
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-10: RTCP/TCP validation — tool tip point control, pivot length compensation
  ⟶ COMPACT: RTCP config verified
- μS-11: 3+2 positional machining — tilt angle optimization, singularity avoidance
  ⟶ COMPACT: 3+2 strategy tables
- μS-12: Simultaneous 5-axis — tool vector control, swarf milling, blade machining for electrode contours
  ⟶ COMPACT: 5-axis validated on Okuma
```
EXIT GATE: 5-axis outputs verified against Okuma OSP simulation | RTCP proven
```

### MILL-HARD-MS4: HSM / High-Speed Milling (Roku-Roku + Haas OM-2)
**Micro-sessions**: 2 | **Compaction point**: after each
- μS-13: HSM parameter tuning — feed lookahead, corner decel, arc tolerance per controller
  - Haas OM-2: G187 P1/P2/P3, 30K RPM graphite + aluminum
  - Roku-Roku: Fanuc 31i-B5 AICC/Nano smooth, 30K RPM graphite electrodes
  ⟶ COMPACT: HSM profiles per machine
- μS-14: Controller-specific HSM names — G187 (Haas), UltiMotion (Hurco), Super-NURBS/NAVI-G (Okuma) [CS38]
  ⟶ COMPACT: controller HSM dialect map

### MILL-HARD-MS5: Milling Program Baseline Extraction
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-15: Parse 1,358 newer Fusion programs — extract operations, tools, S/F, DOC per operation
  ⟶ COMPACT: baseline S/F database from Fusion programs
- μS-16: Parse 100 sample older programs — identify S/F deviations from PRISM physics
  ⟶ COMPACT: deviation report + optimization delta
- μS-17: Generate program upgrade recommendations for the 100 samples — validate against baseline
  ⟶ COMPACT: validated upgrade pipeline + accuracy metrics
```
EXIT GATE: Baseline extracted from 1,358 programs | 100-program sample upgraded | accuracy measured
```

### MILL-HARD-MS6: Batch Program Upgrade (All Milling Programs)
**Micro-sessions**: 3 | **Compaction point**: after each batch
- μS-18: Batch upgrade Haas VF-2 + OM-2 programs (estimated ~500 programs)
  ⟶ COMPACT: upgraded program count + delta stats
- μS-19: Batch upgrade Hurco VM30i + Okuma M460V programs
  ⟶ COMPACT: upgraded program count + delta stats
- μS-20: Batch upgrade Roku-Roku programs (972 .mcx-8 electrode programs)
  ⟶ COMPACT: upgraded program count + delta stats
```
EXIT GATE: ALL milling programs upgraded | delta reports generated | training pairs captured
```

## Branch L6-LATHE: Lathe Capability Hardening
**New Track**: LATHE-HARD | **Milestones**: 7 | **Sessions**: ~14 | **Micro-sessions**: 28
**Machines**: 7 Okuma lathes — L300-M, L200E-M, LNC8, Crown L1060, L400II-E, LB3000EX, Multus B250II

### LATHE-HARD-MS0: Core Lathe Physics Audit
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-L01: CSS (Constant Surface Speed) validation per Okuma spindle — verify S/F across diameter range
  ⟶ COMPACT: CSS tables per machine
- μS-L02: Turning force model validation (Kienzle for turning) — OD rough, ID bore, face
  ⟶ COMPACT: turning force validation results
- μS-L03: Tool nose radius compensation (TNRC) validation — G41/G42 for all 7 Okuma controllers
  ⟶ COMPACT: TNRC verified per controller variant

### LATHE-HARD-MS1: Horizontal/Vertical Turning
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-L04: OD roughing strategies — depth of cut optimization, chip breaking, constant load
  ⟶ COMPACT: OD roughing params per material
- μS-L05: ID boring strategies — boring bar selection, deflection limits, chatter at depth
  ⟶ COMPACT: boring strategy per bar L/D ratio
- μS-L06: Facing strategies — face mill vs turn, surface finish prediction
  ⟶ COMPACT: facing strategy matrix

### LATHE-HARD-MS2: Threading (All Types)
**Micro-sessions**: 4 | **Compaction point**: after each
- μS-L07: Single-point threading — NPT, UN, metric, Acme on Okuma (G76/G92)
  ⟶ COMPACT: thread cycle params per standard
- μS-L08: Thread whirling — high-speed thread production for long screws/bolts
  ⟶ COMPACT: whirl parameters
- μS-L09: Multi-start threading — fastener industry spec (JM Die core competency)
  ⟶ COMPACT: multi-start validated
- μS-L10: Thread milling (on Multus B250II with live tooling)
  ⟶ COMPACT: thread mill params + C-axis sync

### LATHE-HARD-MS3: Live Tooling + C-Axis (L300-M, L200E-M, Multus)
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-L11: Cross-drilling + tapping — live tool speed/feed, pecking, rigid tapping
  ⟶ COMPACT: live tool params per machine
- μS-L12: C-axis milling — hexagon milling, flat milling, keyway on fastener parts
  ⟶ COMPACT: C-axis interpolation validated
- μS-L13: Off-center features — polar interpolation for eccentric features (trilobe prep)
  ⟶ COMPACT: polar interpolation validated

### LATHE-HARD-MS4: Mill-Turn (Multus B250II)
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-L14: B-axis milling — angular features, compound angle drilling
  ⟶ COMPACT: B-axis strategies
- μS-L15: Sub-spindle operations — part transfer, back-working, simultaneous cutting
  ⟶ COMPACT: sub-spindle sync validated
- μS-L16: Y-axis machining — off-center milling, cross-milling, keyway
  ⟶ COMPACT: Y-axis offset strategies

### LATHE-HARD-MS5: Specialized Lathe Operations (JM Die Specific)
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-L17: Grooving + parting — insert selection, chip control, cutoff optimization
  ⟶ COMPACT: groove/part params per material
- μS-L18: Hard turning — CBN/ceramic inserts on D2/S7 (Rc 58-62), finish turning after heat treat
  ⟶ COMPACT: hard turning validated
- μS-L19: Big bore turning (LB 3000EX) — heavy roughing, large bar stock, vibration control
  ⟶ COMPACT: big bore params validated

### LATHE-HARD-MS6: Lathe Program Baseline + Batch Upgrade
**Micro-sessions**: 4 | **Compaction point**: after each batch
- μS-L20: Parse 669 newer Fusion .MIN programs — extract baseline S/F per operation
  ⟶ COMPACT: lathe baseline S/F database
- μS-L21: Parse 100 older .MIN samples — identify S/F deviations
  ⟶ COMPACT: deviation report
- μS-L22: Batch upgrade 5,297 older lathe .MIN programs — apply PRISM physics
  ⟶ COMPACT: upgraded count + delta stats (batch 1: ~2,500)
- μS-L23: Complete batch upgrade (remaining ~2,800) + validation against baseline
  ⟶ COMPACT: full upgrade complete + accuracy metrics
```
EXIT GATE: ALL 5,297 lathe programs upgraded | <10% deviation from Fusion baseline | training pairs captured
FORGE-TRIPLE: hook=lathe-physics-guard | action=prism_turning:validate_program | skill=/lathe-audit
```

## Branch L6-WIRE: Wire EDM Capability Hardening
**New Track**: WEDM-HARD | **Milestones**: 5 | **Sessions**: ~8 | **Micro-sessions**: 16
**Machine**: Mitsubishi FA10S (W21FAS-2, W30FAS-2, W31MV-2 controllers)

### WEDM-HARD-MS0: Wire EDM Physics Audit
**Micro-sessions**: 2 | **Compaction point**: after each
- μS-W01: Multipass optimization — rough/skim/finish pass count, offset progression, surface finish per material
  ⟶ COMPACT: pass schedule per material×thickness
- μS-W02: Wire break prediction model validation — tension, flush, power vs material hardness
  ⟶ COMPACT: wire break model validated

### WEDM-HARD-MS1: Controller Dialect Hardening (3 Controllers)
**Micro-sessions**: 3 | **Compaction point**: after each controller
- μS-W03: W21FAS-2 dialect — verify E-settings, offset tables, condition codes
  ⟶ COMPACT: W21 dialect verified
- μS-W04: W30FAS-2 dialect — taper cutting, UV axis interpolation
  ⟶ COMPACT: W30 dialect verified
- μS-W05: W31MV-2 dialect — latest gen, MV mode, advanced conditions
  ⟶ COMPACT: W31 dialect verified

### WEDM-HARD-MS2: Wire EDM Strategy Hardening
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-W06: Punch cutting — slug retention, tab placement, corner radius compensation for die punches
  ⟶ COMPACT: punch strategy per material
- μS-W07: Die cutting — clearance angle, draft, taper for die openings
  ⟶ COMPACT: die cut strategy
- μS-W08: Profile cutting — contour following, approach/retract, common line optimization
  ⟶ COMPACT: profile strategy

### WEDM-HARD-MS3: Wire Type Optimization
**Micro-sessions**: 2 | **Compaction point**: after each
- μS-W09: MD+ Pro II wire — optimal conditions per material×thickness matrix
  ⟶ COMPACT: MD+ Pro II database
- μS-W10: MV1200S wire — fine finish conditions, skim pass optimization
  ⟶ COMPACT: MV1200S database

### WEDM-HARD-MS4: Wire EDM Program Baseline + Batch Upgrade
**Micro-sessions**: 4 | **Compaction point**: after each batch
- μS-W11: Parse 188 newer Fusion wire programs — extract baseline conditions per material
  ⟶ COMPACT: wire EDM baseline database
- μS-W12: Parse 50 older .mcx-8/.MCX wire samples — identify condition deviations
  ⟶ COMPACT: deviation report
- μS-W13: Batch upgrade Esprit wire programs — apply PRISM physics
  ⟶ COMPACT: upgraded Esprit count + delta stats
- μS-W14: Batch upgrade Mastercam wire programs (1,779 .MCX + 2,191 .mcx-8)
  ⟶ COMPACT: full wire upgrade complete
```
EXIT GATE: ALL wire programs upgraded | conditions validated against Mitsubishi tech tables | Esprit + Mastercam covered
FORGE-TRIPLE: hook=wedm-physics-guard | action=prism_edm:wedm_validate_program | skill=/wedm-audit
```

## Branch L6-PROG: Program Upgrade Pipeline Engine
**New Track**: PROG-UPGRADE | **Milestones**: 3 | **Sessions**: ~4 | **Micro-sessions**: 8

### PROG-UPGRADE-MS0: Program Parser + Analyzer
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-P01: Build unified program parser — .MIN (Okuma), .nc/.tap (generic G-code), .hmc/.hnc (Haas)
  Extract: tool calls, S/F per operation, DOC, material (from comments/headers), cycle times
  ⟶ COMPACT: parser handles all JM Die program formats
- μS-P02: Build S/F deviation scorer — compare extracted S/F against PRISM physics recommendations
  Output: per-operation delta (% too fast/slow, risk level, suggested correction)
  ⟶ COMPACT: scorer validated on 50 known programs
- μS-P03: Build program age/quality classifier — identify amateur vs experienced programs
  Signals: conservative S/F, excessive dwell, unnecessary retracts, missing M-codes
  ⟶ COMPACT: classifier trained on JM Die program corpus

### PROG-UPGRADE-MS1: Batch Upgrade Engine
**Micro-sessions**: 2 | **Compaction point**: after each
- μS-P04: Build batch upgrade pipeline — parse → analyze → recommend → generate upgraded program
  Preserve: program structure, tool numbers, work offsets, safety moves
  Upgrade: S/F per operation, DOC optimization, feed override suggestions
  ⟶ COMPACT: batch pipeline validated on 100-program sample
- μS-P05: Build delta report generator — before/after comparison with rationale
  Output per program: estimated cycle time reduction, tool life improvement, risk assessment
  ⟶ COMPACT: delta reports validated

### PROG-UPGRADE-MS2: Training Feedback Loop
**Micro-sessions**: 3 | **Compaction point**: after each
- μS-P06: Feed validated program pairs (original + upgraded) into PRISM learning pipeline
  ⟶ COMPACT: training corpus seeded
- μS-P07: Build accuracy tracker — PRISM recommendation vs Fusion baseline deviation over time
  ⟶ COMPACT: accuracy metrics dashboard
- μS-P08: Continuous improvement — update physics constants when real shop data confirms corrections
  ⟶ COMPACT: calibration loop wired
```
EXIT GATE: 22,811 programs parsed | 21,453 programs upgraded | training feedback loop active
FORGE-TRIPLE: hook=program-upgrade-safety | action=prism_cam:batch_upgrade_programs | skill=/program-upgrade
```

---

# LANE 7: FULL EDM ELECTRODE PIPELINE (Print → Mill → Sinker)
> **Priority**: P2 — YOUR shop's real workflow
> **Seat**: Main
> **Dependencies**: Lane 5 (machine data for your machines), Lane 6 (milling hardened)
> **New Track**: ELEC-PIPE
> **INPUT**: "Automated Program_Corrected 5-25" Excel macro on H:\ drive
> **MACHINES**: Roku-Roku, Haas VF-2, Haas OM-2, Hurco VM30i, Okuma M460V-5AX → Mitsubishi EA12S

## Context
You have a complete electrode manufacturing workflow currently driven by an Excel macro
("Automated Program_Corrected 5-25") that outputs to SolidWorks. The goal is to replicate
this pipeline in PRISM with Fusion 360 as the CAD/CAM target instead of SolidWorks.

### ELEC-PIPE-MS0: Excel Macro Analysis & Pipeline Design — 4 units, 2 sessions
```
SMART CONFIG: Role=EDM Process Engineer + Automation Architect | Model=OPUS | Effort=MAXIMUM
KNOWLEDGE:
  INPUT: "Automated Program_Corrected 5-25.xlsm" on H:\ drive
  ENGINES: EdmProgramAssemblerEngine, SinkerEdmParameterEngine, ElectrodeDesignEngine,
           PostProcessorPipelineEngine, AutoProgramOrchestratorEngine
  MACHINES: Mitsubishi EA12S (sinker EDM), Roku-Roku (graphite mill),
            Haas VF-2, Haas OM-2, Hurco VM30i, Okuma M460V-5AX (electrode milling)
  MATERIALS: Graphite (EDM-3, EDM-200, POCO AF-5), Copper (C110, C145 tellurium),
             Copper-Tungsten (CW75, CW80)
INTENT: Full automated pipeline: 2D print → electrode design → CAM in Fusion → mill program →
        sinker EDM program → quality verification. Replaces the Excel macro entirely.
```

- U-ELEC01: **Excel Macro Reverse Engineering** — Read and analyze "Automated Program_Corrected 5-25"
  Excel macro. Document EVERY calculation it performs:
  - Electrode sizing (overburn/underburn/spark gap compensation)
  - Orbit/vector calculations for sinker paths
  - Roughing/finishing electrode count determination
  - Electrode material selection logic
  - Burn time estimation
  - Z-axis compensation calculations
  Map each Excel formula to an equivalent PRISM engine or identify gaps.
  ```
  FILES_CREATED: src/data/electrode-macro-analysis.json
  EXIT GATE: 100% of Excel calculations documented | Gap list complete
  ```

- U-ELEC02: **Electrode Design Engine** — Build/extend ElectrodeDesignEngine to replicate
  Excel macro logic:
  - Input: cavity geometry (from Fusion 360 model or 2D print)
  - Spark gap calculation per material pair (graphite→steel, copper→steel, etc.)
  - Electrode sizing: rough electrode (larger gap), finish electrode (tight gap)
  - Number-of-electrodes decision (wear ratio × cavity depth → electrode count)
  - Electrode draft angles, clearance faces, mounting features
  - Output: electrode solid model parameters for Fusion 360
  ```
  FILES_CREATED: src/engines/ElectrodeDesignPipelineEngine.ts
  FILES_MODIFIED: src/engines/ElectrodeDesignEngine.ts
  ```

- U-ELEC03: **Fusion 360 Electrode CAM Bridge** — Instead of SolidWorks output:
  - Generate Fusion 360 CAM setup for electrode milling
  - Machine selection logic: which of your 5 mills runs this electrode?
    - Roku-Roku: primary graphite mill (if available)
    - Haas OM-2: small electrodes (30K RPM, high precision)
    - Okuma M460V: complex 3D electrodes (5-axis)
    - Haas VF-2 / Hurco VM30i: larger electrodes, general purpose
  - Tool selection: graphite-specific endmills (diamond-coated, uncoated carbide)
  - Strategy: HSM roughing + rest milling + finishing with small stepovers
  - Speed/feed: graphite-specific Kienzle coefficients (kc1.1 for graphite = ~300 MPa)
  ```
  FILES_CREATED: src/engines/ElectrodeFusion360BridgeEngine.ts
  ```

- U-ELEC04: **Pipeline Architecture** — Design the 8-stage electrode pipeline:
  ```
  Stage 1: PRINT READ    — Import 2D print or 3D model of the CAVITY (not electrode)
  Stage 2: CAVITY ANALYZE — Extract cavity features, depth, draft, corner radii
  Stage 3: ELECTRODE DESIGN — Size electrode(s) with spark gap, orbits, stock
  Stage 4: CAD GENERATE   — Create electrode model in Fusion 360
  Stage 5: CAM GENERATE   — Generate milling program for electrode (your 5 mills)
  Stage 6: POST PROCESS   — Generate G-code for selected mill's controller
  Stage 7: SINKER PROGRAM — Generate Mitsubishi EA12S sinker EDM program
  Stage 8: QUALITY VERIFY — Electrode dimensions, burn parameters, safety check
  ```
  ```
  EXIT GATE: Pipeline architecture document complete | All 8 stages defined
  ```

### ELEC-PIPE-MS1: Electrode Milling Pipeline — 5 units, 2 sessions
```
INTENT: Electrode milling programs generated automatically for any of your 5 mills
```

- U-ELEC05: **Graphite Machining Physics** — Validate/add graphite-specific physics:
  - Graphite cutting forces (much lower than metal — no chip, dust extraction needed)
  - Tool wear model for graphite (abrasive wear dominant, NOT crater/flank like metal)
  - Surface finish prediction for graphite (different mechanism than metal cutting)
  - Dust extraction requirements (mandatory for graphite — health hazard)
  - Feed/speed optimization for graphite grades (EDM-3, EDM-200, POCO AF-5)

- U-ELEC06: **Machine-Specific Post-Processors** — Verify post output for each mill:
  - Roku-Roku: controller dialect, graphite-specific M-codes (dust collector on/off)
  - Haas VF-2: NGC post, verify S/F clamps for graphite
  - Haas OM-2: NGC high-speed post, 30K RPM graphite parameters
  - Hurco VM30i: WinMAX post, graphite parameters
  - Okuma M460V: OSP-P300 5-axis post, RTCP for 3D electrodes

- U-ELEC07: **Electrode CAM Strategy Engine** — Automated CAM strategy selection:
  - Simple prismatic electrodes: 2.5D pocket + profile
  - Complex 3D electrodes: adaptive roughing + rest + ball-nose finish
  - Multi-electrode setups: pallet loading, electrode numbering
  - Thin rib electrodes: reduced DOC, climb milling, spring pass

- U-ELEC08: **Setup Sheet & Electrode Traveler** — Auto-generate:
  - Electrode setup sheet (machine, fixture, tools, speeds/feeds, cycle time)
  - Electrode traveler card (electrode #, cavity #, rough/finish, dimensions, tolerance)
  - Electrode inspection checklist (critical dimensions to verify before burn)

- U-ELEC09: **End-to-End Test — Electrode Milling** — Test with a real electrode geometry:
  Input: sample cavity model → electrode design → CAM → G-code for each mill.
  Verify: G-code safe to run, cycle time reasonable, tool selection correct.
```
EXIT GATE: G-code generated for all 5 mills | Graphite physics validated | Setup sheets auto-generated
```

### ELEC-PIPE-MS2: Sinker EDM Programming (Mitsubishi EA12S) — 4 units, 2 sessions
```
SMART CONFIG: Role=Sinker EDM Process Engineer | Model=OPUS | Effort=MAXIMUM
KNOWLEDGE:
  MACHINE: Mitsubishi EA12S — controller: Mitsubishi CNC, format: proprietary sinker EDM codes
  PROCESS: Orbit/vector burn, jump/flush, power settings, electrode wear compensation
  REFERENCE: Mitsubishi EA12S programming manual, Excel macro burn parameter tables
INTENT: Complete sinker EDM program generated from electrode design — drop onto EA12S and burn
```

- U-ELEC10: **Mitsubishi EA12S Controller Dialect** — Map the EA12S programming format:
  - Burn condition codes (E-settings: power, on-time, off-time, servo voltage)
  - Orbit patterns (circular, square, vector, planetary)
  - Jump/flush parameters (retract height, flush time, flush pressure)
  - Electrode wear compensation (corner wear, end wear, side wear)
  - Z-axis depth control (depth sensor, contact detection, adaptive depth)
  - Multi-electrode sequences (electrode change, re-reference, re-flush)
  Build EA12S-specific post-processor module.

- U-ELEC11: **Sinker Burn Parameter Engine** — Replicate Excel macro's burn parameter logic:
  - Material pair selection (graphite→P20, graphite→S7, graphite→A2, copper→carbide, etc.)
  - Roughing parameters: high power, high removal rate, accept wear
  - Finishing parameters: low power, fine surface finish, minimal wear
  - Electrode area compensation (large electrodes need different flush than small)
  - Depth-based parameter switching (automatic parameter change at depth thresholds)
  Cross-reference against Mitsubishi recommended settings.

- U-ELEC12: **Sinker Program Generator** — Complete program output for EA12S:
  - Header (workpiece setup, electrode reference, flush settings)
  - Rough burn sequence (electrode approach, burn to depth, orbit, jump/flush)
  - Finish burn sequence (different electrode, tighter orbit, fine parameters)
  - End sequence (retract, report actual depth, flush cycle)
  Include: estimated burn time, electrode wear prediction, surface finish prediction (Ra/VDI)

- U-ELEC13: **End-to-End Test — Full Pipeline** — Complete test:
  2D print → cavity analysis → electrode design → Fusion 360 CAD →
  electrode milling program (Haas VF-2) → sinker EDM program (EA12S) →
  setup sheets + travelers for both operations.
  Verify entire pipeline matches Excel macro outputs for a known test case.
```
EXIT GATE: EA12S programs match Excel macro output | Full pipeline tested end-to-end
FORGE-TRIPLE: hook=electrode-pipeline-safety | action=prism_edm:electrode_full_pipeline | skill=/electrode-pipe
```

---

# LANE 8: SECONDARY PROCESS PIPELINES (Laser, Waterjet, Full Sinker)
> **Priority**: P3 — Build out remaining secondary processes
> **Seat**: Main
> **Dependencies**: Lane 6 process hardening, Lane 7 sinker foundation
> **Tracks**: New SEC-PROC track + existing EDM dispatchers

## Branch L8-LASER: Laser Machining Pipeline
**New Track**: LASER-PIPE | **Milestones**: 3 | **Sessions**: ~4

### LASER-PIPE-MS0: Laser Process Foundation — 4 units, 2 sessions
```
SMART CONFIG: Role=Laser Process Engineer | Model=OPUS | Effort=HIGH
KNOWLEDGE:
  ENGINES: LaserProgramAssemblerEngine (exists — verify 4 types × 7 dialects)
  PROCESSES: Laser cutting, laser marking, laser welding, laser drilling
  MACHINES: Trumpf, Mazak Optiplex, Bystronic, Amada, Mitsubishi
INTENT: Complete laser machining pipeline from DXF/DWG to G-code
```
- U-LASER01: Laser cutting parameter database (material × thickness × gas → power/speed/focus)
- U-LASER02: Nesting optimization engine (sheet utilization, part orientation, common-line cutting)
- U-LASER03: Laser-specific post-processors (Trumpf, Mazak, Bystronic, Amada formats)
- U-LASER04: Laser quality prediction (HAZ width, kerf width, edge quality, dross)

### LASER-PIPE-MS1: Laser Advanced Features — 3 units, 1 session
- U-LASER05: Tube/pipe laser cutting support
- U-LASER06: 3D laser cutting (5-axis) for formed parts
- U-LASER07: Laser marking/engraving program generation

### LASER-PIPE-MS2: Laser Integration & Testing — 3 units, 1 session
- U-LASER08: Wire to existing dispatchers + frontend page
- U-LASER09: Setup sheet + job traveler for laser operations
- U-LASER10: End-to-end test: DXF → nest → laser program → post-process
```
FORGE-TRIPLE: hook=laser-safety-guard | action=prism_cam:laser_generate | skill=/laser-program
```

## Branch L8-WATER: Waterjet Pipeline
**New Track**: WATER-PIPE | **Milestones**: 3 | **Sessions**: ~4

### WATER-PIPE-MS0: Waterjet Process Foundation — 4 units, 2 sessions
```
KNOWLEDGE:
  ENGINES: WaterjetProgramAssemblerEngine (exists — verify AWJ/pure/taper/depth × 6 dialects)
  MACHINES: Flow Mach series, OMAX, Wardjet, Bystronic ByJet
INTENT: Complete waterjet pipeline from geometry to cutting program
```
- U-WATER01: Waterjet cutting parameter database (material × thickness → pressure/speed/abrasive)
- U-WATER02: Piercing strategy engine (static, dynamic, low-pressure, pre-pierce)
- U-WATER03: Taper compensation engine (natural taper correction for thick materials)
- U-WATER04: Waterjet nesting + lead-in/lead-out optimization

### WATER-PIPE-MS1: Waterjet Advanced + Integration — 4 units, 2 sessions
- U-WATER05: Multi-head waterjet support
- U-WATER06: 5-axis waterjet (3D cutting, bevel compensation)
- U-WATER07: Waterjet quality prediction (taper, surface roughness, striation)
- U-WATER08: End-to-end test + dispatcher wiring + frontend
```
FORGE-TRIPLE: hook=waterjet-safety-guard | action=prism_cam:waterjet_generate | skill=/waterjet-program
```

## Branch L8-SINKER: Full Sinker EDM Pipeline (Beyond Electrodes)
**New Track**: SINKER-FULL | **Milestones**: 2 | **Sessions**: ~3

### SINKER-FULL-MS0: General Sinker EDM — 4 units, 2 sessions
```
KNOWLEDGE: Builds on Lane 7 electrode pipeline. Extends to non-electrode sinker operations.
```
- U-SINK01: Die-sinking EDM for mold cavities (beyond simple electrodes)
- U-SINK02: Micro-EDM for small features (hole popping, micro-cavities)
- U-SINK03: Sinker EDM with copper and copper-tungsten electrodes (different parameters)
- U-SINK04: Adaptive sinker EDM — real-time parameter adjustment based on gap voltage

### SINKER-FULL-MS1: Sinker EDM Testing + Integration — 3 units, 1 session
- U-SINK05: Full test suite for Mitsubishi EA12S programs
- U-SINK06: Wire to frontend sinker EDM page
- U-SINK07: Sinker EDM knowledge base (tribal knowledge from your EA12S experience)
```
FORGE-TRIPLE: hook=sinker-edm-safety | action=prism_edm:sinker_full | skill=/sinker-program
```

---

# LANE 9: CAM/CAD KERNEL
> **Priority**: P3 — Builds on Lanes 2-5 outputs
> **Seat**: Main seat or future dedicated seat
> **Tracks**: CC (12), CC-EXT (7), CCM (18), CAMK (2), CK (7)
> **Total**: 46 remaining milestones, ~23 sessions

Execute via `/rgs continue <ID>` when upstream dependencies land.
CC-EXT-MS0/MS1 partially absorbed by Lane 4. CC-MS1 partially absorbed by Lane 3.

---

# LANE 10: QA & HARDENING
> **Priority**: P3 — Continuous, runs after features land
> **Tracks**: QA (15), BENCH (5), ACP (10)
> **Total**: 30 milestones, ~15 sessions

Execute QA milestones after each major lane completion.

---

# LANE 11: QUALITY & METROLOGY [NEW — from Agent 14 scrutiny]
> **Priority**: P2 — Critical gap identified by 20-agent audit (score 18/100)
> **Seat**: Main or dedicated seat
> **Dependencies**: Lane 0 (safety), Lane 6 (process hardening)
> **New Track**: QM

### QM-MS0: SPC Engine — 4 units, 2 sessions
- U-QM01: X-bar/R chart engine (real-time SPC monitoring)
- U-QM02: CUSUM + EWMA advanced charts
- U-QM03: Cpk/Ppk process capability calculation
- U-QM04: Control limit auto-computation from historical data

### QM-MS1: Gauge R&R — 3 units, 1 session
- U-QM05: ANOVA-based gauge R&R
- U-QM06: %GRR and ndc calculation
- U-QM07: Measurement system analysis reporting

### QM-MS2: FAI Generator — 3 units, 1 session
- U-QM08: AS9102 Form 1 (Part Number Accountability)
- U-QM09: AS9102 Form 2 (Product Accountability)
- U-QM10: AS9102 Form 3 (Characteristic Accountability)

### QM-MS3: GD&T Interpreter — 3 units, 2 sessions
- U-QM11: ASME Y14.5 tolerance stack-up analysis
- U-QM12: Datum reference frame construction
- U-QM13: Feature control frame parsing + validation

### QM-MS4: CMM Program Bridge — 3 units, 1 session
- U-QM14: PC-DMIS program export
- U-QM15: Calypso program export
- U-QM16: CMM measurement result import + SPC feed

### QM-MS5: Compliance Tracker — 3 units, 1 session
- U-QM17: AS9100 / ISO 13485 / NADCAP / IATF checklist engine
- U-QM18: Audit finding tracker + CAPA management
- U-QM19: Certification expiry alerting

### QM-MS6: Quality Feedback Loop — 3 units, 1 session
- U-QM20: Measured vs predicted recalibration pipeline
- U-QM21: Automatic physics constant refinement from inspection data
- U-QM22: Quality trend dashboarding

### QM-MS7: Quality Dispatcher Expansion — 3 units, 1 session
- U-QM23: Expand qualityDispatcher to 30+ actions
- U-QM24: Wire all QM engines to frontend quality pages
- U-QM25: End-to-end quality pipeline test (inspection → SPC → CAPA → recalibrate)

---

# LANE 12: JM DIE SHOP DATA [NEW — canonical test shop buildout]
> **Priority**: P1 — Required for all downstream validation
> **Seat**: Main
> **Dependencies**: None (can start immediately)
> **New Track**: JMDIE

### JMDIE-MS0: Employee Database — 3 units, 1 session
- U-JM01: Seed EmployeeEngine with JM Die staff (operators, setup techs, programmers, inspectors)
- U-JM02: Skill matrix per employee (machine certifications, process capabilities)
- U-JM03: Shift assignments + labor rate tiers

### JMDIE-MS1: Tool Holder & Tooling Inventory — 4 units, 2 sessions
- U-JM04: Import tool holder inventory per machine (CAT40 for Haas/Hurco, BT40 for Okuma, HSK for Roku-Roku)
- U-JM05: Import cutting tool crib inventory (endmills, drills, inserts, taps per holder)
- U-JM06: Tool life tracking setup per tool/material/operation combination
- U-JM07: Magazine layout per machine (which tool in which station)

### JMDIE-MS2: Material Stock & Prints — 4 units, 2 sessions
- U-JM08: Import material stock inventory (M2, D2, S7, A2, H13, graphite grades, copper, carbide)
- U-JM09: Standard stock sizes per material (bar diameters, plate thicknesses, block sizes)
- U-JM10: Customer print library organization (index 20,157 files by customer/part/revision)
- U-JM11: Print-to-machine routing rules (which prints go to which machines)

### JMDIE-MS3: Post Processor Validation — 3 units, 2 sessions
- U-JM12: Validate 21 PRISM-enhanced posts against known-good production programs
- U-JM13: Compare post output to Mark's custom Haas post (production baseline)
- U-JM14: Promote validated posts from "testing" → "production" status

---

# LANE 13: JM DIE ARCHIVE INTELLIGENCE PIPELINE [NEW — 13-agent design]
> **Priority**: P1 — Unlocks $724K+/yr capacity recovery + competitive intelligence
> **Seat**: Main + parallel agents
> **Dependencies**: Lane 12 MS0 (employee data), Lane 6 (process hardening uses outputs)
> **Source**: 13-agent scrutiny (2026-04-10) — Parser, Process, CAM, Fastener, Wire EDM, Electrode, Data, ML, Automation, BI, Quality, Training specialists
> **Archive**: 36,928 files, 290 customers, 16,947 .MIN lathe programs, 8,977 Mastercam files

## Phase A: Foundation (must complete first)

### ARC-MS0: Unified Program Parser — 11 μS
```
The parser is the foundation for ALL downstream intelligence.
88% of mineable data is in .MIN files (Okuma OSP dialect).
```
- μS-A01: ParsedProgram schema + UnifiedProgramParserEngine shell + format detection
- μS-A02: OkumaOSPParser enhancement — full ParsedProgram output for 16,947 .MIN files
- μS-A03: OkumaMultusParser sub-dialect (TD= format, G15 H01, W-axis, sub-spindle M-codes)
- μS-A04: ISO/NC auto-detect + router (detect Okuma-in-.nc vs true ISO)
- μS-A05: HurcoParser enhancement — ParsedProgram for 43 .hnc files
- μS-A06: CycleTimeComputationEngine — distance-based time for all text formats
- μS-A07: HMC 7z decompressor — extract NC + XML from hyperMILL archives
- μS-A08: MCX-8 metadata extractor enhancement — extend to MCX/MCX-6, cross-reference index
- μS-A09: Esprit binary scanner — string extraction for 28 files
- μS-A10: Batch orchestrator + progress tracking (parseArchive with concurrency)
- μS-A11: Validation + test suite (10+ cases per parser)
```
EXIT GATE: 16,947 .MIN files parsed | 7,092 .mcx-8 indexed | all formats handled
```

### ARC-MS1: ETL Data Pipeline — 12 μS
```
Ingest 36,928 files into PostgreSQL with structured metadata, searchable index.
Schema: archive_files, gcode_analysis, cad_metadata, customer_aliases, duplicate_groups.
Full ingest estimated at 8-10 minutes on SSD.
```
- μS-A12: Schema migration 018 (archive_ingest_pipeline)
- μS-A13: FileScanner engine — recursive walk, stat, sha256, path parse
- μS-A14: PartNumberExtractor — customer-specific regex (ATF, AGRATI, ITW, etc.)
- μS-A15: GCodeAnalyzer — lightweight .MIN/.NC/.HNC parser (first 500 lines)
- μS-A16: CadMetadataExtractor — STEP/STL/IPT OLE parse
- μS-A17: DuplicateDetector — sha256 grouping, canonical selection (MATTHEW programs dedup)
- μS-A18: CustomerNormalizer — alias map (CLENDENIN = CLENDENIN BROTHERS = CLENDENIN BROTHERS, INC)
- μS-A19: AgeClassifier + SearchIndexBuilder — materialized view with full-text search
- μS-A20: IncrementalWatcher — chokidar file watcher for new files
- μS-A21: Data quality dashboard (/archive-quality web page)
- μS-A22: Dispatcher + integration tests
- μS-A23: PersistenceBridge registration
```
EXIT GATE: 36,928 files indexed | part numbers extracted | duplicates flagged | search works
```

## Phase B: Core Intelligence (parallel tracks after Phase A)

### ARC-MS2: Gold Standard Benchmarker — 5 μS
```
1,358 Fusion programs = ground truth. 21,453 older programs = upgrade targets.
The DELTA between these IS the intelligence.
```
- μS-B01: Fusion baseline S/F extraction (parse 1,358 programs → baseline database)
- μS-B02: Legacy parameter comparison (S/F deviation scorer per operation)
- μS-B03: Program quality scorer (0-100 score per program from 15+ features)
- μS-B04: Prioritized upgrade list (ROI-ranked: biggest cycle time savings first)
- μS-B05: Accuracy tracker dashboard (PRISM recommendation vs baseline deviation)
```
EXIT GATE: All 36,928 programs scored | top 500 upgrade candidates identified
```

### ARC-MS3: Machine-Specific Intelligence (Okuma Fleet) — 8 μS
```
Extract proven operating envelopes from 16,947 .MIN programs across 7 Okuma lathes.
```
- μS-B06: OSP dialect fingerprinting — auto-detect which controller a .MIN targets
- μS-B07: Parameter envelope histograms — (S, F, DOC) per machine from G50/G96/G85 data
- μS-B08: Canned cycle vs manual profiling intelligence (G85/G87 in 65% of programs)
- μS-B09: Live tooling utilization analyzer (M110/M109 in ~4%, mill keywords in 16%)
- μS-B10: Turret station standardization (T01=rough, T02=finish, T11=cutoff proven in 2,068 files)
- μS-B11: CSS optimization tables — archive-proven SFM per material (S150 cutoff = 1,576 programs)
- μS-B12: M-code sequence patterns (5 standard sequences, Markov chain validation)
- μS-B13: Big bore vs standard routing (X<1" = 60% of work, X>4.6" = LB3000EX only)
```
EXIT GATE: Parameter envelopes for all 7 Okuma lathes | turret standards documented | CSS atlas built
```

### ARC-MS4: Customer & Business Intelligence — 10 μS
```
Turn folder structures and timestamps into business analytics.
```
- μS-B14: Customer revenue concentration (Pareto — top 30 customers by weighted volume)
- μS-B15: Customer growth/decline trends (quarterly sparklines, 8-quarter trend slope)
- μS-B16: Job complexity distribution (Tier 1/2/3 by operation count)
- μS-B17: Machine utilization proxy (program count → estimated hours vs available)
- μS-B18: Seasonal patterns (month-of-year histogram, seasonality index)
- μS-B19: Customer churn detection (Active/At-Risk/Dormant/Churned classification)
- μS-B20: Cross-sell opportunity detection (customer-capability matrix gaps)
- μS-B21: Average order value estimation (complexity × rate × estimated cycle time)
- μS-B22: New customer acquisition rate (first-file date per customer by year)
- μS-B23: Product mix analysis (punches vs dies vs electrodes vs wire profiles trend)
```
EXIT GATE: Business dashboard with all 10 analytics | churn list actionable | cross-sell prioritized
```

## Phase C: Domain Intelligence (after Phase B)

### ARC-MS5: Wire EDM Intelligence — 18 μS
```
8 capabilities for the Mitsubishi FA10S (3 controller variants, 2 wire types).
```
- μS-C01: Archive census — index all 4,058 wire EDM files with mcx8-reader metadata
- μS-C02: Cut condition optimizer per material×thickness (D2, carbide, graphite)
- μS-C03: Wire break predictor (8-factor risk model, controller-variant-aware)
- μS-C04: Skim pass optimizer (D2 vs carbide Ra targeting, Klocke model)
- μS-C05: Die corner strategy (12-point, hex, 6-lobe, Torx — 7 standard profiles)
- μS-C06: Controller-specific taper intelligence (W21/W30/W31 capability matrix)
- μS-C07: Wire consumption & cost estimator (per-job with break recovery overhead)
- μS-C08: Slug retention strategy (punch profiles — tab placement + dissolution)
- μS-C09: Esprit vs Mastercam comparison (28 pairs — which CAM produces better results?)
- μS-C10..C18: Integration tests, dispatcher wiring, validation against Mitsubishi tech tables

### ARC-MS6: Electrode Pipeline Intelligence — 15 μS
```
10 capabilities from 489 electrode files + 972 Roku-Roku programs.
```
- μS-C19: Electrode geometry classifier (prismatic, 3D, trilobe, thread form, ribbed, hex)
- μS-C20: Machine routing logic (Roku-Roku vs Okuma 5AX vs OM-2 by electrode type)
- μS-C21: Graphite vs copper decision engine (workpiece material → electrode material)
- μS-C22: Rougher/finisher electrode pairing (naming convention parser + sizing rules)
- μS-C23: Wafer die code decoder (WAFER880X334X145.MIN → parametric geometry)
- μS-C24: Electrode-to-cavity traceability (link electrode programs to die programs)
- μS-C25: Electrode cost model (material + milling time + burn time + wear)
- μS-C26: Trilobe-specific intelligence (3-fold symmetry, lobe height, HSM templates)
- μS-C27: System 3R WorkPartner queue integration (pallet assignment, robot cycle)
- μS-C28: Burn parameter database (Mitsubishi EA12S/EA12D condition capture)
- μS-C29..C33: Integration tests, traceability validation, cost model calibration

### ARC-MS7: Fastener Tooling Domain Engines — 34 μS
```
10 engines that understand WHAT the machined parts DO in service.
No generic platform has this — it makes PRISM the only system that knows
die→header→fastener performance chain.
```
- μS-C34..C37: DieWearLifeEngine (Archard wear + Coffin-Manson fatigue + forming force)
- μS-C38..C40: PunchGeometryOptimizerEngine (stress concentration, column buckling, impact)
- μS-C41..C42: DiePunchClearanceEngine (springback + thermal expansion + cold work)
- μS-C43..C47: HeaderStationSequencingEngine (strain budget, preform design, volume conservation)
- μS-C48..C50: ElectrodeWearCompensationEngine (VWR, corner wear, Z-comp for Mitsubishi)
- μS-C51..C53: CarbideGradeSelectionEngine (WC-Co composition vs impact resistance)
- μS-C54..C56: HeatTreatRoutingEngine (D2/M2/S7/A2/H13 full time-temperature profiles)
- μS-C57..C59: ThreadRollingDieDesignEngine (blank diameter, rolling force, surface hardening)
- μS-C60..C63: WaferDieCodeEngine (parametric generator + reverse parser)
- μS-C64..C67: FastenerGDTEngine (ASME B18.2.1 → die tolerance with springback compensation)

## Phase D: Automation & Learning (after Phase C)

### ARC-MS8: Shop Floor Automation Workflows — 20 μS
```
8 workflows connecting archive data to real shop operations.
```
- μS-D01..D03: Repeat order recall (archive search indexer + setup sheet matcher + UI)
- μS-D04..D07: Similar part suggestion (PartSimilarityEngine — G-code feature extraction + scoring)
- μS-D08..D11: Program version control (ProgramVersionEngine — hash, version, machine tracking)
- μS-D12..D16: DNC file transfer (protocol abstraction — FTP/serial/network per machine)
- μS-D17..D20: Live job tracking (state machine + dashboard + OEE feed)

### ARC-MS9: ML Models & Training Feedback — 25 μS
```
5 ML pipelines trained on JM Die's program corpus.
Practical ML for a 15-person shop — XGBoost, not transformers.
```
- μS-D21..D23: G-code feature extractor (shared infrastructure for all models)
- μS-D24..D29: Program quality scorer (15+ features, ordinal regression, 0-100 scale)
- μS-D30..D33: Speed/feed recommender (XGBoost, material×operation×tool×machine → S/F)
- μS-D34..D37: Tool selection recommender (Random Forest per operation type)
- μS-D38..D42: Cycle time predictor (LightGBM, log-transformed, R²>0.85 target)
- μS-D43..D45: Customer order predictor (survival analysis, churn logistic regression)

### ARC-MS10: Quality Intelligence — 19 μS
```
8 capabilities building a closed-loop quality system.
```
- μS-D46..D48: Tolerance extraction from 272 .idw + 225 .pdf drawings
- μS-D49..D50: Inspection plan generator (feature → instrument mapping, 10:1 discrimination)
- μS-D51..D53: FAI automation (AS9102 Forms 1/2/3 auto-populated)
- μS-D54..D55: Wire EDM offset SPC (X-bar/R charts, Western Electric rules on offset drift)
- μS-D56..D57: Die life prediction from reorder interval patterns
- μS-D58..D59: Electrode inspection protocol (spark gap back-calculation)
- μS-D60..D61: Surface finish correlation (skim count vs Ra — diminishing returns analysis)
- μS-D62..D64: Dimensional feedback loop (deviation classification → correction recommendation)

### ARC-MS11: Knowledge Capture & Training — 23 μS
```
Turn 20+ years of implicit knowledge into explicit, teachable intelligence.
```
- μS-D65..D67: Best practice extraction (Mark's programs vs others — delta reports)
- μS-D68..D70: Common mistakes database (batch anti-pattern scanner → top 10 mistakes)
- μS-D71..D72: Operator skill profiling (per-operator radar chart from program analysis)
- μS-D73..D75: Training path generator (12-week progression using real archive programs)
- μS-D76..D78: Program revision journal ("why did this change?" with semantic diff)
- μS-D79..D82: Interactive archive learning (natural language search across 20K programs)
- μS-D83..D85: Tribal knowledge miner (pattern → MachiningPlaybook rules, 5+ occurrence threshold)
- μS-D86..D87: Knowledge gap detector (3D matrix: machine × material × operation heat map)

---

# LANE 13 EXECUTION PRIORITY

```
CRITICAL PATH: Phase A (23 μS) → Phase B (23 μS) → Phase C (67 μS) → Phase D (87 μS)
TOTAL: 200 micro-sessions across 12 milestones

Phase A is MANDATORY before anything else — the parser and ETL pipeline are the foundation.
Phase B tracks are INDEPENDENT and can run in parallel (4 tracks simultaneously).
Phase C builds on B outputs — can start per-track as its dependencies complete.
Phase D is the capstone — automation, ML, quality, and training use everything above.

ESTIMATED ANNUAL VALUE (from 13-agent analysis):
  $724K+  capacity recovery from parameter optimization (21,453 program upgrades)
  $50-100K  engineering time savings (quoting, programming, setup)
  $30-50K   scrap reduction (chatter, deflection, electrode wear)
  $20-40K   tool inventory optimization
  ────────
  $824K-914K  total estimated annual value for a 15-person die shop
```

---

# LANE 14: MACHINE-SPECIFIC INTELLIGENCE [NEW — 10-agent findings 2026-04-11]
> **Priority**: P1 — Unlocks UltiMotion (25-40% cycle time reduction), machine-specific optimizers
> **Seat**: Main
> **Dependencies**: Lane 13 Phase A (parser + ETL)
> **Source**: Haas NGC, Hurco WinMAX, Mastercam, hyperMILL specialist agents

## MACH-MS0: Haas NGC Intelligence — 7.25 μS
- μS-H01: G187 smoothing inventory (37 programs, all P3 finish mode — extend to all programs)
- μS-H02: Tool magazine standardization (T10/T14/T16 workhorses across 10+ programs)
- μS-H03: OM-2 vs VF-2 classifier (RPM + tool size → auto-route to correct machine)
- μS-H04: Mark's custom post delta analysis (G0 dogleg, G53 retract, auto G187 — document canonical config)
- μS-H05: Setup sheet parsing (12 Fusion HTML setup sheets → structured data extraction)
- μS-H06: Offset management (parse NEW HAAS OFFSETS.xlsx → offset validation engine)
- μS-H07: Macro template library (4 parametric G-code templates from QUEUE/)
```
KEY FINDING: Probing infrastructure is built into Mark's custom post but never used.
ROI of Renishaw probe on VF-2: enables in-process WCS verification, reduces first-article scrap.
```

## MACH-MS1: Hurco WinMAX Intelligence — 4.5 μS
- μS-HR01: UltiMotion activation analysis (G64 zero-usage despite PRISM v11 post support)
  **THIS IS THE SINGLE BIGGEST UNTAPPED GAIN: 25-40% cycle time reduction on 3D adaptive**
  Target: AGRATI 9102741 OP2 (122,400 lines of adaptive toolpath)
- μS-HR02: WinMAX M-code cleanup (strip unnecessary M33/M35/M13 rotary codes on 3-axis jobs)
- μS-HR03: Post migration engine (all 14 .hnc use STOCK Autodesk post — 0% PRISM adoption)
- μS-HR04: Rigid tapping normalization (strip unnecessary M29 — Hurco rigid taps natively)
- μS-HR05: HurcoUltiMotionOptimizerEngine (G64 + G05.3 + dynamic feed + chip thinning)
```
EXIT GATE: UltiMotion enabled on all Hurco programs | PRISM v11 post adopted | 25%+ cycle time reduction proven
```

## MACH-MS2: Mastercam Archive Mining — 12.5 μS
- μS-MC01: Technology table mining (Mitsubishi condition refs from 3,700+ wire EDM .mcx-8)
- μS-MC02: Toolpath strategy inventory (which Mastercam strategies are actually used?)
- μS-MC03: MCX-8 to MIN cross-reference (link CAM projects to posted G-code)
- μS-MC04: Wire EDM condition extraction from MCX-8 binary (historical cutting parameter DB)
- μS-MC05: Mastercam version migration analysis (1,779 MCX legacy files at risk)
- μS-MC06: Material database from embedded Mastercam material names
- μS-MC07: Machine definition extraction (validate Mastercam machine sim configurations)
- μS-MC08: NCI file analysis (raw toolpath data if companion files exist)
- μS-MC09: Post processor identification (which Mastercam posts serve which machines)
- μS-MC10: MastercamProjectBridgeEngine (unified metadata import into PRISM)
```
KEY FINDING: Wire EDM condition extraction from MCX-8 creates JM Die's tribal knowledge DB.
80% of wire jobs likely use 5-10 conditions out of 200+ available.
```

## MACH-MS3: hyperMILL Intelligence — 15 μS
- μS-HM01: Cycle template analysis (2,876 .cyc files — ALL are probing cycles, not machining)
- μS-HM02: Post version audit (all 4 posts are hyperPOST 2021.2 — 3+ years old, upgrade needed)
- μS-HM03: Tool holder library (1,442 DXF = MST HSK-A63 catalog → collision envelope extraction)
- μS-HM04: Training content ingestion (3-day course + Training Tools.db → PRISM learning system)
- μS-HM05: Strategy-to-machine capability mapping (from .def files)
- μS-HM06: $hyperMILL_* variable catalog (175 unique variables → merge into Parameter Catalog)
- μS-HM07: Definition file parser (machine/controller config from 43 .def files)
- μS-HM08: hyperMILL Project Template Generator (30-60 min → 5 min per job setup)
- μS-HM09: hyperMILL vs Fusion 360 routing logic (complex → hyperMILL, simple → Fusion)
```
KEY FINDING: All 4 hyperMILL posts are 2021.2 vintage. Upgrading to 2025.x could improve
5-axis cycle time 5-15% via better TCPM, SuperNurbs output, and collision avoidance.
```

---

# LANE 15: SETUP OPTIMIZATION & AUTOMATION [NEW — Setup Specialist Agent]
> **Priority**: P1 — 35-50% setup time reduction, 30-50% first-article scrap reduction
> **Seat**: Main
> **Dependencies**: Lane 13 Phase A (parser)
> **Source**: Setup Optimization Specialist agent (21 μS total)

## SETUP-MS0: Foundation (parallel tracks) — 11 μS
- μS-S01..S03: Setup sheet auto-generation from G-code (tool list, offsets, chuck config)
- μS-S04..S05: Standard turret kit definitions (3-4 kits cover 80%+ of lathe work)
- μS-S06..S07: Bar feeder setup intelligence (collet sizing, remnant optimization)
- μS-S08..S09: Fixture library indexing (catalog 112+ setup files, 29+ Inventor fixtures)
- μS-S10..S11: Work offset management (G54-G59 standardization, drift detection, conflict alerts)

## SETUP-MS1: Intelligence Layer — 6 μS
- μS-S12..S13: Setup time estimation from program complexity (5-tier model)
- μS-S14..S15: First-article risk prediction (0-100 score, 15+ features)
- μS-S16: Quick-change tooling ROI analysis (per-station payback calculation)

## SETUP-MS2: Automation Layer — 4 μS
- μS-S17..S19: Similar-setup batching optimizer (minimize setup changes, respect due dates)
- μS-S20..S21: Digital setup sheet with QR code (phone-scannable, operator annotations, revision tracking)
```
EXIT GATE: Setup time reduced 35-50% | First-article prediction active | QR setup sheets deployed
ESTIMATED VALUE: $27K/yr setup time + $20K/yr first-article scrap + $20K/yr capacity unlock = $67K/yr
```

---

# LANE 16: DIGITAL TWIN & VISUALIZATION [NEW — Digital Twin Agent]
> **Priority**: P2 — Shop floor visibility, capacity simulation, what-if analysis
> **Seat**: Main
> **Dependencies**: Lane 13 (archive data), Lane 15 (setup data)
> **Source**: Digital Twin Architect agent (26 μS total)

## TWIN-MS0: Core Visualization — 10 μS
- μS-T01..T03: Virtual shop floor layout (21 machines positioned, work envelopes, magazine views)
- μS-T04..T06: Toolpath visualization (Three.js WebGL, feed rate color gradient, block playback)
- μS-T07..T09: Virtual tool magazine (turret/magazine per machine, swap list generation)
- μS-T10: Machine state model (idle/setup/running/maintenance from timestamps)

## TWIN-MS1: Simulation & Analysis — 9 μS
- μS-T11..T14: Program simulation (CNCSimulationPipelineEngine → 3D collision check before machine send)
- μS-T15..T17: Capacity simulation ("add 2nd wire EDM" → Monte Carlo throughput + payback)
- μS-T18..T19: Production replay (animate historical shop activity from 8 years of timestamps)

## TWIN-MS2: What-If Scenario Engine — 7 μS
- μS-T20..T22: What-if P&L impact (slider-based: change rate/material/cycle time → waterfall chart)
- μS-T23..T24: Sensitivity spider chart (which parameter has most leverage on margin?)
- μS-T25..T26: Multi-job scenario aggregation + export
```
KEY FINDING: 2nd Wire EDM ROI = 18.5 month payback ($90K used machine).
WEDM-01 at 94% utilization → 47% with 2nd machine. Queue drops from 4.2 days to 0.3 days.
```

---

# LANE 17: SUPPLY CHAIN & SCHEDULING INTELLIGENCE [NEW — Material + Scheduling Agents]
> **Priority**: P2 — Material cost optimization + production scheduling
> **Seat**: Main
> **Dependencies**: Lane 13 (archive data), Lane 12 (employee data)
> **Source**: Supply Chain Agent (14 μS) + Scheduling Agent (18 μS) = 32 μS total

## SUPPLY-MS0: Material Intelligence — 14 μS
- μS-M01..M02: Material usage volume estimator (how much D2/M2/carbide/graphite per year?)
- μS-M03: Bar stock size optimizer (histogram of bar diameters → standardize inventory)
- μS-M04: Graphite grade usage by customer and electrode type
- μS-M05..M06: Customer-material demand map (which customers always need carbide?)
- μS-M07: Material cost impact analyzer (if D2 up 20%, what's the annual hit?)
- μS-M08: Reorder point intelligence (usage rate × lead time → auto-alerts)
- μS-M09: Standard stock size catalog (part geometry → smallest standard bar/plate/block)
- μS-M10: Material substitution opportunity finder (D2 → A2 where applicable)
- μS-M11: Waste & remnant tracker (chip volume, bar utilization, remnant reuse matching)
- μS-M12: Vendor consolidation analyzer (projected $75-250K savings)
```
KEY FINDING: Material comments are rare (10/2,734 say "1030 Steel" = Mastercam default).
Tier 3 (customer-folder association) and Tier 4 (SFM reverse-engineering) carry the classification load.
```

## SCHED-MS0: Scheduling Intelligence — 18 μS
- μS-SC01..SC02: Machine loading heat map (actual utilization per machine per week from timestamps)
- μS-SC03: Queue depth analyzer (WEDM-01 = critical bottleneck, avg 4.2 day wait)
- μS-SC04..SC05: Setup batching optimizer (minimize setup changes across similar jobs)
- μS-SC06..SC07: Due date estimator (Monte Carlo with P50/P75/P95 confidence intervals)
- μS-SC08..SC09: Electrode job router (mill→burn→wire multi-machine DAG with critical path)
- μS-SC10: Rush job impact analyzer (insert rush → show what gets pushed back)
- μS-SC11: Overtime/outsource trigger (threshold alerts + cost comparison)
- μS-SC12..SC13: Seasonal capacity planner (8-year timestamp analysis → maintenance window scheduling)
- μS-SC14: Machine investment ROI engine (2nd wire EDM: M/M/1 queueing → 18.5mo payback)
- μS-SC15..SC16: Daily machine dispatch engine (morning assignment sheet with tooling pre-stage)
```
EXIT GATE: Daily dispatch sheet generated | Electrode routing automated | Wire EDM bottleneck quantified
KEY FINDING: Wire EDM at 94% utilization. 83% of electrode jobs wait >2 days for wire.
2nd wire EDM payback: 18.5 months at $90K used. STRONG BUY recommendation.
```

---

# 23-AGENT COST REDUCTION SUMMARY [NEW — 2026-04-11]

| # | Opportunity | Annual Savings (Est.) | Realistic Y1 | Source Agent |
|---|---|---|---|---|
| 1 | S/F optimization on 21,453 legacy programs | $372,955 | $150,000 | Cost Reduction |
| 2 | UltiMotion activation on Hurco VM30i | $50,000+ | $30,000 | Hurco WinMAX |
| 3 | Wire EDM skim pass reduction | $107,100 | $60,000 | Cost Reduction |
| 4 | Vendor consolidation (material) | $75-250K | $50,000 | Supply Chain |
| 5 | Material grade optimization (D2→A2) | $90,000 | $35,000 | Cost Reduction |
| 6 | Batch scheduling for setup commonality | $37,700 | $25,000 | Scheduling |
| 7 | Machine assignment optimization | $36,250 | $30,000 | Cost Reduction |
| 8 | Electrode count reduction | $36,540 | $25,000 | Cost Reduction |
| 9 | Setup time reduction (turret kits + digital sheets) | $67,000 | $40,000 | Setup Optimization |
| 10 | hyperMILL post upgrade (2021.2→2025.x) | $25,000 | $15,000 | hyperMILL |
| 11 | Bar stock remnant optimization | $25,200 | $18,000 | Cost Reduction |
| 12 | Tool life via SLD RPM selection | $24,250 | $18,000 | Cost Reduction |
| 13 | 2nd wire EDM capacity recovery | $58,368 | $30,000 | Scheduling |
| 14 | First-article scrap reduction | $20,744 | $15,000 | Cost Reduction |
| 15 | hyperMILL project template generator | $40,000 | $20,000 | hyperMILL |
| | **TOTAL** | **$1.07-1.29M** | **$561,000** | **23 agents** |

---

# CROSS-LANE DATA FLOW

```
Lane 3 (Video) ──→ TribalKnowledgeEngine ──→ Lane 9 (CAM Kernel)
                ──→ Academy Courses       ──→ Lane 2 (LEARN track)

Lane 4 (PDF)   ──→ FormulaRegistry       ──→ Lane 2 (SCIMATH), Lane 6 (Process)
                ──→ MaterialRegistry      ──→ Lane 5 (DB-EXP)
                ──→ Tool Cutting Data     ──→ Lane 5 (DB-EXP)
                ──→ Academy Courses       ──→ Lane 2 (LEARN track)

Lane 5 (DB)    ──→ MachineRegistry       ──→ Lane 6 (Process), Lane 7 (Electrode)
                ──→ ControllerDialects    ──→ Lane 0 (PP-HARDENING), Lane 7

Lane 18 (TK)   ──→ ALL 19 pipeline engines (via PipelineRegistryBridge + direct import)
                ──→ SpeedFeedOrchestrator (Tier 2 calibration multipliers)
                ──→ QuoteEstimator (Tier 2 cost modifiers)
                ──→ IntelligentSequencing (Tier 3 constraints)
                ──→ KnowledgeGraph + Academy (knowledge graph + course generation)
                ←── Lane 3 (video → ingest), Lane 4 (PDF → ingest), Lane 13 (archive → capture)
                ←── QuoteAnalytics (feedback loop → calibration tips)
                ──→ ToolCatalog           ──→ Lane 9 (CAM Kernel)
                ──→ FixtureDB             ──→ Lane 9 (CCM)

Lane 7 (Elec)  ──→ SinkerEDM knowledge   ──→ Lane 8 (SINKER-FULL)
                ──→ Fusion 360 bridge     ──→ Lane 2 (F360 track)
```

---

# EXECUTION PRIORITY ORDER

```
PHASE 1 (IMMEDIATE — all seats start now):
  Main seat:     Lane 0 (safety) + Lane 12 JMDIE-MS0 (employee DB) + Lane 7 (electrode pipe) [SO46]
  Main seat:     Lane 1 → FMERGE-MS0 (frontend — no Lane 0 dependency per [D14])
  Seat #2:       Lane 3 → VID-EXT-MS0 (video pipeline, target 50-100 curated [K30])
  Seat #3:       Lane 4 → PDF-EXT-MS0 (machining source, 95%+ table accuracy [K27])
  Seat #4:       Lane 5 → DB-EXP-MS0 (machine DB, revised target 2,500 [DE26])

PHASE 2 (after Lane 0 + Lane 12 MS0 complete):
  Main seat:     Lane 6 → MILL-HARD-MS0 (milling hardening on JM Die machines)
  Main seat:     Lane 12 JMDIE-MS1 (tool holders + tooling inventory)
  Seats 2-4:     Continue their lanes

PHASE 3 (after Lane 6 milling hardened):
  Main seat:     Lane 7 → ELEC-PIPE (electrode pipeline — 9 sessions [SC34])
  Main seat:     Lane 12 JMDIE-MS2 (material stock + prints)
  Seats 2-4:     Continue or complete their lanes

PHASE 4 (after Lane 7):
  Main seat:     Lane 8 → Laser + Waterjet + Full Sinker (decoupled from Lane 7 [D13])
  Main seat:     Lane 11 → QM-MS0 (SPC engine — quality gap [QM43])
  All seats:     Lane 2 core platform tracks

PHASE 5 (after Lanes 3-5 produce data):
  Main seat:     Lane 9 → CC/CCM/CK (CAM kernel uses extracted knowledge)
  All seats:     Lane 10 → QA milestones on completed features
  Main seat:     Lane 12 JMDIE-MS3 (post processor validation)

PHASE 6 (after Lane 13 Phase A parser + ETL):
  Main seat:     Lane 14 MACH-MS1 (Hurco UltiMotion — SINGLE BIGGEST QUICK WIN: 25-40% cycle time)
  Main seat:     Lane 14 MACH-MS0 (Haas NGC intelligence)
  Main seat:     Lane 15 SETUP-MS0 (setup optimization foundations — 5 parallel tracks)
  Main seat:     Lane 17 SCHED-MS0 (scheduling intelligence)

PHASE 7 (after Lane 14-15 foundations):
  Main seat:     Lane 14 MACH-MS2 (Mastercam mining — wire EDM condition DB)
  Main seat:     Lane 14 MACH-MS3 (hyperMILL intelligence — project template generator)
  Main seat:     Lane 15 SETUP-MS1 (setup time estimation + first-article prediction)
  Main seat:     Lane 16 TWIN-MS0 (digital twin visualization)
  Main seat:     Lane 17 SUPPLY-MS0 (material intelligence)

PHASE 8 (capstone):
  Main seat:     Lane 15 SETUP-MS2 (batching + QR sheets)
  Main seat:     Lane 16 TWIN-MS1 + MS2 (simulation + what-if)
  Main seat:     Lane 13 Phases C + D (domain intelligence + ML + quality + training)

ONGOING:
  All seats run /rgs continue <next-milestone> to advance their lane
  Codex runs frontend tests in parallel, synced via /rgs-sync
  Safety gate [K31]: ALL extracted data (Lanes 3-5) must pass physics plausibility before registry ingestion
  Real session count estimate: ~530 μS across all lanes (includes 4-loop overhead [SC32])
  Estimated Year 1 value: $561K (conservative, from 23-agent cost analysis)
```

---

# TOTAL SCOPE SUMMARY

| Lane | Track(s) | New MS | Existing MS | Est. Sessions | Seat |
|------|----------|--------|-------------|---------------|------|
| 0: Safety Critical | PP-H, CWEDM | 0 | 8 | 17 | Main |
| 1: Frontend Merge | FMERGE | 3 | 0 | 8-10 [F16] | Main+Codex |
| 2: Core Platform | CAMX+ SCHED+ | 0 | ~200 | ~100 | Main |
| 3: Video Extract | VID-EXT | 3 | 0 | 6 | Seat #2 |
| 4: PDF Extract | PDF-EXT | 3 | 0 | 6 | Seat #3 |
| 5: DB Expansion | DB-EXP | 5 | 0 | 10 | Seat #4 |
| 6: Process Harden + Program Upgrade | MILL/LATHE/WEDM-HARD + PROG-UPGRADE | **23 new** | 31 | 38 (76 μS) | Main |
| 7: Electrode Pipe | ELEC-PIPE | 3 | 0 | 9 [SC34] | Main |
| 8: Secondary Proc | LASER/WATER/SINKER | 8 | 0 | 11 | Main |
| 9: CAM/CAD Kernel | CC/CCM/CK | 0 | 46 | 23 | Main |
| 10: QA & Hardening | QA/BENCH/ACP | 0 | 30 | 15 | Any |
| 11: Quality/Metrology | QM | **8 new** | 0 | 10 | Main [QM43] |
| 12: JM Die Shop Data | JMDIE | **4 new** | 0 | 7 | Main |
| 13: Archive Intelligence | ARC (12 milestones) | **12 new** | 0 | 200 μS | Main + agents |
| 14: Machine-Specific Intel | MACH (4 milestones) | **4 new** | 0 | 39.25 μS | Main |
| 15: Setup Optimization | SETUP (3 milestones) | **3 new** | 0 | 21 μS | Main |
| 16: Digital Twin | TWIN (3 milestones) | **3 new** | 0 | 26 μS | Main |
| 17: Supply Chain + Sched | SUPPLY+SCHED (2+1 ms) | **3 new** | 0 | 32 μS | Main |
| **TOTAL** | | **85 new** | **~315 existing** | **~530 μS** | **4 seats** |
|  | | | | **Est. $561K Y1 value** | |

---

# PRIOR ROADMAP MAPPING

| Prior Roadmap | Status | Mapped To |
|--------------|--------|-----------|
| PRISM-UNIFIED-MASTER-ROADMAP.md | **SUPERSEDED** | L0-L8 acknowledged DONE |
| PP-HARDENING-ROADMAP.md | **ABSORBED** | Lane 0, Branch L0-S1 |
| CWEDM-CALCULATOR-WIRING-ROADMAP.md | **ABSORBED** | Lane 0, Branch L0-S2 |
| sleepy-chasing-prism.md (missing) | **SUPERSEDED** | Was already superseded |
| roadmap-index.json v8.4.0 | **CANONICAL** | v2 adds Lanes 1/3/4/5/6/7/8 |
| Phase R5-R15 docs | **ARCHIVED** | Historical only |

---

# SEAT-SPECIFIC CLAUDE.md INSTRUCTIONS

## For Seat #2 (Video Extraction)
```
You are operating PRISM Lane 3: Video Extraction.
Your sole mission: extract manufacturing knowledge from video sources.
Roadmap: PRISM-UNIFIED-ROADMAP-v2.md Lane 3
Start: VID-EXT-MS0, units U-VID01..U-VID04
Use: /video-learn, /youtube-transcript, /forge-engines
Report: extracted entry count, source coverage, quality scores
```

## For Seat #3 (PDF & Course Extraction)
```
You are operating PRISM Lane 4: PDF & Course Extraction.
Your sole mission: extract knowledge from machining PDFs and MIT courses.
Roadmap: PRISM-UNIFIED-ROADMAP-v2.md Lane 4
Start: PDF-EXT-MS0, units U-PDF01..U-PDF05
Use: /pdf-learn, /learn-everything, /material-lookup, /formula-browse
Report: formulas extracted, materials enriched, tables processed
```

## For Seat #4 (Database Expansion)
```
You are operating PRISM Lane 5: Database Expansion.
Your sole mission: expand machine, controller, tooling, and fixture databases.
Roadmap: PRISM-UNIFIED-ROADMAP-v2.md Lane 5
Start: DB-EXP-MS0, units U-DB01..U-DB05
Use: /machine-enrich, /tool-enrich, /catalog-enricher agent
Report: machines added, tools enriched, controllers mapped, fixtures cataloged
```

## For Codex (Frontend Testing)
```
IMPORTANT: There are currently TWO web builds that need to be merged:
  1. PRISM/mcp-server/web/ — 101 pages (Claude-built)
  2. PRISM/web/ — 108 pages (Codex-built)
These share ~85 pages but have ~25+ unique pages each.
Lane 1 (FMERGE) defines the merge plan. FMERGE-MS0 execution truth now sets `PRISM/mcp-server/web` as canonical and `PRISM/web` as donor-only. Coordinate via /rgs-sync.
Your test plan should cover the merged canonical app, not a second deployable frontend.
```

---

# LANE 18: TRIBAL KNOWLEDGE PROPAGATION [NEW — 20-agent scrutiny 2026-04-12]
> **Priority**: P1 — Cross-cutting lane that amplifies every other lane's value
> **Seat**: Main
> **Dependencies**: LEARN-MS0 partial (done), Lane 2 core platform running
> **Reference**: mcp-server/data/docs/roadmap/TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md (TK-0..TK-7 wave spec)
> **Source**: 20-agent scrutiny found 34 findings (5 critical, 11 high), $313K-$446K annual ROI, 14/19 pipelines dark

## Why This Lane Exists

The 20-agent scrutiny (2026-04-12) revealed:
- **14 of 19 pipeline engines** have ZERO tribal knowledge awareness (fully "dark")
- **77% of tip categories** (2,591 cam_strategy + 15 others) are undeclared in the type system
- **tribal_captured_tips.json** is 95.5% waste (test artifacts + duplicates, only ~20 real tips)
- **435-640 JM Die-specific tips** are missing (heat treatment, cold heading dies, sinker EDM, grinding — the shop's core business)
- **5 spine engines** specified in TK-1 don't exist yet (Applicability, Promotion, Conflict, ConsumerRegistry, FeedbackIngest)
- Only TK-0 (audit) is done; TK-1 through TK-7 are all not started
- Estimated ROI: **$313K-$446K/year** from tribal knowledge integration into quoting, scheduling, and process planning

## Auto-Wiring Enforcement (Early Gate)

**Every new engine or dispatcher created after this lane begins MUST declare a tribal knowledge posture:**
- `tribal: "consumer"` — engine calls `tribalKnowledgeEngine.search()` for relevant context
- `tribal: "producer"` — engine generates tips via `capture()` or `ingest()`
- `tribal: "none"` — engine has no knowledge dependency (must justify)

A PreToolUse hook (`tribal-consumer-gate.mjs`) will flag any new engine file that lacks this declaration.
This prevents the "14 dark pipelines" problem from growing as PRISM adds more engines.

---

## TK-MS0: Data Quality & Foundation Fixes — 4 units, 2 sessions [BLOCKING]
```
Fixes the 5 CRITICAL issues from the 20-agent scrutiny before any integration work begins.

U-TK01: Purge + content-dedup captured tips
  - Delete all 446 entries in tribal_captured_tips.json (95.5% waste)
  - Add content-based dedup to capture() and ingest(): hash title+body, reject duplicates
  - Isolate persistence test from production file (set PRISM_TRIBAL_TIPS_PATH in test env)
  - Add auto_apply_approved and evidence_count fields to KnowledgeTip
  Acceptance: npm run build PASS, captured tips file clean, tests use isolated path

U-TK02: Lazy-init + null safety + perf fixes
  - Convert STATIC_TIPS from static class field to lazy getter (461K regex calls at import → deferred)
  - Add null guard in autoCategorize() for undefined text
  - Eliminate triple array copy (RAW_STATIC_TIPS → STATIC_TIPS → this.tips)
  - Add auto_categorized check to skip already-categorized tips
  Acceptance: npm run build PASS, import of TribalKnowledgeEngine no longer triggers categorization

U-TK03: Taxonomy alignment (15 undeclared categories)
  - Add cam_strategy, optimization, finishing, post_processor, roughing, workflow,
    post_processing, multi_axis, verification, simulation, mold_die, material,
    surface_quality, material_specific, probing to named KnowledgeCategory union
  - Consolidate duplicates: finishing/surface_finish/surface_quality → surface_finish,
    post_processor/post_processing → post_processor, material/material_specific → materials_science
  - Add SUBCATEGORY_MAP entries for cam_strategy, post_processor, optimization, automation
  - Add knowledge_type field to KnowledgeTip (tip, anti-pattern, rule, workaround,
    failure_mode, correction, heuristic, machine_quirk, post_quirk, setup_lesson, quote_correction)
  Acceptance: npm run build PASS, 0 tips fall to undeclared category, all tests pass

U-TK04: inferDomain + search interface expansion
  - Add WEDM/EDM/sinker process detection to inferDomain
  - Add 15 missing controller families (mazak, hurco, makino, brother, citizen, etc.)
  - Add speeds_feeds, programming, cam_strategy explicit cases (not fall-through to general)
  - Add domain and subcategory filter fields to KnowledgeSearchInput
  - Implement domain/subcategory filtering in search() method
  - Fix hook/engine regex divergence: hook uses atomic write pattern
  Acceptance: npm run build PASS, domain accuracy ≥90% (up from 76%), search supports domain filter
```
EXIT GATE: 0 critical issues | Build PASS | Captured tips clean | Domain accuracy ≥90%

---

## TK-MS1: Knowledge Spine Engines — 5 units, 3 sessions
```
Build the 5 missing TK-1 spine engines that enable routing, scoring, and feedback.

U-TK05: KnowledgeApplicabilityEngine
  - Score which tips apply to a given context (machine + material + operation + tolerance)
  - Input: TribalQueryContext (material_iso_group, machine_id, operation_type, tool_type, etc.)
  - Output: ranked tips with applicability_score, combined_confidence
  - Multi-dimensional filtering: material_groups × operation_types × machine_ids × domain
  - Weight by: confidence, evidence_count, usage_count, recency
  Acceptance: Engine built, tested, wired to knowledgeDispatcher as tribal_score action

U-TK06: KnowledgeConflictResolverEngine
  - Detect contradictory tips in the same scope (same material + operation, opposing advice)
  - Resolution strategies: newer-wins, higher-confidence-wins, higher-evidence-wins, flag-for-human
  - Output: conflict_pairs[] with resolution recommendation and severity
  Acceptance: Engine built, tested, wired. Handles known conflicts (e.g., "flood coolant" vs "dry cut" for cast iron)

U-TK07: KnowledgeConsumerRegistryEngine
  - Track which engines consume which knowledge categories/domains
  - Maintain consumer → category/domain dependency map
  - Detect unwired consumers (engines that SHOULD consume knowledge but don't)
  - Feed the auto-wiring enforcement hook
  Acceptance: Engine built. Registers all 16 currently-wired consumers. Flags 14 dark pipelines.

U-TK08: KnowledgeFeedbackIngestEngine
  - Ingest shop outcome data: actual cycle time vs predicted, scrap events, tool life actuals
  - Convert QuoteAnalyticsEngine.calibrationSuggestions() to tribal modifiers
  - Auto-generate calibration tips with effect_type="modifier" and numeric_modifier values
  - Decay function: modifiers trend toward 1.0 if not revalidated within 180 days
  Acceptance: Engine built, tested. CalibrationSuggestion → KnowledgeTip conversion works.

U-TK09: KnowledgePromotionEngine
  - Promote local shop tips to global platform patterns when evidence threshold met (≥5 shops, ≥10 validations)
  - Suppression: demote tips with negative outcome correlation
  - Deprecation: age-out tips not validated within 365 days
  - Audit trail for all promotion/suppression/deprecation events
  Acceptance: Engine built, tested. Promotion/suppression cycle works end-to-end in test.
```
EXIT GATE: 5 spine engines built and tested | All wired to dispatchers | Build PASS

---

## TK-MS2: Consumer Delivery — Pipeline Integration — 6 units, 4 sessions
```
Wire tribal knowledge into the 14 dark pipeline engines, prioritized by JM Die impact.

U-TK10: PipelineRegistryBridge + PipelineDecisionOrchestrator (P1+P7 — highest leverage)
  - Add tribal_tips?: KnowledgeTip[] to ResolvedMaterialContext and ResolvedMachineContext
  - PipelineRegistryBridge.resolveMaterial() queries tribal tips at low-confidence fallback
  - PipelineDecisionOrchestratorEngine._scoreCandidate() uses tribal tips to adjust performance score
  - All 12 DecisionCategory values get tribal category mapping
  Acceptance: Both engines tribal-aware. Every pipeline calling the bridge gets tribal enrichment.

U-TK11: WEDM + EDM pipeline wiring (P2+P6 — JM Die specialty)
  - WEDMCompleteOrchestrationEngine: tribal in selectWire(), optimizePassCount(), selectFlushingStrategy()
  - EDMProgramAssemblerEngine: tribal in electrode wear ratio, roughing→finishing transition, flushing
  Acceptance: WEDM and EDM pipelines query tribal tips for D2/M2/S7 die steel operations.

U-TK12: PostProcessor + IntelligentSequencing (P3+P5 — every program)
  - PostProcessorPipelineEngine Phase 5: tribal search by controller_family + machine_ids
  - IntelligentSequencingEngine: accept tribal_rules parameter for forced_dependencies and phase_overrides
  - Thermal relaxation gap duration from tribal tips (not hardcoded)
  Acceptance: Post-processor and sequencing engines query tribal knowledge. Build PASS.

U-TK13: Turning + MillTurn + MultiAxis pipelines (P4+P9+P10)
  - TurningPrintToProgramEngine: tribal in thread infeed, CSS cutoff, part-off strategy
  - MillTurnSwissPipelineEngine: tribal in sub-spindle grip force, guide bushing, sync points
  - MultiAxisPrintToProgramEngine: tribal in singularity threshold, scallop correction, entry approach
  Acceptance: All 3 pipeline engines import and call tribalKnowledgeEngine.search()

U-TK14: ProcessPlan + AutoProgram + Intelligence (P8+P11+P13)
  - ProcessPlanEngine: tribal override for setup count, ISO_SPEEDS, feedPerRev
  - AutoProgramOrchestratorEngine: tribal at S4 (process planning) and S6 (strategy selection)
  - IntelligenceEngine: tribal in failure_diagnose, tool_recommend, machine_recommend
  Acceptance: All 3 engines tribal-aware. Build PASS, existing tests still pass.

U-TK15: Grinding + Laser + Waterjet + broken loop fixes (P12+P14+P15)
  - GrindingProgramAssemblerEngine: tribal in wheel selection, burn threshold, dressing ratio
  - LaserProgramAssemblerEngine: tribal in pierce timing, gas pressure
  - WaterjetProgramAssemblerEngine: tribal in taper compensation, pierce strategy
  - Fix: VideoLearningEngine → route through ContentIngestionPipeline for dedup
  - Fix: ApprenticeEngine.captureKnowledge() → also call tribalKnowledgeEngine.capture()
  - Fix: Add "tribal" to KnowledgeQueryEngine RegistryType for unified search
  Acceptance: 0 dark pipeline engines remain. All 19 pipelines tribal-aware. Build PASS.
```
EXIT GATE: 0/19 dark pipelines | Unified search includes tribal | All broken loops fixed

---

## TK-MS3: TribalKnowledgeAdvisor — Tier 2/3 Integration — 4 units, 3 sessions
```
Build the middleware that converts advisory text tips into calibration multipliers (Tier 2)
and hard constraints (Tier 3) that modify computed values in physics engines.

U-TK16: TribalKnowledgeAdvisor engine + interfaces
  - TribalQueryContext: material, machine, operation, tool, workholding, part_family, complexity
  - TribalModifiers: vc_modifier, fz_modifier, machinability_factor_override, machine_rate_override,
    cycle_time_base_override, setup_count_override, setup_time_per_setup_min, iso_speed_modifier
  - TribalConstraints: max_speed, min_speed, max_rpm, max_feed, min_passes,
    required_machine, forbidden_machines, forced_dependencies, phase_overrides
  - getModifiers(), getConstraints(), getAdvisory(), ingestCalibrationFeedback()
  - Conflict resolution: weighted average by confidence × log2(evidence_count + 2)
  - Safety guardrails: max modifier swing ±30%, min sample size 5, auto_apply_approved gate
  Acceptance: Advisor engine built, tested, returns modifiers for known tip patterns.

U-TK17: SpeedFeedOrchestrator Tier 2 wiring
  - Wire tribal_vc_factor into Vc computation (line 2193, after calVcFactor)
  - Wire tribal_fz_factor into fz computation (line 2285, after cam_feed_mult)
  - Wire tribal_ap_factor and tribal_ae_factor into depth of cut computations
  - Wire tribal_life_factor into Taylor tool life
  - Add tribal_modifiers_applied to OrchestratorResult for audit trail
  - Composition order: base × physics × calibration_override × tribal_modifier
  Acceptance: SFO uses tribal modifiers. Result includes audit trail. All SFO tests pass.

U-TK18: QuoteEstimator + ProcessPlan Tier 2 wiring
  - QuoteEstimator: tribal override for MACHINABILITY_FACTOR, MACHINE_RATE_HR,
    baseTimes, numSetups, baseMinPerSetup, setupRate
  - ProcessPlan: tribal override for ISO_SPEEDS, feedPerRev, setup count (replace hardcoded 1)
  - QuoteAnalytics → KnowledgeFeedbackIngest auto-calibration loop
  Acceptance: Quoting uses tribal modifiers. Process plan setup count is dynamic. Tests pass.

U-TK19: IntelligentSequencing + CapacityPlanning Tier 3 wiring
  - IntelligentSequencing: forced_dependencies, phase_overrides, required_probe_after from tribal
  - CapacityPlanning: machine efficiency from tribal (time-varying, condition-aware OEE)
  - ShopScheduler: practical machine capability from tribal (operator skill gates)
  Acceptance: Sequencing accepts tribal rules. Capacity uses real utilization. Tests pass.
```
EXIT GATE: Tier 2 modifiers active in SFO + QuoteEstimator | Tier 3 constraints in Sequencing | Audit trail on all modified computations

---

## TK-MS4: JM Die Knowledge Capture — 6 units, 4 sessions
```
Fill the 14 knowledge gaps identified by Agent 16. JM Die's actual domain
(tool steel die/punch manufacturing) has near-zero tribal knowledge coverage.
Total: 435-640 tips needed across 14 gap areas.

U-TK20: Heat treatment + tool steel behavior (Gaps #1 + #6)
  - 40-60 heat treatment tips: pre/post-hardening strategies, distortion compensation,
    stress relief, tempering effects, quench medium selection per grade
  - 35-50 tool steel tips: M2/D2/S7/A2/H13/carbide/graphite machining behavior,
    insert grade selection, coolant strategy per material
  - Sources: Carpenter/Bohler datasheets, Sandvik/Kennametal guides, operator knowledge
  Acceptance: 75+ tips captured, auto-categorized, domain=process_engineering/tooling_technology

U-TK21: Cold heading die design (Gap #2 — JM Die's core business)
  - 80-120 tips: die geometry rules, punch geometry, material selection,
    die life expectations, failure modes, clearance tables, electrode design for die cavities,
    progressive die sequencing, customer-specific standards (ITW, SFS, Optimas)
  - Sources: JM DIE program archive mining (20,157 files), operator interviews, customer prints
  Acceptance: 80+ die-specific tips captured. cold_heading_die domain or subcategory established.

U-TK22: Sinker EDM electrode design (Gap #3)
  - 50-70 tips: graphite grade selection, copper vs graphite, undersize values,
    wear ratio tables, electrode design rules, orbiting strategy,
    multi-electrode strategy, flushing holes, registration methods, overburn tables
  - Sources: Mitsubishi EA12S/EA12D application guides, POCO/Tokai graphite data, operator knowledge
  Acceptance: 50+ EDM tips captured, linked to machine_ids for Mitsubishi sinker EDMs

U-TK23: Grinding + WEDM skim pass + workholding (Gaps #4, #5, #9)
  - 30-40 grinding tips: wheel selection, dressing, coolant, burn prevention, magnetic chuck
  - 25-35 WEDM tips: material-specific skim passes for D2/M2/A2/S7, overburn tables for FA10S
  - 25-35 workholding tips: die-specific fixturing, electrode clamping, wire EDM holding
  Acceptance: 80+ tips across 3 domains. All auto-categorized with correct machine_ids.

U-TK24: Machine-specific quirks + post-processor (Gaps #7, #8)
  - 40-60 machine quirks for all 21 JM Die machines: Okuma homing, Hurco conversational,
    Haas micro-machining, Roku-Roku graphite, Mitsubishi auto-threading
  - 20-30 post-processor tips: OSP-P300/P200/P500 differences, WinMAX format,
    Haas PRE-NGC limits, G50 dual-purpose behavior
  - Sources: Okuma/Hurco/Haas manuals, operator per-machine sessions
  Acceptance: 60+ tips with machine_ids matching ShopConfigurationEngine inventory

U-TK25: Metrology + threading + maintenance + cost estimation (Gaps #10-14)
  - 20-30 surface finish + customer specs
  - 15-25 threading tips (hardened steel thread milling, Okuma G31/G33)
  - 20-30 metrology tips (CMM, optical comparator, in-process measurement)
  - 15-25 cost estimation corrections from historical job data
  - 20-30 maintenance tips (WEDM water quality, EDM dielectric, spindle warm-up)
  Acceptance: 90+ tips across 5 domains. CORE_CATEGORIES gap check shows 0 categories below threshold.
```
EXIT GATE: ≥435 new JM Die-specific tips | 0 CORE_CATEGORY gaps | All auto-categorized | Machine-linked

---

## TK-MS5: Auto-Wiring Enforcement + Index Refresh — 3 units, 2 sessions
```
Prevent regression and bring indexes up to date.

U-TK26: tribal-consumer-gate.mjs enforcement hook
  - PreToolUse hook: any Write/Edit to src/engines/*.ts checks for tribal knowledge posture declaration
  - Posture: comment header with tribal: consumer|producer|none (with justification for "none")
  - Hook emits warning (not block) for missing declaration — soft gate for 30 days, then hard block
  - KnowledgeConsumerRegistryEngine tracks declared postures vs actual imports
  Acceptance: Hook installed, fires on engine file edits, all existing engines have posture declared

U-TK27: Index refresh + skill updates
  - Regenerate MASTER_INDEX.json (currently 12+ days stale)
  - Update DISPATCHER_DIGEST.md knowledgeDispatcher count (98→99+)
  - Update ENGINE_DIGEST.md TribalKnowledgeEngine description
  - Fix tribal-knowledge-guide skill: correct action names (tribal_capture, tribal_search, not capture/query)
  - Add tribal_recategorize, domain filter, subcategory filter to skill documentation
  - Fix roadmap-index.json LEARN-MS0 status from not_started to partial
  Acceptance: All indexes regenerated. Skill matches live code. roadmap-index accurate.

U-TK28: Security hardening
  - Validate PRISM_TRIBAL_TIPS_PATH stays within allowed base directory
  - Validate PRISM_KNOWLEDGE_DIR stays within allowed base directory
  - Replace fs.writeFileSync with safeWriteSync in hook and notifySVITribalChange
  - Eliminate TOCTOU races: remove existsSync guards, use try/catch ENOENT
  - Add .max(10000) to body/content fields in tribal_capture schema
  - Add filename sanitization regex in loadDocumentLearnedTips
  Acceptance: All 6 security findings from Agent 12 fixed. Build PASS. Tests pass.
```
EXIT GATE: Enforcement hook active | Indexes current | 0 security findings open

---

## TK-MS6: Tier 2/3 Knowledge Graph + "Master Machinist" Mode — 3 units, 2 sessions
```
Build the two highest-value differentiating features identified by Agent 20.

U-TK29: Knowledge graph from auto-categorized tips
  - Add "tribal_tip" node type to KnowledgeGraphEngine and ManufacturingKnowledgeGraphEngine
  - Tips become nodes; shared tags become edges (2+ shared applicability tags = related)
  - Graph traversal: "show me everything PRISM knows about machining D2 on the L300-M"
  - Expose via knowledge dispatcher as tribal_graph action
  Acceptance: Graph built from 4,000+ tips. Traversal works. Action exposed.

U-TK30: "Master Machinist" recommendation mode
  - For any context (material + machine + operation + tolerance), retrieve top-ranked tips
    from highest-confidence sources, weighted by evidence_count and usage_count
  - Present as: "Senior machinists say: [tip]. Validated 47 times. Confidence: 92%."
  - Show provenance chain: who captured it, when, how many times applied successfully
  - Integrate into every pipeline output as optional master_machinist_says field
  Acceptance: Recommendation mode works. Returns top 3 tips with provenance for any valid context.

U-TK31: CourseBuilder + Academy integration
  - CourseBuilderEngine uses domain and subcategory for module organization (not just category)
  - Prefer cam_software domain tips for CAM-specific courses
  - KnowledgeCurriculumBridgeEngine generates quiz questions from high-confidence tribal tips
  - ApprenticeEngine.captureKnowledge() bridges to tribalKnowledgeEngine.capture()
  Acceptance: CourseBuilder generates domain-aware courses. Quiz questions from tribal tips. Apprentice persists.
```
EXIT GATE: Knowledge graph built | Master Machinist mode works | Academy integration complete

---

## TK MILESTONE SUMMARY

| Milestone | Units | Sessions | Status | Dependencies |
|-----------|-------|----------|--------|-------------|
| TK-MS0: Data Quality & Foundation | 4 | 2 | **BLOCKING — start here** | None |
| TK-MS1: Spine Engines | 5 | 3 | not_started | TK-MS0 |
| TK-MS2: Consumer Delivery | 6 | 4 | not_started | TK-MS1 |
| TK-MS3: Tier 2/3 Advisor | 4 | 3 | not_started | TK-MS1 |
| TK-MS4: JM Die Knowledge | 6 | 4 | not_started | TK-MS0 |
| TK-MS5: Enforcement + Indexes | 3 | 2 | not_started | TK-MS2 |
| TK-MS6: Graph + Master Machinist | 3 | 2 | not_started | TK-MS2, TK-MS4 |
| **TOTAL** | **31 units** | **20 sessions** | | |

**Dependency DAG:**
```
TK-MS0 ──→ TK-MS1 ──→ TK-MS2 ──→ TK-MS5
                   ├──→ TK-MS3     ├──→ TK-MS6
TK-MS0 ──→ TK-MS4 ────────────────┘
```
TK-MS0 is the only hard blocker. TK-MS1 and TK-MS4 can run in parallel after TK-MS0.
TK-MS3 can run in parallel with TK-MS2. TK-MS6 needs both TK-MS2 and TK-MS4.

## 20-AGENT TRIBAL SCRUTINY AMENDMENTS (34 findings — 2026-04-12)

### Critical (5)
- [TK-C1] Null safety crash in autoCategorize() (Agent 1) → fixed in TK-MS0 U-TK02
- [TK-C2] Blocking import-time init (461K regex calls) (Agent 9) → fixed in TK-MS0 U-TK02
- [TK-C3] Hook/engine regex divergence (Agent 4) → fixed in TK-MS0 U-TK04
- [TK-C4] 77% of tips use undeclared categories (Agent 8) → fixed in TK-MS0 U-TK03
- [TK-C5] 95.5% waste in captured tips file (Agent 10) → fixed in TK-MS0 U-TK01

### High (11)
- [TK-H1] Env-var file path injection (Agent 12) → fixed in TK-MS5 U-TK28
- [TK-H2] Non-atomic hook write (Agent 12) → fixed in TK-MS5 U-TK28
- [TK-H3] 14 dark pipeline engines (Agent 5) → fixed in TK-MS2
- [TK-H4] 5 missing spine engines (Agent 7) → fixed in TK-MS1
- [TK-H5] ApprenticeEngine knowledge silo (Agent 19) → fixed in TK-MS2 U-TK15
- [TK-H6] Search missing domain/subcategory filters (Agent 19) → fixed in TK-MS0 U-TK04
- [TK-H7] WEDM/EDM domain inference gaps (Agent 15) → fixed in TK-MS0 U-TK04
- [TK-H8] 15 missing controller families in inferDomain (Agent 15) → fixed in TK-MS0 U-TK04
- [TK-H9] Stale indexes (12+ days, wrong counts) (Agent 18) → fixed in TK-MS5 U-TK27
- [TK-H10] QuoteEstimator hardcoded constants ($110K-$150K ROI) (Agent 17) → addressed in TK-MS3 U-TK18
- [TK-H11] 435-640 JM Die tips missing (Agent 16) → addressed in TK-MS4

### Medium (12)
- [TK-M1..M12] TOCTOU race, SVI non-atomic write, body length limit, filename sanitization,
  subcategory false positives, triple array allocation, CourseBuilder ignoring metadata,
  video ingest dedup bypass, reminder hook false positives, 64% domain=general,
  dual capture paths not cross-wired, taxonomy provenance/domain mixing
  → All addressed across TK-MS0 through TK-MS6

### Business Value Findings
- [TK-BV1] $313K-$446K annual ROI from tribal integration (Agent 17) → TK-MS3
- [TK-BV2] "Master Machinist" AI differentiator (Agent 20) → TK-MS6 U-TK30
- [TK-BV3] Auto knowledge graph (Agent 20) → TK-MS6 U-TK29
- [TK-BV4] Customer-specific knowledge profiles (Agent 20) → future (after TK-MS4 + Lane 13)
- [TK-BV5] Cross-shop learning (Agent 20) → future (requires multi-tenant, TK-6/TK-7)

### TK-AI HARDENING COMPLETE (2026-04-14) — Future Roadmap Items
**Status**: Core TK-AI integration hardened. Diminishing returns reached. Future work below.
**Completed**: TK-AI-HARDEN milestone — 15 tests, LLMEngine tribal context, PRISMIntelligenceLayer tribal synthesis for 11 manufacturing domains.

**Future TK Milestones (generate detailed roadmap when ready):**
- [ ] TK-MS12: Evolution Learning — cross-session tip evolution, tip decay/promotion
- [ ] TK-MS13: Customer Profiles — shop-specific knowledge silos, customer-aware tip filtering
- [ ] TK-MS14: Video-Learned Enhancement — ranking boost for video-extracted tips, visual proof linking
- [ ] TK-MS15: Tribal Conflict Resolution UI — surface conflicting tips, operator adjudication workflow
- [ ] TK-MS16: Cross-Shop Learning — anonymized tip sharing (requires multi-tenant infrastructure)

---

# LANE 19: DEVOPS/INFRASTRUCTURE IMPROVEMENTS [NEW — CI/CD + Build + Security]
> **Priority**: P2 — Critical for team scalability and code quality
> **Seat**: Main or dedicated infrastructure seat
> **Dependencies**: None (can start immediately)
> **New Track**: DEVOPS-MS

## Branch L19-CICD: CI/CD Pipeline Enhancement
**Milestones**: 5 | **Units**: 16 | **Sessions**: ~8

### DEVOPS-MS0: CI/CD Pipeline Enhancement — 4 units, 2 sessions
```
SMART CONFIG: Role=DevOps Engineer + CI/CD Specialist | Model=OPUS | Effort=HIGH
INTENT: All PRs pass automated quality gates before merge
```
- U-DEVOPS01: **TypeScript Build Gate** — Integrate tsc noEmit into CI pipeline, fail on any TS error
- U-DEVOPS02: **Vitest Integration** — Run full test suite on PR, fail on any test failure
- U-DEVOPS03: **Coverage Reporting** — Generate coverage reports, enforce minimum thresholds (80%+ line coverage)
- U-DEVOPS04: **Bundle Size Guard** — Track bundle size per PR, fail if increase exceeds threshold (5%)
```
EXIT GATE: All 4 gates run on every PR | Zero manual oversight required | Build history dashboard
FORGE-TRIPLE: hook=ci-quality-gate | action=prism_dev:ci_pipeline_status | skill=/ci-health
```

### DEVOPS-MS1: Build System Optimization — 3 units, 2 sessions
```
SMART CONFIG: Role=Build Engineer + Performance Specialist | Model=OPUS | Effort=HIGH
INTENT: Build times stay fast as codebase grows
```
- U-DEVOPS05: **Incremental Builds** — Configure tsc incremental mode, esbuild watch mode, cache .tsbuildinfo
- U-DEVOPS06: **Post-Build Verification** — Automated smoke tests after each build, verify critical paths
- U-DEVOPS07: **Build Caching** — Implement node_modules caching, artifact caching for CI, cache invalidation rules
```
EXIT GATE: Build time <30s for incremental | Cache hit rate >90% | Post-build verification passes
FORGE-TRIPLE: hook=build-perf-guard | action=prism_dev:build_optimize | skill=/build-verify
```

### DEVOPS-MS2: Schema Versioning — 3 units, 1 session
```
SMART CONFIG: Role=Schema Architect + API Versioning Specialist | Model=OPUS | Effort=MEDIUM
INTENT: All schemas have explicit versions, breaking changes are caught before deployment
```
- U-DEVOPS08: **Version Tracking** — Add version field to all JSON schemas in src/schemas/, enforce semver
- U-DEVOPS09: **Schema Changelog** — Generate changelog from schema diffs, track breaking vs non-breaking changes
- U-DEVOPS10: **CI Schema Check** — Fail CI if schema version not bumped on breaking change, validate migrations
```
EXIT GATE: All 196 schemas versioned | Changelog auto-generated | Breaking changes blocked without version bump
FORGE-TRIPLE: hook=schema-version-guard | action=prism_dev:schema_version_check | skill=/schema-audit
```

### DEVOPS-MS3: Distributed Locking — 4 units, 2 sessions
```
SMART CONFIG: Role=Distributed Systems Engineer | Model=OPUS | Effort=MAXIMUM
INTENT: Multi-seat operations never corrupt shared state
```
- U-DEVOPS11: **Lock Service Interface** — Define LockService interface with acquire/release/heartbeat, configurable TTL
- U-DEVOPS12: **PostgreSQL Backend** — Implement advisory locks via PostgreSQL for production deployments
- U-DEVOPS13: **Redis Fallback** — Implement Redis SETNX-based locks for high-throughput scenarios
- U-DEVOPS14: **Dead-Letter Queue** — Handle lock acquisition failures, retry with backoff, alert on deadlocks
```
EXIT GATE: Lock contention <1% | Zero data corruption on 10-seat concurrent test | Deadlock detection working
FORGE-TRIPLE: hook=distributed-lock-guard | action=prism_infra:lock_health | skill=/lock-audit
```

### DEVOPS-MS4: Dependency Security — 2 units, 1 session
```
SMART CONFIG: Role=Security Engineer | Model=OPUS | Effort=HIGH
INTENT: No known vulnerabilities in production dependencies
```
- U-DEVOPS15: **NPM Audit Integration** — Run npm audit on CI, fail on high/critical vulnerabilities
- U-DEVOPS16: **Vulnerability Scanning** — Weekly automated scans with Snyk/Dependabot, auto-PR for patches
```
EXIT GATE: Zero high/critical vulnerabilities | Auto-remediation for 90%+ of patches | Security dashboard
FORGE-TRIPLE: hook=dependency-security-guard | action=prism_infra:security_scan | skill=/security-audit
```

## Lane 19 Summary Table
| Milestone | Units | Sessions | Status | Dependencies |
|-----------|-------|----------|--------|-------------|
| DEVOPS-MS0: CI/CD Pipeline Enhancement | 4 | 2 | not_started | None |
| DEVOPS-MS1: Build System Optimization | 3 | 2 | not_started | DEVOPS-MS0 |
| DEVOPS-MS2: Schema Versioning | 3 | 1 | not_started | None |
| DEVOPS-MS3: Distributed Locking | 4 | 2 | not_started | None |
| DEVOPS-MS4: Dependency Security | 2 | 1 | not_started | None |
| **TOTAL** | **16 units** | **8 sessions** | | |

**Dependency DAG:**
```
DEVOPS-MS0 ──→ DEVOPS-MS1
DEVOPS-MS2 (independent)
DEVOPS-MS3 (independent)
DEVOPS-MS4 (independent)
```
DEVOPS-MS0 is the foundation — CI/CD pipeline must exist before optimizing builds.
DEVOPS-MS2, MS3, and MS4 can run in parallel with MS0 and each other.

---

# LANE 20: KNOWLEDGE-AUGMENTED REASONING + UNIFIED ORCHESTRATION (KAR-UO) [NEW — 2026-04-12]
> **Priority**: P1 — The intelligence layer that powers all PRISM capabilities
> **Seat**: Main
> **Dependencies**: PDF-EXT-MS2 (provides extracted knowledge), TK-MS0 (tribal knowledge foundation)
> **New Track**: KAR
> **Envelope**: data/milestones/KAR-ROADMAP.json

## Overview

KAR-UO is the **PRISM Brain** — a unified orchestration layer that:
1. **Ingests** knowledge from all sources (PDF, video, programs, tribal, machine data)
2. **Wires** extracted data to the correct engines via declarative manifests
3. **Learns** from feedback loops and business outcomes
4. **Orchestrates** all 71 domain orchestrators + 1,572 engines through a single entry point

```
┌────────────────────────────────────────────────────────────────────────┐
│                    PRISM UNIFIED ORCHESTRATOR (PUOA)                   │
│                                                                        │
│  User Intent → TaskAgentClassifier → Tier Selection:                  │
│    Tier 1: Direct engine (simple lookups)                             │
│    Tier 2: Domain orchestrator (SpeedFeed, EDM, Quoting, etc.)        │
│    Tier 3: Full PUOA chain (complex multi-domain workflows)           │
│                                                                        │
│  App Integration: /api/orchestrate/* → PRISMUnifiedOrchestratorEngine │
│  MCP Action: prism_orchestrate:unified_execute                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Existing Infrastructure to Leverage (NOT rebuild)

- **71 Domain Orchestrators**: SpeedFeedOrchestrator (2,851 LOC), ProvenPipelineOrchestrator, PhysicsFusionOrchestrator, CAMKernelOrchestrator, QuoteToShipOrchestrator, FeasibilityOrchestrator, PipelineDecisionOrchestrator, WEDMCompleteOrchestrationEngine, etc.
- **TaskAgentClassifier**: EXTEND for intent classification
- **BuildGuardChainEngine**: EXTEND for chain execution with safety guards
- **PhysicsPluginRegistry**: Pattern for plugin architecture

## Branch L20-KAR: Knowledge-Augmented Reasoning
**Milestones**: 14 | **Units**: 72 | **Sessions**: ~27-29 (optimized: 9 with 6 agents)

### KAR-MS0: Universal KnowledgeAtom Model + WiringManifest Schema — 4 units, 2 sessions
```
SMART CONFIG: Role=Architect + Data Modeler | Model=OPUS | Effort=MAX | Context=60%
KNOWLEDGE: KnowledgeIngestionOrchestratorEngine, FormulaRegistry, MaterialRegistry, ToolCatalogEngine
INTENT: Machinists get consistent knowledge regardless of source (handbook, catalog, course)
```
- U-KAR01: Define KnowledgeAtom interface with source provenance (id, type, source, payload, targets[])
- U-KAR02: Define WiringManifest schema (source category → extracted types → target engines)
- U-KAR03: Implement KnowledgeLineageEngine (provenance tracking, conflict resolution, version history)
- U-KAR04: Write tests (15+ tests, 95% coverage on new modules)
```
EXIT GATE: All 4 units complete | Tests pass | Schemas documented | omega_floor >= 0.85
FORGE-TRIPLE: hook=knowledge-atom-validation | action=prism_knowledge:knowledge_lineage | skill=/lineage
```

### KAR-MS1: Auto-Ingestion Hooks + File Watcher — 5 units, 2 sessions
```
SMART CONFIG: Role=Automation Engineer + Hook Specialist | Model=OPUS | Effort=HIGH
INTENT: New resources automatically discovered and queued for extraction
```
- U-KAR05: Session-start resource scan hook
- U-KAR06: File watcher hook with chokidar (real-time .pdf/.min/.json detection)
- U-KAR07: Post-extraction auto-wire hook (routes to engines via WiringManifest)
- U-KAR08: Cadence hook for periodic re-index (daily scan, coverage report)
- U-KAR09: Tests for all hooks

### KAR-MS2: PDF/Handbook Extraction Wiring — 6 units, 4 sessions
**NOTE**: CONSUMES outputs from Lane 4 (PDF-EXT). Does NOT duplicate extraction.
- U-KAR10..15: Wire PDF-EXT outputs to FormulaRegistry, MaterialRegistry, ToolCatalogEngine

### KAR-MS2.1: JM Die Program Archive Wiring — 4 units, 1-2 sessions
```
INTENT: 25,817 JM Die program files (.MIN + .mcx) wired to engines
```
- U-KAR16: JMDieProgramInventoryEngine (scan 20,157 files)
- U-KAR17: ProvenSpeedFeedAggregatorEngine (extract proven S/F from programs)
- U-KAR18: EXTEND FeatureRecognitionEngine for lathe-specific features
- U-KAR19: Tests for program archive wiring

### KAR-MS2.5: CAD/Drawing Extraction Wiring — 4 units, 3 sessions
- U-KAR20..23: Wire CAD formats (.dwg, .idw, .step, .SLDPRT) to GeometryEngine, FeatureRecognitionEngine

### KAR-MS2.6: G-code/Cycle Extraction Wiring — 4 units, 2 sessions
- U-KAR44..47: Wire G-code (.nc, .cyc) to ProvenSpeedFeedEngine, ControllerKnowledgeEngine

### KAR-MS3: Wiring Routes + Engine Integration — 5 units, 2 sessions
- U-KAR24..28: Complete WiringManifest routes, MCP dispatcher actions, integration tests

### KAR-MS3.1: Controller Knowledge Wiring — 4 units, 2 sessions
**NOTE**: Complements Lane 5 DB-EXP-MS1. Wires controller data to knowledge layer.
- U-KAR38..41: Controller dialect tips, alarm code integration, capability matrix wiring

### KAR-MS3.2: Tooling Knowledge Wiring — 4 units, 2 sessions
**NOTE**: Complements Lane 5 DB-EXP-MS3. Wires cutting tool data to knowledge layer.
- U-KAR42..45: Tool catalog integration, cutting data wiring, wear model integration

### KAR-MS4: Business Learning + Feedback Loops — 5 units, 3 sessions
- U-KAR29..33: EXTEND QuoteAnalyticsEngine, implement feedback capture, parameter drift detection

### KAR-MS4.1: Video Tips Wiring — 3 units, 2 sessions
**NOTE**: CONSUMES outputs from Lane 3 (VID-EXT). Does NOT duplicate extraction.
- U-KAR34..36: Wire VID-EXT outputs to TribalKnowledgeEngine, create /video-tips-query skill

### KAR-MS5: PRISM Unified Orchestration Algorithm (PUOA) Core — 6 units, 4 sessions
```
SMART CONFIG: Role=System Architect + Orchestration Specialist | Model=OPUS | Effort=MAXIMUM
INTENT: Single entry point for ALL PRISM intelligent operations
```
- U-KAR51: PRISMUnifiedOrchestratorEngine shell with tiered execution
- U-KAR52: IntentClassifierEngine (EXTEND TaskAgentClassifier for tier routing)
- U-KAR53: DomainOrchestratorPluginRegistry (wrap 71 existing orchestrators)
- U-KAR54: ChainExecutorEngine (EXTEND BuildGuardChainEngine for multi-step workflows)
- U-KAR55: Authority ranking implementation (User > Proven > MachineIntel > OEM > Registry > Physics > Tribal)
- U-KAR56: Tests for PUOA core (30+ tests, all tiers)
```
EXIT GATE: All 71 orchestrators accessible via PUOA | Tier routing working | Authority ranking applied
FORGE-TRIPLE: hook=puoa-execution-guard | action=prism_orchestrate:unified_execute | skill=/orchestrate
```

### KAR-MS6: Domain Wrapper Expansion — 6 units, 3 sessions
- U-KAR57..62: Wrap remaining domain orchestrators, add CAM, CAD, Quality, Business, EDM, Learning domains

### KAR-MS7: App Integration + Frontend Wiring — 6 units, 3 sessions
```
INTENT: PRISM app calls unified orchestrator for ALL intelligent operations
```
- U-KAR63: /api/orchestrate/* Express routes
- U-KAR64: React hook useOrchestrator() for frontend
- U-KAR65: Calculator page integration (physics-backed solve via PUOA)
- U-KAR66: Quoting page integration (full quote workflow via PUOA)
- U-KAR67: ConversationContextEngine (multi-turn context for chat interface)
- U-KAR68: Tests for app integration

## Lane 20 Summary Table
| Milestone | Units | Sessions | Status | Dependencies |
|-----------|-------|----------|--------|-------------|
| KAR-MS0: KnowledgeAtom + WiringManifest | 4 | 2 | not_started | PDF-EXT-MS2 |
| KAR-MS1: Auto-Ingestion Hooks | 5 | 2 | not_started | KAR-MS0 |
| KAR-MS2: PDF Extraction Wiring | 6 | 4 | not_started | KAR-MS0, PDF-EXT-MS2 |
| KAR-MS2.1: JM Die Program Wiring | 4 | 2 | not_started | KAR-MS2 |
| KAR-MS2.5: CAD/Drawing Wiring | 4 | 3 | not_started | KAR-MS0 |
| KAR-MS2.6: G-code/Cycle Wiring | 4 | 2 | not_started | KAR-MS0 |
| KAR-MS3: Wiring Routes | 5 | 2 | not_started | KAR-MS0, KAR-MS1 |
| KAR-MS3.1: Controller Knowledge | 4 | 2 | not_started | KAR-MS3 |
| KAR-MS3.2: Tooling Knowledge | 4 | 2 | not_started | KAR-MS3 |
| KAR-MS4: Business Learning | 5 | 3 | not_started | KAR-MS3, VID-EXT-MS0 |
| KAR-MS4.1: Video Tips Wiring | 3 | 2 | not_started | KAR-MS4, VID-EXT-MS2 |
| KAR-MS5: PUOA Core | 6 | 4 | not_started | KAR-MS3 |
| KAR-MS6: Domain Wrappers | 6 | 3 | not_started | KAR-MS5 |
| KAR-MS7: App Integration | 6 | 3 | not_started | KAR-MS6 |
| **TOTAL** | **72 units** | **27-29 sessions** | | |

**Dependency DAG:**
```
PDF-EXT-MS2 ─┬─→ KAR-MS0 ─┬─→ KAR-MS1 ──→ KAR-MS3 ─┬─→ KAR-MS3.1
             │            │                        ├─→ KAR-MS3.2
             │            ├─→ KAR-MS2 ──→ KAR-MS2.1├─→ KAR-MS4 ──→ KAR-MS4.1
             │            ├─→ KAR-MS2.5            │
             │            └─→ KAR-MS2.6            └─→ KAR-MS5 ──→ KAR-MS6 ──→ KAR-MS7
VID-EXT-MS2 ──────────────────────────────────────────┘
```

**Parallelization**: After KAR-MS0, KAR-MS1/MS2/MS2.5/MS2.6 can run in parallel.
After KAR-MS3, KAR-MS3.1/MS3.2/MS4/MS5 can run in parallel.
**Optimized with 6 agents**: 27-29 sessions → 9 sessions (1.9x speedup)

## Cross-Track Dependencies (NEW)

Lane 20 (KAR) integrates with multiple lanes:

| Lane | Produces | KAR Consumes |
|------|----------|--------------|
| **Lane 3** (VID-EXT) | Video knowledge | KAR-MS4.1 wires to TribalKnowledge |
| **Lane 4** (PDF-EXT) | PDF formulas, materials | KAR-MS2 wires to FormulaRegistry, MaterialRegistry |
| **Lane 5** (DB-EXP) | Controller, tool data | KAR-MS3.1, MS3.2 wire to knowledge layer |
| **Lane 18** (TK) | Tribal knowledge | KAR-MS0 provides unified schema |
| **Lane 2** (LEARN) | Learning infrastructure | KAR-MS5 provides orchestration entry point |

**IMPORTANT**: KAR does NOT duplicate extraction work from Lanes 3-5. It CONSUMES their outputs and wires them to engines.

---

# HEALTH CHECK REGENERATION (REQUIRED)

After this roadmap is accepted:
1. Run `/health` to regenerate HEALTH_CHECK_REPORT.json
2. Update BASELINE_INVENTORY.json with current counts
3. Update MEMORY.md to point to this roadmap v2

---

# END OF ROADMAP v2.5
