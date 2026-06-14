"""Quick check for 100% uniqueness on numeric parameters"""
import json
from pathlib import Path
from collections import defaultdict

BASE = Path(r"C:\PRISM\data\materials")
NUMERIC_PARAMS = [
    ("physical.density", "phys.density"),
    ("physical.melting_point", "phys.melting_point"),
    ("physical.thermal_conductivity", "phys.thermal_cond"),
    ("kienzle.kc1_1", "kienzle.kc1_1"),
    ("kienzle.mc", "kienzle.mc"),
    ("johnson_cook.A", "jc.A"),
    ("johnson_cook.B", "jc.B"),
    ("johnson_cook.n", "jc.n"),
    ("johnson_cook.C", "jc.C"),
    ("johnson_cook.T_ref", "jc.T_ref"),
    ("johnson_cook.epsilon_dot_ref", "jc.eps_ref"),
    ("taylor.C", "taylor.C"),
    ("taylor.n", "taylor.n"),
    ("machinability.aisi_rating", "mach.aisi"),
    ("cutting_recommendations.turning.speed_roughing", "cut.turn.sr"),
    ("cutting_recommendations.drilling.speed", "cut.drill.spd"),
    ("cutting_recommendations.coolant.pressure", "cut.cool.pres"),
    ("cutting_recommendations.coolant.flow_rate", "cut.cool.flow"),
    ("process_specific.edm_machinability", "proc.edm"),
]

def get_nested(obj, path):
    parts = path.split(".")
    for p in parts:
        if isinstance(obj, dict):
            obj = obj.get(p)
        else:
            return None
    return obj

materials = []
for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
    dir_path = BASE / iso_dir
    if not dir_path.exists():
        continue
    for f in dir_path.glob("*.json"):
        if f.name.startswith("_") or f.name == "index.json":
            continue
        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
            for m in data.get("materials", []):
                if isinstance(m, dict):
                    materials.append(m)
        except:
            pass

print(f"Total materials: {len(materials)}")
print("=" * 70)
print(f"{'Parameter':<40} {'Unique':>8} {'Total':>8} {'%':>8}")
print("=" * 70)

all_100 = True
for path, label in NUMERIC_PARAMS:
    values = []
    for m in materials:
        v = get_nested(m, path)
        if v is not None:
            values.append(v)
    unique = len(set(values))
    total = len(values)
    pct = unique/total*100 if total > 0 else 0
    status = "OK" if unique == total else "DUPE"
    if unique != total:
        all_100 = False
    print(f"{label:<40} {unique:>8} {total:>8} {pct:>7.1f}% {status}")

print("=" * 70)
print(f"ALL NUMERIC 100% UNIQUE: {'YES' if all_100 else 'NO - needs work'}")
