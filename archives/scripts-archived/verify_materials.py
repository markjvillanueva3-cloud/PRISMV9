#!/usr/bin/env python3
"""Verify all materials have the 5 required sections"""

import os
import re

MATERIALS_ROOT = r"C:\\PRISM\EXTRACTED\materials"

def verify_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find materials
    pattern = r"['\"]([A-Z]-[A-Z]{2,4}-\d{3})['\"]:\s*\{"
    complete = 0
    incomplete = 0
    missing_sections = []
    
    for match in re.finditer(pattern, content):
        mat_id = match.group(1)
        start = match.end() - 1
        
        # Find closing brace
        depth = 0
        end = -1
        for i in range(start, len(content)):
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        
        if end > start:
            mat_content = content[start:end]
            # Check for all 5 sections
            has_chip = 'chipFormation:' in mat_content
            has_friction = 'friction:' in mat_content
            has_thermal = 'thermalMachining:' in mat_content
            has_surface = 'surfaceIntegrity:' in mat_content
            has_stats = 'statisticalData:' in mat_content
            
            if all([has_chip, has_friction, has_thermal, has_surface, has_stats]):
                complete += 1
            else:
                incomplete += 1
                missing = []
                if not has_chip: missing.append('chipFormation')
                if not has_friction: missing.append('friction')
                if not has_thermal: missing.append('thermalMachining')
                if not has_surface: missing.append('surfaceIntegrity')
                if not has_stats: missing.append('statisticalData')
                missing_sections.append({'id': mat_id, 'missing': missing})
    
    return complete, incomplete, missing_sections

def main():
    print("=" * 60)
    print("  PRISM MATERIALS VERIFICATION")
    print("=" * 60)
    
    categories = ['P_STEELS', 'M_STAINLESS', 'K_CAST_IRON', 'N_NONFERROUS', 'S_SUPERALLOYS', 'H_HARDENED']
    
    total_complete = 0
    total_incomplete = 0
    all_missing = []
    
    for category in categories:
        cat_path = os.path.join(MATERIALS_ROOT, category)
        if not os.path.exists(cat_path):
            continue
        
        cat_complete = 0
        cat_incomplete = 0
        
        for filename in sorted(os.listdir(cat_path)):
            if not filename.endswith('.js'):
                continue
            
            filepath = os.path.join(cat_path, filename)
            comp, incomp, missing = verify_file(filepath)
            cat_complete += comp
            cat_incomplete += incomp
            all_missing.extend(missing)
        
        status = "[OK]" if cat_incomplete == 0 else "[!!]"
        print(f"  {status} {category}: {cat_complete} complete, {cat_incomplete} incomplete")
        total_complete += cat_complete
        total_incomplete += cat_incomplete
    
    print("-" * 60)
    print(f"  TOTAL: {total_complete} complete, {total_incomplete} incomplete")
    
    if total_incomplete == 0:
        print("\n  [SUCCESS] All materials have full 5-section coverage!")
    else:
        print(f"\n  [WARNING] {total_incomplete} materials need attention:")
        for m in all_missing[:10]:
            print(f"    {m['id']}: missing {m['missing']}")
        if len(all_missing) > 10:
            print(f"    ... and {len(all_missing)-10} more")

if __name__ == "__main__":
    main()
