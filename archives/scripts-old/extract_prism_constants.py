#!/usr/bin/env python3
"""
PRISM_CONSTANTS Extraction Script
Wave 1, Session 1: Extract PRISM_CONSTANTS from monolith
"""

import os
import re
import json
from datetime import datetime

# Configuration
MONOLITH_PATH = r"C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM REBUILD\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_DIR = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\core"
MODULE_NAME = "PRISM_CONSTANTS"

# Extraction patterns
START_PATTERN = r"const PRISM_CONSTANTS = Object\.freeze\(\{"
END_PATTERN = r"window\.PRISM_CONSTANTS = PRISM_CONSTANTS"

def extract_module():
    """Extract PRISM_CONSTANTS from the monolith"""
    print(f"Reading monolith: {MONOLITH_PATH}")
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    print(f"Total lines in monolith: {len(lines)}")
    
    # Find start line
    start_line = None
    end_line = None
    
    for i, line in enumerate(lines, 1):  # 1-indexed
        if re.search(START_PATTERN, line):
            start_line = i - 5  # Include header comments
            print(f"Found START at line {i}")
        if re.search(END_PATTERN, line):
            end_line = i
            print(f"Found END at line {i}")
            break
    
    if not start_line or not end_line:
        print("ERROR: Could not find module boundaries!")
        return None
    
    # Extract content
    extracted_lines = lines[start_line-1:end_line]  # Python is 0-indexed
    
    print(f"Extracted {len(extracted_lines)} lines (lines {start_line} to {end_line})")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Add extraction header
    header = f"""// ============================================================================
// PRISM_CONSTANTS - Extracted from v8.89 Monolith
// Extraction Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// Source: {MONOLITH_PATH}
// Lines: {start_line} to {end_line} ({len(extracted_lines)} lines)
// 
// TIVE Protocol: TRACE ✓ | ISOLATE ✓ | VALIDATE (pending) | EXTRACT ✓
// Dependencies: NONE (leaf node - foundation module)
// Consumers: 23+ helper modules, ALL other PRISM modules
// ============================================================================

"""
    
    # Write extracted module
    output_path = os.path.join(OUTPUT_DIR, f"{MODULE_NAME}.js")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(header)
        f.writelines(extracted_lines)
    
    print(f"[OK] Extracted to: {output_path}")
    
    # Analyze structure
    analyze_structure(extracted_lines)
    
    return {
        "module": MODULE_NAME,
        "source_lines": f"{start_line}-{end_line}",
        "extracted_lines": len(extracted_lines),
        "output_path": output_path,
        "extraction_time": datetime.now().isoformat()
    }

def analyze_structure(lines):
    """Analyze PRISM_CONSTANTS structure"""
    sections = []
    current_section = None
    constants_count = 0
    
    section_pattern = re.compile(r'//\s*(\w+)\s*[-=]+')
    const_pattern = re.compile(r'^\s*(\w+):\s*[\'"\d\[\{]')
    
    for line in lines:
        # Detect sections (commented headers)
        if '//' in line and '===' in line:
            section_match = re.search(r'//\s*(\w+(?:\s*&?\s*\w+)*)\s*[-=]', line)
            if section_match:
                section_name = section_match.group(1).strip()
                if section_name not in ['', 'PRISM', 'const', 'Object', 'freeze']:
                    sections.append(section_name)
        
        # Count constants
        if const_pattern.search(line):
            constants_count += 1
    
    print(f"\n=== PRISM_CONSTANTS Structure Analysis ===")
    print(f"Sections found: {len(sections)}")
    for s in sections[:15]:  # First 15
        print(f"  - {s}")
    if len(sections) > 15:
        print(f"  ... and {len(sections) - 15} more")
    print(f"Approximate constants: {constants_count}")

if __name__ == "__main__":
    result = extract_module()
    if result:
        print(f"\n=== Extraction Complete ===")
        print(json.dumps(result, indent=2))
