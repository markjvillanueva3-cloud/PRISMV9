# PRISM Automation Toolkit - Utilization Report Generator
# Version: 1.0.0
# Created: 2026-01-23
#
# Generates comprehensive utilization reports for all PRISM components.
# Enforces the 100% utilization requirement from the 10 Commandments.

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS, VALIDATION_THRESHOLDS
from core.logger import setup_logger
from core.utils import save_json, timestamp


# =============================================================================
# UTILIZATION REQUIREMENTS
# =============================================================================

# Minimum consumers by database category (from 10 Commandments)
UTILIZATION_REQUIREMENTS = {
    'materials': {
        'min_consumers': 15,
        'required_consumers': [
            'SPEED_FEED_CALCULATOR', 'FORCE_CALCULATOR', 'THERMAL_ENGINE',
            'TOOL_LIFE_ENGINE', 'SURFACE_FINISH_ENGINE', 'CHATTER_PREDICTION',
            'CHIP_FORMATION_ENGINE', 'COOLANT_SELECTOR', 'COATING_OPTIMIZER',
            'COST_ESTIMATOR', 'CYCLE_TIME_PREDICTOR', 'QUOTING_ENGINE',
            'AI_LEARNING_PIPELINE', 'BAYESIAN_OPTIMIZER', 'EXPLAINABLE_AI'
        ]
    },
    'machines': {
        'min_consumers': 12,
        'required_consumers': [
            'SPEED_FEED_CALCULATOR', 'COLLISION_ENGINE', 'POST_PROCESSOR_GENERATOR',
            'CHATTER_PREDICTION', 'CYCLE_TIME_PREDICTOR', 'COST_ESTIMATOR',
            'SCHEDULING_ENGINE', 'QUOTING_ENGINE', 'CAPABILITY_MATCHER',
            '3D_VISUALIZATION', 'AI_LEARNING_PIPELINE', 'EXPLAINABLE_AI'
        ]
    },
    'tools': {
        'min_consumers': 10,
        'required_consumers': [
            'SPEED_FEED_CALCULATOR', 'FORCE_CALCULATOR', 'TOOL_LIFE_ENGINE',
            'DEFLECTION_ENGINE', 'COLLISION_ENGINE', 'COST_ESTIMATOR',
            'INVENTORY_ENGINE', 'TOOLPATH_ENGINE', 'AI_LEARNING_PIPELINE',
            'EXPLAINABLE_AI'
        ]
    },
    'workholding': {'min_consumers': 8},
    'post_processors': {'min_consumers': 8},
    'controllers': {'min_consumers': 8},
    'default': {'min_consumers': 6}
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class UtilizationEntry:
    """Utilization status of a single component."""
    name: str
    category: str
    current_consumers: int
    required_consumers: int
    missing_consumers: List[str] = field(default_factory=list)
    utilization_percent: float = 0.0
    status: str = 'UNKNOWN'  # PASS, FAIL, WARN
    
    def calculate_status(self):
        if self.required_consumers == 0:
            self.utilization_percent = 100.0
            self.status = 'PASS'
        else:
            self.utilization_percent = (self.current_consumers / self.required_consumers) * 100
            if self.utilization_percent >= 100:
                self.status = 'PASS'
            elif self.utilization_percent >= 80:
                self.status = 'WARN'
            else:
                self.status = 'FAIL'


@dataclass
class UtilizationReport:
    """Complete utilization report."""
    timestamp: str
    overall_utilization: float = 0.0
    overall_status: str = 'UNKNOWN'
    total_components: int = 0
    components_passing: int = 0
    components_failing: int = 0
    components_warning: int = 0
    entries: List[UtilizationEntry] = field(default_factory=list)
    critical_gaps: List[str] = field(default_factory=list)


# =============================================================================
# UTILIZATION REPORT GENERATOR
# =============================================================================

class UtilizationReportGenerator:
    """
    Generates utilization reports based on consumer tracking data.
    Identifies gaps and enforces the 100% utilization requirement.
    """
    
    def __init__(self):
        self.logger = setup_logger('UtilizationReport')
    
    def generate_from_consumer_report(self, consumer_data: dict) -> UtilizationReport:
        """Generate utilization report from consumer tracker output."""
        report = UtilizationReport(timestamp=timestamp())
        
        databases = consumer_data.get('databases', {})
        
        for db_name, db_info in databases.items():
            category = self._detect_category(db_name)
            requirements = UTILIZATION_REQUIREMENTS.get(
                category, 
                UTILIZATION_REQUIREMENTS['default']
            )
            
            entry = UtilizationEntry(
                name=db_name,
                category=category,
                current_consumers=db_info.get('total_consumers', 0),
                required_consumers=requirements['min_consumers']
            )
            
            # Check for missing required consumers
            if 'required_consumers' in requirements:
                actual_consumers = [c['module'] for c in db_info.get('consumers', [])]
                for required in requirements['required_consumers']:
                    if not any(required in c for c in actual_consumers):
                        entry.missing_consumers.append(required)
            
            entry.calculate_status()
            report.entries.append(entry)
        
        # Calculate overall stats
        report.total_components = len(report.entries)
        report.components_passing = sum(1 for e in report.entries if e.status == 'PASS')
        report.components_failing = sum(1 for e in report.entries if e.status == 'FAIL')
        report.components_warning = sum(1 for e in report.entries if e.status == 'WARN')
        
        if report.total_components > 0:
            report.overall_utilization = (
                sum(e.utilization_percent for e in report.entries) / report.total_components
            )
        
        # Determine overall status
        if report.components_failing > 0:
            report.overall_status = 'FAIL'
        elif report.components_warning > 0:
            report.overall_status = 'WARN'
        else:
            report.overall_status = 'PASS'
        
        # Identify critical gaps
        for entry in report.entries:
            if entry.status == 'FAIL' and entry.current_consumers == 0:
                report.critical_gaps.append(f"{entry.name}: COMPLETELY UNUSED")
            elif entry.status == 'FAIL':
                report.critical_gaps.append(
                    f"{entry.name}: {entry.current_consumers}/{entry.required_consumers} consumers"
                )
        
        return report
    
    def _detect_category(self, db_name: str) -> str:
        """Detect database category from name."""
        name_upper = db_name.upper()
        
        if 'MATERIAL' in name_upper:
            return 'materials'
        elif 'MACHINE' in name_upper or 'LATHE' in name_upper or 'MILL' in name_upper:
            return 'machines'
        elif 'TOOL' in name_upper and 'PATH' not in name_upper:
            return 'tools'
        elif 'WORKHOLDING' in name_upper or 'FIXTURE' in name_upper or 'VISE' in name_upper:
            return 'workholding'
        elif 'POST' in name_upper:
            return 'post_processors'
        elif 'CONTROLLER' in name_upper:
            return 'controllers'
        else:
            return 'default'
    
    def generate_text_report(self, report: UtilizationReport) -> str:
        """Generate formatted text report."""
        lines = []
        lines.append("=" * 70)
        lines.append("PRISM UTILIZATION REPORT")
        lines.append("100% Utilization Requirement Enforcement")
        lines.append("=" * 70)
        lines.append(f"Generated: {report.timestamp}")
        lines.append("")
        
        # Overall Status
        status_icon = "✓" if report.overall_status == 'PASS' else "✗" if report.overall_status == 'FAIL' else "⚠"
        lines.append("-" * 40)
        lines.append(f"OVERALL STATUS: {status_icon} {report.overall_status}")
        lines.append("-" * 40)
        lines.append(f"Overall Utilization:   {report.overall_utilization:.1f}%")
        lines.append(f"Total Components:      {report.total_components}")
        lines.append(f"Passing (100%):        {report.components_passing} ✓")
        lines.append(f"Warning (80-99%):      {report.components_warning} ⚠")
        lines.append(f"Failing (<80%):        {report.components_failing} ✗")
        lines.append("")
        
        # Critical Gaps
        if report.critical_gaps:
            lines.append("-" * 40)
            lines.append("⚠ CRITICAL GAPS - IMMEDIATE ACTION REQUIRED")
            lines.append("-" * 40)
            for gap in report.critical_gaps:
                lines.append(f"  ✗ {gap}")
            lines.append("")
        
        # Detailed breakdown by status
        failing = [e for e in report.entries if e.status == 'FAIL']
        warning = [e for e in report.entries if e.status == 'WARN']
        passing = [e for e in report.entries if e.status == 'PASS']
        
        if failing:
            lines.append("-" * 40)
            lines.append("FAILING COMPONENTS")
            lines.append("-" * 40)
            for entry in sorted(failing, key=lambda x: x.utilization_percent):
                lines.append(f"\n✗ {entry.name}")
                lines.append(f"  Category: {entry.category}")
                lines.append(f"  Consumers: {entry.current_consumers}/{entry.required_consumers} ({entry.utilization_percent:.0f}%)")
                if entry.missing_consumers:
                    lines.append(f"  Missing: {', '.join(entry.missing_consumers[:5])}")
                    if len(entry.missing_consumers) > 5:
                        lines.append(f"          (+{len(entry.missing_consumers) - 5} more)")
        
        if warning:
            lines.append("")
            lines.append("-" * 40)
            lines.append("WARNING COMPONENTS (80-99%)")
            lines.append("-" * 40)
            for entry in sorted(warning, key=lambda x: x.utilization_percent):
                lines.append(f"⚠ {entry.name}: {entry.utilization_percent:.0f}%")
        
        if passing:
            lines.append("")
            lines.append("-" * 40)
            lines.append("PASSING COMPONENTS (100%)")
            lines.append("-" * 40)
            for entry in sorted(passing, key=lambda x: -x.utilization_percent):
                lines.append(f"✓ {entry.name}: {entry.current_consumers} consumers")
        
        lines.append("")
        lines.append("=" * 70)
        lines.append("10 COMMANDMENTS REMINDER:")
        lines.append("'IF IT EXISTS, USE IT EVERYWHERE'")
        lines.append("Every database must have minimum 6-8 consumers to be considered utilized.")
        lines.append("=" * 70)
        
        return "\n".join(lines)
    
    def save_json_report(self, report: UtilizationReport, output_path: Path):
        """Save report as JSON."""
        data = {
            'timestamp': report.timestamp,
            'overall': {
                'utilization': report.overall_utilization,
                'status': report.overall_status,
                'total_components': report.total_components,
                'passing': report.components_passing,
                'failing': report.components_failing,
                'warning': report.components_warning
            },
            'critical_gaps': report.critical_gaps,
            'entries': [
                {
                    'name': e.name,
                    'category': e.category,
                    'current_consumers': e.current_consumers,
                    'required_consumers': e.required_consumers,
                    'utilization_percent': e.utilization_percent,
                    'status': e.status,
                    'missing_consumers': e.missing_consumers
                }
                for e in report.entries
            ]
        }
        save_json(data, output_path)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for utilization report."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Utilization Report Generator')
    parser.add_argument('consumer_report', help='Path to consumer tracker JSON output')
    parser.add_argument('--output', type=str, help='Save text report to file')
    parser.add_argument('--json', type=str, help='Save JSON report to file')
    
    args = parser.parse_args()
    
    # Load consumer report
    with open(args.consumer_report, 'r') as f:
        consumer_data = json.load(f)
    
    generator = UtilizationReportGenerator()
    report = generator.generate_from_consumer_report(consumer_data)
    
    # Print report
    text_report = generator.generate_text_report(report)
    print(text_report)
    
    # Save if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(text_report)
        print(f"\nText report saved to: {args.output}")
    
    if args.json:
        generator.save_json_report(report, Path(args.json))
        print(f"JSON report saved to: {args.json}")
    
    # Exit with appropriate code
    sys.exit(0 if report.overall_status == 'PASS' else 1)


if __name__ == "__main__":
    main()
