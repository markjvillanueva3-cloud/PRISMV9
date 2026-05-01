# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA CATEGORIES (27 categories, 490 formulas)
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_CATEGORIES = [
    "CUTTING", "THERMAL", "WEAR", "MATERIAL", "CHIP", "SURFACE", "VIBRATION",
    "POWER", "DEFLECTION", "TRIBOLOGY", "TOOL_GEOMETRY", "MACHINE", "GEOMETRIC",
    "PROCESS", "OPTIMIZATION", "AI_ML", "SIGNAL", "QUALITY", "ECONOMICS",
    "SCHEDULING", "SUSTAINABILITY", "COOLANT", "FIXTURE", "METROLOGY",
    "DIGITAL_TWIN", "HYBRID", "PRISM_META"
]

# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE CATEGORIES (11 categories, 447 engines)
# ═══════════════════════════════════════════════════════════════════════════════

ENGINE_CATEGORIES = [
    "PHYSICS", "AI_ML", "CAM", "CAD", "PROCESS_INTEL", "PRISM_UNIQUE",
    "INTEGRATION", "QUALITY", "BUSINESS", "DIGITAL_TWIN", "KNOWLEDGE"
]

# ═══════════════════════════════════════════════════════════════════════════════
# SKILL CATEGORIES (29 categories, 1,227 skills from expansion)
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_CATEGORIES = [
    "controller-programming", "cutting-physics", "material-science", 
    "cad-cam-toolpath", "machine-operations", "optimization-algorithms",
    "ai-ml-intelligence", "quality-metrology", "business-economics",
    "safety-compliance", "simulation-verification", "knowledge-integration",
    "process-intelligence", "digital-twin", "automation-robotics",
    "sustainability-green", "learning-adaptation", "collaboration-workflow",
    "documentation-reporting", "error-recovery", "session-management",
    "validation-testing", "data-pipeline", "api-integration",
    "user-experience", "performance-tuning", "security-auth",
    "deployment-ops", "monitoring-analytics"
]

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE → FORMULA CATEGORY MAPPINGS (EXHAUSTIVE)
# ═══════════════════════════════════════════════════════════════════════════════

DB_CAT_TO_FORMULA_CAT = {
    "MATERIALS": ["CUTTING", "THERMAL", "WEAR", "MATERIAL", "CHIP", "SURFACE", 
                  "VIBRATION", "POWER", "DEFLECTION", "TRIBOLOGY", "HYBRID",
                  "PROCESS", "QUALITY", "ECONOMICS", "SUSTAINABILITY", "DIGITAL_TWIN"],
    
    "MACHINES": ["MACHINE", "VIBRATION", "GEOMETRIC", "POWER", "DEFLECTION",
                 "PROCESS", "SCHEDULING", "QUALITY", "ECONOMICS", "DIGITAL_TWIN",
                 "CUTTING", "THERMAL", "COOLANT", "FIXTURE", "METROLOGY"],
    
    "TOOLS": ["CUTTING", "TOOL_GEOMETRY", "WEAR", "SURFACE", "THERMAL", "CHIP",
              "PROCESS", "ECONOMICS", "TRIBOLOGY", "POWER", "VIBRATION",
              "DEFLECTION", "QUALITY", "MATERIAL", "OPTIMIZATION"],
    
    "CONTROLLERS": ["MACHINE", "PROCESS", "QUALITY", "GEOMETRIC", "SIGNAL",
                    "DIGITAL_TWIN", "PRISM_META"],
    
    "ALARMS": ["MACHINE", "QUALITY", "PRISM_META", "PROCESS", "SIGNAL",
               "DIGITAL_TWIN", "ECONOMICS"],
    
    "GCODES": ["MACHINE", "GEOMETRIC", "PROCESS", "CUTTING", "TOOL_GEOMETRY",
               "COOLANT", "QUALITY"],
    
    "WORKHOLDING": ["FIXTURE", "DEFLECTION", "VIBRATION", "PROCESS", "QUALITY",
                    "GEOMETRIC", "MACHINE"],
    
    "BUSINESS": ["ECONOMICS", "SCHEDULING", "SUSTAINABILITY", "PROCESS", "QUALITY",
                 "OPTIMIZATION", "PRISM_META", "AI_ML"],
    
    "CATALOGS": ["CUTTING", "TOOL_GEOMETRY", "ECONOMICS", "MATERIAL", "WEAR",
                 "SURFACE", "PROCESS"],
    
    "CONSTANTS": FORMULA_CATEGORIES,  # Constants feed EVERYTHING
    
    "UNITS": FORMULA_CATEGORIES,  # Units feed EVERYTHING
    
    "KNOWLEDGE": ["AI_ML", "OPTIMIZATION", "PRISM_META", "HYBRID", "DIGITAL_TWIN",
                  "CUTTING", "THERMAL", "MATERIAL", "PROCESS", "QUALITY",
                  "GEOMETRIC", "MACHINE", "SIGNAL"],
    
    "ALGORITHMS": ["AI_ML", "OPTIMIZATION", "SIGNAL", "GEOMETRIC", "MACHINE",
                   "PROCESS", "QUALITY", "SCHEDULING", "PRISM_META", "HYBRID",
                   "CUTTING", "THERMAL", "VIBRATION"],
    
    "SIMULATION": ["GEOMETRIC", "MACHINE", "PROCESS", "DIGITAL_TWIN", "QUALITY",
                   "VIBRATION", "DEFLECTION", "THERMAL"],
    
    "POST": ["MACHINE", "GEOMETRIC", "PROCESS", "CUTTING", "TOOL_GEOMETRY"],
    
    "COOLANT": ["COOLANT", "THERMAL", "CUTTING", "WEAR", "SURFACE", "CHIP",
                "PROCESS", "SUSTAINABILITY"],
    
    "QUALITY": ["QUALITY", "METROLOGY", "PROCESS", "GEOMETRIC", "SURFACE",
                "ECONOMICS", "PRISM_META"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA CATEGORY → ENGINE CATEGORY MAPPINGS (EXHAUSTIVE)
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_CAT_TO_ENGINE_CAT = {
    "CUTTING": ["PHYSICS", "CAM", "AI_ML", "PROCESS_INTEL", "DIGITAL_TWIN"],
    "THERMAL": ["PHYSICS", "AI_ML", "DIGITAL_TWIN", "PROCESS_INTEL"],
    "WEAR": ["PHYSICS", "AI_ML", "QUALITY", "DIGITAL_TWIN"],
    "MATERIAL": ["PHYSICS", "AI_ML", "KNOWLEDGE", "PROCESS_INTEL"],
    "CHIP": ["PHYSICS", "CAM", "AI_ML", "PROCESS_INTEL"],
    "SURFACE": ["PHYSICS", "CAM", "QUALITY", "AI_ML", "DIGITAL_TWIN"],
    "VIBRATION": ["PHYSICS", "AI_ML", "DIGITAL_TWIN", "PROCESS_INTEL"],
    "POWER": ["PHYSICS", "PROCESS_INTEL", "AI_ML", "DIGITAL_TWIN"],
    "DEFLECTION": ["PHYSICS", "CAD", "AI_ML", "DIGITAL_TWIN"],
    "TRIBOLOGY": ["PHYSICS", "AI_ML", "PROCESS_INTEL"],
    "TOOL_GEOMETRY": ["CAD", "CAM", "PHYSICS", "AI_ML"],
    "MACHINE": ["CAM", "INTEGRATION", "DIGITAL_TWIN", "PROCESS_INTEL"],
    "GEOMETRIC": ["CAD", "CAM", "AI_ML", "DIGITAL_TWIN"],
    "PROCESS": ["PROCESS_INTEL", "AI_ML", "BUSINESS", "QUALITY"],
    "OPTIMIZATION": ["AI_ML", "PROCESS_INTEL", "PHYSICS", "CAM"],
    "AI_ML": ["AI_ML", "KNOWLEDGE", "PROCESS_INTEL", "PRISM_UNIQUE"],
    "SIGNAL": ["AI_ML", "PHYSICS", "DIGITAL_TWIN", "PROCESS_INTEL"],
    "QUALITY": ["QUALITY", "AI_ML", "PROCESS_INTEL", "BUSINESS"],
    "ECONOMICS": ["BUSINESS", "AI_ML", "PROCESS_INTEL"],
    "SCHEDULING": ["BUSINESS", "AI_ML", "PROCESS_INTEL"],
    "SUSTAINABILITY": ["BUSINESS", "PROCESS_INTEL", "AI_ML"],
    "COOLANT": ["PHYSICS", "PROCESS_INTEL", "DIGITAL_TWIN"],
    "FIXTURE": ["CAD", "CAM", "PHYSICS", "PROCESS_INTEL"],
    "METROLOGY": ["QUALITY", "CAD", "AI_ML", "INTEGRATION"],
    "DIGITAL_TWIN": ["DIGITAL_TWIN", "AI_ML", "PHYSICS", "INTEGRATION"],
    "HYBRID": ["AI_ML", "PHYSICS", "PRISM_UNIQUE", "DIGITAL_TWIN"],
    "PRISM_META": ["PRISM_UNIQUE", "AI_ML", "KNOWLEDGE", "INTEGRATION"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE CATEGORY → SKILL CATEGORY MAPPINGS (EXHAUSTIVE)
# ═══════════════════════════════════════════════════════════════════════════════

ENGINE_CAT_TO_SKILL_CAT = {
    "PHYSICS": ["cutting-physics", "material-science", "machine-operations",
                "simulation-verification", "knowledge-integration"],
    
    "AI_ML": ["ai-ml-intelligence", "optimization-algorithms", "learning-adaptation",
              "process-intelligence", "knowledge-integration", "performance-tuning"],
    
    "CAM": ["cad-cam-toolpath", "machine-operations", "controller-programming",
            "simulation-verification", "process-intelligence"],
    
    "CAD": ["cad-cam-toolpath", "simulation-verification", "knowledge-integration",
            "documentation-reporting"],
    
    "PROCESS_INTEL": ["process-intelligence", "optimization-algorithms", 
                      "quality-metrology", "learning-adaptation", "monitoring-analytics"],
    
    "PRISM_UNIQUE": ["knowledge-integration", "ai-ml-intelligence", 
                     "learning-adaptation", "process-intelligence", "session-management"],
    
    "INTEGRATION": ["api-integration", "data-pipeline", "automation-robotics",
                    "collaboration-workflow", "deployment-ops"],
    
    "QUALITY": ["quality-metrology", "validation-testing", "process-intelligence",
                "documentation-reporting", "safety-compliance"],
    
    "BUSINESS": ["business-economics", "optimization-algorithms", 
                 "documentation-reporting", "collaboration-workflow"],
    
    "DIGITAL_TWIN": ["digital-twin", "simulation-verification", "monitoring-analytics",
                     "ai-ml-intelligence", "process-intelligence"],
    
    "KNOWLEDGE": ["knowledge-integration", "learning-adaptation", "ai-ml-intelligence",
                  "documentation-reporting", "data-pipeline"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# SKILL CATEGORY → PRODUCT MAPPINGS (EXHAUSTIVE)
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_CAT_TO_PRODUCT = {
    # Speed & Feed Calculator needs these skills
    "SPEED_FEED_CALCULATOR": [
        "cutting-physics", "material-science", "machine-operations",
        "optimization-algorithms", "ai-ml-intelligence", "quality-metrology",
        "safety-compliance", "knowledge-integration", "process-intelligence",
        "learning-adaptation", "user-experience", "validation-testing",
        "session-management", "error-recovery", "documentation-reporting"
    ],
    
    # Post Processor needs these skills
    "POST_PROCESSOR": [
        "controller-programming", "machine-operations", "cad-cam-toolpath",
        "simulation-verification", "validation-testing", "knowledge-integration",
        "api-integration", "error-recovery", "documentation-reporting",
        "user-experience", "session-management"
    ],
    
    # Shop Manager needs these skills
    "SHOP_MANAGER": [
        "business-economics", "optimization-algorithms", "quality-metrology",
        "collaboration-workflow", "documentation-reporting", "process-intelligence",
        "data-pipeline", "monitoring-analytics", "user-experience",
        "learning-adaptation", "session-management"
    ],
    
    # Auto CNC Programmer needs ALL skills (most complex product)
    "AUTO_CNC_PROGRAMMER": SKILL_CATEGORIES,  # Uses everything!
}
