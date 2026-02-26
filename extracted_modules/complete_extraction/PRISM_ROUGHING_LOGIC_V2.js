const PRISM_ROUGHING_LOGIC_V2 = {

    name: "PRISM Roughing Logic™",
    version: "1.0.0",

    // AGGRESSIVENESS LEVELS
    // Control how hard the machine pushes - higher = faster but more aggressive

    AGGRESSIVENESS_LEVELS: {
        "1": { factor: 0.50, name: "Ultra Conservative", description: "For difficult materials, poor setups, or testing", chipLoad: 0.50 },
        "2": { factor: 0.60, name: "Very Conservative", description: "For exotic alloys, thin walls, long tools", chipLoad: 0.60 },
        "3": { factor: 0.70, name: "Conservative", description: "For first article parts or new programs", chipLoad: 0.70 },
        "4": { factor: 0.80, name: "Moderate", description: "For general purpose machining", chipLoad: 0.80 },
        "5": { factor: 0.85, name: "Balanced", description: "Optimal balance of speed and tool life - RECOMMENDED", chipLoad: 0.85 },
        "6": { factor: 0.90, name: "Production", description: "For proven programs in production", chipLoad: 0.90 },
        "7": { factor: 0.95, name: "Aggressive", description: "For robust setups with rigid tools", chipLoad: 0.95 },
        "8": { factor: 1.00, name: "Maximum", description: "Full calculated feed - good rigidity required", chipLoad: 1.00 }
    },
    // CHIP THINNING COMPENSATION
    // Adjusts feed rate based on radial engagement to maintain chip load

    CHIP_THINNING: {
        enabled: true,

        // Lookup table for chip thinning factors at various engagements
        // ae/D ratio : CTF (chip thinning factor)
        lookupTable: {
            0.05: 3.16,  // 5% engagement
            0.10: 2.24,  // 10% engagement
            0.15: 1.83,  // 15% engagement
            0.20: 1.58,  // 20% engagement
            0.25: 1.41,  // 25% engagement
            0.30: 1.29,  // 30% engagement
            0.35: 1.20,  // 35% engagement
            0.40: 1.12,  // 40% engagement
            0.45: 1.05,  // 45% engagement
            0.50: 1.00,  // 50% engagement (no correction)
            0.60: 1.00,
            0.70: 1.00,
            0.80: 1.00,
            0.90: 1.00,
            1.00: 1.00   // Full slotting
        },
        // Maximum feed multiplier to apply
        maxMultiplier: 2.5,

        // Minimum engagement ratio to apply chip thinning
        minEngagementRatio: 0.05,

        /**
         * Calculate chip thinning factor
         * @param {number} toolDiameter - Tool diameter
         * @param {number} radialEngagement - Radial depth of cut (ae)
         * @returns {number} Chip thinning factor (multiply feed by this)
         */
        calculate: function(toolDiameter, radialEngagement) {
            if (!this.enabled || toolDiameter <= 0) return 1.0;

            const ratio = radialEngagement / toolDiameter;

            // Below minimum engagement, cap at maximum
            if (ratio < this.minEngagementRatio) {
                return Math.min(this.maxMultiplier, this.lookupTable[0.05] || 3.16);
            }
            // Above 50% engagement, no correction needed
            if (ratio >= 0.50) return 1.0;

            // Interpolate from lookup table
            const keys = Object.keys(this.lookupTable).map(Number).sort((a, b) => a - b);

            for (let i = 0; i < keys.length - 1; i++) {
                if (ratio >= keys[i] && ratio < keys[i + 1]) {
                    // Linear interpolation
                    const t = (ratio - keys[i]) / (keys[i + 1] - keys[i]);
                    const factor = this.lookupTable[keys[i]] * (1 - t) + this.lookupTable[keys[i + 1]] * t;
                    return Math.min(this.maxMultiplier, factor);
                }
            }
            return 1.0;
        }
    },
    // ARC FEED CORRECTION
    // Reduce feed rate in tight arcs to prevent overcutting

    ARC_FEED: {
        enabled: true,

        // Minimum arc radius before correction applies
        minArcRadius: 0.100,  // inches

        // Maximum feed reduction
        maxReduction: 0.50,  // 50% maximum reduction

        /**
         * Calculate arc feed correction
         * @param {number} arcRadius - Radius of the arc
         * @param {number} toolRadius - Tool radius
         * @param {boolean} convex - True if cutting convex (outside), false if concave (inside)
         * @returns {number} Feed multiplier (1.0 = no change, <1.0 = reduce feed)
         */
        calculate: function(arcRadius, toolRadius, convex) {
            if (!this.enabled || arcRadius <= 0 || toolRadius <= 0) return 1.0;

            // For very large arcs, no correction needed
            if (arcRadius > toolRadius * 10) return 1.0;

            // Ratio of tool radius to arc radius
            const ratio = toolRadius / arcRadius;

            if (convex) {
                // Cutting outside of arc - effective radius increases
                // Correction = 1 - ratio (reduce feed as arc gets tighter)
                const correction = 1 - (ratio * 0.5);
                return Math.max(1 - this.maxReduction, correction);
            } else {
                // Cutting inside of arc - effective radius decreases
                // More severe correction needed
                const correction = 1 - (ratio * 0.7);
                return Math.max(1 - this.maxReduction, correction);
            }
        }
    },
    // DIRECTION CHANGE CONTROL
    // Reduce feed at sharp corners to prevent tool overload

    DIRECTION_CHANGE: {
        enabled: true,

        // Angle threshold to trigger reduction (degrees)
        angleThreshold: 45,

        // Maximum feed reduction at corners
        maxReduction: 0.35,

        // Distance to ramp feed down before corner (inches)
        rampDownDistance: 0.050,

        // Distance to ramp feed up after corner (inches)
        rampUpDistance: 0.100,

        /**
         * Calculate feed reduction based on direction change angle
         * @param {number} angle - Direction change angle in degrees (0-180)
         * @returns {number} Feed multiplier
         */
        calculate: function(angle) {
            if (!this.enabled) return 1.0;

            // No reduction for gentle curves
            if (angle < this.angleThreshold) return 1.0;

            // Linear interpolation from threshold to 180 degrees
            const severity = (angle - this.angleThreshold) / (180 - this.angleThreshold);
            const reduction = severity * this.maxReduction;

            return 1 - reduction;
        }
    },
    // ADAPTIVE DEPTH COMPENSATION
    // Increase feed when actual cutting depth is less than programmed

    ADAPTIVE_DEPTH: {
        enabled: true,

        // Maximum feed increase
        maxIncrease: 1.50,  // 50% increase

        // Minimum depth ratio before applying maximum increase
        minDepthRatio: 0.25,

        /**
         * Calculate feed adjustment based on depth variation
         * @param {number} programmedDepth - Original programmed depth
         * @param {number} actualDepth - Actual cutting depth
         * @returns {number} Feed multiplier (>1.0 = increase feed)
         */
        calculate: function(programmedDepth, actualDepth) {
            if (!this.enabled || programmedDepth <= 0 || actualDepth <= 0) return 1.0;

            const ratio = actualDepth / programmedDepth;

            // If actual depth >= programmed, no change
            if (ratio >= 1.0) return 1.0;

            // If ratio is below minimum, use maximum increase
            if (ratio < this.minDepthRatio) {
                return this.maxIncrease;
            }
            // Feed increase is proportional to sqrt of depth ratio
            // This maintains similar MRR
            const multiplier = Math.sqrt(programmedDepth / actualDepth);

            return Math.min(this.maxIncrease, multiplier);
        }
    },
    // TOOL STICKOUT COMPENSATION
    // Reduce feed for tools with excessive stickout to prevent deflection

    STICKOUT_COMPENSATION: {
        enabled: true,

        // Maximum safe L/D ratios before reduction
        maxRatios: {
            roughing: 4.0,
            semifinish: 5.0,
            finishing: 6.0,
            hsm: 3.0
        },
        // Feed reduction per L/D unit over limit
        reductionPerLD: 0.15,  // 15% per L/D over

        // Maximum total reduction
        maxReduction: 0.50,  // 50% maximum

        /**
         * Calculate feed reduction based on tool stickout
         * @param {number} stickout - Tool stickout length
         * @param {number} diameter - Tool diameter
         * @param {string} operationType - Operation type ('roughing', 'finishing', 'hsm')
         * @returns {number} Feed multiplier
         */
        calculate: function(stickout, diameter, operationType) {
            if (!this.enabled || diameter <= 0) return 1.0;

            const ldRatio = stickout / diameter;
            const maxRatio = this.maxRatios[operationType] || this.maxRatios.roughing;

            // Within safe range
            if (ldRatio <= maxRatio) return 1.0;

            // Calculate reduction
            const overRatio = ldRatio - maxRatio;
            const reduction = overRatio * this.reductionPerLD;

            return Math.max(1 - this.maxReduction, 1 - reduction);
        }
    },
    // ENTRY/EXIT RAMPING
    // Smooth feed transitions when entering/exiting material

    ENTRY_EXIT: {
        enabled: true,

        // Entry feed as percentage of cutting feed
        entryFeedPercent: 60,

        // Ramp distance to reach full feed (inches)
        entryRampDistance: 0.100,

        // Exit strategy
        exitFeedPercent: 80,
        exitRampDistance: 0.050
    },
    // PLUNGE RATE CONTROL
    // Control Z plunge rates for different conditions

    PLUNGE_RATE: {
        enabled: true,

        // Maximum plunge rates by material category (IPM)
        maxRates: {
            aluminum: 100,
            steel: 40,
            stainless: 25,
            titanium: 15,
            inconel: 10
        },
        // Plunge rate as percentage of XY feed
        percentOfXYFeed: 50,

        /**
         * Calculate appropriate plunge rate
         * @param {number} xyFeed - XY cutting feed
         * @param {string} material - Material category
         * @returns {number} Recommended plunge rate
         */
        calculate: function(xyFeed, material) {
            if (!this.enabled) return xyFeed * 0.5;

            const maxRate = this.maxRates[material] || this.maxRates.steel;
            const calculatedRate = xyFeed * (this.percentOfXYFeed / 100);

            return Math.min(maxRate, calculatedRate);
        }
    },
    // CONTROLLER-SPECIFIC IMPLEMENTATIONS
    // How to output PRISM Roughing Logic for each controller type

    CONTROLLER_IMPLEMENTATIONS: {

        haas_ngc: {
            name: "Haas NGC",
            variableFeedSupport: true,

            // G-code output for variable feed
            feedOutput: {
                // Haas supports F on every line
                forceEveryLine: true,
                format: "F{feed:.3f}"
            },
            // Smoothing for roughing
            roughingSmoothing: "G187 P1 E0.001",
            adaptiveSmoothing: "G187 P2 E0.0005",

            // Comments
            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC ACTIVE)");
                lines.push(`(AGGRESSIVENESS: ${params.level} - ${PRISM_ROUGHING_LOGIC.AGGRESSIVENESS_LEVELS[params.level].name})`);
                if (params.chipThinning) {
                    lines.push(`(CHIP THINNING: ${(params.chipThinningFactor * 100).toFixed(0)}% FEED INCREASE)`);
                }
                return lines;
            }
        },
        okuma_osp_p300m: {
            name: "Okuma OSP-P300M",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.2f}"
            },
            // Super NURBS for roughing
            roughingSmoothing: "G131 P1",
            adaptiveSmoothing: "G131 P2",

            commentFormat: "({text})",

            // Okuma cycle time codes to use with PRISM logic
            cycleTimeOptimization: {
                ignoreSpindleAnswer: "M63",
                cssSmoothing: "M61"
            },
            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC ACTIVE)");
                lines.push(`(LEVEL ${params.level}: ${PRISM_ROUGHING_LOGIC.AGGRESSIVENESS_LEVELS[params.level].name})`);
                return lines;
            }
        },
        okuma_osp_p300l: {
            name: "Okuma OSP-P300L (Mill-Turn/Live Tool)",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.4f}"
            },
            // For milling on lathe
            millingMode: "G138",  // Y-axis enable for milling

            // High speed for live tools
            highSpeedMilling: "G131 P2",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC - LIVE TOOL MILLING)");
                lines.push(`(LEVEL ${params.level})`);
                return lines;
            }
        },
        hurco_winmax: {
            name: "Hurco WinMax",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.3f}"
            },
            // Hurco smoothing levels
            roughingSmoothing: "G05.3 P50",
            adaptiveSmoothing: "G05.3 P35",

            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC ENABLED)");
                lines.push(`(AGGRESSIVENESS ${params.level}/8)`);
                return lines;
            }
        },
        fanuc_31i: {
            name: "FANUC 31i-B",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.4f}"
            },
            // FANUC high speed
            roughingSmoothing: "G05 P1",
            adaptiveSmoothing: "G05.1 Q1",
            aiContour: "G05 P10000",

            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC)");
                lines.push(`(LEVEL ${params.level}: ${PRISM_ROUGHING_LOGIC.AGGRESSIVENESS_LEVELS[params.level].description})`);
                return lines;
            }
        },
        siemens_840d: {
            name: "SINUMERIK 840D",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed}"
            },
            roughingSmoothing: "CYCLE832(0.1, 1)",
            adaptiveSmoothing: "CYCLE832(0.05, 1)",
            compressor: "COMPON",

            commentFormat: "; {text}",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("; PRISM ROUGHING LOGIC ACTIVE");
                lines.push(`; LEVEL ${params.level}`);
                return lines;
            }
        },
        heidenhain_tnc640: {
            name: "Heidenhain TNC 640",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed}"
            },
            // Heidenhain tolerance cycle
            roughingSmoothing: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.1\nCYCL DEF 32.2 HSC-MODE:1",

            commentFormat: "; {text}",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("; PRISM ROUGHING LOGIC ACTIVE");
                lines.push(`; AGGRESSIVENESS LEVEL ${params.level}`);
                return lines;
            }
        },
        mazak_smooth: {
            name: "Mazak SmoothG/Ai",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.2f}"
            },
            roughingSmoothing: "G05.1 Q1",

            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC)");
                lines.push(`(LEVEL ${params.level})`);
                return lines;
            }
        },
        dmgmori_celos: {
            name: "DMG MORI CELOS",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.3f}"
            },
            roughingSmoothing: "M200",

            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC ACTIVE)");
                lines.push(`(LEVEL ${params.level})`);
                return lines;
            }
        },
        makino_pro: {
            name: "Makino Pro 6",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.3f}"
            },
            roughingSmoothing: "G05 P2",  // SGI
            adaptiveSmoothing: "G05 P10000",  // GeoMotion

            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC)");
                lines.push(`(AGGRESSIVENESS: ${params.level}/8)`);
                return lines;
            }
        },
        brother_cnc: {
            name: "Brother CNC",
            variableFeedSupport: true,

            feedOutput: {
                forceEveryLine: true,
                format: "F{feed:.3f}"
            },
            roughingSmoothing: "G05 P1",

            commentFormat: "({text})",

            generatePrismBlock: function(params) {
                const lines = [];
                lines.push("(PRISM ROUGHING LOGIC)");
                lines.push(`(LEVEL ${params.level})`);
                return lines;
            }
        }
    },
    // MAIN CALCULATION FUNCTION
    // Calculate optimized feed for a given set of conditions

    /**
     * Calculate optimized feed rate using PRISM Roughing Logic
     * @param {object} params - Cutting parameters
     * @returns {object} Optimized feed with breakdown
     */
    calculateOptimizedFeed: function(params) {
        const {
            baseFeed,
            toolDiameter,
            radialEngagement,
            axialDepth,
            programmedDepth,
            stickout,
            arcRadius,
            isConvexArc,
            directionChangeAngle,
            material,
            operationType,
            aggressivenessLevel
        } = params;

        // Start with base feed
        let optimizedFeed = baseFeed;
        const adjustments = [];

        // 1. Apply aggressiveness level
        const level = this.AGGRESSIVENESS_LEVELS[aggressivenessLevel || 5];
        optimizedFeed *= level.factor;
        adjustments.push({
            name: "Aggressiveness",
            factor: level.factor,
            description: level.name
        });

        // 2. Chip thinning compensation (increase feed at light engagement)
        if (toolDiameter && radialEngagement) {
            const ctf = this.CHIP_THINNING.calculate(toolDiameter, radialEngagement);
            if (ctf > 1.0) {
                optimizedFeed *= ctf;
                adjustments.push({
                    name: "Chip Thinning",
                    factor: ctf,
                    description: `${((ctf - 1) * 100).toFixed(0)}% increase for ${((radialEngagement / toolDiameter) * 100).toFixed(0)}% engagement`
                });
            }
        }
        // 3. Arc feed correction (reduce feed in tight arcs)
        if (arcRadius && toolDiameter) {
            const arcFactor = this.ARC_FEED.calculate(arcRadius, toolDiameter / 2, isConvexArc);
            if (arcFactor < 1.0) {
                optimizedFeed *= arcFactor;
                adjustments.push({
                    name: "Arc Correction",
                    factor: arcFactor,
                    description: `${((1 - arcFactor) * 100).toFixed(0)}% reduction for R${arcRadius.toFixed(3)} arc`
                });
            }
        }
        // 4. Direction change (reduce feed at corners)
        if (directionChangeAngle) {
            const cornerFactor = this.DIRECTION_CHANGE.calculate(directionChangeAngle);
            if (cornerFactor < 1.0) {
                optimizedFeed *= cornerFactor;
                adjustments.push({
                    name: "Corner Reduction",
                    factor: cornerFactor,
                    description: `${((1 - cornerFactor) * 100).toFixed(0)}% reduction for ${directionChangeAngle}° corner`
                });
            }
        }
        // 5. Adaptive depth compensation (increase feed at shallow cuts)
        if (programmedDepth && axialDepth && axialDepth < programmedDepth) {
            const depthFactor = this.ADAPTIVE_DEPTH.calculate(programmedDepth, axialDepth);
            if (depthFactor > 1.0) {
                optimizedFeed *= depthFactor;
                adjustments.push({
                    name: "Depth Compensation",
                    factor: depthFactor,
                    description: `${((depthFactor - 1) * 100).toFixed(0)}% increase for shallow cut`
                });
            }
        }
        // 6. Tool stickout compensation (reduce feed for long tools)
        if (stickout && toolDiameter) {
            const stickoutFactor = this.STICKOUT_COMPENSATION.calculate(stickout, toolDiameter, operationType || 'roughing');
            if (stickoutFactor < 1.0) {
                optimizedFeed *= stickoutFactor;
                adjustments.push({
                    name: "Stickout Compensation",
                    factor: stickoutFactor,
                    description: `${((1 - stickoutFactor) * 100).toFixed(0)}% reduction for L/D ${(stickout / toolDiameter).toFixed(1)}`
                });
            }
        }
        // Calculate total adjustment factor
        const totalFactor = optimizedFeed / baseFeed;

        return {
            baseFeed: baseFeed,
            optimizedFeed: Math.round(optimizedFeed * 1000) / 1000,
            totalFactor: Math.round(totalFactor * 1000) / 1000,
            adjustments: adjustments,
            aggressivenessLevel: aggressivenessLevel || 5,
            aggressivenessName: level.name
        };
    },
    /**
     * Generate G-code comment block for PRISM Roughing Logic
     * @param {string} controllerId - Controller identifier
     * @param {object} params - Parameters for the block
     * @returns {string[]} Array of G-code lines
     */
    generateCodeBlock: function(controllerId, params) {
        const controller = this.CONTROLLER_IMPLEMENTATIONS[controllerId];
        if (!controller) {
            // Default format
            return [
                "(PRISM ROUGHING LOGIC ACTIVE)",
                `(LEVEL ${params.level || 5})`
            ];
        }
        return controller.generatePrismBlock(params);
    },
    /**
     * Get smoothing code for roughing operations
     * @param {string} controllerId - Controller identifier
     * @param {string} type - 'roughing' or 'adaptive'
     * @returns {string} Smoothing G-code
     */
    getSmoothingCode: function(controllerId, type) {
        const controller = this.CONTROLLER_IMPLEMENTATIONS[controllerId];
        if (!controller) return null;

        if (type === 'adaptive') {
            return controller.adaptiveSmoothing || controller.roughingSmoothing;
        }
        return controller.roughingSmoothing;
    }
}