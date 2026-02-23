#!/usr/bin/env python3
"""
PRISM v16 GAP ANALYSIS
======================
Check for orphans, incomplete coverage, missing pieces
"""

import json
import os
from collections import defaultdict

REG_PATH = r"C:\PRISM\registries"

def load_registry(name):
    path = os.path.join(REG_PATH, name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

print("=" * 100)
print("PRISM v16 GAP ANALYSIS - Finding Orphans & Missing Pieces")
print("=" * 100)

# Load all registries
formulas = load_registry("FORMULA_REGISTRY.json")
engines = load_registry("ENGINE_REGISTRY.json")
databases = load_registry("DATABASE_REGISTRY.json")
precise_wiring = load_registry("PRECISE_WIRING_F2E.json")
validators = load_registry("VALIDATORS.json")
types = load_registry("TYPE_SYSTEM.json")
constants = load_registry("CONSTANTS_FOUNDATION.json")

gaps = []
warnings = []

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 1: Formulas with 0 engine connections (orphans)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[1] Checking for orphaned formulas (0 engine connections)...")

if precise_wiring:
    connections = precise_wiring.get("connections", {})
    orphaned_formulas = []
    low_connection_formulas = []
    
    for fid, data in connections.items():
        count = data.get("count", 0)
        if count == 0:
            orphaned_formulas.append(fid)
        elif count < 3:
            low_connection_formulas.append((fid, count))
    
    if orphaned_formulas:
        gaps.append(f"CRITICAL: {len(orphaned_formulas)} formulas have 0 engine connections")
        print(f"   CRITICAL: {len(orphaned_formulas)} orphaned formulas")
        for f in orphaned_formulas[:10]:
            print(f"      - {f}")
        if len(orphaned_formulas) > 10:
            print(f"      ... and {len(orphaned_formulas) - 10} more")
    else:
        print(f"   OK: No orphaned formulas")
    
    if low_connection_formulas:
        warnings.append(f"WARNING: {len(low_connection_formulas)} formulas have < 3 connections")
        print(f"   WARNING: {len(low_connection_formulas)} formulas have < 3 connections")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 2: Engines not connected to any formula
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[2] Checking for orphaned engines (not connected to any formula)...")

if precise_wiring and engines:
    connected_engines = set()
    for fid, data in precise_wiring.get("connections", {}).items():
        connected_engines.update(data.get("engines", []))
    
    all_engines = set(e.get("id", "") for e in engines.get("engines", []))
    orphaned_engines = all_engines - connected_engines
    
    if orphaned_engines:
        warnings.append(f"WARNING: {len(orphaned_engines)} engines not connected to any formula")
        print(f"   WARNING: {len(orphaned_engines)} engines not connected to formulas")
        for e in list(orphaned_engines)[:10]:
            print(f"      - {e}")
    else:
        print(f"   OK: All engines connected")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 3: Database categories without formula connections
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[3] Checking database coverage...")

if databases:
    db_data = databases.get("databases", {})
    categories = set()
    for did, db in db_data.items():
        if isinstance(db, dict):
            categories.add(db.get("category", "UNKNOWN"))
    
    print(f"   Database categories: {len(categories)}")
    for cat in sorted(categories):
        print(f"      - {cat}")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 4: Missing validator coverage
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[4] Checking validator coverage...")

if validators:
    cats = validators.get("categories", {})
    total_validators = sum(len(v) for v in cats.values())
    critical = sum(1 for cat in cats.values() for v in cat.values() 
                   if isinstance(v, dict) and v.get("severity") == "CRITICAL")
    
    print(f"   Total validators: {total_validators}")
    print(f"   CRITICAL validators: {critical}")
    
    # Check for missing categories
    expected_categories = ["TYPE", "PHYSICS", "TOOL", "MACHINE", "MATERIAL", "BUSINESS", "PRISM"]
    missing_cats = [c for c in expected_categories if c not in cats]
    if missing_cats:
        gaps.append(f"Missing validator categories: {missing_cats}")
    else:
        print(f"   OK: All expected categories present")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 5: Type schema coverage
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[5] Checking type schema coverage...")

if types and formulas:
    formula_schemas = types.get("formulas", {})
    formula_list = formulas.get("formulas", [])
    
    formulas_without_schema = []
    for f in formula_list:
        fid = f.get("id", "")
        if fid not in formula_schemas:
            formulas_without_schema.append(fid)
    
    if formulas_without_schema:
        gaps.append(f"{len(formulas_without_schema)} formulas without type schemas")
        print(f"   WARNING: {len(formulas_without_schema)} formulas without schemas")
    else:
        print(f"   OK: All {len(formula_schemas)} formulas have schemas")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 6: Constants completeness
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[6] Checking constants completeness...")

if constants:
    cats = constants.get("categories", {})
    
    # Check for essential manufacturing constants
    essential = {
        "PHYSICAL": ["SPEED_OF_LIGHT", "GRAVITY_STANDARD"],
        "MATHEMATICAL": ["PI", "E"],
        "MANUFACTURING": ["KIENZLE_REF_THICKNESS", "TAYLOR_REF_VELOCITY"],
        "PRISM": ["OMEGA_MIN", "SAFETY_MIN"],
    }
    
    missing_constants = []
    for cat, required in essential.items():
        if cat in cats:
            cat_data = cats[cat]
            for const in required:
                found = False
                for subcat in cat_data.get("subcategories", {}).values():
                    if const in subcat:
                        found = True
                        break
                if not found:
                    missing_constants.append(f"{cat}.{const}")
    
    if missing_constants:
        gaps.append(f"Missing essential constants: {missing_constants}")
        print(f"   WARNING: Missing: {missing_constants}")
    else:
        print(f"   OK: All essential constants present")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 7: Cross-layer wiring completeness
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[7] Checking cross-layer wiring completeness...")

# Check if we have all wiring files
wiring_files = [
    "PRECISE_WIRING_F2E.json",  # Formula -> Engine
    # Missing:
    # "PRECISE_WIRING_D2F.json",  # Database -> Formula
    # "PRECISE_WIRING_E2S.json",  # Engine -> Skill
    # "PRECISE_WIRING_S2P.json",  # Skill -> Product
]

for wf in wiring_files:
    path = os.path.join(REG_PATH, wf)
    if os.path.exists(path):
        print(f"   OK: {wf}")
    else:
        print(f"   MISSING: {wf}")

# Check what's missing
missing_wiring = [
    "Database -> Formula precise wiring (only patterns defined, not full)",
    "Engine -> Skill precise wiring (only patterns defined, not full)",
    "Skill -> Product precise wiring (not defined)",
]
for mw in missing_wiring:
    warnings.append(f"Incomplete: {mw}")
    print(f"   TODO: {mw}")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 8: MCP Manifest sync with v16
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[8] Checking MCP manifest sync...")

mcp = load_registry("MCP_MASTER_MANIFEST.json")
if mcp:
    mcp_version = mcp.get("version", "unknown")
    if "16" not in mcp_version:
        warnings.append(f"MCP manifest not updated for v16 (current: {mcp_version})")
        print(f"   TODO: MCP manifest needs update to v16 (current: {mcp_version})")
    else:
        print(f"   OK: MCP manifest version {mcp_version}")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 9: Skill registry sync
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[9] Checking skill registry...")

skills = load_registry("SKILL_REGISTRY.json")
if skills:
    skill_list = skills.get("skills", [])
    print(f"   Skills: {len(skill_list)}")
    
    # Check for category distribution
    skill_cats = defaultdict(int)
    for s in skill_list:
        cat = s.get("category", "UNKNOWN") if isinstance(s, dict) else "UNKNOWN"
        skill_cats[cat] += 1
    
    if len(skill_cats) < 10:
        warnings.append("Skill categories may be too few")

# ═══════════════════════════════════════════════════════════════════════════════
# GAP 10: Hook/Agent coverage
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[10] Checking hook/agent coverage...")

hooks = load_registry("HOOK_REGISTRY.json")
agents = load_registry("AGENT_REGISTRY.json")

if hooks:
    hook_list = hooks.get("hooks", [])
    print(f"   Hooks: {len(hook_list)}")

if agents:
    agent_list = agents.get("agents", [])
    print(f"   Agents: {len(agent_list)}")

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 100)
print("GAP ANALYSIS SUMMARY")
print("=" * 100)

print(f"\nCRITICAL GAPS: {len(gaps)}")
for g in gaps:
    print(f"   [CRITICAL] {g}")

print(f"\nWARNINGS: {len(warnings)}")
for w in warnings:
    print(f"   [WARNING] {w}")

print("\n" + "-" * 100)
if len(gaps) == 0:
    print("NO CRITICAL GAPS - Architecture v16 is complete for this phase")
else:
    print(f"ACTION REQUIRED: {len(gaps)} critical gaps need attention")

print("\nRECOMMENDED NEXT STEPS:")
print("   1. Build precise D->F wiring (expand from patterns to full connections)")
print("   2. Build precise E->S wiring (expand from patterns to full connections)")
print("   3. Build S->P wiring")
print("   4. Update MCP manifest to v16")
print("   5. Implement TypeScript runtime with v16 architecture")
