"""
Comprehensive extraction of Database modules from monolith.
Priority 4: These improve Claude's lookup/reference capabilities.
"""
import re
import json
from pathlib import Path
from datetime import datetime

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# Database modules to extract
DATABASE_MODULES = {
    # Tool Databases
    'TOOLS': [
        'PRISM_TOOL_GENERATOR',
        'PRISM_TOOL_HOLDER_INTERFACES_COMPLETE',
        'PRISM_TOOL_3D_GENERATOR_EXTENSION_V2',
        'PRISM_INSERT_DATABASE',
        'PRISM_DRILL_DATABASE',
        'PRISM_TAP_DATABASE',
        'PRISM_REAMER_DATABASE',
    ],
    
    # Machine Databases
    'MACHINES': [
        'PRISM_ROUGHING_MACHINE_CONFIGS_V2',
        'PRISM_MACHINE_CONFIG_DATABASE',
        'PRISM_5AXIS_MACHINE_DATABASE',
        'PRISM_LATHE_DATABASE',
    ],
    
    # Post Processor Databases
    'POST': [
        'PRISM_FUSION_POST_DATABASE',
        'PRISM_POST_PROCESSOR_DATABASE',
        'PRISM_MACRO_DATABASE_SCHEMA',
    ],
    
    # Fixture/Workholding
    'FIXTURE': [
        'PRISM_HYPERMILL_FIXTURE_DATABASE',
        'PRISM_FIXTURE_DATABASE',
        'PRISM_STOCK_POSITIONS_DATABASE',
    ],
    
    # Parts & Geometry
    'PARTS': [
        'PRISM_EMBEDDED_PARTS_DATABASE',
        'PRISM_FEATURE_DATABASE',
    ],
    
    # Master Database
    'MASTER': [
        'PRISM_MASTER_DB',
        'PRISM_MASTER_DATABASE',
        'PRISM_UNIFIED_DATABASE',
    ],
    
    # Manufacturing Standards
    'STANDARDS': [
        'PRISM_THREAD_DATABASE',
        'PRISM_TOLERANCE_DATABASE',
        'PRISM_SURFACE_FINISH_DATABASE',
    ],
    
    # Material Reference
    'MATERIAL_REF': [
        'PRISM_MATERIAL_GRADE_DATABASE',
        'PRISM_COATING_DATABASE',
        'PRISM_CARBIDE_GRADE_DATABASE',
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

# Extract all Database modules
results = {}
total_chars = 0
extraction_log = []

print("=" * 70)
print("DATABASE MODULE EXTRACTION")
print("=" * 70)

for category, modules in DATABASE_MODULES.items():
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
output_dir = Path(r'C:\PRISM\extracted_modules\databases')
output_dir.mkdir(exist_ok=True)

for mod, code in results.items():
    (output_dir / f'{mod}.js').write_text(code, encoding='utf-8')

# Save extraction summary
summary = {
    'extracted_at': datetime.now().isoformat(),
    'category': 'DATABASES',
    'total_modules': len(results),
    'total_chars': total_chars,
    'modules': {k: len(v) for k, v in results.items()},
    'log': extraction_log
}
(output_dir / 'EXTRACTION_SUMMARY.json').write_text(
    json.dumps(summary, indent=2), encoding='utf-8'
)

print(f"\nSaved to: {output_dir}")
