"""
MCP Server Source Audit
Counts all TypeScript files and lines
"""
import os
from pathlib import Path

mcp_src = Path(r'C:\PRISM\mcp-server\src')

# Count lines in all .ts files
total_lines = 0
file_counts = {}
files_list = []

for f in mcp_src.rglob('*.ts'):
    try:
        lines = len(open(f, 'r', encoding='utf-8', errors='ignore').readlines())
        total_lines += lines
        
        # Categorize by folder
        rel_path = f.relative_to(mcp_src)
        parts = rel_path.parts
        if len(parts) > 1:
            folder = parts[0]
        else:
            folder = 'root'
        
        if folder not in file_counts:
            file_counts[folder] = {'files': 0, 'lines': 0}
        file_counts[folder]['files'] += 1
        file_counts[folder]['lines'] += lines
        
        files_list.append({'file': str(rel_path), 'lines': lines})
    except:
        pass

print('=== MCP SERVER SOURCE INVENTORY ===')
print('Total Files:', len(files_list))
print('Total Lines:', f'{total_lines:,}')
print()
print('=== BY FOLDER ===')
for folder in sorted(file_counts.keys(), key=lambda x: file_counts[x]['lines'], reverse=True):
    data = file_counts[folder]
    print(f"  {folder}: {data['files']} files, {data['lines']:,} lines")

print()
print('=== TOP 20 FILES BY SIZE ===')
files_list.sort(key=lambda x: x['lines'], reverse=True)
for i, f in enumerate(files_list[:20], 1):
    print(f"  {i}. {f['file']}: {f['lines']:,} lines")
