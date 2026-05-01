import re
import json
from pathlib import Path

print("ANALYZING FAILED EXTRACTIONS")
print("=" * 60)

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

# Read inventory
inv = json.loads(Path(r'C:\PRISM\extracted_modules\MONOLITH_MODULE_INVENTORY.json').read_text(encoding='utf-8'))
all_modules = inv['modules_by_type'].get('const_modules', [])

# Check already extracted
already = set()
for subdir in Path(r'C:\PRISM\extracted_modules').iterdir():
    if subdir.is_dir():
        for f in subdir.glob('*.js'):
            already.add(f.stem)

remaining = [m for m in all_modules if m not in already]
print("Remaining modules: {}".format(len(remaining)))

# Check what pattern each remaining module uses
patterns_found = {}
for mod in remaining[:20]:  # Sample first 20
    # Try different patterns
    p1 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*\{', content)
    p2 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*\[', content)  # Array
    p3 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*function', content)  # Function
    p4 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*\(', content)  # Arrow fn
    p5 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*["\']', content)  # String
    p6 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*\d', content)  # Number
    p7 = re.search(r'const\s+' + re.escape(mod) + r'\s*=\s*`', content)  # Template
    
    if p1:
        patterns_found[mod] = 'OBJECT {}'
    elif p2:
        patterns_found[mod] = 'ARRAY []'
    elif p3:
        patterns_found[mod] = 'FUNCTION'
    elif p4:
        patterns_found[mod] = 'ARROW ()'
    elif p5:
        patterns_found[mod] = 'STRING'
    elif p6:
        patterns_found[mod] = 'NUMBER'
    elif p7:
        patterns_found[mod] = 'TEMPLATE `'
    else:
        # Search for any mention
        if mod in content:
            patterns_found[mod] = 'EXISTS but no const pattern'
        else:
            patterns_found[mod] = 'NOT FOUND in monolith'

print("\nSample of remaining modules:")
for mod, pat in patterns_found.items():
    print("  {} -> {}".format(mod, pat))

# Count pattern types
from collections import Counter
pattern_counts = Counter(patterns_found.values())
print("\nPattern distribution:")
for pat, count in pattern_counts.most_common():
    print("  {}: {}".format(pat, count))
