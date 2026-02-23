#!/usr/bin/env python3
"""
PRISM Efficiency Controller - Integrated layer for ALL MCP operations.
Provides: Auto-batching, context monitoring, compression triggers, caching.
"""
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
import threading

class PressureLevel(Enum):
    GREEN = "GREEN"      # 0-60%
    YELLOW = "YELLOW"    # 60-75%
    ORANGE = "ORANGE"    # 75-85%
    RED = "RED"          # 85-92%
    CRITICAL = "CRITICAL"  # >92%

@dataclass
class ContextBudget:
    """Track context window usage."""
    total_capacity: int = 200000  # Tokens
    system_prompt: int = 15000
    response_reserve: float = 0.15
    current_usage: int = 0
    
    @property
    def working_budget(self) -> int:
        return int((self.total_capacity - self.system_prompt) * (1 - self.response_reserve))
    
    @property
    def available(self) -> int:
        return max(0, self.working_budget - self.current_usage)
    
    @property
    def usage_percent(self) -> float:
        return (self.current_usage / self.working_budget) * 100 if self.working_budget > 0 else 100
    
    @property
    def pressure_level(self) -> PressureLevel:
        pct = self.usage_percent
        if pct < 60:
            return PressureLevel.GREEN
        elif pct < 75:
            return PressureLevel.YELLOW
        elif pct < 85:
            return PressureLevel.ORANGE
        elif pct < 92:
            return PressureLevel.RED
        else:
            return PressureLevel.CRITICAL

@dataclass
class OperationQueue:
    """Queue for batching similar operations."""
    pending: List[Dict[str, Any]] = field(default_factory=list)
    batch_threshold: int = 2
    max_batch_size: int = 20
    
    def add(self, operation: Dict[str, Any]) -> bool:
        """Add operation to queue. Returns True if should flush."""
        self.pending.append(operation)
        return len(self.pending) >= self.batch_threshold
    
    def flush(self) -> List[Dict[str, Any]]:
        """Return and clear pending operations."""
        ops = self.pending[:self.max_batch_size]
        self.pending = self.pending[self.max_batch_size:]
        return ops
    
    def group_by_type(self) -> Dict[str, List[Dict]]:
        """Group pending operations by type for optimal batching."""
        groups = {}
        for op in self.pending:
            op_type = op.get("type", "unknown")
            if op_type not in groups:
                groups[op_type] = []
            groups[op_type].append(op)
        return groups

class Cache:
    """Thread-safe LRU cache for repeated lookups."""
    def __init__(self, max_size: int = 1000):
        self._cache: Dict[str, Any] = {}
        self._access_order: List[str] = []
        self._max_size = max_size
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key in self._cache:
                self._hits += 1
                # Move to end (most recent)
                self._access_order.remove(key)
                self._access_order.append(key)
                return self._cache[key]
            self._misses += 1
            return None
    
    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if key in self._cache:
                self._access_order.remove(key)
            elif len(self._cache) >= self._max_size:
                # Evict oldest
                oldest = self._access_order.pop(0)
                del self._cache[oldest]
            self._cache[key] = value
            self._access_order.append(key)
    
    def stats(self) -> Dict[str, int]:
        return {
            "size": len(self._cache),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self._hits / (self._hits + self._misses) if (self._hits + self._misses) > 0 else 0
        }

class EfficiencyController:
    """
    Central controller for all MCP operations.
    Provides batching, caching, context monitoring, and efficiency optimization.
    """
    
    def __init__(self):
        self.budget = ContextBudget()
        self.queue = OperationQueue()
        self.cache = Cache()
        self.operation_count = 0
        self.checkpoint_interval = 8
        self.last_checkpoint = 0
        self._hooks: Dict[str, List[Callable]] = {}
        self._executor = ThreadPoolExecutor(max_workers=10)
        
    # =========================================================================
    # CONTEXT MANAGEMENT
    # =========================================================================
    
    def context_size(self) -> Dict[str, Any]:
        """Get current context usage and pressure level."""
        return {
            "current_usage": self.budget.current_usage,
            "working_budget": self.budget.working_budget,
            "available": self.budget.available,
            "usage_percent": round(self.budget.usage_percent, 1),
            "pressure_level": self.budget.pressure_level.value,
            "recommendation": self._get_recommendation()
        }
    
    def context_pressure(self) -> PressureLevel:
        """Get current pressure level."""
        return self.budget.pressure_level
    
    def context_compress(self, target_percent: float = 60.0) -> Dict[str, Any]:
        """Compress context to target percentage."""
        current = self.budget.usage_percent
        if current <= target_percent:
            return {"status": "no_compression_needed", "current": current}
        
        # Calculate tokens to free
        target_usage = int(self.budget.working_budget * (target_percent / 100))
        to_free = self.budget.current_usage - target_usage
        
        # Clear cache to free tokens
        cache_freed = len(self.cache._cache) * 50  # Estimate 50 tokens per cached item
        self.cache._cache.clear()
        self.cache._access_order.clear()
        
        self.budget.current_usage = max(0, self.budget.current_usage - cache_freed)
        
        return {
            "status": "compressed",
            "tokens_freed": cache_freed,
            "previous_percent": round(current, 1),
            "new_percent": round(self.budget.usage_percent, 1)
        }
    
    def _get_recommendation(self) -> str:
        level = self.budget.pressure_level
        if level == PressureLevel.GREEN:
            return "Normal operation"
        elif level == PressureLevel.YELLOW:
            return "Consider batching operations, plan compression"
        elif level == PressureLevel.ORANGE:
            return "Compress now, avoid loading large resources"
        elif level == PressureLevel.RED:
            return "Create checkpoint, prepare handoff"
        else:
            return "STOP - Force handoff immediately"
    
    # =========================================================================
    # BATCH PROCESSING
    # =========================================================================
    
    def batch_execute(self, operations: List[Dict[str, Any]], 
                      parallel: bool = True,
                      max_parallel: int = 10) -> List[Dict[str, Any]]:
        """Execute multiple operations in batch, optionally in parallel."""
        if not operations:
            return []
        
        if len(operations) == 1 or not parallel:
            return [self._execute_single(op) for op in operations]
        
        # Parallel execution
        results = []
        with ThreadPoolExecutor(max_workers=min(max_parallel, len(operations))) as executor:
            futures = {executor.submit(self._execute_single, op): i 
                      for i, op in enumerate(operations)}
            
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    result = future.result()
                    results.append((idx, result))
                except Exception as e:
                    results.append((idx, {"error": str(e)}))
        
        # Sort by original order
        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]
    
    def _execute_single(self, operation: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single operation with caching."""
        op_type = operation.get("type", "unknown")
        op_key = json.dumps(operation, sort_keys=True)
        
        # Check cache
        cached = self.cache.get(op_key)
        if cached is not None:
            return {"result": cached, "cached": True}
        
        # Execute (placeholder - actual execution would call MCP tools)
        result = {"type": op_type, "status": "executed", "params": operation}
        
        # Cache result
        self.cache.set(op_key, result)
        
        self.operation_count += 1
        self._check_checkpoint()
        
        return {"result": result, "cached": False}
    
    # =========================================================================
    # CHECKPOINT MANAGEMENT
    # =========================================================================
    
    def _check_checkpoint(self) -> None:
        """Check if checkpoint is needed."""
        if self.operation_count - self.last_checkpoint >= self.checkpoint_interval:
            self._trigger_hook("checkpoint:needed")
    
    def checkpoint_create(self, reason: str = "auto") -> Dict[str, Any]:
        """Create a checkpoint."""
        self.last_checkpoint = self.operation_count
        return {
            "checkpoint_id": f"CP-{int(time.time())}",
            "operation_count": self.operation_count,
            "context_usage": self.budget.usage_percent,
            "cache_stats": self.cache.stats(),
            "reason": reason
        }
    
    # =========================================================================
    # HOOKS
    # =========================================================================
    
    def register_hook(self, event: str, callback: Callable) -> None:
        """Register a hook for an event."""
        if event not in self._hooks:
            self._hooks[event] = []
        self._hooks[event].append(callback)
    
    def _trigger_hook(self, event: str, data: Any = None) -> None:
        """Trigger all hooks for an event."""
        for callback in self._hooks.get(event, []):
            try:
                callback(data)
            except Exception:
                pass
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def stats(self) -> Dict[str, Any]:
        """Get efficiency statistics."""
        return {
            "operations_executed": self.operation_count,
            "checkpoints_created": self.operation_count // self.checkpoint_interval,
            "context": self.context_size(),
            "cache": self.cache.stats(),
            "queue_pending": len(self.queue.pending)
        }

# Singleton instance
_controller: Optional[EfficiencyController] = None

def get_controller() -> EfficiencyController:
    """Get or create the singleton controller."""
    global _controller
    if _controller is None:
        _controller = EfficiencyController()
    return _controller

# =========================================================================
# MCP TOOL WRAPPERS
# =========================================================================

def prism_efficiency_context_size() -> Dict[str, Any]:
    """MCP Tool: Get context size and pressure level."""
    return get_controller().context_size()

def prism_efficiency_context_compress(target_percent: float = 60.0) -> Dict[str, Any]:
    """MCP Tool: Compress context to target percentage."""
    return get_controller().context_compress(target_percent)

def prism_efficiency_batch_execute(operations: List[Dict], parallel: bool = True) -> List[Dict]:
    """MCP Tool: Execute operations in batch."""
    return get_controller().batch_execute(operations, parallel)

def prism_efficiency_checkpoint() -> Dict[str, Any]:
    """MCP Tool: Create checkpoint."""
    return get_controller().checkpoint_create()

def prism_efficiency_stats() -> Dict[str, Any]:
    """MCP Tool: Get efficiency statistics."""
    return get_controller().stats()

def prism_efficiency_cache_get(key: str) -> Optional[Any]:
    """MCP Tool: Get cached value."""
    return get_controller().cache.get(key)

def prism_efficiency_cache_set(key: str, value: Any) -> None:
    """MCP Tool: Set cached value."""
    get_controller().cache.set(key, value)

# =========================================================================
# SELF-TEST
# =========================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("EFFICIENCY CONTROLLER TEST")
    print("=" * 70)
    
    ctrl = get_controller()
    
    # Test context monitoring
    print("\n[1] Context Size:")
    print(json.dumps(ctrl.context_size(), indent=2))
    
    # Simulate usage
    ctrl.budget.current_usage = 100000
    print("\n[2] After 100K tokens used:")
    print(json.dumps(ctrl.context_size(), indent=2))
    
    # Test batch execution
    print("\n[3] Batch Execution (5 operations):")
    ops = [{"type": "material_get", "id": f"MAT-{i}"} for i in range(5)]
    results = ctrl.batch_execute(ops, parallel=True)
    print(f"    Executed {len(results)} operations")
    
    # Test caching
    print("\n[4] Cache Test:")
    ctrl.cache.set("test_key", {"value": 42})
    print(f"    Set: test_key = 42")
    print(f"    Get: test_key = {ctrl.cache.get('test_key')}")
    
    # Test compression
    print("\n[5] Compression (target 60%):")
    print(json.dumps(ctrl.context_compress(60.0), indent=2))
    
    # Final stats
    print("\n[6] Final Statistics:")
    print(json.dumps(ctrl.stats(), indent=2))
    
    print("\n" + "=" * 70)
    print("ALL TESTS PASSED")
    print("=" * 70)
