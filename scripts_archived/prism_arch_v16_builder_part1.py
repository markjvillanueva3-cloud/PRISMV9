#!/usr/bin/env python3
"""
PRISM COMPLETE ARCHITECTURE v16.0 - BUILDER
============================================
Builds the entire improved architecture with:
1. Constants Foundation (inherited, not wired)
2. Type System (schemas for every component)
3. Validators (at every boundary)
4. PRECISE wiring (5-15 per formula, not 245)
5. Hierarchical categorization
6. Cross-cutting concerns
"""

import json
import os
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib

REG_PATH = r"C:\PRISM\registries"

print("=" * 100)
print("PRISM COMPLETE ARCHITECTURE v16.0 BUILDER")
print("NO LIMITS - THEORETICAL MAXIMUM")
print("=" * 100)

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# LOAD EXISTING REGISTRIES
# ═══════════════════════════════════════════════════════════════════════════════════════════════════

def load_registry(name):
    path = os.path.join(REG_PATH, name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

print("\n[1/10] Loading existing registries...")

formula_reg = load_registry("FORMULA_REGISTRY.json")
engine_reg = load_registry("ENGINE_REGISTRY.json")
db_reg = load_registry("DATABASE_REGISTRY.json")
constants_reg = load_registry("CONSTANTS_FOUNDATION.json")
taxonomy_reg = load_registry("LAYER_TAXONOMY_v16.json")

formulas = formula_reg.get("formulas", []) if formula_reg else []
engines = engine_reg.get("engines", []) if engine_reg else []
databases = db_reg.get("databases", []) if db_reg else []

print(f"   Formulas: {len(formulas)}")
print(f"   Engines: {len(engines)}")
print(f"   Databases: {len(databases)}")
print(f"   Constants: {140 if constants_reg else 0}")
print(f"   Layers: {22 if taxonomy_reg else 0}")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# PART 2: TYPE SYSTEM (Schemas for all components)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════

print("\n[2/10] Building Type System...")

TYPE_SYSTEM = {
    "version": "1.0.0",
    "description": "Complete type definitions for all PRISM components",
    
    # Primitive Types
    "primitives": {
        "Number": {"type": "number", "variants": ["int", "float", "decimal"]},
        "String": {"type": "string", "maxLength": 10000},
        "Boolean": {"type": "boolean"},
        "DateTime": {"type": "string", "format": "date-time"},
        "UUID": {"type": "string", "format": "uuid"},
    },
    
    # Domain Types - Manufacturing
    "domain": {
        # Measurement with units
        "ValueWithUnit": {
            "type": "object",
            "properties": {
                "value": {"type": "number"},
                "unit": {"type": "string"},
                "uncertainty": {"type": "number", "optional": True},
                "confidence": {"type": "number", "min": 0, "max": 1, "optional": True},
            },
            "required": ["value", "unit"],
        },
        
        # Material Properties
        "MaterialInput": {
            "type": "object",
            "properties": {
                "material_id": {"type": "string"},
                "hardness": {"$ref": "#/domain/ValueWithUnit"},
                "tensile_strength": {"$ref": "#/domain/ValueWithUnit"},
                "density": {"$ref": "#/domain/ValueWithUnit"},
                "thermal_conductivity": {"$ref": "#/domain/ValueWithUnit"},
                "specific_heat": {"$ref": "#/domain/ValueWithUnit"},
                "kc1_1": {"type": "number", "description": "Kienzle specific cutting force"},
                "mc": {"type": "number", "description": "Kienzle exponent"},
            },
            "required": ["material_id"],
        },
        
        # Tool Geometry
        "ToolInput": {
            "type": "object",
            "properties": {
                "tool_id": {"type": "string"},
                "type": {"type": "string", "enum": ["endmill", "insert", "drill", "tap", "boring"]},
                "diameter": {"$ref": "#/domain/ValueWithUnit"},
                "length": {"$ref": "#/domain/ValueWithUnit"},
                "flutes": {"type": "integer", "min": 1},
                "helix_angle": {"$ref": "#/domain/ValueWithUnit"},
                "rake_angle": {"$ref": "#/domain/ValueWithUnit"},
                "relief_angle": {"$ref": "#/domain/ValueWithUnit"},
                "edge_radius": {"$ref": "#/domain/ValueWithUnit"},
                "coating": {"type": "string"},
                "grade": {"type": "string"},
            },
            "required": ["tool_id", "type", "diameter"],
        },
        
        # Machine Capabilities
        "MachineInput": {
            "type": "object",
            "properties": {
                "machine_id": {"type": "string"},
                "type": {"type": "string"},
                "controller": {"type": "string"},
                "spindle_max_rpm": {"type": "number"},
                "spindle_power": {"$ref": "#/domain/ValueWithUnit"},
                "spindle_torque_curve": {"type": "array"},
                "axis_config": {"type": "string"},
                "rapid_rate": {"$ref": "#/domain/ValueWithUnit"},
                "max_feed_rate": {"$ref": "#/domain/ValueWithUnit"},
            },
            "required": ["machine_id"],
        },
        
        # Cutting Parameters
        "CuttingParameters": {
            "type": "object",
            "properties": {
                "cutting_speed": {"$ref": "#/domain/ValueWithUnit", "description": "Vc in m/min"},
                "feed_per_tooth": {"$ref": "#/domain/ValueWithUnit", "description": "fz in mm/tooth"},
                "feed_rate": {"$ref": "#/domain/ValueWithUnit", "description": "f in mm/min"},
                "depth_of_cut": {"$ref": "#/domain/ValueWithUnit", "description": "ap in mm"},
                "width_of_cut": {"$ref": "#/domain/ValueWithUnit", "description": "ae in mm"},
                "spindle_speed": {"$ref": "#/domain/ValueWithUnit", "description": "n in rpm"},
            },
        },
        
        # Force Output
        "ForceOutput": {
            "type": "object",
            "properties": {
                "Fc": {"$ref": "#/domain/ValueWithUnit", "description": "Cutting force"},
                "Ff": {"$ref": "#/domain/ValueWithUnit", "description": "Feed force"},
                "Fp": {"$ref": "#/domain/ValueWithUnit", "description": "Passive force"},
                "Fr": {"$ref": "#/domain/ValueWithUnit", "description": "Resultant force"},
                "torque": {"$ref": "#/domain/ValueWithUnit", "description": "Spindle torque"},
            },
        },
        
        # Power Output
        "PowerOutput": {
            "type": "object",
            "properties": {
                "Pc": {"$ref": "#/domain/ValueWithUnit", "description": "Cutting power"},
                "Pm": {"$ref": "#/domain/ValueWithUnit", "description": "Motor power required"},
                "efficiency": {"type": "number", "min": 0, "max": 1},
                "specific_energy": {"$ref": "#/domain/ValueWithUnit"},
            },
        },
        
        # Tool Life Output
        "ToolLifeOutput": {
            "type": "object",
            "properties": {
                "tool_life": {"$ref": "#/domain/ValueWithUnit", "description": "T in minutes"},
                "volume_removed": {"$ref": "#/domain/ValueWithUnit"},
                "cost_per_part": {"$ref": "#/domain/ValueWithUnit"},
                "recommended_speed": {"$ref": "#/domain/ValueWithUnit"},
            },
        },
        
        # Surface Finish Output
        "SurfaceOutput": {
            "type": "object",
            "properties": {
                "Ra_theoretical": {"$ref": "#/domain/ValueWithUnit"},
                "Ra_actual": {"$ref": "#/domain/ValueWithUnit"},
                "Rz": {"$ref": "#/domain/ValueWithUnit"},
                "Rt": {"$ref": "#/domain/ValueWithUnit"},
            },
        },
    },
    
    # Formula Input/Output Schemas
    "formulas": {},  # Will be populated
    
    # Engine Interface Schemas
    "engines": {},  # Will be populated
}

# Generate formula schemas
formula_schemas = {}
for formula in formulas:
    fid = formula.get("id", "")
    cat = formula.get("category", "")
    
    # Determine input/output based on category
    if "CUT" in fid or "FORCE" in cat:
        schema = {
            "input": {"$ref": "#/domain/MaterialInput", "additionalProperties": ["CuttingParameters", "ToolInput"]},
            "output": {"$ref": "#/domain/ForceOutput"},
        }
    elif "THERM" in fid or "THERMAL" in cat:
        schema = {
            "input": {"$ref": "#/domain/MaterialInput", "additionalProperties": ["CuttingParameters", "ForceOutput"]},
            "output": {"type": "object", "properties": {"temperature": {"$ref": "#/domain/ValueWithUnit"}}},
        }
    elif "WEAR" in fid or "TOOL_LIFE" in cat:
        schema = {
            "input": {"$ref": "#/domain/MaterialInput", "additionalProperties": ["CuttingParameters", "ToolInput"]},
            "output": {"$ref": "#/domain/ToolLifeOutput"},
        }
    elif "SURF" in fid or "SURFACE" in cat:
        schema = {
            "input": {"$ref": "#/domain/CuttingParameters", "additionalProperties": ["ToolInput"]},
            "output": {"$ref": "#/domain/SurfaceOutput"},
        }
    elif "POWER" in fid:
        schema = {
            "input": {"$ref": "#/domain/ForceOutput", "additionalProperties": ["CuttingParameters"]},
            "output": {"$ref": "#/domain/PowerOutput"},
        }
    else:
        schema = {
            "input": {"type": "object"},
            "output": {"type": "object"},
        }
    
    formula_schemas[fid] = schema

TYPE_SYSTEM["formulas"] = formula_schemas
print(f"   Formula schemas: {len(formula_schemas)}")

# Save type system
type_path = os.path.join(REG_PATH, "TYPE_SYSTEM.json")
with open(type_path, 'w', encoding='utf-8') as f:
    json.dump(TYPE_SYSTEM, f, indent=2)
print(f"   Saved: {type_path}")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# PART 3: VALIDATORS (At every layer boundary)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════

print("\n[3/10] Building Validators...")

VALIDATORS = {
    "version": "1.0.0",
    "description": "Validation rules at every layer boundary - SAFETY CRITICAL",
    
    "categories": {
        # Type Validators
        "TYPE": {
            "V-TYPE-001": {"name": "IsNumber", "rule": "typeof value === 'number' && !isNaN(value)"},
            "V-TYPE-002": {"name": "IsPositive", "rule": "value > 0"},
            "V-TYPE-003": {"name": "IsNonNegative", "rule": "value >= 0"},
            "V-TYPE-004": {"name": "IsInRange", "rule": "value >= min && value <= max"},
            "V-TYPE-005": {"name": "IsString", "rule": "typeof value === 'string'"},
            "V-TYPE-006": {"name": "IsArray", "rule": "Array.isArray(value)"},
            "V-TYPE-007": {"name": "IsObject", "rule": "typeof value === 'object' && value !== null"},
            "V-TYPE-008": {"name": "HasRequiredFields", "rule": "required.every(f => f in obj)"},
        },
        
        # Physics Validators - SAFETY CRITICAL
        "PHYSICS": {
            "V-PHYS-001": {"name": "SpindleSpeedLimit", "rule": "rpm > 0 && rpm <= machine.spindle_max_rpm", "severity": "CRITICAL"},
            "V-PHYS-002": {"name": "FeedRateLimit", "rule": "feed > 0 && feed <= machine.max_feed_rate", "severity": "CRITICAL"},
            "V-PHYS-003": {"name": "DepthOfCutLimit", "rule": "doc > 0 && doc <= tool.max_doc", "severity": "CRITICAL"},
            "V-PHYS-004": {"name": "WidthOfCutLimit", "rule": "woc > 0 && woc <= tool.diameter", "severity": "HIGH"},
            "V-PHYS-005": {"name": "ChipThicknessMin", "rule": "h >= MIN_CHIP_THICKNESS", "severity": "MEDIUM"},
            "V-PHYS-006": {"name": "CuttingSpeedLimit", "rule": "Vc > 0 && Vc <= material.max_Vc", "severity": "HIGH"},
            "V-PHYS-007": {"name": "ForceReasonable", "rule": "Fc > 0 && Fc < MAX_FORCE_THRESHOLD", "severity": "CRITICAL"},
            "V-PHYS-008": {"name": "PowerAvailable", "rule": "Pc <= machine.spindle_power * efficiency", "severity": "CRITICAL"},
            "V-PHYS-009": {"name": "TorqueAvailable", "rule": "torque <= machine.torque_at_rpm(rpm)", "severity": "CRITICAL"},
            "V-PHYS-010": {"name": "TemperatureLimit", "rule": "T < tool.max_temperature", "severity": "HIGH"},
        },
        
        # Tool Validators - SAFETY CRITICAL
        "TOOL": {
            "V-TOOL-001": {"name": "ToolDiameterPositive", "rule": "diameter > 0", "severity": "CRITICAL"},
            "V-TOOL-002": {"name": "ToolLengthPositive", "rule": "length > 0", "severity": "CRITICAL"},
            "V-TOOL-003": {"name": "FlutesPositive", "rule": "flutes >= 1", "severity": "HIGH"},
            "V-TOOL-004": {"name": "HelixAngleValid", "rule": "helix >= 0 && helix <= 60", "severity": "MEDIUM"},
            "V-TOOL-005": {"name": "RakeAngleValid", "rule": "rake >= -20 && rake <= 30", "severity": "MEDIUM"},
            "V-TOOL-006": {"name": "ReliefAngleValid", "rule": "relief >= 3 && relief <= 20", "severity": "MEDIUM"},
            "V-TOOL-007": {"name": "ToolStrength", "rule": "force < tool.max_force", "severity": "CRITICAL"},
            "V-TOOL-008": {"name": "ToolDeflection", "rule": "deflection < max_deflection", "severity": "HIGH"},
            "V-TOOL-009": {"name": "ToolLifePositive", "rule": "tool_life > 0", "severity": "HIGH"},
            "V-TOOL-010": {"name": "ChipLoadValid", "rule": "fz >= 0.01 && fz <= 0.5", "severity": "HIGH"},
        },
        
        # Machine Validators - SAFETY CRITICAL
        "MACHINE": {
            "V-MACH-001": {"name": "WithinEnvelope", "rule": "all_coords_within_travel", "severity": "CRITICAL"},
            "V-MACH-002": {"name": "SpindlePowerOK", "rule": "power_required <= power_available", "severity": "CRITICAL"},
            "V-MACH-003": {"name": "SpindleTorqueOK", "rule": "torque_required <= torque_available", "severity": "CRITICAL"},
            "V-MACH-004": {"name": "RapidClearance", "rule": "clearance >= safe_clearance", "severity": "CRITICAL"},
            "V-MACH-005": {"name": "ToolFits", "rule": "tool_length <= max_tool_length", "severity": "CRITICAL"},
            "V-MACH-006": {"name": "ATCCapacity", "rule": "tool_count <= atc_capacity", "severity": "HIGH"},
            "V-MACH-007": {"name": "AxisLimits", "rule": "all_axes_within_limits", "severity": "CRITICAL"},
            "V-MACH-008": {"name": "AccelerationOK", "rule": "accel <= max_accel", "severity": "HIGH"},
        },
        
        # Material Validators
        "MATERIAL": {
            "V-MAT-001": {"name": "HardnessValid", "rule": "hardness > 0 && hardness < 10000", "severity": "HIGH"},
            "V-MAT-002": {"name": "DensityValid", "rule": "density > 0 && density < 25000", "severity": "MEDIUM"},
            "V-MAT-003": {"name": "KienzleValid", "rule": "kc1_1 > 0 && mc > 0 && mc < 1", "severity": "HIGH"},
            "V-MAT-004": {"name": "ThermalValid", "rule": "k > 0 && cp > 0", "severity": "MEDIUM"},
            "V-MAT-005": {"name": "StrengthValid", "rule": "tensile > 0 && yield > 0 && yield <= tensile", "severity": "HIGH"},
        },
        
        # Business Validators
        "BUSINESS": {
            "V-BUS-001": {"name": "CostPositive", "rule": "cost >= 0", "severity": "MEDIUM"},
            "V-BUS-002": {"name": "TimePositive", "rule": "time >= 0", "severity": "MEDIUM"},
            "V-BUS-003": {"name": "QuantityPositive", "rule": "quantity >= 1", "severity": "MEDIUM"},
            "V-BUS-004": {"name": "EfficiencyValid", "rule": "efficiency > 0 && efficiency <= 1", "severity": "LOW"},
        },
        
        # PRISM Quality Validators
        "PRISM": {
            "V-PRISM-001": {"name": "SafetyThreshold", "rule": "S >= 0.70", "severity": "CRITICAL", "enforcement": "HARD_BLOCK"},
            "V-PRISM-002": {"name": "OmegaThreshold", "rule": "Omega >= 0.70", "severity": "HIGH", "enforcement": "WARN"},
            "V-PRISM-003": {"name": "ReasoningThreshold", "rule": "R >= 0.60", "severity": "MEDIUM", "enforcement": "WARN"},
            "V-PRISM-004": {"name": "CodeThreshold", "rule": "C >= 0.70", "severity": "MEDIUM", "enforcement": "WARN"},
            "V-PRISM-005": {"name": "ProcessThreshold", "rule": "P >= 0.60", "severity": "MEDIUM", "enforcement": "WARN"},
            "V-PRISM-006": {"name": "EvidenceLevel", "rule": "evidence >= L3", "severity": "HIGH", "enforcement": "BLOCK"},
            "V-PRISM-007": {"name": "AntiRegression", "rule": "new_count >= old_count", "severity": "CRITICAL", "enforcement": "HARD_BLOCK"},
        },
    },
    
    # Boundary Validators (what gets validated at each layer transition)
    "boundaries": {
        "DATABASE_TO_TRANSFORMER": ["V-TYPE-001", "V-TYPE-007", "V-TYPE-008"],
        "TRANSFORMER_TO_FORMULA": ["V-MAT-001", "V-MAT-002", "V-MAT-003", "V-TOOL-001", "V-MACH-001"],
        "FORMULA_TO_ENGINE": ["V-TYPE-001", "V-TYPE-004", "V-PHYS-005", "V-PHYS-006"],
        "ENGINE_TO_SKILL": ["V-PHYS-001", "V-PHYS-002", "V-PHYS-007", "V-PHYS-008", "V-TOOL-007"],
        "SKILL_TO_SERVICE": ["V-PRISM-001", "V-PRISM-002", "V-MACH-002", "V-MACH-003"],
        "SERVICE_TO_PRODUCT": ["V-PRISM-001", "V-BUS-001", "V-BUS-002"],
    },
}

# Count validators
total_validators = sum(len(v) for v in VALIDATORS["categories"].values())
critical_validators = sum(1 for cat in VALIDATORS["categories"].values() 
                         for v in cat.values() if v.get("severity") == "CRITICAL")

print(f"   Total validators: {total_validators}")
print(f"   CRITICAL validators: {critical_validators}")
print(f"   Boundaries defined: {len(VALIDATORS['boundaries'])}")

# Save validators
val_path = os.path.join(REG_PATH, "VALIDATORS.json")
with open(val_path, 'w', encoding='utf-8') as f:
    json.dump(VALIDATORS, f, indent=2)
print(f"   Saved: {val_path}")
