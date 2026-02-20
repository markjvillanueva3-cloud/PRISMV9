"""Extract priority modules from monolith for skill improvement."""
import re
import json
from pathlib import Path

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# Priority modules - Group 1: Manufacturing Physics & Data
PRIORITY_MODULES = [
    # Manufacturing Physics
    'PRISM_JOHNSON_COOK_DATABASE',
    'PRISM_CUTTING_MECHANICS_ENGINE', 
    'PRISM_CHATTER_PREDICTION_ENGINE',
    'PRISM_SURFACE_FINISH_LOOKUP',
    'PRISM_THERMAL_COMPENSATION',
    'PRISM_THREADING_LOOKUP',
    'PRISM_MACHINING_PROCESS_DATABASE',
    
    # CAM Strategies  
    'PRISM_COMPREHENSIVE_CAM_STRATEGIES',
    'PRISM_3D_TOOLPATH_STRATEGY_ENGINE',
    'PRISM_ADAPTIVE_HSM_ENGINE',
    'PRISM_HYBRID_TOOLPATH_SYNTHESIZER',
    
    # Machines & Controllers
    'PRISM_MACHINE_KINEMATICS_ENGINE',
    'PRISM_CONTROLLER_DATABASE',
    'PRISM_VERIFIED_POST_DATABASE_V2',
    'PRISM_EXPANDED_POST_PROCESSORS',
    
    # Geometry
    'PRISM_COORDINATE_TRANSFORM_ENGINE',
    'PRISM_COMPUTATIONAL_GEOMETRY',
    'PRISM_TOLERANCE_ANALYSIS_ENHANCED',
    
    # Tools & Materials
    'PRISM_CUTTING_TOOL_DATABASE_V2',
    'PRISM_STEEL_ENDMILL_DB_V2',
    'PRISM_CONSOLIDATED_MATERIALS',
]

def extract_module(content, module_name, max_size=100000):
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
        
        # Handle escape sequences
        if i > 0 and content[i-1] == '\\':
            i += 1
            continue
            
        # Handle string boundaries
        if char in ['"', "'"]:
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
        
        # Handle template literals
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
            
        # Count braces
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                return content[start:i+1]
        
        i += 1
    
    return None

# Extract all modules
results = {}
total_chars = 0

for mod in PRIORITY_MODULES:
    extracted = extract_module(content, mod)
    if extracted:
        results[mod] = extracted
        total_chars += len(extracted)
        print(f"[OK] {mod}: {len(extracted):,} chars")
    else:
        print(f"[--] {mod}: NOT FOUND")

print(f"\n=== SUMMARY ===")
print(f"Found: {len(results)}/{len(PRIORITY_MODULES)} modules")
print(f"Total: {total_chars:,} characters")

# Save extraction
output_dir = Path(r'C:\PRISM\extracted_modules\priority_extraction')
output_dir.mkdir(exist_ok=True)

# Save individual modules
for mod, code in results.items():
    (output_dir / f'{mod}.js').write_text(code, encoding='utf-8')

# Save summary
summary = {
    'extracted_at': str(Path(__file__).stat().st_mtime if Path(__file__).exists() else 'now'),
    'total_modules': len(results),
    'total_chars': total_chars,
    'modules': {k: len(v) for k, v in results.items()}
}
(output_dir / 'EXTRACTION_SUMMARY.json').write_text(
    json.dumps(summary, indent=2), encoding='utf-8'
)

print(f"\nSaved to: {output_dir}")
