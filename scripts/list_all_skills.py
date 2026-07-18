import os
import json

skills_dir = r'C:\PRISM\skills'
skills_to_check = []

# Walk through the skills directory
for item in os.listdir(skills_dir):
    item_path = os.path.join(skills_dir, item)
    if os.path.isdir(item_path) and item.startswith('prism-'):
        skill_file = os.path.join(item_path, 'SKILL.md')
        if os.path.exists(skill_file):
            skills_to_check.append({
                'name': item,
                'path': skill_file,
                'size': os.path.getsize(skill_file)
            })

# Also check level directories
for level_dir in ['level0-always-on', 'level1-cognitive', 'level2-workflow', 'level3-domain', 'level4-reference']:
    level_path = os.path.join(skills_dir, level_dir)
    if os.path.exists(level_path):
        for item in os.listdir(level_path):
            item_path = os.path.join(level_path, item)
            if os.path.isdir(item_path) and item.startswith('prism-'):
                skill_file = os.path.join(item_path, 'SKILL.md')
                if os.path.exists(skill_file):
                    skills_to_check.append({
                        'name': item,
                        'path': skill_file,
                        'size': os.path.getsize(skill_file)
                    })

# Remove duplicates and sort by size
seen = set()
unique_skills = []
for s in skills_to_check:
    if s['name'] not in seen:
        seen.add(s['name'])
        unique_skills.append(s)

unique_skills.sort(key=lambda x: x['size'])

print(f'Total unique skills found: {len(unique_skills)}')
for s in unique_skills:
    print(f"{s['name']}|{s['path']}|{s['size']}")
