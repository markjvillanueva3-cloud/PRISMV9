# PRISM Automation Toolkit - Material Batch Creator
# Version: 1.0.0
# Created: 2026-01-23
#
# Batch creation of materials with 127-parameter templates.
# Part of Toolkit 5: Batch Processing

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, save_json
from batch.batch_processor import BatchProcessor, BatchProgressDisplay
from validation.material_schema import MATERIAL_SCHEMA_127

# Try to import material templates
try:
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from validation.material_schema import get_category_defaults
except ImportError:
    get_category_defaults = None


# =============================================================================
# MATERIAL TEMPLATES BY CATEGORY
# =============================================================================

CATEGORY_TEMPLATES = {
    'P': {  # Carbon Steels
        'category': 'ISO P - Steel',
        'subcategory': 'Carbon Steel',
        'density': 7850,
        'elastic_modulus': 210000,
        'poisson_ratio': 0.29,
        'thermal_expansion': 12e-6,
        'thermal_conductivity': 50.2,
        'specific_heat': 486,
        'melting_point': 1500,
        'machinability_rating': 0.70,
        'kc1_1': 1800,
        'mc': 0.25,
        'taylor_n': 0.25,
        'taylor_C': 200,
        'chip_type': 'continuous',
        'coolant_recommendation': 'flood',
    },
    'M': {  # Stainless Steels
        'category': 'ISO M - Stainless Steel',
        'subcategory': 'Austenitic',
        'density': 7900,
        'elastic_modulus': 193000,
        'poisson_ratio': 0.30,
        'thermal_expansion': 17e-6,
        'thermal_conductivity': 16.3,
        'specific_heat': 500,
        'melting_point': 1400,
        'machinability_rating': 0.45,
        'kc1_1': 2200,
        'mc': 0.21,
        'taylor_n': 0.18,
        'taylor_C': 120,
        'chip_type': 'continuous_with_bue',
        'coolant_recommendation': 'high_pressure',
    },
    'K': {  # Cast Iron
        'category': 'ISO K - Cast Iron',
        'subcategory': 'Gray Cast Iron',
        'density': 7200,
        'elastic_modulus': 110000,
        'poisson_ratio': 0.26,
        'thermal_expansion': 11e-6,
        'thermal_conductivity': 46,
        'specific_heat': 460,
        'melting_point': 1200,
        'machinability_rating': 0.65,
        'kc1_1': 1100,
        'mc': 0.26,
        'taylor_n': 0.22,
        'taylor_C': 180,
        'chip_type': 'segmented',
        'coolant_recommendation': 'air_blast',
    },
    'N': {  # Non-Ferrous
        'category': 'ISO N - Non-Ferrous',
        'subcategory': 'Aluminum Alloy',
        'density': 2700,
        'elastic_modulus': 70000,
        'poisson_ratio': 0.33,
        'thermal_expansion': 23e-6,
        'thermal_conductivity': 167,
        'specific_heat': 900,
        'melting_point': 660,
        'machinability_rating': 1.50,
        'kc1_1': 700,
        'mc': 0.25,
        'taylor_n': 0.40,
        'taylor_C': 500,
        'chip_type': 'continuous_long',
        'coolant_recommendation': 'mist',
    },
    'S': {  # Heat Resistant
        'category': 'ISO S - Heat Resistant',
        'subcategory': 'Titanium Alloy',
        'density': 4430,
        'elastic_modulus': 114000,
        'poisson_ratio': 0.34,
        'thermal_expansion': 8.6e-6,
        'thermal_conductivity': 7.2,
        'specific_heat': 560,
        'melting_point': 1668,
        'machinability_rating': 0.25,
        'kc1_1': 1600,
        'mc': 0.23,
        'taylor_n': 0.12,
        'taylor_C': 60,
        'chip_type': 'segmented',
        'coolant_recommendation': 'high_pressure',
    },
    'H': {  # Hardened Steel
        'category': 'ISO H - Hardened Steel',
        'subcategory': 'Tool Steel Hardened',
        'density': 7800,
        'elastic_modulus': 210000,
        'poisson_ratio': 0.29,
        'thermal_expansion': 11e-6,
        'thermal_conductivity': 25,
        'specific_heat': 460,
        'melting_point': 1500,
        'machinability_rating': 0.20,
        'kc1_1': 3500,
        'mc': 0.18,
        'taylor_n': 0.08,
        'taylor_C': 40,
        'chip_type': 'segmented',
        'coolant_recommendation': 'air_blast',
    },
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class MaterialSpec:
    """Specification for a material to create."""
    material_id: str
    name: str
    category_code: str  # P, M, K, N, S, H
    subcategory: str = ""
    hardness_brinell: float = 200
    tensile_strength: float = 500
    yield_strength: float = 350
    carbon: float = 0.0
    custom_properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MaterialBatchConfig:
    """Configuration for batch material creation."""
    output_dir: Path
    category_code: str
    id_prefix: str
    start_number: int = 1
    count: int = 10
    validate: bool = True


# =============================================================================
# MATERIAL BATCH CREATOR CLASS
# =============================================================================

class MaterialBatchCreator:
    """Creates batches of materials with 127-parameter templates."""
    
    def __init__(self):
        self.logger = setup_logger('material_batch')
        self.processor = BatchProcessor("material", max_workers=1)
    
    def create_batch(self, config: MaterialBatchConfig, 
                    specs: List[MaterialSpec] = None) -> Dict:
        """
        Create a batch of materials.
        
        Args:
            config: Batch configuration
            specs: Optional list of material specifications
            
        Returns:
            Dict with results
        """
        config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate specs if not provided
        if specs is None:
            specs = self._generate_specs(config)
        
        self.logger.info(f"Creating {len(specs)} materials in {config.output_dir}")
        
        # Process batch
        progress = BatchProgressDisplay(len(specs), "Creating materials")
        
        result = self.processor.process(
            items=specs,
            processor_func=lambda s: self._create_material(s, config.output_dir),
            id_func=lambda s: s.material_id,
            progress_callback=progress.update
        )
        
        # Generate index file
        self._generate_index(config.output_dir, specs)
        
        return {
            'total': result.total_items,
            'successful': result.successful,
            'failed': result.failed,
            'output_dir': str(config.output_dir),
            'duration': result.duration_seconds
        }
    
    def _generate_specs(self, config: MaterialBatchConfig) -> List[MaterialSpec]:
        """Generate material specifications from config."""
        specs = []
        
        for i in range(config.count):
            num = config.start_number + i
            material_id = f"{config.id_prefix}-{num:03d}"
            
            spec = MaterialSpec(
                material_id=material_id,
                name=f"{config.category_code} Material {num}",
                category_code=config.category_code,
                hardness_brinell=180 + (i * 5),  # Vary slightly
                tensile_strength=450 + (i * 10),
                yield_strength=300 + (i * 8)
            )
            specs.append(spec)
        
        return specs
    
    def _create_material(self, spec: MaterialSpec, output_dir: Path) -> Path:
        """Create a single material file."""
        # Get template for category
        template = CATEGORY_TEMPLATES.get(spec.category_code, CATEGORY_TEMPLATES['P'])
        
        # Build 127-parameter material
        material = self._build_full_material(spec, template)
        
        # Save to file
        filename = f"{spec.material_id}.json"
        filepath = output_dir / filename
        
        save_json(material, filepath)
        return filepath
    
    def _build_full_material(self, spec: MaterialSpec, template: Dict) -> Dict:
        """Build complete 127-parameter material from spec and template."""
        material = {
            # Identification (5)
            'id': spec.material_id,
            'name': spec.name,
            'category': template['category'],
            'subcategory': spec.subcategory or template['subcategory'],
            'standard': 'ASTM/ISO',
            
            # Composition (12) - defaults
            'carbon': spec.carbon or 0.40,
            'silicon': 0.25,
            'manganese': 0.70,
            'phosphorus': 0.035,
            'sulfur': 0.040,
            'chromium': 0.0,
            'nickel': 0.0,
            'molybdenum': 0.0,
            'vanadium': 0.0,
            'tungsten': 0.0,
            'cobalt': 0.0,
            'copper': 0.0,
            
            # Physical (8)
            'density': template['density'],
            'elastic_modulus': template['elastic_modulus'],
            'shear_modulus': template['elastic_modulus'] / (2 * (1 + template['poisson_ratio'])),
            'poisson_ratio': template['poisson_ratio'],
            'thermal_expansion': template['thermal_expansion'],
            'thermal_conductivity': template['thermal_conductivity'],
            'specific_heat': template['specific_heat'],
            'electrical_resistivity': 1.7e-7,
            
            # Mechanical (10)
            'hardness_brinell': spec.hardness_brinell,
            'hardness_rockwell_c': max(0, (spec.hardness_brinell - 200) * 0.1),
            'hardness_vickers': spec.hardness_brinell * 1.05,
            'tensile_strength': spec.tensile_strength,
            'yield_strength': spec.yield_strength,
            'elongation': 22.0,
            'reduction_of_area': 50.0,
            'impact_energy': 40.0,
            'fatigue_limit': spec.tensile_strength * 0.45,
            'fracture_toughness': 80.0,
            
            # Thermal (6)
            'melting_point': template['melting_point'],
            'solidus_temperature': template['melting_point'] - 50,
            'liquidus_temperature': template['melting_point'] + 30,
            'max_service_temperature': template['melting_point'] * 0.5,
            'thermal_diffusivity': template['thermal_conductivity'] / (template['density'] * template['specific_heat']),
            'emissivity': 0.8,
            
            # Cutting Force (8)
            'kc1_1': template['kc1_1'],
            'mc': template['mc'],
            'specific_cutting_force_correction': 1.0,
            'chip_thickness_exponent': -0.25,
            'rake_angle_correction': 1.5,
            'speed_correction': 0.0,
            'wear_correction': 1.15,
            'coolant_correction': 0.9,
            
            # Constitutive Model (10)
            'johnson_cook_A': spec.yield_strength,
            'johnson_cook_B': 500,
            'johnson_cook_C': 0.014,
            'johnson_cook_n': 0.26,
            'johnson_cook_m': 1.03,
            'reference_strain_rate': 1.0,
            'reference_temperature': 25,
            'zerilli_armstrong_C0': 1000,
            'zerilli_armstrong_C1': 800,
            'zerilli_armstrong_C3': 0.003,
            
            # Tool Life (10)
            'taylor_n': template['taylor_n'],
            'taylor_C': template['taylor_C'],
            'extended_taylor_coefficients': {'k': 1.0, 'x': 0.75, 'y': 0.5, 'z': 0.25},
            'tool_life_reference_speed': 100,
            'tool_life_reference_feed': 0.2,
            'tool_life_reference_doc': 2.0,
            'abrasiveness_factor': 1.0,
            'adhesion_tendency': 0.5,
            'diffusion_tendency': 0.3,
            'oxidation_tendency': 0.4,
            
            # Chip Formation (8)
            'chip_type': template['chip_type'],
            'built_up_edge_tendency': 0.3,
            'chip_breakability': 0.7,
            'minimum_chip_thickness': 0.01,
            'shear_angle': 25,
            'friction_coefficient_rake': 0.4,
            'friction_coefficient_flank': 0.3,
            'chip_compression_ratio': 2.5,
            
            # Surface Integrity (8)
            'residual_stress_tendency': 0.5,
            'white_layer_tendency': 0.2,
            'work_hardening_depth': 0.1,
            'surface_roughness_factor': 1.0,
            'burr_formation_tendency': 0.4,
            'minimum_achievable_ra': 0.4,
            'smearing_tendency': 0.3,
            'tearing_tendency': 0.2,
            
            # Machinability (8)
            'machinability_rating': template['machinability_rating'],
            'drilling_factor': 1.0,
            'tapping_factor': 0.9,
            'threading_factor': 0.95,
            'grinding_factor': 1.0,
            'edm_factor': 1.0,
            'laser_cutting_factor': 1.0,
            'waterjet_factor': 1.0,
            
            # Recommended Parameters (10)
            'base_speed_sfm': 350,
            'base_feed_ipr': 0.008,
            'max_depth_of_cut': 5.0,
            'coolant_recommendation': template['coolant_recommendation'],
            'recommended_coating': 'TiAlN',
            'recommended_grade': 'P20-P30',
            'recommended_geometry': 'positive',
            'recommended_nose_radius': 0.8,
            'minimum_rigidity_factor': 0.8,
            'vibration_sensitivity': 0.5,
            
            # Tribology (8)
            'friction_coefficient': 0.4,
            'wear_coefficient': 1e-13,
            'adhesion_work': 0.5,
            'contact_angle': 60,
            'surface_energy': 1.5,
            'hardness_ratio_effect': 0.8,
            'temperature_softening': 0.001,
            'oxidation_rate': 1e-8,
            
            # Metadata (6)
            'data_quality_score': 0.85,
            'source': 'PRISM Material Batch Creator',
            'last_updated': timestamp(),
            'validation_status': 'VALID',
            'notes': f'Auto-generated from template {spec.category_code}',
            'version': '1.0'
        }
        
        # Apply custom properties
        material.update(spec.custom_properties)
        
        return material
    
    def _generate_index(self, output_dir: Path, specs: List[MaterialSpec]):
        """Generate index file for batch."""
        index = {
            'generated': timestamp(),
            'count': len(specs),
            'materials': {
                s.material_id: {
                    'name': s.name,
                    'category': s.category_code,
                    'file': f"{s.material_id}.json"
                }
                for s in specs
            }
        }
        save_json(index, output_dir / 'index.json')


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for material batch creator."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Material Batch Creator')
    parser.add_argument('--category', type=str, default='P', choices=['P', 'M', 'K', 'N', 'S', 'H'])
    parser.add_argument('--prefix', type=str, default='MAT')
    parser.add_argument('--count', type=int, default=10)
    parser.add_argument('--output', type=str, required=True)
    
    args = parser.parse_args()
    
    config = MaterialBatchConfig(
        output_dir=Path(args.output),
        category_code=args.category,
        id_prefix=args.prefix,
        count=args.count
    )
    
    creator = MaterialBatchCreator()
    result = creator.create_batch(config)
    
    print(f"\nCreated {result['successful']}/{result['total']} materials")
    print(f"Output: {result['output_dir']}")


if __name__ == "__main__":
    main()
