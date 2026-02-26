import re, os

d = r'C:\PRISM\mcp-server\src\tools\dispatchers'
total = 0

for f in sorted(os.listdir(d)):
    if not f.endswith('.ts'):
        continue
    content = open(os.path.join(d, f), encoding='utf-8').read()
    m = re.search(r'const ACTIONS\s*=\s*\[(.*?)\]\s*as\s*const', content, re.DOTALL)
    if m:
        actions = re.findall(r'"([^"]+)"', m.group(1))
        count = len(actions)
        total += count
        print(f'{f}: {count} actions = {actions}')
    else:
        print(f'{f}: NO ACTIONS ARRAY FOUND')

print(f'\nTOTAL: {total} actions across all dispatchers')
