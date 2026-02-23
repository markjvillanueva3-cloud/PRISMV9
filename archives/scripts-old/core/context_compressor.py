#!/usr/bin/env python3
"""
PRISM Context Compressor v1.0
Session 1.2 Deliverable: Compress context when nearing limits.

Intelligently compresses context segments based on priority scores.
Preserves safety-critical and high-priority content in full.
Summarizes lower-priority content to reduce token usage.
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
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Import priority scorer
try:
    from priority_scorer import PriorityScorer, ScoredSegment, ContentType
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from priority_scorer import PriorityScorer, ScoredSegment, ContentType

class CompressionLevel(Enum):
    """Compression aggressiveness levels."""
    NONE = 0        # No compression
    LIGHT = 1       # Remove redundant only
    MODERATE = 2    # Summarize low-priority
    AGGRESSIVE = 3  # Summarize everything below STATE_DATA
    MAXIMUM = 4     # Keep only SAFETY_CRITICAL and CURRENT_TASK

@dataclass
class CompressionResult:
    """Result of compression operation."""
    original_chars: int
    compressed_chars: int
    reduction: int
    reduction_percent: float
    segments_compressed: int
    segments_preserved: int
    compression_level: CompressionLevel
    compressed_content: str
    manifest: Dict[str, Any]  # Track what was compressed for expansion

class ContextCompressor:
    """Compress context intelligently based on priority."""
    
    # Token estimation (rough: 1 token ≈ 4 chars for English)
    CHARS_PER_TOKEN = 4
    
    # Context limits (Claude's typical limits)
    MAX_CONTEXT_TOKENS = 200000
    WARNING_THRESHOLD = 0.75  # 75% full
    CRITICAL_THRESHOLD = 0.90  # 90% full
    
    def __init__(self):
        self.scorer = PriorityScorer()
        self.compression_history: List[Dict] = []
    
    def estimate_tokens(self, content: str) -> int:
        """Estimate token count from character count."""
        return len(content) // self.CHARS_PER_TOKEN
    
    def get_context_usage(self, content: str) -> Dict[str, Any]:
        """Get current context usage statistics."""
        chars = len(content)
        tokens = self.estimate_tokens(content)
        usage_ratio = tokens / self.MAX_CONTEXT_TOKENS
        
        if usage_ratio >= self.CRITICAL_THRESHOLD:
            status = "CRITICAL"
            recommended_level = CompressionLevel.MAXIMUM
        elif usage_ratio >= self.WARNING_THRESHOLD:
            status = "WARNING"
            recommended_level = CompressionLevel.AGGRESSIVE
        elif usage_ratio >= 0.5:
            status = "MODERATE"
            recommended_level = CompressionLevel.MODERATE
        else:
            status = "OK"
            recommended_level = CompressionLevel.NONE
        
        return {
            "characters": chars,
            "tokens_estimated": tokens,
            "max_tokens": self.MAX_CONTEXT_TOKENS,
            "usage_ratio": round(usage_ratio, 3),
            "usage_percent": f"{usage_ratio * 100:.1f}%",
            "status": status,
            "recommended_compression": recommended_level.name
        }
    
    def compress(self, content: str, level: CompressionLevel = None,
                 target_tokens: int = None) -> CompressionResult:
        """
        Compress content to fit within limits.
        
        Args:
            content: Content to compress
            level: Compression level (auto-detected if not provided)
            target_tokens: Target token count (uses threshold if not provided)
            
        Returns:
            CompressionResult with compressed content and metadata
        """
        original_chars = len(content)
        original_tokens = self.estimate_tokens(content)
        
        # Auto-detect compression level if not specified
        if level is None:
            usage = self.get_context_usage(content)
            level = CompressionLevel[usage['recommended_compression']]
        
        # Calculate target
        if target_tokens is None:
            target_tokens = int(self.MAX_CONTEXT_TOKENS * self.WARNING_THRESHOLD)
        
        target_chars = target_tokens * self.CHARS_PER_TOKEN
        
        # If no compression needed
        if level == CompressionLevel.NONE or original_chars <= target_chars:
            return CompressionResult(
                original_chars=original_chars,
                compressed_chars=original_chars,
                reduction=0,
                reduction_percent=0.0,
                segments_compressed=0,
                segments_preserved=0,
                compression_level=CompressionLevel.NONE,
                compressed_content=content,
                manifest={"compressed_segments": []}
            )
        
        # Score all segments
        segments = self.scorer.score_content(content)
        
        # Determine compression threshold based on level
        score_threshold = self._get_score_threshold(level)
        
        # Compress segments below threshold
        compressed_segments = []
        preserved_segments = []
        manifest_entries = []
        
        for segment in segments:
            if segment.final_score >= score_threshold:
                # Preserve high-priority segments
                preserved_segments.append(segment.content)
            else:
                # Compress low-priority segments
                compressed = self._compress_segment(segment, level)
                compressed_segments.append(compressed)
                
                # Track for potential expansion
                manifest_entries.append({
                    "line_start": segment.line_start,
                    "line_end": segment.line_end,
                    "original_type": segment.content_type.name,
                    "original_chars": segment.char_count,
                    "compressed_chars": len(compressed),
                    "hash": hashlib.md5(segment.content.encode()).hexdigest()[:8]
                })
        
        # Rebuild content
        # Put preserved content first, then compressed summaries
        compressed_content = self._rebuild_content(
            preserved_segments, 
            compressed_segments,
            level
        )
        
        compressed_chars = len(compressed_content)
        reduction = original_chars - compressed_chars
        
        result = CompressionResult(
            original_chars=original_chars,
            compressed_chars=compressed_chars,
            reduction=reduction,
            reduction_percent=round(reduction / original_chars * 100, 1),
            segments_compressed=len(compressed_segments),
            segments_preserved=len(preserved_segments),
            compression_level=level,
            compressed_content=compressed_content,
            manifest={
                "compressed_segments": manifest_entries,
                "compression_level": level.name,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Record in history
        self.compression_history.append({
            "timestamp": datetime.now().isoformat(),
            "original_chars": original_chars,
            "compressed_chars": compressed_chars,
            "level": level.name
        })
        
        return result
    
    def _get_score_threshold(self, level: CompressionLevel) -> float:
        """Get score threshold for compression level."""
        thresholds = {
            CompressionLevel.NONE: 0,
            CompressionLevel.LIGHT: 20,      # Only REDUNDANT
            CompressionLevel.MODERATE: 40,   # REDUNDANT + BOILERPLATE + HISTORICAL
            CompressionLevel.AGGRESSIVE: 70, # Everything below STATE_DATA
            CompressionLevel.MAXIMUM: 90     # Everything below CURRENT_TASK
        }
        return thresholds.get(level, 40)
    
    def _compress_segment(self, segment: ScoredSegment, level: CompressionLevel) -> str:
        """Compress a single segment based on its type and level."""
        content = segment.content.strip()
        
        if not content:
            return ""
        
        content_type = segment.content_type
        
        # REDUNDANT: Remove entirely
        if content_type == ContentType.REDUNDANT:
            return ""
        
        # BOILERPLATE: Single line summary
        if content_type == ContentType.BOILERPLATE:
            return f"[BOILERPLATE: {len(content)} chars omitted]"
        
        # HISTORICAL: Brief summary
        if content_type == ContentType.HISTORICAL:
            first_line = content.split('\n')[0][:100]
            return f"[HISTORICAL: {first_line}... ({len(content)} chars)]"
        
        # CONTEXT_INFO: Summarize key points
        if content_type == ContentType.CONTEXT_INFO:
            lines = content.split('\n')
            if len(lines) <= 3:
                return content  # Keep short context
            # Keep first and last line
            return f"{lines[0]}\n[...{len(lines)-2} lines compressed...]\n{lines[-1]}"
        
        # TOOL_RESULT: Keep only key findings
        if content_type == ContentType.TOOL_RESULT:
            # Extract any numbers or key values
            numbers = re.findall(r'\d+\.?\d*', content)
            if numbers:
                return f"[TOOL RESULT: {len(content)} chars, values: {', '.join(numbers[:5])}]"
            return f"[TOOL RESULT: {len(content)} chars compressed]"
        
        # USER_REQUEST: Keep intent, compress details
        if content_type == ContentType.USER_REQUEST:
            first_sentence = content.split('.')[0][:150]
            return f"[USER: {first_sentence}...]"
        
        # For AGGRESSIVE and MAXIMUM levels, compress more aggressively
        if level in [CompressionLevel.AGGRESSIVE, CompressionLevel.MAXIMUM]:
            if content_type == ContentType.FORMULA_RESULT:
                # Keep just the result values
                numbers = re.findall(r'[\d.]+\s*[A-Za-z]+', content)
                return f"[FORMULA: {', '.join(numbers[:3]) if numbers else 'computed'}]"
            
            if content_type == ContentType.STATE_DATA:
                # Keep just status
                return f"[STATE: {len(content)} chars, see CURRENT_STATE.json]"
        
        # Default: percentage compression
        target_len = int(len(content) * (1 - segment.compression_ratio))
        return content[:target_len] + f"... [{len(content) - target_len} chars compressed]"
    
    def _rebuild_content(self, preserved: List[str], compressed: List[str],
                         level: CompressionLevel) -> str:
        """Rebuild content from preserved and compressed segments."""
        parts = []
        
        # Add compression header
        parts.append(f"[CONTEXT COMPRESSED: Level {level.name}]")
        parts.append("")
        
        # Add preserved content
        if preserved:
            parts.append("## PRESERVED CONTENT")
            parts.extend(preserved)
            parts.append("")
        
        # Add compressed summaries
        if compressed:
            non_empty = [c for c in compressed if c.strip()]
            if non_empty:
                parts.append("## COMPRESSED SUMMARIES")
                parts.extend(non_empty)
        
        return '\n'.join(parts)
    
    def auto_compress(self, content: str) -> CompressionResult:
        """Automatically compress content based on current usage."""
        usage = self.get_context_usage(content)
        level = CompressionLevel[usage['recommended_compression']]
        return self.compress(content, level)


def main():
    """CLI for testing context compressor."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Context Compressor")
    parser.add_argument('--file', type=str, help='File to compress')
    parser.add_argument('--level', type=str, choices=['NONE', 'LIGHT', 'MODERATE', 'AGGRESSIVE', 'MAXIMUM'],
                        help='Compression level')
    parser.add_argument('--output', type=str, help='Output file for compressed content')
    
    args = parser.parse_args()
    compressor = ContextCompressor()
    
    if args.file:
        content = Path(args.file).read_text(encoding='utf-8')
    else:
        # Demo content
        content = """
# Current Task
Working on context compression system.
S(x) = 0.85 - Safety check PASSED

## Code Output
```python
def compress(self, content):
    return compressed_content
```

## Tool Results
Found 15 files matching pattern.
Total size: 45,678 bytes
Lines of code: 12,345

## Historical Context
Previously we implemented the priority scorer.
As mentioned in the last session, this builds on that work.
Earlier discussions covered the architecture decisions.

---
Separator
---

## Background Information
This is general context about the system.
It provides useful but not critical information.
Multiple lines of context that could be summarized.
More details that are nice to have.
Additional context that adds value but isn't essential.
"""
    
    # Get compression level
    level = CompressionLevel[args.level] if args.level else None
    
    # Check usage first
    usage = compressor.get_context_usage(content)
    print("\n" + "="*60)
    print("CONTEXT USAGE")
    print("="*60)
    for key, value in usage.items():
        print(f"  {key}: {value}")
    
    # Compress
    result = compressor.compress(content, level)
    
    print("\n" + "="*60)
    print("COMPRESSION RESULT")
    print("="*60)
    print(f"  Original: {result.original_chars} chars")
    print(f"  Compressed: {result.compressed_chars} chars")
    print(f"  Reduction: {result.reduction} chars ({result.reduction_percent}%)")
    print(f"  Segments preserved: {result.segments_preserved}")
    print(f"  Segments compressed: {result.segments_compressed}")
    print(f"  Compression level: {result.compression_level.name}")
    
    if args.output:
        Path(args.output).write_text(result.compressed_content, encoding='utf-8')
        print(f"\n  Saved to: {args.output}")
    else:
        print("\n" + "="*60)
        print("COMPRESSED CONTENT")
        print("="*60)
        print(result.compressed_content[:1000])
        if len(result.compressed_content) > 1000:
            print(f"\n... [{len(result.compressed_content) - 1000} more chars]")


if __name__ == "__main__":
    main()
