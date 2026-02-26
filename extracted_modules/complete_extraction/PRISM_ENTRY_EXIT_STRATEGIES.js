const PRISM_ENTRY_EXIT_STRATEGIES = {
    version: "1.0",

    // Entry strategies
    entry: {
        helix: {
            name: "Helical Entry",
            description: "Spiral down into material",
            parameters: {
                maxAngle: 5, // degrees
                minDiameter: "50% of tool",
                maxDiameter: "200% of tool",
                direction: "CW for climb"
            },
            suitableFor: ["Pockets", "Closed contours", "Deep features"],
            calculate: function(toolDia, depth, material) {
                const angles = {
                    aluminum: 5,
                    steel: 3,
                    stainless: 2.5,
                    titanium: 2,
                    inconel: 1.5
                };
                const angle = angles[material] || 3;
                const circumference = Math.PI * toolDia;
                const pitchPerRev = circumference * Math.tan(angle * Math.PI / 180);
                const revolutions = depth / pitchPerRev;

                return {
                    helixAngle: angle,
                    helixDiameter: toolDia * 0.8,
                    pitchPerRevolution: pitchPerRev,
                    totalRevolutions: Math.ceil(revolutions),
                    feedReduction: 0.5
                };
            }
        },
        ramp: {
            name: "Ramp Entry",
            description: "Linear ramp into material",
            parameters: {
                maxAngle: 10,
                minLength: "5x depth",
                preferZigzag: true
            },
            suitableFor: ["Open pockets", "Slots", "Wide features"],
            calculate: function(toolDia, depth, material, featureWidth) {
                const angles = {
                    aluminum: 8,
                    steel: 5,
                    stainless: 4,
                    titanium: 3,
                    inconel: 2
                };
                const angle = angles[material] || 5;
                const rampLength = depth / Math.tan(angle * Math.PI / 180);

                // Check if zigzag is needed
                const useZigzag = rampLength > featureWidth * 0.8;

                return {
                    rampAngle: angle,
                    rampLength: useZigzag ? featureWidth * 0.8 : rampLength,
                    zigzag: useZigzag,
                    zigzagPasses: useZigzag ? Math.ceil(rampLength / (featureWidth * 0.8)) : 1,
                    feedReduction: 0.5
                };
            }
        },
        plunge: {
            name: "Plunge Entry",
            description: "Direct vertical plunge",
            parameters: {
                requiresCenterCutting: true,
                maxPlungeDepth: "2x diameter",
                feedRate: "drilling feed"
            },
            suitableFor: ["Small features", "Pre-drilled holes", "Roughing start"],
            calculate: function(toolDia, depth, material) {
                const plungeFeeds = {
                    aluminum: 0.1,  // mm/rev
                    steel: 0.05,
                    stainless: 0.04,
                    titanium: 0.03,
                    inconel: 0.02
                };
                return {
                    plungeFeed: plungeFeeds[material] || 0.05,
                    maxDepthPerPlunge: toolDia * 2,
                    pecking: depth > toolDia * 2
                };
            }
        },
        arcEntry: {
            name: "Arc Entry",
            description: "Tangent arc approach to cut",
            parameters: {
                arcRadius: "50-100% tool diameter",
                tangentToWall: true
            },
            suitableFor: ["Contour cuts", "Wall finishing", "Quality surfaces"],
            calculate: function(toolDia, wallSide) {
                return {
                    arcRadius: toolDia * 0.75,
                    arcAngle: 90,
                    approach: wallSide === 'left' ? 'CW' : 'CCW',
                    tangentPoint: true
                };
            }
        }
    },
    // Exit strategies
    exit: {
        arcExit: {
            name: "Arc Exit",
            description: "Tangent arc departure from cut",
            calculate: function(toolDia, wallSide) {
                return {
                    arcRadius: toolDia * 0.75,
                    arcAngle: 90,
                    departure: wallSide === 'left' ? 'CW' : 'CCW'
                };
            }
        },
        linearExit: {
            name: "Linear Exit",
            description: "Straight line departure at reduced feed",
            calculate: function(normalDirection) {
                return {
                    exitDistance: 2, // mm beyond part
                    direction: normalDirection,
                    feedReduction: 0.8
                };
            }
        },
        liftOff: {
            name: "Lift Off",
            description: "Combined lateral and vertical exit",
            calculate: function(toolDia, safeHeight) {
                return {
                    lateralDistance: toolDia * 0.5,
                    verticalDistance: safeHeight,
                    simultaneousMove: true
                };
            }
        }
    },
    // Select best entry strategy
    selectEntry: function(feature, tool, material, constraints) {
        // Decision logic
        if (feature.type === 'closedPocket' || feature.preDrilled) {
            if (feature.preDrilled) {
                return { strategy: 'plunge', params: this.entry.plunge.calculate(tool.diameter, feature.depth, material) };
            }
            return { strategy: 'helix', params: this.entry.helix.calculate(tool.diameter, feature.depth, material) };
        }
        if (feature.type === 'openPocket' || feature.type === 'slot') {
            return { strategy: 'ramp', params: this.entry.ramp.calculate(tool.diameter, feature.depth, material, feature.width) };
        }
        if (feature.type === 'contour' || feature.type === 'wall') {
            return { strategy: 'arcEntry', params: this.entry.arcEntry.calculate(tool.diameter, feature.wallSide) };
        }
        // Default to helix for unknown
        return { strategy: 'helix', params: this.entry.helix.calculate(tool.diameter, feature.depth, material) };
    }
}