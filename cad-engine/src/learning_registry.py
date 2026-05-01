"""Learning Registry — Track processed sources and generated components.

Manages the video-learned/learning-registry.json file to prevent
re-processing and enable reporting on what's been learned from both
video tutorials (/video-learn) and documents (/pdf-learn).

Part of CC-MS2: Learning Registry for /video-learn and /pdf-learn pipelines.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Optional


REGISTRY_PATH = os.path.join(
    "C:", os.sep, "PRISM", "mcp-server", "data",
    "video-learned", "learning-registry.json",
)


@dataclass
class RunRecord:
    """Record of a single /video-learn or /pdf-learn run."""
    video_id: str  # Also serves as document_id for /pdf-learn
    title: str
    url: str
    domain: str
    platform: str
    processed_at: str
    mode: str  # "live", "fixture", "search", "offline"
    flags: list[str] = field(default_factory=list)
    extraction: dict = field(default_factory=dict)
    components_generated: dict = field(default_factory=dict)
    component_ids: list[str] = field(default_factory=list)
    verification: dict = field(default_factory=dict)
    source_type: str = "video"  # "video" or "document"


@dataclass
class RegistryStats:
    """Aggregate stats across all learning runs."""
    total_videos: int = 0
    total_documents: int = 0
    total_components: int = 0
    by_domain: dict[str, int] = field(default_factory=dict)
    by_platform: dict[str, int] = field(default_factory=dict)
    by_component_type: dict[str, int] = field(default_factory=dict)


class LearningRegistry:
    """Manages the video learning registry."""

    def __init__(self, registry_path: str = REGISTRY_PATH):
        self.path = registry_path
        self.runs: list[RunRecord] = []
        self._load()

    def _load(self) -> None:
        """Load registry from disk."""
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path, encoding="utf-8") as f:
                data = json.load(f)
            for run_data in data.get("runs", []):
                self.runs.append(RunRecord(**{
                    k: v for k, v in run_data.items()
                    if k in RunRecord.__dataclass_fields__
                }))
        except (OSError, json.JSONDecodeError, TypeError):
            pass

    def save(self) -> None:
        """Save registry to disk."""
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        stats = self.get_stats()
        data = {
            "schema_version": "1.1.0",
            "description": "Registry of sources processed by /video-learn and /pdf-learn pipelines",
            "runs": [asdict(r) for r in self.runs],
            "stats": asdict(stats),
        }
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def is_processed(self, video_id: str) -> bool:
        """Check if a video has already been processed."""
        return any(r.video_id == video_id for r in self.runs)

    def get_run(self, video_id: str) -> Optional[RunRecord]:
        """Get the run record for a video."""
        for r in self.runs:
            if r.video_id == video_id:
                return r
        return None

    def add_run(self, record: RunRecord) -> None:
        """Add a new run record (or update if video_id exists)."""
        # Remove existing record for this video (re-processing)
        self.runs = [r for r in self.runs if r.video_id != record.video_id]
        self.runs.append(record)

    def get_stats(self) -> RegistryStats:
        """Compute aggregate statistics."""
        stats = RegistryStats()

        for run in self.runs:
            if getattr(run, "source_type", "video") == "document":
                stats.total_documents += 1
            else:
                stats.total_videos += 1
            # Count components
            comp = run.components_generated
            run_total = comp.get("total", sum(
                v for k, v in comp.items() if k != "total" and isinstance(v, int)
            ))
            stats.total_components += run_total

            # By domain
            stats.by_domain[run.domain] = stats.by_domain.get(run.domain, 0) + 1

            # By platform
            if run.platform:
                stats.by_platform[run.platform] = stats.by_platform.get(run.platform, 0) + 1

            # By component type
            for ctype, count in comp.items():
                if ctype != "total" and isinstance(count, int) and count > 0:
                    stats.by_component_type[ctype] = stats.by_component_type.get(ctype, 0) + count

        return stats

    def format_report(self) -> str:
        """Generate a human-readable report of learning history."""
        stats = self.get_stats()
        total_sources = stats.total_videos + stats.total_documents
        lines = [
            "LEARNING REGISTRY",
            "=" * 40,
            f"Sources processed:   {total_sources}",
            f"  Videos:            {stats.total_videos}",
            f"  Documents:         {stats.total_documents}",
            f"Components created:  {stats.total_components}",
            "",
        ]

        if stats.by_domain:
            lines.append("By Domain:")
            for k, v in sorted(stats.by_domain.items()):
                lines.append(f"  {k}: {v} videos")

        if stats.by_platform:
            lines.append("\nBy Platform:")
            for k, v in sorted(stats.by_platform.items()):
                lines.append(f"  {k}: {v} videos")

        if stats.by_component_type:
            lines.append("\nBy Component Type:")
            for k, v in sorted(stats.by_component_type.items()):
                lines.append(f"  {k}: {v}")

        if self.runs:
            lines.append("\nRecent Runs:")
            for run in self.runs[-5:]:
                lines.append(
                    f"  [{run.processed_at}] {run.video_id} — "
                    f"{run.title[:40]}... ({run.components_generated.get('total', '?')} components)"
                )

        return "\n".join(lines)


def create_run_record(
    video_id: str,
    title: str,
    url: str,
    domain: str,
    platform: str,
    mode: str,
    flags: list[str],
    extraction: dict,
    components_generated: dict,
    component_ids: list[str],
    verification: dict,
    source_type: str = "video",
) -> RunRecord:
    """Convenience function to create a RunRecord."""
    return RunRecord(
        video_id=video_id,
        title=title,
        url=url,
        domain=domain,
        platform=platform,
        processed_at=date.today().isoformat(),
        mode=mode,
        flags=flags,
        extraction=extraction,
        components_generated=components_generated,
        component_ids=component_ids,
        verification=verification,
        source_type=source_type,
    )
