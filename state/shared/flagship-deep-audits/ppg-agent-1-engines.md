# PPG Deep Audit — Agent 1: Engines

## Coverage
**Total PPG-Related Engines Inventory: 61 engines**
**Total LOC: 16,059 lines**

### Distribution by Category

| Category | Count | LOC | Role |
|----------|-------|-----|------|
| **Core Orchestration** | 1 | 2,042 | Main PPG pipeline: drawing → G-code |
| **Machine-Specific PPG** | 5 | 6,800 | Mill, lathe, multi-axis, EDM (wire/sinker) |
| **Feature Recognition** | 2 | 809 | CAD feature extraction & classification |
| **Tolerance/GD&T** | 4 | 2,112 | Tolerance extraction, stackup, awareness |
| **Drawing Parsers** | 2 | 2,359 | DXF geometry input, parsing |
| **Tool Selection** | 6 | 1,937 | Tool recommendation, scoring, catalog bridge |
| **Machine Selection** | 2 | TBD | Machine recommendation by requirements |
| **Support/Harnesses** | 39 | TBD | Coverage, regression, tutorials, parsers |

## Engine Inventory (Key Engines)

| Engine | File | LOC | Role |
|--------|------|-----|------|
| **PrintToProgramPipelineEngine** | PrintToProgramPipelineEngine.ts | 2,042 | **ORCHESTRATOR**: Stages 1-5 (intake→validation) |
| MillingPrintToProgramEngine | MillingPrintToProgramEngine.ts | ~1,600 | Mill-specific: strategy, toolpath, post |
| TurningPrintToProgramEngine | TurningPrintToProgramEngine.ts | ~1,635 | Lathe-specific: turning, threading, grooving |
| MultiAxisPrintToProgramEngine | MultiAxisPrintToProgramEngine.ts | ~1,800 | 5-axis mill: simultaneous, indexing ops |
| WEDMPrintToProgramEngine | WEDMPrintToProgramEngine.ts | ~1,200 | Wire EDM: electrode, flushing, power |
| SinkerEDMPrintToProgramEngine | SinkerEDMPrintToProgramEngine.ts | ~807 | Sinker EDM: cavity, electrode wear |
| **FeatureRecognitionEngine** | FeatureRecognitionEngine.ts | 308 | **FEATURE PARSER**: 22 feature types, rules |
| CADFeatureRecognitionEngine | CADFeatureRecognitionEngine.ts | 16 | Stub (U-EFF25) for TS2307 fallback |
| **GDTCalloutParserEngine** | GDTCalloutParserEngine.ts | TBD | Parse ASME Y14.5 callouts from drawing |
| GDTStackupEngine | GDTStackupEngine.ts | TBD | Stack analysis, worst-case/RSS |
| **ToleranceExtractionEngine** | ToleranceExtractionEngine.ts | TBD | Extract dims/tols from geometry |
| ToleranceStackUpEngine | ToleranceStackUpEngine.ts | TBD | Root-cause tolerance chains |
| ToleranceAwareGenerationEngine | ToleranceAwareGenerationEngine.ts | TBD | Constrain S/F by tolerance budget |
| **DXFParserEngine** | DXFParserEngine.ts | ~1,800 | Parse DXF → geometry, dimensions |
| DXFGeometryParserEngine | DXFGeometryParserEngine.ts | ~559 | Low-level DXF entity extraction |
| **ToolSelectionEngine** | ToolSelectionEngine.ts | TBD | Core tool recommendation engine |
| SmartToolSelectorEngine | SmartToolSelectorEngine.ts | TBD | Composite scoring: catalog + physics |
| ToolSelectionAdvisorEngine | ToolSelectionAdvisorEngine.ts | TBD | Alternatives, compare, validate |
| **MachineSelectionEngine** | MachineSelectionEngine.ts | TBD | Match part envelope → machine |

## Strengths

1. **Modular Architecture**: 61 engines, each single-responsibility. PrintToProgramPipelineEngine orchestrates via 5 well-defined stages.
2. **Canonical Physics**: All engines reference `src/physics/constants.ts` (802 LOC) for Kienzle, Taylor, material DB. No inline constants detected.
3. **Feature Coverage**: 22 feature types recognized (through/blind holes, pockets, slots, bosses, threads, contours). Pattern detection for arrays.
4. **Multi-Process**: Dedicated engines for mill, lathe, 5-axis, wire EDM, sinker EDM — not one-size-fits-all.
5. **Tolerance Aware**: Explicit extraction and stackup engines; integration with process planning for constraint-based S/F.
6. **Tool Catalog Bridge**: 46K+ tools indexed; scoring layers (SmartToolSelector) compose physics + manufacturing rules.
7. **DXF Input**: Geometry parser ready for 2D drawing files (critical PPG entry point).

## Gaps

1. **STEP Parser**: No dedicated STEPParserEngine found. Drawing intake documented as "PDF/STEP/DXF" but STEP implementation unclear.
2. **PDF Extraction**: No PDFParserEngine. User requirement mentions "2D drawing/PDF" but no parser detected. Likely relies on external OCR/extraction.
3. **ProcessPlanning**: No OperationSequencingEngine found. Operation ordering implicitly in machine-specific engines, not standalone.
4. **CADFeatureRecognitionEngine Stub**: Marked U-EFF25 (placeholder). Real CAD feature extraction delegated to geometry parsers.
5. **Machine Selection LOC**: MachineSelectionEngine lines not counted; assumes service-based (910 machines via MachineService).
6. **Test Coverage**: No mention of companion test files for ParserEngine suites (PPG critical path).
7. **Orchestrator Tests**: PrintToProgramPipelineEngine (2,042 LOC) — no test file referenced; high risk.

## Score: **72/100**

### Rationale
- **+28** for modular 61-engine inventory, canonical physics import discipline, feature type coverage
- **-10** for missing STEP/PDF parsers (PPG input spec incomplete)
- **-10** for no explicit operation sequencing engine (process planning implicit)
- **-8** for missing integration tests on critical path (PPG orchestrator, parsers)

## Recommendations
1. **Add STEPParserEngine** (estimate 1,200 LOC, reference cadquery/STEP reader libraries)
2. **Audit ProcessPlanEngine** for sequencing logic (may exist elsewhere; search codebase)
3. **Create PPG integration test** covering drawing → G-code for mill + lathe
4. **Document PDF input** workflow (external tool? OCR? Rasterization?)
5. **Validate constants.ts hygiene** monthly (physics drift risk)
