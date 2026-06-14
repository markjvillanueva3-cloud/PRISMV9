#!/usr/bin/env python3
"""
RESUME_VALIDATOR.py - Session Resume Validation System
Validates resume context and determines optimal resume path.

Features:
- Detects resume scenario (continuation, fresh, compacted, etc.)
- Validates state consistency 
- Generates ordered resume actions
- Confidence scoring for resume quality

Usage:
    python resume_validator.py detect              # Detect resume scenario
    python resume_validator.py validate            # Validate current state
    python resume_validator.py generate            # Generate resume context
    python resume_validator.py actions             # Get resume actions

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
TRANSCRIPTS_DIR = Path("/mnt/transcripts")

CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"
QUICK_RESUME_FILE = STATE_DIR / "quick_resume.json"
LKG_FILE = STATE_DIR / "lkg_state.json"
EVENT_INDEX_FILE = STATE_DIR / "event_index.json"
CHECKPOINT_INDEX_FILE = STATE_DIR / "checkpoint_index.json"


class ResumeScenario(Enum):
    """Possible resume scenarios."""
    CONTINUATION = "CONTINUATION"        # Same session, no interruption
    RESUME_FRESH = "RESUME_FRESH"        # New chat, state intact
    RESUME_COMPACTED = "RESUME_COMPACTED"  # Context was compacted
    RESUME_INTERRUPTED = "RESUME_INTERRUPTED"  # Crashed mid-task
    NEW_START = "NEW_START"              # Fresh start, no prior state


class ContextLevel(Enum):
    """Context loading levels."""
    MINIMAL = "MINIMAL"    # Just quick resume text
    STANDARD = "STANDARD"  # State + roadmap + essential skills
    FULL = "FULL"          # All context including WIP
    DEEP = "DEEP"          # Full + historical context


@dataclass
class ValidationResult:
    """Result of resume validation."""
    valid: bool
    scenario: ResumeScenario
    confidence: float  # 0.0 to 1.0
    issues: List[str]
    warnings: List[str]
    suggestions: List[str]
    state_age_seconds: Optional[int] = None
    
    def to_dict(self) -> Dict:
        result = asdict(self)
        result["scenario"] = self.scenario.value
        return result


@dataclass
class ResumeAction:
    """Action to execute during resume."""
    order: int
    action: str
    tool: str
    params: Dict
    priority: str  # CRITICAL, HIGH, MEDIUM, LOW
    
    def to_dict(self) -> Dict:
        return asdict(self)


class ResumeValidator:
    """
    Validates and prepares session resume context.
    
    Detection logic:
    1. Check if transcript exists → RESUME_COMPACTED
    2. Check state age → if < 5min, CONTINUATION
    3. Check WIP files → if present, RESUME_INTERRUPTED
    4. Check state validity → if valid, RESUME_FRESH
    5. Otherwise → NEW_START
    """
    
    # Thresholds
    CONTINUATION_THRESHOLD_SECONDS = 300  # 5 minutes
    STALE_STATE_THRESHOLD_SECONDS = 7200  # 2 hours
    
    def __init__(self):
        self.state: Optional[Dict] = None
        self.roadmap: Optional[Dict] = None
        self.lkg: Optional[Dict] = None
        self._load_files()
    
    def _load_files(self):
        """Load state files."""
        self.state = self._load_json(CURRENT_STATE_FILE)
        self.roadmap = self._load_json(ROADMAP_FILE)
        self.lkg = self._load_json(LKG_FILE)
    
    def _load_json(self, path: Path) -> Optional[Dict]:
        """Safely load JSON file."""
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def _get_state_age_seconds(self) -> Optional[int]:
        """Get age of state in seconds."""
        if not self.state:
            return None
        
        last_updated = self.state.get("lastUpdated")
        if not last_updated:
            return None
        
        try:
            # Handle various timestamp formats
            last_updated_clean = last_updated.replace("Z", "")
            if "+" in last_updated_clean:
                last_updated_clean = last_updated_clean.split("+")[0]
            last_time = datetime.fromisoformat(last_updated_clean)
            now = datetime.now()
            return int((now - last_time).total_seconds())
        except ValueError:
            return None
    
    def _check_transcripts(self) -> Optional[Path]:
        """Check for recent transcripts (compaction indicator)."""
        if not TRANSCRIPTS_DIR.exists():
            return None
        
        transcripts = list(TRANSCRIPTS_DIR.glob("*.txt"))
        if not transcripts:
            return None
        
        # Get most recent
        latest = max(transcripts, key=lambda p: p.stat().st_mtime)
        
        # Check if recent (within 24 hours)
        mtime = datetime.fromtimestamp(latest.stat().st_mtime)
        if datetime.now() - mtime < timedelta(hours=24):
            return latest
        
        return None
    
    def _check_wip(self) -> List[Path]:
        """Check for work-in-progress files."""
        wip_patterns = [
            STATE_DIR / "wip_*.json",
            STATE_DIR / "*.wip",
            PRISM_ROOT / "scripts" / "*.partial"
        ]
        
        wip_files = []
        for pattern in wip_patterns:
            wip_files.extend(pattern.parent.glob(pattern.name))
        
        return wip_files
    
    def _validate_state_integrity(self) -> Tuple[bool, List[str]]:
        """Validate state file integrity."""
        issues = []
        
        if not self.state:
            issues.append("State file missing or unreadable")
            return False, issues
        
        # Required fields
        required = ["version", "lastUpdated", "currentSession"]
        for field in required:
            if field not in self.state:
                issues.append(f"Missing required field: {field}")
        
        # Check quick resume
        if not self.state.get("quickResume"):
            issues.append("Missing quickResume field")
        
        # Check current session
        session = self.state.get("currentSession", {})
        if not isinstance(session, dict):
            issues.append("currentSession is not a dict")
        elif not session.get("id"):
            issues.append("currentSession.id is missing")
        
        return len(issues) == 0, issues
    
    def _validate_roadmap_integrity(self) -> Tuple[bool, List[str]]:
        """Validate roadmap file integrity."""
        issues = []
        
        if not self.roadmap:
            issues.append("Roadmap file missing or unreadable")
            return False, issues
        
        required = ["current_tier", "current_session", "sessions"]
        for field in required:
            if field not in self.roadmap:
                issues.append(f"Missing roadmap field: {field}")
        
        return len(issues) == 0, issues
    
    def detect_scenario(self) -> Tuple[ResumeScenario, float, List[str]]:
        """
        Detect the resume scenario.
        
        Returns:
            (scenario, confidence, reasons)
        """
        reasons = []
        
        # Check for compaction (transcript exists)
        transcript = self._check_transcripts()
        if transcript:
            reasons.append(f"Found recent transcript: {transcript.name}")
            return ResumeScenario.RESUME_COMPACTED, 0.9, reasons
        
        # Check state age
        age = self._get_state_age_seconds()
        
        if age is None:
            # No valid state
            if not self.state:
                reasons.append("No state file found")
                return ResumeScenario.NEW_START, 1.0, reasons
            reasons.append("State has no timestamp")
            return ResumeScenario.NEW_START, 0.8, reasons
        
        # Continuation (very recent)
        if age < self.CONTINUATION_THRESHOLD_SECONDS:
            reasons.append(f"State is fresh ({age}s old)")
            return ResumeScenario.CONTINUATION, 0.95, reasons
        
        # Check for WIP (interrupted)
        wip_files = self._check_wip()
        if wip_files:
            reasons.append(f"Found {len(wip_files)} WIP files")
            return ResumeScenario.RESUME_INTERRUPTED, 0.85, reasons
        
        # Fresh resume (valid state, not too old)
        state_valid, _ = self._validate_state_integrity()
        if state_valid and age < self.STALE_STATE_THRESHOLD_SECONDS:
            reasons.append(f"Valid state, {age}s old")
            return ResumeScenario.RESUME_FRESH, 0.9, reasons
        
        # Stale state
        if age >= self.STALE_STATE_THRESHOLD_SECONDS:
            reasons.append(f"State is stale ({age}s old)")
            return ResumeScenario.RESUME_FRESH, 0.7, reasons
        
        # Default
        reasons.append("No specific scenario detected")
        return ResumeScenario.RESUME_FRESH, 0.6, reasons
    
    def validate(self) -> ValidationResult:
        """
        Full validation of resume context.
        
        Returns:
            ValidationResult with all details
        """
        issues = []
        warnings = []
        suggestions = []
        
        # Detect scenario
        scenario, confidence, reasons = self.detect_scenario()
        
        # Validate state
        state_valid, state_issues = self._validate_state_integrity()
        issues.extend(state_issues)
        
        # Validate roadmap
        roadmap_valid, roadmap_issues = self._validate_roadmap_integrity()
        issues.extend(roadmap_issues)
        
        # State age warning
        age = self._get_state_age_seconds()
        if age and age > 3600:  # > 1 hour
            warnings.append(f"State is {age // 60} minutes old")
        
        # LKG availability
        if not self.lkg or not self.lkg.get("current"):
            warnings.append("No LKG (Last Known Good) state available")
            suggestions.append("Run: python lkg_tracker.py mark")
        
        # Quick resume quality
        quick_resume = self.state.get("quickResume", "") if self.state else ""
        if len(quick_resume) < 50:
            warnings.append("quickResume is very short")
            suggestions.append("Update quickResume with more context")
        
        # Scenario-specific suggestions
        if scenario == ResumeScenario.RESUME_COMPACTED:
            suggestions.append("Read transcript for context recovery")
            suggestions.append("Run: python state_reconstructor.py")
        elif scenario == ResumeScenario.RESUME_INTERRUPTED:
            suggestions.append("Check WIP files for recovery")
            suggestions.append("Consider rollback to LKG if inconsistent")
        
        # Adjust confidence based on issues
        if issues:
            confidence *= 0.5
        if warnings:
            confidence *= 0.9
        
        return ValidationResult(
            valid=len(issues) == 0,
            scenario=scenario,
            confidence=confidence,
            issues=issues,
            warnings=warnings,
            suggestions=suggestions,
            state_age_seconds=age
        )
    
    def generate_resume_context(self, level: ContextLevel = ContextLevel.STANDARD) -> Dict:
        """
        Generate resume context for session start.
        
        Args:
            level: How much context to include
            
        Returns:
            Resume context dict matching QUICK_RESUME_SCHEMA
        """
        validation = self.validate()
        
        # Build quick resume section
        quick_resume = {
            "oneLiner": self._extract_one_liner(),
            "doing": self._extract_doing(),
            "stopped": self._extract_stopped(),
            "next": self._extract_next(),
            "blockers": self._extract_blockers()
        }
        
        # Build context section
        context = {
            "level": level.value,
            "roadmap": self._extract_roadmap_context(),
            "state": self._extract_state_context(),
            "skills": self._get_recommended_skills(),
            "files": self._get_relevant_files()
        }
        
        # Build actions
        actions = {
            "immediate": self._generate_immediate_actions(validation.scenario),
            "deferred": self._generate_deferred_actions(level)
        }
        
        # Build LKG section
        lkg = None
        if self.lkg and self.lkg.get("current"):
            lkg_current = self.lkg["current"]
            lkg = {
                "timestamp": lkg_current.get("marked_at"),
                "checkpointId": lkg_current.get("checkpoint_id"),
                "stateChecksum": lkg_current.get("state_checksum"),
                "validated": True
            }
        
        return {
            "meta": {
                "schema": "prism-quick-resume-v1",
                "generated": datetime.now().isoformat(),
                "scenario": validation.scenario.value,
                "confidence": validation.confidence
            },
            "quickResume": quick_resume,
            "context": context,
            "actions": actions,
            "lkg": lkg,
            "validation": validation.to_dict()
        }
    
    def _extract_one_liner(self) -> str:
        """Extract one-line summary."""
        if self.state and self.state.get("quickResume"):
            qr = self.state["quickResume"]
            if isinstance(qr, str):
                # Take first line
                return qr.split("\n")[0][:200]
        
        if self.roadmap:
            session = self.roadmap.get("current_session", "")
            name = self.roadmap.get("current_session_name", "")
            return f"Session {session}: {name}"
        
        return "PRISM session"
    
    def _extract_doing(self) -> str:
        """Extract what was being worked on."""
        if self.state:
            session = self.state.get("currentSession", {})
            if session.get("sessionName"):
                return f"Working on: {session['sessionName']}"
            
            qr = self.state.get("quickResume", "")
            if qr:
                return qr[:500]
        
        return "Session work"
    
    def _extract_stopped(self) -> str:
        """Extract why/where work stopped."""
        if self.state:
            session = self.state.get("currentSession", {})
            status = session.get("status", "UNKNOWN")
            return f"Status: {status}"
        return "Status unknown"
    
    def _extract_next(self) -> str:
        """Extract next action."""
        if self.roadmap:
            qr = self.roadmap.get("quick_resume", {})
            if qr.get("next_action"):
                return qr["next_action"]
        
        if self.state:
            next_session = self.state.get("nextSession", {})
            if next_session.get("name"):
                return f"Start: {next_session['name']}"
        
        return "Continue from last position"
    
    def _extract_blockers(self) -> List[str]:
        """Extract any blockers."""
        blockers = []
        if self.state and self.state.get("blockers"):
            blockers.extend(self.state["blockers"])
        return blockers
    
    def _extract_roadmap_context(self) -> Dict:
        """Extract roadmap position."""
        if not self.roadmap:
            return {}
        
        session_id = self.roadmap.get("current_session", "")
        sessions = self.roadmap.get("sessions", {})
        session_info = sessions.get(session_id, {})
        
        # Get pending deliverables
        deliverables = session_info.get("deliverables", [])
        pending = [d for d in deliverables if not d.endswith("✓")]
        
        return {
            "currentTier": self.roadmap.get("current_tier", 0),
            "currentSession": session_id,
            "sessionName": self.roadmap.get("current_session_name", ""),
            "sessionStatus": self.roadmap.get("session_status", ""),
            "deliverablesPending": pending[:10]  # Limit to 10
        }
    
    def _extract_state_context(self) -> Dict:
        """Extract state context."""
        if not self.state:
            return {}
        
        return {
            "version": self.state.get("version", ""),
            "lastEventSequence": 0,  # Would come from event_index
            "lastCheckpointId": ""   # Would come from checkpoint_index
        }
    
    def _get_recommended_skills(self) -> Dict:
        """Get recommended skills for resume."""
        # Core skills always needed
        required = [
            {"name": "prism-quick-start", "path": "/mnt/skills/user/prism-quick-start/SKILL.md", "priority": 1},
            {"name": "prism-session-master", "path": "/mnt/skills/user/prism-session-master/SKILL.md", "priority": 2}
        ]
        
        # Session-specific recommendations
        recommended = []
        if self.roadmap:
            session = self.roadmap.get("current_session", "")
            if session.startswith("0."):
                recommended.append({"name": "prism-state-manager", "priority": 3})
            elif "1." in session:
                recommended.append({"name": "prism-code-master", "priority": 3})
        
        return {
            "required": required,
            "recommended": recommended,
            "preloaded": []
        }
    
    def _get_relevant_files(self) -> Dict:
        """Get relevant files for resume."""
        must_read = [
            str(ROADMAP_FILE),
            str(CURRENT_STATE_FILE)
        ]
        
        # Check for recent modifications
        recently_modified = []
        scripts_dir = PRISM_ROOT / "scripts" / "core"
        if scripts_dir.exists():
            for f in scripts_dir.glob("*.py"):
                mtime = datetime.fromtimestamp(f.stat().st_mtime)
                if datetime.now() - mtime < timedelta(hours=24):
                    recently_modified.append(str(f))
        
        return {
            "mustRead": must_read,
            "recentlyModified": recently_modified[:5],
            "workInProgress": [str(p) for p in self._check_wip()]
        }
    
    def _generate_immediate_actions(self, scenario: ResumeScenario) -> List[Dict]:
        """Generate immediate actions based on scenario."""
        actions = []
        order = 1
        
        # Always read roadmap first
        actions.append({
            "order": order,
            "action": "Read roadmap",
            "tool": "Desktop Commander:read_file",
            "params": {"path": str(ROADMAP_FILE)},
            "priority": "CRITICAL"
        })
        order += 1
        
        # Always read state
        actions.append({
            "order": order,
            "action": "Read state",
            "tool": "Desktop Commander:read_file",
            "params": {"path": str(CURRENT_STATE_FILE)},
            "priority": "CRITICAL"
        })
        order += 1
        
        # Scenario-specific actions
        if scenario == ResumeScenario.RESUME_COMPACTED:
            transcript = self._check_transcripts()
            if transcript:
                actions.append({
                    "order": order,
                    "action": "Read transcript",
                    "tool": "view",
                    "params": {"path": str(transcript)},
                    "priority": "HIGH"
                })
                order += 1
        
        elif scenario == ResumeScenario.RESUME_INTERRUPTED:
            actions.append({
                "order": order,
                "action": "Check WIP",
                "tool": "Desktop Commander:list_directory",
                "params": {"path": str(STATE_DIR)},
                "priority": "HIGH"
            })
            order += 1
        
        return actions
    
    def _generate_deferred_actions(self, level: ContextLevel) -> List[str]:
        """Generate deferred actions."""
        deferred = []
        
        if level in [ContextLevel.FULL, ContextLevel.DEEP]:
            deferred.append("Load all recommended skills")
            deferred.append("Check event log for recent changes")
        
        if level == ContextLevel.DEEP:
            deferred.append("Review recent decisions")
            deferred.append("Check error history")
        
        return deferred
    
    def get_resume_actions(self) -> List[ResumeAction]:
        """Get ordered list of resume actions."""
        validation = self.validate()
        context = self.generate_resume_context()
        
        actions = []
        for action_dict in context["actions"]["immediate"]:
            actions.append(ResumeAction(
                order=action_dict["order"],
                action=action_dict["action"],
                tool=action_dict["tool"],
                params=action_dict["params"],
                priority=action_dict["priority"]
            ))
        
        return sorted(actions, key=lambda a: a.order)
    
    def save_resume_context(self, context: Dict = None):
        """Save resume context for fast access."""
        if context is None:
            context = self.generate_resume_context()
        
        with open(QUICK_RESUME_FILE, 'w', encoding='utf-8') as f:
            json.dump(context, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="PRISM Resume Validator")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Detect command
    detect_parser = subparsers.add_parser("detect", help="Detect resume scenario")
    detect_parser.add_argument("--json", action="store_true")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate resume state")
    validate_parser.add_argument("--json", action="store_true")
    
    # Generate command
    generate_parser = subparsers.add_parser("generate", help="Generate resume context")
    generate_parser.add_argument("--level", choices=["MINIMAL", "STANDARD", "FULL", "DEEP"],
                                 default="STANDARD")
    generate_parser.add_argument("--save", action="store_true")
    generate_parser.add_argument("--json", action="store_true")
    
    # Actions command
    actions_parser = subparsers.add_parser("actions", help="Get resume actions")
    actions_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    validator = ResumeValidator()
    
    if args.command == "detect":
        scenario, confidence, reasons = validator.detect_scenario()
        if args.json:
            print(json.dumps({
                "scenario": scenario.value,
                "confidence": confidence,
                "reasons": reasons
            }, indent=2))
        else:
            print(f"Scenario: {scenario.value}")
            print(f"Confidence: {confidence:.0%}")
            print("Reasons:")
            for r in reasons:
                print(f"  - {r}")
    
    elif args.command == "validate":
        result = validator.validate()
        if args.json:
            print(json.dumps(result.to_dict(), indent=2))
        else:
            status = "[+] VALID" if result.valid else "[X] INVALID"
            print(f"{status} ({result.scenario.value}, {result.confidence:.0%} confidence)")
            if result.issues:
                print("Issues:")
                for i in result.issues:
                    print(f"  [X] {i}")
            if result.warnings:
                print("Warnings:")
                for w in result.warnings:
                    print(f"  [!] {w}")
            if result.suggestions:
                print("Suggestions:")
                for s in result.suggestions:
                    print(f"  [>] {s}")
    
    elif args.command == "generate":
        level = ContextLevel(args.level)
        context = validator.generate_resume_context(level)
        
        if args.save:
            validator.save_resume_context(context)
            print(f"[+] Saved to {QUICK_RESUME_FILE}")
        
        if args.json or not args.save:
            print(json.dumps(context, indent=2))
    
    elif args.command == "actions":
        actions = validator.get_resume_actions()
        if args.json:
            print(json.dumps([a.to_dict() for a in actions], indent=2))
        else:
            print("Resume Actions:")
            for a in actions:
                print(f"  {a.order}. [{a.priority}] {a.action}")
                print(f"     {a.tool}: {a.params}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
