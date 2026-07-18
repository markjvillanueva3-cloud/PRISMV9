"""Memory Boot Integration — CC-MS7.

Generates boot_manifest.json on shutdown, loads FTS index on startup,
produces top-N-per-domain summary, includes recent learning context.
Boot manifest target: <2000 tokens, load time <2 seconds.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone

from memory_index import MemoryIndex, MemoryEntry, DOMAINS


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_CAD_ENGINE_ROOT = os.path.dirname(os.path.dirname(__file__))
_MEMORY_DIR = os.path.join(_CAD_ENGINE_ROOT, "data", "memory")
_MANIFEST_PATH = os.path.join(_MEMORY_DIR, "boot_manifest.json")
_DEFAULT_DB = os.path.join(_MEMORY_DIR, "knowledge.db")

# Boot config
_TOP_N_PER_DOMAIN = 50
_MAX_MANIFEST_CHARS = 8000  # ~2000 tokens at ~4 chars/token


# ---------------------------------------------------------------------------
# BootManifest
# ---------------------------------------------------------------------------

class BootManifest:
    """Boot manifest data structure."""

    def __init__(self) -> None:
        self.generated_at: str = ""
        self.load_time_ms: float = 0.0
        self.total_entries: int = 0
        self.domain_counts: dict[str, int] = {}
        self.category_counts: dict[str, int] = {}
        self.top_entries: dict[str, list[dict]] = {}
        self.recent_entries: list[dict] = []

    def to_dict(self) -> dict:
        return {
            "generated_at": self.generated_at,
            "load_time_ms": round(self.load_time_ms, 2),
            "total_entries": self.total_entries,
            "domain_counts": self.domain_counts,
            "category_counts": self.category_counts,
            "top_entries": self.top_entries,
            "recent_entries": self.recent_entries,
        }

    def token_estimate(self) -> int:
        """Estimate token count (~4 chars per token)."""
        text = json.dumps(self.to_dict())
        return len(text) // 4


# ---------------------------------------------------------------------------
# MemoryBoot
# ---------------------------------------------------------------------------

class MemoryBoot:
    """Boot integration for the memory system."""

    def __init__(
        self,
        db_path: str = _DEFAULT_DB,
        manifest_path: str = _MANIFEST_PATH,
    ):
        self._db_path = db_path
        self._manifest_path = manifest_path
        self._index: MemoryIndex | None = None
        self._load_time_ms: float = 0.0

    @property
    def load_time_ms(self) -> float:
        return self._load_time_ms

    @property
    def index(self) -> MemoryIndex | None:
        return self._index

    def boot(self) -> BootManifest:
        """Boot sequence: open index, generate manifest.

        Returns the boot manifest.
        """
        t0 = time.perf_counter()

        # Open index
        self._index = MemoryIndex(self._db_path)
        self._index.open()

        # Generate manifest
        manifest = self._generate_manifest()

        t1 = time.perf_counter()
        self._load_time_ms = (t1 - t0) * 1000
        manifest.load_time_ms = self._load_time_ms

        return manifest

    def shutdown(self) -> str:
        """Shutdown sequence: generate and save manifest, close index.

        Returns the manifest file path.
        """
        if self._index is None:
            return ""

        manifest = self._generate_manifest()
        self._save_manifest(manifest)

        self._index.close()
        self._index = None
        return self._manifest_path

    def load_manifest(self) -> dict | None:
        """Load the last saved manifest (for quick boot without DB)."""
        if not os.path.exists(self._manifest_path):
            return None
        with open(self._manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    def _generate_manifest(self) -> BootManifest:
        """Generate a boot manifest from the current index state."""
        if self._index is None:
            return BootManifest()

        manifest = BootManifest()
        manifest.generated_at = datetime.now(timezone.utc).isoformat()
        manifest.total_entries = self._index.count()
        manifest.domain_counts = self._index.domain_counts()
        manifest.category_counts = self._index.category_counts()

        # Top entries per domain (highest confidence)
        for domain in DOMAINS:
            entries = self._index.get_all(domain=domain)
            # Sort by confidence desc, take top N
            entries.sort(key=lambda e: e.confidence, reverse=True)
            top = entries[:_TOP_N_PER_DOMAIN]
            manifest.top_entries[domain] = [
                self._entry_summary(e) for e in top
            ]

        # Recent entries (by updated_at)
        all_entries = self._index.get_all()
        all_entries.sort(key=lambda e: e.updated_at or e.created_at, reverse=True)
        manifest.recent_entries = [
            self._entry_summary(e) for e in all_entries[:10]
        ]

        # Trim to stay under token budget
        self._trim_manifest(manifest)
        return manifest

    @staticmethod
    def _entry_summary(entry: MemoryEntry) -> dict:
        """Create a compact summary of an entry for the manifest."""
        return {
            "id": entry.entry_id,
            "title": entry.title[:100],
            "domain": entry.domain,
            "category": entry.category,
            "confidence": round(entry.confidence, 2),
            "materials": entry.materials[:3],
        }

    @staticmethod
    def _trim_manifest(manifest: BootManifest) -> None:
        """Trim manifest to fit within token budget."""
        while manifest.token_estimate() > 2000:
            # Reduce top entries
            for domain in DOMAINS:
                entries = manifest.top_entries.get(domain, [])
                if len(entries) > 5:
                    manifest.top_entries[domain] = entries[:len(entries) - 5]

            # If still over, reduce recent
            if manifest.token_estimate() > 2000 and len(manifest.recent_entries) > 3:
                manifest.recent_entries = manifest.recent_entries[:3]

            # Safety break
            if all(len(v) <= 5 for v in manifest.top_entries.values()):
                break

    def _save_manifest(self, manifest: BootManifest) -> None:
        """Save manifest to disk."""
        os.makedirs(os.path.dirname(self._manifest_path), exist_ok=True)
        with open(self._manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest.to_dict(), f, indent=2, ensure_ascii=False)
