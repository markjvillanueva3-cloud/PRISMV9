#!/usr/bin/env python3
"""
PRISM Learning Store v1.0
Session 1.3 Deliverable: Store and apply learned error patterns.

Stores:
- Error patterns and their prevention rules
- Learned fixes that worked
- Context-specific learning (which tools, which operations)
- Confidence scores that improve with validation
"""
import sys
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
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
LEARNING_STORE = PRISM_ROOT / "state" / "LEARNING_STORE.json"
PREVENTION_RULES = PRISM_ROOT / "state" / "PREVENTION_RULES.json"
LEARNING_LOG = PRISM_ROOT / "state" / "LEARNING_LOG.jsonl"

class LearningType(Enum):
    """Types of learned knowledge."""
    PREVENTION = "prevention"      # How to prevent error
    FIX = "fix"                    # How to fix error
    WORKAROUND = "workaround"      # Alternative approach
    CONTEXT = "context"            # When error occurs
    ROOT_CAUSE = "root_cause"      # Why error occurs

class ValidationStatus(Enum):
    """Status of learned knowledge validation."""
    UNVALIDATED = "unvalidated"    # Not yet tested
    VALIDATED = "validated"        # Confirmed working
    FAILED = "failed"              # Did not work
    PARTIAL = "partial"            # Sometimes works

@dataclass
class LearnedKnowledge:
    """A piece of learned knowledge about errors."""
    id: str
    learning_type: LearningType
    pattern_id: Optional[str]      # Link to error pattern
    error_type: str
    
    # The learned content
    trigger: str                   # What triggers this (error message, condition)
    action: str                    # What to do
    explanation: str               # Why this works
    
    # Validation
    status: ValidationStatus = ValidationStatus.UNVALIDATED
    success_count: int = 0
    failure_count: int = 0
    confidence: float = 0.5        # 0-1 scale
    
    # Context
    applicable_tools: List[str] = field(default_factory=list)
    applicable_contexts: List[str] = field(default_factory=list)
    
    # Metadata
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    source: str = "automatic"      # automatic, manual, user_feedback
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['learning_type'] = self.learning_type.value
        d['status'] = self.status.value
        return d
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'LearnedKnowledge':
        return cls(
            id=data['id'],
            learning_type=LearningType(data['learning_type']),
            pattern_id=data.get('pattern_id'),
            error_type=data['error_type'],
            trigger=data['trigger'],
            action=data['action'],
            explanation=data['explanation'],
            status=ValidationStatus(data.get('status', 'unvalidated')),
            success_count=data.get('success_count', 0),
            failure_count=data.get('failure_count', 0),
            confidence=data.get('confidence', 0.5),
            applicable_tools=data.get('applicable_tools', []),
            applicable_contexts=data.get('applicable_contexts', []),
            created_at=data.get('created_at', datetime.now().isoformat()),
            updated_at=data.get('updated_at', datetime.now().isoformat()),
            source=data.get('source', 'automatic')
        )

class LearningStore:
    """Store and retrieve learned error knowledge."""
    
    def __init__(self):
        self._ensure_paths()
        self.knowledge: Dict[str, LearnedKnowledge] = {}
        self.prevention_rules: Dict[str, Dict] = {}
        self._load()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        LEARNING_STORE.parent.mkdir(parents=True, exist_ok=True)
    
    def _load(self):
        """Load learning store from disk."""
        if LEARNING_STORE.exists():
            try:
                data = json.loads(LEARNING_STORE.read_text(encoding='utf-8'))
                for k in data.get('knowledge', []):
                    knowledge = LearnedKnowledge.from_dict(k)
                    self.knowledge[knowledge.id] = knowledge
            except:
                pass
        
        if PREVENTION_RULES.exists():
            try:
                self.prevention_rules = json.loads(PREVENTION_RULES.read_text(encoding='utf-8'))
            except:
                pass
    
    def _save(self):
        """Save learning store to disk."""
        data = {
            "version": "1.0",
            "updated": datetime.now().isoformat(),
            "knowledge_count": len(self.knowledge),
            "knowledge": [k.to_dict() for k in self.knowledge.values()]
        }
        LEARNING_STORE.write_text(
            json.dumps(data, indent=2, sort_keys=True),
            encoding='utf-8'
        )
        
        PREVENTION_RULES.write_text(
            json.dumps(self.prevention_rules, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _log_learning(self, action: str, knowledge_id: str, details: Dict = None):
        """Log learning activity."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "knowledge_id": knowledge_id,
            "details": details or {}
        }
        with open(LEARNING_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def _generate_id(self, error_type: str, trigger: str) -> str:
        """Generate unique knowledge ID."""
        hash_part = hashlib.md5(f"{error_type}{trigger}".encode()).hexdigest()[:8]
        return f"LEARN-{hash_part}"
    
    def learn(self, error_type: str, trigger: str, action: str,
              explanation: str, learning_type: LearningType = LearningType.FIX,
              pattern_id: str = None, tools: List[str] = None,
              contexts: List[str] = None, source: str = "automatic") -> LearnedKnowledge:
        """
        Learn from an error.
        
        Args:
            error_type: Type of error
            trigger: What triggers this learning (error message pattern)
            action: What to do when triggered
            explanation: Why this works
            learning_type: Type of learning
            pattern_id: Link to error pattern
            tools: Applicable tools
            contexts: Applicable contexts
            source: Source of learning
            
        Returns:
            LearnedKnowledge object
        """
        knowledge_id = self._generate_id(error_type, trigger)
        
        # Check if exists
        if knowledge_id in self.knowledge:
            # Update existing
            existing = self.knowledge[knowledge_id]
            existing.action = action
            existing.explanation = explanation
            existing.updated_at = datetime.now().isoformat()
            if tools:
                existing.applicable_tools = list(set(existing.applicable_tools + tools))
            if contexts:
                existing.applicable_contexts = list(set(existing.applicable_contexts + contexts))
            self._log_learning("update", knowledge_id, {"source": source})
        else:
            # Create new
            knowledge = LearnedKnowledge(
                id=knowledge_id,
                learning_type=learning_type,
                pattern_id=pattern_id,
                error_type=error_type,
                trigger=trigger,
                action=action,
                explanation=explanation,
                applicable_tools=tools or [],
                applicable_contexts=contexts or [],
                source=source
            )
            self.knowledge[knowledge_id] = knowledge
            self._log_learning("create", knowledge_id, {"source": source})
        
        self._save()
        return self.knowledge[knowledge_id]
    
    def learn_prevention(self, error_type: str, trigger: str, 
                         prevention: str, explanation: str = None) -> LearnedKnowledge:
        """Learn a prevention rule."""
        knowledge = self.learn(
            error_type=error_type,
            trigger=trigger,
            action=prevention,
            explanation=explanation or f"Prevent {error_type}",
            learning_type=LearningType.PREVENTION
        )
        
        # Also add to prevention rules
        self.prevention_rules[knowledge.id] = {
            "error_type": error_type,
            "trigger": trigger,
            "prevention": prevention,
            "confidence": knowledge.confidence
        }
        self._save()
        
        return knowledge
    
    def validate(self, knowledge_id: str, success: bool, context: str = None):
        """
        Validate learned knowledge.
        
        Args:
            knowledge_id: ID of knowledge to validate
            success: Whether it worked
            context: Optional context
        """
        if knowledge_id not in self.knowledge:
            return
        
        knowledge = self.knowledge[knowledge_id]
        
        if success:
            knowledge.success_count += 1
        else:
            knowledge.failure_count += 1
        
        # Update confidence
        total = knowledge.success_count + knowledge.failure_count
        if total > 0:
            knowledge.confidence = knowledge.success_count / total
        
        # Update status
        if knowledge.success_count >= 3 and knowledge.confidence >= 0.8:
            knowledge.status = ValidationStatus.VALIDATED
        elif knowledge.failure_count >= 3 and knowledge.confidence < 0.3:
            knowledge.status = ValidationStatus.FAILED
        elif total >= 2:
            knowledge.status = ValidationStatus.PARTIAL
        
        knowledge.updated_at = datetime.now().isoformat()
        
        self._log_learning("validate", knowledge_id, {
            "success": success,
            "context": context,
            "new_confidence": knowledge.confidence
        })
        self._save()
    
    def lookup(self, error_type: str = None, trigger: str = None,
               tool: str = None, min_confidence: float = 0.3) -> List[LearnedKnowledge]:
        """
        Look up relevant learned knowledge.
        
        Args:
            error_type: Filter by error type
            trigger: Filter by trigger (partial match)
            tool: Filter by applicable tool
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of matching knowledge
        """
        results = []
        
        for knowledge in self.knowledge.values():
            # Confidence check
            if knowledge.confidence < min_confidence:
                continue
            
            # Error type check
            if error_type and knowledge.error_type != error_type:
                continue
            
            # Trigger check (partial match)
            if trigger and trigger.lower() not in knowledge.trigger.lower():
                continue
            
            # Tool check
            if tool and knowledge.applicable_tools and tool not in knowledge.applicable_tools:
                continue
            
            results.append(knowledge)
        
        # Sort by confidence
        results.sort(key=lambda k: k.confidence, reverse=True)
        
        return results
    
    def get_prevention(self, error_type: str) -> Optional[str]:
        """Get prevention action for error type."""
        for knowledge in self.knowledge.values():
            if (knowledge.learning_type == LearningType.PREVENTION and
                knowledge.error_type == error_type and
                knowledge.confidence >= 0.5):
                return knowledge.action
        return None
    
    def get_fix(self, error_type: str, trigger: str = None) -> Optional[str]:
        """Get fix action for error."""
        matches = self.lookup(error_type=error_type, trigger=trigger)
        for knowledge in matches:
            if knowledge.learning_type == LearningType.FIX:
                return knowledge.action
        return None
    
    def export_rules(self) -> Dict[str, Any]:
        """Export all prevention rules for injection into prompts."""
        validated = [
            k for k in self.knowledge.values()
            if k.status == ValidationStatus.VALIDATED and k.learning_type == LearningType.PREVENTION
        ]
        
        return {
            "rules_count": len(validated),
            "rules": [
                {
                    "error_type": k.error_type,
                    "prevention": k.action,
                    "confidence": k.confidence
                }
                for k in validated
            ]
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get learning statistics."""
        by_type = {}
        by_status = {}
        
        for k in self.knowledge.values():
            type_name = k.learning_type.value
            by_type[type_name] = by_type.get(type_name, 0) + 1
            
            status_name = k.status.value
            by_status[status_name] = by_status.get(status_name, 0) + 1
        
        avg_confidence = sum(k.confidence for k in self.knowledge.values()) / max(len(self.knowledge), 1)
        
        return {
            "total_knowledge": len(self.knowledge),
            "by_type": by_type,
            "by_status": by_status,
            "average_confidence": round(avg_confidence, 2),
            "prevention_rules": len(self.prevention_rules)
        }


def main():
    """CLI for learning store."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Learning Store")
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--lookup', type=str, help='Lookup by error type')
    parser.add_argument('--rules', action='store_true', help='Export prevention rules')
    parser.add_argument('--learn', nargs=4, metavar=('TYPE', 'TRIGGER', 'ACTION', 'EXPLAIN'),
                       help='Add learning')
    parser.add_argument('--learn-file', type=str, help='Add learning from file (text parsed as: first line=type, rest=explanation)')
    
    args = parser.parse_args()
    store = LearningStore()
    
    if args.stats:
        stats = store.get_statistics()
        print(json.dumps(stats, indent=2))
    
    elif args.lookup:
        results = store.lookup(error_type=args.lookup)
        print(f"Found {len(results)} entries for '{args.lookup}':")
        for k in results:
            print(f"  [{k.confidence:.2f}] {k.action}")
    
    elif args.rules:
        rules = store.export_rules()
        print(json.dumps(rules, indent=2))
    
    elif args.learn:
        error_type, trigger, action, explain = args.learn
        k = store.learn(error_type, trigger, action, explain)
        print(json.dumps({"learned": k.id, "type": error_type, "action": action}))
    
    elif getattr(args, 'learn_file', None):
        with open(args.learn_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        # Parse: extract category/type from content, use full text as explanation
        parts = content.split(',')
        error_type = "general"
        trigger = "observed"
        action = content[:200]
        explain = content
        for p in parts:
            p = p.strip()
            if p.lower().startswith('category:'):
                error_type = p.split(':', 1)[1].strip()
            elif p.lower().startswith('trigger:'):
                trigger = p.split(':', 1)[1].strip()
        k = store.learn(error_type, trigger, action, explain)
        print(json.dumps({"learned": k.id, "type": error_type, "action": action[:100]}))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
