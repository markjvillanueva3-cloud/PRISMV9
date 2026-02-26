"""
PRISM Hierarchical Memory Manager
Manages hot/warm/cold memory tiers for unlimited context expansion.
Implements Law 3: External Memory Expansion

Author: PRISM Claude Development Enhancement
Version: 1.0.0
"""

import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import shutil


class MemoryTier(Enum):
    """Memory storage tiers"""
    HOT = "hot"      # In-context, immediate access (<1ms)
    WARM = "warm"    # On-disk, recent files (<100ms)
    COLD = "cold"    # Archived, old files (<1s)


@dataclass
class MemoryRecord:
    """A record stored in memory"""
    key: str
    content: Any
    tier: MemoryTier
    created_at: str
    accessed_at: str
    access_count: int
    size_bytes: int
    content_hash: str
    tags: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class MemoryStats:
    """Statistics about memory usage"""
    hot_count: int
    warm_count: int
    cold_count: int
    hot_size_bytes: int
    warm_size_bytes: int
    cold_size_bytes: int
    total_records: int
    total_size_bytes: int


class HierarchicalMemoryManager:
    """
    Manages memory across three tiers:
    - HOT: In-context dictionary (limited capacity)
    - WARM: Recent files on disk (fast access)
    - COLD: Archived files (compressed, slower)
    
    Automatically promotes/demotes based on access patterns.
    """
    
    HOT_CAPACITY = 50  # Max items in hot memory
    WARM_TO_COLD_DAYS = 7  # Days before warm becomes cold
    
    def __init__(self, base_path: str = "C:\\PRISM\\state\\memory"):
        self.base_path = Path(base_path)
        self.hot_path = self.base_path / "hot"
        self.warm_path = self.base_path / "warm"
        self.cold_path = self.base_path / "cold"
        
        # Create directories
        for path in [self.hot_path, self.warm_path, self.cold_path]:
            path.mkdir(parents=True, exist_ok=True)
        
        # In-memory hot storage
        self.hot_memory: Dict[str, MemoryRecord] = {}
        
        # Index for fast lookups
        self.index: Dict[str, Dict] = {}
        self._load_index()
    
    def _load_index(self):
        """Load or create the memory index"""
        index_path = self.base_path / "memory_index.json"
        if index_path.exists():
            with open(index_path, 'r') as f:
                self.index = json.load(f)
        else:
            self.index = {"records": {}, "tags": {}, "stats": {}}
    
    def _save_index(self):
        """Save the memory index"""
        index_path = self.base_path / "memory_index.json"
        with open(index_path, 'w') as f:
            json.dump(self.index, f, indent=2, default=str)
    
    def _compute_hash(self, content: Any) -> str:
        """Compute content hash for deduplication"""
        content_str = json.dumps(content, sort_keys=True, default=str)
        return hashlib.md5(content_str.encode()).hexdigest()[:12]
    
    def _get_size(self, content: Any) -> int:
        """Get content size in bytes"""
        return len(json.dumps(content, default=str).encode())
    
    def store(self, key: str, content: Any, tags: List[str] = None, 
              tier: MemoryTier = MemoryTier.WARM, metadata: Dict = None) -> Dict:
        """
        Store content in memory.
        Default tier is WARM (on-disk) to avoid filling hot memory.
        """
        tags = tags or []
        metadata = metadata or {}
        now = datetime.now().isoformat()
        
        record = MemoryRecord(
            key=key,
            content=content,
            tier=tier,
            created_at=now,
            accessed_at=now,
            access_count=1,
            size_bytes=self._get_size(content),
            content_hash=self._compute_hash(content),
            tags=tags,
            metadata=metadata
        )
        
        # Store based on tier
        if tier == MemoryTier.HOT:
            self._store_hot(record)
        elif tier == MemoryTier.WARM:
            self._store_warm(record)
        else:
            self._store_cold(record)
        
        # Update index
        self.index["records"][key] = {
            "tier": tier.value,
            "created_at": now,
            "size_bytes": record.size_bytes,
            "hash": record.content_hash,
            "tags": tags
        }
        
        # Update tag index
        for tag in tags:
            if tag not in self.index["tags"]:
                self.index["tags"][tag] = []
            if key not in self.index["tags"][tag]:
                self.index["tags"][tag].append(key)
        
        self._save_index()
        
        return {
            "stored": True,
            "key": key,
            "tier": tier.value,
            "size_bytes": record.size_bytes,
            "hash": record.content_hash
        }
    
    def _store_hot(self, record: MemoryRecord):
        """Store in hot memory (in-context)"""
        # Check capacity
        if len(self.hot_memory) >= self.HOT_CAPACITY:
            self._demote_lru_hot()
        
        self.hot_memory[record.key] = record
    
    def _store_warm(self, record: MemoryRecord):
        """Store in warm memory (on-disk)"""
        filepath = self.warm_path / f"{record.key}.json"
        data = {
            "key": record.key,
            "content": record.content,
            "created_at": record.created_at,
            "accessed_at": record.accessed_at,
            "access_count": record.access_count,
            "tags": record.tags,
            "metadata": record.metadata
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def _store_cold(self, record: MemoryRecord):
        """Store in cold memory (archived)"""
        filepath = self.cold_path / f"{record.key}.json"
        data = {
            "key": record.key,
            "content": record.content,
            "created_at": record.created_at,
            "accessed_at": record.accessed_at,
            "access_count": record.access_count,
            "tags": record.tags,
            "metadata": record.metadata,
            "archived_at": datetime.now().isoformat()
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def _demote_lru_hot(self):
        """Demote least recently used hot item to warm"""
        if not self.hot_memory:
            return
        
        # Find LRU item
        lru_key = min(
            self.hot_memory.keys(),
            key=lambda k: self.hot_memory[k].accessed_at
        )
        
        record = self.hot_memory.pop(lru_key)
        record.tier = MemoryTier.WARM
        self._store_warm(record)
        
        # Update index
        if lru_key in self.index["records"]:
            self.index["records"][lru_key]["tier"] = "warm"
    
    def retrieve(self, key: str, promote: bool = True) -> Dict:
        """
        Retrieve content by key.
        Optionally promotes to hotter tier based on access.
        """
        # Check hot first
        if key in self.hot_memory:
            record = self.hot_memory[key]
            record.accessed_at = datetime.now().isoformat()
            record.access_count += 1
            return {
                "found": True,
                "key": key,
                "content": record.content,
                "tier": "hot",
                "access_count": record.access_count
            }
        
        # Check warm
        warm_path = self.warm_path / f"{key}.json"
        if warm_path.exists():
            with open(warm_path, 'r') as f:
                data = json.load(f)
            
            # Update access
            data["accessed_at"] = datetime.now().isoformat()
            data["access_count"] = data.get("access_count", 0) + 1
            
            with open(warm_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Promote to hot if frequently accessed
            if promote and data["access_count"] >= 3:
                self._promote_to_hot(key, data)
            
            return {
                "found": True,
                "key": key,
                "content": data["content"],
                "tier": "warm",
                "access_count": data["access_count"]
            }
        
        # Check cold
        cold_path = self.cold_path / f"{key}.json"
        if cold_path.exists():
            with open(cold_path, 'r') as f:
                data = json.load(f)
            
            # Promote to warm on access
            if promote:
                shutil.move(str(cold_path), str(self.warm_path / f"{key}.json"))
                if key in self.index["records"]:
                    self.index["records"][key]["tier"] = "warm"
                    self._save_index()
            
            return {
                "found": True,
                "key": key,
                "content": data["content"],
                "tier": "cold",
                "access_count": data.get("access_count", 1)
            }
        
        return {"found": False, "key": key, "error": "Key not found"}
    
    def _promote_to_hot(self, key: str, data: Dict):
        """Promote item to hot memory"""
        record = MemoryRecord(
            key=key,
            content=data["content"],
            tier=MemoryTier.HOT,
            created_at=data.get("created_at", datetime.now().isoformat()),
            accessed_at=datetime.now().isoformat(),
            access_count=data.get("access_count", 1),
            size_bytes=self._get_size(data["content"]),
            content_hash=self._compute_hash(data["content"]),
            tags=data.get("tags", []),
            metadata=data.get("metadata", {})
        )
        self._store_hot(record)
        
        # Update index
        if key in self.index["records"]:
            self.index["records"][key]["tier"] = "hot"
            self._save_index()
    
    def search_by_tag(self, tag: str) -> List[str]:
        """Find all keys with a specific tag"""
        return self.index["tags"].get(tag, [])
    
    def search_by_prefix(self, prefix: str) -> List[str]:
        """Find all keys starting with prefix"""
        return [k for k in self.index["records"].keys() if k.startswith(prefix)]
    
    def delete(self, key: str) -> Dict:
        """Delete a memory record"""
        deleted = False
        
        # Remove from hot
        if key in self.hot_memory:
            del self.hot_memory[key]
            deleted = True
        
        # Remove from warm
        warm_path = self.warm_path / f"{key}.json"
        if warm_path.exists():
            warm_path.unlink()
            deleted = True
        
        # Remove from cold
        cold_path = self.cold_path / f"{key}.json"
        if cold_path.exists():
            cold_path.unlink()
            deleted = True
        
        # Update index
        if key in self.index["records"]:
            # Remove from tag index
            for tag in self.index["records"][key].get("tags", []):
                if tag in self.index["tags"] and key in self.index["tags"][tag]:
                    self.index["tags"][tag].remove(key)
            
            del self.index["records"][key]
            self._save_index()
        
        return {"deleted": deleted, "key": key}
    
    def archive_old_warm(self, days: int = None) -> Dict:
        """Move old warm items to cold storage"""
        days = days or self.WARM_TO_COLD_DAYS
        threshold = datetime.now() - timedelta(days=days)
        archived = []
        
        for filepath in self.warm_path.glob("*.json"):
            mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
            if mtime < threshold:
                # Move to cold
                dest = self.cold_path / filepath.name
                shutil.move(str(filepath), str(dest))
                archived.append(filepath.stem)
                
                # Update index
                if filepath.stem in self.index["records"]:
                    self.index["records"][filepath.stem]["tier"] = "cold"
        
        if archived:
            self._save_index()
        
        return {"archived": archived, "count": len(archived)}
    
    def get_stats(self) -> MemoryStats:
        """Get memory usage statistics"""
        hot_size = sum(r.size_bytes for r in self.hot_memory.values())
        
        warm_size = sum(
            f.stat().st_size for f in self.warm_path.glob("*.json")
        )
        warm_count = len(list(self.warm_path.glob("*.json")))
        
        cold_size = sum(
            f.stat().st_size for f in self.cold_path.glob("*.json")
        )
        cold_count = len(list(self.cold_path.glob("*.json")))
        
        return MemoryStats(
            hot_count=len(self.hot_memory),
            warm_count=warm_count,
            cold_count=cold_count,
            hot_size_bytes=hot_size,
            warm_size_bytes=warm_size,
            cold_size_bytes=cold_size,
            total_records=len(self.hot_memory) + warm_count + cold_count,
            total_size_bytes=hot_size + warm_size + cold_size
        )
    
    def clear_tier(self, tier: MemoryTier) -> Dict:
        """Clear all items in a tier"""
        count = 0
        
        if tier == MemoryTier.HOT:
            count = len(self.hot_memory)
            self.hot_memory.clear()
        elif tier == MemoryTier.WARM:
            for f in self.warm_path.glob("*.json"):
                f.unlink()
                count += 1
        elif tier == MemoryTier.COLD:
            for f in self.cold_path.glob("*.json"):
                f.unlink()
                count += 1
        
        # Rebuild index
        self.index["records"] = {
            k: v for k, v in self.index["records"].items()
            if v.get("tier") != tier.value
        }
        self._save_index()
        
        return {"cleared": tier.value, "count": count}
    
    def export_all(self, output_path: str) -> Dict:
        """Export all memory to a single file"""
        output = Path(output_path)
        
        all_data = {
            "hot": {k: {
                "content": v.content,
                "created_at": v.created_at,
                "tags": v.tags
            } for k, v in self.hot_memory.items()},
            "warm": {},
            "cold": {},
            "index": self.index,
            "exported_at": datetime.now().isoformat()
        }
        
        for f in self.warm_path.glob("*.json"):
            with open(f, 'r') as fp:
                all_data["warm"][f.stem] = json.load(fp)
        
        for f in self.cold_path.glob("*.json"):
            with open(f, 'r') as fp:
                all_data["cold"][f.stem] = json.load(fp)
        
        with open(output, 'w') as f:
            json.dump(all_data, f, indent=2, default=str)
        
        return {
            "exported": True,
            "path": str(output),
            "total_records": len(all_data["hot"]) + len(all_data["warm"]) + len(all_data["cold"])
        }


# Singleton
_manager: Optional[HierarchicalMemoryManager] = None

def get_manager() -> HierarchicalMemoryManager:
    global _manager
    if _manager is None:
        _manager = HierarchicalMemoryManager()
    return _manager


def store(key: str, content: Any, **kwargs) -> Dict:
    return get_manager().store(key, content, **kwargs)

def retrieve(key: str) -> Dict:
    return get_manager().retrieve(key)

def stats() -> MemoryStats:
    return get_manager().get_stats()


if __name__ == "__main__":
    mm = HierarchicalMemoryManager()
    
    # Demo usage
    print("=== Hierarchical Memory Manager Demo ===\n")
    
    # Store some items
    mm.store("session_30_context", {"focus": "Tool inventory", "progress": 75}, tags=["session", "context"])
    mm.store("material_Ti6Al4V", {"kc1_1": 1800, "mc": 0.25}, tags=["material", "titanium"])
    mm.store("pattern_001", {"type": "success", "approach": "swarm_parallel"}, tags=["pattern", "swarm"])
    
    print("Stored 3 items")
    
    # Retrieve
    result = mm.retrieve("material_Ti6Al4V")
    print(f"\nRetrieved: {result['key']} from {result['tier']}")
    
    # Stats
    stats = mm.get_stats()
    print(f"\nStats: Hot={stats.hot_count}, Warm={stats.warm_count}, Cold={stats.cold_count}")
    print(f"Total size: {stats.total_size_bytes} bytes")
    
    # Search by tag
    materials = mm.search_by_tag("material")
    print(f"\nMaterials by tag: {materials}")
