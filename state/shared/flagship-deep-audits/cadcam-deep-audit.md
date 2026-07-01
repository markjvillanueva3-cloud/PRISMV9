# CAD/CAM AUTONOMOUS Flagship Deep Audit — Consolidated Report

**Verdict:** 56/100 — **AUTONOMOUS-UNSAFE TODAY** · CAM strong, CAD dormant, operator-in-loop missing
**Date:** 2026-05-08
**Method:** 10 parallel Explore agents (honest-build scan + BUILD_STATE intersection)
**Comparison:** WEDM 82, Lathe 75, Mill 68, Quote 65, PPG 62, **CAD/CAM 56**, Shop 56, SFC 53

---

## EXECUTIVE SUMMARY

CAD/CAM Autonomous is the **highest-severity flagship audit** to date. The system can generate CAD models and CAM toolpaths autonomously — but the **operator-in-the-loop rule (declared "unconditional" in CLAUDE-BRIEF) is NOT enforced anywhere in code**. Five-sigma thresholds (Ω≥0.95, S(x)≥0.98) required for shop-floor output are not gated; only Ω≥0.70 hard constraint is active. AI can generate G-code, route to machine, with no human review and sub-five-sigma safety. **This is the highest-severity finding across all flagship audits.**

The asymmetry is sharp:
- **CAM toolpath: 72/100** — 52+ engines, hyperMILL production-grade (54 engines, full HTTP/COM API, 49+ strategies), Mastercam production (no live link)
- **CAD generation: 68/100** — 21 engines, PRISM_COMPLETE_CAD_GENERATION_ENGINE 2,914 LOC, blueprint→CAD bridge missing
- **CAD ML/AGI: dormant** — Mill reasoning ledger 8,228 entries; **CAD ledgers absent entirely**; CAD path missing closed-loop instrumentation
- **JM Die validation: 42/100** — 509 proven Haas mill programs available; **zero autonomous-vs-proven G-code diff validation harness exists**
- **Safety: 32/100** — operator-in-loop NOT FOUND; S(x)≥0.98 NOT ENFORCED; confidence-threshold routing NOT IMPLEMENTED

**Highest-leverage commits (BLOCKING for autonomous production):**
1. **Add `prism_safety:safety_gate_open` requiring `operator_acknowledge=true`** before NC write (4h)
2. **Five-sigma export lock**: deny NC export if Ω<0.95 OR S(x)<0.98 OR confidence<threshold (4h)
3. **Integrate confidence_threshold routing** — model uncertainty > threshold → human review (8h)
4. **Wire RAPS conformal prediction** into CAD/CAM autonomous gate (16h)
5. **Wire jm-die-program-corpus validation harness** — autonomous output vs 509 proven programs (40h)

Time to autonomous-safe production: **~72h core + 200h depth**.

---

## AGENT SCORECARD

| # | Agent | Domain | Score | Status |
|---|---|---|---:|---|
| 1 | CAD generation engines | 21 engines, PRISM_COMPLETE 2914 LOC | 68 | ✓ Solid core |
| 2 | CAM toolpath | 52+ engines, full HSM/Adaptive/5-axis | 72 | ✓ Strong |
| 3 | 6 CAM bridges | hyperMILL production, others scaffolded | 62 | ⚠ Asymmetric |
| 4 | Frontend | 6 pages + Viewer3D + 2 codex pending | 72 | ⚠ Merge backlog |
| 5 | Tests | 40 files / 494 it() / 74% real | 64 | ⚠ Gaps |
| 6 | Feature recognition | (prior dispatch — see file) | 65* | ⚠ |
| 7 | **JM Die fleet** | **0 autonomous validation vs 509 proven** | **42** | **✗ Disconnected** |
| 8 | ML/AGI | Mill 8228 ledger, CAD ABSENT | 61 | ⚠ CAM-only |
| 9 | **Safety** | **Operator-in-loop NOT ENFORCED** | **32** | **✗ BLOCKING** |
| 10 | Honest scan | 49 engines + 544 actions wired | 48 | ⚠ Roadmap drift |
| | **Composite** | | **56** | **Autonomous-unsafe** |

\* Agent 6 score estimated from prior session output.

---

## PART A — CAD GENERATION ENGINES (Agent 1) · 68/100

- **21 CAD generation engines** cataloged
- **`PRISM_COMPLETE_CAD_GENERATION_ENGINE`**: 2,914 LOC core engine — full B-rep, sweeps, lofts, feature history
- Wiring: 72% PRISM-wide; CAD subset ~65% (30–40 unwired NURBS/constraint/topology)
- **Gaps**: blueprint→CAD bridge missing, frontend merge blockers (React 18/19 conflict), Fusion interop incomplete

---

## PART B — CAM TOOLPATH GENERATION (Agent 2) · 72/100

- **52+ autonomous CAM toolpath engines** across 6 tier-1 bridges
- Strategy coverage: HSM, Adaptive, Rest, 5-Axis, 3+2, Waterline, Scallop, Pencil, Swarf
- Cross-CAM translation: Mastercam ↔ hyperMILL complete; Esprit/CATIA/NX 45% (LoRA adapters pending)
- 100% tier-1 wired

---

## PART C — 6 TIER-1 CAM BRIDGES (Agent 3) · 62/100

| CAM | Engines | Live Link | Strategies | Status |
|---|---:|---|---:|---|
| **hyperMILL** | 54 | Full HTTP/COM API | 49+ | ✓ Production (best, 95/100) |
| Mastercam | 4 | C-Hook only, no live link | — | ✓ Production |
| Fusion 360 | 15 | Cloud API | 13 | ⚠ Beta (add-in plan-only) |
| Inventor HSM | 0 | — | — | ✗ Stub |
| Esprit | 0 | — | — | ✗ Stub |
| SolidWorks | 0 | — | — | ✗ Stub |

**hyperMILL deep dive**: 54 engines, full Project Manager runtime, HTTP/COM bidirectional API, 49+ strategies — best-in-class production
**Asymmetry**: 3 of 6 tier-1 CAMs are scaffold-only despite declarations

---

## PART D — FRONTEND (Agent 4) · 72/100

### mcp-server/web CAD/CAM pages
- CADAIStatePage, CamStrategyPage, cam-ai-dashboard
- Viewer3D, StockMesh, ToolpathLayer (3D viewer working)
- 6 production pages

### Pending codex frontends (NOT MISSING — merge-pending)
- **cqask/ui** (cqask-orion-cad): Next.js 13 + Ant Design + Tailwind — natural-language CAD prompt UI
- **mcp-cadquery/frontend**: Vite + React 19 + Three.js (@react-three/fiber) — 3D viewer enhancement

**React-version conflict**: main mcp-server/web uses React 18; mcp-cadquery uses React 19. Per `frontend-merge-plan` skill output, port-vs-sandbox decision needed.

---

## PART E — TESTS (Agent 5) · 64/100

- **40+ CAD/CAM test files** containing **~494 it() blocks**
- **74% real assertions** vs **26% stubs**
- Round-trip coverage verified across 933 matching files
- 3 E2E test suites
- **Gaps**: stock evolution sparse, 40% blueprint tests lack adversarial modes, orchestrator tests missing force/chatter/surface validation, no scaling tests

---

## PART F — FEATURE RECOGNITION (Agent 6) · 65/100*

(From prior dispatch, see `cadcam-agent-6-feature-recog.md`)

---

## PART G — JM DIE FLEET VALIDATION (Agent 7) · 42/100

### Ground-truth available, autonomous pipeline disconnected
- **509 proven Haas mill programs** across 53 customers with full metadata
- FONTANA B-1289-11 grip blocks documented (OP1/OP2, 3D surfacing, G154 work offset, 0.03" stepover)
- **Autonomous validation: ZERO**

### Per-machine
| Machine | Status | Programs | Autonomous |
|---|---|---:|---|
| Haas VF-2 (NGC) | READY | 26 | Untested |
| Hurco VM30i | BROKEN | 0 | Engine targets VMX24 (mismatch from Mill audit) |
| Haas OM-2 (NGC) | UNKNOWN | 0 | No NGC verification catalog |
| Roku HC-658-II | PARTIAL | 1 | Parser exists, post-processor unwired |
| Okuma M460V-5AX | READY | 0 | RTCP wired, zero test programs |
| Multus B250II | LATHE ONLY | — | **No mill-turn B-axis autonomous strategy** |

### Critical gaps
1. `jm-die-program-corpus` engine never instantiated
2. Zero autonomous-vs-proven G-code diff validation
3. Multus B250II B-axis mill-turn logic missing (audit blind spot)
4. Customer variability (118 customers, FONTANA 98 programs concentrated) NOT modeled in CAM strategy selection

---

## PART H — ML / AGI (Agent 8) · 61/100

### Reasoning Ledgers
| Domain | Entries | Size |
|---|---:|---:|
| Mill | 8,228 | 4.1 MB |
| WEDM | 311 | 75 KB |
| **CAD** | **0** | **ABSENT** |
| **CAM** | **0** | **ABSENT** |
| Lathe | 0 | empty |
| SFC | 0 | none |

### Tier hierarchy
- **Tier-1 orchestrators**: 3 found, 2 wired (1 dormant)
- **Tier-2 coordinators**: 3 found, all wired
- **Tier-3 specialists**: 26 found, mostly CAM-focused; **CAD specialists dormant**

### Closed-loop status
- **CAM**: Fully instrumented — 5 feedback engines wired
- **CAD**: Completely missing closed-loop telemetry

**CAD/CAM AGI is 60% complete** — CAM path operational, CAD path dormant.

---

## PART I — SAFETY (Agent 9) · 32/100 ✗ HIGHEST-SEVERITY FINDING ACROSS ALL AUDITS

### Static safety gates (wired)
- Collision detection ✓
- DFM validation ✓
- Workholding force ✓
- Spindle envelope ✓
- Stock verification ✓
- MRR bounds ✓

### CRITICAL gaps (autonomous-blocking)
- **Operator-in-loop confirmation: NOT FOUND** — CLAUDE-BRIEF declares this "unconditional"; **the rule is not enforced in code**
- **S(x)≥0.98 five-sigma gate: NOT ENFORCED** — only Ω≥0.70 hard constraint active vs required Ω≥0.95 + S(x)≥0.98
- **Confidence-threshold routing: NOT IMPLEMENTED** — model uncertainty does not route to human review
- **Frontend**: Ω shown; S(x) breakdown hidden; no confidence display

### Implication
AI can autonomously generate G-code, route to machine, with no human sign-off and sub-five-sigma safety. **This is the highest-severity finding across all flagship audits to date.**

---

## PART J — HONEST-BUILD SCAN (Agent 10) · 48/100

### Reality
- **49 CAD/CAM engines** wired
- **544 dispatcher actions** wired
- **20 tests** (0.9% coverage of action surface)
- **9 wiki entries** (1.7% of action surface)

### Roadmap vs Reality (CAD-COMPLETE-MS0)
- Envelope claims: **0 shipped / 335 pending**
- Reality: **13% shipped** (last_shipped_date null in metadata)
- Drift cause: stale envelope, unit count conflates actions with engineering units, no recent git tag verification

### Same pattern as Quote
Roadmap stale; codebase ahead. Documentation/awareness layer abandoned.

---

## CRITICAL BLOCKERS (Severity Order)

### TIER 0 — Autonomous safety (MUST close before any autonomous CAM ships)
1. **No operator-in-loop enforcement** (4h) — declared unconditional, not in code
2. **No five-sigma S(x)≥0.98 export lock** (4h)
3. **No confidence-threshold routing** to human review (8h)
4. **No conformal prediction wired to CAD/CAM gate** (16h)

### TIER 1 — Production trust
5. **Zero JM Die corpus validation harness** (40h) — 509 proven programs unused
6. **Hurco VM30i engine targets wrong machine** (VMX24 vs VM30i) — re-audit confirms Mill audit finding
7. **Multus B250II mill-turn B-axis strategy missing** (40h)
8. **CAD reasoning ledger / training corpus absent** — closed-loop learning impossible (16h to wire ledger; 80h to populate)

### TIER 2 — Coverage
9. **3 of 6 tier-1 CAMs are scaffolds** (Inventor HSM, Esprit, SolidWorks): 0 engines each (240h to bring to hyperMILL parity)
10. **Blueprint→CAD bridge missing** (40h)
11. **CAD test coverage 0.9%** of action surface (80h)

### TIER 3 — Frontend
12. **2 codex frontend merges pending** — cqask/ui (Next.js 13) + mcp-cadquery (React 19) — port-vs-sandbox decision needed (24h)

---

## RECOMMENDATIONS (priority order)

### IMMEDIATE — Stop autonomous-safety gap (32h)
1. operator_acknowledge gate (4h)
2. Five-sigma export lock (4h)
3. Confidence-threshold routing (8h)
4. RAPS conformal prediction wiring (16h)

### NEXT SPRINT — Production trust (96h)
5. JM Die corpus validation harness (40h)
6. Fix Hurco VM30i engine target (8h)
7. Multus B250II B-axis strategy (40h)
8. CAD reasoning ledger wiring (8h)

### M2 — Coverage (160h)
9. Bring Inventor HSM to parity (60h)
10. Bring Esprit to parity (60h)
11. Bring SolidWorks to parity (40h) — Mastercam pattern
12. Blueprint→CAD bridge (40h, partial overlap with PPG audit)

### M3 — Tests + Frontend (104h)
13. CAD test coverage to 30% (80h)
14. Codex frontend merge resolution (24h)

---

## TIME-TO-PRODUCTION ESTIMATE

| Phase | Hours | Score Impact |
|---|---:|---|
| Autonomous-safety closure (TIER 0) | 32 | 56→68 |
| JM Die + critical engine fixes | 96 | 68→76 |
| 3 missing CAM bridges | 160 | 76→84 |
| CAD ledger + tests | 88 | 84→90 |
| Codex frontend merge | 24 | 90→92 |
| Wiki + roadmap reconciliation | 24 | 92→94 |
| Four-sigma hardening | 80 | 94→97 |
| **Total** | **504** | **56→97** |

---

## SUMMARY

CAD/CAM Autonomous has the **best production-grade CAM bridge in PRISM (hyperMILL, 95/100)** alongside the **most dangerous gap in any flagship audited**: autonomous G-code generation with no operator-in-loop enforcement, sub-five-sigma safety thresholds active, and zero validation against 509 proven JM Die programs sitting on disk.

The 32-hour TIER 0 closure unblocks this from "autonomous-unsafe today" to "production-acceptable" — but **this work is non-negotiable before any customer-shop runs autonomous CAM**. After TIER 0, the rest of the path (504h to four-sigma) follows the same pattern as Quote and PPG: codebase ahead of documentation, tests sparse, integration with JM Die corpus disconnected.

**Composite Verdict: 56/100 — Autonomous-Unsafe Today, 32h to Production-Acceptable, 504h to Four-Sigma.**

This is the **single highest-severity audit** in the consolidation. All other flagships have integration/wiring gaps; CAD/CAM has a **shop-floor safety gap with regulatory and operator-trust implications**.
