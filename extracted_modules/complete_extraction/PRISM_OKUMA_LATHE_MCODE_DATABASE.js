const PRISM_OKUMA_LATHE_MCODE_DATABASE = {
    version: "1.0",
    controlType: "Okuma OSP",

    // Program Control
    programControl: {
        M00: { name: "Program Stop", desc: "Unconditional program stop" },
        M01: { name: "Optional Stop", desc: "Conditional stop if enabled" },
        M02: { name: "End Program", desc: "End of program" },
        M30: { name: "End & Reset", desc: "End of program with reset" }
    },
    // Spindle Control
    spindle: {
        M03: { name: "Spindle CW", desc: "Spindle ON forward (clockwise)" },
        M04: { name: "Spindle CCW", desc: "Spindle ON reverse (counter-clockwise)" },
        M05: { name: "Spindle Stop", desc: "Spindle OFF" }
    },
    // Coolant Control
    coolant: {
        M08: { name: "Coolant ON", desc: "Coolant ON" },
        M09: { name: "Coolant OFF", desc: "Coolant OFF" },
        M88: { name: "Air Blow ON", desc: "Air blower ON" },
        M89: { name: "Air Blow OFF", desc: "Air blower OFF" }
    },
    // Barrier Controls
    barriers: {
        M20: { name: "Tailstock Barrier OFF", desc: "Disable tailstock barrier" },
        M21: { name: "Tailstock Barrier ON", desc: "Enable tailstock barrier" },
        M24: { name: "Chuck Barrier OFF", desc: "Disable chuck barrier" },
        M25: { name: "Chuck Barrier ON", desc: "Enable chuck barrier" },
        M28: { name: "Tool Interference OFF", desc: "Disable tool interference check" },
        M29: { name: "Tool Interference ON", desc: "Enable tool interference check" }
    },
    // Threading Controls
    threading: {
        M22: { name: "Thread Chamfer OFF", desc: "Disable thread chamfering" },
        M23: { name: "Thread Chamfer ON", desc: "Enable thread chamfering" },
        M26: { name: "Thread Lead Z", desc: "Thread lead along Z-axis" },
        M27: { name: "Thread Lead X", desc: "Thread lead along X-axis" },
        // Infeed Patterns
        M32: { name: "Infeed Straight R", desc: "Straight infeed - right side of tool" },
        M33: { name: "Infeed Zig-Zag", desc: "Zig-zag infeed pattern" },
        M34: { name: "Infeed Straight L", desc: "Straight infeed - left side of tool" },
        // Cutting Depth Patterns
        M73: { name: "Depth Pattern 1", desc: "Constant D, then D/2, D/4, D/8, D/16 near finish" },
        M74: { name: "Depth Pattern 2", desc: "Constant D to H-U, then finish with U" },
        M75: { name: "Depth Pattern 3/4", desc: "Optimal metal removal rate (parameter controlled)" }
    },
    // Spindle Gear Ranges
    gearRange: {
        M40: { name: "Gear Neutral", desc: "Spindle gear range - neutral" },
        M41: { name: "Gear Range 1", desc: "Spindle gear range 1 (machine dependent)" },
        M42: { name: "Gear Range 2", desc: "Spindle gear range 2 (machine dependent)" },
        M43: { name: "Gear Range 3", desc: "Spindle gear range 3 (machine dependent)" },
        M44: { name: "Gear Range 4", desc: "Spindle gear range 4 (machine dependent)" }
    },
    // Tailstock Control
    tailstock: {
        M55: { name: "Quill Retract", desc: "Tailstock quill retract" },
        M56: { name: "Quill Advance", desc: "Tailstock quill advance" }
    },
    // Spindle Speed Answer
    speedAnswer: {
        M60: { name: "Speed Answer ON", desc: "Spindle speed answer neglect OFF" },
        M61: { name: "Speed Answer OFF", desc: "Spindle speed answer neglect ON (G96 mode)" }
    },
    // Chuck Control
    chuck: {
        M83: { name: "Chuck Clamp", desc: "Chuck clamp" },
        M84: { name: "Chuck Unclamp", desc: "Chuck unclamp" }
    },
    // Turret Direction
    turret: {
        M86: { name: "Turret CW", desc: "Turret indexing direction clockwise (reverse)" },
        M87: { name: "Turret CCW", desc: "Cancel M86 - turret direction forward" }
    },
    // Door Control
    door: {
        M90: { name: "Door Close", desc: "Door (cover) close" },
        M91: { name: "Door Open", desc: "Door (cover) open" }
    }
}