import json, os

# Get disk directories
disk_path = r'C:\PRISM\skills-consolidated'
disk_dirs = set(d for d in os.listdir(disk_path) if os.path.isdir(os.path.join(disk_path, d)))

# Get registry entries from SKILL_INVENTORY.json
inv_path = r'C:\PRISM\state\SKILL_INVENTORY.json'
if os.path.exists(inv_path):
    with open(inv_path, 'r') as f:
        inv = json.load(f)
    if isinstance(inv, list):
        reg_ids = set(s.get('skill_id','') for s in inv)
    elif isinstance(inv, dict) and 'skills' in inv:
        reg_ids = set(s.get('skill_id','') for s in inv['skills'])
    else:
        reg_ids = set(inv.keys()) if isinstance(inv, dict) else set()
else:
    reg_ids = set()

print(f"Disk dirs: {len(disk_dirs)}")
print(f"Registry entries: {len(reg_ids)}")
print(f"\n=== PHANTOMS (in registry, NOT on disk) ===")
phantoms = sorted(reg_ids - disk_dirs)
for p in phantoms:
    print(f"  {p}")
print(f"\nTotal phantoms: {len(phantoms)}")

print(f"\n=== UNREGISTERED (on disk, NOT in registry) ===")
unreg = sorted(disk_dirs - reg_ids)
for u in unreg:
    print(f"  {u}")
print(f"\nTotal unregistered: {len(unreg)}")
