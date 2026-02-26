import os
import json
import base64

deploy_dir = r'C:\PRISM\deployment\skills_package_v4'
output_file = r'C:\PRISM\deployment\skills_bundle.json'

skills = [d for d in os.listdir(deploy_dir) if d.startswith('prism-') and os.path.isdir(os.path.join(deploy_dir, d))]

bundle = {}
for skill in sorted(skills):
    skill_file = os.path.join(deploy_dir, skill, 'SKILL.md')
    if os.path.exists(skill_file):
        with open(skill_file, 'r', encoding='utf-8') as f:
            content = f.read()
        bundle[skill] = content
        print(f"Bundled: {skill} ({len(content)} chars)")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(bundle, f, ensure_ascii=False)

print(f"\nTotal skills bundled: {len(bundle)}")
print(f"Output: {output_file}")
print(f"Size: {os.path.getsize(output_file) / 1024:.1f} KB")
