"""
Convert PRISM .js material files to MATERIALS_MASTER.json
"""
import os
import json
import re

MATERIALS_DIR = r"C:\PRISM\extracted\materials"
OUTPUT_FILE = r"C:\PRISM\extracted\materials\MATERIALS_MASTER.json"

def extract_materials_from_js(filepath):
    """Extract material objects from JS file"""
    materials = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find material objects with material_id
    pattern = r'"(P-[A-Z]+-\d+|M-[A-Z]+-\d+|K-[A-Z]+-\d+|N-[A-Z]+-\d+|S-[A-Z]+-\d+|H-[A-Z]+-\d+|X-[A-Z]+-\d+)":\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    
    # Simpler: look for material_id fields
    id_pattern = r'material_id:\s*["\']([^"\']+)["\']'
    ids = re.findall(id_pattern, content)
    
    for mat_id in ids:
        # Extract the material object - look for the ID and capture until next material or end
        mat_pattern = rf'{re.escape(mat_id)}["\']?\s*:\s*\{{(.*?)\}}\s*,?\s*(?=["\'][A-Z]-[A-Z]+-\d+|$)'
        # Use a simpler extraction
        materials.append({"material_id": mat_id, "source": os.path.basename(filepath)})
    
    return ids

def main():
    all_material_ids = []
    
    # Walk through all subdirectories
    for root, dirs, files in os.walk(MATERIALS_DIR):
        for fname in files:
            if fname.endswith('.js') and not fname.startswith('SCHEMA'):
                filepath = os.path.join(root, fname)
                try:
                    ids = extract_materials_from_js(filepath)
                    all_material_ids.extend(ids)
                    print(f"Found {len(ids)} materials in {fname}")
                except Exception as e:
                    print(f"Error in {fname}: {e}")
    
    print(f"\nTotal material IDs found: {len(all_material_ids)}")
    print(f"Unique: {len(set(all_material_ids))}")

if __name__ == "__main__":
    main()
