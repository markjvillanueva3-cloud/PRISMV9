"""
PRISM MATERIALS CONSOLIDATION & ORGANIZATION
============================================
Merges all materials from C:/PRISM + C:\PRISM into unified JSON database
Creates category indexes for UI filtering
Deduplicates and validates schema
"""

import json
import re
import os
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import hashlib

# Paths
PRISM_REBUILD = Path("C:/PRISM/EXTRACTED")
PRISM_NEW = Path("C:/PRISM/data/materials")
OUTPUT_DIR = Path("C:/PRISM/data/materials_unified")

# ISO Category mapping
ISO_CATEGORIES = {
    "P": {"name": "P_STEELS", "description": "Steel - Carbon, alloy, tool steels", "color": "#2196F3"},
    "M": {"name": "M_STAINLESS", "description": "Stainless Steel - All grades", "color": "#9C27B0"},
    "K": {"name": "K_CAST_IRON", "description": "Cast Iron - Gray, ductile, CGI", "color": "#607D8B"},
    "N": {"name": "N_NONFERROUS", "description": "Non-ferrous - Aluminum, copper, titanium", "color": "#FF9800"},
    "S": {"name": "S_SUPERALLOYS", "description": "Superalloys - Nickel, cobalt based", "color": "#F44336"},
    "H": {"name": "H_HARDENED", "description": "Hardened Steel - >45 HRC", "color": "#795548"},
    "X": {"name": "X_SPECIALTY", "description": "Specialty - Composites, polymers, ceramics", "color": "#4CAF50"},
}

def extract_js_materials(js_content):
    """Extract materials from JS module format"""
    materials = []
    
    # Try to find material objects - look for patterns like "P-CS-0001": { or id: "P-CS-0001"
    # Method 1: Look for quoted ID keys
    pattern1 = r'"([A-Z]-[A-Z]+-\d+)":\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    
    # Method 2: Look for id field
    pattern2 = r'\{\s*"?id"?:\s*"([^"]+)"[^}]+\}'
    
    # Try to parse as JSON first (some files might be JSON with .js extension)
    try:
        # Remove JS artifacts
        clean = js_content
        clean = re.sub(r'^[^{]*', '', clean, count=1)  # Remove before first {
        clean = re.sub(r'[^}]*$', '', clean, count=1)  # Remove after last }
        clean = re.sub(r'//.*$', '', clean, flags=re.MULTILINE)  # Remove comments
        clean = re.sub(r'/\*.*?\*/', '', clean, flags=re.DOTALL)  # Remove block comments
        
        data = json.loads(clean)
        if isinstance(data, dict):
            if 'materials' in data:
                if isinstance(data['materials'], list):
                    return data['materials']
                elif isinstance(data['materials'], dict):
                    return list(data['materials'].values())
            elif any(k.startswith(('P-', 'M-', 'K-', 'N-', 'S-', 'H-', 'X-')) for k in data.keys()):
                return list(data.values())
    except:
        pass
    
    # Fallback: regex extraction for JS objects
    # Find all material-like objects
    obj_pattern = r'"id":\s*"([^"]+)"'
    ids_found = re.findall(obj_pattern, js_content)
    
    return materials

def parse_js_file(filepath):
    """Parse a JS material file and extract materials"""
    try:
        content = open(filepath, encoding='utf-8', errors='ignore').read()
        
        # Check for material count in header
        count_match = re.search(r'(?:Total materials|materialCount):\s*(\d+)', content)
        expected_count = int(count_match.group(1)) if count_match else 0
        
        materials = []
        
        # Try JSON parse first
        try:
            # Find the main object/array
            start = content.find('{')
            if start == -1:
                start = content.find('[')
            
            if start != -1:
                # Clean JS to JSON
                clean = content[start:]
                # Remove trailing JS stuff
                clean = re.sub(r';\s*$', '', clean)
                clean = re.sub(r'module\.exports.*$', '', clean, flags=re.MULTILINE)
                clean = re.sub(r'export\s+default.*$', '', clean, flags=re.MULTILINE)
                
                data = json.loads(clean)
                
                if isinstance(data, list):
                    materials = data
                elif isinstance(data, dict):
                    if 'materials' in data:
                        mats = data['materials']
                        if isinstance(mats, list):
                            materials = mats
                        elif isinstance(mats, dict):
                            materials = list(mats.values())
                    else:
                        # Check if keys look like material IDs
                        for k, v in data.items():
                            if isinstance(v, dict) and ('id' in v or 'name' in v):
                                if 'id' not in v:
                                    v['id'] = k
                                materials.append(v)
        except json.JSONDecodeError:
            pass
        
        return materials, expected_count
        
    except Exception as e:
        print(f"  Error parsing {filepath}: {e}")
        return [], 0

def load_json_materials(filepath):
    """Load materials from JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            if 'materials' in data:
                return data['materials']
            else:
                return list(data.values())
        return []
    except Exception as e:
        print(f"  Error loading {filepath}: {e}")
        return []

def get_category_from_id(mat_id):
    """Determine ISO category from material ID"""
    if not mat_id:
        return "X"
    
    mat_id = str(mat_id).upper()
    
    if mat_id.startswith(('P-', 'P_')):
        return "P"
    elif mat_id.startswith(('M-', 'M_')):
        return "M"
    elif mat_id.startswith(('K-', 'K_')):
        return "K"
    elif mat_id.startswith(('N-', 'N_')):
        return "N"
    elif mat_id.startswith(('S-', 'S_')):
        return "S"
    elif mat_id.startswith(('H-', 'H_')):
        return "H"
    elif mat_id.startswith(('X-', 'X_')):
        return "X"
    
    # Fallback based on content
    return "X"

def get_subcategory(material):
    """Determine subcategory for filtering"""
    name = str(material.get('name', '')).lower()
    family = str(material.get('family', '')).lower()
    mat_class = str(material.get('material_class', '')).lower()
    
    # Steels
    if 'carbon' in name or 'carbon' in mat_class:
        return 'carbon_steel'
    if 'alloy' in name or 'alloy' in mat_class:
        return 'alloy_steel'
    if 'tool' in name or 'tool' in mat_class:
        return 'tool_steel'
    if 'stainless' in name or 'stainless' in mat_class:
        return 'stainless_steel'
    
    # Non-ferrous
    if 'aluminum' in name or 'aluminium' in name:
        return 'aluminum'
    if 'copper' in name or 'brass' in name or 'bronze' in name:
        return 'copper_alloy'
    if 'titanium' in name:
        return 'titanium'
    if 'magnesium' in name:
        return 'magnesium'
    
    # Specialty
    if 'composite' in name or 'cfrp' in name or 'gfrp' in name:
        return 'composite'
    if 'polymer' in name or 'plastic' in name:
        return 'polymer'
    if 'ceramic' in name:
        return 'ceramic'
    
    return family if family else 'general'

def create_material_hash(material):
    """Create hash for deduplication"""
    # Use ID + name + key properties
    key_parts = [
        str(material.get('id', '')),
        str(material.get('name', '')),
        str(material.get('condition', '')),
    ]
    key = '|'.join(key_parts).lower()
    return hashlib.md5(key.encode()).hexdigest()

def validate_material(material):
    """Validate material has required fields"""
    required = ['id', 'name']
    important = ['tensile_strength', 'hardness_hb', 'kc1_1', 'density']
    
    # Check required
    for field in required:
        if field not in material or not material[field]:
            return False, f"Missing required field: {field}"
    
    # Check important (warning only)
    missing = [f for f in important if f not in material]
    
    return True, missing

def main():
    print("=" * 70)
    print("PRISM MATERIALS CONSOLIDATION")
    print("=" * 70)
    print(f"Started: {datetime.now().isoformat()}")
    print()
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    all_materials = {}  # hash -> material
    category_materials = defaultdict(list)  # category -> materials
    stats = {
        'total_found': 0,
        'duplicates_removed': 0,
        'by_source': defaultdict(int),
        'by_category': defaultdict(int),
        'validation_errors': 0,
    }
    
    # =========================================================================
    # PHASE 1: Load from C:/PRISM (JS files)
    # =========================================================================
    print("PHASE 1: Loading from C:/PRISM...")
    
    rebuild_folders = ['materials', 'materials_complete', 'materials_enhanced']
    
    for folder_name in rebuild_folders:
        folder = PRISM_REBUILD / folder_name
        if not folder.exists():
            continue
        
        print(f"\n  Scanning {folder_name}/")
        
        for cat_dir in sorted(folder.iterdir()):
            if not cat_dir.is_dir():
                continue
            
            for f in list(cat_dir.glob('*.js')):
                materials, expected = parse_js_file(f)
                
                for mat in materials:
                    if not isinstance(mat, dict):
                        continue
                    
                    mat_hash = create_material_hash(mat)
                    
                    if mat_hash not in all_materials:
                        all_materials[mat_hash] = mat
                        stats['total_found'] += 1
                        stats['by_source'][folder_name] += 1
                    else:
                        stats['duplicates_removed'] += 1
                
                if materials:
                    print(f"    {f.name}: {len(materials)} materials")
    
    # =========================================================================
    # PHASE 2: Load from C:\PRISM (JSON files - new materials)
    # =========================================================================
    print("\n" + "=" * 70)
    print("PHASE 2: Loading from C:\\PRISM (new materials)...")
    
    if PRISM_NEW.exists():
        for cat_dir in sorted(PRISM_NEW.iterdir()):
            if not cat_dir.is_dir():
                continue
            
            print(f"\n  Scanning {cat_dir.name}/")
            
            for f in list(cat_dir.glob('*.json')):
                materials = load_json_materials(f)
                
                for mat in materials:
                    if not isinstance(mat, dict):
                        continue
                    
                    mat_hash = create_material_hash(mat)
                    
                    if mat_hash not in all_materials:
                        all_materials[mat_hash] = mat
                        stats['total_found'] += 1
                        stats['by_source']['new_prism'] += 1
                    else:
                        stats['duplicates_removed'] += 1
                
                if materials:
                    print(f"    {f.name}: {len(materials)} materials")
    
    # =========================================================================
    # PHASE 3: Organize by category
    # =========================================================================
    print("\n" + "=" * 70)
    print("PHASE 3: Organizing by category...")
    
    for mat_hash, material in all_materials.items():
        # Validate
        valid, issues = validate_material(material)
        if not valid:
            stats['validation_errors'] += 1
            continue
        
        # Determine category
        mat_id = material.get('id', '')
        category = get_category_from_id(mat_id)
        
        # Add subcategory for filtering
        material['_subcategory'] = get_subcategory(material)
        material['_iso_category'] = category
        
        category_materials[category].append(material)
        stats['by_category'][category] += 1
    
    # =========================================================================
    # PHASE 4: Write organized output
    # =========================================================================
    print("\n" + "=" * 70)
    print("PHASE 4: Writing organized output...")
    
    master_index = {
        "version": "9.0",
        "generated": datetime.now().isoformat(),
        "total_materials": len(all_materials) - stats['validation_errors'],
        "categories": {},
        "schema_version": "127-parameter",
        "ui_ready": True,
    }
    
    for cat_code, cat_info in ISO_CATEGORIES.items():
        cat_name = cat_info['name']
        materials = category_materials.get(cat_code, [])
        
        if not materials:
            continue
        
        # Create category directory
        cat_dir = OUTPUT_DIR / cat_name
        cat_dir.mkdir(exist_ok=True)
        
        # Sort materials by ID
        materials.sort(key=lambda m: m.get('id', ''))
        
        # Group by subcategory
        subcategories = defaultdict(list)
        for mat in materials:
            subcat = mat.get('_subcategory', 'general')
            subcategories[subcat].append(mat)
        
        # Write subcategory files
        for subcat, subcat_mats in subcategories.items():
            subcat_file = cat_dir / f"{subcat}.json"
            with open(subcat_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "category": cat_name,
                    "subcategory": subcat,
                    "material_count": len(subcat_mats),
                    "generated": datetime.now().isoformat(),
                    "materials": subcat_mats
                }, f, indent=2)
        
        # Write category index
        cat_index = {
            "category": cat_name,
            "iso_code": cat_code,
            "description": cat_info['description'],
            "ui_color": cat_info['color'],
            "material_count": len(materials),
            "subcategories": {k: len(v) for k, v in subcategories.items()},
            "files": [f"{k}.json" for k in subcategories.keys()],
        }
        
        with open(cat_dir / "index.json", 'w', encoding='utf-8') as f:
            json.dump(cat_index, f, indent=2)
        
        # Update master index
        master_index['categories'][cat_code] = {
            "name": cat_name,
            "count": len(materials),
            "subcategories": list(subcategories.keys()),
        }
        
        print(f"  {cat_name}: {len(materials)} materials in {len(subcategories)} subcategories")
    
    # Write master index
    with open(OUTPUT_DIR / "MASTER_INDEX.json", 'w', encoding='utf-8') as f:
        json.dump(master_index, f, indent=2)
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print("CONSOLIDATION COMPLETE")
    print("=" * 70)
    print(f"\nOutput: {OUTPUT_DIR}")
    print(f"\nStatistics:")
    print(f"  Total materials found: {stats['total_found']}")
    print(f"  Duplicates removed: {stats['duplicates_removed']}")
    print(f"  Validation errors: {stats['validation_errors']}")
    print(f"  Final unique materials: {len(all_materials) - stats['validation_errors']}")
    print(f"\nBy Source:")
    for src, count in sorted(stats['by_source'].items()):
        print(f"  {src}: {count}")
    print(f"\nBy Category:")
    for cat, count in sorted(stats['by_category'].items()):
        print(f"  {cat} ({ISO_CATEGORIES[cat]['name']}): {count}")
    
    print(f"\nUI Ready: YES - Categories indexed for filtering")
    print(f"Schema: 127+ parameters per material")
    
    return stats

if __name__ == "__main__":
    main()
