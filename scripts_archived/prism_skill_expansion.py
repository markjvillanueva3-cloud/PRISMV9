#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE SKILL EXPANSION SYSTEM v1.0
=============================================
Generates COMPLETE skill coverage for ALL PRISM domains.

CURRENT STATE: 141 skills indexed
TARGET: 500+ skills with ZERO gaps

DOMAINS TO COVER:
1. MATERIALS (1,047 × 127 parameters) - Per-category, per-property-group skills
2. MACHINES (824 × 43 manufacturers) - Per-type, per-manufacturer skills  
3. TOOLS - Selection, geometry, coatings, holders, life calculation
4. CONTROLLERS (12 families) - Per-controller programming skills
5. ALARMS (9,200 codes) - Per-family diagnostic skills
6. PHYSICS - Force, thermal, vibration, surface, deflection
7. AI/ML (27 modules) - Algorithm, training, inference, optimization
8. CAD/CAM - Features, toolpaths, post-processing, simulation
9. QUALITY - Validation, verification, evidence, gates
10. SESSION - State, checkpoints, handoff, recovery
11. PRODUCTS - Speed/Feed, Post Processor, Shop Manager, Auto CNC
12. INTEGRATION - APIs, file I/O, external systems

DESIGN PRINCIPLE: Every piece of PRISM functionality MUST have a skill.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# SKILL SCHEMA
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SkillDefinition:
    """Complete skill definition with all metadata."""
    id: str
    name: str
    category: str
    subcategory: str
    description: str
    version: str
    priority: int  # 0=Critical, 10=High, 50=Normal, 100=Low
    complexity: str  # BASIC, INTERMEDIATE, ADVANCED, EXPERT
    dependencies: List[str]
    consumers: List[str]
    hooks: List[str]
    formulas: List[str]
    agents: List[str]
    capabilities: List[str]
    inputs: List[Dict]
    outputs: List[Dict]
    examples: List[str]
    status: str  # DEFINED, IMPLEMENTED, TESTED, VALIDATED
    
    def to_dict(self) -> Dict:
        return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: MATERIAL SKILLS (127 parameters need comprehensive coverage)
# ═══════════════════════════════════════════════════════════════════════════════

MATERIAL_SKILLS = []

# Material Category Skills (ISO 513 - 6 categories)
MATERIAL_CATEGORIES = [
    ("P", "Steel", "Carbon steels, alloy steels, tool steels - ferrous materials with long chips"),
    ("M", "Stainless Steel", "Austenitic, ferritic, martensitic, duplex, PH stainless steels"),
    ("K", "Cast Iron", "Gray, ductile, malleable, CGI cast irons - abrasive materials"),
    ("N", "Non-Ferrous", "Aluminum, copper, brass, bronze, magnesium, zinc alloys"),
    ("S", "Superalloys", "Nickel, cobalt, titanium alloys - heat-resistant materials"),
    ("H", "Hardened Steel", "Hardened steels 45-65 HRC - requires CBN/ceramic tooling")
]

for cat_code, cat_name, cat_desc in MATERIAL_CATEGORIES:
    MATERIAL_SKILLS.append(SkillDefinition(
        id=f"prism-material-category-{cat_code.lower()}",
        name=f"Material Category {cat_code}: {cat_name}",
        category="MATERIAL",
        subcategory="CATEGORY",
        description=f"Expert knowledge for ISO 513 Category {cat_code} materials. {cat_desc}",
        version="1.0.0",
        priority=20,
        complexity="ADVANCED",
        dependencies=["prism-material-schema", "prism-material-physics"],
        consumers=["speed-feed-calculator", "tool-selector", "post-processor"],
        hooks=[f"material:category:{cat_code}", f"material:lookup:{cat_code.lower()}"],
        formulas=["F-CUT-001", "F-LIFE-001", "F-THERM-001"],
        agents=["material_lookup", "cutting_mechanics"],
        capabilities=[
            f"Identify {cat_name.lower()} materials by composition",
            f"Recommend cutting parameters for {cat_name.lower()}",
            f"Select appropriate tooling for {cat_name.lower()}",
            f"Predict chip formation in {cat_name.lower()}",
            f"Calculate forces/power for {cat_name.lower()}"
        ],
        inputs=[{"name": "material_id", "type": "string"}, {"name": "operation", "type": "string"}],
        outputs=[{"name": "recommendations", "type": "object"}, {"name": "warnings", "type": "array"}],
        examples=[f"Get cutting parameters for {cat_name}", f"Select tools for {cat_name}"],
        status="DEFINED"
    ))

# Material Property Group Skills (10 groups × 127 params distributed)
PROPERTY_GROUPS = [
    ("identification", "Material Identification", 
     ["material_id", "name", "uns_number", "common_names", "iso_513_category", "material_group", "subgroup", "specification", "standard", "version"],
     "Identifies materials by name, UNS number, specification, and classification"),
    
    ("physical", "Physical Properties",
     ["density", "melting_point", "boiling_point", "specific_heat", "thermal_conductivity", "thermal_diffusivity", "thermal_expansion", "electrical_resistivity", "magnetic_permeability", "crystal_structure", "atomic_number", "atomic_weight", "lattice_parameter", "poisson_ratio", "bulk_modulus"],
     "Physical property lookup and validation - density, thermal, electrical, crystallographic"),
    
    ("mechanical", "Mechanical Properties",
     ["tensile_strength", "yield_strength", "elongation", "reduction_of_area", "elastic_modulus", "shear_modulus", "fatigue_strength", "impact_strength", "fracture_toughness", "hardness_hrc", "hardness_hb", "hardness_hv", "hardness_hra", "creep_strength", "stress_rupture", "compressive_strength", "flexural_strength", "torsional_strength", "wear_resistance", "abrasion_resistance", "galling_resistance", "notch_sensitivity", "ductility", "malleability", "work_hardening_rate"],
     "Mechanical property lookup - strength, hardness, toughness, wear resistance"),
    
    ("kienzle", "Kienzle Cutting Force Coefficients",
     ["kc1_1", "mc", "kc_correction_speed", "kc_correction_rake", "kc_correction_wear", "specific_cutting_force", "cutting_force_constant", "feed_exponent", "depth_exponent", "material_constant_k"],
     "Kienzle model coefficients for cutting force calculation: Fc = kc1.1 × h^(-mc) × b"),
    
    ("taylor", "Taylor Tool Life Coefficients",
     ["taylor_C", "taylor_n", "taylor_reference_speed", "taylor_reference_life", "speed_exponent", "feed_exponent_taylor", "depth_exponent_taylor", "hardness_factor"],
     "Taylor tool life equation coefficients: VT^n = C"),
    
    ("johnson_cook", "Johnson-Cook Constitutive Model",
     ["jc_A", "jc_B", "jc_n", "jc_C", "jc_m", "jc_reference_strain_rate", "jc_reference_temperature", "jc_melting_temperature", "jc_thermal_softening", "jc_strain_hardening", "jc_strain_rate_sensitivity", "jc_damage_parameters"],
     "Johnson-Cook flow stress model for FEM simulation and high-speed machining"),
    
    ("chip_formation", "Chip Formation Characteristics",
     ["chip_type_tendency", "chip_breaking_index", "chip_curl_radius", "chip_thickness_ratio", "built_up_edge_tendency", "adhesion_coefficient", "friction_coefficient", "shear_plane_angle", "chip_compression_ratio", "chip_segmentation", "chip_color", "chip_disposal_rating"],
     "Chip formation prediction - type, breaking, BUE tendency, friction"),
    
    ("thermal_cutting", "Thermal Cutting Properties",
     ["cutting_temperature_coefficient", "heat_partition_ratio", "thermal_number", "peclet_number", "thermal_diffusion_length", "flash_temperature", "bulk_temperature", "interface_temperature", "thermal_softening_onset", "thermal_damage_threshold"],
     "Thermal analysis for cutting - temperature prediction, heat partition, damage thresholds"),
    
    ("machinability", "Machinability Ratings",
     ["machinability_rating", "machinability_index", "relative_machinability", "machinability_group", "recommended_speed_factor", "recommended_feed_factor", "surface_finish_capability", "dimensional_stability", "burr_formation_tendency", "work_hardening_severity"],
     "Machinability assessment - ratings, recommendations, surface finish capability"),
    
    ("surface_integrity", "Surface Integrity Properties",
     ["surface_roughness_achievable", "residual_stress_tendency", "white_layer_risk", "metallurgical_damage_risk", "microhardness_change", "grain_refinement", "phase_transformation_risk", "recast_layer_risk"],
     "Surface integrity prediction - residual stress, metallurgical damage, white layer")
]

for group_id, group_name, params, group_desc in PROPERTY_GROUPS:
    MATERIAL_SKILLS.append(SkillDefinition(
        id=f"prism-material-{group_id}",
        name=f"Material {group_name}",
        category="MATERIAL",
        subcategory="PROPERTY_GROUP",
        description=group_desc,
        version="1.0.0",
        priority=30,
        complexity="INTERMEDIATE",
        dependencies=["prism-material-schema"],
        consumers=["speed-feed-calculator", "physics-engines", "ai-ml-engines"],
        hooks=[f"material:param:{p}:get" for p in params[:5]] + [f"material:{group_id}:lookup"],
        formulas=["F-CUT-001"] if "kienzle" in group_id else ["F-LIFE-001"] if "taylor" in group_id else [],
        agents=["material_lookup", "estimator"],
        capabilities=[
            f"Retrieve {group_name.lower()} for any material",
            f"Validate {group_name.lower()} against physical constraints",
            f"Estimate missing {group_name.lower()} from related data",
            f"Convert units for {group_name.lower()}"
        ],
        inputs=[{"name": "material_id", "type": "string"}],
        outputs=[{"name": "properties", "type": "object"}],
        examples=[f"Get {group_name.lower()} for 4140 steel"],
        status="DEFINED"
    ))

# Material Operation Skills
MATERIAL_OPERATIONS = [
    ("lookup", "Material Lookup", "Search and retrieve materials by various criteria"),
    ("validation", "Material Validation", "Validate material data completeness and physical consistency"),
    ("estimation", "Material Estimation", "Estimate missing parameters from available data"),
    ("conversion", "Material Conversion", "Convert material properties between unit systems"),
    ("comparison", "Material Comparison", "Compare materials for selection decisions"),
    ("enhancement", "Material Enhancement", "Enhance material records with derived/estimated data"),
    ("gap-analysis", "Material Gap Analysis", "Identify and prioritize missing material data"),
    ("source-verification", "Material Source Verification", "Verify and grade material data sources"),
    ("alias-resolution", "Material Alias Resolution", "Resolve material aliases to canonical names"),
    ("condition-matching", "Material Condition Matching", "Match materials to heat treatment conditions")
]

for op_id, op_name, op_desc in MATERIAL_OPERATIONS:
    MATERIAL_SKILLS.append(SkillDefinition(
        id=f"prism-material-{op_id}",
        name=op_name,
        category="MATERIAL",
        subcategory="OPERATION",
        description=op_desc,
        version="1.0.0",
        priority=40,
        complexity="INTERMEDIATE",
        dependencies=["prism-material-schema"],
        consumers=["speed-feed-calculator", "material-database"],
        hooks=[f"material:{op_id.replace('-', '_')}"],
        formulas=[],
        agents=["material_lookup"],
        capabilities=[f"Perform {op_name.lower()} operations"],
        inputs=[{"name": "query", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"{op_name} example"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: MACHINE SKILLS (824 machines × 43 manufacturers)
# ═══════════════════════════════════════════════════════════════════════════════

MACHINE_SKILLS = []

# Machine Type Skills
MACHINE_TYPES = [
    ("vmc", "Vertical Machining Center", "3-axis vertical mills with ATC"),
    ("hmc", "Horizontal Machining Center", "Horizontal spindle with pallet changer"),
    ("5axis-vmc", "5-Axis VMC", "Vertical machining center with A/B or A/C axes"),
    ("5axis-hmc", "5-Axis HMC", "Horizontal machining center with B/C axes"),
    ("lathe-2axis", "2-Axis CNC Lathe", "Standard turning with X/Z axes"),
    ("lathe-live", "Live Tooling Lathe", "Turning center with driven tools"),
    ("mill-turn", "Mill-Turn Center", "Combined turning and milling capability"),
    ("swiss", "Swiss-Type Lathe", "Sliding headstock for precision small parts"),
    ("multispindle", "Multi-Spindle Automatic", "Multiple spindles for high production"),
    ("vtl", "Vertical Turret Lathe", "Large vertical turning for heavy parts"),
    ("boring", "Horizontal Boring Mill", "Large horizontal boring and milling"),
    ("gantry", "Gantry Mill", "Large bridge-type machining center"),
    ("router", "CNC Router", "High-speed routing for soft materials"),
    ("edm-wire", "Wire EDM", "Electrical discharge wire cutting"),
    ("edm-sinker", "Sinker EDM", "Electrical discharge die sinking"),
    ("grinder-surface", "Surface Grinder", "Precision flat surface grinding"),
    ("grinder-cylindrical", "Cylindrical Grinder", "OD/ID precision grinding"),
    ("grinder-centerless", "Centerless Grinder", "High-volume cylindrical grinding"),
    ("laser", "Laser Cutting", "Laser cutting and engraving"),
    ("waterjet", "Waterjet Cutting", "Abrasive waterjet cutting")
]

for type_id, type_name, type_desc in MACHINE_TYPES:
    MACHINE_SKILLS.append(SkillDefinition(
        id=f"prism-machine-type-{type_id}",
        name=f"Machine Type: {type_name}",
        category="MACHINE",
        subcategory="TYPE",
        description=f"Expert knowledge for {type_name} machines. {type_desc}",
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-machine-schema"],
        consumers=["machine-selector", "post-processor", "cam-programmer"],
        hooks=[f"machine:type:{type_id}", f"machine:lookup:{type_id}"],
        formulas=[],
        agents=["machine_specialist"],
        capabilities=[
            f"Identify {type_name} capabilities and limitations",
            f"Recommend operations suitable for {type_name}",
            f"Configure post processor for {type_name}",
            f"Validate part compatibility with {type_name}"
        ],
        inputs=[{"name": "machine_id", "type": "string"}, {"name": "part", "type": "object"}],
        outputs=[{"name": "compatibility", "type": "object"}, {"name": "recommendations", "type": "array"}],
        examples=[f"Check if part fits on {type_name}"],
        status="DEFINED"
    ))

# Machine Manufacturer Skills (Top 20 manufacturers)
MANUFACTURERS = [
    ("dmg-mori", "DMG MORI", 85, "Premium German-Japanese machining centers"),
    ("mazak", "Mazak", 75, "Japanese machining centers and turning centers"),
    ("haas", "Haas", 65, "American value-oriented CNC machines"),
    ("okuma", "Okuma", 55, "Japanese high-precision machining"),
    ("makino", "Makino", 45, "High-speed machining specialists"),
    ("fanuc", "FANUC Robodrill", 30, "Compact high-speed drilling centers"),
    ("doosan", "Doosan", 50, "Korean full-line manufacturer"),
    ("hermle", "Hermle", 35, "German 5-axis specialists"),
    ("gf-machining", "GF Machining Solutions", 40, "Swiss precision EDM and milling"),
    ("matsuura", "Matsuura", 35, "Japanese multi-pallet specialists"),
    ("hurco", "Hurco", 30, "Conversational programming specialists"),
    ("kitamura", "Kitamura", 25, "Japanese precision horizontals"),
    ("toyoda", "Toyoda", 25, "Japanese grinding and machining"),
    ("chiron", "Chiron", 20, "German high-speed machining"),
    ("brother", "Brother", 20, "Compact high-speed tapping centers"),
    ("hardinge", "Hardinge", 20, "American precision turning"),
    ("citizen", "Citizen", 25, "Swiss-type lathe specialists"),
    ("star", "Star Micronics", 20, "Swiss-type precision turning"),
    ("tornos", "Tornos", 15, "Swiss multi-spindle experts"),
    ("sodick", "Sodick", 15, "Japanese EDM specialists")
]

for mfr_id, mfr_name, machine_count, mfr_desc in MANUFACTURERS:
    MACHINE_SKILLS.append(SkillDefinition(
        id=f"prism-machine-mfr-{mfr_id}",
        name=f"Manufacturer: {mfr_name}",
        category="MACHINE",
        subcategory="MANUFACTURER",
        description=f"{mfr_name} machine specifications and programming. {mfr_desc}. {machine_count} models in database.",
        version="1.0.0",
        priority=40,
        complexity="ADVANCED",
        dependencies=["prism-machine-schema", "prism-controller-mapping"],
        consumers=["machine-selector", "post-processor"],
        hooks=[f"machine:mfr:{mfr_id}", f"machine:lookup:manufacturer:{mfr_id}"],
        formulas=[],
        agents=["machine_specialist"],
        capabilities=[
            f"Access {mfr_name} machine specifications",
            f"Identify {mfr_name} controller configurations",
            f"Generate {mfr_name}-specific post processor settings",
            f"Troubleshoot {mfr_name} machine issues"
        ],
        inputs=[{"name": "model", "type": "string"}],
        outputs=[{"name": "specifications", "type": "object"}],
        examples=[f"Get specs for {mfr_name} machine"],
        status="DEFINED"
    ))

# Machine Specification Skills
MACHINE_SPECS = [
    ("envelope", "Machine Envelope", "Work envelope and travel limits"),
    ("spindle", "Spindle Specifications", "Speed, power, torque curves"),
    ("axis-dynamics", "Axis Dynamics", "Rapids, feeds, acceleration, jerk"),
    ("accuracy", "Machine Accuracy", "Positioning and repeatability specs"),
    ("tooling", "Tool Changer", "ATC capacity, change time, tool handling"),
    ("coolant", "Coolant System", "Coolant type, pressure, through-spindle"),
    ("workholding", "Workholding", "Table, chuck, fixtures, clamping"),
    ("controller", "Controller Specs", "Control system and features"),
    ("options", "Machine Options", "Available and installed options"),
    ("maintenance", "Maintenance", "Service intervals and requirements"),
    ("kinematics", "Machine Kinematics", "Kinematic configuration and limits"),
    ("safety", "Safety Systems", "Interlocks, guards, emergency stop")
]

for spec_id, spec_name, spec_desc in MACHINE_SPECS:
    MACHINE_SKILLS.append(SkillDefinition(
        id=f"prism-machine-spec-{spec_id}",
        name=f"Machine {spec_name}",
        category="MACHINE",
        subcategory="SPECIFICATION",
        description=spec_desc,
        version="1.0.0",
        priority=40,
        complexity="INTERMEDIATE",
        dependencies=["prism-machine-schema"],
        consumers=["machine-selector", "physics-engines", "safety-checker"],
        hooks=[f"machine:spec:{spec_id}:get", f"machine:spec:{spec_id}:validate"],
        formulas=[],
        agents=["machine_specialist"],
        capabilities=[f"Retrieve and validate {spec_name.lower()}"],
        inputs=[{"name": "machine_id", "type": "string"}],
        outputs=[{"name": spec_id, "type": "object"}],
        examples=[f"Get {spec_name.lower()} for machine"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: TOOL SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

TOOL_SKILLS = []

# Tool Type Skills
TOOL_TYPES = [
    ("endmill", "End Mill", "Peripheral and slot milling"),
    ("facemill", "Face Mill", "Face milling with indexable inserts"),
    ("ballnose", "Ball Nose End Mill", "3D contouring and finishing"),
    ("bullnose", "Bull Nose End Mill", "Corner radius end mills"),
    ("chamfer", "Chamfer Mill", "Chamfering and deburring"),
    ("drill", "Twist Drill", "Hole drilling"),
    ("centerdrill", "Center Drill", "Starting holes for drilling"),
    ("spotdrill", "Spot Drill", "Spotting and chamfering"),
    ("reamer", "Reamer", "Hole finishing for size/finish"),
    ("tap", "Tap", "Thread cutting"),
    ("threadmill", "Thread Mill", "Thread milling"),
    ("boring-bar", "Boring Bar", "Hole enlargement and finishing"),
    ("insert-drill", "Indexable Drill", "Large hole drilling"),
    ("spade-drill", "Spade Drill", "Flat-bottom holes"),
    ("countersink", "Countersink", "Countersinking holes"),
    ("counterbore", "Counterbore", "Counterboring holes"),
    ("slotdrill", "Slot Drill", "Slotting and pocketing"),
    ("rougher", "Roughing End Mill", "High MRR roughing"),
    ("finisher", "Finishing End Mill", "High-quality finishing"),
    ("form-tool", "Form Tool", "Custom profile cutting")
]

for tool_id, tool_name, tool_desc in TOOL_TYPES:
    TOOL_SKILLS.append(SkillDefinition(
        id=f"prism-tool-type-{tool_id}",
        name=f"Tool Type: {tool_name}",
        category="TOOL",
        subcategory="TYPE",
        description=f"Expert knowledge for {tool_name} tools. {tool_desc}",
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-tool-schema"],
        consumers=["tool-selector", "speed-feed-calculator", "cam-programmer"],
        hooks=[f"tool:type:{tool_id}", f"tool:select:{tool_id}"],
        formulas=["F-CUT-001", "F-LIFE-001"],
        agents=["tool_selector"],
        capabilities=[
            f"Select optimal {tool_name.lower()} for operation",
            f"Calculate cutting parameters for {tool_name.lower()}",
            f"Estimate tool life for {tool_name.lower()}",
            f"Recommend holder for {tool_name.lower()}"
        ],
        inputs=[{"name": "operation", "type": "object"}, {"name": "material", "type": "string"}],
        outputs=[{"name": "tool_recommendation", "type": "object"}],
        examples=[f"Select {tool_name.lower()} for aluminum pocket"],
        status="DEFINED"
    ))

# Tool Property Skills
TOOL_PROPERTIES = [
    ("geometry", "Tool Geometry", "Diameter, length, flutes, helix, rake, relief"),
    ("coating", "Tool Coating", "TiN, TiAlN, AlTiN, DLC, diamond coatings"),
    ("grade", "Carbide Grade", "Substrate grades and applications"),
    ("holder", "Tool Holder", "Collet, hydraulic, shrink-fit, end mill holders"),
    ("stickout", "Tool Stickout", "Extension and overhang calculations"),
    ("deflection", "Tool Deflection", "Deflection analysis and limits"),
    ("wear", "Tool Wear", "Wear patterns and monitoring"),
    ("life", "Tool Life", "Life prediction and optimization"),
    ("breakage", "Tool Breakage", "Breakage risk assessment"),
    ("chipload", "Chip Load", "Feed per tooth calculations"),
    ("speed", "Cutting Speed", "Surface speed calculations"),
    ("feed", "Feed Rate", "Feed rate calculations"),
    ("depth", "Depth of Cut", "Axial and radial depth limits")
]

for prop_id, prop_name, prop_desc in TOOL_PROPERTIES:
    TOOL_SKILLS.append(SkillDefinition(
        id=f"prism-tool-{prop_id}",
        name=f"Tool {prop_name}",
        category="TOOL",
        subcategory="PROPERTY",
        description=prop_desc,
        version="1.0.0",
        priority=40,
        complexity="INTERMEDIATE",
        dependencies=["prism-tool-schema"],
        consumers=["tool-selector", "speed-feed-calculator"],
        hooks=[f"tool:{prop_id}:calculate", f"tool:{prop_id}:validate"],
        formulas=["F-CUT-001", "F-DEF-001"] if prop_id == "deflection" else [],
        agents=["tool_selector", "cutting_mechanics"],
        capabilities=[f"Calculate and validate tool {prop_name.lower()}"],
        inputs=[{"name": "tool", "type": "object"}, {"name": "operation", "type": "object"}],
        outputs=[{"name": prop_id, "type": "number"}],
        examples=[f"Calculate {prop_name.lower()} for tool"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: CONTROLLER SKILLS (12 families)
# ═══════════════════════════════════════════════════════════════════════════════

CONTROLLER_SKILLS = []

# Controller Family Skills
CONTROLLER_FAMILIES = [
    ("fanuc", "FANUC", "Most common CNC controller worldwide", ["0i", "30i", "31i", "32i", "35i"]),
    ("siemens", "Siemens SINUMERIK", "German industrial controllers", ["808D", "828D", "840D", "840D sl"]),
    ("heidenhain", "Heidenhain TNC", "German conversational controllers", ["TNC 320", "TNC 530", "TNC 640"]),
    ("mazak", "Mazak Mazatrol", "Mazak proprietary conversational", ["SmoothG", "SmoothX", "Matrix"]),
    ("okuma", "Okuma OSP", "Okuma proprietary controls", ["OSP-P200", "OSP-P300", "OSP-P500"]),
    ("haas", "Haas Control", "Haas proprietary FANUC-based", ["NGC", "Classic"]),
    ("mitsubishi", "Mitsubishi MELDAS", "Japanese industrial controllers", ["M70", "M80", "M800"]),
    ("brother", "Brother CNC", "Brother proprietary controls", ["C00"]),
    ("hurco", "Hurco WinMax", "Conversational programming", ["WinMax"]),
    ("fagor", "Fagor CNC", "Spanish controllers", ["8055", "8060", "8070"]),
    ("dmg", "DMG MORI CELOS", "DMG MORI interface system", ["CELOS"]),
    ("doosan", "Doosan/FANUC", "FANUC-based with Doosan customization", ["FANUC-based"])
]

for ctrl_id, ctrl_name, ctrl_desc, ctrl_models in CONTROLLER_FAMILIES:
    CONTROLLER_SKILLS.append(SkillDefinition(
        id=f"prism-controller-{ctrl_id}",
        name=f"Controller: {ctrl_name}",
        category="CONTROLLER",
        subcategory="FAMILY",
        description=f"{ctrl_name} controller programming and configuration. {ctrl_desc}. Models: {', '.join(ctrl_models)}",
        version="1.0.0",
        priority=20,
        complexity="EXPERT",
        dependencies=["prism-gcode-reference"],
        consumers=["post-processor", "gcode-validator", "alarm-diagnostic"],
        hooks=[f"controller:{ctrl_id}:syntax", f"controller:{ctrl_id}:validate"],
        formulas=[],
        agents=["gcode_expert", "post_processor"],
        capabilities=[
            f"Generate {ctrl_name} compatible G-code",
            f"Validate G-code syntax for {ctrl_name}",
            f"Configure post processor for {ctrl_name}",
            f"Diagnose {ctrl_name} alarms",
            f"Access {ctrl_name} macro programming"
        ],
        inputs=[{"name": "gcode", "type": "string"}],
        outputs=[{"name": "validated_gcode", "type": "string"}, {"name": "errors", "type": "array"}],
        examples=[f"Validate G-code for {ctrl_name}"],
        status="DEFINED"
    ))

# Controller Feature Skills
CONTROLLER_FEATURES = [
    ("gcode", "G-Code Programming", "Standard G-code commands"),
    ("mcode", "M-Code Programming", "Miscellaneous functions"),
    ("macro", "Macro Programming", "Custom macros and variables"),
    ("cycle", "Canned Cycles", "Fixed cycles for drilling, boring, tapping"),
    ("compensation", "Tool Compensation", "Length, radius, wear compensation"),
    ("coordinate", "Coordinate Systems", "Work offsets and coordinate rotation"),
    ("transformation", "Coordinate Transformation", "Tilted plane, TCPC, RTCP"),
    ("high-speed", "High-Speed Machining", "HSM functions and lookahead"),
    ("probing", "Probing Cycles", "Touch probe operations"),
    ("parameter", "Controller Parameters", "System parameters and settings")
]

for feat_id, feat_name, feat_desc in CONTROLLER_FEATURES:
    CONTROLLER_SKILLS.append(SkillDefinition(
        id=f"prism-controller-{feat_id}",
        name=f"Controller {feat_name}",
        category="CONTROLLER",
        subcategory="FEATURE",
        description=feat_desc,
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-gcode-reference"],
        consumers=["post-processor", "gcode-generator"],
        hooks=[f"gcode:{feat_id}:generate", f"gcode:{feat_id}:validate"],
        formulas=[],
        agents=["gcode_expert"],
        capabilities=[f"Handle {feat_name.lower()} for all controller families"],
        inputs=[{"name": "parameters", "type": "object"}],
        outputs=[{"name": "gcode", "type": "string"}],
        examples=[f"Generate {feat_name.lower()}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: ALARM SKILLS (9,200 codes across 12 families)
# ═══════════════════════════════════════════════════════════════════════════════

ALARM_SKILLS = []

# Alarm Category Skills
ALARM_CATEGORIES = [
    ("servo", "Servo Alarms", "Servo motor, encoder, drive errors"),
    ("spindle", "Spindle Alarms", "Spindle motor, drive, orientation errors"),
    ("atc", "ATC Alarms", "Tool changer malfunctions"),
    ("program", "Program Alarms", "G-code syntax and logic errors"),
    ("system", "System Alarms", "PLC, hardware, communication errors"),
    ("safety", "Safety Alarms", "Door interlock, overtravel, emergency stop"),
    ("thermal", "Thermal Alarms", "Overtemperature conditions"),
    ("lubrication", "Lubrication Alarms", "Oil level, pressure, flow"),
    ("hydraulic", "Hydraulic Alarms", "Hydraulic pressure and flow"),
    ("pneumatic", "Pneumatic Alarms", "Air pressure and flow"),
    ("axis", "Axis Alarms", "Position, following error, limit"),
    ("communication", "Communication Alarms", "Network, serial, fieldbus errors")
]

for cat_id, cat_name, cat_desc in ALARM_CATEGORIES:
    ALARM_SKILLS.append(SkillDefinition(
        id=f"prism-alarm-category-{cat_id}",
        name=f"Alarm Category: {cat_name}",
        category="ALARM",
        subcategory="CATEGORY",
        description=f"Diagnosis and resolution for {cat_name.lower()}. {cat_desc}",
        version="1.0.0",
        priority=10,
        complexity="ADVANCED",
        dependencies=["prism-error-catalog"],
        consumers=["alarm-diagnostic", "maintenance-system"],
        hooks=[f"alarm:category:{cat_id}", f"alarm:diagnose:{cat_id}"],
        formulas=[],
        agents=["error_handler"],
        capabilities=[
            f"Diagnose {cat_name.lower()}",
            f"Provide step-by-step resolution for {cat_name.lower()}",
            f"Identify root causes of {cat_name.lower()}",
            f"Recommend preventive measures for {cat_name.lower()}"
        ],
        inputs=[{"name": "alarm_code", "type": "string"}, {"name": "controller", "type": "string"}],
        outputs=[{"name": "diagnosis", "type": "object"}, {"name": "fix_procedure", "type": "array"}],
        examples=[f"Diagnose {cat_name.lower()[:-1]}"],
        status="DEFINED"
    ))

# Per-Controller Alarm Skills
for ctrl_id, ctrl_name, _, _ in CONTROLLER_FAMILIES:
    ALARM_SKILLS.append(SkillDefinition(
        id=f"prism-alarm-{ctrl_id}",
        name=f"{ctrl_name} Alarms",
        category="ALARM",
        subcategory="CONTROLLER",
        description=f"Complete alarm database and diagnostics for {ctrl_name} controllers",
        version="1.0.0",
        priority=20,
        complexity="EXPERT",
        dependencies=["prism-error-catalog", f"prism-controller-{ctrl_id}"],
        consumers=["alarm-diagnostic"],
        hooks=[f"alarm:{ctrl_id}:lookup", f"alarm:{ctrl_id}:diagnose"],
        formulas=[],
        agents=["error_handler"],
        capabilities=[
            f"Look up {ctrl_name} alarm codes",
            f"Provide {ctrl_name}-specific diagnostics",
            f"Access {ctrl_name} service documentation"
        ],
        inputs=[{"name": "alarm_code", "type": "string"}],
        outputs=[{"name": "alarm_info", "type": "object"}],
        examples=[f"Look up {ctrl_name} alarm 1234"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: PHYSICS SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

PHYSICS_SKILLS = []

# Cutting Force Models
FORCE_MODELS = [
    ("kienzle", "Kienzle Model", "Empirical cutting force model using specific cutting force"),
    ("merchant", "Merchant Model", "Analytical model based on shear plane theory"),
    ("oxley", "Oxley Model", "Predictive model considering strain rate and temperature"),
    ("mechanistic", "Mechanistic Model", "Coefficient-based force prediction"),
    ("fem", "FEM Analysis", "Finite element cutting simulation")
]

for model_id, model_name, model_desc in FORCE_MODELS:
    PHYSICS_SKILLS.append(SkillDefinition(
        id=f"prism-physics-force-{model_id}",
        name=f"Cutting Force: {model_name}",
        category="PHYSICS",
        subcategory="FORCE",
        description=model_desc,
        version="1.0.0",
        priority=20,
        complexity="EXPERT",
        dependencies=["prism-material-physics", "prism-tool-geometry"],
        consumers=["speed-feed-calculator", "power-calculator", "chatter-predictor"],
        hooks=[f"physics:force:{model_id}", f"force:calculate:{model_id}"],
        formulas=["F-CUT-001", "F-CUT-002"],
        agents=["cutting_mechanics", "physics_validator"],
        capabilities=[
            f"Calculate cutting forces using {model_name}",
            f"Validate force predictions",
            f"Compare force model results"
        ],
        inputs=[{"name": "cutting_params", "type": "object"}, {"name": "material", "type": "object"}],
        outputs=[{"name": "forces", "type": "object"}],
        examples=[f"Calculate forces with {model_name}"],
        status="DEFINED"
    ))

# Thermal Analysis Skills
THERMAL_SKILLS_LIST = [
    ("temperature", "Cutting Temperature", "Temperature prediction at tool-chip interface"),
    ("heat-partition", "Heat Partition", "Distribution of heat between tool, chip, workpiece"),
    ("thermal-damage", "Thermal Damage", "White layer, burn, retemper prediction"),
    ("coolant-effect", "Coolant Effectiveness", "Cooling efficiency analysis"),
    ("thermal-expansion", "Thermal Expansion", "Thermal growth prediction")
]

for therm_id, therm_name, therm_desc in THERMAL_SKILLS_LIST:
    PHYSICS_SKILLS.append(SkillDefinition(
        id=f"prism-physics-thermal-{therm_id}",
        name=f"Thermal: {therm_name}",
        category="PHYSICS",
        subcategory="THERMAL",
        description=therm_desc,
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-material-thermal-cutting"],
        consumers=["speed-feed-calculator", "safety-checker"],
        hooks=[f"thermal:{therm_id}:calculate"],
        formulas=["F-THERM-001", "F-THERM-002"],
        agents=["thermal_analyst"],
        capabilities=[f"Analyze {therm_name.lower()}"],
        inputs=[{"name": "cutting_params", "type": "object"}],
        outputs=[{"name": "thermal_result", "type": "object"}],
        examples=[f"Calculate {therm_name.lower()}"],
        status="DEFINED"
    ))

# Vibration Analysis Skills
VIBRATION_SKILLS_LIST = [
    ("chatter-prediction", "Chatter Prediction", "Predict regenerative chatter using stability lobes"),
    ("stability-lobes", "Stability Lobe Diagram", "Generate SLD for spindle speed selection"),
    ("frf-analysis", "FRF Analysis", "Frequency response function measurement/simulation"),
    ("modal-analysis", "Modal Analysis", "Natural frequency and mode shape analysis"),
    ("damping", "Damping Analysis", "Structural and process damping estimation"),
    ("forced-vibration", "Forced Vibration", "Forced vibration from tooth passing")
]

for vib_id, vib_name, vib_desc in VIBRATION_SKILLS_LIST:
    PHYSICS_SKILLS.append(SkillDefinition(
        id=f"prism-physics-vibration-{vib_id}",
        name=f"Vibration: {vib_name}",
        category="PHYSICS",
        subcategory="VIBRATION",
        description=vib_desc,
        version="1.0.0",
        priority=30,
        complexity="EXPERT",
        dependencies=["prism-machine-dynamics"],
        consumers=["speed-feed-calculator", "chatter-avoider"],
        hooks=[f"vibration:{vib_id}:analyze"],
        formulas=["F-VIB-001", "F-VIB-002"],
        agents=["physics_validator"],
        capabilities=[f"Perform {vib_name.lower()}"],
        inputs=[{"name": "system_params", "type": "object"}],
        outputs=[{"name": "vibration_result", "type": "object"}],
        examples=[f"Analyze {vib_name.lower()}"],
        status="DEFINED"
    ))

# Surface Finish Skills
SURFACE_SKILLS_LIST = [
    ("roughness-prediction", "Roughness Prediction", "Predict Ra, Rz, Rt from cutting parameters"),
    ("theoretical-roughness", "Theoretical Roughness", "Ideal roughness from geometry"),
    ("actual-roughness", "Actual Roughness", "Real roughness including tool wear, vibration"),
    ("surface-texture", "Surface Texture", "Texture pattern and lay direction"),
    ("residual-stress", "Residual Stress", "Machining-induced residual stress")
]

for surf_id, surf_name, surf_desc in SURFACE_SKILLS_LIST:
    PHYSICS_SKILLS.append(SkillDefinition(
        id=f"prism-physics-surface-{surf_id}",
        name=f"Surface: {surf_name}",
        category="PHYSICS",
        subcategory="SURFACE",
        description=surf_desc,
        version="1.0.0",
        priority=40,
        complexity="ADVANCED",
        dependencies=["prism-tool-geometry"],
        consumers=["speed-feed-calculator", "finishing-optimizer"],
        hooks=[f"surface:{surf_id}:calculate"],
        formulas=["F-SURF-001"],
        agents=["cutting_mechanics"],
        capabilities=[f"Calculate {surf_name.lower()}"],
        inputs=[{"name": "cutting_params", "type": "object"}],
        outputs=[{"name": "surface_result", "type": "object"}],
        examples=[f"Predict {surf_name.lower()}"],
        status="DEFINED"
    ))

# Deflection Skills
DEFLECTION_SKILLS_LIST = [
    ("tool-deflection", "Tool Deflection", "Calculate tool bending under cutting forces"),
    ("workpiece-deflection", "Workpiece Deflection", "Thin wall and slender part deflection"),
    ("fixture-deflection", "Fixture Deflection", "Workholding deflection analysis"),
    ("machine-deflection", "Machine Deflection", "Structural compliance of machine tool")
]

for def_id, def_name, def_desc in DEFLECTION_SKILLS_LIST:
    PHYSICS_SKILLS.append(SkillDefinition(
        id=f"prism-physics-{def_id}",
        name=def_name,
        category="PHYSICS",
        subcategory="DEFLECTION",
        description=def_desc,
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-tool-geometry", "prism-physics-force-kienzle"],
        consumers=["speed-feed-calculator", "tolerance-checker"],
        hooks=[f"deflection:{def_id}:calculate"],
        formulas=["F-DEF-001"],
        agents=["cutting_mechanics"],
        capabilities=[f"Calculate {def_name.lower()}"],
        inputs=[{"name": "geometry", "type": "object"}, {"name": "forces", "type": "object"}],
        outputs=[{"name": "deflection", "type": "number"}],
        examples=[f"Calculate {def_name.lower()}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: AI/ML SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

AIML_SKILLS = []

# Algorithm Type Skills
ALGORITHMS = [
    ("pso", "Particle Swarm Optimization", "Swarm-based multi-parameter optimization"),
    ("genetic", "Genetic Algorithm", "Evolutionary optimization"),
    ("bayesian", "Bayesian Optimization", "Probabilistic model-based optimization"),
    ("gradient", "Gradient Descent", "First-order optimization"),
    ("random-forest", "Random Forest", "Ensemble decision tree prediction"),
    ("neural-network", "Neural Network", "Deep learning prediction"),
    ("svm", "Support Vector Machine", "Classification and regression"),
    ("knn", "K-Nearest Neighbors", "Instance-based learning"),
    ("lstm", "LSTM Network", "Sequence prediction"),
    ("transformer", "Transformer", "Attention-based models"),
    ("reinforcement", "Reinforcement Learning", "Reward-based optimization"),
    ("ensemble", "Ensemble Methods", "Combined model prediction")
]

for alg_id, alg_name, alg_desc in ALGORITHMS:
    AIML_SKILLS.append(SkillDefinition(
        id=f"prism-aiml-{alg_id}",
        name=f"AI/ML: {alg_name}",
        category="AI_ML",
        subcategory="ALGORITHM",
        description=alg_desc,
        version="1.0.0",
        priority=40,
        complexity="EXPERT",
        dependencies=["prism-ai-ml-master"],
        consumers=["optimization-engine", "prediction-engine"],
        hooks=[f"aiml:{alg_id}:train", f"aiml:{alg_id}:infer"],
        formulas=["F-OPT-001"],
        agents=["optimizer", "learning_agent"],
        capabilities=[
            f"Train {alg_name} models",
            f"Make predictions with {alg_name}",
            f"Tune {alg_name} hyperparameters"
        ],
        inputs=[{"name": "data", "type": "array"}, {"name": "parameters", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Optimize with {alg_name}"],
        status="DEFINED"
    ))

# AI/ML Task Skills
AIML_TASKS = [
    ("model-selection", "Model Selection", "Choose optimal algorithm for task"),
    ("hyperparameter", "Hyperparameter Tuning", "Optimize model parameters"),
    ("feature-engineering", "Feature Engineering", "Create and select features"),
    ("training", "Model Training", "Train ML models"),
    ("inference", "Model Inference", "Make predictions"),
    ("validation", "Model Validation", "Validate model performance"),
    ("monitoring", "Model Monitoring", "Track model drift and performance"),
    ("explanation", "Model Explanation", "Explain model predictions")
]

for task_id, task_name, task_desc in AIML_TASKS:
    AIML_SKILLS.append(SkillDefinition(
        id=f"prism-aiml-task-{task_id}",
        name=f"AI/ML Task: {task_name}",
        category="AI_ML",
        subcategory="TASK",
        description=task_desc,
        version="1.0.0",
        priority=40,
        complexity="ADVANCED",
        dependencies=["prism-ai-ml-master"],
        consumers=["optimization-engine", "prediction-engine"],
        hooks=[f"aiml:task:{task_id}"],
        formulas=[],
        agents=["learning_agent"],
        capabilities=[f"Perform {task_name.lower()}"],
        inputs=[{"name": "task_params", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {task_name.lower()}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8: CAD/CAM SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

CADCAM_SKILLS = []

# CAD Skills
CAD_SKILLS_LIST = [
    ("geometry-import", "Geometry Import", "Import STEP, IGES, STL, native CAD"),
    ("geometry-analysis", "Geometry Analysis", "Analyze part geometry and features"),
    ("feature-recognition", "Feature Recognition", "Automatically recognize machining features"),
    ("tolerance-analysis", "Tolerance Analysis", "Analyze GD&T and fit requirements"),
    ("model-repair", "Model Repair", "Fix geometry errors and gaps"),
    ("tessellation", "Tessellation", "Generate STL from solids"),
    ("measurement", "CAD Measurement", "Measure distances, angles, areas")
]

for cad_id, cad_name, cad_desc in CAD_SKILLS_LIST:
    CADCAM_SKILLS.append(SkillDefinition(
        id=f"prism-cad-{cad_id}",
        name=f"CAD: {cad_name}",
        category="CAD",
        subcategory="GEOMETRY",
        description=cad_desc,
        version="1.0.0",
        priority=40,
        complexity="ADVANCED",
        dependencies=[],
        consumers=["auto-cnc-programmer", "feature-extractor"],
        hooks=[f"cad:{cad_id}"],
        formulas=[],
        agents=["cam_programmer"],
        capabilities=[f"Perform {cad_name.lower()}"],
        inputs=[{"name": "geometry", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {cad_name.lower()}"],
        status="DEFINED"
    ))

# CAM Strategy Skills
CAM_STRATEGIES = [
    ("2d-facing", "2D Facing", "Face milling operations"),
    ("2d-pocketing", "2D Pocketing", "Pocket milling with islands"),
    ("2d-profiling", "2D Profiling", "Contour milling"),
    ("2d-slotting", "2D Slotting", "Slot milling"),
    ("3d-roughing", "3D Roughing", "Volumetric material removal"),
    ("3d-finishing", "3D Finishing", "Surface finishing operations"),
    ("3d-rest", "3D Rest Machining", "Clean up remaining material"),
    ("5axis-swarf", "5-Axis Swarf", "Side cutting with 5-axis"),
    ("5axis-multiaxis", "5-Axis Multi-Axis", "Simultaneous 5-axis contouring"),
    ("drilling", "Drilling Operations", "Hole-making operations"),
    ("threading", "Threading Operations", "Thread cutting operations"),
    ("turning-od", "Turning OD", "Outside diameter turning"),
    ("turning-id", "Turning ID", "Inside diameter operations"),
    ("turning-facing", "Turning Facing", "Face turning"),
    ("turning-grooving", "Turning Grooving", "Grooving and parting")
]

for strat_id, strat_name, strat_desc in CAM_STRATEGIES:
    CADCAM_SKILLS.append(SkillDefinition(
        id=f"prism-cam-strategy-{strat_id}",
        name=f"CAM Strategy: {strat_name}",
        category="CAM",
        subcategory="STRATEGY",
        description=strat_desc,
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-cad-feature-recognition", "prism-tool-selector"],
        consumers=["auto-cnc-programmer"],
        hooks=[f"cam:strategy:{strat_id}", f"toolpath:{strat_id}:generate"],
        formulas=[],
        agents=["cam_programmer"],
        capabilities=[
            f"Generate {strat_name} toolpaths",
            f"Optimize parameters for {strat_name}",
            f"Verify {strat_name} toolpaths"
        ],
        inputs=[{"name": "feature", "type": "object"}, {"name": "tool", "type": "object"}],
        outputs=[{"name": "toolpath", "type": "object"}],
        examples=[f"Generate {strat_name} toolpath"],
        status="DEFINED"
    ))

# Post Processor Skills
POST_SKILLS = [
    ("post-generation", "Post Processor Generation", "Generate machine-specific G-code"),
    ("post-customization", "Post Customization", "Customize post processor behavior"),
    ("post-validation", "Post Validation", "Validate post output"),
    ("post-simulation", "Post Simulation", "Simulate G-code execution")
]

for post_id, post_name, post_desc in POST_SKILLS:
    CADCAM_SKILLS.append(SkillDefinition(
        id=f"prism-{post_id}",
        name=post_name,
        category="CAM",
        subcategory="POST",
        description=post_desc,
        version="1.0.0",
        priority=20,
        complexity="EXPERT",
        dependencies=["prism-controller-gcode"],
        consumers=["post-processor-generator"],
        hooks=[f"post:{post_id.split('-')[1]}"],
        formulas=[],
        agents=["post_processor"],
        capabilities=[f"Execute {post_name.lower()}"],
        inputs=[{"name": "toolpath", "type": "object"}, {"name": "machine", "type": "string"}],
        outputs=[{"name": "gcode", "type": "string"}],
        examples=[f"Execute {post_name.lower()}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9: QUALITY SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

QUALITY_SKILLS = []

# Quality Component Skills (Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L)
QUALITY_COMPONENTS = [
    ("reasoning", "R(x) Reasoning Quality", "12 metrics for logical consistency and evidence", 0.25),
    ("code", "C(x) Code Quality", "11 metrics for structure, patterns, maintainability", 0.20),
    ("process", "P(x) Process Quality", "12 metrics for workflow and checkpoint adherence", 0.15),
    ("safety", "S(x) Safety Quality", "7 failure modes and 7 defense layers", 0.30),
    ("learning", "L(x) Learning Quality", "Continuous improvement and adaptation", 0.10)
]

for comp_id, comp_name, comp_desc, weight in QUALITY_COMPONENTS:
    QUALITY_SKILLS.append(SkillDefinition(
        id=f"prism-quality-{comp_id}",
        name=comp_name,
        category="QUALITY",
        subcategory="COMPONENT",
        description=f"{comp_desc}. Weight in Ω(x): {weight:.0%}",
        version="1.0.0",
        priority=10 if comp_id == "safety" else 20,
        complexity="ADVANCED",
        dependencies=["prism-master-equation"],
        consumers=["quality-gate", "output-validator"],
        hooks=[f"quality:{comp_id}:compute", f"quality:{comp_id}:validate"],
        formulas=["F-QUAL-001"],
        agents=["quality_controller"],
        capabilities=[
            f"Compute {comp_id.upper()}(x) score",
            f"Validate {comp_id} meets threshold",
            f"Identify {comp_id} improvement areas"
        ],
        inputs=[{"name": "output", "type": "object"}],
        outputs=[{"name": "score", "type": "number"}, {"name": "details", "type": "object"}],
        examples=[f"Compute {comp_id} score"],
        status="DEFINED"
    ))

# Quality Gate Skills
QUALITY_GATES = [
    ("G1", "Accessibility Gate", "C: drive accessible"),
    ("G2", "State Validity Gate", "State file valid JSON"),
    ("G3", "Input Understanding Gate", "Input understood correctly"),
    ("G4", "Skill Availability Gate", "Required skills available"),
    ("G5", "Output Path Gate", "Output on C: not /home"),
    ("G6", "Evidence Gate", "Evidence exists for claims"),
    ("G7", "Anti-Regression Gate", "Replacement ≥ original"),
    ("G8", "Safety Hard Block Gate", "S(x) ≥ 0.70 HARD BLOCK"),
    ("G9", "Quality Warning Gate", "Ω(x) ≥ 0.70 WARN")
]

for gate_id, gate_name, gate_desc in QUALITY_GATES:
    QUALITY_SKILLS.append(SkillDefinition(
        id=f"prism-quality-gate-{gate_id.lower()}",
        name=f"Quality Gate {gate_id}: {gate_name}",
        category="QUALITY",
        subcategory="GATE",
        description=gate_desc,
        version="1.0.0",
        priority=0 if gate_id == "G8" else 10,
        complexity="INTERMEDIATE",
        dependencies=["prism-quality-master"],
        consumers=["output-validator", "workflow-controller"],
        hooks=[f"quality:gate:{gate_id}", f"gate:{gate_id}:check"],
        formulas=[],
        agents=["quality_controller"],
        capabilities=[f"Enforce {gate_name}"],
        inputs=[{"name": "context", "type": "object"}],
        outputs=[{"name": "passed", "type": "boolean"}, {"name": "reason", "type": "string"}],
        examples=[f"Check {gate_name}"],
        status="DEFINED"
    ))

# Evidence Level Skills
EVIDENCE_LEVELS = [
    ("L1", "Claim", "Verbal assertion only - INSUFFICIENT"),
    ("L2", "File Listing", "Files exist but content unverified - PARTIAL"),
    ("L3", "Content Sample", "Sample content verified - MINIMUM"),
    ("L4", "Reproducible", "Can reproduce the result - MAJOR MILESTONE"),
    ("L5", "User Verified", "User confirmed completion - STAGE COMPLETE")
]

for level_id, level_name, level_desc in EVIDENCE_LEVELS:
    QUALITY_SKILLS.append(SkillDefinition(
        id=f"prism-evidence-{level_id.lower()}",
        name=f"Evidence Level {level_id}: {level_name}",
        category="QUALITY",
        subcategory="EVIDENCE",
        description=level_desc,
        version="1.0.0",
        priority=30,
        complexity="BASIC",
        dependencies=["prism-sp-verification"],
        consumers=["verification-system"],
        hooks=[f"evidence:{level_id}:collect", f"evidence:{level_id}:validate"],
        formulas=[],
        agents=["verification_chain"],
        capabilities=[f"Collect and validate {level_name} evidence"],
        inputs=[{"name": "claim", "type": "object"}],
        outputs=[{"name": "evidence", "type": "object"}],
        examples=[f"Collect {level_name} evidence"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 10: SESSION/WORKFLOW SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

SESSION_SKILLS = []

# Session Lifecycle Skills
SESSION_LIFECYCLE = [
    ("initialization", "Session Initialization", "Start session with state loading"),
    ("state-management", "State Management", "CURRENT_STATE.json operations"),
    ("checkpointing", "Checkpointing", "Progress checkpoints every 5-8 items"),
    ("buffer-management", "Buffer Zone Management", "Track tool calls 🟢🟡🔴⚫"),
    ("context-management", "Context Management", "Monitor and manage context pressure"),
    ("handoff", "Session Handoff", "Prepare state for next session"),
    ("recovery", "Session Recovery", "Recover from errors and compaction"),
    ("termination", "Session Termination", "Clean session end with state save")
]

for sess_id, sess_name, sess_desc in SESSION_LIFECYCLE:
    SESSION_SKILLS.append(SkillDefinition(
        id=f"prism-session-{sess_id}",
        name=sess_name,
        category="SESSION",
        subcategory="LIFECYCLE",
        description=sess_desc,
        version="1.0.0",
        priority=10,
        complexity="INTERMEDIATE",
        dependencies=["prism-session-master"],
        consumers=["workflow-controller"],
        hooks=[f"session:{sess_id}"],
        formulas=[],
        agents=["session_continuity"],
        capabilities=[f"Handle {sess_name.lower()}"],
        inputs=[{"name": "context", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {sess_name.lower()}"],
        status="DEFINED"
    ))

# SP Workflow Skills (already have 8, expand with detail skills)
SP_WORKFLOW_PHASES = [
    ("brainstorm", "SP Brainstorm", "MANDATORY STOP before implementation"),
    ("planning", "SP Planning", "Create 2-5 minute executable tasks"),
    ("execution", "SP Execution", "Checkpoint execution with progress tracking"),
    ("debugging", "SP Debugging", "4-phase debugging process"),
    ("review-quality", "SP Review Quality", "Code quality gate verification"),
    ("review-spec", "SP Review Spec", "Specification compliance gate"),
    ("verification", "SP Verification", "Evidence-based completion proof"),
    ("handoff", "SP Handoff", "Session transition protocol")
]

for phase_id, phase_name, phase_desc in SP_WORKFLOW_PHASES:
    SESSION_SKILLS.append(SkillDefinition(
        id=f"prism-{phase_id}",
        name=phase_name,
        category="SESSION",
        subcategory="SP_WORKFLOW",
        description=phase_desc,
        version="1.0.0",
        priority=20,
        complexity="ADVANCED",
        dependencies=["prism-session-master"],
        consumers=["workflow-controller"],
        hooks=[f"sp:{phase_id.replace('sp-', '')}"],
        formulas=[],
        agents=["workflow_manager"],
        capabilities=[f"Execute {phase_name}"],
        inputs=[{"name": "task", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {phase_name}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 11: PRODUCT SKILLS (4 products)
# ═══════════════════════════════════════════════════════════════════════════════

PRODUCT_SKILLS = []

# Speed & Feed Calculator Skills
SFC_SKILLS = [
    ("material-selection", "Material Selection", "Select and configure material for calculation"),
    ("tool-selection", "Tool Selection", "Select cutting tool for operation"),
    ("machine-selection", "Machine Selection", "Configure machine capabilities"),
    ("parameter-calculation", "Parameter Calculation", "Calculate speeds, feeds, depths"),
    ("optimization", "Parameter Optimization", "Optimize for productivity/quality/cost"),
    ("validation", "Parameter Validation", "Validate parameters against limits"),
    ("recommendation", "Recommendation Engine", "Generate cutting recommendations"),
    ("comparison", "Parameter Comparison", "Compare multiple cutting scenarios")
]

for sfc_id, sfc_name, sfc_desc in SFC_SKILLS:
    PRODUCT_SKILLS.append(SkillDefinition(
        id=f"prism-sfc-{sfc_id}",
        name=f"SFC: {sfc_name}",
        category="PRODUCT",
        subcategory="SPEED_FEED_CALCULATOR",
        description=sfc_desc,
        version="1.0.0",
        priority=20,
        complexity="ADVANCED",
        dependencies=["prism-material-schema", "prism-tool-schema", "prism-machine-schema"],
        consumers=["speed-feed-calculator-ui"],
        hooks=[f"sfc:{sfc_id}"],
        formulas=["F-CUT-001", "F-LIFE-001", "F-PWR-001"],
        agents=["cutting_mechanics", "optimizer"],
        capabilities=[f"Execute {sfc_name}"],
        inputs=[{"name": "params", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {sfc_name}"],
        status="DEFINED"
    ))

# Post Processor Generator Skills
PPG_SKILLS = [
    ("machine-config", "Machine Configuration", "Configure machine for post processing"),
    ("controller-config", "Controller Configuration", "Configure controller syntax"),
    ("format-config", "Format Configuration", "Configure output format"),
    ("cycle-mapping", "Cycle Mapping", "Map operations to canned cycles"),
    ("macro-generation", "Macro Generation", "Generate custom macros"),
    ("output-generation", "Output Generation", "Generate complete G-code program"),
    ("simulation", "Post Simulation", "Simulate G-code execution"),
    ("validation", "Post Validation", "Validate G-code output")
]

for ppg_id, ppg_name, ppg_desc in PPG_SKILLS:
    PRODUCT_SKILLS.append(SkillDefinition(
        id=f"prism-ppg-{ppg_id}",
        name=f"PPG: {ppg_name}",
        category="PRODUCT",
        subcategory="POST_PROCESSOR_GENERATOR",
        description=ppg_desc,
        version="1.0.0",
        priority=20,
        complexity="EXPERT",
        dependencies=["prism-controller-gcode", "prism-machine-schema"],
        consumers=["post-processor-generator-ui"],
        hooks=[f"ppg:{ppg_id}"],
        formulas=[],
        agents=["post_processor", "gcode_expert"],
        capabilities=[f"Execute {ppg_name}"],
        inputs=[{"name": "config", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {ppg_name}"],
        status="DEFINED"
    ))

# Shop Manager / Quoting Skills
SHOP_SKILLS = [
    ("part-analysis", "Part Analysis", "Analyze part for quoting"),
    ("material-costing", "Material Costing", "Calculate material costs"),
    ("tooling-costing", "Tooling Costing", "Calculate tooling costs"),
    ("labor-costing", "Labor Costing", "Calculate labor costs"),
    ("machine-costing", "Machine Costing", "Calculate machine time costs"),
    ("overhead-application", "Overhead Application", "Apply overhead factors"),
    ("margin-calculation", "Margin Calculation", "Calculate profit margins"),
    ("quote-generation", "Quote Generation", "Generate customer quote"),
    ("lead-time-estimation", "Lead Time Estimation", "Estimate delivery lead time"),
    ("scheduling", "Job Scheduling", "Schedule production jobs"),
    ("capacity-planning", "Capacity Planning", "Plan production capacity"),
    ("resource-allocation", "Resource Allocation", "Allocate machines and operators")
]

for shop_id, shop_name, shop_desc in SHOP_SKILLS:
    PRODUCT_SKILLS.append(SkillDefinition(
        id=f"prism-shop-{shop_id}",
        name=f"Shop: {shop_name}",
        category="PRODUCT",
        subcategory="SHOP_MANAGER",
        description=shop_desc,
        version="1.0.0",
        priority=30,
        complexity="ADVANCED",
        dependencies=["prism-material-schema", "prism-machine-schema"],
        consumers=["shop-manager-ui"],
        hooks=[f"shop:{shop_id}"],
        formulas=["F-COST-001"],
        agents=["estimator"],
        capabilities=[f"Execute {shop_name}"],
        inputs=[{"name": "input", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {shop_name}"],
        status="DEFINED"
    ))

# Auto CNC Programmer Skills
ACNC_SKILLS = [
    ("geometry-import", "Geometry Import", "Import CAD geometry"),
    ("feature-recognition", "Feature Recognition", "Automatically recognize features"),
    ("operation-planning", "Operation Planning", "Plan machining operations"),
    ("tool-assignment", "Tool Assignment", "Assign tools to operations"),
    ("toolpath-generation", "Toolpath Generation", "Generate toolpaths"),
    ("toolpath-optimization", "Toolpath Optimization", "Optimize toolpath efficiency"),
    ("collision-checking", "Collision Checking", "Check for collisions"),
    ("simulation", "Machining Simulation", "Simulate material removal"),
    ("verification", "NC Verification", "Verify NC program"),
    ("documentation", "Setup Documentation", "Generate setup sheets")
]

for acnc_id, acnc_name, acnc_desc in ACNC_SKILLS:
    PRODUCT_SKILLS.append(SkillDefinition(
        id=f"prism-acnc-{acnc_id}",
        name=f"ACNC: {acnc_name}",
        category="PRODUCT",
        subcategory="AUTO_CNC_PROGRAMMER",
        description=acnc_desc,
        version="1.0.0",
        priority=20,
        complexity="EXPERT",
        dependencies=["prism-cad-feature-recognition", "prism-cam-strategy-3d-roughing"],
        consumers=["auto-cnc-programmer-ui"],
        hooks=[f"acnc:{acnc_id}"],
        formulas=[],
        agents=["cam_programmer"],
        capabilities=[f"Execute {acnc_name}"],
        inputs=[{"name": "input", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {acnc_name}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 12: INTEGRATION SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

INTEGRATION_SKILLS = []

# API Integration Skills
API_SKILLS = [
    ("claude-api", "Claude API Integration", "Anthropic Claude API calls"),
    ("rest-api", "REST API", "Generic REST API integration"),
    ("graphql", "GraphQL", "GraphQL API integration"),
    ("websocket", "WebSocket", "Real-time WebSocket communication"),
    ("webhook", "Webhook Handler", "Incoming webhook processing")
]

for api_id, api_name, api_desc in API_SKILLS:
    INTEGRATION_SKILLS.append(SkillDefinition(
        id=f"prism-api-{api_id}",
        name=api_name,
        category="INTEGRATION",
        subcategory="API",
        description=api_desc,
        version="1.0.0",
        priority=40,
        complexity="INTERMEDIATE",
        dependencies=[],
        consumers=["api-gateway"],
        hooks=[f"api:{api_id}"],
        formulas=[],
        agents=["api_coordinator"],
        capabilities=[f"Handle {api_name}"],
        inputs=[{"name": "request", "type": "object"}],
        outputs=[{"name": "response", "type": "object"}],
        examples=[f"Execute {api_name}"],
        status="DEFINED"
    ))

# File I/O Skills
FILE_SKILLS = [
    ("json-io", "JSON I/O", "Read/write JSON files"),
    ("excel-io", "Excel I/O", "Read/write Excel files"),
    ("csv-io", "CSV I/O", "Read/write CSV files"),
    ("cad-io", "CAD I/O", "Import/export CAD files"),
    ("gcode-io", "G-Code I/O", "Read/write G-code files"),
    ("pdf-io", "PDF I/O", "Generate PDF reports")
]

for file_id, file_name, file_desc in FILE_SKILLS:
    INTEGRATION_SKILLS.append(SkillDefinition(
        id=f"prism-file-{file_id}",
        name=file_name,
        category="INTEGRATION",
        subcategory="FILE_IO",
        description=file_desc,
        version="1.0.0",
        priority=50,
        complexity="BASIC",
        dependencies=[],
        consumers=["data-import", "data-export"],
        hooks=[f"file:{file_id}"],
        formulas=[],
        agents=[],
        capabilities=[f"Handle {file_name}"],
        inputs=[{"name": "path", "type": "string"}],
        outputs=[{"name": "data", "type": "object"}],
        examples=[f"Execute {file_name}"],
        status="DEFINED"
    ))

# External System Integration Skills
EXTERNAL_SKILLS = [
    ("erp", "ERP Integration", "Enterprise resource planning sync"),
    ("mes", "MES Integration", "Manufacturing execution system"),
    ("mtconnect", "MTConnect", "Machine tool connectivity"),
    ("opc-ua", "OPC-UA", "Industrial automation protocol"),
    ("cmm", "CMM Integration", "Coordinate measuring machine"),
    ("cad-system", "CAD System", "CAD system integration")
]

for ext_id, ext_name, ext_desc in EXTERNAL_SKILLS:
    INTEGRATION_SKILLS.append(SkillDefinition(
        id=f"prism-integration-{ext_id}",
        name=ext_name,
        category="INTEGRATION",
        subcategory="EXTERNAL",
        description=ext_desc,
        version="1.0.0",
        priority=50,
        complexity="ADVANCED",
        dependencies=[],
        consumers=["integration-hub"],
        hooks=[f"integration:{ext_id}"],
        formulas=[],
        agents=[],
        capabilities=[f"Handle {ext_name}"],
        inputs=[{"name": "config", "type": "object"}],
        outputs=[{"name": "result", "type": "object"}],
        examples=[f"Execute {ext_name}"],
        status="DEFINED"
    ))

# ═══════════════════════════════════════════════════════════════════════════════
# COMBINE ALL SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

ALL_SKILLS = (
    MATERIAL_SKILLS +
    MACHINE_SKILLS +
    TOOL_SKILLS +
    CONTROLLER_SKILLS +
    ALARM_SKILLS +
    PHYSICS_SKILLS +
    AIML_SKILLS +
    CADCAM_SKILLS +
    QUALITY_SKILLS +
    SESSION_SKILLS +
    PRODUCT_SKILLS +
    INTEGRATION_SKILLS
)

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Generate exhaustive skill registry."""
    print("=" * 80)
    print("PRISM EXHAUSTIVE SKILL EXPANSION")
    print("=" * 80)
    
    # Convert to dictionaries
    skills_dict = [s.to_dict() for s in ALL_SKILLS]
    
    print(f"\nTotal Skills Generated: {len(skills_dict)}")
    
    # Count by category
    category_counts = {}
    subcategory_counts = {}
    for skill in skills_dict:
        cat = skill["category"]
        subcat = f"{cat}/{skill['subcategory']}"
        category_counts[cat] = category_counts.get(cat, 0) + 1
        subcategory_counts[subcat] = subcategory_counts.get(subcat, 0) + 1
    
    print("\nBy Category:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    
    print(f"\nSubcategories: {len(subcategory_counts)}")
    
    # Count by complexity
    complexity_counts = {}
    for skill in skills_dict:
        comp = skill["complexity"]
        complexity_counts[comp] = complexity_counts.get(comp, 0) + 1
    
    print("\nBy Complexity:")
    for comp, count in sorted(complexity_counts.items(), key=lambda x: -x[1]):
        print(f"  {comp}: {count}")
    
    # Count by priority
    priority_counts = {}
    for skill in skills_dict:
        p = skill["priority"]
        priority_counts[p] = priority_counts.get(p, 0) + 1
    
    print("\nBy Priority:")
    for p in sorted(priority_counts.keys()):
        label = {0: "CRITICAL", 10: "HIGH", 20: "HIGH", 30: "NORMAL", 40: "NORMAL", 50: "LOW"}.get(p, f"P{p}")
        print(f"  {label} (P{p}): {priority_counts[p]}")
    
    # Save skill registry
    registry = {
        "version": "2.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_skill_expansion.py",
        "totalSkills": len(skills_dict),
        "summary": {
            "byCategory": category_counts,
            "bySubcategory": subcategory_counts,
            "byComplexity": complexity_counts,
            "byPriority": priority_counts
        },
        "skills": skills_dict
    }
    
    # Create output directories
    os.makedirs(r"C:\PRISM\registries", exist_ok=True)
    os.makedirs(r"C:\PRISM\mcp-server\audits", exist_ok=True)
    
    # Save main registry
    output_path = r"C:\PRISM\registries\SKILL_REGISTRY_EXPANDED.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {output_path}")
    
    # Update main skill registry
    main_path = r"C:\PRISM\registries\SKILL_REGISTRY.json"
    with open(main_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"Updated: {main_path}")
    
    # Save audit
    audit_path = r"C:\PRISM\mcp-server\audits\skill_expansion_r2_7.json"
    audit = {
        "session": "R2.7-SKILL-EXPANSION",
        "timestamp": datetime.now().isoformat(),
        "skillsGenerated": len(skills_dict),
        "categories": len(category_counts),
        "subcategories": len(subcategory_counts),
        "breakdown": {
            "MATERIAL": len(MATERIAL_SKILLS),
            "MACHINE": len(MACHINE_SKILLS),
            "TOOL": len(TOOL_SKILLS),
            "CONTROLLER": len(CONTROLLER_SKILLS),
            "ALARM": len(ALARM_SKILLS),
            "PHYSICS": len(PHYSICS_SKILLS),
            "AI_ML": len(AIML_SKILLS),
            "CAD_CAM": len(CADCAM_SKILLS),
            "QUALITY": len(QUALITY_SKILLS),
            "SESSION": len(SESSION_SKILLS),
            "PRODUCT": len(PRODUCT_SKILLS),
            "INTEGRATION": len(INTEGRATION_SKILLS)
        }
    }
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")
    
    print("\n" + "=" * 80)
    print(f"SKILL EXPANSION COMPLETE: {len(skills_dict)} skills")
    print("=" * 80)
    
    return skills_dict

if __name__ == "__main__":
    skills = main()
