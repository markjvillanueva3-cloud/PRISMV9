# PRISM Automation Toolkit - Material Schema Definition
# Version: 1.0.0
# Created: 2026-01-23
#
# This file defines the canonical 127-parameter schema for PRISM materials.
# All material validation is performed against this schema.

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

# =============================================================================
# ENUMS
# =============================================================================

class DataType(Enum):
    """Data types for material parameters."""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class Requirement(Enum):
    """Parameter requirement levels."""
    REQUIRED = "required"      # Must be present, validation fails without it
    RECOMMENDED = "recommended"  # Should be present, warning if missing
    OPTIONAL = "optional"      # Nice to have, no warning if missing


class ISOGroup(Enum):
    """ISO 513 material groups."""
    P = "Steel"
    M = "Stainless Steel"
    K = "Cast Iron"
    N = "Non-ferrous"
    S = "Superalloys/Titanium"
    H = "Hardened Steel"


# =============================================================================
# PARAMETER DEFINITION
# =============================================================================

@dataclass
class ParameterDef:
    """Definition of a single material parameter."""
    name: str                    # Parameter name (e.g., 'yield_strength')
    data_type: DataType          # Expected data type
    unit: str                    # Unit of measurement
    requirement: Requirement     # Required, recommended, or optional
    min_value: Optional[float]   # Minimum valid value (if numeric)
    max_value: Optional[float]   # Maximum valid value (if numeric)
    description: str             # Human-readable description
    category: str                # Category grouping
    applies_to: List[str]        # ISO groups this applies to (empty = all)
    
    def validate(self, value: Any) -> Tuple[bool, str]:
        """
        Validate a value against this parameter definition.
        Returns (is_valid, error_message).
        """
        # Check for None/missing
        if value is None:
            if self.requirement == Requirement.REQUIRED:
                return False, f"Required parameter '{self.name}' is missing"
            return True, ""
        
        # Type checking
        if self.data_type == DataType.NUMBER:
            if not isinstance(value, (int, float)):
                return False, f"'{self.name}' should be numeric, got {type(value).__name__}"
            
            # Range checking
            if self.min_value is not None and value < self.min_value:
                return False, f"'{self.name}' = {value} below minimum {self.min_value}"
            if self.max_value is not None and value > self.max_value:
                return False, f"'{self.name}' = {value} above maximum {self.max_value}"
        
        elif self.data_type == DataType.INTEGER:
            if not isinstance(value, int):
                return False, f"'{self.name}' should be integer, got {type(value).__name__}"
        
        elif self.data_type == DataType.STRING:
            if not isinstance(value, str):
                return False, f"'{self.name}' should be string, got {type(value).__name__}"
        
        elif self.data_type == DataType.BOOLEAN:
            if not isinstance(value, bool):
                return False, f"'{self.name}' should be boolean, got {type(value).__name__}"
        
        elif self.data_type == DataType.ARRAY:
            if not isinstance(value, list):
                return False, f"'{self.name}' should be array, got {type(value).__name__}"
        
        elif self.data_type == DataType.OBJECT:
            if not isinstance(value, dict):
                return False, f"'{self.name}' should be object, got {type(value).__name__}"
        
        return True, ""


# =============================================================================
# COMPLETE 127-PARAMETER SCHEMA
# =============================================================================

MATERIAL_SCHEMA: Dict[str, ParameterDef] = {}

# -----------------------------------------------------------------------------
# CATEGORY 1: IDENTIFICATION (5 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['id'] = ParameterDef(
    name='id',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Unique material identifier (e.g., P-CS-001)',
    category='identification',
    applies_to=[]
)

MATERIAL_SCHEMA['name'] = ParameterDef(
    name='name',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Material name (e.g., AISI 1018 Cold Drawn)',
    category='identification',
    applies_to=[]
)

MATERIAL_SCHEMA['iso_group'] = ParameterDef(
    name='iso_group',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='ISO 513 material group (P, M, K, N, S, H)',
    category='identification',
    applies_to=[]
)

MATERIAL_SCHEMA['category'] = ParameterDef(
    name='category',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Material category (e.g., Carbon Steel, Aluminum Alloys)',
    category='identification',
    applies_to=[]
)

MATERIAL_SCHEMA['condition'] = ParameterDef(
    name='condition',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Heat treatment/processing condition (e.g., Annealed, Q&T)',
    category='identification',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 2: COMPOSITION (15 parameters)
# -----------------------------------------------------------------------------

composition_elements = [
    ('carbon', 'C', 0, 2.5),
    ('manganese', 'Mn', 0, 15),
    ('silicon', 'Si', 0, 5),
    ('chromium', 'Cr', 0, 30),
    ('nickel', 'Ni', 0, 80),
    ('molybdenum', 'Mo', 0, 10),
    ('vanadium', 'V', 0, 5),
    ('tungsten', 'W', 0, 20),
    ('cobalt', 'Co', 0, 70),
    ('copper', 'Cu', 0, 100),
    ('phosphorus', 'P', 0, 0.5),
    ('sulfur', 'S', 0, 0.5),
    ('nitrogen', 'N', 0, 1),
    ('aluminum', 'Al', 0, 100),
    ('titanium', 'Ti', 0, 100),
]

for elem_name, symbol, min_val, max_val in composition_elements:
    MATERIAL_SCHEMA[f'composition_{elem_name}'] = ParameterDef(
        name=f'composition_{elem_name}',
        data_type=DataType.NUMBER,
        unit='%',
        requirement=Requirement.RECOMMENDED if elem_name in ['carbon', 'manganese', 'silicon', 'chromium', 'nickel'] else Requirement.OPTIONAL,
        min_value=min_val, max_value=max_val,
        description=f'{symbol} content in weight percent',
        category='composition',
        applies_to=[]
    )

# -----------------------------------------------------------------------------
# CATEGORY 3: PHYSICAL PROPERTIES (8 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['density'] = ParameterDef(
    name='density',
    data_type=DataType.NUMBER,
    unit='kg/m³',
    requirement=Requirement.REQUIRED,
    min_value=1000, max_value=25000,
    description='Material density',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['melting_point'] = ParameterDef(
    name='melting_point',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.REQUIRED,
    min_value=100, max_value=4000,
    description='Melting temperature (solidus)',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['melting_point_liquidus'] = ParameterDef(
    name='melting_point_liquidus',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.OPTIONAL,
    min_value=100, max_value=4000,
    description='Melting temperature (liquidus)',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['specific_heat'] = ParameterDef(
    name='specific_heat',
    data_type=DataType.NUMBER,
    unit='J/(kg·K)',
    requirement=Requirement.REQUIRED,
    min_value=100, max_value=2000,
    description='Specific heat capacity',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['thermal_conductivity'] = ParameterDef(
    name='thermal_conductivity',
    data_type=DataType.NUMBER,
    unit='W/(m·K)',
    requirement=Requirement.REQUIRED,
    min_value=1, max_value=500,
    description='Thermal conductivity at room temperature',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['thermal_expansion'] = ParameterDef(
    name='thermal_expansion',
    data_type=DataType.NUMBER,
    unit='µm/(m·K)',
    requirement=Requirement.RECOMMENDED,
    min_value=0, max_value=50,
    description='Coefficient of thermal expansion',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['electrical_resistivity'] = ParameterDef(
    name='electrical_resistivity',
    data_type=DataType.NUMBER,
    unit='µΩ·m',
    requirement=Requirement.OPTIONAL,
    min_value=0.01, max_value=2000,
    description='Electrical resistivity',
    category='physical',
    applies_to=[]
)

MATERIAL_SCHEMA['magnetic_permeability'] = ParameterDef(
    name='magnetic_permeability',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=1, max_value=10000,
    description='Relative magnetic permeability',
    category='physical',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 4: MECHANICAL PROPERTIES (12 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['yield_strength'] = ParameterDef(
    name='yield_strength',
    data_type=DataType.NUMBER,
    unit='MPa',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=3000,
    description='0.2% offset yield strength',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['tensile_strength'] = ParameterDef(
    name='tensile_strength',
    data_type=DataType.NUMBER,
    unit='MPa',
    requirement=Requirement.REQUIRED,
    min_value=20, max_value=3500,
    description='Ultimate tensile strength (UTS)',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['elongation'] = ParameterDef(
    name='elongation',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.REQUIRED,
    min_value=0, max_value=80,
    description='Elongation at break',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['reduction_of_area'] = ParameterDef(
    name='reduction_of_area',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.RECOMMENDED,
    min_value=0, max_value=95,
    description='Reduction of area at fracture',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['hardness_brinell'] = ParameterDef(
    name='hardness_brinell',
    data_type=DataType.NUMBER,
    unit='HB',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=800,
    description='Brinell hardness',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['hardness_rockwell_c'] = ParameterDef(
    name='hardness_rockwell_c',
    data_type=DataType.NUMBER,
    unit='HRC',
    requirement=Requirement.OPTIONAL,
    min_value=20, max_value=70,
    description='Rockwell C hardness (for hardened materials)',
    category='mechanical',
    applies_to=['H']
)

MATERIAL_SCHEMA['hardness_rockwell_b'] = ParameterDef(
    name='hardness_rockwell_b',
    data_type=DataType.NUMBER,
    unit='HRB',
    requirement=Requirement.OPTIONAL,
    min_value=0, max_value=100,
    description='Rockwell B hardness',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['elastic_modulus'] = ParameterDef(
    name='elastic_modulus',
    data_type=DataType.NUMBER,
    unit='GPa',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=500,
    description="Young's modulus (elastic modulus)",
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['shear_modulus'] = ParameterDef(
    name='shear_modulus',
    data_type=DataType.NUMBER,
    unit='GPa',
    requirement=Requirement.RECOMMENDED,
    min_value=5, max_value=250,
    description='Shear modulus (modulus of rigidity)',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['poissons_ratio'] = ParameterDef(
    name='poissons_ratio',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=0.1, max_value=0.5,
    description="Poisson's ratio",
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['fatigue_strength'] = ParameterDef(
    name='fatigue_strength',
    data_type=DataType.NUMBER,
    unit='MPa',
    requirement=Requirement.OPTIONAL,
    min_value=10, max_value=2000,
    description='Fatigue strength at 10^7 cycles',
    category='mechanical',
    applies_to=[]
)

MATERIAL_SCHEMA['impact_toughness'] = ParameterDef(
    name='impact_toughness',
    data_type=DataType.NUMBER,
    unit='J',
    requirement=Requirement.OPTIONAL,
    min_value=1, max_value=400,
    description='Charpy impact toughness',
    category='mechanical',
    applies_to=[]
)


# -----------------------------------------------------------------------------
# CATEGORY 5: CUTTING FORCE PARAMETERS (8 parameters)
# Kienzle model: Fc = Kc1.1 × b × h^(1-mc) × correction factors
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['Kc1_1'] = ParameterDef(
    name='Kc1_1',
    data_type=DataType.NUMBER,
    unit='N/mm²',
    requirement=Requirement.REQUIRED,
    min_value=300, max_value=6000,
    description='Specific cutting force at h=1mm, b=1mm',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['mc'] = ParameterDef(
    name='mc',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=0.10, max_value=0.50,
    description='Chip thickness exponent (Kienzle)',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['Kc1_1_roughing'] = ParameterDef(
    name='Kc1_1_roughing',
    data_type=DataType.NUMBER,
    unit='N/mm²',
    requirement=Requirement.OPTIONAL,
    min_value=300, max_value=6000,
    description='Kc1.1 for roughing operations',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['Kc1_1_finishing'] = ParameterDef(
    name='Kc1_1_finishing',
    data_type=DataType.NUMBER,
    unit='N/mm²',
    requirement=Requirement.OPTIONAL,
    min_value=300, max_value=6000,
    description='Kc1.1 for finishing operations',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['Kc_correction_rake'] = ParameterDef(
    name='Kc_correction_rake',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=0.5, max_value=1.5,
    description='Rake angle correction coefficient',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['Kc_correction_speed'] = ParameterDef(
    name='Kc_correction_speed',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=0.8, max_value=1.2,
    description='Speed correction coefficient',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['Kc_correction_wear'] = ParameterDef(
    name='Kc_correction_wear',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=1.0, max_value=1.5,
    description='Tool wear correction coefficient',
    category='cutting_force',
    applies_to=[]
)

MATERIAL_SCHEMA['specific_cutting_energy'] = ParameterDef(
    name='specific_cutting_energy',
    data_type=DataType.NUMBER,
    unit='J/mm³',
    requirement=Requirement.OPTIONAL,
    min_value=0.5, max_value=10,
    description='Specific cutting energy',
    category='cutting_force',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 6: CONSTITUTIVE MODEL - JOHNSON-COOK (8 parameters)
# σ = [A + B × ε^n] × [1 + C × ln(ε̇*)] × [1 - T*^m]
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['JC_A'] = ParameterDef(
    name='JC_A',
    data_type=DataType.NUMBER,
    unit='MPa',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=2500,
    description='Johnson-Cook yield stress parameter',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_B'] = ParameterDef(
    name='JC_B',
    data_type=DataType.NUMBER,
    unit='MPa',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=3000,
    description='Johnson-Cook strain hardening modulus',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_n'] = ParameterDef(
    name='JC_n',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=0.01, max_value=1.0,
    description='Johnson-Cook strain hardening exponent',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_C'] = ParameterDef(
    name='JC_C',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=0.001, max_value=0.2,
    description='Johnson-Cook strain rate coefficient',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_m'] = ParameterDef(
    name='JC_m',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=0.1, max_value=2.0,
    description='Johnson-Cook thermal softening exponent',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_ref_strain_rate'] = ParameterDef(
    name='JC_ref_strain_rate',
    data_type=DataType.NUMBER,
    unit='1/s',
    requirement=Requirement.RECOMMENDED,
    min_value=0.0001, max_value=10,
    description='Reference strain rate for J-C model',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_ref_temperature'] = ParameterDef(
    name='JC_ref_temperature',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.RECOMMENDED,
    min_value=15, max_value=30,
    description='Reference temperature for J-C model',
    category='constitutive',
    applies_to=[]
)

MATERIAL_SCHEMA['JC_melt_temperature'] = ParameterDef(
    name='JC_melt_temperature',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.RECOMMENDED,
    min_value=100, max_value=4000,
    description='Melt temperature for J-C model',
    category='constitutive',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 7: TOOL LIFE - TAYLOR EQUATION (6 parameters)
# V × T^n = C (basic), V × T^n × f^a × ap^b = C (extended)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['taylor_n'] = ParameterDef(
    name='taylor_n',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=0.08, max_value=0.50,
    description='Taylor exponent (tool life sensitivity to speed)',
    category='tool_life',
    applies_to=[]
)

MATERIAL_SCHEMA['taylor_C_hss'] = ParameterDef(
    name='taylor_C_hss',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.OPTIONAL,
    min_value=5, max_value=200,
    description='Taylor constant for HSS tools',
    category='tool_life',
    applies_to=[]
)

MATERIAL_SCHEMA['taylor_C_carbide'] = ParameterDef(
    name='taylor_C_carbide',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=50, max_value=800,
    description='Taylor constant for uncoated carbide',
    category='tool_life',
    applies_to=[]
)

MATERIAL_SCHEMA['taylor_C_coated'] = ParameterDef(
    name='taylor_C_coated',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=100, max_value=1200,
    description='Taylor constant for coated carbide',
    category='tool_life',
    applies_to=[]
)

MATERIAL_SCHEMA['taylor_feed_exp'] = ParameterDef(
    name='taylor_feed_exp',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=0.3, max_value=0.9,
    description='Taylor feed rate exponent (a)',
    category='tool_life',
    applies_to=[]
)

MATERIAL_SCHEMA['taylor_doc_exp'] = ParameterDef(
    name='taylor_doc_exp',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=0.05, max_value=0.30,
    description='Taylor depth of cut exponent (b)',
    category='tool_life',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 8: CHIP FORMATION (8 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['chip_type'] = ParameterDef(
    name='chip_type',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Typical chip type (continuous, segmented, discontinuous)',
    category='chip_formation',
    applies_to=[]
)

MATERIAL_SCHEMA['chip_breakability'] = ParameterDef(
    name='chip_breakability',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Chip breakability rating (poor, fair, good, excellent)',
    category='chip_formation',
    applies_to=[]
)

MATERIAL_SCHEMA['bue_tendency'] = ParameterDef(
    name='bue_tendency',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Built-up edge tendency (low, moderate, high)',
    category='chip_formation',
    applies_to=[]
)

MATERIAL_SCHEMA['shear_angle_typical'] = ParameterDef(
    name='shear_angle_typical',
    data_type=DataType.NUMBER,
    unit='°',
    requirement=Requirement.OPTIONAL,
    min_value=10, max_value=45,
    description='Typical shear plane angle',
    category='chip_formation',
    applies_to=[]
)

MATERIAL_SCHEMA['chip_compression_ratio'] = ParameterDef(
    name='chip_compression_ratio',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=1.5, max_value=8.0,
    description='Chip thickness ratio (deformed/undeformed)',
    category='chip_formation',
    applies_to=[]
)

MATERIAL_SCHEMA['segmentation_frequency'] = ParameterDef(
    name='segmentation_frequency',
    data_type=DataType.NUMBER,
    unit='kHz',
    requirement=Requirement.OPTIONAL,
    min_value=1, max_value=100,
    description='Chip segmentation frequency (if segmented)',
    category='chip_formation',
    applies_to=['S', 'H']
)

MATERIAL_SCHEMA['strain_hardening_rate'] = ParameterDef(
    name='strain_hardening_rate',
    data_type=DataType.NUMBER,
    unit='MPa',
    requirement=Requirement.OPTIONAL,
    min_value=100, max_value=10000,
    description='Work hardening rate during cutting',
    category='chip_formation',
    applies_to=[]
)

MATERIAL_SCHEMA['adiabatic_shear_sensitivity'] = ParameterDef(
    name='adiabatic_shear_sensitivity',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Adiabatic shear band tendency (low, moderate, high)',
    category='chip_formation',
    applies_to=['S', 'H']
)


# -----------------------------------------------------------------------------
# CATEGORY 9: TRIBOLOGY (6 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['friction_coefficient'] = ParameterDef(
    name='friction_coefficient',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=0.1, max_value=1.5,
    description='Friction coefficient at tool-chip interface',
    category='tribology',
    applies_to=[]
)

MATERIAL_SCHEMA['adhesion_tendency'] = ParameterDef(
    name='adhesion_tendency',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Material adhesion to tool (low, moderate, high)',
    category='tribology',
    applies_to=[]
)

MATERIAL_SCHEMA['abrasiveness'] = ParameterDef(
    name='abrasiveness',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Abrasive wear tendency (low, moderate, high)',
    category='tribology',
    applies_to=[]
)

MATERIAL_SCHEMA['diffusion_tendency'] = ParameterDef(
    name='diffusion_tendency',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Diffusion wear tendency (low, moderate, high)',
    category='tribology',
    applies_to=['S']
)

MATERIAL_SCHEMA['chemical_reactivity'] = ParameterDef(
    name='chemical_reactivity',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Chemical reactivity with tool material',
    category='tribology',
    applies_to=[]
)

MATERIAL_SCHEMA['wear_coefficient'] = ParameterDef(
    name='wear_coefficient',
    data_type=DataType.NUMBER,
    unit='mm³/(N·m)',
    requirement=Requirement.OPTIONAL,
    min_value=1e-8, max_value=1e-3,
    description='Archard wear coefficient',
    category='tribology',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 10: THERMAL CUTTING PROPERTIES (10 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['cutting_temperature_typical'] = ParameterDef(
    name='cutting_temperature_typical',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.RECOMMENDED,
    min_value=100, max_value=1200,
    description='Typical tool-chip interface temperature',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['thermal_diffusivity'] = ParameterDef(
    name='thermal_diffusivity',
    data_type=DataType.NUMBER,
    unit='mm²/s',
    requirement=Requirement.RECOMMENDED,
    min_value=1, max_value=200,
    description='Thermal diffusivity',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['heat_partition_chip'] = ParameterDef(
    name='heat_partition_chip',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.OPTIONAL,
    min_value=50, max_value=95,
    description='Heat fraction carried by chip',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['heat_partition_tool'] = ParameterDef(
    name='heat_partition_tool',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.OPTIONAL,
    min_value=3, max_value=30,
    description='Heat fraction absorbed by tool',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['heat_partition_workpiece'] = ParameterDef(
    name='heat_partition_workpiece',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.OPTIONAL,
    min_value=2, max_value=25,
    description='Heat fraction absorbed by workpiece',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['softening_temperature'] = ParameterDef(
    name='softening_temperature',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.OPTIONAL,
    min_value=100, max_value=1500,
    description='Temperature at which significant softening occurs',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['recrystallization_temp'] = ParameterDef(
    name='recrystallization_temp',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.OPTIONAL,
    min_value=200, max_value=1200,
    description='Recrystallization temperature',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['phase_transformation_temp'] = ParameterDef(
    name='phase_transformation_temp',
    data_type=DataType.NUMBER,
    unit='°C',
    requirement=Requirement.OPTIONAL,
    min_value=200, max_value=1000,
    description='Phase transformation temperature (if applicable)',
    category='thermal',
    applies_to=['P', 'H']
)

MATERIAL_SCHEMA['thermal_shock_sensitivity'] = ParameterDef(
    name='thermal_shock_sensitivity',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Sensitivity to thermal shock (low, moderate, high)',
    category='thermal',
    applies_to=[]
)

MATERIAL_SCHEMA['coolant_compatibility'] = ParameterDef(
    name='coolant_compatibility',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Coolant compatibility (all, water-based, oil-based, dry)',
    category='thermal',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 11: SURFACE INTEGRITY (8 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['residual_stress_tendency'] = ParameterDef(
    name='residual_stress_tendency',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Tendency for residual stress (tensile, compressive, mixed)',
    category='surface_integrity',
    applies_to=[]
)

MATERIAL_SCHEMA['work_hardening_depth'] = ParameterDef(
    name='work_hardening_depth',
    data_type=DataType.NUMBER,
    unit='µm',
    requirement=Requirement.OPTIONAL,
    min_value=5, max_value=500,
    description='Typical work hardening depth',
    category='surface_integrity',
    applies_to=[]
)

MATERIAL_SCHEMA['work_hardening_factor'] = ParameterDef(
    name='work_hardening_factor',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=1.0, max_value=3.0,
    description='Surface hardness increase factor',
    category='surface_integrity',
    applies_to=[]
)

MATERIAL_SCHEMA['white_layer_tendency'] = ParameterDef(
    name='white_layer_tendency',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='White layer formation tendency (none, low, moderate, high)',
    category='surface_integrity',
    applies_to=['P', 'H']
)

MATERIAL_SCHEMA['burr_formation'] = ParameterDef(
    name='burr_formation',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Burr formation tendency (minimal, moderate, severe)',
    category='surface_integrity',
    applies_to=[]
)

MATERIAL_SCHEMA['surface_finish_achievable'] = ParameterDef(
    name='surface_finish_achievable',
    data_type=DataType.NUMBER,
    unit='µm Ra',
    requirement=Requirement.RECOMMENDED,
    min_value=0.1, max_value=12.5,
    description='Typical achievable surface finish',
    category='surface_integrity',
    applies_to=[]
)

MATERIAL_SCHEMA['smearing_tendency'] = ParameterDef(
    name='smearing_tendency',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Surface smearing tendency (low, moderate, high)',
    category='surface_integrity',
    applies_to=['N', 'M']
)

MATERIAL_SCHEMA['springback_factor'] = ParameterDef(
    name='springback_factor',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.OPTIONAL,
    min_value=0, max_value=10,
    description='Elastic springback percentage',
    category='surface_integrity',
    applies_to=[]
)


# -----------------------------------------------------------------------------
# CATEGORY 12: MACHINABILITY INDICES (10 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['machinability_rating'] = ParameterDef(
    name='machinability_rating',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.REQUIRED,
    min_value=5, max_value=300,
    description='AISI machinability rating (100% = AISI 1112)',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['machinability_class'] = ParameterDef(
    name='machinability_class',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Machinability class (excellent, good, fair, poor, very_poor)',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['difficulty_factor'] = ParameterDef(
    name='difficulty_factor',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=0.5, max_value=5.0,
    description='Relative machining difficulty (1.0 = baseline steel)',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['tool_wear_factor'] = ParameterDef(
    name='tool_wear_factor',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=0.5, max_value=5.0,
    description='Tool wear rate factor relative to baseline',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['power_factor'] = ParameterDef(
    name='power_factor',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=0.5, max_value=3.0,
    description='Power consumption factor relative to baseline',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['recommended_tool_material'] = ParameterDef(
    name='recommended_tool_material',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Primary recommended tool material',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['recommended_coating'] = ParameterDef(
    name='recommended_coating',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Recommended tool coating',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['coolant_recommendation'] = ParameterDef(
    name='coolant_recommendation',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Coolant recommendation (flood, mist, dry, MQL)',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['chip_control_rating'] = ParameterDef(
    name='chip_control_rating',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Chip control difficulty (easy, moderate, difficult)',
    category='machinability',
    applies_to=[]
)

MATERIAL_SCHEMA['special_considerations'] = ParameterDef(
    name='special_considerations',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Special machining considerations or warnings',
    category='machinability',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 13: RECOMMENDED CUTTING PARAMETERS (18 parameters)
# Speed and feed recommendations for different operations
# -----------------------------------------------------------------------------

# Milling parameters
MATERIAL_SCHEMA['rec_speed_milling_rough'] = ParameterDef(
    name='rec_speed_milling_rough',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=1500,
    description='Recommended milling speed - roughing (coated carbide)',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_speed_milling_finish'] = ParameterDef(
    name='rec_speed_milling_finish',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=2000,
    description='Recommended milling speed - finishing (coated carbide)',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_feed_milling_rough'] = ParameterDef(
    name='rec_feed_milling_rough',
    data_type=DataType.NUMBER,
    unit='mm/tooth',
    requirement=Requirement.REQUIRED,
    min_value=0.02, max_value=0.5,
    description='Recommended feed per tooth - roughing',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_feed_milling_finish'] = ParameterDef(
    name='rec_feed_milling_finish',
    data_type=DataType.NUMBER,
    unit='mm/tooth',
    requirement=Requirement.REQUIRED,
    min_value=0.01, max_value=0.3,
    description='Recommended feed per tooth - finishing',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_doc_milling_rough'] = ParameterDef(
    name='rec_doc_milling_rough',
    data_type=DataType.NUMBER,
    unit='mm',
    requirement=Requirement.RECOMMENDED,
    min_value=0.5, max_value=15,
    description='Recommended depth of cut - roughing',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_doc_milling_finish'] = ParameterDef(
    name='rec_doc_milling_finish',
    data_type=DataType.NUMBER,
    unit='mm',
    requirement=Requirement.RECOMMENDED,
    min_value=0.1, max_value=2,
    description='Recommended depth of cut - finishing',
    category='recommended',
    applies_to=[]
)

# Turning parameters
MATERIAL_SCHEMA['rec_speed_turning_rough'] = ParameterDef(
    name='rec_speed_turning_rough',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=1500,
    description='Recommended turning speed - roughing',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_speed_turning_finish'] = ParameterDef(
    name='rec_speed_turning_finish',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=10, max_value=2000,
    description='Recommended turning speed - finishing',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_feed_turning_rough'] = ParameterDef(
    name='rec_feed_turning_rough',
    data_type=DataType.NUMBER,
    unit='mm/rev',
    requirement=Requirement.REQUIRED,
    min_value=0.1, max_value=1.0,
    description='Recommended feed per rev - roughing',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_feed_turning_finish'] = ParameterDef(
    name='rec_feed_turning_finish',
    data_type=DataType.NUMBER,
    unit='mm/rev',
    requirement=Requirement.REQUIRED,
    min_value=0.05, max_value=0.4,
    description='Recommended feed per rev - finishing',
    category='recommended',
    applies_to=[]
)

# Drilling parameters
MATERIAL_SCHEMA['rec_speed_drilling'] = ParameterDef(
    name='rec_speed_drilling',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.REQUIRED,
    min_value=5, max_value=300,
    description='Recommended drilling speed',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['rec_feed_drilling'] = ParameterDef(
    name='rec_feed_drilling',
    data_type=DataType.NUMBER,
    unit='mm/rev',
    requirement=Requirement.REQUIRED,
    min_value=0.02, max_value=0.5,
    description='Recommended drilling feed',
    category='recommended',
    applies_to=[]
)

# Speed ranges
MATERIAL_SCHEMA['speed_range_min'] = ParameterDef(
    name='speed_range_min',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.RECOMMENDED,
    min_value=5, max_value=500,
    description='Minimum recommended cutting speed',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['speed_range_max'] = ParameterDef(
    name='speed_range_max',
    data_type=DataType.NUMBER,
    unit='m/min',
    requirement=Requirement.RECOMMENDED,
    min_value=20, max_value=2500,
    description='Maximum recommended cutting speed',
    category='recommended',
    applies_to=[]
)

# Engagement limits
MATERIAL_SCHEMA['max_radial_engagement'] = ParameterDef(
    name='max_radial_engagement',
    data_type=DataType.NUMBER,
    unit='%',
    requirement=Requirement.OPTIONAL,
    min_value=10, max_value=100,
    description='Maximum radial engagement for stable cutting',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['max_axial_engagement'] = ParameterDef(
    name='max_axial_engagement',
    data_type=DataType.NUMBER,
    unit='xD',
    requirement=Requirement.OPTIONAL,
    min_value=0.5, max_value=2.0,
    description='Maximum axial engagement as multiple of diameter',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['entry_angle_recommended'] = ParameterDef(
    name='entry_angle_recommended',
    data_type=DataType.NUMBER,
    unit='°',
    requirement=Requirement.OPTIONAL,
    min_value=0, max_value=90,
    description='Recommended tool entry angle',
    category='recommended',
    applies_to=[]
)

MATERIAL_SCHEMA['helix_angle_recommended'] = ParameterDef(
    name='helix_angle_recommended',
    data_type=DataType.NUMBER,
    unit='°',
    requirement=Requirement.OPTIONAL,
    min_value=15, max_value=60,
    description='Recommended helix angle for end mills',
    category='recommended',
    applies_to=[]
)

# -----------------------------------------------------------------------------
# CATEGORY 14: METADATA (10 parameters)
# -----------------------------------------------------------------------------

MATERIAL_SCHEMA['data_source'] = ParameterDef(
    name='data_source',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Primary data source (ASM, Machinery Handbook, manufacturer, etc.)',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['data_quality'] = ParameterDef(
    name='data_quality',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=None, max_value=None,
    description='Data quality rating (verified, literature, estimated)',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['confidence_level'] = ParameterDef(
    name='confidence_level',
    data_type=DataType.NUMBER,
    unit='',
    requirement=Requirement.REQUIRED,
    min_value=0.1, max_value=1.0,
    description='Overall confidence in data (0-1)',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['last_updated'] = ParameterDef(
    name='last_updated',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.RECOMMENDED,
    min_value=None, max_value=None,
    description='Last update date (ISO format)',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['created_date'] = ParameterDef(
    name='created_date',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Creation date (ISO format)',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['version'] = ParameterDef(
    name='version',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Data version',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['notes'] = ParameterDef(
    name='notes',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Additional notes or comments',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['validation_status'] = ParameterDef(
    name='validation_status',
    data_type=DataType.STRING,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='Validation status (pending, validated, needs_review)',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['references'] = ParameterDef(
    name='references',
    data_type=DataType.ARRAY,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='List of reference sources',
    category='metadata',
    applies_to=[]
)

MATERIAL_SCHEMA['related_materials'] = ParameterDef(
    name='related_materials',
    data_type=DataType.ARRAY,
    unit='',
    requirement=Requirement.OPTIONAL,
    min_value=None, max_value=None,
    description='List of related material IDs',
    category='metadata',
    applies_to=[]
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_schema() -> Dict[str, ParameterDef]:
    """Get the complete material schema."""
    return MATERIAL_SCHEMA


def get_required_parameters() -> List[str]:
    """Get list of required parameter names."""
    return [name for name, param in MATERIAL_SCHEMA.items() 
            if param.requirement == Requirement.REQUIRED]


def get_recommended_parameters() -> List[str]:
    """Get list of recommended parameter names."""
    return [name for name, param in MATERIAL_SCHEMA.items() 
            if param.requirement == Requirement.RECOMMENDED]


def get_parameters_by_category(category: str) -> Dict[str, ParameterDef]:
    """Get all parameters in a specific category."""
    return {name: param for name, param in MATERIAL_SCHEMA.items() 
            if param.category == category}


def get_categories() -> List[str]:
    """Get list of all parameter categories."""
    return list(set(param.category for param in MATERIAL_SCHEMA.values()))


def count_parameters() -> Dict[str, int]:
    """Count parameters by requirement level and category."""
    counts = {
        'total': len(MATERIAL_SCHEMA),
        'required': len(get_required_parameters()),
        'recommended': len(get_recommended_parameters()),
        'optional': len([p for p in MATERIAL_SCHEMA.values() 
                        if p.requirement == Requirement.OPTIONAL]),
        'by_category': {}
    }
    
    for category in get_categories():
        counts['by_category'][category] = len(get_parameters_by_category(category))
    
    return counts


# =============================================================================
# VALIDATION
# =============================================================================

if __name__ == "__main__":
    # Self-test: verify schema integrity
    counts = count_parameters()
    print(f"PRISM Material Schema v1.0")
    print(f"=" * 50)
    print(f"Total Parameters: {counts['total']}")
    print(f"  Required:    {counts['required']}")
    print(f"  Recommended: {counts['recommended']}")
    print(f"  Optional:    {counts['optional']}")
    print(f"\nBy Category:")
    for cat, count in sorted(counts['by_category'].items()):
        print(f"  {cat}: {count}")
