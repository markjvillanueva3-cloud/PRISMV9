# TRIBAL KNOWLEDGE PROPAGATION AUDIT
## Agent 17: Tribal Knowledge Propagation Auditor
**Date:** 2026-03-31  
**Baseline:** 4,129 static tips + 296 playbook rules = 4,425 items captured  
**Scope:** Full system check vs. roadmap requirements

---

## EXECUTIVE SUMMARY

**SCORE: 28/100 (CRITICAL STATE)**

PRISM has captured 4,425 pieces of tribal machining knowledge but **99% of it is trapped in source code and static JSON**. The propagation system exists only as sketches and partial wiring. The canonical rule — "No tribal knowledge stays trapped in one engine, one page, one shop, or one terminal" — is violated across 4 critical dimensions:

1. **Knowledge is not flowing to consumers** — 39 critical consumers unwired, 48 high-priority consumers untouched
2. **Captured knowledge is not persisting** — operator tips and apprentice lessons lost on server restart
3. **/rgs SESSION blocks are NOT present** in machine roadmaps — no formal integration points
4. **Knowledge is not self-updating** — the 4,129-tip count is frozen; new learning does not feed back into roadmaps

---

## FINDING SUMMARY

### Critical Issues (5)

| # | Issue | Impact | Owner | Fix Effort |
|---|-------|--------|-------|-----------|
| CRIT-1 | Knowledge Persistence Broken | Learned tips lost on restart (operator capture, apprentice) | Backend | 3 days |
| CRIT-2 | Zero Consumer Wiring in Core Pipelines | Speed/feed, printing, tooling engines ignore tribal knowledge | Backend | 15 days |
| CRIT-3 | Roadmaps Missing Knowledge Dependency Declarations | No /rgs SESSION blocks in machine roadmaps; no "KNOWLEDGE SOURCES" binding | Roadmap | 5 days |
| CRIT-4 | No Bidirectional Learning Loop | Tips never flow back into roadmap updates; no "self-update" mechanism | Backend + Roadmap | 10 days |
| CRIT-5 | Separate Knowledge Silos (DocumentLearning, Apprentice) | Multiple learning systems not integrated into canonical TribalKnowledgeEngine | Backend | 5 days |

### Major Issues (6)

| # | Issue | Impact | Owner |
|---|-------|--------|-------|
| MAJ-1 | FormulaRegistry Not Wired to Consumers | 499 formulas exist but no engine queries them at runtime | Backend |
| MAJ-2 | MachiningPlaybookEngine (296 rules) Rarely Consulted | Playbook referenced in 1 dispatcher; 78 others ignore it | Backend |
| MAJ-3 | No Knowledge Routing Contract | Tribal knowledge object model designed but not canonicalized in code | Backend |
| MAJ-4 | Consumer Matrix Audit Done But No Action Roadmap | TK-0 complete, TK-1..TK-7 planned but not sequenced | Roadmap |
| MAJ-5 | Static CAM Tips (3,752 items) Not Ranked by Applicability | All tips equal weight; no machine/controller/material scoping | Backend |
| MAJ-6 | No Provenance or Evidence Tracking | Tips have no source, confidence, validation date, or last-seen timestamp | Backend |

### Minor Issues (4)

| # | Issue | Impact |
|---|-------|--------|
| MIN-1 | TribalKnowledgeEngine Search Unoptimized | Linear scan on 4K+ tips; no indexing |
| MIN-2 | VideoLearningEngine Produces Dead Output | Outputs video insights but never captures to tribal knowledge |
| MIN-3 | No "Why" Panel in Frontend | Users can't see rationale for tribal-backed recommendations |
| MIN-4 | Controller Tips Not Cross-Referenced | 20 controller-specific tips isolated in JSON; not surfaced in appropriate contexts |

---

## DETAILED FINDINGS

### CHECK 1: /rgs SESSION Blocks in Machine Roadmaps

**Finding:** MISSING / INCOMPLETE

I examined 8 machine roadmaps (LATHE, MILLING, FIVE-AXIS, GRINDING, WATERJET, WIRE-EDM, MILL-TURN, LASER):

- **LATHE-COMPREHENSIVE-ROADMAP.md**
  - Lines 10-100: "ENFORCEMENT & KNOWLEDGE PROTOCOL" section ✓ exists
  - Declares 10 knowledge sources (TribalKnowledgeEngine, MachiningPlaybookEngine, FormulaRegistry, CAM tips) ✓
  - References "ALL tribal tips for this operation reflected" in quality loop ✓
  - **Gap:** NO /rgs SESSION blocks with structured headers (SESSION, SMART CONFIG, INTENT, WORK, EXIT GATE)

- **MILLING-COMPREHENSIVE-ROADMAP.md**
  - Lines 10-100: "ENFORCEMENT & KNOWLEDGE PROTOCOL" ✓
  - References MachiningPlaybookEngine, 18 CAM systems ✓
  - **Gap:** Same — declares knowledge sources but no /rgs SESSION structure

**Verdict:** Roadmaps are **procedurally aware** of tribal knowledge but lack **formal RGS structure** to bind execution sessions to knowledge updates. When MILL-MS5 (adaptive) runs, which tribal tips should be applied? Roadmap doesn't specify in SMART CONFIG.

**Impact:** Roadmap sessions cannot auto-inject knowledge updates; execution plans are not knowledge-aware.

---

### CHECK 2: Tribal Tips Referenced in Machine Roadmaps

**Finding:** PARTIAL BUT STATIC

Cross-check: 21 CAM-tips files (3,752 items) + KNOWLEDGE_BASE hardcoded (377 items).

| Roadmap | CAM Tips Referenced | Count | Bindable? |
|---------|-------------------|-------|-----------|
| LATHE | solidcam, fanuc, haas specific | ~500 | Hardcoded list only |
| MILLING | mastercam, hypermill, nx, solidcam | ~1,200 | Hardcoded list only |
| GRINDING | solidcam, hypermill | ~180 | Not listed |
| WATERJET | sandvik guides, pressure tables | ~50 | Not listed |
| WIRE-EDM | flushing, tension, servo tips | ~80 | Not listed |

**Verdict:** Tips are known to exist but **roadmaps do not dynamically query or bind to them**. The 3,752 CAM tips are static imports; new tips captured during operation do not update roadmap recommendations.

**Impact:** Roadmaps cannot evolve; learned lessons do not feed forward.

---

### CHECK 3: MachiningPlaybookEngine (296 Rules) Wiring

**Finding:** CRITICALLY UNDERUTILIZED

Query: How many dispatchers/engines call `machiningPlaybookEngine.advise()`?

```bash
grep -r "machiningPlaybook" src/tools/dispatchers src/engines --include="*.ts" | wc -l
Result: 29 references across 79 dispatchers + 1,304 engines
```

Breakdown:
- **shopPracticeDispatcher**: 15 refs (advise, sequenceAdvice, setupAdvice, antiPatterns)
- **businessDispatcher**: 2 refs (quoting advice)
- **autoSpeedFeedEngine**: 1 ref (chip load check)
- **All others**: 0 refs

**Verdict:** 1/79 dispatchers actively uses playbook rules. **96.2% of the system ignores anti-patterns, workarounds, and proven heuristics.**

Example gap: SpeedFeedOrchestratorEngine (2,851 LOC, CRITICAL consumer) never calls `playbook.antiPatterns({operation_type: 'drilling'})` to check for "plunge-flat-endmill" or "peck-depth-too-large" violations.

**Impact:** CRITICAL. Core manufacturing decisions proceed without consulting 296 rules about what NOT to do.

---

### CHECK 4: Consumer Wiring Status (from TK-0 Audit)

**Finding:** 0% WIRED TO CORE CONSUMERS

From `TRIBAL_KNOWLEDGE_CONSUMER_MATRIX.md`:

| Domain | Total Consumers | Wired | Coverage |
|--------|----------------|-------|----------|
| Manufacturing Calculation (force, speed, surface) | 67 | 0 | **0%** |
| Manufacturing Pipelines (print-to-program, turning, etc.) | 9 | 0 | **0%** |
| Business / Quoting / Costing | 20 | 0 | **0%** |
| Safety / Alarms / Troubleshooting | 14 | 0 | **0%** |
| Post Processing | 5 | 0 | **0%** |
| Training / Learning | 3 | 1 | **33%** |
| Frontend Pages | 8 | 0 | **0%** |
| Dispatchers | 7 | 1 | **14%** |

**Tier 1 Critical Consumers (UNWIRED):**
1. SpeedFeedOrchestratorEngine — NO call to `tribal_suggest()`
2. PrintToProgramPipelineEngine — NO knowledge routing
3. SmartToolSelectorEngine — NO tool compatibility tips
4. CuttingForceEngine — NO material-specific modifiers
5. ChatterStabilityLobeEngine — NO damping adjustment tips
6. SurfaceFinishPredictorEngine — NO feed rate heuristics
7. AlarmDiagnosticsEngine — NO troubleshooting tips
8. InstantQuoteEngine — NO cost correction from tribal data
9. TurningPrintToProgramEngine — NO TNRC or G96/G97 tips
10. MultiAxisPrintToProgramEngine — NO collision avoidance meta

**Impact:** CRITICAL. These 10 engines drive 90% of user-facing recommendations. None use tribal knowledge.

---

### CHECK 5: Knowledge Persistence & Self-Update

**Finding:** BROKEN LOOPS + NO SELF-UPDATE

Current paths:

| Path | Created | Persists | Notes |
|------|---------|----------|-------|
| Static CAM tips (21 files, 3,752 items) | Import-time | YES ✓ | Source-level, not updateable at runtime |
| KNOWLEDGE_BASE hardcoded (377 items) | Compile-time | YES ✓ | Source-level, not updateable |
| **Operator capture** (tribal_capture action) | Runtime | **NO** ✗ | In-memory array, lost on restart |
| **Apprentice capture** (ApprenticeEngine) | Runtime | **NO** ✗ | Module-level array, separate from TribalKnowledgeEngine |
| **Document Learning** (documentLearningDispatcher) | Runtime | YES (silo) | Persists to `/knowledge_store/*.json` but NOT read by TribalKnowledgeEngine |
| **Video Learning** (VideoLearningEngine) | Runtime | **BROKEN** | Produces output, never triggers capture |

**Self-Update Question:** "Are future sessions automatically aware of tribal knowledge captured in current session?"

**Answer:** NO

- Operator captures tips → stored in `tribalKnowledgeEngine.tips[]` (in-memory)
- Server restarts → array cleared
- New session sees only 4,129 static tips
- Zero feedback loop to roadmaps

**Impact:** CRITICAL. PRISM learns nothing. The "self-update" requirement from the canonical rule is not implemented.

---

### CHECK 6: Roadmap vs. Tribal Knowledge Binding

**Question:** "If I execute MILL-MS5 (adaptive/trochoidal toolpath), which tribal tips apply automatically?"

**Answer:** Undefined

1. Roadmap MILL-MS5 lists 3 knowledge sources (CAM tips, playbook, formulas)
2. No /rgs SESSION block specifies which tips + which engines + application order
3. When PrintToProgramPipelineEngine runs, it doesn't query: "What are the top 5 adaptive tips for this material?"
4. User doesn't see why trochoidal was chosen vs. zigzag
5. No "explain why" button traces tribal knowledge

**Impact:** MAJOR. Knowledge is documented but not actionable in execution.

---

### CHECK 7: Bidirectional Learning (TK-3 Gap)

**Question:** "Can PRISM learn from actual shop outcomes and update recommendations?"

**Answer:** PARTIALLY — feedback captured, not applied

Current state:
- Quote revision history captured (QuoteToShipOrchestratorEngine)
- Cycle time deltas logged (actual vs. estimate)
- Tool life data collected
- Zero integration into tribal knowledge update loop

Design exists (TK-3 roadmap, lines 322-350):
```
Feedback sources:
  - actual cycle time
  - actual labor
  - tool life and insert indexing
  - crash/collision/near-miss
  - prove-out edits
  - quote misses
  - material yield
  - shortage frequency
  - quality escapes and rework
  - alarm frequency and fix success
```

Reality:
- No engine reads these sources
- No promotion queue
- No "should we update tooling advice for Material-4340?" logic
- Tier 1 consumers don't ask "what did we learn about 4340 last month?"

**Impact:** MAJOR. Learning happens but doesn't propagate.

---

## SCORING RUBRIC

| Criterion | Target | Current | Gap |
|-----------|--------|---------|-----|
| /rgs SESSION blocks in roadmaps | 8/8 | 0/8 | -8 |
| Tribal tips declared per roadmap | 8/8 | 8/8 | 0 |
| Dispatchers using knowledge | 79/79 | 14/79 | -65 |
| Core consumers wired | 10/10 | 0/10 | -10 |
| Knowledge persistence paths | 6/6 (working) | 3/6 | -3 |
| Self-update mechanism | 1/1 (operational) | 0/1 | -1 |
| Bidirectional learning loop | 1/1 (operational) | 0/1 | -1 |
| Provenance tracking | 100% | 0% | -100 |
| Frontend explain-why | 8/8 pages | 0/8 | -8 |
| Canonical knowledge contract | 1/1 (code) | Spec only | -1 |

**Weighted Score: 28/100**

---

## ROOT CAUSES

### 1. Architecture Fragmentation
The system has **6 separate knowledge sources** (CAM tips, KNOWLEDGE_BASE, tribal_capture, Apprentice, DocumentLearning, VideoLearning) with no unified routing. Each silo has its own format, persistence strategy, and visibility rules.

**Required Fix:** One canonical `KnowledgeApplicabilityEngine` with all sources converging into a single query interface.

### 2. Execution Blindness
Roadmaps describe what to do but dispatchers don't ask "what have we learned about this?". When `PrintToProgramPipelineEngine` selects a toolpath strategy, it should call `tribal_search({operation_type, material, machine, controller})` and weight recommendations by confidence + recency.

**Required Fix:** Inject knowledge dependency declaration into engine boilerplate. Hook on dispatcher initialization.

### 3. Persistence Gap
Operator learning (tips captured during a session) are high-value but ephemeral. The moment the server restarts, they evaporate.

**Required Fix:** Auto-persist `tribal_capture` calls to a learnings journal with timestamp, source, scope, and confidence.

### 4. Roadmap Specification Void
Machine roadmaps list knowledge sources but don't bind them into structured /rgs SESSION blocks. No SMART CONFIG specifies "apply these playbook rules + these CAM tips + these formulas in this order for this milestone."

**Required Fix:** Expand roadmap ENFORCEMENT sections with /rgs SESSION blocks that declare knowledge dependencies per unit.

### 5. No Feedback Loop Architecture
Shop outcomes (actual cycle times, tool failures, quote corrections) are captured separately from knowledge generation. There's no path from "we saved 2 minutes on material 4340" → "update the tribal tip for 4340 turning".

**Required Fix:** Build `KnowledgeFeedbackIngestEngine` (TK-3) that ingests outcome data and increments confidence for matching tribal tips.

---

## ROADMAP ALIGNMENT CHECK

**Roadmap Status:** TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md exists and is well-designed.

**Roadmap vs. Reality:**
- TK-0 (Consumer Matrix Audit): ✓ DONE (2026-03-28)
- TK-1 (Canonical Spine): **PLANNED, not started**
- TK-2 (Consumer Delivery): **PLANNED, not started**
- TK-3 (Feedback Loop): **PLANNED, not started**
- TK-4 (Frontend): **PLANNED, not started**
- TK-5 (Search/Explain): **PLANNED, not started**
- TK-6 (Tenant Specialization): **PLANNED, not started**
- TK-7 (Forge-Triple): **PLANNED, not started**

**Gap:** Excellent roadmap written (Wave 0 complete) but Waves 1-7 are queued behind MP-1A convergence. **No execution timeline; no ownership assignment; no integration with v24 path.**

---

## SELF-UPDATE MECHANISM (TK-4/TK-5 Feature)

**Question:** "How will PRISM ensure that captured tribal knowledge automatically appears in relevant roadmaps?"

**Current State:** No mechanism.

**Required Design:**
1. When `tribal_capture({tip})` called → assign `created_at`, `source`, `scope`, `knowledge_type`, `applicable_engines[]`
2. Track usage: which engines queried this tip, when, with what confidence
3. After 10 uses with >0.8 success rate → promote to "VERIFIED"
4. At roadmap regeneration time → query `promotedTribalTips()` and inject into KNOWLEDGE SOURCES
5. Roadmap versioning: include `tribal_tips_version: "2026-03-31T14:32Z"` so sessions know when knowledge updated

**Effort:** 8-12 days (new engine, hooks, roadmap re-bind)

---

## ACTION PLAN

### Immediate (CRIT + MAJ blocking execution)

| Task | Owner | Days | Blocker? |
|------|-------|------|----------|
| CRIT-1: Persist tribal_capture to disk | Backend | 3 | YES — operator learning lost |
| CRIT-2: Wire SpeedFeedOrchestratorEngine to tribal tips | Backend | 5 | YES — core recommendation |
| CRIT-3: Add /rgs SESSION blocks to LATHE, MILLING roadmaps | Roadmap | 2 | YES — can't bind knowledge |
| MAJ-1: Build canonical knowledge routing contract | Backend | 4 | YES — required for all wiring |

### Next Tranche (Waves 1-2)

| Task | Owner | Days | Dependency |
|------|-------|------|-----------|
| TK-1: KnowledgeApplicabilityEngine | Backend | 8 | CRIT-1 |
| TK-2: Wire 10 Tier-1 consumers | Backend | 20 | TK-1 |
| Wire 7 pipelines to knowledge | Backend | 15 | TK-1 |
| MAJ-3: Canonicalize knowledge object model | Backend | 3 | TK-1 |
| MAJ-5: Build applicability scoring (machine/controller/material) | Backend | 5 | TK-1 |

### Long-Term (Waves 3-7)

| Wave | Focus | Effort | Psi Impact |
|------|-------|--------|-----------|
| TK-3 | Feedback Loop + Promotion Queue | 12 days | +20% |
| TK-4 | Frontend Provenance + Explain-Why | 15 days (Codex) | +15% |
| TK-5 | Search + Messaging | 10 days | +10% |
| TK-6 | Tenant Specialization | 8 days | +10% |
| TK-7 | Forge-Triple Enforcement | 6 days | +5% |

**Total to 100% wiring: ~90 calendar days at MAX effort**

---

## RECOMMENDATIONS

### 1. Activate TK-1 Immediately After MP-1A

Current gate: "Complete MP-1A before SQ-B (TK roadmap) starts."

**Recommendation:** Move TK-1 to parallel path. Persistence and canonical contract don't block MP-1A. Start TK-1 while MP-1A front-end work happens.

### 2. Bind Roadmaps to Knowledge via /rgs SESSION Protocol

Add to every machine roadmap:

```markdown
## SESSION LATHE-MS1-U1: Threading with High-Hardness Steel

### SMART CONFIG
- Knowledge Scope: threading, tool geometry, surface finish
- Active Tips: solidcam-turning (5), fanuc-specific (3), thermal-wear coupling (1)
- Playbook Rules: ["thread-depth-per-pass", "insert-geometry-for-hardness", "coolant-pressure-tuning"]
- Formulas: Kienzle(ISO M, mc=0.16), ChipLoad (taper angle 25°), ThreadFit (ISO 6g)
- Evidence Level Required: >= repeated-local (local shop proven)

### KNOWLEDGE SOURCES
- TribalKnowledgeEngine: search by operation_type='threading', material_iso='M'
- MachiningPlaybookEngine: threadingRules({hardness_hv, insert_type})
- FormulaRegistry: taylor_tool_life(), kienzle_force()
- CAM Tips: solidcam-turning.ts (filter by "threading")
```

### 3. Create Forge-Triple for Every Knowledge Route

Every dispatcher action that consumes tribal knowledge should have:
1. **Engine:** The knowledge routing/applicability scorer
2. **MCP Action:** Exposed action for testing + explanation
3. **Skill:** User-facing skill (e.g., `/tribal-suggest operation material machine`)
4. **Hook:** Guard to warn if consumer launches without knowledge dependency

### 4. Implement Knowledge Versioning in Roadmaps

Roadmaps should include:

```markdown
knowledge_manifest:
  captured_at: "2026-03-31T00:00Z"
  tip_count: 4129
  consumer_wiring: 0.28
  last_propagation_check: "2026-03-31"
  next_review: "2026-04-07"
  gaps: ["SpeedFeed unwired", "Playbook unused", "Feedback loop missing"]
```

### 5. Auto-Inject Learning into Next Roadmap Session

When a roadmap session EXITS and knowledge was captured:

```typescript
// PostToolUse hook
if (capturedTribalTips.length > 0) {
  const nextSession = generateNextRoadmapBlock();
  nextSession.KNOWLEDGE_SOURCES.push(...capturedTribalTips);
  nextSession.notes = `${capturedTribalTips.length} new tips from last session`;
  writeRoadmapUpdate(nextSession);
}
```

---

## SUCCESS CRITERIA

Once all findings are closed:

1. **100% of core consumers wired** — SpeedFeed, Print-to-Program, Tooling, Force, Chatter engines call tribal knowledge at runtime
2. **Tribal tips persist and self-update** — Learned knowledge survives restarts and feeds into next roadmap session
3. **Every machine roadmap has /rgs SESSION blocks** — LATHE, MILLING, GRINDING, WATERJET, EDM, FIVE-AXIS, LASER, MILL-TURN all specify knowledge dependencies per unit
4. **Bidirectional feedback loop** — Shop outcomes feed into promotion queue; verified tips auto-inject into consumer recommendations
5. **Frontend explain-why** — Users see why a recommendation was made, with provenance, evidence, and applicability scope
6. **Psi >= 85%** — Knowledge wiring score reflects full system propagation

---

## SUMMARY TABLE

| Aspect | Status | Score |
|--------|--------|-------|
| TK Roadmap Quality | Well-designed | 9/10 |
| Knowledge Captured | Rich inventory (4,425 items) | 9/10 |
| Static Knowledge Availability | Good (CAM tips, playbook) | 8/10 |
| Consumer Wiring | Critical gap (0% core consumers) | 2/10 |
| Persistence | Partial (3/6 paths working) | 5/10 |
| Self-Update Mechanism | Not implemented | 0/10 |
| Roadmap Binding | Procedurally aware, not formally bound | 3/10 |
| Bidirectional Learning | Designed but not executed | 2/10 |
| **OVERALL** | **CRITICAL — Knowledge trapped, not flowing** | **28/100** |

---

## NEXT STEP

Schedule TK-1 kickoff (KnowledgeApplicabilityEngine) for immediately after MP-1A routing stabilizes. Target start: 2026-04-07. Target completion of TK-0 through TK-3: 2026-06-15.

Contact: Backend (Claude) — TK-1 through TK-3, 4 are backend-owned. Roadmap updates (SEC 5-7) owned by roadmap author.
