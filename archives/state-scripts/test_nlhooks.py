import json
try:
    with open(r'C:\PRISM\state\nl_hooks\registry.json', 'r', encoding='utf-8') as f:
        d = json.load(f)
    hooks = d.get('hooks', [])
    deployed = [h for h in hooks if h.get('deploy_status') in ('deployed','active')]
    first = hooks[0] if hooks else {}
    result = f'Total:{len(hooks)} Deployed:{len(deployed)}\nFirst ID: {first.get("id","?")}\nKeys: {list(first.keys())}\nCondition: {first.get("condition","?")}\nActionType: {first.get("action_type","?")}\nPayload: {first.get("action_payload","?")[:60]}'
except Exception as e:
    result = f'ERROR: {e}'
with open(r'C:\PRISM\state\trigger_output.txt', 'w') as f:
    f.write(result)