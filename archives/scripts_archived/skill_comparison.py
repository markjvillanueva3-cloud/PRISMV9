#!/usr/bin/env python3
"""
PRISM Skill Comparison Tool
Compares container skills vs C:\PRISM\skills to identify:
1. Skills only in container
2. Skills only in C:\PRISM\skills  
3. Skills in both - which is newer/larger
4. Stub skills (512B) that need content
"""

import os
import json
from pathlib import Path
from datetime import datetime

# Paths
CONTAINER_PATH = r"\\wsl.localhost\Claude\mnt\skills\user"  # Won't work from Windows
CPRISM_PATH = r"C:\PRISM\skills"
OUTPUT_PATH = r"C:\PRISM\docs\SKILL_COMPARISON_REPORT.json"

def get_skill_info(skill_path):
    """Get size and basic info about a skill"""
    skill_md = os.path.join(skill_path, "SKILL.md")
    if os.path.exists(skill_md):
        size = os.path.getsize(skill_md)
        mtime = os.path.getmtime(skill_md)
        return {
            "path": skill_md,
            "size": size,
            "size_kb": round(size / 1024, 1),
            "modified": datetime.fromtimestamp(mtime).isoformat(),
            "is_stub": size <= 600  # 512B + some tolerance
        }
    return None

def scan_skills(base_path):
    """Scan a directory for prism-* skill folders"""
    skills = {}
    if not os.path.exists(base_path):
        return skills
    
    for item in os.listdir(base_path):
        if item.startswith("prism-") and os.path.isdir(os.path.join(base_path, item)):
            info = get_skill_info(os.path.join(base_path, item))
            if info:
                skills[item] = info
    return skills

def main():
    print("Scanning C:\\PRISM\\skills...")
    cprism_skills = scan_skills(CPRISM_PATH)
    print(f"Found {len(cprism_skills)} skills in C:\\PRISM\\skills")
    
    # Output what we found
    report = {
        "scan_date": datetime.now().isoformat(),
        "cprism_skills_count": len(cprism_skills),
        "cprism_skills": cprism_skills,
        "stub_skills": [k for k, v in cprism_skills.items() if v.get("is_stub")],
        "full_skills": [k for k, v in cprism_skills.items() if not v.get("is_stub")],
        "by_size": sorted(cprism_skills.items(), key=lambda x: x[1]["size"], reverse=True)
    }
    
    # Print summary
    print(f"\nStub skills (<=600B): {len(report['stub_skills'])}")
    print(f"Full skills (>600B): {len(report['full_skills'])}")
    
    print("\n=== TOP 20 LARGEST SKILLS ===")
    for name, info in report["by_size"][:20]:
        print(f"  {info['size_kb']:>8.1f} KB  {name}")
    
    print("\n=== STUB SKILLS ===")
    for name in report["stub_skills"]:
        print(f"  {name}")
    
    # Save report
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\nReport saved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
