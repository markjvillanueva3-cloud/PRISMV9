#!/usr/bin/env python3
"""Generate comprehensive MASTER_INDEX.md with EVERYTHING categorized."""
import os, glob, re
from datetime import datetime

os.chdir("C:/PRISM/mcp-server")

output = []
output.append("# PRISM MASTER INDEX - Complete System Catalog")
output.append(f"## Regenerated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
output.append("## This file lists EVERY asset in the PRISM system, categorized for lookup.")
output.append("## ALWAYS read this before building anything new to prevent duplicates.")
output.append("")

# 1. ENGINES
engines = sorted([os.path.basename(f).replace('.ts','')
    for f in glob.glob('src/engines/*.ts')
    if 'index.ts' not in os.path.basename(f) and '.test.' not in f])

output.append(f"## 1. Engines ({len(engines)})")
output.append("")

categories = {}
cat_map = {
    'Turning & Lathe': ['turning', 'lathe', 'chuck', 'tailstock', 'steadyrest', 'thread', 'boring', 'taper', 'css', 'barpull', 'barstock', 'barfeed', 'diamond.*turn', 'parting', 'grooving'],
    'Milling': ['milling', 'pocket', 'contour', 'adaptive(?!.*calibr)', 'hsm', 'trochoidal', 'endmill', 'helical', 'plunge.*mill', 'face.*mill'],
    '5-Axis & Multi-Axis': ['5axis', 'fiveaxis', 'multiaxis', 'tcpm', 'rtcp', 'tilted', 'swivel', 'barrel.*cut'],
    'Mill-Turn & Swiss': ['millturn', 'swiss', 'subspindle', 'multichannel', 'livetool'],
    'Grinding': ['grinding', 'grind(?!ing)', 'wheel(?!.*water)', 'dress', 'honing', 'burnish', 'sparkout', 'centerless', 'creep.*feed'],
    'EDM (Wire & Sinker)': ['edm', 'wire.*edm', 'sinker', 'electrode(?!.*weld)', 'dielectric'],
    'Laser Cutting': ['laser', 'beam(?!.*weld)'],
    'Waterjet': ['waterjet', 'abrasive.*jet', 'garnet'],
    'Cutting Physics & Force': ['force(?!.*clamp)', 'kienzle', 'chip(?!.*break)', 'merchant', 'oxley', 'johnson.*cook', 'constitutive'],
    'Chatter & Stability': ['chatter', 'stability.*lobe', 'vibrat', 'frf', 'rcsa', 'damping'],
    'Thermal & Temperature': ['thermal(?!.*spray)', 'temperature', 'coolant', 'cryogen', 'inverse.*thermal'],
    'Tool Wear & Life': ['wear(?!.*house)', 'taylor', 'usui', 'flank', 'crater', 'tool.*life', 'breakage.*predict'],
    'Deflection & Surface': ['deflect', 'surface.*finish', 'surface.*integr', 'roughness', 'scallop', 'runout', 'residual.*stress'],
    'Speed & Feed': ['speed.*feed', 'chipload', 'engagement(?!.*geo)', 'stepover', 'auto.*speed'],
    'Tool Selection': ['tool.*select', 'tool.*catalog', 'tool.*roi', 'tool.*cost', 'insert.*grade', 'coating.*select', 'tool.*geometry', 'tool.*assembly', 'tool.*holder', 'tool.*magazine', 'tool.*change', 'tool.*inventory', 'tool.*substitut', 'tool.*enrich'],
    'Toolpath & Strategy': ['toolpath', 'strategy(?!.*engine)', 'algorithm.*select', 'production.*toolpath', 'clearing', 'pencil', 'rest.*machin'],
    'CAM System Bridges': ['mastercam', 'solidcam', 'hypermill', 'fusion', 'esprit', 'gibbscam', 'surfcam', 'edgecam', 'worknc', 'topsolid', 'cimatron', 'delcam', 'bobcad', 'catia', 'siemens.*nx', 'cam.*bridge', 'cam.*strategy', 'cam.*controller', 'cam.*api', 'cam.*material', 'cam.*operation', 'cam.*safety', 'cam.*add'],
    'Collision & Safety': ['collision', 'safety(?!.*hook)', 'veto', 'escalation', 'breakage(?!.*predict)', 'accessibility', 'guard'],
    'Quality & SPC': ['quality', 'spc', 'cpk', 'fmea', 'nelson', 'capability(?!.*plan)', 'lean.*sigma', 'six.*sigma', 'control.*chart'],
    'Inspection & Measurement': ['inspection', 'gage(?!.*length)', 'measurement', 'calibrat', 'probe(?!.*cycle)', 'probing', 'cmm', 'first.*article'],
    'GD&T & Tolerance': ['gdt', 'tolerance(?!.*stack)', 'tolerance.*stack', 'dimension.*analy', 'stack.*up'],
    'Cost & Quoting': ['cost(?!.*per)', 'quote(?!.*ship)', 'estimat(?!.*ion)', 'pricing', 'bid', 'margin'],
    'Business & ERP': ['financial', 'billing', 'subscription', 'campaign', 'product(?!.*ion)(?!.*toolpath)', 'order(?!.*sequence)', 'invoice', 'erp', 'shop(?!.*doctor)'],
    'OEE & Scheduling': ['oee', 'capacity.*plan', 'bottleneck', 'schedule(?!.*cron)', 'shift', 'setup.*reduc', 'smed', 'kanban'],
    'Material Science': ['material(?!.*handl)', 'alloy', 'superalloy', 'ceramic.*machin', 'magnesium', 'composite.*machin', 'hardness', 'heat.*treat'],
    'Stock & Raw Material': ['stock(?!.*model)', 'raw.*material', 'bar.*stock', 'stock.*size', 'stock.*allow', 'stock.*model', 'voxel.*stock'],
    'Workholding': ['workholding', 'clamp(?!.*force)', 'fixture', 'tombstone', 'vacuum.*chuck', 'chuck.*jaw.*force', 'vise', 'zero.*point', 'pallet', 'modular.*fix'],
    'Post-Processing': ['post.*process', 'controller.*dialect', 'gcode.*transpil', 'program.*struct', 'subprogram', 'work.*coordinate', 'backplot', 'post.*output', 'post.*physics', 'post.*valid', 'post.*verif', 'line.*by.*line', 'motion.*control.*inject'],
    'CAD & Geometry': ['cad(?!.*drawing)', 'geometry(?!.*engine)', 'bspline', 'mesh(?!.*garnet)', 'stl', 'step(?!.*over)', 'iges', 'dxf', 'nurbs', 'tessellat', 'voxel(?!.*stock)', 'sketch', 'boolean', 'swept', 'loft', 'extrude', 'revolve', 'fillet', 'chamfer(?!.*engine)'],
    'Feature Recognition': ['feature.*recogn', 'feature.*strategy', 'feature.*zone', 'dfm', 'manufactur.*rule'],
    'Simulation': ['simulat(?!.*anneal)', 'vericut', 'digital.*twin'],
    'Machine Selection': ['machine.*select', 'machine.*match', 'machine.*rate', 'machine.*strategy', 'machine.*warm', 'spindle.*torque', 'spindle.*optim'],
    'Controller Knowledge': ['controller(?!.*dialect)(?!.*strategy)', 'mazatrol', 'conversational.*output'],
    'AI & Machine Learning': ['bayesian', 'kalman', 'genetic(?!.*optim)', 'particle.*swarm', 'neural', 'reinforcement', 'machine.*learn', 'deep.*learn', 'transfer.*learn', 'federated', 'anomaly.*detect'],
    'Optimization': ['optim(?!.*al)(?!.*ize)', 'genetic.*optim', 'simulated.*anneal', 'nelder.*mead', 'gradient.*desc', 'differential.*evol', 'convex', 'linear.*program', 'dynamic.*program', 'ant.*colony'],
    'Statistics & Uncertainty': ['statistic', 'monte.*carlo', 'uncertainty', 'stochastic', 'sobol', 'bootstrap', 'weibull', 'regression(?!.*test)'],
    'Decision & Reasoning': ['decision', 'inference', 'explainable', 'fuzzy', 'pipeline.*decision', 'contextual.*override'],
    'Prediction': ['predict(?!.*main)', 'forecast', 'self.*learn'],
    'Learning & Knowledge Base': ['learn(?!.*rate)', 'knowledge', 'tribal', 'playbook', 'academy', 'blueprint.*ocr', 'pdf.*blueprint', 'video.*learn', 'apprentice'],
    'Pipeline & Orchestration': ['pipeline(?!.*decision)', 'orchestrat', 'print.*to.*program', 'auto.*print', 'design.*to.*floor', 'proven.*pipeline'],
    'Process Routing': ['process.*sequence', 'process.*route', 'multi.*process', 'make.*vs.*buy', 'shop.*network'],
    'Nesting & Sheet': ['nest', 'sheet(?!.*metal)', 'blank', 'utilization'],
    'Forming & Sheet Metal': ['bend(?!.*allow)', 'form(?!.*ula)(?!.*at)', 'stamp', 'deep.*draw', 'roll(?!.*er)', 'hydro.*form', 'sheet.*metal'],
    'Surface Treatment': ['anodiz', 'plating', 'carburiz', 'nitrid', 'pvd', 'cvd', 'chrome', 'phosphat', 'paint', 'powder.*coat'],
    'Welding & Joining': ['weld', 'braz', 'solder', 'adhesive', 'rivet', 'friction.*stir'],
    'Additive Manufacturing': ['additive', 'sinter', 'powder(?!.*coat)', '3d.*print', 'waam', 'ded'],
    'Non-Traditional Machining': ['electrochemical', 'ultrasonic.*machin', 'abrasive.*jet(?!.*waterjet)', 'electron.*beam', 'plasma.*cut', 'chemical.*machin'],
    'Sensing & Monitoring': ['sensor', 'monitor', 'acoustic.*emiss', 'fft', 'stft', 'wavelet', 'mtconnect', 'opc.*ua', 'predictive.*maint', 'condition'],
    'Sustainability': ['sustainab', 'lca', 'carbon', 'energy(?!.*harvest)', 'recycl'],
    'Documentation & Reporting': ['report', 'setup.*sheet', 'document', 'certification', 'traceab'],
    'System Infrastructure': ['auth', 'cache(?!.*optim)', 'batch(?!.*cam)(?!.*size)', 'token(?!.*optim)', 'context(?!.*ual)', 'agent(?!.*sdk)', 'session(?!.*persist)', 'config', 'schema.*cache', 'action.*schema', 'file.*system', 'code.*system', 'webhook'],
}

for eng in engines:
    eng_lower = eng.lower()
    placed = False
    for cat, keywords in cat_map.items():
        for kw in keywords:
            try:
                if re.search(kw, eng_lower):
                    categories.setdefault(cat, []).append(eng)
                    placed = True
                    break
            except:
                pass
        if placed:
            break
    if not placed:
        categories.setdefault('Uncategorized', []).append(eng)

for cat in sorted(categories.keys()):
    engs = sorted(set(categories[cat]))
    output.append(f"### {cat} ({len(engs)})")
    for e in engs:
        output.append(f"- {e}")
    output.append("")

# 2. DISPATCHERS
dispatchers = sorted([os.path.basename(f).replace('.ts','')
    for f in glob.glob('src/tools/dispatchers/*.ts')])
output.append(f"## 2. Dispatchers ({len(dispatchers)})")
for d in dispatchers:
    output.append(f"- {d}")
output.append("")

# 3. ALGORITHMS
algorithms = sorted([os.path.basename(f).replace('.ts','')
    for f in glob.glob('src/algorithms/*.ts')
    if 'index.ts' not in os.path.basename(f)])
output.append(f"## 3. Algorithms ({len(algorithms)})")
for a in algorithms:
    output.append(f"- {a}")
output.append("")

# 4. REGISTRIES
registries = sorted([os.path.basename(f).replace('.ts','')
    for f in glob.glob('src/registries/*.ts')
    if 'index.ts' not in os.path.basename(f)])
output.append(f"## 4. Registries ({len(registries)})")
for r in registries:
    output.append(f"- {r}")
output.append("")

# 5. DATA FILES
data_files = sorted([os.path.basename(f)
    for f in glob.glob('src/data/*.ts')
    if 'index.ts' not in os.path.basename(f)])
output.append(f"## 5. Data & Tribal Knowledge ({len(data_files)})")
tip_files = [d for d in data_files if 'tip' in d.lower() or 'cam' in d.lower()]
other_data = [d for d in data_files if d not in tip_files]
output.append(f"### Tribal Tip Files ({len(tip_files)})")
for t in tip_files:
    output.append(f"- {t}")
output.append(f"### Other Data ({len(other_data)})")
for o in other_data:
    output.append(f"- {o}")
output.append("")

# 6. ENFORCEMENT HOOKS
hook_dir = os.path.expanduser("~/.claude/hooks/lib")
enforce_hooks = sorted([os.path.basename(f) for f in glob.glob(os.path.join(hook_dir, "enforce-*.py"))])
other_hooks = sorted([os.path.basename(f) for f in glob.glob(os.path.join(hook_dir, "*.py")) + glob.glob(os.path.join(hook_dir, "*.sh")) if 'enforce-' not in os.path.basename(f)])
output.append(f"## 6. Hooks & Scripts")
output.append(f"### Enforcement Hooks ({len(enforce_hooks)})")
for h in enforce_hooks:
    output.append(f"- {h}")
output.append(f"### Other Hook Scripts ({len(other_hooks)})")
for h in other_hooks:
    output.append(f"- {h}")
output.append("")

# 7. SLASH COMMANDS
cmd_dir = os.path.expanduser("~/.claude/commands")
commands = sorted([os.path.basename(f).replace('.md','') for f in glob.glob(os.path.join(cmd_dir, "*.md"))])
output.append(f"## 7. Slash Commands ({len(commands)})")
for c in commands:
    output.append(f"- /{c}")
output.append("")

# 8. MEMORY FILES
mem_dir = os.path.expanduser("~/.claude/projects/C--Windows-System32/memory")
mem_files = sorted([os.path.basename(f) for f in glob.glob(os.path.join(mem_dir, "*.md")) + glob.glob(os.path.join(mem_dir, "*.json"))])
output.append(f"## 8. Memory Files ({len(mem_files)})")
for m in mem_files:
    output.append(f"- {m}")
output.append("")

# 9. TESTS
test_count = len(glob.glob('src/__tests__/**/*.test.ts', recursive=True)) + len(glob.glob('tests/**/*.test.ts', recursive=True))
output.append(f"## 9. Test Files ({test_count})")
output.append("Located in: src/__tests__/ and tests/")
output.append("")

# 10. MILESTONES
milestones = glob.glob('data/milestones/*.json')
output.append(f"## 10. Milestones ({len(milestones)})")
output.append("")

# 11. ROADMAP FILES
output.append("## 11. Roadmap Files")
for rm in sorted(glob.glob("C:/PRISM/*-COMPREHENSIVE-ROADMAP*.md") + glob.glob("C:/PRISM/CAMX-*.md")):
    output.append(f"- {os.path.basename(rm)}")
output.append("")

# SUMMARY
output.append("## SUMMARY")
output.append(f"| Asset | Count |")
output.append(f"|-------|-------|")
output.append(f"| Engines | {len(engines)} |")
output.append(f"| Engine Categories | {len(categories)} |")
output.append(f"| Dispatchers | {len(dispatchers)} |")
output.append(f"| Algorithms | {len(algorithms)} |")
output.append(f"| Registries | {len(registries)} |")
output.append(f"| Data/Tribal files | {len(data_files)} |")
output.append(f"| Enforcement hooks | {len(enforce_hooks)} |")
output.append(f"| Hook scripts (all) | {len(enforce_hooks) + len(other_hooks)} |")
output.append(f"| Slash commands | {len(commands)} |")
output.append(f"| Memory files | {len(mem_files)} |")
output.append(f"| Test files | {test_count} |")
output.append(f"| Milestones | {len(milestones)} |")

result = '\n'.join(output)
with open('data/docs/MASTER_INDEX.md', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"MASTER_INDEX.md regenerated: {len(output)} lines, {len(categories)} engine categories")
