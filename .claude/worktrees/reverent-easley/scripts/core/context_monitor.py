#!/usr/bin/env python3
"""
PRISM Context Monitor v1.0
Session 1.2 Deliverable: Monitor context size and trigger compression.

Tracks context usage, alerts when nearing limits, and triggers auto-compression.
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
MONITOR_LOG = PRISM_ROOT / "state" / "CONTEXT_MONITOR.jsonl"

class ContextStatus(Enum):
    """Context usage status levels."""
    GREEN = "GREEN"      # 0-60% - Safe
    YELLOW = "YELLOW"    # 60-75% - Plan compression
    ORANGE = "ORANGE"    # 75-85% - Compress NOW
    RED = "RED"          # 85-92% - Critical, handoff soon
    CRITICAL = "CRITICAL"  # >92% - Emergency stop

@dataclass
class ContextSnapshot:
    """Snapshot of context state."""
    timestamp: str
    chars: int
    tokens_estimated: int
    usage_percent: float
    status: ContextStatus
    message_count: int
    tool_calls: int
    compression_active: bool
    last_checkpoint: str

class ContextMonitor:
    """Monitor context usage and trigger compression."""
    
    # Token estimation
    CHARS_PER_TOKEN = 4
    MAX_TOKENS = 200000
    
    # Thresholds (matching memory slot #5)
    THRESHOLDS = {
        ContextStatus.GREEN: 0.60,
        ContextStatus.YELLOW: 0.75,
        ContextStatus.ORANGE: 0.85,
        ContextStatus.RED: 0.92,
        ContextStatus.CRITICAL: 1.0
    }
    
    def __init__(self):
        self._ensure_paths()
        self.history: List[ContextSnapshot] = []
        self.callbacks: Dict[ContextStatus, List[Callable]] = {
            status: [] for status in ContextStatus
        }
        self.current_status = ContextStatus.GREEN
        self.compression_active = False
        self.message_count = 0
        self.tool_calls = 0
        self.last_checkpoint = ""
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        MONITOR_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def register_callback(self, status: ContextStatus, callback: Callable):
        """Register callback for status transitions."""
        self.callbacks[status].append(callback)
    
    def check(self, content: str = None, tokens: int = None) -> Dict[str, Any]:
        """
        Check current context status.
        
        Args:
            content: Content to measure (optional)
            tokens: Direct token count (optional, uses estimate if not provided)
            
        Returns:
            Status dict with recommendations
        """
        # Calculate tokens
        if tokens is not None:
            current_tokens = tokens
            chars = tokens * self.CHARS_PER_TOKEN
        elif content is not None:
            chars = len(content)
            current_tokens = chars // self.CHARS_PER_TOKEN
        else:
            # Return last known state
            if self.history:
                last = self.history[-1]
                return {
                    "status": last.status.value,
                    "usage_percent": last.usage_percent,
                    "tokens": last.tokens_estimated,
                    "recommendation": self._get_recommendation(last.status)
                }
            return {"error": "No content or tokens provided"}
        
        # Calculate usage
        usage = current_tokens / self.MAX_TOKENS
        usage_percent = round(usage * 100, 1)
        
        # Determine status
        status = self._get_status(usage)
        
        # Check for status change
        if status != self.current_status:
            self._handle_status_change(self.current_status, status)
            self.current_status = status
        
        # Create snapshot
        snapshot = ContextSnapshot(
            timestamp=datetime.now().isoformat(),
            chars=chars,
            tokens_estimated=current_tokens,
            usage_percent=usage_percent,
            status=status,
            message_count=self.message_count,
            tool_calls=self.tool_calls,
            compression_active=self.compression_active,
            last_checkpoint=self.last_checkpoint
        )
        self.history.append(snapshot)
        self._log_snapshot(snapshot)
        
        return {
            "status": status.value,
            "usage_percent": usage_percent,
            "tokens": current_tokens,
            "max_tokens": self.MAX_TOKENS,
            "remaining_tokens": self.MAX_TOKENS - current_tokens,
            "chars": chars,
            "message_count": self.message_count,
            "tool_calls": self.tool_calls,
            "compression_active": self.compression_active,
            "recommendation": self._get_recommendation(status),
            "action_required": status in [ContextStatus.ORANGE, ContextStatus.RED, ContextStatus.CRITICAL]
        }
    
    def _get_status(self, usage: float) -> ContextStatus:
        """Determine status from usage ratio."""
        if usage < self.THRESHOLDS[ContextStatus.GREEN]:
            return ContextStatus.GREEN
        elif usage < self.THRESHOLDS[ContextStatus.YELLOW]:
            return ContextStatus.YELLOW
        elif usage < self.THRESHOLDS[ContextStatus.ORANGE]:
            return ContextStatus.ORANGE
        elif usage < self.THRESHOLDS[ContextStatus.RED]:
            return ContextStatus.RED
        else:
            return ContextStatus.CRITICAL
    
    def _get_recommendation(self, status: ContextStatus) -> str:
        """Get action recommendation for status."""
        recommendations = {
            ContextStatus.GREEN: "Continue normally. No action needed.",
            ContextStatus.YELLOW: "Plan compression. Consider checkpointing soon.",
            ContextStatus.ORANGE: "Compress NOW. Create checkpoint immediately.",
            ContextStatus.RED: "CRITICAL: Prepare handoff. Compress aggressively.",
            ContextStatus.CRITICAL: "EMERGENCY: Stop work. Execute handoff immediately."
        }
        return recommendations.get(status, "Unknown status")
    
    def _handle_status_change(self, old_status: ContextStatus, new_status: ContextStatus):
        """Handle status transition."""
        # Trigger callbacks for new status
        for callback in self.callbacks[new_status]:
            try:
                callback(old_status, new_status)
            except Exception as e:
                print(f"Callback error: {e}")
        
        # Log transition
        self._log_transition(old_status, new_status)
    
    def _log_snapshot(self, snapshot: ContextSnapshot):
        """Log snapshot to file."""
        try:
            with open(MONITOR_LOG, 'a', encoding='utf-8') as f:
                f.write(json.dumps(asdict(snapshot), default=str, sort_keys=True) + '\n')
        except:
            pass
    
    def _log_transition(self, old_status: ContextStatus, new_status: ContextStatus):
        """Log status transition."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event": "status_transition",
            "from": old_status.value,
            "to": new_status.value
        }
        try:
            with open(MONITOR_LOG, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry, sort_keys=True) + '\n')
        except:
            pass
    
    def increment_message(self):
        """Increment message counter."""
        self.message_count += 1
    
    def increment_tool_call(self):
        """Increment tool call counter."""
        self.tool_calls += 1
    
    def set_checkpoint(self, checkpoint_id: str):
        """Record checkpoint."""
        self.last_checkpoint = checkpoint_id
    
    def set_compression(self, active: bool):
        """Set compression state."""
        self.compression_active = active
    
    def get_trend(self, samples: int = 10) -> Dict[str, Any]:
        """Analyze recent usage trend."""
        if len(self.history) < 2:
            return {"trend": "INSUFFICIENT_DATA"}
        
        recent = self.history[-min(samples, len(self.history)):]
        
        # Calculate trend
        first_usage = recent[0].usage_percent
        last_usage = recent[-1].usage_percent
        change = last_usage - first_usage
        
        # Calculate rate of change
        if len(recent) > 1:
            time_span = (datetime.fromisoformat(recent[-1].timestamp) - 
                        datetime.fromisoformat(recent[0].timestamp)).total_seconds()
            rate = change / max(time_span / 60, 1)  # % per minute
        else:
            rate = 0
        
        # Predict when critical
        if rate > 0:
            remaining = 92 - last_usage  # Distance to RED
            minutes_to_critical = remaining / rate if rate > 0 else float('inf')
        else:
            minutes_to_critical = float('inf')
        
        trend_direction = "INCREASING" if change > 1 else ("DECREASING" if change < -1 else "STABLE")
        
        return {
            "trend": trend_direction,
            "change_percent": round(change, 1),
            "rate_per_minute": round(rate, 2),
            "minutes_to_critical": round(minutes_to_critical, 1) if minutes_to_critical < 1000 else "∞",
            "samples": len(recent),
            "first_usage": first_usage,
            "last_usage": last_usage
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get monitoring summary."""
        return {
            "current_status": self.current_status.value,
            "message_count": self.message_count,
            "tool_calls": self.tool_calls,
            "compression_active": self.compression_active,
            "last_checkpoint": self.last_checkpoint,
            "history_length": len(self.history),
            "trend": self.get_trend()
        }
    
    def should_compress(self) -> bool:
        """Check if compression should be triggered."""
        return self.current_status in [ContextStatus.ORANGE, ContextStatus.RED, ContextStatus.CRITICAL]
    
    def should_handoff(self) -> bool:
        """Check if handoff should be triggered."""
        return self.current_status in [ContextStatus.RED, ContextStatus.CRITICAL]
    
    def should_stop(self) -> bool:
        """Check if work should stop immediately."""
        return self.current_status == ContextStatus.CRITICAL


def main():
    """CLI for testing context monitor."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Context Monitor")
    parser.add_argument('--check', type=int, help='Check with token count')
    parser.add_argument('--file', type=str, help='Check file content')
    parser.add_argument('--trend', action='store_true', help='Show usage trend')
    parser.add_argument('--summary', action='store_true', help='Show summary')
    
    args = parser.parse_args()
    monitor = ContextMonitor()
    
    if args.check:
        result = monitor.check(tokens=args.check)
    elif args.file:
        content = Path(args.file).read_text(encoding='utf-8')
        result = monitor.check(content=content)
    elif args.trend:
        result = monitor.get_trend()
    elif args.summary:
        result = monitor.get_summary()
    else:
        # Demo with increasing token counts
        print("\n" + "="*60)
        print("CONTEXT MONITOR DEMO")
        print("="*60)
        
        for tokens in [50000, 100000, 130000, 160000, 180000, 190000]:
            result = monitor.check(tokens=tokens)
            status = result['status']
            usage = result['usage_percent']
            rec = result['recommendation']
            
            status_icon = {
                "GREEN": "🟢",
                "YELLOW": "🟡",
                "ORANGE": "🟠",
                "RED": "🔴",
                "CRITICAL": "⚫"
            }.get(status, "?")
            
            print(f"\n{status_icon} {tokens:,} tokens ({usage}%): {status}")
            print(f"   {rec}")
        
        print("\n" + "-"*60)
        print("TREND ANALYSIS")
        trend = monitor.get_trend()
        for key, value in trend.items():
            print(f"   {key}: {value}")
        
        return
    
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
