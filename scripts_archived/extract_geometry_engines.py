"""
Comprehensive extraction of Geometry/CAD engines from monolith.
Priority 3: These improve Claude's spatial reasoning capabilities.
"""
import re
import json
from pathlib import Path
from datetime import datetime

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# Geometry modules to extract
GEOMETRY_MODULES = {
    # Core Geometry
    'CORE': [
        'PRISM_COMPUTATIONAL_GEOMETRY',
        'PRISM_COORDINATE_SYSTEM_ENGINE',
        'PRISM_CONSTRUCTION_GEOMETRY_ENGINE',
        'PRISM_INTERVAL_ENGINE',
    ],
    
    # Mesh Operations
    'MESH': [
        'PRISM_MESH_DECIMATION_ENGINE',
        'PRISM_MESH_BOOLEAN_ADVANCED_ENGINE',
        'PRISM_BILATERAL_MESH_FILTER',
    ],
    
    # Curves & Surfaces
    'CURVES': [
        'PRISM_BEZIER_MIT',
        'PRISM_BEZIER_INTERSECTION_ENGINE',
        'PRISM_NURBS_ENGINE',
        'PRISM_BSPLINE_ENGINE',
    ],
    
    # Solid Modeling
    'SOLID': [
        'PRISM_CSG_BOOLEAN_ENGINE',
        'PRISM_SDF_ENGINE',
        'PRISM_BREP_ENGINE',
    ],
    
    # Spatial Data Structures
    'SPATIAL': [
        'PRISM_OCTREE_3D',
        'PRISM_POINT_CLOUD_PROCESSING',
        'PRISM_GEODESIC_DISTANCE_ENGINE',
    ],
    
    # Feature Recognition
    'FEATURES': [
        'PRISM_SHAPE_DESCRIPTOR_ENGINE',
        'PRISM_FEATURE_RECOGNITION_ENGINE',
        'PRISM_HOLE_RECOGNITION_ENGINE',
    ],
    
    # CAD/CAM Integration
    'CAD_CAM': [
        'PRISM_COMPLETE_CAD_CAM_ENGINE',
        'PRISM_CAD_KERNEL_MAIN',
        'PRISM_CAD_QUALITY_ASSURANCE_ENGINE',
        'PRISM_STEP_PARSER_ENHANCED',
        'PRISM_BATCH_STEP_IMPORT_ENGINE',
    ],
    
    # Collision & Simulation
    'COLLISION': [
        'PRISM_ENHANCED_COLLISION_ENGINE',
        'PRISM_COLLISION_DETECTION_ENGINE',
    ],
    
    # 3D Graphics
    'GRAPHICS': [
        'PRISM_COMPLETE_3D_ENGINE',
        'PRISM_GRAPHICS_KERNEL_PASS2',
        'PRISM_FILLETING_ENGINE',
    ],
    
    # Machine Geometry
    'MACHINE': [
        'PRISM_EMBEDDED_MACHINE_GEOMETRY',
        'PRISM_MACHINE_SIMULATION_ENGINE',
    ],
}

def extract_module(content, module_name, max_size=200000):
    """Extract a const module from content."""
    pattern = rf'const\s+{module_name}\s*=\s*\{{'
    match = re.search(pattern, content)
    
    if not match:
        return None
    
    start = match.start()
    brace_count = 0
    in_string = False
    string_char = None
    i = start
    
    while i < min(start + max_size, len(content)):
        char = content[i]
        
        if i > 0 and content[i-1] == '\\':
            i += 1
            continue
            
        if char in ['"', "'"]:
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
        
        if char == '`':
            if not in_string:
                in_string = True
                string_char = '`'
            elif string_char == '`':
                in_string = False
                string_char = None
            i += 1
            continue
            
        if in_string:
            i += 1
            continue
            
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                return content[start:i+1]
        
        i += 1
    
    return None

# Extract all Geometry modules
results = {}
total_chars = 0
extraction_log = []

print("=" * 70)
print("GEOMETRY ENGINE EXTRACTION")
print("=" * 70)

for category, modules in GEOMETRY_MODULES.items():
    print(f"\n{category}:")
    category_chars = 0
    
    for mod in modules:
        extracted = extract_module(content, mod)
        if extracted:
            results[mod] = extracted
            size = len(extracted)
            total_chars += size
            category_chars += size
            extraction_log.append({'module': mod, 'category': category, 'size': size, 'status': 'OK'})
            print(f"  [OK] {mod}: {size:,} chars")
        else:
            extraction_log.append({'module': mod, 'category': category, 'size': 0, 'status': 'NOT_FOUND'})
            print(f"  [--] {mod}: NOT FOUND")
    
    print(f"  Category total: {category_chars:,} chars")

print(f"\n{'=' * 70}")
print(f"EXTRACTION COMPLETE")
print(f"Found: {len([r for r in extraction_log if r['status'] == 'OK'])}/{len(extraction_log)} modules")
print(f"Total: {total_chars:,} characters")

# Save extracted modules
output_dir = Path(r'C:\PRISM\extracted_modules\geometry_engines')
output_dir.mkdir(exist_ok=True)

for mod, code in results.items():
    (output_dir / f'{mod}.js').write_text(code, encoding='utf-8')

# Save extraction summary
summary = {
    'extracted_at': datetime.now().isoformat(),
    'category': 'GEOMETRY_ENGINES',
    'total_modules': len(results),
    'total_chars': total_chars,
    'modules': {k: len(v) for k, v in results.items()},
    'log': extraction_log
}
(output_dir / 'EXTRACTION_SUMMARY.json').write_text(
    json.dumps(summary, indent=2), encoding='utf-8'
)

print(f"\nSaved to: {output_dir}")
