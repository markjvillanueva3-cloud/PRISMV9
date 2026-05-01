#!/usr/bin/env python3
"""
CONTEXT_PRESSURE.py - Context Window Pressure Monitoring
Monitors context window usage and triggers handoff when needed.

Pressure Levels:
- GREEN (0-60%): Normal operation
- YELLOW (60-75%): Plan for handoff
- ORANGE (75-85%): Prepare handoff
- RED (85-92%): Immediate checkpoint
- CRITICAL (>92%): Emergency handoff

Usage:
    python context_pressure.py check                # Check current pressure
    python context_pressure.py monitor              # Continuous monitoring
    python context_pressure.py recommend            # Get recommendations
    python context_pressure.py simulate --tokens N  # Simulate pressure

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
PRESSURE_LOG_FILE = STATE_DIR / "context_pressure_log.json"

# Context window limits (approximate)
CONTEXT_LIMITS = {
    "claude-3-opus": 200000,
    "claude-3-sonnet": 200000,
    "claude-3-haiku": 200000,
    "claude-3.5-sonnet": 200000,
    "claude-4": 200000,
    "default": 200000
}


class PressureLevel(Enum):
    """Context pressure levels with thresholds."""
    GREEN = "GREEN"         # 0-60% - Normal
    YELLOW = "YELLOW"       # 60-75% - Plan
    ORANGE = "ORANGE"       # 75-85% - Prepare
    RED = "RED"             # 85-92% - Checkpoint
    CRITICAL = "CRITICAL"   # >92% - Emergency


@dataclass
class PressureThresholds:
    """Pressure level thresholds."""
    green_max: float = 0.60
    yellow_max: float = 0.75
    orange_max: float = 0.85
    red_max: float = 0.92
    # Above red_max is CRITICAL


@dataclass
class PressureReading:
    """A single pressure reading."""
    timestamp: str
    tokens_used: int
    tokens_available: int
    percentage: float
    level: PressureLevel
    recommendation: str
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d["level"] = self.level.value
        return d


@dataclass
class PressureActions:
    """Recommended actions for each pressure level."""
    GREEN = [
        "Continue normal operation",
        "No immediate action needed"
    ]
    YELLOW = [
        "Start planning checkpoint",
        "Identify work that can be completed quickly",
        "Consider which skills to defer loading"
    ]
    ORANGE = [
        "Create checkpoint NOW",
        "Save all work in progress",
        "Prepare handoff document",
        "Stop loading new skills"
    ]
    RED = [
        "IMMEDIATE checkpoint required",
        "Save WIP state",
        "Generate handoff summary",
        "Do NOT start new tasks"
    ]
    CRITICAL = [
        "EMERGENCY: Stop all work",
        "Save minimal handoff info",
        "Create emergency checkpoint",
        "End session immediately"
    ]


class ContextPressureMonitor:
    """
    Monitors context window pressure and provides recommendations.
    
    The monitor estimates token usage based on conversation length
    and loaded content, then recommends actions based on pressure level.
    """
    
    def __init__(self, model: str = "default"):
        self.model = model
        self.context_limit = CONTEXT_LIMITS.get(model, CONTEXT_LIMITS["default"])
        self.thresholds = PressureThresholds()
        self.readings: List[PressureReading] = []
        self._load_history()
    
    def _load_history(self):
        """Load pressure reading history."""
        if PRESSURE_LOG_FILE.exists():
            try:
                with open(PRESSURE_LOG_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for r in data.get("readings", [])[-100:]:  # Keep last 100
                        r["level"] = PressureLevel(r["level"])
                        self.readings.append(PressureReading(**r))
            except (json.JSONDecodeError, KeyError):
                pass
    
    def _save_history(self):
        """Save pressure reading history."""
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        with open(PRESSURE_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "last_updated": datetime.now().isoformat(),
                "readings": [r.to_dict() for r in self.readings[-100:]]
            }, f, indent=2)
    
    def _get_level(self, percentage: float) -> PressureLevel:
        """Determine pressure level from percentage."""
        if percentage <= self.thresholds.green_max:
            return PressureLevel.GREEN
        elif percentage <= self.thresholds.yellow_max:
            return PressureLevel.YELLOW
        elif percentage <= self.thresholds.orange_max:
            return PressureLevel.ORANGE
        elif percentage <= self.thresholds.red_max:
            return PressureLevel.RED
        else:
            return PressureLevel.CRITICAL
    
    def _get_recommendation(self, level: PressureLevel) -> str:
        """Get primary recommendation for level."""
        actions = getattr(PressureActions, level.value)
        return actions[0]
    
    def check(self, tokens_used: int) -> PressureReading:
        """
        Check current pressure level.
        
        Args:
            tokens_used: Estimated tokens used in context
            
        Returns:
            PressureReading with current status
        """
        tokens_available = self.context_limit - tokens_used
        percentage = tokens_used / self.context_limit
        level = self._get_level(percentage)
        recommendation = self._get_recommendation(level)
        
        reading = PressureReading(
            timestamp=datetime.now().isoformat(),
            tokens_used=tokens_used,
            tokens_available=tokens_available,
            percentage=round(percentage * 100, 1),
            level=level,
            recommendation=recommendation
        )
        
        self.readings.append(reading)
        self._save_history()
        
        return reading
    
    def estimate_tokens(self, text: str = None, file_paths: List[str] = None,
                        message_count: int = 0) -> int:
        """
        Estimate token usage from various sources.
        
        Rough estimates:
        - 1 token ≈ 4 characters (English)
        - System prompt ≈ 5000 tokens
        - Each message ≈ 500 tokens average
        """
        tokens = 5000  # Base system prompt estimate
        
        # Add text tokens
        if text:
            tokens += len(text) // 4
        
        # Add file tokens
        if file_paths:
            for path in file_paths:
                try:
                    p = Path(path)
                    if p.exists():
                        size = p.stat().st_size
                        tokens += size // 4  # Rough char to token
                except (OSError, IOError):
                    tokens += 1000  # Default estimate
        
        # Add message tokens
        tokens += message_count * 500
        
        return tokens
    
    def get_recommendations(self, level: PressureLevel = None) -> List[str]:
        """Get all recommendations for a pressure level."""
        if level is None:
            if self.readings:
                level = self.readings[-1].level
            else:
                level = PressureLevel.GREEN
        
        return getattr(PressureActions, level.value)
    
    def get_buffer_zone(self, tokens_used: int) -> Dict:
        """
        Get buffer zone information.
        
        Returns tokens remaining until each threshold.
        """
        return {
            "tokens_used": tokens_used,
            "context_limit": self.context_limit,
            "until_yellow": int(self.context_limit * self.thresholds.green_max - tokens_used),
            "until_orange": int(self.context_limit * self.thresholds.yellow_max - tokens_used),
            "until_red": int(self.context_limit * self.thresholds.orange_max - tokens_used),
            "until_critical": int(self.context_limit * self.thresholds.red_max - tokens_used)
        }
    
    def should_checkpoint(self, tokens_used: int) -> Tuple[bool, str]:
        """
        Determine if checkpoint is needed.
        
        Returns:
            (should_checkpoint, reason)
        """
        reading = self.check(tokens_used)
        
        if reading.level == PressureLevel.CRITICAL:
            return True, "CRITICAL: Emergency checkpoint required"
        elif reading.level == PressureLevel.RED:
            return True, "RED: Immediate checkpoint needed"
        elif reading.level == PressureLevel.ORANGE:
            return True, "ORANGE: Checkpoint recommended"
        
        return False, f"Pressure is {reading.level.value}"
    
    def should_handoff(self, tokens_used: int) -> Tuple[bool, str]:
        """
        Determine if session handoff is needed.
        
        Returns:
            (should_handoff, reason)
        """
        reading = self.check(tokens_used)
        
        if reading.level == PressureLevel.CRITICAL:
            return True, "CRITICAL: Immediate handoff required"
        elif reading.level == PressureLevel.RED:
            return True, "RED: Handoff strongly recommended"
        
        return False, f"Pressure is {reading.level.value}"
    
    def get_trend(self) -> Dict:
        """Analyze pressure trend from history."""
        if len(self.readings) < 2:
            return {"trend": "UNKNOWN", "readings": len(self.readings)}
        
        recent = self.readings[-5:]
        percentages = [r.percentage for r in recent]
        
        if len(percentages) >= 2:
            delta = percentages[-1] - percentages[0]
            if delta > 5:
                trend = "INCREASING"
            elif delta < -5:
                trend = "DECREASING"
            else:
                trend = "STABLE"
        else:
            trend = "UNKNOWN"
        
        return {
            "trend": trend,
            "current": percentages[-1] if percentages else 0,
            "readings": len(self.readings),
            "recent_percentages": percentages
        }
    
    def format_status(self, reading: PressureReading) -> str:
        """Format reading as status string."""
        level_emoji = {
            PressureLevel.GREEN: "🟢",
            PressureLevel.YELLOW: "🟡",
            PressureLevel.ORANGE: "🟠",
            PressureLevel.RED: "🔴",
            PressureLevel.CRITICAL: "⚫"
        }
        
        emoji = level_emoji.get(reading.level, "⚪")
        return f"{emoji} {reading.level.value} ({reading.percentage:.1f}%) - {reading.recommendation}"


def main():
    parser = argparse.ArgumentParser(description="PRISM Context Pressure Monitor")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Check command
    check_parser = subparsers.add_parser("check", help="Check current pressure")
    check_parser.add_argument("--tokens", type=int, required=True, help="Tokens used")
    check_parser.add_argument("--json", action="store_true")
    
    # Estimate command
    estimate_parser = subparsers.add_parser("estimate", help="Estimate token usage")
    estimate_parser.add_argument("--text", help="Text to estimate")
    estimate_parser.add_argument("--files", nargs="+", help="Files to estimate")
    estimate_parser.add_argument("--messages", type=int, default=0, help="Message count")
    estimate_parser.add_argument("--json", action="store_true")
    
    # Recommend command
    recommend_parser = subparsers.add_parser("recommend", help="Get recommendations")
    recommend_parser.add_argument("--level", choices=[l.value for l in PressureLevel])
    recommend_parser.add_argument("--json", action="store_true")
    
    # Buffer command
    buffer_parser = subparsers.add_parser("buffer", help="Get buffer zones")
    buffer_parser.add_argument("--tokens", type=int, required=True, help="Tokens used")
    buffer_parser.add_argument("--json", action="store_true")
    
    # Trend command
    trend_parser = subparsers.add_parser("trend", help="Analyze pressure trend")
    trend_parser.add_argument("--json", action="store_true")
    
    # Simulate command
    simulate_parser = subparsers.add_parser("simulate", help="Simulate pressure")
    simulate_parser.add_argument("--tokens", type=int, required=True)
    simulate_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    monitor = ContextPressureMonitor()
    
    if args.command == "check":
        reading = monitor.check(args.tokens)
        if args.json:
            print(json.dumps(reading.to_dict(), indent=2))
        else:
            print(monitor.format_status(reading))
            print(f"  Tokens: {reading.tokens_used:,} / {monitor.context_limit:,}")
            print(f"  Available: {reading.tokens_available:,}")
    
    elif args.command == "estimate":
        tokens = monitor.estimate_tokens(args.text, args.files, args.messages)
        reading = monitor.check(tokens)
        if args.json:
            print(json.dumps({
                "estimated_tokens": tokens,
                "reading": reading.to_dict()
            }, indent=2))
        else:
            print(f"Estimated tokens: {tokens:,}")
            print(monitor.format_status(reading))
    
    elif args.command == "recommend":
        level = PressureLevel(args.level) if args.level else None
        recommendations = monitor.get_recommendations(level)
        if args.json:
            print(json.dumps({"level": level.value if level else "current", "recommendations": recommendations}, indent=2))
        else:
            level_name = level.value if level else "current"
            print(f"Recommendations for {level_name}:")
            for r in recommendations:
                print(f"  • {r}")
    
    elif args.command == "buffer":
        buffers = monitor.get_buffer_zone(args.tokens)
        if args.json:
            print(json.dumps(buffers, indent=2))
        else:
            print(f"Buffer Zones (at {args.tokens:,} tokens):")
            print(f"  Until YELLOW: {buffers['until_yellow']:,} tokens")
            print(f"  Until ORANGE: {buffers['until_orange']:,} tokens")
            print(f"  Until RED: {buffers['until_red']:,} tokens")
            print(f"  Until CRITICAL: {buffers['until_critical']:,} tokens")
    
    elif args.command == "trend":
        trend = monitor.get_trend()
        if args.json:
            print(json.dumps(trend, indent=2))
        else:
            print(f"Pressure Trend: {trend['trend']}")
            print(f"  Current: {trend['current']:.1f}%")
            print(f"  Readings: {trend['readings']}")
    
    elif args.command == "simulate":
        reading = monitor.check(args.tokens)
        should_cp, cp_reason = monitor.should_checkpoint(args.tokens)
        should_ho, ho_reason = monitor.should_handoff(args.tokens)
        
        if args.json:
            print(json.dumps({
                "reading": reading.to_dict(),
                "should_checkpoint": should_cp,
                "checkpoint_reason": cp_reason,
                "should_handoff": should_ho,
                "handoff_reason": ho_reason
            }, indent=2))
        else:
            print(monitor.format_status(reading))
            print(f"  Checkpoint needed: {should_cp} - {cp_reason}")
            print(f"  Handoff needed: {should_ho} - {ho_reason}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
