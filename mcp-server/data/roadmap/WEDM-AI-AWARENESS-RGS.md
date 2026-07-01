# WEDM-AI-AWARENESS-RGS — Wire EDM Domain Self-Awareness Roadmap

**Generated**: 2026-04-15
**Phase**: WEDM-AWARENESS
**Coordination**: This roadmap coordinates with PRISM-WIDE-AWARENESS built in another session

## Executive Summary

Comprehensive Wire EDM-specific AI self-awareness system ensuring PRISM's AI is ALWAYS aware of:
- **55 Wire EDM engines** with capabilities mapped
- **2,194 JM Die Wire EDM programs** analyzed and indexed
- **6 WEDM data files** (tips, materials, conditions, machines)
- **All resources** from H:/PRISM/resources (hyperMILL EDM, Makino, Mitsubishi)
- **Machines**: Mitsubishi MV-1200R, Makino, Fanuc, Charmilles at JM Die
- **Wire Types**: Brass, coated, stratified, tungsten
- **Strategies**: Rough, skim, corner/taper, submerged, dry
- **Tribal knowledge**: 87+ tips from production experience

---

## Milestone 1: WEDM-AWARE-MS1 — Engine Registry & Capability Mapping

**Target**: Map all 55 Wire EDM engines with capabilities, inputs, outputs
**Omega**: 1.0 | **Units**: 8 | **Dependencies**: None

### Units:
1. **WEDM-AWARE-MS1-U1**: Audit all src/engines/*EDM*.ts and *Wire*.ts files (55 engines)
2. **WEDM-AWARE-MS1-U2**: Create WEDM_ENGINE_CAPABILITY_MATRIX with 20+ capabilities
3. **WEDM-AWARE-MS1-U3**: Map engine → capability → dispatcher action relationships
4. **WEDM-AWARE-MS1-U4**: Generate engine category taxonomy (AI, physics, CAM, etc.)
5. **WEDM-AWARE-MS1-U5**: Create quick-lookup registry for AI routing
6. **WEDM-AWARE-MS1-U6**: Wire to PRISMSelfAwarenessEngine.searchAIFeatures()
7. **WEDM-AWARE-MS1-U7**: Add tests for capability queries
8. **WEDM-AWARE-MS1-U8**: Build + verify integration

---

## Milestone 2: WEDM-AWARE-MS2 — JM Die Program Database

**Target**: Index all 2,194 JM Die Wire EDM programs with metadata
**Omega**: 1.0 | **Units**: 6 | **Dependencies**: MS1

### Units:
1. **WEDM-AWARE-MS2-U1**: Scan H:/PRISM/JM DIE/WIRE EDM/ recursively
2. **WEDM-AWARE-MS2-U2**: Extract program metadata (customer, material, thickness, passes)
3. **WEDM-AWARE-MS2-U3**: Create JM_DIE_WEDM_PROGRAM_INDEX with search capability
4. **WEDM-AWARE-MS2-U4**: Link programs to customers (50+ manufacturers)
5. **WEDM-AWARE-MS2-U5**: Build similarity search for "programs like this one"
6. **WEDM-AWARE-MS2-U6**: Wire to WireEDMSelfAwarenessIntegrationEngine.searchPrograms()

---

## Milestone 3: WEDM-AWARE-MS3 — Machine Intelligence Database

**Target**: Full awareness of JM Die Wire EDM machines
**Omega**: 1.0 | **Units**: 5 | **Dependencies**: MS1

### Machines:
- Mitsubishi MV-1200R (2019, primary production)
- Sodick AQ325L (backup)
- Controller: Mitsubishi M800 Advanced

### Units:
1. **WEDM-AWARE-MS3-U1**: Create WEDM_MACHINE_INTELLIGENCE_DB with specs
2. **WEDM-AWARE-MS3-U2**: Map controller capabilities (Mitsubishi M800, Fanuc)
3. **WEDM-AWARE-MS3-U3**: Store work envelopes, wire specs, flush settings
4. **WEDM-AWARE-MS3-U4**: Add maintenance history and recommended practices
5. **WEDM-AWARE-MS3-U5**: Wire to machine selection AI

---

## Milestone 4: WEDM-AWARE-MS4 — Wire & Consumables Database

**Target**: Complete wire type and consumables awareness
**Omega**: 1.0 | **Units**: 6 | **Dependencies**: MS3

### Wire Types:
- Brass (0.20mm, 0.25mm, 0.30mm)
- Zinc-coated brass
- Stratified wire (multi-layer)
- Tungsten (micro EDM)

### Units:
1. **WEDM-AWARE-MS4-U1**: Extract wire data from wedm-published-conditions.ts
2. **WEDM-AWARE-MS4-U2**: Integrate Mitsubishi wire catalog
3. **WEDM-AWARE-MS4-U3**: Integrate Bedra/EDM Wire data
4. **WEDM-AWARE-MS4-U4**: Create WEDM_WIRE_REGISTRY (diameter, coating, MRR factor)
5. **WEDM-AWARE-MS4-U5**: Map wire → material → thickness suitability
6. **WEDM-AWARE-MS4-U6**: Wire to WEDMCalculatorAIEngine

---

## Milestone 5: WEDM-AWARE-MS5 — Cutting Strategy Library

**Target**: All Wire EDM strategies with selection AI
**Omega**: 1.0 | **Units**: 7 | **Dependencies**: MS4

### Strategies:
- Rough: Main cut, first pass
- Skim: Second, third, fourth passes
- Corner/Taper: Reduced power, timing
- Submerged: Full dielectric immersion
- Flush Nozzle: Upper/lower positioning
- Wire Threading: Auto, manual, annealed

### Units:
1. **WEDM-AWARE-MS5-U1**: Create WEDM_STRATEGY_TAXONOMY with 15+ strategies
2. **WEDM-AWARE-MS5-U2**: Map strategy → material → thickness suitability
3. **WEDM-AWARE-MS5-U3**: Extract Mitsubishi tech table strategies
4. **WEDM-AWARE-MS5-U4**: Extract Makino strategy tips
5. **WEDM-AWARE-MS5-U5**: Create strategy selection AI with reasoning
6. **WEDM-AWARE-MS5-U6**: Wire to edmDispatcher actions
7. **WEDM-AWARE-MS5-U7**: Add tests for strategy recommendations

---

## Milestone 6: WEDM-AWARE-MS6 — CAD/CAM System Integration

**Target**: Deep integration with MasterCAM, hyperMILL
**Omega**: 1.0 | **Units**: 6 | **Dependencies**: MS5

### Units:
1. **WEDM-AWARE-MS6-U1**: Index all H:/PRISM/resources hyperMILL EDM content
2. **WEDM-AWARE-MS6-U2**: Index all MasterCAM Wire EDM posts
3. **WEDM-AWARE-MS6-U3**: Create CAM_WEDM_CAPABILITY_MAP
4. **WEDM-AWARE-MS6-U4**: Map post processors per CAM × controller
5. **WEDM-AWARE-MS6-U5**: Wire to postProcessorDispatcher
6. **WEDM-AWARE-MS6-U6**: Add tests for CAM system queries

---

## Milestone 7: WEDM-AWARE-MS7 — Tribal Knowledge Integration

**Target**: Capture 100+ shop floor tips specific to Wire EDM
**Omega**: 1.0 | **Units**: 5 | **Dependencies**: MS6

### Units:
1. **WEDM-AWARE-MS7-U1**: Extract tips from wedm-knowledge-tips.ts (87 tips)
2. **WEDM-AWARE-MS7-U2**: Extract tips from jm-die-wedm-program-patterns.ts
3. **WEDM-AWARE-MS7-U3**: Create WEDM_TRIBAL_KNOWLEDGE_DB with categories
4. **WEDM-AWARE-MS7-U4**: Wire to TribalKnowledgeEngine.searchWEDMTips()
5. **WEDM-AWARE-MS7-U5**: Add confidence scoring and provenance tracking

---

## Milestone 8: WEDM-AWARE-MS8 — Physics & Science Engine Integration

**Target**: Connect unified science engine to WEDM AI
**Omega**: 1.0 | **Units**: 6 | **Dependencies**: MS7

### Physics Domains:
- Electrical: Discharge energy, gap voltage, current
- Thermal: Kunieda MRR model, DiBitonto crater, heat partition
- Metallurgical: HAZ, recast layer, residual stress
- Surface: Ra/Rz prediction, white layer depth
- Wire: Wire wear, tension, vibration
- Material: Thermal conductivity, melting point

### Units:
1. **WEDM-AWARE-MS8-U1**: Wire WireEDMUnifiedScienceEngine
2. **WEDM-AWARE-MS8-U2**: Map physics models to operations
3. **WEDM-AWARE-MS8-U3**: Create quick physics lookup for AI
4. **WEDM-AWARE-MS8-U4**: Add physics validation to parameter recommendations
5. **WEDM-AWARE-MS8-U5**: Wire to S(x) safety scoring
6. **WEDM-AWARE-MS8-U6**: Add tests for physics-aware decisions

---

## Milestone 9: WEDM-AWARE-MS9 — Resource Folder Indexing

**Target**: Index ALL Wire EDM resources from H:/PRISM/resources
**Omega**: 1.0 | **Units**: 5 | **Dependencies**: MS8

### Resources:
- hyperMILL EDM modules (versions 31.0, 33.0)
- Mitsubishi tech documentation
- Makino EDM resources
- Training videos and manuals

### Units:
1. **WEDM-AWARE-MS9-U1**: Recursively scan resources/ for Wire EDM content
2. **WEDM-AWARE-MS9-U2**: Index hyperMILL EDM files (cfg, dll, py)
3. **WEDM-AWARE-MS9-U3**: Create WEDM_RESOURCE_INDEX with search
4. **WEDM-AWARE-MS9-U4**: Wire to document learning dispatcher
5. **WEDM-AWARE-MS9-U5**: Enable "find resource for X" AI queries

---

## Milestone 10: WEDM-AWARE-MS10 — AGI Orchestrator Wiring

**Target**: Wire all awareness to main AI orchestration
**Omega**: 1.0 | **Units**: 6 | **Dependencies**: MS1-MS9

### Units:
1. **WEDM-AWARE-MS10-U1**: Wire WireEDMSelfAwarenessIntegrationEngine to PRISMSelfAwarenessEngine
2. **WEDM-AWARE-MS10-U2**: Add WEDM context to AI auto-suggestion
3. **WEDM-AWARE-MS10-U3**: Create WEDM-specific /smart routing
4. **WEDM-AWARE-MS10-U4**: Add "explain WEDM capability X" AI queries
5. **WEDM-AWARE-MS10-U5**: Full integration test suite (30+ tests)
6. **WEDM-AWARE-MS10-U6**: Build, verify, commit

---

## Summary

| Milestone | Units | Description |
|-----------|-------|-------------|
| MS1 | 8 | Engine Registry & Capability Mapping (55 engines) |
| MS2 | 6 | JM Die Program Database (2,194 programs) |
| MS3 | 5 | Machine Intelligence Database |
| MS4 | 6 | Wire & Consumables Database |
| MS5 | 7 | Cutting Strategy Library (15+ strategies) |
| MS6 | 6 | CAD/CAM System Integration |
| MS7 | 5 | Tribal Knowledge Integration (87+ tips) |
| MS8 | 6 | Physics & Science Engine Integration |
| MS9 | 5 | Resource Folder Indexing |
| MS10 | 6 | AGI Orchestrator Wiring |
| **TOTAL** | **60** | **Full Wire EDM AI Self-Awareness** |

## Coordination with PRISM-Wide Awareness

This WEDM-specific roadmap coordinates with the main `PRISM-SELF-AWARENESS-AGI` roadmap:
- **Upstream**: PRISMSelfAwarenessEngine provides global context
- **Downstream**: WireEDMSelfAwarenessIntegrationEngine provides WEDM-specific detail
- **Shared**: Common interfaces for capability queries, feature searches
- **Sync**: Both update cross-session-asset-registry.json

## Resources Referenced

- `H:/PRISM/JM DIE/WIRE EDM/` — 2,194 programs, 50+ customers
- `H:/PRISM/resources/HYPERMILL/` — EDM modules, automation scripts
- `H:/PRISM/mcp-server/src/data/wedm-*.ts` — 6 data files
- `H:/PRISM/mcp-server/src/data/edm-material-db.ts` — material database
- `H:/PRISM/mcp-server/src/engines/*EDM*.ts` — 55 engines
