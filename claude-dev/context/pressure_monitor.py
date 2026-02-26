"""
PRISM Context Pressure Monitor
Real-time tracking of context window usage with auto-actions at thresholds.

Author: PRISM Claude Development Enhancement
Version: 1.0.0
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class PressureZone(Enum):
    """Context pressure zones with emoji indicators"""
    GREEN = ("🟢", 0.0, 0.60, "Normal")
    YELLOW = ("🟡", 0.60, 0.75, "Batch")
    ORANGE = ("🟠", 0.75, 0.85, "Checkpoint")
    RED = ("🔴", 0.85, 0.92, "Handoff")
    CRITICAL = ("⚫", 0.92, 1.0, "STOP")
    
    def __init__(self, emoji: str, low: float, high: float, action: str):
        self.emoji = emoji
        self.low = low
        self.high = high
        self.action = action


@dataclass
class PressureSnapshot:
    """Snapshot of context pressure at a point in time"""
    timestamp: str
    tokens_used: int
    tokens_max: int
    percentage: float
    zone: PressureZone
    tool_calls: int
    recommendations: List[str]


@dataclass
class PressureAlert:
    """Alert triggered by zone transition"""
    from_zone: PressureZone
    to_zone: PressureZone
    timestamp: str
    message: str
    action_required: bool


class ContextPressureMonitor:
    """
    Monitors context window pressure and triggers actions at thresholds.
    
    Features:
    - Real-time zone detection (GREEN/YELLOW/ORANGE/RED/CRITICAL)
    - Auto-checkpoint triggers at 75%
    - Handoff preparation at 85%
    - Emergency stop at 92%
    - History tracking for trend analysis
    """
    
    DEFAULT_MAX_TOKENS = 200000
    CHECKPOINT_INTERVAL = 5  # Tool calls between checkpoints in ORANGE
    
    def __init__(self, max_tokens: int = DEFAULT_MAX_TOKENS, 
                 state_path: str = "C:\\PRISM\\state"):
        self.max_tokens = max_tokens
        self.state_path = Path(state_path)
        self.state_path.mkdir(parents=True, exist_ok=True)
        
        self.current_zone = PressureZone.GREEN
        self.tool_calls_since_checkpoint = 0
        self.history: List[PressureSnapshot] = []
        self.alerts: List[PressureAlert] = []
        
        # Action callbacks
        self.callbacks: Dict[PressureZone, List[Callable]] = {
            zone: [] for zone in PressureZone
        }
    
    def get_zone(self, percentage: float) -> PressureZone:
        """Determine zone from percentage"""
        for zone in PressureZone:
            if zone.low <= percentage < zone.high:
                return zone
        return PressureZone.CRITICAL
    
    def check(self, tokens_used: int, tool_call_count: int = 0) -> Dict:
        """
        Check current pressure and return status with recommendations.
        This is the main method to call after each operation.
        """
        percentage = tokens_used / self.max_tokens
        new_zone = self.get_zone(percentage)
        
        # Track tool calls
        if tool_call_count > 0:
            self.tool_calls_since_checkpoint = tool_call_count
        
        # Check for zone transition
        zone_changed = new_zone != self.current_zone
        if zone_changed:
            alert = PressureAlert(
                from_zone=self.current_zone,
                to_zone=new_zone,
                timestamp=datetime.now().isoformat(),
                message=f"Zone changed: {self.current_zone.emoji} → {new_zone.emoji}",
                action_required=new_zone.low >= 0.75
            )
            self.alerts.append(alert)
            self._trigger_callbacks(new_zone)
        
        self.current_zone = new_zone
        
        # Generate recommendations
        recommendations = self._get_recommendations(new_zone, percentage)
        
        # Create snapshot
        snapshot = PressureSnapshot(
            timestamp=datetime.now().isoformat(),
            tokens_used=tokens_used,
            tokens_max=self.max_tokens,
            percentage=percentage,
            zone=new_zone,
            tool_calls=self.tool_calls_since_checkpoint,
            recommendations=recommendations
        )
        self.history.append(snapshot)
        
        # Auto-actions
        auto_actions = self._get_auto_actions(new_zone)
        
        return {
            "zone": new_zone.name,
            "emoji": new_zone.emoji,
            "percentage": round(percentage * 100, 1),
            "tokens_used": tokens_used,
            "tokens_remaining": self.max_tokens - tokens_used,
            "action_required": new_zone.action,
            "recommendations": recommendations,
            "auto_actions": auto_actions,
            "zone_changed": zone_changed,
            "checkpoint_due": self._is_checkpoint_due(new_zone)
        }
    
    def _get_recommendations(self, zone: PressureZone, percentage: float) -> List[str]:
        """Get action recommendations for current zone"""
        recs = {
            PressureZone.GREEN: [
                "✅ Normal operation - continue working"
            ],
            PressureZone.YELLOW: [
                "📦 Consider batching similar operations",
                "📝 Start preparing checkpoint data",
                f"📊 {int((0.75 - percentage) * self.max_tokens)} tokens until ORANGE"
            ],
            PressureZone.ORANGE: [
                "🔴 CREATE CHECKPOINT NOW",
                "💾 Externalize non-essential context via memory_externalize",
                "📋 Prepare handoff summary",
                f"⚠️ {self.CHECKPOINT_INTERVAL - self.tool_calls_since_checkpoint} calls until auto-checkpoint"
            ],
            PressureZone.RED: [
                "🚨 URGENT: Begin handoff procedure",
                "💾 Externalize ALL possible data",
                "✋ Complete current task and STOP",
                "📤 Run prism_session_end_full"
            ],
            PressureZone.CRITICAL: [
                "⛔ STOP ALL NEW OPERATIONS",
                "🆘 Execute IMMEDIATE handoff",
                "💾 Save state NOW",
                "🔚 End session IMMEDIATELY"
            ]
        }
        return recs.get(zone, ["Unknown zone"])
    
    def _get_auto_actions(self, zone: PressureZone) -> List[Dict]:
        """Get auto-actions that should be triggered"""
        actions = []
        
        if zone in [PressureZone.ORANGE, PressureZone.RED, PressureZone.CRITICAL]:
            if self._is_checkpoint_due(zone):
                actions.append({
                    "action": "create_checkpoint",
                    "tool": "prism:prism_state_checkpoint",
                    "priority": "HIGH"
                })
        
        if zone == PressureZone.RED:
            actions.append({
                "action": "prepare_handoff",
                "tool": "prism:prism_handoff_prepare",
                "priority": "URGENT"
            })
        
        if zone == PressureZone.CRITICAL:
            actions.append({
                "action": "emergency_save",
                "tool": "prism:prism_state_save",
                "priority": "CRITICAL"
            })
            actions.append({
                "action": "end_session",
                "tool": "prism:prism_session_end_full",
                "priority": "CRITICAL"
            })
        
        return actions
    
    def _is_checkpoint_due(self, zone: PressureZone) -> bool:
        """Check if checkpoint is due based on tool calls"""
        if zone == PressureZone.GREEN:
            return False
        if zone == PressureZone.YELLOW:
            return self.tool_calls_since_checkpoint >= 10
        if zone == PressureZone.ORANGE:
            return self.tool_calls_since_checkpoint >= self.CHECKPOINT_INTERVAL
        return True  # RED and CRITICAL always need checkpoint
    
    def _trigger_callbacks(self, zone: PressureZone):
        """Trigger registered callbacks for zone"""
        for callback in self.callbacks.get(zone, []):
            try:
                callback(zone)
            except Exception as e:
                print(f"Callback error: {e}")
    
    def register_callback(self, zone: PressureZone, callback: Callable):
        """Register a callback for zone transitions"""
        self.callbacks[zone].append(callback)
    
    def reset_checkpoint_counter(self):
        """Reset checkpoint counter (call after creating checkpoint)"""
        self.tool_calls_since_checkpoint = 0
    
    def increment_tool_calls(self, count: int = 1):
        """Increment tool call counter"""
        self.tool_calls_since_checkpoint += count
    
    def get_trend(self, last_n: int = 10) -> Dict:
        """Analyze pressure trend from history"""
        if len(self.history) < 2:
            return {"trend": "unknown", "direction": 0}
        
        recent = self.history[-last_n:]
        percentages = [s.percentage for s in recent]
        
        if len(percentages) < 2:
            return {"trend": "stable", "direction": 0}
        
        # Calculate trend
        avg_change = (percentages[-1] - percentages[0]) / len(percentages)
        
        if avg_change > 0.02:
            trend = "increasing_fast"
        elif avg_change > 0.005:
            trend = "increasing"
        elif avg_change < -0.02:
            trend = "decreasing_fast"
        elif avg_change < -0.005:
            trend = "decreasing"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "direction": avg_change,
            "samples": len(recent),
            "start_pct": round(percentages[0] * 100, 1),
            "end_pct": round(percentages[-1] * 100, 1)
        }
    
    def estimate_remaining_capacity(self, avg_tokens_per_call: int = 500) -> Dict:
        """Estimate remaining capacity based on average usage"""
        if not self.history:
            remaining_tokens = self.max_tokens
        else:
            remaining_tokens = self.max_tokens - self.history[-1].tokens_used
        
        estimated_calls = remaining_tokens // avg_tokens_per_call
        
        # Adjust for safety buffer (stop at 85%)
        safe_remaining = int(estimated_calls * 0.85)
        
        return {
            "tokens_remaining": remaining_tokens,
            "estimated_calls_total": estimated_calls,
            "safe_calls_remaining": safe_remaining,
            "avg_tokens_per_call": avg_tokens_per_call,
            "buffer_recommendation": f"Plan for {safe_remaining} more tool calls max"
        }
    
    def get_status_bar(self, tokens_used: int, width: int = 40) -> str:
        """Generate a visual status bar"""
        percentage = tokens_used / self.max_tokens
        filled = int(percentage * width)
        empty = width - filled
        zone = self.get_zone(percentage)
        
        bar = "█" * filled + "░" * empty
        return f"{zone.emoji} [{bar}] {percentage*100:.1f}% ({zone.name})"
    
    def save_state(self) -> Dict:
        """Save monitor state to file"""
        state = {
            "current_zone": self.current_zone.name,
            "tool_calls_since_checkpoint": self.tool_calls_since_checkpoint,
            "history_count": len(self.history),
            "alerts_count": len(self.alerts),
            "last_check": self.history[-1].timestamp if self.history else None,
            "saved_at": datetime.now().isoformat()
        }
        
        filepath = self.state_path / "pressure_monitor_state.json"
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
        
        return {"saved": True, "path": str(filepath)}
    
    def get_summary(self) -> Dict:
        """Get summary of pressure monitor state"""
        return {
            "current_zone": self.current_zone.name,
            "current_emoji": self.current_zone.emoji,
            "tool_calls_since_checkpoint": self.tool_calls_since_checkpoint,
            "history_entries": len(self.history),
            "alerts_triggered": len(self.alerts),
            "trend": self.get_trend(),
            "callbacks_registered": {
                zone.name: len(cbs) for zone, cbs in self.callbacks.items() if cbs
            }
        }


# Singleton instance
_monitor: Optional[ContextPressureMonitor] = None

def get_monitor(max_tokens: int = 200000) -> ContextPressureMonitor:
    """Get or create the pressure monitor singleton"""
    global _monitor
    if _monitor is None:
        _monitor = ContextPressureMonitor(max_tokens=max_tokens)
    return _monitor


def check_pressure(tokens_used: int, tool_calls: int = 0) -> Dict:
    """Quick function to check pressure"""
    return get_monitor().check(tokens_used, tool_calls)


def status_bar(tokens_used: int) -> str:
    """Quick function to get status bar"""
    return get_monitor().get_status_bar(tokens_used)


if __name__ == "__main__":
    monitor = ContextPressureMonitor(max_tokens=200000)
    
    # Simulate increasing pressure
    print("=== Context Pressure Monitor Demo ===\n")
    
    test_tokens = [50000, 100000, 130000, 155000, 175000, 185000, 195000]
    
    for i, tokens in enumerate(test_tokens):
        result = monitor.check(tokens, tool_call_count=i * 3)
        print(monitor.get_status_bar(tokens))
        print(f"  Recommendations: {result['recommendations'][0]}")
        if result['zone_changed']:
            print(f"  ⚠️ ZONE CHANGED!")
        print()
    
    print("\n=== Trend Analysis ===")
    print(json.dumps(monitor.get_trend(), indent=2))
    
    print("\n=== Capacity Estimate ===")
    print(json.dumps(monitor.estimate_remaining_capacity(), indent=2))
