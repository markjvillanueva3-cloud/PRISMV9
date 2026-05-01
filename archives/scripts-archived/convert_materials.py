import re, json

with open(r'C:\PRISM\extracted\materials\PRISM_MATERIALS_COMPLETE.js', 'r') as f:
    content = f.read()

start = content.find('{')
end = content.rfind('}') + 1
obj_str = content[start:end]

data = json.loads(obj_str)

materials = []
for name, props in data.items():
    iso = props.get('iso', 'X')
    mat = {'material_id': f"{iso}-{name.replace(' ', '-').upper()}", 'name': name, **props}
    materials.append(mat)

output = {'metadata': {'count': len(materials)}, 'materials': materials}

with open(r'C:\PRISM\extracted\materials\MATERIALS_MASTER.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f'Created MATERIALS_MASTER.json with {len(materials)} materials')
