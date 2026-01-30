import os, re
from pathlib import Path

base = Path('C:/PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)/EXTRACTED')
total = 0

mat_folders = ['materials', 'materials_complete', 'materials_enhanced', 'materials_v9_complete']

for folder_name in mat_folders:
    folder = base / folder_name
    if not folder.exists():
        continue
    
    folder_count = 0
    for cat_dir in folder.iterdir():
        if cat_dir.is_dir():
            for f in list(cat_dir.glob('*.js')) + list(cat_dir.glob('*.json')):
                try:
                    content = open(f, encoding='utf-8', errors='ignore').read()
                    count = 0
                    
                    match = re.search(r'Total materials:\s*(\d+)', content)
                    if match:
                        count = int(match.group(1))
                    else:
                        match = re.search(r'materialCount:\s*(\d+)', content)
                        if match:
                            count = int(match.group(1))
                        else:
                            match = re.search(r'"material_count":\s*(\d+)', content)
                            if match:
                                count = int(match.group(1))
                    
                    if count > 0:
                        print(f"  {cat_dir.name}/{f.name}: {count}")
                        folder_count += count
                except Exception as e:
                    pass
    
    if folder_count > 0:
        print(f"\n{folder_name}: {folder_count} materials total")
        total += folder_count

print(f"\n{'='*50}")
print(f"TOTAL IN PRISM REBUILD: {total}")
print(f"{'='*50}")
