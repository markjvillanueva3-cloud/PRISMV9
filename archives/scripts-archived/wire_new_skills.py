"""Wire new skills into CAPABILITY_MATRIX and SYNERGY_MATRIX."""
import json
from pathlib import Path

# Load CAPABILITY_MATRIX
cap_path = Path(r'C:\PRISM\data\coordination\CAPABILITY_MATRIX.json')
cap = json.loads(cap_path.read_text(encoding='utf-8'))

rc = cap['capabilityMatrix']['resourceCapabilities']

# New skills to add
new_skills = {
    'SKILL-121': {
        'name': 'prism-cutting-mechanics',
        'domainScores': {
            'physics': 1.0,
            'machining': 0.95,
            'calculation': 0.95,
            'tooling': 0.85
        },
        'operationScores': {
            'calculate': 1.0,
            'analyze': 0.95,
            'validate': 0.85
        },
        'complexity': 0.82,
        'taskTypeScores': {}
    },
    'SKILL-122': {
        'name': 'prism-cam-strategies',
        'domainScores': {
            'machining': 1.0,
            'planning': 0.95,
            'tooling': 0.90,
            'optimization': 0.85
        },
        'operationScores': {
            'plan': 1.0,
            'optimize': 0.95,
            'generate': 0.90
        },
        'complexity': 0.78,
        'taskTypeScores': {}
    },
    'SKILL-123': {
        'name': 'prism-cutting-tools',
        'domainScores': {
            'tooling': 1.0,
            'machining': 0.90,
            'materials': 0.85
        },
        'operationScores': {
            'analyze': 0.95,
            'validate': 0.90,
            'calculate': 0.80
        },
        'complexity': 0.72,
        'taskTypeScores': {}
    },
    'SKILL-124': {
        'name': 'prism-ai-deep-learning',
        'domainScores': {
            'learning': 1.0,
            'optimization': 0.95,
            'calculation': 0.90
        },
        'operationScores': {
            'learn': 1.0,
            'optimize': 0.95,
            'analyze': 0.90,
            'synthesize': 0.85
        },
        'complexity': 0.88,
        'taskTypeScores': {}
    }
}

# Add new skills
for skill_id, skill_data in new_skills.items():
    if skill_id not in rc:
        rc[skill_id] = skill_data
        print(f"Added {skill_id}: {skill_data['name']}")
    else:
        print(f"Already exists: {skill_id}")

# Update metadata
cap['capabilityMatrix']['metadata']['lastUpdated'] = '2026-01-30T20:00:00Z'
cap['capabilityMatrix']['metadata']['dimensions']['resources'] = len(rc)

# Save
cap_path.write_text(json.dumps(cap, indent=2), encoding='utf-8')
print(f"\nSaved CAPABILITY_MATRIX. Total resources: {len(rc)}")

# Now update SYNERGY_MATRIX
syn_path = Path(r'C:\PRISM\data\coordination\SYNERGY_MATRIX.json')
syn = json.loads(syn_path.read_text(encoding='utf-8'))

# Add synergies for new skills
new_synergies = {
    'prism-cutting-mechanics': {
        'prism-material-physics': 0.95,
        'prism-product-calculators': 0.90,
        'prism-cutting-tools': 0.88,
        'prism-signal-processing': 0.80
    },
    'prism-cam-strategies': {
        'prism-cutting-mechanics': 0.90,
        'prism-cutting-tools': 0.88,
        'prism-gcode-reference': 0.85,
        'prism-product-calculators': 0.82
    },
    'prism-cutting-tools': {
        'prism-material-physics': 0.88,
        'prism-cutting-mechanics': 0.88,
        'prism-cam-strategies': 0.85
    },
    'prism-ai-deep-learning': {
        'prism-ai-optimization': 0.92,
        'prism-ai-bayesian': 0.88,
        'prism-learning-engines': 0.90,
        'prism-signal-processing': 0.82
    }
}

# Add to synergy matrix
if 'synergyMatrix' not in syn:
    syn['synergyMatrix'] = {}
    
for skill, synergies in new_synergies.items():
    if skill not in syn['synergyMatrix']:
        syn['synergyMatrix'][skill] = synergies
        print(f"Added synergies for: {skill}")
    else:
        print(f"Synergies already exist: {skill}")

# Save synergy matrix
syn_path.write_text(json.dumps(syn, indent=2), encoding='utf-8')
print(f"\nSaved SYNERGY_MATRIX")

print("\n=== WIRING COMPLETE ===")
