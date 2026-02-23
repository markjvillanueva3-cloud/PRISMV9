# PRISM Automation Toolkit - Database Consumer Tracker
# Version: 1.0.0
# Created: 2026-01-23
#
# Tracks which modules consume each database to enforce 100% utilization.
# Part of Toolkit 3: Database Audit

import sys
import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS, VALIDATION_THRESHOLDS
from core.logger import setup_logger
from core.utils import save_json, timestamp


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ConsumerInfo:
    """Information about a module that consumes a database."""
    module_name: str
    source_file: str
    fields_accessed: List[str] = field(default_factory=list)
    methods_called: List[str] = field(default_factory=list)
    line_numbers: List[int] = field(default_factory=list)


@dataclass
class DatabaseConsumers:
    """All consumers of a specific database."""
    database_name: str
    total_consumers: int = 0
    consumer_list: List[ConsumerInfo] = field(default_factory=list)
    meets_minimum: bool = False
    utilization_score: float = 0.0
    
    @property
    def consumer_names(self) -> List[str]:
        return [c.module_name for c in self.consumer_list]


@dataclass
class ConsumerReport:
    """Complete consumer tracking report."""
    timestamp: str = field(default_factory=timestamp)
    source_path: str = ""
    total_databases: int = 0
    databases_meeting_minimum: int = 0
    databases_below_minimum: int = 0
    average_consumers: float = 0.0
    database_consumers: Dict[str, DatabaseConsumers] = field(default_factory=dict)


# =============================================================================
# DATABASE PATTERNS
# =============================================================================

# Known databases (62 from manifest)
KNOWN_DATABASES = [
    # Materials (6)
    'PRISM_MATERIAL_KC_DATABASE', 'PRISM_ENHANCED_MATERIAL_DATABASE',
    'PRISM_EXTENDED_MATERIAL_CUTTING_DB', 'PRISM_JOHNSON_COOK_DATABASE',
    'PRISM_MATERIALS_MASTER', 'PRISM_CONSOLIDATED_MATERIALS',
    # Machines (7 CORE)
    'PRISM_POST_MACHINE_DATABASE', 'PRISM_LATHE_MACHINE_DB',
    'PRISM_LATHE_V2_MACHINE_DATABASE_V2', 'PRISM_MACHINE_3D_DATABASE',
    'PRISM_MACHINE_3D_MODEL_DATABASE_V2', 'PRISM_MACHINE_3D_MODEL_DATABASE_V3',
    'PRISM_OKUMA_MACHINE_CAD_DATABASE',
    # Tools (7)
    'PRISM_TOOL_DATABASE_V7', 'PRISM_CUTTING_TOOL_DATABASE_V2',
    'PRISM_STEEL_ENDMILL_DB_V2', 'PRISM_TOOL_PROPERTIES_DATABASE',
    'PRISM_TOOL_HOLDER_3D_DATABASE', 'PRISM_AI_TOOLPATH_DATABASE',
    'PRISM_TDM_TOOL_MANAGEMENT_DATABASE',
    # Workholding (10)
    'PRISM_WORKHOLDING_DATABASE', 'PRISM_FIXTURE_DATABASE',
    'PRISM_HYPERMILL_FIXTURE_DATABASE', 'PRISM_KURT_VISE_DATABASE',
    'PRISM_CHUCK_DATABASE_V2', 'PRISM_SCHUNK_DATABASE',
    'PRISM_SCHUNK_TOOLHOLDER_DATABASE', 'PRISM_LANG_DATABASE',
    'PRISM_JERGENS_DATABASE', 'PRISM_BIG_DAISHOWA_HOLDER_DATABASE',
    # Post Processors (7)
    'PRISM_CONTROLLER_DATABASE', 'PRISM_POST_PROCESSOR_DATABASE_V2',
    'PRISM_ENHANCED_POST_DATABASE_V2', 'PRISM_VERIFIED_POST_DATABASE_V2',
    'PRISM_FUSION_POST_DATABASE', 'PRISM_OKUMA_LATHE_GCODE_DATABASE',
    'PRISM_OKUMA_LATHE_MCODE_DATABASE',
]


# =============================================================================
# CONSUMER TRACKER CLASS
# =============================================================================

class ConsumerTracker:
    """Tracks database consumers across PRISM codebase."""
    
    def __init__(self, min_consumers: int = 6):
        self.min_consumers = min_consumers
        self.logger = setup_logger('consumer_tracker')
    
    def scan_directory(self, directory: Path, recursive: bool = True) -> ConsumerReport:
        """Scan directory for database consumers."""
        report = ConsumerReport(source_path=str(directory))
        
        pattern = '**/*.js' if recursive else '*.js'
        js_files = list(directory.glob(pattern))
        html_files = list(directory.glob('**/*.html' if recursive else '*.html'))
        all_files = js_files + html_files
        
        self.logger.info(f"Scanning {len(all_files)} files in {directory}")
        
        db_consumers: Dict[str, List[ConsumerInfo]] = {db: [] for db in KNOWN_DATABASES}
        
        for filepath in all_files:
            try:
                content = filepath.read_text(encoding='utf-8', errors='ignore')
                module_name = self._detect_module_name(content, filepath)
                
                for db_name in KNOWN_DATABASES:
                    if db_name in content:
                        consumer = ConsumerInfo(
                            module_name=module_name,
                            source_file=str(filepath),
                            fields_accessed=self._find_field_access(content, db_name),
                            methods_called=self._find_method_calls(content, db_name),
                            line_numbers=self._find_line_numbers(content, db_name)
                        )
                        db_consumers[db_name].append(consumer)
            except Exception as e:
                self.logger.warning(f"Error scanning {filepath}: {e}")
        
        # Build report
        for db_name, consumers in db_consumers.items():
            unique = {}
            for c in consumers:
                if c.module_name not in unique:
                    unique[c.module_name] = c
                else:
                    unique[c.module_name].fields_accessed.extend(c.fields_accessed)
            
            consumer_list = list(unique.values())
            report.database_consumers[db_name] = DatabaseConsumers(
                database_name=db_name,
                total_consumers=len(consumer_list),
                consumer_list=consumer_list,
                meets_minimum=len(consumer_list) >= self.min_consumers,
                utilization_score=min(len(consumer_list) / self.min_consumers, 1.0) * 100
            )
        
        report.total_databases = len(report.database_consumers)
        report.databases_meeting_minimum = sum(1 for dc in report.database_consumers.values() if dc.meets_minimum)
        report.databases_below_minimum = report.total_databases - report.databases_meeting_minimum
        if report.total_databases > 0:
            report.average_consumers = sum(dc.total_consumers for dc in report.database_consumers.values()) / report.total_databases
        
        return report
    
    def _detect_module_name(self, content: str, filepath: Path) -> str:
        match = re.search(r'window\.(PRISM_[A-Z0-9_]+)\s*=', content)
        if match: return match.group(1)
        match = re.search(r'const\s+(PRISM_[A-Z0-9_]+)\s*=', content)
        if match: return match.group(1)
        return filepath.stem.upper()
    
    def _find_field_access(self, content: str, db_name: str) -> List[str]:
        return list(set(re.findall(rf'{db_name}\.(\w+)', content)))[:10]
    
    def _find_method_calls(self, content: str, db_name: str) -> List[str]:
        return list(set(re.findall(rf'{db_name}\.(\w+)\s*\(', content)))[:10]
    
    def _find_line_numbers(self, content: str, db_name: str) -> List[int]:
        return [i for i, line in enumerate(content.split('\n'), 1) if db_name in line][:20]
    
    def generate_report(self, report: ConsumerReport) -> str:
        lines = ["=" * 70, "PRISM DATABASE CONSUMER TRACKING REPORT", "=" * 70]
        lines.append(f"Generated: {report.timestamp}")
        lines.append(f"Minimum Required: {self.min_consumers}\n")
        lines.append(f"Total: {report.total_databases} | Meeting: {report.databases_meeting_minimum} | Below: {report.databases_below_minimum}")
        
        below = [dc for dc in report.database_consumers.values() if not dc.meets_minimum]
        if below:
            lines.append("\n⚠ BELOW MINIMUM:")
            for dc in sorted(below, key=lambda x: x.total_consumers):
                lines.append(f"  ✗ {dc.database_name}: {dc.total_consumers}/{self.min_consumers}")
        
        return "\n".join(lines)
    
    def save_report(self, report: ConsumerReport, output_path: Path):
        save_json({'databases': {n: {'consumers': dc.total_consumers} for n, dc in report.database_consumers.items()}}, output_path)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='PRISM Consumer Tracker')
    parser.add_argument('directory', nargs='?', default='.')
    parser.add_argument('--min', type=int, default=6)
    args = parser.parse_args()
    
    tracker = ConsumerTracker(min_consumers=args.min)
    report = tracker.scan_directory(Path(args.directory))
    print(tracker.generate_report(report))


if __name__ == "__main__":
    main()
