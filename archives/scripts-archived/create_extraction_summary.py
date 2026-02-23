"""Create master extraction summary."""
import json
from pathlib import Path

print('=' * 70)
print('COMPREHENSIVE EXTRACTION SUMMARY')
print('=' * 70)

base = Path(r'C:\PRISM\extracted_modules')
categories = ['ai_ml_engines', 'physics_engines', 'geometry_engines', 'databases', 'system', 'priority_extraction']

grand_total = 0
all_modules = []

for cat in categories:
    cat_dir = base / cat
    if cat_dir.exists():
        summary_file = cat_dir / 'EXTRACTION_SUMMARY.json'
        if summary_file.exists():
            summary = json.loads(summary_file.read_text(encoding='utf-8'))
            count = summary.get('total_modules', 0)
            chars = summary.get('total_chars', 0)
            grand_total += chars
            for mod, size in summary.get('modules', {}).items():
                all_modules.append({'name': mod, 'category': cat, 'size': size})
            print(f'{cat}: {count} modules, {chars:,} chars')
        else:
            # Count files
            files = list(cat_dir.glob('*.js'))
            total = sum(f.stat().st_size for f in files)
            grand_total += total
            for f in files:
                all_modules.append({'name': f.stem, 'category': cat, 'size': f.stat().st_size})
            print(f'{cat}: {len(files)} files, {total:,} chars')

print()
print('=' * 70)
print(f'GRAND TOTAL: {len(all_modules)} modules, {grand_total:,} characters')
print('=' * 70)

# Top 20 largest modules
print()
print('TOP 20 LARGEST MODULES:')
sorted_mods = sorted(all_modules, key=lambda x: x['size'], reverse=True)
for i, mod in enumerate(sorted_mods[:20], 1):
    print(f'{i:2}. {mod["name"]}: {mod["size"]:,} chars ({mod["category"]})')

# Save comprehensive summary
summary = {
    'total_modules': len(all_modules),
    'total_chars': grand_total,
    'by_category': {},
    'all_modules': sorted_mods
}
for cat in categories:
    cat_mods = [m for m in all_modules if m['category'] == cat]
    summary['by_category'][cat] = {
        'count': len(cat_mods),
        'total_chars': sum(m['size'] for m in cat_mods)
    }

output = base / 'MASTER_EXTRACTION_SUMMARY.json'
output.write_text(json.dumps(summary, indent=2), encoding='utf-8')
print()
print(f'Saved master summary to {output}')
