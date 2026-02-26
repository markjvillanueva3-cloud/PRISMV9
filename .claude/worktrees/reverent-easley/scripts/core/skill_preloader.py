#!/usr/bin/env python3
"""
SKILL_PRELOADER.py - Intelligent Skill Preloading System
Determines which skills to load for rapid session resume.

Features:
- Task-based skill selection
- Priority ordering (CRITICAL > HIGH > MEDIUM > LOW)
- Token budget awareness
- Caching of frequently used skills
- Container vs filesystem detection

Usage:
    python skill_preloader.py --task "Build MCP tools"
    python skill_preloader.py --session 0.3
    python skill_preloader.py --auto  # Auto-detect from state

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import re
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
CONTAINER_SKILLS_PATH = "/mnt/skills/user"

CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"
SKILL_CACHE_FILE = STATE_DIR / "skill_cache.json"
SKILL_USAGE_FILE = STATE_DIR / "skill_usage.json"


class LoadPriority(Enum):
    CRITICAL = 1  # Must load immediately
    HIGH = 2      # Load early
    MEDIUM = 3    # Load if space
    LOW = 4       # Load on demand


class LoadTime(Enum):
    IMMEDIATE = "IMMEDIATE"   # Load at session start
    DEFERRED = "DEFERRED"     # Load when needed
    ON_DEMAND = "ON_DEMAND"   # Load only if requested


@dataclass
class SkillInfo:
    """Information about a skill."""
    name: str
    path: str
    priority: LoadPriority = LoadPriority.MEDIUM
    load_time: LoadTime = LoadTime.DEFERRED
    in_container: bool = False
    estimated_tokens: int = 500
    keywords: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    usage_count: int = 0
    last_used: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "path": self.path,
            "priority": self.priority.value,
            "loadTime": self.load_time.value,
            "inContainer": self.in_container,
            "estimatedTokens": self.estimated_tokens,
            "keywords": self.keywords,
            "dependencies": self.dependencies,
            "usageCount": self.usage_count,
            "lastUsed": self.last_used
        }


class SkillPreloader:
    """
    Intelligent skill preloading for rapid session resume.
    
    Strategies:
    1. Task-based: Match skills to task keywords
    2. Session-based: Load skills recommended for session
    3. Usage-based: Prioritize frequently used skills
    4. Dependency-based: Load skill dependencies first
    """
    
    # Skill keyword mappings
    SKILL_KEYWORDS = {
        "prism-session-master": ["session", "resume", "handoff", "context", "state"],
        "prism-state-manager": ["state", "checkpoint", "persist", "save", "load"],
        "prism-quick-start": ["start", "init", "begin", "resume"],
        "prism-sp-execution": ["execute", "run", "task", "work", "do"],
        "prism-sp-planning": ["plan", "task", "breakdown", "design"],
        "prism-sp-brainstorm": ["design", "brainstorm", "think", "approach"],
        "prism-sp-verification": ["verify", "check", "validate", "complete"],
        "prism-code-master": ["code", "programming", "pattern", "algorithm"],
        "prism-coding-patterns": ["code", "pattern", "design", "architecture"],
        "prism-api-contracts": ["api", "interface", "contract", "gateway"],
        "prism-material-physics": ["material", "physics", "kienzle", "force"],
        "prism-manufacturing-tables": ["table", "data", "reference", "lookup"],
        "prism-fanuc-programming": ["fanuc", "cnc", "gcode", "machine"],
        "prism-gcode-reference": ["gcode", "cnc", "program", "controller"],
        "prism-monolith-navigator": ["monolith", "search", "find", "navigate"],
        "prism-quality-master": ["quality", "validation", "omega", "gate"],
        "prism-dev-utilities": ["utility", "tool", "helper", "debug"],
        "prism-error-catalog": ["error", "alarm", "troubleshoot", "fix"],
        "prism-tdd": ["test", "tdd", "unit", "coverage"],
        "prism-debugging": ["debug", "fix", "error", "issue"],
    }
    
    # Session to skill recommendations
    SESSION_SKILLS = {
        "0.1": ["prism-session-master", "prism-state-manager", "prism-sp-execution"],
        "0.2": ["prism-session-master", "prism-state-manager", "prism-sp-execution"],
        "0.3": ["prism-session-master", "prism-quick-start", "prism-sp-execution"],
        "0.4": ["prism-session-master", "prism-sp-handoff", "prism-sp-execution"],
        "1.1": ["prism-code-master", "prism-dev-utilities"],
        "1.2": ["prism-code-master", "prism-coding-patterns"],
    }
    
    # Critical skills always loaded first
    CRITICAL_SKILLS = ["prism-quick-start", "prism-session-master"]
    
    def __init__(self):
        self.skills: Dict[str, SkillInfo] = {}
        self.usage_stats = self._load_usage_stats()
        self._discover_skills()
    
    def _load_usage_stats(self) -> Dict:
        """Load skill usage statistics."""
        if SKILL_USAGE_FILE.exists():
            try:
                with open(SKILL_USAGE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {"skills": {}, "lastUpdated": None}
    
    def _save_usage_stats(self):
        """Save skill usage statistics."""
        self.usage_stats["lastUpdated"] = datetime.now().isoformat()
        with open(SKILL_USAGE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.usage_stats, f, indent=2)
    
    def _discover_skills(self):
        """Discover available skills."""
        # Check container skills
        container_path = Path(CONTAINER_SKILLS_PATH)
        if container_path.exists():
            for skill_dir in container_path.iterdir():
                if skill_dir.is_dir() and skill_dir.name.startswith("prism-"):
                    skill_file = skill_dir / "SKILL.md"
                    if skill_file.exists():
                        self._register_skill(skill_dir.name, str(skill_file), in_container=True)
        
        # Check filesystem skills
        if SKILLS_DIR.exists():
            for skill_dir in SKILLS_DIR.iterdir():
                if skill_dir.is_dir() and skill_dir.name.startswith("prism-"):
                    if skill_dir.name not in self.skills:  # Don't override container
                        skill_file = skill_dir / "SKILL.md"
                        if skill_file.exists():
                            self._register_skill(skill_dir.name, str(skill_file), in_container=False)
    
    def _register_skill(self, name: str, path: str, in_container: bool):
        """Register a discovered skill."""
        keywords = self.SKILL_KEYWORDS.get(name, [])
        usage = self.usage_stats.get("skills", {}).get(name, {})
        
        priority = LoadPriority.CRITICAL if name in self.CRITICAL_SKILLS else LoadPriority.MEDIUM
        
        self.skills[name] = SkillInfo(
            name=name,
            path=path,
            priority=priority,
            in_container=in_container,
            keywords=keywords,
            usage_count=usage.get("count", 0),
            last_used=usage.get("lastUsed")
        )
    
    def select_for_task(self, task: str, max_skills: int = 5) -> List[SkillInfo]:
        """Select skills based on task description."""
        task_lower = task.lower()
        scores: Dict[str, float] = {}
        
        for name, skill in self.skills.items():
            score = 0.0
            
            # Keyword matching
            for keyword in skill.keywords:
                if keyword in task_lower:
                    score += 2.0
            
            # Partial word matching
            for word in task_lower.split():
                for keyword in skill.keywords:
                    if word in keyword or keyword in word:
                        score += 0.5
            
            # Usage frequency bonus
            score += min(skill.usage_count * 0.1, 1.0)
            
            # Critical skill bonus
            if skill.priority == LoadPriority.CRITICAL:
                score += 3.0
            
            # Container preference (faster load)
            if skill.in_container:
                score += 0.5
            
            if score > 0:
                scores[name] = score
        
        # Sort by score and return top skills
        sorted_skills = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        selected = [self.skills[name] for name, _ in sorted_skills[:max_skills]]
        
        # Ensure critical skills are included
        for critical in self.CRITICAL_SKILLS:
            if critical in self.skills:
                skill = self.skills[critical]
                if skill not in selected:
                    selected.insert(0, skill)
                    if len(selected) > max_skills:
                        selected.pop()
        
        return selected
    
    def select_for_session(self, session: str, max_skills: int = 5) -> List[SkillInfo]:
        """Select skills based on session number."""
        recommended = self.SESSION_SKILLS.get(session, [])
        selected = []
        
        # Add recommended skills
        for name in recommended:
            if name in self.skills:
                selected.append(self.skills[name])
        
        # Add critical skills if not already included
        for critical in self.CRITICAL_SKILLS:
            if critical in self.skills:
                skill = self.skills[critical]
                if skill not in selected:
                    selected.insert(0, skill)
        
        return selected[:max_skills]
    
    def select_auto(self, max_skills: int = 5) -> Tuple[List[SkillInfo], str]:
        """Auto-select skills based on current state."""
        # Load state files
        roadmap = self._load_json(ROADMAP_FILE)
        state = self._load_json(CURRENT_STATE_FILE)
        
        if not roadmap:
            return self.select_for_task("general development", max_skills), "default"
        
        # Get current session
        session = roadmap.get("current_session", "")
        session_name = roadmap.get("current_session_name", "")
        
        # Combine session recommendation with task matching
        session_skills = self.select_for_session(session, max_skills)
        task_skills = self.select_for_task(session_name, max_skills)
        
        # Merge and deduplicate
        seen = set()
        merged = []
        for skill in session_skills + task_skills:
            if skill.name not in seen:
                seen.add(skill.name)
                merged.append(skill)
        
        return merged[:max_skills], f"session_{session}"
    
    def _load_json(self, path: Path) -> Optional[Dict]:
        """Load JSON file safely."""
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def generate_load_commands(self, skills: List[SkillInfo]) -> List[Dict]:
        """Generate load commands for selected skills."""
        commands = []
        
        for i, skill in enumerate(skills):
            if skill.in_container:
                cmd = f'view "{CONTAINER_SKILLS_PATH}/{skill.name}/SKILL.md"'
                cmd_type = "container"
            else:
                cmd = f'Filesystem:read_file path="{skill.path}"'
                cmd_type = "filesystem"
            
            commands.append({
                "step": i + 1,
                "skill": skill.name,
                "command": cmd,
                "type": cmd_type,
                "priority": skill.priority.name
            })
        
        return commands
    
    def record_usage(self, skill_names: List[str]):
        """Record skill usage for future optimization."""
        now = datetime.now().isoformat()
        
        for name in skill_names:
            if name not in self.usage_stats["skills"]:
                self.usage_stats["skills"][name] = {"count": 0}
            
            self.usage_stats["skills"][name]["count"] += 1
            self.usage_stats["skills"][name]["lastUsed"] = now
        
        self._save_usage_stats()
    
    def get_preload_plan(self, skills: List[SkillInfo], token_budget: int = 10000) -> Dict:
        """Generate a preload plan with token budget."""
        plan = {
            "immediate": [],
            "deferred": [],
            "on_demand": [],
            "total_tokens": 0,
            "within_budget": True
        }
        
        running_tokens = 0
        
        for skill in skills:
            if skill.priority == LoadPriority.CRITICAL:
                plan["immediate"].append(skill.to_dict())
                running_tokens += skill.estimated_tokens
            elif running_tokens + skill.estimated_tokens <= token_budget:
                plan["immediate"].append(skill.to_dict())
                running_tokens += skill.estimated_tokens
            elif skill.priority == LoadPriority.HIGH:
                plan["deferred"].append(skill.to_dict())
            else:
                plan["on_demand"].append(skill.to_dict())
        
        plan["total_tokens"] = running_tokens
        plan["within_budget"] = running_tokens <= token_budget
        
        return plan


def main():
    parser = argparse.ArgumentParser(description="PRISM Skill Preloader")
    parser.add_argument("--task", help="Task description")
    parser.add_argument("--session", help="Session number")
    parser.add_argument("--auto", action="store_true", help="Auto-detect from state")
    parser.add_argument("--max", type=int, default=5, help="Max skills to select")
    parser.add_argument("--budget", type=int, default=10000, help="Token budget")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--record", nargs="+", help="Record skill usage")
    
    args = parser.parse_args()
    preloader = SkillPreloader()
    
    if args.record:
        preloader.record_usage(args.record)
        print(f"Recorded usage for: {', '.join(args.record)}")
        return
    
    # Select skills
    source = "manual"
    if args.task:
        skills = preloader.select_for_task(args.task, args.max)
        source = "task"
    elif args.session:
        skills = preloader.select_for_session(args.session, args.max)
        source = f"session_{args.session}"
    elif args.auto:
        skills, source = preloader.select_auto(args.max)
    else:
        skills, source = preloader.select_auto(args.max)
    
    # Generate output
    commands = preloader.generate_load_commands(skills)
    plan = preloader.get_preload_plan(skills, args.budget)
    
    if args.json:
        output = {
            "source": source,
            "skills": [s.to_dict() for s in skills],
            "commands": commands,
            "plan": plan
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"Selected {len(skills)} skills (source: {source}):")
        print("-" * 60)
        for cmd in commands:
            priority = f"[{cmd['priority']}]"
            print(f"  {cmd['step']}. {priority:10s} {cmd['skill']}")
            print(f"     {cmd['command']}")
        print()
        print(f"Total estimated tokens: {plan['total_tokens']}")
        print(f"Within budget ({args.budget}): {plan['within_budget']}")


if __name__ == "__main__":
    main()
