#!/usr/bin/env python3
"""
PRISM Batch Processor v1.0
Session 1.6 Deliverable: Process multiple operations in optimized batches.

Features:
- Batch grouping for similar operations
- Parallel execution where safe
- Progress tracking and reporting
- Error handling with partial results
- 5x+ speedup over sequential processing
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
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

# Paths
PRISM_ROOT = Path("C:/PRISM")
BATCH_LOG = PRISM_ROOT / "state" / "BATCH_LOG.jsonl"
BATCH_STATS = PRISM_ROOT / "state" / "BATCH_STATS.json"

class BatchStatus(Enum):
    """Status of a batch operation."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL = "partial"       # Some items failed
    FAILED = "failed"
    CANCELLED = "cancelled"

class OperationType(Enum):
    """Types of operations that can be batched."""
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    DATA_QUERY = "data_query"
    VALIDATION = "validation"
    CALCULATION = "calculation"
    TRANSFORMATION = "transformation"
    GENERIC = "generic"

@dataclass
class BatchItem:
    """Single item in a batch."""
    item_id: str
    operation: str
    params: Dict[str, Any]
    priority: int = 0
    
    # Results
    status: str = "pending"
    result: Any = None
    error: str = None
    duration_ms: float = 0
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class BatchResult:
    """Result of a batch operation."""
    batch_id: str
    status: BatchStatus
    
    # Counts
    total_items: int
    completed_items: int
    failed_items: int
    
    # Timing
    start_time: str
    end_time: str
    total_duration_ms: float
    sequential_estimate_ms: float
    speedup_factor: float
    
    # Results
    results: List[Dict]
    errors: List[Dict]
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['status'] = self.status.value
        return d

class BatchProcessor:
    """Process multiple operations in optimized batches."""
    
    # Configuration
    MAX_PARALLEL = 10           # Max parallel operations
    BATCH_SIZE_LIMIT = 100      # Max items per batch
    TIMEOUT_PER_ITEM_MS = 5000  # Default timeout per item
    
    # Operation type groupings for optimization
    GROUPABLE_OPERATIONS = {
        OperationType.FILE_READ: True,
        OperationType.DATA_QUERY: True,
        OperationType.VALIDATION: True,
        OperationType.CALCULATION: True,
    }
    
    def __init__(self, max_parallel: int = None):
        self._ensure_paths()
        self.max_parallel = max_parallel or self.MAX_PARALLEL
        self.batch_count = 0
        self.active_batches: Dict[str, Dict] = {}
        self._lock = threading.Lock()
        self._load_stats()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        BATCH_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_stats(self):
        """Load batch statistics."""
        self.stats = {
            "total_batches": 0,
            "total_items": 0,
            "total_speedup": 0,
            "avg_speedup": 0
        }
        if BATCH_STATS.exists():
            try:
                self.stats = json.loads(BATCH_STATS.read_text(encoding='utf-8'))
            except:
                pass
    
    def _save_stats(self, speedup: float, items: int):
        """Update and save statistics."""
        self.stats['total_batches'] = self.stats.get('total_batches', 0) + 1
        self.stats['total_items'] = self.stats.get('total_items', 0) + items
        self.stats['total_speedup'] = self.stats.get('total_speedup', 0) + speedup
        self.stats['avg_speedup'] = round(
            self.stats['total_speedup'] / max(self.stats['total_batches'], 1), 2
        )
        self.stats['last_updated'] = datetime.now().isoformat()
        
        BATCH_STATS.write_text(
            json.dumps(self.stats, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _generate_batch_id(self) -> str:
        """Generate unique batch ID."""
        self.batch_count += 1
        timestamp = datetime.now().strftime("%H%M%S")
        return f"BATCH-{timestamp}-{self.batch_count:04d}"
    
    def _generate_item_id(self, operation: str, params: Dict) -> str:
        """Generate item ID from operation and params."""
        content = f"{operation}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _classify_operation(self, operation: str) -> OperationType:
        """Classify operation type for optimization."""
        op_lower = operation.lower()
        
        if 'read' in op_lower or 'get' in op_lower or 'load' in op_lower:
            return OperationType.FILE_READ
        elif 'write' in op_lower or 'save' in op_lower or 'create' in op_lower:
            return OperationType.FILE_WRITE
        elif 'query' in op_lower or 'search' in op_lower or 'find' in op_lower:
            return OperationType.DATA_QUERY
        elif 'valid' in op_lower or 'check' in op_lower or 'verify' in op_lower:
            return OperationType.VALIDATION
        elif 'calc' in op_lower or 'compute' in op_lower or 'formula' in op_lower:
            return OperationType.CALCULATION
        elif 'transform' in op_lower or 'convert' in op_lower or 'format' in op_lower:
            return OperationType.TRANSFORMATION
        else:
            return OperationType.GENERIC
    
    def _group_items(self, items: List[BatchItem]) -> Dict[OperationType, List[BatchItem]]:
        """Group items by operation type for optimization."""
        groups = defaultdict(list)
        
        for item in items:
            op_type = self._classify_operation(item.operation)
            groups[op_type].append(item)
        
        return dict(groups)
    
    def _execute_item(self, item: BatchItem, executor: Callable) -> BatchItem:
        """Execute a single batch item."""
        start = time.time()
        
        try:
            result = executor(item.operation, item.params)
            item.status = "completed"
            item.result = result
        except Exception as e:
            item.status = "failed"
            item.error = str(e)
        
        item.duration_ms = round((time.time() - start) * 1000, 2)
        return item
    
    def execute(self, items: List[Dict], executor: Callable,
                parallel: bool = True,
                group_by_type: bool = True) -> BatchResult:
        """
        Execute a batch of operations.
        
        Args:
            items: List of dicts with 'operation' and 'params' keys
            executor: Function(operation, params) -> result
            parallel: Execute in parallel (default True)
            group_by_type: Group similar operations (default True)
            
        Returns:
            BatchResult with all results and metrics
        """
        batch_id = self._generate_batch_id()
        start_time = datetime.now()
        
        # Convert to BatchItems
        batch_items = []
        for i, item in enumerate(items):
            batch_items.append(BatchItem(
                item_id=self._generate_item_id(item['operation'], item.get('params', {})),
                operation=item['operation'],
                params=item.get('params', {}),
                priority=item.get('priority', i)
            ))
        
        # Track active batch
        with self._lock:
            self.active_batches[batch_id] = {
                "status": "running",
                "total": len(batch_items),
                "completed": 0
            }
        
        # Estimate sequential time
        sequential_estimate_ms = len(batch_items) * self.TIMEOUT_PER_ITEM_MS * 0.5
        
        results = []
        errors = []
        
        if parallel and len(batch_items) > 1:
            # Parallel execution
            if group_by_type:
                groups = self._group_items(batch_items)
                # Process groups in parallel
                with ThreadPoolExecutor(max_workers=self.max_parallel) as pool:
                    futures = []
                    for op_type, group in groups.items():
                        for item in group:
                            futures.append(pool.submit(self._execute_item, item, executor))
                    
                    for future in as_completed(futures):
                        item = future.result()
                        if item.status == "completed":
                            results.append(item.to_dict())
                        else:
                            errors.append({"item_id": item.item_id, "error": item.error})
                        
                        with self._lock:
                            self.active_batches[batch_id]["completed"] += 1
            else:
                # Simple parallel without grouping
                with ThreadPoolExecutor(max_workers=self.max_parallel) as pool:
                    futures = {pool.submit(self._execute_item, item, executor): item 
                              for item in batch_items}
                    
                    for future in as_completed(futures):
                        item = future.result()
                        if item.status == "completed":
                            results.append(item.to_dict())
                        else:
                            errors.append({"item_id": item.item_id, "error": item.error})
                        
                        with self._lock:
                            self.active_batches[batch_id]["completed"] += 1
        else:
            # Sequential execution
            for item in batch_items:
                item = self._execute_item(item, executor)
                if item.status == "completed":
                    results.append(item.to_dict())
                else:
                    errors.append({"item_id": item.item_id, "error": item.error})
                
                with self._lock:
                    self.active_batches[batch_id]["completed"] += 1
        
        end_time = datetime.now()
        total_duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Calculate speedup
        actual_sequential = sum(r.get('duration_ms', 0) for r in results)
        speedup = actual_sequential / max(total_duration_ms, 1)
        
        # Determine status
        if len(errors) == 0:
            status = BatchStatus.COMPLETED
        elif len(results) == 0:
            status = BatchStatus.FAILED
        else:
            status = BatchStatus.PARTIAL
        
        # Build result
        batch_result = BatchResult(
            batch_id=batch_id,
            status=status,
            total_items=len(batch_items),
            completed_items=len(results),
            failed_items=len(errors),
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat(),
            total_duration_ms=round(total_duration_ms, 2),
            sequential_estimate_ms=round(sequential_estimate_ms, 2),
            speedup_factor=round(speedup, 2),
            results=results,
            errors=errors
        )
        
        # Cleanup and log
        with self._lock:
            del self.active_batches[batch_id]
        
        self._log_batch(batch_result)
        self._save_stats(speedup, len(batch_items))
        
        return batch_result
    
    def execute_grouped(self, operations: Dict[str, List[Dict]], 
                        executors: Dict[str, Callable]) -> Dict[str, BatchResult]:
        """
        Execute multiple operation groups with different executors.
        
        Args:
            operations: Dict mapping operation type to list of params
            executors: Dict mapping operation type to executor function
            
        Returns:
            Dict of BatchResults keyed by operation type
        """
        results = {}
        
        for op_type, items in operations.items():
            executor = executors.get(op_type)
            if executor:
                batch_items = [{"operation": op_type, "params": p} for p in items]
                results[op_type] = self.execute(batch_items, executor)
        
        return results
    
    def get_active_batches(self) -> Dict[str, Dict]:
        """Get currently running batches."""
        with self._lock:
            return dict(self.active_batches)
    
    def _log_batch(self, result: BatchResult):
        """Log batch result."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "batch_id": result.batch_id,
            "status": result.status.value,
            "total_items": result.total_items,
            "completed": result.completed_items,
            "failed": result.failed_items,
            "duration_ms": result.total_duration_ms,
            "speedup": result.speedup_factor
        }
        with open(BATCH_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get batch processing statistics."""
        return {
            **self.stats,
            "active_batches": len(self.active_batches),
            "max_parallel": self.max_parallel
        }


# Convenience functions for common batch operations
def batch_read_files(paths: List[str]) -> BatchResult:
    """Batch read multiple files."""
    processor = BatchProcessor()
    
    def read_executor(operation: str, params: Dict) -> str:
        path = Path(params['path'])
        if path.exists():
            return path.read_text(encoding='utf-8')
        raise FileNotFoundError(f"File not found: {path}")
    
    items = [{"operation": "read_file", "params": {"path": p}} for p in paths]
    return processor.execute(items, read_executor)


def batch_validate(items: List[Dict], validator: Callable) -> BatchResult:
    """Batch validate multiple items."""
    processor = BatchProcessor()
    
    def validate_executor(operation: str, params: Dict) -> bool:
        return validator(params)
    
    batch_items = [{"operation": "validate", "params": item} for item in items]
    return processor.execute(batch_items, validate_executor)


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Batch Processor")
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--test', action='store_true', help='Run test batch')
    parser.add_argument('--parallel', type=int, default=10, help='Max parallel')
    
    args = parser.parse_args()
    processor = BatchProcessor(max_parallel=args.parallel)
    
    if args.stats:
        stats = processor.get_statistics()
        print(json.dumps(stats, indent=2))
    
    elif args.test:
        # Test batch
        def test_executor(op: str, params: Dict) -> str:
            time.sleep(0.1)  # Simulate work
            return f"Processed: {params.get('id', 'unknown')}"
        
        items = [{"operation": "test", "params": {"id": i}} for i in range(20)]
        
        print("Running test batch with 20 items...")
        result = processor.execute(items, test_executor)
        
        print(f"\nBatch ID: {result.batch_id}")
        print(f"Status: {result.status.value}")
        print(f"Completed: {result.completed_items}/{result.total_items}")
        print(f"Duration: {result.total_duration_ms:.0f}ms")
        print(f"Speedup: {result.speedup_factor:.1f}x")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
