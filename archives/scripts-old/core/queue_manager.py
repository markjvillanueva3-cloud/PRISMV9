#!/usr/bin/env python3
"""
PRISM Queue Manager v1.0
Session 1.6 Deliverable: Manage operation queues for batch processing.

Features:
- Priority queue management
- Operation deduplication
- Rate limiting
- Queue persistence
- Status monitoring
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
import time
import hashlib
import threading
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict, field
from enum import Enum
from collections import deque
import heapq

# Paths
PRISM_ROOT = Path("C:/PRISM")
QUEUE_STATE = PRISM_ROOT / "state" / "QUEUE_STATE.json"
QUEUE_LOG = PRISM_ROOT / "state" / "QUEUE_LOG.jsonl"

class QueuePriority(Enum):
    """Priority levels for queue items."""
    CRITICAL = 0    # Immediate processing
    HIGH = 1        # Process soon
    NORMAL = 2      # Standard priority
    LOW = 3         # Process when idle
    BACKGROUND = 4  # Process last

class QueueItemStatus(Enum):
    """Status of a queue item."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    DEFERRED = "deferred"

@dataclass
class QueueItem:
    """Item in the processing queue."""
    item_id: str
    operation: str
    params: Dict[str, Any]
    priority: QueuePriority
    
    # Tracking
    status: QueueItemStatus = QueueItemStatus.QUEUED
    queued_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: str = None
    completed_at: str = None
    
    # Results
    result: Any = None
    error: str = None
    attempts: int = 0
    max_attempts: int = 3
    
    # Metadata
    tags: List[str] = field(default_factory=list)
    depends_on: List[str] = field(default_factory=list)
    
    def __lt__(self, other):
        """For priority queue ordering."""
        return self.priority.value < other.priority.value
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['priority'] = self.priority.value
        d['status'] = self.status.value
        return d
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'QueueItem':
        return cls(
            item_id=data['item_id'],
            operation=data['operation'],
            params=data.get('params', {}),
            priority=QueuePriority(data.get('priority', 2)),
            status=QueueItemStatus(data.get('status', 'queued')),
            queued_at=data.get('queued_at', datetime.now().isoformat()),
            started_at=data.get('started_at'),
            completed_at=data.get('completed_at'),
            result=data.get('result'),
            error=data.get('error'),
            attempts=data.get('attempts', 0),
            max_attempts=data.get('max_attempts', 3),
            tags=data.get('tags', []),
            depends_on=data.get('depends_on', [])
        )

@dataclass
class QueueStats:
    """Queue statistics."""
    total_queued: int = 0
    total_processing: int = 0
    total_completed: int = 0
    total_failed: int = 0
    by_priority: Dict[str, int] = field(default_factory=dict)
    avg_wait_time_ms: float = 0
    avg_process_time_ms: float = 0
    throughput_per_minute: float = 0
    
    def to_dict(self) -> Dict:
        return asdict(self)

class QueueManager:
    """Manage operation queues for batch processing."""
    
    # Configuration
    MAX_QUEUE_SIZE = 1000
    RATE_LIMIT_PER_MINUTE = 100
    DEDUP_WINDOW_SECONDS = 60
    
    def __init__(self, persist: bool = True):
        self._ensure_paths()
        self.persist = persist
        
        # Priority queue (min-heap by priority)
        self._queue: List[QueueItem] = []
        
        # Processing tracking
        self._processing: Dict[str, QueueItem] = {}
        self._completed: deque = deque(maxlen=100)  # Keep last 100
        self._failed: deque = deque(maxlen=100)
        
        # Deduplication
        self._recent_hashes: Dict[str, float] = {}  # hash -> timestamp
        
        # Rate limiting
        self._request_times: deque = deque(maxlen=self.RATE_LIMIT_PER_MINUTE)
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Load persisted state
        if persist:
            self._load_state()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        QUEUE_STATE.parent.mkdir(parents=True, exist_ok=True)
    
    def _generate_item_id(self) -> str:
        """Generate unique item ID."""
        timestamp = datetime.now().strftime("%H%M%S%f")
        return f"Q-{timestamp}"
    
    def _generate_hash(self, operation: str, params: Dict) -> str:
        """Generate hash for deduplication."""
        content = f"{operation}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _is_duplicate(self, hash_value: str) -> bool:
        """Check if operation is duplicate within window."""
        now = time.time()
        
        # Clean old hashes
        old_hashes = [h for h, t in self._recent_hashes.items() 
                      if now - t > self.DEDUP_WINDOW_SECONDS]
        for h in old_hashes:
            del self._recent_hashes[h]
        
        if hash_value in self._recent_hashes:
            return True
        
        self._recent_hashes[hash_value] = now
        return False
    
    def _check_rate_limit(self) -> bool:
        """Check if within rate limit."""
        now = time.time()
        
        # Remove old timestamps
        while self._request_times and now - self._request_times[0] > 60:
            self._request_times.popleft()
        
        return len(self._request_times) < self.RATE_LIMIT_PER_MINUTE
    
    def _record_request(self):
        """Record a request for rate limiting."""
        self._request_times.append(time.time())
    
    def enqueue(self, operation: str, params: Dict = None,
                priority: QueuePriority = QueuePriority.NORMAL,
                tags: List[str] = None,
                depends_on: List[str] = None,
                deduplicate: bool = True) -> Optional[str]:
        """
        Add item to queue.
        
        Args:
            operation: Operation name
            params: Operation parameters
            priority: Priority level
            tags: Optional tags for filtering
            depends_on: Item IDs this depends on
            deduplicate: Skip if duplicate within window
            
        Returns:
            Item ID if queued, None if duplicate/rejected
        """
        with self._lock:
            # Check queue size
            if len(self._queue) >= self.MAX_QUEUE_SIZE:
                return None
            
            # Check deduplication
            if deduplicate:
                hash_value = self._generate_hash(operation, params or {})
                if self._is_duplicate(hash_value):
                    return None
            
            # Create item
            item = QueueItem(
                item_id=self._generate_item_id(),
                operation=operation,
                params=params or {},
                priority=priority,
                tags=tags or [],
                depends_on=depends_on or []
            )
            
            # Add to priority queue
            heapq.heappush(self._queue, item)
            
            # Persist
            if self.persist:
                self._save_state()
            
            return item.item_id
    
    def enqueue_batch(self, items: List[Dict],
                      priority: QueuePriority = QueuePriority.NORMAL) -> List[str]:
        """
        Add multiple items to queue.
        
        Args:
            items: List of dicts with 'operation' and 'params'
            priority: Priority for all items
            
        Returns:
            List of item IDs
        """
        item_ids = []
        for item in items:
            item_id = self.enqueue(
                operation=item['operation'],
                params=item.get('params', {}),
                priority=priority,
                tags=item.get('tags'),
                depends_on=item.get('depends_on')
            )
            if item_id:
                item_ids.append(item_id)
        
        return item_ids
    
    def dequeue(self, count: int = 1) -> List[QueueItem]:
        """
        Get items from queue for processing.
        
        Args:
            count: Number of items to dequeue
            
        Returns:
            List of QueueItems
        """
        with self._lock:
            items = []
            
            for _ in range(count):
                if not self._queue:
                    break
                
                # Check rate limit
                if not self._check_rate_limit():
                    break
                
                item = heapq.heappop(self._queue)
                
                # Check dependencies
                if item.depends_on:
                    unmet = [d for d in item.depends_on 
                             if d not in [c.item_id for c in self._completed]]
                    if unmet:
                        # Re-queue with deferred status
                        item.status = QueueItemStatus.DEFERRED
                        heapq.heappush(self._queue, item)
                        continue
                
                # Mark as processing
                item.status = QueueItemStatus.PROCESSING
                item.started_at = datetime.now().isoformat()
                item.attempts += 1
                
                self._processing[item.item_id] = item
                self._record_request()
                items.append(item)
            
            if self.persist:
                self._save_state()
            
            return items
    
    def complete(self, item_id: str, result: Any = None):
        """Mark item as completed."""
        with self._lock:
            if item_id in self._processing:
                item = self._processing.pop(item_id)
                item.status = QueueItemStatus.COMPLETED
                item.completed_at = datetime.now().isoformat()
                item.result = result
                self._completed.append(item)
                
                if self.persist:
                    self._save_state()
                
                self._log_completion(item)
    
    def fail(self, item_id: str, error: str, retry: bool = True):
        """Mark item as failed."""
        with self._lock:
            if item_id in self._processing:
                item = self._processing.pop(item_id)
                item.error = error
                
                # Retry if under max attempts
                if retry and item.attempts < item.max_attempts:
                    item.status = QueueItemStatus.QUEUED
                    heapq.heappush(self._queue, item)
                else:
                    item.status = QueueItemStatus.FAILED
                    item.completed_at = datetime.now().isoformat()
                    self._failed.append(item)
                
                if self.persist:
                    self._save_state()
                
                self._log_failure(item)
    
    def cancel(self, item_id: str) -> bool:
        """Cancel a queued item."""
        with self._lock:
            # Search in queue
            for i, item in enumerate(self._queue):
                if item.item_id == item_id:
                    item.status = QueueItemStatus.CANCELLED
                    self._queue.pop(i)
                    heapq.heapify(self._queue)
                    
                    if self.persist:
                        self._save_state()
                    return True
            
            return False
    
    def get_status(self, item_id: str) -> Optional[Dict]:
        """Get status of an item."""
        with self._lock:
            # Check processing
            if item_id in self._processing:
                return self._processing[item_id].to_dict()
            
            # Check queue
            for item in self._queue:
                if item.item_id == item_id:
                    return item.to_dict()
            
            # Check completed
            for item in self._completed:
                if item.item_id == item_id:
                    return item.to_dict()
            
            # Check failed
            for item in self._failed:
                if item.item_id == item_id:
                    return item.to_dict()
            
            return None
    
    def get_queue_status(self) -> QueueStats:
        """Get overall queue statistics."""
        with self._lock:
            by_priority = {}
            for item in self._queue:
                p = item.priority.name
                by_priority[p] = by_priority.get(p, 0) + 1
            
            # Calculate timing stats
            wait_times = []
            process_times = []
            
            for item in self._completed:
                if item.started_at and item.queued_at:
                    try:
                        queued = datetime.fromisoformat(item.queued_at)
                        started = datetime.fromisoformat(item.started_at)
                        wait_times.append((started - queued).total_seconds() * 1000)
                    except:
                        pass
                
                if item.completed_at and item.started_at:
                    try:
                        started = datetime.fromisoformat(item.started_at)
                        completed = datetime.fromisoformat(item.completed_at)
                        process_times.append((completed - started).total_seconds() * 1000)
                    except:
                        pass
            
            return QueueStats(
                total_queued=len(self._queue),
                total_processing=len(self._processing),
                total_completed=len(self._completed),
                total_failed=len(self._failed),
                by_priority=by_priority,
                avg_wait_time_ms=round(sum(wait_times) / max(len(wait_times), 1), 2),
                avg_process_time_ms=round(sum(process_times) / max(len(process_times), 1), 2),
                throughput_per_minute=len(self._request_times)
            )
    
    def peek(self, count: int = 5) -> List[Dict]:
        """Peek at next items without dequeuing."""
        with self._lock:
            items = sorted(self._queue)[:count]
            return [item.to_dict() for item in items]
    
    def clear(self):
        """Clear the queue."""
        with self._lock:
            self._queue = []
            self._processing = {}
            
            if self.persist:
                self._save_state()
    
    def _save_state(self):
        """Save queue state to disk."""
        state = {
            "version": "1.0",
            "saved_at": datetime.now().isoformat(),
            "queue": [item.to_dict() for item in self._queue],
            "processing": {k: v.to_dict() for k, v in self._processing.items()}
        }
        QUEUE_STATE.write_text(
            json.dumps(state, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _load_state(self):
        """Load queue state from disk."""
        if not QUEUE_STATE.exists():
            return
        
        try:
            state = json.loads(QUEUE_STATE.read_text(encoding='utf-8'))
            
            # Restore queue
            for item_data in state.get('queue', []):
                item = QueueItem.from_dict(item_data)
                heapq.heappush(self._queue, item)
            
            # Restore processing (re-queue)
            for item_data in state.get('processing', {}).values():
                item = QueueItem.from_dict(item_data)
                item.status = QueueItemStatus.QUEUED
                heapq.heappush(self._queue, item)
        except:
            pass
    
    def _log_completion(self, item: QueueItem):
        """Log completion."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "item_id": item.item_id,
            "operation": item.operation,
            "status": "completed",
            "attempts": item.attempts
        }
        with open(QUEUE_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def _log_failure(self, item: QueueItem):
        """Log failure."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "item_id": item.item_id,
            "operation": item.operation,
            "status": "failed",
            "error": item.error,
            "attempts": item.attempts
        }
        with open(QUEUE_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Queue Manager")
    parser.add_argument('--status', action='store_true', help='Show queue status')
    parser.add_argument('--peek', type=int, default=5, help='Peek at queue')
    parser.add_argument('--clear', action='store_true', help='Clear queue')
    parser.add_argument('--add', type=str, help='Add operation to queue')
    
    args = parser.parse_args()
    manager = QueueManager()
    
    if args.status:
        stats = manager.get_queue_status()
        print(json.dumps(stats.to_dict(), indent=2))
    
    elif args.clear:
        manager.clear()
        print("Queue cleared")
    
    elif args.add:
        item_id = manager.enqueue(args.add, {})
        print(f"Added: {item_id}")
    
    else:
        items = manager.peek(args.peek)
        print(f"Next {len(items)} items:")
        for item in items:
            print(f"  {item['item_id']}: {item['operation']} [{item['priority']}]")


if __name__ == "__main__":
    main()
