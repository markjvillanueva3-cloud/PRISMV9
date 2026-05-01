"""Knowledge Base Update Pipeline — CC-EXT-MS2 P0-U06.

Applies validated, consensus-approved feedback to the knowledge base.
Features: atomic updates, version tracking, rollback, change logging.

Update modes:
- NEW: Add new entry to KB
- REFINE: Narrow parameter range based on operator data
- OVERRIDE: Replace value when consensus is strong
- DEPRECATE: Mark entry as outdated
"""

from __future__ import annotations

import copy
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .consensus_builder import ConsensusResult


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UpdateMode(str, Enum):
    NEW = "new"
    REFINE = "refine"
    OVERRIDE = "override"
    DEPRECATE = "deprecate"


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class KBVersion:
    """A versioned snapshot of a KB entry."""
    version: int
    value: float
    range_low: float
    range_high: float
    confidence: float
    source: str  # "operator_consensus", "physics_model", "manual"
    contributors: list[str] = field(default_factory=list)
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "value": round(self.value, 4),
            "range_low": round(self.range_low, 4),
            "range_high": round(self.range_high, 4),
            "confidence": round(self.confidence, 4),
            "source": self.source,
            "contributors": self.contributors,
            "timestamp": self.timestamp,
        }


@dataclass
class KBEntry:
    """A knowledge base entry with version history."""
    entry_id: str
    operation_type: str
    material: str
    parameter: str
    current: KBVersion
    history: list[KBVersion] = field(default_factory=list)
    deprecated: bool = False
    deprecated_reason: str = ""

    @property
    def current_version(self) -> int:
        return self.current.version

    def to_dict(self) -> dict:
        return {
            "entry_id": self.entry_id,
            "operation_type": self.operation_type,
            "material": self.material,
            "parameter": self.parameter,
            "current": self.current.to_dict(),
            "history": [v.to_dict() for v in self.history],
            "deprecated": self.deprecated,
            "deprecated_reason": self.deprecated_reason,
        }


@dataclass
class ChangeLogEntry:
    """A human-readable change log entry."""
    entry_id: str
    mode: UpdateMode
    parameter: str
    old_value: Optional[float]
    new_value: float
    old_range: Optional[tuple[float, float]]
    new_range: tuple[float, float]
    confidence: float
    contributors: list[str]
    rationale: str
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            "entry_id": self.entry_id,
            "mode": self.mode.value,
            "parameter": self.parameter,
            "old_value": round(self.old_value, 4) if self.old_value is not None else None,
            "new_value": round(self.new_value, 4),
            "old_range": (
                (round(self.old_range[0], 4), round(self.old_range[1], 4))
                if self.old_range else None
            ),
            "new_range": (round(self.new_range[0], 4), round(self.new_range[1], 4)),
            "confidence": round(self.confidence, 4),
            "contributors": self.contributors,
            "rationale": self.rationale,
            "timestamp": self.timestamp,
        }

    def summary(self) -> str:
        """Human-readable summary line."""
        if self.mode == UpdateMode.NEW:
            return (
                f"[NEW] {self.parameter}: {self.new_value:.2f} "
                f"(range {self.new_range[0]:.2f}-{self.new_range[1]:.2f}), "
                f"confidence {self.confidence:.2f}, "
                f"from {len(self.contributors)} operator(s)"
            )
        elif self.mode == UpdateMode.REFINE:
            return (
                f"[REFINE] {self.parameter}: "
                f"{self.old_value:.2f} -> {self.new_value:.2f}, "
                f"range narrowed to {self.new_range[0]:.2f}-{self.new_range[1]:.2f}, "
                f"confidence {self.confidence:.2f}"
            )
        elif self.mode == UpdateMode.OVERRIDE:
            return (
                f"[OVERRIDE] {self.parameter}: "
                f"{self.old_value:.2f} -> {self.new_value:.2f}, "
                f"confidence {self.confidence:.2f}, "
                f"from {len(self.contributors)} operator(s)"
            )
        elif self.mode == UpdateMode.DEPRECATE:
            return f"[DEPRECATE] {self.parameter}: marked outdated"
        return f"[{self.mode.value}] {self.parameter}"


# ---------------------------------------------------------------------------
# KBUpdater
# ---------------------------------------------------------------------------

class KBUpdater:
    """Applies consensus-approved feedback to the knowledge base.

    Supports atomic updates with version tracking and rollback.
    """

    # Minimum confidence to auto-apply updates
    MIN_CONFIDENCE_AUTO = 0.3
    # High confidence threshold for overrides
    HIGH_CONFIDENCE_OVERRIDE = 0.7
    # Range refinement factor (tighten by this fraction)
    REFINE_FACTOR = 0.8

    def __init__(self):
        self._entries: dict[str, KBEntry] = {}
        self._change_log: list[ChangeLogEntry] = []
        self._entry_counter = 0

    def _next_entry_id(self) -> str:
        self._entry_counter += 1
        return f"KB-{self._entry_counter:04d}"

    # -------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------

    def apply_consensus(
        self,
        consensus: ConsensusResult,
        mode: Optional[UpdateMode] = None,
    ) -> list[ChangeLogEntry]:
        """Apply a consensus result to the KB.

        Auto-detects mode if not specified:
        - No existing entry → NEW
        - Existing entry, consensus tightens range → REFINE
        - Existing entry, high confidence consensus → OVERRIDE

        Returns change log entries for all updates made.
        """
        changes: list[ChangeLogEntry] = []

        for param_name, pc in consensus.recommended_params.items():
            entry_key = self._make_key(
                consensus.operation_type, consensus.material, param_name
            )
            existing = self._entries.get(entry_key)

            actual_mode = mode or self._auto_detect_mode(existing, pc, consensus.confidence)

            if actual_mode == UpdateMode.NEW:
                change = self._apply_new(entry_key, consensus, param_name, pc)
            elif actual_mode == UpdateMode.REFINE:
                change = self._apply_refine(entry_key, existing, consensus, param_name, pc)
            elif actual_mode == UpdateMode.OVERRIDE:
                change = self._apply_override(entry_key, existing, consensus, param_name, pc)
            elif actual_mode == UpdateMode.DEPRECATE:
                change = self._apply_deprecate(entry_key, existing, consensus, param_name)
            else:
                continue

            if change:
                self._change_log.append(change)
                changes.append(change)

        return changes

    def deprecate_entry(self, entry_id: str, reason: str) -> Optional[ChangeLogEntry]:
        """Deprecate a KB entry by its entry_id."""
        for key, entry in self._entries.items():
            if entry.entry_id == entry_id:
                entry.deprecated = True
                entry.deprecated_reason = reason
                change = ChangeLogEntry(
                    entry_id=entry.entry_id,
                    mode=UpdateMode.DEPRECATE,
                    parameter=entry.parameter,
                    old_value=entry.current.value,
                    new_value=entry.current.value,
                    old_range=(entry.current.range_low, entry.current.range_high),
                    new_range=(entry.current.range_low, entry.current.range_high),
                    confidence=entry.current.confidence,
                    contributors=[],
                    rationale=f"Deprecated: {reason}",
                )
                self._change_log.append(change)
                return change
        return None

    def rollback(self, entry_id: str, target_version: Optional[int] = None) -> bool:
        """Rollback a KB entry to a previous version.

        If target_version is None, rolls back to the immediately previous version.
        """
        entry = self._find_entry_by_id(entry_id)
        if entry is None or not entry.history:
            return False

        if target_version is None:
            # Roll back to previous version
            prev = entry.history[-1]
        else:
            prev = None
            for v in entry.history:
                if v.version == target_version:
                    prev = v
                    break
            if prev is None:
                return False

        # Save current as history entry before rolling back
        entry.history.append(copy.deepcopy(entry.current))
        entry.current = copy.deepcopy(prev)
        entry.current.version = entry.history[-1].version + 1
        entry.deprecated = False
        entry.deprecated_reason = ""

        change = ChangeLogEntry(
            entry_id=entry.entry_id,
            mode=UpdateMode.OVERRIDE,
            parameter=entry.parameter,
            old_value=entry.history[-1].value,
            new_value=prev.value,
            old_range=(entry.history[-1].range_low, entry.history[-1].range_high),
            new_range=(prev.range_low, prev.range_high),
            confidence=prev.confidence,
            contributors=prev.contributors,
            rationale=f"Rollback to version {prev.version}",
        )
        self._change_log.append(change)
        return True

    def get_entry(self, operation_type: str, material: str, parameter: str) -> Optional[KBEntry]:
        """Get a KB entry by operation/material/parameter."""
        key = self._make_key(operation_type, material, parameter)
        return self._entries.get(key)

    def get_entry_by_id(self, entry_id: str) -> Optional[KBEntry]:
        """Get a KB entry by its ID."""
        return self._find_entry_by_id(entry_id)

    def get_all_entries(self) -> list[KBEntry]:
        """Get all KB entries."""
        return list(self._entries.values())

    def get_change_log(self) -> list[dict]:
        """Get full change log as dicts."""
        return [c.to_dict() for c in self._change_log]

    def get_change_summaries(self) -> list[str]:
        """Get human-readable change summaries."""
        return [c.summary() for c in self._change_log]

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    @staticmethod
    def _make_key(operation_type: str, material: str, parameter: str) -> str:
        return f"{operation_type.lower().strip()}:{material.lower().strip()}:{parameter.lower().strip()}"

    def _find_entry_by_id(self, entry_id: str) -> Optional[KBEntry]:
        for entry in self._entries.values():
            if entry.entry_id == entry_id:
                return entry
        return None

    def _auto_detect_mode(
        self,
        existing: Optional[KBEntry],
        pc,
        consensus_confidence: float,
    ) -> UpdateMode:
        """Auto-detect the appropriate update mode."""
        if existing is None:
            return UpdateMode.NEW

        if existing.deprecated:
            return UpdateMode.NEW

        # High confidence consensus → override
        if consensus_confidence >= self.HIGH_CONFIDENCE_OVERRIDE:
            return UpdateMode.OVERRIDE

        # Check if consensus tightens the range → REFINE, otherwise no-op REFINE
        # (both paths refine, but tight range gets logged differently)
        return UpdateMode.REFINE

    def _apply_new(self, key, consensus, param_name, pc) -> ChangeLogEntry:
        """Add a new KB entry."""
        entry_id = self._next_entry_id()
        version = KBVersion(
            version=1,
            value=pc.weighted_mean,
            range_low=pc.confidence_interval[0],
            range_high=pc.confidence_interval[1],
            confidence=consensus.confidence,
            source="operator_consensus",
            contributors=consensus.contributing_operators,
        )
        entry = KBEntry(
            entry_id=entry_id,
            operation_type=consensus.operation_type,
            material=consensus.material,
            parameter=param_name,
            current=version,
        )
        self._entries[key] = entry

        return ChangeLogEntry(
            entry_id=entry_id,
            mode=UpdateMode.NEW,
            parameter=param_name,
            old_value=None,
            new_value=pc.weighted_mean,
            old_range=None,
            new_range=(pc.confidence_interval[0], pc.confidence_interval[1]),
            confidence=consensus.confidence,
            contributors=consensus.contributing_operators,
            rationale=(
                f"New entry from {consensus.num_contributors} operator(s) "
                f"with confidence {consensus.confidence:.2f}"
            ),
        )

    def _apply_refine(self, key, existing, consensus, param_name, pc) -> Optional[ChangeLogEntry]:
        """Refine an existing KB entry (narrow range)."""
        if existing is None:
            return self._apply_new(key, consensus, param_name, pc)

        # Save current to history
        existing.history.append(copy.deepcopy(existing.current))

        old_val = existing.current.value
        old_range = (existing.current.range_low, existing.current.range_high)

        # Blend old and new values weighted by confidence
        old_conf = existing.current.confidence
        new_conf = consensus.confidence
        total_conf = old_conf + new_conf
        if total_conf > 0:
            blended_value = (old_val * old_conf + pc.weighted_mean * new_conf) / total_conf
        else:
            blended_value = pc.weighted_mean

        # Tighten range
        new_low = max(existing.current.range_low, pc.confidence_interval[0])
        new_high = min(existing.current.range_high, pc.confidence_interval[1])
        if new_low > new_high:
            new_low, new_high = pc.confidence_interval

        existing.current = KBVersion(
            version=existing.current_version + 1,
            value=blended_value,
            range_low=new_low,
            range_high=new_high,
            confidence=min(max(old_conf, new_conf) + 0.05, 1.0),
            source="operator_consensus",
            contributors=consensus.contributing_operators,
        )

        return ChangeLogEntry(
            entry_id=existing.entry_id,
            mode=UpdateMode.REFINE,
            parameter=param_name,
            old_value=old_val,
            new_value=blended_value,
            old_range=old_range,
            new_range=(new_low, new_high),
            confidence=existing.current.confidence,
            contributors=consensus.contributing_operators,
            rationale=(
                f"Refined from {consensus.num_contributors} operator(s). "
                f"Range tightened from {old_range[0]:.2f}-{old_range[1]:.2f} "
                f"to {new_low:.2f}-{new_high:.2f}"
            ),
        )

    def _apply_override(self, key, existing, consensus, param_name, pc) -> Optional[ChangeLogEntry]:
        """Override an existing KB entry with consensus value."""
        if existing is None:
            return self._apply_new(key, consensus, param_name, pc)

        # Save current to history
        existing.history.append(copy.deepcopy(existing.current))

        old_val = existing.current.value
        old_range = (existing.current.range_low, existing.current.range_high)

        existing.current = KBVersion(
            version=existing.current_version + 1,
            value=pc.weighted_mean,
            range_low=pc.confidence_interval[0],
            range_high=pc.confidence_interval[1],
            confidence=consensus.confidence,
            source="operator_consensus",
            contributors=consensus.contributing_operators,
        )

        return ChangeLogEntry(
            entry_id=existing.entry_id,
            mode=UpdateMode.OVERRIDE,
            parameter=param_name,
            old_value=old_val,
            new_value=pc.weighted_mean,
            old_range=old_range,
            new_range=(pc.confidence_interval[0], pc.confidence_interval[1]),
            confidence=consensus.confidence,
            contributors=consensus.contributing_operators,
            rationale=(
                f"Override from {consensus.num_contributors} operator(s) "
                f"with confidence {consensus.confidence:.2f}"
            ),
        )

    def _apply_deprecate(self, key, existing, consensus, param_name) -> Optional[ChangeLogEntry]:
        """Mark an entry as deprecated."""
        if existing is None:
            return None

        existing.deprecated = True
        existing.deprecated_reason = (
            f"Deprecated by consensus from {consensus.num_contributors} operator(s)"
        )

        return ChangeLogEntry(
            entry_id=existing.entry_id,
            mode=UpdateMode.DEPRECATE,
            parameter=param_name,
            old_value=existing.current.value,
            new_value=existing.current.value,
            old_range=(existing.current.range_low, existing.current.range_high),
            new_range=(existing.current.range_low, existing.current.range_high),
            confidence=existing.current.confidence,
            contributors=consensus.contributing_operators,
            rationale=existing.deprecated_reason,
        )
