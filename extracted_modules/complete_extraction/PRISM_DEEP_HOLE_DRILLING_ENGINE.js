const PRISM_DEEP_HOLE_DRILLING_ENGINE = {
    version: "2.0",

    // Drilling method selection
    methods: {
        standard: {
            name: "Standard Drilling",
            maxDepth: "3xD",
            description: "Conventional twist drill",
            coolant: "External flood"
        },
        peck: {
            name: "Peck Drilling",
            maxDepth: "8xD",
            description: "Interrupted drilling with retract for chip clearing",
            coolant: "External flood"
        },
        chipBreak: {
            name: "Chip Break Drilling",
            maxDepth: "5xD",
            description: "Partial retract to break chip, no full retract",
            coolant: "External flood"
        },
        throughCoolant: {
            name: "Through-Coolant Drilling",
            maxDepth: "12xD",
            description: "Coolant through drill body for chip evacuation",
            coolant: "Through-tool high pressure"
        },
        gun: {
            name: "Gun Drilling",
            maxDepth: "100xD+",
            description: "Single-flute self-guiding drill",
            coolant: "High-pressure through-tool"
        },
        bta: {
            name: "BTA Drilling",
            maxDepth: "200xD+",
            description: "Boring and Trepanning Association - internal chip removal",
            coolant: "External supply, internal evacuation"
        },
        ejector: {
            name: "Ejector Drilling",
            maxDepth: "150xD+",
            description: "Double tube system for chip removal",
            coolant: "Dual tube system"
        }
    },
    // Select drilling method
    selectMethod: function(diameter, depth, material, tolerance) {
        const depthRatio = depth / diameter;

        if (depthRatio <= 3) return 'standard';
        if (depthRatio <= 5 && tolerance > 0.05) return 'chipBreak';
        if (depthRatio <= 8) return 'peck';
        if (depthRatio <= 12) return 'throughCoolant';
        if (depthRatio <= 100) return 'gun';
        if (depthRatio <= 200) return 'bta';
        return 'ejector';
    },
    // Calculate peck depth
    peckCalculation: {
        // First peck is usually deeper
        calculatePeckSequence: function(totalDepth, diameter, material) {
            const pecks = [];
            const materialFactors = {
                aluminum: { first: 3.0, subsequent: 2.5, reduction: 0.85 },
                steel: { first: 2.0, subsequent: 1.5, reduction: 0.80 },
                stainless: { first: 1.5, subsequent: 1.0, reduction: 0.75 },
                titanium: { first: 1.0, subsequent: 0.75, reduction: 0.70 },
                inconel: { first: 0.75, subsequent: 0.5, reduction: 0.65 }
            };
            const factor = materialFactors[material] || materialFactors.steel;
            let currentDepth = 0;
            let peckDepth = diameter * factor.first;
            let peckNumber = 1;

            while (currentDepth < totalDepth) {
                const actualPeck = Math.min(peckDepth, totalDepth - currentDepth);
                pecks.push({
                    peck: peckNumber,
                    depth: currentDepth + actualPeck,
                    incrementalDepth: actualPeck
                });

                currentDepth += actualPeck;
                peckNumber++;

                // Reduce peck depth for deeper holes
                if (peckNumber > 1) {
                    peckDepth = diameter * factor.subsequent;
                }
                if (currentDepth > diameter * 5) {
                    peckDepth *= factor.reduction;
                }
            }
            return {
                totalPecks: pecks.length,
                pecks,
                estimatedTime: this.estimateTime(pecks, diameter)
            };
        },
        estimateTime: function(pecks, diameter) {
            // Rough estimate: each peck + retract time
            const drillTime = pecks.reduce((sum, p) => sum + p.incrementalDepth / 50, 0); // 50mm/min drilling
            const retractTime = pecks.length * 0.5; // 0.5 sec per retract
            return drillTime + retractTime / 60;
        }
    },
    // Gun drilling parameters
    gunDrilling: {
        feeds: {
            // Feed in mm/rev by material
            aluminum: { min: 0.02, typical: 0.04, max: 0.06 },
            steel: { min: 0.01, typical: 0.02, max: 0.03 },
            stainless: { min: 0.008, typical: 0.015, max: 0.02 },
            titanium: { min: 0.005, typical: 0.01, max: 0.015 }
        },
        speeds: {
            // SFM by material
            aluminum: { min: 300, typical: 500, max: 800 },
            steel: { min: 80, typical: 120, max: 180 },
            stainless: { min: 40, typical: 70, max: 100 },
            titanium: { min: 30, typical: 50, max: 70 }
        },
        coolantPressure: {
            // Minimum PSI by diameter range
            small: { maxDia: 6, pressure: 1000 }, // < 6mm
            medium: { maxDia: 20, pressure: 750 }, // 6-20mm
            large: { maxDia: 50, pressure: 500 }, // 20-50mm
            xlarge: { maxDia: 999, pressure: 300 } // > 50mm
        },
        calculateParams: function(diameter, depth, material) {
            const feed = this.feeds[material] || this.feeds.steel;
            const speed = this.speeds[material] || this.speeds.steel;
            const rpm = (speed.typical * 12) / (Math.PI * diameter / 25.4);

            // Pressure based on diameter
            let pressure;
            for (const [size, p] of Object.entries(this.coolantPressure)) {
                if (diameter <= p.maxDia) {
                    pressure = p.pressure;
                    break;
                }
            }
            return {
                rpm: Math.round(rpm),
                feed: feed.typical,
                feedRate: Math.round(rpm * feed.typical),
                coolantPressure: pressure,
                estimatedTime: (depth / (rpm * feed.typical)).toFixed(2) + " min"
            };
        }
    },
    // BTA/Ejector drilling
    btaDrilling: {
        calculateParams: function(diameter, depth, material) {
            // BTA typically runs at 60-80% of gun drill speeds
            const gunParams = PRISM_DEEP_HOLE_DRILLING_ENGINE.gunDrilling.calculateParams(diameter, depth, material);

            return {
                rpm: Math.round(gunParams.rpm * 0.7),
                feed: gunParams.feed * 1.2, // Can feed faster with better chip removal
                coolantFlow: Math.round(diameter * 5), // Liters/min approximate
                chipRemoval: "Internal through bore head",
                headType: diameter < 20 ? "Solid" : "Brazed insert"
            };
        }
    },
    // Chip evacuation calculations
    chipEvacuation: {
        calculateChipVolume: function(diameter, depth, chipLoad) {
            const crossSection = Math.PI * Math.pow(diameter / 2, 2);
            return crossSection * depth / 1000; // cm³
        },
        coolantRequirements: function(diameter, depth, method) {
            const requirements = {
                peck: { flow: 20, pressure: 100 }, // Liters/min, PSI
                throughCoolant: { flow: 10, pressure: 500 },
                gun: { flow: diameter * 3, pressure: 1000 },
                bta: { flow: diameter * 5, pressure: 300 }
            };
            return requirements[method] || requirements.peck;
        }
    },
    // Generate complete drilling operation
    generateOperation: function(hole) {
        const method = this.selectMethod(hole.diameter, hole.depth, hole.material, hole.tolerance);

        const operation = {
            method,
            methodName: this.methods[method].name,
            diameter: hole.diameter,
            depth: hole.depth,
            material: hole.material
        };
        if (method === 'peck' || method === 'chipBreak') {
            operation.peckSequence = this.peckCalculation.calculatePeckSequence(
                hole.depth, hole.diameter, hole.material
            );
        } else if (method === 'gun') {
            operation.params = this.gunDrilling.calculateParams(
                hole.diameter, hole.depth, hole.material
            );
        } else if (method === 'bta' || method === 'ejector') {
            operation.params = this.btaDrilling.calculateParams(
                hole.diameter, hole.depth, hole.material
            );
        }
        operation.coolant = this.chipEvacuation.coolantRequirements(
            hole.diameter, hole.depth, method
        );

        return operation;
    }
}