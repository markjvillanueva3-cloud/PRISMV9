# PRISM Automation Toolkit - Validation Module
# Version: 1.0.1
# Created: 2026-01-23
# Updated: 2026-01-23

from .material_schema import (
    MATERIAL_SCHEMA,
    ParameterDef,
    DataType,
    Requirement,
    ISOGroup,
    get_schema,
    get_required_parameters,
    get_recommended_parameters,
    get_parameters_by_category,
    get_categories,
    count_parameters
)

from .material_validator import MaterialValidator, ValidationResult
from .batch_validator import BatchValidator, BatchValidationResult
from .physics_consistency import PhysicsConsistencyChecker, MaterialConsistency, ConsistencyLevel

__all__ = [
    # Schema
    'MATERIAL_SCHEMA',
    'ParameterDef',
    'DataType', 
    'Requirement',
    'ISOGroup',
    'get_schema',
    'get_required_parameters',
    'get_recommended_parameters',
    'get_parameters_by_category',
    'get_categories',
    'count_parameters',
    # Validators
    'MaterialValidator',
    'ValidationResult',
    'BatchValidator',
    'BatchValidationResult',
    # Physics Consistency
    'PhysicsConsistencyChecker',
    'MaterialConsistency',
    'ConsistencyLevel',
]
