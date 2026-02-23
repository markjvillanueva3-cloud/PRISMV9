#!/usr/bin/env python3
"""
PRISM Copper Alloy Tempers Generator v1.0
==========================================
Generates copper alloys at ALL realistic temper conditions.

CRITICAL MANUFACTURING INTELLIGENCE:
- O (annealed): Softest, best formability, lowest strength
- H01-H08: Increasing cold work (1/4 hard to spring)
- Spring temper brass: 3× tensile of annealed!

The same alloy at different tempers has DRAMATICALLY different machining:
- C260 Brass O: Tensile 340 MPa, very gummy
- C260 Brass H04: Tensile 495 MPa, good chips
- C260 Brass H08: Tensile 585 MPa, excellent chips

Author: PRISM Manufacturing Intelligence
Version: 1.0
Date: 2026-01-25
"""

import json
from datetime import datetime

# =============================================================================
# COPPER TEMPER DESIGNATIONS (ASTM B601)
# =============================================================================

COPPER_TEMPERS = {
    "O60": {"cold_work": 0.00, "tensile_mult": 1.00, "yield_mult": 1.00, "elong_mult": 1.00, "desc": "Soft anneal"},
    "O50": {"cold_work": 0.00, "tensile_mult": 1.02, "yield_mult": 1.05, "elong_mult": 0.95, "desc": "Light anneal"},
    "H00": {"cold_work": 0.05, "tensile_mult": 1.05, "yield_mult": 1.10, "elong_mult": 0.90, "desc": "1/8 Hard"},
    "H01": {"cold_work": 0.10, "tensile_mult": 1.12, "yield_mult": 1.25, "elong_mult": 0.80, "desc": "1/4 Hard"},
    "H02": {"cold_work": 0.20, "tensile_mult": 1.25, "yield_mult": 1.50, "elong_mult": 0.65, "desc": "1/2 Hard"},
    "H03": {"cold_work": 0.30, "tensile_mult": 1.38, "yield_mult": 1.75, "elong_mult": 0.50, "desc": "3/4 Hard"},
    "H04": {"cold_work": 0.40, "tensile_mult": 1.50, "yield_mult": 2.00, "elong_mult": 0.40, "desc": "Hard"},
    "H06": {"cold_work": 0.60, "tensile_mult": 1.62, "yield_mult": 2.25, "elong_mult": 0.30, "desc": "Extra Hard"},
    "H08": {"cold_work": 0.80, "tensile_mult": 1.72, "yield_mult": 2.50, "elong_mult": 0.20, "desc": "Spring"},
    "H10": {"cold_work": 1.00, "tensile_mult": 1.80, "yield_mult": 2.75, "elong_mult": 0.15, "desc": "Extra Spring"},
    # Heat treated tempers for beryllium copper
    "TB00": {"tensile_mult": 1.10, "yield_mult": 1.15, "elong_mult": 0.90, "desc": "Solution annealed"},
    "TD02": {"tensile_mult": 1.80, "yield_mult": 2.40, "elong_mult": 0.35, "desc": "1/2 Hard + aged"},
    "TD04": {"tensile_mult": 2.00, "yield_mult": 2.80, "elong_mult": 0.25, "desc": "Hard + aged"},
    "TF00": {"tensile_mult": 2.20, "yield_mult": 3.20, "elong_mult": 0.15, "desc": "Aged from TB00"},
}

# =============================================================================
# COPPER ALLOY DEFINITIONS
# =============================================================================

# Pure Copper
PURE_COPPER = {
    "C10100": {
        "name": "C10100 OFE Copper", "uns": "C10100", "din": "2.0040", "en": "CW009A",
        "composition": {"Cu": 99.99},
        "O_tensile": 220, "O_yield": 69, "O_elongation": 55,
        "base_kc11": 900, "base_mc": 0.28, "base_speed": 250,
        "base_taylor_C": 400, "base_taylor_n": 0.30,
        "density": 8940, "thermal_cond": 391, "elastic_mod": 117000,
        "tempers": ["O60", "H01", "H02", "H04"],
        "applications": ["electrical", "waveguides", "vacuum_components"],
        "notes": "Oxygen-free electronic grade"
    },
    "C10200": {
        "name": "C10200 OFHC Copper", "uns": "C10200", "din": "2.0040", "en": "CW008A",
        "composition": {"Cu": 99.95},
        "O_tensile": 220, "O_yield": 69, "O_elongation": 55,
        "base_kc11": 900, "base_mc": 0.28, "base_speed": 250,
        "base_taylor_C": 400, "base_taylor_n": 0.30,
        "density": 8940, "thermal_cond": 388, "elastic_mod": 117000,
        "tempers": ["O60", "H01", "H02", "H04", "H06"],
        "applications": ["electrical", "bus_bars", "heat_exchangers"]
    },
    "C11000": {
        "name": "C11000 ETP Copper", "uns": "C11000", "din": "2.0060", "en": "CW004A",
        "composition": {"Cu": 99.90},
        "O_tensile": 220, "O_yield": 69, "O_elongation": 50,
        "base_kc11": 920, "base_mc": 0.28, "base_speed": 240,
        "base_taylor_C": 380, "base_taylor_n": 0.29,
        "density": 8920, "thermal_cond": 385, "elastic_mod": 117000,
        "tempers": ["O60", "H01", "H02", "H04", "H06", "H08"],
        "applications": ["electrical_wire", "bus_bars", "roofing"],
        "notes": "Electrolytic tough pitch"
    },
}

# Brass (Cu-Zn)
BRASS_ALLOYS = {
    "C26000": {
        "name": "C26000 Cartridge Brass", "uns": "C26000", "din": "2.0265", "en": "CW505L",
        "composition": {"Cu": 70.0, "Zn": 30.0},
        "O_tensile": 340, "O_yield": 105, "O_elongation": 65,
        "base_kc11": 1050, "base_mc": 0.26, "base_speed": 200,
        "base_taylor_C": 320, "base_taylor_n": 0.26,
        "density": 8530, "thermal_cond": 120, "elastic_mod": 110000,
        "tempers": ["O60", "H01", "H02", "H04", "H06", "H08"],
        "applications": ["cartridge_cases", "hardware", "fasteners"],
        "notes": "70/30 brass - most common"
    },
    "C27000": {
        "name": "C27000 Yellow Brass", "uns": "C27000", "din": "2.0280", "en": "CW508L",
        "composition": {"Cu": 65.0, "Zn": 35.0},
        "O_tensile": 330, "O_yield": 97, "O_elongation": 62,
        "base_kc11": 1030, "base_mc": 0.26, "base_speed": 210,
        "base_taylor_C": 330, "base_taylor_n": 0.27,
        "density": 8470, "thermal_cond": 116, "elastic_mod": 105000,
        "tempers": ["O60", "H01", "H02", "H04", "H06"],
        "applications": ["architectural", "hardware", "lamp_bases"]
    },
    "C28000": {
        "name": "C28000 Muntz Metal", "uns": "C28000", "din": "2.0360", "en": "CW509L",
        "composition": {"Cu": 60.0, "Zn": 40.0},
        "O_tensile": 365, "O_yield": 140, "O_elongation": 50,
        "base_kc11": 1080, "base_mc": 0.25, "base_speed": 190,
        "base_taylor_C": 300, "base_taylor_n": 0.25,
        "density": 8390, "thermal_cond": 109, "elastic_mod": 103000,
        "tempers": ["O60", "H01", "H02", "H04"],
        "applications": ["architectural", "condenser_tubes", "large_nuts_bolts"],
        "notes": "Hot working brass"
    },
    "C36000": {
        "name": "C36000 Free-Cutting Brass", "uns": "C36000", "din": "2.0375", "en": "CW603N",
        "composition": {"Cu": 61.5, "Zn": 35.5, "Pb": 3.0},
        "O_tensile": 340, "O_yield": 125, "O_elongation": 45,
        "base_kc11": 800, "base_mc": 0.24, "base_speed": 350,
        "base_taylor_C": 500, "base_taylor_n": 0.32,
        "density": 8500, "thermal_cond": 115, "elastic_mod": 97000,
        "tempers": ["O60", "H01", "H02", "H04"],
        "applications": ["screw_machine_products", "gears", "pinions"],
        "notes": "100% machinability rating - baseline"
    },
}

# Bronze (Cu-Sn)
BRONZE_ALLOYS = {
    "C51000": {
        "name": "C51000 Phosphor Bronze A", "uns": "C51000", "din": "2.1020", "en": "CW451K",
        "composition": {"Cu": 94.8, "Sn": 5.0, "P": 0.2},
        "O_tensile": 340, "O_yield": 130, "O_elongation": 65,
        "base_kc11": 1100, "base_mc": 0.26, "base_speed": 180,
        "base_taylor_C": 280, "base_taylor_n": 0.24,
        "density": 8860, "thermal_cond": 84, "elastic_mod": 110000,
        "tempers": ["O60", "H01", "H02", "H04", "H06", "H08"],
        "applications": ["springs", "fasteners", "electrical_contacts"]
    },
    "C52100": {
        "name": "C52100 Phosphor Bronze C", "uns": "C52100", "din": "2.1030", "en": "CW453K",
        "composition": {"Cu": 92.0, "Sn": 8.0, "P": 0.1},
        "O_tensile": 380, "O_yield": 165, "O_elongation": 55,
        "base_kc11": 1150, "base_mc": 0.25, "base_speed": 160,
        "base_taylor_C": 260, "base_taylor_n": 0.23,
        "density": 8800, "thermal_cond": 62, "elastic_mod": 110000,
        "tempers": ["O60", "H01", "H02", "H04", "H06", "H08"],
        "applications": ["heavy_springs", "bridge_bearings", "gear_blanks"]
    },
    "C54400": {
        "name": "C54400 Free-Cutting Phosphor Bronze", "uns": "C54400", "din": "", "en": "CW456K",
        "composition": {"Cu": 88.0, "Sn": 4.0, "Pb": 4.0, "Zn": 4.0},
        "O_tensile": 310, "O_yield": 130, "O_elongation": 40,
        "base_kc11": 850, "base_mc": 0.25, "base_speed": 300,
        "base_taylor_C": 450, "base_taylor_n": 0.30,
        "density": 8900, "thermal_cond": 75, "elastic_mod": 103000,
        "tempers": ["O60", "H01", "H02", "H04"],
        "applications": ["screw_machine_products", "bearings", "bushings"],
        "notes": "Free-machining bronze"
    },
}

# Silicon Bronze
SILICON_BRONZE = {
    "C65500": {
        "name": "C65500 High-Silicon Bronze A", "uns": "C65500", "din": "2.1525", "en": "CW116C",
        "composition": {"Cu": 97.0, "Si": 3.0},
        "O_tensile": 390, "O_yield": 145, "O_elongation": 55,
        "base_kc11": 1180, "base_mc": 0.25, "base_speed": 150,
        "base_taylor_C": 240, "base_taylor_n": 0.22,
        "density": 8530, "thermal_cond": 36, "elastic_mod": 103000,
        "tempers": ["O60", "H01", "H02", "H04", "H06"],
        "applications": ["hydraulic_lines", "marine_hardware", "fasteners"]
    },
}

# Aluminum Bronze
ALUMINUM_BRONZE = {
    "C63000": {
        "name": "C63000 Aluminum Bronze", "uns": "C63000", "din": "2.0966", "en": "CW307G",
        "composition": {"Cu": 82.0, "Al": 10.0, "Ni": 5.0, "Fe": 3.0},
        "O_tensile": 620, "O_yield": 275, "O_elongation": 18,
        "base_kc11": 1350, "base_mc": 0.23, "base_speed": 100,
        "base_taylor_C": 180, "base_taylor_n": 0.19,
        "density": 7580, "thermal_cond": 42, "elastic_mod": 115000,
        "tempers": ["O60", "H01", "H02"],
        "applications": ["marine", "gears", "bearings", "landing_gear"],
        "notes": "High strength"
    },
    "C95400": {
        "name": "C95400 Aluminum Bronze (Cast)", "uns": "C95400", "din": "2.0964", "en": "CC331G",
        "composition": {"Cu": 85.0, "Al": 11.0, "Fe": 4.0},
        "O_tensile": 550, "O_yield": 205, "O_elongation": 15,
        "base_kc11": 1300, "base_mc": 0.24, "base_speed": 110,
        "base_taylor_C": 190, "base_taylor_n": 0.20,
        "density": 7530, "thermal_cond": 59, "elastic_mod": 110000,
        "tempers": ["O60"],
        "applications": ["valve_stems", "pump_parts", "bushings"]
    },
}

# Beryllium Copper
BERYLLIUM_COPPER = {
    "C17200": {
        "name": "C17200 Beryllium Copper", "uns": "C17200", "din": "2.1247", "en": "CW101C",
        "composition": {"Cu": 97.8, "Be": 1.9, "Co": 0.3},
        "O_tensile": 470, "O_yield": 195, "O_elongation": 45,
        "base_kc11": 1250, "base_mc": 0.24, "base_speed": 120,
        "base_taylor_C": 200, "base_taylor_n": 0.20,
        "density": 8250, "thermal_cond": 107, "elastic_mod": 131000,
        "tempers": ["TB00", "TD02", "TD04", "TF00"],
        "applications": ["springs", "electrical_contacts", "molds"],
        "notes": "Highest strength copper alloy - TOXIC dust!"
    },
    "C17500": {
        "name": "C17500 Beryllium Copper", "uns": "C17500", "din": "2.1285", "en": "CW104C",
        "composition": {"Cu": 97.2, "Co": 2.5, "Be": 0.3},
        "O_tensile": 310, "O_yield": 115, "O_elongation": 50,
        "base_kc11": 1100, "base_mc": 0.25, "base_speed": 140,
        "base_taylor_C": 230, "base_taylor_n": 0.22,
        "density": 8750, "thermal_cond": 209, "elastic_mod": 138000,
        "tempers": ["TB00", "TD02", "TD04", "TF00"],
        "applications": ["resistance_welding", "electrical_contacts"],
        "notes": "High conductivity version - TOXIC dust!"
    },
}

# Nickel Silver
NICKEL_SILVER = {
    "C75200": {
        "name": "C75200 Nickel Silver 65-18", "uns": "C75200", "din": "2.0740", "en": "CW409J",
        "composition": {"Cu": 65.0, "Ni": 18.0, "Zn": 17.0},
        "O_tensile": 390, "O_yield": 150, "O_elongation": 45,
        "base_kc11": 1200, "base_mc": 0.25, "base_speed": 140,
        "base_taylor_C": 220, "base_taylor_n": 0.22,
        "density": 8700, "thermal_cond": 33, "elastic_mod": 125000,
        "tempers": ["O60", "H01", "H02", "H04", "H06"],
        "applications": ["optical_parts", "musical_instruments", "jewelry"]
    },
    "C77000": {
        "name": "C77000 Nickel Silver 55-18", "uns": "C77000", "din": "2.0790", "en": "CW410J",
        "composition": {"Cu": 55.0, "Ni": 18.0, "Zn": 27.0},
        "O_tensile": 415, "O_yield": 165, "O_elongation": 40,
        "base_kc11": 1230, "base_mc": 0.24, "base_speed": 130,
        "base_taylor_C": 210, "base_taylor_n": 0.21,
        "density": 8500, "thermal_cond": 28, "elastic_mod": 130000,
        "tempers": ["O60", "H01", "H02", "H04", "H06"],
        "applications": ["springs", "contacts", "camera_parts"]
    },
}

# =============================================================================
# PHYSICS ADJUSTMENT FUNCTIONS
# =============================================================================

def adjust_machining_for_copper_temper(base_kc11, base_speed, base_taylor_C, temper, O_tensile, new_tensile, alloy_type):
    """Adjust machining parameters for copper temper"""
    ratio = new_tensile / O_tensile
    temper_data = COPPER_TEMPERS.get(temper, {"cold_work": 0, "desc": temper})
    
    if temper in ["O60", "O50"]:
        # Annealed - gummy, stringy chips
        kc11 = int(base_kc11 * 0.95)
        speed = int(base_speed * 0.80)  # Slower due to BUE
        taylor_C = int(base_taylor_C * 0.85)
        machinability = "Poor - gummy/stringy chips, built-up edge issues"
    elif temper.startswith("H"):
        # Work hardened - improving with hardness
        cold_work = temper_data.get("cold_work", 0.2)
        kc11 = int(base_kc11 * (1 + 0.12 * (ratio - 1)))
        speed = int(base_speed * (1 + 0.15 * cold_work))  # Better at higher hardness
        taylor_C = int(base_taylor_C * (1 - 0.08 * (ratio - 1)))
        if cold_work >= 0.6:
            machinability = "Very good - excellent chip control"
        elif cold_work >= 0.3:
            machinability = "Good - improved chip breaking"
        else:
            machinability = "Fair - moderate chip control"
    elif temper.startswith("T"):
        # Heat treated (BeCu)
        kc11 = int(base_kc11 * (1 + 0.20 * (ratio - 1)))
        speed = int(base_speed * 0.90)  # Slightly slower for aged
        taylor_C = int(base_taylor_C * (1 - 0.10 * (ratio - 1)))
        machinability = "Good - stable cutting, TOXIC dust hazard"
    else:
        kc11 = base_kc11
        speed = base_speed
        taylor_C = base_taylor_C
        machinability = "Standard"
    
    # Free-machining alloys (leaded)
    if "Pb" in alloy_type or "Free" in alloy_type:
        kc11 = int(kc11 * 0.85)
        speed = int(speed * 1.40)
        taylor_C = int(taylor_C * 1.25)
        machinability = machinability.replace("Poor", "Good").replace("Fair", "Very good")
        if "Poor" not in machinability and "Fair" not in machinability:
            machinability = "Excellent - " + machinability.split(" - ")[1] if " - " in machinability else "Excellent"
    
    return kc11, speed, taylor_C, machinability

def get_tooling_for_copper(temper, alloy_name):
    """Get appropriate tooling for copper alloys"""
    is_becu = "Beryllium" in alloy_name or "C172" in alloy_name or "C175" in alloy_name
    
    base_tooling = {
        "primary": "Uncoated Carbide or PCD",
        "insert_grade": "K10-K20 Uncoated",
        "coating": ["None", "TiN (optional)"],
        "geometry": "Sharp positive rake 10-15°, polished rake face",
        "coolant": "Flood coolant recommended",
        "notes": "High helix cutters, 2-3 flute for chip evacuation"
    }
    
    if temper in ["O60", "O50"]:
        base_tooling["notes"] = "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
    
    if is_becu:
        base_tooling["notes"] = "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
    
    return base_tooling

# =============================================================================
# MATERIAL GENERATION
# =============================================================================

def generate_copper_materials(alloy_dict, series_name, start_id):
    """Generate copper materials for all tempers"""
    materials = {}
    mat_id = start_id
    
    for alloy_key, alloy in alloy_dict.items():
        for temper in alloy["tempers"]:
            mat_id_str = f"N-CU-{mat_id:03d}"
            temper_data = COPPER_TEMPERS.get(temper, {"tensile_mult": 1.0, "yield_mult": 1.0, "elong_mult": 1.0, "desc": temper})
            
            # Calculate properties
            tensile = int(alloy["O_tensile"] * temper_data["tensile_mult"])
            yield_str = int(alloy["O_yield"] * temper_data["yield_mult"])
            elongation = int(alloy["O_elongation"] * temper_data["elong_mult"])
            
            # Calculate machining parameters
            kc11, speed, taylor_C, machinability = adjust_machining_for_copper_temper(
                alloy["base_kc11"], alloy["base_speed"], alloy["base_taylor_C"],
                temper, alloy["O_tensile"], tensile, alloy["name"]
            )
            
            # Build material
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{alloy['name']} {temper}",
                "designation": {
                    "uns": alloy["uns"],
                    "din": alloy.get("din", ""),
                    "en": alloy.get("en", "")
                },
                "iso_group": "N",
                "material_class": f"Copper - {series_name}",
                "condition": temper,
                "condition_description": temper_data["desc"],
                "composition": alloy["composition"],
                "physical": {
                    "density": alloy["density"],
                    "thermal_conductivity": alloy["thermal_cond"],
                    "elastic_modulus": alloy["elastic_mod"],
                    "poissons_ratio": 0.34
                },
                "mechanical": {
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": elongation}
                },
                "kienzle": {
                    "kc1_1": kc11,
                    "mc": alloy["base_mc"]
                },
                "taylor": {
                    "C": taylor_C,
                    "n": alloy["base_taylor_n"]
                },
                "recommended_cutting": {
                    "turning": {
                        "carbide": {
                            "speed": {
                                "min": int(speed * 0.75),
                                "opt": speed,
                                "max": int(speed * 1.35)
                            }
                        }
                    }
                },
                "machinability": machinability,
                "tooling": get_tooling_for_copper(temper, alloy["name"]),
                "applications": alloy["applications"]
            }
            
            if "notes" in alloy:
                materials[mat_id_str]["notes"] = alloy["notes"]
            
            mat_id += 1
    
    return materials, mat_id

# =============================================================================
# MAIN
# =============================================================================

def main():
    print("PRISM Copper Alloy Tempers Generator v1.0")
    print("=" * 60)
    
    all_materials = {}
    next_id = 101  # Start after existing copper
    
    # Generate pure copper
    pure_cu, next_id = generate_copper_materials(PURE_COPPER, "Pure Copper", next_id)
    all_materials.update(pure_cu)
    print(f"Generated {len(pure_cu)} pure copper materials")
    
    # Generate brass
    brass, next_id = generate_copper_materials(BRASS_ALLOYS, "Brass (Cu-Zn)", next_id)
    all_materials.update(brass)
    print(f"Generated {len(brass)} brass materials")
    
    # Generate bronze
    bronze, next_id = generate_copper_materials(BRONZE_ALLOYS, "Bronze (Cu-Sn)", next_id)
    all_materials.update(bronze)
    print(f"Generated {len(bronze)} bronze materials")
    
    # Generate silicon bronze
    si_bronze, next_id = generate_copper_materials(SILICON_BRONZE, "Silicon Bronze", next_id)
    all_materials.update(si_bronze)
    print(f"Generated {len(si_bronze)} silicon bronze materials")
    
    # Generate aluminum bronze
    al_bronze, next_id = generate_copper_materials(ALUMINUM_BRONZE, "Aluminum Bronze", next_id)
    all_materials.update(al_bronze)
    print(f"Generated {len(al_bronze)} aluminum bronze materials")
    
    # Generate beryllium copper
    becu, next_id = generate_copper_materials(BERYLLIUM_COPPER, "Beryllium Copper", next_id)
    all_materials.update(becu)
    print(f"Generated {len(becu)} beryllium copper materials")
    
    # Generate nickel silver
    ni_silver, next_id = generate_copper_materials(NICKEL_SILVER, "Nickel Silver", next_id)
    all_materials.update(ni_silver)
    print(f"Generated {len(ni_silver)} nickel silver materials")
    
    print(f"\nTOTAL: {len(all_materials)} new copper alloy materials")
    
    # Generate JavaScript output
    output = f'''/**
 * PRISM MATERIALS DATABASE - Copper Alloy Temper Conditions
 * File: copper_temper_conditions.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - Pure Copper: C10100, C10200, C11000 - O, H tempers
 * - Brass: C26000, C27000, C28000, C36000 - O, H tempers
 * - Phosphor Bronze: C51000, C52100, C54400 - O, H tempers
 * - Silicon Bronze: C65500 - O, H tempers
 * - Aluminum Bronze: C63000, C95400 - O, H tempers
 * - Beryllium Copper: C17200, C17500 - TB00, TD, TF tempers
 * - Nickel Silver: C75200, C77000 - O, H tempers
 * 
 * CRITICAL: Same alloy at different tempers = different machining!
 * - C26000 O60: Tensile 340 MPa, gummy, BUE issues
 * - C26000 H08: Tensile 585 MPa, excellent chip control
 * 
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */

const COPPER_TEMPER_CONDITIONS = {{
  metadata: {{
    file: "copper_temper_conditions.js",
    category: "N_NONFERROUS",
    materialCount: {len(all_materials)},
    coverage: {{
      pure_copper: {len(pure_cu)},
      brass: {len(brass)},
      bronze: {len(bronze)},
      silicon_bronze: {len(si_bronze)},
      aluminum_bronze: {len(al_bronze)},
      beryllium_copper: {len(becu)},
      nickel_silver: {len(ni_silver)}
    }}
  }},

  materials: {{
'''
    
    mat_items = list(all_materials.items())
    for i, (mat_id, mat_data) in enumerate(mat_items):
        output += f'    "{mat_id}": {json.dumps(mat_data, indent=6)}'
        if i < len(mat_items) - 1:
            output += ","
        output += "\n"
    
    output += '''  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = COPPER_TEMPER_CONDITIONS;
}
'''
    
    output_path = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials\N_NONFERROUS\copper_temper_conditions.js"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"\nOutput: {output_path}")
    print(f"File size: {len(output) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
