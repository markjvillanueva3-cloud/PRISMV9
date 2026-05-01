#!/usr/bin/env python3
"""
PRISM Extraction Auditor (T.2.4)
Verifies extraction completeness - ensures nothing was truncated or lost.

Features:
- Compares extracted modules to monolith source
- Verifies all functions present
- Checks for truncation
- Validates structure completeness
"""

import sys
import re
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime
import logging
import hashlib

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import PATHS
from core.logger import setup_logger
from core.utils import load_json, save_json

logger = setup_logger(__name__)


@dataclass
class FunctionSignature:
    """Represents a function or method."""
    name: str
    params: str
    line_number: int
    is_async: bool = False
    is_arrow: bool = False


@dataclass
class ModuleAudit:
    """Audit result for a single module."""
    module_name: str
    source_file: str
    
    # Line counts
    source_lines: int = 0
    extracted_lines: int = 0
    
    # Function analysis
    source_functions: List[FunctionSignature] = field(default_factory=list)
    extracted_functions: List[FunctionSignature] = field(default_factory=list)
    missing_functions: List[str] = field(default_factory=list)
    extra_functions: List[str] = field(default_factory=list)
    
    # Structure checks
    has_opening_brace: bool = True
    has_closing_brace: bool = True
    brace_balance: int = 0  # Should be 0
    
    # Content hash
    source_hash: str = ""
    extracted_hash: str = ""
    
    # Issues
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    @property
    def is_complete(self) -> bool:
        return (
            len(self.missing_functions) == 0 and
            self.has_opening_brace and
            self.has_closing_brace and
            self.brace_balance == 0 and
            len(self.issues) == 0
        )
    
    @property
    def function_coverage(self) -> float:
        if not self.source_functions:
            return 100.0
        found = len(self.source_functions) - len(self.missing_functions)
        return (found / len(self.source_functions)) * 100


@dataclass
class ExtractionReport:
    """Complete extraction audit report."""
    timestamp: str = ""
    source_path: str = ""
    extracted_path: str = ""
    
    modules_audited: int = 0
    modules_complete: int = 0
    modules_incomplete: int = 0
    
    total_functions_expected: int = 0
    total_functions_found: int = 0
    
    audits: Dict[str, ModuleAudit] = field(default_factory=dict)


class ExtractionAuditor:
    """
    Audits extracted modules for completeness.
    
    Checks:
    1. All functions present
    2. No truncation (brace balance)
    3. Expected line count
    4. Structure integrity
    """
    
    # Patterns for detecting functions
    FUNCTION_PATTERNS = {
        'standard': re.compile(r'^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)'),
        'method': re.compile(r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{'),
        'arrow': re.compile(r'^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>'),
        'arrow_method': re.compile(r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s*)?\(([^)]*)\)\s*=>'),
    }
    
    # Patterns for module boundaries
    MODULE_START = re.compile(r'(?:window\.|const\s+)(PRISM_[A-Z0-9_]+)\s*=')
    
    def __init__(self):
        self.logger = setup_logger(self.__class__.__name__)
    
    def extract_functions(self, content: str) -> List[FunctionSignature]:
        """Extract all function signatures from content."""
        functions = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Skip comments
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
            
            for pattern_name, pattern in self.FUNCTION_PATTERNS.items():
                match = pattern.search(line)
                if match:
                    func = FunctionSignature(
                        name=match.group(1),
                        params=match.group(2) if len(match.groups()) > 1 else '',
                        line_number=line_num,
                        is_async='async' in line[:match.start()],
                        is_arrow='arrow' in pattern_name
                    )
                    # Avoid duplicates
                    if not any(f.name == func.name for f in functions):
                        functions.append(func)
                    break
        
        return functions
    
    def check_brace_balance(self, content: str) -> Tuple[bool, bool, int]:
        """
        Check if braces are balanced.
        Returns: (has_opening, has_closing, balance)
        """
        # Remove strings and comments to avoid false positives
        # Simple approach: just count raw braces
        open_count = content.count('{')
        close_count = content.count('}')
        
        has_opening = open_count > 0
        has_closing = close_count > 0
        balance = open_count - close_count
        
        return has_opening, has_closing, balance
    
    def compute_hash(self, content: str) -> str:
        """Compute content hash (ignoring whitespace variations)."""
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', content).strip()
        return hashlib.md5(normalized.encode()).hexdigest()[:12]
    
    def audit_module(self, source_content: str, extracted_content: str, 
                     module_name: str, source_file: str = "") -> ModuleAudit:
        """Audit a single extracted module against its source."""
        audit = ModuleAudit(
            module_name=module_name,
            source_file=source_file
        )
        
        # Line counts
        audit.source_lines = len(source_content.split('\n'))
        audit.extracted_lines = len(extracted_content.split('\n'))
        
        # Function extraction
        audit.source_functions = self.extract_functions(source_content)
        audit.extracted_functions = self.extract_functions(extracted_content)
        
        # Compare functions
        source_func_names = {f.name for f in audit.source_functions}
        extracted_func_names = {f.name for f in audit.extracted_functions}
        
        audit.missing_functions = list(source_func_names - extracted_func_names)
        audit.extra_functions = list(extracted_func_names - source_func_names)
        
        # Brace balance (check extracted)
        audit.has_opening_brace, audit.has_closing_brace, audit.brace_balance = \
            self.check_brace_balance(extracted_content)
        
        # Hashes
        audit.source_hash = self.compute_hash(source_content)
        audit.extracted_hash = self.compute_hash(extracted_content)
        
        # Generate issues
        if audit.missing_functions:
            audit.issues.append(
                f"Missing {len(audit.missing_functions)} functions: {', '.join(audit.missing_functions[:5])}"
                + (f" and {len(audit.missing_functions) - 5} more" if len(audit.missing_functions) > 5 else "")
            )
        
        if audit.brace_balance != 0:
            audit.issues.append(
                f"Brace imbalance: {audit.brace_balance:+d} (likely truncation)"
            )
        
        if not audit.has_closing_brace:
            audit.issues.append("No closing brace found - likely truncated")
        
        # Warnings
        if audit.extra_functions:
            audit.warnings.append(
                f"Extra functions in extracted: {', '.join(audit.extra_functions[:3])}"
            )
        
        line_diff = abs(audit.source_lines - audit.extracted_lines)
        if line_diff > 50:
            pct = (line_diff / audit.source_lines) * 100 if audit.source_lines > 0 else 0
            audit.warnings.append(
                f"Line count difference: {line_diff} lines ({pct:.1f}%)"
            )
        
        return audit
    
    def audit_directory(self, extracted_dir: Path, source_file: Optional[Path] = None,
                        index_file: Optional[Path] = None) -> ExtractionReport:
        """
        Audit all extracted modules in a directory.
        
        Args:
            extracted_dir: Directory containing extracted .js files
            source_file: Original monolith file (for comparison)
            index_file: JSON index mapping module names to line ranges
        """
        report = ExtractionReport(
            timestamp=datetime.now().isoformat(),
            extracted_path=str(extracted_dir)
        )
        
        # Load source if provided
        source_content = ""
        source_modules = {}
        
        if source_file and source_file.exists():
            report.source_path = str(source_file)
            source_content = source_file.read_text(encoding='utf-8', errors='replace')
            
            # Try to segment source by module
            if index_file and index_file.exists():
                index = load_json(index_file)
                source_lines = source_content.split('\n')
                for mod_name, info in index.get('modules', {}).items():
                    start = info.get('line_start', 1) - 1
                    end = info.get('line_end', len(source_lines))
                    source_modules[mod_name] = '\n'.join(source_lines[start:end])
        
        # Scan extracted files
        js_files = list(extracted_dir.glob('**/*.js'))
        self.logger.info(f"Auditing {len(js_files)} extracted files")
        
        for filepath in js_files:
            try:
                extracted_content = filepath.read_text(encoding='utf-8', errors='replace')
                
                # Detect module name
                match = self.MODULE_START.search(extracted_content)
                if match:
                    module_name = match.group(1)
                else:
                    module_name = filepath.stem.upper()
                
                # Get source for comparison
                source_for_module = source_modules.get(module_name, "")
                
                # If no source index, try to find in monolith
                if not source_for_module and source_content:
                    # Search for module in source
                    pattern = re.compile(
                        rf'((?:window\.|const\s+){re.escape(module_name)}\s*=.*?)(?=(?:window\.|const\s+)PRISM_[A-Z]|$)',
                        re.DOTALL
                    )
                    match = pattern.search(source_content)
                    if match:
                        source_for_module = match.group(1)
                
                # Audit
                if source_for_module:
                    audit = self.audit_module(
                        source_for_module, extracted_content,
                        module_name, str(filepath)
                    )
                else:
                    # No source comparison - just structural audit
                    audit = ModuleAudit(
                        module_name=module_name,
                        source_file=str(filepath)
                    )
                    audit.extracted_lines = len(extracted_content.split('\n'))
                    audit.extracted_functions = self.extract_functions(extracted_content)
                    audit.has_opening_brace, audit.has_closing_brace, audit.brace_balance = \
                        self.check_brace_balance(extracted_content)
                    audit.extracted_hash = self.compute_hash(extracted_content)
                    
                    if audit.brace_balance != 0:
                        audit.issues.append(f"Brace imbalance: {audit.brace_balance:+d}")
                    
                    audit.warnings.append("No source comparison available")
                
                report.audits[module_name] = audit
                report.modules_audited += 1
                
                if audit.is_complete:
                    report.modules_complete += 1
                else:
                    report.modules_incomplete += 1
                
                report.total_functions_expected += len(audit.source_functions)
                report.total_functions_found += len(audit.extracted_functions)
                
            except Exception as e:
                self.logger.error(f"Error auditing {filepath}: {e}")
        
        return report
    
    def generate_report(self, report: ExtractionReport) -> str:
        """Generate text audit report."""
        lines = []
        lines.append("=" * 70)
        lines.append("PRISM EXTRACTION AUDIT REPORT")
        lines.append("=" * 70)
        lines.append(f"Generated: {report.timestamp}")
        lines.append(f"Extracted from: {report.extracted_path}")
        if report.source_path:
            lines.append(f"Source file: {report.source_path}")
        lines.append("")
        
        # Summary
        lines.append("-" * 40)
        lines.append("SUMMARY")
        lines.append("-" * 40)
        lines.append(f"Modules Audited:      {report.modules_audited}")
        lines.append(f"Complete:             {report.modules_complete} ✓")
        lines.append(f"Incomplete:           {report.modules_incomplete} ✗")
        
        if report.modules_audited > 0:
            pct = (report.modules_complete / report.modules_audited) * 100
            lines.append(f"Completion Rate:      {pct:.1f}%")
        
        if report.total_functions_expected > 0:
            func_pct = (report.total_functions_found / report.total_functions_expected) * 100
            lines.append(f"Function Coverage:    {func_pct:.1f}%")
        lines.append("")
        
        # Incomplete modules (CRITICAL)
        incomplete = [a for a in report.audits.values() if not a.is_complete]
        if incomplete:
            lines.append("-" * 40)
            lines.append("⛔ INCOMPLETE EXTRACTIONS")
            lines.append("-" * 40)
            for audit in sorted(incomplete, key=lambda x: -len(x.issues)):
                lines.append(f"\n✗ {audit.module_name}")
                lines.append(f"  File: {audit.source_file}")
                lines.append(f"  Lines: {audit.extracted_lines}")
                lines.append(f"  Functions: {len(audit.extracted_functions)}")
                for issue in audit.issues:
                    lines.append(f"  ⚠ {issue}")
            lines.append("")
        
        # Modules with warnings
        with_warnings = [a for a in report.audits.values() 
                        if a.is_complete and a.warnings]
        if with_warnings:
            lines.append("-" * 40)
            lines.append("⚠ MODULES WITH WARNINGS")
            lines.append("-" * 40)
            for audit in with_warnings:
                lines.append(f"\n{audit.module_name}")
                for warning in audit.warnings:
                    lines.append(f"  ⚠ {warning}")
            lines.append("")
        
        # Complete modules
        complete = [a for a in report.audits.values() 
                   if a.is_complete and not a.warnings]
        if complete:
            lines.append("-" * 40)
            lines.append("✓ COMPLETE EXTRACTIONS")
            lines.append("-" * 40)
            for audit in sorted(complete, key=lambda x: x.module_name):
                lines.append(f"✓ {audit.module_name} ({audit.extracted_lines} lines, "
                           f"{len(audit.extracted_functions)} functions)")
        
        lines.append("\n" + "=" * 70)
        lines.append("END OF REPORT")
        lines.append("=" * 70)
        
        return "\n".join(lines)
    
    def save_report(self, report: ExtractionReport, output_path: Path):
        """Save audit report as JSON."""
        data = {
            'timestamp': report.timestamp,
            'source_path': report.source_path,
            'extracted_path': report.extracted_path,
            'summary': {
                'modules_audited': report.modules_audited,
                'modules_complete': report.modules_complete,
                'modules_incomplete': report.modules_incomplete,
                'total_functions_expected': report.total_functions_expected,
                'total_functions_found': report.total_functions_found
            },
            'modules': {
                name: {
                    'source_file': audit.source_file,
                    'is_complete': audit.is_complete,
                    'source_lines': audit.source_lines,
                    'extracted_lines': audit.extracted_lines,
                    'function_count': len(audit.extracted_functions),
                    'function_coverage': audit.function_coverage,
                    'brace_balance': audit.brace_balance,
                    'missing_functions': audit.missing_functions,
                    'issues': audit.issues,
                    'warnings': audit.warnings
                }
                for name, audit in report.audits.items()
            }
        }
        save_json(data, output_path)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for extraction auditor."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Extraction Auditor')
    parser.add_argument('extracted_dir', help='Directory with extracted .js files')
    parser.add_argument('--source', type=str, help='Original monolith file for comparison')
    parser.add_argument('--index', type=str, help='JSON index of module line numbers')
    parser.add_argument('--report', type=str, help='Save text report to file')
    parser.add_argument('--json', type=str, help='Save JSON report to file')
    
    args = parser.parse_args()
    
    auditor = ExtractionAuditor()
    
    extracted_dir = Path(args.extracted_dir)
    if not extracted_dir.exists():
        print(f"Error: Directory not found: {extracted_dir}")
        sys.exit(1)
    
    source_file = Path(args.source) if args.source else None
    index_file = Path(args.index) if args.index else None
    
    report = auditor.audit_directory(extracted_dir, source_file, index_file)
    
    # Print report
    text_report = auditor.generate_report(report)
    print(text_report)
    
    # Save if requested
    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            f.write(text_report)
        print(f"\nText report saved to: {args.report}")
    
    if args.json:
        auditor.save_report(report, Path(args.json))
        print(f"JSON report saved to: {args.json}")
    
    # Exit code based on completeness
    if report.modules_incomplete > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
