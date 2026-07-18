# MILL Deep Audit — Agent 10: Existing Roadmap Reconciliation

**Date:** 2026-05-08
**Agent:** Agent 10 (Mill Roadmap Reconciliation)
**Scope:** 6 major PRISM mill roadmaps + RGS milestones
**Goal:** Inventory all milestones, status, conflicts, unfinished work; prepare for Agent 11 master-roadmap synthesis

---

## Executive Summary

PRISM has **5 competing mill roadmaps** plus 1 unified meta-roadmap (May 04) that attempts reconciliation. Total exposure: **~850 units** across **~80 milestones**. 

**Critical finding:** MILL-AGI-UNIFIED-ROADMAP-2026-04-16 claims to supersede all others, but conflicts with v3.1 and v4 suggest different philosophies:

- **v3.1 (Apr 15):** AGI-focused — 64 units, **EXECUTION-READY**
- **v4 (Apr 15):** Integration-first — 39 units, **STOP CREATING**
- **AGI-UNIFIED (Apr 16):** Absorbs all three, 7 ordered phases — 845 units, **SUPERSEDES prior**
- **May 04 Meta-Roadmap:** 21-milestone synthesis with multi-model consensus

---

## Roadmaps Read (Summary Table)

| Roadmap | Size | Date | Scope | Status |
|---------|------|------|-------|--------|
| MILLING-COMPREHENSIVE | 69 KB | Mar 30 | 11 milestones, 113 units | Not started |
| MILL-TURN-COMPREHENSIVE | 65 KB | Mar 30 | 12 milestones, 138 units | Not started |
| FIVE-AXIS-COMPREHENSIVE | 74 KB | Mar 30 | 12 milestones, 125 units | Not started |
| MILL-AI-INTEGRATION-v3.1 | 33 KB | Apr 15 | 14 milestones, 64 units | EXECUTION-READY |
| MILL-AI-INTEGRATION-v4 | 13 KB | Apr 15 | 5 phases, 39 units | INTEGRATION-FIRST |
| MILL-AGI-UNIFIED | 43 KB | Apr 16/21 | 7 phases, 845 units | SUPERSEDES |
| PRISM-COMPREHENSIVE (May 04) | 8 KB | May 04 | 21 milestones | Meta-synthesis |

---

## Key Findings

### Per-Roadmap Status
- **MILLING-COMPREHENSIVE:** NOT STARTED (~170 person-days)
- **MILL-TURN-COMPREHENSIVE:** NOT STARTED; DEFER (JM DIE has no mill-turn machine) (~180 person-days)
- **FIVE-AXIS-COMPREHENSIVE:** NOT STARTED; filter to M460V indexed 3+2 only (~65 person-days)
- **MILL-AI-INTEGRATION-v3.1:** EXECUTION-READY (64 units, 5-pass scrutiny, 10 engines USE EXISTING)
- **MILL-AI-INTEGRATION-v4:** INTEGRATION-FIRST (39 units, activate 1,869 orphaned engines)
- **MILL-AGI-UNIFIED:** Master roadmap (845 units, 7 phases, explicit supersession)

### Critical Conflicts

**Conflict A: Physics Engine Authorship vs Wiring**
- v3.1: Create MerchantShearAngleEngine, LoewenShawTemperatureEngine (5 units)
- v4: Wire existing LoewenShawHeatPartitionEngine, ChipFormationPredictionEngine (0 new)
- Verification: LoewenShawHeatPartitionEngine NOT FOUND (v3.1 correct); ChipFormationPredictionEngine EXISTS
- **Resolution:** Hybrid — Create Merchant + Loewen-Shaw (v3.1), wire Chip Formation + Advanced Cutting Math (v4)

**Conflict B: Tribal Knowledge Scope**
- v3.1: Create 60–80 new tips (Plastics, Insert, Recovery, Diagnostics)
- v4: Activate 4,493 existing tips
- **Resolution:** Complementary — activate existing 4,493 (v4) + author 40 new domain-specific (v3.1)

**Conflict C: Phase Hierarchy**
- v3.1: Quick milling after P0
- AGI-UNIFIED: 2 extra phases (P0 AGI, P1 strategy) before milling
- **Resolution:** AGI-UNIFIED is authoritative (latest, broadest)

**Conflict D: CAMX Scope**
- v3.1: HyperMill-centric (30 days)
- AGI-UNIFIED: 9-way CAM parity (200+ days)
- **Resolution:** Adopt v3.1 (HyperMill flagship)

---

## Items at Risk of Being Forgotten

1. MILL-MS0.5: POST-ULT dialect reconciliation (17 engines, 105 tests)
2. In-process probing (NIST/Renishaw macros)
3. Stock allowance optimization
4. Guard bushing vs non-guard-bushing Swiss logic
5. Parametric part program generation (MILL-MS9)

---

## 5-Axis Items (Okuma M460V-5AX)

Filtered for JM DIE M460V (table-table AC, indexed 3+2):

| Item | File | Effort |
|------|------|--------|
| Kinematics registration (AC matrix) | src/engines/KinematicsRegistryEngine.ts | 4d |
| 3+2 indexed strategy selector | src/engines/IndexedVsSimmultaneousStrategyEngine.ts | 8d |
| RTCP/TCP compensation | extend RTCPCompensationEngine | 5d |
| G93 inverse time feed | extend GCodeGeneratorEngine | 6d |
| Rotary collision avoidance | extend CollisionPreventionEngine | 8d |
| Singularity detection | SingularityDetectionEngine.ts | 4d |
| Effective diameter at tilt | extend MillingPhysicsKernelEngine | 8d |
| Barrel cutter scallop | BarrelCutterScallopEngine.ts | 5d |
| RCSA for tilted tool | extend ChatterStabilityLobeEngine | 10d |
| Toolpath validation (15 parts) | src/__tests__/5axis/ | 8d |

**Total:** ~65 days indexed 3+2

---

## Concrete Unfinished Items — 72 Total

### Tier 1: AGI Foundation (P0, ~80 person-days)
Items 1–24: Extended Taylor, Merchant, Loewen-Shaw, Helix, physics kernel, tribal tips, AGI engines (reasoning, neural networks, transformers, etc.), awareness middleware

### Tier 2: Milling Hardening (P2, ~85 person-days)
Items 25–41: Pocket 2.5D, contour, cutter compensation, machine selection, tool deflection, workholding, end-to-end pipeline, controller hardening (Haas/Mazak), RCSA, POST-ULT dialect, parametric programming, test suite

### Tier 3: Strategy Foundation (P1, ~30 person-days)
Items 42–46: Strategy taxonomy, optimal strategy v2, validation handshake, feature-to-strategy, test matrix

### Tier 4: 5-Axis (P4, ~65 person-days)
Items 47–56: Kinematics, 3+2 selector, RTCP, G93, rotary collision, singularity, effective diameter, scallop, RCSA, validation

### Tier 5: Orchestration & Search (P4–P5, ~40 person-days)
Items 57–63: Master orchestrator, unified algorithm API, formula wiring, tribal search, MIT/video integration, universal asset search

### Tier 6: Frontend + Learning (P6–P7, ~35 person-days)
Items 64–72: Codex audit, new mill pages, page upgrades, MCP endpoints, E2E tests, tribal auto-promotion, feedback intake, SVI coupling, audit script

---

## Recommendation for Master Roadmap

### ACCEPT MILL-AGI-UNIFIED-ROADMAP-2026-04-16 as Master Authority

**Reasons:**
1. Most comprehensive (845 units, 7 phases)
2. Explicit supersession claim (Section 19)
3. Latest date (Apr 16)
4. Incorporates all prior roadmaps

### Adopt Hybrid Timeline with JM DIE Focus

| Phase | Effort | Wall Time (2 eng) |
|-------|--------|------------------|
| P0: AGI Foundation | 62u, ~80d | 6 weeks |
| P1: Strategy Foundation | 22u, ~30d | 3 weeks |
| P2: Milling Hardening | 113u, ~170d | 10 weeks |
| P4: 5-Axis M460V (3+2 indexed) | ~65u, ~65d | 5 weeks |
| P5: HyperMill Focus | ~50u, ~70d | 5 weeks |
| P6: Frontend Wiring | 85u, ~90d | 6 weeks |
| P7: Continuous Learning | setup 20d | Concurrent |

**Critical Path:** ~30 weeks (7 months)

### Specific Modifications

1. Add M460V kinematics (AC table-table) + indexed 3+2 as P4 primary
2. Defer mill-turn (P3, 138u) unless new customer signed
3. Defer CAMX 9-way parity (P5 at 300u) to HyperMill only (50u)
4. Modify P0: Verify v4's target engines exist before committing to "wiring vs creating"
5. Add P6.1: Codex app audit on live H:/prism/web/ paths

---

## Summary

**Total unfinished work:** 72 concrete items, ~400–500 person-days depending on feature scope.

**Critical path timeline:** 7 months for 2-engineer team (M460V 3+2 + HyperMill + P0 AGI foundation, JM DIE focus only).

**Next step:** Agent 11 should accept AGI-UNIFIED as master authority with modifications above, then generate detailed RGS milestone envelopes for P0, P1, P2, P4 in parallel.

---

*End of Reconciliation Report*
*Generated: 2026-05-08*
