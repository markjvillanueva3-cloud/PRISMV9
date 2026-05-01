# Tribal Knowledge Propagation Audit — Complete Index
**Agent 17 Code Review** | 2026-03-31

---

## Quick Navigation

| Document | Purpose | Length | Audience | Read First? |
|----------|---------|--------|----------|------------|
| **TRIBAL-KNOWLEDGE-AUDIT-FINDINGS-SUMMARY.md** | Executive summary, 3 blockers, SVI impact, decisions | 8.8 KB | Leadership, product | ✓ YES |
| **AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-2026-03-31.md** | Comprehensive audit, all findings, root causes, action plan | 21 KB | Backend team, roadmap owner | ✓ YES (after summary) |
| **AUDIT-TRIBAL-KNOWLEDGE-SELF-UPDATE-GAPS.md** | Technical deep-dive, 8 gaps with code examples, architecture | 19 KB | Backend engineers | For implementation |
| **AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-README.txt** | TL;DR reference guide, key findings snapshot | 7.3 KB | Quick reference | For quick lookup |

---

## Audit Scores

### Overall Score: 28/100 (CRITICAL STATE)

```
TK Roadmap Quality:           9/10  ✓ Well-designed
Knowledge Captured:           9/10  ✓ Rich inventory (4,425 items)
Static Knowledge Available:   8/10  ✓ Good (CAM tips, playbook)
Consumer Wiring:              2/10  ✗ CRITICAL GAP (0% core consumers)
Persistence:                  5/10  ⚠ Partial (3/6 paths working)
Self-Update Mechanism:        0/10  ✗ NOT IMPLEMENTED
Roadmap Binding:              3/10  ⚠ Procedurally aware, not formal
Bidirectional Learning:       2/10  ✗ Designed but not executed
OVERALL:                     28/100  ✗ CRITICAL — Knowledge trapped
```

---

## The Three Critical Blockers

### BLOCKER 1: Zero Consumer Wiring (0%)
**Status:** CRITICAL  
**Impact:** 10 core decision engines ignore tribal knowledge  
**Evidence:** From TK-0 Consumer Matrix:
- SpeedFeedOrchestratorEngine (2,851 LOC): NOT WIRED
- PrintToProgramPipelineEngine (2,194 LOC): NOT WIRED
- TurningPrintToProgramEngine: NOT WIRED
- CuttingForceEngine: NOT WIRED
- ChatterStabilityLobeEngine: NOT WIRED
- SmartToolSelectorEngine: NOT WIRED
- AlarmDiagnosticsEngine: NOT WIRED
- InstantQuoteEngine: NOT WIRED
- MultiAxisPrintToProgramEngine: NOT WIRED
- SurfaceFinishPredictorEngine: NOT WIRED

**Coverage by Domain:**
- Manufacturing Calculation (67 engines): 0% wired
- Pipelines (9 engines): 0% wired
- Business (20 engines): 0% wired
- Safety/Alarms (14 engines): 0% wired
- Post-Processing (5 engines): 0% wired
- Training (3 engines): 33% wired (partial)
- Frontend (8 pages): 0% wired
- Dispatchers (7 of 79): 14% wired

**Root Cause:** No knowledge routing contract. Engines don't know how to query or apply tribal knowledge at runtime.

---

### BLOCKER 2: Knowledge Persistence Broken (50%)
**Status:** CRITICAL  
**Impact:** Learned knowledge lost on every server restart  
**Evidence:**

| Learning Path | Persists? | Survives Restart? | Status |
|---|---|---|---|
| Static CAM tips (3,752) | YES | YES | OK |
| Hardcoded KNOWLEDGE_BASE (377) | YES | YES | OK |
| Operator-captured tips | IN-MEMORY | **NO** | LOST |
| Apprentice lessons | IN-MEMORY | **NO** | LOST |
| Document learning | YES (silo) | YES | Separate silo |
| Video learning | NO | NO | Broken loop |

**Root Cause:** `tribal_capture()` pushes to in-memory array only. No file/DB write. No reload on init.

---

### BLOCKER 3: Roadmaps Not Bound to Knowledge (0% /rgs SESSION blocks)
**Status:** MAJOR  
**Impact:** Knowledge documented but not actionable in execution  
**Evidence:**
- LATHE-COMPREHENSIVE-ROADMAP.md: Declares 10 sources, 0 /rgs SESSION blocks
- MILLING-COMPREHENSIVE-ROADMAP.md: Declares 8 sources, 0 /rgs SESSION blocks
- GRINDING, WATERJET, WIRE-EDM, FIVE-AXIS, LASER, MILL-TURN: Same pattern

**Example Gap:** MILL-MS5 (adaptive/trochoidal) lists:
- 261 Mastercam tips
- 83 HyperMILL tips
- 296 playbook rules
- 499 formulas

When engine runs, it queries: **NOTHING**

**Root Cause:** Roadmaps are static YAML. No SMART CONFIG to bind knowledge to execution.

---

## Seven Key Audit Checks

### CHECK 1: /rgs SESSION Blocks in Machine Roadmaps
**Finding:** MISSING (0/8)  
**Impact:** MAJOR — Roadmaps procedurally aware but not formally bound

### CHECK 2: Tribal Tips Referenced in Machine Roadmaps
**Finding:** PARTIAL BUT STATIC  
**Impact:** MAJOR — Tips listed but not dynamically queried

### CHECK 3: MachiningPlaybookEngine (296 Rules) Wiring
**Finding:** CRITICALLY UNDERUTILIZED (1 of 79 dispatchers)  
**Impact:** CRITICAL — 96.2% of system ignores anti-patterns

### CHECK 4: Consumer Wiring Status
**Finding:** 0% WIRED TO CORE CONSUMERS  
**Impact:** CRITICAL — Manufacturing engines proceed without guidance

### CHECK 5: Knowledge Persistence & Self-Update
**Finding:** BROKEN LOOPS (no feedback, no learning)  
**Impact:** CRITICAL — System doesn't improve from experience

### CHECK 6: Roadmap vs. Tribal Knowledge Binding
**Finding:** UNDEFINED  
**Impact:** MAJOR — No specification of which tips apply to which units

### CHECK 7: Bidirectional Learning (TK-3)
**Finding:** DESIGNED BUT NOT IMPLEMENTED  
**Impact:** CRITICAL — Shop outcomes don't update recommendations

---

## Eight Self-Update Gaps

From AUDIT-TRIBAL-KNOWLEDGE-SELF-UPDATE-GAPS.md:

| Gap | Issue | Current | Required | Effort |
|-----|-------|---------|----------|--------|
| 1 | Persistence | In-memory | Learnings journal on disk | 1-2 days |
| 2 | Journal reload | Not loaded | Load on init | 2 days |
| 3 | Evidence tracking | None | Full metadata + confidence | 3 days |
| 4 | Promotion queue | No mechanism | KnowledgePromotionEngine | 5 days |
| 5 | Roadmap enrichment | Static only | Query journal on session plan | 3-4 days |
| 6 | Feedback loop | No data flow | JobOutcome → tip confidence | 6 days |
| 7 | Consumer tracing | No provenance | Decision trace with tip IDs | 8-10 days |
| 8 | Deprecation | Permanent tips | Status + lifecycle | 2-3 days |
| **TOTAL** | **Self-Update** | **Non-functional** | **Fully operational** | **30-35 days** |

---

## Roadmap Alignment

**Current State:**
- TK-0 (Consumer Matrix Audit): COMPLETE (2026-03-28)
- TK-1 through TK-7: PLANNED, NOT STARTED
- Blocker: Queued behind MP-1A convergence
- No execution timeline assigned
- No ownership assigned

**Timeline to 100% Wiring:**
- TK-0: DONE (1 day)
- TK-1: 8 days (persistence + routing contract)
- TK-2: 20 days (wire core consumers)
- TK-3: 12 days (feedback loop)
- TK-4: 15 days (frontend explain-why, Codex)
- TK-5-7: 25 days (search, messaging, tenants, enforcement)
- **TOTAL: ~90 calendar days at MAX effort**

---

## SVI Impact Projections

| Milestone | Tribal Wiring % | SVI Impact | Psi Projection |
|-----------|-----------------|-----------|-----------------|
| Status quo | 30% | Baseline | ~40.8% |
| TK-1 + Tier 1 | 45% | +15% | ~55.8% |
| TK-1 + Tier 1-2 | 55% | +25% | ~65.8% |
| TK-1 through TK-3 | 75% | +45% | ~85.8% |
| TK-1 through TK-7 | 100% | +70% | ~100% |

**Timeline:**
- 6 weeks (TK-0..TK-2): +15% gain
- 16 weeks (TK-0..TK-3): +45% gain
- 24 weeks (TK-0..TK-7): +70% gain (→ Psi = 100%)

---

## Root Causes

### 1. Architecture Fragmentation
6 separate knowledge sources with no unified routing. Each silo has its own format, persistence, and visibility.

**Required Fix:** One canonical `KnowledgeApplicabilityEngine` with all sources converging.

### 2. Execution Blindness
Dispatchers don't ask "what have we learned about this?". Roadmaps describe WHAT but engines don't ask WHY.

**Required Fix:** Inject knowledge dependency declaration into engine boilerplate + hooks.

### 3. Persistence Gap
Operator learning is ephemeral. High-value data evaporates on restart.

**Required Fix:** Auto-persist `tribal_capture` to learnings journal with metadata.

### 4. Roadmap Specification Void
Roadmaps list sources but don't bind them into /rgs SESSION blocks.

**Required Fix:** Expand roadmaps with SMART CONFIG that declares knowledge dependencies per unit.

### 5. No Feedback Loop Architecture
Shop outcomes captured separately from knowledge generation. No path from "we saved time on 4340" → "update the tribal tip".

**Required Fix:** Build KnowledgeFeedbackIngestEngine (TK-3).

---

## Recommendations (5)

### 1. PARALLELIZE TK-1 WITH MP-1A
Move TK-1 to parallel path, don't wait for MP-1A completion. Persistence and routing contract don't block MP-1A.

### 2. ADOPT /rgs SESSION STRUCTURE IN ALL ROADMAPS
Every milestone should declare SMART CONFIG with knowledge scope, active tips, playbook rules, formulas, evidence requirements.

### 3. CREATE FORGE-TRIPLE FOR EVERY KNOWLEDGE ROUTE
Engine + MCP Action + Skill + Hook for every knowledge consumer.

### 4. BUILD KNOWLEDGE VERSIONING INTO ROADMAPS
Track captured_at, tip_count, consumer_wiring %, gaps, last_review date.

### 5. AUTO-INJECT LEARNING INTO NEXT SESSION
When session exits with captured tips, parse them and update roadmap KNOWLEDGE SOURCES.

---

## Critical Path Decision

**PROPOSED:** Activate TK-1 kickoff for **2026-04-07**

**RATIONALE:**
- TK-0 audit complete and clear
- TK-1 design stable (persistence, routing contract, schema)
- No dependency on MP-1A
- Parallel path faster than sequential
- SVI gains justify priority (60 SVI points at stake)

**EFFORT:** 8 days for TK-1 core

**DECISION REQUIRED:** Approve TK-1 for 2026-04-07 start?

---

## Document Structure

### TRIBAL-KNOWLEDGE-AUDIT-FINDINGS-SUMMARY.md
**Length:** 8.8 KB | **Read time:** 10 minutes  
**For:** Leadership, product, decision-makers  
**Contains:**
- Problem statement + 3 blockers with visualization
- Wiring score breakdown
- Roadmap gap analysis
- Risk assessment (if we don't fix vs. if we do)
- SVI impact projections
- 5 key recommendations
- Critical path decision point

### AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-2026-03-31.md
**Length:** 21 KB | **Read time:** 40 minutes  
**For:** Backend team, roadmap owner, architects  
**Contains:**
- Executive summary with scoring
- 5 critical issues + 6 major + 4 minor
- Detailed findings for each of 7 checks
- Root causes analysis
- Scoring rubric
- Complete action plan with effort estimates
- Success criteria

### AUDIT-TRIBAL-KNOWLEDGE-SELF-UPDATE-GAPS.md
**Length:** 19 KB | **Read time:** 35 minutes  
**For:** Backend engineers implementing self-update  
**Contains:**
- Self-update question answered
- Current learning flow diagram
- 8 gaps with code examples
- Current vs. required state for each gap
- Architecture diagram
- Implementation sequencing (30-35 days)
- Success criteria
- Detailed effort breakdown

### AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-README.txt
**Length:** 7.3 KB | **Read time:** 5 minutes  
**For:** Quick reference, TL;DR  
**Contains:**
- Score, 3 blockers summary
- All 7 checks at a glance
- All 8 gaps at a glance
- Roadmap alignment snapshot
- SVI impact snapshot
- Critical decision point
- File index

---

## Next Steps

1. **READ:** Start with TRIBAL-KNOWLEDGE-AUDIT-FINDINGS-SUMMARY.md (10 min)

2. **DECIDE:** Approve TK-1 for 2026-04-07?
   - YES: Schedule TK-1 session, assign backend owner (Claude), proceed to step 3
   - NO: Document rationale, update roadmap timeline, defer to next phase

3. **IF YES:**
   - READ: AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-2026-03-31.md (40 min)
   - ASSIGN: Backend engineer to TK-1 ownership
   - INITIALIZE: TK-1 session block with persistence layer work
   - SCHEDULE: 8-day sprint (2026-04-07 through 2026-04-15)

4. **IF NO:**
   - Document decision rationale
   - Update state/shared/ROADMAP_COLLABORATION_STATE.md with TK gate status
   - Reassess in next roadmap sync meeting

---

## Files Summary

| File | Size | Purpose |
|------|------|---------|
| TRIBAL-KNOWLEDGE-AUDIT-FINDINGS-SUMMARY.md | 8.8 KB | Executive summary (READ FIRST) |
| AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-2026-03-31.md | 21 KB | Comprehensive audit |
| AUDIT-TRIBAL-KNOWLEDGE-SELF-UPDATE-GAPS.md | 19 KB | Technical deep-dive |
| AUDIT-TRIBAL-KNOWLEDGE-PROPAGATION-README.txt | 7.3 KB | Quick reference |
| TRIBAL-KNOWLEDGE-PROPAGATION-AUDIT-INDEX.md | This file | Navigation guide |

**Total:** ~64 KB of audit documentation

---

## Contact

**Audit Completed By:** Agent 17 (Code Review Agent)  
**Date:** 2026-03-31  
**Scope:** Tribal Knowledge Propagation System (TKP Roadmap)  
**Finding:** CRITICAL STATE — Knowledge captured but not flowing to production decisions  
**Recommendation:** Activate TK-1 for 2026-04-07  

**Next Owner:** Backend (Claude) — TK-1 through TK-3  
**Secondary Owner:** Codex — TK-4 (frontend) and TK-5 (messaging)  
**Roadmap Owner:** Roadmap Author — TK-5 through TK-7 and roadmap re-binding

---

**Status:** Audit COMPLETE | Ready for decision and action planning.

