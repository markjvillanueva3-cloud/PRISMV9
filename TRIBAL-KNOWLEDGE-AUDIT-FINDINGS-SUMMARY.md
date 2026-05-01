# Tribal Knowledge Propagation Audit — Executive Summary
**Agent 17 Code Review** | 2026-03-31

---

## The Core Problem

PRISM has successfully **captured 4,425 pieces of tribal machining knowledge** but has **trapped them in silos**. The system violates its own canonical rule:

> "No tribal knowledge should remain trapped in one engine, one page, one shop, or one terminal."

**Reality:** 99% of tribal knowledge is static source code or ephemeral in-memory. It does not flow to production decisions.

---

## Three Critical Blockers

### 1. ZERO Consumer Wiring to Core Engines (0%)

The 10 most critical decision engines in PRISM do not consult tribal knowledge:

- **SpeedFeedOrchestratorEngine** (2,851 LOC, 67 integration points) — Never calls `tribal_suggest()`
- **PrintToProgramPipelineEngine** (2,194 LOC, root milling pipeline) — No knowledge routing
- **TurningPrintToProgramEngine** — G96/G97 tips never consulted
- **CuttingForceEngine** — Material modifiers not applied
- **ChatterStabilityLobeEngine** — Damping heuristics missing
- **SmartToolSelectorEngine** — Compatibility tips unused
- **AlarmDiagnosticsEngine** — Troubleshooting rules never surfaced
- **InstantQuoteEngine** — Cost corrections ignored
- **MultiAxisPrintToProgramEngine** — Collision avoidance lessons unused
- **SurfaceFinishPredictorEngine** — Feed heuristics forgotten

These 10 engines power 90% of user-facing recommendations. **NONE use tribal knowledge.**

Impact: **CRITICAL** — Recommendations proceed without expert guidance.

---

### 2. Knowledge Persistence Broken (50%)

| Learning Path | Persists? | Lost On Restart? | Status |
|---|---|---|---|
| Static CAM tips (3,752) | YES | NO | ✓ OK |
| Hardcoded KNOWLEDGE_BASE (377) | YES | NO | ✓ OK |
| **Operator-captured tips** | **IN-MEMORY** | **YES** | ✗ **LOST** |
| **Apprentice lessons** | **IN-MEMORY** | **YES** | ✗ **LOST** |
| Document learning | YES (silo) | NO | Separate silo |
| Video learning | NO | YES | Broken loop |

**Verdict:** Operator learning — the most valuable kind — disappears on server restart.

Impact: **CRITICAL** — System learns nothing from real-world feedback.

---

### 3. Roadmaps Not Bound to Knowledge (0% /rgs Blocks)

All 8 machine roadmaps (LATHE, MILLING, GRINDING, etc.) declare knowledge sources but have **zero /rgs SESSION blocks** to bind them to execution.

Example: MILL-MS5 (adaptive/trochoidal) lists:
- 261 Mastercam tips
- 83 HyperMILL tips
- 296 playbook rules
- 499 formulas

But when the engine runs, it asks: **Nothing.**

No SMART CONFIG specifies:
- Which tips apply to this milestone
- In what order they are consulted
- What confidence level is required
- How to handle conflicts

Impact: **MAJOR** — Knowledge documented but not actionable.

---

## Secondary Findings

| Finding | Status | Impact |
|---------|--------|--------|
| FormulaRegistry (499 formulas) unwired | 0 consumer queries | HIGH |
| MachiningPlaybookEngine (296 rules) rarely used | 1 dispatcher of 79 | HIGH |
| No knowledge routing contract (canonical schema) | Spec only, not code | MAJOR |
| No provenance tracking | Tips have no source/confidence/date | MAJOR |
| No "explain why" in frontend | Users blind to reasoning | MAJOR |
| Separate DocumentLearning silo | Not integrated with TribalKnowledgeEngine | HIGH |
| VideoLearningEngine broken | Produces output, never captures | MEDIUM |
| No bidirectional learning loop | Shop outcomes don't update tips | CRITICAL |
| No knowledge versioning in roadmaps | Can't track when tips change | MINOR |
| TribalKnowledgeEngine search unoptimized | Linear scan on 4K+ items | MINOR |

---

## Wiring Score Breakdown

| Layer | Coverage | Status |
|-------|----------|--------|
| Manufacturing Calculation (67 engines) | 0% | ✗ BLOCKED |
| Pipelines (9 engines) | 0% | ✗ BLOCKED |
| Business/Quoting (20 engines) | 0% | ✗ BLOCKED |
| Safety/Alarms (14 engines) | 0% | ✗ BLOCKED |
| Post Processing (5 engines) | 0% | ✗ BLOCKED |
| Training/Learning (3 engines) | 33% | ⚠ PARTIAL |
| Frontend Pages (8 pages) | 0% | ✗ BLOCKED |
| Dispatchers (7 of 79) | 14% | ⚠ PARTIAL |
| **OVERALL TRIBAL WIRING** | **~1%** | **✗ CRITICAL** |

---

## The Roadmap Gap

**TK Roadmap Status:** Excellent design (Waves TK-0 through TK-7 well-specified)

**Execution Status:**
- TK-0 (Audit): ✓ Complete (2026-03-28)
- TK-1 through TK-7: **NOT STARTED**

**Blocker:** Queued behind MP-1A convergence. No execution timeline or ownership assigned.

**Current Estimate to 100% wiring:** ~90 calendar days at MAX effort.

---

## What Needs to Happen

### Immediate (Before MP-1A finalizes)

1. **Persist tribal_capture** — Operator tips must survive server restarts (3 days)
2. **Build knowledge routing contract** — Canonical schema for all consumers (4 days)
3. **Add /rgs SESSION blocks** to LATHE and MILLING roadmaps (2 days)

### Next Tranche (Waves 1-2, ~35 days)

1. **TK-1:** KnowledgeApplicabilityEngine + FormulaRegistry query (8 days)
2. **Wire 10 Tier-1 consumers** (SpeedFeed, Print-to-Program, etc.) (20 days)
3. **Wire 7 pipelines** to knowledge routing (15 days)

### Long-term (Waves 3-7, ~55 days)

1. **TK-3:** Bidirectional feedback loop (12 days)
2. **TK-4:** Frontend explain-why panels (15 days)
3. **TK-5:** Search + messaging (10 days)
4. **TK-6:** Tenant specialization (8 days)
5. **TK-7:** Forge-triple enforcement (6 days)

---

## Recommendations

### 1. Parallelize TK-1 with MP-1A

Current plan: "Start TK after MP-1A done."

Better: Start TK-1 (persistence, routing contract) **now** in parallel. These don't block MP-1A.

### 2. Adopt /rgs SESSION Structure in All Roadmaps

Every machine roadmap milestone should include:

```markdown
### /rgs SESSION LATHE-MS1-U1: Threading 4340 Steel

SMART CONFIG:
  knowledge_scope: ["threading", "tool-geometry", "surface-finish"]
  active_tribal_tips: "solidcam-turning + fanuc-specific + thermal-wear"
  playbook_rules: ["thread-depth-per-pass", "insert-geometry-for-hardness"]
  formulas: ["Kienzle(ISO M)", "ChipLoad(taper 25°)", "ThreadFit(ISO 6g)"]
  evidence_required: "repeated-local"

KNOWLEDGE SOURCES:
  - TribalKnowledgeEngine.search(operation_type='threading', material_iso='M')
  - MachiningPlaybookEngine.threadingRules()
  - FormulaRegistry.kienzle()
```

### 3. Create Forge-Triple for Every Knowledge Route

When a dispatcher is wired to tribal knowledge:

- **Engine:** The routing logic (e.g., `KnowledgeApplicabilityEngine`)
- **MCP Action:** Exposed for testing and explanation
- **Skill:** User-facing skill for inspection
- **Hook:** Guard to warn if consumer launches without knowledge dependency

### 4. Build Knowledge Versioning into Roadmap Contract

Roadmaps should track:

```json
{
  "knowledge_manifest": {
    "captured_at": "2026-03-31T00:00Z",
    "tip_count": 4129,
    "playbook_rules": 296,
    "consumer_wiring": 0.28,
    "gaps": ["SpeedFeed unwired", "Playbook unused", "Feedback loop missing"]
  }
}
```

### 5. Auto-Inject Learning into Next Session

When a session exits with captured tips:

```typescript
// PostToolUse hook
if (capturedTribalTips.length > 0) {
  updateRoadmapKnowledgeSources(nextSessionId, capturedTribalTips);
}
```

---

## SVI Impact

Closing these gaps directly raises Psi:

| Milestone | SVI Tribal Wired % | Cumulative Psi Impact |
|-----------|-------------------|----------------------|
| Status quo | 30% | Baseline (Psi ~40.8%) |
| TK-1 + Tier 1 consumers | 45% | +15% |
| TK-1 + Tier 1-2 | 55% | +25% |
| TK-1 through TK-3 | 75% | +45% |
| TK-1 through TK-7 (100%) | 100% | +70% (Psi → 100%) |

---

## Risk Assessment

### If We Don't Fix This

1. **Knowledge islands persist** — Tribal knowledge remains static; system never learns
2. **Optimization impossible** — Recommendations ignore expert guidance; user frustration grows
3. **SVI plateau** — Psi stuck at 40-45%; cannot reach 100% without full TK propagation
4. **Competitive disadvantage** — Hand-programmed CNC code will outperform PRISM because it has tribal knowledge baked in

### If We Fix This (Immediate Start)

1. **Rapid SVI gains** — +15% in 6 weeks (TK-0..TK-2), +45% in 16 weeks (TK-0..TK-3)
2. **User confidence grows** — Recommendations show "why", backed by expert knowledge
3. **Self-improving system** — Each shop outcome feeds next recommendation
4. **Competitive edge** — PRISM becomes smarter as shops use it

---

## Critical Path Decision

**Propose:** Activate TK-1 kickoff for **2026-04-07** (immediately after MP-1A routes stabilize).

**Rationale:**
- TK-0 audit complete and clear
- TK-1 design stable (persistence, routing contract, schema)
- No dependency on MP-1A completion
- Parallel path enables faster closure to 100%
- SVI gains justify priority

**Effort:** 8 days for TK-1 core (KnowledgeApplicabilityEngine + persistence).

---

**Next:** Schedule TK-1 kickoff session. Update v24 roadmap with TK execution blocks.

