#!/usr/bin/env python3
"""
PRISM Cache Monitor v1.0
Tracks KV-cache hit rates and stability metrics across sessions.

Usage:
    py -3 cache_monitor.py --status           # Show current cache metrics
    py -3 cache_monitor.py --log <event>      # Log cache event
    py -3 cache_monitor.py --report           # Generate cache report
    py -3 cache_monitor.py --reset            # Reset metrics
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
import argparse

# Paths
PRISM_ROOT = Path("C:/PRISM")
CACHE_LOG_PATH = PRISM_ROOT / "state" / "CACHE_METRICS.json"
CACHE_HISTORY_PATH = PRISM_ROOT / "state" / "CACHE_HISTORY.jsonl"

@dataclass
class CacheEvent:
    """Single cache event record."""
    timestamp: str
    event_type: str  # hit, miss, invalidate, validate
    source: str      # file or component that triggered
    prefix_hash: str
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CacheMetrics:
    """Aggregated cache metrics."""
    total_sessions: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    invalidations: int = 0
    stability_streak: int = 0
    max_streak: int = 0
    last_prefix_hash: str = ""
    last_updated: str = ""
    hit_rate: float = 0.0
    
    def update_hit_rate(self):
        total = self.cache_hits + self.cache_misses
        self.hit_rate = (self.cache_hits / total * 100) if total > 0 else 0.0

class CacheMonitor:
    """Monitor and track KV-cache performance."""
    
    def __init__(self):
        self.metrics = self._load_metrics()
        self._ensure_paths()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        CACHE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_metrics(self) -> CacheMetrics:
        """Load metrics from disk."""
        if CACHE_LOG_PATH.exists():
            try:
                data = json.loads(CACHE_LOG_PATH.read_text(encoding='utf-8'))
                return CacheMetrics(**data)
            except Exception as e:
                print(f"Warning: Could not load metrics: {e}")
        return CacheMetrics()
    
    def _save_metrics(self):
        """Save metrics to disk."""
        self.metrics.last_updated = datetime.now().isoformat()
        self.metrics.update_hit_rate()
        CACHE_LOG_PATH.write_text(
            json.dumps(asdict(self.metrics), indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _append_history(self, event: CacheEvent):
        """Append event to history log."""
        with open(CACHE_HISTORY_PATH, 'a', encoding='utf-8') as f:
            f.write(json.dumps(asdict(event), sort_keys=True) + '\n')
    
    def compute_prefix_hash(self, content: str, lines: int = 50) -> str:
        """Compute hash of prefix (first N lines)."""
        prefix_lines = content.split('\n')[:lines]
        prefix = '\n'.join(prefix_lines)
        return hashlib.sha256(prefix.encode('utf-8')).hexdigest()[:16]
    
    def log_session_start(self, prompt_content: str, source: str = "unknown") -> Dict:
        """Log session start and check cache status."""
        current_hash = self.compute_prefix_hash(prompt_content)
        self.metrics.total_sessions += 1
        
        # Determine if cache hit or miss
        if self.metrics.last_prefix_hash == current_hash:
            event_type = "hit"
            self.metrics.cache_hits += 1
            self.metrics.stability_streak += 1
            if self.metrics.stability_streak > self.metrics.max_streak:
                self.metrics.max_streak = self.metrics.stability_streak
        else:
            event_type = "miss"
            self.metrics.cache_misses += 1
            self.metrics.stability_streak = 0
        
        self.metrics.last_prefix_hash = current_hash
        
        # Create and log event
        event = CacheEvent(
            timestamp=datetime.now().isoformat(),
            event_type=event_type,
            source=source,
            prefix_hash=current_hash,
            details={
                "session_number": self.metrics.total_sessions,
                "streak": self.metrics.stability_streak
            }
        )
        self._append_history(event)
        self._save_metrics()
        
        return {
            "event": event_type,
            "hash": current_hash,
            "streak": self.metrics.stability_streak,
            "hit_rate": self.metrics.hit_rate
        }
    
    def log_invalidation(self, reason: str, source: str = "unknown"):
        """Log cache invalidation event."""
        self.metrics.invalidations += 1
        self.metrics.stability_streak = 0
        
        event = CacheEvent(
            timestamp=datetime.now().isoformat(),
            event_type="invalidate",
            source=source,
            prefix_hash=self.metrics.last_prefix_hash,
            details={"reason": reason}
        )
        self._append_history(event)
        self._save_metrics()
    
    def log_validation(self, file_path: str, is_valid: bool, issues: List[str] = None):
        """Log prefix validation result."""
        event = CacheEvent(
            timestamp=datetime.now().isoformat(),
            event_type="validate",
            source=file_path,
            prefix_hash="",
            details={
                "valid": is_valid,
                "issues": issues or []
            }
        )
        self._append_history(event)
    
    def get_status(self) -> Dict:
        """Get current cache status."""
        self.metrics.update_hit_rate()
        return {
            "total_sessions": self.metrics.total_sessions,
            "cache_hits": self.metrics.cache_hits,
            "cache_misses": self.metrics.cache_misses,
            "invalidations": self.metrics.invalidations,
            "hit_rate": f"{self.metrics.hit_rate:.1f}%",
            "current_streak": self.metrics.stability_streak,
            "max_streak": self.metrics.max_streak,
            "last_hash": self.metrics.last_prefix_hash[:8] + "..." if self.metrics.last_prefix_hash else "none",
            "last_updated": self.metrics.last_updated,
            "target_hit_rate": "≥80%",
            "status": "✅ GOOD" if self.metrics.hit_rate >= 80 else "⚠️ BELOW TARGET"
        }
    
    def get_history(self, limit: int = 20) -> List[Dict]:
        """Get recent cache history."""
        if not CACHE_HISTORY_PATH.exists():
            return []
        
        events = []
        with open(CACHE_HISTORY_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    events.append(json.loads(line))
        
        return events[-limit:]
    
    def generate_report(self) -> str:
        """Generate detailed cache report."""
        status = self.get_status()
        history = self.get_history(10)
        
        report = []
        report.append("=" * 60)
        report.append("PRISM KV-CACHE PERFORMANCE REPORT")
        report.append("=" * 60)
        report.append("")
        report.append("CURRENT METRICS")
        report.append("-" * 40)
        for key, value in status.items():
            report.append(f"  {key:20} : {value}")
        report.append("")
        report.append("RECENT HISTORY")
        report.append("-" * 40)
        for event in history:
            ts = event.get('timestamp', '')[:19]
            et = event.get('event_type', 'unknown')
            src = event.get('source', 'unknown')[:20]
            report.append(f"  {ts} | {et:10} | {src}")
        report.append("")
        report.append("RECOMMENDATIONS")
        report.append("-" * 40)
        if status['hit_rate'].replace('%', '') and float(status['hit_rate'].replace('%', '')) < 80:
            report.append("  ⚠️ Hit rate below 80% target")
            report.append("  → Run: py -3 cache_checker.py --audit <prompt_file>")
            report.append("  → Check for dynamic content in prefix")
        else:
            report.append("  ✅ Cache performance is optimal")
        report.append("")
        report.append("=" * 60)
        
        return '\n'.join(report)
    
    def reset(self):
        """Reset all metrics."""
        self.metrics = CacheMetrics()
        self._save_metrics()
        if CACHE_HISTORY_PATH.exists():
            CACHE_HISTORY_PATH.unlink()
        return {"status": "reset", "message": "All cache metrics cleared"}


def main():
    parser = argparse.ArgumentParser(description="PRISM Cache Monitor")
    parser.add_argument('--status', action='store_true', help='Show current metrics')
    parser.add_argument('--log', type=str, help='Log event: hit, miss, invalidate')
    parser.add_argument('--report', action='store_true', help='Generate full report')
    parser.add_argument('--reset', action='store_true', help='Reset all metrics')
    parser.add_argument('--history', type=int, nargs='?', const=20, help='Show recent history')
    
    args = parser.parse_args()
    monitor = CacheMonitor()
    
    if args.status:
        status = monitor.get_status()
        print("\nCache Status:")
        for key, value in status.items():
            print(f"  {key:20}: {value}")
    
    elif args.report:
        print(monitor.generate_report())
    
    elif args.reset:
        result = monitor.reset()
        print(f"✅ {result['message']}")
    
    elif args.history:
        history = monitor.get_history(args.history)
        print(f"\nLast {len(history)} cache events:")
        for event in history:
            ts = event.get('timestamp', '')[:19]
            et = event.get('event_type', 'unknown')
            print(f"  {ts} | {et}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
