"""
PRISM Dev Tools Hooks
Automatically fire dev tools at appropriate times.

DEV-001: Auto-checkpoint before file edits
DEV-002: Impact analysis after code changes
DEV-003: Context watch on session start
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field

# Hook registry
_hooks: Dict[str, 'DevHook'] = {}

@dataclass
class DevHook:
    """Dev tool hook definition"""
    id: str
    trigger: str  # Event that triggers this hook
    tool: str     # Dev tool to call
    params: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    fire_count: int = 0
    last_fired: Optional[datetime] = None


# Hook Definitions
DEV_HOOKS = {
    "DEV-001": DevHook(
        id="DEV-001",
        trigger="before_file_write",
        tool="dev_checkpoint_create",
        params={"label": "auto-pre-edit", "paths": "src,state"}
    ),
    "DEV-002": DevHook(
        id="DEV-002", 
        trigger="after_code_change",
        tool="dev_code_impact",
        params={}  # File param set dynamically
    ),
    "DEV-003": DevHook(
        id="DEV-003",
        trigger="session_start",
        tool="dev_context_watch_start",
        params={"paths": "src,state,config", "events": "create,modify,delete"}
    ),
}


class DevHookManager:
    """Manages dev tool hooks"""
    
    def __init__(self):
        self.hooks = DEV_HOOKS.copy()
        self.watcher_id: Optional[str] = None
        self.checkpoint_id: Optional[str] = None
        self.last_checkpoint: Optional[datetime] = None
        self.checkpoint_interval_minutes: int = 15
    
    def should_checkpoint(self) -> bool:
        """Check if auto-checkpoint should fire"""
        if self.last_checkpoint is None:
            return True
        elapsed = (datetime.now() - self.last_checkpoint).total_seconds() / 60
        return elapsed >= self.checkpoint_interval_minutes
    
    def fire(self, event: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Fire all hooks registered for an event"""
        context = context or {}
        results = []
        
        for hook_id, hook in self.hooks.items():
            if hook.trigger == event and hook.enabled:
                result = self._execute_hook(hook, context)
                results.append(result)
                hook.fire_count += 1
                hook.last_fired = datetime.now()
        
        return {"event": event, "hooks_fired": len(results), "results": results}
    
    def _execute_hook(self, hook: DevHook, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single hook"""
        params = hook.params.copy()
        
        # Dynamic param injection
        if hook.id == "DEV-001":
            params["label"] = f"auto-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            self.last_checkpoint = datetime.now()
        elif hook.id == "DEV-002" and "file" in context:
            params["file"] = context["file"]
        
        return {
            "hook_id": hook.id,
            "tool": hook.tool,
            "params": params,
            "status": "fired"
        }
    
    def enable(self, hook_id: str) -> bool:
        """Enable a hook"""
        if hook_id in self.hooks:
            self.hooks[hook_id].enabled = True
            return True
        return False
    
    def disable(self, hook_id: str) -> bool:
        """Disable a hook"""
        if hook_id in self.hooks:
            self.hooks[hook_id].enabled = False
            return True
        return False
    
    def status(self) -> Dict[str, Any]:
        """Get hook status"""
        return {
            "hooks": {
                hook_id: {
                    "trigger": hook.trigger,
                    "tool": hook.tool,
                    "enabled": hook.enabled,
                    "fire_count": hook.fire_count,
                    "last_fired": hook.last_fired.isoformat() if hook.last_fired else None
                }
                for hook_id, hook in self.hooks.items()
            },
            "watcher_id": self.watcher_id,
            "checkpoint_id": self.checkpoint_id
        }


# Singleton
_manager: Optional[DevHookManager] = None

def get_dev_hook_manager() -> DevHookManager:
    global _manager
    if _manager is None:
        _manager = DevHookManager()
    return _manager

def fire_dev_hook(event: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """Fire dev hooks for an event"""
    return get_dev_hook_manager().fire(event, context)

def dev_hook_status() -> Dict[str, Any]:
    """Get dev hook status"""
    return get_dev_hook_manager().status()


# Events that trigger hooks
EVENTS = {
    "session_start": "DEV-003 fires, starts context watcher",
    "before_file_write": "DEV-001 fires, creates checkpoint",
    "after_code_change": "DEV-002 fires, analyzes impact",
    "session_end": "Stops context watcher, final checkpoint"
}


if __name__ == "__main__":
    manager = get_dev_hook_manager()
    
    # Simulate events
    print("Testing Dev Hooks...")
    
    print("\n1. Session Start:")
    result = fire_dev_hook("session_start")
    print(f"   Hooks fired: {result['hooks_fired']}")
    
    print("\n2. Before File Write:")
    result = fire_dev_hook("before_file_write")
    print(f"   Hooks fired: {result['hooks_fired']}")
    
    print("\n3. After Code Change:")
    result = fire_dev_hook("after_code_change", {"file": "src/tools/myfile.ts"})
    print(f"   Hooks fired: {result['hooks_fired']}")
    
    print("\n4. Hook Status:")
    status = dev_hook_status()
    for hook_id, info in status["hooks"].items():
        print(f"   {hook_id}: {info['fire_count']} fires, enabled={info['enabled']}")
