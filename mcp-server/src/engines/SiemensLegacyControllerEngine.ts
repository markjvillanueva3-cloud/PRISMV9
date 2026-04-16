/**
 * SiemensLegacyControllerEngine.ts
 *
 * Legacy Siemens 810D Controller Support Engine
 *
 * CRITICAL GAP FIX: Thousands of machines in Europe run Siemens 810D controllers,
 * which have significant feature differences from modern 840D sl.
 *
 * Key 810D Limitations vs 840D sl:
 * - No TRANSMIT (polar programming for face-end machining)
 * - No TRAORI (5-axis simultaneous transformation)
 * - Limited CYCLE800 support (basic 3+2 only, machine-dependent)
 * - Different parameter structure (MD vs SD prefixes)
 * - NCK version differences (FM-NC variants)
 * - No COMPCAD/COMPSURF block compressors
 * - Limited look-ahead (40-80 blocks vs 150+)
 * - No COMPOF/COMPCURV spline interpolation
 * - Reduced G64x path smoothing options
 *
 * @module engines/SiemensLegacyControllerEngine
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Siemens 810D dialect profile capturing hardware/software capabilities
 */
export interface Siemens810DProfile {
  /** NCK version (e.g., "3.1", "3.2", "3.4", "3.5") */
  nckVersion: string;

  /** ShopMill conversational programming available */
  hasShopMill: boolean;

  /** ShopTurn conversational programming available */
  hasShopTurn: boolean;

  /** Maximum axes supported (typically 4-5 on 810D) */
  maxAxes: number;

  /** Supported canned cycles (CYCLE subset) */
  supportedCycles: string[];

  /** Features NOT supported on this controller */
  unsupportedFeatures: string[];

  /** Parameter prefix convention (MD for machine data, SD for setting data) */
  parameterPrefix: "MD" | "SD" | "R";

  /** Maximum look-ahead blocks */
  lookAheadBlocks: number;

  /** Block processing rate (blocks/sec) */
  blockProcessingRate: number;

  /** Program memory size in KB */
  programMemoryKB: number;

  /** Supports threading cycles */
  supportsThreading: boolean;

  /** Supports rigid tapping */
  supportsRigidTapping: boolean;

  /** Maximum spindle speed */
  maxSpindleRPM: number;
}

/**
 * G-code translation result from modern → legacy format
 */
export interface TranslationResult {
  /** Translated G-code lines */
  translatedCode: string[];

  /** Warnings about unsupported features */
  warnings: string[];

  /** Errors that prevent translation */
  errors: string[];

  /** Features that were translated with workarounds */
  workarounds: WorkaroundApplied[];

  /** Overall translation success */
  success: boolean;
}

/**
 * Applied workaround documentation
 */
export interface WorkaroundApplied {
  /** Original feature/command */
  original: string;

  /** Workaround applied */
  workaround: string;

  /** Explanation of the workaround */
  explanation: string;

  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Machine type classification for 810D-controlled machines
 */
export type MachineType810D =
  | "3_axis_mill"
  | "3_axis_lathe"
  | "4_axis_mill"
  | "4_axis_lathe"
  | "mill_turn_basic";

/**
 * CYCLE800 translation mode
 */
export interface Cycle800Translation {
  /** Original CYCLE800 call */
  originalCall: string;

  /** Translated positioning commands */
  positioningCommands: string[];

  /** Work coordinate system setup */
  wcsSetup: string[];

  /** Safety retract sequence */
  safetyRetract: string[];

  /** Notes about the translation */
  notes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 810D Profile Database
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NCK version capability matrix for 810D variants
 */
const NCK_VERSION_CAPABILITIES: Record<
  string,
  {
    lookAhead: number;
    blockRate: number;
    features: string[];
    limitations: string[];
  }
> = {
  "3.1": {
    lookAhead: 40,
    blockRate: 800,
    features: ["basic_cycles", "g64"],
    limitations: [
      "no_cycle800",
      "no_smoothing",
      "limited_axes",
      "no_extended_wcs",
    ],
  },
  "3.2": {
    lookAhead: 60,
    blockRate: 1200,
    features: ["basic_cycles", "g64", "g641"],
    limitations: ["limited_cycle800", "no_traori", "no_transmit"],
  },
  "3.4": {
    lookAhead: 80,
    blockRate: 1500,
    features: ["basic_cycles", "g64", "g641", "g642", "cycle800_basic"],
    limitations: ["no_traori", "no_transmit", "no_compcad"],
  },
  "3.5": {
    lookAhead: 100,
    blockRate: 2000,
    features: [
      "basic_cycles",
      "g64",
      "g641",
      "g642",
      "g643",
      "cycle800_basic",
    ],
    limitations: ["no_traori", "no_transmit", "no_compcad"],
  },
};

/**
 * Supported cycles on 810D (subset of 840D cycles)
 */
const SUPPORTED_CYCLES_810D: string[] = [
  // Drilling cycles
  "CYCLE81", // Drilling
  "CYCLE82", // Counterboring
  "CYCLE83", // Deep hole drilling
  "CYCLE84", // Tapping (with/without encoder)
  "CYCLE85", // Boring 1
  "CYCLE86", // Boring 2
  "CYCLE87", // Boring 3
  "CYCLE88", // Boring 4
  "CYCLE89", // Boring 5

  // Milling cycles (limited on some 810D versions)
  "CYCLE71", // Face milling (basic)
  "CYCLE72", // Contour milling
  "POCKET1", // Rectangular pocket
  "POCKET2", // Circular pocket
  "SLOT1", // Longitudinal slot
  "SLOT2", // Circular slot

  // Threading cycles
  "CYCLE97", // Thread cutting
  "CYCLE98", // Thread chaining

  // Pattern cycles
  "HOLES1", // Row of holes
  "HOLES2", // Hole pattern/grid
  "MCALL", // Modal cycle call
];

/**
 * Unsupported features on 810D vs 840D sl
 */
const UNSUPPORTED_FEATURES_810D: string[] = [
  "TRAORI", // 5-axis transformation - NOT available
  "TRAFOOF", // Transform off - not needed
  "TRANSMIT", // Polar transformation for face machining - NOT available
  "TRACYL", // Cylinder transformation - NOT available
  "TRAANG", // Inclined axis transformation - NOT available
  "COMPCAD", // Advanced surface compressor - NOT available
  "COMPSURF", // Top surface compressor - NOT available
  "COMPCURV", // Spline compressor - NOT available
  "CYCLE832", // HSM settings cycle - NOT available (use G64x directly)
  "ORIAXES", // Orientation axis interpolation - NOT available
  "ORIVECT", // Vector orientation - NOT available
  "ORIRPY", // Roll-pitch-yaw orientation - NOT available
  "CUT3DC", // 3D circumference compensation - NOT available
  "CUT3DF", // 3D face compensation - NOT available
  "FFWON", // Feedforward control - limited/not available
  "LEAD", // Lead angle for 5-axis - NOT available
  "TILT", // Tilt angle for 5-axis - NOT available
];

// ─────────────────────────────────────────────────────────────────────────────
// Engine Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Siemens Legacy Controller Engine
 *
 * Provides translation, validation, and generation for Siemens 810D controllers.
 */
class SiemensLegacyControllerEngineImpl {
  /**
   * Get the default 810D profile for a machine type
   */
  getProfile(
    machineType: MachineType810D,
    nckVersion = "3.4"
  ): Siemens810DProfile {
    const nckCaps =
      NCK_VERSION_CAPABILITIES[nckVersion] || NCK_VERSION_CAPABILITIES["3.4"];

    const baseProfile: Siemens810DProfile = {
      nckVersion,
      hasShopMill: machineType.includes("mill"),
      hasShopTurn: machineType.includes("lathe") || machineType.includes("turn"),
      maxAxes: this.getMaxAxes(machineType),
      supportedCycles: [...SUPPORTED_CYCLES_810D],
      unsupportedFeatures: [...UNSUPPORTED_FEATURES_810D],
      parameterPrefix: "MD",
      lookAheadBlocks: nckCaps.lookAhead,
      blockProcessingRate: nckCaps.blockRate,
      programMemoryKB: 512,
      supportsThreading: true,
      supportsRigidTapping: true,
      maxSpindleRPM: 8000,
    };

    // Adjust based on machine type
    if (machineType === "3_axis_lathe" || machineType === "4_axis_lathe") {
      baseProfile.supportedCycles.push("CYCLE95"); // Stock removal turning
      baseProfile.supportedCycles.push("CYCLE96"); // Thread undercut
    }

    return baseProfile;
  }

  /**
   * Get maximum axes for machine type
   */
  private getMaxAxes(machineType: MachineType810D): number {
    switch (machineType) {
      case "3_axis_mill":
      case "3_axis_lathe":
        return 3;
      case "4_axis_mill":
      case "4_axis_lathe":
        return 4;
      case "mill_turn_basic":
        return 5;
      default:
        return 3;
    }
  }

  /**
   * Translate modern 840D G-code to 810D-compatible format
   */
  translateTo810D(
    gcode: string[],
    profile: Siemens810DProfile
  ): TranslationResult {
    const result: TranslationResult = {
      translatedCode: [],
      warnings: [],
      errors: [],
      workarounds: [],
      success: true,
    };

    for (const line of gcode) {
      const trimmedLine = line.trim();
      const upperLine = trimmedLine.toUpperCase();

      // CYCLE800 special handling (check BEFORE unsupported features)
      if (upperLine.includes("CYCLE800")) {
        const cycle800Result = this.translateCycle800(trimmedLine, profile);
        result.translatedCode.push(...cycle800Result.safetyRetract);
        result.translatedCode.push(...cycle800Result.positioningCommands);
        result.translatedCode.push(...cycle800Result.wcsSetup);
        cycle800Result.notes.forEach((note) => result.warnings.push(note));
        continue;
      }

      // CYCLE832 (HSM) → G64x translation (check BEFORE unsupported features)
      if (upperLine.includes("CYCLE832")) {
        const hsmResult = this.translateCycle832(trimmedLine, profile);
        result.translatedCode.push(...hsmResult.lines);
        if (hsmResult.warning) {
          result.warnings.push(hsmResult.warning);
        }
        continue;
      }

      // G641/G642/G643 look-ahead translation
      if (/G64[123]/.test(upperLine)) {
        const lookAheadResult = this.translateLookAhead(trimmedLine, profile);
        result.translatedCode.push(lookAheadResult.line);
        if (lookAheadResult.warning) {
          result.warnings.push(lookAheadResult.warning);
        }
        continue;
      }

      // Check for unsupported features (after special handling)
      const unsupportedMatch = this.checkUnsupportedFeature(
        trimmedLine,
        profile
      );
      if (unsupportedMatch) {
        const translation = this.translateUnsupportedFeature(
          trimmedLine,
          unsupportedMatch,
          profile
        );
        if (translation.error) {
          result.errors.push(translation.error);
          result.success = false;
        } else {
          result.translatedCode.push(...translation.lines);
          if (translation.warning) {
            result.warnings.push(translation.warning);
          }
          if (translation.workaround) {
            result.workarounds.push(translation.workaround);
          }
        }
        continue;
      }

      // Pass through supported lines
      result.translatedCode.push(trimmedLine);
    }

    return result;
  }

  /**
   * Check if a line contains an unsupported feature
   * Note: CYCLE800 and CYCLE832 are handled separately, not here
   */
  private checkUnsupportedFeature(
    line: string,
    profile: Siemens810DProfile
  ): string | null {
    const upperLine = line.toUpperCase();

    // Skip features we handle separately with translation
    const handledSeparately = ["CYCLE800", "CYCLE832"];

    for (const feature of profile.unsupportedFeatures) {
      // Skip CYCLE832 - we translate it to G64x
      if (handledSeparately.includes(feature)) {
        continue;
      }
      if (upperLine.includes(feature)) {
        return feature;
      }
    }
    return null;
  }

  /**
   * Translate an unsupported feature to 810D equivalent or error
   */
  private translateUnsupportedFeature(
    line: string,
    feature: string,
    _profile: Siemens810DProfile
  ): {
    lines: string[];
    warning?: string;
    error?: string;
    workaround?: WorkaroundApplied;
  } {
    switch (feature) {
      case "TRAORI":
      case "TRAFOOF":
        return {
          lines: [],
          error: `5-axis transformation (${feature}) not supported on 810D. Machine requires 840D sl or newer for simultaneous 5-axis.`,
        };

      case "TRANSMIT":
        return {
          lines: [
            "; WARNING: TRANSMIT not available on 810D",
            "; Use manual polar coordinate programming with G02/G03 + C-axis",
          ],
          warning:
            "TRANSMIT (polar face machining) not available. Manual polar programming required.",
          workaround: {
            original: line,
            workaround: "Manual polar coordinate programming",
            explanation:
              "810D lacks TRANSMIT transformation. Face-end machining must use explicit C-axis programming with arc interpolation.",
            confidence: 0.6,
          },
        };

      case "TRACYL":
        return {
          lines: [],
          error:
            "TRACYL (cylinder transformation) not supported on 810D. Cannot program cylinder surface operations.",
        };

      case "COMPCAD":
      case "COMPSURF":
      case "COMPCURV":
        return {
          lines: ["; Block compressor not available - using raw G1 segments"],
          warning: `${feature} compressor not available on 810D. Program will use uncompressed linear segments.`,
          workaround: {
            original: line,
            workaround: "None - linear segments retained",
            explanation: `810D lacks ${feature}. CAM must output with small enough tolerance for surface quality.`,
            confidence: 0.85,
          },
        };

      case "CYCLE832":
        // Special handling - convert to G64x calls
        return {
          lines: ["G642 ; Automatic corner rounding (810D equivalent)"],
          warning:
            "CYCLE832 HSM cycle converted to G642. Some HSM features unavailable.",
          workaround: {
            original: line,
            workaround: "G642",
            explanation:
              "810D lacks CYCLE832. Using G642 automatic corner rounding as closest equivalent.",
            confidence: 0.7,
          },
        };

      case "FFWON":
        return {
          lines: ["; Feedforward not available on 810D"],
          warning:
            "FFWON feedforward control not supported. Contour accuracy may be reduced at high feeds.",
          workaround: {
            original: line,
            workaround: "Removed (no equivalent)",
            explanation:
              "810D lacks feedforward servo control. Reduce feed rates for better accuracy.",
            confidence: 0.5,
          },
        };

      case "CUT3DC":
      case "CUT3DF":
        return {
          lines: ["; 3D cutter compensation not available - using CUT2D"],
          warning: `${feature} 3D compensation not supported. Using 2D compensation (CUT2D).`,
          workaround: {
            original: line,
            workaround: "CUT2D",
            explanation:
              "810D lacks 3D cutter compensation. Post must output tool-center paths.",
            confidence: 0.6,
          },
        };

      case "ORIAXES":
      case "ORIVECT":
      case "ORIRPY":
      case "LEAD":
      case "TILT":
        return {
          lines: [],
          error: `5-axis orientation command (${feature}) not supported on 810D.`,
        };

      default:
        return {
          lines: [`; Unsupported feature: ${feature}`],
          warning: `Feature ${feature} not supported on 810D.`,
        };
    }
  }

  /**
   * Translate CYCLE800 (swivel plane) to manual axis positioning
   *
   * On 810D, CYCLE800 support is limited or non-existent depending on NCK version.
   * This translates to direct A/B/C axis moves.
   */
  translateCycle800(
    cycle800Line: string,
    profile: Siemens810DProfile
  ): Cycle800Translation {
    const result: Cycle800Translation = {
      originalCall: cycle800Line,
      positioningCommands: [],
      wcsSetup: [],
      safetyRetract: [],
      notes: [],
    };

    // Parse CYCLE800 parameters
    // CYCLE800(0,"",0,0,0,A_angle,B_angle,C_angle,0,0,0,0,mode)
    const paramMatch = cycle800Line.match(
      /CYCLE800\s*\(\s*([^)]+)\s*\)/i
    );

    if (!paramMatch) {
      result.notes.push("Could not parse CYCLE800 parameters");
      result.positioningCommands.push(
        "; CYCLE800 parse error - manual positioning required"
      );
      return result;
    }

    const params = paramMatch[1].split(",").map((p) => p.trim());

    // Extract angles (positions 5, 6, 7 are typically A, B, C angles)
    const aAngle = parseFloat(params[5]) || 0;
    const bAngle = parseFloat(params[6]) || 0;
    const cAngle = parseFloat(params[7]) || 0;

    // Check if NCK version supports basic CYCLE800
    const nckCaps = NCK_VERSION_CAPABILITIES[profile.nckVersion];
    if (nckCaps?.features.includes("cycle800_basic")) {
      // Some 810D versions (3.4+) support basic CYCLE800
      result.positioningCommands.push(cycle800Line);
      result.notes.push(
        "CYCLE800 passed through - verify machine supports swivel data record"
      );
      return result;
    }

    // Manual translation for older 810D
    result.notes.push(
      "CYCLE800 translated to manual A/B/C positioning for 810D"
    );

    // Safety retract first
    result.safetyRetract.push("G0 Z=_MAXZ ; Safety retract before swivel");
    result.safetyRetract.push("M5 ; Spindle stop");

    // Generate axis positioning
    result.positioningCommands.push("; ===== CYCLE800 TRANSLATION START =====");
    result.positioningCommands.push("; Original: " + cycle800Line);

    // Position rotary axes
    if (profile.maxAxes >= 4 && (aAngle !== 0 || bAngle !== 0)) {
      if (aAngle !== 0) {
        result.positioningCommands.push(`G0 A=${aAngle} ; A-axis position`);
      }
      if (bAngle !== 0) {
        result.positioningCommands.push(`G0 B=${bAngle} ; B-axis position`);
      }
    }

    if (cAngle !== 0) {
      result.positioningCommands.push(`G0 C=${cAngle} ; C-axis position`);
    }

    // Work coordinate system adjustment
    result.wcsSetup.push("; Set up tilted work plane manually");
    result.wcsSetup.push(
      "; NOTE: Operator must verify tool length compensation"
    );
    result.wcsSetup.push("; NOTE: WCS rotation may need manual TRANS/ROT setup");

    if (aAngle !== 0 || bAngle !== 0) {
      // For tilted planes, suggest FRAME programming
      result.wcsSetup.push(
        `; Consider: ROT RPL=${Math.max(aAngle, bAngle)} ; Rotation in plane`
      );
    }

    result.positioningCommands.push("; ===== CYCLE800 TRANSLATION END =====");

    return result;
  }

  /**
   * Translate CYCLE832 HSM settings to G64x equivalents
   */
  private translateCycle832(
    line: string,
    profile: Siemens810DProfile
  ): { lines: string[]; warning?: string } {
    // Parse CYCLE832 parameters
    // CYCLE832(tolerance, mode) or CYCLE832() for cancel
    const paramMatch = line.match(/CYCLE832\s*\(\s*([^)]*)\s*\)/i);

    if (!paramMatch || !paramMatch[1].trim()) {
      // Empty call = cancel HSM
      return {
        lines: ["G60 ; Exact stop mode (CYCLE832 cancel)"],
        warning: "CYCLE832 cancel converted to G60 exact stop",
      };
    }

    const params = paramMatch[1].split(",").map((p) => parseFloat(p.trim()));
    const tolerance = params[0] || 0.01;

    // Determine best G64x based on NCK version
    const nckCaps = NCK_VERSION_CAPABILITIES[profile.nckVersion];
    const lines: string[] = [];

    if (nckCaps?.features.includes("g643")) {
      // Use G643 with max accel rounding
      lines.push(`G643 ; Path smoothing with acceleration limiting`);
      lines.push(`ADIS=${tolerance} ; Contour tolerance ${tolerance}mm`);
    } else if (nckCaps?.features.includes("g642")) {
      // Use G642 automatic rounding
      lines.push(`G642 ; Automatic corner rounding`);
      lines.push(`ADIS=${tolerance} ; Rounding distance`);
    } else if (nckCaps?.features.includes("g641")) {
      // Use G641 with ADIS
      lines.push(`G641 ADIS=${tolerance} ; Look-ahead with rounding`);
    } else {
      // Fallback to G64
      lines.push(`G64 ; Continuous path control (basic)`);
    }

    return {
      lines,
      warning: `CYCLE832 converted to G64x. Tolerance ${tolerance}mm. Some HSM features unavailable.`,
    };
  }

  /**
   * Translate G641/G642/G643 look-ahead commands
   */
  private translateLookAhead(
    line: string,
    profile: Siemens810DProfile
  ): { line: string; warning?: string } {
    const nckCaps = NCK_VERSION_CAPABILITIES[profile.nckVersion];

    // G643 - most advanced
    if (line.includes("G643")) {
      if (!nckCaps?.features.includes("g643")) {
        return {
          line: "G642 ; G643 downgraded to G642 for 810D",
          warning: "G643 downgraded to G642 (acceleration limiting unavailable)",
        };
      }
    }

    // G642 - automatic rounding
    if (line.includes("G642")) {
      if (!nckCaps?.features.includes("g642")) {
        return {
          line: "G641 ; G642 downgraded to G641 for 810D",
          warning: "G642 downgraded to G641 (automatic rounding unavailable)",
        };
      }
    }

    // G641 - basic look-ahead
    if (line.includes("G641")) {
      if (!nckCaps?.features.includes("g641")) {
        return {
          line: "G64 ; G641 downgraded to G64 for 810D",
          warning: "G641 downgraded to G64 (ADIS parameter unavailable)",
        };
      }
    }

    // Supported - pass through
    return { line };
  }

  /**
   * Generate safe start block for 810D
   */
  generateSafeStart(profile: Siemens810DProfile): string[] {
    const lines: string[] = [];

    lines.push("; ===== 810D SAFE START =====");
    lines.push("G90 G17 G40 G60 G80 ; Modal safety block");

    if (profile.hasShopMill) {
      lines.push("G710 ; Metric mode (if not default)");
    }

    // Work offset - 810D uses same G54-G59 + extended
    lines.push("G54 ; Work offset 1");

    // Cancel any active transformation (limited on 810D)
    lines.push("D0 ; Cancel tool offset");

    return lines;
  }

  /**
   * Generate tool change sequence for 810D
   */
  generateToolChange(
    toolNumber: number,
    _profile: Siemens810DProfile
  ): string[] {
    return [
      `; Tool change T${toolNumber}`,
      `T${toolNumber}`,
      "M6",
      "D1 ; Activate tool offset",
    ];
  }

  /**
   * Generate program end block for 810D
   */
  generateProgramEnd(_profile: Siemens810DProfile): string[] {
    return [
      "; ===== PROGRAM END =====",
      "G0 Z=_MAXZ ; Retract Z",
      "M5 ; Spindle stop",
      "M9 ; Coolant off",
      "M30 ; Program end with rewind",
    ];
  }

  /**
   * Validate G-code compatibility with 810D
   */
  validateFor810D(
    gcode: string[],
    profile: Siemens810DProfile
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (let i = 0; i < gcode.length; i++) {
      const line = gcode[i].toUpperCase();
      const lineNum = i + 1;

      // Check for unsupported features
      for (const feature of profile.unsupportedFeatures) {
        if (line.includes(feature)) {
          issues.push(`Line ${lineNum}: Unsupported feature ${feature}`);
        }
      }

      // Check for 5-axis codes
      if (/\b[ABC]\s*=/.test(line)) {
        if (profile.maxAxes < 4) {
          issues.push(
            `Line ${lineNum}: Rotary axis command on ${profile.maxAxes}-axis machine`
          );
        }
      }

      // Check for modern SINUMERIK syntax that may not work
      if (line.includes("$P_UIFR")) {
        issues.push(
          `Line ${lineNum}: Extended frame variable $P_UIFR may not be available`
        );
      }

      // Check look-ahead compatibility
      if (line.includes("G643") || line.includes("G644")) {
        const nckCaps = NCK_VERSION_CAPABILITIES[profile.nckVersion];
        if (!nckCaps?.features.includes("g643")) {
          issues.push(
            `Line ${lineNum}: G643/G644 not supported on NCK ${profile.nckVersion}`
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get TRANSMIT workaround guidance for face-end machining
   *
   * Since TRANSMIT is not available on 810D, this provides manual
   * polar coordinate programming guidance.
   */
  getTransmitWorkaround(): {
    explanation: string;
    example: string[];
    limitations: string[];
  } {
    return {
      explanation: `
810D does not support TRANSMIT transformation for face-end machining.
To machine contours on the face of a turned part:
1. Use direct C-axis positioning with X-axis moves
2. Program arcs using G02/G03 with C-axis as the rotating axis
3. Calculate polar coordinates in CAM or manually
4. Feed rate will be in mm/min (linear) not mm/rev
`,
      example: [
        "; Face milling a slot on the face without TRANSMIT",
        "; Part face at Z0, slot at X=25mm radius, angular span 0-90deg",
        "G0 Z5 ; Clear face",
        "G0 X25 C0 ; Start position",
        "G1 Z-2 F100 ; Plunge to depth",
        "G1 C90 F200 ; Cut arc (C-axis moves 90 deg at X25 radius)",
        "G0 Z5 ; Retract",
      ],
      limitations: [
        "No automatic pole avoidance - avoid X=0 during C-axis moves",
        "Feed rate is linear (mm/min), not constant surface speed",
        "Complex contours require pre-calculated polar coordinates",
        "No automatic coordinate system transformation",
        "Tool radius compensation limited to 2D (CUT2D)",
      ],
    };
  }

  /**
   * List common 810D-equipped machines
   */
  getCommon810DMachines(): Array<{
    manufacturer: string;
    model: string;
    type: MachineType810D;
    notes: string;
  }> {
    return [
      {
        manufacturer: "Gildemeister (DMG)",
        model: "CTX 400",
        type: "4_axis_lathe",
        notes: "Common in Europe, often upgraded to 840D",
      },
      {
        manufacturer: "Gildemeister (DMG)",
        model: "GMC 35",
        type: "3_axis_mill",
        notes: "Older machining center, 810D standard",
      },
      {
        manufacturer: "Maho (DMG)",
        model: "MH 600",
        type: "4_axis_mill",
        notes: "Horizontal machining center",
      },
      {
        manufacturer: "Traub",
        model: "TNL 12/18",
        type: "4_axis_lathe",
        notes: "Swiss-type lathe, common in small parts",
      },
      {
        manufacturer: "Index",
        model: "GU 600",
        type: "4_axis_lathe",
        notes: "Production lathe, often 810D equipped",
      },
      {
        manufacturer: "Emco",
        model: "Maxxturn 45",
        type: "3_axis_lathe",
        notes: "Compact lathe, educational/production use",
      },
      {
        manufacturer: "Spinner",
        model: "TC 300",
        type: "3_axis_lathe",
        notes: "Common European turning center",
      },
      {
        manufacturer: "Weiler",
        model: "E40",
        type: "3_axis_lathe",
        notes: "Precision lathe, 810D standard configuration",
      },
    ];
  }

  /**
   * Get parameter format differences between 810D and 840D
   */
  getParameterDifferences(): {
    category: string;
    param810D: string;
    param840D: string;
    notes: string;
  }[] {
    return [
      {
        category: "Axis configuration",
        param810D: "MD30300 (IS_ROT_AX)",
        param840D: "$MA_ROT_IS_MODULO",
        notes: "Rotary axis definition",
      },
      {
        category: "Rapid traverse",
        param810D: "MD32000 (MAX_AX_VELO)",
        param840D: "$MA_MAX_AX_VELO",
        notes: "Maximum axis velocity",
      },
      {
        category: "Acceleration",
        param810D: "MD32300 (MAX_AX_ACCEL)",
        param840D: "$MA_MAX_AX_ACCEL",
        notes: "Maximum axis acceleration",
      },
      {
        category: "Jerk",
        param810D: "MD32430 (JOG_AND_POS_MAX_JERK)",
        param840D: "$MA_MAX_AX_JERK",
        notes: "Jerk limitation",
      },
      {
        category: "Tool length",
        param810D: "$TC_DP3",
        param840D: "$TC_DP3",
        notes: "Same on both (tool data)",
      },
      {
        category: "Work offset",
        param810D: "$P_UIFR[n,X,TR]",
        param840D: "$P_UIFR[n,X,TR]",
        notes: "Similar but 810D has fewer frames",
      },
      {
        category: "Look-ahead",
        param810D: "MD28060 (NUM_LOOKAHEAD_BLOCKS)",
        param840D: "$MC_MM_NUM_BLOCKS_IN_PREP",
        notes: "810D typically 40-100, 840D 150+",
      },
    ];
  }

  /**
   * Check if a specific cycle is supported
   */
  isCycleSupported(cycleName: string, profile: Siemens810DProfile): boolean {
    return profile.supportedCycles.includes(cycleName.toUpperCase());
  }

  /**
   * Get dialect-specific formatting rules for 810D
   */
  getDialectRules(): {
    rule: string;
    example: string;
    notes: string;
  }[] {
    return [
      {
        rule: "Line numbers optional but recommended",
        example: "N10 G0 X100",
        notes: "N-word numbers aid in debugging and block search",
      },
      {
        rule: "Comments use semicolon",
        example: "; This is a comment",
        notes: "Same as 840D, parentheses not standard",
      },
      {
        rule: "Program end with M30",
        example: "M30",
        notes: "M30 rewinds program, M2 does not",
      },
      {
        rule: "Tool call T then M6",
        example: "T5 M6 D1",
        notes: "D1 activates first cutting edge offset",
      },
      {
        rule: "Decimal points optional for integers",
        example: "X100 or X100.0",
        notes: "Both accepted, decimal recommended for clarity",
      },
      {
        rule: "R-parameters for user variables",
        example: "R1=25.5 G1 X=R1",
        notes: "R0-R99 typically available",
      },
      {
        rule: "GOTOF/GOTOB for jumps",
        example: "GOTOF MYLABEL",
        notes: "Forward/backward jumps to labels",
      },
      {
        rule: "MCALL for modal cycle",
        example: "MCALL CYCLE81(...)",
        notes: "Cancel with empty MCALL",
      },
    ];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Singleton
// ─────────────────────────────────────────────────────────────────────────────

export const siemensLegacyControllerEngine =
  new SiemensLegacyControllerEngineImpl();
export { SiemensLegacyControllerEngineImpl };
