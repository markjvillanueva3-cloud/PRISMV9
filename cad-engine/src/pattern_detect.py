"""Pattern Detector — CC-MS4.

Analyzes extracted feature trees from multiple knowledge sources,
clusters similar feature sub-sequences using sequence alignment,
and reports recurring patterns with frequency and variance.

A "pattern" is a recurring parameterized feature sub-sequence that
appears across multiple parts/videos, indicating a reusable primitive.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FeatureSignature:
    """Normalized signature of a single feature for comparison."""
    feature_type: str
    param_names: tuple[str, ...]
    source_id: str = ""
    index: int = 0
    raw: dict = field(default_factory=dict)

    @staticmethod
    def from_feature(feature: dict, source_id: str = "", index: int = 0) -> "FeatureSignature":
        ftype = feature.get("feature_type", "other")
        params = sorted(
            p.get("name", "") for p in feature.get("parameters", [])
            if p.get("name")
        )
        return FeatureSignature(
            feature_type=ftype,
            param_names=tuple(params),
            source_id=source_id,
            index=index,
            raw=feature,
        )


@dataclass
class SubSequence:
    """A contiguous sub-sequence of feature signatures."""
    signatures: list[FeatureSignature]
    source_id: str = ""
    start_index: int = 0

    @property
    def key(self) -> str:
        """Canonical key for this sub-sequence (type sequence + param overlap)."""
        return "|".join(
            f"{s.feature_type}({','.join(s.param_names)})" for s in self.signatures
        )

    @property
    def type_key(self) -> str:
        """Simpler key using only feature types (ignores param names)."""
        return "|".join(s.feature_type for s in self.signatures)

    def __len__(self) -> int:
        return len(self.signatures)


@dataclass
class DetectedPattern:
    """A recurring pattern found across multiple sources."""
    pattern_key: str
    feature_types: list[str]
    frequency: int
    sources: list[str]
    param_names: list[str]
    param_variance: dict[str, dict]  # param_name -> {min, max, mean, values}
    examples: list[SubSequence]

    def to_dict(self) -> dict:
        return {
            "pattern_key": self.pattern_key,
            "feature_types": self.feature_types,
            "frequency": self.frequency,
            "sources": self.sources,
            "param_names": self.param_names,
            "param_variance": self.param_variance,
        }


class PatternDetector:
    """Detects recurring feature sub-sequences across multiple knowledge sources."""

    def __init__(
        self,
        min_length: int = 1,
        max_length: int = 5,
        min_frequency: int = 2,
        min_sources: int = 2,
    ):
        self.min_length = min_length
        self.max_length = max_length
        self.min_frequency = min_frequency
        self.min_sources = min_sources

    def detect(self, knowledge_sources: list[dict]) -> list[DetectedPattern]:
        """Detect recurring patterns across multiple knowledge sources.

        Args:
            knowledge_sources: List of knowledge dicts with structure:
                {
                    "source_id": "video_001",
                    "cad": {"features": [...]},
                    # or "domains": {"cad": {"features": [...]}}
                }

        Returns:
            List of DetectedPattern sorted by frequency (descending).
        """
        # Step 1: Extract feature signatures from each source
        all_signatures: list[list[FeatureSignature]] = []
        for source in knowledge_sources:
            sid = source.get("source_id", source.get("video_id", "unknown"))
            cad = source.get("cad", source.get("domains", {}).get("cad", {}))
            features = cad.get("features", [])
            sigs = [
                FeatureSignature.from_feature(f, source_id=sid, index=i)
                for i, f in enumerate(features)
            ]
            if sigs:
                all_signatures.append(sigs)

        if not all_signatures:
            return []

        # Step 2: Extract all sub-sequences of length min..max
        subsequences: list[SubSequence] = []
        for sig_list in all_signatures:
            for length in range(self.min_length, self.max_length + 1):
                for start in range(len(sig_list) - length + 1):
                    sub = SubSequence(
                        signatures=sig_list[start:start + length],
                        source_id=sig_list[start].source_id,
                        start_index=start,
                    )
                    subsequences.append(sub)

        # Step 3: Group by type_key (feature type sequence)
        groups: dict[str, list[SubSequence]] = defaultdict(list)
        for sub in subsequences:
            groups[sub.type_key].append(sub)

        # Step 4: Filter by frequency and source diversity
        patterns: list[DetectedPattern] = []
        for type_key, subs in groups.items():
            if len(subs) < self.min_frequency:
                continue

            sources = list({s.source_id for s in subs})
            if len(sources) < self.min_sources:
                continue

            # Compute parameter variance
            feature_types = type_key.split("|")
            all_params: dict[str, list[float]] = defaultdict(list)

            for sub in subs:
                for sig in sub.signatures:
                    for param in sig.raw.get("parameters", []):
                        pname = param.get("name", "")
                        pval = param.get("value")
                        if pname and isinstance(pval, (int, float)):
                            all_params[pname].append(float(pval))

            param_variance: dict[str, dict] = {}
            for pname, values in all_params.items():
                param_variance[pname] = {
                    "min": min(values),
                    "max": max(values),
                    "mean": sum(values) / len(values),
                    "count": len(values),
                }

            patterns.append(DetectedPattern(
                pattern_key=type_key,
                feature_types=feature_types,
                frequency=len(subs),
                sources=sources,
                param_names=sorted(all_params.keys()),
                param_variance=param_variance,
                examples=subs[:5],  # Keep top 5 examples
            ))

        # Sort by frequency descending
        patterns.sort(key=lambda p: p.frequency, reverse=True)
        return patterns

    def detect_single_features(
        self, knowledge_sources: list[dict]
    ) -> list[DetectedPattern]:
        """Detect recurring single feature types (length=1 sub-sequences).

        Convenience method for finding the most common individual operations.
        """
        saved = (self.min_length, self.max_length)
        self.min_length, self.max_length = 1, 1
        try:
            return self.detect(knowledge_sources)
        finally:
            self.min_length, self.max_length = saved

    def summarize(self, patterns: list[DetectedPattern]) -> dict:
        """Generate a summary report of detected patterns."""
        return {
            "total_patterns": len(patterns),
            "top_patterns": [
                {
                    "key": p.pattern_key,
                    "frequency": p.frequency,
                    "sources": len(p.sources),
                    "params": len(p.param_names),
                }
                for p in patterns[:10]
            ],
            "feature_type_distribution": dict(
                Counter(
                    ft for p in patterns for ft in p.feature_types
                ).most_common()
            ),
        }
