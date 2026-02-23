"""
DEEP DIVE: Analyze UNCATEGORIZED modules and find ALL gaps
"""
import json
import re
from pathlib import Path
from collections import defaultdict

print("=" * 80)
print("DEEP DIVE INTO UNCATEGORIZED MODULES")
print("=" * 80)

extracted_base = Path(r'C:\PRISM\extracted_modules')

# Collect all uncategorized
all_modules = {}
for subdir in extracted_base.iterdir():
    if subdir.is_dir():
        for f in subdir.glob('*.js'):
            all_modules[f.stem] = {
                'size': f.stat().st_size,
                'folder': subdir.name,
                'path': str(f)
            }

# Expanded category patterns
expanded_patterns = {
    # AI/ML
    'NEURAL_NETWORK': ['NEURAL', 'RNN', 'LSTM', 'GRU', 'CNN', 'TRANSFORMER', 'ATTENTION', 'GAN', 'VAE', 'AUTOENCODER', 'PERCEPTRON'],
    'DEEP_LEARNING': ['DEEP_LEARNING', 'DQN', 'PINN', 'SEQUENCE_MODEL', 'EMBEDDING'],
    'OPTIMIZATION': ['PSO', 'GENETIC', 'SWARM', 'OPTIM', 'NSGA', 'HYPEROPT', 'INTERIOR_POINT', 'COMBINATORIAL', 'GRADIENT', 'ADAM', 'SGD', 'ANNEALING'],
    'BAYESIAN_PROB': ['BAYESIAN', 'MONTE_CARLO', 'UNCERTAINTY', 'PROBABILISTIC', 'PARTICLE_FILTER', 'MARKOV'],
    'KALMAN_FILTER': ['KALMAN', 'EKF', 'UKF'],
    'REINFORCEMENT': ['REINFORCEMENT', 'RL_', 'REWARD', 'POLICY', 'Q_LEARNING', 'ACTOR_CRITIC'],
    'ENSEMBLE': ['ENSEMBLE', 'RANDOM_FOREST', 'BOOSTING', 'BAGGING'],
    
    # Physics/Engineering
    'CUTTING_PHYSICS': ['CUTTING', 'KIENZLE', 'MERCHANT', 'CHIP', 'FORCE', 'OXLEY'],
    'THERMAL': ['THERMAL', 'HEAT', 'TEMPERATURE', 'COOLING'],
    'TOOL_LIFE': ['TAYLOR', 'TOOL_LIFE', 'WEAR', 'FLANK'],
    'MATERIAL': ['MATERIAL', 'JOHNSON_COOK', 'CONSTITUTIVE', 'ALLOY', 'STEEL', 'ALUMINUM'],
    'STRESS_STRAIN': ['STRESS', 'STRAIN', 'DEFLECTION', 'FATIGUE', 'YIELD'],
    'VIBRATION': ['VIBRATION', 'CHATTER', 'STABILITY', 'DAMPING', 'RESONANCE', 'MODAL'],
    'FLUID_DYNAMICS': ['COOLANT', 'FLUID', 'FLOW', 'PRESSURE', 'LUBRICATION'],
    
    # Geometry/CAD
    'GEOMETRY_CORE': ['GEOMETRY', 'COMPUTATIONAL_GEOMETRY', 'INTERVAL', 'VECTOR', 'POINT', 'PLANE'],
    'CURVES_SURFACES': ['BEZIER', 'NURBS', 'BSPLINE', 'SURFACE', 'SPLINE', 'CURVE', 'PARAMETRIC'],
    'MESH': ['MESH', 'DECIMATION', 'BOOLEAN', 'TESSELLATION', 'TRIANGLE', 'POLYGON'],
    'SDF_CSG': ['SDF', 'CSG', 'BREP', 'SOLID', 'VOLUME'],
    'COLLISION': ['COLLISION', 'INTERSECTION', 'INTERFERENCE', 'PROXIMITY', 'DISTANCE'],
    'CAD_KERNEL': ['CAD', 'STEP', 'FEATURE_RECOGNITION', 'KERNEL', 'TOPOLOGY', 'FACE', 'EDGE'],
    'POINT_CLOUD': ['POINT_CLOUD', 'SCAN', 'LIDAR', 'REGISTRATION'],
    'DIMENSION': ['DIMENSION', 'GD_T', 'TOLERANCE', 'MEASUREMENT'],
    
    # CAM/Toolpath
    'CAM_TOOLPATH': ['TOOLPATH', 'CAM', 'HSM', 'ADAPTIVE', 'ROUGHING', 'FINISHING', 'POCKET', 'CONTOUR'],
    'MACHINING': ['MACHINING', 'MILLING', 'TURNING', 'DRILLING', 'BORING', 'THREADING'],
    'POST_PROCESSOR': ['POST', 'GCODE', 'MCODE', 'NC_'],
    'SIMULATION': ['SIMULATION', 'VERICUT', 'STOCK', 'REMOVAL'],
    
    # Controllers
    'CONTROLLER': ['CONTROLLER', 'FANUC', 'SIEMENS', 'HEIDENHAIN', 'MAZAK', 'OKUMA', 'HAAS', 'BROTHER', 'HURCO'],
    'ALARM': ['ALARM', 'ERROR', 'FAULT', 'DIAGNOSTIC'],
    
    # Databases
    'MACHINE_DB': ['MACHINE', 'KINEMATICS', 'SPINDLE', 'AXIS', 'TRAVEL'],
    'TOOL_DB': ['TOOL_DATABASE', 'ENDMILL', 'DRILL', 'INSERT', 'HOLDER', 'CUTTER'],
    'FIXTURE': ['FIXTURE', 'WORKHOLDING', 'CLAMP', 'VISE', 'CHUCK', 'JAW'],
    'STANDARDS': ['ISO', 'ANSI', 'DIN', 'JIS', 'STANDARD'],
    
    # Signal Processing
    'SIGNAL_PROC': ['SIGNAL', 'FFT', 'WAVELET', 'SPECTRUM', 'FREQUENCY', 'FILTER'],
    
    # Learning/Knowledge
    'LEARNING_SYS': ['LEARNING', 'TRAINING', 'FEEDBACK', 'CONTINUAL', 'INCREMENTAL'],
    'KNOWLEDGE': ['KNOWLEDGE', 'ONTOLOGY', 'SEMANTIC', 'REASONING'],
    
    # AI Advanced
    'NLP': ['NLP', 'LANGUAGE', 'INTENT', 'CLASSIFIER', 'TEXT', 'PARSE'],
    'XAI': ['XAI', 'EXPLAINABLE', 'INTERPRETATION', 'SHAP', 'LIME'],
    'COMPUTER_VISION': ['VISION', 'IMAGE', 'DETECTION', 'SEGMENTATION', 'RECOGNITION'],
    
    # System/Architecture
    'GRAPH': ['GRAPH', 'KNOWLEDGE_GRAPH', 'DAG', 'TREE', 'NODE'],
    'WORKFLOW': ['WORKFLOW', 'SCHEDULER', 'TASK', 'JOB', 'QUEUE'],
    'EVENT_SYSTEM': ['EVENT', 'BUS', 'EMITTER', 'SUBSCRIBER', 'PUBLISH'],
    'STATE_MGMT': ['STATE', 'SYNC', 'PERSISTENCE', 'STORE', 'REDUX'],
    'GATEWAY_API': ['GATEWAY', 'API', 'ROUTE', 'ENDPOINT', 'REST'],
    'CACHE': ['CACHE', 'MEMOIZE', 'LRU'],
    'LOGGING': ['LOG', 'TRACE', 'DEBUG', 'AUDIT'],
    
    # Numerical/Math
    'NUMERICAL': ['NUMERICAL', 'LINEAR_ALGEBRA', 'MATRIX', 'EIGEN', 'DECOMPOSITION'],
    'STATISTICS': ['STATISTICS', 'REGRESSION', 'CLUSTERING', 'PCA', 'CORRELATION'],
    'INTERPOLATION': ['INTERPOLATION', 'EXTRAPOLATION', 'SPLINE', 'FITTING'],
    
    # Business
    'CYCLE_TIME': ['CYCLE_TIME', 'ESTIMATION', 'PREDICTION', 'TIME'],
    'COST': ['COST', 'QUOTE', 'PRICING', 'BUDGET'],
    'SCHEDULING': ['SCHEDULE', 'PLANNING', 'RESOURCE', 'CAPACITY'],
    'CUSTOMER': ['CUSTOMER', 'ORDER', 'CRM', 'CLIENT'],
    
    # Quality
    'VALIDATION': ['VALIDATION', 'VERIFY', 'CHECK', 'HEALTH', 'ASSERT'],
    'QUALITY': ['QUALITY', 'SPC', 'INSPECTION', 'QC'],
    
    # UI/Visualization
    'UI': ['UI', 'COMPONENT', 'WIDGET', 'FORM', 'DIALOG', 'PANEL'],
    'VISUALIZATION': ['VISUAL', 'RENDER', 'DISPLAY', 'CHART', 'PLOT', '3D_', 'WEBGL'],
    'GRAPHICS': ['GRAPHICS', 'SHADER', 'OPENGL', 'CANVAS'],
    
    # Integration
    'BRIDGE': ['BRIDGE', 'CONNECTOR', 'ADAPTER', 'INTEGRATION'],
    'IMPORT_EXPORT': ['IMPORT', 'EXPORT', 'CONVERT', 'PARSE', 'SERIALIZE'],
    
    # Specific Domains
    'THREAD': ['THREAD', 'TAP', 'PITCH'],
    'SURFACE_FINISH': ['SURFACE_FINISH', 'ROUGHNESS', 'RA_', 'RZ_'],
    'GEAR': ['GEAR', 'HOBBING', 'SPLINE'],
    'LATHE': ['LATHE', 'TURNING', 'CHUCK', 'TAILSTOCK'],
    'EDM': ['EDM', 'WIRE_EDM', 'SINKER'],
    'GRINDING': ['GRINDING', 'WHEEL', 'ABRASIVE'],
    'ADDITIVE': ['ADDITIVE', '3D_PRINT', 'LAYER', 'DEPOSITION'],
}

# Reclassify all modules
reclassified = defaultdict(list)
still_uncategorized = []

for mod_name, info in all_modules.items():
    upper = mod_name.upper()
    found = False
    
    for cat, patterns in expanded_patterns.items():
        for pat in patterns:
            if pat in upper:
                reclassified[cat].append((mod_name, info['size']))
                found = True
                break
        if found:
            break
    
    if not found:
        still_uncategorized.append((mod_name, info['size']))

print("\nRECLASSIFIED MODULES BY EXPANDED CATEGORIES:")
print("-" * 60)

total_categorized = 0
for cat, mods in sorted(reclassified.items(), key=lambda x: sum(m[1] for m in x[1]), reverse=True):
    total_size = sum(m[1] for m in mods)
    total_categorized += len(mods)
    print("\n{}: {} modules, {:,.0f} KB".format(cat, len(mods), total_size/1000))
    for mod, size in sorted(mods, key=lambda x: x[1], reverse=True)[:5]:
        print("    - {} ({:,} bytes)".format(mod, size))
    if len(mods) > 5:
        print("    ... and {} more".format(len(mods) - 5))

print("\n" + "=" * 80)
print("STILL UNCATEGORIZED: {} modules".format(len(still_uncategorized)))
print("=" * 80)

# Analyze patterns in uncategorized
word_freq = defaultdict(int)
for mod, size in still_uncategorized:
    # Extract words from module name
    words = re.findall(r'[A-Z][A-Z0-9]+', mod.replace('PRISM_', ''))
    for word in words:
        if len(word) > 2:
            word_freq[word] += 1

print("\nCommon words in uncategorized modules:")
for word, count in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:30]:
    print("  {}: {}".format(word, count))

print("\nUncategorized modules (first 50):")
for mod, size in sorted(still_uncategorized, key=lambda x: x[1], reverse=True)[:50]:
    print("  {} ({:,} bytes)".format(mod, size))

# Save detailed reclassification
output = {
    'total_modules': len(all_modules),
    'categorized': total_categorized,
    'uncategorized': len(still_uncategorized),
    'categories': {cat: {'count': len(mods), 'size': sum(m[1] for m in mods), 'modules': [m[0] for m in mods]} 
                   for cat, mods in reclassified.items()},
    'still_uncategorized': [m[0] for m in still_uncategorized]
}

Path(r'C:\PRISM\DEEP_RECLASSIFICATION.json').write_text(json.dumps(output, indent=2), encoding='utf-8')
print("\n\nSaved detailed reclassification to C:\\PRISM\\DEEP_RECLASSIFICATION.json")
