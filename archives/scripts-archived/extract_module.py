"""
PRISM Module Extractor v1.0
Extracts modules from monolith by line ranges defined in index files

Usage:
    python extract_module.py <monolith_path> <start_line> <end_line> <output_path>
    python extract_module.py --batch <monolith_path> <index_json>
"""

import sys
import json
import os
from datetime import datetime

def extract_lines(source_path, start_line, end_line):
    """Extract specific line range from source file"""
    with open(source_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    # Convert to 0-indexed
    start_idx = start_line - 1
    end_idx = end_line
    
    if start_idx < 0 or end_idx > len(lines):
        raise ValueError(f"Line range {start_line}-{end_line} out of bounds (file has {len(lines)} lines)")
    
    return lines[start_idx:end_idx]

def extract_single(monolith_path, start_line, end_line, output_path):
    """Extract single module"""
    lines = extract_lines(monolith_path, start_line, end_line)
    
    # Add extraction header
    header = f"""// Extracted from PRISM Monolith
// Source: {os.path.basename(monolith_path)}
// Lines: {start_line}-{end_line}
// Extracted: {datetime.now().isoformat()}
// Total Lines: {len(lines)}

"""
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(header)
        f.writelines(lines)
    
    print(f"✅ Extracted {len(lines)} lines to {output_path}")
    return len(lines)

def extract_batch(monolith_path, index_json_path):
    """Extract multiple modules from index file"""
    with open(index_json_path, 'r') as f:
        index = json.load(f)
    
    total_extracted = 0
    modules_extracted = 0
    
    output_dir = index.get('outputDir', './extracted')
    
    for module_name, module_info in index.get('modules', {}).items():
        start = module_info.get('lineStart')
        end = module_info.get('lineEnd')
        filename = module_info.get('file', f"{module_name}.js")
        output_path = os.path.join(output_dir, filename)
        
        try:
            lines = extract_single(monolith_path, start, end, output_path)
            total_extracted += lines
            modules_extracted += 1
        except Exception as e:
            print(f"❌ Failed to extract {module_name}: {e}")
    
    print(f"\n📦 Batch complete: {modules_extracted} modules, {total_extracted} lines")
    return modules_extracted, total_extracted

def scan_for_modules(monolith_path, patterns=None):
    """Scan monolith for module boundaries"""
    if patterns is None:
        patterns = [
            'const PRISM_',
            'class PRISM_',
            'function PRISM_',
            'var PRISM_',
            'let PRISM_',
            '// SECTION',
            '// ====='
        ]
    
    found = []
    with open(monolith_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line_num, line in enumerate(f, 1):
            for pattern in patterns:
                if pattern in line:
                    found.append({
                        'line': line_num,
                        'pattern': pattern,
                        'content': line.strip()[:100]
                    })
                    break
    
    return found

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    if sys.argv[1] == '--batch':
        if len(sys.argv) != 4:
            print("Usage: python extract_module.py --batch <monolith_path> <index_json>")
            sys.exit(1)
        extract_batch(sys.argv[2], sys.argv[3])
    
    elif sys.argv[1] == '--scan':
        if len(sys.argv) != 3:
            print("Usage: python extract_module.py --scan <monolith_path>")
            sys.exit(1)
        results = scan_for_modules(sys.argv[2])
        print(f"Found {len(results)} module boundaries:")
        for r in results[:50]:  # Show first 50
            print(f"  Line {r['line']}: {r['content']}")
        if len(results) > 50:
            print(f"  ... and {len(results) - 50} more")
    
    else:
        if len(sys.argv) != 5:
            print("Usage: python extract_module.py <monolith_path> <start_line> <end_line> <output_path>")
            sys.exit(1)
        extract_single(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4])
