const PRISM_HYPERVIEW_SIMULATION_CENTER = {
    version: "1.0",
    description: "hyperVIEW-style simulation center integration",

    // Simulation modes from hyperMILL
    modes: {
        toolpathPreview: {
            name: "Toolpath Preview",
            description: "Quick visualization of toolpath without material removal"
        },
        stockRemoval: {
            name: "Stock Removal Simulation",
            description: "Show material being removed in real-time",
            stockModel: "dexel", // dexel-based for performance
            updateFrequency: 100 // ms
        },
        machineSimulation: {
            name: "Machine Simulation",
            description: "Full machine model with kinematics",
            components: ["spindle", "table", "axes", "fixtures", "tool"]
        },
        collisionChecking: {
            name: "Collision Checking",
            description: "Detect collisions between all components",
            checkPairs: [
                ["tool", "stock"],
                ["tool", "fixture"],
                ["holder", "stock"],
                ["holder", "fixture"],
                ["spindle", "stock"],
                ["machine", "stock"]
            ]
        }
    },
    // Collision detection results
    collisionResults: {
        detected: [],
        nearMiss: [],
        safetyMargin: 2.0, // mm

        addCollision: function(type, component1, component2, position, time) {
            this.detected.push({
                type: type,
                components: [component1, component2],
                position: position,
                time: time,
                severity: type === 'collision' ? 'error' : 'warning'
            });
        }
    },
    // Machine model for simulation
    machineModel: {
        load: function(machineFile) {
            // Load .vmm machine model file
            return {
                name: machineFile,
                loaded: true,
                components: ["bed", "column", "spindle", "table", "rotaryA", "rotaryC"]
            };
        },
        getKinematics: function() {
            return {
                type: "table-table", // or head-head, table-head
                axisOrder: ["X", "Y", "Z", "A", "C"],
                pivotPoint: { x: 0, y: 0, z: 200 }
            };
        }
    },
    // Run simulation
    runSimulation: function(ncProgram, machine, stock, tool) {
        const results = {
            success: true,
            collisions: [],
            nearMisses: [],
            cycleTime: 0,
            materialRemoved: 0,
            warnings: []
        };
        // Initialize stock model
        PRISM_VERICUT_STYLE_SIMULATION.inProcessWorkpiece.stockModel.initializeFromBox(
            stock.minX, stock.minY, stock.minZ,
            stock.maxX, stock.maxY, stock.maxZ
        );

        // Run verification
        const verification = PRISM_VERICUT_STYLE_SIMULATION.toolpathVerification.verify(
            ncProgram, machine, { stock, tool }
        );

        results.collisions = verification.collisions;
        results.cycleTime = PRISM_VERICUT_STYLE_SIMULATION.cycleTimeEstimation.estimate(
            ncProgram, machine
        ).totalSeconds;

        if (verification.errors.length > 0 || verification.collisions.length > 0) {
            results.success = false;
        }
        results.warnings = verification.warnings;

        return results;
    }
}