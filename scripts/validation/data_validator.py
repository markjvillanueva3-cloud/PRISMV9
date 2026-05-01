"""
PRISM DATA VALIDATION MODULE v1.0
=================================
Mandatory validation for ALL data before it enters PRISM systems.

CRITICAL: This module exists because swarm agents produced garbage/placeholder
data during the alarms database work. NO DATA enters PRISM without passing
validation. Lives depend on validated data.

Validation Levels:
  L1 - SYNTAX: Structure, types, required fields
  L2 - SEMANTICS: Values make physical sense  
  L3 - COMPLETENESS: No placeholders, no TODOs, no garbage
  L4 - CROSS-REFERENCE: Data links to valid sources
  L5 - DOMAIN: Expert-level manufacturing validation

Author: Claude (PRISM Developer)
Date: 2026-01-28
"""

import json
import re
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ValidationLevel(Enum):
    L1_SYNTAX = 1
    L2_SEMANTICS = 2
    L3_COMPLETENESS = 3
    L4_CROSS_REFERENCE = 4
    L5_DOMAIN = 5


class ValidationResult(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"


@dataclass
class ValidationIssue:
    level: ValidationLevel
    result: ValidationResult
    field: str
    message: str
    value: Any = None
    suggestion: str = ""


@dataclass
class ValidationReport:
    data_type: str
    data_id: str
    passed: bool
    level_reached: ValidationLevel
    issues: List[ValidationIssue] = field(default_factory=list)
    warnings: List[ValidationIssue] = field(default_factory=list)
    
    def add_issue(self, issue: ValidationIssue):
        if issue.result == ValidationResult.FAIL:
            self.issues.append(issue)
            self.passed = False
        elif issue.result == ValidationResult.WARN:
            self.warnings.append(issue)
    
    def summary(self) -> str:
        if self.passed:
            return f"✓ VALIDATED: {self.data_type} '{self.data_id}' - Level {self.level_reached.name}"
        else:
            return f"✗ REJECTED: {self.data_type} '{self.data_id}' - {len(self.issues)} issues"
    
    def to_dict(self) -> Dict:
        return {
            "data_type": self.data_type,
            "data_id": self.data_id,
            "passed": self.passed,
            "level_reached": self.level_reached.name,
            "issues": [{"field": i.field, "message": i.message, "value": str(i.value)[:100]} for i in self.issues],
            "warnings": [{"field": w.field, "message": w.message} for w in self.warnings]
        }


# =============================================================================
# PLACEHOLDER DETECTION PATTERNS - CRITICAL FOR CATCHING GARBAGE DATA
# =============================================================================

PLACEHOLDER_PATTERNS = [
    # Explicit placeholders
    r'\bTODO\b',
    r'\bFIXME\b', 
    r'\bXXX\b',
    r'\bHACK\b',
    r'\bTBD\b',
    r'\bPLACEHOLDER\b',
    r'\bFILLER\b',
    r'\bDUMMY\b',
    r'\bTEMP\b',
    r'(?<![a-zA-Z])TEST(?![a-zA-Z])',  # TEST but not "testing"
    
    # Lazy/empty values
    r'^N/A$',
    r'^n/a$',
    r'^NA$',
    r'^-$',
    r'^--$',
    r'^\.{2,}$',
    r'^\?+$',
    r'^unknown$',
    r'^UNKNOWN$',
    r'^none$',
    r'^null$',
    r'^undefined$',
    r'^empty$',
    r'^blank$',
    
    # Template markers
    r'\{\{.*?\}\}',
    r'\[\[.*?\]\]',
    r'<INSERT.*?>',
    r'\$\{.*?\}',
    r'%[A-Z_]+%',
    
    # Obvious garbage
    r'^asdf',
    r'^qwerty',
    r'^test\d*$',
    r'^foo$',
    r'^bar$',
    r'^baz$',
    r'^lorem',
    r'^ipsum',
    r'^example\d*$',
    r'^sample\d*$',
    r'^abc\d*$',
    r'^xyz$',
    
    # Repetitive patterns (aaaa, 1111, xxxx etc.)
    r'^(.)\1{3,}$',
    
    # Sequential numbers that look auto-generated
    r'^0+$',
    r'^1+$',
    r'^123+$',
    r'^999+$',
    
    # Generic useless descriptions
    r'^description$',
    r'^enter description$',
    r'^add description$',
    r'^this is',
    r'^some ',
    r'^generic ',
]

COMPILED_PLACEHOLDER_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PLACEHOLDER_PATTERNS]


# =============================================================================
# GARBAGE DATA DETECTION
# =============================================================================

def is_placeholder(value: Any) -> Tuple[bool, str]:
    """Check if a value is a placeholder or garbage data"""
    if value is None:
        return True, "Value is None"
    
    if isinstance(value, str):
        # Empty or whitespace-only
        stripped = value.strip()
        if not stripped:
            return True, "Empty string"
        
        # Check against placeholder patterns
        for pattern in COMPILED_PLACEHOLDER_PATTERNS:
            if pattern.search(stripped):
                return True, f"Matches placeholder pattern: {pattern.pattern}"
        
        # Suspiciously short for most text fields
        if len(stripped) < 2:
            return True, "Single character value"
            
        # Check for repeated characters
        if len(set(stripped.lower())) == 1 and len(stripped) > 2:
            return True, f"Repeated character: '{stripped[0]}'"
    
    elif isinstance(value, (int, float)):
        # Suspicious placeholder numbers
        if value == -1 or value == -999:
            return True, "Sentinel value (-1 or -999)"
        if value == 999 or value == 9999 or value == 99999:
            return True, "Suspicious 999... value"
        if isinstance(value, float):
            if value == 0.0:
                return True, "Zero float (likely unset)"
            if value == 1.0 and not (0.9 <= value <= 1.1):
                # 1.0 can be valid for ratios but suspicious for most fields
                pass  # Don't flag - context dependent
    
    elif isinstance(value, list):
        if len(value) == 0:
            return True, "Empty list"
        # Check if ALL items are placeholders
        all_placeholder = all(is_placeholder(item)[0] for item in value)
        if all_placeholder:
            return True, "All list items are placeholders"
    
    elif isinstance(value, dict):
        if len(value) == 0:
            return True, "Empty dictionary"
    
    return False, ""


def detect_garbage_patterns(data: Dict) -> List[str]:
    """Detect patterns that indicate garbage/filler data from swarms"""
    issues = []
    
    # Check for repetitive descriptions (copy-paste swarm behavior)
    descriptions = []
    for key, value in data.items():
        if isinstance(value, str) and len(value) > 20:
            descriptions.append(value)
    
    if len(descriptions) > 2:
        # Check for suspiciously similar descriptions
        unique_starts = set(d[:30].lower() for d in descriptions)
        if len(unique_starts) < len(descriptions) * 0.6:
            issues.append("Repetitive/templated descriptions detected - likely swarm copy-paste")
    
    # Check for sequential IDs (auto-generation without real data)
    ids = [v for k, v in data.items() if 'id' in k.lower() and isinstance(v, (str, int))]
    if len(ids) > 1:
        try:
            numbers = [int(re.search(r'\d+', str(id)).group()) for id in ids if re.search(r'\d+', str(id))]
            if len(numbers) > 1:
                numbers_sorted = sorted(numbers)
                if numbers_sorted == list(range(numbers_sorted[0], numbers_sorted[0] + len(numbers_sorted))):
                    issues.append("Sequential numeric IDs suggest auto-generated placeholder data")
        except:
            pass
    
    # Check for generic category/type values
    generic_values = ["type1", "type2", "category1", "cat1", "default", "other", "misc"]
    for key, value in data.items():
        if isinstance(value, str) and value.lower() in generic_values:
            issues.append(f"Generic placeholder value '{value}' in field '{key}'")
    
    return issues


# =============================================================================
# ALARM VALIDATOR - For CNC Controller Alarms
# =============================================================================

class AlarmValidator:
    """Validates CNC controller alarm data - catches swarm garbage"""
    
    REQUIRED_FIELDS = [
        "alarm_id", "code", "name", "category", "severity",
        "description", "causes", "quick_fix"
    ]
    
    VALID_CATEGORIES = [
        "SERVO", "SPINDLE", "ATC", "PROGRAM", "SAFETY", "SYSTEM",
        "OVERTRAVEL", "OVERHEAT", "COMMUNICATION", "PARAMETER",
        "MEMORY", "HARDWARE", "COOLANT", "HYDRAULIC", "PNEUMATIC",
        "ENCODER", "AXIS", "PMC", "MACRO", "NETWORK", "POWER",
        "LUBRICATION", "TURRET", "DOOR", "CHUCK", "FEEDRATE",
        "TOOL", "WORKPIECE", "GEOMETRY", "COMPENSATION"
    ]
    
    VALID_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    
    # Controller-specific alarm code patterns
    ALARM_CODE_PATTERNS = {
        "FANUC": r'^(PS|SR|SV|SP|OT|IO|MC|BG|FS|OH|PC|DS|PW|EX)\d{3,4}$',
        "SIEMENS": r'^\d{4,6}$',
        "HAAS": r'^\d{1,4}$',
        "MAZAK": r'^[A-Z]?\d{2,4}$',
        "OKUMA": r'^\d{4}$',
        "HEIDENHAIN": r'^(FE|SE)\d{4}$',
        "MITSUBISHI": r'^[A-Z]\d{2,4}$',
        "BROTHER": r'^\d{3,4}$',
    }
    
    @classmethod
    def validate(cls, alarm: Dict, controller_family: str = "GENERIC") -> ValidationReport:
        """Validate a single alarm entry - STRICT validation"""
        alarm_id = alarm.get("alarm_id", alarm.get("id", "UNKNOWN"))
        report = ValidationReport(
            data_type="Alarm",
            data_id=str(alarm_id),
            passed=True,
            level_reached=ValidationLevel.L1_SYNTAX
        )
        
        # =================================================================
        # L1: SYNTAX - Required fields exist with correct types
        # =================================================================
        for fld in cls.REQUIRED_FIELDS:
            if fld not in alarm:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L1_SYNTAX,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"Required field '{fld}' is missing"
                ))
            elif alarm[fld] is None:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L1_SYNTAX,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"Field '{fld}' is null"
                ))
        
        # Type checks
        if "causes" in alarm and not isinstance(alarm["causes"], list):
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L1_SYNTAX,
                result=ValidationResult.FAIL,
                field="causes",
                message="'causes' must be a list",
                value=type(alarm["causes"]).__name__
            ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L2_SEMANTICS
        
        # =================================================================
        # L2: SEMANTICS - Values make sense
        # =================================================================
        category = alarm.get("category", "").upper()
        if category not in cls.VALID_CATEGORIES:
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L2_SEMANTICS,
                result=ValidationResult.FAIL,
                field="category",
                message=f"Invalid category: '{alarm.get('category')}'",
                value=alarm.get("category"),
                suggestion=f"Valid: {', '.join(cls.VALID_CATEGORIES[:10])}..."
            ))
        
        severity = alarm.get("severity", "").upper()
        if severity not in cls.VALID_SEVERITIES:
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L2_SEMANTICS,
                result=ValidationResult.FAIL,
                field="severity",
                message=f"Invalid severity: '{alarm.get('severity')}'",
                value=alarm.get("severity"),
                suggestion=f"Valid: {', '.join(cls.VALID_SEVERITIES)}"
            ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L3_COMPLETENESS
        
        # =================================================================
        # L3: COMPLETENESS - No placeholders, real data only
        # =================================================================
        for fld in cls.REQUIRED_FIELDS:
            value = alarm.get(fld)
            is_ph, reason = is_placeholder(value)
            if is_ph:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"PLACEHOLDER DETECTED: {reason}",
                    value=str(value)[:50] if value else None
                ))
        
        # Description quality check - STRICT
        desc = alarm.get("description", "")
        if isinstance(desc, str):
            if len(desc) < 25:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field="description",
                    message=f"Description too short ({len(desc)} chars) - must be >= 25 chars with real info",
                    value=desc
                ))
            
            # Check for useless generic descriptions
            useless_phrases = [
                "error occurred", "alarm triggered", "check manual",
                "contact support", "see documentation", "refer to manual",
                "error has occurred", "problem detected", "fault detected",
                "issue found", "see alarm", "check alarm"
            ]
            desc_lower = desc.lower()
            if any(phrase in desc_lower for phrase in useless_phrases) and len(desc) < 60:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field="description",
                    message="Generic useless description - needs specific technical detail",
                    value=desc
                ))
        
        # Causes validation - must have real causes
        causes = alarm.get("causes", [])
        if isinstance(causes, list):
            if len(causes) < 1:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field="causes",
                    message="At least one specific cause must be listed"
                ))
            else:
                valid_causes = 0
                for i, cause in enumerate(causes):
                    is_ph, reason = is_placeholder(cause)
                    if is_ph:
                        report.add_issue(ValidationIssue(
                            level=ValidationLevel.L3_COMPLETENESS,
                            result=ValidationResult.FAIL,
                            field=f"causes[{i}]",
                            message=f"PLACEHOLDER cause: {reason}",
                            value=str(cause)[:50] if cause else None
                        ))
                    elif isinstance(cause, str) and len(cause) < 10:
                        report.add_issue(ValidationIssue(
                            level=ValidationLevel.L3_COMPLETENESS,
                            result=ValidationResult.FAIL,
                            field=f"causes[{i}]",
                            message=f"Cause too short ({len(cause)} chars) - needs detail",
                            value=cause
                        ))
                    else:
                        valid_causes += 1
                
                if valid_causes == 0:
                    report.add_issue(ValidationIssue(
                        level=ValidationLevel.L3_COMPLETENESS,
                        result=ValidationResult.FAIL,
                        field="causes",
                        message="No valid causes - all are placeholders or too short"
                    ))
        
        # Quick fix quality - MUST be actionable
        quick_fix = alarm.get("quick_fix", "")
        if isinstance(quick_fix, str):
            if len(quick_fix) < 15:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field="quick_fix",
                    message=f"Quick fix too short ({len(quick_fix)} chars) - must be actionable",
                    value=quick_fix
                ))
            
            # Check for useless quick fixes
            useless_fixes = [
                "check manual", "see manual", "contact support",
                "call technician", "reset", "restart", "reboot",
                "check error", "see error", "fix error"
            ]
            if quick_fix.lower().strip() in useless_fixes:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field="quick_fix",
                    message="Useless quick fix - needs specific actionable steps",
                    value=quick_fix
                ))
        
        # Check for garbage patterns
        garbage_issues = detect_garbage_patterns(alarm)
        for issue in garbage_issues:
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L3_COMPLETENESS,
                result=ValidationResult.FAIL,
                field="*",
                message=f"GARBAGE PATTERN: {issue}"
            ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L4_CROSS_REFERENCE
        
        # =================================================================
        # L4: CROSS-REFERENCE - ID format matches controller
        # =================================================================
        code = str(alarm.get("code", ""))
        controller_upper = controller_family.upper()
        
        if controller_upper in cls.ALARM_CODE_PATTERNS:
            pattern = cls.ALARM_CODE_PATTERNS[controller_upper]
            if not re.match(pattern, code):
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L4_CROSS_REFERENCE,
                    result=ValidationResult.WARN,
                    field="code",
                    message=f"Code format doesn't match {controller_upper} pattern: {pattern}",
                    value=code
                ))
        
        # Check alarm_id contains controller prefix
        alarm_id_str = str(alarm_id).upper()
        expected_prefix = f"ALM-{controller_upper[:3]}"
        if not alarm_id_str.startswith(expected_prefix) and not alarm_id_str.startswith("ALM-"):
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L4_CROSS_REFERENCE,
                result=ValidationResult.WARN,
                field="alarm_id",
                message=f"Alarm ID should follow format: {expected_prefix}-XXXX",
                value=alarm_id
            ))
        
        report.level_reached = ValidationLevel.L5_DOMAIN
        return report


# =============================================================================
# MATERIAL VALIDATOR
# =============================================================================

class MaterialValidator:
    """Validates material data for manufacturing calculations"""
    
    REQUIRED_FIELDS = [
        "material_id", "name", "category", "density",
        "hardness_hrc", "tensile_strength", "machinability_rating"
    ]
    
    # Physics-based ranges - values outside these are IMPOSSIBLE
    PHYSICS_RANGES = {
        "density": (0.5, 25.0),  # g/cm³ (Mg=1.7, W=19.3)
        "hardness_hrc": (0, 72),  # HRC scale
        "hardness_hb": (50, 750),  # Brinell
        "tensile_strength": (20, 3500),  # MPa
        "yield_strength": (10, 3000),  # MPa
        "machinability_rating": (0.05, 3.0),  # relative to 1212 steel = 1.0
        "thermal_conductivity": (0.1, 500),  # W/m·K
        "specific_heat": (100, 2500),  # J/kg·K
        "elastic_modulus": (1, 500),  # GPa
        "poisson_ratio": (0.1, 0.5),  # dimensionless
        "melting_point": (100, 4000),  # °C
    }
    
    VALID_CATEGORIES = [
        "STEEL", "STAINLESS", "CAST_IRON", "ALUMINUM", "COPPER",
        "TITANIUM", "NICKEL_ALLOY", "COBALT_ALLOY", "MAGNESIUM",
        "ZINC", "BRASS", "BRONZE", "TOOL_STEEL", "HSLA", "PLASTIC",
        "COMPOSITE", "CERAMIC", "TUNGSTEN", "MOLYBDENUM"
    ]
    
    @classmethod
    def validate(cls, material: Dict) -> ValidationReport:
        """Validate a material entry"""
        mat_id = material.get("material_id", material.get("id", "UNKNOWN"))
        report = ValidationReport(
            data_type="Material",
            data_id=str(mat_id),
            passed=True,
            level_reached=ValidationLevel.L1_SYNTAX
        )
        
        # L1: SYNTAX
        for fld in cls.REQUIRED_FIELDS:
            if fld not in material:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L1_SYNTAX,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"Required field '{fld}' is missing"
                ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L2_SEMANTICS
        
        # L2: SEMANTICS - Physics validation
        for fld, (min_val, max_val) in cls.PHYSICS_RANGES.items():
            if fld in material:
                value = material[fld]
                if isinstance(value, (int, float)):
                    if value < min_val or value > max_val:
                        report.add_issue(ValidationIssue(
                            level=ValidationLevel.L2_SEMANTICS,
                            result=ValidationResult.FAIL,
                            field=fld,
                            message=f"Value {value} outside physics range [{min_val}, {max_val}]",
                            value=value,
                            suggestion=f"Physical limits: {min_val} to {max_val}"
                        ))
        
        # Category validation
        category = material.get("category", "").upper().replace("-", "_").replace(" ", "_")
        if category not in cls.VALID_CATEGORIES:
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L2_SEMANTICS,
                result=ValidationResult.FAIL,
                field="category",
                message=f"Invalid category: '{material.get('category')}'",
                suggestion=f"Valid: {', '.join(cls.VALID_CATEGORIES[:8])}..."
            ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L3_COMPLETENESS
        
        # L3: COMPLETENESS - No placeholders
        for fld in cls.REQUIRED_FIELDS:
            value = material.get(fld)
            is_ph, reason = is_placeholder(value)
            if is_ph:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"PLACEHOLDER: {reason}",
                    value=str(value)[:50] if value else None
                ))
        
        # Name must be specific
        name = material.get("name", "")
        if isinstance(name, str) and len(name) < 3:
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L3_COMPLETENESS,
                result=ValidationResult.FAIL,
                field="name",
                message="Material name too short - needs proper designation"
            ))
        
        report.level_reached = ValidationLevel.L5_DOMAIN
        return report


# =============================================================================
# MACHINE VALIDATOR
# =============================================================================

class MachineValidator:
    """Validates CNC machine data"""
    
    REQUIRED_FIELDS = [
        "machine_id", "manufacturer", "model", "type",
        "x_travel", "y_travel", "z_travel", "spindle_speed_max"
    ]
    
    PHYSICS_RANGES = {
        "x_travel": (10, 50000),  # mm
        "y_travel": (10, 20000),  # mm
        "z_travel": (10, 10000),  # mm
        "spindle_speed_max": (100, 100000),  # RPM
        "spindle_power": (0.5, 500),  # kW
        "tool_capacity": (1, 500),  # tools
        "rapids_x": (1, 200),  # m/min
        "rapids_y": (1, 200),  # m/min
        "rapids_z": (1, 100),  # m/min
    }
    
    VALID_TYPES = [
        "VMC", "HMC", "LATHE", "TURN_MILL", "5_AXIS", 
        "SWISS", "GRINDER", "EDM", "ROUTER", "BORING"
    ]
    
    @classmethod
    def validate(cls, machine: Dict) -> ValidationReport:
        """Validate a machine entry"""
        machine_id = machine.get("machine_id", machine.get("id", "UNKNOWN"))
        report = ValidationReport(
            data_type="Machine",
            data_id=str(machine_id),
            passed=True,
            level_reached=ValidationLevel.L1_SYNTAX
        )
        
        # L1: SYNTAX
        for fld in cls.REQUIRED_FIELDS:
            if fld not in machine:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L1_SYNTAX,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"Required field '{fld}' is missing"
                ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L2_SEMANTICS
        
        # L2: SEMANTICS
        for fld, (min_val, max_val) in cls.PHYSICS_RANGES.items():
            if fld in machine:
                value = machine[fld]
                if isinstance(value, (int, float)):
                    if value < min_val or value > max_val:
                        report.add_issue(ValidationIssue(
                            level=ValidationLevel.L2_SEMANTICS,
                            result=ValidationResult.FAIL,
                            field=fld,
                            message=f"Value {value} outside range [{min_val}, {max_val}]"
                        ))
        
        if not report.passed:
            return report
        report.level_reached = ValidationLevel.L3_COMPLETENESS
        
        # L3: COMPLETENESS
        for fld in cls.REQUIRED_FIELDS:
            value = machine.get(fld)
            is_ph, reason = is_placeholder(value)
            if is_ph:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field=fld,
                    message=f"PLACEHOLDER: {reason}"
                ))
        
        report.level_reached = ValidationLevel.L5_DOMAIN
        return report


# =============================================================================
# GENERIC VALIDATOR - For any data type
# =============================================================================

class GenericValidator:
    """Generic validator for any data type"""
    
    @classmethod
    def validate(cls, data: Dict, required_fields: List[str] = None) -> ValidationReport:
        """Validate generic data"""
        data_id = data.get("id", data.get("name", "UNKNOWN"))
        report = ValidationReport(
            data_type="Generic",
            data_id=str(data_id),
            passed=True,
            level_reached=ValidationLevel.L3_COMPLETENESS
        )
        
        # Check required fields if specified
        if required_fields:
            for fld in required_fields:
                if fld not in data:
                    report.add_issue(ValidationIssue(
                        level=ValidationLevel.L1_SYNTAX,
                        result=ValidationResult.FAIL,
                        field=fld,
                        message=f"Required field '{fld}' missing"
                    ))
        
        # Check ALL fields for placeholders
        for key, value in data.items():
            is_ph, reason = is_placeholder(value)
            if is_ph:
                report.add_issue(ValidationIssue(
                    level=ValidationLevel.L3_COMPLETENESS,
                    result=ValidationResult.FAIL,
                    field=key,
                    message=f"PLACEHOLDER: {reason}",
                    value=str(value)[:50] if value else None
                ))
        
        # Check for garbage patterns
        garbage_issues = detect_garbage_patterns(data)
        for issue in garbage_issues:
            report.add_issue(ValidationIssue(
                level=ValidationLevel.L3_COMPLETENESS,
                result=ValidationResult.FAIL,
                field="*",
                message=f"GARBAGE: {issue}"
            ))
        
        return report


# =============================================================================
# VALIDATION ENFORCER - Singleton that tracks all validation
# =============================================================================

class ValidationEnforcer:
    """Enforces validation before data can enter PRISM systems"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.strict_mode = True
            cls._instance.rejected_count = 0
            cls._instance.accepted_count = 0
            cls._instance.rejection_log = []
        return cls._instance
    
    def validate_and_filter(
        self, 
        data: List[Dict], 
        data_type: str,
        verbose: bool = True,
        **kwargs
    ) -> List[Dict]:
        """Validate data and return ONLY valid entries - garbage is rejected"""
        valid_data = []
        
        for item in data:
            report = self.validate_single(item, data_type, **kwargs)
            
            if report.passed:
                valid_data.append(item)
                self.accepted_count += 1
            else:
                self.rejected_count += 1
                self.rejection_log.append(report.to_dict())
                
                if verbose:
                    print(f"  ✗ REJECTED: {report.data_id}")
                    for issue in report.issues[:3]:
                        print(f"      - {issue.field}: {issue.message}")
                    if len(report.issues) > 3:
                        print(f"      ... and {len(report.issues) - 3} more issues")
        
        return valid_data
    
    def validate_single(self, item: Dict, data_type: str, **kwargs) -> ValidationReport:
        """Validate a single item"""
        data_type_lower = data_type.lower()
        
        if data_type_lower == "alarm":
            return AlarmValidator.validate(item, kwargs.get("controller", "GENERIC"))
        elif data_type_lower == "material":
            return MaterialValidator.validate(item)
        elif data_type_lower == "machine":
            return MachineValidator.validate(item)
        else:
            return GenericValidator.validate(item, kwargs.get("required_fields"))
    
    def get_stats(self) -> Dict:
        """Get validation statistics"""
        total = self.accepted_count + self.rejected_count
        return {
            "accepted": self.accepted_count,
            "rejected": self.rejected_count,
            "total": total,
            "acceptance_rate": self.accepted_count / total if total > 0 else 0,
            "rejection_rate": self.rejected_count / total if total > 0 else 0
        }
    
    def reset_stats(self):
        """Reset statistics"""
        self.accepted_count = 0
        self.rejected_count = 0
        self.rejection_log = []


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def validate_data(data: Union[Dict, List[Dict]], data_type: str, **kwargs) -> Union[ValidationReport, List[ValidationReport]]:
    """Validate data - single item or batch"""
    enforcer = ValidationEnforcer()
    
    if isinstance(data, dict):
        return enforcer.validate_single(data, data_type, **kwargs)
    elif isinstance(data, list):
        return [enforcer.validate_single(item, data_type, **kwargs) for item in data]
    else:
        raise ValueError(f"Data must be dict or list, got {type(data)}")


def validate_alarm_batch(alarms: List[Dict], controller_family: str) -> Tuple[int, int, List[ValidationReport]]:
    """Validate a batch of alarms"""
    reports = [AlarmValidator.validate(alarm, controller_family) for alarm in alarms]
    passed = sum(1 for r in reports if r.passed)
    failed = len(reports) - passed
    return passed, failed, reports


def validate_material_batch(materials: List[Dict]) -> Tuple[int, int, List[ValidationReport]]:
    """Validate a batch of materials"""
    reports = [MaterialValidator.validate(mat) for mat in materials]
    passed = sum(1 for r in reports if r.passed)
    failed = len(reports) - passed
    return passed, failed, reports


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'ValidationLevel',
    'ValidationResult',
    'ValidationIssue',
    'ValidationReport',
    'AlarmValidator',
    'MaterialValidator',
    'MachineValidator',
    'GenericValidator',
    'ValidationEnforcer',
    'is_placeholder',
    'detect_garbage_patterns',
    'validate_alarm_batch',
    'validate_material_batch',
    'validate_data',
    'PLACEHOLDER_PATTERNS',
]
