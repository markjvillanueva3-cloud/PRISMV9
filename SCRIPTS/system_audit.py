"""
PRISM System Comprehensive Audit
Checks all skills, agents, scripts, hooks, and tools
"""

import os
import json
from pathlib import Path
from collections import defaultdict

PRISM_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
SKILLS_DIR = PRISM_ROOT / "_SKILLS"
SCRIPTS_DIR = PRISM_ROOT / "SCRIPTS"
PRISM_MASTER = PRISM_ROOT / "_PRISM_MASTER"

print("=" * 80)
print("PRISM SYSTEM COMPREHENSIVE AUDIT")
print("=" * 80)

# =============================================================================
# 1. COUNT SKILL DIRECTORIES
# =============================================================================
print("\n" + "=" * 80)
print("1. SKILL DIRECTORIES AUDIT")
print("=" * 80)

skill_dirs = [d for d in SKILLS_DIR.iterdir() if d.is_dir() and d.name.startswith('prism-')]
print(f"\nTotal skill directories: {len(skill_dirs)}")

# Check for SKILL.md in each
valid_skills = []
missing_skill_md = []
for d in skill_dirs:
    skill_file = d / "SKILL.md"
    if skill_file.exists():
        valid_skills.append(d.name)
    else:
        missing_skill_md.append(d.name)

print(f"Valid skills (have SKILL.md): {len(valid_skills)}")
print(f"Missing SKILL.md: {len(missing_skill_md)}")

if missing_skill_md:
    print("\n  MISSING SKILL.md IN:")
    for m in missing_skill_md[:10]:
        print(f"    - {m}")
    if len(missing_skill_md) > 10:
        print(f"    ... and {len(missing_skill_md) - 10} more")

# =============================================================================
# 2. CHECK CRITICAL INFRASTRUCTURE FILES
# =============================================================================
print("\n" + "=" * 80)
print("2. CRITICAL INFRASTRUCTURE FILES")
print("=" * 80)

critical_files = {
    "CURRENT_STATE.json": PRISM_ROOT / "CURRENT_STATE.json",
    "RESOURCE_REGISTRY.json": PRISM_ROOT / "RESOURCE_REGISTRY.json",
    "CAPABILITY_MATRIX.json": PRISM_ROOT / "CAPABILITY_MATRIX.json",
    "SYNERGY_MATRIX.json": PRISM_ROOT / "SYNERGY_MATRIX.json",
    "FORMULA_REGISTRY.json": PRISM_ROOT / "FORMULA_REGISTRY.json",
    "SKILL_MANIFEST_v6.0.json": SKILLS_DIR / "SKILL_MANIFEST_v6.0.json",
    "prism-skill-orchestrator_v6_SKILL.md": SKILLS_DIR / "prism-skill-orchestrator_v6_SKILL.md",
    "AGENT_MANIFEST.json": PRISM_MASTER / "AGENTS" / "AGENT_MANIFEST.json",
    "cognitive-hooks-wiring-v1.md": SKILLS_DIR / "cognitive-hooks-wiring-v1.md",
}

print("\n  STATUS:")
for name, path in critical_files.items():
    status = "✓ EXISTS" if path.exists() else "✗ MISSING"
    print(f"    {status}: {name}")

# =============================================================================
# 3. CHECK SCRIPTS
# =============================================================================
print("\n" + "=" * 80)
print("3. SCRIPTS AUDIT")
print("=" * 80)

expected_scripts = [
    "prism_unified_system_v6.py",  # Referenced in DEVELOPMENT_PROMPT
    "prism_unified_system_v5.py",
    "prism_unified_system_v4.py",
    "prism_unified_system_v3.py",
    "extraction_orchestrator.py",
    "session_manager.py",
    "update_state.py",
    "regression_checker.py",
]

print("\n  SCRIPT STATUS:")
for script in expected_scripts:
    path = SCRIPTS_DIR / script
    status = "✓ EXISTS" if path.exists() else "✗ MISSING"
    print(f"    {status}: {script}")

# Check for testing directory
testing_dir = SCRIPTS_DIR / "testing"
print(f"\n  Testing directory: {'✓ EXISTS' if testing_dir.exists() else '✗ MISSING'}")

# =============================================================================
# 4. VERSION DISCREPANCIES
# =============================================================================
print("\n" + "=" * 80)
print("4. VERSION DISCREPANCIES")
print("=" * 80)

# Read manifest to check stated vs actual
manifest_path = SKILLS_DIR / "SKILL_MANIFEST_v6.0.json"
if manifest_path.exists():
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    stated_skills = manifest.get('totalSkills', 0)
    print(f"\n  Manifest states: {stated_skills} skills")
    print(f"  Actual directories: {len(skill_dirs)}")
    print(f"  Valid (with SKILL.md): {len(valid_skills)}")
    
    if stated_skills != len(valid_skills):
        print(f"\n  ⚠ DISCREPANCY: {abs(stated_skills - len(valid_skills))} difference")

# Read agent manifest
agent_manifest = PRISM_MASTER / "AGENTS" / "AGENT_MANIFEST.json"
if agent_manifest.exists():
    with open(agent_manifest, 'r') as f:
        agents = json.load(f)
    stated_agents = agents.get('totalAgents', 0)
    print(f"\n  Agent Manifest states: {stated_agents} agents")

# =============================================================================
# 5. PATH CONSISTENCY CHECK
# =============================================================================
print("\n" + "=" * 80)
print("5. PATH CONSISTENCY CHECK")
print("=" * 80)

# Check paths referenced in DEVELOPMENT_PROMPT vs actual
dev_prompt_paths = {
    "STATE_FILE": PRISM_ROOT / "CURRENT_STATE.json",
    "SKILLS_DIR": SKILLS_DIR,
    "SESSION_LOGS": PRISM_ROOT / "SESSION_LOGS",
    "EXTRACTED": PRISM_ROOT / "EXTRACTED",
    "SCRIPTS": SCRIPTS_DIR,
    "MONOLITH": PRISM_ROOT / "_BUILD" / "PRISM_v8_89_002_TRUE_100_PERCENT",
}

print("\n  PATHS:")
for name, path in dev_prompt_paths.items():
    status = "✓ EXISTS" if path.exists() else "✗ MISSING"
    print(f"    {status}: {name}")

# =============================================================================
# 6. SKILL CATEGORIES CHECK
# =============================================================================
print("\n" + "=" * 80)
print("6. SKILL CATEGORIES")
print("=" * 80)

categories = defaultdict(list)
for skill in valid_skills:
    if 'sp-' in skill:
        categories['SP Workflow'].append(skill)
    elif 'expert-' in skill:
        categories['Expert Roles'].append(skill)
    elif 'material-' in skill:
        categories['Materials'].append(skill)
    elif 'ai-' in skill:
        categories['AI/ML'].append(skill)
    elif 'monolith-' in skill:
        categories['Monolith'].append(skill)
    elif 'cognitive' in skill or 'reasoning' in skill or 'safety-framework' in skill:
        categories['Cognitive'].append(skill)
    elif 'session' in skill or 'state' in skill:
        categories['Session'].append(skill)
    else:
        categories['Other'].append(skill)

print("\n  CATEGORY BREAKDOWN:")
for cat, skills in sorted(categories.items()):
    print(f"    {cat}: {len(skills)}")

# =============================================================================
# SUMMARY
# =============================================================================
print("\n" + "=" * 80)
print("AUDIT SUMMARY")
print("=" * 80)

issues = []
if len(missing_skill_md) > 0:
    issues.append(f"{len(missing_skill_md)} skill directories missing SKILL.md")

missing_critical = [name for name, path in critical_files.items() if not path.exists()]
if missing_critical:
    issues.append(f"{len(missing_critical)} critical infrastructure files missing: {', '.join(missing_critical)}")

if not (SCRIPTS_DIR / "prism_unified_system_v6.py").exists():
    issues.append("prism_unified_system_v6.py (referenced in DEVELOPMENT_PROMPT) does not exist")

if not testing_dir.exists():
    issues.append("testing/ directory does not exist")

print("\n  ISSUES FOUND:")
if issues:
    for i, issue in enumerate(issues, 1):
        print(f"    {i}. {issue}")
else:
    print("    None - all checks passed!")

print("\n" + "=" * 80)
print("END OF AUDIT")
print("=" * 80)
