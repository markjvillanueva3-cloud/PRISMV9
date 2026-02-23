#!/usr/bin/env python3
"""
PRISM Attention Scorer v1.0
Session 1.4 Deliverable: Score content relevance for attention focus.

Scores content segments by relevance to current task:
- Task keywords and context matching
- Recency weighting
- Dependency analysis
- Usage frequency tracking
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
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict, field
from enum import Enum
from collections import Counter

# Paths
PRISM_ROOT = Path("C:/PRISM")
ATTENTION_LOG = PRISM_ROOT / "state" / "ATTENTION_LOG.jsonl"
USAGE_STATS = PRISM_ROOT / "state" / "USAGE_STATS.json"

class ContentCategory(Enum):
    """Categories of content for attention scoring."""
    TASK_DIRECT = "task_direct"        # Directly related to current task
    TASK_SUPPORT = "task_support"      # Supporting info for task
    REFERENCE = "reference"            # Reference material
    HISTORICAL = "historical"          # Past conversation context
    METADATA = "metadata"              # System/config info
    BOILERPLATE = "boilerplate"        # Standard text, headers
    IRRELEVANT = "irrelevant"          # Not relevant to task

@dataclass
class AttentionScore:
    """Score for a content segment."""
    segment_id: str
    content_hash: str
    category: ContentCategory
    
    # Core scores (0-1 scale)
    keyword_score: float = 0.0      # Task keyword match
    semantic_score: float = 0.0     # Semantic relevance
    recency_score: float = 0.0      # How recent
    dependency_score: float = 0.0   # Required by other content
    usage_score: float = 0.0        # Historical usage frequency
    
    # Final computed score
    attention_score: float = 0.0
    
    # Metadata
    content_preview: str = ""
    char_count: int = 0
    line_start: int = 0
    line_end: int = 0
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d['category'] = self.category.value
        return d

class AttentionScorer:
    """Score content relevance for attention focus."""
    
    # Weight configuration
    WEIGHTS = {
        'keyword': 0.35,
        'semantic': 0.25,
        'recency': 0.15,
        'dependency': 0.15,
        'usage': 0.10
    }
    
    # Category base scores
    CATEGORY_BASES = {
        ContentCategory.TASK_DIRECT: 0.9,
        ContentCategory.TASK_SUPPORT: 0.7,
        ContentCategory.REFERENCE: 0.5,
        ContentCategory.HISTORICAL: 0.3,
        ContentCategory.METADATA: 0.2,
        ContentCategory.BOILERPLATE: 0.1,
        ContentCategory.IRRELEVANT: 0.0
    }
    
    # High-value keywords by domain
    DOMAIN_KEYWORDS = {
        'manufacturing': ['cnc', 'machining', 'toolpath', 'spindle', 'feed', 'speed', 
                         'material', 'cutting', 'milling', 'turning', 'g-code'],
        'physics': ['kienzle', 'taylor', 'johnson-cook', 'force', 'stress', 'thermal',
                   'coefficient', 'formula', 'equation', 'calculate'],
        'safety': ['safety', 'collision', 'alarm', 'error', 'block', 'limit', 'critical'],
        'code': ['python', 'function', 'class', 'import', 'def', 'return', 'error', 'exception'],
        'session': ['checkpoint', 'state', 'resume', 'handoff', 'context', 'compress']
    }
    
    def __init__(self):
        self._ensure_paths()
        self.usage_stats = self._load_usage_stats()
        self.current_task_keywords: Set[str] = set()
        self.dependency_graph: Dict[str, Set[str]] = {}
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        ATTENTION_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_usage_stats(self) -> Dict[str, int]:
        """Load historical usage statistics."""
        if USAGE_STATS.exists():
            try:
                return json.loads(USAGE_STATS.read_text(encoding='utf-8'))
            except:
                pass
        return {}
    
    def _save_usage_stats(self):
        """Save usage statistics."""
        USAGE_STATS.write_text(
            json.dumps(self.usage_stats, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def _generate_id(self, content: str, line_start: int = 0) -> str:
        """Generate segment ID."""
        hash_part = hashlib.md5(content[:100].encode()).hexdigest()[:8]
        return f"SEG-{line_start}-{hash_part}"
    
    def set_task_context(self, task_description: str, keywords: List[str] = None):
        """
        Set the current task context for scoring.
        
        Args:
            task_description: Description of current task
            keywords: Optional explicit keywords
        """
        # Extract keywords from description
        words = re.findall(r'\b[a-z_]+\b', task_description.lower())
        self.current_task_keywords = set(words)
        
        # Add explicit keywords
        if keywords:
            self.current_task_keywords.update(k.lower() for k in keywords)
        
        # Add domain keywords if domain detected
        for domain, domain_kw in self.DOMAIN_KEYWORDS.items():
            if any(kw in task_description.lower() for kw in domain_kw[:3]):
                self.current_task_keywords.update(domain_kw)
    
    def score_segment(self, content: str, line_start: int = 0,
                      timestamp: datetime = None) -> AttentionScore:
        """
        Score a content segment for attention relevance.
        
        Args:
            content: The content segment
            line_start: Starting line number
            timestamp: When content was created/modified
            
        Returns:
            AttentionScore with computed scores
        """
        segment_id = self._generate_id(content, line_start)
        content_hash = hashlib.md5(content.encode()).hexdigest()
        
        # Categorize content
        category = self._categorize(content)
        
        # Compute individual scores
        keyword_score = self._score_keywords(content)
        semantic_score = self._score_semantic(content, category)
        recency_score = self._score_recency(timestamp)
        dependency_score = self._score_dependency(segment_id)
        usage_score = self._score_usage(content_hash)
        
        # Compute weighted final score
        attention_score = (
            self.WEIGHTS['keyword'] * keyword_score +
            self.WEIGHTS['semantic'] * semantic_score +
            self.WEIGHTS['recency'] * recency_score +
            self.WEIGHTS['dependency'] * dependency_score +
            self.WEIGHTS['usage'] * usage_score
        )
        
        # Apply category base modifier
        category_base = self.CATEGORY_BASES[category]
        attention_score = 0.5 * attention_score + 0.5 * category_base
        
        lines = content.split('\n')
        
        return AttentionScore(
            segment_id=segment_id,
            content_hash=content_hash,
            category=category,
            keyword_score=keyword_score,
            semantic_score=semantic_score,
            recency_score=recency_score,
            dependency_score=dependency_score,
            usage_score=usage_score,
            attention_score=round(attention_score, 3),
            content_preview=content[:100].replace('\n', ' '),
            char_count=len(content),
            line_start=line_start,
            line_end=line_start + len(lines) - 1
        )
    
    def score_content(self, content: str, segment_size: int = 50) -> List[AttentionScore]:
        """
        Score entire content by segments.
        
        Args:
            content: Full content to score
            segment_size: Lines per segment
            
        Returns:
            List of AttentionScore for each segment
        """
        scores = []
        lines = content.split('\n')
        
        for i in range(0, len(lines), segment_size):
            segment_lines = lines[i:i + segment_size]
            segment = '\n'.join(segment_lines)
            
            if segment.strip():
                score = self.score_segment(segment, line_start=i)
                scores.append(score)
        
        return scores
    
    def _categorize(self, content: str) -> ContentCategory:
        """Categorize content segment."""
        content_lower = content.lower()
        
        # Check for task-direct indicators
        if self.current_task_keywords:
            keyword_density = sum(1 for kw in self.current_task_keywords 
                                  if kw in content_lower) / max(len(self.current_task_keywords), 1)
            if keyword_density > 0.3:
                return ContentCategory.TASK_DIRECT
            if keyword_density > 0.1:
                return ContentCategory.TASK_SUPPORT
        
        # Check for reference material
        if any(marker in content_lower for marker in ['reference', 'see also', 'documentation', 'manual']):
            return ContentCategory.REFERENCE
        
        # Check for historical
        if any(marker in content_lower for marker in ['previously', 'earlier', 'last session', 'history']):
            return ContentCategory.HISTORICAL
        
        # Check for metadata
        if any(marker in content_lower for marker in ['version', 'config', 'setting', 'parameter']):
            return ContentCategory.METADATA
        
        # Check for boilerplate
        if self._is_boilerplate(content):
            return ContentCategory.BOILERPLATE
        
        # Default to reference if has some content
        if len(content.strip()) > 50:
            return ContentCategory.REFERENCE
        
        return ContentCategory.IRRELEVANT
    
    def _is_boilerplate(self, content: str) -> bool:
        """Check if content is boilerplate."""
        boilerplate_patterns = [
            r'^[-=]{10,}$',           # Separators
            r'^#{1,6}\s*$',           # Empty headers
            r'^\s*\*{3,}\s*$',        # Asterisk lines
            r'^(note|warning|info):\s*$',  # Empty notes
        ]
        
        lines = content.strip().split('\n')
        if len(lines) <= 2:
            for pattern in boilerplate_patterns:
                if all(re.match(pattern, line.strip(), re.IGNORECASE) for line in lines if line.strip()):
                    return True
        
        return False
    
    def _score_keywords(self, content: str) -> float:
        """Score based on task keyword matches."""
        if not self.current_task_keywords:
            return 0.5  # Neutral if no task set
        
        content_lower = content.lower()
        words = set(re.findall(r'\b[a-z_]+\b', content_lower))
        
        matches = words & self.current_task_keywords
        
        if not matches:
            return 0.0
        
        # Score based on match ratio and importance
        match_ratio = len(matches) / len(self.current_task_keywords)
        
        # Boost for multiple matches
        if len(matches) >= 5:
            match_ratio = min(1.0, match_ratio * 1.3)
        
        return min(1.0, match_ratio)
    
    def _score_semantic(self, content: str, category: ContentCategory) -> float:
        """Score semantic relevance (simplified)."""
        # Base on category
        base = self.CATEGORY_BASES[category]
        
        # Boost for code blocks
        if '```' in content or 'def ' in content or 'class ' in content:
            base = min(1.0, base + 0.2)
        
        # Boost for data/numbers (likely calculations)
        numbers = len(re.findall(r'\d+\.?\d*', content))
        if numbers > 5:
            base = min(1.0, base + 0.1)
        
        return base
    
    def _score_recency(self, timestamp: datetime = None) -> float:
        """Score based on recency."""
        if timestamp is None:
            return 0.5  # Neutral if no timestamp
        
        age = datetime.now() - timestamp
        
        # Score decay over time
        if age < timedelta(minutes=5):
            return 1.0
        elif age < timedelta(minutes=30):
            return 0.8
        elif age < timedelta(hours=1):
            return 0.6
        elif age < timedelta(hours=24):
            return 0.4
        else:
            return 0.2
    
    def _score_dependency(self, segment_id: str) -> float:
        """Score based on dependency (how many other segments need this)."""
        if segment_id not in self.dependency_graph:
            return 0.3  # Default moderate
        
        dependents = len(self.dependency_graph[segment_id])
        
        if dependents >= 5:
            return 1.0
        elif dependents >= 3:
            return 0.8
        elif dependents >= 1:
            return 0.6
        
        return 0.3
    
    def _score_usage(self, content_hash: str) -> float:
        """Score based on historical usage frequency."""
        usage_count = self.usage_stats.get(content_hash, 0)
        
        if usage_count >= 10:
            return 1.0
        elif usage_count >= 5:
            return 0.8
        elif usage_count >= 2:
            return 0.6
        elif usage_count >= 1:
            return 0.4
        
        return 0.2
    
    def record_usage(self, content_hash: str):
        """Record that content was used."""
        self.usage_stats[content_hash] = self.usage_stats.get(content_hash, 0) + 1
        self._save_usage_stats()
    
    def add_dependency(self, from_id: str, to_id: str):
        """Add dependency relationship."""
        if to_id not in self.dependency_graph:
            self.dependency_graph[to_id] = set()
        self.dependency_graph[to_id].add(from_id)
    
    def get_top_segments(self, scores: List[AttentionScore], 
                         count: int = 10,
                         min_score: float = 0.3) -> List[AttentionScore]:
        """Get top-scoring segments."""
        filtered = [s for s in scores if s.attention_score >= min_score]
        sorted_scores = sorted(filtered, key=lambda s: s.attention_score, reverse=True)
        return sorted_scores[:count]
    
    def get_summary(self, scores: List[AttentionScore]) -> Dict[str, Any]:
        """Get summary of attention scores."""
        if not scores:
            return {"total_segments": 0}
        
        by_category = Counter(s.category.value for s in scores)
        avg_score = sum(s.attention_score for s in scores) / len(scores)
        
        return {
            "total_segments": len(scores),
            "by_category": dict(by_category),
            "average_score": round(avg_score, 3),
            "high_attention": len([s for s in scores if s.attention_score >= 0.7]),
            "low_attention": len([s for s in scores if s.attention_score < 0.3]),
            "total_chars": sum(s.char_count for s in scores)
        }


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Attention Scorer")
    parser.add_argument('--task', type=str, help='Set task context')
    parser.add_argument('--score', type=str, help='Score content from file')
    parser.add_argument('--segment-size', type=int, default=50, help='Lines per segment')
    
    args = parser.parse_args()
    scorer = AttentionScorer()
    
    if args.task:
        scorer.set_task_context(args.task)
        print(f"Task keywords: {scorer.current_task_keywords}")
    
    if args.score:
        content = Path(args.score).read_text(encoding='utf-8')
        scores = scorer.score_content(content, args.segment_size)
        summary = scorer.get_summary(scores)
        print(json.dumps(summary, indent=2))
        
        print("\nTop 5 segments:")
        for s in scorer.get_top_segments(scores, 5):
            print(f"  [{s.attention_score:.2f}] {s.category.value}: {s.content_preview[:50]}...")


if __name__ == "__main__":
    main()
