#!/usr/bin/env python3
"""
PRISM Database Auditor v1.0
Audits database utilization, consumer wiring, and compliance with 10 Commandments.

Usage:
    python database_auditor.py <extracted_dir>           - Audit all databases
    python database_auditor.py <extracted_dir> --json   - Output as JSON
    python database_auditor.py <db_file> --single       - Audit single database
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Minimum consumers required per Commandment #1
MIN_CONSUMERS = 6

# Database categories
DB_CATEGORIES = {
    'machines': ['CORE', 'ENHANCED', 'USER', 'LEARNED', 'LEVEL5'],
    'materials': ['CORE', 'ENHANCED', 'USER', 'LEARNED'],
    'tools': ['CORE', 'ENHANCED', 'USER', 'LEARNED'],
    'operations': ['CORE'],
    'physics': ['CORE']
}

def find_databases(extracted_dir):
    """Find all database files in extracted directory"""
    databases = []
    path = Path(extracted_dir)
    
    for db_file in path.rglob('*.js'):
        if 'DB' in db_file.name or 'database' in db_file.name.lower():
            databases.append(db_file)
    
    for db_file in path.rglob('*.json'):
        databases.append(db_file)
    
    return databases

def parse_js_database(file_path):
    """Parse a JavaScript database file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return None
    
    info = {
        'path': str(file_path),
        'name': file_path.stem,
        'type': 'js',
        'size_kb': round(os.path.getsize(file_path) / 1024, 2),
        'line_count': len(content.split('\n')),
        'entries': 0,
        'consumers': [],
        'exports': [],
        'layer': detect_layer(file_path)
    }
    
    # Count entries (rough estimate based on common patterns)
    # Look for object entries like { id: ..., or "id": ...
    entry_patterns = [
        r'\{\s*id\s*:',
        r'\{\s*"id"\s*:',
        r'\{\s*name\s*:',
        r'\{\s*"name"\s*:'
    ]
    for pattern in entry_patterns:
        matches = re.findall(pattern, content)
        info['entries'] = max(info['entries'], len(matches))
    
    # Find exports
    export_patterns = [
        r'module\.exports\s*=\s*\{([^}]+)\}',
        r'export\s+(?:const|let|var|function)\s+(\w+)',
        r'exports\.(\w+)\s*='
    ]
    for pattern in export_patterns:
        matches = re.findall(pattern, content)
        info['exports'].extend(matches if isinstance(matches[0], str) else [m for m in matches] if matches else [])
    
    # Find documented consumers (from header comments)
    consumer_match = re.search(r'Consumers?:\s*\n((?:\s*[-*]\s*.+\n)+)', content, re.IGNORECASE)
    if consumer_match:
        consumer_text = consumer_match.group(1)
        consumers = re.findall(r'[-*]\s*(.+)', consumer_text)
        info['consumers'] = [c.strip() for c in consumers]
    
    return info

def parse_json_database(file_path):
    """Parse a JSON database file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        return None
    
    info = {
        'path': str(file_path),
        'name': file_path.stem,
        'type': 'json',
        'size_kb': round(os.path.getsize(file_path) / 1024, 2),
        'entries': 0,
        'consumers': [],
        'layer': detect_layer(file_path),
        'metadata': {}
    }
    
    # Extract metadata if present
    if isinstance(data, dict):
        if 'metadata' in data:
            info['metadata'] = data['metadata']
        if 'machines' in data:
            info['entries'] = len(data['machines'])
        elif 'materials' in data:
            info['entries'] = len(data['materials'])
        elif 'tools' in data:
            info['entries'] = len(data['tools'])
        elif isinstance(data, list):
            info['entries'] = len(data)
    
    return info

def detect_layer(file_path):
    """Detect database layer from path"""
    path_str = str(file_path).upper()
    if 'LEARNED' in path_str:
        return 'LEARNED'
    elif 'USER' in path_str:
        return 'USER'
    elif 'ENHANCED' in path_str:
        return 'ENHANCED'
    elif 'LEVEL5' in path_str:
        return 'LEVEL5'
    else:
        return 'CORE'

def find_consumer_references(extracted_dir, db_name):
    """Find files that reference this database"""
    consumers = []
    path = Path(extracted_dir)
    
    patterns = [
        db_name,
        db_name.replace('_', ''),
        db_name.lower(),
        db_name.replace('PRISM_', '').replace('_DB', '')
    ]
    
    for js_file in path.rglob('*.js'):
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in patterns:
                if pattern in content and js_file.stem != db_name:
                    consumers.append(str(js_file.relative_to(path)))
                    break
        except:
            continue
    
    return list(set(consumers))

def audit_database(db_info, extracted_dir):
    """Audit a single database for compliance"""
    audit = {
        'database': db_info['name'],
        'path': db_info['path'],
        'layer': db_info['layer'],
        'size_kb': db_info['size_kb'],
        'entries': db_info['entries'],
        'documented_consumers': db_info.get('consumers', []),
        'actual_consumers': [],
        'issues': [],
        'compliance': {}
    }
    
    # Find actual consumers
    audit['actual_consumers'] = find_consumer_references(extracted_dir, db_info['name'])
    
    total_consumers = len(set(audit['documented_consumers'] + audit['actual_consumers']))
    
    # Check Commandment #1: IF IT EXISTS, USE IT EVERYWHERE
    if total_consumers < MIN_CONSUMERS:
        audit['issues'].append({
            'severity': 'ERROR',
            'code': 'CMD1_VIOLATION',
            'message': f"Only {total_consumers} consumers found, minimum is {MIN_CONSUMERS}",
            'commandment': 1
        })
        audit['compliance']['commandment_1'] = False
    else:
        audit['compliance']['commandment_1'] = True
    
    # Check for empty database
    if db_info['entries'] == 0:
        audit['issues'].append({
            'severity': 'WARNING',
            'code': 'EMPTY_DB',
            'message': "Database appears to be empty"
        })
    
    # Check for undocumented consumers
    undocumented = set(audit['actual_consumers']) - set(audit['documented_consumers'])
    if undocumented:
        audit['issues'].append({
            'severity': 'INFO',
            'code': 'UNDOCUMENTED_CONSUMERS',
            'message': f"{len(undocumented)} consumers not documented in header"
        })
    
    # Calculate compliance score
    audit['compliance_score'] = calculate_compliance_score(audit)
    
    return audit

def calculate_compliance_score(audit):
    """Calculate overall compliance score 0-100"""
    score = 100
    
    for issue in audit['issues']:
        if issue['severity'] == 'ERROR':
            score -= 30
        elif issue['severity'] == 'WARNING':
            score -= 10
        elif issue['severity'] == 'INFO':
            score -= 2
    
    return max(0, score)

def audit_all_databases(extracted_dir):
    """Audit all databases in directory"""
    databases = find_databases(extracted_dir)
    audits = []
    
    for db_path in databases:
        if db_path.suffix == '.js':
            db_info = parse_js_database(db_path)
        else:
            db_info = parse_json_database(db_path)
        
        if db_info:
            audit = audit_database(db_info, extracted_dir)
            audits.append(audit)
    
    return audits

def generate_report(audits):
    """Generate audit report"""
    total = len(audits)
    compliant = sum(1 for a in audits if a['compliance_score'] >= 70)
    total_entries = sum(a['entries'] for a in audits)
    avg_score = sum(a['compliance_score'] for a in audits) / total if total > 0 else 0
    
    # Count by layer
    by_layer = defaultdict(int)
    for a in audits:
        by_layer[a['layer']] += 1
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║              PRISM DATABASE AUDIT REPORT                      ║
╠══════════════════════════════════════════════════════════════╣
║  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
╠══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
║  ────────────────────────────────────────────────────────────║
║  Total Databases:   {total:4d}                                      ║
║  Compliant (≥70%):  {compliant:4d}  ✅                                   ║
║  Non-Compliant:     {total - compliant:4d}  ❌                                   ║
║  Total Entries:     {total_entries:,d}                                   ║
║  Average Score:     {avg_score:.1f}%                                    ║
╠══════════════════════════════════════════════════════════════╣
║  BY LAYER                                                     ║
║  ────────────────────────────────────────────────────────────║
"""
    for layer in ['LEARNED', 'USER', 'ENHANCED', 'LEVEL5', 'CORE']:
        count = by_layer.get(layer, 0)
        report += f"║  {layer:<12}: {count:4d} databases                              ║\n"
    
    report += "╠══════════════════════════════════════════════════════════════╣\n"
    
    # List non-compliant databases
    non_compliant = [a for a in audits if a['compliance_score'] < 70]
    if non_compliant:
        report += "║  NON-COMPLIANT DATABASES                                      ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for a in sorted(non_compliant, key=lambda x: x['compliance_score'])[:10]:
            name = a['database'][:40]
            report += f"║  ❌ {name:<40} Score: {a['compliance_score']:3d}% ║\n"
            for issue in a['issues'][:2]:
                msg = issue['message'][:50]
                report += f"║     • {msg:<52} ║\n"
    
    # Commandment #1 violations
    cmd1_violations = [a for a in audits if not a['compliance'].get('commandment_1', True)]
    if cmd1_violations:
        report += "╠══════════════════════════════════════════════════════════════╣\n"
        report += "║  ⚠️  COMMANDMENT #1 VIOLATIONS (Underutilized DBs)            ║\n"
        report += "║  ────────────────────────────────────────────────────────────║\n"
        for a in cmd1_violations[:10]:
            consumers = len(a['documented_consumers']) + len(a['actual_consumers'])
            report += f"║  • {a['database'][:35]:<35} ({consumers}/{MIN_CONSUMERS} consumers)  ║\n"
    
    report += "╚══════════════════════════════════════════════════════════════╝\n"
    
    return report

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    extracted_dir = sys.argv[1]
    
    if '--single' in sys.argv:
        # Audit single file
        if os.path.isfile(extracted_dir):
            if extracted_dir.endswith('.js'):
                db_info = parse_js_database(extracted_dir)
            else:
                db_info = parse_json_database(extracted_dir)
            
            if db_info:
                parent_dir = str(Path(extracted_dir).parent.parent)
                audit = audit_database(db_info, parent_dir)
                print(json.dumps(audit, indent=2))
    
    elif '--json' in sys.argv:
        audits = audit_all_databases(extracted_dir)
        print(json.dumps(audits, indent=2))
    
    else:
        audits = audit_all_databases(extracted_dir)
        print(generate_report(audits))
        
        # Exit with error if non-compliant databases exist
        non_compliant = [a for a in audits if a['compliance_score'] < 70]
        sys.exit(1 if non_compliant else 0)
