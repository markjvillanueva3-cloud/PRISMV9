#!/usr/bin/env python3
"""Fix all C:/PRISM -> H:/prism references + quote Python paths with spaces."""

import json, re, os

HOME = os.environ['USERPROFILE']
fixes = {'files': 0, 'replacements': 0}

def remap_file(filepath, replacements):
    if not os.path.isfile(filepath):
        print(f'  SKIP (not found): {filepath}')
        return
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    count = 0
    for old, new in replacements:
        c = content.count(old)
        if c > 0:
            content = content.replace(old, new)
            count += c
    if count > 0:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        fixes['files'] += 1
        fixes['replacements'] += count
        print(f'  FIXED ({count:3d} replacements): {filepath}')

# === Fix 1: Project settings H:/prism/.claude/settings.json ===
print('=== Project settings (.claude/settings.json) ===')
remap_file('H:/prism/.claude/settings.json', [
    ('C:/PRISM/.claude/', 'H:/prism/.claude/'),
    ('/c/PRISM/.claude/', '/h/prism/.claude/'),
    ('C:/PRISM/mcp-server', 'H:/prism/mcp-server'),
    ('/c/PRISM/mcp-server', '/h/prism/mcp-server'),
])

# === Fix 2: Project settings.local.json ===
print('=== Project settings.local.json ===')
remap_file('H:/prism/.claude/settings.local.json', [
    ('C:/PRISM/', 'H:/prism/'),
])

# === Fix 3: mcp-server/.claude/settings.json ===
print('=== MCP server settings ===')
remap_file('H:/prism/mcp-server/.claude/settings.json', [
    ('C:\\\\PRISM\\\\', 'H:\\\\prism\\\\'),
    ('C:/PRISM/', 'H:/prism/'),
    ('/c/PRISM/', '/h/prism/'),
])

# === Fix 4: User settings.json — quote Python path with space ===
print('=== User settings.json (quoting Python path) ===')
user_settings = os.path.join(HOME, '.claude', 'settings.json')
with open(user_settings, 'r', encoding='utf-8') as f:
    data = json.load(f)

py_path = 'C:/Users/Mark Villanueva/.local/bin/python3.12.exe'
hook_dir = 'C:/Users/Mark Villanueva/.claude/hooks/lib/'

count = 0
for event_name, matchers in data.get('hooks', {}).items():
    for matcher_block in matchers:
        for hook in matcher_block.get('hooks', []):
            cmd = hook.get('command', '')
            if py_path not in cmd:
                continue
            if ' -c ' in cmd:
                # Inline python -c command: just quote the python exe
                hook['command'] = cmd.replace(py_path, '"' + py_path + '"')
                count += 1
            elif hook_dir in cmd:
                # python exe + script.py: quote both
                new_cmd = cmd.replace(py_path, '"' + py_path + '"')
                new_cmd = new_cmd.replace(hook_dir, '"' + hook_dir)
                new_cmd = new_cmd.replace('.py', '.py"', 1)
                hook['command'] = new_cmd
                count += 1

with open(user_settings, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

fixes['files'] += 1
fixes['replacements'] += count
print(f'  FIXED ({count:3d} commands quoted): {user_settings}')

print(f'\n{"="*60}')
print(f'  Files fixed:    {fixes["files"]}')
print(f'  Replacements:   {fixes["replacements"]}')
print(f'{"="*60}')
