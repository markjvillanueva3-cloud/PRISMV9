"""
COMPREHENSIVE RESOURCE AUDIT FOR MCP INTEGRATION
Identifies all resources that should be exposed via MCP
"""
import os
import json
import re
from pathlib import Path
from collections import defaultdict

print('=' * 80)
print('COMPREHENSIVE RESOURCE AUDIT FOR MCP INTEGRATION')
print('=' * 80)

results = {
    'agents': [],
    'scripts': [],
    'hooks': [],
    'engines': [],
    'formulas': [],
    'coordination': [],
    'skills': [],
    'modules': [],
}

# ============================================================================
# 1. AGENTS
# ============================================================================
print('\n' + '='*60)
print('1. AGENTS')
print('='*60)

agent_sources = [
    r'C:\PRISM\data\coordination\AGENT_REGISTRY.json',
    r'C:\PRISM\data\coordination\AGENT_REGISTRY_v5.json',
]

all_agents = set()
for src in agent_sources:
    if os.path.exists(src):
        try:
            with open(src, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'agents' in data:
                    for agent in data['agents']:
                        name = agent.get('name', agent.get('id', 'unknown'))
                        all_agents.add(name)
                elif isinstance(data, list):
                    for agent in data:
                        if isinstance(agent, dict):
                            name = agent.get('name', agent.get('id', 'unknown'))
                            all_agents.add(name)
                elif isinstance(data, dict):
                    all_agents.update(data.keys())
        except Exception as e:
            print(f'  Error reading {src}: {e}')

results['agents'] = sorted(list(all_agents))
print(f'Total Agents Found: {len(all_agents)}')
for agent in sorted(list(all_agents))[:15]:
    print(f'  - {agent}')
if len(all_agents) > 15:
    print(f'  ... and {len(all_agents) - 15} more')

# ============================================================================
# 2. SCRIPTS
# ============================================================================
print('\n' + '='*60)
print('2. PYTHON SCRIPTS')
print('='*60)

script_dirs = [
    r'C:\PRISM\scripts',
]

scripts = []
for sd in script_dirs:
    if os.path.exists(sd):
        for f in os.listdir(sd):
            if f.endswith('.py'):
                scripts.append(f)

scripts = list(set(scripts))
results['scripts'] = scripts
print(f'Total Scripts: {len(scripts)}')

# Categorize scripts
categories = defaultdict(list)
for s in scripts:
    sl = s.lower()
    if 'skill' in sl:
        categories['skill_management'].append(s)
    elif 'extract' in sl:
        categories['extraction'].append(s)
    elif 'session' in sl or 'state' in sl:
        categories['session_state'].append(s)
    elif 'audit' in sl or 'valid' in sl:
        categories['validation'].append(s)
    elif 'wire' in sl or 'integrat' in sl:
        categories['wiring'].append(s)
    elif 'format' in sl or 'upload' in sl:
        categories['formatting'].append(s)
    elif 'gsd' in sl or 'startup' in sl:
        categories['gsd_system'].append(s)
    else:
        categories['other'].append(s)

for cat, items in sorted(categories.items()):
    print(f'\n  {cat.upper()} ({len(items)}):')
    for item in items[:3]:
        print(f'    - {item}')
    if len(items) > 3:
        print(f'    ... and {len(items) - 3} more')

# ============================================================================
# 3. HOOKS
# ============================================================================
print('\n' + '='*60)
print('3. COGNITIVE HOOKS')
print('='*60)

hooks = []
hook_patterns = [
    (r'BAYES-\d+', 'Bayesian'),
    (r'OPT-\d+', 'Optimization'),
    (r'MULTI-\d+', 'Multi-Objective'),
    (r'GRAD-\d+', 'Gradient'),
    (r'RL-\d+', 'Reinforcement Learning'),
    (r'SYS-LAW\d+', 'System Laws'),
]

# Check skills for hooks
skill_dir = r'C:\_SKILLS'
if os.path.exists(skill_dir):
    for skill_name in os.listdir(skill_dir):
        skill_file = os.path.join(skill_dir, skill_name, 'SKILL.md')
        if os.path.exists(skill_file):
            try:
                with open(skill_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for pattern, category in hook_patterns:
                        found = re.findall(pattern, content)
                        for h in found:
                            if h not in hooks:
                                hooks.append(h)
            except:
                pass

results['hooks'] = hooks
print(f'Total Hooks Found: {len(hooks)}')
hook_cats = defaultdict(list)
for h in hooks:
    if 'BAYES' in h:
        hook_cats['Bayesian'].append(h)
    elif 'OPT' in h:
        hook_cats['Optimization'].append(h)
    elif 'MULTI' in h:
        hook_cats['Multi-Objective'].append(h)
    elif 'GRAD' in h:
        hook_cats['Gradient'].append(h)
    elif 'RL' in h:
        hook_cats['RL'].append(h)
    elif 'SYS' in h:
        hook_cats['System'].append(h)

for cat, items in hook_cats.items():
    print(f'  {cat}: {len(items)} hooks')

# ============================================================================
# 4. ENGINES (from extracted modules)
# ============================================================================
print('\n' + '='*60)
print('4. EXTRACTED ENGINES')
print('='*60)

engine_dir = r'C:\PRISM\extracted_modules'
engines = []
all_modules = []
if os.path.exists(engine_dir):
    for f in os.listdir(engine_dir):
        if f.endswith('.json'):
            name = f.replace('.json', '')
            all_modules.append(name)
            name_upper = name.upper()
            if any(x in name_upper for x in ['ENGINE', 'OPTIMIZER', 'SOLVER', 'CALCULATOR', 'PROCESSOR', 'GENERATOR', 'ANALYZER']):
                engines.append(name)

results['engines'] = engines
results['modules'] = all_modules
print(f'Total Modules: {len(all_modules)}')
print(f'Engine-type Modules: {len(engines)}')
for e in sorted(engines)[:10]:
    print(f'  - {e}')
if len(engines) > 10:
    print(f'  ... and {len(engines) - 10} more')

# ============================================================================
# 5. FORMULAS
# ============================================================================
print('\n' + '='*60)
print('5. FORMULAS')
print('='*60)

formulas = []
formula_file = r'C:\_SKILLS\prism-universal-formulas\SKILL.md'
if os.path.exists(formula_file):
    with open(formula_file, 'r', encoding='utf-8') as f:
        content = f.read()
        found = re.findall(r'F-[A-Z]+-\d+', content)
        formulas = list(set(found))

results['formulas'] = formulas
print(f'Total Formulas: {len(formulas)}')

# Categorize formulas
formula_cats = defaultdict(int)
for fo in formulas:
    parts = fo.split('-')
    if len(parts) >= 2:
        formula_cats[parts[1]] += 1

for cat, count in sorted(formula_cats.items(), key=lambda x: -x[1])[:10]:
    print(f'  {cat}: {count} formulas')

# ============================================================================
# 6. COORDINATION FILES
# ============================================================================
print('\n' + '='*60)
print('6. COORDINATION FILES')
print('='*60)

coord_dir = r'C:\PRISM\data\coordination'
coord_files = []
if os.path.exists(coord_dir):
    for cf in os.listdir(coord_dir):
        if cf.endswith('.json'):
            size = os.path.getsize(os.path.join(coord_dir, cf))
            coord_files.append({'name': cf, 'size': size})
            print(f'  - {cf} ({size:,} bytes)')

results['coordination'] = coord_files
print(f'\nTotal Coordination Files: {len(coord_files)}')

# ============================================================================
# 7. SKILLS
# ============================================================================
print('\n' + '='*60)
print('7. SKILLS')
print('='*60)

skills = []
skill_dirs = [
    r'C:\PRISM\skills-consolidated',
    r'C:\_SKILLS',
]

for sd in skill_dirs:
    if os.path.exists(sd):
        for item in os.listdir(sd):
            if os.path.isdir(os.path.join(sd, item)) and item.startswith('prism-'):
                if item not in skills:
                    skills.append(item)

results['skills'] = skills
print(f'Total Skills: {len(skills)}')

# ============================================================================
# SUMMARY
# ============================================================================
print('\n' + '='*80)
print('SUMMARY: RESOURCES FOR MCP INTEGRATION')
print('='*80)

summary = f'''
RESOURCE                 COUNT      MCP BENEFIT
-------------------------------------------------------------------
Agents                   {len(results['agents']):>5}      Orchestrate complex workflows
Scripts                  {len(results['scripts']):>5}      Automation tools callable  
Hooks                    {len(results['hooks']):>5}      Quality/safety checks
Engines                  {len(results['engines']):>5}      Core calculation modules
Formulas                 {len(results['formulas']):>5}      Physics/math computations
Coordination Files       {len(results['coordination']):>5}      System state/config
Skills                   {len(results['skills']):>5}      Knowledge loading
All Modules              {len(results['modules']):>5}      Code/algorithm access
-------------------------------------------------------------------
TOTAL UNIQUE RESOURCES:  {sum(len(v) for v in results.values()):>5}
'''
print(summary)

# Save results
output_file = r'C:\PRISM\MCP_RESOURCE_AUDIT.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print(f'\nResults saved to: {output_file}')
