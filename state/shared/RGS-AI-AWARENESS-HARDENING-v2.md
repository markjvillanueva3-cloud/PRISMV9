# RGS: AI Awareness System Hardening — REVISED v2
**ID:** RGS-AWARE-002 | **Priority:** CRITICAL | **Version:** 2.0
**Original:** 2026-04-15 | **Revised:** 2026-04-17 (audit-driven revision)
**Audit Source:** `state/shared/AI-AWARE-HARDEN-AUDIT-2026-04-17.md`

---

## REVISION SUMMARY

This revision corrects the AI-AWARE-HARDEN roadmap based on:
1. **Git commit audit** — 18 units actually committed (JSON claimed 3)
2. **File verification** — FormulaOrchestrator.ts missing, playbook rules missing
3. **Inventory sync** — Current counts vastly exceed original targets
4. **Cross-roadmap alignment** — Patterns from WEDM-CONSOLIDATED, AGI-INFRA

---

## CURRENT STATE (Verified 2026-04-17)

### Inventory vs Original Targets
| Metric | Original Start | Original Target | **Current** | Status |
|--------|---------------|-----------------|-------------|--------|
| Formulas | 39 | 400+ | **509** | ✅ +127% |
| Materials | 3 | 150+ | **6,372** | ✅ +4148% |
| Tools | 0 | 500+ | **95,608** | ✅ +19021% |
| Tribal Tips | 339 | 2,000+ | **4,493** | ✅ +124% |
| **Playbook Rules** | 0 | 500+ | **0** | ❌ CRITICAL GAP |
| MIT Courses | 5 | 22 | **9/225** (4%) | ⚠️ PARTIAL |
| Awareness Score | 35/100 | 90/100 | **~70** | ⚠️ PARTIAL |

### Unit Completion (Actual)
| Session | Units | Git Status | Notes |
|---------|-------|------------|-------|
| S1 Foundation | U-AWR01-03 | ⚠️ 2/3 | FormulaOrchestrator.ts MISSING |
| S2 Data Pop | U-AWR04-06 | ✅ 3/3 | All committed |
| S3 Extraction | U-AWR07-09 | ⚠️ 1/3 | Only U-AWR07 committed |
| S4 Integration | U-AWR10-12 | ✅ 3/3 | All committed |
| S5 Verification | U-AWR13-16 | ✅ 4/4 | All committed |
| S6 H: Drive | U-AWR17-26 | ⚠️ 7/10 | Missing 21, 22, 25 |
| S7 Extended | U-AWR27-30 | ❌ 0/4 | Not started |

**Total: 20/30 units committed, 10 remaining**

### Foundation Engine Status
| Engine | File | Status |
|--------|------|--------|
| UnifiedAwarenessOrchestrator | 31KB | ✅ Production |
| ResourceIndexEngine | 19KB | ✅ Production |
| FormulaOrchestrator | — | ❌ **MISSING** |
| PlaybookRulesEngine | — | ❌ **MISSING** |
| machining-playbook-rules.ts | — | ❌ **MISSING** |

---

## REVISED OBJECTIVE

Transform PRISM awareness from ~70/100 to **95/100** by:
1. ~~Creating unified awareness orchestration~~ ✅ DONE
2. ~~Extracting H: drive resources~~ ✅ MOSTLY DONE
3. **Creating FormulaOrchestrator** (gap-fill)
4. **Creating 500+ playbook rules** (critical gap)
5. Completing remaining extraction units
6. Integrating MIT courses (9 → 50+)

---

## PHASE 1: CRITICAL GAP FILL (New Units)

### U-AWR31: FormulaOrchestrator Engine
**Goal:** Orchestrate formula discovery, validation, and wiring
**Output:** `src/engines/FormulaOrchestrator.ts`
**Rationale:** Original U-AWR03 was MaterialDatabaseEngine (built). FormulaOrchestrator was never created despite being in RGS spec.

```typescript
interface FormulaOrchestrator {
  scanEnginesForFormulas(): FormulaMetadata[];
  validateFormula(id: string): ValidationResult;
  wireFormulaToEngine(formulaId: string, engineId: string): void;
  getFormulasByDomain(domain: string): Formula[];
  getFormulaCoverage(): CoverageReport;
}
```

**Tasks:**
- [ ] Create engine structure
- [ ] Scan 509 registered formulas
- [ ] Map formulas to source engines
- [ ] Create validation hooks
- [ ] Wire to UnifiedAwarenessOrchestrator
- [ ] Tests (20+)

**Exit Gate:** Formula coverage report shows 100% of 509 formulas mapped to source engines

---

### U-AWR32: PlaybookRulesEngine + 500 Rules
**Goal:** Shop-floor decision rules for AI guidance
**Output:** `src/engines/PlaybookRulesEngine.ts` + `src/data/machining-playbook-rules.ts`
**Rationale:** RGS target was 500+ rules. U-AWR06 committed "validation" but file doesn't exist.

**Rule Categories (500+ total):**
| Category | Count | Source |
|----------|-------|--------|
| Setup rules | 100+ | JM DIE practices, tribal tips |
| Speed/feed rules | 100+ | Material-operation combos |
| Tool selection | 80+ | Material-feature matching |
| Sequence rules | 80+ | Operation ordering |
| Safety rules | 70+ | Guard, coolant, clamp |
| Quality rules | 70+ | Tolerance, inspection |

```typescript
interface PlaybookRule {
  id: string;
  category: 'setup' | 'speed_feed' | 'tool' | 'sequence' | 'safety' | 'quality';
  condition: string;  // When this rule applies
  action: string;     // What to do
  rationale: string;  // Why (tribal/physics/empirical)
  source: 'tribal' | 'physics' | 'jm_die' | 'mit' | 'vendor';
  confidence: number; // 0-1
}
```

**Tasks:**
- [ ] Create PlaybookRulesEngine structure
- [ ] Generate 100 setup rules (from tribal tips)
- [ ] Generate 100 speed/feed rules (from FormulaRegistry)
- [ ] Generate 80 tool selection rules
- [ ] Generate 80 sequence rules
- [ ] Generate 70 safety rules
- [ ] Generate 70 quality rules
- [ ] Wire to UnifiedAwarenessOrchestrator
- [ ] Tests (30+)

**Exit Gate:** 500+ rules in registry, each with condition/action/rationale/source

---

## PHASE 2: SESSION 3 COMPLETION (Extraction)

### U-AWR08: Manufacturer Catalog Extraction
**Status:** NOT STARTED
**Goal:** Extract tool data from vendor PDFs
**Location:** `H:/prism/resources/MANUFACTURER_CATALOGS/`

**Tasks:**
- [ ] Inventory available catalogs (Sandvik, Kennametal, Iscar, etc.)
- [ ] Extract insert grades and geometries
- [ ] Extract speed/feed recommendation tables
- [ ] Wire to ToolDatabaseEngine
- [ ] Tests (15+)

### U-AWR09: JM DIE Pattern Analysis
**Status:** NOT STARTED
**Goal:** Extract programming patterns from 36,929 programs
**Output:** Tribal tips + playbook rules

**Tasks:**
- [ ] Analyze CNC LATHE programs (G-code patterns)
- [ ] Analyze CNC MILL programs (toolpath strategies)
- [ ] Analyze WIRE EDM programs (cut sequences)
- [ ] Extract 200+ pattern-based tips
- [ ] Wire patterns to PlaybookRulesEngine
- [ ] Tests (20+)

---

## PHASE 3: SESSION 6 COMPLETION (H: Drive)

### U-AWR21: Archive Unpack Crawler
**Status:** NOT STARTED
**Goal:** Recurse ZIP/RAR/7z archives (465 files)

**Tasks:**
- [ ] Create ArchiveCrawlerEngine
- [ ] Handle nested archives
- [ ] Route unpacked content to appropriate extractors
- [ ] Tests (12+)

### U-AWR22: Dark Content Classifier
**Status:** NOT STARTED
**Goal:** Classify previously-ignored content

**Tasks:**
- [ ] Create DarkContentClassifierEngine
- [ ] Identify high-value hidden content
- [ ] Route to extraction pipelines
- [ ] Tests (12+)

### U-AWR25: Cross-Terminal Coordination
**Status:** NOT STARTED
**Goal:** Atomic claim broker for multi-session work
**Note:** May overlap with AGI-INFRA Phase E worktree system

**Tasks:**
- [ ] Evaluate if AGI-INFRA Phase E covers this
- [ ] If not, create claim broker extension
- [ ] Tests (15+)

---

## PHASE 4: SESSION 7 COMPLETION (Extended Extraction)

### U-AWR27-30: Extended Pipelines
**Status:** NOT STARTED

| Unit | Target | Files |
|------|--------|-------|
| U-AWR27 | Image OCR | 550 images |
| U-AWR28 | 2D Drawing | 124 DXF/DWG |
| U-AWR29 | Office Docs | 17 docx/pptx |
| U-AWR30 | Machine Logs | 3,350 text/log/ini |

---

## PHASE 5: MIT COURSE EXPANSION

### U-AWR33: MIT Deep Integration (NEW)
**Goal:** Expand from 9 → 50+ integrated courses
**Source:** 225 total courses, 17 categories, 285 algorithms mapped

**Priority Courses:**
1. 2.43 — Advanced Machining Processes
2. 6.046j — Design and Analysis of Algorithms
3. 10.34 — Numerical Methods
4. 2.003 — Dynamics and Control I
5. 2.14 — Analysis and Design of Feedback Control

**Tasks:**
- [ ] Process priority 5 courses
- [ ] Extract formulas and algorithms
- [ ] Generate tribal tips from course content
- [ ] Wire to FormulaOrchestrator
- [ ] Tests (25+)

---

## REVISED UNIT TRACKER

### Complete (20 units)
- [x] U-AWR01: UnifiedAwarenessOrchestrator
- [x] U-AWR02: ResourceIndexEngine
- [x] U-AWR04: ToolDatabaseEngine validation
- [x] U-AWR05: FormulaRegistry validation
- [x] U-AWR06: Playbook validation (file missing, tests pass)
- [x] U-AWR07: MIT Course Knowledge Engine
- [x] U-AWR10: Wire awareness to 7 domains
- [x] U-AWR11: Awareness snapshot hook
- [x] U-AWR12: Dispatcher awareness middleware
- [x] U-AWR13: Awareness orchestrator tests
- [x] U-AWR14: Intelligence injection tests
- [x] U-AWR15: E2E awareness workflow
- [x] U-AWR16: Canonical constants refactor
- [x] U-AWR17: Expand KNOWN_RESOURCE_FOLDERS
- [x] U-AWR18: Expand JM_DIE_FOLDERS
- [x] U-AWR19: CAD extraction pipeline
- [x] U-AWR20: Spreadsheet ingestion
- [x] U-AWR23: Orchestrator deep scan
- [x] U-AWR24: doNotExtract sync
- [x] U-AWR26: Video learning pipeline

### Remaining (13 units)
- [ ] U-AWR03: ~~MaterialDatabaseEngine~~ → **Reassigned: FormulaOrchestrator** (gap)
- [ ] U-AWR08: Manufacturer catalog extraction
- [ ] U-AWR09: JM DIE pattern analysis
- [ ] U-AWR21: Archive crawler
- [ ] U-AWR22: Dark content classifier
- [ ] U-AWR25: Cross-terminal coordination
- [ ] U-AWR27: Image OCR pipeline
- [ ] U-AWR28: 2D drawing extraction
- [ ] U-AWR29: Office doc pipeline
- [ ] U-AWR30: Machine log harvester
- [ ] **U-AWR31: FormulaOrchestrator (NEW)**
- [ ] **U-AWR32: PlaybookRulesEngine + 500 rules (NEW)**
- [ ] **U-AWR33: MIT Deep Integration (NEW)**

---

## EXECUTION PRIORITY

```
CRITICAL (Do First):
  U-AWR32: PlaybookRulesEngine + 500 rules  ← #1 gap
  U-AWR31: FormulaOrchestrator              ← Foundation missing

HIGH (Session 3):
  U-AWR08: Manufacturer catalogs
  U-AWR09: JM DIE patterns

MEDIUM (Session 6):
  U-AWR21: Archive crawler
  U-AWR22: Dark content classifier
  U-AWR25: Cross-terminal coordination

LOWER (Extended):
  U-AWR27-30: Extended pipelines
  U-AWR33: MIT deep integration
```

---

## SUCCESS CRITERIA (REVISED)

| Metric | Before Revision | Target | Method |
|--------|-----------------|--------|--------|
| Units Complete | 20/30 | 33/33 | Complete all + 3 new |
| Playbook Rules | 0 | 500+ | U-AWR32 |
| FormulaOrchestrator | Missing | Built | U-AWR31 |
| MIT Courses | 9 | 50+ | U-AWR33 |
| Awareness Score | ~70 | 95+ | All gaps closed |
| JSON Accuracy | 10% | 100% | Sync after each unit |

---

## JSON PATCH REQUIRED

Update `mcp-server/data/milestones/AI-AWARE-HARDEN.json`:

```json
{
  "totalUnits": 33,
  "unitsCompleted": 20,
  "unitsPending": 13,
  "status": "in_progress",
  "revision": "2.0",
  "revisedDate": "2026-04-17",
  "newUnits": ["U-AWR31", "U-AWR32", "U-AWR33"],
  "criticalGaps": ["playbook-rules", "formula-orchestrator"]
}
```

---

## CROSS-ROADMAP ALIGNMENT

### Patterns Adopted from WEDM-CONSOLIDATED
- Exit gates with measurable thresholds
- Four-loop protocol (BUILD → SCRUTINIZE → GAP FILL → TIE UP)
- Session-based unit grouping
- Explicit dependency chains

### Integration Points
- **AGI-INFRA Phase E:** U-AWR25 may be superseded by worktree system
- **WEDM-CONSOLIDATED:** Shares playbook rules, formula wiring patterns
- **LATHE-PRO:** Similar awareness integration needed

---

## IMMEDIATE NEXT ACTIONS

1. **Update JSON** — Sync unit statuses to git reality
2. **U-AWR32** — Create PlaybookRulesEngine + 500 rules (critical)
3. **U-AWR31** — Create FormulaOrchestrator (foundation gap)
4. **U-AWR08-09** — Complete extraction batch
5. **Validate** — Re-run awareness score calculation
