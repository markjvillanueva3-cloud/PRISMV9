import re
content = open(r'C:\PRISM\scripts\prism_mcp_server.py', 'r', encoding='utf-8').read()

# Find tool registration pattern
matches = re.findall(r'tools\["prism_(\w+)"\]', content)
print(f'Total registered tools: {len(set(matches))}')
print('Tools:', sorted(set(matches))[:20])

# Find version
ver_match = re.search(r'VERSION\s*=\s*"([^"]+)"', content)
if ver_match:
    print(f'Version: {ver_match.group(1)}')

# Find imports section end
import_end = content.find('\n\n', content.rfind('import '))
print(f'Import section ends around line: {content[:import_end].count(chr(10))}')

# Find tool registration area
reg = re.search(r'# Register all tools', content)
if reg:
    print(f'Tool registration at position: {reg.start()}, line ~{content[:reg.start()].count(chr(10))}')
