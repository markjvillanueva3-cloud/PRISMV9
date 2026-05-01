"""PRISM Full System Audit - Session 60"""
import os, re, json, glob

BASE = r"C:\PRISM\mcp-server"
SRC = os.path.join(BASE, "src")
DISP = os.path.join(SRC, "tools", "dispatchers")
ENG = os.path.join(SRC, "engines")
ORCH = os.path.join(SRC, "orchestration")
SCRIPTS = r"C:\PRISM\scripts\core"
SKILLS = r"C:\PRISM\skills-consolidated"
DATA = os.path.join(BASE, "data")
STATE = r"C:\PRISM\state"

results = {"dispatchers": [], "engines": [], "orchestration": [], "scripts": [], "skills": [], "hooks": [], "data_files": [], "gaps": []}

# 1. DISPATCHERS
print("=" * 60)
print("AUDIT 1: DISPATCHERS")
print("=" * 60)
if os.path.isdir(DISP):
    for f in sorted(os.listdir(DISP)):
        if not f.endswith(".ts"): continue
        path = os.path.join(DISP, f)
        content = open(path, encoding="utf-8", errors="replace").read()
        lines = content.count("\n") + 1
        cases = re.findall(r'case\s+["\'](\w+)["\']', content)
        stubs = re.findall(r'(placeholder|hardcoded|TODO|FIXME|stub|fake|deprecated|not.implemented)', content, re.I)
        imports = re.findall(r'from\s+["\']([^"\']+)["\']', content)
        engine_refs = [i for i in imports if "engine" in i.lower() or "Engine" in i]
        print(f"\n{f}: {lines}L, {len(cases)} actions, {len(stubs)} warnings")
        print(f"  Actions: {', '.join(cases[:15])}")
        if stubs: print(f"  WARNINGS: {', '.join(set(s.lower() for s in stubs))}")
        if engine_refs: print(f"  Engine refs: {engine_refs}")
        results["dispatchers"].append({"file": f, "lines": lines, "actions": cases, "warnings": [s.lower() for s in stubs]})

# 2. ENGINES
print("\n" + "=" * 60)
print("AUDIT 2: ENGINES")
print("=" * 60)
if os.path.isdir(ENG):
    for f in sorted(os.listdir(ENG)):
        if not f.endswith(".ts"): continue
        path = os.path.join(ENG, f)
        content = open(path, encoding="utf-8", errors="replace").read()
        lines = content.count("\n") + 1
        exports = re.findall(r'export\s+(?:class|function|const|async)\s+(\w+)', content)
        print(f"{f}: {lines}L, exports: {', '.join(exports[:5])}")
        results["engines"].append({"file": f, "lines": lines, "exports": exports})
else:
    print("  NO engines/ directory found")

# 3. ORCHESTRATION
print("\n" + "=" * 60)
print("AUDIT 3: ORCHESTRATION")
print("=" * 60)
if os.path.isdir(ORCH):
    for f in sorted(os.listdir(ORCH)):
        if not f.endswith(".ts"): continue
        path = os.path.join(ORCH, f)
        content = open(path, encoding="utf-8", errors="replace").read()
        lines = content.count("\n") + 1
        classes = re.findall(r'class\s+(\w+)', content)
        methods = re.findall(r'(?:async\s+)?(?:private|public|protected)?\s*(\w+)\s*\(', content)
        api_calls = len(re.findall(r'anthropic|claude|api\.anthropic|messages\.create|completions', content, re.I))
        print(f"{f}: {lines}L, classes: {classes}, methods: {len(methods)}, API refs: {api_calls}")
        results["orchestration"].append({"file": f, "lines": lines, "classes": classes, "method_count": len(methods), "api_refs": api_calls})

# 4. SCRIPTS
print("\n" + "=" * 60)
print("AUDIT 4: PYTHON SCRIPTS")
print("=" * 60)
script_categories = {}
if os.path.isdir(SCRIPTS):
    for root, dirs, files in os.walk(SCRIPTS):
        cat = os.path.relpath(root, SCRIPTS).split(os.sep)[0] if root != SCRIPTS else "root"
        for f in files:
            if not f.endswith(".py"): continue
            path = os.path.join(root, f)
            try:
                content = open(path, encoding="utf-8", errors="replace").read()
                lines = content.count("\n") + 1
            except:
                lines = 0
            if cat not in script_categories: script_categories[cat] = []
            script_categories[cat].append({"file": f, "lines": lines})
    for cat, scripts in sorted(script_categories.items()):
        total_lines = sum(s["lines"] for s in scripts)
        print(f"\n  [{cat}] {len(scripts)} scripts, {total_lines}L total")
        for s in scripts:
            print(f"    {s['file']}: {s['lines']}L")

# 5. SKILLS
print("\n" + "=" * 60)
print("AUDIT 5: SKILLS")
print("=" * 60)
skill_count = 0
skill_categories = {}
if os.path.isdir(SKILLS):
    for d in sorted(os.listdir(SKILLS)):
        skill_path = os.path.join(SKILLS, d)
        if not os.path.isdir(skill_path): continue
        skill_md = os.path.join(skill_path, "SKILL.md")
        has_md = os.path.exists(skill_md)
        # Try to determine category from directory name
        parts = d.split("-")
        cat = parts[0] if parts else "other"
        if cat not in skill_categories: skill_categories[cat] = []
        lines = 0
        if has_md:
            try: lines = open(skill_md, encoding="utf-8", errors="replace").read().count("\n") + 1
            except: pass
        skill_categories[cat].append({"name": d, "has_md": has_md, "lines": lines})
        skill_count += 1
    print(f"Total skills: {skill_count}")
    for cat, skills in sorted(skill_categories.items()):
        print(f"\n  [{cat}] {len(skills)} skills")
        for s in skills:
            status = f"{s['lines']}L" if s['has_md'] else "NO SKILL.md"
            print(f"    {s['name']}: {status}")

# 6. HOOKS
print("\n" + "=" * 60)
print("AUDIT 6: HOOKS")
print("=" * 60)
hook_reg = os.path.join(SRC, "hooks", "hookRegistration.ts")
if os.path.exists(hook_reg):
    content = open(hook_reg, encoding="utf-8", errors="replace").read()
    lines = content.count("\n") + 1
    hooks = re.findall(r'registerHook\s*\(\s*["\']([^"\']+)["\']', content)
    blocking = re.findall(r'blocking.*?true|pre.output|BLOCK', content, re.I)
    print(f"hookRegistration.ts: {lines}L, {len(hooks)} hooks registered")
    if hooks: print(f"  Hooks: {', '.join(hooks[:20])}")
    print(f"  Blocking refs: {len(blocking)}")
# Check for cadence functions
cadence_file = os.path.join(SRC, "hooks", "cadenceFunctions.ts")
if not os.path.exists(cadence_file):
    for root, dirs, files in os.walk(SRC):
        for f in files:
            if "cadence" in f.lower():
                cadence_file = os.path.join(root, f)
                break
if os.path.exists(cadence_file):
    content = open(cadence_file, encoding="utf-8", errors="replace").read()
    lines = content.count("\n") + 1
    fns = re.findall(r'(?:function|const)\s+(\w*[Cc]adence\w*)', content)
    print(f"\nCadence file: {os.path.basename(cadence_file)}: {lines}L")
    if fns: print(f"  Cadence fns: {', '.join(fns)}")

# 7. CROSS-REFERENCE: What's wired vs orphaned
print("\n" + "=" * 60)
print("AUDIT 7: CROSS-REFERENCE / WIRING ANALYSIS")
print("=" * 60)
# Read index.ts to find what's registered
index_path = os.path.join(SRC, "index.ts")
if os.path.exists(index_path):
    index_content = open(index_path, encoding="utf-8", errors="replace").read()
    registered = re.findall(r'register\w+Dispatcher\s*\(', index_content)
    imports = re.findall(r'from\s+["\']\.\/([^"\']+)["\']', index_content)
    print(f"index.ts: {len(registered)} dispatchers registered")
    print(f"  Imports: {len(imports)}")

# Check for Python modules NOT wired
print("\n  --- Unwired Python Modules ---")
py_modules_dir = os.path.join(BASE, "python_modules")
if os.path.isdir(py_modules_dir):
    for f in sorted(os.listdir(py_modules_dir)):
        if f.endswith(".py"):
            lines = open(os.path.join(py_modules_dir, f), encoding="utf-8", errors="replace").read().count("\n")
            print(f"  {f}: {lines}L")
else:
    # Search for any .py files in mcp-server
    py_count = 0
    for root, dirs, files in os.walk(BASE):
        if "node_modules" in root or "archive" in root: continue
        for f in files:
            if f.endswith(".py") and f != "audit_full.py":
                path = os.path.join(root, f)
                lines = open(path, encoding="utf-8", errors="replace").read().count("\n")
                relpath = os.path.relpath(path, BASE)
                print(f"  {relpath}: {lines}L")
                py_count += 1
    print(f"  Total .py files in mcp-server: {py_count}")

# 8. DATA FILES
print("\n" + "=" * 60)
print("AUDIT 8: DATA FILES")
print("=" * 60)
if os.path.isdir(DATA):
    for root, dirs, files in os.walk(DATA):
        if "archive" in root: continue
        for f in files:
            path = os.path.join(root, f)
            size = os.path.getsize(path)
            relpath = os.path.relpath(path, DATA)
            if size > 1000:
                print(f"  {relpath}: {size//1024}KB")

# 9. REGISTRY STATUS
print("\n" + "=" * 60)
print("AUDIT 9: REGISTRY STATUS")
print("=" * 60)
reg_dir = os.path.join(DATA, "registries")
if os.path.isdir(reg_dir):
    for f in sorted(os.listdir(reg_dir)):
        path = os.path.join(reg_dir, f)
        size = os.path.getsize(path)
        if f.endswith(".json"):
            try:
                data = json.load(open(path, encoding="utf-8"))
                if isinstance(data, list):
                    print(f"  {f}: {size//1024}KB, {len(data)} entries")
                elif isinstance(data, dict):
                    print(f"  {f}: {size//1024}KB, {len(data)} top-level keys")
            except:
                print(f"  {f}: {size//1024}KB (parse error)")
        else:
            print(f"  {f}: {size//1024}KB")
else:
    print("  No registries/ directory")

# 10. AGENT CONFIGS
print("\n" + "=" * 60)
print("AUDIT 10: AGENTS")
print("=" * 60)
agent_dir = os.path.join(DATA, "agents")
if os.path.isdir(agent_dir):
    for f in sorted(os.listdir(agent_dir)):
        if f.endswith(".json"):
            try:
                data = json.load(open(os.path.join(agent_dir, f), encoding="utf-8"))
                if isinstance(data, list):
                    tiers = {}
                    for a in data:
                        t = a.get("tier", "unknown")
                        tiers[t] = tiers.get(t, 0) + 1
                    print(f"  {f}: {len(data)} agents, tiers: {tiers}")
                elif isinstance(data, dict):
                    print(f"  {f}: {len(data)} keys")
            except:
                print(f"  {f}: parse error")
else:
    print("  No agents/ directory - checking elsewhere...")
    for root, dirs, files in os.walk(DATA):
        for f in files:
            if "agent" in f.lower():
                print(f"  Found: {os.path.relpath(os.path.join(root, f), DATA)}")

print("\n" + "=" * 60)
print("AUDIT COMPLETE")
print("=" * 60)
