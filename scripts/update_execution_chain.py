import json

p = r'C:\PRISM\knowledge\code-index\EXECUTION_CHAIN.json'
with open(p, 'r') as f:
    d = json.load(f)

acts = d['dispatchers']['prism_data']['actions']
if 'tool_facets' not in acts:
    acts.append('tool_facets')
    acts.sort()
    d['dispatchers']['prism_data']['action_count'] = len(acts)
    total = 0
    for dd in d['dispatchers'].values():
        total += dd.get('action_count', len(dd.get('actions', [])))
    d['summary']['total_actions'] = total
    with open(p, 'w') as f:
        json.dump(d, f, indent=2)
    print('Added tool_facets. New prism_data count:', len(acts), 'Total:', total)
else:
    print('tool_facets already present')
