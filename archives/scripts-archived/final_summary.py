import json
from pathlib import Path
from datetime import datetime

print("=" * 70)
print("COMPREHENSIVE EXTRACTION SUMMARY")
print("=" * 70)

base = Path(r'C:\PRISM\extracted_modules')

# Collect all extracted modules
all_extracted = {}
total_chars = 0
total_files = 0

for subdir in base.iterdir():
    if subdir.is_dir():
        for f in subdir.glob('*.js'):
            size = f.stat().st_size
            all_extracted[f.stem] = {
                'location': subdir.name,
                'size': size
            }
            total_chars += size
            total_files += 1

print("Total extracted: {} modules".format(total_files))
print("Total size: {:,} chars ({:.1f} MB)".format(total_chars, total_chars/1000000))

# Read inventory for comparison
inv = json.loads(Path(r'C:\PRISM\extracted_modules\MONOLITH_MODULE_INVENTORY.json').read_text(encoding='utf-8'))
all_modules = inv['modules_by_type'].get('const_modules', [])
print("Monolith modules: {}".format(len(all_modules)))
print("Extraction rate: {:.1f}%".format(100 * total_files / len(all_modules)))

# Missing modules
missing = [m for m in all_modules if m not in all_extracted]
print("")
print("Missing modules: {}".format(len(missing)))
for m in missing:
    print("  - {}".format(m))

# Size breakdown by folder
print("")
print("By extraction batch:")
by_folder = {}
for mod, info in all_extracted.items():
    folder = info['location']
    if folder not in by_folder:
        by_folder[folder] = {'count': 0, 'size': 0}
    by_folder[folder]['count'] += 1
    by_folder[folder]['size'] += info['size']

for folder, stats in sorted(by_folder.items()):
    print("  {}: {} modules, {:,} chars".format(folder, stats['count'], stats['size']))

# Top 30 largest modules
print("")
print("TOP 30 LARGEST MODULES:")
sorted_mods = sorted(all_extracted.items(), key=lambda x: x[1]['size'], reverse=True)
for i, (mod, info) in enumerate(sorted_mods[:30], 1):
    print("{:2}. {} - {:,} chars ({})".format(i, mod, info['size'], info['location']))

# Save complete summary
summary = {
    'generated_at': datetime.now().isoformat(),
    'total_modules': total_files,
    'total_chars': total_chars,
    'inventory_size': len(all_modules),
    'extraction_rate': 100 * total_files / len(all_modules),
    'missing': missing,
    'by_folder': by_folder,
    'all_modules': {k: v for k, v in sorted_mods}
}

output = base / 'FINAL_EXTRACTION_SUMMARY.json'
output.write_text(json.dumps(summary, indent=2), encoding='utf-8')
print("")
print("Summary saved to: {}".format(output))
