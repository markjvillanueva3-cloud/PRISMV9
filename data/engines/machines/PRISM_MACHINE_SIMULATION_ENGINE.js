/**
 * PRISM_MACHINE_SIMULATION_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 5
 * Lines: 246
 * Session: R2.3.1 Wave 3 Engine Gap Extraction
 */

const PRISM_MACHINE_SIMULATION_ENGINE = {
    version: "1.0",

    // Simulation state
    state: {
        currentPosition: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
        currentTool: null,
        spindleOn: false,
        spindleSpeed: 0,
        feedRate: 0,
        coolantOn: false,
        stock: null,
        removedMaterial: []
    },
    // Initialize simulation
    initialize: function(machine, stock, fixtures) {
        this.state.machine = machine;
        this.state.stock = JSON.parse(JSON.stringify(stock)); // Deep copy
        this.state.fixtures = fixtures;
        this.state.currentPosition = { ...machine.homePosition };
        this.state.removedMaterial = [];
        return this;
    },
    // Execute G-code line
    executeLine: function(line) {
        const result = { success: true, warnings: [], errors: [] };

        // Parse G-code
        const parsed = this.parseGCode(line);

        // Execute based on code type
        if (parsed.G !== undefined) {
            switch (parsed.G) {
                case 0: // Rapid
                    result.motion = this.executeRapid(parsed);
                    break;
                case 1: // Linear
                    result.motion = this.executeLinear(parsed);
                    break;
                case 2: // CW Arc
                case 3: // CCW Arc
                    result.motion = this.executeArc(parsed);
                    break;
                case 28: // Home
                    result.motion = this.executeHome();
                    break;
                case 43: // Tool length compensation
                    result.toolComp = this.applyToolComp(parsed);
                    break;
            }
        }
        if (parsed.M !== undefined) {
            switch (parsed.M) {
                case 3: case 4: // Spindle on
                    this.state.spindleOn = true;
                    this.state.spindleSpeed = parsed.S || this.state.spindleSpeed;
                    break;
                case 5: // Spindle off
                    this.state.spindleOn = false;
                    break;
                case 6: // Tool change
                    result.toolChange = this.executeToolChange(parsed.T);
                    break;
                case 8: // Coolant on
                    this.state.coolantOn = true;
                    break;
                case 9: // Coolant off
                    this.state.coolantOn = false;
                    break;
            }
        }
        // Check for collisions
        if (result.motion) {
            const collision = this.checkMotionCollision(result.motion);
            if (collision) {
                result.errors.push(collision);
                result.success = false;
            }
        }
        return result;
    },
    // Parse G-code line
    parseGCode: function(line) {
        const result = {};
        const parts = line.toUpperCase().split(/\s+/);

        for (const part of parts) {
            const code = part.charAt(0);
            const value = parseFloat(part.substring(1));

            if (!isNaN(value)) {
                result[code] = value;
            }
        }
        return result;
    },
    // Execute rapid move
    executeRapid: function(parsed) {
        const from = { ...this.state.currentPosition };
        const to = {
            x: parsed.X !== undefined ? parsed.X : from.x,
            y: parsed.Y !== undefined ? parsed.Y : from.y,
            z: parsed.Z !== undefined ? parsed.Z : from.z,
            a: parsed.A !== undefined ? parsed.A : from.a,
            b: parsed.B !== undefined ? parsed.B : from.b,
            c: parsed.C !== undefined ? parsed.C : from.c
        };
        this.state.currentPosition = to;

        return {
            type: 'rapid',
            from,
            to,
            distance: this.calculateDistance(from, to)
        };
    },
    // Execute linear move
    executeLinear: function(parsed) {
        const from = { ...this.state.currentPosition };
        const to = {
            x: parsed.X !== undefined ? parsed.X : from.x,
            y: parsed.Y !== undefined ? parsed.Y : from.y,
            z: parsed.Z !== undefined ? parsed.Z : from.z
        };
        if (parsed.F) this.state.feedRate = parsed.F;

        this.state.currentPosition = to;

        // Simulate material removal if cutting
        if (this.state.spindleOn && this.state.currentTool) {
            this.simulateMaterialRemoval(from, to);
        }
        return {
            type: 'linear',
            from,
            to,
            feedRate: this.state.feedRate,
            distance: this.calculateDistance(from, to),
            time: this.calculateDistance(from, to) / this.state.feedRate
        };
    },
    // Execute arc move
    executeArc: function(parsed) {
        const clockwise = parsed.G === 2;
        return {
            type: 'arc',
            clockwise,
            from: { ...this.state.currentPosition },
            to: { x: parsed.X, y: parsed.Y, z: parsed.Z },
            center: { i: parsed.I || 0, j: parsed.J || 0, k: parsed.K || 0 }
        };
    },
    // Execute tool change
    executeToolChange: function(toolNumber) {
        const tool = PRISM_TOOL_LIBRARY_MANAGER.library.getTool(`T${toolNumber}`);
        this.state.currentTool = tool;
        return {
            toolNumber,
            tool,
            time: 5 // Typical tool change time in seconds
        };
    },
    // Calculate distance
    calculateDistance: function(from, to) {
        return Math.sqrt(
            Math.pow(to.x - from.x, 2) +
            Math.pow(to.y - from.y, 2) +
            Math.pow(to.z - from.z, 2)
        );
    },
    // Check for collision during motion
    checkMotionCollision: function(motion) {
        // Check axis limits
        const limits = this.state.machine?.limits;
        if (limits) {
            const to = motion.to;
            if (to.x < limits.x.min || to.x > limits.x.max) {
                return { type: 'axis_limit', axis: 'X', position: to.x };
            }
            if (to.y < limits.y.min || to.y > limits.y.max) {
                return { type: 'axis_limit', axis: 'Y', position: to.y };
            }
            if (to.z < limits.z.min || to.z > limits.z.max) {
                return { type: 'axis_limit', axis: 'Z', position: to.z };
            }
        }
        // Check fixture collision
        if (this.state.fixtures && this.state.currentTool) {
            for (const fixture of this.state.fixtures) {
                // Simplified collision check
                if (this.checkToolFixtureCollision(motion.to, fixture)) {
                    return { type: 'fixture_collision', fixture: fixture.name };
                }
            }
        }
        return null;
    },
    // Simplified tool-fixture collision
    checkToolFixtureCollision: function(position, fixture) {
        // Basic bounding box check
        if (fixture.bounds) {
            const toolRadius = this.state.currentTool?.diameter / 2 || 0;
            return (
                position.x + toolRadius > fixture.bounds.min.x &&
                position.x - toolRadius < fixture.bounds.max.x &&
                position.y + toolRadius > fixture.bounds.min.y &&
                position.y - toolRadius < fixture.bounds.max.y &&
                position.z > fixture.bounds.min.z &&
                position.z < fixture.bounds.max.z
            );
        }
        return false;
    },
    // Simulate material removal
    simulateMaterialRemoval: function(from, to) {
        if (!this.state.currentTool) return;

        const toolRadius = this.state.currentTool.diameter / 2;
        this.state.removedMaterial.push({
            type: 'cylinder',
            start: from,
            end: to,
            radius: toolRadius
        });
    },
    // Get cycle time estimate
    getCycleTime: function(gcode) {
        let totalTime = 0;
        const lines = gcode.split('\n');

        for (const line of lines) {
            const result = this.executeLine(line);
            if (result.motion) {
                if (result.motion.type === 'rapid') {
                    totalTime += result.motion.distance / 10000; // Assume 10000 mm/min rapid
                } else {
                    totalTime += result.motion.time || 0;
                }
            }
            if (result.toolChange) {
                totalTime += result.toolChange.time;
            }
        }
        return totalTime / 60; // Return in minutes
    }
}