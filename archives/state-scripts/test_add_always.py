import json
with open(r'C:\PRISM\state\nl_hooks\registry.json', 'r', encoding='utf-8') as f:
    d = json.load(f)
d['hooks'].append({
    'id': 'nl-always-test',
    'name': 'Always Fire Test',
    'description': 'Test hook that always fires',
    'condition': 'always:true',
    'action_type': 'warn',
    'action_payload': 'NL_HOOK_SYSTEM_ACTIVE - always-fire test hook working',
    'message': 'NL_HOOK_SYSTEM_ACTIVE - always-fire test hook working',
    'severity': 'info',
    'category': 'test',
    'tags': ['test', 'always'],
    'deploy_status': 'deployed',
    'created': '2026-02-19T02:30:00Z'
})
with open(r'C:\PRISM\state\nl_hooks\registry.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
with open(r'C:\PRISM\state\trigger_output.txt', 'w') as f:
    f.write(f'Added always hook. Total: {len(d["hooks"])}')