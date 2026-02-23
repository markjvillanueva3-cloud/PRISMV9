#!/usr/bin/env python3
"""
PRISM Pattern Variation Engine v1.0
Implements Manus Law 6: Don't Get Few-Shotted

Applies structured randomness to prevent pattern mimicry.
"""
import sys

# Only set encoding for direct execution
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
import random
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

VARIATION_CONFIG = Path("C:/PRISM/config/variation_config.json")
VARIATION_LOG = Path("C:/PRISM/state/variation_log.jsonl")


# Template variations
VARIATION_TEMPLATES = {
    "task_description": [
        "Extract {item} from {source}",
        "Pull {item} data from {source}",
        "Get {item} properties from {source}",
        "Retrieve {item} details from {source}",
        "Obtain {item} information from {source}"
    ],
    "checkpoint_message": [
        "Completed {n} of {total}",
        "Progress: {n}/{total}",
        "Done with {n}, {remaining} left",
        "{n} finished, continuing to {next}",
        "Milestone: {n}/{total} complete"
    ],
    "status_update": [
        "Working on {task}",
        "Currently processing {task}",
        "In progress: {task}",
        "Executing {task}",
        "Active task: {task}"
    ],
    "completion_message": [
        "Task complete",
        "Finished successfully",
        "All items processed",
        "Work completed",
        "Task accomplished"
    ],
    "error_prefix": [
        "Error encountered:",
        "Issue detected:",
        "Problem found:",
        "Failure occurred:",
        "Exception caught:"
    ]
}

# Serialization variants for JSON
SERIALIZATION_VARIANTS = {
    "indent": [2, 4, None],
    "separators": [
        (", ", ": "),
        (",", ": "),
        (", ", ":")
    ]
}


class PatternVariationEngine:
    """Applies structured randomness to prevent mimicry."""
    
    def __init__(self):
        self.usage_history: Dict[str, List[int]] = defaultdict(list)
        self.action_log: List[Dict] = []
        self._load_config()
    
    def _load_config(self):
        """Load variation configuration."""
        if VARIATION_CONFIG.exists():
            with open(VARIATION_CONFIG, 'r', encoding='utf-8') as f:
                config = json.load(f)
                self.templates = config.get("templates", VARIATION_TEMPLATES)
                self.serialization = config.get("serialization", SERIALIZATION_VARIANTS)
        else:
            self.templates = VARIATION_TEMPLATES
            self.serialization = SERIALIZATION_VARIANTS
    
    # ─────────────────────────────────────────────────────────────
    # CTX-VAR-001: Vary Serialization Templates
    # ─────────────────────────────────────────────────────────────
    
    def vary_output(self, template_type: str, **kwargs) -> str:
        """Apply structured randomness to output text."""
        if template_type not in self.templates:
            return str(kwargs)
        
        templates = self.templates[template_type]
        
        # Avoid recently used templates
        recent = self.usage_history.get(template_type, [])[-3:]
        available = [i for i in range(len(templates)) if i not in recent]
        
        if not available:
            available = list(range(len(templates)))
        
        idx = random.choice(available)
        self.usage_history[template_type].append(idx)
        
        # Keep history bounded
        if len(self.usage_history[template_type]) > 20:
            self.usage_history[template_type] = self.usage_history[template_type][-10:]
        
        template = templates[idx]
        
        # Handle missing kwargs gracefully
        try:
            result = template.format(**kwargs)
        except KeyError:
            result = template
        
        self._log_variation(template_type, idx, result)
        return result
    
    # ─────────────────────────────────────────────────────────────
    # CTX-VAR-002: Randomize Non-Critical Ordering
    # ─────────────────────────────────────────────────────────────
    
    def vary_list_order(self, items: List, preserve_first: int = 0, 
                        preserve_last: int = 0) -> List:
        """Randomize list order while preserving critical positions."""
        if len(items) <= preserve_first + preserve_last:
            return items
        
        # Split into preserved and shufflable
        first = items[:preserve_first] if preserve_first else []
        last = items[-preserve_last:] if preserve_last else []
        middle = items[preserve_first:len(items)-preserve_last if preserve_last else len(items)]
        
        # Shuffle middle
        random.shuffle(middle)
        
        return first + middle + last
    
    def vary_json_serialization(self, data: Dict) -> str:
        """Vary JSON serialization format."""
        indent = random.choice(self.serialization["indent"])
        separators = random.choice(self.serialization["separators"])
        
        return json.dumps(data, indent=indent, separators=separators, sort_keys=True)
    
    # ─────────────────────────────────────────────────────────────
    # CTX-VAR-003: Detect Pattern Mimicry
    # ─────────────────────────────────────────────────────────────
    
    def detect_mimicry(self, recent_actions: List[str], window: int = 10) -> Dict:
        """Detect if actions are showing pattern mimicry."""
        if len(recent_actions) < window:
            return {"mimicry_detected": False, "diversity_index": 1.0}
        
        recent = recent_actions[-window:]
        
        # Compute action diversity
        unique_actions = len(set(recent))
        diversity = unique_actions / len(recent)
        
        # Check for exact repeats
        repeat_count = 0
        for i in range(1, len(recent)):
            if recent[i] == recent[i-1]:
                repeat_count += 1
        
        repeat_rate = repeat_count / (len(recent) - 1)
        
        # Check for periodic patterns
        periodic = self._detect_periodic_pattern(recent)
        
        mimicry_detected = diversity < 0.5 or repeat_rate > 0.3 or periodic
        
        return {
            "mimicry_detected": mimicry_detected,
            "diversity_index": diversity,
            "repeat_rate": repeat_rate,
            "periodic_pattern": periodic,
            "recommendation": "Vary actions more" if mimicry_detected else "OK"
        }
    
    def _detect_periodic_pattern(self, actions: List[str], max_period: int = 5) -> bool:
        """Detect periodic repetition (e.g., A-B-A-B-A-B)."""
        for period in range(2, max_period + 1):
            if len(actions) < period * 2:
                continue
            
            is_periodic = True
            for i in range(period, len(actions)):
                if actions[i] != actions[i % period]:
                    is_periodic = False
                    break
            
            if is_periodic:
                return True
        
        return False
    
    def compute_diversity_index(self, actions: List[str]) -> float:
        """Compute action diversity index."""
        if not actions:
            return 1.0
        
        # Jaccard-based diversity
        unique = len(set(actions))
        total = len(actions)
        
        # Penalize repeats
        repeats = total - unique
        penalty = repeats / max(total, 1)
        
        return (unique / total) * (1 - penalty * 0.5)
    
    # ─────────────────────────────────────────────────────────────
    # Logging
    # ─────────────────────────────────────────────────────────────
    
    def _log_variation(self, template_type: str, template_idx: int, result: str):
        """Log variation usage."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "template_type": template_type,
            "template_idx": template_idx,
            "result_hash": hashlib.md5(result.encode()).hexdigest()[:8]
        }
        self.action_log.append(entry)
        
        # Persist
        with open(VARIATION_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def log_action(self, action: str):
        """Log an action for mimicry detection."""
        self.action_log.append({
            "timestamp": datetime.now().isoformat(),
            "action": action
        })
    
    def get_recent_actions(self, n: int = 20) -> List[str]:
        """Get recent actions for analysis."""
        return [a.get("action", a.get("template_type", "unknown")) 
                for a in self.action_log[-n:]]
    
    # ─────────────────────────────────────────────────────────────
    # Status
    # ─────────────────────────────────────────────────────────────
    
    def status(self) -> Dict:
        """Get engine status."""
        recent = self.get_recent_actions()
        mimicry = self.detect_mimicry(recent)
        
        return {
            "total_variations": len(self.action_log),
            "template_types": list(self.templates.keys()),
            "diversity_index": mimicry["diversity_index"],
            "mimicry_detected": mimicry["mimicry_detected"],
            "usage_distribution": {k: len(v) for k, v in self.usage_history.items()}
        }


# ─────────────────────────────────────────────────────────────────
# Integration Functions
# ─────────────────────────────────────────────────────────────────

def vary_checkpoint_message(n: int, total: int, next_item: str = None) -> str:
    """Generate varied checkpoint message."""
    pve = PatternVariationEngine()
    return pve.vary_output("checkpoint_message", 
                          n=n, total=total, 
                          remaining=total-n,
                          next=next_item or f"item {n+1}")


def vary_task_description(item: str, source: str) -> str:
    """Generate varied task description."""
    pve = PatternVariationEngine()
    return pve.vary_output("task_description", item=item, source=source)


def check_action_diversity(actions: List[str]) -> Dict:
    """Check action diversity and warn if mimicry detected."""
    pve = PatternVariationEngine()
    return pve.detect_mimicry(actions)


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Pattern Variation Engine")
    parser.add_argument("command", choices=["status", "vary", "check", "demo"])
    parser.add_argument("--type", help="Template type")
    parser.add_argument("--actions", nargs="*", help="Actions to check")
    
    args = parser.parse_args()
    pve = PatternVariationEngine()
    
    if args.command == "status":
        print(json.dumps(pve.status(), indent=2))
    
    elif args.command == "vary":
        if not args.type:
            print("Error: --type required")
            return
        # Demo variation
        for i in range(5):
            result = pve.vary_output(args.type, n=i+1, total=10, 
                                    item="materials", source="database",
                                    task="extraction", remaining=10-i-1,
                                    next=f"item {i+2}")
            print(f"  {i+1}. {result}")
    
    elif args.command == "check":
        actions = args.actions or ["read", "write", "read", "write", "read", "write"]
        result = pve.detect_mimicry(actions)
        print(json.dumps(result, indent=2))
    
    elif args.command == "demo":
        print("Pattern Variation Demo:")
        print("\nTask descriptions:")
        for i in range(5):
            print(f"  {vary_task_description('aluminum', 'material DB')}")
        print("\nCheckpoint messages:")
        for i in range(5):
            print(f"  {vary_checkpoint_message(i+1, 10, f'step {i+2}')}")
        print("\nMimicry detection:")
        bad_actions = ["read", "write", "read", "write", "read", "write", "read", "write"]
        print(f"  Actions: {bad_actions}")
        print(f"  Result: {check_action_diversity(bad_actions)}")


if __name__ == "__main__":
    main()
