const PRISM_OKUMA_LATHE_GCODE_DATABASE = {
    version: "1.0",
    controlType: "Okuma OSP",

    // Motion G-Codes
    motion: {
        G00: { name: "Rapid Travel", desc: "Positioning at maximum speed", modal: true,
               note: "Both axes move at full speed, non-linear path possible" },
        G01: { name: "Linear Interpolation", desc: "Cutting feed in straight line", modal: true,
               requires: ["F (feedrate)", "Spindle rotation"],
               note: "Always produces linear move regardless of start/end positions" },
        G02: { name: "Circular CW", desc: "Clockwise arc interpolation", modal: true,
               format: "G02 X__ Z__ I+/-__ K+/-__ (or L__)" },
        G03: { name: "Circular CCW", desc: "Counter-clockwise arc interpolation", modal: true,
               format: "G03 X__ Z__ I+/-__ K+/-__ (or L__)" },
        G04: { name: "Dwell", desc: "Pause execution", format: "G04 F__ (seconds)" }
    },
    // Turret Selection (2-turret machines)
    turretSelect: {
        G13: { name: "A Turret", desc: "Designates upper turret" },
        G14: { name: "B Turret", desc: "Designates lower turret" }
    },
    // Threading G-Codes
    threading: {
        G32: { name: "Fixed Thread Face", desc: "Face threading cycle" },
        G33: { name: "Fixed Thread Long", desc: "Longitudinal threading - each pass programmed",
               format: "G33 X__ Z__ F1 J__ (K__ A__ I__ L__)",
               params: {
                   X: "Diameter of each pass",
                   Z: "Thread end-point",
                   F: "Thread lead (1/TPI) or F1 with J",
                   J: "Threads per inch",
                   K: "Thread start shift (incremental)",
                   A: "Taper angle",
                   I: "Taper increment (+increasing/-decreasing)",
                   L: "Chamfer distance at end (M23 required)"
               }
        },
        G34: { name: "Variable Lead Inc", desc: "Increasing lead threading",
               format: "G34 X__ Z__ F1 J__ E__",
               note: "Non-fixed cycle - position tool first" },
        G35: { name: "Variable Lead Dec", desc: "Decreasing lead threading" },
        G71: { name: "Long Thread Cycle", desc: "Longitudinal threading compound cycle",
               format: "G71 X__ Z__ B60 D__ F1 J__ H__ (U__ A__ I__ E__ Q__ L__)",
               params: {
                   X: "Final minor/major diameter",
                   Z: "Thread end-point",
                   B: "Tool tip point angle (default 0)",
                   D: "First pass depth (diametrical)",
                   H: "Thread height (diametrical)",
                   U: "Extra pass depth (diametrical)",
                   F: "Thread lead",
                   J: "Threads per inch",
                   A: "Taper angle",
                   I: "Taper increment",
                   E: "Variable lead change per lead",
                   Q: "Multi-start threading",
                   L: "Chamfer distance"
               }
        },
        G72: { name: "Trans Thread Cycle", desc: "Transverse/end face threading" },
        G88: { name: "Continuous Thread", desc: "Continuous thread cutting program" }
    },
    // Tool Nose Radius Compensation
    toolComp: {
        G40: { name: "TNR Cancel", desc: "Cancel tool nose radius compensation",
               note: "Use K-1 for proper exit path" },
        G41: { name: "TNR Left", desc: "Tool center LEFT of workpiece surface",
               note: "Looking in direction of tool motion" },
        G42: { name: "TNR Right", desc: "Tool center RIGHT of workpiece surface",
               note: "Looking in direction of tool motion" }
    },
    // Spindle Speed
    spindleSpeed: {
        G50: { name: "Max Spindle Limit", desc: "Maximum spindle speed designation",
               format: "G50 S____", note: "MUST be on first line of every program" },
        G96: { name: "CSS On", desc: "Constant Surface Speed mode",
               format: "G96 S__ (surface feet per minute)" },
        G97: { name: "CSS Off", desc: "Direct RPM mode",
               format: "G97 S__ (direct RPM)" }
    },
    // Droop Control
    droopControl: {
        G64: { name: "Droop OFF", desc: "Disable droop control" },
        G65: { name: "Droop ON", desc: "Enable droop control" }
    },
    // Fixed Cycles
    fixedCycles: {
        G73: { name: "OD Grooving", desc: "Longitudinal grooving on X-axis",
               format: "G73 X__ Z__ I__ K__ D__ L__ F__ E__ T__",
               params: {
                   X: "Groove bottom diameter",
                   Z: "Right wall Z coordinate",
                   I: "X-axis rapid advance",
                   K: "Z-axis stepover amount",
                   D: "Peck depth",
                   L: "Full retract depth",
                   F: "Feedrate",
                   E: "Dwell at bottom",
                   T: "Secondary tool offset"
               }
        },
        G74: { name: "Drilling/Face Groove", desc: "Z-axis drilling or face grooving",
               format: "G74 X0 Z__ D__ K__ L__ F__ E__",
               drillingParams: {
                   X: "Must be 0 for drilling",
                   Z: "Final drill depth",
                   D: "Peck amount",
                   K: "Air cut reduction (incremental)",
                   L: "Full retract trigger",
                   E: "Dwell at bottom"
               },
               faceGrooveParams: {
                   X: "End-point diameter",
                   Z: "Bottom of groove",
                   K: "Rapid advance from Z start",
                   I: "Cutter shift (diametrical)",
                   D: "Peck depth",
                   T: "Secondary offset for end-point"
               }
        },
        G77: { name: "RH Tapping", desc: "Right-hand tapping cycle",
               format: "G77 X0 Z__ F__ (K__)",
               note: "F = 1/TPI, K = air cut reduction" },
        G78: { name: "LH Tapping", desc: "Left-hand tapping cycle",
               format: "G78 X0 Z__ F__ (K__)" }
    },
    // Auto Chamfer/Radius
    autoChamfer: {
        G75: { name: "Auto Chamfer 45", desc: "Automatic 45° chamfer",
               format: "G75 G01 X__ or Z__ L__",
               note: "L = chamfer size, only with G01, non-modal" },
        G76: { name: "Auto Radius 90", desc: "Automatic 90° radius corner",
               format: "G76 G01 X__ or Z__ L__",
               note: "L = radius size" }
    },
    // LAP Cycle G-Codes (Lathe Auto-Programming)
    lapCycles: {
        G80: { name: "LAP End", desc: "End of contour definition for LAP" },
        G81: { name: "LAP Long Start", desc: "Start longitudinal contour definition" },
        G82: { name: "LAP Trans Start", desc: "Start transverse contour definition" },
        G83: { name: "LAP4 High Speed", desc: "High-speed copy turning cycle" },
        G84: { name: "LAP Conditions", desc: "Change rough cut conditions in G85",
               format: "G84 XA=__ DA=__ FA=__ XB=__ DB=__ FB=__" },
        G85: { name: "LAP Rough", desc: "Bar turning rough cut cycle",
               format: "G85 N__ D__ F__ U__ W__ (G84...)" },
        G86: { name: "LAP Copy", desc: "Copy turning cycle",
               format: "G86 N__ D__ F__ U__ W__" },
        G87: { name: "LAP Finish", desc: "Finish cut cycle",
               format: "G87 N__ (U__ W__)",
               note: "Feed rate from contour definition" }
    },
    // Coordinate/Feed Modes
    coordinateModes: {
        G90: { name: "Absolute", desc: "Absolute coordinate programming" },
        G91: { name: "Incremental", desc: "Incremental coordinate programming" },
        G94: { name: "IPM", desc: "Feed rate in inches per minute" },
        G95: { name: "IPR", desc: "Feed rate in inches per revolution (default)" }
    },
    // Priority Spindle (2-turret)
    priority: {
        G110: { name: "CSS A Priority", desc: "Constant surface footage - A turret priority" },
        G111: { name: "CSS B Priority", desc: "Constant surface footage - B turret priority" }
    },
    // Programmable Tailstock
    tailstock: {
        G152: { name: "Prog Tailstock", desc: "Call for programmable tailstock" }
    }
}