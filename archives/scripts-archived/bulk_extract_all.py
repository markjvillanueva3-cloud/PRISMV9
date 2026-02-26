import re
import json
from pathlib import Path
from datetime import datetime

print("BULK MONOLITH EXTRACTION")
print("=" * 60)

# Read monolith
monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
print("Reading monolith...")
content = monolith_path.read_text(encoding='utf-8')
print("Size: {:,} chars".format(len(content)))

# Read inventory
inv = json.loads(Path(r'C:\PRISM\extracted_modules\MONOLITH_MODULE_INVENTORY.json').read_text(encoding='utf-8'))
all_modules = inv['modules_by_type'].get('const_modules', [])
print("Total modules: {}".format(len(all_modules)))

# Output directory
output_dir = Path(r'C:\PRISM\extracted_modules\COMPLETE')
output_dir.mkdir(exist_ok=True)

# Check already extracted
already = set()
for subdir in Path(r'C:\PRISM\extracted_modules').iterdir():
    if subdir.is_dir():
        for f in subdir.glob('*.js'):
            already.add(f.stem)

to_extract = [m for m in all_modules if m not in already]
print("Already extracted: {}".format(len(already)))
print("To extract: {}".format(len(to_extract)))

def extract_module(module_name):
    pattern = r'const\s+' + re.escape(module_name) + r'\s*=\s*\{'
    match = re.search(pattern, content)
    if not match:
        return None
    
    start = match.start()
    brace_count = 0
    in_string = False
    string_char = None
    i = start
    max_size = 300000
    
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
        elif char == '`':
            if not in_string:
                in_string = True
                string_char = '`'
            elif string_char == '`':
                in_string = False
        elif not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return content[start:i+1]
        i += 1
    return None

# Extract all
ok_count = 0
fail_count = 0
total_chars = 0

for idx, mod in enumerate(to_extract):
    try:
        extracted = extract_module(mod)
        if extracted:
            (output_dir / (mod + '.js')).write_text(extracted, encoding='utf-8')
            ok_count += 1
            total_chars += len(extracted)
        else:
            fail_count += 1
    except Exception as e:
        fail_count += 1
    
    if (idx + 1) % 100 == 0:
        print("Progress: {}/{} - OK: {}, FAIL: {}".format(idx + 1, len(to_extract), ok_count, fail_count))

print("")
print("=" * 60)
print("COMPLETE")
print("Extracted: {} modules".format(ok_count))
print("Failed: {} modules".format(fail_count))
print("Total chars: {:,}".format(total_chars))

# Save summary
summary = {
    'extracted_at': datetime.now().isoformat(),
    'successful': ok_count,
    'failed': fail_count,
    'total_chars': total_chars
}
(output_dir / 'SUMMARY.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print("Summary saved to COMPLETE/SUMMARY.json")
