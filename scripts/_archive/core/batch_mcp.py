#!/usr/bin/env python3
"""
PRISM Batch MCP Tools v1.0
Session 1.6 Deliverables: prism_batch_execute, prism_queue_status

MCP tools for batch processing and queue management.
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
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable

# Import components
try:
    from batch_processor import BatchProcessor, BatchResult, OperationType
    from queue_manager import QueueManager, QueuePriority, QueueStats
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from batch_processor import BatchProcessor, BatchResult, OperationType
    from queue_manager import QueueManager, QueuePriority, QueueStats


class BatchMCP:
    """MCP tools for batch processing and queue management."""
    
    # Built-in executors for common operations
    BUILTIN_EXECUTORS = {
        'echo': lambda op, params: params,
        'delay': lambda op, params: time.sleep(params.get('seconds', 0.1)) or 'delayed',
        'read_file': lambda op, params: Path(params['path']).read_text(encoding='utf-8') if Path(params['path']).exists() else None,
        'file_exists': lambda op, params: Path(params['path']).exists(),
        'validate_json': lambda op, params: json.loads(params.get('content', '{}')) is not None,
    }
    
    def __init__(self, max_parallel: int = 10):
        self.processor = BatchProcessor(max_parallel=max_parallel)
        self.queue = QueueManager(persist=True)
        self.custom_executors: Dict[str, Callable] = {}
    
    def register_executor(self, name: str, executor: Callable):
        """Register a custom executor."""
        self.custom_executors[name] = executor
    
    def _get_executor(self, operation: str) -> Optional[Callable]:
        """Get executor for operation."""
        # Check custom first
        if operation in self.custom_executors:
            return self.custom_executors[operation]
        
        # Check built-in
        if operation in self.BUILTIN_EXECUTORS:
            return self.BUILTIN_EXECUTORS[operation]
        
        # Generic executor that just returns params
        return lambda op, params: {"operation": op, "params": params, "executed": True}
    
    def prism_batch_execute(self, items: List[Dict],
                            parallel: bool = True,
                            max_parallel: int = 10,
                            group_by_type: bool = True,
                            use_queue: bool = False,
                            priority: str = "normal") -> Dict[str, Any]:
        """
        Execute a batch of operations.
        
        Args:
            items: List of operations, each with:
                   - operation: Operation name (required)
                   - params: Parameters dict (optional)
                   - priority: Item priority (optional)
            parallel: Execute in parallel (default True)
            max_parallel: Maximum parallel operations (default 10)
            group_by_type: Group similar operations (default True)
            use_queue: Add to queue instead of immediate execution
            priority: Queue priority if using queue (critical, high, normal, low, background)
            
        Returns:
            Dict with:
            - batch_id: Unique batch identifier
            - status: completed, partial, failed
            - total_items: Number of items
            - completed: Successfully completed
            - failed: Failed items
            - duration_ms: Total duration
            - speedup: Speedup factor vs sequential
            - results: List of results
            - errors: List of errors
            
        Built-in operations:
            - echo: Returns params as-is
            - delay: Sleeps for params.seconds
            - read_file: Reads params.path
            - file_exists: Checks if params.path exists
            - validate_json: Validates params.content as JSON
        """
        if not items:
            return {"error": "No items provided", "items_required": True}
        
        # Use queue if requested
        if use_queue:
            try:
                queue_priority = QueuePriority[priority.upper()]
            except KeyError:
                queue_priority = QueuePriority.NORMAL
            
            item_ids = self.queue.enqueue_batch(items, queue_priority)
            
            return {
                "queued": True,
                "item_ids": item_ids,
                "count": len(item_ids),
                "priority": queue_priority.name,
                "message": f"Added {len(item_ids)} items to queue"
            }
        
        # Update processor config
        self.processor.max_parallel = max_parallel
        
        # Create unified executor
        def unified_executor(operation: str, params: Dict) -> Any:
            executor = self._get_executor(operation)
            if executor:
                return executor(operation, params)
            raise ValueError(f"No executor for operation: {operation}")
        
        # Execute batch
        result = self.processor.execute(
            items=items,
            executor=unified_executor,
            parallel=parallel,
            group_by_type=group_by_type
        )
        
        return {
            "batch_id": result.batch_id,
            "status": result.status.value,
            "total_items": result.total_items,
            "completed": result.completed_items,
            "failed": result.failed_items,
            "duration_ms": result.total_duration_ms,
            "speedup": result.speedup_factor,
            "results": result.results[:20],  # Limit for response size
            "errors": result.errors,
            "start_time": result.start_time,
            "end_time": result.end_time
        }
    
    def prism_queue_status(self, action: str = "status",
                           item_id: str = None,
                           operation: str = None,
                           params: Dict = None,
                           priority: str = "normal",
                           count: int = 5,
                           process: bool = False) -> Dict[str, Any]:
        """
        Manage the operation queue.
        
        Args:
            action: Action to perform:
                    - status: Get queue statistics (default)
                    - peek: View next items without removing
                    - add: Add item to queue
                    - cancel: Cancel queued item
                    - get: Get specific item status
                    - clear: Clear the queue
                    - process: Process items from queue
            item_id: Item ID for get/cancel actions
            operation: Operation name for add action
            params: Parameters for add action
            priority: Priority for add (critical, high, normal, low, background)
            count: Number of items for peek/process
            process: If True with action=status, also process pending items
            
        Returns:
            Dict with action-specific results
        """
        action = action.lower()
        
        if action == "status":
            stats = self.queue.get_queue_status()
            result = {
                "action": "status",
                "queue": stats.to_dict(),
                "processor": self.processor.get_statistics()
            }
            
            # Optionally process some items
            if process:
                processed = self._process_queue(count)
                result["processed"] = processed
            
            return result
        
        elif action == "peek":
            items = self.queue.peek(count)
            return {
                "action": "peek",
                "count": len(items),
                "items": items
            }
        
        elif action == "add":
            if not operation:
                return {"error": "operation required for add action"}
            
            try:
                queue_priority = QueuePriority[priority.upper()]
            except KeyError:
                queue_priority = QueuePriority.NORMAL
            
            item_id = self.queue.enqueue(
                operation=operation,
                params=params or {},
                priority=queue_priority
            )
            
            if item_id:
                return {
                    "action": "add",
                    "item_id": item_id,
                    "operation": operation,
                    "priority": queue_priority.name,
                    "queued": True
                }
            else:
                return {
                    "action": "add",
                    "queued": False,
                    "reason": "Duplicate or queue full"
                }
        
        elif action == "cancel":
            if not item_id:
                return {"error": "item_id required for cancel action"}
            
            cancelled = self.queue.cancel(item_id)
            return {
                "action": "cancel",
                "item_id": item_id,
                "cancelled": cancelled
            }
        
        elif action == "get":
            if not item_id:
                return {"error": "item_id required for get action"}
            
            status = self.queue.get_status(item_id)
            return {
                "action": "get",
                "item_id": item_id,
                "found": status is not None,
                "status": status
            }
        
        elif action == "clear":
            self.queue.clear()
            return {
                "action": "clear",
                "cleared": True
            }
        
        elif action == "process":
            processed = self._process_queue(count)
            return {
                "action": "process",
                "processed": processed
            }
        
        else:
            return {
                "error": f"Unknown action: {action}",
                "valid_actions": ["status", "peek", "add", "cancel", "get", "clear", "process"]
            }
    
    def _process_queue(self, count: int) -> Dict[str, Any]:
        """Process items from queue."""
        items = self.queue.dequeue(count)
        
        if not items:
            return {"dequeued": 0, "results": []}
        
        results = []
        for item in items:
            try:
                executor = self._get_executor(item.operation)
                if executor:
                    result = executor(item.operation, item.params)
                    self.queue.complete(item.item_id, result)
                    results.append({
                        "item_id": item.item_id,
                        "status": "completed",
                        "result": result
                    })
                else:
                    self.queue.fail(item.item_id, "No executor found")
                    results.append({
                        "item_id": item.item_id,
                        "status": "failed",
                        "error": "No executor"
                    })
            except Exception as e:
                self.queue.fail(item.item_id, str(e))
                results.append({
                    "item_id": item.item_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "dequeued": len(items),
            "completed": sum(1 for r in results if r['status'] == 'completed'),
            "failed": sum(1 for r in results if r['status'] == 'failed'),
            "results": results
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_batch_execute":
            return self.prism_batch_execute(**params)
        elif tool_name == "prism_queue_status":
            return self.prism_queue_status(**params)
        else:
            return {"error": f"Unknown tool: {tool_name}"}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Batch MCP Tools")
    parser.add_argument('--batch', action='store_true', help='Run test batch')
    parser.add_argument('--queue', action='store_true', help='Show queue status')
    parser.add_argument('--add', type=str, help='Add operation to queue')
    parser.add_argument('--process', type=int, help='Process N items from queue')
    
    args = parser.parse_args()
    mcp = BatchMCP()
    
    if args.batch:
        # Test batch
        items = [
            {"operation": "echo", "params": {"id": i, "data": f"item_{i}"}}
            for i in range(10)
        ]
        result = mcp.prism_batch_execute(items)
        print(f"Batch: {result['batch_id']}")
        print(f"Status: {result['status']}")
        print(f"Completed: {result['completed']}/{result['total_items']}")
        print(f"Speedup: {result['speedup']}x")
    
    elif args.queue:
        result = mcp.prism_queue_status()
        print(json.dumps(result, indent=2))
    
    elif args.add:
        result = mcp.prism_queue_status(
            action="add",
            operation=args.add,
            params={}
        )
        print(json.dumps(result, indent=2))
    
    elif args.process:
        result = mcp.prism_queue_status(
            action="process",
            count=args.process
        )
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
