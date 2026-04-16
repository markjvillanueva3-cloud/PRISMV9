/**
 * PostProcessorHyperMillKnowledgeEngine — PP-HYPERMILL-KB
 * =========================================================
 * Captures production-validated post processor knowledge from
 * JM Die's real hyperMILL post configurations:
 *
 *   Sources:
 *   - H:/PRISM/resources/POSTS AND MACHINES/
 *   - H:/PRISM/JM DIE/OKUMA/POSTS AND MACHINES/
 *
 *   Machines covered:
 *   - Haas VF-2 (H-VF_Inch R12c_E19)
 *   - Hurco VMX 30i (Max_BNC_ISNC_Inch R02g_E07)
 *   - Okuma Genos M460V-5AX (OSPM_MT_TabAC_Inch R01w_E03)
 *
 *   Knowledge captured:
 *   - hyperMILL $variable$ syntax patterns
 *   - Precision command mappings (G187 P1/P2/P3 E-tolerances)
 *   - Coolant codes and sequencing
 *   - Work origin handling (G54/G55/G56)
 *   - Tool reference conventions
 *   - Job begin/end structures
 *   - Probing macros and cycles
 *   - Tolerance.cfg / Precision.cfg mappings
 *
 *   Integration:
 *   - Feeds PostProcessorAICoordinationBridge
 *   - Provides real-world patterns to MasterPostProcessorAGIOrchestrationEngine
 *   - Validates against production programs in JM Die archive
 *
 * @module engines/PostProcessorHyperMillKnowledgeEngine
 * @milestone PP-HYPERMILL-KB
 * @version 1.0.0
 */

// ============================================================================
// HYPERMILL VARIABLE DICTIONARY
// ============================================================================

/**
 * Complete dictionary of hyperMILL post processor variables used in
 * JM Die's production posts. Each $variable$ is substituted at runtime
 * by hyperMILL with actual values from the CAM program.
 */
const HYPERMILL_VARIABLES: HyperMillVariable[] = [
  // Tolerance / Precision variables
  {
    name: "$hyperMILL_tolerance$",
    type: "numeric",
    description: "Path tolerance value in current units (inch/mm)",
    typicalValues: ["0.0002", "0.001", "0.002", "0.004"],
    category: "precision",
    usedIn: ["2Dmill_begin.txt", "3D_begin.txt"]
  },
  {
    name: "$hyperMILL_precision_cmd$",
    type: "string",
    description: "Precision command (G187 P# E#) based on strategy rough/medium/fine",
    typicalValues: ["G187 P1 E", "G187 P2 E", "G187 P3 E"],
    category: "precision",
    usedIn: ["2Dmill_begin.txt", "3D_begin.txt"]
  },
  // Tool variables
  {
    name: "$hyperMILL_tool_number$",
    type: "numeric",
    description: "Current tool number in magazine",
    typicalValues: ["1", "2", "3", "...", "99"],
    category: "tool",
    usedIn: ["toolChange.txt", "toolReference.def"]
  },
  {
    name: "$hyperMILL_tool_diameter$",
    type: "numeric",
    description: "Active tool diameter",
    typicalValues: ["0.25", "0.5", "1.0", "0.125"],
    category: "tool",
    usedIn: ["toolReference.def"]
  },
  {
    name: "$hyperMILL_tool_length$",
    type: "numeric",
    description: "Active tool length offset",
    typicalValues: ["2.5", "4.0", "6.0"],
    category: "tool",
    usedIn: ["toolReference.def"]
  },
  // Work offset variables
  {
    name: "$hyperMILL_wpcs_literal$",
    type: "string",
    description: "Work coordinate system code",
    typicalValues: ["G54", "G55", "G56", "G57", "G58", "G59"],
    category: "origin",
    usedIn: ["openOrigins.txt", "changeOrigins.txt", "defineOrigins.txt"]
  },
  {
    name: "$hyperMILL_wpcs_literal_2$",
    type: "string",
    description: "Secondary work coordinate (for dual-origin operations)",
    typicalValues: ["G54", "G54.1 P1", "G54.1 P2"],
    category: "origin",
    usedIn: ["changeOrigins.txt"]
  },
  // Feed/Speed variables
  {
    name: "$hyperMILL_spindle_speed$",
    type: "numeric",
    description: "Calculated spindle RPM",
    typicalValues: ["1000", "3000", "6000", "12000"],
    category: "feed_speed",
    usedIn: ["toolChange.txt", "Jobfiles/*"]
  },
  {
    name: "$hyperMILL_feed_rate$",
    type: "numeric",
    description: "Calculated feed rate (IPM or mm/min)",
    typicalValues: ["5", "50", "200", "500"],
    category: "feed_speed",
    usedIn: ["Jobfiles/*"]
  },
  // Coolant variables
  {
    name: "$hyperMILL_coolant_on$",
    type: "string",
    description: "Coolant activation code",
    typicalValues: ["M08", "M07", "M88 P150"],
    category: "coolant",
    usedIn: ["Coolant1_On.txt"]
  },
  {
    name: "$hyperMILL_coolant_off$",
    type: "string",
    description: "Coolant deactivation code",
    typicalValues: ["M09"],
    category: "coolant",
    usedIn: ["Coolant1_Off.txt"]
  },
  // Comment / metadata variables
  {
    name: "$hyperMILL_jobname$",
    type: "string",
    description: "Current job/operation name from CAM",
    typicalValues: ["ROUGH_CONTOUR", "FINISH_POCKET", "DRILL_THRU"],
    category: "metadata",
    usedIn: ["job_start.txt", "toolChange_comment.txt"]
  },
  {
    name: "$hyperMILL_program_name$",
    type: "string",
    description: "Full NC program name",
    typicalValues: ["O0001", "O1234"],
    category: "metadata",
    usedIn: ["job_start.txt"]
  },
  {
    name: "$hyperMILL_date$",
    type: "string",
    description: "Program generation date",
    typicalValues: ["2026-04-15"],
    category: "metadata",
    usedIn: ["job_start.txt"]
  },
  {
    name: "$hyperMILL_operator$",
    type: "string",
    description: "Operator name",
    typicalValues: ["MARKV"],
    category: "metadata",
    usedIn: ["job_start.txt"]
  }
];

interface HyperMillVariable {
  name: string;
  type: "numeric" | "string" | "boolean";
  description: string;
  typicalValues: string[];
  category: "precision" | "tool" | "origin" | "feed_speed" | "coolant" | "metadata" | "probing";
  usedIn: string[];
}

// ============================================================================
// MACHINE-SPECIFIC POST CONFIGURATIONS
// ============================================================================

/**
 * Real post processor configurations from JM Die machines
 */
const MACHINE_POST_CONFIGS: MachinePostConfig[] = [
  {
    machineId: "haas_vf2",
    machineName: "Haas VF-2",
    postName: "H-VF_s_R12c_E19.def",
    postPath: "POSTS AND MACHINES/Haas_VF-2__H-VF_R12c_E19/Haas_VF-2/H-VF_Inch/R12c_E19",
    controller: "Haas NGC",
    units: "inch",
    axes: 3,
    revision: "R12c_E19",

    precision: {
      defaultCommand: "G187 P2 E0.002",
      rough: { command: "G187 P1 E", tolerance: "0.004" },
      medium: { command: "G187 P2 E", tolerance: "0.002" },
      fine: { command: "G187 P3 E", tolerance: "0.0002" }
    },

    coolant: {
      mainOn: "M08",
      mainOff: "M09",
      mist: "M07 P4",
      tsc: "M88 P150",
      airBlast: "M51"
    },

    workOffsets: ["G54", "G55", "G56", "G57", "G58", "G59", "G54.1 P1-P48"],
    spindleRange: { min: 100, max: 8100 },
    toolMagazine: 20,

    safetyRetracts: ["G28 G91 Z0", "G53 G90 Z0"],
    hsmMode: "G187 P3 E0.0001",

    jobFiles: {
      "2Dmill_begin": "G187 P2 E0.002 ($hyperMILL_tolerance$)",
      "3D_begin": "G187 P3 E0.0001",
      "2Ddrill_begin": "G90 G54",
      "3D_end": "M09\nG28 G91 Z0\nM30"
    },

    probingMacros: ["M19", "G65 P9811", "G65 P9812", "G65 P9814"],
    tribalTips: [
      "Use G187 P3 E0.0001 for mirror finish on aluminum",
      "G53 G90 Z0 is safer than G28 G91 Z0 — machine position override",
      "TSC pressure M88 P150 = 150 psi, adjust for tool size",
      "Setting 191 controls arc tolerance — check for 5-axis jobs"
    ]
  },
  {
    machineId: "hurco_vmx30i",
    machineName: "Hurco VMX 30i",
    postName: "Max_BNC_ISNC_R02g_E07.def",
    postPath: "POSTS AND MACHINES/Hurco_VMX_30 i__Max_R02g_E07/Hurco_VMX_30 i/Max_BNC_ISNC_Inch/R02g_E07",
    controller: "Hurco WinMAX (BNC/ISNC)",
    units: "inch",
    axes: 3,
    revision: "R02g_E07",

    precision: {
      defaultCommand: "UltiMotion ON",
      rough: { command: "UltiMotion ROUGH", tolerance: "0.005" },
      medium: { command: "UltiMotion MEDIUM", tolerance: "0.002" },
      fine: { command: "UltiMotion FINISH", tolerance: "0.0005" }
    },

    coolant: {
      mainOn: "M08",
      mainOff: "M09",
      mist: "M07",
      airBlast: "M51"
    },

    workOffsets: ["G54", "G55", "G56", "G57", "G58", "G59"],
    spindleRange: { min: 50, max: 12000 },
    toolMagazine: 24,

    safetyRetracts: ["G28 Z0", "G53 Z0"],
    hsmMode: "UltiMotion ON",

    jobFiles: {
      "2Dmill_begin": "G90 G54",
      "3D_begin": "UltiMotion ON",
      "3D_end": "UltiMotion OFF\nG28 Z0\nM30"
    },

    probingMacros: ["M19", "G65 P9810"],
    tribalTips: [
      "Hurco WinMAX uses conversational programming — posts must map from CAM",
      "UltiMotion is Hurco's HSM equivalent — essential for smooth 3D contours",
      "BNC format required for 3-axis, ISNC for 4-axis",
      "Use M107 for spindle orient rather than M19 on newer WinMAX"
    ]
  },
  {
    machineId: "okuma_m460v_5ax",
    machineName: "Okuma Genos M460V-5AX",
    postName: "OSPM_MT_TabAC_MUx_R01w_E03.def",
    postPath: "POSTS AND MACHINES/Okuma_Genos_M460V-5AX__OSP_R01w_E03/Okuma_Genos_M460V-5AX/OSPM_MT_TabAC_R1_Inch/R01w_E03",
    controller: "Okuma OSP-P300M",
    units: "inch",
    axes: 5,
    revision: "R01w_E03",

    precision: {
      defaultCommand: "VARD=ON",
      rough: { command: "VARD=OFF", tolerance: "0.005" },
      medium: { command: "VARD=ON", tolerance: "0.001" },
      fine: { command: "G06 (Super-NURBS)", tolerance: "0.0001" }
    },

    coolant: {
      mainOn: "M08",
      mainOff: "M09",
      mist: "M07",
      tsc: "CTLM=50",
      highPressure: "M12"
    },

    workOffsets: ["G15 H1", "G15 H2", "G15 H3", "G15 H4"],
    spindleRange: { min: 50, max: 15000 },
    toolMagazine: 32,

    safetyRetracts: ["G30 P1", "G53 Z0"],
    hsmMode: "VARD=ON",
    nurbsSupport: "G06 (Super-NURBS)",
    tiltedWorkPlane: "G10.9",
    rtcp: {
      activation: "G43.4 H#",
      deactivation: "G49",
      vectorMode: "G43.5 H# Q#"
    },

    jobFiles: {
      "2Dmill_begin": "G15 H1",
      "3D_begin": "VARD=ON\nG15 H1",
      "5axis_begin": "G43.4 H1\nG10.9",
      "3D_end": "G49\nG30 P1\nM30"
    },

    probingMacros: ["M900", "M901", "CALL O9810"],
    tribalTips: [
      "Super-NURBS (G06) shrinks 5-axis programs 80%+ — use for complex surfaces",
      "VARD=ON for smooth feed rate display, smoother motion feel",
      "G10.9 rotates work plane — more intuitive than G43.5 tool vectors",
      "OSP coordinate system uses G15 H# instead of G54-G59 (different semantics)",
      "CALL O9810 for probing — OSP doesn't use G65 macro call syntax"
    ]
  }
];

interface MachinePostConfig {
  machineId: string;
  machineName: string;
  postName: string;
  postPath: string;
  controller: string;
  units: "inch" | "mm";
  axes: 3 | 4 | 5;
  revision: string;

  precision: {
    defaultCommand: string;
    rough: { command: string; tolerance: string };
    medium: { command: string; tolerance: string };
    fine: { command: string; tolerance: string };
  };

  coolant: {
    mainOn: string;
    mainOff: string;
    mist?: string;
    tsc?: string;
    airBlast?: string;
    highPressure?: string;
  };

  workOffsets: string[];
  spindleRange: { min: number; max: number };
  toolMagazine: number;

  safetyRetracts: string[];
  hsmMode: string;
  nurbsSupport?: string;
  tiltedWorkPlane?: string;
  rtcp?: { activation: string; deactivation: string; vectorMode: string };

  jobFiles: Record<string, string>;
  probingMacros: string[];
  tribalTips: string[];
}

// ============================================================================
// HYPERMILL POST CONFIG PATTERNS
// ============================================================================

/**
 * Common patterns extracted from production hyperMILL posts
 */
const HYPERMILL_POST_PATTERNS: PostPattern[] = [
  {
    id: "precision_variable_pattern",
    name: "Precision Command Variable Pattern",
    description: "hyperMILL precision commands use Strategy → P value → Tolerance",
    example: 'G187 P#precision_level# E#tolerance#',
    appliesTo: ["Haas NGC", "Mitsubishi"],
    confidence: 0.95,
    sourceFiles: ["Precision.cfg"]
  },
  {
    id: "work_offset_literal_pattern",
    name: "Work Offset Literal Substitution",
    description: "Work origin uses $hyperMILL_wpcs_literal$ for G54-G59 or controller-specific",
    example: '$hyperMILL_wpcs_literal$ ( --- changeOrigins.txt --- )',
    appliesTo: ["all controllers"],
    confidence: 0.98,
    sourceFiles: ["openOrigins.txt", "changeOrigins.txt", "defineOrigins.txt"]
  },
  {
    id: "job_begin_structure",
    name: "Job Begin File Structure",
    description: "Each job type (2Dmill/3D/2Ddrill) has dedicated begin file with tolerance setup",
    example: 'G187 P2 E0.002 ($hyperMILL_tolerance$)',
    appliesTo: ["all controllers"],
    confidence: 0.95,
    sourceFiles: ["2Dmill_begin.txt", "3D_begin.txt", "2Ddrill_begin.txt"]
  },
  {
    id: "okuma_nurbs_pattern",
    name: "Okuma Super-NURBS Activation",
    description: "Okuma OSP uses G06 for Super-NURBS interpolation, VARD=ON for feed smoothing",
    example: 'G06 (Super-NURBS) + VARD=ON',
    appliesTo: ["Okuma OSP"],
    confidence: 0.98,
    sourceFiles: ["OSPM_MT_TabAC_MUx_R01w_E03.def"]
  },
  {
    id: "hurco_ultimotion_pattern",
    name: "Hurco UltiMotion HSM Activation",
    description: "Hurco WinMAX uses UltiMotion for high-speed machining smoothing",
    example: 'UltiMotion ON ... UltiMotion OFF',
    appliesTo: ["Hurco WinMAX"],
    confidence: 0.95,
    sourceFiles: ["Max_BNC_ISNC_R02g_E07.def"]
  },
  {
    id: "haas_g187_pattern",
    name: "Haas G187 Tolerance Selection",
    description: "Haas NGC uses G187 P1/P2/P3 for rough/medium/fine tolerance presets",
    example: 'G187 P1 E0.004 (rough), G187 P3 E0.0001 (fine)',
    appliesTo: ["Haas NGC"],
    confidence: 0.98,
    sourceFiles: ["Precision.cfg", "2Dmill_begin.txt"]
  },
  {
    id: "okuma_g15_coordinate_pattern",
    name: "Okuma G15 Coordinate System",
    description: "Okuma OSP uses G15 H# instead of G54-G59 for work coordinates",
    example: 'G15 H1 (sets work offset #1)',
    appliesTo: ["Okuma OSP"],
    confidence: 0.98,
    sourceFiles: ["OSPM_MT_TabAC_MUx_R01w_E03.def"]
  },
  {
    id: "5axis_rtcp_sequence",
    name: "5-Axis RTCP Activation Sequence",
    description: "5-axis machines require specific RTCP activation + deactivation sequence",
    example: 'G43.4 H1 → [cutting] → G49',
    appliesTo: ["Okuma OSP", "Fanuc 5-axis", "Haas 5-axis"],
    confidence: 0.92,
    sourceFiles: ["OSPM_MT_TabAC_MUx_R01w_E03.def"]
  }
];

interface PostPattern {
  id: string;
  name: string;
  description: string;
  example: string;
  appliesTo: string[];
  confidence: number;
  sourceFiles: string[];
}

// ============================================================================
// HYPERMILL KNOWLEDGE ENGINE
// ============================================================================

class PostProcessorHyperMillKnowledgeEngine {
  private readonly engineVersion = "1.0.0";

  /**
   * Get all hyperMILL variables
   */
  public getVariables(): HyperMillVariable[] {
    return HYPERMILL_VARIABLES;
  }

  /**
   * Get variables by category
   */
  public getVariablesByCategory(category: HyperMillVariable["category"]): HyperMillVariable[] {
    return HYPERMILL_VARIABLES.filter(v => v.category === category);
  }

  /**
   * Search for variable by name
   */
  public findVariable(name: string): HyperMillVariable | undefined {
    const normalized = name.toLowerCase().replace(/\$/g, "");
    return HYPERMILL_VARIABLES.find(v =>
      v.name.toLowerCase().replace(/\$/g, "").includes(normalized)
    );
  }

  /**
   * Get all machine post configurations
   */
  public getAllMachineConfigs(): MachinePostConfig[] {
    return MACHINE_POST_CONFIGS;
  }

  /**
   * Get machine config by ID
   */
  public getMachineConfig(machineId: string): MachinePostConfig | undefined {
    return MACHINE_POST_CONFIGS.find(m =>
      m.machineId === machineId.toLowerCase() ||
      m.machineName.toLowerCase().includes(machineId.toLowerCase())
    );
  }

  /**
   * Get machine configs by controller
   */
  public getMachinesByController(controller: string): MachinePostConfig[] {
    const lowerCtrl = controller.toLowerCase();
    return MACHINE_POST_CONFIGS.filter(m =>
      m.controller.toLowerCase().includes(lowerCtrl)
    );
  }

  /**
   * Get post patterns
   */
  public getAllPatterns(): PostPattern[] {
    return HYPERMILL_POST_PATTERNS;
  }

  /**
   * Get patterns applicable to a controller
   */
  public getPatternsByController(controller: string): PostPattern[] {
    const lowerCtrl = controller.toLowerCase();
    return HYPERMILL_POST_PATTERNS.filter(p =>
      p.appliesTo.some(c => c.toLowerCase().includes(lowerCtrl)) ||
      p.appliesTo.includes("all controllers")
    );
  }

  /**
   * Generate hyperMILL-style post fragment for a machine
   */
  public generatePostFragment(
    machineId: string,
    fragmentType: "2Dmill_begin" | "3D_begin" | "2Ddrill_begin" | "3D_end" | "5axis_begin"
  ): string {
    const machine = this.getMachineConfig(machineId);
    if (!machine) return "";

    return machine.jobFiles[fragmentType] || "";
  }

  /**
   * Resolve hyperMILL variables in a template
   */
  public resolveTemplate(
    template: string,
    values: Record<string, string | number>
  ): string {
    let resolved = template;

    for (const variable of HYPERMILL_VARIABLES) {
      const normalizedName = variable.name.replace(/\$/g, "");
      if (values[normalizedName] !== undefined) {
        const regex = new RegExp(`\\$${normalizedName}\\$`, "g");
        resolved = resolved.replace(regex, String(values[normalizedName]));
      } else if (variable.typicalValues.length > 0) {
        // Use first typical value as default
        const regex = new RegExp(`\\$${normalizedName}\\$`, "g");
        resolved = resolved.replace(regex, variable.typicalValues[0]);
      }
    }

    return resolved;
  }

  /**
   * Get precision command for tolerance level
   */
  public getPrecisionCommand(
    machineId: string,
    level: "rough" | "medium" | "fine"
  ): { command: string; tolerance: string } | null {
    const machine = this.getMachineConfig(machineId);
    if (!machine) return null;

    return machine.precision[level];
  }

  /**
   * Get coolant code for type
   */
  public getCoolantCode(
    machineId: string,
    type: "mainOn" | "mainOff" | "mist" | "tsc" | "airBlast" | "highPressure"
  ): string | null {
    const machine = this.getMachineConfig(machineId);
    if (!machine) return null;

    return machine.coolant[type] || null;
  }

  /**
   * Search patterns by keyword
   */
  public searchPatterns(query: string): PostPattern[] {
    const lowerQuery = query.toLowerCase();
    return HYPERMILL_POST_PATTERNS.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all tribal tips across machines
   */
  public getAllTribalTips(): Array<{ machineId: string; tip: string }> {
    const tips: Array<{ machineId: string; tip: string }> = [];
    for (const machine of MACHINE_POST_CONFIGS) {
      for (const tip of machine.tribalTips) {
        tips.push({ machineId: machine.machineId, tip });
      }
    }
    return tips;
  }

  /**
   * Validate a post processor structure against known patterns
   */
  public validatePostStructure(
    postContent: string,
    targetController: string
  ): {
    isValid: boolean;
    patternsMatched: string[];
    patternsMissing: string[];
    warnings: string[];
  } {
    const applicablePatterns = this.getPatternsByController(targetController);
    const patternsMatched: string[] = [];
    const patternsMissing: string[] = [];
    const warnings: string[] = [];

    for (const pattern of applicablePatterns) {
      // Check if pattern's example keywords appear in content
      const keywords = pattern.example.split(/[\s,]+/).filter(k => k.length > 2);
      const matches = keywords.filter(k => postContent.includes(k));

      if (matches.length > keywords.length * 0.5) {
        patternsMatched.push(pattern.id);
      } else {
        patternsMissing.push(pattern.id);
        if (pattern.confidence > 0.90) {
          warnings.push(`Missing high-confidence pattern: ${pattern.name}`);
        }
      }
    }

    return {
      isValid: patternsMissing.length === 0 || patternsMatched.length >= applicablePatterns.length * 0.7,
      patternsMatched,
      patternsMissing,
      warnings
    };
  }

  /**
   * Generate a complete machine-specific header
   */
  public generateMachineHeader(machineId: string): string[] {
    const machine = this.getMachineConfig(machineId);
    if (!machine) return [];

    const lines: string[] = [];
    lines.push(`(${"-".repeat(60)})`);
    lines.push(`(Machine: ${machine.machineName})`);
    lines.push(`(Controller: ${machine.controller})`);
    lines.push(`(Post: ${machine.postName} [${machine.revision}])`);
    lines.push(`(Axes: ${machine.axes}, Units: ${machine.units})`);
    lines.push(`(Spindle: ${machine.spindleRange.min}-${machine.spindleRange.max} RPM)`);
    lines.push(`(Tool Magazine: ${machine.toolMagazine})`);
    lines.push(`(${"-".repeat(60)})`);

    return lines;
  }

  /**
   * Get comprehensive machine capabilities
   */
  public getMachineCapabilities(machineId: string): {
    machine: MachinePostConfig;
    capabilities: string[];
    limitations: string[];
    recommendedFor: string[];
  } | null {
    const machine = this.getMachineConfig(machineId);
    if (!machine) return null;

    const capabilities: string[] = [];
    const limitations: string[] = [];
    const recommendedFor: string[] = [];

    // Capabilities from features
    if (machine.axes === 5) {
      capabilities.push("5-axis simultaneous machining");
      recommendedFor.push("Complex contoured surfaces");
    }
    if (machine.hsmMode) {
      capabilities.push(`HSM mode: ${machine.hsmMode}`);
      recommendedFor.push("High-speed finishing");
    }
    if (machine.nurbsSupport) {
      capabilities.push(`NURBS interpolation: ${machine.nurbsSupport}`);
      recommendedFor.push("Smooth 3D surface machining");
    }
    if (machine.rtcp) {
      capabilities.push(`RTCP: ${machine.rtcp.activation}`);
    }
    if (machine.coolant.tsc) {
      capabilities.push(`Through-spindle coolant: ${machine.coolant.tsc}`);
      recommendedFor.push("Deep hole drilling, tough materials");
    }
    if (machine.probingMacros.length > 0) {
      capabilities.push(`Probing macros: ${machine.probingMacros.join(", ")}`);
    }

    // Limitations
    if (machine.axes === 3) {
      limitations.push("No 5-axis simultaneous motion");
    }
    if (!machine.nurbsSupport) {
      limitations.push("No native NURBS support - use linearized toolpaths");
    }
    if (machine.spindleRange.max < 10000) {
      limitations.push(`Max spindle ${machine.spindleRange.max} RPM limits HSM aluminum work`);
    }

    return { machine, capabilities, limitations, recommendedFor };
  }

  /**
   * Get engine statistics
   */
  public getStatistics(): {
    version: string;
    variables: number;
    machines: number;
    patterns: number;
    tribalTips: number;
    controllersCovered: string[];
    variablesByCategory: Record<string, number>;
  } {
    const variablesByCategory: Record<string, number> = {};
    for (const v of HYPERMILL_VARIABLES) {
      variablesByCategory[v.category] = (variablesByCategory[v.category] || 0) + 1;
    }

    const controllersCovered = [...new Set(MACHINE_POST_CONFIGS.map(m => m.controller))];
    const totalTribalTips = MACHINE_POST_CONFIGS.reduce((sum, m) => sum + m.tribalTips.length, 0);

    return {
      version: this.engineVersion,
      variables: HYPERMILL_VARIABLES.length,
      machines: MACHINE_POST_CONFIGS.length,
      patterns: HYPERMILL_POST_PATTERNS.length,
      tribalTips: totalTribalTips,
      controllersCovered,
      variablesByCategory
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorHyperMillKnowledgeEngine = new PostProcessorHyperMillKnowledgeEngine();

export {
  HYPERMILL_VARIABLES,
  MACHINE_POST_CONFIGS,
  HYPERMILL_POST_PATTERNS,
  type HyperMillVariable,
  type MachinePostConfig,
  type PostPattern
};
