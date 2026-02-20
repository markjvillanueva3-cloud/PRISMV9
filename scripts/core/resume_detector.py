#!/usr/bin/env python3
"""
PRISM Resume Detector v1.0
Detects resume scenarios and determines the best way to continue work.

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System
Hook: CTX-COMPACT-003

Resume Scenarios:
1. CONTINUATION - Same session, normal continuation
2. RESUME_FRESH - New session, resume from state
3. RESUME_COMPACTED - Post-compaction, need reconstruction
4. RESUME_INTERRUPTED - Mid-task interruption
5. NEW_START - No prior context, fresh start

Usage:
    from resume_detector import ResumeDetector
    detector = ResumeDetector()
    scenario = detector.detect()
    # scenario.type, scenario.actions, scenario.context_needed
"""
import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"
TRANSCRIPTS_DIR = Path("/mnt/transcripts")


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

class ResumeScenario(Enum):
    """Types of resume scenarios."""
    CONTINUATION = "continuation"       # Same session, continue normally
    RESUME_FRESH = "resume_fresh"       # New session, state available
    RESUME_COMPACTED = "resume_compacted"  # Post-compaction recovery
    RESUME_INTERRUPTED = "resume_interrupted"  # Mid-task recovery
    NEW_START = "new_start"             # No prior context


@dataclass
class ContextRequirement:
    """Context needed for resume."""
    file: str
    priority: int  # 1=critical, 2=important, 3=helpful
    description: str
    available: bool = False


@dataclass
class ResumeAction:
    """Action to take for resume."""
    order: int
    action: str
    tool: str
    params: Dict[str, Any]
    reason: str


@dataclass 
class ResumeResult:
    """Complete resume detection result."""
    scenario: ResumeScenario
    confidence: float
    quick_resume: str
    actions: List[ResumeAction]
    context_needed: List[ContextRequirement]
    current_task: Optional[Dict[str, Any]]
    detected_at: str
    state_age_seconds: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario": self.scenario.value,
            "confidence": self.confidence,
            "quick_resume": self.quick_resume,
            "actions": [asdict(a) for a in self.actions],
            "context_needed": [asdict(c) for c in self.context_needed],
            "current_task": self.current_task,
            "detected_at": self.detected_at,
            "state_age_seconds": self.state_age_seconds
        }


# ═══════════════════════════════════════════════════════════════════════════
# RESUME DETECTOR
# ═══════════════════════════════════════════════════════════════════════════

class ResumeDetector:
    """
    Detects the appropriate resume scenario based on:
    
    1. State file presence and validity
    2. Task status (IN_PROGRESS, COMPLETE, etc.)
    3. Time since last checkpoint
    4. Compaction indicators
    5. Conversation context
    
    Outputs actionable resume instructions.
    """
    
    def __init__(self):
        self.state_data: Optional[Dict] = None
        self.roadmap_data: Optional[Dict] = None
        self.compaction_detected: bool = False
        
    def detect(self, compaction_result: Optional[Dict] = None) -> ResumeResult:
        """
        Detect resume scenario and generate actions.
        
        Args:
            compaction_result: Optional result from CompactionDetector
            
        Returns:
            ResumeResult with scenario and actions
        """
        # Load state files
        self._load_state()
        self._load_roadmap()
        
        # Check for compaction
        if compaction_result:
            self.compaction_detected = compaction_result.get('is_compacted', False)
        
        # Determine scenario
        scenario, confidence = self._determine_scenario()
        
        # Get quick resume
        quick_resume = self._get_quick_resume()
        
        # Generate actions for scenario
        actions = self._generate_actions(scenario)
        
        # Determine context requirements
        context_needed = self._get_context_requirements(scenario)
        
        # Get current task info
        current_task = self._get_current_task()
        
        # Calculate state age
        state_age = self._get_state_age()
        
        return ResumeResult(
            scenario=scenario,
            confidence=confidence,
            quick_resume=quick_resume,
            actions=actions,
            context_needed=context_needed,
            current_task=current_task,
            detected_at=datetime.now().isoformat(),
            state_age_seconds=state_age
        )
    
    def _load_state(self) -> None:
        """Load CURRENT_STATE.json."""
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    self.state_data = json.load(f)
        except Exception:
            self.state_data = None
    
    def _load_roadmap(self) -> None:
        """Load ROADMAP_TRACKER.json."""
        try:
            if ROADMAP_FILE.exists():
                with open(ROADMAP_FILE, 'r', encoding='utf-8') as f:
                    self.roadmap_data = json.load(f)
        except Exception:
            self.roadmap_data = None
    
    def _determine_scenario(self) -> Tuple[ResumeScenario, float]:
        """Determine the appropriate resume scenario."""
        
        # No state at all = new start
        if not self.state_data:
            return ResumeScenario.NEW_START, 0.95
        
        # Check for compaction
        if self.compaction_detected:
            return ResumeScenario.RESUME_COMPACTED, 0.9
        
        # Get current session info
        current_session = self.state_data.get('currentSession', {})
        status = current_session.get('status', 'UNKNOWN')
        
        # Check state age
        state_age = self._get_state_age()
        
        # IN_PROGRESS task with recent state = continuation
        if status == 'IN_PROGRESS' and state_age and state_age < 300:  # 5 minutes
            return ResumeScenario.CONTINUATION, 0.95
        
        # IN_PROGRESS but old state = interrupted
        if status == 'IN_PROGRESS' and state_age and state_age > 300:
            return ResumeScenario.RESUME_INTERRUPTED, 0.85
        
        # Has quick resume = fresh resume
        if self.state_data.get('quickResume'):
            return ResumeScenario.RESUME_FRESH, 0.9
        
        # Has state but unclear = fresh resume
        return ResumeScenario.RESUME_FRESH, 0.7
    
    def _get_quick_resume(self) -> str:
        """Extract quick resume text."""
        if self.state_data:
            qr = self.state_data.get('quickResume', '')
            if qr:
                return qr
        
        # Generate from roadmap if no quick resume
        if self.roadmap_data:
            current = self.roadmap_data.get('current_session', '0.1')
            name = self.roadmap_data.get('current_session_name', 'Unknown')
            return f"Session {current}: {name}. Start from roadmap."
        
        return "No quick resume available. Start fresh from ROADMAP_TRACKER.json."
    
    def _get_current_task(self) -> Optional[Dict[str, Any]]:
        """Get current task information."""
        if self.state_data:
            return self.state_data.get('currentSession')
        return None
    
    def _get_state_age(self) -> Optional[float]:
        """Get age of state in seconds."""
        if not self.state_data or 'lastUpdated' not in self.state_data:
            return None
        
        try:
            last_updated = datetime.fromisoformat(
                self.state_data['lastUpdated'].replace('Z', '+00:00')
            )
            age = datetime.now(last_updated.tzinfo) - last_updated
            return age.total_seconds()
        except Exception:
            return None
    
    def _generate_actions(self, scenario: ResumeScenario) -> List[ResumeAction]:
        """Generate actions for the given scenario."""
        actions_map = {
            ResumeScenario.CONTINUATION: self._actions_continuation,
            ResumeScenario.RESUME_FRESH: self._actions_resume_fresh,
            ResumeScenario.RESUME_COMPACTED: self._actions_resume_compacted,
            ResumeScenario.RESUME_INTERRUPTED: self._actions_resume_interrupted,
            ResumeScenario.NEW_START: self._actions_new_start,
        }
        
        return actions_map.get(scenario, self._actions_new_start)()
    
    def _actions_continuation(self) -> List[ResumeAction]:
        """Actions for normal continuation."""
        return [
            ResumeAction(
                order=1,
                action="Read quick resume",
                tool="internal",
                params={"field": "quickResume"},
                reason="Get 5-second context"
            ),
            ResumeAction(
                order=2,
                action="Continue current task",
                tool="none",
                params={},
                reason="Already in session"
            )
        ]
    
    def _actions_resume_fresh(self) -> List[ResumeAction]:
        """Actions for fresh resume."""
        return [
            ResumeAction(
                order=1,
                action="Read ROADMAP_TRACKER.json",
                tool="Filesystem:read_file",
                params={"path": str(ROADMAP_FILE)},
                reason="Get current session target"
            ),
            ResumeAction(
                order=2,
                action="Read CURRENT_STATE.json",
                tool="Filesystem:read_file",
                params={"path": str(STATE_FILE)},
                reason="Get quick resume and task status"
            ),
            ResumeAction(
                order=3,
                action="Load relevant skills",
                tool="view",
                params={"path": "/mnt/skills/user/"},
                reason="Context for current phase"
            ),
            ResumeAction(
                order=4,
                action="Execute from roadmap",
                tool="none",
                params={},
                reason="Begin session work"
            )
        ]
    
    def _actions_resume_compacted(self) -> List[ResumeAction]:
        """Actions for post-compaction resume."""
        return [
            ResumeAction(
                order=1,
                action="Read transcript",
                tool="view",
                params={"path": "/mnt/transcripts/"},
                reason="Find most recent transcript"
            ),
            ResumeAction(
                order=2,
                action="Run state reconstructor",
                tool="bash",
                params={"command": "python C:/PRISM/scripts/core/state_reconstructor.py --save"},
                reason="Rebuild state from sources"
            ),
            ResumeAction(
                order=3,
                action="Read ROADMAP_TRACKER.json",
                tool="Filesystem:read_file",
                params={"path": str(ROADMAP_FILE)},
                reason="Verify current session"
            ),
            ResumeAction(
                order=4,
                action="Read reconstructed state",
                tool="Filesystem:read_file",
                params={"path": str(STATE_FILE)},
                reason="Get recovered context"
            ),
            ResumeAction(
                order=5,
                action="Verify before continuing",
                tool="none",
                params={},
                reason="Confirm reconstruction accuracy"
            )
        ]
    
    def _actions_resume_interrupted(self) -> List[ResumeAction]:
        """Actions for interrupted session resume."""
        return [
            ResumeAction(
                order=1,
                action="Read CURRENT_STATE.json",
                tool="Filesystem:read_file",
                params={"path": str(STATE_FILE)},
                reason="Get interrupted task state"
            ),
            ResumeAction(
                order=2,
                action="Check for WIP files",
                tool="Filesystem:list_directory",
                params={"path": "C:/PRISM/wip"},
                reason="Find any saved work in progress"
            ),
            ResumeAction(
                order=3,
                action="Read ROADMAP_TRACKER.json",
                tool="Filesystem:read_file",
                params={"path": str(ROADMAP_FILE)},
                reason="Verify session expectations"
            ),
            ResumeAction(
                order=4,
                action="Resume from last step",
                tool="none",
                params={},
                reason="Continue interrupted work"
            )
        ]
    
    def _actions_new_start(self) -> List[ResumeAction]:
        """Actions for new start."""
        return [
            ResumeAction(
                order=1,
                action="Read ROADMAP_TRACKER.json",
                tool="Filesystem:read_file",
                params={"path": str(ROADMAP_FILE)},
                reason="Get session target"
            ),
            ResumeAction(
                order=2,
                action="Initialize CURRENT_STATE.json",
                tool="Filesystem:write_file",
                params={"path": str(STATE_FILE)},
                reason="Create initial state"
            ),
            ResumeAction(
                order=3,
                action="Load session skills",
                tool="view",
                params={"path": "/mnt/skills/user/prism-session-master/SKILL.md"},
                reason="Session management context"
            ),
            ResumeAction(
                order=4,
                action="Begin session 0.1",
                tool="none",
                params={},
                reason="Start first session"
            )
        ]
    
    def _get_context_requirements(self, scenario: ResumeScenario) -> List[ContextRequirement]:
        """Determine context requirements for scenario."""
        base_requirements = [
            ContextRequirement(
                file=str(ROADMAP_FILE),
                priority=1,
                description="Current session and deliverables",
                available=ROADMAP_FILE.exists()
            ),
            ContextRequirement(
                file=str(STATE_FILE),
                priority=1,
                description="Quick resume and task status",
                available=STATE_FILE.exists()
            ),
        ]
        
        if scenario == ResumeScenario.RESUME_COMPACTED:
            base_requirements.append(ContextRequirement(
                file=str(TRANSCRIPTS_DIR),
                priority=1,
                description="Transcript for reconstruction",
                available=TRANSCRIPTS_DIR.exists()
            ))
        
        if scenario in [ResumeScenario.RESUME_FRESH, ResumeScenario.NEW_START]:
            base_requirements.append(ContextRequirement(
                file="/mnt/skills/user/prism-session-master/SKILL.md",
                priority=2,
                description="Session management protocols",
                available=Path("/mnt/skills/user/prism-session-master").exists()
            ))
        
        return base_requirements


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Run resume detection from command line."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PRISM Resume Detector - Detects resume scenarios"
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON'
    )
    parser.add_argument(
        '--compaction-detected',
        action='store_true',
        help='Indicate that compaction was detected'
    )
    
    args = parser.parse_args()
    
    compaction_result = {'is_compacted': args.compaction_detected} if args.compaction_detected else None
    
    detector = ResumeDetector()
    result = detector.detect(compaction_result)
    
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print("\n" + "="*60)
        print("PRISM RESUME DETECTOR RESULTS")
        print("="*60)
        print(f"\nScenario: {result.scenario.value}")
        print(f"Confidence: {result.confidence:.1%}")
        
        if result.state_age_seconds is not None:
            age_mins = result.state_age_seconds / 60
            print(f"State age: {age_mins:.1f} minutes")
        
        print(f"\n--- QUICK RESUME ---")
        print(result.quick_resume)
        
        print(f"\n--- ACTIONS ({len(result.actions)}) ---")
        for action in result.actions:
            print(f"{action.order}. {action.action}")
            print(f"   Tool: {action.tool}")
            print(f"   Reason: {action.reason}")
        
        print(f"\n--- CONTEXT NEEDED ({len(result.context_needed)}) ---")
        for ctx in result.context_needed:
            status = "✓" if ctx.available else "✗"
            print(f"[P{ctx.priority}] {status} {ctx.file}")
            print(f"      {ctx.description}")
        
        print("\n" + "="*60)


if __name__ == "__main__":
    main()
