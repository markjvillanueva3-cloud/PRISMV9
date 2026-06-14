#!/usr/bin/env python3
"""
PRISM Pattern Detector v1.0
Session 1.3 Deliverable: Detect patterns in errors.

Identifies:
- Repeated errors (same error occurring multiple times)
- Similar errors (errors with shared characteristics)
- Root causes (underlying issues causing multiple errors)
- Temporal patterns (errors occurring at specific times/conditions)
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import re
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from collections import defaultdict, Counter
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
PATTERNS_FILE = PRISM_ROOT / "state" / "PRISM_ERROR_PATTERNS.json"
EXTRACTED_ERRORS = PRISM_ROOT / "state" / "EXTRACTED_ERRORS.jsonl"

class PatternType(Enum):
    """Types of error patterns."""
    REPEATED = "repeated"          # Same error multiple times
    SIMILAR = "similar"            # Errors with shared traits
    TEMPORAL = "temporal"          # Time-based patterns
    TOOL_SPECIFIC = "tool_specific"  # Errors from specific tool
    SEQUENCE = "sequence"          # Errors that occur in sequence
    ROOT_CAUSE = "root_cause"      # Underlying cause pattern

class PatternConfidence(Enum):
    """Confidence level of pattern detection."""
    HIGH = 3      # Strong evidence, reliable pattern
    MEDIUM = 2    # Moderate evidence
    LOW = 1       # Weak evidence, needs more data

@dataclass
class ErrorPattern:
    """A detected error pattern."""
    id: str
    pattern_type: PatternType
    confidence: PatternConfidence
    description: str
    error_count: int
    first_seen: str
    last_seen: str
    frequency: str  # e.g., "3 per hour", "daily"
    
    # Pattern details
    common_traits: Dict[str, Any] = field(default_factory=dict)
    affected_tools: List[str] = field(default_factory=list)
    sample_errors: List[str] = field(default_factory=list)
    
    # Prevention
    prevention_rule: Optional[str] = None
    auto_fix: Optional[str] = None
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['pattern_type'] = self.pattern_type.value
        d['confidence'] = self.confidence.value
        return d

class PatternDetector:
    """Detect patterns in error data."""
    
    # Minimum occurrences for pattern detection
    MIN_OCCURRENCES = 2
    
    # Similarity threshold (0-1)
    SIMILARITY_THRESHOLD = 0.7
    
    def __init__(self):
        self._ensure_paths()
        self.patterns: Dict[str, ErrorPattern] = {}
        self._load_patterns()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        PATTERNS_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_patterns(self):
        """Load existing patterns from file."""
        if PATTERNS_FILE.exists():
            try:
                data = json.loads(PATTERNS_FILE.read_text(encoding='utf-8'))
                for p in data.get('patterns', []):
                    self.patterns[p['id']] = ErrorPattern(
                        id=p['id'],
                        pattern_type=PatternType(p['pattern_type']),
                        confidence=PatternConfidence(p['confidence']),
                        description=p['description'],
                        error_count=p['error_count'],
                        first_seen=p['first_seen'],
                        last_seen=p['last_seen'],
                        frequency=p['frequency'],
                        common_traits=p.get('common_traits', {}),
                        affected_tools=p.get('affected_tools', []),
                        sample_errors=p.get('sample_errors', []),
                        prevention_rule=p.get('prevention_rule'),
                        auto_fix=p.get('auto_fix')
                    )
            except:
                pass
    
    def _save_patterns(self):
        """Save patterns to file."""
        data = {
            "version": "1.0",
            "updated": datetime.now().isoformat(),
            "pattern_count": len(self.patterns),
            "patterns": [p.to_dict() for p in self.patterns.values()]
        }
        PATTERNS_FILE.write_text(
            json.dumps(data, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _generate_pattern_id(self, pattern_type: str, traits: str) -> str:
        """Generate unique pattern ID."""
        hash_part = hashlib.md5(f"{pattern_type}{traits}".encode()).hexdigest()[:8]
        return f"PAT-{pattern_type[:3].upper()}-{hash_part}"
    
    def load_errors(self) -> List[Dict]:
        """Load errors from extracted errors file."""
        if not EXTRACTED_ERRORS.exists():
            return []
        
        errors = []
        with open(EXTRACTED_ERRORS, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    errors.append(json.loads(line))
                except:
                    pass
        return errors
    
    def detect_all_patterns(self, errors: List[Dict] = None) -> List[ErrorPattern]:
        """Run all pattern detection algorithms."""
        if errors is None:
            errors = self.load_errors()
        
        if not errors:
            return []
        
        detected = []
        
        # Detect repeated errors
        detected.extend(self.detect_repeated(errors))
        
        # Detect similar errors
        detected.extend(self.detect_similar(errors))
        
        # Detect tool-specific patterns
        detected.extend(self.detect_tool_patterns(errors))
        
        # Detect temporal patterns
        detected.extend(self.detect_temporal(errors))
        
        # Detect sequences
        detected.extend(self.detect_sequences(errors))
        
        # Save all patterns
        for pattern in detected:
            self.patterns[pattern.id] = pattern
        self._save_patterns()
        
        return detected
    
    def detect_repeated(self, errors: List[Dict]) -> List[ErrorPattern]:
        """Detect repeated identical errors."""
        patterns = []
        
        # Group by message hash
        by_message = defaultdict(list)
        for e in errors:
            msg_hash = hashlib.md5(e.get('message', '').encode()).hexdigest()[:16]
            by_message[msg_hash].append(e)
        
        for msg_hash, error_list in by_message.items():
            if len(error_list) >= self.MIN_OCCURRENCES:
                first = error_list[0]
                last = error_list[-1]
                
                pattern = ErrorPattern(
                    id=self._generate_pattern_id('repeated', msg_hash),
                    pattern_type=PatternType.REPEATED,
                    confidence=self._calc_confidence(len(error_list)),
                    description=f"Repeated error: {first.get('message', '')[:100]}",
                    error_count=len(error_list),
                    first_seen=first.get('timestamp', ''),
                    last_seen=last.get('timestamp', ''),
                    frequency=self._calc_frequency(error_list),
                    common_traits={
                        'error_type': first.get('error_type'),
                        'source': first.get('source'),
                        'message_hash': msg_hash
                    },
                    affected_tools=list(set(e.get('tool_name', 'unknown') for e in error_list if e.get('tool_name'))),
                    sample_errors=[e.get('id', '') for e in error_list[:3]]
                )
                patterns.append(pattern)
        
        return patterns
    
    def detect_similar(self, errors: List[Dict]) -> List[ErrorPattern]:
        """Detect similar (but not identical) errors."""
        patterns = []
        
        # Group by error type
        by_type = defaultdict(list)
        for e in errors:
            by_type[e.get('error_type', 'unknown')].append(e)
        
        for error_type, error_list in by_type.items():
            if len(error_list) >= self.MIN_OCCURRENCES:
                # Check if messages are similar but not identical
                messages = [e.get('message', '') for e in error_list]
                unique_messages = len(set(messages))
                
                if unique_messages > 1 and unique_messages < len(messages):
                    # Similar but not all identical
                    first = error_list[0]
                    last = error_list[-1]
                    
                    # Find common words
                    all_words = []
                    for msg in messages:
                        all_words.extend(msg.lower().split())
                    word_counts = Counter(all_words)
                    common_words = [w for w, c in word_counts.most_common(5) if c >= len(messages) // 2]
                    
                    pattern = ErrorPattern(
                        id=self._generate_pattern_id('similar', error_type),
                        pattern_type=PatternType.SIMILAR,
                        confidence=PatternConfidence.MEDIUM,
                        description=f"Similar errors of type '{error_type}'",
                        error_count=len(error_list),
                        first_seen=first.get('timestamp', ''),
                        last_seen=last.get('timestamp', ''),
                        frequency=self._calc_frequency(error_list),
                        common_traits={
                            'error_type': error_type,
                            'common_words': common_words,
                            'unique_messages': unique_messages
                        },
                        affected_tools=list(set(e.get('tool_name', 'unknown') for e in error_list if e.get('tool_name'))),
                        sample_errors=[e.get('id', '') for e in error_list[:3]]
                    )
                    patterns.append(pattern)
        
        return patterns
    
    def detect_tool_patterns(self, errors: List[Dict]) -> List[ErrorPattern]:
        """Detect patterns specific to certain tools."""
        patterns = []
        
        # Group by tool
        by_tool = defaultdict(list)
        for e in errors:
            tool = e.get('tool_name')
            if tool:
                by_tool[tool].append(e)
        
        for tool_name, error_list in by_tool.items():
            if len(error_list) >= self.MIN_OCCURRENCES:
                first = error_list[0]
                last = error_list[-1]
                
                # Analyze error types for this tool
                type_counts = Counter(e.get('error_type', 'unknown') for e in error_list)
                
                pattern = ErrorPattern(
                    id=self._generate_pattern_id('tool', tool_name),
                    pattern_type=PatternType.TOOL_SPECIFIC,
                    confidence=self._calc_confidence(len(error_list)),
                    description=f"Tool '{tool_name}' generates frequent errors",
                    error_count=len(error_list),
                    first_seen=first.get('timestamp', ''),
                    last_seen=last.get('timestamp', ''),
                    frequency=self._calc_frequency(error_list),
                    common_traits={
                        'tool_name': tool_name,
                        'error_types': dict(type_counts.most_common(5))
                    },
                    affected_tools=[tool_name],
                    sample_errors=[e.get('id', '') for e in error_list[:3]]
                )
                patterns.append(pattern)
        
        return patterns
    
    def detect_temporal(self, errors: List[Dict]) -> List[ErrorPattern]:
        """Detect time-based patterns."""
        patterns = []
        
        # Parse timestamps
        timed_errors = []
        for e in errors:
            ts = e.get('timestamp', '')
            try:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                timed_errors.append((dt, e))
            except:
                pass
        
        if len(timed_errors) < self.MIN_OCCURRENCES:
            return patterns
        
        # Check for burst patterns (many errors in short time)
        timed_errors.sort(key=lambda x: x[0])
        
        burst_threshold = timedelta(minutes=5)
        burst_min = 3
        
        i = 0
        while i < len(timed_errors):
            burst = [timed_errors[i]]
            j = i + 1
            
            while j < len(timed_errors) and (timed_errors[j][0] - burst[-1][0]) < burst_threshold:
                burst.append(timed_errors[j])
                j += 1
            
            if len(burst) >= burst_min:
                error_list = [e for _, e in burst]
                
                pattern = ErrorPattern(
                    id=self._generate_pattern_id('temporal', burst[0][0].isoformat()),
                    pattern_type=PatternType.TEMPORAL,
                    confidence=PatternConfidence.HIGH,
                    description=f"Error burst: {len(burst)} errors in {(burst[-1][0] - burst[0][0]).total_seconds():.0f}s",
                    error_count=len(burst),
                    first_seen=burst[0][0].isoformat(),
                    last_seen=burst[-1][0].isoformat(),
                    frequency="burst",
                    common_traits={
                        'duration_seconds': (burst[-1][0] - burst[0][0]).total_seconds(),
                        'errors_per_minute': len(burst) / max((burst[-1][0] - burst[0][0]).total_seconds() / 60, 1)
                    },
                    sample_errors=[e.get('id', '') for e in error_list[:3]]
                )
                patterns.append(pattern)
            
            i = j
        
        return patterns
    
    def detect_sequences(self, errors: List[Dict]) -> List[ErrorPattern]:
        """Detect error sequences (A always followed by B)."""
        patterns = []
        
        if len(errors) < 3:
            return patterns
        
        # Look for repeated sequences of error types
        type_sequence = [e.get('error_type', 'unknown') for e in errors]
        
        # Find 2-grams that repeat
        bigrams = defaultdict(int)
        for i in range(len(type_sequence) - 1):
            bigram = (type_sequence[i], type_sequence[i + 1])
            bigrams[bigram] += 1
        
        for (type_a, type_b), count in bigrams.items():
            if count >= self.MIN_OCCURRENCES and type_a != type_b:
                pattern = ErrorPattern(
                    id=self._generate_pattern_id('sequence', f"{type_a}-{type_b}"),
                    pattern_type=PatternType.SEQUENCE,
                    confidence=PatternConfidence.MEDIUM,
                    description=f"'{type_a}' often followed by '{type_b}'",
                    error_count=count,
                    first_seen=errors[0].get('timestamp', ''),
                    last_seen=errors[-1].get('timestamp', ''),
                    frequency=f"{count} occurrences",
                    common_traits={
                        'sequence': [type_a, type_b],
                        'occurrences': count
                    }
                )
                patterns.append(pattern)
        
        return patterns
    
    def _calc_confidence(self, count: int) -> PatternConfidence:
        """Calculate confidence based on occurrence count."""
        if count >= 10:
            return PatternConfidence.HIGH
        elif count >= 5:
            return PatternConfidence.MEDIUM
        return PatternConfidence.LOW
    
    def _calc_frequency(self, errors: List[Dict]) -> str:
        """Calculate error frequency string."""
        if len(errors) < 2:
            return "single"
        
        try:
            first = datetime.fromisoformat(errors[0].get('timestamp', '').replace('Z', '+00:00'))
            last = datetime.fromisoformat(errors[-1].get('timestamp', '').replace('Z', '+00:00'))
            
            duration = (last - first).total_seconds()
            
            if duration < 60:
                return f"{len(errors)} per minute"
            elif duration < 3600:
                return f"{len(errors) / (duration / 3600):.1f} per hour"
            elif duration < 86400:
                return f"{len(errors) / (duration / 86400):.1f} per day"
            else:
                return f"{len(errors)} over {duration / 86400:.1f} days"
        except:
            return "unknown"
    
    def get_pattern(self, pattern_id: str) -> Optional[ErrorPattern]:
        """Get pattern by ID."""
        return self.patterns.get(pattern_id)
    
    def get_all_patterns(self) -> List[ErrorPattern]:
        """Get all detected patterns."""
        return list(self.patterns.values())
    
    def get_prevention_rules(self) -> List[Dict]:
        """Get all prevention rules from patterns."""
        return [
            {
                'pattern_id': p.id,
                'rule': p.prevention_rule,
                'description': p.description
            }
            for p in self.patterns.values()
            if p.prevention_rule
        ]


def main():
    """CLI for pattern detector."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Pattern Detector")
    parser.add_argument('--detect', action='store_true', help='Run pattern detection')
    parser.add_argument('--list', action='store_true', help='List detected patterns')
    parser.add_argument('--rules', action='store_true', help='List prevention rules')
    
    args = parser.parse_args()
    detector = PatternDetector()
    
    if args.detect:
        patterns = detector.detect_all_patterns()
        print(f"Detected {len(patterns)} patterns")
        for p in patterns:
            print(f"  [{p.pattern_type.value}] {p.description}")
    
    elif args.list:
        patterns = detector.get_all_patterns()
        print(f"Total patterns: {len(patterns)}")
        for p in patterns:
            print(f"  {p.id}: [{p.confidence.name}] {p.description}")
    
    elif args.rules:
        rules = detector.get_prevention_rules()
        print(f"Prevention rules: {len(rules)}")
        for r in rules:
            print(f"  {r['pattern_id']}: {r['rule']}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
