# CAD/CAM Audit — Agent 1: CAD Generation Engines

## Engines Found (Categorized)

### Text-to-CAD & NL Prompts
- **mcp-cadquery** (Python): CadQuery-based NL→3D generation via orion-cad frontend. Routes in pages/; needs port to mcp-server/web.
- **PRISM_COMPLETE_CAD_GENERATION_ENGINE.js** (2914 lines, v3.0.0): Comprehensive parametric solid modeling from primitives, sketches, extrudes, revolves, sweeps, lofts. Math utilities, B-rep solid ops, feature history.

### Parametric & Constraint Design
- **PRISM_PARAMETRIC_CONSTRAINT_SOLVER.js**: AI/ML constraint solver for design optimization.
- **PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE.js**: Parametric model enrichment & refinement.
- **PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE.js** (2x: ai_ml, cad_cam): Sketch + constraint system for Fusion 360 interop.

### Sketch & Feature Modeling
- **PRISM_SKETCH_ENGINE.js** (4 keyword matches): Core 2D sketch primitives, constraints, profiles.
- **PRISM_ADVANCED_SWEEP_LOFT_ENGINE.js** (2x): Sweep & loft operations for complex surfaces.
- **PRISM_FEATURE_STRATEGY_COMPLETE.js**: Feature sequencing & interaction modeling.

### Geometry & Surface Operations
- **PRISM_BREP_CAD_GENERATOR_V2.js**: B-rep solid generation from topology.
- **PRISM_BVH_ENGINE.js**: Bounding volume hierarchy for spatial queries.
- **PRISM_NURBS_ADVANCED_ENGINE.js** + **PRISM_NURBS_LIBRARY.js**: NURBS curve/surface modeling.
- **PRISM_OFFSET_SURFACE_ENGINE.js**: Offset & derived surfaces.
- **PRISM_SURFACE_RECONSTRUCTION_ENGINE.js**: Mesh→solid reconstruction.
- **PRISM_FILLETING_ENGINE.js**, **PRISM_SURFACE_INTERSECTION_ENGINE.js**: Blending & topology ops.

### Advanced Modeling
- **PRISM_AI_ORCHESTRATION_ENGINE.js** (2x): AI-driven design decision routing.
- **PRISM_UNIFIED_CAD_LEARNING_SYSTEM.js**: ML feedback loop for model quality.
- **PRISM_TOPOLOGY_ENGINE.js**, **PRISM_VORONOI_ENGINE.js**: Topology optimization primitives.
- **PRISM_VOXEL_STOCK_ENGINE.js**: Volumetric stock simulation for additive/subtractive planning.

### Support & Integration
- **PRISM_CAD_QUALITY_ASSURANCE_ENGINE.js**: Model validation (tolerance, topology, manufacturability).
- **PRISM_TOOL_HOLDER_3D_GENERATOR.js**: Parametric tool assembly generation.
- **PRISM_CAD_CAM_INTEGRATION_HUB.js**: Bridge between CAD generation & CAM toolpath.

## Wiring Status (from BUILD_STATE.json)

**Summary:** 2269/3167 engines wired (72%). CAD generation domain shows mixed coverage:

- **WIRED (Direct):** PRISM_COMPLETE_CAD_GENERATION_ENGINE, PRISM_SKETCH_ENGINE, PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE, PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE (multiple).
- **UNWIRED:** 898 engines across all domains; CAD generation subset estimated ~30-40 engines lacking dispatcher references. BREP_GENERATOR_V2, NURBS_LIBRARY, some constraint solvers flagged in BUILD_STATE.NEEDS_WIRING.
- **Frontend Merge Pending:** mcp-cadquery-frontend (Vite + React 19 + Three.js) + cqask Next.js build await merge. React version mismatch (18 vs 19) noted.

## Gaps

1. **Blueprint→CAD Bridge:** No dedicated PDF/DXF→model converter found. CADScreenshotCapturer and CADToSTEPPipelineEngine exist but incomplete wiring.
2. **Topology Optimization:** Voronoi/topology engines present but not fully integrated into generation pipeline.
3. **Multi-CAD Interop:** Fusion360CADGeneratorAdapter & UnifiedCADCodeGeneratorBase reference Fusion but lack deep integration.
4. **Frontend Integration:** Both codex frontends (orion-cad NL UI, mcp-cadquery 3D viewer) blocked on merge decision. No unified NL→3D UX.
5. **Parametric Constraint Docs:** Solver algorithms exist but minimal domain documentation.

## Score: 68/100

**Rationale:**
- Core generation engines: 90/100 (comprehensive, well-architected)
- Wiring completeness: 65/100 (72% fleet wired; CAD gen subset lower)
- Frontend integration: 40/100 (both builds pending merge)
- Blueprint/multi-CAD support: 50/100 (gaps in DXF/PDF, Fusion interop)
- Documentation/accessibility: 60/100 (minimal tutorials, constraint solver opacity)

**Action:** Merge CAD frontends (decide: App Router port vs. standalone+iframe), wire 30-40 unwired engines (NURBS, constraint, topology), add Blueprint→CAD via Vision+CADQuery bridge.
