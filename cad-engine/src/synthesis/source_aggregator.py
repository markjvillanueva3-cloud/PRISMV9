"""Multi-Source Knowledge Aggregation — CC-EXT-MS5 P0-U01.

Collects knowledge from all 4 CC-EXT sources into a unified store:
- PDF extraction (MS1) → KnowledgeEntry
- Operator feedback (MS2) → ConsensusResult
- Sensor learning (MS3) → AnomalyReport, ConditionCorrelation
- Quality feedback (MS4) → TolerancePrediction, SurfaceFinishPrediction

Provides duplicate detection, provenance tracking, and incremental merge.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SourceType(Enum):
    PDF_EXTRACTION = "pdf_extraction"
    OPERATOR_FEEDBACK = "operator_feedback"
    SENSOR_LEARNING = "sensor_learning"
    QUALITY_FEEDBACK = "quality_feedback"


class EntryCategory(Enum):
    CUTTING_PARAMETER = "cutting_parameter"
    SURFACE_FINISH = "surface_finish"
    TOLERANCE = "tolerance"
    TOOL_LIFE = "tool_life"
    ANOMALY = "anomaly"
    PRACTICE = "practice"
    MATERIAL_PROPERTY = "material_property"


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class SourceProvenance:
    """Tracks where a unified entry came from."""
    source_type: SourceType
    source_id: str = ""
    extraction_date: float = 0.0  # epoch seconds
    original_confidence: float = 0.0
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        if self.extraction_date == 0.0:
            self.extraction_date = time.time()

    def to_dict(self) -> dict:
        return {
            "source_type": self.source_type.value,
            "source_id": self.source_id,
            "extraction_date": self.extraction_date,
            "original_confidence": round(self.original_confidence, 4),
        }


@dataclass
class UnifiedEntry:
    """A single knowledge entry normalized from any source."""
    entry_id: str = ""
    category: EntryCategory = EntryCategory.CUTTING_PARAMETER
    material: str = ""
    operation: str = ""
    tool_type: str = ""
    parameter_name: str = ""
    value: float = 0.0
    unit: str = ""
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    conditions: dict = field(default_factory=dict)
    sources: list[SourceProvenance] = field(default_factory=list)
    confidence: float = 0.0
    is_duplicate: bool = False
    merged_into: str = ""

    def __post_init__(self):
        if not self.entry_id:
            self.entry_id = self._generate_id()

    def _generate_id(self) -> str:
        key = f"{self.category.value}:{self.material}:{self.operation}:{self.parameter_name}:{self.value}"
        return hashlib.md5(key.encode()).hexdigest()[:12]

    @property
    def source_count(self) -> int:
        return len(self.sources)

    @property
    def source_types(self) -> set[SourceType]:
        return {s.source_type for s in self.sources}

    def match_key(self) -> str:
        """Key for duplicate detection: same parameter for same material/operation/tool."""
        return f"{self.category.value}|{self.material.lower()}|{self.operation.lower()}|{self.tool_type.lower()}|{self.parameter_name.lower()}"

    def to_dict(self) -> dict:
        return {
            "entry_id": self.entry_id,
            "category": self.category.value,
            "material": self.material,
            "operation": self.operation,
            "tool_type": self.tool_type,
            "parameter_name": self.parameter_name,
            "value": self.value,
            "unit": self.unit,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "conditions": self.conditions,
            "source_count": self.source_count,
            "sources": [s.to_dict() for s in self.sources],
            "confidence": round(self.confidence, 4),
        }


# ---------------------------------------------------------------------------
# Source Adapters
# ---------------------------------------------------------------------------

class SourceAdapter:
    """Base class for source adapters."""
    source_type: SourceType = SourceType.PDF_EXTRACTION

    def extract_entries(self, data: Any) -> list[UnifiedEntry]:
        raise NotImplementedError


class PDFSourceAdapter(SourceAdapter):
    """Adapts CC-EXT-MS1 KnowledgeEntry objects."""
    source_type = SourceType.PDF_EXTRACTION

    def extract_entries(self, knowledge_entry: Any) -> list[UnifiedEntry]:
        entries = []
        ke = knowledge_entry

        category = self._map_category(getattr(ke, "knowledge_type", None))
        prov = SourceProvenance(
            source_type=self.source_type,
            source_id=getattr(ke, "entry_id", ""),
            original_confidence=getattr(ke, "confidence", 0.5),
        )

        value_dict = getattr(ke, "value", {})
        if isinstance(value_dict, dict):
            for param_name, param_val in value_dict.items():
                if isinstance(param_val, (int, float)):
                    entry = UnifiedEntry(
                        category=category,
                        material=getattr(ke, "material", "") or "",
                        operation=getattr(ke, "operation", "") or "",
                        tool_type=getattr(ke, "tool_type", "") or "",
                        parameter_name=param_name,
                        value=float(param_val),
                        unit=getattr(ke, "unit", "") or "",
                        min_value=getattr(ke, "min_value", None),
                        max_value=getattr(ke, "max_value", None),
                        sources=[prov],
                        confidence=getattr(ke, "confidence", 0.5),
                    )
                    entries.append(entry)
        else:
            # Single value entry
            entry = UnifiedEntry(
                category=category,
                material=getattr(ke, "material", "") or "",
                operation=getattr(ke, "operation", "") or "",
                tool_type=getattr(ke, "tool_type", "") or "",
                parameter_name=getattr(ke, "title", "") or getattr(ke, "category", ""),
                value=float(getattr(ke, "si_value", 0.0) or 0.0),
                unit=getattr(ke, "unit", "") or "",
                sources=[prov],
                confidence=getattr(ke, "confidence", 0.5),
            )
            entries.append(entry)

        return entries

    @staticmethod
    def _map_category(kt: Any) -> EntryCategory:
        if kt is None:
            return EntryCategory.CUTTING_PARAMETER
        name = getattr(kt, "value", str(kt)).upper()
        mapping = {
            "PARAMETER": EntryCategory.CUTTING_PARAMETER,
            "CUTTING_DATA": EntryCategory.CUTTING_PARAMETER,
            "PRACTICE": EntryCategory.PRACTICE,
            "TOLERANCE": EntryCategory.TOLERANCE,
            "TOOL": EntryCategory.TOOL_LIFE,
            "MATERIAL": EntryCategory.MATERIAL_PROPERTY,
        }
        return mapping.get(name, EntryCategory.CUTTING_PARAMETER)


class FeedbackSourceAdapter(SourceAdapter):
    """Adapts CC-EXT-MS2 ConsensusResult objects."""
    source_type = SourceType.OPERATOR_FEEDBACK

    def extract_entries(self, consensus: Any) -> list[UnifiedEntry]:
        entries = []
        prov = SourceProvenance(
            source_type=self.source_type,
            source_id=f"consensus_{getattr(consensus, 'operation_type', '')}_{getattr(consensus, 'material', '')}",
            original_confidence=getattr(consensus, "confidence", 0.5),
        )

        params = getattr(consensus, "recommended_params", {})
        for param_name, param_consensus in params.items():
            mean_val = getattr(param_consensus, "weighted_mean", 0.0)
            entry = UnifiedEntry(
                category=EntryCategory.CUTTING_PARAMETER,
                material=getattr(consensus, "material", "") or "",
                operation=getattr(consensus, "operation_type", "") or "",
                tool_type=getattr(consensus, "tool", "") or "",
                parameter_name=param_name,
                value=float(mean_val),
                unit="",
                min_value=getattr(param_consensus, "min_val", None),
                max_value=getattr(param_consensus, "max_val", None),
                conditions={"num_contributors": getattr(consensus, "num_contributors", 0)},
                sources=[prov],
                confidence=getattr(consensus, "confidence", 0.5),
            )
            entries.append(entry)

        return entries


class SensorSourceAdapter(SourceAdapter):
    """Adapts CC-EXT-MS3 condition correlations and anomaly data."""
    source_type = SourceType.SENSOR_LEARNING

    def extract_entries(self, data: Any) -> list[UnifiedEntry]:
        entries = []

        # Handle correlation results (dict with parameter mappings)
        if isinstance(data, dict):
            prov = SourceProvenance(
                source_type=self.source_type,
                source_id=data.get("correlation_id", "sensor"),
                original_confidence=data.get("confidence", 0.6),
            )
            for param_name, param_val in data.items():
                if param_name in ("correlation_id", "confidence", "material", "operation"):
                    continue
                if isinstance(param_val, (int, float)):
                    entry = UnifiedEntry(
                        category=self._infer_category(param_name),
                        material=data.get("material", ""),
                        operation=data.get("operation", ""),
                        parameter_name=param_name,
                        value=float(param_val),
                        sources=[prov],
                        confidence=data.get("confidence", 0.6),
                    )
                    entries.append(entry)
        # Handle anomaly report objects
        elif hasattr(data, "events"):
            for event in getattr(data, "events", []):
                prov = SourceProvenance(
                    source_type=self.source_type,
                    source_id=f"anomaly_{getattr(event, 'anomaly_type', 'unknown')}",
                    original_confidence=getattr(event, "confidence", 0.5),
                )
                entry = UnifiedEntry(
                    category=EntryCategory.ANOMALY,
                    parameter_name=str(getattr(event, "anomaly_type", "unknown")),
                    value=getattr(event, "value", 0.0),
                    conditions={
                        "severity": str(getattr(event, "severity", "")),
                        "channel": getattr(event, "channel", ""),
                    },
                    sources=[prov],
                    confidence=getattr(event, "confidence", 0.5),
                )
                entries.append(entry)

        return entries

    @staticmethod
    def _infer_category(param_name: str) -> EntryCategory:
        name = param_name.lower()
        if "wear" in name or "life" in name:
            return EntryCategory.TOOL_LIFE
        if "ra" in name or "rz" in name or "finish" in name:
            return EntryCategory.SURFACE_FINISH
        if "tolerance" in name or "deviation" in name:
            return EntryCategory.TOLERANCE
        return EntryCategory.CUTTING_PARAMETER


class QualitySourceAdapter(SourceAdapter):
    """Adapts CC-EXT-MS4 tolerance/surface/dimensional predictions."""
    source_type = SourceType.QUALITY_FEEDBACK

    def extract_entries(self, data: Any) -> list[UnifiedEntry]:
        entries = []

        # Handle TolerancePrediction
        if hasattr(data, "predicted_it_grade"):
            prov = SourceProvenance(
                source_type=self.source_type,
                source_id="tolerance_prediction",
                original_confidence=getattr(data, "confidence", 0.5),
            )
            entry = UnifiedEntry(
                category=EntryCategory.TOLERANCE,
                parameter_name="predicted_it_grade",
                value=float(getattr(data, "predicted_it_numeric", 0)),
                conditions={
                    "it_grade": getattr(data, "predicted_it_grade", ""),
                    "deviation_mm": getattr(data, "predicted_deviation_mm", 0.0),
                },
                sources=[prov],
                confidence=getattr(data, "confidence", 0.5),
            )
            entries.append(entry)

        # Handle SurfaceFinishPrediction
        if hasattr(data, "corrected_ra_um"):
            prov = SourceProvenance(
                source_type=self.source_type,
                source_id="surface_finish_prediction",
                original_confidence=getattr(data, "confidence", 0.5),
            )
            entry = UnifiedEntry(
                category=EntryCategory.SURFACE_FINISH,
                parameter_name="predicted_ra",
                value=getattr(data, "corrected_ra_um", 0.0),
                unit="um",
                sources=[prov],
                confidence=getattr(data, "confidence", 0.5),
            )
            entries.append(entry)
            if hasattr(data, "predicted_rz_um"):
                entry_rz = UnifiedEntry(
                    category=EntryCategory.SURFACE_FINISH,
                    parameter_name="predicted_rz",
                    value=getattr(data, "predicted_rz_um", 0.0),
                    unit="um",
                    sources=[prov],
                    confidence=getattr(data, "confidence", 0.5),
                )
                entries.append(entry_rz)

        # Handle DimensionalPrediction
        if hasattr(data, "total_error_um"):
            prov = SourceProvenance(
                source_type=self.source_type,
                source_id="dimensional_prediction",
                original_confidence=getattr(data, "confidence", 0.5),
            )
            entry = UnifiedEntry(
                category=EntryCategory.TOLERANCE,
                parameter_name="total_error",
                value=getattr(data, "total_error_um", 0.0),
                unit="um",
                conditions={
                    "achievable_it_grade": getattr(data, "achievable_it_grade", 0),
                },
                sources=[prov],
                confidence=getattr(data, "confidence", 0.5),
            )
            entries.append(entry)

        # Handle InspectionResult
        if hasattr(data, "features") and hasattr(data, "part_id"):
            for feat in getattr(data, "features", []):
                prov = SourceProvenance(
                    source_type=self.source_type,
                    source_id=f"inspection_{getattr(data, 'part_id', '')}",
                    original_confidence=0.9,  # direct measurement
                )
                entry = UnifiedEntry(
                    category=EntryCategory.TOLERANCE,
                    material=getattr(data, "material", "") or "",
                    operation=getattr(data, "operation_id", "") or "",
                    parameter_name=f"deviation_{getattr(feat, 'feature_name', '')}",
                    value=abs(getattr(feat, "deviation", 0.0)) * 1000.0,  # mm to um
                    unit="um",
                    conditions={
                        "nominal_mm": getattr(feat, "nominal_value", 0.0),
                        "status": str(getattr(feat, "status", "")),
                    },
                    sources=[prov],
                    confidence=0.95,  # direct CMM measurement
                )
                entries.append(entry)

        return entries


# ---------------------------------------------------------------------------
# Unified Knowledge Store
# ---------------------------------------------------------------------------

class UnifiedKnowledgeStore:
    """Stores all aggregated knowledge entries with dedup and provenance."""

    def __init__(self):
        self._entries: dict[str, UnifiedEntry] = {}  # entry_id -> entry
        self._match_index: dict[str, list[str]] = {}  # match_key -> [entry_ids]
        self._source_index: dict[SourceType, list[str]] = {}  # source -> [entry_ids]

    @property
    def entry_count(self) -> int:
        return sum(1 for e in self._entries.values() if not e.is_duplicate)

    @property
    def total_entries(self) -> int:
        return len(self._entries)

    def add_entry(self, entry: UnifiedEntry) -> str:
        """Add entry, detecting duplicates. Returns the entry_id (may be merged)."""
        match_key = entry.match_key()

        if match_key in self._match_index:
            existing_ids = self._match_index[match_key]
            for eid in existing_ids:
                existing = self._entries[eid]
                if existing.is_duplicate:
                    continue
                similarity = self._compute_similarity(existing, entry)
                if similarity >= 0.8:
                    # Merge: add provenance, update confidence
                    existing.sources.extend(entry.sources)
                    if entry.value != 0 and existing.value != 0:
                        # Weighted average
                        w1 = existing.confidence
                        w2 = entry.confidence
                        if w1 + w2 > 0:
                            existing.value = (existing.value * w1 + entry.value * w2) / (w1 + w2)
                    existing.confidence = max(existing.confidence, entry.confidence)
                    if entry.min_value is not None:
                        existing.min_value = min(
                            existing.min_value or float("inf"), entry.min_value
                        )
                    if entry.max_value is not None:
                        existing.max_value = max(
                            existing.max_value or float("-inf"), entry.max_value
                        )
                    # Mark new entry as duplicate
                    entry.is_duplicate = True
                    entry.merged_into = eid
                    self._entries[entry.entry_id] = entry
                    return eid

        # New unique entry
        self._entries[entry.entry_id] = entry
        self._match_index.setdefault(match_key, []).append(entry.entry_id)
        for src in entry.sources:
            self._source_index.setdefault(src.source_type, []).append(entry.entry_id)

        return entry.entry_id

    def get_entries(
        self,
        category: Optional[EntryCategory] = None,
        material: Optional[str] = None,
        operation: Optional[str] = None,
        source_type: Optional[SourceType] = None,
        min_confidence: float = 0.0,
        include_duplicates: bool = False,
    ) -> list[UnifiedEntry]:
        """Query entries with optional filters."""
        results = []
        for entry in self._entries.values():
            if not include_duplicates and entry.is_duplicate:
                continue
            if category and entry.category != category:
                continue
            if material and entry.material.lower() != material.lower():
                continue
            if operation and entry.operation.lower() != operation.lower():
                continue
            if source_type and source_type not in entry.source_types:
                continue
            if entry.confidence < min_confidence:
                continue
            results.append(entry)
        return results

    def get_by_id(self, entry_id: str) -> Optional[UnifiedEntry]:
        return self._entries.get(entry_id)

    def get_source_stats(self) -> dict[str, int]:
        """Count entries per source type."""
        stats: dict[str, int] = {}
        for entry in self._entries.values():
            if entry.is_duplicate:
                continue
            for st in entry.source_types:
                stats[st.value] = stats.get(st.value, 0) + 1
        return stats

    def get_multi_source_entries(self, min_sources: int = 2) -> list[UnifiedEntry]:
        """Find entries corroborated by multiple sources."""
        return [
            e for e in self._entries.values()
            if not e.is_duplicate and e.source_count >= min_sources
        ]

    @staticmethod
    def _compute_similarity(a: UnifiedEntry, b: UnifiedEntry) -> float:
        """Compute similarity between two entries for dedup."""
        if a.category != b.category:
            return 0.0
        if a.parameter_name.lower() != b.parameter_name.lower():
            return 0.0

        score = 0.0

        # Material match
        if a.material.lower() == b.material.lower() and a.material:
            score += 0.3
        elif not a.material or not b.material:
            score += 0.15  # one is generic

        # Operation match
        if a.operation.lower() == b.operation.lower() and a.operation:
            score += 0.3
        elif not a.operation or not b.operation:
            score += 0.15

        # Value similarity (within 30%)
        if a.value != 0 and b.value != 0:
            ratio = min(a.value, b.value) / max(a.value, b.value)
            score += 0.4 * ratio
        elif a.value == 0 and b.value == 0:
            score += 0.4

        return score


# ---------------------------------------------------------------------------
# Aggregator
# ---------------------------------------------------------------------------

class SourceAggregator:
    """Aggregates knowledge from multiple CC-EXT sources into a unified store."""

    def __init__(self):
        self._adapters: dict[SourceType, SourceAdapter] = {
            SourceType.PDF_EXTRACTION: PDFSourceAdapter(),
            SourceType.OPERATOR_FEEDBACK: FeedbackSourceAdapter(),
            SourceType.SENSOR_LEARNING: SensorSourceAdapter(),
            SourceType.QUALITY_FEEDBACK: QualitySourceAdapter(),
        }

    def aggregate(
        self,
        sources: dict[SourceType, list[Any]],
        store: Optional[UnifiedKnowledgeStore] = None,
    ) -> UnifiedKnowledgeStore:
        """Aggregate data from multiple sources into a unified store.

        Args:
            sources: Dict mapping source type to list of source-specific objects
            store: Existing store for incremental merge (creates new if None)

        Returns:
            UnifiedKnowledgeStore with all entries
        """
        if store is None:
            store = UnifiedKnowledgeStore()

        for source_type, data_list in sources.items():
            adapter = self._adapters.get(source_type)
            if adapter is None:
                continue
            for data_item in data_list:
                entries = adapter.extract_entries(data_item)
                for entry in entries:
                    store.add_entry(entry)

        return store

    def aggregate_single(
        self,
        source_type: SourceType,
        data: Any,
        store: Optional[UnifiedKnowledgeStore] = None,
    ) -> tuple[UnifiedKnowledgeStore, list[UnifiedEntry]]:
        """Aggregate a single data item. Returns (store, new_entries)."""
        if store is None:
            store = UnifiedKnowledgeStore()

        adapter = self._adapters.get(source_type)
        if adapter is None:
            return store, []

        entries = adapter.extract_entries(data)
        added = []
        for entry in entries:
            store.add_entry(entry)
            if not entry.is_duplicate:
                added.append(entry)

        return store, added
