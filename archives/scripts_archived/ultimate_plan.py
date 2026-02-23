"""
ULTIMATE SKILL GAP ANALYSIS AND CREATION PLAN
Cross-references ALL existing skills with ALL extracted modules
Creates comprehensive skill creation + MCP server plan
"""
import json
from pathlib import Path
from collections import defaultdict

print("=" * 80)
print("ULTIMATE SKILL CREATION PLAN")
print("=" * 80)

# Load audit data
reclass = json.loads(Path(r'C:\PRISM\DEEP_RECLASSIFICATION.json').read_text())
audit = json.loads(Path(r'C:\PRISM\COMPREHENSIVE_AUDIT_REPORT.json').read_text())

# Get existing skill names and their topics
existing_skills = audit['skill_details']
existing_topics = set()
for skill, info in existing_skills.items():
    existing_topics.update(info.get('topics', []))
    # Also add skill name parts as coverage
    parts = skill.replace('prism-', '').split('-')
    existing_topics.update(parts)

print("\nExisting skill topic coverage:")
print("  {} unique topics across {} skills".format(len(existing_topics), len(existing_skills)))
print("  Topics: {}...".format(', '.join(sorted(existing_topics)[:20])))

# Define what existing skills already cover
EXISTING_SKILL_COVERAGE = {
    # Skill name -> what categories it covers
    'prism-material-physics': ['MATERIAL', 'CUTTING_PHYSICS', 'TOOL_LIFE'],
    'prism-material-schema': ['MATERIAL'],
    'prism-material-lookup': ['MATERIAL'],
    'prism-ai-optimization': ['OPTIMIZATION'],
    'prism-ai-deep-learning': ['DEEP_LEARNING', 'NEURAL_NETWORK'],
    'prism-learning-engines': ['LEARNING_SYS'],
    'prism-signal-processing': ['SIGNAL_PROC', 'VIBRATION'],
    'prism-cutting-mechanics': ['CUTTING_PHYSICS'],
    'prism-cam-strategies': ['CAM_TOOLPATH'],
    'prism-cutting-tools': ['TOOL_DB'],
    'prism-fanuc-programming': ['CONTROLLER', 'POST_PROCESSOR'],
    'prism-siemens-programming': ['CONTROLLER', 'POST_PROCESSOR'],
    'prism-heidenhain-programming': ['CONTROLLER', 'POST_PROCESSOR'],
    'prism-gcode-reference': ['POST_PROCESSOR'],
    'prism-error-catalog': ['ALARM'],
    'prism-manufacturing-tables': ['STANDARDS', 'THREAD'],
}

# Calculate which categories are truly uncovered
covered_categories = set()
for skill, cats in EXISTING_SKILL_COVERAGE.items():
    covered_categories.update(cats)

print("\nCategories covered by existing skills: {}".format(len(covered_categories)))
print("  {}".format(sorted(covered_categories)))

# Get all categories from reclassification
all_categories = reclass['categories']
uncovered = {}
for cat, info in all_categories.items():
    if cat not in covered_categories:
        uncovered[cat] = info

print("\nUNCOVERED CATEGORIES: {}".format(len(uncovered)))

# ============================================================================
# COMPREHENSIVE SKILL CREATION PLAN
# ============================================================================
print("\n" + "=" * 80)
print("COMPREHENSIVE SKILL CREATION PLAN")
print("=" * 80)

skill_plan = []

# TIER 1: HIGH-VALUE SKILLS (>1MB of source content)
tier1 = []
for cat, info in sorted(uncovered.items(), key=lambda x: x[1]['size'], reverse=True):
    if info['size'] > 1_000_000:  # >1MB
        tier1.append({
            'skill_name': 'prism-{}'.format(cat.lower().replace('_', '-')),
            'category': cat,
            'modules': info['count'],
            'size_kb': info['size'] // 1000,
            'source_modules': info['modules'][:10],
            'tier': 1,
            'priority': 'HIGH'
        })

# TIER 2: MEDIUM-VALUE SKILLS (100KB - 1MB)
tier2 = []
for cat, info in sorted(uncovered.items(), key=lambda x: x[1]['size'], reverse=True):
    if 100_000 < info['size'] <= 1_000_000:
        tier2.append({
            'skill_name': 'prism-{}'.format(cat.lower().replace('_', '-')),
            'category': cat,
            'modules': info['count'],
            'size_kb': info['size'] // 1000,
            'source_modules': info['modules'][:10],
            'tier': 2,
            'priority': 'MEDIUM'
        })

# TIER 3: LOWER-VALUE SKILLS (10KB - 100KB)
tier3 = []
for cat, info in sorted(uncovered.items(), key=lambda x: x[1]['size'], reverse=True):
    if 10_000 < info['size'] <= 100_000:
        tier3.append({
            'skill_name': 'prism-{}'.format(cat.lower().replace('_', '-')),
            'category': cat,
            'modules': info['count'],
            'size_kb': info['size'] // 1000,
            'source_modules': info['modules'][:10],
            'tier': 3,
            'priority': 'LOW'
        })

skill_plan = tier1 + tier2 + tier3

print("\nTIER 1 - HIGH VALUE (>1MB source):")
for s in tier1:
    print("  {} - {} modules, {} KB".format(s['skill_name'], s['modules'], s['size_kb']))
    print("    Sources: {}...".format(', '.join(s['source_modules'][:3])))

print("\nTIER 2 - MEDIUM VALUE (100KB-1MB):")
for s in tier2:
    print("  {} - {} modules, {} KB".format(s['skill_name'], s['modules'], s['size_kb']))

print("\nTIER 3 - LOWER VALUE (10KB-100KB):")
for s in tier3:
    print("  {} - {} modules, {} KB".format(s['skill_name'], s['modules'], s['size_kb']))

# ============================================================================
# SPECIAL SKILLS FOR UNCATEGORIZED MEGA-MODULES
# ============================================================================
print("\n" + "=" * 80)
print("SPECIAL SKILLS FOR MEGA UNCATEGORIZED MODULES")
print("=" * 80)

uncategorized = reclass['still_uncategorized']

# Load module sizes
extracted_base = Path(r'C:\PRISM\extracted_modules')
mod_sizes = {}
for subdir in extracted_base.iterdir():
    if subdir.is_dir():
        for f in subdir.glob('*.js'):
            mod_sizes[f.stem] = f.stat().st_size

# Find mega uncategorized
mega_uncat = []
for mod in uncategorized:
    size = mod_sizes.get(mod, 0)
    if size > 500_000:  # >500KB
        mega_uncat.append((mod, size))

mega_uncat.sort(key=lambda x: x[1], reverse=True)

special_skills = [
    {'skill_name': 'prism-subscription-system', 'source': 'PRISM_SUBSCRIPTION_SYSTEM', 'size': 8656489, 'purpose': 'User management, subscriptions'},
    {'skill_name': 'prism-units-conversion', 'source': 'PRISM_UNITS_ENHANCED', 'size': 5512692, 'purpose': 'Unit conversion system'},
    {'skill_name': 'prism-precision-math', 'source': 'PRISM_PRECISION', 'size': 5462304, 'purpose': 'High-precision calculations'},
    {'skill_name': 'prism-comparison-engine', 'source': 'PRISM_COMPARE', 'size': 5352371, 'purpose': 'Comparison/diff algorithms'},
    {'skill_name': 'prism-parts-database', 'source': 'PRISM_EMBEDDED_PARTS_DATABASE', 'size': 4204027, 'purpose': 'Example parts library'},
    {'skill_name': 'prism-parameter-engine', 'source': 'PRISM_PARAM_ENGINE', 'size': 2348866, 'purpose': 'Parameter management'},
    {'skill_name': 'prism-pattern-recognition', 'source': 'PRISM_PATTERN_ENGINE', 'size': 2210098, 'purpose': 'Pattern detection/matching'},
    {'skill_name': 'prism-ml-core', 'source': 'PRISM_ML', 'size': 2041771, 'purpose': 'Core ML algorithms'},
    {'skill_name': 'prism-structural-mechanics', 'source': 'PRISM_STRUCTURAL_MECHANICS', 'size': 1497719, 'purpose': 'Structural analysis'},
    {'skill_name': 'prism-control-systems', 'source': 'PRISM_CONTROL', 'size': 1191320, 'purpose': 'Control theory/systems'},
    {'skill_name': 'prism-ai-wrapper', 'source': 'PRISM_AI_100_ENGINE_WRAPPER', 'size': 935205, 'purpose': 'AI engine integration'},
    {'skill_name': 'prism-smoothing-algorithms', 'source': 'PRISM_LAPLACIAN_SMOOTHING_ENGINE', 'size': 901564, 'purpose': 'Smoothing/filtering'},
    {'skill_name': 'prism-algorithm-strategies', 'source': 'PRISM_ALGORITHM_STRATEGIES', 'size': 806140, 'purpose': 'Algorithm selection'},
    {'skill_name': 'prism-core-algorithms', 'source': 'PRISM_CORE_ALGORITHMS', 'size': 663272, 'purpose': 'Core algorithm library'},
]

print("\nSPECIAL MEGA-MODULE SKILLS:")
for s in special_skills:
    print("  {} ({:,.0f} KB) - {}".format(s['skill_name'], s['size']/1000, s['purpose']))

# ============================================================================
# MCP SERVER COMPREHENSIVE TOOL PLAN
# ============================================================================
print("\n" + "=" * 80)
print("COMPREHENSIVE MCP SERVER PLAN")
print("=" * 80)

mcp_tools = [
    # Data Access Tools
    {'name': 'prism_material_query', 'desc': 'Query 1,047 materials by name/grade/ISO/hardness', 'type': 'data', 'coverage': 1047},
    {'name': 'prism_machine_query', 'desc': 'Query 824 machines by manufacturer/type/size', 'type': 'data', 'coverage': 824},
    {'name': 'prism_tool_query', 'desc': 'Query tools by type/size/coating/manufacturer', 'type': 'data', 'coverage': 500},
    {'name': 'prism_alarm_decode', 'desc': 'Decode alarm codes for FANUC/SIEMENS/HAAS/etc', 'type': 'data', 'coverage': 9200},
    {'name': 'prism_gcode_lookup', 'desc': 'G/M code reference by controller type', 'type': 'data', 'coverage': 2000},
    {'name': 'prism_fixture_query', 'desc': 'Query fixtures/workholding/vises', 'type': 'data', 'coverage': 200},
    {'name': 'prism_post_query', 'desc': 'Query post processors by controller', 'type': 'data', 'coverage': 100},
    
    # Calculation Tools  
    {'name': 'prism_formula_calc', 'desc': 'Execute any of 109 manufacturing formulas', 'type': 'calc', 'coverage': 109},
    {'name': 'prism_speed_feed', 'desc': 'Calculate speeds/feeds for any operation', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_cutting_force', 'desc': 'Calculate cutting forces (Kienzle/Merchant)', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_tool_life', 'desc': 'Predict tool life (Taylor equation)', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_thermal_calc', 'desc': 'Calculate cutting temperatures', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_cycle_time', 'desc': 'Estimate machining cycle time', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_cost_estimate', 'desc': 'Estimate machining cost', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_stability_lobe', 'desc': 'Generate stability lobe diagram', 'type': 'calc', 'coverage': 1},
    {'name': 'prism_deflection_calc', 'desc': 'Calculate tool deflection', 'type': 'calc', 'coverage': 1},
    
    # AI/ML Tools
    {'name': 'prism_optimizer_select', 'desc': 'Select best optimizer for problem', 'type': 'ai', 'coverage': 40},
    {'name': 'prism_ml_predict', 'desc': 'Run ML prediction models', 'type': 'ai', 'coverage': 20},
    {'name': 'prism_bayesian_update', 'desc': 'Bayesian parameter updates', 'type': 'ai', 'coverage': 10},
    {'name': 'prism_xai_explain', 'desc': 'Explain AI decisions', 'type': 'ai', 'coverage': 5},
    
    # Knowledge Tools
    {'name': 'prism_skill_load', 'desc': 'Dynamically load any of 140+ skills', 'type': 'knowledge', 'coverage': 140},
    {'name': 'prism_module_search', 'desc': 'Search 950 extracted modules', 'type': 'knowledge', 'coverage': 950},
    {'name': 'prism_formula_lookup', 'desc': 'Look up formula by name/domain', 'type': 'knowledge', 'coverage': 109},
    {'name': 'prism_standard_lookup', 'desc': 'Look up ISO/ANSI/DIN standards', 'type': 'knowledge', 'coverage': 100},
    
    # Geometry Tools
    {'name': 'prism_nurbs_eval', 'desc': 'Evaluate NURBS curves/surfaces', 'type': 'geometry', 'coverage': 26},
    {'name': 'prism_collision_check', 'desc': 'Check for collisions', 'type': 'geometry', 'coverage': 10},
    {'name': 'prism_mesh_ops', 'desc': 'Mesh operations (boolean, decimate)', 'type': 'geometry', 'coverage': 15},
    {'name': 'prism_step_parse', 'desc': 'Parse STEP file features', 'type': 'geometry', 'coverage': 5},
    
    # Signal Processing Tools
    {'name': 'prism_fft_analyze', 'desc': 'FFT spectrum analysis', 'type': 'signal', 'coverage': 5},
    {'name': 'prism_filter_design', 'desc': 'Design digital filters', 'type': 'signal', 'coverage': 5},
    {'name': 'prism_chatter_detect', 'desc': 'Detect chatter from signal', 'type': 'signal', 'coverage': 3},
    
    # Session Tools
    {'name': 'prism_state_save', 'desc': 'Save session state', 'type': 'session', 'coverage': 1},
    {'name': 'prism_state_load', 'desc': 'Load session state', 'type': 'session', 'coverage': 1},
    {'name': 'prism_checkpoint', 'desc': 'Create checkpoint', 'type': 'session', 'coverage': 1},
]

print("\nMCP TOOLS BY TYPE:")
by_type = defaultdict(list)
for t in mcp_tools:
    by_type[t['type']].append(t)

for typ, tools in by_type.items():
    print("\n{}:".format(typ.upper()))
    for t in tools:
        print("  {} - {} (covers {} items)".format(t['name'], t['desc'], t['coverage']))

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("FINAL SUMMARY")
print("=" * 80)

total_new_skills = len(tier1) + len(tier2) + len(tier3) + len(special_skills)
print("\nSKILLS TO CREATE: {}".format(total_new_skills))
print("  Tier 1 (HIGH): {} skills".format(len(tier1)))
print("  Tier 2 (MEDIUM): {} skills".format(len(tier2)))
print("  Tier 3 (LOW): {} skills".format(len(tier3)))
print("  Special: {} skills".format(len(special_skills)))

print("\nMCP TOOLS TO IMPLEMENT: {}".format(len(mcp_tools)))
for typ, tools in by_type.items():
    print("  {}: {} tools".format(typ, len(tools)))

print("\nTOTAL RESOURCE UTILIZATION:")
print("  Existing skills: 140")
print("  New skills planned: {}".format(total_new_skills))
print("  Total skills: {}".format(140 + total_new_skills))
print("  Extracted modules: 950")
print("  MCP tools: {}".format(len(mcp_tools)))

# Save complete plan
plan = {
    'tier1_skills': tier1,
    'tier2_skills': tier2,
    'tier3_skills': tier3,
    'special_skills': special_skills,
    'mcp_tools': mcp_tools,
    'existing_skills': len(existing_skills),
    'total_new_skills': total_new_skills,
    'total_mcp_tools': len(mcp_tools)
}

Path(r'C:\PRISM\ULTIMATE_SKILL_MCP_PLAN.json').write_text(json.dumps(plan, indent=2), encoding='utf-8')
print("\n\nFull plan saved to C:\\PRISM\\ULTIMATE_SKILL_MCP_PLAN.json")
