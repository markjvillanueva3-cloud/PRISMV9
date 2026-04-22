# HM-REV: hyperMILL Full Integration Roadmap — RGS Generation

## Context
User has hyperMILL seat (USB key needed for live validation only). Full hyperMILL training manuals already extracted into PRISM. 11 engines (6,207 LOC), 273K lines of data, 200 tribal tips, 120+ cycle catalog, 2,544 materials, 997 lines of tests already exist. Most engines are UNWIRED — only 2 of 11 have active MCP actions. This roadmap wires everything and builds the missing integration layer.

**Goal:** Build HM-REV roadmap at same quality level as F360-REV (12 milestones, 58 units). Wire all 11 existing hyperMILL engines, build the missing bridge/pipeline integration, and connect to PRISM's shared physics backend (PPP, probing, surface integrity, grinding/EDM).

## AUDIT RESULTS — What We Have

### 11 hyperMILL Engines (6,207 LOC total)
| Engine | LOC | Wired? | Actions | Tests | Capability |
|--------|-----|--------|---------|-------|------------|
| HyperMillCodeGeneratorEngine | 982 | YES (2 actions) | 2 | 0 | AC Python script gen (NOT exported from index.ts!) |
| HyperMillToolExportEngine | 1,136 | YES (2 actions) | 2 | 0 | .hmt SQLite tool export, 29 geometry classes |
| HyperMillMultiAxisEngine | 657 | PARTIAL | 0 | 14 | Blade/impeller/tube/dental 5-axis strategy |
| HyperMillCycleDefaultsEngine | 636 | PARTIAL | 0 | 0 | 138 cycle defaults from v31/v33 Metric.cfg |
| HyperMillMaterialMapEngine | 562 | UNWIRED | 0 | 0 | 190-grade taxonomy → ISO P/M/K/N/S/H mapping |
| HyperMillMaterialBridgeEngine | 521 | UNWIRED | 0 | 0 | 2,544 materials, fuzzy match, machinability factors |
| HyperMillStrategyEngine | 492 | PARTIAL | 0 | 16 | 20+ strategies from Manual Parts 1-4 |
| HyperMillControllerCatalogEngine | 430 | PARTIAL | 0 | 0 | 16 CNC families, 60+ post variants |
| HyperMillThreadStandardEngine | 295 | UNWIRED | 0 | 0 | 11 thread standards (ISO, ANSI, BSP, etc.) |
| HyperMillSafetyHooks | 264 | UNWIRED | 0 | 45 | 6 safety validators from Manual Parts 1-4 |
| HyperMillCycleCatalogEngine | 232 | PARTIAL | 0 | 0 | 120+ cycle types across 9 categories |

### 9 Data Files (273K+ lines, ~12 MB)
- hypermill-materials.json — 2,544 materials (DIN/AISI/JIS/UNS/etc.)
- hypermill-tools.json — 587 tools with full geometry
- hypermill-cutting-tech.json — 106 materials with cutting speeds/feeds
- hypermill-materials-catalog.ts — 2,544 entries with chipping class corrections
- hypermill-iso-fits.json — 209 ISO tolerance definitions
- hypermill-speed-feed-catalog.ts — 19 diameter-dependent entries
- hypermill-tool-schema-notes.ts — SQL schema mapping docs
- hypermill-post-configs.json — 17 NcGenerator post configs
- hypermill-cam-tips-ext.ts — 83 advanced tips (5-axis, MAXX, barrel cutters)

### 200 Tribal Knowledge Tips
- 117 in TribalKnowledgeEngine (TK-DL-hm-001 to hm-117, from Manual Parts 1-4)
- 83 in hypermill-cam-tips-ext.ts (hm-118 to hm-160, advanced/5-axis/MAXX)

### 2 Skills
- /hypermill-3d-strategy-guide — choosing the right 3D machining cycle
- /hypermill-project-setup — model to NC program workflow

### 2 Extraction Scripts
- extract-hypermill-materials.py — SQLite → TypeScript catalog
- extract-hypermill-speedfeed.py — Intelligent Macro DB → TypeScript catalog

### 4 Training Videos (in HYPERMILL/tutorials/)
- CAM fundamentals, 3D ISO machining, arbitrary stock roughing, project assistance

### CRITICAL BUGS FOUND
1. HyperMillCodeGeneratorEngine **NOT exported from index.ts** despite being wired to dispatcher
2. HyperMillSafetyHooks **NOT registered in hook pipeline** (functions exist but never fire)
3. 4 engines completely UNWIRED (MaterialMap, MaterialBridge, ThreadStandard, SafetyHooks)
4. 6 of 11 engines have ZERO tests
5. Only 4 MCP actions total (2 code gen + 2 tool export) out of potential ~30+

## WHAT hyperMILL HAS THAT FUSION DOESN'T
1. **Domain-specific 5-axis** — blade, impeller, blisk, tube, dental (purpose-built strategies)
2. **120+ cycle catalog** — every hyperMILL cycle type documented
3. **2,544 material database** — multi-standard (DIN/AISI/JIS/UNS/AFNOR/BS) with fuzzy matching
4. **138 cycle defaults** — factory parameters per controller
5. **29 tool geometry classes** — much finer than Fusion's generic approach
6. **Thread standard engine** — 11 standards with tap drill sizes
7. **Controller catalog** — 16 families, 60+ post variants pre-configured
8. **Automation Center API** — Python scripting (unlike Fusion's dead-end API)

## WHAT hyperMILL NEEDS (Gaps vs F360-REV)
1. **No live bridge** — needs Automation Center connection or file-based workflow
2. **No pipeline integration** — not wired to AutoProgram, PPP, or any manufacturing pipeline
3. **No probing wired** — PRISM has 6 probe engines, none connected to hyperMILL
4. **No surface integrity wired** — engines exist, not connected
5. **No grinding/EDM routing** — engines exist, not connected to hyperMILL workflow
6. **No DFM gate** — DFMPipelineEngine not wired
7. **No quality package** — setup sheets, FAI, SPC not connected
8. **No setup sheet output** — SetupSheetEngine not wired to hyperMILL output
9. **Safety hooks not active** — 6 validators exist but never fire

## HM-REV ROADMAP DESIGN (12 milestones)

### Design Principles (same as F360-REV)
1. Wire first, build second — 70% wire / 30% build (even higher wire ratio than F360)
2. Safety before features — MS1 shared with F360-REV (already complete!)
3. Use Automation Center API for scripting (no API dead-end like Fusion)
4. Share physics backend with F360 (PPP, probing, safety — all CAM-agnostic)
5. omega_floor = 1.0

### Milestone Summary

| MS | Title | Units | Type | Sessions | Key Deliverable |
|----|-------|-------|------|----------|-----------------|
| MS1 | Engine Wiring + Export Fix | 5 | 4 WIRE, 1 FIX | 2 | All 11 engines wired with MCP actions, index.ts export fix |
| MS2 | Material + Strategy Pipeline | 5 | 5 WIRE | 2 | MaterialBridge+Map wired to SpeedFeedOrchestrator, Strategy wired |
| MS3 | Cycle + Controller + Thread Wiring | 5 | 5 WIRE | 2 | CycleCatalog+Defaults+Controller+Thread all with MCP actions |
| MS4 | Safety Hooks Activation | 4 | 3 WIRE, 1 BUILD | 1 | 6 safety validators registered in hook pipeline + fail-close |
| MS5 | Multi-Axis Pipeline Integration | 5 | 3 WIRE, 2 BUILD | 2 | Blade/impeller/tube/dental routed through physics pipeline |
| MS6 | Probing + Surface Integrity Wiring | 5 | 5 WIRE | 2 | 6 probe engines + 3 surface integrity engines connected |
| MS7 | Grinding + EDM Pipeline Connection | 5 | 5 WIRE | 2 | 31 grinding/EDM engines routed from hyperMILL operations |
| MS8 | DFM + Heat Treatment + Material Cert | 5 | 5 WIRE | 2 | DFM gate, heat treat routing, material cert traceability |
| MS9 | Automation Center Bridge | 5 | 4 BUILD, 1 WIRE | 2 | AC connection, script execution, job status monitoring |
| MS10 | Quality Chain + Setup Sheet | 4 | 2 WIRE, 2 BUILD | 1 | Auto quality package, setup sheet PDF, FAI plan |
| MS11 | Post-Processor Integration | 5 | 3 WIRE, 2 BUILD | 2 | PPP 38-stage pipeline wired to hyperMILL output path |
| MS12 | E2E Integration Testing | 5 | 5 BUILD | 2 | 5 representative parts (3-axis, 5-axis, impeller, grinding, EDM) |

**Totals: 12 milestones, 58 units, 22 sessions**
**Wire: 42 (72%) | Build: 14 (24%) | Fix: 2 (3%)**

### Key Dependencies
```
MS1 (Engine Wiring) ────────────────────────────┐
MS2 (Material + Strategy) ← MS1                 │
MS3 (Cycle + Controller) ← MS1                  │
MS4 (Safety Hooks) ← MS1                        ├─→ MS12 (E2E Testing)
MS5 (Multi-Axis) ← MS2, MS3                     │
MS6 (Probing + Surface) ← MS1 (shared w/F360)   │
MS7 (Grinding + EDM) ← MS1 (shared w/F360)      │
MS8 (DFM + HeatTreat) ← MS6                     │
MS9 (AC Bridge) ← MS1, MS5                      │
MS10 (Quality) ← MS6, MS8                       │
MS11 (Post-Processor) ← MS2, MS9                │
```

### Shared with F360-REV (no duplication)
- F360-REV-MS1 Safety Hardening — ALREADY COMPLETE, applies to both
- Physics backend (PPP, SpeedFeedOrchestrator, Kienzle) — shared
- Probing engines — shared (MS6 = wire to hyperMILL workflow)
- Surface integrity engines — shared (MS6 = wire to hyperMILL workflow)
- Grinding/EDM pipeline engines — shared (MS7 = wire to hyperMILL workflow)
- DFM, heat treatment, material cert — shared (MS8 = wire to hyperMILL workflow)
- Quality chain (SPC, FAI, metrology) — shared (MS10 = wire to hyperMILL output)

### What's NEW for hyperMILL (not shared)
- MS1: Fix index.ts export, wire 9 unwired engines with MCP actions
- MS2: Wire 2,544-material bridge to SpeedFeedOrchestrator
- MS3: Wire 120+ cycle catalog with defaults and controller post configs
- MS4: Activate 6 safety validators in hook pipeline
- MS5: Wire blade/impeller/tube/dental multi-axis through physics
- MS9: Build Automation Center bridge (AC connection, script exec, monitoring)
- MS11: Wire PPP to hyperMILL output (post-processor integration)

## 8-AGENT SCRUTINY RESULTS (Loop 1, Agents 1-8)

### Scores
| Agent | Role | Score | Key Finding |
|-------|------|-------|-------------|
| 1 | CAD/Part Modeling | 14/100 CAD | NO hyperCAD-S CAD API in code gen. Need HyperCADSAutomationEngine |
| 2 | Collision Avoidance | 85/100 hybrid | Hybrid pre-CAM gate is ready — CollisionPreventionEngine built for this |
| 3 | Training Manual Mining | 38-52/100 | 200 tips but 5 databases unextracted, 14 formulas not registered, 4 videos unprocessed |
| 4 | Setup/Program Optimization | 36.5/100 | Engines exist but ZERO wired to hyperMILL. 12:1 leverage ratio (1,200 LOC wiring unlocks 15,000 LOC) |
| 5 | Skills Architect | 2/100 → 60+ designed | 60 skills designed (52 new, 8 enhance). Zero new engines needed — all 11 already built |
| 6 | Hooks & Safety | 78/100 designed | 20 hooks total (10 blocking, 8 warning, 2 autofire). 4 existing must upgrade to blocking |
| 7 | Scripts & Automation | 11/100 | 30 scripts needed (7 extraction, 10 AC, 6 bridge, 7 utility). 5 databases never extracted |
| 8 | Hybrid Physics | 90.7/100 | PRISM + hyperMILL is orthogonal: hyperMILL = geometry, PRISM = physics. Per-block S/F = 99/100 |

### TOP FINDINGS TO ADD TO ROADMAP

**1. NEW MILESTONE NEEDED: HyperCAD-S Automation (Score 14/100)**
- Build HyperCADSAutomationEngine — CAD API coverage for import/heal/analyze/stock-model
- PrintToHyperCADSBridge — STEP path → AC Python import → heal → set as workpiece
- HyperCADSStockModelEngine — automated offset solid creation for finishing allowances
- FeatureToStrategyBridgeEngine — recognized features → strategy recommendations

**2. 60 SKILLS designed from training manual knowledge**
- Phase 1 (15 critical): material-lookup, speeds-feeds, drill, thread, 2d/3d-strategy, rough, finish, controller-select, nc-generate, safety-audit, collision-check, tool-export, automation-script, full-job
- Phase 2 (20 operational): pocket, contour, face-mill, bore, chamfer, rest, pencil, plunge, hsc, defaults, allowance-calc, surface-quality, impeller, blade, port, swarf, dental, 5axis-drill, turning-strategy, millturn
- Phase 3 (25 advanced): probe-setup, probe-validate, tool-measure, batch, gcode-check, simulate, first-part-right, cycle-time, print-to-program, setup-sheet, tips, troubleshoot, learn, + 12 more

**3. 20 HOOKS designed (10 blocking, 8 warning, 2 autofire)**
- CRITICAL: Register existing 6 hooks in HookExecutor (they NEVER fire today)
- UPGRADE 4 to blocking: clearancePlane, negativeAllowance (critical subcases), measurementSystem, restMaterialToolChange
- 10 NEW blocking: pre-collision gate, post-verification gate, 5-axis tilt limit, tool assembly reach, HPM engagement angle, feedrate-zero, + 4 more
- 2 autofire: stock model auto-update, tribal knowledge auto-inject

**4. 30 SCRIPTS designed (7 extraction, 10 AC, 6 bridge, 7 utility)**
- 5 unextracted databases: demo.db (547 tools), IM_Macro_DB (drilling macros), AC_Standard_ToolDB, IM_Tool_DB (v1), Metric.cfg directory
- 10 AC Python scripts for hyperMILL execution (job setup, tool load, roughing, finishing, 5-axis, NC gen, batch)
- Most critical: BR-01 (execute ToolExport SQL) + EX-01 (tool catalog) + AC-07 (batch program)

**5. HYBRID PHYSICS ARCHITECTURE: 90.7/100 composite**
```
PRISM PRE-CAM (91/100): Kienzle → Deflection → SLD → S/F Orchestrator → Cycle Parameter Brief
    ↓ (manual or API)
hyperMILL: Toolpath geometry (geometrically optimal, thermally naive)
    ↓ (NC file)
PRISM POST-CAM (97/100): PPP 38 stages → per-block S/F → surface integrity → quality report
```

## REVISED HM-REV MILESTONE DESIGN (14 milestones, from original 12)

Added MS0 (CAD Automation) and MS13 (Skills/Scripts batch generation):

| MS | Title | Units | Type | Sessions |
|----|-------|-------|------|----------|
| **MS0** | HyperCAD-S CAD Automation Engine | 5 | 4 BUILD, 1 WIRE | 2 |
| **MS1** | Engine Wiring + Export Fix | 5 | 4 WIRE, 1 FIX | 2 |
| **MS2** | Material + Strategy Pipeline | 5 | 5 WIRE | 2 |
| **MS3** | Cycle + Controller + Thread Wiring | 5 | 5 WIRE | 2 |
| **MS4** | Safety Hooks Activation (20 hooks) | 5 | 3 WIRE, 2 BUILD | 2 |
| **MS5** | Multi-Axis + Mold Domain Pipeline | 5 | 3 WIRE, 2 BUILD | 2 |
| **MS6** | Probing + Surface Integrity Wiring | 5 | 5 WIRE | 2 |
| **MS7** | Grinding + EDM Pipeline Connection | 5 | 5 WIRE | 2 |
| **MS8** | DFM + Heat Treatment + Material Cert | 5 | 5 WIRE | 2 |
| **MS9** | Automation Center Bridge | 5 | 4 BUILD, 1 WIRE | 2 |
| **MS10** | Quality Chain + Setup Sheet | 4 | 2 WIRE, 2 BUILD | 1 |
| **MS11** | Post-Processor PPP Integration | 5 | 3 WIRE, 2 BUILD | 2 |
| **MS12** | Skills + Scripts Batch Generation | 5 | 5 BUILD | 2 |
| **MS13** | E2E Integration Testing | 5 | 5 BUILD | 2 |

**Totals: 14 milestones, 69 units, 26 sessions**

## Verification
- `npx tsc --noEmit` — 0 new errors after each milestone
- `npx vitest run` — 0 regressions
- All 11 engines have MCP actions after MS3
- All 20 safety hooks registered and firing after MS4
- 60 skills created after MS12
- 5 E2E test parts validated after MS13

## Files to Write
1. Roadmap document: `H:\prism\mcp-server\data\docs\roadmap\HM-REV-ROADMAP.md`
2. 14 milestone envelopes: `H:\prism\mcp-server\data\milestones\HM-REV-MS{0-13}.json`
3. Update `roadmap-index.json` with 14 HM-REV entries

## FULL 20-AGENT HM-REV SCRUTINY RESULTS

| # | Role | Score | Key Finding |
|---|------|-------|-------------|
| 1 | CAD/Part Modeling | 14/100 CAD | No hyperCAD-S CAD API. Need HyperCADSAutomationEngine |
| 2 | Collision Avoidance | 85/100 hybrid | CollisionPreventionEngine ready for pre-CAM gate |
| 3 | Training Manual Mining | 38-52/100 | 5 databases unextracted, 14 formulas not registered, 98 items stranded |
| 4 | Setup/Program Optimization | 36.5/100 | 12:1 leverage — 1,200 LOC wiring unlocks 15,000 LOC |
| 5 | Skills Architect | 2→60 designed | 60 skills designed. Zero new engines needed |
| 6 | Hooks & Safety | 78/100 designed | 20 hooks (10 blocking). Existing 6 NEVER fire |
| 7 | Scripts & Automation | 11/100 | 30 scripts needed. 5 databases never extracted |
| 8 | Hybrid Physics | 90.7/100 | hyperMILL=geometry, PRISM=physics. Per-block S/F=99 |
| 9 | 5-Axis Impeller/Blisk | 62/100 | No blade roughing cycle, no open/closed channel logic, blisk=41 |
| 10 | Mold & Die Domain | 30/100 avg | No mold cycles, parting line=5, SPI standard absent |
| 11 | Post-Processor PPP | 81/100 | G43.4 parser bug (dwell misclass), TRAORI dropped, 82% dialect match |
| 12 | Turning/Mill-Turn | 68/100 | HyperMillStrategyEngine has ZERO mill-turn geometry types |
| 13 | Medical/Dental | 46/100 | CoCr absent from material map, PEEK no params, dental cycles generic |
| 14 | Aerospace Domain | 74/100 | NADCAP=52 (biggest gap), Ti thermal=74, surface integrity not gated |
| 15 | Shop Floor Operator | 55/100 | Safety BLOCK logic broken (always returns safe), hardcoded 45min tool life |
| 16 | Competitive Edge | 72 avg | PPP vs Vericut=72, learning system=88, vs CGTech=31 (complement not compete) |
| 17 | Data Extraction | 29/100 avg | demo.db 547 tools + 2706 cutting techs NEVER extracted, holders=8/100 |
| 18 | Deployment/Integration | 34/100 | AC companion server missing, port mismatch, PPP output never leaves memory |
| 19 | Gap Closure Auditor | 63/100 | **5 CRITICAL DEFECTS found in roadmap** |
| 20 | Formula/Algorithm | 24/100 | 0/14 hyperMILL formulas in FormulaRegistry |

### GAP CLOSURE AUDITOR — 5 CRITICAL DEFECTS IN ROADMAP

1. **MS4 misdiagnoses safety hooks** — All 220 hooks ARE registered. The defect is that calcDispatcher/camDispatcher never call `hookExecutor.firePhase()`. Fix = 3 lines in dispatchers, should be MS1 not MS4.

2. **MS12 skills scope wrong** — 61 skills already exist, 48 scripts already exist. MS12 targets 30 scripts (BELOW baseline). Skills should scaffold at MS3 and complete at MS12, not all at end.

3. **Per-block S/F already built** — `AutoSpeedFeedEngine.ts` already does hybrid per-block S/F via `auto_speed_feed` action. MS2 should reframe as "make this the default path" not "build it."

4. **MS0 untestable without USB** — No mock layer for hyperCAD-S. Need HyperCADSMockLayer unit for CI.

5. **Medical domain has no milestone** — CoCr IS in catalog under "Medicinal Technology" and PEEK IS present. But biomedical cutting param validation has no owner. Add to MS8.

## CORRECTED HM-REV ROADMAP (incorporating all 20 agent corrections)

| MS | Title | Units | Type | Sessions | Key Change from Original |
|----|-------|-------|------|----------|-------------------------|
| **MS0** | HyperCAD-S CAD Automation + Mock Layer | 5 | 4 BUILD, 1 WIRE | 2 | Added mock layer for CI testability |
| **MS1** | Engine Wiring + Safety Hook Invocation Fix | 5 | 3 WIRE, 1 FIX, 1 BUILD | 2 | MOVED safety fix here (not MS4). Fix firePhase() in dispatchers |
| **MS2** | Material Bridge + PPP Default Path | 5 | 5 WIRE | 2 | Reframed: wire MaterialBridge to SpeedFeedOrchestrator + make PPP the default post path |
| **MS3** | Cycle + Controller + Thread + Skills Scaffold | 6 | 4 WIRE, 2 BUILD | 2 | Skills scaffold starts here (15 Phase 1 skills), not deferred to MS12 |
| **MS4** | Multi-Axis Pipeline (Impeller/Blisk/Mold) | 6 | 3 WIRE, 3 BUILD | 2 | Added mold domain (HyperMillMoldCycleEngine), blade roughing, open/closed channel |
| **MS5** | Probing + Surface Integrity + Safety Gate | 5 | 5 WIRE | 2 | Added surface integrity hard gate (white layer blocking) |
| **MS6** | Grinding + EDM + Heat Treatment Routing | 6 | 5 WIRE, 1 BUILD | 2 | Combined grinding/EDM + heat treat (user's stated grinding workflow) |
| **MS7** | Turning/Mill-Turn + Medical Domain | 6 | 4 WIRE, 2 BUILD | 2 | Added mill-turn GeometryTypes, CoCr/PEEK params, dental blank router |
| **MS8** | Data Extraction Pipeline (5 databases) | 5 | 5 BUILD | 2 | NEW: Extract demo.db, IM_Macro_DB, holder catalog, feature2job XMLs |
| **MS9** | Automation Center Bridge + Deployment | 5 | 4 BUILD, 1 WIRE | 2 | Added AC companion server, port fix, PPP file writer |
| **MS10** | Quality Chain + Setup Sheet + Formula Registry | 5 | 3 WIRE, 2 BUILD | 2 | Added 20 formula registrations (F-HM-001 to F-HM-020) |
| **MS11** | PPP-hyperMILL Integration + G43.4 Fix | 5 | 3 WIRE, 2 BUILD | 2 | Added G43.4 parser fix, TRAORI passthrough, HyperMillPPPBridgeHooks |
| **MS12** | Skills Phase 2+3 + Scripts + Hooks Batch | 6 | 6 BUILD | 2 | 45 remaining skills + 30 scripts + hook registration verification |
| **MS13** | E2E Integration Testing (5 parts) | 5 | 5 BUILD | 2 | 5 parts: prismatic, 5-axis impeller, mill-turn, grinding, wire EDM |

**Totals: 14 milestones, 75 units, 28 sessions**

### KEY ARCHITECTURAL DECISIONS
1. **Safety first** (MS1) — Fix firePhase() invocation in dispatchers (3-line fix, highest trust impact)
2. **Skills scaffold early** (MS3) — 15 critical skills available by MS3, not deferred to MS12
3. **Data extraction before AC bridge** (MS8 before MS9) — 5 databases must be extracted before scripts can reference their content
4. **PPP integration after data** (MS11 after MS8) — G43.4 parser fix + TRAORI passthrough critical for 5-axis
5. **Medical domain in MS7** (not orphaned) — CoCr/PEEK/dental params alongside turning/mill-turn
6. **Mold domain in MS4** (not orphaned) — HyperMillMoldCycleEngine alongside multi-axis impeller/blade
7. **Formula registration in MS10** — 20 F-HM formulas into FormulaRegistry, not stranded in data catalog

### DEPENDENCY GRAPH
```
MS0 (CAD Automation) ──────────────────────────────┐
MS1 (Wiring + Safety Fix) ← none                   │
MS2 (Material + PPP Default) ← MS1                 │
MS3 (Cycles + Skills Phase 1) ← MS1                │
MS4 (Multi-Axis + Mold) ← MS2, MS3                 ├─→ MS13 (E2E)
MS5 (Probing + Surface Integrity) ← MS1            │
MS6 (Grinding + EDM + HeatTreat) ← MS2             │
MS7 (Turning + Medical) ← MS2, MS3                 │
MS8 (Data Extraction) ← MS1                        │
MS9 (AC Bridge + Deploy) ← MS4, MS8                │
MS10 (Quality + Formulas) ← MS5, MS6               │
MS11 (PPP Integration) ← MS9, MS10                 │
MS12 (Skills + Scripts Batch) ← MS3, MS11           │
```

### PARALLELIZATION OPPORTUNITIES
- MS0 + MS1 in parallel (CAD automation independent of engine wiring)
- MS5 + MS6 + MS8 in parallel (probing, grinding, data extraction are independent)
- MS3 + MS5 in parallel (cycle wiring and probing wiring are independent)

## Scrutiny Agent Reports (Full Detail)
- Agent 1 (CAD): `synchronous-nibbling-taco-agent-a1259677d75e78378.md`
- Agent 2 (Collision): `synchronous-nibbling-taco-agent-a2ccf422c062aa183.md`
- Agent 3 (Manual Mining): `synchronous-nibbling-taco-agent-af6713c15c9dc3ce9.md`
- Agent 4 (Setup/Program): `synchronous-nibbling-taco-agent-acf4e60ee009f0c37.md`
- Agent 5 (Skills): `synchronous-nibbling-taco-agent-afe198e5b5daa0819.md`
- Agent 6 (Hooks): `synchronous-nibbling-taco-agent-a0b832501d7c7c9f4.md`
- Agent 7 (Scripts): `synchronous-nibbling-taco-agent-ad96a36e856c45ce0.md`
- Agent 8 (Hybrid Physics): inline (90.7/100)
- Agent 9 (5-Axis Impeller): `synchronous-nibbling-taco-agent-a7d22aede01c7cb7b.md`
- Agent 10 (Mold/Die): `synchronous-nibbling-taco-agent-ac7b6c05f0b0b3561.md`
- Agent 11 (Post-Processor): `synchronous-nibbling-taco-agent-a98314e61b91fd5f5.md`
- Agent 12 (Turning/MillTurn): `synchronous-nibbling-taco-agent-aa29b5d51bbb38313.md`
- Agent 13 (Medical/Dental): `synchronous-nibbling-taco-agent-abbe46adb7bf8d864.md`
- Agent 14 (Aerospace): `synchronous-nibbling-taco-agent-a15c428f29d029648.md`
- Agent 15 (Shop Floor): `synchronous-nibbling-taco-agent-a62c9fa90992c04e5.md`
- Agent 16 (Competitive): `synchronous-nibbling-taco-agent-a945cbc8ccf42012f.md`
- Agent 17 (Data Extraction): `synchronous-nibbling-taco-agent-af5a2226e065d6bd2.md`
- Agent 18 (Deployment): `synchronous-nibbling-taco-agent-a51773e864b6f995b.md`
- Agent 19 (Gap Closure): `synchronous-nibbling-taco-agent-aaa07a65601df4fe8.md`
- Agent 20 (Formula): `synchronous-nibbling-taco-agent-a60d2bbbb4404b9df.md`

## EXPANDED SCOPE: FULL SUITE COVERAGE (CAD + Fixture + Setup + Simulate + CAM + NC)

User requirement: "we need it for the full entire suite not just cam. remember we're going to cad, fixture, setup and simulate within hypermill"

### Full Command Surface Enumeration (~305 commands)

**1. hyperCAD-S CAD (~80 commands)**
| Category | Commands | Skills Needed | Scripts | Hooks |
|----------|----------|---------------|---------|-------|
| Sketch | line, arc, circle, rect, polygon, spline, ellipse, slot, construction, dim, constraint | 12 | 12 | 3 (constraint validation) |
| Solid | extrude, revolve, sweep, loft, shell, draft, fillet, chamfer, boolean (add/cut/intersect), pattern, mirror | 14 | 14 | 4 (draft angle, wall thickness, undercut) |
| Surface | offset, thicken, extend, trim, stitch, patch, ruled, sweep | 8 | 8 | 2 (surface continuity) |
| Analysis | draft, undercut, curvature, wall thickness, spherical (min tool dia), feature recognition | 6 | 6 | 2 (DFM gate) |
| Electrode | design, holder lib, virtual electrode, side electrode, spark gap | 5 | 5 | 3 (electrode non-associativity, overcut validation) |
| Workplane | face, 3-point, axis, redefine, align, offset, angle | 7 | 7 | 1 (WP consistency) |
| Heal/Repair | check quality, repair solid, align normals, simplify, convert analytical | 5 | 5 | 1 (repair completeness) |
| Import/Export | STEP, IGES, STL, DXF, Parasolid, CATIA, NX | 7 | 7 | 1 (format validation) |
| Measure | distance, angle, area, volume, mass, COG | 6 | 6 | 0 |
| Bounding/Stock | bounding box, offset solid, stock from model | 3 | 3 | 1 (stock allowance) |
| **Subtotal** | **~73** | **73** | **73** | **18** |

**2. Fixture & Workholding (~30 commands)**
| Category | Commands | Skills | Scripts | Hooks |
|----------|----------|--------|---------|-------|
| Fixture body | import, create, position, define clamp zone | 4 | 4 | 2 (clamp interference) |
| Soft jaw | design from part, bore profile, step jaw, dovetail | 4 | 4 | 1 (jaw grip force) |
| Vise setup | jaw width, opening, stop position, parallels | 4 | 4 | 1 (clamping force vs cutting force) |
| Chuck/collet | 3-jaw, 4-jaw, collet selection, grip force | 4 | 4 | 2 (centrifugal loss, jaw torque) |
| Tombstone | pallet layout, indexing, multi-part arrangement | 3 | 3 | 1 (weight balance) |
| Vacuum/magnetic | zone definition, hold force, seal check | 3 | 3 | 1 (hold force vs cutting force) |
| Stock model | from bounding box, offset solid, from body, cylinder | 4 | 4 | 1 (stock vs part interference) |
| WCS/Datum | G54-G59 assignment, datum transfer, probe verification | 4 | 4 | 2 (datum consistency) |
| **Subtotal** | **~30** | **30** | **30** | **11** |

**3. hyperMILL CAM Setup (~35 commands)**
| Category | Commands | Skills | Scripts | Hooks |
|----------|----------|--------|---------|-------|
| Job management | create, modify, copy, transform, delete, sequence | 6 | 6 | 1 (sequence validation) |
| Coordinate system | WCS, toolplane, multiple frames, offset | 4 | 4 | 2 (frame consistency) |
| Tool assignment | from TDB, custom, assembly, holder selection | 4 | 4 | 2 (tool-material compatibility) |
| Clearance/Heights | clearance plane, retract, feed height, link | 4 | 4 | 3 (clearance plane safety) |
| Allowance | radial, axial, XY, corner radius, negative | 4 | 4 | 3 (negative allowance) |
| Strategy selection | geometry → cycle → parameters | 5 | 5 | 1 (strategy-material match) |
| Rest machining | previous tool ref, stock model update, cascade | 4 | 4 | 2 (tool diameter, stock reference) |
| Transformation | mirror, rotate, offset pattern, copy jobs | 4 | 4 | 1 (pattern collision) |
| **Subtotal** | **~35** | **35** | **35** | **15** |

**4. hyperMILL CAM Cycles (~120 commands)**
| Category | Cycle Count | Skills | Scripts | Hooks |
|----------|------------|--------|---------|-------|
| Drilling | 15+ (spot, peck, deep, gun, bore, ream, tap, thread mill, countersink) | 15 | 15 | 5 (L/D, peck depth, tap feed sync) |
| 2D | 12+ (pocket, contour, face, slot, chamfer, T-slot, plunge, rest, engrave) | 12 | 12 | 4 (pocket depth, engagement) |
| 3D | 20+ (Z-level, parallel, scallop, pencil, rest, MAXX offset, MAXX HPC, optimized) | 20 | 20 | 6 (scallop height, thermal, deflection) |
| 5-Axis | 25+ (swarf, tangent, blade×5, impeller×10, tube×2, dental×3, cavity, surface) | 25 | 25 | 8 (tilt angle, collision, singularity) |
| Turning | 18+ (OD rough/finish, ID rough/finish, face, groove×6, thread, parting, boring, recessing) | 18 | 18 | 5 (CSS, HPM, tool nose comp) |
| Probing | 8+ (setup, bore, boss, web, surface, tool set, tool break) | 8 | 8 | 2 (probe approach, trigger) |
| Grinding | 5+ (surface, cylindrical, centerless, creep feed) | 5 | 5 | 3 (burn risk, wheel check) |
| APT/Misc | 5+ (transformation, linking, coolant) | 5 | 5 | 2 |
| **Subtotal** | **~118** | **108** | **108** | **35** |

**5. VIRTUAL Machining / Simulation (~25 commands)**
| Category | Commands | Skills | Scripts | Hooks |
|----------|----------|--------|---------|-------|
| Machine selection | load kinematic model, configure axes, set limits | 3 | 3 | 1 (machine-part envelope) |
| Collision simulation | full sim, quick check, per-operation, per-block | 4 | 4 | 4 (HARD BLOCK on collision) |
| Stock verification | material removal, rest material, gouge detection | 3 | 3 | 2 (gouge, excess material) |
| Travel limits | axis travel, rotary limits, singularity zones | 3 | 3 | 3 (hard stop, singularity) |
| Cycle time | estimate per operation, total, compare | 3 | 3 | 0 |
| NC verification | code replay, block-by-block, spindle load | 4 | 4 | 2 (feed/speed limits) |
| nightSHIFT | batch calculate, batch simulate, batch post | 3 | 3 | 1 (pre-batch validation) |
| Report | collision report, cycle time report, verification log | 2 | 2 | 0 |
| **Subtotal** | **~25** | **25** | **25** | **13** |

**6. NC Output (~20 commands)**
| Category | Commands | Skills | Scripts | Hooks |
|----------|----------|--------|---------|-------|
| Calculate | single, all, selected, with options | 4 | 4 | 1 (uncalculated jobs) |
| Post-process | select post, configure, generate, verify | 4 | 4 | 3 (safe start, unit declaration, dialect) |
| Output config | folder, naming, format, sub-programs | 4 | 4 | 1 (naming collision) |
| Batch | nightSHIFT submit, status, retrieve | 3 | 3 | 1 (all calculated before batch) |
| PPP enhance | per-block S/F, thermal comp, chatter avoidance | 3 | 3 | 2 (physics validation) |
| Delivery | DNC, USB, network, setup sheet PDF | 2 | 2 | 1 (DNC connectivity) |
| **Subtotal** | **~20** | **20** | **20** | **9** |

### LEVEL 1: COMMANDS (~301)
(Previously enumerated — major operations)

### LEVEL 2: INPUT PARAMETERS PER COMMAND (~5,000-8,000)

Every command has 5-50 individual input fields. This is where the REAL variability lives.

**CAM Cycle Parameters (the biggest category):**

Each of the 120+ cycles has these parameter categories:
| Param Category | Fields per Cycle | Example Fields | Total (×120 cycles) |
|----------------|-----------------|----------------|---------------------|
| Cutting Data | 8-12 | spindle_speed, feed_rate, feed_per_tooth, plunge_feed, ramp_feed, retract_feed, approach_feed, lead_in_feed, finishing_feed | ~1,200 |
| Geometry/Boundary | 5-10 | machining_boundary, tool_containment, rest_machining_source, stock_contour, additional_offset, wall_angle, floor_angle | ~900 |
| Heights/Clearance | 6-8 | clearance_plane, retract_height, feed_height, top_height, bottom_height, safety_offset | ~840 |
| Passes/Strategy | 8-15 | stepdown, stepover, optimal_load, direction(climb/conv), ramp_type, ramp_angle, multiple_depths, finishing_passes, stock_to_leave_axial, stock_to_leave_radial, tolerance, smoothing | ~1,500 |
| Linking/Approach | 6-10 | lead_in_type(arc/line/helix), lead_in_radius, lead_in_angle, lead_out_type, retract_policy, transition_type, stay_down, keepdown, entry_method | ~960 |
| Tool Compensation | 3-5 | comp_type(none/computer/wear/reverse), comp_direction(left/right), comp_register | ~480 |
| Coolant | 2-4 | coolant_mode(flood/mist/through/air/off), coolant_pressure, coolant_override | ~360 |
| **Per-Cycle Subtotal** | **38-64** | | **~6,240** |

**5-Axis-Specific Parameters (25 cycles × additional fields):**
| Param Category | Fields | Total |
|----------------|--------|-------|
| Tool axis control | tilt_angle, lead_angle, lag_angle, lean_angle, tilt_direction | 125 |
| Collision avoidance | auto_tilt, tilt_limit_min/max, collision_distance, retraction_angle | 125 |
| Blade/Impeller | hub_surface, shroud_surface, blade_count, splitter_flag, channel_type | 125 |
| Surface quality | scallop_height, cusp_height, point_distribution, UV_direction | 100 |
| **5-Axis Subtotal** | | **~475** |

**Turning-Specific Parameters (18 cycles × additional fields):**
| Param Category | Fields | Total |
|----------------|--------|-------|
| Insert geometry | nose_radius, approach_angle, lead_angle, insert_type, chipbreaker | 90 |
| CSS mode | G96/G97, S_max_clamp, surface_speed | 54 |
| Grooving | groove_width, peck_depth, dwell, slope_angle, overlap | 90 |
| Threading | pitch, starts, infeed_method, pass_count, spring_passes, lead_in_threads | 108 |
| **Turning Subtotal** | | **~342** |

**hyperCAD-S Input Parameters:**
| Category | Fields | Total |
|----------|--------|-------|
| Sketch constraints | coincident, tangent, equal, parallel, perpendicular, horizontal, vertical, dimension, radius, angle | ~20 types × 3-5 params each = 80 |
| Extrude/Revolve | direction, distance, taper, draft_angle, symmetric, offset, boolean_type | 50 |
| Fillet/Chamfer | radius, variable_radius, face_blend, setback | 30 |
| Surface operations | offset_distance, continuity(G0/G1/G2), trim_extend, stitch_tolerance | 40 |
| Analysis tools | draft_pull_direction, min_radius, curvature_display, wall_threshold | 30 |
| Electrode design | overcut_rough, overcut_finish, electrode_material, spark_gap, wear_ratio | 25 |
| Import settings | healing_tolerance, unit_mode, layer_mapping, body_stitching | 20 |
| **CAD Subtotal** | | **~275** |

**Settings/Preferences (Global):**
| Category | Fields | Total |
|----------|--------|-------|
| Calculation settings | tolerance, smoothing_tolerance, geometry_check, parallel_calculation | 20 |
| Display settings | shading, wireframe, transparency, colors, mesh_quality | 25 |
| Layer system | layer_name, visibility, color, selection_filter, lock, group | 15 × N layers |
| Tool database settings | default_TDB_path, auto_load, coupling_type, material_table | 15 |
| NC generation settings | output_folder, naming_convention, sub_programs, line_numbers | 20 |
| Machine settings | machine_model, kinematic_config, axis_limits, spindle_config | 30 |
| VIRTUAL Machining | simulation_quality, collision_tolerance, stock_mesh_density | 15 |
| Measurement system | metric/inch, decimal_places, angle_format, coordinate_display | 10 |
| nightSHIFT batch | max_parallel, priority, notification, auto_post | 10 |
| **Settings Subtotal** | | **~175** |

**UI Features (Non-Parameter Interactions):**
| Feature | Actions | Total |
|---------|---------|-------|
| Job list management | drag-reorder, group, expand/collapse, filter by type/tool, multi-select, copy, paste, transform | 15 |
| Tree navigation | component tree, feature tree, operation tree, tool tree | 12 |
| Selection modes | face, edge, vertex, body, sketch element, annotation, workplane | 10 |
| View controls | rotate, pan, zoom, fit, section, projection, shaded/wireframe | 10 |
| Context menus | right-click per entity type (body, face, operation, tool, WCS) | 20 |
| Drag-and-drop | tool to operation, body to stock, operation reorder | 8 |
| Keyboard shortcuts | calculate, simulate, undo, redo, copy, delete, group | 15 |
| **UI Subtotal** | | **~90** |

### COMPLETE VARIABILITY SURFACE

| Level | Count | Description |
|-------|-------|-------------|
| Commands (L1) | ~301 | Major operations (previously enumerated) |
| Per-Command Parameters (L2) | ~7,597 | Input fields across all commands |
| Settings/Preferences | ~175 | Global configuration |
| UI Features | ~90 | Non-parameter interactions |
| **TOTAL INPUT SURFACE** | **~8,163** | **Every single thing a user can touch** |

### WHAT PRISM NEEDS FOR EACH PARAMETER

For EVERY parameter in the ~8,163 surface:

1. **Schema definition** — name, type (number/string/enum/boolean), range (min/max), default value, unit
2. **Physics mapping** — which PRISM engine computes the optimal value for this parameter
3. **Validation rule** — what makes this parameter unsafe or suboptimal (→ hook)
4. **Recommendation logic** — material + machine + tool + geometry → recommended value (→ skill)
5. **AC Python setter** — `operation.SetParameter("param_name", value)` call (→ script)
6. **Dependencies** — which other parameters change when this one changes (linked params)

### IMPLEMENTATION: DATA-DRIVEN GENERATION PIPELINE

Enumerating 8,163 parameters by hand is impossible. We need a **parameter extraction + artifact generation pipeline**:

```
EXTRACTION (from hyperMILL installation files):
  Metric.cfg (138 files) ──→ Cycle parameter schemas + defaults
  omCycles.txt ────────────→ Cycle type → parameter list mapping
  demo.db ─────────────────→ Tool parameter schemas (29 geometry classes)
  IM_Tool_DB ──────────────→ Cutting technology parameter schemas
  IM_Macro_DB ─────────────→ Feature macro parameter schemas
  omFeature2JobCatalog_*.xml → Feature-to-job parameter mappings
  omPP*.xml filenames ─────→ Post config parameter surface

GENERATION (automated from extracted schemas):
  Parameter Schema ──→ Zod validation schema (.ts)
  Parameter Schema ──→ Skill template (.md) with physics mapping
  Parameter Schema ──→ AC Python setter script (.py)
  Parameter Schema ──→ Safety hook rule (.ts) for out-of-range values
  Parameter Schema ──→ FormulaRegistry entry (if formula-backed)

VALIDATION:
  Generated artifacts ──→ Type-check (tsc)
  Generated artifacts ──→ Unit tests (vitest)
  Generated artifacts ──→ Live validation (requires USB key)
```

### REVISED HM-KC TRACK (Knowledge Capture — Data-Driven)

| Phase | Focus | Input Source | Generated Artifacts | Sessions |
|-------|-------|-------------|---------------------|----------|
| KC-0 | Parameter Extraction Pipeline | Build the extractor scripts | 8 extraction scripts | 2 |
| KC-1 | CAD Parameter Catalog | hyperCAD-S commands + settings | ~275 schemas + skills + scripts | 3 |
| KC-2 | Fixture/Setup Parameter Catalog | Stock, WCS, clearance, workholding | ~200 schemas + skills + scripts | 2 |
| KC-3 | CAM Core Parameter Catalog | Drilling, 2D, 3D cycle params | ~2,500 schemas + skills + scripts | 4 |
| KC-4 | CAM Advanced Parameter Catalog | 5-axis, turning, mill-turn params | ~1,500 schemas + skills + scripts | 3 |
| KC-5 | Linking/Approach Parameter Catalog | Per-cycle linking options | ~960 schemas + skills + scripts | 2 |
| KC-6 | Simulation + NC Parameter Catalog | VIRTUAL Machining, post configs | ~500 schemas + skills + scripts | 2 |
| KC-7 | Settings + Preferences Catalog | Global settings, layers, UI | ~265 schemas + skills + scripts | 2 |
| KC-8 | Physics Mapping Layer | Map each param to PRISM engine output | ~8,163 physics mappings | 4 |
| KC-9 | Validation + Artifact Testing | Verify all generated artifacts | Test suite | 3 |
| **TOTAL** | | | **~8,163 parameter schemas** | **27** |
|  | | | **~2,000 skills** | |
|  | | | **~2,000 scripts** | |
|  | | | **~500 hooks** | |
|  | | | **~8,163 physics mappings** | |

## CAD LEARNING SYSTEM — Part Upload → Feature Extraction → Replication Training

User requirement: "upload cad models that fills out enough data that you can replicate the data to draw similar parts or use that sequence to create features that compound into each other"

### The Concept

When a machinist uploads a part (hyperMILL project file or STEP), PRISM:
1. **Extracts** the feature sequence (what was built, in what order, with what parameters)
2. **Learns** the pattern (this type of geometry uses these features in this sequence)
3. **Replicates** on new parts (given similar geometry description, generate the feature sequence)

### Two Input Paths

**Path A: hyperMILL Project Files (.hmc) — EASY**

hyperMILL project files are XML-based and contain:
- Complete job list (every CAM operation with all parameters)
- Feature tree (if modeled in hyperCAD-S)
- Tool assignments, stock model, coordinate systems
- Operation sequence with dependencies

From an .hmc file, PRISM can extract:
```
Part: "Mold Cavity Insert"
Material: H13 (54 HRC)
Stock: 150×100×80mm block

Feature Sequence:
  1. Face mill top (clearance surface, datum A)
  2. 3D Z-level rough (MAXX, D16 endmill, ae=8%, ap=15mm)
  3. 3D rest rough (D10 ball, from D16 rest)
  4. 3D rest rough (D6 ball, from D10 rest)
  5. 3D Z-level finish (D6 ball, scallop 0.005mm, climb)
  6. 3D pencil finish (D4 ball, corners)
  7. 3D rest finish (D3 ball, from D4 rest)
  8. Drill 4× M10 bolt holes (spot → drill → tap)

Parameters per operation: stepdown, stepover, S/F, linking, approach, tolerance
Tool sequence: D16 → D10 → D6 → D4 → D3 → spot → drill → tap
```

This is a COMPLETE training record — every decision the programmer made is encoded.

**Path B: STEP Files — HARDER but solvable**

STEP files contain only geometry (B-Rep solid model) — no feature history, no operation sequence, no machining parameters. But PRISM can still extract:

1. **Geometric features** via `FeatureRecognitionEngine`:
   - Holes (through, blind, counterbore, countersink) with diameters and depths
   - Pockets (rectangular, circular, freeform) with depths and wall angles
   - Slots, grooves, channels with widths and depths
   - Fillets and chamfers with radii
   - Bosses and steps with heights
   - Freeform surfaces with curvature analysis
   - Threads (from geometry: helical features or annotation)

2. **Part classification** via geometry analysis:
   - Prismatic (mostly flat faces, pockets, holes) → mill
   - Cylindrical (rotational symmetry) → turn
   - Complex freeform (mold, impeller, blisk) → 5-axis
   - Thin-wall (wall thickness < 3mm) → special strategy
   - Multi-setup (features accessible from multiple directions)

3. **Inferred feature sequence** using manufacturing rules:
   - External surfaces before internal features
   - Large features before small
   - Roughing sequence by tool diameter (large → small)
   - Hole-making after face/pocket machining
   - Finishing after all roughing complete

### Learning Architecture

```
UPLOAD PIPELINE:
  .hmc file ──→ HMCProjectParser ──→ FeatureSequenceRecord
  .step file ──→ FeatureRecognitionEngine ──→ InferredSequenceRecord

LEARNING STORE:
  FeatureSequenceRecord[] → indexed by:
    - Part type (mold, impeller, prismatic, shaft, bracket, housing...)
    - Material group (ISO P/M/K/N/S/H)
    - Complexity (simple/moderate/complex/extreme)
    - Machine type (3-axis, 5-axis, turning, mill-turn)
    - Feature pattern (pocket+holes, cavity+electrode, blisk+fillet...)

REPLICATION ENGINE:
  User describes new part → similarity search → closest FeatureSequenceRecord
  → adapt parameters (scale dimensions, adjust S/F for material) → generate AC script
```

### Data Structures

**FeatureSequenceRecord** (from .hmc or inferred from STEP):
```typescript
interface FeatureSequenceRecord {
  id: string;
  source: "hmc_project" | "step_inferred" | "manual_entry";
  source_file: string;

  // Part identity
  part_name: string;
  part_type: "mold_cavity" | "mold_core" | "prismatic" | "shaft" | "bracket" | "housing"
           | "impeller" | "blisk" | "blade" | "medical_implant" | "dental" | "electrode"
           | "fixture_plate" | "automation_part" | "custom";
  material_group: "P" | "M" | "K" | "N" | "S" | "H";
  material_name: string;
  hardness_hrc?: number;

  // Geometry envelope
  bounding_box: { x: number; y: number; z: number }; // mm
  volume_cm3: number;
  surface_area_cm2: number;
  face_count: number;
  min_radius_mm: number;
  max_depth_mm: number;
  wall_thickness_min_mm?: number;
  complexity: "simple" | "moderate" | "complex" | "extreme";

  // Feature sequence (THE CORE DATA)
  features: FeatureStep[];

  // CAM data (from .hmc only)
  operations?: OperationRecord[];
  tool_list?: ToolRecord[];
  stock_model?: StockRecord;
  wcs_frames?: WCSRecord[];
  cycle_time_min?: number;
}

interface FeatureStep {
  sequence: number;
  feature_type: string; // "pocket" | "hole" | "fillet" | "freeform" | "thread" | ...
  geometry: {
    dimensions: Record<string, number>; // depth_mm, width_mm, diameter_mm, radius_mm, angle_deg
    position: { x: number; y: number; z: number };
    orientation: { i: number; j: number; k: number }; // normal vector
  };
  tolerances?: { dimension_mm?: number; position_mm?: number; ra_um?: number };
  depends_on?: number[]; // sequence numbers of prerequisite features
  // CAD generation data (how to BUILD this feature)
  cad_operation?: {
    type: "extrude" | "revolve" | "sweep" | "loft" | "fillet" | "chamfer" | "hole" | "pattern" | "boolean" | "shell";
    params: Record<string, unknown>;
    sketch_plane?: string; // "XY" | "XZ" | "YZ" | face reference
    sketch_entities?: SketchEntity[]; // lines, arcs, circles that make up the 2D profile
  };
}
```

### Engines to Build

**1. HMCProjectParserEngine** (~600 LOC)
- Reads .hmc XML project files (hyperMILL native format)
- Extracts: job list, operations, tools, stock, WCS, parameters
- Outputs: `FeatureSequenceRecord` with full operation details
- No USB key needed — .hmc files are XML, readable offline

**2. STEPFeatureExtractorEngine** (~800 LOC)
- Reads STEP files via CadQuery/OpenCascade (existing cad-engine)
- Runs FeatureRecognitionEngine on each body
- Infers manufacturing sequence from geometric analysis
- Outputs: `FeatureSequenceRecord` with inferred sequence
- Uses `PrintToGeometryEngine` patterns in reverse (geometry → features instead of features → geometry)

**3. PartSimilaritySearchEngine** (~400 LOC)
- Indexes FeatureSequenceRecords by geometric hash
- Similarity metric: feature type overlap × dimension proximity × material match
- Returns top-N similar parts with adaptation suggestions
- "This new part is 85% similar to mold_cavity_insert_047 — here's the adapted sequence"

**4. FeatureSequenceReplicatorEngine** (~500 LOC)
- Takes a FeatureSequenceRecord (template) + new part description
- Scales dimensions, adjusts parameters for new material/machine
- Outputs: AC Python script that builds the part in hyperCAD-S + programs it in hyperMILL
- The holy grail: "draw this part and program it like that other part I uploaded"

**5. CADSequenceLearningEngine** (~400 LOC)
- Aggregates feature sequences across all uploaded parts
- Learns patterns: "when I see pocket_depth > 3×D, the sequence always includes rest machining"
- Builds decision trees: geometry features → recommended feature sequence
- Feeds into HyperMillStrategyEngine for better recommendations

### Upload Workflow (User Experience)

```
User: "I have a part similar to the one I made last week — here's the STEP file"

PRISM:
1. Uploads STEP → STEPFeatureExtractorEngine
   "Found: 3 pockets, 12 holes (4 tapped), 2 fillets, 1 freeform surface"
   "Classification: prismatic bracket, moderate complexity"

2. Searches → PartSimilaritySearchEngine
   "85% match to part_bracket_017 (uploaded 2 weeks ago)"
   "Differences: 2 more holes, deeper main pocket, different material (7075 vs 6061)"

3. Adapts → FeatureSequenceReplicatorEngine
   "Adapted sequence from bracket_017:
    1. Face top (same)
    2. Rough main pocket (deeper: 25mm vs 18mm, adjusted stepdown)
    3. Rough 2 side pockets (same)
    4. Finish all pockets (adjusted S/F for 7075)
    5. Drill 12 holes (was 10, added 2 M6 positions)
    6. Tap 4× M8 (same)
    7. Chamfer all edges (same)"

4. Generates → HyperMillCodeGeneratorEngine
   "Ready to generate AC script for hyperMILL. Apply?"
```

### For hyperMILL .hmc Files (Richest Data)

When the user uploads a .hmc project file, PRISM gets EVERYTHING:
- The exact feature sequence the programmer used
- Every parameter value for every operation
- Which tools were selected and why (tool change order)
- How long it took (cycle time from simulation)
- What post-processor was used
- What stock model and WCS setup was chosen

This is the richest training data possible — it's the programmer's complete decision record.

Over time, as the shop uploads 50-100 .hmc projects, PRISM builds a **shop-specific CAD/CAM knowledge base**:
- "For mold cavities, this shop always uses D16→D10→D6→D3 tool cascade"
- "For brackets in 7075, they prefer MAXX roughing with 8% stepover"
- "For turned shafts, they always put the threading last and use G76 not G92"

This knowledge makes PRISM's recommendations match the shop's actual practices.

### Milestone Addition (HM-KC Track)

| Phase | Title | Units | Sessions |
|-------|-------|-------|----------|
| **KC-10** | CAD Learning Pipeline | 5 | 3 |
| U-KCL01 | HMCProjectParserEngine (XML → FeatureSequenceRecord) | | |
| U-KCL02 | STEPFeatureExtractorEngine (STEP → inferred sequence) | | |
| U-KCL03 | PartSimilaritySearchEngine (geometric similarity index) | | |
| U-KCL04 | FeatureSequenceReplicatorEngine (adapt + generate) | | |
| U-KCL05 | CADSequenceLearningEngine (aggregate patterns across parts) | | |

### WHY THIS IS THE BACKBONE

Every PRISM recommendation traces back to this parameter catalog:
- "What stepdown should I use?" → `passes.stepdown` parameter → KienzleForceEngine computes safe DOC → deflection check → recommendation
- "Is this feed safe?" → `cutting_data.feed_rate` parameter → force check → machine limit check → hook fires if unsafe
- "Optimize this operation" → iterate ALL parameters for this cycle type → physics-optimal value for each → inject via AC script

Without comprehensive parameter coverage, PRISM can only advise on the 10-20 parameters it knows about. With full coverage, PRISM can optimize EVERY field in EVERY operation — that's the moat.

### IMPLEMENTATION STRATEGY

This is too large for a single milestone. It should be a **dedicated knowledge-capture track (HM-KC)** running parallel to the HM-REV integration track:

| Phase | Focus | Skills | Scripts | Hooks | Sessions |
|-------|-------|--------|---------|-------|----------|
| KC-1 | CAD fundamentals (sketch, solid, heal, import) | 40 | 40 | 10 | 3 |
| KC-2 | Fixture + setup (workholding, stock, WCS, clearance) | 30 | 30 | 12 | 2 |
| KC-3 | CAM core (drilling, 2D, 3D roughing/finishing) | 45 | 45 | 15 | 3 |
| KC-4 | CAM advanced (5-axis, turning, mill-turn, probing) | 50 | 50 | 15 | 3 |
| KC-5 | Simulation + NC (VIRTUAL Machining, post, delivery) | 25 | 25 | 9 | 2 |
| KC-6 | Electrode + mold + medical domain specialties | 25 | 25 | 8 | 2 |
| KC-7 | Integration + orchestration (full-job skills, batch workflows) | 30 | 30 | 12 | 2 |
| KC-8 | Validation + testing (verify all 683 artifacts work) | 46 | 46 | 20 | 3 |
| **TOTAL** | | **291** | **291** | **101** | **20** |

### RELATIONSHIP BETWEEN 3 TRACKS

**HM-REV** = Integration wiring (connect 11 engines to pipeline, build bridges, fix bugs)
**HM-KC** = Knowledge capture (generate 683 artifacts from training manuals + cycle catalog)
**HM-PLUGIN** = Proprietary PRISM plugin/add-in built directly INTO hyperMILL (see below)

All three share the same engine layer. HM-KC generates the operator-facing skills, HM-REV builds the infrastructure, HM-PLUGIN delivers it as a native hyperMILL experience.

## PROPRIETARY PRISM PLUGIN FOR hyperMILL

User requirement: "mix our own engine and tech into their system, if its possible to build a direct plugin/addin that only we can use"

### hyperMILL Add-In Architecture (What's Possible)

hyperMILL supports add-ins through **Automation Center (AC)**, which provides:
1. **Python scripting API** — full access to CAD/CAM/simulation/NC generation
2. **Plugin Manager** — register persistent add-ins that appear in hyperMILL's toolbar
3. **COM/API bridge** — .NET and Python access to hyperMILL's internal objects
4. **Custom UI panels** — HTML/JS panels inside hyperCAD-S (similar to Fusion 360 palettes)

`HyperMillACAddInGenerator` (E1145, already exists) generates AC Python plugins with:
- Toolbar buttons (S/F Optimizer, Tool Data Import, Material Lookup)
- HTTP client to PRISM MCP server at localhost
- Plugin registration via AC Plugin Manager

### PRISM Plugin Architecture

```
┌─────────────────────────────────────────────────┐
│              hyperCAD-S / hyperMILL              │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │         PRISM PLUGIN (AC Add-In)         │    │
│  │                                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐│    │
│  │  │ Physics   │  │ Quality  │  │ Learn  ││    │
│  │  │ Panel     │  │ Panel    │  │ Panel  ││    │
│  │  └─────┬─────┘  └─────┬────┘  └───┬───┘│    │
│  │        │              │            │     │    │
│  │        └──────────┬───┘────────────┘     │    │
│  │                   │                      │    │
│  │           HTTP → localhost:18361          │    │
│  └───────────────────┬──────────────────────┘    │
│                      │                           │
└──────────────────────┼───────────────────────────┘
                       │
              ┌────────▼────────┐
              │  PRISM MCP Server│
              │  (Node.js)      │
              │                 │
              │  1,307 engines  │
              │  38-stage PPP   │
              │  Kienzle/SLD    │
              │  Bayesian learn │
              │  95K tools      │
              │  910 machines   │
              │  2,957 materials│
              └─────────────────┘
```

### Plugin Panels (What the Programmer Sees Inside hyperMILL)

**Panel 1: PRISM Physics Advisor**
- Before each operation: shows Kienzle force, deflection, SLD safe RPM zones
- Recommended S/F with confidence band (P90)
- Material-specific warnings (Ti thermal, Inconel work hardening, hardened steel CBN routing)
- "Apply to Operation" button → injects optimized params into active hyperMILL cycle

**Panel 2: PRISM Quality Gate**
- Per-operation: surface integrity prediction (Ra, residual stress, white layer risk)
- Collision pre-check status (PRISM runs before hyperMILL simulation)
- Setup sheet preview with physics-backed warnings
- FAI plan generation button

**Panel 3: PRISM Learning Dashboard**
- Override tracking ("you changed feed from 650 to 580 — what makes this better?")
- Shop knowledge tips surfaced per material/operation context
- Historical performance for this material/machine/tool combo
- Bayesian prior confidence for current recommendation

**Panel 4: PRISM Post Enhancer**
- After NC generation: "Enhance with per-block variable S/F?" button
- Side-by-side comparison (original vs PPP-optimized)
- Cycle time delta, peak force comparison, tool life improvement estimate
- Controller-specific verification status

**Panel 5: PRISM Tool Crib**
- Search 95K tool catalog from within hyperMILL
- "Import to TDB" button → exports selected tools to hyperMILL's tool database
- Tool availability check against shop crib inventory
- Collision geometry preview for holder + tool assembly

### Plugin Build Milestones (HM-PLUGIN track)

| MS | Title | Units | Sessions | Deliverable |
|----|-------|-------|----------|-------------|
| PLG-1 | AC Python Plugin Skeleton | 4 | 2 | Plugin registered in AC, toolbar buttons, HTTP client to PRISM |
| PLG-2 | Physics Advisor Panel (HTML/JS) | 5 | 2 | Kienzle + SLD + deflection panel with "Apply" button |
| PLG-3 | Quality Gate Panel | 4 | 2 | Surface integrity + collision pre-check + FAI preview |
| PLG-4 | Post Enhancer Panel | 4 | 2 | PPP per-block S/F with side-by-side comparison |
| PLG-5 | Tool Crib Panel + TDB Import | 4 | 2 | 95K search + .hmt import + inventory check |
| PLG-6 | Learning Dashboard Panel | 4 | 2 | Override capture + tips + Bayesian confidence |
| PLG-7 | Auto-Optimize Pipeline | 5 | 2 | Full auto: analyze setup → optimize all ops → enhance NC → generate quality package |
| PLG-8 | Plugin Hardening + Licensing | 4 | 2 | Error handling, offline mode, license check, obfuscation |

**Totals: 8 milestones, 34 units, 16 sessions**

### Plugin Security (Proprietary Protection)
- Plugin code is compiled Python (.pyc or Cython .pyd) — not readable source
- License check against PRISM server before activation
- Machine fingerprint binding (same RS256 JWT as F360)
- Encrypted HTTP between plugin and PRISM server (localhost TLS)
- Plugin distributed as signed .zip, not open source

### What Makes This Plugin Unique (Competitive Moat)
1. **Only plugin in the market that brings per-block physics to hyperMILL** — hyperMILL itself doesn't do this
2. **Only plugin with Bayesian learning from operator overrides** — knowledge accumulates
3. **Only plugin with 95K tool catalog + collision geometry searchable inside hyperMILL**
4. **Only plugin with SLD chatter prediction integrated into cycle parameter selection**
5. **Only plugin with white layer / surface integrity warnings for aerospace**

### Prerequisites
- HM-REV MS1 (engine wiring) must be complete — plugin calls wired engines
- HM-REV MS9 (AC Bridge) provides the HTTP companion server the plugin connects to
- HM-KC KC-3 (CAM core skills) provides the knowledge the Physics Advisor references

## COMPLETE TRACK STRUCTURE (3 parallel tracks)

```
HM-REV (14 milestones, 75 units)     — Infrastructure + integration wiring
HM-KC (8 phases, 683 artifacts)      — Skills + scripts + hooks for every command
HM-PLUGIN (8 milestones, 34 units)   — Proprietary add-in panels inside hyperMILL

TOTAL: 30 milestones across 3 tracks
```

### Can We Build Without USB Key?
| Track | Without USB Key | With USB Key |
|-------|----------------|-------------|
| HM-REV | MS0-MS12 (97%) | MS13 E2E testing only |
| HM-KC | KC-1 through KC-7 (87%) | KC-8 validation |
| HM-PLUGIN | PLG-1 through PLG-7 (87%) | PLG-8 hardening + live testing |

## NEXT STEPS
1. Exit plan mode
2. Write HM-REV roadmap document (14 milestones, integration)
3. Write HM-KC roadmap document (8 phases, 683 artifacts)
4. Write milestone envelopes for both tracks
5. Update roadmap-index.json
6. Write handoff

## RGS Pipeline Status
- Stages 1-9: COMPLETE (Brief, Audit, Knowledge Sources, Scope, Phases, Units, Forge-Triple, Enforcement, Dependencies)
- Full roadmap document: `H:\prism\mcp-server\data\docs\roadmap\FUSION360-FULL-CAPABILITIES-ROADMAP.md`
- **Previous 20-role scrutiny** (loop 1): avg 83.5/100, all dims >=72, 3 loops, fixes applied
- **NEW 20-role scrutiny** (loop 2, expanded scope): avg 46/100 — MAJOR GAPS FOUND
- Milestone envelopes: COMPLETE (F360-FULL-MS{1-8}.json on disk)

## 20-ROLE EXPANDED SCRUTINY RESULTS (Loop 2)

### Consolidated Scorecard (20 Roles)

| # | Role | Composite | Worst Gap |
|---|------|-----------|-----------|
| 1 | Master CNC Programmer | 44/100 | CAD workflow = 0, 5-axis output = 0 |
| 2 | Mold & Die Maker | ~25/100 | No cavity/core, no electrode in F360, no pre-harden workflow |
| 3 | Aerospace Process Engineer | 49/100 | Surface integrity engines exist but 100% disconnected from F360 |
| 4 | CAD/CAM Application Engineer | 44/100 | Roadmap is CAM-only; CAD engines exist but unwired |
| 5 | Medical Device Machinist | 11/100 | No biocompat materials, no ISO 13485/DHR, no Swiss coverage |
| 6 | Fixture Design Specialist | 57/100 | Engines exist but not wired to F360 MS5; no sacrificial tabs |
| 7 | Post-Processor Specialist | 62/100 | Fanuc 0i/30i conflated (crash risk), no G91 G28 Z0 safe start |
| 8 | Toolpath Strategy Expert | 67/100 | TYPE_PRIORITY inverted (drill before rough), no barrel cutter, no HFM |
| 9 | Defense Manufacturing | 29/100 | No ITAR G-code marking, no rifling, no AR500/RHA materials |
| 10 | Automotive Production | 51/100 | No Control Plan, no CGI/ADI materials, no SPC offset compensation |
| 11 | Heavy Machinery Engineer | 42/100 | No floor borer model, no facing head, no HAZ machining |
| 12 | Automation Equipment | 65/100 | Good ISO 286 fits; no match-machining, no pre-anodize Ra calc |
| 13 | Machine Shop Owner | 34/100 | No onboarding, no multi-user, no offline/air-gap, no ROI dashboard |
| 14 | Fusion 360 API Expert | 45/100 | **MS7 toolpath injection IMPOSSIBLE via API**; 25-40 params not 400+ |
| 15 | Security Engineer | 46/100 | Auth uses HS256 not RS256, CORS wildcard in dev, license trivially bypassable |
| 16 | QA Test Engineer | 41/100 | No perf enforcement, no failure mode tests, no regression pipeline |
| 17 | Process Planner | 54/100 | No heat treatment routing split, no face_mill op type, no routing sheet |
| 18 | Turning Specialist | 61/100 | No material-driven insert selection, no bar feeder automation M-codes |
| 19 | GD&T / Metrology Expert | 47/100 | GD&T extracted but not wired to CAM decisions, no DMIS output |
| 20 | Shop Floor Machinist | 54/100 | No setup sheets, no G-code comments explaining S/F changes |

**Overall Average: 46/100**

### TOP 10 CRITICAL GAPS (Blocking)

1. **CAD Workflow Missing** — Roadmap is CAM-only. No print-to-CAD, no sketch plane intelligence, no finishing allowance application. PRISM engines exist (SketchEngine, PrintToGeometryEngine, Fusion360CodeGeneratorEngine, StockAllowanceEngine) but are unwired.

2. **MS7 Toolpath Injection IMPOSSIBLE** — Fusion 360 API has no `Toolpath.addMove()` or equivalent. Must re-scope to "PRISM-generated G-code via external post-processor" not "XYZ injection into Fusion CAM engine."

3. **"400+ params" claim is FALSE** — Fusion exposes 25-40 settable params per operation, ~200-300 unique across all types. Correct the claim.

4. **5-axis Toolpath Output Missing** — ToolpathSegment schema has {x,y,z} only — no I/J/K tool axis vector, no A/B/C rotary. Impellers/blisks/molds impossible.

5. **Operation Ordering INVERTED** — TYPE_PRIORITY puts drill=1, rough=4. Must be: face=1, rough=2, drill=6. No `face_mill` operation type exists.

6. **Heat Treatment Not in Process Plan** — No RoutingStep concept. Pre-harden → heat treat → post-harden split is absent. HeatTreatmentResponseEngine exists but is completely isolated.

7. **Surface Integrity NOT Wired to F360** — ResidualStressPredictionEngine, WhiteLayerDetectionEngine, SurfaceIntegrityEngine all exist but are 100% disconnected from the Fusion workflow. Flight-critical parts get no warning.

8. **Auth is HS256 Not RS256** — The roadmap says RS256 but the code uses HS256. License bypass is trivial (user-writable JSON, no machine fingerprint, no .pyd compiled enforcement).

9. **No Setup Sheets** — Not mentioned anywhere. Setup sheet is how programmer communicates to operator. Without it, the software is incomplete for shop floor use.

10. **No Multi-User / Offline / Air-Gap** — Single-user JWT only. No operator accounts, no shift handoff, no offline token model. Blocks all defense shops and most multi-person shops.

### REQUIRED ROADMAP CHANGES

#### A. Add New Milestones (Pre-MS1)

**F360-FULL-MS0: Print-to-CAD + Process Planning** (NEW — 6 units, 3 sessions)
- U-FPRN01: Print/Drawing Ingestion (wire BlueprintOCREngine → PrintToGeometryEngine → Fusion360CodeGeneratorEngine)
- U-FPRN02: Sketch Plane Selection Intelligence (wire CADDrawingKnowledgeEngine rules)
- U-FPRN03: Finishing Allowance Application (wire StockAllowanceEngine → Fusion direct-edit API offset)
- U-FPRN04: Process Plan Generation (wire GenerativeProcessEngine with face_mill + heat treat routing)
- U-FPRN05: GD&T Interpretation for CAM (wire BlueprintOCREngine → new GDTInterpretationEngine → sequencer)
- U-FPRN06: Setup Sheet + Routing Sheet Generation (wire SetupSheetEngine + RoutingSheetEngine)

#### B. Fix Existing Milestones

**MS1 Fixes:**
- Switch auth from HS256 → RS256 (the code, not just the roadmap)
- Add machine fingerprint binding
- Add operator accounts (multi-user JWT with role claims)
- Add offline token model (embedded public key, 14-day grace)
- Force JWT secret generation at install

**MS3 Fixes:**
- Correct "400+ params" claim to "25-40 settable per operation, ~200-300 unique total"
- Add material-class override pathway for ISO Group H (hard milling parameter ceilings)

**MS4 Fixes:**
- Note: holder mesh export not available via Fusion API — use tool geometry + calculated holder OD as collision proxy

**MS5 Fixes:**
- Wire surface integrity engines (ResidualStress, WhiteLayer, SurfaceIntegrity) into per-op physics analysis
- Wire WorkholdingVerificationEngine, SoftJawProfileEngine, FixtureDesignEngine from Fusion setup bodies
- Add setup sheet PDF generation from setup intelligence output
- Add G-code inline comments explaining S/F changes

**MS6 Fixes:**
- Add spindle RPM ramp-rate gate (prevent overspeed step changes)
- Add G21/G20 unit declaration to safe-start blocks
- Split Fanuc dialect into 0i/16i/30i variants (prevent G5.1 alarm on 0i)
- Add G91 G28 Z0 as first line of every safe-start block

**MS7 Fixes:**
- RE-SCOPE: "PRISM-generated G-code via external .cps post-processor" not "XYZ injection"
- Add 5-axis output: extend ToolpathSegment with {i,j,k} tool axis vector + {a,b,c} rotary positions
- Add mill-turn kinematic support (C-axis, Y-axis, B-axis, sub-spindle sync)
- Fix TYPE_PRIORITY: face=1, rough=2, semi=3, drill=6, bore=7, thread=9, finish=10

**MS8 Fixes:**
- Expand test matrix from 4 unnamed strategies to 8+ named strategies
- Add multi-setup integration test
- Add performance test suite (CI gate: <2ms/block, <500MB memory)
- Add failure mode tests (bridge-down, Fusion crash, license expiry, partial G-code)
- Add G-code syntax validator to test harness
- Add physics constant regression suite (pin canonical values in CI)

#### C. Domain-Specific Modules (Post-MS8, Industry Tracks)

These are NOT blockers for initial launch but are required for industry-specific customer engagement:

- **F360-MOLD-MS0**: Cavity/core classifier, hardened steel finishing, electrode extraction, EDM pipeline wiring
- **F360-AERO-MS0**: Surface integrity gates, AS9102 FAI wiring, NADCAP PCP, deburr planning
- **F360-MED-MS0**: Biocompatible materials, ISO 13485 DHR, Swiss-type support, passivation
- **F360-DEF-MS0**: ITAR G-code marking, program security, AR500/RHA materials, rifling
- **F360-AUTO-MS0**: Control Plan engine, CGI/ADI materials, SPC offset compensation, takt targeting

### NEXT STEPS (in order)

1. Apply all "Fix Existing Milestones" changes to the roadmap document
2. Add F360-FULL-MS0 (Print-to-CAD + Process Planning) to the roadmap
3. Register all milestones (now MS0-MS8 = 9 milestones) in roadmap-index.json
4. Add Feature Cascade blocks to MS0-MS8
5. Begin execution at F360-FULL-MS0 (the new first milestone)

## Remaining Steps (execute NOW)
1. ~~Write 8 milestone JSON envelopes~~ — DONE
2. Update `H:\prism\mcp-server\data\roadmap-index.json` — append 8 F360-FULL entries to milestones array
3. Add Feature Cascade blocks to MS2-MS8 in roadmap doc (MS1 already has one)
4. Begin execution at F360-FULL-MS1 (License Infrastructure + Tier Gating)

## Step 2 Detail: roadmap-index.json entries
Append these 8 entries to the `milestones` array in `H:\prism\mcp-server\data\roadmap-index.json`:
```json
{"id":"F360-FULL-MS1","title":"License Infrastructure + Tier Gating","track":"F360-FULL","dependencies":["F360-AP-MS5"],"status":"not_started","total_units":3,"completed_units":0,"sessions":"1","envelope_path":"milestones/F360-FULL-MS1.json"},
{"id":"F360-FULL-MS2","title":"Free Tier Panel (PRISM Lite)","track":"F360-FULL","dependencies":["F360-FULL-MS1"],"status":"not_started","total_units":3,"completed_units":0,"sessions":"1","envelope_path":"milestones/F360-FULL-MS2.json"},
{"id":"F360-FULL-MS3","title":"Comprehensive CAM Parameter Mapping","track":"F360-FULL","dependencies":["F360-FULL-MS1"],"status":"not_started","total_units":6,"completed_units":0,"sessions":"3","envelope_path":"milestones/F360-FULL-MS3.json"},
{"id":"F360-FULL-MS4","title":"Full Tool Library with Collision Geometry","track":"F360-FULL","dependencies":["F360-FULL-MS1"],"status":"not_started","total_units":4,"completed_units":0,"sessions":"2","envelope_path":"milestones/F360-FULL-MS4.json"},
{"id":"F360-FULL-MS5","title":"Setup Intelligence + Post-Processor + Learning","track":"F360-FULL","dependencies":["F360-FULL-MS3","F360-FULL-MS4"],"status":"not_started","total_units":6,"completed_units":0,"sessions":"3","envelope_path":"milestones/F360-FULL-MS5.json"},
{"id":"F360-FULL-MS6","title":"Per-Block Variable Speed/Feed","track":"F360-FULL","dependencies":["F360-FULL-MS5"],"status":"not_started","total_units":4,"completed_units":0,"sessions":"2","envelope_path":"milestones/F360-FULL-MS6.json"},
{"id":"F360-FULL-MS7","title":"Internal Toolpath Generation + Multi-Setup","track":"F360-FULL","dependencies":["F360-FULL-MS6"],"status":"not_started","total_units":6,"completed_units":0,"sessions":"3","envelope_path":"milestones/F360-FULL-MS7.json"},
{"id":"F360-FULL-MS8","title":"Integration Testing + Launch","track":"F360-FULL","dependencies":["F360-FULL-MS1","F360-FULL-MS2","F360-FULL-MS3","F360-FULL-MS4","F360-FULL-MS5","F360-FULL-MS6","F360-FULL-MS7"],"status":"not_started","total_units":4,"completed_units":0,"sessions":"2","envelope_path":"milestones/F360-FULL-MS8.json"}
```
Also update `total_milestones` from 322 to 330.

## Step 3 Detail: Feature Cascade blocks
Add Feature Cascade blocks to MS2-MS8 in the roadmap doc. Each block lists what downstream milestones are unlocked when that milestone completes. Read the roadmap doc's MS1 Feature Cascade as the template format.

## Step 4: Begin F360-FULL-MS1
After steps 2-3, read the MS1 session block from the roadmap doc and begin executing:
- U-FLIC01: LicenseTierGateEngine (RS256 JWT, tier enum, feature flag map)
- U-FLIC02: Python add-in tier gating (decorator, endpoint gates, panel visibility)
- U-FLIC03: TypeScript bridge tier checks (per-method enforcement)

## Verification
- `npx tsc --noEmit` — 0 new errors (4 pre-existing in ThermalWearCouplingEngine OK)
- `npx vitest run` — no regressions
- roadmap-index.json: total_milestones=330, F360-FULL entries present
- Feature Cascade blocks present in MS2-MS8

---

## 3-Tier Model

| Feature | Free (Lite) | Pro | Ultimate |
|---------|------------|-----|----------|
| Speed/feed calculator | Basic (Kienzle T1) | Full physics (8 resolvers, Monte Carlo) | Same |
| Machine/tool/holder DB | Search only | Full access (95K tools, 910 machines) | Same |
| Fusion CAM tab injection | None | ALL tabs (Tool/Geometry/Heights/Passes/Linking) | Same |
| Toolpath strategies | None | 762 strategies → Fusion params | Internal PRISM toolpaths when better |
| Post-processor | None | Optimized G-code output | Per-block variable S/F |
| Collision geometry | None | Full tool+holder+shaft assembly | Same + pre-CAM collision gating |
| Setup handling | None | Read + suggest + warn | Full control + multi-setup orchestration |
| Learning | None | User preference learning | Shop-wide fleet learning + cloud CAM indexing |

---

## Phase 1: Foundation (Milestones F-01 to F-02)

### F-01: License Infrastructure + Tier Gating
**Files:** `fusion360_api_server.py`, new `LicenseTierGateEngine.ts`, `Fusion360LiveBridgeEngine.ts`

- `LicenseTierGateEngine` (~400 LOC): tier enum (`free`/`pro`/`ultimate`), feature flag map, JWT validation (offline with online activation), machine fingerprint binding
- Python add-in tier gating: `/license/validate` endpoint, `_check_tier(required_tier)` decorator on all endpoints, UI panel visibility per tier
- TypeScript bridge: `setTier()`, per-method tier checks in `Fusion360LiveBridgeEngine`
- License storage: `%APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/license.json`
- Dual enforcement: Python gates UI + endpoints, TypeScript gates API methods

### F-02: Free Tier Panel (PRISM Lite)
**Files:** new `prism_panel.py`, `prism_api_client.py`, `prism_ui_state.py` in add-in dir

- Fusion 360 panel with material selector (ISO groups + common materials)
- Basic S/F calculator: SpeedFeedOrchestratorEngine at Tier 1 (single-pass Kienzle, chip thinning, no convergence)
- Tool search from 95K catalog (view-only, no export to Fusion library)
- Connection status indicator (bridge health check)
- Matches Fusion's dark theme

---

## Phase 2: Pro Tier (Milestones F-03 to F-05)

### F-03: Comprehensive Fusion CAM Parameter Mapping (HARDEST MILESTONE)
**Files:** `fusion360_api_server.py` (+800 LOC), new `fusion360-cam-params.ts`, new `FusionCAMParameterInjectionEngine.ts` (~600 LOC)

**Problem:** Current `CAM_PARAM_MAP` has 9 entries. Fusion operations have 400+ parameters across 5 tabs.

**Approach:**
1. **Runtime parameter discovery**: Use `/execute` endpoint to enumerate `operation.parameters` on a live Fusion instance for each of the 25 operation types. Cache the full parameter surface in `fusion360-cam-params.ts`
2. **Expand CAM_PARAM_MAP** in Python add-in covering ALL 5 tabs:
   - **Tool tab** (9 params): spindle speed, surface speed, feed/tooth, feed/rev, ramp feed, plunge feed, lead-in/out feed, retract feed, coolant mode
   - **Geometry tab** (6+ params): machining boundary, tool containment, contact point, stock contours, rest machining source, additional offset
   - **Heights tab** (10+ params): clearance height, retract height, feed height, top height, bottom height, offset modes per height
   - **Passes tab** (15+ params): optimal load, stepdown, stepover, smoothing, direction (climb/conventional), ramp type/angle, multiple depths, finishing passes, stock-to-leave (axial/radial), tolerance
   - **Linking tab** (8+ params): retract policy, transition type, lead-in/out radius/angle, entry method, keepdown, stay-down distance
3. **FusionCAMParameterInjectionEngine**: maps PRISM's 762 strategy records → Fusion parameter payloads, strategy-aware (adaptive params differ from contour params), validates against Fusion constraints
4. **New endpoints**:
   - `GET /cam/operation/params` — read ALL current params from an existing operation (for "read user setup")
   - `GET /cam/operations` — list all operations with type + param summaries
   - `POST /cam/operation/optimize` — inject PRISM-optimized params into existing operation

### F-04: Full Tool Library with Collision Geometry
**Files:** `FusionToolExportEngine.ts` (+300 LOC), `fusion360_api_server.py` (+200 LOC)

**Currently exported:** DC, SFDM, LCF, OAL, NOF, RE, HA, holder body (DC/LB/LH), shaft segments, start values per ISO group

**Add these missing fields (data exists in PRISM registries, just not exported):**
- **Drills:** point angle, web thickness, margin width, coolant through-hole diameter
- **Inserts:** IC (inscribed circle), thickness, lead angle, approach angle, nose radius, chipbreaker geometry
- **All tools:** taper angle, rake angle (axial/radial), relief angle, edge radius/honed edge prep, bearing length
- **Holders:** bore range, runout (TIR) at 4xD, balance grade G2.5/G6.3, max RPM, pull stud type, clamping torque
- **Assembly:** `POST /tool-import-assembly` endpoint — imports tool + holder + shaft as complete collision assembly with accurate gauge length computation

**Collision pre-check:** Wire `CollisionEngine` (2,526 LOC SweptVolumeCollision) to verify tool clearance BEFORE toolpath generation. New `POST /cam/collision-precheck` endpoint takes tool assembly + stock + fixture geometry and returns clearance report.

### F-05: Setup Intelligence + Post-Processor + Learning
**Files:** `fusion360_api_server.py` (+400 LOC), new `FusionUserPreferenceLearningEngine.ts` (~500 LOC)

**Setup read-back + analysis:**
- `GET /cam/setup/full` — reads complete setup: stock dimensions, WCS origin, fixture bodies, model bodies, all operations
- `GET /cam/setup/analysis` — PRISM analyzes the setup and returns:
  - Physics scores per operation (force ratio, deflection %, thermal risk, tool life estimate)
  - Warnings: "radial force exceeds clamping at op 3", "no finishing pass after roughing", "wrong tool for this material"
  - Suggestions: "reduce stepdown from 3mm to 2.1mm to stay under deflection limit"

**Post-processor wiring (Pro level):**
- `POST /cam/post-optimize` — Fusion generates G-code via `/cam/post`, then PRISM reads output, runs PostProcessorPipelineEngine (38 stages), writes optimized version alongside original
- Operation-level S/F optimization (not per-block yet — that's Ultimate tier)
- Safe move validation, arc optimization, redundant code removal

**User preference learning:**
- When user modifies PRISM-suggested params: detect delta via `GET /cam/operation/params` before/after
- Ask politely: "I noticed you changed stepdown from 2.1mm to 2.5mm — what makes this better for your setup?" (Fusion dialog or panel prompt)
- Store override keyed by `{material}_{operation_type}_{tool_type}_{machine}` with context
- Wire to `SelfLearningCAMEngine` Bayesian prior updating
- Decay weighting: recent overrides weighted higher, old ones fade
- Feed into tribal knowledge system (3,700+ tips)

---

## Phase 3: Ultimate Tier (Milestones F-06 to F-07)

### F-06: Per-Block Variable Speed/Feed
**Files:** `fusion360_api_server.py` (+300 LOC), `PostProcessorPipelineEngine.ts` (wiring)

**Flow:**
1. Fusion generates G-code with constant S/F
2. New `GET /cam/toolpath/engagement` — extracts per-move ae/ap data from Fusion toolpath geometry
3. PostProcessorPipelineEngine Phase 2 (block-by-block) re-computes S/F per block:
   - Kienzle force per actual engagement geometry
   - RPM shifted off SLD peaks (chatter avoidance)
   - Feed reduced in thin walls / deep pockets (thermal compensation)
   - Deflection-compensated toolpath offsets
4. `POST /cam/post-perblock` orchestrates the complete flow → writes final G-code with variable S/F
5. Side-by-side comparison: original vs optimized (cycle time, peak force, min tool life)

### F-07: Internal Toolpath Generation + Multi-Setup
**Files:** new `PRISMToolpathKernelEngine.ts` (~1200 LOC), new `ToolpathComparisonEngine.ts` (~400 LOC), `AutoProgramOrchestratorEngine.ts` (+600 LOC)

**Internal toolpath algorithms** (wire existing `NovelToolpathEngine` 6 algorithms to produce actual coordinate sequences):
- TGAR: variable-ae spiral from temperature model
- HRAF: SLD-aware RPM variation along path
- CFSF: ae variation for constant cutting force
- PTDC: toolpath offset by predicted deflection
- VCER: optimized trochoidal for chip ejection
- Plus: adaptive clearing with physics-optimal engagement

**Toolpath comparison engine:**
- Compare PRISM-generated vs Fusion's toolpath on: cycle time, peak Fc, max deflection, predicted Ra, estimated tool life
- Only replace when PRISM is measurably better (>5% cycle time reduction OR >15% tool life improvement OR tighter tolerance compliance)
- User ALWAYS sees the comparison and explicitly approves replacement

**Hybrid execution model:**
- Fusion handles: setup context, fixture, WCS, stock definition, simulation environment
- PRISM handles: toolpath coordinates + per-block S/F for selected operations
- Output: G-code emitted directly via PostProcessorPipelineEngine (20 controller dialects)

**Multi-setup orchestration:**
- Datum chain planning across setups (Monte Carlo tolerance stack)
- Thermal sequencing (roughing ops across all setups first, then finishing)
- Tool sharing optimization (minimize tool changes across setups)
- Fixture planning: tombstone/pallet layout, flip orientation, approach clearance

---

## Phase 4: Polish + Launch (Milestone F-08)

### F-08: Integration Testing + Documentation + Installer
- Test matrix: 3 tiers x 5 ISO groups x 4 strategy types x 3 machine types = 180 cases
- Golden comparison: PRISM-optimized vs Fusion defaults (+/-10% S/F, +/-15% cycle time targets)
- Auto-installer: .msi or Fusion Add-In store submission
- Per-tier onboarding flow
- API documentation for each endpoint

---

## Milestone Dependencies

```
F-01 (License) ──────────────────────────────┐
F-02 (Free Panel) ← F-01                     │
F-03 (CAM Params) ← F-01                     │
F-04 (Tool Collision) ← F-01                 ├─→ F-08 (Launch)
F-05 (Setup + Learning) ← F-03, F-04         │
F-06 (Per-Block S/F) ← F-05                  │
F-07 (Internal Toolpaths) ← F-06             │
```

## Critical Files

| File | Role | Milestones |
|------|------|-----------|
| `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` | Python add-in (all endpoints) | ALL |
| `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` | TypeScript bridge | ALL |
| `mcp-server/src/engines/FusionToolExportEngine.ts` | Tool export + collision geometry | F-04 |
| `mcp-server/src/engines/AutoProgramOrchestratorEngine.ts` | 10-stage pipeline | F-03, F-05, F-07 |
| `mcp-server/src/engines/PostProcessorPipelineEngine.ts` | 38-stage post-processor | F-05, F-06 |
| `mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` | Physics hub (2,851 LOC) | F-02, F-05, F-06 |
| New: `FusionCAMParameterInjectionEngine.ts` | Strategy → Fusion param mapping | F-03 |
| New: `LicenseTierGateEngine.ts` | Tier enforcement | F-01 |
| New: `FusionUserPreferenceLearningEngine.ts` | Override learning | F-05 |
| New: `PRISMToolpathKernelEngine.ts` | Internal toolpath generation | F-07 |
| New: `ToolpathComparisonEngine.ts` | PRISM vs Fusion comparison | F-07 |

## Verification

- **Per milestone:** `npx tsc --noEmit` (0 errors), `npx vitest run` (0 failures)
- **Integration:** Live Fusion 360 instance with PRISMBridge add-in running on `localhost:18360`
- **Collision test:** Export tool assembly → verify Fusion shows correct holder/shaft/tool geometry in simulation
- **Parameter injection:** Create adaptive operation → verify ALL Passes tab params match PRISM strategy values
- **Per-block S/F:** Compare original vs optimized G-code line-by-line, verify Kienzle F values are correct
- **Learning:** Modify a PRISM suggestion → verify override stored → verify next run incorporates learned value

## Estimated Scope
- ~4,000 LOC new engines (TypeScript)
- ~1,700 LOC Python add-in additions
- ~600 LOC data/config files
- Modifies 5 existing engines
- 180+ test cases
