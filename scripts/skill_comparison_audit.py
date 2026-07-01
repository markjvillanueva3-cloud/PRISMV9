#!/usr/bin/env python3
"""
PRISM Skill Comparison Audit
Compares container skills vs C:\PRISM\skills to identify:
1. Skills only in container
2. Skills only in C:\PRISM
3. Skills in both - compare sizes/versions
4. Stub skills (512B) that need replacement
"""

import os
import json
from pathlib import Path
from datetime import datetime

# Paths
CONTAINER_SKILLS = r"C:\Users\Admin.DIGITALSTORM-PC\container_skills_snapshot.json"  # We'll create this
CPRISM_SKILLS = r"C:\PRISM\skills"
OUTPUT_FILE = r"C:\PRISM\docs\SKILL_COMPARISON_AUDIT.json"
REPORT_FILE = r"C:\PRISM\docs\SKILL_COMPARISON_REPORT.md"

def scan_cprism_skills():
    """Scan C:\PRISM\skills for all skill folders with SKILL.md"""
    skills = {}
    skills_path = Path(CPRISM_SKILLS)
    
    # Direct prism-* folders
    for folder in skills_path.iterdir():
        if folder.is_dir() and folder.name.startswith('prism-'):
            skill_file = folder / "SKILL.md"
            if skill_file.exists():
                stat = skill_file.stat()
                skills[folder.name] = {
                    "path": str(skill_file),
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "location": "root"
                }
    
    # Level folders (level0-always-on, level1-cognitive, etc.)
    for level_folder in skills_path.iterdir():
        if level_folder.is_dir() and level_folder.name.startswith('level'):
            for skill_folder in level_folder.iterdir():
                if skill_folder.is_dir() and skill_folder.name.startswith('prism-'):
                    skill_file = skill_folder / "SKILL.md"
                    if skill_file.exists():
                        stat = skill_file.stat()
                        # Only add if not already present or if this one is larger
                        if skill_folder.name not in skills or stat.st_size > skills[skill_folder.name]["size"]:
                            skills[skill_folder.name] = {
                                "path": str(skill_file),
                                "size": stat.st_size,
                                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                "location": level_folder.name
                            }
    
    # Unclassified folder
    unclassified = skills_path / "unclassified"
    if unclassified.exists():
        for skill_folder in unclassified.iterdir():
            if skill_folder.is_dir() and skill_folder.name.startswith('prism-'):
                skill_file = skill_folder / "SKILL.md"
                if skill_file.exists():
                    stat = skill_file.stat()
                    if skill_folder.name not in skills or stat.st_size > skills[skill_folder.name]["size"]:
                        skills[skill_folder.name] = {
                            "path": str(skill_file),
                            "size": stat.st_size,
                            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            "location": "unclassified"
                        }
    
    return skills

def main():
    print("PRISM Skill Comparison Audit")
    print("=" * 50)
    
    # Container skills (hardcoded from the listing we saw)
    container_skills = {
        "prism-agent-selector": {"size": 512, "status": "stub"},
        "prism-algorithm-selector": {"size": 512, "status": "stub"},
        "prism-all-skills": {"size": 7168, "status": "full"},
        "prism-anti-regression": {"size": 36864, "status": "full"},
        "prism-api-contracts": {"size": 186368, "status": "full"},
        "prism-auditor": {"size": 512, "status": "stub"},
        "prism-category-defaults": {"size": 1024, "status": "small"},
        "prism-claude-code-bridge": {"size": 512, "status": "stub"},
        "prism-code-complete-integration": {"size": 19456, "status": "full"},
        "prism-code-master": {"size": 20480, "status": "full"},
        "prism-code-perfection": {"size": 512, "status": "stub"},
        "prism-codebase-packaging": {"size": 17408, "status": "full"},
        "prism-coding-patterns": {"size": 512, "status": "stub"},
        "prism-combination-engine": {"size": 3584, "status": "small"},
        "prism-consumer-mapper": {"size": 512, "status": "stub"},
        "prism-context-dna": {"size": 512, "status": "stub"},
        "prism-context-pressure": {"size": 512, "status": "stub"},
        "prism-controller-quick-ref": {"size": 9216, "status": "full"},
        "prism-debugging": {"size": 512, "status": "stub"},
        "prism-deep-learning": {"size": 9728, "status": "full"},
        "prism-dependency-graph": {"size": 512, "status": "stub"},
        "prism-derivation-helpers": {"size": 512, "status": "stub"},
        "prism-dev-utilities": {"size": 12288, "status": "full"},
        "prism-development": {"size": 2048, "status": "small"},
        "prism-error-catalog": {"size": 124928, "status": "full"},
        "prism-error-recovery": {"size": 512, "status": "stub"},
        "prism-expert-cad-expert": {"size": 512, "status": "stub"},
        "prism-expert-cam-programmer": {"size": 512, "status": "stub"},
        "prism-expert-master": {"size": 12288, "status": "full"},
        "prism-expert-master-machinist": {"size": 512, "status": "stub"},
        "prism-expert-materials-scientist": {"size": 512, "status": "stub"},
        "prism-expert-mathematics": {"size": 512, "status": "stub"},
        "prism-expert-mechanical-engineer": {"size": 512, "status": "stub"},
        "prism-expert-post-processor": {"size": 512, "status": "stub"},
        "prism-expert-quality-control": {"size": 512, "status": "stub"},
        "prism-expert-quality-manager": {"size": 512, "status": "stub"},
        "prism-expert-thermodynamics": {"size": 512, "status": "stub"},
        "prism-extraction-index": {"size": 512, "status": "stub"},
        "prism-extractor": {"size": 512, "status": "stub"},
        "prism-fanuc-programming": {"size": 512, "status": "stub"},
        "prism-formal-definitions": {"size": 512, "status": "stub"},
        "prism-formula-evolution": {"size": 6144, "status": "full"},
        "prism-gcode-reference": {"size": 512, "status": "stub"},
        "prism-heidenhain-programming": {"size": 512, "status": "stub"},
        "prism-hierarchy-manager": {"size": 512, "status": "stub"},
        "prism-hook-system": {"size": 11264, "status": "full"},
        "prism-knowledge-base": {"size": 1024, "status": "small"},
        "prism-knowledge-master": {"size": 12288, "status": "full"},
        "prism-large-file-writer": {"size": 512, "status": "stub"},
        "prism-life-safety-mindset": {"size": 8704, "status": "full"},
        "prism-mandatory-microsession": {"size": 5120, "status": "full"},
        "prism-manufacturing-tables": {"size": 142336, "status": "full"},
        "prism-master-equation": {"size": 512, "status": "stub"},
        "prism-material-enhancer": {"size": 36864, "status": "full"},
        "prism-material-lookup": {"size": 38912, "status": "full"},
        "prism-material-physics": {"size": 68608, "status": "full"},
        "prism-material-schema": {"size": 54272, "status": "full"},
        "prism-material-template": {"size": 1536, "status": "small"},
        "prism-material-templates": {"size": 2048, "status": "small"},
        "prism-material-validator": {"size": 2048, "status": "small"},
        "prism-mathematical-planning": {"size": 11264, "status": "full"},
        "prism-maximum-completeness": {"size": 14336, "status": "full"},
        "prism-monolith-extractor": {"size": 74752, "status": "full"},
        "prism-monolith-index": {"size": 74752, "status": "full"},
        "prism-monolith-navigator": {"size": 51200, "status": "full"},
        "prism-monolith-navigator-sp": {"size": 2048, "status": "small"},
        "prism-physics-formulas": {"size": 512, "status": "stub"},
        "prism-physics-reference": {"size": 512, "status": "stub"},
        "prism-planning": {"size": 512, "status": "stub"},
        "prism-post-processor-reference": {"size": 512, "status": "stub"},
        "prism-predictive-thinking": {"size": 17408, "status": "full"},
        "prism-process-optimizer": {"size": 512, "status": "stub"},
        "prism-product-calculators": {"size": 512, "status": "stub"},
        "prism-python-tools": {"size": 1536, "status": "small"},
        "prism-quality-gates": {"size": 512, "status": "stub"},
        "prism-quality-master": {"size": 23552, "status": "full"},
        "prism-quick-start": {"size": 512, "status": "stub"},
        "prism-reasoning-engine": {"size": 512, "status": "stub"},
        "prism-resource-optimizer": {"size": 512, "status": "stub"},
        "prism-review": {"size": 512, "status": "stub"},
        "prism-safety-framework": {"size": 512, "status": "stub"},
        "prism-session-buffer": {"size": 512, "status": "stub"},
        "prism-session-handoff": {"size": 512, "status": "stub"},
        "prism-session-master": {"size": 43008, "status": "full"},
        "prism-siemens-programming": {"size": 512, "status": "stub"},
        "prism-skill-orchestrator": {"size": 13312, "status": "full"},
        "prism-sp-brainstorm": {"size": 45056, "status": "full"},
        "prism-sp-debugging": {"size": 109568, "status": "full"},
        "prism-sp-execution": {"size": 88064, "status": "full"},
        "prism-sp-handoff": {"size": 77824, "status": "full"},
        "prism-sp-planning": {"size": 165888, "status": "full"},
        "prism-sp-review-quality": {"size": 97280, "status": "full"},
        "prism-sp-review-spec": {"size": 60416, "status": "full"},
        "prism-sp-verification": {"size": 81920, "status": "full"},
        "prism-state-manager": {"size": 512, "status": "stub"},
        "prism-swarm-coordinator": {"size": 2048, "status": "small"},
        "prism-swarm-orchestrator": {"size": 1536, "status": "small"},
        "prism-synergy-calculator": {"size": 512, "status": "stub"},
        "prism-task-continuity": {"size": 512, "status": "stub"},
        "prism-tdd": {"size": 1024, "status": "small"},
        "prism-tdd-enhanced": {"size": 20480, "status": "full"},
        "prism-tool-holder-schema": {"size": 8704, "status": "full"},
        "prism-tool-selector": {"size": 512, "status": "stub"},
        "prism-uncertainty-propagation": {"size": 6144, "status": "full"},
        "prism-unit-converter": {"size": 512, "status": "stub"},
        "prism-universal-formulas": {"size": 512, "status": "stub"},
        "prism-utilization": {"size": 512, "status": "stub"},
        "prism-validator": {"size": 10240, "status": "full"},
        "prism-verification": {"size": 512, "status": "stub"},
        "prism-wiring-templates": {"size": 512, "status": "stub"},
    }
    
    # Scan C:\PRISM\skills
    cprism_skills = scan_cprism_skills()
    
    print(f"Container skills: {len(container_skills)}")
    print(f"C:\\PRISM\\skills: {len(cprism_skills)}")
    
    # Analysis
    only_container = set(container_skills.keys()) - set(cprism_skills.keys())
    only_cprism = set(cprism_skills.keys()) - set(container_skills.keys())
    in_both = set(container_skills.keys()) & set(cprism_skills.keys())
    
    # Detailed comparison
    comparison = {
        "audit_date": datetime.now().isoformat(),
        "summary": {
            "container_total": len(container_skills),
            "cprism_total": len(cprism_skills),
            "only_in_container": len(only_container),
            "only_in_cprism": len(only_cprism),
            "in_both": len(in_both),
            "container_stubs": sum(1 for s in container_skills.values() if s["status"] == "stub"),
        },
        "only_in_container": list(only_container),
        "only_in_cprism": list(only_cprism),
        "skills_comparison": {}
    }
    
    # Compare skills in both
    needs_update = []
    container_newer = []
    same_or_similar = []
    
    for skill in sorted(in_both):
        container_size = container_skills[skill]["size"]
        cprism_size = cprism_skills[skill]["size"]
        
        comp = {
            "container_size": container_size,
            "cprism_size": cprism_size,
            "container_status": container_skills[skill]["status"],
            "cprism_path": cprism_skills[skill]["path"],
            "cprism_location": cprism_skills[skill]["location"],
        }
        
        # Determine action
        if container_size == 512 and cprism_size > 512:
            comp["action"] = "REPLACE_STUB"
            comp["reason"] = f"Container is stub ({container_size}B), C: has full ({cprism_size}B)"
            needs_update.append(skill)
        elif cprism_size > container_size * 1.5:  # C: is significantly larger
            comp["action"] = "UPDATE_FROM_CPRISM"
            comp["reason"] = f"C: version is {cprism_size/container_size:.1f}x larger"
            needs_update.append(skill)
        elif container_size > cprism_size * 1.5:  # Container is significantly larger
            comp["action"] = "KEEP_CONTAINER"
            comp["reason"] = f"Container is {container_size/cprism_size:.1f}x larger"
            container_newer.append(skill)
        else:
            comp["action"] = "VERIFY_SAME"
            comp["reason"] = "Similar sizes, verify content"
            same_or_similar.append(skill)
        
        comparison["skills_comparison"][skill] = comp
    
    comparison["summary"]["needs_update_from_cprism"] = len(needs_update)
    comparison["summary"]["container_newer"] = len(container_newer)
    comparison["summary"]["verify_same"] = len(same_or_similar)
    comparison["needs_update"] = needs_update
    comparison["container_newer"] = container_newer
    comparison["verify_same"] = same_or_similar
    
    # Save JSON
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(comparison, f, indent=2)
    
    print(f"\nJSON saved to: {OUTPUT_FILE}")
    
    # Generate report
    report = f"""# PRISM Skill Comparison Audit Report
## Generated: {datetime.now().isoformat()}

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Container Skills | {comparison['summary']['container_total']} |
| C:\\PRISM\\skills | {comparison['summary']['cprism_total']} |
| Container Stubs (512B) | {comparison['summary']['container_stubs']} |
| Skills Only in Container | {comparison['summary']['only_in_container']} |
| Skills Only in C:\\PRISM | {comparison['summary']['only_in_cprism']} |
| Skills in Both | {comparison['summary']['in_both']} |
| **Need Update from C:\\PRISM** | **{comparison['summary']['needs_update_from_cprism']}** |
| Container Has Newer | {comparison['summary']['container_newer']} |
| Similar (Verify) | {comparison['summary']['verify_same']} |

---

## ACTION REQUIRED: Skills to Update from C:\\PRISM ({len(needs_update)})

These container stubs should be replaced with full C:\\PRISM versions:

| Skill | Container | C:\\PRISM | Action |
|-------|-----------|-----------|--------|
"""
    
    for skill in sorted(needs_update):
        comp = comparison["skills_comparison"][skill]
        report += f"| {skill} | {comp['container_size']}B | {comp['cprism_size']}B | {comp['action']} |\n"
    
    report += f"""

---

## Skills Only in C:\\PRISM (Add to Container): {len(only_cprism)}

"""
    for skill in sorted(only_cprism):
        info = cprism_skills[skill]
        report += f"- **{skill}** ({info['size']}B) - {info['location']}\n"
    
    report += f"""

---

## Skills Only in Container (Keep): {len(only_container)}

"""
    for skill in sorted(only_container):
        info = container_skills[skill]
        report += f"- **{skill}** ({info['size']}B) - {info['status']}\n"
    
    report += f"""

---

## Container Has Newer Version ({len(container_newer)})

These skills have larger versions in the container - may need to sync BACK to C:\\PRISM:

"""
    for skill in sorted(container_newer):
        comp = comparison["skills_comparison"][skill]
        report += f"- **{skill}**: Container {comp['container_size']}B vs C: {comp['cprism_size']}B\n"
    
    report += f"""

---

## Similar Versions (Verify Content): {len(same_or_similar)}

"""
    for skill in sorted(same_or_similar):
        comp = comparison["skills_comparison"][skill]
        report += f"- **{skill}**: Container {comp['container_size']}B vs C: {comp['cprism_size']}B\n"
    
    # Save report
    with open(REPORT_FILE, 'w') as f:
        f.write(report)
    
    print(f"Report saved to: {REPORT_FILE}")
    
    return comparison

if __name__ == "__main__":
    main()
