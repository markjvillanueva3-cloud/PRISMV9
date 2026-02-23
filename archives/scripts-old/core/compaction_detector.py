#!/usr/bin/env python3
"""
PRISM Compaction Detector v1.0
Detects when conversation context has been compacted by analyzing:
1. Transcript file presence and structure
2. State file consistency
3. Context markers and checksums

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System
Hook: CTX-COMPACT-001

Usage:
    from compaction_detector import CompactionDetector
    detector = CompactionDetector()
    result = detector.detect()
    # result.is_compacted, result.confidence, result.indicators
"""
import os
import sys
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
TRANSCRIPTS_DIR = Path("/mnt/transcripts")
STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

class CompactionType(Enum):
    """Types of compaction detected."""
    NONE = "none"
    SOFT = "soft"           # Partial context loss, recoverable
    HARD = "hard"           # Full context loss, needs reconstruction
    INTERRUPTED = "interrupted"  # Mid-task interruption
    NEW_SESSION = "new_session"  # Fresh session, no prior context


@dataclass
class CompactionIndicator:
    """Individual indicator of compaction."""
    name: str
    detected: bool
    confidence: float  # 0.0 to 1.0
    evidence: str
    weight: float = 1.0  # Importance weight


@dataclass
class CompactionResult:
    """Complete compaction detection result."""
    is_compacted: bool
    compaction_type: CompactionType
    confidence: float
    indicators: List[CompactionIndicator]
    detected_at: str
    transcript_path: Optional[str] = None
    last_checkpoint: Optional[str] = None
    recovery_recommendation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_compacted": self.is_compacted,
            "compaction_type": self.compaction_type.value,
            "confidence": self.confidence,
            "indicators": [asdict(i) for i in self.indicators],
            "detected_at": self.detected_at,
            "transcript_path": self.transcript_path,
            "last_checkpoint": self.last_checkpoint,
            "recovery_recommendation": self.recovery_recommendation
        }


# ═══════════════════════════════════════════════════════════════════════════
# COMPACTION DETECTOR
# ═══════════════════════════════════════════════════════════════════════════

class CompactionDetector:
    """
    Detects context compaction using multiple indicators:
    
    1. TRANSCRIPT ANALYSIS
       - Checks for [Conversation compacted] markers
       - Analyzes conversation continuity
       - Detects missing context references
    
    2. STATE CONSISTENCY
       - Validates CURRENT_STATE.json integrity
       - Checks quickResume presence
       - Verifies checkpoint freshness
    
    3. CONTEXT MARKERS
       - Looks for orphaned references
       - Detects broken conversation flow
       - Identifies missing dependencies
    """
    
    def __init__(self, state_file: Path = STATE_FILE):
        self.state_file = state_file
        self.state_data: Optional[Dict] = None
        self.indicators: List[CompactionIndicator] = []
        
    def detect(self) -> CompactionResult:
        """
        Run full compaction detection.
        
        Returns:
            CompactionResult with detection details
        """
        self.indicators = []
        
        # Run all detection checks
        self._check_transcript_markers()
        self._check_state_consistency()
        self._check_checkpoint_freshness()
        self._check_context_references()
        self._check_conversation_flow()
        
        # Calculate overall result
        return self._calculate_result()
    
    def _check_transcript_markers(self) -> None:
        """Check for compaction markers in transcript files."""
        indicator = CompactionIndicator(
            name="transcript_compaction_marker",
            detected=False,
            confidence=0.0,
            evidence="",
            weight=2.0  # High weight - definitive indicator
        )
        
        if TRANSCRIPTS_DIR.exists():
            # Find most recent transcript
            transcripts = sorted(
                TRANSCRIPTS_DIR.glob("*.txt"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            if transcripts:
                latest = transcripts[0]
                try:
                    content = latest.read_text(encoding='utf-8', errors='replace')
                    
                    # Check for compaction markers
                    compaction_patterns = [
                        r'\[Conversation compacted\]',
                        r'\[Context compacted\]',
                        r'<compacted>',
                        r'<!-- compaction -->',
                        r'\.\.\. \[earlier messages\]'
                    ]
                    
                    for pattern in compaction_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            indicator.detected = True
                            indicator.confidence = 0.95
                            indicator.evidence = f"Found compaction marker matching '{pattern}' in {latest.name}"
                            break
                    
                    if not indicator.detected:
                        indicator.evidence = f"No compaction markers in {latest.name}"
                        
                except Exception as e:
                    indicator.evidence = f"Error reading transcript: {e}"
        else:
            indicator.evidence = "Transcripts directory not found"
            
        self.indicators.append(indicator)
    
    def _check_state_consistency(self) -> None:
        """Check CURRENT_STATE.json for consistency issues."""
        indicator = CompactionIndicator(
            name="state_consistency",
            detected=False,
            confidence=0.0,
            evidence="",
            weight=1.5
        )
        
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    self.state_data = json.load(f)
                
                # Check for required fields
                required_fields = ['currentSession', 'quickResume', 'lastUpdated']
                missing = [f for f in required_fields if f not in self.state_data]
                
                if missing:
                    indicator.detected = True
                    indicator.confidence = 0.7
                    indicator.evidence = f"Missing state fields: {missing}"
                elif not self.state_data.get('quickResume'):
                    indicator.detected = True
                    indicator.confidence = 0.5
                    indicator.evidence = "quickResume is empty"
                else:
                    indicator.evidence = "State file is consistent"
            else:
                indicator.detected = True
                indicator.confidence = 0.9
                indicator.evidence = "State file not found - possible fresh session"
                
        except json.JSONDecodeError as e:
            indicator.detected = True
            indicator.confidence = 0.8
            indicator.evidence = f"State file corrupted: {e}"
        except Exception as e:
            indicator.evidence = f"Error checking state: {e}"
            
        self.indicators.append(indicator)
    
    def _check_checkpoint_freshness(self) -> None:
        """Check if checkpoints are stale (indicates interrupted session)."""
        indicator = CompactionIndicator(
            name="checkpoint_freshness",
            detected=False,
            confidence=0.0,
            evidence="",
            weight=1.0
        )
        
        if self.state_data and 'lastUpdated' in self.state_data:
            try:
                last_updated = datetime.fromisoformat(
                    self.state_data['lastUpdated'].replace('Z', '+00:00')
                )
                age = datetime.now(last_updated.tzinfo) - last_updated
                
                # Stale if older than 1 hour
                if age > timedelta(hours=1):
                    indicator.detected = True
                    indicator.confidence = min(0.9, age.total_seconds() / 86400)
                    indicator.evidence = f"Checkpoint is {age} old"
                else:
                    indicator.evidence = f"Checkpoint is fresh ({age} old)"
                    
            except Exception as e:
                indicator.evidence = f"Error parsing timestamp: {e}"
        else:
            indicator.detected = True
            indicator.confidence = 0.5
            indicator.evidence = "No lastUpdated timestamp found"
            
        self.indicators.append(indicator)
    
    def _check_context_references(self) -> None:
        """Check for orphaned context references."""
        indicator = CompactionIndicator(
            name="context_references",
            detected=False,
            confidence=0.0,
            evidence="",
            weight=1.2
        )
        
        if self.state_data:
            current_session = self.state_data.get('currentSession', {})
            
            # Check if session references non-existent tasks
            if current_session.get('status') == 'IN_PROGRESS':
                task_id = current_session.get('id', '')
                if not task_id:
                    indicator.detected = True
                    indicator.confidence = 0.6
                    indicator.evidence = "IN_PROGRESS session has no task ID"
                else:
                    indicator.evidence = f"Session {task_id} has valid reference"
            else:
                indicator.evidence = "No active task to check"
        else:
            indicator.evidence = "No state data to check references"
            
        self.indicators.append(indicator)
    
    def _check_conversation_flow(self) -> None:
        """Check for broken conversation flow indicators."""
        indicator = CompactionIndicator(
            name="conversation_flow",
            detected=False,
            confidence=0.0,
            evidence="",
            weight=0.8
        )
        
        # This would be enhanced with actual conversation analysis
        # For now, check state for flow indicators
        if self.state_data:
            quick_resume = self.state_data.get('quickResume', '')
            
            if quick_resume:
                # Check for incomplete markers in quick resume
                incomplete_markers = ['...', 'TODO', 'INCOMPLETE', 'WIP']
                for marker in incomplete_markers:
                    if marker in quick_resume:
                        indicator.detected = True
                        indicator.confidence = 0.4
                        indicator.evidence = f"Found '{marker}' in quickResume"
                        break
                
                if not indicator.detected:
                    indicator.evidence = "Conversation flow appears intact"
            else:
                indicator.detected = True
                indicator.confidence = 0.3
                indicator.evidence = "No quickResume to assess flow"
        else:
            indicator.evidence = "No state data to assess flow"
            
        self.indicators.append(indicator)
    
    def _calculate_result(self) -> CompactionResult:
        """Calculate overall compaction result from indicators."""
        if not self.indicators:
            return CompactionResult(
                is_compacted=False,
                compaction_type=CompactionType.NONE,
                confidence=0.0,
                indicators=[],
                detected_at=datetime.now().isoformat(),
                recovery_recommendation="No indicators to analyze"
            )
        
        # Calculate weighted confidence
        total_weight = sum(i.weight for i in self.indicators)
        weighted_confidence = sum(
            i.confidence * i.weight for i in self.indicators if i.detected
        ) / total_weight
        
        detected_count = sum(1 for i in self.indicators if i.detected)
        
        # Determine compaction type
        if detected_count == 0:
            compaction_type = CompactionType.NONE
            is_compacted = False
        elif weighted_confidence > 0.7:
            compaction_type = CompactionType.HARD
            is_compacted = True
        elif weighted_confidence > 0.4:
            compaction_type = CompactionType.SOFT
            is_compacted = True
        elif detected_count >= 2:
            compaction_type = CompactionType.INTERRUPTED
            is_compacted = True
        else:
            compaction_type = CompactionType.NEW_SESSION
            is_compacted = True
        
        # Generate recovery recommendation
        recommendation = self._generate_recommendation(compaction_type, weighted_confidence)
        
        # Find transcript path if available
        transcript_path = None
        if TRANSCRIPTS_DIR.exists():
            transcripts = sorted(
                TRANSCRIPTS_DIR.glob("*.txt"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            if transcripts:
                transcript_path = str(transcripts[0])
        
        return CompactionResult(
            is_compacted=is_compacted,
            compaction_type=compaction_type,
            confidence=weighted_confidence,
            indicators=self.indicators,
            detected_at=datetime.now().isoformat(),
            transcript_path=transcript_path,
            last_checkpoint=self.state_data.get('lastUpdated') if self.state_data else None,
            recovery_recommendation=recommendation
        )
    
    def _generate_recommendation(self, comp_type: CompactionType, confidence: float) -> str:
        """Generate recovery recommendation based on compaction type."""
        recommendations = {
            CompactionType.NONE: "No recovery needed. Continue normally.",
            CompactionType.SOFT: (
                "Soft compaction detected. Read quickResume from CURRENT_STATE.json "
                "and continue from last checkpoint."
            ),
            CompactionType.HARD: (
                "Hard compaction detected. Run state_reconstructor.py to rebuild context "
                "from transcript. Load last checkpoint and verify before continuing."
            ),
            CompactionType.INTERRUPTED: (
                "Session was interrupted. Check currentSession.status in state file. "
                "Resume from last saved task step."
            ),
            CompactionType.NEW_SESSION: (
                "New session detected. Initialize from ROADMAP_TRACKER.json and "
                "CURRENT_STATE.json quickResume."
            )
        }
        
        base = recommendations.get(comp_type, "Unknown compaction type.")
        if confidence > 0.8:
            return f"HIGH CONFIDENCE: {base}"
        elif confidence > 0.5:
            return f"MEDIUM CONFIDENCE: {base}"
        else:
            return f"LOW CONFIDENCE: {base} Consider manual verification."


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Run compaction detection from command line."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PRISM Compaction Detector - Detects context compaction"
    )
    parser.add_argument(
        '--state-file', 
        type=Path,
        default=STATE_FILE,
        help='Path to CURRENT_STATE.json'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed indicator information'
    )
    
    args = parser.parse_args()
    
    detector = CompactionDetector(state_file=args.state_file)
    result = detector.detect()
    
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print("\n" + "="*60)
        print("PRISM COMPACTION DETECTOR RESULTS")
        print("="*60)
        print(f"\nCompacted: {result.is_compacted}")
        print(f"Type: {result.compaction_type.value}")
        print(f"Confidence: {result.confidence:.1%}")
        print(f"Detected at: {result.detected_at}")
        
        if result.transcript_path:
            print(f"Transcript: {result.transcript_path}")
        if result.last_checkpoint:
            print(f"Last checkpoint: {result.last_checkpoint}")
            
        print(f"\nRecommendation: {result.recovery_recommendation}")
        
        if args.verbose:
            print("\n" + "-"*60)
            print("INDICATORS:")
            print("-"*60)
            for ind in result.indicators:
                status = "✓" if ind.detected else "✗"
                print(f"\n{status} {ind.name} (weight: {ind.weight})")
                print(f"  Confidence: {ind.confidence:.1%}")
                print(f"  Evidence: {ind.evidence}")
        
        print("\n" + "="*60)


if __name__ == "__main__":
    main()
