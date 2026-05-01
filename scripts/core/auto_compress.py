#!/usr/bin/env python3
"""
PRISM Auto Compress v1.0
Session 1.2 Deliverable: Automatic compression orchestration.

Orchestrates the compression pipeline: monitor → score → compress → store.
Provides single-call interface for automatic context management.
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
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Import components
try:
    from priority_scorer import PriorityScorer
    from context_compressor import ContextCompressor, CompressionLevel
    from context_expander import ContextExpander
    from context_monitor import ContextMonitor, ContextStatus
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from priority_scorer import PriorityScorer
    from context_compressor import ContextCompressor, CompressionLevel
    from context_expander import ContextExpander
    from context_monitor import ContextMonitor, ContextStatus

# Paths
PRISM_ROOT = Path("C:/PRISM")
AUTO_COMPRESS_LOG = PRISM_ROOT / "state" / "AUTO_COMPRESS.jsonl"

@dataclass
class AutoCompressResult:
    """Result of auto-compression operation."""
    triggered: bool
    reason: str
    status_before: str
    status_after: str
    original_chars: int
    final_chars: int
    reduction: int
    reduction_percent: float
    compression_level: str
    segments_compressed: int
    manifest_stored: bool
    recommendation: str

class AutoCompress:
    """Automatic context compression orchestration."""
    
    def __init__(self):
        self.monitor = ContextMonitor()
        self.compressor = ContextCompressor()
        self.expander = ContextExpander()
        self.scorer = PriorityScorer()
        self._ensure_paths()
    
    def _ensure_paths(self):
        """Ensure required paths exist."""
        AUTO_COMPRESS_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    def process(self, content: str, force: bool = False, 
                level: CompressionLevel = None) -> AutoCompressResult:
        """
        Process content through compression pipeline.
        
        Args:
            content: Content to process
            force: Force compression even if not needed
            level: Override compression level
            
        Returns:
            AutoCompressResult with processing details
        """
        # Step 1: Check current status
        status_result = self.monitor.check(content=content)
        status_before = status_result['status']
        original_chars = len(content)
        
        # Step 2: Determine if compression needed
        should_compress = (
            force or 
            self.monitor.should_compress() or
            status_before in ['ORANGE', 'RED', 'CRITICAL']
        )
        
        if not should_compress:
            return AutoCompressResult(
                triggered=False,
                reason="Context usage within safe limits",
                status_before=status_before,
                status_after=status_before,
                original_chars=original_chars,
                final_chars=original_chars,
                reduction=0,
                reduction_percent=0.0,
                compression_level="NONE",
                segments_compressed=0,
                manifest_stored=False,
                recommendation=status_result['recommendation']
            )
        
        # Step 3: Store original for potential expansion
        original_hash = self.expander.store_original(content)
        
        # Step 4: Score content
        segments = self.scorer.score_content(content)
        
        # Step 5: Determine compression level
        if level is None:
            level = self._determine_level(status_before)
        
        # Step 6: Compress
        compress_result = self.compressor.compress(content, level)
        
        # Step 7: Verify compression worked
        final_chars = len(compress_result.compressed_content)
        status_after_result = self.monitor.check(content=compress_result.compressed_content)
        status_after = status_after_result['status']
        
        # Step 8: Store manifest
        manifest_path = self._store_manifest(compress_result.manifest, original_hash)
        
        # Step 9: Log result
        result = AutoCompressResult(
            triggered=True,
            reason=f"Status was {status_before}",
            status_before=status_before,
            status_after=status_after,
            original_chars=original_chars,
            final_chars=final_chars,
            reduction=compress_result.reduction,
            reduction_percent=compress_result.reduction_percent,
            compression_level=level.name,
            segments_compressed=compress_result.segments_compressed,
            manifest_stored=manifest_path is not None,
            recommendation=status_after_result['recommendation']
        )
        
        self._log_result(result)
        
        # Update monitor state
        self.monitor.set_compression(True)
        
        return result
    
    def _determine_level(self, status: str) -> CompressionLevel:
        """Determine compression level from status."""
        level_map = {
            'GREEN': CompressionLevel.NONE,
            'YELLOW': CompressionLevel.LIGHT,
            'ORANGE': CompressionLevel.MODERATE,
            'RED': CompressionLevel.AGGRESSIVE,
            'CRITICAL': CompressionLevel.MAXIMUM
        }
        return level_map.get(status, CompressionLevel.MODERATE)
    
    def _store_manifest(self, manifest: Dict, original_hash: str) -> Optional[Path]:
        """Store compression manifest."""
        try:
            manifest['original_hash'] = original_hash
            manifest['stored_at'] = datetime.now().isoformat()
            
            manifest_path = PRISM_ROOT / "state" / "compression_manifests" / f"{original_hash}.json"
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            manifest_path.write_text(
                json.dumps(manifest, indent=2, sort_keys=True),
                encoding='utf-8'
            )
            return manifest_path
        except Exception as e:
            print(f"Warning: Could not store manifest: {e}")
            return None
    
    def _log_result(self, result: AutoCompressResult):
        """Log compression result."""
        try:
            with open(AUTO_COMPRESS_LOG, 'a', encoding='utf-8') as f:
                entry = asdict(result)
                entry['timestamp'] = datetime.now().isoformat()
                f.write(json.dumps(entry, sort_keys=True) + '\n')
        except:
            pass
    
    def get_compressed(self, content: str, force: bool = False,
                       level: CompressionLevel = None) -> Tuple[str, AutoCompressResult]:
        """
        Get compressed content directly.
        
        Args:
            content: Content to compress
            force: Force compression
            level: Override level
            
        Returns:
            Tuple of (compressed_content, result)
        """
        result = self.process(content, force, level)
        
        if result.triggered:
            # Return compressed content
            compress_result = self.compressor.compress(content, 
                CompressionLevel[result.compression_level])
            return compress_result.compressed_content, result
        
        return content, result
    
    def expand(self, compressed_content: str, manifest_hash: str = None) -> str:
        """
        Expand compressed content.
        
        Args:
            compressed_content: Compressed content
            manifest_hash: Hash to find manifest
            
        Returns:
            Expanded content
        """
        manifest = None
        
        if manifest_hash:
            manifest_path = PRISM_ROOT / "state" / "compression_manifests" / f"{manifest_hash}.json"
            if manifest_path.exists():
                manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        
        result = self.expander.expand(compressed_content, manifest)
        return result.expanded_content
    
    def get_status(self, content: str = None, tokens: int = None) -> Dict[str, Any]:
        """Get current context status."""
        if content:
            return self.monitor.check(content=content)
        elif tokens:
            return self.monitor.check(tokens=tokens)
        return self.monitor.get_summary()
    
    def should_checkpoint(self) -> bool:
        """Check if checkpoint recommended."""
        return self.monitor.current_status in [
            ContextStatus.YELLOW, 
            ContextStatus.ORANGE
        ]
    
    def should_handoff(self) -> bool:
        """Check if handoff recommended."""
        return self.monitor.should_handoff()
    
    def should_stop(self) -> bool:
        """Check if immediate stop needed."""
        return self.monitor.should_stop()


def main():
    """CLI for auto-compress."""
    import argparse
    parser = argparse.ArgumentParser(description="PRISM Auto Compress")
    parser.add_argument('--file', type=str, help='File to process')
    parser.add_argument('--force', action='store_true', help='Force compression')
    parser.add_argument('--level', type=str, 
                       choices=['NONE', 'LIGHT', 'MODERATE', 'AGGRESSIVE', 'MAXIMUM'],
                       help='Compression level')
    parser.add_argument('--status', action='store_true', help='Show status only')
    parser.add_argument('--output', type=str, help='Output file')
    
    args = parser.parse_args()
    auto = AutoCompress()
    
    if args.status:
        result = auto.get_status()
        print(json.dumps(result, indent=2, default=str))
        return
    
    if args.file:
        content = Path(args.file).read_text(encoding='utf-8')
    else:
        # Demo content
        content = """
# Current Task
Working on auto-compression orchestration.
S(x) = 0.85 - Safety check PASSED

## Important Code
```python
def main():
    auto = AutoCompress()
    result = auto.process(content)
    return result
```

## Tool Results
Search found 25 matching files.
Total processing time: 1.5 seconds.
Memory usage: 128MB peak.

## Historical Context
In the previous session, we implemented the individual components.
The priority scorer was completed with 377 lines.
The compressor has 399 lines of sophisticated logic.
The expander provides restoration capabilities.
Earlier work established the monitoring thresholds.

## Background Information
This is general contextual information.
It provides useful background but isn't critical.
Multiple paragraphs of context follow.
Additional details that add value.
More information that could be summarized.
Extra context that isn't essential to current work.

---
Separator content
---
""" * 3  # Triple to make it bigger
    
    level = CompressionLevel[args.level] if args.level else None
    
    print("\n" + "="*60)
    print("AUTO-COMPRESS PROCESSING")
    print("="*60)
    
    compressed, result = auto.get_compressed(content, args.force, level)
    
    print(f"\n{'='*60}")
    print("RESULT")
    print("="*60)
    for key, value in asdict(result).items():
        print(f"  {key}: {value}")
    
    if args.output and result.triggered:
        Path(args.output).write_text(compressed, encoding='utf-8')
        print(f"\n  Compressed content saved to: {args.output}")


if __name__ == "__main__":
    main()
