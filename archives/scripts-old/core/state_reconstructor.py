#!/usr/bin/env python3
"""
PRISM State Reconstructor v1.0
Reconstructs CURRENT_STATE.json from transcript files after compaction.

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System
Hook: CTX-COMPACT-002

Features:
1. Transcript parsing to extract state information
2. Checkpoint detection and ordering
3. State merging from multiple sources
4. Confidence scoring for reconstructed state

Usage:
    from state_reconstructor import StateReconstructor
    reconstructor = StateReconstructor()
    result = reconstructor.reconstruct()
    # result.reconstructed_state, result.confidence, result.sources
"""
import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
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
SESSION_LOGS = STATE_DIR / "session_logs"


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ExtractedState:
    """State extracted from a single source."""
    source: str
    source_type: str  # transcript, checkpoint, state_file
    timestamp: str
    data: Dict[str, Any]
    confidence: float
    
@dataclass
class ReconstructionSource:
    """Source used in reconstruction."""
    path: str
    type: str
    contribution: str
    confidence: float
    
@dataclass
class ReconstructionResult:
    """Complete reconstruction result."""
    success: bool
    reconstructed_state: Dict[str, Any]
    confidence: float
    sources: List[ReconstructionSource]
    warnings: List[str]
    reconstructed_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "reconstructed_state": self.reconstructed_state,
            "confidence": self.confidence,
            "sources": [asdict(s) for s in self.sources],
            "warnings": self.warnings,
            "reconstructed_at": self.reconstructed_at
        }


# ═══════════════════════════════════════════════════════════════════════════
# STATE RECONSTRUCTOR
# ═══════════════════════════════════════════════════════════════════════════

class StateReconstructor:
    """
    Reconstructs state from multiple sources after compaction.
    
    Source Priority (highest first):
    1. Existing CURRENT_STATE.json (if valid)
    2. Session checkpoint files
    3. Transcript parsing
    4. ROADMAP_TRACKER.json defaults
    
    Extraction Patterns:
    - JSON blocks in transcripts
    - State updates ("Updated state:", "Checkpoint:")
    - Task completions ("COMPLETE:", "DONE:")
    - Progress markers ("Step X of Y", "Progress:")
    """
    
    def __init__(self):
        self.extracted_states: List[ExtractedState] = []
        self.sources: List[ReconstructionSource] = []
        self.warnings: List[str] = []
        
    def reconstruct(self, 
                    force: bool = False,
                    max_transcripts: int = 5) -> ReconstructionResult:
        """
        Reconstruct state from available sources.
        
        Args:
            force: Reconstruct even if current state is valid
            max_transcripts: Maximum number of transcripts to parse
            
        Returns:
            ReconstructionResult with merged state
        """
        self.extracted_states = []
        self.sources = []
        self.warnings = []
        
        # 1. Try existing state file first
        if not force:
            existing = self._load_existing_state()
            if existing and self._validate_state(existing):
                return ReconstructionResult(
                    success=True,
                    reconstructed_state=existing,
                    confidence=1.0,
                    sources=[ReconstructionSource(
                        path=str(STATE_FILE),
                        type="state_file",
                        contribution="primary",
                        confidence=1.0
                    )],
                    warnings=[],
                    reconstructed_at=datetime.now().isoformat()
                )
        
        # 2. Extract from all available sources
        self._extract_from_checkpoints()
        self._extract_from_transcripts(max_transcripts)
        self._extract_from_roadmap()
        
        # 3. Merge extracted states
        merged = self._merge_states()
        
        # 4. Validate and fill gaps
        final_state = self._fill_gaps(merged)
        confidence = self._calculate_confidence(final_state)
        
        return ReconstructionResult(
            success=confidence > 0.3,
            reconstructed_state=final_state,
            confidence=confidence,
            sources=self.sources,
            warnings=self.warnings,
            reconstructed_at=datetime.now().isoformat()
        )
    
    def _load_existing_state(self) -> Optional[Dict]:
        """Load existing state file if present."""
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.warnings.append(f"Could not load existing state: {e}")
        return None
    
    def _validate_state(self, state: Dict) -> bool:
        """Validate state has required fields."""
        required = ['currentSession', 'lastUpdated']
        return all(k in state for k in required)
    
    def _extract_from_checkpoints(self) -> None:
        """Extract state from checkpoint files."""
        checkpoint_dirs = [
            SESSION_LOGS,
            STATE_DIR / "checkpoints",
            PRISM_ROOT / "checkpoints"
        ]
        
        for checkpoint_dir in checkpoint_dirs:
            if not checkpoint_dir.exists():
                continue
                
            # Find checkpoint files
            checkpoints = sorted(
                list(checkpoint_dir.glob("checkpoint_*.json")) +
                list(checkpoint_dir.glob("state_*.json")),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            for cp in checkpoints[:3]:  # Top 3 most recent
                try:
                    with open(cp, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    self.extracted_states.append(ExtractedState(
                        source=str(cp),
                        source_type="checkpoint",
                        timestamp=datetime.fromtimestamp(cp.stat().st_mtime).isoformat(),
                        data=data,
                        confidence=0.9
                    ))
                    
                    self.sources.append(ReconstructionSource(
                        path=str(cp),
                        type="checkpoint",
                        contribution="state merge",
                        confidence=0.9
                    ))
                    
                except Exception as e:
                    self.warnings.append(f"Failed to load checkpoint {cp}: {e}")
    
    def _extract_from_transcripts(self, max_transcripts: int) -> None:
        """Extract state information from transcript files."""
        if not TRANSCRIPTS_DIR.exists():
            self.warnings.append("Transcripts directory not found")
            return
        
        transcripts = sorted(
            TRANSCRIPTS_DIR.glob("*.txt"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )[:max_transcripts]
        
        for transcript in transcripts:
            try:
                content = transcript.read_text(encoding='utf-8', errors='replace')
                extracted = self._parse_transcript(content)
                
                if extracted:
                    self.extracted_states.append(ExtractedState(
                        source=str(transcript),
                        source_type="transcript",
                        timestamp=datetime.fromtimestamp(transcript.stat().st_mtime).isoformat(),
                        data=extracted,
                        confidence=0.6
                    ))
                    
                    self.sources.append(ReconstructionSource(
                        path=str(transcript),
                        type="transcript",
                        contribution="parsed content",
                        confidence=0.6
                    ))
                    
            except Exception as e:
                self.warnings.append(f"Failed to parse transcript {transcript}: {e}")
    
    def _parse_transcript(self, content: str) -> Dict[str, Any]:
        """Parse transcript content to extract state information."""
        extracted = {}
        
        # Extract JSON blocks
        json_pattern = r'```json\s*([\s\S]*?)\s*```'
        json_matches = re.findall(json_pattern, content)
        
        for match in json_matches:
            try:
                data = json.loads(match)
                if isinstance(data, dict):
                    # Look for state-like structures
                    if any(k in data for k in ['currentSession', 'quickResume', 'task', 'phase']):
                        extracted.update(data)
            except json.JSONDecodeError:
                pass
        
        # Extract state updates
        state_patterns = [
            (r'Updated state:?\s*(.+?)(?:\n|$)', 'state_update'),
            (r'Checkpoint:?\s*(.+?)(?:\n|$)', 'checkpoint'),
            (r'COMPLETE:?\s*(.+?)(?:\n|$)', 'completion'),
            (r'Current task:?\s*(.+?)(?:\n|$)', 'task'),
            (r'Session (\d+\.\d+)', 'session'),
            (r'Phase (\d+)', 'phase'),
            (r'Step (\d+) of (\d+)', 'progress'),
            (r'quickResume:?\s*(.+?)(?:\n\n|$)', 'quick_resume'),
        ]
        
        for pattern, field in state_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                if field == 'session':
                    extracted['lastSession'] = matches[-1]
                elif field == 'phase':
                    extracted['lastPhase'] = matches[-1]
                elif field == 'progress':
                    extracted['lastProgress'] = {'step': matches[-1][0], 'total': matches[-1][1]}
                elif field == 'quick_resume':
                    extracted['quickResume'] = matches[-1]
                elif field == 'completion':
                    if 'completions' not in extracted:
                        extracted['completions'] = []
                    extracted['completions'].extend(matches)
        
        # Extract deliverables
        deliverable_pattern = r'(?:Created|Generated|Wrote|Completed):?\s*([^\n]+\.(?:py|json|md|txt))'
        deliverables = re.findall(deliverable_pattern, content, re.IGNORECASE)
        if deliverables:
            extracted['deliverables'] = deliverables
        
        return extracted
    
    def _extract_from_roadmap(self) -> None:
        """Extract default state from roadmap."""
        try:
            if ROADMAP_FILE.exists():
                with open(ROADMAP_FILE, 'r', encoding='utf-8') as f:
                    roadmap = json.load(f)
                
                # Extract current session info
                current_session = roadmap.get('current_session', '0.1')
                session_info = roadmap.get('sessions', {}).get(current_session, {})
                
                default_state = {
                    'currentSession': {
                        'id': f"SESSION-{current_session}",
                        'sessionNumber': current_session,
                        'sessionName': session_info.get('name', 'Unknown'),
                        'status': session_info.get('status', 'NOT_STARTED')
                    },
                    'roadmapVersion': roadmap.get('roadmap_version', '3.0')
                }
                
                self.extracted_states.append(ExtractedState(
                    source=str(ROADMAP_FILE),
                    source_type="roadmap",
                    timestamp=roadmap.get('last_updated', datetime.now().isoformat()),
                    data=default_state,
                    confidence=0.5
                ))
                
                self.sources.append(ReconstructionSource(
                    path=str(ROADMAP_FILE),
                    type="roadmap",
                    contribution="defaults",
                    confidence=0.5
                ))
                
        except Exception as e:
            self.warnings.append(f"Failed to extract from roadmap: {e}")
    
    def _merge_states(self) -> Dict[str, Any]:
        """Merge extracted states with priority weighting."""
        if not self.extracted_states:
            return {}
        
        # Sort by confidence (highest first)
        sorted_states = sorted(
            self.extracted_states,
            key=lambda s: s.confidence,
            reverse=True
        )
        
        # Merge with priority
        merged = {}
        for state in sorted_states:
            self._deep_merge(merged, state.data, state.confidence)
        
        return merged
    
    def _deep_merge(self, base: Dict, update: Dict, confidence: float) -> None:
        """Deep merge update into base, respecting confidence."""
        for key, value in update.items():
            if key not in base:
                base[key] = value
            elif isinstance(value, dict) and isinstance(base[key], dict):
                self._deep_merge(base[key], value, confidence)
            # Higher confidence sources already processed, skip lower confidence updates
    
    def _fill_gaps(self, state: Dict) -> Dict[str, Any]:
        """Fill missing required fields with defaults."""
        defaults = {
            'currentSession': {
                'id': 'SESSION-RECONSTRUCTED',
                'sessionNumber': '0.1',
                'sessionName': 'Reconstructed Session',
                'status': 'UNKNOWN'
            },
            'quickResume': 'State reconstructed from available sources. Verify before continuing.',
            'lastUpdated': datetime.now().isoformat(),
            'version': '0.0.1-reconstructed',
            'reconstructed': True,
            'reconstructedAt': datetime.now().isoformat()
        }
        
        for key, default in defaults.items():
            if key not in state:
                state[key] = default
                self.warnings.append(f"Filled missing field '{key}' with default")
        
        return state
    
    def _calculate_confidence(self, state: Dict) -> float:
        """Calculate confidence score for reconstructed state."""
        if not state:
            return 0.0
        
        # Base confidence from sources
        if not self.extracted_states:
            return 0.1
        
        base_confidence = max(s.confidence for s in self.extracted_states)
        
        # Adjust for completeness
        required_fields = ['currentSession', 'quickResume', 'lastUpdated']
        present = sum(1 for f in required_fields if f in state and state[f])
        completeness = present / len(required_fields)
        
        # Adjust for reconstruction flag
        if state.get('reconstructed'):
            base_confidence *= 0.8
        
        return min(1.0, base_confidence * completeness)
    
    def save(self, state: Dict[str, Any], backup: bool = True) -> Path:
        """Save reconstructed state to file."""
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Backup existing
        if backup and STATE_FILE.exists():
            backup_path = STATE_DIR / f"CURRENT_STATE.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            STATE_FILE.rename(backup_path)
        
        # Save new state
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
        
        return STATE_FILE


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Run state reconstruction from command line."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PRISM State Reconstructor - Rebuilds state from transcripts"
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force reconstruction even if state exists'
    )
    parser.add_argument(
        '--max-transcripts',
        type=int,
        default=5,
        help='Maximum transcripts to parse'
    )
    parser.add_argument(
        '--save',
        action='store_true',
        help='Save reconstructed state to file'
    )
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Do not backup existing state'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON'
    )
    
    args = parser.parse_args()
    
    reconstructor = StateReconstructor()
    result = reconstructor.reconstruct(
        force=args.force,
        max_transcripts=args.max_transcripts
    )
    
    if args.save and result.success:
        save_path = reconstructor.save(
            result.reconstructed_state,
            backup=not args.no_backup
        )
        result_dict = result.to_dict()
        result_dict['saved_to'] = str(save_path)
    else:
        result_dict = result.to_dict()
    
    if args.json:
        print(json.dumps(result_dict, indent=2))
    else:
        print("\n" + "="*60)
        print("PRISM STATE RECONSTRUCTOR RESULTS")
        print("="*60)
        print(f"\nSuccess: {result.success}")
        print(f"Confidence: {result.confidence:.1%}")
        print(f"Sources used: {len(result.sources)}")
        print(f"Warnings: {len(result.warnings)}")
        
        print("\n" + "-"*60)
        print("SOURCES:")
        for src in result.sources:
            print(f"  • {src.type}: {src.path}")
            print(f"    Contribution: {src.contribution}, Confidence: {src.confidence:.1%}")
        
        if result.warnings:
            print("\n" + "-"*60)
            print("WARNINGS:")
            for warn in result.warnings:
                print(f"  ⚠ {warn}")
        
        print("\n" + "-"*60)
        print("RECONSTRUCTED STATE (summary):")
        state = result.reconstructed_state
        print(f"  Session: {state.get('currentSession', {}).get('sessionNumber', 'Unknown')}")
        print(f"  Status: {state.get('currentSession', {}).get('status', 'Unknown')}")
        print(f"  Quick Resume: {str(state.get('quickResume', ''))[:100]}...")
        
        if args.save and result.success:
            print(f"\n✓ State saved to: {result_dict.get('saved_to')}")
        
        print("\n" + "="*60)


if __name__ == "__main__":
    main()
