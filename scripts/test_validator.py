# PRISM Automation Toolkit - Test Validator on Existing Materials
# Created: 2026-01-23
#
# Tests the batch validator against our existing 50 carbon steel materials

import sys
import json
import re
from pathlib import Path
from datetime import datetime

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent))

from core.config import PATHS
from core.logger import setup_logger

# =============================================================================
# PRISM-SPECIFIC JS PARSER
# =============================================================================

def parse_prism_material_file(filepath: Path) -> dict:
    """
    Parse a PRISM material JS file.
    Our format: const XXXX = { metadata: {...}, materials: { 'ID': {...}, ... } }
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results = {
        'filepath': str(filepath),
        'filename': filepath.name,
        'materials': [],
        'errors': []
    }
    
    # Find all material ID blocks
    # Pattern: 'P-XX-NNN': {
    material_pattern = r"'([A-Z]-[A-Z]{2}-\d{3})':\s*\{"
    
    for match in re.finditer(material_pattern, content):
        material_id = match.group(1)
        start_pos = match.end() - 1  # Start at the {
        
        # Extract the material object
        try:
            obj_str = extract_nested_object(content, start_pos)
            if obj_str:
                # Convert to a flat structure for validation
                flat_material = flatten_prism_material(obj_str, material_id)
                if flat_material:
                    results['materials'].append(flat_material)
        except Exception as e:
            results['errors'].append(f"Failed to parse {material_id}: {e}")
    
    return results


def extract_nested_object(content: str, start_pos: int) -> str:
    """Extract a complete JS object including all nested objects."""
    depth = 0
    in_string = False
    string_char = None
    
    for i, char in enumerate(content[start_pos:], start_pos):
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
                return content[start_pos:i+1]
    
    return ""


def flatten_prism_material(obj_str: str, material_id: str) -> dict:
    """
    Flatten our nested PRISM material structure to match the schema.
    Extracts key values from nested sections.
    """
    flat = {'id': material_id}
    
    # Extract identification section
    id_match = re.search(r"identification:\s*\{([^}]+)\}", obj_str)
    if id_match:
        id_content = id_match.group(1)
        flat['name'] = extract_value(id_content, 'name')
        flat['iso_group'] = extract_value(id_content, 'isoGroup')
        flat['category'] = extract_value(id_content, 'materialType')
        flat['condition'] = extract_value(id_content, 'condition')
    
    # Extract physical properties
    phys_match = re.search(r"physicalProperties:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if phys_match:
        phys_content = phys_match.group(1)
        flat['density'] = extract_numeric(phys_content, 'density')
        flat['specific_heat'] = extract_first_numeric(phys_content, 'specificHeat', 'cp')
        flat['thermal_conductivity'] = extract_first_numeric(phys_content, 'thermalConductivity', 'k')
        flat['thermal_expansion'] = extract_first_numeric(phys_content, 'thermalExpansion', 'alpha')
        flat['thermal_diffusivity'] = extract_numeric(phys_content, 'thermalDiffusivity')
        flat['elastic_modulus'] = extract_numeric(phys_content, 'elasticModulus')
        flat['shear_modulus'] = extract_numeric(phys_content, 'shearModulus')
        flat['poissons_ratio'] = extract_numeric(phys_content, 'poissonsRatio')
        flat['hardness_brinell'] = extract_numeric(phys_content, 'hardness')
        
        # Melting point
        melt_match = re.search(r'solidus:\s*(\d+)', phys_content)
        if melt_match:
            flat['melting_point'] = float(melt_match.group(1))
    
    # Extract mechanical properties
    mech_match = re.search(r"mechanicalProperties:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if mech_match:
        mech_content = mech_match.group(1)
        flat['tensile_strength'] = extract_numeric(mech_content, 'tensileStrength')
        flat['yield_strength'] = extract_numeric(mech_content, 'yieldStrength')
        flat['elongation'] = extract_numeric(mech_content, 'elongation')
        flat['reduction_of_area'] = extract_numeric(mech_content, 'reductionOfArea')
    
    # Extract cutting force parameters
    cutting_match = re.search(r"cuttingForceParameters:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if cutting_match:
        cutting_content = cutting_match.group(1)
        flat['Kc1_1'] = extract_numeric(cutting_content, 'Kc1_1')
        flat['mc'] = extract_numeric(cutting_content, 'mc')
    
    # Extract Johnson-Cook parameters
    jc_match = re.search(r"johnsonCook:\s*\{([\s\S]*?)\}", obj_str)
    if jc_match:
        jc_content = jc_match.group(1)
        flat['JC_A'] = extract_numeric(jc_content, 'A')
        flat['JC_B'] = extract_numeric(jc_content, 'B')
        flat['JC_n'] = extract_numeric(jc_content, 'n')
        flat['JC_C'] = extract_numeric(jc_content, 'C')
        flat['JC_m'] = extract_numeric(jc_content, 'm')
    
    # Extract Taylor parameters
    taylor_match = re.search(r"toolLife:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if taylor_match:
        taylor_content = taylor_match.group(1)
        flat['taylor_n'] = extract_numeric(taylor_content, 'taylorExponent|taylorN')
        flat['taylor_C_carbide'] = extract_numeric(taylor_content, 'carbideC|taylorC_carbide')
        flat['taylor_C_coated'] = extract_numeric(taylor_content, 'coatedC|taylorC_coated')
    
    # Extract machinability
    mach_match = re.search(r"machinability:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if mach_match:
        mach_content = mach_match.group(1)
        flat['machinability_rating'] = extract_numeric(mach_content, 'rating')
        flat['machinability_class'] = extract_value(mach_content, 'classification')
    
    # Extract recommended speeds
    rec_match = re.search(r"recommendedParameters:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if rec_match:
        rec_content = rec_match.group(1)
        # Milling roughing
        mill_rough = extract_nested_numeric(rec_content, 'milling.*?roughing', 'speed')
        if mill_rough:
            flat['rec_speed_milling_rough'] = mill_rough
        mill_finish = extract_nested_numeric(rec_content, 'milling.*?finishing', 'speed')
        if mill_finish:
            flat['rec_speed_milling_finish'] = mill_finish
    
    # Extract chip formation
    chip_match = re.search(r"chipFormation:\s*\{([\s\S]*?)\n\s{6}\}", obj_str)
    if chip_match:
        chip_content = chip_match.group(1)
        flat['chip_type'] = extract_value(chip_content, 'chipType')
        flat['bue_tendency'] = extract_value(chip_content, 'bueTendency')
    
    # Metadata
    flat['data_source'] = 'PRISM Database'
    flat['data_quality'] = 'verified'
    flat['confidence_level'] = 0.90
    
    return flat


def extract_value(content: str, key: str) -> str:
    """Extract a string value from JS object content."""
    pattern = rf"{key}:\s*['\"]([^'\"]+)['\"]"
    match = re.search(pattern, content)
    return match.group(1) if match else ""


def extract_numeric(content: str, key: str) -> float:
    """Extract a numeric value from JS object content."""
    # Try value: X pattern first
    pattern = rf"{key}:\s*\{{\s*value:\s*([\d.]+)"
    match = re.search(pattern, content)
    if match:
        return float(match.group(1))
    
    # Try direct key: value
    pattern = rf"{key}:\s*([\d.]+)"
    match = re.search(pattern, content)
    if match:
        return float(match.group(1))
    
    return None


def extract_first_numeric(content: str, section: str, key: str) -> float:
    """Extract first numeric from a nested values array."""
    pattern = rf"{section}:\s*\{{[\s\S]*?{key}:\s*([\d.]+)"
    match = re.search(pattern, content)
    return float(match.group(1)) if match else None


def extract_nested_numeric(content: str, section_pattern: str, key: str) -> float:
    """Extract numeric from a deeply nested section."""
    pattern = rf"{section_pattern}[\s\S]*?{key}:\s*([\d.]+)"
    match = re.search(pattern, content, re.IGNORECASE)
    return float(match.group(1)) if match else None


# =============================================================================
# MAIN TEST FUNCTION
# =============================================================================

def run_validation_test():
    """Run validation on all existing carbon steel materials."""
    print("=" * 70)
    print("PRISM MATERIAL VALIDATION TEST")
    print("Testing on 50 existing carbon steel materials")
    print("=" * 70)
    print()
    
    # Import validator
    from validation.material_validator import MaterialValidator
    
    materials_dir = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials\P_STEELS")
    
    if not materials_dir.exists():
        print(f"ERROR: Materials directory not found: {materials_dir}")
        return
    
    validator = MaterialValidator(strict=False)  # Don't warn on recommended params
    
    total_materials = 0
    passed = 0
    failed = 0
    warnings = 0
    
    # Find all JS files
    js_files = sorted(materials_dir.glob("carbon_steels_*.js"))
    
    print(f"Found {len(js_files)} material files\n")
    
    for filepath in js_files:
        print(f"Processing: {filepath.name}")
        
        parsed = parse_prism_material_file(filepath)
        
        if parsed['errors']:
            for err in parsed['errors']:
                print(f"  ⚠ Parse error: {err}")
        
        print(f"  Materials found: {len(parsed['materials'])}")
        
        for material in parsed['materials']:
            total_materials += 1
            result = validator.validate_material(material)
            
            if result.overall_status == 'PASS':
                passed += 1
                status = "✓"
            elif result.overall_status == 'FAIL':
                failed += 1
                status = "✗"
                # Show what failed
                for err in result.errors[:2]:  # First 2 errors
                    print(f"    {result.material_id}: {err}")
            else:
                warnings += 1
                status = "⚠"
        
        print()
    
    # Summary
    print("=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)
    print(f"Total Materials:  {total_materials}")
    print(f"Passed:           {passed} ✓")
    print(f"Failed:           {failed} ✗")
    print(f"Warnings:         {warnings} ⚠")
    
    if total_materials > 0:
        pass_rate = (passed / total_materials) * 100
        print(f"Pass Rate:        {pass_rate:.1f}%")
    
    overall = "PASS" if failed == 0 else "FAIL"
    print(f"\nOverall Status:   {overall}")
    print("=" * 70)
    
    return failed == 0


if __name__ == "__main__":
    success = run_validation_test()
    sys.exit(0 if success else 1)
