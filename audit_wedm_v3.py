#!/usr/bin/env python3
import json
import sys

jsonPath = r'H:\prism\mcp-server\data\milestones\WEDM-MS1.json'
try:
    with open(jsonPath, encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error reading JSON: {e}")
    sys.exit(1)

print("=== WEDM-MS1 PROTOCOL STRUCTURE AUDIT ===\n")

# Check top-level structure
print("Top-level keys:", list(data.keys()))
print()

sessions = data.get('sessions', [])
units_section = data.get('units', {})

print(f"Total Sessions: {len(sessions)}")
print(f"Total Units (declared): {data.get('total_units', 0)}")
print(f"Units section exists: {bool(units_section)}")
if units_section:
    print(f"Units section type: {type(units_section)}")
    if isinstance(units_section, dict):
        print(f"Unit definitions count: {len(units_section)}")
print()

sessionFields = ['id', 'title', 'units', 'smart_config', 'knowledge', 'intent', 'skills', 'work', 'exit_gate', 'compact_checkpoint']
unitFields = ['title', 'description', 'depends_on', 'files_created', 'files_modified', 'abort_criteria', 'rollback', 'exit_gate', 'four_loop']

sessionScore = 100
unitScore = 100
unitIssues = 0

print("SESSIONS AUDIT:")
for i, session in enumerate(sessions):
    missingFields = [f for f in sessionFields if f not in session]
    unitCountInSession = len(session.get('units', []))
    
    if not missingFields:
        print(f"  S{i}: {session.get('title', 'UNKNOWN')[:50]}... - OK (units: {unitCountInSession})")
    else:
        print(f"  S{i}: {session.get('title', 'UNKNOWN')} - MISSING: {', '.join(missingFields)}")
        sessionScore -= (10 * len(missingFields))

print(f"\nUNITS AUDIT (from units section):")

if isinstance(units_section, dict):
    for unit_id, unit_data in units_section.items():
        if isinstance(unit_data, dict):
            missingFields = [f for f in unitFields if f not in unit_data]
            if missingFields:
                print(f"  {unit_id} '{unit_data.get('title', 'UNKNOWN')}' - MISSING: {', '.join(missingFields)}")
                unitIssues += 1
                unitScore -= (5 * len(missingFields))
        else:
            print(f"  {unit_id}: Unexpected type {type(unit_data)}")
            unitIssues += 1

if unitIssues == 0:
    print("  All units have required fields - OK")

print(f"\nSCORE CALCULATION:")
print(f"  Sessions compliance: {sessionScore}/100")
print(f"  Units compliance: {max(0, unitScore)}/100")
finalScore = round((sessionScore + max(0, unitScore)) / 2, 0)
print(f"\nFINAL AUDIT SCORE: {int(finalScore)}/100")
