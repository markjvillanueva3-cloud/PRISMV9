import os

scripts_dir = r"C:\PRISM\scripts"
categories = {
    "VALIDATION & PHYSICS": [],
    "MATERIAL PROCESSING": [],
    "SESSION & STATE": [],
    "CONTEXT ENGINEERING": [],
    "AGENT & ORCHESTRATION": [],
    "SKILL & SCRIPT MGMT": [],
    "EXTRACTION & DATA": [],
    "TESTING": [],
    "AUTOMATION & TOOLING": [],
    "OTHER": []
}

def categorize(rel):
    r = rel.lower()
    if 'valid' in r or 'physics' in r or 'schema' in r:
        return "VALIDATION & PHYSICS"
    if 'material' in r or 'enhance' in r or 'jc_' in r or '127_param' in r:
        return "MATERIAL PROCESSING"
    if 'session' in r or 'state' in r or 'checkpoint' in r or 'handoff' in r or 'resume' in r or 'recovery' in r or 'wip' in r or 'compaction' in r or 'rollback' in r:
        return "SESSION & STATE"
    if 'context' in r or 'attention' in r or 'focus' in r or 'pressure' in r or 'compress' in r or 'relevance' in r or 'manus_context' in r or 'efficiency' in r or 'prompt' in r:
        return "CONTEXT ENGINEERING"
    if 'agent' in r or 'orchestrat' in r or 'swarm' in r or 'clone' in r or 'queue' in r or 'batch' in r:
        return "AGENT & ORCHESTRATION"
    if 'skill' in r or 'script' in r or 'hook' in r or 'gsd' in r or 'template' in r:
        return "SKILL & SCRIPT MGMT"
    if 'extract' in r or 'index' in r or 'tool' in r or 'controller' in r or 'alarm' in r or 'registry_builder' in r or 'convert' in r or 'excel' in r or 'json' in r or 'duckdb' in r:
        return "EXTRACTION & DATA"
    if 'test' in r or 'utiliz' in r or 'regression_check' in r or 'diag_' in r:
        return "TESTING"
    if 'auto' in r or 'git' in r or 'cleanup' in r or 'sync' in r or 'obsidian' in r or 'snapshot' in r:
        return "AUTOMATION & TOOLING"
    return "OTHER"

for root, dirs, files in os.walk(scripts_dir):
    dirs[:] = [d for d in dirs if d not in ('__pycache__', '_archive')]
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    lines = len(fh.readlines())
                size = os.path.getsize(path)
                rel = os.path.relpath(path, scripts_dir)
                cat = categorize(rel)
                categories[cat].append((lines, size, rel))
            except:
                pass

for cat, files in sorted(categories.items(), key=lambda x: -sum(f[0] for f in x[1])):
    total = sum(f[0] for f in files)
    print(f"\n{'='*70}")
    print(f"  {cat}: {len(files)} files, {total:,} lines")
    print(f"{'='*70}")
    for lines, size, path in sorted(files, key=lambda x: -x[0])[:8]:
        print(f"  {lines:>5}L  {path}")
    if len(files) > 8:
        print(f"  ... +{len(files)-8} more")
