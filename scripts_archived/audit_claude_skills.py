#!/usr/bin/env python3
"""
Audit real skills for Claude development capabilities.
Focus: Context, Efficiency, Planning, Optimization, Learning
"""
import json
from pathlib import Path
from collections import defaultdict

PRISM_ROOT = Path("C:/PRISM")
SKILLS_DIRS = [
    PRISM_ROOT / "skills-consolidated",
    Path("/mnt/skills/user")
]

# Categories that matter for Claude's capabilities
PRIORITY_CATEGORIES = {
    "CONTEXT": "Context window management, compression, expansion",
    "SESSION": "Session continuity, handoff, recovery",
    "COGNITIVE": "Reasoning, planning, prediction",
    "AI_ML": "Learning, pattern recognition, optimization",
    "ALGORITHM": "Mathematical optimization, decision making",
    "QUALITY": "Validation, verification, scrutiny",
    "EFFICIENCY": "Token usage, caching, batch processing",
    "PLANNING": "Task breakdown, dependency management",
    "LEARNING": "Error learning, pattern extraction",
    "STATE": "State management, persistence",
}

def audit_real_skills():
    """Audit all real (non-scaffold) skills."""
    skills = {}
    
    for skills_dir in SKILLS_DIRS:
        if not skills_dir.exists():
            continue
        
        for skill_dir in skills_dir.iterdir():
            if not skill_dir.is_dir():
                continue
            
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                continue
            
            content = skill_file.read_text(encoding='utf-8')
            lines = len(content.split('\n'))
            
            # Only count real skills (>80 lines, <4 placeholders)
            placeholders = content.count("<!-- ")
            if lines < 80 or placeholders > 4:
                continue
            
            skill_id = skill_dir.name
            
            # Categorize by keyword matching
            category = "OTHER"
            content_lower = content.lower()
            skill_lower = skill_id.lower()
            
            for cat, desc in PRIORITY_CATEGORIES.items():
                if cat.lower() in skill_lower or cat.lower() in content_lower:
                    category = cat
                    break
            
            # Also check specific keywords
            if "session" in skill_lower or "handoff" in skill_lower or "resume" in skill_lower:
                category = "SESSION"
            elif "cognitive" in skill_lower or "reasoning" in skill_lower or "thinking" in skill_lower:
                category = "COGNITIVE"
            elif "context" in skill_lower or "compress" in skill_lower or "token" in skill_lower:
                category = "CONTEXT"
            elif "algorithm" in skill_lower or "optim" in skill_lower:
                category = "ALGORITHM"
            elif "quality" in skill_lower or "valid" in skill_lower or "verify" in skill_lower:
                category = "QUALITY"
            elif "learn" in skill_lower or "error" in skill_lower or "pattern" in skill_lower:
                category = "LEARNING"
            elif "plan" in skill_lower or "task" in skill_lower or "workflow" in skill_lower:
                category = "PLANNING"
            elif "state" in skill_lower or "persist" in skill_lower:
                category = "STATE"
            elif "ai" in skill_lower or "ml" in skill_lower or "neural" in skill_lower:
                category = "AI_ML"
            
            skills[skill_id] = {
                "path": str(skill_file),
                "lines": lines,
                "category": category,
                "source": skills_dir.name
            }
    
    return skills

def identify_gaps(skills):
    """Identify gaps in Claude capability skills."""
    by_category = defaultdict(list)
    for sid, info in skills.items():
        by_category[info["category"]].append(sid)
    
    gaps = []
    
    # Check each priority category
    for cat, desc in PRIORITY_CATEGORIES.items():
        count = len(by_category.get(cat, []))
        if count < 3:
            gaps.append({
                "category": cat,
                "description": desc,
                "current_count": count,
                "needed": 3 - count,
                "existing": by_category.get(cat, [])
            })
    
    return gaps, by_category

def main():
    print("=" * 70)
    print("CLAUDE CAPABILITY SKILLS AUDIT")
    print("=" * 70)
    
    skills = audit_real_skills()
    print(f"\nTotal REAL skills: {len(skills)}")
    
    gaps, by_category = identify_gaps(skills)
    
    print("\n" + "=" * 70)
    print("SKILLS BY PRIORITY CATEGORY")
    print("=" * 70)
    
    for cat, desc in PRIORITY_CATEGORIES.items():
        skill_list = by_category.get(cat, [])
        status = "[OK]" if len(skill_list) >= 3 else "[GAP]"
        print(f"\n{status} {cat} ({len(skill_list)}) - {desc}")
        for s in skill_list[:5]:
            print(f"   - {s}")
        if len(skill_list) > 5:
            print(f"   ... and {len(skill_list) - 5} more")
    
    # Other skills
    other = by_category.get("OTHER", [])
    print(f"\n[OTHER] ({len(other)})")
    for s in sorted(other)[:10]:
        print(f"   - {s}")
    if len(other) > 10:
        print(f"   ... and {len(other) - 10} more")
    
    print("\n" + "=" * 70)
    print("GAPS TO FILL")
    print("=" * 70)
    
    for gap in gaps:
        print(f"\n[NEED] {gap['category']}: Need {gap['needed']} more skills")
        print(f"   {gap['description']}")
        if gap['existing']:
            print(f"   Existing: {', '.join(gap['existing'])}")
    
    # Return data for further processing
    return {
        "total_real": len(skills),
        "by_category": {k: len(v) for k, v in by_category.items()},
        "gaps": gaps,
        "skills": skills
    }

if __name__ == "__main__":
    result = main()
    print("\n" + "=" * 70)
    print(json.dumps({"summary": result["by_category"], "gaps": len(result["gaps"])}, indent=2))
