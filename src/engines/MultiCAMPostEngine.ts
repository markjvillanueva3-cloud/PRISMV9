/**
 * MultiCAMPostEngine — Post processor templates for 10+ CAM systems
 *
 * Generates post processor scaffolds for open-format CAM systems and
 * provides Phase B re-optimization for closed systems (hyperMILL, Tebis).
 *
 * Supported CAM systems:
 *   Phase A (inline): Fusion360, Mastercam, NX, CATIA, SolidCAM,
 *     PowerMill, GibbsCAM, CAMWorks, BobCAD, SprutCAM
 *   Phase B (re-optimize): hyperMILL, Tebis, Edgecam, any G-code source
 *
 * Also provides machine-specific safety sequences (startup/shutdown,
 * tool change, coolant, spindle warm-up) and basic mill-turn channel support.
 *
 * @module MultiCAMPostEngine
 */

export type CAMSystem =
  | "fusion360" | "mastercam" | "nx" | "catia" | "solidcam"
  | "powermill" | "gibbscam" | "camworks" | "bobcad" | "sprutcam"
  | "hypermill" | "tebis" | "edgecam";

export type PostFormat =
  | "cps" | "pst" | "tcl" | "vb_pp" | "gpp" | "opt" | "pit"
  | "techdb" | "config" | "cldata" | "encrypted";

export interface CAMPostInfo {
  system: CAMSystem;
  display_name: string;
  post_format: PostFormat;
  phase_a: boolean; // Can do inline optimization
  phase_b: boolean; // Can do re-optimization of output
  notes: string;
  context_extraction: string[]; // What data we can extract
}

export interface MachineSequence {
  startup: string[];
  shutdown: string[];
  tool_change: string[];
  coolant_on: string[];
  coolant_off: string[];
  spindle_warmup?: string[];
}

export interface MillTurnChannel {
  id: number;
  name: string;
  type: "main_spindle" | "sub_spindle" | "live_tooling" | "milling";
  sync_code?: string;
}

// ─── CAM System Database ─────────────────────────────────────────────

const CAM_SYSTEMS: Record<CAMSystem, CAMPostInfo> = {
  fusion360: {
    system: "fusion360", display_name: "Autodesk Fusion 360",
    post_format: "cps", phase_a: true, phase_b: true,
    notes: "JavaScript .cps — full PRISM integration via HTTP",
    context_extraction: ["tools", "operations", "stock", "material", "WCS", "strategy"],
  },
  mastercam: {
    system: "mastercam", display_name: "Mastercam",
    post_format: "pst", phase_a: true, phase_b: true,
    notes: "Text-based .pst — HTTP call from post (2024+)",
    context_extraction: ["tools", "operations", "NCI_codes", "material"],
  },
  nx: {
    system: "nx", display_name: "Siemens NX",
    post_format: "tcl", phase_a: true, phase_b: true,
    notes: "TCL/Tk scripting — mom_xxx variables",
    context_extraction: ["tools", "operations", "UDE", "stock", "material"],
  },
  catia: {
    system: "catia", display_name: "CATIA Manufacturing",
    post_format: "vb_pp", phase_a: true, phase_b: true,
    notes: "PP word table + VB macro",
    context_extraction: ["tools", "APT_source", "operations"],
  },
  solidcam: {
    system: "solidcam", display_name: "SolidCAM",
    post_format: "gpp", phase_a: true, phase_b: true,
    notes: "Configurable .gpp text file",
    context_extraction: ["tools", "operations", "material", "iMachining_data"],
  },
  powermill: {
    system: "powermill", display_name: "Autodesk PowerMill",
    post_format: "opt", phase_a: true, phase_b: true,
    notes: "Option file + macro scripting",
    context_extraction: ["tools", "toolpaths", "stock", "boundaries"],
  },
  gibbscam: {
    system: "gibbscam", display_name: "GibbsCAM",
    post_format: "pit", phase_a: true, phase_b: true,
    notes: "Text-based .pit template",
    context_extraction: ["tools", "CL_data", "operations"],
  },
  camworks: {
    system: "camworks", display_name: "CAMWorks",
    post_format: "techdb", phase_a: true, phase_b: true,
    notes: "Technology Database + config",
    context_extraction: ["tools", "operations", "TechDB_params"],
  },
  bobcad: {
    system: "bobcad", display_name: "BobCAD-CAM",
    post_format: "config", phase_a: true, phase_b: true,
    notes: "Block format config file",
    context_extraction: ["tools", "operations", "material"],
  },
  sprutcam: {
    system: "sprutcam", display_name: "SprutCAM",
    post_format: "cldata", phase_a: true, phase_b: true,
    notes: "CLData script post processor",
    context_extraction: ["tools", "CLData", "operations"],
  },
  hypermill: {
    system: "hypermill", display_name: "hyperMILL",
    post_format: "encrypted", phase_a: false, phase_b: true,
    notes: "Encrypted post — Phase B only (re-optimize output G-code)",
    context_extraction: [],
  },
  tebis: {
    system: "tebis", display_name: "Tebis",
    post_format: "encrypted", phase_a: false, phase_b: true,
    notes: "Kernel-based — Phase B only",
    context_extraction: [],
  },
  edgecam: {
    system: "edgecam", display_name: "Edgecam",
    post_format: "encrypted", phase_a: false, phase_b: true,
    notes: "Some encrypted — Phase B for all",
    context_extraction: [],
  },
};

// ─── Machine Sequence Templates ──────────────────────────────────────

function getMachineSequence(
  machineType: "vertical_mill" | "horizontal_mill" | "5axis" | "lathe" | "mill_turn",
  controller: string
): MachineSequence {
  const isSiemens = controller.includes("siemens");
  const isHeidenhain = controller.includes("heidenhain");

  const base: MachineSequence = {
    startup: isHeidenhain
      ? ["BEGIN PGM PRISM MM"]
      : ["G90 G21 G17 G40 G80"],
    shutdown: isHeidenhain
      ? ["END PGM PRISM MM"]
      : ["M5", "M9", "G91 G28 Z0", "G28 X0 Y0", "M30"],
    tool_change: isHeidenhain
      ? ["TOOL CALL {tool} Z S{speed}"]
      : isSiemens
        ? ["T{tool}", "M6", "D1", "S{speed} M3"]
        : ["G91 G28 Z0", "T{tool} M6", "G90", "S{speed} M3", "G43 H{tool}"],
    coolant_on: ["M8"],
    coolant_off: ["M9"],
  };

  switch (machineType) {
    case "5axis":
      base.startup = isHeidenhain
        ? ["BEGIN PGM PRISM MM"]
        : [...base.startup, "G90 G40 G49 G80"];
      break;
    case "lathe":
      base.startup = ["G90 G21 G18 G40 G80"]; // G18 = ZX plane
      base.tool_change = ["G28 U0 W0", "T{tool}00", "G97 S{speed} M3"];
      break;
    case "mill_turn":
      base.startup = ["G90 G21 G18 G40 G80", "(MILL-TURN MODE)"];
      base.spindle_warmup = ["M3 S500", "G4 P5000", "M3 S1000", "G4 P3000", "M5"];
      break;
    default:
      break;
  }

  return base;
}

// ─── Mill-Turn Channel Templates ─────────────────────────────────────

function getMillTurnChannels(controller: string): MillTurnChannel[] {
  const isMazak = controller.includes("mazak");
  const isSiemens = controller.includes("siemens");

  if (isSiemens) {
    return [
      { id: 1, name: "Main Spindle", type: "main_spindle", sync_code: "WAITM(1,1,2)" },
      { id: 2, name: "Sub Spindle", type: "sub_spindle", sync_code: "WAITM(2,1,2)" },
      { id: 3, name: "Live Tooling", type: "live_tooling", sync_code: "WAITM(3,1,2)" },
    ];
  }

  if (isMazak) {
    return [
      { id: 1, name: "Main Spindle", type: "main_spindle", sync_code: "!1L1" },
      { id: 2, name: "Sub Spindle", type: "sub_spindle", sync_code: "!2L1" },
      { id: 3, name: "Milling", type: "milling", sync_code: "!3L1" },
    ];
  }

  // Fanuc-style
  return [
    { id: 1, name: "Main Spindle", type: "main_spindle" },
    { id: 2, name: "Sub Spindle", type: "sub_spindle" },
  ];
}

// ─── Engine Implementation ───────────────────────────────────────────

class MultiCAMPostEngineImpl {

  /** List all supported CAM systems with capabilities */
  listCAMSystems(): CAMPostInfo[] {
    return Object.values(CAM_SYSTEMS);
  }

  /** Get info for a specific CAM system */
  getCAMInfo(system: CAMSystem): CAMPostInfo {
    return CAM_SYSTEMS[system] ?? CAM_SYSTEMS.fusion360;
  }

  /** Check if a CAM system supports Phase A (inline optimization) */
  supportsPhaseA(system: CAMSystem): boolean {
    return CAM_SYSTEMS[system]?.phase_a ?? false;
  }

  /** Check if a CAM system supports Phase B (re-optimization) */
  supportsPhaseB(system: CAMSystem): boolean {
    return CAM_SYSTEMS[system]?.phase_b ?? true;
  }

  /** Get post processor scaffold for a CAM system */
  getPostScaffold(system: CAMSystem, controller: string): {
    format: PostFormat;
    scaffold: string;
    instructions: string[];
  } {
    const info = this.getCAMInfo(system);

    if (!info.phase_a) {
      return {
        format: info.post_format,
        scaffold: "",
        instructions: [
          `${info.display_name} uses encrypted posts — Phase A not available.`,
          "Use Phase B: run the CAM's native post, then optimize with PRISM:",
          `  prism optimize output.nc --material <material> --controller ${controller}`,
          "Or via MCP: pp_reoptimize action",
        ],
      };
    }

    const scaffold = this._generateScaffold(system, controller);
    return {
      format: info.post_format,
      scaffold,
      instructions: [
        `Install this ${info.post_format.toUpperCase()} file in ${info.display_name}'s post processor directory.`,
        "Ensure PRISM server is running: the post will call http://127.0.0.1:18361",
        "Select PRISM post in the post processor dialog and configure properties.",
      ],
    };
  }

  /** Get machine-specific safety sequences */
  getMachineSequence(
    machineType: "vertical_mill" | "horizontal_mill" | "5axis" | "lathe" | "mill_turn",
    controller: string
  ): MachineSequence {
    return getMachineSequence(machineType, controller);
  }

  /** Get mill-turn channel configuration */
  getMillTurnChannels(controller: string): MillTurnChannel[] {
    return getMillTurnChannels(controller);
  }

  /** Generate Phase B optimization command for a CAM system */
  getPhaseBCommand(
    system: CAMSystem, inputFile: string, material: string, controller: string
  ): string {
    return `prism optimize "${inputFile}" --material "${material}" --controller ${controller} --aggressiveness 0.5`;
  }

  // ── Internal scaffold generators ──

  private _generateScaffold(system: CAMSystem, controller: string): string {
    switch (system) {
      case "mastercam":
        return this._mastercamScaffold(controller);
      case "nx":
        return this._nxScaffold(controller);
      default:
        return this._genericHTTPScaffold(system, controller);
    }
  }

  private _mastercamScaffold(controller: string): string {
    return `# PRISM Post Processor for Mastercam
# Format: .pst (Mastercam Post)
# Controller: ${controller}
#
# This post calls the PRISM server for physics-optimized output.
# Requires Mastercam 2024+ for HTTP support.
#
# Install: Copy to Mastercam/Posts/ directory

# Header
pheader,
  "${controller} - PRISM Optimized"
  "PRISM Manufacturing Intelligence"

# PRISM Server URL
surl = "http://127.0.0.1:18361/api/post-process"

# Tool change
ptoolchange,
  "T", tool_num, " M6"
  "S", speed, " M3"

# Linear move
plinear,
  "G1", " X", xpos, " Y", ypos, " Z", zpos, " F", feed

# Rapid
prapid,
  "G0", " X", xpos, " Y", ypos, " Z", zpos

# Arc CW
parccw,
  "G2", " X", xpos, " Y", ypos, " I", xcenter, " J", ycenter, " F", feed

# Arc CCW
parcccw,
  "G3", " X", xpos, " Y", ypos, " I", xcenter, " J", ycenter, " F", feed

# End
peof,
  "M30"
`;
  }

  private _nxScaffold(controller: string): string {
    return `# PRISM Post Processor for Siemens NX
# Format: TCL/Tk
# Controller: ${controller}
#
# This post calls PRISM server via TCL HTTP client.
# Install: Copy to NX post directory, register in Post Builder.

package require http

set PRISM_URL "http://127.0.0.1:18361/api/post-process"

proc MOM_start_of_program {} {
  global PRISM_URL
  # Test PRISM connection
  if {[catch {set tok [::http::geturl "$PRISM_URL/../health" -timeout 2000]} err]} {
    MOM_output_literal "(PRISM server not available - standard output)"
  }
}

proc MOM_linear_move {} {
  global mom_pos mom_feed_rate mom_spindle_speed
  MOM_output_literal "G1 X[format %.4f $mom_pos(0)] Y[format %.4f $mom_pos(1)] Z[format %.4f $mom_pos(2)] F[format %.1f $mom_feed_rate]"
}

proc MOM_rapid_move {} {
  global mom_pos
  MOM_output_literal "G0 X[format %.4f $mom_pos(0)] Y[format %.4f $mom_pos(1)] Z[format %.4f $mom_pos(2)]"
}

proc MOM_end_of_program {} {
  MOM_output_literal "M30"
}
`;
  }

  private _genericHTTPScaffold(system: CAMSystem, controller: string): string {
    const info = this.getCAMInfo(system);
    return `// PRISM Post Processor Scaffold for ${info.display_name}
// Format: ${info.post_format}
// Controller: ${controller}
//
// This scaffold shows the HTTP integration pattern.
// Adapt to the specific CAM system's post processor API.
//
// PRISM Server: http://127.0.0.1:18361/api/post-process
//
// The post processor should:
// 1. Collect all operations, tools, and material from the CAM context
// 2. Build a JSON payload matching the PRISM pipeline input schema
// 3. HTTP POST to the PRISM server
// 4. Write the optimized G-code from the response
// 5. If server is unreachable, fall back to standard G-code output
//
// Context available from ${info.display_name}:
//   ${info.context_extraction.join(", ")}
`;
  }
}

export const multiCAMPostEngine = new MultiCAMPostEngineImpl();
export { MultiCAMPostEngineImpl };
