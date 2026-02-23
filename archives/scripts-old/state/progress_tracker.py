# PRISM Automation Toolkit - Progress Tracker
# Version: 1.0.0
# Created: 2026-01-23
#
# Tracks completion percentages across all PRISM development areas.
# Part of Toolkit 4: State Management

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, save_json


# =============================================================================
# TARGET COUNTS (FROM MANIFEST)
# =============================================================================

TARGETS = {
    'modules': {
        'total': 831,
        'databases': 62,
        'engines': 213,
        'knowledge_bases': 14,
        'systems': 31,
        'learning': 30,
        'business': 22,
        'ui': 16,
        'lookups': 20,
        'manufacturers': 44,
        'phases': 46,
    },
    'databases': {
        'materials': 6,
        'machines_core': 7,
        'machines_enhanced': 33,
        'tools': 7,
        'workholding': 10,
        'post_processor': 7,
        'process': 6,
        'business': 4,
        'ai_ml': 3,
        'cad_cam': 3,
        'manufacturer': 3,
        'infrastructure': 6,
    },
    'engines': {
        'cad': 25,
        'cam': 20,
        'physics': 42,
        'ai_ml': 74,
        'optimization': 44,
        'signal': 14,
        'post': 25,
        'collision': 15,
    },
    'materials': {
        'total': 1047,
        'carbon_steels': 50,
        'alloy_steels': 80,
        'stainless_steels': 100,
        'tool_steels': 50,
        'aluminum': 120,
        'titanium': 60,
        'nickel_alloys': 50,
        'copper': 40,
        'plastics': 80,
        'composites': 50,
        'other': 367,
    },
    'parameters_per_material': 127,
    'consumers_per_database': 6,
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ProgressItem:
    """Progress for a single tracked item."""
    name: str
    current: int
    target: int
    percentage: float = 0.0
    status: str = "NOT_STARTED"  # NOT_STARTED, IN_PROGRESS, COMPLETE
    
    def __post_init__(self):
        if self.target > 0:
            self.percentage = (self.current / self.target) * 100
        if self.current >= self.target:
            self.status = "COMPLETE"
        elif self.current > 0:
            self.status = "IN_PROGRESS"


@dataclass
class ProgressReport:
    """Complete progress report."""
    timestamp: str = field(default_factory=timestamp)
    overall_percentage: float = 0.0
    extraction: Dict[str, ProgressItem] = field(default_factory=dict)
    materials: Dict[str, ProgressItem] = field(default_factory=dict)
    utilization: Dict[str, ProgressItem] = field(default_factory=dict)
    sessions: ProgressItem = None


# =============================================================================
# PROGRESS TRACKER CLASS
# =============================================================================

class ProgressTracker:
    """Tracks completion percentages across all PRISM development areas."""
    
    PROGRESS_FILE = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\PROGRESS.json")
    
    def __init__(self):
        self.logger = setup_logger('progress_tracker')
        self._progress: Dict[str, Dict[str, int]] = {}
        self._load()
    
    def _load(self):
        """Load progress from file."""
        if self.PROGRESS_FILE.exists():
            try:
                self._progress = json.loads(self.PROGRESS_FILE.read_text(encoding='utf-8'))
            except:
                self._progress = {}
        else:
            self._progress = {
                'extraction': {},
                'materials': {},
                'utilization': {},
                'sessions': {'completed': 0, 'target': 130}
            }
    
    def _save(self):
        """Save progress to file."""
        save_json(self._progress, self.PROGRESS_FILE)
    
    def update(self, category: str, item: str, count: int) -> None:
        """
        Update progress count for an item.
        
        Args:
            category: Progress category (extraction, materials, etc.)
            item: Item being tracked
            count: Current count
        """
        if category not in self._progress:
            self._progress[category] = {}
        self._progress[category][item] = count
        self._save()
        self.logger.info(f"Updated {category}.{item} = {count}")
    
    def increment(self, category: str, item: str, amount: int = 1) -> int:
        """Increment progress count."""
        if category not in self._progress:
            self._progress[category] = {}
        current = self._progress[category].get(item, 0)
        self._progress[category][item] = current + amount
        self._save()
        return self._progress[category][item]
    
    def get(self, category: str, item: str) -> int:
        """Get current progress count."""
        return self._progress.get(category, {}).get(item, 0)
    
    def get_percentage(self, category: str, item: str) -> float:
        """Get completion percentage for an item."""
        current = self.get(category, item)
        
        # Find target
        target = 0
        if category == 'extraction':
            target = TARGETS['modules'].get(item, TARGETS['databases'].get(item, TARGETS['engines'].get(item, 0)))
        elif category == 'materials':
            target = TARGETS['materials'].get(item, TARGETS['materials']['total'])
        elif category == 'sessions':
            target = self._progress.get('sessions', {}).get('target', 130)
        
        if target > 0:
            return (current / target) * 100
        return 0.0
    
    def generate_report(self) -> ProgressReport:
        """Generate comprehensive progress report."""
        report = ProgressReport()
        
        # Extraction progress
        for item, target in TARGETS['modules'].items():
            current = self.get('extraction', item)
            report.extraction[item] = ProgressItem(item, current, target)
        
        # Materials progress
        for item, target in TARGETS['materials'].items():
            current = self.get('materials', item)
            report.materials[item] = ProgressItem(item, current, target)
        
        # Session progress
        sessions_done = self._progress.get('sessions', {}).get('completed', 0)
        sessions_target = self._progress.get('sessions', {}).get('target', 130)
        report.sessions = ProgressItem('sessions', sessions_done, sessions_target)
        
        # Calculate overall percentage
        weights = {'extraction': 0.4, 'materials': 0.4, 'sessions': 0.2}
        
        ext_pct = sum(p.percentage for p in report.extraction.values()) / len(report.extraction) if report.extraction else 0
        mat_pct = sum(p.percentage for p in report.materials.values()) / len(report.materials) if report.materials else 0
        sess_pct = report.sessions.percentage if report.sessions else 0
        
        report.overall_percentage = (
            ext_pct * weights['extraction'] +
            mat_pct * weights['materials'] +
            sess_pct * weights['sessions']
        )
        
        return report
    
    def get_summary(self) -> str:
        """Get text summary of progress."""
        report = self.generate_report()
        
        lines = [
            "=" * 60,
            "PRISM DEVELOPMENT PROGRESS",
            "=" * 60,
            f"Overall: {report.overall_percentage:.1f}%",
            f"Generated: {report.timestamp}",
            "",
            "-" * 40,
            "EXTRACTION",
            "-" * 40,
        ]
        
        for name, item in sorted(report.extraction.items(), key=lambda x: -x[1].percentage):
            bar = self._progress_bar(item.percentage)
            lines.append(f"{name:<20} {bar} {item.current:>4}/{item.target:<4} ({item.percentage:>5.1f}%)")
        
        lines.extend([
            "",
            "-" * 40,
            "MATERIALS",
            "-" * 40,
        ])
        
        total_mat = report.materials.get('total', ProgressItem('total', 0, 1047))
        bar = self._progress_bar(total_mat.percentage)
        lines.append(f"{'Total Materials':<20} {bar} {total_mat.current:>4}/{total_mat.target:<4}")
        
        lines.extend([
            "",
            "-" * 40,
            "SESSIONS",
            "-" * 40,
        ])
        
        if report.sessions:
            bar = self._progress_bar(report.sessions.percentage)
            lines.append(f"{'Completed':<20} {bar} {report.sessions.current:>4}/{report.sessions.target:<4}")
        
        return "\n".join(lines)
    
    def _progress_bar(self, percentage: float, width: int = 20) -> str:
        """Generate ASCII progress bar."""
        filled = int(width * percentage / 100)
        empty = width - filled
        return f"[{'█' * filled}{'░' * empty}]"
    
    def check_milestone(self) -> List[str]:
        """Check if any milestones have been reached."""
        report = self.generate_report()
        milestones = []
        
        milestone_thresholds = [25, 50, 75, 100]
        
        for item in report.extraction.values():
            for threshold in milestone_thresholds:
                if item.percentage >= threshold and item.percentage - (item.current - 1) / item.target * 100 < threshold:
                    milestones.append(f"🎉 {item.name} reached {threshold}% ({item.current}/{item.target})")
        
        if report.overall_percentage >= 25 and report.overall_percentage < 26:
            milestones.append("🎉 Overall progress reached 25%!")
        elif report.overall_percentage >= 50 and report.overall_percentage < 51:
            milestones.append("🎉 Overall progress reached 50%!")
        elif report.overall_percentage >= 75 and report.overall_percentage < 76:
            milestones.append("🎉 Overall progress reached 75%!")
        
        return milestones


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for progress tracker."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Progress Tracker')
    parser.add_argument('action', choices=['view', 'update', 'increment'])
    parser.add_argument('--category', type=str)
    parser.add_argument('--item', type=str)
    parser.add_argument('--count', type=int)
    
    args = parser.parse_args()
    
    tracker = ProgressTracker()
    
    if args.action == 'view':
        print(tracker.get_summary())
    
    elif args.action == 'update' and args.category and args.item and args.count is not None:
        tracker.update(args.category, args.item, args.count)
        print(f"Updated {args.category}.{args.item} = {args.count}")
        print(f"New percentage: {tracker.get_percentage(args.category, args.item):.1f}%")
    
    elif args.action == 'increment' and args.category and args.item:
        new_count = tracker.increment(args.category, args.item, args.count or 1)
        print(f"Incremented {args.category}.{args.item} to {new_count}")


if __name__ == "__main__":
    main()
