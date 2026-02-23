#!/usr/bin/env python3
"""
PRISM Error Preservation System v1.0
Implements Manus Law 5: Keep Wrong Stuff

Errors are preserved in context, patterns extracted, beliefs updated.
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
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

ERROR_LOG = Path("C:/PRISM/state/ERROR_LOG.jsonl")
PREVENTION_RULES = Path("C:/PRISM/state/PREVENTION_RULES.json")


class ErrorEntry:
    """Single error record."""
    
    def __init__(self, error_type: str, message: str, context: str,
                 tool: str = None, parameters: Dict = None):
        self.id = f"ERR-{datetime.now().strftime('%Y%m%d%H%M%S')}-{hashlib.md5(message.encode()).hexdigest()[:6]}"
        self.timestamp = datetime.now().isoformat()
        self.error_type = error_type
        self.message = message
        self.context = context
        self.tool = tool
        self.parameters = parameters or {}
        self.resolution = None
        self.prevention_rule = None
        self.pattern_id = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "error_type": self.error_type,
            "message": self.message,
            "context": self.context,
            "tool": self.tool,
            "parameters": self.parameters,
            "resolution": self.resolution,
            "prevention_rule": self.prevention_rule,
            "pattern_id": self.pattern_id
        }
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'ErrorEntry':
        entry = cls(d["error_type"], d["message"], d["context"],
                    d.get("tool"), d.get("parameters"))
        entry.id = d["id"]
        entry.timestamp = d["timestamp"]
        entry.resolution = d.get("resolution")
        entry.prevention_rule = d.get("prevention_rule")
        entry.pattern_id = d.get("pattern_id")
        return entry


class ErrorPattern:
    """Detected error pattern."""
    
    def __init__(self, pattern_id: str, error_type: str, signature: str):
        self.pattern_id = pattern_id
        self.error_type = error_type
        self.signature = signature  # Normalized error signature
        self.occurrences = 0
        self.last_seen = None
        self.prevention_rule = None
        self.confidence = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "pattern_id": self.pattern_id,
            "error_type": self.error_type,
            "signature": self.signature,
            "occurrences": self.occurrences,
            "last_seen": self.last_seen,
            "prevention_rule": self.prevention_rule,
            "confidence": self.confidence
        }


class ErrorPreservationSystem:
    """Manages error preservation, pattern detection, and learning."""
    
    def __init__(self):
        self.errors: List[ErrorEntry] = []
        self.patterns: Dict[str, ErrorPattern] = {}
        self.prevention_rules: Dict[str, str] = {}
        self._load()
    
    def _load(self):
        """Load existing errors and rules."""
        if ERROR_LOG.exists():
            with open(ERROR_LOG, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        self.errors.append(ErrorEntry.from_dict(json.loads(line)))
        
        if PREVENTION_RULES.exists():
            with open(PREVENTION_RULES, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.prevention_rules = data.get("rules", {})
                for p in data.get("patterns", []):
                    pattern = ErrorPattern(p["pattern_id"], p["error_type"], p["signature"])
                    pattern.occurrences = p["occurrences"]
                    pattern.last_seen = p["last_seen"]
                    pattern.prevention_rule = p["prevention_rule"]
                    pattern.confidence = p["confidence"]
                    self.patterns[pattern.pattern_id] = pattern
    
    def _save_error(self, entry: ErrorEntry):
        """Append error to log."""
        with open(ERROR_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry.to_dict(), sort_keys=True) + '\n')
    
    def _save_rules(self):
        """Save prevention rules and patterns."""
        data = {
            "rules": self.prevention_rules,
            "patterns": [p.to_dict() for p in self.patterns.values()],
            "updated": datetime.now().isoformat()
        }
        with open(PREVENTION_RULES, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, sort_keys=True)
    
    # ─────────────────────────────────────────────────────────────
    # CTX-ERR-001: Preserve Error
    # ─────────────────────────────────────────────────────────────
    
    def preserve_error(self, error_type: str, message: str, context: str,
                       tool: str = None, parameters: Dict = None) -> ErrorEntry:
        """Preserve an error in context (never delete)."""
        entry = ErrorEntry(error_type, message, context, tool, parameters)
        
        # Detect pattern
        pattern = self._detect_pattern(entry)
        if pattern:
            entry.pattern_id = pattern.pattern_id
            pattern.occurrences += 1
            pattern.last_seen = entry.timestamp
        
        self.errors.append(entry)
        self._save_error(entry)
        
        return entry
    
    # ─────────────────────────────────────────────────────────────
    # CTX-ERR-002: Log with Recovery Path
    # ─────────────────────────────────────────────────────────────
    
    def add_resolution(self, error_id: str, resolution: str, 
                       prevention_rule: str = None) -> bool:
        """Add resolution and prevention rule to an error."""
        for entry in self.errors:
            if entry.id == error_id:
                entry.resolution = resolution
                entry.prevention_rule = prevention_rule
                
                # Update pattern if exists
                if entry.pattern_id and entry.pattern_id in self.patterns:
                    pattern = self.patterns[entry.pattern_id]
                    if prevention_rule:
                        pattern.prevention_rule = prevention_rule
                        pattern.confidence = min(1.0, pattern.confidence + 0.1)
                
                self._save_rules()
                return True
        return False
    
    # ─────────────────────────────────────────────────────────────
    # CTX-ERR-003: Feed to BAYES-003
    # ─────────────────────────────────────────────────────────────
    
    def get_learning_data(self) -> Dict:
        """Extract learning data for Bayesian belief update."""
        error_counts = defaultdict(int)
        resolution_success = defaultdict(lambda: {"attempts": 0, "successes": 0})
        
        for entry in self.errors:
            error_counts[entry.error_type] += 1
            if entry.resolution:
                key = f"{entry.error_type}:{entry.resolution[:50]}"
                resolution_success[key]["attempts"] += 1
                # Assume resolution worked if no repeat within pattern
                if entry.pattern_id:
                    pattern = self.patterns.get(entry.pattern_id)
                    if pattern and pattern.occurrences == 1:
                        resolution_success[key]["successes"] += 1
        
        return {
            "error_frequencies": dict(error_counts),
            "resolution_effectiveness": dict(resolution_success),
            "patterns_detected": len(self.patterns),
            "prevention_rules_active": len(self.prevention_rules),
            "total_errors": len(self.errors)
        }
    
    def update_belief(self, error_type: str, outcome: str, success: bool):
        """Update belief about error resolution effectiveness (BAYES-003)."""
        key = f"belief:{error_type}:{outcome}"
        current = self.prevention_rules.get(key, {"prior": 0.5, "updates": 0})
        
        if isinstance(current, str):
            current = {"prior": 0.5, "updates": 0}
        
        # Bayesian update (simplified)
        prior = current.get("prior", 0.5)
        updates = current.get("updates", 0)
        
        # Weight recent observations more
        weight = 1.0 / (updates + 1)
        new_belief = prior * (1 - weight) + (1.0 if success else 0.0) * weight
        
        self.prevention_rules[key] = {
            "prior": new_belief,
            "updates": updates + 1,
            "last_update": datetime.now().isoformat()
        }
        self._save_rules()
    
    # ─────────────────────────────────────────────────────────────
    # Pattern Detection
    # ─────────────────────────────────────────────────────────────
    
    def _detect_pattern(self, entry: ErrorEntry) -> Optional[ErrorPattern]:
        """Detect if error matches existing pattern."""
        signature = self._compute_signature(entry)
        
        for pattern in self.patterns.values():
            if pattern.signature == signature:
                return pattern
        
        # Create new pattern if similar errors exist
        similar = [e for e in self.errors 
                   if e.error_type == entry.error_type 
                   and self._similarity(e.message, entry.message) > 0.7]
        
        if len(similar) >= 2:
            pattern_id = f"PAT-{len(self.patterns)+1:04d}"
            pattern = ErrorPattern(pattern_id, entry.error_type, signature)
            self.patterns[pattern_id] = pattern
            return pattern
        
        return None
    
    def _compute_signature(self, entry: ErrorEntry) -> str:
        """Compute normalized signature for pattern matching."""
        # Normalize: remove numbers, paths, timestamps
        import re
        normalized = re.sub(r'\d+', 'N', entry.message)
        normalized = re.sub(r'[A-Z]:\\[^\s]+', 'PATH', normalized)
        normalized = re.sub(r'\d{4}-\d{2}-\d{2}', 'DATE', normalized)
        return f"{entry.error_type}:{hashlib.md5(normalized.encode()).hexdigest()[:8]}"
    
    def _similarity(self, s1: str, s2: str) -> float:
        """Simple Jaccard similarity."""
        words1 = set(s1.lower().split())
        words2 = set(s2.lower().split())
        if not words1 or not words2:
            return 0.0
        return len(words1 & words2) / len(words1 | words2)
    
    # ─────────────────────────────────────────────────────────────
    # Prevention Rules
    # ─────────────────────────────────────────────────────────────
    
    def add_prevention_rule(self, rule_id: str, rule_text: str):
        """Add a prevention rule."""
        self.prevention_rules[rule_id] = {
            "rule": rule_text,
            "created": datetime.now().isoformat(),
            "triggers": 0
        }
        self._save_rules()
    
    def get_prevention_advice(self, error_type: str) -> List[str]:
        """Get prevention advice for an error type."""
        advice = []
        for pattern in self.patterns.values():
            if pattern.error_type == error_type and pattern.prevention_rule:
                advice.append(pattern.prevention_rule)
        return advice
    
    # ─────────────────────────────────────────────────────────────
    # Context Injection
    # ─────────────────────────────────────────────────────────────
    
    def get_recent_errors_for_context(self, n: int = 5) -> str:
        """Get recent errors formatted for context injection."""
        recent = self.errors[-n:] if self.errors else []
        if not recent:
            return "No recent errors."
        
        lines = ["Recent Errors (preserved for learning):"]
        for e in recent:
            lines.append(f"  [{e.error_type}] {e.message[:80]}")
            if e.resolution:
                lines.append(f"    → Resolution: {e.resolution[:60]}")
            if e.prevention_rule:
                lines.append(f"    → Prevention: {e.prevention_rule[:60]}")
        return '\n'.join(lines)
    
    def status(self) -> Dict:
        """Get system status."""
        return {
            "total_errors": len(self.errors),
            "patterns_detected": len(self.patterns),
            "prevention_rules": len([k for k in self.prevention_rules if not k.startswith("belief:")]),
            "error_types": list(set(e.error_type for e in self.errors)),
            "repeat_rate": self._compute_repeat_rate()
        }
    
    def _compute_repeat_rate(self) -> float:
        """Compute error repeat rate (target: <10%)."""
        if len(self.errors) < 2:
            return 0.0
        
        repeated = sum(1 for p in self.patterns.values() if p.occurrences > 1)
        return repeated / max(len(self.patterns), 1)


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Error Preservation System")
    parser.add_argument("command", choices=["status", "log", "recent", "patterns", "learning"])
    parser.add_argument("--type", help="Error type")
    parser.add_argument("--message", help="Error message")
    parser.add_argument("--context", help="Error context")
    parser.add_argument("-n", type=int, default=5, help="Number of recent errors")
    
    args = parser.parse_args()
    eps = ErrorPreservationSystem()
    
    if args.command == "status":
        print(json.dumps(eps.status(), indent=2))
    
    elif args.command == "log":
        if not all([args.type, args.message, args.context]):
            print("Error: --type, --message, --context required")
            return
        entry = eps.preserve_error(args.type, args.message, args.context)
        print(f"Error preserved: {entry.id}")
    
    elif args.command == "recent":
        print(eps.get_recent_errors_for_context(args.n))
    
    elif args.command == "patterns":
        for p in eps.patterns.values():
            print(f"[{p.pattern_id}] {p.error_type}: {p.occurrences} occurrences")
            if p.prevention_rule:
                print(f"  Prevention: {p.prevention_rule}")
    
    elif args.command == "learning":
        data = eps.get_learning_data()
        print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
