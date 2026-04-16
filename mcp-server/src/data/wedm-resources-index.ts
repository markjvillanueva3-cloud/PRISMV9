/**
 * Wire EDM Resources Index — WEDM-AWARE-MS9
 * ==========================================
 * Comprehensive index of ALL Wire EDM-related resources in H:/PRISM/resources.
 * Enables "find resource for X" queries and integrates with WireEDM AI engines.
 *
 * Categories:
 *   - cam_integration : hyperMILL EDM modules (v31.0, v33.0), job icons, cycle DLLs
 *   - automation      : Python scripts for electrode creation, EDM reference setup
 *   - config          : EDM configuration files (.cfg), EDMConverter XML/config
 *   - documentation   : PDF manuals, Wire tutorials, post-processor training docs
 *   - post_processor  : Mitsubishi/Makino CPS posts, Mastercam wire WMD/control files
 *   - machine_model   : Makino simulation models for WEDM setup verification
 *
 * Sources indexed:
 *   - H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/
 *   - H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/
 *   - H:/PRISM/resources/OPEN MIND/hyperMILL/31.0/
 *   - H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/
 *   - H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/plugins/EDMConverter/
 *   - H:/PRISM/resources/FUSION BASIC POSTS/
 *   - H:/PRISM/resources/HSMWorks 2026/posts/
 *   - H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/
 *   - H:/PRISM/resources/RESOURCE PDFS/
 *   - H:/PRISM/resources/PDF/
 *   - H:/PRISM/resources/MACHINE_SIMULATION_MODELS/
 *
 * @module data/wedm-resources-index
 * @milestone WEDM-AWARE-MS9
 * @version 1.0.0
 */

// ============================================================================
// SCHEMA VERSION
// ============================================================================

/** Schema version for this index file — increment when structure changes */
export const WEDM_RESOURCES_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * WEDM resource category classification.
 *   cam_integration  — hyperMILL EDM cycle modules, DLLs, icons
 *   automation       — Python/script automation for electrodes and EDM references
 *   config           — Machine/software configuration files for EDM operations
 *   documentation    — PDF manuals, tutorials, tech notes
 *   post_processor   — CPS/WMD post processors for Mitsubishi, Makino, generic wire
 *   machine_model    — 3D simulation models for WEDM machines
 */
export type WEDMResourceCategory =
  | "cam_integration"
  | "automation"
  | "config"
  | "documentation"
  | "post_processor"
  | "machine_model";

/**
 * Supported file type classification for WEDM resources.
 */
export type WEDMFileType =
  | "dll"       // Compiled cycle / UI module
  | "cfg"       // Configuration file
  | "py"        // Python automation script
  | "xml"       // XML configuration or converter schema
  | "config"    // .exe.config application settings
  | "cps"       // Fusion 360 / HSMWorks post processor source
  | "wmd"       // Mastercam wire machine definition
  | "control"   // Mastercam controller definition
  | "pdf"       // PDF manual / tutorial
  | "png"       // Icon / image asset
  | "gif"       // Animated icon asset
  | "exe"       // Executable tool
  | "enc"       // License/encryption file
  | "chm"       // Compiled HTML help
  | "zip"       // Archive
  | "other";    // Unclassified

/**
 * A single resource entry in the Wire EDM resource index.
 */
export interface WEDMResourceEntry {
  /** Unique resource identifier (e.g. "wedm-res-001") */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Category this resource belongs to */
  category: WEDMResourceCategory;
  /** Full absolute path to the resource on disk */
  path: string;
  /** Classified file type */
  fileType: WEDMFileType;
  /** Description of what this resource contains and how to use it */
  description: string;
  /** Search keywords — lowercase, no duplicates */
  keywords: string[];
  /** Software version (e.g. "31.0", "33.0") when applicable */
  version?: string;
  /** Importance tier for prioritised search results */
  priority: "high" | "medium" | "low";
  /** Which CAM system this resource belongs to, if applicable */
  camSystem?: "hypermill" | "mastercam" | "fusion360" | "hsmworks" | "generic";
  /** Which EDM machine brand this resource targets, if known */
  machineTarget?: "mitsubishi" | "makino" | "agie" | "fanuc_wire" | "generic_wire";
}

/**
 * Summary descriptor for a resource category.
 */
export interface WEDMResourceCategoryInfo {
  /** Category key */
  key: WEDMResourceCategory;
  /** Human-readable name */
  name: string;
  /** What resources are grouped here */
  description: string;
  /** Primary base path(s) for this category */
  basePaths: string[];
  /** Approximate number of discrete files */
  fileCount: number;
}

// ============================================================================
// RESOURCE CATEGORIES
// ============================================================================

export const WEDM_RESOURCE_CATEGORIES: WEDMResourceCategoryInfo[] = [
  {
    key: "cam_integration",
    name: "hyperMILL EDM CAM Integration",
    description:
      "hyperMILL EDM2 cycle modules, UI DLLs, and job icons for v31.0 and v33.0. " +
      "These are the core CAM integration files that enable Wire EDM toolpath generation " +
      "inside hyperMILL/OPEN MIND environments.",
    basePaths: [
      "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0",
      "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0",
      "H:/PRISM/resources/OPEN MIND/hyperMILL/31.0",
      "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0",
    ],
    fileCount: 14,
  },
  {
    key: "automation",
    name: "EDM Electrode Automation Scripts",
    description:
      "Python scripts from the hyperMILL AutomationCenter AddIn for creating EDM references, " +
      "electrodes from surfaces, partial electrodes, user-defined electrodes, and setting " +
      "electrode properties (main, rotational, side, rounding step). " +
      "Available in CAD33 and CAD99 API variants.",
    basePaths: [
      "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python",
      "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python",
      "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python",
      "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python",
    ],
    fileCount: 28,
  },
  {
    key: "config",
    name: "EDM Configuration Files",
    description:
      "EDM software configuration files: hmEdm2.cfg for Inch and Metric unit modes " +
      "(v31.0 and v33.0), plus hyperCAD-S EDMConverter XML schema and application config. " +
      "These files control EDM cycle parameters, unit defaults, and converter behavior.",
    basePaths: [
      "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/Inch.cfg",
      "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/Metric.cfg",
      "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/Inch.cfg",
      "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/Metric.cfg",
      "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/plugins/EDMConverter",
    ],
    fileCount: 12,
  },
  {
    key: "documentation",
    name: "Wire EDM Documentation & Manuals",
    description:
      "PDF documentation for Wire EDM programming: Mastercam Wire Tutorial, " +
      "hyperMILL manual sections covering EDM operations, AUTOMATION Center manual " +
      "for scripting EDM workflows, and hyperCAD-S manual for electrode modeling.",
    basePaths: [
      "H:/PRISM/resources/RESOURCE PDFS",
      "H:/PRISM/resources/PDF/hyperMILL",
      "H:/PRISM/resources/PDF/AUTOMATION Center",
      "H:/PRISM/resources/PDF/hyperCAD-S",
    ],
    fileCount: 8,
  },
  {
    key: "post_processor",
    name: "Wire EDM Post Processors",
    description:
      "Post processor files targeting Mitsubishi FA-series, Makino (U-series, D-series), " +
      "AGIE, and generic Fanuc wire controllers. Includes Fusion 360 CPS posts, " +
      "HSMWorks CPS posts, and Mastercam wire machine definition (WMD) files.",
    basePaths: [
      "H:/PRISM/resources/FUSION BASIC POSTS",
      "H:/PRISM/resources/HSMWorks 2026/posts",
      "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES",
    ],
    fileCount: 18,
  },
  {
    key: "machine_model",
    name: "Wire EDM Machine Simulation Models",
    description:
      "3D machine simulation models for Makino wire EDM machines. " +
      "Used with Virtual Machining Center for EDM setup verification and collision checking.",
    basePaths: [
      "H:/PRISM/resources/MACHINE_SIMULATION_MODELS/MAKINO",
    ],
    fileCount: 4,
  },
];

// ============================================================================
// RESOURCE ENTRIES
// ============================================================================

export const WEDM_RESOURCES: WEDMResourceEntry[] = [

  // --------------------------------------------------------------------------
  // CATEGORY: cam_integration — hyperMILL EDM2 modules v31.0
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-001",
    name: "hyperMILL EDM2 Cycle DLL v31.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/cycwin/omEdm2x64.dll",
    fileType: "dll",
    description:
      "Core hyperMILL EDM2 cycle Windows DLL for v31.0 from the HYPERMILL installation. " +
      "Provides the compiled CAM cycle logic for Wire EDM toolpath computation inside " +
      "hyperMILL. Required for EDM2 job list operations.",
    keywords: [
      "hypermill", "edm", "edm2", "cycle", "dll", "wire edm", "cam integration",
      "v31", "31.0", "toolpath", "openmind",
    ],
    version: "31.0",
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-002",
    name: "hyperMILL EDM2 Model DLL v31.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/win64/omMdEdm2x64.dll",
    fileType: "dll",
    description:
      "hyperMILL EDM2 model-layer DLL v31.0. Handles the data model for EDM2 jobs " +
      "and operations, providing persistence and parameter management for wire EDM cycles.",
    keywords: [
      "hypermill", "edm2", "model", "dll", "wire edm", "cam integration",
      "v31", "31.0", "openmind",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-003",
    name: "hyperMILL EDM2 UI DLL v31.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/win64/omUiEdm2x64.dll",
    fileType: "dll",
    description:
      "hyperMILL EDM2 user interface DLL v31.0. Provides the dialog panels and parameter " +
      "UI for configuring Wire EDM operations within the hyperMILL job tree.",
    keywords: [
      "hypermill", "edm2", "ui", "interface", "dll", "wire edm", "v31", "31.0",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-004",
    name: "hyperMILL EDM2 Job Icon v31.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/bmp/job/edm2.png",
    fileType: "png",
    description:
      "Job list icon for EDM2 operations in hyperMILL v31.0. Used as the visual " +
      "identifier for Wire EDM jobs in the hyperMILL job tree interface.",
    keywords: [
      "hypermill", "edm2", "icon", "job", "visual", "v31", "31.0",
    ],
    version: "31.0",
    priority: "low",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-005",
    name: "hyperMILL EDM2 Toolbar Icon v31.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/mnu/b_edm2_16.bmp",
    fileType: "other",
    description:
      "16x16 toolbar bitmap icon for the EDM2 module in hyperMILL v31.0. " +
      "Displayed in the hyperMILL toolbar and menu when EDM2 is activated.",
    keywords: [
      "hypermill", "edm2", "toolbar", "icon", "bmp", "v31", "31.0",
    ],
    version: "31.0",
    priority: "low",
    camSystem: "hypermill",
  },

  // --------------------------------------------------------------------------
  // CATEGORY: cam_integration — hyperMILL EDM2 modules v33.0
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-006",
    name: "hyperMILL EDM2 Cycle DLL v33.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/cycwin/omEdm2x64.dll",
    fileType: "dll",
    description:
      "Core hyperMILL EDM2 cycle DLL for v33.0 from the HYPERMILL installation. " +
      "Latest version of the Wire EDM CAM cycle module. Use this version for new " +
      "hyperMILL 33.0 projects.",
    keywords: [
      "hypermill", "edm", "edm2", "cycle", "dll", "wire edm", "cam integration",
      "v33", "33.0", "toolpath", "openmind", "latest",
    ],
    version: "33.0",
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-007",
    name: "hyperMILL EDM2 Model DLL v33.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/win64/omMdEdm2x64.dll",
    fileType: "dll",
    description:
      "hyperMILL EDM2 model-layer DLL v33.0. Enhanced data model for EDM2 jobs " +
      "with improved parameter persistence and operation management.",
    keywords: [
      "hypermill", "edm2", "model", "dll", "wire edm", "v33", "33.0", "openmind",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-008",
    name: "hyperMILL EDM2 UI DLL v33.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/win64/omUiEdm2x64.dll",
    fileType: "dll",
    description:
      "hyperMILL EDM2 UI DLL v33.0. Updated interface dialogs for Wire EDM operation " +
      "configuration in hyperMILL 33.0.",
    keywords: [
      "hypermill", "edm2", "ui", "interface", "dll", "wire edm", "v33", "33.0",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-009",
    name: "hyperMILL EDM2 Job Icon v33.0 (HYPERMILL)",
    category: "cam_integration",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/bmp/job/edm2.png",
    fileType: "png",
    description:
      "Job list icon for EDM2 operations in hyperMILL v33.0.",
    keywords: [
      "hypermill", "edm2", "icon", "job", "v33", "33.0",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },

  // OPEN MIND variants (same modules, different installation root)
  {
    id: "wedm-res-010",
    name: "hyperMILL EDM2 Cycle DLL v31.0 (OPEN MIND)",
    category: "cam_integration",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/31.0/cycwin/omEdm2x64.dll",
    fileType: "dll",
    description:
      "EDM2 cycle DLL from the OPEN MIND installation root (v31.0). " +
      "Functionally identical to the HYPERMILL installation copy — use whichever " +
      "installation is active on the workstation.",
    keywords: [
      "open mind", "openmind", "hypermill", "edm2", "cycle", "dll", "wire edm",
      "v31", "31.0",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-011",
    name: "hyperMILL EDM2 Cycle DLL v33.0 (OPEN MIND)",
    category: "cam_integration",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/cycwin/omEdm2x64.dll",
    fileType: "dll",
    description:
      "EDM2 cycle DLL from the OPEN MIND installation root (v33.0). " +
      "Use for OPEN MIND-managed installations of hyperMILL 33.0.",
    keywords: [
      "open mind", "openmind", "hypermill", "edm2", "cycle", "dll", "wire edm",
      "v33", "33.0",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },

  // hyperCAD-S EDMConverter plugin
  {
    id: "wedm-res-012",
    name: "hyperCAD-S EDMConverter Plugin v31.0",
    category: "cam_integration",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/plugins/EDMConverter/EDM_Converter.exe",
    fileType: "exe",
    description:
      "hyperCAD-S EDMConverter standalone executable v31.0. Converts electrode " +
      "geometry from CAD formats into EDM-ready formats recognized by sinker and " +
      "wire EDM machines. Part of the hyperCAD-S electrode workflow.",
    keywords: [
      "hypercad-s", "edm converter", "electrode", "converter", "plugin",
      "v31", "31.0", "openmind", "sinker edm", "wire edm",
    ],
    version: "31.0",
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-013",
    name: "hyperCAD-S EDMConverter Summary XML v31.0",
    category: "cam_integration",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/hyperCAD-S/files/electrode/Summaries/EDM_Converter_summary_2.0.xml",
    fileType: "xml",
    description:
      "EDMConverter summary definition file v2.0 for hyperCAD-S 31.0. Defines " +
      "the data schema and output fields written by the EDMConverter when processing " +
      "electrode geometry for EDM operations.",
    keywords: [
      "hypercad-s", "edm converter", "summary", "xml", "electrode", "schema",
      "v31", "31.0",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-014",
    name: "hyperCAD-S Electrode EDM Properties UI v31.0",
    category: "cam_integration",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/files/commands/electrodes/modify_edmparameters.ui",
    fileType: "other",
    description:
      "UI definition file for the 'Modify EDM Parameters' dialog in hyperCAD-S v31.0. " +
      "Defines the fields shown when editing electrode EDM properties such as spark gap, " +
      "overburn, and roughing/finishing strategy settings.",
    keywords: [
      "hypercad-s", "electrode", "edm parameters", "ui", "dialog",
      "spark gap", "overburn", "v31",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
  },

  // --------------------------------------------------------------------------
  // CATEGORY: automation — Python electrode/EDM scripts v33.0 (AddIns path)
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-015",
    name: "Create EDM Reference Script — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "Python automation script for the hyperMILL AutomationCenter that creates an " +
      "EDM reference coordinate system on an electrode body. Uses the CAD33 API. " +
      "Run via the AutomationCenter wizard to automate EDM datum setup.",
    keywords: [
      "python", "automation", "edm", "edm reference", "electrode", "coordinate",
      "datum", "hypermill", "automation center", "cad33", "v33", "33.0",
    ],
    version: "33.0",
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-016",
    name: "Create EDM Reference Script — CAD99 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD99/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "Python automation script for creating EDM references using the CAD99 legacy API. " +
      "Use this variant for backward-compatible environments or when integrating with " +
      "older hyperCAD-S model files.",
    keywords: [
      "python", "automation", "edm", "edm reference", "electrode", "cad99",
      "legacy api", "hypermill", "automation center", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-017",
    name: "Create Electrode From Surfaces — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_Electrode_from_surfaces.py",
    fileType: "py",
    description:
      "AutomationCenter script that extracts selected surfaces from the active CAD model " +
      "and converts them into a hyperCAD-S electrode body. Automates the electrode " +
      "creation workflow for EDM die sinking and wire EDM.",
    keywords: [
      "python", "automation", "electrode", "create electrode", "surfaces",
      "cad33", "hypermill", "edm", "die sinking", "wire edm", "v33",
    ],
    version: "33.0",
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-018",
    name: "Create Partial Electrode — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_partial_electrode.py",
    fileType: "py",
    description:
      "Script for creating partial electrodes from a subset of cavity surfaces. " +
      "Useful when a full electrode would collide with cavity walls — creates a " +
      "safe smaller electrode for staged EDM operations.",
    keywords: [
      "python", "automation", "electrode", "partial electrode", "cad33",
      "collision avoidance", "staged edm", "hypermill", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-019",
    name: "Create User-Defined Electrode — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_user_defined_electrode.py",
    fileType: "py",
    description:
      "Script for creating custom electrode geometries with user-specified profiles. " +
      "Enables non-standard electrode shapes that do not follow the standard " +
      'surface-extraction workflow.',
    keywords: [
      "python", "automation", "electrode", "user defined", "custom electrode",
      "cad33", "hypermill", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-020",
    name: "Set Electrode Properties Main — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/set_Electrode_properties_main.py",
    fileType: "py",
    description:
      "Main electrode properties script — sets EDM parameters on an electrode body: " +
      "material, spark gap, overburn, roughing/finishing assignments, and machining " +
      "offset values. Central script called by other property scripts.",
    keywords: [
      "python", "automation", "electrode", "properties", "spark gap", "overburn",
      "roughing", "finishing", "cad33", "hypermill", "v33",
    ],
    version: "33.0",
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-021",
    name: "Set Electrode Properties Rotational — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/set_Electrode_properties_rotational.py",
    fileType: "py",
    description:
      "Script variant for setting electrode properties when the electrode has rotational " +
      "symmetry (e.g. round electrodes for circular cavity features). Configures " +
      "rotational-specific parameters like angular offset and rotation axis.",
    keywords: [
      "python", "automation", "electrode", "rotational", "round electrode",
      "cad33", "hypermill", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-022",
    name: "Set Electrode Properties Rounding Step — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/set_Electrode_properties_RoundingStep.py",
    fileType: "py",
    description:
      "Script for configuring electrode rounding step parameters. Controls the " +
      "incremental step-over values used during rounding passes in multi-pass " +
      "EDM finishing sequences.",
    keywords: [
      "python", "automation", "electrode", "rounding", "step over", "finishing",
      "cad33", "hypermill", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-023",
    name: "Set Electrode Properties Side — CAD33 (AddIns, v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/set_Electrode_properties_side.py",
    fileType: "py",
    description:
      "Script for setting side-wall specific electrode properties. Configures lateral " +
      "spark gap and side offset values for side-wall EDM operations.",
    keywords: [
      "python", "automation", "electrode", "side wall", "lateral", "spark gap",
      "side offset", "cad33", "hypermill", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },

  // addins project variants (alternative installation path, same scripts)
  {
    id: "wedm-res-024",
    name: "Create EDM Reference Script — addins project CAD33 (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference creation script from the 'addins project' development build of " +
      "hyperMILL 33.0. Functionally identical to the AddIns release version — " +
      "use for development/testing of AutomationCenter customizations.",
    keywords: [
      "python", "automation", "edm", "edm reference", "electrode", "addins project",
      "cad33", "development", "v33",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-025",
    name: "Create EDM Reference Script — addins project electrode root (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference creation script located at the electrode root of the addins project " +
      "tree (no CAD version subdirectory). May be the canonical entry point used by the " +
      "AutomationCenter dispatcher before API version selection.",
    keywords: [
      "python", "automation", "edm", "edm reference", "electrode",
      "addins project", "root", "v33",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },

  // OPEN MIND path variants
  {
    id: "wedm-res-026",
    name: "Create EDM Reference Script — OPEN MIND CAD33 AddIns (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference script from the OPEN MIND installation root (AddIns, CAD33 API). " +
      "Use when working within an OPEN MIND-managed hyperMILL installation.",
    keywords: [
      "python", "automation", "edm reference", "electrode", "open mind",
      "cad33", "v33",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-027",
    name: "Create EDM Reference Script — OPEN MIND CAD99 AddIns (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/Python/CAD99/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference script from the OPEN MIND installation root (AddIns, CAD99 legacy API).",
    keywords: [
      "python", "automation", "edm reference", "electrode", "open mind",
      "cad99", "legacy", "v33",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-028",
    name: "Create EDM Reference Script — OPEN MIND addins project CAD33 (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python/CAD33/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference script from the OPEN MIND addins project development tree (CAD33).",
    keywords: [
      "python", "automation", "edm reference", "electrode", "open mind",
      "addins project", "cad33", "v33",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-029",
    name: "Create EDM Reference Script — OPEN MIND addins project CAD99 (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python/CAD99/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference script from the OPEN MIND addins project development tree (CAD99 legacy API).",
    keywords: [
      "python", "automation", "edm reference", "electrode", "open mind",
      "addins project", "cad99", "legacy", "v33",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-030",
    name: "Create EDM Reference Script — OPEN MIND addins project electrode root (v33.0)",
    category: "automation",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python/electrode/Create_EDM_reference.py",
    fileType: "py",
    description:
      "EDM reference creation script at the electrode root path in the OPEN MIND " +
      "addins project tree. Dispatcher entry point before API version branching.",
    keywords: [
      "python", "automation", "edm reference", "electrode", "open mind",
      "addins project", "root", "v33",
    ],
    version: "33.0",
    priority: "low",
    camSystem: "hypermill",
  },

  // --------------------------------------------------------------------------
  // CATEGORY: config — hmEdm2.cfg (Inch/Metric, v31.0 and v33.0)
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-031",
    name: "hmEdm2 Inch Config — HYPERMILL v31.0",
    category: "config",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/Inch.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "hyperMILL EDM2 configuration file for Inch unit mode, v31.0. " +
      "Defines default EDM cycle parameters (wire diameter defaults, speed, gap, " +
      "flush settings) in imperial units. Load into a new hyperMILL project when " +
      "working in inches.",
    keywords: [
      "hypermill", "edm2", "config", "cfg", "inch", "imperial", "units",
      "wire edm", "parameters", "v31", "31.0",
    ],
    version: "31.0",
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-032",
    name: "hmEdm2 Metric Config — HYPERMILL v31.0",
    category: "config",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/Metric.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "hyperMILL EDM2 configuration file for Metric unit mode, v31.0. " +
      "Defines default EDM cycle parameters in metric units. Use for metric projects.",
    keywords: [
      "hypermill", "edm2", "config", "cfg", "metric", "units",
      "wire edm", "parameters", "v31", "31.0",
    ],
    version: "31.0",
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-033",
    name: "hmEdm2 Inch Config — HYPERMILL v33.0",
    category: "config",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/Inch.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "hyperMILL EDM2 configuration file for Inch unit mode, v33.0. " +
      "Latest parameter defaults for Wire EDM in imperial units.",
    keywords: [
      "hypermill", "edm2", "config", "cfg", "inch", "imperial", "units",
      "wire edm", "v33", "33.0", "latest",
    ],
    version: "33.0",
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-034",
    name: "hmEdm2 Metric Config — HYPERMILL v33.0",
    category: "config",
    path: "H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/Metric.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "hyperMILL EDM2 configuration file for Metric unit mode, v33.0. " +
      "Latest parameter defaults for Wire EDM in metric units.",
    keywords: [
      "hypermill", "edm2", "config", "cfg", "metric", "units",
      "wire edm", "v33", "33.0", "latest",
    ],
    version: "33.0",
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-035",
    name: "hmEdm2 Inch Config — OPEN MIND v31.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/31.0/Inch.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "EDM2 Inch config from the OPEN MIND installation root (v31.0). " +
      "Same content as HYPERMILL copy — use with OPEN MIND-managed installations.",
    keywords: [
      "open mind", "hypermill", "edm2", "config", "cfg", "inch", "imperial",
      "wire edm", "v31", "31.0",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-036",
    name: "hmEdm2 Metric Config — OPEN MIND v31.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/31.0/Metric.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "EDM2 Metric config from the OPEN MIND installation root (v31.0).",
    keywords: [
      "open mind", "hypermill", "edm2", "config", "cfg", "metric",
      "wire edm", "v31", "31.0",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-037",
    name: "hmEdm2 Inch Config — OPEN MIND v33.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/Inch.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "EDM2 Inch config from the OPEN MIND installation root (v33.0). Latest.",
    keywords: [
      "open mind", "hypermill", "edm2", "config", "cfg", "inch",
      "wire edm", "v33", "33.0",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-038",
    name: "hmEdm2 Metric Config — OPEN MIND v33.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperMILL/33.0/Metric.cfg/hmEdm2.cfg",
    fileType: "cfg",
    description:
      "EDM2 Metric config from the OPEN MIND installation root (v33.0). Latest.",
    keywords: [
      "open mind", "hypermill", "edm2", "config", "cfg", "metric",
      "wire edm", "v33", "33.0",
    ],
    version: "33.0",
    priority: "medium",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },

  // hyperCAD-S EDMConverter config files
  {
    id: "wedm-res-039",
    name: "hyperCAD-S EDMConverter XML Schema v31.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/plugins/EDMConverter/hcsEDMconverter.xml",
    fileType: "xml",
    description:
      "XML configuration schema for the hyperCAD-S EDMConverter plugin v31.0. " +
      "Defines conversion rules, target machine formats, and parameter mappings " +
      "for converting electrode CAD data to EDM-ready output.",
    keywords: [
      "hypercad-s", "edm converter", "xml", "schema", "config", "electrode",
      "conversion", "v31", "31.0", "open mind",
    ],
    version: "31.0",
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-040",
    name: "hyperCAD-S EDMConverter App Config v31.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/plugins/EDMConverter/EDM_Converter.exe.config",
    fileType: "config",
    description:
      "Application settings file (EDM_Converter.exe.config) for the hyperCAD-S " +
      "EDMConverter tool v31.0. Specifies runtime settings including output paths, " +
      "default machine target, and logging configuration.",
    keywords: [
      "hypercad-s", "edm converter", "config", "application settings",
      "output path", "logging", "v31", "31.0", "open mind",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-041",
    name: "hyperCAD-S Electrode EDM Definition Command XML v31.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/files/commands/electrodes/electrode_properties.edm.definition_command.description.xml",
    fileType: "xml",
    description:
      "XML command description file for the 'EDM Definition' electrode property command " +
      "in hyperCAD-S v31.0. Defines the command parameters for assigning EDM definitions " +
      "to electrode bodies (machine target, strategy, passes).",
    keywords: [
      "hypercad-s", "electrode", "edm definition", "command", "xml",
      "properties", "strategy", "passes", "v31",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-042",
    name: "hyperCAD-S Electrode EDM Modify Command XML v31.0",
    category: "config",
    path: "H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/files/commands/electrodes/electrode_properties.edm.modify_command.description.xml",
    fileType: "xml",
    description:
      "XML command description file for the 'Modify EDM Properties' command in " +
      "hyperCAD-S v31.0. Defines parameter fields available when modifying existing " +
      "EDM property assignments on electrode bodies.",
    keywords: [
      "hypercad-s", "electrode", "edm modify", "command", "xml", "properties", "v31",
    ],
    version: "31.0",
    priority: "medium",
    camSystem: "hypermill",
  },

  // --------------------------------------------------------------------------
  // CATEGORY: documentation — PDF manuals and tutorials
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-043",
    name: "Mastercam Wire Tutorial PDF",
    category: "documentation",
    path: "H:/PRISM/resources/RESOURCE PDFS/Mastercam-Wire-Tutorial.pdf",
    fileType: "pdf",
    description:
      "Official Mastercam Wire EDM tutorial PDF. Covers the complete Wire EDM " +
      "programming workflow in Mastercam: geometry prep, contour chaining, wire " +
      "parameters (power, speed, offset), multi-pass cutting, taper cutting, " +
      "4-axis wire, and posting NC output. Essential reference for Mastercam WEDM users.",
    keywords: [
      "mastercam", "wire edm", "tutorial", "pdf", "programming", "contour",
      "taper", "4-axis", "multi-pass", "power settings", "wire offset",
    ],
    priority: "high",
    camSystem: "mastercam",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-044",
    name: "hyperMILL Manual (English) — Full Reference",
    category: "documentation",
    path: "H:/PRISM/resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
    fileType: "pdf",
    description:
      "Official OPEN MIND hyperMILL English manual. Contains detailed documentation " +
      "for all hyperMILL modules including the EDM2 Wire EDM operations, strategy " +
      "parameters, post processing, and CAM workflows. Reference for EDM2 cycle " +
      "parameter descriptions and recommended settings.",
    keywords: [
      "hypermill", "manual", "pdf", "edm2", "wire edm", "operations", "strategy",
      "parameters", "post processing", "open mind", "reference",
    ],
    priority: "high",
    camSystem: "hypermill",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-045",
    name: "AUTOMATION Center Manual (English) — hyperMILL",
    category: "documentation",
    path: "H:/PRISM/resources/PDF/AUTOMATION Center/AUTOMATION_Center_Manual-en.pdf",
    fileType: "pdf",
    description:
      "Official OPEN MIND AUTOMATION Center manual covering the AutomationCenter " +
      "framework used to script electrode and EDM workflows. Includes Python scripting " +
      "API reference, wizard creation, server setup, and integration with hyperMILL " +
      "EDM automation workflows (Create_EDM_reference.py, electrode scripts).",
    keywords: [
      "automation center", "hypermill", "manual", "pdf", "python", "scripting",
      "electrode", "edm automation", "wizard", "server", "api",
    ],
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-046",
    name: "hyperCAD-S Manual (English) — Full Reference",
    category: "documentation",
    path: "H:/PRISM/resources/PDF/hyperCAD-S/hyperCAD-S_Manual-en.pdf",
    fileType: "pdf",
    description:
      "Official OPEN MIND hyperCAD-S manual. Contains documentation for electrode " +
      "creation, EDM property assignment, EDMConverter usage, and electrode management " +
      "workflows. Essential for understanding the hyperCAD-S electrode modeling " +
      "environment that feeds into Wire/Sinker EDM programming.",
    keywords: [
      "hypercad-s", "manual", "pdf", "electrode", "edm", "edm converter",
      "electrode properties", "edm property", "open mind",
    ],
    priority: "high",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-047",
    name: "Mastercam McWire CHM Help File",
    category: "documentation",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/help/McWire.chm",
    fileType: "chm",
    description:
      "Mastercam X8 Wire EDM compiled HTML help file. Context-sensitive help for all " +
      "Wire EDM operations in Mastercam X8: wire parameters, contour operations, " +
      "4-axis wire, post processor settings, and machine definitions.",
    keywords: [
      "mastercam", "wire edm", "help", "chm", "documentation", "x8",
      "parameters", "4-axis", "contour",
    ],
    priority: "medium",
    camSystem: "mastercam",
    machineTarget: "generic_wire",
  },
  {
    id: "wedm-res-048",
    name: "hyperMILL Manual Vol 1 (English) — Resource PDFs",
    category: "documentation",
    path: "H:/PRISM/resources/RESOURCE PDFS/hyperMILL_Manual-en-1.pdf",
    fileType: "pdf",
    description:
      "Part 1 of the hyperMILL English manual from the RESOURCE PDFS collection. " +
      "Covers core 2D/3D milling operations and foundational concepts that apply " +
      "to EDM workflow integration in hyperMILL.",
    keywords: [
      "hypermill", "manual", "pdf", "vol 1", "2d", "3d", "operations",
    ],
    priority: "low",
    camSystem: "hypermill",
  },
  {
    id: "wedm-res-049",
    name: "hyperMILL 2D 3D Software Documentation PDF",
    category: "documentation",
    path: "H:/PRISM/resources/RESOURCE PDFS/Software documentation - hyperMILL_2D_3D.pdf",
    fileType: "pdf",
    description:
      "hyperMILL 2D and 3D operation documentation PDF covering standard milling " +
      "strategies. Relevant as context when integrating Wire EDM operations alongside " +
      "milling in hyperMILL mixed-operation job lists.",
    keywords: [
      "hypermill", "2d", "3d", "documentation", "milling", "strategies", "pdf",
    ],
    priority: "low",
    camSystem: "hypermill",
  },

  // --------------------------------------------------------------------------
  // CATEGORY: post_processor — Mitsubishi, Makino, AGIE, Fanuc wire posts
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-050",
    name: "Mitsubishi Wire EDM Post Processor (Fusion 360 CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/FUSION BASIC POSTS/mitsubishi.cps",
    fileType: "cps",
    description:
      "Fusion 360 / HSMWorks CPS post processor for Mitsubishi Wire EDM machines. " +
      "Generates NC code compatible with Mitsubishi FA-series controllers. " +
      "Outputs wire EDM G-code with Mitsubishi-specific M-codes for wire threading, " +
      "flushing, and power settings. Use as template for JM Die's Mitsubishi WEDM.",
    keywords: [
      "mitsubishi", "wire edm", "post processor", "cps", "fusion360", "nc code",
      "fa-series", "g-code", "m-code", "wire threading", "flushing",
    ],
    priority: "high",
    camSystem: "fusion360",
    machineTarget: "mitsubishi",
  },
  {
    id: "wedm-res-051",
    name: "Mitsubishi Turning Post Processor (Fusion 360 CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/FUSION BASIC POSTS/mitsubishi turning.cps",
    fileType: "cps",
    description:
      "Fusion 360 CPS post for Mitsubishi turning machines. Included as a reference " +
      "template since Mitsubishi produces both Wire EDM and lathe/turning centers — " +
      "useful for understanding Mitsubishi controller syntax conventions.",
    keywords: [
      "mitsubishi", "turning", "post processor", "cps", "fusion360",
      "lathe", "controller",
    ],
    priority: "medium",
    camSystem: "fusion360",
    machineTarget: "mitsubishi",
  },
  {
    id: "wedm-res-052",
    name: "Mitsubishi Wire EDM Post Processor (HSMWorks CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/HSMWorks 2026/posts/mitsubishi.cps",
    fileType: "cps",
    description:
      "HSMWorks 2026 CPS post processor for Mitsubishi Wire EDM. SolidWorks-integrated " +
      "version for generating Mitsubishi WEDM NC code from HSMWorks CAM operations.",
    keywords: [
      "mitsubishi", "wire edm", "post processor", "cps", "hsmworks",
      "solidworks", "nc code", "fa-series",
    ],
    priority: "high",
    camSystem: "hsmworks",
    machineTarget: "mitsubishi",
  },
  {
    id: "wedm-res-053",
    name: "Makino Wire EDM Post Processor (Fusion 360 CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/FUSION BASIC POSTS/makino.cps",
    fileType: "cps",
    description:
      "Fusion 360 generic Makino post processor. Can be adapted for Makino Wire EDM " +
      "models (U3, U6, U6H) by modifying the wire-specific M-code and parameter blocks.",
    keywords: [
      "makino", "post processor", "cps", "fusion360", "wire edm",
      "u-series", "generic",
    ],
    priority: "high",
    camSystem: "fusion360",
    machineTarget: "makino",
  },
  {
    id: "wedm-res-054",
    name: "Makino D200Z Post Processor (Fusion 360 CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/FUSION BASIC POSTS/makino d200z.cps",
    fileType: "cps",
    description:
      "Fusion 360 CPS post for Makino D200Z wire EDM machine. The D200Z is a precision " +
      "die-sinking and wire EDM platform — this post targets its specific controller " +
      "format for wire operations.",
    keywords: [
      "makino", "d200z", "post processor", "cps", "fusion360", "wire edm",
      "precision edm",
    ],
    priority: "high",
    camSystem: "fusion360",
    machineTarget: "makino",
  },
  {
    id: "wedm-res-055",
    name: "Makino D300 Post Processor (Fusion 360 CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/FUSION BASIC POSTS/makino d300.cps",
    fileType: "cps",
    description:
      "Fusion 360 CPS post for Makino D300 wire EDM machine.",
    keywords: [
      "makino", "d300", "post processor", "cps", "fusion360", "wire edm",
    ],
    priority: "medium",
    camSystem: "fusion360",
    machineTarget: "makino",
  },
  {
    id: "wedm-res-056",
    name: "Makino D500 Post Processor (Fusion 360 CPS)",
    category: "post_processor",
    path: "H:/PRISM/resources/FUSION BASIC POSTS/makino d500.cps",
    fileType: "cps",
    description:
      "Fusion 360 CPS post for Makino D500 wire EDM machine.",
    keywords: [
      "makino", "d500", "post processor", "cps", "fusion360", "wire edm",
    ],
    priority: "medium",
    camSystem: "fusion360",
    machineTarget: "makino",
  },
  {
    id: "wedm-res-057",
    name: "Mastercam Mitsubishi FA-Series 4X Wire MM Machine Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/MITSUBISHI FA-SERIES 4X WIRE MM (TECH).WMD-8",
    fileType: "wmd",
    description:
      "Mastercam X8 wire machine definition (WMD) for Mitsubishi FA-Series 4-axis " +
      "wire EDM in metric units (TECH variant). Defines machine kinematics, wire " +
      "diameter defaults, flush settings, and available cutting passes. " +
      "The primary machine definition for JM Die's Mitsubishi WEDM.",
    keywords: [
      "mastercam", "mitsubishi", "fa-series", "wire edm", "wmd", "machine definition",
      "4-axis", "metric", "tech", "x8",
    ],
    priority: "high",
    camSystem: "mastercam",
    machineTarget: "mitsubishi",
  },
  {
    id: "wedm-res-058",
    name: "Mastercam Mitsubishi FA-Series 4X Wire (Imperial) Machine Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/MITSUBISHI FA-SERIES 4X WIRE (TECH).WMD-8",
    fileType: "wmd",
    description:
      "Mastercam X8 wire machine definition for Mitsubishi FA-Series 4-axis wire EDM " +
      "in imperial inches (TECH variant).",
    keywords: [
      "mastercam", "mitsubishi", "fa-series", "wire edm", "wmd", "machine definition",
      "4-axis", "imperial", "inch", "tech", "x8",
    ],
    priority: "medium",
    camSystem: "mastercam",
    machineTarget: "mitsubishi",
  },
  {
    id: "wedm-res-059",
    name: "Mastercam Mitsubishi FA-Series Controller Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/MITSUBISHI FA-SERIES 4X WIRE (TECH).CONTROL-8",
    fileType: "control",
    description:
      "Mastercam X8 controller definition file for the Mitsubishi FA-Series wire EDM. " +
      "Specifies G-code dialect, M-code mappings, and post-processor output format " +
      "for Mitsubishi FA controller series.",
    keywords: [
      "mastercam", "mitsubishi", "fa-series", "controller", "control-8",
      "wire edm", "g-code", "m-code", "post processor", "x8",
    ],
    priority: "high",
    camSystem: "mastercam",
    machineTarget: "mitsubishi",
  },
  {
    id: "wedm-res-060",
    name: "Mastercam Generic Makino 4X Wire MM Machine Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/GENERIC MAKINO 4X WIRE MM (TECH).WMD-8",
    fileType: "wmd",
    description:
      "Mastercam X8 generic Makino 4-axis wire EDM machine definition in metric. " +
      "Use as a starting point for configuring Makino WEDM machines in Mastercam.",
    keywords: [
      "mastercam", "makino", "wire edm", "wmd", "machine definition",
      "4-axis", "metric", "generic", "x8",
    ],
    priority: "high",
    camSystem: "mastercam",
    machineTarget: "makino",
  },
  {
    id: "wedm-res-061",
    name: "Mastercam Generic Makino 4X Wire Controller Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/GENERIC MAKINO 4X WIRE (TECH).CONTROL-8",
    fileType: "control",
    description:
      "Mastercam X8 controller definition for generic Makino 4-axis wire EDM. " +
      "Specifies G-code dialect and M-code mappings for Makino wire controllers.",
    keywords: [
      "mastercam", "makino", "controller", "control-8", "wire edm",
      "g-code", "m-code", "4-axis", "x8",
    ],
    priority: "medium",
    camSystem: "mastercam",
    machineTarget: "makino",
  },
  {
    id: "wedm-res-062",
    name: "Mastercam Generic Fanuc 4X Wire MM Machine Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/GENERIC FANUC 4X WIRE MM.WMD-8",
    fileType: "wmd",
    description:
      "Mastercam X8 generic Fanuc 4-axis wire EDM machine definition in metric. " +
      "Basis for any Fanuc-controlled wire EDM machine.",
    keywords: [
      "mastercam", "fanuc", "wire edm", "wmd", "machine definition",
      "4-axis", "metric", "generic", "x8",
    ],
    priority: "medium",
    camSystem: "mastercam",
    machineTarget: "fanuc_wire",
  },
  {
    id: "wedm-res-063",
    name: "Mastercam AGIE Agievision AWF 4X Wire MM Machine Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/AGIE GENERIC AGIEVISION_AWF 4X WIRE MM.WMD-8",
    fileType: "wmd",
    description:
      "Mastercam X8 AGIE Agievision AWF 4-axis wire EDM machine definition (metric). " +
      "For AGIE/GF Machining Solutions wire EDM machines.",
    keywords: [
      "mastercam", "agie", "agievision", "awf", "wire edm", "wmd",
      "machine definition", "4-axis", "metric", "x8",
    ],
    priority: "medium",
    camSystem: "mastercam",
    machineTarget: "agie",
  },
  {
    id: "wedm-res-064",
    name: "Mastercam Wire Default MM Machine Definition",
    category: "post_processor",
    path: "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/CNC_MACHINES/WIRE DEFAULT MM.WMD-8",
    fileType: "wmd",
    description:
      "Mastercam X8 default wire EDM machine definition in metric. Generic baseline " +
      "WMD for creating custom wire EDM machine definitions from scratch.",
    keywords: [
      "mastercam", "wire edm", "wmd", "machine definition", "default",
      "metric", "generic", "template", "x8",
    ],
    priority: "medium",
    camSystem: "mastercam",
    machineTarget: "generic_wire",
  },

  // --------------------------------------------------------------------------
  // CATEGORY: machine_model — Makino simulation models
  // --------------------------------------------------------------------------
  {
    id: "wedm-res-065",
    name: "Makino Wire EDM Machine Simulation Models",
    category: "machine_model",
    path: "H:/PRISM/resources/MACHINE_SIMULATION_MODELS/MAKINO",
    fileType: "other",
    description:
      "Directory of Makino machine simulation models for Virtual Machining Center " +
      "simulation. Includes 3D model data for Makino wire EDM platforms. " +
      "Used for EDM setup verification, collision detection, and virtual workpiece " +
      "validation before cutting.",
    keywords: [
      "makino", "machine model", "simulation", "virtual machining",
      "wire edm", "collision detection", "setup verification", "3d model",
    ],
    priority: "high",
    machineTarget: "makino",
  },
];

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search Wire EDM resources by a free-text query.
 *
 * Matches against:
 *   - resource name (case-insensitive)
 *   - description (case-insensitive)
 *   - keywords array (substring match)
 *   - file path (case-insensitive)
 *   - camSystem / machineTarget fields
 *
 * Results are sorted by priority (high → medium → low).
 *
 * @param query - Free-text search string
 * @returns Matching WEDMResourceEntry records sorted by priority
 */
export function searchWEDMResources(query: string): WEDMResourceEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [...WEDM_RESOURCES];

  const terms = q.split(/\s+/);

  const matches = WEDM_RESOURCES.filter(entry => {
    const haystack = [
      entry.name.toLowerCase(),
      entry.description.toLowerCase(),
      entry.path.toLowerCase(),
      entry.category,
      entry.fileType,
      entry.camSystem ?? "",
      entry.machineTarget ?? "",
      ...entry.keywords,
    ].join(" ");

    // All search terms must match somewhere in the combined haystack
    return terms.every(term => haystack.includes(term));
  });

  const priorityOrder: Record<WEDMResourceEntry["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return matches.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

/**
 * Get all Wire EDM resources in a specific category.
 *
 * @param category - One of the WEDMResourceCategory values
 * @returns All WEDMResourceEntry records for that category, sorted by priority
 */
export function getWEDMResourcesByCategory(
  category: WEDMResourceCategory,
): WEDMResourceEntry[] {
  const priorityOrder: Record<WEDMResourceEntry["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return WEDM_RESOURCES.filter(e => e.category === category).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

/**
 * Get all high-priority Wire EDM resources across all categories.
 * Useful for quick-access "recommended resources" displays.
 */
export function getHighPriorityWEDMResources(): WEDMResourceEntry[] {
  return WEDM_RESOURCES.filter(e => e.priority === "high");
}

/**
 * Get Wire EDM resources targeting a specific machine brand.
 *
 * @param target - Machine target (e.g. "mitsubishi", "makino")
 * @returns Matching entries sorted by priority
 */
export function getWEDMResourcesByMachineTarget(
  target: WEDMResourceEntry["machineTarget"],
): WEDMResourceEntry[] {
  const priorityOrder: Record<WEDMResourceEntry["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return WEDM_RESOURCES.filter(e => e.machineTarget === target).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

/**
 * Get Wire EDM resources for a specific CAM system.
 *
 * @param camSystem - Target CAM system identifier
 * @returns Matching entries sorted by priority
 */
export function getWEDMResourcesByCAMSystem(
  camSystem: WEDMResourceEntry["camSystem"],
): WEDMResourceEntry[] {
  const priorityOrder: Record<WEDMResourceEntry["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return WEDM_RESOURCES.filter(e => e.camSystem === camSystem).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

/**
 * Get index statistics for diagnostics and self-awareness reporting.
 */
export function getWEDMResourceIndexStats(): {
  schemaVersion: string;
  totalEntries: number;
  totalCategories: number;
  byCategory: Record<WEDMResourceCategory, number>;
  byPriority: Record<WEDMResourceEntry["priority"], number>;
  byFileType: Partial<Record<WEDMFileType, number>>;
  highPriorityEntries: number;
} {
  const byCategory: Partial<Record<WEDMResourceCategory, number>> = {};
  const byPriority: Record<WEDMResourceEntry["priority"], number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const byFileType: Partial<Record<WEDMFileType, number>> = {};

  for (const entry of WEDM_RESOURCES) {
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
    byPriority[entry.priority]++;
    byFileType[entry.fileType] = (byFileType[entry.fileType] ?? 0) + 1;
  }

  return {
    schemaVersion: WEDM_RESOURCES_SCHEMA_VERSION,
    totalEntries: WEDM_RESOURCES.length,
    totalCategories: WEDM_RESOURCE_CATEGORIES.length,
    byCategory: byCategory as Record<WEDMResourceCategory, number>,
    byPriority,
    byFileType,
    highPriorityEntries: byPriority.high,
  };
}
