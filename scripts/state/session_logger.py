# PRISM Automation Toolkit - Session Logger
# Version: 1.0.0
# Created: 2026-01-23
#
# Logs session history and generates handoff documentation.
# Part of Toolkit 4: State Management

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, save_json


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SessionAction:
    """Single action taken during session."""
    timestamp: str
    action_type: str  # EXTRACT, CREATE, UPDATE, DELETE, VALIDATE
    target: str  # What was acted upon
    result: str  # SUCCESS, FAILED, PARTIAL
    details: str = ""


@dataclass
class SessionLog:
    """Complete log for a single session."""
    session_id: str
    start_time: str
    end_time: str = ""
    focus: str = ""
    objectives: List[str] = field(default_factory=list)
    completed: List[str] = field(default_factory=list)
    files_created: List[str] = field(default_factory=list)
    files_modified: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)
    actions: List[SessionAction] = field(default_factory=list)
    handoff_notes: str = ""
    next_session: str = ""


# =============================================================================
# SESSION LOGGER CLASS
# =============================================================================

class SessionLogger:
    """Logs session history and generates handoff documentation."""
    
    LOG_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS")
    
    def __init__(self):
        self.logger = setup_logger('session_logger')
        self.LOG_DIR.mkdir(exist_ok=True)
        self._current_log: Optional[SessionLog] = None
    
    @property
    def current_log(self) -> SessionLog:
        """Get current session log."""
        if self._current_log is None:
            raise ValueError("No active session. Call start_session() first.")
        return self._current_log
    
    def start_session(self, session_id: str, focus: str, objectives: List[str] = None) -> SessionLog:
        """
        Start a new session log.
        
        Args:
            session_id: Unique session identifier (e.g., "T.3.1")
            focus: What this session focuses on
            objectives: List of objectives to accomplish
            
        Returns:
            New SessionLog
        """
        self._current_log = SessionLog(
            session_id=session_id,
            start_time=timestamp(),
            focus=focus,
            objectives=objectives or []
        )
        self.logger.info(f"Started session: {session_id}")
        return self._current_log
    
    def log_action(self, action_type: str, target: str, result: str, details: str = "") -> None:
        """Log an action taken during the session."""
        action = SessionAction(
            timestamp=timestamp(),
            action_type=action_type,
            target=target,
            result=result,
            details=details
        )
        self.current_log.actions.append(action)
        self.logger.info(f"[{action_type}] {target}: {result}")
    
    def log_file_created(self, filepath: str) -> None:
        """Log that a file was created."""
        self.current_log.files_created.append(filepath)
        self.log_action("CREATE", filepath, "SUCCESS")
    
    def log_file_modified(self, filepath: str) -> None:
        """Log that a file was modified."""
        self.current_log.files_modified.append(filepath)
        self.log_action("UPDATE", filepath, "SUCCESS")
    
    def log_completed(self, item: str) -> None:
        """Log a completed objective/task."""
        self.current_log.completed.append(item)
        self.logger.info(f"Completed: {item}")
    
    def log_issue(self, issue: str) -> None:
        """Log an issue encountered."""
        self.current_log.issues.append(issue)
        self.logger.warning(f"Issue: {issue}")
    
    def end_session(self, handoff_notes: str = "", next_session: str = "") -> Path:
        """
        End the session and save the log.
        
        Args:
            handoff_notes: Notes for the next session
            next_session: ID of the next session
            
        Returns:
            Path to saved log file
        """
        self.current_log.end_time = timestamp()
        self.current_log.handoff_notes = handoff_notes
        self.current_log.next_session = next_session
        
        # Save log
        log_path = self._save_log()
        
        # Generate handoff document
        handoff_path = self._generate_handoff()
        
        self.logger.info(f"Ended session: {self.current_log.session_id}")
        self._current_log = None
        
        return log_path
    
    def _save_log(self) -> Path:
        """Save session log to JSON file."""
        filename = f"SESSION_{self.current_log.session_id.replace('.', '_')}_LOG.json"
        filepath = self.LOG_DIR / filename
        
        data = {
            'session_id': self.current_log.session_id,
            'start_time': self.current_log.start_time,
            'end_time': self.current_log.end_time,
            'focus': self.current_log.focus,
            'objectives': self.current_log.objectives,
            'completed': self.current_log.completed,
            'files_created': self.current_log.files_created,
            'files_modified': self.current_log.files_modified,
            'issues': self.current_log.issues,
            'actions': [
                {
                    'timestamp': a.timestamp,
                    'action_type': a.action_type,
                    'target': a.target,
                    'result': a.result,
                    'details': a.details
                }
                for a in self.current_log.actions
            ],
            'handoff_notes': self.current_log.handoff_notes,
            'next_session': self.current_log.next_session
        }
        
        save_json(data, filepath)
        return filepath
    
    def _generate_handoff(self) -> Path:
        """Generate markdown handoff document."""
        log = self.current_log
        filename = f"SESSION_{log.session_id.replace('.', '_')}_HANDOFF.md"
        filepath = self.LOG_DIR / filename
        
        lines = [
            f"# Session {log.session_id} Handoff",
            f"**Date:** {log.start_time[:10]}",
            f"**Focus:** {log.focus}",
            "",
            "## Objectives",
        ]
        
        for obj in log.objectives:
            status = "✓" if obj in log.completed else "☐"
            lines.append(f"- [{status}] {obj}")
        
        if log.completed:
            lines.extend(["", "## Completed"])
            for item in log.completed:
                lines.append(f"- ✓ {item}")
        
        if log.files_created:
            lines.extend(["", "## Files Created"])
            for f in log.files_created:
                lines.append(f"- `{f}`")
        
        if log.files_modified:
            lines.extend(["", "## Files Modified"])
            for f in log.files_modified:
                lines.append(f"- `{f}`")
        
        if log.issues:
            lines.extend(["", "## Issues Encountered"])
            for issue in log.issues:
                lines.append(f"- ⚠ {issue}")
        
        if log.handoff_notes:
            lines.extend(["", "## Handoff Notes", log.handoff_notes])
        
        if log.next_session:
            lines.extend(["", f"## Next Session: {log.next_session}"])
        
        lines.extend(["", "---", f"*Generated: {timestamp()}*"])
        
        filepath.write_text("\n".join(lines), encoding='utf-8')
        return filepath
    
    def load_session(self, session_id: str) -> Optional[SessionLog]:
        """Load a previous session log."""
        filename = f"SESSION_{session_id.replace('.', '_')}_LOG.json"
        filepath = self.LOG_DIR / filename
        
        if not filepath.exists():
            return None
        
        try:
            data = json.loads(filepath.read_text(encoding='utf-8'))
            log = SessionLog(
                session_id=data['session_id'],
                start_time=data['start_time'],
                end_time=data.get('end_time', ''),
                focus=data.get('focus', ''),
                objectives=data.get('objectives', []),
                completed=data.get('completed', []),
                files_created=data.get('files_created', []),
                files_modified=data.get('files_modified', []),
                issues=data.get('issues', []),
                handoff_notes=data.get('handoff_notes', ''),
                next_session=data.get('next_session', '')
            )
            return log
        except Exception as e:
            self.logger.error(f"Error loading session {session_id}: {e}")
            return None
    
    def list_sessions(self, limit: int = 20) -> List[Dict]:
        """List recent sessions."""
        log_files = sorted(self.LOG_DIR.glob('SESSION_*_LOG.json'), reverse=True)
        
        sessions = []
        for filepath in log_files[:limit]:
            try:
                data = json.loads(filepath.read_text(encoding='utf-8'))
                sessions.append({
                    'session_id': data.get('session_id'),
                    'date': data.get('start_time', '')[:10],
                    'focus': data.get('focus', ''),
                    'completed': len(data.get('completed', []))
                })
            except:
                pass
        
        return sessions
    
    def get_session_summary(self, session_id: str) -> str:
        """Get summary of a session."""
        log = self.load_session(session_id)
        if not log:
            return f"Session {session_id} not found"
        
        lines = [
            f"Session: {log.session_id}",
            f"Date: {log.start_time[:10]}",
            f"Focus: {log.focus}",
            f"Completed: {len(log.completed)}/{len(log.objectives)} objectives",
            f"Files Created: {len(log.files_created)}",
            f"Issues: {len(log.issues)}"
        ]
        return "\n".join(lines)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for session logger."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Session Logger')
    parser.add_argument('action', choices=['list', 'view', 'summary'])
    parser.add_argument('--session', type=str, help='Session ID')
    parser.add_argument('--limit', type=int, default=20)
    
    args = parser.parse_args()
    
    logger = SessionLogger()
    
    if args.action == 'list':
        sessions = logger.list_sessions(args.limit)
        print(f"{'Session':<15} {'Date':<12} {'Focus':<40} {'Done'}")
        print("-" * 75)
        for s in sessions:
            print(f"{s['session_id']:<15} {s['date']:<12} {s['focus'][:40]:<40} {s['completed']}")
    
    elif args.action == 'view' and args.session:
        log = logger.load_session(args.session)
        if log:
            print(f"Session: {log.session_id}")
            print(f"Focus: {log.focus}")
            print(f"Start: {log.start_time}")
            print(f"End: {log.end_time}")
            print(f"\nCompleted: {', '.join(log.completed)}")
            print(f"Files: {len(log.files_created)} created, {len(log.files_modified)} modified")
            if log.handoff_notes:
                print(f"\nHandoff: {log.handoff_notes}")
    
    elif args.action == 'summary' and args.session:
        print(logger.get_session_summary(args.session))


if __name__ == "__main__":
    main()
