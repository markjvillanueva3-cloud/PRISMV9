"""
PRISM Skill Synchronization and Path Unification Script
========================================================
Syncs skills across all locations and creates unified path mappings.

Locations:
1. /mnt/skills/user/ - 50 skills in Claude's container (fast access via view tool)
2. C:\PRISM\skills-consolidated - Production skills (filesystem access)
3. C:\PRISM REBUILD...\_SKILLS - Development skills (filesystem access)
4. C:\PRISM\skills\level*-* - Level-organized skills (filesystem access)
"""

import json
import os
from pathlib import Path
from datetime import datetime

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
PRISM_REBUILD = Path(r"C:\\PRISM")
COORDINATION_DIR = PRISM_ROOT / "data" / "coordination"

# Ensure directories exist
COORDINATION_DIR.mkdir(parents=True, exist_ok=True)

# Skills uploaded to Claude's container (50 skills)
CONTAINER_SKILLS = [
    "prism-all-skills",
    "prism-algorithm-selector",
    "prism-anomaly-detector",
    "prism-anti-regression",
    "prism-api-contracts",
    "prism-attention-focus",
    "prism-causal-reasoning",
    "prism-code-complete-integration",
    "prism-code-master",
    "prism-code-perfection",
    "prism-codebase-packaging",
    "prism-coding-patterns",
    "prism-cognitive-core",
    "prism-controller-quick-ref",
    "prism-debugging",
    "prism-deep-learning",
    "prism-dev-utilities",
    "prism-error-catalog",
    "prism-error-recovery",
    "prism-expert-master",
    "prism-extraction-orchestrator",
    "prism-fanuc-programming",
    "prism-formula-evolution",
    "prism-gcode-reference",
    "prism-heidenhain-programming",
    "prism-hook-system",
    "prism-knowledge-master",
    "prism-life-safety-mindset",
    "prism-mandatory-microsession",
    "prism-manufacturing-tables",
    "prism-master-equation",
    "prism-material-enhancer",
    "prism-material-lookup",
    "prism-material-physics",
    "prism-material-schema",
    "prism-material-validator",
    "prism-mathematical-planning",
    "prism-maximum-completeness",
    "prism-memory-augmentation",
    "prism-monolith-extractor",
    "prism-monolith-index",
    "prism-monolith-navigator",
    "prism-predictive-thinking",
    "prism-process-optimizer",
    "prism-prompt-engineering",
    "prism-quality-master",
    "prism-quick-start",
    "prism-reasoning-engine",
    "prism-safety-framework",
    "prism-self-reflection",
    "prism-session-buffer",
    "prism-session-master",
    "prism-siemens-programming",
    "prism-skill-orchestrator",
    "prism-sp-brainstorm",
    "prism-sp-debugging",
    "prism-sp-execution",
    "prism-sp-handoff",
    "prism-sp-planning",
    "prism-sp-review-quality",
    "prism-sp-review-spec",
    "prism-sp-verification",
    "prism-state-manager",
    "prism-task-continuity",
    "prism-tdd",
    "prism-tdd-enhanced",
    "prism-tool-holder-schema",
    "prism-uncertainty-propagation",
    "prism-universal-formulas",
    "prism-validator",
    "prism-wiring-templates",
]

def inventory_all_skills():
    """Inventory all skills across all locations"""
    all_skills = {}
    
    # 1. Skills in C:\PRISM\skills-consolidated
    consolidated_path = PRISM_ROOT / "skills-consolidated"
    if consolidated_path.exists():
        for item in consolidated_path.iterdir():
            if item.is_dir() and item.name.startswith("prism-"):
                skill_file = item / "SKILL.md"
                if skill_file.exists():
                    all_skills[item.name] = {
                        "primary_path": str(item),
                        "skill_file": str(skill_file),
                        "size_bytes": skill_file.stat().st_size,
                        "location": "PRISM_CONSOLIDATED"
                    }
    
    # 2. Skills in C:\PRISM REBUILD...\_SKILLS
    rebuild_path = PRISM_REBUILD / "_SKILLS"
    if rebuild_path.exists():
        for item in rebuild_path.iterdir():
            if item.is_dir() and item.name.startswith("prism-"):
                skill_file = item / "SKILL.md"
                if skill_file.exists():
                    if item.name not in all_skills:
                        all_skills[item.name] = {
                            "primary_path": str(item),
                            "skill_file": str(skill_file),
                            "size_bytes": skill_file.stat().st_size,
                            "location": "PRISM_REBUILD"
                        }
                    else:
                        # Add as alternate path
                        all_skills[item.name]["alternate_path"] = str(item)
    
    # 3. Skills in C:\PRISM\skills (level-organized)
    skills_path = PRISM_ROOT / "skills"
    if skills_path.exists():
        for level_dir in skills_path.iterdir():
            if level_dir.is_dir() and level_dir.name.startswith("level"):
                for item in level_dir.iterdir():
                    if item.is_dir() and item.name.startswith("prism-"):
                        skill_file = item / "SKILL.md"
                        if skill_file.exists():
                            if item.name not in all_skills:
                                all_skills[item.name] = {
                                    "primary_path": str(item),
                                    "skill_file": str(skill_file),
                                    "size_bytes": skill_file.stat().st_size,
                                    "location": f"PRISM_SKILLS/{level_dir.name}"
                                }
    
    # 4. Mark skills that are in Claude's container
    for skill_name in CONTAINER_SKILLS:
        if skill_name in all_skills:
            all_skills[skill_name]["in_container"] = True
            all_skills[skill_name]["container_path"] = f"/mnt/skills/user/{skill_name}/SKILL.md"
        else:
            # Skill only in container, not on disk
            all_skills[skill_name] = {
                "primary_path": None,
                "skill_file": None,
                "size_bytes": 0,
                "location": "CONTAINER_ONLY",
                "in_container": True,
                "container_path": f"/mnt/skills/user/{skill_name}/SKILL.md"
            }
    
    return all_skills

def create_skill_access_map(all_skills):
    """Create a map showing how to access each skill"""
    access_map = {
        "metadata": {
            "version": "1.0.0",
            "created": datetime.now().isoformat(),
            "total_skills": len(all_skills),
            "container_skills": len(CONTAINER_SKILLS),
            "filesystem_only_skills": len([s for s in all_skills if not all_skills[s].get("in_container", False)])
        },
        "access_priority": {
            "description": "Order of access attempts for each skill",
            "order": [
                "1. Claude container (/mnt/skills/user/) - use view tool",
                "2. C:\\PRISM\\skills-consolidated - use Filesystem:read_file",
                "3. C:\\PRISM REBUILD...\\_SKILLS - use Filesystem:read_file"
            ]
        },
        "container_skills": {
            skill: {
                "container_path": all_skills[skill].get("container_path"),
                "filesystem_path": all_skills[skill].get("primary_path"),
                "access_method": "view tool (fast)"
            }
            for skill in CONTAINER_SKILLS if skill in all_skills
        },
        "filesystem_only_skills": {
            name: {
                "path": data["primary_path"],
                "location": data["location"],
                "access_method": "Filesystem:read_file"
            }
            for name, data in all_skills.items()
            if not data.get("in_container", False) and data["primary_path"]
        }
    }
    return access_map

def sync_missing_skills():
    """Sync skills from PRISM REBUILD to PRISM consolidated"""
    consolidated_path = PRISM_ROOT / "skills-consolidated"
    rebuild_path = PRISM_REBUILD / "_SKILLS"
    
    synced = []
    
    if rebuild_path.exists():
        for item in rebuild_path.iterdir():
            if item.is_dir() and item.name.startswith("prism-"):
                target_dir = consolidated_path / item.name
                if not target_dir.exists():
                    # Copy skill to consolidated
                    target_dir.mkdir(parents=True, exist_ok=True)
                    src_skill = item / "SKILL.md"
                    if src_skill.exists():
                        dst_skill = target_dir / "SKILL.md"
                        dst_skill.write_text(src_skill.read_text(encoding='utf-8'), encoding='utf-8')
                        synced.append(item.name)
    
    return synced

def update_resource_registry(all_skills):
    """Update RESOURCE_REGISTRY.json with correct skill paths"""
    registry_path = COORDINATION_DIR / "RESOURCE_REGISTRY.json"
    
    if registry_path.exists():
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
    else:
        registry = {"resourceRegistry": {"resources": {"skills": {"items": {}}}}}
    
    # Update skill paths
    skill_items = registry.get("resourceRegistry", {}).get("resources", {}).get("skills", {}).get("items", {})
    
    for skill_name, data in all_skills.items():
        if skill_name in skill_items:
            # Update existing entry
            if data.get("in_container"):
                skill_items[skill_name]["container_path"] = data["container_path"]
                skill_items[skill_name]["access_method"] = "container"
            if data.get("primary_path"):
                skill_items[skill_name]["path"] = data["primary_path"].replace("\\", "\\\\")
                skill_items[skill_name]["skill_file"] = data["skill_file"].replace("\\", "\\\\") if data.get("skill_file") else None
        else:
            # Add new entry
            skill_items[skill_name] = {
                "id": f"SKILL-{len(skill_items)+1:03d}",
                "type": "skill",
                "status": "ACTIVE",
                "path": data["primary_path"].replace("\\", "\\\\") if data.get("primary_path") else None,
                "skill_file": data["skill_file"].replace("\\", "\\\\") if data.get("skill_file") else None,
                "size_bytes": data.get("size_bytes", 0),
                "location": data.get("location", "UNKNOWN"),
                "in_container": data.get("in_container", False),
                "container_path": data.get("container_path"),
                "access_method": "container" if data.get("in_container") else "filesystem"
            }
    
    # Update counts
    registry["resourceRegistry"]["resources"]["skills"]["count"] = len(skill_items)
    registry["resourceRegistry"]["resources"]["skills"]["items"] = skill_items
    registry["resourceRegistry"]["metadata"]["lastUpdated"] = datetime.now().isoformat()
    registry["resourceRegistry"]["metadata"]["totalResources"] = sum(
        registry["resourceRegistry"]["resources"][cat].get("count", 0)
        for cat in registry["resourceRegistry"]["resources"]
    )
    
    # Save updated registry
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    
    return len(skill_items)

def main():
    print("=" * 70)
    print("PRISM SKILL SYNCHRONIZATION AND PATH UNIFICATION")
    print("=" * 70)
    
    # 1. Inventory all skills
    print("\n[1] Inventorying all skills across all locations...")
    all_skills = inventory_all_skills()
    print(f"    Found {len(all_skills)} unique skills")
    
    # 2. Sync missing skills
    print("\n[2] Syncing missing skills to consolidated directory...")
    synced = sync_missing_skills()
    if synced:
        print(f"    Synced {len(synced)} new skills: {synced[:5]}{'...' if len(synced)>5 else ''}")
    else:
        print("    No new skills to sync")
    
    # Re-inventory after sync
    all_skills = inventory_all_skills()
    
    # 3. Create skill access map
    print("\n[3] Creating SKILL_ACCESS_MAP.json...")
    access_map = create_skill_access_map(all_skills)
    access_map_path = COORDINATION_DIR / "SKILL_ACCESS_MAP.json"
    with open(access_map_path, 'w', encoding='utf-8') as f:
        json.dump(access_map, f, indent=2)
    print(f"    Saved to {access_map_path}")
    
    # 4. Update resource registry
    print("\n[4] Updating RESOURCE_REGISTRY.json with correct paths...")
    skill_count = update_resource_registry(all_skills)
    print(f"    Updated registry with {skill_count} skills")
    
    # 5. Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    container_count = len([s for s in all_skills if all_skills[s].get("in_container")])
    fs_only = len([s for s in all_skills if not all_skills[s].get("in_container")])
    print(f"Total Skills:          {len(all_skills)}")
    print(f"In Claude Container:   {container_count}")
    print(f"Filesystem Only:       {fs_only}")
    print(f"\nFiles Updated:")
    print(f"  - {COORDINATION_DIR / 'SKILL_ACCESS_MAP.json'}")
    print(f"  - {COORDINATION_DIR / 'RESOURCE_REGISTRY.json'}")
    
    # List skills NOT in container
    print(f"\n[!] Skills NOT in Claude's container ({fs_only}):")
    for name, data in sorted(all_skills.items()):
        if not data.get("in_container"):
            print(f"    - {name} ({data.get('location', 'UNKNOWN')})")
    
    return all_skills

if __name__ == "__main__":
    main()
