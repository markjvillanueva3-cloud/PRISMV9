"""
Complete PRISM Resource Summary
"""
from pathlib import Path
import json

print('=== COMPLETE RESOURCE SUMMARY ===')
print()

# Full count of all resources
resources = {
    'Skills (consolidated)': 143,
    'Skills (REBUILD)': 112,
    'Scripts': 172,
    'Agents (defined)': 64,
    'Hooks': 147,
    'Formulas': 22,
    'Coefficients': 32,
    'Swarm Patterns': 8,
}

print('FROM PRISM MEMORIES/DOCUMENTATION:')
for k, v in resources.items():
    print(f'  {k}: {v}')

print()
print('FROM EXTRACTED DIRECTORIES:')

extracted_base = Path(r'C:\\PRISM\EXTRACTED')

# Count all extracted files
total_files = 0
total_lines = 0
categories = {}

for item in extracted_base.rglob('*'):
    if item.is_file():
        total_files += 1
        try:
            lines = len(item.read_text(encoding='utf-8', errors='ignore').split('\n'))
            total_lines += lines
            
            # Get parent category
            rel = item.relative_to(extracted_base)
            cat = rel.parts[0] if len(rel.parts) > 1 else 'root'
            if cat not in categories:
                categories[cat] = {'files': 0, 'lines': 0}
            categories[cat]['files'] += 1
            categories[cat]['lines'] += lines
        except:
            pass

print(f'  Total extracted files: {total_files}')
print(f'  Total extracted lines: {total_lines:,}')
print()
print('  By category:')
for cat in sorted(categories.keys(), key=lambda x: categories[x]['lines'], reverse=True):
    data = categories[cat]
    files = data['files']
    lines = data['lines']
    print(f'    {cat}: {files} files, {lines:,} lines')

# MCP Server current
print()
print('MCP SERVER CURRENT STATE:')
mcp_src = Path(r'C:\PRISM\mcp-server\src')
mcp_files = list(mcp_src.rglob('*.ts'))
mcp_lines = sum(len(f.read_text(encoding='utf-8', errors='ignore').split('\n')) for f in mcp_files)
print(f'  Files: {len(mcp_files)}')
print(f'  Lines: {mcp_lines:,}')

# Gap calculation
print()
print('=== GAP ANALYSIS ===')
print(f'Monolith total: 986,622 lines')
print(f'Extracted: {total_lines:,} lines')
print(f'MCP Server: {mcp_lines:,} lines')
remaining = 986622 - total_lines
print(f'Remaining in monolith: ~{remaining:,} lines (estimate)')
print(f'Extraction coverage: {(total_lines/986622)*100:.1f}%')
