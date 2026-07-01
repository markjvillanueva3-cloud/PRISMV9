import json

f = r'C:\PRISM\data\FORMULA_REGISTRY.json'
with open(f, 'r') as file:
    data = json.load(file)

# Update F-PSI-001 constraints to UNLIMITED
data['formulaRegistry']['formulas']['F-PSI-001']['version'] = '3.0'
data['formulaRegistry']['formulas']['F-PSI-001']['constraints'] = [
    '|R_skills| = UNLIMITED (deploy all relevant)',
    '|R_agents| = UNLIMITED (deploy all relevant)',
    '|R_execution| = 1',
    'S(R) >= 0.70 (HARD - safety)',
    'M(R) >= 0.60 (rigor)',
    'Coverage(R,T) = 1.0 (full coverage)'
]
data['formulaRegistry']['formulas']['F-PSI-001']['constraint_philosophy'] = {
    'policy': 'MAXIMUM_UTILIZATION',
    'principle': 'Deploy ALL resources that improve task outcome',
    'restriction': 'Only restrict if context overflow imminent (>15 tool calls approaching)',
    'goal': '100% utilization of available capabilities'
}

# Update metadata
data['formulaRegistry']['metadata']['version'] = '3.0'
data['formulaRegistry']['metadata']['lastUpdated'] = '2026-01-30T02:15:00Z'
data['formulaRegistry']['metadata']['constraint_policy'] = 'UNLIMITED_DEPLOYMENT'
data['formulaRegistry']['metadata']['changelog'].append({
    'version': '3.0',
    'date': '2026-01-30',
    'changes': 'Removed artificial skill/agent limits. MAXIMUM UTILIZATION policy active.'
})

with open(f, 'w') as file:
    json.dump(data, file, indent=2)

print('F-PSI-001 v3.0: UNLIMITED constraints')
print('Policy: MAXIMUM_UTILIZATION')
print('Deploy ALL relevant skills and agents')
