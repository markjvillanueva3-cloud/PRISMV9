import re
import json
from pathlib import Path

print("ROBUST EXTRACTION - REMAINING MODULES")
print("=" * 60)

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')
print("Monolith loaded: {:,} chars".format(len(content)))

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
print("Remaining: {}".format(len(remaining)))

output_dir = Path(r'C:\PRISM\extracted_modules\COMPLETE')
output_dir.mkdir(exist_ok=True)

def extract_robust(module_name):
    """More robust extraction with higher limits."""
    pattern = r'const\s+' + re.escape(module_name) + r'\s*=\s*\{'
    match = re.search(pattern, content)
    if not match:
        return None, "NO MATCH"
    
    start = match.start()
    brace_count = 0
    in_string = False
    string_char = None
    escape_next = False
    i = start
    max_size = 500000  # 500KB limit
    
    while i < min(start + max_size, len(content)):
        char = content[i]
        
        if escape_next:
            escape_next = False
            i += 1
            continue
        
        if char == '\\':
            escape_next = True
            i += 1
            continue
        
        if in_string:
            if char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
        
        if char in ['"', "'"]:
            in_string = True
            string_char = char
            i += 1
            continue
        
        if char == '`':
            in_string = True
            string_char = '`'
            i += 1
            continue
        
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                return content[start:i+1], "OK"
        
        i += 1
    
    return None, "HIT_LIMIT at {} chars".format(i - start)

ok_count = 0
fail_count = 0
total_chars = 0
failures = []

for idx, mod in enumerate(remaining):
    extracted, status = extract_robust(mod)
    if extracted:
        (output_dir / (mod + '.js')).write_text(extracted, encoding='utf-8')
        ok_count += 1
        total_chars += len(extracted)
        print("[OK] {} - {} chars".format(mod, len(extracted)))
    else:
        fail_count += 1
        failures.append((mod, status))
        print("[FAIL] {} - {}".format(mod, status))

print("")
print("=" * 60)
print("RESULTS")
print("Extracted: {}".format(ok_count))
print("Failed: {}".format(fail_count))
print("Total chars: {:,}".format(total_chars))

if failures:
    print("\nFailure reasons:")
    from collections import Counter
    reasons = Counter(r for _, r in failures)
    for reason, count in reasons.most_common():
        print("  {}: {}".format(reason, count))

# Final count
total_extracted = len(already) + ok_count
print("\nTOTAL EXTRACTED: {}/{}".format(total_extracted, len(all_modules)))
