#!/usr/bin/env python3
"""Fix family assignments in the alarm database based on alarm_id prefix."""

import json
from datetime import datetime

def extract_family_from_id(alarm_id):
    """Extract family from alarm_id like ALM-FAN-000 -> FANUC."""
    family_map = {
        'FAN': 'FANUC',
        'HAA': 'HAAS',
        'SIE': 'SIEMENS',
        'MAZ': 'MAZAK',
        'OKU': 'OKUMA',
        'HEI': 'HEIDENHAIN',
        'MIT': 'MITSUBISHI',
        'BRO': 'BROTHER',
        'HUR': 'HURCO',
        'FAG': 'FAGOR',
        'DMG': 'DMG_MORI',
        'DOO': 'DOOSAN'
    }
    
    if not alarm_id or not alarm_id.startswith('ALM-'):
        return None
    
    parts = alarm_id.split('-')
    if len(parts) >= 2:
        prefix = parts[1][:3].upper()
        return family_map.get(prefix)
    return None

def main():
    db_path = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json"
    
    with open(db_path, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    print(f"Processing {len(db['alarms'])} alarms...")
    
    fixed = 0
    for alarm in db['alarms']:
        if 'family' not in alarm or alarm['family'] == 'UNKNOWN':
            family = extract_family_from_id(alarm.get('alarm_id', ''))
            if family:
                alarm['family'] = family
                fixed += 1
    
    print(f"Fixed {fixed} alarms")
    
    # Recalculate statistics
    family_counts = {}
    category_counts = {}
    severity_counts = {}
    
    for alarm in db['alarms']:
        # Family
        family = alarm.get('family', 'UNKNOWN')
        if family not in family_counts:
            family_counts[family] = {'accepted': 0}
        family_counts[family]['accepted'] += 1
        
        # Category
        cat = alarm.get('category', 'UNKNOWN')
        category_counts[cat] = category_counts.get(cat, 0) + 1
        
        # Severity
        sev = alarm.get('severity', 'UNKNOWN')
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
    
    db['statistics']['by_family'] = family_counts
    db['statistics']['by_category'] = category_counts
    db['statistics']['by_severity'] = severity_counts
    db['statistics']['total_alarms'] = len(db['alarms'])
    db['metadata']['total_alarms'] = len(db['alarms'])
    db['metadata']['version'] = "3.0.0-PHASE2-COMPLETE"
    db['metadata']['created'] = datetime.now().isoformat()
    
    # Save
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== FAMILY ASSIGNMENT COMPLETE ===")
    print(f"Total alarms: {len(db['alarms'])}")
    print(f"\nBy Family:")
    for family, stats in sorted(family_counts.items()):
        print(f"  {family}: {stats['accepted']}")

if __name__ == "__main__":
    main()
