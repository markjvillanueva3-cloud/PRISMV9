# RGS: AI Awareness System Hardening
**ID:** RGS-AWARE-001 | **Priority:** CRITICAL | **Estimated:** 4 weeks
**Generated:** 2026-04-15 | **Source:** Forge Audit Report

## OBJECTIVE
Transform PRISM from awareness score 35/100 to 90/100 by:
1. Creating unified awareness orchestration
2. Extracting all H: drive resources
3. Populating formula/material/tool databases
4. Integrating everything into session intelligence

## PHASE 1: FOUNDATION (Days 1-3)

### MS-AWARE-001: UnifiedAwarenessOrchestrator
**Goal:** Single source of truth for "what PRISM knows"
**Output:** `src/engines/UnifiedAwarenessOrchestrator.ts`

```typescript
// Coordinates:
// - PRISMSelfAwarenessEngine (JM DIE, tribal)
// - DuplicationGuardEngine (assets, extractions)
// - FormulaRegistry (all formulas)
// - ResourceIndexEngine (H: drive)
// - MaterialDatabaseEngine (materials)
// - ToolDatabaseEngine (tools)

interface AwarenessQuery {
  domain: 'engine' | 'formula' | 'material' | 'tool' | 'tribal' | 'resource' | 'program';
  query: string;
  context?: string;
}

interface AwarenessResult {
  found: boolean;
  matches: AwarenessMatch[];
  suggestions: string[];
  relatedCapabilities: string[];
}
```

**Tasks:**
- [ ] Create engine structure
- [ ] Wire to PRISMSelfAwarenessEngine
- [ ] Wire to DuplicationGuardEngine
- [ ] Add query routing
- [ ] Add session snapshot method
- [ ] Tests

### MS-AWARE-002: ResourceIndexEngine
**Goal:** Index all H: drive resources
**Output:** `src/engines/ResourceIndexEngine.ts` + `data/state/resource-index.json`

**Tasks:**
- [ ] Scan H:/prism/resources/ recursively
- [ ] Scan H:/PRISM/JM DIE/ structure
- [ ] Classify by type (PDF, program, CAD, etc.)
- [ ] Store extraction status
- [ ] Provide search interface
- [ ] Auto-update on changes

### MS-AWARE-003: FormulaOrchestrator
**Goal:** Populate FormulaRegistry from all engines
**Output:** `src/engines/FormulaOrchestrator.ts` + updated FormulaRegistry

**Tasks:**
- [ ] Scan all engines for formula methods
- [ ] Extract formula metadata
- [ ] Populate FormulaRegistry (target: 400+ formulas)
- [ ] Create formula search
- [ ] Wire to awareness orchestrator

---

## PHASE 2: DATA POPULATION (Days 4-7)

### MS-DATA-001: MaterialDatabaseEngine
**Goal:** Full material properties database
**Output:** `src/engines/MaterialDatabaseEngine.ts` + `data/materials/*.json`

**Materials to include:**
- All steel grades (1018, 4140, D2, A2, M2, S7, H13, etc.)
- All aluminum alloys (6061, 7075, 2024, etc.)
- All stainless grades (303, 304, 316, 17-4, etc.)
- Titanium alloys (Ti-6Al-4V, etc.)
- Inconel, Hastelloy, Waspaloy
- Plastics (Delrin, UHMW, Acetal, etc.)
- Brass, bronze, copper

**Properties per material:**
- Kienzle kc1.1 and mc coefficients
- Taylor C and n coefficients  
- Density, hardness, tensile strength
- Thermal conductivity
- Machinability rating
- Recommended speeds/feeds by operation

**Tasks:**
- [ ] Generate steel grades JSON
- [ ] Generate aluminum grades JSON
- [ ] Generate stainless grades JSON
- [ ] Generate exotic alloys JSON
- [ ] Generate plastics JSON
- [ ] Generate non-ferrous JSON
- [ ] Engine with search/lookup

### MS-DATA-002: ToolDatabaseEngine
**Goal:** Tool specifications database
**Output:** `src/engines/ToolDatabaseEngine.ts` + `data/tools/*.json`

**Tool categories:**
- End mills (2-flute, 3-flute, 4-flute, ball, bull nose)
- Drills (HSS, carbide, indexable)
- Inserts (CNMG, WNMG, DNMG, TCMT, etc.)
- Thread mills
- Boring bars
- Reamers

**Properties per tool:**
- Dimensions (diameter, flute length, OAL)
- Material (HSS, carbide, ceramic, CBN)
- Coating (TiN, TiAlN, AlCrN, DLC)
- Application (roughing, finishing, HSM)
- Speed/feed recommendations
- Vendor data

**Tasks:**
- [ ] Extract from manufacturer catalogs
- [ ] Generate insert grades JSON
- [ ] Generate end mill specs JSON
- [ ] Generate drill specs JSON
- [ ] Engine with search/recommendations

### MS-DATA-003: PlaybookRulesEngine
**Goal:** 500+ machining playbook rules
**Output:** `src/data/machining-playbook-rules.ts`

**Rule categories:**
- Setup rules (workholding, fixturing)
- Speed/feed rules (by material, operation)
- Tool selection rules
- Sequence rules (rough before finish)
- Safety rules (guards, coolant)
- Quality rules (tolerances, inspection)
- Machine-specific rules

**Tasks:**
- [ ] Generate setup rules (100+)
- [ ] Generate speed/feed rules (100+)
- [ ] Generate tool rules (100+)
- [ ] Generate sequence rules (100+)
- [ ] Generate safety rules (50+)
- [ ] Generate quality rules (50+)

---

## PHASE 3: EXTRACTION (Days 8-14)

### MS-EXTRACT-001: MIT Courses Batch
**Goal:** Extract all 17 unprocessed MIT courses
**Method:** `/pdf-learn` batch on each folder

**Priority courses:**
1. 2.43-spring-2024 — Advanced Machining (HIGH VALUE)
2. 6.046j-spring-2015 — Algorithms (algorithms)
3. 10.34-fall-2015 — Numerical Methods (formulas)
4. 2.003-spring-2005 — Dynamics & Control (control theory)
5. 2.14-spring-2014 — Analysis & Design
6. 16.410-fall-2010 — Autonomous Systems
7. 9.40-spring-2018 — Neural Computation

**Tasks:**
- [ ] Unzip all .zip files
- [ ] Process course 1-5 (highest priority)
- [ ] Process course 6-10
- [ ] Process course 11-17
- [ ] Verify tip generation
- [ ] Update extraction log

### MS-EXTRACT-002: Manufacturer Catalogs
**Goal:** Extract tool data from catalogs
**Location:** `H:/prism/resources/MANUFACTURER_CATALOGS/`

**Catalogs to process:**
- Sandvik Coromant
- Kennametal
- Iscar
- Seco
- Mitsubishi
- Walter
- Ingersoll

**Tasks:**
- [ ] Inventory available catalogs
- [ ] Extract insert grades
- [ ] Extract speed/feed tables
- [ ] Extract tool geometries
- [ ] Populate tool database

### MS-EXTRACT-003: JM DIE Pattern Analysis
**Goal:** Extract programming patterns from 17,023 programs
**Output:** Tribal tips + playbook rules

**Analysis targets:**
- Common G-code patterns
- Speed/feed by material patterns
- Toolpath strategies used
- Setup sequences
- Safety patterns (M codes)

**Tasks:**
- [ ] Analyze CNC LATHE programs (3000+)
- [ ] Analyze CNC MILL programs (5000+)
- [ ] Analyze WIRE EDM programs (2000+)
- [ ] Analyze OKUMA programs (4000+)
- [ ] Generate pattern-based tips (500+)

---

## PHASE 4: INTEGRATION (Days 15-21)

### MS-INTEGRATE-001: Wire Awareness Orchestrator
**Goal:** Connect all engines to UnifiedAwarenessOrchestrator

**Tasks:**
- [ ] Wire FormulaOrchestrator
- [ ] Wire MaterialDatabaseEngine
- [ ] Wire ToolDatabaseEngine
- [ ] Wire ResourceIndexEngine
- [ ] Wire PlaybookRulesEngine
- [ ] Create unified query interface

### MS-INTEGRATE-002: Session Intelligence Snapshot
**Goal:** Auto-inject intelligence at session start

**Snapshot includes:**
- Engine count + key capabilities
- Formula count + categories
- Material count + common grades
- Tool count + categories
- Resource count + extraction status
- Recent extractions
- Do-not-duplicate list

**Tasks:**
- [ ] Create getSessionSnapshot() method
- [ ] Update ai-deep-intelligence hook
- [ ] Add to CLAUDE.md
- [ ] Verify injection works

### MS-INTEGRATE-003: Dispatcher Awareness
**Goal:** All dispatchers route through awareness

**Tasks:**
- [ ] Add awareness check to aiReasoningDispatcher
- [ ] Add awareness check to speedFeedDispatcher
- [ ] Add awareness check to millingDispatcher
- [ ] Add awareness check to latheDispatcher
- [ ] Add awareness check to edmDispatcher

---

## PHASE 5: VERIFICATION (Days 22-28)

### MS-VERIFY-001: Awareness Query Tests
**Goal:** 50+ tests for awareness queries

**Test categories:**
- Engine lookup
- Formula search
- Material lookup
- Tool recommendation
- Tribal knowledge search
- Resource discovery
- Duplicate detection

### MS-VERIFY-002: Intelligence Injection Tests
**Goal:** Verify session start intelligence

**Tests:**
- [ ] Hook produces valid JSON
- [ ] Snapshot includes all categories
- [ ] No duplicate work after injection
- [ ] Routing decisions are correct

### MS-VERIFY-003: End-to-End Workflow
**Goal:** Test complete awareness flow

**Scenarios:**
- [ ] User asks about speed/feed → routes to existing capability
- [ ] User asks to create engine → checks duplicates first
- [ ] User asks to extract PDF → checks extraction log first
- [ ] User asks about material → gets full properties

---

## SUCCESS CRITERIA

| Metric | Current | Target |
|--------|---------|--------|
| Awareness Score | 35/100 | 90/100 |
| Formulas Registered | 39 | 400+ |
| Materials in DB | 3 | 150+ |
| Tools in DB | 0 | 500+ |
| Tribal Tips | 339 | 2,000+ |
| Playbook Rules | 0 | 500+ |
| MIT Courses Extracted | 5 | 22 |
| Resources Indexed | 0 | 100% |

---

## TRACKING

### Milestones
- [ ] MS-AWARE-001: UnifiedAwarenessOrchestrator
- [ ] MS-AWARE-002: ResourceIndexEngine
- [ ] MS-AWARE-003: FormulaOrchestrator
- [ ] MS-DATA-001: MaterialDatabaseEngine
- [ ] MS-DATA-002: ToolDatabaseEngine
- [ ] MS-DATA-003: PlaybookRulesEngine
- [ ] MS-EXTRACT-001: MIT Courses Batch
- [ ] MS-EXTRACT-002: Manufacturer Catalogs
- [ ] MS-EXTRACT-003: JM DIE Pattern Analysis
- [ ] MS-INTEGRATE-001: Wire Awareness Orchestrator
- [ ] MS-INTEGRATE-002: Session Intelligence Snapshot
- [ ] MS-INTEGRATE-003: Dispatcher Awareness
- [ ] MS-VERIFY-001: Awareness Query Tests
- [ ] MS-VERIFY-002: Intelligence Injection Tests
- [ ] MS-VERIFY-003: End-to-End Workflow

### Dependencies
```
MS-AWARE-001 ←─ MS-INTEGRATE-001
MS-AWARE-002 ←─ MS-EXTRACT-001, MS-EXTRACT-002
MS-DATA-001 ←─ MS-DATA-002 (tool uses material)
MS-DATA-003 ←─ MS-EXTRACT-003 (patterns → rules)
MS-INTEGRATE-002 ←─ MS-INTEGRATE-001
MS-VERIFY-* ←─ MS-INTEGRATE-*
```

---

## IMMEDIATE NEXT STEPS

1. **Create UnifiedAwarenessOrchestrator** — `/forge-triple` with this spec
2. **Create ResourceIndexEngine** — Scan H: drive
3. **Populate FormulaRegistry** — Extract from all engines
4. **Generate material database** — All common alloys
5. **Begin MIT course extraction** — Priority courses first
