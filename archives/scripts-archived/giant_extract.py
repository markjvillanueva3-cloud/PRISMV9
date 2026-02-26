import re
import json
from pathlib import Path

print("GIANT EXTRACTION - 10MB LIMIT")
print("=" * 60)

monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

already = set()
for subdir in Path(r'C:\PRISM\extracted_modules').iterdir():
    if subdir.is_dir():
        for f in subdir.glob('*.js'):
            already.add(f.stem)

inv = json.loads(Path(r'C:\PRISM\extracted_modules\MONOLITH_MODULE_INVENTORY.json').read_text(encoding='utf-8'))
all_modules = inv['modules_by_type'].get('const_modules', [])
remaining = [m for m in all_modules if m not in already]
print("Remaining giant modules: {}".format(len(remaining)))

output_dir = Path(r'C:\PRISM\extracted_modules\GIANT')
output_dir.mkdir(exist_ok=True)

def extract_giant(module_name):
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
    max_size = 10000000  # 10MB limit
    
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
    return None, "HIT_10MB_LIMIT"

ok = 0
fail = 0
total = 0

for mod in remaining:
    extracted, status = extract_giant(mod)
    if extracted:
        (output_dir / (mod + '.js')).write_text(extracted, encoding='utf-8')
        ok += 1
        total += len(extracted)
        print("[OK] {} - {:,} chars".format(mod, len(extracted)))
    else:
        fail += 1
        print("[FAIL] {} - {}".format(mod, status))

print("")
print("=" * 60)
print("Extracted: {} ({:,} chars)".format(ok, total))
print("Failed: {}".format(fail))
print("GRAND TOTAL: {}/951".format(len(already) + ok))
