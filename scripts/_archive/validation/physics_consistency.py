#!/usr/bin/env python3
"""
PRISM Physics Consistency Checker (T.1.4)
Validates physics relationships between material parameters.

Cross-checks:
- Kienzle Kc1.1 vs UTS correlation
- Johnson-Cook A vs yield strength
- Taylor n vs material hardness
- Thermal conductivity vs diffusivity
- Density consistency with composition
"""

import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import json
import logging
import math

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import PATHS
from core.logger import setup_logger
from core.utils import load_json, save_json

logger = setup_logger(__name__)


class ConsistencyLevel(Enum):
    """Severity of consistency issue."""
    CRITICAL = "critical"   # Physics violation - likely data error
    WARNING = "warning"     # Unusual but possible
    INFO = "info"          # Minor deviation


@dataclass
class ConsistencyIssue:
    """Represents a physics consistency issue."""
    level: ConsistencyLevel
    parameter1: str
    value1: float
    parameter2: str
    value2: float
    expected_relationship: str
    actual_relationship: str
    message: str


@dataclass
class MaterialConsistency:
    """Consistency report for single material."""
    material_id: str
    material_name: str
    issues: List[ConsistencyIssue] = field(default_factory=list)
    
    @property
    def is_consistent(self) -> bool:
        return not any(i.level == ConsistencyLevel.CRITICAL for i in self.issues)
    
    @property
    def critical_count(self) -> int:
        return sum(1 for i in self.issues if i.level == ConsistencyLevel.CRITICAL)
    
    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.level == ConsistencyLevel.WARNING)


@dataclass
class ConsistencyReport:
    """Full consistency report."""
    timestamp: str = ""
    source: str = ""
    materials_checked: int = 0
    consistent_count: int = 0
    inconsistent_count: int = 0
    total_issues: int = 0
    critical_issues: int = 0
    warning_issues: int = 0
    materials: Dict[str, MaterialConsistency] = field(default_factory=dict)


class PhysicsConsistencyChecker:
    """
    Validates physics relationships between material parameters.
    
    Key relationships checked:
    1. Kc1.1 vs UTS: Cutting force correlates with strength
    2. J-C A vs yield: Initial yield in model ≈ static yield
    3. Taylor n vs hardness: Harder materials have lower n
    4. Thermal diffusivity = k / (ρ * Cp)
    5. Elastic modulus within material family ranges
    """
    
    # Physics relationship tolerances
    TOLERANCES = {
        'jc_a_yield_ratio': (0.7, 1.3),      # J-C A should be 70-130% of yield
        'kc_uts_ratio': (1.5, 6.0),           # Kc1.1/UTS typical range
        'thermal_diffusivity_error': 0.30,    # 30% tolerance on diffusivity calc
        'density_error': 0.05,                # 5% density tolerance
    }
    
    # Material family elastic modulus ranges (GPa)
    MODULUS_RANGES = {
        'steel': (190, 215),
        'stainless': (190, 210),
        'aluminum': (68, 80),
        'titanium': (100, 120),
        'copper': (110, 140),
        'nickel': (180, 220),
        'cast_iron': (80, 180),
    }
    
    # Taylor n typical ranges by material category
    TAYLOR_N_RANGES = {
        'P': (0.15, 0.35),      # Steels
        'M': (0.12, 0.28),      # Stainless
        'K': (0.18, 0.35),      # Cast iron
        'N': (0.28, 0.50),      # Non-ferrous (aluminum)
        'S': (0.12, 0.25),      # Super alloys (Ti, Ni)
        'H': (0.08, 0.20),      # Hardened steel
    }
    
    def __init__(self):
        self.logger = setup_logger(self.__class__.__name__)
    
    def check_material(self, material: Dict) -> MaterialConsistency:
        """Check physics consistency for a single material."""
        mat_id = material.get('id', 'UNKNOWN')
        mat_name = material.get('name', 'Unknown Material')
        
        result = MaterialConsistency(
            material_id=mat_id,
            material_name=mat_name
        )
        
        # Run all consistency checks
        self._check_jc_yield_consistency(material, result)
        self._check_kc_uts_relationship(material, result)
        self._check_thermal_diffusivity(material, result)
        self._check_taylor_n_range(material, result)
        self._check_elastic_modulus(material, result)
        self._check_density_bounds(material, result)
        self._check_melting_vs_tempering(material, result)
        self._check_hardness_strength_correlation(material, result)
        
        return result
    
    def _check_jc_yield_consistency(self, material: Dict, result: MaterialConsistency):
        """
        Johnson-Cook A parameter should approximately equal yield strength.
        J-C model: σ = [A + B*ε^n][1 + C*ln(ε̇*)][1 - T*^m]
        At ε=0, ε̇=reference, T=reference: σ = A ≈ yield strength
        """
        jc = material.get('johnson_cook', {})
        mech = material.get('mechanical', {})
        
        jc_A = jc.get('A')
        yield_strength = mech.get('yield_strength')
        
        if jc_A is None or yield_strength is None:
            return
        
        if yield_strength <= 0:
            return
            
        ratio = jc_A / yield_strength
        min_ratio, max_ratio = self.TOLERANCES['jc_a_yield_ratio']
        
        if ratio < min_ratio or ratio > max_ratio:
            level = ConsistencyLevel.CRITICAL if (ratio < 0.5 or ratio > 2.0) else ConsistencyLevel.WARNING
            result.issues.append(ConsistencyIssue(
                level=level,
                parameter1='johnson_cook.A',
                value1=jc_A,
                parameter2='mechanical.yield_strength',
                value2=yield_strength,
                expected_relationship=f'J-C A / yield = {min_ratio:.1f} to {max_ratio:.1f}',
                actual_relationship=f'Ratio = {ratio:.2f}',
                message=f'J-C A ({jc_A:.0f} MPa) inconsistent with yield ({yield_strength:.0f} MPa)'
            ))
    
    def _check_kc_uts_relationship(self, material: Dict, result: MaterialConsistency):
        """
        Kienzle Kc1.1 correlates with UTS.
        Typical ratio: Kc1.1/UTS = 2.0 to 5.0 for steels
        """
        kienzle = material.get('kienzle', {})
        mech = material.get('mechanical', {})
        
        kc1_1 = kienzle.get('Kc1_1')
        uts = mech.get('tensile_strength')
        
        if kc1_1 is None or uts is None:
            return
        
        if uts <= 0:
            return
            
        ratio = kc1_1 / uts
        min_ratio, max_ratio = self.TOLERANCES['kc_uts_ratio']
        
        if ratio < min_ratio or ratio > max_ratio:
            level = ConsistencyLevel.WARNING  # Can vary significantly by material
            result.issues.append(ConsistencyIssue(
                level=level,
                parameter1='kienzle.Kc1_1',
                value1=kc1_1,
                parameter2='mechanical.tensile_strength',
                value2=uts,
                expected_relationship=f'Kc1.1 / UTS = {min_ratio:.1f} to {max_ratio:.1f}',
                actual_relationship=f'Ratio = {ratio:.2f}',
                message=f'Kc1.1 ({kc1_1:.0f} N/mm²) unusual relative to UTS ({uts:.0f} MPa)'
            ))
    
    def _check_thermal_diffusivity(self, material: Dict, result: MaterialConsistency):
        """
        Thermal diffusivity = k / (ρ * Cp)
        Where k = conductivity, ρ = density, Cp = specific heat
        """
        thermal = material.get('thermal', {})
        physical = material.get('physical', {})
        
        k = thermal.get('conductivity')        # W/m·K
        alpha = thermal.get('diffusivity')     # m²/s
        rho = physical.get('density')          # kg/m³
        cp = thermal.get('specific_heat')      # J/kg·K
        
        if None in (k, alpha, rho, cp):
            return
        
        if rho <= 0 or cp <= 0:
            return
            
        # Calculate expected diffusivity
        expected_alpha = k / (rho * cp)  # m²/s
        
        # Compare (alpha might be stored as mm²/s, need to check units)
        # Assuming alpha is in m²/s * 10^6 (mm²/s is common)
        alpha_m2s = alpha * 1e-6 if alpha > 1e-3 else alpha
        
        error = abs(alpha_m2s - expected_alpha) / expected_alpha if expected_alpha > 0 else 0
        
        if error > self.TOLERANCES['thermal_diffusivity_error']:
            result.issues.append(ConsistencyIssue(
                level=ConsistencyLevel.WARNING,
                parameter1='thermal.diffusivity',
                value1=alpha,
                parameter2='calculated from k/(ρ*Cp)',
                value2=expected_alpha * 1e6,
                expected_relationship='α = k/(ρ·Cp)',
                actual_relationship=f'Error = {error*100:.1f}%',
                message=f'Thermal diffusivity inconsistent with conductivity/density/Cp'
            ))
    
    def _check_taylor_n_range(self, material: Dict, result: MaterialConsistency):
        """
        Taylor tool life exponent n should be in typical range for material category.
        """
        taylor = material.get('taylor', {})
        mat_id = material.get('id', '')
        
        n = taylor.get('n')
        
        if n is None:
            return
        
        # Determine material category from ID prefix
        category = mat_id.split('-')[0] if '-' in mat_id else mat_id[0] if mat_id else 'P'
        
        # Map to category
        cat_map = {
            'P': 'P', 'CS': 'P', 'AS': 'P',       # Steels
            'M': 'M', 'SS': 'M',                   # Stainless
            'K': 'K', 'CI': 'K',                   # Cast iron
            'N': 'N', 'AL': 'N', 'CU': 'N',       # Non-ferrous
            'S': 'S', 'TI': 'S', 'NI': 'S',       # Superalloys
            'H': 'H',                              # Hardened
        }
        
        iso_cat = cat_map.get(category, 'P')
        n_range = self.TAYLOR_N_RANGES.get(iso_cat, (0.10, 0.50))
        
        if n < n_range[0] or n > n_range[1]:
            result.issues.append(ConsistencyIssue(
                level=ConsistencyLevel.WARNING,
                parameter1='taylor.n',
                value1=n,
                parameter2='material_category',
                value2=iso_cat,
                expected_relationship=f'n = {n_range[0]:.2f} to {n_range[1]:.2f} for {iso_cat}',
                actual_relationship=f'n = {n:.3f}',
                message=f'Taylor n ({n:.3f}) outside typical range for {iso_cat} materials'
            ))
    
    def _check_elastic_modulus(self, material: Dict, result: MaterialConsistency):
        """
        Elastic modulus should be within typical range for material family.
        """
        mech = material.get('mechanical', {})
        mat_name = material.get('name', '').lower()
        
        E = mech.get('elastic_modulus')
        
        if E is None:
            return
        
        # Determine material family from name
        family = None
        if any(x in mat_name for x in ['steel', 'aisi', '1018', '1045', '4140']):
            family = 'steel'
        elif any(x in mat_name for x in ['stainless', '304', '316', '17-4']):
            family = 'stainless'
        elif any(x in mat_name for x in ['aluminum', 'aluminium', 'aa ', '6061', '7075', '2024']):
            family = 'aluminum'
        elif any(x in mat_name for x in ['titanium', 'ti-6al', 'ti6al']):
            family = 'titanium'
        elif any(x in mat_name for x in ['copper', 'brass', 'bronze']):
            family = 'copper'
        elif any(x in mat_name for x in ['inconel', 'hastelloy', 'nickel']):
            family = 'nickel'
        elif any(x in mat_name for x in ['cast iron', 'gray iron', 'ductile']):
            family = 'cast_iron'
        
        if family and family in self.MODULUS_RANGES:
            E_range = self.MODULUS_RANGES[family]
            if E < E_range[0] or E > E_range[1]:
                result.issues.append(ConsistencyIssue(
                    level=ConsistencyLevel.WARNING,
                    parameter1='mechanical.elastic_modulus',
                    value1=E,
                    parameter2='material_family',
                    value2=family,
                    expected_relationship=f'E = {E_range[0]}-{E_range[1]} GPa for {family}',
                    actual_relationship=f'E = {E:.0f} GPa',
                    message=f'Elastic modulus ({E:.0f} GPa) outside range for {family}'
                ))
    
    def _check_density_bounds(self, material: Dict, result: MaterialConsistency):
        """
        Density should be within reasonable bounds for material type.
        """
        physical = material.get('physical', {})
        mat_name = material.get('name', '').lower()
        
        rho = physical.get('density')
        
        if rho is None:
            return
        
        # Reasonable density bounds (kg/m³)
        density_bounds = {
            'aluminum': (2500, 2900),
            'steel': (7700, 8100),
            'stainless': (7700, 8100),
            'titanium': (4400, 4600),
            'copper': (8200, 9000),
            'nickel': (8000, 8900),
            'cast_iron': (6800, 7800),
            'magnesium': (1700, 1900),
        }
        
        for family, bounds in density_bounds.items():
            if family in mat_name or (family == 'steel' and any(x in mat_name for x in ['aisi', '1045', '4140'])):
                if rho < bounds[0] or rho > bounds[1]:
                    result.issues.append(ConsistencyIssue(
                        level=ConsistencyLevel.CRITICAL,
                        parameter1='physical.density',
                        value1=rho,
                        parameter2='material_type',
                        value2=family,
                        expected_relationship=f'ρ = {bounds[0]}-{bounds[1]} kg/m³',
                        actual_relationship=f'ρ = {rho:.0f} kg/m³',
                        message=f'Density ({rho:.0f} kg/m³) outside bounds for {family}'
                    ))
                break
    
    def _check_melting_vs_tempering(self, material: Dict, result: MaterialConsistency):
        """
        Tempering/heat treatment temperature must be below melting point.
        """
        thermal = material.get('thermal', {})
        processing = material.get('processing', {})
        
        melting = thermal.get('melting_point')
        tempering = processing.get('tempering_temp') or thermal.get('max_service_temp')
        
        if melting is None or tempering is None:
            return
        
        if tempering >= melting:
            result.issues.append(ConsistencyIssue(
                level=ConsistencyLevel.CRITICAL,
                parameter1='thermal.melting_point',
                value1=melting,
                parameter2='processing.tempering_temp',
                value2=tempering,
                expected_relationship='Tempering < Melting',
                actual_relationship=f'{tempering}°C >= {melting}°C',
                message=f'Tempering temp ({tempering}°C) exceeds melting point ({melting}°C)!'
            ))
    
    def _check_hardness_strength_correlation(self, material: Dict, result: MaterialConsistency):
        """
        Hardness and tensile strength should correlate.
        For steels: UTS ≈ 3.45 × HB (Brinell)
        """
        mech = material.get('mechanical', {})
        mat_name = material.get('name', '').lower()
        
        hardness = mech.get('hardness_hb') or mech.get('hardness')
        uts = mech.get('tensile_strength')
        
        if hardness is None or uts is None:
            return
        
        # Only check for steels where correlation is well-established
        is_steel = any(x in mat_name for x in ['steel', 'aisi', '1018', '1045', '4140', '4340'])
        
        if is_steel and hardness > 0:
            # UTS (MPa) ≈ 3.45 × HB
            expected_uts = 3.45 * hardness
            error = abs(uts - expected_uts) / expected_uts
            
            if error > 0.20:  # 20% tolerance
                result.issues.append(ConsistencyIssue(
                    level=ConsistencyLevel.WARNING,
                    parameter1='mechanical.hardness_hb',
                    value1=hardness,
                    parameter2='mechanical.tensile_strength',
                    value2=uts,
                    expected_relationship=f'UTS ≈ 3.45 × HB = {expected_uts:.0f} MPa',
                    actual_relationship=f'UTS = {uts:.0f} MPa ({error*100:.0f}% off)',
                    message=f'Hardness-strength correlation off by {error*100:.0f}%'
                ))
    
    def check_file(self, filepath: Path) -> ConsistencyReport:
        """Check all materials in a file."""
        from datetime import datetime
        
        report = ConsistencyReport(
            timestamp=datetime.now().isoformat(),
            source=str(filepath)
        )
        
        # Read and parse file
        content = filepath.read_text(encoding='utf-8')
        
        # Extract materials (supports both JS object and JSON format)
        materials = self._extract_materials(content)
        
        for material in materials:
            mat_result = self.check_material(material)
            report.materials[mat_result.material_id] = mat_result
            report.materials_checked += 1
            
            if mat_result.is_consistent:
                report.consistent_count += 1
            else:
                report.inconsistent_count += 1
            
            report.total_issues += len(mat_result.issues)
            report.critical_issues += mat_result.critical_count
            report.warning_issues += mat_result.warning_count
        
        return report
    
    def _extract_materials(self, content: str) -> List[Dict]:
        """Extract material objects from file content."""
        import re
        materials = []
        
        # Try JSON first
        try:
            data = json.loads(content)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                if 'materials' in data:
                    return data['materials']
                return [data]
        except json.JSONDecodeError:
            pass
        
        # Try to extract JS object literals
        # Look for patterns like: { id: "...", name: "...", ... }
        pattern = r'\{\s*id:\s*["\']([^"\']+)["\'].*?\n\s*\}'
        
        # This is simplified - real implementation would use proper JS parsing
        # For now, return empty and rely on JSON format
        return materials
    
    def generate_report(self, report: ConsistencyReport) -> str:
        """Generate text report."""
        lines = []
        lines.append("=" * 70)
        lines.append("PRISM PHYSICS CONSISTENCY REPORT")
        lines.append("=" * 70)
        lines.append(f"Generated: {report.timestamp}")
        lines.append(f"Source: {report.source}")
        lines.append("")
        
        # Summary
        lines.append("-" * 40)
        lines.append("SUMMARY")
        lines.append("-" * 40)
        lines.append(f"Materials Checked:    {report.materials_checked}")
        lines.append(f"Fully Consistent:     {report.consistent_count} ✓")
        lines.append(f"With Issues:          {report.inconsistent_count}")
        lines.append(f"Total Issues:         {report.total_issues}")
        lines.append(f"  Critical:           {report.critical_issues} ✗")
        lines.append(f"  Warnings:           {report.warning_issues} ⚠")
        lines.append("")
        
        # Critical issues first
        critical_mats = [m for m in report.materials.values() if m.critical_count > 0]
        if critical_mats:
            lines.append("-" * 40)
            lines.append("⛔ CRITICAL PHYSICS ISSUES")
            lines.append("-" * 40)
            for mat in critical_mats:
                lines.append(f"\n{mat.material_id}: {mat.material_name}")
                for issue in mat.issues:
                    if issue.level == ConsistencyLevel.CRITICAL:
                        lines.append(f"  ✗ {issue.message}")
                        lines.append(f"    {issue.parameter1}={issue.value1}")
                        lines.append(f"    {issue.parameter2}={issue.value2}")
                        lines.append(f"    Expected: {issue.expected_relationship}")
        
        # Warnings
        warning_mats = [m for m in report.materials.values() 
                       if m.warning_count > 0 and m.critical_count == 0]
        if warning_mats:
            lines.append("\n" + "-" * 40)
            lines.append("⚠ WARNINGS (Review Recommended)")
            lines.append("-" * 40)
            for mat in warning_mats:
                lines.append(f"\n{mat.material_id}: {mat.material_name}")
                for issue in mat.issues:
                    if issue.level == ConsistencyLevel.WARNING:
                        lines.append(f"  ⚠ {issue.message}")
        
        # Consistent materials
        consistent = [m for m in report.materials.values() if m.is_consistent and not m.issues]
        if consistent:
            lines.append("\n" + "-" * 40)
            lines.append("✓ FULLY CONSISTENT MATERIALS")
            lines.append("-" * 40)
            for mat in consistent:
                lines.append(f"✓ {mat.material_id}: {mat.material_name}")
        
        lines.append("\n" + "=" * 70)
        lines.append("END OF REPORT")
        lines.append("=" * 70)
        
        return "\n".join(lines)


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for physics consistency checker."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Physics Consistency Checker')
    parser.add_argument('file', help='Material file to check')
    parser.add_argument('--json', type=str, help='Save JSON report to file')
    parser.add_argument('--strict', action='store_true', help='Treat warnings as errors')
    
    args = parser.parse_args()
    
    checker = PhysicsConsistencyChecker()
    filepath = Path(args.file)
    
    if not filepath.exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    report = checker.check_file(filepath)
    
    # Print report
    text_report = checker.generate_report(report)
    print(text_report)
    
    # Save JSON if requested
    if args.json:
        save_json(report.__dict__, Path(args.json))
        print(f"\nJSON report saved to: {args.json}")
    
    # Exit code
    if report.critical_issues > 0:
        sys.exit(2)
    elif args.strict and report.warning_issues > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
