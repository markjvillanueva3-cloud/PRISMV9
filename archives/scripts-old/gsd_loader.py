"""
PRISM GSD LOADER v1.0
=====================
Generates optimal context loading for task types.
Minimizes context usage while maintaining quality.

Usage:
  py -3 gsd_loader.py --task "Extract FANUC alarms"
  py -3 gsd_loader.py --bundle ALARMS
  py -3 gsd_loader.py --resume
"""

import json
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
PRISM_REBUILD = Path(r"C:\\PRISM")
BUNDLES_FILE = PRISM_ROOT / "data" / "coordination" / "GSD_BUNDLES.json"
SESSION_MEMORY = PRISM_ROOT / "state" / "SESSION_MEMORY.json"
CURRENT_STATE = PRISM_REBUILD / "CURRENT_STATE.json"
SKILLS_CONSOLIDATED = PRISM_ROOT / "skills-consolidated"
CONTAINER_PATH = "/mnt/skills/user"


def load_bundles() -> Dict:
    """Load GSD bundles configuration."""
    with open(BUNDLES_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_session_memory() -> Dict:
    """Load current session memory."""
    if SESSION_MEMORY.exists():
        with open(SESSION_MEMORY, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_session_memory(memory: Dict):
    """Save session memory."""
    memory["lastUpdated"] = datetime.now().isoformat()
    with open(SESSION_MEMORY, 'w', encoding='utf-8') as f:
        json.dump(memory, f, indent=2)


def detect_bundle(task: str, bundles: Dict) -> Tuple[str, List[str]]:
    """Detect which bundle to load based on task description."""
    task_lower = task.lower()
    bundle_scores = {}
    
    for bundle_id, bundle_data in bundles["gsdBundles"]["bundles"].items():
        score = 0
        for trigger in bundle_data["triggers"]:
            if trigger.lower() in task_lower:
                score += 1
        if score > 0:
            bundle_scores[bundle_id] = (score, bundle_data["priority"])
    
    if not bundle_scores:
        return "MINIMAL", bundles["gsdBundles"]["bundles"]["MINIMAL"]["skills"]
    
    # Sort by score (desc) then priority (asc)
    best = sorted(bundle_scores.items(), key=lambda x: (-x[1][0], x[1][1]))[0]
    bundle_id = best[0]
    
    return bundle_id, bundles["gsdBundles"]["bundles"][bundle_id]["skills"]


def check_skill_in_container(skill_name: str) -> bool:
    """Check if skill is available in Claude's container."""
    # This is a static check - actual container skills are known
    container_skills = [
        "prism-all-skills", "prism-anti-regression", "prism-api-contracts",
        "prism-code-master", "prism-controller-quick-ref", "prism-deep-learning",
        "prism-dev-utilities", "prism-error-catalog", "prism-expert-master",
        "prism-formula-evolution", "prism-hook-system", "prism-knowledge-master",
        "prism-life-safety-mindset", "prism-mandatory-microsession",
        "prism-manufacturing-tables", "prism-material-enhancer",
        "prism-material-lookup", "prism-material-physics", "prism-material-schema",
        "prism-mathematical-planning", "prism-maximum-completeness",
        "prism-monolith-extractor", "prism-monolith-index", "prism-monolith-navigator",
        "prism-predictive-thinking", "prism-prompt-engineering", "prism-quality-master",
        "prism-session-master", "prism-skill-orchestrator", "prism-sp-brainstorm",
        "prism-sp-debugging", "prism-sp-execution", "prism-sp-handoff",
        "prism-sp-planning", "prism-sp-review-quality", "prism-sp-review-spec",
        "prism-sp-verification", "prism-tdd-enhanced", "prism-tool-holder-schema",
        "prism-uncertainty-propagation", "prism-validator"
    ]
    return skill_name in container_skills


def generate_load_commands(skills: List[str]) -> List[Dict]:
    """Generate commands to load skills with optimal paths."""
    commands = []
    for skill in skills:
        in_container = check_skill_in_container(skill)
        if in_container:
            commands.append({
                "skill": skill,
                "method": "view",
                "path": f"{CONTAINER_PATH}/{skill}/SKILL.md",
                "note": "FAST - in container"
            })
        else:
            commands.append({
                "skill": skill,
                "method": "Filesystem:read_file",
                "path": str(SKILLS_CONSOLIDATED / skill / "SKILL.md"),
                "note": "Filesystem access"
            })
    return commands


def generate_gsd_context(task: str) -> Dict:
    """Generate optimal GSD context for a task."""
    bundles = load_bundles()
    bundle_id, skills = detect_bundle(task, bundles)
    load_commands = generate_load_commands(skills)
    
    # Calculate context cost
    bundle_data = bundles["gsdBundles"]["bundles"][bundle_id]
    context_cost = bundle_data["contextCost"]
    
    # Update session memory
    memory = load_session_memory()
    memory["currentTask"] = {
        "id": f"GSD-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        "type": bundle_id,
        "description": task,
        "bundle": bundle_id,
        "startedAt": datetime.now().isoformat()
    }
    memory["context"] = {
        "loadedBundle": bundle_id,
        "loadedSkills": skills,
        "contextPressure": 0
    }
    save_session_memory(memory)
    
    return {
        "task": task,
        "bundle": bundle_id,
        "skills": skills,
        "contextCost": context_cost,
        "loadCommands": load_commands,
        "sessionMemoryUpdated": True
    }


def print_gsd_instructions(context: Dict):
    """Print GSD loading instructions."""
    print("=" * 70)
    print("GSD CONTEXT LOADER")
    print("=" * 70)
    print(f"\nTask: {context['task']}")
    print(f"Bundle: {context['bundle']}")
    print(f"Context Cost: {context['contextCost']}")
    print(f"\nSkills to Load ({len(context['skills'])}):")
    
    for cmd in context['loadCommands']:
        print(f"\n  {cmd['skill']}:")
        print(f"    Method: {cmd['method']}")
        print(f"    Path: {cmd['path']}")
        print(f"    Note: {cmd['note']}")
    
    print("\n" + "=" * 70)
    print("CLAUDE INSTRUCTIONS:")
    print("=" * 70)
    print("\n1. Read GSD_CORE.md (2KB) for laws and workflow")
    print("2. Load the skills above using the specified methods")
    print("3. Execute the task")
    print("4. Checkpoint progress to SESSION_MEMORY.json every 5-8 items")
    print("5. Update CURRENT_STATE.json when complete")
    print("\n" + "=" * 70)


def resume_session() -> Dict:
    """Resume from SESSION_MEMORY.json."""
    memory = load_session_memory()
    
    if not memory.get("currentTask", {}).get("id"):
        print("No active session to resume.")
        return {}
    
    print("=" * 70)
    print("RESUMING SESSION")
    print("=" * 70)
    print(f"\nTask: {memory['currentTask']['description']}")
    print(f"Bundle: {memory['currentTask']['bundle']}")
    print(f"Progress: {memory['progress']['completed']}/{memory['progress']['total']}")
    print(f"Last Checkpoint: {memory['progress']['lastCheckpoint']}")
    
    if memory.get("resumeInstructions"):
        print(f"\nResume Instructions: {memory['resumeInstructions']}")
    
    return memory


def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM GSD Loader")
    parser.add_argument("--task", type=str, help="Task description")
    parser.add_argument("--bundle", type=str, help="Specific bundle to load")
    parser.add_argument("--resume", action="store_true", help="Resume last session")
    parser.add_argument("--status", action="store_true", help="Show session status")
    
    args = parser.parse_args()
    
    if args.resume:
        resume_session()
    elif args.status:
        memory = load_session_memory()
        print(json.dumps(memory, indent=2))
    elif args.task:
        context = generate_gsd_context(args.task)
        print_gsd_instructions(context)
    elif args.bundle:
        bundles = load_bundles()
        if args.bundle in bundles["gsdBundles"]["bundles"]:
            bundle_data = bundles["gsdBundles"]["bundles"][args.bundle]
            context = {
                "task": f"Bundle: {args.bundle}",
                "bundle": args.bundle,
                "skills": bundle_data["skills"],
                "contextCost": bundle_data["contextCost"],
                "loadCommands": generate_load_commands(bundle_data["skills"])
            }
            print_gsd_instructions(context)
        else:
            print(f"Unknown bundle: {args.bundle}")
            print(f"Available: {list(bundles['gsdBundles']['bundles'].keys())}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
