#!/usr/bin/env python3
"""
PRISM Context Expander v1.0
Session 1.2 Deliverable: Expand compressed context when needed.

Restores compressed segments using stored manifests.
Allows selective expansion of specific content types.
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
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# Paths
PRISM_ROOT = Path("C:/PRISM")
EXPANSION_CACHE = PRISM_ROOT / "state" / "EXPANSION_CACHE"

@dataclass
class ExpansionResult:
    """Result of expansion operation."""
    original_chars: int
    expanded_chars: int
    increase: int
    increase_percent: float
    segments_expanded: int
    expansion_source: str
    expanded_content: str
    warnings: List[str]

class ContextExpander:
    """Expand compressed context when full detail needed."""
    
    def __init__(self):
        self._ensure_paths()
        self.expansion_cache: Dict[str, str] = {}
        self._load_cache()
    
    def _ensure_paths(self):
        """Ensure required directories exist."""
        EXPANSION_CACHE.mkdir(parents=True, exist_ok=True)
    
    def _load_cache(self):
        """Load expansion cache from disk."""
        cache_file = EXPANSION_CACHE / "cache.json"
        if cache_file.exists():
            try:
                self.expansion_cache = json.loads(cache_file.read_text(encoding='utf-8'))
            except:
                self.expansion_cache = {}
    
    def _save_cache(self):
        """Save expansion cache to disk."""
        cache_file = EXPANSION_CACHE / "cache.json"
        cache_file.write_text(
            json.dumps(self.expansion_cache, indent=2, sort_keys=True),
            encoding='utf-8'
        )
    
    def store_original(self, content: str, hash_key: str = None) -> str:
        """
        Store original content for later expansion.
        
        Args:
            content: Original uncompressed content
            hash_key: Optional hash key (generated if not provided)
            
        Returns:
            Hash key for retrieval
        """
        if hash_key is None:
            hash_key = hashlib.md5(content.encode()).hexdigest()[:16]
        
        # Store in cache
        self.expansion_cache[hash_key] = content
        
        # Also store to disk for persistence
        file_path = EXPANSION_CACHE / f"{hash_key}.txt"
        file_path.write_text(content, encoding='utf-8')
        
        self._save_cache()
        return hash_key
    
    def expand(self, compressed_content: str, manifest: Dict[str, Any] = None,
               expand_types: List[str] = None) -> ExpansionResult:
        """
        Expand compressed content.
        
        Args:
            compressed_content: Content with compression markers
            manifest: Compression manifest with segment info
            expand_types: List of content types to expand (all if None)
            
        Returns:
            ExpansionResult with expanded content
        """
        original_chars = len(compressed_content)
        warnings = []
        expanded_segments = 0
        
        expanded_content = compressed_content
        
        # Method 1: Expand using manifest
        if manifest and 'compressed_segments' in manifest:
            for segment_info in manifest['compressed_segments']:
                hash_key = segment_info.get('hash')
                content_type = segment_info.get('original_type', '')
                
                # Check if we should expand this type
                if expand_types and content_type not in expand_types:
                    continue
                
                # Try to retrieve original
                original = self._retrieve_original(hash_key)
                if original:
                    # Find and replace compression marker
                    expanded_content = self._replace_compressed(
                        expanded_content, 
                        segment_info,
                        original
                    )
                    expanded_segments += 1
                else:
                    warnings.append(f"Could not expand segment {hash_key}")
        
        # Method 2: Expand inline markers
        expanded_content, inline_expanded = self._expand_inline_markers(
            expanded_content, expand_types
        )
        expanded_segments += inline_expanded
        
        expanded_chars = len(expanded_content)
        increase = expanded_chars - original_chars
        
        return ExpansionResult(
            original_chars=original_chars,
            expanded_chars=expanded_chars,
            increase=increase,
            increase_percent=round(increase / max(original_chars, 1) * 100, 1),
            segments_expanded=expanded_segments,
            expansion_source="manifest" if manifest else "inline",
            expanded_content=expanded_content,
            warnings=warnings
        )
    
    def _retrieve_original(self, hash_key: str) -> Optional[str]:
        """Retrieve original content by hash."""
        # Try memory cache first
        if hash_key in self.expansion_cache:
            return self.expansion_cache[hash_key]
        
        # Try disk cache
        file_path = EXPANSION_CACHE / f"{hash_key}.txt"
        if file_path.exists():
            content = file_path.read_text(encoding='utf-8')
            self.expansion_cache[hash_key] = content
            return content
        
        return None
    
    def _replace_compressed(self, content: str, segment_info: Dict, 
                           original: str) -> str:
        """Replace a compressed marker with original content."""
        # Build pattern to find the compression marker
        original_chars = segment_info.get('original_chars', 0)
        content_type = segment_info.get('original_type', '')
        
        # Try various marker patterns
        patterns = [
            rf'\[{content_type}:.*?{original_chars}\s*chars.*?\]',
            rf'\[.*?{original_chars}\s*chars\s*compressed\]',
            rf'\[{content_type}:.*?\]',
        ]
        
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                content = re.sub(pattern, original, content, count=1, flags=re.IGNORECASE)
                return content
        
        return content
    
    def _expand_inline_markers(self, content: str, 
                              expand_types: List[str] = None) -> tuple:
        """Expand inline compression markers."""
        expanded = 0
        
        # Pattern for inline markers: [TYPE: ... chars compressed]
        marker_pattern = r'\[(\w+):\s*(.+?)\s+\((\d+)\s+chars\)\]'
        
        def expand_marker(match):
            nonlocal expanded
            content_type = match.group(1)
            preview = match.group(2)
            original_chars = int(match.group(3))
            
            # Check if we should expand this type
            if expand_types and content_type not in expand_types:
                return match.group(0)
            
            # Try to find in cache by preview hash
            preview_hash = hashlib.md5(preview.encode()).hexdigest()[:8]
            original = self._retrieve_original(preview_hash)
            
            if original:
                expanded += 1
                return original
            
            # Cannot expand - return as is
            return match.group(0)
        
        expanded_content = re.sub(marker_pattern, expand_marker, content)
        
        return expanded_content, expanded
    
    def expand_type(self, compressed_content: str, content_type: str) -> str:
        """Expand only segments of a specific type."""
        result = self.expand(compressed_content, expand_types=[content_type])
        return result.expanded_content
    
    def expand_all(self, compressed_content: str, manifest: Dict = None) -> str:
        """Expand all compressed segments."""
        result = self.expand(compressed_content, manifest)
        return result.expanded_content
    
    def get_expandable_types(self, content: str) -> List[str]:
        """Get list of content types that can be expanded."""
        # Find all inline markers
        marker_pattern = r'\[(\w+):'
        matches = re.findall(marker_pattern, content)
        return list(set(matches))
    
    def clear_cache(self, older_than_days: int = 7):
        """Clear old entries from expansion cache."""
        now = datetime.now()
        cleared = 0
        
        for file_path in EXPANSION_CACHE.glob("*.txt"):
            mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            age_days = (now - mtime).days
            
            if age_days > older_than_days:
                file_path.unlink()
                cleared += 1
        
        # Rebuild memory cache
        self.expansion_cache = {}
        self._load_cache()
        
        return {"cleared": cleared, "remaining": len(self.expansion_cache)}


def main():
    """CLI for testing context expander."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Context Expander")
    parser.add_argument('--file', type=str, help='Compressed file to expand')
    parser.add_argument('--type', type=str, help='Specific type to expand')
    parser.add_argument('--clear', type=int, help='Clear cache older than N days')
    parser.add_argument('--list-types', action='store_true', help='List expandable types')
    
    args = parser.parse_args()
    expander = ContextExpander()
    
    if args.clear:
        result = expander.clear_cache(args.clear)
        print(f"Cleared {result['cleared']} entries, {result['remaining']} remaining")
        return
    
    if args.file:
        content = Path(args.file).read_text(encoding='utf-8')
    else:
        # Demo compressed content
        content = """
[CONTEXT COMPRESSED: Level MODERATE]

## PRESERVED CONTENT
# Current Task
Working on context expansion system.
S(x) = 0.85 - Safety check PASSED

## COMPRESSED SUMMARIES
[HISTORICAL: Previously we implemented... (450 chars)]
[TOOL_RESULT: 15 files, values: 45678, 12345]
[BOILERPLATE: 200 chars omitted]
"""
    
    if args.list_types:
        types = expander.get_expandable_types(content)
        print(f"Expandable types: {', '.join(types)}")
        return
    
    # Expand
    if args.type:
        result = expander.expand(content, expand_types=[args.type])
    else:
        result = expander.expand(content)
    
    print("\n" + "="*60)
    print("EXPANSION RESULT")
    print("="*60)
    print(f"  Original: {result.original_chars} chars")
    print(f"  Expanded: {result.expanded_chars} chars")
    print(f"  Increase: {result.increase} chars ({result.increase_percent}%)")
    print(f"  Segments expanded: {result.segments_expanded}")
    print(f"  Source: {result.expansion_source}")
    
    if result.warnings:
        print(f"  Warnings: {', '.join(result.warnings)}")
    
    print("\n" + "="*60)
    print("EXPANDED CONTENT")
    print("="*60)
    print(result.expanded_content)


if __name__ == "__main__":
    main()
