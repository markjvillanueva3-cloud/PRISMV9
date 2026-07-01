#!/usr/bin/env python3
"""
NEXT_SESSION_PREP.py - Next Session Preparation System
Prepares everything needed for the next session to start productively.

Features:
- Generates quick resume text
- Identifies required files and skills
- Creates load order
- Estimates complexity
- Generates action plan

Usage:
    python next_session_prep.py generate           # Generate prep document
    python next_session_prep.py quick-resume       # Just quick resume text
    python next_session_prep.py load-order         # Just load order
    python next_session_prep.py complexity         # Estimate complexity

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"
HANDOFF_FILE = STATE_DIR / "current_handoff.json"
NEXT_SESSION_FILE = STATE_DIR / "next_session_prep.json"

CONTAINER_SKILLS_PATH = "/mnt/skills/user"


class Complexity(Enum):
    """Task complexity levels."""
    TRIVIAL = "TRIVIAL"         # < 5 min
    SIMPLE = "SIMPLE"           # 5-15 min
    MODERATE = "MODERATE"       # 15-60 min
    COMPLEX = "COMPLEX"         # 1-3 hours
    VERY_COMPLEX = "VERY_COMPLEX"  # 3+ hours


@dataclass
class LoadItem:
    """Item to load at session start."""
    priority: int
    tool: str
    path: str
    description: str
    estimated_tokens: int = 500
    required: bool = True
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class NextSessionPrep:
    """Preparation document for next session."""
    generated_at: str
    quick_resume: str
    immediate_action: str
    roadmap_position: Dict
    load_order: List[LoadItem]
    skills_needed: List[str]
    files_to_read: List[str]
    warnings: List[str]
    do_not_forget: List[str]
    complexity: Complexity
    estimated_time: str
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d["complexity"] = self.complexity.value
        d["load_order"] = [item.to_dict() for item in self.load_order]
        return d


class NextSessionPreparer:
    """
    Prepares context for the next session.
    
    Analyzes current state and creates everything needed
    for the next session to start immediately.
    """
    
    # Skill recommendations by task type
    SKILL_RECOMMENDATIONS = {
        "state": ["prism-session-master", "prism-state-manager"],
        "code": ["prism-code-master", "prism-coding-patterns"],
        "mcp": ["prism-api-contracts", "prism-code-master"],
        "physics": ["prism-material-physics", "prism-manufacturing-tables"],
        "debug": ["prism-debugging", "prism-error-catalog"],
        "default": ["prism-quick-start", "prism-session-master"]
    }
    
    def __init__(self):
        self.state: Optional[Dict] = None
        self.roadmap: Optional[Dict] = None
        self.handoff: Optional[Dict] = None
        self._load_files()
    
    def _load_files(self):
        """Load state files."""
        self.state = self._load_json(CURRENT_STATE_FILE)
        self.roadmap = self._load_json(ROADMAP_FILE)
        self.handoff = self._load_json(HANDOFF_FILE)
    
    def _load_json(self, path: Path) -> Optional[Dict]:
        """Load JSON file safely."""
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def _save_json(self, path: Path, data: Dict):
        """Save JSON file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    
    def generate_quick_resume(self) -> str:
        """Generate quick resume text."""
        parts = []
        
        # Session info
        if self.roadmap:
            session = self.roadmap.get("current_session", "")
            session_name = self.roadmap.get("current_session_name", "")
            status = self.roadmap.get("session_status", "")
            parts.append(f"Session {session}: {session_name} [{status}]")
        
        # Quick resume from state
        if self.state and self.state.get("quickResume"):
            qr = self.state["quickResume"]
            if isinstance(qr, str):
                parts.append(qr)
        
        # Next action from roadmap
        if self.roadmap:
            qr = self.roadmap.get("quick_resume", {})
            if qr.get("next_action"):
                parts.append(f"NEXT: {qr['next_action']}")
        
        # Pending deliverables
        if self.roadmap:
            session_id = self.roadmap.get("current_session", "")
            sessions = self.roadmap.get("sessions", {})
            session_info = sessions.get(session_id, {})
            deliverables = session_info.get("deliverables", [])
            pending = [d for d in deliverables if "✓" not in d]
            if pending:
                parts.append(f"Pending: {len(pending)} deliverables")
                parts.append(f"  Next: {pending[0][:50]}" if pending else "")
        
        return "\n".join(parts)
    
    def get_immediate_action(self) -> str:
        """Get the immediate action for next session."""
        # Check handoff first
        if self.handoff:
            next_session = self.handoff.get("nextSession", {})
            if next_session.get("immediateAction"):
                return next_session["immediateAction"]
        
        # Check roadmap
        if self.roadmap:
            qr = self.roadmap.get("quick_resume", {})
            if qr.get("next_action"):
                return qr["next_action"]
            
            # Get first pending deliverable
            session_id = self.roadmap.get("current_session", "")
            sessions = self.roadmap.get("sessions", {})
            session_info = sessions.get(session_id, {})
            deliverables = session_info.get("deliverables", [])
            pending = [d for d in deliverables if "✓" not in d]
            if pending:
                return f"Complete: {pending[0]}"
        
        return "Continue from last checkpoint"
    
    def get_roadmap_position(self) -> Dict:
        """Get current roadmap position."""
        if not self.roadmap:
            return {}
        
        session_id = self.roadmap.get("current_session", "")
        sessions = self.roadmap.get("sessions", {})
        session_info = sessions.get(session_id, {})
        
        deliverables = session_info.get("deliverables", [])
        done = [d for d in deliverables if "✓" in d]
        pending = [d for d in deliverables if "✓" not in d]
        
        return {
            "tier": self.roadmap.get("current_tier", 0),
            "session": session_id,
            "sessionName": self.roadmap.get("current_session_name", ""),
            "status": self.roadmap.get("session_status", ""),
            "deliverablesDone": len(done),
            "deliverablesPending": len(pending),
            "progress": f"{len(done)}/{len(deliverables)}" if deliverables else "0/0"
        }
    
    def generate_load_order(self) -> List[LoadItem]:
        """Generate ordered list of items to load."""
        items = []
        priority = 1
        
        # 1. Always load roadmap first (CRITICAL)
        items.append(LoadItem(
            priority=priority,
            tool="Desktop Commander:read_file",
            path=str(ROADMAP_FILE),
            description="Roadmap tracker",
            estimated_tokens=300,
            required=True
        ))
        priority += 1
        
        # 2. Load state (CRITICAL)
        items.append(LoadItem(
            priority=priority,
            tool="Desktop Commander:read_file",
            path=str(CURRENT_STATE_FILE),
            description="Current state",
            estimated_tokens=400,
            required=True
        ))
        priority += 1
        
        # 3. Load quick-start skill (HIGH)
        items.append(LoadItem(
            priority=priority,
            tool="view",
            path=f"{CONTAINER_SKILLS_PATH}/prism-quick-start/SKILL.md",
            description="Quick start skill",
            estimated_tokens=200,
            required=False
        ))
        priority += 1
        
        # 4. Task-specific skills (MEDIUM)
        skills = self.identify_skills_needed()
        for skill in skills[:3]:  # Limit to 3
            items.append(LoadItem(
                priority=priority,
                tool="view",
                path=f"{CONTAINER_SKILLS_PATH}/{skill}/SKILL.md",
                description=f"Skill: {skill}",
                estimated_tokens=500,
                required=False
            ))
            priority += 1
        
        return items
    
    def identify_skills_needed(self) -> List[str]:
        """Identify skills needed based on current task."""
        skills = set(self.SKILL_RECOMMENDATIONS["default"])
        
        if not self.roadmap:
            return list(skills)
        
        session_name = self.roadmap.get("current_session_name", "").lower()
        
        # Match keywords to skill categories
        keyword_map = {
            "state": ["state", "persist", "checkpoint", "save"],
            "code": ["code", "script", "implement", "build"],
            "mcp": ["mcp", "tool", "api"],
            "physics": ["physics", "material", "kienzle", "force"],
            "debug": ["debug", "error", "fix", "troubleshoot"]
        }
        
        for category, keywords in keyword_map.items():
            if any(kw in session_name for kw in keywords):
                skills.update(self.SKILL_RECOMMENDATIONS[category])
        
        return list(skills)
    
    def get_warnings(self) -> List[str]:
        """Get warnings for next session."""
        warnings = []
        
        # From handoff
        if self.handoff:
            next_session = self.handoff.get("nextSession", {})
            warnings.extend(next_session.get("warnings", []))
        
        # Check state for issues
        if self.state:
            # Old state warning
            last_updated = self.state.get("lastUpdated", "")
            if last_updated:
                try:
                    last_time = datetime.fromisoformat(last_updated.replace("Z", ""))
                    age_hours = (datetime.now() - last_time).total_seconds() / 3600
                    if age_hours > 24:
                        warnings.append(f"State is {age_hours:.0f} hours old")
                except ValueError:
                    pass
        
        return warnings
    
    def get_do_not_forget(self) -> List[str]:
        """Get critical items not to forget."""
        items = []
        
        # From handoff
        if self.handoff:
            next_session = self.handoff.get("nextSession", {})
            items.extend(next_session.get("doNotForget", []))
        
        # Always remember
        items.append("Read ROADMAP_TRACKER.json first")
        items.append("Checkpoint every 5-8 items")
        
        return items
    
    def estimate_complexity(self) -> Tuple[Complexity, str]:
        """Estimate complexity of next session work."""
        if not self.roadmap:
            return Complexity.MODERATE, "1-2 hours"
        
        session_id = self.roadmap.get("current_session", "")
        sessions = self.roadmap.get("sessions", {})
        session_info = sessions.get(session_id, {})
        
        # Count pending deliverables
        deliverables = session_info.get("deliverables", [])
        pending = [d for d in deliverables if "✓" not in d]
        pending_count = len(pending)
        
        # Estimate based on pending count
        if pending_count == 0:
            return Complexity.TRIVIAL, "< 5 min"
        elif pending_count <= 2:
            return Complexity.SIMPLE, "15-30 min"
        elif pending_count <= 5:
            return Complexity.MODERATE, "30-60 min"
        elif pending_count <= 8:
            return Complexity.COMPLEX, "1-2 hours"
        else:
            return Complexity.VERY_COMPLEX, "2+ hours"
    
    def generate(self) -> NextSessionPrep:
        """Generate complete next session preparation."""
        complexity, time_estimate = self.estimate_complexity()
        
        prep = NextSessionPrep(
            generated_at=datetime.now().isoformat(),
            quick_resume=self.generate_quick_resume(),
            immediate_action=self.get_immediate_action(),
            roadmap_position=self.get_roadmap_position(),
            load_order=self.generate_load_order(),
            skills_needed=self.identify_skills_needed(),
            files_to_read=[str(ROADMAP_FILE), str(CURRENT_STATE_FILE)],
            warnings=self.get_warnings(),
            do_not_forget=self.get_do_not_forget(),
            complexity=complexity,
            estimated_time=time_estimate
        )
        
        return prep
    
    def save(self, prep: NextSessionPrep = None):
        """Save preparation to file."""
        if prep is None:
            prep = self.generate()
        self._save_json(NEXT_SESSION_FILE, prep.to_dict())
    
    def format_for_claude(self, prep: NextSessionPrep = None) -> str:
        """Format preparation for Claude context injection."""
        if prep is None:
            prep = self.generate()
        
        lines = [
            "=" * 60,
            "NEXT SESSION PREPARATION",
            "=" * 60,
            "",
            "QUICK RESUME:",
            prep.quick_resume,
            "",
            "-" * 40,
            f"IMMEDIATE ACTION: {prep.immediate_action}",
            "-" * 40,
            "",
            "LOAD ORDER:",
        ]
        
        for item in prep.load_order:
            required = "[REQUIRED]" if item.required else "[optional]"
            lines.append(f"  {item.priority}. {required} {item.description}")
            lines.append(f"     {item.tool} \"{item.path}\"")
        
        lines.extend([
            "",
            "WARNINGS:",
        ])
        for w in prep.warnings:
            lines.append(f"  ⚠ {w}")
        
        lines.extend([
            "",
            "DO NOT FORGET:",
        ])
        for item in prep.do_not_forget:
            lines.append(f"  ★ {item}")
        
        lines.extend([
            "",
            f"COMPLEXITY: {prep.complexity.value}",
            f"ESTIMATED TIME: {prep.estimated_time}",
            "=" * 60
        ])
        
        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="PRISM Next Session Preparer")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Generate command
    generate_parser = subparsers.add_parser("generate", help="Generate prep document")
    generate_parser.add_argument("--save", action="store_true", help="Save to file")
    generate_parser.add_argument("--json", action="store_true")
    generate_parser.add_argument("--claude", action="store_true", help="Format for Claude")
    
    # Quick resume command
    qr_parser = subparsers.add_parser("quick-resume", help="Just quick resume")
    
    # Load order command
    lo_parser = subparsers.add_parser("load-order", help="Just load order")
    lo_parser.add_argument("--json", action="store_true")
    
    # Complexity command
    cx_parser = subparsers.add_parser("complexity", help="Estimate complexity")
    cx_parser.add_argument("--json", action="store_true")
    
    # Action command
    action_parser = subparsers.add_parser("action", help="Get immediate action")
    
    args = parser.parse_args()
    preparer = NextSessionPreparer()
    
    if args.command == "generate":
        prep = preparer.generate()
        if args.save:
            preparer.save(prep)
            print(f"[+] Saved to {NEXT_SESSION_FILE}")
        
        if args.claude:
            print(preparer.format_for_claude(prep))
        elif args.json:
            print(json.dumps(prep.to_dict(), indent=2))
        else:
            print(preparer.format_for_claude(prep))
    
    elif args.command == "quick-resume":
        print(preparer.generate_quick_resume())
    
    elif args.command == "load-order":
        items = preparer.generate_load_order()
        if args.json:
            print(json.dumps([i.to_dict() for i in items], indent=2))
        else:
            print("Load Order:")
            for item in items:
                req = "[REQ]" if item.required else "[opt]"
                print(f"  {item.priority}. {req} {item.description}")
                print(f"     {item.tool} \"{item.path}\"")
    
    elif args.command == "complexity":
        complexity, time = preparer.estimate_complexity()
        if args.json:
            print(json.dumps({"complexity": complexity.value, "estimated_time": time}, indent=2))
        else:
            print(f"Complexity: {complexity.value}")
            print(f"Estimated time: {time}")
    
    elif args.command == "action":
        print(preparer.get_immediate_action())
    
    else:
        # Default: generate for Claude
        prep = preparer.generate()
        print(preparer.format_for_claude(prep))


if __name__ == "__main__":
    main()
