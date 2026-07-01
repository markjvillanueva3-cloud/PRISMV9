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

sessions = data.get('sessions', [])
print("=== WEDM-MS1 PROTOCOL STRUCTURE AUDIT ===\n")
print(f"Total Sessions: {len(sessions)}")
print(f"Total Units (declared): {data.get('total_units', 0)}\n")

sessionFields = ['id', 'title', 'units', 'smart_config', 'knowledge', 'intent', 'skills', 'work', 'exit_gate', 'compact_checkpoint']
unitFields = ['title', 'description', 'depends_on', 'files_created', 'files_modified', 'abort_criteria', 'rollback', 'exit_gate', 'four_loop']

sessionScore = 100
unitScore = 100
unitCount = 0
unitIssues = 0

print("SESSIONS AUDIT:")
for i, session in enumerate(sessions):
    missingFields = [f for f in sessionFields if f not in session]
    unitCountInSession = len(session.get('units', []))
    unitCount += unitCountInSession
    
    if not missingFields:
        print(f"  S{i}: {session.get('title', 'UNKNOWN')} - OK (units: {unitCountInSession})")
    else:
        print(f"  S{i}: {session.get('title', 'UNKNOWN')} - MISSING: {', '.join(missingFields)}")
        sessionScore -= (10 * len(missingFields))

print(f"\nUNITS AUDIT:")
print(f"Total units found: {unitCount}")
print(f"Expected: {data.get('total_units', 0)}")

for si, session in enumerate(sessions):
    units = session.get('units', [])
    for ui, unit in enumerate(units):
        if isinstance(unit, str):
            print(f"  S{si}/U{ui}: Unit is string reference: {unit}")
            unitIssues += 1
        elif isinstance(unit, dict):
            missingFields = [f for f in unitFields if f not in unit]
            if missingFields:
                print(f"  S{si}/U{ui} '{unit.get('title', 'UNKNOWN')}' - MISSING: {', '.join(missingFields)}")
                unitIssues += 1
                unitScore -= (5 * len(missingFields))
        else:
            print(f"  S{si}/U{ui}: Unexpected type {type(unit)}")
            unitIssues += 1

if unitIssues == 0:
    print("  All units have required fields - OK")

print(f"\nSCORE CALCULATION:")
print(f"  Sessions compliance: {sessionScore}/100")
print(f"  Units compliance: {max(0, unitScore)}/100")
finalScore = round((sessionScore + max(0, unitScore)) / 2, 0)
print(f"\nFINAL AUDIT SCORE: {int(finalScore)}/100")
