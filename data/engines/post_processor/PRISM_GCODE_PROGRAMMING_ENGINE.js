// PRISM_GCODE_PROGRAMMING_ENGINE - Lines 513818-513944 (127 lines) - G-code programming\n\nconst PRISM_GCODE_PROGRAMMING_ENGINE = {
    version: "1.0.0",
    name: "G-Code Programming Engine",
    standard: "RS-274D (EIA)",

    // Address Code Definitions
    addressCodes: {
        A: { description: "Rotation about X-axis", unit: "degrees", precision: 3 },
        B: { description: "Rotation about Y-axis", unit: "degrees", precision: 3 },
        C: { description: "Rotation about Z-axis", unit: "degrees", precision: 3 },
        D: { description: "Cutter diameter compensation offset register", type: "integer" },
        F: { description: "Feed rate", unit: "IPM or inverse time", precision: 3 },
        G: { description: "Preparatory code", type: "modal/non-modal" },
        H: { description: "Tool length offset register", type: "integer" },
        I: { description: "Arc center X incremental distance / drill cycle param", precision: 4 },
        J: { description: "Arc center Y incremental distance / drill cycle param", precision: 4 },
        K: { description: "Arc center Z incremental distance / drill cycle param", precision: 4 },
        M: { description: "Miscellaneous code", limit: "one per block" },
        N: { description: "Block number", type: "optional integer", maxDigits: 5 },
        O: { description: "Program number", type: "integer" },
        P: { description: "Dwell time", unit: "seconds" },
        Q: { description: "Drill cycle peck increment" },
        R: { description: "Arc radius or drill cycle return plane" },
        S: { description: "Spindle speed", unit: "RPM", type: "integer" },
        T: { description: "Tool number", type: "integer", usedWith: "M6" },
        X: { description: "X-axis coordinate", precision: 4 },
        Y: { description: "Y-axis coordinate", precision: 4 },
        Z: { description: "Z-axis coordinate", precision: 4 }
    },
    // Special Characters
    specialCharacters: {
        "%": "Program start/end delimiter",
        "()": "Comment (40 char max, all caps)",
        "/": "Block delete",
        ";": "End of block / carriage return"
    },
    // G-Code Commands Database
    gCodes: {
        // Motion Commands
        G0: { name: "Rapid Motion", modal: true, description: "Non-coordinated dogleg path, can exceed 1000 IPM" },
        G1: { name: "Linear Feed", modal: true, description: "Linear move at programmed feed rate" },
        G2: { name: "Circular CW", modal: true, description: "Clockwise arc with I,J,K vectors" },
        G3: { name: "Circular CCW", modal: true, description: "Counter-clockwise arc with I,J,K vectors" },
        G4: { name: "Dwell", modal: false, description: "Pause for P seconds" },

        // Plane Selection
        G17: { name: "XY Plane", modal: true, description: "XY plane designation" },
        G18: { name: "XZ Plane", modal: true, description: "XZ plane designation" },
        G19: { name: "YZ Plane", modal: true, description: "YZ plane designation" },

        // Reference Points
        G28: { name: "Return to Home", modal: false, description: "Return to machine home position" },

        // Cutter Compensation
        G40: { name: "Cutter Comp Off", modal: true, description: "Cancel cutter diameter compensation" },
        G41: { name: "Cutter Comp Left", modal: true, description: "Cutter left of path (with D register)" },
        G42: { name: "Cutter Comp Right", modal: true, description: "Cutter right of path (with D register)" },
        G43: { name: "Tool Length Comp", modal: true, description: "Tool length compensation (with H register)" },

        // Fixture Offsets
        G54: { name: "Fixture Offset 1", modal: true, description: "Work coordinate system 1" },
        G55: { name: "Fixture Offset 2", modal: true, description: "Work coordinate system 2" },
        G56: { name: "Fixture Offset 3", modal: true, description: "Work coordinate system 3" },
        G57: { name: "Fixture Offset 4", modal: true, description: "Work coordinate system 4" },
        G58: { name: "Fixture Offset 5", modal: true, description: "Work coordinate system 5" },
        G59: { name: "Fixture Offset 6", modal: true, description: "Work coordinate system 6" },

        // Canned Cycles
        G80: { name: "Cancel Canned Cycle", modal: true, description: "Cancel any active drill cycle" },
        G81: { name: "Simple Drill", modal: true, description: "Drill to depth, rapid out" },
        G82: { name: "Spot Drill", modal: true, description: "Drill with dwell at bottom" },
        G83: { name: "Peck Drill", modal: true, description: "Deep hole peck drilling cycle" },
        G84: { name: "Tapping", modal: true, description: "Rigid tapping cycle" },

        // Positioning Mode
        G90: { name: "Absolute", modal: true, description: "Absolute positioning mode" },
        G91: { name: "Incremental", modal: true, description: "Incremental positioning mode" },

        // Drill Return Mode
        G98: { name: "Return to Initial", modal: true, description: "Return to initial plane after cycle" },
        G99: { name: "Return to R-Plane", modal: true, description: "Return to R-plane after cycle" }
    },
    // M-Code Commands Database
    mCodes: {
        M0: { name: "Program Stop", description: "Unconditional stop, press cycle start to continue" },
        M1: { name: "Optional Stop", description: "Stop if Optional Stop switch is ON" },
        M2: { name: "End Program", description: "End program execution" },
        M3: { name: "Spindle CW", description: "Spindle on clockwise" },
        M4: { name: "Spindle CCW", description: "Spindle on counter-clockwise" },
        M5: { name: "Spindle Stop", description: "Stop spindle rotation" },
        M6: { name: "Tool Change", description: "Execute tool change (with T)" },
        M8: { name: "Coolant On", description: "Flood coolant on" },
        M9: { name: "Coolant Off", description: "Coolant off" },
        M30: { name: "End and Reset", description: "End program and reset to beginning" }
    },
    // Program Structure Template
    programStructure: {
        template: [
            "% (program start)",
            "O#### (program number)",
            "T## M6 (tool change)",
            "S#### M3 (spindle on CW)",
            "M8 (coolant on)",
            "G0 X Y Z (rapid to position)",
            "(machining operations)",
            "M9 (coolant off)",
            "M5 (spindle stop)",
            "G28 (safe position)",
            "M30 (end program)",
            "% (program end)"
        ]
    },
    // Canned Cycle Example
    cannedCycleExample: {
        peckDrill: "G98 G83 X1. Y1. Z-1.04 R0.06 Q0.15 P0 F9.",
        explanation: {
            G98: "Return to initial plane",
            G83: "Peck drill cycle",
            "X1. Y1.": "Hole position",
            "Z-1.04": "Final depth",
            "R0.06": "Retract plane",
            "Q0.15": "Peck increment",
            "P0": "Dwell time",
            "F9.": "Feed rate IPM"
        }
    }
};
