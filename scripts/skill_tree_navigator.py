"""
PRISM Skill Tree Navigator v1.0
================================
Tree traversal and branch loading for the 5-level, 20-branch skill hierarchy.

Usage:
    py -3 C:\PRISM\scripts\skill_tree_navigator.py --list
    py -3 C:\PRISM\scripts\skill_tree_navigator.py --branch L3_DOMAIN/MATERIALS
    py -3 C:\PRISM\scripts\skill_tree_navigator.py --find "material"
    py -3 C:\PRISM\scripts\skill_tree_navigator.py --load-for "I need to work on Fanuc controller alarms"
    py -3 C:\PRISM\scripts\skill_tree_navigator.py --stats
"""

import json
import re
import sys
from pathlib import Path

TREE_REGISTRY = Path(r"C:\PRISM\data\coordination\SKILL_TREE_REGISTRY.json")
SKILL_TREE_ROOT = "/mnt/skills/user/"

def load_registry():
    with open(TREE_REGISTRY) as f:
        return json.load(f)

def list_tree(registry):
    """List entire tree structure."""
    print("=" * 70)
    print("PRISM SKILL TREE - 120 Skills | 5 Levels | 20 Branches")
    print("=" * 70)
    
    tree = registry["tree"]
    
    for level_name, level_data in tree.items():
        if level_name.startswith("L"):
            desc = level_data.get("description", "")
            policy = level_data.get("load_policy", "")
            
            if "sub_branches" in level_data:
                total = level_data.get("total_count", 0)
                print(f"\n{level_name}/ ({total} skills) - {policy}")
                print(f"  {desc}")
                for branch_name, branch_data in level_data["sub_branches"].items():
                    count = branch_data.get("count", 0)
                    print(f"    ├── {branch_name}/ ({count} skills)")
            else:
                count = level_data.get("count", 0)
                print(f"\n{level_name}/ ({count} skills) - {policy}")
                print(f"  {desc}")

def list_branch(registry, branch_path):
    """List skills in a specific branch."""
    tree = registry["tree"]
    
    parts = branch_path.split("/")
    
    if len(parts) == 1:
        # Top-level branch (L0_CORE, L1_COGNITIVE, L4_REFERENCE)
        if parts[0] in tree:
            branch = tree[parts[0]]
            skills = branch.get("skills", [])
            print(f"\n{branch_path}/ ({len(skills)} skills)")
            print("-" * 50)
            for skill in skills:
                print(f"  {skill}")
    elif len(parts) == 2:
        # Sub-branch (L2_WORKFLOW/SP_DEBUG, L3_DOMAIN/MATERIALS)
        level = parts[0]
        sub = parts[1]
        if level in tree and "sub_branches" in tree[level]:
            if sub in tree[level]["sub_branches"]:
                branch = tree[level]["sub_branches"][sub]
                skills = branch.get("skills", [])
                triggers = branch.get("triggers", [])
                print(f"\n{branch_path}/ ({len(skills)} skills)")
                print(f"Triggers: {', '.join(triggers)}")
                print("-" * 50)
                for skill in skills:
                    print(f"  {skill}")
            else:
                print(f"Sub-branch not found: {sub}")
        else:
            print(f"Level not found or has no sub-branches: {level}")
    else:
        print(f"Invalid branch path: {branch_path}")

def find_skills(registry, query):
    """Find skills matching a query."""
    tree = registry["tree"]
    matches = []
    query_lower = query.lower()
    
    def search_skills(skills, branch_path):
        for skill in skills:
            if query_lower in skill.lower():
                matches.append((skill, branch_path))
    
    for level_name, level_data in tree.items():
        if not level_name.startswith("L"):
            continue
            
        if "sub_branches" in level_data:
            for branch_name, branch_data in level_data["sub_branches"].items():
                search_skills(branch_data.get("skills", []), f"{level_name}/{branch_name}")
        else:
            search_skills(level_data.get("skills", []), level_name)
    
    print(f"\nSkills matching '{query}': {len(matches)} found")
    print("-" * 50)
    for skill, branch in matches:
        print(f"  {skill}")
        print(f"    └── {branch}")
    
    return matches

def load_for_task(registry, task_description):
    """Determine which branches to load for a given task."""
    tree = registry["tree"]
    branches_to_load = []
    
    # Always load L0_CORE
    branches_to_load.append(("L0_CORE", 15, "ALWAYS"))
    
    # Check complexity indicators for L1_COGNITIVE
    complexity_indicators = ["complex", "multi", "swarm", "optimize", "coordinate", "advanced"]
    if any(ind in task_description.lower() for ind in complexity_indicators):
        branches_to_load.append(("L1_COGNITIVE", 8, "COMPLEX_TASK"))
    
    # Check L2_WORKFLOW triggers
    for branch_name, branch_data in tree["L2_WORKFLOW"]["sub_branches"].items():
        triggers = branch_data.get("triggers", [])
        if any(t.lower() in task_description.lower() for t in triggers):
            branches_to_load.append((f"L2_WORKFLOW/{branch_name}", branch_data["count"], "TRIGGER_MATCH"))
    
    # Check L3_DOMAIN triggers
    for branch_name, branch_data in tree["L3_DOMAIN"]["sub_branches"].items():
        triggers = branch_data.get("triggers", [])
        if any(t.lower() in task_description.lower() for t in triggers):
            branches_to_load.append((f"L3_DOMAIN/{branch_name}", branch_data["count"], "TRIGGER_MATCH"))
    
    total_skills = sum(b[1] for b in branches_to_load)
    
    print(f"\nTask: \"{task_description}\"")
    print("=" * 70)
    print(f"Branches to load: {len(branches_to_load)} | Total skills: {total_skills}")
    print("-" * 70)
    
    for branch, count, reason in branches_to_load:
        print(f"  ✓ {branch}/ ({count} skills) - {reason}")
    
    return branches_to_load

def show_stats(registry):
    """Show tree statistics."""
    tree = registry["tree"]
    
    print("\n" + "=" * 70)
    print("PRISM SKILL TREE STATISTICS")
    print("=" * 70)
    
    total_skills = 0
    level_stats = []
    
    for level_name, level_data in tree.items():
        if not level_name.startswith("L"):
            continue
            
        if "sub_branches" in level_data:
            count = level_data.get("total_count", 0)
            branches = len(level_data["sub_branches"])
            level_stats.append((level_name, count, branches))
        else:
            count = level_data.get("count", 0)
            level_stats.append((level_name, count, 1))
        
        total_skills += count
    
    print(f"\n{'Level':<20} {'Skills':>10} {'Branches':>10}")
    print("-" * 42)
    
    total_branches = 0
    for level, skills, branches in level_stats:
        print(f"{level:<20} {skills:>10} {branches:>10}")
        total_branches += branches
    
    print("-" * 42)
    print(f"{'TOTAL':<20} {total_skills:>10} {total_branches:>10}")
    
    print(f"\nPolicy: {registry.get('policy', 'MAXIMUM_UTILIZATION')}")
    print(f"Version: {registry.get('version', '1.0')}")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    registry = load_registry()
    
    cmd = sys.argv[1]
    
    if cmd == "--list":
        list_tree(registry)
    elif cmd == "--branch" and len(sys.argv) > 2:
        list_branch(registry, sys.argv[2])
    elif cmd == "--find" and len(sys.argv) > 2:
        find_skills(registry, sys.argv[2])
    elif cmd == "--load-for" and len(sys.argv) > 2:
        task = " ".join(sys.argv[2:])
        load_for_task(registry, task)
    elif cmd == "--stats":
        show_stats(registry)
    else:
        print(__doc__)

if __name__ == "__main__":
    main()
