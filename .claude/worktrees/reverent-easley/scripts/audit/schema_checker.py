# PRISM Automation Toolkit - Schema Checker
# Version: 1.0.0
# Created: 2026-01-23
#
# Validates database schemas against expected structures.
# Part of Toolkit 3: Database Audit

import sys
import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import save_json, timestamp


# =============================================================================
# EXPECTED SCHEMAS
# =============================================================================

# Material database expected schema (127 parameters)
MATERIAL_SCHEMA = {
    'required': [
        'id', 'name', 'category', 'subcategory', 'standard',
        'density', 'hardness_brinell', 'tensile_strength', 'yield_strength',
        'elastic_modulus', 'thermal_conductivity', 'specific_heat', 'melting_point',
        'kc1_1', 'mc', 'taylor_n', 'taylor_C', 'machinability_rating'
    ],
    'optional': [
        'elongation', 'poisson_ratio', 'shear_modulus', 'thermal_expansion',
        'electrical_conductivity', 'magnetic_permeability',
        'carbon', 'chromium', 'nickel', 'molybdenum', 'vanadium',
        'johnson_cook_A', 'johnson_cook_B', 'johnson_cook_C', 'johnson_cook_n', 'johnson_cook_m',
        'chip_type', 'built_up_edge_tendency', 'work_hardening_rate',
        'friction_coefficient', 'adhesion_tendency',
        'residual_stress_tendency', 'white_layer_tendency',
        'base_speed_sfm', 'feed_factor', 'coolant_recommendation'
    ],
    'types': {
        'id': str, 'name': str, 'category': str, 'subcategory': str,
        'density': (int, float), 'hardness_brinell': (int, float),
        'tensile_strength': (int, float), 'yield_strength': (int, float),
        'kc1_1': (int, float), 'mc': (int, float),
        'taylor_n': (int, float), 'taylor_C': (int, float),
        'machinability_rating': (int, float)
    }
}

# Machine database expected schema
MACHINE_SCHEMA = {
    'required': [
        'id', 'manufacturer', 'model', 'machine_type',
        'x_travel', 'y_travel', 'z_travel',
        'spindle_power', 'max_rpm', 'controller'
    ],
    'optional': [
        'a_axis', 'b_axis', 'c_axis', 'pallet_changer',
        'tool_capacity', 'atc_type', 'rapid_x', 'rapid_y', 'rapid_z',
        'spindle_taper', 'coolant_options', 'accuracy_positioning'
    ],
    'types': {
        'id': str, 'manufacturer': str, 'model': str,
        'x_travel': (int, float), 'y_travel': (int, float), 'z_travel': (int, float),
        'spindle_power': (int, float), 'max_rpm': (int, float)
    }
}

# Tool database expected schema
TOOL_SCHEMA = {
    'required': [
        'id', 'tool_type', 'diameter', 'material', 'coating'
    ],
    'optional': [
        'flute_count', 'flute_length', 'overall_length', 'shank_diameter',
        'helix_angle', 'rake_angle', 'corner_radius', 'grade',
        'max_depth_of_cut', 'recommended_sfm', 'recommended_fpt'
    ],
    'types': {
        'id': str, 'tool_type': str, 'diameter': (int, float),
        'material': str, 'coating': str
    }
}

# Database category to schema mapping
DATABASE_SCHEMAS = {
    'materials': MATERIAL_SCHEMA,
    'machines': MACHINE_SCHEMA,
    'tools': TOOL_SCHEMA,
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class FieldError:
    """Error for a specific field."""
    field_name: str
    error_type: str  # missing_required, wrong_type, invalid_value
    expected: str
    found: str
    

@dataclass 
class RecordValidation:
    """Validation result for a single record."""
    record_id: str
    is_valid: bool
    missing_required: List[str] = field(default_factory=list)
    type_errors: List[FieldError] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class SchemaReport:
    """Complete schema validation report."""
    timestamp: str = field(default_factory=timestamp)
    database_name: str = ""
    database_category: str = ""
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    common_missing_fields: Dict[str, int] = field(default_factory=dict)
    common_type_errors: Dict[str, int] = field(default_factory=dict)
    record_validations: List[RecordValidation] = field(default_factory=list)


# =============================================================================
# SCHEMA CHECKER CLASS
# =============================================================================

class SchemaChecker:
    """Validates database schemas against expected structures."""
    
    def __init__(self):
        self.logger = setup_logger('schema_checker')
    
    def validate_database(self, data: Dict, category: str) -> SchemaReport:
        """
        Validate database against expected schema.
        
        Args:
            data: Database content (dict with records)
            category: Database category (materials, machines, tools)
            
        Returns:
            SchemaReport with validation results
        """
        report = SchemaReport(database_category=category)
        
        schema = DATABASE_SCHEMAS.get(category)
        if not schema:
            self.logger.warning(f"No schema defined for category: {category}")
            return report
        
        # Find records in data
        records = self._extract_records(data)
        report.total_records = len(records)
        
        missing_counts: Dict[str, int] = {}
        type_error_counts: Dict[str, int] = {}
        
        for record_id, record in records.items():
            validation = self._validate_record(record_id, record, schema)
            report.record_validations.append(validation)
            
            if validation.is_valid:
                report.valid_records += 1
            else:
                report.invalid_records += 1
            
            # Track common issues
            for field_name in validation.missing_required:
                missing_counts[field_name] = missing_counts.get(field_name, 0) + 1
            for error in validation.type_errors:
                type_error_counts[error.field_name] = type_error_counts.get(error.field_name, 0) + 1
        
        report.common_missing_fields = dict(sorted(missing_counts.items(), key=lambda x: -x[1]))
        report.common_type_errors = dict(sorted(type_error_counts.items(), key=lambda x: -x[1]))
        
        return report
    
    def _extract_records(self, data: Dict) -> Dict[str, Dict]:
        """Extract records from database structure."""
        # Handle nested format: { metadata: {...}, materials: { 'ID': {...} } }
        if 'materials' in data and isinstance(data['materials'], dict):
            return data['materials']
        if 'machines' in data and isinstance(data['machines'], dict):
            return data['machines']
        if 'tools' in data and isinstance(data['tools'], dict):
            return data['tools']
        
        # Handle flat format: { 'ID': {...}, 'ID2': {...} }
        records = {}
        for key, value in data.items():
            if isinstance(value, dict) and 'id' in value:
                records[key] = value
        
        return records
    
    def _validate_record(self, record_id: str, record: Dict, schema: Dict) -> RecordValidation:
        """Validate a single record against schema."""
        validation = RecordValidation(record_id=record_id, is_valid=True)
        
        # Check required fields
        for field_name in schema.get('required', []):
            if field_name not in record or record[field_name] is None:
                validation.missing_required.append(field_name)
                validation.is_valid = False
        
        # Check types
        type_rules = schema.get('types', {})
        for field_name, expected_type in type_rules.items():
            if field_name in record and record[field_name] is not None:
                value = record[field_name]
                if not isinstance(value, expected_type):
                    validation.type_errors.append(FieldError(
                        field_name=field_name,
                        error_type='wrong_type',
                        expected=str(expected_type),
                        found=str(type(value).__name__)
                    ))
                    validation.is_valid = False
        
        # Check for empty strings that should have values
        for field_name in schema.get('required', []):
            if field_name in record and record[field_name] == '':
                validation.warnings.append(f"Empty string for required field: {field_name}")
        
        return validation
    
    def validate_file(self, filepath: Path, category: str = None) -> SchemaReport:
        """
        Validate a database file.
        
        Args:
            filepath: Path to JSON/JS database file
            category: Category (auto-detected if None)
            
        Returns:
            SchemaReport
        """
        # Auto-detect category from filename
        if category is None:
            filename = filepath.stem.lower()
            if 'material' in filename:
                category = 'materials'
            elif 'machine' in filename:
                category = 'machines'
            elif 'tool' in filename:
                category = 'tools'
            else:
                category = 'unknown'
        
        # Load file
        try:
            content = filepath.read_text(encoding='utf-8', errors='ignore')
            
            # Handle JSON
            if filepath.suffix == '.json':
                data = json.loads(content)
            # Handle JS
            else:
                data = self._parse_js_object(content)
            
            report = self.validate_database(data, category)
            report.database_name = filepath.stem
            return report
            
        except Exception as e:
            self.logger.error(f"Error validating {filepath}: {e}")
            report = SchemaReport(database_name=filepath.stem, database_category=category)
            return report
    
    def _parse_js_object(self, content: str) -> Dict:
        """Parse JavaScript object from file content."""
        # Find object assignment
        match = re.search(r'(?:const|let|var|window\.)\s*\w+\s*=\s*(\{)', content)
        if not match:
            return {}
        
        start = match.start(1)
        depth = 0
        end = start
        
        for i, char in enumerate(content[start:], start):
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        
        obj_str = content[start:end]
        
        # Convert JS to JSON-like
        obj_str = re.sub(r'(\w+):', r'"\1":', obj_str)
        obj_str = re.sub(r"'([^']*)'", r'"\1"', obj_str)
        obj_str = re.sub(r',\s*}', '}', obj_str)
        obj_str = re.sub(r',\s*]', ']', obj_str)
        
        try:
            return json.loads(obj_str)
        except:
            return {}
    
    def generate_report(self, report: SchemaReport) -> str:
        """Generate text report."""
        lines = ["=" * 70, "PRISM SCHEMA VALIDATION REPORT", "=" * 70]
        lines.append(f"Database: {report.database_name}")
        lines.append(f"Category: {report.database_category}")
        lines.append(f"Generated: {report.timestamp}\n")
        
        # Summary
        lines.append(f"Total Records:   {report.total_records}")
        lines.append(f"Valid Records:   {report.valid_records} ✓")
        lines.append(f"Invalid Records: {report.invalid_records} ✗")
        
        if report.total_records > 0:
            validity = (report.valid_records / report.total_records) * 100
            lines.append(f"Validity Rate:   {validity:.1f}%")
        
        # Common missing fields
        if report.common_missing_fields:
            lines.append("\n⚠ COMMONLY MISSING FIELDS:")
            for field, count in list(report.common_missing_fields.items())[:10]:
                lines.append(f"  - {field}: missing in {count} records")
        
        # Common type errors
        if report.common_type_errors:
            lines.append("\n⚠ COMMON TYPE ERRORS:")
            for field, count in list(report.common_type_errors.items())[:10]:
                lines.append(f"  - {field}: type error in {count} records")
        
        return "\n".join(lines)
    
    def save_report(self, report: SchemaReport, output_path: Path):
        """Save report as JSON."""
        data = {
            'timestamp': report.timestamp,
            'database_name': report.database_name,
            'database_category': report.database_category,
            'summary': {
                'total_records': report.total_records,
                'valid_records': report.valid_records,
                'invalid_records': report.invalid_records
            },
            'common_missing_fields': report.common_missing_fields,
            'common_type_errors': report.common_type_errors
        }
        save_json(data, output_path)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for schema checker."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Schema Checker')
    parser.add_argument('file', help='Database file to validate')
    parser.add_argument('--category', choices=['materials', 'machines', 'tools'])
    parser.add_argument('--json', type=str, help='Save JSON report')
    
    args = parser.parse_args()
    
    checker = SchemaChecker()
    report = checker.validate_file(Path(args.file), args.category)
    
    print(checker.generate_report(report))
    
    if args.json:
        checker.save_report(report, Path(args.json))
        print(f"\nJSON saved to: {args.json}")


if __name__ == "__main__":
    main()
