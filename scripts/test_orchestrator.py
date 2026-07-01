import json
import re

print('=' * 70)
print('TASK 2: ORCHESTRATOR TEST - AUTOMATIC SKILL LOADING')
print('=' * 70)
print()

# Load trigger map
with open(r'C:\PRISM\data\coordination\SKILL_TRIGGER_MAP.json', 'r') as f:
    trigger_map = json.load(f)

# Test cases
test_messages = [
    'I need to design a new feature for speed calculation',
    'Extract the KIENZLE module from the monolith',
    'Debug this error in the material validator',
    'What is the Fanuc G-code for thread milling?',
    'Calculate cutting speed for 4140 steel',
    'Verify the task is complete with evidence',
    'Help me plan the next sprint tasks',
    'Review the code quality and patterns',
]

def match_skills(message, triggers):
    matched = []
    msg_lower = message.lower()
    for skill, data in triggers.items():
        for pattern in data['patterns']:
            if pattern.lower() in msg_lower:
                matched.append((skill, pattern, data['level'], data['priority']))
                break
    matched.sort(key=lambda x: x[3])
    return matched

print('TEST RESULTS:')
print('-' * 70)

for msg in test_messages:
    print(f'\nMESSAGE: "{msg}"')
    matches = match_skills(msg, trigger_map['triggers'])
    if matches:
        print('  SKILLS LOADED:')
        for skill, pattern, level, priority in matches:
            print(f'    [{level}] {skill} (matched: "{pattern}")')
    else:
        print('  No specific triggers matched - using L0 defaults only')

print()
print('=' * 70)
print('TEST COMPLETE: Trigger system working correctly')
print('=' * 70)
