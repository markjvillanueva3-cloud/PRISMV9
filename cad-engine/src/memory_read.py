"""Memory Reader — CC-MS7.

Natural language search query -> FTS5 query -> ranked results with
similarity scoring and provenance. Supports filter combinations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from memory_index import MemoryEntry, MemoryIndex


# ---------------------------------------------------------------------------
# Result wrapper
# ---------------------------------------------------------------------------

@dataclass
class SearchResult:
    """A search result with relevance scoring."""

    entry: MemoryEntry
    relevance: float = 0.0
    snippet: str = ""

    def to_dict(self) -> dict:
        d = self.entry.to_dict()
        d["relevance"] = round(self.relevance, 4)
        d["snippet"] = self.snippet
        return d


# ---------------------------------------------------------------------------
# NL Query Parser
# ---------------------------------------------------------------------------

# Domain keyword mapping
_DOMAIN_KEYWORDS = {
    "cad": ["cad", "drawing", "dimension", "tolerance", "gd&t", "sketch", "model"],
    "cam": ["cam", "toolpath", "strategy", "machining", "milling", "turning",
            "drilling", "operation", "gcode", "g-code"],
    "shop": ["shop", "practice", "tip", "troubleshoot", "chatter", "vibration",
             "surface finish", "tool wear", "coolant", "workholding", "setup"],
}

# Material keywords
_MATERIAL_KEYWORDS = [
    "aluminum", "steel", "stainless", "titanium", "cast iron", "brass",
    "copper", "inconel", "hastelloy", "plastic", "composite",
    "6061", "4140", "304", "316", "ti-6al-4v",
]

# Category mapping
_CATEGORY_KEYWORDS = {
    "cutting_practices": ["cutting", "speeds", "feeds", "rpm", "sfm", "ipm",
                          "depth of cut", "stepover"],
    "tool_management": ["tool", "end mill", "drill", "insert", "coating",
                        "carbide", "hss"],
    "setup_workholding": ["setup", "workholding", "vise", "clamp", "fixture",
                          "chuck", "collet"],
    "troubleshooting": ["troubleshoot", "problem", "issue", "chatter",
                        "vibration", "noise", "poor finish"],
    "material_tips": ["material", "alloy", "hardness", "machinability"],
    "machine_tips": ["machine", "cnc", "spindle", "controller", "axis"],
    "trouble_trees": ["decision tree", "diagnostic", "symptom", "cause",
                      "solution"],
}


def parse_nl_query(query: str) -> dict:
    """Parse a natural language query into structured filters.

    Returns dict with keys: terms, domain, category, materials, min_confidence.
    """
    q = query.lower().strip()
    result: dict = {
        "terms": [],
        "domain": None,
        "category": None,
        "materials": [],
        "min_confidence": 0.0,
    }

    # Detect domain
    for domain, keywords in _DOMAIN_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["domain"] = domain
            break

    # Detect materials
    for mat in _MATERIAL_KEYWORDS:
        if mat in q:
            result["materials"].append(mat)

    # Detect category
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["category"] = cat
            break

    # Detect confidence filter
    conf_match = re.search(r"confidence\s*[>>=]\s*([\d.]+)", q)
    if conf_match:
        result["min_confidence"] = float(conf_match.group(1))

    # Extract search terms (remove detected keywords to reduce noise)
    stop_words = {"the", "a", "an", "for", "in", "on", "with", "about",
                  "how", "to", "what", "is", "are", "do", "does", "can",
                  "best", "good", "when", "why"}
    words = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", q)
    result["terms"] = [w for w in words if w not in stop_words and len(w) > 1]

    return result


# ---------------------------------------------------------------------------
# MemoryReader
# ---------------------------------------------------------------------------


class MemoryReader:
    """Natural language search interface over the memory index."""

    def __init__(self, index: MemoryIndex):
        self._index = index

    def search(
        self,
        query: str,
        domain: str | None = None,
        category: str | None = None,
        materials: list[str] | None = None,
        machines: list[str] | None = None,
        min_confidence: float = 0.0,
        limit: int = 20,
    ) -> list[SearchResult]:
        """Search memory using natural language.

        Parses the query to extract domain/material/category hints,
        then performs FTS5 search with those filters.
        """
        parsed = parse_nl_query(query)

        # Use explicit params over parsed hints
        search_domain = domain or parsed["domain"]
        search_category = category or parsed["category"]
        search_materials = materials or parsed["materials"] or None
        search_confidence = max(min_confidence, parsed["min_confidence"])

        # Build FTS query from terms
        fts_terms = " ".join(parsed["terms"]) if parsed["terms"] else query

        entries = self._index.search(
            query=fts_terms,
            domain=search_domain,
            category=search_category,
            materials=search_materials,
            machines=machines,
            min_confidence=search_confidence,
            limit=limit,
        )

        # Score and wrap results
        results = []
        for i, entry in enumerate(entries):
            relevance = self._score_relevance(entry, parsed, i, len(entries))
            snippet = self._make_snippet(entry.content, parsed["terms"])
            results.append(SearchResult(
                entry=entry,
                relevance=relevance,
                snippet=snippet,
            ))

        # Sort by relevance descending
        results.sort(key=lambda r: r.relevance, reverse=True)
        return results

    def search_by_material(
        self,
        material: str,
        limit: int = 20,
    ) -> list[SearchResult]:
        """Search for all knowledge related to a specific material."""
        return self.search(material, materials=[material], limit=limit)

    def search_by_domain(
        self,
        domain: str,
        query: str = "",
        limit: int = 20,
    ) -> list[SearchResult]:
        """Search within a specific domain."""
        return self.search(query or "*", domain=domain, limit=limit)

    def get_summary(self) -> dict:
        """Get a summary of all indexed knowledge."""
        return {
            "total": self._index.count(),
            "by_domain": self._index.domain_counts(),
            "by_category": self._index.category_counts(),
        }

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    @staticmethod
    def _score_relevance(
        entry: MemoryEntry,
        parsed: dict,
        rank: int,
        total: int,
    ) -> float:
        """Score result relevance 0..1."""
        # Base: FTS rank position (higher rank = higher score)
        position_score = 1.0 - (rank / max(total, 1))

        # Confidence boost
        conf_score = entry.confidence

        # Material match boost
        mat_boost = 0.0
        if parsed["materials"] and entry.materials:
            query_mats = set(m.lower() for m in parsed["materials"])
            entry_mats = set(m.lower() for m in entry.materials)
            if query_mats & entry_mats:
                mat_boost = 0.15

        # Domain match boost
        domain_boost = 0.1 if parsed["domain"] and entry.domain == parsed["domain"] else 0.0

        score = 0.40 * position_score + 0.30 * conf_score + mat_boost + domain_boost + 0.05
        return min(score, 1.0)

    @staticmethod
    def _make_snippet(content: str, terms: list[str], max_len: int = 200) -> str:
        """Extract a relevant snippet from content around matched terms."""
        if not terms or not content:
            return content[:max_len] if content else ""

        content_lower = content.lower()
        best_pos = 0
        best_score = 0

        for i in range(0, len(content_lower) - 10, 20):
            window = content_lower[i:i + max_len]
            score = sum(1 for t in terms if t in window)
            if score > best_score:
                best_score = score
                best_pos = i

        snippet = content[best_pos:best_pos + max_len]
        if best_pos > 0:
            snippet = "..." + snippet
        if best_pos + max_len < len(content):
            snippet = snippet + "..."
        return snippet
