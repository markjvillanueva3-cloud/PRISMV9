const PRISM_WORKHOLDING_ENGINE = {
    version: "1.0.0",
    name: "Work-Holding Engine",
    source: "CNC Fundamentals - Chapter 10",

    // Fixture Components
    fixtureComponents: {
        subplates: {
            description: "Bolt to table, provide mounting surface",
            use: "Base for complex fixtures"
        },
        anglePlates: {
            description: "Hold parts at angles",
            use: "Angled operations, multiple side access"
        },
        clamps: {
            types: ["toe clamps", "strap clamps", "step clamps"],
            use: "Secure workpiece to table/fixture"
        },
        shoulderBolts: {
            description: "Adjustable height fasteners",
            use: "Flexible clamping heights"
        },
        dowelPins: {
            description: "Precision location pins",
            use: "Repeatable part positioning"
        }
    },
    // Vise Accessories
    viseAccessories: {
        hardJaws: {
            description: "Standard replaceable jaws",
            use: "General purpose work-holding"
        },
        softJaws: {
            description: "Machined to fit specific part OD",
            benefits: ["better grip", "more contact area", "less marring"]
        },
        stepJaws: {
            description: "Multiple height steps",
            use: "Various part heights without adjustment"
        }
    },
    // Setup Procedures (Haas-specific)
    setupProcedures: {
        preStart: [
            "Check oil/coolant levels",
            "Clear work area",
            "Verify air pressure adequate"
        ],
        startHome: [
            "Main breaker on",
            "POWER ON button",
            "RESET",
            "Power Up Restart (closes doors, homes axes)"
        ],
        loadTools: [
            "MDI/DNC mode",
            "Enter T number",
            "ATC FWD to index carousel",
            "Grip tool below V-flange (not by flutes)",
            "Push into spindle aligning dogs with slots",
            "TOOL RELEASE button"
        ],
        setTLO: [
            "Handle Jog mode, 0.01 increment",
            "Jog Z down to 1-2-3 block",
            "Until stylus just slides under (0.001 final)",
            "TOOL OFFSET MESUR button records position",
            "NEXT TOOL, repeat"
        ],
        setFixtureXY: [
            "MDI mode",
            "S1100 M3 (start spindle)",
            "Handle Jog, use edge finder on left edge",
            "0.001 increment until trips = 0.100 from edge",
            "Jog up in Z",
            "Rotate handle 1 full turn +X (moves 0.100, centered on edge)",
            "Offset page, Part Zero Set X",
            "Repeat for Y edge",
            "Spindle stop"
        ],
        setFixtureZ: [
            "Dial indicator on 1-2-3 block",
            "Jog tool down until indicator reads zero",
            "Record Z position",
            "Calculate distance from block top to part datum",
            "Enter in Fixture Offset Z"
        ],
        runProgram: [
            "Use rapid/feed overrides",
            "Single-block mode for first run",
            "Hand on emergency stop"
        ],
        adjustOffsets: [
            "Measure part features",
            "Adjust D-registers (diameter)",
            "Adjust H-registers (length) for precision"
        ],
        shutdown: [
            "Remove tools from spindle",
            "Clean work area",
            "Power off"
        ]
    },
    // Edge Finding Methods
    edgeFinding: {
        edgeFinder: {
            description: "Spring-loaded indicator that trips at edge",
            offset: 0.100,  // inches from edge when trips
            precision: 0.001
        },
        probe: {
            description: "Electronic touch probe",
            accuracy: "higher than edge finder",
            features: ["automatic offset setting", "part inspection"]
        }
    }
}