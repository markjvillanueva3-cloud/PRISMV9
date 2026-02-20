#!/usr/bin/env python3
"""
PRISM Priority Scorer v1.0
Session 1.2 Deliverable: Score content by importance for compression decisions.

Scores content segments to determine what to keep vs compress when context fills.
Higher scores = more important = keep in full detail.
Lower scores = less important = can be compressed or summarized.
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
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

class ContentType(Enum):
    """Types of content with base priority weights."""
    SAFETY_CRITICAL = 100    # Never compress - tool explosions, injury risk
    CURRENT_TASK = 90        # Current work in progress
    DECISION_RECORD = 80     # Decisions made this session
    CODE_OUTPUT = 75         # Generated code
    STATE_DATA = 70          # CURRENT_STATE, progress tracking
    FORMULA_RESULT = 65      # Physics calculations
    USER_REQUEST = 60        # Original user messages
    TOOL_RESULT = 50         # Tool call results
    CONTEXT_INFO = 40        # Background information
    HISTORICAL = 30          # Previous session info
    BOILERPLATE = 20         # Repeated instructions
    REDUNDANT = 10           # Duplicate information

@dataclass
class ScoredSegment:
    """A scored content segment."""
    content: str
    content_type: ContentType
    base_score: float
    recency_bonus: float
    reference_bonus: float
    final_score: float
    line_start: int
    line_end: int
    char_count: int
    can_compress: bool
    compression_ratio: float  # How much can be compressed (0.0-1.0)

class PriorityScorer:
    """Score content segments for compression decisions."""
    
    # Patterns that indicate high-priority content
    HIGH_PRIORITY_PATTERNS = [
        (r'S\(x\)\s*[<>=]', 'Safety check', ContentType.SAFETY_CRITICAL),
        (r'BLOCKED|HARD.?BLOCK', 'Block indicator', ContentType.SAFETY_CRITICAL),
        (r'cutting.?force|tool.?life|spindle.?speed', 'Physics calculation', ContentType.FORMULA_RESULT),
        (r'Kienzle|Taylor|Johnson.?Cook', 'Physics formula', ContentType.FORMULA_RESULT),
        (r'DECISION:|decided|chose|selected', 'Decision record', ContentType.DECISION_RECORD),
        (r'def\s+\w+|class\s+\w+|function\s+\w+', 'Code definition', ContentType.CODE_OUTPUT),
        (r'```python|```typescript|```javascript', 'Code block', ContentType.CODE_OUTPUT),
        (r'CURRENT_STATE|ROADMAP_TRACKER', 'State reference', ContentType.STATE_DATA),
        (r'Session\s+\d+\.\d+|Tier\s+\d+', 'Session reference', ContentType.STATE_DATA),
        (r'User:|Human:', 'User message', ContentType.USER_REQUEST),
    ]
    
    # Patterns that indicate low-priority/compressible content
    LOW_PRIORITY_PATTERNS = [
        (r'^\s*[-*]\s+', 'Bullet point', ContentType.CONTEXT_INFO),
        (r'Note:|FYI:|For reference:', 'Informational note', ContentType.CONTEXT_INFO),
        (r'As mentioned|Previously|Earlier', 'Historical reference', ContentType.HISTORICAL),
        (r'={10,}|─{10,}', 'Separator line', ContentType.BOILERPLATE),
        (r'^\s*$', 'Empty line', ContentType.REDUNDANT),
    ]
    
    def __init__(self):
        self.segments: List[ScoredSegment] = []
        self.total_chars = 0
        self.compressible_chars = 0
    
    def score_content(self, content: str, context: Dict[str, Any] = None) -> List[ScoredSegment]:
        """
        Score all content segments.
        
        Args:
            content: Full content to score
            context: Optional context with recency info, references, etc.
            
        Returns:
            List of scored segments
        """
        context = context or {}
        lines = content.split('\n')
        segments = []
        
        # Group lines into logical segments
        current_segment = []
        current_start = 0
        
        for i, line in enumerate(lines):
            # Check if this line starts a new segment
            if self._is_segment_boundary(line, current_segment):
                if current_segment:
                    segment_text = '\n'.join(current_segment)
                    scored = self._score_segment(
                        segment_text, 
                        current_start, 
                        i - 1,
                        context
                    )
                    segments.append(scored)
                current_segment = [line]
                current_start = i
            else:
                current_segment.append(line)
        
        # Don't forget the last segment
        if current_segment:
            segment_text = '\n'.join(current_segment)
            scored = self._score_segment(
                segment_text,
                current_start,
                len(lines) - 1,
                context
            )
            segments.append(scored)
        
        self.segments = segments
        self.total_chars = sum(s.char_count for s in segments)
        self.compressible_chars = sum(
            int(s.char_count * s.compression_ratio) 
            for s in segments if s.can_compress
        )
        
        return segments
    
    def _is_segment_boundary(self, line: str, current_segment: List[str]) -> bool:
        """Check if line starts a new logical segment."""
        if not current_segment:
            return True
        
        # Headers start new segments
        if re.match(r'^#{1,6}\s+', line):
            return True
        
        # Code blocks start new segments
        if line.strip().startswith('```'):
            return True
        
        # Separator lines start new segments
        if re.match(r'^[-=]{3,}$', line.strip()):
            return True
        
        # Function/class definitions start new segments
        if re.match(r'^(def|class|function|const|let|var)\s+', line.strip()):
            return True
        
        return False
    
    def _score_segment(self, content: str, line_start: int, line_end: int,
                       context: Dict[str, Any]) -> ScoredSegment:
        """Score a single segment."""
        # Determine content type
        content_type = self._classify_content(content)
        base_score = content_type.value
        
        # Calculate recency bonus (more recent = higher score)
        total_lines = context.get('total_lines', line_end + 1)
        recency = (line_end + 1) / max(total_lines, 1)
        recency_bonus = recency * 20  # Up to +20 for most recent
        
        # Calculate reference bonus (referenced content = higher score)
        reference_count = context.get('references', {}).get(f'{line_start}-{line_end}', 0)
        reference_bonus = min(reference_count * 5, 25)  # Up to +25 for referenced
        
        # Final score
        final_score = min(100, base_score + recency_bonus + reference_bonus)
        
        # Determine if compressible
        can_compress = content_type.value < 70  # Below STATE_DATA
        
        # Estimate compression ratio
        compression_ratio = self._estimate_compression_ratio(content, content_type)
        
        return ScoredSegment(
            content=content,
            content_type=content_type,
            base_score=base_score,
            recency_bonus=round(recency_bonus, 2),
            reference_bonus=round(reference_bonus, 2),
            final_score=round(final_score, 2),
            line_start=line_start,
            line_end=line_end,
            char_count=len(content),
            can_compress=can_compress,
            compression_ratio=round(compression_ratio, 2)
        )
    
    def _classify_content(self, content: str) -> ContentType:
        """Classify content into a type."""
        content_lower = content.lower()
        
        # Check high-priority patterns first
        for pattern, name, content_type in self.HIGH_PRIORITY_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                return content_type
        
        # Check low-priority patterns
        for pattern, name, content_type in self.LOW_PRIORITY_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                return content_type
        
        # Default to context info
        return ContentType.CONTEXT_INFO
    
    def _estimate_compression_ratio(self, content: str, content_type: ContentType) -> float:
        """Estimate how much content can be compressed."""
        # Safety critical and code cannot be compressed
        if content_type in [ContentType.SAFETY_CRITICAL, ContentType.CODE_OUTPUT]:
            return 0.0
        
        # Current task and decisions: minimal compression
        if content_type in [ContentType.CURRENT_TASK, ContentType.DECISION_RECORD]:
            return 0.2
        
        # State data and formulas: some compression
        if content_type in [ContentType.STATE_DATA, ContentType.FORMULA_RESULT]:
            return 0.3
        
        # User requests: moderate compression (keep intent)
        if content_type == ContentType.USER_REQUEST:
            return 0.4
        
        # Tool results: can compress significantly
        if content_type == ContentType.TOOL_RESULT:
            return 0.6
        
        # Context and historical: high compression
        if content_type in [ContentType.CONTEXT_INFO, ContentType.HISTORICAL]:
            return 0.7
        
        # Boilerplate and redundant: maximum compression
        if content_type in [ContentType.BOILERPLATE, ContentType.REDUNDANT]:
            return 0.9
        
        return 0.5
    
    def get_compression_candidates(self, target_reduction: int) -> List[ScoredSegment]:
        """
        Get segments to compress to achieve target character reduction.
        
        Args:
            target_reduction: Number of characters to reduce
            
        Returns:
            List of segments to compress, lowest priority first
        """
        # Sort by final score (lowest first = compress first)
        compressible = [s for s in self.segments if s.can_compress]
        compressible.sort(key=lambda s: s.final_score)
        
        candidates = []
        reduction_achieved = 0
        
        for segment in compressible:
            if reduction_achieved >= target_reduction:
                break
            
            potential_reduction = int(segment.char_count * segment.compression_ratio)
            candidates.append(segment)
            reduction_achieved += potential_reduction
        
        return candidates
    
    def get_summary(self) -> Dict[str, Any]:
        """Get scoring summary."""
        if not self.segments:
            return {"error": "No content scored"}
        
        by_type = {}
        for segment in self.segments:
            type_name = segment.content_type.name
            if type_name not in by_type:
                by_type[type_name] = {"count": 0, "chars": 0, "avg_score": 0}
            by_type[type_name]["count"] += 1
            by_type[type_name]["chars"] += segment.char_count
            by_type[type_name]["avg_score"] += segment.final_score
        
        for type_name in by_type:
            by_type[type_name]["avg_score"] /= by_type[type_name]["count"]
            by_type[type_name]["avg_score"] = round(by_type[type_name]["avg_score"], 1)
        
        return {
            "total_segments": len(self.segments),
            "total_chars": self.total_chars,
            "compressible_chars": self.compressible_chars,
            "compression_potential": f"{self.compressible_chars / max(self.total_chars, 1) * 100:.1f}%",
            "by_type": by_type,
            "highest_priority": max(self.segments, key=lambda s: s.final_score).content_type.name,
            "lowest_priority": min(self.segments, key=lambda s: s.final_score).content_type.name
        }


def main():
    """CLI for testing priority scorer."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Priority Scorer")
    parser.add_argument('--file', type=str, help='File to score')
    parser.add_argument('--content', type=str, help='Direct content to score')
    parser.add_argument('--target', type=int, default=10000, help='Target reduction in chars')
    
    args = parser.parse_args()
    scorer = PriorityScorer()
    
    if args.file:
        content = Path(args.file).read_text(encoding='utf-8')
    elif args.content:
        content = args.content
    else:
        # Demo content
        content = """
# Session 1.2 Work
## Safety Check
S(x) = 0.85 - PASSED
Cutting force calculated: 1500N

## Code Output
```python
def calculate_force():
    return kc * h ** mc * b
```

## Historical Note
Previously we discussed the architecture.
As mentioned earlier, this is context info.

---
Separator line
---
"""
    
    segments = scorer.score_content(content)
    
    print("\n" + "="*60)
    print("PRIORITY SCORING RESULTS")
    print("="*60)
    
    summary = scorer.get_summary()
    print(f"\nTotal Segments: {summary['total_segments']}")
    print(f"Total Characters: {summary['total_chars']}")
    print(f"Compressible: {summary['compressible_chars']} ({summary['compression_potential']})")
    
    print("\nBy Type:")
    for type_name, data in summary['by_type'].items():
        print(f"  {type_name}: {data['count']} segments, {data['chars']} chars, avg score {data['avg_score']}")
    
    print(f"\nHighest Priority: {summary['highest_priority']}")
    print(f"Lowest Priority: {summary['lowest_priority']}")
    
    # Show compression candidates
    candidates = scorer.get_compression_candidates(args.target)
    if candidates:
        print(f"\nCompression Candidates (for {args.target} char reduction):")
        for c in candidates[:5]:
            preview = c.content[:50].replace('\n', ' ')
            print(f"  [{c.final_score}] {c.content_type.name}: {preview}...")


if __name__ == "__main__":
    main()
