#!/usr/bin/env python3
"""Generate roadmap-index.json and per-milestone envelope JSON files."""
import json, os
from datetime import datetime

now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
BASE = os.path.join(os.path.dirname(__file__), "..", "data")

# All milestones in execution order
milestones = [
    # S0 - complete
    {"id": "S0-MS1", "title": "System Health Verification", "track": "S0", "deps": [], "status": "complete", "units": 11, "done": 11, "sessions": "1",
     "brief": "Verify all existing PRISM systems are healthy and operational before roadmap execution.",
     "dispatchers": ["prism_dev"], "ext_tools": []},

    # L0 - Data Foundation
    {"id": "L0-NEW-MS0", "title": "Data Consolidation & Deduplication", "track": "L0", "deps": ["S0-MS1"], "status": "not_started", "units": 12, "done": 0, "sessions": "2-3",
     "brief": "Merge 1,775 files from extracted/ and extracted_modules/ into data/registries/. Inventory, deduplicate, migrate useful modules, archive rest.",
     "dispatchers": ["prism_dev", "prism_manus"], "ext_tools": ["Desktop Commander"]},
    {"id": "L0-P0-MS1", "title": "Create 12 Core Databases", "track": "L0", "deps": ["L0-NEW-MS0"], "status": "not_started", "units": 12, "done": 0, "sessions": "3-4",
     "brief": "Create 12 core databases: MaterialDB, ToolDB, MachineDB, AlarmDB, ThreadDB, FormulaDB, AlgorithmDB, WorkflowDB, InferenceDB, DecisionTreeDB, CompoundActionDB, KnowledgeDB.",
     "dispatchers": ["prism_data", "prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L0-P0-MS2", "title": "Create 12 Specialty Databases from PASS2", "track": "L0", "deps": ["L0-P0-MS1"], "status": "not_started", "units": 12, "done": 0, "sessions": "2-3",
     "brief": "Create 12 PASS2 specialty databases: AerospaceDB, MedicalDB, AutomotiveDB, MoldDB, ElectrodeDB, CompositesDB, MicroDB, HardMetalDB, TitaniumDB, InconelDB, AluminumDB, StainlessDB.",
     "dispatchers": ["prism_data", "prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L0-P1-MS1", "title": "Registry Enrichment - Full Coverage", "track": "L0", "deps": ["L0-P0-MS2"], "status": "not_started", "units": 18, "done": 0, "sessions": "2-3",
     "brief": "Enrich ALL 18,516 material entries, 2,847 tool entries, 1,200 machine entries with cross-references, validation scores, and computed fields.",
     "dispatchers": ["prism_data", "prism_calc", "prism_validate", "prism_dev"], "ext_tools": []},
    {"id": "L0-P2-MS1", "title": "Registry Infrastructure + Cross-Registry Index + DSL Registration", "track": "L0", "deps": ["L0-P1-MS1"], "status": "not_started", "units": 11, "done": 0, "sessions": "2-3",
     "brief": "Fix 6 critical DSL gaps: file-based registry loading, MiniSearch FTS indexing, DecisionTreeEngine registration, expand CompoundActions to 10, InferenceChains to 5, AlgorithmGateway to full registry.",
     "dispatchers": ["prism_dev", "prism_knowledge", "prism_guard"], "ext_tools": ["Serena", "Context7"]},

    # L1 - Algorithms
    {"id": "L1-P0-MS1", "title": "Port ALL 14 Monolith Algorithms", "track": "L1", "deps": ["L0-P2-MS1"], "status": "not_started", "units": 14, "done": 0, "sessions": "3-4",
     "brief": "Port all 14 monolith algorithms to Algorithm<I,O> interface: Kienzle, ExtTaylor, JohnsonCook, GilbertMRR, TWP, SpindleVibFFT, ChipBreaking, ToolDeflection, CoolantFlow, ChipEvacuation, ThermalFEA, BayesianWear, EnsemblePredictor, AdaptiveController.",
     "dispatchers": ["prism_calc", "prism_validate", "prism_dev"], "ext_tools": []},
    {"id": "L1-P1-MS1", "title": "New General-Purpose Algorithms", "track": "L1", "deps": ["L1-P0-MS1"], "status": "not_started", "units": 18, "done": 0, "sessions": "2-3",
     "brief": "18 new algorithms: GA, PSO, SimulatedAnnealing, BayesOpt, GradientDescent, RandomForest, SVM, KNN, LSTM, Transformer, FEA, BEM, CFD, Interpolation (4 types), Kalman, PID.",
     "dispatchers": ["prism_calc", "prism_validate", "prism_dev", "prism_sp"], "ext_tools": ["Serena"]},
    {"id": "L1-P1-MS2", "title": "New Manufacturing-Specific Algorithms from PASS2", "track": "L1", "deps": ["L1-P0-MS1"], "status": "not_started", "units": 14, "done": 0, "sessions": "2",
     "brief": "14 PASS2 safety-critical algorithms: StabilityLobe, ChatterDetection, ThermalCompensation, ToolBreakagePrediction, SurfaceIntegrity, ResidualStress, MicrostructurePrediction, CuttingEdgeWear, BuiltUpEdgeDetection, ChipMorphology, DynamicCuttingForce, RegenerativeChatter, ProcessDamping, ModeCouplingSolver.",
     "dispatchers": ["prism_calc", "prism_validate", "prism_safety", "prism_dev"], "ext_tools": ["Serena"]},
    {"id": "L1-P2-MS1", "title": "Algorithm Engine & Wiring", "track": "L1", "deps": ["L1-P1-MS1", "L1-P1-MS2"], "status": "not_started", "units": 5, "done": 0, "sessions": "1",
     "brief": "Wire all 44 algorithms into AlgorithmGateway, AlgorithmRegistry, update prism_calc dispatcher routing.",
     "dispatchers": ["prism_calc", "prism_validate", "prism_dev"], "ext_tools": []},

    # L2 - Engines
    {"id": "L2-P0-MS1", "title": "Port 8 Monolith Engines", "track": "L2", "deps": ["L1-P2-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "2-3",
     "brief": "Port 8 core engines: CADKernel, CAMKernel, SimulationEngine, VisualizationEngine, AIMLEngine, FileIOEngine, ReportEngine, SettingsEngine.",
     "dispatchers": ["prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L2-P1-MS1", "title": "20 Manufacturing Intelligence Engines", "track": "L2", "deps": ["L2-P0-MS1"], "status": "not_started", "units": 20, "done": 0, "sessions": "4",
     "brief": "20 mfg-intelligence engines including InverseSolverEngine, ForensicAnalysisEngine, GenPlanEngine, MaterialGenomeEngine, AdaptiveControlEngine.",
     "dispatchers": ["prism_intelligence", "prism_dev", "prism_validate", "prism_safety"], "ext_tools": []},
    {"id": "L2-P2-MS1", "title": "16 CAD/CAM Engines", "track": "L2", "deps": ["L2-P0-MS1"], "status": "not_started", "units": 16, "done": 0, "sessions": "3",
     "brief": "16 CAD/CAM engines: FeatureRecognition, ToolpathGeneration, StockSimulation, PostProcessor, MeshEngine, NURBSEngine, ToleranceAnalysis, GD&T.",
     "dispatchers": ["prism_safety", "prism_calc", "prism_toolpath", "prism_dev"], "ext_tools": []},
    {"id": "L2-P3-MS1", "title": "16 Infrastructure Engines", "track": "L2", "deps": ["L2-P0-MS1"], "status": "not_started", "units": 16, "done": 0, "sessions": "3",
     "brief": "16 infra engines: AuthEngine, CacheEngine, QueueEngine, SchedulerEngine, NotificationEngine, AuditEngine, TelemetryEngine, PluginEngine.",
     "dispatchers": ["prism_dev", "prism_validate", "prism_tenant"], "ext_tools": ["Serena"]},
    {"id": "L2-P4-MS1", "title": "44 PASS2 Specialty Engines", "track": "L2", "deps": ["L2-P1-MS1", "L2-P2-MS1", "L2-P3-MS1"], "status": "not_started", "units": 44, "done": 0, "sessions": "8-10",
     "brief": "44 specialty engines from PASS2: ShopFloorEngine, MobileFieldEngine, ERPBridgeEngine, CMMIntegration, SurfaceMeasurement, ProbeCalibration, DNCEngine, CAMExportEngine.",
     "dispatchers": ["prism_intelligence", "prism_dev", "prism_validate"], "ext_tools": []},

    # L3 - Dispatchers
    {"id": "L3-P0-MS1", "title": "6 Core New Dispatchers", "track": "L3", "deps": ["L2-P4-MS1"], "status": "not_started", "units": 6, "done": 0, "sessions": "2-3",
     "brief": "6 new dispatchers: prism_cad, prism_cam, prism_sim, prism_report, prism_file, prism_settings.",
     "dispatchers": ["prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L3-P1-MS1", "title": "6 PASS2 Specialty Dispatchers", "track": "L3", "deps": ["L3-P0-MS1"], "status": "not_started", "units": 6, "done": 0, "sessions": "2-3",
     "brief": "6 PASS2 dispatchers: prism_shop, prism_mobile, prism_erp, prism_measure, prism_dnc, prism_adaptive.",
     "dispatchers": ["prism_dev", "prism_validate"], "ext_tools": []},

    # L4 - Hooks
    {"id": "L4-P0-MS1", "title": "Safety + Quality + Business + System Hooks", "track": "L4", "deps": ["L3-P1-MS1"], "status": "not_started", "units": 20, "done": 0, "sessions": "2-3",
     "brief": "20 core hooks across 4 categories: safety, quality, business, system.",
     "dispatchers": ["prism_hook", "prism_validate", "prism_generator", "prism_nl_hook", "prism_compliance"], "ext_tools": []},
    {"id": "L4-P1-MS1", "title": "20 PASS2 Specialty Hooks + 6 Cadences", "track": "L4", "deps": ["L4-P0-MS1"], "status": "not_started", "units": 26, "done": 0, "sessions": "1-2",
     "brief": "20 PASS2 hooks + 6 cadences for aerospace, medical, automotive, composites, micro-machining, thermal management.",
     "dispatchers": ["prism_hook", "prism_nl_hook", "prism_validate", "prism_compliance"], "ext_tools": []},

    # L5 - Skills + Scripts
    {"id": "L5-P0-MS1", "title": "22 Core Product/Feature Skills", "track": "L5", "deps": ["L4-P1-MS1"], "status": "not_started", "units": 22, "done": 0, "sessions": "2",
     "brief": "22 core skills: SFC calculator, PPG editor, CAM workflow, learning lesson, ERP dashboard, job planning, setup sheet, process costing.",
     "dispatchers": ["prism_skill_script", "prism_validate"], "ext_tools": []},
    {"id": "L5-P0-MS2", "title": "22 PASS2 Specialty Skills", "track": "L5", "deps": ["L5-P0-MS1"], "status": "not_started", "units": 22, "done": 0, "sessions": "2-3",
     "brief": "22 PASS2 skills: aerospace-requirements, medical-validation, automotive-standards, mold-design, electrode-edm, composites-layup.",
     "dispatchers": ["prism_skill_script", "prism_validate", "prism_compliance"], "ext_tools": []},
    {"id": "L5-P1-MS1", "title": "14 Core Scripts + 14 PASS2 Scripts", "track": "L5", "deps": ["L5-P0-MS2"], "status": "not_started", "units": 28, "done": 0, "sessions": "1-2",
     "brief": "28 scripts: health-check, backup, migrate, seed-data, benchmark, report-gen, deploy, rollback, audit-log, cleanup, plus 14 PASS2 specialty scripts.",
     "dispatchers": ["prism_skill_script", "prism_dev"], "ext_tools": []},

    # L6 - API
    {"id": "L6-P0-MS1", "title": "Core REST API Routes", "track": "L6", "deps": ["L5-P1-MS1"], "status": "not_started", "units": 7, "done": 0, "sessions": "2",
     "brief": "7 core route groups: /api/materials, /api/tools, /api/machines, /api/alarms, /api/formulas, /api/calc, /api/knowledge.",
     "dispatchers": ["prism_bridge", "prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L6-P1-MS1", "title": "Auth, Admin, WebSocket & OpenAPI", "track": "L6", "deps": ["L6-P0-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "1-2",
     "brief": "Auth middleware (JWT + API key), admin routes, WebSocket for real-time updates, OpenAPI/Swagger spec generation.",
     "dispatchers": ["prism_bridge", "prism_dev", "prism_validate"], "ext_tools": []},

    # Phase 6: Products - SFC
    {"id": "S3-MS1", "title": "SFC Calculator Core UI", "track": "S3", "deps": ["L6-P1-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "2-3",
     "brief": "SFC core calculator page: MaterialSelector, OperationSelector, ParameterPanel, ResultsDisplay.",
     "dispatchers": ["prism_dev", "prism_intelligence"], "ext_tools": ["Claude Preview", "Context7"]},
    {"id": "S3-MS2", "title": "SFC Smart Selectors", "track": "S3", "deps": ["S3-MS1"], "status": "not_started", "units": 6, "done": 0, "sessions": "1-2",
     "brief": "Smart tool/material/machine selectors with fuzzy search, recommendations, cross-compatibility validation.",
     "dispatchers": ["prism_dev", "prism_intelligence"], "ext_tools": ["Claude Preview"]},
    {"id": "S3-MS3", "title": "SFC Advanced Features", "track": "S3", "deps": ["S3-MS2"], "status": "not_started", "units": 6, "done": 0, "sessions": "2",
     "brief": "Multi-operation comparison, PDF report export, save/load presets, parameter history, advanced charts.",
     "dispatchers": ["prism_dev", "prism_intelligence"], "ext_tools": ["Claude Preview"]},
    {"id": "S4-MS1", "title": "Testing, Polish & Ship", "track": "S4", "deps": ["S3-MS3"], "status": "not_started", "units": 8, "done": 0, "sessions": "2-3",
     "brief": "E2E testing with Playwright, accessibility audit, performance optimization, deployment configuration, launch checklist.",
     "dispatchers": ["prism_dev", "prism_validate", "prism_ralph", "prism_omega"], "ext_tools": ["Claude Preview", "Playwright"]},

    # Phase 6: Products - PPG
    {"id": "L8-P0-MS1", "title": "Post Processor Generator (PPG) - Engine + API", "track": "L8", "deps": ["L6-P1-MS1"], "status": "not_started", "units": 10, "done": 0, "sessions": "3-4",
     "brief": "PostProcessorEngine: G-code generation for 6 controllers, template system, validation, API routes.",
     "dispatchers": ["prism_intelligence", "prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L8-P0-MS2", "title": "PPG Web UI", "track": "L8", "deps": ["L8-P0-MS1"], "status": "not_started", "units": 12, "done": 0, "sessions": "5-6",
     "brief": "PPG web interface: Monaco code editor, controller selector, template browser, G-code preview, diff comparison.",
     "dispatchers": ["prism_dev", "prism_intelligence"], "ext_tools": ["Claude Preview", "Context7"]},

    # Phase 6: Products - Learning
    {"id": "L8-P1-MS1", "title": "CAD/CAM Learning - Engine + API", "track": "L8", "deps": ["L6-P1-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "2-3",
     "brief": "LearningEngine: lesson system, knowledge base, formula explorer, troubleshooting wizard, progress tracking.",
     "dispatchers": ["prism_intelligence", "prism_knowledge", "prism_dev"], "ext_tools": []},
    {"id": "L8-P1-MS2", "title": "CAD/CAM Learning Web UI", "track": "L8", "deps": ["L8-P1-MS1"], "status": "not_started", "units": 15, "done": 0, "sessions": "7-9",
     "brief": "Learning web interface: LessonViewer, FormulaExplorer (KaTeX), TroubleshootingWizard, ProgressDashboard.",
     "dispatchers": ["prism_dev", "prism_intelligence", "prism_memory"], "ext_tools": ["Claude Preview", "Context7"]},

    # Phase 6: Products - ERP
    {"id": "L8-P2-MS1", "title": "ERP/Business - Engine + API", "track": "L8", "deps": ["L6-P1-MS1"], "status": "not_started", "units": 10, "done": 0, "sessions": "3-4",
     "brief": "ERPBridgeEngine: work order import, cost feedback, quality import, tool inventory. ShopFloorEngine: job tracking.",
     "dispatchers": ["prism_intelligence", "prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L8-P2-MS2", "title": "ERP/Business Web UI", "track": "L8", "deps": ["L8-P2-MS1"], "status": "not_started", "units": 15, "done": 0, "sessions": "8-11",
     "brief": "ERP web interface: WorkOrderList, CostTracker, QualityDashboard, ToolInventory, ScheduleView, ReportBuilder.",
     "dispatchers": ["prism_dev", "prism_intelligence"], "ext_tools": ["Claude Preview"]},
    {"id": "L8-P3-MS1", "title": "PASS2 Additional Pages", "track": "L8", "deps": ["L8-P2-MS2"], "status": "not_started", "units": 6, "done": 0, "sessions": "2-3",
     "brief": "Additional product pages: DigitalWorkInstructions, ShiftDashboard, MaterialCertViewer.",
     "dispatchers": ["prism_dev"], "ext_tools": ["Claude Preview"]},

    # Phase 7: CC
    {"id": "CC-MS0", "title": "Foundation: CadQuery + CAD Kernel", "track": "CC", "deps": ["L8-P1-MS2"], "status": "not_started", "units": 6, "done": 0, "sessions": "3-4",
     "brief": "Python cad_kernel.py, geo_validator.py, cad_export.py; CadQuery integration; 10 reference STEP parts.",
     "dispatchers": ["prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "CC-MS1", "title": "Video Ingestion Pipeline + Vision Analysis", "track": "CC", "deps": ["CC-MS0"], "status": "not_started", "units": 8, "done": 0, "sessions": "5-6",
     "brief": "video_ingest.py, frame_extract.py, ui_ocr.py, vision_analyze.py, domain_classify.py; 8 test videos processed.",
     "dispatchers": ["prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "CC-MS2", "title": "Knowledge Extraction Engine (All 3 Domains)", "track": "CC", "deps": ["CC-MS1"], "status": "not_started", "units": 6, "done": 0, "sessions": "4-5",
     "brief": "Universal schema v2, CAD/CAM/SHOP extraction prompts, knowledge_extract.py.",
     "dispatchers": ["prism_intelligence", "prism_dev"], "ext_tools": []},
    {"id": "CC-MS3", "title": "Parametric Code Generator (CAD DRAW)", "track": "CC", "deps": ["CC-MS2"], "status": "not_started", "units": 4, "done": 0, "sessions": "3",
     "brief": "feature_translator.py, code_gen.py; auto-generated CadQuery from feature trees.",
     "dispatchers": ["prism_dev"], "ext_tools": []},
    {"id": "CC-MS4", "title": "Feature Primitive Library (CAD LEARN)", "track": "CC", "deps": ["CC-MS2"], "status": "not_started", "units": 4, "done": 0, "sessions": "2",
     "brief": "pattern_detect.py, primitive_gen.py; 20 foundational CAD primitives.",
     "dispatchers": ["prism_dev"], "ext_tools": []},
    {"id": "CC-MS5", "title": "CAM Strategy Learning Engine", "track": "CC", "deps": ["CC-MS2"], "status": "not_started", "units": 5, "done": 0, "sessions": "3",
     "brief": "strategy_aggregate.py, strategy_recommend.py, tool_select_kb.py; consensus parameter ranges.",
     "dispatchers": ["prism_intelligence", "prism_toolpath"], "ext_tools": []},
    {"id": "CC-MS6", "title": "Machining Practice Knowledge Base", "track": "CC", "deps": ["CC-MS2"], "status": "not_started", "units": 6, "done": 0, "sessions": "4",
     "brief": "practice_aggregate.py, trouble_tree.py; 6 practice categories, 5+ troubleshooting trees.",
     "dispatchers": ["prism_intelligence", "prism_knowledge"], "ext_tools": []},
    {"id": "CC-MS7", "title": "Persistent Memory + Boot Integration", "track": "CC", "deps": ["CC-MS2"], "status": "not_started", "units": 4, "done": 0, "sessions": "3",
     "brief": "memory_index.py (FTS5), memory_boot.py; prism_cad memory_boot action in boot sequence.",
     "dispatchers": ["prism_memory", "prism_session"], "ext_tools": []},
    {"id": "CC-MS8", "title": "Cross-Platform Operation Mapping", "track": "CC", "deps": ["CC-MS2"], "status": "not_started", "units": 3, "done": 0, "sessions": "2",
     "brief": "platform_map.json; CAD/CAM operation equivalencies across P0 platforms.",
     "dispatchers": ["prism_knowledge"], "ext_tools": []},
    {"id": "CC-MS9", "title": "Manufacturability Validation Bridge", "track": "CC", "deps": ["CC-MS3", "CC-MS5", "CC-MS6"], "status": "not_started", "units": 6, "done": 0, "sessions": "4",
     "brief": "mfg_check.py, feature_analyze.py; S(x) >= 0.990 on all outputs; compound parameter safety.",
     "dispatchers": ["prism_safety", "prism_validate"], "ext_tools": []},
    {"id": "CC-MS10", "title": "Operator Guidance Interface", "track": "CC", "deps": ["CC-MS7", "CC-MS8"], "status": "not_started", "units": 4, "done": 0, "sessions": "2",
     "brief": "NL query handler spanning 3 domains; teach-me mode for on-demand learning.",
     "dispatchers": ["prism_intelligence"], "ext_tools": []},
    {"id": "CC-MS11", "title": "Integration Testing + Safety Certification", "track": "CC", "deps": ["CC-MS9", "CC-MS10"], "status": "not_started", "units": 8, "done": 0, "sessions": "4-5",
     "brief": "30+ videos tested, Omega >= 0.990, safety audit, boot integration verified.",
     "dispatchers": ["prism_ralph", "prism_omega", "prism_validate", "prism_safety"], "ext_tools": []},

    # CC-EXT
    {"id": "CC-EXT-MS1", "title": "PDF/Manual Knowledge Extraction Engine", "track": "CC-EXT", "deps": ["CC-MS11"], "status": "not_started", "units": 8, "done": 0, "sessions": "4-5",
     "brief": "Extract machining knowledge from PDF manuals, technical documents, and catalogs.",
     "dispatchers": ["prism_intelligence", "prism_dev"], "ext_tools": []},
    {"id": "CC-EXT-MS2", "title": "Operator Feedback Loop Engine", "track": "CC-EXT", "deps": ["CC-MS11"], "status": "not_started", "units": 8, "done": 0, "sessions": "4-5",
     "brief": "Capture, validate, and integrate real-world operator feedback into knowledge bases.",
     "dispatchers": ["prism_intelligence", "prism_dev"], "ext_tools": []},
    {"id": "CC-EXT-MS3", "title": "Sensor-Based Learning Engine", "track": "CC-EXT", "deps": ["CC-MS11"], "status": "not_started", "units": 6, "done": 0, "sessions": "3-4",
     "brief": "Ingest and learn from CNC sensor data: vibration, power, temperature, acoustic emission.",
     "dispatchers": ["prism_intelligence", "prism_dev"], "ext_tools": []},
    {"id": "CC-EXT-MS4", "title": "Quality Feedback Learning", "track": "CC-EXT", "deps": ["CC-MS11"], "status": "not_started", "units": 5, "done": 0, "sessions": "2-3",
     "brief": "Learn from CMM/quality inspection results to improve parameter predictions.",
     "dispatchers": ["prism_intelligence", "prism_dev"], "ext_tools": []},
    {"id": "CC-EXT-MS5", "title": "Cross-Source Knowledge Synthesis", "track": "CC-EXT", "deps": ["CC-EXT-MS1", "CC-EXT-MS2", "CC-EXT-MS3", "CC-EXT-MS4"], "status": "not_started", "units": 5, "done": 0, "sessions": "2-3",
     "brief": "Synthesize knowledge across all input sources with confidence scoring and conflict resolution.",
     "dispatchers": ["prism_intelligence", "prism_knowledge"], "ext_tools": []},
    {"id": "CC-EXT-MS6", "title": "CC-EXT Integration Testing + Safety Certification", "track": "CC-EXT", "deps": ["CC-EXT-MS5"], "status": "not_started", "units": 6, "done": 0, "sessions": "2-3",
     "brief": "Full integration testing of all CC-EXT engines with safety certification.",
     "dispatchers": ["prism_ralph", "prism_omega", "prism_validate", "prism_safety"], "ext_tools": []},

    # L9 - CAD/CAM Kernel
    {"id": "L9-P0-MS1", "title": "Port CAD Geometry Kernel", "track": "L9", "deps": ["L8-P2-MS2"], "status": "not_started", "units": 10, "done": 0, "sessions": "4-5",
     "brief": "Port CAD geometry kernel: B-Rep engine, NURBS surfaces, Boolean operations, STEP/IGES import/export.",
     "dispatchers": ["prism_dev", "prism_validate"], "ext_tools": []},
    {"id": "L9-P1-MS1", "title": "Port CAM Toolpath Algorithms", "track": "L9", "deps": ["L9-P0-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "3-4",
     "brief": "Port CAM toolpath algorithms: 680 strategies across roughing, finishing, drilling, threading, 5-axis.",
     "dispatchers": ["prism_toolpath", "prism_safety", "prism_calc", "prism_dev"], "ext_tools": []},
    {"id": "L9-P2-MS1", "title": "WebGL 3D Viewer", "track": "L9", "deps": ["L9-P1-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "3-4",
     "brief": "WebGL 3D viewer: Three.js/react-three-fiber, model loading, toolpath animation, measurement tools.",
     "dispatchers": ["prism_dev"], "ext_tools": ["Claude Preview", "Context7"]},

    # L10 - Enterprise
    {"id": "L10-P0-MS1", "title": "Security Middleware Stack", "track": "L10", "deps": ["L9-P2-MS1"], "status": "not_started", "units": 6, "done": 0, "sessions": "2-3",
     "brief": "Security middleware: RBAC, rate limiting, input sanitization, CSRF protection, security headers, audit logging.",
     "dispatchers": ["prism_dev", "prism_validate", "prism_compliance"], "ext_tools": []},
    {"id": "L10-P1-MS1", "title": "Monitoring, CI/CD & Deployment", "track": "L10", "deps": ["L10-P0-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "3-4",
     "brief": "Monitoring, CI/CD (GitHub Actions), Docker deployment, environment configuration.",
     "dispatchers": ["prism_dev", "prism_telemetry"], "ext_tools": []},
    {"id": "L10-P2-MS1", "title": "Cross-Cutting Features from PASS2", "track": "L10", "deps": ["L10-P1-MS1"], "status": "not_started", "units": 10, "done": 0, "sessions": "3-5",
     "brief": "Cross-cutting: i18n, accessibility, dark mode, keyboard shortcuts, offline support, data export/import.",
     "dispatchers": ["prism_dev"], "ext_tools": []},
    {"id": "L10-P3-MS1", "title": "CAD/CAM Features - Additional Items", "track": "L10", "deps": ["L10-P2-MS1"], "status": "not_started", "units": 8, "done": 0, "sessions": "2-3",
     "brief": "Remaining items from CAD/CAM features document: advanced probing, inline inspection, zero-defect preview.",
     "dispatchers": ["prism_dev", "prism_validate", "prism_safety"], "ext_tools": []},
]

def make_envelope(m):
    """Create a minimal valid RoadmapEnvelope for a milestone."""
    dispatchers = m.get("dispatchers", ["prism_dev"])
    ext_tools = m.get("ext_tools", [])

    tool_map = [{"tool": d, "phases": ["P0"]} for d in dispatchers]
    for et in ext_tools:
        tool_map.append({"tool": et, "phases": ["P0"], "purpose": "external"})

    return {
        "id": m["id"],
        "version": "3.1.0",
        "title": m["title"],
        "brief": m["brief"],
        "created_at": now,
        "created_by": "claude-opus-4.6",
        "phases": [{
            "id": "P0",
            "title": m["title"],
            "description": m["brief"],
            "sessions": m["sessions"],
            "primary_role": "R2",
            "primary_model": "sonnet-4.6",
            "units": [{
                "id": "P0-U01",
                "title": "Execute " + m["title"],
                "phase": "P0",
                "sequence": 0,
                "role": "R2",
                "role_name": "Implementer",
                "model": "sonnet-4.6",
                "effort": 80,
                "tools": [{"tool": d} for d in dispatchers],
                "skills": [],
                "scripts": [],
                "hooks": [],
                "features": ext_tools,
                "dependencies": [],
                "entry_conditions": [dep + " complete" for dep in m["deps"]],
                "exit_conditions": [m["title"] + " complete", "Build passes", "Tests pass"],
                "rollback": "git checkout -- [files modified by " + m["id"] + "]",
                "steps": [{"number": 1, "instruction": "Execute " + m["title"] + " per roadmap spec"}],
                "deliverables": [],
                "index_in_master": False,
                "creates_skill": False,
                "creates_script": False,
                "creates_hook": False,
                "creates_command": False,
            }],
            "gate": {
                "omega_floor": 0.75,
                "safety_floor": 0.70,
                "ralph_required": False,
                "ralph_grade_floor": "B",
                "anti_regression": True,
                "test_required": True,
                "build_required": True,
                "checkpoint": True,
                "learning_save": True,
                "custom_checks": [],
            },
            "scrutiny_checkpoint": False,
            "scrutiny_focus": [],
        }],
        "total_units": m["units"],
        "total_sessions": m["sessions"],
        "role_matrix": [{"code": "R2", "name": "Implementer", "model": "sonnet-4.6", "effort": 80}],
        "tool_map": tool_map,
        "deliverables_index": [],
        "existing_leverage": [],
        "scrutiny_config": {
            "pass_mode": "adaptive",
            "min_passes": 3,
            "max_passes": 7,
            "convergence_rule": "delta < 2",
            "escalation_rule": "if pass 4+ finds CRITICAL, flag for human review",
            "scrutinizer_model": "opus-4.6",
            "scrutinizer_effort": 90,
            "gap_categories": [
                "missing_tools", "missing_deps", "missing_exit_conditions",
                "missing_rollback", "sequence_errors",
            ],
            "improvement_threshold": 0.92,
        },
    }


# === 1. Generate roadmap-index.json ===
index = {
    "version": "3.1.0",
    "title": "PRISM App - Comprehensive Layered Roadmap v3.1 (Bottom-Up)",
    "updated_at": now,
    "milestones": [],
    "total_milestones": len(milestones),
    "completed_milestones": sum(1 for m in milestones if m["status"] == "complete"),
}

for m in milestones:
    index["milestones"].append({
        "id": m["id"],
        "title": m["title"],
        "track": m["track"],
        "dependencies": m["deps"],
        "status": m["status"],
        "total_units": m["units"],
        "completed_units": m["done"],
        "sessions": m["sessions"],
        "envelope_path": "milestones/" + m["id"] + ".json",
        "position_path": "state/" + m["id"] + "/position.json",
    })

index_path = os.path.join(BASE, "roadmap-index.json")
with open(index_path, "w", encoding="utf-8") as f:
    json.dump(index, f, indent=2)
print("roadmap-index.json: %d milestones" % len(milestones))

# === 2. Generate skeleton envelopes ===
ms_dir = os.path.join(BASE, "milestones")
os.makedirs(ms_dir, exist_ok=True)
created = 0
for m in milestones:
    envelope = make_envelope(m)
    path = os.path.join(ms_dir, m["id"] + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2)
    created += 1

print("Envelope files created: %d" % created)
files = sorted(os.listdir(ms_dir))
print("Files in milestones/: %d" % len(files))
for f in files[:5]:
    print("  " + f)
print("  ...")
for f in files[-3:]:
    print("  " + f)
