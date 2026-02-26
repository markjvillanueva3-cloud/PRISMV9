"""Update RESOURCE_REGISTRY.json with new skills."""
import json
from pathlib import Path
from datetime import datetime

reg_path = Path(r'C:\PRISM\data\coordination\RESOURCE_REGISTRY.json')
data = json.loads(reg_path.read_text(encoding='utf-8'))

skills = data['resourceRegistry']['resources']['skills']
items = skills['items']

# Add new skills
new_skills = {
    'prism-signal-processing': {
        'id': 'SKILL-119',
        'level': 'L4',
        'domain': 'physics',
        'lines': 729,
        'purpose': 'FFT, filters, wavelets, chatter detection',
        'gatewayRoutes': ['signal.fft', 'signal.filter.*', 'signal.wavelet.*', 'physics.chatter.*'],
        'addedAt': datetime.now().isoformat()
    },
    'prism-learning-engines': {
        'id': 'SKILL-120',
        'level': 'L3',
        'domain': 'learning',
        'lines': 864,
        'purpose': 'Active learning, CAM learning, machine behavior learning',
        'gatewayRoutes': ['ai.active.*', 'ai.learn.*', 'ai.learn.machine.*'],
        'addedAt': datetime.now().isoformat()
    }
}

for name, info in new_skills.items():
    if name not in items:
        items[name] = info
        print(f'Added: {name}')
    else:
        print(f'Already exists: {name}')

# Update count
skills['count'] = len(items)
data['resourceRegistry']['metadata']['lastUpdated'] = datetime.now().isoformat()

# Write back
reg_path.write_text(json.dumps(data, indent=2), encoding='utf-8')
print(f"Updated registry. New skill count: {skills['count']}")
