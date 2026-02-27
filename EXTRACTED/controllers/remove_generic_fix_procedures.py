#!/usr/bin/env python3
"""
PRISM Alarm Database - Remove Generic Fix Procedures
Strips unverified fix_procedure fields for life-safety compliance.
Only verified, alarm-specific procedures should be in production.
"""

import json
from datetime import datetime
from pathlib import Path
import shutil

DB_PATH = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v3.json")
BACKUP_PATH = DB_PATH.with_suffix('.json.backup_with_generic_fixes')

def main():
    print("=" * 70)
    print("PRISM Alarm Database - Remove Generic Fix Procedures")
    print("Life-Safety Compliance: Only verified procedures allowed")
    print("=" * 70)
    
    # Backup first
    print(f"\nBacking up to: {BACKUP_PATH}")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    
    # Load database
    print(f"Loading database from: {DB_PATH}")
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    alarms = db.get("alarms", [])
    total_alarms = len(alarms)
    print(f"Total alarms: {total_alarms}")
    
    # Count current state
    with_fix = sum(1 for a in alarms if "fix_procedure" in a)
    print(f"Currently with fix_procedure: {with_fix}")
    
    # Remove fix_procedure and related_alarms from ALL alarms
    # These were all generated from templates, not verified sources
    removed_count = 0
    for alarm in alarms:
        removed_fields = []
        if "fix_procedure" in alarm:
            del alarm["fix_procedure"]
            removed_fields.append("fix_procedure")
        if "related_alarms" in alarm:
            del alarm["related_alarms"]
            removed_fields.append("related_alarms")
        if removed_fields:
            removed_count += 1
    
    print(f"\nRemoved fix procedures from: {removed_count} alarms")
    
    # Update metadata
    db["metadata"]["version"] = "6.1.0-FIX-PROCEDURES-REMOVED"
    db["metadata"]["fix_procedures_status"] = {
        "status": "REMOVED_FOR_SAFETY",
        "date": datetime.now().isoformat(),
        "reason": "Generic templates not suitable for life-safety application",
        "action_required": "Add verified alarm-specific procedures from manufacturer documentation",
        "removed_count": removed_count
    }
    
    # Remove old fix procedure metadata
    if "fix_procedures_version" in db["metadata"]:
        del db["metadata"]["fix_procedures_version"]
    if "fix_procedures_phase1" in db["metadata"]:
        del db["metadata"]["fix_procedures_phase1"]
    if "fix_procedures_complete" in db["metadata"]:
        del db["metadata"]["fix_procedures_complete"]
    
    # Verify removal
    remaining = sum(1 for a in alarms if "fix_procedure" in a)
    print(f"Remaining with fix_procedure: {remaining}")
    
    # Save cleaned database
    print(f"\nSaving cleaned database...")
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    
    print(f"Database saved to: {DB_PATH}")
    
    # Final report
    print("\n" + "=" * 70)
    print("FIX PROCEDURES REMOVED - DATABASE NOW SAFE")
    print("=" * 70)
    print(f"Total alarms: {total_alarms}")
    print(f"Fix procedures removed: {removed_count}")
    print(f"Fix procedures remaining: {remaining}")
    print(f"Backup saved to: {BACKUP_PATH}")
    print("\nNEXT STEPS:")
    print("  1. Fix procedures must be added from verified manufacturer sources")
    print("  2. Each alarm needs individual research and validation")
    print("  3. Sources must be cited (manual name, page number)")
    print("  4. Procedures must be reviewed by qualified personnel")
    print("=" * 70)

if __name__ == "__main__":
    main()
