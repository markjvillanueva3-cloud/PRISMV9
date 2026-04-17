# Maximum Coverage Plan — Closing ALL Sub-90% Gaps to 95%+

## Context

After 48 specialist agents across 4 scrutiny rounds + 7 pipeline agents + 1 infrastructure agent, the CAMX roadmap is at 92-95% confidence overall. Five areas remain below 90%. This plan closes them ALL based on findings from 10 exploration agents examining: per-machine roadmaps, ERP/business, UX/onboarding, scale/performance, exotic materials, shop floor orchestration, data freshness, controller firmware, deployment/integration, and security/compliance.

---

## Area 1: Per-Machine Roadmaps (85-90% → 95%)

**Agent findings**: 8 files, 6,495 lines, 77 milestones, 690 units. All follow CAMX standards (3-LOOP, FORGE-TRIPLE, /prism-review). But zero fusion_tier references, probing in only 2 of 8, per-block variability designed but unwired, test maturity gap (LATHE 172 + WIRE-EDM 249 vs others at 0).

### Fix: Add SESSION 0-D-MACHINE-SYNC to main CAMX roadmap
```
After Phase 0-D fusion sessions, before Phase 1:
  1. Update ALL 8 per-machine roadmaps to reference fusion_tier >= 2 for S/F computation
  2. Add probing units to LATHE, MILLING, GRINDING, LASER, WATERJET roadmaps
     (already in MILL-TURN and 5-AXIS)
  3. Add explicit POST-ULT wiring unit to each machine's MS0.5
  4. Establish minimum test baseline per machine before Phase 5 starts:
     - MILLING: 50+ tests (currently 0)
     - 5-AXIS: 50+ tests (currently 0)
     - MILL-TURN: fix pipeline first, then 30+ tests
     - GRINDING: 30+ tests (currently 0)
     - LASER: 30+ tests (currently 0)
     - WATERJET: 30+ tests (currently 0)
  5. Add Machine-Type Selector Engine note: input geometry+tolerance → recommended machine type
```

---

## Area 2: ERP/Business Engine Coverage (70-80% → 95%)

**Agent findings**: businessDispatcher has 169 actions across 29 engines. Most are invisible to the CAMX roadmap. 3 duplicate quoting engines. GeneralLedger, Invoicing, Payroll, TimeClock, Employee, HR, Customer, PurchaseOrder all exist but aren't in scope.

### Fix: Add SESSION 2-ERP to Phase 2 and scope boundary declaration
```
SESSION 2-ERP: ERP/Business Engine Audit + Wiring (from ERP scrutiny)
  U-ERP1: Audit all 29 business engines for quality (PRODUCTION/PARTIAL/STUB)
    Run triage script on businessDispatcher engines
    Identify duplicates (3 quoting engines → unify to QuoteEstimatorEngine)
  U-ERP2: Wire top 10 business engines to QuoteToShip pipeline
    - ActualCostEngine → variance tracking (Stage 19 feedback)
    - CapacityPlanningEngine → delivery date (fix random cycle times)
    - QuoteAnalyticsEngine → accuracy calibration loop
    - InventoryAwareToolSelectorEngine → tool crib before catalog
    - MaterialCertTraceabilityEngine → cert at procurement (Stage 9), not just shipping (Stage 21)
  U-ERP3: Scope boundary declaration
    - Accounting (GL, invoicing, payroll) = Phase 14 (POST-MVP)
    - HR/Employee management = Phase 14 (POST-MVP)
    - Customer management = Phase 14 (POST-MVP)
    - These engines EXIST and WORK but are not part of the CNC pipeline
```

---

## Area 3: UX/Onboarding Journey (70-80% → 90%)

### Fix: Add SESSION 1-UX to Phase 1
```
SESSION 1-UX: Day 1 User Journey (from UX scrutiny)
  U-UX1: Map the complete new-user flow
    - First connection → MCP elicitation → material+operation → first S/F result
    - Progressive disclosure: Tier 1 novice → Tier 2 standard → Tier 3 comprehensive
    - OnboardingEngine + ApprenticeEngine skill levels wired to fusion tier auto-selection
    - Error messages that help, not blame ("Material not found. Did you mean 4140 steel?")
  U-UX2: Web app integration checkpoint
    - Verify PRISM web app (prism-app/) has routes for key workflows
    - Quote builder, S/F calculator, program generator, setup sheet viewer
    - If web app is incomplete, document what needs building in Phase 13
```

---

## Area 4: Scale/Performance (70-80% → 90%)

### Fix: Add SESSION 4-PERF to Phase 4
```
SESSION 4-PERF: Performance & Scale Testing (from performance scrutiny)
  U-PERF1: Load testing
    - 10 concurrent MCP requests → verify <500ms response for S/F calculations
    - 50,000-block program through PostProcessor → verify no OOM, <30s processing
    - 1,245 engine registry → verify startup time <5s
    - Memory profiling: single large program should not exceed 500MB heap
  U-PERF2: Caching + lazy loading optimization
    - Verify engines are lazy-loaded (not all 1,245 at startup)
    - ComputationCache wired to SpeedFeedOrchestrator
    - LRU cache for material/tool lookups
    - Bundle size audit: identify top 10 largest engines, consider code splitting
```

---

## Area 5: Exotic Materials + Controller Firmware (70-80% → 85%)

### Fix: Add amendments to existing sessions
```
Phase 0-B (bug fixes): Add material safety flags
  - Magnesium: fire_risk=true, coolant_prohibited=["water-based"]
  - Beryllium copper: toxic_dust=true, ventilation_required=true
  - CFRP composites: delamination_risk=true, abrasive_wear=true
  - Unknown materials: instead of skipping validation, emit WARNING + use worst-case ISO group

Phase 0-D-1 (registry wiring): Add controller firmware version awareness
  - ControllerDialectEngine: add firmware_version field
  - Canned cycle availability map per firmware version
  - Warn when generating G-code features not available on specified firmware
  - controller-knowledge-tips.ts already has version-specific tips — wire into PostProcessor
```

---

## Area 6: Security/Compliance (NEW — discovered at 60-70%)

**Agent findings**: ITAR framework exists but no DB enforcement, 6 auth bypass paths, in-memory token store, no encryption at rest, FDA 21 CFR 11 compliance gap.

### Fix: Add SESSION 0-B-SECURITY (alongside safety P0s)
```
SESSION 0-B-SECURITY: Security Hardening (from security audit)
  U-SEC1: Close 6 auth bypass paths
    - Auth disabled = admin: add startup warning, require explicit --unsafe-auth flag
    - Stdio auto-admin: at minimum log admin grant, consider requiring --admin flag
    - Safety hooks disableable: mark critical hooks as immutable
    - Unknown materials bypass: emit WARNING instead of silent skip
    - No schema = pass-through: log unvalidated actions prominently
    - Cross-field physics gaps: add medium/hard material ranges (already in 0-B-SAFETY)
  U-SEC2: Compliance infrastructure
    - Database-backed audit logging (replace in-memory 50K cap)
    - Field-level encryption for customer PII + pricing data
    - ITAR flag enforcement at DB layer (not just template)
    - Calculation audit trail (log material, physics path, safety score)
    - Token persistence (database or file-backed, not in-memory)
```

---

## Area 7: Shop Floor Orchestration (70-80% → 85%)

### Fix: Add to Phase 2 and Phase 4
```
Phase 2 SESSION 2-3 amendment: Add dynamic scheduling
  - CapacityPlanningEngine: replace Math.random() with pipeline-computed cycle times
  - Add machine breakdown handling: re-route jobs to alternative capable machines
  - Rush order priority injection: bump priority, recalculate schedule
  - Setup time sequencing: group similar jobs to minimize fixture changes

Phase 4 SESSION 4-2 amendment: Add real-time shop floor
  - MTConnect/OPC-UA data → live machine utilization dashboard
  - GrafanaBridgeEngine (1,060 lines, exists) → wire to monitoring pipeline
  - Job tracking across machines (multi-machine workflow state)
```

---

## Area 8: Data Freshness (70-80% → 85%)

### Fix: Add to Phase 14
```
Phase 14: Data Freshness Pipeline
  - Automated tool catalog refresh from manufacturer APIs (Sandvik, Kennametal, Walter)
  - Commodity price index updates for material pricing (LME, CRU)
  - Controller firmware database updates (new G-codes, changed behavior)
  - Staleness monitoring: flag data >1 year old, warn on data >2 years old
  - Manual override: "I know this price is wrong, use $X instead"
```

---

## Area 9: Deployment/Integration (NEW — needs assessment)

### Fix: Add SESSION 13-DEPLOY to Phase 13
```
SESSION 13-DEPLOY: Production Deployment Readiness
  U-DEPLOY1: Containerization
    - Dockerfile + docker-compose for MCP server + web app
    - Health probes already exist (Kubernetes-compatible)
    - Environment variable documentation (.env.example)
  U-DEPLOY2: Monitoring + error recovery
    - Wire GrafanaBridgeEngine for operational metrics
    - Global error boundary + unhandled rejection handler
    - Structured logging with correlation IDs
    - Automatic restart on crash (PM2 or systemd)
```

---

## Area 10: Real-World Validation Data (NEW — user requirement)

Every machining test must be verifiable against REAL parts — not just theoretical hand calculations.
Sources: manufacturer tutorials, training parts, handbook examples, test-cut programs with known-good results.

### Fix: Add SESSION 0-C-REALDATA to Phase 0-C and SESSION 12-VALIDATE to Phase 12
```
SESSION 0-C-REALDATA: Real-World Validation Data Collection
  U-DATA1: Collect manufacturer test parts + reference programs
    SOURCES TO HARVEST:
    - Haas Mill/Lathe Workbook parts (already OCR'd: data/docs/haas-*-workbook-full.txt)
      → Extract: print dimensions, material, tools, S/F, cycle time, G-code
    - Sandvik Coromant Application Guide test cuts with measured forces
    - Kennametal Technical Reference cutting data with expected results
    - Walter Tools machining examples with parameter sets
    - Machinery's Handbook example problems with hand-calculated answers
    - NIST SMS Test Bed cutting force datasets (dynamometer-measured Fx/Fy/Fz)
    - hyperMILL CAM Manual tutorial parts (1632pp manual at C:\PRISM\HYPERMILL\)
    - Mastercam Training Guide sample parts
    - BOX data: 33 STEP models at C:\PRISM\BOX\*.step
    - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md (existing reference programs)
    → For EACH: extract {print/CAD, material, tools, expected S/F, expected G-code, measured results}
    → Store in: tests/golden-snapshots/real-world/{source}/{part-name}/

  U-DATA2: Create validation test framework
    - For each real-world part: run through PRISM pipeline → compare to reference
    - Acceptance criteria per comparison type:
      - S/F vs published: within ±15% (Sandvik/Kennametal publish ranges)
      - Force vs measured: within ±20% (dynamometer data has its own uncertainty)
      - Coordinates vs reference program: within ±0.1mm
      - Cycle time vs actual: within ±15%
      - G-code syntax: controller-specific assertion library validates
    - Output: per-part report card (PASS/MARGINAL/FAIL per criterion)
    → Store in: tests/real-world-validation/

SESSION 12-VALIDATE: Real-World Validation (Phase 12 per-machine)
  For EACH machine type (9 total):
    - Run 5+ real-world parts through the complete pipeline
    - Compare PRISM output to reference data from manufacturers
    - At least 1 part per major material class (steel, stainless, aluminum, titanium, cast iron)
    - At least 1 part from each source type (Haas workbook, Sandvik test cut, handbook problem)
    - Report: aggregate accuracy by material, by operation type, by machine type
    - Flag: any result outside ±20% of reference for force, ±15% for S/F → investigate

REAL-WORLD DATA SOURCES (detailed inventory):
  EXISTING IN PRISM:
    - data/docs/haas-lathe-workbook-full.txt — OCR'd Haas lathe training parts
    - data/docs/haas-mill-workbook-full.txt — OCR'd Haas mill training parts
    - data/docs/sandvik-general-turning-full.txt — Sandvik turning guide
    - data/docs/sandvik-general-milling-full.txt — Sandvik milling guide
    - data/docs/walter-turning-full.txt — Walter turning data
    - data/docs/walter-milling-full.txt — Walter milling data
    - C:\PRISM\BOX\*.step — 33 STEP CAD models
    - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — reference CNC programs
    - C:\PRISM\HYPERMILL\doc\33.0\PDF\CAM\CAM_Manual-en-US.pdf — 1632pp with tutorial parts

  TO ACQUIRE (via /acquire-models, /learn-everything, /pdf-learn):
    - NIST SMS Test Bed force datasets (published, free download)
    - Kennametal Master Catalog cutting data tables
    - Machinery's Handbook digital tables (chapter-specific extraction)
    - Iscar machining calculator reference outputs
    - Industry benchmark programs (FANUC Academic examples, Haas NGC training)
    - Published FEM cutting simulation results (Arrazola et al. benchmark data)
    - YouTube machining tutorial measured results (via /video-learn pipeline)

  PER MACHINE TYPE — minimum validation set:
    TURNING: 10 parts (5 Haas workbook + 3 Sandvik test cuts + 2 handbook)
    MILLING: 10 parts (5 Haas workbook + 3 Sandvik + 2 hyperMILL tutorials)
    5-AXIS: 5 parts (2 hyperMILL tutorials + 2 published benchmarks + 1 STEP model)
    MILL-TURN: 3 parts (when pipeline fixed)
    GRINDING: 3 parts (Studer application examples + Malkin textbook problems)
    WIRE EDM: 5 parts (3 published wire EDM benchmarks + 2 Makino examples)
    LASER: 3 parts (TRUMPF application notes + published cutting data)
    WATERJET: 3 parts (OMAX test cut data + Zeng-Kim validation)
    TOTAL: 42+ real-world validation parts across all machine types
```

---

## Area 11: Open-Source CAD Engine Integration + Six Sigma/Lean (NEW — user requirements)

### CAD Engine — CadQuery/OpenCascade ALREADY EXISTS at C:/PRISM/cad-engine/
```
FOUND: Full CadQuery 2.x + OpenCascade (OCP) Python CAD kernel
  Location: C:/PRISM/cad-engine/ (176 Python files, 97 in src/)
  Kernel: cad_kernel.py (436 lines) — 25+ operations:
    Sketch: create_sketch() with rect/circle/polygon/spline/slot/text
    3D Ops: extrude, revolve, loft, fillet, chamfer, hole, shell, pattern, mirror
    Boolean: union, subtract, intersect
    Analysis: volume, surface_area, bounding_box, center_of_mass
    Primitives: box, cylinder, sphere, cone
  Export: cad_export.py (295 lines) — STEP, STL, DXF output
  Validation: geo_validator.py (438 lines) — geometry checks
  Features: feature_analyze.py (252 lines) — manufacturing feature extraction
  Code Gen: code_gen.py (253 lines) — generates CadQuery Python scripts
  Also: PRISM_OCCT_KERNEL.js (extracted monolith module)
  Also: occt-import-js WASM in node_modules (for TypeScript STEP import)

BRIDGE TO MCP SERVER:
  CadQueryCodeGeneratorEngine.ts (9.3K) — generates CadQuery scripts from descriptions
  VideoReplayPipelineEngine.ts — Video → CadQuery → STEP/STL pipeline
  cadquery-executor.py script at mcp-server/scripts/
```

### Fix: Wire CAD engine more deeply into pipeline
```
SESSION 0-D-CAD: CAD Engine Integration (wire existing cad-engine to MCP server)
  U-CAD1: Audit cad-engine capabilities vs CADKernelEngine.ts
    - cad_kernel.py (Python/CadQuery/OCCT): REAL solid modeling with constraints
    - CADKernelEngine.ts (TypeScript): custom geometry, no OCCT binding
    - Determine: which is the canonical CAD path? (Answer: Python for solid modeling,
      TypeScript for lightweight geometry analysis)
    - Wire cadquery-executor.py as the solid modeling backend
    - CadQueryCodeGeneratorEngine already generates scripts → verify executor runs them
  U-CAD2: Feature recognition from CAD models
    - Wire feature_analyze.py → FeatureRecognitionEngine.ts bridge
    - Test with 33 STEP models from C:\PRISM\BOX\*.step
    - Verify: STEP → features → operations → S/F → G-code end-to-end
```

### Lean Manufacturing / Six Sigma / Kaizen — ENGINES EXIST
```
EXISTING LEAN/SIX SIGMA ENGINES:
  - LeanSixSigmaEngine.ts — Cpk/Ppk, bootstrap CI, X-bar & R, I-MR, sigma level, PPM
  - ContinuousImprovementEngine.ts — Bayesian model averaging, residual analysis, correction factors
  - OEECalculatorEngine.ts — TPM six big losses, OEE computation
  - BottleneckAnalysisEngine.ts — constraint detection
  - SetupReductionEngine.ts — SMED (Single Minute Exchange of Die)
  - SetupCostOptimizationEngine.ts — setup cost minimization
  - WasteDetectorEngine.ts — muda identification (7 wastes)
  - CapacityPlanningEngine.ts — shop floor capacity analysis

WHAT'S MISSING (not yet engines):
  - ValueStreamMappingEngine — map current state → future state → improvement plan
  - KaizenEventEngine — structured improvement events with PDCA tracking
  - 5SWorkplaceEngine — Sort/Set/Shine/Standardize/Sustain auditing
  - AndonAlertEngine — real-time shop floor alert system
  - HeijunkaLevelingEngine — production leveling/smoothing
  - PokayokeVerificationEngine — mistake-proofing checks in process plan

THESE SHOULD BE PHASE 2 or PHASE 14 ADDITIONS depending on priority.
```

---

## Area 11c: CAD Validation Tests (generate models + compare to reference)
```
SESSION 0-C-CADTEST: CAD Model Generation Validation
  U-CADTEST1: Generate-and-compare test suite
    - For each of 10 cad-engine/reference_parts/*.step:
      Read STEP → extract dimensions/features → regenerate from features → compare
    - Comparison metrics: volume ±1%, surface area ±2%, bounding box ±0.1mm, feature count exact
    - For 5 BOX production parts: attempt to recreate from print dimensions
    - For 3 GrabCAD-style parts: download reference, generate from description, compare

  U-CADTEST2: Roundtrip verification
    - cad-engine already has roundtrip_*.step files — verify they match originals
    - STEP → FeatureRecognition → CadQueryCodeGenerator → CadQuery execution → STEP export
    - Compare: input STEP volume vs output STEP volume (must match ±1%)
    - This proves: PRISM can READ a part, UNDERSTAND its features, and RECREATE it

120 CAD model files exist across C:\PRISM:
  - 33 BOX production STEP files (real customer parts)
  - 23 cad-engine generated STEP files (proven export capability)
  - 10 reference parts with roundtrip verification
  - 54 more scattered across BOX subfolders
```

## Area 11d: Broader Audit Scope (user identified — original audit missed 3 directories)
```
CRITICAL: Phase 0-PRE only audited C:/PRISM/mcp-server/src/engines/ (1,245 engines).
It did NOT audit:
  1. C:/PRISM/cad-engine/ — 176 Python files, full CadQuery/OCCT kernel
  2. C:/PRISM_ARCHIVE_2026-02-01/ — archived version, may have engines not migrated
  3. C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM — BOX sync with production data
  4. C:/PRISM/extracted_modules/ — monolith extraction (PRISM_OCCT_KERNEL.js, etc.)

SESSION 0-PRE-BROAD: Broader Asset Audit
  U-BROAD1: Audit C:/PRISM/cad-engine/ (176 Python files)
    - Classify: PRODUCTION / PARTIAL / STUB for each Python module
    - Map capabilities to TypeScript engine equivalents
    - Identify Python-only capabilities not available in TypeScript
  U-BROAD2: Audit C:/PRISM_ARCHIVE_2026-02-01/
    - Search for engines/modules NOT migrated to current mcp-server
    - Identify any lost capabilities from the archive
  U-BROAD3: Audit C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM
    - Inventory production parts, CPS posts, Okuma macros, STEP models
    - Verify all BOX assets are indexed in reference_box_data.md
  U-BROAD4: Audit C:/PRISM/extracted_modules/
    - PRISM_OCCT_KERNEL.js + other monolith extractions
    - Identify capabilities in monolith JS that TypeScript engines don't have
```

---

## Area 11e: CAD Engine + Simulation Capabilities (detailed assessment)

**Agent findings**: 98 CAD/simulation engines exist. Strong in CAM/CNC simulation (Vericut-class),
feature recognition (22 types), STEP import (via occt-import-js). Weak in 3D FEA (only 1D/2D),
no assembly/constraint modeling, no topology optimization.

### What EXISTS (strong):
- CADKernelEngine (1,117 lines): custom geometry kernel, NURBS, CSG, BVH collision
- StepImportEngine (1,157 lines): STEP/AP203/AP214 via occt-import-js WASM
- FeatureRecognitionEngine (302 lines): 22 feature types with confidence scoring
- SolidEditingEngine (285 lines): Press/Pull, Boolean ops, Fillet/Chamfer
- CNCSimulationPipelineEngine (409 lines): Vericut-class with force/thermal/cost
- VoxelStockEngine (335 lines): adaptive voxel grid, 8 tool geometries
- CollisionPreventionEngine (754 lines): broad+narrow phase, 5-axis, 2mm safety margin
- FiniteElementEngine (386 lines): 1D/2D FEM (bars, beams, trusses, thermal, modal)
- ResidualStressPredictionEngine (881 lines): 7 stress models with citations
- 7 CAM code generators: CadQuery, Fusion360, hyperMILL, SolidCAM, PowerMill, NX, CATIA

### What's MISSING (gaps vs full CAD/CAM/CAE):
- 3D FEA: only 1D/2D — cannot predict deflection/stress in complex 3D parts (HIGH)
- Assembly modeling: no constraints, mates, relationships (MEDIUM)
- Parametric constraint solver: no sketch constraints (MEDIUM)
- CFD: no coolant flow or heat transfer simulation (MEDIUM)
- 3D mesh repair: quality check only, no auto hole-filling (MEDIUM)

### Fix: Add to Phase 4 (Simulation Gate) and Phase 14
```
Phase 4 SESSION 4-1 amendment: Simulation capabilities audit
  - Verify CNCSimulationPipelineEngine exercises ALL 10 sub-engines
  - Test VoxelStockEngine with real STEP models from BOX data
  - CollisionPreventionEngine: test 5-axis with real machine envelopes
  - FiniteElementEngine: document 1D/2D limitations, scope 3D for Phase 14

Phase 14: Advanced CAE capabilities
  - 3D FEA integration (either lightweight solver or OpenCascade/FEBio binding)
  - Assembly modeling with constraint solver
  - CFD for coolant flow optimization (long-term)
  - Topology optimization for additive manufacturing (long-term)
```

---

## Area 12: Match-Then-Improve Validation Strategy (NEW — user insight)

**User requirement**: Once PRISM can perfectly match a reference program, IMPROVE upon it
using all available physics, optimization, and knowledge engines. This proves PRISM adds
value beyond just reproducing existing programs.

### Fix: Add to 0-C-REALDATA and 12-VALIDATE
```
VALIDATION STRATEGY: TWO-PHASE PER REFERENCE PART

Phase A — MATCH (prove correctness):
  1. Take reference program (Haas workbook, Sandvik test, manufacturer example)
  2. Run same material + tool + geometry through PRISM pipeline
  3. Compare: S/F within ±10%, coordinates within ±0.1mm, G-code syntax correct
  4. If MATCH: proceed to Phase B
  5. If NO MATCH: investigate divergence, fix physics model, retry

Phase B — IMPROVE (prove value):
  1. Take the MATCHED program and run through full optimization:
     - Physics Fusion Tier 3 (converged multi-model)
     - Per-block S/F variability (engagement-adaptive feed)
     - Stability lobe optimization (chatter-free RPM selection)
     - Tool life optimization (Weibull-based speed selection)
     - Thermal compensation (for precision parts)
     - Chip-thinning feed correction (for light engagement)
     - Corner deceleration + arc limiting
     - Probing routine injection
  2. Compare IMPROVED vs ORIGINAL:
     - Cycle time reduction: target 10-25% on complex 3D parts, 5-10% on 2.5D
     - Tool life improvement: target 15-30% from optimized speeds
     - Surface finish improvement: target 20-40% from vibration avoidance
     - Safety improvement: probing + collision check + force validation added
  3. Generate IMPROVEMENT REPORT:
     "Original: 23.4 min cycle, Ra 1.6μm, no probing"
     "PRISM Optimized: 19.1 min (-18%), Ra 1.2μm (-25%), probing added, chatter-free"
  4. This report IS the value proposition for every customer demo

PER MACHINE TYPE — match-then-improve targets:
  TURNING: 10 parts matched → 10 improved (target: 15% cycle time reduction avg)
  MILLING: 10 parts matched → 10 improved (target: 20% cycle time reduction avg)
  5-AXIS: 5 parts matched → 5 improved (target: 25% reduction — most optimization headroom)
  GRINDING: 3 parts matched → 3 improved (target: burn prevention + 10% cycle reduction)
  EDM: 5 parts matched → 5 improved (target: fewer skim passes, better Ra)
  LASER/WATERJET: 3 each matched → improved (target: nesting optimization, pierce reduction)
  TOTAL: 42+ matched, 42+ improved, improvement report for each

IMPROVEMENT METRICS tracked per part:
  - cycle_time_reduction_pct
  - tool_life_improvement_pct
  - surface_finish_improvement_pct
  - safety_features_added (probing, collision check, force validation)
  - cost_per_part_reduction_usd
  - confidence_level (fusion tier used)
```

---

## Summary: Sessions to Add

| Phase | Session | Purpose | Est LOC |
|-------|---------|---------|---------|
| 0-B | 0-B-SECURITY | Close 6 bypasses, compliance infra | ~500 |
| 0-C | 0-C-REALDATA | Real-world validation data collection (42+ parts) | ~600 |
| 0-D | 0-D-MACHINE-SYNC | Sync 8 per-machine roadmaps | ~200 (docs) |
| 1 | 1-UX | Day 1 user journey mapping | ~400 |
| 2 | 2-ERP | ERP engine audit + top 10 wiring | ~600 |
| 4 | 4-PERF | Load testing + caching | ~400 |
| 4 | 4-1 amendment | Simulation capabilities audit + CAE scoping | ~100 (amend) |
| 12 | 12-VALIDATE | Real-world match-then-IMPROVE per machine (42+ parts) | ~800 |
| 13 | 13-DEPLOY | Containerization + monitoring | ~500 |
| 14 | Data freshness + 3D FEA + assembly + CFD | Advanced CAE + refresh pipeline | ~2,000 |
| 0-D | 0-D-CAD | Wire CadQuery/OCCT CAD engine to MCP pipeline | ~400 |
| 2 | 2-LEAN | ValueStreamMapping + KaizenEvent + 5S + Andon engines | ~800 |
| **Total** | **11 new sessions + 5 amendments** | | **~7,200** |

## COMPACTION PROTOCOL (MANDATORY — user requirement for highest quality)

Every 2-3 units of work MUST be followed by /compact to maintain context quality.
This is NOT optional — context degradation from long sessions produces lower quality output.

```
COMPACTION SCHEDULE FOR NEW SESSIONS:
  0-B-SECURITY:  U-SEC1 → /compact → U-SEC2 → /compact
  0-C-REALDATA:  U-DATA1 → /compact → U-DATA2 → /compact
  0-D-MACHINE-SYNC: single session → /compact (mostly doc edits)
  0-D-CAD:       U-CAD1 → /compact → U-CAD2 → /compact
  1-UX:          U-UX1 → /compact → U-UX2 → /compact
  2-ERP:         U-ERP1 → /compact → U-ERP2 → /compact → U-ERP3 → /compact
  2-LEAN:        2 units → /compact → 2 units → /compact
  4-PERF:        U-PERF1 → /compact → U-PERF2 → /compact
  12-VALIDATE:   per machine type → /compact after each (9 compactions)
  13-DEPLOY:     U-DEPLOY1 → /compact → U-DEPLOY2 → /compact

RULE: Never exceed 3 units without compacting. If context pressure reaches
70% (estimated from edit count + tool call count), compact IMMEDIATELY
regardless of unit boundary. The unit-counter enforcement hook auto-warns
at 20 edits and blocks at 60 — compact well before 60.
```

Plus amendments to 4 existing sessions (0-B materials, 0-D-1 firmware, 2-3 scheduling, 4-2 monitoring).

## Confidence After This Plan

| Area | Before | After | Method |
|------|--------|-------|--------|
| Per-machine roadmaps | 85-90% | 95% | Sync fusion/probing/tests across all 8 |
| ERP/business | 70-80% | 95% | Audit 29 engines, wire top 10, scope boundary |
| UX/onboarding | 70-80% | 90% | Day 1 journey + web app checkpoint |
| Scale/performance | 70-80% | 90% | Load test + caching + memory profiling |
| Exotic materials | 70-80% | 85% | Safety flags + unknown material handling |
| Controller firmware | 70-80% | 85% | Version field + availability map |
| Security/compliance | 60-70% | 90% | Close bypasses + compliance DB + audit trail |
| Shop floor orchestration | 70-80% | 85% | Dynamic scheduling + real-time monitoring |
| Data freshness | 70-80% | 85% | Refresh pipeline + staleness monitoring |
| Deployment | unmeasured | 85% | Docker + monitoring + error recovery |
| **Overall** | **92-95%** | **95-97%** | |

## Verification

1. After 0-D-MACHINE-SYNC: grep all 8 per-machine roadmaps for "fusion_tier" — must find in all 8
2. After 2-ERP: run triage script on 29 business engines — all classified
3. After 1-UX: simulate new-user flow end-to-end with only material+operation input
4. After 4-PERF: 50K-block program processes in <30s with <500MB memory
5. After 0-B-SECURITY: attempt all 6 bypass paths — all must be closed or warned
6. After 13-DEPLOY: docker-compose up → healthy MCP server serving requests
