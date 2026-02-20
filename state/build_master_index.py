import os, json, re

MCP_ROOT = r'C:\PRISM\mcp-server'
SRC = os.path.join(MCP_ROOT, 'src')

output = []
output.append("# PRISM MCP Server — Master Index")
output.append(f"# Generated: 2026-02-11")
output.append(f"# Source: {SRC}")
output.append("")

# 1. DISPATCHERS: Extract from src/tools/dispatchers/
output.append("## 1. DISPATCHERS")
output.append("")
disp_dir = os.path.join(SRC, 'tools', 'dispatchers')
dispatchers = []
for f in sorted(os.listdir(disp_dir)):
    if not f.endswith('.ts') or f.startswith('_'): continue
    fp = os.path.join(disp_dir, f)
    content = open(fp, encoding='utf-8').read()
    lines = len(content.split('\n'))
    
    # Extract tool name
    tool_match = re.search(r'"(prism_\w+)"', content)
    tool_name = tool_match.group(1) if tool_match else f.replace('Dispatcher.ts','')
    
    # Extract ACTIONS array
    actions_match = re.search(r'const ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const', content)
    actions = []
    if actions_match:
        actions = re.findall(r'"(\w+)"', actions_match.group(1))
    
    dispatchers.append({'file': f, 'tool': tool_name, 'actions': actions, 'lines': lines})
    output.append(f"### {tool_name} ({f}, {lines}L)")
    output.append(f"Actions ({len(actions)}): {', '.join(actions)}")
    output.append("")

output.append(f"**Total: {len(dispatchers)} dispatchers, {sum(len(d['actions']) for d in dispatchers)} actions, {sum(d['lines'] for d in dispatchers)}L**")
output.append("")

# 2. ENGINES
output.append("## 2. ENGINES")
output.append("")
eng_dir = os.path.join(SRC, 'engines')
if os.path.exists(eng_dir):
    for f in sorted(os.listdir(eng_dir)):
        if not f.endswith('.ts'): continue
        fp = os.path.join(eng_dir, f)
        lines = sum(1 for _ in open(fp, encoding='utf-8'))
        output.append(f"- {f} ({lines}L)")
output.append("")

# 3. REGISTRIES
output.append("## 3. REGISTRIES")
output.append("")
reg_dir = os.path.join(SRC, 'registries')
if os.path.exists(reg_dir):
    for f in sorted(os.listdir(reg_dir)):
        if not f.endswith('.ts'): continue
        fp = os.path.join(reg_dir, f)
        lines = sum(1 for _ in open(fp, encoding='utf-8'))
        output.append(f"- {f} ({lines}L)")
output.append("")

# 4. CADENCE/HOOKS (autoHookWrapper + cadenceExecutor)
output.append("## 4. CADENCE & HOOKS")
output.append("")
for fname in ['autoHookWrapper.ts', 'cadenceExecutor.ts']:
    fp = os.path.join(SRC, 'tools', fname)
    if os.path.exists(fp):
        lines = sum(1 for _ in open(fp, encoding='utf-8'))
        output.append(f"- {fname} ({lines}L)")
output.append("")

# 5. PYTHON SCRIPTS
output.append("## 5. PYTHON SCRIPTS (C:\\PRISM\\scripts\\core)")
output.append("")
scripts_dir = r'C:\PRISM\scripts\core'
total_script_lines = 0
for f in sorted(os.listdir(scripts_dir)):
    if not f.endswith('.py') or f == '__init__.py': continue
    fp = os.path.join(scripts_dir, f)
    lines = sum(1 for _ in open(fp, encoding='utf-8', errors='ignore'))
    total_script_lines += lines
    output.append(f"- {f} ({lines}L)")
output.append(f"\n**Total: {len([f for f in os.listdir(scripts_dir) if f.endswith('.py') and f != '__init__.py'])} scripts, {total_script_lines}L**")
output.append("")

# 6. DATA FILES
output.append("## 6. DATA FILES")
output.append("")
data_dirs = {
    'Materials': r'C:\PRISM\data\materials',
    'Machines (data)': r'C:\PRISM\data\machines',
    'Machines (extracted)': r'C:\PRISM\extracted\machines',
    'Controllers/Alarms (data)': r'C:\PRISM\data\controllers',
    'Controllers/Alarms (extracted)': r'C:\PRISM\extracted\controllers',
    'Tools': r'C:\PRISM\data\tools',
    'Knowledge Bases': r'C:\PRISM\extracted\knowledge_bases',
}
for name, dpath in data_dirs.items():
    if os.path.exists(dpath):
        json_count = sum(1 for r,d,files in os.walk(dpath) for f in files if f.endswith('.json'))
        output.append(f"- {name}: {json_count} JSON files ({dpath})")
    else:
        output.append(f"- {name}: NOT FOUND ({dpath})")
output.append("")

# 7. TYPES
output.append("## 7. TYPE DEFINITIONS")
output.append("")
types_dir = os.path.join(SRC, 'types')
if os.path.exists(types_dir):
    for f in sorted(os.listdir(types_dir)):
        if f.endswith('.ts'):
            fp = os.path.join(types_dir, f)
            lines = sum(1 for _ in open(fp, encoding='utf-8'))
            output.append(f"- {f} ({lines}L)")
output.append("")

# 8. CONFIG
output.append("## 8. CONFIG")
output.append("")
config_dir = os.path.join(SRC, 'config')
if os.path.exists(config_dir):
    for f in sorted(os.listdir(config_dir)):
        if f.endswith('.ts'):
            fp = os.path.join(config_dir, f)
            lines = sum(1 for _ in open(fp, encoding='utf-8'))
            output.append(f"- {f} ({lines}L)")
output.append("")

# 9. SKILLS
output.append("## 9. SKILLS (C:\\PRISM\\skills-consolidated)")
output.append("")
skills_dir = r'C:\PRISM\skills-consolidated'
if os.path.exists(skills_dir):
    skill_count = 0
    for root, dirs, files in os.walk(skills_dir):
        for f in files:
            if f.endswith('.md'):
                skill_count += 1
    output.append(f"Total skill files: {skill_count}")
output.append("")

# 10. GSD FILES
output.append("## 10. GSD PROTOCOL FILES")
output.append("")
gsd_dir = os.path.join(MCP_ROOT, 'data', 'docs', 'gsd')
if os.path.exists(gsd_dir):
    for f in sorted(os.listdir(gsd_dir)):
        if f.endswith('.md'):
            fp = os.path.join(gsd_dir, f)
            lines = sum(1 for _ in open(fp, encoding='utf-8'))
            output.append(f"- {f} ({lines}L)")
output.append("")

# 11. DOCS
output.append("## 11. DOCUMENTATION")
output.append("")
docs_dir = os.path.join(MCP_ROOT, 'data', 'docs')
for f in sorted(os.listdir(docs_dir)):
    if f.endswith('.md') and not os.path.isdir(os.path.join(docs_dir, f)):
        fp = os.path.join(docs_dir, f)
        lines = sum(1 for _ in open(fp, encoding='utf-8'))
        output.append(f"- {f} ({lines}L)")
output.append("")

# 12. SUMMARY
output.append("## 12. SUMMARY")
output.append("")
total_ts_lines = 0
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in ('_archived', 'node_modules')]
    for f in files:
        if f.endswith('.ts'):
            fp = os.path.join(root, f)
            total_ts_lines += sum(1 for _ in open(fp, encoding='utf-8', errors='ignore'))

output.append(f"- TypeScript source: {total_ts_lines}L")
output.append(f"- Python scripts: {total_script_lines}L")
output.append(f"- Dispatchers: {len(dispatchers)}")
output.append(f"- Total actions: {sum(len(d['actions']) for d in dispatchers)}")
output.append(f"- Build output: dist/index.js (3.6MB)")

result = '\n'.join(output)
print(result)

# Save
with open(r'C:\PRISM\data\docs\MASTER_INDEX.md', 'w', encoding='utf-8') as f:
    f.write(result)
print(f"\n\nSaved to C:\\PRISM\\data\\docs\\MASTER_INDEX.md ({len(output)} lines)")
