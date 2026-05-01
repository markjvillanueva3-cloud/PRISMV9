import sys
sys.path.insert(0, r'C:\PRISM\scripts\core')
from workflow_tracker import start_workflow, advance_step, get_recovery_context, get_status
import json

# Test 1: Start
print("=== START ===")
r = start_workflow("feature_implement", name="W6.1 Workflow-Aware Recovery")
print(f"ID: {r['workflow_id']}, Steps: {r['total_steps']}, Current: {r['current_step']}")
print(f"Step 1 status: {r['steps'][0]['status']}")

# Test 2: Advance through 3 steps
print("\n=== ADVANCE x3 ===")
for i in range(3):
    r = advance_step(notes=f"Step {i+1} completed", files_touched=[f"file_{i+1}.ts"])
    print(f"Now on step {r['current_step']} of {r['total_steps']}: {r['steps'][r['current_step']-1]['name']}")

# Test 3: Recovery context (the critical test)
print("\n=== RECOVERY CONTEXT ===")
rc = get_recovery_context()
print(json.dumps(rc, indent=2))
