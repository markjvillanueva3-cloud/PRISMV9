const PRISM_COORDINATE_SYSTEM_ENGINE = {
    version: "1.0.0",
    name: "Coordinate System Engine",

    // Cartesian Coordinate System
    cartesianSystem: {
        description: "3 axes at 90° angles with origin where axes cross",
        axes: {
            X: "Left-right (table motion)",
            Y: "Forward-backward (table motion)",
            Z: "Up-down (column/spindle motion)"
        },
        rule: "Always think in terms of tool motion, not table motion"
    },
    // VMC Orientation
    vmcOrientation: {
        positiveX: "Tool moves right (table moves left)",
        positiveY: "Tool moves toward back (table moves forward)",
        positiveZ: "Tool moves up"
    },
    // Precision Standards
    precision: {
        inch: {
            coordinates: 0.0001,
            speed: 1,           // RPM
            feed: 1,            // IPM
            tapFeed: 0.001      // IPM
        },
        metric: {
            coordinates: 0.001,  // mm
            speed: 1,           // RPM
            feed: 1,            // mm/min
            tapFeed: 0.01       // mm/min
        }
    },
    // Machine Coordinate System
    machineCoordinates: {
        controlPoint: "Center-face of spindle",
        origin: "Machine Home (Z fully retracted, table at back-left limits)",
        accuracy: "±0.0002 inches over full envelope",
        feedback: "Closed-loop servo with position encoder"
    },
    // Work Coordinate System (WCS)
    workCoordinateSystem: {
        description: "Programmer-selected point on part/stock/fixture",
        requirements: [
            "Locatable with high precision (±0.001 inches)",
            "Repeatable across multiple setups",
            "Found by edge finder, probe, or mechanical means"
        ],
        viseSetupExample: {
            location: "Upper-left corner of block",
            yDatum: "Fixed jaw (repeatable)",
            xDatum: "Vise stop"
        }
    },
    // Machine Offsets
    offsets: {
        fixtureOffsetXY: {
            description: "Distance from Machine Home to WCS",
            purpose: "Allows part to be positioned anywhere in envelope",
            registers: ["G54", "G55", "G56", "G57", "G58", "G59"]
        },
        fixtureOffsetZ: {
            description: "Distance from tool setting position to part Z-datum",
            reference: "1-2-3 block top or tool probe"
        },
        toolLengthOffset: {
            description: "Distance from spindle face at Home to tool tip",
            method: "Jog to 1-2-3 block top, record in H-register",
            registers: ["H1", "H2", "H3", "etc."]
        }
    },
    // Offset Calculation
    offsetCalculation: {
        formula: "Total Z = Fixture Offset Z + Tool Length Offset",
        purpose: "Calculate distance from tool tip at Home to part Z-datum"
    },
    // Multi-Part Setup
    multiPartSetup: {
        flipMethod: "Flip part about Y-axis to maintain same reference surfaces",
        fixtureChange: "Use different fixture offsets (G54-G59) when datum shifts"
    }
}