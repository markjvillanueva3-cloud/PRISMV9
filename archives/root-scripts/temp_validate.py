import json
d = json.load(open(r'C:\PRISM\skills-consolidated\SKILL_INDEX.json', encoding='utf-8'))
skills = d.get('skills', d)
print(f'Valid JSON. {len(skills)} skills total.')
# Check new skills exist
for name in ['prism-cadence-tuning', 'prism-hook-activation-audit', 'prism-session-script-runner', 'prism-nl-hook-lifecycle']:
    if name in skills:
        print(f'  OK: {name}')
    else:
        print(f'  MISSING: {name}')
