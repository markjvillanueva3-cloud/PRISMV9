#!/usr/bin/env python3
"""
GRACEFUL_SHUTDOWN.py - Graceful Session Shutdown System
Ensures clean session ending with complete state preservation.

Features:
- Pre-shutdown checklist
- WIP capture and save
- Checkpoint creation
- Handoff document generation
- State file update

Usage:
    python graceful_shutdown.py prepare            # Prepare for shutdown
    python graceful_shutdown.py execute            # Execute shutdown
    python graceful_shutdown.py checklist          # Show checklist
    python graceful_shutdown.py status             # Check shutdown readiness

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
HANDOFF_DIR = STATE_DIR / "handoffs"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"
HANDOFF_FILE = STATE_DIR / "current_handoff.json"

# Import dependencies
import sys
sys.path.insert(0, str(PRISM_ROOT / "scripts" / "core"))

try:
    from wip_capturer import WIPCapturer
    from checkpoint_mgr import CheckpointManager, CheckpointType
    from context_pressure import ContextPressureMonitor, PressureLevel
    from lkg_tracker import LKGTracker
except ImportError as e:
    WIPCapturer = None
    CheckpointManager = None
    ContextPressureMonitor = None
    LKGTracker = None


class ShutdownType(Enum):
    """Types of shutdown."""
    GRACEFUL = "GRACEFUL"       # Normal planned shutdown
    CHECKPOINT = "CHECKPOINT"   # Checkpoint-triggered
    EMERGENCY = "EMERGENCY"     # Context pressure critical
    SCHEDULED = "SCHEDULED"     # Pre-planned end
    USER_REQUESTED = "USER_REQUESTED"  # User asked to stop


@dataclass
class ShutdownChecklist:
    """Checklist for graceful shutdown."""
    wip_captured: bool = False
    checkpoint_created: bool = False
    state_updated: bool = False
    handoff_generated: bool = False
    lkg_marked: bool = False
    
    def is_complete(self) -> bool:
        """Check if all items are complete."""
        return all([
            self.wip_captured,
            self.checkpoint_created,
            self.state_updated,
            self.handoff_generated
        ])
    
    def get_pending(self) -> List[str]:
        """Get list of pending items."""
        pending = []
        if not self.wip_captured:
            pending.append("Capture WIP")
        if not self.checkpoint_created:
            pending.append("Create checkpoint")
        if not self.state_updated:
            pending.append("Update state files")
        if not self.handoff_generated:
            pending.append("Generate handoff")
        if not self.lkg_marked:
            pending.append("Mark LKG (optional)")
        return pending
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ShutdownResult:
    """Result of shutdown operation."""
    success: bool
    shutdown_type: ShutdownType
    checklist: ShutdownChecklist
    handoff_id: Optional[str] = None
    checkpoint_id: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d["shutdown_type"] = self.shutdown_type.value
        return d


class GracefulShutdown:
    """
    Manages graceful session shutdown.
    
    Ensures all work is saved and next session can continue seamlessly.
    """
    
    def __init__(self):
        self.wip_capturer = WIPCapturer() if WIPCapturer else None
        self.checkpoint_mgr = CheckpointManager() if CheckpointManager else None
        self.pressure_monitor = ContextPressureMonitor() if ContextPressureMonitor else None
        self.lkg_tracker = LKGTracker() if LKGTracker else None
        
        self.checklist = ShutdownChecklist()
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
        HANDOFF_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_json(self, path: Path) -> Optional[Dict]:
        """Load JSON file safely."""
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def _save_json(self, path: Path, data: Dict):
        """Save JSON file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    
    def _generate_handoff_id(self) -> str:
        """Generate unique handoff ID."""
        now = datetime.now()
        return f"HO-{now.strftime('%Y%m%d-%H%M%S')}"
    
    def capture_wip(self) -> bool:
        """Capture all work in progress."""
        if not self.wip_capturer:
            self.warnings.append("WIP capturer not available")
            self.checklist.wip_captured = True  # Skip
            return True
        
        try:
            items = self.wip_capturer.auto_capture_from_state()
            self.checklist.wip_captured = True
            return True
        except Exception as e:
            self.errors.append(f"WIP capture failed: {e}")
            return False
    
    def create_checkpoint(self, reason: str = None) -> Optional[str]:
        """Create shutdown checkpoint."""
        if not self.checkpoint_mgr:
            self.warnings.append("Checkpoint manager not available")
            self.checklist.checkpoint_created = True  # Skip
            return None
        
        try:
            state = self._load_json(CURRENT_STATE_FILE) or {}
            result = self.checkpoint_mgr.create(
                checkpoint_type=CheckpointType.SESSION_END,
                reason=reason or "Graceful shutdown",
                state=state
            )
            self.checklist.checkpoint_created = True
            return result.id
        except Exception as e:
            self.errors.append(f"Checkpoint creation failed: {e}")
            return None
    
    def update_state(self, summary: str = None, next_action: str = None) -> bool:
        """Update state files for handoff."""
        try:
            state = self._load_json(CURRENT_STATE_FILE) or {}
            roadmap = self._load_json(ROADMAP_FILE) or {}
            
            # Update state
            if "currentSession" in state:
                state["currentSession"]["status"] = "HANDOFF"
                state["currentSession"]["endedAt"] = datetime.now().isoformat()
            
            if summary:
                state["quickResume"] = summary
            
            state["lastUpdated"] = datetime.now().isoformat()
            
            # Save state
            self._save_json(CURRENT_STATE_FILE, state)
            
            # Update roadmap quick_resume
            if next_action and roadmap:
                if "quick_resume" not in roadmap:
                    roadmap["quick_resume"] = {}
                roadmap["quick_resume"]["next_action"] = next_action
                roadmap["quick_resume"]["last_updated"] = datetime.now().isoformat()
                self._save_json(ROADMAP_FILE, roadmap)
            
            self.checklist.state_updated = True
            return True
        except Exception as e:
            self.errors.append(f"State update failed: {e}")
            return False
    
    def generate_handoff(self, shutdown_type: ShutdownType,
                         summary: str = None,
                         next_action: str = None,
                         warnings: List[str] = None,
                         do_not_forget: List[str] = None) -> Optional[Dict]:
        """Generate handoff document."""
        try:
            state = self._load_json(CURRENT_STATE_FILE) or {}
            roadmap = self._load_json(ROADMAP_FILE) or {}
            
            handoff_id = self._generate_handoff_id()
            
            # Get roadmap position
            roadmap_position = {
                "tier": roadmap.get("current_tier", 0),
                "session": roadmap.get("current_session", ""),
                "sessionName": roadmap.get("current_session_name", "")
            }
            
            # Get session info
            sessions = roadmap.get("sessions", {})
            current_session = roadmap.get("current_session", "")
            session_info = sessions.get(current_session, {})
            
            deliverables = session_info.get("deliverables", [])
            done = [d for d in deliverables if "✓" in d]
            pending = [d for d in deliverables if "✓" not in d]
            
            # Get WIP summary
            wip_summary = None
            if self.wip_capturer:
                wip_summary = self.wip_capturer.get_handoff_summary()
            
            # Build handoff document
            handoff = {
                "meta": {
                    "schema": "prism-handoff-v1",
                    "handoffType": shutdown_type.value,
                    "timestamp": datetime.now().isoformat(),
                    "handoffId": handoff_id
                },
                "currentState": {
                    "summary": summary or state.get("quickResume", ""),
                    "roadmapPosition": {
                        **roadmap_position,
                        "deliverablesDone": done,
                        "deliverablesPending": pending
                    },
                    "stateVersion": state.get("version", "unknown")
                },
                "workInProgress": wip_summary,
                "nextSession": {
                    "immediateAction": next_action or f"Continue session {current_session}",
                    "context": summary or "Resume from last checkpoint",
                    "warnings": warnings or [],
                    "doNotForget": do_not_forget or [],
                    "skillsNeeded": ["prism-session-master", "prism-quick-start"],
                    "filesNeeded": [
                        str(ROADMAP_FILE),
                        str(CURRENT_STATE_FILE)
                    ]
                }
            }
            
            # Save handoff
            handoff_file = HANDOFF_DIR / f"{handoff_id}.json"
            self._save_json(handoff_file, handoff)
            self._save_json(HANDOFF_FILE, handoff)  # Current handoff
            
            self.checklist.handoff_generated = True
            return handoff
            
        except Exception as e:
            self.errors.append(f"Handoff generation failed: {e}")
            return None
    
    def mark_lkg(self) -> bool:
        """Mark current state as Last Known Good."""
        if not self.lkg_tracker:
            self.warnings.append("LKG tracker not available")
            return False
        
        try:
            result = self.lkg_tracker.mark_lkg(
                reason="Graceful shutdown",
                source="AUTO"
            )
            if result.get("success"):
                self.checklist.lkg_marked = True
                return True
            else:
                self.warnings.append(f"LKG marking failed: {result.get('error')}")
                return False
        except Exception as e:
            self.warnings.append(f"LKG marking failed: {e}")
            return False
    
    def prepare(self, shutdown_type: ShutdownType = ShutdownType.GRACEFUL) -> Dict:
        """
        Prepare for shutdown without executing.
        
        Returns:
            Preparation status and pending items
        """
        # Check current state
        state = self._load_json(CURRENT_STATE_FILE)
        roadmap = self._load_json(ROADMAP_FILE)
        
        # Get pressure if available
        pressure = None
        if self.pressure_monitor:
            # Estimate based on typical session
            pressure = self.pressure_monitor.check(100000)  # Estimate
        
        pending = self.checklist.get_pending()
        
        return {
            "ready": len(pending) == 0,
            "pending": pending,
            "shutdown_type": shutdown_type.value,
            "state_loaded": state is not None,
            "roadmap_loaded": roadmap is not None,
            "pressure": pressure.to_dict() if pressure else None,
            "checklist": self.checklist.to_dict()
        }
    
    def execute(self, shutdown_type: ShutdownType = ShutdownType.GRACEFUL,
                summary: str = None,
                next_action: str = None,
                warnings: List[str] = None,
                do_not_forget: List[str] = None) -> ShutdownResult:
        """
        Execute graceful shutdown.
        
        Args:
            shutdown_type: Type of shutdown
            summary: Session summary
            next_action: What to do next
            warnings: Warnings for next session
            do_not_forget: Critical items
            
        Returns:
            ShutdownResult with status
        """
        checkpoint_id = None
        handoff_id = None
        
        # Step 1: Capture WIP
        self.capture_wip()
        
        # Step 2: Create checkpoint
        checkpoint_id = self.create_checkpoint(
            reason=f"Shutdown: {shutdown_type.value}"
        )
        
        # Step 3: Update state
        self.update_state(summary, next_action)
        
        # Step 4: Generate handoff
        handoff = self.generate_handoff(
            shutdown_type=shutdown_type,
            summary=summary,
            next_action=next_action,
            warnings=warnings,
            do_not_forget=do_not_forget
        )
        if handoff:
            handoff_id = handoff["meta"]["handoffId"]
        
        # Step 5: Mark LKG (optional, don't fail if it fails)
        self.mark_lkg()
        
        return ShutdownResult(
            success=self.checklist.is_complete(),
            shutdown_type=shutdown_type,
            checklist=self.checklist,
            handoff_id=handoff_id,
            checkpoint_id=checkpoint_id,
            errors=self.errors,
            warnings=self.warnings
        )
    
    def get_checklist(self) -> Dict:
        """Get current checklist status."""
        return {
            "checklist": self.checklist.to_dict(),
            "complete": self.checklist.is_complete(),
            "pending": self.checklist.get_pending()
        }


def main():
    parser = argparse.ArgumentParser(description="PRISM Graceful Shutdown")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Prepare command
    prepare_parser = subparsers.add_parser("prepare", help="Prepare for shutdown")
    prepare_parser.add_argument("--type", choices=[t.value for t in ShutdownType],
                                default="GRACEFUL")
    prepare_parser.add_argument("--json", action="store_true")
    
    # Execute command
    execute_parser = subparsers.add_parser("execute", help="Execute shutdown")
    execute_parser.add_argument("--type", choices=[t.value for t in ShutdownType],
                                default="GRACEFUL")
    execute_parser.add_argument("--summary", help="Session summary")
    execute_parser.add_argument("--next", help="Next action")
    execute_parser.add_argument("--warning", action="append", help="Warnings")
    execute_parser.add_argument("--remember", action="append", help="Do not forget")
    execute_parser.add_argument("--json", action="store_true")
    
    # Checklist command
    checklist_parser = subparsers.add_parser("checklist", help="Show checklist")
    checklist_parser.add_argument("--json", action="store_true")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Check readiness")
    status_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    shutdown = GracefulShutdown()
    
    if args.command == "prepare":
        shutdown_type = ShutdownType(args.type)
        result = shutdown.prepare(shutdown_type)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            status = "✓ Ready" if result["ready"] else "⏳ Not ready"
            print(f"Shutdown Preparation: {status}")
            if result["pending"]:
                print("Pending items:")
                for item in result["pending"]:
                    print(f"  • {item}")
    
    elif args.command == "execute":
        shutdown_type = ShutdownType(args.type)
        result = shutdown.execute(
            shutdown_type=shutdown_type,
            summary=args.summary,
            next_action=args.next,
            warnings=args.warning,
            do_not_forget=args.remember
        )
        if args.json:
            print(json.dumps(result.to_dict(), indent=2))
        else:
            status = "✓ SUCCESS" if result.success else "⚠ PARTIAL"
            print(f"Shutdown: {status}")
            print(f"  Type: {result.shutdown_type.value}")
            print(f"  Handoff: {result.handoff_id or 'N/A'}")
            print(f"  Checkpoint: {result.checkpoint_id or 'N/A'}")
            if result.errors:
                print("Errors:")
                for e in result.errors:
                    print(f"  ✗ {e}")
            if result.warnings:
                print("Warnings:")
                for w in result.warnings:
                    print(f"  ! {w}")
    
    elif args.command == "checklist":
        result = shutdown.get_checklist()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("Shutdown Checklist:")
            cl = result["checklist"]
            print(f"  [{'✓' if cl['wip_captured'] else ' '}] WIP Captured")
            print(f"  [{'✓' if cl['checkpoint_created'] else ' '}] Checkpoint Created")
            print(f"  [{'✓' if cl['state_updated'] else ' '}] State Updated")
            print(f"  [{'✓' if cl['handoff_generated'] else ' '}] Handoff Generated")
            print(f"  [{'✓' if cl['lkg_marked'] else ' '}] LKG Marked (optional)")
    
    elif args.command == "status":
        prep = shutdown.prepare()
        checklist = shutdown.get_checklist()
        if args.json:
            print(json.dumps({"preparation": prep, "checklist": checklist}, indent=2))
        else:
            print(f"State loaded: {'✓' if prep['state_loaded'] else '✗'}")
            print(f"Roadmap loaded: {'✓' if prep['roadmap_loaded'] else '✗'}")
            print(f"Ready for shutdown: {'✓' if prep['ready'] else '✗'}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
