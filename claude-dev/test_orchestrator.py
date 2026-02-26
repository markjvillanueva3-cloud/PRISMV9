import sys
sys.path.insert(0, r'C:\PRISM\claude-dev')

from orchestration.auto_orchestrator import orchestrate

# Test ALL dev tools recognition
tests = [
    # Background Tasks
    ("run tests in background", "dev_tools"),
    ("spawn a background build task", "dev_tools"),
    ("start npm test in background", "dev_tools"),
    
    # Checkpoints
    ("create a checkpoint before editing", "dev_tools"),
    ("make a snapshot of the current state", "dev_tools"),
    ("rollback to previous checkpoint", "dev_tools"),
    
    # Impact Analysis
    ("analyze the impact of changing myfile.ts", "dev_tools"),
    ("check impact before modifying the code", "dev_tools"),
    ("what files import this module", "dev_tools"),
    
    # Semantic Search
    ("semantic search for cutting force", "dev_tools"),
    ("find similar code to this function", "dev_tools"),
    ("code search for authentication logic", "dev_tools"),
    
    # Context Sync
    ("watch for file changes in src", "dev_tools"),
    ("monitor files for changes", "dev_tools"),
    
    # Non-dev-tools (should NOT match)
    ("calculate cutting force", "calculation"),
    ("find all aluminum materials", "data_query"),
    ("start a new session", "session"),
]

print("Dev Tools Recognition Test:")
print("=" * 70)

passed = 0
failed = 0

for task, expected in tests:
    result = orchestrate(task)
    actual = result['classification']['type']
    status = "PASS" if actual == expected else "FAIL"
    
    if status == "PASS":
        passed += 1
    else:
        failed += 1
    
    print(f"[{status}] '{task[:40]:<40}' -> {actual} (expected: {expected})")

print("=" * 70)
print(f"Results: {passed}/{passed+failed} passed ({100*passed/(passed+failed):.0f}%)")
