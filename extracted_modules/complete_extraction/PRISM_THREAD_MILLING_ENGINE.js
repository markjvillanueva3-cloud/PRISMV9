const PRISM_THREAD_MILLING_ENGINE = {
    version: "1.0",

    // Thread milling strategies
    strategies: {
        singlePoint: {
            name: "Single Point Thread Mill",
            description: "Full profile cutter, spiral interpolation",
            advantages: ["Single tool for range of sizes", "Full thread depth", "Easy to program"],
            disadvantages: ["Longer cycle time", "More tool wear"],
            preferredFor: ["Large threads", "Low volume", "Flexible production"]
        },
        multiForm: {
            name: "Multi-Form Thread Mill",
            description: "Multiple thread forms on one tool",
            advantages: ["Faster cycle", "Better thread quality"],
            disadvantages: ["Specific to pitch", "Higher tool cost"],
            preferredFor: ["High volume", "Specific thread size"]
        },
        helical: {
            name: "Helical Thread Mill",
            description: "Circular interpolation with helical motion",
            advantages: ["Standard end mill can be used", "Flexible"],
            disadvantages: ["Multiple passes required", "Complex programming"],
            preferredFor: ["Large pitch", "Special profiles"]
        }
    },
    // Calculate thread milling parameters
    calculate: function(thread, tool, material) {
        // Thread geometry
        const pitch = thread.pitch || (25.4 / thread.tpi);
        const majorDia = thread.majorDiameter;
        const minorDia = majorDia - (1.0825 * pitch);
        const pitchDia = majorDia - (0.6495 * pitch);

        // Helical interpolation
        const helixDia = majorDia - tool.diameter;
        const circumference = Math.PI * helixDia;

        // For internal thread (typical)
        const passes = thread.depth > tool.fluteLength ?
            Math.ceil(thread.depth / tool.fluteLength) : 1;

        // Cutting parameters based on material
        const speedFactors = {
            aluminum: 1.5,
            steel: 1.0,
            stainless: 0.6,
            titanium: 0.4,
            inconel: 0.25
        };
        const baseSpeed = 60; // m/min for steel
        const speed = baseSpeed * (speedFactors[material] || 1.0);
        const rpm = (speed * 1000) / (Math.PI * tool.diameter);
        const feed = rpm * tool.numberOfFlutes * 0.02; // 0.02mm per tooth typical

        return {
            thread: {
                major: majorDia,
                minor: minorDia.toFixed(3),
                pitch: pitchDia.toFixed(3),
                threadPitch: pitch
            },
            toolpath: {
                helixDiameter: helixDia.toFixed(3),
                circumference: circumference.toFixed(2),
                numberOfPasses: passes,
                direction: thread.rightHand ? "CCW climb" : "CW climb"
            },
            cutting: {
                rpm: Math.round(rpm),
                feedRate: Math.round(feed),
                plungeRate: Math.round(feed * 0.5)
            },
            gcode: this.generateGCode(thread, tool, helixDia, pitch, Math.round(rpm), Math.round(feed))
        };
    },
    // Generate thread milling G-code
    generateGCode: function(thread, tool, helixDia, pitch, rpm, feed) {
        const r = helixDia / 2;
        const depth = thread.depth;
        const internal = thread.type === 'internal';

        let gcode = [];
        gcode.push(`(THREAD MILL: ${thread.size})`);
        gcode.push(`(TOOL: ${tool.diameter}mm THREAD MILL)`);
        gcode.push(`G90 G54`);
        gcode.push(`M3 S${rpm}`);
        gcode.push(`G0 X0 Y0`);
        gcode.push(`G0 Z5.0`);

        // Position at start of helix
        gcode.push(`G0 Z${-depth + pitch}`); // Start one pitch up
        gcode.push(`G1 X${r.toFixed(3)} F${feed * 0.5}`); // Move to helix start

        // Helical interpolation
        if (internal) {
            // Internal thread - climb milling CCW
            gcode.push(`G3 X${r.toFixed(3)} Y0 Z${-depth.toFixed(3)} I${-r.toFixed(3)} J0 F${feed}`);
            gcode.push(`G3 X${r.toFixed(3)} Y0 I${-r.toFixed(3)} J0`); // Full circle to clean up
        } else {
            // External thread
            gcode.push(`G2 X${r.toFixed(3)} Y0 Z${-depth.toFixed(3)} I${-r.toFixed(3)} J0 F${feed}`);
        }
        // Retract
        gcode.push(`G0 X0 Y0`);
        gcode.push(`G0 Z5.0`);
        gcode.push(`M5`);

        return gcode.join('\n');
    },
    // Thread mill selection
    selectTool: function(thread, inventory) {
        const pitch = thread.pitch || (25.4 / thread.tpi);
        const minorDia = thread.majorDiameter - (1.0825 * pitch);

        // For internal threads, tool must be smaller than minor diameter
        const maxToolDia = thread.type === 'internal' ? minorDia * 0.8 : thread.majorDiameter;

        // Find suitable tools from inventory
        const suitable = inventory.filter(t =>
            t.type === 'threadMill' &&
            t.diameter <= maxToolDia &&
            (t.threadPitch === pitch || t.singlePoint)
        );

        return suitable.sort((a, b) => b.diameter - a.diameter)[0]; // Largest suitable
    }
}