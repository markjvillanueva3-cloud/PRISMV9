#!/usr/bin/env python3
"""
PRISM Context MCP Tools v1.0
Session 1.2 Deliverables: prism_context_compress, prism_context_expand, prism_context_size

Provides MCP tools for context compression and expansion.
"""
import sys
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
from pathlib import Path
from typing import Dict, Any, Optional

# Import components
try:
    from auto_compress import AutoCompress
    from context_compressor import CompressionLevel
    from context_monitor import ContextMonitor
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from auto_compress import AutoCompress
    from context_compressor import CompressionLevel
    from context_monitor import ContextMonitor


class ContextMCP:
    """MCP tools for context management."""
    
    def __init__(self):
        self.auto_compress = AutoCompress()
        self.monitor = ContextMonitor()
    
    def prism_context_size(self, content: str = None, tokens: int = None) -> Dict[str, Any]:
        """
        Check current context size and status.
        
        Args:
            content: Content to measure (optional)
            tokens: Direct token count (optional)
            
        Returns:
            Dict with size info, status, and recommendations
        """
        if content:
            result = self.monitor.check(content=content)
        elif tokens:
            result = self.monitor.check(tokens=tokens)
        else:
            result = self.monitor.get_summary()
        
        # Add trend analysis
        trend = self.monitor.get_trend()
        result['trend'] = trend
        
        # Add action flags
        result['should_compress'] = self.monitor.should_compress()
        result['should_checkpoint'] = self.auto_compress.should_checkpoint()
        result['should_handoff'] = self.monitor.should_handoff()
        result['should_stop'] = self.monitor.should_stop()
        
        return result
    
    def prism_context_compress(self, content: str, level: str = None,
                               force: bool = False) -> Dict[str, Any]:
        """
        Compress context content.
        
        Args:
            content: Content to compress
            level: Compression level (NONE, LIGHT, MODERATE, AGGRESSIVE, MAXIMUM)
            force: Force compression even if not needed
            
        Returns:
            Dict with compressed content and metadata
        """
        # Parse level if provided
        compression_level = None
        if level:
            try:
                compression_level = CompressionLevel[level.upper()]
            except KeyError:
                return {
                    "error": f"Invalid level: {level}",
                    "valid_levels": ["NONE", "LIGHT", "MODERATE", "AGGRESSIVE", "MAXIMUM"]
                }
        
        # Process through auto-compress
        compressed_content, result = self.auto_compress.get_compressed(
            content, force, compression_level
        )
        
        return {
            "triggered": result.triggered,
            "reason": result.reason,
            "status_before": result.status_before,
            "status_after": result.status_after,
            "original_chars": result.original_chars,
            "compressed_chars": result.final_chars,
            "reduction": result.reduction,
            "reduction_percent": result.reduction_percent,
            "compression_level": result.compression_level,
            "segments_compressed": result.segments_compressed,
            "compressed_content": compressed_content,
            "recommendation": result.recommendation
        }
    
    def prism_context_expand(self, compressed_content: str, 
                             manifest_hash: str = None,
                             content_types: list = None) -> Dict[str, Any]:
        """
        Expand compressed context content.
        
        Args:
            compressed_content: Compressed content to expand
            manifest_hash: Hash to find stored manifest (optional)
            content_types: List of content types to expand (optional)
            
        Returns:
            Dict with expanded content and metadata
        """
        # Get original chars
        original_chars = len(compressed_content)
        
        # Expand
        expanded_content = self.auto_compress.expand(compressed_content, manifest_hash)
        
        # Calculate expansion
        expanded_chars = len(expanded_content)
        increase = expanded_chars - original_chars
        
        # Get expandable types
        expandable = self.auto_compress.expander.get_expandable_types(compressed_content)
        
        return {
            "original_chars": original_chars,
            "expanded_chars": expanded_chars,
            "increase": increase,
            "increase_percent": round(increase / max(original_chars, 1) * 100, 1),
            "expandable_types": expandable,
            "expanded_content": expanded_content
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Generic call interface for MCP integration."""
        params = params or {}
        
        if tool_name == "prism_context_size":
            return self.prism_context_size(**params)
        elif tool_name == "prism_context_compress":
            return self.prism_context_compress(**params)
        elif tool_name == "prism_context_expand":
            return self.prism_context_expand(**params)
        else:
            return {"error": f"Unknown tool: {tool_name}"}


def main():
    """CLI for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Context MCP Tools")
    parser.add_argument('--size', type=int, help='Check size with token count')
    parser.add_argument('--compress', type=str, help='Compress file')
    parser.add_argument('--level', type=str, help='Compression level')
    parser.add_argument('--expand', type=str, help='Expand file')
    
    args = parser.parse_args()
    mcp = ContextMCP()
    
    if args.size:
        result = mcp.prism_context_size(tokens=args.size)
        print(json.dumps(result, indent=2, default=str))
    
    elif args.compress:
        content = Path(args.compress).read_text(encoding='utf-8')
        result = mcp.prism_context_compress(content, args.level)
        print(json.dumps({k: v for k, v in result.items() if k != 'compressed_content'}, indent=2))
        print(f"\nCompressed content length: {len(result.get('compressed_content', ''))}")
    
    elif args.expand:
        content = Path(args.expand).read_text(encoding='utf-8')
        result = mcp.prism_context_expand(content)
        print(json.dumps({k: v for k, v in result.items() if k != 'expanded_content'}, indent=2))
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
