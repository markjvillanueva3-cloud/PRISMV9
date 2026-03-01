"""Cross-Platform Operation Mapper — CC-MS8.

Maps CAD features and CAM strategies across platforms (SolidWorks, Fusion 360,
Mastercam, etc.) using canonical operation names.  Provides lookup, reverse
lookup, and auto-mapping for the extraction pipeline.

Domains:
  - cad_features:    28 canonical features across 6 CAD platforms
  - cam_strategies:   22 canonical strategies across 6 CAM platforms
  - drilling_cycles:  12 canonical cycles across 6 CNC controls
  - turning_ops:      14 canonical operations across 5 CNC controls
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from difflib import SequenceMatcher

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "platform_maps"
)

_DOMAIN_FILES = {
    "cad_features": "cad_features.json",
    "cam_strategies": "cam_strategies.json",
    "drilling_cycles": "drilling_cycles.json",
    "turning_ops": "turning_ops.json",
}

DOMAINS = list(_DOMAIN_FILES.keys())


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class MappingResult:
    """Result of a platform term resolution."""

    canonical: str
    domain: str
    source_platform: str
    source_term: str
    confidence: float = 1.0
    category: str = ""
    description: str = ""
    target_mappings: dict[str, str] = field(default_factory=dict)


@dataclass
class AutoMapResult:
    """Result of auto-mapping a platform-specific term."""

    input_term: str
    canonical: str
    domain: str
    confidence: float
    matched_platform: str
    matched_term: str
    alternatives: list[tuple[str, float]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# PlatformMapper
# ---------------------------------------------------------------------------

class PlatformMapper:
    """Cross-platform operation mapping engine."""

    def __init__(self, data_dir: str = _DATA_DIR):
        self._data_dir = data_dir
        self._cad_features: list[dict] = []
        self._cam_strategies: dict[str, list[dict]] = {}
        self._drilling_cycles: list[dict] = []
        self._turning_ops: list[dict] = []
        self._platforms: dict[str, list[str]] = {}
        self._loaded = False

    def load(self) -> dict[str, int]:
        """Load all mapping data. Returns counts per domain."""
        counts: dict[str, int] = {}

        # CAD features
        cad_path = os.path.join(self._data_dir, _DOMAIN_FILES["cad_features"])
        if os.path.exists(cad_path):
            with open(cad_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._cad_features = data.get("features", [])
            self._platforms["cad_features"] = data.get("platforms", [])
            counts["cad_features"] = len(self._cad_features)

        # CAM strategies
        cam_path = os.path.join(self._data_dir, _DOMAIN_FILES["cam_strategies"])
        if os.path.exists(cam_path):
            with open(cam_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._cam_strategies = data.get("categories", {})
            self._platforms["cam_strategies"] = data.get("platforms", [])
            total = sum(len(v) for v in self._cam_strategies.values())
            counts["cam_strategies"] = total

        # Drilling cycles
        drill_path = os.path.join(self._data_dir, _DOMAIN_FILES["drilling_cycles"])
        if os.path.exists(drill_path):
            with open(drill_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._drilling_cycles = data.get("cycles", [])
            self._platforms["drilling_cycles"] = data.get("controls", [])
            counts["drilling_cycles"] = len(self._drilling_cycles)

        # Turning ops
        turn_path = os.path.join(self._data_dir, _DOMAIN_FILES["turning_ops"])
        if os.path.exists(turn_path):
            with open(turn_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._turning_ops = data.get("operations", [])
            self._platforms["turning_ops"] = data.get("controls", [])
            counts["turning_ops"] = len(self._turning_ops)

        self._loaded = True
        return counts

    @property
    def total_mappings(self) -> int:
        """Total number of canonical operations across all domains."""
        return (
            len(self._cad_features)
            + sum(len(v) for v in self._cam_strategies.values())
            + len(self._drilling_cycles)
            + len(self._turning_ops)
        )

    def get_platforms(self, domain: str) -> list[str]:
        """Get supported platforms for a domain."""
        return self._platforms.get(domain, [])

    # -------------------------------------------------------------------
    # Lookup by canonical name
    # -------------------------------------------------------------------

    def get_canonical(self, canonical: str, domain: str | None = None) -> dict | None:
        """Look up a canonical operation. Returns raw entry dict."""
        domains = [domain] if domain else DOMAINS
        for d in domains:
            entry = self._find_canonical(canonical, d)
            if entry is not None:
                return entry
        return None

    def map_to_platform(
        self, canonical: str, target_platform: str, domain: str | None = None
    ) -> str | None:
        """Map a canonical operation to a target platform term."""
        entry = self.get_canonical(canonical, domain)
        if entry is None:
            return None

        platforms = entry.get("platforms", entry.get("gcode", {}))
        plat_data = platforms.get(target_platform)
        if plat_data is None:
            return None

        if isinstance(plat_data, dict):
            return plat_data.get("term", plat_data.get("code", ""))
        return str(plat_data)

    # -------------------------------------------------------------------
    # Reverse lookup: platform term -> canonical
    # -------------------------------------------------------------------

    def resolve_term(
        self, platform: str, term: str, domain: str | None = None
    ) -> MappingResult | None:
        """Resolve a platform-specific term to its canonical mapping.

        Args:
            platform: Source platform name.
            term: Platform-specific term to resolve.
            domain: Optional domain filter.

        Returns:
            MappingResult with canonical name and cross-platform equivalents.
        """
        term_lower = term.lower().strip()
        domains = [domain] if domain else DOMAINS

        for d in domains:
            entries = self._get_entries(d)
            for entry in entries:
                platforms = entry.get("platforms", entry.get("gcode", {}))
                plat_data = platforms.get(platform)
                if plat_data is None:
                    continue

                plat_term = ""
                if isinstance(plat_data, dict):
                    plat_term = plat_data.get("term", plat_data.get("code", ""))
                else:
                    plat_term = str(plat_data)

                if plat_term.lower().strip() == term_lower:
                    target_mappings = {}
                    for p, pd in platforms.items():
                        if p != platform:
                            if isinstance(pd, dict):
                                target_mappings[p] = pd.get("term", pd.get("code", ""))
                            else:
                                target_mappings[p] = str(pd)

                    category = entry.get("category", "")
                    if not category:
                        for cat_name, cat_entries in self._cam_strategies.items():
                            if entry in cat_entries:
                                category = cat_name
                                break

                    return MappingResult(
                        canonical=entry["canonical"],
                        domain=d,
                        source_platform=platform,
                        source_term=term,
                        confidence=1.0,
                        category=category,
                        description=entry.get("description", ""),
                        target_mappings=target_mappings,
                    )

        return None

    # -------------------------------------------------------------------
    # Auto-mapper: fuzzy matching for extraction pipeline
    # -------------------------------------------------------------------

    def auto_map(
        self, term: str, domain: str | None = None, threshold: float = 0.6
    ) -> AutoMapResult | None:
        """Auto-map a platform-specific term using fuzzy matching.

        Tries exact match first, then fuzzy. Returns None if below threshold.

        Args:
            term: The platform-specific term to map.
            domain: Optional domain filter.
            threshold: Minimum similarity for a match (0.0-1.0).

        Returns:
            AutoMapResult with best match and alternatives.
        """
        term_lower = term.lower().strip()
        domains = [domain] if domain else DOMAINS

        best_match: tuple[str, str, str, str, float] | None = None  # (canonical, domain, platform, matched_term, score)
        alternatives: list[tuple[str, float]] = []

        for d in domains:
            entries = self._get_entries(d)
            for entry in entries:
                canonical = entry["canonical"]

                # Check canonical name itself
                score = _similarity(term_lower, canonical.replace("_", " "))
                if score > threshold:
                    if best_match is None or score > best_match[4]:
                        if best_match is not None:
                            alternatives.append((best_match[0], best_match[4]))
                        best_match = (canonical, d, "", canonical, score)
                    else:
                        alternatives.append((canonical, score))

                # Check all platform terms
                platforms = entry.get("platforms", entry.get("gcode", {}))
                for platform, plat_data in platforms.items():
                    plat_term = ""
                    if isinstance(plat_data, dict):
                        plat_term = plat_data.get("term", plat_data.get("code", ""))
                    else:
                        plat_term = str(plat_data)

                    if not plat_term:
                        continue

                    score = _similarity(term_lower, plat_term.lower())
                    if score >= 1.0:
                        return AutoMapResult(
                            input_term=term,
                            canonical=canonical,
                            domain=d,
                            confidence=1.0,
                            matched_platform=platform,
                            matched_term=plat_term,
                        )

                    if score > threshold:
                        if best_match is None or score > best_match[4]:
                            if best_match is not None:
                                alternatives.append((best_match[0], best_match[4]))
                            best_match = (canonical, d, platform, plat_term, score)
                        else:
                            alternatives.append((canonical, score))

        if best_match is None:
            return None

        # Deduplicate and sort alternatives
        seen = {best_match[0]}
        unique_alts = []
        for name, score in sorted(alternatives, key=lambda x: x[1], reverse=True):
            if name not in seen:
                seen.add(name)
                unique_alts.append((name, round(score, 4)))

        return AutoMapResult(
            input_term=term,
            canonical=best_match[0],
            domain=best_match[1],
            confidence=round(best_match[4], 4),
            matched_platform=best_match[2],
            matched_term=best_match[3],
            alternatives=unique_alts[:5],
        )

    # -------------------------------------------------------------------
    # Batch operations
    # -------------------------------------------------------------------

    def list_canonical(self, domain: str) -> list[str]:
        """List all canonical names for a domain."""
        return [e["canonical"] for e in self._get_entries(domain)]

    def list_categories(self, domain: str) -> list[str]:
        """List categories for a domain (CAD features or CAM strategies)."""
        if domain == "cad_features":
            cats = set()
            for e in self._cad_features:
                cat = e.get("category", "")
                if cat:
                    cats.add(cat)
            return sorted(cats)
        if domain == "cam_strategies":
            return list(self._cam_strategies.keys())
        return []

    def get_by_category(self, domain: str, category: str) -> list[dict]:
        """Get entries filtered by category."""
        if domain == "cad_features":
            return [e for e in self._cad_features if e.get("category") == category]
        if domain == "cam_strategies":
            return self._cam_strategies.get(category, [])
        return []

    def cross_reference(
        self, source_platform: str, target_platform: str, domain: str
    ) -> list[dict]:
        """Get full cross-reference table between two platforms for a domain.

        Returns list of dicts with source_term, canonical, target_term.
        """
        results = []
        for entry in self._get_entries(domain):
            platforms = entry.get("platforms", entry.get("gcode", {}))
            source = platforms.get(source_platform)
            target = platforms.get(target_platform)

            if source is None or target is None:
                continue

            src_term = source.get("term", source.get("code", "")) if isinstance(source, dict) else str(source)
            tgt_term = target.get("term", target.get("code", "")) if isinstance(target, dict) else str(target)

            results.append({
                "canonical": entry["canonical"],
                "source_term": src_term,
                "target_term": tgt_term,
                "description": entry.get("description", ""),
            })

        return results

    def stats(self) -> dict:
        """Return mapping statistics."""
        return {
            "total_mappings": self.total_mappings,
            "cad_features": len(self._cad_features),
            "cam_strategies": sum(len(v) for v in self._cam_strategies.values()),
            "drilling_cycles": len(self._drilling_cycles),
            "turning_ops": len(self._turning_ops),
            "cad_platforms": len(self._platforms.get("cad_features", [])),
            "cam_platforms": len(self._platforms.get("cam_strategies", [])),
            "cnc_controls": len(self._platforms.get("drilling_cycles", [])),
        }

    # -------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------

    def _get_entries(self, domain: str) -> list[dict]:
        """Get all entries for a domain."""
        if domain == "cad_features":
            return self._cad_features
        if domain == "cam_strategies":
            all_strats = []
            for entries in self._cam_strategies.values():
                all_strats.extend(entries)
            return all_strats
        if domain == "drilling_cycles":
            return self._drilling_cycles
        if domain == "turning_ops":
            return self._turning_ops
        return []

    def _find_canonical(self, canonical: str, domain: str) -> dict | None:
        """Find entry by canonical name in a domain."""
        for entry in self._get_entries(domain):
            if entry.get("canonical") == canonical:
                return entry
        return None


def _similarity(a: str, b: str) -> float:
    """Compute string similarity using SequenceMatcher."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()
