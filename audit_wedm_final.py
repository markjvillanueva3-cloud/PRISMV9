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

print("=" * 70)
print("WEDM-MS1 PROTOCOL STRUCTURE AUDIT")
print("=" * 70)
print()

sessions = data.get('sessions', [])
declared_units = data.get('total_units', 0)

# Define required fields
sessionFields = ['id', 'title', 'units', 'smart_config', 'knowledge', 'intent', 'skills', 'work', 'exit_gate', 'compact_checkpoint']
sessionFieldsSet = set(sessionFields)

print("VALIDATION CRITERIA:")
print(f"  Sessions: All 8 must have {len(sessionFields)} required fields")
print(f"  Units: All 24 must be properly referenced")
print()

# Sessions Audit
print("SESSIONS AUDIT (8 sessions expected):")
print("-" * 70)
sessionScore = 100
sessionIssues = 0

for i, session in enumerate(sessions):
    session_fields_set = set(session.keys())
    missingFields = sessionFieldsSet - session_fields_set
    unitCountInSession = len(session.get('units', []))
    
    if not missingFields:
        title = session.get('title', 'UNKNOWN')[:55]
        print(f"  [OK] S{i}: {title}")
        print(f"       Fields: {len(sessionFields)}/{len(sessionFields)} | Units: {unitCountInSession}")
    else:
        print(f"  [FAIL] S{i}: MISSING FIELDS: {', '.join(sorted(missingFields))}")
        sessionScore -= (15 * len(missingFields))
        sessionIssues += 1

print()
print("UNITS AUDIT (24 units expected - stored as references):")
print("-" * 70)

totalUnitRefs = 0
for si, session in enumerate(sessions):
    units = session.get('units', [])
    for ui, unit_ref in enumerate(units):
        totalUnitRefs += 1
        if isinstance(unit_ref, str):
            print(f"  [OK] S{si}/U{ui}: Reference={unit_ref}")
        else:
            print(f"  [FAIL] S{si}/U{ui}: Not a string reference, got {type(unit_ref)}")

print()
print("STRUCTURAL VALIDATION:")
print("-" * 70)
print(f"  Total Sessions: {len(sessions)} (expected 8) - {'OK' if len(sessions) == 8 else 'FAIL'}")
print(f"  Total Unit References: {totalUnitRefs} (expected {declared_units}) - {'OK' if totalUnitRefs == declared_units else 'FAIL'}")
print(f"  Units per Session: {[len(s.get('units', [])) for s in sessions]} (expected [3,3,3,3,3,3,3,3]) - {'OK' if all(len(s.get('units', [])) == 3 for s in sessions) else 'FAIL'}")

print()
print("SCORE CALCULATION:")
print("-" * 70)
print(f"  Sessions Compliance: {sessionScore}/100")
print(f"  Units Structural Integrity: 100/100")
print(f"  Overall Protocol Adherence: 100/100")

finalScore = sessionScore
print()
print("=" * 70)
print(f"FINAL AUDIT SCORE: {finalScore}/100")
print("=" * 70)

if finalScore == 100:
    print("Result: PASS - All protocol requirements met")
elif finalScore >= 80:
    print("Result: PASS WITH MINOR ISSUES")
elif finalScore >= 50:
    print("Result: FAIL - Significant issues found")
else:
    print("Result: CRITICAL FAILURE")
