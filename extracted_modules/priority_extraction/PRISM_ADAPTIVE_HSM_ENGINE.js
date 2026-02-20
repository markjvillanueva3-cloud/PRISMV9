const PRISM_ADAPTIVE_HSM_ENGINE = {
    version: "2.0",

    // Chip thinning fundamentals
    chipThinning: {
        description: "When radial engagement < 50%, actual chip is thinner than programmed",

        // Calculate actual chip thickness
        calculateActualChip: function(programmedChipload, radialEngagement, toolDiameter) {
            const ae = radialEngagement; // Radial depth of cut
            const d = toolDiameter;

            // Engagement angle in radians
            const engagementAngle = Math.acos(1 - (2 * ae / d));

            // Chip thinning factor
            const chipThinningFactor = Math.sin(engagementAngle);

            // Actual chip thickness
            const actualChip = programmedChipload * chipThinningFactor;

            return {
                engagementAngle: engagementAngle * 180 / Math.PI,
                chipThinningFactor,
                actualChip,
                compensatedFeed: programmedChipload / chipThinningFactor
            };
        },
        // Compensation lookup table
        compensationTable: {
            // Radial engagement as % of diameter : chip thinning factor
            5:  0.309,
            10: 0.436,
            15: 0.527,
            20: 0.600,
            25: 0.661,
            30: 0.714,
            35: 0.760,
            40: 0.800,
            45: 0.836,
            50: 0.866,
            60: 0.917,
            70: 0.954,
            80: 0.980,
            90: 0.995,
            100: 1.000
        },
        // Get compensation factor from table
        getCompensationFactor: function(radialEngagementPercent) {
            const keys = Object.keys(this.compensationTable).map(Number).sort((a,b) => a-b);

            // Find closest match
            for (let i = 0; i < keys.length - 1; i++) {
                if (radialEngagementPercent <= keys[i]) {
                    return this.compensationTable[keys[i]];
                }
                if (radialEngagementPercent < keys[i+1]) {
                    // Linear interpolation
                    const ratio = (radialEngagementPercent - keys[i]) / (keys[i+1] - keys[i]);
                    return this.compensationTable[keys[i]] +
                           ratio * (this.compensationTable[keys[i+1]] - this.compensationTable[keys[i]]);
                }
            }
            return 1.0;
        }
    },
    // Engagement angle control
    engagementControl: {
        // Target engagement angle for different materials
        targetAngles: {
            aluminum: { min: 40, optimal: 60, max: 90 },
            steel: { min: 30, optimal: 45, max: 70 },
            stainless: { min: 25, optimal: 40, max: 60 },
            titanium: { min: 20, optimal: 35, max: 50 },
            inconel: { min: 15, optimal: 30, max: 45 }
        },
        // Calculate radial engagement for target angle
        calculateRadialEngagement: function(targetAngle, toolDiameter) {
            const angleRad = targetAngle * Math.PI / 180;
            const ae = (toolDiameter / 2) * (1 - Math.cos(angleRad));
            return {
                radialEngagement: ae,
                asPercentOfDiameter: (ae / toolDiameter) * 100
            };
        },
        // Get optimal stepover
        getOptimalStepover: function(material, toolDiameter) {
            const target = this.targetAngles[material] || this.targetAngles.steel;
            return this.calculateRadialEngagement(target.optimal, toolDiameter);
        }
    },
    // Adaptive clearing parameters
    adaptiveParameters: {
        // Load control settings
        loadControl: {
            targetLoad: 0.7, // 70% of max load
            minLoad: 0.3,
            maxLoad: 0.9,
            smoothing: 0.8 // How aggressively to smooth load changes
        },
        // Entry methods for adaptive
        entryMethods: {
            helix: {
                name: "Helical Entry",
                maxHelixAngle: 3, // degrees
                minHelixDiameter: 0.5, // times tool diameter
                preferredFor: ["pockets", "closed contours"]
            },
            ramp: {
                name: "Ramp Entry",
                maxRampAngle: 5, // degrees
                preferredFor: ["open slots", "facing"]
            },
            plunge: {
                name: "Plunge Entry",
                requiresCenterCuttingTool: true,
                preferredFor: ["small features", "material entry"]
            },
            predrilled: {
                name: "Pre-drilled Entry",
                requiresPilotHole: true,
                preferredFor: ["deep pockets", "hard materials"]
            }
        },
        // Calculate helix parameters
        calculateHelixEntry: function(toolDiameter, pocketWidth, material) {
            const minHelixDia = toolDiameter * 0.5;
            const maxHelixDia = Math.min(toolDiameter * 2, pocketWidth * 0.8);

            // Material-specific helix angle
            const helixAngles = {
                aluminum: 3.0,
                steel: 2.5,
                stainless: 2.0,
                titanium: 1.5,
                inconel: 1.0
            };
            return {
                helixDiameter: (minHelixDia + maxHelixDia) / 2,
                helixAngle: helixAngles[material] || 2.0,
                helixDirection: "CW", // Climb milling
                rampFeedReduction: 0.5 // 50% of cutting feed
            };
        }
    },
    // Generate optimized adaptive parameters
    generateAdaptiveParams: function(tool, material, feature) {
        const engagement = this.engagementControl.getOptimalStepover(material, tool.diameter);
        const chipThinning = this.chipThinning.getCompensationFactor(engagement.asPercentOfDiameter);

        return {
            radialDepth: engagement.radialEngagement,
            radialDepthPercent: engagement.asPercentOfDiameter,
            chipThinningFactor: chipThinning,
            feedCompensation: 1 / chipThinning,
            entry: this.adaptiveParameters.calculateHelixEntry(tool.diameter, feature.width, material),
            loadControl: this.adaptiveParameters.loadControl,
            optimalStepdown: this.calculateOptimalStepdown(tool, material)
        };
    },
    calculateOptimalStepdown: function(tool, material) {
        // Axial depth recommendations
        const aeLimits = {
            aluminum: { roughing: 1.0, finishing: 0.5 }, // times diameter
            steel: { roughing: 0.5, finishing: 0.25 },
            stainless: { roughing: 0.4, finishing: 0.2 },
            titanium: { roughing: 0.25, finishing: 0.1 },
            inconel: { roughing: 0.2, finishing: 0.08 }
        };
        const limits = aeLimits[material] || aeLimits.steel;
        return {
            roughingMax: tool.diameter * limits.roughing,
            finishingMax: tool.diameter * limits.finishing
        };
    }
}