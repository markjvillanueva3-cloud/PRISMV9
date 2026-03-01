"""Shared validation types used by all domain validators."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ValidationFinding:
    """A single validation finding."""
    severity: str  # "error", "warning", "info"
    item_id: str
    message: str
