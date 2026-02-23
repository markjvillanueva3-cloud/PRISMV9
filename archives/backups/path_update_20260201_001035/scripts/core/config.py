# PRISM Automation Toolkit - Configuration
# Version: 1.0.0
# Created: 2026-01-23

import os
from pathlib import Path

# =============================================================================
# PATH CONFIGURATION
# =============================================================================

# Base directory (handle spaces in path)
BASE_DIR = Path(r"C:\\PRISM")

# Alternative if spaces cause issues
# BASE_DIR = Path("C:/PRISM")

# Key paths
PATHS = {
    'base': BASE_DIR,
    'state_file': BASE_DIR / "CURRENT_STATE.json",
    'monolith': BASE_DIR / "_BUILD" / "PRISM_v8_89_002_TRUE_100_PERCENT" / "PRISM_v8_89_002_TRUE_100_PERCENT.html",
    'extracted': BASE_DIR / "EXTRACTED",
    'materials': BASE_DIR / "EXTRACTED" / "materials" / "enhanced",
    'machines': BASE_DIR / "EXTRACTED" / "machines",
    'engines': BASE_DIR / "EXTRACTED" / "engines",
    'session_logs': BASE_DIR / "SESSION_LOGS",
    'scripts': BASE_DIR / "SCRIPTS",
    'project_files': BASE_DIR / "_PROJECT_FILES",
    'skills_local': BASE_DIR / "_SKILLS",
    'build': BASE_DIR / "_BUILD",
}

# =============================================================================
# MATERIAL CONSTANTS
# =============================================================================

MATERIAL_CONSTANTS = {
    'total_parameters': 127,
    'required_parameters': 95,  # Minimum required for validation pass
    'target_materials': 1047,
    
    # Parameter categories
    'categories': {
        'composition': 15,      # Chemical composition elements
        'physical': 8,          # Density, melting point, etc.
        'mechanical': 12,       # Yield, UTS, hardness, etc.
        'cutting_force': 8,     # Kc1.1, mc, correction factors
        'constitutive': 8,      # Johnson-Cook parameters
        'tool_life': 6,         # Taylor equation parameters
        'chip_formation': 8,    # Chip type, BUE tendency, etc.
        'tribology': 6,         # Friction, wear coefficients
        'thermal': 10,          # Conductivity, specific heat, etc.
        'surface_integrity': 8, # Residual stress, hardening
        'machinability': 10,    # Indices, ratings
        'recommended': 18,      # Speed, feed recommendations
        'metadata': 10,         # Source, confidence, timestamps
    },
    
    # ISO material groups
    'iso_groups': {
        'P': 'Steel',
        'M': 'Stainless Steel', 
        'K': 'Cast Iron',
        'N': 'Non-ferrous',
        'S': 'Superalloys/Titanium',
        'H': 'Hardened Steel',
    },
    
    # Material category codes
    'category_codes': {
        'P-CS': 'Carbon Steel',
        'P-AS': 'Alloy Steel',
        'P-MS': 'Medium Carbon Steel',
        'P-HS': 'High Carbon Steel',
        'M-SS': 'Stainless Steel (Austenitic)',
        'M-MS': 'Stainless Steel (Martensitic)',
        'M-DS': 'Stainless Steel (Duplex)',
        'K-GI': 'Gray Cast Iron',
        'K-DI': 'Ductile Iron',
        'K-MI': 'Malleable Iron',
        'N-AL': 'Aluminum Alloys',
        'N-CU': 'Copper Alloys',
        'N-MG': 'Magnesium Alloys',
        'S-TI': 'Titanium Alloys',
        'S-NI': 'Nickel Alloys',
        'S-CO': 'Cobalt Alloys',
        'H-TS': 'Tool Steel',
        'H-HS': 'Hardened Steel',
    }
}

# =============================================================================
# MONOLITH CONSTANTS
# =============================================================================

MONOLITH_CONSTANTS = {
    'total_lines': 986621,
    'total_modules': 831,
    'file_size_mb': 48,
    'version': '8.89.002',
    
    # Module categories
    'module_counts': {
        'databases': 62,
        'engines': 213,
        'knowledge_bases': 14,
        'systems_cores': 31,
        'learning_modules': 30,
        'business_modules': 22,
        'ui_components': 16,
        'lookups': 20,
        'manufacturer_catalogs': 44,
        'phase_modules': 46,
    }
}

# =============================================================================
# VALIDATION THRESHOLDS
# =============================================================================

VALIDATION_THRESHOLDS = {
    # Material validation
    'min_parameters_pass': 95,      # Out of 127
    'min_parameters_warn': 80,      # Warning threshold
    
    # Physics consistency
    'kc11_uts_ratio_min': 2.5,      # Kc1.1 / UTS minimum
    'kc11_uts_ratio_max': 6.0,      # Kc1.1 / UTS maximum
    'jc_a_yield_ratio_min': 0.85,   # J-C A / yield minimum
    'jc_a_yield_ratio_max': 1.3,    # J-C A / yield maximum
    'taylor_n_min': 0.08,           # Taylor n minimum
    'taylor_n_max': 0.50,           # Taylor n maximum
    
    # Database utilization
    'min_consumers_per_db': 6,      # Minimum consumers for 100% utilization
    'target_consumers_per_db': 8,   # Target consumers
    
    # Confidence levels
    'high_confidence': 0.90,
    'medium_confidence': 0.70,
    'low_confidence': 0.50,
}

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    'date_format': '%Y-%m-%d %H:%M:%S',
    'log_dir': PATHS['base'] / "SCRIPTS" / "logs",
}

# =============================================================================
# OUTPUT FORMATTING
# =============================================================================

OUTPUT_FORMAT = {
    'separator': '=' * 80,
    'subseparator': '-' * 60,
    'success': '✓',
    'failure': '✗',
    'warning': '⚠',
    'info': 'ℹ',
}

# Ensure log directory exists
LOGGING_CONFIG['log_dir'].mkdir(parents=True, exist_ok=True)
