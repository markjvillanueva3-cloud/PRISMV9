# PRISM Automation Toolkit - Batch Processor
# Version: 1.0.0
# Created: 2026-01-23
#
# Generic batch processing infrastructure for PRISM automation.
# Part of Toolkit 5: Batch Processing

import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any, Iterator
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class BatchItem:
    """Single item in a batch."""
    item_id: str
    data: Any
    status: str = "PENDING"  # PENDING, PROCESSING, SUCCESS, FAILED, SKIPPED
    result: Any = None
    error: str = ""
    duration_ms: float = 0


@dataclass
class BatchResult:
    """Result of batch processing."""
    batch_id: str
    started: str
    completed: str = ""
    total_items: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0
    items: List[BatchItem] = field(default_factory=list)
    duration_seconds: float = 0
    
    @property
    def success_rate(self) -> float:
        if self.total_items == 0:
            return 0.0
        return (self.successful / self.total_items) * 100


# =============================================================================
# BATCH PROCESSOR CLASS
# =============================================================================

class BatchProcessor:
    """Generic batch processor with progress tracking and error handling."""
    
    def __init__(self, name: str = "batch", max_workers: int = 4):
        """
        Initialize batch processor.
        
        Args:
            name: Processor name for logging
            max_workers: Max parallel workers (1 for sequential)
        """
        self.name = name
        self.max_workers = max_workers
        self.logger = setup_logger(f'batch_{name}')
        self._abort = False
    
    def process(self, 
                items: List[Any],
                processor_func: Callable[[Any], Any],
                id_func: Callable[[Any], str] = None,
                skip_func: Callable[[Any], bool] = None,
                progress_callback: Callable[[int, int, BatchItem], None] = None,
                parallel: bool = False) -> BatchResult:
        """
        Process a batch of items.
        
        Args:
            items: List of items to process
            processor_func: Function to process each item
            id_func: Function to get item ID (default: str(index))
            skip_func: Function to check if item should be skipped
            progress_callback: Called after each item
            parallel: Use parallel processing
            
        Returns:
            BatchResult with all outcomes
        """
        batch_id = f"{self.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        result = BatchResult(
            batch_id=batch_id,
            started=timestamp(),
            total_items=len(items)
        )
        
        self._abort = False
        start_time = time.time()
        
        self.logger.info(f"Starting batch {batch_id} with {len(items)} items")
        
        # Prepare batch items
        batch_items = []
        for i, item in enumerate(items):
            item_id = id_func(item) if id_func else str(i)
            batch_items.append(BatchItem(item_id=item_id, data=item))
        
        # Process items
        if parallel and self.max_workers > 1:
            self._process_parallel(batch_items, processor_func, skip_func, progress_callback)
        else:
            self._process_sequential(batch_items, processor_func, skip_func, progress_callback)
        
        # Calculate results
        result.items = batch_items
        result.successful = sum(1 for i in batch_items if i.status == "SUCCESS")
        result.failed = sum(1 for i in batch_items if i.status == "FAILED")
        result.skipped = sum(1 for i in batch_items if i.status == "SKIPPED")
        result.completed = timestamp()
        result.duration_seconds = time.time() - start_time
        
        self.logger.info(
            f"Batch {batch_id} completed: {result.successful} success, "
            f"{result.failed} failed, {result.skipped} skipped in {result.duration_seconds:.1f}s"
        )
        
        return result
    
    def _process_sequential(self, items: List[BatchItem], 
                           processor_func: Callable,
                           skip_func: Callable = None,
                           progress_callback: Callable = None):
        """Process items sequentially."""
        for i, item in enumerate(items):
            if self._abort:
                item.status = "SKIPPED"
                continue
            
            # Check skip condition
            if skip_func and skip_func(item.data):
                item.status = "SKIPPED"
                if progress_callback:
                    progress_callback(i + 1, len(items), item)
                continue
            
            # Process item
            item.status = "PROCESSING"
            start = time.time()
            
            try:
                item.result = processor_func(item.data)
                item.status = "SUCCESS"
            except Exception as e:
                item.status = "FAILED"
                item.error = str(e)
                self.logger.error(f"Item {item.item_id} failed: {e}")
            
            item.duration_ms = (time.time() - start) * 1000
            
            if progress_callback:
                progress_callback(i + 1, len(items), item)
    
    def _process_parallel(self, items: List[BatchItem],
                         processor_func: Callable,
                         skip_func: Callable = None,
                         progress_callback: Callable = None):
        """Process items in parallel."""
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {}
            
            for item in items:
                if skip_func and skip_func(item.data):
                    item.status = "SKIPPED"
                    continue
                
                future = executor.submit(self._process_item, item, processor_func)
                futures[future] = item
            
            completed = 0
            for future in as_completed(futures):
                item = futures[future]
                completed += 1
                
                if progress_callback:
                    progress_callback(completed, len(items), item)
    
    def _process_item(self, item: BatchItem, processor_func: Callable):
        """Process a single item (for parallel execution)."""
        item.status = "PROCESSING"
        start = time.time()
        
        try:
            item.result = processor_func(item.data)
            item.status = "SUCCESS"
        except Exception as e:
            item.status = "FAILED"
            item.error = str(e)
        
        item.duration_ms = (time.time() - start) * 1000
        return item
    
    def abort(self):
        """Abort batch processing."""
        self._abort = True
        self.logger.warning("Batch abort requested")
    
    def process_chunked(self,
                       items: List[Any],
                       processor_func: Callable,
                       chunk_size: int = 25,
                       **kwargs) -> List[BatchResult]:
        """
        Process items in chunks (for large batches).
        
        Args:
            items: All items to process
            processor_func: Processing function
            chunk_size: Items per chunk
            **kwargs: Additional args for process()
            
        Returns:
            List of BatchResults (one per chunk)
        """
        results = []
        
        for i in range(0, len(items), chunk_size):
            chunk = items[i:i + chunk_size]
            chunk_num = i // chunk_size + 1
            total_chunks = (len(items) + chunk_size - 1) // chunk_size
            
            self.logger.info(f"Processing chunk {chunk_num}/{total_chunks}")
            
            result = self.process(chunk, processor_func, **kwargs)
            results.append(result)
            
            if self._abort:
                break
        
        return results


# =============================================================================
# PROGRESS DISPLAY
# =============================================================================

class BatchProgressDisplay:
    """Display progress for batch operations."""
    
    def __init__(self, total: int, description: str = "Processing"):
        self.total = total
        self.description = description
        self.current = 0
        self.start_time = time.time()
    
    def update(self, current: int, total: int, item: BatchItem):
        """Update progress display."""
        self.current = current
        elapsed = time.time() - self.start_time
        rate = current / elapsed if elapsed > 0 else 0
        eta = (total - current) / rate if rate > 0 else 0
        
        pct = (current / total) * 100
        bar_width = 30
        filled = int(bar_width * current / total)
        bar = '█' * filled + '░' * (bar_width - filled)
        
        status_icon = {'SUCCESS': '✓', 'FAILED': '✗', 'SKIPPED': '○'}.get(item.status, '?')
        
        print(f"\r{self.description}: [{bar}] {current}/{total} ({pct:.0f}%) "
              f"{status_icon} {item.item_id[:20]} "
              f"| {rate:.1f}/s ETA: {eta:.0f}s", end='', flush=True)
        
        if current == total:
            print()  # New line at end


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI demo for batch processor."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Batch Processor Demo')
    parser.add_argument('--items', type=int, default=10, help='Number of test items')
    parser.add_argument('--parallel', action='store_true', help='Use parallel processing')
    
    args = parser.parse_args()
    
    # Demo processing function
    def demo_processor(item):
        time.sleep(0.1)  # Simulate work
        if item % 7 == 0:
            raise ValueError(f"Demo error for item {item}")
        return f"Processed {item}"
    
    processor = BatchProcessor("demo")
    progress = BatchProgressDisplay(args.items, "Demo batch")
    
    result = processor.process(
        items=list(range(args.items)),
        processor_func=demo_processor,
        id_func=lambda x: f"item_{x}",
        progress_callback=progress.update,
        parallel=args.parallel
    )
    
    print(f"\nResults: {result.successful} success, {result.failed} failed")
    print(f"Success rate: {result.success_rate:.1f}%")
    print(f"Duration: {result.duration_seconds:.2f}s")


if __name__ == "__main__":
    main()
