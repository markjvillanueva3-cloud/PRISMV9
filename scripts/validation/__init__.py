"""
PRISM Validation Module
=======================
Mandatory validation for ALL data before it enters PRISM systems.

CRITICAL: This module exists because swarm agents produced garbage/placeholder
data during database work. NO DATA enters PRISM without passing validation.

Usage:
    from validation import validate_data, ValidationEnforcer
    
    # Single item validation
    result = validate_data(item, "alarm", controller="FANUC")
    
    # Batch validation with filtering
    valid_items = ValidationEnforcer().validate_and_filter(items, "alarm")
"""

from .data_validator import (
    ValidationLevel,
    ValidationResult,
    ValidationIssue,
    ValidationReport,
    AlarmValidator,
    MaterialValidator,
    MachineValidator,
    GenericValidator,
    ValidationEnforcer,
    is_placeholder,
    detect_garbage_patterns,
    validate_alarm_batch,
    validate_material_batch,
    validate_data,
    PLACEHOLDER_PATTERNS,
)

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
