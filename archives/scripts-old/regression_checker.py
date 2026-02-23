#!/usr/bin/env python3
"""
PRISM Regression Checker v1.0
Compares old and new versions to detect content loss.

Usage:
    python regression_checker.py <old_file> <new_file>           - Compare two files
    python regression_checker.py <old_file> <new_file> --strict  - Strict mode (fail on any loss)
    python regression_checker.py <old_file> <new_file> --json    - Output as JSON
    python regression_checker.py <old_dir> <new_dir> --batch     - Compare directories
"""

import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def extract_sections(content):
    """Extract markdown sections (headings)"""
    sections = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        match = re.match(r'^(#+)\s+(.+)$', line)
        if match:
            level = len(match.group(1))
            title = match.group(2).strip()
            sections.append({
                'level': level,
                'title': title,
                'line': i + 1
            })
    return sections

def extract_tables(content):
    """Extract markdown tables"""
    tables = []
    lines = content.split('\n')
    in_table = False
    current_table = []
    start_line = 0
    
    for i, line in enumerate(lines):
        if re.match(r'^\|.+\|$', line):
            if not in_table:
                in_table = True
                start_line = i + 1
            current_table.append(line)
        else:
            if in_table and current_table:
                tables.append({
                    'start_line': start_line,
                    'rows': len(current_table),
                    'preview': current_table[0][:50] if current_table else ''
                })
                current_table = []
            in_table = False
    
    return tables

def extract_code_blocks(content):
    """Extract code blocks"""
    blocks = []
    pattern = r'```(\w*)\n(.*?)```'
    for match in re.finditer(pattern, content, re.DOTALL):
        language = match.group(1) or 'unknown'
        code = match.group(2)
        blocks.append({
            'language': language,
            'lines': len(code.split('\n')),
            'preview': code[:50].replace('\n', ' ')
        })
    return blocks

def extract_key_terms(content):
    """Extract likely important terms (capitalized, technical)"""
    # Find capitalized words, acronyms, technical terms
    terms = set()
    
    # Capitalized multi-word phrases
    terms.update(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b', content))
    
    # Acronyms
    terms.update(re.findall(r'\b[A-Z]{2,}\b', content))
    
    # Technical patterns (with hyphens, underscores)
    terms.update(re.findall(r'\b\w+[-_]\w+[-_]?\w*\b', content))
    
    return terms

def analyze_file(file_path):
    """Analyze a single file"""
    try:
        content = Path(file_path).read_text(encoding='utf-8')
    except Exception as e:
        return {'error': str(e)}
    
    lines = content.split('\n')
    
    return {
        'path': str(file_path),
        'lines': len(lines),
        'words': len(content.split()),
        'chars': len(content),
        'size_kb': round(len(content.encode('utf-8')) / 1024, 2),
        'sections': extract_sections(content),
        'tables': extract_tables(content),
        'code_blocks': extract_code_blocks(content),
        'key_terms': extract_key_terms(content)
    }

def compare_files(old_path, new_path, strict=False):
    """Compare two files for regression"""
    old = analyze_file(old_path)
    new = analyze_file(new_path)
    
    if 'error' in old:
        return {'error': f"Cannot read old file: {old['error']}"}
    if 'error' in new:
        return {'error': f"Cannot read new file: {new['error']}"}
    
    # Section comparison
    old_section_titles = {s['title'].lower() for s in old['sections']}
    new_section_titles = {s['title'].lower() for s in new['sections']}
    
    missing_sections = old_section_titles - new_section_titles
    added_sections = new_section_titles - old_section_titles
    
    # Key term comparison
    missing_terms = old['key_terms'] - new['key_terms']
    added_terms = new['key_terms'] - old['key_terms']
    
    # Size comparison
    size_ratio = new['lines'] / old['lines'] if old['lines'] > 0 else 1
    
    # Regression indicators
    regressions = []
    warnings = []
    
    if size_ratio < 0.8:
        regressions.append(f"Size reduced by {(1-size_ratio)*100:.1f}% ({old['lines']} → {new['lines']} lines)")
    elif size_ratio < 0.95:
        warnings.append(f"Size reduced by {(1-size_ratio)*100:.1f}%")
    
    if len(missing_sections) > len(added_sections):
        regressions.append(f"Net loss of {len(missing_sections) - len(added_sections)} sections")
    
    if len(missing_terms) > len(added_terms) * 2:
        warnings.append(f"Many key terms missing ({len(missing_terms)} lost vs {len(added_terms)} added)")
    
    if len(new['tables']) < len(old['tables']):
        warnings.append(f"Tables reduced ({old['tables']} → {new['tables']})")
    
    if len(new['code_blocks']) < len(old['code_blocks']):
        warnings.append(f"Code blocks reduced ({len(old['code_blocks'])} → {len(new['code_blocks'])})")
    
    result = {
        'old': {
            'path': old['path'],
            'lines': old['lines'],
            'sections': len(old['sections']),
            'tables': len(old['tables']),
            'code_blocks': len(old['code_blocks']),
            'size_kb': old['size_kb']
        },
        'new': {
            'path': new['path'],
            'lines': new['lines'],
            'sections': len(new['sections']),
            'tables': len(new['tables']),
            'code_blocks': len(new['code_blocks']),
            'size_kb': new['size_kb']
        },
        'comparison': {
            'size_ratio': round(size_ratio, 3),
            'missing_sections': list(missing_sections)[:20],
            'added_sections': list(added_sections)[:20],
            'missing_terms_sample': list(missing_terms)[:30],
            'added_terms_sample': list(added_terms)[:30]
        },
        'regressions': regressions,
        'warnings': warnings,
        'verdict': 'FAIL' if regressions else ('WARNING' if warnings else 'PASS')
    }
    
    if strict and (regressions or warnings):
        result['verdict'] = 'FAIL'
    
    return result

def generate_report(result):
    """Generate human-readable report"""
    report = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM REGRESSION CHECK REPORT                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  OLD: {result['old']['path'][:68]:<68} ║
║  NEW: {result['new']['path'][:68]:<68} ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  METRICS COMPARISON                                                          ║
║  ────────────────────────────────────────────────────────────────────────────║
║                        OLD          NEW         CHANGE                       ║
║  Lines:              {result['old']['lines']:6d}       {result['new']['lines']:6d}       {result['new']['lines']-result['old']['lines']:+6d}  ({(result['comparison']['size_ratio']-1)*100:+.1f}%)       ║
║  Sections:           {result['old']['sections']:6d}       {result['new']['sections']:6d}       {result['new']['sections']-result['old']['sections']:+6d}                    ║
║  Tables:             {result['old']['tables']:6d}       {result['new']['tables']:6d}       {result['new']['tables']-result['old']['tables']:+6d}                    ║
║  Code Blocks:        {result['old']['code_blocks']:6d}       {result['new']['code_blocks']:6d}       {result['new']['code_blocks']-result['old']['code_blocks']:+6d}                    ║
║  Size (KB):          {result['old']['size_kb']:6.1f}       {result['new']['size_kb']:6.1f}       {result['new']['size_kb']-result['old']['size_kb']:+6.1f}                  ║
"""
    
    if result['comparison']['missing_sections']:
        report += """╠══════════════════════════════════════════════════════════════════════════════╣
║  ⚠️  MISSING SECTIONS                                                         ║
║  ────────────────────────────────────────────────────────────────────────────║
"""
        for section in result['comparison']['missing_sections'][:10]:
            report += f"║  • {section[:72]:<72} ║\n"
        if len(result['comparison']['missing_sections']) > 10:
            report += f"║  ... and {len(result['comparison']['missing_sections'])-10} more                                                        ║\n"
    
    if result['comparison']['added_sections']:
        report += """╠══════════════════════════════════════════════════════════════════════════════╣
║  ✅ NEW SECTIONS                                                              ║
║  ────────────────────────────────────────────────────────────────────────────║
"""
        for section in result['comparison']['added_sections'][:10]:
            report += f"║  + {section[:72]:<72} ║\n"
    
    if result['regressions']:
        report += """╠══════════════════════════════════════════════════════════════════════════════╣
║  ❌ REGRESSIONS DETECTED                                                      ║
║  ────────────────────────────────────────────────────────────────────────────║
"""
        for reg in result['regressions']:
            report += f"║  ❌ {reg[:72]:<72} ║\n"
    
    if result['warnings']:
        report += """╠══════════════════════════════════════════════════════════════════════════════╣
║  ⚠️  WARNINGS                                                                  ║
║  ────────────────────────────────────────────────────────────────────────────║
"""
        for warn in result['warnings']:
            report += f"║  ⚠️  {warn[:72]:<72} ║\n"
    
    verdict_icon = "✅" if result['verdict'] == 'PASS' else "⚠️" if result['verdict'] == 'WARNING' else "❌"
    report += f"""╠══════════════════════════════════════════════════════════════════════════════╣
║  VERDICT: {verdict_icon} {result['verdict']:<66} ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
    
    return report

def compare_directories(old_dir, new_dir):
    """Compare all matching files in two directories"""
    old_path = Path(old_dir)
    new_path = Path(new_dir)
    
    results = []
    
    for old_file in old_path.rglob('*'):
        if old_file.is_file():
            rel_path = old_file.relative_to(old_path)
            new_file = new_path / rel_path
            
            if new_file.exists():
                result = compare_files(old_file, new_file)
                results.append(result)
            else:
                results.append({
                    'old': {'path': str(old_file)},
                    'new': {'path': 'MISSING'},
                    'verdict': 'FAIL',
                    'regressions': ['File missing in new version']
                })
    
    return results

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    
    old_path = sys.argv[1]
    new_path = sys.argv[2]
    strict = '--strict' in sys.argv
    as_json = '--json' in sys.argv
    batch = '--batch' in sys.argv
    
    if batch:
        results = compare_directories(old_path, new_path)
        if as_json:
            print(json.dumps(results, indent=2))
        else:
            for result in results:
                print(generate_report(result))
        
        failed = sum(1 for r in results if r.get('verdict') == 'FAIL')
        sys.exit(1 if failed > 0 else 0)
    
    else:
        result = compare_files(old_path, new_path, strict)
        
        if as_json:
            print(json.dumps(result, indent=2))
        else:
            print(generate_report(result))
        
        sys.exit(0 if result['verdict'] == 'PASS' else 1)
