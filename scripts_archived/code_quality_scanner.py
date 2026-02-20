#!/usr/bin/env python3
"""
PRISM Code Quality Scanner v1.0
Scans codebase for quality issues: placeholders, TODOs, incomplete implementations.

Usage:
    python code_quality_scanner.py <directory>           - Scan directory
    python code_quality_scanner.py <directory> --strict - Fail on any issues
    python code_quality_scanner.py <file> --single      - Scan single file
"""

import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Patterns that indicate incomplete/placeholder code
CRITICAL_PATTERNS = {
    'TODO': r'\bTODO\b',
    'FIXME': r'\bFIXME\b',
    'HACK': r'\bHACK\b',
    'XXX': r'\bXXX\b',
    'PLACEHOLDER': r'\bPLACEHOLDER\b',
    'TEMP': r'\bTEMP\b(?!ERATURE|LATE)',
    'NOT_IMPLEMENTED': r'(?:not\s+implemented|throw\s+new\s+Error.*not\s+implemented)',
    'STUB': r'\bSTUB\b',
}

WARNING_PATTERNS = {
    'LATER': r'\bLATER\b',
    'EVENTUALLY': r'\bEVENTUALLY\b',
    'INCOMPLETE': r'\bINCOMPLETE\b',
    'NEEDS_WORK': r'needs?\s+(?:more\s+)?work',
    'HARDCODED': r'\bHARDCODED?\b',
    'MAGIC_NUMBER': r'(?<![a-zA-Z0-9_])[0-9]{3,}(?:\.[0-9]+)?(?![a-zA-Z0-9_])',  # Large literals
    'EMPTY_CATCH': r'catch\s*\([^)]*\)\s*\{\s*\}',
    'CONSOLE_LOG': r'console\.log\(',
}

INFO_PATTERNS = {
    'REVIEW': r'\bREVIEW\b',
    'QUESTION': r'\?\?\?',
    'NOTE': r'\bNOTE\b:',
    'CONSIDER': r'\bCONSIDER\b',
}

# Code quality checks
QUALITY_CHECKS = {
    'long_function': {
        'pattern': r'(?:function\s+\w+|=>\s*{|^\s*\w+\s*\([^)]*\)\s*{)',
        'threshold': 100,  # lines
        'message': 'Function exceeds 100 lines'
    },
    'deep_nesting': {
        'pattern': r'^(\s{16,})\S',  # 4+ levels of indentation
        'message': 'Code deeply nested (4+ levels)'
    },
    'long_line': {
        'pattern': r'^.{150,}$',
        'message': 'Line exceeds 150 characters'
    },
    'multiple_returns': {
        'pattern': r'\breturn\b',
        'threshold': 5,
        'message': 'Function has many return statements'
    }
}

def scan_file(file_path):
    """Scan a single file for quality issues"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        return {'error': str(e)}
    
    issues = {
        'critical': [],
        'warning': [],
        'info': [],
        'metrics': {
            'lines': len(lines),
            'non_empty': len([l for l in lines if l.strip()]),
            'comments': len([l for l in lines if l.strip().startswith('//')]),
        }
    }
    
    # Scan for pattern matches
    for line_num, line in enumerate(lines, 1):
        # Skip comments for some checks
        is_comment = line.strip().startswith('//') or line.strip().startswith('*')
        
        # Critical patterns
        for name, pattern in CRITICAL_PATTERNS.items():
            if re.search(pattern, line, re.IGNORECASE):
                issues['critical'].append({
                    'line': line_num,
                    'type': name,
                    'text': line.strip()[:80],
                    'in_comment': is_comment
                })
        
        # Warning patterns (skip in comments)
        if not is_comment:
            for name, pattern in WARNING_PATTERNS.items():
                if re.search(pattern, line, re.IGNORECASE):
                    issues['warning'].append({
                        'line': line_num,
                        'type': name,
                        'text': line.strip()[:80]
                    })
        
        # Info patterns
        for name, pattern in INFO_PATTERNS.items():
            if re.search(pattern, line, re.IGNORECASE):
                issues['info'].append({
                    'line': line_num,
                    'type': name,
                    'text': line.strip()[:80]
                })
        
        # Long line check
        if len(line) > 150:
            issues['warning'].append({
                'line': line_num,
                'type': 'LONG_LINE',
                'text': f'Line has {len(line)} characters'
            })
        
        # Deep nesting check
        if re.match(r'^(\s{16,})\S', line) and not is_comment:
            issues['warning'].append({
                'line': line_num,
                'type': 'DEEP_NESTING',
                'text': line.strip()[:60]
            })
    
    # Check for empty catch blocks
    empty_catches = re.findall(r'catch\s*\([^)]*\)\s*\{\s*\}', content)
    for _ in empty_catches:
        issues['warning'].append({
            'line': 0,
            'type': 'EMPTY_CATCH',
            'text': 'Empty catch block found'
        })
    
    # Calculate quality score
    issues['score'] = calculate_quality_score(issues)
    
    return issues

def calculate_quality_score(issues):
    """Calculate quality score 0-100"""
    score = 100
    
    # Critical issues: -20 each (max -60)
    score -= min(60, len(issues['critical']) * 20)
    
    # Warnings: -5 each (max -30)
    score -= min(30, len(issues['warning']) * 5)
    
    # Info: -1 each (max -10)
    score -= min(10, len(issues['info']) * 1)
    
    return max(0, score)

def scan_directory(directory, extensions=None):
    """Scan all files in directory"""
    if extensions is None:
        extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.html']
    
    results = {}
    path = Path(directory)
    
    for ext in extensions:
        for file_path in path.rglob(f'*{ext}'):
            # Skip node_modules, .git, etc.
            if any(skip in str(file_path) for skip in ['node_modules', '.git', '__pycache__', 'dist', 'build']):
                continue
            
            rel_path = str(file_path.relative_to(path))
            results[rel_path] = scan_file(file_path)
    
    return results

def generate_report(results, directory):
    """Generate quality report"""
    total_files = len(results)
    total_critical = sum(len(r.get('critical', [])) for r in results.values())
    total_warnings = sum(len(r.get('warning', [])) for r in results.values())
    total_info = sum(len(r.get('info', [])) for r in results.values())
    
    scores = [r.get('score', 100) for r in results.values() if 'score' in r]
    avg_score = sum(scores) / len(scores) if scores else 100
    
    clean_files = sum(1 for r in results.values() if r.get('score', 0) >= 90)
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║              PRISM CODE QUALITY REPORT                        ║
╠══════════════════════════════════════════════════════════════╣
║  Directory: {directory[:47]:<47} ║
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
╠══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
║  ────────────────────────────────────────────────────────────║
║  Files Scanned:     {total_files:4d}                                      ║
║  Clean Files (≥90): {clean_files:4d}  ✅                                   ║
║  Average Score:     {avg_score:5.1f}%                                    ║
╠══════════════════════════════════════════════════════════════╣
║  ISSUES                                                       ║
║  ────────────────────────────────────────────────────────────║
║  🔴 Critical:       {total_critical:4d}  (TODOs, FIXMEs, placeholders)       ║
║  🟡 Warnings:       {total_warnings:4d}  (code smells, hardcoded values)    ║
║  🔵 Info:           {total_info:4d}  (notes, review markers)             ║
╠══════════════════════════════════════════════════════════════╣
"""
    
    # Group critical issues by type
    critical_by_type = defaultdict(list)
    for file_path, r in results.items():
        for issue in r.get('critical', []):
            critical_by_type[issue['type']].append({
                'file': file_path,
                'line': issue['line'],
                'text': issue['text']
            })
    
    if critical_by_type:
        report += "║  CRITICAL ISSUES BY TYPE                                      ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for issue_type, occurrences in sorted(critical_by_type.items(), key=lambda x: -len(x[1])):
            report += f"║  {issue_type:<15}: {len(occurrences):4d} occurrences                       ║\n"
    
    # Files with lowest scores
    scored_files = [(f, r.get('score', 100)) for f, r in results.items() if 'score' in r]
    lowest = sorted(scored_files, key=lambda x: x[1])[:10]
    
    if lowest and lowest[0][1] < 90:
        report += "╠══════════════════════════════════════════════════════════════╣\n"
        report += "║  FILES NEEDING ATTENTION                                      ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for file_path, score in lowest:
            if score < 90:
                name = file_path[:45]
                report += f"║  {score:3d}%  {name:<52} ║\n"
    
    report += "╚══════════════════════════════════════════════════════════════╝\n"
    
    return report

def print_file_issues(file_path, issues):
    """Print issues for a single file"""
    score = issues.get('score', 100)
    status = "✅" if score >= 90 else "⚠️" if score >= 70 else "❌"
    
    print(f"\n{status} {file_path} (Score: {score}%)")
    
    if issues.get('critical'):
        print("  🔴 Critical:")
        for i in issues['critical'][:5]:
            print(f"     Line {i['line']}: [{i['type']}] {i['text'][:60]}")
    
    if issues.get('warning'):
        print(f"  🟡 Warnings: {len(issues['warning'])} found")
        for i in issues['warning'][:3]:
            print(f"     Line {i['line']}: [{i['type']}] {i['text'][:60]}")
    
    if issues.get('info'):
        print(f"  🔵 Info: {len(issues['info'])} notes")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    target = sys.argv[1]
    strict_mode = '--strict' in sys.argv
    
    if '--single' in sys.argv and os.path.isfile(target):
        issues = scan_file(target)
        print_file_issues(target, issues)
        if strict_mode and issues.get('score', 100) < 90:
            sys.exit(1)
    
    elif os.path.isdir(target):
        results = scan_directory(target)
        print(generate_report(results, target))
        
        # In strict mode, exit with error if any critical issues
        if strict_mode:
            total_critical = sum(len(r.get('critical', [])) for r in results.values())
            if total_critical > 0:
                print(f"\n❌ STRICT MODE: {total_critical} critical issues found")
                sys.exit(1)
    
    else:
        print(f"Error: {target} not found")
        sys.exit(1)
