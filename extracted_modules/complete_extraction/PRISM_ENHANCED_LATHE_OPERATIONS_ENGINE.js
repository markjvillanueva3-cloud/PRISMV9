const PRISM_ENHANCED_LATHE_OPERATIONS_ENGINE = {
    version: "2.1.0",
    name: "Enhanced Lathe Operations Engine",
    source: "CNC Fundamentals - Chapter 8",

    // Lathe Coordinate System
    coordinateSystem: {
        Z: "Parallel to spindle axis",
        X: "Perpendicular to spindle (diameter direction)",
        toolApproach: "From top (upper-turret, tool installed upside-down)",
        spindleRotation: "Counter-clockwise when viewed from tailstock"
    },
    // Carbide Insert Designation System
    insertDesignation: {
        example: "CNMG-433",
        positions: {
            1: { code: "C", meaning: "Shape: 80° diamond" },
            2: { code: "N", meaning: "Clearance: 0° angle" },
            3: { code: "M", meaning: "Tolerance: ±0.002-0.005 corner" },
            4: { code: "G", meaning: "Features: cylindrical hole, chip breaker" },
            5: { code: "4", meaning: "Size: 0.500 inscribed circle" },
            6: { code: "3", meaning: "Thickness: 0.187 inches" },
            7: { code: "3", meaning: "Nose radius: 0.047 inches" }
        },
        shapes: {
            C: { angle: 80, use: "facing/roughing" },
            T: { angle: 60, use: "triangle, versatile" },
            S: { angle: 90, use: "square, strong" },
            D: { angle: 55, use: "finishing, contours" },
            V: { angle: 35, use: "fine finishing, tight contours" },
            R: { angle: 0, use: "round, steep walls" }
        },
        clearanceAngles: {
            N: 0,
            A: 3,
            B: 5,
            C: 7,
            P: 11
        }
    },
    // Lathe Tool Types
    toolTypes: {
        faceTurn: {
            inserts: ["round", "square", "80° diamond"],
            use: "facing, roughing",
            finishing: ["55° diamond", "35° diamond"]
        },
        groove: {
            classification: "by width and corner radii",
            applications: ["O-ring grooves", "snap-ring grooves", "tight area roughing"],
            holders: ["OD left", "OD right", "ID left", "ID right", "Face left", "Face right"]
        },
        bore: {
            type: "boring bar parallel to spindle",
            use: "precision hole finishing",
            requirement: "pilot hole for bar clearance"
        },
        thread: {
            use: "ID/OD thread cutting",
            setup: "set to thread point tip",
            verification: "thread gage",
            adjustment: "X-offset for thread class"
        },
        cutoff: {
            type: "special deep-cutting groove tool",
            use: "part separation from stock",
            sequence: "usually last operation"
        }
    },
    // Constant Surface Speed (CSS)
    constantSurfaceSpeed: {
        gCode: "G96",
        description: "Automatically adjusts RPM as tool moves toward center",
        purpose: "Maintain constant material removal rate",
        safetyLimit: {
            gCode: "G50",
            parameter: "S[max]",
            critical: true,
            reason: "Prevents over-speeding at small diameters"
        },
        cancel: {
            gCode: "G97",
            useFor: ["rapid moves", "drilling", "tapping", "operations where X constant"]
        }
    },
    // Operations Sequence
    operationsSequence: {
        1: {
            name: "Face",
            description: "First operation, creates Z-datum and flat surface",
            technique: "Start away from OD, face to X0, pull away",
            tool: "80° diamond (rigid)",
            passes: "Consider rough + finish"
        },
        2: {
            name: "Rough",
            description: "Remove excess material leaving constant stock",
            technique: "Same tool as facing when possible",
            notes: "Skip grooves/features for other tools, extend past back for cutoff"
        },
        3: {
            name: "Finish",
            description: "Final contour with surface quality",
            tool: "35° or 55° diamond",
            requirements: [
                "Sufficient side/end cutting angles",
                "Nose radius ≤ smallest ID radius",
                "Skip grooves",
                "Finish at thread major diameter"
            ],
            prefinish: "Consider for constant material removal"
        },
        4: {
            name: "Groove",
            description: "Create O-ring, snap-ring, or feature grooves",
            technique: "Plunge near center, additional plunges, contour from sides",
            tool: "Narrower than groove, radius ≤ finished radius"
        },
        5: {
            name: "Thread",
            description: "Cut internal or external threads",
            technique: "Multiple roughing passes + finish passes",
            critical: "Each pass starts at same rotational position",
            startup: "Start well away for spindle to reach speed"
        },
        6: {
            name: "Drill",
            description: "Create center holes",
            sequence: "Spot drill first, progressive larger drills",
            technique: "Peck deep holes, use shortest drill possible",
            cycles: "Use G81 canned cycles"
        },
        7: {
            name: "Bore",
            description: "Precision hole finishing",
            requirements: "Pilot hole large enough for bar clearance",
            technique: "Rough passes before finish, extend past back",
            adjustment: "Back off X-offset for first part, then adjust"
        },
        8: {
            name: "Cutoff",
            description: "Separate finished part from stock",
            sequence: "Last operation",
            technique: "Start with radius/chamfer on back, then plunge",
            safety: "Use parts catcher"
        }
    },
    // Mill-Turn Capabilities
    millTurn: {
        cAxis: "Spindle becomes rotary axis, can stop/index/move in sync",
        capabilities: ["face milling", "radial holes", "off-center features"],
        benefits: ["reduced production costs", "easier tolerance control"],
        configurations: ["dual turret", "dual spindle", "5-axis milling"],
        programming: "Challenging manually, use CAM systems"
    }
}