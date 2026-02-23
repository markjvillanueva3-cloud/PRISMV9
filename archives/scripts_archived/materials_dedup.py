"""
PRISM DUPLICATE ENTRY REMOVER
Find and remove actual duplicate material entries (same name multiple times)
"""

import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_PATH = Path(r"C:\PRISM\data\materials")

def process_file(json_file):
    """Remove duplicate entries from a file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return {"file": json_file.name, "removed": 0}
        
        # Track seen names
        seen = set()
        unique_materials = []
        removed = 0
        
        for mat in materials:
            if not isinstance(mat, dict):
                continue
            
            name = mat.get("name", "")
            if name in seen:
                removed += 1
            else:
                seen.add(name)
                unique_materials.append(mat)
        
        if removed > 0:
            data["materials"] = unique_materials
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {"file": json_file.name, "removed": removed, "kept": len(unique_materials)}
    except Exception as e:
        return {"file": str(json_file), "error": str(e)}

def main():
    print("=" * 80)
    print("PRISM DUPLICATE ENTRY REMOVER")
    print("=" * 80)
    
    files = []
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if dir_path.exists():
            for f in dir_path.glob("*.json"):
                if not f.name.startswith("_") and f.name != "index.json":
                    files.append(f)
    
    total_removed = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f): f for f in files}
        for future in as_completed(futures):
            result = future.result()
            if result.get("removed", 0) > 0:
                print(f"  {result['file']}: removed {result['removed']} duplicates, kept {result['kept']}")
                total_removed += result["removed"]
    
    print(f"\nTotal duplicates removed: {total_removed}")

if __name__ == "__main__":
    main()
