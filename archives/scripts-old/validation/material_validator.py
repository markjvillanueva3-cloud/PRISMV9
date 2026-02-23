# PRISM Automation Toolkit - Material Validator
# Version: 1.0.0
# Created: 2026-01-23
#
# Validates materials against the 127-parameter schema with:
# - Completeness checking (all required parameters present)
# - Range validation (values within acceptable limits)
# - Physics consistency (Kc1.1 vs UTS, J-C A vs yield, etc.)
# - Cross-field validation (interdependent parameters)

import sys
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import VALIDATION_THRESHOLDS, MATERIAL_CONSTANTS
from core.logger import ValidationLogger, setup_logger
from core.utils import load_json, deep_get
from validation.material_schema import (
    MATERIAL_SCHEMA, 
    Requirement, 
    get_required_parameters,
    get_recommended_parameters,
    count_parameters
)


# =============================================================================
# VALIDATION RESULT CLASSES
# =============================================================================

@dataclass
class ParameterResult:
    """Result of validating a single parameter."""
    name: str
    status: str  # 'pass', 'fail', 'warn', 'skip'
    message: str
    value: Any = None
    expected: str = ""


@dataclass
class PhysicsCheckResult:
    """Result of a physics consistency check."""
    name: str
    passed: bool
    message: str
    actual_value: float = 0
    expected_range: str = ""


@dataclass
class MaterialValidationResult:
    """Complete validation result for a material."""
    material_id: str
    material_name: str
    overall_status: str  # 'PASS', 'FAIL', 'WARN'
    total_parameters: int = 0
    parameters_present: int = 0
    parameters_missing: int = 0
    parameters_invalid: int = 0
    required_present: int = 0
    required_missing: int = 0
    warnings: int = 0
    parameter_results: List[ParameterResult] = field(default_factory=list)
    physics_results: List[PhysicsCheckResult] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    
    @property
    def completeness_pct(self) -> float:
        if self.total_parameters == 0:
            return 0
        return (self.parameters_present / self.total_parameters) * 100
    
    @property
    def required_completeness_pct(self) -> float:
        total_required = self.required_present + self.required_missing
        if total_required == 0:
            return 100
        return (self.required_present / total_required) * 100


# =============================================================================
# PHYSICS CONSISTENCY CHECKS
# =============================================================================

class PhysicsValidator:
    """Validates physics relationships between material parameters."""
    
    def __init__(self, thresholds: Dict = None):
        self.thresholds = thresholds or VALIDATION_THRESHOLDS
    
    def check_kc_uts_relationship(self, material: Dict) -> PhysicsCheckResult:
        """
        Check Kc1.1 vs UTS relationship.
        Kc1.1 should typically be 2.5-6.0 × UTS for steels.
        """
        kc = deep_get(material, 'Kc1_1') or deep_get(material, 'cutting_force.Kc1_1')
        uts = deep_get(material, 'tensile_strength') or deep_get(material, 'mechanical.tensile_strength')
        
        if kc is None or uts is None:
            return PhysicsCheckResult(
                name="Kc1.1 vs UTS",
                passed=True,
                message="Skipped (missing data)",
                actual_value=0,
                expected_range="N/A"
            )
        
        if uts == 0:
            return PhysicsCheckResult(
                name="Kc1.1 vs UTS",
                passed=False,
                message="UTS is zero - invalid",
                actual_value=0,
                expected_range="UTS > 0"
            )
        
        ratio = kc / uts
        min_ratio = self.thresholds['kc11_uts_ratio_min']
        max_ratio = self.thresholds['kc11_uts_ratio_max']
        
        passed = min_ratio <= ratio <= max_ratio
        
        return PhysicsCheckResult(
            name="Kc1.1 vs UTS",
            passed=passed,
            message=f"Kc1.1/UTS = {ratio:.2f}" + ("" if passed else f" (expected {min_ratio}-{max_ratio})"),
            actual_value=ratio,
            expected_range=f"{min_ratio}-{max_ratio}"
        )
    
    def check_jc_yield_relationship(self, material: Dict) -> PhysicsCheckResult:
        """
        Check Johnson-Cook A parameter vs yield strength.
        J-C A should be approximately equal to yield (0.85-1.3×).
        """
        jc_a = deep_get(material, 'JC_A') or deep_get(material, 'constitutive.JC_A')
        yield_str = deep_get(material, 'yield_strength') or deep_get(material, 'mechanical.yield_strength')
        
        if jc_a is None or yield_str is None:
            return PhysicsCheckResult(
                name="J-C A vs Yield",
                passed=True,
                message="Skipped (missing data)",
                actual_value=0,
                expected_range="N/A"
            )
        
        if yield_str == 0:
            return PhysicsCheckResult(
                name="J-C A vs Yield",
                passed=False,
                message="Yield strength is zero - invalid",
                actual_value=0,
                expected_range="Yield > 0"
            )
        
        ratio = jc_a / yield_str
        min_ratio = self.thresholds['jc_a_yield_ratio_min']
        max_ratio = self.thresholds['jc_a_yield_ratio_max']
        
        passed = min_ratio <= ratio <= max_ratio
        
        return PhysicsCheckResult(
            name="J-C A vs Yield",
            passed=passed,
            message=f"JC_A/Yield = {ratio:.2f}" + ("" if passed else f" (expected {min_ratio}-{max_ratio})"),
            actual_value=ratio,
            expected_range=f"{min_ratio}-{max_ratio}"
        )
    
    def check_taylor_exponent(self, material: Dict) -> PhysicsCheckResult:
        """
        Check Taylor exponent n is in valid range.
        Typical: HSS 0.08-0.15, Carbide 0.20-0.35, Ceramic 0.30-0.50
        """
        taylor_n = deep_get(material, 'taylor_n') or deep_get(material, 'tool_life.taylor_n')
        
        if taylor_n is None:
            return PhysicsCheckResult(
                name="Taylor n",
                passed=True,
                message="Skipped (missing data)",
                actual_value=0,
                expected_range="N/A"
            )
        
        min_n = self.thresholds['taylor_n_min']
        max_n = self.thresholds['taylor_n_max']
        
        passed = min_n <= taylor_n <= max_n
        
        return PhysicsCheckResult(
            name="Taylor n",
            passed=passed,
            message=f"n = {taylor_n}" + ("" if passed else f" (expected {min_n}-{max_n})"),
            actual_value=taylor_n,
            expected_range=f"{min_n}-{max_n}"
        )
    
    def check_mc_exponent(self, material: Dict) -> PhysicsCheckResult:
        """
        Check Kienzle mc exponent is in valid range.
        Typical: 0.15-0.40 depending on material.
        """
        mc = deep_get(material, 'mc') or deep_get(material, 'cutting_force.mc')
        
        if mc is None:
            return PhysicsCheckResult(
                name="Kienzle mc",
                passed=True,
                message="Skipped (missing data)",
                actual_value=0,
                expected_range="N/A"
            )
        
        # MC range varies by material type
        min_mc = 0.10
        max_mc = 0.45
        
        passed = min_mc <= mc <= max_mc
        
        return PhysicsCheckResult(
            name="Kienzle mc",
            passed=passed,
            message=f"mc = {mc}" + ("" if passed else f" (expected {min_mc}-{max_mc})"),
            actual_value=mc,
            expected_range=f"{min_mc}-{max_mc}"
        )
    
    def check_yield_uts_relationship(self, material: Dict) -> PhysicsCheckResult:
        """
        Check yield strength < UTS.
        This is a fundamental requirement.
        """
        yield_str = deep_get(material, 'yield_strength') or deep_get(material, 'mechanical.yield_strength')
        uts = deep_get(material, 'tensile_strength') or deep_get(material, 'mechanical.tensile_strength')
        
        if yield_str is None or uts is None:
            return PhysicsCheckResult(
                name="Yield vs UTS",
                passed=True,
                message="Skipped (missing data)",
                actual_value=0,
                expected_range="N/A"
            )
        
        passed = yield_str < uts
        ratio = yield_str / uts if uts > 0 else 0
        
        return PhysicsCheckResult(
            name="Yield vs UTS",
            passed=passed,
            message=f"Yield/UTS = {ratio:.2f}" + ("" if passed else " (yield should be < UTS)"),
            actual_value=ratio,
            expected_range="< 1.0"
        )
    
    def check_thermal_consistency(self, material: Dict) -> PhysicsCheckResult:
        """
        Check thermal properties are consistent.
        Thermal diffusivity ≈ k / (ρ × Cp)
        """
        k = deep_get(material, 'thermal_conductivity') or deep_get(material, 'physical.thermal_conductivity')
        rho = deep_get(material, 'density') or deep_get(material, 'physical.density')
        cp = deep_get(material, 'specific_heat') or deep_get(material, 'physical.specific_heat')
        alpha = deep_get(material, 'thermal_diffusivity') or deep_get(material, 'thermal.thermal_diffusivity')
        
        if None in [k, rho, cp, alpha]:
            return PhysicsCheckResult(
                name="Thermal Consistency",
                passed=True,
                message="Skipped (missing data)",
                actual_value=0,
                expected_range="N/A"
            )
        
        # Calculate expected diffusivity (convert units)
        # k in W/(m·K), rho in kg/m³, cp in J/(kg·K)
        # alpha should be in mm²/s
        expected_alpha = (k / (rho * cp)) * 1e6  # Convert to mm²/s
        
        # Allow 30% tolerance
        ratio = alpha / expected_alpha if expected_alpha > 0 else 0
        passed = 0.7 <= ratio <= 1.3
        
        return PhysicsCheckResult(
            name="Thermal Consistency",
            passed=passed,
            message=f"α ratio = {ratio:.2f}" + ("" if passed else " (expected 0.7-1.3)"),
            actual_value=ratio,
            expected_range="0.7-1.3"
        )
    
    def run_all_checks(self, material: Dict) -> List[PhysicsCheckResult]:
        """Run all physics consistency checks."""
        return [
            self.check_kc_uts_relationship(material),
            self.check_jc_yield_relationship(material),
            self.check_taylor_exponent(material),
            self.check_mc_exponent(material),
            self.check_yield_uts_relationship(material),
            self.check_thermal_consistency(material),
        ]


# =============================================================================
# MAIN VALIDATOR CLASS
# =============================================================================

class MaterialValidator:
    """
    Comprehensive material validator with schema checking and physics validation.
    """
    
    def __init__(self, strict: bool = True):
        """
        Initialize validator.
        
        Args:
            strict: If True, recommended parameters also trigger warnings
        """
        self.strict = strict
        self.schema = MATERIAL_SCHEMA
        self.physics = PhysicsValidator()
        self.logger = None
    
    def _flatten_material(self, material: Dict) -> Dict:
        """
        Flatten nested material structure to single-level dict.
        Handles both flat and nested (categorized) material formats.
        """
        flat = {}
        
        for key, value in material.items():
            if isinstance(value, dict) and key in ['identification', 'composition', 
                'physical', 'mechanical', 'cutting_force', 'constitutive', 
                'tool_life', 'chip_formation', 'tribology', 'thermal',
                'surface_integrity', 'machinability', 'recommended', 'metadata']:
                # This is a category - flatten it
                for subkey, subvalue in value.items():
                    flat[subkey] = subvalue
            else:
                flat[key] = value
        
        return flat
    
    def validate_parameter(self, name: str, value: Any) -> ParameterResult:
        """Validate a single parameter against the schema."""
        if name not in self.schema:
            return ParameterResult(
                name=name,
                status='skip',
                message='Not in schema (custom parameter)',
                value=value
            )
        
        param_def = self.schema[name]
        is_valid, error_msg = param_def.validate(value)
        
        if not is_valid:
            return ParameterResult(
                name=name,
                status='fail',
                message=error_msg,
                value=value,
                expected=f"{param_def.min_value}-{param_def.max_value}" if param_def.min_value else ""
            )
        
        return ParameterResult(
            name=name,
            status='pass',
            message='Valid',
            value=value
        )
    
    def validate_material(self, material: Dict, material_id: str = None) -> MaterialValidationResult:
        """
        Validate a complete material against the schema.
        
        Args:
            material: Material data (flat or nested dict)
            material_id: Override material ID for logging
        
        Returns:
            MaterialValidationResult with detailed results
        """
        # Flatten if needed
        flat = self._flatten_material(material)
        
        # Get ID
        mat_id = material_id or flat.get('id', 'UNKNOWN')
        mat_name = flat.get('name', 'Unknown Material')
        
        result = MaterialValidationResult(
            material_id=mat_id,
            material_name=mat_name,
            overall_status='PASS',
            total_parameters=len(self.schema)
        )
        
        required_params = get_required_parameters()
        recommended_params = get_recommended_parameters()
        
        # Check each parameter in schema
        for param_name, param_def in self.schema.items():
            value = flat.get(param_name)
            
            if value is None:
                # Missing parameter
                if param_def.requirement == Requirement.REQUIRED:
                    result.required_missing += 1
                    result.parameters_missing += 1
                    result.parameter_results.append(ParameterResult(
                        name=param_name,
                        status='fail',
                        message=f'Required parameter missing',
                        expected=f"Type: {param_def.data_type.value}"
                    ))
                elif param_def.requirement == Requirement.RECOMMENDED and self.strict:
                    result.warnings += 1
                    result.parameters_missing += 1
                    result.parameter_results.append(ParameterResult(
                        name=param_name,
                        status='warn',
                        message=f'Recommended parameter missing'
                    ))
                else:
                    # Optional - just skip
                    result.parameters_missing += 1
            else:
                # Parameter present - validate it
                param_result = self.validate_parameter(param_name, value)
                result.parameter_results.append(param_result)
                
                if param_result.status == 'pass':
                    result.parameters_present += 1
                    if param_name in required_params:
                        result.required_present += 1
                elif param_result.status == 'fail':
                    result.parameters_invalid += 1
                    if param_name in required_params:
                        result.required_missing += 1
        
        # Run physics checks
        result.physics_results = self.physics.run_all_checks(flat)
        
        # Count physics failures
        physics_failures = sum(1 for r in result.physics_results if not r.passed and 'Skipped' not in r.message)
        
        # Determine overall status
        if result.required_missing > 0 or result.parameters_invalid > 0 or physics_failures > 0:
            result.overall_status = 'FAIL'
            if result.required_missing > 0:
                result.errors.append(f"{result.required_missing} required parameters missing")
            if result.parameters_invalid > 0:
                result.errors.append(f"{result.parameters_invalid} parameters out of range")
            if physics_failures > 0:
                result.errors.append(f"{physics_failures} physics consistency checks failed")
        elif result.warnings > 0:
            result.overall_status = 'WARN'
        
        return result
    
    def print_result(self, result: MaterialValidationResult, verbose: bool = False):
        """Print validation result to console."""
        status_symbol = {
            'PASS': '✓',
            'FAIL': '✗',
            'WARN': '⚠'
        }
        
        print(f"\n{'='*60}")
        print(f"Material: {result.material_id} - {result.material_name}")
        print(f"{'='*60}")
        print(f"Status: {status_symbol.get(result.overall_status, '?')} {result.overall_status}")
        print(f"\nCompleteness: {result.completeness_pct:.1f}% ({result.parameters_present}/{result.total_parameters})")
        print(f"Required: {result.required_completeness_pct:.1f}% ({result.required_present}/{result.required_present + result.required_missing})")
        
        if result.errors:
            print(f"\nErrors:")
            for err in result.errors:
                print(f"  ✗ {err}")
        
        if result.warnings > 0:
            print(f"\nWarnings: {result.warnings}")
        
        # Physics check summary
        print(f"\nPhysics Checks:")
        for check in result.physics_results:
            symbol = '✓' if check.passed else '✗' if 'Skipped' not in check.message else '○'
            print(f"  {symbol} {check.name}: {check.message}")
        
        if verbose:
            # Show all parameter results
            print(f"\n{'-'*60}")
            print("Parameter Details:")
            for param in result.parameter_results:
                if param.status != 'pass':
                    symbol = '✗' if param.status == 'fail' else '⚠' if param.status == 'warn' else '○'
                    print(f"  {symbol} {param.name}: {param.message}")


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Command-line interface for material validation."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Material Validator')
    parser.add_argument('input', help='Material JSON file or directory')
    parser.add_argument('-v', '--verbose', action='store_true', help='Show detailed output')
    parser.add_argument('--strict', action='store_true', help='Warn on missing recommended params')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    validator = MaterialValidator(strict=args.strict)
    input_path = Path(args.input)
    
    if input_path.is_file():
        # Single file
        material = load_json(input_path)
        result = validator.validate_material(material)
        
        if args.json:
            # JSON output
            print(json.dumps({
                'material_id': result.material_id,
                'status': result.overall_status,
                'completeness': result.completeness_pct,
                'errors': result.errors
            }, indent=2))
        else:
            validator.print_result(result, args.verbose)
    else:
        print(f"Error: {input_path} not found")
        sys.exit(1)


if __name__ == "__main__":
    main()
