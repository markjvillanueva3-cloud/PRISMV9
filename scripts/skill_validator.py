#!/usr/bin/env python3
"""
PRISM Skill Validator v1.0
Validates that skill files follow the required template and standards.

Usage:
    python skill_validator.py <skill_path>           - Validate single skill
    python skill_validator.py --all <skills_dir>    - Validate all skills
    python skill_validator.py --report <skills_dir> - Generate coverage report
"""

import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime

# Required sections for a valid skill
REQUIRED_SECTIONS = [
    "PURPOSE",
    "WHEN TO USE",
    "METHODOLOGY",
    "INTEGRATION"
]

RECOMMENDED_SECTIONS = [
    "QUICK REFERENCE",
    "EXAMPLES",
    "CHECKLIST",
    "ERROR HANDLING",
    "HANDOFF"
]

# Frontmatter requirements
REQUIRED_FRONTMATTER = ["name", "description"]

def parse_frontmatter(content):
    """Extract YAML frontmatter from skill file"""
    frontmatter = {}
    if content.startswith('---'):
        end = content.find('---', 3)
        if end != -1:
            fm_text = content[3:end].strip()
            for line in fm_text.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    frontmatter[key.strip()] = value.strip()
    return frontmatter

def find_sections(content):
    """Find all markdown sections (# headers)"""
    sections = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            title = line.lstrip('#').strip()
            sections.append({
                'level': level,
                'title': title,
                'line': i + 1
            })
    return sections

def check_placeholders(content):
    """Find placeholder text that shouldn't be in final skill"""
    placeholders = []
    patterns = [
        r'\[TODO\]',
        r'\[PLACEHOLDER\]',
        r'\[INSERT\]',
        r'\[FILL IN\]',
        r'XXX',
        r'FIXME',
        r'\.\.\.',  # Ellipsis often indicates incomplete
    ]
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for pattern in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                placeholders.append({
                    'line': i + 1,
                    'pattern': pattern,
                    'text': line.strip()[:80]
                })
    return placeholders

def check_code_blocks(content):
    """Verify code blocks are properly formatted"""
    issues = []
    in_code_block = False
    code_block_start = 0
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('```'):
            if not in_code_block:
                in_code_block = True
                code_block_start = i + 1
                # Check if language is specified
                if line == '```':
                    issues.append({
                        'line': i + 1,
                        'issue': 'Code block without language specification'
                    })
            else:
                in_code_block = False
    
    if in_code_block:
        issues.append({
            'line': code_block_start,
            'issue': 'Unclosed code block'
        })
    
    return issues

def calculate_metrics(content):
    """Calculate skill metrics"""
    lines = content.split('\n')
    non_empty = [l for l in lines if l.strip()]
    code_lines = 0
    in_code = False
    
    for line in lines:
        if line.startswith('```'):
            in_code = not in_code
        elif in_code:
            code_lines += 1
    
    return {
        'total_lines': len(lines),
        'non_empty_lines': len(non_empty),
        'code_lines': code_lines,
        'word_count': len(content.split()),
        'char_count': len(content),
        'size_kb': round(len(content.encode('utf-8')) / 1024, 2)
    }

def validate_skill(skill_path):
    """Validate a single skill file"""
    results = {
        'path': str(skill_path),
        'valid': True,
        'errors': [],
        'warnings': [],
        'info': [],
        'metrics': {}
    }
    
    try:
        with open(skill_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        results['valid'] = False
        results['errors'].append(f"Cannot read file: {e}")
        return results
    
    # Check frontmatter
    frontmatter = parse_frontmatter(content)
    for req in REQUIRED_FRONTMATTER:
        if req not in frontmatter:
            results['errors'].append(f"Missing required frontmatter: {req}")
            results['valid'] = False
    
    if frontmatter:
        results['info'].append(f"Frontmatter: {frontmatter.get('name', 'unnamed')}")
    
    # Check sections
    sections = find_sections(content)
    section_titles = [s['title'].upper() for s in sections]
    
    for req in REQUIRED_SECTIONS:
        found = any(req in title for title in section_titles)
        if not found:
            results['warnings'].append(f"Missing recommended section: {req}")
    
    for rec in RECOMMENDED_SECTIONS:
        found = any(rec in title for title in section_titles)
        if not found:
            results['info'].append(f"Consider adding section: {rec}")
    
    # Check placeholders
    placeholders = check_placeholders(content)
    for p in placeholders:
        results['errors'].append(f"Line {p['line']}: Placeholder found - {p['text'][:50]}")
        results['valid'] = False
    
    # Check code blocks
    code_issues = check_code_blocks(content)
    for issue in code_issues:
        results['warnings'].append(f"Line {issue['line']}: {issue['issue']}")
    
    # Calculate metrics
    results['metrics'] = calculate_metrics(content)
    
    # Size checks
    if results['metrics']['size_kb'] < 1:
        results['warnings'].append("Skill seems too short (< 1KB)")
    elif results['metrics']['size_kb'] > 200:
        results['warnings'].append("Skill is very large (> 200KB), consider splitting")
    
    return results

def validate_all_skills(skills_dir):
    """Validate all skills in directory"""
    results = []
    skills_path = Path(skills_dir)
    
    for skill_dir in skills_path.iterdir():
        if skill_dir.is_dir() and skill_dir.name.startswith('prism-'):
            skill_file = skill_dir / 'SKILL.md'
            if skill_file.exists():
                results.append(validate_skill(skill_file))
            else:
                results.append({
                    'path': str(skill_dir),
                    'valid': False,
                    'errors': ['No SKILL.md file found'],
                    'warnings': [],
                    'info': [],
                    'metrics': {}
                })
    
    return results

def generate_report(results):
    """Generate validation report"""
    total = len(results)
    valid = sum(1 for r in results if r['valid'])
    total_size = sum(r['metrics'].get('size_kb', 0) for r in results)
    total_lines = sum(r['metrics'].get('total_lines', 0) for r in results)
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║              PRISM SKILL VALIDATION REPORT                    ║
╠══════════════════════════════════════════════════════════════╣
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
╠══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
║  ────────────────────────────────────────────────────────────║
║  Total Skills:     {total:4d}                                      ║
║  Valid:            {valid:4d}  ✅                                   ║
║  Invalid:          {total - valid:4d}  ❌                                   ║
║  Total Size:       {total_size:,.1f} KB                                 ║
║  Total Lines:      {total_lines:,d}                                   ║
╠══════════════════════════════════════════════════════════════╣
"""
    
    # List invalid skills
    invalid = [r for r in results if not r['valid']]
    if invalid:
        report += "║  INVALID SKILLS                                               ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for r in invalid:
            name = Path(r['path']).name
            report += f"║  ❌ {name:<56} ║\n"
            for err in r['errors'][:3]:
                report += f"║     • {err[:52]:<52} ║\n"
    
    # List warnings
    with_warnings = [r for r in results if r['warnings']]
    if with_warnings:
        report += "║  SKILLS WITH WARNINGS                                         ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for r in with_warnings[:10]:
            name = Path(r['path']).name
            report += f"║  ⚠️  {name}: {len(r['warnings'])} warnings                    ║\n"
    
    report += "╚══════════════════════════════════════════════════════════════╝\n"
    
    return report

def print_single_result(result):
    """Print result for single skill validation"""
    status = "✅ VALID" if result['valid'] else "❌ INVALID"
    print(f"\n{status}: {result['path']}")
    
    if result['metrics']:
        m = result['metrics']
        print(f"  Size: {m['size_kb']} KB | Lines: {m['total_lines']} | Words: {m['word_count']}")
    
    for err in result['errors']:
        print(f"  ❌ ERROR: {err}")
    
    for warn in result['warnings']:
        print(f"  ⚠️  WARNING: {warn}")
    
    for info in result['info'][:5]:
        print(f"  ℹ️  {info}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    if sys.argv[1] == '--all':
        if len(sys.argv) < 3:
            print("Usage: python skill_validator.py --all <skills_dir>")
            sys.exit(1)
        results = validate_all_skills(sys.argv[2])
        for r in results:
            print_single_result(r)
        print(f"\n{sum(1 for r in results if r['valid'])}/{len(results)} skills valid")
    
    elif sys.argv[1] == '--report':
        if len(sys.argv) < 3:
            print("Usage: python skill_validator.py --report <skills_dir>")
            sys.exit(1)
        results = validate_all_skills(sys.argv[2])
        print(generate_report(results))
    
    else:
        result = validate_skill(sys.argv[1])
        print_single_result(result)
        sys.exit(0 if result['valid'] else 1)
