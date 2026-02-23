"""
Comprehensive extraction of Physics/Mechanics engines from monolith.
Priority 2: These improve Claude's manufacturing physics knowledge.
"""
import re
import json
from pathlib import Path
from datetime import datetime

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# Physics modules to extract (grouped by category)
PHYSICS_MODULES = {
    # Thermal & Heat Transfer
    'THERMAL': [
        'PRISM_CUTTING_THERMAL_ENGINE',
        'PRISM_HEAT_TRANSFER_ENGINE',
        'PRISM_THERMAL_DEFORMATION_ENGINE',
    ],
    
    # Material Behavior
    'MATERIAL': [
        'PRISM_MATERIAL_SIMULATION_ENGINE',
        'PRISM_MATERIAL_ALIASES',
        'PRISM_UNIFIED_MATERIAL_ACCESS',
        'PRISM_MECHANICAL_BEHAVIOR',
    ],
    
    # Stress & Deformation
    'MECHANICS': [
        'PRISM_STRESS_ANALYSIS',
        'PRISM_DEFLECTION_ENGINE',
        'PRISM_FATIGUE_ENGINE',
    ],
    
    # Vibration & Dynamics
    'DYNAMICS': [
        'PRISM_WAVELET_CHATTER',
        'PRISM_STABILITY_ENGINE',
        'PRISM_VIBRATION_ENGINE',
        'PRISM_DYNAMICS_ENGINE',
    ],
    
    # Tool Life & Wear
    'TOOL_LIFE': [
        'PRISM_TAYLOR_ADVANCED',
        'PRISM_TOOL_WEAR_ENGINE',
        'PRISM_TOOL_LIFE_PREDICTION',
    ],
    
    # Surface Quality
    'SURFACE': [
        'PRISM_SURFACE_ROUGHNESS_ENGINE',
        'PRISM_SURFACE_INTEGRITY_ENGINE',
    ],
    
    # Cutting Process
    'CUTTING': [
        'PRISM_CAM_CUTTING_PARAM_BRIDGE',
        'PRISM_CHIP_FORMATION_ENGINE',
        'PRISM_CUTTING_CONDITION_ENGINE',
    ],
    
    # MFG Physics
    'MFG_PHYSICS': [
        'PRISM_MFG_PHYSICS',
        'PRISM_MACHINING_PROCESS_ENGINE',
    ],
}

def extract_module(content, module_name, max_size=150000):
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

# Extract all Physics modules
results = {}
total_chars = 0
extraction_log = []

print("=" * 70)
print("PHYSICS ENGINE EXTRACTION")
print("=" * 70)

for category, modules in PHYSICS_MODULES.items():
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
output_dir = Path(r'C:\PRISM\extracted_modules\physics_engines')
output_dir.mkdir(exist_ok=True)

for mod, code in results.items():
    (output_dir / f'{mod}.js').write_text(code, encoding='utf-8')

# Save extraction summary
summary = {
    'extracted_at': datetime.now().isoformat(),
    'category': 'PHYSICS_ENGINES',
    'total_modules': len(results),
    'total_chars': total_chars,
    'modules': {k: len(v) for k, v in results.items()},
    'log': extraction_log
}
(output_dir / 'EXTRACTION_SUMMARY.json').write_text(
    json.dumps(summary, indent=2), encoding='utf-8'
)

print(f"\nSaved to: {output_dir}")
