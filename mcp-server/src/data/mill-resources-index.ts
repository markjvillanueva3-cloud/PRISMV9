/**
 * Mill Resources Index — MILL-AWARE-MS9
 * ======================================
 * Comprehensive index of ALL milling-related resources in H:/PRISM/resources.
 * Enables "find resource for X" queries and integrates with MillAISelfAwarenessIntegrationEngine.
 *
 * Resource Types:
 *   - post: Post processor files (.cps, .pst, .nc)
 *   - tool_db: Tool database files (.tooldb, .db, .csv, .xml)
 *   - material_db: Material/cutting data databases
 *   - strategy: CAM strategy templates and macros
 *   - manual: PDF manuals and documentation
 *   - tutorial: Training materials and courses
 *   - machine_model: 3D machine models for simulation
 *   - automation: Automation scripts and macros
 *   - workholding: Workholding and fixture data
 *
 * Sources:
 *   - H:/PRISM/resources/MasterCam/
 *   - H:/PRISM/resources/HYPERMILL/
 *   - H:/PRISM/resources/OPEN MIND/
 *   - H:/PRISM/resources/FUSION POSTS/
 *   - H:/PRISM/resources/POSTS AND MACHINES/
 *   - H:/PRISM/resources/RESOURCE PDFS/
 *   - H:/PRISM/resources/WORKHOLDING AND FIXTURE CATALOGS/
 *
 * @module data/mill-resources-index
 * @milestone MILL-AWARE-MS9
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Resource type classification */
export type MillResourceType =
  | "post"
  | "tool_db"
  | "material_db"
  | "strategy"
  | "manual"
  | "tutorial"
  | "machine_model"
  | "automation"
  | "workholding"
  | "nc_program"
  | "formula";

/** CAM system classification */
export type MillCAMSystem =
  | "mastercam"
  | "hypermill"
  | "fusion360"
  | "solidcam"
  | "powermill"
  | "inventorcam"
  | "esprit"
  | "generic";

/** Controller classification */
export type MillController =
  | "haas"
  | "hurco"
  | "okuma"
  | "fanuc"
  | "siemens"
  | "brother"
  | "mazak"
  | "dmg_mori"
  | "grob"
  | "roku_roku"
  | "generic";

/** A single resource entry in the index */
export interface MillResourceEntry {
  /** Unique resource ID */
  id: string;
  /** Resource type classification */
  resource_type: MillResourceType;
  /** Full file path */
  path: string;
  /** File name */
  filename: string;
  /** What the resource contains */
  description: string;
  /** CAM system (if applicable) */
  cam_system: MillCAMSystem;
  /** Controller (if applicable) */
  controller: MillController | null;
  /** File extension */
  extension: string;
  /** Keywords for search */
  keywords: string[];
  /** Whether this is a high-value resource */
  priority: "high" | "medium" | "low";
}

/** A category of resources */
export interface MillResourceCategory {
  /** Category name */
  name: string;
  /** Category description */
  description: string;
  /** Base path for this category */
  basePath: string;
  /** File count (approximate) */
  fileCount: number;
  /** Primary resource types in this category */
  resourceTypes: MillResourceType[];
  /** CAM systems represented */
  camSystems: MillCAMSystem[];
  /** Controllers represented */
  controllers: MillController[];
}

// ============================================================================
// RESOURCE CATEGORIES
// ============================================================================

export const MILL_RESOURCE_CATEGORIES: MillResourceCategory[] = [
  // MasterCam Resources
  {
    name: "MasterCam Posts",
    description: "MasterCam post processors and simulation data for Mill, Lathe, Mill Turn, Router, Wire",
    basePath: "H:/PRISM/resources/MasterCam/MASTERCAM/POSTS",
    fileCount: 450,
    resourceTypes: ["post", "nc_program"],
    camSystems: ["mastercam"],
    controllers: ["haas", "hurco", "okuma", "fanuc"]
  },
  {
    name: "MasterCam Tutorials",
    description: "MasterCam X8 tutorial files for dynamic milling, tool manager, WCS intro, solids",
    basePath: "H:/PRISM/resources/MasterCam",
    fileCount: 50,
    resourceTypes: ["tutorial"],
    camSystems: ["mastercam"],
    controllers: []
  },

  // Fusion 360 Resources
  {
    name: "Fusion 360 Posts",
    description: "Fusion 360 post processors for Hurco VM30i, Okuma MULTUS, Okuma M460V-5AX",
    basePath: "H:/PRISM/resources/FUSION POSTS",
    fileCount: 4,
    resourceTypes: ["post"],
    camSystems: ["fusion360"],
    controllers: ["hurco", "okuma"]
  },
  {
    name: "Fusion Basic Posts",
    description: "Basic Fusion 360 post processor templates",
    basePath: "H:/PRISM/resources/FUSION BASIC POSTS",
    fileCount: 10,
    resourceTypes: ["post"],
    camSystems: ["fusion360"],
    controllers: ["generic"]
  },

  // hyperMILL / OPEN MIND Resources
  {
    name: "hyperMILL 33.0",
    description: "hyperMILL v33 installation with CamPlanTech, macrotech, tiremachining, AddIns",
    basePath: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0",
    fileCount: 18000,
    resourceTypes: ["strategy", "automation", "tool_db"],
    camSystems: ["hypermill"],
    controllers: []
  },
  {
    name: "OPEN MIND hyperMILL",
    description: "OPEN MIND hyperMILL data including hyperCAD-S, NC Generator, Tool Database",
    basePath: "H:/PRISM/resources/OPEN MIND/hyperMILL",
    fileCount: 20000,
    resourceTypes: ["strategy", "automation"],
    camSystems: ["hypermill"],
    controllers: []
  },
  {
    name: "OPEN MIND Tool Database",
    description: "hyperMILL Tool Database v31/v33 with materials, cutter definitions, demo DBs",
    basePath: "H:/PRISM/resources/OPEN MIND/Tool Database",
    fileCount: 500,
    resourceTypes: ["tool_db", "material_db"],
    camSystems: ["hypermill"],
    controllers: []
  },
  {
    name: "OPEN MIND NC Generator",
    description: "hyperMILL NC Generator v33 with post processor modules for Haas, Hurco, Okuma, Mazak, DMG MORI",
    basePath: "H:/PRISM/resources/OPEN MIND/NcGenerator/33.0",
    fileCount: 200,
    resourceTypes: ["post"],
    camSystems: ["hypermill"],
    controllers: ["haas", "hurco", "okuma", "mazak", "dmg_mori", "grob", "fanuc"]
  },

  // PDF Resources
  {
    name: "Resource PDFs",
    description: "3GB+ of machining PDFs: CNC basics, hyperMILL manuals, InventorCAM training, speed/feed guides",
    basePath: "H:/PRISM/resources/RESOURCE PDFS",
    fileCount: 200,
    resourceTypes: ["manual", "tutorial"],
    camSystems: ["hypermill", "inventorcam", "solidcam", "mastercam", "fusion360", "generic"],
    controllers: ["haas", "fanuc", "siemens", "okuma", "mazak"]
  },
  {
    name: "Main PDF Folder",
    description: "General PDF documentation",
    basePath: "H:/PRISM/resources/PDF",
    fileCount: 50,
    resourceTypes: ["manual"],
    camSystems: ["generic"],
    controllers: []
  },

  // Machine Models
  {
    name: "Posts and Machines",
    description: "5-axis post packages, machine models (Haas VF-2, Hurco VMX30, Okuma Genos M460V-5AX, MULTUS B250II)",
    basePath: "H:/PRISM/resources/POSTS AND MACHINES",
    fileCount: 20,
    resourceTypes: ["post", "machine_model"],
    camSystems: ["generic"],
    controllers: ["haas", "hurco", "okuma", "roku_roku"]
  },
  {
    name: "Generic Machine Models",
    description: "Generic machine models for CAD/CAM simulation learning",
    basePath: "H:/PRISM/resources/GENERIC MACHINE MODELS",
    fileCount: 30,
    resourceTypes: ["machine_model"],
    camSystems: ["generic"],
    controllers: []
  },
  {
    name: "Machine Simulation Models",
    description: "Machine simulation models for Virtual Machine Viewer",
    basePath: "H:/PRISM/resources/MACHINE_SIMULATION_MODELS",
    fileCount: 25,
    resourceTypes: ["machine_model"],
    camSystems: ["generic"],
    controllers: []
  },

  // Workholding
  {
    name: "Workholding and Fixture Catalogs",
    description: "Workholding catalogs: Kurt, Bison, Schunk, Kitagawa, Jergens, Lang, MATE, 5th Axis, Royal, System 3R",
    basePath: "H:/PRISM/resources/WORKHOLDING AND FIXTURE CATALOGS",
    fileCount: 50,
    resourceTypes: ["workholding"],
    camSystems: ["generic"],
    controllers: []
  },

  // Training Materials
  {
    name: "Basic Training",
    description: "3-day CAD/CAM basic training materials",
    basePath: "H:/PRISM/resources/1- Basic Training Day 1",
    fileCount: 30,
    resourceTypes: ["tutorial"],
    camSystems: ["generic"],
    controllers: []
  },
  {
    name: "MIT Courses",
    description: "MIT OpenCourseWare manufacturing courses (2.008, 2.810, 2.830, algorithms, optimization)",
    basePath: "H:/PRISM/resources/MIT COURSES",
    fileCount: 100,
    resourceTypes: ["tutorial"],
    camSystems: ["generic"],
    controllers: []
  },

  // Knowledge Resources
  {
    name: "Machining Knowledge Formulas",
    description: "PRISM cross-disciplinary formulas, advanced algorithms, university course references",
    basePath: "H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS",
    fileCount: 3,
    resourceTypes: ["formula"],
    camSystems: ["generic"],
    controllers: []
  },

  // SolidCAM
  {
    name: "SolidCAM",
    description: "SolidCAM algorithms and chip thickness math for iMachining",
    basePath: "H:/PRISM/resources/SOLIDCAM",
    fileCount: 6,
    resourceTypes: ["formula", "strategy"],
    camSystems: ["solidcam"],
    controllers: []
  },

  // Macro Programs
  {
    name: "Macro Programs",
    description: "Parametric G-code macros for common milling operations",
    basePath: "H:/PRISM/resources/MACRO PROGRAMS",
    fileCount: 50,
    resourceTypes: ["nc_program", "automation"],
    camSystems: ["generic"],
    controllers: ["haas", "okuma", "fanuc"]
  }
];

// ============================================================================
// HIGH-VALUE RESOURCE ENTRIES (Specific Files)
// ============================================================================

export const MILL_RESOURCE_ENTRIES: MillResourceEntry[] = [
  // Fusion 360 Posts
  {
    id: "FUSION-HURCO-VM30I",
    resource_type: "post",
    path: "H:/PRISM/resources/FUSION POSTS/HURCO_VM30i_PRISM.cps",
    filename: "HURCO_VM30i_PRISM.cps",
    description: "PRISM-enhanced Fusion 360 post for Hurco VM30i with WinMax control",
    cam_system: "fusion360",
    controller: "hurco",
    extension: ".cps",
    keywords: ["hurco", "vm30i", "winmax", "3-axis", "mill"],
    priority: "high"
  },
  {
    id: "FUSION-HURCO-VM30I-V10",
    resource_type: "post",
    path: "H:/PRISM/resources/FUSION POSTS/HURCO_VM30i_PRISM_v10_8_DRILLFIX.cps",
    filename: "HURCO_VM30i_PRISM_v10_8_DRILLFIX.cps",
    description: "PRISM Hurco VM30i post v10.8 with drill cycle fixes",
    cam_system: "fusion360",
    controller: "hurco",
    extension: ".cps",
    keywords: ["hurco", "vm30i", "drilling", "fixed cycles"],
    priority: "high"
  },
  {
    id: "FUSION-OKUMA-MULTUS",
    resource_type: "post",
    path: "H:/PRISM/resources/FUSION POSTS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5 2.cps",
    filename: "OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5 2.cps",
    description: "PRISM-enhanced Fusion 360 post for Okuma MULTUS B250IIW mill-turn",
    cam_system: "fusion360",
    controller: "okuma",
    extension: ".cps",
    keywords: ["okuma", "multus", "b250ii", "mill-turn", "osp-p200", "5-axis"],
    priority: "high"
  },
  {
    id: "FUSION-OKUMA-M460V-5AX",
    resource_type: "post",
    path: "H:/PRISM/resources/FUSION POSTS/OKUMA-M460V-5AX-Simulation.cps",
    filename: "OKUMA-M460V-5AX-Simulation.cps",
    description: "Okuma Genos M460V-5AX post for Fusion 360 with simulation support",
    cam_system: "fusion360",
    controller: "okuma",
    extension: ".cps",
    keywords: ["okuma", "genos", "m460v", "5-axis", "simulation", "trunnion"],
    priority: "high"
  },

  // Machine Models
  {
    id: "MULTUS-B250II-STEP",
    resource_type: "machine_model",
    path: "H:/PRISM/resources/POSTS AND MACHINES/MULTUS B250II FRESH START.stp",
    filename: "MULTUS B250II FRESH START.stp",
    description: "Okuma MULTUS B250II complete machine STEP model for simulation",
    cam_system: "generic",
    controller: "okuma",
    extension: ".stp",
    keywords: ["okuma", "multus", "b250ii", "machine model", "step", "simulation"],
    priority: "high"
  },

  // hyperMILL Manuals
  {
    id: "HYPERMILL-MANUAL-2D-3D",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/hyperMILL_2D_3D.pdf",
    filename: "hyperMILL_2D_3D.pdf",
    description: "hyperMILL 2D/3D milling strategies manual (33MB)",
    cam_system: "hypermill",
    controller: null,
    extension: ".pdf",
    keywords: ["hypermill", "2d", "3d", "strategies", "pocketing", "contouring"],
    priority: "high"
  },
  {
    id: "HYPERMILL-MANUAL-FULL",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/Software documentation - hyperMILL_2D_3D.pdf",
    filename: "Software documentation - hyperMILL_2D_3D.pdf",
    description: "Complete hyperMILL software documentation (175MB)",
    cam_system: "hypermill",
    controller: null,
    extension: ".pdf",
    keywords: ["hypermill", "full", "documentation", "complete"],
    priority: "high"
  },

  // InventorCAM Training
  {
    id: "INVENTORCAM-2.5D",
    resource_type: "tutorial",
    path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_2.5D_Milling_Training_Course.pdf",
    filename: "InventorCAM2024_2.5D_Milling_Training_Course.pdf",
    description: "InventorCAM 2024 2.5D milling training course (50MB)",
    cam_system: "inventorcam",
    controller: null,
    extension: ".pdf",
    keywords: ["inventorcam", "2.5d", "training", "pocketing", "facing"],
    priority: "high"
  },
  {
    id: "INVENTORCAM-3D-HSM",
    resource_type: "tutorial",
    path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_3D_HSM_User_Guide.pdf",
    filename: "InventorCAM2024_3D_HSM_User_Guide.pdf",
    description: "InventorCAM 2024 3D HSM (High Speed Machining) user guide",
    cam_system: "inventorcam",
    controller: null,
    extension: ".pdf",
    keywords: ["inventorcam", "3d", "hsm", "high speed", "adaptive"],
    priority: "high"
  },
  {
    id: "INVENTORCAM-5AXIS-VOL1",
    resource_type: "tutorial",
    path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_5-Axis_Basic_Training_Vol-1.pdf",
    filename: "InventorCAM2024_5-Axis_Basic_Training_Vol-1.pdf",
    description: "InventorCAM 2024 5-axis basic training volume 1",
    cam_system: "inventorcam",
    controller: null,
    extension: ".pdf",
    keywords: ["inventorcam", "5-axis", "training", "swarf", "multiaxis"],
    priority: "high"
  },
  {
    id: "INVENTORCAM-MILL-TURN",
    resource_type: "tutorial",
    path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf",
    filename: "InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf",
    description: "InventorCAM 2024 turning and mill-turn training course (38MB)",
    cam_system: "inventorcam",
    controller: null,
    extension: ".pdf",
    keywords: ["inventorcam", "mill-turn", "turning", "live tooling", "sub-spindle"],
    priority: "high"
  },

  // CNC Basics
  {
    id: "CNC-BASICS-GUIDE",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/CNC Basics_ Easy Learning Guide [ +Machining Tutorials ].pdf",
    filename: "CNC Basics_ Easy Learning Guide [ +Machining Tutorials ].pdf",
    description: "CNC Basics comprehensive learning guide with tutorials",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["cnc", "basics", "learning", "tutorial", "beginner"],
    priority: "high"
  },
  {
    id: "CNC-MACHINING-COMPLETE",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/CNC_Machining_The_Complete_Engineering_Guide.pdf",
    filename: "CNC_Machining_The_Complete_Engineering_Guide.pdf",
    description: "Complete CNC machining engineering guide (18MB)",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["cnc", "machining", "engineering", "complete", "comprehensive"],
    priority: "high"
  },
  {
    id: "FEEDS-SPEEDS-ULTIMATE",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/Feeds and Speeds [The Ultimate Guide, Updated for 2024].pdf",
    filename: "Feeds and Speeds [The Ultimate Guide, Updated for 2024].pdf",
    description: "Ultimate guide to feeds and speeds for milling (2024 update)",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["feeds", "speeds", "cutting parameters", "sfm", "ipm", "chip load"],
    priority: "high"
  },

  // Haas Mill Manual
  {
    id: "HAAS-MILL-MANUAL",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/English - Mill Operator's Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf",
    filename: "English - Mill Operator's Manual -Interactive PDF Version - NGC - 2023.pdf",
    description: "Haas Mill NGC operator manual (2023 interactive PDF)",
    cam_system: "generic",
    controller: "haas",
    extension: ".pdf",
    keywords: ["haas", "mill", "ngc", "operator", "manual", "g-code"],
    priority: "high"
  },

  // Post Processor Training
  {
    id: "POST-PROCESSOR-TRAINING",
    resource_type: "tutorial",
    path: "H:/PRISM/resources/RESOURCE PDFS/Post Processor Training Guide.pdf",
    filename: "Post Processor Training Guide.pdf",
    description: "Post processor development training guide",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["post processor", "training", "development", "customization"],
    priority: "high"
  },
  {
    id: "PPG-REFERENCE",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/RC2024-PPG-Reference.pdf",
    filename: "RC2024-PPG-Reference.pdf",
    description: "Post processor generator reference guide (RC2024)",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["post processor", "generator", "ppg", "reference"],
    priority: "high"
  },

  // Dynamic Milling
  {
    id: "DYNAMIC-MILLING",
    resource_type: "tutorial",
    path: "H:/PRISM/resources/RESOURCE PDFS/Dynamic_Milling.pdf",
    filename: "Dynamic_Milling.pdf",
    description: "Dynamic milling strategies and techniques",
    cam_system: "mastercam",
    controller: null,
    extension: ".pdf",
    keywords: ["dynamic", "milling", "hsm", "adaptive", "radial chip thinning"],
    priority: "high"
  },
  {
    id: "CAM-STRATEGIES-BRO",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/bro-cam-strategies-en.pdf",
    filename: "bro-cam-strategies-en.pdf",
    description: "CAM strategies brochure (English)",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["cam", "strategies", "overview", "comparison"],
    priority: "medium"
  },

  // 5-Axis Manual
  {
    id: "MANUAL-5AXIS",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/Manual 5-axis machining.pdf",
    filename: "Manual 5-axis machining.pdf",
    description: "5-axis machining manual with fundamentals and techniques",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["5-axis", "multiaxis", "tcpc", "rtcp", "tilted plane"],
    priority: "high"
  },

  // Siemens 5-Axis
  {
    id: "SIEMENS-5AXIS",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/Siemens 5 axis.pdf",
    filename: "Siemens 5 axis.pdf",
    description: "Siemens 5-axis programming and machine setup",
    cam_system: "generic",
    controller: "siemens",
    extension: ".pdf",
    keywords: ["siemens", "5-axis", "sinumerik", "traori", "cycle800"],
    priority: "medium"
  },

  // Workholding
  {
    id: "WORKHOLDING-JIGS-FIXTURES",
    resource_type: "workholding",
    path: "H:/PRISM/resources/RESOURCE PDFS/Total Guide to CNC Jigs, Fixtures, and Workholding Solutions for Mills.pdf",
    filename: "Total Guide to CNC Jigs, Fixtures, and Workholding Solutions for Mills.pdf",
    description: "Complete guide to CNC jigs, fixtures, and workholding for mills",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["workholding", "jigs", "fixtures", "vise", "clamp", "setup"],
    priority: "high"
  },
  {
    id: "TOOL-HOLDERS-GUIDE",
    resource_type: "workholding",
    path: "H:/PRISM/resources/RESOURCE PDFS/Ultimate Guide to Milling Tool Holders.pdf",
    filename: "Ultimate Guide to Milling Tool Holders.pdf",
    description: "Ultimate guide to milling tool holders (CAT, BT, HSK)",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["tool holders", "cat40", "bt40", "hsk", "collet", "shrink fit"],
    priority: "high"
  },

  // Fundamentals
  {
    id: "FUNDAMENTALS-CNC",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf",
    filename: "Fundamentals_of_CNC_Machining.pdf",
    description: "Fundamentals of CNC machining (15MB)",
    cam_system: "generic",
    controller: null,
    extension: ".pdf",
    keywords: ["fundamentals", "cnc", "machining", "basics", "theory"],
    priority: "high"
  },

  // Autodesk CNC Book
  {
    id: "AUTODESK-CNC-BOOK",
    resource_type: "manual",
    path: "H:/PRISM/resources/RESOURCE PDFS/Autodesk_CNCBOOK.pdf",
    filename: "Autodesk_CNCBOOK.pdf",
    description: "Autodesk CNC machining handbook",
    cam_system: "fusion360",
    controller: null,
    extension: ".pdf",
    keywords: ["autodesk", "cnc", "handbook", "fusion"],
    priority: "medium"
  },

  // hyperMILL Tool Database
  {
    id: "HYPERMILL-TOOLDB",
    resource_type: "tool_db",
    path: "H:/PRISM/resources/OPEN MIND/Tool Database/33.0/databases/InternalTDB.db",
    filename: "InternalTDB.db",
    description: "hyperMILL internal tool database (SQLite)",
    cam_system: "hypermill",
    controller: null,
    extension: ".db",
    keywords: ["hypermill", "tool", "database", "sqlite"],
    priority: "high"
  },
  {
    id: "HYPERMILL-MATERIALS-DB",
    resource_type: "material_db",
    path: "H:/PRISM/resources/OPEN MIND/Tool Database/33.0/databases/materials.db",
    filename: "materials.db",
    description: "hyperMILL materials database with cutting data",
    cam_system: "hypermill",
    controller: null,
    extension: ".db",
    keywords: ["hypermill", "materials", "cutting data", "speeds", "feeds"],
    priority: "high"
  },

  // Machining Knowledge
  {
    id: "PRISM-CROSS-DISCIPLINARY",
    resource_type: "formula",
    path: "H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js",
    filename: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js",
    description: "PRISM cross-disciplinary formulas (Kienzle, Taylor, deflection, thermal)",
    cam_system: "generic",
    controller: null,
    extension: ".js",
    keywords: ["formulas", "kienzle", "taylor", "physics", "algorithms"],
    priority: "high"
  },
  {
    id: "PRISM-UNIVERSITY-REFERENCE",
    resource_type: "formula",
    path: "H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js",
    filename: "PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js",
    description: "PRISM university course reference (MIT, academic sources)",
    cam_system: "generic",
    controller: null,
    extension: ".js",
    keywords: ["university", "academic", "reference", "courses", "mit"],
    priority: "medium"
  },

  // Hurco Manuals
  {
    id: "HURCO-CUTTER-COMP",
    resource_type: "manual",
    path: "H:/PRISM/resources/WinMax Mill CUTTER COMPENSATION.pdf",
    filename: "WinMax Mill CUTTER COMPENSATION.pdf",
    description: "Hurco WinMax cutter compensation guide",
    cam_system: "generic",
    controller: "hurco",
    extension: ".pdf",
    keywords: ["hurco", "winmax", "cutter comp", "g41", "g42"],
    priority: "medium"
  },
  {
    id: "HURCO-RECOVERY-RESTART",
    resource_type: "manual",
    path: "H:/PRISM/resources/WinMax Mill RECOVERY AND RESTART.pdf",
    filename: "WinMax Mill RECOVERY AND RESTART.pdf",
    description: "Hurco WinMax recovery and restart procedures",
    cam_system: "generic",
    controller: "hurco",
    extension: ".pdf",
    keywords: ["hurco", "winmax", "recovery", "restart", "mid-program"],
    priority: "medium"
  },

  // SolidCAM
  {
    id: "SOLIDCAM-CHIP-THICKNESS",
    resource_type: "formula",
    path: "H:/PRISM/resources/SOLIDCAM/SESSION_1_1_CHIP_THICKNESS_MATH.js",
    filename: "SESSION_1_1_CHIP_THICKNESS_MATH.js",
    description: "SolidCAM iMachining chip thickness mathematics",
    cam_system: "solidcam",
    controller: null,
    extension: ".js",
    keywords: ["solidcam", "imachining", "chip thickness", "math"],
    priority: "high"
  },
  {
    id: "SOLIDCAM-ENGAGEMENT",
    resource_type: "formula",
    path: "H:/PRISM/resources/SOLIDCAM/SESSION_1_2_ENGAGEMENT_GEOMETRY.js",
    filename: "SESSION_1_2_ENGAGEMENT_GEOMETRY.js",
    description: "SolidCAM engagement geometry algorithms",
    cam_system: "solidcam",
    controller: null,
    extension: ".js",
    keywords: ["solidcam", "engagement", "geometry", "radial", "axial"],
    priority: "high"
  }
];

// ============================================================================
// WORKHOLDING BRANDS
// ============================================================================

export const WORKHOLDING_BRANDS: Array<{
  name: string;
  folder: string;
  description: string;
  products: string[];
}> = [
  { name: "Kurt", folder: "KURT", description: "Premium vises and workholding", products: ["vises", "anglelocks", "double stations"] },
  { name: "Bison", folder: "BISON", description: "Chucks and indexers", products: ["chucks", "rotary tables", "indexers"] },
  { name: "Schunk", folder: "SCHUNK", description: "Clamping technology and grippers", products: ["clamping", "grippers", "toolholders"] },
  { name: "Kitagawa", folder: "KITAGAWA", description: "Rotary tables and chucks", products: ["rotary tables", "chucks", "fixtures"] },
  { name: "Jergens", folder: "JERGENS", description: "Ball lock and quick change", products: ["ball lock", "quick change", "lift and locate"] },
  { name: "Lang", folder: "LANG", description: "Stamping units and clamping", products: ["stamping units", "makro grip", "vises"] },
  { name: "MATE Precision", folder: "MATE PRECISION TECHNOLOGIES", description: "Precision workholding", products: ["vises", "modular fixtures"] },
  { name: "5th Axis", folder: "5th AXIS", description: "Workholding for 5-axis", products: ["dovetail", "self-centering", "rock lock"] },
  { name: "Royal", folder: "ROYAL", description: "Collets and workholding", products: ["collets", "chucks", "workholding"] },
  { name: "System 3R", folder: "SYSTEM 3R", description: "Reference systems", products: ["pallets", "macro", "micro", "reference systems"] }
];

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search resources by keyword
 */
export function searchMillResources(query: string): MillResourceEntry[] {
  const lowerQuery = query.toLowerCase();
  return MILL_RESOURCE_ENTRIES.filter(entry =>
    entry.keywords.some(k => k.includes(lowerQuery)) ||
    entry.description.toLowerCase().includes(lowerQuery) ||
    entry.filename.toLowerCase().includes(lowerQuery) ||
    entry.cam_system.includes(lowerQuery) ||
    (entry.controller && entry.controller.includes(lowerQuery))
  );
}

/**
 * Search resources by type
 */
export function getResourcesByType(type: MillResourceType): MillResourceEntry[] {
  return MILL_RESOURCE_ENTRIES.filter(entry => entry.resource_type === type);
}

/**
 * Search resources by CAM system
 */
export function getResourcesByCAMSystem(cam: MillCAMSystem): MillResourceEntry[] {
  return MILL_RESOURCE_ENTRIES.filter(entry => entry.cam_system === cam);
}

/**
 * Search resources by controller
 */
export function getResourcesByController(controller: MillController): MillResourceEntry[] {
  return MILL_RESOURCE_ENTRIES.filter(entry => entry.controller === controller);
}

/**
 * Get high-priority resources
 */
export function getHighPriorityResources(): MillResourceEntry[] {
  return MILL_RESOURCE_ENTRIES.filter(entry => entry.priority === "high");
}

/**
 * Get category by name
 */
export function getResourceCategory(name: string): MillResourceCategory | undefined {
  return MILL_RESOURCE_CATEGORIES.find(cat =>
    cat.name.toLowerCase().includes(name.toLowerCase())
  );
}

/**
 * Get all categories for a CAM system
 */
export function getCategoriesForCAMSystem(cam: MillCAMSystem): MillResourceCategory[] {
  return MILL_RESOURCE_CATEGORIES.filter(cat => cat.camSystems.includes(cam));
}

/**
 * Get statistics about the resource index
 */
export function getResourceIndexStatistics(): {
  totalCategories: number;
  totalEntries: number;
  totalFiles: number;
  byResourceType: Record<MillResourceType, number>;
  byCAMSystem: Record<MillCAMSystem, number>;
  byPriority: Record<string, number>;
} {
  const byResourceType: Partial<Record<MillResourceType, number>> = {};
  const byCAMSystem: Partial<Record<MillCAMSystem, number>> = {};
  const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 };

  for (const entry of MILL_RESOURCE_ENTRIES) {
    byResourceType[entry.resource_type] = (byResourceType[entry.resource_type] || 0) + 1;
    byCAMSystem[entry.cam_system] = (byCAMSystem[entry.cam_system] || 0) + 1;
    byPriority[entry.priority]++;
  }

  const totalFiles = MILL_RESOURCE_CATEGORIES.reduce((sum, cat) => sum + cat.fileCount, 0);

  return {
    totalCategories: MILL_RESOURCE_CATEGORIES.length,
    totalEntries: MILL_RESOURCE_ENTRIES.length,
    totalFiles,
    byResourceType: byResourceType as Record<MillResourceType, number>,
    byCAMSystem: byCAMSystem as Record<MillCAMSystem, number>,
    byPriority
  };
}

/**
 * Find resources for a specific task
 */
export function findResourcesForTask(task: string): MillResourceEntry[] {
  const taskPatterns: Array<{ pattern: RegExp; keywords: string[] }> = [
    { pattern: /post\s*processor|post\s*process/, keywords: ["post", "processor"] },
    { pattern: /speed.*feed|feed.*speed/, keywords: ["speeds", "feeds", "cutting"] },
    { pattern: /5.?axis|multi.?axis/, keywords: ["5-axis", "multiaxis"] },
    { pattern: /tool\s*hold|holder/, keywords: ["tool holders", "cat40", "bt40", "hsk"] },
    { pattern: /work\s*hold|fixture|clamp/, keywords: ["workholding", "fixture", "clamp", "vise"] },
    { pattern: /haas/, keywords: ["haas", "ngc"] },
    { pattern: /hurco|winmax/, keywords: ["hurco", "winmax"] },
    { pattern: /okuma|osp/, keywords: ["okuma", "multus", "genos"] },
    { pattern: /hypermill|hyper\s*mill/, keywords: ["hypermill"] },
    { pattern: /fusion|autodesk/, keywords: ["fusion", "autodesk"] },
    { pattern: /master\s*cam/, keywords: ["mastercam"] },
    { pattern: /dynamic|adaptive|hsm/, keywords: ["dynamic", "adaptive", "hsm", "high speed"] },
    { pattern: /drill/, keywords: ["drilling", "drill"] },
    { pattern: /mill.?turn|live\s*tool/, keywords: ["mill-turn", "live tooling"] }
  ];

  const lowerTask = task.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const { pattern, keywords } of taskPatterns) {
    if (pattern.test(lowerTask)) {
      matchedKeywords.push(...keywords);
    }
  }

  if (matchedKeywords.length === 0) {
    // Fallback to direct search
    return searchMillResources(task);
  }

  // Find resources matching any of the keywords
  const results: MillResourceEntry[] = [];
  for (const entry of MILL_RESOURCE_ENTRIES) {
    for (const keyword of matchedKeywords) {
      if (entry.keywords.some(k => k.includes(keyword)) ||
          entry.description.toLowerCase().includes(keyword)) {
        results.push(entry);
        break;
      }
    }
  }

  // Sort by priority
  return results.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
