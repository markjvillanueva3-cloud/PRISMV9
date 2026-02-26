# INTEGRATION PRIORITY MATRIX
## PRISM Extracted Modules → MCP Engine Wiring Plan
### Generated: 2026-02-23 | P-MS0 Deliverable

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total extracted JS modules | 536 |
| Currently wired (MCP TS engines) | 73 |
| Gap (unwired) | 463 |
| Estimated unique after dedup | ~350 |
| Estimated duplicates/superseded | ~113 |
| New engines needed | 5 |
| New registries needed | 3 |

---

## WAVE 1: CRITICAL SAFETY (23 files) — MS3
**Timeline:** Week 6-8 | **Safety:** ⚠️ CRITICAL — Lives at stake | **Opus MANDATORY**

| Category | Files | Target Engine | Priority |
|----------|------:|---------------|----------|
| engines/physics | 9 | PhysicsPredictionEngine, ManufacturingCalculations | ⚠️ CRITICAL |
| engines/vibration | 2 | SpindleProtectionEngine, AdaptiveControlEngine | ⚠️ CRITICAL |
| engines/post_processor | 12 | **NEW: PostProcessorEngine** + GCodeTemplateEngine | ⚠️ CRITICAL |

**Key files:**
- `PRISM_CUTTING_PHYSICS.js` — Core cutting force calculations
- `PRISM_THERMAL_MODELING.js` — Temperature prediction
- `PRISM_CHATTER_PREDICTION_ENGINE.js` — Stability lobe analysis
- `PRISM_TOOL_LIFE_ENGINE.js` — Taylor tool life model
- `PRISM_JOHNSON_COOK_DATABASE.js` — Material constitutive model
- Post processor files for Fanuc, Siemens, Haas, Mazak, Okuma dialects

**Validation:** All physics engines require S(x) ≥ 0.70. Known test vectors ±5% force, ±10% temp.

---

## WAVE 2: HIGH PRIORITY (65 files) — MS2
**Timeline:** Week 5-7 | **Safety:** HIGH — Machine damage risk

| Category | Files | Target Engine | Priority |
|----------|------:|---------------|----------|
| engines/optimization | 25 | **NEW: OptimizationSuiteEngine** + OptimizationEngine | HIGH |
| engines/simulation | 7 | CollisionEngine | HIGH |
| engines/quality | 3 | ComplianceEngine, ToleranceEngine | HIGH |
| engines/business | 11 | ProductEngine, ShopSchedulerEngine | HIGH |
| formulas | 12 | FormulaRegistry, ManufacturingCalculations | HIGH |
| business (top-level) | 7 | **NEW: JobCostingEngine, QuotingEngine** | HIGH |

**Key files:**
- 25 optimization solvers (single-obj, multi-obj, constrained, robust, manufacturing-specific, combinatorial)
- 7 simulation/collision modules (BVH, octree, swept volume)
- 12 formula modules (speed/feed, tool life, surface finish, thread, power)
- 7 business modules (costing, quoting, scheduling, inventory)

---

## WAVE 3: MEDIUM PRIORITY (267 files) — MS1
**Timeline:** Week 4-5 | **Safety:** STANDARD

| Category | Files | Target | Priority |
|----------|------:|--------|----------|
| engines/cad_cam | 55 | CAMIntegrationEngine, ToolpathCalculations | MEDIUM |
| engines/cad_complete | 4 | CAMIntegrationEngine | MEDIUM |
| engines/machines | 4 | MachineRegistry | MEDIUM |
| engines/materials | 2 | MaterialRegistry | MEDIUM |
| engines/tools | 9 | ToolRegistry | MEDIUM |
| algorithms | 52 | **NEW: AlgorithmRegistry** + AlgorithmGatewayEngine | MEDIUM |
| materials | 46 | MaterialRegistry | MEDIUM |
| materials_v9_complete | 17 | MaterialRegistry (canonical latest) | MEDIUM |
| machines | 56 | MachineRegistry | MEDIUM |
| knowledge_bases | 12 | **NEW: KnowledgeBaseRegistry** + KnowledgeQueryEngine | MEDIUM |
| tools | 2 | ToolRegistry | MEDIUM |
| workholding | 3 | WorkholdingEngine | MEDIUM |
| catalogs | 6 | ToolRegistry | MEDIUM |

**Notable:**
- CAD/CAM (59 files) is the largest subcategory — needs sub-classification into geometry, toolpath, feature recognition
- Algorithms (52 files) span graph theory, LP solvers, search, interpolation, manufacturing-specific
- Materials data (46 + 17 = 63 files) covers all ISO groups
- Machines (56 files) span 5 data levels across 6 countries

---

## WAVE 4: LOW PRIORITY (181 files) — MS1
**Timeline:** Week 4-5 (classification only, wiring in later milestones)

| Category | Files | Target | Priority |
|----------|------:|--------|----------|
| engines/ai_ml | 74 | FederatedLearningEngine, IntelligenceEngine | LOW |
| engines/ai_complete | 13 | IntelligenceEngine | LOW |
| materials_complete | 2 | ARCHIVE (superseded) | LOW |
| materials_enhanced | 14 | ARCHIVE (superseded) | LOW |
| learning | 6 | FederatedLearningEngine, ApprenticeEngine | LOW |
| integration | 14 | ERPIntegrationEngine, DNCTransferEngine | LOW |
| systems | 7 | ProtocolBridgeEngine | LOW |
| core | 11 | Various infrastructure | LOW |
| infrastructure | 5 | EventBus | LOW |
| mit | 5 | AlgorithmGatewayEngine | LOW |
| units | 3 | ManufacturingCalculations | LOW |
| constants | 1 | constants.ts | LOW |

**Notable:**
- AI/ML (87 files) needs heavy deduplication: estimated 30 unique, 57 duplicates
- Materials versions: 33 files superseded (materials_complete + materials_enhanced)
- MIT academic modules: 5 files from university courses

---

## DEDUPLICATION ANALYSIS

| Group | Total Files | Estimated Unique | Estimated Duplicates | Action |
|-------|------------|-----------------|---------------------|--------|
| AI/ML + AI Complete | 87 | ~30 | ~57 | Deduplicate by comparing function signatures |
| Material versions | 79 | ~46 | ~33 | Use materials_v9_complete as canonical |
| Machine levels | 56 | ~20 | ~36 | Use ENHANCED as canonical, archive BASIC/CORE |
| CAD variants | 59 | ~45 | ~14 | Merge cad_complete into cad_cam |
| Algorithm duplicates | 52 | ~40 | ~12 | Remove duplicate libraries |
| **TOTAL** | **333** | **~181** | **~152** | |

**Net after dedup:** 536 - 152 = **~384 unique modules** to classify and wire.

---

## NEW ARTIFACTS TO CREATE

### 5 New Engines
| Engine | Source | Wave | Dependencies |
|--------|--------|------|-------------|
| `PostProcessorEngine.ts` | 12 post_processor files | 1 | GCodeTemplateEngine |
| `OptimizationSuiteEngine.ts` | 25 optimization files | 2 | OptimizationEngine |
| `JobCostingEngine.ts` | business files | 2 | ProductEngine |
| `QuotingEngine.ts` | business files | 2 | ProductEngine |
| `InventoryEngine.ts` | business files | 2 | ProductEngine |

### 3 New Registries
| Registry | Source | Wave | Entries |
|----------|--------|------|---------|
| `AlgorithmRegistry.ts` | 52 algorithm files | 3 | ~40 after dedup |
| `KnowledgeBaseRegistry.ts` | 12 KB files | 3 | 12 |
| `PostProcessorRegistry.ts` | 12 post processor files | 1 | 12 |

### Updated Registries (expand existing)
| Registry | Current Entries | After Wiring | Delta |
|----------|:--------------:|:------------:|:-----:|
| MaterialRegistry | ~50 | ~130 | +160% |
| MachineRegistry | ~30 | ~80 | +167% |
| FormulaRegistry | ~20 | ~32 | +60% |
| ToolRegistry | ~15 | ~25 | +67% |

---

## EFFORT ESTIMATION

| Wave | Files | Unique | Sessions | Model Mix |
|------|------:|-------:|---------:|-----------|
| Wave 1 (CRITICAL) | 23 | 23 | 2-3 | 🧠 Opus 40% / ⚡ Sonnet 60% |
| Wave 2 (HIGH) | 65 | 58 | 2-3 | ⚡ Sonnet 80% / 🧠 Opus 20% |
| Wave 3 (MEDIUM) | 267 | ~195 | 3-4 | ⚡ Sonnet 70% / 🪶 Haiku 30% |
| Wave 4 (LOW) | 181 | ~108 | 2-3 | 🪶 Haiku 50% / ⚡ Sonnet 50% |
| **TOTAL** | **536** | **~384** | **9-13** | |

---

## RISK REGISTER

| Risk | Severity | Mitigation |
|------|----------|------------|
| Physics calculation errors → safety incident | CRITICAL | Opus review mandatory. Test vectors. S(x) ≥ 0.70 gate. |
| Post processor G-code errors → machine crash | CRITICAL | Simulation before real machine. Dry run mode. |
| Deduplication misidentifies unique module as dupe | HIGH | Compare function signatures, not just names. |
| Material data version conflicts | MEDIUM | Clear versioning. materials_v9_complete is canonical. |
| AI/ML module quality varies (MIT academic vs production) | LOW | Quality gate per module. Academic = reference only. |

---

## NEXT STEPS (MS1+)

1. **MS0-T6:** Generate MASTER_EXTRACTION_INDEX.json with 536 entries (current task)
2. **MS1-T1-T4:** Classify all 536 modules with full schema per entry
3. **MS1-T5:** Create AlgorithmRegistry, KnowledgeBaseRegistry, PostProcessorRegistry
4. **MS1-T6:** Validate 536/536 indexed, 0 uncategorized
5. **MS2:** Wire Wave 2 (optimization, simulation, quality, business, formulas)
6. **MS3:** Wire Wave 1 (physics, thermal, vibration, post-processor) — SAFETY CRITICAL
