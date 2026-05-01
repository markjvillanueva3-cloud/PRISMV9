"""
PRISM INTELLIGENT SKILL SELECTOR v2.0
=====================================
Dynamically selects the most relevant skills for ANY task.
NO FIXED LIMITS - uses relevance scoring and thresholds.

v2.0 Changes:
- Direct skill name matching
- Comprehensive keyword database
- Better fallback logic
- Always returns at least minimum core skills

Usage:
  py -3 intelligent_skill_selector.py "Your task description here"
  py -3 intelligent_skill_selector.py "Extract FANUC alarms" --threshold 0.2
  py -3 intelligent_skill_selector.py "Add materials" --max-context 50KB
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
TRIGGER_MAP = PRISM_ROOT / "data" / "coordination" / "SKILL_TRIGGER_MAP.json"
CAPABILITY_MATRIX = PRISM_ROOT / "data" / "coordination" / "CAPABILITY_MATRIX.json"
SYNERGY_MATRIX = PRISM_ROOT / "data" / "coordination" / "SYNERGY_MATRIX.json"
SKILLS_CONSOLIDATED = PRISM_ROOT / "skills-consolidated"
CONTAINER_PATH = "/mnt/skills/user"

# Container skills (fast access)
CONTAINER_SKILLS = {
    "prism-all-skills", "prism-anti-regression", "prism-api-contracts",
    "prism-code-complete-integration", "prism-code-master", "prism-codebase-packaging",
    "prism-controller-quick-ref", "prism-deep-learning", "prism-dev-utilities",
    "prism-error-catalog", "prism-expert-master", "prism-formula-evolution",
    "prism-hook-system", "prism-knowledge-master", "prism-life-safety-mindset",
    "prism-mandatory-microsession", "prism-manufacturing-tables", "prism-material-enhancer",
    "prism-material-lookup", "prism-material-physics", "prism-material-schema",
    "prism-mathematical-planning", "prism-maximum-completeness", "prism-monolith-extractor",
    "prism-monolith-index", "prism-monolith-navigator", "prism-predictive-thinking",
    "prism-prompt-engineering", "prism-quality-master", "prism-session-master",
    "prism-skill-orchestrator", "prism-sp-brainstorm", "prism-sp-debugging",
    "prism-sp-execution", "prism-sp-handoff", "prism-sp-planning",
    "prism-sp-review-quality", "prism-sp-review-spec", "prism-sp-verification",
    "prism-tdd-enhanced", "prism-tool-holder-schema", "prism-uncertainty-propagation",
    "prism-validator"
}

# Comprehensive keyword to skill mapping
SKILL_KEYWORDS = {
    # FANUC / Controller related
    "prism-fanuc-programming": ["fanuc", "0i", "30i", "31i", "fanuc alarm", "fanuc g-code", "fanuc macro"],
    "prism-siemens-programming": ["siemens", "840d", "828d", "sinumerik", "siemens alarm"],
    "prism-heidenhain-programming": ["heidenhain", "tnc", "itnc", "heidenhain cycle"],
    "prism-controller-quick-ref": ["controller", "cnc", "alarm", "error code", "fault"],
    "prism-error-catalog": ["error", "alarm", "fault", "exception", "code lookup", "catalog"],
    "prism-gcode-reference": ["g-code", "m-code", "gcode", "mcode", "g01", "g02", "g03", "iso 6983"],
    
    # Extraction / Monolith
    "prism-monolith-extractor": ["extract", "extraction", "pull out", "migrate", "monolith", "refactor"],
    "prism-monolith-index": ["find module", "line number", "where is", "locate", "module location", "search monolith"],
    "prism-monolith-navigator": ["navigate", "search", "find in", "monolith search"],
    
    # Materials
    "prism-material-schema": ["material", "127 param", "material structure", "schema", "material database"],
    "prism-material-physics": ["kienzle", "taylor", "johnson-cook", "cutting force", "tool life", "wear"],
    "prism-material-lookup": ["find material", "lookup material", "search material", "which material"],
    "prism-material-enhancer": ["enhance material", "fill gaps", "estimate param", "missing data", "complete"],
    "prism-material-validator": ["validate material", "check coverage", "completeness", "grade"],
    
    # Planning / Workflow
    "prism-sp-brainstorm": ["design", "brainstorm", "plan new", "explore", "think through", "approach"],
    "prism-sp-planning": ["task list", "break down", "roadmap", "decompose", "schedule", "tasks"],
    "prism-sp-execution": ["execute", "implement", "build", "create", "write code", "do it"],
    "prism-sp-debugging": ["debug", "fix", "broken", "not working", "issue", "bug", "crash", "error"],
    "prism-sp-verification": ["verify", "prove", "complete", "done", "evidence", "check"],
    "prism-sp-review-quality": ["review", "quality", "code review", "patterns", "best practices"],
    "prism-sp-review-spec": ["spec", "requirement", "specification", "compliance"],
    "prism-sp-handoff": ["session end", "handoff", "continue later", "save state", "wrap up"],
    
    # Validation / Quality
    "prism-validator": ["validate", "check", "verify", "syntax", "format"],
    "prism-quality-master": ["quality", "audit", "gate", "assessment"],
    "prism-tdd-enhanced": ["test", "unittest", "tdd", "test driven", "coverage"],
    
    # Code / Development
    "prism-code-master": ["code", "coding", "function", "class", "module", "architecture"],
    "prism-debugging": ["debug", "trace", "diagnose", "troubleshoot"],
    "prism-dev-utilities": ["utility", "helper", "tool", "script"],
    
    # Calculation / Physics
    "prism-product-calculators": ["speed", "feed", "calculate", "sfm", "ipm", "rpm", "cutting speed"],
    "prism-formula-evolution": ["formula", "equation", "calibrate", "coefficient"],
    "prism-universal-formulas": ["formula", "physics", "math", "equation"],
    
    # Tooling
    "prism-tool-holder-schema": ["tool holder", "holder", "collet", "arbor", "bt40", "cat40", "hsk"],
    
    # Knowledge / Expert
    "prism-expert-master": ["expert", "consult", "opinion", "advice"],
    "prism-knowledge-master": ["knowledge", "course", "learn", "mit", "stanford"],
    "prism-manufacturing-tables": ["thread", "tap", "drill", "tolerance", "table", "lookup"],
    
    # Session / State
    "prism-session-master": ["session", "state", "resume", "checkpoint", "continuity"],
    "prism-quick-start": ["quick", "start", "begin", "initialize"],
    
    # Cognitive / AI
    "prism-cognitive-core": ["cognitive", "ai", "ml", "pattern", "bayesian"],
    "prism-master-equation": ["omega", "quality score", "Ω(x)", "master equation"],
    "prism-safety-framework": ["safety", "s(x)", "defense", "guard"],
    "prism-reasoning-engine": ["reasoning", "r(x)", "logic", "inference"],
    "prism-ai-deep-learning": ["neural network", "lstm", "transformer", "gnn", "deep learning", "cnn", "rnn", "attention", "encoder", "decoder", "autoencoder"],
    
    # API / Integration
    "prism-api-contracts": ["api", "gateway", "route", "endpoint", "contract"],
    "prism-skill-orchestrator": ["orchestrate", "coordinate", "swarm", "multi-agent"],
    
    # NEW: Enhanced skills from obra/superpowers integration
    "prism-systematic-debugging-enhanced": ["debug", "bug", "error", "root cause", "trace", "4 phase", "backward trace", "defense in depth"],
    "prism-tdd-enhanced": ["test", "tdd", "red green", "refactor", "unit test", "test driven", "test first"],
    "prism-scientific-packages": ["python", "numpy", "pandas", "scipy", "sklearn", "pytorch", "ml", "statistics", "analysis", "optimization"],
    
    # NEW: Signal Processing (extracted from monolith 2026-01-30)
    "prism-signal-processing": ["fft", "filter", "wavelet", "spectrum", "frequency", "signal", "chatter detection", "butterworth", "stft", "vibration", "spindle monitoring", "bearing"],
    
    # NEW: Learning Engines (extracted from monolith 2026-01-30)
    "prism-learning-engines": ["active learning", "learn", "adaptive", "uncertainty sampling", "cam learning", "machine learning", "axis behavior", "volumetric error", "persistence", "feedback loop", "online learning"],
    
    # NEW: Cutting Mechanics (extracted from monolith 2026-01-30)
    "prism-cutting-mechanics": ["cutting force", "merchant", "kienzle", "chip thickness", "shear angle", "milling force", "specific cutting", "force calculation", "orthogonal", "chip formation", "cutting mechanics"],
    
    # NEW: CAM Strategies (extracted from monolith 2026-01-30)
    "prism-cam-strategies": ["cam strategy", "toolpath strategy", "adaptive clearing", "hsm", "waterline", "scallop", "roughing strategy", "finishing strategy", "pocketing", "contouring", "3d roughing", "z-level"],
    
    # NEW: Cutting Tools (extracted from monolith 2026-01-30)
    "prism-cutting-tools": ["end mill", "tool manufacturer", "harvey", "helical", "coating", "tialn", "flute count", "tool selection", "carbide", "tool geometry", "endmill", "ball mill", "bull nose"]
}


@dataclass
class ScoredSkill:
    """A skill with its relevance scores."""
    name: str
    keyword_score: float = 0.0
    name_match_score: float = 0.0
    total_score: float = 0.0
    in_container: bool = False
    matched_keywords: List[str] = field(default_factory=list)
    match_reason: str = ""


class IntelligentSkillSelector:
    """
    Intelligent skill selector that dynamically picks relevant skills.
    NO FIXED LIMITS - pure relevance-based selection.
    """
    
    def __init__(self):
        self.all_skills = self._get_all_skills()
    
    def _get_all_skills(self) -> Set[str]:
        """Get all available skills."""
        skills = set()
        
        # From consolidated folder
        if SKILLS_CONSOLIDATED.exists():
            for d in SKILLS_CONSOLIDATED.iterdir():
                if d.is_dir() and d.name.startswith("prism-"):
                    skills.add(d.name)
        
        # Add any from keyword map not in folder
        skills.update(SKILL_KEYWORDS.keys())
        
        return skills
    
    def _score_keyword_match(self, skill: str, task: str) -> Tuple[float, List[str]]:
        """Score skill based on keyword matches."""
        keywords = SKILL_KEYWORDS.get(skill, [])
        if not keywords:
            return 0.0, []
        
        task_lower = task.lower()
        matched = [kw for kw in keywords if kw.lower() in task_lower]
        
        if not matched:
            return 0.0, []
        
        # Score based on number of matches
        score = min(1.0, len(matched) / 2)  # 2+ matches = max score
        
        return score, matched
    
    def _score_name_match(self, skill: str, task: str) -> float:
        """Score skill based on skill name appearing in task."""
        # Extract meaningful parts from skill name
        parts = skill.replace("prism-", "").replace("-", " ").split()
        task_lower = task.lower()
        
        matches = sum(1 for part in parts if part in task_lower and len(part) > 2)
        
        if matches == 0:
            return 0.0
        
        return min(1.0, matches / len(parts))
    
    def select_skills(
        self,
        task: str,
        threshold: float = 0.20,
        max_context_kb: Optional[int] = None,
        min_skills: int = 3
    ) -> List[ScoredSkill]:
        """
        Select relevant skills for a task.
        
        Args:
            task: Task description
            threshold: Minimum relevance score (0-1). Default 0.20
            max_context_kb: Optional context budget in KB
            min_skills: Minimum skills to return (default 3)
        
        Returns:
            List of ScoredSkill objects, sorted by relevance
        """
        scored_skills = []
        
        for skill in self.all_skills:
            # Score keyword matches
            keyword_score, matched_keywords = self._score_keyword_match(skill, task)
            
            # Score name matches
            name_score = self._score_name_match(skill, task)
            
            # Combine scores
            total_score = max(keyword_score, name_score * 0.7)  # Keywords stronger
            
            if total_score > 0:
                reason = []
                if keyword_score > 0:
                    reason.append(f"keywords: {', '.join(matched_keywords[:3])}")
                if name_score > 0:
                    reason.append("name match")
                
                scored_skills.append(ScoredSkill(
                    name=skill,
                    keyword_score=keyword_score,
                    name_match_score=name_score,
                    total_score=total_score,
                    in_container=skill in CONTAINER_SKILLS,
                    matched_keywords=matched_keywords,
                    match_reason=" | ".join(reason)
                ))
        
        # Sort by score
        scored_skills.sort(key=lambda x: (-x.total_score, -x.in_container))
        
        # Filter by threshold, but ensure minimum
        above_threshold = [s for s in scored_skills if s.total_score >= threshold]
        
        if len(above_threshold) < min_skills and scored_skills:
            # Add top skills even if below threshold
            above_threshold = scored_skills[:max(min_skills, len(above_threshold))]
        
        # Apply context budget if specified
        if max_context_kb:
            avg_skill_size_kb = 15
            max_skills = max(min_skills, max_context_kb // avg_skill_size_kb)
            above_threshold = above_threshold[:max_skills]
        
        return above_threshold
    
    def generate_load_commands(self, skills: List[ScoredSkill]) -> List[Dict]:
        """Generate commands to load the selected skills."""
        commands = []
        
        # Sort: container skills first (faster)
        sorted_skills = sorted(skills, key=lambda x: (not x.in_container, -x.total_score))
        
        for skill in sorted_skills:
            if skill.in_container:
                commands.append({
                    "skill": skill.name,
                    "method": "view",
                    "path": f"{CONTAINER_PATH}/{skill.name}/SKILL.md",
                    "score": round(skill.total_score, 3),
                    "access": "FAST (container)"
                })
            else:
                skill_path = SKILLS_CONSOLIDATED / skill.name / "SKILL.md"
                if skill_path.exists():
                    commands.append({
                        "skill": skill.name,
                        "method": "Filesystem:read_file",
                        "path": str(skill_path),
                        "score": round(skill.total_score, 3),
                        "access": "filesystem"
                    })
        
        return commands


def print_results(task: str, skills: List[ScoredSkill], commands: List[Dict], threshold: float):
    """Print results in a readable format."""
    print("=" * 80)
    print("INTELLIGENT SKILL SELECTOR v2.0 - NO LIMITS, PURE RELEVANCE")
    print("=" * 80)
    print(f"\nTask: {task}")
    print(f"Threshold: {threshold}")
    print(f"\n[OK] Skills Selected: {len(skills)} (dynamically determined by relevance)")
    
    if not skills:
        print("\n[!] No skills matched. Try a more descriptive task.")
        return
    
    print("\n" + "-" * 80)
    print(f"{'Skill':<40} {'Score':>7} {'Access':>12} {'Match Reason'}")
    print("-" * 80)
    
    for skill in skills:
        access = "FAST" if skill.in_container else "filesystem"
        reason = skill.match_reason[:30] + "..." if len(skill.match_reason) > 30 else skill.match_reason
        print(f"{skill.name:<40} {skill.total_score:>7.3f} {access:>12} {reason}")
    
    print("\n" + "=" * 80)
    print("LOAD COMMANDS (copy/paste ready):")
    print("=" * 80)
    
    container_count = sum(1 for c in commands if "FAST" in c["access"])
    print(f"\nContainer (fast): {container_count} | Filesystem: {len(commands) - container_count}")
    
    for i, cmd in enumerate(commands, 1):
        print(f"\n{i}. {cmd['skill']} (relevance: {cmd['score']})")
        if cmd["method"] == "view":
            print(f"   view \"{cmd['path']}\"")
        else:
            print(f"   Filesystem:read_file path=\"{cmd['path']}\"")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Intelligent Skill Selector v2.0")
    parser.add_argument("task", type=str, help="Task description")
    parser.add_argument("--threshold", type=float, default=0.20,
                       help="Minimum relevance score (0-1, default: 0.20)")
    parser.add_argument("--max-context", type=str, default=None,
                       help="Max context budget (e.g., '50KB')")
    parser.add_argument("--min-skills", type=int, default=3,
                       help="Minimum skills to return (default: 3)")
    parser.add_argument("--json", action="store_true",
                       help="Output as JSON")
    
    args = parser.parse_args()
    
    # Parse max context
    max_context_kb = None
    if args.max_context:
        match = re.match(r'(\d+)\s*[kK][bB]?', args.max_context)
        if match:
            max_context_kb = int(match.group(1))
    
    # Run selection
    selector = IntelligentSkillSelector()
    skills = selector.select_skills(
        task=args.task,
        threshold=args.threshold,
        max_context_kb=max_context_kb,
        min_skills=args.min_skills
    )
    commands = selector.generate_load_commands(skills)
    
    if args.json:
        output = {
            "task": args.task,
            "threshold": args.threshold,
            "skillsSelected": len(skills),
            "skills": [
                {
                    "name": s.name,
                    "score": round(s.total_score, 3),
                    "inContainer": s.in_container,
                    "matchedKeywords": s.matched_keywords,
                    "matchReason": s.match_reason
                }
                for s in skills
            ],
            "loadCommands": commands
        }
        print(json.dumps(output, indent=2))
    else:
        print_results(args.task, skills, commands, args.threshold)


if __name__ == "__main__":
    main()
