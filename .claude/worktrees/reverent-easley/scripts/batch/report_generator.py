# PRISM Automation Toolkit - Report Generator
# Version: 1.0.0
# Created: 2026-01-23
#
# Comprehensive report generation for PRISM development.
# Part of Toolkit 5: Batch Processing

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, save_json


# =============================================================================
# REPORT TEMPLATES
# =============================================================================

REPORT_SECTIONS = {
    'executive': ['summary', 'progress', 'blockers', 'next_steps'],
    'technical': ['extraction', 'databases', 'engines', 'utilization', 'validation'],
    'materials': ['coverage', 'categories', 'parameters', 'quality'],
    'full': ['summary', 'progress', 'extraction', 'databases', 'engines', 
             'materials', 'utilization', 'validation', 'blockers', 'next_steps']
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ReportSection:
    """Single section of a report."""
    title: str
    content: str
    data: Dict = field(default_factory=dict)


@dataclass
class Report:
    """Complete report."""
    report_type: str
    generated: str = field(default_factory=timestamp)
    title: str = ""
    sections: List[ReportSection] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


# =============================================================================
# REPORT GENERATOR CLASS
# =============================================================================

class ReportGenerator:
    """Generates comprehensive reports for PRISM development."""
    
    STATE_FILE = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json")
    OUTPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\REPORTS")
    
    def __init__(self):
        self.logger = setup_logger('report_generator')
        self.OUTPUT_DIR.mkdir(exist_ok=True)
        self._state: Dict = None
    
    @property
    def state(self) -> Dict:
        """Load current state."""
        if self._state is None:
            if self.STATE_FILE.exists():
                self._state = json.loads(self.STATE_FILE.read_text(encoding='utf-8'))
            else:
                self._state = {}
        return self._state
    
    def generate(self, report_type: str = 'full', 
                output_format: str = 'markdown') -> Path:
        """
        Generate a report.
        
        Args:
            report_type: Type of report (executive, technical, materials, full)
            output_format: Output format (markdown, json, html)
            
        Returns:
            Path to generated report
        """
        sections = REPORT_SECTIONS.get(report_type, REPORT_SECTIONS['full'])
        
        report = Report(
            report_type=report_type,
            title=f"PRISM Development Report - {report_type.title()}"
        )
        
        # Generate each section
        for section_name in sections:
            generator = getattr(self, f'_section_{section_name}', None)
            if generator:
                section = generator()
                report.sections.append(section)
        
        # Output report
        if output_format == 'markdown':
            return self._output_markdown(report)
        elif output_format == 'json':
            return self._output_json(report)
        elif output_format == 'html':
            return self._output_html(report)
        else:
            return self._output_markdown(report)
    
    # ==========================================================================
    # SECTION GENERATORS
    # ==========================================================================
    
    def _section_summary(self) -> ReportSection:
        """Generate summary section."""
        meta = self.state.get('meta', {})
        work = self.state.get('currentWork', {})
        
        content = f"""
**Last Updated:** {meta.get('lastUpdated', 'Unknown')}
**Current Session:** {meta.get('lastSessionId', 'Unknown')}
**Phase:** {work.get('phase', 'Unknown')}
**Status:** {work.get('status', 'Unknown')}
**Focus:** {work.get('focus', 'Unknown')}
"""
        return ReportSection(title="Summary", content=content, data=meta)
    
    def _section_progress(self) -> ReportSection:
        """Generate progress section."""
        ext = self.state.get('extractionProgress', {})
        mat = self.state.get('materialsProgress', {})
        
        total_extracted = ext.get('totalExtracted', 0)
        total_target = ext.get('totalTarget', 831)
        ext_pct = (total_extracted / total_target * 100) if total_target > 0 else 0
        
        total_materials = mat.get('totalMaterials', 0)
        target_materials = mat.get('targetMaterials', 1047)
        mat_pct = (total_materials / target_materials * 100) if target_materials > 0 else 0
        
        content = f"""
### Module Extraction
- **Progress:** {total_extracted}/{total_target} ({ext_pct:.1f}%)
- {self._progress_bar(ext_pct)}

### Materials Database
- **Progress:** {total_materials}/{target_materials} ({mat_pct:.1f}%)
- {self._progress_bar(mat_pct)}
- **Fully Parameterized:** {mat.get('fullyParameterized', 0)}
"""
        return ReportSection(title="Progress Overview", content=content)
    
    def _section_extraction(self) -> ReportSection:
        """Generate extraction status section."""
        ext = self.state.get('extractionProgress', {})
        
        dbs = ext.get('databases', {})
        engines = ext.get('engines', {})
        
        lines = ["### Databases"]
        for cat, count in sorted(dbs.items()):
            lines.append(f"- {cat}: {count}")
        
        lines.append("\n### Engines")
        for cat, count in sorted(engines.items()):
            lines.append(f"- {cat}: {count}")
        
        return ReportSection(
            title="Extraction Status",
            content="\n".join(lines),
            data={'databases': dbs, 'engines': engines}
        )
    
    def _section_databases(self) -> ReportSection:
        """Generate databases section."""
        content = """
### Database Categories (62 Total)
| Category | Target | Status |
|----------|--------|--------|
| Materials | 6 | ⬜ |
| Machines CORE | 7 | ⬜ |
| Machines ENHANCED | 33 | ✅ |
| Tools | 7 | ⬜ |
| Workholding | 10 | ⬜ |
| Post Processors | 7 | ⬜ |
| Process/Mfg | 6 | ⬜ |
| Business/Cost | 4 | ⬜ |
| AI/ML | 3 | ⬜ |
| CAD/CAM | 3 | ⬜ |
| Infrastructure | 6 | ⬜ |
"""
        return ReportSection(title="Databases", content=content)
    
    def _section_engines(self) -> ReportSection:
        """Generate engines section."""
        content = """
### Engine Categories (213 Total)
| Category | Count | Status |
|----------|-------|--------|
| CAD | 25 | ⬜ |
| CAM/Toolpath | 20 | ⬜ |
| Physics/Dynamics | 42 | ⬜ |
| AI/ML | 74 | ⬜ |
| Optimization | 44 | ⬜ |
| Signal Processing | 14 | ⬜ |
| Post Processor | 25 | ⬜ |
| Collision/Sim | 15 | ⬜ |
"""
        return ReportSection(title="Engines", content=content)
    
    def _section_materials(self) -> ReportSection:
        """Generate materials section."""
        mat = self.state.get('materialsProgress', {})
        
        content = f"""
### Materials Database Status
- **Total Materials:** {mat.get('totalMaterials', 0)}/{mat.get('targetMaterials', 1047)}
- **Parameters per Material:** 127
- **Fully Parameterized:** {mat.get('fullyParameterized', 0)}

### Categories in Progress
"""
        for cat in mat.get('categoriesInProgress', []):
            content += f"- {cat}\n"
        
        content += "\n### Categories Complete\n"
        for cat in mat.get('categoriesComplete', []):
            content += f"- ✅ {cat}\n"
        
        return ReportSection(title="Materials", content=content, data=mat)
    
    def _section_utilization(self) -> ReportSection:
        """Generate utilization section."""
        content = """
### Utilization Requirements (10 Commandments)
- **Minimum Consumers per Database:** 6
- **Minimum Data Sources per Calculation:** 6

### Current Status
- Database utilization tracking: **PENDING**
- Consumer mapping: **IN PROGRESS**
"""
        return ReportSection(title="Utilization", content=content)
    
    def _section_validation(self) -> ReportSection:
        """Generate validation section."""
        content = """
### Validation Infrastructure
- ✅ Material Schema (127 parameters)
- ✅ Material Validator
- ✅ Batch Validator
- ✅ Schema Checker
- ✅ Consumer Tracker
- ✅ Gap Finder

### Validation Status
- Materials validated: **PENDING**
- Physics checks passed: **PENDING**
"""
        return ReportSection(title="Validation", content=content)
    
    def _section_blockers(self) -> ReportSection:
        """Generate blockers section."""
        work = self.state.get('currentWork', {})
        blockers = work.get('blockers', [])
        
        if blockers:
            content = "\n".join(f"- ⚠️ {b}" for b in blockers)
        else:
            content = "✅ No current blockers"
        
        return ReportSection(title="Blockers", content=content)
    
    def _section_next_steps(self) -> ReportSection:
        """Generate next steps section."""
        work = self.state.get('currentWork', {})
        steps = work.get('nextSteps', [])
        
        if steps:
            content = "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
        else:
            content = "No next steps defined"
        
        return ReportSection(title="Next Steps", content=content)
    
    # ==========================================================================
    # OUTPUT FORMATTERS
    # ==========================================================================
    
    def _output_markdown(self, report: Report) -> Path:
        """Output report as Markdown."""
        lines = [
            f"# {report.title}",
            f"*Generated: {report.generated}*",
            ""
        ]
        
        for section in report.sections:
            lines.extend([
                f"## {section.title}",
                section.content,
                ""
            ])
        
        lines.append("---")
        lines.append(f"*Report Type: {report.report_type}*")
        
        filename = f"REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        filepath = self.OUTPUT_DIR / filename
        filepath.write_text("\n".join(lines), encoding='utf-8')
        
        return filepath
    
    def _output_json(self, report: Report) -> Path:
        """Output report as JSON."""
        data = {
            'title': report.title,
            'type': report.report_type,
            'generated': report.generated,
            'sections': [
                {
                    'title': s.title,
                    'content': s.content,
                    'data': s.data
                }
                for s in report.sections
            ]
        }
        
        filename = f"REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = self.OUTPUT_DIR / filename
        save_json(data, filepath)
        
        return filepath
    
    def _output_html(self, report: Report) -> Path:
        """Output report as HTML."""
        sections_html = ""
        for section in report.sections:
            content_html = section.content.replace('\n', '<br>')
            sections_html += f"<h2>{section.title}</h2><div>{content_html}</div>"
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{report.title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #333; }}
        h2 {{ color: #666; border-bottom: 1px solid #ddd; }}
        pre {{ background: #f5f5f5; padding: 10px; }}
    </style>
</head>
<body>
    <h1>{report.title}</h1>
    <p><em>Generated: {report.generated}</em></p>
    {sections_html}
</body>
</html>"""
        
        filename = f"REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = self.OUTPUT_DIR / filename
        filepath.write_text(html, encoding='utf-8')
        
        return filepath
    
    def _progress_bar(self, percentage: float, width: int = 30) -> str:
        """Generate text progress bar."""
        filled = int(width * percentage / 100)
        empty = width - filled
        return f"`[{'█' * filled}{'░' * empty}]` {percentage:.1f}%"


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for report generator."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Report Generator')
    parser.add_argument('--type', type=str, default='full',
                       choices=['executive', 'technical', 'materials', 'full'])
    parser.add_argument('--format', type=str, default='markdown',
                       choices=['markdown', 'json', 'html'])
    
    args = parser.parse_args()
    
    generator = ReportGenerator()
    filepath = generator.generate(args.type, args.format)
    
    print(f"Report generated: {filepath}")


if __name__ == "__main__":
    main()
