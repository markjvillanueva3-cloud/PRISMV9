"""CAM Strategy Aggregator — CC-MS5.

Combines machining strategy parameters from multiple video sources for the
same strategy-material-machine combination.  Computes consensus ranges
(mean / min / max / stddev), weights by source authority, and stores
aggregated records with full provenance.

The output feeds strategy_recommend.py for ranked strategy selection.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Data path
# ---------------------------------------------------------------------------

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "cam_strategies"
)
_DB_PATH = os.path.join(_DATA_DIR, "strategy_db.json")


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class ParameterStats:
    """Statistical summary for a single cutting parameter."""

    name: str
    unit: str
    mean: float
    min_val: float
    max_val: float
    stddev: float
    sample_count: int
    values: list[float] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "unit": self.unit,
            "mean": round(self.mean, 4),
            "min": round(self.min_val, 4),
            "max": round(self.max_val, 4),
            "stddev": round(self.stddev, 4),
            "sample_count": self.sample_count,
        }


@dataclass
class SourceRecord:
    """A single observation from one video source."""

    video_id: str
    video_title: str = ""
    channel: str = ""
    channel_subscribers: int = 0
    views: int = 0
    likes: int = 0
    published_date: str = ""
    confidence: float = 0.5
    parameters: dict[str, float] = field(default_factory=dict)
    parameter_units: dict[str, str] = field(default_factory=dict)
    tool_description: str = ""
    strategy_rationale: str = ""
    coolant: str = ""
    workholding: str = ""
    timestamp_seconds: Optional[float] = None

    def authority_weight(self) -> float:
        """Compute source authority weight (0..1).

        Factors: subscriber count, view count, likes ratio, confidence.
        """
        sub_score = min(self.channel_subscribers / 500_000, 1.0) if self.channel_subscribers > 0 else 0.2
        view_score = min(self.views / 100_000, 1.0) if self.views > 0 else 0.2
        like_ratio = (self.likes / max(self.views, 1)) if self.views > 0 else 0.0
        like_score = min(like_ratio / 0.05, 1.0)  # 5% like ratio = max score
        conf_score = self.confidence

        return 0.25 * sub_score + 0.20 * view_score + 0.15 * like_score + 0.40 * conf_score

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class StrategyRecord:
    """Aggregated strategy-material-machine combination."""

    strategy_id: str
    operation_type: str
    material_class: str  # e.g. "aluminum", "steel", "titanium"
    material_spec: str = ""  # e.g. "6061-T6", "4140"
    machine_type: str = ""  # e.g. "3-axis_vertical", "5-axis"
    tool_type: str = ""  # e.g. "end_mill", "face_mill"
    tool_diameter_mm: Optional[float] = None
    tool_flutes: Optional[int] = None
    tool_material: str = ""  # e.g. "carbide", "hss"
    tool_coating: str = ""  # e.g. "TiAlN", "AlCrN"
    consensus_params: list[ParameterStats] = field(default_factory=list)
    sources: list[SourceRecord] = field(default_factory=list)
    confidence_weighted: float = 0.0
    source_count: int = 0
    last_updated: str = ""
    tags: list[str] = field(default_factory=list)

    @property
    def combo_key(self) -> str:
        """Unique key for this strategy-material-machine combo."""
        return f"{self.operation_type}|{self.material_class}|{self.machine_type}|{self.tool_type}"

    def to_dict(self) -> dict:
        return {
            "strategy_id": self.strategy_id,
            "operation_type": self.operation_type,
            "material_class": self.material_class,
            "material_spec": self.material_spec,
            "machine_type": self.machine_type,
            "tool_type": self.tool_type,
            "tool_diameter_mm": self.tool_diameter_mm,
            "tool_flutes": self.tool_flutes,
            "tool_material": self.tool_material,
            "tool_coating": self.tool_coating,
            "consensus_params": [p.to_dict() for p in self.consensus_params],
            "sources": [s.to_dict() for s in self.sources],
            "confidence_weighted": round(self.confidence_weighted, 4),
            "source_count": self.source_count,
            "last_updated": self.last_updated,
            "tags": self.tags,
        }


# ---------------------------------------------------------------------------
# Statistics helpers
# ---------------------------------------------------------------------------


def _compute_weighted_stats(
    values: list[float],
    weights: list[float],
    name: str,
    unit: str,
) -> ParameterStats:
    """Compute weighted mean, min, max, stddev for a parameter."""
    if not values:
        return ParameterStats(name=name, unit=unit, mean=0, min_val=0, max_val=0, stddev=0, sample_count=0)

    total_weight = sum(weights)
    if total_weight == 0:
        total_weight = len(values)
        weights = [1.0] * len(values)

    w_mean = sum(v * w for v, w in zip(values, weights)) / total_weight

    if len(values) > 1:
        variance = sum(w * (v - w_mean) ** 2 for v, w in zip(values, weights)) / total_weight
        stddev = math.sqrt(variance)
    else:
        stddev = 0.0

    return ParameterStats(
        name=name,
        unit=unit,
        mean=w_mean,
        min_val=min(values),
        max_val=max(values),
        stddev=stddev,
        sample_count=len(values),
        values=values,
    )


# ---------------------------------------------------------------------------
# Strategy Database
# ---------------------------------------------------------------------------


class StrategyDB:
    """In-memory strategy database with persistence."""

    def __init__(self, db_path: str = _DB_PATH):
        self.db_path = db_path
        self.strategies: dict[str, StrategyRecord] = {}
        self._next_id = 1
        self._load()

    def _load(self) -> None:
        """Load from disk."""
        if not os.path.exists(self.db_path):
            return
        try:
            with open(self.db_path, encoding="utf-8") as f:
                data = json.load(f)
            for s in data.get("strategies", []):
                rec = self._dict_to_record(s)
                self.strategies[rec.combo_key] = rec
                sid_num = rec.strategy_id.replace("strat-", "")
                if sid_num.isdigit():
                    self._next_id = max(self._next_id, int(sid_num) + 1)
        except (OSError, json.JSONDecodeError, TypeError, KeyError):
            pass

    def _dict_to_record(self, d: dict) -> StrategyRecord:
        """Convert dict back to StrategyRecord."""
        sources = []
        for sd in d.get("sources", []):
            sources.append(SourceRecord(**{
                k: v for k, v in sd.items()
                if k in SourceRecord.__dataclass_fields__
            }))

        consensus = []
        for pd in d.get("consensus_params", []):
            consensus.append(ParameterStats(
                name=pd["name"],
                unit=pd.get("unit", ""),
                mean=pd.get("mean", 0),
                min_val=pd.get("min", 0),
                max_val=pd.get("max", 0),
                stddev=pd.get("stddev", 0),
                sample_count=pd.get("sample_count", 0),
            ))

        return StrategyRecord(
            strategy_id=d.get("strategy_id", f"strat-{self._next_id:04d}"),
            operation_type=d.get("operation_type", ""),
            material_class=d.get("material_class", ""),
            material_spec=d.get("material_spec", ""),
            machine_type=d.get("machine_type", ""),
            tool_type=d.get("tool_type", ""),
            tool_diameter_mm=d.get("tool_diameter_mm"),
            tool_flutes=d.get("tool_flutes"),
            tool_material=d.get("tool_material", ""),
            tool_coating=d.get("tool_coating", ""),
            consensus_params=consensus,
            sources=sources,
            confidence_weighted=d.get("confidence_weighted", 0),
            source_count=d.get("source_count", 0),
            last_updated=d.get("last_updated", ""),
            tags=d.get("tags", []),
        )

    def save(self) -> None:
        """Persist to disk."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        materials = sorted({s.material_class for s in self.strategies.values() if s.material_class})
        machines = sorted({s.machine_type for s in self.strategies.values() if s.machine_type})
        all_sources = set()
        for s in self.strategies.values():
            for src in s.sources:
                all_sources.add(src.video_id)

        data = {
            "schema_version": "1.0.0",
            "description": "CAM strategy database — learned machining strategies aggregated from video tutorials",
            "strategies": [s.to_dict() for s in self.strategies.values()],
            "metadata": {
                "total_strategies": len(self.strategies),
                "total_sources": len(all_sources),
                "materials_covered": materials,
                "machines_covered": machines,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            },
        }
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def ingest_extraction(
        self,
        cam_data: dict,
        video_id: str,
        video_title: str = "",
        channel: str = "",
        channel_subscribers: int = 0,
        views: int = 0,
        likes: int = 0,
        published_date: str = "",
        material_class: str = "",
        material_spec: str = "",
        machine_type: str = "",
    ) -> list[str]:
        """Ingest CAM extraction results into the strategy DB.

        Takes the 'cam' domain object from knowledge_extract and adds each
        strategy to the DB, merging with existing records where the
        strategy-material-machine combo already exists.

        Returns list of strategy_ids that were created or updated.
        """
        strategies = cam_data.get("strategies", [])
        updated_ids: list[str] = []

        for strat in strategies:
            op_type = strat.get("operation_type", "other")
            tool = strat.get("tool", {})
            tool_type = tool.get("type", "")

            # Build source record
            params: dict[str, float] = {}
            param_units: dict[str, str] = {}
            for cp in strat.get("cutting_parameters", []):
                pname = cp.get("name", "")
                pval = cp.get("value")
                if pname and pval is not None and isinstance(pval, (int, float)):
                    params[pname] = float(pval)
                    param_units[pname] = cp.get("unit", "")

            prov = strat.get("provenance", {})
            source = SourceRecord(
                video_id=video_id,
                video_title=video_title,
                channel=channel,
                channel_subscribers=channel_subscribers,
                views=views,
                likes=likes,
                published_date=published_date,
                confidence=prov.get("confidence", 0.5),
                parameters=params,
                parameter_units=param_units,
                tool_description=tool.get("description", ""),
                strategy_rationale=strat.get("strategy_rationale", ""),
                coolant=strat.get("coolant", ""),
                workholding=strat.get("workholding", ""),
                timestamp_seconds=prov.get("timestamp_seconds"),
            )

            # Build combo key
            combo_key = f"{op_type}|{material_class}|{machine_type}|{tool_type}"

            if combo_key in self.strategies:
                record = self.strategies[combo_key]
                record.sources.append(source)
            else:
                sid = f"strat-{self._next_id:04d}"
                self._next_id += 1
                record = StrategyRecord(
                    strategy_id=sid,
                    operation_type=op_type,
                    material_class=material_class,
                    material_spec=material_spec,
                    machine_type=machine_type,
                    tool_type=tool_type,
                    tool_diameter_mm=tool.get("diameter_mm"),
                    tool_flutes=tool.get("flutes"),
                    tool_material=tool.get("material", ""),
                    tool_coating=tool.get("coating", ""),
                    sources=[source],
                )
                self.strategies[combo_key] = record

            # Recompute consensus
            self._recompute_consensus(record)
            updated_ids.append(record.strategy_id)

        return updated_ids

    def _recompute_consensus(self, record: StrategyRecord) -> None:
        """Recompute consensus parameters from all sources."""
        # Collect all parameter names across sources
        all_param_names: dict[str, str] = {}  # name -> unit
        for src in record.sources:
            for pname, pval in src.parameters.items():
                if pname not in all_param_names:
                    all_param_names[pname] = src.parameter_units.get(pname, "")

        # Compute weighted stats for each parameter
        consensus: list[ParameterStats] = []
        weights = [src.authority_weight() for src in record.sources]

        for pname, unit in sorted(all_param_names.items()):
            values = []
            param_weights = []
            for src, w in zip(record.sources, weights):
                if pname in src.parameters:
                    values.append(src.parameters[pname])
                    param_weights.append(w)

            if values:
                stats = _compute_weighted_stats(values, param_weights, pname, unit)
                consensus.append(stats)

        record.consensus_params = consensus
        record.source_count = len(record.sources)
        record.last_updated = datetime.now(timezone.utc).isoformat()

        # Weighted confidence
        if weights:
            record.confidence_weighted = sum(
                src.confidence * w for src, w in zip(record.sources, weights)
            ) / sum(weights)

    def query(
        self,
        operation_type: str = "",
        material_class: str = "",
        machine_type: str = "",
        tool_type: str = "",
        min_sources: int = 0,
        min_confidence: float = 0.0,
    ) -> list[StrategyRecord]:
        """Query strategies matching the given filters.

        All filters are optional — empty string matches everything.
        """
        results = []
        for record in self.strategies.values():
            if operation_type and record.operation_type != operation_type:
                continue
            if material_class and record.material_class != material_class:
                continue
            if machine_type and record.machine_type != machine_type:
                continue
            if tool_type and record.tool_type != tool_type:
                continue
            if record.source_count < min_sources:
                continue
            if record.confidence_weighted < min_confidence:
                continue
            results.append(record)

        # Sort by confidence descending, then by source count
        results.sort(key=lambda r: (-r.confidence_weighted, -r.source_count))
        return results

    def get_materials(self) -> list[str]:
        """Get all material classes in the DB."""
        return sorted({r.material_class for r in self.strategies.values() if r.material_class})

    def get_operation_types(self) -> list[str]:
        """Get all operation types in the DB."""
        return sorted({r.operation_type for r in self.strategies.values() if r.operation_type})

    def summary(self) -> dict:
        """Return a summary of the database contents."""
        return {
            "total_strategies": len(self.strategies),
            "materials": self.get_materials(),
            "operation_types": self.get_operation_types(),
            "total_sources": len({
                src.video_id
                for rec in self.strategies.values()
                for src in rec.sources
            }),
        }
