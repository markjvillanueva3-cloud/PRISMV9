"""Memory Compaction Engine — CC-MS7.

Consolidates near-duplicate entries, merges consensus values,
archives low-confidence records, and maintains provenance chain.
"""

from __future__ import annotations

from datetime import datetime, timezone

from memory_index import MemoryEntry, MemoryIndex


# ---------------------------------------------------------------------------
# Similarity
# ---------------------------------------------------------------------------

def _jaccard(a: str, b: str) -> float:
    """Jaccard word similarity between two strings."""
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def _content_similar(a: MemoryEntry, b: MemoryEntry, threshold: float = 0.75) -> bool:
    """Check if two entries are content-similar enough to merge."""
    if a.domain != b.domain:
        return False
    if a.category != b.category:
        return False
    title_sim = _jaccard(a.title, b.title)
    content_sim = _jaccard(a.content, b.content)
    # Weighted: title matters more for identity
    combined = 0.6 * title_sim + 0.4 * content_sim
    return combined >= threshold


# ---------------------------------------------------------------------------
# CompactionResult
# ---------------------------------------------------------------------------

class CompactionResult:
    """Result of a compaction run."""

    def __init__(self) -> None:
        self.merged = 0
        self.archived = 0
        self.kept = 0
        self.total_before = 0
        self.total_after = 0

    def to_dict(self) -> dict:
        return {
            "merged": self.merged,
            "archived": self.archived,
            "kept": self.kept,
            "total_before": self.total_before,
            "total_after": self.total_after,
        }


# ---------------------------------------------------------------------------
# MemoryCompactor
# ---------------------------------------------------------------------------

class MemoryCompactor:
    """Compacts the memory index by merging duplicates and archiving low-confidence entries."""

    def __init__(self, index: MemoryIndex):
        self._index = index

    def compact(
        self,
        similarity_threshold: float = 0.75,
        archive_below_confidence: float = 0.15,
        dry_run: bool = False,
    ) -> CompactionResult:
        """Run compaction.

        1. Find and merge near-duplicate entries.
        2. Archive entries below confidence threshold.

        Args:
            similarity_threshold: Jaccard threshold for merging (0..1).
            archive_below_confidence: Archive entries below this confidence.
            dry_run: If True, don't modify the index — just report.

        Returns:
            CompactionResult with stats.
        """
        result = CompactionResult()
        entries = self._index.get_all(include_archived=False)
        result.total_before = len(entries)

        # Phase 1: Merge near-duplicates
        merged_ids: set[str] = set()

        for i, entry_a in enumerate(entries):
            if entry_a.entry_id in merged_ids:
                continue
            for entry_b in entries[i + 1:]:
                if entry_b.entry_id in merged_ids:
                    continue
                if _content_similar(entry_a, entry_b, similarity_threshold):
                    if not dry_run:
                        self._merge_entries(entry_a, entry_b)
                    merged_ids.add(entry_b.entry_id)
                    result.merged += 1

        # Phase 2: Archive low-confidence
        remaining = [e for e in entries if e.entry_id not in merged_ids]
        for entry in remaining:
            if entry.confidence < archive_below_confidence:
                if not dry_run:
                    self._index.archive(entry.entry_id)
                result.archived += 1

        result.kept = result.total_before - result.merged - result.archived
        result.total_after = result.kept
        return result

    def find_duplicates(
        self,
        threshold: float = 0.75,
    ) -> list[tuple[str, str, float]]:
        """Find duplicate pairs without modifying.

        Returns list of (id_a, id_b, similarity_score) tuples.
        """
        entries = self._index.get_all(include_archived=False)
        dupes: list[tuple[str, str, float]] = []

        for i, a in enumerate(entries):
            for b in entries[i + 1:]:
                if a.domain != b.domain or a.category != b.category:
                    continue
                title_sim = _jaccard(a.title, b.title)
                content_sim = _jaccard(a.content, b.content)
                combined = 0.6 * title_sim + 0.4 * content_sim
                if combined >= threshold:
                    dupes.append((a.entry_id, b.entry_id, round(combined, 4)))

        return dupes

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    def _merge_entries(self, keep: MemoryEntry, discard: MemoryEntry) -> None:
        """Merge discard into keep, then archive discard."""
        now = datetime.now(timezone.utc).isoformat()

        # Merge confidence (boost)
        keep.confidence = min(1.0, (keep.confidence + discard.confidence) / 2 + 0.05)

        # Merge tags
        keep.tags = list(set(keep.tags) | set(discard.tags))

        # Merge materials and machines
        keep.materials = list(set(keep.materials) | set(discard.materials))
        keep.machines = list(set(keep.machines) | set(discard.machines))

        # Append content if discard has unique info
        if discard.content and _jaccard(keep.content, discard.content) < 0.9:
            keep.content += f"\n[Merged from {discard.entry_id}]: {discard.content}"

        keep.updated_at = now
        self._index.upsert(keep)
        self._index.archive(discard.entry_id)
