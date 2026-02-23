#!/usr/bin/env python3
"""Extract a single module from PRISM monolith by name."""

import re
import os
import argparse
from datetime import datetime

LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
MONOLITH = os.path.join(LOCAL_ROOT, "_BUILD", "PRISM_v8_89_002_TRUE_100_PERCENT.html")
EXTRACTED = os.path.join(LOCAL_ROOT, "EXTRACTED")

# Common module patterns
MODULE_PATTERNS = {
    'const': r'const\s+{name}\s*=\s*\{{',
    'class': r'class\s+{name}\s*\{{',
    'function': r'function\s+{name}\s*\(',
    'var': r'var\s+{name}\s*=\s*\{{',
    'let': r'let\s+{name}\s*=\s*\{{'
}

def find_module_boundaries(content, module_name):
    """Find start and end line of a module."""
    lines = content.split('\n')
    start_line = None
    brace_count = 0
    in_module = False
    
    for pattern_type, pattern in MODULE_PATTERNS.items():
        regex = pattern.format(name=re.escape(module_name))
        for i, line in enumerate(lines, 1):
            if re.search(regex, line):
                start_line = i
                break
        if start_line:
            break
    
    if not start_line:
        return None, None, None
    
    # Find end by counting braces
    end_line = start_line
    for i, line in enumerate(lines[start_line-1:], start_line):
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0 and i > start_line:
            # Check for closing statement
            if '};' in line or line.strip() == '}':
                end_line = i
                break
    
    # Extract the content
    module_content = '\n'.join(lines[start_line-1:end_line])
    return start_line, end_line, module_content

def analyze_dependencies(content):
    """Detect module dependencies from content."""
    deps = set()
    # Look for PRISM_ references
    prism_refs = re.findall(r'PRISM_[A-Z_]+', content)
    for ref in prism_refs:
        if ref not in content.split('=')[0]:  # Not self-reference
            deps.add(ref)
    return sorted(deps)[:20]  # Limit to 20 most common

def analyze_outputs(content):
    """Detect module outputs (exported functions/properties)."""
    outputs = []
    # Look for method definitions
    methods = re.findall(r'(\w+)\s*[=:]\s*function\s*\([^)]*\)', content)
    outputs.extend(methods[:15])
    # Look for arrow functions
    arrows = re.findall(r'(\w+)\s*[=:]\s*\([^)]*\)\s*=>', content)
    outputs.extend(arrows[:10])
    return outputs

def create_output_file(module_name, content, start_line, end_line, output_dir):
    """Create the extracted module file with header."""
    deps = analyze_dependencies(content)
    outputs = analyze_outputs(content)
    
    header = f'''/**
 * PRISM MODULE: {module_name}
 * Extracted: {datetime.now().strftime("%Y-%m-%d %H:%M")}
 * Source: PRISM_v8_89_002 lines {start_line}-{end_line}
 * 
 * DEPENDENCIES (what this module needs):
{chr(10).join(f' * - {d}' for d in deps) if deps else ' * - None detected'}
 * 
 * OUTPUTS (what this module produces):
{chr(10).join(f' * - {o}()' for o in outputs) if outputs else ' * - See implementation below'}
 * 
 * CONSUMERS (who uses this module):
 * - TODO: Map consumers during migration phase
 */

'''
    
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"{module_name}.js")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(header + content)
    
    return output_file

def main():
    parser = argparse.ArgumentParser(description='Extract module from PRISM monolith')
    parser.add_argument('--name', type=str, required=True, help='Module name (e.g., PRISM_MATERIALS_MASTER)')
    parser.add_argument('--output', type=str, required=True, help='Output subdirectory (e.g., databases/materials/)')
    parser.add_argument('--source', type=str, default=MONOLITH, help='Source file path')
    args = parser.parse_args()
    
    output_dir = os.path.join(EXTRACTED, args.output)
    
    print(f"[PRISM EXTRACTOR] Extracting {args.name}...")
    
    # Read monolith
    if not os.path.exists(args.source):
        print(f"ERROR: Source file not found: {args.source}")
        return 1
    
    with open(args.source, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find module
    start, end, module_content = find_module_boundaries(content, args.name)
    
    if not start:
        print(f"ERROR: Module {args.name} not found in source")
        return 1
    
    print(f"  Found at lines {start}-{end} ({end-start+1} lines)")
    
    # Create output file
    output_file = create_output_file(args.name, module_content, start, end, output_dir)
    
    print(f"  ✓ Extracted to: {output_file}")
    print(f"  ✓ Dependencies detected: {len(analyze_dependencies(module_content))}")
    print(f"  ✓ Outputs detected: {len(analyze_outputs(module_content))}")
    
    return 0

if __name__ == "__main__":
    exit(main())
