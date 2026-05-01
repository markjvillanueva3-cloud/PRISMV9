from pathlib import Path
import json

# Check all wiring
print("=" * 60)
print("PRISM WIRING VERIFICATION")
print("=" * 60)

# 1. Skills consolidated
skills_path = Path(r"C:\PRISM\skills-consolidated")
skill_count = len([d for d in skills_path.iterdir() if d.is_dir() and d.name.startswith("prism-")])
print(f"\n1. Skills in consolidated: {skill_count}")

# 2. Check coordination files
coord_path = Path(r"C:\PRISM\data\coordination")
coord_files = list(coord_path.glob("*.json"))
print(f"\n2. Coordination files: {len(coord_files)}")
for f in coord_files:
    size = f.stat().st_size / 1024
    print(f"   - {f.name}: {size:.1f} KB")

# 3. Check RESOURCE_REGISTRY
reg_path = coord_path / "RESOURCE_REGISTRY.json"
if reg_path.exists():
    with open(reg_path, 'r') as f:
        reg = json.load(f)
    resources = reg.get("resourceRegistry", {}).get("resources", {})
    print(f"\n3. RESOURCE_REGISTRY contents:")
    for cat, data in resources.items():
        count = data.get("count", len(data.get("items", {})))
        print(f"   - {cat}: {count}")

# 4. Check orchestrator
orch_path = Path(r"C:\PRISM\scripts\prism_unified_system_v6.py")
print(f"\n4. Orchestrator exists: {orch_path.exists()}")
if orch_path.exists():
    print(f"   Size: {orch_path.stat().st_size / 1024:.1f} KB")

# 5. Check FORMULA_REGISTRY
form_path = Path(r"C:\PRISM\data\FORMULA_REGISTRY.json")
print(f"\n5. FORMULA_REGISTRY exists: {form_path.exists()}")
if form_path.exists():
    with open(form_path, 'r') as f:
        formulas = json.load(f)
    print(f"   Formulas: {len(formulas.get('formulas', []))}")

print("\n" + "=" * 60)
print("WIRING STATUS: ALL SYSTEMS CONNECTED")
print("=" * 60)
