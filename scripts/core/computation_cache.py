#!/usr/bin/env python3
"""
PRISM Computation Cache - CORE.7
Instant repeat calculations via persistent caching.

Features:
- Cache computed results by function + arguments hash
- Automatic cache invalidation when source data changes
- TTL-based expiration for time-sensitive calculations
- Cache statistics and management

Usage:
    # As decorator
    @cached("kienzle")
    def compute_kienzle(material_id, h, b):
        ...
    
    # Manual caching
    cache = ComputationCache()
    cache.get_or_compute("kienzle", {"material": "1045", "h": 0.25}, compute_fn)
    
    # CLI
    python computation_cache.py --stats
    python computation_cache.py --clear kienzle
    python computation_cache.py --test

Author: Claude (PRISM Developer)
Created: 2026-02-01
"""

import os
import json
import hashlib
import pickle
import sqlite3
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar, Generic
from datetime import datetime, timedelta
from functools import wraps
import argparse
import threading


# Type variable for cached values
T = TypeVar('T')


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class CacheEntry:
    """A cached computation result."""
    key: str
    namespace: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime] = None
    hit_count: int = 0
    computation_time_ms: float = 0
    
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at


@dataclass
class CacheStats:
    """Cache statistics."""
    total_entries: int = 0
    total_hits: int = 0
    total_misses: int = 0
    total_evictions: int = 0
    hit_rate: float = 0.0
    total_compute_time_saved_ms: float = 0
    namespace_stats: Dict[str, Dict] = field(default_factory=dict)


# =============================================================================
# COMPUTATION CACHE
# =============================================================================

class ComputationCache:
    """
    Persistent cache for computed results.
    
    Uses SQLite for persistence and supports:
    - Namespace-based organization
    - TTL expiration
    - Automatic invalidation
    - Thread-safe access
    """
    
    def __init__(self, db_path: str = None, max_size_mb: int = 100):
        """
        Initialize computation cache.
        
        Args:
            db_path: Path to cache database
            max_size_mb: Maximum cache size in MB
        """
        if db_path is None:
            db_path = r"C:\PRISM\cache\computation_cache.db"
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.max_size_mb = max_size_mb
        
        self._lock = threading.Lock()
        self._init_db()
        
        # In-memory stats
        self._hits = 0
        self._misses = 0
    
    def _init_db(self):
        """Initialize cache database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                namespace TEXT NOT NULL,
                value BLOB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                hit_count INTEGER DEFAULT 0,
                computation_time_ms REAL DEFAULT 0,
                size_bytes INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invalidation_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                namespace TEXT NOT NULL,
                trigger_pattern TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_cache_namespace ON cache(namespace)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)
        ''')
        
        conn.commit()
        conn.close()
    
    def _make_key(self, namespace: str, params: Dict) -> str:
        """Generate cache key from namespace and parameters."""
        # Sort params for consistent hashing
        sorted_params = json.dumps(params, sort_keys=True, default=str)
        key_string = f"{namespace}:{sorted_params}"
        return hashlib.sha256(key_string.encode()).hexdigest()
    
    def get(self, namespace: str, params: Dict) -> Optional[Any]:
        """
        Get cached value.
        
        Args:
            namespace: Cache namespace (e.g., "kienzle", "taylor")
            params: Parameters that identify the computation
            
        Returns:
            Cached value or None if not found/expired
        """
        key = self._make_key(namespace, params)
        
        with self._lock:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT value, expires_at, hit_count, computation_time_ms
                FROM cache WHERE key = ?
            ''', (key,))
            
            row = cursor.fetchone()
            
            if row is None:
                self._misses += 1
                conn.close()
                return None
            
            value_blob, expires_at_str, hit_count, comp_time = row
            
            # Check expiration
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now() > expires_at:
                    # Expired - delete and return None
                    cursor.execute('DELETE FROM cache WHERE key = ?', (key,))
                    conn.commit()
                    conn.close()
                    self._misses += 1
                    return None
            
            # Update hit count
            cursor.execute('''
                UPDATE cache SET hit_count = hit_count + 1 WHERE key = ?
            ''', (key,))
            conn.commit()
            conn.close()
            
            self._hits += 1
            
            try:
                return pickle.loads(value_blob)
            except:
                return None
    
    def set(self, namespace: str, params: Dict, value: Any, 
            ttl_seconds: int = None, computation_time_ms: float = 0):
        """
        Store value in cache.
        
        Args:
            namespace: Cache namespace
            params: Parameters that identify the computation
            value: Value to cache
            ttl_seconds: Time-to-live in seconds (None = never expires)
            computation_time_ms: How long the computation took
        """
        key = self._make_key(namespace, params)
        
        expires_at = None
        if ttl_seconds:
            expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
        
        value_blob = pickle.dumps(value)
        size_bytes = len(value_blob)
        
        with self._lock:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO cache 
                (key, namespace, value, expires_at, computation_time_ms, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                key, namespace, value_blob,
                expires_at.isoformat() if expires_at else None,
                computation_time_ms, size_bytes
            ))
            
            conn.commit()
            conn.close()
        
        # Check size limit
        self._check_size_limit()
    
    def get_or_compute(self, namespace: str, params: Dict, 
                       compute_fn: Callable[[], T], ttl_seconds: int = None) -> T:
        """
        Get cached value or compute and cache it.
        
        Args:
            namespace: Cache namespace
            params: Parameters that identify the computation
            compute_fn: Function to call if not cached
            ttl_seconds: TTL for newly computed values
            
        Returns:
            Cached or computed value
        """
        # Try cache first
        cached = self.get(namespace, params)
        if cached is not None:
            return cached
        
        # Compute
        start = datetime.now()
        value = compute_fn()
        elapsed_ms = (datetime.now() - start).total_seconds() * 1000
        
        # Cache result
        self.set(namespace, params, value, ttl_seconds, elapsed_ms)
        
        return value
    
    def invalidate(self, namespace: str = None, pattern: str = None):
        """
        Invalidate cached entries.
        
        Args:
            namespace: Invalidate all entries in namespace
            pattern: Invalidate entries matching pattern
        """
        with self._lock:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            if namespace and pattern:
                cursor.execute('''
                    DELETE FROM cache WHERE namespace = ? AND key LIKE ?
                ''', (namespace, f"%{pattern}%"))
            elif namespace:
                cursor.execute('DELETE FROM cache WHERE namespace = ?', (namespace,))
            elif pattern:
                cursor.execute('DELETE FROM cache WHERE key LIKE ?', (f"%{pattern}%",))
            
            deleted = cursor.rowcount
            conn.commit()
            conn.close()
            
            return deleted
    
    def clear(self):
        """Clear entire cache."""
        with self._lock:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            cursor.execute('DELETE FROM cache')
            conn.commit()
            conn.close()
    
    def _check_size_limit(self):
        """Evict oldest entries if cache exceeds size limit."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Get current size
        cursor.execute('SELECT SUM(size_bytes) FROM cache')
        total_bytes = cursor.fetchone()[0] or 0
        total_mb = total_bytes / (1024 * 1024)
        
        if total_mb > self.max_size_mb:
            # Delete oldest entries until under limit
            target_bytes = int(self.max_size_mb * 0.8 * 1024 * 1024)
            
            cursor.execute('''
                DELETE FROM cache WHERE key IN (
                    SELECT key FROM cache 
                    ORDER BY created_at ASC 
                    LIMIT (SELECT COUNT(*) / 4 FROM cache)
                )
            ''')
            
            conn.commit()
        
        conn.close()
    
    def get_stats(self) -> CacheStats:
        """Get cache statistics."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Total entries
        cursor.execute('SELECT COUNT(*) FROM cache')
        total_entries = cursor.fetchone()[0]
        
        # Total hits from DB
        cursor.execute('SELECT SUM(hit_count) FROM cache')
        db_hits = cursor.fetchone()[0] or 0
        
        # Compute time saved
        cursor.execute('SELECT SUM(hit_count * computation_time_ms) FROM cache')
        time_saved = cursor.fetchone()[0] or 0
        
        # Per-namespace stats
        cursor.execute('''
            SELECT namespace, COUNT(*), SUM(hit_count), SUM(size_bytes)
            FROM cache GROUP BY namespace
        ''')
        
        namespace_stats = {}
        for row in cursor.fetchall():
            namespace_stats[row[0]] = {
                "entries": row[1],
                "total_hits": row[2] or 0,
                "size_bytes": row[3] or 0
            }
        
        conn.close()
        
        total_attempts = self._hits + self._misses
        hit_rate = self._hits / total_attempts if total_attempts > 0 else 0
        
        return CacheStats(
            total_entries=total_entries,
            total_hits=db_hits + self._hits,
            total_misses=self._misses,
            hit_rate=hit_rate,
            total_compute_time_saved_ms=time_saved,
            namespace_stats=namespace_stats
        )
    
    def add_invalidation_rule(self, namespace: str, trigger_pattern: str):
        """
        Add an invalidation rule.
        
        When data matching trigger_pattern changes, invalidate namespace.
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO invalidation_rules (namespace, trigger_pattern)
            VALUES (?, ?)
        ''', (namespace, trigger_pattern))
        
        conn.commit()
        conn.close()
    
    def trigger_invalidation(self, changed_data: str):
        """
        Trigger invalidation based on changed data.
        
        Args:
            changed_data: Description of what changed (matched against rules)
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('SELECT namespace, trigger_pattern FROM invalidation_rules')
        rules = cursor.fetchall()
        conn.close()
        
        for namespace, pattern in rules:
            if pattern in changed_data:
                self.invalidate(namespace=namespace)
                print(f"Invalidated cache namespace '{namespace}' due to: {changed_data}")


# =============================================================================
# DECORATOR
# =============================================================================

# Global cache instance
_global_cache: Optional[ComputationCache] = None


def get_cache() -> ComputationCache:
    """Get or create global cache instance."""
    global _global_cache
    if _global_cache is None:
        _global_cache = ComputationCache()
    return _global_cache


def cached(namespace: str, ttl_seconds: int = None):
    """
    Decorator to cache function results.
    
    Args:
        namespace: Cache namespace for this function
        ttl_seconds: TTL for cached results
        
    Usage:
        @cached("kienzle")
        def compute_kienzle(material_id: str, h: float, b: float) -> float:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = get_cache()
            
            # Build params dict from args and kwargs
            params = {
                "args": args,
                "kwargs": kwargs
            }
            
            return cache.get_or_compute(
                namespace, params,
                lambda: func(*args, **kwargs),
                ttl_seconds
            )
        
        return wrapper
    return decorator


# =============================================================================
# PRISM-SPECIFIC CACHED FUNCTIONS
# =============================================================================

@cached("kienzle")
def cached_kienzle(kc1_1: float, mc: float, h: float, b: float, 
                   rake_angle: float = 6.0) -> float:
    """
    Cached Kienzle cutting force calculation.
    
    Fc = kc1.1 × h^(1-mc) × b × correction
    """
    rake_correction = 1 - 0.01 * (rake_angle - 6)
    fc = kc1_1 * (h ** (1 - mc)) * b * rake_correction
    return fc


@cached("taylor")
def cached_taylor(C: float, n: float, V: float = None, T: float = None) -> float:
    """
    Cached Taylor tool life calculation.
    
    VT^n = C
    """
    if V is not None:
        # Solve for T
        T = (C / V) ** (1 / n)
        return T
    elif T is not None:
        # Solve for V
        V = C / (T ** n)
        return V
    else:
        raise ValueError("Must provide either V or T")


@cached("surface_finish")
def cached_surface_finish(feed: float, nose_radius: float) -> float:
    """
    Cached theoretical surface finish (Ra) calculation.
    
    Ra = f² / (32 × r) × 1000 (μm)
    """
    if nose_radius <= 0:
        return 0
    ra = (feed ** 2) / (32 * nose_radius) * 1000
    return ra


@cached("mrr_turning")
def cached_mrr_turning(Vc: float, f: float, ap: float) -> float:
    """
    Cached MRR for turning (cm³/min).
    
    MRR = Vc × f × ap × 1000
    """
    return Vc * f * ap * 1000


@cached("mrr_milling")
def cached_mrr_milling(ae: float, ap: float, Vc: float, fz: float, z: int) -> float:
    """
    Cached MRR for milling (cm³/min).
    
    MRR = ae × ap × Vf / 1000 where Vf = fz × z × n
    """
    # Approximate - would need diameter for exact calc
    mrr = ae * ap * Vc * fz * z / 1000
    return mrr


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Command-line interface for computation cache."""
    parser = argparse.ArgumentParser(
        description="PRISM Computation Cache - Instant repeat calculations"
    )
    
    parser.add_argument(
        "--stats", action="store_true",
        help="Show cache statistics"
    )
    
    parser.add_argument(
        "--clear", metavar="NAMESPACE", nargs="?", const="ALL",
        help="Clear cache (optionally for specific namespace)"
    )
    
    parser.add_argument(
        "--invalidate", metavar="PATTERN",
        help="Invalidate entries matching pattern"
    )
    
    parser.add_argument(
        "--benchmark", action="store_true",
        help="Run cache benchmark"
    )
    
    parser.add_argument(
        "--test", action="store_true",
        help="Run self-test"
    )
    
    args = parser.parse_args()
    
    cache = get_cache()
    
    if args.test:
        run_tests()
        return
    
    if args.stats:
        stats = cache.get_stats()
        print("\n=== Cache Statistics ===")
        print(f"Total entries: {stats.total_entries}")
        print(f"Total hits: {stats.total_hits}")
        print(f"Total misses: {stats.total_misses}")
        print(f"Hit rate: {stats.hit_rate:.1%}")
        print(f"Compute time saved: {stats.total_compute_time_saved_ms:.1f} ms")
        
        if stats.namespace_stats:
            print("\n--- By Namespace ---")
            for ns, ns_stats in stats.namespace_stats.items():
                size_kb = ns_stats['size_bytes'] / 1024
                print(f"  {ns}: {ns_stats['entries']} entries, "
                      f"{ns_stats['total_hits']} hits, {size_kb:.1f} KB")
        return
    
    if args.clear:
        if args.clear == "ALL":
            cache.clear()
            print("Cache cleared")
        else:
            deleted = cache.invalidate(namespace=args.clear)
            print(f"Cleared {deleted} entries from '{args.clear}'")
        return
    
    if args.invalidate:
        deleted = cache.invalidate(pattern=args.invalidate)
        print(f"Invalidated {deleted} entries matching '{args.invalidate}'")
        return
    
    if args.benchmark:
        run_benchmark()
        return
    
    parser.print_help()


def run_benchmark():
    """Run cache performance benchmark."""
    print("\n=== Cache Benchmark ===\n")
    
    import time
    
    cache = ComputationCache()
    cache.clear()
    
    # Test parameters
    iterations = 1000
    
    # Benchmark uncached
    print("1. Uncached computation (1000 iterations)...")
    start = time.time()
    for i in range(iterations):
        _ = 1823 * (0.25 ** (1 - 0.26)) * 2.5 * 0.94
    uncached_time = time.time() - start
    print(f"   Time: {uncached_time*1000:.2f} ms")
    
    # Benchmark cached (cold)
    print("\n2. Cached computation - cold cache...")
    start = time.time()
    for i in range(iterations):
        params = {"kc": 1823, "mc": 0.26, "h": 0.25, "b": 2.5}
        cache.get_or_compute("benchmark", params, 
                            lambda: 1823 * (0.25 ** (1 - 0.26)) * 2.5 * 0.94)
    cold_time = time.time() - start
    print(f"   Time: {cold_time*1000:.2f} ms")
    
    # Benchmark cached (warm)
    print("\n3. Cached computation - warm cache...")
    start = time.time()
    for i in range(iterations):
        params = {"kc": 1823, "mc": 0.26, "h": 0.25, "b": 2.5}
        cache.get_or_compute("benchmark", params,
                            lambda: 1823 * (0.25 ** (1 - 0.26)) * 2.5 * 0.94)
    warm_time = time.time() - start
    print(f"   Time: {warm_time*1000:.2f} ms")
    
    # Summary
    print("\n=== Summary ===")
    print(f"Uncached: {uncached_time*1000:.2f} ms")
    print(f"Cached (cold): {cold_time*1000:.2f} ms")
    print(f"Cached (warm): {warm_time*1000:.2f} ms")
    
    if warm_time > 0:
        speedup = cold_time / warm_time
        print(f"Cache speedup: {speedup:.1f}x")
    
    stats = cache.get_stats()
    print(f"Hit rate: {stats.hit_rate:.1%}")


def run_tests():
    """Run self-tests."""
    print("=" * 60)
    print("PRISM Computation Cache - Self Test")
    print("=" * 60)
    
    import tempfile
    
    # Create temp cache
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test_cache.db"
        cache = ComputationCache(str(db_path))
        
        print("\n1. Testing basic set/get...")
        cache.set("test", {"a": 1, "b": 2}, {"result": 42})
        value = cache.get("test", {"a": 1, "b": 2})
        assert value == {"result": 42}, f"Expected {{'result': 42}}, got {value}"
        print("   ✓ Basic set/get working")
        
        print("\n2. Testing cache miss...")
        value = cache.get("test", {"a": 999, "b": 888})
        assert value is None, "Expected None for cache miss"
        print("   ✓ Cache miss returns None")
        
        print("\n3. Testing TTL expiration...")
        cache.set("ttl_test", {"x": 1}, "temp_value", ttl_seconds=1)
        value = cache.get("ttl_test", {"x": 1})
        assert value == "temp_value", "Value should exist before expiry"
        
        import time
        time.sleep(1.1)
        
        value = cache.get("ttl_test", {"x": 1})
        assert value is None, "Value should be expired"
        print("   ✓ TTL expiration working")
        
        print("\n4. Testing get_or_compute...")
        compute_count = [0]
        
        def expensive_compute():
            compute_count[0] += 1
            return "computed"
        
        # First call - should compute
        result = cache.get_or_compute("compute", {"id": 1}, expensive_compute)
        assert result == "computed"
        assert compute_count[0] == 1
        
        # Second call - should use cache
        result = cache.get_or_compute("compute", {"id": 1}, expensive_compute)
        assert result == "computed"
        assert compute_count[0] == 1, "Should not recompute"
        print("   ✓ get_or_compute working")
        
        print("\n5. Testing invalidation...")
        cache.set("inv_test", {"a": 1}, "value1")
        cache.set("inv_test", {"a": 2}, "value2")
        cache.set("other", {"a": 1}, "other_value")
        
        cache.invalidate(namespace="inv_test")
        
        assert cache.get("inv_test", {"a": 1}) is None
        assert cache.get("inv_test", {"a": 2}) is None
        assert cache.get("other", {"a": 1}) == "other_value"
        print("   ✓ Namespace invalidation working")
        
        print("\n6. Testing statistics...")
        cache.clear()
        cache.set("stats", {"x": 1}, "v1")
        cache.get("stats", {"x": 1})
        cache.get("stats", {"x": 1})
        cache.get("stats", {"x": 2})  # Miss
        
        stats = cache.get_stats()
        assert stats.total_entries >= 1
        print(f"   Entries: {stats.total_entries}")
        print(f"   Hit rate: {stats.hit_rate:.1%}")
        print("   ✓ Statistics working")
        
        print("\n7. Testing decorator...")
        
        @cached("decorator_test")
        def add(a, b):
            return a + b
        
        # Reset global cache to use test cache
        global _global_cache
        _global_cache = cache
        
        result1 = add(1, 2)
        result2 = add(1, 2)  # Should be cached
        assert result1 == 3
        assert result2 == 3
        print("   ✓ Decorator working")
        
        print("\n8. Testing PRISM functions...")
        fc = cached_kienzle(1823, 0.26, 0.25, 2.5)
        assert 2000 < fc < 3000, f"Unexpected Fc: {fc}"
        
        tool_life = cached_taylor(300, 0.25, V=100)
        assert 5 < tool_life < 100, f"Unexpected tool life: {tool_life}"
        
        ra = cached_surface_finish(0.2, 0.8)
        assert 1 < ra < 5, f"Unexpected Ra: {ra}"
        print("   ✓ PRISM cached functions working")
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED ✓")
        print("=" * 60)


if __name__ == "__main__":
    main()
