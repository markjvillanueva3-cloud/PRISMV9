const PRISM_ROUGHING_LOGIC = {

    name: "PRISM Roughing Logic™",
    version: "1.0.0",

    // AGGRESSIVENESS LEVELS
    // Control how hard the machine pushes - higher = faster but more aggressive

    AGGRESSIVENESS_LEVELS: {
        1: { factor: 0.50, name: "Ultra Conservative", description: "For difficult materials, poor setups, or testing", chipLoad: 0.50 },
        2: { factor: 0.60, name: "Very Conservative", description: "For exotic alloys, thin walls, long tools", chipLoad: 0.60 },
        3: { factor: 0.70, name: "Conservative", description: "For first article parts or new programs", chipLoad: 0.70 },
        4: { factor: 0.80, name: "Moderate", description: "For general purpose machining", chipLoad: 0.80 },
        5: { factor: 0.85, name: "Balanced", description: "Optimal balance of speed and tool life - RECOMMENDED", chipLoad: 0.85 },
        6: { factor: 0.90, name: "Production", description: "For proven programs in production", chipLoad: 0.90 },
        7: { factor: 0.95, name: "Aggressive", description: "For robust setups with rigid tools", chipLoad: 0.95 },
        8: { factor: 1.00, name: "Maximum", description: "Full calculated feed - good rigidity required", chipLoad: 1.00 }
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
    // LENGTH OF CUT (LOC) / AXIAL DEPTH COMPENSATION
    // This is the PRIMARY adjustment for 3D Adaptive toolpaths.
    // SCENARIO: Tapered wall with max LOC = 1.000" at bottom
    //           As tool moves up, LOC decreases to 0.125" at top
    // PROBLEM: If you calculated feed for 1.000" LOC, running that same
    //          feed at 0.125" LOC wastes time - tool could go faster!
    // SOLUTION: INCREASE feed proportionally as LOC decreases
    //           Feed maintains constant MRR (Material Removal Rate)
    // FORMULA: Feed Multiplier = sqrt(Programmed_LOC / Actual_LOC)
    // EXAMPLE:
    //   Programmed LOC: 1.000" → Base feed F100 IPM
    //   Actual LOC: 0.250" (25% of programmed)
    //   Multiplier: sqrt(1.000 / 0.250) = sqrt(4) = 2.0
    //   Adjusted feed: F200 IPM (2x faster!)
    //   Actual LOC: 0.125" (12.5% of programmed)
    //   Multiplier: sqrt(1.000 / 0.125) = sqrt(8) = 2.83
    //   Capped at 2.5x max → Adjusted feed: F250 IPM

    LENGTH_OF_CUT: {
        enabled: true,

        // Maximum feed increase multiplier
        // 2.5x is aggressive but safe for most situations
        maxIncrease: 2.50,

        // Minimum LOC ratio before capping at maxIncrease
        // Below 16% of programmed LOC, we cap the increase
        minRatioBeforeCap: 0.16,

        // Whether to apply on all adaptive operations automatically
        autoApplyOnAdaptive: true,

        /**
         * Calculate feed adjustment based on changing Length of Cut
         *
         * @param {number} programmedLOC - Maximum/programmed axial depth (e.g., 1.000")
         * @param {number} actualLOC - Current actual axial depth (e.g., 0.125")
         * @returns {object} Adjustment result with factor and explanation
         */
        calculate: function(programmedLOC, actualLOC) {
            const result = {
                factor: 1.0,
                ratio: 1.0,
                description: "",
                feedChange: "0%"
            };
            // Safety checks
            if (!this.enabled || programmedLOC <= 0 || actualLOC <= 0) {
                result.description = "LOC adjustment disabled or invalid inputs";
                return result;
            }
            // Calculate ratio of actual to programmed
            result.ratio = actualLOC / programmedLOC;

            // If actual LOC >= programmed, no adjustment needed
            if (result.ratio >= 1.0) {
                result.description = "Full LOC - no adjustment needed";
                return result;
            }
            // If ratio is very small, cap at maximum increase
            if (result.ratio < this.minRatioBeforeCap) {
                result.factor = this.maxIncrease;
                result.description = `LOC very shallow (${(result.ratio * 100).toFixed(0)}%) - capped at ${this.maxIncrease}x`;
                result.feedChange = `+${((result.factor - 1) * 100).toFixed(0)}%`;
                return result;
            }
            // Calculate feed increase to maintain constant MRR
            // MRR = WOC × LOC × Feed
            // To maintain MRR when LOC decreases, Feed must increase
            // Feed_new = Feed_base × sqrt(LOC_programmed / LOC_actual)
            result.factor = Math.sqrt(programmedLOC / actualLOC);

            // Cap at maximum
            if (result.factor > this.maxIncrease) {
                result.factor = this.maxIncrease;
                result.description = `LOC ${(result.ratio * 100).toFixed(0)}% - increase capped at ${this.maxIncrease}x`;
            } else {
                result.description = `LOC ${(result.ratio * 100).toFixed(0)}% of programmed - feed increased`;
            }
            result.feedChange = `+${((result.factor - 1) * 100).toFixed(0)}%`;
            return result;
        },
        /**
         * Generate lookup table for common LOC ratios
         * Useful for quick reference
         */
        getLookupTable: function() {
            return {
                1.000: { factor: 1.00, note: "Full LOC - base feed" },
                0.750: { factor: 1.15, note: "75% LOC - +15% feed" },
                0.500: { factor: 1.41, note: "50% LOC - +41% feed" },
                0.375: { factor: 1.63, note: "37.5% LOC - +63% feed" },
                0.250: { factor: 2.00, note: "25% LOC - +100% feed (2x)" },
                0.200: { factor: 2.24, note: "20% LOC - +124% feed" },
                0.125: { factor: 2.50, note: "12.5% LOC - +150% feed (capped)" },
                0.100: { factor: 2.50, note: "10% LOC - +150% feed (capped)" }
            };
        }
    },
    // Alias for backwards compatibility
    ADAPTIVE_DEPTH: {
        enabled: true,
        maxIncrease: 2.50,
        minDepthRatio: 0.16,

        calculate: function(programmedDepth, actualDepth) {
            // Delegate to LENGTH_OF_CUT
            const result = PRISM_ROUGHING_LOGIC.LENGTH_OF_CUT.calculate(programmedDepth, actualDepth);
            return result.factor;
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
                lines.pus
            }
        }
    }
}