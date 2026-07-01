import json
import sys

# Load the milestone
with open('C:\Users\wompu\AppData\Local\Temp\wedm-ms0.json', 'r') as f:
    data = json.load(f)

# RGS PROTOCOL FIELD REQUIREMENTS
SESSION_FIELD_ORDER = ['id', 'title', 'units', 'smart_config', 'knowledge', 'intent', 'skills', 'work', 'exit_gate', 'compact_checkpoint']
UNIT_REQUIRED_FIELDS = ['title', 'description', 'depends_on', 'files_created', 'files_modified', 'abort_criteria', 'rollback', 'exit_gate', 'four_loop']

def validate_session(session, idx):
    issues = []
    
    # Check field order
    actual_fields = list(session.keys())
    
    # Check for missing required fields
    for field in SESSION_FIELD_ORDER:
        if field not in actual_fields:
            issues.append(f"  MISSING SESSION FIELD: {field}")
    
    # Check for extra fields
    for field in actual_fields:
        if field not in SESSION_FIELD_ORDER:
            issues.append(f"  EXTRA SESSION FIELD: {field}")
    
    # Validate work block
    if 'work' in session:
        work = session['work']
        if not isinstance(work, dict):
            issues.append(f"  work block is not a dict")
        else:
            for unit_id, unit in work.items():
                unit_issues = validate_unit(unit, unit_id)
                issues.extend(unit_issues)
    else:
        issues.append(f"  MISSING: work block")
    
    return issues

def validate_unit(unit, unit_id):
    issues = []
    
    if not isinstance(unit, dict):
        issues.append(f"    Unit {unit_id} is not a dict")
        return issues
    
    # Check required fields
    for field in UNIT_REQUIRED_FIELDS:
        if field not in unit:
            issues.append(f"    Unit {unit_id} MISSING: {field}")
    
    # Check for extra fields
    for field in unit.keys():
        if field not in UNIT_REQUIRED_FIELDS:
            issues.append(f"    Unit {unit_id} EXTRA FIELD: {field}")
    
    # Validate field types
    if 'depends_on' in unit and not isinstance(unit['depends_on'], list):
        issues.append(f"    Unit {unit_id}: depends_on is not a list")
    
    if 'files_created' in unit and not isinstance(unit['files_created'], list):
        issues.append(f"    Unit {unit_id}: files_created is not a list")
    
    if 'files_modified' in unit and not isinstance(unit['files_modified'], list):
        issues.append(f"    Unit {unit_id}: files_modified is not a list")
    
    if 'abort_criteria' in unit and not isinstance(unit['abort_criteria'], list):
        issues.append(f"    Unit {unit_id}: abort_criteria is not a list")
    
    if 'four_loop' in unit and not isinstance(unit['four_loop'], str):
        issues.append(f"    Unit {unit_id}: four_loop is not a string")
    
    return issues

# Main validation
all_issues = []
score_items = []

print("=" * 70)
print("RGS PROTOCOL STRUCTURE COMPLIANCE CHECK: WEDM-MS0")
print("=" * 70)

if 'sessions' not in data:
    print("\nFATAL: No 'sessions' array found in milestone")
    sys.exit(1)

sessions = data['sessions']
if not isinstance(sessions, list):
    print(f"\nFATAL: sessions is {type(sessions)}, not list")
    sys.exit(1)

print(f"\nTotal sessions: {len(sessions)}\n")

for i, session in enumerate(sessions):
    print(f"[SESSION {i}] {session.get('id', 'UNKNOWN')}: {session.get('title', 'UNKNOWN')}")
    session_issues = validate_session(session, i)
    
    if session_issues:
        all_issues.extend(session_issues)
        score_items.append(0)
        for issue in session_issues:
            print(issue)
    else:
        score_items.append(1)
        print("  ✓ VALID")

# Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)

valid_sessions = sum(score_items)
total_sessions = len(score_items)

if all_issues:
    print(f"\nFound {len(all_issues)} structural issues:\n")
    for issue in all_issues:
        print(issue)
else:
    print("\n✓ No structural issues found!")

# Score
if len(score_items) == 0:
    score = 0
else:
    score = int((valid_sessions / total_sessions) * 100)

print(f"\nRGS PROTOCOL COMPLIANCE SCORE: {score}/100")
print(f"Sessions with correct structure: {valid_sessions}/{total_sessions}")

