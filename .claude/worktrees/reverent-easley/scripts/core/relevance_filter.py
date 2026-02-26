#!/usr/bin/env python3
"""
PRISM Relevance Filter v1.0
Session 1.4 Deliverable: Filter content by relevance to current task.

Filters:
- Content segments by relevance score
- Resources by task requirements
- Historical context by recency and utility
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
from typing import Dict, List, Any, Optional, Tuple, Set, Callable
from dataclasses import dataclass, asdict, field
from enum import Enum

# Import components
try:
    from attention_scorer import AttentionScorer, AttentionScore, ContentCategory
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from attention_scorer import AttentionScorer, AttentionScore, ContentCategory

# Paths
PRISM_ROOT = Path("C:/PRISM")
FILTER_LOG = PRISM_ROOT / "state" / "FILTER_LOG.jsonl"

class FilterMode(Enum):
    """Filter modes."""
    STRICT = "strict"          # Only high-relevance content
    BALANCED = "balanced"      # Balance relevance and coverage
    PERMISSIVE = "permissive"  # Include most content
    CUSTOM = "custom"          # Custom filter function

@dataclass
class FilterResult:
    """Result of filtering operation."""
    mode: FilterMode
    threshold: float
    
    # Content stats
    total_segments: int
    included_segments: int
    excluded_segments: int
    
    # Character stats
    total_chars: int
    included_chars: int
    excluded_chars: int
    
    # The filtered content
    filtered_content: str
    
    # Excluded segment previews (for review)
    excluded_previews: List[str] = field(default_factory=list)
    
    # Metrics
    filter_ratio: float = 0.0
    avg_included_score: float = 0.0
    avg_excluded_score: float = 0.0
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['mode'] = self.mode.value
        return d

class RelevanceFilter:
    """Filter content by relevance to current task."""
    
    # Mode configurations
    MODE_THRESHOLDS = {
        FilterMode.STRICT: 0.7,
        FilterMode.BALANCED: 0.4,
        FilterMode.PERMISSIVE: 0.2,
        FilterMode.CUSTOM: 0.5  # Default for custom
    }
    
    # Content type filters
    ALWAYS_INCLUDE = {
        ContentCategory.TASK_DIRECT,
    }
    
    NEVER_INCLUDE = {
        ContentCategory.BOILERPLATE,
    }
    
    def __init__(self):
        self._ensure_paths()
        self.scorer = AttentionScorer()
        self.custom_filters: List[Callable[[str], bool]] = []
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        FILTER_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def set_task_context(self, task_description: str, keywords: List[str] = None):
        """Set task context for relevance scoring."""
        self.scorer.set_task_context(task_description, keywords)
    
    def add_custom_filter(self, filter_func: Callable[[str], bool]):
        """
        Add custom filter function.
        
        Args:
            filter_func: Function that returns True to include content
        """
        self.custom_filters.append(filter_func)
    
    def filter_content(self, content: str, mode: FilterMode = FilterMode.BALANCED,
                       threshold: float = None,
                       preserve_structure: bool = True) -> FilterResult:
        """
        Filter content by relevance.
        
        Args:
            content: Content to filter
            mode: Filter mode
            threshold: Optional custom threshold (overrides mode default)
            preserve_structure: Keep section headers even if low score
            
        Returns:
            FilterResult with filtered content
        """
        # Determine threshold
        if threshold is None:
            threshold = self.MODE_THRESHOLDS[mode]
        
        # Score all segments
        scores = self.scorer.score_content(content, segment_size=30)
        
        included = []
        excluded = []
        included_chars = 0
        excluded_chars = 0
        included_scores = []
        excluded_scores = []
        excluded_previews = []
        
        lines = content.split('\n')
        
        for score in scores:
            segment_lines = lines[score.line_start:score.line_end + 1]
            segment_text = '\n'.join(segment_lines)
            
            include = self._should_include(score, threshold, segment_text, preserve_structure)
            
            # Apply custom filters
            if include and self.custom_filters:
                include = all(f(segment_text) for f in self.custom_filters)
            
            if include:
                included.append(segment_text)
                included_chars += score.char_count
                included_scores.append(score.attention_score)
            else:
                excluded.append(segment_text)
                excluded_chars += score.char_count
                excluded_scores.append(score.attention_score)
                excluded_previews.append(score.content_preview[:50])
        
        # Build filtered content
        filtered_content = '\n\n'.join(included)
        
        total_chars = included_chars + excluded_chars
        filter_ratio = excluded_chars / max(total_chars, 1)
        
        result = FilterResult(
            mode=mode,
            threshold=threshold,
            total_segments=len(scores),
            included_segments=len(included),
            excluded_segments=len(excluded),
            total_chars=total_chars,
            included_chars=included_chars,
            excluded_chars=excluded_chars,
            filtered_content=filtered_content,
            excluded_previews=excluded_previews[:10],
            filter_ratio=round(filter_ratio, 3),
            avg_included_score=round(sum(included_scores) / max(len(included_scores), 1), 3),
            avg_excluded_score=round(sum(excluded_scores) / max(len(excluded_scores), 1), 3)
        )
        
        # Log
        self._log_filter(result)
        
        return result
    
    def _should_include(self, score: AttentionScore, threshold: float,
                        content: str, preserve_structure: bool) -> bool:
        """Determine if segment should be included."""
        # Always include task-direct content
        if score.category in self.ALWAYS_INCLUDE:
            return True
        
        # Never include boilerplate
        if score.category in self.NEVER_INCLUDE:
            return False
        
        # Preserve headers if requested
        if preserve_structure and self._is_structure(content):
            return True
        
        # Check score threshold
        return score.attention_score >= threshold
    
    def _is_structure(self, content: str) -> bool:
        """Check if content is structural (headers, etc.)."""
        lines = content.strip().split('\n')
        if not lines:
            return False
        
        first_line = lines[0].strip()
        
        # Markdown headers
        if first_line.startswith('#'):
            return True
        
        # Code block markers
        if first_line.startswith('```'):
            return True
        
        # Section dividers
        if re.match(r'^[-=]{5,}$', first_line):
            return True
        
        return False
    
    def filter_resources(self, resources: List[Dict], task_keywords: Set[str],
                         max_count: int = None,
                         min_relevance: float = 0.2) -> List[Dict]:
        """
        Filter resources by relevance to task.
        
        Args:
            resources: List of resource dicts with 'name' or 'id'
            task_keywords: Keywords from current task
            max_count: Maximum resources to return
            min_relevance: Minimum relevance score
            
        Returns:
            Filtered and sorted resources
        """
        scored = []
        
        for resource in resources:
            name = resource.get('name', resource.get('id', '')).lower()
            
            # Score based on keyword matches
            score = 0.0
            for kw in task_keywords:
                if kw in name:
                    score += 0.3
                # Partial match
                elif any(kw in word for word in name.split('-')):
                    score += 0.1
            
            score = min(1.0, score)
            
            if score >= min_relevance:
                scored.append((resource, score))
        
        # Sort by score
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # Apply count limit
        if max_count:
            scored = scored[:max_count]
        
        return [r for r, s in scored]
    
    def filter_by_category(self, content: str,
                           include: Set[ContentCategory] = None,
                           exclude: Set[ContentCategory] = None) -> str:
        """
        Filter content by category.
        
        Args:
            content: Content to filter
            include: Categories to include (None = all)
            exclude: Categories to exclude
            
        Returns:
            Filtered content
        """
        scores = self.scorer.score_content(content, segment_size=30)
        lines = content.split('\n')
        
        included_segments = []
        
        for score in scores:
            # Check include list
            if include and score.category not in include:
                continue
            
            # Check exclude list
            if exclude and score.category in exclude:
                continue
            
            segment_lines = lines[score.line_start:score.line_end + 1]
            included_segments.append('\n'.join(segment_lines))
        
        return '\n\n'.join(included_segments)
    
    def filter_by_keywords(self, content: str, 
                           required_keywords: List[str] = None,
                           forbidden_keywords: List[str] = None) -> str:
        """
        Filter content by keyword presence.
        
        Args:
            content: Content to filter
            required_keywords: Must contain at least one
            forbidden_keywords: Must not contain any
            
        Returns:
            Filtered content
        """
        lines = content.split('\n')
        included_lines = []
        
        # Process in chunks
        chunk_size = 10
        for i in range(0, len(lines), chunk_size):
            chunk = '\n'.join(lines[i:i + chunk_size])
            chunk_lower = chunk.lower()
            
            include = True
            
            # Check required keywords
            if required_keywords:
                include = any(kw.lower() in chunk_lower for kw in required_keywords)
            
            # Check forbidden keywords
            if include and forbidden_keywords:
                include = not any(kw.lower() in chunk_lower for kw in forbidden_keywords)
            
            if include:
                included_lines.extend(lines[i:i + chunk_size])
        
        return '\n'.join(included_lines)
    
    def _log_filter(self, result: FilterResult):
        """Log filter operation."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "mode": result.mode.value,
            "threshold": result.threshold,
            "filter_ratio": result.filter_ratio,
            "included": result.included_segments,
            "excluded": result.excluded_segments
        }
        with open(FILTER_LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, sort_keys=True) + '\n')
    
    def get_filter_statistics(self) -> Dict[str, Any]:
        """Get filtering statistics."""
        if not FILTER_LOG.exists():
            return {"operations": 0}
        
        entries = []
        with open(FILTER_LOG, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except:
                    pass
        
        if not entries:
            return {"operations": 0}
        
        avg_ratio = sum(e.get('filter_ratio', 0) for e in entries) / len(entries)
        total_excluded = sum(e.get('excluded', 0) for e in entries)
        
        return {
            "operations": len(entries),
            "average_filter_ratio": round(avg_ratio, 3),
            "total_segments_excluded": total_excluded,
            "most_common_mode": max(set(e.get('mode', 'balanced') for e in entries),
                                    key=lambda x: sum(1 for e in entries if e.get('mode') == x))
        }


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Relevance Filter")
    parser.add_argument('--file', type=str, help='File to filter')
    parser.add_argument('--task', type=str, help='Task description')
    parser.add_argument('--mode', type=str, default='balanced',
                       choices=['strict', 'balanced', 'permissive'],
                       help='Filter mode')
    parser.add_argument('--threshold', type=float, help='Custom threshold')
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    
    args = parser.parse_args()
    filter = RelevanceFilter()
    
    if args.stats:
        stats = filter.get_filter_statistics()
        print(json.dumps(stats, indent=2))
        return
    
    if args.task:
        filter.set_task_context(args.task)
    
    if args.file:
        content = Path(args.file).read_text(encoding='utf-8')
        mode = FilterMode(args.mode)
        
        result = filter.filter_content(content, mode, args.threshold)
        
        print(f"Filter Results ({mode.value}):")
        print(f"  Included: {result.included_segments}/{result.total_segments} segments")
        print(f"  Filter ratio: {result.filter_ratio:.1%}")
        print(f"  Chars: {result.included_chars}/{result.total_chars}")
        
        if result.excluded_previews:
            print(f"\nExcluded previews:")
            for p in result.excluded_previews[:5]:
                print(f"  - {p}...")


if __name__ == "__main__":
    main()
