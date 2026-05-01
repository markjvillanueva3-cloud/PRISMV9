#!/usr/bin/env python3
"""
PRISM SKILL EXPANSION WAVE 4 - ALLOYS, FEATURES, CROSS-DOMAIN
=============================================================
Target: 1,500+ total skills

WAVE 4 ADDITIONS:
- Specific material alloys (100+ common alloys)
- Machining features (40+ feature types)
- Error handling skills (30+ error categories)
- Learning domain skills (25+ learning areas)  
- Cross-domain fusion skills (40+ fusions)
- GD&T skills (20+ tolerances)
- Metrology skills (25+ measurement)
"""

import json
import os
from datetime import datetime
from dataclasses import dataclass, asdict, field
from typing import List

@dataclass
class SkillDef:
    id: str
    name: str
    category: str
    subcategory: str
    description: str
    version: str = "1.0.0"
    priority: int = 50
    complexity: str = "INTERMEDIATE"
    dependencies: List[str] = field(default_factory=list)
    consumers: List[str] = field(default_factory=list)
    hooks: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    status: str = "DEFINED"
    
    def to_dict(self):
        return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# SPECIFIC MATERIAL ALLOYS (100+)
# ═══════════════════════════════════════════════════════════════════════════════

ALLOYS = [
    # Carbon Steels
    ("1010", "1010 Steel", "STEEL", "Low carbon, highly formable"),
    ("1018", "1018 Steel", "STEEL", "Low carbon, good machinability"),
    ("1020", "1020 Steel", "STEEL", "Low carbon, case hardening"),
    ("1040", "1040 Steel", "STEEL", "Medium carbon, general purpose"),
    ("1045", "1045 Steel", "STEEL", "Medium carbon, shafts/gears"),
    ("1050", "1050 Steel", "STEEL", "Medium carbon, springs"),
    ("1060", "1060 Steel", "STEEL", "High carbon, cutting tools"),
    ("1095", "1095 Steel", "STEEL", "High carbon, springs/knives"),
    
    # Alloy Steels
    ("4130", "4130 Steel", "STEEL", "Chrome-moly, aircraft"),
    ("4140", "4140 Steel", "STEEL", "Chrome-moly, most common alloy"),
    ("4340", "4340 Steel", "STEEL", "Ni-Cr-Mo, high strength"),
    ("8620", "8620 Steel", "STEEL", "Ni-Cr-Mo, carburizing"),
    ("52100", "52100 Steel", "STEEL", "Chrome, bearing steel"),
    
    # Tool Steels
    ("a2", "A2 Tool Steel", "TOOL_STEEL", "Air hardening, dies"),
    ("d2", "D2 Tool Steel", "TOOL_STEEL", "High chrome, wear resistant"),
    ("h13", "H13 Tool Steel", "TOOL_STEEL", "Hot work, die casting"),
    ("m2", "M2 Tool Steel", "TOOL_STEEL", "High speed steel"),
    ("o1", "O1 Tool Steel", "TOOL_STEEL", "Oil hardening, general"),
    ("s7", "S7 Tool Steel", "TOOL_STEEL", "Shock resistant"),
    
    # Stainless Steels
    ("303", "303 Stainless", "STAINLESS", "Free machining austenitic"),
    ("304", "304 Stainless", "STAINLESS", "18-8 austenitic, most common"),
    ("304l", "304L Stainless", "STAINLESS", "Low carbon 304"),
    ("316", "316 Stainless", "STAINLESS", "Marine grade austenitic"),
    ("316l", "316L Stainless", "STAINLESS", "Low carbon 316"),
    ("410", "410 Stainless", "STAINLESS", "Martensitic, hardenable"),
    ("420", "420 Stainless", "STAINLESS", "Cutlery grade martensitic"),
    ("430", "430 Stainless", "STAINLESS", "Ferritic, decorative"),
    ("440c", "440C Stainless", "STAINLESS", "High carbon martensitic"),
    ("17-4ph", "17-4 PH Stainless", "STAINLESS", "Precipitation hardening"),
    ("15-5ph", "15-5 PH Stainless", "STAINLESS", "Precipitation hardening"),
    ("2205", "2205 Duplex", "STAINLESS", "Duplex stainless"),
    
    # Aluminum Alloys
    ("1100", "1100 Aluminum", "ALUMINUM", "Pure aluminum, soft"),
    ("2011", "2011 Aluminum", "ALUMINUM", "Free machining"),
    ("2024", "2024 Aluminum", "ALUMINUM", "Aircraft structural"),
    ("3003", "3003 Aluminum", "ALUMINUM", "General purpose"),
    ("5052", "5052 Aluminum", "ALUMINUM", "Marine, good weldability"),
    ("6061", "6061 Aluminum", "ALUMINUM", "Most common structural"),
    ("6063", "6063 Aluminum", "ALUMINUM", "Architectural, extrusions"),
    ("7050", "7050 Aluminum", "ALUMINUM", "Aerospace high strength"),
    ("7075", "7075 Aluminum", "ALUMINUM", "Aircraft, highest strength"),
    ("mic6", "MIC-6 Aluminum", "ALUMINUM", "Cast tooling plate"),
    
    # Copper Alloys
    ("c110", "C110 Copper", "COPPER", "ETP copper, electrical"),
    ("c145", "C145 Tellurium Copper", "COPPER", "Free machining copper"),
    ("c260", "C260 Brass", "COPPER", "Cartridge brass"),
    ("c360", "C360 Brass", "COPPER", "Free machining brass"),
    ("c464", "C464 Naval Brass", "COPPER", "Marine brass"),
    ("c510", "C510 Phosphor Bronze", "COPPER", "Spring bronze"),
    ("c630", "C630 Aluminum Bronze", "COPPER", "High strength bronze"),
    ("c932", "C932 Bearing Bronze", "COPPER", "Bearing material"),
    
    # Nickel Alloys
    ("inconel-600", "Inconel 600", "NICKEL", "Oxidation resistant"),
    ("inconel-625", "Inconel 625", "NICKEL", "High strength corrosion"),
    ("inconel-718", "Inconel 718", "NICKEL", "Aerospace workhorse"),
    ("hastelloy-c276", "Hastelloy C-276", "NICKEL", "Chemical resistant"),
    ("monel-400", "Monel 400", "NICKEL", "Ni-Cu alloy"),
    ("waspaloy", "Waspaloy", "NICKEL", "Jet engine components"),
    ("rene-41", "René 41", "NICKEL", "High temp aerospace"),
    
    # Titanium Alloys
    ("ti-cp2", "Ti CP Grade 2", "TITANIUM", "Commercially pure"),
    ("ti-6al4v", "Ti-6Al-4V", "TITANIUM", "Most common Ti alloy"),
    ("ti-6al4v-eli", "Ti-6Al-4V ELI", "TITANIUM", "Medical grade"),
    ("ti-6246", "Ti-6-2-4-6", "TITANIUM", "High strength Ti"),
    
    # Cobalt Alloys
    ("stellite-6", "Stellite 6", "COBALT", "Wear resistant coating"),
    ("stellite-21", "Stellite 21", "COBALT", "Corrosion resistant"),
    ("mp35n", "MP35N", "COBALT", "Medical/aerospace"),
    
    # Cast Irons
    ("gray-iron", "Gray Cast Iron", "CAST_IRON", "Class 30-40"),
    ("ductile-iron", "Ductile Iron", "CAST_IRON", "Nodular iron"),
    ("malleable-iron", "Malleable Iron", "CAST_IRON", "Heat treated"),
    ("cgi", "Compacted Graphite Iron", "CAST_IRON", "CGI engine blocks"),
    
    # Specialty
    ("kovar", "Kovar", "SPECIALTY", "Glass-metal sealing"),
    ("invar", "Invar", "SPECIALTY", "Low expansion"),
    ("tungsten", "Tungsten", "SPECIALTY", "Heavy, high temp"),
    ("molybdenum", "Molybdenum", "SPECIALTY", "High temp applications"),
    ("niobium", "Niobium", "SPECIALTY", "Superconducting"),
    ("tantalum", "Tantalum", "SPECIALTY", "Corrosion resistant"),
    
    # Plastics
    ("delrin", "Delrin/Acetal", "PLASTIC", "POM, machinable"),
    ("nylon", "Nylon 6/6", "PLASTIC", "PA66, wear parts"),
    ("peek", "PEEK", "PLASTIC", "High performance"),
    ("ultem", "Ultem", "PLASTIC", "PEI, aerospace plastic"),
    ("hdpe", "HDPE", "PLASTIC", "High density PE"),
    ("ptfe", "PTFE/Teflon", "PLASTIC", "Low friction"),
    ("polycarbonate", "Polycarbonate", "PLASTIC", "Impact resistant"),
    ("acrylic", "Acrylic/PMMA", "PLASTIC", "Clear, optical"),
    ("abs", "ABS", "PLASTIC", "General purpose"),
    ("pvc", "PVC", "PLASTIC", "Chemical resistant")
]

def generate_alloy_skills():
    skills = []
    for alloy_id, alloy_name, alloy_group, alloy_desc in ALLOYS:
        skills.append(SkillDef(
            id=f"prism-alloy-{alloy_id.lower().replace(' ', '-').replace('/', '-')}",
            name=f"Alloy: {alloy_name}",
            category="MATERIAL",
            subcategory=f"ALLOY_{alloy_group}",
            description=f"{alloy_name} machining parameters. {alloy_desc}",
            priority=40,
            complexity="ADVANCED",
            dependencies=["prism-material-schema", f"prism-material-category-{alloy_group.lower()[0]}"],
            consumers=["speed-feed-calculator", "material-selector"],
            hooks=[f"alloy:{alloy_id}:lookup", f"alloy:{alloy_id}:parameters"],
            capabilities=[f"Get cutting parameters for {alloy_name}", f"Recommend tools for {alloy_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# MACHINING FEATURES (40+)
# ═══════════════════════════════════════════════════════════════════════════════

FEATURES = [
    # Hole features
    ("simple-hole", "Simple Hole", "HOLE", "Through or blind hole"),
    ("counterbore-hole", "Counterbore Hole", "HOLE", "Hole with counterbore"),
    ("countersink-hole", "Countersink Hole", "HOLE", "Hole with countersink"),
    ("threaded-hole", "Threaded Hole", "HOLE", "Tapped hole"),
    ("reamed-hole", "Reamed Hole", "HOLE", "Precision hole"),
    ("pattern-holes", "Hole Pattern", "HOLE", "Bolt circle or grid"),
    
    # Pocket features
    ("rectangular-pocket", "Rectangular Pocket", "POCKET", "Square/rect pocket"),
    ("circular-pocket", "Circular Pocket", "POCKET", "Round pocket"),
    ("obround-pocket", "Obround Pocket", "POCKET", "Slot-end pocket"),
    ("freeform-pocket", "Freeform Pocket", "POCKET", "Complex shape pocket"),
    ("deep-pocket", "Deep Pocket", "POCKET", "Depth > 3x width"),
    ("thin-wall-pocket", "Thin Wall Pocket", "POCKET", "Flexible walls"),
    
    # Profile features
    ("open-profile", "Open Profile", "PROFILE", "Open contour"),
    ("closed-profile", "Closed Profile", "PROFILE", "Closed contour"),
    ("chamfer-edge", "Chamfer", "PROFILE", "Angled edge"),
    ("fillet-edge", "Fillet/Radius", "PROFILE", "Rounded edge"),
    
    # Boss features
    ("circular-boss", "Circular Boss", "BOSS", "Round raised feature"),
    ("rectangular-boss", "Rectangular Boss", "BOSS", "Square raised feature"),
    ("custom-boss", "Custom Boss", "BOSS", "Complex raised feature"),
    
    # Slot features
    ("through-slot", "Through Slot", "SLOT", "Open-ended slot"),
    ("blind-slot", "Blind Slot", "SLOT", "Closed-end slot"),
    ("t-slot", "T-Slot", "SLOT", "T-shaped slot"),
    ("dovetail-slot", "Dovetail Slot", "SLOT", "Dovetail groove"),
    ("keyway", "Keyway", "SLOT", "Key slot"),
    
    # Surface features
    ("flat-face", "Flat Face", "SURFACE", "Planar surface"),
    ("3d-surface", "3D Surface", "SURFACE", "Sculptured surface"),
    ("blend-surface", "Blend Surface", "SURFACE", "Transition surface"),
    
    # Turning features
    ("od-surface", "OD Surface", "TURNING", "Outside diameter"),
    ("id-surface", "ID Surface", "TURNING", "Inside diameter"),
    ("face-surface", "Face Surface", "TURNING", "Flat face"),
    ("groove-od", "OD Groove", "TURNING", "External groove"),
    ("groove-id", "ID Groove", "TURNING", "Internal groove"),
    ("groove-face", "Face Groove", "TURNING", "Face groove"),
    ("thread-feature", "Thread Feature", "TURNING", "Screw thread"),
    ("taper-feature", "Taper", "TURNING", "Conical surface"),
    
    # Complex features
    ("rib", "Rib", "COMPLEX", "Thin supporting wall"),
    ("web", "Web", "COMPLEX", "Thin connecting section"),
    ("undercut", "Undercut", "COMPLEX", "Recessed feature"),
    ("draft", "Draft", "COMPLEX", "Angled wall for molding"),
    ("core-cavity", "Core/Cavity", "COMPLEX", "Mold features")
]

def generate_feature_skills():
    skills = []
    for feat_id, feat_name, feat_group, feat_desc in FEATURES:
        skills.append(SkillDef(
            id=f"prism-feature-{feat_id}",
            name=f"Feature: {feat_name}",
            category="FEATURE",
            subcategory=feat_group,
            description=f"{feat_name} recognition and machining. {feat_desc}",
            priority=30,
            complexity="ADVANCED",
            dependencies=["prism-cad-feature-recognition"],
            consumers=["auto-cnc-programmer", "feature-based-machining"],
            hooks=[f"feature:{feat_id}:recognize", f"feature:{feat_id}:machine"],
            capabilities=[f"Recognize {feat_name}", f"Plan machining for {feat_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# GD&T SKILLS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

GDT_TOLERANCES = [
    # Form
    ("flatness", "Flatness", "FORM", "Surface flatness control"),
    ("straightness", "Straightness", "FORM", "Line straightness control"),
    ("circularity", "Circularity", "FORM", "Roundness control"),
    ("cylindricity", "Cylindricity", "FORM", "Cylinder form control"),
    
    # Orientation
    ("perpendicularity", "Perpendicularity", "ORIENTATION", "90° control"),
    ("parallelism", "Parallelism", "ORIENTATION", "Parallel control"),
    ("angularity", "Angularity", "ORIENTATION", "Angle control"),
    
    # Location
    ("position", "True Position", "LOCATION", "Feature location"),
    ("concentricity", "Concentricity", "LOCATION", "Center alignment"),
    ("symmetry", "Symmetry", "LOCATION", "Mirror symmetry"),
    
    # Runout
    ("circular-runout", "Circular Runout", "RUNOUT", "Single rotation check"),
    ("total-runout", "Total Runout", "RUNOUT", "Full surface rotation"),
    
    # Profile
    ("profile-line", "Profile of Line", "PROFILE", "2D profile control"),
    ("profile-surface", "Profile of Surface", "PROFILE", "3D profile control"),
    
    # Modifiers
    ("mmc", "MMC", "MODIFIER", "Maximum Material Condition"),
    ("lmc", "LMC", "MODIFIER", "Least Material Condition"),
    ("rfs", "RFS", "MODIFIER", "Regardless of Feature Size"),
    ("datum", "Datum", "REFERENCE", "Reference feature"),
    ("basic", "Basic Dimension", "REFERENCE", "Theoretically exact"),
    ("bonus-tolerance", "Bonus Tolerance", "MODIFIER", "Additional tolerance")
]

def generate_gdt_skills():
    skills = []
    for gdt_id, gdt_name, gdt_group, gdt_desc in GDT_TOLERANCES:
        skills.append(SkillDef(
            id=f"prism-gdt-{gdt_id}",
            name=f"GD&T: {gdt_name}",
            category="GDT",
            subcategory=gdt_group,
            description=f"{gdt_name}. {gdt_desc}",
            priority=40,
            complexity="ADVANCED",
            dependencies=["prism-standard-asme-y14-5"],
            consumers=["tolerance-analyzer", "inspection-planner"],
            hooks=[f"gdt:{gdt_id}:interpret", f"gdt:{gdt_id}:verify"],
            capabilities=[f"Interpret {gdt_name}", f"Plan inspection for {gdt_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# METROLOGY SKILLS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

METROLOGY = [
    # Dimensional
    ("caliper", "Caliper Measurement", "DIMENSIONAL", "Vernier/digital caliper"),
    ("micrometer", "Micrometer Measurement", "DIMENSIONAL", "Outside/inside mic"),
    ("height-gage", "Height Gage", "DIMENSIONAL", "Vertical measurement"),
    ("depth-gage", "Depth Gage", "DIMENSIONAL", "Depth measurement"),
    ("bore-gage", "Bore Gage", "DIMENSIONAL", "Hole diameter"),
    ("pin-gage", "Pin Gage", "DIMENSIONAL", "Go/No-Go hole check"),
    ("ring-gage", "Ring Gage", "DIMENSIONAL", "Shaft diameter check"),
    ("thread-gage", "Thread Gage", "DIMENSIONAL", "Thread pitch/form"),
    
    # CMM
    ("cmm-touch", "CMM Touch Probe", "CMM", "Contact measurement"),
    ("cmm-scanning", "CMM Scanning", "CMM", "Continuous contact"),
    ("cmm-optical", "CMM Optical", "CMM", "Non-contact vision"),
    ("cmm-laser", "CMM Laser", "CMM", "Laser scanning"),
    
    # Surface
    ("profilometer", "Profilometer", "SURFACE", "Surface roughness"),
    ("roundness-tester", "Roundness Tester", "SURFACE", "Circularity check"),
    ("contour-tracer", "Contour Tracer", "SURFACE", "Profile measurement"),
    
    # Optical
    ("optical-comparator", "Optical Comparator", "OPTICAL", "Shadow projection"),
    ("vision-system", "Vision System", "OPTICAL", "Camera inspection"),
    ("microscope", "Measurement Microscope", "OPTICAL", "Magnified measurement"),
    ("laser-scan", "Laser Scanner", "OPTICAL", "3D point cloud"),
    
    # Specialty
    ("hardness-tester", "Hardness Tester", "SPECIALTY", "HRC/HB/HV testing"),
    ("ultrasonic", "Ultrasonic Testing", "SPECIALTY", "Internal defects"),
    ("eddy-current", "Eddy Current", "SPECIALTY", "Surface cracks"),
    ("dye-penetrant", "Dye Penetrant", "SPECIALTY", "Surface defects"),
    ("xray", "X-Ray Inspection", "SPECIALTY", "Internal inspection"),
    ("ct-scan", "CT Scanning", "SPECIALTY", "3D internal imaging")
]

def generate_metrology_skills():
    skills = []
    for met_id, met_name, met_group, met_desc in METROLOGY:
        skills.append(SkillDef(
            id=f"prism-metrology-{met_id}",
            name=f"Metrology: {met_name}",
            category="METROLOGY",
            subcategory=met_group,
            description=f"{met_name}. {met_desc}",
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-quality-inspection"],
            consumers=["inspection-planner", "quality-control"],
            hooks=[f"metrology:{met_id}:measure", f"metrology:{met_id}:report"],
            capabilities=[f"Plan {met_name}", f"Analyze {met_name} results"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# ERROR HANDLING SKILLS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

ERRORS = [
    # System Errors
    ("state-corruption", "State Corruption", "SYSTEM", "Invalid state recovery"),
    ("file-access", "File Access Error", "SYSTEM", "File read/write failures"),
    ("memory-overflow", "Memory Overflow", "SYSTEM", "Context limit exceeded"),
    ("timeout", "Timeout Error", "SYSTEM", "Operation timeout"),
    ("network", "Network Error", "SYSTEM", "Connection failures"),
    
    # Validation Errors
    ("schema-violation", "Schema Violation", "VALIDATION", "Invalid data structure"),
    ("range-violation", "Range Violation", "VALIDATION", "Value out of bounds"),
    ("type-mismatch", "Type Mismatch", "VALIDATION", "Wrong data type"),
    ("missing-required", "Missing Required", "VALIDATION", "Required field absent"),
    ("constraint-violation", "Constraint Violation", "VALIDATION", "Business rule broken"),
    
    # Calculation Errors
    ("divide-by-zero", "Divide by Zero", "CALCULATION", "Mathematical error"),
    ("overflow", "Numeric Overflow", "CALCULATION", "Value too large"),
    ("underflow", "Numeric Underflow", "CALCULATION", "Value too small"),
    ("convergence", "Convergence Failure", "CALCULATION", "Iterative failure"),
    ("singularity", "Singularity", "CALCULATION", "Matrix singular"),
    
    # Domain Errors
    ("material-not-found", "Material Not Found", "DOMAIN", "Unknown material"),
    ("machine-not-found", "Machine Not Found", "DOMAIN", "Unknown machine"),
    ("tool-not-found", "Tool Not Found", "DOMAIN", "Unknown tool"),
    ("invalid-operation", "Invalid Operation", "DOMAIN", "Incompatible operation"),
    ("safety-violation", "Safety Violation", "DOMAIN", "Safety limit exceeded"),
    
    # Integration Errors
    ("api-error", "API Error", "INTEGRATION", "External API failure"),
    ("format-error", "Format Error", "INTEGRATION", "File format issue"),
    ("version-mismatch", "Version Mismatch", "INTEGRATION", "Incompatible version"),
    ("encoding-error", "Encoding Error", "INTEGRATION", "Character encoding"),
    
    # Recovery Actions
    ("retry", "Retry Strategy", "RECOVERY", "Automatic retry"),
    ("fallback", "Fallback Strategy", "RECOVERY", "Alternative approach"),
    ("graceful-degrade", "Graceful Degradation", "RECOVERY", "Reduced functionality"),
    ("checkpoint-restore", "Checkpoint Restore", "RECOVERY", "Return to checkpoint"),
    ("manual-intervention", "Manual Intervention", "RECOVERY", "User action required")
]

def generate_error_skills():
    skills = []
    for err_id, err_name, err_group, err_desc in ERRORS:
        skills.append(SkillDef(
            id=f"prism-error-{err_id}",
            name=f"Error: {err_name}",
            category="ERROR",
            subcategory=err_group,
            description=f"{err_name} handling. {err_desc}",
            priority=20,
            complexity="INTERMEDIATE",
            dependencies=["prism-error-recovery"],
            consumers=["error-handler", "workflow-manager"],
            hooks=[f"error:{err_id}:detect", f"error:{err_id}:handle"],
            capabilities=[f"Detect {err_name}", f"Handle {err_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-DOMAIN FUSION SKILLS (40+)
# ═══════════════════════════════════════════════════════════════════════════════

FUSIONS = [
    # Material + Tool
    ("material-tool-match", "Material-Tool Matching", "Expert tool selection for specific materials"),
    ("coating-material-opt", "Coating-Material Optimization", "Optimal coating for material"),
    
    # Physics + ML
    ("physics-ml-hybrid", "Physics-ML Hybrid", "Combined physics and ML prediction"),
    ("force-learn", "Force Learning", "Learn cutting force corrections"),
    ("thermal-learn", "Thermal Learning", "Learn temperature corrections"),
    
    # CAD + CAM
    ("feature-to-toolpath", "Feature to Toolpath", "Direct feature-based CAM"),
    ("tolerance-to-strategy", "Tolerance to Strategy", "GD&T-driven machining"),
    
    # Machine + Post
    ("machine-post-sync", "Machine-Post Sync", "Machine-specific post optimization"),
    ("kinematic-post", "Kinematic Post", "Kinematic-aware post processing"),
    
    # Quality + Learning
    ("quality-feedback", "Quality Feedback Loop", "Quality-driven parameter adjustment"),
    ("defect-learn", "Defect Learning", "Learn from quality defects"),
    
    # Material + Physics
    ("machinability-physics", "Machinability-Physics", "Physics-based machinability"),
    ("chip-physics", "Chip Formation Physics", "Material-specific chip modeling"),
    
    # Tool + Physics
    ("deflection-compensation", "Deflection Compensation", "Tool deflection in toolpath"),
    ("wear-prediction", "Wear Prediction", "Physics-based wear modeling"),
    
    # Multi-domain
    ("cost-quality-balance", "Cost-Quality Balance", "Multi-objective optimization"),
    ("time-quality-balance", "Time-Quality Balance", "Productivity vs quality"),
    ("safety-productivity", "Safety-Productivity", "Safe high-performance"),
    
    # Learning domains
    ("shop-floor-learn", "Shop Floor Learning", "Learn from production data"),
    ("operator-knowledge", "Operator Knowledge", "Capture operator expertise"),
    ("historical-analysis", "Historical Analysis", "Learn from past jobs"),
    
    # Integration fusions
    ("erp-cam-sync", "ERP-CAM Sync", "Business-manufacturing sync"),
    ("cad-inspection", "CAD-Inspection", "Model-based inspection"),
    ("simulation-actual", "Simulation-Actual", "Compare sim to reality"),
    
    # Advanced
    ("generative-cam", "Generative CAM", "AI-generated toolpaths"),
    ("adaptive-feed", "Adaptive Feed Control", "Real-time feed optimization"),
    ("predictive-maintenance", "Predictive Maintenance", "Failure prediction"),
    ("digital-twin", "Digital Twin Sync", "Virtual-physical sync"),
    
    # Process fusions
    ("multi-setup-opt", "Multi-Setup Optimization", "Minimize setups"),
    ("batch-optimization", "Batch Optimization", "Multi-part batching"),
    ("fixture-toolpath", "Fixture-Toolpath", "Fixture-aware machining"),
    
    # Knowledge fusions
    ("standard-practice", "Standard-Practice", "Standards + shop practice"),
    ("theory-practice", "Theory-Practice", "Academic + practical"),
    ("global-local", "Global-Local", "Industry + shop knowledge"),
    
    # Output fusions
    ("report-viz", "Report-Visualization", "Data + visual output"),
    ("doc-code", "Doc-Code Generation", "Documentation + code"),
    ("setup-nc", "Setup-NC Package", "Setup sheet + NC program")
]

def generate_fusion_skills():
    skills = []
    for i, (fus_id, fus_name, fus_desc) in enumerate(FUSIONS):
        skills.append(SkillDef(
            id=f"prism-fusion-{fus_id}",
            name=f"Fusion: {fus_name}",
            category="FUSION",
            subcategory="CROSS_DOMAIN",
            description=f"{fus_name}. {fus_desc}",
            priority=30,
            complexity="EXPERT",
            dependencies=["prism-skill-orchestrator"],
            consumers=["multi-domain-engine", "intelligent-assistant"],
            hooks=[f"fusion:{fus_id}:execute"],
            capabilities=[f"Execute {fus_name} fusion"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# LEARNING DOMAIN SKILLS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

LEARNING_DOMAINS = [
    ("parameter-learning", "Parameter Learning", "Learn optimal cutting parameters"),
    ("strategy-learning", "Strategy Learning", "Learn machining strategies"),
    ("tool-selection-learn", "Tool Selection Learning", "Learn tool choices"),
    ("sequence-learning", "Sequence Learning", "Learn operation sequences"),
    ("time-estimation-learn", "Time Estimation Learning", "Learn cycle times"),
    ("cost-estimation-learn", "Cost Estimation Learning", "Learn cost factors"),
    ("quality-prediction-learn", "Quality Prediction Learning", "Learn quality outcomes"),
    ("failure-mode-learn", "Failure Mode Learning", "Learn failure patterns"),
    ("preference-learning", "Preference Learning", "Learn user preferences"),
    ("shop-practice-learn", "Shop Practice Learning", "Learn shop conventions"),
    ("material-behavior-learn", "Material Behavior Learning", "Learn material responses"),
    ("machine-behavior-learn", "Machine Behavior Learning", "Learn machine characteristics"),
    ("tool-life-learn", "Tool Life Learning", "Learn wear patterns"),
    ("surface-finish-learn", "Surface Finish Learning", "Learn finish outcomes"),
    ("tolerance-achieve-learn", "Tolerance Achievement Learning", "Learn capability"),
    ("setup-time-learn", "Setup Time Learning", "Learn setup durations"),
    ("program-pattern-learn", "Program Pattern Learning", "Learn G-code patterns"),
    ("error-pattern-learn", "Error Pattern Learning", "Learn common errors"),
    ("optimization-learn", "Optimization Learning", "Learn optimization paths"),
    ("schedule-learn", "Schedule Learning", "Learn scheduling patterns"),
    ("capacity-learn", "Capacity Learning", "Learn capacity factors"),
    ("supplier-learn", "Supplier Learning", "Learn supplier behavior"),
    ("customer-learn", "Customer Learning", "Learn customer needs"),
    ("process-chain-learn", "Process Chain Learning", "Learn process sequences"),
    ("root-cause-learn", "Root Cause Learning", "Learn failure causes")
]

def generate_learning_skills():
    skills = []
    for learn_id, learn_name, learn_desc in LEARNING_DOMAINS:
        skills.append(SkillDef(
            id=f"prism-learning-{learn_id}",
            name=f"Learning: {learn_name}",
            category="LEARNING",
            subcategory="DOMAIN",
            description=learn_desc,
            priority=40,
            complexity="ADVANCED",
            dependencies=["prism-learning-engine"],
            consumers=["continuous-improvement", "recommendation-engine"],
            hooks=[f"learning:{learn_id}:train", f"learning:{learn_id}:apply"],
            capabilities=[f"Train {learn_name}", f"Apply learned {learn_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM SKILL EXPANSION WAVE 4 - ALLOYS, FEATURES, FUSIONS")
    print("=" * 80)
    
    # Load existing
    registry_path = r"C:\PRISM\registries\SKILL_REGISTRY.json"
    existing = []
    if os.path.exists(registry_path):
        with open(registry_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        existing = data.get("skills", [])
        print(f"\nLoaded {len(existing)} existing skills")
    
    # Generate Wave 4
    print("\nGenerating Wave 4 skills...")
    
    alloy_skills = generate_alloy_skills()
    print(f"  Alloy skills: {len(alloy_skills)}")
    
    feature_skills = generate_feature_skills()
    print(f"  Feature skills: {len(feature_skills)}")
    
    gdt_skills = generate_gdt_skills()
    print(f"  GD&T skills: {len(gdt_skills)}")
    
    metrology_skills = generate_metrology_skills()
    print(f"  Metrology skills: {len(metrology_skills)}")
    
    error_skills = generate_error_skills()
    print(f"  Error handling skills: {len(error_skills)}")
    
    fusion_skills = generate_fusion_skills()
    print(f"  Fusion skills: {len(fusion_skills)}")
    
    learning_skills = generate_learning_skills()
    print(f"  Learning skills: {len(learning_skills)}")
    
    # Combine
    wave4 = []
    for skill_list in [alloy_skills, feature_skills, gdt_skills, metrology_skills,
                       error_skills, fusion_skills, learning_skills]:
        wave4.extend([s.to_dict() for s in skill_list])
    
    print(f"\nWave 4 skills generated: {len(wave4)}")
    
    # Deduplicate
    all_skills = existing + wave4
    seen = set()
    unique = []
    for s in all_skills:
        sid = s.get("id", "")
        if sid and sid not in seen:
            seen.add(sid)
            unique.append(s)
    
    print(f"\n{'=' * 80}")
    print(f"TOTAL UNIQUE SKILLS: {len(unique)}")
    print(f"{'=' * 80}")
    
    # Categories
    cats = {}
    for s in unique:
        c = s.get("category", "UNKNOWN")
        cats[c] = cats.get(c, 0) + 1
    
    print("\nBy Category:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    
    # Save
    registry = {
        "version": "5.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_skill_expansion_wave4.py",
        "totalSkills": len(unique),
        "summary": {"byCategory": cats},
        "skills": unique
    }
    
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {registry_path}")
    
    # Audit
    audit = {
        "session": "R2.7-SKILL-WAVE4",
        "timestamp": datetime.now().isoformat(),
        "wave4Added": len(wave4),
        "total": len(unique),
        "categories": len(cats)
    }
    audit_path = r"C:\PRISM\mcp-server\audits\skill_expansion_wave4.json"
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")
    
    return unique

if __name__ == "__main__":
    main()
