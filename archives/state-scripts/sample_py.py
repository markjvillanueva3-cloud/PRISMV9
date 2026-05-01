import os, re

scripts_dir = r"C:\PRISM\scripts"
high_value = [
    r"validation\material_schema.py",
    r"validation\physics_consistency.py",
    r"validation\material_validator.py",
    r"core\semantic_code_index.py",
    r"core\agent_mcp_proxy.py",
    r"core\resume_detector.py",
    r"core\next_session_prep.py",
    r"core\phase0_hooks.py",
    r"core\manus_context_engineering.py",
    r"batch\enhance_127_params_swarm.py",
    r"agents\agent_definitions.py",
    r"core\computation_cache.py",
]

for rel in high_value:
    path = os.path.join(scripts_dir, rel)
    if not os.path.exists(path):
        print(f"\n--- {rel}: NOT FOUND ---")
        continue
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.count('\n')
    # Count real code lines (non-empty, non-comment)
    code_lines = sum(1 for l in content.split('\n') if l.strip() and not l.strip().startswith('#'))
    # Count class/function definitions
    classes = len(re.findall(r'^class \w+', content, re.MULTILINE))
    funcs = len(re.findall(r'^    def \w+|^def \w+', content, re.MULTILINE))
    # Check for TODO/STUB/placeholder
    todos = len(re.findall(r'TODO|STUB|pass$|NotImplemented|placeholder', content, re.MULTILINE))
    # Get docstring/first comment
    doc_match = re.search(r'"""(.*?)"""', content, re.DOTALL)
    doc = doc_match.group(1).strip()[:150] if doc_match else "(no docstring)"
    
    print(f"\n{'='*70}")
    print(f"  {rel}")
    print(f"  {lines}L total, {code_lines}L code, {classes} classes, {funcs} methods, {todos} TODOs/stubs")
    print(f"  Purpose: {doc}")
