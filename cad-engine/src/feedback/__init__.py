"""Operator Feedback Loop Engine — CC-EXT-MS2.

Captures, validates, and integrates real-world operator feedback
into PRISM knowledge bases.
"""

from .feedback_schema import OperatorFeedback
from .feedback_api import FeedbackAPI
from .feedback_validator import FeedbackValidator
from .experience_scorer import ExperienceScorer, ExperienceScore, ScoreBreakdown
from .consensus_builder import ConsensusBuilder, ConsensusResult, ParameterConsensus
from .conflict_resolver import ConflictResolver, Conflict, Resolution, ConflictType
from .kb_updater import KBUpdater, KBEntry, UpdateMode
from .feedback_metrics import FeedbackMetrics, DashboardOutput

__all__ = [
    "OperatorFeedback",
    "FeedbackAPI",
    "FeedbackValidator",
    "ExperienceScorer",
    "ExperienceScore",
    "ScoreBreakdown",
    "ConsensusBuilder",
    "ConsensusResult",
    "ParameterConsensus",
    "ConflictResolver",
    "Conflict",
    "Resolution",
    "ConflictType",
    "KBUpdater",
    "KBEntry",
    "UpdateMode",
    "FeedbackMetrics",
    "DashboardOutput",
]
