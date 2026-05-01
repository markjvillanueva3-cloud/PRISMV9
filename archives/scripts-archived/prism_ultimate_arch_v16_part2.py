#!/usr/bin/env python3
"""
PRISM ULTIMATE ARCHITECTURE v16.0 - PART 2
ENGINE, SKILL, SERVICE, PRODUCT LAYERS + PRECISE WIRING
"""

import json
import os
from datetime import datetime
from collections import defaultdict

OUTPUT_PATH = r"C:\PRISM\registries"

# Continue ARCHITECTURE from Part 1
ARCHITECTURE_PART2 = {
    "layers": {
        # ───────────────────────────────────────────────────────────────────────
        # ENGINE LAYER (L2): Executable implementations
        # ───────────────────────────────────────────────────────────────────────
        "L_ENGINE": {
            "level": 2,
            "name": "ENGINE",
            "description": "Executable implementations of formulas",
            "organization": "Function > Domain > Capability",
            "hierarchy": {
                "CALCULATORS": {
                    "PHYSICS": {
                        "FORCE": ["KienzleForceEngine", "MerchantForceEngine", "OxleyForceEngine", "FEMForceEngine"],
                        "THERMAL": ["AnalyticalThermalEngine", "FEMThermalEngine", "CFDThermalEngine"],
                        "VIBRATION": ["ModalAnalysisEngine", "HarmonicResponseEngine", "StabilityLobeEngine"],
                        "WEAR": ["TaylorWearEngine", "UsuiWearEngine", "WearMapEngine"],
                        "SURFACE": ["RoughnessEngine", "IntegrityEngine"],
                        "DEFLECTION": ["DeflectionEngine", "StiffnessEngine"],
                    },
                    "ECONOMICS": {
                        "COST": ["CostEstimationEngine", "ToolCostEngine", "MachineCostEngine"],
                        "TIME": ["CycleTimeEngine", "SetupTimeEngine"],
                        "PRODUCTIVITY": ["OEEEngine", "UtilizationEngine"],
                    },
                },
                "PREDICTORS": {
                    "PHYSICS_BASED": ["PhysicsPredictionEngine", "HybridPredictionEngine"],
                    "ML_BASED": {
                        "REGRESSION": ["NNRegressionEngine", "RFRegressionEngine", "GPRegressionEngine"],
                        "CLASSIFICATION": ["SVMClassificationEngine", "RFClassificationEngine"],
                    },
                    "ENSEMBLE": ["EnsemblePredictionEngine", "StackingEngine"],
                },
                "OPTIMIZERS": {
                    "SINGLE_OBJ": {
                        "GRADIENT": ["GradientDescentEngine", "AdamEngine", "LBFGSEngine"],
                        "METAHEURISTIC": ["PSOEngine", "GAEngine", "SAEngine", "TabuEngine"],
                    },
                    "MULTI_OBJ": {
                        "EVOLUTIONARY": ["NSGA2Engine", "NSGA3Engine", "MOEADEngine"],
                    },
                    "BAYESIAN": ["BayesianOptEngine", "TPEEngine"],
                },
                "VALIDATORS": {
                    "PHYSICS": ["PhysicsValidatorEngine", "ConservationCheckEngine"],
                    "SAFETY": ["SafetyValidatorEngine", "LimitCheckEngine", "CollisionCheckEngine"],
                    "QUALITY": ["QualityValidatorEngine", "OmegaCheckEngine"],
                },
                "SELECTORS": {
                    "MATERIAL": ["MaterialSelectorEngine", "MachinabilitySelectorEngine"],
                    "TOOL": ["ToolSelectorEngine", "InsertSelectorEngine", "CoatingSelectorEngine"],
                    "PROCESS": ["ProcessSelectorEngine", "StrategySelectorEngine"],
                },
                "GENERATORS": {
                    "CAM": {
                        "TOOLPATH": ["2DToolpathEngine", "3DToolpathEngine", "5AxisToolpathEngine"],
                        "STRATEGY": ["HSMEngine", "AdaptiveEngine", "TrochoidalEngine"],
                    },
                    "POST": ["PostProcessorEngine", "GCodeGeneratorEngine", "MacroGeneratorEngine"],
                    "REPORT": ["ReportGeneratorEngine", "DocumentationEngine"],
                },
                "ANALYZERS": {
                    "CAD": {
                        "GEOMETRY": ["FeatureRecognitionEngine", "ToleranceAnalysisEngine"],
                        "DFM": ["DFMAnalysisEngine", "CostDriverEngine"],
                    },
                    "SIMULATION": ["StockSimulationEngine", "CollisionSimulationEngine", "KinematicSimEngine"],
                },
                "MONITORS": {
                    "PROCESS": ["ProcessMonitorEngine", "AdaptiveControlEngine"],
                    "TOOL": ["WearMonitorEngine", "BreakageDetectionEngine"],
                    "QUALITY": ["SPCEngine", "InspectionEngine"],
                },
            },
        },
        
        # ───────────────────────────────────────────────────────────────────────
        # INTERFACE LAYER (L3): Contracts and APIs
        # ───────────────────────────────────────────────────────────────────────
        "L_INTERFACE": {
            "level": 3,
            "name": "INTERFACE",
            "description": "API contracts and adapters",
            "components": {
                "CONTRACTS": {
                    "ENGINE_CONTRACTS": ["IForceEngine", "IThermalEngine", "IVibrationEngine", "IWearEngine",
                                        "IOptimizerEngine", "IValidatorEngine", "IGeneratorEngine"],
                    "SERVICE_CONTRACTS": ["ICalculationService", "IOptimizationService", "IGenerationService"],
                    "DATA_CONTRACTS": ["IMaterialData", "IMachineData", "IToolData"],
                },
                "ADAPTERS": {
                    "LEGACY": ["V8ToV9Adapter", "LegacyMaterialAdapter"],
                    "EXTERNAL": ["CADAdapter", "ERPAdapter", "MESAdapter"],
                    "FORMAT": ["JSONAdapter", "XMLAdapter", "CSVAdapter"],
                },
                "GATEWAYS": {
                    "API": ["RESTGateway", "GraphQLGateway", "gRPCGateway"],
                    "EVENT": ["EventBusGateway", "WebSocketGateway"],
                    "FILE": ["FileSystemGateway", "CloudStorageGateway"],
                },
            },
        },
        
        # ───────────────────────────────────────────────────────────────────────
        # ORCHESTRATOR LAYER (L4): Workflow coordination
        # ───────────────────────────────────────────────────────────────────────
        "L_ORCHESTRATOR": {
            "level": 4,
            "name": "ORCHESTRATOR",
            "description": "Multi-engine coordination and workflows",
            "patterns": {
                "SEQUENTIAL": ["Pipeline", "Chain", "Saga"],
                "PARALLEL": ["FanOutIn", "ScatterGather", "MapReduce"],
                "CONDITIONAL": ["DecisionTree", "StateMachine", "RuleEngine"],
                "REACTIVE": ["EventDriven", "StreamProcessor", "CQRS"],
            },
            "orchestrators": {
                "CALCULATION": ["SpeedFeedOrchestrator", "ForceOrchestrator", "ThermalOrchestrator"],
                "OPTIMIZATION": ["ParameterOptOrchestrator", "MultiObjOptOrchestrator"],
                "GENERATION": ["ToolpathOrchestrator", "PostProcessOrchestrator"],
                "ANALYSIS": ["DFMOrchestrator", "SimulationOrchestrator"],
            },
        },
        
        # ───────────────────────────────────────────────────────────────────────
        # SKILL LAYER (L5): High-level capabilities
        # ───────────────────────────────────────────────────────────────────────
        "L_SKILL": {
            "level": 5,
            "name": "SKILL",
            "description": "High-level manufacturing intelligence capabilities",
            "organization": "Domain > Complexity > UserLevel",
            "hierarchy": {
                "CUTTING_PHYSICS": {
                    "BASIC": ["force-calculation", "power-calculation", "mrr-calculation"],
                    "INTERMEDIATE": ["thermal-analysis", "vibration-analysis", "wear-prediction"],
                    "ADVANCED": ["stability-optimization", "multi-physics-coupling"],
                },
                "MATERIAL_SCIENCE": {
                    "BASIC": ["material-lookup", "machinability-rating"],
                    "INTERMEDIATE": ["material-selection", "condition-optimization"],
                    "ADVANCED": ["material-modeling", "alloy-development"],
                },
                "MACHINE_OPERATIONS": {
                    "BASIC": ["machine-selection", "setup-planning"],
                    "INTERMEDIATE": ["cycle-optimization", "fixture-planning"],
                    "ADVANCED": ["adaptive-control", "predictive-maintenance"],
                },
                "TOOL_MANAGEMENT": {
                    "BASIC": ["tool-selection", "tool-life-estimation"],
                    "INTERMEDIATE": ["tool-optimization", "wear-monitoring"],
                    "ADVANCED": ["tool-path-optimization", "custom-tool-design"],
                },
                "QUALITY": {
                    "BASIC": ["surface-finish-prediction", "tolerance-analysis"],
                    "INTERMEDIATE": ["spc-monitoring", "inspection-planning"],
                    "ADVANCED": ["root-cause-analysis", "process-capability"],
                },
                "ECONOMICS": {
                    "BASIC": ["cost-estimation", "cycle-time-estimation"],
                    "INTERMEDIATE": ["quote-generation", "scheduling"],
                    "ADVANCED": ["capacity-planning", "business-analytics"],
                },
                "CAD_CAM": {
                    "BASIC": ["feature-recognition", "basic-toolpath"],
                    "INTERMEDIATE": ["advanced-toolpath", "simulation"],
                    "ADVANCED": ["adaptive-strategies", "5-axis-programming"],
                },
                "CONTROLLER": {
                    "BASIC": ["gcode-reference", "alarm-lookup"],
                    "INTERMEDIATE": ["post-processor-config", "macro-programming"],
                    "ADVANCED": ["custom-post-development", "controller-integration"],
                },
                "PRISM_META": {
                    "BASIC": ["session-management", "state-tracking"],
                    "INTERMEDIATE": ["skill-orchestration", "resource-selection"],
                    "ADVANCED": ["cognitive-enhancement", "learning-optimization"],
                },
            },
        },
        
        # ───────────────────────────────────────────────────────────────────────
        # SERVICE LAYER (L6): Business logic
        # ───────────────────────────────────────────────────────────────────────
        "L_SERVICE": {
            "level": 6,
            "name": "SERVICE",
            "description": "Business logic and domain services",
            "services": {
                "CALCULATION_SERVICES": {
                    "SpeedFeedService": {
                        "operations": ["calculateOptimalSpeed", "calculateOptimalFeed", "calculateDepthOfCut"],
                        "skills": ["force-calculation", "power-calculation", "thermal-analysis", "wear-prediction"],
                    },
                    "ForceService": {
                        "operations": ["calculateCuttingForce", "calculateTorque", "calculatePower"],
                        "skills": ["force-calculation"],
                    },
                    "ThermalService": {
                        "operations": ["calculateTemperature", "analyzeHeatPartition", "predictCoolantEffect"],
                        "skills": ["thermal-analysis"],
                    },
                    "VibrationService": {
                        "operations": ["analyzeStability", "generateStabilityLobe", "optimizeSpeed"],
                        "skills": ["vibration-analysis", "stability-optimization"],
                    },
                    "WearService": {
                        "operations": ["predictToolLife", "estimateWearRate", "recommendToolChange"],
                        "skills": ["tool-life-estimation", "wear-monitoring"],
                    },
                },
                "GENERATION_SERVICES": {
                    "PostProcessorService": {
                        "operations": ["generateGCode", "translateCAM", "customizeOutput"],
                        "skills": ["post-processor-config", "gcode-reference"],
                    },
                    "ToolpathService": {
                        "operations": ["generateToolpath", "optimizePath", "verifyPath"],
                        "skills": ["basic-toolpath", "advanced-toolpath", "simulation"],
                    },
                    "ReportService": {
                        "operations": ["generateSetupSheet", "generateCostReport", "generateQualityReport"],
                        "skills": ["cost-estimation", "quality-prediction"],
                    },
                },
                "MANAGEMENT_SERVICES": {
                    "QuoteService": {
                        "operations": ["estimateCost", "calculateLeadTime", "generateQuote"],
                        "skills": ["cost-estimation", "cycle-time-estimation", "quote-generation"],
                    },
                    "ScheduleService": {
                        "operations": ["planProduction", "optimizeSchedule", "trackProgress"],
                        "skills": ["scheduling", "capacity-planning"],
                    },
                    "InventoryService": {
                        "operations": ["trackTools", "manageMaterials", "reorderAlerts"],
                        "skills": ["tool-management", "material-management"],
                    },
                },
                "ANALYSIS_SERVICES": {
                    "DFMService": {
                        "operations": ["analyzeMachinability", "suggestImprovements", "estimateCost"],
                        "skills": ["feature-recognition", "machinability-rating", "cost-estimation"],
                    },
                    "SimulationService": {
                        "operations": ["simulateMachining", "detectCollisions", "verifyProgram"],
                        "skills": ["simulation", "collision-detection"],
                    },
                },
            },
        },
        
        # ───────────────────────────────────────────────────────────────────────
        # PRODUCT LAYER (L7): User-facing applications
        # ───────────────────────────────────────────────────────────────────────
        "L_PRODUCT": {
            "level": 7,
            "name": "PRODUCT",
            "description": "User-facing applications",
            "products": {
                "SPEED_FEED_CALCULATOR": {
                    "description": "Calculate optimal cutting parameters",
                    "services": ["SpeedFeedService", "ForceService", "ThermalService", 
                               "VibrationService", "WearService"],
                    "primary_value": "Safe, optimal cutting parameters",
                },
                "POST_PROCESSOR": {
                    "description": "Generate machine-specific G-code",
                    "services": ["PostProcessorService", "ToolpathService", "SimulationService"],
                    "primary_value": "Correct, verified G-code",
                },
                "SHOP_MANAGER": {
                    "description": "Quoting, scheduling, inventory management",
                    "services": ["QuoteService", "ScheduleService", "InventoryService", "ReportService"],
                    "primary_value": "Business efficiency",
                },
                "AUTO_CNC_PROGRAMMER": {
                    "description": "Automated CAM programming",
                    "services": ["ToolpathService", "SimulationService", "DFMService", 
                               "PostProcessorService", "SpeedFeedService"],
                    "primary_value": "Fast, correct programs",
                },
            },
        },
    },
    
    # ───────────────────────────────────────────────────────────────────────────
    # CROSS-CUTTING CONCERNS
    # ───────────────────────────────────────────────────────────────────────────
    "cross_cutting": {
        "LOGGING": {
            "levels": ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"],
            "contexts": ["REQUEST_ID", "USER_ID", "SESSION_ID", "CALCULATION_ID"],
            "format": "STRUCTURED_JSON",
            "retention": {"DEBUG": "7d", "INFO": "30d", "ERROR": "1y"},
        },
        "METRICS": {
            "types": ["COUNTER", "GAUGE", "HISTOGRAM", "SUMMARY"],
            "dimensions": ["LATENCY", "THROUGHPUT", "ERROR_RATE", "CACHE_HIT"],
            "aggregation": ["P50", "P95", "P99", "MAX", "AVG"],
        },
        "CACHING": {
            "levels": ["L1_MEMORY", "L2_REDIS", "L3_DATABASE"],
            "strategies": ["LRU", "LFU", "TTL", "WRITE_THROUGH"],
            "invalidation": ["TIME", "EVENT", "VERSION"],
        },
        "EVENTS": {
            "patterns": ["PUB_SUB", "EVENT_SOURCING", "CQRS"],
            "types": ["DOMAIN_EVENT", "INTEGRATION_EVENT", "SYSTEM_EVENT"],
        },
        "ERRORS": {
            "categories": ["VALIDATION", "BUSINESS", "SYSTEM", "EXTERNAL"],
            "handling": ["RETRY", "CIRCUIT_BREAKER", "FALLBACK", "DEAD_LETTER"],
        },
        "AUDIT": {
            "events": ["CALCULATION", "MODIFICATION", "ACCESS", "ERROR"],
            "retention": "FOREVER_FOR_SAFETY_CRITICAL",
            "compliance": ["ISO_13485", "AS9100", "ITAR"],
        },
        "VERSIONING": {
            "scheme": "SEMVER",
            "compatibility": ["BACKWARD", "FORWARD", "FULL"],
            "migration": ["AUTOMATIC", "MANUAL"],
        },
    },
}

# Save Part 2
output_path = os.path.join(OUTPUT_PATH, "ARCHITECTURE_v16_LAYERS.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(ARCHITECTURE_PART2, f, indent=2)
print(f"Saved: {output_path}")

# Count everything
def count_items(obj, depth=0):
    count = 0
    if isinstance(obj, dict):
        for v in obj.values():
            count += count_items(v, depth + 1)
    elif isinstance(obj, list):
        count += len(obj)
    return count

for layer_id, layer in ARCHITECTURE_PART2['layers'].items():
    items = count_items(layer)
    print(f"  {layer_id}: {items} items")
