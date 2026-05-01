"""Feedback Schema — CC-EXT-MS2 P0-U01.

Defines the OperatorFeedback dataclass and validation rules for
structured operator input collection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import uuid


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ExperienceLevel(str, Enum):
    APPRENTICE = "apprentice"     # 0-2 years
    JOURNEYMAN = "journeyman"    # 2-5 years
    EXPERIENCED = "experienced"  # 5-15 years
    MASTER = "master"            # 15+ years
    EXPERT = "expert"            # 25+ years, specialization


class Outcome(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    MODIFIED = "modified"  # Operator modified recommended params and succeeded


class OperationType(str, Enum):
    MILLING = "milling"
    TURNING = "turning"
    DRILLING = "drilling"
    GRINDING = "grinding"
    THREADING = "threading"
    BORING = "boring"
    REAMING = "reaming"
    TAPPING = "tapping"
    EDM = "edm"
    OTHER = "other"


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------

class FeedbackValidationError(ValueError):
    """Raised when feedback submission fails validation."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Feedback validation failed: {'; '.join(errors)}")


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class OperatorProfile:
    """Operator identity and experience."""
    operator_id: str
    name: str = ""
    experience_years: float = 0.0
    experience_level: ExperienceLevel = ExperienceLevel.APPRENTICE
    specializations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "operator_id": self.operator_id,
            "name": self.name,
            "experience_years": self.experience_years,
            "experience_level": self.experience_level.value,
            "specializations": self.specializations,
        }


@dataclass
class OperatorFeedback:
    """A single feedback submission from an operator."""
    feedback_id: str = ""
    operator_id: str = ""
    experience_level: str = ""
    experience_years: float = 0.0
    specializations: list[str] = field(default_factory=list)
    operation_type: str = ""
    material: str = ""
    tool: str = ""
    tool_diameter_mm: float = 0.0
    parameters_used: dict[str, float] = field(default_factory=dict)
    outcome: str = ""
    modifications_made: dict[str, float] = field(default_factory=dict)
    notes: str = ""
    timestamp: str = ""

    def __post_init__(self):
        if not self.feedback_id:
            self.feedback_id = f"FB-{uuid.uuid4().hex[:12]}"
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "feedback_id": self.feedback_id,
            "operator_id": self.operator_id,
            "experience_level": self.experience_level,
            "experience_years": self.experience_years,
            "specializations": self.specializations,
            "operation_type": self.operation_type,
            "material": self.material,
            "tool": self.tool,
            "tool_diameter_mm": self.tool_diameter_mm,
            "parameters_used": self.parameters_used,
            "outcome": self.outcome,
            "modifications_made": self.modifications_made,
            "notes": self.notes,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_dict(cls, d: dict) -> OperatorFeedback:
        return cls(
            feedback_id=d.get("feedback_id", ""),
            operator_id=d.get("operator_id", ""),
            experience_level=d.get("experience_level", ""),
            experience_years=float(d.get("experience_years", 0)),
            specializations=d.get("specializations", []),
            operation_type=d.get("operation_type", ""),
            material=d.get("material", ""),
            tool=d.get("tool", ""),
            tool_diameter_mm=float(d.get("tool_diameter_mm", 0)),
            parameters_used=d.get("parameters_used", {}),
            outcome=d.get("outcome", ""),
            modifications_made=d.get("modifications_made", {}),
            notes=d.get("notes", ""),
            timestamp=d.get("timestamp", ""),
        )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

_VALID_OUTCOMES = {"success", "failure", "modified"}
_VALID_OPERATIONS = {
    "milling", "turning", "drilling", "grinding", "threading",
    "boring", "reaming", "tapping", "edm", "other",
}


def validate_feedback(fb: OperatorFeedback) -> list[str]:
    """Validate a feedback submission. Returns list of error messages (empty = valid)."""
    errors = []

    if not fb.operator_id or not fb.operator_id.strip():
        errors.append("operator_id is required")

    if not fb.operation_type:
        errors.append("operation_type is required")
    elif fb.operation_type.lower() not in _VALID_OPERATIONS:
        errors.append(f"operation_type '{fb.operation_type}' not recognized; valid: {sorted(_VALID_OPERATIONS)}")

    if not fb.material or not fb.material.strip():
        errors.append("material is required")

    if not fb.outcome:
        errors.append("outcome is required")
    elif fb.outcome.lower() not in _VALID_OUTCOMES:
        errors.append(f"outcome '{fb.outcome}' not valid; expected: {sorted(_VALID_OUTCOMES)}")

    if not fb.parameters_used:
        errors.append("parameters_used must contain at least one parameter")

    if fb.outcome == "modified" and not fb.modifications_made:
        errors.append("modifications_made required when outcome is 'modified'")

    return errors
