# PRISM Automation Toolkit - State Manager
# Version: 1.0.0
# Created: 2026-01-23
#
# Centralized state management for PRISM development.
# Handles CURRENT_STATE.json read/write with atomic operations.

import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SessionMeta:
    """Session metadata."""
    last_updated: str = ""
    last_session_id: str = ""
    next_session_id: str = ""
    session_count: int = 0


@dataclass
class CurrentWork:
    """Current work in progress."""
    phase: str = ""  # EXTRACTION, ARCHITECTURE, MIGRATION
    focus: str = ""  # Current task description
    status: str = "NOT_STARTED"  # NOT_STARTED, IN_PROGRESS, COMPLETE, PAUSED
    next_steps: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)


@dataclass
class ExtractionProgress:
    """Progress tracking for extraction phase."""
    databases: Dict[str, int] = field(default_factory=dict)  # category -> count
    engines: Dict[str, int] = field(default_factory=dict)
    knowledge_bases: int = 0
    systems: int = 0
    learning: int = 0
    business: int = 0
    ui: int = 0
    lookups: int = 0
    manufacturers: int = 0
    phases: int = 0
    total_extracted: int = 0
    total_target: int = 831


@dataclass
class MaterialsProgress:
    """Progress tracking for materials database."""
    total_materials: int = 0
    target_materials: int = 1047
    fully_parameterized: int = 0
    categories_complete: List[str] = field(default_factory=list)
    categories_in_progress: List[str] = field(default_factory=list)


@dataclass
class CompletedSession:
    """Record of a completed session."""
    session_id: str
    date: str
    focus: str
    status: str
    files_created: List[str] = field(default_factory=list)
    notes: str = ""


@dataclass
class PRISMState:
    """Complete PRISM development state."""
    meta: SessionMeta = field(default_factory=SessionMeta)
    current_work: CurrentWork = field(default_factory=CurrentWork)
    extraction_progress: ExtractionProgress = field(default_factory=ExtractionProgress)
    materials_progress: MaterialsProgress = field(default_factory=MaterialsProgress)
    completed_sessions: List[CompletedSession] = field(default_factory=list)
    architecture_decisions: Dict[str, Any] = field(default_factory=dict)
    quick_resume: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# STATE MANAGER CLASS
# =============================================================================

class StateManager:
    """Manages PRISM development state with atomic operations."""
    
    DEFAULT_STATE_PATH = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json")
    BACKUP_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\STATE_BACKUPS")
    
    def __init__(self, state_path: Path = None):
        self.state_path = state_path or self.DEFAULT_STATE_PATH
        self.logger = setup_logger('state_manager')
        self._state: Optional[PRISMState] = None
    
    @property
    def state(self) -> PRISMState:
        """Get current state, loading if necessary."""
        if self._state is None:
            self.load()
        return self._state
    
    def load(self) -> PRISMState:
        """Load state from file."""
        if self.state_path.exists():
            try:
                data = json.loads(self.state_path.read_text(encoding='utf-8'))
                self._state = self._dict_to_state(data)
                self.logger.info(f"Loaded state from {self.state_path}")
            except Exception as e:
                self.logger.error(f"Error loading state: {e}")
                self._state = PRISMState()
        else:
            self.logger.info("No state file found, creating new state")
            self._state = PRISMState()
        
        return self._state
    
    def save(self, backup: bool = True) -> bool:
        """
        Save state to file with atomic write.
        
        Args:
            backup: Create backup before saving
            
        Returns:
            True if successful
        """
        if self._state is None:
            self.logger.warning("No state to save")
            return False
        
        try:
            # Update timestamp
            self._state.meta.last_updated = timestamp()
            
            # Create backup if requested
            if backup and self.state_path.exists():
                self._create_backup()
            
            # Atomic write: write to temp file, then rename
            temp_path = self.state_path.with_suffix('.tmp')
            data = self._state_to_dict(self._state)
            
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            # Rename temp to actual (atomic on most systems)
            temp_path.replace(self.state_path)
            
            self.logger.info(f"Saved state to {self.state_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving state: {e}")
            return False
    
    def _create_backup(self):
        """Create timestamped backup of current state."""
        self.BACKUP_DIR.mkdir(exist_ok=True)
        backup_name = f"CURRENT_STATE_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = self.BACKUP_DIR / backup_name
        shutil.copy2(self.state_path, backup_path)
        self.logger.info(f"Created backup: {backup_path}")
        
        # Keep only last 20 backups
        backups = sorted(self.BACKUP_DIR.glob('CURRENT_STATE_*.json'))
        for old_backup in backups[:-20]:
            old_backup.unlink()
    
    def _state_to_dict(self, state: PRISMState) -> Dict:
        """Convert state to dictionary."""
        return {
            'meta': asdict(state.meta),
            'currentWork': asdict(state.current_work),
            'extractionProgress': asdict(state.extraction_progress),
            'materialsProgress': asdict(state.materials_progress),
            'completedSessions': [asdict(s) for s in state.completed_sessions],
            'architectureDecisions': state.architecture_decisions,
            'quickResume': state.quick_resume
        }
    
    def _dict_to_state(self, data: Dict) -> PRISMState:
        """Convert dictionary to state."""
        state = PRISMState()
        
        if 'meta' in data:
            state.meta = SessionMeta(**data['meta'])
        
        if 'currentWork' in data:
            state.current_work = CurrentWork(**data['currentWork'])
        
        if 'extractionProgress' in data:
            state.extraction_progress = ExtractionProgress(**data['extractionProgress'])
        
        if 'materialsProgress' in data:
            state.materials_progress = MaterialsProgress(**data['materialsProgress'])
        
        if 'completedSessions' in data:
            state.completed_sessions = [
                CompletedSession(**s) for s in data['completedSessions']
            ]
        
        state.architecture_decisions = data.get('architectureDecisions', {})
        state.quick_resume = data.get('quickResume', {})
        
        return state
    
    # ==========================================================================
    # CONVENIENCE METHODS
    # ==========================================================================
    
    def start_session(self, session_id: str, focus: str) -> None:
        """Mark start of a new session."""
        self.state.meta.last_session_id = session_id
        self.state.meta.session_count += 1
        self.state.current_work.status = "IN_PROGRESS"
        self.state.current_work.focus = focus
        self.save()
    
    def end_session(self, status: str = "COMPLETE", notes: str = "", files: List[str] = None) -> None:
        """Mark end of current session."""
        session = CompletedSession(
            session_id=self.state.meta.last_session_id,
            date=timestamp(),
            focus=self.state.current_work.focus,
            status=status,
            files_created=files or [],
            notes=notes
        )
        self.state.completed_sessions.append(session)
        self.state.current_work.status = status
        self.save()
    
    def set_next_steps(self, steps: List[str]) -> None:
        """Update next steps."""
        self.state.current_work.next_steps = steps
        self.save()
    
    def add_blocker(self, blocker: str) -> None:
        """Add a blocker."""
        self.state.current_work.blockers.append(blocker)
        self.save()
    
    def clear_blockers(self) -> None:
        """Clear all blockers."""
        self.state.current_work.blockers = []
        self.save()
    
    def update_extraction_count(self, category: str, count: int) -> None:
        """Update extraction progress for a category."""
        if hasattr(self.state.extraction_progress, category):
            setattr(self.state.extraction_progress, category, count)
        elif category in ['databases', 'engines']:
            # These are dicts
            pass
        self.state.extraction_progress.total_extracted = self._calculate_total_extracted()
        self.save()
    
    def _calculate_total_extracted(self) -> int:
        """Calculate total modules extracted."""
        ep = self.state.extraction_progress
        total = sum(ep.databases.values()) + sum(ep.engines.values())
        total += ep.knowledge_bases + ep.systems + ep.learning
        total += ep.business + ep.ui + ep.lookups + ep.manufacturers + ep.phases
        return total
    
    def update_materials(self, total: int = None, parameterized: int = None) -> None:
        """Update materials progress."""
        if total is not None:
            self.state.materials_progress.total_materials = total
        if parameterized is not None:
            self.state.materials_progress.fully_parameterized = parameterized
        self.save()
    
    def get_summary(self) -> str:
        """Get current state summary."""
        s = self.state
        lines = [
            "=" * 50,
            "PRISM STATE SUMMARY",
            "=" * 50,
            f"Last Updated: {s.meta.last_updated}",
            f"Session: {s.meta.last_session_id}",
            f"Phase: {s.current_work.phase}",
            f"Status: {s.current_work.status}",
            f"Focus: {s.current_work.focus}",
            "",
            "EXTRACTION:",
            f"  Total: {s.extraction_progress.total_extracted}/{s.extraction_progress.total_target}",
            "",
            "MATERIALS:",
            f"  Total: {s.materials_progress.total_materials}/{s.materials_progress.target_materials}",
            f"  Parameterized: {s.materials_progress.fully_parameterized}",
        ]
        
        if s.current_work.next_steps:
            lines.append("\nNEXT STEPS:")
            for step in s.current_work.next_steps[:5]:
                lines.append(f"  → {step}")
        
        if s.current_work.blockers:
            lines.append("\nBLOCKERS:")
            for b in s.current_work.blockers:
                lines.append(f"  ⚠ {b}")
        
        return "\n".join(lines)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for state manager."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM State Manager')
    parser.add_argument('action', choices=['view', 'start', 'end', 'update'])
    parser.add_argument('--session', type=str, help='Session ID')
    parser.add_argument('--focus', type=str, help='Session focus')
    parser.add_argument('--status', type=str, default='COMPLETE')
    
    args = parser.parse_args()
    
    mgr = StateManager()
    
    if args.action == 'view':
        print(mgr.get_summary())
    elif args.action == 'start':
        if args.session and args.focus:
            mgr.start_session(args.session, args.focus)
            print(f"Started session: {args.session}")
    elif args.action == 'end':
        mgr.end_session(args.status)
        print(f"Ended session with status: {args.status}")
    elif args.action == 'update':
        mgr.save()
        print("State saved")


if __name__ == "__main__":
    main()
