#!/usr/bin/env python3
"""Fix SKILL.md frontmatter to only include allowed keys"""
import os
import re
from pathlib import Path

ALLOWED_KEYS = {'name', 'description', 'license', 'allowed-tools', 'compatibility', 'metadata'}

def fix_frontmatter(filepath):
    """Fix frontmatter in a single SKILL.md file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match frontmatter
    match = re.match(r'^---\s*\n([\s\S]*?)\n---\s*\n', content)
    if not match:
        return False, "No frontmatter found"
    
    frontmatter = match.group(1)
    rest = content[match.end():]
    
    # Parse YAML-like frontmatter manually (simple key: value or key: |)
    lines = frontmatter.split('\n')
    new_lines = []
    current_key = None
    in_multiline = False
    skip_until_next_key = False
    
    for line in lines:
        # Check if this is a new key
        key_match = re.match(r'^([a-zA-Z][a-zA-Z0-9_-]*)\s*:', line)
        
        if key_match:
            current_key = key_match.group(1).lower()
            in_multiline = line.rstrip().endswith('|')
            
            if current_key in ALLOWED_KEYS:
                new_lines.append(line)
                skip_until_next_key = False
            else:
                skip_until_next_key = True
        elif skip_until_next_key:
            # Skip continuation lines of disallowed keys
            continue
        else:
            # Continuation of allowed key
            new_lines.append(line)
    
    new_frontmatter = '\n'.join(new_lines)
    new_content = f"---\n{new_frontmatter}\n---\n{rest}"
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, "Fixed"
    return False, "No changes needed"

def main():
    skills_dir = Path(r"C:\PRISM\skills-consolidated")
    
    print("Fixing SKILL.md frontmatter...")
    print(f"Allowed keys: {ALLOWED_KEYS}\n")
    
    fixed = 0
    skipped = 0
    errors = 0
    
    for skill_dir in sorted(skills_dir.iterdir()):
        if not skill_dir.is_dir():
            continue
        
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        
        try:
            changed, msg = fix_frontmatter(skill_file)
            if changed:
                print(f"  [FIXED] {skill_dir.name}")
                fixed += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  [ERROR] {skill_dir.name}: {e}")
            errors += 1
    
    print(f"\nDone: {fixed} fixed, {skipped} unchanged, {errors} errors")

if __name__ == "__main__":
    main()
