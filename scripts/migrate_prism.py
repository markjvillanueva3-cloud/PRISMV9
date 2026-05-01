"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM MIGRATION TOOL v1.0                                 ║
║══════════════════════════════════════════════════════════════════════════════║
║  Purpose: Migrate from old folder structure to clean C:\PRISM               ║
║  Lives at stake - Maximum thoroughness required                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import shutil
import json
from pathlib import Path
from datetime import datetime

# =============================================================================
# PATHS
# =============================================================================

OLD_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
NEW_ROOT = Path(r"C:\PRISM")

# =============================================================================
# SKILL CLASSIFICATION
# =============================================================================

SKILL_LEVELS = {
    # LEVEL 0: Always-On (6 skills)
    "level0-always-on": [
        "prism-life-safety-mindset",
        "prism-mandatory-microsession", 
        "prism-maximum-completeness",
        "prism-predictive-thinking",
        "prism-deep-learning",
        "prism-skill-orchestrator",
    ],
    
    # LEVEL 1: Cognitive Foundation (6 skills) - NEW from recent work
    "level1-cognitive": [
        "prism-universal-formulas",
        "prism-reasoning-engine",
        "prism-code-perfection",
        "prism-process-optimizer",
        "prism-safety-framework",
        "prism-master-equation",
    ],
    
    # LEVEL 2: Core Workflow (8 skills)
    "level2-workflow": [
        "prism-sp-brainstorm",
        "prism-sp-planning",
        "prism-sp-execution",
        "prism-sp-review-spec",
        "prism-sp-review-quality",
        "prism-sp-debugging",
        "prism-sp-verification",
        "prism-sp-handoff",
    ],
    
    # LEVEL 3: Domain Skills
    "level3-domain": [
        # Monolith (4)
        "prism-monolith-index",
        "prism-monolith-extractor",
        "prism-monolith-navigator",
        "prism-codebase-packaging",
        # Materials (5)
        "prism-material-schema",
        "prism-material-physics",
        "prism-material-lookup",
        "prism-material-validator",
        "prism-material-enhancer",
        # Masters (7)
        "prism-session-master",
        "prism-quality-master",
        "prism-code-master",
        "prism-knowledge-master",
        "prism-expert-master",
        "prism-controller-quick-ref",
        "prism-dev-utilities",
        # Quality (2)
        "prism-tdd-enhanced",
        "prism-validator",
    ],
    
    # LEVEL 4: Reference Skills (10+)
    "level4-reference": [
        "prism-api-contracts",
        "prism-error-catalog",
        "prism-manufacturing-tables",
        "prism-wiring-templates",
        "prism-product-calculators",
        "prism-post-processor-reference",
        "prism-fanuc-programming",
        "prism-siemens-programming",
        "prism-heidenhain-programming",
        "prism-gcode-reference",
        # Expert roles
        "prism-expert-master-machinist",
        "prism-expert-materials-scientist",
        "prism-expert-cam-programmer",
        "prism-expert-mechanical-engineer",
        "prism-expert-thermodynamics",
        "prism-expert-quality-control",
        "prism-expert-post-processor",
        "prism-expert-cad-expert",
        "prism-expert-mathematics",
        "prism-expert-quality-manager",
    ],
}

# =============================================================================
# MIGRATION FUNCTIONS
# =============================================================================

def inventory_skills():
    """Inventory all skills in old location"""
    old_skills_dir = OLD_ROOT / "_SKILLS"
    skills_found = {}
    
    if old_skills_dir.exists():
        for item in old_skills_dir.iterdir():
            if item.is_dir() and item.name.startswith("prism-"):
                skill_file = item / "SKILL.md"
                if skill_file.exists():
                    size = skill_file.stat().st_size
                    with open(skill_file, 'r', encoding='utf-8') as f:
                        lines = len(f.readlines())
                    skills_found[item.name] = {
                        "path": str(item),
                        "size_bytes": size,
                        "lines": lines,
                        "level": None  # Will be classified
                    }
    
    # Classify skills
    for level, skills in SKILL_LEVELS.items():
        for skill in skills:
            if skill in skills_found:
                skills_found[skill]["level"] = level
    
    # Mark unclassified
    for skill in skills_found:
        if skills_found[skill]["level"] is None:
            skills_found[skill]["level"] = "unclassified"
    
    return skills_found


def migrate_skills(skills_inventory):
    """Copy skills to new structure organized by level"""
    old_skills_dir = OLD_ROOT / "_SKILLS"
    migrated = []
    
    for skill_name, info in skills_inventory.items():
        level = info["level"]
        old_path = Path(info["path"])
        new_level_dir = NEW_ROOT / "skills" / level
        new_skill_dir = new_level_dir / skill_name
        
        # Create directory and copy
        new_skill_dir.mkdir(parents=True, exist_ok=True)
        
        skill_file = old_path / "SKILL.md"
        if skill_file.exists():
            shutil.copy2(skill_file, new_skill_dir / "SKILL.md")
            migrated.append({
                "skill": skill_name,
                "level": level,
                "old_path": str(old_path),
                "new_path": str(new_skill_dir),
                "lines": info["lines"]
            })
    
    return migrated


def migrate_scripts():
    """Copy Python scripts to new location"""
    old_scripts = OLD_ROOT / "_SCRIPTS"
    new_scripts = NEW_ROOT / "scripts"
    
    critical_scripts = [
        "prism_unified_system_v4.py",
        "prism_orchestrator_v2.py", 
        "prism_api_worker.py",
        "prism_toolkit.py",
        "requirements.txt",
        "regression_checker.py",
        "skill_validator.py",
    ]
    
    migrated = []
    for script in critical_scripts:
        src = old_scripts / script
        if src.exists():
            shutil.copy2(src, new_scripts / script)
            migrated.append(script)
    
    # Copy subdirectories
    for subdir in ["core", "validation", "audit", "batch", "state"]:
        src_dir = old_scripts / subdir
        if src_dir.exists():
            dst_dir = new_scripts / subdir
            if dst_dir.exists():
                shutil.rmtree(dst_dir)
            shutil.copytree(src_dir, dst_dir)
            migrated.append(f"{subdir}/")
    
    return migrated


def migrate_data():
    """Copy essential data files"""
    migrated = []
    
    # Materials
    old_materials = OLD_ROOT / "EXTRACTED" / "materials"
    new_materials = NEW_ROOT / "data" / "materials"
    if old_materials.exists():
        for item in old_materials.iterdir():
            if item.is_dir():
                dst = new_materials / item.name
                if not dst.exists():
                    shutil.copytree(item, dst)
                    migrated.append(f"materials/{item.name}")
    
    # Machines
    old_machines = OLD_ROOT / "EXTRACTED" / "machines"
    new_machines = NEW_ROOT / "data" / "machines"
    if old_machines.exists():
        for item in old_machines.iterdir():
            if item.is_dir():
                dst = new_machines / item.name
                if not dst.exists():
                    shutil.copytree(item, dst)
                    migrated.append(f"machines/{item.name}")
    
    return migrated


def create_symlink_to_monolith():
    """Create symlink to monolith (don't copy 986K lines)"""
    old_monolith = OLD_ROOT / "_BUILD" / "PRISM_v8_89_002_TRUE_100_PERCENT"
    new_build = NEW_ROOT / "build"
    link_path = new_build / "monolith"
    
    if old_monolith.exists() and not link_path.exists():
        # On Windows, need admin rights for symlink, so just note the path
        with open(new_build / "MONOLITH_PATH.txt", 'w') as f:
            f.write(str(old_monolith))
        return str(old_monolith)
    return None


def copy_state_file():
    """Copy current state file"""
    old_state = OLD_ROOT / "CURRENT_STATE.json"
    new_state = NEW_ROOT / "state" / "CURRENT_STATE.json"
    
    if old_state.exists():
        shutil.copy2(old_state, new_state)
        return True
    return False


def run_migration():
    """Run full migration"""
    print("="*70)
    print("PRISM MIGRATION TOOL v1.0")
    print("="*70)
    print(f"\nSource: {OLD_ROOT}")
    print(f"Target: {NEW_ROOT}")
    print()
    
    # 1. Inventory skills
    print("\n[1/6] Inventorying skills...")
    skills = inventory_skills()
    print(f"  Found {len(skills)} skills")
    
    # 2. Migrate skills
    print("\n[2/6] Migrating skills...")
    migrated_skills = migrate_skills(skills)
    print(f"  Migrated {len(migrated_skills)} skills")
    
    # 3. Migrate scripts
    print("\n[3/6] Migrating scripts...")
    migrated_scripts = migrate_scripts()
    print(f"  Migrated {len(migrated_scripts)} scripts")
    
    # 4. Migrate data
    print("\n[4/6] Migrating data...")
    migrated_data = migrate_data()
    print(f"  Migrated {len(migrated_data)} data directories")
    
    # 5. Link monolith
    print("\n[5/6] Linking monolith...")
    monolith = create_symlink_to_monolith()
    print(f"  Monolith path: {monolith}")
    
    # 6. Copy state
    print("\n[6/6] Copying state file...")
    state_copied = copy_state_file()
    print(f"  State copied: {state_copied}")
    
    # Generate report
    report = {
        "timestamp": datetime.now().isoformat(),
        "source": str(OLD_ROOT),
        "target": str(NEW_ROOT),
        "skills_migrated": len(migrated_skills),
        "scripts_migrated": len(migrated_scripts),
        "data_migrated": len(migrated_data),
        "skill_details": migrated_skills,
        "script_details": migrated_scripts,
        "data_details": migrated_data,
    }
    
    report_path = NEW_ROOT / "state" / "migration_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n{'='*70}")
    print("MIGRATION COMPLETE")
    print(f"{'='*70}")
    print(f"\nReport saved to: {report_path}")
    
    return report


if __name__ == "__main__":
    run_migration()
