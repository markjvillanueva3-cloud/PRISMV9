"""
PRISM Skill Tree Sync v1.0
===========================
Syncs skills between C: drive and /mnt/skills/user/ tree structure.

Usage:
    py -3 C:\PRISM\scripts\skill_tree_sync.py --export    # C: → /mnt/skills/user/
    py -3 C:\PRISM\scripts\skill_tree_sync.py --import    # /mnt/skills/user/ → C:
    py -3 C:\PRISM\scripts\skill_tree_sync.py --verify    # Verify tree integrity
    py -3 C:\PRISM\scripts\skill_tree_sync.py --bundle    # Create deployment bundle
"""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime

TREE_REGISTRY = Path(r"C:\PRISM\data\coordination\SKILL_TREE_REGISTRY.json")
C_DRIVE_SKILLS = Path(r"C:\PRISM\skills-consolidated")
DEPLOYMENT_DIR = Path(r"C:\PRISM\deployment")

def load_registry():
    with open(TREE_REGISTRY) as f:
        return json.load(f)

def get_all_skills_from_registry(registry):
    """Extract all skills with their branch paths from registry."""
    skills = {}
    tree = registry["tree"]
    
    for level_name, level_data in tree.items():
        if not level_name.startswith("L"):
            continue
            
        if "sub_branches" in level_data:
            for branch_name, branch_data in level_data["sub_branches"].items():
                branch_path = f"{level_name}/{branch_name}"
                for skill in branch_data.get("skills", []):
                    skills[skill] = branch_path
        else:
            for skill in level_data.get("skills", []):
                skills[skill] = level_name
    
    return skills

def verify_tree(registry):
    """Verify tree integrity and report issues."""
    print("=" * 70)
    print("SKILL TREE INTEGRITY CHECK")
    print("=" * 70)
    
    skills = get_all_skills_from_registry(registry)
    
    issues = []
    verified = []
    
    # Check each skill in registry exists on C: drive
    for skill, branch in skills.items():
        c_path = C_DRIVE_SKILLS / skill / "SKILL.md"
        if c_path.exists():
            verified.append(skill)
        else:
            issues.append(f"MISSING on C: drive: {skill} (branch: {branch})")
    
    # Check for skills on C: drive not in registry
    if C_DRIVE_SKILLS.exists():
        for item in C_DRIVE_SKILLS.iterdir():
            if item.is_dir() and item.name.startswith("prism-"):
                if item.name not in skills:
                    issues.append(f"NOT IN REGISTRY: {item.name}")
    
    print(f"\nVerified: {len(verified)} skills")
    print(f"Issues: {len(issues)}")
    
    if issues:
        print("\n--- ISSUES ---")
        for issue in issues[:20]:
            print(f"  ⚠ {issue}")
        if len(issues) > 20:
            print(f"  ... and {len(issues) - 20} more")
    else:
        print("\n✓ All skills verified!")
    
    return len(issues) == 0

def create_bundle(registry):
    """Create deployment bundle with tree structure."""
    print("=" * 70)
    print("CREATING DEPLOYMENT BUNDLE")
    print("=" * 70)
    
    DEPLOYMENT_DIR.mkdir(parents=True, exist_ok=True)
    
    skills = get_all_skills_from_registry(registry)
    bundle = {
        "version": "1.0",
        "created": datetime.now().isoformat(),
        "total_skills": len(skills),
        "tree_structure": True,
        "skills": {}
    }
    
    success = 0
    failed = 0
    
    for skill, branch in skills.items():
        c_path = C_DRIVE_SKILLS / skill / "SKILL.md"
        if c_path.exists():
            with open(c_path, 'r', encoding='utf-8') as f:
                content = f.read()
            bundle["skills"][skill] = {
                "branch": branch,
                "content": content
            }
            success += 1
        else:
            failed += 1
            print(f"  ⚠ Missing: {skill}")
    
    # Write bundle
    bundle_path = DEPLOYMENT_DIR / "skills_tree_bundle.json"
    with open(bundle_path, 'w', encoding='utf-8') as f:
        json.dump(bundle, f, indent=2)
    
    size_kb = bundle_path.stat().st_size / 1024
    
    print(f"\n✓ Bundle created: {bundle_path}")
    print(f"  Skills bundled: {success}")
    print(f"  Failed: {failed}")
    print(f"  Size: {size_kb:.1f} KB")
    
    return bundle_path

def export_to_tree():
    """Export skills from C: drive to /mnt/skills/user/ tree structure."""
    print("=" * 70)
    print("EXPORTING TO SKILL TREE")
    print("=" * 70)
    print("\nThis would deploy skills to /mnt/skills/user/ tree structure.")
    print("Use the deployment bundle with Claude's bash tools.")
    print("\nGenerated bundle at: C:\\PRISM\\deployment\\skills_tree_bundle.json")

def main():
    import sys
    
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    registry = load_registry()
    cmd = sys.argv[1]
    
    if cmd == "--verify":
        verify_tree(registry)
    elif cmd == "--bundle":
        create_bundle(registry)
    elif cmd == "--export":
        create_bundle(registry)
        export_to_tree()
    elif cmd == "--import":
        print("Import from /mnt/skills/user/ to C: drive")
        print("Use Claude's tools to read from /mnt/skills/user/")
    else:
        print(__doc__)

if __name__ == "__main__":
    main()
