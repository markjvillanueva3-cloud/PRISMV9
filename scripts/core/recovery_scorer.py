#!/usr/bin/env python3
"""
PRISM Recovery Scorer v1.0
Scores recovery confidence after compaction or interruption.

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System

Scoring Components:
1. State completeness (0-100)
2. Checkpoint freshness (0-100)
3. Context reconstruction quality (0-100)
4. Data integrity verification (0-100)
5. Resume readiness (0-100)

Overall score determines if safe to continue or need manual review.

Usage:
    from recovery_scorer import RecoveryScorer
    scorer = RecoveryScorer()
    score = scorer.score(state, checkpoints, transcript)
    # score.overall, score.components, score.recommendation
"""
import os
import sys
import json
import hashlib
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
STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"

# Thresholds
SCORE_EXCELLENT = 90
SCORE_GOOD = 75
SCORE_ACCEPTABLE = 60
SCORE_RISKY = 40


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

class RecoveryReadiness(Enum):
    """Recovery readiness levels."""
    EXCELLENT = "excellent"    # 90+: Safe to continue without review
    GOOD = "good"              # 75-89: Safe to continue with brief review
    ACCEPTABLE = "acceptable"  # 60-74: Continue with caution
    RISKY = "risky"            # 40-59: Manual review recommended
    CRITICAL = "critical"      # <40: Manual intervention required


@dataclass
class ComponentScore:
    """Individual component score."""
    name: str
    score: float  # 0-100
    weight: float  # Contribution weight
    details: str
    checks: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class RecoveryScore:
    """Complete recovery score result."""
    overall: float
    readiness: RecoveryReadiness
    components: List[ComponentScore]
    recommendation: str
    scored_at: str
    safe_to_continue: bool
    review_required: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall": self.overall,
            "readiness": self.readiness.value,
            "components": [asdict(c) for c in self.components],
            "recommendation": self.recommendation,
            "scored_at": self.scored_at,
            "safe_to_continue": self.safe_to_continue,
            "review_required": self.review_required
        }


# ═══════════════════════════════════════════════════════════════════════════
# RECOVERY SCORER
# ═══════════════════════════════════════════════════════════════════════════

class RecoveryScorer:
    """
    Scores recovery confidence.
    
    Component Weights:
    - State Completeness: 25%
    - Checkpoint Freshness: 20%
    - Context Quality: 25%
    - Data Integrity: 20%
    - Resume Readiness: 10%
    
    Score Interpretation:
    - 90+: Excellent - safe to continue
    - 75-89: Good - continue with brief review
    - 60-74: Acceptable - continue with caution
    - 40-59: Risky - recommend manual review
    - <40: Critical - require manual intervention
    """
    
    WEIGHTS = {
        'state_completeness': 0.25,
        'checkpoint_freshness': 0.20,
        'context_quality': 0.25,
        'data_integrity': 0.20,
        'resume_readiness': 0.10
    }
    
    def __init__(self):
        self.components: List[ComponentScore] = []
    
    def score(self, 
              state: Optional[Dict[str, Any]] = None,
              checkpoints: Optional[List[Dict]] = None,
              transcript: Optional[str] = None) -> RecoveryScore:
        """
        Score recovery confidence.
        
        Args:
            state: CURRENT_STATE.json content
            checkpoints: List of checkpoint data
            transcript: Transcript content
            
        Returns:
            RecoveryScore with overall score and components
        """
        self.components = []
        
        # Load state if not provided
        if state is None:
            state = self._load_state()
        
        # Score each component
        self.components.append(self._score_state_completeness(state))
        self.components.append(self._score_checkpoint_freshness(state, checkpoints))
        self.components.append(self._score_context_quality(state, transcript))
        self.components.append(self._score_data_integrity(state))
        self.components.append(self._score_resume_readiness(state))
        
        # Calculate overall
        overall = sum(c.score * c.weight for c in self.components)
        
        # Determine readiness
        readiness = self._determine_readiness(overall)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(overall, readiness)
        
        return RecoveryScore(
            overall=round(overall, 1),
            readiness=readiness,
            components=self.components,
            recommendation=recommendation,
            scored_at=datetime.now().isoformat(),
            safe_to_continue=overall >= SCORE_ACCEPTABLE,
            review_required=overall < SCORE_GOOD
        )
    
    def _load_state(self) -> Optional[Dict]:
        """Load current state file."""
        try:
            if STATE_FILE.exists():
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception:
            pass
        return None
    
    def _score_state_completeness(self, state: Optional[Dict]) -> ComponentScore:
        """Score state file completeness."""
        checks = []
        score = 0
        
        if state is None:
            return ComponentScore(
                name="state_completeness",
                score=0,
                weight=self.WEIGHTS['state_completeness'],
                details="No state file found",
                checks=[{"check": "state_exists", "passed": False}]
            )
        
        # Check required fields
        required_fields = {
            'currentSession': 20,
            'quickResume': 25,
            'lastUpdated': 15,
            'version': 5
        }
        
        for field, points in required_fields.items():
            exists = field in state and state[field]
            checks.append({"check": f"field_{field}", "passed": exists, "points": points if exists else 0})
            if exists:
                score += points
        
        # Check currentSession depth
        if 'currentSession' in state and isinstance(state['currentSession'], dict):
            session = state['currentSession']
            session_fields = ['id', 'sessionNumber', 'sessionName', 'status']
            session_score = sum(5 for f in session_fields if f in session and session[f])
            score += session_score
            checks.append({"check": "session_fields", "passed": session_score > 10, "points": session_score})
        
        # Check for completedPhases
        if 'completedPhases' in state and state['completedPhases']:
            score += 15
            checks.append({"check": "has_history", "passed": True, "points": 15})
        
        return ComponentScore(
            name="state_completeness",
            score=min(100, score),
            weight=self.WEIGHTS['state_completeness'],
            details=f"Found {sum(1 for c in checks if c['passed'])}/{len(checks)} required elements",
            checks=checks
        )
    
    def _score_checkpoint_freshness(self, state: Optional[Dict], 
                                    checkpoints: Optional[List]) -> ComponentScore:
        """Score checkpoint freshness."""
        checks = []
        score = 0
        
        # Check state lastUpdated
        if state and 'lastUpdated' in state:
            try:
                last_updated = datetime.fromisoformat(
                    state['lastUpdated'].replace('Z', '+00:00')
                )
                age = datetime.now(last_updated.tzinfo) - last_updated
                age_hours = age.total_seconds() / 3600
                
                if age_hours < 0.5:  # 30 minutes
                    score += 50
                    freshness = "very_fresh"
                elif age_hours < 2:
                    score += 35
                    freshness = "fresh"
                elif age_hours < 24:
                    score += 20
                    freshness = "stale"
                else:
                    score += 5
                    freshness = "old"
                
                checks.append({"check": "state_freshness", "value": freshness, "age_hours": round(age_hours, 1)})
            except Exception:
                checks.append({"check": "state_freshness", "error": "invalid_timestamp"})
        
        # Check checkpoints
        if checkpoints and len(checkpoints) > 0:
            score += 25
            checks.append({"check": "has_checkpoints", "count": len(checkpoints)})
            
            # Check checkpoint recency
            recent = sum(1 for cp in checkpoints 
                        if self._is_recent(cp.get('timestamp', '')))
            if recent > 0:
                score += 25
                checks.append({"check": "recent_checkpoints", "count": recent})
        else:
            # Check filesystem for checkpoints
            cp_dir = STATE_DIR / "checkpoints"
            if cp_dir.exists():
                cp_files = list(cp_dir.glob("**/cp_*.json"))
                if cp_files:
                    score += 15
                    checks.append({"check": "checkpoint_files", "count": len(cp_files)})
        
        return ComponentScore(
            name="checkpoint_freshness",
            score=min(100, score),
            weight=self.WEIGHTS['checkpoint_freshness'],
            details=f"Checkpoint score: {score}",
            checks=checks
        )
    
    def _score_context_quality(self, state: Optional[Dict],
                               transcript: Optional[str]) -> ComponentScore:
        """Score context reconstruction quality."""
        checks = []
        score = 0
        
        # Check quickResume quality
        if state and 'quickResume' in state:
            qr = state['quickResume']
            if isinstance(qr, str) and len(qr) > 50:
                score += 30
                checks.append({"check": "quick_resume_length", "length": len(qr), "passed": True})
                
                # Check for key markers
                key_markers = ['DOING', 'STOPPED', 'NEXT', 'Session', 'Phase', 'Task']
                found = sum(1 for m in key_markers if m in qr)
                marker_score = min(20, found * 5)
                score += marker_score
                checks.append({"check": "quick_resume_markers", "found": found, "score": marker_score})
            else:
                checks.append({"check": "quick_resume_length", "length": len(qr) if qr else 0, "passed": False})
        
        # Check transcript availability
        if transcript:
            score += 25
            checks.append({"check": "transcript_available", "passed": True})
            
            # Check transcript quality
            if len(transcript) > 1000:
                score += 15
                checks.append({"check": "transcript_substantial", "length": len(transcript)})
        
        # Check for context reconstruction flag
        if state and state.get('reconstructed'):
            score -= 10  # Penalty for reconstructed state
            checks.append({"check": "was_reconstructed", "penalty": 10})
        
        return ComponentScore(
            name="context_quality",
            score=max(0, min(100, score)),
            weight=self.WEIGHTS['context_quality'],
            details=f"Context quality score: {score}",
            checks=checks
        )
    
    def _score_data_integrity(self, state: Optional[Dict]) -> ComponentScore:
        """Score data integrity."""
        checks = []
        score = 0
        
        if state is None:
            return ComponentScore(
                name="data_integrity",
                score=0,
                weight=self.WEIGHTS['data_integrity'],
                details="No state to verify",
                checks=[]
            )
        
        # Check JSON validity (already valid if we got here)
        score += 30
        checks.append({"check": "json_valid", "passed": True})
        
        # Check version consistency
        if 'version' in state:
            score += 20
            checks.append({"check": "has_version", "version": state['version']})
        
        # Check for corruption markers
        corruption_markers = ['null', 'undefined', 'NaN', 'error', 'corrupted']
        state_str = json.dumps(state).lower()
        found_corruption = [m for m in corruption_markers if m in state_str]
        
        if not found_corruption:
            score += 25
            checks.append({"check": "no_corruption_markers", "passed": True})
        else:
            checks.append({"check": "corruption_markers_found", "markers": found_corruption})
        
        # Check referential integrity
        if 'currentSession' in state:
            session = state.get('currentSession', {})
            if session.get('id') and session.get('sessionNumber'):
                score += 25
                checks.append({"check": "session_integrity", "passed": True})
        
        return ComponentScore(
            name="data_integrity",
            score=min(100, score),
            weight=self.WEIGHTS['data_integrity'],
            details=f"Integrity checks: {sum(1 for c in checks if c.get('passed', False))}/{len(checks)}",
            checks=checks
        )
    
    def _score_resume_readiness(self, state: Optional[Dict]) -> ComponentScore:
        """Score readiness to resume work."""
        checks = []
        score = 0
        
        if state is None:
            return ComponentScore(
                name="resume_readiness",
                score=20,  # Can still resume from roadmap
                weight=self.WEIGHTS['resume_readiness'],
                details="No state, but can resume from roadmap",
                checks=[{"check": "roadmap_fallback", "available": ROADMAP_FILE.exists()}]
            )
        
        # Check quickResume
        if state.get('quickResume'):
            score += 40
            checks.append({"check": "has_quick_resume", "passed": True})
        
        # Check task status
        status = state.get('currentSession', {}).get('status', '')
        if status in ['READY', 'IN_PROGRESS', 'COMPLETE']:
            score += 30
            checks.append({"check": "valid_status", "status": status})
        
        # Check roadmap alignment
        if ROADMAP_FILE.exists():
            score += 20
            checks.append({"check": "roadmap_exists", "passed": True})
        
        # Check for blockers
        if not state.get('error') and not state.get('blocked'):
            score += 10
            checks.append({"check": "no_blockers", "passed": True})
        
        return ComponentScore(
            name="resume_readiness",
            score=min(100, score),
            weight=self.WEIGHTS['resume_readiness'],
            details=f"Ready to resume: {score >= 60}",
            checks=checks
        )
    
    def _is_recent(self, timestamp: str, hours: float = 24) -> bool:
        """Check if timestamp is recent."""
        try:
            ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            age = datetime.now(ts.tzinfo) - ts
            return age.total_seconds() < hours * 3600
        except Exception:
            return False
    
    def _determine_readiness(self, score: float) -> RecoveryReadiness:
        """Determine readiness level from score."""
        if score >= SCORE_EXCELLENT:
            return RecoveryReadiness.EXCELLENT
        elif score >= SCORE_GOOD:
            return RecoveryReadiness.GOOD
        elif score >= SCORE_ACCEPTABLE:
            return RecoveryReadiness.ACCEPTABLE
        elif score >= SCORE_RISKY:
            return RecoveryReadiness.RISKY
        else:
            return RecoveryReadiness.CRITICAL
    
    def _generate_recommendation(self, score: float, 
                                  readiness: RecoveryReadiness) -> str:
        """Generate recommendation based on score."""
        recommendations = {
            RecoveryReadiness.EXCELLENT: (
                "Recovery confidence is excellent. Safe to continue without review. "
                "All critical state elements present and recent."
            ),
            RecoveryReadiness.GOOD: (
                "Recovery confidence is good. Brief review of quickResume recommended "
                "before continuing. Most state elements intact."
            ),
            RecoveryReadiness.ACCEPTABLE: (
                "Recovery confidence is acceptable. Review state and checkpoints "
                "before continuing. Some elements may need verification."
            ),
            RecoveryReadiness.RISKY: (
                "Recovery confidence is low. Manual review strongly recommended. "
                "Consider running state_reconstructor.py before continuing."
            ),
            RecoveryReadiness.CRITICAL: (
                "Recovery confidence is critical. Manual intervention required. "
                "State reconstruction needed. Do not continue without verification."
            )
        }
        
        base = recommendations.get(readiness, "Unknown readiness level.")
        return f"[Score: {score:.1f}] {base}"


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Recovery Scorer CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PRISM Recovery Scorer - Score recovery confidence"
    )
    parser.add_argument(
        '--state-file',
        type=Path,
        help='Path to state file (default: CURRENT_STATE.json)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show component details'
    )
    
    args = parser.parse_args()
    
    # Load state
    state = None
    if args.state_file:
        with open(args.state_file, 'r', encoding='utf-8') as f:
            state = json.load(f)
    
    scorer = RecoveryScorer()
    result = scorer.score(state)
    
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print("\n" + "="*60)
        print("PRISM RECOVERY SCORER RESULTS")
        print("="*60)
        
        # Visual score bar
        bar_len = 40
        filled = int(result.overall / 100 * bar_len)
        bar = "█" * filled + "░" * (bar_len - filled)
        print(f"\nOverall Score: [{bar}] {result.overall:.1f}/100")
        print(f"Readiness: {result.readiness.value.upper()}")
        print(f"Safe to continue: {'✓ YES' if result.safe_to_continue else '✗ NO'}")
        print(f"Review required: {'YES' if result.review_required else 'NO'}")
        
        print(f"\n--- COMPONENTS ---")
        for comp in result.components:
            weight_pct = int(comp.weight * 100)
            print(f"  {comp.name} ({weight_pct}%): {comp.score:.1f}")
            if args.verbose:
                print(f"    {comp.details}")
                for check in comp.checks:
                    print(f"      - {check}")
        
        print(f"\n--- RECOMMENDATION ---")
        print(result.recommendation)
        
        print("\n" + "="*60)


if __name__ == "__main__":
    main()
