// PRISM_3D_TOOLPATH_STRATEGY_ENGINE - Lines 515324-515425 (102 lines) - 3D toolpath strategies\n\nconst PRISM_3D_TOOLPATH_STRATEGY_ENGINE = {
    version: "1.0.0",
    name: "3D Toolpath Strategy Engine",
    source: "CNC Fundamentals - Chapter 9",

    // 3D Machining Fundamentals
    fundamentals: {
        description: "For non-prismatic parts: molds, dies, organic shapes",
        process: "CAM triangulates model, calculates paths with gouge checking",
        compensation: "3D paths control center-tip, compensation varies by tool shape",
        limitation: "G41/G42 cutter comp NOT supported for 3D operations"
    },
    // Tolerance Parameters
    tolerances: {
        cutTolerance: {
            description: "How closely toolpath follows theoretically perfect path",
            format: "±value (total band = 2× tolerance)",
            typical: [0.0005, 0.001, 0.002]
        },
        filterTolerance: {
            description: "CAM fits long lines/arcs to replace short moves",
            benefit: "Reduces file size up to 90%",
            typical: [0.0005, 0.001]
        },
        combined: {
            formula: "Total deviation = cut tolerance + filter tolerance",
            example: "0.0005 cut + 0.001 filter = 0.0015 total possible"
        }
    },
    // Data Starving Prevention
    dataStarving: {
        description: "Control pauses between moves when processing can\'t keep up",
        symptoms: ["bumping", "machine shakes", "poor finish", "excessive wear", "slow runtime"],
        blockRates: {
            modern: "several thousand blocks/sec",
            older: "less than 100 blocks/sec"
        },
        solutions: [
            "Choose tolerances wisely",
            "Use toolpath filtering",
            "Select strategies that filter well (parallel to work plane)"
        ]
    },
    // 3D Toolpath Strategies
    strategies: {
        pocketRough: {
            name: "3D Pocket Rough",
            description: "Slices part by planes normal to Z-axis",
            process: "Creates boundary at each level, generates 2D pocket paths",
            result: "Tiered cake shape with constant stock for finishing"
        },
        parallelFinish: {
            name: "Parallel Finish",
            description: "Paths appear parallel when viewed from above",
            advantages: ["calculates quickly", "reliable"],
            disadvantages: ["produces scallops on steep walls"],
            remedy: "Additional pass rotated 90° to clean scallops"
        },
        scallop3D: {
            name: "3D Scallop",
            description: "Continuously changes stepover for constant scallop height",
            characteristics: ["calculation intensive", "large programs", "short moves"],
            result: "Superior surface finish when applied properly"
        },
        restMilling: {
            name: "REST Milling (Remaining Stock)",
            description: "Only removes material left by previous operations",
            process: "Calculates what\'s been removed vs finished model",
            efficiency: "Far more efficient than re-machining entire part",
            toolSelection: "Use tool slightly smaller than smallest feature"
        },
        pencilToolpath: {
            name: "Pencil Toolpath",
            description: "Traces tool along seams between surfaces",
            use: "Clears scallops in fillets/corners, creates perfect seams",
            toolSelection: "Use tool smaller than radius when possible"
        }
    },
    // Setup Techniques
    setupTechniques: {
        runoffSurfaces: "Expand paths to stock extents, continue down vertical walls",
        checkSurfaces: "Cover holes/features for subsequent operations",
        suppressDetails: "Remove fine details for roughing operations"
    },
    // Scallop Height Control
    scallopHeight: {
        factors: ["part topography", "stepover", "wall steepness"],
        rule: "Smaller stepover = smaller scallops",
        worst: "Steep walls parallel to path direction"
    },
    // 3D Machining Mindset
    mindset: {
        philosophy: "Cut away anything that doesn\'t belong (like sculptor carving bear)",
        process: [
            "Begin: Remove excess quickly/efficiently, leave constant stock",
            "Finish: Large tools first, then finer details",
            "Strategies: Parallel/Scallop contained by 2D profiles, or REST/Pencil"
        ],
        planning: "50-80% of time is CAD preparation (runoff, suppress, check surfaces)",
        critical: "Don\'t begin toolpaths until credible plan exists"
    }
};
