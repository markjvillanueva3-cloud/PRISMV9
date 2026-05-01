# -*- coding: utf-8 -*-
"""Test auto-hooks system"""
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'C:\\PRISM\\mcp-server')

from src.tools.intelligence import INTELLIGENCE_TOOLS, initialize_auto_hooks, get_auto_hook_system
from src.tools.intelligence.auto_hooks import get_session_state

# Initialize like the server does
print("Initializing auto-hooks...")
initialize_auto_hooks(INTELLIGENCE_TOOLS)
system = get_auto_hook_system()
print("System enabled:", system.enabled)
print("Intel tools loaded:", system.intel_tools is not None)

# Test 1: Session start
print("\n=== TEST 1: Session Start ===")
system.on_session_start()
print("Session start hooks fired")

# Test 2: Code write (>20 lines)
print("\n=== TEST 2: Code Write ===")
test_code = """
def calculate_something(x, y, z):
    result = x + y
    result = result * z
    if result > 100:
        return result / 2
    elif result > 50:
        return result
    else:
        return result * 2

def process_data(data):
    output = []
    for item in data:
        processed = item * 2
        output.append(processed)
    return output

def main():
    values = [1, 2, 3, 4, 5]
    result = process_data(values)
    print(result)
"""
result = system.on_code_write('test_file.py', test_code)
print("Code write result type:", type(result))
if result:
    print("Code write SUCCESS - cascade review triggered")
else:
    print("Code write skipped (file too small or non-code)")

# Test 3: Failure hook
print("\n=== TEST 3: Failure Hook ===")
try:
    raise ValueError("Test error for auto-hook system")
except Exception as e:
    result = system.on_failure('test_tool', e, file_path='test.py')
    print("Failure hook result type:", type(result))
    if result:
        print("Failure hook SUCCESS - reflection triggered")

# Check final status
print("\n=== FINAL STATUS ===")
state = get_session_state()
print("Session started:", state['started'])
print("Tool calls tracked:", state['tool_calls'])
print("Failures tracked:", state['failures'])
print("Hooks fired:", len(state['hooks_fired']))

print("\nHooks that fired:")
for h in state['hooks_fired']:
    print("  -", h['hook_id'])

# Check log file
log_path = 'C:\\PRISM\\logs\\auto_hooks.log'
if os.path.exists(log_path):
    print("\n=== LOG FILE EXISTS ===")
    with open(log_path, 'r') as f:
        lines = f.readlines()[-10:]
        for line in lines:
            print(" ", line.strip())

print("\n[SUCCESS] AUTO-HOOKS TEST COMPLETE")
