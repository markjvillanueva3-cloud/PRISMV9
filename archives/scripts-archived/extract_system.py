"""
Comprehensive extraction of System/Integration modules from monolith.
Priority 5: These improve Claude's orchestration capabilities.
"""
import re
import json
from pathlib import Path
from datetime import datetime

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# System modules to extract
SYSTEM_MODULES = {
    # Gateway & API
    'GATEWAY': [
        'PRISM_PHASE1_GATEWAY_ROUTES',
        'PRISM_PHASE2_GATEWAY_ROUTES',
        'PRISM_PHASE3_GATEWAY_ROUTES',
        'PRISM_COURSE_GATEWAY_GENERATOR',
        'PRISM_API_GATEWAY',
    ],
    
    # Event System
    'EVENTS': [
        'PRISM_LAYER5_EVENTS',
        'PRISM_EVENT_INTEGRATION_BRIDGE',
        'PRISM_EVENT_BUS',
        'PRISM_EVENT_EMITTER',
    ],
    
    # State Management
    'STATE': [
        'PRISM_STATE_SYNC',
        'PRISM_STATE_MACHINE',
        'PRISM_STATE_MANAGER',
    ],
    
    # Integration Bridges
    'INTEGRATION': [
        'PRISM_CRITICAL_ALGORITHM_INTEGRATION',
        'PRISM_UI_INTEGRATION_ENGINE',
        'PRISM_NCSIMUL_INTEGRATION',
        'PRISM_CAM_SOFTWARE_BRIDGE',
    ],
    
    # Workflow & Scheduling
    'WORKFLOW': [
        'PRISM_WORKFLOW_ACCESS_HANDLER',
        'PRISM_WORKFLOW_ENGINE',
        'PRISM_SCHEDULER',
        'PRISM_TASK_QUEUE',
    ],
    
    # Validation & Quality
    'VALIDATION': [
        'PRISM_VALIDATOR_ENGINE',
        'PRISM_QUALITY_ASSURANCE_ENGINE',
        'PRISM_HEALTH_VALIDATOR',
    ],
    
    # Cache & Storage
    'CACHE': [
        'PRISM_CACHE_MANAGER',
        'PRISM_STORAGE_ENGINE',
        'PRISM_PERSISTENCE_MANAGER',
    ],
    
    # Knowledge Base
    'KNOWLEDGE': [
        'PRISM_MFG_STRUCTURES_KB',
        'PRISM_AI_STRUCTURES_KB',
        'PRISM_KNOWLEDGE_GRAPH',
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

# Extract all System modules
results = {}
total_chars = 0
extraction_log = []

print("=" * 70)
print("SYSTEM MODULE EXTRACTION")
print("=" * 70)

for category, modules in SYSTEM_MODULES.items():
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
output_dir = Path(r'C:\PRISM\extracted_modules\system')
output_dir.mkdir(exist_ok=True)

for mod, code in results.items():
    (output_dir / f'{mod}.js').write_text(code, encoding='utf-8')

# Save extraction summary
summary = {
    'extracted_at': datetime.now().isoformat(),
    'category': 'SYSTEM',
    'total_modules': len(results),
    'total_chars': total_chars,
    'modules': {k: len(v) for k, v in results.items()},
    'log': extraction_log
}
(output_dir / 'EXTRACTION_SUMMARY.json').write_text(
    json.dumps(summary, indent=2), encoding='utf-8'
)

print(f"\nSaved to: {output_dir}")
