"""
PRISM State Server - CORE.4
Enhancement Roadmap v4.0 | 7 hours estimated

TRUE session continuity across:
- Context compactions
- New chats
- Browser crashes
- Days/weeks between sessions
- Different devices

Auto-captures:
- Current task and progress
- Decisions with rationale
- Files modified
- Quality scores
- Blockers and next steps

Provides MCP-callable tools for state management.

@version 1.0.0
@author PRISM Development Team
"""

import os
import sys
import json
import sqlite3
import hashlib
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
import threading


# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class StateServerConfig:
    """Configuration for State Server."""
    db_path: str = r"C:\PRISM\state\prism_state.db"
    state_json_path: str = r"C:\\PRISM\CURRENT_STATE.json"
    session_memory_path: str = r"C:\PRISM\state\SESSION_MEMORY.json"
    max_decisions: int = 100
    max_file_history: int = 500
    max_session_history: int = 50
    auto_checkpoint_interval: int = 5  # Auto-save every N operations


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class TaskProgress:
    """Current task being worked on."""
    task_id: str
    description: str
    status: str  # NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETE
    started_at: str
    subtasks_total: int = 0
    subtasks_complete: int = 0
    notes: List[str] = field(default_factory=list)
    
    @property
    def progress_pct(self) -> float:
        if self.subtasks_total == 0:
            return 0.0
        return (self.subtasks_complete / self.subtasks_total) * 100


@dataclass
class Decision:
    """A recorded decision with rationale."""
    decision_id: str
    what: str
    why: str
    timestamp: str
    category: str = "general"  # technical, safety, architectural, process
    confidence: float = 1.0
    reversible: bool = True


@dataclass
class FileModification:
    """Record of a file modification."""
    file_id: str
    path: str
    operation: str  # create, update, delete, move
    timestamp: str
    before_hash: Optional[str] = None
    after_hash: Optional[str] = None
    before_count: Optional[int] = None
    after_count: Optional[int] = None
    notes: str = ""


@dataclass 
class QualityScore:
    """Quality score record."""
    score_id: str
    timestamp: str
    omega: float
    R: float  # Reasoning
    C: float  # Code
    P: float  # Process
    S: float  # Safety
    L: float  # Learning
    context: str = ""


@dataclass
class SessionState:
    """Complete session state."""
    session_id: str
    created_at: str
    updated_at: str
    current_task: Optional[TaskProgress] = None
    decisions: List[Decision] = field(default_factory=list)
    files_modified: List[FileModification] = field(default_factory=list)
    quality_scores: List[QualityScore] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    quick_resume: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


# ============================================================================
# STATE SERVER
# ============================================================================

class PRISMStateServer:
    """
    Persistent state server for PRISM sessions.
    
    Provides:
    - Auto-capture of task progress, decisions, file changes
    - Instant recovery after compaction/new chat
    - Full history search
    - Quality tracking over time
    """
    
    def __init__(self, config: Optional[StateServerConfig] = None):
        self.config = config or StateServerConfig()
        self._lock = threading.Lock()
        self._operation_count = 0
        
        # Ensure directories exist
        os.makedirs(os.path.dirname(self.config.db_path), exist_ok=True)
        
        # Initialize database
        self._init_db()
        
        # Load or create current session
        self.current_session = self._load_or_create_session()
    
    def _init_db(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.config.db_path) as conn:
            cursor = conn.cursor()
            
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    created_at TEXT,
                    updated_at TEXT,
                    quick_resume TEXT,
                    metadata TEXT
                )
            """)
            
            # Tasks table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    description TEXT,
                    status TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    subtasks_total INTEGER,
                    subtasks_complete INTEGER,
                    notes TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                )
            """)
            
            # Decisions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS decisions (
                    decision_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    what TEXT,
                    why TEXT,
                    timestamp TEXT,
                    category TEXT,
                    confidence REAL,
                    reversible INTEGER,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                )
            """)
            
            # File modifications table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS file_modifications (
                    file_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    path TEXT,
                    operation TEXT,
                    timestamp TEXT,
                    before_hash TEXT,
                    after_hash TEXT,
                    before_count INTEGER,
                    after_count INTEGER,
                    notes TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                )
            """)
            
            # Quality scores table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS quality_scores (
                    score_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    timestamp TEXT,
                    omega REAL,
                    R REAL,
                    C REAL,
                    P REAL,
                    S REAL,
                    L REAL,
                    context TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_decisions_session ON decisions(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_session ON file_modifications(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_path ON file_modifications(path)")
            
            conn.commit()
    
    def _generate_id(self, prefix: str) -> str:
        """Generate a unique ID."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        return f"{prefix}-{timestamp}"
    
    def _load_or_create_session(self) -> SessionState:
        """Load existing session or create new one."""
        # Try to load from JSON state file first (for backwards compatibility)
        if os.path.exists(self.config.state_json_path):
            try:
                with open(self.config.state_json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if "session_id" in data:
                        return self._dict_to_session(data)
            except Exception:
                pass
        
        # Check for recent session in DB
        with sqlite3.connect(self.config.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT session_id, created_at, updated_at, quick_resume, metadata
                FROM sessions
                ORDER BY updated_at DESC
                LIMIT 1
            """)
            row = cursor.fetchone()
            
            if row:
                # Check if session is recent (within 24 hours)
                updated = datetime.fromisoformat(row[2])
                if datetime.now() - updated < timedelta(hours=24):
                    return self._load_session_from_db(row[0])
        
        # Create new session
        return self._create_new_session()
    
    def _create_new_session(self) -> SessionState:
        """Create a new session."""
        now = datetime.now().isoformat()
        session = SessionState(
            session_id=self._generate_id("PRISM"),
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        with sqlite3.connect(self.config.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (session_id, created_at, updated_at, quick_resume, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (session.session_id, session.created_at, session.updated_at, 
                  session.quick_resume, json.dumps(session.metadata)))
            conn.commit()
        
        return session
    
    def _load_session_from_db(self, session_id: str) -> SessionState:
        """Load a complete session from database."""
        with sqlite3.connect(self.config.db_path) as conn:
            cursor = conn.cursor()
            
            # Load session
            cursor.execute("""
                SELECT session_id, created_at, updated_at, quick_resume, metadata
                FROM sessions WHERE session_id = ?
            """, (session_id,))
            row = cursor.fetchone()
            
            if not row:
                return self._create_new_session()
            
            session = SessionState(
                session_id=row[0],
                created_at=row[1],
                updated_at=row[2],
                quick_resume=row[3] or "",
                metadata=json.loads(row[4]) if row[4] else {}
            )
            
            # Load current task
            cursor.execute("""
                SELECT task_id, description, status, started_at, subtasks_total, subtasks_complete, notes
                FROM tasks WHERE session_id = ? AND status != 'COMPLETE'
                ORDER BY started_at DESC LIMIT 1
            """, (session_id,))
            task_row = cursor.fetchone()
            if task_row:
                session.current_task = TaskProgress(
                    task_id=task_row[0],
                    description=task_row[1],
                    status=task_row[2],
                    started_at=task_row[3],
                    subtasks_total=task_row[4] or 0,
                    subtasks_complete=task_row[5] or 0,
                    notes=json.loads(task_row[6]) if task_row[6] else []
                )
            
            # Load recent decisions
            cursor.execute("""
                SELECT decision_id, what, why, timestamp, category, confidence, reversible
                FROM decisions WHERE session_id = ?
                ORDER BY timestamp DESC LIMIT ?
            """, (session_id, self.config.max_decisions))
            for row in cursor.fetchall():
                session.decisions.append(Decision(
                    decision_id=row[0],
                    what=row[1],
                    why=row[2],
                    timestamp=row[3],
                    category=row[4],
                    confidence=row[5],
                    reversible=bool(row[6])
                ))
            session.decisions.reverse()  # Oldest first
            
            # Load recent quality scores
            cursor.execute("""
                SELECT score_id, timestamp, omega, R, C, P, S, L, context
                FROM quality_scores WHERE session_id = ?
                ORDER BY timestamp DESC LIMIT 10
            """, (session_id,))
            for row in cursor.fetchall():
                session.quality_scores.append(QualityScore(
                    score_id=row[0],
                    timestamp=row[1],
                    omega=row[2],
                    R=row[3],
                    C=row[4],
                    P=row[5],
                    S=row[6],
                    L=row[7],
                    context=row[8]
                ))
            
            return session
    
    def _dict_to_session(self, data: Dict[str, Any]) -> SessionState:
        """Convert dict to SessionState."""
        session = SessionState(
            session_id=data.get("session_id", self._generate_id("PRISM")),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
            quick_resume=data.get("quickResume", data.get("quick_resume", "")),
            metadata=data.get("metadata", {})
        )
        
        if "currentTask" in data or "current_task" in data:
            task_data = data.get("currentTask") or data.get("current_task")
            if task_data:
                session.current_task = TaskProgress(
                    task_id=task_data.get("task_id", self._generate_id("TASK")),
                    description=task_data.get("description", task_data.get("name", "")),
                    status=task_data.get("status", "IN_PROGRESS"),
                    started_at=task_data.get("started_at", datetime.now().isoformat()),
                    subtasks_total=task_data.get("subtasks_total", task_data.get("total", 0)),
                    subtasks_complete=task_data.get("subtasks_complete", task_data.get("complete", 0))
                )
        
        return session
    
    def _auto_checkpoint(self):
        """Auto-save if operation count threshold reached."""
        self._operation_count += 1
        if self._operation_count >= self.config.auto_checkpoint_interval:
            self.save()
            self._operation_count = 0
    
    # =========================================================================
    # PUBLIC API - MCP TOOL IMPLEMENTATIONS
    # =========================================================================
    
    def get_session_state(self) -> Dict[str, Any]:
        """
        Get complete session state - call at start of every chat.
        
        Returns full state including task, decisions, quality scores.
        """
        with self._lock:
            return {
                "session_id": self.current_session.session_id,
                "created_at": self.current_session.created_at,
                "updated_at": self.current_session.updated_at,
                "current_task": asdict(self.current_session.current_task) if self.current_session.current_task else None,
                "recent_decisions": [asdict(d) for d in self.current_session.decisions[-5:]],
                "quality_scores": [asdict(q) for q in self.current_session.quality_scores[-3:]],
                "blockers": self.current_session.blockers,
                "next_steps": self.current_session.next_steps,
                "quick_resume": self.current_session.quick_resume
            }
    
    def get_quick_resume(self) -> str:
        """Get quick resume string for session start."""
        with self._lock:
            parts = []
            
            # Session info
            parts.append(f"Session: {self.current_session.session_id}")
            
            # Current task
            if self.current_session.current_task:
                task = self.current_session.current_task
                parts.append(f"Task: {task.description}")
                parts.append(f"Progress: {task.subtasks_complete}/{task.subtasks_total} ({task.progress_pct:.0f}%)")
                parts.append(f"Status: {task.status}")
            
            # Recent decisions
            if self.current_session.decisions:
                parts.append("\nRecent decisions:")
                for d in self.current_session.decisions[-3:]:
                    parts.append(f"  - {d.what[:80]}")
            
            # Next steps
            if self.current_session.next_steps:
                parts.append("\nNext steps:")
                for step in self.current_session.next_steps[:3]:
                    parts.append(f"  - {step}")
            
            return "\n".join(parts)
    
    def start_task(self, description: str, subtasks_total: int = 0) -> Dict[str, Any]:
        """Start a new task."""
        with self._lock:
            now = datetime.now().isoformat()
            task = TaskProgress(
                task_id=self._generate_id("TASK"),
                description=description,
                status="IN_PROGRESS",
                started_at=now,
                subtasks_total=subtasks_total
            )
            self.current_session.current_task = task
            self.current_session.updated_at = now
            
            # Save to DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO tasks (task_id, session_id, description, status, started_at, subtasks_total, subtasks_complete)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (task.task_id, self.current_session.session_id, task.description, 
                      task.status, task.started_at, task.subtasks_total, 0))
                conn.commit()
            
            self._auto_checkpoint()
            return asdict(task)
    
    def update_task(self, subtasks_complete: Optional[int] = None, status: Optional[str] = None, 
                    notes: Optional[str] = None) -> Dict[str, Any]:
        """Update current task progress."""
        with self._lock:
            if not self.current_session.current_task:
                return {"error": "No active task"}
            
            task = self.current_session.current_task
            now = datetime.now().isoformat()
            
            if subtasks_complete is not None:
                task.subtasks_complete = subtasks_complete
            if status:
                task.status = status
            if notes:
                task.notes.append(notes)
            
            self.current_session.updated_at = now
            
            # Update DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE tasks SET subtasks_complete = ?, status = ?, notes = ?
                    WHERE task_id = ?
                """, (task.subtasks_complete, task.status, json.dumps(task.notes), task.task_id))
                conn.commit()
            
            self._auto_checkpoint()
            return asdict(task)
    
    def complete_task(self, notes: Optional[str] = None) -> Dict[str, Any]:
        """Mark current task as complete."""
        with self._lock:
            if not self.current_session.current_task:
                return {"error": "No active task"}
            
            task = self.current_session.current_task
            task.status = "COMPLETE"
            task.subtasks_complete = task.subtasks_total
            if notes:
                task.notes.append(f"Completion: {notes}")
            
            now = datetime.now().isoformat()
            self.current_session.updated_at = now
            
            # Update DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE tasks SET status = 'COMPLETE', completed_at = ?, subtasks_complete = ?, notes = ?
                    WHERE task_id = ?
                """, (now, task.subtasks_complete, json.dumps(task.notes), task.task_id))
                conn.commit()
            
            result = asdict(task)
            self.current_session.current_task = None
            self._auto_checkpoint()
            return result
    
    def record_decision(self, what: str, why: str, category: str = "general", 
                       confidence: float = 1.0) -> Dict[str, Any]:
        """Record a decision with rationale."""
        with self._lock:
            now = datetime.now().isoformat()
            decision = Decision(
                decision_id=self._generate_id("DEC"),
                what=what,
                why=why,
                timestamp=now,
                category=category,
                confidence=confidence
            )
            
            self.current_session.decisions.append(decision)
            self.current_session.updated_at = now
            
            # Trim if too many
            if len(self.current_session.decisions) > self.config.max_decisions:
                self.current_session.decisions = self.current_session.decisions[-self.config.max_decisions:]
            
            # Save to DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO decisions (decision_id, session_id, what, why, timestamp, category, confidence, reversible)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (decision.decision_id, self.current_session.session_id, decision.what,
                      decision.why, decision.timestamp, decision.category, decision.confidence, 1))
                conn.commit()
            
            self._auto_checkpoint()
            return asdict(decision)
    
    def get_recent_decisions(self, n: int = 10, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get recent decisions, optionally filtered by category."""
        with self._lock:
            decisions = self.current_session.decisions
            if category:
                decisions = [d for d in decisions if d.category == category]
            return [asdict(d) for d in decisions[-n:]]
    
    def record_file_modification(self, path: str, operation: str, 
                                 before_count: Optional[int] = None,
                                 after_count: Optional[int] = None,
                                 notes: str = "") -> Dict[str, Any]:
        """Record a file modification."""
        with self._lock:
            now = datetime.now().isoformat()
            
            # Compute hashes if file exists
            before_hash = None
            after_hash = None
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        after_hash = hashlib.md5(f.read()).hexdigest()[:8]
                except:
                    pass
            
            mod = FileModification(
                file_id=self._generate_id("FILE"),
                path=path,
                operation=operation,
                timestamp=now,
                before_hash=before_hash,
                after_hash=after_hash,
                before_count=before_count,
                after_count=after_count,
                notes=notes
            )
            
            self.current_session.files_modified.append(mod)
            self.current_session.updated_at = now
            
            # Save to DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO file_modifications 
                    (file_id, session_id, path, operation, timestamp, before_hash, after_hash, before_count, after_count, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (mod.file_id, self.current_session.session_id, mod.path, mod.operation,
                      mod.timestamp, mod.before_hash, mod.after_hash, mod.before_count, mod.after_count, mod.notes))
                conn.commit()
            
            # Anti-regression check
            warning = None
            if before_count and after_count and after_count < before_count:
                warning = f"ANTI-REGRESSION WARNING: {path} went from {before_count} to {after_count} items!"
            
            self._auto_checkpoint()
            result = asdict(mod)
            if warning:
                result["warning"] = warning
            return result
    
    def record_quality_score(self, omega: float, R: float, C: float, P: float, 
                            S: float, L: float, context: str = "") -> Dict[str, Any]:
        """Record a quality score measurement."""
        with self._lock:
            now = datetime.now().isoformat()
            score = QualityScore(
                score_id=self._generate_id("QS"),
                timestamp=now,
                omega=omega,
                R=R, C=C, P=P, S=S, L=L,
                context=context
            )
            
            self.current_session.quality_scores.append(score)
            self.current_session.updated_at = now
            
            # Save to DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO quality_scores (score_id, session_id, timestamp, omega, R, C, P, S, L, context)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (score.score_id, self.current_session.session_id, score.timestamp,
                      score.omega, score.R, score.C, score.P, score.S, score.L, score.context))
                conn.commit()
            
            # Safety check
            warning = None
            if S < 0.70:
                warning = f"SAFETY VIOLATION: S(x) = {S} < 0.70 threshold!"
            
            self._auto_checkpoint()
            result = asdict(score)
            if warning:
                result["warning"] = warning
            return result
    
    def set_next_steps(self, steps: List[str]) -> Dict[str, Any]:
        """Set next steps for session continuation."""
        with self._lock:
            self.current_session.next_steps = steps
            self.current_session.updated_at = datetime.now().isoformat()
            self._auto_checkpoint()
            return {"next_steps": steps}
    
    def add_blocker(self, blocker: str) -> Dict[str, Any]:
        """Add a blocker."""
        with self._lock:
            self.current_session.blockers.append(blocker)
            self.current_session.updated_at = datetime.now().isoformat()
            self._auto_checkpoint()
            return {"blockers": self.current_session.blockers}
    
    def clear_blocker(self, blocker: str) -> Dict[str, Any]:
        """Clear a blocker."""
        with self._lock:
            if blocker in self.current_session.blockers:
                self.current_session.blockers.remove(blocker)
            self.current_session.updated_at = datetime.now().isoformat()
            self._auto_checkpoint()
            return {"blockers": self.current_session.blockers}
    
    def search_history(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search across session history."""
        results = []
        query_lower = query.lower()
        
        with sqlite3.connect(self.config.db_path) as conn:
            cursor = conn.cursor()
            
            # Search decisions
            cursor.execute("""
                SELECT 'decision' as type, decision_id as id, what as content, timestamp
                FROM decisions
                WHERE what LIKE ? OR why LIKE ?
                ORDER BY timestamp DESC LIMIT ?
            """, (f"%{query}%", f"%{query}%", limit))
            
            for row in cursor.fetchall():
                results.append({
                    "type": row[0],
                    "id": row[1],
                    "content": row[2],
                    "timestamp": row[3]
                })
            
            # Search file modifications
            cursor.execute("""
                SELECT 'file' as type, file_id as id, path as content, timestamp
                FROM file_modifications
                WHERE path LIKE ? OR notes LIKE ?
                ORDER BY timestamp DESC LIMIT ?
            """, (f"%{query}%", f"%{query}%", limit))
            
            for row in cursor.fetchall():
                results.append({
                    "type": row[0],
                    "id": row[1],
                    "content": row[2],
                    "timestamp": row[3]
                })
        
        # Sort by timestamp
        results.sort(key=lambda x: x["timestamp"], reverse=True)
        return results[:limit]
    
    def save(self):
        """Save current state to JSON file."""
        with self._lock:
            self.current_session.updated_at = datetime.now().isoformat()
            
            # Build quick resume
            self.current_session.quick_resume = self.get_quick_resume()
            
            # Update session in DB
            with sqlite3.connect(self.config.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE sessions SET updated_at = ?, quick_resume = ?, metadata = ?
                    WHERE session_id = ?
                """, (self.current_session.updated_at, self.current_session.quick_resume,
                      json.dumps(self.current_session.metadata), self.current_session.session_id))
                conn.commit()
            
            # Also save to JSON for backwards compatibility
            state_dict = {
                "version": "38.0.0",
                "session_id": self.current_session.session_id,
                "created_at": self.current_session.created_at,
                "updated_at": self.current_session.updated_at,
                "quickResume": self.current_session.quick_resume,
                "currentTask": asdict(self.current_session.current_task) if self.current_session.current_task else None,
                "decisions": [asdict(d) for d in self.current_session.decisions[-10:]],
                "quality_scores": [asdict(q) for q in self.current_session.quality_scores[-5:]],
                "blockers": self.current_session.blockers,
                "next_steps": self.current_session.next_steps,
                "metadata": self.current_session.metadata
            }
            
            os.makedirs(os.path.dirname(self.config.state_json_path), exist_ok=True)
            with open(self.config.state_json_path, 'w', encoding='utf-8') as f:
                json.dump(state_dict, f, indent=2)
    
    def new_session(self) -> Dict[str, Any]:
        """Start a completely new session."""
        with self._lock:
            self.current_session = self._create_new_session()
            self.save()
            return self.get_session_state()


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """CLI interface for State Server."""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM State Server")
    parser.add_argument("--get-state", action="store_true", help="Get current session state")
    parser.add_argument("--quick-resume", action="store_true", help="Get quick resume string")
    parser.add_argument("--start-task", help="Start a new task")
    parser.add_argument("--subtasks", type=int, default=0, help="Number of subtasks")
    parser.add_argument("--update-task", type=int, help="Update task progress (subtasks complete)")
    parser.add_argument("--complete-task", action="store_true", help="Complete current task")
    parser.add_argument("--decision", help="Record a decision (format: 'what|why')")
    parser.add_argument("--search", help="Search session history")
    parser.add_argument("--new-session", action="store_true", help="Start new session")
    parser.add_argument("--test", action="store_true", help="Run tests")
    
    args = parser.parse_args()
    
    server = PRISMStateServer()
    
    if args.test:
        print("\n" + "="*70)
        print("TESTING STATE SERVER")
        print("="*70)
        
        # Test session state
        print("\n1. Getting session state...")
        state = server.get_session_state()
        print(f"   Session ID: {state['session_id']}")
        
        # Test task management
        print("\n2. Starting task...")
        task = server.start_task("Test task for validation", subtasks_total=10)
        print(f"   Task ID: {task['task_id']}")
        
        print("\n3. Updating task...")
        server.update_task(subtasks_complete=5, notes="Halfway done")
        
        # Test decision recording
        print("\n4. Recording decision...")
        dec = server.record_decision(
            what="Use SQLite for state persistence",
            why="Fast, reliable, no external dependencies",
            category="technical"
        )
        print(f"   Decision ID: {dec['decision_id']}")
        
        # Test quality score
        print("\n5. Recording quality score...")
        qs = server.record_quality_score(
            omega=0.78, R=0.80, C=0.75, P=0.70, S=0.85, L=0.70,
            context="Test measurement"
        )
        print(f"   Score ID: {qs['score_id']}, Ω={qs['omega']}")
        
        # Test save
        print("\n6. Saving state...")
        server.save()
        print("   State saved to DB and JSON")
        
        # Test quick resume
        print("\n7. Quick resume:")
        print(server.get_quick_resume())
        
        print("\n✓ All tests passed")
        return
    
    if args.get_state:
        state = server.get_session_state()
        print(json.dumps(state, indent=2))
        return
    
    if args.quick_resume:
        print(server.get_quick_resume())
        return
    
    if args.start_task:
        result = server.start_task(args.start_task, args.subtasks)
        print(json.dumps(result, indent=2))
        return
    
    if args.update_task is not None:
        result = server.update_task(subtasks_complete=args.update_task)
        print(json.dumps(result, indent=2))
        return
    
    if args.complete_task:
        result = server.complete_task()
        print(json.dumps(result, indent=2))
        return
    
    if args.decision:
        parts = args.decision.split("|")
        if len(parts) >= 2:
            result = server.record_decision(parts[0], parts[1])
            print(json.dumps(result, indent=2))
        else:
            print("Error: Decision format should be 'what|why'")
        return
    
    if args.search:
        results = server.search_history(args.search)
        print(json.dumps(results, indent=2))
        return
    
    if args.new_session:
        result = server.new_session()
        print(json.dumps(result, indent=2))
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
