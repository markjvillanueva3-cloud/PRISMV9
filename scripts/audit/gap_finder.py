# PRISM Automation Toolkit - Gap Finder
# Version: 1.0.0
# Created: 2026-01-23
#
# Identifies gaps in database utilization and generates wiring recommendations.
# Supports the 100% utilization enforcement requirement.

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import save_json, timestamp


# =============================================================================
# CONSUMER RECOMMENDATIONS
# =============================================================================

# Known consumer relationships - what SHOULD consume what
RECOMMENDED_CONSUMERS = {
    'PRISM_MATERIALS_MASTER': [
        ('PRISM_SPEED_FEED_CALCULATOR', ['base_speed', 'machinability', 'hardness']),
        ('PRISM_FORCE_CALCULATOR', ['kc1_1', 'mc', 'yield_strength']),
        ('PRISM_THERMAL_ENGINE', ['thermal_conductivity', 'specific_heat', 'melting_point']),
        ('PRISM_TOOL_LIFE_ENGINE', ['taylor_n', 'taylor_C', 'abrasiveness']),
        ('PRISM_SURFACE_FINISH_ENGINE', ['elastic_modulus', 'bue_tendency']),
        ('PRISM_CHATTER_PREDICTION', ['damping_ratio', 'elastic_modulus']),
        ('PRISM_CHIP_FORMATION_ENGINE', ['strain_hardening_exp', 'chip_type']),
        ('PRISM_COOLANT_SELECTOR', ['reactivity', 'coolant_compatibility']),
        ('PRISM_COATING_OPTIMIZER', ['chemical_affinity', 'max_temp']),
        ('PRISM_COST_ESTIMATOR', ['material_cost', 'density']),
        ('PRISM_CYCLE_TIME_PREDICTOR', ['machinability', 'all_cutting_params']),
        ('PRISM_QUOTING_ENGINE', ['material_cost', 'machinability']),
        ('PRISM_AI_LEARNING_PIPELINE', ['all_fields']),
        ('PRISM_BAYESIAN_OPTIMIZER', ['uncertainty_params']),
        ('PRISM_EXPLAINABLE_AI', ['all_fields']),
    ],
    'PRISM_MACHINES_DATABASE': [
        ('PRISM_SPEED_FEED_CALCULATOR', ['rpm_max', 'feed_max', 'power']),
        ('PRISM_COLLISION_ENGINE', ['work_envelope', 'axis_limits']),
        ('PRISM_POST_PROCESSOR_GENERATOR', ['controller', 'capabilities']),
        ('PRISM_CHATTER_PREDICTION', ['spindle_stiffness', 'natural_freq']),
        ('PRISM_CYCLE_TIME_PREDICTOR', ['rapid_rates', 'accel_decel']),
        ('PRISM_COST_ESTIMATOR', ['hourly_rate', 'efficiency']),
        ('PRISM_SCHEDULING_ENGINE', ['availability', 'capabilities']),
        ('PRISM_QUOTING_ENGINE', ['hourly_rate', 'setup_time']),
        ('PRISM_CAPABILITY_MATCHER', ['all_capability_fields']),
        ('PRISM_3D_VISUALIZATION', ['kinematics', 'geometry']),
        ('PRISM_AI_LEARNING_PIPELINE', ['all_fields']),
        ('PRISM_EXPLAINABLE_AI', ['all_fields']),
    ],
    'PRISM_TOOLS_DATABASE': [
        ('PRISM_SPEED_FEED_CALCULATOR', ['geometry', 'coating', 'grade']),
        ('PRISM_FORCE_CALCULATOR', ['rake_angle', 'edge_radius']),
        ('PRISM_TOOL_LIFE_ENGINE', ['substrate', 'coating', 'geometry']),
        ('PRISM_DEFLECTION_ENGINE', ['length', 'diameter', 'material']),
        ('PRISM_COLLISION_ENGINE', ['3d_model', 'holder_assembly']),
        ('PRISM_COST_ESTIMATOR', ['tool_cost', 'expected_life']),
        ('PRISM_INVENTORY_ENGINE', ['stock_level', 'reorder_point']),
        ('PRISM_TOOLPATH_ENGINE', ['cutting_geometry', 'chip_load']),
        ('PRISM_AI_LEARNING_PIPELINE', ['all_fields']),
        ('PRISM_EXPLAINABLE_AI', ['all_fields']),
    ],
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class GapInfo:
    """Information about a utilization gap."""
    database_name: str
    current_consumers: int
    required_consumers: int
    gap_count: int
    missing_consumers: List[Tuple[str, List[str]]] = field(default_factory=list)
    severity: str = 'LOW'  # LOW, MEDIUM, HIGH, CRITICAL
    priority_score: float = 0.0
    
    def calculate_severity(self):
        """Calculate severity based on gap size."""
        if self.current_consumers == 0:
            self.severity = 'CRITICAL'
            self.priority_score = 100.0
        elif self.gap_count >= self.required_consumers * 0.5:
            self.severity = 'HIGH'
            self.priority_score = 75.0 + (self.gap_count * 2)
        elif self.gap_count >= 3:
            self.severity = 'MEDIUM'
            self.priority_score = 50.0 + (self.gap_count * 2)
        else:
            self.severity = 'LOW'
            self.priority_score = 25.0 + (self.gap_count * 2)


@dataclass
class WiringRecommendation:
    """Recommendation for wiring a consumer to a database."""
    database_name: str
    consumer_name: str
    fields_to_access: List[str]
    priority: str  # HIGH, MEDIUM, LOW
    rationale: str
    code_snippet: str = ''


@dataclass
class GapReport:
    """Complete gap analysis report."""
    timestamp: str
    total_gaps: int = 0
    critical_gaps: int = 0
    high_gaps: int = 0
    medium_gaps: int = 0
    low_gaps: int = 0
    gaps: List[GapInfo] = field(default_factory=list)
    recommendations: List[WiringRecommendation] = field(default_factory=list)


# =============================================================================
# GAP FINDER
# =============================================================================

class GapFinder:
    """
    Finds gaps in database utilization and generates recommendations.
    """
    
    def __init__(self, min_consumers: int = 6):
        self.min_consumers = min_consumers
        self.logger = setup_logger('GapFinder')
    
    def analyze_gaps(self, consumer_data: dict) -> GapReport:
        """Analyze consumer data to find utilization gaps."""
        report = GapReport(timestamp=timestamp())
        
        databases = consumer_data.get('databases', {})
        
        for db_name, db_info in databases.items():
            current = db_info.get('total_consumers', 0)
            required = self._get_required_consumers(db_name)
            
            if current < required:
                gap = GapInfo(
                    database_name=db_name,
                    current_consumers=current,
                    required_consumers=required,
                    gap_count=required - current
                )
                
                # Find missing consumers
                actual_consumers = set(c['module'] for c in db_info.get('consumers', []))
                recommended = RECOMMENDED_CONSUMERS.get(db_name, [])
                
                for consumer_name, fields in recommended:
                    if not any(consumer_name in c for c in actual_consumers):
                        gap.missing_consumers.append((consumer_name, fields))
                
                gap.calculate_severity()
                report.gaps.append(gap)
                
                # Generate recommendations for this gap
                for consumer_name, fields in gap.missing_consumers[:5]:  # Top 5
                    rec = self._generate_recommendation(db_name, consumer_name, fields, gap.severity)
                    report.recommendations.append(rec)
        
        # Sort gaps by priority
        report.gaps.sort(key=lambda x: -x.priority_score)
        
        # Calculate totals
        report.total_gaps = len(report.gaps)
        report.critical_gaps = sum(1 for g in report.gaps if g.severity == 'CRITICAL')
        report.high_gaps = sum(1 for g in report.gaps if g.severity == 'HIGH')
        report.medium_gaps = sum(1 for g in report.gaps if g.severity == 'MEDIUM')
        report.low_gaps = sum(1 for g in report.gaps if g.severity == 'LOW')
        
        return report
    
    def _get_required_consumers(self, db_name: str) -> int:
        """Get required consumer count for database."""
        name_upper = db_name.upper()
        
        if 'MATERIAL' in name_upper:
            return 15
        elif 'MACHINE' in name_upper:
            return 12
        elif 'TOOL' in name_upper and 'PATH' not in name_upper:
            return 10
        elif 'WORKHOLDING' in name_upper or 'FIXTURE' in name_upper:
            return 8
        elif 'POST' in name_upper or 'CONTROLLER' in name_upper:
            return 8
        else:
            return self.min_consumers
    
    def _generate_recommendation(self, db_name: str, consumer_name: str, 
                                  fields: List[str], severity: str) -> WiringRecommendation:
        """Generate a wiring recommendation."""
        # Determine priority based on severity
        if severity in ['CRITICAL', 'HIGH']:
            priority = 'HIGH'
        elif severity == 'MEDIUM':
            priority = 'MEDIUM'
        else:
            priority = 'LOW'
        
        # Generate rationale
        rationale = f"{consumer_name} should consume {db_name} to access {', '.join(fields[:3])}"
        if len(fields) > 3:
            rationale += f" and {len(fields) - 3} more fields"
        
        # Generate code snippet
        snippet = self._generate_code_snippet(db_name, consumer_name, fields)
        
        return WiringRecommendation(
            database_name=db_name,
            consumer_name=consumer_name,
            fields_to_access=fields,
            priority=priority,
            rationale=rationale,
            code_snippet=snippet
        )
    
    def _generate_code_snippet(self, db_name: str, consumer_name: str, 
                                fields: List[str]) -> str:
        """Generate example wiring code."""
        fields_str = ', '.join(f"'{f}'" for f in fields[:4])
        return f"""// In {consumer_name}:
const data = PRISM_GATEWAY.request('{db_name}', {{
  fields: [{fields_str}],
  // ... query params
}});"""
    
    def generate_text_report(self, report: GapReport) -> str:
        """Generate formatted text report."""
        lines = []
        lines.append("=" * 70)
        lines.append("PRISM UTILIZATION GAP ANALYSIS")
        lines.append("=" * 70)
        lines.append(f"Generated: {report.timestamp}")
        lines.append("")
        
        # Summary
        lines.append("-" * 40)
        lines.append("GAP SUMMARY")
        lines.append("-" * 40)
        lines.append(f"Total Databases with Gaps: {report.total_gaps}")
        lines.append(f"  CRITICAL (unused):       {report.critical_gaps}")
        lines.append(f"  HIGH (>50% missing):     {report.high_gaps}")
        lines.append(f"  MEDIUM (3+ missing):     {report.medium_gaps}")
        lines.append(f"  LOW (<3 missing):        {report.low_gaps}")
        lines.append("")
        
        # Critical gaps first
        critical = [g for g in report.gaps if g.severity == 'CRITICAL']
        if critical:
            lines.append("-" * 40)
            lines.append("🚨 CRITICAL GAPS - COMPLETELY UNUSED")
            lines.append("-" * 40)
            for gap in critical:
                lines.append(f"\n✗ {gap.database_name}")
                lines.append(f"  Status: 0 consumers - DATABASE IS DEAD CODE!")
                lines.append(f"  Required: {gap.required_consumers} consumers")
                if gap.missing_consumers:
                    lines.append(f"  Should be used by:")
                    for consumer, fields in gap.missing_consumers[:5]:
                        lines.append(f"    - {consumer}")
        
        # High priority gaps
        high = [g for g in report.gaps if g.severity == 'HIGH']
        if high:
            lines.append("")
            lines.append("-" * 40)
            lines.append("⚠ HIGH PRIORITY GAPS")
            lines.append("-" * 40)
            for gap in high:
                lines.append(f"\n✗ {gap.database_name}")
                lines.append(f"  Current: {gap.current_consumers}/{gap.required_consumers}")
                lines.append(f"  Missing: {gap.gap_count} consumers")
        
        # Recommendations
        if report.recommendations:
            high_recs = [r for r in report.recommendations if r.priority == 'HIGH']
            if high_recs:
                lines.append("")
                lines.append("-" * 40)
                lines.append("TOP PRIORITY RECOMMENDATIONS")
                lines.append("-" * 40)
                for i, rec in enumerate(high_recs[:10], 1):
                    lines.append(f"\n{i}. Wire {rec.consumer_name} → {rec.database_name}")
                    lines.append(f"   Fields: {', '.join(rec.fields_to_access[:4])}")
                    lines.append(f"   {rec.rationale}")
        
        lines.append("")
        lines.append("=" * 70)
        lines.append("ACTION: Address CRITICAL gaps immediately - they represent dead code.")
        lines.append("=" * 70)
        
        return "\n".join(lines)
    
    def save_json_report(self, report: GapReport, output_path: Path):
        """Save report as JSON."""
        data = {
            'timestamp': report.timestamp,
            'summary': {
                'total_gaps': report.total_gaps,
                'critical': report.critical_gaps,
                'high': report.high_gaps,
                'medium': report.medium_gaps,
                'low': report.low_gaps
            },
            'gaps': [
                {
                    'database': g.database_name,
                    'current_consumers': g.current_consumers,
                    'required_consumers': g.required_consumers,
                    'gap_count': g.gap_count,
                    'severity': g.severity,
                    'priority_score': g.priority_score,
                    'missing_consumers': [
                        {'name': name, 'fields': fields}
                        for name, fields in g.missing_consumers
                    ]
                }
                for g in report.gaps
            ],
            'recommendations': [
                {
                    'database': r.database_name,
                    'consumer': r.consumer_name,
                    'fields': r.fields_to_access,
                    'priority': r.priority,
                    'rationale': r.rationale,
                    'code_snippet': r.code_snippet
                }
                for r in report.recommendations
            ]
        }
        save_json(data, output_path)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for gap finder."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Utilization Gap Finder')
    parser.add_argument('consumer_report', help='Path to consumer tracker JSON output')
    parser.add_argument('--min', type=int, default=6, help='Default minimum consumers')
    parser.add_argument('--output', type=str, help='Save text report to file')
    parser.add_argument('--json', type=str, help='Save JSON report to file')
    
    args = parser.parse_args()
    
    # Load consumer report
    with open(args.consumer_report, 'r') as f:
        consumer_data = json.load(f)
    
    finder = GapFinder(min_consumers=args.min)
    report = finder.analyze_gaps(consumer_data)
    
    # Print report
    text_report = finder.generate_text_report(report)
    print(text_report)
    
    # Save if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(text_report)
        print(f"\nText report saved to: {args.output}")
    
    if args.json:
        finder.save_json_report(report, Path(args.json))
        print(f"JSON report saved to: {args.json}")


if __name__ == "__main__":
    main()
