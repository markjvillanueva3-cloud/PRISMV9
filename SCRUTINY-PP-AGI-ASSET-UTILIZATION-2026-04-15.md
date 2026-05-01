# SCRUTINY-PP-AGI-ASSET-UTILIZATION-2026-04-15

## Pass 8: Asset Utilization Analysis

**Focus:** Maximize utilization of existing 175,000+ assets before building new
**Date:** 2026-04-15
**Analyzed:** PP-AGI-MAXOUT-ROADMAP-2026-04-15.md vs PRISM-INVENTORY-2026-04-15.md

---

## EXECUTIVE SUMMARY

| Metric | Roadmap Proposes | Already Exists | Utilization Gap |
|--------|------------------|----------------|-----------------|
| New Engines | 2,810 | 1,869 available | **70% unwired** |
| Controller Dialects | Build 173 | 63 exist, 30 detailed | Wire first |
| Tool Intelligence | Build 300 engines | 95,608 tools in DB | Query, don't rebuild |
| Material Intelligence | Build 240 engines | 6,372 materials + 2,557 HyperMILL | Already complete |
| Physics Formulas | Build new | 509 registered | 50% unwired |
| Reasoning Engines | Build 240 | 21+ exist (0 usage) | 100% orphaned |
| MIT Knowledge | Not mentioned | 225 courses (9 integrated) | **216 unused** |
| Tribal Knowledge | Not mentioned | 4,493 tips (20% used) | **3,594 dormant** |

**VERDICT:** The roadmap proposes building ~2,810 new engines while **1,309 existing engines are orphaned** and **216 MIT courses sit unintegrated**.

---

## CRITICAL FINDING: DUPLICATE EFFORT

### Phase 4: Tool Intelligence (UNNECESSARY)

**Roadmap proposes:** 10 milestones, 300 engines for tool intelligence

**Already exists:**
| Asset | Count | Location |
|-------|-------|----------|
| Tool catalog entries | 95,608 | `data/tools/` |
| ToolCatalogEngine | 113 KB | Full search, filter, recommend |
| SmartToolSelectorEngine | Exists | AI-powered selection |
| InsertGradeSelectionEngine | Exists | Grade recommendation |
| ToolRegistry | 95,608 entries | Complete database |

**Recommendation:** Wire existing ToolCatalogEngine to PP dispatcher. Don't build 300 new engines.

**Effort saved:** ~300 engines, ~1,500 tests

---

### Phase 5: Material Intelligence (UNNECESSARY)

**Roadmap proposes:** 8 milestones, 240 engines for material intelligence

**Already exists:**
| Asset | Count | Location |
|-------|-------|----------|
| Material database | 6,372 | `data/materials/` |
| HyperMILL materials | 2,557 | With ISO cross-refs |
| MaterialRegistry | 6,372 entries | Complete |
| MachinabilityRatingEngine | Exists | Rating calculations |
| MaterialPropertiesEngine | Exists | Property lookup |
| JohnsonCookModel | Algorithm | Flow stress |

**Recommendation:** Expose MaterialRegistry via PP actions. Don't build 240 new engines.

**Effort saved:** ~240 engines, ~1,200 tests

---

### Phase 8: Deep Reasoning (100% DUPLICATE)

**Roadmap proposes:** 8 milestones for reasoning capabilities

| Proposed | Already Exists | Size | Usages |
|----------|----------------|------|--------|
| Tree of Thought PP | TreeOfThoughtEngine | 18 KB | 16 |
| Chain of Thought PP | ChainOfThoughtEngine | 37 KB | 68 |
| Self-Consistency PP | (in PRISMCreativeReasoning) | 32 KB | 27 |
| Hypothesis Ranking PP | HypothesisRankerEngine | 17 KB | 17 |
| Counterfactual PP | CounterfactualReasoningEngine | 18 KB | 18 |
| Analogical PP | ManufacturingReasoningEngine | 32 KB | 34 |
| Meta-Learning PP | PostProcessorMetaLearningEngine | 1,029 LOC | Exists |

**Recommendation:** DELETE Phase 8. Wire existing reasoning engines to PP.

**Effort saved:** ~240 engines, ~1,200 tests

---

## DORMANT GIANTS: WIRE BEFORE BUILDING

### Top 10 Orphaned Engines to Wire Immediately

| Engine | Size | Capability | Usages |
|--------|------|------------|--------|
| **FeatureStrategyKnowledgeBaseEngine** | 121 KB | 10 features × 6 materials × 3 axes = optimal strategy | 0 |
| **TroubleshootingAssistantEngine** | 120 KB | 8 problem domains, decision trees, root cause | 0 |
| **CrossDisciplinaryFormulaIntegrationEngine** | 80 KB | 6,582 formulas from 15 domains | 0 |
| **CrossDisciplinaryDeepLearningEngine** | 72 KB | 107 MIT courses + algorithms | 0 |
| **ManufacturingKnowledgeGraphEngine** | 68 KB | NL queries, recommendations, gap detection | 0 |
| **TribalKnowledgeEngine** | 416 KB | 4,493 tips searchable | 324 (partial) |
| **MachiningPlaybookEngine** | 326 KB | 296 experiential rules | 133 (partial) |
| **PRISMIntelligenceLayer** | 332 KB | Claude-powered reasoning across all domains | 189 (partial) |
| **UltimateSpeedFeedEngine** | 151 KB | Comprehensive speed/feed | 49 |
| **AutoProgramOrchestratorEngine** | 165 KB | Full auto-programming | 238 |

**Total dormant code:** ~1.8 MB of capabilities sitting unused

---

## MIT COURSES: 216 UNINTEGRATED

**Current state:** 225 MIT OCW courses ingested, only 9 integrated

**High-value courses for PP-AGI:**

| Course | Topic | PP Application |
|--------|-------|----------------|
| 2.008 | Design & Manufacturing | Process planning |
| 2.810 | Manufacturing Processes | Physics models |
| 6.034 | Artificial Intelligence | Reasoning algorithms |
| 6.036 | Machine Learning | Neural architectures |
| 6.006 | Algorithms | Optimization |
| 18.06 | Linear Algebra | Matrix operations |
| 6.867 | Machine Learning | Advanced ML |
| 2.71 | Optics | Surface measurement |
| 2.003 | Dynamics & Control | Servo control |

**Recommendation:** Create `MITCourseIntegrationEngine` to wire 216 courses to relevant PP engines.

**Potential:** Massive knowledge injection without building new engines.

---

## TRIBAL KNOWLEDGE: 3,594 DORMANT TIPS

**Current state:** 4,493 tips, only ~899 (20%) actively used

**Tip categories not utilized:**

| Category | Tips | PP Application |
|----------|------|----------------|
| Chatter solutions | 400+ | Stability recommendations |
| Tool breakage fixes | 300+ | Failure prevention |
| Surface finish tricks | 350+ | Quality optimization |
| Controller quirks | 500+ | Dialect handling |
| Material-specific | 600+ | Cutting parameters |
| Fixture solutions | 250+ | Workholding advice |

**Recommendation:** Wire TribalKnowledgeEngine to all PP decision points.

---

## FORMULAS: 255 UNWIRED

**Current state:** 509 formulas registered, ~254 (50%) wired to engines

**Critical unwired formulas:**

| Formula | Domain | PP Application |
|---------|--------|----------------|
| Loewen-Shaw | Thermal | Heat partition |
| Timoshenko | Deflection | Shear deformation |
| Archard | Wear | Adhesive wear |
| Process damping | Stability | Low-RPM chatter |
| MDOF stability | Vibration | Multi-mode |

**Recommendation:** Run formula→engine wiring pass before building new physics engines.

---

## ALGORITHMS: 32 UNWIRED

**Current state:** 53 algorithms, ~21 (40%) actively used

**Unused algorithms:**

| Algorithm | Type | PP Application |
|-----------|------|----------------|
| ParticleSwarm | Optimization | Parameter search |
| SimulatedAnnealing | Optimization | Global optimization |
| AntColonyTSP | Routing | Hole sequencing |
| GeneticOptimizer | Multi-objective | Trade-off analysis |
| WaveletAnalysis | Signal | Chatter detection |
| FuzzyController | Control | Adaptive logic |

**Recommendation:** Wire unused algorithms to PP optimization engines.

---

## REVISED ROADMAP: WIRE FIRST, BUILD SECOND

### New Phase -3: ASSET WIRING (Before any new development)

| Milestone | Task | Effort | Impact |
|-----------|------|--------|--------|
| PP-WIRE-MS0 | Export 1,309 orphaned engines | 4 hours | 100% engine availability |
| PP-WIRE-MS1 | Wire 6 dormant giants to PP dispatcher | 8 hours | 500 KB capabilities |
| PP-WIRE-MS2 | Integrate 216 MIT courses | 40 hours | Massive knowledge |
| PP-WIRE-MS3 | Activate 3,594 tribal tips | 16 hours | Shop floor wisdom |
| PP-WIRE-MS4 | Wire 255 formulas to engines | 24 hours | Physics completeness |
| PP-WIRE-MS5 | Wire 32 algorithms to PP | 16 hours | Optimization power |
| PP-WIRE-MS6 | Wire reasoning engines to PP | 8 hours | AI reasoning |

**Total wiring effort:** ~116 hours (3 weeks)
**Impact:** Unlocks 175,000+ existing assets

### Phases to DELETE (100% duplicate)

| Phase | Proposed | Reason |
|-------|----------|--------|
| Phase 4 (Tools) | 300 engines | 95,608 tools + ToolCatalogEngine exist |
| Phase 5 (Materials) | 240 engines | 6,372 materials + engines exist |
| Phase 8 (Reasoning) | 240 engines | 21 reasoning engines exist |

**Engines eliminated:** 780
**Tests eliminated:** 3,900
**Time saved:** ~26 weeks

### Phases to REDUCE (partial existing coverage)

| Phase | Original | Reduced | Reason |
|-------|----------|---------|--------|
| Phase 3 (Controllers) | 360 engines | 100 engines | 63 controllers + ControllerKnowledgeEngine exist |
| Phase 6 (Toolpaths) | 360 engines | 150 engines | 698 strategies in registry |

**Additional reduction:** 470 engines, 2,350 tests

---

## ASSET UTILIZATION MATRIX

| Existing Asset | Current Use | Target Use | Gap |
|----------------|-------------|------------|-----|
| 1,869 engines | 30% wired | 100% | Wire 1,309 |
| 509 formulas | 50% | 100% | Wire 255 |
| 53 algorithms | 40% | 100% | Wire 32 |
| 4,493 tribal tips | 20% | 100% | Activate 3,594 |
| 225 MIT courses | 4% | 100% | Integrate 216 |
| 95,608 tools | Partial | Full search | Query engine |
| 6,372 materials | Partial | Full lookup | Query engine |
| 36,929 JM DIE programs | Training | Full patterns | Analysis engine |

---

## FINAL REVISED TOTALS

| Metric | Original | After Asset Utilization Pass | Reduction |
|--------|----------|------------------------------|-----------|
| New Milestones | 94 | 94 - 26 + 7 = 75 | -20% |
| New Engines | 2,810 | 2,810 - 1,250 = 1,560 | **-44%** |
| New Tests | 14,050 | 14,050 - 6,250 = 7,800 | **-44%** |
| Pre-requisite weeks | 87 | 87 + 3 (wiring) = 90 | +3% |
| Utilized existing assets | ~30% | ~100% | **+70%** |

---

## ACTION ITEMS

### Immediate (Week 1)
1. Run `scripts/gen-engine-exports.mjs` on all 1,869 engines
2. Create `ppAssetWiringEngine.ts` to orchestrate wiring
3. Export and wire 6 dormant giants

### Week 2-3
4. Create `MITCourseIntegrationEngine.ts` for 216 courses
5. Wire `TribalKnowledgeEngine` to all PP decision points
6. Wire `FeatureStrategyKnowledgeBaseEngine` to toolpath selection

### Week 4
7. Wire 255 formulas to their consuming engines
8. Wire 32 algorithms to PP optimization
9. Wire 21 reasoning engines to PP dispatcher

### Then Proceed
10. Only AFTER wiring complete, proceed with reduced roadmap

---

## SUMMARY

**The PP-AGI-MAXOUT roadmap suffers from "Not Invented Here" syndrome.**

PRISM already has:
- 1.8 MB of dormant engine code
- 216 MIT courses of algorithms
- 3,594 unused tribal tips
- 255 unwired physics formulas
- 32 unused optimization algorithms

**Building 2,810 new engines while 1,309 sit orphaned is waste.**

Wire first. Build second. Utilize existing assets.

---

*Generated by Claude Opus 4.5 — Pass 8: Asset Utilization*
*Date: 2026-04-15*
