"""
PRISM Context Hooks
Implements Manus 6 Laws for context engineering:
- Law 1: KV-Cache Stability
- Law 2: Tool Masking by State
- Law 3: External Memory
- Law 4: Attention Anchoring
- Law 5: Error Preservation
- Law 6: Response Variation

Author: PRISM Claude Development Enhancement
Version: 1.0.0
"""

import json
import hashlib
import random
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass
from enum import Enum


class ContextZone(Enum):
    """Context pressure zones"""
    GREEN = "GREEN"      # 0-60% - Normal operation
    YELLOW = "YELLOW"    # 60-75% - Start batching
    ORANGE = "ORANGE"    # 75-85% - Checkpoint required
    RED = "RED"          # 85-92% - Urgent handoff
    CRITICAL = "CRITICAL"  # >92% - STOP execution


@dataclass
class ContextState:
    """Current context state"""
    tokens_used: int
    tokens_max: int
    zone: ContextZone
    checkpoint_recommended: bool
    handoff_required: bool


class KVCacheStabilizer:
    """Law 1: Ensure deterministic serialization for KV-cache hits"""
    
    @staticmethod
    def sort_json(data: Any, write_path: Optional[str] = None) -> Any:
        """Sort JSON keys alphabetically for stable serialization"""
        if isinstance(data, dict):
            sorted_dict = {k: KVCacheStabilizer.sort_json(v) for k, v in sorted(data.items())}
            if write_path:
                with open(write_path, 'w') as f:
                    json.dump(sorted_dict, f, indent=2, sort_keys=True)
            return sorted_dict
        elif isinstance(data, list):
            return [KVCacheStabilizer.sort_json(item) for item in data]
        return data
    
    @staticmethod
    def check_stability(content: str) -> Dict:
        """Check if content is stable (no dynamic elements in prefix)"""
        instability_markers = [
            "datetime.now()",
            "time.time()",
            "random.",
            "uuid.",
            "${",  # Template variables
            "{{",  # Jinja templates
        ]
        
        issues = []
        for marker in instability_markers:
            if marker in content:
                issues.append(f"Unstable element found: {marker}")
        
        content_hash = hashlib.md5(content.encode()).hexdigest()
        
        return {
            "stable": len(issues) == 0,
            "issues": issues,
            "content_hash": content_hash,
            "recommendation": "Remove dynamic elements from prompt prefix" if issues else "Content is KV-cache friendly"
        }


class ToolMaskManager:
    """Law 2: Mask tools by workflow state"""
    
    TOOL_AVAILABILITY = {
        "INITIALIZATION": {
            "allowed": ["prism_gsd_core", "prism_state_load", "prism_session_start"],
            "masked": ["prism_sp_execute", "prism_agent_invoke"]
        },
        "PLANNING": {
            "allowed": ["prism_sp_brainstorm", "prism_sp_plan", "prism_skill_search"],
            "masked": ["prism_sp_execute", "prism_session_end"]
        },
        "EXECUTION": {
            "allowed": ["prism_sp_execute", "prism_agent_invoke", "prism_checkpoint_create"],
            "masked": ["prism_session_start"]
        },
        "VALIDATION": {
            "allowed": ["prism_sp_review_spec", "prism_sp_review_quality", "prism_validate_gates"],
            "masked": ["prism_sp_brainstorm"]
        },
        "ERROR_RECOVERY": {
            "allowed": ["prism_sp_debug", "prism_error_preserve", "prism_state_load"],
            "masked": ["prism_sp_execute"]
        }
    }
    
    @classmethod
    def get_available_tools(cls, state: str) -> Dict:
        """Get tools available for current state"""
        if state not in cls.TOOL_AVAILABILITY:
            return {"allowed": ["all"], "masked": []}
        return cls.TOOL_AVAILABILITY[state]
    
    @classmethod
    def is_tool_allowed(cls, tool: str, state: str) -> bool:
        """Check if a tool is allowed in current state"""
        availability = cls.get_available_tools(state)
        if "all" in availability["allowed"]:
            return True
        return tool in availability["allowed"] or tool not in availability["masked"]


class ExternalMemoryManager:
    """Law 3: Externalize context to file system"""
    
    def __init__(self, base_path: str = "C:\\PRISM\\state\\memory"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.hot_memory: Dict[str, Any] = {}  # In-context (immediate access)
        self.warm_path = self.base_path / "warm"  # Recent files
        self.cold_path = self.base_path / "cold"  # Archive
        self.warm_path.mkdir(exist_ok=True)
        self.cold_path.mkdir(exist_ok=True)
    
    def externalize(self, key: str, content: Any, memory_type: str = "event") -> Dict:
        """Move content from context to file system"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{memory_type}_{key}_{timestamp}.json"
        filepath = self.warm_path / filename
        
        record = {
            "key": key,
            "type": memory_type,
            "content": content,
            "externalized_at": datetime.now().isoformat(),
            "restoration_key": f"{memory_type}:{key}:{timestamp}"
        }
        
        with open(filepath, 'w') as f:
            json.dump(record, f, indent=2, default=str)
        
        return {
            "externalized": True,
            "restoration_key": record["restoration_key"],
            "filepath": str(filepath),
            "tokens_freed": len(json.dumps(content)) // 4  # Rough estimate
        }
    
    def restore(self, restoration_key: str) -> Dict:
        """Restore content from file system to context"""
        parts = restoration_key.split(":")
        if len(parts) < 2:
            return {"error": "Invalid restoration key"}
        
        memory_type, key = parts[0], parts[1]
        pattern = f"{memory_type}_{key}_*.json"
        
        # Search in warm, then cold
        for search_path in [self.warm_path, self.cold_path]:
            matches = list(search_path.glob(pattern))
            if matches:
                latest = max(matches, key=lambda p: p.stat().st_mtime)
                with open(latest, 'r') as f:
                    record = json.load(f)
                return {
                    "restored": True,
                    "content": record["content"],
                    "from_path": str(latest),
                    "externalized_at": record.get("externalized_at")
                }
        
        return {"error": f"No record found for key: {restoration_key}"}
    
    def archive_old(self, days_threshold: int = 7) -> Dict:
        """Move old warm memory to cold storage"""
        import time
        threshold_seconds = days_threshold * 24 * 60 * 60
        now = time.time()
        archived = []
        
        for filepath in self.warm_path.glob("*.json"):
            age = now - filepath.stat().st_mtime
            if age > threshold_seconds:
                dest = self.cold_path / filepath.name
                filepath.rename(dest)
                archived.append(filepath.name)
        
        return {"archived": archived, "count": len(archived)}


class AttentionAnchorer:
    """Law 4: Keep goals in recent attention via todo.md"""
    
    def __init__(self, todo_path: str = "C:\\PRISM\\state\\todo.md"):
        self.todo_path = Path(todo_path)
    
    def update_todo(self, task_name: str, current_focus: str, next_action: str,
                    steps: List[Dict] = None, quality_scores: Dict = None) -> Dict:
        """Update todo.md to anchor attention on current goals"""
        steps = steps or []
        quality_scores = quality_scores or {}
        
        content = f"""# Current Task: {task_name}

## 🎯 CURRENT FOCUS
{current_focus}

## ➡️ NEXT ACTION
{next_action}

## 📋 Steps
"""
        for i, step in enumerate(steps, 1):
            status = "✅" if step.get("complete") else "⬜"
            content += f"{i}. {status} {step.get('description', 'Step ' + str(i))}\n"
        
        if quality_scores:
            content += f"""
## 📊 Quality Metrics
- S(x) Safety: {quality_scores.get('S', 'N/A')}
- Ω(x) Overall: {quality_scores.get('omega', 'N/A')}
"""
        
        content += f"\n---\n_Last updated: {datetime.now().isoformat()}_\n"
        
        with open(self.todo_path, 'w') as f:
            f.write(content)
        
        return {
            "updated": True,
            "path": str(self.todo_path),
            "task": task_name,
            "focus": current_focus
        }
    
    def read_todo(self) -> Dict:
        """Read current todo.md for attention refresh"""
        if not self.todo_path.exists():
            return {"exists": False, "content": None}
        
        with open(self.todo_path, 'r') as f:
            content = f.read()
        
        return {
            "exists": True,
            "content": content,
            "last_modified": datetime.fromtimestamp(
                self.todo_path.stat().st_mtime
            ).isoformat()
        }


class ErrorPreserver:
    """Law 5: Keep errors in context for learning"""
    
    def __init__(self, error_log_path: str = "C:\\PRISM\\state\\errors"):
        self.error_path = Path(error_log_path)
        self.error_path.mkdir(parents=True, exist_ok=True)
    
    def preserve(self, tool_name: str, error_message: str, error_type: str,
                 parameters: Dict, context_summary: str = "") -> Dict:
        """Preserve error for model learning - NEVER clean errors"""
        timestamp = datetime.now()
        error_record = {
            "tool_name": tool_name,
            "error_message": error_message,
            "error_type": error_type,
            "parameters": parameters,
            "context_summary": context_summary,
            "timestamp": timestamp.isoformat(),
            "session_id": self._get_session_id()
        }
        
        # Save to file
        filename = f"error_{timestamp.strftime('%Y%m%d_%H%M%S')}_{tool_name}.json"
        filepath = self.error_path / filename
        
        with open(filepath, 'w') as f:
            json.dump(error_record, f, indent=2, default=str)
        
        return {
            "preserved": True,
            "filepath": str(filepath),
            "error_id": filename,
            "learning_note": "Error preserved for future avoidance"
        }
    
    def analyze_patterns(self, days_back: int = 7) -> Dict:
        """Analyze error patterns to identify recurring issues"""
        import time
        threshold = time.time() - (days_back * 24 * 60 * 60)
        
        errors = []
        for filepath in self.error_path.glob("error_*.json"):
            if filepath.stat().st_mtime > threshold:
                with open(filepath, 'r') as f:
                    errors.append(json.load(f))
        
        if not errors:
            return {"patterns": [], "total_errors": 0}
        
        # Analyze by tool
        tool_counts = {}
        type_counts = {}
        for err in errors:
            tool = err.get("tool_name", "unknown")
            etype = err.get("error_type", "unknown")
            tool_counts[tool] = tool_counts.get(tool, 0) + 1
            type_counts[etype] = type_counts.get(etype, 0) + 1
        
        patterns = []
        for tool, count in sorted(tool_counts.items(), key=lambda x: -x[1]):
            if count >= 2:
                patterns.append({
                    "type": "recurring_tool_error",
                    "tool": tool,
                    "count": count,
                    "recommendation": f"Review usage of {tool}"
                })
        
        return {
            "patterns": patterns,
            "total_errors": len(errors),
            "by_tool": tool_counts,
            "by_type": type_counts
        }
    
    def _get_session_id(self) -> str:
        """Get current session ID"""
        state_file = Path("C:\\PRISM\\state\\CURRENT_STATE.json")
        if state_file.exists():
            with open(state_file, 'r') as f:
                state = json.load(f)
                return state.get("session_id", "unknown")
        return "unknown"


class ResponseVarier:
    """Law 6: Introduce variation to prevent mimicry"""
    
    VARIATION_TEMPLATES = {
        "acknowledgment": [
            "Got it.",
            "Understood.",
            "Proceeding with that.",
            "On it.",
            "Executing now."
        ],
        "completion": [
            "Done.",
            "Complete.",
            "Finished.",
            "That's done.",
            "All set."
        ],
        "transition": [
            "Moving on to",
            "Next up:",
            "Now handling",
            "Proceeding to",
            "Shifting to"
        ]
    }
    
    @classmethod
    def vary(cls, content: str, variation_level: str = "MEDIUM") -> str:
        """Add structured variation to prevent few-shot mimicry"""
        if variation_level == "LOW":
            return content
        
        # Replace common phrases with variations
        for phrase_type, alternatives in cls.VARIATION_TEMPLATES.items():
            for alt in alternatives:
                if alt.lower() in content.lower():
                    replacement = random.choice([a for a in alternatives if a != alt])
                    content = content.replace(alt, replacement, 1)
                    break
        
        if variation_level == "HIGH":
            # Add structural variation
            sentences = content.split(". ")
            if len(sentences) > 2:
                # Occasionally reorder non-critical sentences
                pass  # Keep order for safety
        
        return content


class ContextPressureMonitor:
    """Monitor context pressure and recommend actions"""
    
    ZONE_THRESHOLDS = {
        ContextZone.GREEN: (0, 0.60),
        ContextZone.YELLOW: (0.60, 0.75),
        ContextZone.ORANGE: (0.75, 0.85),
        ContextZone.RED: (0.85, 0.92),
        ContextZone.CRITICAL: (0.92, 1.0)
    }
    
    def __init__(self, max_tokens: int = 200000):
        self.max_tokens = max_tokens
    
    def get_zone(self, tokens_used: int) -> ContextZone:
        """Determine current context zone"""
        ratio = tokens_used / self.max_tokens
        for zone, (low, high) in self.ZONE_THRESHOLDS.items():
            if low <= ratio < high:
                return zone
        return ContextZone.CRITICAL
    
    def get_state(self, tokens_used: int) -> ContextState:
        """Get full context state with recommendations"""
        zone = self.get_zone(tokens_used)
        
        return ContextState(
            tokens_used=tokens_used,
            tokens_max=self.max_tokens,
            zone=zone,
            checkpoint_recommended=zone in [ContextZone.ORANGE, ContextZone.RED],
            handoff_required=zone in [ContextZone.RED, ContextZone.CRITICAL]
        )
    
    def get_recommendations(self, tokens_used: int) -> List[str]:
        """Get action recommendations for current pressure"""
        zone = self.get_zone(tokens_used)
        
        recommendations = {
            ContextZone.GREEN: ["Normal operation - no action needed"],
            ContextZone.YELLOW: [
                "Consider batching similar operations",
                "Start preparing checkpoint data"
            ],
            ContextZone.ORANGE: [
                "CREATE CHECKPOINT NOW",
                "Externalize non-essential context",
                "Prepare handoff summary"
            ],
            ContextZone.RED: [
                "URGENT: Begin handoff procedure",
                "Externalize all possible data",
                "Complete current task and stop"
            ],
            ContextZone.CRITICAL: [
                "STOP ALL NEW OPERATIONS",
                "Execute immediate handoff",
                "Save state and end session"
            ]
        }
        
        return recommendations.get(zone, ["Unknown zone"])


# === UNIFIED CONTEXT HOOKS API ===

class ContextHooks:
    """Unified API for all context engineering hooks"""
    
    def __init__(self):
        self.kv_cache = KVCacheStabilizer()
        self.tool_mask = ToolMaskManager()
        self.memory = ExternalMemoryManager()
        self.attention = AttentionAnchorer()
        self.errors = ErrorPreserver()
        self.variation = ResponseVarier()
        self.pressure = ContextPressureMonitor()
    
    # Law 1
    def sort_json(self, data: Any, write_path: str = None) -> Any:
        return self.kv_cache.sort_json(data, write_path)
    
    def check_stability(self, content: str) -> Dict:
        return self.kv_cache.check_stability(content)
    
    # Law 2
    def get_tool_mask(self, state: str) -> Dict:
        return self.tool_mask.get_available_tools(state)
    
    def is_allowed(self, tool: str, state: str) -> bool:
        return self.tool_mask.is_tool_allowed(tool, state)
    
    # Law 3
    def externalize(self, key: str, content: Any, memory_type: str = "event") -> Dict:
        return self.memory.externalize(key, content, memory_type)
    
    def restore(self, key: str) -> Dict:
        return self.memory.restore(key)
    
    # Law 4
    def update_todo(self, **kwargs) -> Dict:
        return self.attention.update_todo(**kwargs)
    
    def read_todo(self) -> Dict:
        return self.attention.read_todo()
    
    # Law 5
    def preserve_error(self, **kwargs) -> Dict:
        return self.errors.preserve(**kwargs)
    
    def analyze_errors(self, days: int = 7) -> Dict:
        return self.errors.analyze_patterns(days)
    
    # Law 6
    def vary_response(self, content: str, level: str = "MEDIUM") -> str:
        return self.variation.vary(content, level)
    
    # Pressure monitoring
    def get_pressure(self, tokens: int) -> ContextState:
        return self.pressure.get_state(tokens)
    
    def get_recommendations(self, tokens: int) -> List[str]:
        return self.pressure.get_recommendations(tokens)


# Singleton instance
_hooks: Optional[ContextHooks] = None

def get_hooks() -> ContextHooks:
    global _hooks
    if _hooks is None:
        _hooks = ContextHooks()
    return _hooks


if __name__ == "__main__":
    hooks = ContextHooks()
    
    # Test pressure monitoring
    print("=== Context Pressure Test ===")
    for tokens in [50000, 130000, 160000, 180000, 190000]:
        state = hooks.get_pressure(tokens)
        print(f"Tokens: {tokens} -> Zone: {state.zone.value}, Checkpoint: {state.checkpoint_recommended}")
    
    # Test error preservation
    print("\n=== Error Preservation Test ===")
    result = hooks.preserve_error(
        tool_name="test_tool",
        error_message="Test error",
        error_type="VALIDATION",
        parameters={"test": True},
        context_summary="Testing error preservation"
    )
    print(f"Error preserved: {result}")
