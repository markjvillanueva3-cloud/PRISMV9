#!/usr/bin/env python3
import json

jsonPath = r'H:\prism\mcp-server\data\milestones\WEDM-MS1.json'
with open(jsonPath, encoding='utf-8') as f:
    data = json.load(f)

sessions = data.get('sessions', [])
print("=== WEDM-MS1 PROTOCOL STRUCTURE AUDIT ===\n")
print(f"Total Sessions: {len(sessions)}")
print(f"Total Units: {data.get('total_units', 0)}\n")

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

for session in sessions:
    for unit in session.get('units', []):
        missingFields = [f for f in unitFields if f not in unit]
        if missingFields:
            print(f"  Unit '{unit.get('title', 'UNKNOWN')}' - MISSING: {', '.join(missingFields)}")
            unitIssues += 1
            unitScore -= (5 * len(missingFields))

if unitIssues == 0:
    print("  All units have required fields - OK")

print(f"\nSCORE CALCULATION:")
print(f"  Session compliance: {sessionScore}/100")
print(f"  Unit compliance: {max(0, unitScore)}/100")
finalScore = round((sessionScore + max(0, unitScore)) / 2, 0)
print(f"\nFINAL AUDIT SCORE: {int(finalScore)}/100")
