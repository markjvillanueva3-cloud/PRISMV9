#!/usr/bin/env python3
"""Audit a PRISM module for completeness."""

import re
import os
import json
import argparse
from datetime import datetime

LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
EXTRACTED = os.path.join(LOCAL_ROOT, "EXTRACTED")
MONOLITH = os.path.join(LOCAL_ROOT, "_BUILD", "PRISM_v8_89_002_TRUE_100_PERCENT.html")

def count_functions(content):
    """Count function definitions in content."""
    patterns = [
        r'function\s+\w+\s*\(',
        r'\w+\s*:\s*function\s*\(',
        r'\w+\s*=\s*function\s*\(',
        r'\w+\s*:\s*\([^)]*\)\s*=>',
        r'\w+\s*=\s*\([^)]*\)\s*=>'
    ]
    total = 0
    for pattern in patterns:
        total += len(re.findall(pattern, content))
    return total

def count_data_entries(content, module_name):
    """Count data entries in database modules."""
    # Look for array entries or object keys
    if 'DATABASE' in module_name or 'MASTER' in module_name:
        entries = re.findall(r'{\s*id\s*:', content)
        if not entries:
            entries = re.findall(r'{\s*name\s*:', content)
        return len(entries)
    return 0

def check_dependencies_documented(content):
    """Check if dependencies are documented in header."""
    header_match = re.search(r'/\*\*[\s\S]*?\*/', content[:2000])
    if header_match:
        header = header_match.group()
        return 'DEPENDENCIES' in header
    return False

def check_consumers_documented(content):
    """Check if consumers are documented in header."""
    header_match = re.search(r'/\*\*[\s\S]*?\*/', content[:2000])
    if header_match:
        header = header_match.group()
        if 'CONSUMERS' in header:
            consumers = re.findall(r'PRISM_\w+', header.split('CONSUMERS')[1][:500])
            return len(consumers)
    return 0

def validate_syntax(filepath):
    """Basic syntax validation."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        # Check for balanced braces
        if content.count('{') != content.count('}'):
            return False, "Unbalanced braces"
        if content.count('[') != content.count(']'):
            return False, "Unbalanced brackets"
        return True, "OK"
    except Exception as e:
        return False, str(e)

def audit_module(module_name, extracted_path, source_path=None):
    """Perform full audit of extracted module."""
    results = {
        'module': module_name,
        'timestamp': datetime.now().isoformat(),
        'checks': {},
        'status': 'PASS'
    }
    
    # Read extracted module
    if not os.path.exists(extracted_path):
        return {'module': module_name, 'status': 'FAIL', 'error': 'File not found'}
    
    with open(extracted_path, 'r', encoding='utf-8', errors='ignore') as f:
        extracted = f.read()
    
    # Count functions
    func_count = count_functions(extracted)
    results['checks']['functions'] = {'count': func_count, 'status': '✓' if func_count > 0 else '⚠'}
    
    # Count data entries
    data_count = count_data_entries(extracted, module_name)
    results['checks']['data_entries'] = {'count': data_count, 'status': '✓' if data_count > 0 or 'ENGINE' in module_name else '⚠'}
    
    # Check dependencies documented
    deps_ok = check_dependencies_documented(extracted)
    results['checks']['dependencies_documented'] = {'ok': deps_ok, 'status': '✓' if deps_ok else '⚠'}
    
    # Check consumers documented
    consumer_count = check_consumers_documented(extracted)
    results['checks']['consumers_documented'] = {'count': consumer_count, 'status': '✓' if consumer_count > 0 else '⚠'}
    
    # Syntax validation
    syntax_ok, syntax_msg = validate_syntax(extracted_path)
    results['checks']['syntax'] = {'ok': syntax_ok, 'message': syntax_msg, 'status': '✓' if syntax_ok else '✗'}
    
    # Determine overall status
    if not syntax_ok:
        results['status'] = 'FAIL'
    elif not deps_ok or consumer_count == 0:
        results['status'] = 'WARN'
    else:
        results['status'] = 'PASS'
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Audit PRISM module')
    parser.add_argument('--module', type=str, required=True, help='Module name')
    parser.add_argument('--path', type=str, help='Path to extracted module')
    parser.add_argument('--source', type=str, default=MONOLITH, help='Source monolith path')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()
    
    # Find extracted module if path not specified
    if args.path:
        extracted_path = args.path
    else:
        # Search in EXTRACTED directory
        for root, dirs, files in os.walk(EXTRACTED):
            for f in files:
                if args.module in f:
                    extracted_path = os.path.join(root, f)
                    break
        else:
            print(f"ERROR: Module {args.module} not found in {EXTRACTED}")
            return 1
    
    print(f"\n[PRISM AUDITOR] Auditing {args.module}...\n")
    
    results = audit_module(args.module, extracted_path, args.source)
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Module: {results['module']}")
        print(f"Status: {results['status']}")
        print("\nChecks:")
        for check, data in results.get('checks', {}).items():
            status = data.get('status', '?')
            detail = data.get('count', data.get('ok', data.get('message', '')))
            print(f"  {status} {check}: {detail}")
    
    return 0 if results['status'] != 'FAIL' else 1

if __name__ == "__main__":
    exit(main())
