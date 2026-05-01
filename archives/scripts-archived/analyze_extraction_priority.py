"""
Comprehensive extraction inventory and prioritization.
Identifies all engines, algorithms, and formulas remaining in monolith.
Prioritizes by development skill improvement potential.
"""
import json
import re
from pathlib import Path
from collections import defaultdict

# Read the inventory
inv_path = Path(r'C:\PRISM\extracted_modules\MONOLITH_MODULE_INVENTORY.json')
inv = json.loads(inv_path.read_text(encoding='utf-8'))

# All modules
all_modules = inv['modules_by_type'].get('const_modules', [])
print(f"Total modules in inventory: {len(all_modules)}")

# Already extracted (from priority extraction)
already_extracted = [
    'PRISM_JOHNSON_COOK_DATABASE',
    'PRISM_CUTTING_MECHANICS_ENGINE',
    'PRISM_CHATTER_PREDICTION_ENGINE',
    'PRISM_SURFACE_FINISH_LOOKUP',
    'PRISM_THERMAL_COMPENSATION',
    'PRISM_THREADING_LOOKUP',
    'PRISM_MACHINING_PROCESS_DATABASE',
    'PRISM_COMPREHENSIVE_CAM_STRATEGIES',
    'PRISM_3D_TOOLPATH_STRATEGY_ENGINE',
    'PRISM_ADAPTIVE_HSM_ENGINE',
    'PRISM_HYBRID_TOOLPATH_SYNTHESIZER',
    'PRISM_MACHINE_KINEMATICS_ENGINE',
    'PRISM_CONTROLLER_DATABASE',
    'PRISM_EXPANDED_POST_PROCESSORS',
    'PRISM_COORDINATE_TRANSFORM_ENGINE',
    'PRISM_TOLERANCE_ANALYSIS_ENHANCED',
    'PRISM_CUTTING_TOOL_DATABASE_V2',
    'PRISM_STEEL_ENDMILL_DB_V2',
    'PRISM_CONSOLIDATED_MATERIALS',
]

# Categorize remaining modules by type for prioritization
categories = {
    # PRIORITY 1: AI/ML Engines (improve my intelligence)
    'AI_ML_ENGINES': [],
    
    # PRIORITY 2: Physics/Calculation Engines (improve my manufacturing knowledge)
    'PHYSICS_ENGINES': [],
    
    # PRIORITY 3: Geometry/CAD Engines (improve spatial reasoning)
    'GEOMETRY_ENGINES': [],
    
    # PRIORITY 4: Database/Reference (improve lookup ability)
    'DATABASES': [],
    
    # PRIORITY 5: Integration/System (improve orchestration)
    'SYSTEM': [],
    
    # Lower priority
    'UI_CSS': [],
    'TEST': [],
    'OTHER': [],
}

# Classification patterns
patterns = {
    'AI_ML_ENGINES': [
        'NEURAL', 'DEEP_LEARNING', 'TRANSFORMER', 'ATTENTION', 'LSTM', 'GRU', 'RNN',
        'PSO', 'GENETIC', 'SWARM', 'OPTIMIZATION', 'BAYESIAN', 'MONTE_CARLO',
        'LEARNING', 'CLASSIFIER', 'CLUSTERING', 'REGRESSION', 'KALMAN', 'FILTER',
        'HYPEROPT', 'NAS', 'AUTOML', 'GAN', 'VAE', 'DQN', 'REINFORCEMENT',
        'XAI', 'EXPLAINABLE', 'ENSEMBLE', 'GRADIENT', 'FEATURE'
    ],
    'PHYSICS_ENGINES': [
        'CUTTING', 'THERMAL', 'FORCE', 'STRESS', 'DEFLECTION', 'WEAR',
        'VIBRATION', 'DYNAMICS', 'KINEMATICS', 'MECHANICS', 'FRICTION',
        'HEAT', 'TRANSFER', 'FATIGUE', 'MATERIAL', 'SURFACE_FINISH',
        'CHIP', 'STABILITY', 'CHATTER', 'TAYLOR', 'JOHNSON_COOK', 'KIENZLE'
    ],
    'GEOMETRY_ENGINES': [
        'GEOMETRY', 'MESH', 'TESSELLATION', 'BREP', 'CSG', 'BOOLEAN',
        'NURBS', 'BSPLINE', 'BEZIER', 'OCTREE', 'POINT_CLOUD',
        'COLLISION', 'INTERSECTION', 'CONVEX', 'HULL', 'SDF',
        'CAD', 'FEATURE', 'RECOGNITION', 'SHAPE', 'SURFACE'
    ],
    'DATABASES': [
        'DATABASE', 'DB', 'LOOKUP', 'TABLE', 'CATALOG', 'MATERIAL',
        'MACHINE', 'TOOL', 'CONTROLLER', 'POST_PROCESSOR', 'THREAD',
        'TOLERANCE', 'FIXTURE', 'HOLDER', 'INSERT', 'GRADE'
    ],
    'SYSTEM': [
        'GATEWAY', 'EVENT', 'STATE', 'CACHE', 'INTEGRATION', 'BRIDGE',
        'COORDINATOR', 'SCHEDULER', 'WORKFLOW', 'MANAGER', 'HANDLER'
    ],
    'UI_CSS': [
        'UI', 'CSS', 'THEME', 'DESIGN', 'RENDER', 'ANIMATION', 'DND', 'SLIDER'
    ],
    'TEST': [
        'TEST', 'SELF_TEST', 'RETROFIT', 'DEV_ENHANCEMENT'
    ]
}

# Classify each module
for module in all_modules:
    if module in already_extracted:
        continue
    
    classified = False
    for category, keywords in patterns.items():
        for keyword in keywords:
            if keyword in module.upper():
                categories[category].append(module)
                classified = True
                break
        if classified:
            break
    
    if not classified:
        categories['OTHER'].append(module)

# Print summary
print("\n" + "=" * 70)
print("EXTRACTION PRIORITY SUMMARY")
print("=" * 70)

total_remaining = 0
for category, modules in categories.items():
    count = len(modules)
    total_remaining += count
    print(f"\n{category}: {count} modules")
    # Show top 10
    for mod in modules[:10]:
        print(f"  - {mod}")
    if len(modules) > 10:
        print(f"  ... and {len(modules) - 10} more")

print(f"\n{'=' * 70}")
print(f"Total remaining to extract: {total_remaining}")
print(f"Already extracted: {len(already_extracted)}")

# Save prioritized list
output = {
    'summary': {
        'total_in_inventory': len(all_modules),
        'already_extracted': len(already_extracted),
        'remaining': total_remaining
    },
    'priority_order': [
        'AI_ML_ENGINES',
        'PHYSICS_ENGINES', 
        'GEOMETRY_ENGINES',
        'DATABASES',
        'SYSTEM',
        'OTHER'
    ],
    'by_category': {k: v for k, v in categories.items() if k not in ['UI_CSS', 'TEST']}
}

output_path = Path(r'C:\PRISM\extracted_modules\EXTRACTION_PRIORITY_LIST.json')
output_path.write_text(json.dumps(output, indent=2), encoding='utf-8')
print(f"\nSaved priority list to: {output_path}")
