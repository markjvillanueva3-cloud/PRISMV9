"""
PRISM DATA VALIDATION FRAMEWORK v1.0
=====================================
CRITICAL: Lives depend on valid data. NO PLACEHOLDERS. NO GARBAGE.

This framework provides:
1. Placeholder detection - Catches TBD, TODO, empty, fake data
2. Schema validation - Ensures proper structure and types
3. Range validation - Values must be physically reasonable
4. Utility validation - Data must work in actual calculations
5. Swarm output validation - All swarm results MUST pass

Author: Claude (PRISM Developer)
Date: 2026-01-28
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    CRITICAL = "CRITICAL"    # Blocks all operations - must fix immediately
    ERROR = "ERROR"          # Must fix before use
    WARNING = "WARNING"      # Should fix, may cause issues
    INFO = "INFO"            # Informational only


class ValidationCategory(Enum):
    """Categories of validation checks"""
    PLACEHOLDER = "PLACEHOLDER"      # Detects placeholder/fake data
    COMPLETENESS = "COMPLETENESS"    # Missing required fields
    TYPE = "TYPE"                    # Wrong data types
    RANGE = "RANGE"                  # Values out of physical range
    FORMAT = "FORMAT"                # Wrong format/structure
    UTILITY = "UTILITY"              # Data not usable in calculations
    CONSISTENCY = "CONSISTENCY"      # Inconsistent with related data
    PHYSICS = "PHYSICS"              # Violates physical laws


@dataclass
class ValidationIssue:
    """A single validation issue"""
    severity: ValidationSeverity
    category: ValidationCategory
    field: str
    message: str
    value: Any = None
    expected: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "severity": self.severity.value,
            "category": self.category.value,
            "field": self.field,
            "message": self.message,
            "value": str(self.value) if self.value is not None else None,
            "expected": self.expected
        }


@dataclass
class ValidationResult:
    """Result of validation"""
    valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    checked_fields: int = 0
    passed_fields: int = 0
    
    @property
    def critical_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == ValidationSeverity.CRITICAL)
    
    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == ValidationSeverity.ERROR)
    
    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == ValidationSeverity.WARNING)
    
    def to_dict(self) -> Dict:
        return {
            "valid": self.valid,
            "checked_fields": self.checked_fields,
            "passed_fields": self.passed_fields,
            "critical_count": self.critical_count,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "issues": [i.to_dict() for i in self.issues]
        }


# =============================================================================
# PLACEHOLDER DETECTION PATTERNS
# =============================================================================

PLACEHOLDER_PATTERNS = [
    # Common placeholder strings
    r"^TBD$", r"^TODO$", r"^FIXME$", r"^XXX$", r"^N/A$",
    r"^placeholder$", r"^PLACEHOLDER$",
    r"^unknown$", r"^UNKNOWN$",
    r"^none$", r"^null$", r"^undefined$",
    r"^test$", r"^TEST$", r"^dummy$", r"^DUMMY$",
    r"^sample$", r"^SAMPLE$", r"^example$", r"^EXAMPLE$",
    r"^fake$", r"^FAKE$", r"^mock$", r"^MOCK$",
    r"^temp$", r"^TEMP$", r"^temporary$",
    r"^default$", r"^DEFAULT$",
    
    # Patterns with ellipsis or incomplete
    r"\.{3,}$",  # Ends with ...
    r"^\.{3,}",  # Starts with ...
    r"\.\.\.$",  # ...
    r"^-+$",     # Just dashes
    r"^_+$",     # Just underscores
    r"^\?+$",    # Just question marks
    
    # Lorem ipsum and test text
    r"lorem\s*ipsum",
    r"^asdf",
    r"^qwerty",
    r"^abc123",
    r"^foo$", r"^bar$", r"^baz$",
    
    # Numeric placeholders
    r"^0\.0+$",   # 0.0, 0.00, etc when clearly placeholder
    r"^-1$",      # -1 often used as "not set"
    r"^999+$",    # 999, 9999, etc
    r"^12345",    # Sequential numbers
    
    # Empty or whitespace
    r"^\s*$",     # Empty or whitespace only
]

PLACEHOLDER_COMPILED = [re.compile(p, re.IGNORECASE) for p in PLACEHOLDER_PATTERNS]


def is_placeholder(value: Any) -> Tuple[bool, str]:
    """
    Check if a value appears to be a placeholder.
    Returns (is_placeholder, reason)
    """
    if value is None:
        return True, "Value is None"
    
    if isinstance(value, str):
        # Check if empty or whitespace
        if not value.strip():
            return True, "Empty string"
        
        # Check against patterns
        for pattern in PLACEHOLDER_COMPILED:
            if pattern.search(value):
                return True, f"Matches placeholder pattern: {pattern.pattern}"
        
        # Check for suspiciously short values in description fields
        if len(value.strip()) < 3:
            return True, f"Suspiciously short value: '{value}'"
    
    elif isinstance(value, (int, float)):
        # Check for obviously fake numbers
        if value == -1:
            return True, "Value is -1 (common placeholder)"
        if value == 0 and not isinstance(value, bool):
            # 0 might be valid in some contexts, mark as warning
            pass
        if isinstance(value, float) and (value == 999.0 or value == 9999.0):
            return True, "Value is 999/9999 (common placeholder)"
    
    elif isinstance(value, list):
        if len(value) == 0:
            return True, "Empty list"
        # Check if all items are placeholders
        all_placeholder = all(is_placeholder(item)[0] for item in value)
        if all_placeholder:
            return True, "All list items are placeholders"
    
    elif isinstance(value, dict):
        if len(value) == 0:
            return True, "Empty dictionary"
    
    return False, ""


# =============================================================================
# PHYSICAL RANGE VALIDATORS
# =============================================================================

# Manufacturing-specific valid ranges
PHYSICAL_RANGES = {
    # Material properties
    "density": (0.5, 25.0, "g/cm³"),           # From magnesium to tungsten
    "hardness_hrc": (0, 72, "HRC"),            # Hardness scale
    "hardness_hb": (50, 750, "HB"),            # Brinell hardness
    "tensile_strength": (10, 3500, "MPa"),     # From soft plastics to carbon fiber
    "yield_strength": (5, 2500, "MPa"),
    "elastic_modulus": (0.5, 1200, "GPa"),     # From rubber to diamond
    "thermal_conductivity": (0.1, 430, "W/m·K"),
    "specific_heat": (100, 5000, "J/kg·K"),
    "melting_point": (-50, 3700, "°C"),        # From mercury to tungsten
    
    # Machining parameters
    "cutting_speed": (1, 2000, "m/min"),       # From hard materials to aluminum
    "feed_rate": (0.001, 10, "mm/rev"),
    "depth_of_cut": (0.01, 50, "mm"),
    "spindle_speed": (1, 100000, "RPM"),
    "tool_diameter": (0.1, 500, "mm"),
    "tool_length": (1, 1000, "mm"),
    
    # Kienzle coefficients
    "kc1_1": (100, 10000, "N/mm²"),            # Specific cutting force
    "mc": (0.1, 0.5, ""),                      # Kienzle exponent
    
    # Taylor tool life
    "taylor_C": (10, 1000, "m/min"),
    "taylor_n": (0.05, 0.5, ""),
    
    # Machine specs
    "axis_travel": (1, 50000, "mm"),
    "rapid_rate": (1, 100000, "mm/min"),
    "spindle_power": (0.1, 500, "kW"),
    "spindle_torque": (1, 50000, "Nm"),
    
    # Alarm codes
    "alarm_code": (0, 99999, ""),
}


def validate_physical_range(field_name: str, value: Any) -> Optional[ValidationIssue]:
    """
    Validate that a value is within physically reasonable range.
    Returns ValidationIssue if out of range, None if OK.
    """
    if not isinstance(value, (int, float)):
        return None
    
    # Find matching range definition
    for range_key, (min_val, max_val, unit) in PHYSICAL_RANGES.items():
        if range_key in field_name.lower():
            if value < min_val or value > max_val:
                return ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.RANGE,
                    field=field_name,
                    message=f"Value {value} outside physical range [{min_val}, {max_val}] {unit}",
                    value=value,
                    expected=f"{min_val} to {max_val} {unit}"
                )
    
    return None


# =============================================================================
# ALARM DATABASE VALIDATOR
# =============================================================================

REQUIRED_ALARM_FIELDS = [
    "alarm_id",
    "code", 
    "name",
    "category",
    "severity",
    "description",
    "causes",
]

VALID_ALARM_CATEGORIES = {
    "SERVO", "SPINDLE", "ATC", "PROGRAM", "SAFETY", "SYSTEM",
    "COMMUNICATION", "TEMPERATURE", "HYDRAULIC", "PNEUMATIC",
    "ENCODER", "AXIS", "OVERTRAVEL", "PARAMETER", "PLC",
    "EMERGENCY", "HARDWARE", "SOFTWARE", "POWER", "COOLANT"
}

VALID_ALARM_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}


def validate_alarm(alarm: Dict) -> ValidationResult:
    """
    Validate a single alarm entry.
    Returns ValidationResult with all issues found.
    """
    result = ValidationResult(valid=True)
    
    # Check required fields
    for field in REQUIRED_ALARM_FIELDS:
        result.checked_fields += 1
        if field not in alarm:
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                category=ValidationCategory.COMPLETENESS,
                field=field,
                message=f"Missing required field: {field}"
            ))
            result.valid = False
        else:
            value = alarm[field]
            
            # Check for placeholders
            is_ph, reason = is_placeholder(value)
            if is_ph:
                result.issues.append(ValidationIssue(
                    severity=ValidationSeverity.CRITICAL,
                    category=ValidationCategory.PLACEHOLDER,
                    field=field,
                    message=f"Placeholder detected: {reason}",
                    value=value
                ))
                result.valid = False
            else:
                result.passed_fields += 1
    
    # Validate alarm_id format
    if "alarm_id" in alarm:
        alarm_id = alarm["alarm_id"]
        if not re.match(r"^ALM-[A-Z]+-\d+$", str(alarm_id)):
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.FORMAT,
                field="alarm_id",
                message=f"Invalid alarm_id format: {alarm_id}",
                value=alarm_id,
                expected="ALM-FAMILY-CODE (e.g., ALM-FANUC-001)"
            ))
    
    # Validate category
    if "category" in alarm:
        cat = alarm["category"]
        if cat not in VALID_ALARM_CATEGORIES:
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.TYPE,
                field="category",
                message=f"Invalid alarm category: {cat}",
                value=cat,
                expected=f"One of: {', '.join(sorted(VALID_ALARM_CATEGORIES))}"
            ))
    
    # Validate severity
    if "severity" in alarm:
        sev = alarm["severity"]
        if sev not in VALID_ALARM_SEVERITIES:
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.TYPE,
                field="severity",
                message=f"Invalid alarm severity: {sev}",
                value=sev,
                expected=f"One of: {', '.join(sorted(VALID_ALARM_SEVERITIES))}"
            ))
    
    # Validate description quality
    if "description" in alarm:
        desc = alarm["description"]
        if isinstance(desc, str):
            # Check for suspiciously short descriptions
            if len(desc) < 10:
                result.issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category=ValidationCategory.UTILITY,
                    field="description",
                    message=f"Description too short to be useful ({len(desc)} chars)",
                    value=desc,
                    expected="At least 10 characters of meaningful description"
                ))
            
            # Check for generic/useless descriptions
            generic_patterns = [
                r"^error$", r"^alarm$", r"^fault$", r"^problem$",
                r"^see manual$", r"^contact support$", r"^check\s*$"
            ]
            for pattern in generic_patterns:
                if re.match(pattern, desc, re.IGNORECASE):
                    result.issues.append(ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category=ValidationCategory.UTILITY,
                        field="description",
                        message=f"Generic/unhelpful description",
                        value=desc,
                        expected="Specific, actionable description"
                    ))
                    break
    
    # Validate causes is non-empty list
    if "causes" in alarm:
        causes = alarm["causes"]
        if not isinstance(causes, list):
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.TYPE,
                field="causes",
                message="causes must be a list",
                value=type(causes).__name__,
                expected="list"
            ))
        elif len(causes) == 0:
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category=ValidationCategory.COMPLETENESS,
                field="causes",
                message="No causes listed",
                expected="At least one cause"
            ))
        else:
            # Check each cause
            for i, cause in enumerate(causes):
                is_ph, reason = is_placeholder(cause)
                if is_ph:
                    result.issues.append(ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category=ValidationCategory.PLACEHOLDER,
                        field=f"causes[{i}]",
                        message=f"Placeholder cause: {reason}",
                        value=cause
                    ))
    
    # Update valid flag based on critical/error issues
    if result.critical_count > 0 or result.error_count > 0:
        result.valid = False
    
    return result


# =============================================================================
# MATERIAL DATABASE VALIDATOR
# =============================================================================

REQUIRED_MATERIAL_FIELDS = [
    "material_id",
    "name",
    "category",
    "density",
]

CRITICAL_MATERIAL_FIELDS = [
    # Without these, cutting calculations are impossible
    "kc1_1",           # Specific cutting force
    "mc",              # Kienzle exponent
    "hardness",        # Any hardness value
]


def validate_material(material: Dict) -> ValidationResult:
    """Validate a single material entry"""
    result = ValidationResult(valid=True)
    
    # Check required fields
    for field in REQUIRED_MATERIAL_FIELDS:
        result.checked_fields += 1
        if field not in material:
            result.issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                category=ValidationCategory.COMPLETENESS,
                field=field,
                message=f"Missing required field: {field}"
            ))
            result.valid = False
        else:
            value = material[field]
            is_ph, reason = is_placeholder(value)
            if is_ph:
                result.issues.append(ValidationIssue(
                    severity=ValidationSeverity.CRITICAL,
                    category=ValidationCategory.PLACEHOLDER,
                    field=field,
                    message=f"Placeholder detected: {reason}",
                    value=value
                ))
                result.valid = False
            else:
                result.passed_fields += 1
                
                # Range check
                range_issue = validate_physical_range(field, value)
                if range_issue:
                    result.issues.append(range_issue)
    
    # Check critical calculation fields
    has_cutting_data = False
    for field in CRITICAL_MATERIAL_FIELDS:
        if field in material:
            value = material[field]
            is_ph, _ = is_placeholder(value)
            if not is_ph and value is not None:
                has_cutting_data = True
                break
    
    if not has_cutting_data:
        result.issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            category=ValidationCategory.UTILITY,
            field="cutting_data",
            message="Material lacks cutting calculation data (kc1_1, mc, or hardness)",
            expected="At least one cutting parameter for calculations"
        ))
    
    # Update valid flag
    if result.critical_count > 0 or result.error_count > 0:
        result.valid = False
    
    return result


# =============================================================================
# SWARM OUTPUT VALIDATOR
# =============================================================================

def validate_swarm_output(output: Any, expected_schema: Dict = None) -> ValidationResult:
    """
    Validate output from a swarm operation.
    Swarm outputs are HIGH RISK for placeholder data.
    
    Args:
        output: The swarm output to validate
        expected_schema: Optional schema defining expected structure
    
    Returns:
        ValidationResult with all issues found
    """
    result = ValidationResult(valid=True)
    
    if output is None:
        result.issues.append(ValidationIssue(
            severity=ValidationSeverity.CRITICAL,
            category=ValidationCategory.COMPLETENESS,
            field="output",
            message="Swarm returned None"
        ))
        result.valid = False
        return result
    
    # Recursive placeholder check
    def check_recursive(obj: Any, path: str = ""):
        nonlocal result
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                field_path = f"{path}.{key}" if path else key
                result.checked_fields += 1
                
                is_ph, reason = is_placeholder(value)
                if is_ph:
                    result.issues.append(ValidationIssue(
                        severity=ValidationSeverity.CRITICAL,
                        category=ValidationCategory.PLACEHOLDER,
                        field=field_path,
                        message=f"Placeholder in swarm output: {reason}",
                        value=value
                    ))
                    result.valid = False
                else:
                    result.passed_fields += 1
                    check_recursive(value, field_path)
        
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                check_recursive(item, f"{path}[{i}]")
    
    check_recursive(output)
    
    # Schema validation if provided
    if expected_schema:
        # TODO: Add JSON schema validation
        pass
    
    return result


# =============================================================================
# BATCH VALIDATORS
# =============================================================================

def validate_alarm_database(alarms: List[Dict]) -> Tuple[ValidationResult, List[ValidationResult]]:
    """
    Validate entire alarm database.
    Returns (summary, individual_results)
    """
    summary = ValidationResult(valid=True)
    individual_results = []
    
    for alarm in alarms:
        result = validate_alarm(alarm)
        individual_results.append(result)
        
        summary.checked_fields += result.checked_fields
        summary.passed_fields += result.passed_fields
        summary.issues.extend(result.issues)
        
        if not result.valid:
            summary.valid = False
    
    return summary, individual_results


def validate_material_database(materials: List[Dict]) -> Tuple[ValidationResult, List[ValidationResult]]:
    """
    Validate entire material database.
    Returns (summary, individual_results)
    """
    summary = ValidationResult(valid=True)
    individual_results = []
    
    for material in materials:
        result = validate_material(material)
        individual_results.append(result)
        
        summary.checked_fields += result.checked_fields
        summary.passed_fields += result.passed_fields
        summary.issues.extend(result.issues)
        
        if not result.valid:
            summary.valid = False
    
    return summary, individual_results


# =============================================================================
# VALIDATION REPORT GENERATOR
# =============================================================================

def generate_validation_report(result: ValidationResult, title: str = "Validation Report") -> str:
    """Generate human-readable validation report"""
    lines = []
    lines.append("=" * 70)
    lines.append(title)
    lines.append("=" * 70)
    
    status = "✓ VALID" if result.valid else "✗ INVALID"
    lines.append(f"\nStatus: {status}")
    lines.append(f"Fields Checked: {result.checked_fields}")
    lines.append(f"Fields Passed: {result.passed_fields}")
    lines.append(f"Pass Rate: {result.passed_fields/result.checked_fields*100:.1f}%" if result.checked_fields > 0 else "N/A")
    
    lines.append(f"\nIssues Found: {len(result.issues)}")
    lines.append(f"  Critical: {result.critical_count}")
    lines.append(f"  Errors: {result.error_count}")
    lines.append(f"  Warnings: {result.warning_count}")
    
    if result.issues:
        lines.append("\n" + "-" * 70)
        lines.append("ISSUES:")
        lines.append("-" * 70)
        
        # Group by severity
        for severity in [ValidationSeverity.CRITICAL, ValidationSeverity.ERROR, ValidationSeverity.WARNING]:
            severity_issues = [i for i in result.issues if i.severity == severity]
            if severity_issues:
                lines.append(f"\n[{severity.value}]")
                for issue in severity_issues[:20]:  # Limit output
                    lines.append(f"  {issue.field}: {issue.message}")
                    if issue.value is not None:
                        lines.append(f"    Value: {issue.value}")
                    if issue.expected:
                        lines.append(f"    Expected: {issue.expected}")
                
                if len(severity_issues) > 20:
                    lines.append(f"  ... and {len(severity_issues) - 20} more {severity.value} issues")
    
    lines.append("\n" + "=" * 70)
    
    return "\n".join(lines)


# =============================================================================
# MAIN VALIDATION INTERFACE
# =============================================================================

class PRISMValidator:
    """Main validation interface for PRISM data"""
    
    def __init__(self):
        self.validation_history = []
    
    def validate_alarm(self, alarm: Dict) -> ValidationResult:
        """Validate single alarm"""
        result = validate_alarm(alarm)
        self.validation_history.append(("alarm", result))
        return result
    
    def validate_material(self, material: Dict) -> ValidationResult:
        """Validate single material"""
        result = validate_material(material)
        self.validation_history.append(("material", result))
        return result
    
    def validate_swarm_output(self, output: Any, schema: Dict = None) -> ValidationResult:
        """Validate swarm output - CRITICAL for catching garbage data"""
        result = validate_swarm_output(output, schema)
        self.validation_history.append(("swarm", result))
        return result
    
    def validate_alarm_file(self, filepath: Path) -> Tuple[ValidationResult, str]:
        """Validate alarm JSON file"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            alarms = data
        elif isinstance(data, dict) and "alarms" in data:
            alarms = data["alarms"]
        else:
            alarms = [data]
        
        summary, _ = validate_alarm_database(alarms)
        report = generate_validation_report(summary, f"Alarm Validation: {filepath.name}")
        
        return summary, report
    
    def validate_material_file(self, filepath: Path) -> Tuple[ValidationResult, str]:
        """Validate material JSON file"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            materials = data
        elif isinstance(data, dict) and "materials" in data:
            materials = data["materials"]
        else:
            materials = [data]
        
        summary, _ = validate_material_database(materials)
        report = generate_validation_report(summary, f"Material Validation: {filepath.name}")
        
        return summary, report


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python prism_validator.py <type> <file>")
        print("  type: alarm | material | swarm")
        print("  file: Path to JSON file")
        sys.exit(1)
    
    val_type = sys.argv[1]
    filepath = Path(sys.argv[2])
    
    validator = PRISMValidator()
    
    if val_type == "alarm":
        result, report = validator.validate_alarm_file(filepath)
    elif val_type == "material":
        result, report = validator.validate_material_file(filepath)
    else:
        print(f"Unknown validation type: {val_type}")
        sys.exit(1)
    
    print(report)
    sys.exit(0 if result.valid else 1)
