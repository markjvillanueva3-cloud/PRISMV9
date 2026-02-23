#!/usr/bin/env python3
"""
PRISM Claude Capability Audit + Generation
Uses MCP server tools to audit, identify gaps, generate, and integrate.
Focus: Context, Token, Efficiency, Prediction, Optimization
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add scripts path
sys.path.insert(0, str(Path("C:/PRISM/scripts")))
sys.path.insert(0, str(Path("C:/PRISM/scripts/core")))

PRISM_ROOT = Path("C:/PRISM")
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
OUTPUT_DIR = PRISM_ROOT / "skills-claude-capabilities"

# Claude capability domains
CAPABILITY_DOMAINS = {
    "CONTEXT_MANAGEMENT": {
        "keywords": ["context", "window", "compress", "expand", "buffer", "overflow"],
        "purpose": "Manage context window efficiently",
        "target_skills": 5
    },
    "TOKEN_OPTIMIZATION": {
        "keywords": ["token", "cache", "kv-cache", "prefix", "efficiency"],
        "purpose": "Minimize tokens while maximizing information",
        "target_skills": 4
    },
    "PREDICTIVE_PLANNING": {
        "keywords": ["predict", "plan", "forecast", "anticipate", "branch", "outcome"],
        "purpose": "Predict outcomes and plan ahead",
        "target_skills": 4
    },
    "BATCH_PARALLEL": {
        "keywords": ["batch", "parallel", "concurrent", "queue", "async"],
        "purpose": "Process multiple items efficiently",
        "target_skills": 3
    },
    "LEARNING_ADAPTATION": {
        "keywords": ["learn", "adapt", "pattern", "error", "improve"],
        "purpose": "Learn from errors and adapt",
        "target_skills": 4
    },
    "MATHEMATICAL_OPTIMIZATION": {
        "keywords": ["optim", "algorithm", "formula", "equation", "minimize", "maximize"],
        "purpose": "Mathematical decision optimization",
        "target_skills": 4
    },
    "VALIDATION_SCRUTINY": {
        "keywords": ["valid", "verify", "scrutin", "check", "audit", "quality"],
        "purpose": "Validate outputs rigorously",
        "target_skills": 4
    },
    "STATE_CONTINUITY": {
        "keywords": ["state", "session", "handoff", "resume", "persist", "checkpoint"],
        "purpose": "Maintain state across sessions",
        "target_skills": 4
    }
}

def audit_existing_skills():
    """Audit all existing real skills."""
    skills = {}
    
    for skill_dir in SKILLS_DIR.iterdir():
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        
        content = skill_file.read_text(encoding='utf-8')
        lines = len(content.split('\n'))
        
        # Skip scaffolds
        if lines < 80 or content.count("<!-- ") > 4:
            continue
        
        skill_id = skill_dir.name
        content_lower = content.lower()
        
        # Classify by domain
        domains_matched = []
        for domain, info in CAPABILITY_DOMAINS.items():
            for kw in info["keywords"]:
                if kw in content_lower or kw in skill_id.lower():
                    domains_matched.append(domain)
                    break
        
        skills[skill_id] = {
            "lines": lines,
            "domains": domains_matched if domains_matched else ["OTHER"],
            "path": str(skill_file)
        }
    
    return skills

def identify_gaps(skills):
    """Identify gaps in each capability domain."""
    domain_coverage = {d: [] for d in CAPABILITY_DOMAINS}
    domain_coverage["OTHER"] = []
    
    for sid, info in skills.items():
        for domain in info["domains"]:
            if domain in domain_coverage:
                domain_coverage[domain].append(sid)
    
    gaps = {}
    for domain, info in CAPABILITY_DOMAINS.items():
        current = len(domain_coverage[domain])
        target = info["target_skills"]
        if current < target:
            gaps[domain] = {
                "current": current,
                "target": target,
                "needed": target - current,
                "existing": domain_coverage[domain],
                "purpose": info["purpose"]
            }
    
    return gaps, domain_coverage

def main():
    print("=" * 70)
    print("CLAUDE CAPABILITY SKILLS AUDIT")
    print("=" * 70)
    
    skills = audit_existing_skills()
    print(f"\nReal skills found: {len(skills)}")
    
    gaps, coverage = identify_gaps(skills)
    
    print("\n" + "=" * 70)
    print("DOMAIN COVERAGE")
    print("=" * 70)
    
    for domain, info in CAPABILITY_DOMAINS.items():
        count = len(coverage[domain])
        target = info["target_skills"]
        status = "[OK]" if count >= target else "[GAP]"
        print(f"\n{status} {domain}: {count}/{target}")
        print(f"    Purpose: {info['purpose']}")
        if coverage[domain]:
            for s in coverage[domain][:3]:
                print(f"    - {s}")
            if len(coverage[domain]) > 3:
                print(f"    ... +{len(coverage[domain])-3} more")
    
    print("\n" + "=" * 70)
    print("GAPS REQUIRING NEW SKILLS")
    print("=" * 70)
    
    total_needed = 0
    for domain, gap in gaps.items():
        print(f"\n{domain}: Need {gap['needed']} more")
        print(f"  {gap['purpose']}")
        total_needed += gap["needed"]
    
    print(f"\nTOTAL SKILLS NEEDED: {total_needed}")
    
    return {
        "total_skills": len(skills),
        "coverage": {d: len(v) for d, v in coverage.items()},
        "gaps": gaps,
        "total_needed": total_needed
    }

if __name__ == "__main__":
    result = main()
    
    # Save audit results
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    audit_file = OUTPUT_DIR / "AUDIT_RESULTS.json"
    with open(audit_file, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\nAudit saved to: {audit_file}")
