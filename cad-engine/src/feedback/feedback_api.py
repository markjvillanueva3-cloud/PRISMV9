"""Feedback Collection API — CC-EXT-MS2 P0-U01.

SQLite-backed feedback collection with input validation,
batch import, query interface, and full audit trail.
"""

from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from .feedback_schema import (
    OperatorFeedback,
    FeedbackValidationError,
    validate_feedback,
)


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class SubmitResult:
    """Result of a feedback submission."""
    success: bool
    feedback_id: str = ""
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "feedback_id": self.feedback_id,
            "errors": self.errors,
        }


@dataclass
class BatchResult:
    """Result of a batch import."""
    total: int = 0
    accepted: int = 0
    rejected: int = 0
    results: list[SubmitResult] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "accepted": self.accepted,
            "rejected": self.rejected,
            "results": [r.to_dict() for r in self.results],
        }


@dataclass
class FeedbackSummary:
    """Summary statistics for queried feedback."""
    total_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    modified_count: int = 0
    unique_operators: int = 0
    avg_parameters: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "total_count": self.total_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "modified_count": self.modified_count,
            "unique_operators": self.unique_operators,
            "avg_parameters": {k: round(v, 4) for k, v in self.avg_parameters.items()},
        }


# ---------------------------------------------------------------------------
# FeedbackAPI
# ---------------------------------------------------------------------------

class FeedbackAPI:
    """Feedback collection and query API with SQLite storage.

    Provides:
    - collect_feedback(): Submit single feedback with validation
    - batch_import(): Import multiple feedback entries
    - get_feedback_by_operation(): Query by operation type
    - get_feedback_by_material(): Query by material
    - get_feedback_by_operator(): Query by operator ID
    - get_feedback_summary(): Aggregate statistics
    - get_audit_trail(): Full audit log for a feedback entry
    """

    def __init__(self, db_path: str = "feedback.db"):
        self._db_path = db_path
        self._conn: sqlite3.Connection | None = None

    def open(self) -> None:
        """Open database connection and create tables."""
        db_dir = os.path.dirname(self._db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._create_tables()

    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, *args):
        self.close()

    def _create_tables(self) -> None:
        assert self._conn is not None
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS feedback (
                feedback_id    TEXT PRIMARY KEY,
                operator_id    TEXT NOT NULL,
                experience_level TEXT DEFAULT '',
                experience_years REAL DEFAULT 0,
                specializations TEXT DEFAULT '[]',
                operation_type TEXT NOT NULL,
                material       TEXT NOT NULL,
                tool           TEXT DEFAULT '',
                tool_diameter_mm REAL DEFAULT 0,
                parameters_used TEXT NOT NULL,
                outcome        TEXT NOT NULL,
                modifications_made TEXT DEFAULT '{}',
                notes          TEXT DEFAULT '',
                timestamp      TEXT NOT NULL,
                created_at     TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_fb_operator ON feedback(operator_id);
            CREATE INDEX IF NOT EXISTS idx_fb_operation ON feedback(operation_type);
            CREATE INDEX IF NOT EXISTS idx_fb_material ON feedback(material);
            CREATE INDEX IF NOT EXISTS idx_fb_outcome ON feedback(outcome);
            CREATE INDEX IF NOT EXISTS idx_fb_timestamp ON feedback(timestamp);

            CREATE TABLE IF NOT EXISTS audit_log (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                feedback_id TEXT NOT NULL,
                action     TEXT NOT NULL,
                details    TEXT DEFAULT '',
                timestamp  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (feedback_id) REFERENCES feedback(feedback_id)
            );
        """)

    # -----------------------------------------------------------------------
    # Submit
    # -----------------------------------------------------------------------

    def collect_feedback(self, fb: OperatorFeedback) -> SubmitResult:
        """Submit a single feedback entry with validation.

        Args:
            fb: OperatorFeedback to submit.

        Returns:
            SubmitResult with success status and any errors.

        Raises:
            FeedbackValidationError if validation fails and raise_on_error is needed.
        """
        errors = validate_feedback(fb)
        if errors:
            return SubmitResult(success=False, errors=errors)

        assert self._conn is not None
        try:
            self._conn.execute(
                """INSERT INTO feedback
                   (feedback_id, operator_id, experience_level, experience_years,
                    specializations, operation_type, material, tool, tool_diameter_mm,
                    parameters_used, outcome, modifications_made, notes, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    fb.feedback_id,
                    fb.operator_id,
                    fb.experience_level,
                    fb.experience_years,
                    json.dumps(fb.specializations),
                    fb.operation_type.lower(),
                    fb.material.lower(),
                    fb.tool,
                    fb.tool_diameter_mm,
                    json.dumps(fb.parameters_used),
                    fb.outcome.lower(),
                    json.dumps(fb.modifications_made),
                    fb.notes,
                    fb.timestamp,
                ),
            )
            self._conn.execute(
                "INSERT INTO audit_log (feedback_id, action, details) VALUES (?, ?, ?)",
                (fb.feedback_id, "submit", f"Submitted by {fb.operator_id}"),
            )
            self._conn.commit()
            return SubmitResult(success=True, feedback_id=fb.feedback_id)
        except sqlite3.IntegrityError as e:
            return SubmitResult(success=False, errors=[f"Duplicate feedback_id: {fb.feedback_id}"])

    def batch_import(self, entries: list[OperatorFeedback]) -> BatchResult:
        """Import multiple feedback entries.

        Args:
            entries: List of OperatorFeedback objects.

        Returns:
            BatchResult with per-entry results.
        """
        result = BatchResult(total=len(entries))
        for fb in entries:
            sr = self.collect_feedback(fb)
            result.results.append(sr)
            if sr.success:
                result.accepted += 1
            else:
                result.rejected += 1
        return result

    # -----------------------------------------------------------------------
    # Query
    # -----------------------------------------------------------------------

    def get_feedback_by_operation(
        self, operation_type: str, limit: int = 100,
    ) -> list[OperatorFeedback]:
        """Get all feedback for an operation type."""
        return self._query("operation_type = ?", (operation_type.lower(),), limit)

    def get_feedback_by_material(
        self, material: str, limit: int = 100,
    ) -> list[OperatorFeedback]:
        """Get all feedback for a material."""
        return self._query("material = ?", (material.lower(),), limit)

    def get_feedback_by_operator(
        self, operator_id: str, limit: int = 100,
    ) -> list[OperatorFeedback]:
        """Get all feedback from an operator."""
        return self._query("operator_id = ?", (operator_id,), limit)

    def get_feedback_by_conditions(
        self,
        operation_type: str = "",
        material: str = "",
        tool: str = "",
        outcome: str = "",
        limit: int = 100,
    ) -> list[OperatorFeedback]:
        """Query feedback by multiple conditions."""
        conditions = []
        params: list = []
        if operation_type:
            conditions.append("operation_type = ?")
            params.append(operation_type.lower())
        if material:
            conditions.append("material = ?")
            params.append(material.lower())
        if tool:
            conditions.append("tool = ?")
            params.append(tool)
        if outcome:
            conditions.append("outcome = ?")
            params.append(outcome.lower())

        where = " AND ".join(conditions) if conditions else "1=1"
        return self._query(where, tuple(params), limit)

    def get_feedback_summary(
        self,
        operation_type: str = "",
        material: str = "",
    ) -> FeedbackSummary:
        """Get aggregate summary statistics."""
        entries = self.get_feedback_by_conditions(
            operation_type=operation_type,
            material=material,
            limit=10000,
        )
        summary = FeedbackSummary()
        summary.total_count = len(entries)

        operators = set()
        param_sums: dict[str, list[float]] = {}

        for fb in entries:
            operators.add(fb.operator_id)
            if fb.outcome == "success":
                summary.success_count += 1
            elif fb.outcome == "failure":
                summary.failure_count += 1
            elif fb.outcome == "modified":
                summary.modified_count += 1

            for k, v in fb.parameters_used.items():
                if isinstance(v, (int, float)):
                    param_sums.setdefault(k, []).append(float(v))

        summary.unique_operators = len(operators)
        for k, vals in param_sums.items():
            if vals:
                summary.avg_parameters[k] = sum(vals) / len(vals)

        return summary

    def get_all(self, limit: int = 1000) -> list[OperatorFeedback]:
        """Get all feedback entries."""
        return self._query("1=1", (), limit)

    def count(self) -> int:
        """Return total feedback count."""
        assert self._conn is not None
        row = self._conn.execute("SELECT COUNT(*) FROM feedback").fetchone()
        return row[0] if row else 0

    # -----------------------------------------------------------------------
    # Audit
    # -----------------------------------------------------------------------

    def get_audit_trail(self, feedback_id: str) -> list[dict]:
        """Get full audit trail for a feedback entry."""
        assert self._conn is not None
        rows = self._conn.execute(
            "SELECT action, details, timestamp FROM audit_log WHERE feedback_id = ? ORDER BY id",
            (feedback_id,),
        ).fetchall()
        return [
            {"action": r[0], "details": r[1], "timestamp": r[2]}
            for r in rows
        ]

    # -----------------------------------------------------------------------
    # Internal
    # -----------------------------------------------------------------------

    def _query(
        self, where: str, params: tuple, limit: int,
    ) -> list[OperatorFeedback]:
        assert self._conn is not None
        rows = self._conn.execute(
            f"SELECT * FROM feedback WHERE {where} ORDER BY timestamp DESC LIMIT ?",
            (*params, limit),
        ).fetchall()
        return [self._row_to_feedback(r) for r in rows]

    @staticmethod
    def _row_to_feedback(row: tuple) -> OperatorFeedback:
        return OperatorFeedback(
            feedback_id=row[0],
            operator_id=row[1],
            experience_level=row[2],
            experience_years=row[3],
            specializations=json.loads(row[4]) if row[4] else [],
            operation_type=row[5],
            material=row[6],
            tool=row[7],
            tool_diameter_mm=row[8],
            parameters_used=json.loads(row[9]) if row[9] else {},
            outcome=row[10],
            modifications_made=json.loads(row[11]) if row[11] else {},
            notes=row[12],
            timestamp=row[13],
        )
