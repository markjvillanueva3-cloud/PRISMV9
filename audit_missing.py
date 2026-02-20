import re, os

d = r'C:\PRISM\mcp-server\src\tools\dispatchers'
missing = ['dataDispatcher.ts', 'memoryDispatcher.ts', 'pfpDispatcher.ts', 
           'safetyDispatcher.ts', 'telemetryDispatcher.ts', 'threadDispatcher.ts', 
           'toolpathDispatcher.ts']

for f in missing:
    content = open(os.path.join(d, f), encoding='utf-8').read()
    # Try multiple patterns
    # Pattern 1: enum in z.enum([...])
    m = re.search(r'z\.enum\(\[(.*?)\]\)', content, re.DOTALL)
    if m:
        actions = re.findall(r'"([^"]+)"', m.group(1))
        print(f'{f}: {len(actions)} actions (z.enum) = {actions}')
        continue
    # Pattern 2: action: z.string() with switch cases
    cases = re.findall(r'case\s+"([^"]+)"', content)
    if cases:
        unique = list(dict.fromkeys(cases))
        print(f'{f}: {len(unique)} actions (switch cases) = {unique}')
        continue
    # Pattern 3: Just find all quoted action-like strings in description
    m2 = re.search(r'description.*?Actions?:([^"]*?)(?:"|$)', content)
    if m2:
        acts = re.findall(r'(\w+(?:_\w+)*)', m2.group(1))
        print(f'{f}: found in description: {acts}')
        continue
    print(f'{f}: COULD NOT DETERMINE ACTIONS - manual check needed')
