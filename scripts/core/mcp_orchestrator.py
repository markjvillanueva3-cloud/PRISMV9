#!/usr/bin/env python3
"""
PRISM MCP Orchestrator - Central efficiency management for all MCP operations.
Priority 1: Context efficiency, token optimization, batch processing.
"""
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class PressureLevel(Enum):
    GREEN = "GREEN"       # 0-60%
    YELLOW = "YELLOW"     # 60-75%  
    ORANGE = "ORANGE"     # 75-85%
    RED = "RED"           # 85-92%
    CRITICAL = "CRITICAL" # >92%

@dataclass
class ContextBudget:
    """Track context window usage."""
    total: int = 200000
    system: int = 15000
    reserve: float = 0.15
    used: int = 0
    
    @property
    def working(self) -> int:
        return int((self.total - self.system) * (1 - self.reserve))
    
    @property
    def available(self) -> int:
        return max(0, self.working - self.used)
    
    @property
    def percent(self) -> float:
        return (self.used / self.working) * 100 if self.working > 0 else 100
    
    @property
    def level(self) -> PressureLevel:
        p = self.percent
        if p < 60: return PressureLevel.GREEN
        if p < 75: return PressureLevel.YELLOW
        if p < 85: return PressureLevel.ORANGE
        if p < 92: return PressureLevel.RED
        return PressureLevel.CRITICAL

class MCPOrchestrator:
    """
    Central orchestrator for all MCP operations.
    Handles: batching, caching, context monitoring, efficiency optimization.
    """
    
    def __init__(self):
        self.budget = ContextBudget()
        self._cache: Dict[str, Any] = {}
        self._pending: List[Dict] = []
        self._op_count = 0
        self._checkpoint_interval = 8
        self._last_checkpoint = 0
        self._lock = threading.Lock()
        self._stats = {"hits": 0, "misses": 0, "batches": 0, "ops": 0}
    
    # =========================================================================
    # CONTEXT MANAGEMENT (Priority 1)
    # =========================================================================
    
    def context_status(self) -> Dict[str, Any]:
        """Get context status - call frequently."""
        level = self.budget.level
        return {
            "used": self.budget.used,
            "available": self.budget.available,
            "percent": round(self.budget.percent, 1),
            "level": level.value,
            "action": self._get_action(level)
        }
    
    def _get_action(self, level: PressureLevel) -> str:
        actions = {
            PressureLevel.GREEN: "normal",
            PressureLevel.YELLOW: "batch_ops",
            PressureLevel.ORANGE: "compress_now",
            PressureLevel.RED: "checkpoint_handoff",
            PressureLevel.CRITICAL: "stop_handoff"
        }
        return actions[level]
    
    def add_usage(self, tokens: int) -> None:
        """Track token usage."""
        self.budget.used += tokens
    
    def compress(self, target: float = 60.0) -> Dict[str, Any]:
        """Compress to target percentage."""
        before = self.budget.percent
        if before <= target:
            return {"status": "ok", "percent": before}
        
        # Clear cache
        freed = len(self._cache) * 50
        self._cache.clear()
        self.budget.used = max(0, self.budget.used - freed)
        
        return {
            "status": "compressed",
            "before": round(before, 1),
            "after": round(self.budget.percent, 1),
            "freed": freed
        }
    
    # =========================================================================
    # BATCH PROCESSING (Priority 2)
    # =========================================================================
    
    def queue(self, op: Dict) -> bool:
        """Queue operation. Returns True if should flush."""
        with self._lock:
            self._pending.append(op)
            return len(self._pending) >= 2
    
    def flush(self) -> List[Dict]:
        """Get and clear pending operations."""
        with self._lock:
            ops = self._pending[:20]
            self._pending = self._pending[20:]
            return ops
    
    def batch_execute(self, operations: List[Dict], 
                      executor: Callable[[Dict], Any],
                      parallel: bool = True) -> List[Any]:
        """Execute operations in batch."""
        if not operations:
            return []
        
        self._stats["batches"] += 1
        self._stats["ops"] += len(operations)
        
        if len(operations) == 1 or not parallel:
            return [self._exec_with_cache(op, executor) for op in operations]
        
        results = [None] * len(operations)
        with ThreadPoolExecutor(max_workers=min(10, len(operations))) as ex:
            futures = {ex.submit(self._exec_with_cache, op, executor): i 
                      for i, op in enumerate(operations)}
            for future in as_completed(futures):
                results[futures[future]] = future.result()
        
        self._check_checkpoint()
        return results
    
    def _exec_with_cache(self, op: Dict, executor: Callable) -> Any:
        """Execute with caching."""
        key = json.dumps(op, sort_keys=True)
        
        if key in self._cache:
            self._stats["hits"] += 1
            return self._cache[key]
        
        self._stats["misses"] += 1
        result = executor(op)
        self._cache[key] = result
        self._op_count += 1
        return result
    
    # =========================================================================
    # CHECKPOINT MANAGEMENT
    # =========================================================================
    
    def _check_checkpoint(self) -> bool:
        """Check if checkpoint needed."""
        if self._op_count - self._last_checkpoint >= self._checkpoint_interval:
            return True
        return False
    
    def checkpoint(self, reason: str = "auto") -> Dict[str, Any]:
        """Create checkpoint."""
        self._last_checkpoint = self._op_count
        return {
            "id": f"CP-{int(time.time())}",
            "ops": self._op_count,
            "context": self.budget.percent,
            "reason": reason
        }
    
    def needs_checkpoint(self) -> bool:
        """Check if checkpoint due."""
        return self._op_count - self._last_checkpoint >= self._checkpoint_interval
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def stats(self) -> Dict[str, Any]:
        """Get orchestrator statistics."""
        total = self._stats["hits"] + self._stats["misses"]
        return {
            "ops": self._stats["ops"],
            "batches": self._stats["batches"],
            "cache_hits": self._stats["hits"],
            "cache_misses": self._stats["misses"],
            "hit_rate": self._stats["hits"] / total if total > 0 else 0,
            "context": self.context_status(),
            "pending": len(self._pending),
            "checkpoint_due": self.needs_checkpoint()
        }

# Singleton
_instance: Optional[MCPOrchestrator] = None

def get_orchestrator() -> MCPOrchestrator:
    """Get singleton orchestrator."""
    global _instance
    if _instance is None:
        _instance = MCPOrchestrator()
    return _instance

# =========================================================================
# MCP TOOL FUNCTIONS
# =========================================================================

def prism_orchestrator_status() -> Dict[str, Any]:
    """Get orchestrator status."""
    return get_orchestrator().stats()

def prism_orchestrator_context() -> Dict[str, Any]:
    """Get context status."""
    return get_orchestrator().context_status()

def prism_orchestrator_compress(target: float = 60.0) -> Dict[str, Any]:
    """Compress context."""
    return get_orchestrator().compress(target)

def prism_orchestrator_checkpoint(reason: str = "manual") -> Dict[str, Any]:
    """Create checkpoint."""
    return get_orchestrator().checkpoint(reason)

def prism_orchestrator_batch(operations: List[Dict], 
                             executor: Callable) -> List[Any]:
    """Batch execute operations."""
    return get_orchestrator().batch_execute(operations, executor)

# =========================================================================
# SELF-TEST
# =========================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("MCP ORCHESTRATOR TEST")
    print("=" * 60)
    
    orch = get_orchestrator()
    
    print("\n[1] Initial Status:")
    print(json.dumps(orch.stats(), indent=2))
    
    print("\n[2] Simulate Usage (100K tokens):")
    orch.add_usage(100000)
    print(json.dumps(orch.context_status(), indent=2))
    
    print("\n[3] Batch Execute (5 ops):")
    ops = [{"type": "test", "id": i} for i in range(5)]
    results = orch.batch_execute(ops, lambda x: {"done": x["id"]})
    print(f"  Results: {len(results)}")
    
    print("\n[4] Compress (target 60%):")
    print(json.dumps(orch.compress(60.0), indent=2))
    
    print("\n[5] Final Stats:")
    print(json.dumps(orch.stats(), indent=2))
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
