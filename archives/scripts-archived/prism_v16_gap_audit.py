#!/usr/bin/env python3
"""
PRISM v16 GAP AUDIT
===================
Check for remaining gaps before moving on.
"""

import json
import os
from collections import defaultdict

REG_PATH = r"C:\PRISM\registries"

def load_json(name):
    path = os.path.join(REG_PATH, name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

print("=" * 80)
print("PRISM v16 ARCHITECTURE - GAP AUDIT")
print("=" * 80)

gaps = []
recommendations = []

# ═══════════════════════════════════════════════════════════════════════════════
# 1. CHECK PRECISE WIRING COMPLETENESS
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[1] PRECISE WIRING COMPLETENESS")

precise = load_json("PRECISE_WIRING_F2E.json")
if precise:
    connections = precise.get("connections", {})
    zero_conn = [fid for fid, data in connections.items() if data.get("count", 0) == 0]
    low_conn = [fid for fid, data in connections.items() if 0 < data.get("count", 0) < 3]
    
    print(f"   Total formulas wired: {len(connections)}")
    print(f"   Formulas with 0 connections: {len(zero_conn)}")
    print(f"   Formulas with <3 connections: {len(low_conn)}")
    
    if zero_conn:
        gaps.append(f"GAP: {len(zero_conn)} formulas have 0 engine connections")
        recommendations.append(f"FIX: Add fallback wiring for orphaned formulas")
        print(f"   ORPHANED: {zero_conn[:10]}..." if len(zero_conn) > 10 else f"   ORPHANED: {zero_conn}")

# ═══════════════════════════════════════════════════════════════════════════════
# 2. CHECK DATABASE->FORMULA WIRING
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[2] DATABASE->FORMULA WIRING")

db_reg = load_json("DATABASE_REGISTRY.json")
formula_reg = load_json("FORMULA_REGISTRY.json")

if db_reg and formula_reg:
    dbs = db_reg.get("databases", {})
    formulas = formula_reg.get("formulas", [])
    
    # Check if D->F is pattern-based or actual IDs
    print(f"   Databases: {len(dbs)}")
    print(f"   Formulas: {len(formulas)}")
    print(f"   D->F wiring: PATTERN-BASED (not materialized)")
    
    gaps.append("GAP: D->F wiring is pattern-based, not actual formula IDs")
    recommendations.append("FIX: Materialize D->F with actual formula IDs (optional - patterns work at runtime)")

# ═══════════════════════════════════════════════════════════════════════════════
# 3. CHECK ENGINE->SKILL WIRING
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[3] ENGINE->SKILL WIRING")

engine_reg = load_json("ENGINE_REGISTRY.json")
skill_reg = load_json("SKILL_REGISTRY.json")

if engine_reg and skill_reg:
    engines = engine_reg.get("engines", [])
    skills = skill_reg.get("skills", [])
    
    print(f"   Engines: {len(engines)}")
    print(f"   Skills: {len(skills)}")
    print(f"   E->S wiring: PATTERN-BASED (not materialized)")
    
    gaps.append("GAP: E->S wiring is pattern-based, not actual skill IDs")
    recommendations.append("FIX: Materialize E->S with actual skill IDs (optional - patterns work at runtime)")

# ═══════════════════════════════════════════════════════════════════════════════
# 4. CHECK VALIDATORS COVERAGE
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[4] VALIDATORS COVERAGE")

validators = load_json("VALIDATORS.json")
if validators:
    categories = validators.get("categories", {})
    boundaries = validators.get("boundaries", {})
    
    total = sum(len(v) for v in categories.values())
    critical = sum(1 for cat in categories.values() for v in cat.values() if v.get("severity") == "CRITICAL")
    
    print(f"   Total validators: {total}")
    print(f"   CRITICAL validators: {critical}")
    print(f"   Boundary definitions: {len(boundaries)}")
    print(f"   Implementation: DEFINITION ONLY (no actual code)")
    
    gaps.append("GAP: Validators are definitions only - no actual validation code")
    recommendations.append("LATER: Implement validators as TypeScript middleware (next session)")

# ═══════════════════════════════════════════════════════════════════════════════
# 5. CHECK TYPE SYSTEM COVERAGE
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[5] TYPE SYSTEM COVERAGE")

types = load_json("TYPE_SYSTEM.json")
if types:
    formula_schemas = types.get("formulas", {})
    domain_types = types.get("domain", {})
    
    print(f"   Formula schemas: {len(formula_schemas)}")
    print(f"   Domain types: {len(domain_types)}")
    print(f"   Implementation: JSON Schema (not TypeScript interfaces)")
    
    gaps.append("GAP: Type system is JSON Schema - no TypeScript interfaces generated")
    recommendations.append("LATER: Generate TypeScript interfaces from JSON Schema (next session)")

# ═══════════════════════════════════════════════════════════════════════════════
# 6. CHECK CONSTANTS COVERAGE
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[6] CONSTANTS COVERAGE")

constants = load_json("CONSTANTS_FOUNDATION.json")
if constants:
    categories = constants.get("categories", {})
    
    # Count all constants
    def count_values(obj):
        count = 0
        if isinstance(obj, dict):
            if "value" in obj or "factor" in obj:
                return 1
            for v in obj.values():
                count += count_values(v)
        return count
    
    total = count_values(categories)
    print(f"   Total constants: {total}")
    print(f"   Categories: {len(categories)}")
    
    # Check for missing categories
    expected = ["PHYSICAL", "MATHEMATICAL", "ENGINEERING", "MANUFACTURING", "STANDARDS", "PRISM", "CONVERSIONS"]
    present = list(categories.keys())
    missing = [e for e in expected if e not in present]
    
    if missing:
        gaps.append(f"GAP: Missing constant categories: {missing}")
    else:
        print(f"   All expected categories present: OK")

# ═══════════════════════════════════════════════════════════════════════════════
# 7. CHECK CROSS-CUTTING IMPLEMENTATION
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[7] CROSS-CUTTING CONCERNS")

arch = load_json("COMPLETE_ARCHITECTURE_v16.json")
if arch:
    cross = arch.get("crossCutting", {})
    print(f"   Logging: DEFINED (not implemented)")
    print(f"   Metrics: DEFINED (not implemented)")
    print(f"   Caching: DEFINED (not implemented)")
    print(f"   Events: DEFINED (not implemented)")
    print(f"   Errors: DEFINED (not implemented)")
    print(f"   Audit: DEFINED (not implemented)")
    
    gaps.append("GAP: Cross-cutting concerns are defined but not implemented")
    recommendations.append("LATER: Implement cross-cutting as decorators/middleware (next session)")

# ═══════════════════════════════════════════════════════════════════════════════
# 8. CHECK MCP MANIFEST
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[8] MCP MANIFEST")

mcp = load_json("MCP_MASTER_MANIFEST.json")
if mcp:
    version = mcp.get("version", "unknown")
    print(f"   MCP version: {version}")
    
    if "15" in version or "16" not in version:
        gaps.append("GAP: MCP manifest not updated to v16 architecture")
        recommendations.append("FIX NOW: Update MCP manifest with v16 structure")

# ═══════════════════════════════════════════════════════════════════════════════
# 9. CHECK SKILL->PRODUCT WIRING
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[9] SKILL->PRODUCT WIRING")

s2p = load_json("SKILL_PRODUCT_WIRING.json")
if s2p:
    products = s2p.get("products", {})
    stats = s2p.get("statistics", {})
    print(f"   Products defined: {len(products)}")
    print(f"   Total skill connections: {stats.get('totalSkillConnections', 0)}")
    print(f"   Avg skills per product: {stats.get('avgSkillsPerProduct', 0)}")
    for pname, pdata in products.items():
        print(f"      - {pname}: {pdata.get('totalSkills', 0)} skills")
else:
    print("   Status: Not explicitly defined in v16")
    gaps.append("GAP: No explicit Skill->Product wiring defined")
    recommendations.append("FIX NOW: Define which skills feed each product")

# ═══════════════════════════════════════════════════════════════════════════════
# 10. CHECK RUNTIME RESOLVER
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[10] RUNTIME RESOLVER")
print("   Status: Not implemented")
gaps.append("GAP: No runtime resolver for traversing the wiring graph")
recommendations.append("LATER: Implement runtime resolver in TypeScript (next session)")

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("GAP AUDIT SUMMARY")
print("=" * 80)

fix_now = []
fix_later = []

for i, gap in enumerate(gaps):
    rec = recommendations[i] if i < len(recommendations) else ""
    if "FIX NOW" in rec:
        fix_now.append((gap, rec))
    else:
        fix_later.append((gap, rec))

print(f"\nFIX NOW ({len(fix_now)} items):")
for gap, rec in fix_now:
    print(f"  - {gap}")
    print(f"    {rec}")

print(f"\nFIX LATER ({len(fix_later)} items):")
for gap, rec in fix_later:
    print(f"  - {gap}")
    print(f"    {rec}")

print("\n" + "=" * 80)
print("RECOMMENDATION:")
if fix_now:
    print(f"  {len(fix_now)} items should be fixed NOW (quick fixes)")
    print(f"  {len(fix_later)} items can wait for next session (implementation work)")
else:
    print("  All critical gaps addressed - ready for next session")
print("=" * 80)
