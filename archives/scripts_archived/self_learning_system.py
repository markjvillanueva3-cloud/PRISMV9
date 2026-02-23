#!/usr/bin/env python3
"""
PRISM Self-Learning & Self-Teaching System v1.0
Continuous improvement through automatic learning propagation.

Commands:
    learn <type> <description>  - Capture new learning
    pending                     - Show pending learnings
    propagate <id>              - Propagate learning to all resources
    teach                       - Enter self-teaching mode
    analyze                     - Analyze learning patterns
    status                      - Show learning system status
    
Usage:
    py -3 self_learning_system.py learn workflow "Chunked writes prevent truncation"
    py -3 self_learning_system.py propagate LEARN-2026-01-30-001
    py -3 self_learning_system.py teach
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
LEARNING_DB = PRISM_ROOT / "data" / "LEARNING_DATABASE.json"
FORMULA_REGISTRY = PRISM_ROOT / "data" / "FORMULA_REGISTRY.json"
RESOURCE_REGISTRY = PRISM_ROOT / "data" / "coordination" / "RESOURCE_REGISTRY.json"
CAPABILITY_MATRIX = PRISM_ROOT / "data" / "coordination" / "CAPABILITY_MATRIX.json"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
STATE_FILE = PRISM_ROOT / "state" / "CURRENT_STATE.json"

# Learning types
LEARNING_TYPES = [
    "workflow_optimization",
    "pattern_discovery", 
    "error_fix",
    "new_capability",
    "performance_improvement",
    "safety_enhancement"
]

# Keywords that trigger learning detection
LEARNING_KEYWORDS = {
    "workflow_optimization": ["better way", "faster", "more efficient", "shortcut", "streamlined"],
    "pattern_discovery": ["pattern", "discovered", "noticed", "always", "never", "consistently"],
    "error_fix": ["fixed", "solved", "bug", "error", "issue", "problem"],
    "new_capability": ["can now", "new feature", "added", "enabled", "capability"],
    "performance_improvement": ["faster", "quicker", "optimized", "improved speed"],
    "safety_enhancement": ["safer", "more reliable", "validation", "protection"]
}


def load_json(path: Path) -> Dict:
    """Load JSON file safely."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return {}


def save_json(path: Path, data: Dict):
    """Save JSON file with formatting."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def generate_learning_id() -> str:
    """Generate unique learning ID."""
    now = datetime.now()
    db = load_json(LEARNING_DB)
    count = len(db.get("learningDatabase", {}).get("learnings", [])) + 1
    return f"LEARN-{now.strftime('%Y-%m-%d')}-{count:03d}"


def detect_learning_type(description: str) -> str:
    """Auto-detect learning type from description."""
    description_lower = description.lower()
    scores = {}
    
    for ltype, keywords in LEARNING_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in description_lower)
        scores[ltype] = score
    
    # Return highest scoring type, default to workflow_optimization
    best_type = max(scores, key=scores.get)
    return best_type if scores[best_type] > 0 else "workflow_optimization"


def analyze_impact(description: str) -> Dict:
    """Analyze which resources are affected by this learning."""
    impact = {
        "skills_affected": [],
        "agents_affected": [],
        "scripts_affected": [],
        "formulas_affected": [],
        "safety_critical": False,
        "confidence": 0.7
    }
    
    description_lower = description.lower()
    
    # Check for domain keywords and map to resources
    domain_mappings = {
        "material": ["prism-material-schema", "prism-material-physics", "prism-material-validator"],
        "machine": ["prism-machine-database", "prism-machine-validator"],
        "tool": ["prism-tool-database", "prism-tool-selector"],
        "speed": ["prism-speed-feed-engine", "prism-material-physics"],
        "feed": ["prism-speed-feed-engine", "prism-material-physics"],
        "force": ["prism-material-physics", "prism-force-calculator"],
        "session": ["prism-session-master", "prism-sp-handoff"],
        "file": ["prism-sp-execution", "prism-code-master"],
        "json": ["prism-validator", "prism-sp-debugging"],
        "safety": ["prism-life-safety-mindset", "prism-quality-master"],
        "validation": ["prism-quality-master", "prism-validator"],
        "learning": ["prism-deep-learning", "prism-formula-evolution"],
        "workflow": ["prism-sp-execution", "prism-sp-brainstorm"],
        "extraction": ["prism-monolith-extractor", "prism-monolith-navigator"]
    }
    
    for keyword, skills in domain_mappings.items():
        if keyword in description_lower:
            impact["skills_affected"].extend(skills)
    
    # Deduplicate
    impact["skills_affected"] = list(set(impact["skills_affected"]))
    
    # Check for safety-critical keywords
    safety_keywords = ["safety", "force", "speed", "life", "critical", "danger", "harm"]
    impact["safety_critical"] = any(kw in description_lower for kw in safety_keywords)
    
    return impact


def capture_learning(learning_type: str, description: str, evidence: str = "") -> Dict:
    """Capture a new learning."""
    db = load_json(LEARNING_DB)
    
    learning_id = generate_learning_id()
    
    # Auto-detect type if not specified
    if learning_type not in LEARNING_TYPES:
        learning_type = detect_learning_type(description)
    
    # Analyze impact
    impact = analyze_impact(description)
    
    learning = {
        "learning_id": learning_id,
        "timestamp": datetime.now().isoformat(),
        "type": learning_type,
        "discovery": {
            "what": description,
            "evidence": evidence,
            "confidence": impact["confidence"]
        },
        "impact": impact,
        "status": "DETECTED",
        "propagation_history": []
    }
    
    # Add to database
    if "learningDatabase" not in db:
        db["learningDatabase"] = {"learnings": [], "metadata": {}}
    
    db["learningDatabase"]["learnings"].append(learning)
    db["learningDatabase"]["metadata"]["lastUpdated"] = datetime.now().isoformat()
    db["learningDatabase"]["metadata"]["totalLearnings"] = len(db["learningDatabase"]["learnings"])
    db["learningDatabase"]["metadata"]["pendingLearnings"] = sum(
        1 for l in db["learningDatabase"]["learnings"] if l["status"] != "INTEGRATED"
    )
    
    # Update category count
    if "categories" in db["learningDatabase"]:
        if learning_type in db["learningDatabase"]["categories"]:
            db["learningDatabase"]["categories"][learning_type]["count"] += 1
    
    save_json(LEARNING_DB, db)
    
    return learning


def get_pending_learnings() -> List[Dict]:
    """Get all pending learnings."""
    db = load_json(LEARNING_DB)
    learnings = db.get("learningDatabase", {}).get("learnings", [])
    return [l for l in learnings if l.get("status") != "INTEGRATED"]


def propagate_learning(learning_id: str) -> Dict:
    """Propagate a learning to all affected resources."""
    db = load_json(LEARNING_DB)
    
    # Find the learning
    learning = None
    for l in db.get("learningDatabase", {}).get("learnings", []):
        if l["learning_id"] == learning_id:
            learning = l
            break
    
    if not learning:
        return {"status": "ERROR", "message": f"Learning {learning_id} not found"}
    
    results = {
        "status": "SUCCESS",
        "learning_id": learning_id,
        "propagations": [],
        "timestamp": datetime.now().isoformat()
    }
    
    # Safety check
    if learning["impact"].get("safety_critical"):
        print(f"⚠️  SAFETY CRITICAL: Learning {learning_id} affects safety-critical resources")
        print("   Manual review required before propagation")
        results["status"] = "SAFETY_REVIEW_REQUIRED"
        return results
    
    # Propagate to affected skills
    for skill_name in learning["impact"].get("skills_affected", []):
        skill_path = SKILLS_DIR / skill_name / "SKILL.md"
        if skill_path.exists():
            # Log propagation (actual update would require parsing and modifying skill files)
            propagation = {
                "resource_type": "skill",
                "resource_name": skill_name,
                "status": "LOGGED",
                "timestamp": datetime.now().isoformat()
            }
            results["propagations"].append(propagation)
            print(f"   📝 Logged propagation to skill: {skill_name}")
    
    # Update learning status
    learning["status"] = "INTEGRATED"
    learning["propagation_history"].append({
        "timestamp": datetime.now().isoformat(),
        "action": "PROPAGATED",
        "resources_updated": len(results["propagations"])
    })
    
    # Save updated database
    db["learningDatabase"]["metadata"]["lastUpdated"] = datetime.now().isoformat()
    db["learningDatabase"]["metadata"]["integratedLearnings"] = sum(
        1 for l in db["learningDatabase"]["learnings"] if l["status"] == "INTEGRATED"
    )
    db["learningDatabase"]["metadata"]["pendingLearnings"] = sum(
        1 for l in db["learningDatabase"]["learnings"] if l["status"] != "INTEGRATED"
    )
    
    save_json(LEARNING_DB, db)
    
    return results


def self_teach() -> Dict:
    """Enter self-teaching mode - analyze patterns and generate insights."""
    db = load_json(LEARNING_DB)
    learnings = db.get("learningDatabase", {}).get("learnings", [])
    
    insights = {
        "timestamp": datetime.now().isoformat(),
        "total_learnings": len(learnings),
        "patterns_detected": [],
        "recommendations": [],
        "knowledge_gaps": []
    }
    
    # Analyze learning patterns
    type_counts = {}
    for l in learnings:
        ltype = l.get("type", "unknown")
        type_counts[ltype] = type_counts.get(ltype, 0) + 1
    
    insights["type_distribution"] = type_counts
    
    # Find most affected resources
    resource_counts = {}
    for l in learnings:
        for skill in l.get("impact", {}).get("skills_affected", []):
            resource_counts[skill] = resource_counts.get(skill, 0) + 1
    
    if resource_counts:
        most_affected = sorted(resource_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        insights["most_affected_resources"] = most_affected
        
        # Generate recommendations
        for resource, count in most_affected:
            if count >= 3:
                insights["recommendations"].append(
                    f"Resource '{resource}' has {count} learnings - consider consolidating improvements"
                )
    
    # Detect knowledge gaps
    domains_covered = set()
    for l in learnings:
        desc = l.get("discovery", {}).get("what", "").lower()
        if "material" in desc:
            domains_covered.add("materials")
        if "machine" in desc:
            domains_covered.add("machines")
        if "tool" in desc:
            domains_covered.add("tools")
        if "physics" in desc:
            domains_covered.add("physics")
        if "safety" in desc:
            domains_covered.add("safety")
    
    all_domains = {"materials", "machines", "tools", "physics", "safety", "workflow", "optimization"}
    gaps = all_domains - domains_covered
    insights["knowledge_gaps"] = list(gaps)
    
    return insights


def get_status() -> Dict:
    """Get comprehensive learning system status."""
    db = load_json(LEARNING_DB)
    meta = db.get("learningDatabase", {}).get("metadata", {})
    learnings = db.get("learningDatabase", {}).get("learnings", [])
    
    # Calculate stats
    integrated = sum(1 for l in learnings if l.get("status") == "INTEGRATED")
    pending = sum(1 for l in learnings if l.get("status") != "INTEGRATED")
    safety_critical = sum(1 for l in learnings if l.get("impact", {}).get("safety_critical"))
    
    status = {
        "system_status": "ACTIVE",
        "total_learnings": len(learnings),
        "integrated": integrated,
        "pending": pending,
        "safety_critical": safety_critical,
        "integration_rate": f"{(integrated/len(learnings)*100):.1f}%" if learnings else "N/A",
        "last_updated": meta.get("lastUpdated", "Never"),
        "categories": db.get("learningDatabase", {}).get("categories", {})
    }
    
    return status


def print_banner():
    """Print system banner."""
    print("=" * 70)
    print("  PRISM SELF-LEARNING & SELF-TEACHING SYSTEM v1.0")
    print("  Continuous improvement through automatic learning propagation")
    print("=" * 70)


def main():
    if len(sys.argv) < 2:
        print_banner()
        print("\nUsage:")
        print("  py -3 self_learning_system.py learn <type> <description>")
        print("  py -3 self_learning_system.py pending")
        print("  py -3 self_learning_system.py propagate <learning_id>")
        print("  py -3 self_learning_system.py teach")
        print("  py -3 self_learning_system.py analyze")
        print("  py -3 self_learning_system.py status")
        print("\nLearning Types:")
        for lt in LEARNING_TYPES:
            print(f"  - {lt}")
        return
    
    command = sys.argv[1].lower()
    
    if command == "learn":
        if len(sys.argv) < 4:
            print("Usage: learn <type> <description>")
            return
        learning_type = sys.argv[2]
        description = " ".join(sys.argv[3:])
        
        learning = capture_learning(learning_type, description)
        print(f"\n✅ Learning captured: {learning['learning_id']}")
        print(f"   Type: {learning['type']}")
        print(f"   Status: {learning['status']}")
        print(f"   Skills affected: {len(learning['impact']['skills_affected'])}")
        if learning['impact']['safety_critical']:
            print(f"   ⚠️  SAFETY CRITICAL - requires manual review")
    
    elif command == "pending":
        pending = get_pending_learnings()
        print(f"\n📋 Pending Learnings: {len(pending)}")
        for l in pending:
            print(f"\n   {l['learning_id']} ({l['type']})")
            print(f"   └─ {l['discovery']['what'][:60]}...")
            print(f"      Status: {l['status']}")
    
    elif command == "propagate":
        if len(sys.argv) < 3:
            print("Usage: propagate <learning_id>")
            return
        learning_id = sys.argv[2]
        
        print(f"\n🔄 Propagating learning: {learning_id}")
        result = propagate_learning(learning_id)
        print(f"   Status: {result['status']}")
        print(f"   Propagations: {len(result.get('propagations', []))}")
    
    elif command == "teach":
        print("\n🎓 Entering Self-Teaching Mode...")
        insights = self_teach()
        print(f"\n   Total learnings analyzed: {insights['total_learnings']}")
        print(f"   Type distribution: {insights.get('type_distribution', {})}")
        if insights.get('most_affected_resources'):
            print(f"   Most affected resources:")
            for resource, count in insights['most_affected_resources']:
                print(f"      - {resource}: {count} learnings")
        if insights.get('recommendations'):
            print(f"\n   Recommendations:")
            for rec in insights['recommendations']:
                print(f"      💡 {rec}")
        if insights.get('knowledge_gaps'):
            print(f"\n   Knowledge gaps detected:")
            for gap in insights['knowledge_gaps']:
                print(f"      ⚠️  {gap}")
    
    elif command == "analyze":
        print("\n📊 Learning System Analysis")
        insights = self_teach()
        print(json.dumps(insights, indent=2))
    
    elif command == "status":
        print_banner()
        status = get_status()
        print(f"\n   System Status: {status['system_status']}")
        print(f"   Total Learnings: {status['total_learnings']}")
        print(f"   Integrated: {status['integrated']}")
        print(f"   Pending: {status['pending']}")
        print(f"   Safety Critical: {status['safety_critical']}")
        print(f"   Integration Rate: {status['integration_rate']}")
        print(f"   Last Updated: {status['last_updated']}")
    
    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
