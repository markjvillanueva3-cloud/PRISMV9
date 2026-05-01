#!/usr/bin/env python3
"""
PRISM SKILL EXPANSION WAVE 3 - DEEP GRANULAR COVERAGE
======================================================
Target: 1,500+ total skills

WAVE 3 ADDITIONS:
- Machining operations (50+ operations)
- Tool coatings (20+ coatings)
- Tooling vendors (30+ vendors)
- Standards (40+ standards)
- Thread types (30+ types)
- Tolerance classes (25+ classes)
- Surface treatments (20+ treatments)
- Workholding methods (25+ methods)
- Coolant types (15+ types)
- Insert geometries (40+ geometries)
- Cutting strategies per operation
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
    formulas: List[str] = field(default_factory=list)
    agents: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    status: str = "DEFINED"
    
    def to_dict(self):
        return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# MACHINING OPERATIONS (50+)
# ═══════════════════════════════════════════════════════════════════════════════

MILLING_OPERATIONS = [
    ("face-milling", "Face Milling", "Flat surface machining with face mill"),
    ("peripheral-milling", "Peripheral Milling", "Side milling with endmill"),
    ("slot-milling", "Slot Milling", "Full-width slotting"),
    ("pocket-milling", "Pocket Milling", "Closed pocket machining"),
    ("contour-milling", "Contour Milling", "2D profile following"),
    ("plunge-milling", "Plunge Milling", "Axial plunging for roughing"),
    ("ramp-milling", "Ramp Milling", "Helical/ramp entry"),
    ("trochoidal-milling", "Trochoidal Milling", "Dynamic milling paths"),
    ("hsm-roughing", "HSM Roughing", "High-speed adaptive roughing"),
    ("hsm-finishing", "HSM Finishing", "High-speed finishing"),
    ("3d-roughing", "3D Roughing", "Volumetric material removal"),
    ("3d-semi-finish", "3D Semi-Finishing", "Pre-finishing passes"),
    ("3d-finishing", "3D Finishing", "Final surface passes"),
    ("rest-milling", "Rest Milling", "Remaining material cleanup"),
    ("pencil-milling", "Pencil Milling", "Corner cleanup"),
    ("scallop-milling", "Scallop Milling", "Constant cusp height"),
    ("parallel-milling", "Parallel Milling", "Parallel lace passes"),
    ("radial-milling", "Radial Milling", "Radial pattern passes"),
    ("spiral-milling", "Spiral Milling", "Spiral pattern passes"),
    ("waterline-milling", "Waterline Milling", "Z-level contouring"),
    ("swarf-milling", "Swarf Milling", "5-axis side cutting"),
    ("multiaxis-milling", "Multi-Axis Milling", "Simultaneous 5-axis"),
    ("thread-milling", "Thread Milling", "Helical thread cutting"),
    ("chamfer-milling", "Chamfer Milling", "Edge chamfering"),
    ("deburr-milling", "Deburr Milling", "Burr removal passes")
]

TURNING_OPERATIONS = [
    ("od-roughing", "OD Roughing", "Outside diameter rough turning"),
    ("od-finishing", "OD Finishing", "OD finish turning"),
    ("id-roughing", "ID Roughing", "Inside diameter roughing"),
    ("id-finishing", "ID Finishing", "ID finish turning"),
    ("facing", "Facing", "Face turning"),
    ("grooving", "Grooving", "Groove cutting"),
    ("parting", "Parting", "Part-off cutting"),
    ("threading-od", "OD Threading", "External thread cutting"),
    ("threading-id", "ID Threading", "Internal thread cutting"),
    ("boring", "Boring", "Internal boring"),
    ("profiling-turn", "Profiling", "Complex profile turning"),
    ("taper-turning", "Taper Turning", "Conical surface turning"),
    ("contour-turning", "Contour Turning", "Free-form turning"),
    ("knurling", "Knurling", "Surface texturing"),
    ("burnishing", "Burnishing", "Surface finishing")
]

HOLEMAKING_OPERATIONS = [
    ("center-drilling", "Center Drilling", "Starting holes"),
    ("spot-drilling", "Spot Drilling", "Spotting for accuracy"),
    ("twist-drilling", "Twist Drilling", "Standard hole drilling"),
    ("peck-drilling", "Peck Drilling", "Deep hole with pecks"),
    ("gun-drilling", "Gun Drilling", "Very deep holes"),
    ("reaming", "Reaming", "Hole sizing/finishing"),
    ("boring-fine", "Fine Boring", "Precision hole finishing"),
    ("back-boring", "Back Boring", "Reverse side boring"),
    ("counterboring", "Counterboring", "Flat-bottom enlargement"),
    ("countersinking", "Countersinking", "Conical enlargement"),
    ("tapping", "Tapping", "Thread cutting"),
    ("thread-forming", "Thread Forming", "Chipless threading"),
    ("helical-interpolation", "Helical Interpolation", "Circular ramping")
]

def generate_operation_skills():
    skills = []
    for op_id, op_name, op_desc in MILLING_OPERATIONS:
        skills.append(SkillDef(
            id=f"prism-op-mill-{op_id}",
            name=f"Operation: {op_name}",
            category="OPERATION",
            subcategory="MILLING",
            description=op_desc,
            priority=30,
            complexity="ADVANCED",
            dependencies=["prism-cam-strategy-2d-profiling"],
            consumers=["auto-cnc-programmer", "cam-engine"],
            hooks=[f"operation:mill:{op_id}", f"toolpath:{op_id}:generate"],
            capabilities=[f"Generate {op_name} toolpaths", f"Optimize {op_name} parameters"]
        ))
    
    for op_id, op_name, op_desc in TURNING_OPERATIONS:
        skills.append(SkillDef(
            id=f"prism-op-turn-{op_id}",
            name=f"Operation: {op_name}",
            category="OPERATION",
            subcategory="TURNING",
            description=op_desc,
            priority=30,
            complexity="ADVANCED",
            dependencies=["prism-cam-strategy-turning-od"],
            consumers=["auto-cnc-programmer", "cam-engine"],
            hooks=[f"operation:turn:{op_id}", f"toolpath:{op_id}:generate"],
            capabilities=[f"Generate {op_name} toolpaths", f"Optimize {op_name} parameters"]
        ))
    
    for op_id, op_name, op_desc in HOLEMAKING_OPERATIONS:
        skills.append(SkillDef(
            id=f"prism-op-hole-{op_id}",
            name=f"Operation: {op_name}",
            category="OPERATION",
            subcategory="HOLEMAKING",
            description=op_desc,
            priority=30,
            complexity="INTERMEDIATE",
            dependencies=["prism-cam-strategy-drilling"],
            consumers=["auto-cnc-programmer", "cam-engine"],
            hooks=[f"operation:hole:{op_id}", f"toolpath:{op_id}:generate"],
            capabilities=[f"Generate {op_name} toolpaths", f"Optimize {op_name} parameters"]
        ))
    
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# TOOL COATINGS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

COATINGS = [
    ("tin", "TiN", "Titanium Nitride - general purpose gold coating"),
    ("ticn", "TiCN", "Titanium Carbonitride - harder than TiN"),
    ("tialn", "TiAlN", "Titanium Aluminum Nitride - high temp"),
    ("altin", "AlTiN", "Aluminum Titanium Nitride - very high temp"),
    ("tisin", "TiSiN", "Titanium Silicon Nitride - superalloys"),
    ("alcrn", "AlCrN", "Aluminum Chromium Nitride - dry machining"),
    ("crn", "CrN", "Chromium Nitride - stainless steel"),
    ("zrn", "ZrN", "Zirconium Nitride - non-ferrous"),
    ("dlc", "DLC", "Diamond-Like Carbon - aluminum, composites"),
    ("diamond", "CVD Diamond", "Chemical vapor deposited diamond"),
    ("pcd", "PCD", "Polycrystalline Diamond - non-ferrous"),
    ("cbn", "CBN", "Cubic Boron Nitride - hardened steel"),
    ("ceramic", "Ceramic", "Aluminum oxide, silicon nitride"),
    ("uncoated", "Uncoated", "No coating - soft materials"),
    ("multilayer", "Multilayer", "Multiple coating layers"),
    ("nanocomposite", "Nanocomposite", "Nano-structured coatings"),
    ("tibn", "TiBN", "Titanium Boron Nitride"),
    ("ticraln", "TiCrAlN", "Titanium Chrome Aluminum Nitride"),
    ("altisin", "AlTiSiN", "Aluminum Titanium Silicon Nitride"),
    ("taC", "ta-C", "Tetrahedral amorphous carbon")
]

def generate_coating_skills():
    skills = []
    for coat_id, coat_name, coat_desc in COATINGS:
        skills.append(SkillDef(
            id=f"prism-coating-{coat_id}",
            name=f"Coating: {coat_name}",
            category="TOOL",
            subcategory="COATING",
            description=coat_desc,
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-tool-coating"],
            consumers=["tool-selector", "speed-feed-calculator"],
            hooks=[f"coating:{coat_id}:select", f"coating:{coat_id}:recommend"],
            capabilities=[f"Select {coat_name} coating", f"Recommend materials for {coat_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# TOOLING VENDORS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

TOOL_VENDORS = [
    ("sandvik", "Sandvik Coromant", "Premium Swedish tooling"),
    ("kennametal", "Kennametal", "American tooling manufacturer"),
    ("iscar", "ISCAR", "Israeli cutting tools"),
    ("seco", "Seco Tools", "Swedish tooling"),
    ("walter", "Walter", "German precision tools"),
    ("mitsubishi-mat", "Mitsubishi Materials", "Japanese cutting tools"),
    ("sumitomo", "Sumitomo", "Japanese tooling"),
    ("kyocera", "Kyocera", "Japanese ceramics and tools"),
    ("tungaloy", "Tungaloy", "Japanese carbide tools"),
    ("korloy", "Korloy", "Korean cutting tools"),
    ("taegutec", "TaeguTec", "Korean tooling"),
    ("widia", "WIDIA", "American tooling brand"),
    ("dormer", "Dormer Pramet", "European round tools"),
    ("osg", "OSG", "Japanese taps and endmills"),
    ("nachi", "Nachi", "Japanese drills and taps"),
    ("guhring", "Gühring", "German round tools"),
    ("emuge", "Emuge", "German threading tools"),
    ("mapal", "MAPAL", "German precision tools"),
    ("horn", "Horn", "German grooving specialists"),
    ("ingersoll", "Ingersoll", "American indexable tools"),
    ("stellram", "Stellram", "Indexable milling"),
    ("vardex", "Vardex", "Threading specialists"),
    ("vargus", "Vargus", "Threading and grooving"),
    ("carmex", "Carmex", "Threading inserts"),
    ("yg1", "YG-1", "Korean cutting tools"),
    ("zcc-ct", "ZCC-CT", "Chinese carbide tools"),
    ("ceratizit", "Ceratizit", "Austrian tooling"),
    ("fraisa", "Fraisa", "Swiss endmills"),
    ("hanita", "Hanita", "Israeli endmills"),
    ("niagara", "Niagara Cutter", "American endmills")
]

def generate_vendor_skills():
    skills = []
    for vendor_id, vendor_name, vendor_desc in TOOL_VENDORS:
        skills.append(SkillDef(
            id=f"prism-vendor-{vendor_id}",
            name=f"Vendor: {vendor_name}",
            category="TOOL",
            subcategory="VENDOR",
            description=vendor_desc,
            priority=50,
            complexity="INTERMEDIATE",
            dependencies=["prism-tool-schema"],
            consumers=["tool-selector", "inventory-manager"],
            hooks=[f"vendor:{vendor_id}:catalog", f"vendor:{vendor_id}:recommend"],
            capabilities=[f"Access {vendor_name} catalog", f"Select {vendor_name} tools"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# STANDARDS (40+)
# ═══════════════════════════════════════════════════════════════════════════════

STANDARDS = [
    # ISO Standards
    ("iso-1", "ISO 1", "Standard reference temperature"),
    ("iso-286", "ISO 286", "Limits and fits"),
    ("iso-513", "ISO 513", "Cutting tool materials classification"),
    ("iso-1302", "ISO 1302", "Surface texture indication"),
    ("iso-1832", "ISO 1832", "Indexable insert designation"),
    ("iso-2768", "ISO 2768", "General tolerances"),
    ("iso-4287", "ISO 4287", "Surface roughness parameters"),
    ("iso-5608", "ISO 5608", "Turning tool holder designation"),
    ("iso-6983", "ISO 6983", "G-code programming"),
    ("iso-10816", "ISO 10816", "Machine vibration evaluation"),
    ("iso-13399", "ISO 13399", "Cutting tool data representation"),
    ("iso-14649", "ISO 14649", "STEP-NC programming"),
    
    # ASME Standards  
    ("asme-y14-5", "ASME Y14.5", "GD&T dimensioning"),
    ("asme-b4-1", "ASME B4.1", "Preferred limits and fits"),
    ("asme-b46-1", "ASME B46.1", "Surface texture"),
    ("asme-b94-19", "ASME B94.19", "Milling cutters"),
    
    # DIN Standards
    ("din-1", "DIN 1", "Machining symbols"),
    ("din-6580", "DIN 6580", "Cutting terms"),
    ("din-6581", "DIN 6581", "Tool angles"),
    ("din-69871", "DIN 69871", "Tool holders"),
    
    # ANSI Standards
    ("ansi-b94-11m", "ANSI B94.11M", "Twist drills"),
    ("ansi-b94-19", "ANSI B94.19", "Milling cutters"),
    ("ansi-b212-15", "ANSI B212.15", "Carbide grades"),
    
    # Thread Standards
    ("iso-68", "ISO 68", "Metric thread profile"),
    ("iso-261", "ISO 261", "Metric thread general"),
    ("iso-724", "ISO 724", "Metric thread dimensions"),
    ("ansi-b1-1", "ANSI B1.1", "Unified threads"),
    ("ansi-b1-13m", "ANSI B1.13M", "Metric threads"),
    
    # Material Standards
    ("astm-a36", "ASTM A36", "Carbon structural steel"),
    ("astm-a572", "ASTM A572", "HSLA steel"),
    ("sae-j403", "SAE J403", "Chemical compositions"),
    ("sae-j404", "SAE J404", "Hardenability"),
    ("ams-2759", "AMS 2759", "Heat treatment"),
    ("uns", "UNS", "Unified numbering system"),
    
    # Quality Standards
    ("iso-9001", "ISO 9001", "Quality management"),
    ("as9100", "AS9100", "Aerospace quality"),
    ("iso-13485", "ISO 13485", "Medical device quality"),
    ("iatf-16949", "IATF 16949", "Automotive quality")
]

def generate_standard_skills():
    skills = []
    for std_id, std_name, std_desc in STANDARDS:
        skills.append(SkillDef(
            id=f"prism-standard-{std_id}",
            name=f"Standard: {std_name}",
            category="STANDARD",
            subcategory="SPECIFICATION",
            description=std_desc,
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-standards-expert"],
            consumers=["documentation", "validation"],
            hooks=[f"standard:{std_id}:lookup", f"standard:{std_id}:validate"],
            capabilities=[f"Apply {std_name}", f"Validate against {std_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# THREAD TYPES (30+)
# ═══════════════════════════════════════════════════════════════════════════════

THREAD_TYPES = [
    ("metric-coarse", "Metric Coarse", "ISO metric standard pitch"),
    ("metric-fine", "Metric Fine", "ISO metric fine pitch"),
    ("unc", "UNC", "Unified National Coarse"),
    ("unf", "UNF", "Unified National Fine"),
    ("unef", "UNEF", "Unified National Extra Fine"),
    ("uns", "UNS", "Unified National Special"),
    ("bsp", "BSP", "British Standard Pipe"),
    ("bspt", "BSPT", "British Standard Pipe Taper"),
    ("npt", "NPT", "National Pipe Taper"),
    ("nptf", "NPTF", "National Pipe Taper Fuel"),
    ("nps", "NPS", "National Pipe Straight"),
    ("acme", "ACME", "ACME thread for power transmission"),
    ("stub-acme", "Stub ACME", "Shallow ACME thread"),
    ("trapezoidal", "Trapezoidal", "ISO metric trapezoidal"),
    ("buttress", "Buttress", "Asymmetric load-bearing"),
    ("whitworth", "Whitworth", "British Whitworth"),
    ("ba", "BA", "British Association"),
    ("pg", "PG", "German conduit thread"),
    ("un", "UN", "Unified constant pitch"),
    ("unjc", "UNJC", "Unified J-series coarse"),
    ("unjf", "UNJF", "Unified J-series fine"),
    ("mj", "MJ", "Metric J-profile aerospace"),
    ("unr", "UNR", "Unified radius root"),
    ("m-thread", "M Profile", "ISO metric M profile"),
    ("g-thread", "G Thread", "British parallel pipe"),
    ("rc-thread", "Rc Thread", "British taper pipe"),
    ("rp-thread", "Rp Thread", "British parallel internal"),
    ("pt", "PT", "JIS taper pipe"),
    ("pf", "PF", "JIS parallel pipe"),
    ("tr", "Tr", "ISO trapezoidal metric")
]

def generate_thread_skills():
    skills = []
    for thread_id, thread_name, thread_desc in THREAD_TYPES:
        skills.append(SkillDef(
            id=f"prism-thread-{thread_id}",
            name=f"Thread: {thread_name}",
            category="THREAD",
            subcategory="TYPE",
            description=thread_desc,
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-manufacturing-tables"],
            consumers=["thread-calculator", "gcode-generator"],
            hooks=[f"thread:{thread_id}:calculate", f"thread:{thread_id}:generate"],
            capabilities=[f"Calculate {thread_name} dimensions", f"Generate {thread_name} G-code"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# INSERT GEOMETRIES (40+)
# ═══════════════════════════════════════════════════════════════════════════════

INSERT_GEOMETRIES = [
    # Turning inserts (ISO)
    ("cnmg", "CNMG", "80° rhombic negative"),
    ("dnmg", "DNMG", "55° rhombic negative"),
    ("vnmg", "VNMG", "35° rhombic negative"),
    ("wnmg", "WNMG", "80° trigon negative"),
    ("tnmg", "TNMG", "60° triangle negative"),
    ("snmg", "SNMG", "90° square negative"),
    ("ccmt", "CCMT", "80° rhombic positive"),
    ("dcmt", "DCMT", "55° rhombic positive"),
    ("vcmt", "VCMT", "35° rhombic positive"),
    ("tcmt", "TCMT", "60° triangle positive"),
    ("scmt", "SCMT", "90° square positive"),
    ("rcmt", "RCMT", "Round positive"),
    ("cpgt", "CPGT", "80° rhombic ground positive"),
    ("dpgt", "DPGT", "55° rhombic ground positive"),
    ("tpgt", "TPGT", "60° triangle ground positive"),
    
    # Milling inserts
    ("apkt", "APKT", "85° parallelogram milling"),
    ("apmt", "APMT", "85° parallelogram milling"),
    ("rpmt", "RPMT", "Round milling"),
    ("sdmt", "SDMT", "90° square double-sided"),
    ("snmt", "SNMT", "90° square milling"),
    ("odmt", "ODMT", "Octagonal double-sided"),
    ("xnex", "XNEX", "High-feed milling"),
    ("loex", "LOEX", "Long-edge milling"),
    
    # Grooving/Parting inserts
    ("n123", "N123 Style", "Single-ended grooving"),
    ("gip", "GIP Style", "Double-ended grooving"),
    ("lcmf", "LCMF", "Cut-off insert"),
    
    # Threading inserts
    ("16er", "16ER", "External threading"),
    ("16ir", "16IR", "Internal threading"),
    ("22er", "22ER", "Large external threading"),
    
    # Drilling inserts
    ("wcmx", "WCMX", "Indexable drill center"),
    ("spgx", "SPGX", "Indexable drill peripheral"),
    ("somx", "SOMX", "Indexable drill insert"),
    
    # Face mill inserts
    ("semt", "SEMT", "Square face mill"),
    ("ofer", "OFER", "Octagonal face mill"),
    ("sekn", "SEKN", "Square face mill negative"),
    
    # Special geometries
    ("wiper", "Wiper", "Extended surface contact"),
    ("chipbreaker", "Chipbreaker", "Formed chip control"),
    ("pressed", "Pressed", "As-pressed insert"),
    ("ground", "Ground", "Precision ground insert")
]

def generate_insert_skills():
    skills = []
    for ins_id, ins_name, ins_desc in INSERT_GEOMETRIES:
        skills.append(SkillDef(
            id=f"prism-insert-{ins_id}",
            name=f"Insert: {ins_name}",
            category="TOOL",
            subcategory="INSERT",
            description=ins_desc,
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-tool-geometry"],
            consumers=["tool-selector", "insert-recommender"],
            hooks=[f"insert:{ins_id}:select", f"insert:{ins_id}:recommend"],
            capabilities=[f"Select {ins_name} insert", f"Recommend operations for {ins_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# WORKHOLDING METHODS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

WORKHOLDING = [
    ("3jaw-chuck", "3-Jaw Chuck", "Self-centering round work"),
    ("4jaw-chuck", "4-Jaw Chuck", "Independent jaw adjustment"),
    ("6jaw-chuck", "6-Jaw Chuck", "Thin-wall part holding"),
    ("collet-chuck", "Collet Chuck", "Precision round holding"),
    ("face-driver", "Face Driver", "Between centers with drive"),
    ("mandrel", "Mandrel", "ID-based holding"),
    ("expanding-mandrel", "Expanding Mandrel", "Adjustable ID holding"),
    ("vise", "Machine Vise", "Rectangular part clamping"),
    ("angle-plate", "Angle Plate", "90° orientation"),
    ("v-block", "V-Block", "Cylindrical part support"),
    ("fixture-plate", "Fixture Plate", "Modular fixturing"),
    ("t-slot-clamp", "T-Slot Clamp", "Direct table clamping"),
    ("toe-clamp", "Toe Clamp", "Edge clamping"),
    ("strap-clamp", "Strap Clamp", "Over-the-top clamping"),
    ("magnetic-chuck", "Magnetic Chuck", "Ferrous flat parts"),
    ("vacuum-chuck", "Vacuum Chuck", "Non-ferrous flat parts"),
    ("soft-jaws", "Soft Jaws", "Custom-machined gripping"),
    ("hard-jaws", "Hard Jaws", "Standard serrated gripping"),
    ("pie-jaws", "Pie Jaws", "Large diameter holding"),
    ("live-center", "Live Center", "Rotating tailstock support"),
    ("dead-center", "Dead Center", "Fixed tailstock support"),
    ("steady-rest", "Steady Rest", "Long part support"),
    ("follow-rest", "Follow Rest", "Moving part support"),
    ("tombstone", "Tombstone", "Multi-face fixturing"),
    ("pallet", "Pallet System", "Quick-change workholding")
]

def generate_workholding_skills():
    skills = []
    for wh_id, wh_name, wh_desc in WORKHOLDING:
        skills.append(SkillDef(
            id=f"prism-workhold-{wh_id}",
            name=f"Workholding: {wh_name}",
            category="WORKHOLDING",
            subcategory="METHOD",
            description=wh_desc,
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-machine-workholding"],
            consumers=["setup-planner", "fixture-selector"],
            hooks=[f"workholding:{wh_id}:select", f"workholding:{wh_id}:calculate"],
            capabilities=[f"Select {wh_name}", f"Calculate clamping force for {wh_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# COOLANT TYPES (15+)
# ═══════════════════════════════════════════════════════════════════════════════

COOLANTS = [
    ("soluble-oil", "Soluble Oil", "Oil-in-water emulsion"),
    ("semi-synthetic", "Semi-Synthetic", "Oil and synthetic blend"),
    ("full-synthetic", "Full Synthetic", "No petroleum oil"),
    ("straight-oil", "Straight Oil", "Neat cutting oil"),
    ("vegetable-oil", "Vegetable Oil", "Bio-based cutting oil"),
    ("mql", "MQL", "Minimum quantity lubrication"),
    ("air-blast", "Air Blast", "Compressed air cooling"),
    ("cryogenic", "Cryogenic", "Liquid nitrogen/CO2"),
    ("high-pressure", "High Pressure Coolant", "70+ bar through-tool"),
    ("flood", "Flood Coolant", "Standard flood application"),
    ("mist", "Mist Coolant", "Atomized coolant spray"),
    ("dry", "Dry Machining", "No coolant"),
    ("water", "Water", "Pure water cooling"),
    ("co2-snow", "CO2 Snow", "Solid CO2 cooling"),
    ("paste", "Cutting Paste", "Manual application paste")
]

def generate_coolant_skills():
    skills = []
    for cool_id, cool_name, cool_desc in COOLANTS:
        skills.append(SkillDef(
            id=f"prism-coolant-{cool_id}",
            name=f"Coolant: {cool_name}",
            category="COOLANT",
            subcategory="TYPE",
            description=cool_desc,
            priority=50,
            complexity="BASIC",
            dependencies=["prism-machine-coolant"],
            consumers=["process-planner", "coolant-selector"],
            hooks=[f"coolant:{cool_id}:select", f"coolant:{cool_id}:recommend"],
            capabilities=[f"Select {cool_name}", f"Recommend materials for {cool_name}"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# SURFACE TREATMENTS (20+)
# ═══════════════════════════════════════════════════════════════════════════════

SURFACE_TREATMENTS = [
    ("anodize", "Anodizing", "Aluminum oxide coating"),
    ("hard-anodize", "Hard Anodizing", "Type III thick anodize"),
    ("chromate", "Chromate Conversion", "Chem film / Alodine"),
    ("passivate", "Passivation", "Stainless steel treatment"),
    ("phosphate", "Phosphate Coating", "Parkerizing / Bonderite"),
    ("black-oxide", "Black Oxide", "Iron oxide conversion"),
    ("zinc-plate", "Zinc Plating", "Corrosion protection"),
    ("nickel-plate", "Nickel Plating", "Wear resistance"),
    ("chrome-plate", "Chrome Plating", "Hard chrome coating"),
    ("electroless-nickel", "Electroless Nickel", "Uniform thickness"),
    ("cadmium-plate", "Cadmium Plating", "Aerospace corrosion"),
    ("tin-plate", "Tin Plating", "Solderability"),
    ("silver-plate", "Silver Plating", "Conductivity"),
    ("gold-plate", "Gold Plating", "Contact resistance"),
    ("powder-coat", "Powder Coating", "Thick polymer coating"),
    ("paint", "Paint", "Decorative/protective"),
    ("nitride", "Nitriding", "Surface hardening"),
    ("carburize", "Carburizing", "Case hardening"),
    ("induction-harden", "Induction Hardening", "Localized hardening"),
    ("shot-peen", "Shot Peening", "Compressive stress")
]

def generate_treatment_skills():
    skills = []
    for treat_id, treat_name, treat_desc in SURFACE_TREATMENTS:
        skills.append(SkillDef(
            id=f"prism-treatment-{treat_id}",
            name=f"Treatment: {treat_name}",
            category="SURFACE",
            subcategory="TREATMENT",
            description=treat_desc,
            priority=50,
            complexity="INTERMEDIATE",
            dependencies=["prism-material-surface-integrity"],
            consumers=["process-planner", "finish-selector"],
            hooks=[f"treatment:{treat_id}:specify", f"treatment:{treat_id}:validate"],
            capabilities=[f"Specify {treat_name}", f"Validate material compatibility"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# TOLERANCE CLASSES (25+)
# ═══════════════════════════════════════════════════════════════════════════════

TOLERANCE_CLASSES = [
    # ISO fit classes
    ("h6", "h6 Shaft", "Precision shaft -0/ground"),
    ("h7", "h7 Shaft", "Standard precision shaft"),
    ("h8", "h8 Shaft", "General purpose shaft"),
    ("h9", "h9 Shaft", "Loose fit shaft"),
    ("H6", "H6 Hole", "Precision hole ground"),
    ("H7", "H7 Hole", "Standard precision hole"),
    ("H8", "H8 Hole", "General purpose hole"),
    ("H9", "H9 Hole", "Loose fit hole"),
    ("g6", "g6 Shaft", "Sliding fit shaft"),
    ("f7", "f7 Shaft", "Running fit shaft"),
    ("e8", "e8 Shaft", "Free running shaft"),
    ("js6", "js6 Bilateral", "Bilateral tolerance ±"),
    ("k6", "k6 Transition", "Light press fit"),
    ("m6", "m6 Transition", "Medium press fit"),
    ("n6", "n6 Interference", "Light interference"),
    ("p6", "p6 Interference", "Medium interference"),
    ("r6", "r6 Interference", "Heavy interference"),
    ("s6", "s6 Interference", "Force fit"),
    
    # General tolerances ISO 2768
    ("iso2768-f", "ISO 2768-f Fine", "Fine general tolerances"),
    ("iso2768-m", "ISO 2768-m Medium", "Medium general tolerances"),
    ("iso2768-c", "ISO 2768-c Coarse", "Coarse general tolerances"),
    ("iso2768-v", "ISO 2768-v Very Coarse", "Very coarse tolerances"),
    
    # Surface finish classes
    ("n1", "N1 (Ra 0.025)", "Mirror finish"),
    ("n4", "N4 (Ra 0.2)", "Ground finish"),
    ("n6", "N6 (Ra 0.8)", "Fine machined"),
    ("n8", "N8 (Ra 3.2)", "Standard machined")
]

def generate_tolerance_skills():
    skills = []
    for tol_id, tol_name, tol_desc in TOLERANCE_CLASSES:
        skills.append(SkillDef(
            id=f"prism-tolerance-{tol_id.lower().replace('.', '-')}",
            name=f"Tolerance: {tol_name}",
            category="TOLERANCE",
            subcategory="CLASS",
            description=tol_desc,
            priority=40,
            complexity="INTERMEDIATE",
            dependencies=["prism-standard-iso-286"],
            consumers=["tolerance-analyzer", "process-planner"],
            hooks=[f"tolerance:{tol_id}:lookup", f"tolerance:{tol_id}:calculate"],
            capabilities=[f"Look up {tol_name} limits", f"Calculate process capability"]
        ))
    return skills

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM SKILL EXPANSION WAVE 3 - DEEP GRANULAR COVERAGE")
    print("=" * 80)
    
    # Load existing skills
    registry_path = r"C:\PRISM\registries\SKILL_REGISTRY.json"
    existing_skills = []
    if os.path.exists(registry_path):
        with open(registry_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        existing_skills = data.get("skills", [])
        print(f"\nLoaded {len(existing_skills)} existing skills")
    
    # Generate Wave 3 skills
    print("\nGenerating Wave 3 skills...")
    
    operation_skills = generate_operation_skills()
    print(f"  Operation skills: {len(operation_skills)}")
    
    coating_skills = generate_coating_skills()
    print(f"  Coating skills: {len(coating_skills)}")
    
    vendor_skills = generate_vendor_skills()
    print(f"  Vendor skills: {len(vendor_skills)}")
    
    standard_skills = generate_standard_skills()
    print(f"  Standard skills: {len(standard_skills)}")
    
    thread_skills = generate_thread_skills()
    print(f"  Thread skills: {len(thread_skills)}")
    
    insert_skills = generate_insert_skills()
    print(f"  Insert skills: {len(insert_skills)}")
    
    workholding_skills = generate_workholding_skills()
    print(f"  Workholding skills: {len(workholding_skills)}")
    
    coolant_skills = generate_coolant_skills()
    print(f"  Coolant skills: {len(coolant_skills)}")
    
    treatment_skills = generate_treatment_skills()
    print(f"  Treatment skills: {len(treatment_skills)}")
    
    tolerance_skills = generate_tolerance_skills()
    print(f"  Tolerance skills: {len(tolerance_skills)}")
    
    # Combine
    wave3_skills = []
    for skill_list in [operation_skills, coating_skills, vendor_skills, standard_skills,
                       thread_skills, insert_skills, workholding_skills, coolant_skills,
                       treatment_skills, tolerance_skills]:
        wave3_skills.extend([s.to_dict() for s in skill_list])
    
    print(f"\nWave 3 skills generated: {len(wave3_skills)}")
    
    # Combine all
    all_skills = existing_skills + wave3_skills
    
    # Deduplicate
    seen = set()
    unique_skills = []
    for s in all_skills:
        sid = s.get("id", "")
        if sid and sid not in seen:
            seen.add(sid)
            unique_skills.append(s)
    
    print(f"\n{'=' * 80}")
    print(f"TOTAL UNIQUE SKILLS: {len(unique_skills)}")
    print(f"{'=' * 80}")
    
    # Category counts
    cats = {}
    for s in unique_skills:
        c = s.get("category", "UNKNOWN")
        cats[c] = cats.get(c, 0) + 1
    
    print("\nBy Category:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    
    # Save
    registry = {
        "version": "4.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_skill_expansion_wave3.py",
        "totalSkills": len(unique_skills),
        "summary": {"byCategory": cats},
        "skills": unique_skills
    }
    
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {registry_path}")
    
    # Audit
    audit_path = r"C:\PRISM\mcp-server\audits\skill_expansion_wave3.json"
    audit = {
        "session": "R2.7-SKILL-WAVE3",
        "timestamp": datetime.now().isoformat(),
        "wave3Added": len(wave3_skills),
        "total": len(unique_skills),
        "categories": len(cats)
    }
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")
    
    return unique_skills

if __name__ == "__main__":
    main()
