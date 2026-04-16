# Roadmap Convergence Audit — 2026-03-27

## Purpose

This document reorganizes the remaining roadmap work into one practical execution order while the roadmap collaboration gate remains active.

Canonical rule:

- [C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md](C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md) remains the only canonical roadmap.
- [C:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-SHOP-OS-roadmap.md](C:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-SHOP-OS-roadmap.md) remains the connected-shop operating-system overlay for the current business/frontend convergence track.
- All other roadmap phase docs remain valid reference tracks, but they should not be treated as equal-priority concurrent build queues during the current convergence tranche.

## Gate Status

- Current mode: `finish-current-delivery-first`
- Gate: `finish-current-backend-and-frontend-work-first`
- Meaning: do not open a new broad roadmap expansion pass until the current backend/frontend delivery tranche converges.

## Roadmap Reorganization

### Tier 1 — Active Convergence Stack

This is the only stack that should drive day-to-day build priority right now.

#### 1. Backend source-of-truth spine

Primary canonical anchors:

- v24 Phase 5
  - `Session 5-1` Persistence Layer Migration
  - `Session 5-5` E2 Shop System Connector
  - `Session 5-8` Frontend to Backend Wiring
  - `Session 5-9` QuoteToShip End-to-End Validation
- v24 Phase 6
  - `Session 6-1` Route Contract Stabilization
  - `Session 6-2` File Upload + CAD Storage + Parts Library
  - `Session 6-3` Instant Quote Pipeline
  - `Session 6-4` DFM Analysis + GD&T Backend
  - `Session 6-6` Approval Workflows + Audit Trails
  - `Session 6-7` Job Traveler + Dual Time Tracking
  - `Session 6-8` Role-Based Desks + Global Search
- ULT overlay
  - `ULT-MS0` Canonical Shop Domain + Event Spine
  - `ULT-MS1` Live Shop Execution Core
  - `ULT-MS2` Role-Aware Experience Layer
  - `ULT-MS3` Operational Workflow OS

Ownership:

- Claude owns implementation.
- Codex consumes contracts only after Claude exposes them.

#### 2. Frontend convergence surfaces

The frontend should stay locked to provider-seam integration work that makes the current backend tranche visible and usable.

Priority surfaces:

- employee shell
- jobs desk
- scheduling desk
- shop floor clock
- shell search, counts, recents, pins
- Print to CNC / Program Release

Frontend rule:

- no new page-local business logic when a provider seam can carry the contract instead
- keep backend gaps documented at the seam/type layer

Ownership:

- Codex owns implementation.
- Claude remains contract authority.

### Tier 2 — Near-Term Extension After Core Convergence

These remain important, but only after the current source-of-truth stack is stable enough to bind cleanly.

Primary anchors:

- v24 Phase 5
  - `Session 5-10` Multi-ERP Connector Framework
- v24 Phase 6
  - `Session 6-5` QuickBooks Online Connector
  - `Session 6-9` Customer Portal + Milestone Tracking
  - `Session 6-10` Preset Libraries + Learning Backend
- ULT overlay
  - `ULT-MS4` External Sync + Intelligence Fabric

Interpretation:

- this tier expands from one canonical operating spine into finance, customer, sync, and intelligence-adjacent business flows
- it should begin only once the current traveler, quote, shell, and workflow contracts are stable

### Tier 3 — Launch Hardening And Proof

This tier is the production gate, not the current feature-build lane.

Primary anchors:

- v24 Phase 12
  - exhaustive real-part validation
- v24 Phase 13
  - final wiring, web UI, commands, release gate, deployment readiness
- ULT overlay
  - `ULT-MS5` Launch, Hardening, and Adoption

Interpretation:

- Phase 12 and Phase 13 are the natural home for production proof, release readiness, and full-system validation
- this is where the current employee shell, Program Release, traveler, sync, and quote flows become formally releaseable

### Tier 4 — Strategic Reference Tracks, Not Current Build Queues

These roadmap docs remain highly valuable, but should be treated as source libraries for the next roadmap pass, not immediate concurrent execution queues:

- [PHASE_R6_PRODUCTION.md](C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R6_PRODUCTION.md)
- [PHASE_R7_INTELLIGENCE.md](C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R7_INTELLIGENCE.md)
- [PHASE_R8_EXPERIENCE.md](C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R8_EXPERIENCE.md)
- [PHASE_R9_INTEGRATION.md](C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R9_INTEGRATION.md)
- [PHASE_R10_REVOLUTION.md](C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R10_REVOLUTION.md)
- [PHASE_R11_PRODUCT.md](C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R11_PRODUCT.md)

How to reinterpret them now:

- `R6` becomes the deeper production hardening reference that feeds v24 Phase 12 and Phase 13.
- `R7` becomes the intelligence backlog that should plug in only after the operating spine is trustworthy.
- `R8` remains partially active as a UX reference, but full intent-engine scope should wait until the backend operating spine and enough live intelligence exist.
- `R9` partially overlaps the current v24 Phase 5, Phase 6, and `ULT-MS4` sync/integration work, so it should be mined for patterns instead of run as a parallel roadmap.
- `R10` is explicitly post-foundation and should remain deferred.
- `R11` product packaging should wait until the system is converged, validated, and launch-gated.

## Logical Build Order

### Wave A — Converge core shop operations

Backend first:

1. stabilize live contracts and persistence
2. land canonical file/CAD/parts storage
3. land quote, DFM, traveler, approval, and search contracts
4. emit realtime/live updates where those workflows require it

Frontend in parallel:

1. keep employee shell role-aware and provider-bound
2. keep Program Release aligned to file/quote/DFM contract shapes
3. keep jobs, scheduling, and shop clock aligned to traveler/workflow/search contracts
4. avoid drifting into disconnected UX-only feature work

### Wave B — Converge business and external sync

Backend first:

1. accounting and ERP connector broadening
2. customer portal and milestone tracking
3. learning/preset backend

Frontend in parallel:

1. bind live sync health, portal posture, and business drilldowns
2. expand shell/search/desk surfaces only where live data exists

### Wave C — Cross-audit after convergence

Only after the convergence gate is truly satisfied:

- Claude audits the frontend and fills UX and workflow gaps
- Codex audits the backend and fills contract, persistence, or wiring gaps

This should produce a new roadmap pass at that time, not before.

### Wave D — SVI-maximizing roadmap pass

After convergence and cross-audit:

- generate the next dependency-ordered roadmap with explicit SVI/Psi impact
- fold in knowledge-domain extraction opportunities
- identify missing skills, scripts, hooks, indexes, and MCP enhancements
- focus on self-learning, retention, deep learning, token efficiency, context survival, and system-wide feature expansion

## Current Role Split

- Claude: backend-first until convergence
- Codex: frontend-first until convergence
- After convergence: swap audit direction before opening the next broad roadmap pass

## SVI Interpretation

The SVI-aware priority is not “do everything now.” It is:

1. finish the highest-dependency work already in flight
2. reduce fragmentation between roadmap families
3. avoid building parallel systems for the same business flow
4. preserve one canonical execution order so future roadmap generation increases coverage instead of increasing chaos

## Most Important Sequencing Reminder

Treat v24 Phase 5 and Phase 6 plus the ULT overlay as the live build program.
Treat R6-R11 as reference tracks and post-convergence backlog sources until the current backend/frontend tranche is complete and stable.
