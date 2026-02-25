# PRISM Automation Toolkit - Batch Material Validator
# Version: 1.0.0
# Created: 2026-01-23
#
# Validates multiple materials from files or directories.
# Supports:
# - JSON material files
# - JavaScript material files (.js)
# - Directories with multiple files
# - Generates comprehensive reports

import sys
import json
import re
import os
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS, MATERIAL_CONSTANTS
from core.logger import setup_logger, ProgressLogger, ValidationLogger
from core.utils import find_files, timestamp, timestamp_filename, file_size_str
from validation.material_validator import MaterialValidator, MaterialValidationResult


# =============================================================================
# BATCH RESULT CLASSES
# =============================================================================

@dataclass
class FileValidationResult:
    """Result of validating all materials in a single file."""
    filepath: str
    filename: str
    materials_found: int = 0
    materials_passed: int = 0
    materials_failed: int = 0
    materials_warned: int = 0
    material_results: List[MaterialValidationResult] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    parse_error: bool = False
    
    @property
    def pass_rate(self) -> float:
        if self.materials_found == 0:
            return 0
        return (self.materials_passed / self.materials_found) * 100


@dataclass 
class BatchValidationResult:
    """Result of validating an entire batch (directory)."""
    source_path: str
    timestamp: str
    files_processed: int = 0
    files_with_errors: int = 0
    total_materials: int = 0
    materials_passed: int = 0
    materials_failed: int = 0
    materials_warned: int = 0
    file_results: List[FileValidationResult] = field(default_factory=list)
    duplicate_ids: List[str] = field(default_factory=list)
    all_material_ids: List[str] = field(default_factory=list)
    
    @property
    def overall_pass_rate(self) -> float:
        if self.total_materials == 0:
            return 0
        return (self.materials_passed / self.total_materials) * 100
    
    @property
    def overall_status(self) -> str:
        if self.materials_failed > 0:
            return 'FAIL'
        elif self.materials_warned > 0:
            return 'WARN'
        return 'PASS'


# =============================================================================
# JS FILE PARSER
# =============================================================================

class JSMaterialParser:
    """
    Parse materials from PRISM JavaScript files.
    Handles various formats found in the codebase.
    """
    
    def __init__(self):
        self.logger = setup_logger('JSParser')
    
    def parse_file(self, filepath: Path) -> Tuple[List[Dict], List[str]]:
        """
        Parse a JS file and extract material objects.
        
        Returns:
            Tuple of (materials_list, errors_list)
        """
        materials = []
        errors = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return [], [f"Failed to read file: {e}"]
        
        # Strategy 1: Look for individual material objects with 'id' field
        # Pattern: { id: 'P-CS-001', ... }
        material_pattern = r'\{\s*["\']?id["\']?\s*:\s*["\']([A-Z]-[A-Z]{2}-\d{3})["\']'
        
        # Find all potential material starts
        matches = list(re.finditer(material_pattern, content))
        
        for match in matches:
            material_id = match.group(1)
            start_pos = match.start()
            
            # Extract the full object by counting braces
            try:
                obj_str = self._extract_object(content, start_pos)
                if obj_str:
                    material = self._parse_js_object(obj_str)
                    if material and 'id' in material:
                        materials.append(material)
            except Exception as e:
                errors.append(f"Failed to parse material {material_id}: {e}")
        
        # Strategy 2: Look for array of materials
        if not materials:
            array_pattern = r'(?:materials|MATERIALS|data)\s*[=:]\s*\['
            array_match = re.search(array_pattern, content)
            if array_match:
                try:
                    array_str = self._extract_array(content, array_match.end() - 1)
                    if array_str:
                        parsed = self._parse_js_array(array_str)
                        materials.extend(parsed)
                except Exception as e:
                    errors.append(f"Failed to parse materials array: {e}")
        
        return materials, errors
    
    def _extract_object(self, content: str, start_pos: int) -> Optional[str]:
        """Extract a complete JS object starting at position."""
        # Find the opening brace
        brace_pos = content.find('{', start_pos)
        if brace_pos == -1:
            return None
        
        depth = 0
        in_string = False
        string_char = None
        escape_next = False
        
        for i, char in enumerate(content[brace_pos:], brace_pos):
            if escape_next:
                escape_next = False
                continue
            
            if char == '\\':
                escape_next = True
                continue
            
            if char in '"\'':
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                continue
            
            if in_string:
                continue
            
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    return content[brace_pos:i+1]
        
        return None
    
    def _extract_array(self, content: str, start_pos: int) -> Optional[str]:
        """Extract a complete JS array starting at position."""
        depth = 0
        in_string = False
        string_char = None
        escape_next = False
        
        for i, char in enumerate(content[start_pos:], start_pos):
            if escape_next:
                escape_next = False
                continue
            
            if char == '\\':
                escape_next = True
                continue
            
            if char in '"\'':
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                continue
            
            if in_string:
                continue
            
            if char == '[':
                depth += 1
            elif char == ']':
                depth -= 1
                if depth == 0:
                    return content[start_pos:i+1]
        
        return None
    
    def _parse_js_object(self, obj_str: str) -> Optional[Dict]:
        """Convert JS object string to Python dict."""
        try:
            # Clean up JS syntax to make it JSON-compatible
            cleaned = obj_str
            
            # Remove comments
            cleaned = re.sub(r'//.*?$', '', cleaned, flags=re.MULTILINE)
            cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
            
            # Quote unquoted keys
            cleaned = re.sub(r'(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', cleaned)
            
            # Replace single quotes with double quotes (careful with apostrophes)
            # This is simplified - may not handle all edge cases
            cleaned = re.sub(r"'([^']*)'", r'"\1"', cleaned)
            
            # Remove trailing commas
            cleaned = re.sub(r',\s*}', '}', cleaned)
            cleaned = re.sub(r',\s*]', ']', cleaned)
            
            # Handle undefined/null
            cleaned = re.sub(r'\bundefined\b', 'null', cleaned)
            
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try a more aggressive approach
            try:
                # Use ast.literal_eval doesn't work for JS, try exec approach
                # This is risky but we're only doing it on our own files
                return None
            except:
                return None
    
    def _parse_js_array(self, array_str: str) -> List[Dict]:
        """Parse a JS array of objects."""
        materials = []
        
        # Find all objects in the array
        depth = 0
        current_start = None
        in_string = False
        string_char = None
        
        for i, char in enumerate(array_str):
            if char in '"\'':
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                continue
            
            if in_string:
                continue
            
            if char == '{':
                if depth == 0:
                    current_start = i
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0 and current_start is not None:
                    obj_str = array_str[current_start:i+1]
                    parsed = self._parse_js_object(obj_str)
                    if parsed and 'id' in parsed:
                        materials.append(parsed)
                    current_start = None
        
        return materials


# =============================================================================
# BATCH VALIDATOR
# =============================================================================

class BatchValidator:
    """
    Validate multiple material files or directories.
    Generates comprehensive reports.
    """
    
    def __init__(self, strict: bool = True, verbose: bool = False):
        self.strict = strict
        self.verbose = verbose
        self.validator = MaterialValidator(strict=strict)
        self.js_parser = JSMaterialParser()
        self.logger = setup_logger('BatchValidator')
    
    def validate_file(self, filepath: Path) -> FileValidationResult:
        """Validate all materials in a single file."""
        result = FileValidationResult(
            filepath=str(filepath),
            filename=filepath.name
        )
        
        # Parse materials from file
        if filepath.suffix == '.json':
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Handle single material or array
                if isinstance(data, list):
                    materials = data
                elif isinstance(data, dict):
                    if 'materials' in data:
                        materials = data['materials']
                    elif 'id' in data:
                        materials = [data]
                    else:
                        materials = []
                else:
                    materials = []
            except Exception as e:
                result.parse_error = True
                result.errors.append(f"JSON parse error: {e}")
                return result
        
        elif filepath.suffix == '.js':
            materials, errors = self.js_parser.parse_file(filepath)
            result.errors.extend(errors)
            if not materials and errors:
                result.parse_error = True
        else:
            result.errors.append(f"Unsupported file type: {filepath.suffix}")
            return result
        
        result.materials_found = len(materials)
        
        # Validate each material
        for material in materials:
            mat_result = self.validator.validate_material(material)
            result.material_results.append(mat_result)
            
            if mat_result.overall_status == 'PASS':
                result.materials_passed += 1
            elif mat_result.overall_status == 'FAIL':
                result.materials_failed += 1
            else:
                result.materials_warned += 1
        
        return result
    
    def validate_directory(self, directory: Path, recursive: bool = True) -> BatchValidationResult:
        """Validate all material files in a directory."""
        result = BatchValidationResult(
            source_path=str(directory),
            timestamp=timestamp()
        )
        
        # Find all JS and JSON files
        if recursive:
            js_files = list(directory.rglob('*.js'))
            json_files = list(directory.rglob('*.json'))
        else:
            js_files = list(directory.glob('*.js'))
            json_files = list(directory.glob('*.json'))
        
        all_files = js_files + json_files
        
        # Filter to likely material files
        material_files = [f for f in all_files if self._is_likely_material_file(f)]
        
        self.logger.info(f"Found {len(material_files)} potential material files")
        
        # Progress tracking
        progress = ProgressLogger('Validation', len(material_files))
        
        # Validate each file
        for filepath in material_files:
            file_result = self.validate_file(filepath)
            result.file_results.append(file_result)
            
            result.files_processed += 1
            if file_result.parse_error or file_result.materials_failed > 0:
                result.files_with_errors += 1
            
            result.total_materials += file_result.materials_found
            result.materials_passed += file_result.materials_passed
            result.materials_failed += file_result.materials_failed
            result.materials_warned += file_result.materials_warned
            
            # Collect material IDs
            for mat_result in file_result.material_results:
                if mat_result.material_id in result.all_material_ids:
                    result.duplicate_ids.append(mat_result.material_id)
                result.all_material_ids.append(mat_result.material_id)
            
            progress.update(filepath.name)
        
        progress.complete()
        
        return result
    
    def _is_likely_material_file(self, filepath: Path) -> bool:
        """Check if a file is likely to contain material data."""
        name = filepath.name.lower()
        
        # Include patterns
        include_patterns = [
            'material', 'steel', 'aluminum', 'titanium', 
            'alloy', 'metal', 'carbon', 'stainless'
        ]
        
        # Exclude patterns
        exclude_patterns = [
            'test', 'backup', 'old', 'temp', 'index',
            'config', 'package', 'node_modules'
        ]
        
        # Check excludes first
        for pattern in exclude_patterns:
            if pattern in name or pattern in str(filepath.parent).lower():
                return False
        
        # Check includes
        for pattern in include_patterns:
            if pattern in name:
                return True
        
        return False
    
    def generate_report(self, result: BatchValidationResult) -> str:
        """Generate a detailed text report."""
        lines = []
        lines.append("=" * 80)
        lines.append("PRISM MATERIAL BATCH VALIDATION REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated: {result.timestamp}")
        lines.append(f"Source: {result.source_path}")
        lines.append("")
        
        # Summary
        lines.append("-" * 40)
        lines.append("SUMMARY")
        lines.append("-" * 40)
        lines.append(f"Files Processed:    {result.files_processed}")
        lines.append(f"Files with Errors:  {result.files_with_errors}")
        lines.append(f"Total Materials:    {result.total_materials}")
        lines.append(f"  Passed:           {result.materials_passed} ✓")
        lines.append(f"  Failed:           {result.materials_failed} ✗")
        lines.append(f"  Warnings:         {result.materials_warned} ⚠")
        lines.append(f"Pass Rate:          {result.overall_pass_rate:.1f}%")
        lines.append(f"Overall Status:     {result.overall_status}")
        lines.append("")
        
        # Duplicates
        if result.duplicate_ids:
            lines.append("-" * 40)
            lines.append(f"DUPLICATE IDs FOUND: {len(result.duplicate_ids)}")
            lines.append("-" * 40)
            for dup_id in result.duplicate_ids:
                lines.append(f"  ⚠ {dup_id}")
            lines.append("")
        
        # Per-file details
        lines.append("-" * 40)
        lines.append("FILE DETAILS")
        lines.append("-" * 40)
        
        for file_result in result.file_results:
            status = "✓" if file_result.materials_failed == 0 else "✗"
            lines.append(f"\n{status} {file_result.filename}")
            lines.append(f"   Materials: {file_result.materials_found} (Pass: {file_result.materials_passed}, Fail: {file_result.materials_failed})")
            
            if file_result.errors:
                for err in file_result.errors:
                    lines.append(f"   ✗ {err}")
            
            # Show failed materials
            for mat_result in file_result.material_results:
                if mat_result.overall_status == 'FAIL':
                    lines.append(f"   ✗ {mat_result.material_id}: {', '.join(mat_result.errors)}")
        
        lines.append("")
        lines.append("=" * 80)
        lines.append("END OF REPORT")
        lines.append("=" * 80)
        
        return "\n".join(lines)
    
    def generate_json_report(self, result: BatchValidationResult) -> Dict:
        """Generate a JSON report for programmatic use."""
        return {
            'timestamp': result.timestamp,
            'source': result.source_path,
            'summary': {
                'files_processed': result.files_processed,
                'files_with_errors': result.files_with_errors,
                'total_materials': result.total_materials,
                'passed': result.materials_passed,
                'failed': result.materials_failed,
                'warned': result.materials_warned,
                'pass_rate': result.overall_pass_rate,
                'status': result.overall_status
            },
            'duplicate_ids': result.duplicate_ids,
            'files': [
                {
                    'filename': fr.filename,
                    'materials_found': fr.materials_found,
                    'passed': fr.materials_passed,
                    'failed': fr.materials_failed,
                    'errors': fr.errors,
                    'failed_materials': [
                        {'id': mr.material_id, 'errors': mr.errors}
                        for mr in fr.material_results if mr.overall_status == 'FAIL'
                    ]
                }
                for fr in result.file_results
            ]
        }


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Command-line interface for batch validation."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='PRISM Batch Material Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python batch_validator.py ./materials/
  python batch_validator.py ./materials/ --report validation_report.txt
  python batch_validator.py ./materials/ --json report.json
  python batch_validator.py ./materials/carbon_steels_001_010.js
        """
    )
    parser.add_argument('input', help='File or directory to validate')
    parser.add_argument('-r', '--recursive', action='store_true', default=True,
                        help='Recursively search directories (default: True)')
    parser.add_argument('--strict', action='store_true', 
                        help='Warn on missing recommended parameters')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Show detailed output')
    parser.add_argument('--report', type=str, metavar='FILE',
                        help='Save text report to file')
    parser.add_argument('--json', type=str, metavar='FILE',
                        help='Save JSON report to file')
    
    args = parser.parse_args()
    
    validator = BatchValidator(strict=args.strict, verbose=args.verbose)
    input_path = Path(args.input)
    
    if not input_path.exists():
        print(f"Error: {input_path} not found")
        sys.exit(1)
    
    # Validate
    if input_path.is_file():
        print(f"Validating file: {input_path}")
        file_result = validator.validate_file(input_path)
        
        # Create a batch result for consistent reporting
        result = BatchValidationResult(
            source_path=str(input_path),
            timestamp=timestamp(),
            files_processed=1,
            files_with_errors=1 if file_result.materials_failed > 0 else 0,
            total_materials=file_result.materials_found,
            materials_passed=file_result.materials_passed,
            materials_failed=file_result.materials_failed,
            materials_warned=file_result.materials_warned,
            file_results=[file_result]
        )
    else:
        print(f"Validating directory: {input_path}")
        result = validator.validate_directory(input_path, recursive=args.recursive)
    
    # Generate and display report
    report = validator.generate_report(result)
    print(report)
    
    # Save reports if requested
    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"\nText report saved to: {args.report}")
    
    if args.json:
        json_report = validator.generate_json_report(result)
        with open(args.json, 'w', encoding='utf-8') as f:
            json.dump(json_report, f, indent=2)
        print(f"JSON report saved to: {args.json}")
    
    # Exit with appropriate code
    sys.exit(0 if result.overall_status == 'PASS' else 1)


if __name__ == "__main__":
    main()
